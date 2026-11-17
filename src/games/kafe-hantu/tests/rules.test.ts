import test from 'node:test';
import assert from 'node:assert/strict';
import server from '../server.ts';
import {CAFE_LEVELS, cafeLevel, orderClues, orderDeck} from '../cafe-levels.ts';

type Mode = 'relaxed' | 'challenge';
const base = (level = 1, mode: Mode = 'relaxed', seed = 19) => ({
  id: 'kafe-hantu', mode, level, seed, elapsed: 0, finished: false, score: 0
});
const create = (level = 1, mode: Mode = 'relaxed', seed = 19) => server.create(base(level, mode, seed), {random: () => .37});
const publicGame = (g: any) => server.publicState(g) as any;
const privateGame = (g: any, slot: number) => server.privateState(g, slot) as any;
const tableOf = (g: any, table: number) => g.customers.find((customer: any) => customer.table === table);

function select(g: any, order: any) {
  server.action(g, 0, 'select', `flavor:${order.flavor}`);
  server.action(g, 0, 'select', `temp:${order.temp}`);
  server.action(g, 0, 'select', `cup:${order.cup}`);
}
function prepareAndServe(g: any, order: any) {
  select(g, order);
  server.action(g, 0, 'brew');
  server.action(g, 0, 'serve');
}
function advance(g: any, seconds: number, step = 1 / 30) {
  for (let elapsed = 0; elapsed < seconds; elapsed += step) {
    g.elapsed += step;
    server.tick(g, [], step);
  }
}
function completeShift(g: any) {
  for (const customer of g.customers.filter((item: any) => item.status === 'waiting')) {
    if (g.finished) break;
    if (g.activeTable !== customer.table) server.action(g, 1, 'mark', {table: customer.table});
    assert.equal(g.activeTable, customer.table);
    prepareAndServe(g, customer.order);
  }
}

test('Kafe Hantu: payload publik menyembunyikan pesanan, cerita, dan petunjuk privat', () => {
  const g = create();
  const pub = publicGame(g);
  const serialized = JSON.stringify(pub);
  for (const secret of ['"order"', '"clues"', '"hidden"', '"whisper"', '"stories"', '"plan"', '"spots"']) {
    assert.equal(serialized.includes(secret), false, `payload publik memuat ${secret}`);
  }
  for (const customer of pub.customers) {
    assert.equal('order' in customer, false);
    assert.equal(customer.story, null);
    assert.equal(customer.status, 'waiting');
  }
  assert.deepEqual(privateGame(g, 0), {}, 'barista tidak menerima petunjuk privat');
  const reader = privateGame(g, 1);
  assert.equal(reader.role, 'reader');
  assert.equal(reader.tables.length, 6);
  assert.ok(reader.tables.every((table: any) => table.clues.length === 3));
  assert.ok(reader.tables.every((table: any) => table.clues.every((clue: any) => clue.label && clue.value && clue.glyph && clue.text)));
  assert.ok(reader.tables.every((table: any) => table.story === null && table.whisper === ''));
});

test('Kafe Hantu: aksi mengikuti peran dan meja aktif hanya dari pembaca', () => {
  const g = create();
  const order = tableOf(g, 1).order;
  select(g, order);
  assert.deepEqual(g.draft, order, 'barista boleh memilih bahan');
  server.action(g, 0, 'mark', {table: 1});
  server.action(g, 0, 'listen', {table: 1});
  assert.equal(g.activeTable, null, 'barista tidak boleh menandai meja');
  assert.equal(tableOf(g, 1).listened, false, 'barista tidak boleh membuka bisikan');

  server.action(g, 1, 'select', 'flavor:teh');
  server.action(g, 1, 'brew');
  server.action(g, 1, 'serve');
  assert.deepEqual(g.draft, order, 'pembaca tidak boleh mengubah pilihan barista');
  assert.equal(g.prepared, null, 'pembaca tidak boleh menuang');
  assert.equal(g.served, 0);

  server.action(g, 1, 'mark', {table: 1});
  assert.equal(g.activeTable, 1);
  server.action(g, 1, 'mark', {table: 99});
  assert.equal(g.activeTable, 1, 'meja tidak valid tidak mengganti tanda');
  server.action(g, 1, 'listen', {table: 1});
  assert.equal(tableOf(g, 1).listened, true);
});

test('Kafe Hantu: sajian benar membuka cerita dan meja aktif maju otomatis', () => {
  const g = create();
  server.action(g, 1, 'mark', {table: 1});
  const order = tableOf(g, 1).order;
  prepareAndServe(g, order);
  const pub = publicGame(g);
  assert.equal(pub.served, 1);
  assert.equal(pub.correct, 1);
  assert.equal(tableOf(g, 1).status, 'served');
  assert.equal(pub.customers[0].story, tableOf(g, 1).story);
  assert.equal(pub.activeTable, 2, 'meja berikutnya yang menunggu menjadi aktif');
  assert.deepEqual(g.prepared, null);
  assert.deepEqual(privateGame(g, 1).tables[0].clues, [], 'jejak meja yang selesai ditutup');
  assert.equal(privateGame(g, 1).tables[0].story, tableOf(g, 1).story);

  completeShift(g);
  assert.equal(g.finished, true);
  assert.equal(g.served, g.total);
  assert.equal(g.score, 850, 'enam sajian benar dan bonus fajar');
  const result = server.result(g);
  assert.match(result.detail, /6\/6/);
  assert.match(result.detail, /fajar/i);
  assert.equal(result.stars, null, 'mode santai tidak memberi bintang');
});

test('Kafe Hantu: sajian keliru menghilangkan tamu sementara lalu mengembalikan pesanan yang sama', () => {
  const g = create();
  server.action(g, 1, 'mark', {table: 1});
  const customer = tableOf(g, 1);
  const originalOrder = {...customer.order};
  const wrong = {...originalOrder, flavor: originalOrder.flavor === 'kakao' ? 'teh' : 'kakao'};
  prepareAndServe(g, wrong);
  assert.equal(customer.status, 'vanishing');
  assert.equal(customer.returnIn, 1.7);
  assert.equal(g.mistakes, 1);
  assert.equal(customer.mistakes, 1);
  assert.equal(g.served, 0);
  assert.equal(g.finished, false);
  assert.equal(g.activeTable, 1, 'meja tetap ditandai selama pemulihan');
  assert.deepEqual(customer.order, originalOrder, 'pesanan tidak berubah setelah salah sajian');
  assert.deepEqual(g.prepared, null);

  prepareAndServe(g, originalOrder);
  assert.equal(customer.status, 'vanishing', 'sajian saat tamu menghilang tidak dihitung');
  assert.equal(g.served, 0);
  advance(g, 1.2);
  assert.equal(customer.status, 'vanishing');
  advance(g, .6);
  assert.equal(customer.status, 'waiting');
  assert.equal(customer.returnIn, 0);
  assert.deepEqual(customer.order, originalOrder);
  prepareAndServe(g, originalOrder);
  assert.equal(customer.status, 'served');
  assert.equal(g.served, 1);
  assert.equal(g.mistakes, 1);
});

test('Kafe Hantu: tantangan menambah tamu, menyembunyikan petunjuk, dan Dengarkan membukanya', () => {
  const relaxed = create(1, 'relaxed');
  const relaxedPub = publicGame(relaxed);
  assert.equal(relaxedPub.challenge, false);
  assert.equal(relaxedPub.total, 6);
  assert.equal(relaxedPub.targetTime, null);
  assert.ok(privateGame(relaxed, 1).tables.every((table: any) => table.clues.every((clue: any) => !clue.hidden)));

  const challenge = create(1, 'challenge');
  const pub = publicGame(challenge);
  assert.equal(pub.challenge, true);
  assert.equal(pub.total, 8);
  assert.equal(pub.targetTime, 360);
  const hidden = privateGame(challenge, 1).tables[0].clues.filter((clue: any) => clue.hidden);
  assert.equal(hidden.length, 1);
  assert.equal(hidden[0].value, 'Samar');
  assert.equal(hidden[0].glyph, '？');
  server.action(challenge, 1, 'listen', {table: 1});
  const revealed = privateGame(challenge, 1).tables[0];
  assert.equal(revealed.listened, true);
  assert.equal(revealed.clues.filter((clue: any) => clue.hidden).length, 0);
  assert.match(revealed.whisper, /Petunjuk jelas/);

  const finalLevel = create(3, 'challenge');
  assert.equal(publicGame(finalLevel).targetTime, cafeLevel(3).targetSeconds);
  assert.equal(privateGame(finalLevel, 1).tables[0].clues.filter((clue: any) => clue.hidden).length, 2);

  advance(challenge, 361);
  assert.equal(challenge.targetMissed, true);
  assert.equal(challenge.finished, false, 'target waktu tidak mengakhiri shift');
});

test('Kafe Hantu: tiga ruang memiliki delapan meja, cerita fiksi, dan urutan pesanan seimbang', () => {
  assert.equal(CAFE_LEVELS.length, 3);
  for (const level of CAFE_LEVELS) {
    assert.equal(level.spots.length, 8);
    assert.deepEqual(level.spots.map(spot => spot.table), [1, 2, 3, 4, 5, 6, 7, 8]);
    assert.equal(new Set(level.spots.map(spot => `${spot.x},${spot.z}`)).size, 8);
    assert.ok(level.spots.every(spot => Math.abs(spot.x) < level.room.width / 2 && Math.abs(spot.z + 1) < level.room.depth / 2));
    assert.ok(level.stories.length >= 8);
    assert.equal(new Set(level.stories.map(story => story.name)).size, level.stories.length);
    assert.ok(level.stories.every(story => story.story.length > 40 && story.whisper.length > 10));
    assert.ok(level.room.camera.every(Number.isFinite));

    const g = create(level.index + 1, 'relaxed');
    assert.equal(g.stage, level.index);
    assert.equal(publicGame(g).levelTitle, level.title);
    assert.equal(publicGame(g).total, 6);
    assert.equal(publicGame(create(level.index + 1, 'challenge')).total, 8);
  }
  assert.equal(CAFE_LEVELS[0].spots.every(spot => spot.style === 'round'), true);
  assert.equal(CAFE_LEVELS[1].spots.every(spot => spot.style === 'booth'), true);
  assert.ok(new Set(CAFE_LEVELS[2].spots.map(spot => spot.style)).size > 1);

  for (const count of [6, 8]) {
    const deck = orderDeck(count, () => .41);
    assert.equal(deck.length, count);
    assert.equal(new Set(deck.map(order => `${order.flavor}:${order.temp}:${order.cup}`)).size, count);
    assert.ok(deck.every(order => {
      const clues = orderClues(order);
      return clues.length === 3 && clues.every(clue => clue.label && clue.text && clue.glyph && clue.pattern);
    }));
  }
});

test('Kafe Hantu: mode santai tetap berjalan tanpa timer dan ronde baru dimulai bersih', () => {
  const g = create(1, 'relaxed');
  advance(g, 600);
  assert.equal(g.finished, false);
  assert.equal(g.targetMissed, false);
  assert.equal(g.served, 0);
  server.action(g, 1, 'mark', {table: 1});
  prepareAndServe(g, tableOf(g, 1).order);
  assert.equal(g.served, 1);
  const next = create(1, 'relaxed', 23);
  assert.equal(next.finished, false);
  assert.equal(next.served, 0);
  assert.ok(next.customers.every((customer: any) => customer.status === 'waiting'));
});
