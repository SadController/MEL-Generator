from pathlib import Path
import json,re,csv,collections,hashlib
root=Path(__file__).parent
research=root.parent
menu=json.loads((root/'menu_inventory.json').read_text(encoding='utf8'))
matrix=json.loads((research/'applicability_matrix.json').read_text(encoding='utf8'))
norm=lambda s:re.sub(r'[^a-z0-9]','',s.lower()).replace('stdby','stby')
aliases={'APU generator':('Generator','Apu'),'ESS TR failure':('TR Failure','Ess')}
for color in ['Blue','Green','Yellow']:aliases[f'{color} hydraulic leak']=('Hydraulic leak',color)
for block,nums in [('FAC',[1,2]),('ELAC',[1,2]),('SEC',[1,2,3])]:
    for n in nums:aliases[f'{block} {n}']=('Nonresettable fault',f'{block.title()} {n}')
for n in [1,2]:
    aliases[f'LGCUI {n}']=('LGCIU',str(n))
    aliases[f'Eng {n} no ignition']=('No ignition',f'Eng {n}')
    aliases[f'Pack {n} overheat']=('Overheat',f'Pack {n}')
    aliases[f'Pack {n} regulator fault']=('Regulator fault',f'Pack {n}')
for side in ['Left','Right']:
    for pos in ['Capt','F/O','Stby']:aliases[f'{side} Static heat {pos}']=('Static Heat',f'{side} {pos}')
    for state in ['pressurized','unlocked']:aliases[f'{side} reverser {state}']=(f'Reverser {state}',side)
aliases['SFCC 2 flap sys']=('Flap','Sfcc 2 Sys')
aliases['SFCC 2 slat sys']=('Slat','Sfcc 2 Sys')

names={}
for name in sorted({name for r in matrix['assessments'] for name in r['fenix_names']}):
    if name in aliases:
        group,label=aliases[name]
        hits=[m for m in menu if norm(m['group'])==norm(group) and norm(m['label'])==norm(label)]
        method='reviewed_group_label_alias'
    else:
        hits=[m for m in menu if norm(name) in (norm(m['key']),norm(m['label']))]
        method='normalized_exact_label_or_group_label'
    if len(hits)>1:raise ValueError((name,hits))
    names[name]={'legacy_name':name,'menu_found':bool(hits),'menu_id':hits[0]['menu_id'] if hits else None,'menu_path':hits[0]['path'] if hits else None,'match_method':method if hits else None,'behavior_tested':False}

assessments=[]
for a in matrix['assessments']:
    checks=[names[n] for n in a['fenix_names']]
    status='no_search_name_in_baseline' if not checks else 'all_names_observed' if all(c['menu_found'] for c in checks) else 'some_or_all_names_not_found'
    assessments.append({'assessment_id':a['assessment_id'],'mmel_id':a['mmel_id'],'branch':a['branch'],'document_status':a['status'],'document_note':a['note'],'menu_check':status,'names':checks,'aircraft':'A321-231 IAE','wingtip':'WTF (user-reported)','actual_model_applicability':'requires_item_and_configuration_check','behavior_tested':False,'approved_for_generation':False})

new_candidates=[
 {'mmel_id':'46-21-02','branch':'one DCDU','paths':[m['path'] for m in menu if m['group']=='DCDU'],'result':'menu_present_document_candidate','note':'Пункт DCDU есть в актуальном меню; Sim Settings показывает DCDU включённым. Один отказ требует проверки поведения. Не спутывать DCDU с MCDU.'},
 {'mmel_id':'28-25-05','branch':'valve secured closed','paths':[m['path'] for m in menu if m['label']=='Defuel/transfer Valve'],'result':'menu_present_state_unverified','note':'Проверить, что отказ позволяет получить закрытое положение, требуемое FAA. Названия недостаточно.'}
]

counts={'sections':19,'menu_entries':len(menu),'enabled_buttons':sum(m['enabled'] for m in menu),'legacy_names_checked':len(names),'legacy_names_found':sum(v['menu_found'] for v in names.values()),'legacy_names_not_found':[n for n,v in names.items() if not v['menu_found']],'baseline_assessments_with_all_names_observed':sum(a['menu_check']=='all_names_observed' for a in assessments),'baseline_K_assessments':sum(a['document_status']=='K' for a in assessments),'baseline_K_with_all_names_observed':sum(a['document_status']=='K' and a['menu_check']=='all_names_observed' for a in assessments),'behavior_tests':0,'new_mmel_candidates':len(new_candidates)}
meta={'checked_date':'2026-09-13','fenix_version':'2.4.0.4720','aircraft_ui':'A321-231 IAE','wingtip_user_report':'WTF','act_count':None,'act_note':'Число ACT явно не показано на просмотренных страницах; не выведено из ёмкости баков.','airframe_ui':{'standby':'ISIS','brake_fans':True,'dcdu':True,'ddrmi':False,'metric_standby_alt':False},'source_url':'http://localhost:8083/#/efb/manual-failures','inspection':'Live EFB rendered DOM; all 19 groups expanded; no failure switch toggles or Apply Changes','counts':counts}
(root/'comparison.json').write_text(json.dumps({'metadata':meta,'assessments':assessments,'new_candidates':new_candidates},ensure_ascii=False,indent=2),encoding='utf8')
(root/'legacy_names_comparison.json').write_text(json.dumps(list(names.values()),ensure_ascii=False,indent=2),encoding='utf8')
with (root/'menu_inventory.csv').open('w',encoding='utf-8-sig',newline='') as f:
    writer=csv.DictWriter(f,fieldnames=list(menu[0]));writer.writeheader();writer.writerows(menu)
with (root/'legacy_names_comparison.csv').open('w',encoding='utf-8-sig',newline='') as f:
    writer=csv.DictWriter(f,fieldnames=list(next(iter(names.values()))));writer.writeheader();writer.writerows(names.values())

lines=['# Проверка по реальному меню: A321-231 IAE WTF','', '13.09.2026. Fenix 2.4.0.4720. Проверка наличия и названий; отказы не включались.', '', '**Подтверждена кнопка в меню, а не применимость состояния или выполнение условий MMEL.** WTF указан пользователем; A321-231 IAE подтверждён строкой EFB. Результаты не переносятся автоматически на A319/A320 или CFM.', '', '| Оценка | FAA MMEL, ветвь | Реальный путь EFB → Failures | Результат меню / прежняя оценка |', '|---|---|---|---|']
for a in assessments:
    paths='; '.join(c['menu_path'] or f"НЕ НАЙДЕНО: {c['legacy_name']}" for c in a['names']) or 'В исходной оценке нет поискового имени'
    lines.append(f"| {a['assessment_id']} | {a['mmel_id']} — {a['branch']} | {paths} | {a['menu_check']} / {a['document_status']} |")
lines+=['','K — документальный кандидат; U — уточнение; X — отклонённое соответствие; N — вне конфигурации. Наличие меню не отменяет X/N.','', '## Новые кандидаты','']
for n in new_candidates:lines.append(f"- **{n['mmel_id']}**: {'; '.join(n['paths'])}. {n['note']}")
(root/'СОПОСТАВЛЕНИЕ.md').write_text('\n'.join(lines)+'\n',encoding='utf8')
lines=['# Полный реестр меню A321-231 IAE','',f"384 кнопки в 19 разделах, зафиксировано 13.09.2026. Все кнопки доступны для открытия карточки; это не подтверждение работы отказа.",'','| ID | Путь EFB → Failures |','|---|---|']+[f"| {m['menu_id']} | {m['path']} |" for m in menu]
(root/'МЕНЮ_384.md').write_text('\n'.join(lines)+'\n',encoding='utf8')

# Reverse index: every observed button is represented, including unresolved items.
# References marked X are rejected equivalences, not applicable MMEL permissions.
reverse=[]
for item in menu:
    refs=[]
    for assessment in assessments:
        if any(n['menu_id']==item['menu_id'] for n in assessment['names']):
            refs.append({'assessment_id':assessment['assessment_id'],'mmel_id':assessment['mmel_id'],'branch':assessment['branch'],'status':assessment['document_status'],'note':assessment['document_note']})
    for number,candidate in enumerate(new_candidates,1):
        if item['path'] in candidate['paths']:
            refs.append({'assessment_id':f'LIVE-NEW-{number:02}','mmel_id':candidate['mmel_id'],'branch':candidate['branch'],'status':'K' if candidate['mmel_id']=='46-21-02' else 'U','note':candidate['note']})
    reverse.append({'menu_id':item['menu_id'],'path':item['path'],'evaluated_mmel_references':refs,'screening_status':'см. оценку каждого соответствия' if refs else 'соответствие FAA MMEL пока не установлено','behavior_tested':False,'approved_for_generation':False})
(root/'menu_to_mmel.json').write_text(json.dumps(reverse,ensure_ascii=False,indent=2),encoding='utf8')
with (root/'menu_to_mmel.csv').open('w',encoding='utf-8-sig',newline='') as f:
    writer=csv.DictWriter(f,fieldnames=['menu_id','path','evaluated_references','screening_status','behavior_tested','approved_for_generation']);writer.writeheader()
    for r in reverse:
        writer.writerow({k:v for k,v in r.items() if k!='evaluated_mmel_references'}|{'evaluated_references':'; '.join(f"{x['mmel_id']} [{x['status']}] {x['assessment_id']}" for x in r['evaluated_mmel_references'])})
counts['buttons_with_evaluated_mmel_references']=sum(bool(r['evaluated_mmel_references']) for r in reverse)
counts['buttons_without_established_mmel_reference']=sum(not r['evaluated_mmel_references'] for r in reverse)
# Carry the live evidence into a complete 606-number inventory without rewriting the document baseline.
full=json.loads((research/'full_mmel_inventory.json').read_text(encoding='utf8'))
for item in full:
    relevant=[r for r in reverse if any(x['mmel_id']==item['mmel_id'] for x in r['evaluated_mmel_references'])]
    item['live_menu_ids']=[r['menu_id'] for r in relevant]
    item['live_menu_observed']=bool(relevant)
    for n,c in enumerate(new_candidates,1):
        if c['mmel_id']==item['mmel_id']:
            item['assessments'].append(f'LIVE-NEW-{n:02}')
            item['screening_status']='новый кандидат после просмотра меню; состояние и поведение не проверены'
    item['approved_for_generation']=False
(root/'full_mmel_inventory_with_live_evidence.json').write_text(json.dumps(full,ensure_ascii=False,indent=2),encoding='utf8')
assert len(reverse)==384 and len(full)==606
assert sum(bool(i['assessments']) for i in full)==115

after=json.loads((root/'menu_after.json').read_text())
groups=json.loads((root/'menu_groups.json').read_text())
before=[b for s in groups for g in s['groups'] for b in g['buttons']]
assert before==after
assert len(menu)==384 and len(groups)==19
assert len(re.findall(r'^- button ',(root/'menu_dom_snapshot.txt').read_text(),re.M))==387
assert len({m['path'] for m in menu})==384
assert all(a['approved_for_generation'] is False for a in assessments)
files=[p for p in root.iterdir() if p.suffix in ['.json','.txt','.png'] and p.name!='verification.json']
(root/'verification.json').write_text(json.dumps({'counts':counts,'button_paths_unique':True,'snapshot_button_count_including_3_toolbar_controls':387,'menu_button_labels_disabled_and_classes_unchanged':before==after,'failure_toggles_clicked':0,'apply_changes_clicked':0,'configuration_values_changed':0,'files':[{'name':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(files)]},ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(counts,ensure_ascii=False,indent=2))
