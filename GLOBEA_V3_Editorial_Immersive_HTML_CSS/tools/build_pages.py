from pathlib import Path

root = Path(__file__).resolve().parents[1] / 'GLOBEA_v3'
pages = {
    'index': ('home', '', 'GLOBEA — Khám phá Việt Nam theo cách của bạn', 'Tám miền đất, vô vàn cảm hứng. Khám phá Việt Nam qua những câu chuyện bản địa và thiết kế hành trình của riêng bạn.'),
    'vietnam': ('vietnam', '', 'Việt Nam — Một đất nước, vạn điều để thương | GLOBEA', 'Cẩm nang khám phá ba miền Việt Nam: thiên nhiên, văn hóa, ẩm thực và những hành trình đáng nhớ.'),
    'nguon': ('sources', '', 'Nguồn & hình ảnh | GLOBEA', 'Nguồn biên tập, giấy phép hình ảnh và thông tin về dự án GLOBEA.'),
}
for slug, name in [('hoi-an','Hội An'),('ha-noi','Hà Nội'),('da-lat','Đà Lạt'),('ha-long','Hạ Long'),('ninh-binh','Ninh Bình'),('hue','Huế'),('ho-chi-minh','TP. Hồ Chí Minh'),('phu-quoc','Phú Quốc')]:
    pages[slug] = ('destination', slug, f'{name} — Câu chuyện, trải nghiệm & hành trình | GLOBEA', f'Khám phá {name} qua văn hóa, ẩm thực, những điểm dừng đáng nhớ và lịch trình theo sở thích của bạn.')
for slug, (page, destination, title, description) in pages.items():
    atlas_style = '<link rel="stylesheet" href="atlas.css">' if page=='home' else ''
    atlas_scripts = '<script src="atlas-geography.js" defer></script>\n  <script src="atlas.js" defer></script>' if page in ('home','sources') else ''
    html = f'''<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#263f36">
  <meta name="description" content="{description}">
  <title>{title}</title>
  <link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="globea.css">
  <link rel="stylesheet" href="motion.css">
  {atlas_style}
  <script src="data.js" defer></script>
  <script src="app.js" defer></script>
  {atlas_scripts}
  <script src="motion.js" defer></script>
</head>
<body data-page="{page}" data-destination="{destination}">
  <main id="main" tabindex="-1"></main>
  <noscript><div style="padding:80px 24px;max-width:700px;margin:auto"><h1>GLOBEA · Việt Nam</h1><p>Bật JavaScript để khám phá điểm đến và thiết kế hành trình. Website hoạt động trực tiếp trên trình duyệt, không cần tài khoản.</p><p>Explore the World, Your Way.</p></div></noscript>
</body>
</html>
'''
    (root / f'{slug}.html').write_text(html, encoding='utf-8')
print(f'Built {len(pages)} HTML entry points.')
