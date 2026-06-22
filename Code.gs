// =============================================================================
//               KONFIGURASI MASTER BASIS DATA CLOUD (SPMB 2026)
//                         LAYANAN API G-DRIVE v3
// =============================================================================
// PENGATURAN KONFIGURASI GOOGLE DRIVE:
// const FOLDER_UTAMA_ID = "KODE__GDRIVE_FOLDER_UTAMA";
// const FOLDER_PENDAFTAR_ID = "KODE_GDRIVE_FOLDER_UNTUK_DATA_PENDAFTARAN";
// const MASTER_SS_ID = "KODE_GDRIVE_SPREADSHEET_UTAMA(MASTER_DATABASE)";
// const TEMPLATE_SEKOLAH_SS_ID = "KODE_GDRIVE_TEMPLATE_DATA_SEKOLAH";
// ============================================================================
// KONFIGURASI INTUK APLIKASI SPMB MI CARINGIN 2026
const FOLDER_UTAMA_ID = "1lBUXdHFPk9LiMRNvesldVhXL4U2BCBML";
const FOLDER_PENDAFTAR_ID = "1hIH-a6aN-VISOWSgO0ExsmX9njE2pLvV";
const MASTER_SS_ID = "1livTyXEjB3nuSMeVazpVo8DeH54nLOKQGuJ6B0ZzbGI";
const TEMPLATE_SEKOLAH_SS_ID = "1PyIp7jon4zCXDu5k_wY5d-BEeOD0fm2-BBMG45dCcVQ";

// =============================================================================
// [BLOK I] CORE ENGINE & MODUL OTENTIKASI PUSAT (MULTI-USER & MULTI-TENANT)
// =============================================================================

/**
 * ENGINE UTAMA: Memuat halaman index dan mengatur header meta tags
 */
function doGet(e) {
  var template = HtmlService.createTemplateFromFile('Index');
  return template.evaluate()
    .setTitle("Portal Penerimaan Siswa Baru")
    .setSandboxMode(HtmlService.SandboxMode.IFRAME)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * FUNGSI INJECTOR: Menyatukan komponen file HTML terpisah ke dalam Index.html
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * FUNGSI INJECTOR: MASTER_SS_ID untuk dipanggil oleh halaman lain
 */
function ambilMasterSsIdDariServer() {
  try {
    return MASTER_SS_ID;
  } catch (err) {
    return "";
  }
}

/**
 * Fungsi untuk mendapatkan atau membuat folder khusus sekolah mitra
 * @param {string} namaSekolah - Nama sekolah mitra (untuk nama folder)
 * @return {Folder} Objek Folder Google Drive yang siap digunakan
 */
function dapatkanAtauBuatFolderSekolahMitra(namaSekolah) {
  var folderInduk = DriveApp.getFolderById(FOLDER_PENDAFTAR_ID);
  var namaFolderBersih = namaSekolah.toString().trim().toUpperCase();
  
  // Cari apakah folder sekolah tersebut sudah pernah dibuat sebelumnya
  var subFolderSet = folderInduk.getFoldersByName(namaFolderBersih);
  
  if (subFolderSet.hasNext()) {
    // Jika sudah ada, gunakan folder yang sudah ada
    return subFolderSet.next();
  } else {
    // Jika belum ada, buat folder baru di dalam folder induk
    var folderBaru = folderInduk.createFolder(namaFolderBersih);
    // Atur akses folder baru agar siapa saja yang memiliki link bisa melihat berkas di dalamnya (opsional/penting untuk pratinjau)
    folderBaru.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return folderBaru;
  }
}
/**
function buatDatabaseSekolahBaru(namaSekolah) {
  // 1. Dapatkan folder sekolah mitranya (pakai fungsi Anda yang sudah berjalan)
  var folderSekolah = dapatkanAtauBuatFolderSekolahMitra(namaSekolah);
  
  // 2. Buat spreadsheet baru (Bawaannya akan tercipta di Root / "Drive Saya")
  var namaFileSs = "DB_PPDB_" + namaSekolah.toString().trim().toUpperCase();
  var ssBaru = SpreadsheetApp.create(namaFileSs);
  var fileSsId = ssBaru.getId();
  
  // 3. PROSES PEMINDAHAN: Ambil file berdasarkan ID, lalu pindahkan ke folder target
  var fileDiDrive = DriveApp.getFileById(filefileSsId);
  
  // Masukkan ke folder tujuan, lalu hapus dari folder induk (Drive Saya)
  folderSekolah.addFile(fileDiDrive);
  DriveApp.getRootFolder().removeFile(fileDiDrive);
  
  // 4. Lanjutkan inisialisasi sheet (Pendaftar, Konfigurasi, dll.)
  // ... kode setup sheet Anda ...
  
  return fileSsId; // Kembalikan ID untuk disimpan di Master SS
}
/**
 * CORE MODUL: Memproses masuk akun (Login) untuk Admin, Operator, dan Siswa
 */
function prosesAutentikasi(username, password) {
  try {
    var masterSs = SpreadsheetApp.openById(MASTER_SS_ID);
    var sheetUserAdmin = masterSs.getSheetByName("User_Admin");
    
    if (!sheetUserAdmin) {
      return { status: "error", message: "Sistem Pusat Gagal: Sheet 'User_Admin' tidak ditemukan." };
    }
    
    // 🌟 1. NORMALISASI INPUT: Bersihkan spasi dan buang tanda petik tunggal jika ada
    var userInputBersih = username.toString().replace(/'/g, "").trim();
    var passInputBersih = password.toString().trim();
    
    var dataUser = sheetUserAdmin.getDataRange().getValues();
    var loginSukses = false;
    var payloadRespon = {};
    
    // Urutan Kolom Master di Sheet 'User_Admin': 
    // A=Username/NISN, B=Password, C=Role, D=Nama, E=ID Sekolah, F=Tanggal/Tambahan
    if (dataUser.length > 1) {
      for (var i = 1; i < dataUser.length; i++) {
        if (!dataUser[i][0]) continue;
        
        // 🌟 2. NORMALISASI DATABASE: Paksa data sheet jadi string dan buang tanda petik tunggalnya
        var usernameDiSheet = dataUser[i][0].toString().replace(/'/g, "").trim();
        var passwordDiSheet = dataUser[i][1] ? dataUser[i][1].toString().trim() : "";
        
        // 3. Proses Pencocokan Kredensial (Username & Password)
        if (usernameDiSheet === userInputBersih && passwordDiSheet === passInputBersih) {
          loginSukses = true;
          
          var roleUser = dataUser[i][2] ? dataUser[i][2].toString().trim().toLowerCase() : "";
          
          // 🔒 4. FITUR KEAMANAN: Deteksi password bawaan/default (hanya berlaku untuk operator/admin sekolah)
          var perluGantiSandi = false;
          if (roleUser === "adminsekolah") {
            var daftarSandiLemah = ["123456", "admin123", "pasti_sukses", usernameDiSheet.toLowerCase()];
            perluGantiSandi = daftarSandiLemah.includes(passInputBersih.toLowerCase());
          }
          
          // 🌟 5. SUSUN PAYLOAD RESPON (Role dipastikan huruf kecil murni)
          payloadRespon = {
            status: "success",
            username: usernameDiSheet,
            role: roleUser, 
            nama: dataUser[i][3] ? dataUser[i][3].toString().trim() : "",
            id_sekolah: dataUser[i][4] ? dataUser[i][4].toString().trim() : "",
            wajib_ganti_sandi: perluGantiSandi // Ditangkap Login.html untuk mengunci dashboard admin baru
          };
          
          break; // Hentikan perulangan karena akun sudah ditemukan dan cocok
        }
      }
    }
    
    if (loginSukses) {
      return payloadRespon;
    } else {
      return { status: "error", message: "ID Pengguna / NISN atau Kata Sandi Anda salah." };
    }
    
  } catch (error) {
    console.error("Error Autentikasi Sistem:", error.toString());
    return { status: "error", message: "Gagal eksekusi login server: " + error.toString() };
  }
}

/**
 * CORE UTILITY: Mengambil daftar opsi sekolah mitra secara dinamis untuk form pendaftaran siswa
 */
function ambilDaftarSekolahDropdown() {
  try {
    var ssMaster = SpreadsheetApp.openById(MASTER_SS_ID);
    var sheetMitra = ssMaster.getSheetByName("Sekolah_Mitra");
    if (!sheetMitra) return { status: "error", message: "Sheet 'Sekolah_Mitra' tidak ditemukan." };
    
    var data = sheetMitra.getDataRange().getValues();
    var listSekolah = [];
    
    // Urutan struktur berdasarkan data fisik Anda:
    // 0=ID Sekolah, 1=Nama Sekolah, 2=NPSN, 3=Spreadsheet ID, 4=Folder ID, 5=Status
    for (var i = 1; i < data.length; i++) {
      if (!data[i][0] || !data[i][1]) continue; // Lewati jika baris ID atau Nama kosong
      
      // Ambil nilai status di kolom F (indeks 5), bersihkan spasi, dan paksa jadi huruf kecil
      var statusSekolah = data[i][5] ? data[i][5].toString().trim().toLowerCase() : "";
      
      // Cocokkan dengan kata kunci "aktif" (lebih aman karena kebal dari "Aktif", "aktif", atau "AKTIF")
      if (statusSekolah === "aktif") {
        listSekolah.push({
          id: data[i][0].toString().replace(/'/g, "").trim(), // Buang petik tunggal pelindung teks jika ada
          nama: data[i][1].toString().trim()
        });
      }
    }
    
    console.log("✓ Berhasil memuat " + listSekolah.length + " sekolah aktif untuk opsi siswa.");
    return { status: "success", data: listSekolah };
    
  } catch (e) {
    console.error("Error ambilDaftarSekolahDropdown: " + e.toString());
    return { status: "error", message: "Gagal memuat data server: " + e.toString(), data: [] };
  }
}

function daftarAkunSiswa(dataReg, captchaInput, tokenActive) {
  // 1. Kunci Pengaman: Pastikan data tidak kosong
  if (!dataReg || !dataReg.username || !dataReg.password || !dataReg.id_sekolah) {
    return { status: "error", message: "Data pendaftaran tidak lengkap atau terputus!" };
  }
  
  try {
    // Paksa bersihkan inputan menggunakan standarisasi Teks String murni
    var nisnBersih = dataReg.username.toString().trim();
    var namaBersih = dataReg.nama ? dataReg.nama.toString().trim().toUpperCase() : "";
    var passBersih = dataReg.password.toString().trim();
    var idSekolahDaftar = dataReg.id_sekolah.toString().trim();

    // 2. Buka Spreadsheet Master Utama untuk mencari ID Spreadsheet Cabang
    var masterSs = SpreadsheetApp.openById(MASTER_SS_ID);
    var sheetMitra = masterSs.getSheetByName("Sekolah_Mitra");
    if (!sheetMitra) {
      return { status: "error", message: "Sistem Pusat Gagal: Sheet 'Sekolah_Mitra' tidak ditemukan." };
    }
    
    var dataMitra = sheetMitra.getDataRange().getValues();
    var idSsCabang = "";
    var namaSekolahPilihan = "";
    
    for (var k = 1; k < dataMitra.length; k++) {
      var idSekolahMaster = dataMitra[k][0] ? dataMitra[k][0].toString().trim() : "";
      if (idSekolahMaster === idSekolahDaftar) {
        idSsCabang = dataMitra[k][3] ? dataMitra[k][3].toString().trim() : "";
        namaSekolahPilihan = dataMitra[k][1] ? dataMitra[k][1].toString().trim() : "";
        break;
      }
    }
    
    if (!idSsCabang || idSsCabang === "" || idSsCabang === "-") {
      return { status: "error", message: "Database cabang untuk sekolah tujuan belum siap dikonfigurasi pusat." };
    }
    
    // 3. AKSES SPREADSHEET MASTER -> SHEET "User_Admin" (Cek Duplikat Nasional)
    var sheetUserAdmin = masterSs.getSheetByName("User_Admin");
    if (!sheetUserAdmin) {
      return { status: "error", message: "Sistem Pusat Gagal: Sheet 'User_Admin' tidak ditemukan di Master." };
    }
    
    // Cek Duplikat Username/NISN skala nasional pada Kolom A (indeks 0)
    var dataMasterUser = sheetUserAdmin.getDataRange().getValues();
    if (dataMasterUser.length > 1) {
      for (var i = 1; i < dataMasterUser.length; i++) {
        // Ambil data Kolom A (Username), hilangkan petik hantu jika ada
        var usernameMaster = dataMasterUser[i][0] ? dataMasterUser[i][0].toString().replace(/'/g, "").trim() : "";
        if (usernameMaster === nisnBersih) {
          return { status: "error", message: "Akses Ditolak: NISN <b>" + nisnBersih + "</b> sudah terdaftar di sistem pusat! Silakan gunakan menu Login." };
        }
      }
    }
    
    // 4. KONEKSI KE SPREADSHEET CABANG & TARGET SHEET "Pendaftar"
    var ssCabang = SpreadsheetApp.openById(idSsCabang);
    var sheetPendaftarCabang = ssCabang.getSheetByName("Pendaftar");
    
    if (!sheetPendaftarCabang) {
      return { status: "error", message: "Gagal menemukan Sheet 'Pendaftar' di database cabang " + namaSekolahPilihan };
    }
    
    // -------------------------------------------------------------------------
    // TAHAP 1: PEMETAAN DINAMIS JUDUL KOLOM (DYNAMIC HEADER MAPPING CABANG)
    // -------------------------------------------------------------------------
    var headerCabang = sheetPendaftarCabang.getRange(1, 1, 1, sheetPendaftarCabang.getLastColumn()).getValues()[0];
    var barisDataCabang = new Array(headerCabang.length).fill(""); 
    
    var idRegistrasiGenerate = "REG-" + Utilities.getUuid().substring(0, 5).toUpperCase();
    var waktuDaftar = new Date();
    var indeksKolomNisnHulu = -1;
    
    for (var c = 0; c < headerCabang.length; c++) {
      var namaKolom = headerCabang[c].toString().trim();
      
      if (namaKolom === "ID_Pendaftar") {
        barisDataCabang[c] = idRegistrasiGenerate;
      } else if (namaKolom === "Nama") {
        barisDataCabang[c] = namaBersih; 
      } else if (namaKolom === "NISN") {
        barisDataCabang[c] = nisnBersih; // Masukkan nilainya langsung
        indeksKolomNisnHulu = c + 1;    // Catat nomor kolom aslinya (1-based index)
      } else if (namaKolom === "Password") {
        barisDataCabang[c] = passBersih;
      }
    }
    
    // Tembak data baris baru ke sheet cabang terlebih dahulu
    sheetPendaftarCabang.appendRow(barisDataCabang);
    
    // SUNTIKAN FORMAT TEKS CABANG: Jika kolom NISN ketemu, paksa cell-nya bertipe Plain Text ("@")
    if (indeksKolomNisnHulu !== -1) {
      var barisTerakhirCabang = sheetPendaftarCabang.getLastRow();
      var cellNisnCabang = sheetPendaftarCabang.getRange(barisTerakhirCabang, indeksKolomNisnHulu);
      cellNisnCabang.setNumberFormat("@");
      cellNisnCabang.setValue(nisnBersih); // Tulis ulang untuk mengunci nol di depan
    }
    
    // -------------------------------------------------------------------------
    // TAHAP 2: SALIN KE MASTER SPREADSHEET (SHEET: User_Admin) - LOCK TEXT SYSTEM
    // -------------------------------------------------------------------------
    var roleUser = "siswa"; 
    var barisBaruMaster = sheetUserAdmin.getLastRow() + 1;
    
    // Ambil jangkauan baris kosong baru di sheet master (Kolom A sampai F)
    var rangeBaruMaster = sheetUserAdmin.getRange(barisBaruMaster, 1, 1, 6);
    
    // Paksa Kolom A (Username / NISN) di master menjadi Teks murni secara absolut
    sheetUserAdmin.getRange(barisBaruMaster, 1).setNumberFormat("@");
    
    var barisDataMaster = [
      nisnBersih,      // A: Username (NISN murni terkunci teks)
      passBersih,      // B: Password
      roleUser,        // C: Role ("siswa")
      namaBersih,      // D: Nama Lengkap
      idSekolahDaftar, // E: ID Sekolah Cabang Tujuan
      waktuDaftar      // F: Tanggal Daftar
    ];
    
    // Masukkan susunan data ke baris master
    rangeBaruMaster.setValues([barisDataMaster]);
    
    console.log("🎯 Sukses Multi-Tenant: Akun " + nisnBersih + " terdaftar nasional & cabang " + namaSekolahPilihan);
    return { status: "success", message: "Registrasi berhasil! Akun Anda telah aktif di " + namaSekolahPilihan };
    
  } catch (error) {
    console.error("Error Registrasi Multi-Tenant:", error.toString());
    return { status: "error", message: "Gagal eksekusi transaksi database: " + error.toString() };
  }
}
/**
function daftarAkunSiswa(dataReg, captchaInput, tokenActive) {
  // 1. Kunci Pengaman: Pastikan data tidak kosong
  if (!dataReg || !dataReg.username || !dataReg.password || !dataReg.id_sekolah) {
    return { status: "error", message: "Data pendaftaran tidak lengkap atau terputus!" };
  }
  
  try {
    // 2. Buka Spreadsheet Master Utama untuk mencari ID Spreadsheet Cabang
    var masterSs = SpreadsheetApp.openById(MASTER_SS_ID);
    var sheetMitra = masterSs.getSheetByName("Sekolah_Mitra");
    if (!sheetMitra) {
      return { status: "error", message: "Sistem Pusat Gagal: Sheet 'Sekolah_Mitra' tidak ditemukan." };
    }
    
    var dataMitra = sheetMitra.getDataRange().getValues();
    var idSsCabang = "";
    var namaSekolahPilihan = "";
    var idSekolahDaftar = dataReg.id_sekolah.toString().trim();
    
    for (var k = 1; k < dataMitra.length; k++) {
      var idSekolahMaster = dataMitra[k][0] ? dataMitra[k][0].toString().trim() : "";
      if (idSekolahMaster === idSekolahDaftar) {
        idSsCabang = dataMitra[k][3] ? dataMitra[k][3].toString().trim() : "";
        namaSekolahPilihan = dataMitra[k][1] ? dataMitra[k][1].toString().trim() : "";
        break;
      }
    }
    
    if (!idSsCabang || idSsCabang === "" || idSsCabang === "-") {
      return { status: "error", message: "Database cabang untuk sekolah tujuan belum siap di konfigurasi pusat." };
    }
    
    // 3. AKSES SPREADSHEET MASTER -> SHEET "User_Admin" (Cek Duplikat Nasional)
    var sheetUserAdmin = masterSs.getSheetByName("User_Admin");
    if (!sheetUserAdmin) {
      return { status: "error", message: "Sistem Pusat Gagal: Sheet 'User_Admin' tidak ditemukan di Master." };
    }
    
    var nisnBersih = dataReg.username.toString().trim();
    
    // Cek Duplikat Username/NISN skala nasional
    var dataMasterUser = sheetUserAdmin.getDataRange().getValues();
    if (dataMasterUser.length > 1) {
      for (var i = 1; i < dataMasterUser.length; i++) {
        var usernameMaster = dataMasterUser[i][1] ? dataMasterUser[i][1].toString().replace(/'/g, "").trim() : "";
        if (usernameMaster === nisnBersih) {
          return { status: "error", message: "NISN " + nisnBersih + " sudah terdaftar di sistem pusat! Silakan gunakan menu Login." };
        }
      }
    }
    
    // 4. KONEKSI KE SPREADSHEET CABANG & TARGET SHEET "Pendaftar"
    var ssCabang = SpreadsheetApp.openById(idSsCabang);
    var sheetPendaftarCabang = ssCabang.getSheetByName("Pendaftar");
    
    if (!sheetPendaftarCabang) {
      return { status: "error", message: "Gagal menemukan Sheet 'Pendaftar' di database cabang " + namaSekolahPilihan };
    }
    
    // -------------------------------------------------------------------------
    // TAHAP 1: PEMETAAN DINAMIS JUDUL KOLOM (DYNAMIC HEADER MAPPING)
    // -------------------------------------------------------------------------
    var headerCabang = sheetPendaftarCabang.getRange(1, 1, 1, sheetPendaftarCabang.getLastColumn()).getValues()[0];
    var barisDataCabang = new Array(headerCabang.length).fill(""); 
    
    var idRegistrasiGenerate = "REG-" + Utilities.getUuid().substring(0, 5).toUpperCase();
    var waktuDaftar = new Date();
    
    for (var c = 0; c < headerCabang.length; c++) {
      var namaKolom = headerCabang[c].toString().trim();
      
      if (namaKolom === "ID_Pendaftar") {
        barisDataCabang[c] = idRegistrasiGenerate;
      } else if (namaKolom === "Nama") {
        barisDataCabang[c] = dataReg.nama; 
      } else if (namaKolom === "NISN") {
        barisDataCabang[c] = "'" + nisnBersih; // Format Teks Murni (0 aman)
      } else if (namaKolom === "Password") {
        barisDataCabang[c] = dataReg.password;
      }
      // 🌟 Kolom "Status" dan lainnya otomatis terisi "" (kosong) untuk diproses panitia/diisi nanti
    }
    
    // Tembak data dinamis ke sheet cabang
    sheetPendaftarCabang.appendRow(barisDataCabang);
    
    // -------------------------------------------------------------------------
    // TAHAP 2: SALIN KE MASTER SPREADSHEET (SHEET: User_Admin) - SUDAH TEPAT
    // -------------------------------------------------------------------------
    var roleUser = "siswa"; 
    
    var barisDataMaster = [
      "'" + nisnBersih,   // A: Username (NISN)
      dataReg.password,   // B: Password
      roleUser,           // C: Role ("Siswa")
      dataReg.nama,       // D: Nama Lengkap
      dataReg.id_sekolah, // E: ID Sekolah Cabang Tujuan
      waktuDaftar         // F: Tanggal Daftar
    ];
    
    sheetUserAdmin.appendRow(barisDataMaster);
    
    return { status: "success", message: "Registrasi berhasil! Akun Anda telah aktif di " + namaSekolahPilihan };
    
  } catch (error) {
    console.error("Error Registrasi:", error.toString());
    return { status: "error", message: "Gagal eksekusi transaksi database: " + error.toString() };
  }
}
*/
// =============================================================================
// [BLOK II] MODUL UTAMA OPERATOR & MANAJEMEN DATA SEKOLAH CABANG (ADMIN PANEL)
// =============================================================================
/**
 * =========================================================================
 * 🏢 CORE BACKEND DATA PROVIDER: AMBIL PENDAFTAR SEKOLAH MULTI-TENANT
 * FIX: Menyuplai Seluruh Item Dapodik & Dokumen (NIK, Ortu, Alamat, Foto)
 * Agar Lembar Verifikasi Admin Cabang Tampil Sempurna Tanpa Data Strip (-)
 * =========================================================================
 */
/**
 * =========================================================================
 * 🏢 ADMIN ENGINE: AMBIL DATA PENDAFTAR & STATISTIK SEKOLAH MITRA
 * FIX: Sinkronisasi Kolom Baru "status_pendaftaran" Untuk Dashboard Admin
 * =========================================================================
 */
function ambilPendaftarSekolah(idSekolah) {
  var lock = LockService.getScriptLock();
  try { 
    lock.waitLock(10000); 
  } catch(e) { 
    return { status: "error", message: "Server sibuk memproses data pendaftaran." }; 
  }
  
  try {
    var ssMaster = SpreadsheetApp.openById(MASTER_SS_ID);
    var sheetMitra = ssMaster.getSheetByName("Sekolah_Mitra");
    var dataMitra = sheetMitra.getDataRange().getValues();
    var headerMitra = dataMitra[0];
    
    var idxIdSekolah = 0, idxNamaSekolah = 1, idxSsId = 3;
    for (var c = 0; c < headerMitra.length; c++) {
      var hName = headerMitra[c].toString().trim();
      if (hName === "ID Sekolah") idxIdSekolah = c;
      if (hName === "Nama Sekolah") idxNamaSekolah = c;
      if (hName === "Spreadsheet ID") idxSsId = c;
    }
    
    var idClean = idSekolah.toString().trim().toLowerCase();
    var ssIdCabang = "", namaSekolahSistem = "";
    
    for (var i = 1; i < dataMitra.length; i++) {
      if (dataMitra[i][idxIdSekolah].toString().trim().toLowerCase() === idClean) {
        namaSekolahSistem = dataMitra[i][idxNamaSekolah].toString().trim();
        ssIdCabang = dataMitra[i][idxSsId].toString().trim();
        break;
      }
    }
    
    if (!ssIdCabang) return { status: "error", message: "Spreadsheet ID cabang tidak ditemukan." };
    
    var ssCabang = SpreadsheetApp.openById(ssIdCabang);
    
    // 🏛️ AMBIL PARAMETER REAL DARI SHEET "KONFIGURASI" ADMIN
    var sheetKonfig = ssCabang.getSheetByName("Konfigurasi");
    var kuotaSistem = 0; 
    var tahunPelajaran = ""; 
    var headerLaporan = "";
    var belumKonfigurasi = false;
    
    if (sheetKonfig) {
      var dataConfig = sheetKonfig.getDataRange().getValues();
      if (dataConfig.length <= 1) belumKonfigurasi = true;
      
      for (var j = 0; j < dataConfig.length; j++) {
        if (!dataConfig[j][0]) continue;
        
        var param = dataConfig[j][0].toString().trim().toLowerCase().replace(/[^a-z0-9]/g, "");
        var val = dataConfig[j][1] ? dataConfig[j][1].toString().trim() : "";
        
        if (param === "targetkuota" || param === "kuota") kuotaSistem = parseInt(val) || 0;
        if (param === "tahunajaran" || param === "tahunpelajaran") tahunPelajaran = val;
        if (param === "kopsurat" || param === "headerlaporan" || param === "headersurat") headerLaporan = val;
      }
    } else {
      belumKonfigurasi = true;
    }
    
    if (kuotaSistem === 0 || tahunPelajaran === "") belumKonfigurasi = true;
    
    // 📝 AMBIL DATA UTAMA DARI SHEET "PENDAFTAR"
    var sheetPendaftar = ssCabang.getSheetByName("Pendaftar");
    if (!sheetPendaftar) return { status: "error", message: "Sheet 'Pendaftar' tidak ditemukan." };
    
    var values = sheetPendaftar.getDataRange().getValues();
    
    if (values.length <= 1) {
      return { 
        status: "success", nama_sekolah: namaSekolahSistem, kuota: kuotaSistem, 
        tahun_pelajaran: tahunPelajaran || "Belum Diatur", header_laporan: headerLaporan || "Belum Diatur",
        data: [], statistik: { total: 0, diterima: 0, pending: 0, ditolak: 0 }, belum_konfigurasi: belumKonfigurasi 
      };
    }
    
    // Pemetaan Indeks Header Secara Dinamis
    var headerRow = values[0], kol = {};
    for (var c = 0; c < headerRow.length; c++) { 
      kol[headerRow[c].toString().toLowerCase().trim()] = c; 
    }
    
    var listPendaftar = [], stat = { total: 0, diterima: 0, pending: 0, ditolak: 0 };
    
    for (var i = 1; i < values.length; i++) {
      var row = values[i];
      var dapatkan = function(namaKolom, defaultVal) {
        var idx = kol[namaKolom.toLowerCase().trim()];
        return (idx !== undefined && row[idx] !== undefined && row[idx] !== null) ? row[idx].toString().trim() : (defaultVal || "");
      };
      
      var idPen = dapatkan("id_pendaftar");
      if (idPen === "" || idPen === "-") continue;
      
      // 🔥 FIX UTAMA: Toleransi Tinggi Mengunci Kolom Baru status_pendaftaran
      var statusSiswa = dapatkan("status_pendaftaran") || dapatkan("status") || "Pending";
      
      stat.total++;
      if (statusSiswa.toLowerCase() === "diterima" || statusSiswa.toLowerCase() === "lulus") stat.diterima++;
      else if (statusSiswa.toLowerCase() === "ditolak" || statusSiswa.toLowerCase() === "tidak lulus") stat.ditolak++;
      else stat.pending++;
      
      var tglLahirRaw = dapatkan("tanggal_lahir"), tglLahirFormatted = "-";
      if (tglLahirRaw && tglLahirRaw !== "-") {
        try { tglLahirFormatted = Utilities.formatDate(new Date(tglLahirRaw), Session.getScriptTimeZone(), "dd-MM-yyyy"); } catch(e) { tglLahirFormatted = tglLahirRaw; }
      }

      // Masukkan seluruh item data Dapodik ke paket pengiriman frontend
      listPendaftar.push({
        id_pendaftar: idPen,
        nama: dapatkan("nama"),
        nisn: dapatkan("nisn"),
        kontak: dapatkan("kontak") || dapatkan("no_hp") || dapatkan("telepon"),
        
        // 🟢 Tetap kirim properti 'status' agar frontend admin tidak perlu dirombak kodenya
        status: statusSiswa, 
        
        tanggal_lahir: tglLahirFormatted,
        asal_sekolah: dapatkan("asal_sekolah"),
        jenis_pendaftaran: dapatkan("jenis_pendaftaran") || dapatkan("jalur"),
        kelas_dimasuki: dapatkan("kelas_dimasuki"),
        
        // DATA INDUK DAPODIK BARU DENGAN FALLBACK AMAN
        nik_siswa: dapatkan("nik_siswa") || dapatkan("nik"),
        tempat_lahir: dapatkan("tempat_lahir"),
        jenis_kelamin: dapatkan("jenis_kelamin") || dapatkan("jk"),
        alamat: dapatkan("alamat"),
        anak_ke: dapatkan("anak_ke"),
        jumlah_saudara: dapatkan("jumlah_saudara"),
        
        // DATA WALI ORANG TUA
        nama_ayah: dapatkan("nama_ayah"),
        nik_ayah: dapatkan("nik_ayah"),
        nama_ibu: dapatkan("nama_ibu"),
        nik_ibu: dapatkan("nik_ibu"),
        
        // DATA BERKAS DIGITAL DAN FOTO PROFIL SISWA (Kebal Underscore)
        link_foto: dapatkan("link_foto") || dapatkan("foto"),
        link_kk: dapatkan("link_kk") || dapatkan("kk"),
        link_akta: dapatkan("link_akta") || dapatkan("akta"),
        link_skl: dapatkan("link_skl") || dapatkan("skl"),
        link_kip: dapatkan("link_kip") || dapatkan("kip"),
        
        alasan_ditolak: dapatkan("alasan_ditolak") || dapatkan("catatan") || "-"
      });
    }
    
    return { 
      status: "success", data: listPendaftar, statistik: stat, nama_sekolah: namaSekolahSistem, 
      kuota: kuotaSistem, tahun_pelajaran: tahunPelajaran || "Belum Diatur", header_laporan: headerLaporan || "Belum Diatur",
      belum_konfigurasi: belumKonfigurasi
    };
    
  } catch (error) {
    console.error("🚨 Error di ambilPendaftarSekolah:", error.toString());
    return { status: "error", message: "Gagal memuat basis data: " + error.toString() };
  } finally { 
    lock.releaseLock(); 
  }
}

/**
function simpanKeputusanSeleksiServer(idSekolah, idSiswa, statusBaru, alasanBaru) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch(e) { return { status: "error", message: "Server sibuk." }; }
  try {
    var ssIdCabang = ambilSsIdSekolah(idSekolah);
    var sheetCabang = SpreadsheetApp.openById(ssIdCabang).getSheets()[0];
    var values = sheetCabang.getDataRange().getValues();
    var header = values[0];
    
    var idxId = -1, idxStatus = -1, idxAlasan = -1;
    for (var c = 0; c < header.length; c++) {
      var h = header[c].toString().toLowerCase().trim();
      if (h === "id_pendaftar" || h === "id pendaftar") idxId = c;
      if (h === "status") idxStatus = c;
      if (h === "alasan_ditolak" || h === "alasan ditolak") idxAlasan = c;
    }
    
    if (idxAlasan === -1) {
      idxAlasan = header.length;
      sheetCabang.getRange(1, idxAlasan + 1).setValue("alasan_ditolak");
    }
    
    var targetId = idSiswa.toString().trim().toLowerCase(), sukses = false;
    for (var i = 1; i < values.length; i++) {
  var idDb = values[i][idxId] ? values[i][idxId].toString().trim().toLowerCase() : "";
  if (idDb === targetId) {
    
    // 1. Tulis status baru apa adanya ke database cabang (misal: "ditolak" atau "diterima")
    sheetCabang.getRange(i + 1, idxStatus + 1).setValue(statusBaru);
    
    // 2. MODIFIKASI SAKTI: Paksa statusBaru di-convert ke huruf kecil saat pengecekan kondisi
    var cekStatusKecil = statusBaru ? statusBaru.toString().trim().toLowerCase() : "";
    
    if (cekStatusKecil === "ditolak") {
      // Jika statusnya ditolak, masukkan alasan baru dari operator (paksa kapital)
      var textAlasanAman = (alasanBaru && alasanBaru.trim() !== "") ? alasanBaru.trim().toUpperCase() : "BERKAS TIDAK LENGKAP";
      sheetCabang.getRange(i + 1, idxAlasan + 1).setValue(textAlasanAman);
    } else {
      // Jika statusnya diterima atau pending, baru bersihkan kolom alasan menjadi "-"
      sheetCabang.getRange(i + 1, idxAlasan + 1).setValue("-");
    }
    
    sukses = true;
    break;
  }
}
    if (sukses) { SpreadsheetApp.flush(); return { status: "success" }; }
    return { status: "error", message: "ID Pendaftar tidak ditemukan." };
  } catch (err) { return { status: "error", message: err.toString() }; } finally { lock.releaseLock(); }
}
 */
//SIMPAN KEPUTUSAN SELEKSI LAMA
/**
 * =========================================================================
 * 💾 BACKEND CONTROLLER: SIMPAN KEPUTUSAN SELEKSI OTORITAS ADMIN (SUPER SAFE)
 * FIX EROR: Bypass Struktur Kolom Tidak Lengkap (Auto-Mapping & Auto-Fallback)
 * =========================================================================
 */
function simpanKeputusanSeleksiServer(idSekolah, idSiswa, statusBaru, alasanBaru) {
  var lock = LockService.getScriptLock();
  try { 
    lock.waitLock(15000); // Kunci transaksi 15 detik demi keamanan antrean
  } catch(e) { 
    return { status: "error", message: "Server cloud sedang sibuk. Silakan coba 5 detik lagi." }; 
  }
  
  try {
    var ssIdCabang = ambilSsIdSekolah(idSekolah);
    if (!ssIdCabang) return { status: "error", message: "ID Spreadsheet Cabang tidak terdeteksi." };
    
    var sheetCabang = SpreadsheetApp.openById(ssIdCabang).getSheetByName("Pendaftar");
    if (!sheetCabang) return { status: "error", message: "Sheet 'Pendaftar' tidak ditemukan di database cabang." };
    
    var data = sheetCabang.getDataRange().getValues();
    var header = data[0];
    
    // 1. MAPPING HEADER SECARA DINAMIS DENGAN TOLERANSI MAKSIMAL
    var idxIdPen = -1, idxStatus = -1, idxAlasan = -1;
    
    for (var c = 0; c < header.length; c++) {
      var hName = header[c].toString().toLowerCase().trim().replace(/[^a-z0-9]/g, "");
      
      // Deteksi ID Pendaftar
      if (hName === "idpendaftar" || hName === "id") idxIdPen = c;
      
      // Deteksi Kolom Status (Mendukung: status, statuspendaftaran, statuspendaftar, statusseleksi)
      if (hName === "status" || hName === "statuspendaftaran" || hName === "statuspendaftar" || hName === "statusseleksi") {
        idxStatus = c;
      }
      
      // Deteksi Kolom Alasan Ditolak
      if (hName === "alasanditolak" || hName === "catatan" || hName === "alasan") idxAlasan = c;
    }
    
    // 🛑 LOGIKA PENJINAK: Jika kolom status tidak ketemu lewat Regex, cari manual urutan Kolom E atau F
    if (idxStatus === -1) {
      console.warn("⚠️ Kolom Status tidak terdeteksi via nama, mengunci otomatis ke kolom F (indeks 4/5)...");
      // Fallback darurat: Cek jika kolom ke-5 atau ke-6 bisa dipakai
      idxStatus = header.length > 4 ? 4 : 4; 
    }
    
    if (idxIdPen === -1) {
      // Fallback darurat jika kolom ID Pendaftar tidak ketemu, pakai kolom pertama (indeks 0)
      idxIdPen = 0;
    }
    
    // 2. CARI BARIS SISWA BERDASARKAN ID PENDAFTAR
    var targetId = idSiswa.toString().trim().toLowerCase();
    var barisSiswa = -1;
    
    for (var i = 1; i < data.length; i++) {
      var idDb = data[i][idxIdPen] ? data[i][idxIdPen].toString().trim().toLowerCase() : "";
      if (idDb === targetId) {
        barisSiswa = i + 1; // Konversi ke indeks baris Spreadsheet
        break;
      }
    }
    
    if (barisSiswa === -1) {
      return { status: "error", message: "Data Calon Siswa dengan ID " + idSiswa + " tidak ditemukan di lembar data." };
    }
    
    // 3. EKSEKUSI PENYIMPANAN DATA AMAN KE GOOGLE SHEETS
    // Tembak nilai status baru ke kolom status (+1 karena indeks range mulai dari 1)
    sheetCabang.getRange(barisSiswa, idxStatus + 1).setValue(statusBaru);
    
    // Tembak nilai alasan baru jika kolomnya berhasil terpetakan
    if (idxAlasan !== -1) {
      sheetCabang.getRange(barisSiswa, idxAlasan + 1).setValue(alasanBaru);
    } else {
      // Fallback: Jika kolom alasan tidak ketemu nama tepatnya, buat otomatis di kolom terakhir pendaftar
      var kolomTerakhir = sheetCabang.getLastColumn();
      sheetCabang.getRange(1, kolomTerakhir).setValue("ALASAN_DITOLAK"); // Buat headernya jika hilang
      sheetCabang.getRange(barisSiswa, kolomTerakhir).setValue(alasanBaru);
    }
    
    // Force sync ke Cloud Storage
    SpreadsheetApp.flush();
    console.log("✅ Sukses Mutlak Otoritas: ID " + idSiswa + " ter-update ke " + statusBaru);
    
    return { status: "success" };
    
  } catch (err) {
    console.error("🚨 Gagal Eksekusi di simpanKeputusanSeleksiServer:", err.toString());
    return { status: "error", message: "Server Error: " + err.toString() };
  } finally {
    lock.releaseLock(); // Lepas gembok antrean
  }
}


function ambilPengaturanSekolahServer(idSekolah) {
  try {
    var ssIdCabang = ambilSsIdSekolah(idSekolah);
    if (!ssIdCabang) return { status: "error", message: "Spreadsheet ID Cabang tidak ditemukan." };
    
    // Disepakati menggunakan nama sheet "Konfigurasi"
    var sheetKonfig = SpreadsheetApp.openById(ssIdCabang).getSheetByName("Konfigurasi");
    if (!sheetKonfig) return { status: "error", message: "Sheet 'Konfigurasi' tidak ditemukan." };
    
    var dataKonfig = sheetKonfig.getDataRange().getValues(), kf = {};
    
    // Mulai dari j = 0 jika tidak ada baris header, atau j = 1 jika baris 1 adalah judul kolom
    for (var j = 0; j < dataKonfig.length; j++) {
      if (dataKonfig[j][0]) {
        // Bersihkan key agar kebal dari spasi atau underscore (target_kuota -> targetkuota)
        var cleanKey = dataKonfig[j][0].toString().toLowerCase().replace(/[^a-z0-9]/g, "");
        kf[cleanKey] = dataKonfig[j][1];
      }
    }
    
    var kontakMentah = kf["kontakadmin"] || kf["kontak"] || "";
    
    return {
      status: "success",
      data: {
        kuota: parseInt(kf["targetkuota"] || kf["kuota"]) || 100,
        tahun_pelajaran: kf["tahunajaran"] || kf["tahunpelajaran"] || "2026/2027",
        kontak_admin: kontakMentah.toString().trim(), 
        header_laporan: kf["kopsurat"] || kf["headerlaporan"] || kf["header"] || ""
      }
    };
  } catch (err) { 
    return { status: "error", message: err.toString() }; 
  }
}

function simpanPengaturanSekolahServer(idSekolah, dataPengaturan) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch(e) { return { status: "error", message: "Server sibuk." }; }
  
  try {
    var ssIdCabang = ambilSsIdSekolah(idSekolah);
    var sheetKonfig = SpreadsheetApp.openById(ssIdCabang).getSheetByName("Konfigurasi");
    if (!sheetKonfig) return { status: "error", message: "Sheet 'Konfigurasi' tidak ditemukan." };
    
    function updateParameterNilai(namaParameter, nilaiBaru) {
      var dataKonfigTerbaru = sheetKonfig.getDataRange().getValues();
      for (var j = 0; j < dataKonfigTerbaru.length; j++) {
        if (dataKonfigTerbaru[j][0] && dataKonfigTerbaru[j][0].toString().trim().toLowerCase() === namaParameter.toLowerCase().trim()) {
          sheetKonfig.getRange(j + 1, 2).setValue(nilaiBaru);
          return true;
        }
      }
      sheetKonfig.appendRow([namaParameter, nilaiBaru]);
      return false;
    }
    
    updateParameterNilai("target_kuota", parseInt(dataPengaturan.kuota) || 0);
    updateParameterNilai("tahun_ajaran", dataPengaturan.tahun_pelajaran);
    
    var nomorKontak = dataPengaturan.kontak_admin.toString().trim();
    if (nomorKontak && !nomorKontak.startsWith("'")) nomorKontak = "'" + nomorKontak;
    updateParameterNilai("kontak_admin", nomorKontak);
    updateParameterNilai("kop_surat", dataPengaturan.header_laporan);
    
    SpreadsheetApp.flush(); 
    return { status: "success", message: "Konfigurasi Berhasil Disimpan!" };
  } catch (err) { 
    return { status: "error", message: err.toString() }; 
  } finally { lock.releaseLock(); }
}


function gantiPasswordAdminServer(idSekolah, sandiLama, sandiBaru) {
  try {
    var ssMaster = SpreadsheetApp.openById(MASTER_SS_ID);
    var sheetUserAdmin = ssMaster.getSheetByName("User_Admin");
    var dataUserAdmin = sheetUserAdmin.getDataRange().getValues();
    var barisUserKetemu = -1;
    
    for (var r = 1; r < dataUserAdmin.length; r++) {
      if (dataUserAdmin[r][0].toString().trim().toLowerCase() === idSekolah.toString().trim().toLowerCase()) {
        barisUserKetemu = r; break;
      }
    }
    if (barisUserKetemu === -1) return { status: "error", message: "Akun tidak ditemukan." };
    if (dataUserAdmin[barisUserKetemu][1].toString().trim() !== sandiLama.toString().trim()) {
      return { status: "error", message: "Password lama salah." };
    }
    
    sheetUserAdmin.getRange(barisUserKetemu + 1, 2).setValue(sandiBaru.toString().trim());
    SpreadsheetApp.flush();
    return { status: "success" };
  } catch (err) { return { status: "error", message: err.toString() }; }
}

// =============================================================================
// [BLOK III] REKAYASA INTEGRASI PORTAL SISWA MANDIRI & DOKUMEN (STUDENT PANEL)
// =============================================================================

/**
 * SISWA MANDIRI FITUR 1: Tarik konfigurasi dinamis (Tapel & Kontak WA) ke Banner Siswa
 */
function ambilKonfigurasiSiswa(idSekolah) {
  return ambilPengaturanSekolahServer(idSekolah);
}

/**
 * SISWA MANDIRI FITUR 4 & 5: Melacak detail biodata, status, dan alasan penolakan
 */
/**
 * =========================================================================
 * 👤 CLIENT ENGINE: AMBIL PROFIL SISWA UNTUK DASHBOARD AKUN
 * FIX: Sinkronisasi Kolom Baru "status_pendaftaran" Agar Dashboard Update
 * =========================================================================
 */
function ambilProfilSiswa(idSekolah, nisnSiswa) {
  try {
    var ssId = ambilSsIdSekolah(idSekolah); 
    if (!ssId) return { status: "error", message: "ID Spreadsheet Cabang tidak ditemukan." };
    
    var sheet = SpreadsheetApp.openById(ssId).getSheets()[0];
    var data = sheet.getDataRange().getValues(), headerRow = data[0], kol = {};
    
    // Pemetaan nama kolom ke indeks angka secara otomatis
    for (var c = 0; c < headerRow.length; c++) { 
      kol[headerRow[c].toString().toLowerCase().trim()] = c; 
    }
    
    var targetNisn = nisnSiswa.toString().trim();
    for (var i = 1; i < data.length; i++) {
      if (kol["nisn"] !== undefined && data[i][kol["nisn"]].toString().trim() === targetNisn) {
        var row = data[i];
        var dapatkan = function(namaKolom, defaultVal) {
          var idx = kol[namaKolom.toLowerCase().trim()];
          return (idx !== undefined && row[idx] !== undefined && row[idx] !== null) ? row[idx].toString().trim() : (defaultVal || "");
        };
        
        var tglLahirRaw = dapatkan("tanggal_lahir"), tglLahirFormatted = "";
        if (tglLahirRaw && tglLahirRaw !== "-") {
          try { 
            tglLahirFormatted = Utilities.formatDate(new Date(tglLahirRaw), Session.getScriptTimeZone(), "yyyy-MM-dd"); 
          } catch(e) { 
            tglLahirFormatted = tglLahirRaw; 
          }
        }
        
        // 🔥 FIX UTAMA: Toleransi Tinggi Untuk Status Pendaftaran Siswa
        var statusSiswaFix = dapatkan("status_pendaftaran") || dapatkan("status") || "Pending";
        
        // KUNCI UTAMA: Membungkus semua kiriman data dari Google Sheets menuju HTML Dashboard Siswa
        return {
          status: "success",
          data: {
            id_pendaftar: dapatkan("id_pendaftar"), 
            nama: dapatkan("nama"), 
            nisn: dapatkan("nisn"), 
            kontak: dapatkan("kontak"),
            asal_sekolah: dapatkan("asal_sekolah"), 
            alamat: dapatkan("alamat"), 
            
            // 🟢 Data status sekarang sinkron 100% menembak kolom baru maupun kolom lama
            status_pendaftaran: statusSiswaFix, 
            
            nik_siswa: dapatkan("nik_siswa") || dapatkan("nik"), 
            tempat_lahir: dapatkan("tempat_lahir"), 
            tanggal_lahir: tglLahirFormatted,
            jenis_kelamin: dapatkan("jenis_kelamin") || dapatkan("jk"), 
            nama_ayah: dapatkan("nama_ayah"), 
            nik_ayah: dapatkan("nik_ayah"),
            nama_ibu: dapatkan("nama_ibu"), 
            nik_ibu: dapatkan("nik_ibu"), 
            jumlah_saudara: dapatkan("jumlah_saudara", "0"),
            anak_ke: dapatkan("anak_ke", "1"), 
            jenis_pendaftaran: dapatkan("jenis_pendaftaran") || dapatkan("jalur"), 
            kelas_dimasuki: dapatkan("kelas_dimasuki"),
            alasan_ditolak: dapatkan("alasan_ditolak") || dapatkan("catatan") || "-", 
            
            // Link berkas digital dengan fallback kebal underscore (_)
            link_foto: dapatkan("link_foto") || dapatkan("foto"), 
            link_kk: dapatkan("link_kk") || dapatkan("kk"),
            link_akta: dapatkan("link_akta") || dapatkan("akta"), 
            link_skl: dapatkan("link_skl") || dapatkan("skl"),
            link_kip: dapatkan("link_kip") || dapatkan("kip")
          }
        };
      }
    }
    return { status: "error", message: "Data pendaftaran Anda tidak ditemukan di cabang ini." };
  } catch (error) { 
    return { status: "error", message: "Gagal memuat profil: " + error.toString() }; 
  }
}

/**
 * SISWA MANDIRI FITUR 3 & 6: Update data siswa (Terkunci Huruf Kapital, Pengaman Teks WA & NIK)
 */
function updateBiodataSiswaServer(idSekolah, idPendaftar, payload) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch(e) { return { status: "error", message: "Server cloud sibuk." }; }
  try {
    var ssIdCabang = ambilSsIdSekolah(idSekolah);
    var sheetCabang = SpreadsheetApp.openById(ssIdCabang).getSheets()[0];
    var data = sheetCabang.getDataRange().getValues(), header = data[0], kol = {};
    
    for (var c = 0; c < header.length; c++) { kol[header[c].toString().toLowerCase().trim()] = c; }
    
    var targetId = idPendaftar.toString().trim().toLowerCase(), barisSiswa = -1;
    for (var i = 1; i < data.length; i++) {
      if (data[i][kol["id_pendaftar"]].toString().trim().toLowerCase() === targetId) {
        barisSiswa = i + 1; break;
      }
    }
    if (barisSiswa === -1) throw new Error("ID Registrasi pendaftaran tidak valid.");

    var tulisSel = function(namaKolom, nilaiBaru) {
      var idxKol = kol[namaKolom.toLowerCase().trim()];
      if (idxKol !== undefined && nilaiBaru !== undefined) {
        sheetCabang.getRange(barisSiswa, idxKol + 1).setValue(nilaiBaru);
      }
    };

    tulisSel("kontak", "'" + payload.kontak.toString().replace(/[^0-9]/g, "")); 
    tulisSel("nik_siswa", "'" + payload.nik_siswa.toString().replace(/[^0-9]/g, "")); 
    tulisSel("asal_sekolah", payload.asal_sekolah.toUpperCase());
    tulisSel("tempat_lahir", payload.tempat_lahir.toUpperCase());
    tulisSel("tanggal_lahir", payload.tanggal_lahir);
    tulisSel("alamat", payload.alamat.toUpperCase());
    tulisSel("jenis_kelamin", payload.jenis_kelamin);
    tulisSel("jenis_pendaftaran", payload.jenis_pendaftaran);
    tulisSel("nama_ayah", payload.nama_ayah.toUpperCase());
    tulisSel("nik_ayah", "'" + payload.nik_ayah.toString().replace(/[^0-9]/g, ""));
    tulisSel("nama_ibu", payload.nama_ibu.toUpperCase());
    tulisSel("nik_ibu", "'" + payload.nik_ibu.toString().replace(/[^0-9]/g, ""));
    tulisSel("jumlah_saudara", payload.jumlah_saudara);
    tulisSel("anak_ke", payload.anak_ke);
    tulisSel("kelas_dimasuki", payload.kelas_dimasuki);
    tulisSel("status", "Pending");

    SpreadsheetApp.flush();
    return { status: "success" };
  } catch (err) { return { status: "error", message: err.toString() }; } finally { lock.releaseLock(); }
}

/**
 * SISWA MANDIRI FITUR 5: Proses Alih Pindah Pilihan Cabang Sekolah Jika Ditolak
 */
/**
 * =========================================================================
 * 🏢 CORE BACKEND ENGINE: MUTASI MANDIRI MULTI-TENANT & AUTO-COPY DATA
 * SINKRONISASI: Menjamin berkas digital (KK, Akta, SKL, KIP) ikut tersalin utuh.
 * SOP: Akses dikunci jika status di sekolah asal belum resmi "Ditolak".
 * =========================================================================
 */
function prosesPindahSekolahPilihanSiswa(nisn, idSekolahLama, idSekolahBaru) {
  var lock = LockService.getScriptLock();
  try { 
    // Beri waktu tunggu 30 detik karena memproses 3 spreadsheet berbeda sekaligus
    lock.waitLock(30000); 
  } catch(e) { 
    return { status: "error", message: "Server sibuk memproses antrean mutasi. Silakan coba beberapa saat lagi." }; 
  }
  
  try {
    var nisnTarget = nisn.toString().trim();
    console.log("✈️ Memulai proses mutasi mandiri untuk NISN:", nisnTarget);
    
    // -------------------------------------------------------------------------
    // TAHAP 1: UPDATE DATABASE MASTER PUSAT (User_Admin)
    // -------------------------------------------------------------------------
    var ssMaster = SpreadsheetApp.openById(MASTER_SS_ID);
    var sheetUserMaster = ssMaster.getSheetByName("User_Admin");
    var dataUser = sheetUserMaster.getDataRange().getValues();
    
    var barisUser = -1;
    for (var i = 1; i < dataUser.length; i++) {
      var userDb = dataUser[i][0] ? dataUser[i][0].toString().trim() : "";
      if (userDb === nisnTarget && dataUser[i][2] === "siswa") {
        barisUser = i + 1;
        // Alihkan ID Sekolah Cabang Tujuan Baru di kolom E (indeks 5)
        sheetUserMaster.getRange(barisUser, 5).setValue(idSekolahBaru); 
        break;
      }
    }

    if (barisUser === -1) {
      return { status: "error", message: "Gagal Mutasi: Akun login NISN tidak terdaftar di server pusat." };
    }


    // -------------------------------------------------------------------------
    // TAHAP 2: BUKA DATA SEKOLAH LAMA & VALIDASI SOP STATUS (ANTI-BYPASS)
    // -------------------------------------------------------------------------
    var ssIdLama = ambilSsIdSekolah(idSekolahLama);
    var sheetLama = SpreadsheetApp.openById(ssIdLama).getSheets()[0];
    var dataLama = sheetLama.getDataRange().getValues();
    var headerLama = dataLama[0];
    
    var idxNisnLama = -1, idxStatusLama = -1;
    for (var c = 0; c < headerLama.length; c++) {
      var h = headerLama[c].toString().toUpperCase().trim();
      if (h === "NISN") idxNisnLama = c;
      if (h === "STATUS") idxStatusLama = c;
    }
    
    var barisSiswaLama = -1;
    var statusSiswaLamaReal = "";
    
    if (idxNisnLama !== -1) {
      for (var r = 1; r < dataLama.length; r++) {
        var nisnDbLama = dataLama[r][idxNisnLama] ? dataLama[r][idxNisnLama].toString().replace(/'/g, "").trim() : "";
        if (nisnDbLama === nisnTarget) {
          barisSiswaLama = r + 1;
          statusSiswaLamaReal = dataLama[r][idxStatusLama] ? dataLama[r][idxStatusLama].toString().trim().toLowerCase() : "";
          break;
        }
      }
    }
    
    // Validasi Krusial: Jika profil tidak ada di sekolah lama
    if (barisSiswaLama === -1) {
      return { status: "error", message: "Gagal Mutasi: Berkas rekam pendaftaran tidak ditemukan di sekolah asal." };
    }

    // 🔥 GERBANG PENGAMAN: Jika status aslinya di Sheets bukan "ditolak", BLOKIR AKSES!
    if (statusSiswaLamaReal !== "ditolak") {
      console.warn("🚨 Deteksi Bypass Akses: NISN " + nisnTarget + " statusnya " + statusSiswaLamaReal + " mencoba mutasi paksa.");
      return { 
        status: "error", 
        message: "Akses Ditolak Server! Anda tidak diizinkan mutasi pilihan sekolah karena status Anda saat ini masih: <b>" + statusSiswaLamaReal.toUpperCase() + "</b>. Mutasi hanya diizinkan jika berkas Anda dinyatakan DITOLAK oleh verifikator." 
      };
    }

    // Ambil data satu baris penuh milik siswa dari sekolah lama untuk dicopy
    var barisDataAsliSiswa = dataLama[barisSiswaLama - 1];


    // -------------------------------------------------------------------------
    // TAHAP 3: SUNTIK & COPY DATA PROFIL UTUH KE SPREADSHEET CABANG BARU
    // -------------------------------------------------------------------------
    var ssIdCabangBaru = ambilSsIdSekolah(idSekolahBaru);
    var sheetCabangBaru = SpreadsheetApp.openById(ssIdCabangBaru).getSheets()[0];
    
    var headerBaru = sheetCabangBaru.getRange(1, 1, 1, sheetCabangBaru.getLastColumn()).getValues()[0];
    var barisDataBaru = new Array(headerBaru.length).fill(""); 
    
    // Generate ID Registrasi Pendaftaran Baru khusus untuk cabang baru ini
    var rawUuid = Utilities.getUuid();
    var idPendaftarBaru = "REG-" + rawUuid.replace(/-/g, "").substring(0, 6).toUpperCase();
    var indeksKolomNisnBaru = -1;

    // Mapping Generator: Memetakan kecocokan kolom secara dinamis (Aman dari acakan kolom)
    for (var b = 0; b < headerBaru.length; b++) {
      var namaKolomBaru = headerBaru[b].toString().toUpperCase().trim();
      
      // Cari kolom bermakna sama di struktur database sekolah lama
      var indeksLamaCocok = headerLama.findIndex(function(hCell) {
        return hCell.toString().toUpperCase().trim() === namaKolomBaru;
      });
      
      if (namaKolomBaru === "ID_PENDAFTAR" || namaKolomBaru === "ID PENDAFTAR") {
        barisDataBaru[b] = idPendaftarBaru; // Pakai ID pendaftaran baru khusus cabang baru
      } else if (namaKolomBaru === "STATUS") {
        barisDataBaru[b] = "Pending";       // Reset status menjadi antrean awal di sekolah baru
      } else if (namaKolomBaru === "ALASAN_DITOLAK" || namaKolomBaru === "ALASAN DITOLAK") {
        barisDataBaru[b] = "-";             // Bersihkan histori catatan penolakan masa lalu
      } else if (namaKolomBaru === "NISN") {
        barisDataBaru[b] = nisnTarget;
        indeksKolomNisnBaru = b + 1;
      } else if (indeksLamaCocok !== -1) {
        // 🔥 DATA COPY ENGINE: Salin biodata, alamat, nilai, hingga link berkas digital (KK/Akta/SKL)
        barisDataBaru[b] = barisDataAsliSiswa[indeksLamaCocok];
      }
    }
    
    // Tambah baris baru hasil duplikasi utuh ke sheet tujuan baru
    sheetCabangBaru.appendRow(barisDataBaru);
    
    // Kunci format teks string pada kolom NISN baru agar angka nol di depan aman dari sunat otomatis Excel
    if (indeksKolomNisnBaru !== -1) {
      var lastRowBaru = sheetCabangBaru.getLastRow();
      sheetCabangBaru.getRange(lastRowBaru, indeksKolomNisnBaru).setNumberFormat("@");
      sheetCabangBaru.getRange(lastRowBaru, indeksKolomNisnBaru).setValue(nisnTarget);
    }


    // -------------------------------------------------------------------------
    // TAHAP 4: UPDATE STATUS & BERSIHKAN REKAM DATA DI SEKOLAH ASAL
    // -------------------------------------------------------------------------
    if (idxStatusLama !== -1) {
      // Ubah status di sekolah lama menjadi "Pindah Sekolah" agar tertib administrasi panitia lama
      sheetLama.getRange(barisSiswaLama, idxStatusLama + 1).setValue("Pindah Sekolah");
      
      // Beri catatan mutasi pada kolom alasan ditolak di sekolah lama
      var idxAlasanLama = headerLama.findIndex(function(h) {
        var hStr = h.toString().toLowerCase().trim();
        return hStr === "alasan_ditolak" || hStr === "alasan ditolak";
      });
      if (idxAlasanLama !== -1) {
        sheetLama.getRange(barisSiswaLama, idxAlasanLama + 1).setValue("MUTASI MANDIRI KELUAR KE INSTANSI ID: " + idSekolahBaru);
      }
    }

    // Force sync data cloud spreadsheet
    SpreadsheetApp.flush();
    console.log("🎯 Sukses Mutasi Terkendali: " + nisnTarget + " resmi dialihkan ke " + idSekolahBaru + " dengan dokumen utuh.");
    
    return { status: "success", new_id: idPendaftarBaru };
    
  } catch (err) { 
    console.error("🚨 Error Engine Mutasi Pusat:", err.toString());
    return { status: "error", message: "Gagal memproses mutasi berkas: " + err.toString() }; 
  } finally { 
    // Lepas gembok antrean server
    lock.releaseLock(); 
  }
}

function prosesUploadFotoProfilServer(idSekolah, idPendaftar, base64DataRaw) {
  try {
    if (!idSekolah || !idPendaftar || !base64DataRaw) {
      throw new Error("Parameter upload foto profil tidak lengkap!");
    }

    var splitData = base64DataRaw.split(",");
    var contentType = splitData[0].split(":")[1].split(";")[0];
    var byteData = Utilities.base64Decode(splitData[1]);
    
    // Tentukan ekstensi file foto profil
    var ekstensi = ".png";
    if (contentType.includes("jpeg") || contentType.includes("jpg")) ekstensi = ".jpg";
    
    var namaFileFoto = "FOTO_" + idPendaftar + ekstensi;
    var blob = Utilities.newBlob(byteData, contentType, namaFileFoto);
    
    // =====================================================================
    // 1. AUTOMATIC TRACKING NAMA SEKOLAH DARI SPREADSHEET MASTER PUSAT
    // =====================================================================
    var namaSekolahDitemukan = idSekolah.toString().trim().toUpperCase(); // Fallback jika master gagal
    try {
      var ssMaster = SpreadsheetApp.openById(MASTER_SS_ID);
      var sheetMitra = ssMaster.getSheetByName("Sekolah_Mitra") || ssMaster.getSheets()[0];
      if (sheetMitra) {
        var dataMitra = sheetMitra.getDataRange().getValues();
        var headerMitra = dataMitra[0];
        
        var kolMitra = {};
        for (var m = 0; m < headerMitra.length; m++) {
          kolMitra[headerMitra[m].toString().toLowerCase().trim()] = m;
        }
        
        var targetIdSekolah = idSekolah.toString().trim().toLowerCase();
        for (var r = 1; r < dataMitra.length; r++) {
          var idSekolahDb = dataMitra[r][kolMitra["id_sekolah"]] || dataMitra[r][kolMitra["id sekolah"]] || "";
          if (idSekolahDb.toString().trim().toLowerCase() === targetIdSekolah) {
            namaSekolahDitemukan = dataMitra[r][kolMitra["nama_sekolah"]] || dataMitra[r][kolMitra["nama sekolah"]] || namaSekolahDitemukan;
            break;
          }
        }
      }
    } catch(errMaster) {
      console.warn("Gagal membaca nama sekolah untuk mapping folder foto: " + errMaster.toString());
    }

    // =====================================================================
    // 2. LOGIKA MANAJEMEN FOLDER DI GOOGLE DRIVE INDUK
    // =====================================================================
    var folderIndukPPDB = DriveApp.getFolderById(FOLDER_PENDAFTAR_ID);
    var namaSubFolderSekolah = namaSekolahDitemukan.toString().trim().toUpperCase();
    
    var folderTargetFoto;
    var subFolderSet = folderIndukPPDB.getFoldersByName(namaSubFolderSekolah);
    
    if (subFolderSet.hasNext()) {
      // Jika folder sekolah sudah ada, langsung gunakan
      folderTargetFoto = subFolderSet.next();
    } else {
      // Jika belum ada, buat folder baru di dalam folder induk PPDB
      folderTargetFoto = folderIndukPPDB.createFolder(namaSubFolderSekolah);
      // Set akses publik link agar aman
      folderTargetFoto.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }

    // =====================================================================
    // 3. SIMPAN FILE FOTO PROFIL KE SUBFOLDER SEKOLAH MITRA YANG TEPAT
    // =====================================================================
    var file = folderTargetFoto.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); // Izinkan dibaca agar avatar tampil di dashboard
    
    var linkFotoBaru = file.getUrl();
    
    // =====================================================================
    // 4. SIMPAN TAUTAN LINK FOTO BARU KE SPREADSHEET CABANG
    // =====================================================================
    var ssId = ambilSsIdSekolah(idSekolah);
    var sheet = SpreadsheetApp.openById(ssId).getSheets()[0];
    var data = sheet.getDataRange().getValues();
    var headerRow = data[0];
    
    var kol = {};
    for (var c = 0; c < headerRow.length; c++) {
      var h = headerRow[c].toString().toLowerCase().trim();
      // Mengantisipasi variasi nama kolom spasi atau underscore
      if (h === "id_pendaftar" || h === "id pendaftar") kol["id_pendaftar"] = c;
      if (h === "link_foto" || h === "link foto") kol["link_foto"] = c;
    }
    
    var targetId = idPendaftar.toString().trim();
    var idxIdPen = kol["id_pendaftar"];
    var idxLinkFoto = kol["link_foto"];
    
    if (idxIdPen === undefined || idxLinkFoto === undefined) {
      throw new Error("Kolom 'id_pendaftar' atau 'link_foto' tidak ditemukan di database cabang!");
    }
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][idxIdPen].toString().trim() === targetId) {
        sheet.getRange(i + 1, idxLinkFoto + 1).setValue(linkFotoBaru);
        SpreadsheetApp.flush();
        
        return { status: "success", link: linkFotoBaru };
      }
    }
    
    return { status: "error", message: "Gagal menempelkan link foto: ID Pendaftar tidak ditemukan." };
    
  } catch (err) {
    return { status: "error", message: "Gagal upload foto profil: " + err.toString() };
  }
}

function prosesUploadDokumenServer(idSekolah, idPendaftar, jenisDokumen, base64Data) {
  try {
    if (!idSekolah || !idPendaftar || !jenisDokumen || !base64Data) {
      throw new Error("Parameter upload dokumen tidak lengkap!");
    }

    var ssIdCabang = ambilSsIdSekolah(idSekolah);
    var sheetCabang = SpreadsheetApp.openById(ssIdCabang).getSheets()[0];
    var values = sheetCabang.getDataRange().getValues(), header = values[0];
    
    var idxId = -1, idxTargetKolom = -1;
    for (var c = 0; c < header.length; c++) {
      var h = header[c].toString().toLowerCase().trim();
      if (h === "id_pendaftar" || h === "id pendaftar") idxId = c;
      if (jenisDokumen === "KK" && (h === "link_kk" || h === "link kk")) idxTargetKolom = c;
      if (jenisDokumen === "Akta" && (h === "link_akta" || h === "link akta")) idxTargetKolom = c;
      if (jenisDokumen === "SKL" && (h === "link_skl" || h === "link skl" || h === "link_ijazah")) idxTargetKolom = c;
      if (jenisDokumen === "KIP" && (h === "link_kip" || h === "link kip")) idxTargetKolom = c; 
    }
    
    if (idxTargetKolom === -1) throw new Error("Kolom database untuk dokumen " + jenisDokumen + " tidak ditemukan!");

    var barisSiswa = cariBarisSiswaId(values, idxId, idPendaftar);
    
    // =====================================================================
    // 1. DUMP & AUTOMATIC TRACKING NAMA SEKOLAH DARI SPREADSHEET MASTER PUSAT
    // =====================================================================
    var namaSekolahDitemukan = idSekolah.toString().trim().toUpperCase(); // Fallback jika master gagal
    try {
      var ssMaster = SpreadsheetApp.openById(MASTER_SS_ID);
      var sheetMitra = ssMaster.getSheetByName("Sekolah_Mitra") || ssMaster.getSheets()[0];
      if (sheetMitra) {
        var dataMitra = sheetMitra.getDataRange().getValues();
        var headerMitra = dataMitra[0];
        
        var kolMitra = {};
        for (var m = 0; m < headerMitra.length; m++) {
          kolMitra[headerMitra[m].toString().toLowerCase().trim()] = m;
        }
        
        var targetIdSekolah = idSekolah.toString().trim().toLowerCase();
        for (var r = 1; r < dataMitra.length; r++) {
          var idSekolahDb = dataMitra[r][kolMitra["id_sekolah"]] || dataMitra[r][kolMitra["id sekolah"]] || "";
          if (idSekolahDb.toString().trim().toLowerCase() === targetIdSekolah) {
            namaSekolahDitemukan = dataMitra[r][kolMitra["nama_sekolah"]] || dataMitra[r][kolMitra["nama sekolah"]] || namaSekolahDitemukan;
            break;
          }
        }
      }
    } catch(errMaster) {
      console.warn("Gagal membaca nama sekolah dari master untuk mapping folder: " + errMaster.toString());
    }

    // =====================================================================
    // 2. LOGIKA MANAJEMEN STRUKTUR SUBFOLDER DI GOOGLE DRIVE INDUK
    // =====================================================================
    // Buka folder induk utama PPDB berdasarkan konstanta di Code.gs
    var folderIndukPPDB = DriveApp.getFolderById(FOLDER_PENDAFTAR_ID);
    var namaSubFolderSekolah = namaSekolahDitemukan.toString().trim().toUpperCase();
    
    var folderArsipTarget;
    var subFolderSet = folderIndukPPDB.getFoldersByName(namaSubFolderSekolah);
    
    if (subFolderSet.hasNext()) {
      // Jika folder sekolah mitra sudah ada, langsung gunakan
      folderArsipTarget = subFolderSet.next();
    } else {
      // Jika belum ada, buat folder baru di dalam folder induk PPDB
      folderArsipTarget = folderIndukPPDB.createFolder(namaSubFolderSekolah);
      // Set permission folder agar siapa saja yang punya link bisa melihat isinya
      folderArsipTarget.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }

    // =====================================================================
    // 3. PROSES EKSTRAKSI DATA BASE64 DAN SIMPAN BERKAS
    // =====================================================================
    var bagianFile = base64Data.split(",");
    var contentType = bagianFile[0].split(":")[1].split(";")[0];
    var dataMentahBytes = Utilities.base64Decode(bagianFile[1]);
    
    // Deteksi ekstensi file secara dinamis berdasarkan content type
    var ekstensi = ".jpg";
    if (contentType.includes("pdf")) { ekstensi = ".pdf"; }
    else if (contentType.includes("png")) { ekstensi = ".png"; }
    
    var namaFileRapi = jenisDokumen + "_" + idPendaftar + ekstensi;
    var blobFile = Utilities.newBlob(dataMentahBytes, contentType, namaFileRapi);
    
    // Tembak file langsung ke dalam Subfolder Sekolah Mitra tujuan
    var fileBaruDrive = folderArsipTarget.createFile(blobFile);
    
    // Set permission file agar ramah browser (Direct view bypass)
    fileBaruDrive.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // =====================================================================
    // 4. UPDATE LINK DOKUMEN KE SPREADSHEET CABANG
    // =====================================================================
    sheetCabang.getRange(barisSiswa, idxTargetKolom + 1).setValue(fileBaruDrive.getUrl());
    SpreadsheetApp.flush();
    
    return { status: "success", url: fileBaruDrive.getUrl() };
  } catch (err) { 
    return { status: "error", message: err.toString() }; 
  }
}

// =============================================================================
// [BLOK IV] UTILITY REGISTER INTERNAL LINKERS & CORE ENGINE SYSTEM REQS
// =============================================================================

function cariBarisSiswaId(data, indeksKolom, idCari) {
  if (indeksKolom === undefined || indeksKolom === -1) return 1;
  var idTarget = idCari.toString().trim().toLowerCase();
  for (var i = 1; i < data.length; i++) {
    if (data[i][indeksKolom] && data[i][indeksKolom].toString().trim().toLowerCase() === idTarget) {
      return i + 1;
    }
  }
  return 1;
}

function ambilSsIdSekolah(idSekolah) {
  var data = SpreadsheetApp.openById(MASTER_SS_ID).getSheetByName("Sekolah_Mitra").getDataRange().getValues();
  for (var i = 1; i < data.length; i++) { if (data[i][0].toString().trim() === idSekolah.toString().trim()) return data[i][3].toString().trim(); }
  return null;
}

function ambilFolderIdSekolah(idSekolah) {
  var data = SpreadsheetApp.openById(MASTER_SS_ID).getSheetByName("Sekolah_Mitra").getDataRange().getValues();
  for (var i = 1; i < data.length; i++) { if (data[i][0].toString().trim() === idSekolah.toString().trim()) return data[i][4].toString().trim(); }
  return null;
}

function ambilNamaSekolahTujuanSiswa(usernameSiswa) {
  var ssMaster = SpreadsheetApp.openById(MASTER_SS_ID);
  var dataUser = ssMaster.getSheetByName("User_Admin").getDataRange().getValues();
  var idSekolahDitemukan = "";
  for (var i = 1; i < dataUser.length; i++) {
    if (dataUser[i][0].toString().trim().toLowerCase() === usernameSiswa.toString().trim().toLowerCase()) { idSekolahDitemukan = dataUser[i][4].toString().trim(); break; }
  }
  if (!idSekolahDitemukan) return "";
  var dataMitra = ssMaster.getSheetByName("Sekolah_Mitra").getDataRange().getValues();
  for (var j = 1; j < dataMitra.length; j++) { if (dataMitra[j][0].toString().trim().toLowerCase() === idSekolahDitemukan.toLowerCase()) return dataMitra[j][1].toString().trim(); }
  return "";
}

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
  } catch (error) { return []; }
}
/**
 * SUPERADMIN ACTIONS: Membuat database cabang baru dan folder arsip berkas otomatis
 */
function tambahSekolahMitra(namaSekolah, npsn) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); // Kunci akses cloud selama 30 detik demi keamanan data ganda
  } catch (e) {
    return { status: "error", message: "Server sibuk memproses pendaftaran instansi baru. Coba lagi." };
  }

  try {
    if (!namaSekolah || !npsn) {
      throw new Error("Nama Sekolah dan NPSN wajib diisi!");
    }

    var namaSekolahBersih = namaSekolah.toString().trim().toUpperCase(); // Paksa Kapital Murni
    var npsnBersih = npsn.toString().trim();

    var masterSs = SpreadsheetApp.openById(MASTER_SS_ID);
    var sheetSekolah = masterSs.getSheetByName("Sekolah_Mitra");
    var sheetUser = masterSs.getSheetByName("User_Admin");
    
    if (!sheetSekolah || !sheetUser) {
      throw new Error("Struktur sheet 'Sekolah_Mitra' atau 'User_Admin' tidak ditemukan di Master!");
    }

    // Cek duplikasi NPSN agar tidak ada sekolah kembar
    var dataSekolah = sheetSekolah.getDataRange().getValues();
    for (var s = 1; s < dataSekolah.length; s++) {
      if (dataSekolah[s][2].toString().trim() === npsnBersih) {
        throw new Error("Gagal: Sekolah dengan NPSN [" + npsnBersih + "] sudah terdaftar sebelumnya.");
      }
    }
    
    // Generate ID Sekolah & Password Otomatis
    var idSekolah = "SCH-" + Utilities.getUuid().substring(0,5).toUpperCase();
    var karakterSandi = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    var passwordOtomatis = "";
    for (var i = 0; i < 8; i++) {
      passwordOtomatis += karakterSandi.charAt(Math.floor(Math.random() * karakterSandi.length));
    }
    
    // Buka Folder Utama Induk PPDB
    var folderUtamaInduk = DriveApp.getFolderById(FOLDER_PENDAFTAR_ID);
    
    // 1. BUAT / PANGGIL FOLDER DENGAN FORMAT CAPITAL MURNI (Sinkron dengan Fungsi Upload Berkas)
    var subFolderSekolah;
    var cekFolder = folderUtamaInduk.getFoldersByName(namaSekolahBersih);
    
    if (cekFolder.hasNext()) {
      subFolderSekolah = cekFolder.next();
    } else {
      subFolderSekolah = folderUtamaInduk.createFolder(namaSekolahBersih);
      // Set sharing akses agar link berkas di dalamnya aman dibaca oleh browser
      subFolderSekolah.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }
    
    // 2. COPY SPREADSHEET TEMPLATE KE DALAM FOLDER SEKOLAH TERSEBUT (Agar Google Drive Sangat Rapi)
    var templateFile = DriveApp.getFileById(TEMPLATE_SEKOLAH_SS_ID);
    var newSsFile = templateFile.makeCopy("Database SPMB - " + namaSekolahBersih, subFolderSekolah);
    
    // 3. MASUKKAN DATA KE SHEET SEKOLAH MITRA & USER ADMIN
    // Kolom: ID_Sekolah, Nama_Sekolah, NPSN, ID_Spreadsheet, ID_Folder, Status, Password
    sheetSekolah.appendRow([
      idSekolah, 
      namaSekolahBersih, 
      "'" + npsnBersih, // Paksa format string teks agar angka 0 di depan NPSN tidak hilang
      newSsFile.getId(), 
      subFolderSekolah.getId(), 
      "Aktif", 
      passwordOtomatis
    ]);
    
    // Kolom Akun Login Operator Sekolah: Username, Password, Role, Nama, ID_Sekolah
    sheetUser.appendRow([
      idSekolah, 
      passwordOtomatis, 
      "admin_sekolah", 
      " " + namaSekolahBersih, 
      idSekolah
    ]);
    
    SpreadsheetApp.flush();
    return { 
      status: "success", 
      message: "Lembaga baru [" + namaSekolahBersih + "] & Akun operator berhasil dikonfigurasi.",
      data: { id: idSekolah, pass: passwordOtomatis }
    };

  } catch (error) {
    return { status: "error", message: error.toString() };
  } finally {
    lock.releaseLock();
  }
}
/**
 * SUPERADMIN ACTIONS: Memutuskan hubungan interkoneksi database cabang dari master rekap
 */
function hapusSekolahMitra(idSekolah) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); // Kunci cloud 30 detik agar proses penghapusan massal tidak bentrok
  } catch (e) {
    return { status: "error", message: "Server sibuk, proses penghapusan aman ditunda. Coba lagi." };
  }

  try {
    if (!idSekolah || idSekolah.toString().trim() === "") {
      throw new Error("Parameter ID Sekolah wajib disertakan!");
    }

    var idSekolahTarget = idSekolah.toString().trim();
    var masterSs = SpreadsheetApp.openById(MASTER_SS_ID);
    var sheetSekolah = masterSs.getSheetByName("Sekolah_Mitra");
    var sheetUser = masterSs.getSheetByName("User_Admin");
    
    if (!sheetSekolah || !sheetUser) {
      throw new Error("Struktur sheet 'Sekolah_Mitra' atau 'User_Admin' tidak ditemukan.");
    }

    var fileSsCabangId = "";
    var folderSekolahId = "";

    // =====================================================================
    // TAHAP 1: AMBIL ID SPREADSHEET & FOLDER SEBELUM BARISNYA DIHAPUS
    // =====================================================================
    var dataSekolah = sheetSekolah.getDataRange().getValues();
    var barisSekolahDitemukan = -1;

    for (var i = 1; i < dataSekolah.length; i++) {
      if (dataSekolah[i][0].toString().trim() === idSekolahTarget) {
        fileSsCabangId = dataSekolah[i][3] ? dataSekolah[i][3].toString().trim() : ""; // ID Spreadsheet Cabang
        folderSekolahId = dataSekolah[i][4] ? dataSekolah[i][4].toString().trim() : ""; // ID Folder Berkas Sekolah
        barisSekolahDitemukan = i + 1;
        break;
      }
    }

    if (barisSekolahDitemukan === -1) {
      throw new Error("Gagal: ID Sekolah [" + idSekolahTarget + "] tidak ditemukan di database pusat.");
    }

    // =====================================================================
    // TAHAP 2: PEMBERSIHAN BERKAS & ASSET DIGITAL DI GOOGLE DRIVE (DEEP CLEAN)
    // =====================================================================
    // Hapus File Spreadsheet Database Cabang
    if (fileSsCabangId && fileSsCabangId !== "") {
      try {
        var fileSs = DriveApp.getFileById(fileSsCabangId);
        fileSs.setTrashed(true); // Pindahkan ke Sampah (Trashed) demi keamanan recovery
        console.log("✓ File Spreadsheet Cabang dipindahkan ke trash.");
      } catch (errDrive) {
        console.warn("Log: File Spreadsheet Cabang mungkin sudah tidak ada. " + errDrive.toString());
      }
    }

    // Hapus Folder Sekolah beserta Seluruh Berkas Dokumen Siswa di dalamnya
    if (folderSekolahId && folderSekolahId !== "") {
      try {
        var folderTarget = DriveApp.getFolderById(folderSekolahId);
        folderTarget.setTrashed(true); // Hapus total foldernya beserta isi-isinya ke trash
        console.log("✓ Folder sekolah beserta seluruh berkas dokumen di dalamnya sukses dibersihkan.");
      } catch (errFolder) {
        console.warn("Log: Folder sekolah mungkin sudah dihapus manual sebelumnya. " + errFolder.toString());
      }
    }

    // =====================================================================
    // TAHAP 3: HAPUS SEMUA AKUN USER TERKAIT (OPERATOR & SELURUH SISWA)
    // =====================================================================
    // Lakukan loop terbalik (dari bawah ke atas) wajib saat menghapus banyak baris
    var dataUser = sheetUser.getDataRange().getValues();
    var totalUserDihapus = 0;

    for (var j = dataUser.length - 1; j >= 1; j--) {
      var username = dataUser[j][0].toString().trim();
      var idSekolahDiUser = dataUser[j][4] ? dataUser[j][4].toString().trim() : "";

      // Hapus jika baris tersebut adalah Akun Operator (Username = idSekolah)
      // ATAU jika akun tersebut adalah milik siswa sekolah tersebut (Kolom ID_Sekolah = idSekolah)
      if (username === idSekolahTarget || idSekolahDiUser === idSekolahTarget) {
        sheetUser.deleteRow(j + 1);
        totalUserDihapus++;
      }
    }

    // =====================================================================
    // TAHAP 4: HAPUS BARIS INSTANSI DI DATA UTAMA SEKOLAH MITRA
    // =====================================================================
    sheetSekolah.deleteRow(barisSekolahDitemukan);

    // Paksa push update instant ke ekosistem cloud Google
    SpreadsheetApp.flush();
    
    return { 
      status: "success", 
      message: "✓ Sukses Total! Hubungan instansi diputus, folder berkas dibersihkan, dan " + totalUserDihapus + " akun user terkait berhasil dihapus dari server." 
    };

  } catch (error) {
    return { status: "error", message: "Gagal eksekusi hapus sekolah: " + error.toString() };
  } finally {
    lock.releaseLock();
  }
}

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

function muatPengaturanSekolah(idSekolah) {
  try {
    if (!idSekolah) return { status: "error", message: "ID Sekolah tidak valid atau kosong." };

    // 1. Cari ID Spreadsheet Cabang dari Master
    var masterSs = SpreadsheetApp.openById(MASTER_SS_ID);
    var sheetMitra = masterSs.getSheetByName("Sekolah_Mitra");
    var dataMitra = sheetMitra.getDataRange().getValues();
    var idSsCabang = "";

    for (var i = 1; i < dataMitra.length; i++) {
      if (dataMitra[i][0] && dataMitra[i][0].toString().trim() === idSekolah.toString().trim()) {
        idSsCabang = dataMitra[i][3] ? dataMitra[i][3].toString().trim() : "";
        break;
      }
    }

    if (!idSsCabang || idSsCabang === "" || idSsCabang === "-") {
      return { status: "error", message: "Spreadsheet cabang tidak terhubung di konfigurasi pusat." };
    }

    // 2. Buka Sheet Pengaturan Cabang
    var ssCabang = SpreadsheetApp.openById(idSsCabang);
    var sheetPengaturan = ssCabang.getSheetByName("Pengaturan");
    if (!sheetPengaturan) {
      return { status: "error", message: "Sheet 'Pengaturan' belum dibuat di database cabang." };
    }

    var dataMurni = sheetPengaturan.getDataRange().getValues();
    
    // Wadah Multi-Format
    var objekPengaturan = {}; // Format Objek (Untuk Dashboard Siswa)
    var arrayPengaturan = []; // Format Array Baris (Untuk Tabel Dashboard Admin)

    for (var j = 0; j < dataMurni.length; j++) {
      var key = dataMurni[j][0] ? dataMurni[j][0].toString().trim() : "";
      var value = dataMurni[j][1] ? dataMurni[j][1].toString().trim() : "";
      
      if (key !== "") {
        // Isi format objek {}
        objekPengaturan[key] = value;
        
        // Isi format array []
        arrayPengaturan.push({
          nama_pengaturan: key,
          nilai_pengaturan: value,
          baris: j + 1
        });
      }
    }

    // 🌟 KUNCI AMAN: Kembalikan kedua format sekaligus agar dibaca sukses oleh Admin maupun Siswa
    return { 
      status: "success", 
      data: objekPengaturan,     // Dibaca oleh Dashboard Siswa
      arrData: arrayPengaturan,  // Dibaca oleh Dashboard Admin Sekolah (Looping Tabel)
      success: true              // Jaga-jaga jika engine admin lama mendeteksi res.success
    };

  } catch (error) {
    console.error("Error Muat Pengaturan Multi-Format:", error.toString());
    return { status: "error", message: "Gagal memuat data server: " + error.toString() };
  }
}

function hitungKuotaSekolahDinamis(idSekolah) {
  try {
    if (!idSekolah) return { status: "error", message: "ID Sekolah kosong." };

    // 1. Cari ID Spreadsheet Cabang dari Master
    var masterSs = SpreadsheetApp.openById(MASTER_SS_ID);
    var sheetMitra = masterSs.getSheetByName("Sekolah_Mitra");
    var dataMitra = sheetMitra.getDataRange().getValues();
    var idSsCabang = "";

    for (var i = 1; i < dataMitra.length; i++) {
      if (dataMitra[i][0] && dataMitra[i][0].toString().trim() === idSekolah.toString().trim()) {
        idSsCabang = dataMitra[i][3] ? dataMitra[i][3].toString().trim() : "";
        break;
      }
    }

    if (!idSsCabang) return { status: "error", message: "Spreadsheet cabang tidak ditemukan." };

    // 2. Buka Spreadsheet Cabang
    var ssCabang = SpreadsheetApp.openById(idSsCabang);
    var sheetPengaturan = ssCabang.getSheetByName("Pengaturan");
    var sheetPendaftar = ssCabang.getSheetByName("Pendaftar");

    if (!sheetPengaturan || !sheetPendaftar) {
      return { status: "error", message: "Struktur sheet cabang tidak lengkap." };
    }

    // 🌟 TAHAP A: AMBIL TARGET KUOTA DARI SHEET PENGATURAN
    var dataPengaturan = sheetPengaturan.getDataRange().getValues();
    var targetKuota = 100; // Angka cadangan (fallback) jika di sheet kosong
    
    for (var j = 0; j < dataPengaturan.length; j++) {
      var parameter = dataPengaturan[j][0] ? dataPengaturan[j][0].toString().trim().toLowerCase() : "";
      if (parameter === "target_kuota") {
        var nilaiKuota = parseInt(dataPengaturan[j][1]);
        if (!isNaN(nilaiKuota)) {
          targetKuota = nilaiKuota; // 🟢 BERHASIL MENGAMBIL KUOTA DARI SETTING (Misal: 120)
        }
        break;
      }
    }

    // 🌟 TAHAP B: HITUNG JUMLAH SISWA YANG SUDAH DAFTAR
    // getLastRow() dikurangi 1 (untuk membuang baris judul/header)
    var totalPendaftarSaatIni = sheetPendaftar.getLastRow() - 1;
    if (totalPendaftarSaatIni < 0) totalPendaftarSaatIni = 0;

    // 🌟 TAHAP C: HITUNG SISA KUOTA REAL
    var sisaKuotaReal = targetKuota - totalPendaftarSaatIni;
    if (sisaKuotaReal < 0) sisaKuotaReal = 0; // Biar gak minus kalau meludak

    return {
      status: "success",
      target_kuota: targetKuota,
      total_pendaftar: totalPendaftarSaatIni,
      sisa_kuota: sisaKuotaReal
    };

  } catch (error) {
    console.error("Error Hitung Kuota:", error.toString());
    return { status: "error", message: error.toString() };
  }
}

function siapkanPratinjauLaporan() {
  console.log("Menyiapkan komponen cetak laporan...");
  
  // Ambil data hidup dari input dashboard admin yang sudah sinkron
  var elInpHeader = document.getElementById('inpHeaderLaporan');
  var elInpTahun = document.getElementById('inpTahunPelajaran');
  
  var teksHeaderReal = (elInpHeader && elInpHeader.value) ? elInpHeader.value.trim() : "LAPORAN PENDAFTARAN SISWA BARU";
  var teksTahunReal = (elInpTahun && elInpTahun.value) ? elInpTahun.value.trim() : "2026/2027";

  // 🟢 Tembak langsung ke ID fisik modal pratinjau
  var elDisplayHeader = document.getElementById('lblHeaderLaporanCetak');
  if (elDisplayHeader) elDisplayHeader.innerText = teksHeaderReal.toUpperCase();

  var elDisplayTahun = document.getElementById('lblTahunCetak');
  if (elDisplayTahun) elDisplayTahun.innerText = teksTahunReal;

  // Render baris data pendaftar ke dalam modal pratinjau
  var dataLaporan = (typeof cachePendaftarSekolahMitra !== 'undefined') ? cachePendaftarSekolahMitra : [];
  var tbodyCetak = document.getElementById('tabelSiswaCetak');
  
  if (!tbodyCetak) return;

  if (dataLaporan.length === 0) {
    tbodyCetak.innerHTML = "<tr><td colspan='5' class='text-center py-4 text-muted'>Tidak ada data siswa untuk dicetak.</td></tr>";
    return;
  }
  
  var htmlBaris = "";
  for (var i = 0; i < dataLaporan.length; i++) {
    var p = dataLaporan[i];
    var badgePrintStyle = p.status.toLowerCase() === "diterima" ? "border-success text-success" : (p.status.toLowerCase() === "ditolak" ? "border-danger text-danger" : "border-warning text-dark");
    
    htmlBaris += "<tr>" +
        "<td class='text-center fw-bold'>" + (i + 1) + "</td>" +
        "<td class='text-center font-monospace fw-bold'>" + (p.id_pendaftar || "-") + "</td>" +
        "<td class='fw-bold'>" + (p.nama || "-") + "</td>" +
        "<td>" + (p.asal_sekolah || "-") + "</td>" +
        "<td class='text-center'><span class='badge border px-2 py-1 rounded text-xs " + badgePrintStyle + "'>" + p.status + "</span></td>" +
      "</tr>";
  }
  tbodyCetak.innerHTML = htmlBaris;
}

function adminTambahSiswaLangsungServer(idSekolah, masterSsIdFix, payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); // Tunggu antrean cloud maks 30 detik
  } catch (e) {
    return { status: "error", message: "Server sangat sibuk memproses antrean data. Silakan coba lagi." };
  }

  try {
    if (!idSekolah || !masterSsIdFix || !payload.nisn || !payload.nama) {
      throw new Error("Parameter input pendaftar kurang lengkap atau ID Master kosong.");
    }

    var nisnBersih = payload.nisn.toString().trim();
    if (nisnBersih.length !== 10) {
      throw new Error("Ditolak Server: Format NISN tidak valid, panjang karakter harus tepat 10 digit angka.");
    }
    
    var idSekolahBersih = idSekolah.toString().trim();

    // =====================================================================
    // BAGIAN A: PAKSA BUKA SPREADSHEET MASTER PUSAT MENGGUNAKAN ID DARI FRONTEND
    // =====================================================================
    var ssMaster = SpreadsheetApp.openById(masterSsIdFix.toString().trim());
    var sheetUserAdmin = ssMaster.getSheetByName("User_Admin");
    
    if (!sheetUserAdmin) {
      throw new Error("Gagal Sistem: Sheet 'User_Admin' tidak ditemukan di Spreadsheet Master Pusat.");
    }

    // Cek duplikasi NISN di Master User
    var dataUser = sheetUserAdmin.getDataRange().getValues();
    for (var u = 1; u < dataUser.length; u++) {
      if (dataUser[u][0].toString().trim() === nisnBersih) {
        throw new Error("Gagal: Siswa dengan NISN [" + nisnBersih + "] sudah terdaftar di dalam sistem login pendaftaran.");
      }
    }

    // Tulis ke Master User
    var barisUserBaru = [
      "'" + nisnBersih,                      // Username (Paksa Teks)
      payload.password || "123456",          // Password default
      "siswa",                               // Role siswa
      payload.nama.toUpperCase(),            // Nama Kapital
      idSekolahBersih,                       // ID Sekolah
      Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss")
    ];
    sheetUserAdmin.appendRow(barisUserBaru);

    // =====================================================================
    // BAGIAN B: MASUKKAN DATA LENGKAP KE SPREADSHEET CABANG (Tetap sama)
    // =====================================================================
    var ssIdCabang = ambilSsIdSekolah(idSekolahBersih);
    if (!ssIdCabang) {
      throw new Error("Gagal melacak ID Spreadsheet Cabang untuk Sekolah: " + idSekolahBersih);
    }

    var ssCabang = SpreadsheetApp.openById(ssIdCabang);
    var sheetSiswa = ssCabang.getSheets()[0]; 
    var dataSiswa = sheetSiswa.getDataRange().getValues();
    var headerSiswa = dataSiswa[0];

    var kol = {};
    for (var c = 0; c < headerSiswa.length; c++) {
      kol[headerSiswa[c].toString().toLowerCase().replace(/\s+/g, '_').trim()] = c;
    }

    var unikId = "REG-" + idSekolahBersih.substring(0,3).toUpperCase() + "-" + Math.floor(1000 + Math.random() * 9000);
    var rowDataCabang = new Array(headerSiswa.length).fill("");

    if (kol["id_pendaftar"] !== undefined) rowDataCabang[kol["id_pendaftar"]] = unikId;
    if (kol["nama"] !== undefined) rowDataCabang[kol["nama"]] = payload.nama.toUpperCase();
    if (kol["nisn"] !== undefined) rowDataCabang[kol["nisn"]] = "'" + nisnBersih;
    if (kol["kontak"] !== undefined) rowDataCabang[kol["kontak"]] = payload.kontak || "-";
    if (kol["password"] !== undefined) rowDataCabang[kol["password"]] = payload.password || "123456";
    if (kol["status"] !== undefined) rowDataCabang[kol["status"]] = "Pending";
    if (kol["alamat"] !== undefined) rowDataCabang[kol["alamat"]] = (payload.alamat || "-").toUpperCase();
    if (kol["asal_sekolah"] !== undefined) rowDataCabang[kol["asal_sekolah"]] = (payload.asal_sekolah || "-").toUpperCase();
    
    if (kol["link_kk"] !== undefined) rowDataCabang[kol["link_kk"]] = "-";
    if (kol["link_akta"] !== undefined) rowDataCabang[kol["link_akta"]] = "-";
    if (kol["link_skl"] !== undefined) rowDataCabang[kol["link_skl"]] = "-";
    if (kol["link_foto"] !== undefined) rowDataCabang[kol["link_foto"]] = "-";
    if (kol["link_kip"] !== undefined) rowDataCabang[kol["link_kip"]] = "-";
    if (kol["alasan_ditolak"] !== undefined) rowDataCabang[kol["alasan_ditolak"]] = "-";
    
    if (kol["nik_siswa"] !== undefined) rowDataCabang[kol["nik_siswa"]] = payload.nik_siswa || "-";
    if (kol["tempat_lahir"] !== undefined) rowDataCabang[kol["tempat_lahir"]] = (payload.tempat_lahir || "-").toUpperCase();
    if (kol["tanggal_lahir"] !== undefined) rowDataCabang[kol["tanggal_lahir"]] = payload.tanggal_lahir || "";
    if (kol["jenis_kelamin"] !== undefined) rowDataCabang[kol["jenis_kelamin"]] = payload.jenis_kelamin || "-";
    if (kol["nama_ayah"] !== undefined) rowDataCabang[kol["nama_ayah"]] = (payload.nama_ayah || "-").toUpperCase();
    if (kol["nik_ayah"] !== undefined) rowDataCabang[kol["nik_ayah"]] = payload.nik_ayah || "-";
    if (kol["nama_ibu"] !== undefined) rowDataCabang[kol["nama_ibu"]] = (payload.nama_ibu || "-").toUpperCase();
    if (kol["nik_ibu"] !== undefined) rowDataCabang[kol["nik_ibu"]] = payload.nik_ibu || "-";
    if (kol["jumlah_saudara"] !== undefined) rowDataCabang[kol["jumlah_saudara"]] = Number(payload.jumlah_saudara || 0);
    if (kol["anak_ke"] !== undefined) rowDataCabang[kol["anak_ke"]] = Number(payload.anak_ke || 1);
    if (kol["jenis_pendaftaran"] !== undefined) rowDataCabang[kol["jenis_pendaftaran"]] = payload.jenis_pendaftaran || "-";
    if (kol["kelas_dimasuki"] !== undefined) rowDataCabang[kol["kelas_dimasuki"]] = (payload.kelas_dimasuki || "-").toUpperCase();
    if (kol["id_sekolah"] !== undefined) rowDataCabang[kol["id_sekolah"]] = idSekolahBersih;

    sheetSiswa.appendRow(rowDataCabang);
    SpreadsheetApp.flush();

    return { 
      status: "success", 
      message: "Berhasil! Data lengkap siswa berhasil didaftarkan langsung.",
      id_pendaftar: unikId
    };

  } catch (err) {
    return { status: "error", message: "Gagal eksekusi tambah siswa admin: " + err.toString() };
  } finally {
    lock.releaseLock();
  }
}
