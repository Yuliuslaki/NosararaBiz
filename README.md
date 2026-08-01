# Nosarara Biz

**Nosarara Biz** adalah aplikasi pencatatan dan pengelolaan usaha berbasis mobile yang dirancang untuk membantu pelaku UMKM menjalankan aktivitas operasional usaha secara lebih terstruktur, sederhana, dan efisien.

Aplikasi ini dikembangkan sebagai solusi digital bagi usaha yang masih melakukan pencatatan transaksi, stok, pemasukan, dan pengeluaran secara manual. Dengan Nosarara Biz, pemilik usaha dapat mengelola data usaha melalui satu aplikasi yang dapat digunakan langsung pada perangkat Android.

## Tujuan Aplikasi

Nosarara Biz bertujuan membantu pelaku UMKM dalam:

* mencatat transaksi penjualan;
* mengelola produk dan persediaan stok;
* mencatat pemasukan dan pengeluaran;
* melihat riwayat transaksi;
* memantau pergerakan stok;
* mengelola akun petugas;
* melihat ringkasan dan laporan usaha;
* mendukung pencatatan pembayaran tunai dan QRIS.

Aplikasi ini menggunakan pendekatan **offline-first**, sehingga data utama disimpan secara lokal pada perangkat menggunakan SQLite. Pendekatan ini dipilih agar aplikasi tetap dapat digunakan tanpa bergantung pada koneksi internet atau biaya layanan server.

## Latar Belakang

Sebagian pelaku UMKM masih mencatat transaksi dan stok menggunakan buku tulis atau catatan sederhana. Kondisi tersebut dapat menyebabkan beberapa masalah, seperti:

* kesalahan dalam menghitung transaksi;
* ketidaksesuaian antara stok fisik dan catatan;
* kesulitan melihat riwayat pemasukan dan pengeluaran;
* lambatnya proses pembuatan laporan usaha;
* sulitnya memantau perkembangan usaha secara berkala.

Nosarara Biz dikembangkan untuk membantu mengurangi permasalahan tersebut dengan menyediakan pencatatan usaha yang lebih terintegrasi.

## Fitur Utama

### 1. Autentikasi Pengguna

Aplikasi menyediakan sistem login untuk membatasi akses berdasarkan pengguna.

Pada tahap pengembangan saat ini, aplikasi memiliki dua jenis peran:

* **Owner**, sebagai pemilik usaha dengan akses penuh;
* **Officer**, sebagai petugas usaha dengan akses terbatas.

Fitur Owner menjadi fokus utama pengembangan saat ini. Dashboard Officer masih berada dalam tahap pengembangan.

### 2. Manajemen Produk dan Stok

Owner dapat menambahkan dan mengelola produk yang dijual.

Beberapa kategori produk yang didukung antara lain:

* telur;
* pupuk;
* ayam afkir;
* produk lainnya.

Untuk produk telur, stok dapat dihitung menggunakan satuan:

* butir;
* rak.

Jumlah telur dalam satu rak dapat disesuaikan berdasarkan kebutuhan usaha.

### 3. Transaksi Penjualan

Aplikasi dapat digunakan untuk mencatat transaksi penjualan dengan langkah berikut:

1. memilih produk;
2. menentukan jumlah pembelian;
3. memilih metode pembayaran;
4. menyimpan transaksi;
5. mengurangi stok secara otomatis;
6. mencatat pemasukan ke buku kas.

Setiap transaksi memiliki nomor transaksi unik dan tersimpan dalam riwayat transaksi.

### 4. Pembayaran Tunai

Pada pembayaran tunai, pengguna dapat memasukkan jumlah uang yang diterima.

Aplikasi akan:

* memeriksa kecukupan pembayaran;
* menghitung total transaksi;
* menghitung jumlah kembalian;
* menyimpan transaksi secara otomatis.

### 5. Prototype Pembayaran QRIS

Nosarara Biz memiliki fitur simulasi pembayaran QRIS untuk mendemonstrasikan alur pembayaran digital pada aplikasi.

Fitur ini dapat:

* membuat sesi pembayaran;
* menghasilkan nomor referensi;
* menampilkan nominal pembayaran;
* menghasilkan kode QR;
* memberikan batas waktu pembayaran;
* menyimulasikan pembayaran berhasil;
* mencatat transaksi ke dalam sistem.

> **Catatan penting:** fitur QRIS yang tersedia saat ini masih berupa prototype atau simulasi dan belum terhubung dengan penyedia pembayaran, acquirer, payment gateway, atau QRIS dinamis resmi.

Kode QR yang dihasilkan digunakan untuk mendemonstrasikan proses pembayaran dan pencatatan transaksi pada aplikasi. Kode tersebut belum digunakan untuk melakukan pembayaran nyata ke rekening merchant.

Pada implementasi produksi, fitur ini direncanakan untuk diintegrasikan dengan layanan QRIS resmi melalui backend dan penyedia pembayaran yang berizin.

### 6. Riwayat Transaksi

Owner dapat melihat transaksi yang telah tersimpan, termasuk informasi:

* nomor transaksi;
* tanggal transaksi;
* metode pembayaran;
* produk yang terjual;
* jumlah transaksi;
* total pembayaran.

Riwayat transaksi tidak dapat dihapus atau dibatalkan melalui aplikasi untuk menjaga konsistensi data usaha.

### 7. Riwayat Stok

Setiap perubahan stok dicatat dalam riwayat stok.

Riwayat tersebut dapat menunjukkan:

* produk yang mengalami perubahan;
* jumlah stok sebelum dan sesudah perubahan;
* jenis perubahan stok;
* waktu perubahan;
* pengguna yang melakukan aktivitas.

### 8. Buku Kas

Buku kas digunakan untuk mencatat kondisi keuangan usaha.

Aplikasi mencatat:

* pemasukan dari transaksi penjualan;
* pengeluaran usaha;
* kategori transaksi;
* keterangan transaksi;
* waktu pencatatan.

Setiap transaksi penjualan yang berhasil akan secara otomatis tercatat sebagai pemasukan.

### 9. Laporan Usaha

Halaman laporan dirancang untuk membantu Owner melihat ringkasan kondisi usaha.

Rencana pengembangan laporan mencakup:

* laporan penjualan;
* laporan pemasukan dan pengeluaran;
* laporan stok;
* laporan transaksi berdasarkan periode;
* pembuatan laporan dalam format PDF;
* pembuatan laporan dalam format Excel;
* pengiriman laporan ke WhatsApp.

Fitur pembuatan dan pengiriman laporan masih berada dalam tahap pengembangan.

## Teknologi yang Digunakan

Nosarara Biz dikembangkan menggunakan teknologi berikut:

* React Native;
* Expo;
* TypeScript;
* SQLite;
* Expo SQLite;
* Drizzle ORM;
* NativeWind;
* Expo Secure Store;
* Expo Crypto;
* React Native QR Code SVG.

## Arsitektur Penyimpanan Data

Aplikasi menggunakan SQLite sebagai basis data lokal.

Data yang dikelola meliputi:

* pengguna;
* produk;
* stok;
* transaksi;
* rincian transaksi;
* buku kas;
* riwayat perubahan stok;
* data konfigurasi usaha.

Penyimpanan lokal memungkinkan aplikasi digunakan tanpa koneksi internet. Sinkronisasi lintas perangkat dan penyimpanan cloud direncanakan sebagai pengembangan lanjutan.

## Status Pengembangan

Nosarara Biz masih berada dalam tahap pengembangan dan prototype.

Fitur yang menjadi fokus saat ini adalah:

* pengaturan awal usaha;
* login pengguna;
* manajemen produk;
* manajemen stok;
* transaksi penjualan;
* pembayaran tunai;
* simulasi QRIS;
* riwayat transaksi;
* buku kas;
* manajemen petugas;
* dasar halaman laporan.

Beberapa fitur yang masih dalam tahap pengembangan antara lain:

* dashboard Officer;
* integrasi QRIS resmi;
* sinkronisasi lintas perangkat;
* backend dan penyimpanan cloud;
* laporan PDF dan Excel;
* pengiriman laporan ke WhatsApp;
* notifikasi laporan otomatis.

## Menjalankan Aplikasi

Pastikan Node.js dan npm telah terpasang.

Clone repository:

```bash
git clone https://github.com/Yuliuslaki/NosararaBiz.git
```

Masuk ke folder proyek:

```bash
cd NosararaBiz
```

Instal dependensi:

```bash
npm install
```

Jalankan aplikasi:

```bash
npx expo start
```

Aplikasi dapat dibuka menggunakan Expo Go pada perangkat Android yang berada dalam jaringan yang sama dengan komputer pengembangan.

Untuk menjalankan pada Android:

```bash
npm run android
```

Untuk menjalankan versi web:

```bash
npm run web
```

## Pemeriksaan Proyek

Untuk memeriksa kompatibilitas dependensi Expo, jalankan:

```bash
npx expo-doctor
```

Untuk memeriksa kode TypeScript, tambahkan script berikut pada `package.json`:

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit"
  }
}
```

Kemudian jalankan:

```bash
npm run typecheck
```

## Batasan Aplikasi

Versi saat ini memiliki beberapa batasan:

* data hanya tersimpan pada perangkat lokal;
* belum mendukung sinkronisasi lintas perangkat;
* belum memiliki backend produksi;
* QRIS masih berupa simulasi;
* belum menerima notifikasi pembayaran nyata;
* laporan PDF dan Excel belum tersedia sepenuhnya;
* dashboard Officer belum selesai dikembangkan.

## Rencana Pengembangan

Pengembangan selanjutnya direncanakan mencakup:

* integrasi QRIS dinamis resmi;
* backend untuk verifikasi pembayaran;
* sinkronisasi data lintas perangkat;
* penyimpanan dan pencadangan cloud;
* dashboard Officer;
* laporan PDF dan Excel;
* integrasi WhatsApp Business Platform;
* pengiriman laporan usaha;
* peningkatan keamanan dan audit transaksi;
* pengujian otomatis;
* peningkatan pengalaman pengguna.

## Penggunaan dalam Perlombaan

Aplikasi ini dikembangkan sebagai prototype solusi digitalisasi UMKM.

Dalam konteks perlombaan, Nosarara Biz mendemonstrasikan bagaimana sebuah aplikasi dapat membantu pelaku UMKM dalam:

* mencatat transaksi;
* mengelola stok;
* mencatat keuangan;
* melihat laporan usaha;
* mendukung alur pembayaran digital berbasis QRIS.

Implementasi QRIS pada versi perlombaan masih berfungsi sebagai simulasi alur pembayaran. Integrasi pembayaran resmi menjadi bagian dari rencana implementasi lanjutan.

## Lisensi

Proyek ini dikembangkan untuk keperluan pembelajaran, penelitian, pengembangan, dan perlombaan digitalisasi UMKM.

Hak penggunaan dan pengembangan lebih lanjut mengikuti kebijakan pemilik repository.

## Pengembang

Dikembangkan oleh **Yuliuslaki** melalui repository:

`Yuliuslaki/NosararaBiz`
