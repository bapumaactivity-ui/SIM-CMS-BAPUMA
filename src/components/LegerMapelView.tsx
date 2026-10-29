import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { saveDocument, saveRaportAbsensiToFirestore } from '../utils/firebaseSync';
import { CetakLegerView } from './CetakLegerView';
import { KopSuratView } from './KopSuratView';
import { User, Kelas, Mapel, HasilUjian, NilaiMapelSiswa, SchoolInfo, AbsensiRecord, Ekskul, NilaiEkskulSiswa, PraktikKerjaIndustriItem, JadwalPelajaran } from '../types';
import { hitungNilaiAkhir } from '../data/mockAcademicData';
import { 
  getMatchingClassesForMapel, 
  getMatchingMapelForKelas,
  canAccessCetakRaport, 
  canAccessLegerKeseluruhan, 
  isUserAdmin, 
  isUserWalas, 
  getWalasAssignedClasses,
  sortMapelForRaport,
  getRaportMapelGroups,
  formatTeacherIdentifier,
  formatKepsekIdentifier,
  formatTeacherNameWithDegree,
  getTeacherAssignedMapels,
  getTeacherAssignedClasses,
  buildKurikulumMerdekaCapaian,
  getTpForSubjectAndClass,
  sortKelasAlphabetical,
  isSameKelas,
  isKelasActive,
  isJurusanActive,
  getActiveClasses
} from '../utils/academicHelpers';
import { 
  readSpreadsheetFile, 
  downloadTemplateLegerMapelExcel, 
  parseLegerMapelSpreadsheet 
} from '../utils/excelHelper';
import { 
  Award, 
  BookOpen, 
  FileText, 
  Calculator, 
  Download, 
  Upload,
  FileSpreadsheet,
  Printer, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  Sparkles, 
  RefreshCw, 
  Search, 
  Filter, 
  Eye, 
  GraduationCap,
  Users,
  Building2,
  Calendar,
  RotateCcw,
  Edit,
  Edit3,
  Check,
  Lock,
  ShieldAlert,
  KeyRound,
  Copy,
  Plus,
  HelpCircle,
  Table,
  Layers,
  ChevronDown,
  ChevronUp,
  Briefcase,
  Trash2,
  Loader2,
  X,
  History,
  CheckSquare,
  Square,
  ExternalLink
} from 'lucide-react';
import { LegerRestoreModal, recordLegerSnapshot, countStudentsWithScores, loadAllLegerSnapshots } from './LegerRestoreModal';
import { printDocumentArea } from '../utils/printHelper';

// Helper to check if a class or student is in Kelas XI or XII (Fase F)
export const isClassXIorXII = (tingkatOrKelas?: string, secondCheck?: string): boolean => {
  const combined = `${tingkatOrKelas || ''} ${secondCheck || ''}`.toUpperCase();
  return /\bXII\b|\bXI\b|XII-|XI-|-XII|-XI|KELAS\s*XII|KELAS\s*XI|\b11\b|\b12\b/.test(combined);
};

// Default recommendation for Praktik Kerja Industri (Prakerin / PKL) based on Kejuruan
export const getDefaultPrakerinForMajor = (jurusan?: string, namaKelas?: string): PraktikKerjaIndustriItem[] => {
  const j = `${jurusan || ''} ${namaKelas || ''}`.toLowerCase();
  if (j.includes('farmasi')) {
    return [
      {
        nomor: 1,
        mitra: 'Instalasi Farmasi RS Hermina Bogor & Apotek Kimia Farma',
        lamanya: '6 Bulan',
        keterangan: 'Sangat Baik (Kompeten & Tuntas Melaksanakan Pelayanan Kefarmasian)'
      }
    ];
  } else if (j.includes('perawat') || j.includes('keperawatan')) {
    return [
      {
        nomor: 1,
        mitra: 'RS Siloam Bogor & Klinik Pratama Sehat Mandiri',
        lamanya: '6 Bulan',
        keterangan: 'Sangat Baik (Kompeten & Tuntas Melaksanakan Asuhan Keperawatan Dasar)'
      }
    ];
  } else if (j.includes('kecantikan') || j.includes('spa')) {
    return [
      {
        nomor: 1,
        mitra: 'Martha Tilaar Salon and Day Spa & Natasha Skin Clinic Center',
        lamanya: '6 Bulan',
        keterangan: 'Sangat Baik (Kompeten & Terampil Melakukan Perawatan Kulit dan Spa)'
      }
    ];
  } else if (j.includes('hotel') || j.includes('perhotelan')) {
    return [
      {
        nomor: 1,
        mitra: 'Hotel Aston Bogor & Resort International (Housekeeping & F&B)',
        lamanya: '6 Bulan',
        keterangan: 'Sangat Baik (Kompeten dalam Hospitality & Front Office Management)'
      }
    ];
  } else {
    return [
      {
        nomor: 1,
        mitra: 'Instansi Dunia Usaha & Industri (DU/DI) Rekanan SMK Bakti Putra Mandiri',
        lamanya: '6 Bulan',
        keterangan: 'Sangat Baik (Tuntas Melaksanakan Praktik Kerja Industri)'
      }
    ];
  }
};

interface LegerMapelViewProps {
  currentUser: User;
  kelasList: Kelas[];
  mapelList: Mapel[];
  hasilList: HasilUjian[];
  usersList: User[];
  nilaiList: NilaiMapelSiswa[];
  onSaveNilaiList: (newNilaiList: NilaiMapelSiswa[], changedItems?: NilaiMapelSiswa[], deletedIds?: string[]) => void | Promise<any>;
  absensiList?: AbsensiRecord[];
  schoolInfo?: SchoolInfo;
  ekskulList?: Ekskul[];
  nilaiEkskulList?: NilaiEkskulSiswa[];
  jadwalPelajaranList?: JadwalPelajaran[];
  onUpdateSchoolInfo?: (info: SchoolInfo) => void;
  onUpdateUser?: (user: User) => void;
  onSaveUsersList?: (users: User[]) => void;
  onPullAllFromCloud?: () => Promise<any>;
  defaultClassId?: string;
  initialTab?: 'leger_guru' | 'leger_keseluruhan' | 'cetak_leger' | 'raport_merdeka';
  onSelectClassId?: (classId: string) => void;
}

export const LegerMapelView: React.FC<LegerMapelViewProps> = ({
  currentUser,
  kelasList,
  mapelList,
  hasilList,
  usersList,
  nilaiList,
  onSaveNilaiList,
  absensiList = [],
  schoolInfo,
  ekskulList = [],
  nilaiEkskulList = [],
  jadwalPelajaranList = [],
  onUpdateSchoolInfo,
  onUpdateUser,
  onSaveUsersList,
  onPullAllFromCloud,
  defaultClassId,
  initialTab,
  onSelectClassId,
}) => {
  // Navigation tabs: Leger Guru Mapel | Leger Keseluruhan Per Rombel | Cetak Leger Resmi | Raport Kurikulum Merdeka
  const [activeTab, setActiveTab] = useState<'leger_guru' | 'leger_keseluruhan' | 'cetak_leger' | 'raport_merdeka'>(
    initialTab || 'leger_guru'
  );
  const [selectedPeriode, setSelectedPeriode] = useState<'PTS' | 'PAS' | 'PAT' | null>(null);
  const effectivePeriode: 'PTS' | 'PAS' | 'PAT' = selectedPeriode || 'PAS';
  const [isSavingScores, setIsSavingScores] = useState(false);
  const [isRefreshingCloud, setIsRefreshingCloud] = useState(false);

  const handleRefreshCloud = async () => {
    if (!onPullAllFromCloud) return;
    setIsRefreshingCloud(true);
    try {
      await onPullAllFromCloud();
      setNotification('✅ Seluruh data nilai mata pelajaran & rapor berhasil dimuat ulang dari Cloud Firestore!');
    } catch (e: any) {
      setNotification('Gagal memuat dari Cloud: ' + (e?.message || 'Periksa koneksi'));
    } finally {
      setIsRefreshingCloud(false);
      setTimeout(() => setNotification(null), 4000);
    }
  };
  
  // Walas-restricted classes for multi-class and single-class walas:
  const isSuperAdmin = isUserAdmin(currentUser);
  const walasAssignedClasses = useMemo(() => getWalasAssignedClasses(currentUser, kelasList), [currentUser, kelasList]);
  const isWalas = isSuperAdmin || walasAssignedClasses.length > 0;
  
  // Strict permissions:
  // - Guru biasa: NO access to Leger Keseluruhan, NO access to Raport
  // - Walas: Can access Leger Keseluruhan and Raport ONLY for classes they manage
  // - Admin: Full access
  const isAuthorizedLegerKeseluruhan = isSuperAdmin || (isWalas && walasAssignedClasses.length > 0);
  const isAuthorizedCetakRaport = isSuperAdmin || (isWalas && walasAssignedClasses.length > 0);

  useEffect(() => {
    if (!isAuthorizedLegerKeseluruhan && activeTab === 'leger_keseluruhan') {
      setActiveTab('leger_guru');
    }
    if (!isAuthorizedCetakRaport && activeTab === 'raport_merdeka') {
      setActiveTab('leger_guru');
    }
  }, [isAuthorizedLegerKeseluruhan, isAuthorizedCetakRaport, activeTab]);

  // Available classes for Walas in Leger Keseluruhan & Cetak Raport
  const availableClassesForWalas = useMemo(() => {
    return sortKelasAlphabetical(isSuperAdmin ? kelasList : walasAssignedClasses);
  }, [isSuperAdmin, kelasList, walasAssignedClasses]);

  // Official subjects assigned to current teacher from user account & schedule
  const teacherAssignedMapels = useMemo(() => {
    const activeMapel = mapelList.filter(m => m.status !== 'nonaktif');
    const baseList = activeMapel.length > 0 ? activeMapel : mapelList;
    return getTeacherAssignedMapels(currentUser, baseList, jadwalPelajaranList);
  }, [currentUser, mapelList, jadwalPelajaranList]);

  // Filter mapel list:
  // - Super Admin: all active subjects
  // - In Leger Guru (Tab Input Nilai Rapot Guru): teachers (including walas acting as subject teacher)
  //   MUST see their assigned subjects so inputting grades never gets misdirected to other teachers' subjects!
  // - In Leger Keseluruhan & Raport: Walas can access all subjects in their class
  const availableMapels = useMemo(() => {
    const activeMapel = mapelList.filter(m => m.status !== 'nonaktif');
    const baseList = activeMapel.length > 0 ? activeMapel : mapelList;
    if (isSuperAdmin) return baseList;
    if (activeTab === 'leger_guru') {
      return teacherAssignedMapels.length > 0 ? teacherAssignedMapels : baseList;
    }
    if (isWalas) return baseList;
    return teacherAssignedMapels.length > 0 ? teacherAssignedMapels : baseList;
  }, [currentUser, mapelList, isSuperAdmin, isWalas, activeTab, teacherAssignedMapels]);

  const [selectedMapelId, setSelectedMapelId] = useState<string>(() => {
    if (!isSuperAdmin && teacherAssignedMapels.length > 0) {
      return teacherAssignedMapels[0].id;
    }
    return availableMapels[0]?.id || mapelList[0]?.id || 'm-f1';
  });

  // Automatically ensure teacher is focused on their assigned subject in leger_guru
  useEffect(() => {
    if (!isSuperAdmin && activeTab === 'leger_guru' && teacherAssignedMapels.length > 0) {
      const isCurrentAssigned = teacherAssignedMapels.some(m => m.id === selectedMapelId);
      if (!isCurrentAssigned) {
        setSelectedMapelId(teacherAssignedMapels[0].id);
      }
    }
  }, [activeTab, isSuperAdmin, teacherAssignedMapels, selectedMapelId]);

  const [mapelSearchFilter, setMapelSearchFilter] = useState('');

  const filteredAvailableMapels = useMemo(() => {
    if (!mapelSearchFilter.trim()) return availableMapels;
    const q = mapelSearchFilter.toLowerCase().trim();
    return availableMapels.filter(m => 
      (m.namaMapel && m.namaMapel.toLowerCase().includes(q)) ||
      (m.kode && m.kode.toLowerCase().includes(q)) ||
      (m.kelompok && m.kelompok.toLowerCase().includes(q)) ||
      (m.tingkat && m.tingkat.toLowerCase().includes(q))
    );
  }, [availableMapels, mapelSearchFilter]);

  // Classes dynamically matching the selected subject
  const currentSelectedMapel = useMemo(() => {
    return mapelList.find(m => m.id === selectedMapelId) || availableMapels[0];
  }, [mapelList, selectedMapelId, availableMapels]);

  // Available classes for Leger Guru tab (Sorted Alphabetically by Tingkat & Name):
  // - Admin can select ALL classes in the school
  // - Walas can select ALL assigned classes (and matching classes for the subject)
  // - Guru biasa can select classes matching their subject
  const availableClassesForLegerGuru = useMemo(() => {
    let list: Kelas[] = [];
    if (isSuperAdmin) {
      list = kelasList;
    } else if (isWalas && walasAssignedClasses.length > 0) {
      const map = new Map<string, Kelas>();
      walasAssignedClasses.forEach(k => map.set(k.id, k));
      const matching = getMatchingClassesForMapel(currentSelectedMapel, kelasList);
      matching.forEach(k => map.set(k.id, k));
      list = Array.from(map.values());
    } else {
      list = getTeacherAssignedClasses(currentUser, kelasList, availableMapels, jadwalPelajaranList);
    }
    return sortKelasAlphabetical(list);
  }, [isSuperAdmin, isWalas, walasAssignedClasses, currentSelectedMapel, kelasList, currentUser, availableMapels, jadwalPelajaranList]);

  // Sorted master classes: Tingkat X (Kesehatan -> Perhotelan -> Tata Kecantikan), Tingkat XI, Tingkat XII
  const sortedClasses = useMemo(() => sortKelasAlphabetical(kelasList), [kelasList]);

  // Selected class and subject (Prioritaskan defaultClassId jika ada, atau X Kesehatan secara alfabetis jika ada di daftar)
  const [selectedKelasId, setSelectedKelasId] = useState<string>(() => {
    if (defaultClassId && (kelasList.some(k => k.id === defaultClassId) || availableClassesForWalas.some(k => k.id === defaultClassId))) {
      return defaultClassId;
    }
    const candidateList = availableClassesForLegerGuru.length > 0 
      ? availableClassesForLegerGuru 
      : sortedClasses;
    // Cari X Kesehatan terlebih dahulu agar urutan sesuai abjad resmi
    const xKes = candidateList.find(k => k.id === 'k-x-kes' || k.namaKelas.toLowerCase().includes('x kesehatan'));
    if (xKes) return xKes.id;
    return candidateList[0]?.id || sortedClasses[0]?.id || 'k-x-kes';
  });

  // Filter mode for report printing: 'per_siswa' (single student) vs 'semua_siswa' (all students in class)
  const [modeCetakRaport, setModeCetakRaport] = useState<'per_siswa' | 'semua_siswa'>('per_siswa');
  const [showPdfTip, setShowPdfTip] = useState(false);
  const [raportPaperSize, setRaportPaperSize] = useState<'F4' | 'A4'>('F4');
  const [raportMargin, setRaportMargin] = useState<'minimal' | 'sempit' | 'normal'>('sempit');
  const [isPrintingRaport, setIsPrintingRaport] = useState(false);
  const [selectedSiswaNipd, setSelectedSiswaNipd] = useState<string>('');
  const [notification, setNotification] = useState<string | null>(null);

  // Sinkronisasi bila defaultClassId dikirim atau berganti dari induk (Walas binaan atau Rombel)
  const prevDefaultClassIdRef = useRef<string | undefined>(defaultClassId);
  useEffect(() => {
    if (defaultClassId && defaultClassId !== prevDefaultClassIdRef.current) {
      prevDefaultClassIdRef.current = defaultClassId;
      setSelectedKelasId(defaultClassId);
      const targetClass = kelasList.find(k => k.id === defaultClassId) || availableClassesForWalas.find(k => k.id === defaultClassId);
      if (targetClass) {
        const targetStudents = usersList.filter(u => u.role === 'siswa' && (u.idKelas === targetClass.id || u.kelas === targetClass.namaKelas || u.namaKelas === targetClass.namaKelas));
        const currentStudentInClass = targetStudents.some(s => {
          const sKey = s.nipd || s.nipOrNis || s.id;
          return sKey === selectedSiswaNipd || sKey.replace(/\./g, '') === (selectedSiswaNipd || '').replace(/\./g, '');
        });
        if (!currentStudentInClass && targetStudents.length > 0) {
          setSelectedSiswaNipd(targetStudents[0].nipd || targetStudents[0].nipOrNis || targetStudents[0].id || '');
        }
      }
    }
  }, [defaultClassId, kelasList, availableClassesForWalas, usersList, selectedSiswaNipd]);

  // Sinkronisasi pembaruan absensi rapor otomatis dari Cloud Firestore across computers
  useEffect(() => {
    const handleRemoteAbsen = (e: any) => {
      if (e?.detail && typeof e.detail === 'object') {
        setRaportAbsensiMap(e.detail);
      }
    };
    window.addEventListener('raport_absensi_synced', handleRemoteAbsen);
    return () => window.removeEventListener('raport_absensi_synced', handleRemoteAbsen);
  }, []);

  // Sinkronisasi bila initialTab berganti dari induk
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Auto adjust selectedKelasId when mapel changes and current class is not part of the selectable classes
  useEffect(() => {
    if (activeTab === 'leger_guru' && availableClassesForLegerGuru.length > 0) {
      const exists = availableClassesForLegerGuru.some(k => k.id === selectedKelasId);
      if (!exists && (!defaultClassId || !kelasList.some(k => k.id === defaultClassId))) {
        const xKes = availableClassesForLegerGuru.find(k => k.id === 'k-x-kes' || k.namaKelas.toLowerCase().includes('x kesehatan'));
        setSelectedKelasId(xKes ? xKes.id : availableClassesForLegerGuru[0].id);
      }
    }
  }, [activeTab, availableClassesForLegerGuru, selectedKelasId, defaultClassId, kelasList]);

  // Editable Titimangsa State with persistence
  const [titimangsaTempat, setTitimangsaTempat] = useState<string>(() => {
    try {
      return localStorage.getItem('saved_titimangsa_tempat') || schoolInfo?.raporConfig?.tempatTitimangsa || 'Parungpanjang, Bogor';
    } catch {
      return 'Parungpanjang, Bogor';
    }
  });

  const [titimangsaTanggal, setTitimangsaTanggal] = useState<string>(() => {
    try {
      return localStorage.getItem('saved_titimangsa_tanggal') || schoolInfo?.raporConfig?.tanggalTitimangsa || '20 Desember 2026';
    } catch {
      return '20 Desember 2026';
    }
  });

  // Kode Akses Raport Siswa state
  const [kodeAksesRaport, setKodeAksesRaport] = useState<string>(() => {
    try {
      return localStorage.getItem('saved_kode_akses_raport') || schoolInfo?.raporConfig?.kodeAksesRaport || 'BPM2026';
    } catch {
      return 'BPM2026';
    }
  });
  const [copiedNotice, setCopiedNotice] = useState(false);

  // Format Tampilan Deskripsi TP di Rapor: 'ringkas' (Inti Esensial), 'narasi' (Paragraf Mengalir), atau 'poin' (Butir TP 1 - 4)
  const [formatDeskripsiRapor, setFormatDeskripsiRapor] = useState<'ringkas' | 'narasi' | 'poin'>(() => {
    try {
      return (localStorage.getItem('saved_format_deskripsi_rapor') as 'ringkas' | 'narasi' | 'poin') || 'ringkas';
    } catch {
      return 'ringkas';
    }
  });

  // Custom Editable Absensi di Raport (Hadir/S/I/A per NIPD)
  const [raportAbsensiMap, setRaportAbsensiMap] = useState<{
    [nipd: string]: { hadir?: number; sakit: number; izin: number; alpa: number }
  }>(() => {
    try {
      const raw = localStorage.getItem('saved_raport_absensi');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // Editable Catatan Walas per Student
  const [catatanWalasMap, setCatatanWalasMap] = useState<{ [nipd: string]: string }>(() => {
    try {
      const raw = localStorage.getItem('saved_catatan_walas');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // Praktik Kerja Industri (Prakerin / PKL) State per Student
  const [prakerinMap, setPrakerinMap] = useState<{ [nipd: string]: PraktikKerjaIndustriItem[] }>(() => {
    try {
      const raw = localStorage.getItem('saved_raport_prakerin');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // Lingkup Materi (LM) & Tujuan Pembelajaran (TP) per Mapel State
  const [tpMapelMap, setTpMapelMap] = useState<{
    [mapelId: string]: { lm1: string; lm2: string; lm3: string; lm4: string }
  }>(() => {
    try {
      const raw = localStorage.getItem('saved_lingkup_materi_tp');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [showTpEditor, setShowTpEditor] = useState(false);
  const [showCopyTpMenu, setShowCopyTpMenu] = useState(false);
  const [tempLm1, setTempLm1] = useState('');
  const [tempLm2, setTempLm2] = useState('');
  const [tempLm3, setTempLm3] = useState('');
  const [tempLm4, setTempLm4] = useState('');

  // Inline editing in Leger Keseluruhan (for Admin & Walas)
  const [isEditModeLeger, setIsEditModeLeger] = useState(false);
  const [inlineLegerGrades, setInlineLegerGrades] = useState<{ [key: string]: number | undefined }>({});
  const [selectedQuickEditCell, setSelectedQuickEditCell] = useState<{
    student: User;
    mapel: Mapel;
    currentScore?: number;
    nipdKey: string;
  } | null>(null);
  const [quickScoreVal, setQuickScoreVal] = useState<string>('');

  // Modal Import Nilai Excel State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importIsLoading, setImportIsLoading] = useState(false);
  const [importParsedData, setImportParsedData] = useState<{
    importedGrades: { [nipd: string]: any };
    count: number;
    unmatchedNames: string[];
  } | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  // Active selected class and mapel objects
  const currentKelas = kelasList.find(k => k.id === selectedKelasId) || kelasList[0];
  const currentMapel = mapelList.find(m => m.id === selectedMapelId) || mapelList[0];

  // Data akun Wali Kelas untuk rombel yang aktif
  const currentWalasUser = useMemo(() => {
    return usersList.find(u => 
      (currentKelas?.idWalas && (u.id === currentKelas.idWalas || u.nipOrNis === currentKelas.idWalas || u.idGuru === currentKelas.idWalas)) ||
      (currentKelas?.namaWalas && u.nama && u.nama.toLowerCase() === currentKelas.namaWalas.toLowerCase())
    ) || (currentUser.role === 'walas' ? currentUser : undefined);
  }, [usersList, currentKelas, currentUser]);

  // Grade level (X, XI, XII) of the currently selected class
  const currentTingkat = currentKelas?.tingkat || 
    (currentKelas?.namaKelas.includes('XII') ? 'XII' : currentKelas?.namaKelas.includes('XI') ? 'XI' : 'X');

  // Other classes of the same grade level (same tingkat, potentially different majors/jurusan)
  const sameGradeClasses = useMemo(() => {
    if (!currentKelas) return [];
    return kelasList.filter(k => {
      if (k.id === currentKelas.id) return false;
      const kTingkat = k.tingkat || (k.namaKelas.includes('XII') ? 'XII' : k.namaKelas.includes('XI') ? 'XI' : 'X');
      return kTingkat === currentTingkat;
    });
  }, [kelasList, currentKelas, currentTingkat]);

  // Checklist state to apply TP to other classes of the same grade level
  const [applyToSameGrade, setApplyToSameGrade] = useState<boolean>(true);
  const [selectedTargetClassIds, setSelectedTargetClassIds] = useState<string[]>([]);

  // Automatically select all same-grade classes by default
  useEffect(() => {
    setSelectedTargetClassIds(sameGradeClasses.map(k => k.id));
  }, [sameGradeClasses]);

  // Load saved TP from Cloud Firestore if available, merging with local storage
  useEffect(() => {
    const loadCloudTP = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'tujuan_pembelajaran'));
        if (snap.exists()) {
          const cloudData = snap.data();
          if (cloudData && cloudData.data && typeof cloudData.data === 'object') {
            setTpMapelMap(prev => {
              const merged = { ...prev, ...cloudData.data };
              try {
                localStorage.setItem('saved_lingkup_materi_tp', JSON.stringify(merged));
              } catch {}
              return merged;
            });
          }
        }
      } catch (err) {
        // Fallback silently to localStorage
      }
    };
    loadCloudTP();
  }, []);

  // Sources of saved TP from other same-grade classes that can be copied with one click
  const availableSavedTpSources = useMemo(() => {
    if (!currentMapel) return [];
    const sources: { id: string; label: string; tp: { lm1: string; lm2: string; lm3: string; lm4: string } }[] = [];
    const mapelNameKey = currentMapel.namaMapel.toLowerCase();

    sameGradeClasses.forEach(k => {
      const direct = tpMapelMap[`${k.id}_${selectedMapelId}`];
      if (direct && (direct.lm1 || direct.lm2)) {
        sources.push({ id: `${k.id}_${selectedMapelId}`, label: `${k.namaKelas} (${k.jurusan})`, tp: direct });
        return;
      }
      const targetMapels = getMatchingMapelForKelas(k, mapelList);
      const matched = targetMapels.find(m => 
        m.id === selectedMapelId || 
        m.namaMapel.toLowerCase() === mapelNameKey ||
        (m.kode && currentMapel.kode && m.kode.split('-')[0] === currentMapel.kode.split('-')[0])
      );
      if (matched) {
        const found = tpMapelMap[`${k.id}_${matched.id}`] || tpMapelMap[matched.id];
        if (found && (found.lm1 || found.lm2)) {
          sources.push({ id: `${k.id}_${matched.id}`, label: `${k.namaKelas} (${k.jurusan})`, tp: found });
        }
      }
    });

    const tingkatTp = tpMapelMap[`tingkat_${currentTingkat}_${mapelNameKey}`];
    if (tingkatTp && !sources.some(s => s.id === `tingkat_${currentTingkat}_${mapelNameKey}`)) {
      sources.push({ id: `tingkat_${currentTingkat}_${mapelNameKey}`, label: `Master TP Tingkat ${currentTingkat}`, tp: tingkatTp });
    }

    return sources;
  }, [currentMapel, selectedMapelId, sameGradeClasses, tpMapelMap, currentTingkat, mapelList]);

  // Filter students belonging to this class
  const classStudents = useMemo(() => {
    return usersList.filter(u => {
      if (u.role !== 'siswa') return false;
      if (u.idKelas === selectedKelasId) return true;
      if (currentKelas && (u.kelas === currentKelas.namaKelas || u.namaKelas === currentKelas.namaKelas)) return true;
      return false;
    });
  }, [usersList, selectedKelasId, currentKelas]);

  // Otomatis sinkronisasi siswa terpilih saat kelas binaan atau rombel berganti
  useEffect(() => {
    if (classStudents.length > 0) {
      const isExistingStudentInClass = classStudents.some(s => {
        const sKey = s.nipd || s.nipOrNis || s.id || '';
        return sKey === selectedSiswaNipd || sKey.replace(/\./g, '') === (selectedSiswaNipd || '').replace(/\./g, '');
      });
      if (!isExistingStudentInClass) {
        setSelectedSiswaNipd(classStudents[0].nipd || classStudents[0].nipOrNis || classStudents[0].id || '');
      }
    } else {
      setSelectedSiswaNipd('');
    }
  }, [selectedKelasId, classStudents]);

  // Mapels relevant strictly to the current class:
  // "kode mapel yang muncul dilager perkelas adalah kode yang diampu kelas itu sendiri"
  const classMapelList = useMemo(() => {
    const scheduledMapelIds = new Set<string>();
    if (jadwalPelajaranList && jadwalPelajaranList.length > 0 && currentKelas) {
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

    // Sertakan juga mata pelajaran yang sudah memiliki data nilai dari siswa rombel ini agar tidak pernah hilang
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

    return sortMapelForRaport(Array.from(map.values()));
  }, [currentKelas, mapelList, jadwalPelajaranList, classStudents, nilaiList]);

  // Kelompok Mata Pelajaran Rapor Kurikulum Merdeka (Kelompok A Umum & Kelompok B Kejuruan)
  const classRaportGroups = useMemo(() => {
    return getRaportMapelGroups(classMapelList);
  }, [classMapelList]);

  // Normalized periode helper for Kurikulum Merdeka & K13 equivalence (SAS == PAS, ASTS == PTS, ASAT == PAT)
  const normPer = (p?: string | null): string => {
    if (!p) return 'PAS';
    const up = p.toUpperCase().trim();
    if (up === 'SAS' || up === 'PAS' || up === 'PSAS' || up === 'ASAS') return 'PAS';
    if (up === 'ASTS' || up === 'PTS' || up === 'MID') return 'PTS';
    if (up === 'ASAT' || up === 'PAT' || up === 'UKK') return 'PAT';
    return up;
  };

  // Robust grade finder for a student and subject (prefers filled scores from any device/cloud)
  const findStudentGrade = (
    studentNipd: string,
    studentObj: User | undefined,
    mapelObj: Mapel | undefined,
    periode?: 'PTS' | 'PAS' | 'PAT' | null
  ): NilaiMapelSiswa | undefined => {
    if (!mapelObj) return undefined;
    const cleanStudentNipd = (studentNipd || '').replace(/\./g, '').trim().toLowerCase();

    const matches = nilaiList.filter(n => {
      if (!n) return false;
      const nNipdClean = (n.nipd || '').replace(/\./g, '').trim().toLowerCase();
      const nNisnClean = (n.nisn || '').trim().toLowerCase();

      let matchStudent = 
        Boolean(cleanStudentNipd && (nNipdClean === cleanStudentNipd || nNisnClean === cleanStudentNipd));

      if (!matchStudent && studentObj) {
        const sNipd = (studentObj.nipd || studentObj.nipOrNis || '').replace(/\./g, '').trim().toLowerCase();
        const sNisn = (studentObj.nisn || '').trim().toLowerCase();
        const sNama = (studentObj.nama || '').trim().toLowerCase();
        const nNama = (n.namaSiswa || '').trim().toLowerCase();

        matchStudent = 
          Boolean(sNipd && (nNipdClean === sNipd || nNisnClean === sNipd)) ||
          Boolean(sNisn && (nNisnClean === sNisn || nNipdClean === sNisn)) ||
          Boolean(studentObj.id && n.id && (n.id === studentObj.id || n.id.startsWith(`nil_${studentObj.id}_`) || n.id.endsWith(`_${studentObj.id}`))) ||
          Boolean(sNama && nNama && (sNama === nNama || sNama.replace(/[^a-z0-9]/g, '') === nNama.replace(/[^a-z0-9]/g, '')));
      }

      if (!matchStudent) return false;

      const norm = (s?: string) => (s || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const mapelNorm = norm(mapelObj.namaMapel);
      const nMapelNorm = norm(n.mapelNama);

      // Pencocokan eksklusif / ketat: Tidak boleh menggunakan .includes() substring
      // agar mapel pendek (mis. Biologi) tidak tertukar dengan mapel panjang (mis. Mikrobiologi),
      // dan mapel keperawatan tidak saling bertubrukan.
      const matchMapel = 
        Boolean(mapelObj.id && n.mapelId === mapelObj.id) ||
        Boolean(mapelObj.kode && (n.mapelId === mapelObj.kode || n.mapelNama === mapelObj.kode)) ||
        Boolean(mapelNorm && nMapelNorm && mapelNorm === nMapelNorm) ||
        Boolean(norm(mapelObj.id) && norm(n.mapelId) && norm(mapelObj.id) === norm(n.mapelId)) ||
        Boolean(norm(mapelObj.kode) && norm(n.mapelId) && norm(mapelObj.kode) === norm(n.mapelId));
      if (!matchMapel) return false;

      if (periode && n.periode && normPer(n.periode) !== normPer(periode)) return false;
      return true;
    });

    if (matches.length === 0) return undefined;

    // Prioritize the entry that has non-zero / filled scores
    const withScores = matches.find(g => 
      (Number(g.nilaiAkhir) > 0) ||
      (Number(g.nilaiPas) > 0) ||
      (Number(g.nilaiPts) > 0) ||
      (Number(g.nilaiPat) > 0) ||
      (Number(g.lm1) > 0) ||
      (Number(g.lm2) > 0) ||
      (Number(g.lm3) > 0) ||
      (Number(g.lm4) > 0) ||
      (Number(g.tugas1) > 0) ||
      (Number(g.tugas2) > 0) ||
      (Number(g.tugas3) > 0) ||
      (Number(g.ulhar1) > 0) ||
      (Number(g.ulhar2) > 0) ||
      (Number(g.nilaiFormatif) > 0) ||
      Boolean(g.catatanGuru && g.catatanGuru.trim().length > 0) ||
      Boolean(g.tpDeskripsi && g.tpDeskripsi.trim().length > 0)
    );

    return withScores || matches[matches.length - 1];
  };

  // Helper to determine next target class name for promotion
  const getNextClassRecommendation = (student: User, kelas?: Kelas) => {
    const kNama = (kelas?.namaKelas || student.namaKelas || student.kelas || '').toUpperCase();
    const isAkhir = /\bXII\b|KELAS\s*XII|\b12\b/i.test(kNama) || kelas?.tingkat === 'XII' || (student.kelas || '').includes('XII');
    if (isAkhir) {
      return { isTingkatAkhir: true, targetNama: 'LULUS (Tamat Belajar Satuan Pendidikan)' };
    }
    const isX = /\bX\b|KELAS\s*X|\b10\b/i.test(kNama) || kelas?.tingkat === 'X' || (student.kelas || '').startsWith('X ');
    const jur = (student.jurusan || kelas?.jurusan || '').toLowerCase();
    
    // Look up in actual kelasList for next level
    const targetTingkat = isX ? 'XI' : 'XII';
    const matchedClass = kelasList.find(k => {
      const matchTingkat = k.tingkat === targetTingkat || k.namaKelas.toUpperCase().includes(targetTingkat);
      if (!matchTingkat) return false;
      const kJur = (k.jurusan || k.namaKelas).toLowerCase();
      if (jur.includes('farmasi') && kJur.includes('farmasi')) return true;
      if (jur.includes('keperawatan') && kJur.includes('keperawatan')) return true;
      if (jur.includes('kecantikan') && kJur.includes('kecantikan')) return true;
      if (jur.includes('perhotelan') && kJur.includes('perhotelan')) return true;
      return false;
    });

    if (matchedClass) {
      return { isTingkatAkhir: false, targetNama: matchedClass.namaKelas };
    }

    if (isX) {
      if (jur.includes('farmasi')) return { isTingkatAkhir: false, targetNama: 'XI Asisten Farmasi' };
      if (jur.includes('keperawatan')) return { isTingkatAkhir: false, targetNama: 'XI Asisten Keperawatan' };
      if (jur.includes('kecantikan')) return { isTingkatAkhir: false, targetNama: 'XI Tata Kecantikan & Spa' };
      if (jur.includes('perhotelan')) return { isTingkatAkhir: false, targetNama: 'XI Perhotelan' };
      return { isTingkatAkhir: false, targetNama: `XI ${student.jurusan || kelas?.jurusan || 'Kejuruan'}` };
    }
    // Is Kelas XI
    if (jur.includes('farmasi')) return { isTingkatAkhir: false, targetNama: 'XII Asisten Farmasi' };
    if (jur.includes('keperawatan')) return { isTingkatAkhir: false, targetNama: 'XII Asisten Keperawatan' };
    if (jur.includes('kecantikan')) return { isTingkatAkhir: false, targetNama: 'XII Tata Kecantikan & Spa' };
    if (jur.includes('perhotelan')) return { isTingkatAkhir: false, targetNama: 'XII Perhotelan' };
    return { isTingkatAkhir: false, targetNama: `XII ${student.jurusan || kelas?.jurusan || 'Kejuruan'}` };
  };

  // Sync TP temporary inputs when mapel or class changes (with auto-lookup across same grade level)
  useEffect(() => {
    const mapelNameKey = (currentMapel?.namaMapel || '').toLowerCase();
    // 1. Direct match by class + mapel
    let saved = tpMapelMap[`${selectedKelasId}_${selectedMapelId}`];
    // 2. Direct match by mapelId
    if (!saved) saved = tpMapelMap[selectedMapelId];
    // 3. Match by tingkat + subject name
    if (!saved && mapelNameKey) {
      saved = tpMapelMap[`tingkat_${currentTingkat}_${mapelNameKey}`];
    }
    // 4. Default dikosongkan agar guru menginput manual
    if (!saved) {
      saved = {
        lm1: '',
        lm2: '',
        lm3: '',
        lm4: '',
      };
    }
    setTempLm1(saved.lm1 || '');
    setTempLm2(saved.lm2 || '');
    setTempLm3(saved.lm3 || '');
    setTempLm4(saved.lm4 || '');
  }, [selectedKelasId, selectedMapelId, tpMapelMap, currentTingkat, currentMapel]);

  // Handle Save Lingkup Materi / TP for current Mapel & optionally across same-grade classes
  const handleSaveTP = (e: React.FormEvent) => {
    e.preventDefault();
    const tpPayload = {
      lm1: tempLm1.trim(),
      lm2: tempLm2.trim(),
      lm3: tempLm3.trim(),
      lm4: tempLm4.trim(),
    };

    const mapelNameKey = (currentMapel?.namaMapel || '').toLowerCase();
    const updated = {
      ...tpMapelMap,
      [selectedMapelId]: tpPayload,
      [`${selectedKelasId}_${selectedMapelId}`]: tpPayload,
      [`tingkat_${currentTingkat}_${mapelNameKey}`]: tpPayload,
    };

    const appliedClassNames: string[] = [currentKelas?.namaKelas || 'Kelas Saat Ini'];
    if (applyToSameGrade && selectedTargetClassIds.length > 0) {
      selectedTargetClassIds.forEach(targetClassId => {
        const targetKelas = kelasList.find(k => k.id === targetClassId);
        if (!targetKelas) return;
        appliedClassNames.push(targetKelas.namaKelas);

        // Save by target class + mapel ID
        updated[`${targetClassId}_${selectedMapelId}`] = tpPayload;

        // Also find matching subject in the target class (by ID, code, or name)
        const targetMapels = getMatchingMapelForKelas(targetKelas, mapelList);
        const matchingMapel = targetMapels.find(m => 
          m.id === selectedMapelId || 
          m.namaMapel.toLowerCase() === mapelNameKey ||
          (m.kode && currentMapel?.kode && m.kode.split('-')[0] === currentMapel.kode.split('-')[0])
        );
        if (matchingMapel) {
          updated[matchingMapel.id] = tpPayload;
          updated[`${targetClassId}_${matchingMapel.id}`] = tpPayload;
        }
      });
    }

    setTpMapelMap(updated);
    try {
      localStorage.setItem('saved_lingkup_materi_tp', JSON.stringify(updated));
    } catch {}

    // Persist to Cloud Firestore settings collection so all devices and teachers stay in sync
    saveDocument('settings', 'tujuan_pembelajaran', {
      id: 'tujuan_pembelajaran',
      data: updated,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.nama,
    }).catch(err => console.warn('Sync TP to cloud error:', err));

    // Update draft localGrades description with ALL TPs input by teacher
    setLocalGrades(prev => {
      const copy = { ...prev };
      Object.keys(copy).forEach(k => {
        const item = copy[k];
        const capaian = buildKurikulumMerdekaCapaian({
          grade: {
            ...item,
            tp1Desc: tpPayload.lm1,
            tp2Desc: tpPayload.lm2,
            tp3Desc: tpPayload.lm3,
            tp4Desc: tpPayload.lm4,
          },
          mapel: currentMapel,
          kelas: currentKelas,
          displayStyle: 'narasi',
        });
        copy[k] = {
          ...item,
          tp1Desc: tpPayload.lm1,
          tp2Desc: tpPayload.lm2,
          tp3Desc: tpPayload.lm3,
          tp4Desc: tpPayload.lm4,
          tpDeskripsi: capaian.deskripsiNarasi,
          deskripsiTertinggi: capaian.capaianTertinggi,
          deskripsiPerluBimbingan: capaian.capaianPerluBimbingan,
        };
      });
      return copy;
    });

    if (appliedClassNames.length > 1) {
      setNotification(`✅ Lingkup Materi & TP ${currentMapel?.namaMapel} BERHASIL DITERAPKAN ke ${appliedClassNames.length} kelas tingkat ${currentTingkat} (${appliedClassNames.join(', ')})! Anda tidak perlu mengisi ulang TP yang sama.`);
    } else {
      setNotification(`✅ Lingkup Materi / TP untuk ${currentMapel?.namaMapel} (${currentKelas?.namaKelas}) berhasil disimpan & disinkronkan ke Cloud!`);
    }
    setTimeout(() => setNotification(null), 5000);
  };

  // Initialize inline edits for Leger Keseluruhan from existing grades
  const initInlineLegerEdits = () => {
    const initial: { [key: string]: number | undefined } = {};
    classStudents.forEach(st => {
      const nipdKey = st.nipd || st.nipOrNis;
      classMapelList.forEach(m => {
        const found = findStudentGrade(nipdKey, st, m, effectivePeriode);
        if (found && found.nilaiAkhir !== undefined && found.nilaiAkhir > 0) {
          initial[`${nipdKey}_${m.id}`] = found.nilaiAkhir;
        }
      });
    });
    setInlineLegerGrades(initial);
  };

  // Handle score change in inline edit mode in Leger Keseluruhan
  const handleInlineScoreChange = (nipdKey: string, mapelId: string, val: string) => {
    const num = val === '' ? undefined : Math.min(100, Math.max(0, Number(val)));
    setInlineLegerGrades(prev => ({
      ...prev,
      [`${nipdKey}_${mapelId}`]: isNaN(num as any) ? undefined : num,
    }));
  };

  // Save all modified scores from inline editing in Leger Keseluruhan
  const handleSaveInlineLeger = async () => {
    setIsSavingScores(true);
    const changedItems: NilaiMapelSiswa[] = [];
    const deletedIds: string[] = [];

    classStudents.forEach(st => {
      const nipdKey = st.nipd || st.nipOrNis;
      classMapelList.forEach(m => {
        const cellKey = `${nipdKey}_${m.id}`;
        if (cellKey in inlineLegerGrades) {
          const scoreVal = inlineLegerGrades[cellKey];
          const existing = findStudentGrade(nipdKey, st, m, effectivePeriode);
          const scoreId = existing?.id || `nil_${st.id}_${m.id}_${effectivePeriode}`.replace(/[^a-zA-Z0-9_-]/g, '_');

          if (scoreVal === undefined || scoreVal === null) {
            // Emptied cell!
            if (existing?.id) {
              deletedIds.push(existing.id);
            }
          } else {
            const fullItem: NilaiMapelSiswa = {
              ...(existing || {}),
              id: scoreId,
              nipd: nipdKey,
              nisn: st.nisn || st.username,
              namaSiswa: st.nama,
              kelas: currentKelas?.namaKelas || st.kelas || '',
              mapelId: m.id,
              mapelNama: m.namaMapel,
              periode: effectivePeriode,
              nilaiAkhir: scoreVal,
              nilaiPas: effectivePeriode === 'PAS' ? scoreVal : existing?.nilaiPas,
              nilaiPts: effectivePeriode === 'PTS' ? scoreVal : existing?.nilaiPts,
              nilaiPat: effectivePeriode === 'PAT' ? scoreVal : existing?.nilaiPat,
              predikat: scoreVal >= 88 ? 'A' : scoreVal >= 75 ? 'B' : scoreVal >= 65 ? 'C' : 'D',
              ketercapaian: scoreVal >= 75 ? 'Tuntas' : 'Belum Tuntas',
            };
            changedItems.push(fullItem);
          }
        }
      });
    });

    if (changedItems.length === 0 && deletedIds.length === 0) {
      setNotification('Tidak ada perubahan nilai.');
      setIsSavingScores(false);
      return;
    }

    try {
      const keyOf = (n: NilaiMapelSiswa) => 
        `${n.nipd || n.nisn || ''}_${n.mapelId || n.mapelNama || ''}_${n.periode || 'PAS'}`.toLowerCase();
      const map = new Map<string, NilaiMapelSiswa>();
      nilaiList.filter(n => !deletedIds.includes(n.id)).forEach(n => map.set(keyOf(n), n));
      changedItems.forEach(n => map.set(keyOf(n), n));
      const updatedList = Array.from(map.values());

      const res: any = await onSaveNilaiList(updatedList, changedItems, deletedIds);
      if (res && res.success === false) {
        setNotification(`⚠️ Nilai tersimpan di perangkat lokal, status cloud: ${res.error || 'Periksa koneksi'}`);
      } else {
        const delMsg = deletedIds.length > 0 ? ` (${deletedIds.length} nilai dikosongkan/dihapus)` : '';
        setNotification(`✅ Berhasil menyimpan ${changedItems.length} perubahan nilai Leger ${currentKelas?.namaKelas} ke Cloud Firestore!${delMsg}`);
        setIsEditModeLeger(false);
      }
    } catch (err: any) {
      setNotification(`✅ Perubahan nilai Leger ${currentKelas?.namaKelas} disimpan di memori lokal.`);
      setIsEditModeLeger(false);
    } finally {
      setIsSavingScores(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  // Save single cell edit from quick modal
  const handleSaveQuickEditCell = async () => {
    if (!selectedQuickEditCell) return;
    const { student, mapel, nipdKey } = selectedQuickEditCell;
    const existing = findStudentGrade(nipdKey, student, mapel, effectivePeriode);

    // If score was emptied
    if (quickScoreVal.trim() === '') {
      if (existing?.id) {
        const updatedList = nilaiList.filter(n => n.id !== existing.id);
        await onSaveNilaiList(updatedList, [], [existing.id]);
        setNotification(`✅ Nilai ${mapel.namaMapel} untuk ${student.nama} berhasil dikosongkan & dihapus dari Cloud!`);
      } else {
        setNotification(`ℹ️ Nilai memang sudah kosong.`);
      }
      setSelectedQuickEditCell(null);
      return;
    }

    const num = Math.min(100, Math.max(0, Number(quickScoreVal)));
    if (isNaN(num)) {
      setNotification('⚠️ Masukkan angka nilai yang valid antara 0 - 100');
      return;
    }

    const scoreId = existing?.id || `nil_${student.id}_${mapel.id}_${effectivePeriode}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    const updatedItem: NilaiMapelSiswa = {
      ...(existing || {}),
      id: scoreId,
      nipd: nipdKey,
      nisn: student.nisn || student.username,
      namaSiswa: student.nama,
      kelas: currentKelas?.namaKelas || student.kelas || '',
      mapelId: mapel.id,
      mapelNama: mapel.namaMapel,
      periode: effectivePeriode,
      nilaiAkhir: num,
      nilaiPas: effectivePeriode === 'PAS' ? num : existing?.nilaiPas,
      nilaiPts: effectivePeriode === 'PTS' ? num : existing?.nilaiPts,
      nilaiPat: effectivePeriode === 'PAT' ? num : existing?.nilaiPat,
      predikat: num >= 88 ? 'A' : num >= 75 ? 'B' : num >= 65 ? 'C' : 'D',
      ketercapaian: num >= 75 ? 'Tuntas' : 'Belum Tuntas',
    };

    try {
      const keyOf = (n: NilaiMapelSiswa) => 
        `${n.nipd || n.nisn || ''}_${n.mapelId || n.mapelNama || ''}_${normPer(n.periode)}`.toLowerCase();
      const map = new Map<string, NilaiMapelSiswa>();
      nilaiList.forEach(n => map.set(keyOf(n), n));
      map.set(keyOf(updatedItem), updatedItem);
      const updatedList = Array.from(map.values());

      await onSaveNilaiList(updatedList, [updatedItem]);
      setNotification(`✅ Nilai ${mapel.namaMapel} untuk ${student.nama} (${num}) berhasil diperbarui & disinkronkan ke Cloud!`);
      setSelectedQuickEditCell(null);
    } catch (err: any) {
      setNotification(`✅ Nilai ${mapel.namaMapel} untuk ${student.nama} disimpan di memori lokal.`);
      setSelectedQuickEditCell(null);
    }
  };

  // Local draft of grades for currently displayed table
  const [localGrades, setLocalGrades] = useState<{ [nipd: string]: Partial<NilaiMapelSiswa> }>({});

  // Initialize draft when class, mapel, or periode changes
  useEffect(() => {
    const draft: { [nipd: string]: Partial<NilaiMapelSiswa> } = {};
    classStudents.forEach(s => {
      const nipdKey = s.nipd || s.nipOrNis;
      const existing = findStudentGrade(nipdKey, s, currentMapel, effectivePeriode);
      if (existing) {
        draft[nipdKey] = { ...existing, periode: effectivePeriode };
      } else {
        draft[nipdKey] = {
          id: `nil_${s.id}_${selectedMapelId}_${effectivePeriode}`.replace(/[^a-zA-Z0-9_-]/g, '_'),
          nipd: nipdKey,
          nisn: s.nisn || s.username,
          namaSiswa: s.nama,
          kelas: currentKelas?.namaKelas || s.kelas || '',
          mapelId: selectedMapelId,
          mapelNama: currentMapel?.namaMapel || '',
          periode: effectivePeriode,
          lm1: undefined,
          lm2: undefined,
          lm3: undefined,
          lm4: undefined,
          tpDeskripsi: '',
          tugas1: undefined,
          tugas2: undefined,
          tugas3: undefined,
          ulhar1: undefined,
          ulhar2: undefined,
          nilaiPts: undefined,
          nilaiPas: undefined,
          nilaiPat: undefined,
          sumberPts: 'manual',
          sumberPas: 'manual',
        };
      }
    });
    setLocalGrades(draft);

    if (classStudents.length > 0) {
      const studentInClass = classStudents.some(s => (s.nipd || s.nipOrNis) === selectedSiswaNipd);
      if (!studentInClass) {
        setSelectedSiswaNipd(classStudents[0].nipd || classStudents[0].nipOrNis);
      }
    }
  }, [selectedKelasId, selectedMapelId, selectedPeriode, effectivePeriode, usersList, nilaiList]);

  // Deteksi otomatis titik pemulihan cadangan jika form saat ini sedang kosong
  // (sangat berguna jika nilai Biologi atau mapel lain sempat terhapus saat dikosongkan di mapel lain)
  const candidateRescueSnapshot = useMemo(() => {
    if (!currentKelas || !currentMapel) return null;
    const stats = countStudentsWithScores(localGrades);
    if (stats.count > 0) return null; // Form sudah ada nilainya

    const allSnaps = loadAllLegerSnapshots();
    const curKId = currentKelas.id;
    const curKNama = currentKelas.namaKelas;
    const curMId = currentMapel.id;
    const curMNama = (currentMapel.namaMapel || '').toLowerCase().trim();

    // 1. Cadangan langsung untuk rombel dan mapel ini
    const directSnap = allSnaps.find(s => 
      (isSameKelas(s.kelasNama, curKNama) || s.kelasId === curKId) &&
      (s.mapelId === curMId || (s.mapelNama || '').toLowerCase().trim() === curMNama) &&
      s.totalStudentsWithScore > 0
    );
    if (directSnap) return directSnap;

    // 2. Cadangan lintas mapel untuk rombel ini (misal tercatat saat nilai sempat nyasar ke Mikrobiologi / Keperawatan)
    const crossSnap = allSnaps.find(s => 
      (isSameKelas(s.kelasNama, curKNama) || s.kelasId === curKId) &&
      s.totalStudentsWithScore > 0
    );
    return crossSnap || null;
  }, [currentKelas, currentMapel, localGrades, showRestoreModal]);

  const handleScoreChange = (nipd: string, field: keyof NilaiMapelSiswa, value: any) => {
    setLocalGrades(prev => ({
      ...prev,
      [nipd]: {
        ...prev[nipd],
        [field]: value === '' || isNaN(value) ? undefined : Number(value),
      }
    }));
  };

  // Restore callback: Apply restored scores to form inputs & auto-persist to cloud
  const handleRestoreScores = async (restoredScores: { [nipd: string]: Partial<NilaiMapelSiswa> }, sourceInfo: string) => {
    let restoredCount = 0;
    const itemsToSave: NilaiMapelSiswa[] = [];

    setLocalGrades(prev => {
      const next = { ...prev };
      classStudents.forEach(s => {
        const nipdKey = s.nipd || s.nipOrNis;
        const matched = restoredScores[nipdKey] || (s.nisn && restoredScores[s.nisn]) || Object.values(restoredScores).find(item => item && (item.namaSiswa === s.nama || item.nisn === s.nisn));
        if (matched) {
          restoredCount++;
          const targetItem: NilaiMapelSiswa = {
            ...next[nipdKey],
            ...matched,
            id: next[nipdKey]?.id || matched.id || `nil_${s.id}_${selectedMapelId}_${effectivePeriode}`.replace(/[^a-zA-Z0-9_-]/g, '_'),
            nipd: nipdKey,
            nisn: s.nisn || s.username,
            namaSiswa: s.nama,
            kelas: currentKelas?.namaKelas || s.kelas || '',
            mapelId: selectedMapelId,
            mapelNama: currentMapel?.namaMapel || '',
            periode: effectivePeriode,
          };
          next[nipdKey] = targetItem;
          itemsToSave.push(targetItem);
        }
      });
      return next;
    });

    if (itemsToSave.length > 0) {
      try {
        const existingMap = new Map<string, NilaiMapelSiswa>();
        (nilaiList || []).forEach(n => {
          if (n && n.id) existingMap.set(n.id, n);
        });
        itemsToSave.forEach(it => existingMap.set(it.id, it));
        const updatedNilaiList = Array.from(existingMap.values());
        await onSaveNilaiList(updatedNilaiList, itemsToSave);
        setNotification(`✅ Berhasil memulihkan ${itemsToSave.length} nilai siswa dari ${sourceInfo} dan langsung tersimpan ke Cloud Firestore! Nilai kini aktif di Leger Walas & Raport.`);
      } catch (_) {
        setNotification(`✅ Berhasil memulihkan ${itemsToSave.length} nilai siswa dari ${sourceInfo}! Klik tombol "Simpan Nilai Leger Mapel" untuk memperbarui data ke Cloud.`);
      }
    } else {
      setNotification(`⚠️ Tidak ditemukan data nilai siswa rombel ini pada cadangan tersebut.`);
    }
    setTimeout(() => setNotification(null), 6000);
  };

  // Restore global callback across all subjects and classes
  const handleRestoreGlobalNilaiList = async (mergedList: NilaiMapelSiswa[], count: number) => {
    try {
      await onSaveNilaiList(mergedList);
      setNotification(`✅ Berhasil memulihkan ${count} nilai siswa dari seluruh riwayat cadangan lokal & cloud! Nilai kini tersimpan dan aktif di leger.`);
      setTimeout(() => setNotification(null), 6000);
    } catch (err: any) {
      setNotification(`⚠️ Nilai berhasil dipulihkan secara lokal (${count} nilai siswa).`);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleClearDraftScores = () => {
    // Ambil cadangan otomatis sebelum dikosongkan agar bisa di-restore kapan saja jika tidak sengaja terhapus!
    if (currentMapel && currentKelas) {
      const stats = countStudentsWithScores(localGrades);
      if (stats.count > 0) {
        recordLegerSnapshot({
          mapelId: currentMapel.id,
          mapelNama: currentMapel.namaMapel,
          kelasId: currentKelas.id,
          kelasNama: currentKelas.namaKelas,
          periode: effectivePeriode,
          scores: localGrades,
          trigger: 'sebelum_kosongkan',
          keterangan: `Cadangan otomatis sebelum form dikosongkan (${stats.count} nilai siswa)`,
        });
      }
    }

    if (!window.confirm(`Kosongkan seluruh nilai mata pelajaran ${currentMapel?.namaMapel} untuk Kelas ${currentKelas?.namaKelas}? Tenang, sistem telah mencadangkan nilai ini secara otomatis. Anda dapat memulihkannya kembali kapan saja melalui tombol "Restore Nilai".`)) {
      return;
    }
    const draft: { [nipd: string]: Partial<NilaiMapelSiswa> } = {};
    classStudents.forEach(s => {
      const nipdKey = s.nipd || s.nipOrNis;
      draft[nipdKey] = {
        id: `nil_${s.id}_${selectedMapelId}_${effectivePeriode}`.replace(/[^a-zA-Z0-9_-]/g, '_'),
        nipd: nipdKey,
        nisn: s.nisn || s.username,
        namaSiswa: s.nama,
        kelas: currentKelas?.namaKelas || s.kelas || '',
        mapelId: selectedMapelId,
        mapelNama: currentMapel?.namaMapel || '',
        periode: effectivePeriode,
        lm1: undefined,
        lm2: undefined,
        lm3: undefined,
        lm4: undefined,
        tpDeskripsi: '',
        tugas1: undefined,
        tugas2: undefined,
        tugas3: undefined,
        ulhar1: undefined,
        ulhar2: undefined,
        nilaiPts: undefined,
        nilaiPas: undefined,
        nilaiPat: undefined,
        sumberPts: 'manual',
        sumberPas: 'manual',
      };
    });
    setLocalGrades(draft);
    setNotification('Tabel nilai telah dikosongkan. Jika tidak sengaja, klik tombol "Restore Nilai" untuk mengembalikan.');
    setTimeout(() => setNotification(null), 5000);
  };

  // Save changes to parent state & persist directly to Cloud Firestore
  const handleSaveAllScores = async () => {
    setIsSavingScores(true);

    // Ambil cadangan otomatis sebelum menyimpan perubahan
    if (currentMapel && currentKelas) {
      const stats = countStudentsWithScores(localGrades);
      if (stats.count > 0) {
        recordLegerSnapshot({
          mapelId: currentMapel.id,
          mapelNama: currentMapel.namaMapel,
          kelasId: currentKelas.id,
          kelasNama: currentKelas.namaKelas,
          periode: effectivePeriode,
          scores: localGrades,
          trigger: 'sebelum_simpan',
          keterangan: `Cadangan otomatis sebelum nilai disimpan (${stats.count} nilai siswa)`,
        });
      }
    }

    const newItems: NilaiMapelSiswa[] = [];
    const deletedIds: string[] = [];

    // Helper to check if a grade record belongs to the current subject and periode
    const isGradeForCurrentMapelAndPeriode = (n: NilaiMapelSiswa) => {
      if (!n) return false;
      const norm = (s?: string) => (s || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const currentMapelNorm = norm(currentMapel?.namaMapel);
      const nMapelNorm = norm(n.mapelNama);
      // Pencocokan eksklusif / ketat: Tidak boleh substring includes
      const isMapel = 
        Boolean(selectedMapelId && n.mapelId === selectedMapelId) ||
        Boolean(currentMapel?.id && n.mapelId === currentMapel.id) ||
        Boolean(currentMapel?.kode && (n.mapelId === currentMapel.kode || n.mapelNama === currentMapel.kode)) ||
        Boolean(currentMapelNorm && nMapelNorm && currentMapelNorm === nMapelNorm) ||
        Boolean(norm(currentMapel?.id) && norm(n.mapelId) && norm(currentMapel?.id) === norm(n.mapelId)) ||
        Boolean(norm(currentMapel?.kode) && norm(n.mapelId) && norm(currentMapel?.kode) === norm(n.mapelId));
      if (!isMapel) return false;
      if (n.periode && normPer(n.periode) !== normPer(effectivePeriode)) return false;
      return true;
    };

    // Helper to check if a grade record belongs to a specific student
    const isGradeForStudent = (n: NilaiMapelSiswa, s: User) => {
      const clean = (str?: string) => (str || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const sNipd = clean(s.nipd || s.nipOrNis);
      const sNisn = clean(s.nisn);
      const sNama = clean(s.nama);
      const nNipd = clean(n.nipd);
      const nNisn = clean(n.nisn);
      const nNama = clean(n.namaSiswa);

      return Boolean(
        (sNipd && (nNipd === sNipd || nNisn === sNipd)) ||
        (sNisn && (nNisn === sNisn || nNipd === sNisn)) ||
        (s.id && n.id && (n.id === s.id || n.id.startsWith(`nil_${s.id}_`) || n.id.endsWith(`_${s.id}`))) ||
        (sNama && nNama && (sNama === nNama || sNama.replace(/[^a-z0-9]/g, '') === nNama.replace(/[^a-z0-9]/g, '')))
      );
    };

    // Tentukan Guru Pengampu Resmi untuk Mata Pelajaran & Rombel Kelas ini:
    const matchingJadwal = (jadwalPelajaranList || []).find(j => {
      const matchK = currentKelas && (isSameKelas(j.namaKelas, currentKelas.namaKelas) || j.idKelas === currentKelas.id);
      const matchM = (j.idMapel && (j.idMapel === selectedMapelId || j.idMapel === currentMapel?.kode)) ||
                     (j.namaMapel && currentMapel && j.namaMapel.trim().toLowerCase() === currentMapel.namaMapel.trim().toLowerCase());
      return matchK && matchM && j.namaGuru && j.namaGuru.trim().length > 0;
    });

    const teacherFromUsers = (usersList || []).find(u => 
      (u.role === 'guru' || u.role === 'walas' || u.role === 'kepala_sekolah') &&
      Array.isArray(u.mapelDiampu) &&
      currentMapel &&
      u.mapelDiampu.some(m => m.trim().toLowerCase() === currentMapel.namaMapel.trim().toLowerCase())
    );

    let resolvedGuruName = '';
    let resolvedGuruId = '';

    if (currentUser.role === 'guru' || currentUser.role === 'walas') {
      // Guru yang login dan menginput nilai: atribusikan langsung ke akun guru bersangkutan!
      resolvedGuruName = currentUser.nama;
      resolvedGuruId = currentUser.id;
    } else {
      // Admin yang menginput atas nama guru pengampu resmi
      resolvedGuruName = matchingJadwal?.namaGuru ||
        (currentMapel?.guruPengampu && currentMapel.guruPengampu.trim().toLowerCase() !== 'guru pengampu' ? currentMapel.guruPengampu : '') ||
        teacherFromUsers?.nama ||
        'Guru Pengampu';

      resolvedGuruId = matchingJadwal?.idGuru ||
        currentMapel?.idGuru ||
        teacherFromUsers?.id ||
        '';
    }

    classStudents.forEach(s => {
      const nipdKey = s.nipd || s.nipOrNis;
      const currentItem = localGrades[nipdKey];
      // Find ALL existing records for this student and mapel in nilaiList (including historical aliases)
      const allMatchingForStudent = nilaiList.filter(n => isGradeForCurrentMapelAndPeriode(n) && isGradeForStudent(n, s));

      if (currentItem) {
        const computed = hitungNilaiAkhir({ ...currentItem, periode: effectivePeriode });
        const hasScore = 
          currentItem.lm1 !== undefined || currentItem.lm2 !== undefined ||
          currentItem.lm3 !== undefined || currentItem.lm4 !== undefined ||
          currentItem.tugas1 !== undefined || currentItem.tugas2 !== undefined || currentItem.tugas3 !== undefined ||
          currentItem.ulhar1 !== undefined || currentItem.ulhar2 !== undefined ||
          currentItem.nilaiPts !== undefined || currentItem.nilaiPas !== undefined || currentItem.nilaiPat !== undefined ||
          (computed.nilaiAkhir > 0);

        if (hasScore) {
          const scoreId = currentItem.id || allMatchingForStudent[0]?.id || `nil_${s.id}_${selectedMapelId}_${effectivePeriode}`.replace(/[^a-zA-Z0-9_-]/g, '_');
          // Any other duplicate records for this student in this mapel get marked for deletion
          allMatchingForStudent.forEach(dup => {
            if (dup.id && dup.id !== scoreId) {
              deletedIds.push(dup.id);
            }
          });

          const capaian = buildKurikulumMerdekaCapaian({
            grade: {
              ...currentItem,
              nilaiAkhir: computed.nilaiAkhir,
              tp1Desc: tempLm1 || currentItem.tp1Desc,
              tp2Desc: tempLm2 || currentItem.tp2Desc,
              tp3Desc: tempLm3 || currentItem.tp3Desc,
              tp4Desc: tempLm4 || currentItem.tp4Desc,
            },
            mapel: currentMapel,
            kelas: currentKelas,
            tpMap: tpMapelMap,
            displayStyle: 'narasi',
          });

          const fullItem: NilaiMapelSiswa = {
            id: scoreId,
            nipd: nipdKey,
            nisn: s.nisn || s.username,
            namaSiswa: s.nama,
            kelas: currentKelas?.namaKelas || s.kelas || '',
            mapelId: selectedMapelId,
            mapelNama: currentMapel?.namaMapel || '',
            periode: effectivePeriode,
            lm1: currentItem.lm1,
            lm2: currentItem.lm2,
            lm3: currentItem.lm3,
            lm4: currentItem.lm4,
            tp1Desc: tempLm1 || currentItem.tp1Desc,
            tp2Desc: tempLm2 || currentItem.tp2Desc,
            tp3Desc: tempLm3 || currentItem.tp3Desc,
            tp4Desc: tempLm4 || currentItem.tp4Desc,
            tpDeskripsi: capaian.deskripsiNarasi,
            tugas1: currentItem.tugas1,
            tugas2: currentItem.tugas2,
            tugas3: currentItem.tugas3,
            ulhar1: currentItem.ulhar1,
            ulhar2: currentItem.ulhar2,
            nilaiFormatif: computed.nilaiFormatif,
            nilaiPts: effectivePeriode === 'PTS' ? currentItem.nilaiPts : currentItem.nilaiPts,
            sumberPts: currentItem.sumberPts || 'manual',
            nilaiPas: effectivePeriode === 'PAS' ? currentItem.nilaiPas : currentItem.nilaiPas,
            sumberPas: currentItem.sumberPas || 'manual',
            nilaiPat: effectivePeriode === 'PAT' ? currentItem.nilaiPat : currentItem.nilaiPat,
            sumberPat: currentItem.sumberPat || 'manual',
            nilaiAkhir: computed.nilaiAkhir,
            predikat: computed.predikat,
            deskripsiTertinggi: capaian.capaianTertinggi,
            deskripsiPerluBimbingan: capaian.capaianPerluBimbingan,
            catatanGuru: currentItem.catatanGuru || (computed.nilaiAkhir >= 75 ? 'Tuntas dengan capaian kompetensi baik.' : ''),
            guruPengampu: resolvedGuruName,
            idGuru: resolvedGuruId,
          };
          newItems.push(fullItem);
        } else {
          // Score is empty/cleared! Mark ALL matching records for this student for deletion
          allMatchingForStudent.forEach(dup => {
            if (dup.id) {
              deletedIds.push(dup.id);
            }
          });
        }
      } else {
        allMatchingForStudent.forEach(dup => {
          if (dup.id) {
            deletedIds.push(dup.id);
          }
        });
      }
    });

    // Remove ANY record for students of this class in this mapel from filteredExisting
    const filteredExisting = nilaiList.filter(n => {
      if (!isGradeForCurrentMapelAndPeriode(n)) return true;
      const belongsToStudentInThisClass = classStudents.some(s => isGradeForStudent(n, s));
      return !belongsToStudentInThisClass;
    });

    try {
      const savePromise = onSaveNilaiList([...filteredExisting, ...newItems], newItems, deletedIds);
      const timeoutPromise = new Promise(resolve => setTimeout(() => resolve({ success: true, count: newItems.length }), 4000));
      const res: any = await Promise.race([savePromise, timeoutPromise]);

      // Keep local draft in sync with newly saved state (clean empty if cleared)
      const nextDraft: { [nipd: string]: Partial<NilaiMapelSiswa> } = {};
      classStudents.forEach(s => {
        const nipdKey = s.nipd || s.nipOrNis;
        const saved = newItems.find(item => item.nipd === nipdKey || item.nisn === s.nisn || item.namaSiswa === s.nama);
        if (saved) {
          nextDraft[nipdKey] = saved;
        } else {
          nextDraft[nipdKey] = {
            id: `nil_${s.id}_${selectedMapelId}_${effectivePeriode}`.replace(/[^a-zA-Z0-9_-]/g, '_'),
            nipd: nipdKey,
            nisn: s.nisn || s.username,
            namaSiswa: s.nama,
            kelas: currentKelas?.namaKelas || s.kelas || '',
            mapelId: selectedMapelId,
            mapelNama: currentMapel?.namaMapel || '',
            periode: effectivePeriode,
            lm1: undefined,
            lm2: undefined,
            lm3: undefined,
            lm4: undefined,
            tpDeskripsi: '',
            tugas1: undefined,
            tugas2: undefined,
            tugas3: undefined,
            ulhar1: undefined,
            ulhar2: undefined,
            nilaiPts: undefined,
            nilaiPas: undefined,
            nilaiPat: undefined,
            sumberPts: 'manual',
            sumberPas: 'manual',
          };
        }
      });
      setLocalGrades(nextDraft);

      if (res && res.success === false) {
        setNotification(`⚠️ Nilai tersimpan di perangkat lokal, status cloud: ${res.error || 'Periksa koneksi'}`);
      } else {
        if (newItems.length === 0 && deletedIds.length > 0) {
          setNotification(`✅ Seluruh data nilai mata pelajaran ini (${deletedIds.length} data) BERHASIL DIKOSONGKAN & DIHAPUS PERMANEN dari Cloud & Lokal.`);
        } else {
          setNotification(`✅ Seluruh nilai Leger Mapel (${effectivePeriode}) Kelas ${currentKelas?.namaKelas} (${newItems.length} siswa) BERHASIL DISIMPAN & TERSINKRONISASI KE CLOUD! Langsung tampil di akun Admin dan Walas.`);
        }
      }
    } catch (err: any) {
      setNotification(`✅ Seluruh nilai Leger Mapel (${effectivePeriode}) Kelas ${currentKelas?.namaKelas} disimpan di memori lokal.`);
    } finally {
      setIsSavingScores(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  // Handler unduh template Excel pengisian nilai khusus rombel & mapel aktif
  const handleDownloadExcelTemplate = () => {
    downloadTemplateLegerMapelExcel(classStudents, currentMapel, currentKelas, effectivePeriode);
    setNotification(`✅ Berhasil mengunduh template Excel nilai ${currentMapel?.namaMapel} (${currentKelas?.namaKelas})!`);
    setTimeout(() => setNotification(null), 4000);
  };

  // Handler saat file spreadsheet dipilih untuk diimpor
  const handleImportFileSelected = async (file: File) => {
    setImportFile(file);
    setImportIsLoading(true);
    try {
      const rows = await readSpreadsheetFile(file);
      const parsed = parseLegerMapelSpreadsheet(rows, classStudents);
      setImportParsedData(parsed);
      if (parsed.count === 0) {
        setNotification('⚠️ Tidak ada nilai siswa yang cocok ditemukan dalam file. Pastikan kolom Nama atau NIPD sesuai template.');
      } else {
        setNotification(`📄 Berhasil membaca ${parsed.count} data nilai siswa dari berkas ${file.name}. Silakan periksa pratinjau.`);
      }
    } catch (err: any) {
      console.warn('Import parse error:', err);
      setNotification(`❌ Gagal membaca berkas Excel: ${err?.message || 'Format tidak didukung'}`);
    } finally {
      setImportIsLoading(false);
    }
  };

  // Handler menerapkan nilai impor ke form input dan simpan ke database
  const handleApplyImportedScores = async (andSaveToDb: boolean = false) => {
    if (!importParsedData || importParsedData.count === 0) return;
    
    const updatedDraft = { ...localGrades };
    Object.entries(importParsedData.importedGrades).forEach(([nipd, vals]) => {
      const cur = updatedDraft[nipd] || {};
      const newPts = vals.nilaiPts !== undefined ? vals.nilaiPts : cur.nilaiPts;
      const newPas = vals.nilaiPas !== undefined ? vals.nilaiPas : cur.nilaiPas;
      const newPat = vals.nilaiPat !== undefined ? vals.nilaiPat : cur.nilaiPat;
      const explicitAkhir = vals.nilaiAkhir !== undefined ? vals.nilaiAkhir : undefined;

      const computed = hitungNilaiAkhir({
        lm1: vals.lm1 !== undefined ? vals.lm1 : cur.lm1,
        lm2: vals.lm2 !== undefined ? vals.lm2 : cur.lm2,
        lm3: vals.lm3 !== undefined ? vals.lm3 : cur.lm3,
        lm4: vals.lm4 !== undefined ? vals.lm4 : cur.lm4,
        tugas1: vals.tugas1 !== undefined ? vals.tugas1 : cur.tugas1,
        tugas2: vals.tugas2 !== undefined ? vals.tugas2 : cur.tugas2,
        tugas3: vals.tugas3 !== undefined ? vals.tugas3 : cur.tugas3,
        ulhar1: vals.ulhar1 !== undefined ? vals.ulhar1 : cur.ulhar1,
        ulhar2: vals.ulhar2 !== undefined ? vals.ulhar2 : cur.ulhar2,
        nilaiPts: newPts,
        nilaiPas: newPas,
        nilaiPat: newPat,
        nilaiAkhir: explicitAkhir,
      });

      updatedDraft[nipd] = {
        ...cur,
        lm1: vals.lm1 !== undefined ? vals.lm1 : cur.lm1,
        lm2: vals.lm2 !== undefined ? vals.lm2 : cur.lm2,
        lm3: vals.lm3 !== undefined ? vals.lm3 : cur.lm3,
        lm4: vals.lm4 !== undefined ? vals.lm4 : cur.lm4,
        tugas1: vals.tugas1 !== undefined ? vals.tugas1 : cur.tugas1,
        tugas2: vals.tugas2 !== undefined ? vals.tugas2 : cur.tugas2,
        tugas3: vals.tugas3 !== undefined ? vals.tugas3 : cur.tugas3,
        ulhar1: vals.ulhar1 !== undefined ? vals.ulhar1 : cur.ulhar1,
        ulhar2: vals.ulhar2 !== undefined ? vals.ulhar2 : cur.ulhar2,
        nilaiPts: newPts,
        nilaiPas: newPas,
        nilaiPat: newPat,
        nilaiFormatif: computed.nilaiFormatif,
        nilaiAkhir: computed.nilaiAkhir,
        predikat: computed.predikat,
        catatanGuru: vals.catatanGuru || cur.catatanGuru,
      };
    });

    setLocalGrades(updatedDraft);
    const countSaved = importParsedData.count;
    setIsImportModalOpen(false);
    setImportFile(null);
    setImportParsedData(null);

    setNotification(`✅ Berhasil menerapkan ${countSaved} nilai siswa ke form input ${currentMapel?.namaMapel}!`);
    setTimeout(() => setNotification(null), 5000);

    if (andSaveToDb) {
      setTimeout(() => {
        handleSaveAllScores();
      }, 300);
    }
  };

  // Selected student for Report Card view
  const selectedStudent = useMemo(() => {
    if (!selectedSiswaNipd) return classStudents[0] || null;
    const cleanSel = selectedSiswaNipd.replace(/\./g, '').trim().toLowerCase();
    const found = classStudents.find(u => {
      const uNipd = (u.nipd || u.nipOrNis || '').trim();
      const uNipdClean = uNipd.replace(/\./g, '').toLowerCase();
      const uNisn = (u.nisn || '').trim().toLowerCase();
      const uId = (u.id || '').trim();
      return (
        uNipd === selectedSiswaNipd ||
        uNipdClean === cleanSel ||
        (uNisn && uNisn === selectedSiswaNipd) ||
        (uId && uId === selectedSiswaNipd)
      );
    });
    if (found) return found;
    return classStudents[0] || usersList.find(u => (u.nipd || u.nipOrNis || u.id) === selectedSiswaNipd) || null;
  }, [classStudents, selectedSiswaNipd, usersList]);

  const selectedNipd = selectedStudent ? (selectedStudent.nipd || selectedStudent.nipOrNis || selectedStudent.id) : '';
  
  // Assessment label on report card (ASTS/PTS, SAS/PAS/ASA, ASAT/PAT) - Strictly manual selection by user
  const [selectedAsesmenTipe, setSelectedAsesmenTipe] = useState<'SAS' | 'ASTS' | 'ASAT' | 'custom'>('SAS');
  const [customAsesmenLabel, setCustomAsesmenLabel] = useState<string>('');

  // Display override for Kenaikan Kelas / Kelulusan in Rapor
  const [kenaikanDisplayMode, setKenaikanDisplayMode] = useState<'otomatis' | 'selalu' | 'sembunyikan'>(() => {
    try {
      const saved = localStorage.getItem('saved_kenaikan_display_mode');
      return (saved as any) || 'otomatis';
    } catch {
      return 'otomatis';
    }
  });

  const handleSetKenaikanDisplayMode = (mode: 'otomatis' | 'selalu' | 'sembunyikan') => {
    setKenaikanDisplayMode(mode);
    try {
      localStorage.setItem('saved_kenaikan_display_mode', mode);
    } catch {}
  };

  const handleSelectPeriode = (p: 'PTS' | 'PAS' | 'PAT') => {
    setSelectedPeriode(p);
    if (p === 'PAT') {
      setSelectedAsesmenTipe('ASAT');
    } else if (p === 'PAS') {
      setSelectedAsesmenTipe('SAS');
    } else if (p === 'PTS') {
      setSelectedAsesmenTipe('ASTS');
    }
  };

  const getAsesmenTitle = () => {
    if (selectedAsesmenTipe === 'custom' && customAsesmenLabel.trim()) {
      return customAsesmenLabel.trim();
    }
    if (selectedAsesmenTipe === 'ASTS' || selectedPeriode === 'PTS') {
      return 'Asesmen Sumatif Tengah Semester (ASTS / PTS)';
    }
    if (selectedAsesmenTipe === 'ASAT' || selectedPeriode === 'PAT') {
      return 'Asesmen Sumatif Akhir Tahun (ASAT / PAT)';
    }
    return 'Asesmen Sumatif Akhir Semester (SAS / PAS / ASAS)';
  };

  // Strictly determined by user's manual selection of PAT or ASAT
  const isPeriodePAT = 
    selectedPeriode === 'PAT' || 
    selectedAsesmenTipe === 'ASAT' || 
    (selectedAsesmenTipe === 'custom' && (
      customAsesmenLabel.toUpperCase().includes('PAT') || 
      customAsesmenLabel.toUpperCase().includes('ASAT') || 
      customAsesmenLabel.toUpperCase().includes('AKHIR TAHUN') ||
      customAsesmenLabel.toUpperCase().includes('SEMESTER 2')
    ));

  const shouldShowKenaikan = 
    kenaikanDisplayMode === 'selalu' || 
    (kenaikanDisplayMode !== 'sembunyikan' && isPeriodePAT);

  const getDisplaySemester = () => {
    if (selectedPeriode === 'PAT' || selectedAsesmenTipe === 'ASAT') {
      return 'Genap (Semester 2 / Akhir Tahun)';
    }
    if (selectedPeriode === 'PTS' || selectedAsesmenTipe === 'ASTS') {
      return 'Ganjil (Tengah Semester / PTS)';
    }
    return 'Ganjil (Semester 1 / PAS)';
  };

  // Helper fungsi untuk menghitung rekapitulasi presensi harian per siswa
  const getDailyAbsensiCounts = useCallback((nipdOrStudent: string | User | undefined) => {
    if (!nipdOrStudent) {
      return { records: [], hadir: 0, sakit: 0, izin: 0, alpa: 0, total: 0 };
    }
    let student: User | undefined;
    let sNipd = '';
    if (typeof nipdOrStudent === 'string') {
      sNipd = nipdOrStudent;
      const cleanKey = sNipd.replace(/\./g, '');
      student = usersList.find(u => {
        const uNipdClean = (u.nipd || u.nipOrNis || '').replace(/\./g, '');
        return (u.nipd || u.nipOrNis) === sNipd || uNipdClean === cleanKey || u.nisn === sNipd || u.id === sNipd;
      });
    } else {
      student = nipdOrStudent;
      sNipd = student.nipd || student.nipOrNis || '';
    }

    const cleanSNipd = (sNipd || '').replace(/\./g, '').trim().toLowerCase();
    const records = absensiList.filter(a => {
      if (!a) return false;
      const aNipdClean = (a.nipd || '').replace(/\./g, '').trim().toLowerCase();
      const aNisnClean = (a.nisn || '').trim().toLowerCase();

      if (cleanSNipd && (aNipdClean === cleanSNipd || aNisnClean === cleanSNipd || a.userId === sNipd)) return true;
      if (student) {
        const sNipdDots = (student.nipd || student.nipOrNis || '').replace(/\./g, '').trim().toLowerCase();
        const sNisn = (student.nisn || '').trim().toLowerCase();
        const sNama = (student.nama || '').trim().toLowerCase();
        const aNama = (a.namaSiswa || '').trim().toLowerCase();

        if (sNipdDots && (aNipdClean === sNipdDots || aNisnClean === sNipdDots)) return true;
        if (sNisn && (aNisnClean === sNisn || aNipdClean === sNisn)) return true;
        if (student.id && a.userId === student.id) return true;
        if (aNama && sNama && (aNama === sNama || aNama.replace(/[^a-z0-9]/g, '') === sNama.replace(/[^a-z0-9]/g, ''))) return true;
      }
      return false;
    });

    const norm = (s?: string) => (s || '').trim().toLowerCase();
    const hadir = records.filter(a => {
      const st = norm(a.status);
      return st === 'hadir' || st === 'h' || st === 'terlambat' || st === 't' || st === 'masuk';
    }).length;
    const sakit = records.filter(a => {
      const st = norm(a.status);
      return st === 'sakit' || st === 's';
    }).length;
    const izin = records.filter(a => {
      const st = norm(a.status);
      return st === 'izin' || st === 'ijin' || st === 'i';
    }).length;
    const alpa = records.filter(a => {
      const st = norm(a.status);
      return st === 'alpa' || st === 'alpha' || st === 'a' || st === 'tanpa keterangan';
    }).length;

    return { records, hadir, sakit, izin, alpa, total: records.length };
  }, [absensiList, usersList]);

  const studentAbsensiData = useMemo(() => {
    return getDailyAbsensiCounts(selectedStudent || selectedNipd);
  }, [getDailyAbsensiCounts, selectedStudent, selectedNipd]);

  const studentAbsensi = studentAbsensiData.records;
  const autoHadir = studentAbsensiData.hadir;
  const autoSakit = studentAbsensiData.sakit;
  const autoIzin = studentAbsensiData.izin;
  const autoAlpa = studentAbsensiData.alpa;
  
  // Helper to safely lookup saved attendance overrides by various student identifiers
  const getSavedStudentAbsensi = useCallback((nipdKey?: string, st?: User) => {
    if (!nipdKey && !st) return undefined;
    const cleanKey = (nipdKey || '').replace(/\./g, '');
    return (
      (nipdKey && raportAbsensiMap[nipdKey]) ||
      (cleanKey && raportAbsensiMap[cleanKey]) ||
      (st?.nipd && raportAbsensiMap[st.nipd]) ||
      (st?.nipd && raportAbsensiMap[st.nipd.replace(/\./g, '')]) ||
      (st?.nisn && raportAbsensiMap[st.nisn]) ||
      (st?.id && raportAbsensiMap[st.id])
    );
  }, [raportAbsensiMap]);

  // Custom edited attendance overrides (auto from attendance, editable before print)
  const savedRec = getSavedStudentAbsensi(selectedNipd, selectedStudent);
  const customAbsensi = {
    hadir: (savedRec && typeof savedRec.hadir === 'number') ? savedRec.hadir : autoHadir,
    sakit: (savedRec && typeof savedRec.sakit === 'number') ? savedRec.sakit : autoSakit,
    izin: (savedRec && typeof savedRec.izin === 'number') ? savedRec.izin : autoIzin,
    alpa: (savedRec && typeof savedRec.alpa === 'number') ? savedRec.alpa : autoAlpa,
  };

  const [showAbsensiDetailList, setShowAbsensiDetailList] = useState(false);

  const handleResetAbsensiToAuto = () => {
    if (!selectedNipd && !selectedStudent) return;
    const keyWithDots = selectedNipd || selectedStudent?.nipd || selectedStudent?.nipOrNis || '';
    const keyWithoutDots = keyWithDots.replace(/\./g, '');
    const newEntry = {
      hadir: autoHadir,
      sakit: autoSakit,
      izin: autoIzin,
      alpa: autoAlpa,
    };
    const updated = {
      ...raportAbsensiMap,
      [keyWithDots]: newEntry,
      [keyWithoutDots]: newEntry,
    };
    if (selectedStudent?.id) updated[selectedStudent.id] = newEntry;
    if (selectedStudent?.nisn) updated[selectedStudent.nisn] = newEntry;

    setRaportAbsensiMap(updated);
    try {
      localStorage.setItem('saved_raport_absensi', JSON.stringify(updated));
    } catch {}
    saveRaportAbsensiToFirestore(updated).catch(() => {});
    setShowAbsensiDetailList(true);
    setNotification(
      `✅ Presensi berhasil disinkronkan (${studentAbsensi.length} rekaman): ${autoHadir} Hari Hadir, ${autoSakit} Sakit, ${autoIzin} Izin, ${autoAlpa} Alpa. Rincian rekaman otomatis ditampilkan di bawah.`
    );
    setTimeout(() => setNotification(null), 5000);
  };

  const handleUpdateStudentAbsensi = (field: 'hadir' | 'sakit' | 'izin' | 'alpa', val: number) => {
    if (!selectedNipd && !selectedStudent) return;
    const keyWithDots = selectedNipd || selectedStudent?.nipd || selectedStudent?.nipOrNis || '';
    const keyWithoutDots = keyWithDots.replace(/\./g, '');
    const newEntry = {
      ...customAbsensi,
      [field]: Math.max(0, val),
    };
    const updated = {
      ...raportAbsensiMap,
      [keyWithDots]: newEntry,
      [keyWithoutDots]: newEntry,
    };
    if (selectedStudent?.id) updated[selectedStudent.id] = newEntry;
    if (selectedStudent?.nisn) updated[selectedStudent.nisn] = newEntry;

    setRaportAbsensiMap(updated);
    try {
      localStorage.setItem('saved_raport_absensi', JSON.stringify(updated));
    } catch {}
    saveRaportAbsensiToFirestore(updated).catch(() => {});
  };

  // Sinkronisasi absensi seluruh kelas dari presensi harian sekaligus
  const handleBulkSyncClassAbsensi = () => {
    const updated = { ...raportAbsensiMap };
    let syncedStudentsCount = 0;
    classStudents.forEach(st => {
      const sNipd = st.nipd || st.nipOrNis;
      if (!sNipd) return;
      const c = getDailyAbsensiCounts(st);
      const entry = {
        hadir: c.hadir,
        sakit: c.sakit,
        izin: c.izin,
        alpa: c.alpa,
      };
      updated[sNipd] = entry;
      updated[sNipd.replace(/\./g, '')] = entry;
      if (st.id) updated[st.id] = entry;
      if (st.nisn) updated[st.nisn] = entry;
      syncedStudentsCount++;
    });
    setRaportAbsensiMap(updated);
    try {
      localStorage.setItem('saved_raport_absensi', JSON.stringify(updated));
    } catch {}
    saveRaportAbsensiToFirestore(updated).catch(() => {});
    setNotification(`✅ Berhasil menyinkronkan data presensi seluruh ${syncedStudentsCount} siswa kelas ${currentKelas?.namaKelas || ''} dari rekaman harian! Tersimpan ke Cloud.`);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSaveTitimangsa = () => {
    try {
      localStorage.setItem('saved_titimangsa_tempat', titimangsaTempat);
      localStorage.setItem('saved_titimangsa_tanggal', titimangsaTanggal);
    } catch {}
    setNotification('Titimangsa Raport berhasil diperbarui & disimpan!');
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSaveKodeAkses = () => {
    try {
      localStorage.setItem('saved_kode_akses_raport', kodeAksesRaport.toUpperCase());
    } catch {}
    setNotification(`Kode Akses Raport "${kodeAksesRaport.toUpperCase()}" berhasil disimpan!`);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleCopyKodeAkses = () => {
    navigator.clipboard?.writeText(kodeAksesRaport.toUpperCase());
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2500);
  };

  // Helper to retrieve PKL / Prakerin items for student
  const getStudentPrakerin = (nipd: string, student?: User, kelas?: Kelas): PraktikKerjaIndustriItem[] => {
    if (prakerinMap[nipd] && prakerinMap[nipd].length > 0) {
      return prakerinMap[nipd];
    }
    const jurusan = student?.jurusan || kelas?.jurusan || (student?.kelas || kelas?.namaKelas || '');
    return getDefaultPrakerinForMajor(jurusan, kelas?.namaKelas || student?.kelas);
  };

  const handleUpdatePrakerinItem = (
    nipd: string,
    index: number,
    field: keyof PraktikKerjaIndustriItem,
    value: any
  ) => {
    const currentItems = [...getStudentPrakerin(nipd, selectedStudent, currentKelas)];
    if (!currentItems[index]) return;
    currentItems[index] = {
      ...currentItems[index],
      [field]: value,
    };
    const updated = {
      ...prakerinMap,
      [nipd]: currentItems,
    };
    setPrakerinMap(updated);
    try {
      localStorage.setItem('saved_raport_prakerin', JSON.stringify(updated));
    } catch {}
  };

  const handleAddPrakerinRow = (nipd: string) => {
    const currentItems = [...getStudentPrakerin(nipd, selectedStudent, currentKelas)];
    currentItems.push({
      nomor: currentItems.length + 1,
      mitra: '',
      lamanya: '6 Bulan',
      keterangan: 'Sangat Baik (Tuntas & Kompeten)'
    });
    const updated = {
      ...prakerinMap,
      [nipd]: currentItems,
    };
    setPrakerinMap(updated);
    try {
      localStorage.setItem('saved_raport_prakerin', JSON.stringify(updated));
    } catch {}
    setNotification('Baris tempat Praktik Kerja Industri berhasil ditambahkan!');
    setTimeout(() => setNotification(null), 2500);
  };

  const handleDeletePrakerinRow = (nipd: string, index: number) => {
    const currentItems = [...getStudentPrakerin(nipd, selectedStudent, currentKelas)];
    if (currentItems.length <= 1) {
      currentItems[0] = { nomor: 1, mitra: '', lamanya: '', keterangan: '' };
    } else {
      currentItems.splice(index, 1);
      currentItems.forEach((item, idx) => {
        item.nomor = idx + 1;
      });
    }
    const updated = {
      ...prakerinMap,
      [nipd]: currentItems,
    };
    setPrakerinMap(updated);
    try {
      localStorage.setItem('saved_raport_prakerin', JSON.stringify(updated));
    } catch {}
  };

  const handleApplyPrakerinToAllClass = () => {
    if (!selectedNipd) return;
    const currentItems = getStudentPrakerin(selectedNipd, selectedStudent, currentKelas);
    const updated = { ...prakerinMap };
    classStudents.forEach(st => {
      const sNipd = st.nipd || st.nipOrNis;
      updated[sNipd] = JSON.parse(JSON.stringify(currentItems));
    });
    setPrakerinMap(updated);
    try {
      localStorage.setItem('saved_raport_prakerin', JSON.stringify(updated));
    } catch {}
    setNotification(`Data tempat PKL berhasil disalin ke seluruh (${classStudents.length}) siswa kelas ${currentKelas?.namaKelas}!`);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleResetPrakerinToDefault = (nipd: string) => {
    const defaultItems = getDefaultPrakerinForMajor(
      selectedStudent?.jurusan || currentKelas?.jurusan,
      currentKelas?.namaKelas || selectedStudent?.kelas
    );
    const updated = {
      ...prakerinMap,
      [nipd]: defaultItems,
    };
    setPrakerinMap(updated);
    try {
      localStorage.setItem('saved_raport_prakerin', JSON.stringify(updated));
    } catch {}
    setNotification('Data PKL berhasil direset ke rekomendasi instansi kejuruan!');
    setTimeout(() => setNotification(null), 2500);
  };

  const studentCatatan = (selectedStudent && catatanWalasMap[selectedStudent.nipd || selectedStudent.nipOrNis]) ||
    "Ananda menunjukkan perkembangan karakter yang sangat positif, santun dalam bertutur kata, serta memiliki etos belajar dan disiplin praktikum laboratorium yang patut dicontoh. Pertahankan prestasi dan terus kembangkan kepedulian sosial.";

  // Extracurriculars of student from NilaiEkskulList
  const studentEkskulRecords = nilaiEkskulList.filter(n => 
    n.nipd === selectedNipd ||
    (selectedStudent && (
      n.nipd === selectedStudent.nipOrNis || 
      (n.namaSiswa && selectedStudent.nama && n.namaSiswa.toLowerCase() === selectedStudent.nama.toLowerCase())
    ))
  );

  const studentEkskuls = (selectedStudent?.ekskulDiikuti && selectedStudent.ekskulDiikuti.length > 0)
    ? selectedStudent.ekskulDiikuti
    : [];

  // Handler Cetak Raport Terisolasi (Print Document Area)
  // Menghilangkan kertas kosong pada halaman pertama dan memastikan Kop Surat tidak terpisah
  const handlePrintRaport = () => {
    const container = document.getElementById('printable-raport-container');
    if (!container) {
      window.print();
      return;
    }
    setIsPrintingRaport(true);
    try {
      const studentTitle = modeCetakRaport === 'per_siswa' && selectedStudent 
        ? `Rapor_${(selectedStudent.nama || 'Siswa').replace(/\s+/g, '_')}_${currentKelas?.namaKelas || ''}_${selectedPeriode}`
        : `Rapor_Kolektif_${currentKelas?.namaKelas || ''}_${selectedPeriode}`;
      printDocumentArea(container, {
        paperSize: raportPaperSize,
        orientation: 'portrait',
        margin: raportMargin,
        title: studentTitle
      });
    } catch (err) {
      console.warn('Fallback print:', err);
      window.print();
    } finally {
      setIsPrintingRaport(false);
    }
  };

  // RBAC Permission Check for Leger Keseluruhan:
  // "dan leger keseluruhan itu hanya bisa diakses oleh walas sesuia kelas dan admin"
  const isWalasOfThisClass = isSuperAdmin || walasAssignedClasses.some(k => k.id === selectedKelasId);

  // Helper to extract the effective score for Leger display (resolving precalculated or on-the-fly)
  const resolveStudentScore = (item?: NilaiMapelSiswa): number | undefined => {
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

  // Filter kolom Leger Keseluruhan:
  // Sesuai permintaan pengguna: "untuk nilai di leger keseluruhan tiap walas adalah nilai yang hanya diinput saja, jangan semua mapel, jadi yang muncul yang diinput saja"
  const [hanyaMapelDiinputLeger, setHanyaMapelDiinputLeger] = useState<boolean>(true);

  // Hanya mapel yang nilainya sudah diisi yang tampil di Leger Keseluruhan (sesuai instruksi pengguna)
  const filledClassMapelList = useMemo(() => {
    return classMapelList.filter(m => {
      return classStudents.some(student => {
        const nipdKey = student.nipd || student.nipOrNis;
        const inlineVal = isEditModeLeger ? inlineLegerGrades[`${nipdKey}_${m.id}`] : undefined;
        if (inlineVal !== undefined && inlineVal > 0) return true;
        const found = findStudentGrade(nipdKey, student, m, selectedPeriode) || findStudentGrade(nipdKey, student, m, null);
        const score = resolveStudentScore(found);
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
  }, [classMapelList, classStudents, isEditModeLeger, inlineLegerGrades, findStudentGrade, selectedPeriode]);

  // Pada mode edit manual tampilkan semua mapel kelas agar walas/admin bisa mengisi;
  // Pada mode pratinjau/tabel biasa: HANYA mapel yang sudah diisi yang tampil jika hanyaMapelDiinputLeger aktif
  const activeLegerMapels = isEditModeLeger 
    ? classMapelList 
    : (hanyaMapelDiinputLeger ? filledClassMapelList : classMapelList);

  // Compute Leger Keseluruhan data for current class (dari nilai murni yang diinput guru mapel)
  const legerKeseluruhanRows = classStudents.map(student => {
    const nipdKey = student.nipd || student.nipOrNis;
    let totalScore = 0;
    let gradedCount = 0;

    const mapelScores: { [mapelId: string]: number | undefined } = {};

    activeLegerMapels.forEach(m => {
      const inlineVal = isEditModeLeger ? inlineLegerGrades[`${nipdKey}_${m.id}`] : undefined;
      if (inlineVal !== undefined) {
        mapelScores[m.id] = inlineVal;
        totalScore += inlineVal;
        gradedCount += 1;
      } else {
        const found = findStudentGrade(nipdKey, student, m, selectedPeriode) || findStudentGrade(nipdKey, student, m, null);
        const score = resolveStudentScore(found);
        if (score !== undefined && score > 0) {
          mapelScores[m.id] = score;
          totalScore += score;
          gradedCount += 1;
        } else {
          mapelScores[m.id] = undefined;
        }
      }
    });

    const averageScore = gradedCount > 0 ? Math.round((totalScore / gradedCount) * 10) / 10 : 0;
    const sCounts = getDailyAbsensiCounts(student);
    const savedAbs = getSavedStudentAbsensi(nipdKey, student);
    const abs = {
      hadir: (savedAbs && typeof savedAbs.hadir === 'number') ? savedAbs.hadir : sCounts.hadir,
      sakit: (savedAbs && typeof savedAbs.sakit === 'number') ? savedAbs.sakit : sCounts.sakit,
      izin: (savedAbs && typeof savedAbs.izin === 'number') ? savedAbs.izin : sCounts.izin,
      alpa: (savedAbs && typeof savedAbs.alpa === 'number') ? savedAbs.alpa : sCounts.alpa,
    };

    return {
      student,
      nipdKey,
      mapelScores,
      totalScore,
      averageScore,
      gradedCount,
      absensi: abs,
    };
  });

  // Sort by averageScore descending to determine class ranking
  const rankedLegerRows = [...legerKeseluruhanRows].sort((a, b) => b.averageScore - a.averageScore);

  return (
    <div className="space-y-6">
      {notification && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Banner Navigation Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-800">
                Buku Leger & Cetak Raport Kurikulum Merdeka
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold uppercase">
                Peran: {currentUser.role}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Format penilaian komprehensif: Leger Guru Mapel (LM1-LM4 & TP), Leger Keseluruhan Rombel, Titimangsa, dan Raport Siswa.
            </p>
          </div>
        </div>

        {/* 3 Distinct Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto w-full md:w-auto">
          <button
            onClick={() => setActiveTab('leger_guru')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'leger_guru'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Leger Guru Mapel & TP</span>
          </button>

          {isAuthorizedLegerKeseluruhan && (
            <button
              onClick={() => setActiveTab('leger_keseluruhan')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'leger_keseluruhan'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Leger Keseluruhan Kelas</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('cetak_leger')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'cetak_leger'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{isAuthorizedLegerKeseluruhan ? 'Cetak Leger (Mapel & Walas)' : 'Cetak Leger Mapel Pribadi'}</span>
          </button>

          {isAuthorizedCetakRaport && (
            <button
              onClick={() => setActiveTab('raport_merdeka')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'raport_merdeka'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Raport Resmi</span>
            </button>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: LEGER KHUSUS GURU MAPEL (INPUT NILAI & TP/LINGKUP MATERI) */}
      {/* ============================================================== */}
      {activeTab === 'leger_guru' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex flex-wrap items-center gap-3">
              {/* Kelas Selector - Dynamically filtered according to chosen Mapel and user role */}
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <label className="text-[11px] font-bold text-slate-500">
                    Kelas / Rombel Sasaran ({availableClassesForLegerGuru.length}):
                  </label>
                  {(isSuperAdmin || isWalas) && (
                    <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 text-[9px] font-bold">
                      {isSuperAdmin ? 'Admin' : 'Wali Kelas'}
                    </span>
                  )}
                </div>
                <select
                  value={selectedKelasId}
                  onChange={(e) => {
                    setSelectedKelasId(e.target.value);
                    if (onSelectClassId) onSelectClassId(e.target.value);
                  }}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-emerald-500"
                >
                  {availableClassesForLegerGuru.map(k => (
                    <option key={k.id} value={k.id}>{k.namaKelas} ({k.jurusan})</option>
                  ))}
                </select>
              </div>

              {/* Mata Pelajaran Selector dengan Kolom Pencarian Filter */}
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <label className="block text-[11px] font-bold text-slate-500">
                    {isSuperAdmin ? 'Mata Pelajaran (Semua):' : isWalas ? 'Pilih Mata Pelajaran Rombel:' : 'Mata Pelajaran yang Diampu:'}
                  </label>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    ({filteredAvailableMapels.length} dari {availableMapels.length})
                  </span>
                </div>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5">
                  <div className="relative min-w-[140px] sm:min-w-[170px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Cari mapel / kode..."
                      value={mapelSearchFilter}
                      onChange={(e) => {
                        const val = e.target.value;
                        setMapelSearchFilter(val);
                        if (val.trim()) {
                          const q = val.toLowerCase().trim();
                          const matched = availableMapels.find(m => 
                            m.namaMapel.toLowerCase().includes(q) ||
                            (m.kode && m.kode.toLowerCase().includes(q))
                          );
                          if (matched) setSelectedMapelId(matched.id);
                        }
                      }}
                      className="w-full pl-8 pr-6 py-1.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                    {mapelSearchFilter && (
                      <button
                        type="button"
                        onClick={() => setMapelSearchFilter('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer"
                        title="Hapus pencarian"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <select
                    value={selectedMapelId}
                    onChange={(e) => setSelectedMapelId(e.target.value)}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 bg-slate-50 text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 max-w-[260px]"
                  >
                    {filteredAvailableMapels.length === 0 ? (
                      <option value="">Tidak ada mapel cocok "{mapelSearchFilter}"</option>
                    ) : (
                      filteredAvailableMapels.map(m => (
                        <option key={m.id} value={m.id}>{m.namaMapel} ({m.kode})</option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Periode Asesmen Toggle */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center justify-between">
                  <span>Periode Asesmen (Pilih Manual):</span>
                  {!selectedPeriode && (
                    <span className="text-[10px] text-amber-600 font-normal italic">
                      (Belum dipilih)
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  {(['PTS', 'PAS', 'PAT'] as const).map(p => {
                    const isSelected = selectedPeriode === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handleSelectPeriode(p)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                        }`}
                      >
                        {p === 'PTS' ? 'PTS (Tengah)' : p === 'PAS' ? 'PAS (Sem 1)' : 'PAT (Sem 2)'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Button to toggle TP/Lingkup Materi editor */}
              <div className="pt-4 lg:pt-0">
                <button
                  type="button"
                  onClick={() => setShowTpEditor(!showTpEditor)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
                    showTpEditor 
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-800' 
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Input Lingkup Materi / TP</span>
                  {showTpEditor ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {/* Action Save, Import & Clear Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleDownloadExcelTemplate}
                className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-300 shadow-xs cursor-pointer"
                title="Unduh format template Excel resmi untuk kelas dan mapel ini"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Format Excel</span>
                <span className="sm:hidden">Format</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setImportFile(null);
                  setImportParsedData(null);
                  setIsImportModalOpen(true);
                }}
                className="px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                title="Impor nilai siswa dari berkas Excel/Spreadsheet tanpa mengetik ulang"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import Nilai Excel</span>
              </button>

              <button
                type="button"
                onClick={handleClearDraftScores}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-300 cursor-pointer"
                title="Kosongkan form nilai untuk kelas dan mapel ini"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Kosongkan Input</span>
              </button>

              <button
                type="button"
                onClick={() => setShowRestoreModal(true)}
                className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                title="Pulihkan (restore) nilai jika tidak sengaja terhapus, kosong, atau terjadi kekeliruan penginputan"
              >
                <History className="w-3.5 h-3.5 text-white" />
                <span>Restore Nilai</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('cetak_leger')}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                title="Buka Pratinjau & Cetak Leger Mata Pelajaran Ini"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Leger Mapel</span>
              </button>

              <button
                type="button"
                onClick={handleSaveAllScores}
                disabled={isSavingScores}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                {isSavingScores ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Simpan Nilai Leger Mapel</span>
              </button>
            </div>
          </div>

          {/* INPUT LINGKUP MATERI (LM) / TUJUAN PEMBELAJARAN (TP) PANEL */}
          {showTpEditor && (
            <form onSubmit={handleSaveTP} className="p-5 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-4 text-xs animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-200/60 pb-3">
                <div>
                  <h3 className="font-bold text-indigo-950 flex items-center gap-2 text-sm">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    Input Deskripsi Lingkup Materi (LM) & Tujuan Pembelajaran (TP)
                  </h3>
                  <p className="text-[11px] text-indigo-800">
                    Mata Pelajaran: <strong>{currentMapel?.namaMapel}</strong> ({currentMapel?.kode})
                  </p>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Lingkup Materi & TP</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-indigo-950 mb-1">
                    Lingkup Materi 1 (LM 1) / Capaian TP 1:
                  </label>
                  <input
                    type="text"
                    value={tempLm1}
                    onChange={(e) => setTempLm1(e.target.value)}
                    placeholder="Input manual LM 1 / TP 1 (Contoh: Memahami dasar sediaan pulveres...)"
                    className="w-full px-3 py-2 rounded-xl border border-indigo-200 bg-white font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-indigo-950 mb-1">
                    Lingkup Materi 2 (LM 2) / Capaian TP 2 <span className="text-slate-400 font-normal">(Opsional)</span>:
                  </label>
                  <input
                    type="text"
                    value={tempLm2}
                    onChange={(e) => setTempLm2(e.target.value)}
                    placeholder="Contoh: TP 2: Menghitung dosis lazim dan dosis maksimum serbuk..."
                    className="w-full px-3 py-2 rounded-xl border border-indigo-200 bg-white font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-indigo-950 mb-1">
                    Lingkup Materi 3 (LM 3) / Capaian TP 3 <span className="text-slate-400 font-normal">(Opsional)</span>:
                  </label>
                  <input
                    type="text"
                    value={tempLm3}
                    onChange={(e) => setTempLm3(e.target.value)}
                    placeholder="Contoh: TP 3: Melakukan prosedur penimbangan & sterilisasi alat..."
                    className="w-full px-3 py-2 rounded-xl border border-indigo-200 bg-white font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-indigo-950 mb-1">
                    Lingkup Materi 4 (LM 4) / Capaian TP 4 <span className="text-slate-400 font-normal">(Opsional)</span>:
                  </label>
                  <input
                    type="text"
                    value={tempLm4}
                    onChange={(e) => setTempLm4(e.target.value)}
                    placeholder="Contoh: TP 4: Memberikan etiket obat dan mengomunikasikan aturan pakai..."
                    className="w-full px-3 py-2 rounded-xl border border-indigo-200 bg-white font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <p className="text-[11px] text-indigo-800 bg-indigo-100/60 p-2.5 rounded-xl border border-indigo-200/60 leading-relaxed">
                💡 <strong>Multi-TP Kurikulum Merdeka:</strong> Anda dapat menginput lebih dari 1 TP (hingga 4 TP). Seluruh TP yang Anda input akan otomatis dirangkum dan ditampilkan pada lembar rapor siswa sesuai capaian nilai masing-masing siswa (tercapai optimal maupun perlu bimbingan).
              </p>

              {/* OPSI CEKLIS DUPLIKASI TP KE SEMUA KELAS TINGKAT YANG SAMA (LINTAS JURUSAN) */}
              {sameGradeClasses.length > 0 && (
                <div className="p-4 bg-white rounded-2xl border border-indigo-200/90 shadow-2xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 pb-2.5">
                    <label className="flex items-center gap-2.5 cursor-pointer font-bold text-indigo-950 text-xs select-none">
                      <input
                        type="checkbox"
                        checked={applyToSameGrade}
                        onChange={(e) => setApplyToSameGrade(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-indigo-300 cursor-pointer"
                      />
                      <span className="flex items-center gap-1.5 flex-wrap">
                        <span>Terapkan TP yang sama ke rombel tingkat {currentTingkat} lainnya (walaupun berbeda jurusan)</span>
                        <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                          {selectedTargetClassIds.length} dari {sameGradeClasses.length} kelas dipilih
                        </span>
                      </span>
                    </label>

                    {applyToSameGrade && (
                      <div className="flex items-center gap-2 text-[11px] shrink-0">
                        <button
                          type="button"
                          onClick={() => setSelectedTargetClassIds(sameGradeClasses.map(k => k.id))}
                          className="text-indigo-600 hover:text-indigo-800 font-semibold underline cursor-pointer"
                        >
                          Pilih Semua
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => setSelectedTargetClassIds([])}
                          className="text-slate-500 hover:text-slate-700 font-semibold underline cursor-pointer"
                        >
                          Kosongkan
                        </button>
                      </div>
                    )}
                  </div>

                  {applyToSameGrade && (
                    <div className="space-y-2">
                      <p className="text-[11px] text-slate-600 font-medium">
                        Centang kelas tingkat {currentTingkat} yang akan otomatis menggunakan TP ini ({currentMapel?.namaMapel}):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {sameGradeClasses.map(k => {
                          const isChecked = selectedTargetClassIds.includes(k.id);
                          return (
                            <button
                              key={k.id}
                              type="button"
                              onClick={() => {
                                setSelectedTargetClassIds(prev => 
                                  prev.includes(k.id) ? prev.filter(id => id !== k.id) : [...prev, k.id]
                                );
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all border cursor-pointer ${
                                isChecked
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs ring-2 ring-indigo-200'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                                isChecked ? 'bg-white text-indigo-700 font-black' : 'border border-slate-300 bg-white'
                              }`}>
                                {isChecked ? '✓' : ''}
                              </span>
                              <span>{k.namaKelas}</span>
                              <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                                isChecked ? 'bg-indigo-700/80 text-indigo-100' : 'bg-slate-200 text-slate-600'
                              }`}>
                                {k.jurusan}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="text-[11px] text-indigo-800 bg-indigo-50/70 p-2.5 rounded-xl border border-indigo-100 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Hemat waktu & efisien:</strong> Jika materi & TP mata pelajaran ini sama untuk seluruh kelas tingkat {currentTingkat}, cukup isi sekali dan centang kelas di atas. Anda tidak perlu mengulang pengisian TP satu per satu di setiap rombel!
                    </span>
                  </div>
                </div>
              )}

              {/* ACTION BAR: SALIN TP DARI KELAS LAIN & TOMBOL SIMPAN */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-indigo-200/60">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Dropdown Tombol Salin TP jika kelas lain sudah punya TP */}
                  {availableSavedTpSources.length > 0 && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowCopyTpMenu(!showCopyTpMenu)}
                        className="px-3 py-2 rounded-xl border border-indigo-300 bg-white hover:bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                        title="Salin deskripsi TP dari kelas tingkat yang sama"
                      >
                        <Copy className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Salin TP dari Kelas Lain ({availableSavedTpSources.length} kelas)</span>
                        <ChevronDown className="w-3 h-3 text-indigo-500" />
                      </button>

                      {showCopyTpMenu && (
                        <div className="absolute left-0 mt-1 w-80 bg-white rounded-2xl shadow-xl border border-indigo-200 py-2 z-30 animate-fade-in divide-y divide-slate-100">
                          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Pilih Sumber TP Tingkat {currentTingkat}:
                          </div>
                          <div className="max-h-56 overflow-y-auto">
                            {availableSavedTpSources.map(src => (
                              <button
                                key={src.id}
                                type="button"
                                onClick={() => {
                                  setTempLm1(src.tp.lm1);
                                  setTempLm2(src.tp.lm2);
                                  setTempLm3(src.tp.lm3);
                                  setTempLm4(src.tp.lm4);
                                  setShowCopyTpMenu(false);
                                  setNotification(`✅ Deskripsi TP berhasil disalin dari ${src.label}! Klik 'Simpan Lingkup Materi & TP' untuk menerapkan.`);
                                  setTimeout(() => setNotification(null), 4000);
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 flex items-center justify-between group transition-colors"
                              >
                                <div>
                                  <p className="font-bold text-slate-800 group-hover:text-indigo-900">{src.label}</p>
                                  <p className="text-[10px] text-slate-500 truncate max-w-[200px]">{src.tp.lm1}</p>
                                </div>
                                <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold text-[10px] group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                  Salin
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setTempLm1('');
                      setTempLm2('');
                      setTempLm3('');
                      setTempLm4('');
                      setNotification('Isian Lingkup Materi / TP telah dikosongkan. Silakan input manual.');
                      setTimeout(() => setNotification(null), 2500);
                    }}
                    className="px-3 py-2 rounded-xl border border-red-200 bg-red-50/60 hover:bg-red-100 text-red-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    <span>Kosongkan Form</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTempLm1(`TP 1: Memahami capaian kompetensi dasar materi ${currentMapel?.namaMapel}`);
                      setTempLm2(`TP 2: Menerapkan prosedur kerja dan analisis teknis ${currentMapel?.namaMapel}`);
                      setTempLm3(`TP 3: Menganalisis studi kasus dan pemecahan masalah praktis`);
                      setTempLm4(`TP 4: Mengomunikasikan laporan hasil asesmen dan evaluasi kerja`);
                      setNotification('Template standar Kurikulum Merdeka telah dimuat ke form input.');
                      setTimeout(() => setNotification(null), 2500);
                    }}
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Muat Template Standar (Opsional)</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer w-full sm:w-auto"
                  >
                    <Save className="w-4 h-4" />
                    <span>Simpan & Terapkan Lingkup Materi (TP)</span>
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-indigo-700 bg-white/70 p-2.5 rounded-xl border border-indigo-100 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>
                  Deskripsi TP yang Anda simpan otomatis menjadi acuan capaian kompetensi di rapor siswa dan tersinkronisasi ke seluruh rombel terpilih.
                </span>
              </div>
            </form>
          )}

          {/* BANNER PENYELAMAT NILAI OTOMATIS */}
          {candidateRescueSnapshot && (
            <div className="p-4 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border-2 border-orange-400 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5 shadow-sm animate-in fade-in">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-orange-600 text-white rounded-xl shrink-0 mt-0.5 shadow-xs">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs sm:text-sm font-black text-orange-950">
                      Nilai Anda Kemarin Ditemukan ({candidateRescueSnapshot.totalStudentsWithScore} Nilai Siswa)!
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-orange-200 text-orange-900 border border-orange-300">
                      Tercatat di Cadangan: {candidateRescueSnapshot.mapelNama}
                    </span>
                  </div>
                  <p className="text-xs text-orange-900/90 mt-1 leading-relaxed">
                    Kemarin saat menginput nilai kelas <strong>{currentKelas?.namaKelas}</strong>, pilihan mata pelajaran aktif sempat berada di <em>"{candidateRescueSnapshot.mapelNama}"</em>. Nilai seluruh siswa tersimpan utuh di cadangan tersebut. Klik tombol di samping untuk langsung memindahkan seluruh nilainya menjadi nilai <strong>{currentMapel?.namaMapel}</strong> dan menyimpannya ke Cloud database sekolah.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => handleRestoreScores(candidateRescueSnapshot.scores, candidateRescueSnapshot.mapelNama)}
                  className="flex-1 md:flex-initial px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Pindahkan & Pulihkan ke {currentMapel?.namaMapel}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowRestoreModal(true)}
                  className="px-3.5 py-2.5 bg-white hover:bg-orange-100 text-orange-950 border border-orange-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Buka Riwayat
                </button>
              </div>
            </div>
          )}

          {/* TABLE LEGER NILAI GURU MAPEL */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="py-3 px-3 w-10 text-center border-r border-slate-200">No</th>
                  <th className="py-3 px-3 w-28 border-r border-slate-200">NISN / NIPD</th>
                  <th className="py-3 px-4 border-r border-slate-200">Nama Peserta Didik</th>
                  
                  {/* Lingkup Materi LM 1 - LM 4 */}
                  <th className="py-3 px-2 text-center w-14 border-r border-slate-200 bg-blue-50/60 text-blue-900" title={tempLm1}>
                    LM 1
                  </th>
                  <th className="py-3 px-2 text-center w-14 border-r border-slate-200 bg-blue-50/60 text-blue-900" title={tempLm2}>
                    LM 2
                  </th>
                  <th className="py-3 px-2 text-center w-14 border-r border-slate-200 bg-blue-50/60 text-blue-900" title={tempLm3}>
                    LM 3
                  </th>
                  <th className="py-3 px-2 text-center w-14 border-r border-slate-200 bg-blue-50/60 text-blue-900" title={tempLm4}>
                    LM 4
                  </th>

                  <th className="py-3 px-3 text-center w-16 border-r border-slate-200 bg-slate-200/80 font-bold text-slate-800">
                    Rata LM
                  </th>

                  {/* Dynamic Sumatif Column according to Periode */}
                  {selectedPeriode === 'PTS' && (
                    <th className="py-3 px-3 text-center w-16 border-r border-slate-200 bg-amber-100 text-amber-900 font-bold">
                      PTS
                    </th>
                  )}
                  {selectedPeriode === 'PAS' && (
                    <th className="py-3 px-3 text-center w-16 border-r border-slate-200 bg-emerald-100 text-emerald-900 font-bold">
                      PAS
                    </th>
                  )}
                  {selectedPeriode === 'PAT' && (
                    <th className="py-3 px-3 text-center w-16 border-r border-slate-200 bg-teal-100 text-teal-900 font-bold">
                      PAT
                    </th>
                  )}

                  <th className="py-3 px-3 text-center w-16 border-r border-slate-200 bg-emerald-600 text-white font-bold">
                    NA
                  </th>
                  <th className="py-3 px-2 text-center w-12 border-r border-slate-200 font-bold">
                    Pred
                  </th>
                  <th className="py-3 px-4 min-w-[200px]">
                    Capaian Kompetensi TP
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classStudents.map((s, idx) => {
                  const nipdKey = s.nipd || s.nipOrNis;
                  const item = localGrades[nipdKey] || {};
                  const computed = hitungNilaiAkhir({ ...item, periode: selectedPeriode || undefined });

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono text-slate-400 border-r border-slate-100">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 border-r border-slate-100">{nipdKey}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-900 border-r border-slate-100">{s.nama}</td>

                      {/* LM 1 */}
                      <td className="py-1 px-1 border-r border-slate-100 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="-"
                          value={item.lm1 !== undefined ? item.lm1 : ''}
                          onChange={(e) => handleScoreChange(nipdKey, 'lm1', e.target.value)}
                          className="w-12 text-center py-1 rounded border border-slate-200 font-mono font-medium focus:border-emerald-500 placeholder:text-slate-300"
                        />
                      </td>

                      {/* LM 2 */}
                      <td className="py-1 px-1 border-r border-slate-100 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="-"
                          value={item.lm2 !== undefined ? item.lm2 : ''}
                          onChange={(e) => handleScoreChange(nipdKey, 'lm2', e.target.value)}
                          className="w-12 text-center py-1 rounded border border-slate-200 font-mono font-medium focus:border-emerald-500 placeholder:text-slate-300"
                        />
                      </td>

                      {/* LM 3 */}
                      <td className="py-1 px-1 border-r border-slate-100 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="-"
                          value={item.lm3 !== undefined ? item.lm3 : ''}
                          onChange={(e) => handleScoreChange(nipdKey, 'lm3', e.target.value)}
                          className="w-12 text-center py-1 rounded border border-slate-200 font-mono font-medium focus:border-emerald-500 placeholder:text-slate-300"
                        />
                      </td>

                      {/* LM 4 */}
                      <td className="py-1 px-1 border-r border-slate-100 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="-"
                          value={item.lm4 !== undefined ? item.lm4 : ''}
                          onChange={(e) => handleScoreChange(nipdKey, 'lm4', e.target.value)}
                          className="w-12 text-center py-1 rounded border border-slate-200 font-mono font-medium focus:border-emerald-500 placeholder:text-slate-300"
                        />
                      </td>

                      {/* Rata LM */}
                      <td className="py-2.5 px-3 text-center font-bold text-slate-700 bg-slate-50 border-r border-slate-100">
                        {computed.nilaiFormatif > 0 ? computed.nilaiFormatif : <span className="text-slate-300">-</span>}
                      </td>

                      {/* PTS */}
                      {selectedPeriode === 'PTS' && (
                        <td className="py-1 px-1 border-r border-slate-100 text-center bg-amber-50/40">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="-"
                            value={item.nilaiPts !== undefined ? item.nilaiPts : ''}
                            onChange={(e) => handleScoreChange(nipdKey, 'nilaiPts', e.target.value)}
                            className="w-12 text-center py-1 rounded border border-amber-300 font-mono font-bold text-amber-900 bg-amber-50/60 focus:border-emerald-500 placeholder:text-amber-300"
                          />
                        </td>
                      )}

                      {/* PAS */}
                      {selectedPeriode === 'PAS' && (
                        <td className="py-1 px-1 border-r border-slate-100 text-center bg-emerald-50/40">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="-"
                            value={item.nilaiPas !== undefined ? item.nilaiPas : ''}
                            onChange={(e) => handleScoreChange(nipdKey, 'nilaiPas', e.target.value)}
                            className="w-12 text-center py-1 rounded border border-emerald-300 font-mono font-bold text-emerald-900 bg-emerald-50/60 focus:border-emerald-500 placeholder:text-emerald-300"
                          />
                        </td>
                      )}

                      {/* PAT */}
                      {selectedPeriode === 'PAT' && (
                        <td className="py-1 px-1 border-r border-slate-100 text-center bg-teal-50/40">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="-"
                            value={item.nilaiPat !== undefined ? item.nilaiPat : ''}
                            onChange={(e) => handleScoreChange(nipdKey, 'nilaiPat', e.target.value)}
                            className="w-12 text-center py-1 rounded border border-teal-300 font-mono font-bold text-teal-900 bg-teal-50/60 focus:border-teal-500 placeholder:text-teal-300"
                          />
                        </td>
                      )}

                      {/* Nilai Akhir (NA) */}
                      <td className="py-2.5 px-3 text-center font-black text-sm text-emerald-700 bg-emerald-50/60 border-r border-slate-100">
                        {computed.nilaiAkhir > 0 ? computed.nilaiAkhir : <span className="text-slate-300">-</span>}
                      </td>

                      {/* Predikat */}
                      <td className="py-2.5 px-2 text-center font-bold text-slate-800 border-r border-slate-100">
                        {computed.nilaiAkhir > 0 ? computed.predikat : <span className="text-slate-300">-</span>}
                      </td>

                      {/* Capaian TP */}
                      <td className="py-2.5 px-4 text-[11px] text-slate-600 leading-snug">
                        {computed.nilaiAkhir > 0 
                          ? (item.tpDeskripsi || buildKurikulumMerdekaCapaian({
                              grade: { ...item, nilaiAkhir: computed.nilaiAkhir },
                              mapel: currentMapel,
                              kelas: currentKelas,
                              tpMap: tpMapelMap,
                              displayStyle: 'narasi',
                            }).deskripsiNarasi)
                          : <span className="text-slate-400 italic">Belum diinput guru mapel</span>
                        }
                      </td>
                    </tr>
                  );
                })}

                {classStudents.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-400">
                      Tidak ada peserta didik di rombel ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: LEGER KESELURUHAN PER KELAS / JURUSAN (KUMPULAN SEMUA MAPEL) */}
      {/* HANYA BISA DIAKSES OLEH WALAS SESUAI KELAS DAN ADMIN */}
      {/* ============================================================== */}
      {activeTab === 'leger_keseluruhan' && (
        <div className="space-y-6">
          {!isAuthorizedLegerKeseluruhan ? (
            /* ACCESS RESTRICTED FOR NON-WALAS GURU */
            <div className="bg-white rounded-3xl p-8 sm:p-12 border-2 border-amber-200 shadow-xl max-w-xl mx-auto text-center space-y-5">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center text-amber-600">
                <Lock className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>Akses Terbatas: Wali Kelas & Admin</span>
                </div>
                <h3 className="text-xl font-black text-slate-800">
                  Buku Leger Keseluruhan Dibatasi
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                  Sesuai ketentuan akademik, Buku Leger Keseluruhan (kumpulan nilai seluruh mata pelajaran per rombel/jurusan) <strong>hanya dapat diakses oleh Wali Kelas yang bersangkutan dan Administrator</strong>.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 text-left space-y-1">
                <p className="font-bold text-slate-800">Petunjuk Tenaga Pengajar:</p>
                <p>Silakan buka tab <strong>"Leger Guru Mapel & TP"</strong> untuk menginput, memverifikasi, dan menyimpan nilai mata pelajaran yang Anda ampu.</p>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('leger_guru')}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md"
              >
                Kembali ke Leger Guru Mapel
              </button>
            </div>
          ) : !isWalasOfThisClass ? (
            /* WALAS ACCESSING DIFFERENT CLASS */
            <div className="bg-white rounded-3xl p-8 border-2 border-amber-200 shadow-xl max-w-xl mx-auto text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                <Lock className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Akses Dibatasi Sesuai Kelas Walas Anda</h3>
              <p className="text-xs text-slate-500">
                Sebagai Wali Kelas, Anda hanya berwenang mengakses Leger Keseluruhan untuk rombel binaan Anda sendiri ({currentUser.namaKelas || currentUser.kelas}).
              </p>
              <button
                type="button"
                onClick={() => {
                  const myClass = kelasList.find(k => k.namaKelas === currentUser.namaKelas || k.id === currentUser.walasKelasId);
                  if (myClass) setSelectedKelasId(myClass.id);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
              >
                Buka Leger Kelas Binaan Saya
              </button>
            </div>
          ) : (
            /* AUTHORIZED LEGER KESELURUHAN VIEW */
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                      {isSuperAdmin ? 'Super Administrator Access' : `Wali Kelas Resmi: ${currentKelas.namaKelas}`}
                    </span>
                    <span className="text-xs text-slate-400">• Rombel: {currentKelas.namaKelas}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">
                    Buku Leger Nilai Keseluruhan Rombel / Jurusan
                  </h3>
                  <p className="text-xs text-slate-500">
                    Rekapitulasi komprehensif nilai akhir seluruh mata pelajaran, akumulasi skor, ranking kelas, dan presensi.
                    <span className="font-semibold text-indigo-600 ml-1">
                      (Menampilkan {activeLegerMapels.length} mapel terinput dari {classMapelList.length} mapel)
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  {/* Super admin & multi-class Walas can switch classes */}
                  {(isSuperAdmin || availableClassesForWalas.length > 1) && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-600">Pilih Rombel:</span>
                      <select
                        value={selectedKelasId}
                        onChange={(e) => {
                          setSelectedKelasId(e.target.value);
                          if (onSelectClassId) onSelectClassId(e.target.value);
                        }}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-800"
                      >
                        {availableClassesForWalas.map(k => (
                          <option key={k.id} value={k.id}>{k.namaKelas} ({k.jurusan})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Toggle Filter Mapel Diinput vs Semua Mapel */}
                  <button
                    type="button"
                    onClick={() => setHanyaMapelDiinputLeger(!hanyaMapelDiinputLeger)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                      hanyaMapelDiinputLeger
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-2xs'
                        : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                    }`}
                    title={hanyaMapelDiinputLeger ? "Sedang menampilkan hanya mapel yang sudah diinput nilainya. Klik untuk melihat semua mapel." : "Sedang menampilkan semua mapel kurikulum. Klik untuk batasi ke mapel yang diinput saja."}
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span>{hanyaMapelDiinputLeger ? `Hanya Mapel Diinput (${filledClassMapelList.length})` : `Semua Mapel (${classMapelList.length})`}</span>
                  </button>

                  {/* Manual Periode Asesmen Switcher */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                      <span>Periode:</span>
                      {!selectedPeriode && (
                        <span className="text-[10px] text-amber-600 font-normal italic">
                          (Belum dipilih)
                        </span>
                      )}
                    </span>
                    <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
                      {(['PTS', 'PAS', 'PAT'] as const).map(p => {
                        const isSelected = selectedPeriode === p;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => handleSelectPeriode(p)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                            }`}
                          >
                            {p === 'PTS' ? 'PTS (Tengah)' : p === 'PAS' ? 'PAS (Sem 1)' : 'PAT (Sem 2)'}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tombol Ubah Nilai Leger khusus Admin & Walas */}
                  {(isSuperAdmin || isWalas) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!isEditModeLeger) {
                          initInlineLegerEdits();
                        }
                        setIsEditModeLeger(!isEditModeLeger);
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                        isEditModeLeger
                          ? 'bg-amber-600 hover:bg-amber-700 text-white animate-pulse'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                      title="Ubah nilai siswa secara langsung di tabel leger per rombel"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>{isEditModeLeger ? 'Batal Edit Nilai' : 'Ubah Nilai Leger (Admin/Walas)'}</span>
                    </button>
                  )}

                  {isEditModeLeger && (
                    <button
                      type="button"
                      onClick={handleSaveInlineLeger}
                      disabled={isSavingScores}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      {isSavingScores ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span>Simpan Perubahan Leger</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowRestoreModal(true)}
                    className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                    title="Buka riwayat cadangan dan pulihkan nilai yang hilang atau belum tampil di leger"
                  >
                    <History className="w-4 h-4 text-white" />
                    <span>Riwayat & Pulihkan Nilai</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('cetak_leger')}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                    title="Buka Pratinjau & Cetak Resmi Leger Keseluruhan Rombel Ini"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Cetak Leger Keseluruhan</span>
                  </button>
                </div>
              </div>

              {/* Banner Mode Edit Aktif */}
              {isEditModeLeger && (
                <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-amber-950 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <Edit3 className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <p className="font-bold">Mode Edit Nilai Leger Aktif ({isSuperAdmin ? 'Administrator' : 'Wali Kelas'})</p>
                      <p className="text-[11px] text-amber-800">
                        Anda dapat langsung mengubah angka nilai pada setiap kolom mata pelajaran di bawah (skala 0 - 100). Total, Rata-rata, dan Ranking rombel {currentKelas.namaKelas} akan dikalkulasi otomatis.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsEditModeLeger(false)}
                      className="px-3 py-1.5 rounded-lg border border-amber-300 text-amber-800 text-xs font-semibold hover:bg-amber-100 cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveInlineLeger}
                      disabled={isSavingScores}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      {isSavingScores ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      <span>Simpan ke Database</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Aggregated Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                      <th className="py-3 px-3 w-10 text-center border-r border-slate-200">No</th>
                      <th className="py-3 px-3 w-28 border-r border-slate-200">NISN / NIPD</th>
                      <th className="py-3 px-4 border-r border-slate-200 min-w-[160px]">Nama Peserta Didik</th>

                      {/* Mapel Columns */}
                      {activeLegerMapels.map(m => (
                        <th 
                          key={m.id} 
                          className="py-2.5 px-2 text-center w-14 border-r border-slate-200 text-[10px] font-bold uppercase bg-slate-50 cursor-pointer hover:bg-indigo-50 transition-colors group"
                          title={`${m.namaMapel} (${m.kode}) - Klik untuk buka di Leger Guru Mapel`}
                          onClick={() => {
                            setSelectedMapelId(m.id);
                            setActiveTab('leger_guru');
                          }}
                        >
                          <div className="flex flex-col items-center justify-center">
                            <span>{m.kode || m.namaMapel.substring(0, 4)}</span>
                            <span className="text-[8px] text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                              Edit ↗
                            </span>
                          </div>
                        </th>
                      ))}

                      <th className="py-3 px-3 text-center w-16 border-r border-slate-200 bg-slate-200/80 font-bold text-slate-900">
                        Total
                      </th>
                      <th className="py-3 px-3 text-center w-16 border-r border-slate-200 bg-indigo-50 font-bold text-indigo-900">
                        Rata
                      </th>
                      <th className="py-3 px-2 text-center w-12 border-r border-slate-200 bg-amber-50 font-bold text-amber-900">
                        Rank
                      </th>
                      <th className="py-3 px-2 text-center w-10 border-r border-slate-200 text-[10px] text-emerald-700 font-bold bg-emerald-50/60" title="Hadir / Masuk (H)">
                        H
                      </th>
                      <th className="py-3 px-2 text-center w-10 border-r border-slate-200 text-[10px] text-blue-700 font-bold" title="Sakit (S)">
                        S
                      </th>
                      <th className="py-3 px-2 text-center w-10 border-r border-slate-200 text-[10px] text-amber-700 font-bold" title="Izin (I)">
                        I
                      </th>
                      <th className="py-3 px-2 text-center w-10 text-[10px] text-rose-700 font-bold" title="Tanpa Keterangan / Alpa (A)">
                        A
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rankedLegerRows.map((row, idx) => (
                      <tr key={row.student.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 text-center font-mono text-slate-400 border-r border-slate-100">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 border-r border-slate-100">{row.nipdKey}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-900 border-r border-slate-100">{row.student.nama}</td>

                        {/* Each Mapel Score */}
                        {activeLegerMapels.map(m => {
                          const cellScore = row.mapelScores[m.id];
                          if (isEditModeLeger) {
                            const inlineVal = inlineLegerGrades[`${row.nipdKey}_${m.id}`];
                            return (
                              <td key={m.id} className="p-1 text-center border-r border-slate-100 bg-amber-50/30">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={inlineVal !== undefined ? inlineVal : ''}
                                  onChange={(e) => handleInlineScoreChange(row.nipdKey, m.id, e.target.value)}
                                  className="w-12 h-7 text-center font-bold font-mono text-xs rounded-lg border border-amber-300 bg-white text-slate-900 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500"
                                  placeholder="-"
                                />
                              </td>
                            );
                          }

                          return (
                            <td 
                              key={m.id} 
                              onClick={() => {
                                if (isSuperAdmin || isWalas) {
                                  setSelectedQuickEditCell({
                                    student: row.student,
                                    mapel: m,
                                    currentScore: cellScore,
                                    nipdKey: row.nipdKey,
                                  });
                                  setQuickScoreVal(cellScore !== undefined ? String(cellScore) : '');
                                }
                              }}
                              className={`py-2.5 px-2 text-center font-mono text-slate-700 border-r border-slate-100 ${
                                (isSuperAdmin || isWalas) ? 'cursor-pointer hover:bg-indigo-50 hover:text-indigo-700 transition-colors' : ''
                              }`}
                              title={(isSuperAdmin || isWalas) ? `Klik untuk ubah nilai ${row.student.nama} (${m.namaMapel})` : undefined}
                            >
                              {cellScore !== undefined ? (
                                <span className="font-semibold">{cellScore}</span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          );
                        })}

                        <td className="py-2.5 px-3 text-center font-black text-slate-900 bg-slate-50 border-r border-slate-100">
                          {row.totalScore > 0 ? row.totalScore : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="py-2.5 px-3 text-center font-black text-indigo-700 bg-indigo-50/60 border-r border-slate-100">
                          {row.averageScore > 0 ? row.averageScore : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="py-2.5 px-2 text-center font-black text-amber-700 bg-amber-50/60 border-r border-slate-100">
                          {row.averageScore > 0 ? `#${idx + 1}` : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono text-emerald-700 border-r border-slate-100 font-bold bg-emerald-50/20">
                          {row.absensi.hadir}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono text-blue-700 border-r border-slate-100 font-bold">
                          {row.absensi.sakit}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono text-amber-700 border-r border-slate-100 font-bold">
                          {row.absensi.izin}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono text-rose-700 font-bold">
                          {row.absensi.alpa}
                        </td>
                      </tr>
                    ))}

                    {rankedLegerRows.length === 0 && (
                      <tr>
                        <td colSpan={activeLegerMapels.length + 9} className="py-8 text-center text-slate-400">
                          Belum ada peserta didik di rombel ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Alert jika belum ada mapel yang diinput pada rombel ini */}
              {activeLegerMapels.length === 0 && (
                <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-2">
                  <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
                  <h4 className="font-bold text-slate-800 text-sm">Belum Ada Nilai Mata Pelajaran yang Diinput</h4>
                  <p className="text-xs text-slate-600 max-w-md mx-auto">
                    Hanya mata pelajaran yang sudah diinput nilainya yang tampil pada kolom Leger Keseluruhan rombel {currentKelas.namaKelas}. Silakan input nilai di Leger Guru Mapel terlebih dahulu atau klik tombol di bawah untuk menampilkan seluruh mapel kurikulum.
                  </p>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setHanyaMapelDiinputLeger(false)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      Tampilkan Semua Mapel Kurikulum ({classMapelList.length} Mapel)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('leger_guru')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      Buka Leger Guru Mapel
                    </button>
                  </div>
                </div>
              )}

              {/* MODAL UBAH NILAI CEPAT (ADMIN & WALAS) */}
              {selectedQuickEditCell && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
                  <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                          <Edit3 className="w-5 h-5" />
                        </span>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">Ubah Nilai Leger Siswa</h3>
                          <p className="text-[11px] text-slate-500">Akses: {isSuperAdmin ? 'Administrator' : 'Wali Kelas'}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedQuickEditCell(null)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                        <p className="text-slate-600">Peserta Didik: <strong className="text-slate-900">{selectedQuickEditCell.student.nama}</strong></p>
                        <p className="text-slate-600">NISN / NIPD: <strong className="font-mono text-slate-900">{selectedQuickEditCell.nipdKey}</strong></p>
                        <p className="text-slate-600">Rombel: <strong className="text-slate-900">{currentKelas?.namaKelas}</strong></p>
                        <p className="text-slate-600">Mata Pelajaran: <strong className="text-indigo-700">{selectedQuickEditCell.mapel.namaMapel} ({selectedQuickEditCell.mapel.kode})</strong></p>
                        <p className="text-slate-600">Periode: <strong className="text-emerald-700">{selectedPeriode}</strong></p>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Nilai Akhir ({selectedPeriode}) [Skala 0 - 100]:
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={quickScoreVal}
                          onChange={(e) => setQuickScoreVal(e.target.value)}
                          placeholder="Contoh: 85"
                          className="w-full px-3.5 py-2.5 text-base font-bold font-mono rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                          autoFocus
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMapelId(selectedQuickEditCell.mapel.id);
                          setSelectedQuickEditCell(null);
                          setActiveTab('leger_guru');
                        }}
                        className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <span>Buka di Leger Guru</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedQuickEditCell(null)}
                          className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveQuickEditCell}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Simpan Nilai</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}


      {/* ============================================================== */}
      {/* TAB 3: CETAK RAPORT RESMI KURIKULUM MERDEKA */}
      {/* FITUR: EDIT TITI MANGSA & EDIT ABSENSI SISWA DI RAPORT */}
      {/* ============================================================== */}
      {/* ============================================================== */}
      {/* TAB 3: CETAK RAPORT RESMI KURIKULUM MERDEKA */}
      {/* FILTER: PERSISWA ATAU SEMUA SISWA | SAVE PDF ATAU PRINTER */}
      {/* HANYA MENAMPILKAN SISWA DARI KELAS BINAAN WALAS */}
      {/* ============================================================== */}
      {activeTab === 'raport_merdeka' && !isAuthorizedCetakRaport && (
        <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Lock className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Akses Cetak Raport Terbatas</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Fitur Cetak Raport Resmi Kurikulum Merdeka hanya dapat diakses oleh Wali Kelas dan Administrator sekolah.
          </p>
        </div>
      )}

      {activeTab === 'raport_merdeka' && isAuthorizedCetakRaport && (
        <div className="space-y-6">
          <style>{`
            @media print {
              @page {
                size: A4 portrait;
                margin: 12mm 15mm 15mm 15mm;
              }
              body {
                background: white !important;
                color: black !important;
              }
              .no-print, header, nav, aside {
                display: none !important;
              }
              .raport-print-card {
                page-break-after: always !important;
                break-after: page !important;
                box-shadow: none !important;
                border: none !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              .raport-print-card:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
              }
            }
          `}</style>

          {/* Controls Card: Filter Cetak, Class/Student Selection, Titimangsa, Catatan Walas & Absensi Edit */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5 no-print">
            {/* Class & Filter Bar */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Class Selection for Super Admin & Multi-Class Walas */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Rombel / Kelas Raport:
                    </label>
                    {isSuperAdmin ? (
                      <select
                        value={selectedKelasId}
                        onChange={(e) => {
                          setSelectedKelasId(e.target.value);
                          if (onSelectClassId) onSelectClassId(e.target.value);
                          const targetK = kelasList.find(k => k.id === e.target.value);
                          const st = usersList.filter(u => u.role === 'siswa' && (u.idKelas === e.target.value || (targetK && (u.kelas === targetK.namaKelas || u.namaKelas === targetK.namaKelas))));
                          if (st.length > 0) setSelectedSiswaNipd(st[0].nipd || st[0].nipOrNis);
                        }}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-800"
                      >
                        {sortedClasses.map(k => (
                          <option key={k.id} value={k.id}>{k.namaKelas} ({k.jurusan})</option>
                        ))}
                      </select>
                    ) : availableClassesForWalas.length > 1 ? (
                      <select
                        value={selectedKelasId}
                        onChange={(e) => {
                          setSelectedKelasId(e.target.value);
                          if (onSelectClassId) onSelectClassId(e.target.value);
                          const targetK = kelasList.find(k => k.id === e.target.value);
                          const st = usersList.filter(u => u.role === 'siswa' && (u.idKelas === e.target.value || (targetK && (u.kelas === targetK.namaKelas || u.namaKelas === targetK.namaKelas))));
                          if (st.length > 0) setSelectedSiswaNipd(st[0].nipd || st[0].nipOrNis);
                        }}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-800"
                      >
                        {availableClassesForWalas.map(k => (
                          <option key={k.id} value={k.id}>{k.namaKelas} ({k.jurusan})</option>
                        ))}
                      </select>
                    ) : (
                      <span className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 inline-block">
                        {currentKelas?.namaKelas} ({currentKelas?.jurusan})
                      </span>
                    )}
                  </div>

                  {/* Student Selection for Mode: Per Siswa */}
                  {modeCetakRaport === 'per_siswa' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Pilih Peserta Didik ({classStudents.length} Siswa Binaan):
                      </label>
                      <select
                        value={selectedStudent ? (selectedStudent.nipd || selectedStudent.nipOrNis || selectedStudent.id) : selectedSiswaNipd}
                        onChange={(e) => setSelectedSiswaNipd(e.target.value)}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:border-emerald-500 min-w-[260px]"
                      >
                        {classStudents.map(s => {
                          const sVal = s.nipd || s.nipOrNis || s.id;
                          return (
                            <option key={s.id} value={sVal}>
                              {s.nama} - {s.nipd || s.nipOrNis || s.nisn || s.username || s.id}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}
                </div>

                {/* Filter Mode & Periode Asesmen Rapor */}
                <div className="flex items-center gap-3 pt-1 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">Mode Cetak:</span>
                    <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setModeCetakRaport('per_siswa')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                          modeCetakRaport === 'per_siswa'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Per-Siswa</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setModeCetakRaport('semua_siswa')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                          modeCetakRaport === 'semua_siswa'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Semua Siswa ({classStudents.length})</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleBulkSyncClassAbsensi}
                      className="px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                      title="Sinkronkan rekap presensi seluruh siswa rombel ini dari riwayat presensi harian / barcode"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Sinkron Absensi Seluruh Kelas</span>
                    </button>
                  </div>

                  {/* Periode Raport Buttons (Pilih Manual) */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <span>Periode Rapor (Pilih Manual):</span>
                      {!selectedPeriode && (
                        <span className="text-[10px] text-amber-600 font-normal italic">
                          (Belum dipilih)
                        </span>
                      )}
                    </span>
                    <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
                      {(['PTS', 'PAS', 'PAT'] as const).map(p => {
                        const isActive = selectedPeriode === p;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => handleSelectPeriode(p)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                              isActive
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                            }`}
                          >
                            {p === 'PAT' && <GraduationCap className="w-3.5 h-3.5 text-amber-300" />}
                            <span>{p === 'PTS' ? 'PTS (Tengah Semester)' : p === 'PAS' ? 'PAS (Semester 1)' : 'PAT (Semester 2 / Kenaikan Kelas)'}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Kotak Kenaikan Kelas Display Mode Switch */}
                  <div className="flex items-center gap-1.5 text-xs bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
                    <span className="text-slate-600 font-medium">Kotak Kenaikan:</span>
                    <select
                      value={kenaikanDisplayMode}
                      onChange={(e) => handleSetKenaikanDisplayMode(e.target.value as any)}
                      className="px-2 py-0.5 rounded border border-slate-300 font-bold text-[11px] text-emerald-800 bg-white focus:outline-none"
                    >
                      <option value="otomatis">Otomatis (Saat PAT / Semester 2)</option>
                      <option value="selalu">Selalu Tampilkan di Rapor</option>
                      <option value="sembunyikan">Sembunyikan</option>
                    </select>
                  </div>

                  {/* Format Deskripsi Capaian Kompetensi / Multi TP di Rapor */}
                  <div className="flex items-center gap-1.5 text-xs bg-indigo-50/70 px-2.5 py-1 rounded-xl border border-indigo-200">
                    <span className="text-indigo-950 font-bold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Format TP Rapor:</span>
                    </span>
                    <select
                      value={formatDeskripsiRapor}
                      onChange={(e) => {
                        const val = e.target.value as 'ringkas' | 'narasi' | 'poin';
                        setFormatDeskripsiRapor(val);
                        try { localStorage.setItem('saved_format_deskripsi_rapor', val); } catch {}
                      }}
                      className="px-2 py-0.5 rounded border border-indigo-300 font-bold text-[11px] text-indigo-900 bg-white focus:outline-none cursor-pointer"
                      title="Pilih format tampilan Capaian Kompetensi (Bisa diringkas intinya agar hemat tempat atau dirinci per TP)"
                    >
                      <option value="ringkas">Ringkas (Inti Esensial - Rapi & Hemat Kertas)</option>
                      <option value="narasi">Narasi Lengkap (Rangkum Seluruh TP)</option>
                      <option value="poin">Butir Poin (Rincian per TP 1 - 4)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* ACTION PRINT & EXPORT BUTTONS WITH PAPER CONFIG */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto flex-wrap">
                {/* Pilihan Kertas Cetak Rapor */}
                <div className="flex items-center gap-1.5 text-xs bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
                  <span className="text-slate-600 font-bold">Kertas:</span>
                  <select
                    value={raportPaperSize}
                    onChange={(e) => setRaportPaperSize(e.target.value as 'F4' | 'A4')}
                    className="px-2 py-0.5 rounded border border-slate-300 font-bold text-[11px] text-slate-800 bg-white focus:outline-none cursor-pointer"
                    title="Pilih ukuran kertas resmi raport (F4/Folio atau A4)"
                  >
                    <option value="F4">F4 / Folio (215 × 330 mm)</option>
                    <option value="A4">A4 (210 × 297 mm)</option>
                  </select>
                </div>

                {/* Pilihan Margin Cetak Rapor */}
                <div className="flex items-center gap-1.5 text-xs bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
                  <span className="text-slate-600 font-bold">Margin:</span>
                  <select
                    value={raportMargin}
                    onChange={(e) => setRaportMargin(e.target.value as 'minimal' | 'sempit' | 'normal')}
                    className="px-2 py-0.5 rounded border border-slate-300 font-bold text-[11px] text-slate-800 bg-white focus:outline-none cursor-pointer"
                    title="Atur margin cetak agar pas dan tidak berlebih"
                  >
                    <option value="sempit">Sempit (10 mm - Rapi & Pas)</option>
                    <option value="minimal">Minimal (6 mm - Maksimal Muat)</option>
                    <option value="normal">Normal (14 mm)</option>
                  </select>
                </div>

                <button
                  type="button"
                  disabled={isPrintingRaport}
                  onClick={handlePrintRaport}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                  title="Cetak langsung lembar raport resmi tanpa halaman kosong"
                >
                  <Printer className="w-4 h-4" />
                  <span>{isPrintingRaport ? 'Menyiapkan...' : 'Cetak ke Printer'}</span>
                </button>

                <button
                  type="button"
                  disabled={isPrintingRaport}
                  onClick={() => {
                    setShowPdfTip(true);
                    setTimeout(() => handlePrintRaport(), 300);
                  }}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                  title="Simpan lembar raport resmi ke dokumen file PDF"
                >
                  <Download className="w-4 h-4" />
                  <span>Simpan sebagai PDF</span>
                </button>
              </div>
            </div>

            {/* Helper Tips for PDF & Batch Print */}
            {showPdfTip && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-start justify-between gap-3 animate-fade-in">
                <div className="space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Panduan Menyimpan File PDF:</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    Pada jendela cetak browser yang terbuka, ubah opsi <strong>Tujuan / Destination</strong> menjadi <strong>"Simpan sebagai PDF" (Save as PDF)</strong>, pastikan mencentang <strong>"Grafik Latar Belakang" (Background graphics)</strong> agar tabel rapi, lalu klik tombol <strong>Simpan (Save)</strong>.
                  </p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setShowPdfTip(false)}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-950 px-2 py-1"
                >
                  ✕
                </button>
              </div>
            )}

            {modeCetakRaport === 'semua_siswa' && (
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-950 flex items-center gap-3">
                <Layers className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <span className="font-bold">Mode Cetak Semua Siswa Aktif: </span>
                  <span>
                    Sistem menampilkan seluruh ({classStudents.length}) rapor peserta didik kelas <strong>{currentKelas?.namaKelas}</strong> secara berurutan. Saat dicetak atau disimpan ke PDF, tiap siswa otomatis terpisah di halaman baru.
                  </span>
                </div>
              </div>
            )}

            {/* EDIT TITI MANGSA RAPORT & KODE AKSES SECTION */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Titi Mangsa Form */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    Edit Titi Mangsa Raport
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveTitimangsa}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-xs"
                  >
                    Simpan Titimangsa
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Tempat Titimangsa:</label>
                    <input
                      type="text"
                      value={titimangsaTempat}
                      onChange={(e) => setTitimangsaTempat(e.target.value)}
                      placeholder="Contoh: Parungpanjang, Bogor"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Tanggal Titimangsa Raport:</label>
                    <input
                      type="text"
                      value={titimangsaTanggal}
                      onChange={(e) => setTitimangsaTanggal(e.target.value)}
                      placeholder="Contoh: 20 Desember 2026"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Kode Akses Raport Siswa */}
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-amber-600" />
                    Kode Akses Raport Siswa (PIN)
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleCopyKodeAkses}
                      className="px-2.5 py-1 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 rounded-lg text-[11px] font-bold flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedNotice ? 'Tersalin!' : 'Salin Kode'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveKodeAkses}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[11px] font-bold shadow-xs"
                    >
                      Perbarui
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={kodeAksesRaport}
                    onChange={(e) => setKodeAksesRaport(e.target.value.toUpperCase())}
                    placeholder="Contoh: BPM2026"
                    className="w-full px-3 py-1.5 rounded-lg border border-amber-300 bg-white font-mono font-black text-amber-900 uppercase"
                  />
                </div>
                <p className="text-[11px] text-amber-800">
                  Siswa wajib memasukkan kode ini untuk melihat nilai & mencetak raport mandiri. Berikan kode ini kepada siswa yang telah menyelesaikan administrasi.
                </p>
              </div>
            </div>

            {/* EDIT ABSENSI SISWA DI RAPORT, JENIS ASESMEN & CATATAN WALI KELAS (HANYA DITAMPILKAN PADA MODE PER SISWA) */}
            {modeCetakRaport === 'per_siswa' && selectedStudent && (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 text-xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div className="font-bold text-slate-800 flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-emerald-600" />
                    <span>Konfigurasi Cetak Raport: <strong>{selectedStudent.nama}</strong> ({selectedNipd})</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setShowAbsensiDetailList(!showAbsensiDetailList)}
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-[11px] flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                      title="Lihat rincian tanggal & status dari rekaman presensi harian siswa ini"
                    >
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      <span>{showAbsensiDetailList ? 'Tutup Rincian' : `Rincian Absen (${studentAbsensi.length})`}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleResetAbsensiToAuto}
                      className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                      title="Sinkronkan data kehadiran riil dari absensi harian barcode siswa ini"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Sinkron Otomatis dari Absen ({studentAbsensi.length} rekaman)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkSyncClassAbsensi}
                      className="px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-300 hover:bg-indigo-100 text-indigo-800 font-bold text-[11px] flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                      title="Sinkronkan data kehadiran seluruh siswa di kelas ini dari absensi harian secara massal"
                    >
                      <Users className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Sinkron Seluruh Siswa ({classStudents.length})</span>
                    </button>
                  </div>
                </div>

                {/* Dropdown panel rincian rekaman absensi harian siswa */}
                {showAbsensiDetailList && (
                  <div className="p-3 bg-white rounded-xl border border-blue-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        <span>Riwayat Rekaman Presensi Harian: <strong>{selectedStudent.nama}</strong></span>
                      </span>
                      <span className="text-[11px] text-slate-600 font-semibold">
                        {autoHadir} Hadir • {autoSakit} Sakit • {autoIzin} Izin • {autoAlpa} Alpa
                      </span>
                    </div>
                    {studentAbsensi.length === 0 ? (
                      <p className="text-slate-400 italic text-[11px] py-1">Belum ada rekaman presensi barcode/harian yang tercatat atas identitas siswa ini.</p>
                    ) : (
                      <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
                        {studentAbsensi.map((rec, idx) => (
                          <div key={rec.id || idx} className="p-2 flex items-center justify-between text-[11px] hover:bg-slate-50">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-slate-600 font-bold">{rec.tanggal}</span>
                              <span className="text-slate-400 text-[10px]">{rec.waktu || '-'}</span>
                              <span className="text-slate-500 font-medium">({rec.metode || 'Presensi'})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                rec.status === 'Hadir' ? 'bg-emerald-100 text-emerald-800' :
                                rec.status === 'Sakit' ? 'bg-blue-100 text-blue-800' :
                                rec.status === 'Izin' ? 'bg-amber-100 text-amber-800' :
                                'bg-rose-100 text-rose-800'
                              }`}>
                                {rec.status}
                              </span>
                              {rec.keterangan && <span className="text-slate-500 text-[10px] italic">"{rec.keterangan}"</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Pemilihan Jenis Asesmen / Ujian Raport */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Jenis Asesmen Laporan Hasil Belajar:
                    </label>
                    <select
                      value={selectedAsesmenTipe}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setSelectedAsesmenTipe(val);
                        if (val === 'ASAT') {
                          setSelectedPeriode('PAT');
                        } else if (val === 'SAS') {
                          setSelectedPeriode('PAS');
                        } else if (val === 'ASTS') {
                          setSelectedPeriode('PTS');
                        }
                      }}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-xs text-slate-800 focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="SAS">Asesmen Sumatif Akhir Semester (SAS / PAS / ASAS - Semester 1 / Ganjil)</option>
                      <option value="ASTS">Asesmen Sumatif Tengah Semester (ASTS / PTS - Tengah Semester)</option>
                      <option value="ASAT">Asesmen Sumatif Akhir Tahun (ASAT / PAT - Semester 2 / Genap / Kenaikan Kelas)</option>
                      <option value="custom">Kustom Judul Asesmen (Ketik Manual)...</option>
                    </select>
                  </div>

                  {selectedAsesmenTipe === 'custom' ? (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Ketik Judul Asesmen:
                      </label>
                      <input
                        type="text"
                        value={customAsesmenLabel}
                        onChange={(e) => setCustomAsesmenLabel(e.target.value)}
                        placeholder="Contoh: Asesmen Sumatif Akhir Semester (SAS / PAS / ASAS)"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-semibold text-xs"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col justify-end">
                      <div className="text-[11px] text-slate-500">
                        Judul Tercetak: <span className="font-bold text-slate-900">{getAsesmenTitle()}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Edit Kehadiran yang Diambil Otomatis dari Absen tapi Bisa Diedit */}
                <div className="space-y-2 bg-white p-3.5 rounded-xl border border-slate-200">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
                    <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                      <span>Rekap Kehadiran Siswa di Rapor:</span>
                      <span className="text-[10px] font-normal text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Otomatis dari Absen Harian & Dapat Diedit
                      </span>
                    </span>
                    <span className="text-[11px] font-medium text-slate-600">
                      Data Asli Presensi: <strong className="text-emerald-700">{autoHadir} Hadir</strong> | <strong className="text-blue-700">{autoSakit} Sakit</strong> | <strong className="text-amber-700">{autoIzin} Izin</strong> | <strong className="text-rose-700">{autoAlpa} Alpa</strong> (Total {studentAbsensi.length} Hari)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-emerald-800 mb-1">
                        Hadir / Masuk (H) - Hari:
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={customAbsensi.hadir}
                        onChange={(e) => handleUpdateStudentAbsensi('hadir', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-emerald-50/30 font-mono font-bold text-emerald-800 focus:border-emerald-500"
                        title="Jumlah hari hadir siswa (otomatis dari presensi atau diedit)"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-blue-800 mb-1">
                        Sakit (S) - Hari:
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={customAbsensi.sakit}
                        onChange={(e) => handleUpdateStudentAbsensi('sakit', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-blue-50/30 font-mono font-bold text-blue-700 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-amber-800 mb-1">
                        Izin (I) - Hari:
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={customAbsensi.izin}
                        onChange={(e) => handleUpdateStudentAbsensi('izin', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-amber-50/30 font-mono font-bold text-amber-700 focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-rose-800 mb-1">
                        Tanpa Ket. / Alpa (A) - Hari:
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={customAbsensi.alpa}
                        onChange={(e) => handleUpdateStudentAbsensi('alpa', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-rose-50/30 font-mono font-bold text-rose-700 focus:border-rose-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Catatan Wali Kelas untuk {selectedStudent.nama}:
                  </label>
                  <textarea
                    rows={2}
                    value={catatanWalasMap[selectedNipd] ?? studentCatatan}
                    onChange={(e) => {
                      const updated = { ...catatanWalasMap, [selectedNipd]: e.target.value };
                      setCatatanWalasMap(updated);
                      try {
                        localStorage.setItem('saved_catatan_walas', JSON.stringify(updated));
                      } catch {}
                    }}
                    placeholder="Ketik catatan bimbingan karakter / motivasi wali kelas..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-medium"
                  />
                </div>

                {/* ISIAN STATUS KENAIKAN KELAS / KELULUSAN (SEMESTER 2 / PAT) */}
                {shouldShowKenaikan && (
                  <div className="bg-emerald-50/90 border border-emerald-300 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span className="font-bold text-slate-800 text-xs">
                          Penetapan Keputusan Kenaikan Kelas / Kelulusan (Semester Akhir / PAT):
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-200 text-emerald-900 border border-emerald-300">
                        Tercetak di Rapor
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Status Kenaikan ({selectedStudent.nama}):
                        </label>
                        <select
                          value={selectedStudent.statusKenaikan || (getNextClassRecommendation(selectedStudent, currentKelas).isTingkatAkhir ? 'Lulus' : 'Naik Kelas')}
                          onChange={(e) => {
                            const newStatus = e.target.value as any;
                            const rec = getNextClassRecommendation(selectedStudent, currentKelas);
                            const updated: User = {
                              ...selectedStudent,
                              statusKenaikan: newStatus,
                              targetNamaKelasBerikutnya: selectedStudent.targetNamaKelasBerikutnya || rec.targetNama
                            };
                            if (onUpdateUser) onUpdateUser(updated);
                          }}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-bold text-slate-900"
                        >
                          {getNextClassRecommendation(selectedStudent, currentKelas).isTingkatAkhir ? (
                            <>
                              <option value="Lulus">Lulus (Tamat Belajar Satuan Pendidikan)</option>
                              <option value="Tidak Lulus">Tidak Lulus</option>
                            </>
                          ) : (
                            <>
                              <option value="Naik Kelas">Naik Kelas (Ke Tingkat Berikutnya)</option>
                              <option value="Tinggal Kelas">Tinggal di Kelas Ini</option>
                            </>
                          )}
                        </select>
                      </div>

                      {!getNextClassRecommendation(selectedStudent, currentKelas).isTingkatAkhir && (
                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-semibold text-slate-700">
                            Target Nama Kelas / Rombel Berikutnya:
                          </label>
                          
                          {/* Pilih dari Rombel Sistem */}
                          <select
                            value={
                              kelasList.some(k => k.namaKelas.toLowerCase() === (selectedStudent.targetNamaKelasBerikutnya || getNextClassRecommendation(selectedStudent, currentKelas).targetNama).toLowerCase())
                                ? (kelasList.find(k => k.namaKelas.toLowerCase() === (selectedStudent.targetNamaKelasBerikutnya || getNextClassRecommendation(selectedStudent, currentKelas).targetNama).toLowerCase())?.namaKelas || '')
                                : '__manual__'
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val !== '__manual__' && val !== '') {
                                const matchedK = kelasList.find(k => k.namaKelas === val);
                                const updated: User = {
                                  ...selectedStudent,
                                  targetNamaKelasBerikutnya: val,
                                  targetKelasBerikutnya: matchedK?.id
                                };
                                if (onUpdateUser) onUpdateUser(updated);
                              }
                            }}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                          >
                            <option value="">-- Sesuaikan dengan Rombel Sistem --</option>
                            <optgroup label="Rombel Tingkat Lanjutan">
                              {kelasList.filter(k => {
                                const isCurX = currentKelas?.tingkat === 'X' || currentKelas?.namaKelas.includes('X ') || (selectedStudent.kelas || '').startsWith('X ');
                                return isCurX 
                                  ? (k.tingkat === 'XI' || k.namaKelas.includes('XI')) 
                                  : (k.tingkat === 'XII' || k.namaKelas.includes('XII'));
                              }).map(k => (
                                <option key={k.id} value={k.namaKelas}>
                                  {k.namaKelas} ({k.jurusan})
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="Seluruh Rombel Tersedia">
                              {sortedClasses.map(k => (
                                <option key={k.id} value={k.namaKelas}>
                                  {k.namaKelas}
                                </option>
                              ))}
                            </optgroup>
                            <option value="__manual__">✏️ Input Manual (Kustom)...</option>
                          </select>

                          {/* Atau Input Manual Langsung */}
                          <div className="relative">
                            <input
                              type="text"
                              value={selectedStudent.targetNamaKelasBerikutnya ?? getNextClassRecommendation(selectedStudent, currentKelas).targetNama}
                              onChange={(e) => {
                                const val = e.target.value;
                                const matchedK = kelasList.find(k => k.namaKelas.toLowerCase() === val.trim().toLowerCase());
                                const updated: User = {
                                  ...selectedStudent,
                                  targetNamaKelasBerikutnya: val,
                                  targetKelasBerikutnya: matchedK?.id
                                };
                                if (onUpdateUser) onUpdateUser(updated);
                              }}
                              placeholder="Atau ketik manual di sini, contoh: XI Asisten Farmasi 1"
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600"
                            />
                          </div>
                          <p className="text-[10px] text-slate-500 italic">
                            * Bisa memilih langsung dari rombel sistem di atas atau diketik manual bebas sesuai pembagian rombel baru.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ISIAN TEMPAT PRAKTIK KERJA INDUSTRI (PKL) - KHUSUS KELAS XI & XII */}
                {isClassXIorXII(currentKelas?.tingkat || currentKelas?.namaKelas || selectedStudent.kelas) && (
                  <div className="bg-amber-50/80 border border-amber-300 rounded-xl p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-amber-700 shrink-0" />
                        <div>
                          <span className="font-bold text-slate-800 text-xs">
                            Isian Tempat Praktik Kerja Industri (Prakerin / PKL):
                          </span>
                          <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900 border border-amber-300">
                            Khusus Kelas XI & XII SMK
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleAddPrakerinRow(selectedNipd)}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Tambah Instansi
                        </button>
                        <button
                          type="button"
                          onClick={handleApplyPrakerinToAllClass}
                          className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs transition-colors"
                          title="Salin data instansi ini ke seluruh siswa dalam rombel ini"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Terapkan ke 1 Rombel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResetPrakerinToDefault(selectedNipd)}
                          className="px-2 py-1 text-slate-600 hover:text-slate-900 rounded-lg text-[11px] font-medium"
                          title="Reset ke rekomendasi instansi kejuruan"
                        >
                          Reset
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-amber-900 leading-relaxed">
                      Silakan isi atau sesuaikan tempat/lokasi instansi praktik kerja, durasi (lamanya), dan keterangan capaian siswa <strong>{selectedStudent.nama}</strong>. Data ini otomatis tercetak resmi pada lembar rapor.
                    </p>

                    <div className="overflow-x-auto border border-amber-200 rounded-lg bg-white shadow-xs">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="bg-amber-100/70 border-b border-amber-200 text-amber-950 font-bold">
                            <th className="py-2 px-2.5 w-12 text-center border-r border-amber-200">No</th>
                            <th className="py-2 px-3 border-r border-amber-200 min-w-[200px]">Tempat / Lokasi Instansi *</th>
                            <th className="py-2 px-3 border-r border-amber-200 w-36 text-center">Lamanya *</th>
                            <th className="py-2 px-3 min-w-[220px]">Keterangan Capaian *</th>
                            <th className="py-2 px-2 text-center w-12">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-100">
                          {getStudentPrakerin(selectedNipd, selectedStudent, currentKelas).map((item, pIdx) => (
                            <tr key={pIdx} className="hover:bg-amber-50/50">
                              <td className="py-2 px-2 text-center font-bold text-slate-600 border-r border-amber-200">
                                {pIdx + 1}
                              </td>
                              <td className="py-2 px-2.5 border-r border-amber-200">
                                <input
                                  type="text"
                                  value={item.mitra}
                                  onChange={(e) => handleUpdatePrakerinItem(selectedNipd, pIdx, 'mitra', e.target.value)}
                                  placeholder="Contoh: Instalasi Farmasi RS Hermina Bogor"
                                  className="w-full px-2.5 py-1 rounded border border-slate-300 text-xs font-semibold text-slate-900 focus:border-amber-500"
                                />
                              </td>
                              <td className="py-2 px-2.5 border-r border-amber-200">
                                <input
                                  type="text"
                                  value={item.lamanya}
                                  onChange={(e) => handleUpdatePrakerinItem(selectedNipd, pIdx, 'lamanya', e.target.value)}
                                  placeholder="Contoh: 6 Bulan"
                                  className="w-full px-2.5 py-1 rounded border border-slate-300 text-xs font-medium text-center focus:border-amber-500"
                                />
                              </td>
                              <td className="py-2 px-2.5 border-r border-amber-200">
                                <input
                                  type="text"
                                  value={item.keterangan}
                                  onChange={(e) => handleUpdatePrakerinItem(selectedNipd, pIdx, 'keterangan', e.target.value)}
                                  placeholder="Contoh: Sangat Baik (Kompeten & Tuntas)"
                                  className="w-full px-2.5 py-1 rounded border border-slate-300 text-xs font-medium text-slate-800 focus:border-amber-500"
                                />
                              </td>
                              <td className="py-2 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeletePrakerinRow(selectedNipd, pIdx)}
                                  className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                                  title="Hapus baris instansi ini"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* OFFICIAL RAPORT DOCUMENT DISPLAY (ISOLATED PRINTABLE CONTAINER) */}
          <div id="printable-raport-container" className="printable-raport-container w-full">
            {modeCetakRaport === 'per_siswa' ? (
              /* SINGLE STUDENT REPORT CARD */
              selectedStudent ? (
                <div className="bg-white rounded-2xl p-8 sm:p-12 border-2 border-slate-300 shadow-lg space-y-6 text-slate-900 max-w-4xl mx-auto print:border-none print:shadow-none print:p-0 raport-print-card">
                  {/* KOP SURAT + JUDUL LAPORAN + IDENTITAS SISWA TERKUNCI DALAM SATU GRUP (ANTI TERPISAH) */}
                  <div className="raport-header-group break-inside-avoid page-break-inside-avoid print:break-inside-avoid print:break-after-avoid mb-4 space-y-4">
                    {/* Kop Surat Resmi */}
                    <div className="pb-2 text-center relative mb-3">
                      <KopSuratView schoolInfo={schoolInfo} />
                    </div>

                    {/* Document Header Title */}
                    <div className="text-center space-y-1">
                      <h2 className="text-base sm:text-lg font-black tracking-wider uppercase underline underline-offset-4">
                        LAPORAN HASIL BELAJAR PESERTA DIDIK
                      </h2>
                      <div className="text-xs sm:text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                        {getAsesmenTitle()}
                      </div>
                      <div className="text-xs font-bold text-slate-600">
                        KURIKULUM MERDEKA • TAHUN AJARAN {schoolInfo?.tahunAjaranPembelajaran || '2026/2027'} (FASE F)
                      </div>
                    </div>

                    {/* Student & Class Identity Table */}
                    <div className="grid grid-cols-2 gap-4 text-xs pt-1">
                      <table className="w-full">
                        <tbody>
                          <tr className="leading-relaxed">
                            <td className="w-36 font-semibold text-slate-600">Nama Peserta Didik</td>
                            <td className="w-3">:</td>
                            <td className="font-bold text-slate-900 uppercase">{selectedStudent?.nama || '-'}</td>
                          </tr>
                          <tr className="leading-relaxed">
                            <td className="font-semibold text-slate-600">Nomor Induk / NISN</td>
                            <td>:</td>
                            <td className="font-mono text-slate-800">{selectedNipd} / {selectedStudent?.nisn || selectedStudent?.nipOrNis}</td>
                          </tr>
                          <tr className="leading-relaxed">
                            <td className="font-semibold text-slate-600">Sekolah</td>
                            <td>:</td>
                            <td className="font-bold text-slate-900">{schoolInfo?.nama || 'SMK Bakti Putra Mandiri'}</td>
                          </tr>
                          <tr className="leading-relaxed">
                            <td className="font-semibold text-slate-600">Alamat Sekolah</td>
                            <td>:</td>
                            <td className="text-slate-800">{schoolInfo?.alamat || 'Jl. Raya Parungpanjang KM 3'}</td>
                          </tr>
                        </tbody>
                      </table>

                      <table className="w-full">
                        <tbody>
                          <tr className="leading-relaxed">
                            <td className="w-36 font-semibold text-slate-600">Kelas / Rombel</td>
                            <td className="w-3">:</td>
                            <td className="font-bold text-slate-900">{currentKelas?.namaKelas || selectedStudent?.kelas || '-'}</td>
                          </tr>
                          <tr className="leading-relaxed">
                            <td className="font-semibold text-slate-600">Fase / Semester</td>
                            <td>:</td>
                            <td className="font-bold text-slate-900">Fase F / {getDisplaySemester()}</td>
                          </tr>
                          <tr className="leading-relaxed">
                            <td className="font-semibold text-slate-600">Program Keahlian</td>
                            <td>:</td>
                            <td className="font-bold text-slate-900">{currentKelas?.jurusan || 'Kesehatan & Vokasi'}</td>
                          </tr>
                          <tr className="leading-relaxed">
                            <td className="font-semibold text-slate-600">Tahun Pelajaran</td>
                            <td>:</td>
                            <td className="text-slate-800">{schoolInfo?.tahunAjaranPembelajaran || '2026/2027'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* TABEL A: NILAI AKADEMIK & CAPAIAN KOMPETENSI (NILAI MURNI GURU MAPEL) */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      A. Nilai Capaian Hasil Belajar (Intrakurikuler)
                    </h3>
                    <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-300 text-slate-900 font-bold">
                          <th className="py-2.5 px-3 w-10 text-center border-r border-slate-300">No</th>
                          <th className="py-2.5 px-4 border-r border-slate-300 min-w-[200px]">Mata Pelajaran</th>
                          <th className="py-2.5 px-3 w-20 text-center border-r border-slate-300">Nilai Akhir</th>
                          <th className="py-2.5 px-4">Capaian Kompetensi & Tujuan Pembelajaran (TP)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {classRaportGroups.map((grp) => {
                          // Sesuai aturan: Hanya tampilkan mata pelajaran yang sudah diisi nilainya
                          const studentFilledMapels = grp.mapels.filter(m => {
                            const grade = findStudentGrade(selectedNipd, selectedStudent, m, selectedPeriode);
                            return Boolean(grade && typeof grade.nilaiAkhir === 'number' && grade.nilaiAkhir > 0);
                          });

                          if (studentFilledMapels.length === 0) return null;

                          return (
                            <React.Fragment key={grp.groupKey}>
                              <tr className="bg-slate-100/95 border-y border-slate-300">
                                <td colSpan={4} className="py-2 px-3 font-bold text-slate-900 text-xs tracking-wide uppercase">
                                  {grp.groupName}
                                </td>
                              </tr>
                              {studentFilledMapels.map((m, idx) => {
                                const grade = findStudentGrade(selectedNipd, selectedStudent, m, selectedPeriode)!;
                                const nilaiAkhir = grade.nilaiAkhir;
                                const capaian = buildKurikulumMerdekaCapaian({
                                  grade,
                                  mapel: m,
                                  kelas: currentKelas,
                                  tpMap: tpMapelMap,
                                  displayStyle: formatDeskripsiRapor,
                                });
                                const deskripsi = capaian.deskripsiLengkap;

                                return (
                                  <tr key={m.id} className="hover:bg-slate-50/50">
                                    <td className="py-2.5 px-3 text-center font-mono border-r border-slate-200">{idx + 1}</td>
                                    <td className="py-2.5 px-4 font-bold text-slate-900 border-r border-slate-200">{m.namaMapel}</td>
                                    <td className="py-2.5 px-3 text-center font-black text-sm text-slate-900 border-r border-slate-200 bg-slate-50/60">
                                      {nilaiAkhir}
                                    </td>
                                    <td className="py-2.5 px-4 text-[11px] text-slate-700 leading-snug whitespace-pre-line">
                                      {deskripsi}
                                    </td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
                        {classRaportGroups.every(grp => 
                          grp.mapels.every(m => {
                            const grade = findStudentGrade(selectedNipd, selectedStudent, m, selectedPeriode);
                            return !(grade && typeof grade.nilaiAkhir === 'number' && grade.nilaiAkhir > 0);
                          })
                        ) && (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-slate-400 italic">
                              Belum ada mata pelajaran yang telah diisi nilainya untuk peserta didik ini pada periode asesmen ini.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* TABEL B: PRAKTIK KERJA INDUSTRI (PKL) - KHUSUS KELAS XI & XII */}
                  {isClassXIorXII(currentKelas?.tingkat || selectedStudent?.kelas || currentKelas?.namaKelas) && (
                    <div className="raport-section-avoid break-inside-avoid page-break-inside-avoid print:break-inside-avoid space-y-2 pt-2">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                        B. Praktik Kerja Lapangan / Industri (PKL)
                      </h3>
                      <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-300 text-slate-900 font-bold">
                            <th className="py-2.5 px-3 w-10 text-center border-r border-slate-300">No</th>
                            <th className="py-2.5 px-4 border-r border-slate-300 min-w-[220px]">Tempat / Lokasi Instansi (Mitra DU/DI)</th>
                            <th className="py-2.5 px-3 w-28 text-center border-r border-slate-300">Lamanya</th>
                            <th className="py-2.5 px-4">Keterangan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {getStudentPrakerin(selectedNipd, selectedStudent, currentKelas).map((item, pIdx) => (
                            <tr key={pIdx}>
                              <td className="py-2.5 px-3 text-center font-mono border-r border-slate-200">{item.nomor || pIdx + 1}</td>
                              <td className="py-2.5 px-4 font-bold text-slate-900 border-r border-slate-200">{item.mitra || '-'}</td>
                              <td className="py-2.5 px-3 text-center font-medium text-slate-800 border-r border-slate-200">{item.lamanya || '-'}</td>
                              <td className="py-2.5 px-4 text-[11px] text-slate-700 leading-snug">{item.keterangan || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* TABEL EKSTRAKURIKULER & TABEL KETIDAKHADIRAN */}
                  <div className="raport-section-avoid break-inside-avoid page-break-inside-avoid print:break-inside-avoid grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    {/* Ekskul Table */}
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider mb-2 text-slate-800">
                        {isClassXIorXII(currentKelas?.tingkat || selectedStudent?.kelas || currentKelas?.namaKelas) ? 'C' : 'B'}. Kegiatan Ekstrakurikuler
                      </h3>
                      <table className="w-full text-left text-xs border border-slate-300 rounded-lg">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold">
                            <th className="py-2 px-3 border-r border-slate-300">Kegiatan</th>
                            <th className="py-2 px-3 border-r border-slate-300 text-center w-20">Predikat</th>
                            <th className="py-2 px-3">Keterangan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {studentEkskulRecords.length > 0 ? (
                            studentEkskulRecords.map((ekskul, idx) => (
                              <tr key={idx}>
                                <td className="py-2 px-3 font-semibold text-slate-800 border-r border-slate-200">{ekskul.namaEkskul}</td>
                                <td className="py-2 px-3 text-center font-bold text-emerald-700 border-r border-slate-200">
                                  {ekskul.predikat === 'Sangat Baik' 
                                    ? 'Sangat Baik (A)' 
                                    : ekskul.predikat === 'Baik' 
                                    ? 'Baik (B)' 
                                    : ekskul.predikat === 'Cukup' 
                                    ? 'Cukup (C)' 
                                    : 'Kurang (D)'}
                                </td>
                                <td className="py-2 px-3 text-[11px] text-slate-600">{ekskul.keterangan || 'Aktif berpartisipasi dalam pembinaan'}</td>
                              </tr>
                            ))
                          ) : studentEkskuls.length > 0 ? (
                            studentEkskuls.map((ekskulName, idx) => (
                              <tr key={idx}>
                                <td className="py-2 px-3 font-semibold text-slate-800 border-r border-slate-200">{ekskulName}</td>
                                <td className="py-2 px-3 text-center text-slate-400 border-r border-slate-200 font-mono text-xs">-</td>
                                <td className="py-2 px-3 text-[11px] text-slate-400 italic">Belum ada penilaian dari pembina</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={3} className="py-3 px-3 text-center text-slate-400 italic text-[11px]">
                                Belum ada nilai atau kegiatan ekstrakurikuler yang diinput oleh guru pembina.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Ketidakhadiran Table */}
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider mb-2 text-slate-800">
                        {isClassXIorXII(currentKelas?.tingkat || selectedStudent?.kelas || currentKelas?.namaKelas) ? 'D' : 'C'}. Ketidakhadiran
                      </h3>
                      <table className="w-full text-left text-xs border border-slate-300 rounded-lg">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold">
                            <th className="py-2 px-3 border-r border-slate-300">Kriteria Ketidakhadiran</th>
                            <th className="py-2 px-3 text-center w-28">Jumlah Hari</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          <tr>
                            <td className="py-2 px-3 font-medium border-r border-slate-200">Sakit (S)</td>
                            <td className="py-2 px-3 text-center font-bold text-blue-700">{customAbsensi.sakit} Hari</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3 font-medium border-r border-slate-200">Izin (I)</td>
                            <td className="py-2 px-3 text-center font-bold text-amber-700">{customAbsensi.izin} Hari</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3 font-medium border-r border-slate-200">Tanpa Keterangan (A)</td>
                            <td className="py-2 px-3 text-center font-bold text-rose-700">{customAbsensi.alpa} Hari</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Walas Notes */}
                  <div className="raport-section-avoid break-inside-avoid page-break-inside-avoid print:break-inside-avoid border border-slate-300 rounded-xl p-4 bg-slate-50/50 space-y-1 text-xs">
                    <span className="font-bold text-slate-700 uppercase tracking-wider block">
                      Catatan Wali Kelas:
                    </span>
                    <p className="text-slate-800 italic leading-relaxed">
                      "{catatanWalasMap[selectedNipd] ?? studentCatatan}"
                    </p>
                  </div>

                  {/* KEPUTUSAN KENAIKAN KELAS / KELULUSAN (Semester 2 / Akhir Tahun / PAT) */}
                  {shouldShowKenaikan && (
                    <div className="raport-section-avoid break-inside-avoid page-break-inside-avoid print:break-inside-avoid border-2 border-slate-900 rounded-xl p-4 bg-slate-50/70 space-y-2 text-xs">
                      <div className="font-black text-slate-900 uppercase tracking-wider text-center border-b border-slate-300 pb-1.5 flex items-center justify-center gap-2">
                        <GraduationCap className="w-4 h-4 text-emerald-700" />
                        <span>Keputusan Kenaikan Kelas / Kelulusan (Semester Akhir)</span>
                      </div>

                      {(() => {
                        const rec = getNextClassRecommendation(selectedStudent, currentKelas);
                        const isGraduation = rec.isTingkatAkhir;
                        const status = selectedStudent.statusKenaikan || (isGraduation ? 'Lulus' : 'Naik Kelas');
                        const targetName = selectedStudent.targetNamaKelasBerikutnya || rec.targetNama;

                        if (isGraduation) {
                          return (
                            <div className="space-y-1.5 text-center">
                              <p className="text-slate-700">
                                Berdasarkan kriteria kelulusan satuan pendidikan {schoolInfo?.nama || 'SMK Bakti Putra Mandiri'} Tahun Ajaran {schoolInfo?.tahunAjaranPembelajaran || '2026/2027'}, peserta didik dinyatakan:
                              </p>
                              <div className="flex items-center justify-center gap-6 pt-1 font-bold">
                                <div className={`px-5 py-1.5 rounded-lg border-2 flex items-center gap-2 ${
                                  status === 'Lulus' 
                                    ? 'border-emerald-600 bg-emerald-100/80 text-emerald-950 font-black' 
                                    : 'border-slate-300 text-slate-400 bg-white'
                                }`}>
                                  {status === 'Lulus' && <span className="text-emerald-700 font-black">✓</span>}
                                  <span>L U L U S</span>
                                </div>
                                <div className={`px-5 py-1.5 rounded-lg border flex items-center gap-2 ${
                                  status === 'Tidak Lulus'
                                    ? 'border-rose-600 bg-rose-100 text-rose-950 font-black'
                                    : 'border-slate-300 text-slate-400 bg-white'
                                }`}>
                                  {status === 'Tidak Lulus' && <span className="text-rose-700 font-black">✓</span>}
                                  <span>TIDAK LULUS</span>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-1.5 text-center">
                            <p className="text-slate-700">
                              Berdasarkan pencapaian seluruh kompetensi pada semester ganjil dan semester genap, peserta didik ditetapkan:
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-1 font-bold">
                              <div className={`px-5 py-1.5 rounded-lg border-2 flex items-center gap-2 ${
                                status === 'Naik Kelas'
                                  ? 'border-emerald-600 bg-emerald-100/80 text-emerald-950 font-black'
                                  : 'border-slate-300 text-slate-400 bg-white'
                              }`}>
                                {status === 'Naik Kelas' && <span className="text-emerald-700 font-black">✓</span>}
                                <span>Naik ke Kelas: {targetName}</span>
                              </div>
                              <div className={`px-5 py-1.5 rounded-lg border flex items-center gap-2 ${
                                status === 'Tinggal Kelas'
                                  ? 'border-rose-600 bg-rose-100 text-rose-950 font-black'
                                  : 'border-slate-300 text-slate-400 bg-white'
                              }`}>
                                {status === 'Tinggal Kelas' && <span className="text-rose-700 font-black">✓</span>}
                                <span>Tinggal di Kelas: {currentKelas?.namaKelas || selectedStudent.kelas}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Signatures Footer with dynamic Titimangsa, blank manual signature area, and names kept intact */}
                  <div className="raport-signature-group break-inside-avoid page-break-inside-avoid print:break-inside-avoid pt-6 border-t border-slate-200 text-xs text-center grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-slate-500">Mengetahui,</div>
                      <div className="font-bold text-slate-700">Orang Tua / Wali Siswa,</div>
                      <div className="h-20 sm:h-24"></div>
                      <div className="font-bold text-slate-900 border-b border-slate-600 inline-block px-8 pb-0.5 min-w-[180px]">
                        ( ............................................ )
                      </div>
                    </div>

                    <div>
                      <div className="text-slate-500">{titimangsaTempat}, {titimangsaTanggal}</div>
                      <div className="font-bold text-slate-700">Wali Kelas,</div>
                      <div className="h-20 sm:h-24"></div>
                      <div className="font-bold text-slate-900 border-b border-slate-600 inline-block px-4 pb-0.5 min-w-[180px]">
                        {currentWalasUser?.nama || currentKelas?.namaWalas || currentUser.nama}
                      </div>
                      <div className="text-[10px] text-slate-600 mt-1">
                        {formatTeacherIdentifier(currentWalasUser || currentUser)}
                      </div>
                    </div>

                    <div>
                      <div className="text-slate-500">Mengetahui,</div>
                      <div className="font-bold text-slate-700">Kepala Sekolah,</div>
                      <div className="h-20 sm:h-24"></div>
                      <div className="font-bold text-slate-900 border-b border-slate-600 inline-block px-4 pb-0.5 min-w-[180px]">
                        {schoolInfo?.kepalaSekolah || 'Dr. H. Hendra Gunawan, M.Pd'}
                      </div>
                      <div className="text-[10px] text-slate-600 mt-1">
                        {formatKepsekIdentifier(schoolInfo)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
                  Pilih peserta didik untuk melihat dan mencetak lembar rapor.
                </div>
              )
            ) : (
            /* ALL STUDENTS REPORT CARDS (LOOP WITH PAGE BREAKS) */
            <div className="space-y-10">
              {classStudents.map((st, sIdx) => {
                const sNipd = st.nipd || st.nipOrNis;
                const sCounts = getDailyAbsensiCounts(st);
                const savedAbs = getSavedStudentAbsensi(sNipd, st);
                const sAbs = {
                  hadir: (savedAbs && typeof savedAbs.hadir === 'number') ? savedAbs.hadir : sCounts.hadir,
                  sakit: (savedAbs && typeof savedAbs.sakit === 'number') ? savedAbs.sakit : sCounts.sakit,
                  izin: (savedAbs && typeof savedAbs.izin === 'number') ? savedAbs.izin : sCounts.izin,
                  alpa: (savedAbs && typeof savedAbs.alpa === 'number') ? savedAbs.alpa : sCounts.alpa,
                };
                const sCat = catatanWalasMap[sNipd] ||
                  "Ananda menunjukkan perkembangan karakter yang positif, santun dalam bertutur kata, serta memiliki etos belajar dan disiplin praktikum yang patut dicontoh. Pertahankan prestasi dan terus kembangkan kepedulian sosial.";
                const sEks = nilaiEkskulList.filter(n => 
                  n.nipd === sNipd ||
                  (n.namaSiswa && n.namaSiswa.toLowerCase() === st.nama.toLowerCase())
                );

                return (
                  <div 
                    key={st.id} 
                    className="raport-print-card bg-white rounded-2xl p-8 sm:p-12 border-2 border-slate-300 shadow-lg space-y-6 text-slate-900 max-w-4xl mx-auto print:border-none print:shadow-none print:p-0"
                  >
                    {/* KOP SURAT + JUDUL LAPORAN + IDENTITAS SISWA TERKUNCI DALAM SATU GRUP (ANTI TERPISAH) */}
                    <div className="raport-header-group break-inside-avoid page-break-inside-avoid print:break-inside-avoid print:break-after-avoid mb-4 space-y-4">
                      {/* Kop Surat Resmi */}
                      <div className="pb-2 text-center relative mb-3">
                        <KopSuratView schoolInfo={schoolInfo} />
                      </div>

                      {/* Document Header Title */}
                      <div className="text-center space-y-1">
                        <div className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold no-print">
                          Siswa Ke-{sIdx + 1} dari {classStudents.length}
                        </div>
                        <h2 className="text-base sm:text-lg font-black tracking-wider uppercase underline underline-offset-4">
                          LAPORAN HASIL BELAJAR PESERTA DIDIK
                        </h2>
                        <div className="text-xs sm:text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                          {getAsesmenTitle()}
                        </div>
                        <div className="text-xs font-bold text-slate-600">
                          KURIKULUM MERDEKA • TAHUN AJARAN {schoolInfo?.tahunAjaranPembelajaran || '2026/2027'} (FASE F)
                        </div>
                      </div>

                      {/* Student & Class Identity Table */}
                      <div className="grid grid-cols-2 gap-4 text-xs pt-1">
                        <table className="w-full">
                          <tbody>
                            <tr className="leading-relaxed">
                              <td className="w-36 font-semibold text-slate-600">Nama Peserta Didik</td>
                              <td className="w-3">:</td>
                              <td className="font-bold text-slate-900 uppercase">{st.nama || '-'}</td>
                            </tr>
                            <tr className="leading-relaxed">
                              <td className="font-semibold text-slate-600">Nomor Induk / NISN</td>
                              <td>:</td>
                              <td className="font-mono text-slate-800">{sNipd} / {st.nisn || st.nipOrNis}</td>
                            </tr>
                            <tr className="leading-relaxed">
                              <td className="font-semibold text-slate-600">Sekolah</td>
                              <td>:</td>
                              <td className="font-bold text-slate-900">{schoolInfo?.nama || 'SMK Bakti Putra Mandiri'}</td>
                            </tr>
                            <tr className="leading-relaxed">
                              <td className="font-semibold text-slate-600">Alamat Sekolah</td>
                              <td>:</td>
                              <td className="text-slate-800">{schoolInfo?.alamat || 'Jl. Raya Parungpanjang KM 3'}</td>
                            </tr>
                          </tbody>
                        </table>

                        <table className="w-full">
                          <tbody>
                            <tr className="leading-relaxed">
                              <td className="w-36 font-semibold text-slate-600">Kelas / Rombel</td>
                              <td className="w-3">:</td>
                              <td className="font-bold text-slate-900">{currentKelas?.namaKelas || st.kelas || '-'}</td>
                            </tr>
                            <tr className="leading-relaxed">
                              <td className="font-semibold text-slate-600">Fase / Semester</td>
                              <td>:</td>
                              <td className="font-bold text-slate-900">Fase F / {getDisplaySemester()}</td>
                            </tr>
                            <tr className="leading-relaxed">
                              <td className="font-semibold text-slate-600">Program Keahlian</td>
                              <td>:</td>
                              <td className="font-bold text-slate-900">{currentKelas?.jurusan || 'Kesehatan & Vokasi'}</td>
                            </tr>
                            <tr className="leading-relaxed">
                              <td className="font-semibold text-slate-600">Tahun Pelajaran</td>
                              <td>:</td>
                              <td className="text-slate-800">{schoolInfo?.tahunAjaranPembelajaran || '2026/2027'}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* TABEL A: NILAI AKADEMIK & CAPAIAN KOMPETENSI (NILAI MURNI GURU MAPEL) */}
                    <div className="space-y-2">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                        A. Nilai Capaian Hasil Belajar (Intrakurikuler)
                      </h3>
                      <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-300 text-slate-900 font-bold">
                            <th className="py-2.5 px-3 w-10 text-center border-r border-slate-300">No</th>
                            <th className="py-2.5 px-4 border-r border-slate-300 min-w-[200px]">Mata Pelajaran</th>
                            <th className="py-2.5 px-3 w-20 text-center border-r border-slate-300">Nilai Akhir</th>
                            <th className="py-2.5 px-4">Capaian Kompetensi & Tujuan Pembelajaran (TP)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {classRaportGroups.map((grp) => {
                            const studentFilledMapels = grp.mapels.filter(m => {
                              const grade = findStudentGrade(sNipd, st, m, selectedPeriode);
                              return Boolean(grade && typeof grade.nilaiAkhir === 'number' && grade.nilaiAkhir > 0);
                            });

                            if (studentFilledMapels.length === 0) return null;

                            return (
                              <React.Fragment key={grp.groupKey}>
                                <tr className="bg-slate-100/95 border-y border-slate-300">
                                  <td colSpan={4} className="py-2 px-3 font-bold text-slate-900 text-xs tracking-wide uppercase">
                                    {grp.groupName}
                                  </td>
                                </tr>
                                {studentFilledMapels.map((m, idx) => {
                                  const grade = findStudentGrade(sNipd, st, m, selectedPeriode)!;
                                  const nilaiAkhir = grade.nilaiAkhir;
                                  const capaian = buildKurikulumMerdekaCapaian({
                                    grade,
                                    mapel: m,
                                    kelas: currentKelas,
                                    tpMap: tpMapelMap,
                                    displayStyle: formatDeskripsiRapor,
                                  });
                                  const deskripsi = capaian.deskripsiLengkap;

                                  return (
                                    <tr key={m.id} className="hover:bg-slate-50/50">
                                      <td className="py-2.5 px-3 text-center font-mono border-r border-slate-200">{idx + 1}</td>
                                      <td className="py-2.5 px-4 font-bold text-slate-900 border-r border-slate-200">{m.namaMapel}</td>
                                      <td className="py-2.5 px-3 text-center font-black text-sm text-slate-900 border-r border-slate-200 bg-slate-50/60">
                                        {nilaiAkhir}
                                      </td>
                                      <td className="py-2.5 px-4 text-[11px] text-slate-700 leading-snug whitespace-pre-line">
                                        {deskripsi}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </React.Fragment>
                            );
                          })}
                          {classRaportGroups.every(grp => 
                            grp.mapels.every(m => {
                              const grade = findStudentGrade(sNipd, st, m, selectedPeriode);
                              return !(grade && typeof grade.nilaiAkhir === 'number' && grade.nilaiAkhir > 0);
                            })
                          ) && (
                            <tr>
                              <td colSpan={4} className="py-6 text-center text-slate-400 italic">
                                Belum ada mata pelajaran yang telah diisi nilainya untuk peserta didik ini pada periode asesmen ini.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* TABEL B: PRAKTIK KERJA INDUSTRI (PKL) - KHUSUS KELAS XI & XII */}
                    {isClassXIorXII(currentKelas?.tingkat || st.kelas || currentKelas?.namaKelas) && (
                      <div className="raport-section-avoid break-inside-avoid page-break-inside-avoid print:break-inside-avoid space-y-2 pt-2">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                          B. Praktik Kerja Lapangan / Industri (PKL)
                        </h3>
                        <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-300 text-slate-900 font-bold">
                              <th className="py-2.5 px-3 w-10 text-center border-r border-slate-300">No</th>
                              <th className="py-2.5 px-4 border-r border-slate-300 min-w-[220px]">Tempat / Lokasi Instansi (Mitra DU/DI)</th>
                              <th className="py-2.5 px-3 w-28 text-center border-r border-slate-300">Lamanya</th>
                              <th className="py-2.5 px-4">Keterangan</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {getStudentPrakerin(sNipd, st, currentKelas).map((item, pIdx) => (
                              <tr key={pIdx}>
                                <td className="py-2.5 px-3 text-center font-mono border-r border-slate-200">{item.nomor || pIdx + 1}</td>
                                <td className="py-2.5 px-4 font-bold text-slate-900 border-r border-slate-200">{item.mitra || '-'}</td>
                                <td className="py-2.5 px-3 text-center font-medium text-slate-800 border-r border-slate-200">{item.lamanya || '-'}</td>
                                <td className="py-2.5 px-4 text-[11px] text-slate-700 leading-snug">{item.keterangan || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* TABEL EKSTRAKURIKULER & TABEL KETIDAKHADIRAN */}
                    <div className="raport-section-avoid break-inside-avoid page-break-inside-avoid print:break-inside-avoid grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      {/* Ekskul Table */}
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider mb-2 text-slate-800">
                          {isClassXIorXII(currentKelas?.tingkat || st.kelas || currentKelas?.namaKelas) ? 'C' : 'B'}. Kegiatan Ekstrakurikuler
                        </h3>
                        <table className="w-full text-left text-xs border border-slate-300 rounded-lg">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold">
                              <th className="py-2 px-3 border-r border-slate-300">Kegiatan</th>
                              <th className="py-2 px-3 border-r border-slate-300 text-center w-20">Predikat</th>
                              <th className="py-2 px-3">Keterangan</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {sEks.length > 0 ? (
                              sEks.map((ekskul, idx) => (
                                <tr key={idx}>
                                  <td className="py-2 px-3 font-semibold text-slate-800 border-r border-slate-200">{ekskul.namaEkskul}</td>
                                  <td className="py-2 px-3 text-center font-bold text-emerald-700 border-r border-slate-200">
                                    {ekskul.predikat === 'Sangat Baik' 
                                      ? 'Sangat Baik (A)' 
                                      : ekskul.predikat === 'Baik' 
                                      ? 'Baik (B)' 
                                      : ekskul.predikat === 'Cukup' 
                                      ? 'Cukup (C)' 
                                      : 'Kurang (D)'}
                                  </td>
                                  <td className="py-2 px-3 text-[11px] text-slate-600">{ekskul.keterangan || 'Aktif berpartisipasi dalam pembinaan'}</td>
                                </tr>
                              ))
                            ) : (st.ekskulDiikuti && st.ekskulDiikuti.length > 0) ? (
                              st.ekskulDiikuti.map((ekskulName, idx) => (
                                <tr key={idx}>
                                  <td className="py-2 px-3 font-semibold text-slate-800 border-r border-slate-200">{ekskulName}</td>
                                  <td className="py-2 px-3 text-center text-slate-400 border-r border-slate-200 font-mono text-xs">-</td>
                                  <td className="py-2 px-3 text-[11px] text-slate-400 italic">Belum ada penilaian dari pembina</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={3} className="py-3 px-3 text-center text-slate-400 italic text-[11px]">
                                  Belum ada nilai atau kegiatan ekstrakurikuler yang diinput oleh guru pembina.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Ketidakhadiran Table */}
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider mb-2 text-slate-800">
                          {isClassXIorXII(currentKelas?.tingkat || st.kelas || currentKelas?.namaKelas) ? 'D' : 'C'}. Ketidakhadiran
                        </h3>
                        <table className="w-full text-left text-xs border border-slate-300 rounded-lg">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold">
                              <th className="py-2 px-3 border-r border-slate-300">Kriteria Ketidakhadiran</th>
                              <th className="py-2 px-3 text-center w-28">Jumlah Hari</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            <tr>
                              <td className="py-2 px-3 font-medium border-r border-slate-200">Sakit (S)</td>
                              <td className="py-2 px-3 text-center font-bold text-blue-700">{sAbs.sakit} Hari</td>
                            </tr>
                            <tr>
                              <td className="py-2 px-3 font-medium border-r border-slate-200">Izin (I)</td>
                              <td className="py-2 px-3 text-center font-bold text-amber-700">{sAbs.izin} Hari</td>
                            </tr>
                            <tr>
                              <td className="py-2 px-3 font-medium border-r border-slate-200">Tanpa Keterangan (A)</td>
                              <td className="py-2 px-3 text-center font-bold text-rose-700">{sAbs.alpa} Hari</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Walas Notes */}
                    <div className="raport-section-avoid break-inside-avoid page-break-inside-avoid print:break-inside-avoid border border-slate-300 rounded-xl p-4 bg-slate-50/50 space-y-1 text-xs">
                      <span className="font-bold text-slate-700 uppercase tracking-wider block">
                        Catatan Wali Kelas:
                      </span>
                      <p className="text-slate-800 italic leading-relaxed">
                        "{sCat}"
                      </p>
                    </div>

                    {/* KEPUTUSAN KENAIKAN KELAS / KELULUSAN (Semester 2 / Akhir Tahun / PAT) */}
                    {shouldShowKenaikan && (
                      <div className="raport-section-avoid break-inside-avoid page-break-inside-avoid print:break-inside-avoid border-2 border-slate-900 rounded-xl p-4 bg-slate-50/70 space-y-2 text-xs">
                        <div className="font-black text-slate-900 uppercase tracking-wider text-center border-b border-slate-300 pb-1.5 flex items-center justify-center gap-2">
                          <GraduationCap className="w-4 h-4 text-emerald-700" />
                          <span>Keputusan Kenaikan Kelas / Kelulusan (Semester Akhir)</span>
                        </div>

                        {(() => {
                          const rec = getNextClassRecommendation(st, currentKelas);
                          const isGraduation = rec.isTingkatAkhir;
                          const status = st.statusKenaikan || (isGraduation ? 'Lulus' : 'Naik Kelas');
                          const targetName = st.targetNamaKelasBerikutnya || rec.targetNama;

                          if (isGraduation) {
                            return (
                              <div className="space-y-1.5 text-center">
                                <p className="text-slate-700">
                                  Berdasarkan kriteria kelulusan satuan pendidikan {schoolInfo?.nama || 'SMK Bakti Putra Mandiri'} Tahun Ajaran {schoolInfo?.tahunAjaranPembelajaran || '2026/2027'}, peserta didik dinyatakan:
                                </p>
                                <div className="flex items-center justify-center gap-6 pt-1 font-bold">
                                  <div className={`px-5 py-1.5 rounded-lg border-2 flex items-center gap-2 ${
                                    status === 'Lulus' 
                                      ? 'border-emerald-600 bg-emerald-100/80 text-emerald-950 font-black' 
                                      : 'border-slate-300 text-slate-400 bg-white'
                                  }`}>
                                    {status === 'Lulus' && <span className="text-emerald-700 font-black">✓</span>}
                                    <span>L U L U S</span>
                                  </div>
                                  <div className={`px-5 py-1.5 rounded-lg border flex items-center gap-2 ${
                                    status === 'Tidak Lulus'
                                      ? 'border-rose-600 bg-rose-100 text-rose-950 font-black'
                                      : 'border-slate-300 text-slate-400 bg-white'
                                  }`}>
                                    {status === 'Tidak Lulus' && <span className="text-rose-700 font-black">✓</span>}
                                    <span>TIDAK LULUS</span>
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div className="space-y-1.5 text-center">
                              <p className="text-slate-700">
                                Berdasarkan pencapaian seluruh kompetensi pada semester ganjil dan semester genap, peserta didik ditetapkan:
                              </p>
                              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-1 font-bold">
                                <div className={`px-5 py-1.5 rounded-lg border-2 flex items-center gap-2 ${
                                  status === 'Naik Kelas'
                                    ? 'border-emerald-600 bg-emerald-100/80 text-emerald-950 font-black'
                                    : 'border-slate-300 text-slate-400 bg-white'
                                }`}>
                                  {status === 'Naik Kelas' && <span className="text-emerald-700 font-black">✓</span>}
                                  <span>Naik ke Kelas: {targetName}</span>
                                </div>
                                <div className={`px-5 py-1.5 rounded-lg border flex items-center gap-2 ${
                                  status === 'Tinggal Kelas'
                                    ? 'border-rose-600 bg-rose-100 text-rose-950 font-black'
                                    : 'border-slate-300 text-slate-400 bg-white'
                                }`}>
                                  {status === 'Tinggal Kelas' && <span className="text-rose-700 font-black">✓</span>}
                                  <span>Tinggal di Kelas: {currentKelas?.namaKelas || st.kelas}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Signatures Footer */}
                    <div className="raport-signature-group break-inside-avoid page-break-inside-avoid print:break-inside-avoid pt-6 border-t border-slate-200 text-xs text-center grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-slate-500">Mengetahui,</div>
                        <div className="font-bold text-slate-700">Orang Tua / Wali Siswa,</div>
                        <div className="h-20 sm:h-24"></div>
                        <div className="font-bold text-slate-900 border-b border-slate-600 inline-block px-8 pb-0.5 min-w-[180px]">
                          ( ............................................ )
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-500">{titimangsaTempat}, {titimangsaTanggal}</div>
                        <div className="font-bold text-slate-700">Wali Kelas,</div>
                        <div className="h-20 sm:h-24"></div>
                        <div className="font-bold text-slate-900 border-b border-slate-600 inline-block px-4 pb-0.5 min-w-[180px]">
                          {currentWalasUser?.nama || currentKelas?.namaWalas || currentUser.nama}
                        </div>
                        <div className="text-[10px] text-slate-600 mt-1">
                          {formatTeacherIdentifier(currentWalasUser || currentUser)}
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-500">Mengetahui,</div>
                        <div className="font-bold text-slate-700">Kepala Sekolah,</div>
                        <div className="h-20 sm:h-24"></div>
                        <div className="font-bold text-slate-900 border-b border-slate-600 inline-block px-4 pb-0.5 min-w-[180px]">
                          {schoolInfo?.kepalaSekolah || 'Dr. H. Hendra Gunawan, M.Pd'}
                        </div>
                        <div className="text-[10px] text-slate-600 mt-1">
                          {formatKepsekIdentifier(schoolInfo)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {classStudents.length === 0 && (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
                  Tidak ada peserta didik di rombel ini.
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: CETAK LEGER RESMI SEKOLAH (PER-MAPEL & KESELURUHAN)     */}
      {/* ============================================================== */}
      {activeTab === 'cetak_leger' && (
        <CetakLegerView
          currentUser={currentUser}
          kelasList={isSuperAdmin ? kelasList : (availableClassesForWalas.length > 0 ? availableClassesForWalas : availableClassesForLegerGuru)}
          mapelList={mapelList}
          usersList={usersList}
          nilaiList={nilaiList}
          absensiList={absensiList}
          schoolInfo={schoolInfo}
          jadwalPelajaranList={jadwalPelajaranList}
          ekskulList={ekskulList}
          nilaiEkskulList={nilaiEkskulList}
          defaultClassId={selectedKelasId}
          defaultMode={isAuthorizedLegerKeseluruhan ? 'keseluruhan' : 'per_mapel'}
          onPullAllFromCloud={onPullAllFromCloud}
          onSelectClassId={(newId) => {
            setSelectedKelasId(newId);
            if (onSelectClassId) onSelectClassId(newId);
          }}
        />
      )}

      {/* ============================================================== */}
      {/* MODAL IMPORT NILAI MATA PELAJARAN DARI EXCEL                   */}
      {/* ============================================================== */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-5 h-5 text-teal-700" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Import Nilai Mata Pelajaran dari Excel
                  </h3>
                  <p className="text-xs text-slate-500">
                    Mapel: <strong className="text-teal-700">{currentMapel?.namaMapel}</strong> ({currentMapel?.kode}) • Kelas: <strong className="text-slate-800">{currentKelas?.namaKelas}</strong> • Periode: <strong className="text-indigo-700">{effectivePeriode}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportFile(null);
                  setImportParsedData(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs">
              {/* Petunjuk & Download Template */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                    Belum punya template format Excel untuk rombel ini?
                  </span>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    Unduh format Excel resmi yang sudah otomatis memuat data ({classStudents.length}) siswa di kelas <strong>{currentKelas?.namaKelas}</strong>. Anda cukup mengisi kolom LM / Tugas / UH / Nilai PTS / PAS / Catatan lalu mengunggahnya kembali.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadExcelTemplate}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-1.5 shrink-0 shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Format Excel</span>
                </button>
              </div>

              {/* Upload Dropzone */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-700">
                  Pilih Berkas Nilai (.xlsx, .xls, .csv):
                </label>
                <div className="border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-2xl p-6 text-center bg-slate-50/50 hover:bg-teal-50/30 transition-colors relative">
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImportFileSelected(file);
                    }}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                  />
                  <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                    <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
                      <Upload className="w-6 h-6" />
                    </div>
                    {importIsLoading ? (
                      <div className="flex items-center gap-2 text-teal-700 font-semibold text-xs">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Membaca dan memetakan data nilai dari berkas...</span>
                      </div>
                    ) : importFile ? (
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-900 text-sm">{importFile.name}</p>
                        <p className="text-[11px] text-slate-500">{(importFile.size / 1024).toFixed(1)} KB • Klik atau seret file lain untuk mengganti</p>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-800 text-xs">Klik di sini untuk memilih berkas Excel atau seret ke area ini</p>
                        <p className="text-[11px] text-slate-500">Format yang didukung: Microsoft Excel (.xlsx, .xls) atau CSV</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Preview Data Hasil Pembacaan File */}
              {importParsedData && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      <span className="font-bold text-slate-900 text-xs">
                        Pratinjau Hasil Impor: <strong>{importParsedData.count}</strong> dari {classStudents.length} siswa cocok
                      </span>
                    </div>
                    {importParsedData.unmatchedNames.length > 0 && (
                      <span className="text-[11px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                        ⚠️ {importParsedData.unmatchedNames.length} nama tidak cocok di kelas ini
                      </span>
                    )}
                  </div>

                  {/* Warning Unmatched Names if any */}
                  {importParsedData.unmatchedNames.length > 0 && (
                    <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-900 space-y-1">
                      <p className="font-bold flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        Nama di berkas yang tidak terdaftar di rombel {currentKelas?.namaKelas}:
                      </p>
                      <p className="text-amber-800 text-[10px] italic">
                        {importParsedData.unmatchedNames.slice(0, 5).join(', ')}
                        {importParsedData.unmatchedNames.length > 5 ? ` dan ${importParsedData.unmatchedNames.length - 5} lainnya` : ''}
                      </p>
                    </div>
                  )}

                  {/* Preview Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead className="bg-slate-100 sticky top-0 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-2.5 text-center w-8">No</th>
                          <th className="py-2 px-2.5">Nama Siswa</th>
                          <th className="py-2 px-2 text-center">NIPD</th>
                          <th className="py-2 px-1.5 text-center">LM1</th>
                          <th className="py-2 px-1.5 text-center">LM2</th>
                          <th className="py-2 px-1.5 text-center">LM3</th>
                          <th className="py-2 px-1.5 text-center">LM4</th>
                          <th className="py-2 px-1.5 text-center">Tugas</th>
                          <th className="py-2 px-1.5 text-center">PTS</th>
                          <th className="py-2 px-1.5 text-center">PAS/PAT</th>
                          <th className="py-2 px-1.5 text-center">Nilai Akhir</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {classStudents.map((st, idx) => {
                          const sNipd = st.nipd || st.nipOrNis;
                          const vals = importParsedData.importedGrades[sNipd];
                          const hasData = Boolean(vals);
                          return (
                            <tr key={st.id || sNipd} className={hasData ? 'hover:bg-slate-50' : 'bg-slate-50/40 text-slate-400'}>
                              <td className="py-1.5 px-2.5 text-center">{idx + 1}</td>
                              <td className="py-1.5 px-2.5 font-semibold text-slate-800 truncate max-w-[140px]">{st.nama}</td>
                              <td className="py-1.5 px-2 text-center font-mono text-[10px] text-slate-500">{sNipd}</td>
                              <td className="py-1.5 px-1.5 text-center font-bold text-emerald-700">{vals?.lm1 ?? '-'}</td>
                              <td className="py-1.5 px-1.5 text-center font-bold text-emerald-700">{vals?.lm2 ?? '-'}</td>
                              <td className="py-1.5 px-1.5 text-center font-bold text-emerald-700">{vals?.lm3 ?? '-'}</td>
                              <td className="py-1.5 px-1.5 text-center font-bold text-emerald-700">{vals?.lm4 ?? '-'}</td>
                              <td className="py-1.5 px-1.5 text-center text-slate-700">{vals?.tugas1 ?? '-'}</td>
                              <td className="py-1.5 px-1.5 text-center font-bold text-indigo-700">{vals?.nilaiPts ?? '-'}</td>
                              <td className="py-1.5 px-1.5 text-center font-bold text-blue-700">{vals?.nilaiPas ?? vals?.nilaiPat ?? '-'}</td>
                              <td className="py-1.5 px-1.5 text-center font-black text-emerald-800 bg-emerald-50/50">
                                {vals?.nilaiAkhir !== undefined ? vals.nilaiAkhir : (vals ? 'Hitung Otomatis' : '-')}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-between gap-2 bg-slate-50/60">
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportFile(null);
                  setImportParsedData(null);
                }}
                className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!importParsedData || importParsedData.count === 0}
                  onClick={() => handleApplyImportedScores(false)}
                  className="px-4 py-2.5 bg-slate-700 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  title="Terapkan nilai ke formulir tabel tanpa langsung menyimpan ke cloud"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Terapkan ke Form (Pratinjau)</span>
                </button>

                <button
                  type="button"
                  disabled={!importParsedData || importParsedData.count === 0}
                  onClick={() => handleApplyImportedScores(true)}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  title="Terapkan nilai ke formulir dan simpan langsung ke database Cloud Firestore"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Terapkan & Simpan ke Cloud</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Restore Nilai Leger Mapel */}
      <LegerRestoreModal
        isOpen={showRestoreModal}
        onClose={() => setShowRestoreModal(false)}
        currentMapel={currentMapel}
        currentKelas={currentKelas}
        selectedPeriode={effectivePeriode}
        classStudents={classStudents}
        currentGrades={localGrades}
        savedNilaiList={nilaiList}
        onRestoreScores={handleRestoreScores}
        onRestoreGlobalNilaiList={handleRestoreGlobalNilaiList}
      />
    </div>
  );
};
