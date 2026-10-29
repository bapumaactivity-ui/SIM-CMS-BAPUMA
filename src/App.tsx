import React, { useState, useMemo, useRef } from 'react';
import { 
  User, 
  UserRole,
  KontenWeb, 
  PaketUjian, 
  FormulirPPDB, 
  Kelas, 
  Mapel, 
  HasilUjian,
  SchoolInfo,
  JadwalPelajaran,
  JadwalUjianItem,
  AbsensiRecord,
  NilaiMapelSiswa,
  Ekskul,
  NilaiEkskulSiswa,
  AbsenMengajarRecord
} from './types';
import { 
  INITIAL_USERS, 
  INITIAL_GURU_USERS,
  INITIAL_KELAS, 
  INITIAL_MAPEL, 
  INITIAL_KONTEN_WEB, 
  INITIAL_UJIAN, 
  INITIAL_FORMULIR_PPDB, 
  INITIAL_HASIL_UJIAN,
  INITIAL_JADWAL_PELAJARAN,
  INITIAL_JADWAL_UJIAN,
  INITIAL_EKSKUL,
  INITIAL_ABSEN_MENGAJAR,
  SCHOOL_INFO,
  OFFICIAL_MAPEL_TEACHERS
} from './data/initialData';
import { INITIAL_ABSENSI_RECORDS, ensureSeptemberAttendance } from './data/mockAcademicData';
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from './utils/storage';
import { Navbar } from './components/Navbar';
import { WebProfilView } from './components/WebProfilView';
import { PPDBView } from './components/PPDBView';
import { CATSiswaView } from './components/CATSiswaView';
import { SiswaDashboardView } from './components/SiswaDashboardView';
import { GuruDashboardView } from './components/GuruDashboardView';
import { PortalGuruGatewayView } from './components/PortalGuruGatewayView';
import { WalasDashboardView } from './components/WalasDashboardView';
import { AdminDashboardView } from './components/AdminDashboardView';
import { AbsensiBarcodeView } from './components/AbsensiBarcodeView';
import { LoginView } from './components/LoginView';
import { PembaruanAppModal, CURRENT_APP_VERSION, shouldShowAppUpdateModal } from './components/PembaruanAppModal';
import { testConnection, logoutFirebase, db, ensureFirestoreNetworkEnabled } from './firebase';
import { 
  saveDocument, 
  removeDocument, 
  saveSchoolInfoToFirestore, 
  listenCollection,
  syncAllDataToCloud,
  pullAllDataFromCloud,
  saveBatchDocuments,
  removeItemFromCloudBackup,
  isQuotaExhausted,
  isQuotaError,
  markQuotaExhausted,
  clearQuotaExhausted
} from './utils/firebaseSync';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { GENERATED_STUDENT_USERS } from './data/studentsData';
import { getGreetingAndBirthday } from './utils/greetingHelper';
import { 
  isRecordForStudent, 
  getLocalDateString, 
  isHariSekolahEfektif, 
  sanitizeAndDeduplicateAbsensiRecords,
  sortKelasAlphabetical,
  deduplicateUserAccounts,
  normalizeTeacherName,
  normalizeMapelName,
  extractTeacherMapelList,
  isTeacherTeachingMapel,
  syncMapelsWithTeachers
} from './utils/academicHelpers';
import { normalizeExcelTime } from './utils/excelHelper';

export const PROTECTED_ACCOUNT_IDS = new Set<string>([
  'u-admin',
]);

export function sanitizeUserAccount(u: User): User {
  if (!u) return u;
  if (u.role === 'admin' && u.nama?.includes('BPM')) {
    u = { ...u, nama: u.nama.replace(/\s*BPM\s*/gi, ' ').trim() };
  }
  const cleanKelas = u.kelas ? u.kelas.replace(/^Kelas\s+/i, '').trim() : u.kelas;
  const cleanNamaKelas = u.namaKelas ? u.namaKelas.replace(/^Kelas\s+/i, '').trim() : u.namaKelas;

  // Clean unintended or redundant 'Guru Wali' / 'Wali Kelas' in jabatanTambahan
  let cleanJabatan: string | undefined = undefined;
  if (typeof u.jabatanTambahan === 'string') {
    cleanJabatan = u.jabatanTambahan.trim();
    if (cleanJabatan) {
      cleanJabatan = cleanJabatan
        .split(/[,/]+/)
        .map(s => s.trim())
        .filter(s => s && !s.toLowerCase().includes('guru wali') && !s.toLowerCase().includes('wali kelas'))
        .join(', ');
    }
  }

  // Convert old 'Bapuma-YYYYMMDDYYYYNN' to new format 'YYYYMasukYYYYMMDDNN' without Bapuma prefix
  let cleanIdGuru = u.idGuru;
  let cleanNipOrNis = u.nipOrNis;
  const isTeacher = u.role === 'guru' || u.role === 'walas' || u.role === 'pembina_ekskul' || u.role === 'kesiswaan' || u.role === 'staf' || u.role === 'kepala_sekolah' || u.role === 'operator' || u.role === 'bendahara';

  let cleanJurusan = u.jurusan;
  let cleanGelar = u.gelar;

  if (isTeacher) {
    if (cleanIdGuru && cleanIdGuru.startsWith('Bapuma-')) {
      const raw = cleanIdGuru.replace('Bapuma-', '');
      if (/^\d{14}$/.test(raw)) {
        const ymd = raw.slice(0, 8);
        const thn = raw.slice(8, 12);
        const num = raw.slice(12, 14);
        cleanIdGuru = `${thn}${ymd}${num}`;
      } else {
        cleanIdGuru = raw;
      }
    }
    if (cleanNipOrNis && cleanNipOrNis.startsWith('Bapuma-')) {
      const raw = cleanNipOrNis.replace('Bapuma-', '');
      if (/^\d{14}$/.test(raw)) {
        const ymd = raw.slice(0, 8);
        const thn = raw.slice(8, 12);
        const num = raw.slice(12, 14);
        cleanNipOrNis = `${thn}${ymd}${num}`;
      } else {
        cleanNipOrNis = raw;
      }
    }
  }

  // Extract and clean all subjects taught by this teacher (menjaga seluruh penugasan mapel dari berkas cadangan)
  const extractedMapel = extractTeacherMapelList(u);
  const cleanMapelDiampu = extractedMapel.length > 0 
    ? extractedMapel 
    : (Array.isArray(u.mapelDiampu) ? u.mapelDiampu : []);

  return {
    ...u,
    idGuru: cleanIdGuru,
    nipOrNis: cleanNipOrNis,
    gelar: cleanGelar,
    jurusan: cleanJurusan,
    mapelDiampu: cleanMapelDiampu,
    kelas: cleanKelas,
    namaKelas: cleanNamaKelas,
    jabatanTambahan: cleanJabatan !== undefined ? cleanJabatan : '',
    statusAktif: u.statusAktif !== false,
  };
}

export function sanitizeMapelItem(m: Mapel): Mapel {
  if (!m) return m;
  const mNorm = normalizeMapelName(m.namaMapel);

  // Jika guruPengampu sudah diatur dari Data Guru atau berkas cadangan, pertahankan 100%!
  const curGuru = (m.guruPengampu || '').trim();
  const hasValidGuru = curGuru && 
    curGuru !== '-' && 
    curGuru.toLowerCase() !== 'guru pengampu' && 
    curGuru.toLowerCase() !== 'belum ditentukan';

  if (!hasValidGuru) {
    // Hanya jika kosong / belum ditentukan, gunakan katalog resmi OFFICIAL_MAPEL_TEACHERS sebagai fallback
    const official = OFFICIAL_MAPEL_TEACHERS[m.id] || (m.kode && OFFICIAL_MAPEL_TEACHERS[m.kode]) || OFFICIAL_MAPEL_TEACHERS[mNorm];
    if (official && official.guruPengampu) {
      return {
        ...m,
        guruPengampu: official.guruPengampu,
        idGuru: official.idGuru,
      };
    }
  }

  return m;
}

export function sanitizeNilaiItem(n: NilaiMapelSiswa): NilaiMapelSiswa {
  if (!n) return n;
  return n;
}

export function sanitizeJadwalItem(j: JadwalPelajaran): JadwalPelajaran {
  if (!j) return j;
  const mNorm = normalizeMapelName(j.namaMapel || j.idMapel);
  const mId = (j.idMapel || '').trim().toLowerCase();
  const isInf = mNorm === 'informatika' || mId === 'm-x-inf' || (j.namaMapel || '').toLowerCase().includes('informatika');
  const isTIK = mNorm.includes('teknologiinformasi') || mNorm === 'tik' || mNorm.includes('simulasidankomunikasi') || mNorm === 'simdig' || mId === 'm-xi-tik' || mId === 'm-xii-tik' || mId === 'm-umum-simdig';

  let fixedNamaGuru = j.namaGuru;
  let fixedIdGuru = j.idGuru;

  // Hanya isi default jika j.namaGuru kosong atau placeholder agar penugasan guru di jadwal tidak tertimpa
  const isGuruEmpty = !fixedNamaGuru || 
    fixedNamaGuru.trim() === '' || 
    fixedNamaGuru === '-' || 
    fixedNamaGuru.toLowerCase() === 'guru pengampu' || 
    fixedNamaGuru.toLowerCase() === 'belum ditentukan';

  if (isGuruEmpty) {
    if (isInf) {
      fixedNamaGuru = 'Irawati, S.Kom';
      fixedIdGuru = 'u-guru-04';
    } else if (isTIK) {
      fixedNamaGuru = 'Moh Sumardi, S.Kom';
      fixedIdGuru = 'u-guru-10';
    }
  }

  return {
    ...j,
    namaGuru: fixedNamaGuru,
    idGuru: fixedIdGuru,
    jamMulai: normalizeExcelTime(j.jamMulai, '07:15'),
    jamSelesai: normalizeExcelTime(j.jamSelesai, '08:45'),
    jamKe: j.jamKe || `${j.jumlahJam || 2} JP`,
  };
}

export const normalizePeriode = (p?: string | null): string => {
  if (!p) return 'PAS';
  const up = p.toUpperCase().trim();
  if (up === 'SAS' || up === 'PAS' || up === 'PSAS' || up === 'ASAS') return 'PAS';
  if (up === 'ASTS' || up === 'PTS' || up === 'MID') return 'PTS';
  if (up === 'ASAT' || up === 'PAT' || up === 'UKK') return 'PAT';
  return up;
};

export const getGradeMergeKey = (n: NilaiMapelSiswa) => {
  const studentId = (n.nipd || n.nisn || n.namaSiswa || n.id || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const mapel = (n.mapelId || n.mapelNama || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const per = normalizePeriode(n.periode).toLowerCase();
  return `${studentId}_${mapel}_${per}`;
};

export const hasGradeScores = (n: Partial<NilaiMapelSiswa> | null | undefined): boolean => {
  if (!n) return false;
  return (
    n.lm1 !== undefined || n.lm2 !== undefined ||
    n.lm3 !== undefined || n.lm4 !== undefined ||
    n.tugas1 !== undefined || n.tugas2 !== undefined || n.tugas3 !== undefined ||
    n.ulhar1 !== undefined || n.ulhar2 !== undefined ||
    n.nilaiPts !== undefined || n.nilaiPas !== undefined || n.nilaiPat !== undefined ||
    n.nilaiFormatif !== undefined ||
    (typeof n.nilaiAkhir === 'number' && n.nilaiAkhir > 0) ||
    Boolean(n.catatanGuru && n.catatanGuru.trim().length > 0) ||
    Boolean(n.tpDeskripsi && n.tpDeskripsi.trim().length > 0)
  );
};

export const getAllGradeKeys = (n: Partial<NilaiMapelSiswa>): string[] => {
  const keys = new Set<string>();
  const per = normalizePeriode(n.periode).toLowerCase();

  const studentIdentifiers: string[] = [];
  if (n.nipd) studentIdentifiers.push(n.nipd.replace(/[^a-zA-Z0-9]/g, '').toLowerCase());
  if (n.nisn) studentIdentifiers.push(n.nisn.replace(/[^a-zA-Z0-9]/g, '').toLowerCase());
  if (n.namaSiswa) studentIdentifiers.push(n.namaSiswa.replace(/[^a-zA-Z0-9]/g, '').toLowerCase());

  const mapelIdentifiers: string[] = [];
  if (n.mapelId) mapelIdentifiers.push(n.mapelId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase());
  if (n.mapelNama) mapelIdentifiers.push(n.mapelNama.replace(/[^a-zA-Z0-9]/g, '').toLowerCase());

  studentIdentifiers.forEach(s => {
    mapelIdentifiers.forEach(m => {
      keys.add(`${s}_${m}_${per}`);
    });
  });

  if (n.id) {
    keys.add(n.id);
  }
  keys.add(getGradeMergeKey(n as NilaiMapelSiswa));
  return Array.from(keys);
};

export const mergeGradeItems = (existing: NilaiMapelSiswa | undefined, incoming: NilaiMapelSiswa): NilaiMapelSiswa => {
  if (!existing) return incoming;
  if (!incoming) return existing;

  const existingHas = hasGradeScores(existing);
  const incomingHas = hasGradeScores(incoming);

  if (existingHas && !incomingHas) {
    return existing;
  }
  if (!existingHas && incomingHas) {
    return incoming;
  }

  return {
    ...existing,
    ...incoming,
    lm1: incoming.lm1 !== undefined ? incoming.lm1 : existing.lm1,
    lm2: incoming.lm2 !== undefined ? incoming.lm2 : existing.lm2,
    lm3: incoming.lm3 !== undefined ? incoming.lm3 : existing.lm3,
    lm4: incoming.lm4 !== undefined ? incoming.lm4 : existing.lm4,
    tugas1: incoming.tugas1 !== undefined ? incoming.tugas1 : existing.tugas1,
    tugas2: incoming.tugas2 !== undefined ? incoming.tugas2 : existing.tugas2,
    tugas3: incoming.tugas3 !== undefined ? incoming.tugas3 : existing.tugas3,
    ulhar1: incoming.ulhar1 !== undefined ? incoming.ulhar1 : existing.ulhar1,
    ulhar2: incoming.ulhar2 !== undefined ? incoming.ulhar2 : existing.ulhar2,
    nilaiPts: incoming.nilaiPts !== undefined ? incoming.nilaiPts : existing.nilaiPts,
    nilaiPas: incoming.nilaiPas !== undefined ? incoming.nilaiPas : existing.nilaiPas,
    nilaiPat: incoming.nilaiPat !== undefined ? incoming.nilaiPat : existing.nilaiPat,
    nilaiFormatif: incoming.nilaiFormatif !== undefined ? incoming.nilaiFormatif : existing.nilaiFormatif,
    nilaiAkhir: (typeof incoming.nilaiAkhir === 'number' && incoming.nilaiAkhir > 0) ? incoming.nilaiAkhir : existing.nilaiAkhir,
    predikat: incoming.predikat || existing.predikat,
    tpDeskripsi: incoming.tpDeskripsi || existing.tpDeskripsi,
    deskripsiTertinggi: incoming.deskripsiTertinggi || existing.deskripsiTertinggi,
    deskripsiPerluBimbingan: incoming.deskripsiPerluBimbingan || existing.deskripsiPerluBimbingan,
    catatanGuru: incoming.catatanGuru || existing.catatanGuru,
  };
};

export default function App() {
  // Global State with LocalStorage Persistence - Default to logged out when app is opened
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [activeTab, setActiveTab] = useState<'web' | 'ppdb' | 'cat' | 'siswa' | 'guru' | 'walas' | 'admin' | 'login' | 'presensi'>('web');
  
  // Info Pembaruan Aplikasi (Otomatis tampil paling lama 2 hari sejak rilis/deteksi awal)
  const [showPembaruanModal, setShowPembaruanModal] = useState<boolean>(() => {
    return shouldShowAppUpdateModal();
  });

  // Tampilkan notifikasi pembaruan saat user login jika belum kadaluarsa (maksimal 2 hari)
  React.useEffect(() => {
    if (currentUser) {
      if (shouldShowAppUpdateModal()) {
        setShowPembaruanModal(true);
      }
    }
  }, [currentUser]);

  // Real-time Global Notification when student attendance is successfully recorded across any mode
  const [attendanceToast, setAttendanceToast] = useState<{
    id: string;
    namaSiswa: string;
    kelas: string;
    nipd?: string;
    status: string;
    waktu: string;
    metode: string;
    tanggal: string;
    keterangan?: string;
  } | null>(null);
  const attendanceToastTimerRef = useRef<any>(null);

  const triggerAttendanceSuccessToast = (record: AbsensiRecord) => {
    if (!record) return;
    const cleanKelas = (record.kelas || 'Rombel').replace(/^Kelas\s+/i, '');
    const cleanWaktu = record.waktu || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    
    setAttendanceToast({
      id: record.id || `toast-${Date.now()}`,
      namaSiswa: record.namaSiswa || 'Peserta Didik',
      kelas: cleanKelas,
      nipd: record.nipd || record.nisn || '',
      status: record.status || 'Hadir',
      waktu: cleanWaktu,
      metode: record.metode || 'Sistem',
      tanggal: record.tanggal || getLocalDateString(),
      keterangan: record.keterangan,
    });

    // Play pleasant two-tone audio chime (A5 -> E6)
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        if (audioCtx.state === 'suspended') {
          audioCtx.resume().catch(() => {});
        }
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc.frequency.setValueAtTime(1320, audioCtx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      }
    } catch (_) {}

    // Mobile haptic vibration feedback for smartphones
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([100, 50, 100]); } catch (_) {}
    }

    if (attendanceToastTimerRef.current) {
      clearTimeout(attendanceToastTimerRef.current);
    }
    attendanceToastTimerRef.current = setTimeout(() => {
      setAttendanceToast(null);
    }, 5000);
  };
  
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo>(() => {
    try {
      const saved = localStorage.getItem('saved_school_info');
      if (saved) {
        const parsed = JSON.parse(saved);
        const farmasi = Number(parsed.kuotaJurusan?.farmasi ?? parsed.kuotaPerJurusan?.farmasi ?? SCHOOL_INFO.kuotaJurusan?.farmasi ?? 72);
        const keperawatan = Number(parsed.kuotaJurusan?.keperawatan ?? parsed.kuotaPerJurusan?.asistenKeperawatan ?? SCHOOL_INFO.kuotaJurusan?.keperawatan ?? 72);
        const kecantikan = Number(parsed.kuotaJurusan?.kecantikan ?? parsed.kuotaPerJurusan?.tataKecantikan ?? SCHOOL_INFO.kuotaJurusan?.kecantikan ?? 36);
        const perhotelan = Number(parsed.kuotaJurusan?.perhotelan ?? parsed.kuotaPerJurusan?.perhotelan ?? SCHOOL_INFO.kuotaJurusan?.perhotelan ?? 36);
        const totalKuota = (farmasi + keperawatan + kecantikan + perhotelan) || parsed.kuotaSPMB || 216;

        const rombelFarmasi = Number(parsed.rombelJurusan?.farmasi ?? SCHOOL_INFO.rombelJurusan?.farmasi ?? 2);
        const rombelKeperawatan = Number(parsed.rombelJurusan?.keperawatan ?? SCHOOL_INFO.rombelJurusan?.keperawatan ?? 2);
        const rombelKecantikan = Number(parsed.rombelJurusan?.kecantikan ?? SCHOOL_INFO.rombelJurusan?.kecantikan ?? 1);
        const rombelPerhotelan = Number(parsed.rombelJurusan?.perhotelan ?? SCHOOL_INFO.rombelJurusan?.perhotelan ?? 1);

        const gelombangList = (parsed.gelombangList && parsed.gelombangList.length > 0)
          ? parsed.gelombangList
          : (SCHOOL_INFO.gelombangList || []);

        const rekeningBankList = (parsed.rekeningBankList && parsed.rekeningBankList.length > 0)
          ? parsed.rekeningBankList
          : (SCHOOL_INFO.rekeningBankList || []);

        const kejuruanList = (parsed.kejuruanList && parsed.kejuruanList.length > 0)
          ? parsed.kejuruanList
          : (SCHOOL_INFO.kejuruanList || []);

        return {
          ...SCHOOL_INFO,
          ...parsed,
          logoUrl: parsed.logoUrl || parsed.logoKiriUrl || parsed.logoSekolah || SCHOOL_INFO.logoUrl,
          logoKiriUrl: parsed.logoKiriUrl || parsed.logoUrl || parsed.logoSekolah || SCHOOL_INFO.logoUrl,
          logoSekolah: parsed.logoSekolah || parsed.logoUrl || parsed.logoKiriUrl || SCHOOL_INFO.logoUrl,
          logoKananUrl: parsed.logoKananUrl || parsed.kopSekolah?.logoKananUrl || '',
          nama: parsed.nama || SCHOOL_INFO.nama,
          namaLengkap: parsed.namaLengkap || parsed.nama || SCHOOL_INFO.namaLengkap,
          kuotaSPMB: totalKuota,
          kuotaJurusan: { farmasi, keperawatan, kecantikan, perhotelan },
          rombelJurusan: {
            farmasi: rombelFarmasi,
            keperawatan: rombelKeperawatan,
            kecantikan: rombelKecantikan,
            perhotelan: rombelPerhotelan,
          },
          gelombangList,
          rekeningBankList,
          kejuruanList,
          kuotaPerJurusan: { farmasi, asistenKeperawatan: keperawatan, tataKecantikan: kecantikan, perhotelan },
          lokasiSekolah: {
            ...SCHOOL_INFO.lokasiSekolah,
            ...parsed.lokasiSekolah,
            latitude: Number(parsed.lokasiSekolah?.latitude ?? -6.3463444),
            longitude: Number(parsed.lokasiSekolah?.longitude ?? 106.57316),
            radiusMeters: Number(parsed.lokasiSekolah?.radiusMeters && parsed.lokasiSekolah.radiusMeters >= 200 ? parsed.lokasiSekolah.radiusMeters : 250),
            namaTempat: parsed.lokasiSekolah?.namaTempat || 'SMK Kesehatan Bakti Putra Mandiri',
            mapsUrl: (parsed.lokasiSekolah?.mapsUrl && !parsed.lokasiSekolah.mapsUrl.includes('xS33Q5kXbCk8TqVK9') && !parsed.lokasiSekolah.mapsUrl.includes('Ch6WDDFWFznWcT7E9'))
              ? parsed.lokasiSekolah.mapsUrl
              : 'https://maps.app.goo.gl/845UtAVRFmNoEVvSA',
          },
          kopSekolah: {
            ...SCHOOL_INFO.kopSekolah,
            ...parsed.kopSekolah,
            yayasan: parsed.kopSekolah?.yayasan || SCHOOL_INFO.kopSekolah?.yayasan,
            instansi: parsed.kopSekolah?.instansi || parsed.nama?.toUpperCase() || SCHOOL_INFO.kopSekolah?.instansi,
            subJudul: parsed.kopSekolah?.subJudul || SCHOOL_INFO.kopSekolah?.subJudul,
            teleponEmail: parsed.kopSekolah?.teleponEmail || SCHOOL_INFO.kopSekolah?.teleponEmail,
            garisGanda: parsed.kopSekolah?.garisGanda ?? true,
            fontFamily: parsed.kopSekolah?.fontFamily || SCHOOL_INFO.kopSekolah?.fontFamily || 'Times New Roman, Times, Georgia, serif',
            fontSizeYayasan: Number(parsed.kopSekolah?.fontSizeYayasan || 12),
            fontSizeInstansi: Number(parsed.kopSekolah?.fontSizeInstansi || 18),
            fontSizeSubJudul: Number(parsed.kopSekolah?.fontSizeSubJudul || 11),
            fontSizeTeleponEmail: Number(parsed.kopSekolah?.fontSizeTeleponEmail || 10),
            logoSize: Number(parsed.kopSekolah?.logoSize || 64),
            logoKananSize: Number(parsed.kopSekolah?.logoKananSize || parsed.kopSekolah?.logoSize || 64),
            logoKananUrl: parsed.kopSekolah?.logoKananUrl || parsed.logoKananUrl || '',
            tampilkanLogoKanan: parsed.kopSekolah?.tampilkanLogoKanan ?? Boolean(parsed.kopSekolah?.logoKananUrl || parsed.logoKananUrl),
            lineThickness: parsed.kopSekolah?.lineThickness || 'sedang',
          }
        };
      }
    } catch (_) {}
    return SCHOOL_INFO;
  });

  // Sync document title with current school name dynamically
  React.useEffect(() => {
    if (schoolInfo?.nama) {
      document.title = `${schoolInfo.nama} - Sistem Informasi Manajemen Terpadu`;
    }
  }, [schoolInfo]);
  
  // Data State with Persistent LocalStorage Synchronization
  const [kontenList, setKontenList] = useState<KontenWeb[]>(() => {
    const deletedIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_KONTEN, []);
    const loaded = loadFromStorage<KontenWeb[]>(STORAGE_KEYS.KONTEN_WEB, INITIAL_KONTEN_WEB);
    const map = new Map<string, KontenWeb>();
    INITIAL_KONTEN_WEB.forEach(k => {
      if (!deletedIds.includes(k.id)) map.set(k.id, k);
    });
    if (Array.isArray(loaded)) {
      loaded.forEach(k => {
        if (!deletedIds.includes(k.id)) map.set(k.id, k);
      });
    }
    return Array.from(map.values()).filter(k => !deletedIds.includes(k.id));
  });
  const [ujianList, setUjianList] = useState<PaketUjian[]>(() => {
    const loaded = loadFromStorage<PaketUjian[]>(STORAGE_KEYS.UJIAN, INITIAL_UJIAN);
    const deletedIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_UJIAN, []);
    const map = new Map<string, PaketUjian>();
    INITIAL_UJIAN.forEach(u => {
      if (!deletedIds.includes(u.id)) map.set(u.id, u);
    });
    if (Array.isArray(loaded)) {
      loaded.forEach(u => {
        if (!deletedIds.includes(u.id)) map.set(u.id, u);
      });
    }
    return Array.from(map.values()).filter(u => !deletedIds.includes(u.id) && !['ex-1', 'ex-2', 'ex-3', 'ex-4'].includes(u.id));
  });
  const [formulirList, setFormulirList] = useState<FormulirPPDB[]>(() => {
    const loaded = loadFromStorage<FormulirPPDB[]>(STORAGE_KEYS.FORMULIR_PPDB, INITIAL_FORMULIR_PPDB);
    const deletedIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_PPDB, []);
    const map = new Map<string, FormulirPPDB>();
    INITIAL_FORMULIR_PPDB.forEach(f => {
      if (!deletedIds.includes(f.id)) {
        map.set(f.id, f);
      }
    });
    if (Array.isArray(loaded)) {
      loaded.forEach(f => {
        if (!deletedIds.includes(f.id)) {
          map.set(f.id, f);
        }
      });
    }
    return Array.from(map.values()).filter(f => !deletedIds.includes(f.id));
  });
  const [hasilList, setHasilList] = useState<HasilUjian[]>(() => {
    const loaded = loadFromStorage<HasilUjian[]>(STORAGE_KEYS.HASIL_UJIAN, INITIAL_HASIL_UJIAN);
    return (loaded || []).filter(h => !h.id.startsWith('res-'));
  });
  const [usersList, setUsersList] = useState<User[]>(() => {
    // Auto-heal protected accounts from deleted cache
    // Only auto-heal u-admin if deleted accidentally
    try {
      const delUsers = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_USERS, []);
      if (delUsers.includes('u-admin')) {
        saveToStorage(STORAGE_KEYS.DELETED_USERS, delUsers.filter(id => id !== 'u-admin'));
      }
    } catch (_) {}

    const raw = loadFromStorage<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    const deletedUserIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_USERS, []).filter(id => id !== 'u-admin');
    const hasExistingUsersStorage = !!localStorage.getItem('saved_users_list') || !!localStorage.getItem(STORAGE_KEYS.USERS);
    const isTemplateDismissed = localStorage.getItem('template_students_dismissed') === 'true';
    
    const map = new Map<string, User>();
    const initialGuruMap = new Map<string, User>(INITIAL_GURU_USERS.map(g => [g.id, g]));

    // 1. Seed INITIAL_USERS only if no existing users storage exists
    if (!hasExistingUsersStorage) {
      INITIAL_USERS.forEach(u => {
        if (!deletedUserIds.includes(u.id)) {
          map.set(u.id, sanitizeUserAccount(u));
        }
      });
      INITIAL_GURU_USERS.forEach(g => {
        if (!deletedUserIds.includes(g.id)) {
          map.set(g.id, sanitizeUserAccount(g));
        }
      });
    } else {
      // Guarantee u-admin always exists
      INITIAL_USERS.filter(u => u.id === 'u-admin').forEach(u => {
        map.set(u.id, sanitizeUserAccount(u));
      });
    }

    // Only seed GENERATED_STUDENT_USERS if this is a first-time fresh setup and template has not been dismissed
    if (!hasExistingUsersStorage && !isTemplateDismissed) {
      GENERATED_STUDENT_USERS.forEach(s => {
        if (!map.has(s.id) && !deletedUserIds.includes(s.id)) {
          map.set(s.id, sanitizeUserAccount(s));
        }
      });
    }
    // 2. Overlay raw (stored users from localStorage) except deleted ones
    if (Array.isArray(raw)) {
      raw.forEach(u => {
        if (!deletedUserIds.includes(u.id)) {
          map.set(u.id, sanitizeUserAccount(u));
        }
      });
    }

    // Also seed from active PPDB forms (initial + stored) that are not deleted
    const deletedPPDBIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_PPDB, []);
    const storedForms = loadFromStorage<FormulirPPDB[]>(STORAGE_KEYS.FORMULIR_PPDB, INITIAL_FORMULIR_PPDB);
    const activeFormsMap = new Map<string, FormulirPPDB>();
    INITIAL_FORMULIR_PPDB.forEach(f => {
      if (!deletedPPDBIds.includes(f.id)) activeFormsMap.set(f.id, f);
    });
    if (Array.isArray(storedForms)) {
      storedForms.forEach(f => {
        if (!deletedPPDBIds.includes(f.id)) activeFormsMap.set(f.id, f);
      });
    }
    const allForms = Array.from(activeFormsMap.values());
    allForms.forEach(f => {
      const uid = f.userId && !f.userId.startsWith('guest-') ? f.userId : `u-calon-${f.id}`;
      if (deletedUserIds.includes(uid)) return;
      const existing = map.get(uid);
      map.set(uid, {
        id: uid,
        username: f.nisn || (existing ? existing.username : f.namaLengkap.toLowerCase().replace(/\s+/g, '_')),
        nama: f.namaLengkap,
        role: 'calon_siswa',
        nipOrNis: f.nisn,
        nisn: f.nisn,
        password: existing?.password || 'ppdb',
        email: f.emailSiswa || f.email,
        telepon: f.noHp,
        jurusan: f.pilihanJurusan,
        statusAktif: true,
        jenisKelamin: f.jenisKelamin,
      });
    });

    // Obsolete dummy placeholders that should not appear
    const obsoleteDummyNames = [
      'Maya Indriani, S.Pd.',
      'Agus Setiawan, S.ST.Par.',
      'Drs. Suhendar',
      'Siti Sarah, S.Pd.',
      'Kak Asep Kurniawan',
      'Budi Santoso, S.Pd.',
      'Guru Contoh',
      'Guru Template'
    ];

    const initialFiltered = Array.from(map.values())
      .filter(u => {
        if (u.id === 'u-admin') return true;
        if (deletedUserIds.includes(u.id)) return false;
        // Hapus akun non-eksisten Adelia Putri Safitri jika tersimpan di cache lokal
        if (u.nipOrNis === '26.27.10.001' || u.username === '26.27.10.001' || (u.nama && u.nama.toLowerCase().includes('adelia putri safitri'))) {
          return false;
        }
        // Strip obsolete dummy placeholder teachers from appearing
        if (u.role === 'guru' || u.role === 'walas' || u.role === 'pembina_ekskul' || u.role === 'kesiswaan') {
          if (obsoleteDummyNames.includes(u.nama) || u.id.startsWith('u-guru-dummy') || u.id.startsWith('u-guru-template')) {
            return false;
          }
        }
        return true;
      })
      .map(sanitizeUserAccount);

    const { uniqueUsers } = deduplicateUserAccounts(initialFiltered, INITIAL_GURU_USERS);
    return uniqueUsers;
  });
  const [kelasList, setKelasList] = useState<Kelas[]>(() => {
    const deletedKelasIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_KELAS, []);
    const hasStored = !!localStorage.getItem(STORAGE_KEYS.KELAS) || !!localStorage.getItem('saved_kelas_list');
    const raw = loadFromStorage<Kelas[]>(STORAGE_KEYS.KELAS, []);
    const source = (hasStored && Array.isArray(raw)) ? raw : INITIAL_KELAS;
    return sortKelasAlphabetical(source
      .filter(k => !deletedKelasIds.includes(k.id))
      .map(k => ({
        ...k,
        namaKelas: (k.namaKelas || '').replace(/^Kelas\s+/i, '').trim(),
      })));
  });
  const [mapelList, setMapelList] = useState<Mapel[]>(() => {
    const deletedMapelIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_MAPEL, []);
    const stored = loadFromStorage<Mapel[]>(STORAGE_KEYS.MAPEL, []);
    const storedMap = new Map<string, Mapel>();

    // 1. Seed initial official mapels except deleted ones
    INITIAL_MAPEL.forEach(m => {
      if (!deletedMapelIds.includes(m.id)) {
        storedMap.set(m.id, m);
      }
    });
    // 2. Overlay stored mapels (user created and updated mapels take precedence, while preserving official guruPengampu)
    if (Array.isArray(stored)) {
      stored.forEach(m => {
        if (!deletedMapelIds.includes(m.id)) {
          const init = storedMap.get(m.id);
          const hasValidGuru = m.guruPengampu && 
            m.guruPengampu.trim().length > 0 && 
            m.guruPengampu.trim() !== '-' && 
            m.guruPengampu.trim().toLowerCase() !== 'guru pengampu' && 
            m.guruPengampu.trim().toLowerCase() !== 'belum ditentukan';

          storedMap.set(m.id, {
            ...init,
            ...m,
            guruPengampu: hasValidGuru ? m.guruPengampu : (init?.guruPengampu || m.guruPengampu),
            idGuru: hasValidGuru ? m.idGuru : (init?.idGuru || m.idGuru),
          });
        }
      });
    }
    const merged = Array.from(storedMap.values()).map(sanitizeMapelItem);
    try {
      localStorage.setItem(STORAGE_KEYS.MAPEL, JSON.stringify(merged));
    } catch (_) {}
    return merged;
  });
  const [jadwalPelajaranList, setJadwalPelajaranList] = useState<JadwalPelajaran[]>(() => {
    const deletedIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_JADWAL_PELAJARAN, []);
    const raw = loadFromStorage<JadwalPelajaran[]>(STORAGE_KEYS.JADWAL_PELAJARAN, INITIAL_JADWAL_PELAJARAN);
    return (raw || []).filter(j => !deletedIds.includes(j.id) && !j.id.startsWith('jp-')).map(sanitizeJadwalItem);
  });
  const [jadwalUjianList, setJadwalUjianList] = useState<JadwalUjianItem[]>(() => {
    const deletedIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_JADWAL_UJIAN, []);
    const raw = loadFromStorage<JadwalUjianItem[]>(STORAGE_KEYS.JADWAL_UJIAN, INITIAL_JADWAL_UJIAN);
    return (raw || []).filter(ju => !deletedIds.includes(ju.id) && !ju.id.startsWith('ju-'));
  });
  const [absensiList, setAbsensiList] = useState<AbsensiRecord[]>(() => {
    const deletedIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_ABSENSI, []);
    const raw = loadFromStorage<AbsensiRecord[]>(STORAGE_KEYS.ABSENSI, []);
    const valid = (raw || []).filter(a => a && a.id && !deletedIds.includes(a.id));
    const withSept = ensureSeptemberAttendance(valid);
    const { clean, obsoleteIds } = sanitizeAndDeduplicateAbsensiRecords(withSept);
    if (obsoleteIds.length > 0) {
      const updatedDeleted = Array.from(new Set([...deletedIds, ...obsoleteIds]));
      saveToStorage(STORAGE_KEYS.DELETED_ABSENSI, updatedDeleted);
      obsoleteIds.forEach(id => removeDocument('absensi', id).catch(() => {}));
    }
    return clean;
  });
  const [nilaiList, setNilaiList] = useState<NilaiMapelSiswa[]>(() => {
    const deletedIds = new Set(loadFromStorage<string[]>(STORAGE_KEYS.DELETED_NILAI, []));
    const deletedKeys = new Set(loadFromStorage<string[]>(STORAGE_KEYS.DELETED_NILAI_KEYS, []));
    
    // Scan all potential local storage keys for entered grades
    const primaryStored = loadFromStorage<NilaiMapelSiswa[]>(STORAGE_KEYS.NILAI, []);
    let legacyList: NilaiMapelSiswa[] = [];
    try {
      const rawLegacy = localStorage.getItem('saved_nilai_list') || 
                        localStorage.getItem('nilai_mapel_siswa') || 
                        localStorage.getItem('saved_nilai_master');
      if (rawLegacy) {
        const parsed = JSON.parse(rawLegacy);
        if (Array.isArray(parsed)) legacyList = parsed;
      }
    } catch (_) {}

    // Also scan recent internal snapshots for rescue if primary is empty
    let backupGrades: NilaiMapelSiswa[] = [];
    try {
      const rawBackups = localStorage.getItem(STORAGE_KEYS.INTERNAL_BACKUPS);
      if (rawBackups) {
        const parsedB = JSON.parse(rawBackups);
        if (Array.isArray(parsedB)) {
          parsedB.forEach((b: any) => {
            const list = b?.data?.nilaiList || b?.nilaiList || b?.nilai;
            if (Array.isArray(list)) backupGrades.push(...list);
          });
        }
      }
    } catch (_) {}

    const allSources = [...backupGrades, ...legacyList, ...primaryStored];
    const gradeMap = new Map<string, NilaiMapelSiswa>();

    allSources.forEach(n => {
      if (n && (n.id || n.nipd)) {
        const k = getGradeMergeKey(n as NilaiMapelSiswa);
        gradeMap.set(k, mergeGradeItems(gradeMap.get(k), n as NilaiMapelSiswa));
      }
    });

    return Array.from(gradeMap.values()).filter(n => {
      if (!n || !n.id) return false;
      if (hasGradeScores(n)) return true;
      return !deletedIds.has(n.id) && !deletedKeys.has(getGradeMergeKey(n));
    }).map(sanitizeNilaiItem);
  });
  const [ekskulList, setEkskulList] = useState<Ekskul[]>(() => {
    const deletedIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_EKSKUL, []);
    const raw = loadFromStorage<Ekskul[]>(STORAGE_KEYS.EKSKUL, INITIAL_EKSKUL);
    return (raw || []).filter(e => !deletedIds.includes(e.id)).map(e => ({
      ...e,
      pembina: (e.pembina && ['Ruli, S.Pd.I', 'Fitri Apriani Setioningsih, S.Pd', 'Rahmatun Komalasari, S.Kep., Ns.', 'Drs. Suhendar', 'Siti Sarah, S.Pd.', 'Kak Asep Kurniawan', 'Budi Santoso, S.Pd.'].includes(e.pembina)) ? '-' : (e.pembina || '-')
    }));
  });
  const [nilaiEkskulList, setNilaiEkskulList] = useState<NilaiEkskulSiswa[]>(() => 
    loadFromStorage(STORAGE_KEYS.NILAI_EKSKUL, [])
  );
  const [absenMengajarList, setAbsenMengajarList] = useState<AbsenMengajarRecord[]>(() => {
    const deletedIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_ABSEN_MENGAJAR, []);
    const templateIds = ['absen-01', 'absen-02', 'absen-03', 'absen-04'];
    const loaded = loadFromStorage<AbsenMengajarRecord[]>(STORAGE_KEYS.ABSEN_MENGAJAR, []);
    return (loaded || []).filter(r => !deletedIds.includes(r.id) && !templateIds.includes(r.id));
  });

  // Auto-Persist Effects to ensure modified data is never lost on refresh or navigation
  React.useEffect(() => {
    saveToStorage(STORAGE_KEYS.USERS, usersList);
  }, [usersList]);

  React.useEffect(() => {
    saveToStorage(STORAGE_KEYS.KELAS, kelasList);
  }, [kelasList]);

  React.useEffect(() => {
    saveToStorage(STORAGE_KEYS.MAPEL, mapelList);
  }, [mapelList]);

  React.useEffect(() => {
    saveToStorage(STORAGE_KEYS.JADWAL_PELAJARAN, jadwalPelajaranList);
  }, [jadwalPelajaranList]);

  React.useEffect(() => {
    saveToStorage(STORAGE_KEYS.JADWAL_UJIAN, jadwalUjianList);
  }, [jadwalUjianList]);

  React.useEffect(() => {
    saveToStorage(STORAGE_KEYS.ABSENSI, absensiList);
  }, [absensiList]);

  React.useEffect(() => {
    saveToStorage(STORAGE_KEYS.NILAI, nilaiList);
  }, [nilaiList]);

  React.useEffect(() => {
    saveToStorage(STORAGE_KEYS.EKSKUL, ekskulList);
  }, [ekskulList]);

  React.useEffect(() => {
    saveToStorage(STORAGE_KEYS.NILAI_EKSKUL, nilaiEkskulList);
  }, [nilaiEkskulList]);

  React.useEffect(() => {
    saveToStorage(STORAGE_KEYS.ABSEN_MENGAJAR, absenMengajarList);
  }, [absenMengajarList]);

  React.useEffect(() => {
    saveToStorage(STORAGE_KEYS.FORMULIR_PPDB, formulirList);
  }, [formulirList]);

  React.useEffect(() => {
    saveToStorage(STORAGE_KEYS.HASIL_UJIAN, hasilList);
  }, [hasilList]);

  React.useEffect(() => {
    saveToStorage(STORAGE_KEYS.UJIAN, ujianList);
  }, [ujianList]);

  React.useEffect(() => {
    saveToStorage(STORAGE_KEYS.KONTEN_WEB, kontenList);
  }, [kontenList]);

  // Multi-Tab & Multi-Window Real-time Sync for Absensi
  // Ensures any attendance marked in another tab (student or admin) syncs immediately across tabs
  React.useEffect(() => {
    const handleStorageSync = (e: StorageEvent) => {
      if ((e.key === STORAGE_KEYS.ABSENSI || e.key === 'saved_absensi_list') && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setAbsensiList(parsed);
          }
        } catch (_) {}
      }
    };
    window.addEventListener('storage', handleStorageSync);
    return () => {
      window.removeEventListener('storage', handleStorageSync);
    };
  }, []);

  // Firebase Firestore Realtime Cloud Synchronization & Connection Validation
  React.useEffect(() => {
    // 1. Connection Healthcheck
    testConnection();

    // 2. Immediate Cloud Bootstrap on Mount (Syncs with other devices: HP, PC, Tablet)
    const bootstrapCloudData = async () => {
      try {
        const stored = localStorage.getItem('saved_users_list');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter((u: any) => 
              u.nipOrNis !== '26.27.10.001' && 
              u.username !== '26.27.10.001' && 
              !u.nama?.toLowerCase().includes('adelia putri safitri')
            );
            if (cleaned.length !== parsed.length) {
              localStorage.setItem('saved_users_list', JSON.stringify(cleaned));
              localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(cleaned));
            }
          }
        }
      } catch (_) {}

      // Fast concurrent startup bootstrap: Sync deleted record IDs and pull cloud data simultaneously
      try {
        const [deletedSnap, deletedUsersSnap, deletedPPDBSnap, cloudData] = await Promise.all([
          Promise.race([
            getDoc(doc(db, 'settings', 'deleted_records')).catch(() => null),
            new Promise(res => setTimeout(() => res(null), 2500))
          ]) as any,
          Promise.race([
            getDoc(doc(db, 'settings', 'deleted_users')).catch(() => null),
            new Promise(res => setTimeout(() => res(null), 2500))
          ]) as any,
          Promise.race([
            getDoc(doc(db, 'settings', 'deleted_ppdb')).catch(() => null),
            new Promise(res => setTimeout(() => res(null), 2500))
          ]) as any,
          pullAllDataFromCloud()
        ]);

        const dData = deletedSnap && typeof deletedSnap.exists === 'function' && deletedSnap.exists() ? deletedSnap.data() : null;
        const dUsersData = deletedUsersSnap && typeof deletedUsersSnap.exists === 'function' && deletedUsersSnap.exists() ? deletedUsersSnap.data() : null;
        const dPPDBData = deletedPPDBSnap && typeof deletedPPDBSnap.exists === 'function' && deletedPPDBSnap.exists() ? deletedPPDBSnap.data() : null;

        // 1. Sync tombstoned user IDs from all sources
        const combinedDeletedUsers = Array.from(new Set([
          ...loadFromStorage<string[]>(STORAGE_KEYS.DELETED_USERS, []),
          ...(Array.isArray(dData?.deleted_users) ? dData.deleted_users : []),
          ...(Array.isArray(dUsersData?.ids) ? dUsersData.ids : []),
          ...(Array.isArray(cloudData?.tombstonedUserIds) ? cloudData.tombstonedUserIds : [])
        ])).filter(id => id !== 'u-admin');
        saveToStorage(STORAGE_KEYS.DELETED_USERS, combinedDeletedUsers);

        // 2. Sync tombstoned PPDB IDs from all sources
        const combinedDeletedPPDB = Array.from(new Set([
          ...loadFromStorage<string[]>(STORAGE_KEYS.DELETED_PPDB, []),
          ...(Array.isArray(dData?.deleted_ppdb) ? dData.deleted_ppdb : []),
          ...(Array.isArray(dPPDBData?.ids) ? dPPDBData.ids : []),
          ...(Array.isArray(cloudData?.tombstonedPPDBIds) ? cloudData.tombstonedPPDBIds : [])
        ]));
        saveToStorage(STORAGE_KEYS.DELETED_PPDB, combinedDeletedPPDB);

        // 3. Sync other entity tombstones
        if (dData) {
          const syncDel = (key: string, cloudList: any) => {
            if (Array.isArray(cloudList)) {
              const localIds = loadFromStorage<string[]>(key, []);
              const merged = Array.from(new Set([...localIds, ...cloudList]));
              saveToStorage(key, merged);
            }
          };
          syncDel(STORAGE_KEYS.DELETED_KELAS, dData.deleted_kelas);
          syncDel(STORAGE_KEYS.DELETED_MAPEL, dData.deleted_mapel);
          syncDel(STORAGE_KEYS.DELETED_ABSENSI, dData.deleted_absensi);
          syncDel(STORAGE_KEYS.DELETED_ABSEN_MENGAJAR, dData.deleted_absen_mengajar);
          syncDel(STORAGE_KEYS.DELETED_UJIAN, dData.deleted_ujian);
          syncDel(STORAGE_KEYS.DELETED_EKSKUL, dData.deleted_ekskul);
          syncDel(STORAGE_KEYS.DELETED_JADWAL_PELAJARAN, dData.deleted_jadwal_pelajaran);
          syncDel(STORAGE_KEYS.DELETED_JADWAL_UJIAN, dData.deleted_jadwal_ujian);
          syncDel(STORAGE_KEYS.DELETED_KONTEN, dData.deleted_konten);
          syncDel(STORAGE_KEYS.DELETED_NILAI, dData.deleted_nilai);
        }

        // 4. Sync template dismissal flags so dummy students and forms NEVER resurrect on any device
        if (dData?.template_students_dismissed || dUsersData?.templateDismissed || cloudData?.isTemplateStudentsDismissed) {
          try { localStorage.setItem('template_students_dismissed', 'true'); } catch (_) {}
        }
        if (dData?.template_ppdb_dismissed || dPPDBData?.templateDismissed || cloudData?.isTemplatePPDBDismissed) {
          try { localStorage.setItem('template_ppdb_dismissed', 'true'); } catch (_) {}
        }

        if (cloudData && cloudData.success) {
          // If Cloud has School Profile
          if (cloudData.schoolInfo && cloudData.schoolInfo.nama) {
            setSchoolInfo(prev => {
              const merged = { ...prev, ...cloudData.schoolInfo };
              try { localStorage.setItem('saved_school_info', JSON.stringify(merged)); } catch (_) {}
              return merged;
            });
          }

          // If Cloud has Users (Teachers, Students, Walas)
          if (cloudData.usersList && cloudData.usersList.length > 0) {
            const currentDeletedIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_USERS, []);
            const sanitizedUsers = cloudData.usersList
              .filter((u: any) => 
                !currentDeletedIds.includes(u.id) &&
                (!u.username || !currentDeletedIds.includes(u.username)) &&
                (!u.nipd || !currentDeletedIds.includes(u.nipd)) &&
                (!u.nisn || !currentDeletedIds.includes(u.nisn)) &&
                (!u.nipOrNis || !currentDeletedIds.includes(u.nipOrNis))
              )
              .map(sanitizeUserAccount);
            setUsersList(sanitizedUsers);
            try {
              localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(sanitizedUsers));
              localStorage.setItem('saved_users_list', JSON.stringify(sanitizedUsers));
            } catch (_) {}
          }

          // If Cloud has Kelas / Rombel
          if (cloudData.kelasList && cloudData.kelasList.length > 0) {
            const deletedKelasIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_KELAS, []);
            const cleanClasses = cloudData.kelasList
              .filter(k => !deletedKelasIds.includes(k.id))
              .map(k => ({
                ...k,
                namaKelas: (k.namaKelas || '').replace(/^Kelas\s+/i, '').trim()
              }));
            const sortedClasses = sortKelasAlphabetical(cleanClasses);
            setKelasList(sortedClasses);
            try {
              localStorage.setItem(STORAGE_KEYS.KELAS, JSON.stringify(sortedClasses));
              localStorage.setItem('saved_kelas_list', JSON.stringify(sortedClasses));
            } catch (_) {}
          }

          // If Cloud has Mapel
          if (cloudData.mapelList && cloudData.mapelList.length > 0) {
            const deletedMapelIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_MAPEL, []);
            const validMapels = cloudData.mapelList.filter(m => !deletedMapelIds.includes(m.id)).map(m => {
              const init = INITIAL_MAPEL.find(im => im.id === m.id);
              const hasValidGuru = m.guruPengampu && 
                m.guruPengampu.trim().length > 0 && 
                m.guruPengampu.trim() !== '-' && 
                m.guruPengampu.trim().toLowerCase() !== 'guru pengampu' && 
                m.guruPengampu.trim().toLowerCase() !== 'belum ditentukan';
              return sanitizeMapelItem({
                ...m,
                guruPengampu: hasValidGuru ? m.guruPengampu : (init?.guruPengampu || m.guruPengampu),
                idGuru: hasValidGuru ? m.idGuru : (init?.idGuru || m.idGuru),
              });
            });
            const teachersToUse = (cloudData.usersList || usersList).filter(u => u.role !== 'admin' && u.role !== 'siswa' && u.role !== 'calon_siswa' && u.statusAktif !== false);
            const { updatedMapels: syncedCloudMapels } = syncMapelsWithTeachers(validMapels, teachersToUse);
            setMapelList(syncedCloudMapels);
            try {
              localStorage.setItem(STORAGE_KEYS.MAPEL, JSON.stringify(syncedCloudMapels));
            } catch (_) {}
          }

          // If Cloud has PPDB Registrations
          const isPPDBDismissed = localStorage.getItem('template_ppdb_dismissed') === 'true' || Boolean(cloudData.isTemplatePPDBDismissed);
          if (cloudData.formulirList) {
            const deletedPPDBIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_PPDB, []);
            const validCloudForms = (isPPDBDismissed && cloudData.formulirList.length === 0)
              ? []
              : cloudData.formulirList.filter(f => !deletedPPDBIds.includes(f.id) && (!f.nisn || !deletedPPDBIds.includes(f.nisn)));
            setFormulirList(validCloudForms);
            try {
              localStorage.setItem('saved_formulir_ppdb', JSON.stringify(validCloudForms));
              localStorage.setItem(STORAGE_KEYS.FORMULIR_PPDB, JSON.stringify(validCloudForms));
            } catch (_) {}
          }

          // If Cloud has Exam Packages
          if (cloudData.ujianList && cloudData.ujianList.length > 0) {
            const deletedUjianIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_UJIAN, []);
            const validUjian = cloudData.ujianList.filter(u => !deletedUjianIds.includes(u.id));
            setUjianList(validUjian);
          }

          // If Cloud has Jadwal
          if (cloudData.jadwalPelajaranList && cloudData.jadwalPelajaranList.length > 0) {
            const deletedJadwalIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_JADWAL_PELAJARAN, []);
            const validJadwal = cloudData.jadwalPelajaranList
              .filter(j => !deletedJadwalIds.includes(j.id))
              .map(sanitizeJadwalItem);
            setJadwalPelajaranList(validJadwal);
          }
          if (cloudData.jadwalUjianList && cloudData.jadwalUjianList.length > 0) {
            const deletedJadwalUjianIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_JADWAL_UJIAN, []);
            const validJadwalU = cloudData.jadwalUjianList.filter(j => !deletedJadwalUjianIds.includes(j.id));
            setJadwalUjianList(validJadwalU);
          }

          // If Cloud has Ekskul
          if (cloudData.ekskulList && cloudData.ekskulList.length > 0) {
            const deletedEkskulIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_EKSKUL, []);
            const validEkskul = cloudData.ekskulList.filter(e => !deletedEkskulIds.includes(e.id));
            setEkskulList(validEkskul);
          }

          // If Cloud has Nilai Leger Mapel
          if (cloudData.nilaiList && cloudData.nilaiList.length > 0) {
            const deletedNilaiIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_NILAI, []);
            const deletedNilaiKeys = new Set(loadFromStorage<string[]>(STORAGE_KEYS.DELETED_NILAI_KEYS, []));
            const validNilai = cloudData.nilaiList
              .filter(n => n && n.id && (hasGradeScores(n) || (!deletedNilaiIds.includes(n.id) && !deletedNilaiKeys.has(getGradeMergeKey(n)))))
              .map(sanitizeNilaiItem);

            setNilaiList(prev => {
              const map = new Map<string, NilaiMapelSiswa>();
              (prev || []).forEach(n => {
                if (n && n.id) map.set(getGradeMergeKey(n), n);
              });
              validNilai.forEach(n => {
                if (n && n.id) {
                  const k = getGradeMergeKey(n);
                  map.set(k, mergeGradeItems(map.get(k), n));
                }
              });
              const merged = Array.from(map.values()).filter(n => {
                if (!n || !n.id) return false;
                if (hasGradeScores(n)) return true;
                return !deletedNilaiIds.includes(n.id) && !deletedNilaiKeys.has(getGradeMergeKey(n));
              }).map(sanitizeNilaiItem);

              try {
                localStorage.setItem(STORAGE_KEYS.NILAI, JSON.stringify(merged));
                localStorage.setItem('saved_nilai_list', JSON.stringify(merged));
              } catch (_) {}

              // Auto-persist active scores to Firestore collection in background
              const activeScores = merged.filter(hasGradeScores);
              if (activeScores.length > 0) {
                saveBatchDocuments('nilai', activeScores).catch(() => {});
              }

              return merged;
            });
          }

          // If Cloud has Nilai Ekskul
          if (cloudData.nilaiEkskulList && cloudData.nilaiEkskulList.length > 0) {
            setNilaiEkskulList(cloudData.nilaiEkskulList);
            try {
              localStorage.setItem(STORAGE_KEYS.NILAI_EKSKUL, JSON.stringify(cloudData.nilaiEkskulList));
              localStorage.setItem('saved_nilai_ekskul_list', JSON.stringify(cloudData.nilaiEkskulList));
            } catch (_) {}
          }

          // If Cloud has Absensi Records
          if (cloudData.absensiList && cloudData.absensiList.length > 0) {
            const deletedAbsenIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_ABSENSI, []);
            const validAbsensi = cloudData.absensiList.filter(a => a && a.id && !deletedAbsenIds.includes(a.id));
            const withSept = ensureSeptemberAttendance(validAbsensi);
            const { clean, obsoleteIds } = sanitizeAndDeduplicateAbsensiRecords(withSept);
            setAbsensiList(clean);
            try {
              localStorage.setItem(STORAGE_KEYS.ABSENSI, JSON.stringify(clean));
              localStorage.setItem('saved_absensi_list', JSON.stringify(clean));
            } catch (_) {}
            if (obsoleteIds.length > 0) {
              const updatedDeleted = Array.from(new Set([...deletedAbsenIds, ...obsoleteIds]));
              saveToStorage(STORAGE_KEYS.DELETED_ABSENSI, updatedDeleted);
              obsoleteIds.forEach(id => removeDocument('absensi', id).catch(() => {}));
            }
          }

          // If Cloud has Absen Mengajar Records
          if (cloudData.absenMengajarList && cloudData.absenMengajarList.length > 0) {
            const deletedAbsenIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_ABSEN_MENGAJAR, []);
            const templateIds = ['absen-01', 'absen-02', 'absen-03', 'absen-04'];
            const valid = cloudData.absenMengajarList.filter(a => !deletedAbsenIds.includes(a.id) && !templateIds.includes(a.id));
            setAbsenMengajarList(valid);
            try {
              localStorage.setItem(STORAGE_KEYS.ABSEN_MENGAJAR, JSON.stringify(valid));
            } catch (_) {}
          }
        }
      } catch (err) {
        console.warn('Initial cloud sync notice:', err);
      }
    };

    bootstrapCloudData();

    // 3. Real-time School Info from /settings/school_info
    const unsubSchool = onSnapshot(doc(db, 'settings', 'school_info'), (snapshot) => {
      if (snapshot.exists()) {
        const remoteData = snapshot.data() as Partial<SchoolInfo>;
        if (remoteData && Object.keys(remoteData).length > 0) {
          setSchoolInfo(prev => {
            const finalLogo = remoteData.logoUrl || remoteData.logoKiriUrl || remoteData.logoSekolah || prev.logoUrl;
            const finalLogoKanan = remoteData.logoKananUrl !== undefined 
              ? remoteData.logoKananUrl 
              : (remoteData.kopSekolah?.logoKananUrl ?? prev.logoKananUrl ?? '');

            const merged: SchoolInfo = {
              ...prev,
              ...remoteData,
              logoUrl: finalLogo,
              logoKiriUrl: finalLogo,
              logoSekolah: finalLogo,
              logoKananUrl: finalLogoKanan,
              gelombangList: (remoteData.gelombangList && remoteData.gelombangList.length > 0)
                ? remoteData.gelombangList
                : prev.gelombangList,
              gelombangSPMB: remoteData.gelombangSPMB || prev.gelombangSPMB,
              statusSPMB: remoteData.statusSPMB || prev.statusSPMB,
              kuotaSPMB: remoteData.kuotaSPMB || prev.kuotaSPMB,
              kuotaJurusan: remoteData.kuotaJurusan ? { ...prev.kuotaJurusan, ...remoteData.kuotaJurusan } : prev.kuotaJurusan,
              kopSekolah: remoteData.kopSekolah ? {
                ...prev.kopSekolah,
                ...remoteData.kopSekolah,
                logoKananUrl: remoteData.kopSekolah?.logoKananUrl ?? finalLogoKanan ?? prev.kopSekolah?.logoKananUrl,
                tampilkanLogoKanan: remoteData.kopSekolah?.tampilkanLogoKanan ?? Boolean(finalLogoKanan),
              } : prev.kopSekolah,
              lokasiSekolah: remoteData.lokasiSekolah ? { ...prev.lokasiSekolah, ...remoteData.lokasiSekolah } : prev.lokasiSekolah,
            };
            try {
              localStorage.setItem('saved_school_info', JSON.stringify(merged));
            } catch (_) {}
            return merged;
          });
        }
      }
    }, (error) => {
      console.info('Firestore settings sync notice:', error.message);
    });

    // 4. Real-time Web Content / Articles
    const unsubKonten = listenCollection<KontenWeb>('konten', (items) => {
      if (items.length > 0) {
        setKontenList(prev => {
          const map = new Map<string, KontenWeb>();
          INITIAL_KONTEN_WEB.forEach(k => map.set(k.id, k));
          prev.forEach(k => map.set(k.id, k));
          items.forEach(k => map.set(k.id, k));
          return Array.from(map.values());
        });
      }
    });

    // 5. Real-time PPDB Registrations (Cross-device sync for calon siswa)
    const unsubPPDB = listenCollection<FormulirPPDB>('formulir_ppdb', (items) => {
      const deletedIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_PPDB, []);
      const valid = (items || []).filter(f => f && f.id && !deletedIds.includes(f.id) && (!f.nisn || !deletedIds.includes(f.nisn)));
      setFormulirList(valid);
      try {
        localStorage.setItem('saved_formulir_ppdb', JSON.stringify(valid));
        localStorage.setItem(STORAGE_KEYS.FORMULIR_PPDB, JSON.stringify(valid));
      } catch (_) {}
    });

    // 6. Real-time User Accounts & Student Profiles (Cross-device sync for login/accounts)
    const unsubUsers = listenCollection<User>('users', (items) => {
      if (items.length > 0) {
        const deletedUserIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_USERS, []).filter(id => id !== 'u-admin');
        const templateTeacherNames = [
          'Maya Indriani, S.Pd.',
          'Agus Setiawan, S.ST.Par.',
          'Drs. Suhendar',
          'Siti Sarah, S.Pd.',
          'Kak Asep Kurniawan',
          'Budi Santoso, S.Pd.',
          'Guru Contoh',
          'Guru Template'
        ];

        setUsersList((prev) => {
          const map = new Map<string, User>();
          const initialGuruMap = new Map<string, User>(INITIAL_GURU_USERS.map(g => [g.id, g]));
          const cloudHasTeachers = items.some(u => 
            u.role === 'guru' || u.role === 'walas' || u.role === 'pembina_ekskul' || u.role === 'kesiswaan'
          );

          // 1. Initial users as base fallback (guarantee u-admin)
          INITIAL_USERS.filter(u => u.id === 'u-admin').forEach(u => {
            map.set(u.id, sanitizeUserAccount(u));
          });

          // 2. Only if Cloud has zero teachers, use INITIAL_GURU_USERS as fallback
          if (!cloudHasTeachers) {
            INITIAL_GURU_USERS.forEach(g => {
              if (!deletedUserIds.includes(g.id)) map.set(g.id, sanitizeUserAccount(g));
            });
          }

          // 3. Official students fallback ONLY if cloud & local have zero students and template has not been dismissed
          const cloudHasStudents = items.some(u => u.role === 'siswa');
          const localHasStudents = Array.isArray(prev) && prev.some(u => u.role === 'siswa');
          const isTemplateDismissed = localStorage.getItem('template_students_dismissed') === 'true';
          if (!cloudHasStudents && !localHasStudents && !isTemplateDismissed) {
            GENERATED_STUDENT_USERS.forEach(s => {
              if (!deletedUserIds.includes(s.id)) map.set(s.id, sanitizeUserAccount(s));
            });
          }

          // 4. Pertahankan state lokal saat ini (agar data yang baru dipulihkan/ditambahkan seperti siswa ke-78 atau guru tidak tertimpa)
          if (Array.isArray(prev)) {
            prev.forEach(u => {
              if (!deletedUserIds.includes(u.id)) {
                map.set(u.id, sanitizeUserAccount(u));
              }
            });
          }

          // 5. Selaraskan data dari Cloud Firestore (Cloud Firestore sebagai otoritas)
          items.forEach(u => {
            const isTombstoned = deletedUserIds.includes(u.id) ||
              (u.username && deletedUserIds.includes(u.username)) ||
              (u.nipd && deletedUserIds.includes(u.nipd)) ||
              (u.nisn && deletedUserIds.includes(u.nisn)) ||
              (u.nipOrNis && deletedUserIds.includes(u.nipOrNis));

            if (!isTombstoned) {
              const existing = map.get(u.id);
              // Protect fresh local edits: if existing local record has a newer updatedAt timestamp than Firestore doc, keep local!
              if (existing?.updatedAt && u.updatedAt && existing.updatedAt > u.updatedAt) {
                return;
              }
              // If local record has updatedAt and incoming Firestore doc has NO updatedAt, keep local edit!
              if (existing?.updatedAt && !u.updatedAt) {
                return;
              }
              map.set(u.id, sanitizeUserAccount(u));
            }
          });
          
          // Also sync with active PPDB forms (so all registered applicants have active login accounts)
          const allForms = [...formulirList];
          allForms.forEach(f => {
            const uid = f.userId && !f.userId.startsWith('guest-') ? f.userId : `u-calon-${f.id}`;
            if (deletedUserIds.includes(uid)) return;
            const existing = map.get(uid);
            map.set(uid, {
              id: uid,
              username: f.nisn || (existing ? existing.username : f.namaLengkap.toLowerCase().replace(/\s+/g, '_')),
              nama: f.namaLengkap,
              role: 'calon_siswa',
              nipOrNis: f.nisn,
              nisn: f.nisn,
              password: existing?.password || 'ppdb',
              email: f.emailSiswa || f.email,
              telepon: f.noHp,
              jurusan: f.pilihanJurusan,
              statusAktif: true,
              jenisKelamin: f.jenisKelamin,
            });
          });
          const sanitizedResult = Array.from(map.values())
            .filter(u => {
              if (u.id === 'u-admin') return true;
              if (deletedUserIds.includes(u.id)) return false;
              // Hapus akun non-eksisten Adelia Putri Safitri jika ada di cloud
              if (u.nipOrNis === '26.27.10.001' || u.username === '26.27.10.001' || (u.nama && u.nama.toLowerCase().includes('adelia putri safitri'))) {
                return false;
              }
              if (u.role === 'guru' || u.role === 'walas' || u.role === 'pembina_ekskul' || u.role === 'kesiswaan') {
                if (templateTeacherNames.includes(u.nama) || u.id.startsWith('u-guru-dummy') || u.id.startsWith('u-guru-template')) {
                  return false;
                }
              }
              return true;
            })
            .map(sanitizeUserAccount);

          const { uniqueUsers, obsoleteIds } = deduplicateUserAccounts(sanitizedResult, INITIAL_GURU_USERS);
          if (obsoleteIds.length > 0) {
            obsoleteIds.forEach(oldId => removeDocument('users', oldId).catch(() => {}));
          }

          try {
            localStorage.setItem('saved_users_list', JSON.stringify(uniqueUsers));
            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(uniqueUsers));
          } catch (_) {}
          return uniqueUsers;
        });
      }
    });

    // 7. Real-time Kelas / Rombel
    const unsubKelas = listenCollection<Kelas>('kelas', (items) => {
      const deletedKelasIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_KELAS, []);
      const cleanClasses = items
        .filter(k => !deletedKelasIds.includes(k.id))
        .map(k => ({
          ...k,
          namaKelas: (k.namaKelas || '').replace(/^Kelas\s+/i, '').trim()
        }));
      const sortedClasses = sortKelasAlphabetical(cleanClasses);
      setKelasList(sortedClasses);
      try {
        localStorage.setItem(STORAGE_KEYS.KELAS, JSON.stringify(sortedClasses));
        localStorage.setItem('saved_kelas_list', JSON.stringify(sortedClasses));
      } catch (_) {}
    });

    // 8. Real-time Mata Pelajaran
    const unsubMapel = listenCollection<Mapel>('mapel', (items) => {
      const deletedMapelIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_MAPEL, []);
      const validMapels = items.filter(m => !deletedMapelIds.includes(m.id));
      setMapelList(validMapels);
      try {
        localStorage.setItem(STORAGE_KEYS.MAPEL, JSON.stringify(validMapels));
      } catch (_) {}
      saveToStorage(STORAGE_KEYS.MAPEL, validMapels);
    });

    // 9. Real-time Attendance / Presensi Records
    const unsubAbsen = listenCollection<AbsensiRecord>('absensi', (items) => {
      const deletedIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_ABSENSI, []);
      const valid = items.filter(a => a && a.id && !deletedIds.includes(a.id));
      const withSept = ensureSeptemberAttendance(valid);
      const { clean, obsoleteIds } = sanitizeAndDeduplicateAbsensiRecords(withSept);
      setAbsensiList(clean);
      try {
        localStorage.setItem(STORAGE_KEYS.ABSENSI, JSON.stringify(clean));
        localStorage.setItem('saved_absensi_list', JSON.stringify(clean));
      } catch (_) {}
      if (obsoleteIds.length > 0) {
        const updatedDeleted = Array.from(new Set([...deletedIds, ...obsoleteIds]));
        saveToStorage(STORAGE_KEYS.DELETED_ABSENSI, updatedDeleted);
        obsoleteIds.forEach(id => removeDocument('absensi', id).catch(() => {}));
      }
    });

    // 10. Real-time Exam Packages
    const unsubUjian = listenCollection<PaketUjian>('ujian', (items) => {
      const deletedIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_UJIAN, []);
      const valid = items.filter(u => !deletedIds.includes(u.id));
      setUjianList(valid);
      try {
        localStorage.setItem(STORAGE_KEYS.UJIAN, JSON.stringify(valid));
      } catch (_) {}
    });

    // 11. Real-time Ekstrakurikuler
    const unsubEkskul = listenCollection<Ekskul>('ekskul', (items) => {
      const deletedIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_EKSKUL, []);
      const valid = items.filter(e => !deletedIds.includes(e.id));
      setEkskulList(valid);
      try {
        localStorage.setItem(STORAGE_KEYS.EKSKUL, JSON.stringify(valid));
      } catch (_) {}
    });

    // 12. Real-time Nilai Siswa / Leger Nilai Mata Pelajaran (Sync lintas komputer)
    // 12. Real-time Nilai Siswa / Leger Nilai Mata Pelajaran (Sync lintas komputer)
    const isGradeDeleted = (n: NilaiMapelSiswa, delIds: Set<string>, delKeys: Set<string>): boolean => {
      if (!n) return true;
      // If the record has active scores, it is valid and must NEVER be suppressed
      if (hasGradeScores(n)) return false;
      // If it has NO scores, check if it was marked as deleted
      if (n.id && delIds.has(n.id)) return true;
      const allKeys = getAllGradeKeys(n);
      if (allKeys.some(k => delKeys.has(k))) {
        return true;
      }
      return true; // No scores at all
    };

    const unsubNilai = listenCollection<NilaiMapelSiswa>('nilai', (items) => {
      const deletedNilaiIds = new Set(loadFromStorage<string[]>(STORAGE_KEYS.DELETED_NILAI, []));
      const deletedNilaiKeys = new Set(loadFromStorage<string[]>(STORAGE_KEYS.DELETED_NILAI_KEYS, []));
      const validItems = (items || []).filter(n => !isGradeDeleted(n, deletedNilaiIds, deletedNilaiKeys));

      // Auto-clean any active scores that were mistakenly in deleted tombstones
      const restoredKeys: string[] = [];
      const restoredIds: string[] = [];
      validItems.forEach(n => {
        if (hasGradeScores(n)) {
          if (n.id && deletedNilaiIds.has(n.id)) restoredIds.push(n.id);
          getAllGradeKeys(n).forEach(k => {
            if (deletedNilaiKeys.has(k)) restoredKeys.push(k);
          });
        }
      });
      if (restoredIds.length > 0) {
        const cur = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_NILAI, []);
        saveToStorage(STORAGE_KEYS.DELETED_NILAI, cur.filter(id => !restoredIds.includes(id)));
      }
      if (restoredKeys.length > 0) {
        const curK = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_NILAI_KEYS, []);
        saveToStorage(STORAGE_KEYS.DELETED_NILAI_KEYS, curK.filter(k => !restoredKeys.includes(k)));
      }

      setNilaiList(prev => {
        const map = new Map<string, NilaiMapelSiswa>();
        (prev || []).filter(n => !isGradeDeleted(n, deletedNilaiIds, deletedNilaiKeys)).forEach(n => {
          map.set(getGradeMergeKey(n), n);
        });
        validItems.forEach(n => {
          const k = getGradeMergeKey(n);
          map.set(k, mergeGradeItems(map.get(k), n));
        });
        const merged = Array.from(map.values()).filter(n => !isGradeDeleted(n, deletedNilaiIds, deletedNilaiKeys));
        try {
          localStorage.setItem(STORAGE_KEYS.NILAI, JSON.stringify(merged));
          localStorage.setItem('saved_nilai_list', JSON.stringify(merged));
        } catch (_) {}
        return merged;
      });
    });

    // Real-time listener for consolidated master grades from other computers (read-only supplement, cannot resurrect deleted items)
    const unsubNilaiMaster = onSnapshot(doc(db, 'settings', 'nilai_master'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const deletedNilaiIds = new Set(loadFromStorage<string[]>(STORAGE_KEYS.DELETED_NILAI, []));
        const deletedNilaiKeys = new Set(loadFromStorage<string[]>(STORAGE_KEYS.DELETED_NILAI_KEYS, []));
        if (data && Array.isArray(data.nilaiList)) {
          const validMaster = data.nilaiList.filter((n: NilaiMapelSiswa) => !isGradeDeleted(n, deletedNilaiIds, deletedNilaiKeys));
          setNilaiList(prev => {
            const map = new Map<string, NilaiMapelSiswa>();
            (prev || []).filter(n => !isGradeDeleted(n, deletedNilaiIds, deletedNilaiKeys)).forEach(n => {
              map.set(getGradeMergeKey(n), n);
            });
            validMaster.forEach((n: NilaiMapelSiswa) => {
              const k = getGradeMergeKey(n);
              if (!map.has(k)) {
                map.set(k, n);
              }
            });
            const merged = Array.from(map.values()).filter(n => !isGradeDeleted(n, deletedNilaiIds, deletedNilaiKeys));
            try {
              localStorage.setItem(STORAGE_KEYS.NILAI, JSON.stringify(merged));
              localStorage.setItem('saved_nilai_list', JSON.stringify(merged));
            } catch (_) {}
            return merged;
          });
        }
      }
    }, (err) => {
      console.warn('Notice listening to settings/nilai_master:', err.message);
    });

    // Real-time listener for report card attendance overrides (raport_absensi)
    const unsubRaportAbsensi = onSnapshot(doc(db, 'settings', 'raport_absensi'), (snap) => {
      if (snap.exists()) {
        const rData = snap.data();
        if (rData && rData.data && typeof rData.data === 'object') {
          try {
            localStorage.setItem('saved_raport_absensi', JSON.stringify(rData.data));
            window.dispatchEvent(new CustomEvent('raport_absensi_synced', { detail: rData.data }));
          } catch (_) {}
        }
      }
    }, (err) => {
      console.warn('Notice listening to settings/raport_absensi:', err.message);
    });

    // 13. Real-time Nilai Ekskul
    const unsubNilaiEkskul = listenCollection<NilaiEkskulSiswa>('nilai_ekskul', (items) => {
      setNilaiEkskulList(items);
      try {
        localStorage.setItem(STORAGE_KEYS.NILAI_EKSKUL, JSON.stringify(items));
        localStorage.setItem('saved_nilai_ekskul_list', JSON.stringify(items));
      } catch (_) {}
    });

    // 14. Real-time Absen & Jurnal Mengajar Dewan Guru
    const unsubAbsenMengajar = listenCollection<AbsenMengajarRecord>('absen_mengajar', (items) => {
      const deletedAbsenIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_ABSEN_MENGAJAR, []);
      const templateIds = ['absen-01', 'absen-02', 'absen-03', 'absen-04'];
      const validItems = items.filter(a => !deletedAbsenIds.includes(a.id) && !templateIds.includes(a.id));
      setAbsenMengajarList(validItems);
      try {
        localStorage.setItem(STORAGE_KEYS.ABSEN_MENGAJAR, JSON.stringify(validItems));
      } catch (_) {}
    });

    // 15. Real-time Jadwal Pelajaran
    const unsubJadwal = listenCollection<JadwalPelajaran>('jadwal_pelajaran', (items) => {
      const deletedIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_JADWAL_PELAJARAN, []);
      const valid = items.filter(j => !deletedIds.includes(j.id)).map(j => ({
        ...j,
        jamMulai: normalizeExcelTime(j.jamMulai, '07:15'),
        jamSelesai: normalizeExcelTime(j.jamSelesai, '08:45'),
        jamKe: j.jamKe || `${j.jumlahJam || 2} JP`,
      }));
      setJadwalPelajaranList(valid);
      try { localStorage.setItem(STORAGE_KEYS.JADWAL_PELAJARAN, JSON.stringify(valid)); } catch (_) {}
    });

    // 16. Real-time Jadwal Ujian
    const unsubJadwalU = listenCollection<JadwalUjianItem>('jadwal_ujian', (items) => {
      const deletedIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_JADWAL_UJIAN, []);
      const valid = items.filter(ju => !deletedIds.includes(ju.id));
      setJadwalUjianList(valid);
      try { localStorage.setItem(STORAGE_KEYS.JADWAL_UJIAN, JSON.stringify(valid)); } catch (_) {}
    });

    return () => {
      unsubSchool();
      unsubKonten();
      unsubPPDB();
      unsubUsers();
      unsubKelas();
      unsubMapel();
      unsubAbsen();
      unsubUjian();
      unsubEkskul();
      unsubNilai();
      unsubNilaiMaster();
      unsubRaportAbsensi();
      unsubNilaiEkskul();
      unsubAbsenMengajar();
      unsubJadwal();
      unsubJadwalU();
    };
  }, []);

  // Teaching Attendance (Absen & Jurnal Mengajar) Handlers with Cloud Persistence
  const handleSaveAbsenMengajar = (record: AbsenMengajarRecord) => {
    // Sekolah 5 hari: Sabtu & Minggu libur, otomatis tidak ada absen
    if (record.hari === 'Sabtu' || record.hari === 'Minggu' || !isHariSekolahEfektif(record.tanggal)) {
      console.warn(`Absen mengajar ${record.tanggal} (${record.hari}) dibatalkan karena hari libur akhir pekan.`);
      return;
    }

    // If saving/updating, ensure it's not marked as deleted
    const deletedAbsenIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_ABSEN_MENGAJAR, []);
    if (deletedAbsenIds.includes(record.id)) {
      saveToStorage(STORAGE_KEYS.DELETED_ABSEN_MENGAJAR, deletedAbsenIds.filter(id => id !== record.id));
    }

    setAbsenMengajarList(prev => {
      const idx = prev.findIndex(r => r.id === record.id);
      const updated = idx >= 0 ? prev.map((r, i) => i === idx ? record : r) : [record, ...prev];
      saveToStorage(STORAGE_KEYS.ABSEN_MENGAJAR, updated);
      return updated;
    });
    saveDocument('absen_mengajar', record.id, record).catch(err => {
      console.warn('Failed to save absen_mengajar to cloud:', err);
    });
  };

  const syncDeletedIdToCloud = (category: string, id: string) => {
    if (isQuotaExhausted()) return;
    try {
      getDoc(doc(db, 'settings', 'deleted_records')).then(snap => {
        const data = snap.exists() ? (snap.data() || {}) : {};
        const currentList: string[] = Array.isArray(data[category]) ? data[category] : [];
        if (!currentList.includes(id)) {
          setDoc(doc(db, 'settings', 'deleted_records'), {
            ...data,
            [category]: [...currentList, id],
            updatedAt: new Date().toISOString()
          }, { merge: true }).catch(err => {
            if (isQuotaError(err)) markQuotaExhausted();
          });
        }
      }).catch(err => {
        if (isQuotaError(err)) markQuotaExhausted();
      });
    } catch (_) {}
  };

  const syncDeletedListToCloud = (category: string, ids: string[]) => {
    if (!ids || ids.length === 0 || isQuotaExhausted()) return;
    try {
      getDoc(doc(db, 'settings', 'deleted_records')).then(snap => {
        const data = snap.exists() ? (snap.data() || {}) : {};
        const currentList: string[] = Array.isArray(data[category]) ? data[category] : [];
        const combined = Array.from(new Set([...currentList, ...ids]));
        if (combined.length !== currentList.length) {
          setDoc(doc(db, 'settings', 'deleted_records'), {
            ...data,
            [category]: combined,
            updatedAt: new Date().toISOString()
          }, { merge: true }).catch(err => {
            if (isQuotaError(err)) markQuotaExhausted();
          });
        }
      }).catch(err => {
        if (isQuotaError(err)) markQuotaExhausted();
      });
    } catch (_) {}
  };

  const removeDeletedKeysFromCloud = (category: string, keysToRemove: string[]) => {
    if (!keysToRemove || keysToRemove.length === 0 || isQuotaExhausted()) return;
    try {
      const removeSet = new Set(keysToRemove);
      getDoc(doc(db, 'settings', 'deleted_records')).then(snap => {
        if (!snap.exists()) return;
        const data = snap.data() || {};
        const currentList: string[] = Array.isArray(data[category]) ? data[category] : [];
        const filtered = currentList.filter(id => !removeSet.has(id));
        if (filtered.length !== currentList.length) {
          setDoc(doc(db, 'settings', 'deleted_records'), {
            ...data,
            [category]: filtered,
            updatedAt: new Date().toISOString()
          }, { merge: true }).catch(() => {});
        }
      }).catch(() => {});
    } catch (_) {}
  };

  const handleDeleteAbsenMengajar = (id: string) => {
    // Record in deleted list so it will never resurrect
    const deletedAbsenIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_ABSEN_MENGAJAR, []);
    if (!deletedAbsenIds.includes(id)) {
      saveToStorage(STORAGE_KEYS.DELETED_ABSEN_MENGAJAR, [...deletedAbsenIds, id]);
      syncDeletedIdToCloud('deleted_absen_mengajar', id);
    }
    setAbsenMengajarList(prev => {
      const updated = prev.filter(r => r.id !== id);
      saveToStorage(STORAGE_KEYS.ABSEN_MENGAJAR, updated);
      return updated;
    });
    removeDocument('absen_mengajar', id).catch(err => {
      console.warn('Failed to remove absen_mengajar from cloud:', err);
    });
  };

  const handleClearAllAbsenMengajar = () => {
    setAbsenMengajarList(prev => {
      const allIds = prev.map(p => p.id);
      const deletedAbsenIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_ABSEN_MENGAJAR, []);
      const combined = Array.from(new Set([...deletedAbsenIds, ...allIds, 'absen-01', 'absen-02', 'absen-03', 'absen-04']));
      saveToStorage(STORAGE_KEYS.DELETED_ABSEN_MENGAJAR, combined);
      allIds.forEach(id => removeDocument('absen_mengajar', id).catch(() => {}));
      ['absen-01', 'absen-02', 'absen-03', 'absen-04'].forEach(id => removeDocument('absen_mengajar', id).catch(() => {}));
      saveToStorage(STORAGE_KEYS.ABSEN_MENGAJAR, []);
      return [];
    });
  };

  // Attendance Handlers with Cloud Persistence
  const handleAddAbsensi = (record: AbsensiRecord) => {
    // Sekolah 5 hari: Sabtu & Minggu libur, otomatis tidak ada absen
    if (!isHariSekolahEfektif(record.tanggal)) {
      console.warn(`Presensi pada tanggal ${record.tanggal} dibatalkan karena hari libur akhir pekan (Sabtu & Minggu).`);
      return;
    }

    setAbsensiList(prev => {
      // Prevent duplicate entry for same student on the same date
      const alreadyHasRecord = prev.some(a => 
        a.tanggal === record.tanggal && (
          (record.userId && a.userId === record.userId) ||
          (record.nipd && a.nipd === record.nipd) ||
          (record.nisn && a.nisn && a.nisn === record.nisn) ||
          (record.namaSiswa && a.namaSiswa && a.namaSiswa.trim().toLowerCase() === record.namaSiswa.trim().toLowerCase())
        )
      );

      if (alreadyHasRecord) {
        console.warn(`Siswa ${record.namaSiswa} sudah memiliki catatan kehadiran pada tanggal ${record.tanggal}. Catatan tidak dicatat ulang.`);
        return prev;
      }

      const next = [record, ...prev];
      try {
        localStorage.setItem(STORAGE_KEYS.ABSENSI, JSON.stringify(next));
        localStorage.setItem('saved_absensi_list', JSON.stringify(next));
      } catch (_) {}
      saveDocument('absensi', record.id, record).catch(err => {
        console.warn('Sync absen cloud notice (local storage safe):', err);
      });
      triggerAttendanceSuccessToast(record);
      return next;
    });
  };

  const handleBatchAddAbsensi = (records: AbsensiRecord[], overwriteExisting: boolean = false) => {
    if (!records || records.length === 0) return;

    setAbsensiList(prev => {
      let validRecordsToSave: AbsensiRecord[] = [];
      let next: AbsensiRecord[];

      if (overwriteExisting) {
        // Overwrite mode: Remove existing attendance records for the target students on these specific dates
        const recordKeys = new Set(records.map(r => `${r.tanggal}_${r.userId || r.nipd || r.namaSiswa}`));
        const remaining = prev.filter(p => !recordKeys.has(`${p.tanggal}_${p.userId || p.nipd || p.namaSiswa}`));
        next = [...records, ...remaining];
        validRecordsToSave = records;
      } else {
        // Safe mode: Only keep records for students who don't already have an attendance record on that date
        validRecordsToSave = records.filter(newR => {
          const alreadyExists = prev.some(existing => 
            existing.tanggal === newR.tanggal && (
              (newR.userId && existing.userId === newR.userId) ||
              (newR.nipd && existing.nipd === newR.nipd) ||
              (newR.nisn && existing.nisn && existing.nisn === newR.nisn) ||
              (newR.namaSiswa && existing.namaSiswa && existing.namaSiswa.trim().toLowerCase() === newR.namaSiswa.trim().toLowerCase())
            )
          );
          return !alreadyExists;
        });

        if (validRecordsToSave.length === 0) {
          console.warn('Seluruh siswa dalam batch sudah tercatat presensi pada tanggal tersebut.');
          return prev;
        }

        next = [...validRecordsToSave, ...prev];
      }

      try {
        localStorage.setItem(STORAGE_KEYS.ABSENSI, JSON.stringify(next));
        localStorage.setItem('saved_absensi_list', JSON.stringify(next));
      } catch (_) {}

      // Save batch to Firestore atomically in chunks of 40 documents
      saveBatchDocuments('absensi', validRecordsToSave).catch(err => {
        console.warn('Batch sync absen cloud notice:', err);
      });

      const firstRec = validRecordsToSave[0];
      if (validRecordsToSave.length === 1) {
        triggerAttendanceSuccessToast(firstRec);
      } else {
        setAttendanceToast({
          id: `batch-${Date.now()}`,
          namaSiswa: `${validRecordsToSave.length} Siswa`,
          kelas: firstRec?.kelas || 'Rombel',
          nipd: `${validRecordsToSave.length} Peserta Didik`,
          status: firstRec?.status || 'Hadir',
          waktu: firstRec?.waktu || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          metode: firstRec?.metode || 'Otomatis',
          tanggal: firstRec?.tanggal || getLocalDateString(),
          keterangan: `Presensi [${firstRec?.status || 'Hadir'}] berhasil dicatat untuk ${validRecordsToSave.length} siswa (${firstRec?.tanggal || getLocalDateString()})`,
        });
        setTimeout(() => setAttendanceToast(null), 4000);
      }
      return next;
    });
  };

  const handleUpdateAbsensi = (record: AbsensiRecord) => {
    setAbsensiList(prev => {
      const next = prev.map(a => a.id === record.id ? record : a);
      try {
        localStorage.setItem(STORAGE_KEYS.ABSENSI, JSON.stringify(next));
        localStorage.setItem('saved_absensi_list', JSON.stringify(next));
      } catch (_) {}
      return next;
    });
    saveDocument('absensi', record.id, record).catch(err => {
      console.warn('Sync absen cloud notice (local storage safe):', err);
    });
    triggerAttendanceSuccessToast(record);
  };

  const handleDeleteAbsensi = (id: string) => {
    const deleted = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_ABSENSI, []);
    if (!deleted.includes(id)) {
      saveToStorage(STORAGE_KEYS.DELETED_ABSENSI, [...deleted, id]);
      syncDeletedIdToCloud('deleted_absensi', id);
    }
    setAbsensiList(prev => {
      const next = prev.filter(a => a.id !== id);
      try {
        localStorage.setItem(STORAGE_KEYS.ABSENSI, JSON.stringify(next));
        localStorage.setItem('saved_absensi_list', JSON.stringify(next));
      } catch (_) {}
      return next;
    });
    removeDocument('absensi', id).catch(err => console.warn('Delete absen error:', err));
  };

  // Nilai Handlers with Cloud Persistence
  const handleSaveNilaiList = async (
    newList: NilaiMapelSiswa[],
    changedItems?: NilaiMapelSiswa[],
    deletedIds?: string[]
  ): Promise<{ success: boolean; count: number; error?: string }> => {
    // Ensure network is active and clear any temporary quota flags on user save without blocking
    clearQuotaExhausted();
    ensureFirestoreNetworkEnabled().catch(() => {});

    // 1. Identify which grade keys and IDs are active in newList
    const activeGradeItems = (newList || []).filter(n => hasGradeScores(n));
    const activeKeySet = new Set(activeGradeItems.flatMap(n => getAllGradeKeys(n)));
    const activeIdSet = new Set((newList || []).map(n => n.id).filter(Boolean));

    // 2. Identify explicit deleted IDs
    const explicitDeletedIds = Array.from(new Set(deletedIds || []));

    // Grade keys that are truly deleted: only for items in explicitDeletedIds that have NO active replacement
    const trulyDeletedGradeKeys = new Set<string>();
    explicitDeletedIds.forEach(delId => {
      const oldItem = (nilaiList || []).find(n => n && n.id === delId);
      if (oldItem) {
        const keys = getAllGradeKeys(oldItem);
        const hasActiveReplacement = keys.some(k => activeKeySet.has(k));
        if (!hasActiveReplacement) {
          keys.forEach(k => trulyDeletedGradeKeys.add(k));
        }
      }
    });

    // 3. Update DELETED_NILAI and DELETED_NILAI_KEYS in LocalStorage & Cloud
    const currentDeleted = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_NILAI, []);
    const remainingDeletedIds = currentDeleted.filter(id => !activeIdSet.has(id));
    const mergedDeletedIds = Array.from(new Set([...remainingDeletedIds, ...explicitDeletedIds]));
    saveToStorage(STORAGE_KEYS.DELETED_NILAI, mergedDeletedIds);

    const currentDelKeys = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_NILAI_KEYS, []);
    const remainingDelKeys = currentDelKeys.filter(k => !activeKeySet.has(k));
    const mergedDelKeys = Array.from(new Set([...remainingDelKeys, ...Array.from(trulyDeletedGradeKeys)]));
    saveToStorage(STORAGE_KEYS.DELETED_NILAI_KEYS, mergedDelKeys);

    if (explicitDeletedIds.length > 0) {
      syncDeletedListToCloud('deleted_nilai', explicitDeletedIds);
      explicitDeletedIds.forEach(id => {
        removeDocument('nilai', id).catch(() => {});
      });
    }
    if (trulyDeletedGradeKeys.size > 0) {
      syncDeletedListToCloud('deleted_nilai_keys', Array.from(trulyDeletedGradeKeys));
    }
    // Remove active keys and IDs from cloud deleted_records so other devices never drop them
    if (activeKeySet.size > 0) {
      removeDeletedKeysFromCloud('deleted_nilai_keys', Array.from(activeKeySet));
    }
    if (activeIdSet.size > 0) {
      removeDeletedKeysFromCloud('deleted_nilai', Array.from(activeIdSet));
    }

    // 4. Update local state & storage immediately
    setNilaiList(newList);
    try {
      localStorage.setItem(STORAGE_KEYS.NILAI, JSON.stringify(newList));
      localStorage.setItem('saved_nilai_list', JSON.stringify(newList));
    } catch (_) {}

    try {
      // 5. Batch save valid non-empty items to Firestore collection 'nilai'
      const itemsToSave = (changedItems && changedItems.length > 0) ? changedItems : newList;
      const validItems = itemsToSave.filter(n => 
        n && (n.id || n.nipd) && 
        !explicitDeletedIds.includes(n.id) && 
        hasGradeScores(n)
      );

      let batchResult: { success: boolean; count: number; error?: string } = { success: true, count: 0 };
      if (validItems.length > 0) {
        batchResult = await saveBatchDocuments('nilai', validItems);
        if (!batchResult.success) {
          console.warn('Batch sync nilai warning:', batchResult.error);
        }
      }

      // 6. Update consolidated master document settings/nilai_master safely in background (non-blocking)
      (async () => {
        try {
          const snap = await getDoc(doc(db, 'settings', 'nilai_master'));
          const masterMap = new Map<string, NilaiMapelSiswa>();

          if (snap.exists()) {
            const remoteData = snap.data();
            if (remoteData && Array.isArray(remoteData.nilaiList)) {
              remoteData.nilaiList.forEach((n: NilaiMapelSiswa) => {
                if (n && n.id) {
                  const k = getGradeMergeKey(n);
                  if (!explicitDeletedIds.includes(n.id) && !trulyDeletedGradeKeys.has(k)) {
                    masterMap.set(k, n);
                  }
                }
              });
            }
          }

          explicitDeletedIds.forEach(delId => {
            for (const [k, v] of masterMap.entries()) {
              if (v.id === delId) {
                masterMap.delete(k);
              }
            }
          });
          trulyDeletedGradeKeys.forEach(k => {
            masterMap.delete(k);
          });

          newList.forEach((n: NilaiMapelSiswa) => {
            if (n && n.id && !explicitDeletedIds.includes(n.id) && hasGradeScores(n)) {
              const k = getGradeMergeKey(n);
              masterMap.set(k, n);
            }
          });

          // Strip heavy descriptive strings to keep settings/nilai_master compact (< 600KB)
          const compactMasterList = Array.from(masterMap.values()).map(n => ({
            ...n,
            tpDeskripsi: undefined,
            deskripsiTertinggi: undefined,
            deskripsiPerluBimbingan: undefined,
          }));

          await saveDocument('settings', 'nilai_master', {
            id: 'nilai_master',
            nilaiList: compactMasterList,
            updatedAt: new Date().toISOString(),
            count: compactMasterList.length,
          });
        } catch (masterErr) {
          console.warn('Sync nilai_master notice:', masterErr);
        }
      })();

      return batchResult;
    } catch (err: any) {
      console.warn('Sync nilai error:', err);
      return { success: false, count: 0, error: err?.message || String(err) };
    }
  };

  // Ekskul Handlers
  const handleAddEkskul = (ekskul: Ekskul) => {
    setEkskulList(prev => [...prev, ekskul]);
    saveDocument('ekskul', ekskul.id, ekskul).catch(err => console.warn('Sync ekskul error:', err));
  };

  const handleUpdateEkskul = (ekskul: Ekskul) => {
    setEkskulList(prev => prev.map(e => e.id === ekskul.id ? ekskul : e));
    saveDocument('ekskul', ekskul.id, ekskul).catch(err => console.warn('Sync ekskul error:', err));
  };

  const handleDeleteEkskul = (ekskulId: string) => {
    const deletedIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_EKSKUL, []);
    if (!deletedIds.includes(ekskulId)) {
      saveToStorage(STORAGE_KEYS.DELETED_EKSKUL, [...deletedIds, ekskulId]);
      syncDeletedIdToCloud('deleted_ekskul', ekskulId);
    }
    setEkskulList(prev => prev.filter(e => e.id !== ekskulId));
    removeDocument('ekskul', ekskulId).catch(err => console.warn('Delete ekskul error:', err));
  };

  const handleSaveNilaiEkskul = (list: NilaiEkskulSiswa[]) => {
    setNilaiEkskulList(list);
    try {
      localStorage.setItem(STORAGE_KEYS.NILAI_EKSKUL, JSON.stringify(list));
      localStorage.setItem('saved_nilai_ekskul_list', JSON.stringify(list));
    } catch (_) {}

    // Persist each student ekskul grade to Cloud Firestore
    list.forEach(ne => {
      if (ne && ne.id) {
        saveDocument('nilai_ekskul', ne.id, ne).catch(err => console.warn('Sync nilai_ekskul error:', err));
      }
    });
  };

  // Data Management Handlers with Instant Cloud Persistence
  const handleImportUsers = (newUsers: User[]) => {
    setUsersList(prev => {
      const mergedIncoming = [...prev, ...newUsers];
      const { uniqueUsers, obsoleteIds } = deduplicateUserAccounts(mergedIncoming, INITIAL_GURU_USERS);
      const sanitized = uniqueUsers.map(sanitizeUserAccount);
      try {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(sanitized));
        localStorage.setItem('saved_users_list', JSON.stringify(sanitized));
      } catch (_) {}
      obsoleteIds.forEach(oldId => removeDocument('users', oldId).catch(() => {}));
      saveBatchDocuments('users', sanitized).catch(err => console.warn('Sync import users error:', err));
      return sanitized;
    });
  };

  const handleImportMapel = (newMapel: Mapel[]) => {
    setMapelList(prev => {
      const map = new Map(prev.map(m => [m.id, m]));
      newMapel.forEach(m => map.set(m.id, m));
      const merged = Array.from(map.values());
      try {
        localStorage.setItem(STORAGE_KEYS.MAPEL, JSON.stringify(merged));
      } catch (_) {}
      saveBatchDocuments('mapel', merged).catch(err => console.warn('Sync import mapel error:', err));
      return merged;
    });
  };

  const handleImportJadwal = (newJadwal: JadwalPelajaran[], mode: 'update' | 'replace' | 'append' = 'update') => {
    setJadwalPelajaranList(prev => {
      const getSlotKey = (j: Partial<JadwalPelajaran>) => {
        const h = (j.hari || 'Senin').trim().toLowerCase();
        const rawK = (j.namaKelas || j.idKelas || '')
          .replace(/^kelas\s+/i, '')
          .toLowerCase();
        const k = rawK
          .replace(/\b10\b/g, 'x')
          .replace(/\b11\b/g, 'xi')
          .replace(/\b12\b/g, 'xii')
          .replace(/[^a-z0-9]/g, '');
        const jm = normalizeExcelTime(j.jamMulai || '07:15', '07:15');
        return `${h}|${k}|${jm}`;
      };

      let merged: JadwalPelajaran[];
      const obsoleteIds: string[] = [];

      if (mode === 'replace') {
        // Mode Ganti Seluruh: Hapus semua doc lama agar tidak ada residu / jadwal ganda di Firestore
        prev.forEach(old => obsoleteIds.push(old.id));
        merged = newJadwal.map((j, idx) => ({
          ...j,
          id: j.id || `jp-${Date.now()}-${idx}`,
          jamMulai: normalizeExcelTime(j.jamMulai, '07:15'),
          jamSelesai: normalizeExcelTime(j.jamSelesai, '08:45'),
          jamKe: j.jamKe || `${j.jumlahJam || 2} JP`,
        }));
      } else if (mode === 'append') {
        const map = new Map(prev.map(j => [j.id, j]));
        newJadwal.forEach(j => {
          const clean: JadwalPelajaran = {
            ...j,
            jamMulai: normalizeExcelTime(j.jamMulai, '07:15'),
            jamSelesai: normalizeExcelTime(j.jamSelesai, '08:45'),
            jamKe: j.jamKe || `${j.jumlahJam || 2} JP`,
          };
          map.set(clean.id, clean);
        });
        merged = Array.from(map.values());
      } else {
        // Mode 'update' (Anti-Ganda Otomatis):
        // Cocokkan berdasarkan slot kunci [Hari + Kelas + JamMulai] yang dinormalisasi
        const map = new Map<string, JadwalPelajaran>();
        prev.forEach(j => {
          const key = getSlotKey(j);
          if (map.has(key)) {
            // Sudah ada sesi ganda di jadwal lama, tandai ID berlebih untuk dihapus
            obsoleteIds.push(j.id);
          } else {
            map.set(key, j);
          }
        });

        newJadwal.forEach((j, idx) => {
          const clean: JadwalPelajaran = {
            ...j,
            jamMulai: normalizeExcelTime(j.jamMulai, '07:15'),
            jamSelesai: normalizeExcelTime(j.jamSelesai, '08:45'),
            jamKe: j.jamKe || `${j.jumlahJam || 2} JP`,
          };
          const key = getSlotKey(clean);
          const existing = map.get(key);
          if (existing) {
            // Pakai ID yang sudah ada agar menimpa dokumen Firestore tanpa menambah doc baru
            map.set(key, { ...clean, id: existing.id });
          } else {
            map.set(key, { ...clean, id: clean.id || `jp-${Date.now()}-${idx}` });
          }
        });
        merged = Array.from(map.values());
      }

      try {
        localStorage.setItem(STORAGE_KEYS.JADWAL_PELAJARAN, JSON.stringify(merged));
        localStorage.setItem('saved_jadwal_pelajaran_list', JSON.stringify(merged));
      } catch (_) {}

      // Bersihkan dokumen ganda/usang dari Cloud Firestore
      obsoleteIds.forEach(id => {
        removeDocument('jadwal_pelajaran', id).catch(() => {});
      });

      saveBatchDocuments('jadwal_pelajaran', merged).catch(err => console.warn('Sync import jadwal error:', err));
      return merged;
    });
  };

  const handleClearAllJadwalPelajaran = () => {
    const oldIds = jadwalPelajaranList.map(j => j.id);
    setJadwalPelajaranList([]);
    try {
      localStorage.setItem(STORAGE_KEYS.JADWAL_PELAJARAN, JSON.stringify([]));
      localStorage.setItem('saved_jadwal_pelajaran_list', JSON.stringify([]));
    } catch (_) {}
    oldIds.forEach(id => {
      removeDocument('jadwal_pelajaran', id).catch(() => {});
    });
    try {
      if (!isQuotaExhausted()) {
        setDoc(doc(db, 'settings', 'cloud_backup'), { jadwalPelajaranList: [] }, { merge: true }).catch(err => {
          if (isQuotaError(err)) markQuotaExhausted();
        });
      }
    } catch (_) {}
  };

  const handleDeduplicateJadwalPelajaran = (): number => {
    let duplicateCount = 0;
    setJadwalPelajaranList(prev => {
      const getSlotKey = (j: Partial<JadwalPelajaran>) => {
        const h = (j.hari || 'Senin').trim().toLowerCase();
        const rawK = (j.namaKelas || j.idKelas || '')
          .replace(/^kelas\s+/i, '')
          .toLowerCase();
        const k = rawK
          .replace(/\b10\b/g, 'x')
          .replace(/\b11\b/g, 'xi')
          .replace(/\b12\b/g, 'xii')
          .replace(/[^a-z0-9]/g, '');
        const jm = normalizeExcelTime(j.jamMulai || '07:15', '07:15');
        return `${h}|${k}|${jm}`;
      };
      
      const map = new Map<string, JadwalPelajaran>();
      const duplicateIds: string[] = [];

      prev.forEach(j => {
        const clean: JadwalPelajaran = {
          ...j,
          jamMulai: normalizeExcelTime(j.jamMulai, '07:15'),
          jamSelesai: normalizeExcelTime(j.jamSelesai, '08:45'),
          jamKe: j.jamKe || `${j.jumlahJam || 2} JP`,
        };
        const key = getSlotKey(clean);
        if (map.has(key)) {
          duplicateCount++;
          duplicateIds.push(j.id);
        } else {
          map.set(key, clean);
        }
      });

      const uniqueList = Array.from(map.values());
      try {
        localStorage.setItem(STORAGE_KEYS.JADWAL_PELAJARAN, JSON.stringify(uniqueList));
        localStorage.setItem('saved_jadwal_pelajaran_list', JSON.stringify(uniqueList));
      } catch (_) {}

      duplicateIds.forEach(id => {
        removeDocument('jadwal_pelajaran', id).catch(() => {});
      });

      saveBatchDocuments('jadwal_pelajaran', uniqueList).catch(() => {});
      return uniqueList;
    });
    return duplicateCount;
  };

  const handleImportNilai = (newNilai: NilaiMapelSiswa[]) => {
    setNilaiList(prev => {
      const map = new Map(prev.map(n => [n.id, n]));
      newNilai.forEach(n => map.set(n.id, n));
      const merged = Array.from(map.values());
      try {
        localStorage.setItem(STORAGE_KEYS.NILAI, JSON.stringify(merged));
        localStorage.setItem('saved_nilai_list', JSON.stringify(merged));
      } catch (_) {}
      saveBatchDocuments('nilai', merged).catch(err => console.warn('Sync import nilai error:', err));
      return merged;
    });
  };

  const handleResetDatabase = () => {
    setUsersList(INITIAL_USERS);
    setKelasList(INITIAL_KELAS);
    setMapelList(INITIAL_MAPEL);
    setJadwalPelajaranList(INITIAL_JADWAL_PELAJARAN);
    setJadwalUjianList(INITIAL_JADWAL_UJIAN);
    setNilaiList([]);
    setAbsensiList([]);
    setFormulirList(INITIAL_FORMULIR_PPDB);
    setEkskulList(INITIAL_EKSKUL);
    setNilaiEkskulList([]);
    setAbsenMengajarList(INITIAL_ABSEN_MENGAJAR);
    try {
      localStorage.removeItem(STORAGE_KEYS.USERS);
      localStorage.removeItem(STORAGE_KEYS.KELAS);
      localStorage.removeItem(STORAGE_KEYS.MAPEL);
      localStorage.removeItem(STORAGE_KEYS.JADWAL_PELAJARAN);
      localStorage.removeItem(STORAGE_KEYS.JADWAL_UJIAN);
      localStorage.removeItem(STORAGE_KEYS.NILAI);
      localStorage.removeItem(STORAGE_KEYS.ABSENSI);
      localStorage.removeItem(STORAGE_KEYS.FORMULIR_PPDB);
      localStorage.removeItem(STORAGE_KEYS.EKSKUL);
      localStorage.removeItem(STORAGE_KEYS.NILAI_EKSKUL);
      localStorage.removeItem(STORAGE_KEYS.ABSEN_MENGAJAR);
      localStorage.removeItem(STORAGE_KEYS.KENAIKAN_KELAS_LOG);
      saveToStorage(STORAGE_KEYS.DELETED_PPDB, []);
      saveToStorage(STORAGE_KEYS.DELETED_USERS, []);
    } catch (_) {}
  };

  const handleResetNilai = () => {
    const allIds = (nilaiList || []).map(n => n.id).filter(Boolean);
    const allKeys = (nilaiList || []).map(n => getGradeMergeKey(n));
    const prevDeleted = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_NILAI, []);
    const mergedDeleted = Array.from(new Set([...prevDeleted, ...allIds]));
    saveToStorage(STORAGE_KEYS.DELETED_NILAI, mergedDeleted);

    const prevDeletedKeys = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_NILAI_KEYS, []);
    const mergedDeletedKeys = Array.from(new Set([...prevDeletedKeys, ...allKeys]));
    saveToStorage(STORAGE_KEYS.DELETED_NILAI_KEYS, mergedDeletedKeys);
    allKeys.forEach(k => {
      syncDeletedIdToCloud('deleted_nilai_keys', k);
    });

    allIds.forEach(id => {
      syncDeletedIdToCloud('deleted_nilai', id);
      removeDocument('nilai', id).catch(() => {});
    });
    setNilaiList([]);
    saveToStorage(STORAGE_KEYS.NILAI, []);
    try {
      localStorage.setItem('saved_nilai_list', '[]');
    } catch (_) {}
    saveDocument('settings', 'nilai_master', {
      id: 'nilai_master',
      nilaiList: [],
      updatedAt: new Date().toISOString(),
    }).catch(() => {});
  };

  const handleResetAbsensi = () => {
    setAbsensiList([]);
  };

  const handleResetCalonSiswa = () => {
    // 1. Kumpulkan seluruh ID formulir aktif dan ID bawaan template
    const allFormIds = Array.from(new Set([
      ...formulirList.map(f => f.id),
      ...formulirList.map(f => f.nisn).filter(Boolean) as string[],
      ...INITIAL_FORMULIR_PPDB.map(f => f.id),
      'ppdb-1', 'ppdb-2', 'ppdb-3', 'ppdb-4', 'ppdb-5'
    ]));

    const prevDeleted = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_PPDB, []);
    const mergedDeleted = Array.from(new Set([...prevDeleted, ...allFormIds]));
    saveToStorage(STORAGE_KEYS.DELETED_PPDB, mergedDeleted);
    try {
      localStorage.setItem('template_ppdb_dismissed', 'true');
    } catch (_) {}

    // 2. Kumpulkan seluruh ID akun pengguna calon siswa
    const candidateUserIds = usersList.filter(u => u.role === 'calon_siswa').map(u => u.id);
    const templateCandidateUserIds = [
      'u-calon-1',
      'u-calon-2',
      'u-calon-3',
      'u-calon-4',
      'u-calon-5',
      ...INITIAL_FORMULIR_PPDB.map(f => f.userId || `u-calon-${f.id}`)
    ];
    const allCandidateUserIds = Array.from(new Set([...candidateUserIds, ...templateCandidateUserIds]));
    
    const prevDeletedUsers = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_USERS, []);
    const mergedDeletedUsers = Array.from(new Set([...prevDeletedUsers, ...allCandidateUserIds]));
    saveToStorage(STORAGE_KEYS.DELETED_USERS, mergedDeletedUsers);

    // 3. Kosongkan state lokal
    setFormulirList([]);
    const filteredUsers = usersList.filter(u => u.role !== 'calon_siswa');
    setUsersList(filteredUsers);

    // 4. Persistensikan ke LocalStorage
    try {
      localStorage.setItem('saved_formulir_ppdb', JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.FORMULIR_PPDB, JSON.stringify([]));
      localStorage.setItem('saved_users_list', JSON.stringify(filteredUsers));
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(filteredUsers));
    } catch (_) {}

    // 5. Update settings/deleted_records & settings/deleted_ppdb & settings/deleted_users
    syncDeletedListToCloud('deleted_ppdb', allFormIds);
    syncDeletedListToCloud('deleted_users', allCandidateUserIds);
    try {
      if (!isQuotaExhausted()) {
        setDoc(doc(db, 'settings', 'deleted_records'), {
          deleted_ppdb: mergedDeleted,
          deleted_users: mergedDeletedUsers,
          template_ppdb_dismissed: true,
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(() => {});

        setDoc(doc(db, 'settings', 'deleted_ppdb'), {
          ids: mergedDeleted,
          templateDismissed: true,
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(() => {});

        setDoc(doc(db, 'settings', 'cloud_backup'), {
          formulirList: [],
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(() => {});
      }
    } catch (_) {}

    // 6. Hapus dari Cloud Firestore
    allFormIds.forEach(id => removeDocument('formulir_ppdb', id));
    allCandidateUserIds.forEach(uid => removeDocument('users', uid));
  };

  // Bersihkan Seluruh Data Siswa Template / Bawaan Sistem (77 Siswa) Secara Permanen
  const handleClearTemplateStudents = () => {
    const templateIds: string[] = GENERATED_STUDENT_USERS.map(s => s.id);
    const templateNipds: string[] = GENERATED_STUDENT_USERS.map(s => s.nipd).filter(Boolean) as string[];
    const templateNisns: string[] = GENERATED_STUDENT_USERS.map(s => s.nisn).filter(Boolean) as string[];
    const allTemplateTombstones = Array.from(new Set([...templateIds, ...templateNipds, ...templateNisns]));

    const prevDeleted = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_USERS, []);
    const mergedDeleted = Array.from(new Set([...prevDeleted, ...allTemplateTombstones]));
    saveToStorage(STORAGE_KEYS.DELETED_USERS, mergedDeleted);
    try {
      localStorage.setItem('template_students_dismissed', 'true');
    } catch (_) {}

    // Persist ke Cloud Firestore settings/deleted_records & settings/deleted_users
    syncDeletedListToCloud('deleted_users', allTemplateTombstones);
    try {
      if (!isQuotaExhausted()) {
        setDoc(doc(db, 'settings', 'deleted_records'), {
          deleted_users: mergedDeleted,
          template_students_dismissed: true,
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(() => {});

        setDoc(doc(db, 'settings', 'deleted_users'), {
          ids: mergedDeleted,
          templateDismissed: true,
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(() => {});
      }
    } catch (_) {}

    // Bersihkan dari cloud_backup agar tidak pernah muncul lagi dari cadangan cloud
    removeItemFromCloudBackup('usersList', (u) => 
      allTemplateTombstones.includes(u.id) ||
      (u.nipd && allTemplateTombstones.includes(u.nipd)) ||
      (u.nisn && allTemplateTombstones.includes(u.nisn)) ||
      (u.role === 'siswa' && String(u.id).startsWith('u-siswa-'))
    ).catch(() => {});

    // Hapus dokumen siswa template dari Cloud Firestore
    templateIds.forEach(id => removeDocument('users', id));

    // Perbarui state lokal
    setUsersList(prev => {
      const nextList = prev.filter(u => 
        !allTemplateTombstones.includes(u.id) &&
        (!u.nipd || !allTemplateTombstones.includes(u.nipd)) &&
        (!u.nisn || !allTemplateTombstones.includes(u.nisn))
      );
      try {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(nextList));
        localStorage.setItem('saved_users_list', JSON.stringify(nextList));
      } catch (_) {}
      return nextList;
    });
  };

  const handleRestoreAllData = async (backupInput: any) => {
    let backup = backupInput?.data 
      ? backupInput.data 
      : (backupInput?.backup 
        ? backupInput.backup 
        : (backupInput?.payload 
          ? backupInput.payload 
          : (backupInput?.database ? backupInput.database : backupInput)));

    if (Array.isArray(backup)) {
      const isAttendance = backup.some((x: any) => x && (x.tanggal || x.status || x.waktu));
      if (isAttendance) {
        backup = { absensi: backup };
      } else {
        backup = { siswa: backup };
      }
    }
    if (!backup || typeof backup !== 'object') return;

    let restoredUsersList: User[] | null = null;
    let restoredMapelList: Mapel[] | null = null;
    let restoredKelasList: Kelas[] | null = null;
    let restoredJadwalPelajaranList: JadwalPelajaran[] | null = null;
    let restoredJadwalUjianList: JadwalUjianItem[] | null = null;
    let restoredNilaiList: NilaiMapelSiswa[] | null = null;
    let restoredAbsensiList: AbsensiRecord[] | null = null;
    let restoredFormulirList: FormulirPPDB[] | null = null;
    let restoredEkskulList: Ekskul[] | null = null;
    let restoredNilaiEkskulList: NilaiEkskulSiswa[] | null = null;
    let restoredUjianList: PaketUjian[] | null = null;
    let restoredSchoolInfo: SchoolInfo | null = null;

    // 1. PENGGUNA / SISWA / GURU: Mendukung backup.users, backup.usersList, dan kombinasi backup.siswa + backup.guru + backup.staf
    const userMap = new Map<string, User>();
    // Pertahankan akun Administrator utama
    const currentAdmin = usersList.find(u => u.id === 'u-admin' || u.role === 'admin') || INITIAL_USERS[0];
    if (currentAdmin) {
      userMap.set(currentAdmin.id, sanitizeUserAccount(currentAdmin));
    }

    // Smart Merge Protection: Peta data kanonikal guru resmi (menjaga TTL, Tahun Masuk, dan Id Guru)
    const initialGuruById = new Map<string, User>(INITIAL_GURU_USERS.map(g => [g.id, g]));
    const initialGuruByNip = new Map<string, User>(INITIAL_GURU_USERS.filter(g => g.nipOrNis).map(g => [g.nipOrNis!, g]));
    const initialGuruByName = new Map<string, User>(INITIAL_GURU_USERS.map(g => [(g.nama || '').toLowerCase().replace(/[^a-z0-9]/g, ''), g]));
    const currentUsersById = new Map<string, User>(usersList.map(u => [u.id, u]));

    const preserveCanonicalData = (incoming: User): User => {
      if (!incoming) return incoming;
      const normName = (incoming.nama || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const canonicalGuru = initialGuruById.get(incoming.id)
        || (incoming.idGuru ? INITIAL_GURU_USERS.find(g => g.idGuru === incoming.idGuru) : undefined)
        || (incoming.nipOrNis ? initialGuruByNip.get(incoming.nipOrNis) : undefined)
        || (normName ? initialGuruByName.get(normName) : undefined);

      const existingUser = currentUsersById.get(incoming.id) 
        || (normName ? Array.from(currentUsersById.values()).find(u => (u.nama || '').toLowerCase().replace(/[^a-z0-9]/g, '') === normName) : undefined);

      const isTeacher = incoming.role === 'guru' || incoming.role === 'walas' || incoming.role === 'pembina_ekskul' || incoming.role === 'kesiswaan' || !!canonicalGuru;

      if (isTeacher) {
        // Prioritaskan mapelDiampu asli dari berkas cadangan pengguna agar tidak tertimpa template awal
        const incomingMapel = extractTeacherMapelList(incoming);
        const resolvedMapelDiampu = incomingMapel.length > 0 
          ? incomingMapel 
          : (Array.isArray(incoming.mapelDiampu) && incoming.mapelDiampu.length > 0 ? incoming.mapelDiampu : (canonicalGuru?.mapelDiampu || []));

        return sanitizeUserAccount({
          ...(canonicalGuru || {}),
          ...incoming,
          mapelDiampu: resolvedMapelDiampu,
          id: incoming.id || canonicalGuru?.id || existingUser?.id || '',
          tempatLahir: incoming.tempatLahir || existingUser?.tempatLahir || canonicalGuru?.tempatLahir,
          tanggalLahir: incoming.tanggalLahir || existingUser?.tanggalLahir || canonicalGuru?.tanggalLahir,
          tahunMasuk: incoming.tahunMasuk || existingUser?.tahunMasuk || canonicalGuru?.tahunMasuk,
          idGuru: incoming.idGuru || existingUser?.idGuru || canonicalGuru?.idGuru,
          nipOrNis: incoming.idGuru || incoming.nipOrNis || existingUser?.idGuru || existingUser?.nipOrNis || canonicalGuru?.idGuru || canonicalGuru?.nipOrNis || '',
          fotoProfilUrl: incoming.fotoProfilUrl || existingUser?.fotoProfilUrl || canonicalGuru?.fotoProfilUrl,
        });
      }

      // Siswa dan akun lainnya: lindungi NIPD, TTL, foto profil jika ada
      return sanitizeUserAccount({
        ...(existingUser || {}),
        ...incoming,
        role: incoming.role || (incoming.nipd || incoming.kelas ? 'siswa' : (existingUser?.role || 'siswa')),
        nipd: incoming.nipd || existingUser?.nipd || incoming.nipOrNis,
        tempatLahir: incoming.tempatLahir || existingUser?.tempatLahir,
        tanggalLahir: incoming.tanggalLahir || existingUser?.tanggalLahir,
        fotoProfilUrl: incoming.fotoProfilUrl || existingUser?.fotoProfilUrl,
      });
    };

    // A. Masukkan dari users atau usersList atau pengguna jika ada
    const baseUsers = Array.isArray(backup.users) ? backup.users : (Array.isArray(backup.usersList) ? backup.usersList : (Array.isArray(backup.pengguna) ? backup.pengguna : []));
    const siswaArr = Array.isArray(backup.siswa) 
      ? backup.siswa 
      : (Array.isArray(backup.students) 
        ? backup.students 
        : (Array.isArray(backup.dataSiswa) 
          ? backup.dataSiswa 
          : (Array.isArray(backup.murid) ? backup.murid : [])));
    const guruArr = Array.isArray(backup.guru) ? backup.guru : (Array.isArray(backup.teachers) ? backup.teachers : (Array.isArray(backup.dataGuru) ? backup.dataGuru : []));
    const stafArr = Array.isArray(backup.staf) ? backup.staf : [];

    const rawAllIncoming: User[] = [
      currentAdmin,
      ...baseUsers.map(preserveCanonicalData),
      ...guruArr.map(preserveCanonicalData),
      ...stafArr.map(preserveCanonicalData),
      ...siswaArr.map((s: any) => preserveCanonicalData({ ...s, role: 'siswa' }))
    ].filter(Boolean);

    const { uniqueUsers, obsoleteIds } = deduplicateUserAccounts(rawAllIncoming, INITIAL_GURU_USERS);
    restoredUsersList = uniqueUsers.map(sanitizeUserAccount);

    if (restoredUsersList && restoredUsersList.length > 0) {
      setUsersList(restoredUsersList);
      try {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(restoredUsersList));
        localStorage.setItem('saved_users_list', JSON.stringify(restoredUsersList));
        saveToStorage(STORAGE_KEYS.DELETED_USERS, []);
      } catch (_) {}
      obsoleteIds.forEach(oldId => removeDocument('users', oldId).catch(() => {}));
    }

    // 2. MATA PELAJARAN: Mendukung backup.mapelList, backup.mapel, backup.mataPelajaran, backup.subjects
    const rawMapel = backup.mapelList || backup.mapel || backup.mataPelajaran || backup.subjects;
    const baseMapelToUse: Mapel[] = (Array.isArray(rawMapel) && rawMapel.length > 0) ? rawMapel : mapelList;
    
    // SINKRONISASI MUTLAK: Selaraskan Guru Pengampu di Master Mapel dengan Data Guru yang baru dipulihkan
    const activeTeachersRestored = (restoredUsersList || usersList).filter(u => u.role !== 'admin' && u.role !== 'siswa' && u.role !== 'calon_siswa');
    const { updatedMapels: syncedMapelList } = syncMapelsWithTeachers(baseMapelToUse, activeTeachersRestored);

    restoredMapelList = syncedMapelList;
    setMapelList(syncedMapelList);
    try {
      localStorage.setItem(STORAGE_KEYS.MAPEL, JSON.stringify(syncedMapelList));
      saveToStorage(STORAGE_KEYS.DELETED_MAPEL, []);
    } catch (_) {}
    syncedMapelList.forEach(m => saveDocument('mapel', m.id, m).catch(() => {}));

    // 3. KELAS / ROMBEL: Mendukung backup.kelasList, backup.kelas, backup.rombel, backup.classes
    const rawKelas = backup.kelasList || backup.kelas || backup.rombel || backup.classes;
    if (Array.isArray(rawKelas) && rawKelas.length > 0) {
      restoredKelasList = rawKelas;
      setKelasList(rawKelas);
      try {
        localStorage.setItem(STORAGE_KEYS.KELAS, JSON.stringify(rawKelas));
        localStorage.setItem('saved_kelas_list', JSON.stringify(rawKelas));
      } catch (_) {}
    }

    // 4. JADWAL PELAJARAN: Mendukung backup.jadwalPelajaranList, backup.jadwalPelajaran, backup.jadwal, backup.timetable, backup.schedule
    const rawJadwalP = backup.jadwalPelajaranList || backup.jadwalPelajaran || backup.jadwal || backup.timetable || backup.schedule;
    if (Array.isArray(rawJadwalP)) {
      restoredJadwalPelajaranList = rawJadwalP;
      setJadwalPelajaranList(rawJadwalP);
      try { localStorage.setItem(STORAGE_KEYS.JADWAL_PELAJARAN, JSON.stringify(rawJadwalP)); } catch (_) {}
    }

    // 5. JADWAL UJIAN: Mendukung backup.jadwalUjianList, backup.jadwalUjian, backup.examSchedule
    const rawJadwalU = backup.jadwalUjianList || backup.jadwalUjian || backup.examSchedule;
    if (Array.isArray(rawJadwalU)) {
      restoredJadwalUjianList = rawJadwalU;
      setJadwalUjianList(rawJadwalU);
      try { localStorage.setItem(STORAGE_KEYS.JADWAL_UJIAN, JSON.stringify(rawJadwalU)); } catch (_) {}
    }

    // 6. NILAI SISWA / LEGER: Mendukung backup.nilaiList, backup.nilai, backup.leger, backup.dataNilai, backup.grades
    const rawNilai = backup.nilaiList || backup.nilai || backup.leger || backup.dataNilai || backup.grades;
    if (Array.isArray(rawNilai)) {
      restoredNilaiList = rawNilai;
      setNilaiList(rawNilai);
      try {
        localStorage.setItem(STORAGE_KEYS.NILAI, JSON.stringify(rawNilai));
        localStorage.setItem('saved_nilai_list', JSON.stringify(rawNilai));
      } catch (_) {}
    }

    // 7. ABSENSI: Mendukung backup.absensiList, backup.absensi, backup.presensi, backup.attendance, backup.riwayatAbsensi, backup.riwayat_absensi, backup.dataAbsensi, backup.kehadiran, backup.historyAbsen, backup.rekapAbsensi
    const rawAbsensi = backup.absensiList || backup.absensi || backup.presensi || backup.attendance || backup.riwayatAbsensi || backup.riwayat_absensi || backup.dataAbsensi || backup.kehadiran || backup.dataPresensi || backup.historyAbsen || backup.rekapAbsensi || backup.attendances || backup.presensiList;
    if (Array.isArray(rawAbsensi) && rawAbsensi.length > 0) {
      const activeStudentsList = restoredUsersList || usersList;
      const cleanAbsensiList: AbsensiRecord[] = rawAbsensi.map((raw: any, idx: number) => {
        const matched = activeStudentsList.find(s => isRecordForStudent(raw, s));
        const finalUserId = raw.userId || raw.user_id || raw.idSiswa || raw.id_siswa || matched?.id || '';
        const finalNipd = raw.nipd || raw.nip || raw.nis || matched?.nipd || matched?.nipOrNis || '';
        const finalNisn = raw.nisn || matched?.nisn || matched?.username || '';
        const finalNama = raw.namaSiswa || raw.nama || raw.nama_siswa || raw.namaLengkap || matched?.nama || 'Siswa';
        const finalKelas = (raw.kelas || raw.namaKelas || raw.rombel || matched?.kelas || matched?.namaKelas || 'XII').replace(/^Kelas\s+/i, '');
        const finalTanggal = raw.tanggal || raw.date || raw.tgl || getLocalDateString();
        const finalWaktu = raw.waktu || raw.time || raw.jam || '07:00:00';
        const finalStatus = raw.status || raw.keteranganStatus || (raw.hadir ? 'Hadir' : 'Hadir');
        const finalMetode = raw.metode || raw.metodeAbsen || raw.tipe || 'Sistem';
        const finalId = raw.id || `abs-${Date.now()}-${idx}-${finalUserId || 'rec'}`;

        return {
          id: finalId,
          userId: finalUserId,
          nipd: finalNipd,
          nisn: finalNisn,
          namaSiswa: finalNama,
          kelas: finalKelas,
          tanggal: finalTanggal,
          waktu: finalWaktu,
          status: finalStatus,
          metode: finalMetode,
          keterangan: raw.keterangan || (finalStatus === 'Terlambat' ? 'Presensi Terlambat' : 'Hadir Tepat Waktu'),
          petugas: raw.petugas || 'Sistem',
          lokasi: raw.lokasi,
          fotoBukti: raw.fotoBukti,
        };
      });

      restoredAbsensiList = cleanAbsensiList;
      setAbsensiList(cleanAbsensiList);
      try { localStorage.setItem(STORAGE_KEYS.ABSENSI, JSON.stringify(cleanAbsensiList)); } catch (_) {}
    }

    // 8. PPDB / SPMB: Mendukung backup.formulirList, backup.formulirPPDB, backup.ppdb, backup.spmb, backup.calonSiswa, backup.calon_siswa
    const rawPPDB = backup.formulirList || backup.formulirPPDB || backup.ppdb || backup.spmb || backup.calonSiswa || backup.calon_siswa;
    if (Array.isArray(rawPPDB)) {
      restoredFormulirList = rawPPDB;
      setFormulirList(rawPPDB);
      try {
        localStorage.setItem('saved_formulir_ppdb', JSON.stringify(rawPPDB));
        localStorage.setItem(STORAGE_KEYS.FORMULIR_PPDB, JSON.stringify(rawPPDB));
        saveToStorage(STORAGE_KEYS.DELETED_PPDB, []);
      } catch (_) {}
    }

    // 9. EKSTRAKURIKULER: Mendukung backup.ekskulList, backup.ekskul, backup.extracurricular
    const rawEkskul = backup.ekskulList || backup.ekskul || backup.extracurricular;
    if (Array.isArray(rawEkskul)) {
      restoredEkskulList = rawEkskul;
      setEkskulList(rawEkskul);
      try { localStorage.setItem(STORAGE_KEYS.EKSKUL, JSON.stringify(rawEkskul)); } catch (_) {}
    }

    // 10. NILAI EKSTRAKURIKULER: Mendukung backup.nilaiEkskulList dan backup.nilaiEkskul
    const rawNilaiEkskul = backup.nilaiEkskulList || backup.nilaiEkskul;
    if (Array.isArray(rawNilaiEkskul)) {
      restoredNilaiEkskulList = rawNilaiEkskul;
      setNilaiEkskulList(rawNilaiEkskul);
      try {
        localStorage.setItem(STORAGE_KEYS.NILAI_EKSKUL, JSON.stringify(rawNilaiEkskul));
        localStorage.setItem('saved_nilai_ekskul_list', JSON.stringify(rawNilaiEkskul));
      } catch (_) {}
    }

    // 11. UJIAN CAT: Mendukung backup.ujianList, backup.ujian, backup.exams, backup.paketUjian
    const rawUjian = backup.ujianList || backup.ujian || backup.exams || backup.paketUjian;
    if (Array.isArray(rawUjian)) {
      restoredUjianList = rawUjian;
      setUjianList(rawUjian);
      try {
        localStorage.setItem(STORAGE_KEYS.UJIAN, JSON.stringify(rawUjian));
        saveToStorage('bpm_deleted_ujian', []);
      } catch (_) {}
    }

    // 12. PROFIL SEKOLAH / KOP SURAT
    const rawSchool = backup.schoolInfo || backup.sekolah || backup.identitasSekolah || backupInput.schoolInfo;
    if (rawSchool && typeof rawSchool === 'object') {
      restoredSchoolInfo = rawSchool;
      setSchoolInfo(prev => ({ ...prev, ...rawSchool }));
      try { localStorage.setItem('saved_school_info', JSON.stringify(rawSchool)); } catch (_) {}
      saveSchoolInfoToFirestore(rawSchool).catch(() => {});
    }

    // 13. ABSEN & JURNAL MENGAJAR GURU: Mendukung backup.absenMengajarList, backup.absenMengajar, backup.jurnalMengajar
    const rawAbsenM = backup.absenMengajarList || backup.absenMengajar || backup.jurnalMengajar;
    let restoredAbsenMengajarList: AbsenMengajarRecord[] | null = null;
    if (Array.isArray(rawAbsenM)) {
      restoredAbsenMengajarList = rawAbsenM;
      setAbsenMengajarList(rawAbsenM);
      try { localStorage.setItem(STORAGE_KEYS.ABSEN_MENGAJAR, JSON.stringify(rawAbsenM)); } catch (_) {}
    }

    // 14. SINKRONISASI OTOMATIS KE CLOUD FIRESTORE
    // Dilakukan di latar belakang agar proses pemulihan instan dan tidak membuat antarmuka macet/lama
    try {
      console.info('Menyelaraskan data hasil pulihkan cadangan ke Cloud Firestore di latar belakang...');
      syncAllDataToCloud({
        schoolInfo: restoredSchoolInfo || schoolInfo,
        usersList: restoredUsersList || usersList,
        kelasList: restoredKelasList || kelasList,
        mapelList: restoredMapelList || mapelList,
        jadwalPelajaranList: restoredJadwalPelajaranList || jadwalPelajaranList,
        jadwalUjianList: restoredJadwalUjianList || jadwalUjianList,
        nilaiList: restoredNilaiList || nilaiList,
        absensiList: restoredAbsensiList || absensiList,
        formulirList: restoredFormulirList || formulirList,
        ekskulList: restoredEkskulList || ekskulList,
        nilaiEkskulList: restoredNilaiEkskulList || nilaiEkskulList,
        ujianList: restoredUjianList || ujianList,
        absenMengajarList: restoredAbsenMengajarList || absenMengajarList,
      }).then(res => {
        console.info('Sinkronisasi cloud paska restore selesai:', res);
      }).catch(syncErr => {
        console.warn('Sinkronisasi cloud paska restore peringatan:', syncErr);
      });
    } catch (syncErr) {
      console.warn('Sinkronisasi cloud paska restore peringatan:', syncErr);
    }
  };

  // Role switching helper
  const handleSwitchUser = (user: User) => {
    setCurrentUser(user);
    if (user.role === 'admin') {
      setActiveTab('admin');
    } else if (user.role === 'guru') {
      setActiveTab('guru');
    } else if (user.role === 'walas') {
      setActiveTab('walas');
    } else if (user.role === 'siswa') {
      setActiveTab('siswa');
    } else if (user.role === 'calon_siswa') {
      setActiveTab('ppdb');
    } else {
      setActiveTab('web');
    }
  };

  // PPDB Submission Handler with Cloud Persistence
  const handleSaveFormulir = (formulir: FormulirPPDB) => {
    // Unmark from deleted if it was deleted previously
    const currentDeletedPPDB = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_PPDB, []);
    if (currentDeletedPPDB.includes(formulir.id)) {
      saveToStorage(STORAGE_KEYS.DELETED_PPDB, currentDeletedPPDB.filter(id => id !== formulir.id));
    }

    setFormulirList(prev => {
      const idx = prev.findIndex(f => f.id === formulir.id || (f.nisn && f.nisn === formulir.nisn));
      let updated: FormulirPPDB[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = { ...updated[idx], ...formulir };
      } else {
        updated = [formulir, ...prev];
      }
      try {
        localStorage.setItem('saved_formulir_ppdb', JSON.stringify(updated));
        localStorage.setItem(STORAGE_KEYS.FORMULIR_PPDB, JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
    saveDocument('formulir_ppdb', formulir.id, formulir);

    // Auto-create / sync user account for this registrant so they can login immediately with their NISN!
    const targetUserId = formulir.userId && !formulir.userId.startsWith('guest-') ? formulir.userId : `u-calon-${formulir.id}`;
    const calonUser: User = {
      id: targetUserId,
      username: formulir.nisn || (formulir.namaLengkap ? formulir.namaLengkap.toLowerCase().replace(/\s+/g, '_') : 'calon_user'),
      nama: formulir.namaLengkap,
      role: 'calon_siswa',
      nipOrNis: formulir.nisn,
      nisn: formulir.nisn,
      password: 'ppdb',
      email: formulir.emailSiswa || formulir.email,
      telepon: formulir.noHp,
      jurusan: formulir.pilihanJurusan,
      statusAktif: true,
      jenisKelamin: formulir.jenisKelamin,
    };
    setUsersList(prev => {
      const existsIdx = prev.findIndex(u => u.id === targetUserId || (formulir.nisn && (u.username === formulir.nisn || u.nisn === formulir.nisn || u.nipOrNis === formulir.nisn)));
      let nextUsers: User[];
      if (existsIdx >= 0) {
        nextUsers = [...prev];
        nextUsers[existsIdx] = { ...nextUsers[existsIdx], ...calonUser, password: nextUsers[existsIdx].password || 'ppdb' };
      } else {
        nextUsers = [...prev, calonUser];
      }
      try {
        localStorage.setItem('saved_users_list', JSON.stringify(nextUsers));
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(nextUsers));
      } catch (_) {}
      return nextUsers;
    });
    saveDocument('users', targetUserId, calonUser);
  };

  // Calon Siswa dynamic creation upon registering in PPDB / Login
  const handleRegisterCalonSiswa = (newCalon: User, initialPPDBData?: any) => {
    setUsersList(prev => [...prev, newCalon]);
    saveDocument('users', newCalon.id, newCalon);
    setCurrentUser(newCalon);
    
    if (initialPPDBData) {
      const newForm: FormulirPPDB = {
        id: `ppdb-${Date.now()}`,
        userId: newCalon.id,
        pilihanJurusan: (initialPPDBData.pilihanJurusan as any) || 'Farmasi',
        statusPendaftaran: 'Menunggu_Verifikasi',
        tanggalDaftar: new Date().toISOString().replace('T', ' ').substring(0, 16),
        nisn: newCalon.nipOrNis,
        nikSiswa: '3201234567890001',
        noKk: '3201234567890002',
        namaLengkap: newCalon.nama,
        namaPanggilan: newCalon.nama.split(' ')[0],
        tempatLahir: 'Bogor',
        tanggalLahir: '2009-01-01',
        jenisKelamin: 'Laki-laki',
        tinggiBadan: 160,
        beratBadan: 50,
        wargaNegara: 'WNI',
        noHp: initialPPDBData.noHpSiswa || '08123456789',
        email: `${newCalon.username}@gmail.com`,
        jumlahSaudara: 2,
        anakKe: 1,
        agama: 'Islam',
        hobi: 'Membaca',
        citaCita: 'Tenaga Kesehatan',
        prestasi: '-',
        jarakSekolah: '1-3 Km',
        transportasi: 'Motor',
        alamatLengkap: 'Jl. Sawah, Kp. Sukasari, Desa Kabasiran',
        rt: '06',
        rw: '01',
        noRumah: '12',
        kodePos: '16360',
        desa: 'Kabasiran',
        kecKab: 'Parung Panjang, Bogor',
        penyakitBerat: 'Tidak Ada',
        alergi: 'Tidak Ada',
        namaOrganisasi: 'OSIS',
        jabatanOrganisasi: 'Anggota',
        tahunLulusSd: '2020',
        tahunLulusSmp: '2026',
        asalSmp: initialPPDBData.asalSmp || 'SMP Negeri 1 Parung Panjang',
        noSeriIjazah: '-',
        namaAyah: 'Bapak Murid',
        nikAyah: '3201234567890003',
        namaIbu: 'Ibu Murid',
        nikIbu: '3201234567890004',
        noTelpOrtu: initialPPDBData.noHpSiswa || '08123456789',
        alamatOrtu: 'Jl. Sawah, Kp. Sukasari, Desa Kabasiran, Parung Panjang',
        pendidikanAyah: 'SMA / Sederajat',
        pendidikanIbu: 'SMA / Sederajat',
        pekerjaanAyah: 'Wiraswasta',
        pekerjaanIbu: 'Ibu Rumah Tangga',
        pendapatanAyah: 'Rp 3.000.000 - Rp 5.000.000',
        pendapatanIbu: '< Rp 1.000.000',
      };
      // Unmark from deleted if present
      const currentDeletedPPDB = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_PPDB, []);
      if (currentDeletedPPDB.includes(newForm.id)) {
        saveToStorage(STORAGE_KEYS.DELETED_PPDB, currentDeletedPPDB.filter(id => id !== newForm.id));
      }
      setFormulirList(prev => {
        const next = [newForm, ...prev];
        try {
          localStorage.setItem('saved_formulir_ppdb', JSON.stringify(next));
          localStorage.setItem(STORAGE_KEYS.FORMULIR_PPDB, JSON.stringify(next));
        } catch (_) {}
        return next;
      });
      saveDocument('formulir_ppdb', newForm.id, newForm);
    }

    setActiveTab('ppdb');
  };

  const [loginWelcomeNotice, setLoginWelcomeNotice] = useState<{ title: string; message: string; isBirthday: boolean } | null>(null);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('active_user_session_id', user.id);
      localStorage.removeItem('is_explicitly_logged_out');
    } catch (_) {}

    // Sapaan Selamat Pagi/Siang/Sore/Petang/Malam dan Ucapan Ulang Tahun
    const { greeting, isBirthday, birthdayMessage } = getGreetingAndBirthday(user);
    setLoginWelcomeNotice({
      title: isBirthday ? `🎉 Selamat Ulang Tahun & ${greeting}!` : `${greeting}, ${user.nama}!`,
      message: isBirthday 
        ? (birthdayMessage || `Selamat Ulang Tahun, ${user.nama}! Semoga senantiasa panjang umur, sehat dan berprestasi bersama SMK Bakti Putra Mandiri.`)
        : `Selamat datang di Portal Terpadu SMK Bakti Putra Mandiri.`,
      isBirthday
    });
    setTimeout(() => setLoginWelcomeNotice(null), 6000);

    if (user.role === 'admin' || user.role === 'operator') {
      setActiveTab('admin');
    } else if (user.role === 'guru' || user.role === 'pembina_ekskul' || user.role === 'kesiswaan' || user.role === 'kepala_sekolah' || user.role === 'bendahara' || user.role === 'staf') {
      setActiveTab('guru');
    } else if (user.role === 'walas') {
      setActiveTab('walas');
    } else if (user.role === 'siswa') {
      setActiveTab('siswa');
    } else if (user.role === 'calon_siswa') {
      setActiveTab('ppdb');
    } else {
      setActiveTab('web');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    logoutFirebase();
    try {
      localStorage.removeItem('active_user_session_id');
      localStorage.removeItem('active_user_session');
      localStorage.setItem('is_explicitly_logged_out', 'true');
    } catch (_) {}
    setActiveTab('login');
  };

  // CMS Content Handlers with Cloud Persistence
  const handleSaveKonten = (konten: KontenWeb) => {
    setKontenList(prev => [konten, ...prev]);
    saveDocument('konten', konten.id, konten);
  };

  const handleDeleteKonten = (id: string) => {
    const deleted = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_KONTEN, []);
    if (!deleted.includes(id)) {
      saveToStorage(STORAGE_KEYS.DELETED_KONTEN, [...deleted, id]);
      syncDeletedIdToCloud('deleted_konten', id);
    }
    setKontenList(prev => prev.filter(k => k.id !== id));
    removeDocument('konten', id);
  };

  // CAT Exam Handlers with Cloud Persistence
  const handleSaveUjian = (ujian: PaketUjian) => {
    const deleted = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_UJIAN, []);
    if (deleted.includes(ujian.id)) {
      saveToStorage(STORAGE_KEYS.DELETED_UJIAN, deleted.filter(id => id !== ujian.id));
    }
    setUjianList(prev => {
      const idx = prev.findIndex(u => u.id === ujian.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = ujian;
        return copy;
      }
      return [ujian, ...prev];
    });
    saveDocument('ujian', ujian.id, ujian);
  };

  const handleDeleteUjian = (ujianId: string) => {
    const deleted = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_UJIAN, []);
    if (!deleted.includes(ujianId)) {
      saveToStorage(STORAGE_KEYS.DELETED_UJIAN, [...deleted, ujianId]);
      syncDeletedIdToCloud('deleted_ujian', ujianId);
    }
    setUjianList(prev => prev.filter(u => u.id !== ujianId));
    removeDocument('ujian', ujianId);
  };

  const handleFinishUjian = (hasil: HasilUjian) => {
    setHasilList(prev => [hasil, ...prev]);
    saveDocument('hasil_ujian', hasil.id, hasil);
  };

  // PPDB Admin Status Update with Cloud Persistence
  const handleUpdatePPDBStatus = (
    formId: string, 
    status: FormulirPPDB['statusPendaftaran'], 
    catatan?: string
  ) => {
    setFormulirList(prev => prev.map(f => {
      if (f.id === formId) {
        const isVerifiedOrAccepted = status === 'Terverifikasi' || status === 'Diterima';
        const updated = {
          ...f,
          statusPendaftaran: status,
          tanggalVerifikasi: isVerifiedOrAccepted ? (f.tanggalVerifikasi || new Date().toISOString().substring(0, 10)) : f.tanggalVerifikasi,
          emailNotifikasiTerkirim: isVerifiedOrAccepted ? true : f.emailNotifikasiTerkirim,
          emailNotifikasiWaktu: isVerifiedOrAccepted ? new Date().toISOString().replace('T', ' ').substring(0, 16) : f.emailNotifikasiWaktu,
          catatanAdmin: catatan || f.catatanAdmin,
        };
        saveDocument('formulir_ppdb', formId, updated);
        return updated;
      }
      return f;
    }));
  };

  // Calon Siswa Comprehensive Update (from Admin or Self-Service)
  const handleUpdateCalonSiswa = (updatedForm: FormulirPPDB) => {
    setFormulirList(prev => {
      const idx = prev.findIndex(f => f.id === updatedForm.id || (f.nisn && f.nisn === updatedForm.nisn));
      let nextList: FormulirPPDB[];
      if (idx >= 0) {
        nextList = [...prev];
        nextList[idx] = { ...nextList[idx], ...updatedForm };
      } else {
        nextList = [updatedForm, ...prev];
      }
      try {
        localStorage.setItem('saved_formulir_ppdb', JSON.stringify(nextList));
        localStorage.setItem(STORAGE_KEYS.FORMULIR_PPDB, JSON.stringify(nextList));
      } catch (_) {}
      return nextList;
    });
    saveDocument('formulir_ppdb', updatedForm.id, updatedForm);

    // Synchronize linked user profile if exists
    setUsersList(prev => {
      const targetIdx = prev.findIndex(u =>
        (updatedForm.userId && u.id === updatedForm.userId) ||
        (updatedForm.nisn && (u.username === updatedForm.nisn || u.nipOrNis === updatedForm.nisn))
      );
      if (targetIdx >= 0) {
        const copy = [...prev];
        copy[targetIdx] = {
          ...copy[targetIdx],
          nama: updatedForm.namaLengkap,
          nipOrNis: updatedForm.nisn,
          username: updatedForm.nisn || copy[targetIdx].username,
        };
        saveDocument('users', copy[targetIdx].id, copy[targetIdx]);
        try {
          localStorage.setItem('saved_users_list', JSON.stringify(copy));
        } catch (_) {}
        return copy;
      }
      return prev;
    });

    // If current logged-in user is this student, also update currentUser
    if (currentUser && (
      (updatedForm.userId && currentUser.id === updatedForm.userId) ||
      (updatedForm.nisn && (currentUser.username === updatedForm.nisn || currentUser.nipOrNis === updatedForm.nisn))
    )) {
      setCurrentUser(prev => prev ? ({
        ...prev,
        nama: updatedForm.namaLengkap,
        nipOrNis: updatedForm.nisn,
      }) : null);
    }
  };

  // Master Data Add & Update Handlers
  const handleAddUser = (user: User) => {
    // If re-adding or adding a teacher, ensure it is not blocked by deleted list
    const deletedUserIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_USERS, []);
    if (deletedUserIds.includes(user.id)) {
      saveToStorage(STORAGE_KEYS.DELETED_USERS, deletedUserIds.filter(id => id !== user.id));
    }
    setUsersList(prev => {
      const sanitized = sanitizeUserAccount(user);
      const nextList = [sanitized, ...prev.filter(u => u.id !== user.id)];
      try {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(nextList));
        localStorage.setItem('saved_users_list', JSON.stringify(nextList));
      } catch (_) {}
      saveDocument('users', user.id, sanitized).catch(err => console.warn('Save user sync error:', err));
      return nextList;
    });
  };

  const handleUpdateUser = (updatedUser: User) => {
    const now = new Date().toISOString();
    const sanitized = sanitizeUserAccount({
      ...updatedUser,
      updatedAt: updatedUser.updatedAt || now
    });
    setUsersList(prev => {
      // Find all duplicate account IDs for this user (by NIP, idGuru, or username)
      const duplicateIds: string[] = [];
      prev.forEach(u => {
        if (
          u.id !== sanitized.id &&
          (
            (u.nipOrNis && sanitized.nipOrNis && u.nipOrNis === sanitized.nipOrNis) ||
            (u.idGuru && sanitized.idGuru && u.idGuru === sanitized.idGuru) ||
            (u.username && sanitized.username && u.username === sanitized.username)
          )
        ) {
          duplicateIds.push(u.id);
        }
      });

      let nextList: User[];
      const idx = prev.findIndex(u => 
        u.id === sanitized.id || 
        (u.nipOrNis && sanitized.nipOrNis && u.nipOrNis === sanitized.nipOrNis)
      );

      if (idx >= 0) {
        nextList = prev
          .filter(u => u.id === sanitized.id || !duplicateIds.includes(u.id))
          .map(u => (u.id === sanitized.id || (u.nipOrNis && sanitized.nipOrNis && u.nipOrNis === sanitized.nipOrNis) ? sanitized : u));
      } else {
        nextList = [sanitized, ...prev.filter(u => !duplicateIds.includes(u.id))];
      }

      // Remove obsolete duplicate document IDs from Firestore
      if (duplicateIds.length > 0) {
        duplicateIds.forEach(oldId => removeDocument('users', oldId).catch(() => {}));
      }

      try {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(nextList));
        localStorage.setItem('saved_users_list', JSON.stringify(nextList));
      } catch (_) {}
      saveDocument('users', sanitized.id, sanitized).catch(err => console.warn('Update user sync error:', err));
      return nextList;
    });

    // Cross-synchronize kelasList when a teacher account is updated
    if (sanitized.role === 'guru' || sanitized.role === 'walas' || sanitized.role === 'staf' || sanitized.role === 'pembina_ekskul' || sanitized.role === 'kesiswaan') {
      setKelasList(prevKelas => {
        let changed = false;
        const assignedIds = (sanitized.walasKelasIds && Array.isArray(sanitized.walasKelasIds) && sanitized.walasKelasIds.length > 0)
          ? sanitized.walasKelasIds
          : (sanitized.walasKelasId ? [sanitized.walasKelasId] : (sanitized.idKelas ? [sanitized.idKelas] : []));
        const isWaliTeacher = Boolean((sanitized.role === 'walas' || sanitized.isWalas) && assignedIds.length > 0);

        const nextKelas = prevKelas.map(k => {
          const isAssignedNow = isWaliTeacher && assignedIds.includes(k.id);
          const wasAssigned = 
            k.idWalas === sanitized.id ||
            (sanitized.nipOrNis && k.idWalas === sanitized.nipOrNis) ||
            (k.namaWalas && sanitized.nama && k.namaWalas.trim().toLowerCase() === sanitized.nama.trim().toLowerCase());

          if (isAssignedNow) {
            if (k.idWalas !== sanitized.id || k.namaWalas !== sanitized.nama) {
              changed = true;
              return { ...k, idWalas: sanitized.id, namaWalas: sanitized.nama };
            }
          } else if (wasAssigned && (!isWaliTeacher || !assignedIds.includes(k.id))) {
            changed = true;
            return { ...k, idWalas: '', namaWalas: '' };
          }
          return k;
        });

        if (changed) {
          try {
            localStorage.setItem(STORAGE_KEYS.KELAS, JSON.stringify(nextKelas));
            localStorage.setItem('saved_kelas_list', JSON.stringify(nextKelas));
          } catch (_) {}
          nextKelas.forEach(k => saveDocument('kelas', k.id, k).catch(err => console.warn('Sync kelas error:', err)));
          return nextKelas;
        }
        return prevKelas;
      });
    }

    if (currentUser && (currentUser.id === sanitized.id || currentUser.username === sanitized.username || (currentUser.nipOrNis && sanitized.nipOrNis && currentUser.nipOrNis === sanitized.nipOrNis))) {
      setCurrentUser(sanitized);
    }
  };

  const handleSaveUsersList = (newUsers: User[]) => {
    const sanitized = newUsers.map(sanitizeUserAccount);
    setUsersList(sanitized);
    try {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(sanitized));
      localStorage.setItem('saved_users_list', JSON.stringify(sanitized));
    } catch (_) {}
    saveBatchDocuments('users', sanitized).catch(err => console.warn('Sync user error:', err));
  };

  const handleDeleteUser = (userId: string) => {
    if (userId === 'u-admin') return;
    const targetUser = usersList.find(u => u.id === userId);
    const deletedUserIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_USERS, []);
    const idsToTombstone = [userId];
    if (targetUser?.username) idsToTombstone.push(targetUser.username);
    if (targetUser?.nipd) idsToTombstone.push(targetUser.nipd);
    if (targetUser?.nisn) idsToTombstone.push(targetUser.nisn);
    if (targetUser?.nipOrNis) idsToTombstone.push(targetUser.nipOrNis);

    const updatedDeleted = Array.from(new Set([...deletedUserIds, ...idsToTombstone]));
    saveToStorage(STORAGE_KEYS.DELETED_USERS, updatedDeleted);

    if (targetUser?.role === 'siswa') {
      try {
        localStorage.setItem('template_students_dismissed', 'true');
      } catch (_) {}
    }

    // 1. Sync tombstoned IDs to Cloud Firestore deleted_records
    syncDeletedListToCloud('deleted_users', idsToTombstone);

    // 2. Persist to Cloud Firestore settings/deleted_users and settings/deleted_records
    try {
      if (!isQuotaExhausted()) {
        setDoc(doc(db, 'settings', 'deleted_users'), {
          ids: updatedDeleted,
          templateDismissed: true,
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(err => {
          if (isQuotaError(err)) markQuotaExhausted();
        });

        if (targetUser?.role === 'siswa') {
          setDoc(doc(db, 'settings', 'deleted_records'), {
            template_students_dismissed: true,
            updatedAt: new Date().toISOString()
          }, { merge: true }).catch(() => {});
        }
      }
    } catch (_) {}

    // 3. Remove deleted student/user from settings/cloud_backup immediately to prevent resurrection tomorrow
    removeItemFromCloudBackup('usersList', (u) => 
      u.id === userId || 
      idsToTombstone.includes(u.id) ||
      (u.username && idsToTombstone.includes(u.username)) ||
      (u.nipd && idsToTombstone.includes(u.nipd)) ||
      (u.nisn && idsToTombstone.includes(u.nisn)) ||
      (u.nipOrNis && idsToTombstone.includes(u.nipOrNis))
    ).catch(() => {});

    // 4. Update local state
    setUsersList(prev => {
      const nextList = prev.filter(u => 
        u.id !== userId && 
        !idsToTombstone.includes(u.id) &&
        (!u.username || !idsToTombstone.includes(u.username)) &&
        (!u.nipd || !idsToTombstone.includes(u.nipd)) &&
        (!u.nisn || !idsToTombstone.includes(u.nisn)) &&
        (!u.nipOrNis || !idsToTombstone.includes(u.nipOrNis))
      );
      try {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(nextList));
        localStorage.setItem('saved_users_list', JSON.stringify(nextList));
      } catch (_) {}
      removeDocument('users', userId).catch(err => console.warn('Delete user error:', err));
      return nextList;
    });
  };

  const handleAddMapel = (mapel: Mapel) => {
    const deleted = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_MAPEL, []);
    if (deleted.includes(mapel.id)) {
      saveToStorage(STORAGE_KEYS.DELETED_MAPEL, deleted.filter(id => id !== mapel.id));
    }
    setMapelList(prev => {
      const next = [mapel, ...prev.filter(m => m.id !== mapel.id)];
      try {
        localStorage.setItem(STORAGE_KEYS.MAPEL, JSON.stringify(next));
      } catch (_) {}
      saveToStorage(STORAGE_KEYS.MAPEL, next);
      return next;
    });
    saveDocument('mapel', mapel.id, mapel).catch(err => console.warn('Add mapel sync error:', err));
  };

  const handleUpdateMapel = (mapel: Mapel) => {
    setMapelList(prev => {
      const next = prev.map(m => m.id === mapel.id ? mapel : m);
      try {
        localStorage.setItem(STORAGE_KEYS.MAPEL, JSON.stringify(next));
      } catch (_) {}
      saveToStorage(STORAGE_KEYS.MAPEL, next);
      return next;
    });
    saveDocument('mapel', mapel.id, mapel).catch(err => console.warn('Update mapel sync error:', err));
  };

  const handleDeleteMapel = (mapelId: string) => {
    const deleted = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_MAPEL, []);
    if (!deleted.includes(mapelId)) {
      saveToStorage(STORAGE_KEYS.DELETED_MAPEL, [...deleted, mapelId]);
      syncDeletedIdToCloud('deleted_mapel', mapelId);
    }
    setMapelList(prev => {
      const next = prev.filter(m => m.id !== mapelId);
      try {
        localStorage.setItem(STORAGE_KEYS.MAPEL, JSON.stringify(next));
      } catch (_) {}
      saveToStorage(STORAGE_KEYS.MAPEL, next);
      return next;
    });
    removeDocument('mapel', mapelId).catch(err => console.warn('Delete mapel sync error:', err));
  };

  const handleSyncMapel = () => {
    // True Synchronization:
    // 1. Keep ALL current mapels (including all custom and user added mapels)
    // 2. Merge in any missing standard DAPODIK subjects from INITIAL_MAPEL (except deleted ones)
    // 3. Selaraskan guruPengampu dengan penugasan mapel di Data Guru (usersList)
    // 4. Save to localStorage & Firestore cloud
    const deleted = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_MAPEL, []);
    setMapelList(prev => {
      const map = new Map<string, Mapel>();
      INITIAL_MAPEL.forEach(m => {
        if (!deleted.includes(m.id)) map.set(m.id, m);
      });
      prev.forEach(m => {
        if (!deleted.includes(m.id)) {
          const init = map.get(m.id);
          map.set(m.id, {
            ...init,
            ...m,
          });
        }
      });
      const merged = Array.from(map.values()).map(sanitizeMapelItem);
      const activeTeachers = usersList.filter(u => u.role !== 'admin' && u.role !== 'siswa' && u.role !== 'calon_siswa');
      const { updatedMapels } = syncMapelsWithTeachers(merged, activeTeachers);

      try {
        localStorage.setItem(STORAGE_KEYS.MAPEL, JSON.stringify(updatedMapels));
      } catch (_) {}
      saveToStorage(STORAGE_KEYS.MAPEL, updatedMapels);
      updatedMapels.forEach(m => saveDocument('mapel', m.id, m).catch(err => console.warn('Sync mapel error:', err)));
      return updatedMapels;
    });
  };

  const handleResetToDefaultMapel = () => {
    // Safely sync without wiping user created mapels
    handleSyncMapel();
  };

  const handleAddKelas = (kelas: Kelas) => {
    setKelasList(prev => [...prev, kelas]);
    saveDocument('kelas', kelas.id, kelas).catch(err => console.warn('Add kelas sync error:', err));
  };

  const handleUpdateKelas = (kelas: Kelas) => {
    setKelasList(prev => {
      const nextList = prev.map(k => k.id === kelas.id ? kelas : k);
      try {
        localStorage.setItem(STORAGE_KEYS.KELAS, JSON.stringify(nextList));
        localStorage.setItem('saved_kelas_list', JSON.stringify(nextList));
      } catch (_) {}
      saveDocument('kelas', kelas.id, kelas).catch(err => console.warn('Update kelas sync error:', err));
      return nextList;
    });

    // Cross-sync teachers who hold walas
    setUsersList(prevUsers => {
      let changed = false;
      const nextUsers = prevUsers.map(u => {
        if (u.role === 'siswa' || u.role === 'calon_siswa' || u.role === 'admin') return u;
        const isAssigned = (kelas.idWalas && (kelas.idWalas === u.id || (u.nipOrNis && kelas.idWalas === u.nipOrNis))) ||
          (kelas.namaWalas && u.nama && kelas.namaWalas.trim().toLowerCase() === u.nama.trim().toLowerCase());
        const hadClass = (u.walasKelasIds || []).includes(kelas.id) || u.walasKelasId === kelas.id;
        
        if (isAssigned && !hadClass) {
          changed = true;
          const nextIds = [...(u.walasKelasIds || []).filter(id => id !== kelas.id), kelas.id];
          return {
            ...u,
            isWalas: true,
            role: 'walas' as UserRole,
            walasKelasId: nextIds[0],
            walasKelasIds: nextIds,
            walasNamaKelas: kelas.namaKelas,
            jabatanTambahan: u.jabatanTambahan
          };
        } else if (!isAssigned && hadClass) {
          changed = true;
          const nextIds = (u.walasKelasIds || []).filter(id => id !== kelas.id);
          const stillWalas = nextIds.length > 0;
          return {
            ...u,
            isWalas: stillWalas,
            role: (stillWalas ? 'walas' : (u.role === 'walas' ? 'guru' : u.role)) as UserRole,
            walasKelasId: stillWalas ? nextIds[0] : undefined,
            walasKelasIds: nextIds,
            walasNamaKelas: stillWalas ? u.walasNamaKelas : undefined,
            jabatanTambahan: u.jabatanTambahan
          };
        }
        return u;
      });

      if (changed) {
        try {
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(nextUsers));
          localStorage.setItem('saved_users_list', JSON.stringify(nextUsers));
        } catch (_) {}
        // Only save users whose walas assignment actually changed to avoid unnecessary network congestion and overwrite races
        const changedUsers = nextUsers.filter(u => {
          const old = prevUsers.find(p => p.id === u.id);
          return old && (old.isWalas !== u.isWalas || old.walasKelasId !== u.walasKelasId || old.role !== u.role);
        });
        changedUsers.forEach(u => saveDocument('users', u.id, u).catch(err => console.warn('Sync user error:', err)));
        return nextUsers;
      }
      return prevUsers;
    });
  };

  const handleDeleteKelas = (kelasId: string) => {
    const deleted = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_KELAS, []);
    if (!deleted.includes(kelasId)) {
      saveToStorage(STORAGE_KEYS.DELETED_KELAS, [...deleted, kelasId]);
      syncDeletedIdToCloud('deleted_kelas', kelasId);
    }
    setKelasList(prev => {
      const next = prev.filter(k => k.id !== kelasId);
      try {
        localStorage.setItem(STORAGE_KEYS.KELAS, JSON.stringify(next));
        localStorage.setItem('saved_kelas_list', JSON.stringify(next));
      } catch (_) {}
      saveToStorage(STORAGE_KEYS.KELAS, next);
      return next;
    });
    removeDocument('kelas', kelasId).catch(err => console.warn('Delete kelas error:', err));
  };

  // Jadwal Pelajaran Handlers with Automatic Cloud Sync
  const handleSaveJadwalPelajaran = (jadwal: JadwalPelajaran) => {
    const cleanJadwal: JadwalPelajaran = {
      ...jadwal,
      jamMulai: normalizeExcelTime(jadwal.jamMulai, '07:15'),
      jamSelesai: normalizeExcelTime(jadwal.jamSelesai, '08:45'),
      jamKe: jadwal.jamKe || `${jadwal.jumlahJam || 2} JP`,
    };
    // If previously deleted, unmark from deleted list
    const deletedIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_JADWAL_PELAJARAN, []);
    if (deletedIds.includes(cleanJadwal.id)) {
      saveToStorage(STORAGE_KEYS.DELETED_JADWAL_PELAJARAN, deletedIds.filter(id => id !== cleanJadwal.id));
    }
    setJadwalPelajaranList(prev => {
      const idx = prev.findIndex(j => j.id === cleanJadwal.id);
      let nextList: JadwalPelajaran[];
      if (idx >= 0) {
        nextList = [...prev];
        nextList[idx] = cleanJadwal;
      } else {
        nextList = [cleanJadwal, ...prev];
      }
      try {
        localStorage.setItem(STORAGE_KEYS.JADWAL_PELAJARAN, JSON.stringify(nextList));
      } catch (_) {}
      saveToStorage(STORAGE_KEYS.JADWAL_PELAJARAN, nextList);
      saveDocument('jadwal_pelajaran', cleanJadwal.id, cleanJadwal).catch(err => console.warn('Save jadwal sync error:', err));
      return nextList;
    });
  };

  const handleDeleteJadwalPelajaran = (id: string) => {
    const deleted = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_JADWAL_PELAJARAN, []);
    if (!deleted.includes(id)) {
      saveToStorage(STORAGE_KEYS.DELETED_JADWAL_PELAJARAN, [...deleted, id]);
      syncDeletedIdToCloud('deleted_jadwal_pelajaran', id);
    }
    setJadwalPelajaranList(prev => {
      const nextList = prev.filter(j => j.id !== id);
      try {
        localStorage.setItem(STORAGE_KEYS.JADWAL_PELAJARAN, JSON.stringify(nextList));
        localStorage.setItem('saved_jadwal_pelajaran_list', JSON.stringify(nextList));
      } catch (_) {}
      saveToStorage(STORAGE_KEYS.JADWAL_PELAJARAN, nextList);
      removeDocument('jadwal_pelajaran', id).catch(err => console.warn('Delete jadwal sync error:', err));
      return nextList;
    });
  };

  // Jadwal Ujian Handlers with Automatic Cloud Sync
  const handleSaveJadwalUjian = (jadwal: JadwalUjianItem) => {
    const deletedIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_JADWAL_UJIAN, []);
    if (deletedIds.includes(jadwal.id)) {
      saveToStorage(STORAGE_KEYS.DELETED_JADWAL_UJIAN, deletedIds.filter(id => id !== jadwal.id));
    }
    setJadwalUjianList(prev => {
      const idx = prev.findIndex(j => j.id === jadwal.id);
      let nextList: JadwalUjianItem[];
      if (idx >= 0) {
        nextList = [...prev];
        nextList[idx] = jadwal;
      } else {
        nextList = [jadwal, ...prev];
      }
      try {
        localStorage.setItem(STORAGE_KEYS.JADWAL_UJIAN, JSON.stringify(nextList));
      } catch (_) {}
      saveToStorage(STORAGE_KEYS.JADWAL_UJIAN, nextList);
      saveDocument('jadwal_ujian', jadwal.id, jadwal).catch(err => console.warn('Save jadwal ujian sync error:', err));
      return nextList;
    });
  };

  const handleDeleteJadwalUjian = (id: string) => {
    const deleted = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_JADWAL_UJIAN, []);
    if (!deleted.includes(id)) {
      saveToStorage(STORAGE_KEYS.DELETED_JADWAL_UJIAN, [...deleted, id]);
      syncDeletedIdToCloud('deleted_jadwal_ujian', id);
    }
    setJadwalUjianList(prev => {
      const nextList = prev.filter(j => j.id !== id);
      try {
        localStorage.setItem(STORAGE_KEYS.JADWAL_UJIAN, JSON.stringify(nextList));
        localStorage.setItem('saved_jadwal_ujian_list', JSON.stringify(nextList));
      } catch (_) {}
      saveToStorage(STORAGE_KEYS.JADWAL_UJIAN, nextList);
      removeDocument('jadwal_ujian', id).catch(err => console.warn('Delete jadwal ujian sync error:', err));
      return nextList;
    });
  };

  // Identitas Sekolah & Tahun Ajaran Update
  const handleUpdateSchoolInfo = (newInfo: SchoolInfo) => {
    const cleanNama = newInfo.nama?.trim() || 'SMK';
    const cleanNamaLengkap = newInfo.namaLengkap?.trim() || cleanNama;

    const farmasi = Number(newInfo.kuotaJurusan?.farmasi ?? newInfo.kuotaPerJurusan?.farmasi ?? 72);
    const keperawatan = Number(newInfo.kuotaJurusan?.keperawatan ?? newInfo.kuotaPerJurusan?.asistenKeperawatan ?? 72);
    const kecantikan = Number(newInfo.kuotaJurusan?.kecantikan ?? newInfo.kuotaPerJurusan?.tataKecantikan ?? 36);
    const perhotelan = Number(newInfo.kuotaJurusan?.perhotelan ?? newInfo.kuotaPerJurusan?.perhotelan ?? 36);
    const totalKuota = (farmasi + keperawatan + kecantikan + perhotelan) || newInfo.kuotaSPMB || 216;

    const rombelFarmasi = Number(newInfo.rombelJurusan?.farmasi ?? 2);
    const rombelKeperawatan = Number(newInfo.rombelJurusan?.keperawatan ?? 2);
    const rombelKecantikan = Number(newInfo.rombelJurusan?.kecantikan ?? 1);
    const rombelPerhotelan = Number(newInfo.rombelJurusan?.perhotelan ?? 1);

    const gelombangList = (newInfo.gelombangList && newInfo.gelombangList.length > 0)
      ? newInfo.gelombangList
      : (schoolInfo.gelombangList || []);

    const cleanYayasan = newInfo.kopSekolah?.yayasan?.trim() || 'YAYASAN PENDIDIKAN';
    const cleanInstansi = newInfo.kopSekolah?.instansi?.trim() || cleanNama.toUpperCase();
    const cleanSubJudul = newInfo.kopSekolah?.subJudul?.trim() || 'KOMPETENSI KEAHLIAN VOKASI & KEJURUAN TERPADU';
    const cleanTeleponEmail = newInfo.kopSekolah?.teleponEmail?.trim() || `${newInfo.alamatLengkap || newInfo.alamat} | Telp: ${newInfo.telepon}`;

    const finalLogoUrl = newInfo.logoUrl || newInfo.logoKiriUrl || newInfo.logoSekolah || schoolInfo.logoUrl || '/logo_bpm.png';
    const finalLogoKananUrl = newInfo.logoKananUrl !== undefined 
      ? newInfo.logoKananUrl 
      : (newInfo.kopSekolah?.logoKananUrl !== undefined ? newInfo.kopSekolah.logoKananUrl : (schoolInfo.logoKananUrl || ''));

    const kejuruanList = (newInfo.kejuruanList && newInfo.kejuruanList.length > 0)
      ? newInfo.kejuruanList
      : (schoolInfo.kejuruanList || []);

    const dynamicTotalKuota = kejuruanList.length > 0
      ? kejuruanList.reduce((acc, k) => acc + (Number(k.kuotaSiswa) || 0), 0)
      : (farmasi + keperawatan + kecantikan + perhotelan) || newInfo.kuotaSPMB || 216;

    const dynamicKuotaJurusan: NonNullable<SchoolInfo['kuotaJurusan']> = {
      farmasi,
      keperawatan,
      kecantikan,
      perhotelan,
      ...(newInfo.kuotaJurusan || {}),
    };
    kejuruanList.forEach(k => {
      const key = (k.singkatan || k.kode || k.nama).toLowerCase().replace(/[^a-z0-9]/g, '');
      if (key) {
        dynamicKuotaJurusan[key] = Number(k.kuotaSiswa) || 36;
      }
    });

    const normalized: SchoolInfo = {
      ...newInfo,
      logoUrl: finalLogoUrl,
      logoKiriUrl: finalLogoUrl,
      logoSekolah: finalLogoUrl,
      logoKananUrl: finalLogoKananUrl,
      nama: cleanNama,
      namaLengkap: cleanNamaLengkap,
      kuotaSPMB: dynamicTotalKuota,
      kuotaJurusan: dynamicKuotaJurusan,
      rombelJurusan: {
        farmasi: rombelFarmasi,
        keperawatan: rombelKeperawatan,
        kecantikan: rombelKecantikan,
        perhotelan: rombelPerhotelan,
      },
      gelombangList,
      kejuruanList,
      kuotaPerJurusan: {
        farmasi,
        asistenKeperawatan: keperawatan,
        tataKecantikan: kecantikan,
        perhotelan,
      },
      kopSekolah: {
        ...newInfo.kopSekolah,
        yayasan: cleanYayasan,
        instansi: cleanInstansi,
        subJudul: cleanSubJudul,
        teleponEmail: cleanTeleponEmail,
        garisGanda: newInfo.kopSekolah?.garisGanda ?? true,
        fontFamily: newInfo.kopSekolah?.fontFamily || 'Times New Roman, Times, Georgia, serif',
        fontSizeYayasan: Number(newInfo.kopSekolah?.fontSizeYayasan || 12),
        fontSizeInstansi: Number(newInfo.kopSekolah?.fontSizeInstansi || 18),
        fontSizeSubJudul: Number(newInfo.kopSekolah?.fontSizeSubJudul || 11),
        fontSizeTeleponEmail: Number(newInfo.kopSekolah?.fontSizeTeleponEmail || 10),
        logoSize: Number(newInfo.kopSekolah?.logoSize || 64),
        logoKananSize: Number(newInfo.kopSekolah?.logoKananSize || newInfo.kopSekolah?.logoSize || 64),
        logoKananUrl: finalLogoKananUrl,
        tampilkanLogoKanan: newInfo.kopSekolah?.tampilkanLogoKanan ?? Boolean(finalLogoKananUrl),
        lineThickness: newInfo.kopSekolah?.lineThickness || 'sedang',
      }
    };
    setSchoolInfo(normalized);
    saveSchoolInfoToFirestore(normalized);
    try {
      localStorage.setItem('saved_school_info', JSON.stringify(normalized));
    } catch (_) {}
  };

  // Konfirmasi Siswa Baru SPMB
  const handleConfirmNewStudent = (
    formId: string, 
    nomorIndukSiswaResmi: string, 
    kelasDiterima: string, 
    catatan?: string
  ) => {
    let updatedFormObj: FormulirPPDB | undefined;
    setFormulirList(prev => prev.map(f => {
      if (f.id === formId) {
        const updated: FormulirPPDB = {
          ...f,
          statusPendaftaran: 'Diterima' as const,
          statusKonfirmasi: 'Diterima' as const,
          nomorIndukSiswaResmi,
          kelasDiterima,
          tanggalVerifikasi: f.tanggalVerifikasi || new Date().toISOString().substring(0, 10),
          emailNotifikasiTerkirim: true,
          emailNotifikasiWaktu: new Date().toISOString().replace('T', ' ').substring(0, 16),
          catatanAdmin: catatan || f.catatanAdmin,
        };
        updatedFormObj = updated;
        return updated;
      }
      return f;
    }));

    if (updatedFormObj) {
      saveDocument('formulir_ppdb', formId, updatedFormObj);
    }

    const targetForm = updatedFormObj || formulirList.find(f => f.id === formId);
    if (targetForm) {
      setUsersList(prev => {
        const existingIdx = prev.findIndex(u => u.nipOrNis === targetForm.nisn || u.id === targetForm.userId);
        let updatedUser: User;
        if (existingIdx >= 0) {
          const updated = [...prev];
          updatedUser = {
            ...updated[existingIdx],
            role: 'siswa',
            nipOrNis: nomorIndukSiswaResmi || targetForm.nisn,
            kelas: kelasDiterima,
            nama: targetForm.namaLengkap,
          };
          updated[existingIdx] = updatedUser;
          saveDocument('users', updatedUser.id, updatedUser);
          return updated;
        } else {
          updatedUser = {
            id: `u-siswa-${Date.now()}`,
            username: nomorIndukSiswaResmi || targetForm.nisn,
            nama: targetForm.namaLengkap,
            role: 'siswa',
            nipOrNis: nomorIndukSiswaResmi || targetForm.nisn,
            kelas: kelasDiterima,
            password: 'siswa',
          };
          saveDocument('users', updatedUser.id, updatedUser);
          return [...prev, updatedUser];
        }
      });
    }
  };

  // Hapus Calon Siswa Baru SPMB
  const handleDeleteCalonSiswa = (formId: string, userId?: string) => {
    const targetForm = formulirList.find(f => f.id === formId);
    const targetNisn = targetForm?.nisn;
    const targetUserId = userId || targetForm?.userId;

    // 1. Simpan formId ke daftar terhapus (bpm_deleted_ppdb) secara permanen
    const currentDeletedPPDB = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_PPDB, []);
    const nextDeleted = currentDeletedPPDB.includes(formId) 
      ? currentDeletedPPDB 
      : [...currentDeletedPPDB, formId];
    saveToStorage(STORAGE_KEYS.DELETED_PPDB, nextDeleted);

    setFormulirList(prev => {
      const updated = prev.filter(f => f.id !== formId);
      try {
        localStorage.setItem('saved_formulir_ppdb', JSON.stringify(updated));
        localStorage.setItem(STORAGE_KEYS.FORMULIR_PPDB, JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
    removeDocument('formulir_ppdb', formId);

    // 2. Kumpulkan dan simpan ID akun calon siswa ke daftar DELETED_USERS
    const usersToDelete: string[] = [];
    if (targetUserId) usersToDelete.push(targetUserId);
    if (targetForm) {
      usersToDelete.push(`u-calon-${targetForm.id}`);
      if (targetForm.id.startsWith('ppdb-')) {
        const num = targetForm.id.replace('ppdb-', '');
        usersToDelete.push(`u-calon-${num}`);
      }
    }
    const currentDeletedUsers = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_USERS, []);
    const updatedDeletedUsers = Array.from(new Set([...currentDeletedUsers, ...usersToDelete]));
    saveToStorage(STORAGE_KEYS.DELETED_USERS, updatedDeletedUsers);

    // Persist deleted PPDB and deleted users to Cloud Firestore so they never resurrect tomorrow
    syncDeletedListToCloud('deleted_ppdb', nextDeleted);
    syncDeletedListToCloud('deleted_users', updatedDeletedUsers);

    // Also update settings/deleted_records & prune cloud_backup
    try {
      if (!isQuotaExhausted()) {
        setDoc(doc(db, 'settings', 'deleted_records'), {
          deleted_ppdb: nextDeleted,
          deleted_users: updatedDeletedUsers,
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(err => {
          if (isQuotaError(err)) markQuotaExhausted();
        });
      }
    } catch (_) {}

    removeItemFromCloudBackup('formulirList', (item) => item.id === formId);
    removeItemFromCloudBackup('usersList', (item) => 
      usersToDelete.includes(item.id) || 
      (Boolean(targetUserId) && item.id === targetUserId) || 
      (Boolean(targetNisn) && (item.username === targetNisn || item.nipOrNis === targetNisn))
    );

    if (targetUserId) {
      removeDocument('users', targetUserId);
    }
    usersToDelete.forEach(uid => {
      removeDocument('users', uid);
    });

    setUsersList(prev => {
      const updated = prev.filter(u => {
        if (targetUserId && u.id === targetUserId) return false;
        if (usersToDelete.includes(u.id)) return false;
        if (targetNisn && (u.username === targetNisn || u.nipOrNis === targetNisn)) return false;
        if (targetForm?.namaLengkap && u.nama && u.nama.toLowerCase() === targetForm.namaLengkap.toLowerCase() && u.role === 'calon_siswa') return false;
        return true;
      });
      try {
        localStorage.setItem('saved_users_list', JSON.stringify(updated));
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
  };

  // Manual Trigger to Push Everything to Cloud Database (Cross-device sync for HP, PC, Tablet)
  const handleSyncAllToCloud = async (): Promise<{ success: boolean; count: number; error?: string }> => {
    return await syncAllDataToCloud({
      schoolInfo,
      formulirList,
      usersList,
      kelasList,
      mapelList,
      kontenList,
      jadwalPelajaranList,
      jadwalUjianList,
      ujianList,
      absensiList,
      ekskulList,
      nilaiList,
      nilaiEkskulList,
      absenMengajarList,
    });
  };

  // Manual Trigger to Force Pull Everything from Cloud Database (Cross-device refresh for HP, PC, Tablet)
  const handlePullAllFromCloud = async (): Promise<{ success: boolean; count: number; error?: string }> => {
    const res = await pullAllDataFromCloud();
    if (!res.success) {
      return { success: false, count: 0, error: res.error };
    }
    let count = 0;
    if (res.schoolInfo && res.schoolInfo.nama) {
      setSchoolInfo(res.schoolInfo);
      try { localStorage.setItem('saved_school_info', JSON.stringify(res.schoolInfo)); } catch (_) {}
      count++;
    }
    if (res.usersList && res.usersList.length > 0) {
      setUsersList((prev) => {
        const deletedUserIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_USERS, []).filter(id => id !== 'u-admin');
        const map = new Map<string, User>();
        if (Array.isArray(prev)) {
          prev.forEach(u => {
            if (!deletedUserIds.includes(u.id)) map.set(u.id, sanitizeUserAccount(u));
          });
        }
        res.usersList!.forEach((u: User) => {
          if (!deletedUserIds.includes(u.id)) map.set(u.id, sanitizeUserAccount(u));
        });
        const sanitized = Array.from(map.values()).map(sanitizeUserAccount);
        try {
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(sanitized));
          localStorage.setItem('saved_users_list', JSON.stringify(sanitized));
        } catch (_) {}
        return sanitized;
      });
      count += res.usersList.length;
    }
    if (res.kelasList && res.kelasList.length > 0) {
      setKelasList((prev) => {
        const map = new Map<string, Kelas>();
        if (Array.isArray(prev)) {
          prev.forEach(k => map.set(k.id, k));
        }
        res.kelasList!.forEach((k: Kelas) => map.set(k.id, k));
        const merged = Array.from(map.values());
        try {
          localStorage.setItem(STORAGE_KEYS.KELAS, JSON.stringify(merged));
          localStorage.setItem('saved_kelas_list', JSON.stringify(merged));
        } catch (_) {}
        return merged;
      });
      count += res.kelasList.length;
    }
    if (res.mapelList && res.mapelList.length > 0) {
      setMapelList((prev) => {
        const map = new Map<string, Mapel>();
        if (Array.isArray(prev)) {
          prev.forEach(m => map.set(m.id, m));
        }
        res.mapelList!.forEach((m: Mapel) => map.set(m.id, m));
        const merged = Array.from(map.values());
        try { 
          localStorage.setItem(STORAGE_KEYS.MAPEL, JSON.stringify(merged));
        } catch (_) {}
        return merged;
      });
      count += res.mapelList.length;
    }
    if (res.formulirList && res.formulirList.length > 0) {
      const deletedPpdbIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_PPDB, []);
      const validForms = res.formulirList.filter(f => !deletedPpdbIds.includes(f.id));
      setFormulirList(validForms);
      try { 
        localStorage.setItem('saved_formulir_ppdb', JSON.stringify(validForms));
        localStorage.setItem(STORAGE_KEYS.FORMULIR_PPDB, JSON.stringify(validForms));
      } catch (_) {}
      count += validForms.length;
    }
    if (res.ujianList && res.ujianList.length > 0) {
      setUjianList(res.ujianList);
      try { 
        localStorage.setItem(STORAGE_KEYS.UJIAN, JSON.stringify(res.ujianList));
        saveToStorage('bpm_deleted_ujian', []);
      } catch (_) {}
      count += res.ujianList.length;
    }
    if (res.kontenList && res.kontenList.length > 0) {
      setKontenList(res.kontenList);
      try { localStorage.setItem(STORAGE_KEYS.KONTEN_WEB, JSON.stringify(res.kontenList)); } catch (_) {}
      count += res.kontenList.length;
    }
    if (res.jadwalPelajaranList && res.jadwalPelajaranList.length > 0) {
      const cleanJadwal = res.jadwalPelajaranList.map(sanitizeJadwalItem);
      setJadwalPelajaranList(cleanJadwal);
      try { localStorage.setItem(STORAGE_KEYS.JADWAL_PELAJARAN, JSON.stringify(cleanJadwal)); } catch (_) {}
      count += cleanJadwal.length;
    }
    if (res.jadwalUjianList && res.jadwalUjianList.length > 0) {
      setJadwalUjianList(res.jadwalUjianList);
      try { localStorage.setItem(STORAGE_KEYS.JADWAL_UJIAN, JSON.stringify(res.jadwalUjianList)); } catch (_) {}
      count += res.jadwalUjianList.length;
    }
    if (res.absensiList && res.absensiList.length > 0) {
      const withSept = ensureSeptemberAttendance(res.absensiList);
      const { clean, obsoleteIds } = sanitizeAndDeduplicateAbsensiRecords(withSept);
      setAbsensiList(clean);
      try { localStorage.setItem(STORAGE_KEYS.ABSENSI, JSON.stringify(clean)); } catch (_) {}
      count += clean.length;
      if (obsoleteIds.length > 0) {
        obsoleteIds.forEach(id => removeDocument('absensi', id).catch(() => {}));
      }
    }
    if (res.ekskulList && res.ekskulList.length > 0) {
      setEkskulList(res.ekskulList);
      try { localStorage.setItem(STORAGE_KEYS.EKSKUL, JSON.stringify(res.ekskulList)); } catch (_) {}
      count += res.ekskulList.length;
    }
    if (res.nilaiList && res.nilaiList.length > 0) {
      const deletedNilaiIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_NILAI, []);
      const deletedNilaiKeys = new Set(loadFromStorage<string[]>(STORAGE_KEYS.DELETED_NILAI_KEYS, []));
      const validNilai = res.nilaiList
        .filter(n => n && n.id && (hasGradeScores(n) || (!deletedNilaiIds.includes(n.id) && !deletedNilaiKeys.has(getGradeMergeKey(n)))))
        .map(sanitizeNilaiItem);

      setNilaiList(prev => {
        const map = new Map<string, NilaiMapelSiswa>();
        (prev || []).forEach(n => {
          if (n && n.id) map.set(getGradeMergeKey(n), n);
        });
        validNilai.forEach(n => {
          if (n && n.id) {
            const k = getGradeMergeKey(n);
            map.set(k, mergeGradeItems(map.get(k), n));
          }
        });
        const merged = Array.from(map.values()).filter(n => {
          if (!n || !n.id) return false;
          if (hasGradeScores(n)) return true;
          return !deletedNilaiIds.includes(n.id) && !deletedNilaiKeys.has(getGradeMergeKey(n));
        }).map(sanitizeNilaiItem);

        try {
          localStorage.setItem(STORAGE_KEYS.NILAI, JSON.stringify(merged));
          localStorage.setItem('saved_nilai_list', JSON.stringify(merged));
        } catch (_) {}
        return merged;
      });
      count += validNilai.length;
    }
    if (res.nilaiEkskulList && res.nilaiEkskulList.length > 0) {
      setNilaiEkskulList(res.nilaiEkskulList);
      try {
        localStorage.setItem(STORAGE_KEYS.NILAI_EKSKUL, JSON.stringify(res.nilaiEkskulList));
        localStorage.setItem('saved_nilai_ekskul_list', JSON.stringify(res.nilaiEkskulList));
      } catch (_) {}
      count += res.nilaiEkskulList.length;
    }
    if (res.absenMengajarList && res.absenMengajarList.length > 0) {
      setAbsenMengajarList(res.absenMengajarList);
      try {
        localStorage.setItem(STORAGE_KEYS.ABSEN_MENGAJAR, JSON.stringify(res.absenMengajarList));
      } catch (_) {}
      count += res.absenMengajarList.length;
    }

    // Jika cloud masih kosong tapi perangkat ini memiliki data lokal aktif, otomatis dorong ke cloud (maksimum 1x per sesi)
    const alreadyPushedThisSession = sessionStorage.getItem('has_pushed_initial_cloud') === 'true';
    if (!alreadyPushedThisSession && count === 0 && (usersList.length > 0 || mapelList.length > 0)) {
      sessionStorage.setItem('has_pushed_initial_cloud', 'true');
      console.info('Cloud Firestore kosong, melakukan inisialisasi dorong data master lokal ke cloud...');
      syncAllDataToCloud({
        schoolInfo,
        formulirList,
        usersList,
        kelasList,
        mapelList,
        kontenList,
        jadwalPelajaranList,
        jadwalUjianList,
        ujianList,
        absensiList,
        ekskulList,
        nilaiList,
        nilaiEkskulList,
        absenMengajarList,
      }).catch(err => console.warn('Inisialisasi cloud sync warning:', err));
    }

    return { success: true, count };
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900 selection:bg-teal-500 selection:text-white">
      {/* Dynamic Navigation Bar */}
      <Navbar
        currentUser={currentUser}
        availableUsers={usersList}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSwitchUser={handleSwitchUser}
        onLogout={handleLogout}
        schoolInfo={schoolInfo}
        kelasList={kelasList}
        onPullAllFromCloud={handlePullAllFromCloud}
        onOpenPembaruanModal={() => setShowPembaruanModal(true)}
      />

      {/* Floating Welcome & Birthday Notification */}
      {loginWelcomeNotice && (
        <div className={`fixed top-16 right-4 z-50 max-w-md p-4 rounded-2xl shadow-2xl border animate-in slide-in-from-top duration-300 ${
          loginWelcomeNotice.isBirthday 
            ? 'bg-gradient-to-r from-pink-600 via-rose-600 to-amber-600 text-white border-pink-400 ring-4 ring-pink-300/40' 
            : 'bg-slate-900 text-white border-slate-700 shadow-slate-950/40'
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-extrabold text-sm flex items-center gap-1.5">
                {loginWelcomeNotice.isBirthday && <span className="text-base">🎂</span>}
                <span>{loginWelcomeNotice.title}</span>
              </div>
              <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                {loginWelcomeNotice.message}
              </p>
            </div>
            <button
              onClick={() => setLoginWelcomeNotice(null)}
              className="text-white/80 hover:text-white text-xs p-1 rounded-lg hover:bg-white/20 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Dynamic Viewport */}
      <main className="flex-1 pb-20 xl:pb-6 overflow-x-hidden">
        {/* 0. Halaman Login Pengguna Terpadu */}
        {activeTab === 'login' && (
          <LoginView
            availableUsers={usersList}
            formulirList={formulirList}
            currentUser={currentUser}
            onLoginSuccess={handleLoginSuccess}
            onLogout={handleLogout}
            onNavigateToWeb={() => setActiveTab('web')}
            onRegisterCalonSiswa={handleRegisterCalonSiswa}
            schoolInfo={schoolInfo}
            onOpenPembaruanModal={() => setShowPembaruanModal(true)}
          />
        )}

        {/* 1. Web Portal & CMS Display */}
        {activeTab === 'web' && (
          <WebProfilView
            kontenList={kontenList}
            formulirList={formulirList}
            onNavigateToPPDB={() => setActiveTab('ppdb')}
            onNavigateToCAT={() => setActiveTab('cat')}
            onNavigateToLogin={() => setActiveTab('login')}
            onNavigateToGuru={() => setActiveTab('guru')}
            schoolInfo={schoolInfo}
          />
        )}

        {/* 2. SPMB Online */}
        {activeTab === 'ppdb' && (
          <PPDBView
            currentUser={currentUser}
            formulirList={formulirList}
            schoolInfo={schoolInfo}
            onSaveFormulir={handleSaveFormulir}
            onRegisterCalonSiswa={handleRegisterCalonSiswa}
          />
        )}

        {/* 3. Computer Assisted Test (CAT CBT: Siswa Mengikuti Ujian, Guru & Admin Membuat & Mengelola Ujian) */}
        {activeTab === 'cat' && (
          <CATSiswaView
            currentUser={currentUser}
            ujianList={ujianList}
            onFinishUjian={handleFinishUjian}
            schoolInfo={schoolInfo}
            kelasList={kelasList}
            mapelList={mapelList}
            hasilList={hasilList}
            onSaveUjian={handleSaveUjian}
            onDeleteUjian={handleDeleteUjian}
          />
        )}

        {/* 4. Ruang Khusus Siswa (Absensi Mandiri & Profil/Akun) */}
        {activeTab === 'siswa' && currentUser && (
          <SiswaDashboardView
            currentUser={currentUser}
            ujianList={ujianList}
            hasilList={hasilList}
            jadwalPelajaranList={jadwalPelajaranList}
            absensiList={absensiList}
            nilaiList={nilaiList}
            kelasList={kelasList}
            mapelList={mapelList}
            schoolInfo={schoolInfo}
            onNavigateToCAT={() => setActiveTab('cat')}
            onUpdateProfile={handleUpdateUser}
            onAddAbsensi={handleAddAbsensi}
            onUpdateAbsensi={handleUpdateAbsensi}
            onDeleteAbsensi={handleDeleteAbsensi}
            allUsersList={usersList}
            onLogout={handleLogout}
            formulirList={formulirList}
            onNavigateToPPDB={() => setActiveTab('ppdb')}
          />
        )}

        {/* 5. Panel Portal Guru & Absen Mengajar */}
        {activeTab === 'guru' && (
          currentUser && (currentUser.role === 'guru' || currentUser.role === 'walas' || currentUser.role === 'admin') ? (
            <GuruDashboardView
              currentUser={currentUser}
              ujianList={ujianList}
              kelasList={kelasList}
              mapelList={mapelList}
              hasilList={hasilList}
              schoolInfo={schoolInfo}
              usersList={usersList}
              absensiList={absensiList}
              nilaiList={nilaiList}
              ekskulList={ekskulList}
              nilaiEkskulList={nilaiEkskulList}
              jadwalPelajaranList={jadwalPelajaranList}
              absenMengajarList={absenMengajarList}
              onSaveNilaiEkskul={handleSaveNilaiEkskul}
              onSaveUjian={handleSaveUjian}
              onDeleteUjian={handleDeleteUjian}
              onAddAbsensi={handleAddAbsensi}
              onBatchAddAbsensi={handleBatchAddAbsensi}
              onUpdateAbsensi={handleUpdateAbsensi}
              onDeleteAbsensi={handleDeleteAbsensi}
              onSaveNilaiList={handleSaveNilaiList}
              onSaveAbsenMengajar={handleSaveAbsenMengajar}
              onDeleteAbsenMengajar={handleDeleteAbsenMengajar}
              onUpdateProfile={handleUpdateUser}
              onPullAllFromCloud={handlePullAllFromCloud}
            />
          ) : (
            <PortalGuruGatewayView
              teachersList={usersList.filter(u => u.role === 'guru' || u.role === 'walas' || u.role === 'pembina_ekskul')}
              onSelectTeacher={(teacher) => {
                handleLoginSuccess(teacher);
                setActiveTab('guru');
              }}
              currentUser={currentUser}
              schoolInfo={schoolInfo}
              onNavigateToWeb={() => setActiveTab('web')}
            />
          )
        )}

        {/* 6. Leger Nilai Komprehensif Wali Kelas & Admin */}
        {activeTab === 'walas' && currentUser && (
          <WalasDashboardView
            currentUser={currentUser}
            kelasList={kelasList}
            mapelList={mapelList}
            hasilList={hasilList}
            ujianList={ujianList}
            usersList={usersList}
            absensiList={absensiList}
            nilaiList={nilaiList}
            schoolInfo={schoolInfo}
            ekskulList={ekskulList}
            nilaiEkskulList={nilaiEkskulList}
            jadwalPelajaranList={jadwalPelajaranList}
            onSaveNilaiEkskul={handleSaveNilaiEkskul}
            onAddAbsensi={handleAddAbsensi}
            onBatchAddAbsensi={handleBatchAddAbsensi}
            onUpdateAbsensi={handleUpdateAbsensi}
            onDeleteAbsensi={handleDeleteAbsensi}
            onSaveNilaiList={handleSaveNilaiList}
            onUpdateProfile={handleUpdateUser}
            onUpdateSchoolInfo={handleUpdateSchoolInfo}
            onSaveUsersList={handleSaveUsersList}
            onNavigateToGuru={() => setActiveTab('guru')}
            onPullAllFromCloud={handlePullAllFromCloud}
          />
        )}

        {/* 7. Pusat Kendali Super Admin */}
        {activeTab === 'admin' && currentUser && (
          <AdminDashboardView
            currentUser={currentUser}
            ujianList={ujianList}
            kontenList={kontenList}
            formulirList={formulirList}
            usersList={usersList}
            kelasList={kelasList}
            mapelList={mapelList}
            hasilList={hasilList}
            schoolInfo={schoolInfo}
            ekskulList={ekskulList}
            nilaiEkskulList={nilaiEkskulList}
            absensiList={absensiList}
            nilaiList={nilaiList}
            onAddAbsensi={handleAddAbsensi}
            onBatchAddAbsensi={handleBatchAddAbsensi}
            onUpdateAbsensi={handleUpdateAbsensi}
            onDeleteAbsensi={handleDeleteAbsensi}
            onSaveKonten={handleSaveKonten}
            onDeleteKonten={handleDeleteKonten}
            onUpdatePPDBStatus={handleUpdatePPDBStatus}
            onUpdateSchoolInfo={handleUpdateSchoolInfo}
            onConfirmNewStudent={handleConfirmNewStudent}
            onDeleteCalonSiswa={handleDeleteCalonSiswa}
            onUpdateCalonSiswa={handleUpdateCalonSiswa}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            onAddMapel={handleAddMapel}
            onUpdateMapel={handleUpdateMapel}
            onDeleteMapel={handleDeleteMapel}
            onAddKelas={handleAddKelas}
            onUpdateKelas={handleUpdateKelas}
            onDeleteKelas={handleDeleteKelas}
            jadwalPelajaranList={jadwalPelajaranList}
            onSaveJadwalPelajaran={handleSaveJadwalPelajaran}
            onDeleteJadwalPelajaran={handleDeleteJadwalPelajaran}
            jadwalUjianList={jadwalUjianList}
            onSaveJadwalUjian={handleSaveJadwalUjian}
            onDeleteJadwalUjian={handleDeleteJadwalUjian}
            onAddEkskul={handleAddEkskul}
            onUpdateEkskul={handleUpdateEkskul}
            onDeleteEkskul={handleDeleteEkskul}
            onSaveNilaiEkskul={handleSaveNilaiEkskul}
            onImportUsers={handleImportUsers}
            onImportMapel={handleImportMapel}
            onImportJadwal={handleImportJadwal}
            onClearAllJadwalPelajaran={handleClearAllJadwalPelajaran}
            onDeduplicateJadwalPelajaran={handleDeduplicateJadwalPelajaran}
            onImportNilai={handleImportNilai}
            onResetDatabase={handleResetDatabase}
            onResetNilai={handleResetNilai}
            onResetAbsensi={handleResetAbsensi}
            onResetCalonSiswa={handleResetCalonSiswa}
            onClearTemplateStudents={handleClearTemplateStudents}
            onRestoreAllData={handleRestoreAllData}
            onSaveNilaiList={handleSaveNilaiList}
            onSaveUsersList={handleSaveUsersList}
            onSaveUjian={handleSaveUjian}
            onDeleteUjian={handleDeleteUjian}
            onSyncAllToCloud={handleSyncAllToCloud}
            onPullAllFromCloud={handlePullAllFromCloud}
            onResetToDefaultMapel={handleResetToDefaultMapel}
            onSyncMapel={handleSyncMapel}
            absenMengajarList={absenMengajarList}
            onSaveAbsenMengajar={handleSaveAbsenMengajar}
            onDeleteAbsenMengajar={handleDeleteAbsenMengajar}
            onClearAllAbsenMengajar={handleClearAllAbsenMengajar}
          />
        )}

        {/* GLOBAL TOAST NOTIFIKASI PRESENSI BERHASIL TERCATAT (RESPONSIF HP & DESKTOP) */}
        {attendanceToast && (
          <div className="fixed top-4 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-50 pointer-events-auto animate-in slide-in-from-top-4 fade-in duration-300">
            <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-4 shadow-2xl border-2 border-emerald-400/90 backdrop-blur-md space-y-2">
              <div className="flex items-center justify-between border-b border-emerald-700/50 pb-2">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-black tracking-wide uppercase text-emerald-300">
                    Presensi Berhasil Direkam!
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAttendanceToast(null)}
                  className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-emerald-200 hover:text-white flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                  title="Tutup Notifikasi"
                >
                  ✕
                </button>
              </div>

              <div className="flex items-center gap-3 pt-0.5">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center font-black text-lg shrink-0 shadow-inner">
                  {attendanceToast.namaSiswa.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-extrabold text-white truncate leading-tight">
                    {attendanceToast.namaSiswa}
                  </h4>
                  <p className="text-[11px] text-emerald-200 truncate mt-0.5">
                    Kelas: <span className="font-bold text-white">{attendanceToast.kelas}</span>
                    {attendanceToast.nipd && ` • NIPD: ${attendanceToast.nipd}`}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      attendanceToast.status === 'Hadir' ? 'bg-emerald-400 text-slate-950 font-black' :
                      attendanceToast.status === 'Terlambat' ? 'bg-amber-400 text-slate-950 font-black' :
                      attendanceToast.status === 'Sakit' ? 'bg-blue-400 text-slate-950 font-black' :
                      attendanceToast.status === 'Izin' ? 'bg-indigo-400 text-slate-950 font-black' :
                      'bg-rose-400 text-slate-950 font-black'
                    }`}>
                      ● {attendanceToast.status}
                    </span>
                    <span className="text-[10px] text-slate-300 font-mono">
                      {attendanceToast.waktu} WIB
                    </span>
                    <span className="text-[10px] text-emerald-300/90 truncate max-w-[150px]">
                      via {attendanceToast.metode}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 8. Presensi Barcode & QR Code Siswa Per Kelas (Sejajar Menu Utama di Samping Leger Nilai) */}
        {activeTab === 'presensi' && currentUser && (
          currentUser.role === 'admin' || 
          currentUser.role === 'walas' || 
          currentUser.role === 'guru' || 
          currentUser.role === 'staf' ||
          currentUser.isKetuaKelas || 
          (currentUser.jabatanKelas && currentUser.jabatanKelas !== 'Anggota')
        ) && (
          <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6">
            <div className="bg-white rounded-3xl p-4 sm:p-8 border border-slate-200 shadow-sm space-y-6">
              <AbsensiBarcodeView
                currentUser={currentUser}
                absensiList={absensiList}
                usersList={usersList}
                onAddAbsensi={handleAddAbsensi}
                onBatchAddAbsensi={handleBatchAddAbsensi}
                onUpdateAbsensi={handleUpdateAbsensi}
                onDeleteAbsensi={handleDeleteAbsensi}
                kelasList={kelasList}
                allUsersList={usersList}
                schoolInfo={schoolInfo}
              />
            </div>
          </div>
        )}

        {/* Guard for Protected Tabs when Session Cleared (Logged Out) */}
        {!currentUser && ['walas', 'admin', 'siswa', 'presensi'].includes(activeTab) && (
          <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
            <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm max-w-md space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto text-2xl font-black">
                🔒
              </div>
              <h3 className="font-bold text-slate-900 text-base">Sesi Telah Berakhir</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Anda telah keluar dari sistem secara penuh. Silakan login kembali dengan akun Anda untuk mengakses fitur ini.
              </p>
              <button
                onClick={() => setActiveTab('login')}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
              >
                Menuju Halaman Login
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Modal Informasi Pembaruan Sistem Otomatis (Saat Membuka / Login) */}
      <PembaruanAppModal
        isOpen={showPembaruanModal}
        onClose={() => setShowPembaruanModal(false)}
        userName={currentUser?.nama}
        userRole={currentUser?.role}
      />
    </div>
  );
}
