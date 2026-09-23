from pathlib import Path
import urllib.request, json, hashlib, concurrent.futures
import pymupdf as fitz

ROOT=Path(__file__).resolve().parent
SOURCES=[
 ('01_operator_mel/PIA_A320_MEL_2026-04-30.pdf','https://crewserver1.piac.com.pk/Documents/Manual/A320/A320.MEL.30APR2026.pdf'),
 ('02_draft_mmel/FAA_A320_MMEL_Rev32_DRAFT.pdf','https://www.faa.gov/aircraft/draft_docs/mmel/MMEL_A-320_Rev_32_Draft.pdf'),
 ('02_draft_mmel/FAA_A320_MMEL_Rev31_DRAFT.pdf','https://www.faa.gov/aircraft/draft_docs/mmel/MMEL_A-320_Rev_31_Draft.pdf'),
 ('03_supplements/TC_A319_A320_A321_Supplement.pdf','https://wwwapps2.tc.gc.ca/saf-sec-sur/2/MEL-LEM/tcbbs/tcsup/A_320.pdf'),
 ('04_reference/FAA_Rev32_Final_Comment_Log.pdf','https://www.faa.gov/aircraft/draft_docs/fcl/FCL_MMEL_A-320_Rev_32.pdf'),
 ('04_reference/FAA_Rev31_Final_Comment_Log.pdf','https://www.faa.gov/aircraft/draft_docs/fcl/FCL_MMEL_A-320_Rev-31.pdf'),
 ('04_reference/EASA_A064_TCDS.pdf','https://www.easa.europa.eu/en/downloads/16507/en'),
 ('04_reference/Airbus_Getting_to_Grips_MMEL_MEL.pdf','https://www.cockpitseeker.com/wp-content/uploads/goodies/ac/a320/docs/Getting_to_grips_with_MMEL_and_MEL.pdf'),
 ('05_training_archive/Training_MEL_Teachmint.pdf','https://teachmint.storage.googleapis.com/public/4262056623/StudyMaterial/e11af284-a695-4e46-a932-f6bd3650f2bf.pdf'),
]

def inspect(path,extract_name):
    raw=path.read_bytes()
    if not raw[:1024].find(b'%PDF-')>=0: raise ValueError('Not a PDF')
    doc=fitz.open(path)
    if doc.needs_pass: raise ValueError('Password required')
    snippets=[]; nonempty=0
    for i in range(len(doc)):
        txt=doc[i].get_text()
        nonempty+=bool(txt.strip())
        if i<35 or i==len(doc)-1: snippets.append(f'\n=== PDF PAGE {i+1} ===\n'+txt)
    dest=ROOT/'_inspection'/extract_name
    dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_text(''.join(snippets),encoding='utf-8')
    return dict(bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest(),pages=len(doc),text_pages=nonempty,metadata=doc.metadata,inspection=str(dest))

def fetch(pair):
    name,url=pair; path=ROOT/name
    result=dict(file=name,url=url,checked_on='2026-09-13')
    try:
        path.parent.mkdir(parents=True,exist_ok=True)
        req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
        with urllib.request.urlopen(req,timeout=50) as res:
            data=res.read();result['resolved_url']=res.url;result['content_type']=res.headers.get('Content-Type')
        if b'%PDF-' not in data[:1024]:raise ValueError('Response is not PDF')
        path.write_bytes(data)
        result.update(inspect(path,path.stem+'.txt'));result['status']='downloaded_valid_pdf'
    except Exception as exc:result.update(status='failed',error=str(exc))
    print(json.dumps(result,ensure_ascii=False),flush=True)
    return result

if __name__=='__main__':
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool: records=list(pool.map(fetch,SOURCES))
    (ROOT/'download_manifest.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
    local=[]
    for p in sorted(Path('D:/A320').rglob('*.pdf')):
        rec={'path':str(p)}
        try: rec.update(inspect(p,'LOCAL_'+p.stem+'.txt'));rec['status']='valid_pdf'
        except Exception as exc:rec.update(status='failed',error=str(exc))
        local.append(rec);print(json.dumps(rec,ensure_ascii=False),flush=True)
    (ROOT/'local_inventory.json').write_text(json.dumps(local,ensure_ascii=False,indent=2),encoding='utf-8')
