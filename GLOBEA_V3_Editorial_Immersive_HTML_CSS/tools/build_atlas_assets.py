"""Freeze Natural Earth geography as a compact, offline SVG path catalogue."""
from pathlib import Path
import urllib.request, json, math

ROOT=Path(__file__).resolve().parents[1]/'GLOBEA_v3'
URL='https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson'

def download(url):
    return urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'GLOBEA-Editorial/1.0 (local map asset preparation)'}),timeout=90).read()

def project(p):
    lon,lat=p[:2]
    return [round(55+(lon-101.3)*58.5*.96,2),round(36+(24-lat)*58.5,2)]

def simplify(points,tolerance):
    if len(points)<4:return points
    a,b=points[0],points[-1]
    # A closed ring needs two open halves for Douglas-Peucker.
    if a==b:
        middle=len(points)//2
        return simplify(points[:middle+1],tolerance)[:-1]+simplify(points[middle:],tolerance)
    dx,dy=b[0]-a[0],b[1]-a[1]
    denominator=dx*dx+dy*dy
    largest,index=0,0
    for i,p in enumerate(points[1:-1],1):
        t=max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/denominator)) if denominator else 0
        distance=(p[0]-a[0]-t*dx)**2+(p[1]-a[1]-t*dy)**2
        if distance>largest:largest,index=distance,i
    if largest>tolerance*tolerance:
        return simplify(points[:index+1],tolerance)[:-1]+simplify(points[index:],tolerance)
    return [a,b]

def clip(ring):
    points=[p[:2] for p in ring]
    for axis,value,sign in [(0,100,1),(0,118.5,-1),(1,6.7,1),(1,24.8,-1)]:
        if not points:return []
        result=[]
        previous=points[-1]
        for current in points:
            pin=(previous[axis]-value)*sign>=0
            cin=(current[axis]-value)*sign>=0
            if pin!=cin:
                t=(value-previous[axis])/(current[axis]-previous[axis])
                result.append([previous[0]+t*(current[0]-previous[0]),previous[1]+t*(current[1]-previous[1])])
            if cin:result.append(current)
            previous=current
        points=result
    if points and points[0]!=points[-1]:points.append(points[0])
    return points

def paths(geometry,tolerance):
    polygons=geometry['coordinates'] if geometry['type']=='MultiPolygon' else [geometry['coordinates']]
    output=[];vertices=0
    for polygon in polygons:
        for ring in polygon:
            points=clip(ring)
            if len(points)<4:continue
            points=simplify(points,tolerance)
            if len(points)<4:continue
            points=[project(p) for p in points]
            output.append('M'+'L'.join(f'{x:g},{y:g}' for x,y in points)+'Z')
            vertices+=len(points)
    return ''.join(output),vertices

if __name__=='__main__':
    source=json.loads(download(URL))
    mainland=None;context=[];counts={}
    for feature in source['features']:
        prop=feature['properties'];name=prop.get('ADMIN',prop.get('NAME'))
        if name=='Vietnam':
            mainland,n=paths(feature['geometry'],.003)
            counts[name]=n
        elif name in ['Laos','Cambodia','Thailand','China']:
            value,n=paths(feature['geometry'],.025)
            context.append({'name':name,'path':value});counts[name]=n
    if not mainland:raise RuntimeError('Vietnam geometry not found')
    data={'land':mainland,'context':context,'projection':{'west':101.3,'north':24,'x':55,'y':36,'scale':58.5,'cosine':.96},'source':URL}
    (ROOT/'atlas-geography.js').write_text('/* Natural Earth 1:10m, public domain. Projection and simplification for display only. */\nwindow.GLOBEA_ATLAS_GEOGRAPHY='+json.dumps(data,separators=(',',':'))+';\n',encoding='utf-8')
    (ROOT/'assets'/'atlas-sources.json').write_text(json.dumps({'geometry':{'name':'Natural Earth 1:10m Admin 0 Countries','url':URL,'license':'Public domain','license_url':'https://www.naturalearthdata.com/about/terms-of-use/','processed_vertices':counts},'island_reference':'https://mofa.gov.vn/web/ministry-of-foreign-affairs/detail/chi-tiet/undeniable-history-hoang-sa-truong-sa-have-always-been-sacred-territories-of-viet-nam--39.html','note':'Tourism illustration. Island markers are enlarged for legibility. No maritime boundaries are drawn.'},ensure_ascii=False,indent=2),encoding='utf-8')
    print('Offline geography ready:',counts)
