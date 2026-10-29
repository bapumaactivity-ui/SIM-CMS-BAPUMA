import React, { useState, useMemo, useEffect } from 'react';
import { User, Kelas, Mapel, NilaiMapelSiswa, SchoolInfo, AbsensiRecord, JadwalPelajaran, Ekskul, NilaiEkskulSiswa } from '../types';
import { KopSuratView } from './KopSuratView';
import { 
  getMatchingMapelForKelas, 
  isUserAdmin, 
  getWalasAssignedClasses,
  formatTeacherIdentifier,
  formatKepsekIdentifier,
  sortMapelByKelas,
  getTeacherAssignedMapels,
  getTeacherAssignedClasses,
  isGuruOrPembinaBiasa,
  isUserPembina,
  getPembinaAssignedEkskuls,
  isHariSekolahEfektif,
  buildKurikulumMerdekaCapaian,
  sortKelasAlphabetical
} from '../utils/academicHelpers';
import { hitungNilaiAkhir } from '../data/mockAcademicData';
import { 
  Printer, 
  Download, 
  BookOpen, 
  Table, 
  Calendar, 
  Award, 
  GraduationCap, 
  Users, 
  Search, 
  Building2, 
  Layers, 
  RefreshCw, 
  CheckCircle2,
  FileSpreadsheet,
  Info,
  Check,
  ShieldAlert,
  Lock,
  Filter,
  AlertCircle
} from 'lucide-react';
import { printDocumentArea } from '../utils/printHelper';

interface CetakLegerViewProps {
  currentUser: User;
  kelasList: Kelas[];
  mapelList: Mapel[];
  usersList: User[];
  nilaiList: NilaiMapelSiswa[];
  absensiList?: AbsensiRecord[];
  schoolInfo?: SchoolInfo;
  jadwalPelajaranList?: JadwalPelajaran[];
  ekskulList?: Ekskul[];
  nilaiEkskulList?: NilaiEkskulSiswa[];
  defaultClassId?: string;
  defaultMode?: 'per_mapel' | 'keseluruhan' | 'ekskul';
  onPullAllFromCloud?: () => Promise<any>;
  onSelectClassId?: (classId: string) => void;
}

export const CetakLegerView: React.FC<CetakLegerViewProps> = ({
  currentUser,
  kelasList,
  mapelList,
  usersList,
  nilaiList,
  absensiList = [],
  schoolInfo,
  jadwalPelajaranList = [],
  ekskulList = [],
  nilaiEkskulList = [],
  defaultClassId,
  defaultMode = 'keseluruhan',
  onPullAllFromCloud,
  onSelectClassId,
}) => {
  const isSuperAdmin = isUserAdmin(currentUser);
  const walasAssignedClasses = useMemo(() => getWalasAssignedClasses(currentUser, kelasList), [currentUser, kelasList]);
  // STRICT: Hanya Super Admin atau Wali Kelas yang memiliki rombel binaan resmi yang berhak membuka Leger Keseluruhan Kelas
  const isAuthorizedKeseluruhan = isSuperAdmin || (currentUser.role === 'walas' && walasAssignedClasses.length > 0) || (currentUser.isWalas === true && walasAssignedClasses.length > 0);

  // Daftar mata pelajaran yang sah diampu oleh guru saat ini
  const teacherTaughtMapels = useMemo(() => {
    return getTeacherAssignedMapels(currentUser, mapelList, jadwalPelajaranList);
  }, [currentUser, mapelList, jadwalPelajaranList]);

  // Ekstrakurikuler yang sah dibina
  const isPembina = isUserPembina(currentUser, ekskulList);
  const pembinaEkskuls = useMemo(() => {
    if (isSuperAdmin || isAuthorizedKeseluruhan) return ekskulList;
    return getPembinaAssignedEkskuls(currentUser, ekskulList);
  }, [isSuperAdmin, isAuthorizedKeseluruhan, currentUser, ekskulList]);

  const canAccessEkskulMode = isSuperAdmin || isAuthorizedKeseluruhan || isPembina || pembinaEkskuls.length > 0;
  const isPurePembina = (currentUser.role === 'pembina_ekskul' || isPembina) && teacherTaughtMapels.length === 0 && !isAuthorizedKeseluruhan;

  // Strict role enforcement:
  // - Pure pembina (not teaching mapel) -> 'ekskul'
  // - Regular Guru (not walas, not admin) -> 'per_mapel'
  // - Walas / Super Admin -> defaultMode
  const effectiveDefaultMode: 'keseluruhan' | 'per_mapel' | 'ekskul' = isPurePembina
    ? 'ekskul'
    : (isAuthorizedKeseluruhan ? defaultMode : 'per_mapel');

  const [activeMode, setActiveMode] = useState<'keseluruhan' | 'per_mapel' | 'ekskul'>(effectiveDefaultMode);

  // Auto redirect to authorized mode
  React.useEffect(() => {
    if (!isAuthorizedKeseluruhan && activeMode === 'keseluruhan') {
      setActiveMode(isPurePembina ? 'ekskul' : 'per_mapel');
    }
    if (isPurePembina && activeMode === 'per_mapel') {
      setActiveMode('ekskul');
    }
  }, [isAuthorizedKeseluruhan, isPurePembina, activeMode]);

  const [selectedPeriode, setSelectedPeriode] = useState<'PAS' | 'PTS' | 'PAT' | null>(null);
  const effectivePeriode: 'PAS' | 'PTS' | 'PAT' = selectedPeriode || 'PAS';
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isRefreshingCloud, setIsRefreshingCloud] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Selected Ekskul state for ekskul mode
  const [selectedEkskulId, setSelectedEkskulId] = useState<string>(() => {
    return pembinaEkskuls[0]?.id || ekskulList[0]?.id || '';
  });

  // Keep selectedEkskulId valid
  React.useEffect(() => {
    if (pembinaEkskuls.length > 0 && !pembinaEkskuls.some(e => e.id === selectedEkskulId)) {
      setSelectedEkskulId(pembinaEkskuls[0].id);
    }
  }, [pembinaEkskuls, selectedEkskulId]);

  const currentEkskul = useMemo(() => {
    return pembinaEkskuls.find(e => e.id === selectedEkskulId) || pembinaEkskuls[0] || null;
  }, [pembinaEkskuls, selectedEkskulId]);

  // Class filtering based on teacher role:
  // - Admin: All classes in school
  // - Walas: Classes they manage
  // - Regular Guru / Pembina: ONLY classes where their subjects or teaching schedules exist
  const availableClasses = useMemo(() => {
    let list: Kelas[] = [];
    if (isSuperAdmin) list = kelasList;
    else if (isAuthorizedKeseluruhan) list = walasAssignedClasses;
    else list = getTeacherAssignedClasses(currentUser, kelasList, teacherTaughtMapels, jadwalPelajaranList);
    return sortKelasAlphabetical(list);
  }, [isSuperAdmin, isAuthorizedKeseluruhan, walasAssignedClasses, currentUser, kelasList, teacherTaughtMapels, jadwalPelajaranList]);

  const sortedClasses = useMemo(() => sortKelasAlphabetical(kelasList), [kelasList]);

  const [selectedKelasId, setSelectedKelasId] = useState<string>(() => {
    if (defaultClassId && (availableClasses.some(k => k.id === defaultClassId) || kelasList.some(k => k.id === defaultClassId))) {
      return defaultClassId;
    }
    const candidateList = availableClasses.length > 0 ? availableClasses : sortedClasses;
    const xKes = candidateList.find(k => k.id === 'k-x-kes' || k.namaKelas.toLowerCase().includes('x kesehatan'));
    if (xKes) return xKes.id;
    if (walasAssignedClasses.length > 0) {
      return walasAssignedClasses[0].id;
    }
    return candidateList[0]?.id || '';
  });

  // Sinkronisasi bila defaultClassId berubah dari induk (misal WalasDashboard atau Leger tab)
  useEffect(() => {
    if (defaultClassId && (availableClasses.some(k => k.id === defaultClassId) || kelasList.some(k => k.id === defaultClassId))) {
      setSelectedKelasId(defaultClassId);
    }
  }, [defaultClassId, availableClasses, kelasList]);

  const currentKelas = useMemo(() => {
    return kelasList.find(k => k.id === selectedKelasId) || availableClasses[0] || kelasList[0];
  }, [kelasList, selectedKelasId, availableClasses]);

  const currentWalas = useMemo(() => {
    if (!currentKelas) return null;
    return usersList.find(u => 
      (u.id && u.id === currentKelas.idWalas) ||
      (currentKelas.idWalas && (u.nipOrNis === currentKelas.idWalas || u.idGuru === currentKelas.idWalas)) ||
      (currentKelas.namaWalas && u.nama && u.nama.toLowerCase() === currentKelas.namaWalas.toLowerCase())
    ) || (currentUser.role === 'walas' ? currentUser : null);
  }, [currentKelas, usersList, currentUser]);

  // Students belonging to this selected class
  const classStudents = useMemo(() => {
    return usersList
      .filter(u => {
        if (u.role !== 'siswa') return false;
        if (u.idKelas === currentKelas?.id) return true;
        if (currentKelas && (u.kelas === currentKelas.namaKelas || u.namaKelas === currentKelas.namaKelas)) return true;
        return false;
      })
      .sort((a, b) => a.nama.localeCompare(b.nama));
  }, [usersList, currentKelas]);

  // State Pengaturan Kertas, Orientasi & Margin Cetak Dokumen
  const [printPaperSize, setPrintPaperSize] = useState<'A4' | 'F4' | 'Legal' | 'Letter'>('F4');
  const [printOrientation, setPrintOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [printMargin, setPrintMargin] = useState<'minimal' | 'sempit' | 'normal'>('minimal');
  const [isPrintingDoc, setIsPrintingDoc] = useState(false);

  // Real-time synchronization of attendance overrides across devices
  const [raportAbsensiMap, setRaportAbsensiMap] = useState<Record<string, { hadir: number; sakit: number; izin: number; alpa: number }>>(() => {
    try {
      const raw = localStorage.getItem('saved_raport_absensi');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const handleRemoteAbsen = (e: any) => {
      if (e?.detail && typeof e.detail === 'object') {
        setRaportAbsensiMap(e.detail);
      }
    };
    window.addEventListener('raport_absensi_synced', handleRemoteAbsen);
    return () => window.removeEventListener('raport_absensi_synced', handleRemoteAbsen);
  }, []);

  // Filter students based on search keyword
  const filteredStudents = useMemo(() => {
    if (!searchKeyword.trim()) return classStudents;
    const q = searchKeyword.toLowerCase();
    return classStudents.filter(s => 
      s.nama.toLowerCase().includes(q) || 
      (s.nipd && s.nipd.includes(q)) || 
      (s.nisn && s.nisn.includes(q)) ||
      (s.nipOrNis && s.nipOrNis.includes(q))
    );
  }, [classStudents, searchKeyword]);

  // Subjects belonging STRICTLY to this class and major
  const classMapels = useMemo(() => {
    if (!currentKelas) return mapelList;
    const scheduledMapelIds = new Set<string>();
    if (jadwalPelajaranList && jadwalPelajaranList.length > 0) {
      jadwalPelajaranList.forEach(j => {
        if (j.idKelas === currentKelas.id || j.namaKelas === currentKelas.namaKelas) {
          if (j.idMapel) scheduledMapelIds.add(j.idMapel);
        }
      });
    }

    const matched = getMatchingMapelForKelas(currentKelas, mapelList, classStudents);

    const map = new Map<string, Mapel>();
    if (scheduledMapelIds.size > 0) {
      const scheduledMapels = mapelList.filter(m => scheduledMapelIds.has(m.id) || scheduledMapelIds.has(m.kode));
      scheduledMapels.forEach(m => map.set(m.id, m));
    }
    matched.forEach(m => {
      if (!map.has(m.id)) map.set(m.id, m);
    });

    // Sertakan juga mata pelajaran yang sudah ada nilai dari siswa rombel ini
    if (nilaiList && nilaiList.length > 0 && classStudents.length > 0) {
      const studentNips = new Set(classStudents.map(s => (s.nipd || s.nipOrNis || s.id || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase()));
      const studentNames = new Set(classStudents.map(s => (s.nama || '').trim().toLowerCase()));

      nilaiList.forEach(n => {
        if (!n) return;
        const nNip = (n.nipd || n.nisn || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const nNama = (n.namaSiswa || '').trim().toLowerCase();
        const belongsToClass = studentNips.has(nNip) || studentNames.has(nNama);
        if (belongsToClass) {
          const foundMapel = mapelList.find(m => 
            (m.id && n.mapelId && m.id === n.mapelId) ||
            (m.kode && n.mapelId && m.kode === n.mapelId) ||
            (m.namaMapel && n.mapelNama && m.namaMapel.trim().toLowerCase() === n.mapelNama.trim().toLowerCase())
          );
          if (foundMapel && !map.has(foundMapel.id)) {
            map.set(foundMapel.id, foundMapel);
          }
        }
      });
    }

    const finalMapels = sortMapelByKelas(Array.from(map.values()));

    // If user is ONLY a teacher/pembina (not walas, not admin): filter exclusively to their taught subjects
    if (!isAuthorizedKeseluruhan) {
      const allowedIds = new Set(teacherTaughtMapels.map(m => m.id));
      const allowedCodes = new Set(teacherTaughtMapels.map(m => (m.kode || '').toLowerCase()));
      const allowedNames = new Set(teacherTaughtMapels.map(m => m.namaMapel.toLowerCase()));

      const teacherFiltered = finalMapels.filter(m => 
        allowedIds.has(m.id) || 
        (m.kode && allowedCodes.has(m.kode.toLowerCase())) ||
        allowedNames.has(m.namaMapel.toLowerCase()) ||
        (m.guruPengampu && currentUser.nama && m.guruPengampu.toLowerCase().includes(currentUser.nama.toLowerCase()))
      );
      // STRICT: Return ONLY teacher's actual subjects! DO NOT fall back to finalMapels!
      return teacherFiltered;
    }

    return finalMapels;
  }, [currentKelas, mapelList, jadwalPelajaranList, classStudents, isAuthorizedKeseluruhan, currentUser, teacherTaughtMapels]);

  // Selected subject for "per_mapel" mode
  const [selectedMapelId, setSelectedMapelId] = useState<string>(() => {
    return classMapels[0]?.id || '';
  });

  // Keep selectedMapelId valid when class changes
  React.useEffect(() => {
    if (classMapels.length > 0 && !classMapels.some(m => m.id === selectedMapelId)) {
      setSelectedMapelId(classMapels[0].id);
    }
  }, [classMapels, selectedMapelId]);

  const currentMapel = useMemo(() => {
    return classMapels.find(m => m.id === selectedMapelId) || classMapels[0] || null;
  }, [classMapels, selectedMapelId]);

  // Teacher assigned to this subject in this class
  const assignedTeacher = useMemo(() => {
    if (!currentMapel) return null;
    const scheduled = jadwalPelajaranList.find(j => 
      (j.idKelas === currentKelas?.id || j.namaKelas === currentKelas?.namaKelas) &&
      (j.idMapel === currentMapel.id || j.namaMapel === currentMapel.namaMapel)
    );
    if (scheduled && scheduled.namaGuru) {
      return { nama: scheduled.namaGuru, nipOrNis: scheduled.idGuru || '-' };
    }
    const foundUser = usersList.find(u => 
      (u.role === 'guru' || u.role === 'walas') && 
      (u.mapelDiampu?.includes(currentMapel.id) || u.mapelDiampu?.includes(currentMapel.kode) || u.nama === currentMapel.guruPengampu)
    );
    if (foundUser) {
      return { nama: foundUser.nama, nipOrNis: foundUser.nipOrNis || '-' };
    }
    return { nama: currentMapel.guruPengampu || 'Guru Mata Pelajaran', nipOrNis: '-' };
  }, [currentMapel, currentKelas, jadwalPelajaranList, usersList]);

  // Titimangsa Configuration
  const [titimangsaTempat] = useState<string>(() => {
    try {
      return localStorage.getItem('saved_titimangsa_tempat') || schoolInfo?.raporConfig?.tempatTitimangsa || 'Parungpanjang, Bogor';
    } catch {
      return 'Parungpanjang, Bogor';
    }
  });

  const [titimangsaTanggal] = useState<string>(() => {
    try {
      return localStorage.getItem('saved_titimangsa_tanggal') || schoolInfo?.raporConfig?.tanggalTitimangsa || (
        selectedPeriode === 'PAT' ? '20 Juni 2027' : '20 Desember 2026'
      );
    } catch {
      return '20 Desember 2026';
    }
  });

  // Normalized periode helper
  const normPer = (p?: string | null): string => {
    if (!p) return 'PAS';
    const up = p.toUpperCase().trim();
    if (up === 'SAS' || up === 'PAS' || up === 'PSAS' || up === 'ASAS') return 'PAS';
    if (up === 'ASTS' || up === 'PTS' || up === 'MID') return 'PTS';
    if (up === 'ASAT' || up === 'PAT' || up === 'UKK') return 'PAT';
    return up;
  };

  const resolveScore = (item?: NilaiMapelSiswa): number | undefined => {
    if (!item) return undefined;
    if (typeof item.nilaiAkhir === 'number' && item.nilaiAkhir > 0) return item.nilaiAkhir;
    const computed = hitungNilaiAkhir(item);
    if (computed && typeof computed.nilaiAkhir === 'number' && computed.nilaiAkhir > 0) {
      return computed.nilaiAkhir;
    }
    if (typeof item.nilaiPas === 'number' && item.nilaiPas > 0) return item.nilaiPas;
    if (typeof item.nilaiPts === 'number' && item.nilaiPts > 0) return item.nilaiPts;
    if (typeof item.nilaiPat === 'number' && item.nilaiPat > 0) return item.nilaiPat;
    if (typeof item.nilaiFormatif === 'number' && item.nilaiFormatif > 0) return item.nilaiFormatif;
    if (typeof item.tugas1 === 'number' && item.tugas1 > 0) return item.tugas1;
    if (typeof item.lm1 === 'number' && item.lm1 > 0) return item.lm1;
    return undefined;
  };

  // Grade finder helper (Prioritizes scored records and matches student/mapel flexibly)
  const findGrade = (student: User, mapel: Mapel, periode?: 'PTS' | 'PAS' | 'PAT' | null): NilaiMapelSiswa | undefined => {
    const clean = (s?: string) => (s || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const sNipd = clean(student.nipd || student.nipOrNis);
    const sNisn = clean(student.nisn);
    const sUser = clean(student.username);
    const sId = clean(student.id);
    const sNama = clean(student.nama);

    const norm = (s?: string) => (s || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const mId = norm(mapel.id);
    const mKode = norm(mapel.kode);
    const mNama = norm(mapel.namaMapel);

    const matches = nilaiList.filter(n => {
      if (!n) return false;
      const nNipd = clean(n.nipd);
      const nNisn = clean(n.nisn);
      const nNama = clean(n.namaSiswa);
      const nId = clean(n.id);

      const matchS = 
        (sNipd && (nNipd === sNipd || nNisn === sNipd)) ||
        (sNisn && (nNisn === sNisn || nNipd === sNisn)) ||
        (sUser && (nNipd === sUser || nNisn === sUser || nId.includes(sUser))) ||
        (sId && (nId.includes(sId) || nNipd === sId)) ||
        (sNama && nNama && sNama === nNama);
      if (!matchS) return false;

      const nMapId = norm(n.mapelId);
      const nMapNama = norm(n.mapelNama);

      const matchM = 
        (mId && (nMapId === mId || nMapNama === mId)) ||
        (mKode && (nMapId === mKode || nMapNama === mKode)) ||
        (mNama && (nMapNama === mNama || nMapId === mNama));
      if (!matchM) return false;

      if (periode && n.periode && normPer(n.periode) !== normPer(periode)) return false;
      return true;
    });

    if (matches.length === 0) return undefined;
    const withScores = matches.find(g => resolveScore(g) !== undefined);
    return withScores || matches[matches.length - 1];
  };

  // Helper for Semester text
  const semesterText = useMemo(() => {
    if (selectedPeriode === 'PAT') return 'Genap (Semester 2 / Akhir Tahun)';
    if (selectedPeriode === 'PTS') return 'Ganjil (Tengah Semester / PTS)';
    return 'Ganjil (Semester 1 / PAS)';
  }, [selectedPeriode]);

  // Pengaturan filter kolom mata pelajaran pada Leger Keseluruhan:
  // Default: HANYA mapel yang nilainya sudah diinput (sesuai instruksi walas)
  const [hanyaMapelDiinput, setHanyaMapelDiinput] = useState<boolean>(true);

  // HANYA MUNCUL MATA PELAJARAN YANG SUDAH DIISI NILAINYA
  const filledClassMapels = useMemo(() => {
    return classMapels.filter(m => {
      return classStudents.some(student => {
        const found = findGrade(student, m, selectedPeriode || effectivePeriode) || findGrade(student, m, null);
        const score = resolveScore(found);
        if (score !== undefined && score > 0) return true;
        if (found) {
          const hasScores = 
            (Number(found.nilaiAkhir) > 0) ||
            (Number(found.nilaiPas) > 0) ||
            (Number(found.nilaiPts) > 0) ||
            (Number(found.nilaiPat) > 0) ||
            (Number(found.nilaiFormatif) > 0) ||
            (Number(found.tugas1) > 0) ||
            (Number(found.tugas2) > 0) ||
            (Number(found.tugas3) > 0) ||
            (Number(found.ulhar1) > 0) ||
            (Number(found.ulhar2) > 0) ||
            (Number(found.lm1) > 0) ||
            (Number(found.lm2) > 0) ||
            (Number(found.lm3) > 0) ||
            (Number(found.lm4) > 0);
          if (hasScores) return true;
        }
        return false;
      });
    });
  }, [classMapels, classStudents, effectivePeriode, selectedPeriode, nilaiList]);

  // Mata pelajaran aktif untuk Leger Keseluruhan:
  // Sesuai permintaan pengguna: "untuk nilai di leger keseluruhan tipa walas adalah nilai yang hanya diinput saja, jangan semua mapel, jadi yang muncul yang diiput saja"
  const activeKeseluruhanMapels = useMemo(() => {
    if (hanyaMapelDiinput) {
      return filledClassMapels;
    }
    return classMapels;
  }, [hanyaMapelDiinput, filledClassMapels, classMapels]);

  // Compute Leger Keseluruhan Rows with Ranks & Stats
  const legerKeseluruhanRows = useMemo(() => {
    const targetMapels = activeKeseluruhanMapels;

    const rows = classStudents.map(student => {
      const nipdKey = student.nipd || student.nipOrNis;
      let total = 0;
      let count = 0;
      const scores: { [mapelId: string]: number | undefined } = {};

      targetMapels.forEach(m => {
        const found = findGrade(student, m, selectedPeriode || effectivePeriode) || findGrade(student, m, null);
        const score = resolveScore(found);
        if (score !== undefined && score > 0) {
          scores[m.id] = score;
          total += score;
          count += 1;
        } else {
          scores[m.id] = undefined;
        }
      });

      const avg = count > 0 ? Math.round((total / count) * 10) / 10 : 0;
      
      // Attendance: Mencocokkan rekaman presensi siswa secara komprehensif
      const cleanSNipd = (nipdKey || '').replace(/\./g, '').trim().toLowerCase();
      const sNipdDots = (student.nipd || student.nipOrNis || '').replace(/\./g, '').trim().toLowerCase();
      const sNisn = (student.nisn || '').trim().toLowerCase();
      const sNama = (student.nama || '').trim().toLowerCase();
      const sNamaClean = sNama.replace(/[^a-z0-9]/g, '');

      const studentAbs = absensiList.filter(a => {
        if (!a) return false;
        const aNipdClean = (a.nipd || '').replace(/\./g, '').trim().toLowerCase();
        const aNisnClean = (a.nisn || '').trim().toLowerCase();
        const aNama = (a.namaSiswa || '').trim().toLowerCase();
        const aNamaClean = aNama.replace(/[^a-z0-9]/g, '');

        if (cleanSNipd && (aNipdClean === cleanSNipd || aNisnClean === cleanSNipd || a.userId === nipdKey)) return true;
        if (sNipdDots && (aNipdClean === sNipdDots || aNisnClean === sNipdDots)) return true;
        if (sNisn && (aNisnClean === sNisn || aNipdClean === sNisn)) return true;
        if (student.id && a.userId === student.id) return true;
        if (sNama && aNama && (aNama === sNama || (sNamaClean && aNamaClean && aNamaClean === sNamaClean))) return true;
        return false;
      });

      const dateAbsMap = new Map<string, string>();
      studentAbs.forEach(a => {
        if (a.tanggal) {
          if (!dateAbsMap.has(a.tanggal)) {
            dateAbsMap.set(a.tanggal, a.status);
          }
        }
      });

      const norm = (st?: string) => (st || '').trim().toLowerCase();
      let sakit = 0;
      let izin = 0;
      let alpa = 0;
      let hadir = 0;

      // Jika ada tanggal, hitung deduplikasi per tanggal; jika tidak ada tanggal gunakan seluruh rekaman
      if (dateAbsMap.size > 0) {
        dateAbsMap.forEach(st => {
          const s = norm(st);
          if (s === 'sakit' || s === 's') sakit++;
          else if (s === 'izin' || s === 'ijin' || s === 'i') izin++;
          else if (s === 'alpa' || s === 'alpha' || s === 'a' || s === 'tanpa keterangan') alpa++;
          else if (s === 'hadir' || s === 'h' || s === 'terlambat' || s === 't' || s === 'masuk') hadir++;
        });
      } else {
        studentAbs.forEach(a => {
          const s = norm(a.status);
          if (s === 'sakit' || s === 's') sakit++;
          else if (s === 'izin' || s === 'ijin' || s === 'i') izin++;
          else if (s === 'alpa' || s === 'alpha' || s === 'a' || s === 'tanpa keterangan') alpa++;
          else if (s === 'hadir' || s === 'h' || s === 'terlambat' || s === 't' || s === 'masuk') hadir++;
        });
      }

      // Override dari raportAbsensiMap (sinkron dengan menu Rapor Wali Kelas & Firestore)
      const cleanKey = nipdKey.replace(/\./g, '');
      const customRec = 
        raportAbsensiMap[nipdKey] || 
        raportAbsensiMap[cleanKey] || 
        (student.nipd ? raportAbsensiMap[student.nipd] : undefined) ||
        (student.nipd ? raportAbsensiMap[student.nipd.replace(/\./g, '')] : undefined) ||
        (student.nisn ? raportAbsensiMap[student.nisn] : undefined) || 
        (student.id ? raportAbsensiMap[student.id] : undefined);

      if (customRec) {
        if (typeof customRec.sakit === 'number') sakit = customRec.sakit;
        if (typeof customRec.izin === 'number') izin = customRec.izin;
        if (typeof customRec.alpa === 'number') alpa = customRec.alpa;
        if (typeof customRec.hadir === 'number') hadir = customRec.hadir;
      }

      // Status Kenaikan if PAT
      const kNama = (currentKelas?.namaKelas || student.kelas || '').toUpperCase();
      const isAkhir = /\bXII\b|KELAS\s*XII|\b12\b/.test(kNama) || currentKelas?.tingkat === 'XII';
      const statusKenaikan = isAkhir 
        ? 'LULUS' 
        : kNama.includes('X ') || currentKelas?.tingkat === 'X' 
          ? 'Naik ke Kelas XI' 
          : 'Naik ke Kelas XII';

      return {
        student,
        nipdKey,
        scores,
        total,
        average: avg,
        gradedCount: count,
        absensi: { hadir, sakit, izin, alpa },
        statusKenaikan,
      };
    });

    // Rank descending
    return rows.sort((a, b) => b.average - a.average);
  }, [classStudents, filledClassMapels, selectedPeriode, effectivePeriode, nilaiList, absensiList, currentKelas, raportAbsensiMap]);

  // Compute Leger Per-Mapel Rows with Details
  const legerPerMapelRows = useMemo(() => {
    if (!currentMapel) return [];
    return classStudents.map((student, idx) => {
      const found = findGrade(student, currentMapel, effectivePeriode);
      const computed = found ? hitungNilaiAkhir(found) : null;

      const lm1 = found?.lm1 ?? found?.tugas1;
      const lm2 = found?.lm2 ?? found?.tugas2;
      const lm3 = found?.lm3 ?? found?.tugas3;
      const lm4 = found?.lm4;
      const formatif = found?.nilaiFormatif ?? computed?.nilaiFormatif ?? 0;
      const sumatif = effectivePeriode === 'PTS' ? (found?.nilaiPts ?? 0) : effectivePeriode === 'PAT' ? (found?.nilaiPat ?? 0) : (found?.nilaiPas ?? 0);
      const nilaiAkhir = found?.nilaiAkhir ?? computed?.nilaiAkhir ?? 0;
      const predikat = found?.predikat ?? computed?.predikat ?? (nilaiAkhir >= 90 ? 'A' : nilaiAkhir >= 80 ? 'B' : nilaiAkhir >= 70 ? 'C' : nilaiAkhir > 0 ? 'D' : '-');
      const ketercapaian = found?.ketercapaian ?? computed?.ketercapaian ?? (nilaiAkhir >= 75 ? 'Tuntas' : nilaiAkhir > 0 ? 'Belum Tuntas' : '-');
      const capaianResult = buildKurikulumMerdekaCapaian({
        grade: { ...found, nilaiAkhir: nilaiAkhir > 0 ? nilaiAkhir : 80 },
        mapel: currentMapel,
        kelas: currentKelas,
        displayStyle: 'ringkas',
      });
      const deskripsi = found?.tpDeskripsi || capaianResult.deskripsiRingkas;

      return {
        no: idx + 1,
        student,
        nipdKey: student.nipd || student.nipOrNis,
        lm1: lm1 !== undefined ? lm1 : '-',
        lm2: lm2 !== undefined ? lm2 : '-',
        lm3: lm3 !== undefined ? lm3 : '-',
        lm4: lm4 !== undefined ? lm4 : '-',
        formatif: formatif > 0 ? formatif : '-',
        sumatif: sumatif > 0 ? sumatif : '-',
        nilaiAkhir: nilaiAkhir > 0 ? nilaiAkhir : '-',
        predikat,
        ketercapaian,
        deskripsi,
      };
    });
  }, [classStudents, currentMapel, selectedPeriode, effectivePeriode, nilaiList]);

  // Statistics for Leger Per Mapel
  const perMapelStats = useMemo(() => {
    const validScores = legerPerMapelRows
      .map(r => typeof r.nilaiAkhir === 'number' ? r.nilaiAkhir : 0)
      .filter(s => s > 0);
    const avg = validScores.length > 0 ? Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 10) / 10 : 0;
    const max = validScores.length > 0 ? Math.max(...validScores) : 0;
    const min = validScores.length > 0 ? Math.min(...validScores) : 0;
    const tuntas = validScores.filter(s => s >= 75).length;
    const percentTuntas = validScores.length > 0 ? Math.round((tuntas / validScores.length) * 100) : 0;

    return { avg, max, min, tuntas, percentTuntas, totalSiswa: validScores.length };
  }, [legerPerMapelRows]);

  // Handle Refresh from Cloud
  const handleRefresh = async () => {
    if (!onPullAllFromCloud) return;
    setIsRefreshingCloud(true);
    try {
      await onPullAllFromCloud();
      setNotification('✅ Seluruh data nilai dan rombel berhasil disinkronkan dari Cloud Firestore!');
    } catch (e: any) {
      setNotification('Gagal memuat dari Cloud: ' + (e?.message || 'Periksa koneksi'));
    } finally {
      setIsRefreshingCloud(false);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  // Export to CSV / Excel for Per Mapel
  const handleExportPerMapelCSV = () => {
    if (!currentMapel || !currentKelas) return;
    let csv = `\uFEFFLEGER NILAI MATA PELAJARAN: ${currentMapel.namaMapel} (${currentMapel.kode})\n`;
    csv += `Kelas / Rombel: ${currentKelas.namaKelas} (${currentKelas.jurusan})\n`;
    csv += `Semester: ${semesterText} - Tahun Ajaran: ${schoolInfo?.tahunAjaranPembelajaran || '2026/2027'}\n`;
    csv += `Guru Pengampu: ${assignedTeacher?.nama || '-'}\n\n`;
    csv += `No,NIPD / NISN,Nama Peserta Didik,JK,LM 1,LM 2,LM 3,LM 4,Rata Formatif,Nilai Sumatif (${selectedPeriode}),Nilai Akhir,Predikat,Ketuntasan,Deskripsi Capaian\n`;

    legerPerMapelRows.forEach((r) => {
      const jk = r.student.jenisKelamin === 'Perempuan' || r.student.jk === 'P' ? 'P' : 'L';
      const cleanDeskripsi = `"${(r.deskripsi || '').replace(/"/g, '""')}"`;
      const cleanNama = `"${r.student.nama.replace(/"/g, '""')}"`;
      csv += `${r.no},'${r.nipdKey},${cleanNama},${jk},${r.lm1},${r.lm2},${r.lm3},${r.lm4},${r.formatif},${r.sumatif},${r.nilaiAkhir},${r.predikat},${r.ketercapaian},${cleanDeskripsi}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Leger_Mapel_${currentMapel.kode}_${currentKelas.namaKelas}_${selectedPeriode}.csv`.replace(/\s+/g, '_');
    link.click();
    URL.revokeObjectURL(url);
  };

  // Data for Ekskul mode
  const ekskulRows = useMemo(() => {
    if (!currentEkskul) return [];

    const targetStudents = selectedKelasId === 'all'
      ? usersList.filter(u => u.role === 'siswa')
      : usersList.filter(u => u.role === 'siswa' && (u.idKelas === selectedKelasId || u.kelas === currentKelas?.namaKelas));

    const gradeMap = new Map<string, NilaiEkskulSiswa>();
    nilaiEkskulList.forEach(ne => {
      if (ne.idEkskul === currentEkskul.id) {
        if ((ne as any).idSiswa) gradeMap.set((ne as any).idSiswa, ne);
        if (ne.nipd) gradeMap.set(ne.nipd, ne);
      }
    });

    const list: Array<{
      no: number;
      student: User;
      nipdKey: string;
      kelas: string;
      predikat: string;
      keterangan: string;
    }> = [];

    targetStudents.forEach(s => {
      const g = gradeMap.get(s.id) || (s.nipd ? gradeMap.get(s.nipd) : undefined);
      const isEnrolled = !!g || 
        (currentEkskul.anggota && currentEkskul.anggota.includes(s.id)) || 
        ((s as any).ekskul && String((s as any).ekskul).toLowerCase().includes(currentEkskul.nama.toLowerCase()));

      if (isEnrolled || g) {
        list.push({
          no: 0,
          student: s,
          nipdKey: s.nipd || s.nisn || s.nipOrNis || '-',
          kelas: s.kelas || s.namaKelas || '-',
          predikat: g?.predikat || 'Baik',
          keterangan: g?.keterangan || 'Aktif berpartisipasi dan disiplin dalam seluruh kegiatan ekstrakurikuler.',
        });
      }
    });

    if (searchKeyword.trim()) {
      const q = searchKeyword.toLowerCase();
      const filtered = list.filter(item => 
        item.student.nama.toLowerCase().includes(q) ||
        item.nipdKey.includes(q) ||
        item.kelas.toLowerCase().includes(q)
      );
      filtered.sort((a, b) => a.student.nama.localeCompare(b.student.nama));
      filtered.forEach((item, idx) => { item.no = idx + 1; });
      return filtered;
    }

    list.sort((a, b) => a.student.nama.localeCompare(b.student.nama));
    list.forEach((item, idx) => { item.no = idx + 1; });
    return list;
  }, [currentEkskul, selectedKelasId, usersList, nilaiEkskulList, currentKelas, searchKeyword]);

  // Export to CSV / Excel for Ekskul
  const handleExportEkskulCSV = () => {
    if (!currentEkskul) return;
    let csv = `\uFEFFBUKU LEGER REKAPITULASI NILAI EKSTRAKURIKULER: ${currentEkskul.nama}\n`;
    csv += `Kategori: ${currentEkskul.kategori}\n`;
    csv += `Pembina: ${currentEkskul.pembina || currentUser.nama}\n`;
    csv += `Semester: ${semesterText} - Tahun Ajaran: ${schoolInfo?.tahunAjaranPembelajaran || '2026/2027'}\n\n`;
    csv += `No,NIPD / NISN,Nama Peserta Didik,Kelas / Rombel,Predikat Nilai,Capaian Kompetensi / Keterangan Pembinaan\n`;

    ekskulRows.forEach((r) => {
      const cleanDesc = `"${(r.keterangan || '').replace(/"/g, '""')}"`;
      const cleanNama = `"${r.student.nama.replace(/"/g, '""')}"`;
      csv += `${r.no},'${r.nipdKey},${cleanNama},${r.kelas},${r.predikat},${cleanDesc}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Leger_Ekskul_${currentEkskul.nama}_${Date.now()}.csv`.replace(/\s+/g, '_');
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export to CSV / Excel for Leger Keseluruhan
  const handleExportKeseluruhanCSV = () => {
    if (!currentKelas) return;
    let csv = `\uFEFFBUKU LEGER NILAI KOLEKTIF ROMBEL KELAS: ${currentKelas.namaKelas}\n`;
    csv += `Program Keahlian: ${currentKelas.jurusan}\n`;
    csv += `Wali Kelas: ${currentKelas.namaWalas || currentUser.nama}\n`;
    csv += `Semester: ${semesterText} - Tahun Ajaran: ${schoolInfo?.tahunAjaranPembelajaran || '2026/2027'}\n\n`;

    const activeMapelsForExport = activeKeseluruhanMapels;
    const mapelHeaders = activeMapelsForExport.map(m => `"${m.kode || m.namaMapel}"`).join(',');
    csv += `No,NISN,NIPD,Nama Peserta Didik,JK,${mapelHeaders},Total Nilai,Rata-Rata,Ranking,Sakit,Izin,Alpa,Status Kenaikan\n`;

    legerKeseluruhanRows.forEach((r, idx) => {
      const jk = r.student.jenisKelamin === 'Perempuan' || r.student.jk === 'P' ? 'P' : 'L';
      const cleanNama = `"${r.student.nama.replace(/"/g, '""')}"`;
      const mapelScores = activeMapelsForExport.map(m => r.scores[m.id] !== undefined ? r.scores[m.id] : '').join(',');
      csv += `${idx + 1},'${r.student.nisn || ''},'${r.nipdKey},${cleanNama},${jk},${mapelScores},${r.total},${r.average},${idx + 1},${r.absensi.sakit},${r.absensi.izin},${r.absensi.alpa},${r.statusKenaikan}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Buku_Leger_Kolektif_${currentKelas.namaKelas}_${selectedPeriode}.csv`.replace(/\s+/g, '_');
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Inline Print Styles to ensure exact borders, landscape layout, and no cut-off */}
      <style>{`
        @media print {
          @page {
            size: ${activeMode === 'keseluruhan' ? 'A4 landscape' : 'A4 portrait'};
            margin: ${activeMode === 'keseluruhan' ? '6mm 8mm 6mm 8mm' : '10mm 12mm 10mm 12mm'};
          }
          body {
            background: white !important;
            color: black !important;
          }
          .no-print, header, nav, aside {
            display: none !important;
          }
          .printable-document {
            display: block !important;
            visibility: visible !important;
            position: static !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-border-table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          .print-border-table th, 
          .print-border-table td {
            border: 1px solid #0f172a !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-break-inside-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {notification && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2 shadow-sm no-print">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* TOP CONTROL PANEL (NO-PRINT) */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-5 no-print">
        {/* Main Title & Mode Switcher */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-500 text-white flex items-center justify-center shadow-md shrink-0">
              <Printer className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                  {isAuthorizedKeseluruhan ? 'Pusat Cetak Buku Leger Sekolah' : 'Cetak Leger Nilai Mata Pelajaran'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-bold">
                  Kurikulum Merdeka SMK
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">
                  {currentKelas?.namaKelas} • {currentKelas?.jurusan}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAuthorizedKeseluruhan 
                  ? 'Cetak dokumen resmi Buku Leger nilai per-mata pelajaran maupun leger kolektif keseluruhan tiap wali kelas dengan daftar mapel kejuruan presisi.'
                  : 'Cetak dokumen resmi rekapitulasi leger nilai mata pelajaran yang Anda ampu untuk peserta didik.'}
              </p>
            </div>
          </div>

          {/* MAIN MODES (Per Mapel & Keseluruhan Walas & Ekskul) */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 w-full lg:w-auto overflow-x-auto">
            {isAuthorizedKeseluruhan && (
              <button
                type="button"
                onClick={() => setActiveMode('keseluruhan')}
                className={`flex-1 lg:flex-none px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeMode === 'keseluruhan'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                <Table className="w-4 h-4" />
                <span>1. Leger Keseluruhan Tiap Walas</span>
              </button>
            )}

            {(!isPurePembina || teacherTaughtMapels.length > 0) && (
              <button
                type="button"
                onClick={() => setActiveMode('per_mapel')}
                className={`flex-1 lg:flex-none px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeMode === 'per_mapel'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>{isAuthorizedKeseluruhan ? '2. Leger Per-Mata Pelajaran' : 'Leger Nilai Mata Pelajaran Pribadi'}</span>
              </button>
            )}

            {canAccessEkskulMode && (
              <button
                type="button"
                onClick={() => setActiveMode('ekskul')}
                className={`flex-1 lg:flex-none px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeMode === 'ekskul'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                <Award className="w-4 h-4" />
                <span>{isPembina && !isSuperAdmin && !isAuthorizedKeseluruhan ? 'Leger Ekstrakurikuler Pribadi Binaan' : '3. Leger Ekstrakurikuler'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          {activeMode === 'ekskul' ? (
            <>
              {/* Ekskul Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-600" />
                  <span>{isPembina && !isSuperAdmin && !isAuthorizedKeseluruhan ? 'Pilih Ekstrakurikuler Binaan:' : 'Pilih Ekstrakurikuler:'}</span>
                </label>
                <select
                  value={selectedEkskulId}
                  onChange={(e) => setSelectedEkskulId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-amber-300 bg-amber-50/40 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs cursor-pointer"
                >
                  {pembinaEkskuls.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.nama} ({e.kategori}) — Pembina: {e.pembina || 'Binaan Anda'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Class Filter for Ekskul */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Filter Rombel / Kelas:</span>
                </label>
                <select
                  value={selectedKelasId}
                  onChange={(e) => {
                    setSelectedKelasId(e.target.value);
                    if (onSelectClassId && e.target.value !== 'all') onSelectClassId(e.target.value);
                  }}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs cursor-pointer"
                >
                  <option value="all">Semua Kelas / Rombel</option>
                  {sortedClasses.map(k => (
                    <option key={k.id} value={k.id}>
                      {k.namaKelas} ({k.jurusan})
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              {/* Class / Rombel Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{isAuthorizedKeseluruhan ? 'Pilih Kelas / Rombel Walas:' : 'Pilih Kelas Pembelajaran:'}</span>
                </label>
                <select
                  value={selectedKelasId}
                  onChange={(e) => {
                    setSelectedKelasId(e.target.value);
                    if (onSelectClassId) onSelectClassId(e.target.value);
                  }}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs cursor-pointer"
                >
                  {availableClasses.map(k => (
                    <option key={k.id} value={k.id}>
                      {k.namaKelas} ({k.jurusan}) {k.namaWalas ? `• Walas: ${k.namaWalas}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject Selector (Active in Per-Mapel mode) */}
              {activeMode === 'per_mapel' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{isAuthorizedKeseluruhan ? `Pilih Mata Pelajaran (${classMapels.length} Mapel ${currentKelas?.jurusan}):` : `Mata Pelajaran yang Diampu (${classMapels.length}):`}</span>
                  </label>
                  <select
                    value={selectedMapelId}
                    onChange={(e) => setSelectedMapelId(e.target.value)}
                    disabled={classMapels.length === 0}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-emerald-300 bg-emerald-50/40 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs cursor-pointer disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    {classMapels.length === 0 ? (
                      <option value="">Tidak ada mapel diampu di kelas ini</option>
                    ) : (
                      classMapels.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.kode ? `[${m.kode}] ` : ''}{m.namaMapel}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Mata Pelajaran Jurusan:</span>
                  </label>
                  <div className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                    {classMapels.length} Mapel Sesuai {currentKelas?.jurusan}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Periode Selector (Pilih Manual) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span>Periode Asesmen (Pilih Manual):</span>
              </span>
              {!selectedPeriode && (
                <span className="text-[10px] text-amber-600 font-normal italic">
                  (Belum dipilih)
                </span>
              )}
            </label>
            <div className="inline-flex items-center w-full p-1 bg-slate-100 rounded-xl border border-slate-200">
              {(['PTS', 'PAS', 'PAT'] as const).map(p => {
                const isSelected = selectedPeriode === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSelectedPeriode(p)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    {p === 'PTS' ? 'PTS (Tengah)' : p === 'PAS' ? 'PAS (Sem 1)' : 'PAT (Sem 2)'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <span>Cari Siswa:</span>
            </label>
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Ketik nama atau NISN..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
            />
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Info className="w-4 h-4 text-sky-500 shrink-0" />
            <span>
              {activeMode === 'keseluruhan' 
                ? (
                  hanyaMapelDiinput
                    ? `Menampilkan ${classStudents.length} peserta didik dan ${activeKeseluruhanMapels.length} mata pelajaran terinput (dari total ${classMapels.length} mapel) kelas ${currentKelas?.namaKelas}.`
                    : `Menampilkan ${classStudents.length} peserta didik dan seluruh ${classMapels.length} mata pelajaran kelas ${currentKelas?.namaKelas}.`
                )
                : activeMode === 'ekskul'
                  ? `Menampilkan ${ekskulRows.length} peserta didik pada ekstrakurikuler ${currentEkskul?.nama || ''}.`
                  : `Menampilkan leger nilai mata pelajaran ${currentMapel?.namaMapel || '-'} untuk ${classStudents.length} siswa.`}
            </span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {activeMode === 'keseluruhan' && (
              <button
                type="button"
                onClick={() => setHanyaMapelDiinput(!hanyaMapelDiinput)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                  hanyaMapelDiinput
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-2xs'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
                title={hanyaMapelDiinput ? 'Sedang menampilkan hanya mata pelajaran yang sudah diinput nilainya. Klik untuk tampilkan semua mapel kurikulum.' : 'Sedang menampilkan semua mapel. Klik untuk tampilkan hanya mapel yang diinput saja.'}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>{hanyaMapelDiinput ? `Hanya Mapel Diinput (${activeKeseluruhanMapels.length})` : `Semua Mapel (${classMapels.length})`}</span>
              </button>
            )}

            {onPullAllFromCloud && (
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshingCloud}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                title="Muat ulang data nilai dan siswa dari cloud"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingCloud ? 'animate-spin' : ''}`} />
                <span>Segarkan Data</span>
              </button>
            )}

            <button
              type="button"
              onClick={activeMode === 'keseluruhan' ? handleExportKeseluruhanCSV : (activeMode === 'ekskul' ? handleExportEkskulCSV : handleExportPerMapelCSV)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              title="Unduh data tabel dalam format spreadsheet Excel/CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Ekspor ke CSV / Excel</span>
            </button>

            {/* Pengaturan Kertas, Orientasi & Margin */}
            <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs">
              <span className="font-bold text-slate-500 pl-1.5 text-[11px]">Kertas:</span>
              <select
                value={printPaperSize}
                onChange={(e) => setPrintPaperSize(e.target.value as any)}
                className="bg-white px-2 py-1 rounded-lg font-bold text-slate-800 border border-slate-200 text-xs cursor-pointer"
              >
                <option value="F4">F4 / Folio (215 × 330 mm)</option>
                <option value="A4">A4 (210 × 297 mm)</option>
                <option value="Legal">Legal (216 × 356 mm)</option>
                <option value="Letter">Letter (216 × 279 mm)</option>
              </select>
            </div>

            <div className="inline-flex rounded-xl bg-slate-50 p-1 border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setPrintOrientation('landscape')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  printOrientation === 'landscape'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Mendatar (Landscape)"
              >
                Landscape
              </button>
              <button
                type="button"
                onClick={() => setPrintOrientation('portrait')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  printOrientation === 'portrait'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tegak (Portrait)"
              >
                Portrait
              </button>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs">
              <span className="font-bold text-slate-500 pl-1.5 text-[11px]">Margin:</span>
              <select
                value={printMargin}
                onChange={(e) => setPrintMargin(e.target.value as any)}
                className="bg-white px-2 py-1 rounded-lg font-bold text-slate-800 border border-slate-200 text-xs cursor-pointer"
              >
                <option value="minimal">Minimal (5 mm)</option>
                <option value="sempit">Sempit (10 mm)</option>
                <option value="normal">Normal (15 mm)</option>
              </select>
            </div>

            <button
              type="button"
              disabled={isPrintingDoc}
              onClick={async () => {
                setIsPrintingDoc(true);
                try {
                  const docEl = document.querySelector('.printable-document') as HTMLElement;
                  if (docEl) {
                    await printDocumentArea(docEl, {
                      title: activeMode === 'keseluruhan' 
                        ? `Buku Leger Nilai Kolektif - ${currentKelas?.namaKelas || 'Kelas'}` 
                        : activeMode === 'ekskul'
                          ? 'Buku Leger Ekstrakurikuler'
                          : `Buku Leger Mata Pelajaran - ${currentKelas?.namaKelas || 'Kelas'}`,
                      paperSize: printPaperSize,
                      orientation: printOrientation,
                      margin: printMargin,
                    });
                  } else {
                    window.print();
                  }
                } finally {
                  setIsPrintingDoc(false);
                }
              }}
              className="px-5 py-2.5 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-60"
              title="Cetak lembar dokumen leger saja ke printer / simpan PDF (tanpa halaman web)"
            >
              <Printer className="w-4 h-4" />
              <span>
                {isPrintingDoc 
                  ? 'Menyiapkan Dokumen...' 
                  : activeMode === 'keseluruhan' 
                    ? `Cetak Leger Saja (${printPaperSize})` 
                    : activeMode === 'ekskul'
                      ? `Cetak Leger Ekskul (${printPaperSize})`
                      : `Cetak Leger Mapel (${printPaperSize})`}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. VIEW & PRINTABLE DOCUMENT: LEGER KESELURUHAN KELAS / WALAS (KOLEKTIF)  */}
      {/* ========================================================================= */}
      {activeMode === 'keseluruhan' && isAuthorizedKeseluruhan && (
        <div className="printable-document bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-6">
          {/* KOP SURAT RESMI SEKOLAH */}
          <KopSuratView schoolInfo={schoolInfo} />

          {/* DOKUMEN TITLE */}
          <div className="text-center space-y-1 pb-2">
            <h2 className="text-base sm:text-lg font-black tracking-wide uppercase text-slate-900 underline underline-offset-4">
              BUKU LEGER NILAI KOLEKTIF HASIL BELAJAR PESERTA DIDIK
            </h2>
            <div className="text-xs sm:text-sm font-extrabold text-slate-800 uppercase tracking-wide">
              KURIKULUM MERDEKA • TAHUN AJARAN {schoolInfo?.tahunAjaranPembelajaran || '2026/2027'}
            </div>
            <div className="text-xs font-bold text-slate-600">
              SEMESTER {semesterText.toUpperCase()}
            </div>
          </div>

          {/* IDENTITAS KELAS & WALI KELAS */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
            <table className="w-full">
              <tbody>
                <tr className="leading-relaxed">
                  <td className="w-36 font-semibold text-slate-600">Satuan Pendidikan</td>
                  <td className="w-3">:</td>
                  <td className="font-bold text-slate-900">{schoolInfo?.namaLengkap || schoolInfo?.nama || 'SMK Bakti Putra Mandiri'}</td>
                </tr>
                <tr className="leading-relaxed">
                  <td className="font-semibold text-slate-600">Kelas / Rombel</td>
                  <td>:</td>
                  <td className="font-bold text-slate-900">{currentKelas?.namaKelas}</td>
                </tr>
                <tr className="leading-relaxed">
                  <td className="font-semibold text-slate-600">Konsentrasi Keahlian</td>
                  <td>:</td>
                  <td className="font-bold text-slate-900">{currentKelas?.jurusan}</td>
                </tr>
              </tbody>
            </table>

            <table className="w-full">
              <tbody>
                <tr className="leading-relaxed">
                  <td className="w-36 font-semibold text-slate-600">Wali Kelas</td>
                  <td className="w-3">:</td>
                  <td className="font-bold text-slate-900">{currentKelas?.namaWalas || currentUser.nama || '-'}</td>
                </tr>
                <tr className="leading-relaxed">
                  <td className="font-semibold text-slate-600">Jumlah Siswa</td>
                  <td>:</td>
                  <td className="font-bold text-slate-900">{classStudents.length} Peserta Didik</td>
                </tr>
                <tr className="leading-relaxed">
                  <td className="font-semibold text-slate-600">Titimangsa Cetak</td>
                  <td>:</td>
                  <td className="font-bold text-slate-900">{titimangsaTempat}, {titimangsaTanggal}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* TABEL BUKU LEGER KESELURUHAN (SEMUA MAPEL JURUSAN INI) */}
          <div className="overflow-x-auto rounded-xl border border-slate-300">
            <table className="print-border-table w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                  <th className="py-2 px-2 text-center w-8 border-r border-slate-300">No</th>
                  <th className="py-2 px-2 text-center w-24 border-r border-slate-300">NISN</th>
                  <th className="py-2 px-2 text-center w-24 border-r border-slate-300">NIPD</th>
                  <th className="py-2 px-3 border-r border-slate-300 min-w-[170px]">Nama Peserta Didik</th>
                  <th className="py-2 px-1.5 text-center w-8 border-r border-slate-300">L/P</th>

                  {/* Dynamic Subject Columns strictly for this class/major (hanya yang diinput jika filter aktif) */}
                  {activeKeseluruhanMapels.map(m => (
                    <th 
                      key={m.id} 
                      className="py-2 px-1 text-center w-12 border-r border-slate-300 text-[10px] font-bold uppercase bg-slate-50"
                      title={`${m.namaMapel} (${m.kode})`}
                    >
                      <div className="flex flex-col items-center justify-center">
                        <span>{m.kode || m.namaMapel.substring(0, 4)}</span>
                      </div>
                    </th>
                  ))}

                  <th className="py-2 px-2 text-center w-14 border-r border-slate-300 bg-slate-200/80 font-black text-slate-900">
                    Total
                  </th>
                  <th className="py-2 px-2 text-center w-14 border-r border-slate-300 bg-indigo-50 font-black text-indigo-900">
                    Rata
                  </th>
                  <th className="py-2 px-2 text-center w-10 border-r border-slate-300 bg-amber-50 font-black text-amber-900">
                    Rank
                  </th>
                  <th className="py-2 px-1 text-center w-7 border-r border-slate-300 text-[10px] text-emerald-800 font-bold" title="Hadir (H)">
                    H
                  </th>
                  <th className="py-2 px-1 text-center w-7 border-r border-slate-300 text-[10px] text-blue-800 font-bold" title="Sakit (S)">
                    S
                  </th>
                  <th className="py-2 px-1 text-center w-7 border-r border-slate-300 text-[10px] text-amber-800 font-bold" title="Izin (I)">
                    I
                  </th>
                  <th className="py-2 px-1 text-center w-7 border-r border-slate-300 text-[10px] text-rose-800 font-bold" title="Alpa (A)">
                    A
                  </th>
                  {selectedPeriode === 'PAT' && (
                    <th className="py-2 px-2 text-center w-28 text-[10px] bg-emerald-50 text-emerald-900 font-bold">
                      Kenaikan / Status
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {legerKeseluruhanRows.map((row, idx) => {
                  const jk = row.student.jenisKelamin === 'Perempuan' || row.student.jk === 'P' ? 'P' : 'L';
                  return (
                    <tr key={row.student.id} className="hover:bg-slate-50/80 transition-colors leading-tight">
                      <td className="py-1.5 px-2 text-center font-mono text-slate-500 border-r border-slate-200">{idx + 1}</td>
                      <td className="py-1.5 px-2 font-mono text-slate-700 text-center border-r border-slate-200 text-[11px]">{row.student.nisn || '-'}</td>
                      <td className="py-1.5 px-2 font-mono text-slate-700 text-center border-r border-slate-200 text-[11px]">{row.nipdKey}</td>
                      <td className="py-1.5 px-3 font-bold text-slate-900 border-r border-slate-200">{row.student.nama}</td>
                      <td className="py-1.5 px-1.5 text-center font-semibold text-slate-600 border-r border-slate-200 text-[11px]">{jk}</td>

                      {/* Mapel Scores (Hanya mapel terinput) */}
                      {activeKeseluruhanMapels.map(m => {
                        const val = row.scores[m.id];
                        return (
                          <td 
                            key={m.id} 
                            className="py-1.5 px-1 text-center font-mono border-r border-slate-200 text-[11px]"
                          >
                            {val !== undefined ? (
                              <span className={val < (m.kkm || 75) ? 'text-rose-600 font-bold' : 'text-slate-800 font-medium'}>
                                {val}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        );
                      })}

                      <td className="py-1.5 px-2 text-center font-black text-slate-900 bg-slate-50 border-r border-slate-200">
                        {row.total > 0 ? row.total : '-'}
                      </td>
                      <td className="py-1.5 px-2 text-center font-black text-indigo-700 bg-indigo-50/50 border-r border-slate-200">
                        {row.average > 0 ? row.average : '-'}
                      </td>
                      <td className="py-1.5 px-2 text-center font-black text-amber-800 bg-amber-50/50 border-r border-slate-200">
                        {row.average > 0 ? `#${idx + 1}` : '-'}
                      </td>
                      <td className="py-1.5 px-1 text-center font-mono font-bold text-emerald-700 border-r border-slate-200">
                        {row.absensi.hadir}
                      </td>
                      <td className="py-1.5 px-1 text-center font-mono font-bold text-blue-700 border-r border-slate-200">
                        {row.absensi.sakit}
                      </td>
                      <td className="py-1.5 px-1 text-center font-mono font-bold text-amber-700 border-r border-slate-200">
                        {row.absensi.izin}
                      </td>
                      <td className="py-1.5 px-1 text-center font-mono font-bold text-rose-700 border-r border-slate-200">
                        {row.absensi.alpa}
                      </td>
                      {selectedPeriode === 'PAT' && (
                        <td className="py-1.5 px-2 text-center text-[10px] font-bold text-emerald-800 bg-emerald-50/40">
                          {row.statusKenaikan}
                        </td>
                      )}
                    </tr>
                  );
                })}

                {legerKeseluruhanRows.length === 0 && (
                  <tr>
                    <td colSpan={activeKeseluruhanMapels.length + (selectedPeriode === 'PAT' ? 11 : 10)} className="py-8 text-center text-slate-400">
                      Belum ada data peserta didik pada rombel ini.
                    </td>
                  </tr>
                )}
              </tbody>

              {/* RATA-RATA MAPEL ROMBEL SUMMARY */}
              {legerKeseluruhanRows.length > 0 && activeKeseluruhanMapels.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                    <td colSpan={5} className="py-2 px-3 text-right border-r border-slate-300 uppercase text-[11px]">
                      Rata-Rata Kelas
                    </td>
                    {activeKeseluruhanMapels.map(m => {
                      const allScores = legerKeseluruhanRows
                        .map(r => r.scores[m.id])
                        .filter((v): v is number => typeof v === 'number');
                      const avg = allScores.length > 0 ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10 : '-';
                      return (
                        <td key={m.id} className="py-2 px-1 text-center font-mono text-[11px] border-r border-slate-300">
                          {avg}
                        </td>
                      );
                    })}
                    <td colSpan={selectedPeriode === 'PAT' ? 8 : 7} className="py-2 px-2 text-center text-[10px] text-slate-500">
                      -
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Alert jika belum ada mapel yang diinput */}
          {activeKeseluruhanMapels.length === 0 && (
            <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-2 no-print">
              <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
              <h4 className="font-bold text-slate-800 text-sm">Belum Ada Nilai Mata Pelajaran yang Diinput</h4>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Hanya mata pelajaran yang sudah diinput nilainya yang tampil pada Leger Keseluruhan. Silakan input nilai di Leger Guru Mapel terlebih dahulu atau klik tombol di bawah untuk menampilkan seluruh mapel kurikulum.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setHanyaMapelDiinput(false)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Tampilkan Seluruh Mapel Kurikulum ({classMapels.length} Mapel)
                </button>
              </div>
            </div>
          )}

          {/* LEGENDA MATA PELAJARAN JURUSAN */}
          {activeKeseluruhanMapels.length > 0 && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[10px] space-y-1 text-slate-700 print-break-inside-avoid">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 uppercase">Keterangan Singkatan Kode Mata Pelajaran ({currentKelas?.jurusan}):</span>
                <span className="text-[10px] text-slate-500 font-semibold">
                  {hanyaMapelDiinput ? `Hanya mapel terinput (${activeKeseluruhanMapels.length} dari ${classMapels.length} mapel)` : `Semua mapel (${classMapels.length})`}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 pt-1">
                {activeKeseluruhanMapels.map(m => (
                  <div key={m.id} className="truncate">
                    <span className="font-bold text-indigo-700">{m.kode || m.namaMapel.substring(0, 4)}</span>: {m.namaMapel}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TANDA TANGAN RESMI WALI KELAS & KEPALA SEKOLAH */}
          <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs print-break-inside-avoid">
            <div className="space-y-16">
              <div>
                <p className="text-slate-600">Mengetahui,</p>
                <p className="font-bold text-slate-900">Kepala SMK Bakti Putra Mandiri</p>
              </div>
              <div>
                <p className="font-black text-slate-900 underline underline-offset-2 uppercase">
                  {schoolInfo?.kepalaSekolah || 'Dr. H. Bambang Sutrisno, M.Pd.'}
                </p>
                <p className="text-[11px] text-slate-600">
                  {formatKepsekIdentifier(schoolInfo)}
                </p>
              </div>
            </div>

            <div className="space-y-16">
              <div>
                <p className="text-slate-600">{titimangsaTempat}, {titimangsaTanggal}</p>
                <p className="font-bold text-slate-900">Wali Kelas {currentKelas?.namaKelas}</p>
              </div>
              <div>
                <p className="font-black text-slate-900 underline underline-offset-2 uppercase">
                  {currentKelas?.namaWalas || currentUser.nama}
                </p>
                <p className="text-[11px] text-slate-600">
                  {formatTeacherIdentifier(currentWalas || currentUser)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. VIEW & PRINTABLE DOCUMENT: LEGER PER-MATA PELAJARAN                    */}
      {/* ========================================================================= */}
      {activeMode === 'per_mapel' && (!currentMapel || classMapels.length === 0) && (
        <div className="bg-white rounded-3xl p-8 sm:p-12 border-2 border-amber-200 shadow-xl max-w-xl mx-auto text-center space-y-4 my-8">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center text-amber-600">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">
              <ShieldAlert className="w-4 h-4 text-amber-700" />
              Akses Dibatasi: Leger Mapel Pribadi
            </span>
            <h3 className="text-lg font-black text-slate-900">
              Tidak Mengampu Mata Pelajaran di Rombel Ini
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              Sesuai ketentuan akademik, <strong>Guru Biasa dan Pembina hanya dapat mengakses dan mencetak leger nilai mata pelajaran yang diampunya sendiri secara pribadi</strong>. Anda tidak memiliki jadwal atau penugasan mata pelajaran di kelas <strong>{currentKelas?.namaKelas}</strong>.
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 text-left space-y-1.5">
            <p className="font-bold text-slate-800">Mata Pelajaran yang Sah Anda Ampu:</p>
            {teacherTaughtMapels.length > 0 ? (
              <ul className="list-disc list-inside text-emerald-700 font-semibold space-y-0.5">
                {teacherTaughtMapels.map(m => (
                  <li key={m.id}>{m.namaMapel} ({m.kode})</li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-400 italic">Belum ada mata pelajaran yang ditugaskan ke akun Anda.</p>
            )}
            <p className="text-[11px] text-slate-500 pt-1">
              Silakan pilih kelas pembelajaran lain pada menu di atas di mana Anda aktif mengajar.
            </p>
          </div>
        </div>
      )}

      {activeMode === 'per_mapel' && currentMapel && classMapels.length > 0 && (
        <div className="printable-document bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-6">
          {/* KOP SURAT RESMI SEKOLAH */}
          <KopSuratView schoolInfo={schoolInfo} />

          {/* DOKUMEN TITLE */}
          <div className="text-center space-y-1 pb-2">
            <h2 className="text-base sm:text-lg font-black tracking-wide uppercase text-slate-900 underline underline-offset-4">
              LEGER PENILAIAN HASIL BELAJAR MATA PELAJARAN
            </h2>
            <div className="text-xs sm:text-sm font-extrabold text-slate-800 uppercase tracking-wide">
              MATA PELAJARAN: {currentMapel?.namaMapel.toUpperCase()} ({currentMapel?.kode})
            </div>
            <div className="text-xs font-bold text-slate-600">
              KURIKULUM MERDEKA • TAHUN AJARAN {schoolInfo?.tahunAjaranPembelajaran || '2026/2027'} • SEMESTER {semesterText.toUpperCase()}
            </div>
          </div>

          {/* IDENTITAS MAPEL & KELAS */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-200">
            <table className="w-full">
              <tbody>
                <tr className="leading-relaxed">
                  <td className="w-36 font-semibold text-slate-600">Mata Pelajaran</td>
                  <td className="w-3">:</td>
                  <td className="font-bold text-slate-900">{currentMapel?.namaMapel} ({currentMapel?.kode})</td>
                </tr>
                <tr className="leading-relaxed">
                  <td className="font-semibold text-slate-600">Kelas / Rombel</td>
                  <td>:</td>
                  <td className="font-bold text-slate-900">{currentKelas?.namaKelas} ({currentKelas?.jurusan})</td>
                </tr>
                <tr className="leading-relaxed">
                  <td className="font-semibold text-slate-600">Guru Pengampu</td>
                  <td>:</td>
                  <td className="font-bold text-slate-900">{assignedTeacher?.nama || currentMapel?.guruPengampu || '-'}</td>
                </tr>
              </tbody>
            </table>

            <table className="w-full">
              <tbody>
                <tr className="leading-relaxed">
                  <td className="w-36 font-semibold text-slate-600">KKTP / KKM</td>
                  <td className="w-3">:</td>
                  <td className="font-bold text-slate-900">{currentMapel?.kkm || 75} (Kriteria Ketercapaian)</td>
                </tr>
                <tr className="leading-relaxed">
                  <td className="font-semibold text-slate-600">Wali Kelas</td>
                  <td>:</td>
                  <td className="font-bold text-slate-900">{currentKelas?.namaWalas || '-'}</td>
                </tr>
                <tr className="leading-relaxed">
                  <td className="font-semibold text-slate-600">Jumlah Siswa</td>
                  <td>:</td>
                  <td className="font-bold text-slate-900">{classStudents.length} Peserta Didik</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* TABEL LEGER PER MAPEL */}
          <div className="overflow-x-auto rounded-xl border border-slate-300">
            <table className="print-border-table w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                  <th className="py-2.5 px-2 text-center w-8 border-r border-slate-300">No</th>
                  <th className="py-2.5 px-2.5 text-center w-28 border-r border-slate-300">NISN / NIPD</th>
                  <th className="py-2.5 px-3 border-r border-slate-300 min-w-[170px]">Nama Peserta Didik</th>
                  <th className="py-2.5 px-1.5 text-center w-8 border-r border-slate-300">L/P</th>
                  
                  {/* Lingkup Materi Formatif */}
                  <th className="py-2 px-2 text-center w-12 border-r border-slate-300 text-[10px] bg-slate-50" title="Lingkup Materi 1">LM 1</th>
                  <th className="py-2 px-2 text-center w-12 border-r border-slate-300 text-[10px] bg-slate-50" title="Lingkup Materi 2">LM 2</th>
                  <th className="py-2 px-2 text-center w-12 border-r border-slate-300 text-[10px] bg-slate-50" title="Lingkup Materi 3">LM 3</th>
                  <th className="py-2 px-2 text-center w-12 border-r border-slate-300 text-[10px] bg-slate-50" title="Lingkup Materi 4">LM 4</th>
                  <th className="py-2 px-2 text-center w-14 border-r border-slate-300 text-[10px] bg-indigo-50/60 font-bold">Rata Formatif</th>
                  <th className="py-2 px-2 text-center w-14 border-r border-slate-300 text-[10px] bg-amber-50/60 font-bold">Sumatif ({selectedPeriode})</th>
                  <th className="py-2 px-2 text-center w-14 border-r border-slate-300 text-[10px] bg-emerald-100/70 font-black text-slate-900">Nilai Akhir</th>
                  <th className="py-2 px-2 text-center w-10 border-r border-slate-300 text-[10px] font-bold">Predikat</th>
                  <th className="py-2 px-2 text-center w-18 border-r border-slate-300 text-[10px] font-bold">Ketuntasan</th>
                  <th className="py-2 px-3 border-slate-300 min-w-[200px] text-[10px]">Capaian Kompetensi / Deskripsi TP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {legerPerMapelRows.map((row) => {
                  const jk = row.student.jenisKelamin === 'Perempuan' || row.student.jk === 'P' ? 'P' : 'L';
                  const isTuntas = row.ketercapaian === 'Tuntas';

                  return (
                    <tr key={row.student.id} className="hover:bg-slate-50/80 transition-colors leading-tight">
                      <td className="py-2 px-2 text-center font-mono text-slate-500 border-r border-slate-200">{row.no}</td>
                      <td className="py-2 px-2.5 font-mono text-slate-700 text-center border-r border-slate-200 text-[11px]">{row.nipdKey}</td>
                      <td className="py-2 px-3 font-bold text-slate-900 border-r border-slate-200">{row.student.nama}</td>
                      <td className="py-2 px-1.5 text-center font-semibold text-slate-600 border-r border-slate-200 text-[11px]">{jk}</td>

                      <td className="py-2 px-2 text-center font-mono text-slate-700 border-r border-slate-200">{row.lm1}</td>
                      <td className="py-2 px-2 text-center font-mono text-slate-700 border-r border-slate-200">{row.lm2}</td>
                      <td className="py-2 px-2 text-center font-mono text-slate-700 border-r border-slate-200">{row.lm3}</td>
                      <td className="py-2 px-2 text-center font-mono text-slate-700 border-r border-slate-200">{row.lm4}</td>

                      <td className="py-2 px-2 text-center font-mono font-bold text-indigo-700 bg-indigo-50/30 border-r border-slate-200">
                        {row.formatif}
                      </td>
                      <td className="py-2 px-2 text-center font-mono font-bold text-amber-700 bg-amber-50/30 border-r border-slate-200">
                        {row.sumatif}
                      </td>
                      <td className="py-2 px-2 text-center font-mono font-black text-slate-900 bg-emerald-50/50 border-r border-slate-200">
                        {row.nilaiAkhir}
                      </td>
                      <td className="py-2 px-2 text-center font-black text-slate-800 border-r border-slate-200">
                        {row.predikat}
                      </td>
                      <td className="py-2 px-2 text-center border-r border-slate-200">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isTuntas ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {row.ketercapaian}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-[10.5px] text-slate-700 leading-snug">
                        {row.deskripsi}
                      </td>
                    </tr>
                  );
                })}

                {legerPerMapelRows.length === 0 && (
                  <tr>
                    <td colSpan={14} className="py-8 text-center text-slate-400">
                      Belum ada data peserta didik pada rombel ini.
                    </td>
                  </tr>
                )}
              </tbody>

              {/* STATISTIK NILAI MAPEL SUMMARY */}
              {legerPerMapelRows.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                    <td colSpan={4} className="py-2.5 px-3 text-right border-r border-slate-300 uppercase text-[11px]">
                      Statistik Nilai Kelas:
                    </td>
                    <td colSpan={4} className="py-2.5 px-2 text-center border-r border-slate-300 text-[11px] text-slate-600">
                      Tertinggi: <span className="text-emerald-700 font-black">{perMapelStats.max}</span> • Terendah: <span className="text-rose-700 font-black">{perMapelStats.min}</span>
                    </td>
                    <td colSpan={2} className="py-2.5 px-2 text-center border-r border-slate-300 text-[11px] text-slate-500">-</td>
                    <td className="py-2.5 px-2 text-center font-black text-emerald-800 bg-emerald-100/60 border-r border-slate-300 text-xs">
                      {perMapelStats.avg}
                    </td>
                    <td colSpan={3} className="py-2.5 px-3 text-[11px] text-slate-700">
                      Ketuntasan: <span className="font-bold text-emerald-700">{perMapelStats.tuntas} / {perMapelStats.totalSiswa} Siswa ({perMapelStats.percentTuntas}%)</span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* TANDA TANGAN RESMI GURU MAPEL & KEPALA SEKOLAH */}
          <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs print-break-inside-avoid">
            <div className="space-y-16">
              <div>
                <p className="text-slate-600">Mengetahui,</p>
                <p className="font-bold text-slate-900">Kepala SMK Bakti Putra Mandiri</p>
              </div>
              <div>
                <p className="font-black text-slate-900 underline underline-offset-2 uppercase">
                  {schoolInfo?.kepalaSekolah || 'Dr. H. Bambang Sutrisno, M.Pd.'}
                </p>
                <p className="text-[11px] text-slate-600">
                  {formatKepsekIdentifier(schoolInfo)}
                </p>
              </div>
            </div>

            <div className="space-y-16">
              <div>
                <p className="text-slate-600">{titimangsaTempat}, {titimangsaTanggal}</p>
                <p className="font-bold text-slate-900">Guru Pengampu Mata Pelajaran</p>
              </div>
              <div>
                <p className="font-black text-slate-900 underline underline-offset-2 uppercase">
                  {assignedTeacher?.nama || currentMapel?.guruPengampu || '-'}
                </p>
                <p className="text-[11px] text-slate-600">
                  {formatTeacherIdentifier(assignedTeacher)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. VIEW & PRINTABLE DOCUMENT: LEGER EKSTRAKURIKULER BINAAN               */}
      {/* ========================================================================= */}
      {activeMode === 'ekskul' && (
        <div className="space-y-6">
          {!currentEkskul ? (
            <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 text-center space-y-3">
              <Award className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">Tidak Ada Ekstrakurikuler yang Ditugaskan</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Sebagai Pembina Ekstrakurikuler, Anda hanya dapat mengakses dan mencetak leger nilai untuk cabang ekstrakurikuler yang sah Anda bina.
              </p>
            </div>
          ) : (
            <div className="printable-document bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-6">
              {/* KOP SURAT RESMI SEKOLAH */}
              <KopSuratView schoolInfo={schoolInfo} />

              {/* DOKUMEN TITLE */}
              <div className="text-center space-y-1 pb-2">
                <h2 className="text-base sm:text-lg font-black tracking-wide uppercase text-slate-900 underline underline-offset-4">
                  BUKU LEGER REKAPITULASI NILAI EKSTRAKURIKULER
                </h2>
                <div className="text-xs sm:text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                  CABANG EKSTRAKURIKULER: {currentEkskul.nama.toUpperCase()} ({currentEkskul.kategori.toUpperCase()})
                </div>
                <div className="text-xs font-bold text-slate-600">
                  KURIKULUM MERDEKA • TAHUN AJARAN {schoolInfo?.tahunAjaranPembelajaran || '2026/2027'} • SEMESTER {semesterText.toUpperCase()}
                </div>
              </div>

              {/* IDENTITAS EKSKUL */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-amber-50/50 p-3.5 rounded-xl border border-amber-200">
                <table className="w-full">
                  <tbody>
                    <tr className="leading-relaxed">
                      <td className="w-40 font-semibold text-slate-600">Ekstrakurikuler</td>
                      <td className="w-3">:</td>
                      <td className="font-bold text-slate-900">{currentEkskul.nama}</td>
                    </tr>
                    <tr className="leading-relaxed">
                      <td className="font-semibold text-slate-600">Kategori Bidang</td>
                      <td>:</td>
                      <td className="font-bold text-slate-900">{currentEkskul.kategori}</td>
                    </tr>
                    <tr className="leading-relaxed">
                      <td className="font-semibold text-slate-600">Pembina Resmi</td>
                      <td>:</td>
                      <td className="font-bold text-indigo-700">{currentEkskul.pembina || currentUser.nama}</td>
                    </tr>
                  </tbody>
                </table>

                <table className="w-full">
                  <tbody>
                    <tr className="leading-relaxed">
                      <td className="w-40 font-semibold text-slate-600">Filter Rombel</td>
                      <td className="w-3">:</td>
                      <td className="font-bold text-slate-900">{selectedKelasId === 'all' ? 'Seluruh Peserta Didik Terdaftar' : (currentKelas?.namaKelas || 'Kelas Pilihan')}</td>
                    </tr>
                    <tr className="leading-relaxed">
                      <td className="font-semibold text-slate-600">Total Anggota</td>
                      <td>:</td>
                      <td className="font-bold text-emerald-700">{ekskulRows.length} Peserta Didik</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* TABEL LEGER EKSKUL */}
              <div className="overflow-x-auto rounded-xl border border-slate-300">
                <table className="print-border-table w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                      <th className="py-2.5 px-3 text-center w-12 border-r border-slate-300">No</th>
                      <th className="py-2.5 px-3 text-center w-28 border-r border-slate-300">NISN / NIPD</th>
                      <th className="py-2.5 px-4 border-r border-slate-300">Nama Peserta Didik</th>
                      <th className="py-2.5 px-3 text-center w-28 border-r border-slate-300">Kelas / Rombel</th>
                      <th className="py-2.5 px-3 text-center w-32 border-r border-slate-300">Predikat Nilai</th>
                      <th className="py-2.5 px-4">Capaian Kompetensi / Keterangan Pembinaan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {ekskulRows.map((r) => (
                      <tr key={r.student.id} className="hover:bg-slate-50/80 transition-colors leading-tight">
                        <td className="py-2 px-3 text-center font-mono text-slate-500 border-r border-slate-200">{r.no}</td>
                        <td className="py-2 px-3 text-center font-mono text-slate-700 border-r border-slate-200 text-[11px]">{r.nipdKey}</td>
                        <td className="py-2 px-4 font-bold text-slate-900 border-r border-slate-200">{r.student.nama}</td>
                        <td className="py-2 px-3 text-center text-slate-700 border-r border-slate-200">{r.kelas}</td>
                        <td className="py-2 px-3 text-center font-bold border-r border-slate-200">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.predikat === 'Sangat Baik' ? 'bg-emerald-100 text-emerald-800' :
                            r.predikat === 'Baik' ? 'bg-blue-100 text-blue-800' :
                            r.predikat === 'Cukup' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {r.predikat}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-[11px] text-slate-700 leading-relaxed">{r.keterangan}</td>
                      </tr>
                    ))}
                    {ekskulRows.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          Belum ada data nilai peserta didik pada cabang ekstrakurikuler ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* TANDA TANGAN RESMI PEMBINA EKSKUL & KEPALA SEKOLAH */}
              <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs print-break-inside-avoid">
                <div className="space-y-16">
                  <div>
                    <p className="text-slate-600">Mengetahui,</p>
                    <p className="font-bold text-slate-900">Kepala SMK Bakti Putra Mandiri</p>
                  </div>
                  <div>
                    <p className="font-black text-slate-900 underline underline-offset-2 uppercase">
                      {schoolInfo?.kepalaSekolah || 'Dr. H. Bambang Sutrisno, M.Pd.'}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      {formatKepsekIdentifier(schoolInfo)}
                    </p>
                  </div>
                </div>

                <div className="space-y-16">
                  <div>
                    <p className="text-slate-600">{titimangsaTempat}, {titimangsaTanggal}</p>
                    <p className="font-bold text-slate-900">Pembina Ekstrakurikuler</p>
                  </div>
                  <div>
                    <p className="font-black text-slate-900 underline underline-offset-2 uppercase">
                      {currentEkskul.pembina || currentUser.nama || '-'}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      {formatTeacherIdentifier({ nama: currentEkskul.pembina || currentUser.nama, nipOrNis: currentUser.nipOrNis })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
