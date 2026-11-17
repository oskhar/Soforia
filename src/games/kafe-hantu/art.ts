export function art(){
  return `<div class="art kafe-art" aria-hidden="true">
    <div class="kafe-art-sky"></div>
    <div class="kafe-art-moon"></div>
    <div class="kafe-art-stars">${Array.from({length: 18}, (_, i) => `<i class="kafe-star-${i}"></i>`).join('')}</div>
    <div class="kafe-art-window"><span></span><span></span><span></span><b></b></div>
    <div class="kafe-art-shelf"><i></i><i></i><i></i><i></i><i></i></div>
    <div class="kafe-art-counter"></div>
    <div class="kafe-art-lamp l1"></div><div class="kafe-art-lamp l2"></div><div class="kafe-art-lamp l3"></div>
    <div class="kafe-art-ghost g1"><span>☾</span></div>
    <div class="kafe-art-ghost g2"><span>✦</span></div>
    <div class="kafe-art-table"><div class="kafe-art-cup"><i></i><b></b></div><small>meja 03</small></div>
    <div class="kafe-art-copy"><small>SHIFT MALAM · 6 TAMU HALUS</small><strong>Kafe<br>Hantu</strong><span>Baca jejak. Tuang pelan. Layani yang tak terlihat.</span></div>
  </div>`;
}
