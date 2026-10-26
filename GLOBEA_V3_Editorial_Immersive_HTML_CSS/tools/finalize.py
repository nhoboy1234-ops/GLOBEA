from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]/'GLOBEA_v3'
for page in (root/'original-v3').glob('*.html'):
    s=page.read_text(encoding='utf-8').replace('src="assets/','src="../assets/')
    page.write_text(s,encoding='utf-8')
(root/'README.txt').write_text('GLOBEA - VIETNAM EDITION\n\nMo index.html de xem ngay (khong can mang cho anh/font va planner).\nHoac nhap dup START-GLOBEA.cmd de chay local server tai http://127.0.0.1:8080.\n\nHuong dan day du: README.md\nMa nguon cu: original-v3/\nAnh chup va bao cao kiem tra: qa/\n',encoding='utf-8')
ledger=root/'assets'/'photo-credits.json'
records=json.loads(ledger.read_text(encoding='utf-8'))
for record in records:
    record['bytes']=(root/'assets'/record['file']).stat().st_size
    record['responsive_widths']=[700,1200,2200]
ledger.write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
print('Documentation, archive paths and image ledger finalized.')
