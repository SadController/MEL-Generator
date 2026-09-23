'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const production = path.resolve(__dirname,'../../production');
const development = path.resolve(__dirname,'..');
const {Generator,combinations} = require(path.join(development,'legacy-core/generator.cjs'));
const catalog = require(path.join(production,'data/catalog.json'));
const rules = require(path.join(production,'data/rules.json'));
const original = require('../research_fenix/efb_mmel_pool/pool.json');
const originalRules = require('../research_fenix/efb_mmel_pool/rules.json');
const forbidden = require('../research_fenix/efb_mmel_pool/forbidden_combinations.json');
const create = random => new Generator(catalog,rules,random);
const key = ids => [...ids].sort().join('+');

test('English catalogue preserves all 53 reviewed identities, references and constraints',()=>{
  assert.equal(catalog.records.length,53);
  assert.equal(rules.profiles.length,29);
  assert.equal(rules.profiles.reduce((n,p)=>n+p.alternatives.length,0),47);
  assert.doesNotMatch(JSON.stringify({records:catalog.records,profiles:rules.profiles}),/[\u0400-\u04ff]/);
  for(const r of catalog.records) {
    const source = original.records.find(s=>s.id===r.id);
    for(const field of ['efb_path','source_id','mmel_id','mmel_title','pdf_pages','rule_profile']) assert.deepEqual(r[field],source[field]);
    assert.ok(r.name.length);
  }
  for(const p of rules.profiles) {
    const source = originalRules.profiles.find(s=>s.id===p.id);
    assert.deepEqual(p.member_ids,source.member_ids);
    assert.equal(p.mmel_id,source.mmel_id);
    assert.deepEqual(p.alternatives.map(a=>a.id),source.alternatives.map(a=>a.id));
    for(const a of p.alternatives) {
      const s = source.alternatives.find(s=>s.id===a.id);
      for(const f of ['permitted_failed_ids','max_failed','requires_operative_catalog_ids','pdf_pages']) assert.deepEqual(a[f],s[f]);
      assert.ok(a.conditions.every(c=>typeof c==='string' && c.length>0));
      assert.ok(a.pdf_pages.every(page=>Number.isInteger(page)&&page>0&&page<=472));
      assert.doesNotMatch(a.conditions.join(' '),/unpressurized/i);
    }
  }
});

test('all 24,857 sets match the independently recorded forbidden patterns',()=>{
  const g = create();
  const patterns = [...forbidden.forbidden_pairs,...forbidden.minimal_forbidden_triples].map(p=>p.ids);
  assert.equal(patterns.length,91);
  const counts = {};
  for(const n of [1,2,3]) {
    let allowed = 0, blocked = 0;
    for(const ids of combinations(catalog.records.map(r=>r.id),n)) {
      const expected = !patterns.some(pattern=>pattern.every(id=>ids.includes(id)));
      const assessment = g.assess(ids);
      assert.equal(assessment.allowed,expected,key(ids));
      if(expected) {
        allowed++;
        for(const [profile,branch] of Object.entries(assessment.branches)) {
          const p = originalRules.profiles.find(p=>p.id===profile);
          const failed = p.member_ids.filter(id=>ids.includes(id));
          const viable = p.alternatives.find(a=>failed.length<=a.max_failed && failed.every(id=>a.permitted_failed_ids.includes(id)) && !a.requires_operative_catalog_ids.some(id=>ids.includes(id)));
          assert.equal(branch.id,viable.id);
        }
      } else blocked++;
    }
    counts[n] = {allowed,blocked};
  }
  assert.deepEqual(counts,{1:{allowed:53,blocked:0},2:{allowed:1289,blocked:89},3:{allowed:19311,blocked:4115}});
});

test('alternate branches and constraints involving three failures',()=>{
  const g = create();
  assert.equal(g.assess(['M042','M043']).branches.AP.id,'AP_BOTH');
  assert.equal(g.assess(['M089','M090']).branches.APU_LOOPS.id,'APU_LOOPS_NO_USE');
  assert.equal(g.assess(['M327','M328']).branches.DCDU.id,'DCDU_BOTH_ALT');
  assert.equal(g.assess(['M257','M258']).branches.TAT_HEAT.id,'TAT_BOTH');
  for(const ids of [['M001','M002'],['M001','M038'],['M085','M086'],['M152','M153'],['M026','M282'],['M257','M267','M268'],['M258','M267','M268']]) assert.equal(g.assess(ids).allowed,false,key(ids));
  for(const ids of [['M085','M087'],['M144','M153'],['M282','M284'],['M267','M268'],['M257','M267'],['M042','M144','M323']]) assert.equal(g.assess(ids).allowed,true,key(ids));
});

test('every pool is drawn without replacement; switching aircraft and counts preserves history',()=>{
  const g = create();
  const sizes = {1:53,2:1289,3:19311};
  const seen = {1:new Set(),2:new Set(),3:new Set()};
  const last = {};
  for(let i=0;i<19311;i++) for(const n of [1,2,3]) {
    if(i>=sizes[n]) continue;
    const s = g.draw(['A319','A320','A321'][i%3],n);
    assert.equal(s.count,n);
    assert.equal(s.cards.length,n);
    assert.equal(s.aircraft,['A319','A320','A321'][i%3]);
    assert.equal(seen[n].has(s.key),false,`Repeated ${s.key}`);
    seen[n].add(s.key);
    assert.equal(s.cycle,1);
    assert.equal(g.assess(s.cards.map(c=>c.id)).allowed,true);
    for(const card of s.cards) {
      const branch = g.assess(s.cards.map(c=>c.id)).branches[card.rule_profile];
      assert.deepEqual(card.conditions,branch.conditions);
      assert.deepEqual(card.pdf_pages,branch.pdf_pages);
    }
    last[n]=s.key;
  }
  for(const n of [1,2,3]) {
    assert.equal(seen[n].size,sizes[n]);
    const next = g.draw('A320',n);
    assert.equal(next.cycle,2);
    assert.notEqual(next.key,last[n]);
  }
  assert.equal(create().draw('A321',1).cycle,1);
});

test('cycle boundary protection is exercised deterministically',()=>{
  const g = create(max=>max-1);
  const pool = g.pool(1);
  g.bags.set(1,{order:[0],cursor:1,last:0,cycle:1});
  const next = g.draw('A321',1);
  assert.notEqual(next.key,key(pool[0]));
  assert.equal(next.cycle,2);
});

test('invalid requests cannot generate a malformed scenario',()=>{
  const g = create();
  for(const ids of [[],['bad'],['M001','M001'],['M001','M020','M042','M144'],null]) assert.throws(()=>g.assess(ids));
  for(const n of [0,4,'2',NaN,null]) assert.throws(()=>g.draw('A321',n));
  assert.throws(()=>g.draw('A330',2));
});

test('bundled PDF is byte-identical to the agreed source',()=>{
  const hash = p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
  assert.equal(
    hash(path.join(production,'resources/MMEL.pdf')),
    hash(path.join(development,'sources_mel_mmel/00_current_mmel/FAA_A320_MMEL_Rev32_2025-07-30.pdf'))
  );
});
