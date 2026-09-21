// English summaries of the agreed FAA Rev. 32 branches; not new MMEL procedures.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const input = path.join(root, 'research_fenix/efb_mmel_pool');
const read = name => JSON.parse(fs.readFileSync(path.join(input, name), 'utf8'));
const names = {
  M001:'Cabin pressure controller 1', M002:'Cabin pressure controller 2',
  M020:'Avionics ventilation computer', M021:'Avionics blower fan', M022:'Avionics extract fan',
  M026:'FAC 2 — nonresettable fault', M029:'Rudder travel limiter — channel 1', M030:'Rudder travel limiter — channel 2',
  M031:'Rudder trim — channel 1', M032:'Rudder trim — channel 2', M038:'FCU — channel 1', M039:'FCU — channel 2',
  M042:'Autopilot 1', M043:'Autopilot 2', M067:'Transformer rectifier 1',
  M085:'Engine 1 fire detection — loop A', M086:'Engine 1 fire detection — loop B',
  M087:'Engine 2 fire detection — loop A', M088:'Engine 2 fire detection — loop B',
  M089:'APU fire detection — loop A', M090:'APU fire detection — loop B',
  M144:'Yellow electric hydraulic pump', M152:'Autobrake function',
  M153:'Wheel brake 1', M154:'Wheel brake 2', M155:'Wheel brake 3', M156:'Wheel brake 4',
  M198:'MCDU 1', M199:'MCDU 2',
  M254:'CAPT angle of attack probe heater', M255:'F/O angle of attack probe heater', M256:'STBY angle of attack probe heater',
  M257:'CAPT TAT probe heater', M258:'F/O TAT probe heater',
  M260:'CAPT pitot heater', M261:'F/O pitot heater', M262:'STBY pitot heater',
  M263:'CAPT static port heater — left', M264:'CAPT static port heater — right',
  M265:'F/O static port heater — left', M266:'F/O static port heater — right',
  M267:'STBY static port heater — left', M268:'STBY static port heater — right',
  M282:'SFCC 2 — flap channel', M284:'SFCC 2 — slat channel',
  M295:'Yaw damper — channel 1', M296:'Yaw damper — channel 2',
  M317:'Centralized fault display interface unit', M320:'System data acquisition concentrator 2',
  M322:'Flight warning computer 2', M323:'Cockpit voice recorder', M327:'CAPT DCDU', M328:'F/O DCDU'
};
const noLongEtops = 'ETOPS beyond 120 minutes is not permitted.';
const dry = 'Do not operate in visible moisture or known or forecast icing conditions.';
const otherProbes = 'Verify normal operation of the ADR, probe heaters and failure warnings at the other two positions (CAPT, F/O or STBY), including pitot, static, AOA and TAT probes.';
const staticChecks = 'Verify normal operation of the ADR, heaters and failure warnings associated with the operative units.';
const runwayTemp = 'When the runway is contaminated with water or slush, the departure airport temperature must be above +5 °C.';
const foIcing = 'Takeoff in CONF 1+F is prohibited in icing conditions with ADR 2 OFF.';
const fcuEquipment = 'Two RMPs, all DUs, both RAs, both LGCIUs, both FACs, both cabin pressure controllers, all three ADIRS and the standby altimeter (or ISIS barometric altimeter function) must operate normally.';
const engineLoop = ['Only one loop on this engine may be inoperative; the other loop must remain operative.', noLongEtops, 'Perform an engine fire test before each departure.'];
const texts = {
 CPC1:['System 1', ['ETOPS is not permitted. Deactivate CPC 1.', 'Verify normal operation of manual pressure control. Cabin pressure indications must be available on the ECAM CAB PRESS page in manual mode.', 'Both FCU channels and CPC 2 must operate normally.', 'Complete repairs within 3 flight-days.']],
 CPC2:['System 2', ['Deactivate CPC 2.', 'Verify normal operation of manual pressure control. Cabin pressure indications must be available on the ECAM CAB PRESS page in manual mode.', 'Both FCU channels and CPC 1 must operate normally.']],
 AEVC:['Main provision', ['Verify normal operation of the extract fan before each flight. Both packs must be operative.', 'Set BLOWER and EXTRACT pushbuttons to OVRD.', 'Verify the air conditioning inlet valve and extract valve (skin air outlet valve) in the proper position before each flight. Secure the skin air inlet valve closed.']],
 BLOWER:['Inlet valve verified open before each flight', ['The extract fan and both packs must operate normally. Set BLOWER to OVRD.', 'Verify the air conditioning inlet valve open before each flight.', 'On airplanes with Mod. 20056, do not exceed FL 270.']],
 EXTRACT:['Inlet valve verified open before each flight', ['The blower fan and both packs must operate normally. Set EXTRACT to OVRD.', 'Verify the air conditioning inlet valve open before each flight.', 'Ground time with electrical power on: OAT below 38 °C — unlimited; 39–45 °C — 3 hours; 46–50 °C — 2 hours; 51–54 °C — 35 minutes.', 'The source does not explicitly define 38 °C or temperatures outside these ranges. No interpolation is assumed.']],
 FAC2:['FAC 2, without eRudder', ['Both FCU channels and the ELAC, SEC, ADIRS, SFCC, RA and LGCIU systems must operate normally.', 'Approach minima must not require FAC 2.', 'MMEL note: loss of FAC 1 results in Direct Law when the landing gear is down.']],
 RTL_ONE:['2 installed, 1 required; without eRudder', ['One rudder travel limiter channel may be inoperative. The other channel must remain operative.']],
 TRIM1:['System 1', ['ETOPS is not permitted.', 'System 2 must remain operative. Approach minima must not require system 1.']],
 TRIM2:['System 2', ['System 1 must remain operative. Approach minima must not require system 2.']],
 FCU_NO_ETOPS:['Channels without eRudder; no ETOPS', ['One FCU channel may be inoperative. ETOPS is not permitted.', fcuEquipment]],
 FCU_ONE_LEG:['Channels without eRudder; one flight-leg', ['One FCU channel may be inoperative for one flight-leg.', fcuEquipment]],
 AP_ONE:['2 installed, 1 required', ['Approach minima must not require use of the inoperative autopilot.']],
 AP_BOTH:['2 installed, 0 required', ['Approach minima and enroute operations must not require the autopilots.', 'The number of flight segments and their duration must be acceptable to the flightcrew.', 'Any mode that operates normally may be used.']],
 TR1:['TR 1 main provision', ['ETOPS is not permitted.', 'The extract fan, battery voltage indicator and both packs must operate normally.', 'Approach minima must not require TR 1. Complete repairs within 2 flight-days.']],
 ENG1_ONE_LOOP:['One loop on engine 1', engineLoop], ENG2_ONE_LOOP:['One loop on engine 2', engineLoop],
 APU_LOOP_A:['Loop A', [noLongEtops, 'Perform an APU fire test before each APU start.', 'During ground operations, monitor APU condition from the cockpit.']],
 APU_LOOP_B:['Loop B', [noLongEtops, 'Perform an APU fire test before each APU start.']],
 APU_LOOPS_NO_USE:['2 installed, 0 required; no ETOPS', ['Do not use the APU. ETOPS is not permitted.']],
 APU_LOOPS_FOUR_FLIGHTS:['2 installed, 0 required; four flights', ['Do not use the APU.', noLongEtops, 'Complete repairs within 4 flights.']],
 YELLOW_PUMP:['Main provision', ['Select the associated electric pump pushbutton OFF.', 'Operate the forward and aft cargo doors manually.']],
 AUTOBRAKE:['AUTO/BRK function', ['Approach minima must not require AUTO/BRK.', 'Normal braking must not be affected.']],
 ONE_BRAKE:['4 installed, 3 required', ['One wheel brake may be inoperative. Minimum runway width is 45 m (148 ft).', 'Antiskid, nose wheel steering and both reversers must operate normally.', 'Remove or deactivate the affected brake. The green and yellow systems on the remaining brakes must operate normally.', 'Apply AFM performance penalties. Approach minima must not require the affected brake.', 'Consider the AUTO/BRK function inoperative.']],
 MCDU_ONE:['Flightcrew positions; 2 installed, 1 required', ['One flightcrew MCDU may be inoperative provided navigation procedures do not require its use.']],
 AOA_CAPT:['CAPT heater', [otherProbes, 'Perform this check once each flight-day.', noLongEtops, dry]],
 AOA_FO:['F/O heater', [otherProbes, 'Perform this check once each flight-day.']],
 AOA_STBY:['STBY heater', [otherProbes, 'Perform this check once each flight-day.']],
 PITOT_CAPT:['CAPT heater', [otherProbes, noLongEtops, dry]],
 PITOT_FO:['F/O heater', [otherProbes, foIcing]],
 PITOT_STBY:['STBY heater', [otherProbes, noLongEtops, dry]],
 TAT_ONE:['2 installed, 1 required', ['One TAT probe heater may be inoperative.']],
 TAT_BOTH:['2 installed, 0 required', [noLongEtops, dry]],
 STATIC_ONE_STBY:['6 installed, 5 required; one STBY heater', ['One STBY static port heater may be inoperative.']],
 STATIC_CAPT:['6 installed, 4 required; CAPT heaters', [staticChecks, runwayTemp]],
 STATIC_FO:['6 installed, 4 required; F/O heaters', [staticChecks, foIcing]],
 STATIC_STBY:['6 installed, 4 required; STBY heaters', [staticChecks, runwayTemp, noLongEtops]],
 SFCC2_FLAP:['CEO flap channels; SFCC 2', ['Slats and flaps must operate normally on SFCC 1. Test the SFCC 1 wing tip brakes before each departure.', 'Inhibit the electrical supply to the SFCC 2 flap channel.', 'ELAC, SEC, ADIRS, LGCIU, FAC and RA systems, and spoiler surfaces 2 and 4, must operate normally.', 'Consider the minimum idle on ground function inoperative.']],
 SFCC2_SLAT:['Slat channel without eRudder; SFCC 2', ['Slats and flaps must operate normally on SFCC 1. Test the SFCC 1 wing tip brakes before each departure.', 'Inhibit the electrical supply to the SFCC 2 slat channel.', 'ELAC, SEC, ADIRS, LGCIU, FAC and RA systems must operate normally.', 'Takeoff in CONF 1+F is prohibited.']],
 YAW1:['System 1', ['System 2 must remain operative. Approach minima must not require system 1.']],
 YAW2:['System 2', ['System 1 must remain operative. Approach minima must not require system 2.', 'Deactivate system 2 if its actuator leaks.']],
 CFDIU:['CFDS main provision', ['The CFDS must be available when required for specified maintenance tasks.']],
 SDAC2:['SDAC 2; 2 installed, 1 required', ['SDAC 2 may be inoperative. SDAC 1 must remain operative.']],
 FWC2:['FWC 2', ['Approach minima must not require FWC 2.', 'On airplanes with Mod. 35542, do not use the steep approach function.']],
 CVR:['Main provision', ['The Flight Data Recorder (FDR) must operate normally.', 'Complete repairs within 3 flight-days.']],
 DCDU_ONE:['2 installed, 1 required', ['One DCDU may be inoperative.']],
 DCDU_BOTH_ALT:['2 installed, 0 required; alternate procedures', ['Establish and use alternate procedures.']],
 DCDU_BOTH_NOT_REQUIRED:['2 installed, 0 required; use not required', ['Procedures must not require use of the DCDUs.']]
};
const original = read('pool.json');
const originalRules = read('rules.json');
const profiles = originalRules.profiles.map(p => ({
 id:p.id, mmel_id:p.mmel_id, member_ids:p.member_ids,
 alternatives:p.alternatives.map(a => {
   if (!texts[a.id]) throw new Error(`Missing English branch ${a.id}`);
   return {...a, branch:texts[a.id][0], conditions:texts[a.id][1]};
 })
}));
const records = original.records.map(r => {
 if (!names[r.id]) throw new Error(`Missing English title ${r.id}`);
 return {id:r.id, name:names[r.id], efb_path:r.efb_path, source_id:r.source_id,
   mmel_id:r.mmel_id, mmel_title:r.mmel_title, pdf_pages:r.pdf_pages, rule_profile:r.rule_profile};
});
const metadata = {
 schema_version:'1.0', count:records.length,
 source:{...original.metadata.source, pdf:'MMEL.pdf'},
 efb_snapshot:original.metadata.efb_snapshot,
 shared_pool_assumption:original.metadata.shared_pool_assumption,
 text_policy:'English summaries of the agreed FAA MMEL Rev. 32 branches. View source for the original provision. Full maintenance and operational procedures are not reproduced.',
 unpressurized_flight_branches_enabled:false,
 canonical_sha256:Object.fromEntries(['pool.json','rules.json'].map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync(path.join(input,n))).digest('hex')]))
};
fs.mkdirSync(path.join(root,'data'),{recursive:true});
fs.writeFileSync(path.join(root,'data/catalog.json'), JSON.stringify({metadata,records},null,2)+'\n');
fs.writeFileSync(path.join(root,'data/rules.json'), JSON.stringify({profiles,interpretation_boundaries:originalRules.interpretation_boundaries},null,2)+'\n');
console.log(`Prepared ${records.length} English entries, ${profiles.length} profiles, ${profiles.reduce((n,p)=>n+p.alternatives.length,0)} branches.`);
