import {badge, esc} from '../../shared/html.ts';
import {cupById, flavorById, tempById} from './cafe-levels.ts';

const clock = (value: number) => `${String(Math.floor(Math.max(0, value) / 60)).padStart(2, '0')}:${String(Math.floor(Math.max(0, value) % 60)).padStart(2, '0')}`;
const statusLabel = (status: string) => status === 'served' ? 'terlayani' : status === 'vanishing' ? 'menghilang' : 'menunggu';

export function hud(state: any) {
  const g = state.game;
  const active = g.customers?.find((customer: any) => customer.table === g.activeTable);
  const lastStory = [...(g.customers || [])].reverse().find((customer: any) => customer.story);
  const time = g.challenge && g.targetTime ? `${clock(g.elapsed)} / ${clock(g.targetTime)}` : clock(g.elapsed);
  const prepared = g.prepared ? `${flavorById(g.prepared.flavor).label} · ${tempById(g.prepared.temp).short} · ${cupById(g.prepared.cup).short}` : 'Baki kosong';
  return `<div class="kafe-hud">
    <div class="kafe-hud-top">
      <div class="kafe-crest">
        <span class="kafe-crest-mark" aria-hidden="true">☕</span>
        <div><small>${esc(g.roomLabel)} · ${g.challenge ? 'TANTANGAN' : 'SANTAI'}</small><strong>${esc(g.levelTitle)}</strong><em>${esc(g.levelSubtitle)}</em></div>
      </div>
      <div class="kafe-hud-stats">
        ${badge('TERLAYANI', `${g.served} / ${g.total}`)}
        ${badge('SAJIAN KELIRU', String(g.mistakes))}
        ${badge(g.challenge ? 'WAKTU / TARGET' : 'WAKTU', time)}
      </div>
    </div>
    <div class="kafe-hud-middle">
      <div class="kafe-active-card ${active ? 'has-active' : ''}">
        <small>${active ? `MEJA ${active.table} DITANDAI` : 'BELUM ADA MEJA'}</small>
        <strong>${active ? esc(active.name) : 'Pembaca jejak memilih meja'}</strong>
        <span>${active ? (active.status === 'vanishing' ? 'Tamu menghilang lembut; pesanan akan kembali.' : active.status === 'served' ? 'Sudah terlayani.' : 'Barista menyiapkan minuman untuk meja ini.') : 'Denah dan jejak ada di HP pembaca.'}</span>
      </div>
      <div class="kafe-message">${esc(g.message)}</div>
      <div class="kafe-ticket">
        <small>BAKI BARISTA</small>
        <strong>${esc(prepared)}</strong>
        <span>${g.prepared ? 'Siap disajikan ke meja bertanda.' : 'Pilih rasa, suhu, dan cangkir di HP A.'}</span>
      </div>
    </div>
    <div class="kafe-hud-bottom">
      <div class="kafe-customer-rail" aria-label="Status meja pelanggan">
        ${(g.customers || []).map((customer: any) => `<div class="kafe-table-chip ${customer.table === g.activeTable ? 'active' : ''} ${customer.status}" title="Meja ${customer.table}: ${statusLabel(customer.status)}">
          <b>${customer.table}</b><span>${customer.status === 'served' ? '✓' : customer.status === 'vanishing' ? '…' : '◌'}</span><small>${statusLabel(customer.status)}</small>
        </div>`).join('')}
      </div>
      <div class="kafe-story ${lastStory ? 'has-story' : ''}">
        <small>${lastStory ? `CERITA TERBUKA · ${esc(lastStory.name)}` : 'CATATAN KAFE'}</small>
        <p>${lastStory ? esc(lastStory.story) : 'Petunjuk pesanan hanya ada di HP pembaca jejak. Warna selalu disertai pola, suhu, dan bentuk cangkir.'}</p>
      </div>
    </div>
    <div class="kafe-hud-legend"><span><b>A</b> barista · pilih & tuang</span><span><b>B</b> pembaca · tandai & dengarkan</span><span>tanpa jumpscare · tanpa data pribadi</span></div>
  </div>`;
}
