import json
from pathlib import Path
import pdfplumber
pages=[]
with pdfplumber.open('tmp/pdfs/square-guide.pdf') as p:
 for i,page in enumerate(p.pages):
  if i<22: pages.append(page.extract_text() or '');continue
  w,h=page.width,page.height
  pages.append((page.crop((35,75,w/2,h-40)).extract_text() or '')+'\n'+(page.crop((w/2,75,w-35,h-40)).extract_text() or ''))
Path('tmp/pdfs/square-pages.json').write_text(json.dumps(pages,ensure_ascii=False),encoding='utf8')
print('Extracted ordered columns',len(pages))
