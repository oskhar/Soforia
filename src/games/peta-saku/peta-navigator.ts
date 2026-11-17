import {cityMap,type CityMap,type CityPoint} from './peta-city.ts';

type NavigatorData={cityId?:string;route?:{path:CityPoint[];steps:{point:CityPoint;s:number;instruction:string;street:string;sign:string}[];length:number;goal:CityPoint};pin?:{x:number;z:number}|null;nextStep?:{point:CityPoint;s:number;instruction:string;street:string;sign:string};segment?:number};
type GameView={car:{x:number;z:number;heading:number;speed:number};elapsed:number;pinSet:boolean;pinBearing:number;pinDistance:number;wrongTurns:number;segment:number;segments:number};
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
export class NavigatorMap{
 private canvas:HTMLCanvasElement;private ctx:CanvasRenderingContext2D;private city:CityMap;private data:NavigatorData={};private game:GameView|null=null;
 private view={x:0,z:0,scale:1};private cityId='';private trail:CityPoint[]=[];private pointers=new Map<number,{x:number;y:number}>();
 private frame=0;private lastTrail:CityPoint|null=null;private dragging=false;private moved=0;private pinch=0;private disposed=false;private fitted=false;
 constructor(canvas:HTMLCanvasElement){this.canvas=canvas;this.ctx=canvas.getContext('2d')!;this.city=cityMap(1);this.attach();this.frame=requestAnimationFrame(this.loop);}
 private attach(){
  const c=this.canvas;
  c.addEventListener('pointerdown',event=>{c.setPointerCapture(event.pointerId);this.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});this.dragging=this.pointers.size===1;this.moved=0;this.pinch=this.pinchDistance();event.preventDefault();});
  c.addEventListener('pointermove',event=>{
   const previous=this.pointers.get(event.pointerId);if(!previous)return;const dx=event.clientX-previous.x,dy=event.clientY-previous.y;this.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
   if(this.pointers.size>=2){const distance=this.pinchDistance();if(this.pinch>0&&distance>0)this.zoomAt(distance/this.pinch,event.clientX,event.clientY);this.pinch=distance;this.moved+=Math.abs(dx)+Math.abs(dy);}
   else if(this.dragging){this.view.x-=dx/this.view.scale;this.view.z+=dy/this.view.scale;this.moved+=Math.abs(dx)+Math.abs(dy);}
   event.preventDefault();
  });
  const release=(event:PointerEvent)=>{this.pointers.delete(event.pointerId);if(this.pointers.size<2)this.pinch=0;if(this.pointers.size===0){if(this.moved<8&&this.dragging){const rect=c.getBoundingClientRect(),point=this.toWorld(event.clientX-rect.left,event.clientY-rect.top);this.view.x=point.x;this.view.z=point.z;}this.dragging=false;}event.preventDefault();};
  c.addEventListener('pointerup',release);c.addEventListener('pointercancel',release);c.addEventListener('pointerleave',release);
  c.addEventListener('wheel',event=>{event.preventDefault();this.zoomAt(Math.exp(-event.deltaY*.0015),event.clientX,event.clientY);},{passive:false});
 }
 private pinchDistance(){if(this.pointers.size<2)return 0;const [a,b]=[...this.pointers.values()];return Math.hypot(a.x-b.x,a.y-b.y);}
 private zoomAt(factor:number,clientX:number,clientY:number){
  const rect=this.canvas.getBoundingClientRect(),before=this.toWorld(clientX-rect.left,clientY-rect.top);
  this.view.scale=clamp(this.view.scale*factor,.18,9);const after=this.toWorld(clientX-rect.left,clientY-rect.top);
  this.view.x+=before.x-after.x;this.view.z+=before.z-after.z;
 }
 private toWorld(x:number,y:number){return {x:this.view.x+(x-this.canvas.clientWidth/2)/this.view.scale,z:this.view.z-(y-this.canvas.clientHeight/2)/this.view.scale};}
 private screen(point:CityPoint){return {x:this.canvas.clientWidth/2+(point.x-this.view.x)*this.view.scale,y:this.canvas.clientHeight/2-(point.z-this.view.z)*this.view.scale};}
 setData(data:NavigatorData,game:GameView,level:number){
  const id=data.cityId??'';if(id!==this.cityId){this.cityId=id;this.city=cityMap(level);this.trail=[];this.fitted=false;}
  this.data=data;this.game=game;
  if(!this.fitted&&data.route){this.fitRoute();this.fitted=true;}
  const car=game.car;if(!this.lastTrail||Math.hypot(car.x-this.lastTrail.x,car.z-this.lastTrail.z)>2.2){this.trail.push({x:car.x,z:car.z});this.lastTrail={x:car.x,z:car.z};if(this.trail.length>700)this.trail.shift();}
 }
 fitRoute(){const path=this.data.route?.path;if(!path?.length)return;let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;for(const p of path){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minZ=Math.min(minZ,p.z);maxZ=Math.max(maxZ,p.z);}const w=this.canvas.clientWidth||360,h=this.canvas.clientHeight||640;this.view.x=(minX+maxX)/2;this.view.z=(minZ+maxZ)/2;this.view.scale=clamp(Math.min(w/(maxX-minX+80),h/(maxZ-minZ+140))*.88,.18,3.2);}
 focusCar(){if(!this.game)return;this.view.x=this.game.car.x;this.view.z=this.game.car.z;this.view.scale=clamp(Math.max(this.view.scale,1.25),.3,4);}
 zoomCenter(factor:number){this.view.scale=clamp(this.view.scale*factor,.18,9);}
 centerWorld(){return {x:this.view.x,z:this.view.z};}
 private loop=()=>{if(this.disposed)return;this.draw();this.frame=requestAnimationFrame(this.loop);};
 destroy(){this.disposed=true;cancelAnimationFrame(this.frame);this.pointers.clear();}
 private draw(){
  const canvas=this.canvas,ratio=Math.min(2,window.devicePixelRatio||1),w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight);
  if(canvas.width!==Math.round(w*ratio)||canvas.height!==Math.round(h*ratio)){canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);}
  const c=this.ctx;c.setTransform(ratio,0,0,ratio,0,0);c.clearRect(0,0,w,h);
  const palette=this.city.palette;c.fillStyle='#17262c';c.fillRect(0,0,w,h);
  c.fillStyle='#1e3338';c.fillRect(0,0,w,h);
  const water=this.city.water;if(water)for(const item of water){const a=this.screen({x:item.x-item.w/2,z:item.z+item.d/2}),b=this.screen({x:item.x+item.w/2,z:item.z-item.d/2});c.fillStyle=palette.water??'#2f7183';c.fillRect(a.x,a.y,b.x-a.x,b.y-a.y);}
  for(const park of this.city.parks){const a=this.screen({x:park.x-park.w/2,z:park.z+park.d/2}),b=this.screen({x:park.x+park.w/2,z:park.z-park.d/2});c.fillStyle=park.kind==='park'?'#45694c':park.kind==='plaza'?'#8a806c':'#4d7052';c.fillRect(a.x,a.y,b.x-a.x,b.y-a.y);}
  for(const hill of this.city.hills){const p=this.screen(hill);c.beginPath();c.arc(p.x,p.y,hill.r*this.view.scale,0,Math.PI*2);c.fillStyle='#4e6d4f';c.fill();c.strokeStyle='#6d8a62';c.lineWidth=2;c.stroke();}
  // Bangunan sebagai blok peta.
  for(const b of this.city.buildings){const p=this.screen({x:b.x,z:b.z}),bw=b.w*this.view.scale,bh=b.d*this.view.scale;if(p.x+bw<0||p.x-bw>w||p.y+bh<0||p.y-bh>h)continue;c.fillStyle=palette.walls[b.tint%palette.walls.length];c.globalAlpha=.82;c.fillRect(p.x-bw/2,p.y-bh/2,bw,bh);c.globalAlpha=1;c.strokeStyle='#1b2a2e';c.lineWidth=Math.max(.5,this.view.scale*.12);c.strokeRect(p.x-bw/2,p.y-bh/2,bw,bh);}
  // Trotoar dan jalan.
  for(const road of this.city.roads){c.beginPath();road.points.forEach((point,index)=>{const p=this.screen(point);index?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);});c.strokeStyle=palette.sidewalk;c.lineWidth=Math.max(2,(road.width+7)*this.view.scale);c.lineCap='round';c.lineJoin='round';c.stroke();}
  for(const road of this.city.roads){c.beginPath();road.points.forEach((point,index)=>{const p=this.screen(point);index?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);});c.strokeStyle=road.kind==='bridge'?'#5b626b':palette.road;c.lineWidth=Math.max(1.2,road.width*this.view.scale);c.lineCap='round';c.lineJoin='round';c.stroke();if(this.view.scale>.55){c.setLineDash([5,9]);c.strokeStyle=palette.line;c.lineWidth=Math.max(.6,this.view.scale*.28);c.stroke();c.setLineDash([]);}}
  // Jejak perjalanan.
  if(this.trail.length>1){c.beginPath();this.trail.forEach((point,index)=>{const p=this.screen(point);index?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);});c.strokeStyle='#d9f0ed88';c.lineWidth=Math.max(1.5,this.view.scale*.45);c.lineCap='round';c.stroke();}
  // Rute navigator.
  const route=this.data.route;
  if(route?.path.length){
   c.beginPath();route.path.forEach((point,index)=>{const p=this.screen(point);index?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);});
   c.strokeStyle='#122326';c.lineWidth=Math.max(5,this.view.scale*1.8);c.lineCap='round';c.lineJoin='round';c.stroke();
   c.strokeStyle='#f0b45e';c.lineWidth=Math.max(2.2,this.view.scale*.85);c.stroke();
   c.setLineDash([4,8]);c.strokeStyle='#ffe7b0';c.lineWidth=Math.max(1,this.view.scale*.24);c.stroke();c.setLineDash([]);
   for(const step of route.steps.slice(1,-1)){const p=this.screen(step.point);c.fillStyle='#f3d493';c.beginPath();c.arc(p.x,p.y,Math.max(2.2,this.view.scale*.32),0,Math.PI*2);c.fill();}
  }
  // Nama jalan utama.
  if(this.view.scale>.6)for(const road of this.city.roads.filter((_,i)=>i%3===0)){const mid=road.points[Math.floor(road.points.length/2)],p=this.screen(mid);if(p.x<0||p.x>w||p.y<0||p.y>h)continue;const a=this.screen(road.points[0]),b=this.screen(road.points.at(-1)!);let angle=Math.atan2(b.y-a.y,b.x-a.x);if(angle>Math.PI/2)angle-=Math.PI;if(angle<-Math.PI/2)angle+=Math.PI;c.save();c.translate(p.x,p.y);c.rotate(angle);c.fillStyle='#f5ebd6b8';c.font='600 9px system-ui';c.textAlign='center';c.fillText(road.name,0,-5);c.restore();}
  // Ikon landmark.
  for(const item of this.city.landmarks){const p=this.screen(item);if(p.x<-30||p.x>w+30||p.y<-30||p.y>h+30)continue;c.fillStyle='#f2d18d';c.beginPath();c.arc(p.x,p.y,4.2,0,Math.PI*2);c.fill();c.fillStyle='#f2d18d';c.font='600 9px system-ui';c.textAlign='center';c.fillText(item.label,p.x,p.y-8);}
  // Pin navigator.
  const pin=this.data.pin;if(pin){const p=this.screen(pin);c.fillStyle='#ff8c6c';c.beginPath();c.arc(p.x,p.y-8,8,0,Math.PI*2);c.fill();c.beginPath();c.moveTo(p.x-6,p.y-4);c.lineTo(p.x+6,p.y-4);c.lineTo(p.x,p.y+7);c.closePath();c.fill();c.strokeStyle='#ffe3d7';c.lineWidth=2;c.beginPath();c.arc(p.x,p.y-8,12+Math.sin(Date.now()/280)*2.2,0,Math.PI*2);c.stroke();}
  // Tujuan.
  if(route){const p=this.screen(route.goal);c.strokeStyle='#ffe6a7';c.lineWidth=2.4;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x,p.y-22);c.stroke();c.fillStyle='#f5c96c';c.beginPath();c.moveTo(p.x,p.y-22);c.lineTo(p.x+15,p.y-17);c.lineTo(p.x,p.y-11);c.closePath();c.fill();c.fillStyle='#ffe9b7';c.font='700 9px system-ui';c.textAlign='center';c.fillText('TUJUAN',p.x,p.y+14);}
  // Mobil.
  if(this.game){const car=this.game.car,p=this.screen(car);c.save();c.translate(p.x,p.y);c.rotate(car.heading);c.fillStyle='#9fe1e8';c.strokeStyle='#17363c';c.lineWidth=2;c.beginPath();c.moveTo(0,-11);c.lineTo(7,7);c.lineTo(0,3);c.lineTo(-7,7);c.closePath();c.fill();c.stroke();c.restore();c.strokeStyle='#a8e8ee55';c.lineWidth=1.5;c.beginPath();c.arc(p.x,p.y,15,0,Math.PI*2);c.stroke();}
  // Reticle pusat: tempat Pin dipasang.
  c.strokeStyle='#f6e6c6aa';c.lineWidth=1.4;c.beginPath();c.arc(w/2,h/2,14,0,Math.PI*2);c.moveTo(w/2-22,h/2);c.lineTo(w/2-8,h/2);c.moveTo(w/2+8,h/2);c.lineTo(w/2+22,h/2);c.moveTo(w/2,h/2-22);c.lineTo(w/2,h/2-8);c.moveTo(w/2,h/2+8);c.lineTo(w/2,h/2+22);c.stroke();
  // Judul dan petunjuk berikutnya.
  const next=this.data.nextStep;c.fillStyle='#122226dd';c.beginPath();c.rect(Math.max(12,w*.06),52,w-Math.max(24,w*.12),58);c.fill();c.strokeStyle='#f0c17266';c.lineWidth=1;c.stroke();
  c.fillStyle='#e9c88b';c.font='700 9px system-ui';c.textAlign='left';c.fillText('PETUNJUK NAVIGATOR',Math.max(24,w*.06+12),72);
  c.fillStyle='#fff3d8';c.font='700 16px system-ui';c.fillText(next?`${next.instruction} · ${next.street}`:'Ikuti rute kuning',Math.max(24,w*.06+12),94);
  const goalDistance=this.game&&route?Math.round(Math.hypot(this.game.car.x-route.goal.x,this.game.car.z-route.goal.z)):0;
  c.fillStyle='#d6e1da';c.font='500 10px system-ui';c.fillText(`${this.city.title} · ${goalDistance} m ke tujuan`,Math.max(24,w*.06+12),108);
  // Kompas dan skala.
  c.strokeStyle='#f3e6c9';c.fillStyle='#f3e6c9';c.lineWidth=1.5;c.beginPath();c.arc(26,h-30,12,0,Math.PI*2);c.stroke();c.beginPath();c.moveTo(26,h-38);c.lineTo(30,h-27);c.lineTo(26,h-30);c.lineTo(22,h-27);c.closePath();c.fill();c.font='700 8px system-ui';c.textAlign='center';c.fillText('U',26,h-19);
  const bar=100*this.view.scale;c.strokeStyle='#f3e6c9cc';c.lineWidth=1.5;c.beginPath();c.moveTo(w-24-bar,h-26);c.lineTo(w-24,h-26);c.stroke();c.fillStyle='#f3e6c9';c.font='600 9px system-ui';c.textAlign='right';c.fillText('100 m',w-24,h-33);
 }
}
