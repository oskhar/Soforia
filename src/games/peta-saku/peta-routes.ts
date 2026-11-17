import {cityMap,type CityMap,type CityPoint,type CityRoad} from './peta-city.ts';

export type RoutePlan = {
 city:CityMap;nodes:string[];path:CityPoint[];cumulative:number[];length:number;goal:CityPoint;startHeading:number;
 steps:{node:string;point:CityPoint;s:number;instruction:string;street:string;sign:string}[];
};
const row=(r:number,columns:number,reverse=false)=>Array.from({length:columns},(_,i)=>`n${reverse?columns-1-i:i}_${r}`);
// Rute serpentin memakai seluruh grid agar perjalanan terasa 4–6 menit, bukan sekadar satu blok.
const routeSets=[
 [...row(0,7),...row(1,7,true),...row(2,7),...row(3,7,true),...row(4,7),...row(5,7,true),...row(6,7)],
 [...row(0,6),...row(1,6,true),...row(2,6),...row(3,6,true),'n0_2',...row(2,6).slice(1),'n5_3','n4_3','n3_3','p','q','r','s'],
 ['a','b','c','d','e','f','l','k','j','i','h','g','m','n','o','q','r','x','w','v','u','s','y','z','aa','w','q','j','d','e','f']
];
const same=(a:CityPoint,b:CityPoint)=>Math.hypot(a.x-b.x,a.z-b.z)<.01;
function orientedSegment(road:CityRoad,a:CityPoint,b:CityPoint){
 const at=road.points.findIndex(point=>same(point,a)),bt=road.points.findIndex(point=>same(point,b));
 if(at>=0&&bt>=0&&bt!==at)return bt>at?road.points.slice(at,bt+1):road.points.slice(bt,at+1).reverse();
 return null;
}
function roadSegment(city:CityMap,a:CityPoint,b:CityPoint){
 for(const road of city.roads){const segment=orientedSegment(road,a,b);if(segment)return {segment,road};}
 return null;
}
function headingBetween(a:CityPoint,b:CityPoint){return Math.atan2(b.x-a.x,b.z-a.z);}
function instruction(from:CityPoint,at:CityPoint,to:CityPoint){
 const incoming=headingBetween(from,at),outgoing=headingBetween(at,to);
 let delta=((outgoing-incoming+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;
 const degrees=Math.abs(delta)*180/Math.PI;
 if(degrees<22)return 'Lurus';
 if(degrees<60)return delta>0?'Belok kanan':'Belok kiri';
 if(degrees<125)return delta>0?'Belok kanan tajam':'Belok kiri tajam';
 return delta>0?'Putar balik kanan':'Putar balik kiri';
}
export function routePlan(stage:number):RoutePlan{
 const city=cityMap(Math.max(1,Math.min(3,stage+1))),nodes=routeSets[Math.max(0,Math.min(2,stage))];
 const path:CityPoint[]=[],nodePathIndex:number[]=[];
 for(let i=0;i<nodes.length;i++){
  const point=city.nodes[nodes[i]];
  if(!point)throw Error(`Node rute tidak ditemukan: ${nodes[i]}`);
  if(i===0){path.push(point);nodePathIndex.push(path.length-1);continue;}
  const previous=city.nodes[nodes[i-1]],found=roadSegment(city,previous,point);
  const segment=found?found.segment:[previous,point];
  for(const item of segment.slice(1))if(!same(item,path.at(-1)!))path.push(item);
  nodePathIndex.push(path.length-1);
 }
 const cumulative:number[]=[0];
 for(let i=1;i<path.length;i++)cumulative.push(cumulative[i-1]+Math.hypot(path[i].x-path[i-1].x,path[i].z-path[i-1].z));
 const steps=nodes.map((node,index)=>{
  const point=city.nodes[node],pathIndex=nodePathIndex[index];
  const next=nodes[index+1],previous=nodes[index-1];
  const nextRoad=next?roadSegment(city,point,city.nodes[next])?.road:undefined;
  const street=nextRoad?.name??(index===nodes.length-1?'Tujuan':'Jalan');
  const action=index===0?'Mulai':index===nodes.length-1?'Tiba':instruction(city.nodes[previous!],point,city.nodes[next!]);
  return {node,point,s:cumulative[pathIndex]??0,instruction:action,street,sign:`${action} · ${street}`};
 });
 return {city,nodes,path,cumulative,length:cumulative.at(-1)||0,goal:city.nodes[nodes.at(-1)!],startHeading:headingBetween(city.nodes[nodes[0]],city.nodes[nodes[1]]),steps};
}
export function projectRoute(plan:RoutePlan,x:number,z:number){
 let best={distance:Infinity,s:0,x,z,index:0};
 for(let i=1;i<plan.path.length;i++){
  const a=plan.path[i-1],b=plan.path[i],dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz;
  const t=length<1e-9?0:Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/length));
  const px=a.x+dx*t,pz=a.z+dz*t,distance=Math.hypot(x-px,z-pz);
  if(distance<best.distance)best={distance,s:plan.cumulative[i-1]+Math.sqrt(length)*t,x:px,z:pz,index:i};
 }
 return best;
}
export function nextStep(plan:RoutePlan,progress:number){
 return plan.steps.find(step=>step.s>progress+6)??plan.steps.at(-1)!;
}
