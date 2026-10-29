export interface MitraIndustri {
  id: string;
  nama: string;
  kategori: 'Rumah Sakit' | 'Apotek & Farmasi' | 'Hotel & Hospitalitas' | 'Kecantikan & Estetika' | 'Puskesmas / Klinik' | 'Instansi Kesehatan';
  bidangKerjasama: string;
  alamat?: string;
  kontak?: string;
  logoUrl?: string;
}

export interface TracerLulusan {
  persenBekerja: number;
  persenKuliah: number;
  persenWirausaha: number;
  totalAlumni: number;
  mitraPenyerapUtama: string;
  keterangan: string;
}

export interface GaleriItem {
  id: string;
  judul: string;
  kategori: 'Praktik Kejuruan' | 'Fasilitas & Lab' | 'Kegiatan Siswa' | 'Ekstrakurikuler' | 'LSP & Ujian' | string;
  mediaType: 'foto' | 'video';
  url: string;
  deskripsi?: string;
  tanggal?: string;
}

export interface JadwalPelajaran {
  id: string;
  hari: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu';
  jamMulai: string;
  jamSelesai: string;
  idKelas: string;
  namaKelas: string;
  idMapel: string;
  namaMapel: string;
  idGuru: string;
  namaGuru: string;
  ruang: string;
  tahunAjaran?: string;
  semester?: string;
  jumlahJam?: number; // Jumlah Jam Pelajaran (JP), misal: 2 JP, 3 JP, 4 JP
  jamKe?: string; // misal: "1 - 2"
}

export type JenisJadwalUjian =
  | 'Ujian Tulis ASTS'
  | 'Ujian Tulis ASAS'
  | 'Ujian Tulis ASAT'
  | 'UAS CAT'
  | 'UTS CAT'
  | 'Tryout UKK'
  | 'UKK LSP Kejuruan'
  | 'Ujian Akhir Semester'
  | 'Ujian Tengah Semester'
  | 'Ujian Sekolah'
  | 'Uji Kompetensi Kejuruan (UKK/LSP)'
  | string;

export interface JadwalUjianItem {
  id: string;
  namaUjian: string;
  jenisUjian: JenisJadwalUjian;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  sesi: string;
  idKelas: string;
  namaKelas: string;
  idMapel: string;
  namaMapel: string;
  ruang: string;
  pengawas: string;
  proktor?: string;
  token: string;
}

export type JadwalUjian = JadwalUjianItem;

export interface Siswa {
  id: string;
  nisn: string;
  nama: string;
  kelas: string;
  jurusan: string;
  jenisKelamin: 'Laki-laki' | 'Perempuan';
  nomorAbsen?: number;
}

export interface GelombangPendaftaran {
  id: string;
  nomor: number;
  nama: string;
  tanggalMulai: string; // Format YYYY-MM-DD
  tanggalSelesai: string; // Format YYYY-MM-DD
  tahun: string; // Format YYYY
  status: 'Buka' | 'Segera Dibuka' | 'Tutup';
  biayaPendaftaran?: number;
  diskonDSP?: string;
  keterangan?: string;
}

export interface RekeningBank {
  id: string;
  namaBank: string; // e.g. "Bank BJB"
  nomorRekening: string; // e.g. "0061324992100"
  atasNama: string; // e.g. "SMK BAKTI PUTRA MANDIRI"
  cabang?: string;
  isUtama?: boolean;
  keterangan?: string;
}

export interface SchoolInfo {
  nama: string;
  namaSekolah?: string;
  namaLengkap: string;
  singkatan: string;
  alamat: string;
  alamatLengkap: string;
  rtRw?: string;
  desa?: string;
  kecamatan?: string;
  kabupaten?: string;
  kodePos?: string;
  telepon: string;
  email: string;
  website: string;
  akreditasi: string;
  skAkreditasi?: string;
  npsn: string;
  skIzinOperasional?: string;
  logoUrl: string;
  logoSekolah?: string;
  logoKiriUrl?: string;
  logoKananUrl?: string;
  kepalaSekolah: string;
  nipKepalaSekolah: string;
  tahunAjaranPembelajaran: string;
  semesterPembelajaran: 'Ganjil' | 'Genap';
  tahunAjaranSPMB: string;
  gelombangSPMB: string;
  statusSPMB: 'Buka' | 'Tutup' | 'Segera Dibuka';
  statusPnsKepsek?: 'PNS' | 'PPPK' | 'Non-PNS' | string;
  isPnsKepsek?: boolean;
  idGuruKepalaSekolah?: string;
  gelombangList?: GelombangPendaftaran[];
  rekeningBankList?: RekeningBank[];
  ppdbInstruksiPembayaran?: string;
  kuotaSPMB: number;
  kuotaJurusan?: {
    farmasi: number;
    keperawatan: number;
    kecantikan: number;
    perhotelan: number;
    kesehatan?: number;
    [key: string]: number | undefined;
  };
  rombelJurusan?: {
    farmasi: number;
    keperawatan: number;
    kecantikan: number;
    perhotelan: number;
    kesehatan?: number;
    [key: string]: number | undefined;
  };
  kuotaPerJurusan?: {
    farmasi: number;
    asistenKeperawatan: number;
    tataKecantikan: number;
    perhotelan: number;
    kesehatan?: number;
  };
  slogan?: string;
  subSlogan?: string;
  kopSekolah?: {
    yayasan: string;
    instansi: string;
    subJudul: string;
    teleponEmail: string;
    garisGanda: boolean;
    fontFamily?: string;
    fontSizeYayasan?: number;
    fontSizeInstansi?: number;
    fontSizeSubJudul?: number;
    fontSizeTeleponEmail?: number;
    logoSize?: number;
    logoKananSize?: number;
    logoKananUrl?: string;
    tampilkanLogoKanan?: boolean;
    lineThickness?: 'tipis' | 'sedang' | 'tebal';
  };
  sosmed?: {
    instagram?: string;
    facebook?: string;
    youtube?: string;
    tiktok?: string;
    whatsapp?: string;
  };
  tracerLulusan?: TracerLulusan;
  lokasiSekolah?: {
    latitude: number;
    longitude: number;
    radiusMeters: number;
    namaTempat?: string;
    mapsUrl?: string;
  };
  mitraIndustri?: MitraIndustri[];
  galeri?: GaleriItem[];
  kejuruanList?: KejuruanDetail[];
  raporConfig?: {
    tempatTitimangsa: string;
    tanggalTitimangsa: string;
    catatanWalasTemplate?: string;
    kodeAksesRaport?: string;
  };
}

export interface LingkupMateriMapel {
  mapelId: string;
  lm1Judul: string;
  lm2Judul: string;
  lm3Judul: string;
  lm4Judul: string;
}

export interface KejuruanDetail {
  id: string;
  kode: string;
  nama: string;
  singkatan: string;
  deskripsi: string;
  visi?: string;
  kuotaRombel: number;
  kuotaSiswa: number;
  fasilitasLab: string;
  prospekKerja: string;
  slug?: string;
  status?: 'aktif' | 'nonaktif';
  aktif?: boolean;
  alasanNonaktif?: string;
}

export type UserRole = 'admin' | 'guru' | 'walas' | 'pembina_ekskul' | 'kesiswaan' | 'siswa' | 'calon_siswa' | 'staf' | 'kepala_sekolah' | 'operator' | 'bendahara';

export interface User {
  id: string;
  username: string;
  nama: string;
  role: UserRole;
  nipOrNis: string;
  idGuru?: string;
  // Status Kepegawaian & NIP Resmi (Khusus PNS / PPPK)
  statusKepegawaian?: 'PNS' | 'PPPK' | 'GTY' | 'GTT' | 'Honorer' | string;
  isPns?: boolean;
  nip?: string;
  tahunMasuk?: number | string;
  jabatan?: string;
  nipd?: string;
  nisn?: string;
  tempatLahir?: string;
  tanggalLahir?: string;
  tempatTanggalLahir?: string;
  password?: string;
  idKelas?: string;
  namaKelas?: string;
  kelas?: string;
  mapelDiampu?: string[];
  mapel?: string;
  mataPelajaran?: string;
  jurusan?: string;
  telepon?: string;
  email?: string;
  statusAktif?: boolean;
  jenisKelamin?: 'Laki-laki' | 'Perempuan';
  jk?: 'L' | 'P';
  alamat?: string;
  gelar?: string;
  fotoProfilUrl?: string;
  // Jabatan Tambahan / Tugas Tambahan Guru
  jabatanTambahan?: string;
  jabatanTambahanList?: string[];
  isKesiswaan?: boolean;
  // Rangkap Jabatan Guru sebagai Wali Kelas (Single Account)
  isWalas?: boolean;
  walasKelasId?: string;
  walasNamaKelas?: string;
  walasKelasIds?: string[];
  walasNamaKelasList?: string[];
  kelasWali?: string;
  // Rangkap Guru sebagai Pembina Ekskul
  isPembinaEkskul?: boolean;
  ekskulDibina?: string[];
  // Rangkap Siswa sebagai Ketua / Pengurus Kelas
  jabatanKelas?: 'Ketua Kelas' | 'Wakil Ketua' | 'Sekretaris' | 'Bendahara' | 'Anggota' | string;
  isKetuaKelas?: boolean;
  // Ekskul yang diikuti siswa
  ekskulDiikuti?: string[];
  // Fitur Kenaikan Kelas & Kelulusan (Semester 2 / Akhir Tahun / PAT)
  statusKenaikan?: 'Naik Kelas' | 'Tinggal Kelas' | 'Lulus' | 'Tidak Lulus' | 'Ditangguhkan' | 'Belum Ditentukan';
  targetKelasBerikutnya?: string;
  targetNamaKelasBerikutnya?: string;
  catatanKenaikan?: string;
  statusAlumni?: boolean;
  tahunLulus?: string;
  updatedAt?: string;
  riwayatKelas?: {
    tahunAjaran: string;
    kelas: string;
    tingkat?: string;
    semester?: string;
    status: string;
    tanggal: string;
    catatan?: string;
  }[];
}

export interface KeputusanKenaikanSiswa {
  nipd: string;
  namaSiswa: string;
  kelasAsal: string;
  idKelasAsal: string;
  statusKenaikan: 'Naik Kelas' | 'Tinggal Kelas' | 'Lulus' | 'Tidak Lulus' | 'Ditangguhkan';
  targetKelasId?: string;
  targetNamaKelas?: string;
  rataRataNilai?: number;
  totalAlpa?: number;
  catatan: string;
  tanggalKeputusan: string;
}

export interface KenaikanKelasLog {
  id: string;
  tanggal: string;
  tahunAjaranSebelumnya: string;
  tahunAjaranBaru: string;
  semester: string;
  kelasAsal: string;
  jumlahSiswa: number;
  jumlahNaik: number;
  jumlahTinggal: number;
  jumlahLulus: number;
  operator: string;
  detail: {
    nipd: string;
    nama: string;
    status: string;
    keKelas: string;
  }[];
}

export interface Ekskul {
  id: string;
  nama: string;
  kategori: 'wajib' | 'pilihan';
  pembina?: string;
  idPembina?: string;
  hari?: string;
  jam?: string;
  keterangan?: string;
  anggota?: string[];
}

export interface PraktikKerjaIndustriItem {
  id?: string;
  nomor?: number;
  mitra: string; // Tempat / Lokasi Instansi (DU/DI)
  lamanya: string; // Lamanya waktu pelaksanaan
  keterangan: string; // Keterangan hasil / predikat
}

export interface NilaiEkskulSiswa {
  id: string;
  nipd: string;
  namaSiswa: string;
  kelas: string;
  idEkskul: string;
  namaEkskul: string;
  predikat: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Kurang';
  keterangan: string;
}

export interface AbsensiRecord {
  id: string;
  nipd: string; // Primary Key Identifikasi
  nisn?: string;
  userId?: string;
  namaSiswa: string;
  kelas: string;
  tanggal: string; // YYYY-MM-DD
  waktu: string; // HH:mm:ss
  status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Terlambat';
  metode: 'Barcode Scan' | 'QR Code Scan' | 'Manual' | 'QR Code Mandiri' | 'GPS Geofence Mandiri' | string;
  keterangan?: string;
  petugas?: string;
  lokasi?: string;
  fotoBukti?: string;
}

export interface AbsenMengajarRecord {
  id: string;
  idGuru: string;
  namaGuru: string;
  nipOrNis?: string;
  tanggal: string; // YYYY-MM-DD
  hari: string; // Senin, Selasa, Rabu, Kamis, Jumat, Sabtu
  jamMulai: string; // HH:mm
  jamSelesai: string; // HH:mm
  jamKe: string; // misal "1 - 2" atau "3 - 4"
  jumlahJam?: number; // Jumlah Jam Pelajaran (JP), misal 2, 3, 4
  idKelas: string;
  namaKelas: string;
  idMapel: string;
  namaMapel: string;
  materiPokok: string; // Pokok bahasan / materi pokok
  kegiatanKBM?: string; // Deskripsi kegiatan pembelajaran
  jumlahHadir?: number;
  jumlahSakit?: number;
  jumlahIzin?: number;
  jumlahAlpa?: number;
  catatanSiswa?: string; // Catatan siswa atau kendala
  statusKehadiran: 'Hadir Mengajar' | 'Izin (Tugas Terlampir)' | 'Sakit (Tugas Terlampir)' | 'Dinas Luar' | 'Alpa / Tidak Hadir';
  ruangKelas?: string;
  fotoDokumentasiUrl?: string; // Foto dokumentasi / bukti pembelajaran
  latitude?: number;
  longitude?: number;
  akurasiMeter?: number;
  createdAt: string; // ISO String
  recordedBy?: 'admin' | 'guru'; // Pencatat kehadiran
  idJadwal?: string; // Id referensi jadwal pelajaran jika ada
}

export interface NilaiMapelSiswa {
  id: string;
  nipd: string;
  nisn?: string;
  namaSiswa: string;
  kelas: string;
  mapelId: string;
  mapelNama: string;
  guruPengampu?: string;
  idGuru?: string;
  periode?: 'PTS' | 'PAS' | 'PAT';
  // Lingkup Materi (LM / TP)
  lm1?: number;
  lm2?: number;
  lm3?: number;
  lm4?: number;
  tugas1?: number;
  tugas2?: number;
  tugas3?: number;
  ulhar1?: number;
  ulhar2?: number;
  nilaiFormatif?: number; // Rata-rata Tugas & Ulhar / LM
  nilaiPts?: number; // PTS (Manual / Otomatis dari CBT)
  sumberPts?: 'manual' | 'otomatis_cbt';
  nilaiPas?: number; // PAS (Manual / Otomatis dari CBT)
  sumberPas?: 'manual' | 'otomatis_cbt';
  nilaiPat?: number; // PAT (Manual / Otomatis dari CBT)
  sumberPat?: 'manual' | 'otomatis_cbt';
  nilaiAkhir?: number; // Nilai Akhir (NA)
  predikat?: 'A' | 'B' | 'C' | 'D';
  ketercapaian?: 'Tuntas' | 'Belum Tuntas';
  // Kurikulum Merdeka Capaian Pembelajaran
  tpDeskripsi?: string;
  tp1Desc?: string;
  tp2Desc?: string;
  tp3Desc?: string;
  tp4Desc?: string;
  catatanGuru?: string;
  catatanWalas?: string;
  deskripsiTertinggi?: string;
  deskripsiPerluBimbingan?: string;
}

export interface RaportKurikulumMerdeka {
  id: string;
  nipd: string;
  nisn: string;
  namaSiswa: string;
  kelas: string;
  fase: 'E' | 'F';
  semester: 'Ganjil' | 'Genap';
  tahunAjaran: string;
  nilaiMapel: {
    mapelId: string;
    kodeMapel: string;
    namaMapel: string;
    guruPengampu: string;
    nilaiAkhir: number;
    capaianTertinggi: string;
    capaianPerluBimbingan: string;
  }[];
  kehadiran: {
    sakit: number;
    izin: number;
    alpa: number;
  };
  catatanWalas?: string;
  tanggalRapor?: string;
}

export interface Kelas {
  id: string;
  namaKelas: string;
  tingkat?: 'X' | 'XI' | 'XII';
  jurusan: 'Farmasi' | 'Asisten Keperawatan' | 'Kesehatan' | 'Tata Kecantikan & Spa' | 'Perhotelan' | string;
  idWalas: string;
  namaWalas: string;
  ruang?: string;
  kapasitas?: number;
  tahunAjaran?: string;
  status?: 'aktif' | 'nonaktif';
  aktif?: boolean;
  alasanNonaktif?: string;
}

export interface Mapel {
  id: string;
  kode: string;
  kodeMapel?: string;
  namaMapel: string;
  jurusan: string;
  kelompok?: 'Muatan Umum' | 'Muatan Kejuruan' | string;
  tingkat?: string;
  jamPerMinggu?: number;
  keterangan?: string;
  kkm?: number;
  guruPengampu?: string;
  idGuru?: string;
  status?: 'aktif' | 'nonaktif';
  aktif?: boolean;
}

export type MataPelajaran = Mapel;

export interface SoalPG {
  id: string;
  nomor: number;
  pertanyaan: string;
  opsi: {
    a: string;
    b: string;
    c: string;
    d: string;
    e: string;
  };
  kunci: 'A' | 'B' | 'C' | 'D' | 'E';
  pembahasan?: string;
  lingkupMateri?: string;
  bab?: string;
}

export interface SoalIsian {
  id: string;
  nomor: number;
  pertanyaan: string;
  kunci: string;
  kunciJawaban?: string;
  lingkupMateri?: string;
  bab?: string;
}

export type JenisUjian = 'UJIAN_AKHIR' | 'UJIAN_TENGAH_SEMESTER';
export type StatusDokumen = 'BELUM_BUAT' | 'DRAFT_PROSES' | 'READY';

export interface PaketUjian {
  id: string;
  namaUjian: string;
  judul?: string;
  jenisUjian: JenisUjian;
  jenis?: string;
  idGuru: string;
  namaGuru: string;
  idMapel: string;
  kodeMapel?: string;
  namaMapel: string;
  lingkupMateri?: string;
  bab?: string;
  targetKelas: string[];
  kelasTarget?: string[];
  hariTanggal: string;
  jamMulai: string;
  durasiMenit: number;
  token: string;
  tokenUjian?: string;
  statusDokumen: StatusDokumen;
  soalPG: SoalPG[];
  soalIsian: SoalIsian[];
  passingGrade: number;
  createdAt?: string;
}

export type Ujian = PaketUjian;

export interface HasilUjian {
  id: string;
  idUjian: string;
  nisn: string;
  namaSiswa: string;
  idKelas: string;
  namaKelas: string;
  idMapel?: string;
  namaMapel?: string;
  nilai?: number;
  skorAkhir?: number;
  jawabanPG: Record<string, string>; // soalId -> 'A'..'E'
  raguRagu: Record<string, boolean>;
  jawabanIsian: Record<string, string>; // soalId -> text
  nilaiPG: number;
  nilaiIsian: number;
  totalNilai: number;
  statusLulus: boolean;
  waktuSelesai: string;
}

export interface KontenWeb {
  id: string;
  judul: string;
  slug?: string;
  kategori: 'Berita' | 'Pengumuman' | 'Prestasi' | 'Fasilitas' | 'Galeri' | 'Kegiatan' | 'Informasi' | 'Artikel' | 'Kemitraan' | string;
  ringkasan: string;
  isiTulisan?: string;
  isi?: string;
  gambarUrl?: string;
  gambarGaleri?: string[];
  videoUrl?: string;
  tanggalPost?: string;
  tanggal?: string;
  penulis: string;
  isFeatured?: boolean;
}

export type JurusanPPDB = 'Farmasi' | 'Asisten Keperawatan' | 'Tata Kecantikan & Spa' | 'Perhotelan';
export type JurusanSPMB = JurusanPPDB;

export interface FormulirPPDB {
  id: string;
  userId: string;
  nomorRegistrasi?: string;
  pilihanJurusan: JurusanPPDB;
  statusPendaftaran: 'Proses_Isi' | 'Menunggu_Verifikasi' | 'Terverifikasi' | 'Diterima' | 'Ditolak';
  statusKonfirmasi?: 'Belum_Konfirmasi' | 'Diterima' | 'Ditolak';
  gelombang?: string;
  tanggalDaftar: string;
  catatanAdmin?: string;

  // Pas Foto Resmi Pendaftar
  pasFotoUrl?: string;

  // KELOMPOK A: IDENTITAS PESERTA DIDIK
  nisn: string;
  nikSiswa: string;
  noKk: string;
  noAktaKelahiran?: string;
  namaLengkap: string;
  namaPanggilan: string;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: 'Laki-laki' | 'Perempuan';
  tinggiBadan: number;
  beratBadan: number;
  wargaNegara: string;
  noHp: string;
  nomorHp?: string;
  email: string;
  emailSiswa?: string;
  medsosSiswa?: string; // Instagram / TikTok / Facebook dll.
  jumlahSaudara: number;
  anakKe: number;
  agama: 'Islam' | 'Katholik' | 'Protestan' | 'Budha' | 'Hindu' | 'Khonghucu' | 'Lainnya';
  agamaLainnya?: string;
  hobi: string;
  hobiLainnya?: string;
  citaCita: string;
  citaCitaLainnya?: string;
  prestasi: string;
  jarakSekolah: '0-1 Km' | '1-3 Km' | '3-5 Km' | '5-10 Km' | '> 10 Km';
  transportasi: 'Jalan Kaki' | 'Sepeda' | 'Motor' | 'Mobil Pribadi' | 'Antar Jemput Sekolah' | 'Angkutan Umum' | 'Lainnya';
  transportasiLainnya?: string;
  
  // Alamat & Domisili Siswa
  alamatLengkap: string;
  alamatKk?: string; // Alamat tempat tinggal berdasarkan Kartu Keluarga (KK)
  alamatDomisili?: string; // Alamat tempat tinggal domisili saat ini
  alamatSamaDenganKk?: boolean; // Jika alamat domisili dan KK sama persis
  rt: string;
  rw: string;
  noRumah: string;
  kodePos: string;
  desa: string;
  kecKab: string;
  penyakitBerat: string;
  alergi: string;
  namaOrganisasi: string;
  jabatanOrganisasi: string;
  tahunLulusSd: string;
  asalSekolahSD?: string; // Keterangan Asal Sekolah SD/MI/Sederajat
  tahunLulusSmp: string;
  asalSmp: string;
  asalSekolahSMP?: string; // Asal Sekolah SMP/MTs/Sederajat
  asalSekolah?: string;
  noSeriIjazah: string;
  noSeriIjazahSMP?: string; // Nomor Seri Ijazah SMP/MTs/Sederajat

  // KELOMPOK B: DATA ORANG TUA / WALI
  namaAyah: string;
  nikAyah: string;
  namaIbu: string;
  nikIbu: string;
  noTelpOrtu: string;
  alamatOrtu: string;
  pendidikanAyah: string;
  pendidikanAyahLainnya?: string;
  pendidikanIbu: string;
  pendidikanIbuLainnya?: string;
  pekerjaanAyah: string;
  pekerjaanAyahLainnya?: string;
  pekerjaanIbu: string;
  pekerjaanIbuLainnya?: string;
  pendapatanAyah: string;
  pendapatanIbu: string;

  // BIODATA WALI (Muncul bila orang tua meninggal atau memilih memiliki wali)
  punyaWali?: 'Ya' | 'Tidak';
  namaWali?: string;
  nikWali?: string;
  hubunganWali?: string;
  hubunganWaliLainnya?: string;
  pendidikanWali?: string;
  pendidikanWaliLainnya?: string;
  pekerjaanWali?: string;
  pekerjaanWaliLainnya?: string;
  pendapatanWali?: string;
  noTelpWali?: string;
  alamatWali?: string;

  // KELOMPOK C: BANTUAN SOSIAL & KESEJAHTERAAN (KIP / PKH / BPJS)
  memilikiKipPkhBpjs?: 'Ya' | 'Tidak';
  jenisBantuan?: string[];
  nomorKipPkhBpjs?: string;
  lampiranKipPkhBpjs?: string;
  namaFileKipPkhBpjs?: string;

  // Notifikasi Email Verifikasi & Waktu
  tanggalVerifikasi?: string;
  emailNotifikasiTerkirim?: boolean;
  emailNotifikasiWaktu?: string;

  // Konfirmasi Penerimaan Siswa Baru oleh Admin
  nomorIndukSiswaResmi?: string;
  kelasDiterima?: string;
  tanggalKonfirmasi?: string;
  dikonfirmasiOleh?: string;

  // Status & Metode Pembayaran Pendaftaran PPDB
  metodePembayaran?: 'Transfer' | 'Datang Langsung ke Sekolah' | string;
  statusPembayaran?: 'Belum Bayar' | 'Menunggu Verifikasi' | 'Lunas' | string;
  buktiPembayaranUrl?: string;
  bankTujuan?: string;
  tanggalBayar?: string;
  nominalBayar?: number;
  catatanPembayaran?: string;
}

export type FormulirSPMB = FormulirPPDB;
