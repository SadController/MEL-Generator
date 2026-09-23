'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {CATALOG,issue,classifyError,activationIssue,resultEnvelope} = require('../../production/desktop/user-errors.cjs');

test('public error catalogue has stable actionable entries without technical details',()=>{
  assert.ok(Object.keys(CATALOG).length>=25);
  for(const [code,value] of Object.entries(CATALOG)) {
    assert.match(code,/^[A-Z0-9_]+$/);
    assert.ok(value.title && value.message && value.action);
    assert.ok(['warning','error'].includes(value.severity));
    assert.equal(typeof value.retryable,'boolean');
    assert.doesNotMatch(`${value.title} ${value.message} ${value.action}`,/stack|HRESULT|ECONNREFUSED|127\.0\.0\.1/i);
    assert.doesNotMatch(`${code} ${value.title} ${value.message} ${value.action}`,/fenix/i);
  }
  for(const code of ['SOURCE_MISSING','SOURCE_OPEN_FAILED'])
    assert.doesNotMatch(`${CATALOG[code].title} ${CATALOG[code].message} ${CATALOG[code].action}`,/mmel/i);
});

test('expected update failures map to distinct public recovery messages',()=>{
  assert.equal(classifyError('update-check',new Error('HTTP 429')).code,'UPDATE_RATE_LIMITED');
  assert.equal(classifyError('update-check',new Error('ENOTFOUND github.com')).code,'UPDATE_NETWORK_UNAVAILABLE');
  assert.equal(classifyError('update-download',new Error('ENOSPC')).code,'UPDATE_NO_SPACE');
  assert.equal(classifyError('update-download',new Error('sha512 checksum mismatch')).code,'UPDATE_VERIFICATION_FAILED');
  assert.equal(classifyError('update-download',new Error('invalid stable release metadata')).code,'UPDATE_METADATA_INVALID');
});

test('activation failures distinguish readiness, support, mapping, readback and rollback',()=>{
  assert.equal(activationIssue({overall:'failed',message:'failed'},{simConnected:false}).code,'SIMULATOR_NOT_READY');
  assert.equal(activationIssue({overall:'failed',message:'failed'},{simConnected:true,aircraftLoaded:true,supportedAircraft:false}).code,'AIRCRAFT_UNSUPPORTED');
  const ready={simConnected:true,aircraftLoaded:true,supportedAircraft:true};
  assert.equal(classifyError('activation',new Error('Integration Service executable is missing')).code,'INTEGRATION_SERVICE_MISSING');
  assert.equal(activationIssue({overall:'failed',message:'Aircraft failure catalogue is missing: F_X'},ready).code,'FAILURE_MAPPING_INCOMPLETE');
  assert.equal(activationIssue({overall:'failed',message:'The aircraft failure adapter is unavailable.'},ready).code,'AIRCRAFT_FAILURE_INTERFACE_UNAVAILABLE');
  assert.equal(activationIssue({overall:'failed',message:'readback did not confirm'},ready).code,'ACTIVATION_NOT_CONFIRMED');
  assert.equal(activationIssue({overall:'failed',message:'failed',rollbackError:'clear failed'},ready).code,'ACTIVATION_ROLLBACK_FAILED');
});

test('reviewed error catalogue documentation contains every executable error code',()=>{
  const documentation=fs.readFileSync(path.resolve(__dirname,'../documentation/ERROR_CATALOG.md'),'utf8');
  for(const code of Object.keys(CATALOG)) assert.ok(documentation.includes('`'+code+'`'),code);
});

test('IPC result envelopes expose only catalogued errors',async()=>{
  const success=await resultEnvelope('generation',async()=>({cards:[]}));
  assert.deepEqual(success,{ok:true,value:{cards:[]}});
  const failure=await resultEnvelope('activation',async()=>{throw new Error('ECONNREFUSED 127.0.0.1:8083');});
  assert.equal(failure.ok,false);
  assert.equal(failure.error.code,'AIRCRAFT_FAILURE_INTERFACE_UNAVAILABLE');
  assert.equal(JSON.stringify(failure).includes('127.0.0.1'),false);
  assert.equal(issue('UNKNOWN').code,'UNEXPECTED_ERROR');
});
