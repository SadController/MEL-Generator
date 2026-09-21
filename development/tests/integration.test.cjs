'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {FenixAdapter,flattenManualFailures,isSupportedFenix} = require('../../production/desktop/integration.cjs');

function payload(items) {
  return {atas:[{id:'22',groups:[{groupName:'Test',failures:items}]}]};
}

function mockGateway(initial,{failOn}={}) {
  const state=new Map(initial.map(item=>[item.id,{...item}]));
  const calls=[];
  return {
    state,calls,
    request:async (url,options={})=>{
      if(url.endsWith('/failures/manual')) return payload([...state.values()]);
      const body=options.body;
      calls.push({...body});
      if(body.id===failOn && body.failed) return {...state.get(body.id),failed:false};
      const next={...state.get(body.id),failed:body.failed,
        failureCondition:body.failed ? {id:3} : null};
      state.set(body.id,next);
      return {...next};
    }
  };
}

test('Fenix catalogue parsing and supported-title recognition are strict',()=>{
  const records=flattenManualFailures(payload([{id:'F_ONE',title:'One',failed:false,failureCondition:null}]));
  assert.equal(records.get('F_ONE').group,'Test');
  assert.equal(isSupportedFenix('FenixA321 IAE WF SC'),true);
  assert.equal(isSupportedFenix('FenixA319 CFM'),true);
  assert.equal(isSupportedFenix('A220-300'),false);
  assert.throws(()=>flattenManualFailures({bad:true}));
});

test('Fenix adapter activates mapped records, verifies them and preserves an active record',async()=>{
  const gateway=mockGateway([
    {id:'F_ONE',title:'One',failed:false,failureCondition:null},
    {id:'F_TWO',title:'Two',failed:true,failureCondition:{id:3}}
  ]);
  const adapter=new FenixAdapter({mapping:{M001:'F_ONE',M002:'F_TWO'},request:gateway.request,clearSettleMs:0});
  assert.deepEqual(await adapter.probe(),{ready:true,records:2,mapped:2});
  const result=await adapter.activate(['M001','M002']);
  assert.equal(result.overall,'success');
  assert.deepEqual(result.results.map(item=>item.status),['activated','already-active']);
  assert.equal(gateway.state.get('F_ONE').failed,true);
  assert.equal(gateway.state.get('F_TWO').failed,true);
});

test('Fenix adapter rolls back only records activated by the failed operation',async()=>{
  const gateway=mockGateway([
    {id:'F_ONE',title:'One',failed:false,failureCondition:null},
    {id:'F_TWO',title:'Two',failed:false,failureCondition:null},
    {id:'F_USER',title:'User',failed:true,failureCondition:null}
  ],{failOn:'F_TWO'});
  const adapter=new FenixAdapter({mapping:{M001:'F_ONE',M002:'F_TWO',M003:'F_USER'},request:gateway.request,clearSettleMs:0});
  const result=await adapter.activate(['M001','M002']);
  assert.equal(result.overall,'failed');
  assert.equal(result.results.find(item=>item.catalogId==='M001').status,'rolled-back');
  assert.equal(gateway.state.get('F_ONE').failed,false);
  assert.equal(gateway.state.get('F_USER').failed,true);
});
