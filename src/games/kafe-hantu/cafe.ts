import type {GameBase, GameContext} from '../../shared/game-contracts.ts';
import {clamp} from '../../shared/random.ts';
import {
  DEFAULT_ORDER, cafeLevel, choiceById, customerSeeds, flavorById, orderClues, orderEquals, orderText,
  tableLimit, tempById, cupById, type CafeCustomerSeed, type CafeLevel, type CafeOrder,
  type ClueKey, type CupId, type FlavorId, type TableStatus, type TempId
} from './cafe-levels.ts';

export type CafeCustomer = {
  id: string; table: number; name: string; story: string; whisper: string;
  order: CafeOrder; hidden: ClueKey[]; status: TableStatus; mistakes: number;
  returnIn: number; servedAt: number | null; listened: boolean;
};

export type CafeState = GameBase & {
  stage: number; plan: CafeLevel; challenge: boolean; targetTime: number | null;
  customers: CafeCustomer[]; total: number; served: number; correct: number; mistakes: number;
  activeTable: number | null; draft: CafeOrder; prepared: CafeOrder | null;
  message: string; revision: number; finishedAt: number | null;
  lastMarkAt: number; lastMarkTable: number | null; lastListenAt: number; lastListenTable: number | null;
  lastBrewAt: number; lastServeAt: number; lastServeTable: number | null; lastMistakeAt: number; lastMistakeTable: number | null;
  targetMissed: boolean;
};

const clueKeys: ClueKey[] = ['flavor', 'temp', 'cup'];

function isFlavor(value: string): value is FlavorId { return ['kakao', 'teh', 'bintang'].includes(value); }
function isTemp(value: string): value is TempId { return ['hangat', 'dingin'].includes(value); }
function isCup(value: string): value is CupId { return ['rendah', 'tinggi', 'mangkuk'].includes(value); }
function isClueKey(value: string): value is ClueKey { return clueKeys.includes(value as ClueKey); }

function parseTable(value: unknown): number | null {
  const raw = typeof value === 'object' && value ? (value as any).table : value;
  const table = typeof raw === 'number' ? raw : Number(raw);
  return Number.isInteger(table) ? table : null;
}

function parseSelection(value: unknown): { key: ClueKey; value: string } | null {
  if (typeof value === 'string') {
    const [key, selected] = value.split(':');
    if (key && selected && isClueKey(key)) return { key, value: selected };
    return null;
  }
  if (typeof value !== 'object' || !value) return null;
  const key = (value as any).key ?? (value as any).field;
  const selected = (value as any).value;
  return typeof key === 'string' && isClueKey(key) && typeof selected === 'string' ? { key, value: selected } : null;
}

function validSelection(key: ClueKey, value: string) {
  return key === 'flavor' ? isFlavor(value) : key === 'temp' ? isTemp(value) : isCup(value);
}

function customerByTable(g: CafeState, table: number | null) {
  return table === null ? undefined : g.customers.find(customer => customer.table === table);
}

function nextWaitingTable(g: CafeState, after = 0): number | null {
  const sorted = g.customers.filter(customer => customer.status === 'waiting').sort((a, b) => a.table - b.table);
  return sorted.find(customer => customer.table > after)?.table ?? sorted[0]?.table ?? null;
}

function updateMessage(g: CafeState, message: string) {
  if (g.message !== message) { g.message = message; g.revision++; }
}

function newCustomer(seed: CafeCustomerSeed): CafeCustomer {
  return {
    ...seed, status: 'waiting', mistakes: 0, returnIn: 0, servedAt: null, listened: false
  };
}

export function createCafe(base: GameBase, context: GameContext): CafeState {
  const level = cafeLevel(base.level);
  const challenge = base.mode === 'challenge';
  const customers = customerSeeds(level, challenge, context.random).map(newCustomer);
  return {
    ...base,
    stage: level.index,
    plan: level,
    challenge,
    targetTime: challenge ? level.targetSeconds : null,
    customers,
    total: tableLimit(challenge),
    served: 0,
    correct: 0,
    mistakes: 0,
    activeTable: null,
    draft: {...DEFAULT_ORDER},
    prepared: null,
    message: 'Pembaca jejak memilih satu meja. Barista menyiapkan minuman untuk meja yang ditandai.',
    revision: 1,
    finishedAt: null,
    lastMarkAt: -10,
    lastMarkTable: null,
    lastListenAt: -10,
    lastListenTable: null,
    lastBrewAt: -10,
    lastServeAt: -10,
    lastServeTable: null,
    lastMistakeAt: -10,
    lastMistakeTable: null,
    targetMissed: false
  };
}

export function neutralCafe(_g: CafeState) { /* kafe tidak memakai analog; semua aksi diskret */ }

export function cafeAction(g: CafeState, slot: number, name: string, value?: unknown) {
  if (g.finished) return;

  if (name === 'mark') {
    if (slot !== 1) return;
    const table = parseTable(value);
    const customer = customerByTable(g, table);
    if (!customer || customer.status !== 'waiting') {
      g.message = 'Meja itu belum bisa ditandai. Pilih tamu yang sedang menunggu.';
      g.revision++;
      return;
    }
    g.activeTable = customer.table;
    g.lastMarkAt = g.elapsed;
    g.lastMarkTable = customer.table;
    g.revision++;
    updateMessage(g, `Meja ${customer.table} ditandai. Barista dapat menyiapkan minuman sekarang.`);
    return;
  }

  if (name === 'listen') {
    if (slot !== 1) return;
    const table = parseTable(value) ?? g.activeTable;
    const customer = customerByTable(g, table);
    if (!customer || customer.status === 'served') return;
    if (customer.status !== 'waiting') {
      updateMessage(g, 'Bisikan itu masih samar. Tunggu tamu kembali ke meja.');
      return;
    }
    if (customer.listened) {
      updateMessage(g, `Bisikan meja ${customer.table} sudah terdengar.`);
      return;
    }
    customer.listened = true;
    g.lastListenAt = g.elapsed;
    g.lastListenTable = customer.table;
    g.revision++;
    updateMessage(g, `Kamu mendengar bisikan dari meja ${customer.table}. Petunjuk baru terbuka di HP pembaca.`);
    return;
  }

  if (slot !== 0) return;

  if (name === 'select') {
    const selection = parseSelection(value);
    if (!selection || !validSelection(selection.key, selection.value)) return;
    if (selection.key === 'flavor') g.draft.flavor = selection.value as FlavorId;
    else if (selection.key === 'temp') g.draft.temp = selection.value as TempId;
    else g.draft.cup = selection.value as CupId;
    g.revision++;
    return;
  }

  if (name === 'brew') {
    g.prepared = {...g.draft};
    g.lastBrewAt = g.elapsed;
    g.revision++;
    updateMessage(g, `${orderText(g.prepared)} sudah dituang. Serahkan ke meja yang bertanda.`);
    return;
  }

  if (name === 'serve') {
    if (!g.prepared) {
      updateMessage(g, 'Belum ada minuman di baki. Pilih bahan lalu tekan Tuang.');
      return;
    }
    const customer = customerByTable(g, g.activeTable);
    if (!customer) {
      updateMessage(g, 'Belum ada meja yang ditandai. Tunggu pembaca jejak memilih meja.');
      return;
    }
    if (customer.status === 'vanishing') {
      updateMessage(g, `${customer.name} sedang menghilang lembut. Tunggu sebentar; pesanannya tidak hilang.`);
      return;
    }
    if (customer.status !== 'waiting') {
      updateMessage(g, 'Meja itu sudah terlayani. Pilih meja berikutnya bersama pembaca jejak.');
      return;
    }
    if (orderEquals(g.prepared, customer.order)) {
      g.served++;
      g.correct++;
      g.score += 100;
      customer.status = 'served';
      customer.servedAt = g.elapsed;
      g.lastServeAt = g.elapsed;
      g.lastServeTable = customer.table;
      g.prepared = null;
      g.draft = {...DEFAULT_ORDER};
      const next = nextWaitingTable(g, customer.table);
      g.activeTable = next;
      g.revision++;
      updateMessage(g, `${customer.name} menerima pesanan dengan senang. Ceritanya terbuka di layar kafe.`);
      if (g.served >= g.total && !g.finished) {
        g.finished = true;
        g.finishedAt = g.elapsed;
        g.score += 250;
        g.revision++;
        updateMessage(g, 'Semua tamu terlayani. Kafe menunggu fajar dengan tenang.');
      }
      return;
    }
    g.mistakes++;
    customer.mistakes++;
    g.score = Math.max(0, g.score - 15);
    customer.status = 'vanishing';
    customer.returnIn = 1.7;
    g.prepared = null;
    g.lastMistakeAt = g.elapsed;
    g.lastMistakeTable = customer.table;
    g.revision++;
    updateMessage(g, `${customer.name} menghilang lembut. Tidak apa-apa; pesanan yang sama akan kembali sebentar lagi.`);
    return;
  }
}

export function tickCafe(g: CafeState, _inputs: Record<string, number>[], dt: number) {
  if (g.finished) return;
  for (const customer of g.customers) {
    if (customer.status !== 'vanishing') continue;
    customer.returnIn = Math.max(0, customer.returnIn - dt);
    if (customer.returnIn > 0) continue;
    customer.status = 'waiting';
    g.revision++;
    if (g.activeTable === customer.table) {
      updateMessage(g, `${customer.name} kembali ke meja ${customer.table} dengan pesanan yang sama. Coba lagi bersama-sama.`);
    } else {
      updateMessage(g, `${customer.name} kembali ke meja ${customer.table}.`);
    }
  }
  if (g.targetTime !== null && !g.targetMissed && g.elapsed > g.targetTime) {
    g.targetMissed = true;
    g.revision++;
    updateMessage(g, 'Target waktu terlewati. Shift tetap berjalan; kalian tidak kehilangan tamu.');
  }
}

function publicCustomer(customer: CafeCustomer) {
  return {
    id: customer.id,
    table: customer.table,
    name: customer.name,
    status: customer.status,
    mistakes: customer.mistakes,
    returnIn: customer.status === 'vanishing' ? Math.max(0, Math.ceil(customer.returnIn * 10) / 10) : 0,
    servedAt: customer.servedAt,
    story: customer.status === 'served' ? customer.story : null
  };
}

export function publicCafe(g: CafeState) {
  return {
    id: 'kafe-hantu',
    stage: g.stage,
    levelId: g.plan.id,
    levelTitle: g.plan.title,
    levelSubtitle: g.plan.subtitle,
    roomLabel: g.plan.roomLabel,
    mode: g.mode,
    challenge: g.challenge,
    targetTime: g.targetTime,
    targetMissed: g.targetMissed,
    elapsed: g.elapsed,
    finished: g.finished,
    finishedAt: g.finishedAt,
    served: g.served,
    correct: g.correct,
    mistakes: g.mistakes,
    total: g.total,
    score: g.score,
    activeTable: g.activeTable,
    draft: {...g.draft},
    prepared: g.prepared ? {...g.prepared} : null,
    message: g.message,
    revision: g.revision,
    lastMarkAt: g.lastMarkAt,
    lastMarkTable: g.lastMarkTable,
    lastListenAt: g.lastListenAt,
    lastListenTable: g.lastListenTable,
    lastBrewAt: g.lastBrewAt,
    lastServeAt: g.lastServeAt,
    lastServeTable: g.lastServeTable,
    lastMistakeAt: g.lastMistakeAt,
    lastMistakeTable: g.lastMistakeTable,
    customers: g.customers.map(publicCustomer)
  };
}

function privateClue(key: ClueKey, customer: CafeCustomer) {
  const clue = orderClues(customer.order).find(item => item.key === key)!;
  const hidden = customer.hidden.includes(key) && !customer.listened;
  if (!hidden) return {...clue, hidden: false};
  return {
    key, label: clue.label, value: 'Samar', text: 'Jejak ini kabur. Tekan Dengarkan untuk memperjelas.',
    glyph: '？', pattern: 'samar', hidden: true
  };
}

export function privateCafe(g: CafeState, slot: number) {
  if (slot !== 1) return {};
  return {
    role: 'reader',
    levelTitle: g.plan.title,
    activeTable: g.activeTable,
    legend: {
      flavor: 'Rasa selalu disertai nama dan pola bentuk, bukan hanya warna.',
      temp: 'Suhu disebut sebagai kata dan simbol.',
      cup: 'Bentuk cangkir disebut sebagai kata dan siluet.'
    },
    tables: g.customers.map(customer => {
      const hiddenNotes = customer.hidden.map(key => {
        const choice = choiceById(key, customer.order[key]);
        return `${key === 'flavor' ? 'Rasa' : key === 'temp' ? 'Suhu' : 'Cangkir'}: ${choice.label}`;
      });
      return {
        id: customer.id,
        table: customer.table,
        name: customer.name,
        status: customer.status,
        returnIn: customer.status === 'vanishing' ? Math.max(0, Math.ceil(customer.returnIn * 10) / 10) : 0,
        listened: customer.listened,
        clues: customer.status === 'served' ? [] : clueKeys.map(key => privateClue(key, customer)),
        story: customer.status === 'served' ? customer.story : null,
        whisper: customer.status === 'served' || !customer.listened
          ? ''
          : `${customer.whisper}${hiddenNotes.length ? ` Petunjuk jelas — ${hiddenNotes.join(' · ')}.` : ''}`
      };
    })
  };
}

function timeText(seconds: number) {
  const safe = Math.max(0, Math.round(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

export function cafeResult(g: CafeState) {
  const elapsed = g.finishedAt ?? g.elapsed;
  const base = `${g.plan.title} · ${g.served}/${g.total} tamu · ${g.mistakes} sajian keliru · ${timeText(elapsed)}`;
  const title = g.mistakes === 0
    ? 'Shift sempurna. Kafe tersenyum.'
    : g.mistakes <= 2
      ? 'Kafe tetap hangat sampai fajar.'
      : 'Semua tamu akhirnya terlayani.';
  let stars: number | null = null;
  if (g.challenge) {
    stars = g.mistakes === 0 && elapsed <= (g.targetTime ?? 0) ? 3 : g.mistakes <= 2 ? 2 : 1;
  }
  return {
    title,
    detail: `${base}${g.challenge ? ` · target ${timeText(g.targetTime ?? 0)}` : ' · mode santai tanpa timer'}. Kafe membuka pintu saat fajar; pelanggan baru menunggu di balik jendela.`,
    stars
  };
}

export {flavorById, tempById, cupById};
