import {button, esc} from '../../shared/html.ts';
import {CUPS, FLAVORS, TEMPS, cupById, flavorById, tempById} from './cafe-levels.ts';
import {chooseReaderFocus, readerLayerMarkup} from './cafe-reader.ts';

let latestState: any = null;
let latestReader: any = null;
let readerFocus: number | null = null;
let focusInstance = '';
let lastActive: number | null = null;
let layerSignature = '';

function audioButton(state: any) {
  return `<button class="touch-utility" data-do="game-audio" aria-label="${state.soundMuted ? 'Nyalakan audio game' : 'Matikan audio game'}" aria-pressed="${!!state.soundMuted}">${state.soundMuted ? '♩' : '♫'}</button>`;
}

function choiceButton(value: string, label: string, glyph: string, selected: boolean, extra = '') {
  return `<button class="touch-action kafe-choice ${selected ? 'chosen' : ''} ${extra}" data-do="select" data-value="${esc(value)}" aria-label="${esc(label)}" aria-pressed="${selected}"><span aria-hidden="true">${glyph}</span><small>${esc(label)}</small></button>`;
}

function readerTable(reader: any, table: number | null) {
  return reader?.tables?.find((item: any) => item.table === table);
}

function ticketText(game: any) {
  if (!game?.prepared) return 'baki kosong';
  return `${flavorById(game.prepared.flavor).short} · ${tempById(game.prepared.temp).short} · ${cupById(game.prepared.cup).short}`;
}

export function controller(state: any, personal: any) {
  latestState = state;
  const game = state.game;
  if (!game) return { buttons: '' };
  const isReader = state.you?.slot === 1;
  latestReader = isReader ? personal : null;
  if (isReader) {
    const focus = readerTable(personal, readerFocus) || readerTable(personal, game.activeTable) || personal?.tables?.find((item: any) => item.status === 'waiting') || personal?.tables?.[0];
    const focusTable = focus?.table ?? null;
    if (focusTable !== null) readerFocus = focusTable;
    const waiting = focus?.status === 'waiting';
    const active = focusTable !== null && focusTable === game.activeTable;
    return {
      buttons: button('mark', 'Tandai meja', '⌖', !waiting || active, 'accent kafe-mark-key') + button('listen', 'Dengarkan', '◉', !waiting || !!focus?.listened, 'kafe-listen-key'),
      utilities: `<span class="kafe-ticket-mini">${game.activeTable ? `AKTIF · MEJA ${game.activeTable}` : 'BELUM ADA TANDA'}</span>${audioButton(state)}`,
      analogDisabled: true,
      analogLabel: 'Pembaca jejak',
      caption: `PEMBACA JEJAK · ${focus ? `MEJA ${focus.table}` : 'PILIH MEJA'}`,
      actionClass: 'kafe-reader-actions',
      attributes: 'data-cafe-role="reader"'
    };
  }
  const activeCustomer = game.customers?.find((customer: any) => customer.table === game.activeTable);
  const canServe = !!game.prepared && !!activeCustomer && activeCustomer.status === 'waiting';
  return {
    buttons: FLAVORS.map(flavor => choiceButton(`flavor:${flavor.id}`, flavor.short, flavor.glyph, game.draft?.flavor === flavor.id, 'kafe-flavor-choice')).join('')
      + TEMPS.map(temp => choiceButton(`temp:${temp.id}`, temp.short, temp.glyph, game.draft?.temp === temp.id, 'kafe-temp-choice')).join('')
      + CUPS.map(cup => choiceButton(`cup:${cup.id}`, cup.short, cup.glyph, game.draft?.cup === cup.id, 'kafe-cup-choice')).join('')
      + button('brew', 'Tuang', '◒', false, 'kafe-brew-key')
      + button('serve', 'Sajikan', '➜', !canServe, 'accent kafe-serve-key'),
    utilities: `<span class="kafe-ticket-mini">${game.activeTable ? `MEJA ${game.activeTable} · ${ticketText(game)}` : 'TUNGGU TANDA PEMBACA'}</span>${audioButton(state)}`,
    analogDisabled: true,
    analogLabel: 'Stasiun barista',
    caption: game.activeTable ? `BARISTA · MEJA ${game.activeTable}` : 'BARISTA · TUNGGU TANDA',
    actionClass: 'kafe-barista-actions',
    attributes: 'data-cafe-role="barista"'
  };
}

function updateReaderButtons() {
  if (!latestReader?.tables || readerFocus === null) return;
  const focus = readerTable(latestReader, readerFocus);
  const waiting = focus?.status === 'waiting';
  const active = readerFocus === latestState?.game?.activeTable;
  const mark = document.querySelector<HTMLButtonElement>('.touch-action[data-do=mark]');
  const listen = document.querySelector<HTMLButtonElement>('.touch-action[data-do=listen]');
  if (mark) mark.disabled = !waiting || active;
  if (listen) listen.disabled = !waiting || !!focus?.listened;
}

function removeReaderLayer() {
  document.querySelector('.kafe-reader-layer')?.remove();
  layerSignature = '';
}

function renderReaderLayer(state: any, keepScroll = false) {
  const screen = document.querySelector<HTMLElement>('.touch-screen[data-game-scope="kafe-hantu"]');
  if (!screen) return;
  const relevant = state?.game?.id === 'kafe-hantu' && state.phase === 'playing' && state.you?.slot === 1;
  if (!relevant || !latestReader?.tables) { removeReaderLayer(); return; }
  let layer = screen.querySelector<HTMLElement>('.kafe-reader-layer');
  if (!layer) {
    layer = document.createElement('section');
    layer.className = 'kafe-reader-layer';
    layer.setAttribute('aria-label', 'Denah jejak dan petunjuk pesanan');
    layer.dataset.cafeLevel = String(state.game.stage ?? 0);
    screen.append(layer);
  }
  const activeTable = state.game.activeTable;
  layer.dataset.cafeLevel = String(state.game.stage ?? 0);
  const focus = chooseReaderFocus(latestReader, activeTable, readerFocus);
  if (focus !== readerFocus || focusInstance !== state.gameInstanceId) {
    readerFocus = focus;
    focusInstance = state.gameInstanceId || '';
    lastActive = activeTable;
  }
  if (activeTable !== null && activeTable !== lastActive) {
    readerFocus = activeTable;
    lastActive = activeTable;
  }
  const signature = JSON.stringify([readerFocus, activeTable, state.game.served, state.game.mistakes, latestReader.tables.map((table: any) => [table.table, table.status, table.listened, table.returnIn, table.story])]);
  if (signature === layerSignature) return;
  layerSignature = signature;
  const scroll = keepScroll ? layer.scrollTop : 0;
  layer.innerHTML = readerLayerMarkup(state, latestReader, readerFocus);
  layer.scrollTop = scroll;
  layer.onpointerdown = event => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-kafe-table]');
    if (!target || target.hasAttribute('disabled')) return;
    event.preventDefault();
    const table = Number(target.dataset.kafeTable);
    if (!Number.isInteger(table) || table === readerFocus) return;
    readerFocus = table;
    latestState = state;
    renderReaderLayer(state, true);
    updateReaderButtons();
  };
}

export function syncController(state: any, _connected: boolean, _muted: boolean) {
  latestState = state;
  const audio = document.querySelector<HTMLButtonElement>('[data-do=game-audio]');
  if (audio) {
    audio.setAttribute('aria-pressed', String(!!state.soundMuted));
    audio.setAttribute('aria-label', state.soundMuted ? 'Nyalakan audio game' : 'Matikan audio game');
    audio.textContent = state.soundMuted ? '♩' : '♫';
  }
  renderReaderLayer(state);
  updateReaderButtons();
}

export function control(action: string, value: unknown, context: any) {
  if (action === 'game-audio') { context.send('audio.toggle'); return true; }
  if (action === 'select') {
    if (typeof value === 'string' && /^(flavor|temp|cup):/.test(value)) context.act('select', value);
    return true;
  }
  if (action === 'mark' || action === 'listen') {
    if (readerFocus === null) return true;
    context.act(action, {table: readerFocus});
    return true;
  }
  return false;
}

export function leave() {
  removeReaderLayer();
  latestState = null;
  latestReader = null;
  readerFocus = null;
  focusInstance = '';
  lastActive = null;
}
