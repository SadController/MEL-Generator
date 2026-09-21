"""Research index only; not an application catalogue or dispatch decision engine."""
from pathlib import Path
import json, re
import pymupdf

root = Path(__file__).parent
pdf = root.parent / 'sources_mel_mmel/00_current_mmel/FAA_A320_MMEL_Rev32_2025-07-30.pdf'
items = {}
for n, page in enumerate(pymupdf.open(pdf), 1):
    text = page.get_text()
    pm = re.search(r'PAGE NO\.\s*(\d{2}-\d+)', text)
    if not pm:
        continue
    lines = []
    for block in page.get_text('dict')['blocks']:
        for line in block.get('lines', []):
            s = ''.join(x['text'] for x in line['spans']).strip()
            x0,y0,x1,y1 = line['bbox']
            if s and y0 > 177:
                lines.append((x0,y0,x1,y1,s))
    starts = sorted([l for l in lines if l[0] < 110 and re.fullmatch(r'\d{2}-\d{2}-\d{2}',l[4])],key=lambda l:l[1])
    for i, start in enumerate(starts):
        ident, y, end = start[4], start[1], starts[i+1][1] if i+1<len(starts) else 1000
        region = [l for l in lines if y-.3 <= l[1] < end-.3]
        sub = [l[1] for l in region if l[0]<130 and re.fullmatch(r'\d+\)',l[4])]
        title = ' '.join(w[4] for w in page.get_text('words') if 130<w[0] and w[2]<271 and y-.3<=w[1]<min(sub,default=end)-.3)
        item = items.setdefault(ident, {'id':ident,'title':title,'pdf_pages':[],'printed_pages':[],'item_column':[],'text':[]})
        item['pdf_pages'].append(n)
        item['printed_pages'].append(pm[1])
        item['item_column'].append(' '.join(l[4] for l in sorted(region,key=lambda l:l[1]) if l[0]<270))
        item['text'].append('\n'.join(l[4] for l in sorted(region,key=lambda l:(round(l[1]),l[0]))))
for item in items.values():
    item['title'] = item['title'].replace('(Cont’d)', '').replace('(Cont’d.)','').strip()
    item['item_column'] = '\n'.join(item['item_column'])
    item['text'] = '\n\n'.join(item['text'])
(root/'mmel_item_index.json').write_text(json.dumps(list(items.values()),ensure_ascii=False,indent=2),encoding='utf-8')
(root/'mmel_item_index.txt').write_text('\n'.join(f"{i['id']} | {i['title']} | PDF {','.join(map(str,i['pdf_pages']))}" for i in items.values()),encoding='utf-8')
print(f'{len(items)} unique top-level sequence numbers; subitems are not separate records.')
