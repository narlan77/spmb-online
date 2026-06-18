# SPMB Online - Portal Pendaftaran Berbasis Google Drive

Aplikasi SPMB Online adalah platform pendaftaran siswa terintegrasi yang memanfaatkan Google Drive sebagai backend penyimpanan data. Aplikasi ini dirancang untuk memudahkan proses seleksi penerimaan siswa baru dengan sistem yang terstruktur dan user-friendly.

## 📋 Deskripsi Aplikasi

**SPMB Online** (Sistem Penerimaan Siswa Baru Online) adalah solusi digital untuk mengelola proses pendaftaran dan seleksi siswa baru. Aplikasi ini mengintegrasikan berbagai dashboard dengan role-based access control yang memungkinkan setiap pengguna (Super Admin, Admin Sekolah, dan Siswa) memiliki akses sesuai dengan kebutuhan mereka.

## ✨ Fitur Utama

### 1. **Sistem Login Satu Pintu (Single Gateway)**
- **Login Terpadu**: Satu halaman login untuk semua pengguna (Super Admin, Admin Sekolah, dan Siswa)
- **Deteksi Role Otomatis**: Sistem otomatis mendeteksi tipe pengguna berdasarkan akun dan langsung mengarahkan ke dashboard sesuai role
- **Keamanan Terjamin**: Autentikasi dengan email dan password yang aman
- **Akses Kontrol Berbasis Role**: Setiap role memiliki akses dan menu yang berbeda

### 2. **Dashboard Super Admin**
- Kelola seluruh sistem dan data sekolah
- Manajemen admin sekolah (create, read, update, delete)
- Monitoring keseluruhan proses pendaftaran
- Akses ke laporan statistik pendaftaran
- Pengaturan sistem dan konfigurasi aplikasi

### 3. **Dashboard Admin Sekolah**
- Kelola data sekolah dan program pendaftaran
- Monitor pendaftar dan data yang masuk
- Review dan verifikasi data pendaftar
- Generate laporan hasil seleksi
- Manajemen peserta didik dan hasil seleksi

### 4. **Halaman Pendaftaran Akun**
- **Registrasi/Buat Akun**: Calon pendaftar dapat membuat akun baru dengan email dan password
- **Validasi Form**: Validasi data input untuk memastikan kelengkapan data
- **Integrasi Google Drive**: Data tersimpan otomatis di Google Drive

### 5. **Dashboard Siswa**
- **Input Data Pendaftaran**: Form lengkap untuk mengisi data diri, nilai akademis, dan dokumen pendukung
- **Unggah Dokumen**: Upload file (foto, ijazah, sertifikat, dll) langsung ke Google Drive
- **Pantau Status Seleksi**: Tracking real-time status pendaftaran dan hasil seleksi
- **Lihat Hasil**: Informasi diterima atau ditolak dengan feedback dari panitia

## 🏗️ Arsitektur Sistem
