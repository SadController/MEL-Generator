"""Compare published alpha names with observed UI labels, not simulated behavior."""
import json,re,csv,hashlib,collections
from pathlib import Path
import pymupdf

root=Path(__file__).parent
live=root/'live_A321_IAE_WTF_2026-09-13'
out=root/'alpha_vs_live_2026-09-14'
out.mkdir(exist_ok=True)
doc=pymupdf.open(root/'evidence/Fenix_failurelist_v0.2_ALPHA_2021-07-12.pdf')
old=[]
for n,page in enumerate(doc,1):
    if n==1:continue
    for block in page.get_text('dict')['blocks']:
        for line in block.get('lines',[]):
            text=''.join(s['text'] for s in line['spans']).strip()
            if line['bbox'][2]<310 and text and text!='Name':
                old.append({'name':text,'pdf_page':n})
assert len(old)==383 and len({r['name'] for r in old})==383
menu=json.loads((live/'menu_inventory.json').read_text(encoding='utf8'))
prior={r['legacy_name']:r for r in json.loads((live/'legacy_names_comparison.json').read_text(encoding='utf8'))}
norm=lambda s:re.sub('[^a-z0-9]','',s.lower()).replace('stdby','stby')
aliases={}
def alias(old,group,label):aliases[old]=(group,label)
for block,nums in [('FAC',[1,2]),('ELAC',[1,2]),('SEC',[1,2,3])]:
    for n in nums:alias(f'{block} {n} resettable fault','Resettable fault',f'{block} {n}')
for color in ['Blue','Green','Yellow']:alias(f'{color} reservoir overheat','Reservoir overheat',color)
for n in [1,2]:
    alias(f'BSCU {n} brake fault','Brake fault',f'Bscu {n}')
    alias(f'Eng {n} hot start','Hot start',f'Eng {n}')
    alias(f'Eng {n} hp fuel valve','HP Fuel valve',f'Eng {n}')
    for rotor in ['N1','N2']:alias(f'Eng {n} high vibration {rotor}',f'vibration {rotor}',f'Eng {n} High')
for pos in ['Capt','F/O']:alias(f'{pos} stuck mic','Stuck mic',pos)
for engine in ['APU','Eng 1','Eng 2']:alias(f'{engine} inextinguishable fire','Fire unextinguishable',f'{engine} Unextinguishable Fire')
for tank in ['Inner','Outer']:
    for temp in ['high','low']:alias(f'{tank} tank {temp} fuel temp advisory',f'Fuel temp {temp}',f'{tank} Tank {temp} Fuel Temp Adv')
for n in [1,2,3]:
    for axis in ['bank','heading','pitch']:alias(f'IR{n} {axis} discrepancy',f'{axis} discrepancy',f'Ir{n}')
alias('IR1 IR disagree','IR Disagree','Ir1')
alias('IR2 IR Disagree','IR Disagree','Ir2')
alias('L Elev failure','Elev','L Failure')
alias('R Elev failure','Elev','R Failure')
alias('Rapid decompression','Decompression','Rapid')
alias('Slow decompression','Decompression','Slow')
alias('SFCC 1 flap sys','Flap','Sfcc 1 Sys')
alias('SFCC 1 slat sys','Slat','Sfcc 1 Sys')

results=[]
for record in old:
    name=record['name'];method='not_found';hits=[]
    if name in ['Sidestick reversal Capt','Sidestick reversal F/O']:
        side=name.replace('Sidestick reversal ','')
        hits=[m for m in menu if norm(m['group'])=='sidestickreversal' and norm(m['label']) in [norm('Pitch '+side),norm('Roll '+side)]]
        assert len(hits)==2
        method='split_pitch_roll_controls'
    elif name in aliases:
        group,label=aliases[name]
        hits=[m for m in menu if norm(m['group'])==norm(group) and norm(m['label'])==norm(label)]
        assert len(hits)==1,(name,hits)
        method='reviewed_name_or_group_rewording'
    elif prior.get(name,{}).get('menu_found'):
        hits=[m for m in menu if m['menu_id']==prior[name]['menu_id']]
        method=prior[name]['match_method']
    else:
        hits=[m for m in menu if norm(name) in (norm(m['key']),norm(m['label']))]
        assert len(hits)<=1,(name,hits)
        if hits:method='normalized_exact_label_or_group_label'
    results.append(record|{'match_type':method,'menu_ids':[m['menu_id'] for m in hits],'menu_paths':[m['path'] for m in hits],'behavior_verified':False})
used=[id for r in results for id in r['menu_ids']]
assert len(used)==len(set(used)), 'Different old records unexpectedly mapped to the same button'
added=[m for m in menu if m['menu_id'] not in used]
missing=[r for r in results if not r['menu_ids']]
stats={'old_pdf_entries':len(old),'observed_menu_buttons':len(menu),'old_entries_with_one_menu_match':sum(len(r['menu_ids'])==1 for r in results),'old_entries_split_into_two_buttons':sum(len(r['menu_ids'])==2 for r in results),'old_entries_not_found':len(missing),'current_buttons_without_old_entry':len(added),'old_names_present_fraction':(len(old)-len(missing))/len(old),'behavior_tests':0}
meta={'compared_on':'2026-09-14','old_document':'Fenix Failure List v0.2 Alpha, 12/07/2021','old_document_origin':'Fenix-authored PDF retrieved from soarbywire.com mirror','old_url':'https://soarbywire.com/wp-content/uploads/2021/08/failurelist-v0.2.pdf','current_source':'Captured live EFB menu, A321-231 IAE, WTF user-reported, Fenix 2.4.0.4720','current_snapshot_date':'2026-09-13','scope':'Names and menu organization; not operation, completeness of internal failure model, or availability on other aircraft configurations.'}
(out/'comparison.json').write_text(json.dumps({'metadata':meta,'counts':stats,'old_entries':results,'current_buttons_without_old_match':added},ensure_ascii=False,indent=2),encoding='utf8')
with (out/'comparison.csv').open('w',encoding='utf-8-sig',newline='') as f:
    w=csv.DictWriter(f,fieldnames=list(results[0]));w.writeheader()
    for r in results:w.writerow({k:'; '.join(v) if isinstance(v,list) else v for k,v in r.items()})
lines=['# Полное сравнение старого списка Fenix с реальным меню','', 'Сравнение выполнено 14.09.2026. Старый документ: v0.2 Alpha от 12/07/2021. Меню: A321-231 IAE WTF, версия 2.4.0.4720, снимок 13.09.2026.','', '**Сравниваются названия и структура меню, а не реализация поведения отказов.** В предыдущей проверке сравнивались только 194 имени из MMEL-матрицы; здесь рассмотрены все 383 строки старого PDF.','', '| Показатель | Число |','|---|---:|',f"| Пунктов старого PDF | {stats['old_pdf_entries']} |",f"| Кнопок актуального меню | {stats['observed_menu_buttons']} |",f"| Старых пунктов с соответствием одной кнопке | {stats['old_entries_with_one_menu_match']} |",f"| Старых пунктов, разделённых на две кнопки | {stats['old_entries_split_into_two_buttons']} |",f"| Старых пунктов без найденного имени в меню | {len(missing)} |",f"| Нынешних кнопок без соответствия старому списку | {len(added)} |",'', 'Регистр, сокращения, порядок слов и группировка учтены. Например, старый APU generator соответствует Generator → Apu; названия inextinguishable/unextinguishable отнесены к одной группе по имени. Это не доказательство тождественного поведения.','', '## Не найдены отдельные имена из старого PDF','']
lines.extend(f"- {r['name']} (PDF стр. {r['pdf_page']})." for r in missing)
lines+=['','Эти названия не найдены в просмотренном меню A321 IAE. Это не утверждение, что отказ удалён из симулятора: он может возникать как следствие, иметь другую реализацию или зависеть от конфигурации.','', '## Есть в меню, но нет соответствующей строки старого PDF','']
lines.extend(f"- {m['path']}." for m in added)
lines+=['','## Изменение детализации','', 'Старые Sidestick reversal Capt и Sidestick reversal F/O описывают инверсию pitch/roll. В текущем меню у каждой стороны отдельные Pitch и Roll, то есть двум старым строкам соответствуют четыре кнопки.','', '## Полная построчная таблица','', '| Старое имя | Страница PDF | Результат | Текущий путь |','|---|---:|---|---|']
lines.extend(f"| {r['name']} | {r['pdf_page']} | {r['match_type']} | {'; '.join(r['menu_paths']) or 'Отдельное имя не найдено'} |" for r in results)
lines+=['','## Источники','', '- [Старый PDF на зеркале](https://soarbywire.com/wp-content/uploads/2021/08/failurelist-v0.2.pdf). На титуле указан Alpha; документ прямо допускает изменения.','- [Текущая статья Fenix](https://support.fenixsim.com/hc/en-us/articles/12457317731855-Failures-Guide-in-FenixSim-Aircraft), обновлена 26.02.2026: более 200 отказов, полного списка нет. Это утверждение не обещает совпадения со старым PDF.','- [Исходный реестр реального меню](../live_A321_IAE_WTF_2026-09-13/menu_inventory.json).','- [Полная машиночитаемая сверка](comparison.json), [CSV](comparison.csv).']
(out/'СРАВНЕНИЕ.md').write_text('\n'.join(lines)+'\n',encoding='utf8')
print(json.dumps(stats,ensure_ascii=False,indent=2))
print('MISSING:',*[r['name'] for r in missing],sep='\n')
print('ADDED:',*[m['path'] for m in added],sep='\n')
