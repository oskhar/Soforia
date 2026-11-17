import {button,axisButton,esc} from '../../shared/html.ts';
import {NavigatorMap} from './peta-navigator.ts';
let latestNavigator:any=null,map:NavigatorMap|null=null,mapCanvas:HTMLCanvasElement|null=null;
let latestState:any=null,latestContext:any=null,pendingRole:'map'|'drive'|null=null,roleSentFor='',roleSentAt=0,roleInstance='';
function audioButton(state:any){return state.you?.host?`<button class="touch-utility" data-do="game-audio" aria-label="${state.soundMuted?'Nyalakan audio game':'Matikan audio game'}" aria-pressed="${!!state.soundMuted}">${state.soundMuted?'♩':'♫'}</button>`:'';}
function isNavigator(state:any){return !!state.game?.rolesLocked&&state.you?.slot===state.game.navigatorSlot;}
function roleLayerMarkup(state:any){
 const chosen=pendingRole,partnerSlot=state.you?.slot===0?1:0,partner=state.players?.[partnerSlot]?.name||`Stick ${partnerSlot===0?'A':'B'}`;
 return `<section class="peta-role-card" role="dialog" aria-modal="true" aria-label="Pilih peran stick">
  <p class="peta-role-eyebrow">PETA SAKU · PILIH STICK</p>
  <h2>Siapa memegang peta?</h2>
  <p class="peta-role-copy">Pilih peran untuk HP ini. Ketukan pertama mengunci kedua stick; ${esc(partner)} langsung mendapat peran sebaliknya.</p>
  <div class="peta-role-options">
   <button class="touch-action peta-role-choice ${chosen==='map'?'chosen':''}" data-do="role" data-value="map" aria-pressed="${chosen==='map'}"><span aria-hidden="true">⌖</span><small><b>HP ini pegang peta</b><em>Pasangan menyetir dan hanya melihat ikon arah.</em></small></button>
   <button class="touch-action peta-role-choice ${chosen==='drive'?'chosen':''}" data-do="role" data-value="drive" aria-pressed="${chosen==='drive'}"><span aria-hidden="true">◉</span><small><b>HP ini menyetir</b><em>Pasangan memegang peta dan memasang pin.</em></small></button>
  </div>
  <p class="peta-role-status">${chosen?`Tersimpan: ${chosen==='map'?'HP ini memegang peta.':'HP ini menyetir.'} ${state.phase==='playing'?'Mengunci peran…':'Aksi dikirim saat hitungan selesai.'}`:'Belum memilih. Mobil tetap diam sampai peran dikunci.'}</p>
 </section>`;
}
function syncRoleOverlay(state:any){
 const screen=document.querySelector<HTMLElement>('.touch-screen[data-game-scope="peta-saku"]');
 if(!screen)return;
 if(state?.gameInstanceId!==roleInstance){roleInstance=state?.gameInstanceId||'';pendingRole=null;roleSentFor='';roleSentAt=0;}
 const relevant=state?.game?.id==='peta-saku'&&state.you&&['countdown','playing'].includes(state.phase)&&!state.game.rolesLocked;
 if(!relevant){screen.querySelector('.peta-role-layer')?.remove();if(state?.game?.rolesLocked)pendingRole=null;return;}
 let layer=screen.querySelector<HTMLElement>('.peta-role-layer');
 if(!layer){layer=document.createElement('div');layer.className='peta-role-layer';screen.append(layer);}
 const signature=JSON.stringify([pendingRole,state.phase,state.players?.map((p:any)=>[p.slot,p.name])]);
 if(layer.dataset.signature!==signature){layer.dataset.signature=signature;layer.innerHTML=roleLayerMarkup(state);}
}
function sendPendingRole(state:any,force=false){
 if(!pendingRole||state?.phase!=='playing'||state.game?.rolesLocked||!latestContext?.act)return;
 const key=`${state.gameInstanceId}:${pendingRole}`,now=Date.now();
 if(!force&&roleSentFor===key&&now-roleSentAt<1500)return;
 roleSentFor=key;roleSentAt=now;latestContext.act('role',pendingRole);
}
export function controller(state:any,personal:any){
 latestState=state;
 const game=state.game,disabled=!!game?.finished,locked=!!game?.rolesLocked,navigator=isNavigator(state);
 latestNavigator=navigator?personal:null;
 if(!locked)return {
  buttons:'',utilities:audioButton(state),analogDisabled:true,analogLabel:'Pilih peran',caption:'',actionClass:'',attributes:''
 };
 if(navigator)return {
  buttons:button('pin','Pin','⌖',disabled,'accent peta-pin-key')+button('clear-pin','Hapus','⌫',disabled||!personal?.pin)+button('map-focus','Fokus','◎',disabled),
  utilities:`<button class="touch-utility" data-do="map-zoom-in" aria-label="Perbesar peta">+</button><button class="touch-utility" data-do="map-zoom-out" aria-label="Perkecil peta">−</button><button class="touch-utility" data-do="map-fit" aria-label="Muat seluruh rute">⤢</button>${audioButton(state)}`,
  analogDisabled:true,analogLabel:'Peta navigator',caption:'PETA NAVIGATOR',actionClass:'peta-navigator-actions',attributes:'data-peta-role="navigator"'
 };
 return {
  buttons:axisButton('throttle',1,'Gas','▲',disabled,'peta-gas')+axisButton('brake',1,'Rem','▼',disabled,'peta-brake')+button('horn','Klakson','♪',disabled,'accent peta-horn'),
  utilities:'<button class="touch-utility" data-do="recover" aria-label="Tarik mobil ke jalan">⇱</button>'+audioButton(state),
  analogDisabled:disabled,analogLabel:'Kemudi mobil',caption:'KEMUDI',actionClass:'peta-driver-actions',attributes:'data-peta-role="driver"'
 };
}
export function syncController(state:any,connected:boolean,muted:boolean){
 latestState=state;
 const button=document.querySelector<HTMLButtonElement>('[data-do=game-audio]');if(button){button.setAttribute('aria-pressed',String(!!state.soundMuted));button.setAttribute('aria-label',state.soundMuted?'Nyalakan audio game':'Matikan audio game');button.textContent=state.soundMuted?'♩':'♫';}
 syncRoleOverlay(state);
 sendPendingRole(state);
 const navigator=isNavigator(state);
 const screen=document.querySelector<HTMLElement>('.touch-screen[data-game-scope="peta-saku"]');
 if(!navigator||state.phase!=='playing'||!latestNavigator?.route||!screen){destroyMap();return;}
 let layer=screen.querySelector<HTMLElement>('.peta-navigator-layer');
 if(!layer){layer=document.createElement('div');layer.className='peta-navigator-layer';layer.innerHTML='<canvas class="peta-navigator-canvas" aria-label="Peta navigator: rute, mobil, dan pin"></canvas>';screen.prepend(layer);}
 const canvas=layer.querySelector('canvas')!;
 if(!map||mapCanvas!==canvas){map?.destroy();mapCanvas=canvas;map=new NavigatorMap(canvas);}
 map.setData(latestNavigator,state.game,state.game.stage+1);
}
function destroyMap(){document.querySelector('.peta-navigator-layer')?.remove();map?.destroy();map=null;mapCanvas=null;}
export function control(action:string,value:unknown,context:any){
 latestContext=context;
 if(action==='role'&&(value==='map'||value==='drive')){
  if(latestState?.game?.rolesLocked)return true;
  pendingRole=value;
  if(latestState?.phase==='playing')sendPendingRole(latestState,true);
  syncRoleOverlay(latestState);
  return true;
 }
 if(action==='game-audio'){context.send('audio.toggle');return true;}
 if(action==='pin'){const point=map?.centerWorld();if(point)context.act('pin',point);return true;}
 if(action==='clear-pin'){context.act('clear-pin');return true;}
 if(action==='map-focus'){map?.focusCar();return true;}
 if(action==='map-fit'){map?.fitRoute();return true;}
 if(action==='map-zoom-in'||action==='map-zoom-out'){map?.zoomCenter(action==='map-zoom-in'?1.35:1/1.35);return true;}
 return false;
}
export function leave(){destroyMap();latestNavigator=null;latestState=null;latestContext=null;pendingRole=null;roleSentFor='';roleSentAt=0;roleInstance='';}
