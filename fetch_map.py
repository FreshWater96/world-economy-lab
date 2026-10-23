import urllib.request,json
from pathlib import Path
u='https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson'
g=json.load(urllib.request.urlopen(u,timeout=60))
def simplify(points,eps=.25):
 if len(points)<5:return points
 a,b=points[0],points[-1];dx,dy=b[0]-a[0],b[1]-a[1];den=dx*dx+dy*dy;ds=[]
 for p in points[1:-1]:
  t=max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/den)) if den else 0
  ds.append((p[0]-a[0]-t*dx)**2+(p[1]-a[1]-t*dy)**2)
 m=max(ds);idx=ds.index(m)+1
 if m>eps*eps:return simplify(points[:idx+1],eps)[:-1]+simplify(points[idx:],eps)
 return [a,b]
def ring(r):
 s=simplify(r)
 return s if len(s)>=4 else r[::max(1,len(r)//6)][:-1]+[r[-1]]
features=[]
for f in g['features']:
 p=f['properties'];geom=f['geometry'];coords=geom['coordinates']
 if geom['type']=='Polygon':coords=[ring(r) for r in coords]
 elif geom['type']=='MultiPolygon':coords=[[ring(r) for r in poly] for poly in coords]
 features.append({'type':'Feature','properties':{'name':p.get('name'),'code':p.get('ISO3166-1-Alpha-3')},'geometry':{'type':geom['type'],'coordinates':coords}})
Path('/workspace/sites/world-economy-lab/dist/world.json').write_text(json.dumps({'type':'FeatureCollection','features':features},separators=(',',':')))
print('Saved',len(features),'Natural Earth map features')
b=json.load(open('/workspace/sites/world-economy-lab/dist/baseline.json'));print('World GDP trillions',b['world']['gdp']/1e12,'economies',len(b['countries']));print('Missing',[(c['code'],k) for c in b['countries'] for k in ['gdp','growth','inflation','unemployment','agriculture','industry','services'] if c.get(k) is None])
