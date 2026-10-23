import urllib.request,json,concurrent.futures,time
from pathlib import Path
ROOT=Path(__file__).parent/'dist'
codes='USA CHN DEU JPN IND GBR FRA ITA BRA CAN RUS KOR AUS ESP MEX IDN TUR NLD SAU CHE POL ARG SWE BEL NOR ARE ZAF NGA EGY VNM THA MYS SGP BGD PAK'.split()
ind={'gdp':'NY.GDP.MKTP.CD','growth':'NY.GDP.MKTP.KD.ZG','inflation':'FP.CPI.TOTL.ZG','unemployment':'SL.UEM.TOTL.ZS','population':'SP.POP.TOTL','exports':'NE.EXP.GNFS.ZS','imports':'NE.IMP.GNFS.ZS','agriculture':'NV.AGR.TOTL.ZS','industry':'NV.IND.TOTL.ZS','manufacturing':'NV.IND.MANF.ZS','services':'NV.SRV.TOTL.ZS','investment':'NE.GDI.FTOT.ZS','consumption':'NE.CON.PRVT.ZS','government':'NE.CON.GOVT.ZS'}
data={c:{'code':c,'sources':{}} for c in codes+['WLD']}
def get(pair):
 k,i=pair; u=f'https://api.worldbank.org/v2/country/{";".join(codes+["WLD"])}/indicator/{i}?date=2023&format=json&per_page=100'
 for n in range(3):
  try:
   r=json.load(urllib.request.urlopen(u,timeout=50)); return k,i,r[1],r[0].get('lastupdated')
  except Exception as e:
   if n==2:return k,i,[],str(e)
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
 for k,i,rows,updated in pool.map(get,ind.items()):
  for row in rows:
   c=row['countryiso3code']; data[c]['name']=row['country']['value']; data[c][k]=row['value'];data[c]['sources'][k]={'indicator':i,'year':2023,'value':row['value'],'updated':updated}
  print(k,len(rows),flush=True)
json.dump({'baselineYear':2023,'retrievedAt':'2026-10-13','source':'World Bank World Development Indicators','countries':[data[c] for c in codes],'world':data['WLD']},open(ROOT/'baseline.json','w'),separators=(',',':'))
print('Saved WDI baseline. Run fetch_map.py separately for geography.')
