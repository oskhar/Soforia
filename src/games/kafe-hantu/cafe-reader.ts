import {esc} from '../../shared/html.ts';
import {cafeLevel} from './cafe-levels.ts';

export function chooseReaderFocus(reader: any, activeTable: number | null, current: number | null) {
  const tables = reader?.tables || [];
  if (tables.some((table: any) => table.table === current)) return current;
  if (tables.some((table: any) => table.table === activeTable && table.status === 'waiting')) return activeTable;
  return tables.find((table: any) => table.status === 'waiting')?.table ?? tables[0]?.table ?? null;
}

function statusText(status: string) {
  return status === 'served' ? 'terlayani' : status === 'vanishing' ? 'menghilang lembut' : 'menunggu';
}

export function readerLayerMarkup(state: any, reader: any, focusTable: number | null) {
  const game = state.game;
  const level = cafeLevel((game?.stage ?? 0) + 1);
  const tables = reader?.tables || [];
  const focus = tables.find((table: any) => table.table === focusTable) || tables[0];
  const activeTable = game?.activeTable;
  const clues = focus?.clues || [];
  const active = focus?.table === activeTable;
  return `<div class="kafe-reader-head">
      <div><small>PEMBACA JEJAK · ${esc(level.roomLabel)}</small><strong>Denah bayangan</strong></div>
      <span class="kafe-reader-progress">${game.served}/${game.total} tamu</span>
    </div>
    <div class="kafe-reader-plan" role="group" aria-label="Pilih meja untuk membaca jejak">
      <div class="kafe-plan-counter" aria-hidden="true"><span>BAR</span></div>
      ${level.spots.map(spot => {
        const table = tables.find((item: any) => item.table === spot.table);
        return `<button type="button" class="kafe-plan-table kafe-spot-${spot.table} ${table?.status || 'empty'} ${focus?.table === spot.table ? 'focused' : ''} ${activeTable === spot.table ? 'marked' : ''}" data-kafe-table="${spot.table}" aria-label="Meja ${spot.table}, ${table ? statusText(table.status) : 'kosong'}${activeTable === spot.table ? ', ditandai' : ''}" ${table ? '' : 'disabled'}>
          <span class="kafe-plan-ghost" aria-hidden="true">${table?.status === 'served' ? '✓' : table?.status === 'vanishing' ? '…' : '◌'}</span>
          <b>${spot.table}</b>
          ${activeTable === spot.table ? '<i>ditandai</i>' : ''}
        </button>`;
      }).join('')}
      <div class="kafe-plan-hint">Ketuk meja untuk membaca jejak. Tombol <b>Tandai</b> mengirim meja ke barista.</div>
    </div>
    <div class="kafe-reader-focus ${active ? 'active' : ''}">
      <div class="kafe-reader-focus-head">
        <div><small>${active ? 'MEJA AKTIF' : 'SEDANG DIBACA'} · MEJA ${focus?.table ?? '—'}</small><strong>${esc(focus?.name || 'Pilih meja')}</strong></div>
        <span class="kafe-reader-status ${focus?.status || 'empty'}">${focus ? statusText(focus.status) : 'belum dipilih'}</span>
      </div>
      ${focus?.status === 'served'
        ? `<div class="kafe-reader-story"><small>CERITA TERBUKA</small><p>${esc(focus.story || 'Tamu ini sudah pergi dengan tenang.')}</p></div>`
        : focus?.status === 'vanishing'
          ? `<div class="kafe-reader-vanish"><b>Tamu sedang menghilang lembut.</b><span>Pesanan yang sama akan kembali dalam ${focus.returnIn ?? 1} detik. Tidak ada yang hilang permanen.</span></div>`
          : `<div class="kafe-clues">${clues.map((clue: any) => `<div class="kafe-clue ${clue.hidden ? 'hidden' : ''}">
              <span class="kafe-clue-glyph" aria-hidden="true">${esc(clue.glyph)}</span>
              <div><small>${esc(clue.label)}</small><strong>${esc(clue.value)}</strong><span>${esc(clue.text)}</span></div>
            </div>`).join('')}</div>
            ${focus?.listened ? `<div class="kafe-whisper"><small>BISIKAN</small><p>${esc(focus.whisper)}</p></div>` : '<p class="kafe-reader-prompt">Petunjuk yang kabur bisa diperjelas dengan tombol <b>Dengarkan</b>. Warna bukan satu-satunya petunjuk.</p>'}
            ${active ? '<p class="kafe-reader-marked">Meja ini sudah ditandai. Barista melihat tanda yang sama di layar kafe.</p>' : '<p class="kafe-reader-not-marked">Tekan <b>Tandai meja</b> di bawah agar barista menyiapkan untuk meja ini.</p>'}`}
    </div>
    <div class="kafe-reader-legend"><span><b>☾</b> pola bulan</span><span><b>❧</b> pola daun</span><span><b>✦</b> pola bintang</span><span><b>▭ ▯ ◡</b> bentuk cangkir</span></div>`;
}
