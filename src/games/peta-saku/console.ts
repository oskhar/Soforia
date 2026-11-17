import type {SceneKit} from '../../shared/game-contracts.ts';
import * as T from 'three';
import {addAsset,assetChoices} from '../../shared/renderer/assets3d.ts';
import {cityMap,cityObstacles,insideObstacle,type CityMap,type CityPoint,type CityRoad} from './peta-city.ts';

const CAR_COLORS=['#d9534f','#3d8ea8','#e0b75a','#7a9c72'];
function ribbon(points:CityPoint[],width:number,height:number){
 const positions:number[]=[];
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);if(length<1e-6)continue;
  const nx=-dz/length*width/2,nz=dx/length*width/2;
  positions.push(a.x+nx,height,a.z+nz,b.x+nx,height,b.z+nz,b.x-nx,height,b.z-nz,a.x+nx,height,a.z+nz,b.x-nx,height,b.z-nz,a.x-nx,height,a.z-nz);
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();
 return geometry;
}
function joints(points:CityPoint[],radius:number,height:number){
 const positions:number[]=[];
 for(const point of points.slice(0,-1))for(let i=0;i<12;i++){
  const a=point.x+Math.sin(i*Math.PI/6)*radius,z=point.z+Math.cos(i*Math.PI/6)*radius,b=point.x+Math.sin((i+1)*Math.PI/6)*radius,d=point.z+Math.cos((i+1)*Math.PI/6)*radius;
  positions.push(point.x,height,point.z,point.x+a,height,point.z+z,point.x+b,height,point.z+d);
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();
 return geometry;
}
function addRoadMesh(world:T.Object3D,geometry:T.BufferGeometry,color:string,material:(c:string)=>T.Material){
 const mesh=new T.Mesh(geometry,material(color));mesh.receiveShadow=true;mesh.userData.ownedGeometry=geometry;world.add(mesh);return mesh;
}
function laneDashes(road:CityRoad){
 const positions:number[]=[];
 for(let i=1;i<road.points.length;i++){
  const a=road.points[i-1],b=road.points[i],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);if(length<4)continue;
  const ux=dx/length,uz=dz/length,nx=-uz*.11,nz=ux*.11;
  for(let distance=3;distance<length-2;distance+=8){
   const x1=a.x+ux*distance,z1=a.z+uz*distance,x2=a.x+ux*(distance+3.4),z2=a.z+uz*(distance+3.4);
   positions.push(x1+nx,.075,z1+nz,x2+nx,.075,z2+nz,x2-nx,.075,z2-nz,x1+nx,.075,z1+nz,x2-nx,.075,z2-nz,x1-nx,.075,z1-nz);
  }
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();return geometry;
}
function facadeTexture(){
 const canvas=document.createElement('canvas');canvas.width=128;canvas.height=256;const c=canvas.getContext('2d')!;
 c.fillStyle='#f3ede2';c.fillRect(0,0,128,256);
 for(let row=0;row<8;row++)for(let col=0;col<4;col++){
  const x=10+col*29,y=12+row*30,w=19,h=15;c.fillStyle=(row+col)%5===0?'#f1c66f':'#38505d';c.fillRect(x,y,w,h);
  c.fillStyle='#ffffff44';c.fillRect(x,y,w,3);
 }
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;return texture;
}
function landmark(kit:SceneKit,map:CityMap,item:CityMap['landmarks'][number],palette:CityMap['palette']){
 const {world,box,shape,group,label}=kit;
 if(item.kind==='clocktower'){
  box(world,palette.walls[1],item.x,.2,item.z,22,.4,22);shape(world,'cylinder',palette.walls[0],item.x,17,item.z,5.5,17,5.5);
  box(world,palette.roofs[0],item.x,35,item.z,12,2,12);shape(world,'cone',palette.roofs[2],item.x,41,item.z,7,10,7);box(world,'#f6e9c6',item.x,28.5,item.z+5.6,4.6,4.6,.4);
  box(world,'#473b33',item.x,28.5,item.z+5.82,.25,2.0,.05);box(world,'#473b33',item.x,28.5,item.z+5.82,2.0,.25,.05);label(world,item.label,item.x,50,item.z,5);
 }
 else if(item.kind==='fountain'){
  box(world,palette.sidewalk,item.x,.08,item.z,22,.16,22);shape(world,'cylinder',palette.walls[2],item.x,.35,item.z,6,.35,6);shape(world,'cylinder',palette.water??'#5aa3b5',item.x,.58,item.z,5.1,.08,5.1);
  shape(world,'cylinder','#d9d2bd',item.x,1.4,item.z,1.1,1.1,1.1);shape(world,'sphere','#79c4d1',item.x,2.4,item.z,.6,.8,.6);label(world,item.label,item.x,6.5,item.z,4.5);
 }
 else if(item.kind==='station'){
  box(world,palette.walls[3],item.x,3.2,item.z,42,6.4,24);box(world,palette.roofs[1],item.x,7,item.z,46,1.6,27);
  for(const x of [-14,-7,0,7,14])box(world,'#efe0bd',item.x+x,3,item.z+12.2,3.2,5.6,.5);
  label(world,item.label,item.x,10.5,item.z+13,6.5);
 }
 else if(item.kind==='market'){
  for(let i=0;i<5;i++){const x=item.x+(i-2)*7,z=item.z+(i%2?4:-3);box(world,'#e8d5af',x,.6,z,5.4,1.2,4.2);box(world,['#d96b55','#e3a64f','#6ba69a','#d9856e','#8b9f6c'][i],x,2.8,z,5.8,.7,4.7);box(world,'#7f644d',x,.8,z+2.1,.2,1.6,.2);}
  label(world,item.label,item.x,6.8,item.z,5.5);
 }
 else if(item.kind==='lighthouse'){
  box(world,palette.sidewalk,item.x,.1,item.z,20,.2,20);shape(world,'cylinder','#f1e7d2',item.x,12,item.z,4.6,12,4.6);
  for(const y of [5,9,13,17])shape(world,'cylinder','#c95548',item.x,y,item.z,4.7-y*.08,1.1,4.7-y*.08);
  shape(world,'cylinder','#33464f',item.x,24.3,item.z,3.4,.5,3.4);shape(world,'sphere','#ffe39a',item.x,26.6,item.z,2.2,2.2,2.2,true);
  shape(world,'cone','#c95548',item.x,29.2,item.z,2.8,3.4,2.8);label(world,item.label,item.x,34,item.z,5.5);
 }
 else if(item.kind==='observatory'){
  shape(world,'cylinder',palette.walls[1],item.x,4.5,item.z,9,4.5,9);shape(world,'sphere','#d8d4c5',item.x,10.2,item.z,9,6,9);
  shape(world,'cylinder','#3d4f5a',item.x,12.5,item.z+1,1.1,7,1.1).rotation.x=Math.PI/2.7;
  box(world,'#475c64',item.x,2,item.z+8.6,4.5,4,1.2);label(world,item.label,item.x,22,item.z,6.5);
 }
 else if(item.kind==='garden'){
  const hub=group(world);hub.position.set(item.x,0,item.z);
  for(let i=0;i<14;i++){const a=i*2.4,r=5+(i%4)*4;kit.tree(hub,Math.cos(a)*r,Math.sin(a)*r,.7+(i%3)*.15);}
  shape(world,'cylinder',palette.water??'#5aa3b5',item.x,.25,item.z,4.5,.1,4.5);label(world,item.label,item.x,5,item.z,5);
 }
 else if(item.kind==='docks'){
  box(world,'#806a52',item.x,.35,item.z,42,.7,14);for(let i=-18;i<=18;i+=6)for(const z of [-6,6])box(world,'#5f4d3d',item.x+i,.55,item.z+z,.35,2.2,.35);
  for(let i=0;i<4;i++)box(world,['#b8784d','#6e8a8f','#c39a64','#7b6c58'][i],item.x-12+i*8,1.2,item.z-1,3.6,1.8,3.2);
  label(world,item.label,item.x,6,item.z,5);
 }
}

export function buildConsole(g:any,kit:SceneKit){
 const {world,scene,box,shape,group,label,animate,tree,person,material,geometry,targetAspect}=kit;
 const map=cityMap((g.stage??0)+1),palette=map.palette;
 scene.background=new T.Color(palette.sky);scene.fog=new T.Fog(palette.fog,55,285);
 const camera=new T.PerspectiveCamera(58,targetAspect(),.15,520);camera.position.set(0,10,18);kit.camera=camera;
 if(kit.keyLight){kit.keyLight.color.set(map.id==='pelabuhan-senja'?'#ffd2a2':'#fff0d8');kit.keyLight.intensity=2.7;kit.keyLight.shadow.mapSize.set(2048,2048);kit.keyLight.shadow.camera.left=-60;kit.keyLight.shadow.camera.right=60;kit.keyLight.shadow.camera.top=60;kit.keyLight.shadow.camera.bottom=-60;kit.keyLight.shadow.camera.far=160;}
 scene.background=new T.Color(palette.sky);
 // Tanah kota dan alas laut.
 box(world,palette.ground,0,-.4,0,900,.5,900);
 if(map.water)for(const water of map.water){
  const waterMaterial=new T.MeshStandardMaterial({color:palette.water,roughness:.18,metalness:.12,transparent:true,opacity:.86});
  const plane=new T.Mesh(new T.PlaneGeometry(water.w,water.d),waterMaterial);plane.rotation.x=-Math.PI/2;plane.position.set(water.x,-.02,water.z);plane.userData.ownedMaterial=waterMaterial;world.add(plane);
  const foam=box(world,'#d9eef0',water.x,0,water.z+water.d/2-.4,water.w,.05,.5);foam.material=new T.MeshStandardMaterial({color:'#d9eef0',transparent:true,opacity:.62});foam.material.userData={owned:true};
 }
 // Trotoar, aspal, dan marka.
 for(const road of map.roads){
  addRoadMesh(world,ribbon(road.points,road.width+7,.03),palette.sidewalk,material);
  addRoadMesh(world,joints(road.points,road.width/2+3.5,.032),palette.sidewalk,material);
  addRoadMesh(world,ribbon(road.points,road.width,.06),road.kind==='bridge'?'#4a5058':palette.road,material);
  addRoadMesh(world,joints(road.points,road.width/2,.062),road.kind==='bridge'?'#4a5058':palette.road,material);
  if(road.kind!=='alley')addRoadMesh(world,laneDashes(road),palette.line,material);
  if(road.kind==='bridge')for(const point of road.points.slice(0,-1)){for(const side of [-1,1]){const dx=road.points[1].x-road.points[0].x,dz=road.points[1].z-road.points[0].z,length=Math.hypot(dx,dz)||1;box(world,'#c9c1a6',point.x-dz/length*side*(road.width/2+1.2),1.15,point.z+dx/length*side*(road.width/2+1.2),.35,2.3,.35);}box(world,'#c9c1a6',point.x,2.35,point.z,.35,.35,road.width+2.4);}
 }
 // Taman, alun-alun, dan bukit.
 for(const park of map.parks){
  const color=park.kind==='park'?'#729a64':park.kind==='plaza'?palette.sidewalk:'#8aa878';
  box(world,color,park.x,.045,park.z,park.w,.09,park.d);
  const random=(n:number)=>Math.abs(Math.sin(n*12.9898+park.x*.13)*43758.5453)%1;
  const trees=park.kind==='plaza'?5:12;for(let i=0;i<trees;i++)tree(world,park.x+(random(i)-.5)*park.w*.82,park.z+(random(i+19)-.5)*park.d*.82,.72+random(i+7)*.55);
  if(park.kind==='plaza'){shape(world,'cylinder',palette.sidewalk,park.x,.2,park.z,park.w*.22,.3,park.w*.22);shape(world,'cylinder',palette.water??'#5aa3b5',park.x,.38,park.z,park.w*.16,.06,park.w*.16);}
 }
 for(const hill of map.hills){
  const mound=shape(world,'sphere','#5e7e5d',hill.x,0,hill.z,hill.r,hill.h,hill.r);mound.castShadow=false;mound.receiveShadow=true;
  for(let i=0;i<18;i++){const a=i*2.37,r=(i%5)*hill.r*.15;tree(world,hill.x+Math.cos(a)*r,hill.z+Math.sin(a)*r,.9+(i%3)*.3);}
 }
 // Bangunan: kotak berjendela, atap, dan beberapa model kota.
 const facade=facadeTexture();
 const tints=new Map<number,T.Matrix4[]>(),roofs=new Map<number,T.Matrix4[]>(),details=new Map<string,T.Matrix4[]>(),matrix=new T.Matrix4();
 const hero=map.buildings.slice().sort((a,b)=>b.h-a.h).filter((_,i)=>i%11===0).slice(0,14);
 for(const b of map.buildings){
  matrix.makeRotationY(b.yaw);matrix.setPosition(b.x,b.h/2,b.z);matrix.scale(new T.Vector3(b.w,b.h,b.d));
  if(!tints.has(b.tint))tints.set(b.tint,[]);tints.get(b.tint)!.push(matrix.clone());
  matrix.makeRotationY(b.yaw);matrix.setPosition(b.x,b.h+.2,b.z);matrix.scale(new T.Vector3(b.w*1.06,.45,b.d*1.06));
  if(!roofs.has(b.roof))roofs.set(b.roof,[]);roofs.get(b.roof)!.push(matrix.clone());
  if(b.h>16){
   matrix.makeRotationY(b.yaw);matrix.setPosition(b.x+b.w*.18,b.h+1.1,b.z-b.d*.12);matrix.scale(new T.Vector3(2.2,1.6,2.2));const key='#9aa0a0';if(!details.has(key))details.set(key,[]);details.get(key)!.push(matrix.clone());
  }
 }
 for(const [tint,list] of tints){
  const wallMaterial=new T.MeshStandardMaterial({map:facade,color:palette.walls[tint%palette.walls.length],roughness:.86,metalness:.02});
  const mesh=new T.InstancedMesh(geometry('box'),wallMaterial,list.length);list.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.castShadow=mesh.receiveShadow=true;world.add(mesh);
 }
 for(const [roof,list] of roofs){const mesh=new T.InstancedMesh(geometry('box'),material(palette.roofs[roof%palette.roofs.length]),list.length);list.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.castShadow=mesh.receiveShadow=true;world.add(mesh);}
 for(const [color,list] of details){const mesh=new T.InstancedMesh(geometry('box'),material(color),list.length);list.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.castShadow=mesh.receiveShadow=true;world.add(mesh);}
 const letters=assetChoices('kaykit-city',/^building_[A-H]$/);
 hero.forEach((b,i)=>addAsset(world,letters[i%letters.length],{x:b.x,z:b.z,height:b.h*1.05,maxFootprint:Math.max(b.w,b.d)*1.18,yaw:b.yaw,fallback:[]}));
 // Lampu jalan dan pohon tepi jalan.
 for(const road of map.roads){for(let i=1;i<road.points.length;i++){const a=road.points[i-1],b=road.points[i],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);if(length<30)continue;for(let d=14;d<length-8;d+=46){const x=a.x+dx/length*d,z=a.z+dz/length*d,side=(Math.round(d/46)%2?1:-1),px=x-dz/length*side*(road.width/2+2.2),pz=z+dx/length*side*(road.width/2+2.2);box(world,'#31454c',px,2.3,pz,.18,4.6,.18);const lamp=shape(world,'sphere','#ffe0a0',px,4.7,pz,.32,.24,.32,true);lamp.castShadow=false;}}}
 // Parkir mobil kecil di beberapa ruas.
 const parkCars=assetChoices('kaykit-city',/^car_(sedan|hatchback|taxi|stationwagon)$/);
 let parked=0;for(const road of map.roads){if(road.kind==='bridge')continue;for(let i=1;i<road.points.length&&parked<12;i++){const a=road.points[i-1],b=road.points[i],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);if(length<35)continue;const x=a.x+dx*.55+(-dz/length)*(road.width/2+2.6),z=a.z+dz*.55+(dx/length)*(road.width/2+2.6);addAsset(world,parkCars[parked%parkCars.length],{x,z,height:1.15,yaw:Math.atan2(dx,dz)});parked++;}}
 for(const item of map.landmarks)landmark(kit,map,item,palette);
 // Mobil pemain dengan model kota, plus fallback primitif sebelum aset siap.
 const car=group(world);const fallback=group(car);box(fallback,CAR_COLORS[g.stage%CAR_COLORS.length],0,.62,0,1.9,.58,4);box(fallback,'#dce7e8',0,1.05,-.15,1.62,.52,1.75);for(const x of [-.78,.78])for(const z of [-1.25,1.25]){const wheel=shape(fallback,'cylinder','#293337',x,.36,z,.36,.2,.36);wheel.rotation.z=Math.PI/2;}
 const carAsset=addAsset(car,'kaykit-city/car_sedan',{height:1.38,fallback:[]});
 const glow=box(car,'#ffd88a',0,.06,0,2.5,.05,4.9,);glow.material=new T.MeshStandardMaterial({color:'#ffd88a',emissive:'#ffd88a',emissiveIntensity:1.2,transparent:true,opacity:.3});glow.userData.ownedMaterial=glow.material;
 const headlights=[-1,1].map(side=>{const light=shape(car,'sphere','#fff4cf',side*.62,.7,2.03,.17,.13,.12,true);light.castShadow=false;return light;});
 const taillights=[-1,1].map(side=>{const light=shape(car,'box','#e05a4f',side*.66,.72,-2.02,.28,.15,.08,true);light.castShadow=false;return light;});
 const beacon=shape(car,'sphere','#ffd372',0,1.72,0,.16,.16,.16,true);beacon.castShadow=false;
 // Awan rendah sebagai lapisan kedalaman.
 for(let i=0;i<7;i++){const cloud=group(world);cloud.position.set(Math.sin(i*2.2)*150,42+i*3,Math.cos(i*1.7)*160);for(let j=0;j<3;j++){const puff=shape(cloud,'sphere','#f3f1e8',j*6-6,0,(j%2)*3,7,2.4,4);puff.castShadow=false;}}
 const glowMaterial=glow.material as T.MeshStandardMaterial,obstacles=cityObstacles(map);
 let cameraInit=false;
 animate(world,(state,t,dt)=>{
  const p=state.car;car.position.set(p.x,0,p.z);car.rotation.y=p.heading;
  fallback.visible=!carAsset.userData.assetReady;
  const speed=Math.abs(p.speed||0);
  glowMaterial.opacity=.16+Math.min(.28,speed*.018);
  beacon.visible=Math.floor(t*2.4)%2===0;
  headlights.forEach((light,i)=>{light.material=material('#fff4cf',true);});
  taillights.forEach(light=>{light.material=material('#e05a4f',true);});
  const forward={x:Math.sin(p.heading),z:Math.cos(p.heading)};
  let back=8.8+Math.min(3,speed*.12);const height=4.2+Math.min(1.6,speed*.055);
  while(back>2.7&&insideObstacle(obstacles,p.x-forward.x*back,p.z-forward.z*back,.9))back-=.65;
  const desired={x:p.x-forward.x*back,y:height,z:p.z-forward.z*back};
  if(!cameraInit){camera.position.set(desired.x,desired.y,desired.z);cameraInit=true;}
  const blend=1-Math.exp(-dt*(3.6+speed*.08));
  camera.position.x+=(desired.x-camera.position.x)*blend;camera.position.y+=(desired.y-camera.position.y)*blend;camera.position.z+=(desired.z-camera.position.z)*blend;
  const lookAhead=8+Math.min(8,speed*.3);
  camera.lookAt(p.x+forward.x*lookAhead,1.1,p.z+forward.z*lookAhead);
  camera.fov=56+Math.min(8,speed*.32);camera.updateProjectionMatrix();
  if(kit.keyLight){kit.keyLight.position.set(p.x-28,52,p.z+22);kit.keyLight.target.position.set(p.x,0,p.z);}
  if(map.water){const waterMaterial=world.children.find((child:T.Object3D)=>child.userData.ownedMaterial&&child instanceof T.Mesh&&(child.material as T.MeshStandardMaterial).transparent);if(waterMaterial instanceof T.Mesh)(waterMaterial.material as T.MeshStandardMaterial).opacity=.82+Math.sin(t*.7)*.04;}
 });
}
