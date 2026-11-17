import test from 'node:test';
import assert from 'node:assert/strict';
import server from '../server.ts';
import {cityMap,cityObstacles,insideObstacle} from '../peta-city.ts';
import {routePlan} from '../peta-routes.ts';

const base=(level=1,mode='relaxed')=>({id:'peta-saku',mode,level,seed:7,elapsed:0,finished:false,score:0});
const chooseRoles=(g:any,mapSlot=1)=>server.action(g,mapSlot,'role','map');
function step(g:any,input:any){g.elapsed+=1/60;server.tick(g,[input,{x:0,y:0,throttle:0,brake:0}],1/60);}
function pointAt(plan:ReturnType<typeof routePlan>,distance:number){
 const d=Math.max(0,Math.min(plan.length,distance));
 for(let i=1;i<plan.path.length;i++)if(plan.cumulative[i]>=d){const a=plan.path[i-1],b=plan.path[i],span=plan.cumulative[i]-plan.cumulative[i-1]||1,t=(d-plan.cumulative[i-1])/span;return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};}
 return plan.goal;
}
const angle=(a:number)=>Math.atan2(Math.sin(a),Math.cos(a));
/** Proyeksi yang tidak mundur ke cabang rute yang sudah dilalui (rute boleh berulang). */
function projectForward(plan:ReturnType<typeof routePlan>,x:number,z:number,progress:number){
 let best={distance:Infinity,s:progress};
 for(let i=1;i<plan.path.length;i++){
  if(plan.cumulative[i]<progress-12)continue;
  const a=plan.path[i-1],b=plan.path[i],dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz;
  const t=length<1e-9?0:Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/length));
  const distance=Math.hypot(x-(a.x+dx*t),z-(a.z+dz*t));
  if(distance<best.distance)best={distance,s:plan.cumulative[i-1]+Math.sqrt(length)*t};
 }
 return best;
}
function autopilot(g:any,plan:ReturnType<typeof routePlan>,limit=40000){
 for(let i=0;i<limit&&!g.finished;i++){
  const project=projectForward(plan,g.car.x,g.car.z,g.progress),remaining=plan.length-project.s,target=remaining<30?plan.goal:pointAt(plan,project.s+24);
  const desired=Math.atan2(target.x-g.car.x,target.z-g.car.z),delta=angle(desired-g.car.heading),speed=Math.abs(g.car.speed);
  const steer=Math.max(-1,Math.min(1,delta*2.4));
  const brake=remaining<30&&speed>3.4||speed>8&&Math.abs(delta)>1.25?1:0;
  const throttle=remaining<24&&speed<2.2||brake?0:1;
  step(g,{x:steer,y:0,throttle,brake});
 }
 return g;
}
test('peta-saku: payload pengemudi tidak memuat peta, rute, atau tujuan',()=>{
 const g=server.create(base(),{random:()=>.5});
 const payload=JSON.stringify(server.publicState(g));
 for(const forbidden of ['"city"','"plan"','"route"','"path"','"goal"','"roads"','"buildings"','"steps"'])assert.equal(payload.includes(forbidden),false,`payload memuat ${forbidden}`);
 assert.equal((server.publicState(g) as any).rolesLocked,false);
 assert.deepEqual(server.privateState(g,0),{});
 assert.deepEqual(server.privateState(g,1),{},'peta tidak boleh dikirim sebelum peran dikunci');
 chooseRoles(g,1);
 assert.deepEqual(server.privateState(g,0),{});
 const navigator=server.privateState(g,1) as any;
 assert.equal(navigator.role,'navigator');
 assert.ok(navigator.route.path.length>10);
 assert.ok(navigator.route.steps.length>20,`langkah ${navigator.route.steps.length}`);
});
test('peta-saku: tiga kota dapat diselesaikan dengan mengikuti rute',()=>{
 for(const level of [1,2,3]){
  const g=server.create(base(level),{random:()=>.5}),plan=routePlan(level-1);
  chooseRoles(g,1);
  autopilot(g,plan);
  assert.equal(g.finished,true,`level ${level} belum selesai`);
  assert.ok(g.elapsed>20,`level ${level} selesai terlalu cepat`);
  assert.equal(g.wrongTurns,0,`level ${level} keluar rute ${g.wrongTurns} kali`);
  const result=server.result(g);
  assert.ok(result.detail.includes('km'));
  assert.deepEqual(server.privateState(g,0),{});
 }
});
test('peta-saku: mobil menunggu sampai peran dipilih, lalu stick peta bisa ditukar',()=>{
 const g=server.create(base(),{random:()=>.5}),start={x:g.car.x,z:g.car.z};
 for(let i=0;i<120;i++)step(g,{x:0,y:0,throttle:1,brake:0});
 assert.equal(g.car.x,start.x,'mobil tidak boleh bergerak sebelum peran dipilih');
 assert.equal(g.car.z,start.z);
 assert.equal(g.elapsed,0,'waktu belum berjalan selama pemilihan peran');
 server.action(g,0,'role','map');
 const pub=server.publicState(g) as any;
 assert.equal(pub.rolesLocked,true);
 assert.equal(pub.navigatorSlot,0);
 assert.equal(pub.driverSlot,1);
 assert.ok((server.privateState(g,0) as any).route.path.length>10);
 assert.deepEqual(server.privateState(g,1),{});
 server.action(g,1,'role','map');
 assert.equal((server.publicState(g) as any).navigatorSlot,0,'pilihan kedua tidak boleh menimpa peran yang sudah dikunci');
 server.action(g,0,'pin',{x:20,z:40});
 assert.equal((server.publicState(g) as any).pinSet,true,'navigator slot 0 boleh memasang pin');
 server.action(g,1,'pin',{x:0,z:0});
 assert.deepEqual(g.pin,{x:20,z:40},'pengemudi slot 1 tidak boleh mengubah pin');
 g.car.x=180;g.car.z=180;
 server.action(g,0,'recover');
 assert.equal(g.recoveries,0,'navigator tidak boleh menarik mobil');
 server.action(g,1,'recover');
 assert.equal(g.recoveries,1,'pengemudi slot 1 boleh menarik mobil');
});
test('peta-saku: input gas dan kemudi mengikuti slot pengemudi yang dipilih',()=>{
 const g=server.create(base(),{random:()=>.5});chooseRoles(g,0);
 const start={x:g.car.x,z:g.car.z};
 for(let i=0;i<120;i++){g.elapsed+=1/60;server.tick(g,[{x:0,y:0,throttle:0,brake:1},{x:0,y:0,throttle:1,brake:0}],1/60);}
 assert.ok(Math.hypot(g.car.x-start.x,g.car.z-start.z)>1,'input dari slot pengemudi seharusnya menggerakkan mobil');
 assert.ok(g.elapsed>1);
});
test('peta-saku: salah belok dihitung tetapi ronde tidak berakhir',()=>{
 const g=server.create(base(),{random:()=>.5});chooseRoles(g,1);
 g.car.heading=0;
 for(let i=0;i<520;i++)step(g,{x:0,y:0,throttle:1,brake:0});
 assert.equal(g.finished,false);
 assert.ok(g.wrongTurns>=1,'perjalanan keluar rute seharusnya tercatat');
 assert.match(g.message,/memutar|rute/i);
});
test('peta-saku: pin hanya diterima navigator dan pengemudi hanya melihat arah',()=>{
 const g=server.create(base(),{random:()=>.5});chooseRoles(g,1);
 server.action(g,0,'pin',{x:0,z:0});
 assert.equal(g.pin,null,'pengemudi tidak boleh memasang pin');
 server.action(g,1,'pin',{x:20,z:40});
 const pub:any=server.publicState(g);
 assert.equal(pub.pinSet,true);
 assert.equal(typeof pub.pinBearing,'number');
 assert.equal(typeof pub.pinDistance,'number');
 assert.equal('pin' in pub,false);
 assert.equal(JSON.stringify(pub).includes('"pin":{'),false);
 assert.deepEqual(server.privateState(g,0),{});
 const nav:any=server.privateState(g,1);
 assert.deepEqual(nav.pin,{x:20,z:40});
 server.action(g,1,'clear-pin');
 assert.equal((server.publicState(g) as any).pinSet,false);
});
test('peta-saku: derek mengembalikan mobil ke jalan terdekat',()=>{
 const g=server.create(base(),{random:()=>.5});chooseRoles(g,1);
 g.car.x=180;g.car.z=180;
 server.action(g,0,'recover');
 const pub:any=server.publicState(g);
 assert.equal(g.recoveries,1);
 assert.ok(Math.abs(g.car.x)<260&&Math.abs(g.car.z)<260);
 assert.ok(Number.isFinite(pub.car.x));
 server.action(g,0,'recover');
 assert.equal(g.recoveries,1,'derek memiliki jeda');
});
test('peta-saku: tantangan memakai bahan bakar, mode santai tidak',()=>{
 const challenge=server.create(base(1,'challenge'),{random:()=>.5});
 const relaxed=server.create(base(1,'relaxed'),{random:()=>.5});
 chooseRoles(challenge,1);chooseRoles(relaxed,1);
 for(let i=0;i<120;i++){step(challenge,{x:0,y:0,throttle:1,brake:0});step(relaxed,{x:0,y:0,throttle:1,brake:0});}
 assert.ok((server.publicState(challenge) as any).fuel<100);
 assert.equal((server.publicState(relaxed) as any).fuel,100);
 assert.equal((server.publicState(relaxed) as any).challenge,false);
 assert.ok((server.publicState(challenge) as any).targetTime>=240);
});
test('peta-saku: jaringan jalan tidak memiliki jalan buntu permanen',()=>{
 const goals=['n6_6','s','f'];
 for(let level=1;level<=3;level++){
  const city=cityMap(level),links=new Map<string,Set<string>>(),roadsAt=new Map<string,number>();
  for(const node of Object.keys(city.nodes)){links.set(node,new Set());roadsAt.set(node,0);}
  for(const road of city.roads){
   const here=new Set<string>();
   for(const [id,node] of Object.entries(city.nodes))if(road.points.some(point=>Math.hypot(point.x-node.x,point.z-node.z)<1e-6))here.add(id);
   for(const id of here)roadsAt.set(id,(roadsAt.get(id)||0)+1);
   for(let i=0;i<road.points.length;i++)for(const offset of [-1,1]){
    const other=road.points[i+offset];if(!other)continue;
    for(const [id,node] of Object.entries(city.nodes))if(Math.hypot(other.x-node.x,other.z-node.z)<1e-6)for(const from of here)if(Math.hypot(road.points[i].x-city.nodes[from].x,road.points[i].z-city.nodes[from].z)<1e-6)links.get(from)!.add(id);
   }
  }
  for(const [id,set] of links)assert.ok(set.size>=2||(roadsAt.get(id)||0)>=2||id===goals[level-1],`${city.title}: ${id} hanya punya ${set.size} sambungan`);
 }
});
test('peta-saku: mobil dan kamera mulai di luar gedung dan landmark',()=>{
 for(const level of [1,2,3]){
  const g=server.create(base(level),{random:()=>.5}),obstacles=cityObstacles(cityMap(level));
  const forward={x:Math.sin(g.car.heading),z:Math.cos(g.car.heading)};
  assert.equal(insideObstacle(obstacles,g.car.x,g.car.z,2.2),false,`level ${level}: mobil di dalam bangunan`);
  assert.equal(insideObstacle(obstacles,g.car.x-forward.x*8.8,g.car.z-forward.z*8.8,1.4),false,`level ${level}: kamera di dalam bangunan`);
  const pub:any=server.publicState(g);
  assert.equal(pub.id,'peta-saku');
  assert.equal(pub.rolesLocked,false);
 }
});
test('peta-saku: titik pin di luar batas dijepit ke kota',()=>{
 const g=server.create(base(),{random:()=>.5});chooseRoles(g,1);
 server.action(g,1,'pin',{x:99999,z:-99999});
 const pin=g.pin!;const city=cityMap(1);
 assert.ok(pin.x<=city.bounds.maxX&&pin.x>=city.bounds.minX);
 assert.ok(pin.z<=city.bounds.maxZ&&pin.z>=city.bounds.minZ);
});
