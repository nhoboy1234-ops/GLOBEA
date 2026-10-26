from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import urllib.request, json, re

ROOT = Path(__file__).resolve().parents[1] / 'GLOBEA_v3' / 'assets'
PHOTOS = {
    'ninh-binh': (30280829, 'Aerial View of River and Lush Landscape, Ninh Bình'),
    'dalat-mist': (30317696, 'Misty Morning Landscape in Đà Lạt, Vietnam'),
    'dalat-pines': (36720811, 'Scenic Pine Forest in Dalat, Vietnam'),
    'hoian-river': (33501218, 'Aerial View of Lanterns on Hội An River'),
    'hoian-street': (14022164, 'People on a City Street, Hội An'),
    'hoian-alley': (26087000, 'Yellow Buildings and Narrow Street in Town, Hội An'),
    'hanoi-lake': (20498719, 'Waterfront of Hanoi from the Sword Lake'),
    'hanoi-bridge': (36399804, 'Picturesque Bridge and Temple Reflection in Hanoi'),
    'hanoi-quiet': (29827506, 'Tranquil Moment by the Lake in Hanoi Park'),
    'hue-citadel': (13971217, 'Hue Imperial Citadel'),
    'halong-bay': (6876808, 'Landscape of the Ha Long Bay in Vietnam'),
    'halong-boats': (6876855, 'Boats Moored in the Ha Long Bay in Vietnam'),
    'phuquoc-beach': (4603354, 'Green Palm Trees Near Sea, Phu Quoc'),
    'saigon-skyline': (18099746, 'Skyscrapers in Ho Chi Minh under Clouds'),
}

def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    return urllib.request.urlopen(req, timeout=45).read()

def photo(item):
    name, (pid, title) = item
    url = f'https://images.pexels.com/photos/{pid}/pexels-photo-{pid}.jpeg?auto=compress&cs=tinysrgb&w=2200&q=85'
    target = ROOT / f'{name}.jpg'
    data = target.read_bytes() if target.exists() else get(url)
    if len(data) < 5000 or data[:2] != b'\xff\xd8':
        raise ValueError(f'Invalid image: {name}')
    target.write_bytes(data)
    return {'file': target.name, 'title': title, 'source': f'https://www.pexels.com/photo/{pid}/', 'license': 'https://www.pexels.com/license/', 'bytes': len(data)}

if __name__ == '__main__':
    ROOT.mkdir(exist_ok=True)
    records = []
    with ThreadPoolExecutor(max_workers=5) as pool:
        for result in pool.map(photo, PHOTOS.items()):
            records.append(result)
            print(result['file'], result['bytes'], flush=True)
    (ROOT / 'photo-credits.json').write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding='utf-8')
    fonts = ROOT / 'fonts'
    fonts.mkdir(exist_ok=True)
    css = get('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Manrope:wght@400;500;600;700&display=swap').decode()
    for i, url in enumerate(dict.fromkeys(re.findall(r'url\((https[^)]+)\)', css))):
        ext = '.woff2' if '.woff2' in url else '.ttf'
        filename = f'font-{i}{ext}'
        (fonts / filename).write_bytes(get(url))
        css = css.replace(url, filename)
    (fonts / 'fonts.css').write_text(css, encoding='utf-8')
    for name, url in {
        'InstrumentSerif-OFL.txt': 'https://raw.githubusercontent.com/google/fonts/main/ofl/instrumentserif/OFL.txt',
        'Manrope-OFL.txt': 'https://raw.githubusercontent.com/google/fonts/main/ofl/manrope/OFL.txt',
    }.items():
        (fonts / name).write_bytes(get(url))
    print('Photos and fonts downloaded.')
