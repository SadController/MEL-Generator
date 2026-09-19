from pathlib import Path
import json, hashlib
import pymupdf as fitz
from collect import ROOT

entries=[
('00_current_mmel/FAA_A320_MMEL_Rev32_2025-07-30.pdf','FAA MMEL A318/A319/A320/A321','Rev.32','30.07.2025','Действующий: Current в FAA DRS на 13.09.2026','Все модели семейства; применимость отдельных пунктов зависит от модели, двигателя и модификаций. Основной кандидат для базы.','PDF стр.1–4; карточка FAA DRS'),
('03_supplements/TC_A319_A320_A321_Supplement.pdf','Transport Canada MMEL Supplement','Rev.52','06.05.2026','Действующее опубликованное дополнение TC','Не самостоятельный MMEL. Совместно с EASA MMEL ACA от 23.02.2026 или TSC от 19.11.2025; не добавлять автоматически к FAA MMEL.','PDF стр.1,3,11,12'),
('05_training_archive/Training_MEL_Teachmint.pdf','GetJet Airlines MEL — учебная копия','Номер общей редакции не указан; Issue date','03.12.2021','Архивная копия с отметкой FOR TRAINING PURPOSES ONLY; сторонний хостинг','AAT: A319-112 (MSN 2774,3139), A320-232 (928,2029,2077), A320-233 (2118). A321 в AAT отсутствует. Включены разделы ME/MI/MO; полезен как операторский пример, не как актуальный MEL всех моделей.','PDF стр.1,3,31,61; оглавление'),
('05_training_archive/FAA_A320_MMEL_Rev31_2024-08-13_MIRROR.pdf','FAA MMEL — финальная редакция, сторонняя копия','Rev.31','13.08.2024','Архив: заменён Rev.32; файл получен не с FAA','A318/A319/A320/A321 All Models. Называется A320 MEL на зеркале, но внутри именно MMEL.','PDF стр.1–4; история редакций текущего FAA Rev.32'),
('02_draft_mmel/FAA_A320_MMEL_Rev32_DRAFT.pdf','FAA MMEL — проект','Rev.32 DRAFT','Дата утверждения: XX/XX/XXXX; PDF создан 25.03.2025','Проект; не использовать как действующую редакцию','A318/A319/A320/A321 All Models. Сохранён для сравнения с финальным Rev.32.','PDF стр.1; метаданные файла'),
('02_draft_mmel/FAA_A320_MMEL_Rev31_DRAFT.pdf','FAA MMEL — проект','Rev.31 DRAFT','Дата утверждения: XX/XX/XXXX; PDF создан 22.05.2024','Архивный проект','A318/A319/A320/A321 All Models.','PDF стр.1; метаданные файла'),
('02_draft_mmel/FAA_A320_MMEL_Rev30_DRAFT.pdf','FAA MMEL — проект','Rev.30 DRAFT','Дата утверждения: XX/XX/XXXX; PDF создан 10.05.2022','Архивный проект','A318/A319/A320/A321 All Models.','PDF стр.1; метаданные файла'),
('04_reference/FAA_Rev32_Final_Comment_Log.pdf','FAA Final Comment Log к MMEL Rev.32','Rev.32','30.07.2025','Сопроводительный документ, не MMEL','История замечаний и ответов; для выяснения причин изменений.','PDF стр.1'),
('04_reference/FAA_Rev31_Final_Comment_Log.pdf','FAA Final Comment Log к MMEL Rev.31','Rev.31','13.08.2024','Сопроводительный архивный документ, не MMEL','В том числе поясняет расхождения между FAA и Airbus/EASA MMEL.','PDF стр.1,20'),
('04_reference/EASA_A064_TCDS.pdf','EASA.A.064 Type Certificate Data Sheet','Issue 62','26.06.2026','Актуальный PDF по официальной ссылке; не MMEL','Семейство A318/A319/A320/A321; подтверждает типы и ссылку на MMEL STL11000. Индекс поисковика показывал Issue 61, скачанный файл уже Issue 62.','PDF стр.1; разделы OSD'),
('04_reference/Airbus_Getting_to_Grips_MMEL_MEL.pdf','Airbus Getting to Grips with MMEL and MEL','Редакция не установлена','PDF создан 22.07.2005, изменён 12.12.2007; не дата действующей редакции','Архивное методическое пособие, не MEL/MMEL','Для структуры и принципов работы с MEL; не источник актуальных условий допуска. Сторонняя копия.','Метаданные PDF; предисловие'),
]
local_details={
'ACG_A319_320_321.pdf':('Таблицы Approach Climb Gradient','Редакция/дата внутри не установлены; PDF создан 26.04.2015, изменён 19.08.2015','Расчётные таблицы, не MEL. На первой странице A319-112; данные Airbus PEP/Octopus v31.0.0.'),
'AFM 320-232 FULL.pdf':('Nordwind AFM A320-232','Issue 16.05.2014','Руководство по лётной эксплуатации; содержит MCDL. Не MEL.'),
'CCOM_A320_A321 24 APR 14.pdf':('Nordwind CCOM A320/A321','Issue 24.04.2014','Руководство кабинного экипажа; не MEL.'),
'FCOM A320.A321    25MAY14.pdf':('Nordwind FCOM A320/A321','Issue 25.05.2014','Руководство лётного экипажа; не MEL. Большой справочный файл.'),
'FCTM 11 DEC 13.pdf':('Nordwind FCTM A320/A321','Issue 11.12.2013','Учебное руководство; не MEL.'),
'NEF Rev 3 10.06.14.pdf':('Nordwind A320 Family NEF Program & Procedures','Rev.03, 10.06.2014','Non-Essential Equipment & Furnishings. Отдельная программа, не MEL. Название ETOPS в метаданных ошибочно относительно содержания.'),
'QRH (320-321) 20MAY14.pdf':('Nordwind QRH A320/A321','Issue 20.05.2014','Краткий справочник; не MEL.'),
'SOP_25_NOV_2019.pdf':('Уральские авиалинии SOP A319/A320/A321','Базовый выпуск 2018; изменение 05 от 25.11.2019','Даты подтверждены сканами титула и колонтитулами. Не MEL.'),
'WBM A320 (MSN 2649).pdf':('Nordwind WBM A320-232, MSN 2649, VP-BJH','Rev.003, 14.03.2013','Дата по Cross Reference Table и List of Effective Pages (PDF стр.6–8). MAR 88 на обложке — исходный выпуск, а не дата данной ревизии. Почти весь документ — скан.'),
}
manifest=json.loads((ROOT/'download_manifest.json').read_text('utf-8'))
byfile={r['file']:r for r in manifest}
registry=[]
for filename,title,rev,date,status,note,evidence in entries:
    record=dict(byfile[filename]);record.update(title=title,revision=rev,date_display=date,document_status=status,applicability_and_use=note,evidence=evidence)
    registry.append(record)
local=json.loads((ROOT/'local_inventory.json').read_text('utf-8'))
for rec in local:
    name=Path(rec['path']).name;copy=ROOT/'06_local_reference'/name
    assert hashlib.sha256(copy.read_bytes()).hexdigest()==rec['sha256']
    rec.update(project_copy=str(copy.relative_to(ROOT)),title=local_details[name][0],date_display=local_details[name][1],note=local_details[name][2],document_status='Архивная локальная копия; актуальность для сегодняшней эксплуатации не подтверждена')

unavailable=[
dict(title='PIA A320 MEL',date='30.04.2026 по названию в каталоге',url='https://crewserver1.piac.com.pk/Documents/Manual/A320/A320.MEL.30APR2026.pdf',catalog='https://crewserver1.piac.com.pk/Manual/Manuals.aspx?Category=2&description=A320',status='Каталог прочитан веб-поиском, опубликовано 24.06.2026; PDF не получен: соединение сбрасывается в Python, PowerShell, curl и браузере. HTTP также недоступен. Номер ревизии, состав и применимость не проверены.'),
dict(title='AirAsia/AXM A320 MEL',date='03.08.2026 по странице RedDocs',url='https://sites.google.com/airasia.com/reddocs/external-documents/airbus',file_url='https://drive.google.com/embeddedfolderview?id=1hQOBsYIjFBbNQIcY0NAN2mVRvopGY1yS',status='Ссылка на Google Drive возвращает 401 Unauthorized. Документ не получен; доступ не запрашивался.'),
dict(title='Airbus/EASA MMEL',date='23.02.2026 (ACA); 19.11.2025 (TSC)',url='https://wwwapps2.tc.gc.ca/Saf-Sec-Sur/2/MEL-LEM/m_e_l_s_r.aspx?lang=eng&m=Airbus+Industrie',status='Полный электронный MMEL не предоставлен на сайте TC. Даты подтверждены введением TC Supplement Rev.52, PDF стр.12. Дополнение скачано, основной MMEL — нет.'),
dict(title='Cannes Aviation QRH & MEL A320 v1.2',date='Не установлена',url='https://extranet.cannes-aviation.com/docs/COURSE%20MATERIAL/APS%20MCC/QRH%20%26%20MEL/QRH%20%26%20MEL%20A320%20v1.2.pdf',status='PDF упоминается в поиске, ссылка возвращает HTTP 404. Не получен.'),
dict(title='KAC A320-214 MEL на Studylib',date='31.10.2024 заявлено в названии',url='https://studylib.net/doc/27643486/a320-214-31oct2024',status='Найден индексированный текст на стороннем сайте. Исходный PDF не получен и не проверен; кандидат для дальнейшего поиска оригинала.'),
dict(title='A319/A320/A321 MEL Issue 8 Rev.2 на Scribd',date='Не установлена',url='https://www.scribd.com/document/972461141/A320-MEL-Issue-8-Rev-2',status='Найден сторонний просмотр. По фрагментам встречается Revision 00, поэтому название загрузки не подтверждает ревизию всего документа. PDF не получен.'),
dict(title='Viva/Fast Colombia MEL на PDFCoffee',date='Rev.22, 29.11.2018 по индексированному тексту',url='https://pdfcoffee.com/mel-a320-viva-pdf-free.html',status='Сторонний текстовый просмотр; оригинальный PDF не получен. Архивный кандидат, не проверенный источник.'),
dict(title='GISA A319 MSN 1589 MEL на Scribd',date='Issue 1 Rev.01, 10.06.2022 по индексированному тексту',url='https://www.scribd.com/document/841721164/GISA-A319-1589-MEL-Issue-1-Rev-01-Changes-Not-Highlighted',status='Сторонний просмотр; PDF не получен и не проверен.'),
dict(title='A320/A321 P2F MMEL на Scribd',date='R09, 01.12.2021 заявлено в названии',url='https://www.scribd.com/document/642717062/A320-A321-P2F-MMEL-PTC-R09-DEC-01-21-pdf',status='Грузовая конверсия P2F, вне текущего объёма пассажирского Fenix. PDF не получен.'),
dict(title='PIA старые MEL',date='26.03.2025 / 20.10.2025 по названиям файлов',url='https://crewserver1.piac.com.pk/Documents/Manual/A320/A320.MEL.20OCT25.pdf',other_url='https://crewserver1.piac.com.pk/Documents/Manual/A320/MEL.Rev.26.Mar.2025.pdf',status='Старые индексированные ссылки. Ссылка 20.10.2025 ранее возвращала 404; сейчас сервер недоступен с компьютера. Новая запись каталога — 30.04.2026. Не получены.'),
]
bundle=dict(checked_on='2026-09-13',scope='Сбор документов и проверка метаданных; не разработка приложения и не извлечение каталога отказов',internet=registry,local=local,not_downloaded=unavailable)
(ROOT/'registry.json').write_text(json.dumps(bundle,ensure_ascii=False,indent=2),'utf-8')

lines=['# Реестр MEL/MMEL и справочных документов','', 'Проверено 13 сентября 2026 года. Скачано 11 PDF из интернета; скопировано 9 PDF из D:\\A320. Исходные локальные файлы не изменены.','',
'## Основной вывод','',
'FAA MMEL Rev.32 от 30.07.2025 получен из официального FAA DRS и помечен там Current. Это основной кандидат для последующего формирования базы. GetJet MEL от 03.12.2021 — учебная архивная копия только для перечисленных A319/A320; A321 в её таблице бортов нет. TC Rev.52 — дополнение к EASA MMEL, не замена основного MMEL и не дополнение к FAA MMEL.','',
'## Получено из интернета','',
'| № | Документ / локальный файл | Редакция и дата | Страниц | Статус и применение |','|---|---|---|---:|---|']
for i,r in enumerate(registry,1):
    lines.append(f"| {i} | [{r['title']}](<{r['file']}>) | {r['revision']}; {r['date_display']} | {r['pages']} | {r['document_status']}. {r['applicability_and_use']} |")
lines+=['','## Источники и основания датировки','']
for i,r in enumerate(registry,1):lines.append(f"{i}. **{r['title']}** — [источник]({r['url']}). Основание: {r['evidence']}.")
lines+=['','## Документы пользователя из D:\\A320','', '| Файл / копия | Содержание | Проверенная дата | Страниц | Примечание |','|---|---|---|---:|---|']
for r in local:lines.append(f"| [{Path(r['path']).name}](<{r['project_copy']}>) | {r['title']} | {r['date_display']} | {r['pages']} | {r['note']} |")
lines+=['','Все девять локальных документов относятся к архивным справочным материалам. Самостоятельных MEL/MMEL среди них нет. Изменение файла в Windows не использовалось как дата редакции.','', '## Найдено, но PDF не получен','', '| Документ | Заявленная дата | Причина / статус |','|---|---|---|']
for r in unavailable:lines.append(f"| [{r['title']}]({r['url']}) | {r['date']} | {r['status']} |")
lines+=['','## Проверка файлов и пределы проверки','',
'- У всех 20 PDF проверены сигнатура, открытие, число страниц и извлечение текста со всех страниц; вычислены SHA-256. Все копии из D:\\A320 сверены с оригиналами по SHA-256.',
'- Проверены титулы, письма о выпуске, история редакций и/или перечни действующих страниц. Сканированные страницы WBM/SOP/NEF и титулы FAA/TC просмотрены визуально.',
'- WBM преимущественно сканированный: текст извлекается только с 9 из 227 страниц. Для последующего поиска внутри потребуется OCR.',
'- Техническая читаемость не доказывает полноту контролируемого комплекта: построчная сверка всех листов с LEP/LESS, проверка временных ревизий и AD для конкретного борта в этот этап не входят. Для FAA Rev.32 проверены наличие всех ATA-разделов из оглавления и отсутствие разрывов внутренней нумерации системных страниц.',
'- Пункты разных операторов и нормативных основ нельзя смешивать. Применимость к двигателям/модификациям и Fenix предстоит проверять на этапе 3; из общей надписи A318/A319/A320/A321 на обложке применимость не выводится.',
'- Даты поискового индекса и метаданные PDF не приравниваются к датам редакции. Для ACG и пособия Airbus точная редакция не установлена.',
'- Сторонние копии отмечены отдельно; они не подтверждают действующий статус операторского MEL. Разрешение на распространение исходных руководств в составе публичного приложения не установлено.','',
'## Служебные материалы','',
'`registry.json` — полный реестр; `download_manifest.json` — загрузки, URL, размеры и контрольные суммы; `local_inventory.json` — первоначальная инвентаризация; `_inspection` — извлечённые титульные/контрольные страницы и изображения для проверки. Скрипты в этой папке использовались только для сбора и проверки документов.']
(ROOT/'РЕЕСТР.md').write_text('\n'.join(lines)+'\n','utf-8')
print('Registry written:',len(registry),'internet PDFs,',len(local),'local PDFs')
