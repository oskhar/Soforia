# Peta Saku

Scope: `game:peta-saku`. Game navigasi asimetris untuk dua pemain: satu menyetir, satu memegang satu-satunya peta.

## Konsep

Di awal setiap perjalanan, kedua HP menampilkan pilihan peran. Ketukan pertama pada **HP ini pegang peta** atau **HP ini menyetir** mengunci kedua stick: satu menjadi navigator, satu menjadi pengemudi. Mobil dan timer tetap diam sampai peran dikunci, jadi pasangan bisa bertukar peran di setiap ronde.

Laptop/TV hanya menampilkan tampilan pengemudi dari belakang mobil. Peta penuh, rute, tujuan, nama jalan, dan lokasi pin tidak pernah masuk payload publik atau payload pengemudi. Navigator memegang peta top-down di HP, menggeser/mencubit peta, lalu menekan **Pin** untuk mengirim arah. Pengemudi hanya melihat ikon arah dan jarak pada HUD.

Tiga kota deterministik:

| Level | Kota | Ciri |
|---|---|---|
| 1 | Kota Kembang | grid pusat kota, boulevard diagonal, menara jam |
| 2 | Pelabuhan Senja | gudang, dermaga, jembatan, mercusuar di atas air |
| 3 | Bukit Bulan | jalan berkelok di perbukitan menuju observatorium |

Rute memakai jaringan jalan yang saling terhubung. Tidak ada jalan buntu permanen; salah belok menambah hitungan dan pesan, bukan mengakhiri ronde. Mode **Santai** tanpa timer. Mode **Tantangan** menambahkan target waktu dan bahan bakar; kehabisan bahan bakar membuat mobil merayap, bukan berhenti total.

## Kontrol

| Peran | Kontrol |
|---|---|
| Pengemudi (stick yang memilih **HP ini menyetir**) | analog kemudi · **Gas** · **Rem** · **Klakson** · **Tarik** ke jalan terdekat |
| Navigator (stick yang memilih **HP ini pegang peta**) | geser peta · cubit/roda untuk zoom · **Pin** di reticle · **Hapus** · **Fokus** mobil · **Muat rute** · zoom `+`/`−` |

Pilihan peran muncul setelah hitungan tutorial, sebelum mobil bergerak. Pilihan pertama mengunci kedua stick; pilihan berikutnya diabaikan. Mode keyboard developer dan seleksi stage lewat keyboard tidak diaktifkan karena peran navigator memerlukan peta sentuh di salah satu HP.

Pin hanya diterima dari slot navigator dan dijepit ke batas kota. Pengemudi tidak dapat memasang pin, dan derek hanya diterima dari slot pengemudi.

## Aturan otoritatif

`peta.ts` menyimpan mobil, rute, progres, salah belok, bahan bakar, pin, peran, dan hasil. `peta-city.ts` hanya berisi geometri kota dan tidak memuat rute/tujuan. `peta-routes.ts` hanya diimpor modul server. `publicPeta()` mengekspos posisi mobil, statistik, bearing/jarak pin, serta `rolesLocked`/`driverSlot`/`navigatorSlot`; `privatePeta(slot)` mengembalikan `{}` untuk pengemudi dan rute lengkap hanya untuk navigator yang sudah dikunci.

Fisika memakai kemudi bicycle-style, akselerasi/rem/mundur, hambatan off-road dan air, tabrakan bangunan, serta derek ke jalan terdekat. Kamera mengecilkan jarak jika akan masuk bangunan/landmark, dan posisi awal digeser sepanjang rute sampai mobil serta kamera bebas hambatan.

## Aset dan lisensi

- Model kota dan mobil: **KayKit City Builder Bits** oleh Kay Lousberg, CC0 — `public/assets/kaykit-city/` dan `public/assets/kaykit-city/LICENSE.txt`. Yang dipakai: `car_sedan`, varian mobil parkir, `building_A`–`building_H`.
- Bangunan prosedural, jalan, trotoar, marka, taman, bukit, air, awan, dan landmark dibuat di `console.ts`/`peta-city.ts`; tidak ada aset eksternal saat runtime.
- Audio disintesis dengan WebAudio di `peta-audio.ts`.

## Peta file

| Perubahan | Baca/edit |
|---|---|
| Aturan otoritatif | `peta.ts`, `server.ts` |
| Rute dan tujuan privat | `peta-routes.ts` |
| Geometri kota deterministik | `peta-city.ts` |
| Layar laptop/scene 3D | `console.ts`, `hud.ts`, `peta-presentation.ts` |
| Controller HP | `controller.ts` |
| Peta navigator kanvas | `peta-navigator.ts` |
| Audio | `peta-audio.ts` |
| Lifecycle client | `client.ts` |
| Menu/artwork | `manifest.json`, `art.ts` |
| Gaya lokal | `style.css` |
| Tes dan bukti | `tests/`, `evidence/`, `STATUS.md` |

## Verifikasi

```bash
npm test -- --scope game:peta-saku
npm run check
npm run build
npm run check:scope -- --working
```

Bukti browser terakhir: `evidence/peta-role-browser-report.json` untuk pemilihan peran dan perpindahan peta, serta `evidence/peta-browser-report.json` dan tangkapan `peta-display-arrival.png`, `peta-display-pin.png`, `peta-navigator-portrait.png`, `peta-navigator-landscape.png`, `peta-driver-portrait.png`.

## Keterbatasan

Belum ada playtest dua HP fisik, pengukuran FPS/GPU nyata, atau pengukuran input-to-photon. Pemeriksaan browser memakai Chromium + SwiftShader; hasilnya bukan bukti latensi perangkat atau kenyamanan kontrol fisik. Durasi perjalanan dihitung dari autopilot tes, bukan sesi manusia.
