/** Data menu, ruang, pelanggan, dan petunjuk Kafe Hantu.
 * File ini tidak menyimpan state ronde; aturan otoritatif ada di cafe.ts.
 */

export type FlavorId = 'kakao' | 'teh' | 'bintang';
export type TempId = 'hangat' | 'dingin';
export type CupId = 'rendah' | 'tinggi' | 'mangkuk';
export type ClueKey = 'flavor' | 'temp' | 'cup';
export type TableStatus = 'waiting' | 'vanishing' | 'served';
export type CafeOrder = { flavor: FlavorId; temp: TempId; cup: CupId };

export const FLAVORS = [
  { id: 'kakao', label: 'Kakao Bulan', short: 'Kakao', color: '#b87952', pattern: 'bulan sabit', glyph: '☾', clue: 'pekat, cokelat, dan hangat seperti malam', vague: 'sesuatu yang pekat dan gelap' },
  { id: 'teh', label: 'Teh Kabut', short: 'Teh', color: '#c6b976', pattern: 'daun', glyph: '❧', clue: 'ringan, kekuningan, dan beraroma daun', vague: 'sesuatu yang ringan dan berdaun' },
  { id: 'bintang', label: 'Sari Bintang', short: 'Bintang', color: '#d39bc4', pattern: 'bintang', glyph: '✦', clue: 'manis, ungu muda, dan berpola bintang', vague: 'sesuatu yang manis dan berpendar' }
] as const;

export const TEMPS = [
  { id: 'hangat', label: 'Hangat', short: 'Hangat', color: '#e7a96b', pattern: 'uap', glyph: '♨', clue: 'hangat, ada uap tipis di atas cangkir', vague: 'suhunya terasa beruap' },
  { id: 'dingin', label: 'Dingin', short: 'Dingin', color: '#8dc8d2', pattern: 'embun', glyph: '❄', clue: 'dingin, gelasnya berembun', vague: 'suhunya terasa menyegarkan' }
] as const;

export const CUPS = [
  { id: 'rendah', label: 'Cangkir Rendah', short: 'Rendah', color: '#ead6b2', pattern: 'lebar', glyph: '▭', clue: 'cangkir rendah dan lebar, mudah dipeluk', vague: 'wadahnya pendek dan lebar' },
  { id: 'tinggi', label: 'Gelas Tinggi', short: 'Tinggi', color: '#d9e8df', pattern: 'ramping', glyph: '▯', clue: 'gelas tinggi dan ramping', vague: 'wadahnya menjulang tinggi' },
  { id: 'mangkuk', label: 'Mangkuk Terbuka', short: 'Mangkuk', color: '#d9c4a3', pattern: 'terbuka', glyph: '◡', clue: 'mangkuk terbuka dengan bibir lebar', vague: 'wadahnya melebar di atas' }
] as const;

export const MENU = { flavors: FLAVORS, temps: TEMPS, cups: CUPS } as const;
export const DEFAULT_ORDER: CafeOrder = { flavor: 'kakao', temp: 'hangat', cup: 'rendah' };

export type MenuChoice<T extends string> = { id: T; label: string; short: string; color: string; pattern: string; glyph: string; clue: string; vague: string };
export function flavorById(id: FlavorId) { return FLAVORS.find(item => item.id === id)!; }
export function tempById(id: TempId) { return TEMPS.find(item => item.id === id)!; }
export function cupById(id: CupId) { return CUPS.find(item => item.id === id)!; }
export function choiceById(key: ClueKey, id: string) {
  if (key === 'flavor') return flavorById(id as FlavorId);
  if (key === 'temp') return tempById(id as TempId);
  return cupById(id as CupId);
}
export function orderEquals(a: CafeOrder | null | undefined, b: CafeOrder | null | undefined) {
  return !!a && !!b && a.flavor === b.flavor && a.temp === b.temp && a.cup === b.cup;
}
export function orderText(order: CafeOrder) {
  return `${flavorById(order.flavor).label} · ${tempById(order.temp).short} · ${cupById(order.cup).short}`;
}
export function orderClues(order: CafeOrder): { key: ClueKey; label: string; value: string; text: string; glyph: string; pattern: string }[] {
  const flavor = flavorById(order.flavor), temp = tempById(order.temp), cup = cupById(order.cup);
  return [
    { key: 'flavor', label: 'Rasa & pola', value: flavor.label, text: `${flavor.label} · pola ${flavor.pattern}`, glyph: flavor.glyph, pattern: flavor.pattern },
    { key: 'temp', label: 'Suhu', value: temp.label, text: temp.clue, glyph: temp.glyph, pattern: temp.pattern },
    { key: 'cup', label: 'Bentuk cangkir', value: cup.label, text: cup.clue, glyph: cup.glyph, pattern: cup.pattern }
  ];
}

export type CafeStory = { name: string; story: string; whisper: string };
export type CafeSpot = { table: number; x: number; z: number; yaw: number; style: 'round' | 'booth' | 'low'; zone: 'window' | 'center' | 'booth' };
export type CafeRoom = { width: number; depth: number; wallHeight: number; counterZ: number; camera: [number, number, number]; look: [number, number, number] };
export type CafePalette = {
  floor: string; floorAlt: string; rug: string; wall: string; wainscot: string; trim: string;
  counter: string; counterTop: string; wood: string; fabric: string; metal: string; accent: string;
  glow: string; sky: string; skyLow: string; fog: string; moonlight: string; ghost: string; ghostAlt: string;
  dawnSky: string; dawnLow: string; dawnFog: string; dawnLight: string;
};
export type CafeLevel = {
  index: number; id: string; title: string; subtitle: string; roomLabel: string; description: string;
  targetSeconds: number; room: CafeRoom; palette: CafePalette; spots: CafeSpot[]; stories: CafeStory[];
};

const commonSpots: CafeSpot[] = [
  { table: 1, x: -6.3, z: -3.3, yaw: 0.10, style: 'round', zone: 'window' },
  { table: 2, x: -2.2, z: -3.6, yaw: -0.05, style: 'round', zone: 'center' },
  { table: 3, x: 2.2, z: -3.6, yaw: 0.05, style: 'round', zone: 'center' },
  { table: 4, x: 6.3, z: -3.3, yaw: -0.10, style: 'round', zone: 'window' },
  { table: 5, x: -6.3, z: 1.8, yaw: 0.22, style: 'round', zone: 'window' },
  { table: 6, x: -2.2, z: 2.0, yaw: 0.02, style: 'round', zone: 'center' },
  { table: 7, x: 2.2, z: 2.0, yaw: -0.02, style: 'round', zone: 'center' },
  { table: 8, x: 6.3, z: 1.8, yaw: -0.22, style: 'round', zone: 'window' }
];

function spots(style: 'round' | 'booth' | 'low' = 'round', offset = 0): CafeSpot[] {
  return commonSpots.map((spot, index) => ({
    ...spot,
    x: spot.x + (index < 4 ? offset : -offset),
    style: style === 'round' ? spot.style : style,
    zone: style === 'booth' ? (index % 2 === 0 ? 'booth' : 'center') : spot.zone
  }));
}

export const CAFE_LEVELS: CafeLevel[] = [
  {
    index: 0,
    id: 'serambi-bulan',
    title: 'Serambi Bulan',
    subtitle: 'Malam pertama · jendela menghadap bulan',
    roomLabel: 'RUANG DEPAN',
    description: 'Kafe kecil dengan jendela tinggi, meja kayu bulat, dan cahaya bulan yang jatuh di lantai.',
    targetSeconds: 360,
    room: { width: 19.4, depth: 14, wallHeight: 6.8, counterZ: -5.65, camera: [0.3, 10.8, 16.8], look: [0, 1.15, -0.7] },
    palette: {
      floor: '#5a3b30', floorAlt: '#69483a', rug: '#374f4c', wall: '#263f43', wainscot: '#3c5654', trim: '#c39b63',
      counter: '#5a3b2e', counterTop: '#b88655', wood: '#7b543b', fabric: '#8d5e58', metal: '#9b8b72', accent: '#e0b36e',
      glow: '#f0c47e', sky: '#0c1830', skyLow: '#243b52', fog: '#162741', moonlight: '#acc8e8', ghost: '#a9d4d3', ghostAlt: '#c8b6e5',
      dawnSky: '#b86d58', dawnLow: '#eed39e', dawnFog: '#a98777', dawnLight: '#ffd7a0'
    },
    spots: spots('round'),
    stories: [
      { name: 'Tamu Berpayung', story: 'Payungnya selalu kering, bahkan saat hujan rintik. Ia datang untuk mengenang suara hujan di atap tua.', whisper: 'Aku mendengar tetes air yang tidak pernah jatuh.' },
      { name: 'Nona Kancing', story: 'Ia mencari kancing biru yang hilang. Kafe menyimpannya di laci meja paling pojok, bersama benang-benang lama.', whisper: 'Ada bunyi kancing kecil bergulir di saku celemek.' },
      { name: 'Pak Surat', story: 'Membawa amplop tanpa alamat. Katanya pesan itu hanya perlu didengar, bukan dikirim.', whisper: 'Kertas amplopnya berdesir seperti sayap ngengat.' },
      { name: 'Anak Kembang Api', story: 'Menunggu percikan terakhir sebelum tidur. Ia suka cangkir yang rendah karena mudah dipeluk.', whisper: 'Kerlip kecil tertinggal di ujung jari-jarinya.' },
      { name: 'Penjaga Jam', story: 'Selalu datang saat jarum panjang menyentuh dua belas. Ia memesan minuman untuk menemani detik yang berhenti.', whisper: 'Detik kelima terdengar dua kali di dekatnya.' },
      { name: 'Kucing Bulan', story: 'Bukan kucing sungguhan; hanya bayangan yang suka duduk di ambang jendela. Ia tidak pernah meminta makan, hanya tempat hangat.', whisper: 'Ada dengkur halus dari sisi jendela.' },
      { name: 'Ibu Rajut', story: 'Meninggalkan benang di kursi. Ia percaya setiap simpul menyimpan cerita yang belum selesai.', whisper: 'Benang itu bergerak sendiri, perlahan, seperti menarik napas.' },
      { name: 'Pemain Catur', story: 'Bidaknya tinggal satu. Ia bilang permainan yang tenang tidak perlu pemenang.', whisper: 'Sebuah bidak diketuk tiga kali, sabar.' }
    ]
  },
  {
    index: 1,
    id: 'ruang-jam',
    title: 'Ruang Jam',
    subtitle: 'Malam kedua · detik yang berhenti',
    roomLabel: 'RUANG BELAKANG',
    description: 'Ruang sempit dengan jam besar, rak buku, dan bangku panjang. Setiap meja terasa seperti sudut perpustakaan.',
    targetSeconds: 390,
    room: { width: 18, depth: 13.2, wallHeight: 6.4, counterZ: -5.2, camera: [1.1, 9.8, 15.8], look: [0, 1.25, -0.5] },
    palette: {
      floor: '#3f302d', floorAlt: '#4d3a34', rug: '#59424b', wall: '#4c3d46', wainscot: '#2f4144', trim: '#c8a66d',
      counter: '#4b342d', counterTop: '#9e7652', wood: '#62463b', fabric: '#8d6c63', metal: '#a2917c', accent: '#e5b978',
      glow: '#ffd08b', sky: '#101529', skyLow: '#2e3348', fog: '#211f31', moonlight: '#b6b9df', ghost: '#b8d7cf', ghostAlt: '#d1b4d7',
      dawnSky: '#9c6d6f', dawnLow: '#e9c895', dawnFog: '#8c7475', dawnLight: '#ffd39d'
    },
    spots: spots('booth', 0.15),
    stories: [
      { name: 'Tukang Kunci', story: 'Membawa cincin kunci tanpa pintu. Ia percaya setiap kunci punya rumah yang menunggu.', whisper: 'Logam-logam kecil berdenting di kantongnya.' },
      { name: 'Nenek Lonceng', story: 'Suka duduk paling dekat jam. Katanya lonceng adalah cara rumah mengingat penghuninya.', whisper: 'Ada getaran panjang setelah dentang terakhir.' },
      { name: 'Tamu Dua Menit', story: 'Selalu datang tepat dua menit lalu pergi sebelum sempat dipanggil. Malam ini ia ingin tinggal sedikit lebih lama.', whisper: 'Napasnya seperti jarum detik yang ragu.' },
      { name: 'Bayangan Cermin', story: 'Hanya terlihat di pantulan cangkir. Ia menitipkan senyum untuk siapa pun yang kebetulan melihat.', whisper: 'Di cermin, bahunya bergerak satu kali.' },
      { name: 'Pak Pembaca', story: 'Membaca buku tanpa halaman. Ia bilang halaman kosong paling jujur.', whisper: 'Ada suara halaman dibalik, pelan sekali.' },
      { name: 'Gadis Kertas', story: 'Melipat setiap struk menjadi burung kecil. Burung-burung itu menunggu di ambang pintu.', whisper: 'Kertas terlipat berdesir di dekat meja.' },
      { name: 'Penjual Mimpi', story: 'Tidak menjual apa pun malam ini. Ia hanya ingin mendengar mimpi orang lain sambil menyeruput minuman.', whisper: 'Tawa kecilnya bergema di antara rak buku.' },
      { name: 'Tamu Terakhir', story: 'Kursinya selalu paling dekat pintu. Ia menunggu seseorang yang mungkin hanya ada di cerita.', whisper: 'Bel pintu berdering, tetapi tidak ada siapa-siapa.' }
    ]
  },
  {
    index: 2,
    id: 'loteng-embun',
    title: 'Loteng Embun',
    subtitle: 'Malam ketiga · fajar menunggu di atap',
    roomLabel: 'LOTENG',
    description: 'Loteng dengan jendela atap, balok kayu miring, peti teh, dan embun yang menetes pelan di kaca.',
    targetSeconds: 420,
    room: { width: 20.2, depth: 15, wallHeight: 6.2, counterZ: -5.8, camera: [0.2, 11.8, 17.4], look: [0, 1.0, -0.8] },
    palette: {
      floor: '#4a392e', floorAlt: '#5c4636', rug: '#3f5358', wall: '#35414a', wainscot: '#485259', trim: '#c7a272',
      counter: '#4f3a2c', counterTop: '#a87a51', wood: '#6f5139', fabric: '#6f7e7a', metal: '#9d9585', accent: '#f0c27d',
      glow: '#ffd99c', sky: '#14213a', skyLow: '#34475d', fog: '#26384b', moonlight: '#b8d9dd', ghost: '#b1e2d2', ghostAlt: '#d4bfe7',
      dawnSky: '#d18a6c', dawnLow: '#f4d6a0', dawnFog: '#b28f7d', dawnLight: '#ffe0ae'
    },
    spots: spots('low', -0.1).map((spot, index) => ({ ...spot, z: spot.z + (index > 3 ? 0.35 : 0), style: index % 3 === 0 ? 'low' : index % 3 === 1 ? 'round' : 'low', zone: index % 2 === 0 ? 'window' : 'center' })),
    stories: [
      { name: 'Penenun Embun', story: 'Mengumpulkan titik air dari jendela atap. Katanya embun adalah surat dari pagi yang belum datang.', whisper: 'Tetesan air jatuh tanpa membasahi lantai.' },
      { name: 'Anak Tangga', story: 'Menghitung setiap anak tangga yang dilewati. Malam ini angkanya berhenti di tujuh, seperti biasa.', whisper: 'Langkah kecil berhenti tepat di atas meja.' },
      { name: 'Tamu Bersepatu Basah', story: 'Sepatu tuanya selalu basah. Ia tidak keberatan; katanya jalan pulang memang berair.', whisper: 'Ada bunyi sepatu menginjak papan kayu.' },
      { name: 'Penyair Atap', story: 'Menulis puisi di balik uap cangkir. Setiap bait hilang sebelum sempat dibaca.', whisper: 'Baris puisi terdengar seperti angin di balok.' },
      { name: 'Nona Sarang', story: 'Membawa sarang burung kecil yang sudah lama kosong. Ia merawatnya sampai penghuni baru datang.', whisper: 'Ada kepak sayap sangat pelan di dekatnya.' },
      { name: 'Pemancing Bintang', story: 'Membawa pancing tanpa kail. Ia hanya ingin duduk dekat jendela dan menunggu bintang turun.', whisper: 'Senar pancing bergetar tanpa angin.' },
      { name: 'Tamu yang Lupa Pulang', story: 'Duduk di sini sejak kafe pertama dibuka. Ia tidak lupa pulang; ia hanya belum selesai mendengarkan.', whisper: 'Kursinya bergeser sendiri, memberi ruang.' },
      { name: 'Fajar Kecil', story: 'Pelanggan paling muda. Ia selalu datang sebelum matahari, membawa warna oranye di ujung jarinya.', whisper: 'Cahaya kecil menghangatkan meja.' }
    ]
  }
];

export function cafeLevel(level: number): CafeLevel {
  const index = Math.max(0, Math.min(CAFE_LEVELS.length - 1, Math.round(level) - 1));
  return CAFE_LEVELS[index];
}

export function levelSpot(level: CafeLevel, table: number): CafeSpot | undefined {
  return level.spots.find(spot => spot.table === table);
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const ALL_ORDERS: CafeOrder[] = FLAVORS.flatMap(flavor => TEMPS.flatMap(temp => CUPS.map(cup => ({ flavor: flavor.id, temp: temp.id, cup: cup.id }))));

/** Pesanan seimbang supaya satu shift punya variasi rasa, suhu, dan cangkir. */
export function orderDeck(count: number, random: () => number): CafeOrder[] {
  const candidates = shuffle(ALL_ORDERS, random), picked: CafeOrder[] = [];
  const caps = count > 6 ? { flavor: 3, temp: 4, cup: 3 } : { flavor: 2, temp: 3, cup: 2 };
  const counts = { flavor: new Map<string, number>(), temp: new Map<string, number>(), cup: new Map<string, number>() };
  const fits = (order: CafeOrder) => (
    (counts.flavor.get(order.flavor) || 0) < caps.flavor &&
    (counts.temp.get(order.temp) || 0) < caps.temp &&
    (counts.cup.get(order.cup) || 0) < caps.cup
  );
  const take = (order: CafeOrder) => {
    picked.push(order);
    counts.flavor.set(order.flavor, (counts.flavor.get(order.flavor) || 0) + 1);
    counts.temp.set(order.temp, (counts.temp.get(order.temp) || 0) + 1);
    counts.cup.set(order.cup, (counts.cup.get(order.cup) || 0) + 1);
  };
  for (const order of candidates) if (picked.length < count && fits(order)) take(order);
  for (const order of candidates) if (picked.length < count && !picked.includes(order)) take(order);
  return picked.slice(0, count);
}

export type CafeCustomerSeed = {
  id: string; table: number; name: string; story: string; whisper: string; order: CafeOrder; hidden: ClueKey[];
};

export function customerSeeds(level: CafeLevel, challenge: boolean, random: () => number): CafeCustomerSeed[] {
  const count = challenge ? 8 : 6;
  const orders = orderDeck(count, random);
  const stories = shuffle(level.stories, random).slice(0, count);
  const hiddenCount = challenge ? (level.index >= 2 ? 2 : 1) : 0;
  const keys: ClueKey[] = ['flavor', 'temp', 'cup'];
  const hiddenChoices = shuffle(keys, random);
  return orders.map((order, index) => {
    const story = stories[index % stories.length];
    return {
      id: `tamu-${index + 1}`,
      table: index + 1,
      name: story.name,
      story: story.story,
      whisper: story.whisper,
      order,
      hidden: hiddenCount ? hiddenChoices.slice(0, hiddenCount) : []
    };
  });
}

export function tableLimit(challenge: boolean) { return challenge ? 8 : 6; }
