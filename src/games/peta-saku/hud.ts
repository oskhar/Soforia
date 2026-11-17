import {esc,badge} from '../../shared/html.ts';
const clock=(value:number)=>`${String(Math.floor(value/60)).padStart(2,'0')}:${String(Math.floor(value%60)).padStart(2,'0')}`;
export function hud(state:any){
 const g=state.game,speed=Math.round(Math.abs(g.car.speed)*3.6),gear=g.car.speed<-.25?'R':Math.abs(g.car.speed)<.25?'N':'D';
 const relative=g.pinSet?Math.atan2(Math.sin(g.pinBearing-g.car.heading),Math.cos(g.pinBearing-g.car.heading)):0;
 const degrees=Math.round(relative*180/Math.PI);
 const fuel=Math.max(0,Math.min(100,Math.round(g.fuel)));
 const time=g.challenge?`${clock(g.elapsed)} / ${clock(g.targetTime)}`:clock(g.elapsed);
 return `<div class="peta-hud">
  ${!g.rolesLocked?'<div class="peta-role-wait">Pilih peran di kedua HP: satu memegang peta, satu menyetir. Mobil menunggu sampai peran dikunci.</div>':''}
  <div class="peta-hud-top">
   <div class="hud-scoreboard">${badge('KOTA',g.cityTitle)}${badge(g.challenge?'TARGET':'WAKTU',time)}</div>
   <div class="peta-hud-badges">${badge('SALAH BELOK',String(g.wrongTurns))}${g.challenge?badge('BAHAN BAKAR',`${fuel}%`):'<span class="hud-stat peta-relaxed"><small>MODE</small><strong>Santai</strong></span>'}</div>
  </div>
  <div class="peta-pin ${g.pinSet?'active':''}">
   <div class="peta-pin-dial"><svg class="peta-pin-arrow" viewBox="0 0 40 40" aria-hidden="true"><path d="M20 4 31 31 20 25 9 31Z" transform="rotate(${degrees} 20 20)"/></svg></div>
   <div class="peta-pin-copy"><small>${g.pinSet?'PIN NAVIGATOR':'MENUNGGU PIN'}</small><strong>${g.pinSet?`${Math.round(g.pinDistance)} m`:'Tunggu arahan'}</strong><span>${g.pinSet?'Ikuti ikon arah, bukan peta.':'Navigator memegang satu-satunya peta.'}</span></div>
  </div>
  <div class="peta-hud-bottom">
   <div class="peta-speedo"><span class="peta-speed-gear">${gear}</span><b>${speed}</b><small>KM/J</small></div>
   <div class="peta-message">${esc(g.message)}</div>
   <div class="peta-meters">${g.challenge?`<span>${Math.round(g.progress)} / ${Math.round(g.routeLength)} m</span><span>${g.recoveries} derek</span>`:`<span>${(g.distance/1000).toFixed(1)} km</span><span>${g.recoveries} derek</span>`}</div>
  </div>
  ${g.challenge?`<progress class="peta-fuel" max="100" value="${fuel}" aria-label="Bahan bakar ${fuel}%"></progress>`:''}
 </div>`;
}
