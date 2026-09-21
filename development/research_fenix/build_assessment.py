"""Build a conservative research matrix. No rows are approved for generation."""
from pathlib import Path
import json,csv,re,hashlib,collections
import pymupdf

root=Path(__file__).parent
items=json.loads((root/'mmel_item_index.json').read_text(encoding='utf-8'))
ix={i['id']:i for i in items}
alpha=pymupdf.open(root/'evidence/Fenix_failurelist_v0.2_ALPHA_2021-07-12.pdf')
alpha_text=[' '.join(p.get_text().split()) for p in alpha]
rows=[]
def add(id,branch,names,status,note,models='A319/A320/A321 CEO',engines='CFM56 / IAE V2500',evidence='ALPHA_2021'):
    names=names.split(';') if names else []
    pages={name:[n+1 for n,t in enumerate(alpha_text) if name in t] for name in names}
    rows.append(dict(mmel_id=id,branch=branch,mmel_title=ix[id]['title'],printed_pages=ix[id]['printed_pages'],pdf_pages=ix[id]['pdf_pages'],fenix_names=names,status=status,models=models,engines=engines,note=note,fenix_evidence=evidence,alpha_pdf_pages=pages,installed_version='2.4.0.4720',tested_in_sim=False,approved_for_generation=False))

# Each entry is an assessed correspondence, not a unique aircraft failure.
# K = semantic candidate; U = exact state/configuration unresolved; X = rejected equivalence.
add('21-21-01','one cabin fan','Recirculation fans','U','MMEL допускает один из двух; старое имя во множественном числе не устанавливает, один или оба вентилятора выключает Fenix.')
add('21-23-01','1) / 2)','Lavatory/Galley fan','K','Совпадает компонент; выбрать ветвь Mod.22561, проверить последствия для smoke detection.')
add('21-26-01','Blower Fan','Ventilation blower fault','K','Не объединять с Extract fan или Pack: MMEL требует их исправности.')
add('21-26-02','Extract Fan','Ventilation extract fault','K','Не объединять с Blower fan или Pack; существуют ограничения температуры и времени на земле.')
add('21-26-04','Skin Air Outlet Valve','Vent extract valve','U','Уточнить тождество клапана и его положение. Не путать с отказом вытяжного вентилятора.')
add('21-26-05','Skin Air Inlet Valve','Vent inlet valve','U','Нужно подтвердить положение, требуемое выбранной строкой MMEL.')
add('21-26-10','AEVC','Ventilation AEVC','K','Совпадает компьютер; отключение компьютера не заменяет проверку вентиляторов и положений клапанов.')
add('21-28-02','Forward Cargo Isolation Valves','Cargo fwd isolation valve downstream;Cargo fwd isolation valve upstream','U','Только если передняя cargo ventilation установлена. Нужны фактические положения клапанов.')
add('21-28-05','Aft Cargo Isolation Valves','Cargo aft isolation valve downstream;Cargo aft isolation valve upstream','U','Учитывать комплектацию cargo ventilation и положение клапана.')
add('21-31-01','1) System 1','CPC 1','K','CPC1 и CPC2 имеют разные сроки/условия. Оба канала FCU и оставшийся CPC должны работать.',evidence='ALPHA_2021 + SUPPORT_2026_SCREENSHOT_DATED_2024')
add('21-31-01','2) System 2','CPC 2','K','Проверить ручной режим и индикацию; CPC1 и оба канала FCU должны работать.')
add('21-31-01','AUTO channels vs stuck outflow','Outflow valve stuck','X','Заклинивание клапана не равно отказу автоматического канала CPC: может затронуть и ручное управление.')
add('21-51-01','without Mod.30626','Pack 1 flow control valve;Pack 2 flow control valve','U','Для обычной однопаковой ветви клапан должен быть закрыт; Fenix фиксирует текущее положение. Также применить 21-52-01.')
add('21-52-01','single pack, exact configuration pending','Pack 1 regulator fault;Pack 2 regulator fault','U','Кандидат на неработающий pack, но отказ регулятора может оставлять резервное управление. Проверить реальный результат и ветвь ECS/модели.')
add('21-52-01','pack failure vs indication sensor','Pack 1 overheat;Pack 2 overheat','U','В alpha описание указывает отказ датчика температуры. Нельзя автоматически считать весь pack неработающим.')
add('21-55-01','Emergency Ram Air Inlet','Ram air valve','U','Уточнить клапан и положение; не смешивать с ram-air flaps теплообменника pack.')
add('21-63-01','1) Primary / 2) Secondary, without Mod.30626','Zone controller primary;Zone controller secondary','K','Подпункты имеют разные последствия. Не переносить в enhanced ECS без отдельного подтверждения.')
add('21-63-03','Hot Air Pressure Regulating Valve','Hot air valve','U','Сначала установить фактическое положение клапана и работоспособность trim-air; общий Hot air fault недостаточен.')
add('22-10-01','Autopilot Systems','AP 1;AP 2','K','Отказ AP-функции при сохранённом FD. Не заменять отказом всего FMGC; выбрать строку для одного либо двух AP.')
add('22-30-01','Autothrust Function','A/THR 1;A/THR 2','U','Отказ A/THR-функции одного FMGC может оставлять общий autothrust работоспособным. Нужно проверить фактическую потерю функции.')
add('22-63-01','1) System 1 / 2) System 2','Yaw damper channel 1;Yaw damper channel 2','K','Раздельные ветви; второй демпфер должен работать.')
add('22-66-01','1) FAC 2, without eRudder','FAC 2','K','Разрешение относится именно к FAC2, при исправности перечисленных систем управления и навигации.')
add('22-66-01','FAC 1 is not the permitted FAC 2','FAC 1','X','Наличие FAC1 в Fenix не даёт допуска: подпункт FAA указан для FAC2, отдельно описано последствие потери FAC1.')
add('22-66-03','Reactive windshear branch','Reactive W/S det channel 1;Reactive W/S det channel 2','U','Отделить reactive от predictive windshear; проверить, какой уровень системы теряется после одного канала.')
add('22-81-01','1) one FCU channel, without eRudder','FCU Channel 1;FCU Channel 2','K','В MMEL требуется исправность CPC, FAC, RA, LGCIU, ADIRS и всех DU; многие пары отказов исключаются.')
add('22-82-01','MCDU','MCDU 1;MCDU 2','K','Проверить количество установленных устройств и оставшиеся способы управления; не использовать recoverable fault как постоянный дефект без проверки.')
add('22-83-01','1) FMGC1 / 2) FMGC2','FMGC 1;FMGC 2','K','Потеря AP/FD относится к последствиям того же FMGC. Не считать их дополнительными независимыми отказами.')
add('23-71-01','CVR system','CVR','K','Совпадает компонент; ограничения выбранной строки FAA сохраняются. Подтверждение записи звука в симуляторе отсутствует.')
add('24-20-01','one engine generator channel, CEO branch','Generator 1;Generator 2','K','Нужна ветвь CEO и проверка резервных источников. Отказ AC BUS не эквивалентен отказу генератора.')
add('24-20-02','APU generator, CEO/configuration branch','APU generator','K','Отдельно от общего отказа APU; сверить условия выбранной модификации.')
add('24-30-01','TR1','TR 1','K','Допуск касается TR1; исправность packs/extract и остальных источников остаётся условием.')
add('24-30-01','TR2, without/with Mod.27620','TR 2','U','Обнаружена ошибка заголовка в исходном PDF на 24-22: текст о TR2 стоит под 24-27-09. Не исправлять молча; ветвь с ISIS требует уточнения.')
add('24-30-01','ESS TR is not TR1/TR2','ESS TR failure','X','Разрешения прочитанного пункта относятся к TR1/TR2; перенос на ESS TR не подтверждён.')
add('26-12-01','1) Loop A / 2) Loop B','Eng 1 Loop A;Eng 1 Loop B;Eng 2 Loop A;Eng 2 Loop B','K','Один loop на двигатель при исправном другом. Реальный пожар или отказ всего FDU — другие состояния.')
add('26-13-01','1) APU loops','APU Loop A;APU Loop B','K','Loop A/B имеют разные условия наземного наблюдения. Отказ обоих относится к другим строкам с неиспользуемым APU.')
add('26-17-02','SDCU, installed standard','SDCU','U','Проверить CIDS/SDCU стандарт и охват потерянных каналов; не отождествлять с фактическим дымом.')
add('27-22-01','Rudder Trim Systems','Rudder trim channel 1;Rudder trim channel 2','K','Выбирать конкретный канал и проверять оставшееся управление.')
add('27-23-01','one system, without eRudder','Rudder travel limiter channel 1;Rudder travel limiter channel 2','K','MMEL допускает один из двух. В руководстве Fenix 2025 есть снимок активированного канала1.',evidence='ALPHA_2021 + LOCAL_GUIDE_2025_P21')
add('27-51-01','1)a) SFCC2 flap / 2)a) SFCC2 slat','SFCC 2 flap sys;SFCC 2 slat sys','K','Для CEO документ называет канал SFCC2. Не переносить на SFCC1 или целиком SFCC2; условия испытаний WTB сохраняются.')
add('27-51-01','SFCC1/full computer vs permitted channel','SFCC 1;SFCC 2','X','Общий отказ компьютера шире отдельного разрешённого канала. Нельзя автоматически применить один подпункт.')
add('27-93-01','1) / 2) ELAC1','ELAC 1','K','ELAC1; ветвь зависит от модели/модификаций. ELAC2 и остальные перечисленные системы должны работать.')
add('27-93-01','ELAC2 vs permitted ELAC1','ELAC 2','X','Прочитанные разрешения относятся к ELAC1 либо его функции; симметрия по номеру недопустима.')
add('27-94-01','1) SEC1 / 2) SEC2 / 3) SEC3','SEC 1;SEC 2;SEC 3','K','Нужны разные записи по SEC и комплектации. Для A320 Sharklets выделены отдельные подпункты; применяются требования к характеристикам AFM.')
add('27-95-01','FCDC2 only','FCDC 2','K','FAA разрешает FCDC2. Ветвь зависит от Mod.35542/steep approach; не смешивать с ELAC/SEC.')
add('27-95-01','FCDC1 not covered by FCDC2 relief','FCDC 1','X','Нельзя переносить разрешение FCDC2 на FCDC1.')
add('28-15-01','1)a) LH / 1)b) RH','Left transfer 1;Left transfer 2;Right transfer 1;Right transfer 2','U','Только outer-to-inner transfer: состояние открыто/закрыто определяет строку; не относится к A321.',models='A319/A320 CEO; A321 исключён')
add('28-21-01','Wing Tank Pumps','Fuel pump left 1;Fuel pump left 2;Fuel pump right 1;Fuel pump right 2','K','Уточнить Mod.36387/SB и число исправных насосов. Не отождествлять с утечкой бака.')
add('28-21-02','1)a) electric center pumps, no ACT','Fuel pump center 1;Fuel pump center 2','U','Только A319/A320 без Mod.154327. Для A321 требуются ветви transfer valves, а не этот отказ.',models='A319/A320 CEO без transfer jet-pumps и без ACT')
add('28-21-02','2)b) / 2)c) transfer valves','','U','В MMEL применимо к A321 и соответствующим A319/A320, но актуальное имя отдельного отказа Fenix не получено.',models='A321 CEO; A319/A320 с Mod.154327',evidence='FAA_ONLY')
add('28-23-02','pushbutton lights vs crossfeed valve','Crossfeed valve','X','В FAA 28-23-02 относится к кнопке/лампам. Заклинивание crossfeed нельзя подменять неисправностью его индикации.')
add('28-40-02','1) one FQI channel','FQI Chan 1;FQI Chan 2','K','Сверить модификацию и ACT; отказ канала отличается от отдельной ошибки индикации количества.')
add('29-10-01','depressurization vs failed engine pump','Eng 1 pump failure;Eng 2 pump failure','X','Разрешение относится к функции разгрузки, а не потере подачи гидронасоса.')
add('29-10-02','1) automatic control vs total pump failure','Elec hyd pump blue failure','X','MMEL требует сохранения ручной работы насоса. Полный отказ Blue electric pump этому не соответствует.')
add('29-23-01','1) automatic activation vs total PTU failure','PTU Fault','X','FAA рассматривает отказ автоматики при непрерывной работе PTU; передача мощности должна сохраняться. Общий PTU Fault не эквивалентен.')
add('29-25-01','Yellow System Electric Pump','Elec hyd pump yellow failure','K','Прямой кандидат на отказ насоса; кнопка OFF, cargo doors требуют ручного обслуживания по MMEL.')
add('29-30-03','indication vs hydraulic leak','Green hydraulic leak;Blue hydraulic leak;Yellow hydraulic leak','X','Пункт об индикации HYD не разрешает реальную потерю жидкости. Наличие утечки в Fenix подтверждено также руководством 2025.')
add('30-11-01','wing anti-ice valve','Left WAI Valve;Right WAI Valve','U','Разрешённые позиции и условия различны; stuck in current position нужно перевести в проверенный конкретный сценарий.')
add('30-21-01','CEO valve, CFM/IAE rows','Eng 1 EAI Valve;Eng 2 EAI Valve','U','Сначала определить открыто/закрыто. Ветка IAE при открытом клапане имеет дополнительное условие OAT; neo-ветви исключены.')
add('30-31-01','2) F/O or STBY loss of heating','PHC 2;PHC 3','U','Alpha определяет PHC как потерю обогрева: не использовать строку1, где обогрев должен оставаться исправным. Для F/O/STBY читать специальные строки.')
add('30-31-01','1) retained heater operation vs PHC1 loss','PHC 1','X','Alpha PHC1 выключает обогрев CAPT. Строка1 требует исправный соответствующий heater; эквивалентность не доказана.')
add('30-31-02','CAPT / F/O / STBY','Pitot heat Capt;Pitot heat F/O;Pitot heat STBY','K','Раздельные строки по месту установки; blockage не равно отказу обогрева.')
add('30-31-03','Static heaters, side and position','Left Static heat Capt;Right Static heat Capt;Left Static heat F/O;Right Static heat F/O;Left Static heat Stby;Right Static heat Stby','K','Не путать левый/правый порт с CAPT/F/O/STBY. В MMEL установлено шесть heaters.')
add('30-31-04','AOA heaters, CEO','AOA heat Capt;AOA heat F/O;AOA heat STBY','K','Выбирать отдельную позицию и её условия; отказ датчика AOA не тождественен heater.')
add('30-31-05','TAT heaters, 2 installed','TAT heat Capt;TAT heat F/O','K','MMEL указывает два TAT heater; нужен актуальный список Fenix.')
add('30-31-05','unsupported third TAT heater','TAT heat STBY','X','Alpha содержит STBY, но MMEL указывает два установленных TAT heater. Не создавать третий по устаревшему перечню.')
add('30-42-01','Window Heat Computers','WHC 1;WHC 2','U','Проверить, какие обогреватели теряются и допустимость выбранной строки; не путать компьютер с отдельным стеклом.')
add('31-30-01','CFDS','CFDIU','K','Совпадает система диагностики; проверить, что отказ не шире CFDS.')
add('31-53-01','FWC2 only','FWC 2','K','Документ разрешает FWC2, с условиями steep approach и минимумов.')
add('31-53-01','FWC1 not covered by FWC2 relief','FWC 1','X','Нельзя переносить разрешение FWC2 на FWC1.')
add('31-55-01','SDAC2 only','SDAC 2','K','MMEL явно называет SDAC2.')
add('31-55-01','SDAC1 not covered by SDAC2 relief','SDAC 1','X','Нельзя переносить разрешение SDAC2 на SDAC1.')
add('31-56-01','ECAM Control Panel','ECP','U','Уточнить, совпадает ли полный internal failure панели с разрешёнными функциями/ветвью.')
add('31-63-01','1) PFDU2 / 2) NDU1 / 3) NDU2 / 4) SDU','DU F/O PFD;DU Capt ND;DU F/O ND;DU ECAM Lower','K','FAA перечисляет конкретные дисплеи. Для SDU отдельные Mod.36414/38111; остальные дисплеи должны быть исправны.')
add('31-63-01','CAPT PFD and upper ECAM not listed','DU Capt PFD;DU ECAM Upper','X','PFDU1 и E/WDU не включены в прочитанные разрешения; не добавлять по аналогии с другими DU.')
add('31-63-02','1) DMC1 / 2) DMC2 / 3) DMC3','DMC 1;DMC 2;DMC 3','U','Факт EIS2 не определяет S4-2/S7/S8-2 и автоматическое AC ESS switching. Требуется точная комплектация.')
add('32-31-01','1) LGCIU2 CEO, and relevant ACT branch','LGCUI 2','K','В alpha опечатка LGCUI. FAA разрешает LGCIU2 с большим списком зависимостей; актуальное имя проверить.')
add('32-31-01','LGCIU1 vs LGCIU2','LGCUI 1','X','MMEL пункт озаглавлен LGCIU2; разрешение на LGCIU1 не переносится.')
add('32-31-02','retraction, gear down','Gear locked down','U','Может соответствовать только после проверки истинного отказа уборки и всех условий; не равно Gear locked up.')
add('32-42-01','one wheel brake','Wheel brake fault 1;Wheel brake fault 2;Wheel brake fault 3;Wheel brake fault 4','K','Разрешён один тормоз; требуется исправность antiskid, NWS и обоих reverser. AUTO/BRK считается неработающим последствием.')
add('32-42-03','BSCU channels/systems','BSCU SYS 1;BSCU SYS 2','U','Нужны стандарт BSCU и модель самолёта. BSCU brake fault и отказ канала SYS не объединять.')
add('32-42-04','main AUTO/BRK function','Autobrake failure','K','Обычное торможение должно сохраняться. Не выбирать подпункты ламп LO/MED/MAX вместо функции.')
add('32-49-01','pressure indication vs low tyre pressure','Tyre pressure left 1 low','X','Низкое физическое давление не равно отказу индикатора давления.')
add('34-10-01','4) ADR2 / 5) ADR3','ADR2 failure;ADR3 failure','K','Раздельные условия; ADR2 отличается ограничениями от ADR3.')
add('34-10-01','ADR1 not covered by ADR2/3 relief','ADR1 failure','X','В прочитанном пункте указаны ADR2 и ADR3; нельзя автоматически разрешать ADR1.')
add('34-10-01','1) IR1 NAV mode only','IR1 position failure','U','Требуется сохранение ATT; полный IR1 failure шире разрешения. Выбрать ветвь стандарта FMS.')
add('34-10-01','2) IR2 / 3) IR3, NAV or total as specified','IR2 position failure;IR3 position failure;IR2 IR failure;IR3 IR failure','U','Разделить NAV-only и полный отказ. Для IR2 учитываются стандарт FMS и модификации; не заменять IR1.')
add('34-36-01','ILS systems','ILS 1 G/S;ILS 1 LOC;ILS 2 G/S;ILS 2 LOC','U','Канальный отказ приёмника и полный ILS различны. Localizer/Glideslope transmitter в alpha — отказ наземного средства, не бортового ILS.')
add('34-41-01','Weather Radar Systems','','U','Наличие рабочего радара Fenix не доказывает возможность задать отдельный отказ; в alpha отдельного имени не найдено.',evidence='FAA_ONLY + FENIX_WEATHER_RADAR_SUPPORT')
add('34-42-01','1) RA1 / RA2 without eRudder','Radio altimeter 1;Radio altimeter 2','K','RA1/RA2 имеют разные сроки устранения; остальные перечисленные компьютеры должны работать.')
add('34-43-01','TCAS II','TCAS','K','Совпадает функция; проверить режим отказа и ограничения выбранной строки.')
add('34-48-01','GPWS','GPWC','U','Полный GPWC может затронуть GPWS, TAWS и windshear; выделить все последствия.')
add('34-52-01','ATC transponder','ATC 1;ATC 2','K','Учитывать оставшийся транспондер, altitude reporting и ADS-B; не считать все функции автоматически тождественными.')
add('34-53-01','ADF','ADF 1;ADF 2','K','Только установленные приёмники; alpha упоминает два, комплектация конкретного Fenix ещё не проверена.')
add('34-55-01','VOR','VOR 1;VOR 2','K','Сохранить требования к маршруту/средствам навигации из MMEL.')
add('34-58-01','GPS, selected configuration','GPS 1;GPS 2','K','Определить стандарт GPS/MMR и оставшиеся навигационные функции; не смешивать GPS с полным ADIRS.')
add('35-13-01','pressure indication vs oxygen depletion','Crew oxygen pressure < 400;Crew oxygen pressure < 800','X','Малое количество кислорода не равно отказу указателя. Эти сценарии не включать по пункту индикации.')
add('36-11-02','PRV secured closed','Eng 1 bleed valve;Eng 2 bleed valve','U','Fenix фиксирует текущее положение. Требуется именно closed и последствия по 36-11-01.')
add('36-11-07','HPV closed','Eng 1 HP Valve;Eng 2 HP Valve','U','Нужно подтвердить закрытое положение и соответствующую строку MMEL.')
add('36-11-08','BMC, CEO standard','BMC 1;BMC 2','U','Ветви зависят от модификаций/систем; не считать BMC1/BMC2 симметричными без разбора строки.')
add('36-12-02','APU bleed valve, state and ACT','APU bleed valve','U','Раздельно open/closed. Для ACT-конфигураций есть дополнительные условия.')
add('36-12-04','AUTO/MAN control vs mechanically stuck valve','Crossbleed valve','X','MMEL допускает потерю одного способа управления при сохранении другого; заклинивший клапан не эквивалентен.')
add('36-22-15','detection loops vs actual leak','Bleed leak pylon engine 1;Bleed leak pylon engine 2','X','Настоящая утечка не является отказом контура обнаружения утечки.')
add('46-21-01','ATSU','ATSU','K','Совпадает блок; определить связанные функции datalink, не переносить на EFB.')
add('49-10-01','APU system via ECB failure','ECB','U','Проверить потерю APU и отсутствие пожара/других повреждений; выбрать ветвь ACT.')
add('49-30-02','APU LP valve','APU fuel valve','U','Требуется идентификация клапана и его положения; APU fire не эквивалентен.')
add('52-70-01','door indication by physical door type','Aft cargo door;Forward cargo door;Forward avionics door','U','Alpha описывает сигнал датчика. Проверить, что дверь физически закрыта; количество/расположение дверей различается у A319/320/321.')
add('74-31-01','ignition channel vs no ignition','Eng 1 no ignition;Eng 2 no ignition','U','Нельзя назначить допуск отдельного igniter на общий отказ запуска без проверки, какой канал остался работоспособен.')
add('78-30-01','1) CEO, one reverser secured stowed','Left reverser inhibited by maint;Right reverser inhibited by maint','K','Подходящий вид отказа. Раздельные проверки CFM switches / IAE LVDT; оба тормозных условия и характеристики обязательны.')
add('78-30-01','unlocked/pressurized is not secured stowed','Left reverser unlocked;Left reverser pressurized;Right reverser unlocked;Right reverser pressurized','X','Не соответствует требованию отключённого убранного реверса и отсутствия REV PRESSURIZED.')
add('79-31-01','quantity indication vs actual low oil','Eng 1 low oil quantity;Eng 2 low oil quantity','X','Физически малое количество масла не равно отказу указателя количества.')
add('80-11-01','1)a) CFM/IAE start valve','Start valve left;Start valve right','U','Alpha: механически закрыт. FAA требует наземной ручной работы клапана; доступность такого обслуживания в Fenix не подтверждена.')

# Explicit exclusions are based on the MMEL scope, not absence from the alpha list.
excluded='26-11-01 26-11-02 27-64-05 27-92-07 27-93-04 28-21-04 28-25-07 28-25-08 30-21-03 71-10-01 71-13-01 73-20-11 73-30-05 73-30-08 73-30-10 73-30-11 75-22-02 75-25-02 75-25-03 78-31-02 79-20-03 80-11-06'.split()
for id in excluded:
    add(id,'outside chosen CEO/CFM56/IAE scope','','N','Пункт относится к neo/XLR, A318/PW6000 либо их оборудованию; вне выбранного состава Fenix.',models='Вне A319/A320/A321 CEO',engines='Вне выбранной конфигурации',evidence='FAA_SCOPE + LOCAL_GUIDE_2025')

for n,r in enumerate(rows,1): r['assessment_id']=f'F{n:03}'
missing=[(r['assessment_id'],name) for r in rows for name,ps in r['alpha_pdf_pages'].items() if not ps]
if missing: raise ValueError(f'Alpha name not found: {missing}')
labels={'K':'Кандидат по документам','U':'Нужно уточнить состояние/комплектацию','X':'Сопоставление отклонено','N':'Вне выбранной конфигурации'}
meta={'date':'2026-09-13','mmel':'FAA A320 MMEL Rev32, 2025-07-30','mmel_url':'https://drs.faa.gov/browse/excelExternalWindow/DRSDOCID152739505920250730144819.0001','fenix_version':'2.4.0.4720','runtime_tests':0,'approved_records':0,'top_level_item_count':len(items),'assessment_count':len(rows),'status_counts':dict(collections.Counter(r['status'] for r in rows)),'meaning':'Research triage. Not a parsed MMEL subitem catalogue or dispatch approval.'}
(root/'applicability_matrix.json').write_text(json.dumps({'metadata':meta,'assessments':rows},ensure_ascii=False,indent=2),encoding='utf-8')
fields=['assessment_id','mmel_id','branch','mmel_title','status','models','engines','fenix_names','printed_pages','pdf_pages','note','fenix_evidence','tested_in_sim','approved_for_generation']
with (root/'applicability_matrix.csv').open('w',encoding='utf-8-sig',newline='') as f:
    w=csv.DictWriter(f,fieldnames=fields,extrasaction='ignore');w.writeheader()
    for r in rows: w.writerow({k:'; '.join(map(str,v)) if isinstance(v,list) else v for k,v in r.items()})
lines=['# FAA MMEL → Fenix: подробная матрица','', 'Дата: 13.09.2026. Версия установленного Fenix: 2.4.0.4720.', '', '**Все строки исследовательские. Ни одна ещё не подтверждена испытанием в установленном Fenix.**', '', 'K — компонент/функция совпадает по документам; U — требуется уточнение состояния или комплектации; X — конкретное предложенное сопоставление неверно; N — вне выбранного семейства/двигателей. X не означает, что весь пункт MMEL неприменим.', '', 'Имена из alpha v0.2 (12/07/2021) служат поисковыми ориентирами, а не подтверждёнными именами актуального меню. Пустое имя означает, что его не удалось установить.', '', '| № | MMEL и подпункт | Отказ Fenix / ориентир | Статус | Применимость и результат |', '|---|---|---|---|---|']
for r in rows:
    p=r['pdf_pages'][0]
    link=f"[{r['mmel_id']}](../sources_mel_mmel/00_current_mmel/FAA_A320_MMEL_Rev32_2025-07-30.pdf#page={p})"
    note=f"{r['models']}; {r['engines']}. {r['note']} Страницы: {', '.join(r['printed_pages'])}."
    lines.append(f"| {r['assessment_id']} | {link}, {r['branch']} | {'; '.join(r['fenix_names']) or 'Не установлено'} | {r['status']} | {note} |")
(root/'МАТРИЦА.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')

inventory=[]
for i in items:
    rr=[r for r in rows if r['mmel_id']==i['id']]
    inventory.append({'mmel_id':i['id'],'title':i['title'],'pdf_pages':i['pdf_pages'],'printed_pages':i['printed_pages'],'assessments':[r['assessment_id'] for r in rr],'screening_status':'есть отдельная оценка — см. матрицу' if rr else 'сопоставление с Fenix не установлено','approved_for_generation':False})
(root/'full_mmel_inventory.json').write_text(json.dumps(inventory,ensure_ascii=False,indent=2),encoding='utf-8')
with (root/'full_mmel_inventory.csv').open('w',encoding='utf-8-sig',newline='') as f:
    w=csv.DictWriter(f,fieldnames=list(inventory[0]));w.writeheader()
    for i in inventory:w.writerow({k:'; '.join(map(str,v)) if isinstance(v,list) else v for k,v in i.items()})
print(json.dumps(meta,ensure_ascii=False,indent=2))
print('Top-level items with detailed assessment:',len({r['mmel_id'] for r in rows}))
