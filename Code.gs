// =============================================================================
//               KONFIGURASI MASTER BASIS DATA CLOUD (SPMB 2026)
// =============================================================================
const FOLDER_UTAMA_ID = "KODE__GDRIVE_FOLDER_UTAMA";
const FOLDER_PENDAFTAR_ID = "KODE_GDRIVE_FOLDER_UNTUK_DATA_PENDAFTARAN";
const MASTER_SS_ID = "KODE_GDRIVE_SPREADSHEET_UTAMA(MASTER_DATABASE)";
const TEMPLATE_SEKOLAH_SS_ID = "KODE_GDRIVE_TEMPLATE_DATA_SEKOLAH";

// =============================================================================
// [1] CORE ENGINE: RENDERING CORE WEB APPLICATION (SPA)
// =============================================================================

/**
 * ENGINE UTAMA: Memuat halaman index dan mengatur header meta tags
 */
function doGet(e) {
  var template = HtmlService.createTemplateFromFile('Index');
  
  return template.evaluate()
    .setTitle("Portal Penerimaan Siswa Baru")
    .setSandboxMode(HtmlService.SandboxMode.IFRAME) // Menggunakan standar sandbox Google
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL); // Atau DENY jika tidak ingin di-embed di web lain
}

/**
 * FUNGSI INJECTOR: Menyatukan komponen file HTML terpisah ke dalam Index.html
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// =============================================================================
// [2] MODUL AUTENTIKASI UTAMA (MULTI-USER & MULTI-TENANT)
// =============================================================================

function prosesAutentikasi(username, password) {
  try {
    var ss = SpreadsheetApp.openById(MASTER_SS_ID);
    
    // 1. Validasi Keberadaan Sheet User_Admin
    var sheetUser = ss.getSheetByName("User_Admin");
    if (!sheetUser) {
      return { status: "error", message: "Gagal menghubungkan ke database: Sheet 'User_Admin' tidak ditemukan!" };
    }
    
    var dataUser = sheetUser.getDataRange().getValues();
    var usernameClean = username.toString().trim();
    var passwordClean = password.toString().trim();
    
    // Cari Kredensial di Tabel Administrator / Operator Kecamatan Dahulu
    for (var i = 1; i < dataUser.length; i++) {
      if (dataUser[i][0].toString().trim() === usernameClean && dataUser[i][1].toString().trim() === passwordClean) {
        return {
          status: "success",
          role: dataUser[i][2], // superadmin / admin_sekolah
          nama: dataUser[i][3],
          username: dataUser[i][0].toString().trim(),
          id_sekolah: dataUser[i][4].toString().trim()
        };
      }
    }
    
    // 2. Jika Tidak Ditemukan di Admin, Cari di User_Admin (Role Siswa)
    for (var i = 1; i < dataUser.length; i++) {
      if (dataUser[i][0].toString().trim() === usernameClean && dataUser[i][1].toString().trim() === passwordClean && dataUser[i][2].toString().trim() === "siswa") {
        return {
          status: "success",
          role: "siswa",
          nama: dataUser[i][3],
          username: usernameClean,
          id_sekolah: dataUser[i][4].toString().trim()
        };
      }
    }
    
    return { status: "error", message: "ID Pengguna (NISN) atau Kata Sandi Anda salah!" };
  } catch (error) {
    return { status: "error", message: "Gangguan Sistem Keamanan: " + error.toString() };
  }
}

// =============================================================================
// [3] MODUL SUPERADMIN: KELOLA SEKOLAH MITRA & GENERATOR PORTAL
// =============================================================================

function ambilSemuaSekolahMitra() {
  try {
    var masterSs = SpreadsheetApp.openById(MASTER_SS_ID);
    var sheetSekolah = masterSs.getSheetByName("Sekolah_Mitra");
    
    if (sheetSekolah.getLastRow() <= 1) return [];
    
    var data = sheetSekolah.getRange(2, 1, sheetSekolah.getLastRow() - 1, 7).getValues();
    var listSekolah = [];
    
    for (var i = 0; i < data.length; i++) {
      listSekolah.push({
        id_sekolah: data[i][0].toString().trim(),
        nama_sekolah: data[i][1].toString().trim(),
        npsn: data[i][2].toString().trim(),
        ss_id: data[i][3].toString().trim(),
        folder_id: data[i][4].toString().trim(),
        status: data[i][5].toString().trim(),
        password_awal: data[i][6].toString().trim()
      });
    }
    return listSekolah;
  } catch (error) {
    throw new Error("Gagal memuat data sekolah mitra: " + error.toString());
  }
}

function tambahSekolahMitra(namaSekolah, npsn) {
  try {
    var masterSs = SpreadsheetApp.openById(MASTER_SS_ID);
    var sheetSekolah = masterSs.getSheetByName("Sekolah_Mitra");
    var sheetUser = masterSs.getSheetByName("User_Admin");
    
    var idSekolah = "SCH-" + Utilities.getUuid().substring(0,5).toUpperCase();
    var karakterSandi = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    var passwordOtomatis = "";
    for (var i = 0; i < 8; i++) {
      passwordOtomatis += karakterSandi.charAt(Math.floor(Math.random() * karakterSandi.length));
    }
    
    var templateFile = DriveApp.getFileById(TEMPLATE_SEKOLAH_SS_ID);
    var folderUtama = DriveApp.getFolderById(FOLDER_PENDAFTAR_ID);
    var newSsFile = templateFile.makeCopy("Database SPMB - " + namaSekolah, folderUtama);
    var subFolderSiswa = folderUtama.createFolder("Berkas - " + namaSekolah);
    
    sheetSekolah.appendRow([idSekolah, namaSekolah, npsn, newSsFile.getId(), subFolderSiswa.getId(), "Aktif", passwordOtomatis]);
    sheetUser.appendRow([idSekolah, passwordOtomatis, "admin_sekolah", "Operator " + namaSekolah, idSekolah]);
    
    SpreadsheetApp.flush();
    return { 
      status: "success", 
      message: "Akun operator berhasil dikonfigurasi.",
      data: { id: idSekolah, pass: passwordOtomatis }
    };
  } catch (error) {
    return { status: "error", message: error.toString() };
  }
}

function hapusSekolahMitra(idSekolah) {
  try {
    var masterSs = SpreadsheetApp.openById(MASTER_SS_ID);
    var sheetSekolah = masterSs.getSheetByName("Sekolah_Mitra");
    var sheetUser = masterSs.getSheetByName("User_Admin");
    
    var dataSekolah = sheetSekolah.getDataRange().getValues();
    for (var i = dataSekolah.length - 1; i >= 1; i--) {
      if (dataSekolah[i][0].toString().trim() === idSekolah.trim()) {
        sheetSekolah.deleteRow(i + 1);
        break;
      }
    }
    
    var dataUser = sheetUser.getDataRange().getValues();
    for (var j = dataUser.length - 1; j >= 1; j--) {
      if (dataUser[j][0].toString().trim() === idSekolah.trim() || dataUser[j][4].toString().trim() === idSekolah.trim()) {
        sheetUser.deleteRow(j + 1);
      }
    }
    SpreadsheetApp.flush();
    return { status: "success", message: "Sekolah berhasil diputus hubungannya." };
  } catch (error) {
    return { status: "error", message: error.toString() };
  }
}

// =============================================================================
// [4] MODUL REGISTRASI MANDIRI SISWA & KEAMANAN CAPTCHA
// =============================================================================

function generateCaptchaLokal() {
  var kumpulanHuruf = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  var kodeCaptcha = "";
  for (var i = 0; i < 5; i++) {
    kodeCaptcha += kumpulanHuruf.charAt(Math.floor(Math.random() * kumpulanHuruf.length));
  }
  return kodeCaptcha;
}

function daftarAkunSiswa(dataSiswa, captchaUser, captchaBenar) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    
    if (captchaUser.toUpperCase() !== captchaBenar.toUpperCase()) {
      return { status: "error", message: "Kode verifikasi Captcha salah! Silakan coba lagi." };
    }
    
    var masterSs = SpreadsheetApp.openById(MASTER_SS_ID);
    var sheetSekolah = masterSs.getSheetByName("Sekolah_Mitra");
    var sheetUserMaster = masterSs.getSheetByName("User_Admin");
    
    if (!sheetUserMaster) {
      return { status: "error", message: "Error: Sheet 'User_Admin' tidak ditemukan di Master Spreadsheet!" };
    }
    
    var dataSekolah = sheetSekolah.getDataRange().getValues();
    var ssIdCabang = "";
    var namaSekolahPilihan = "";
    for (var i = 1; i < dataSekolah.length; i++) {
      if (dataSekolah[i][0].toString().trim() === dataSiswa.id_sekolah.toString().trim()) {
        ssIdCabang = dataSekolah[i][3];
        namaSekolahPilihan = dataSekolah[i][1];
        break;
      }
    }
    
    if (!ssIdCabang) {
      return { status: "error", message: "Sekolah pilihan tidak terdaftar di sistem pusat." };
    }
    
    var ssCabang = SpreadsheetApp.openById(ssIdCabang);
    var sheetPendaftar = ssCabang.getSheetByName("Pendaftar");
    
    if (!sheetPendaftar) {
      return { status: "error", message: "Error: Sheet bernama 'Pendaftar' tidak ditemukan di database cabang!" };
    }
    
    var nisnBaruClean = dataSiswa.username.toString().trim();
    
    // Deteksi Duplikasi NISN di Cabang
    if(sheetPendaftar.getLastRow() > 1) {
      var dataPendaftarLama = sheetPendaftar.getRange(2, 3, sheetPendaftar.getLastRow() - 1, 1).getValues();
      for(var j = 0; j < dataPendaftarLama.length; j++) {
        if(dataPendaftarLama[j][0].toString().trim() === nisnBaruClean) {
          return { status: "error", message: "NISN " + nisnBaruClean + " sudah terdaftar sebelumnya di instansi ini!" };
        }
      }
    }
    
    // GENERATOR ID OTOMATIS BERBASIS UUID
    var rawUuid = Utilities.getUuid(); 
    var cleanUuid = rawUuid.replace(/-/g, ""); 
    var kodeUnik = cleanUuid.substring(0, 6).toUpperCase(); 
    var idPendaftar = "REG-" + kodeUnik; 
    
    // STRICT TEXT REINFORCEMENT
    var nisnFormatTeksMurni = "'" + nisnBaruClean;
    
    // TUGAS 1: Tulis ke Cabang (Sekolah Mitra)
    var barisDataBaruCabang = [
      idPendaftar,
      dataSiswa.nama.toString().trim(),
      nisnFormatTeksMurni,
      "-",
      dataSiswa.password.toString().trim(),
      "Pending",
      "", 
      ""  
    ];
    sheetPendaftar.appendRow(barisDataBaruCabang);
    
    // TUGAS 2: Tulis ke User_Admin Master
    var barisDataMaster = [
      nisnFormatTeksMurni,
      dataSiswa.password.toString().trim(),
      "siswa",
      dataSiswa.nama.toString().trim(),
      dataSiswa.id_sekolah.toString().trim()
    ];
    sheetUserMaster.appendRow(barisDataMaster);
    
    SpreadsheetApp.flush(); 
    
    return { 
      status: "success", 
      message: "Akun mandiri berhasil didaftarkan dan diaktifkan di server pusat!",
      data: {
        id_pendaftar: idPendaftar,
        nama: dataSiswa.nama,
        username: nisnBaruClean,
        password: dataSiswa.password,
        sekolah: namaSekolahPilihan
      }
    };
  } catch (error) {
    return { status: "error", message: "Gagal memproses pendaftaran: " + error.toString() };
  } finally {
    lock.releaseLock(); 
  }
}

// =============================================================================
// [5] MODUL OPERATOR SEKOLAH MITRA & SELEKSI SISWA
// =============================================================================

/**
 * 1. FIX SINKRONISASI UNTUK DASHBOARD ADMIN SEKOLAH
 * Mengambil semua baris pendaftar dari spreadsheet cabang
 */
function ambilPendaftarSekolah(idSekolah) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch(e) { return { status: "error", message: "Server sibuk memproses data." }; }

  try {
    // -------------------------------------------------------------------------
    // A. AMBIL DATA PROFIL SEKOLAH (NAMA & KUOTA) DARI SHEET "Sekolah_Mitra"
    // -------------------------------------------------------------------------
    var ssMaster = SpreadsheetApp.openById(MASTER_SS_ID);
    var sheetMitra = ssMaster.getSheetByName("Sekolah_Mitra");
    var dataMitra = sheetMitra.getDataRange().getValues();
    var headerMitra = dataMitra[0];
    
    var idxIdSekolah = 0;
    var idxNamaSekolah = 1;
    var idxSsId = 3;
    var idxKuota = -1;
    
    // Melacak posisi kolom pada sheet Sekolah_Mitra secara dinamis
    for (var c = 0; c < headerMitra.length; c++) {
      var hName = headerMitra[c].toString().trim();
      if (hName === "ID Sekolah") idxIdSekolah = c;
      if (hName === "Nama Sekolah") idxNamaSekolah = c;
      if (hName === "Spreadsheet ID") idxSsId = c;
      if (hName === "Kuota") idxKuota = c;
    }
    
    // Jika kolom kuota fisik belum ada di Google Sheets Master, buat otomatis di ujung kanan
    if (idxKuota === -1) {
      idxKuota = headerMitra.length;
      sheetMitra.getRange(1, idxKuota + 1).setValue("Kuota");
    }
    
    var idClean = idSekolah.toString().trim().toLowerCase();
    var ssIdCabang = "";
    var namaSekolahSistem = "";
    var kuotaSistem = 100; // Nilai default awal jika data kuota di sheet masih kosong
    
    // Mencari kecocokan ID instansi sekolah
    for (var i = 1; i < dataMitra.length; i++) {
      if (dataMitra[i][idxIdSekolah].toString().trim().toLowerCase() === idClean) {
        namaSekolahSistem = dataMitra[i][idxNamaSekolah].toString().trim();
        ssIdCabang = dataMitra[i][idxSsId].toString().trim();
        if (dataMitra[i][idxKuota] !== "" && dataMitra[i][idxKuota] !== undefined) {
          kuotaSistem = parseInt(dataMitra[i][idxKuota]) || 0;
        }
        break;
      }
    }
    
    if (!ssIdCabang || ssIdCabang === "" || ssIdCabang === "-") {
      return { status: "error", message: "Spreadsheet ID cabang tidak terdaftar di sistem pusat." };
    }
    
    // -------------------------------------------------------------------------
    // B. AMBIL DATA CALON SISWA DARI SPREADSHEET CABANG SEKOLAH
    // -------------------------------------------------------------------------
    var ssCabang = SpreadsheetApp.openById(ssIdCabang);
    var sheetCabang = ssCabang.getSheets()[0]; 
    var values = sheetCabang.getDataRange().getValues();
    
    // Jika spreadsheet cabang kosong atau hanya berisi baris header saja
    if (values.length <= 1) {
      return { 
        status: "success", 
        nama_sekolah: namaSekolahSistem,
        kuota: kuotaSistem,
        data: [], 
        statistik: { total: 0, diterima: 0, pending: 0, ditolak: 0 } 
      };
    }
    
    var headerRow = values[0];
    var kol = {};
    for (var c = 0; c < headerRow.length; c++) {
      var h = headerRow[c].toString().toLowerCase().trim();
      kol[h] = c;
    }
    
    var listPendaftar = [];
    var stat = { total: 0, diterima: 0, pending: 0, ditolak: 0 };
    
    for (var i = 1; i < values.length; i++) {
      var row = values[i];
      
      var dapatkan = function(namaKolom, defaultVal) {
        var idx = kol[namaKolom.toLowerCase().trim()];
        return (idx !== undefined && row[idx] !== undefined && row[idx] !== null) ? row[idx].toString().trim() : (defaultVal || "");
      };
      
      var idPen = dapatkan("id_pendaftar");
      if (idPen === "" || idPen === "-") continue; // Lewati jika baris data kosong
      
      var statusSiswa = dapatkan("status", "Pending");
      
      // Hitung ringkasan statistik
      stat.total++;
      if (statusSiswa.toLowerCase() === "diterima") stat.diterima++;
      else if (statusSiswa.toLowerCase() === "ditolak") stat.ditolak++;
      else stat.pending++;
      
      // Format Konversi Tanggal Lahir (Mencegah format objek Date mentah bawaan Google Sheets)
      var tglLahirRaw = dapatkan("tanggal_lahir");
      var tglLahirFormatted = "-";
      if (tglLahirRaw && tglLahirRaw !== "-") {
        try { 
          tglLahirFormatted = Utilities.formatDate(new Date(tglLahirRaw), Session.getScriptTimeZone(), "yyyy-MM-dd"); 
        } catch(e) { 
          tglLahirFormatted = tglLahirRaw; 
        }
      }

      // Memasukkan data ke dalam list objek pendaftar
      listPendaftar.push({
        id_pendaftar: idPen,
        nama: dapatkan("nama"),
        nisn: dapatkan("nisn"),
        kontak: dapatkan("kontak"),
        alamat: dapatkan("alamat"),
        asal_sekolah: dapatkan("asal_sekolah"), 
        status: statusSiswa,
        link_foto: dapatkan("link_foto"),
        link_kk: dapatkan("link_kk"),
        link_akta: dapatkan("link_akta"),
        link_skl: dapatkan("link_skl") || dapatkan("link_ijazah"),
        
        // Isian Data Tambahan Dapodik
        nik_siswa: dapatkan("nik_siswa"),
        tempat_lahir: dapatkan("tempat_lahir"),
        tanggal_lahir: tglLahirFormatted,
        jenis_kelamin: dapatkan("jenis_kelamin"),
        nama_ayah: dapatkan("nama_ayah"),
        nik_ayah: dapatkan("nik_ayah"),
        nama_ibu: dapatkan("nama_ibu"),
        nik_ibu: dapatkan("nik_ibu"),
        jumlah_saudara: dapatkan("jumlah_saudara", "0"),
        anak_ke: dapatkan("anak_ke", "1"),
        jenis_pendaftaran: dapatkan("jenis_pendaftaran"),
        kelas_dimasuki: dapatkan("kelas_dimasuki"),
        alasan_ditolak: dapatkan("alasan_ditolak", "-")
      });
    }
    
    // Mengembalikan paket data respons yang lengkap dan valid ke frontend
    return { 
      status: "success", 
      data: listPendaftar, 
      statistik: stat,
      nama_sekolah: namaSekolahSistem,
      kuota: kuotaSistem
    };
    
  } catch (error) {
    console.error("Eror ambilPendaftarSekolah:", error);
    return { status: "error", message: "Gagal Sistem Utama: " + error.toString() };
  } finally {
    lock.releaseLock();
  }
}

// Fungsi pembantu tambahan jika ada variasi nama header asal sekolah
function dapatkanDataPendaftarBiasa(dapatkanFunc, key) {
  return dapatkanFunc(key) || dapatkanFunc("asal sekolah");
}

/**
 * BACKEND: Pembaruan Status Seleksi Siswa & Catatan Verifikasi oleh Operator Sekolah
 */
function simpanKeputusanSeleksiServer(idSekolah, idSiswa, statusBaru, alasanBaru) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch(e) { return { status: "error", message: "Server sibuk, gagalan mengunci basis data." }; }

  try {
    // 1. Cari Spreadsheet ID Cabang dari Master Data Pusat
    var ssMaster = SpreadsheetApp.openById(MASTER_SS_ID);
    var sheetMitra = ssMaster.getSheetByName("Sekolah_Mitra");
    var dataMitra = sheetMitra.getDataRange().getValues();
    
    var ssIdCabang = "";
    for (var i = 1; i < dataMitra.length; i++) {
      if (dataMitra[i][0].toString().trim().toLowerCase() === idSekolah.toString().trim().toLowerCase()) {
        ssIdCabang = dataMitra[i][3].toString().trim();
        break;
      }
    }
    
    if (!ssIdCabang) throw new Error("ID Instansi Sekolah tidak ditemukan di database pusat.");

    // 2. Buka Spreadsheet Cabang Terkait
    var ssCabang = SpreadsheetApp.openById(ssIdCabang);
    var sheetCabang = ssCabang.getSheets()[0];
    var values = sheetCabang.getDataRange().getValues();
    var header = values[0];
    
    var idxId = -1, idxStatus = -1, idxAlasan = -1;
    
    // 3. Petakan posisi kolom secara dinamis berdasarkan nama teks header teks
    for (var c = 0; c < header.length; c++) {
      var h = header[c].toString().toLowerCase().trim();
      if (h === "id_pendaftar" || h === "id pendaftar") idxId = c;
      if (h === "status") idxStatus = c;
      if (h === "alasan_ditolak" || h === "alasan ditolak") idxAlasan = c;
    }
    
    // Keamanan: Jika kolom "alasan_ditolak" belum ada sama sekali di sheet cabang, buat otomatis di ujung kanan (Kolom Y / kolom terakhir)
    if (idxAlasan === -1) {
      idxAlasan = header.length;
      sheetCabang.getRange(1, idxAlasan + 1).setValue("alasan_ditolak");
    }
    
    if (idxId === -1 || idxStatus === -1) throw new Error("Struktur kolom database cabang tidak lengkap.");
    
    var targetId = idSiswa.toString().trim().toLowerCase();
    var sukses = false;

    // 4. Lakukan pencarian baris siswa dan lakukan penyuntikan data baru
    for (var i = 1; i < values.length; i++) {
      var idDb = values[i][idxId] ? values[i][idxId].toString().trim().toLowerCase() : "";
      
      if (idDb === targetId && targetId !== "") {
        // Tulis Status Baru ke Spreadsheet Cabang
        sheetCabang.getRange(i + 1, idxStatus + 1).setValue(statusBaru);
        
        // Tulis Alasan Baru: Jika statusnya Ditolak masukkan teksnya, jika Diterima/Pending bersihkan jadi "-"
        var teksAlasanFinal = (statusBaru === "Ditolak") ? (alasanBaru || "Tanpa alasan khusus") : "-";
        sheetCabang.getRange(i + 1, idxAlasan + 1).setValue(teksAlasanFinal);
        
        sukses = true;
        break;
      }
    }
    
    if (sukses) {
      SpreadsheetApp.flush(); // Paksa sinkronisasi instan ke Google Drive Cloud
      return { status: "success" };
    } else {
      return { status: "error", message: "ID Pendaftar tidak ditemukan di database cabang." };
    }
    
  } catch (err) {
    console.error("Error simpanKeputusanSeleksiServer:", err);
    return { status: "error", message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

function gantiPasswordAdminServer(idSekolah, sandiLama, sandiBaru) {
  try {
    // 1. Validasi awal konstanta MASTER_SS_ID global
    if (typeof MASTER_SS_ID === 'undefined' || !MASTER_SS_ID) {
      return { status: "error", message: "Konstanta MASTER_SS_ID tidak terdefinisi di Code.gs Anda." };
    }
    
    // 2. Buka Spreadsheet Master Terpusat
    var ssMaster = SpreadsheetApp.openById(MASTER_SS_ID);
    
    // Bersihkan teks ID Instansi dari operator untuk menghindari bug spasi (Contoh: "sch-d57e5")
    var targetIdClean = idSekolah.toString().trim().toLowerCase();
    var inputSandiLamaClean = sandiLama.toString().trim();
    var inputSandiBaruClean = sandiBaru.toString().trim();
    
    // =========================================================================
    // STEP 1: VALIDASI & UPDATE PADA SHEET "User_Admin" (TEMPAT LOGIN UTAMA)
    // =========================================================================
    var sheetUserAdmin = ssMaster.getSheetByName("User_Admin");
    if (!sheetUserAdmin) {
      return { status: "error", message: "Gagal Sistem: Sheet bernama 'User_Admin' tidak ditemukan di Master Spreadsheet." };
    }
    
    var dataUserAdmin = sheetUserAdmin.getDataRange().getValues();
    var headerUserAdmin = dataUserAdmin[0];
    
    var idxUserLogin = -1;
    var idxPassLogin = -1;
    
    // Petakan kolom secara dinamis pada sheet User_Admin (Anti-geser kolom)
    for (var i = 0; i < headerUserAdmin.length; i++) {
      var headText = headerUserAdmin[i].toString().toLowerCase().trim();
      if (headText === "username" || headText === "id_sekolah" || headText === "id sekolah" || headText === "id_admin") {
        idxUserLogin = i;
      }
      if (headText === "password" || headText === "sandi" || headText === "pass") {
        idxPassLogin = i;
      }
    }
    
    // Fallback default jika header tidak sengaja berubah nama
    if (idxUserLogin === -1) idxUserLogin = 0; // Kolom A
    if (idxPassLogin === -1) idxPassLogin = 1; // Kolom B (atau sesuaikan dengan letak kolom password di User_Admin Anda)
    
    var barisUserKetemu = -1;
    for (var r = 1; r < dataUserAdmin.length; r++) {
      var valUser = dataUserAdmin[r][idxUserLogin];
      if (valUser && valUser.toString().trim().toLowerCase() === targetIdClean) {
        barisUserKetemu = r;
        break;
      }
    }
    
    if (barisUserKetemu === -1) {
      return { status: "error", message: "ID Akun Operator [" + idSekolah + "] tidak ditemukan di sheet User_Admin." };
    }
    
    // VERIFIKASI UTAMA: Cek apakah password lama sesuai dengan data login aktif saat ini
    var passwordDatabaseLogin = dataUserAdmin[barisUserKetemu][idxPassLogin].toString().trim();
    if (passwordDatabaseLogin.toLowerCase() !== inputSandiLamaClean.toLowerCase()) {
      if (passwordDatabaseLogin !== inputSandiLamaClean) {
        return { status: "error", message: "Password lama yang Anda masukkan salah / tidak cocok." };
      }
    }
    
    // EKSEKUSI 1: Tulis password baru ke sheet User_Admin agar bisa langsung digunakan login
    sheetUserAdmin.getRange(barisUserKetemu + 1, idxPassLogin + 1).setValue(inputSandiBaruClean);
    
    
    // =========================================================================
    // STEP 2: SINKRONISASI UPDATE PADA SHEET "Sekolah_Mitra" (REKAP DATA WILAYAH)
    // =========================================================================
    var sheetSekolahMitra = ssMaster.getSheetByName("Sekolah_Mitra");
    if (sheetSekolahMitra) {
      var dataMitra = sheetSekolahMitra.getDataRange().getValues();
      var headerMitra = dataMitra[0];
      
      var idxIdSekolahMitra = -1;
      var idxPasswordOperatorMitra = -1;
      
      for (var c = 0; c < headerMitra.length; c++) {
        var nameH = headerMitra[c].toString().trim();
        if (nameH === "ID Sekolah") idxIdSekolahMitra = c;
        if (nameH === "Password_Operator") idxPasswordOperatorMitra = c;
      }
      
      if (idxIdSekolahMitra === -1) idxIdSekolahMitra = 0;       // Kolom A
      if (idxPasswordOperatorMitra === -1) idxPasswordOperatorMitra = 7; // Kolom H
      
      var barisMitraKetemu = -1;
      for (var m = 1; m < dataMitra.length; m++) {
        var cellVal = dataMitra[m][idxIdSekolahMitra];
        if (cellVal && cellVal.toString().trim().toLowerCase() === targetIdClean) {
          barisMitraKetemu = m;
          break;
        }
      }
      
      // Jika baris instansi ditemukan di rekap Sekolah_Mitra, ikut perbarui kolom Password_Operator (Kolom H)
      if (barisMitraKetemu !== -1) {
        sheetSekolahMitra.getRange(barisMitraKetemu + 1, idxPasswordOperatorMitra + 1).setValue(inputSandiBaruClean);
      }
    }
    
    // 3. Paksa Google Drive melakukan sinkronisasi data instan detik itu juga
    SpreadsheetApp.flush();
    return { status: "success" };
    
  } catch (err) {
    return { status: "error", message: "Gagal Sistem Server Utama: " + err.toString() };
  }
}
/**
 * BACKEND UTAMA: Menyimpan target kuota daya tampung sekolah baru ke sheet "Sekolah_Mitra"
 */
function simpanKuotaSekolahServer(idSekolah, targetKuota) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch(e) { return { status: "error", message: "Server sibuk, gagalan mengunci basis data." }; }
  
  try {
    // Diasumsikan konstanta MASTER_SS_ID sudah dideklarasikan di bagian atas file Code.gs Anda
    var sheet = SpreadsheetApp.openById(MASTER_SS_ID).getSheetByName("Sekolah_Mitra");
    var values = sheet.getDataRange().getValues();
    var headerRow = values[0];
    
    var kolId = -1;
    var kolKuota = -1;
    
    // Cari index kolom "ID Sekolah" dan "Kuota" secara dinamis
    for (var c = 0; c < headerRow.length; c++) {
      var h = headerRow[c].toString().toLowerCase().trim();
      if (h === "id sekolah" || h === "id_sekolah") kolId = c;
      if (h === "kuota") kolKuota = c;
    }
    
    // Jika kolom "Kuota" belum ada secara fisik di sheet Sekolah_Mitra, buat otomatis di ujung kanan
    if (kolKuota === -1) {
      kolKuota = headerRow.length;
      sheet.getRange(1, kolKuota + 1).setValue("Kuota");
    }
    
    if (kolId === -1) throw new Error("Struktur kolom 'ID Sekolah' tidak ditemukan pada sheet Sekolah_Mitra.");
    
    var targetId = idSekolah.toString().toLowerCase().trim();
    
    for (var i = 1; i < values.length; i++) {
      var idDb = values[i][kolId] ? values[i][kolId].toString().toLowerCase().trim() : "";
      
      if (idDb === targetId && targetId !== "") {
        // Simpan nilai kuota baru sebagai angka bulat (integer)
        sheet.getRange(i + 1, kolKuota + 1).setValue(parseInt(targetKuota) || 0);
        SpreadsheetApp.flush();
        return { status: "success" };
      }
    }
    
    return { status: "error", message: "ID Instansi Sekolah tidak ditemukan di database pusat." };
    
  } catch (error) {
    return { status: "error", message: error.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 2. FIX SINKRONISASI UNTUK DASHBOARD SISWA (LINK BERKAS)
 * Mengambil profil siswa beserta tautan berkas dari indeks kolom yang tepat
 */

// =============================================================================
// [6] MODUL DASHBOARD SISWA: PROFILING & FILE UPLOAD MANAGEMENT
// =============================================================================

/**
 * 1. BACKEND: Ambil Profil Data Siswa (Dapodik & Dokumen)
 * Dipanggil oleh frontend: .ambilProfilSiswa(sisSchId, sisNisnLogin)
 */
function ambilProfilSiswa(idSekolah, nisnSiswa) {
  try {
    // Ambil ID Spreadsheet Cabang berdasarkan ID Sekolah logined
    var ssId = ambilSsIdSekolah(idSekolah); 
    var sheet = SpreadsheetApp.openById(ssId).getSheets()[0];
    var data = sheet.getDataRange().getValues();
    var headerRow = data[0];
    
    // Petakan indeks kolom secara dinamis berdasarkan teks header di Sheets
    var kol = {};
    for (var c = 0; c < headerRow.length; c++) {
      var h = headerRow[c].toString().toLowerCase().trim();
      kol[h] = c;
    }
    
    var targetNisn = nisnSiswa.toString().trim();
    
    // Cari baris data siswa berdasarkan NISN
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var idxNisn = kol["nisn"];
      
      if (idxNisn !== undefined && row[idxNisn].toString().trim() === targetNisn) {
        
        // Fungsi pembantu pembaca data aman dari pergeseran kolom
        var dapatkan = function(namaKolom, defaultVal) {
          var idx = kol[namaKolom.toLowerCase().trim()];
          return (idx !== undefined && row[idx] !== undefined) ? row[idx].toString().trim() : (defaultVal || "");
        };
        
        // Format tanggal lahir ke standard YYYY-MM-DD agar pas dengan input type="date" HTML
        var tglLahirRaw = dapatkan("tanggal_lahir");
        var tglLahirFormatted = "";
        if (tglLahirRaw && tglLahirRaw !== "-") {
          try {
            tglLahirFormatted = Utilities.formatDate(new Date(tglLahirRaw), Session.getScriptTimeZone(), "yyyy-MM-dd");
          } catch(e) {
            tglLahirFormatted = tglLahirRaw;
          }
        }
        
        // Atur paket data sesuai dengan properti yang diminta oleh dashSiswa.html
        var profilSiswa = {
          id_pendaftar: dapatkan("id_pendaftar"),
          nama: dapatkan("nama"),
          nisn: dapatkan("nisn"),
          kontak: dapatkan("kontak"),
          asal_sekolah: dapatkan("asal_sekolah") || dapatkan("asal sekolah"),
          alamat: dapatkan("alamat"),
          status_pendaftaran: dapatkan("status", "Pending"),
          
          // Data Dapodik Tambahan
          nik_siswa: dapatkan("nik_siswa"),
          tempat_lahir: dapatkan("tempat_lahir"),
          tanggal_lahir: tglLahirFormatted,
          jenis_kelamin: dapatkan("jenis_kelamin"),
          nama_ayah: dapatkan("nama_ayah"),
          nik_ayah: dapatkan("nik_ayah"),
          nama_ibu: dapatkan("nama_ibu"),
          nik_ibu: dapatkan("nik_ibu"),
          jumlah_saudara: dapatkan("jumlah_saudara", "0"),
          anak_ke: dapatkan("anak_ke", "1"),
          jenis_pendaftaran: dapatkan("jenis_pendaftaran"),
          kelas_dimasuki: dapatkan("kelas_dimasuki"),
          
          // Link File Dokumen
          link_foto: dapatkan("link_foto"),
          link_kk: dapatkan("link_kk"),
          link_akta: dapatkan("link_akta"),
          link_skl: dapatkan("link_skl") || dapatkan("link_ijazah")
        };
        
        return { status: "success", data: profilSiswa };
      }
    }
    
    return { status: "error", message: "Data NISN tidak ditemukan di Spreadsheet Cabang." };
    
  } catch (error) {
    return { status: "error", message: error.toString() };
  }
}

/**
 * 2. BACKEND: Simpan Perubahan Biodata & Dapodik Manual Siswa
 * Dipanggil oleh frontend: .simpanProfilSiswa(sisSchId, sisIdPendaftar, dataUpdate)
 */
function simpanProfilSiswa(idSekolah, idPendaftar, dataUpdate) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch(e) { return { status: "error", message: "Server sibuk. Gagal mengunci baris data." }; }
  
  try {
    var ssId = ambilSsIdSekolah(idSekolah);
    
    // PERBAIKAN: Mendefinisikan 'ss' dengan membuka Spreadsheet berdasarkan ssId
    var ss = SpreadsheetApp.openById(ssId); 
    var sheet = ss.getSheets()[0];
    
    var data = sheet.getDataRange().getValues();
    var headerRow = data[0];
    
    // Petakan letak kolom secara dinamis
    var kol = {};
    for (var c = 0; c < headerRow.length; c++) {
      kol[headerRow[c].toString().toLowerCase().trim()] = c;
    }
    
    var targetId = idPendaftar.toString().trim();
    var kolIdPendaftar = kol["id_pendaftar"];
    
    if (kolIdPendaftar === undefined) throw new Error("Kolom 'id_pendaftar' tidak ditemukan di database.");
    
    // Cari baris berdasarkan ID Pendaftar resmi
    for (var i = 1; i < data.length; i++) {
      if (data[i][kolIdPendaftar].toString().trim() === targetId) {
        var barisKe = i + 1;
        
        // Fungsi helper penulisan ke sel berdasarkan nama kolom header
        var simpanKeKolom = function(namaKolom, nilai) {
          var idxCol = kol[namaKolom.toLowerCase().trim()];
          if (idxCol !== undefined) {
            sheet.getRange(barisKe, idxCol + 1).setValue(nilai);
          }
        };
        
        // Tulis data update kiriman siswa ke Spreadsheet Cabang
        simpanKeKolom("nama", dataUpdate.nama);
        simpanKeKolom("kontak", dataUpdate.kontak);
        simpanKeKolom("asal_sekolah", dataUpdate.asal_sekolah);
        simpanKeKolom("alamat", dataUpdate.alamat);
        
        simpanKeKolom("nik_siswa", dataUpdate.nik_siswa);
        simpanKeKolom("tempat_lahir", dataUpdate.tempat_lahir);
        simpanKeKolom("tanggal_lahir", dataUpdate.tanggal_lahir);
        simpanKeKolom("jenis_kelamin", dataUpdate.jenis_kelamin);
        simpanKeKolom("nama_ayah", dataUpdate.nama_ayah);
        simpanKeKolom("nik_ayah", dataUpdate.nik_ayah);
        simpanKeKolom("nama_ibu", dataUpdate.nama_ibu);
        simpanKeKolom("nik_ibu", dataUpdate.nik_ibu);
        simpanKeKolom("jumlah_saudara", dataUpdate.jumlah_saudara);
        simpanKeKolom("anak_ke", dataUpdate.anak_ke);
        simpanKeKolom("jenis_pendaftaran", dataUpdate.jenis_pendaftaran);
        simpanKeKolom("kelas_dimasuki", dataUpdate.kelas_dimasuki);
        
        SpreadsheetApp.flush(); // Paksa sinkronisasi real-time instan
        return { status: "success" };
      }
    }
    
    return { status: "error", message: "Gagal memperbarui: ID Registrasi tidak valid." };
    
  } catch (e) {
    return { status: "error", message: e.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 3. BACKEND: Upload/Update File Foto Profil ke Google Drive & Simpan Tautannya
 * Dipanggil oleh frontend: .prosesUploadFotoProfilServer(sisSchId, sisIdPendaftar, e.target.result)
 */
function prosesUploadFotoProfilServer(idSekolah, idPendaftar, base64DataRaw) {
  try {
    var splitData = base64DataRaw.split(",");
    var contentType = splitData[0].split(":")[1].split(";")[0];
    var byteData = Utilities.base64Decode(splitData[1]);
    
    // Tentukan ekstensi file foto profil
    var ekstensi = ".png";
    if (contentType.includes("jpeg") || contentType.includes("jpg")) ekstensi = ".jpg";
    
    var blob = Utilities.newBlob(byteData, contentType, "FOTO_" + idPendaftar + ekstensi);
    
    // Simpan file foto ke root Google Drive atau folder khusus panitia Anda
    var file = DriveApp.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); // Izinkan dibaca agar avatar tampil di dashboard
    
    var linkFotoBaru = file.getUrl();
    
    // Simpan tautan link foto baru ini ke Spreadsheet Cabang milik siswa terkait
    var ssId = ambilSsIdSekolah(idSekolah);
    var sheet = SpreadsheetApp.openById(ssId).getSheets()[0];
    var data = sheet.getDataRange().getValues();
    var headerRow = data[0];
    
    var kol = {};
    for (var c = 0; c < headerRow.length; c++) {
      kol[headerRow[c].toString().toLowerCase().trim()] = c;
    }
    
    var targetId = idPendaftar.toString().trim();
    var idxIdPen = kol["id_pendaftar"];
    var idxLinkFoto = kol["link_foto"];
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][idxIdPen].toString().trim() === targetId) {
        sheet.getRange(i + 1, idxLinkFoto + 1).setValue(linkFotoBaru);
        SpreadsheetApp.flush();
        
        return { status: "success", link: linkFotoBaru };
      }
    }
    
    return { status: "error", message: "Gagal menempelkan link foto: ID tidak ditemukan." };
    
  } catch (err) {
    return { status: "error", message: "Gagal upload: " + err.toString() };
  }
}

/**
 * 4. BACKEND: Upload/Update Berkas Pendaftaran ke Google Drive & Simpan Tautannya
 * Dipanggil oleh frontend: .prosesUploadFotoProfilServer(sisSchId, sisIdPendaftar, e.target.result)
 */
function uploadBerkasSiswa(idSekolah, idPendaftar, fileName, base64Data, tipeBerkas) {
  // 1. AKTIFKAN LOCK SYSTEM (Mencegah tabrakan data antar pendaftar)
  var kunciSistem = LockService.getScriptLock();
  try {
    // Tunggu maksimal 30 detik jika server sedang sibuk melayani pendaftar lain
    kunciSistem.waitLock(30000); 
  } catch (e) {
    return { status: "error", message: "Server sangat sibuk. Silakan klik tombol unggah beberapa saat lagi." };
  }

  try {
    // 2. VALIDASI PARAMETER AWAL
    if (!idSekolah || !idPendaftar || !base64Data) {
      throw new Error("Parameter pengiriman berkas tidak lengkap (Sekolah ID/ID Reg Kosong).");
    }

    // 3. AMBIL FOLDER GOOGLE DRIVE SEKOLAH TARGET
    var folderId = ambilFolderIdSekolah(idSekolah);
    if (!folderId) throw new Error("ID Folder Drive sekolah tujuan tidak terdaftar di sistem Master.");
    
    // 4. PROSES DEKODE BASE64 MENJADI BERKAS FISIK
    var contentType = base64Data.substring(5, base64Data.indexOf(';'));
    var bytes = Utilities.base64Decode(base64Data.split(',')[1]);
    
    // Format Penamaan Stabil: IDREG_TIPEBERKAS (Misal: REG2026001_KK)
    var ekstensi = contentType.split('/')[1] || "pdf";
    if (ekstensi === "jpeg") ekstensi = "jpg"; // Standardisasi ekstensi gambar
    
    var namaFileFinal = idPendaftar.toString().trim() + "_" + tipeBerkas.toUpperCase() + "." + ekstensi;
    var blob = Utilities.newBlob(bytes, contentType, namaFileFinal);
    
    // 5. SIMPAN KE GOOGLE DRIVE & ATUR IZIN AKSES (VIEWER ONLY)
    var fileMetadata = { name: namaFileFinal, parents: [folderId] };
    var file = Drive.Files.create(fileMetadata, blob);
    var fileId = file.id;
    
    // Set permission agar panitia sekolah bisa membuka file-nya via link
    Drive.Permissions.create({ role: 'reader', type: 'anyone', allowFileDiscovery: false }, fileId);
    var fileUrl = "https://lh3.googleusercontent.com/d/" + file.id;
    
    // 6. BUKA SPREADSHEET CABANG (PAKSA TAB PERTAMA)
    var ssId = ambilSsIdSekolah(idSekolah);
    var ss = SpreadsheetApp.openById(ssId);
    var sheet = ss.getSheets()[0]; 
    var dataRange = sheet.getDataRange();
    var values = dataRange.getValues();
    var headerRow = values[0]; // Baris pertama berisi judul kolom
    
    // 7. MESIN DETEKSI KOLOM OTOMATIS (Mencegah Eror jika Urutan Kolom di Sheets Berubah)
    var kolIdPendaftar = -1;
    var kolTargetBerkas = -1;
    
    // Cari posisi kolom ID Pendaftar dan Kolom Berkas Target berdasarkan teks Headernya
    for (var c = 0; c < headerRow.length; c++) {
      var namaHeader = headerRow[c].toString().toLowerCase().trim();
      
      if (namaHeader === "id_pendaftar" || namaHeader === "id pendaftar") {
        kolIdPendaftar = c;
      }
      // Menyesuaikan otomatis teks tipe berkas dari frontend (KK, AKTA, atau SKL/IJAZAH)
      if (namaHeader.includes(tipeBerkas.toLowerCase())) {
        kolTargetBerkas = c;
      }
    }
    
    // Jika kolom tidak ditemukan secara dinamis, gunakan fallback default (Kolom A=1, KK=9, Akta=10, SKL=11)
    if (kolIdPendaftar === -1) kolIdPendaftar = 0; 
    if (kolTargetBerkas === -1) {
      if (tipeBerkas.toUpperCase() === "KK") kolTargetBerkas = 8;       // Kolom I
      if (tipeBerkas.toUpperCase() === "AKTA") kolTargetBerkas = 9;     // Kolom J
      if (tipeBerkas.toUpperCase() === "SKL") kolTargetBerkas = 10;     // Kolom K
      if (tipeBerkas.toUpperCase() === "IJAZAH") kolTargetBerkas = 10;  // Kolom K
    }

    // 8. PENCARIAN BARIS SISWA BERDASARKAN ID PENDAFTAR (SUPER CLEAN MATCHING)
    var idTarget = idPendaftar.toString().toLowerCase().trim();
    var barisDitemukan = false;
    
    for (var i = 1; i < values.length; i++) {
      var idDb = values[i][kolIdPendaftar] ? values[i][kolIdPendaftar].toString().toLowerCase().trim() : "";
      
      if (idDb === idTarget && idTarget !== "") {
        // Tulis link file tepat di koordinat kotak selnya (kolom ditambah 1 karena getRange berbasis index 1)
        sheet.getRange(i + 1, kolTargetBerkas + 1).setValue(fileUrl);
        
        // Paksa simpan saat ini juga ke infrastruktur Google cloud
        SpreadsheetApp.flush(); 
        barisDitemukan = true;
        break;
      }
    }
    
    if (!barisDitemukan) {
      throw new Error("ID Pendaftar [" + idPendaftar + "] tidak ditemukan pada file database sekolah.");
    }
    
    // 9. KEMBALIKAN RESPON SUKSES
    return { status: "success", url: fileUrl };
    
  } catch (error) {
    // Laporkan detail eror internal jika terjadi crash sistem
    return { status: "error", message: "Gagal simpan di server: " + error.toString() };
  } finally {
    // WAJIB: Lepaskan kembali kunci sistem agar pendaftar lain bisa menggunakannya
    kunciSistem.releaseLock();
  }
}

/**
 * BACKEND PUSAT: Memproses unggahan dokumen (KK, Akta, SKL, KIP) dari Dashboard Siswa
 * dan menyimpannya langsung ke Google Drive & database Spreadsheet Cabang.
 * * @param {String} idSekolah - ID Sekolah Cabang tujuan siswa.
 * @param {String} idPendaftar - ID Registrasi Pendaftar unik milik siswa.
 * @param {String} jenisDokumen - Jenis Dokumen ('KK', 'Akta', 'SKL', 'KIP').
 * @param {String} base64Data - Data string Base64 dari file mentah yang dikirim frontend.
 */
/**
 * BACKEND FIX: Memproses unggahan dokumen dari Dashboard Siswa
 * BEBAS EROR: Menggunakan fungsi ambilSsIdSekolah yang sudah terbukti berhasil
 */
function prosesUploadDokumenServer(idSekolah, idPendaftar, jenisDokumen, base64Data) {
  var lock = LockService.getScriptLock();
  try { 
    lock.waitLock(15000); 
  } catch(e) { 
    return { status: "error", message: "Server cloud sibuk. Silakan coba beberapa saat lagi." }; 
  }

  try {
    // 1. SINKRONISASI LOGIKA: Menggunakan fungsi ambilSsIdSekolah bawaan Anda yang sudah OK
    var ssIdCabang = ambilSsIdSekolah(idSekolah);
    if (!ssIdCabang) throw new Error("ID Instansi Cabang tidak valid di sistem pusat.");

    // 2. BUKA SPREADSHEET CABANG
    var ssCabang = SpreadsheetApp.openById(ssIdCabang);
    var sheetCabang = ssCabang.getSheets()[0];
    var values = sheetCabang.getDataRange().getValues();
    var header = values[0];
    
    var idxId = -1, idxNama = -1;
    var idxTargetKolom = -1;
    
    // Petakan posisi kolom secara dinamis berdasarkan header row
    for (var c = 0; c < header.length; c++) {
      var h = header[c].toString().toLowerCase().trim();
      if (h === "id_pendaftar" || h === "id pendaftar") idxId = c;
      if (h === "nama") idxNama = c;
      
      // Tentukan kolom target update berdasarkan jenis berkas
      if (jenisDokumen === "KK" && (h === "link_kk" || h === "link kk")) idxTargetKolom = c;
      if (jenisDokumen === "Akta" && (h === "link_akta" || h === "link akta")) idxTargetKolom = c;
      if (jenisDokumen === "SKL" && (h === "link_skl" || h === "link skl" || h === "link_ijazah")) idxTargetKolom = c;
      if (jenisDokumen === "KIP" && (h === "link_kip" || h === "link kip")) idxTargetKolom = c;
    }
    
    // Auto-create kolom link_kip jika belum ada di spreadsheet cabang
    if (jenisDokumen === "KIP" && idxTargetKolom === -1) {
      idxTargetKolom = header.length;
      sheetCabang.getRange(1, idxTargetKolom + 1).setValue("link_kip");
    }

    if (idxId === -1 || idxTargetKolom === -1) {
      throw new Error("Struktur kolom " + jenisDokumen + " tidak ditemukan di database cabang.");
    }
    
    // Cari baris siswa berdasarkan ID Pendaftar
    var barisSiswa = -1;
    var namaSiswa = "Siswa";
    var targetId = idPendaftar.toString().trim().toLowerCase();
    
    for (var i = 1; i < values.length; i++) {
      var idDb = values[i][idxId] ? values[i][idxId].toString().trim().toLowerCase() : "";
      if (idDb === targetId && targetId !== "") {
        barisSiswa = i + 1;
        namaSiswa = values[i][idxNama] ? values[i][idxNama].toString().trim() : "Siswa";
        break;
      }
    }
    
    if (barisSiswa === -1) throw new Error("ID Pendaftar Siswa tidak ditemukan di database cabang.");

    // 3. PROSES SIMPAN FILE KE GOOGLE DRIVE (SOLUSI AMAN TANPA GETPARENTS)
    // Berkas akan langsung disimpan di Root Drive utama atau folder default Apps Script secara aman
    var folderArsip;
    var namaFolderArsip = "Arsip_Berkas_SPMB_Siswa";
    var cariFolderArsip = DriveApp.getFoldersByName(namaFolderArsip);
    
    if (cariFolderArsip.hasNext()) {
      folderArsip = cariFolderArsip.next();
    } else {
      folderArsip = DriveApp.createFolder(namaFolderArsip);
    }
    
    // Uraikan berkas Base64 dari frontend
    var bagianFile = base64Data.split(",");
    var contentType = bagianFile[0].split(":")[1].split(";")[0]; 
    var dataMentahBytes = Utilities.base64Decode(bagianFile[1]);  
    
    var ekstensi = ".dat";
    if (contentType.includes("pdf")) ekstensi = ".pdf";
    else if (contentType.includes("png")) ekstensi = ".png";
    else if (contentType.includes("jpeg") || contentType.includes("jpg")) ekstensi = ".jpg";
    
    var namaFileFinal = jenisDokumen + "_" + idPendaftar + "_" + namaSiswa.replace(/\s+/g, "-") + ekstensi;
    
    var blobDokumen = Utilities.newBlob(dataMentahBytes, contentType, namaFileFinal);
    var fileBaruDrive = folderArsip.createFile(blobDokumen);
    
    // Berikan izin akses view agar operator & dashboard admin bisa melihat berkasnya
    fileBaruDrive.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);
    var tautanUrlUnduhan = fileBaruDrive.getUrl();

    // 4. UPDATE LINK KE GOOGLE SHEET CABANG
    sheetCabang.getRange(barisSiswa, idxTargetKolom + 1).setValue(tautanUrlUnduhan);
    
    SpreadsheetApp.flush(); // Paksa sinkronisasi instan cloud
    return { status: "success", url: tautanUrlUnduhan };
    
  } catch (err) {
    console.error("Gagal di prosesUploadDokumenServer:", err);
    return { status: "error", message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * BACKEND PUSAT: Memperbarui Biodata Dapodik Siswa dari Dashboard Siswa (Alur 2)
 * Kunci Pengaman: Nama & NISN sengaja tidak dipetakan ke dalam proses penulisan ulang/overwrite.
 * @param {String} idSekolah - ID Sekolah Cabang.
 * @param {String} idPendaftar - ID Registrasi Unik Siswa.
 * @param {Object} payload - Data isian formulir baru hasil kiriman dari frontend.
 */
function updateBiodataSiswaServer(idSekolah, idPendaftar, payload) {
  var lock = LockService.getScriptLock();
  try { 
    lock.waitLock(15000); 
  } catch(e) { 
    return { status: "error", message: "Gagal mengunci database server, kondisi cloud sibuk." }; 
  }

  try {
    // 1. Dapatkan Spreadsheet ID Cabang dari Data Master Sekolah_Mitra
    var ssMaster = SpreadsheetApp.openById(MASTER_SS_ID);
    var sheetMitra = ssMaster.getSheetByName("Sekolah_Mitra");
    var dataMitra = sheetMitra.getDataRange().getValues();
    
    var ssIdCabang = "";
    for (var i = 1; i < dataMitra.length; i++) {
      if (dataMitra[i][0].toString().trim().toLowerCase() === idSekolah.toString().trim().toLowerCase()) {
        ssIdCabang = dataMitra[i][3].toString().trim();
        break;
      }
    }
    
    if (!ssIdCabang) throw new Error("ID Instansi Cabang tidak terdaftar.");

    // 2. Buka Spreadsheet Cabang Terkait
    var ssCabang = SpreadsheetApp.openById(ssIdCabang);
    var sheetCabang = ssCabang.getSheets()[0];
    var values = sheetCabang.getDataRange().getValues();
    var header = values[0];
    
    var kol = {};
    for (var c = 0; c < header.length; c++) {
      var h = header[c].toString().toLowerCase().trim();
      kol[h] = c;
    }
    
    if (kol["id_pendaftar"] === undefined) throw new Error("Kolom kunci utama ID_Pendaftar tidak ditemukan.");

    // 3. Cari Baris Siswa Berdasarkan ID Pendaftar
    var targetId = idPendaftar.toString().trim().toLowerCase();
    var barisSiswa = -1;
    
    for (var i = 1; i < values.length; i++) {
      var idDb = values[i][kol["id_pendaftar"]] ? values[i][kol["id_pendaftar"]].toString().trim().toLowerCase() : "";
      if (idDb === targetId && targetId !== "") {
        barisSiswa = i + 1; // Mendapatkan nomor baris riil spreadsheet
        break;
      }
    }
    
    if (barisSiswa === -1) throw new Error("Data pendaftaran Akun Anda tidak ditemukan di lembar cabang.");

    // 4. PROSES AMAN: Tulis Data payload satu per satu ke dalam sel Sheets yang berkorespondensi
    // Fungsi pembantu untuk menulis data secara aman jika kolomnya tersedia
    var tulisSel = function(namaKolom, nilaiBaru) {
      var idxKol = kol[namaKolom.toLowerCase().trim()];
      if (idxKol !== undefined && nilaiBaru !== undefined) {
        sheetCabang.getRange(barisSiswa, idxKol + 1).setValue(nilaiBaru);
      }
    };

    // Eksekusi Pembaruan Data (Tanpa memetakan Nama dan NISN demi keamanan)
    tulisSel("kontak", payload.kontak);
    tulisSel("nik_siswa", payload.nik_siswa);
    tulisSel("asal_sekolah", payload.asal_sekolah);
    tulisSel("tempat_lahir", payload.tempat_lahir);
    tulisSel("tanggal_lahir", payload.tanggal_lahir);
    tulisSel("alamat", payload.alamat);
    tulisSel("jenis_kelamin", payload.jenis_kelamin);
    tulisSel("jenis_pendaftaran", payload.jenis_pendaftaran);
    tulisSel("nama_ayah", payload.nama_ayah);
    tulisSel("nik_ayah", payload.nik_ayah);
    tulisSel("nama_ibu", payload.nama_ibu);
    tulisSel("nik_ibu", payload.nik_ibu);
    tulisSel("jumlah_saudara", payload.jumlah_saudara);
    tulisSel("anak_ke", payload.anak_ke);
    tulisSel("kelas_dimasuki", payload.kelas_dimasuki);

    // Paksa sinkronisasi seketika ke Google Drive Cloud
    SpreadsheetApp.flush();
    return { status: "success" };

  } catch (err) {
    console.error("Error updateBiodataSiswaServer:", err);
    return { status: "error", message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

// =============================================================================
// [7] UTILITY HELPER INTERNAL FUNCTIONS (MULTI-TENANT LINKERS)
// =============================================================================

function ambilSsIdSekolah(idSekolah) {
  try {
    var data = SpreadsheetApp.openById(MASTER_SS_ID).getSheetByName("Sekolah_Mitra").getDataRange().getValues();
    var idClean = idSekolah.toString().trim();
    for (var i = 1; i < data.length; i++) { 
      if (data[i][0].toString().trim() === idClean) {
        return data[i][3].toString().trim(); 
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

function ambilFolderIdSekolah(idSekolah) {
  try {
    var data = SpreadsheetApp.openById(MASTER_SS_ID).getSheetByName("Sekolah_Mitra").getDataRange().getValues();
    var idClean = idSekolah.toString().trim();
    for (var i = 1; i < data.length; i++) { 
      if (data[i][0].toString().trim() === idClean) {
        return data[i][4].toString().trim(); 
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * BACKEND PUSAT: Mencari Nama Sekolah Pilihan Siswa langsung dari Master Database
 * Berdasarkan Username (NISN) yang sedang login.
 * @param {String} usernameSiswa - NISN atau username yang digunakan siswa untuk login.
 * @return {String} Nama Resmi Sekolah Tujuan.
 */
function ambilNamaSekolahTujuanSiswa(usernameSiswa) {
  try {
    if (!usernameSiswa) return "";

    // 1. Buka Spreadsheet Master Pusat
    var ssMaster = SpreadsheetApp.openById(MASTER_SS_ID);
    
    // 2. TAHAP 1: Cari ID_Sekolah di sheet "User_Admin" (Kolom E / Index ke-4) berdasarkan Username
    var sheetUser = ssMaster.getSheetByName("User_Admin");
    var dataUser = sheetUser.getDataRange().getValues();
    var idSekolahDitemukan = "";

    // Cari letak kolom secara dinamis berdasarkan header agar aman jika posisi bergeser
    var headerUser = dataUser[0];
    var colUsername = -1;
    var colIdSekolah = -1;

    for (var c = 0; c < headerUser.length; c++) {
      var h = headerUser[c].toString().toLowerCase().trim();
      if (h === "username") colUsername = c;
      if (h === "id_sekolah" || h === "id sekolah") colIdSekolah = c;
    }

    // Jika pencarian dinamis gagal, gunakan index default (Kolom A=0, Kolom E=4)
    if (colUsername === -1) colUsername = 0;
    if (colIdSekolah === -1) colIdSekolah = 4;

    // Mulai mencari baris yang cocok dengan username login siswa
    for (var i = 1; i < dataUser.length; i++) {
      var userDb = dataUser[i][colUsername] ? dataUser[i][colUsername].toString().trim() : "";
      if (userDb.toLowerCase() === usernameSiswa.toString().trim().toLowerCase()) {
        idSekolahDitemukan = dataUser[i][colIdSekolah] ? dataUser[i][colIdSekolah].toString().trim() : "";
        break;
      }
    }

    // Jika ID Sekolah tidak ditemukan di tabel User_Admin, hentikan proses
    if (!idSekolahDitemukan) return "";

    // 3. TAHAP 2: Cocokkan ID_Sekolah ke sheet "Sekolah_Mitra" untuk ambil Nama Sekolah (Kolom B / Index ke-1)
    var sheetMitra = ssMaster.getSheetByName("Sekolah_Mitra");
    var dataMitra = sheetMitra.getDataRange().getValues();
    var namaSekolahFinal = "";

    var headerMitra = dataMitra[0];
    var colMitraId = -1;
    var colMitraNama = -1;

    for (var m = 0; m < headerMitra.length; m++) {
      var hm = headerMitra[m].toString().toLowerCase().trim();
      if (hm === "id_sekolah" || hm === "id sekolah" || hm === "id") colMitraId = m;
      if (hm === "nama_sekolah" || hm === "nama sekolah" || hm === "nama") colMitraNama = m;
    }

    if (colMitraId === -1) colMitraId = 0; // Default Kolom A
    if (colMitraNama === -1) colMitraNama = 1; // Default Kolom B

    // Cari nama sekolah berdasarkan ID Sekolah yang didapat dari Tahap 1
    for (var j = 1; j < dataMitra.length; j++) {
      var idMitraDb = dataMitra[j][colMitraId] ? dataMitra[j][colMitraId].toString().trim() : "";
      if (idMitraDb.toLowerCase() === idSekolahDitemukan.toLowerCase()) {
        namaSekolahFinal = dataMitra[j][colMitraNama] ? dataMitra[j][colMitraNama].toString().trim() : "";
        break;
      }
    }

    return namaSekolahFinal;

  } catch (err) {
    console.error("Gagal di fungsi ambilNamaSekolahTujuanSiswa:", err);
    return "";
  }
}

/**
 * BACKEND PUSAT: Mengambil data kuota seluruh sekolah mitra secara publik untuk landing page.
 */
function ambilInformasiKuotaPublik() {
  try {
    // 1. Buka Spreadsheet Master Pusat untuk mengambil seluruh daftar ID Sekolah Mitra
    var ssMaster = SpreadsheetApp.openById(MASTER_SS_ID);
    var sheetMitra = ssMaster.getSheetByName("Sekolah_Mitra");
    if (!sheetMitra) throw new Error("Sheet 'Sekolah_Mitra' tidak ditemukan di database pusat.");

    var dataMitra = sheetMitra.getDataRange().getValues();
    var header = dataMitra[0];
    
    // Cari posisi kolom ID Sekolah secara dinamis berdasarkan header
    var colIdSekolah = -1;
    for (var c = 0; c < header.length; c++) {
      var h = header[c].toString().toLowerCase().trim();
      if (h === "id_sekolah" || h === "id sekolah" || h === "id") {
        colIdSekolah = c;
        break;
      }
    }
    if (colIdSekolah === -1) colIdSekolah = 0; // Default fallback Kolom A

    var listKuotaFinal = [];

    // 2. Lakukan looping untuk setiap sekolah mitra yang terdaftar
    for (var i = 1; i < dataMitra.length; i++) {
      var idSekolah = dataMitra[i][colIdSekolah] ? dataMitra[i][colIdSekolah].toString().trim() : "";
      if (!idSekolah || idSekolah === "-") continue;

      try {
        // Panggil fungsi internal asli Anda yang biasa melayani dashboard admin sekolah
        // Fungsi ini mengembalikan objek berisi: status, data, nama_sekolah, kuota, dan statistik
        var resSekolah = ambilPendaftarSekolah(idSekolah);

        if (resSekolah && resSekolah.status === "success") {
          var namaSekolah = resSekolah.nama_sekolah || "Sekolah Mitra";
          var kuotaTotal = parseInt(resSekolah.kuota || 0);
          
          // Ambil jumlah siswa diterima dari objek statistik bawaan Anda
          var jumlahDiterima = 0;
          if (resSekolah.statistik && resSekolah.statistik.diterima) {
            jumlahDiterima = parseInt(resSekolah.statistik.diterima || 0);
          }

          // Hitung Sisa Kuota Otomatis: Kuota - Siswa Diterima
          var sisaKuota = kuotaTotal - jumlahDiterima;
          if (sisaKuota < 0) sisaKuota = 0; // Pengaman agar sisa kuota tidak minus

          listKuotaFinal.push({
            nama_sekolah: namaSekolah,
            total_kuota: kuotaTotal,
            sisa_kuota: sisaKuota
          });
        }
      } catch (errInner) {
        console.warn("Gagal mengambil data kuota untuk ID Sekolah: " + idSekolah + " | Eror: " + errInner.message);
        // Tetap masukkan data default jika salah satu spreadsheet cabang sekolah error/rusak
        var namaAlternatif = dataMitra[i][1] ? dataMitra[i][1].toString().trim() : "Sekolah Mitra";
        listKuotaFinal.push({
          nama_sekolah: namaAlternatif,
          total_kuota: "-",
          sisa_kuota: "-"
        });
      }
    }

    return { status: "success", data: listKuotaFinal };

  } catch (err) {
    console.error("Gagal total di fungsi ambilInformasiKuotaPublik:", err);
    return { status: "error", message: err.toString() };
  }
}

