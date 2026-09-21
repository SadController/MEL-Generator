"""Document-only screening of the saved EFB inventory; no simulator interaction."""
from pathlib import Path
import json, csv, collections

ROOT = Path(__file__).parent
LIVE = ROOT / 'live_A321_IAE_WTF_2026-09-13'
OUT = ROOT / 'efb_mmel_pool'
if (OUT / 'rules.json').exists():
    raise SystemExit('Screening is complete. Use research_fenix/finalize_catalog.py for the final catalogue and rules.')
OUT.mkdir(exist_ok=True)
read = lambda p: json.loads(p.read_text(encoding='utf-8'))
menu = read(LIVE / 'menu_to_mmel.json')
index = {x['id']: x for x in read(ROOT / 'mmel_item_index.json')}

# Explicitly reviewed permissions, not an automatic conversion of former K candidates.
# Notes summarize the relevant permission; the complete extracted item accompanies it.
permissions = {
 'F003': 'Один Blower fan. Extract и оба pack исправны; BLOWER OVRD. Условия клапана/предупреждения и FL270 при Mod.20056 — по выбранной строке.',
 'F004': 'Один Extract fan. Blower и оба pack исправны; EXTRACT OVRD. Условия клапана/предупреждения и пределы OAT/времени на земле — по выбранной строке.',
 'F007': 'AEVC: исправный Extract; BLOWER/EXTRACT OVRD; оба pack исправны; заданные положения клапанов, включая закрытый skin inlet. Проверки (M)(O) остаются условиями MMEL.',
 'F010': 'CPC1: без ETOPS; отключить CPC1; исправны ручной режим, индикация, оба FCU и CPC2; устранение в течение 3 flight-days.',
 'F011': 'CPC2: отключить CPC2; исправны ручной режим, индикация, оба FCU и CPC1.',
 'F019': 'Один AP; второй исправен; минимумы захода не требуют отказавший AP. Здесь используется строка для одного AP.',
 'F021': 'Один канал yaw damper при исправном другом; минимумы захода не требуют его использования. Для System2 при утечке актуатора предусмотрена деактивация.',
 'F022': 'FAC2, ветвь без eRudder: исправны оба FCU, ELAC, SEC, ADIRS, SFCC, RA и LGCIU; соответствующие минимумы захода.',
 'F025': 'Один FCU channel, ветвь без eRudder: без ETOPS; исправны 2 RMP, все DU, оба RA/LGCIU/FAC/CPC, три ADIRS и standby altimeter/ISIS baro. Альтернатива MMEL — один flight-leg.',
 'F026': 'Один MCDU пилотов при исправном втором; навигационные процедуры не требуют отказавшее устройство. Это полный отказ, не recoverable fault.',
 'F028': 'CVR: FDR исправен; устранение в течение 3 flight-days.',
 'F031': 'Только TR1: без ETOPS; исправны Extract, индикация напряжения батарей и оба pack; соответствующие минимумы; устранение в течение 2 flight-days.',
 'F034': 'Один loop на двигатель; другой loop того же двигателя исправен; fire test перед каждым вылетом; без ETOPS свыше 120 минут.',
 'F035': 'Один APU loop при исправном другом; fire test перед каждым запуском APU; без ETOPS свыше 120 минут. Для Loop A дополнительно наблюдение из кабины на земле.',
 'F037': 'Один канал rudder trim; другой исправен; соответствующие минимумы. Для System1 дополнительно исключён ETOPS.',
 'F038': 'Одна из двух систем rudder travel limiter, ветвь без eRudder.',
 'F039': 'Только отдельный канал SFCC2 FLAP или SLAT, CEO/без eRudder. SFCC1 исправен, проверки WTB, отключение питания отказавшего канала и зависимости по MMEL. Для SLAT запрещён взлёт CONF1+F.',
 'F055': 'Yellow electric pump: соответствующая кнопка OFF; передняя и задняя грузовые двери обслуживаются вручную.',
 'F061': 'Один pitot heater. Раздельные условия CAPT/F/O/STBY: исправность остальных датчиков/обогревов/предупреждений; ограничения обледенения, видимой влаги, ETOPS и CONF1+F — по позиции.',
 'F062': 'Static heater по конкретной позиции CAPT/F/O/STBY. Для одного STBY есть отдельная строка. Остальные ветви имеют условия исправности, температуры, обледенения и ETOPS.',
 'F063': 'Один AOA heater по позиции, не A321neo XLR. Проверки остальных датчиков/обогревов/предупреждений; для CAPT дополнительно ограничения ETOPS, видимой влаги и обледенения.',
 'F064': 'Один из двух TAT heaters; используется строка C, 2 установлено, 1 требуется. STBY TAT в этот допуск не входит.',
 'F067': 'CFDIU сопоставлен CFDS по назначению. CFDS должен быть доступен, когда требуется для предусмотренных работ техобслуживания.',
 'F068': 'Только FWC2; минимумы захода не требуют его использования. При Mod.35542 не используется steep approach.',
 'F070': 'Только SDAC2: C, 2 установлено, 1 требуется.',
 'F079': 'Один wheel brake: ВПП минимум 45 м; исправны antiskid, NWS, оба reverser и green/yellow на остальных тормозах; отказавший тормоз отключён; поправки AFM; AUTO/BRK считается неработающим.',
 'F081': 'AUTO/BRK function: обычное торможение сохраняется; минимумы захода не требуют AUTO/BRK.',
 'LIVE-NEW-01': 'Один из двух DCDU; используется строка C, 2 установлено, 1 требуется. DCDU включены в просмотренной конфигурации EFB.',
}

records = []
for m in menu:
    refs = m['evaluated_mmel_references']
    admitted = [r for r in refs if r['assessment_id'] in permissions]
    if admitted:
        group, reason = 'conditional_permission', 'Найден прямой документальный допуск для одиночного отказа; условия MMEL обязательны.'
    elif not refs:
        group, reason = 'uncertain', 'В выполненном сопоставлении допуск MMEL не установлен. Это не доказательство отсутствия допуска в документе.'
    elif all(r['status'] == 'X' for r in refs):
        group, reason = 'uncertain', 'Ранее предложенное соответствие отклонено: пункт MMEL разрешает другое оборудование или состояние. Это не общий вывод о запрете по всему MMEL.'
    elif any(r['status'] == 'K' for r in refs):
        group, reason = 'uncertain', 'Есть кандидат на допуск, но точная ветвь, комплектация, набор функций или условия применения ещё не определены однозначно.'
    else:
        group, reason = 'uncertain', 'Неоднозначное соответствие состояния/компонента или применимость к модели и комплектации.'
    records.append({
        'menu_id': m['menu_id'], 'path': m['path'], 'group': group, 'reason': reason,
        'permissions': [{'mmel_id': r['mmel_id'], 'assessment_id': r['assessment_id'],
                         'conditions_summary': permissions[r['assessment_id']],
                         'pdf_pages': index[r['mmel_id']]['pdf_pages']} for r in admitted],
        'prior_references': refs,
        'behavior_verification_required': False,
        'assumed_failure_scope': 'Named EFB component/function; no empirical guarantee of consequences.',
        'combination_permission': 'not_assessed',
    })

records = [r for r in records if r['group'] == 'conditional_permission']
counts = dict(collections.Counter(r['group'] for r in records))
metadata = {
 'date': '2026-09-14', 'basis': '384 saved live EFB entries, 2026-09-13',
 'aircraft': 'A321-231 IAE; WTF user-reported', 'fenix_version': '2.4.0.4720',
 'mmel': 'FAA A320 MMEL Rev32, 2025-07-30',
 'scope': 'Single failures, simulator scenarios, document-only classification. No behavior tests; no app development.',
 'assumption': 'The EFB failure name identifies the failed component/function. Unknown secondary simulator effects are accepted by user.',
 'coverage': 'Only entries with reviewed conditional MMEL permission are included in the working registry.',
 'counts': counts,
}
(OUT / 'pool.json').write_text(json.dumps({'metadata': metadata, 'records': records}, ensure_ascii=False, indent=2), encoding='utf-8')
with (OUT / 'pool.csv').open('w', encoding='utf-8-sig', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=['menu_id', 'path', 'group', 'mmel', 'conditions', 'reason'])
    writer.writeheader()
    for r in records:
        writer.writerow({k: r[k] for k in ['menu_id', 'path', 'group', 'reason']} |
                        {'mmel': '; '.join(x['mmel_id'] for x in r['permissions']),
                         'conditions': '; '.join(x['conditions_summary'] for x in r['permissions'])})

common = ['Основа: меню Fenix 2.4.0.4720, A321-231 IAE WTF, сохранено 13.09.2026. Источник допусков: FAA A320 MMEL Rev32 от 30.07.2025.',
 '', 'Проверка поведения исключена по решению пользователя. Название отказа принимается за описание отказавшего компонента/функции; вторичные эффекты симулятора не исследуются. Допуски рассматриваются по одному отказу. Допуск нескольких одновременно из этого списка не следует.', '']
for group, filename, title in [('conditional_permission', '01_ДОПУСК_С_УСЛОВИЯМИ.md', 'Допуск MMEL найден — с условиями')]:
    selected = [r for r in records if r['group'] == group]
    lines = ['# ' + title, '', f'Всего: {len(selected)} кнопок EFB.', ''] + common
    if group == 'conditional_permission':
        lines += ['Условия ниже — краткий указатель, а не полный текст процедур. Полный извлечённый текст соответствующих пунктов находится в `ПУНКТЫ_MMEL.md`; при неоднозначности извлечения используется исходный PDF. Для CEO применяется ветвь без eRudder.', '', '| ID | Путь EFB | MMEL, PDF-страницы | Условия |', '|---|---|---|---|']
        for r in selected:
            for p in r['permissions']:
                lines.append(f"| {r['menu_id']} | {r['path']} | {p['mmel_id']}, стр. {', '.join(map(str,p['pdf_pages']))} | {p['conditions_summary']} |")
    else:
        lines += ['Здесь объединены пункты без установленного соответствия, неуточнённые ветви и отклонённые соответствия. Последние не означают доказанного общего запрета на вылет. Прежние примечания сохранены как история оценки: предложения проверять поведение больше не являются заданиями.', '', '| ID | Путь EFB | Почему здесь | Прежние ссылки и основания |', '|---|---|---|---|']
        for r in selected:
            detail = '; '.join(f"{p['mmel_id']}: {p['note']}" for p in r['prior_references']) or 'Соответствие пока не установлено'
            lines.append(f"| {r['menu_id']} | {r['path']} | {r['reason']} | {detail} |")
    (OUT / filename).write_text('\n'.join(lines) + '\n', encoding='utf-8')

used_ids = sorted({p['mmel_id'] for r in records for p in r['permissions']})
lines = ['# Текст пунктов, использованных для положительной группы', '', 'Извлечение из сохранённого FAA A320 MMEL Rev32. Табличные колонки при извлечении могут терять выравнивание. Полная процедура (M)/(O) не создаётся из обозначения: здесь сохраняется только текст MMEL.', '', '[Исходный PDF](../../sources_mel_mmel/00_current_mmel/FAA_A320_MMEL_Rev32_2025-07-30.pdf)', '']
for key in used_ids:
    item = index[key]
    lines += [f"## {key} — {item['title']}", '', f"PDF-страницы: {', '.join(map(str,item['pdf_pages']))}", '', '```text', item['text'], '```', '']
(OUT / 'ПУНКТЫ_MMEL.md').write_text('\n'.join(lines), encoding='utf-8')
lines = ['# Пул EFB → FAA MMEL', '', 'Решение от 14.09.2026: основа — текущий список EFB. Старый alpha-каталог больше не определяет состав пула. Проверок поведения не требуется. Создание приложения приостановлено.', ''] + common + [
 f"- [Допуск с условиями](01_ДОПУСК_С_УСЛОВИЯМИ.md): **{counts['conditional_permission']}**.",
 '- [Полный реестр CSV](pool.csv) и [JSON](pool.json).',
 '- [Тексты использованных пунктов MMEL](ПУНКТЫ_MMEL.md).', '',
 'В рабочий реестр включены только пункты с найденным допуском MMEL и его условиями. Пункты без установленного допуска исключены по указанию пользователя. Прежний статус K сам по себе не превращён в разрешение.', '',
 'Результат относится к сохранённому меню A321 IAE. Наличие тех же кнопок и применимость к A319/A320/CFM не объявляются проверенными. Требования к состоянию самолёта и процедурам MMEL записываются в качестве условий сценария; эмпирическая проверка их выполнения в Fenix не нужна.', '',
 'На этом этапе работа останавливается: расширение положительной группы, правила сочетаний и разработка приложения не выполняются автоматически.', '']
(OUT / 'РЕЕСТР.md').write_text('\n'.join(lines), encoding='utf-8')
assert len(records) == 53 and len({r['menu_id'] for r in records}) == 53
assert sum(counts.values()) == 53
assert all(p['mmel_id'] in index and p['pdf_pages'] for r in records for p in r['permissions'])
assert all(r['permissions'] and r['group'] == 'conditional_permission' for r in records)
print(json.dumps(metadata, ensure_ascii=False, indent=2))
