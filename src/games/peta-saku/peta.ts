import {clamp} from '../../shared/random.ts';
import {cityMap,cityObstacles,insideObstacle,insideWater,type CityMap,type CityObstacle,type CityPoint,type CityRoad,type CityRoadKind} from './peta-city.ts';
import {projectRoute,routePlan,nextStep,type RoutePlan} from './peta-routes.ts';

export const PETA_LEVELS=3;
export const PETA_CAR_LENGTH=4.0,PETA_CAR_WIDTH=1.9,PETA_CAR_RADIUS=1.02;
const MAX_SPEED=13.4,MAX_REVERSE=4.6;
type Car={x:number;z:number;heading:number;speed:number;steer:number};
type PetaState={
 stage:number;city:CityMap;plan:RoutePlan;car:Car;mode:string;challenge:boolean;
 elapsed:number;distance:number;progress:number;wrongTurns:number;recoveries:number;offRouteTime:number;offExcursion:boolean;
 fuel:number;fuelMax:number;targetTime:number;segment:number;message:string;revision:number;finished:boolean;finishTime:number|null;
 pin:{x:number;z:number}|null;pinAt:number;hornAt:number;hornSlot:number;recoverAt:number;fuelWarned:boolean;
 rolesLocked:boolean;driverSlot:number;navigatorSlot:number;
 [key:string]:any;
};
function pathPose(plan:RoutePlan,s:number){
 const target=Math.max(0,Math.min(plan.length,s));
 for(let i=1;i<plan.path.length;i++){
  if(plan.cumulative[i]<target)continue;
  const a=plan.path[i-1],b=plan.path[i],span=plan.cumulative[i]-plan.cumulative[i-1]||1,t=(target-plan.cumulative[i-1])/span;
  return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,heading:Math.atan2(b.x-a.x,b.z-a.z)};
 }
 return {x:plan.goal.x,z:plan.goal.z,heading:plan.startHeading};
}
/** Mulai beberapa meter di jalan agar mobil dan kamera tidak berada di dalam gedung/landmark. */
function clearSpawn(plan:RoutePlan,obstacles:CityObstacle[]){
 const limit=Math.min(80,plan.length*.22);
 for(let s=0;s<=limit;s+=2){
  const pose=pathPose(plan,s);
  const camX=pose.x-Math.sin(pose.heading)*8.8,camZ=pose.z-Math.cos(pose.heading)*8.8;
  if(!insideObstacle(obstacles,pose.x,pose.z,2.2)&&!insideObstacle(obstacles,camX,camZ,1.4))return {pose,s};
 }
 return {pose:pathPose(plan,0),s:0};
}
function startCar(pose:{x:number;z:number;heading:number}):Car{return {x:pose.x,z:pose.z,heading:pose.heading,speed:0,steer:0};}
function nearestRoadPose(map:CityMap,x:number,z:number){
 let best={distance:Infinity,x,z,heading:0,width:8,kind:'street' as CityRoadKind,name:''};
 for(const road of map.roads)for(let i=1;i<road.points.length;i++){
  const a=road.points[i-1],b=road.points[i],dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz;
  const t=length<1e-9?0:clamp(((x-a.x)*dx+(z-a.z)*dz)/length,0,1),px=a.x+dx*t,pz=a.z+dz*t,distance=Math.hypot(x-px,z-pz);
  if(distance<best.distance)best={distance,x:px,z:pz,heading:Math.atan2(dx,dz),width:road.width,kind:road.kind,name:road.name};
 }
 return best;
}
function buildingCollision(map:CityMap,car:Car,dt:number){
 let hit=false;
 const forward={x:Math.sin(car.heading),z:Math.cos(car.heading)};
 for(const b of map.buildings){
  if(Math.abs(car.x-b.x)>b.w/2+4||Math.abs(car.z-b.z)>b.d/2+4)continue;
  const halfW=b.w/2,halfD=b.d/2;
  for(const offset of [-1.25,0,1.25]){
   const cx=car.x+forward.x*offset,cz=car.z+forward.z*offset;
   const nearestX=clamp(cx,b.x-halfW,b.x+halfW),nearestZ=clamp(cz,b.z-halfD,b.z+halfD);
   let dx=cx-nearestX,dz=cz-nearestZ,distance=Math.hypot(dx,dz);
   if(distance>=PETA_CAR_RADIUS)continue;
   if(distance<1e-5){
    const left=Math.abs(cx-(b.x-halfW)),right=Math.abs(b.x+halfW-cx),top=Math.abs(cz-(b.z-halfD)),bottom=Math.abs(b.z+halfD-cz),min=Math.min(left,right,top,bottom);
    if(min===left){dx=-1;dz=0;distance=left;}else if(min===right){dx=1;dz=0;distance=right;}else if(min===top){dx=0;dz=-1;distance=top;}else{dx=0;dz=1;distance=bottom;}
   }
   if(distance<1e-5){dx=Math.sin(car.heading+Math.PI);dz=Math.cos(car.heading+Math.PI);distance=1;}
   const push=(PETA_CAR_RADIUS-distance)+.03;
   car.x+=dx/distance*push;car.z+=dz/distance*push;car.speed*=Math.max(0,1-dt*8);hit=true;
  }
 }
 return hit;
}
function updateMessage(g:PetaState,text:string){if(g.message!==text){g.message=text;g.revision++;}}
function passedSegment(plan:RoutePlan,progress:number){return Math.max(0,plan.steps.filter(step=>step.s<=progress+7).length-1);}
function reachedGoal(g:PetaState){
 const goal=g.plan.goal;return Math.hypot(g.car.x-goal.x,g.car.z-goal.z)<10&&Math.abs(g.car.speed)<3.2;
}
function finish(g:PetaState){
 if(g.finished)return;
 g.finished=true;g.finishTime=g.elapsed;g.car.speed=0;g.car.steer=0;g.revision++;
 updateMessage(g,'Sampai di tujuan. Kalian menemukan jalan bersama-sama.');
}
export function createPeta(stage=0,mode='relaxed'){
 const safeStage=clamp(Math.round(stage),0,PETA_LEVELS-1),plan=routePlan(safeStage),challenge=mode==='challenge';
 const targetTime=Math.max(240,Math.round(plan.length/9));
 const spawn=clearSpawn(plan,cityObstacles(plan.city));
 const g:PetaState={
  stage:safeStage,city:plan.city,plan,car:startCar(spawn.pose),mode,challenge,
  elapsed:0,distance:0,progress:spawn.s,wrongTurns:0,recoveries:0,offRouteTime:0,offExcursion:false,
  fuel:challenge?100:100,fuelMax:100,targetTime,segment:passedSegment(plan,spawn.s),
  message:'Pilih peran dulu: satu HP memegang peta, satu HP menyetir.',
  revision:1,finished:false,finishTime:null,pin:null,pinAt:0,hornAt:0,hornSlot:0,recoverAt:-10,fuelWarned:false,
  rolesLocked:false,driverSlot:0,navigatorSlot:1
 };
 return g;
}
export function neutralPeta(g:PetaState){if(g?.car){g.car.steer=0;if(!g.rolesLocked)g.car.speed=0;}}
export function petaAction(g:PetaState,slot:number,name:string,value?:unknown){
 if(g.finished)return;
 if(name==='role'){
  if(g.rolesLocked||![0,1].includes(slot))return;
  const role=value==='map'?'navigator':value==='drive'?'driver':null;
  if(!role)return;
  g.navigatorSlot=role==='navigator'?slot:1-slot;g.driverSlot=1-g.navigatorSlot;g.rolesLocked=true;g.elapsed=0;
  g.car.speed=0;g.car.steer=0;g.revision++;
  const mapStick=g.navigatorSlot===0?'A':'B',driveStick=g.driverSlot===0?'A':'B';
  updateMessage(g,`Peran siap: Stick ${mapStick} memegang peta, Stick ${driveStick} menyetir.`);
  return;
 }
 if(!g.rolesLocked)return;
 if(name==='horn'){g.hornAt=g.elapsed;g.hornSlot=slot;g.revision++;updateMessage(g,slot===g.driverSlot?'Klakson ceria dari pengemudi.':'Navigator membunyikan klakson.');return;}
 if(name==='recover'&&slot===g.driverSlot){
  if(g.elapsed-g.recoverAt<4)return;
  const pose=nearestRoadPose(g.city,g.car.x,g.car.z);g.car.x=pose.x;g.car.z=pose.z;g.car.heading=pose.heading;g.car.speed=0;g.car.steer=0;g.recoverAt=g.elapsed;g.recoveries++;g.offRouteTime=0;g.offExcursion=false;g.revision++;updateMessage(g,'Mobil ditarik kembali ke jalan terdekat.');
  return;
 }
 if(slot!==g.navigatorSlot)return;
 if(name==='pin'&&value&&typeof value==='object'){
  const v=value as {x?:unknown;z?:unknown};if(typeof v.x!=='number'||typeof v.z!=='number'||!Number.isFinite(v.x)||!Number.isFinite(v.z))return;
  const x=clamp(v.x,g.city.bounds.minX,g.city.bounds.maxX),z=clamp(v.z,g.city.bounds.minZ,g.city.bounds.maxZ);
  g.pin={x,z};g.pinAt=g.elapsed;g.revision++;updateMessage(g,'Pin navigator dipasang. Pengemudi melihat ikon arah.');
  return;
 }
 if(name==='clear-pin'){if(g.pin){g.pin=null;g.revision++;updateMessage(g,'Pin dihapus. Tunggu arah berikutnya dari navigator.');}return;}
}
export function tickPeta(g:PetaState,inputs:Record<string,number>[],dt:number){
 if(g.finished)return;
 if(!g.rolesLocked){g.elapsed=0;g.car.speed=0;g.car.steer=0;return;}
 const input=inputs[g.driverSlot]||{},steer=clamp(Number(input.x)||0,-1,1);
 const gas=clamp(Math.max(Number(input.throttle)||0,Math.max(0,-(Number(input.y)||0))),0,1);
 const brake=clamp(Math.max(Number(input.brake)||0,Math.max(0,Number(input.y)||0)),0,1);
 g.car.steer=steer;
 const nearest=nearestRoadPose(g.city,g.car.x,g.car.z);
 const onRoad=nearest.distance<=nearest.width/2+1.4;
 const inWater=insideWater(g.city,g.car.x,g.car.z)&&!(nearest.distance<=nearest.width/2&&(nearest.kind==='bridge'||nearest.kind==='quay'));
 const limp=g.challenge&&g.fuel<=0;
 const maxSpeed=limp?3.4:inWater?2.4:!onRoad?5.4:MAX_SPEED;
 if(gas>0)g.car.speed+=7.6*gas*dt*(inWater?.25:!onRoad?.48:1);
 if(brake>0){if(g.car.speed>.35)g.car.speed-=15.5*brake*dt;else g.car.speed-=4.2*brake*dt;}
 const resistance=(.55+Math.abs(g.car.speed)*.045)*(inWater?7:!onRoad?3.4:1);
 if(Math.abs(g.car.speed)>0)g.car.speed-=Math.sign(g.car.speed)*Math.min(Math.abs(g.car.speed),resistance*dt);
 if(g.car.speed>maxSpeed)g.car.speed=Math.max(maxSpeed,g.car.speed-(g.car.speed-maxSpeed)*Math.min(1,dt*5));
 if(g.car.speed<-MAX_REVERSE)g.car.speed=-MAX_REVERSE;
 if(Math.abs(g.car.speed)<.02&&gas===0&&brake===0)g.car.speed=0;
 g.car.heading+=steer*Math.min(1,Math.abs(g.car.speed)/6)*1.52*dt*Math.sign(g.car.speed||1);
 g.car.x+=Math.sin(g.car.heading)*g.car.speed*dt;
 g.car.z+=Math.cos(g.car.heading)*g.car.speed*dt;
 const hit=buildingCollision(g.city,g.car,dt);
 if(hit)updateMessage(g,'Aduh, nyaris menabrak gedung. Mundur sedikit lalu cari jalan.');
 const project=projectRoute(g.plan,g.car.x,g.car.z);
 if(project.distance<30)g.progress=Math.max(g.progress,project.s);
 g.distance+=Math.abs(g.car.speed)*dt;
 if(project.distance>25&&Math.abs(g.car.speed)>2){g.offRouteTime+=dt;if(g.offRouteTime>1.6&&!g.offExcursion){g.wrongTurns++;g.offExcursion=true;g.revision++;updateMessage(g,'Kalian keluar dari rute. Navigator mencari jalan memutar — tidak ada jalan buntu.');}}
 else if(project.distance<18){g.offRouteTime=0;g.offExcursion=false;}
 const segment=passedSegment(g.plan,g.progress);if(segment!==g.segment){g.segment=segment;g.revision++;}
 if(g.challenge){
  const burn=(.10+gas*.22+Math.abs(g.car.speed)*.008)*(limp?.2:1);
  g.fuel=Math.max(0,g.fuel-burn*dt);
  if(g.fuel<=0&&!g.fuelWarned){g.fuelWarned=true;g.revision++;updateMessage(g,'Bahan bakar habis. Mobil merayap; tetap bisa sampai tujuan.');}
 }
 if(reachedGoal(g))finish(g);
}
function pinInfo(g:PetaState){
 if(!g.pin)return {pinSet:false,pinBearing:0,pinDistance:0,pinAge:0};
 const dx=g.pin.x-g.car.x,dz=g.pin.z-g.car.z;
 return {pinSet:true,pinBearing:Math.atan2(dx,dz),pinDistance:Math.hypot(dx,dz),pinAge:Math.max(0,g.elapsed-g.pinAt)};
}
export function publicPeta(g:PetaState){
 const pin=pinInfo(g);
 return {
  id:'peta-saku',stage:g.stage,cityTitle:g.city.title,citySubtitle:g.city.subtitle,mode:g.mode,challenge:g.challenge,
  car:{x:g.car.x,z:g.car.z,heading:g.car.heading,speed:g.car.speed,steer:g.car.steer},
  elapsed:g.elapsed,distance:g.distance,progress:g.progress,routeLength:g.plan.length,segment:g.segment,segments:g.plan.steps.length,
  wrongTurns:g.wrongTurns,recoveries:g.recoveries,fuel:g.fuel,fuelMax:g.fuelMax,targetTime:g.targetTime,
  message:g.message,revision:g.revision,finished:g.finished,finishTime:g.finishTime,hornAt:g.hornAt,hornSlot:g.hornSlot,
  rolesLocked:g.rolesLocked,driverSlot:g.driverSlot,navigatorSlot:g.navigatorSlot,
  ...pin
 };
}
export function privatePeta(g:PetaState,slot:number){
 if(!g.rolesLocked||slot!==g.navigatorSlot)return {};
 return {
  role:'navigator',cityId:g.city.id,
  route:{nodes:g.plan.nodes,path:g.plan.path,steps:g.plan.steps,length:g.plan.length,goal:g.plan.goal},
  pin:g.pin,nextStep:nextStep(g.plan,g.progress),wrongTurns:g.wrongTurns,recoveries:g.recoveries,
  progress:g.progress,segment:g.segment
 };
}
export function petaResult(g:PetaState){
 const minutes=Math.floor((g.finishTime??g.elapsed)/60),seconds=Math.round((g.finishTime??g.elapsed)%60);
 const time=`${minutes}:${String(seconds).padStart(2,'0')}`;
 const km=(g.distance/1000).toFixed(2);
 const underTarget=(g.finishTime??g.elapsed)<=g.targetTime;
 let stars:number|null=null,title='Sampai di tujuan bersama!';
 if(g.challenge){
  stars=(underTarget&&g.wrongTurns<=1&&g.fuel>0)?3:(underTarget&&g.wrongTurns<=3)?2:1;
  title=underTarget?'Target waktu tercapai!':'Tiba, meski melewati target waktu.';
 }
 return {title,detail:`${g.city.title} · ${time} · ${km} km · ${g.wrongTurns} salah belok · ${g.recoveries} derek${g.challenge?` · bahan bakar ${Math.round(g.fuel)}%`:''}`,stars};
}
export {cityMap};
