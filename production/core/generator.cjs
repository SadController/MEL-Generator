'use strict';
const { randomInt } = require('node:crypto');

function* combinations(ids, count, start = 0, prefix = []) {
  if (count === 0) { yield prefix; return; }
  for (let i = start; i <= ids.length - count; i++) {
    yield* combinations(ids, count - 1, i + 1, [...prefix, ids[i]]);
  }
}

class Generator {
  constructor(catalog, rules, random = randomInt) {
    this.catalog = catalog;
    this.rules = rules;
    this.records = new Map(catalog.records.map(r => [r.id, r]));
    this.random = random;
    this.pools = new Map();
    this.bags = new Map();
    if (this.records.size !== catalog.records.length) throw new Error('Duplicate catalogue ID.');
    for (const r of this.records.values()) {
      const p = rules.profiles.filter(p => p.id === r.rule_profile && p.member_ids.includes(r.id));
      if (p.length !== 1) throw new Error(`Missing or duplicate profile: ${r.id}`);
    }
    for (const p of rules.profiles) for (const a of p.alternatives) {
      if (!a.conditions.length || !a.pdf_pages.length) throw new Error(`Incomplete branch: ${a.id}`);
      for (const id of [...p.member_ids, ...a.permitted_failed_ids, ...a.requires_operative_catalog_ids]) {
        if (!this.records.has(id)) throw new Error(`Unknown catalogue ID: ${id}`);
      }
    }
  }

  assess(ids) {
    if (!Array.isArray(ids) || ids.length < 1 || ids.length > 3 ||
        new Set(ids).size !== ids.length || ids.some(id => !this.records.has(id))) {
      throw new Error('Select one to three distinct catalogue failures.');
    }
    const selected = new Set(ids);
    const branches = {};
    const conflicts = [];
    for (const p of this.rules.profiles) {
      const failed = p.member_ids.filter(id => selected.has(id));
      if (!failed.length) continue;
      const viable = p.alternatives.filter(a => failed.length <= a.max_failed &&
        failed.every(id => a.permitted_failed_ids.includes(id)) &&
        !a.requires_operative_catalog_ids.some(id => selected.has(id)));
      if (!viable.length) conflicts.push(p.id);
      else branches[p.id] = viable[0];
    }
    return { allowed: conflicts.length === 0, branches, conflicts };
  }

  pool(count) {
    if (![1, 2, 3].includes(count)) throw new Error('Failure count must be 1, 2 or 3.');
    if (!this.pools.has(count)) {
      const pool = [];
      for (const ids of combinations([...this.records.keys()].sort(), count)) {
        if (this.assess(ids).allowed) pool.push(ids);
      }
      this.pools.set(count, pool);
    }
    return this.pools.get(count);
  }

  draw(aircraft, count) {
    if (!['A319', 'A320', 'A321'].includes(aircraft)) throw new Error('Unknown aircraft.');
    const pool = this.pool(count);
    if (!pool.length) throw new Error('No compatible scenarios are available.');
    let bag = this.bags.get(count);
    if (!bag || bag.cursor === bag.order.length) {
      const previous = bag?.last;
      const order = Array.from({length:pool.length}, (_, i) => i);
      // Fisher-Yates: each remaining combination has equal probability.
      for (let i = order.length - 1; i > 0; i--) {
        const j = this.random(i + 1);
        [order[i], order[j]] = [order[j], order[i]];
      }
      // Conditional shuffle at the cycle boundary; no immediate duplicate.
      if (order.length > 1 && order[0] === previous) {
        const j = 1 + this.random(order.length - 1);
        [order[0], order[j]] = [order[j], order[0]];
      }
      bag = {order, cursor:0, cycle:(bag?.cycle || 0) + 1};
      this.bags.set(count, bag);
    }
    const index = bag.order[bag.cursor++];
    bag.last = index;
    const ids = pool[index];
    const assessment = this.assess(ids);
    return {
      aircraft, count, key:ids.join('+'), cycle:bag.cycle,
      cards:ids.map(id => {
        const record = this.records.get(id);
        const branch = assessment.branches[record.rule_profile];
        return {...record, branch_id:branch.id, branch:branch.branch,
          conditions:[...branch.conditions], pdf_pages:[...branch.pdf_pages]};
      })
    };
  }
}
module.exports = { Generator, combinations };
