"""Bounded local SimConnect experiment; default mode is read-only.

Uses an existing local SimConnect DLL, never modifies aircraft packages.
API layouts: Microsoft SimConnect documentation (see README.md).
"""
import argparse
import ctypes as C
import datetime as dt
import json
from pathlib import Path
import struct
import time

U = C.c_uint32
H = C.c_void_p

class SimConnect:
    def __init__(self, dll):
        self.dll = C.WinDLL(str(Path(dll).resolve()))
        signatures = {
            'Open': [C.POINTER(H), C.c_char_p, H, U, H, U],
            'Close': [H],
            'AddToDataDefinition': [H, U, C.c_char_p, C.c_char_p, U, C.c_float, U],
            'RequestDataOnSimObject': [H, U, U, U, U, U, U, U, U],
            'GetNextDispatch': [H, C.POINTER(H), C.POINTER(U)],
            'SetDataOnSimObject': [H, U, U, U, U, U, H],
        }
        for name, args in signatures.items():
            fn = getattr(self.dll, 'SimConnect_' + name)
            fn.argtypes, fn.restype = args, C.c_int32
        self.handle = H()
        self.definitions = {}
        self.request = 0
        self.call('Open', C.byref(self.handle), b'MEL A220 feasibility probe', None, 0, None, 0)

    def call(self, name, *args):
        hr = getattr(self.dll, 'SimConnect_' + name)(*args)
        if hr < 0:
            raise RuntimeError(f'{name}: HRESULT 0x{hr & 0xffffffff:08X}')

    def define(self, name, unit='number', string=False):
        if name not in self.definitions:
            index = len(self.definitions) + 1
            self.call('AddToDataDefinition', self.handle, index, name.encode(),
                      None if string else unit.encode(), 9 if string else 4, 0, 0xffffffff)
            self.definitions[name] = (index, string)
        return self.definitions[name]

    def read(self, fields, timeout=8):
        pending, result = {}, {}
        for name, unit, string in fields:
            index, _ = self.define(name, unit, string)
            self.request += 1
            pending[self.request] = (name, string)
            self.call('RequestDataOnSimObject', self.handle, self.request, index, 0, 1, 0, 0, 0, 0)
        deadline = time.monotonic() + timeout
        while pending and time.monotonic() < deadline:
            ptr, size = H(), U()
            hr = self.dll.SimConnect_GetNextDispatch(self.handle, C.byref(ptr), C.byref(size))
            if hr < 0:
                if hr & 0xffffffff != 0x80004005:
                    raise RuntimeError(f'Dispatch: 0x{hr & 0xffffffff:08X}')
                time.sleep(.02)
                continue
            raw = C.string_at(ptr, size.value)
            if len(raw) < 12:
                raise RuntimeError('Truncated SimConnect header')
            kind = struct.unpack_from('<I', raw, 8)[0]
            if kind == 1:
                raise RuntimeError(f'SimConnect exception (code, packet, index): {struct.unpack_from("<III", raw, 12)}')
            if kind == 3:
                raise RuntimeError('Simulator disconnected')
            if kind == 8:
                request = struct.unpack_from('<I', raw, 12)[0]
                if request in pending:
                    name, string = pending.pop(request)
                    result[name] = (raw[40:296].split(b'\0', 1)[0].decode(errors='replace')
                                    if string else struct.unpack_from('<d', raw, 40)[0])
        if pending:
            raise TimeoutError(f'Missing readings: {[v[0] for v in pending.values()]}')
        return result

    def close(self):
        if self.handle:
            self.call('Close', self.handle)
            self.handle = H()

    def write_breaker(self, value):
        self.write_control('L:A22X Circuit Breaker R C1', value)

    def write_control(self, name, value):
        # Deliberately limited to the three controls used in this experiment.
        if name not in ('L:A22X Circuit Breaker R C1', 'L:A22X Circuit Breaker R B4', 'L:A22X Dome Lights') or value not in (0.0, 1.0):
            raise ValueError('Invalid circuit breaker value')
        index, _ = self.define(name)
        data = C.c_double(value)
        self.call('SetDataOnSimObject', self.handle, index, 0, 0, 1, 8, C.byref(data))

FIELDS = [('TITLE', '', True), ('SIM ON GROUND', 'bool', False),
          ('GROUND VELOCITY', 'knots', False), ('GENERAL ENG COMBUSTION:1', 'bool', False),
          ('GENERAL ENG COMBUSTION:2', 'bool', False)]
FIELDS += [(name, 'number', False) for name in [
    'L:A22X Parking Brake', 'L:A22X L MKP Powered', 'L:A22X R MKP Powered',
    'L:A22X DU1 Backlight', 'L:A22X DU2 Backlight', 'L:A22X DU3 Backlight',
    'L:A22X Circuit Breaker R C1', 'L:A22X Circuit Breaker R B4',
    'L:A22X Dome Lights', 'L:A22X Dome Lights Annunciator',
    'L:A22X Caution PBA', 'L:A22X Warning PBA']]
FIELDS += [(f'COM STATUS:{i}', 'enum', False) for i in (1, 2, 3)]
FIELDS += [(f'COM TEST:{i}', 'bool', False) for i in (1, 2, 3)]
FIELDS += [('LIGHT POTENTIOMETER:18', 'percent', False)]

def dome_experiment(sim, report, save):
    baseline = report['state']
    check_parked(baseline)
    cb, switch, output = 'L:A22X Circuit Breaker R B4', 'L:A22X Dome Lights', 'LIGHT POTENTIOMETER:18'
    if baseline[cb] != 0 or baseline[switch] not in (0, 1):
        raise RuntimeError('Invalid initial dome-light configuration')
    report['stages'] = []
    def observe(label):
        time.sleep(1)
        state = sim.read(FIELDS)
        report['stages'].append({'stage': label, 'utc': dt.datetime.now(dt.timezone.utc).isoformat(), 'state': state})
        save()
        check_parked(state)
        return state
    report['restoration'] = 'pending'
    save()
    try:
        sim.write_control(switch, 1)
        powered = observe('switch_on_breaker_closed')
        if powered[output] <= 0:
            raise RuntimeError('Dome light did not illuminate; aborting breaker test')
        sim.write_control(cb, 1)
        failed = observe('switch_on_breaker_open')
        failed2 = observe('switch_on_breaker_open_confirm')
        sim.write_control(cb, 0)
        restored = observe('switch_on_breaker_closed_recovered')
        report['effect_verified'] = (failed[cb] == 1 and failed[switch] == 1 and failed[output] == 0 and
                                    failed2[cb] == 1 and failed2[switch] == 1 and failed2[output] == 0
                                    and restored[cb] == 0 and restored[switch] == 1
                                    and restored[output] == powered[output])
    finally:
        fresh = sim.read(FIELDS)
        if fresh['TITLE'] != baseline['TITLE']:
            report['restoration'] = 'NOT ATTEMPTED: aircraft changed'
            save()
            raise RuntimeError(report['restoration'])
        sim.write_control(cb, baseline[cb])
        sim.write_control(switch, baseline[switch])
        final = observe('original_configuration_restored')
        report['restoration'] = ('verified' if all(final[k] == baseline[k] for k in (cb, switch, output)) else 'NOT VERIFIED')
        save()
    report['passed'] = report['effect_verified'] and report['restoration'] == 'verified'

def check_parked(state):
    if (state['TITLE'] != 'A220-300' or state['SIM ON GROUND'] == 0
            or abs(state['GROUND VELOCITY']) > .1
            or state['L:A22X Parking Brake'] == 0
            or state['GENERAL ENG COMBUSTION:1'] != 0
            or state['GENERAL ENG COMBUSTION:2'] != 0):
        raise RuntimeError('Aircraft identity or parked-test conditions changed')

def experiment(sim, report, save):
    baseline = report['state']
    check_parked(baseline)
    cb = 'L:A22X Circuit Breaker R C1'
    if baseline[cb] != 0 or baseline['COM STATUS:1'] != 0:
        raise RuntimeError('VHF 1 is not initially available with its breaker closed')
    report['samples'] = []
    report['restoration'] = 'pending'
    save()
    attempted = False
    try:
        attempted = True
        sim.write_breaker(1.0)
        for i in range(12):
            time.sleep(.5)
            state = sim.read(FIELDS)
            report['samples'].append({'utc': dt.datetime.now(dt.timezone.utc).isoformat(), 'state': state})
            save()
            check_parked(state)
    finally:
        if attempted:
            # Do not replay on a reconnect or write into another loaded aircraft.
            fresh = sim.read(FIELDS)
            if fresh['TITLE'] != baseline['TITLE']:
                report['restoration'] = 'NOT ATTEMPTED: loaded aircraft changed'
                save()
                raise RuntimeError(report['restoration'])
            sim.write_breaker(baseline[cb])
            report['recovery_samples'] = []
            for i in range(10):
                time.sleep(.5)
                recovered = sim.read(FIELDS)
                report['recovery_samples'].append({'utc': dt.datetime.now(dt.timezone.utc).isoformat(), 'state': recovered})
                if recovered['TITLE'] != baseline['TITLE']:
                    raise RuntimeError('Aircraft changed during recovery observation')
            report['restoration'] = ('verified' if recovered[cb] == baseline[cb]
                                     and recovered['COM STATUS:1'] == baseline['COM STATUS:1']
                                     else 'NOT VERIFIED')
            save()
    report['effect_verified'] = any(s['state'][cb] == 1 and s['state']['COM STATUS:1'] in (2, 3)
                                  for s in report['samples'])
    report['passed'] = report['effect_verified'] and report['restoration'] == 'verified'

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--dll', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--test-vhf1', action='store_true', help='Pull R C1, observe, restore; parked A220 only')
    parser.add_argument('--test-dome', action='store_true', help='Dome lamp power-loss experiment via R B4')
    args = parser.parse_args()
    if args.test_vhf1 and args.test_dome:
        parser.error('Select only one experiment')
    report = {'utc': dt.datetime.now(dt.timezone.utc).isoformat(), 'dll': args.dll, 'mode': 'read-only'}
    sim = None
    def save():
        Path(args.output).write_text(json.dumps(report, indent=2), encoding='utf-8')
    try:
        sim = SimConnect(args.dll)
        report['state'] = sim.read(FIELDS)
        if args.test_vhf1:
            report['mode'] = 'VHF1 R C1 activation and restoration'
            experiment(sim, report, save)
        elif args.test_dome:
            report['mode'] = 'Dome R B4 activation and restoration'
            dome_experiment(sim, report, save)
    except Exception as error:
        report['error'] = str(error)
    finally:
        if sim:
            try:
                sim.close()
            except Exception as error:
                report['close_error'] = str(error)
        save()
        summary = {k:v for k,v in report.items() if k not in ('samples', 'recovery_samples')}
        if report.get('samples'):
            summary['first_active_sample'] = report['samples'][0]
            summary['last_active_sample'] = report['samples'][-1]
        if report.get('recovery_samples'):
            summary['last_recovery_sample'] = report['recovery_samples'][-1]
        print(json.dumps(summary, indent=2), flush=True)
    if 'error' in report or 'close_error' in report:
        return 1
    return 2 if report.get('passed') is False else 0

if __name__ == '__main__':
    raise SystemExit(main())
