"""Build the final 53-item catalogue and MMEL-only combination constraints.

Research/data preparation only: does not implement UI or control Fenix.
"""
from pathlib import Path
import json, csv, itertools, collections, hashlib

ROOT = Path(__file__).parent
OUT = ROOT / 'efb_mmel_pool'
load = lambda p: json.loads(p.read_text(encoding='utf-8'))
baseline = load(ROOT / 'efb_screening_53_snapshot.json')['records']
ix = {r['id']: r for r in load(ROOT / 'mmel_item_index.json')}
by_id = {r['menu_id']: r for r in baseline}
profiles = []

def ids(s):
    return s.split() if isinstance(s, str) else list(s)

def option(key, branch, conditions, allowed=None, maximum=None, healthy='', pages=None):
    return dict(id=key, branch=branch, conditions=conditions,
                permitted_failed_ids=None if allowed is None else ids(allowed),
                max_failed=maximum, requires_operative_catalog_ids=ids(healthy),
                pdf_pages=pages)

def profile(key, mmel, members, options, interpretation=None):
    members = ids(members)
    for op in options:
        if op['permitted_failed_ids'] is None: op['permitted_failed_ids'] = members
        if op['max_failed'] is None: op['max_failed'] = len(op['permitted_failed_ids'])
        if op['pdf_pages'] is None: op['pdf_pages'] = ix[mmel]['pdf_pages']
    profiles.append(dict(id=key, mmel_id=mmel, member_ids=members, alternatives=options,
                         interpretation=interpretation))

profile('CPC', '21-31-01', 'M001 M002', [
 option('CPC1', '1) System 1', ['Без ETOPS; CPC1 отключён.', 'Ручной режим и индикация давления на CAB PRESS исправны; оба FCU и CPC2 исправны.', 'Устранение в течение 3 flight-days.'], 'M001', healthy='M002 M038 M039'),
 option('CPC2', '2) System 2', ['CPC2 отключён.', 'Ручной режим и индикация давления на CAB PRESS исправны; оба FCU и CPC1 исправны.'], 'M002', healthy='M001 M038 M039'),
], 'По решению пользователя исключена общая строка негерметизированного полёта. Используются только допуски отдельных CPC при исправном другом CPC; сочетание CPC1+CPC2 исключено из генерации.')
profile('AEVC', '21-26-10', 'M020', [option('AEVC', 'Основная строка', [
 'Extract fan проверен исправным перед каждым полётом; оба pack исправны.',
 'BLOWER и EXTRACT — OVRD; air conditioning inlet и extract valve проверены в требуемых положениях перед каждым полётом; skin air inlet valve закреплён закрытым.'
], healthy='M022')])
profile('BLOWER', '21-26-01', 'M021', [option('BLOWER', 'Альтернативная строка с проверкой открытого inlet valve', [
 'Extract fan и оба pack исправны; BLOWER — OVRD.',
 'Air conditioning inlet valve проверен открытым перед каждым полётом; для Mod.20056 не превышать FL270.'
], healthy='M022')])
profile('EXTRACT', '21-26-02', 'M022', [option('EXTRACT', 'Альтернативная строка с проверкой открытого inlet valve', [
 'Blower fan и оба pack исправны; EXTRACT — OVRD; air conditioning inlet valve проверен открытым перед каждым полётом.',
 'Время на земле с электропитанием: OAT <38 °C — без ограничения; 39–45 °C — 3 ч; 46–50 °C — 2 ч; 51–54 °C — 35 мин. Значение 38 °C и температуры вне этих диапазонов источник явно не определяет; интерполяция не выполняется.'
], healthy='M021')])
profile('FAC2', '22-66-01', 'M026', [option('FAC2', '1) FAC2, без eRudder', [
 'Оба FCU, ELAC, SEC, ADIRS, SFCC, RA и LGCIU исправны; минимумы захода не требуют отказавший FAC2.'
], healthy='M038 M039 M282 M284')])
profile('RTL', '27-23-01', 'M029 M030', [option('RTL_ONE', 'Без eRudder: 2 установлено, 1 требуется', ['Допускается один канал, другой должен оставаться исправным.'], maximum=1)])
profile('RUDDER_TRIM', '27-22-01', 'M031 M032', [
 option('TRIM1', '1) System No.1', ['Без ETOPS; канал 2 исправен; минимумы захода не требуют канал 1.'], 'M031', healthy='M032'),
 option('TRIM2', '2) System No.2', ['Канал 1 исправен; минимумы захода не требуют канал 2.'], 'M032', healthy='M031')
])
profile('FCU', '22-81-01', 'M038 M039', [
 option('FCU_NO_ETOPS', '1) Channels, без eRudder; строка без ETOPS', ['Один канал; без ETOPS.', 'Исправны 2 RMP, все DU, оба RA/LGCIU/FAC/CPC, три ADIRS и standby altimeter либо барометрическая функция ISIS.'], maximum=1, healthy='M001 M002 M026'),
 option('FCU_ONE_LEG', '1) Channels, без eRudder; альтернативная строка', ['Один канал на один flight-leg.', 'Исправны 2 RMP, все DU, оба RA/LGCIU/FAC/CPC, три ADIRS и standby altimeter либо барометрическая функция ISIS.'], maximum=1, healthy='M001 M002 M026')
])
profile('AP', '22-10-01', 'M042 M043', [
 option('AP_ONE', '2 установлено, 1 требуется', ['Один AP; минимумы захода не требуют его использования.'], maximum=1),
 option('AP_BOTH', '2 установлено, 0 требуется', ['Минимумы захода и полёт по маршруту не требуют AP.', 'Число участков и их продолжительность приемлемы для экипажа. Исправные режимы могут использоваться.'])
])
profile('TR1', '24-30-01', 'M067', [option('TR1', 'Основная строка TR1', ['Без ETOPS; исправны Extract fan, индикация напряжения батарей и оба pack.', 'Минимумы захода не требуют TR1; устранение в течение 2 flight-days.'], healthy='M022')])
for engine, members in [(1, 'M085 M086'), (2, 'M087 M088')]:
 profile(f'ENGINE{engine}_LOOPS', '26-12-01', members, [option(f'ENG{engine}_ONE_LOOP', '1) Loop A / 2) Loop B', ['Не более одного отказавшего контура на этом двигателе; другой контур исправен.', 'Без ETOPS свыше 120 минут; engine fire test перед каждым вылетом.'], maximum=1)])
profile('APU_LOOPS', '26-13-01', 'M089 M090', [
 option('APU_LOOP_A', '1) Loops — Loop A', ['Без ETOPS свыше 120 минут; APU fire test перед каждым запуском APU; на земле состояние APU контролируется из кабины.'], 'M089', healthy='M090'),
 option('APU_LOOP_B', '1) Loops — Loop B', ['Без ETOPS свыше 120 минут; APU fire test перед каждым запуском APU.'], 'M090', healthy='M089'),
 option('APU_LOOPS_NO_USE', '1) Loops — 2 установлено, 0 требуется; строка без ETOPS', ['APU не используется; без ETOPS.']),
 option('APU_LOOPS_FOUR_FLIGHTS', '1) Loops — альтернативная строка с 0 требуется', ['APU не используется; без ETOPS свыше 120 минут; устранение в течение 4 flights.'])
])
profile('YELLOW_PUMP', '29-25-01', 'M144', [option('YELLOW_PUMP', 'Основная строка', ['Кнопка yellow electric pump — OFF.', 'Передняя и задняя грузовые двери должны обслуживаться вручную.'])])
profile('AUTOBRAKE', '32-42-04', 'M152', [option('AUTOBRAKE', 'AUTO/BRK Function, основная строка', ['Минимумы захода не требуют AUTO/BRK; normal braking не затронуто.'], healthy='M153 M154 M155 M156')],
 'Самостоятельно выбранный AUTO/BRK проверяется по 32-42-04(b). Отказ wheel brake затрагивает normal braking. Предусмотренное 32-42-01(i) состояние AUTO/BRK как последствия wheel brake записывается в карточку wheel brake и не требует отдельного выбора M152.')
profile('WHEEL_BRAKES', '32-42-01', 'M153 M154 M155 M156', [option('ONE_BRAKE', '4 установлено, 3 требуется', [
 'Один тормоз; ВПП шириной не менее 45 м; исправны antiskid, NWS и оба reverser.',
 'Отказавший тормоз снят или деактивирован; green и yellow systems на оставшихся тормозах исправны.',
 'Применяются поправки AFM; минимумы захода не требуют отказавший тормоз; AUTO/BRK считается неработающим.'
], maximum=1)])
profile('MCDU', '22-82-01', 'M198 M199', [option('MCDU_ONE', '1) Flightcrew Positions: 2 установлено, 1 требуется', ['Один MCDU пилотов; навигационные процедуры не требуют его использования.'], maximum=1)])

heaters = {
 'CAPT': ids('M254 M257 M260 M263 M264'),
 'FO': ids('M255 M258 M261 M265 M266'),
 'STBY': ids('M256 M262 M267 M268'),
}
other_heaters = lambda side: [m for s, members in heaters.items() if s != side for m in members]
aoa = []
pitot = []
for side, aid, pid in [('CAPT','M254','M260'), ('FO','M255','M261'), ('STBY','M256','M262')]:
    checks = 'ADR, обогреватели и предупреждения остальных двух позиций исправны.'
    ac = [checks + ' Проверка один раз каждый flight-day.']
    pc = [checks]
    if side == 'CAPT':
        ac += ['Без ETOPS свыше 120 минут; вне видимой влаги и известного/прогнозируемого обледенения.']
    if side in ('CAPT','STBY'):
        pc += ['Без ETOPS свыше 120 минут; вне видимой влаги и известного/прогнозируемого обледенения.']
    else:
        pc += ['В обледенении при ADR2 OFF запрещён взлёт CONF1+F.']
    aoa.append(option('AOA_'+side, side+' heater', ac, [aid], healthy=other_heaters(side)))
    pitot.append(option('PITOT_'+side, side+' heater', pc, [pid], healthy=other_heaters(side)))
profile('AOA_HEAT', '30-31-04', 'M254 M255 M256', aoa)
profile('PITOT_HEAT', '30-31-02', 'M260 M261 M262', pitot)
profile('TAT_HEAT', '30-31-05', 'M257 M258', [
 option('TAT_ONE', '2 установлено, 1 требуется', ['Допускается один обогреватель TAT.'], maximum=1),
 option('TAT_BOTH', '2 установлено, 0 требуется', ['Без ETOPS свыше 120 минут; вне видимой влаги и известного/прогнозируемого обледенения.'])
])
statics = [option('STATIC_ONE_STBY', '6 установлено, 5 требуется; один STBY', ['Допускается один STBY static heater.'], 'M267 M268', maximum=1)]
for side, members in [('CAPT','M263 M264'), ('FO','M265 M266'), ('STBY','M267 M268')]:
    conditions = ['ADR, обогреватели и предупреждения исправных позиций проверены работоспособными.']
    if side == 'FO': conditions += ['В обледенении при ADR2 OFF запрещён взлёт CONF1+F.']
    else: conditions += ['При ВПП с водой или слякотью температура в аэропорту вылета выше +5 °C.']
    if side == 'STBY': conditions += ['Без ETOPS свыше 120 минут.']
    statics.append(option('STATIC_'+side, '6 установлено, 4 требуется; '+side+' heaters', conditions, members, maximum=2, healthy=other_heaters(side)))
profile('STATIC_HEAT', '30-31-03', 'M263 M264 M265 M266 M267 M268', statics,
 'Фраза «associated with the operative units» сопоставлена с остальными позициями CAPT/F/O/STBY. Ветвь одного STBY не содержит этого требования. Это явная интерпретация текста для правил, не проверка архитектуры Fenix.')
profile('SFCC2_FLAP', '27-51-01', 'M282', [option('SFCC2_FLAP', '1)a) CEO FLAP Channels', [
 'Slats и flaps работают на SFCC1; WTB SFCC1 проверены перед каждым вылетом; питание SFCC2 flap channel отключено.',
 'ELAC, SEC, ADIRS, LGCIU, FAC, RA и spoilers 2/4 исправны; minimum idle on ground function считается неработающей.'
], healthy='M026', pages=[180])])
profile('SFCC2_SLAT', '27-51-01', 'M284', [option('SFCC2_SLAT', '2)a) SLAT Channel без eRudder', [
 'Slats и flaps работают на SFCC1; WTB SFCC1 проверены перед каждым вылетом; питание SFCC2 slat channel отключено.',
 'ELAC, SEC, ADIRS, LGCIU, FAC и RA исправны; взлёт CONF1+F запрещён.'
], healthy='M026', pages=[181])])
profile('YAW_DAMPER', '22-63-01', 'M295 M296', [
 option('YAW1', '1) System 1', ['System2 исправна; минимумы захода не требуют System1.'], 'M295', healthy='M296'),
 option('YAW2', '2) System 2', ['System1 исправна; минимумы захода не требуют System2; при утечке актуатора System2 деактивируется.'], 'M296', healthy='M295')
])
profile('CFDIU', '31-30-01', 'M317', [option('CFDIU', 'CFDS, основная строка', ['CFDS должен быть доступен, когда требуется для предусмотренных работ техобслуживания.'])])
profile('SDAC2', '31-55-01', 'M320', [option('SDAC2', 'SDAC2: 2 установлено, 1 требуется', ['Допускается SDAC2; SDAC1 остаётся исправным.'])])
profile('FWC2', '31-53-01', 'M322', [option('FWC2', '1)/2) FWC2', ['Минимумы захода не требуют FWC2; при Mod.35542 steep approach не используется.'])])
profile('CVR', '23-71-01', 'M323', [option('CVR', 'Основная строка', ['FDR исправен; устранение в течение 3 flight-days.'])])
profile('DCDU', '46-21-02', 'M327 M328', [
 option('DCDU_ONE', '2 установлено, 1 требуется', ['Допускается один DCDU.'], maximum=1),
 option('DCDU_BOTH_ALT', '2 установлено, 0 требуется; альтернативные процедуры', ['Установлены и используются альтернативные процедуры.']),
 option('DCDU_BOTH_NOT_REQUIRED', '2 установлено, 0 требуется; использование не требуется', ['Процедуры не требуют использования DCDU.'])
])

def assess(selection):
    """Accept iff each affected MMEL item has at least one non-conflicting branch."""
    selected = set(selection)
    if len(selected) != len(selection) or not 1 <= len(selected) <= 3 or not selected <= by_id.keys():
        raise ValueError('Expected 1-3 distinct known catalogue IDs')
    chosen, blocked = [], []
    for p in profiles:
        failed = selected.intersection(p['member_ids'])
        if not failed: continue
        viable, reasons = [], []
        for op in p['alternatives']:
            if not failed <= set(op['permitted_failed_ids']) or len(failed) > op['max_failed']:
                reasons.append(dict(option_id=op['id'], kind='failed_count_or_position', failed_ids=sorted(failed)))
                continue
            clash = selected.intersection(op['requires_operative_catalog_ids'])
            if clash:
                reasons.append(dict(option_id=op['id'], kind='requires_operative', conflicting_ids=sorted(clash)))
            else:
                viable.append(op)
        if viable:
            op = viable[0]
            chosen.append(dict(profile_id=p['id'], mmel_id=p['mmel_id'], selected_option=op['id'],
                               available_options=[o['id'] for o in viable], conditions=op['conditions']))
        else:
            blocked.append(dict(profile_id=p['id'], mmel_id=p['mmel_id'],
                                pdf_pages=sorted({n for o in p['alternatives'] for n in o['pdf_pages']}),
                                failed_ids=sorted(failed), reasons=reasons))
    return dict(result='blocked_by_mmel' if blocked else 'no_mmel_conflict_found',
                blocking_rules=blocked, selected_branches=chosen)

names = {
 'M001':'Контроллер герметизации CPC1', 'M002':'Контроллер герметизации CPC2',
 'M020':'Компьютер вентиляции AEVC', 'M021':'Вентилятор Blower', 'M022':'Вентилятор Extract',
 'M026':'Компьютер FAC2 — невосстанавливаемый отказ',
 'M029':'Ограничитель хода руля направления — канал 1', 'M030':'Ограничитель хода руля направления — канал 2',
 'M031':'Триммер руля направления — канал 1', 'M032':'Триммер руля направления — канал 2',
 'M038':'FCU — канал 1', 'M039':'FCU — канал 2', 'M042':'Автопилот AP1', 'M043':'Автопилот AP2',
 'M067':'Преобразователь TR1', 'M085':'Обнаружение пожара двигателя 1 — Loop A',
 'M086':'Обнаружение пожара двигателя 1 — Loop B', 'M087':'Обнаружение пожара двигателя 2 — Loop A',
 'M088':'Обнаружение пожара двигателя 2 — Loop B', 'M089':'Обнаружение пожара APU — Loop A',
 'M090':'Обнаружение пожара APU — Loop B', 'M144':'Жёлтый электрический гидронасос',
 'M152':'Функция автоматического торможения AUTO/BRK',
 'M153':'Колёсный тормоз 1', 'M154':'Колёсный тормоз 2', 'M155':'Колёсный тормоз 3', 'M156':'Колёсный тормоз 4',
 'M198':'MCDU1', 'M199':'MCDU2', 'M254':'Обогрев датчика AOA CAPT', 'M255':'Обогрев датчика AOA F/O',
 'M256':'Обогрев датчика AOA STBY', 'M257':'Обогрев датчика TAT CAPT', 'M258':'Обогрев датчика TAT F/O',
 'M260':'Обогрев приёмника Pitot CAPT', 'M261':'Обогрев приёмника Pitot F/O', 'M262':'Обогрев приёмника Pitot STBY',
 'M263':'Обогрев статического порта CAPT — левый', 'M264':'Обогрев статического порта CAPT — правый',
 'M265':'Обогрев статического порта F/O — левый', 'M266':'Обогрев статического порта F/O — правый',
 'M267':'Обогрев статического порта STBY — левый', 'M268':'Обогрев статического порта STBY — правый',
 'M282':'SFCC2 — канал закрылков', 'M284':'SFCC2 — канал предкрылков',
 'M295':'Демпфер рыскания — канал 1', 'M296':'Демпфер рыскания — канал 2',
 'M317':'Блок диагностики CFDIU', 'M320':'Концентратор SDAC2', 'M322':'Компьютер предупреждений FWC2',
 'M323':'Речевой самописец CVR', 'M327':'DCDU CAPT', 'M328':'DCDU F/O',
}

def dump(name, data):
    (OUT/name).write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')

def write_csv(name, fields, rows):
    with (OUT/name).open('w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, fieldnames=fields); w.writeheader(); w.writerows(rows)

def build():
    assert len(baseline) == 53 and set(names) == set(by_id)
    membership = [i for p in profiles for i in p['member_ids']]
    assert sorted(membership) == sorted(by_id)
    for p in profiles:
        for op in p['alternatives']:
            assert set(op['requires_operative_catalog_ids']) <= by_id.keys()
            assert set(op['permitted_failed_ids']) <= set(p['member_ids'])
            assert op['conditions'] and op['pdf_pages'] and op['branch']
    records=[]
    for old in baseline:
        mid=old['menu_id']; p=next(p for p in profiles if mid in p['member_ids'])
        single=assess([mid]); assert single['result']=='no_mmel_conflict_found'
        chosen=single['selected_branches'][0]
        op=next(o for o in p['alternatives'] if o['id']==chosen['selected_option'])
        records.append(dict(id=mid, name=names[mid], efb_path=old['path'],
                            source_id='FAA_A320_R32', mmel_id=p['mmel_id'],
                            mmel_title=ix[p['mmel_id']]['title'], pdf_pages=ix[p['mmel_id']]['pdf_pages'],
                            default_branch=op['branch'], conditions=op['conditions'], rule_profile=p['id'],
                            alternative_branch_ids=[o['id'] for o in p['alternatives'] if mid in o['permitted_failed_ids']]))
    source=dict(id='FAA_A320_R32', name='FAA A320 MMEL', revision='32', date='2025-07-30',
                pdf='../../sources_mel_mmel/00_current_mmel/FAA_A320_MMEL_Rev32_2025-07-30.pdf',
                url='https://drs.faa.gov/browse/excelExternalWindow/DRSDOCID152739505920250730144819.0001')
    metadata=dict(schema_version='final-1.0', status='final_for_agreed_scope', date='2026-09-14', count=53,
        source=source, efb_snapshot=dict(date='2026-09-13', version='2.4.0.4720', aircraft='A321-231 IAE WTF'),
        shared_pool_assumption='User decision: every catalogue entry is available for Fenix A319/A320/A321 and CFM/IAE. Not an assertion that FAA applicability clauses are identical.',
        categories_enabled=False, aircraft_engine_filters_enabled=False, behavior_tests_required=False,
        unpressurized_flight_branches_enabled=False,
        combination_policy='Accept unless the modeled MMEL conditions prohibit the selected combination; retain applicable alternative-branch conditions.',
        no_conflict_meaning='No conflict found in reviewed MMEL provisions for these 53 named faults; not empirical behavior validation or an unconditional dispatch approval.')
    dump('pool.json',dict(metadata=metadata,records=records))
    write_csv('pool.csv',['id','name','efb_path','mmel_id','pdf_pages','default_branch','conditions','rule_profile'],
              [dict((k, '; '.join(map(str,r[k])) if isinstance(r[k],list) else r[k]) for k in ['id','name','efb_path','mmel_id','pdf_pages','default_branch','conditions','rule_profile']) for r in records])
    rules=dict(schema_version='1.0', source=source, scope='Only 53 catalogue faults, combinations of 1-3 distinct entries.',
        policy='For every affected profile, at least one MMEL alternative must permit the failed members/count and require no other selected failure to be operative.',
        default='no_mmel_conflict_found', profiles=profiles,
        excluded_branches=[dict(mmel_id='21-31-01', branch='Общая строка: 2 установлено, 0 требуется', pdf_pages=[37], reason='User excludes scenarios requiring unpressurized flight. CPC1 and CPC2 individual permissions remain.')],
        interpretation_boundaries=[
          'A named component/function failure is taken at face value. No simulated secondary effects or undocumented architecture dependencies are inferred.',
          'Explicit system-wide operative requirements map to catalogue failures of that system: e.g. SFCC includes its FLAP/SLAT channels.',
          'Static-heater operative units are interpreted as the other CAPT/F/O/STBY positions; stated explicitly in STATIC_HEAT.',
          'Independent AUTO/BRK failure requires normal braking; a failed wheel brake is a conflict. AUTO/BRK already deemed inoperative by a wheel-brake deferral is recorded as a consequence, not a separately selected independent defect.',
          'External conditions (weather, route, maintenance, tests and equipment outside this pool) remain in the card and are not additional selection filters.',
          'No arbitrary ban on two failures in one ATA, severity, same engine, or an undocumented combination is introduced.'
        ])
    dump('rules.json', rules)
    allids=sorted(by_id); pairs=[]; triples=[]; pairset=set(); counts={}
    for size in [1,2,3]:
        counter=collections.Counter()
        for combo in itertools.combinations(allids,size):
            result=assess(combo); counter[result['result']]+=1
            if result['result']=='blocked_by_mmel':
                row=dict(ids=list(combo), rules=result['blocking_rules'])
                if size==2: pairs.append(row); pairset.add(combo)
                elif size==3 and not any(p in pairset for p in itertools.combinations(combo,2)): triples.append(row)
        counts[str(size)]=dict(counter)
    dump('forbidden_combinations.json',dict(forbidden_pairs=pairs,minimal_forbidden_triples=triples))
    for size, filename, data in [(2,'forbidden_pairs.csv',pairs),(3,'forbidden_triples.csv',triples)]:
        fields=[f'id{i+1}' for i in range(size)]+['names','mmel','rule_profiles']
        write_csv(filename, fields, [dict(zip(fields[:size],r['ids']))|dict(names=' + '.join(names[i] for i in r['ids']), mmel='; '.join(sorted({x['mmel_id'] for x in r['rules']})), rule_profiles='; '.join(x['profile_id'] for x in r['rules'])) for r in data])
    checks={
     'CPC1_CPC2_excluded_unpressurized': (['M001','M002'],False),
     'CPC_FCU_blocked': (['M001','M038'],False),
     'both_AP_allowed': (['M042','M043'],True),
     'both_DCDU_allowed': (['M327','M328'],True),
     'both_APU_loops_allowed': (['M089','M090'],True),
     'both_TAT_allowed': (['M257','M258'],True),
     'same_engine_fire_loops_blocked': (['M085','M086'],False),
     'different_engine_fire_loops_allowed': (['M085','M087'],True),
     'both_FCU_blocked': (['M038','M039'],False),
     'two_brakes_blocked': (['M153','M154'],False),
     'independent_autobrake_brake_blocked': (['M152','M153'],False),
     'yellow_pump_brake_no_inferred_system_loss': (['M144','M153'],True),
     'FAC_SFCC_blocked': (['M026','M282'],False),
     'SFCC2_both_channels_allowed': (['M282','M284'],True),
     'different_position_heaters_blocked': (['M254','M261'],False),
     'same_position_heaters_allowed': (['M254','M260'],True),
     'one_STBY_static_TAT_allowed': (['M267','M257'],True),
     'both_STBY_static_allowed': (['M267','M268'],True),
     'triple_STBY_static_TAT_blocked': (['M267','M268','M257'],False),
     'independent_triple_allowed': (['M042','M144','M323'],True),
    }
    for name,(selection,allowed) in checks.items():
        assert (assess(selection)['result']=='no_mmel_conflict_found')==allowed,name
    # Check that the compact pair/hyperedge representation reproduces every decision.
    tset={tuple(t['ids']) for t in triples}
    for size in [1,2,3]:
        for combo in itertools.combinations(allids,size):
            compact=any(p in pairset for p in itertools.combinations(combo,2)) or combo in tset
            assert compact==(assess(combo)['result']=='blocked_by_mmel'),combo
    # Do not lose the additional conditions on branches that allow multiple failures.
    for selection,op in [(['M042','M043'],'AP_BOTH'),(['M089','M090'],'APU_LOOPS_NO_USE'),(['M257','M258'],'TAT_BOTH'),(['M327','M328'],'DCDU_BOTH_ALT')]:
        assert op in [p['selected_option'] for p in assess(selection)['selected_branches']]
    assert not any('unpressur' in c.lower() or 'негермет' in c.lower() for p in profiles for op in p['alternatives'] for c in op['conditions'])
    verification=dict(catalog_entries=len(records), mmel_items=len({r['mmel_id'] for r in records}),
      profiles=len(profiles), combinations_checked=counts, forbidden_pairs=len(pairs),
      minimal_forbidden_triples=len(triples), semantic_examples_passed=len(checks),
      compact_rules_match_full_evaluator=True, all_records_referenced=True,
      categories_and_aircraft_engine_filters_absent_from_records=True,
      app_implemented=False, simulator_behavior_tests=0)
    write_docs(records, rules, pairs, triples, verification)
    verification['sha256']={name:hashlib.sha256((OUT/name).read_bytes()).hexdigest() for name in ['pool.json','pool.csv','rules.json','forbidden_combinations.json']}
    dump('verification.json',verification)
    print(json.dumps(verification,ensure_ascii=False,indent=2))

def write_docs(records,rules,pairs,triples,verification):
    text=['# Окончательный каталог — 53 отказа','',
      'Единый пул для Fenix A319/A320/A321 и CFM/IAE по решению пользователя. Категорий и фильтрации по самолёту/двигателю нет. Это допущение приложения, а не изменение применимости FAA MMEL. Варианты допуска, требующие негерметизированного полёта, исключены. CPC1 и CPC2 сохранены по отдельности; вместе они не генерируются.',
      '', 'Источник: FAA A320 MMEL Rev32 от 30.07.2025. Названия и пути взяты из EFB Fenix 2.4.0.4720, снимок A321 IAE WTF от 13.09.2026. Поведение не проверяется.',
      '', 'У каждой записи сохранены точный путь EFB, пункт и страницы MMEL, условия одиночного отказа. Для сочетаний используются альтернативные строки из [правил](ПРАВИЛА_СОЧЕТАНИЙ.md); они могут заменить условия одиночной карточки. Обозначения (M)/(O) и полный текст находятся в исходном MMEL; краткая карточка не воспроизводит сами процедуры.',
      '', '| ID | Отказ | Пункт MMEL | PDF-страницы |','|---|---|---|---|']
    for r in records: text.append(f"| {r['id']} | {r['name']} | {r['mmel_id']} | {', '.join(map(str,r['pdf_pages']))} |")
    for r in records:
        text += ['',f"## {r['id']} — {r['name']}",'',f"**EFB:** {r['efb_path']}",'',
          f"**FAA MMEL:** {r['mmel_id']} — {r['mmel_title']}; PDF стр. {', '.join(map(str,r['pdf_pages']))}.",'',
          f"**Основная строка:** {r['default_branch']}",'']+['- '+c for c in r['conditions']]
        text += ['',f"**Профиль сочетаний:** {r['rule_profile']}. Альтернативные строки: {', '.join(r['alternative_branch_ids'])}."]
    (OUT/'КАТАЛОГ.md').write_text('\n'.join(text)+'\n',encoding='utf-8')
    (OUT/'01_ДОПУСК_С_УСЛОВИЯМИ.md').write_text('# Каталог обновлён\n\nАктуальные 53 записи и условия: [окончательный каталог](КАТАЛОГ.md).\n\nДля сочетаний применяются [правила MMEL](ПРАВИЛА_СОЧЕТАНИЙ.md).\n',encoding='utf-8')
    text=['# Правила сочетаний по FAA MMEL','',
      '**Критерий сочетаний:** выбранные отказы не должны нарушать требования MMEL к исправности другого оборудования или допустимому числу неработающих единиц. Подходящие альтернативные строки учитываются вместе с условиями; по отдельному решению пользователя исключены варианты с негерметизированным полётом.',
      '', 'Оценивается весь набор из 1–3 разных ID. Повтор ID не является вторым отказом. Если для каждого затронутого пункта существует подходящая строка, результат — «запрет по учтённым условиям MMEL не найден». Это не безусловный допуск: условия выбранной строки сохраняются в результате.',
      '', f"Проверены все 53 одиночных отказа, 1378 пар и 23426 троек. Найдено **{len(pairs)} запрещённых пар** и **{len(triples)} дополнительных минимальных запрещённых троек**, у которых каждая пара по отдельности проходит проверку.",
      '', 'Машинные правила: [rules.json](rules.json). Полные причины: [forbidden_combinations.json](forbidden_combinations.json). Таблицы: [пары](forbidden_pairs.csv), [тройки](forbidden_triples.csv).',
      '', '## Учитываемые исключения','',
      '- CPC1 + CPC2 исключено: допускавшая эту пару общая строка 21-31-01 требует негерметизированного полёта и убрана по решению пользователя. Отдельные CPC остаются в каталоге. FCU + CPC также запрещено: пункт FCU требует оба CPC исправными.',
      '- AP1 + AP2: 22-10-01 допускает оба с ограничениями маршрута, минимумов и нагрузки на экипаж.',
      '- Оба контура APU: 26-13-01 допускает при неиспользовании APU и ограничениях выбранной строки.',
      '- Оба TAT heaters: 30-31-05 допускает без ETOPS свыше 120 минут, видимой влаги и обледенения.',
      '- Оба DCDU: 46-21-02 допускает при альтернативных процедурах либо отсутствии необходимости использования.',
      '- SFCC2 FLAP + SFCC2 SLAT: в учтённых строках нет требования сохранять другой канал SFCC2; требования к SFCC1 и остальным системам остаются.',
      '', '## Явные границы интерпретации','',
      '- Для static heaters «operative units» трактуются как остальные позиции CAPT/F/O/STBY. Из этого следуют указанные связи с обогревателями других позиций. Строка одного STBY не содержит такого условия.',
      '- Отдельно выбранный AUTO/BRK + wheel brake запрещён по 32-42-04(b), требующему незатронутое normal braking. У wheel brake в 32-42-01(i) уже записано состояние AUTO/BRK как последствия: его не нужно отдельно активировать как второй независимый дефект.',
      '- Не выводятся дополнительные отказы из предполагаемого поведения FAC, FWC, SDAC, CFDS, электропитания или гидросистем. Например, отказ yellow electric pump не приравнивается к отказу всей yellow system.',
      '- Погода, маршрут, сроки и технические действия остаются условиями карточек; автоматическими фильтрами набора они сейчас не являются.',
      '', '## Минимальные запрещённые тройки','']
    for r in triples: text.append('- '+' + '.join(f"{i} ({names[i]})" for i in r['ids'])+' — '+', '.join(sorted({p['mmel_id'] for p in r['rules']}))+'.')
    text += ['', '## Основания всех правил', '']
    for p in profiles:
        text += [f"### {p['id']} — {p['mmel_id']}",'', 'Записи: '+', '.join(p['member_ids'])+'.', '']
        if p['interpretation']: text += [p['interpretation'],'']
        for o in p['alternatives']:
            text += [f"**{o['id']} — {o['branch']}**, PDF стр. {', '.join(map(str,o['pdf_pages']))}.", '',
              f"Допустимые отказавшие позиции: {', '.join(o['permitted_failed_ids'])}; одновременно не более {o['max_failed']}.",
              'Из каталога должны оставаться исправными: '+(', '.join(o['requires_operative_catalog_ids']) or 'дополнительных ID в этой строке нет')+'.','']+['- '+c for c in o['conditions']]+['']
    (OUT/'ПРАВИЛА_СОЧЕТАНИЙ.md').write_text('\n'.join(text)+'\n',encoding='utf-8')
    (OUT/'РЕЕСТР.md').write_text('\n'.join(['# Окончательный каталог и правила сочетаний','',
      'Пункты плана 5 и 6 завершены в согласованном объёме. 53 отказа; единый пул для A319/A320/A321 и CFM/IAE по допущению пользователя. Деления на категории и фильтрации по применимости нет. Поведение Fenix не исследуется.', '',
      '- [Окончательный каталог](КАТАЛОГ.md).', '- Каталог для приложения: [JSON](pool.json), [CSV](pool.csv).',
      '- [Правила сочетаний и основания MMEL](ПРАВИЛА_СОЧЕТАНИЙ.md).', '- [Машинные правила](rules.json).',
      '- [Запрещённые пары](forbidden_pairs.csv) и [минимальные запрещённые тройки](forbidden_triples.csv).',
      '- [Результаты проверки](verification.json).', '- [Тексты пунктов MMEL](ПУНКТЫ_MMEL.md).', '',
      f"Проверено 53 одиночных отказа, 1378 пар и 23426 троек; {len(pairs)} запрещённых пар, {len(triples)} дополнительных минимальных запрещённых троек. Сохранение условий альтернативных допусков проверено.", '',
      'Источник: FAA A320 MMEL Rev32 от 30.07.2025. Исходное наблюдение EFB: A321 IAE WTF, Fenix 2.4.0.4720, 13.09.2026. Общая применимость — принятое допущение приложения, а не вывод FAA. Варианты негерметизированного полёта исключены: CPC1 и CPC2 доступны отдельно, их сочетание исключено.', '',
      'Следующий этап — интерфейс и разработка. В этой работе они не выполнялись.', '']),encoding='utf-8')

if __name__=='__main__': build()
