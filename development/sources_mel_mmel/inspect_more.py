from pathlib import Path
import pymupdf as fitz
from PIL import Image,ImageDraw
import json
from collect import ROOT,inspect,fetch

extra=fetch(('02_draft_mmel/FAA_A320_MMEL_Rev30_DRAFT.pdf','https://www.faa.gov/sites/faa.gov/files/aircraft/draft_docs/mmel/MMEL_A-320_Rev_30_Draft.pdf'))
records=json.loads((ROOT/'download_manifest.json').read_text('utf-8'));records.append(extra)
records.append({'file':'00_current_mmel/FAA_A320_MMEL_Rev32_2025-07-30.pdf','url':'https://drs.faa.gov/browse/excelExternalWindow/DRSDOCID152739505920250730144819.0001','checked_on':'2026-09-13','method':'FAA DRS browser download','authority_status':'Current','issue_date':'2025-07-30'})
for r in records:
    p=ROOT/r['file']
    if p.exists():
        r.update(inspect(p,p.stem+'.txt'));r['status']='downloaded_valid_pdf'
        if 'error' in r:r['initial_attempt_error']=r.pop('error');r['method']='PowerShell Invoke-WebRequest with Windows certificate store'
(ROOT/'download_manifest.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),'utf-8')
local=json.loads((ROOT/'local_inventory.json').read_text('utf-8'))
for r in local:r['inspection']=str(ROOT/'_inspection'/Path(r['inspection']).name)
(ROOT/'local_inventory.json').write_text(json.dumps(local,ensure_ascii=False,indent=2),'utf-8')

targets=[('D:/A320/WBM A320 (MSN 2649).pdf',[0,1,2,3,4,5,6,7]),('D:/A320/SOP_25_NOV_2019.pdf',[0,1,3,4]),('D:/A320/ACG_A319_320_321.pdf',[0]),('D:/A320/NEF Rev 3 10.06.14.pdf',[1]),(str(ROOT/'03_supplements/TC_A319_A320_A321_Supplement.pdf'),[0]),(str(ROOT/'00_current_mmel/FAA_A320_MMEL_Rev32_2025-07-30.pdf'),[0])]
out=ROOT/'_inspection'/'visual';out.mkdir(exist_ok=True)
tiles=[]
for filename,pages in targets:
    doc=fitz.open(filename)
    for page in pages:
        pix=doc[page].get_pixmap(matrix=fitz.Matrix(1.2,1.2));img=Image.frombytes('RGB',[pix.width,pix.height],pix.samples)
        img.save(out/f'{Path(filename).stem}_p{page+1}.png')
        img.thumbnail((425,565));tile=Image.new('RGB',(445,600),'#dddddd');tile.paste(img,((445-img.width)//2,28));ImageDraw.Draw(tile).text((8,7),f'{Path(filename).stem[:38]} p{page+1}',fill='black');tiles.append(tile)
for offset in range(0,len(tiles),4):
    sheet=Image.new('RGB',(890,1200),'white')
    for j,tile in enumerate(tiles[offset:offset+4]):sheet.paste(tile,((j%2)*445,(j//2)*600))
    sheet.save(out/f'contact_{offset//4+1}.png')
print('Manifest updated and covers rendered.')
