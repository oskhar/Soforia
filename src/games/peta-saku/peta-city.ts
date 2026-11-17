import {rng} from '../../shared/random.ts';

/** Geometri kota deterministik. Modul ini sengaja tidak memuat rute atau tujuan. */
export type CityPoint = {x:number;z:number};
export type CityRoadKind = 'street'|'avenue'|'alley'|'bridge'|'quay';
export type CityRoad = {id:string;name:string;points:CityPoint[];width:number;kind:CityRoadKind;limit:number};
export type CityBuilding = {x:number;z:number;w:number;d:number;h:number;yaw:number;tint:number;roof:number;style:number};
export type CityPark = {x:number;z:number;w:number;d:number;kind:'park'|'plaza'|'garden'};
export type CityHill = {x:number;z:number;r:number;h:number};
export type CityLandmark = {kind:'clocktower'|'fountain'|'station'|'market'|'lighthouse'|'observatory'|'garden'|'docks';x:number;z:number;label:string};
export type CityWater = {x:number;z:number;w:number;d:number};
export type CityPalette = {ground:string;sidewalk:string;road:string;line:string;accent:string;sky:string;fog:string;water?:string;roofs:string[];walls:string[]};
export type CityMap = {
 id:string;level:number;title:string;subtitle:string;bounds:{minX:number;maxX:number;minZ:number;maxZ:number};
 nodes:Record<string,CityPoint>;roads:CityRoad[];buildings:CityBuilding[];parks:CityPark[];hills:CityHill[];landmarks:CityLandmark[];water?:CityWater[];palette:CityPalette;
};
const dist2=(a:CityPoint,b:CityPoint)=>(a.x-b.x)**2+(a.z-b.z)**2;
function segmentDistance(p:CityPoint,a:CityPoint,b:CityPoint){
 const dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz;
 if(length<1e-9)return Math.sqrt(dist2(p,a));
 const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/length));
 return Math.hypot(p.x-(a.x+dx*t),p.z-(a.z+dz*t));
}
export function roadDistance(map:CityMap,x:number,z:number){
 let best=Infinity,road:CityRoad|undefined;
 for(const item of map.roads){for(let i=1;i<item.points.length;i++){const d=segmentDistance({x,z},item.points[i-1],item.points[i]);if(d<best){best=d;road=item;}}}
 return {distance:best,road};
}
export function insideWater(map:CityMap,x:number,z:number){
 if(!map.water)return false;
 return map.water.some(w=>x>w.x-w.w/2&&x<w.x+w.w/2&&z>w.z-w.d/2&&z<w.z+w.d/2);
}
function pointClear(map:{roads:CityRoad[];parks:CityPark[];hills:CityHill[];landmarks:CityLandmark[];water?:CityWater[];bounds:CityMap['bounds']},x:number,z:number,margin:number){
 const b=map.bounds;if(x<b.minX+margin||x>b.maxX-margin||z<b.minZ+margin||z>b.maxZ-margin)return false;
 for(const road of map.roads)for(let i=1;i<road.points.length;i++)if(segmentDistance({x,z},road.points[i-1],road.points[i])<road.width/2+margin)return false;
 for(const park of map.parks)if(Math.abs(x-park.x)<park.w/2+margin&&Math.abs(z-park.z)<park.d/2+margin)return false;
 for(const hill of map.hills)if(Math.hypot(x-hill.x,z-hill.z)<hill.r+margin)return false;
 for(const landmark of map.landmarks)if(Math.hypot(x-landmark.x,z-landmark.z)<14+margin)return false;
 if(insideWater(map as CityMap,x,z))return false;
 return true;
}
function buildingFits(list:CityBuilding[],x:number,z:number,w:number,d:number){
 return !list.some(b=>Math.abs(x-b.x)<(w+b.w)/2+2.5&&Math.abs(z-b.z)<(d+b.d)/2+2.5);
}
function buildBuildings(map:Omit<CityMap,'buildings'>,seed:number,tall:number,density:number){
 const random=rng(seed),list:CityBuilding[]=[];
 const step=23;
 for(let z=map.bounds.minZ+20;z<map.bounds.maxZ-20;z+=step)for(let x=map.bounds.minX+20;x<map.bounds.maxX-20;x+=step){
  const px=x+(random()-.5)*7,pz=z+(random()-.5)*7;
  if(random()>density)continue;
  const w=12+random()*11,d=12+random()*11,h=(7+random()*tall)*(random()<.16?1.55:1);
  if(!pointClear(map,px,pz,8))continue;
  if(!buildingFits(list,px,pz,w,d))continue;
  list.push({x:px,z:pz,w,d,h,yaw:random()<.22?Math.PI/2:0,tint:Math.floor(random()*7),roof:Math.floor(random()*4),style:Math.floor(random()*4)});
 }
 return list;
}
function grid(columns:number[],rows:number[],prefix='n'){
 const nodes:Record<string,CityPoint>={};
 columns.forEach((x,c)=>rows.forEach((z,r)=>{nodes[`${prefix}${c}_${r}`]={x,z};}));
 return nodes;
}
function road(id:string,name:string,points:CityPoint[],width:number,kind:CityRoadKind='street',limit=45):CityRoad{return {id,name,points,width,kind,limit};}
function curves(a:CityPoint,b:CityPoint,bend:number,count=4){
 const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz)||1,nx=-dz/length,nz=dx/length;
 return Array.from({length:count+1},(_,i)=>{const t=i/count;return {x:a.x+dx*t+nx*Math.sin(Math.PI*t)*bend,z:a.z+dz*t+nz*Math.sin(Math.PI*t)*bend};});
}
function rowRoads(nodes:Record<string,CityPoint>,columns:number[],rows:number[],names:string[],width=13,limit=45){
 return rows.map((_,r)=>road(`row-${r}`,names[r]??`Jalan ${r+1}`,columns.map((_,c)=>nodes[`n${c}_${r}`]),width,'street',limit));
}
function columnRoads(nodes:Record<string,CityPoint>,columns:number[],rows:number[],names:string[],width=13,limit=45){
 return columns.map((_,c)=>road(`col-${c}`,names[c]??`Jalan ${c+1}`,rows.map((_,r)=>nodes[`n${c}_${r}`]),width,'avenue',limit));
}

function kotaKembang():Omit<CityMap,'buildings'>{
 const xs=[-210,-140,-70,0,70,140,210],zs=[210,140,70,0,-70,-140,-210];
 const nodes=grid(xs,zs);
 const colNames=['Jalan Kembang','Jalan Melati','Jalan Kenanga','Jalan Cempaka','Jalan Anggrek','Jalan Bougenvil','Jalan Teratai'];
 const rowNames=['Jalan Pagi','Jalan Siang','Jalan Sore','Jalan Malam','Jalan Fajar','Jalan Bulan','Jalan Bintang'];
 const roads=[...rowRoads(nodes,xs,zs,rowNames),...columnRoads(nodes,xs,zs,colNames)];
 // Boulevard diagonal memecah grid dan memberi jalan pintas yang bisa jadi salah belok.
 roads.push(road('diagonal','Boulevard Kembang',curves(nodes.n2_2,nodes.n4_4,26,5),17,'avenue',40));
 const parks:CityPark[]=[
  {x:-175,z:35,w:58,d:54,kind:'park'},{x:105,z:175,w:56,d:46,kind:'plaza'},
  {x:105,z:35,w:60,d:58,kind:'garden'},{x:-35,z:-175,w:46,d:44,kind:'plaza'}
 ];
 const landmarks:CityLandmark[]=[
  {kind:'station',x:-232,z:222,label:'Stasiun Kembang'},
  {kind:'clocktower',x:228,z:-228,label:'Menara Jam Kembang'},
  {kind:'fountain',x:0,z:16,label:'Alun-alun Cempaka'},
  {kind:'market',x:-70,z:0,label:'Pasar Kenanga'}
 ];
 return {id:'kota-kembang',level:1,title:'Kota Kembang',subtitle:'Jalan pagi, gang melati, dan menara jam di ujung kota.',bounds:{minX:-250,maxX:250,minZ:-250,maxZ:250},nodes,roads,parks,hills:[],landmarks,palette:{ground:'#6f8a6a',sidewalk:'#d7c7a8',road:'#3c414b',line:'#e6d9ac',accent:'#f2b35f',sky:'#b9d7df',fog:'#c3dce1',roofs:['#a95645','#8c4b3f','#d28d5b','#6f7f88'],walls:['#e6d8bb','#d8c4a5','#c9d4cf','#e4c9a8','#b9c7c8','#d9b49a','#cfd8d1']}};
}
function pelabuhanSenja():Omit<CityMap,'buildings'>{
 const xs=[-220,-140,-60,20,100,180],zs=[200,120,40,-40];
 const nodes=grid(xs,zs);
 nodes.p={x:20,z:-130};nodes.q={x:100,z:-130};nodes.r={x:180,z:-130};nodes.s={x:230,z:-130};
 const colNames=['Jalan Dermaga','Jalan Layar','Jalan Jangkar','Jalan Ombak','Jalan Mercusuar','Jalan Karang'];
 const rowNames=['Jalan Pelabuhan','Jalan Niaga','Jalan Pasar','Jalan Samudra'];
 const roads=[...rowRoads(nodes,xs,zs,rowNames),...columnRoads(nodes,xs,zs,colNames)];
 roads.push(road('quay','Dermaga Senja',[nodes.n0_3,nodes.n1_3,nodes.n2_3,nodes.n3_3,nodes.n4_3,nodes.n5_3],18,'quay',35));
 roads.push(road('bridge','Jembatan Ombak',curves(nodes.n3_3,{x:nodes.n3_3.x,z:-130},-8,5),14,'bridge',35));
 roads.push(road('pier','Dermaga Utara',[nodes.p,nodes.q,nodes.r,nodes.s],15,'quay',30));
 const parks:CityPark[]=[
  {x:-180,z:70,w:52,d:48,kind:'plaza'},{x:140,z:70,w:54,d:54,kind:'park'},{x:20,z:-160,w:56,d:24,kind:'garden'}
 ];
 const landmarks:CityLandmark[]=[
  {kind:'market',x:-220,z:212,label:'Pasar Pelabuhan'},
  {kind:'lighthouse',x:240,z:-130,label:'Mercusuar Senja'},
  {kind:'docks',x:100,z:-156,label:'Dermaga Utara'},
  {kind:'docks',x:-60,z:-52,label:'Dermaga Barat'}
 ];
 const water:CityWater[]=[{x:0,z:-175,w:560,d:160}];
 return {id:'pelabuhan-senja',level:2,title:'Pelabuhan Senja',subtitle:'Gudang, jembatan, dan cahaya mercusuar di atas air.',bounds:{minX:-260,maxX:260,minZ:-250,maxZ:250},nodes,roads,parks,hills:[],landmarks,water,palette:{ground:'#708477',sidewalk:'#cabda5',road:'#353d47',line:'#e3d5a3',accent:'#ef9c59',sky:'#a9c9d6',fog:'#b7d1da',water:'#2f7183',roofs:['#7b4a42','#a45c48','#59777c','#8c6a53'],walls:['#d9d0ba','#c2cbbf','#d9bca2','#aebfc1','#e0d4b8','#b7a58f']}};
}
function bukitBulan():Omit<CityMap,'buildings'>{
 const p:Record<string,CityPoint>={
  a:{x:-240,z:200},b:{x:-160,z:180},c:{x:-70,z:200},d:{x:30,z:180},e:{x:130,z:200},f:{x:220,z:180},
  g:{x:-230,z:110},h:{x:-150,z:80},i:{x:-50,z:110},j:{x:60,z:80},k:{x:160,z:120},l:{x:250,z:90},
  m:{x:-200,z:10},n:{x:-110,z:-20},o:{x:0,z:10},q:{x:110,z:-20},r:{x:210,z:10},t:{x:280,z:-10},
  s:{x:-170,z:-90},u:{x:-70,z:-110},v:{x:40,z:-90},w:{x:140,z:-120},x:{x:230,z:-90},
  y:{x:-130,z:-190},z:{x:-30,z:-200},aa:{x:80,z:-180}
 };
 const mk=(id:string,name:string,a:string,b:string,bend=0)=>{const points=curves(p[a],p[b],bend,5);return road(id,name,points,12,'street',35);};
 const roads=[
  mk('top-a','Jalan Puncak',  'a','b',-10),mk('top-b','Jalan Puncak','b','c',8),mk('top-c','Jalan Puncak','c','d',-7),mk('top-d','Jalan Puncak','d','e',10),mk('top-e','Jalan Puncak','e','f',-6),
  mk('mid-a','Jalan Teras','g','h',-12),mk('mid-b','Jalan Teras','h','i',10),mk('mid-c','Jalan Teras','i','j',-9),mk('mid-d','Jalan Teras','j','k',8),mk('mid-e','Jalan Teras','k','l',-10),
  mk('low-a','Jalan Akar','m','n',-10),mk('low-b','Jalan Akar','n','o',9),mk('low-c','Jalan Akar','o','q',-8),mk('low-d','Jalan Akar','q','r',7),mk('low-e','Jalan Akar','r','t',-9),
  mk('bot-a','Jalan Kabut','s','u',-8),mk('bot-b','Jalan Kabut','u','v',9),mk('bot-c','Jalan Kabut','v','w',-7),mk('bot-d','Jalan Kabut','w','x',8),mk('bot-e','Jalan Kabut','z','aa',-6),mk('bot-f','Jalan Kabut','aa','w',8),
  mk('col-a','Jalan Bukit','a','g',7),mk('col-b','Jalan Bukit','g','m',-8),mk('col-c','Jalan Bukit','m','s',6),mk('col-d','Jalan Bukit','s','y',-7),
  mk('col-e','Jalan Pinus','b','h',-7),mk('col-f','Jalan Pinus','h','n',6),mk('col-g','Jalan Pinus','n','u',-6),mk('col-h','Jalan Pinus','u','z',5),
  mk('col-i','Jalan Bulan','c','i',6),mk('col-j','Jalan Bulan','i','o',-5),mk('col-k','Jalan Bulan','o','v',7),mk('col-l','Jalan Bulan','v','aa',-6),
  mk('col-m','Jalan Lembah','d','j',-6),mk('col-n','Jalan Lembah','j','q',7),mk('col-o','Jalan Lembah','q','w',-6),
  mk('col-q','Jalan Cakrawala','e','k',-5),mk('col-r','Jalan Cakrawala','k','r',6),mk('col-s','Jalan Cakrawala','r','x',-5),
  mk('col-t','Jalan Pesisir','f','l',7),mk('col-u','Jalan Pesisir','l','t',-6),
  mk('link-a','Jalan Setapak','b','i',-14),mk('link-b','Jalan Setapak','h','m',12),
  mk('link-c','Jalan Setapak','i','n',-12),mk('link-d','Jalan Setapak','j','o',13),
  mk('link-e','Jalan Setapak','q','w',-11),mk('link-f','Jalan Setapak','r','x',10),
  mk('link-g','Jalan Setapak','y','z',6)
 ];
 const parks:CityPark[]=[
  {x:30,z:26,w:150,d:116,kind:'park'},{x:-200,z:-40,w:60,d:60,kind:'garden'}
 ];
 const hills:CityHill[]=[{x:40,z:18,r:92,h:13},{x:-205,z:-64,r:54,h:6}];
 const landmarks:CityLandmark[]=[
  {kind:'market',x:-50,z:110,label:'Pasar Bukit'},
  {kind:'observatory',x:230,z:210,label:'Observatorium Bukit Bulan'},
  {kind:'garden',x:30,z:18,label:'Taman Bulan'},
  {kind:'fountain',x:-150,z:80,label:'Mata Air Teras'}
 ];
 return {id:'bukit-bulan',level:3,title:'Bukit Bulan',subtitle:'Jalan berkelok menuju observatorium di puncak.',bounds:{minX:-280,maxX:300,minZ:-250,maxZ:250},nodes:p,roads,parks,hills,landmarks,palette:{ground:'#58755a',sidewalk:'#c6b391',road:'#343a42',line:'#e2d1a0',accent:'#e6a45e',sky:'#9dbdd0',fog:'#b6ccd4',roofs:['#995243','#b46a4b','#6d7770','#7d5b4a'],walls:['#d8ccb8','#c9b79d','#b9c2b6','#e0c9aa','#cbb0a0','#b4c1bd']}};
}
export function cityMap(level:number):CityMap{
 const base=level===2?pelabuhanSenja():level===3?bukitBulan():kotaKembang();
 const tall=level===3?12:level===2?18:22,density=level===2?.78:level===3?.74:.86;
 const buildings=buildBuildings(base,level*7919+41,tall,density);
 return {...base,buildings};
}
export const cityCount=3;
export type CityObstacle={x:number;z:number;w:number;d:number};
const landmarkFootprints:Record<CityLandmark['kind'],[number,number]>={clocktower:[22,22],fountain:[22,22],station:[42,24],market:[34,14],lighthouse:[20,20],observatory:[18,18],garden:[36,36],docks:[42,14]};
/** Kotak tabrakan untuk bangunan dan landmark; dipakai spawn, derek, dan kamera. */
export function cityObstacles(city:CityMap):CityObstacle[]{
 const boxes:CityObstacle[]=city.buildings.map(b=>({x:b.x,z:b.z,w:b.w,d:b.d}));
 for(const item of city.landmarks){const [w,d]=landmarkFootprints[item.kind];boxes.push({x:item.x,z:item.z,w,d});}
 return boxes;
}
export function insideObstacle(boxes:CityObstacle[],x:number,z:number,radius=0){
 for(const b of boxes){
  const dx=Math.max(Math.abs(x-b.x)-b.w/2,0),dz=Math.max(Math.abs(z-b.z)-b.d/2,0);
  if(dx*dx+dz*dz<radius*radius)return true;
 }
 return false;
}
