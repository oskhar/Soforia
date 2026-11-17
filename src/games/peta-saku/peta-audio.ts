/** Mesin, klakson, dan isyarat navigasi disintesis lokal tanpa sampel jaringan. */
export class PetaAudio{
 private context?:AudioContext;private master?:GainNode;private engine?:GainNode;private filter?:BiquadFilterNode;private oscillators:OscillatorNode[]=[];private muted=false;private enabled=false;private lastPinAt=0;private lastHornAt=0;private lastWrong=0;private lastRecover=0;private lastElapsed=0;
 unlock(){
  try{this.context??=new AudioContext();if(!this.master){this.master=this.context.createGain();this.master.connect(this.context.destination);}
   if(!this.engine){this.engine=this.context.createGain();this.filter=this.context.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=360;this.engine.gain.value=0;this.engine.connect(this.filter);this.filter.connect(this.master);
    for(const [type,detune] of [['sawtooth',-7],['triangle',7]] as const){const oscillator=this.context.createOscillator();oscillator.type=type;oscillator.detune.value=detune;oscillator.frequency.value=54;oscillator.connect(this.engine);oscillator.start();this.oscillators.push(oscillator);}
   }
   if(this.context.state==='suspended')void this.context.resume().catch(()=>{});
  }catch{}
 }
 setMuted(muted:boolean){this.muted=muted;this.gain();}
 private gain(){if(this.master&&this.context)this.master.gain.setTargetAtTime(this.enabled&&!this.muted ? .34 : 0,this.context.currentTime,.06);}
 update(previous:any,next:any,muted:boolean){
  this.enabled=!!next?.game&&next.game.id==='peta-saku'&&['playing','results'].includes(next.phase)&&!document.hidden;this.setMuted(muted);
  if(!this.enabled){if(this.engine&&this.context)this.engine.gain.setTargetAtTime(0,this.context.currentTime,.08);return;}
  this.unlock();this.gain();const g=next.game,before=previous?.game;
  const speed=Math.abs(g.car.speed||0),now=this.context?.currentTime??0;
  if(this.engine&&this.filter&&this.context){this.engine.gain.setTargetAtTime(.035+Math.min(.05,speed*.0035),now,.05);this.filter.frequency.setTargetAtTime(260+speed*26,now,.08);this.oscillators.forEach((oscillator,i)=>oscillator.frequency.setTargetAtTime(44+speed*4.6+(i?7:0),now,.08));}
  if(!before||before.id!=='peta-saku'||previous.gameInstanceId!==next.gameInstanceId){this.lastPinAt=g.pinAge?g.elapsed-g.pinAge:0;this.lastHornAt=g.hornAt||0;this.lastWrong=g.wrongTurns||0;this.lastRecover=g.recoveries||0;this.lastElapsed=g.elapsed;return;}
  if(g.hornAt&&g.hornAt!==this.lastHornAt){this.lastHornAt=g.hornAt;this.effect('horn');}
  if(g.pinSet&&g.pinAge<.2&&this.lastPinAt!==g.elapsed){this.lastPinAt=g.elapsed;this.effect('pin');}
  if(g.wrongTurns>this.lastWrong){this.lastWrong=g.wrongTurns;this.effect('wrong');}else this.lastWrong=g.wrongTurns;
  if(g.recoveries>this.lastRecover){this.lastRecover=g.recoveries;this.effect('recover');}else this.lastRecover=g.recoveries;
  if(next.phase==='results'&&previous.phase!=='results')this.effect('finish');
  this.lastElapsed=g.elapsed;
 }
 private effect(kind:string){
  const c=this.context;if(!c||!this.master||c.state!=='running'||this.muted)return;
  const at=c.currentTime;
  if(kind==='horn'){[392,523].forEach((frequency,index)=>{const oscillator=c.createOscillator(),gain=c.createGain();oscillator.type='square';oscillator.frequency.value=frequency;gain.gain.setValueAtTime(.0001,at);gain.gain.linearRampToValueAtTime(.055,at+.012);gain.gain.setValueAtTime(.05,at+.16);gain.gain.exponentialRampToValueAtTime(.0001,at+.34);oscillator.connect(gain);gain.connect(this.master!);oscillator.start(at+index*.01);oscillator.stop(at+.36);});}
  else if(kind==='pin'){[740,988].forEach((frequency,index)=>{const oscillator=c.createOscillator(),gain=c.createGain();oscillator.type='sine';oscillator.frequency.value=frequency;gain.gain.setValueAtTime(.0001,at+index*.07);gain.gain.linearRampToValueAtTime(.055,at+index*.07+.01);gain.gain.exponentialRampToValueAtTime(.0001,at+index*.07+.18);oscillator.connect(gain);gain.connect(this.master!);oscillator.start(at+index*.07);oscillator.stop(at+index*.07+.2);});}
  else if(kind==='wrong'){const oscillator=c.createOscillator(),gain=c.createGain();oscillator.type='sawtooth';oscillator.frequency.setValueAtTime(190,at);oscillator.frequency.exponentialRampToValueAtTime(95,at+.24);gain.gain.setValueAtTime(.045,at);gain.gain.exponentialRampToValueAtTime(.0001,at+.26);oscillator.connect(gain);gain.connect(this.master);oscillator.start(at);oscillator.stop(at+.28);}
  else if(kind==='recover'){[330,247].forEach((frequency,index)=>{const oscillator=c.createOscillator(),gain=c.createGain();oscillator.type='triangle';oscillator.frequency.value=frequency;gain.gain.setValueAtTime(.0001,at+index*.09);gain.gain.linearRampToValueAtTime(.04,at+index*.09+.01);gain.gain.exponentialRampToValueAtTime(.0001,at+index*.09+.15);oscillator.connect(gain);gain.connect(this.master!);oscillator.start(at+index*.09);oscillator.stop(at+index*.09+.17);});}
  else if(kind==='finish'){[523,659,784,1047,1319].forEach((frequency,index)=>{const oscillator=c.createOscillator(),gain=c.createGain();oscillator.type='triangle';oscillator.frequency.value=frequency;gain.gain.setValueAtTime(.0001,at+index*.09);gain.gain.linearRampToValueAtTime(.07,at+index*.09+.012);gain.gain.exponentialRampToValueAtTime(.0001,at+index*.09+.3);oscillator.connect(gain);gain.connect(this.master!);oscillator.start(at+index*.09);oscillator.stop(at+index*.09+.32);});}
 }
 stop(){this.enabled=false;this.gain();this.oscillators.forEach(oscillator=>{try{oscillator.stop();}catch{}});this.oscillators=[];void this.context?.close();this.context=undefined;this.master=undefined;this.engine=undefined;this.filter=undefined;}
}
