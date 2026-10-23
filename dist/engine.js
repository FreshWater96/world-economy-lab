/* Atlas research sandbox. Monetary amounts in billions of baseline-year USD.
   Quarterly rates are derived from annual percentages; shocks are deviations. */
export const SECTORS=['Agriculture','Energy','Manufacturing','Infrastructure','Technology','Services'];
export const COLORS=['#bdd382','#ecc774','#67b8ca','#a497d8','#7bc7a5','#849dba'];
export const COORDS={USA:[-98,38],CHN:[104,35],DEU:[10,51],JPN:[138,36],IND:[79,22],GBR:[-2,54],FRA:[2,47],ITA:[12,42],BRA:[-52,-10],CAN:[-106,57],RUS:[96,61],KOR:[128,36],AUS:[134,-25],ESP:[-4,40],MEX:[-102,24],IDN:[118,-3],TUR:[35,39],NLD:[5,52],SAU:[45,24],CHE:[8,47],POL:[19,52],ARG:[-64,-35],SWE:[16,62],BEL:[4,50],NOR:[10,65],ARE:[54,24],ZAF:[25,-29],NGA:[8,9],EGY:[30,27],VNM:[107,16],THA:[101,15],MYS:[103,4],SGP:[104,1],BGD:[90,24],PAK:[69,30],ROW:[-25,-27]};
export const DEFAULT={target:'ALL',fiscal:0,rate:0,tariff:0,energy:0,supply:0,carbon:0,climate:0,confidence:0,duration:8,horizon:20,seed:42,elasticity:1};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function random(seed){let s=seed>>>0;return()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return s/4294967296;};}
const seedIO=[ [.14,.01,.07,.01,.002,.018],[.04,.14,.065,.045,.013,.024],[.055,.065,.18,.17,.045,.05],[.015,.035,.025,.075,.012,.023],[.006,.012,.015,.012,.10,.04],[.07,.075,.075,.085,.13,.14] ];
export function prepare(raw){
 const missing=[];const cs=raw.countries.filter(c=>c.gdp>0).map(c=>{
  const val=(k,v)=>{if(c[k]==null){missing.push(`${c.code}: ${k}`);return v;}return c[k];};
  const agr=val('agriculture',3),man=val('manufacturing',16),ind=Math.max(man,val('industry',25)),srv=val('services',62),other=ind-man;
  const shares=[agr,other*.5,man,other*.5,srv*.16,srv*.84].map(x=>Math.max(x,.3));const sum=shares.reduce((a,b)=>a+b,0);
  return {...c,gdp:c.gdp/1e9,population:val('population',1e6),growth:val('growth',2.5),inflation:val('inflation',3),unemployment:val('unemployment',5),exports:val('exports',25),imports:val('imports',25),shares:shares.map(x=>x/sum),rate:Math.max(1,val('inflation',3)*.65+1.5),debt:60,coords:COORDS[c.code]};
 });
 const wg=raw.world.gdp/1e9,known=cs.reduce((a,c)=>a+c.gdp,0),pop=raw.world.population-cs.reduce((a,c)=>a+c.population,0);
 cs.push({code:'ROW',name:'Rest of world',gdp:Math.max(1,wg-known),population:Math.max(1,pop),growth:raw.world.growth??2.8,inflation:raw.world.inflation??4,unemployment:raw.world.unemployment??5,exports:30,imports:30,shares:[.07,.09,.18,.07,.08,.51],rate:5,debt:60,coords:COORDS.ROW,sources:{},residual:true});
 const n=cs.length,N=n*6,A=Array.from({length:N},()=>new Float64Array(N)),weights=Array.from({length:n},()=>new Float64Array(n));
 for(let c=0;c<n;c++){
  let sum=0;for(let p=0;p<n;p++)if(c!==p){const dx=cs[c].coords[0]-cs[p].coords[0],dy=cs[c].coords[1]-cs[p].coords[1],dist=Math.sqrt(dx*dx+dy*dy);weights[c][p]=Math.pow(cs[p].gdp,.7)/(1+dist/30);sum+=weights[c][p];}
  for(let p=0;p<n;p++)weights[c][p]/=sum;
  for(let j=0;j<6;j++)for(let i=0;i<6;i++){
   const m=clamp(cs[c].imports/100*.5,.06,.4)*(i===5?.3:1);
   for(let p=0;p<n;p++)A[p*6+i][c*6+j]=seedIO[i][j]*(p===c?1-m:m*weights[c][p]);
  }
 }
 // Calibrate positive final demand without treating gross output as GDP.
 let va=new Float64Array(N),x0=new Float64Array(N);
 for(let it=0;it<20;it++){
  for(let j=0;j<N;j++){let col=0;for(let i=0;i<N;i++)col+=A[i][j];va[j]=1-col;x0[j]=cs[Math.floor(j/6)].gdp*cs[Math.floor(j/6)].shares[j%6]/va[j];}
  for(let i=0;i<N;i++){let z=0;for(let j=0;j<N;j++)z+=A[i][j]*x0[j];if(z>x0[i]*.85){const f=x0[i]*.85/z;for(let j=0;j<N;j++)A[i][j]*=f;}}
 }
 for(let j=0;j<N;j++){let col=0;for(let i=0;i<N;i++)col+=A[i][j];va[j]=1-col;x0[j]=cs[Math.floor(j/6)].gdp*cs[Math.floor(j/6)].shares[j%6]/va[j];}
 const d0=new Float64Array(N);for(let i=0;i<N;i++){let z=0;for(let j=0;j<N;j++)z+=A[i][j]*x0[j];d0[i]=x0[i]-z;}
 const links=[];for(let a=0;a<n;a++)for(let b=0;b<n;b++)if(a!==b){let z=0;for(let i=0;i<6;i++)for(let j=0;j<6;j++)z+=A[a*6+i][b*6+j]*x0[b*6+j];links.push({from:a,to:b,value:z});}
 return {countries:cs,A,va,x0,d0,weights,links:links.sort((a,b)=>b.value-a.value),missing,N,year:raw.baselineYear,raw};
}
export function solve(A,d,tolerance=1e-10){
 let x=Float64Array.from(d),residual=1,iterations=0;const N=d.length;
 for(;iterations<140&&residual>tolerance;iterations++){
  const nx=new Float64Array(N);residual=0;
  for(let i=0;i<N;i++){let v=d[i];for(let j=0;j<N;j++)v+=A[i][j]*x[j];nx[i]=v;residual=Math.max(residual,Math.abs(v-x[i])/Math.max(1,Math.abs(v)));}x=nx;
 }
 return {x,residual,iterations};
}
function agents(model,seed){const rng=random(seed),out=[];
 model.countries.forEach((c,ci)=>{for(let a=0;a<64;a++){
  const type=a<36?'Household':a<60?'Firm':'Bank',sector=(a-36+24)%6;
  out.push({id:`${c.code}-${type[0]}${String(a+1).padStart(3,'0')}`,country:ci,type,sector,mpc:.5+rng()*.35,savings:3+rng()*9,inventory:.7+rng()*.6,price:1,credit:1,leverage:2+rng()*6,risk:.01+rng()*.035,demand:1,stress:0});
 }});return out;}
function aggregate(model,states,x,d,quarter,residual,iterations){
 const total=states.reduce((s,c)=>s+c.gdp,0),mean=k=>states.reduce((s,c)=>s+c[k]*c.gdp,0)/total;
 let gross=0,va=0,final=0;for(let i=0;i<x.length;i++){gross+=x[i];va+=x[i]*model.va[i];final+=d[i];}
 return {quarter,gdp:total,growth:mean('growth'),inflation:mean('inflation'),unemployment:mean('unemployment'),rate:mean('rate'),risk:mean('risk'),trade:states.reduce((s,c)=>s+c.exportsValue,0),states:states.map(c=>({...c,sectors:[...c.sectors]})),grossOutput:gross,ioValueAdded:va,finalDemand:final,accountingError:Math.abs(va-final)/Math.max(final,1),residual,iterations};
}
export function simulate(model,options={},onFrame=null){
 const p={...DEFAULT,...options},elasticity=p.elasticity,cs=model.countries,N=model.N,aa=agents(model,p.seed),state=cs.map(c=>({...c,gdp:c.gdp,growth:c.growth,rate:c.rate,inflation:c.inflation,unemployment:c.unemployment,fx:100,debt:60,risk:.025,exportsValue:0,sectors:c.shares.map(s=>s*c.gdp),capacity:1,trend:1}));
 const treatment=cs.map(c=>p.target==='ALL'?c.gdp/cs.reduce((s,v)=>s+v.gdp,0):c.code===p.target?1:0),affected=cs.map(c=>p.target==='ALL'||c.code===p.target),frames=[];
 const foreign=cs.map((c,ci)=>{let out=0;for(let j=0;j<N;j++)if(Math.floor(j/6)!==ci)for(let s=0;s<6;s++)out+=model.A[ci*6+s][j]*model.x0[j];return out;});
 state.forEach((c,i)=>c.exportsValue=foreign[i]);frames.push(aggregate(model,state,model.x0,model.d0,0,0,0));
 const totalBase=cs.reduce((s,c)=>s+c.gdp,0);let impulse=0;
 for(let q=1;q<=p.horizon;q++){
  const active=q<=p.duration?1:0,house=cs.map(()=>0),firm=cs.map(()=>0),bank=cs.map(()=>0);
  for(const a of aa){const c=state[a.country],b=cs[a.country],local=affected[a.country]?active:0,gap=(c.gdp/(b.gdp*c.trend)-1),inflDiff=(c.inflation-b.inflation)/100;
   if(a.type==='Household'){
    const incomeShock=gap-(c.unemployment-b.unemployment)/100;
    a.demand=clamp(1+a.mpc*incomeShock-.22*inflDiff-.0012*p.rate*local*elasticity+.001*p.confidence*local,.5,1.4);
    a.savings=clamp(a.savings+(1-a.mpc)*incomeShock-.04*inflDiff,0,20);house[a.country]+=(a.demand-1)/36;
   }else if(a.type==='Firm'){
    const cost=(p.energy*.001*(a.sector===1?.3:a.sector===2?1:.4)+p.tariff*.0015+p.carbon*.00003)*local;
    a.price=clamp(a.price*.96+(1+cost)*.04,.7,2);
    a.inventory=clamp(a.inventory*.92+(1-.5*gap)*.08,.1,2);
    a.credit=clamp(1-.025*(c.rate-b.rate)*elasticity-.35*c.risk+.00875,.3,1.3);
    a.demand=clamp(1+.3*gap-cost*.7+.15*(a.credit-1),.4,1.6);firm[a.country]+=(a.demand-1)/24;
   }else{
    a.stress=clamp(-gap*.45+(c.unemployment-b.unemployment)*.002+Math.max(0,c.rate-b.rate)*.003,0,.4);
    a.risk=clamp(.025+a.stress*a.leverage*.12,.005,.5);bank[a.country]+=a.risk/4;
   }
  }
  const demand=new Float64Array(N);const cp=[];
  const trends=cs.map(b=>Math.pow(1+clamp(b.growth,-10,15)/100,q/4));
  const trendDemand=new Float64Array(N);
  for(let i=0;i<N;i++){let inputs=0;for(let j=0;j<N;j++)inputs+=model.A[i][j]*model.x0[j]*trends[Math.floor(j/6)];trendDemand[i]=model.x0[i]*trends[Math.floor(i/6)]-inputs;}
  for(let ci=0;ci<cs.length;ci++){
   const b=cs[ci],c=state[ci],local=affected[ci]?active:0;
   c.trend=trends[ci];
   const tradeSpill=cs.reduce((s,v,j)=>s+model.weights[ci][j]*(affected[j]?active:0),0);
   const drag=elasticity*(local*(p.tariff*.0009+p.rate*.0018+p.energy*.00042+p.carbon*.000012+p.climate*.008+p.supply*.004)-local*p.confidence*.00065+tradeSpill*(p.tariff*.0004+p.supply*.0004));
   c.capacity=clamp(c.capacity+(q===1?p.fiscal*treatment[ci]/b.gdp*.08:0)-local*(p.supply*.0001+p.climate*.0002),.5,1.3);
   const adaptation=clamp(1-drag+.25*house[ci]+.2*firm[ci]-.3*(bank[ci]-.025),.4,1.6);
   const fiscal=q===1?p.fiscal*treatment[ci]*4:0; // One-off budget to annualized quarterly flow.
   const sectorAlloc=[.08,.15,.22,.30,.15,.10];
   for(let s=0;s<6;s++)demand[ci*6+s]=Math.max(.001,trendDemand[ci*6+s]*adaptation+fiscal*sectorAlloc[s]);
   cp.push({local,drag,bank:bank[ci],house:house[ci],capacity:c.capacity});
  }
  const sol=solve(model.A,demand),desired=sol.x;
  // Rationing reduces the final demand vector, then re-solves the IO ledger.
  // This closure preserves x = Ax + d; it is not a constrained CGE equilibrium.
  let ration=1;for(let ci=0;ci<cs.length;ci++)for(let s=0;s<6;s++){
   const cap=model.x0[ci*6+s]*state[ci].trend*(1.18+state[ci].capacity-1-cp[ci].local*p.supply*.008);
   ration=Math.min(ration,cap/desired[ci*6+s]);
  }
  ration=clamp(ration,.35,1);if(ration<1)for(let i=0;i<N;i++)demand[i]*=ration;
  const finalSol=ration<1?solve(model.A,demand):sol;const x=finalSol.x;
  for(let ci=0;ci<cs.length;ci++){
   const c=state[ci],b=cs[ci],old=c.gdp;c.gdp=0;for(let s=0;s<6;s++){c.sectors[s]=x[ci*6+s]*model.va[ci*6+s];c.gdp+=c.sectors[s];}
   const gap=(c.gdp/(b.gdp*c.trend)-1)*100;
   c.growth=(Math.pow(c.gdp/old,4)-1)*100;
   c.inflation=clamp(.7*c.inflation+.3*b.inflation+.14*gap+cp[ci].local*(p.energy*.028+p.tariff*.045+p.carbon*.0014)-cp[ci].local*p.rate*.065,-8,250);
   c.unemployment=clamp(b.unemployment-gap*.32,0,35);
   c.rate=clamp(b.rate+cp[ci].local*p.rate+.35*(c.inflation-b.inflation),-.5,200);
   c.risk=clamp(cp[ci].bank,.001,.5);
   c.fx=clamp(c.fx*(1-(c.inflation-b.inflation)*.001+(c.rate-b.rate)*.0008),40,180);
   c.debt=clamp(60+(q>=1?p.fiscal*treatment[ci]/b.gdp*100:0)-gap*.5,0,250);
   c.exportsValue=0;for(let j=0;j<N;j++)if(Math.floor(j/6)!==ci)for(let s=0;s<6;s++)c.exportsValue+=model.A[ci*6+s][j]*x[j];
  }
  impulse+=q===1?p.fiscal:0;const fr=aggregate(model,state,x,demand,q,finalSol.residual,finalSol.iterations);fr.rationing=ration;fr.injection=impulse;frames.push(fr);if(onFrame)onFrame(fr);
 }
 return {params:p,frames,agents:aa,model,seed:p.seed};
}
export function flow(model,p){
 const d=new Float64Array(model.N);const alloc=[.08,.15,.22,.30,.15,.10],total=model.countries.reduce((s,c)=>s+c.gdp,0);
 model.countries.forEach((c,i)=>{let share=p.target==='ALL'?c.gdp/total:c.code===p.target?1:0;for(let j=0;j<6;j++)d[i*6+j]=Math.max(0,p.fiscal)*share*alloc[j];});
 const x=solve(model.A,d).x;const sectors=SECTORS.map(()=>0),dest=SECTORS.map(()=>({wages:0,profits:0,tax:0,inputs:0}));
 for(let i=0;i<x.length;i++){const s=i%6;sectors[s]+=x[i];const v=x[i]*model.va[i];dest[s].wages+=v*.58;dest[s].profits+=v*.29;dest[s].tax+=v*.13;dest[s].inputs+=x[i]-v;}
 return {sectors,dest,totalGross:sectors.reduce((a,b)=>a+b,0),valueAdded:p.fiscal};
}
