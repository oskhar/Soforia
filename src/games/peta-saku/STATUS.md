# Status game:peta-saku

Diperbarui: 16 November 2026.

## Selesai

- Game navigasi asimetris lengkap untuk dua pemain dengan tiga kota: Kota Kembang, Pelabuhan Senja, Bukit Bulan.
- Pemilihan peran di awal ronde: kedua HP menampilkan pilihan **HP ini pegang peta** atau **HP ini menyetir**. Ketukan pertama mengunci kedua stick, mobil dan timer diam sampai peran dikunci, lalu input gas/kemudi serta peta mengikuti pilihan tersebut.
- Payload publik/pengemudi tidak memuat peta, rute, jalan, bangunan, tujuan, atau koordinat pin. Peta penuh hanya ada pada payload privat navigator yang sudah dikunci dan digambar di kanvas HP navigator.
- Fisika mengemudi: kemudi analog, gas/rem/mundur, hambatan off-road/air, tabrakan bangunan, derek ke jalan terdekat, deteksi salah belok tanpa mengakhiri ronde.
- Tiga rute memakai jaringan jalan yang saling terhubung; level 1 dan 3 memakai seluruh grid/serpentin, level 2 memutar melalui pelabuhan kemudian jembatan dan dermaga. Panjang rute sekitar 3,4 km / 2,9 km / 3,1 km.
- Mode santai tanpa timer dan mode tantangan dengan target waktu, bahan bakar, serta bintang hasil. Kehabisan bahan bakar membuat mobil merayap, bukan gagal total.
- HUD laptop: kecepatan/gear, waktu atau target, salah belok, bahan bakar, pesan, jarak, dan ikon arah pin tanpa peta.
- Peta navigator kanvas: jalan, bangunan, taman, air, landmark, rute, tujuan, jejak perjalanan, mobil, pin, reticle, geser, cubit, zoom, fokus mobil, dan muat rute.
- Audio WebAudio: mesin, klakson, pin, salah belok, derek, dan finis.
- Posisi awal mobil dan kamera dibersihkan dari bangunan/landmark; kamera memendek saat akan menabrak bangunan.
- Mode keyboard developer tidak diaktifkan karena peran navigator memerlukan peta sentuh di HP B.
- Aset KayKit City Builder Bits (CC0) tercatat di README; geometri kota, jalan, taman, bukit, air, dan landmark dibuat lokal.

## Verifikasi aktual

| Perintah | Hasil |
|---|---|
| `npm test -- --scope game:peta-saku` | 11/11 lulus (privasi payload, tiga kota selesai via autopilot, pemilihan/tukar peran, input slot pengemudi, salah belok, pin, derek, bahan bakar, jaringan jalan, spawn kamera, clamp pin) |
| `npm test` | 76/76 lulus (seluruh suite, termasuk platform server) |
| `npm run check` | lulus (registry, batas arsitektur, `tsc --noEmit`) |
| `npm run build` | lulus |
| `npm run check:scope -- --working` | lulus: `scope game:peta-saku`, 26 file, tanpa review pemilik |
| Browser Playwright + Chromium/SwiftShader | PASS: dua controller, 3D tanpa error, peta hanya di HP navigator, pin muncul di HUD, mobil bergerak, portrait/landscape muat, tanpa request eksternal |
| Browser Playwright pemilihan peran | PASS: overlay peran muncul di portrait/landscape, mobil/timer diam sebelum peran dikunci, HP B memilih menyetir lalu menjadi pengemudi slot 1, peta hanya muncul di HP A sebagai navigator slot 0, gas dari slot 1 menggerakkan mobil 6,3 m, pin dari slot 0 diterima |

Bukti: `evidence/peta-role-browser-report.json`, `evidence/peta-browser-report.json`, dan lima tangkapan layar di `evidence/`.

## Keterbatasan

- Belum ada playtest pasangan dengan dua HP fisik; belum ada pengukuran RTT, input-to-photon, atau FPS/GPU nyata.
- Browser check memakai SwiftShader dan tidak menggantikan uji perangkat. Pemilihan peran baru diuji di browser, belum dengan pasangan manusia yang berebut tombol peran.
- Perjalanan tidak diselesaikan otomatis lewat browser; penyelesaian rute dibuktikan autopilot unit test.
- Rute panjang memakai pengulangan sebagian jalan pada level 2 dan 3; secara desain ini jalan memutar, bukan jalan buntu.

## Titik lanjut

- Playtest dua HP fisik dan penyesuaian kenyamanan kemudi, ukuran peta, serta keseimbangan target waktu.
- Ukur performa 3D pada laptop kelas bawah dan pertimbangkan LOD/instancing tambahan bila perlu.
- Pertimbangkan variasi kota keempat dan seleksi rute bercabang eksplisit bila ingin replayability lebih besar.
