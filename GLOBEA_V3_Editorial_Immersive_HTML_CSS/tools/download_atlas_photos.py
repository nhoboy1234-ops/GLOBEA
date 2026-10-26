from pathlib import Path
import urllib.request, urllib.parse, json, re, html

root=Path(__file__).resolve().parents[1]/'GLOBEA_v3'/'assets'
files=[('hoang-sa','ISS006-E-23423 - View of the Paracel Islands.jpg'),('truong-sa','Truong Sa lon.JPG')]
def get(url):
    return urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'GlobeaTravel/1.0 (educational local website; image attribution retained)'}),timeout=40).read()
records=[]
for name,title in files:
    api='https://commons.wikimedia.org/w/api.php?'+urllib.parse.urlencode({'action':'query','format':'json','prop':'imageinfo','iiprop':'url|extmetadata','titles':'File:'+title})
    info=next(iter(json.loads(get(api))['query']['pages'].values()))['imageinfo'][0]
    data=get(info['url'])
    target=root/(name+'.jpg')
    target.write_bytes(data)
    meta=info['extmetadata']
    clean=lambda key:html.unescape(re.sub('<[^>]+>','',meta.get(key,{}).get('value',''))).strip()
    records.append({'file':target.name,'source':info['descriptionurl'],'original':info['url'],'author':clean('Artist'),'license':clean('LicenseShortName'),'license_url':clean('LicenseUrl'),'description':clean('ImageDescription'),'modification':'Display resized/cropped by CSS; original image retained.'})
    print(target.name,len(data),clean('LicenseShortName'),flush=True)
(root/'atlas-photo-credits.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
