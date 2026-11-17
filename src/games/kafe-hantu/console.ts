import type {SceneKit} from '../../shared/game-contracts.ts';
import * as T from 'three';
import {addAsset} from '../../shared/renderer/assets3d.ts';
import {cafeLevel, type CafeLevel, type CafePalette, type CafeSpot} from './cafe-levels.ts';

type LabelFactory = (text: string, x: number, y: number, z: number, width: number, color: string, bg: string) => T.Sprite;
type GhostVisual = { group: T.Group; material: T.MeshStandardMaterial; halo: T.Mesh; baseY: number; phase: number };
type SteamVisual = { mesh: T.Mesh; y: number; phase: number; table: number };
type TableVisual = { spot: CafeSpot; label: T.Sprite; steam: SteamVisual[]; cup: T.Mesh; candle: T.Mesh };

function paletteFor(level: CafeLevel, dawn: boolean): CafePalette & {skyNow: string; lowNow: string; fogNow: string; glowNow: string} {
  return {
    ...level.palette,
    skyNow: dawn ? level.palette.dawnSky : level.palette.sky,
    lowNow: dawn ? level.palette.dawnLow : level.palette.skyLow,
    fogNow: dawn ? level.palette.dawnFog : level.palette.fog,
    glowNow: dawn ? level.palette.dawnLight : level.palette.glow
  };
}

function own<T extends T.Material | T.BufferGeometry>(mesh: T.Mesh, value: T, kind: 'material' | 'geometry') {
  mesh.userData[kind === 'material' ? 'ownedMaterial' : 'ownedGeometry'] = value;
  return mesh;
}

function glowMaterial(color: string, opacity = 1, depthWrite = true) {
  return new T.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: .7, roughness: .8, metalness: .04,
    transparent: opacity < 1, opacity, depthWrite
  });
}

function flatMaterial(color: string, opacity = 1) {
  return new T.MeshBasicMaterial({color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1});
}

function box(parent: T.Object3D, color: string, x: number, y: number, z: number, w: number, h: number, d: number) {
  const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), new T.MeshStandardMaterial({color, roughness: .84, metalness: .02}));
  mesh.position.set(x, y, z);
  return mesh;
}

function addBox(parent: T.Object3D, color: string, x: number, y: number, z: number, w: number, h: number, d: number) {
  const mesh = box(parent, color, x, y, z, w, h, d);
  own(mesh, mesh.geometry, 'geometry'); own(mesh, mesh.material as T.Material, 'material');
  mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}

function addCylinder(parent: T.Object3D, color: string, x: number, y: number, z: number, radius: number, height: number, segments = 18) {
  const mesh = new T.Mesh(new T.CylinderGeometry(radius * .88, radius, height, segments), new T.MeshStandardMaterial({color, roughness: .78, metalness: .05}));
  own(mesh, mesh.geometry, 'geometry'); own(mesh, mesh.material as T.Material, 'material');
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}

function buildRoom(level: CafeLevel, p: ReturnType<typeof paletteFor>, world: T.Group, labelFactory: LabelFactory) {
  const {width: W, depth: D, wallHeight: H, counterZ} = level.room;
  addBox(world, p.floor, 0, -.22, 0, W, .34, D);
  // Papan lantai: garis tipis memberi skala tanpa tekstur jaringan.
  for (let z = -D / 2 + .55; z < D / 2; z += .72) addBox(world, p.floorAlt, 0, .012, z, W - .35, .018, .025);
  addBox(world, p.rug, 0, .035, .25, Math.min(9.8, W - 3.7), .035, Math.min(5.8, D - 5.2));
  addBox(world, p.trim, 0, .045, .25, Math.min(9.9, W - 3.6), .012, Math.min(5.9, D - 5.1));

  // Dinding belakang dan samping, tanpa dinding depan agar kamera bisa masuk.
  addBox(world, p.wall, 0, H / 2, -D / 2, W, H, .34);
  addBox(world, p.wainscot, 0, .95, -D / 2 + .2, W - .2, 1.9, .14);
  addBox(world, p.trim, 0, 1.93, -D / 2 + .2, W - .2, .1, .18);
  addBox(world, p.wall, -W / 2, H / 2, 0, .34, H, D);
  addBox(world, p.wainscot, -W / 2 + .2, .95, 0, .14, 1.9, D - .2);
  addBox(world, p.wall, W / 2, H / 2, 0, .34, H, D);
  addBox(world, p.wainscot, W / 2 - .2, .95, 0, .14, 1.9, D - .2);
  addBox(world, p.trim, 0, H - .18, -D / 2 + .2, W - .2, .14, .22);

  // Balok langit-langit: membuat ruang terasa seperti kafe tua, bukan kotak kosong.
  for (let x = -W / 2 + 2.2; x < W / 2; x += 3.8) addBox(world, p.wood, x, H - .18, -.6, .22, .22, D - .8);
  addBox(world, p.wood, 0, H - .35, -D / 2 + .36, W - .3, .22, .26);

  // Jendela besar di dinding belakang.
  const windowCount = level.index === 1 ? 2 : 3;
  for (let i = 0; i < windowCount; i++) {
    const x = (i - (windowCount - 1) / 2) * (W / (windowCount + 1.6));
    buildWindow(world, p, x, 3.75, -D / 2 + .19, 2.5, 2.9, i === 0);
  }
  if (level.index === 2) buildDormer(world, p, D, H);
  buildShelf(world, p, -7.35, 3.1, -D / 2 + .34, level.index === 1 ? 2.4 : 1.7);
  buildDoor(world, p, W / 2 - 2.1, 2.25, -D / 2 + .23);

  // Lampu gantung dan kabelnya.
  for (const x of [-4.5, 0, 4.5]) buildPendant(world, p, x, H - 1.05, -2.1 + (x === 0 ? .2 : 0), H);
  buildCounter(world, level, p, counterZ, labelFactory);
  buildStringLights(world, p, W, H);
}

function buildWindow(world: T.Group, p: ReturnType<typeof paletteFor>, x: number, y: number, z: number, w: number, h: number, moon: boolean) {
  addBox(world, p.trim, x, y, z, w + .28, h + .28, .12);
  const sky = new T.Mesh(new T.BoxGeometry(w, h, .035), new T.MeshBasicMaterial({color: p.skyNow}));
  sky.position.set(x, y, z + .1); own(sky, sky.material as T.Material, 'material'); world.add(sky);
  const low = new T.Mesh(new T.BoxGeometry(w - .05, h * .42, .02), new T.MeshBasicMaterial({color: p.lowNow}));
  low.position.set(x, y - h * .28, z + .13); own(low, low.material as T.Material, 'material'); world.add(low);
  addBox(world, p.trim, x, y, z + .16, .075, h, .06);
  addBox(world, p.trim, x, y + h * .17, z + .16, w, .055, .06);
  addBox(world, p.trim, x, y + h * .48, z + .16, w + .24, .12, .18);
  addBox(world, p.trim, x, y - h * .48, z + .16, w + .24, .12, .18);
  if (moon) {
    const moonMesh = new T.Mesh(new T.SphereGeometry(.38, 16, 12), glowMaterial('#f2dfb1', 1, true));
    moonMesh.position.set(x + w * .22, y + h * .25, z + .24); own(moonMesh, moonMesh.material as T.Material, 'material'); world.add(moonMesh);
    const glow = new T.Mesh(new T.SphereGeometry(.62, 16, 12), glowMaterial('#f2dfb1', .12, false));
    glow.position.copy(moonMesh.position); world.add(glow);
  }
  for (let i = 0; i < 9; i++) {
    const star = new T.Mesh(new T.SphereGeometry(.022, 6, 4), flatMaterial(i % 3 ? '#f6e6ba' : '#b8d1e6', .8));
    star.position.set(x - w * .38 + ((i * 37) % 100) / 100 * w * .76, y - h * .25 + ((i * 23) % 100) / 100 * h * .56, z + .19);
    world.add(star);
  }
}

function buildDormer(world: T.Group, p: ReturnType<typeof paletteFor>, D: number, H: number) {
  const roof = new T.Mesh(new T.BoxGeometry(5.4, .24, 3.8), new T.MeshStandardMaterial({color: p.wood, roughness: .82}));
  roof.position.set(0, H - 1.1, -D / 2 + 1.65); roof.rotation.x = -.36; roof.castShadow = true; world.add(roof);
  for (const x of [-1.45, 1.45]) {
    addBox(world, p.trim, x, H - 1.6, -D / 2 + 1.5, .16, 2.2, .16).rotation.x = -.3;
    addBox(world, p.trim, x, H - 1.4, -D / 2 + 2.55, .16, 2.05, .16).rotation.x = -.3;
  }
  addBox(world, p.skyNow, 0, H - 1.15, -D / 2 + .35, 2.1, 1.2, .04);
  addBox(world, p.trim, 0, H - .54, -D / 2 + .43, 2.35, .12, .16);
  const sun = new T.Mesh(new T.SphereGeometry(.28, 16, 12), glowMaterial(p.glowNow, 1, true));
  sun.position.set(0, H - 1.2, -D / 2 + .52); world.add(sun);
}

function buildClock(world: T.Group, p: ReturnType<typeof paletteFor>, x: number, y: number, z: number) {
  const face = new T.Mesh(new T.CylinderGeometry(1.25, 1.25, .16, 36), new T.MeshStandardMaterial({color: '#d8be8d', roughness: .8}));
  face.rotation.x = Math.PI / 2; face.position.set(x, y, z); face.castShadow = true; world.add(face);
  const rim = new T.Mesh(new T.TorusGeometry(1.28, .08, 8, 40), new T.MeshStandardMaterial({color: p.trim, metalness: .35, roughness: .45}));
  rim.position.set(x, y, z + .1); world.add(rim);
  const handA = addBox(world, '#4b3028', x, y, z + .15, .07, 1.02, .045); handA.geometry.translate(0, .45, 0);
  const handB = addBox(world, '#4b3028', x, y, z + .16, .05, .72, .045); handB.geometry.translate(0, .3, 0);
  const hub = new T.Mesh(new T.SphereGeometry(.09, 12, 8), new T.MeshStandardMaterial({color: p.trim, metalness: .5, roughness: .3}));
  hub.position.set(x, y, z + .2); world.add(hub);
  // Sprites label dihindari untuk jam; angka kecil dibuat sebagai titik kuningan.
  for (let i = 0; i < 12; i++) {
    const dot = new T.Mesh(new T.SphereGeometry(.035, 6, 4), flatMaterial(p.trim));
    const angle = i / 12 * Math.PI * 2;
    dot.position.set(x + Math.sin(angle) * 1.03, y + Math.cos(angle) * 1.03, z + .19); world.add(dot);
  }
  return {handA, handB};
}

function buildShelf(world: T.Group, p: ReturnType<typeof paletteFor>, x: number, y: number, z: number, width: number) {
  addBox(world, p.wood, x, y, z, width, .16, .34);
  addBox(world, p.wood, x, y - 1.1, z, width, .14, .34);
  addBox(world, p.wood, x, y + 1.05, z, width, .13, .34);
  for (const side of [-1, 1]) addBox(world, p.wood, x + side * width / 2, y, z, .13, 2.25, .38);
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < Math.floor(width / .26); i++) {
      const color = ['#8f5c4e', '#b68b58', '#52706b', '#c6ae7d', '#75617d'][(i + row * 3) % 5];
      const book = addBox(world, color, x - width / 2 + .22 + i * .26, y - .82 + row * .92, z + .22, .14 + (i % 3) * .025, .52 + (i % 4) * .08, .24);
      book.rotation.z = (i % 2 ? .05 : -.04);
    }
  }
  // Beberapa stoples dan cangkir di atas rak.
  for (let i = 0; i < 4; i++) {
    const jar = addCylinder(world, i % 2 ? '#c5a86f' : '#8cb0a3', x - width / 2 + .45 + i * .65, y + .32, z + .18, .16, .38, 12);
    jar.material = new T.MeshStandardMaterial({color: i % 2 ? '#c5a86f' : '#8cb0a3', roughness: .55, metalness: .12});
  }
}

function buildDoor(world: T.Group, p: ReturnType<typeof paletteFor>, x: number, y: number, z: number) {
  addBox(world, p.wood, x, y, z, 1.45, 3.4, .22);
  addBox(world, p.trim, x, y + 1.72, z + .08, 1.7, .16, .28);
  const knob = new T.Mesh(new T.SphereGeometry(.09, 10, 8), flatMaterial(p.trim));
  knob.position.set(x + .48, y, z + .2); world.add(knob);
}

function buildPendant(world: T.Group, p: ReturnType<typeof paletteFor>, x: number, y: number, z: number, ceiling: number) {
  const cable = Math.max(.18, ceiling - y);
  addBox(world, p.metal, x, y + cable / 2, z, .035, cable, .035);
  const shade = new T.Mesh(new T.ConeGeometry(.52, .48, 18, 1, true), new T.MeshStandardMaterial({color: p.counter, roughness: .5, metalness: .22, side: T.DoubleSide}));
  own(shade, shade.geometry, 'geometry'); own(shade, shade.material as T.Material, 'material');
  shade.position.set(x, y, z); shade.rotation.x = Math.PI; shade.castShadow = true; world.add(shade);
  const bulb = new T.Mesh(new T.SphereGeometry(.12, 12, 8), glowMaterial(p.glowNow, 1, true));
  own(bulb, bulb.geometry, 'geometry'); own(bulb, bulb.material as T.Material, 'material');
  bulb.position.set(x, y - .28, z); world.add(bulb);
}

function buildCounter(world: T.Group, level: CafeLevel, p: ReturnType<typeof paletteFor>, z: number, labelFactory: LabelFactory) {
  const width = Math.min(10.4, level.room.width - 1.8);
  addBox(world, p.counter, 0, .92, z, width, 1.65, 1.22);
  addBox(world, p.counterTop, 0, 1.8, z, width + .35, .16, 1.42);
  addBox(world, p.trim, 0, .13, z + .66, width, .14, .18);
  addBox(world, p.trim, 0, 1.47, z + .66, width, .06, .18);
  for (let i = -2; i <= 2; i++) addBox(world, p.trim, i * 2.1, .85, z + .66, .045, 1.15, .18);
  // Mesin espresso, ketel, dan tumpukan cangkir.
  addBox(world, '#4d4d4b', -2.1, 2.12, z - .1, 1.5, .58, .82);
  addBox(world, '#a87b4f', -2.1, 2.46, z - .1, 1.3, .12, .62);
  addBox(world, '#312b2a', -2.1, 1.86, z + .34, 1.15, .18, .2);
  addBox(world, p.metal, -2.1, 1.72, z + .44, .42, .1, .4);
  const steamArm = addCylinder(world, p.metal, -1.4, 2.3, z + .12, .045, .52, 10); steamArm.rotation.z = -.5;
  addCylinder(world, '#707a73', 1.8, 2.02, z - .12, .28, .48, 16);
  addBox(world, '#707a73', 2.22, 2.1, z - .12, .45, .09, .12);
  for (let i = 0; i < 4; i++) addCylinder(world, '#e3d7be', 3.2 + i * .17, 2.0 + i * .14, z + .18, .17, .25, 12);
  // Dom kue dan piring.
  const dome = new T.Mesh(new T.SphereGeometry(.48, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), new T.MeshStandardMaterial({color: '#d4e1d5', transparent: true, opacity: .28, roughness: .1, metalness: .05, depthWrite: false}));
  dome.position.set(4.2, 1.95, z + .18); world.add(dome);
  addCylinder(world, '#b99b70', 4.2, 1.87, z + .18, .5, .06, 20);
  // Papan menu kecil di atas counter.
  addBox(world, '#243634', 1.25, 2.85, z - .46, 4.2, .9, .1);
  addBox(world, p.trim, 1.25, 3.32, z - .43, 4.35, .08, .14);
  // Label menu menggunakan sprite, aman dari font jaringan.
  const menu = ['KAKAO', 'TEH', 'BINTANG'];
  menu.forEach((text, i) => {
    labelFactory(text, 1.25 + (i - 1) * 1.2, 2.86, z - .2, .9, p.glowNow, '#243634');
  });
  // Panggung rendah dan dua barista di balik counter.
  addBox(world, p.counter, 0, .33, z - .45, 3.25, .66, 1.05);
  for (let i = 0; i < 2; i++) {
    const person = new T.Group(); person.position.set(i ? 1.05 : -1.05, .64, z - .45); person.scale.setScalar(.92); world.add(person);
    addCylinder(person, i ? '#5c7f83' : '#8d6968', 0, .62, 0, .3, .9, 12);
    const head = new T.Mesh(new T.SphereGeometry(.23, 14, 10), new T.MeshStandardMaterial({color: '#e7c7a2', roughness: .9}));
    own(head, head.geometry, 'geometry'); own(head, head.material as T.Material, 'material');
    head.position.set(0, 1.25, 0); person.add(head);
    const hat = new T.Mesh(new T.CylinderGeometry(.22, .26, .16, 14), new T.MeshStandardMaterial({color: p.trim, roughness: .8}));
    own(hat, hat.geometry, 'geometry'); own(hat, hat.material as T.Material, 'material');
    hat.position.set(0, 1.46, 0); person.add(hat);
    addBox(person, '#2e3b3e', 0, .45, .06, .42, .55, .1);
    addBox(person, p.accent, 0, .58, .12, .08, .2, .03);
    labelFactory(i ? 'B' : 'A', i ? 1.05 : -1.05, 2.62, z - .36, .5, '#f5ddb0', '#2d403d');
  }
  // Kait cangkir di dinding belakang counter.
  for (let i = 0; i < 7; i++) addCylinder(world, '#d9c69d', -4.5 + i * .62, 3.75, -level.room.depth / 2 + .5, .13, .2, 10);
}

function buildStringLights(world: T.Group, p: ReturnType<typeof paletteFor>, W: number, H: number) {
  const points: T.Vector3[] = [];
  for (let i = 0; i <= 10; i++) {
    const x = -W / 2 + .8 + (W - 1.6) * i / 10;
    const y = H - 1.15 - Math.sin(i / 10 * Math.PI) * .62;
    points.push(new T.Vector3(x, y, -2.75));
  }
  const bulbMaterial = new T.MeshStandardMaterial({color: p.glowNow, emissive: p.glowNow, emissiveIntensity: 2.8, roughness: .5});
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    const line = new T.Mesh(new T.CylinderGeometry(.018, .018, a.distanceTo(b), 5), new T.MeshStandardMaterial({color: '#716354', roughness: .8}));
    line.position.copy(a).add(b).multiplyScalar(.5);
    line.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    world.add(line);
  }
  for (const [i, point] of points.entries()) {
    if (i === 0 || i === points.length - 1) continue;
    const bulb = new T.Mesh(new T.SphereGeometry(.065, 8, 6), bulbMaterial); bulb.position.copy(point); world.add(bulb);
    if (i === 1) own(bulb, bulbMaterial, 'material');
  }
}

function buildPlant(world: T.Group, p: ReturnType<typeof paletteFor>, x: number, z: number, scale = 1, model = 'quaternius-nature/Plant_1') {
  addCylinder(world, '#8e624b', x, .34 * scale, z, .34 * scale, .68 * scale, 12);
  const fallback = new T.Group();
  const leafA = new T.Mesh(new T.SphereGeometry(.4 * scale, 10, 8), new T.MeshStandardMaterial({color: '#66896d', roughness: .9}));
  leafA.position.set(0, 1.0 * scale, 0); leafA.scale.y = 1.35; fallback.add(leafA);
  const leafB = leafA.clone(); leafB.scale.set(.62, .9, .62); leafB.position.set(.25 * scale, 1.25 * scale, .1 * scale); fallback.add(leafB);
  world.add(fallback);
  addAsset(world, model, {x, y: .55 * scale, z, height: 1.35 * scale, maxFootprint: 1.1 * scale, fallback: [fallback]});
}

function buildCrates(world: T.Group, p: ReturnType<typeof paletteFor>, x: number, z: number, scale = 1) {
  const fallback = new T.Group();
  addBox(fallback, p.wood, 0, .38 * scale, 0, .9 * scale, .76 * scale, .78 * scale);
  addBox(fallback, p.trim, 0, .38 * scale, .4 * scale, .78 * scale, .08 * scale, .06 * scale);
  addBox(fallback, p.trim, 0, .38 * scale, -.4 * scale, .78 * scale, .08 * scale, .06 * scale);
  fallback.position.set(x, 0, z); world.add(fallback);
  addAsset(world, 'quaternius-village/Prop_Crate', {x, y: 0, z, height: .95 * scale, maxFootprint: 1.0 * scale, fallback: [fallback]});
}

function buildTable(world: T.Group, level: CafeLevel, p: ReturnType<typeof paletteFor>, spot: CafeSpot, index: number, labelFactory: LabelFactory) {
  const style = spot.style;
  const topY = style === 'low' ? .52 : .78;
  const topR = style === 'low' ? 1.0 : .88;
  if (style === 'booth') {
    addBox(world, p.wood, spot.x, .5, spot.z, 2.15, .16, 1.15);
    addBox(world, p.fabric, spot.x, .66, spot.z, 2.25, .12, 1.25);
    for (const side of [-1, 1]) {
      addBox(world, p.wood, spot.x + side * 1.15, .48, spot.z, .18, .9, 1.05);
      addBox(world, p.fabric, spot.x + side * 1.15, .95, spot.z, .22, .45, 1.05);
    }
    addBox(world, p.wood, spot.x, .87, spot.z - .62, 2.3, .5, .16);
  } else if (style === 'low') {
    addCylinder(world, p.wood, spot.x, topY - .06, spot.z, .92, .16, 22);
    addCylinder(world, p.wood, spot.x, topY / 2, spot.z, .16, topY, 10);
    addCylinder(world, p.wood, spot.x, .04, spot.z, .5, .08, 16);
    for (let i = 0; i < 3; i++) {
      const angle = i / 3 * Math.PI * 2 + .3;
      const cx = spot.x + Math.sin(angle) * 1.25, cz = spot.z + Math.cos(angle) * 1.25;
      addBox(world, p.fabric, cx, .24, cz, .62, .22, .62);
      addBox(world, p.wood, cx, .47, cz, .62, .5, .1).rotation.y = -angle;
    }
  } else {
    addCylinder(world, p.wood, spot.x, topY - .06, spot.z, topR, .14, 24);
    addCylinder(world, p.wood, spot.x, topY / 2, spot.z, .13, topY, 12);
    addCylinder(world, p.wood, spot.x, .04, spot.z, .48, .08, 18);
    for (let i = 0; i < 3; i++) {
      const angle = i / 3 * Math.PI * 2 + .45;
      const cx = spot.x + Math.sin(angle) * 1.25, cz = spot.z + Math.cos(angle) * 1.25;
      const chair = new T.Group(); chair.position.set(cx, 0, cz); chair.rotation.y = -angle; world.add(chair);
      addBox(chair, p.wood, 0, .46, 0, .64, .12, .64);
      addBox(chair, p.wood, 0, .78, -.25, .64, .62, .09);
      for (const side of [-1, 1]) addBox(chair, p.wood, side * .24, .23, .22, .08, .46, .08);
    }
  }
  // Taplak, lilin, cangkir, dan kartu nomor meja.
  if (style !== 'booth') addCylinder(world, p.fabric, spot.x, topY + .03, spot.z, topR * .94, .035, 24);
  const candle = new T.Mesh(new T.SphereGeometry(.08, 10, 8), glowMaterial(p.glowNow, 1, true));
  candle.position.set(spot.x + .38, topY + .2, spot.z + .22); world.add(candle);
  addCylinder(world, '#d9c28e', spot.x + .38, topY + .11, spot.z + .22, .06, .16, 10);
  const cup = new T.Mesh(new T.CylinderGeometry(.13, .1, .16, 12), new T.MeshStandardMaterial({color: '#eadbc2', roughness: .55, metalness: .05}));
  cup.position.set(spot.x - .3, topY + .12, spot.z - .18); world.add(cup);
  const saucer = new T.Mesh(new T.CylinderGeometry(.2, .2, .025, 16), new T.MeshStandardMaterial({color: p.trim, roughness: .6}));
  saucer.position.set(spot.x - .3, topY + .04, spot.z - .18); world.add(saucer);
  const label = labelFactory(String(spot.table), spot.x, topY + .75, spot.z + .03, .45, '#f1d99e', '#3b2a26');
  const steam: SteamVisual[] = [];
  for (let i = 0; i < 3; i++) {
    const material = new T.MeshStandardMaterial({color: p.glowNow, transparent: true, opacity: .16, depthWrite: false, roughness: 1});
    const wisp = new T.Mesh(new T.SphereGeometry(.055, 8, 6), material);
    wisp.position.set(spot.x - .3 + (i - 1) * .07, topY + .22, spot.z - .18);
    own(wisp, material, 'material'); world.add(wisp);
    steam.push({mesh: wisp, y: topY + .22, phase: index * .8 + i * 1.4, table: spot.table});
  }
  return {spot, label, steam, cup, candle} as TableVisual;
}

function buildGhost(world: T.Group, p: ReturnType<typeof paletteFor>, spot: CafeSpot, seed: number) {
  const group = new T.Group(); group.position.set(spot.x - .08, 0, spot.z + .64); group.rotation.y = spot.yaw + (seed % 2 ? .28 : -.28); world.add(group);
  const color = seed % 2 ? p.ghost : p.ghostAlt;
  const material = new T.MeshStandardMaterial({color, emissive: color, emissiveIntensity: .48, transparent: true, opacity: .3, roughness: .95, depthWrite: false});
  const body = new T.Mesh(new T.ConeGeometry(.48, 1.28, 18, 1, false), material);
  body.position.y = .7; body.castShadow = false; group.add(body);
  const head = new T.Mesh(new T.SphereGeometry(.26, 16, 12), material); head.position.y = 1.42; head.scale.set(.92, 1.05, .92); group.add(head);
  for (const side of [-1, 1]) {
    const arm = new T.Mesh(new T.SphereGeometry(.13, 10, 8), material); arm.scale.set(.7, 1.4, .55); arm.position.set(side * .35, .92, .04); group.add(arm);
  }
  // Sorot hangat kecil di dada membuat hantu terasa ramah, bukan menakutkan.
  const heart = new T.Mesh(new T.SphereGeometry(.075, 8, 6), glowMaterial(p.glowNow, 1, true));
  heart.position.set(0, 1.08, .22); group.add(heart);
  const halo = new T.Mesh(new T.TorusGeometry(.64, .025, 8, 32), glowMaterial(color, .35, false));
  halo.position.y = .02; halo.rotation.x = Math.PI / 2; group.add(halo);
  own(body, material, 'material');
  return {group, material, halo, baseY: group.position.y, phase: seed * 1.7} as GhostVisual;
}

function buildActiveMarker(world: T.Group, p: ReturnType<typeof paletteFor>, level: CafeLevel, labelFactory: LabelFactory) {
  const group = new T.Group(); group.visible = false; world.add(group);
  const ringMat = glowMaterial(p.accent, .72, false);
  const ring = new T.Mesh(new T.TorusGeometry(1.05, .055, 8, 48), ringMat); ring.rotation.x = Math.PI / 2; ring.position.y = .06; group.add(ring); own(ring, ringMat, 'material');
  const inner = new T.Mesh(new T.TorusGeometry(.75, .018, 6, 36), glowMaterial(p.glowNow, .5, false)); inner.rotation.x = Math.PI / 2; inner.position.y = .075; group.add(inner);
  const columnMat = new T.MeshBasicMaterial({color: p.accent, transparent: true, opacity: .055, depthWrite: false, side: T.DoubleSide});
  const column = new T.Mesh(new T.CylinderGeometry(.48, .82, 2.4, 20, 1, true), columnMat); column.position.y = 1.2; group.add(column); own(column, columnMat, 'material');
  const tag = new T.Mesh(new T.BoxGeometry(.9, .38, .05), glowMaterial(p.accent, 1, true)); tag.position.set(0, 2.55, 0); group.add(tag);
  const labels = level.spots.map(spot => ({table: spot.table, sprite: labelFactory(`MEJA ${spot.table}`, spot.x, 2.5, spot.z, 1.15, '#f7dfa7', '#3d2b2a')}));
  labels.forEach(label => { label.sprite.visible = false; });
  return {group, ring, inner, column, tag, labels};
}

function buildAmbient(world: T.Group, p: ReturnType<typeof paletteFor>) {
  const motes: { mesh: T.Mesh; base: T.Vector3; phase: number }[] = [];
  for (let i = 0; i < 36; i++) {
    const mesh = new T.Mesh(new T.SphereGeometry(.022 + (i % 3) * .008, 6, 4), flatMaterial(p.glowNow, .35));
    const base = new T.Vector3(((i * 37) % 160) / 10 - 8, .7 + ((i * 19) % 40) / 10, ((i * 29) % 100) / 10 - 5);
    mesh.position.copy(base); world.add(mesh); motes.push({mesh, base, phase: i * .61});
  }
  return motes;
}

export function buildConsole(g: any, kit: SceneKit) {
  const level = cafeLevel((g.stage ?? 0) + 1);
  const dawn = !!g.finished;
  const p = paletteFor(level, dawn);
  const world = kit.world as T.Group;
  const scene = kit.scene as T.Scene;
  scene.background = new T.Color(p.skyNow);
  scene.fog = new T.Fog(p.fogNow, 23, 58);

  const camera = new T.PerspectiveCamera(42, kit.targetAspect?.() || 1.65, .1, 120);
  camera.position.set(...level.room.camera);
  camera.lookAt(new T.Vector3(...level.room.look));
  kit.camera = camera;

  if (kit.keyLight) {
    kit.keyLight.color.set(dawn ? p.dawnLight : p.moonlight);
    kit.keyLight.intensity = dawn ? 2.8 : 2.05;
    kit.keyLight.position.set(dawn ? 9 : -7, dawn ? 13 : 15, dawn ? 11 : 9);
  }
  const warm = new T.PointLight(p.glowNow, dawn ? 42 : 32, 18, 2);
  warm.position.set(dawn ? 2 : -1.5, 4.4, 2.4); warm.castShadow = false; world.add(warm);
  const windowLight = new T.PointLight(p.moonlight, dawn ? 12 : 9, 15, 2);
  windowLight.position.set(0, 4.2, -level.room.depth / 2 + 1.2); world.add(windowLight);

  const labelFactory: LabelFactory = (text, x, y, z, width, color, bg) => kit.label(world, text, x, y, z, width, color, bg);
  buildRoom(level, p, world, labelFactory);
  // Tanaman dan properti lokal CC0: batang/daun fallback tetap tampil bila model belum selesai dimuat.
  buildPlant(world, p, -level.room.width / 2 + 1.05, 4.65, 1.05, 'quaternius-nature/Plant_7_Big');
  buildPlant(world, p, level.room.width / 2 - 1.05, 4.55, .96, 'quaternius-nature/Plant_1');
  buildPlant(world, p, -level.room.width / 2 + 1.2, -1.7, .78, 'quaternius-nature/Flower_3_Group');
  buildCrates(world, p, -level.room.width / 2 + 1.0, 2.2, .9);
  if (level.index === 2) buildCrates(world, p, level.room.width / 2 - 1.05, -1.1, .82);

  const tables = level.spots.map((spot, i) => buildTable(world, level, p, spot, i, labelFactory));
  const tableLabels = new Map<number, T.Sprite>(tables.map(table => [table.spot.table, table.label]));
  const ghosts = new Map<number, GhostVisual>();
  for (const customer of g.customers || []) {
    const spot = level.spots.find(item => item.table === customer.table);
    if (spot) ghosts.set(customer.table, buildGhost(world, p, spot, customer.table + (dawn ? 11 : 0)));
  }
  const marker = buildActiveMarker(world, p, level, labelFactory);
  const motes = buildAmbient(world, p);
  const clock = level.index === 1 ? buildClock(world, p, 5.25, 4.05, -level.room.depth / 2 + .36) : null;

  kit.animate(world, (state: any, time: number) => {
    const publicCustomers = state.customers || [];
    const activeTable = state.activeTable;
    for (const [table, ghost] of ghosts) {
      const customer = publicCustomers.find((item: any) => item.table === table);
      const opacity = customer?.status === 'vanishing'
        ? Math.max(0, .3 * (customer.returnIn ?? 0) / 1.7)
        : customer?.status === 'served' ? 0 : .27 + Math.sin(time * 1.2 + ghost.phase) * .035;
      ghost.group.visible = !!customer && customer.status !== 'served' && (customer.status !== 'vanishing' || opacity > .01);
      ghost.material.opacity = opacity;
      ghost.group.position.y = ghost.baseY + Math.sin(time * 1.15 + ghost.phase) * .075;
      ghost.group.rotation.y = (level.spots.find(spot => spot.table === table)?.yaw || 0) + (state.activeTable === table ? .04 : 0);
      ghost.halo.rotation.z = time * .35 + ghost.phase;
      ghost.halo.scale.setScalar(.9 + Math.sin(time * 1.8 + ghost.phase) * .06);
    }
    const spot = level.spots.find(item => item.table === activeTable);
    marker.group.visible = !!spot && !state.finished;
    if (spot) {
      marker.group.position.set(spot.x, 0, spot.z);
      marker.ring.scale.setScalar(1 + Math.sin(time * 2.2) * .05);
      marker.inner.scale.setScalar(1.15 + Math.sin(time * 1.6 + .8) * .1);
      marker.tag.position.y = 2.55 + Math.sin(time * 1.7) * .06;
      marker.ring.rotation.z = time * .22;
    }
    marker.labels.forEach(item => { item.sprite.visible = !!spot && item.table === spot.table; });
    for (const [table, label] of tableLabels) label.visible = table !== activeTable;
    for (const table of tables) {
      const customer = publicCustomers.find((item: any) => item.table === table.spot.table);
      const served = customer?.status === 'served';
      table.candle.visible = !served;
      const cupMaterial = table.cup.material as T.MeshStandardMaterial;
      cupMaterial.color.set(served ? p.accent : '#eadbc2');
      cupMaterial.emissive.set(served ? p.accent : '#000000');
      cupMaterial.emissiveIntensity = served ? .35 : 0;
      for (const wisp of table.steam) {
        const rise = ((time * .38 + wisp.phase) % 1.8);
        wisp.mesh.position.y = wisp.y + rise;
        (wisp.mesh.material as T.MeshStandardMaterial).opacity = Math.max(0, .16 * (1 - rise / 1.8)) * (served ? 1.3 : 1);
      }
    }
    for (const mote of motes) {
      mote.mesh.position.set(mote.base.x + Math.sin(time * .18 + mote.phase) * .55, mote.base.y + Math.sin(time * .32 + mote.phase) * .25, mote.base.z + Math.cos(time * .15 + mote.phase) * .3);
      mote.mesh.scale.setScalar(.7 + Math.sin(time * 1.7 + mote.phase) * .3);
    }
    if (clock) {
      clock.handA.rotation.z = -time * .06;
      clock.handB.rotation.z = -time * .007;
    }
    if (dawn) {
      const glow = .75 + Math.sin(time * .25) * .06;
      windowLight.intensity = 12 * glow;
    }
  });
}
