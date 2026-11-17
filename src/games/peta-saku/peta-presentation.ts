/** Interpolasi visual mobil; fisika tetap otoritatif di server. */
export class PetaPresentation{
 private frames:{state:any;time:number}[]=[];private identity='';
 push(state:any,time:number,identity:string){
  const previous=this.frames.at(-1)?.state;
  if(identity!==this.identity||previous?.stage!==state.stage||previous&&Math.hypot(previous.car.x-state.car.x,previous.car.z-state.car.z)>8)this.frames=[];
  this.identity=identity;this.frames.push({state,time});while(this.frames.length>8)this.frames.shift();
 }
 sample(time:number){
  if(!this.frames.length)return null;
  const target=time-42;let a=this.frames[0],b=a;
  for(const frame of this.frames){if(frame.time<=target)a=frame;if(frame.time>=target){b=frame;break;}b=frame;}
  const t=a===b?1:Math.max(0,Math.min(1,(target-a.time)/(b.time-a.time)));
  const mix=(from:number,to:number)=>from+(to-from)*t;
  const headingA=a.state.car.heading,headingB=b.state.car.heading,heading=headingA+Math.atan2(Math.sin(headingB-headingA),Math.cos(headingB-headingA))*t;
  return {...b.state,elapsed:mix(a.state.elapsed,b.state.elapsed),car:{...b.state.car,x:mix(a.state.car.x,b.state.car.x),z:mix(a.state.car.z,b.state.car.z),heading,speed:mix(a.state.car.speed,b.state.car.speed),steer:mix(a.state.car.steer,b.state.car.steer)}};
 }
}
