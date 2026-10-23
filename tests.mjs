import assert from 'node:assert/strict';
import fs from 'node:fs';
import {prepare,simulate,solve,flow,DEFAULT} from './dist/engine.js';
const m=prepare(JSON.parse(fs.readFileSync('./dist/baseline.json','utf8'))),ref=simulate(m,DEFAULT);let count=0;
function check(label,f){f();count++;console.log('PASS',label);}
check('Every named GDP and the global residual reconcile with observed GDP',()=>{assert.equal(m.countries.length,36);assert.ok(Math.abs(ref.frames[0].gdp-m.raw.world.gdp/1e9)<1e-7);m.countries.forEach((c,i)=>assert.ok(Math.abs(c.gdp-ref.frames[0].states[i].gdp)<1e-8));});
check('Nonnegative IO coefficients, productive columns, and positive final demand',()=>{for(let j=0;j<m.N;j++){let sum=0;for(let i=0;i<m.N;i++){assert.ok(m.A[i][j]>=0);sum+=m.A[i][j];}assert.ok(sum<1);assert.ok(m.d0[j]>0);}});
check('Solver reproduces the calibrated starting output',()=>{const r=solve(m.A,m.d0);assert.ok(r.residual<1e-10);m.x0.forEach((x,i)=>assert.ok(Math.abs(x-r.x[i])/x<1e-8));});
check('No-shock run preserves all country growth trends',()=>{ref.frames.forEach(f=>f.states.forEach((c,i)=>{const expected=m.countries[i].gdp*Math.pow(1+m.countries[i].growth/100,f.quarter/4);assert.ok(Math.abs(c.gdp-expected)/expected<1e-7);assert.ok(Math.abs(c.inflation-m.countries[i].inflation)<1e-6);}));});
check('Same seed and shock produce identical trajectories and agent states',()=>{const a=simulate(m,{target:'IND',tariff:12,rate:2}),b=simulate(m,{target:'IND',tariff:12,rate:2});assert.deepEqual(a.frames,b.frames);assert.deepEqual(a.agents,b.agents);});
check('Monetary, energy and tariff shocks lower first-quarter world output',()=>{for(const p of [{rate:2},{energy:50},{tariff:20}])assert.ok(simulate(m,p).frames[1].gdp<ref.frames[1].gdp);});
check('$100M one-off fiscal injection adds $400M annualized first-quarter world GDP',()=>{const r=simulate(m,{target:'IND',fiscal:.1});assert.ok(Math.abs(r.frames[1].gdp-ref.frames[1].gdp-.4)<1e-6);assert.ok(r.frames[1].states.some(c=>c.code!=='IND'&&c.gdp>ref.frames[1].states.find(v=>v.code===c.code).gdp+1e-7));});
check('Capital-flow decomposition conserves budget without double-counting intermediates',()=>{const r=flow(m,{...DEFAULT,target:'IND',fiscal:.1}),va=r.dest.reduce((s,d)=>s+d.wages+d.profits+d.tax,0);assert.ok(Math.abs(va-.1)<1e-8);assert.ok(r.totalGross>.1);});
check('All stressed 10-year runs remain finite, positive, converged and accounting-consistent',()=>{for(const p of [{tariff:40,supply:40,energy:100,rate:5,climate:10,confidence:-30,carbon:200},{target:'SGP',fiscal:1000},{rate:-3,energy:-40,confidence:30},{target:'USA',supply:40},{target:'IND',climate:10}]){const r=simulate(m,{...p,horizon:40,duration:20});r.frames.forEach(f=>{assert.ok(f.accountingError<1e-8);assert.ok(f.residual<1e-10);f.states.forEach(c=>{for(const k of ['gdp','inflation','growth','unemployment','rate','debt','fx','risk'])assert.ok(Number.isFinite(c[k]));assert.ok(c.gdp>0);assert.ok(c.unemployment>=0);});});}});
check('Different seeds alter heterogeneous propensities',()=>{const a=simulate(m,{seed:1}),b=simulate(m,{seed:2});assert.notEqual(a.agents[0].mpc,b.agents[0].mpc);});
console.log(`${count} numerical checks passed.`);
