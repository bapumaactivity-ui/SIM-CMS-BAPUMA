import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, Kelas, Mapel, NilaiMapelSiswa, JadwalPelajaran, SchoolInfo, PaketUjian, JadwalUjianItem, HasilUjian } from '../../types';
import { 
  isSameKelas, 
  isRecordForStudent, 
  getMatchingClassesForMapel, 
  getLocalDateString, 
  normalizeTeacherName, 
  normalizeMapelName, 
  normalizeKelas,
  isKelasActive,
  isJurusanActive,
  getActiveClasses,
  hasActualScores,
  formatTeacherNameWithDegree,
  getMatchingMapelForKelas,
  isTeacherTeachingMapel,
  isTeacherExplicitlyAssignedToMapel,
  extractTeacherMapelList,
  syncMapelsWithTeachers
} from '../../utils/academicHelpers';
import { KopSuratView } from '../KopSuratView';
import { OFFICIAL_MAPEL_TEACHERS } from '../../data/initialData';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Filter,
  Users,
  BookOpen,
  GraduationCap,
  Printer,
  Download,
  Copy,
  MessageCircle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  RefreshCw,
  X,
  Award,
  Flame,
  Layers,
  Sparkles,
  UserCheck,
  Edit3,
  Check
} from 'lucide-react';

export interface TeacherSubjectClassAssignment {
  id: string; // unique assignment key
  idGuru: string;
  namaGuru: string;
  jabatanGuru?: string;
  roleGuru?: string;
  jurusanGuru?: string;
  nipGuru?: string;
  teleponGuru?: string;
  fotoGuru?: string;
  idMapel: string;
  namaMapel: string;
  kodeMapel?: string;
  kelompokMapel?: string;
  idKelas: string;
  namaKelas: string;
  tingkatKelas?: string;
  jurusanKelas?: string;
  totalSiswa: number;
  siswaTerisi: number;
  countFormatif: number;
  countPts: number;
  countPas: number;
  countAkhir: number;
  countDeskripsi: number;
  persentase: number;
  status: 'Tuntas' | 'Sedang Mengisi' | 'Belum Mengisi';
  rataRataNilaiAkhir: number;
}

interface AdminMonitoringNilaiGuruTabProps {
  usersList: User[];
  mapelList: Mapel[];
  kelasList: Kelas[];
  nilaiList: NilaiMapelSiswa[];
  jadwalPelajaranList?: JadwalPelajaran[];
  jadwalUjianList?: JadwalUjianItem[];
  ujianList?: PaketUjian[];
  hasilList?: HasilUjian[];
  schoolInfo?: SchoolInfo;
  currentUser?: User;
  onPullAllFromCloud?: () => Promise<any>;
  onUpdateMapel?: (mapel: Mapel) => void;
  onBatchUpdateMapel?: (mapel: Mapel[]) => void;
  onSaveJadwalPelajaran?: (jadwal: JadwalPelajaran) => void;
  onUpdateUser?: (user: User) => void;
  onSaveNilaiList?: (newList: NilaiMapelSiswa[]) => void;
}

export const AdminMonitoringNilaiGuruTab: React.FC<AdminMonitoringNilaiGuruTabProps> = ({
  usersList = [],
  mapelList = [],
  kelasList = [],
  nilaiList = [],
  jadwalPelajaranList = [],
  jadwalUjianList = [],
  ujianList = [],
  hasilList = [],
  schoolInfo,
  currentUser,
  onPullAllFromCloud,
  onUpdateMapel,
  onBatchUpdateMapel,
  onSaveJadwalPelajaran,
  onUpdateUser,
  onSaveNilaiList,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'Semua' | 'Belum Mengisi' | 'Sedang Mengisi' | 'Tuntas'>('Semua');
  const [filterTingkat, setFilterTingkat] = useState<string>('Semua');
  const [selectedTingkatans, setSelectedTingkatans] = useState<string[]>(['X', 'XI', 'XII']);
  const [filterJurusan, setFilterJurusan] = useState<string>('Semua');
  const [selectedJurusans, setSelectedJurusans] = useState<string[]>([]);
  const [filterKelas, setFilterKelas] = useState<string>('Semua');
  const [selectedKelasList, setSelectedKelasList] = useState<string[]>([]);
  const [filterUjianOnly, setFilterUjianOnly] = useState<boolean>(false);
  const [filterUjianMode, setFilterUjianMode] = useState<'semua' | 'hanya_ujian' | 'tanpa_ujian'>('semua');
  const [showMultiSelectPanel, setShowMultiSelectPanel] = useState<boolean>(false);
  const [filterGuru, setFilterGuru] = useState<string>('Semua');
  const [selectedAssignment, setSelectedAssignment] = useState<TeacherSubjectClassAssignment | null>(null);
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [isRefreshingCloud, setIsRefreshingCloud] = useState(false);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);

  // Modal State for Quick Reassign Guru Pengampu
  const [reassignModalAssignment, setReassignModalAssignment] = useState<TeacherSubjectClassAssignment | null>(null);
  const [selectedNewTeacherId, setSelectedNewTeacherId] = useState<string>('');
  const [reassignSuccessNotice, setReassignSuccessNotice] = useState<string | null>(null);
  const [teacherSearchFilter, setTeacherSearchFilter] = useState<string>('');

  const [isSyncingWithDataGuru, setIsSyncingWithDataGuru] = useState(false);
  const [syncSuccessNotice, setSyncSuccessNotice] = useState<string | null>(null);

  const handleRefreshCloud = async () => {
    if (!onPullAllFromCloud) return;
    setIsRefreshingCloud(true);
    setRefreshNotice(null);
    try {
      await onPullAllFromCloud();
      setRefreshNotice('Data monitoring nilai berhasil dimuat ulang dari Cloud Firestore!');
      setTimeout(() => setRefreshNotice(null), 4000);
    } catch (err: any) {
      console.warn('Error refreshing cloud in monitoring:', err);
    } finally {
      setIsRefreshingCloud(false);
    }
  };

  const handleSyncWithDataGuru = async () => {
    setIsSyncingWithDataGuru(true);
    try {
      // 1. Sinkronkan seluruh master mata pelajaran dengan Data Guru (usersList)
      const activeTeachers = usersList.filter(u => u.role !== 'admin' && u.role !== 'siswa' && u.role !== 'calon_siswa' && u.statusAktif !== false);
      const { updatedMapels, changedCount } = syncMapelsWithTeachers(mapelList, activeTeachers);

      if (onBatchUpdateMapel) {
        onBatchUpdateMapel(updatedMapels);
      } else if (onUpdateMapel) {
        updatedMapels.forEach(m => onUpdateMapel(m));
      }

      // 2. Selaraskan nama guru pada jadwal pelajaran jika berbeda
      if (onSaveJadwalPelajaran && Array.isArray(jadwalPelajaranList)) {
        jadwalPelajaranList.forEach(j => {
          const m = updatedMapels.find(x => x.id === j.idMapel || normalizeMapelName(x.namaMapel) === normalizeMapelName(j.namaMapel));
          if (m && m.guruPengampu && m.guruPengampu !== j.namaGuru) {
            onSaveJadwalPelajaran({
              ...j,
              namaGuru: m.guruPengampu,
              idGuru: m.idGuru || j.idGuru
            });
          }
        });
      }

      setSyncSuccessNotice(`Berhasil menyelaraskan seluruh penugasan guru pengampu di Monitoring Nilai dengan Data Guru (${changedCount} mata pelajaran disinkronkan)!`);
      setTimeout(() => setSyncSuccessNotice(null), 5000);
    } catch (err: any) {
      console.warn('Sync with Data Guru error:', err);
    } finally {
      setIsSyncingWithDataGuru(false);
    }
  };

  // Otomatis selaraskan penugasan mapel dengan Data Guru jika terdeteksi perbedaan saat tab dimuat
  const hasAutoSyncedRef = useRef(false);
  useEffect(() => {
    if (hasAutoSyncedRef.current) return;
    const activeTeachers = usersList.filter(u => u.role !== 'admin' && u.role !== 'siswa' && u.role !== 'calon_siswa' && u.statusAktif !== false);
    if (activeTeachers.length === 0 || mapelList.length === 0) return;

    const { updatedMapels, changedCount } = syncMapelsWithTeachers(mapelList, activeTeachers);
    if (changedCount > 0) {
      hasAutoSyncedRef.current = true;
      if (onBatchUpdateMapel) {
        onBatchUpdateMapel(updatedMapels);
      } else if (onUpdateMapel) {
        updatedMapels.forEach(m => onUpdateMapel(m));
      }
    }
  }, [usersList, mapelList, onBatchUpdateMapel, onUpdateMapel]);

  // Handler Buka & Simpan Modal Penyesuaian Guru Pengampu
  const handleOpenReassignModal = (assignment: TeacherSubjectClassAssignment) => {
    setReassignModalAssignment(assignment);
    const currTeacher = teachersList.find(t => 
      t.id === assignment.idGuru || 
      t.idGuru === assignment.idGuru || 
      t.nipOrNis === assignment.idGuru ||
      normalizeTeacherName(t.nama) === normalizeTeacherName(assignment.namaGuru)
    );
    setSelectedNewTeacherId(currTeacher?.id || '');
    setTeacherSearchFilter('');
  };

  const handleSaveReassignedTeacher = () => {
    if (!reassignModalAssignment || !selectedNewTeacherId) return;
    const targetAssignment = reassignModalAssignment;
    const chosenTeacher = teachersList.find(t => t.id === selectedNewTeacherId);
    if (!chosenTeacher) return;

    // 1. Perbarui Master Mata Pelajaran (mapelList)
    if (onUpdateMapel) {
      const targetMapel = mapelList.find(m => 
        m.id === targetAssignment.idMapel || 
        normalizeMapelName(m.namaMapel) === normalizeMapelName(targetAssignment.namaMapel)
      );
      if (targetMapel) {
        onUpdateMapel({
          ...targetMapel,
          guruPengampu: chosenTeacher.nama,
          idGuru: chosenTeacher.id,
        });
      }
    }

    // 2. Perbarui atau Buat Entri Jadwal Pelajaran untuk Rombel & Mapel ini
    if (onSaveJadwalPelajaran) {
      const existingSchedule = (jadwalPelajaranList || []).find(j => 
        (isSameKelas(j.namaKelas, targetAssignment.namaKelas) || j.idKelas === targetAssignment.idKelas) &&
        (j.idMapel === targetAssignment.idMapel || normalizeMapelName(j.namaMapel) === normalizeMapelName(targetAssignment.namaMapel))
      );
      if (existingSchedule) {
        onSaveJadwalPelajaran({
          ...existingSchedule,
          idGuru: chosenTeacher.id,
          namaGuru: chosenTeacher.nama,
        });
      } else {
        onSaveJadwalPelajaran({
          id: `jp-asg-${Date.now()}`,
          hari: 'Senin',
          jamMulai: '07:15',
          jamSelesai: '08:45',
          idKelas: targetAssignment.idKelas,
          namaKelas: targetAssignment.namaKelas,
          idMapel: targetAssignment.idMapel,
          namaMapel: targetAssignment.namaMapel,
          idGuru: chosenTeacher.id,
          namaGuru: chosenTeacher.nama,
          ruang: 'R. KBM',
          jumlahJam: 2,
          jamKe: '1 - 2',
        });
      }
    }

    // 3. Perbarui Data Nilai Siswa yang Sudah Ada untuk Rombel & Mapel ini
    if (onSaveNilaiList && Array.isArray(nilaiList)) {
      const updatedGrades = nilaiList.map(n => {
        if (!n) return n;
        const matchK = isSameKelas(n.kelas, targetAssignment.namaKelas) || n.kelas === targetAssignment.idKelas;
        const matchM = (n.mapelId && n.mapelId === targetAssignment.idMapel) || 
                       (n.mapelNama && normalizeMapelName(n.mapelNama) === normalizeMapelName(targetAssignment.namaMapel));
        if (matchK && matchM) {
          return {
            ...n,
            guruPengampu: chosenTeacher.nama,
            idGuru: chosenTeacher.id,
          };
        }
        return n;
      });
      onSaveNilaiList(updatedGrades);
    }

    // 4. Tambahkan Mapel ini ke Akun Guru Baru jika belum ada
    if (onUpdateUser) {
      const currentDiampu = Array.isArray(chosenTeacher.mapelDiampu) ? chosenTeacher.mapelDiampu : [];
      if (!currentDiampu.includes(targetAssignment.idMapel) && !currentDiampu.includes(targetAssignment.namaMapel)) {
        onUpdateUser({
          ...chosenTeacher,
          mapelDiampu: [...currentDiampu, targetAssignment.idMapel],
        });
      }
    }

    setReassignSuccessNotice(`Guru pengampu untuk ${targetAssignment.namaMapel} (${targetAssignment.namaKelas}) berhasil disinkronkan ke ${chosenTeacher.nama}!`);
    setReassignModalAssignment(null);
    setTimeout(() => setReassignSuccessNotice(null), 4000);
  };

  // List of all active students
  const activeStudents = useMemo(() => {
    return usersList.filter(u => u.role === 'siswa');
  }, [usersList]);

  // Deduplicated list of teachers (mencegah akun guru ganda di dropdown dan proses data)
  const teachersList = useMemo(() => {
    const rawTeachers = usersList.filter(u => {
      if (!u || u.role === 'admin' || u.role === 'siswa' || u.role === 'calon_siswa' || u.statusAktif === false) return false;
      const r = (u.role || '').toLowerCase();
      const diampu = extractTeacherMapelList(u);
      return (
        r === 'guru' || 
        r === 'walas' || 
        r === 'pembina_ekskul' || 
        r === 'kesiswaan' ||
        r === 'kepala_sekolah' ||
        r === 'staf' ||
        r === 'operator' ||
        r === 'bendahara' ||
        u.isWalas || 
        u.isPembinaEkskul || 
        u.isKesiswaan ||
        diampu.length > 0 ||
        Boolean(u.idGuru || u.nip || u.nipOrNis) ||
        Boolean(u.jabatanTambahan && u.jabatanTambahan.trim().length > 0)
      );
    });

    const uniqueMap = new Map<string, User>();
    rawTeachers.forEach(t => {
      const normName = normalizeTeacherName(t.nama);
      const nip = (t.nip || t.nipOrNis || t.idGuru || '').trim();
      const dedupKey = (t.id && t.id.startsWith('u-guru-')) ? t.id : ((nip && nip !== '-') ? nip : (normName || t.id));
      const diampu = extractTeacherMapelList(t);
      if (!uniqueMap.has(dedupKey)) {
        uniqueMap.set(dedupKey, { ...t, mapelDiampu: diampu });
      } else {
        const existing = uniqueMap.get(dedupKey)!;
        uniqueMap.set(dedupKey, {
          ...existing,
          ...t,
          mapelDiampu: diampu.length > 0 ? diampu : existing.mapelDiampu,
          fotoProfilUrl: t.fotoProfilUrl || existing.fotoProfilUrl,
          telepon: t.telepon || existing.telepon,
          gelar: t.gelar || existing.gelar,
          jabatanTambahan: t.jabatanTambahan || existing.jabatanTambahan,
        });
      }
    });

    // Otomatis sertakan guru riil yang pernah menginput nilai aktual di sistem
    const addTeacherIfNotExists = (rawName?: string, rawId?: string, rawNip?: string) => {
      const name = (rawName || '').trim();
      if (!name || name.toLowerCase() === 'guru pengampu' || name.toLowerCase() === 'admin' || name.toLowerCase() === 'belum ditentukan' || name === '-') return;
      const norm = normalizeTeacherName(name);
      if (!norm) return;
      const nip = (rawNip || '').trim();
      const dedupKey = (rawId && rawId.startsWith('u-guru-')) ? rawId : ((nip && nip !== '-') ? nip : norm);
      if (!uniqueMap.has(dedupKey)) {
        uniqueMap.set(dedupKey, {
          id: rawId || `u-guru-${norm}`,
          idGuru: rawId || nip || undefined,
          nama: name,
          role: 'guru',
          username: norm,
          nipOrNis: nip || undefined,
          nip: nip || undefined,
          mapelDiampu: [],
        } as unknown as User);
      }
    };

    nilaiList.forEach(n => {
      if (hasActualScores(n)) {
        addTeacherIfNotExists(n.guruPengampu, (n as any).idGuru);
      }
    });

    return Array.from(uniqueMap.values());
  }, [usersList, nilaiList]);

  // Construct comprehensive list of Teacher-Subject-Class assignments
  const assignments: TeacherSubjectClassAssignment[] = useMemo(() => {
    const list: TeacherSubjectClassAssignment[] = [];
    const seenKeys = new Set<string>();

    // Helper: Cari profil guru kanonikal (kebal terhadap gelar akademik, spasi, dan ID)
    const findCanonicalTeacher = (gNama?: string, gId?: string): { id: string; nama: string; obj?: User } => {
      if (gId) {
        const found = teachersList.find(t => 
          t.id === gId || 
          t.idGuru === gId || 
          t.nipOrNis === gId || 
          t.nip === gId ||
          t.username === gId
        );
        if (found) return { id: found.id, nama: found.nama, obj: found };
      }
      const cleanName = (gNama || '').trim();
      if (!cleanName || cleanName === '-' || cleanName.toLowerCase() === 'guru pengampu' || cleanName.toLowerCase() === 'admin' || cleanName.toLowerCase() === 'belum ditentukan') {
        return { id: 'guru-unknown', nama: cleanName || 'Guru Pengampu' };
      }
      const normName = normalizeTeacherName(cleanName);
      if (!normName) return { id: 'guru-unknown', nama: cleanName || 'Guru Pengampu' };

      const found = teachersList.find(t => {
        const tNorm = normalizeTeacherName(t.nama);
        return tNorm === normName || (t.nama && t.nama.trim().toLowerCase() === cleanName.toLowerCase());
      });
      if (found) return { id: found.id, nama: found.nama, obj: found };
      return { id: `g-${normName}`, nama: cleanName };
    };

    // Helper: Cari mata pelajaran kanonikal (kebal terhadap huruf besar/kecil, kode mapel, status nonaktif)
    const findCanonicalMapel = (mNama?: string, mId?: string): { id: string; nama: string; obj?: Mapel } => {
      if (mId) {
        const found = mapelList.find(m => m.id === mId);
        if (found) return { id: found.id, nama: found.namaMapel, obj: found };
      }
      const cleanName = (mNama || '').trim();
      const normName = normalizeMapelName(cleanName);
      if (!normName) return { id: 'mapel-unknown', nama: cleanName || 'Mata Pelajaran' };

      const found = mapelList.find(m => {
        const mNorm = normalizeMapelName(m.namaMapel);
        const mKode = normalizeMapelName(m.kode);
        return mNorm === normName || (mKode && mKode === normName);
      });
      if (found) return { id: found.id, nama: found.namaMapel, obj: found };
      return { id: `m-${normName}`, nama: cleanName };
    };

    // Helper: Cari kelas kanonikal (kebal terhadap awalan "Kelas", singkatan spasi/tanda hubung)
    const findCanonicalKelas = (kNama?: string, kId?: string): { id: string; nama: string; obj?: Kelas } => {
      if (kId) {
        const found = kelasList.find(k => k.id === kId);
        if (found) return { id: found.id, nama: found.namaKelas, obj: found };
      }
      const cleanName = (kNama || '').trim();
      if (!cleanName) return { id: 'kelas-unknown', nama: 'Kelas Unknown' };

      const found = kelasList.find(k => isSameKelas(k.namaKelas, cleanName) || k.id === cleanName);
      if (found) return { id: found.id, nama: found.namaKelas, obj: found };
      return { id: `k-${normalizeKelas(cleanName).replace(/[^a-z0-9]/g, '')}`, nama: cleanName };
    };

    // Active classes (both rombel status and its jurusan must be active)
    const activeKelasList = getActiveClasses(kelasList, schoolInfo?.kejuruanList);

    const evaluateClassGrades = (
      mId: string,
      mNama: string,
      kId: string,
      kNama: string,
      teacherObj: User | undefined,
      mapelObj: Mapel | undefined,
      kelasObj: Kelas | undefined,
      totalSiswa: number,
      classStudents: User[]
    ) => {
      const normM = (s?: string) => (s || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const mNamaNorm = normM(mNama);
      const mKodeNorm = normM(mapelObj?.kode);

      // Only match records that belong strictly to this mapel & class, and have actual non-zero scores
      const classGrades = nilaiList.filter(n => {
        if (!n) return false;
        if (!hasActualScores(n)) return false;

        const nMapelNorm = normM(n.mapelNama);
        const nIdNorm = normM(n.mapelId);

        // Robust subject matching:
        // Match by exact ID, code, or normalized subject name
        const matchMapel = Boolean(
          (mId && n.mapelId && (n.mapelId === mId || normM(n.mapelId) === normM(mId))) ||
          (mKodeNorm && (nIdNorm === mKodeNorm || nMapelNorm === mKodeNorm)) ||
          (mapelObj?.id && (n.mapelId === mapelObj.id || normM(n.mapelId) === normM(mapelObj.id))) ||
          (mapelObj?.kode && (n.mapelId === mapelObj.kode || nIdNorm === normM(mapelObj.kode))) ||
          (nMapelNorm && mNamaNorm && nMapelNorm === mNamaNorm) ||
          (mapelObj?.namaMapel && normM(mapelObj.namaMapel) === nMapelNorm)
        );

        const matchKls = Boolean(
          isSameKelas(n.kelas, kNama) || 
          (kId && (n.kelas === kId || (n as any).idKelas === kId)) || 
          (kelasObj && (n.kelas === kelasObj.id || n.kelas === kelasObj.namaKelas || isSameKelas(n.kelas, kelasObj.namaKelas) || (n as any).idKelas === kelasObj.id)) ||
          (classStudents.length > 0 && classStudents.some(st => isRecordForStudent(n as any, st)))
        );

        return matchMapel && matchKls;
      });

      let countWithAnyGrade = 0;
      let countFormatif = 0;
      let countPts = 0;
      let countPas = 0;
      let countAkhir = 0;
      let countDeskripsi = 0;
      let sumNilaiAkhir = 0;
      let totalNilaiAkhirEntries = 0;

      const numVal = (v: any): number => {
        if (v === null || v === undefined || v === '' || typeof v === 'boolean') return 0;
        const n = Number(v);
        return isNaN(n) ? 0 : n;
      };

      if (classStudents.length > 0) {
        classStudents.forEach(st => {
          const g = classGrades.find(grade => isRecordForStudent(grade as any, st));
          if (g && hasActualScores(g)) {
            const hasFormatif = (numVal(g.nilaiFormatif) > 0) || (numVal(g.lm1) > 0) || (numVal(g.tugas1) > 0) || (numVal(g.lm2) > 0) || (numVal(g.lm3) > 0) || (numVal(g.lm4) > 0);
            const hasPts = numVal(g.nilaiPts) > 0;
            const hasPas = (numVal(g.nilaiPas) > 0) || (numVal(g.nilaiPat) > 0);
            const hasAkhir = numVal(g.nilaiAkhir) > 0;
            const hasDeskripsi = Boolean(g.tpDeskripsi || g.deskripsiTertinggi || g.catatanGuru);

            if (hasFormatif) countFormatif++;
            if (hasPts) countPts++;
            if (hasPas) countPas++;
            if (hasAkhir) {
              countAkhir++;
              sumNilaiAkhir += numVal(g.nilaiAkhir);
              totalNilaiAkhirEntries++;
            }
            if (hasDeskripsi) countDeskripsi++;

            if (hasFormatif || hasPts || hasPas || hasAkhir) {
              countWithAnyGrade++;
            }
          }
        });
      } else if (classGrades.length > 0) {
        // Fallback jika classStudents belum termuat: hitung unik peserta didik dari lembar nilai
        const uniqueStudentGrades = new Map<string, any>();
        classGrades.forEach(g => {
          if (!hasActualScores(g)) return;
          const sKey = (g.nipd || g.nisn || g.id || g.namaSiswa || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
          if (sKey && !uniqueStudentGrades.has(sKey)) {
            uniqueStudentGrades.set(sKey, g);
          }
        });

        uniqueStudentGrades.forEach(g => {
          const hasFormatif = (numVal(g.nilaiFormatif) > 0) || (numVal(g.lm1) > 0) || (numVal(g.tugas1) > 0) || (numVal(g.lm2) > 0) || (numVal(g.lm3) > 0) || (numVal(g.lm4) > 0);
          const hasPts = numVal(g.nilaiPts) > 0;
          const hasPas = (numVal(g.nilaiPas) > 0) || (numVal(g.nilaiPat) > 0);
          const hasAkhir = numVal(g.nilaiAkhir) > 0;
          const hasDeskripsi = Boolean(g.tpDeskripsi || g.deskripsiTertinggi || g.catatanGuru);

          if (hasFormatif) countFormatif++;
          if (hasPts) countPts++;
          if (hasPas) countPas++;
          if (hasAkhir) {
            countAkhir++;
            sumNilaiAkhir += numVal(g.nilaiAkhir);
            totalNilaiAkhirEntries++;
          }
          if (hasDeskripsi) countDeskripsi++;
          if (hasFormatif || hasPts || hasPas || hasAkhir) {
            countWithAnyGrade++;
          }
        });
      }

      const effectiveTotal = totalSiswa > 0 ? totalSiswa : 0;
      const persentase = (effectiveTotal > 0 && countWithAnyGrade > 0)
        ? Math.round((countWithAnyGrade / effectiveTotal) * 100) 
        : 0;

      // Status STRICT:
      // Harus Belum Mengisi jika countWithAnyGrade === 0, persentase === 0, tidak ada siswa aktif, atau seluruh komponen nilai 0
      const hasAnyRealGrade = countAkhir > 0 || countFormatif > 0 || countPts > 0 || countPas > 0;
      const status: 'Tuntas' | 'Sedang Mengisi' | 'Belum Mengisi' = 
        (countWithAnyGrade === 0 || persentase === 0 || effectiveTotal === 0 || !hasAnyRealGrade)
          ? 'Belum Mengisi'
          : (persentase >= 100 ? 'Tuntas' : 'Sedang Mengisi');

      // Detect if there is a teacher who actually submitted grades for this class and subject
      let recordedGuruNama: string | undefined = undefined;
      let recordedGuruId: string | undefined = undefined;
      for (const g of classGrades) {
        if (g.guruPengampu && 
            g.guruPengampu.trim().length > 0 && 
            g.guruPengampu.trim().toLowerCase() !== 'guru pengampu' &&
            g.guruPengampu.trim().toLowerCase() !== 'admin') {
          recordedGuruNama = g.guruPengampu;
          recordedGuruId = (g as any).idGuru;
          break;
        }
      }

      return {
        countWithAnyGrade,
        countFormatif,
        countPts,
        countPas,
        countAkhir,
        countDeskripsi,
        persentase,
        status,
        rataRataNilaiAkhir: totalNilaiAkhirEntries > 0 ? Number((sumNilaiAkhir / totalNilaiAkhirEntries).toFixed(1)) : 0,
        recordedGuruNama,
        recordedGuruId
      };
    };

    // =========================================================================
    // RESOLVER GURU PENGAMPU RESMI & AKTUAL
    // Menjamin penugasan guru di Monitoring Nilai 100% SESUAI DENGAN DATA GURU
    // =========================================================================
    const resolveOfficialTeacher = (
      mapelObj: Mapel | undefined,
      kelasObj: Kelas | undefined,
      explicitGuruNama?: string,
      explicitGuruId?: string
    ): { id: string; nama: string; obj?: User } => {
      if (!mapelObj) {
        return { id: 'guru-unknown', nama: explicitGuruNama || 'Guru Pengampu' };
      }

      const mId = (mapelObj.id || '').trim().toLowerCase();
      const mKode = normalizeMapelName(mapelObj.kode);
      const mNorm = normalizeMapelName(mapelObj.namaMapel);

      // Daftar guru riil dari Data Guru (usersList)
      const registeredTeachers = teachersList.filter(t => t.id && !t.id.startsWith('guru-unknown'));

      // -----------------------------------------------------------------------
      // 1. PRIORITAS UTAMA: PENUGASAN DI DATA GURU (usersList / AdminGuruTab -> mapelDiampu)
      // Ini adalah data guru yang diatur oleh Admin atau dipulihkan dari berkas cadangan!
      // -----------------------------------------------------------------------
      const candidateTeachers = registeredTeachers.filter(t => isTeacherExplicitlyAssignedToMapel(t, mapelObj));

      if (candidateTeachers.length === 1) {
        return { id: candidateTeachers[0].id, nama: candidateTeachers[0].nama, obj: candidateTeachers[0] };
      }

      if (candidateTeachers.length > 1) {
        // Jika terdapat beberapa guru pengampu mapel ini (misal guru umum beda tingkat / rombel):
        // 0. Cek apakah ada kecocokan persis ID mapel (misal m-x-mtk vs m-xi-mtk) di mapelDiampu
        const exactIdMatch = candidateTeachers.find(t => {
          const diampu = extractTeacherMapelList(t);
          return diampu.some(d => d.trim().toLowerCase() === mId || (mKode && d.trim().toLowerCase() === mKode));
        });
        if (exactIdMatch) return { id: exactIdMatch.id, nama: exactIdMatch.nama, obj: exactIdMatch };

        // a. Cek apakah ada guru kandidat yang sudah menginput nilai di kelas & mapel ini
        if (explicitGuruId || explicitGuruNama) {
          const matchedByGrade = candidateTeachers.find(t => 
            (explicitGuruId && (t.id === explicitGuruId || t.idGuru === explicitGuruId || t.nipOrNis === explicitGuruId)) ||
            (explicitGuruNama && normalizeTeacherName(t.nama) === normalizeTeacherName(explicitGuruNama))
          );
          if (matchedByGrade) return { id: matchedByGrade.id, nama: matchedByGrade.nama, obj: matchedByGrade };
        }

        // b. Cek jadwal pelajaran resmi KBM untuk rombel ini (Hanya jika nama guru jadwal cocok dengan salah satu kandidat)
        if (kelasObj && Array.isArray(jadwalPelajaranList) && jadwalPelajaranList.length > 0) {
          const foundJadwal = jadwalPelajaranList.find(j => {
            if (!j || !j.namaGuru) return false;
            const matchK = isSameKelas(j.namaKelas, kelasObj.namaKelas) || (j.idKelas && j.idKelas === kelasObj.id);
            if (!matchK) return false;
            const jMId = (j.idMapel || '').trim().toLowerCase();
            const jMNorm = normalizeMapelName(j.namaMapel);
            return (jMId && (jMId === mId || (mKode && jMId === mKode))) || (jMNorm && (jMNorm === mNorm || (mKode && jMNorm === mKode)));
          });
          if (foundJadwal) {
            const matchedByJadwal = candidateTeachers.find(t => 
              (foundJadwal.idGuru && (t.id === foundJadwal.idGuru || t.idGuru === foundJadwal.idGuru || t.nipOrNis === foundJadwal.idGuru)) ||
              (foundJadwal.namaGuru && normalizeTeacherName(t.nama) === normalizeTeacherName(foundJadwal.namaGuru))
            );
            if (matchedByJadwal) return { id: matchedByJadwal.id, nama: matchedByJadwal.nama, obj: matchedByJadwal };
          }
        }

        // c. Cocokkan berdasarkan tingkat kelas (Fase E / Kelas X vs Fase F / Kelas XI & XII)
        if (kelasObj) {
          const kTingkat = (kelasObj.tingkat || (kelasObj.namaKelas.startsWith('XII') ? 'XII' : kelasObj.namaKelas.startsWith('XI') ? 'XI' : 'X')).toUpperCase();
          const tingkatTeacher = candidateTeachers.find(t => {
            const jab = ((t.jabatanTambahan || '') + ' ' + (t.nama || '')).toUpperCase();
            if (kTingkat === 'X' && (jab.includes('FASE E') || jab.includes('KELAS X') || jab.includes('TINGKAT X'))) return true;
            if ((kTingkat === 'XI' || kTingkat === 'XII') && (jab.includes('FASE F') || jab.includes('KELAS XI') || jab.includes('KELAS XII') || jab.includes('TINGKAT XI') || jab.includes('TINGKAT XII'))) return true;
            return false;
          });
          if (tingkatTeacher) return { id: tingkatTeacher.id, nama: tingkatTeacher.nama, obj: tingkatTeacher };

          // d. Cocokkan dengan wali kelas dari rombel ini
          const walasMatch = candidateTeachers.find(t => 
            t.walasKelasId === kelasObj.id || (Array.isArray(t.walasKelasIds) && t.walasKelasIds.includes(kelasObj.id))
          );
          if (walasMatch) return { id: walasMatch.id, nama: walasMatch.nama, obj: walasMatch };

          // e. Cocokkan dengan kejuruan guru
          const kJurusan = (kelasObj.jurusan || kelasObj.namaKelas || '').toLowerCase();
          const jurMatch = candidateTeachers.find(t => {
            const tJur = (t.jurusan || '').toLowerCase();
            const tJab = (t.jabatanTambahan || '').toLowerCase();
            if (kJurusan.includes('farmasi') && (tJur.includes('farmasi') || tJab.includes('farmasi'))) return true;
            if ((kJurusan.includes('perawat') || kJurusan.includes('kesehatan')) && (tJur.includes('perawat') || tJur.includes('kesehatan') || tJab.includes('perawat') || tJab.includes('kesehatan'))) return true;
            if (kJurusan.includes('hotel') && (tJur.includes('hotel') || tJab.includes('hotel'))) return true;
            if ((kJurusan.includes('cantik') || kJurusan.includes('spa')) && (tJur.includes('cantik') || tJur.includes('spa') || tJab.includes('cantik') || tJab.includes('spa'))) return true;
            return false;
          });
          if (jurMatch) return { id: jurMatch.id, nama: jurMatch.nama, obj: jurMatch };
        }

        // f. Cocokkan dengan guruPengampu di mapelObj jika cocok dengan salah satu kandidat
        if (mapelObj.guruPengampu) {
          const matchMapelProp = candidateTeachers.find(t => 
            normalizeTeacherName(t.nama) === normalizeTeacherName(mapelObj.guruPengampu) ||
            (mapelObj.idGuru && (t.id === mapelObj.idGuru || t.idGuru === mapelObj.idGuru || t.nipOrNis === mapelObj.idGuru))
          );
          if (matchMapelProp) return { id: matchMapelProp.id, nama: matchMapelProp.nama, obj: matchMapelProp };
        }

        return { id: candidateTeachers[0].id, nama: candidateTeachers[0].nama, obj: candidateTeachers[0] };
      }

      // -----------------------------------------------------------------------
      // 2. JIKA BELUM ADA DI MAPEL DIAMPU: CEK PROPERTI guruPengampu MAPEL
      // Mengutamakan guru yang terdaftar di Data Guru (usersList)
      // -----------------------------------------------------------------------
      if (mapelObj.guruPengampu && 
          mapelObj.guruPengampu.trim().length > 0 &&
          mapelObj.guruPengampu.trim().toLowerCase() !== 'guru pengampu' &&
          mapelObj.guruPengampu.trim().toLowerCase() !== 'admin' &&
          mapelObj.guruPengampu.trim() !== '-' &&
          mapelObj.guruPengampu.trim().toLowerCase() !== 'belum ditentukan') {
        const t = registeredTeachers.find(u => 
          (mapelObj.idGuru && (u.id === mapelObj.idGuru || u.idGuru === mapelObj.idGuru || u.nipOrNis === mapelObj.idGuru)) ||
          normalizeTeacherName(u.nama) === normalizeTeacherName(mapelObj.guruPengampu)
        );
        if (t) return { id: t.id, nama: t.nama, obj: t };
      }

      // -----------------------------------------------------------------------
      // 3. PRIORITAS KETIGA: GURU YANG SUDAH MEMILIKI REKAM NILAI AKTUAL
      // -----------------------------------------------------------------------
      if (explicitGuruId || explicitGuruNama) {
        const cleanExpNama = (explicitGuruNama || '').trim();
        if (
          cleanExpNama &&
          cleanExpNama.toLowerCase() !== 'admin' &&
          cleanExpNama.toLowerCase() !== 'guru pengampu' &&
          cleanExpNama.toLowerCase() !== 'belum ditentukan' &&
          cleanExpNama !== '-'
        ) {
          const t = registeredTeachers.find(u => 
            (explicitGuruId && (u.id === explicitGuruId || u.idGuru === explicitGuruId || u.nipOrNis === explicitGuruId)) ||
            normalizeTeacherName(u.nama) === normalizeTeacherName(cleanExpNama)
          );
          if (t) return { id: t.id, nama: t.nama, obj: t };
        }
      }

      // -----------------------------------------------------------------------
      // 4. PRIORITAS KEEMPAT: JADWAL PELAJARAN KBM RESMI
      // -----------------------------------------------------------------------
      if (kelasObj && Array.isArray(jadwalPelajaranList) && jadwalPelajaranList.length > 0) {
        const foundJadwal = jadwalPelajaranList.find(j => {
          if (!j || !j.namaGuru || !j.namaGuru.trim()) return false;
          const gName = j.namaGuru.trim().toLowerCase();
          if (gName === 'guru pengampu' || gName === 'admin' || gName === '-' || gName === 'belum ditentukan' || gName === 'guru') return false;

          const matchK = isSameKelas(j.namaKelas, kelasObj.namaKelas) || 
                         (j.idKelas && (j.idKelas === kelasObj.id || isSameKelas(j.idKelas, kelasObj.namaKelas)));
          if (!matchK) return false;

          const jMId = (j.idMapel || '').trim().toLowerCase();
          const jMNorm = normalizeMapelName(j.namaMapel);

          return (jMId && (jMId === mId || (mKode && jMId === mKode))) ||
                 (jMNorm && (jMNorm === mNorm || (mKode && jMNorm === mKode) || j.namaMapel.trim().toLowerCase() === mapelObj.namaMapel.trim().toLowerCase()));
        });

        if (foundJadwal && foundJadwal.namaGuru) {
          const t = registeredTeachers.find(u => 
            (foundJadwal.idGuru && (u.id === foundJadwal.idGuru || u.idGuru === foundJadwal.idGuru || u.nipOrNis === foundJadwal.idGuru)) ||
            normalizeTeacherName(u.nama) === normalizeTeacherName(foundJadwal.namaGuru)
          );
          if (t) return { id: t.id, nama: t.nama, obj: t };
        }
      }

      return { id: 'guru-unknown', nama: mapelObj?.guruPengampu || explicitGuruNama || 'Guru Pengampu' };
    };

    // =========================================================================
    // 1. PRIMARY: SELURUH ROMBEL AKTIF & KURIKULUM RESMI (getMatchingMapelForKelas)
    // =========================================================================
    activeKelasList.forEach(kelasObj => {
      if (!isKelasActive(kelasObj, schoolInfo?.kejuruanList)) return;
      if (!isJurusanActive(kelasObj.jurusan || kelasObj.namaKelas, schoolInfo?.kejuruanList)) return;

      const classStudents = activeStudents.filter(s => 
        isSameKelas(s.kelas, kelasObj.namaKelas) || 
        isSameKelas(s.namaKelas, kelasObj.namaKelas) ||
        s.idKelas === kelasObj.id
      );
      const totalSiswa = classStudents.length;

      const classMapels: Mapel[] = getMatchingMapelForKelas(kelasObj, mapelList, classStudents);
      const activeClassMapels = classMapels.filter((m: Mapel) => m.status !== 'nonaktif' && m.aktif !== false);

      activeClassMapels.forEach((mapelObj: Mapel) => {
        const mapelNorm = normalizeMapelName(mapelObj.namaMapel);
        const kelasNorm = normalizeKelas(kelasObj.namaKelas).replace(/[^a-z0-9]/g, '');
        const slotKey = `${mapelNorm}::${kelasNorm}`;
        const canonKey = `${mapelObj.id}::${kelasObj.id}`;

        if (seenKeys.has(slotKey) || seenKeys.has(canonKey)) return;
        seenKeys.add(slotKey);
        seenKeys.add(canonKey);

        // Evaluasi nilai terlebih dahulu agar jika guru sudah menginput, namanya langsung dipakai
        const evaluated = evaluateClassGrades(
          mapelObj.id,
          mapelObj.namaMapel,
          kelasObj.id,
          kelasObj.namaKelas,
          undefined,
          mapelObj,
          kelasObj,
          totalSiswa,
          classStudents
        );

        const teacher = resolveOfficialTeacher(
          mapelObj, 
          kelasObj, 
          evaluated.recordedGuruNama, 
          evaluated.recordedGuruId
        );

        const formattedTeacherName = formatTeacherNameWithDegree(teacher.obj || teacher.nama, usersList);
        const officialJabatan = teacher.obj?.jabatanTambahan || 
          (teacher.obj?.role === 'kepala_sekolah' ? 'Kepala Sekolah' :
           teacher.obj?.role === 'operator' ? 'Operator IT & Dapodik' :
           teacher.obj?.role === 'bendahara' ? 'Bendahara Sekolah' :
           (teacher.obj?.isWalas ? 'Wali Kelas' : 'Guru Pengampu'));

        list.push({
          id: `asg-${mapelObj.id}-${kelasObj.id}`.replace(/[^a-zA-Z0-9_-]/g, '-'),
          idGuru: teacher.id,
          namaGuru: formattedTeacherName,
          jabatanGuru: officialJabatan,
          roleGuru: teacher.obj?.role,
          jurusanGuru: teacher.obj?.jurusan,
          nipGuru: teacher.obj?.nip || teacher.obj?.nipOrNis,
          teleponGuru: teacher.obj?.telepon,
          fotoGuru: teacher.obj?.fotoProfilUrl,
          idMapel: mapelObj.id,
          namaMapel: mapelObj.namaMapel,
          kodeMapel: mapelObj.kode,
          kelompokMapel: mapelObj.kelompok,
          idKelas: kelasObj.id,
          namaKelas: kelasObj.namaKelas,
          tingkatKelas: kelasObj.tingkat,
          jurusanKelas: kelasObj.jurusan,
          totalSiswa,
          siswaTerisi: evaluated.countWithAnyGrade,
          countFormatif: evaluated.countFormatif,
          countPts: evaluated.countPts,
          countPas: evaluated.countPas,
          countAkhir: evaluated.countAkhir,
          countDeskripsi: evaluated.countDeskripsi,
          persentase: evaluated.persentase,
          status: evaluated.status,
          rataRataNilaiAkhir: evaluated.rataRataNilaiAkhir,
        });
      });
    });

    // =========================================================================
    // 2. SECONDARY: JADWAL PELAJARAN KHUSUS YANG BELUM TERCATAT
    // =========================================================================
    jadwalPelajaranList.forEach(jadwal => {
      const gNama = (jadwal.namaGuru || '').trim();
      const mMapel = (jadwal.namaMapel || '').trim();
      const kNama = (jadwal.namaKelas || '').trim();
      if (!gNama || !mMapel || !kNama) return;

      const mapel = findCanonicalMapel(mMapel, jadwal.idMapel);
      const kelas = findCanonicalKelas(kNama, jadwal.idKelas);
      if (mapel.obj && (mapel.obj.status === 'nonaktif' || mapel.obj.aktif === false)) return;
      if (kelas.obj && !isKelasActive(kelas.obj, schoolInfo?.kejuruanList)) return;
      if (kelas.obj?.jurusan && !isJurusanActive(kelas.obj.jurusan, schoolInfo?.kejuruanList)) return;
      if (!isJurusanActive(kelas.nama, schoolInfo?.kejuruanList)) return;

      const mapelNorm = normalizeMapelName(mapel.nama);
      const kelasNorm = normalizeKelas(kelas.nama).replace(/[^a-z0-9]/g, '');
      const slotKey = `${mapelNorm}::${kelasNorm}`;
      const canonKey = `${mapel.id}::${kelas.id}`;

      if (seenKeys.has(slotKey) || seenKeys.has(canonKey)) return;
      seenKeys.add(slotKey);
      seenKeys.add(canonKey);

      const teacher = resolveOfficialTeacher(mapel.obj, kelas.obj, gNama, jadwal.idGuru);
      const classStudents = activeStudents.filter(s => 
        isSameKelas(s.kelas, kelas.nama) || isSameKelas(s.namaKelas, kelas.nama) || (kelas.obj && s.idKelas === kelas.obj.id)
      );
      const totalSiswa = classStudents.length;

      const evaluated = evaluateClassGrades(
        mapel.id, mapel.nama, kelas.id, kelas.nama,
        teacher.obj, mapel.obj, kelas.obj, totalSiswa, classStudents
      );

      const formattedTeacherName = formatTeacherNameWithDegree(teacher.obj || teacher.nama, usersList);
      const officialJabatan = teacher.obj?.jabatanTambahan || 
        (teacher.obj?.role === 'kepala_sekolah' ? 'Kepala Sekolah' :
         teacher.obj?.role === 'operator' ? 'Operator IT & Dapodik' :
         teacher.obj?.role === 'bendahara' ? 'Bendahara Sekolah' :
         (teacher.obj?.isWalas ? 'Wali Kelas' : 'Guru Pengampu'));

      list.push({
        id: `asg-${mapel.id}-${kelas.id}`.replace(/[^a-zA-Z0-9_-]/g, '-'),
        idGuru: teacher.id,
        namaGuru: formattedTeacherName,
        jabatanGuru: officialJabatan,
        roleGuru: teacher.obj?.role,
        jurusanGuru: teacher.obj?.jurusan,
        nipGuru: teacher.obj?.nip || teacher.obj?.nipOrNis,
        teleponGuru: teacher.obj?.telepon,
        fotoGuru: teacher.obj?.fotoProfilUrl,
        idMapel: mapel.id,
        namaMapel: mapel.nama,
        kodeMapel: mapel.obj?.kode,
        kelompokMapel: mapel.obj?.kelompok,
        idKelas: kelas.id,
        namaKelas: kelas.nama,
        tingkatKelas: kelas.obj?.tingkat,
        jurusanKelas: kelas.obj?.jurusan,
        totalSiswa,
        siswaTerisi: evaluated.countWithAnyGrade,
        countFormatif: evaluated.countFormatif,
        countPts: evaluated.countPts,
        countPas: evaluated.countPas,
        countAkhir: evaluated.countAkhir,
        countDeskripsi: evaluated.countDeskripsi,
        persentase: evaluated.persentase,
        status: evaluated.status,
        rataRataNilaiAkhir: evaluated.rataRataNilaiAkhir,
      });
    });

    // =========================================================================
    // 3. TERTIARY: NILAI YANG SUDAH DIINPUT UNTUK MAPEL LAINNYA
    // =========================================================================
    nilaiList.forEach(gradeItem => {
      if (!gradeItem || !hasActualScores(gradeItem)) return;
      const mMapel = (gradeItem.mapelNama || '').trim();
      const kNama = (gradeItem.kelas || '').trim();
      if (!mMapel || !kNama) return;

      const mapel = findCanonicalMapel(mMapel, gradeItem.mapelId);
      const kelas = findCanonicalKelas(kNama);
      if (mapel.obj && (mapel.obj.status === 'nonaktif' || mapel.obj.aktif === false)) return;
      if (kelas.obj && !isKelasActive(kelas.obj, schoolInfo?.kejuruanList)) return;
      if (kelas.obj?.jurusan && !isJurusanActive(kelas.obj.jurusan, schoolInfo?.kejuruanList)) return;
      if (!isJurusanActive(kelas.nama, schoolInfo?.kejuruanList)) return;

      const mapelNorm = normalizeMapelName(mapel.nama);
      const kelasNorm = normalizeKelas(kelas.nama).replace(/[^a-z0-9]/g, '');
      const slotKey = `${mapelNorm}::${kelasNorm}`;
      const canonKey = `${mapel.id}::${kelas.id}`;

      if (seenKeys.has(slotKey) || seenKeys.has(canonKey)) return;
      seenKeys.add(slotKey);
      seenKeys.add(canonKey);

      const teacher = resolveOfficialTeacher(mapel.obj, kelas.obj, gradeItem.guruPengampu, (gradeItem as any).idGuru);
      const classStudents = activeStudents.filter(s => 
        isSameKelas(s.kelas, kelas.nama) || isSameKelas(s.namaKelas, kelas.nama) || (kelas.obj && s.idKelas === kelas.obj.id)
      );
      const totalSiswa = classStudents.length;

      const evaluated = evaluateClassGrades(
        mapel.id, mapel.nama, kelas.id, kelas.nama,
        teacher.obj, mapel.obj, kelas.obj, totalSiswa, classStudents
      );

      const formattedTeacherName = formatTeacherNameWithDegree(teacher.obj || teacher.nama, usersList);
      const officialJabatan = teacher.obj?.jabatanTambahan || 
        (teacher.obj?.role === 'kepala_sekolah' ? 'Kepala Sekolah' :
         teacher.obj?.role === 'operator' ? 'Operator IT & Dapodik' :
         teacher.obj?.role === 'bendahara' ? 'Bendahara Sekolah' :
         (teacher.obj?.isWalas ? 'Wali Kelas' : 'Guru Pengampu'));

      list.push({
        id: `asg-${mapel.id}-${kelas.id}`.replace(/[^a-zA-Z0-9_-]/g, '-'),
        idGuru: teacher.id,
        namaGuru: formattedTeacherName,
        jabatanGuru: officialJabatan,
        roleGuru: teacher.obj?.role,
        jurusanGuru: teacher.obj?.jurusan,
        nipGuru: teacher.obj?.nip || teacher.obj?.nipOrNis,
        teleponGuru: teacher.obj?.telepon,
        fotoGuru: teacher.obj?.fotoProfilUrl,
        idMapel: mapel.id,
        namaMapel: mapel.nama,
        kodeMapel: mapel.obj?.kode,
        kelompokMapel: mapel.obj?.kelompok,
        idKelas: kelas.id,
        namaKelas: kelas.nama,
        tingkatKelas: kelas.obj?.tingkat,
        jurusanKelas: kelas.obj?.jurusan,
        totalSiswa,
        siswaTerisi: evaluated.countWithAnyGrade,
        countFormatif: evaluated.countFormatif,
        countPts: evaluated.countPts,
        countPas: evaluated.countPas,
        countAkhir: evaluated.countAkhir,
        countDeskripsi: evaluated.countDeskripsi,
        persentase: evaluated.persentase,
        status: evaluated.status,
        rataRataNilaiAkhir: evaluated.rataRataNilaiAkhir,
      });
    });

    // =========================================================================
    // 4. FINAL STRICT DEDUPLICATION PASS (SATU PENUGASAN PER MAPEL & KELAS)
    // =========================================================================
    const deduplicatedList: TeacherSubjectClassAssignment[] = [];
    const finalSeen = new Set<string>();

    list.forEach(item => {
      const mNorm = normalizeMapelName(item.namaMapel);
      const kNorm = normalizeKelas(item.namaKelas).replace(/[^a-z0-9]/g, '');
      const superKey = `${mNorm}::${kNorm}`;

      if (finalSeen.has(superKey)) {
        const existingIdx = deduplicatedList.findIndex(x => {
          return `${normalizeMapelName(x.namaMapel)}::${normalizeKelas(x.namaKelas).replace(/[^a-z0-9]/g, '')}` === superKey;
        });
        if (existingIdx >= 0) {
          const ex = deduplicatedList[existingIdx];
          const itemHasRealTeacher = item.idGuru && item.idGuru !== 'guru-unknown' && item.namaGuru !== 'Guru Pengampu';
          const exHasRealTeacher = ex.idGuru && ex.idGuru !== 'guru-unknown' && ex.namaGuru !== 'Guru Pengampu';

          if ((item.siswaTerisi > ex.siswaTerisi) || (item.persentase > ex.persentase) || (!exHasRealTeacher && itemHasRealTeacher)) {
            deduplicatedList[existingIdx] = {
              ...item,
              namaGuru: itemHasRealTeacher ? item.namaGuru : (exHasRealTeacher ? ex.namaGuru : item.namaGuru),
              idGuru: itemHasRealTeacher ? item.idGuru : (exHasRealTeacher ? ex.idGuru : item.idGuru),
              jabatanGuru: item.jabatanGuru || ex.jabatanGuru,
            };
          }
        }
        return;
      }

      finalSeen.add(superKey);
      deduplicatedList.push(item);
    });

    // Sort by status (Belum Mengisi first so admin can take action, then Sedang, then Tuntas), then teacher name
    return deduplicatedList.sort((a, b) => {
      const order = { 'Belum Mengisi': 0, 'Sedang Mengisi': 1, 'Tuntas': 2 };
      if (order[a.status] !== order[b.status]) {
        return order[a.status] - order[b.status];
      }
      return a.namaGuru.localeCompare(b.namaGuru);
    });
  }, [teachersList, mapelList, kelasList, activeStudents, nilaiList, jadwalPelajaranList, schoolInfo]);

  // Overall Statistics
  const stats = useMemo(() => {
    const totalRombelMapel = assignments.length;
    const tuntasCount = assignments.filter(a => a.status === 'Tuntas').length;
    const sedangCount = assignments.filter(a => a.status === 'Sedang Mengisi').length;
    const belumCount = assignments.filter(a => a.status === 'Belum Mengisi').length;
    const uniqueTeachers = new Set(assignments.map(a => normalizeTeacherName(a.namaGuru) || a.idGuru)).size;
    const totalSiswaExpected = assignments.reduce((acc, a) => acc + a.totalSiswa, 0);
    const totalSiswaTerisi = assignments.reduce((acc, a) => acc + a.siswaTerisi, 0);
    const persentaseSekolah = totalSiswaExpected > 0 ? Math.round((totalSiswaTerisi / totalSiswaExpected) * 100) : 0;

    return {
      totalRombelMapel,
      tuntasCount,
      sedangCount,
      belumCount,
      uniqueTeachers,
      totalSiswaExpected,
      totalSiswaTerisi,
      persentaseSekolah
    };
  }, [assignments]);

  // Set of classes that have active/scheduled exams
  const examClassNames = useMemo(() => {
    const names = new Set<string>();
    (ujianList || []).forEach(u => {
      const targets = u.targetKelas || u.kelasTarget || [];
      targets.forEach(t => {
        if (t) {
          names.add(t.trim().toLowerCase());
          names.add(t.trim().toLowerCase().replace(/^kelas\s+/i, ''));
        }
      });
    });
    (jadwalUjianList || []).forEach(ju => {
      if (ju.namaKelas) {
        names.add(ju.namaKelas.trim().toLowerCase());
        names.add(ju.namaKelas.trim().toLowerCase().replace(/^kelas\s+/i, ''));
      }
      if (ju.idKelas) {
        const k = kelasList.find(c => c.id === ju.idKelas);
        if (k) {
          names.add(k.namaKelas.trim().toLowerCase());
          names.add(k.namaKelas.trim().toLowerCase().replace(/^kelas\s+/i, ''));
        }
      }
    });
    (hasilList || []).forEach(h => {
      if (h.namaKelas) {
        names.add(h.namaKelas.trim().toLowerCase());
        names.add(h.namaKelas.trim().toLowerCase().replace(/^kelas\s+/i, ''));
      }
    });
    return names;
  }, [ujianList, jadwalUjianList, hasilList, kelasList]);

  const isClassTakingExam = (kNama?: string, kId?: string): boolean => {
    if (!kNama && !kId) return false;
    const cleanK = (kNama || '').trim().toLowerCase();
    const cleanWithoutKelas = cleanK.replace(/^kelas\s+/i, '');
    if (examClassNames.has(cleanK) || examClassNames.has(cleanWithoutKelas)) return true;
    if (kId && examClassNames.has(kId.toLowerCase())) return true;
    return false;
  };

  // Distinct Jurusans available from kelasList & schoolInfo (Hanya yang AKTIF)
  const distinctJurusans = useMemo(() => {
    const set = new Set<string>();
    const activeClasses = getActiveClasses(kelasList, schoolInfo?.kejuruanList);
    activeClasses.forEach(k => {
      if (k.jurusan && isJurusanActive(k.jurusan, schoolInfo?.kejuruanList)) {
        set.add(k.jurusan);
      }
    });
    if (schoolInfo?.kejuruanList) {
      schoolInfo.kejuruanList.forEach(kj => {
        if (kj.nama && isJurusanActive(kj.nama, schoolInfo?.kejuruanList)) {
          set.add(kj.nama);
        }
      });
    }
    if (set.size === 0) {
      const defaultJur = ['Farmasi', 'Asisten Keperawatan', 'Tata Kecantikan & Spa', 'Perhotelan'];
      return defaultJur.filter(j => isJurusanActive(j, schoolInfo?.kejuruanList));
    }
    return Array.from(set);
  }, [kelasList, schoolInfo]);

  // Combinatorial pairs of Jurusan (hanya pasangan jurusan yang dua-duanya AKTIF)
  const jurPairs = useMemo(() => {
    const pairs = [
      { label: 'Farmasi & Askep', fullLabel: 'Farmasi dan Asisten Keperawatan', jurusans: ['Farmasi', 'Asisten Keperawatan'] },
      { label: 'Kecantikan & Perhotelan', fullLabel: 'Tata Kecantikan & Spa dan Perhotelan', jurusans: ['Tata Kecantikan & Spa', 'Perhotelan'] },
      { label: 'Farmasi & Kecantikan', fullLabel: 'Farmasi dan Tata Kecantikan & Spa', jurusans: ['Farmasi', 'Tata Kecantikan & Spa'] },
      { label: 'Askep & Perhotelan', fullLabel: 'Asisten Keperawatan dan Perhotelan', jurusans: ['Asisten Keperawatan', 'Perhotelan'] },
      { label: 'Farmasi & Perhotelan', fullLabel: 'Farmasi dan Perhotelan', jurusans: ['Farmasi', 'Perhotelan'] },
      { label: 'Askep & Kecantikan', fullLabel: 'Asisten Keperawatan dan Tata Kecantikan & Spa', jurusans: ['Asisten Keperawatan', 'Tata Kecantikan & Spa'] },
    ];
    return pairs.filter(p => p.jurusans.every(j => isJurusanActive(j, schoolInfo?.kejuruanList)));
  }, [schoolInfo]);

  // Combinatorial triplets of Jurusan (hanya triplet jurusan yang semuanya AKTIF)
  const jurTriplets = useMemo(() => {
    const triplets = [
      { label: 'Farmasi, Askep & Kecantikan', fullLabel: 'Farmasi, Asisten Keperawatan & Kecantikan', jurusans: ['Farmasi', 'Asisten Keperawatan', 'Tata Kecantikan & Spa'] },
      { label: 'Farmasi, Askep & Perhotelan', fullLabel: 'Farmasi, Asisten Keperawatan & Perhotelan', jurusans: ['Farmasi', 'Asisten Keperawatan', 'Perhotelan'] },
      { label: 'Farmasi, Kecantikan & Perhotelan', fullLabel: 'Farmasi, Tata Kecantikan & Perhotelan', jurusans: ['Farmasi', 'Tata Kecantikan & Spa', 'Perhotelan'] },
      { label: 'Askep, Kecantikan & Perhotelan', fullLabel: 'Asisten Keperawatan, Tata Kecantikan & Perhotelan', jurusans: ['Asisten Keperawatan', 'Tata Kecantikan & Spa', 'Perhotelan'] },
    ];
    return triplets.filter(t => t.jurusans.every(j => isJurusanActive(j, schoolInfo?.kejuruanList)));
  }, [schoolInfo]);

  // Standard combinations for Tingkat / Kelas requested by user
  const tingkatOptions = useMemo(() => [
    { key: 'semua', label: 'Semua Kelas', fullLabel: 'Semua Kelas (X, XI, XII)', list: ['X', 'XI', 'XII'] },
    { key: 'x', label: 'Kelas X', fullLabel: 'Kelas X', list: ['X'] },
    { key: 'xi', label: 'Kelas XI', fullLabel: 'Kelas XI', list: ['XI'] },
    { key: 'xii', label: 'Kelas XII', fullLabel: 'Kelas XII', list: ['XII'] },
    { key: 'x_xi', label: 'Kelas X dan XI', fullLabel: 'Kelas X dan XI', list: ['X', 'XI'] },
    { key: 'xi_xii', label: 'Kelas XI dan XII', fullLabel: 'Kelas XI dan XII', list: ['XI', 'XII'] },
    { key: 'x_xii', label: 'Kelas X dan XII', fullLabel: 'Kelas X dan XII', list: ['X', 'XII'] },
  ], []);

  // Helper function to match jurusan including Phase E health foundation (X Kesehatan)
  const matchesJurusan = (jurusanKelas?: string, namaKelas?: string, targetJurusans?: string[]) => {
    if (!targetJurusans || targetJurusans.length === 0) return true;
    const jK = (jurusanKelas || '').toLowerCase();
    const nK = (namaKelas || '').toLowerCase();
    return targetJurusans.some(target => {
      const tj = target.toLowerCase();
      if (jK.includes(tj) || nK.includes(tj)) return true;
      // Health foundation for Grade X (X Kesehatan covers Farmasi & Keperawatan)
      if ((tj.includes('farmasi') || tj.includes('keperawatan') || tj.includes('perawat')) && (jK.includes('kesehatan') || nK.includes('kesehatan'))) {
        return true;
      }
      return false;
    });
  };

  // Classes dynamically filtered by selected Tingkat & Jurusan & Exam status for the dropdown and multi-select (MUTLAK HANYA KELAS AKTIF)
  const availableClassOptions = useMemo(() => {
    return kelasList.filter(k => {
      // Pastikan rombel dan jurusannya aktif
      if (!isKelasActive(k, schoolInfo?.kejuruanList)) {
        return false;
      }

      // Tingkat Filter (dropdown or multi-select)
      const itemTingkat = k.tingkat || (k.namaKelas.startsWith('XII') ? 'XII' : k.namaKelas.startsWith('XI') ? 'XI' : k.namaKelas.startsWith('X') ? 'X' : '');
      if (selectedTingkatans.length > 0 && selectedTingkatans.length < 3 && !selectedTingkatans.includes(itemTingkat)) {
        return false;
      }

      // Jurusan Filter (dropdown or multi-select or combo)
      const targetJurs = selectedJurusans.length > 0 ? selectedJurusans : (filterJurusan !== 'Semua' ? [filterJurusan] : []);
      if (!matchesJurusan(k.jurusan, k.namaKelas, targetJurs)) {
        return false;
      }

      // Exam Status Filter
      const isExam = isClassTakingExam(k.namaKelas, k.id);
      if (filterUjianMode === 'hanya_ujian' || filterUjianOnly) {
        if (!isExam) return false;
      } else if (filterUjianMode === 'tanpa_ujian') {
        if (isExam) return false;
      }

      return true;
    });
  }, [kelasList, schoolInfo, selectedTingkatans, filterJurusan, selectedJurusans, filterUjianMode, filterUjianOnly, examClassNames]);

  // Filtered assignments
  const filteredAssignments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const tokens = q ? q.split(/\s+/).filter(Boolean) : [];

    return assignments.filter(item => {
      // 1. Status Filter
      if (filterStatus !== 'Semua' && item.status !== filterStatus) {
        return false;
      }

      // 2. Tingkat Filter (Semua Kelas, Kelas X, XI, XII, X dan XI, XI dan XII, X dan XII)
      const itemTingkat = item.tingkatKelas || 
        (item.namaKelas.startsWith('XII') ? 'XII' : 
         item.namaKelas.startsWith('XI') ? 'XI' : 
         item.namaKelas.startsWith('X') ? 'X' : '');

      if (selectedTingkatans.length > 0 && selectedTingkatans.length < 3 && !selectedTingkatans.includes(itemTingkat)) {
        return false;
      }

      // 3. Jurusan Filter (Semua Jurusan, Jurusan Tunggal, Kombinasi Jurusan, atau Beberapa Jurusan)
      const targetJurs = selectedJurusans.length > 0 ? selectedJurusans : (filterJurusan !== 'Semua' ? [filterJurusan] : []);
      if (!matchesJurusan(item.jurusanKelas, item.namaKelas, targetJurs)) {
        return false;
      }

      // 4. Kelas yang Ujian Mode Filter (Semua, Hanya Ujian, atau Tanpa Ujian)
      const isExam = isClassTakingExam(item.namaKelas, item.idKelas);
      if (filterUjianMode === 'hanya_ujian' || filterUjianOnly) {
        if (!isExam) return false;
      } else if (filterUjianMode === 'tanpa_ujian') {
        if (isExam) return false;
      }

      // 5. Specific Kelas / Rombel Filter (Single or Multi-select "Beberapa Kelas")
      if (filterKelas !== 'Semua' && !isSameKelas(item.namaKelas, filterKelas) && item.idKelas !== filterKelas) {
        return false;
      }
      if (selectedKelasList.length > 0) {
        const matchesAnyKelas = selectedKelasList.some(k => isSameKelas(item.namaKelas, k) || item.idKelas === k);
        if (!matchesAnyKelas) return false;
      }

      // 6. Guru Filter
      if (filterGuru !== 'Semua') {
        const matchesGuru = item.namaGuru === filterGuru || 
                            item.idGuru === filterGuru || 
                            normalizeTeacherName(item.namaGuru) === normalizeTeacherName(filterGuru);
        if (!matchesGuru) return false;
      }

      // 7. Search Query Tokens
      if (tokens.length > 0) {
        const text = [
          item.namaGuru,
          item.nipGuru,
          item.namaMapel,
          item.kodeMapel,
          item.namaKelas,
          item.jurusanKelas,
          item.status
        ].filter(Boolean).join(' ').toLowerCase();

        if (!tokens.every(t => text.includes(t))) {
          return false;
        }
      }

      return true;
    });
  }, [
    assignments, 
    searchQuery, 
    filterStatus, 
    filterTingkat, 
    selectedTingkatans,
    filterJurusan, 
    selectedJurusans,
    filterUjianOnly, 
    filterUjianMode,
    filterKelas, 
    selectedKelasList,
    filterGuru, 
    examClassNames
  ]);

  // Generate WhatsApp reminder text
  const generateWhatsAppReminder = (assignment: TeacherSubjectClassAssignment) => {
    const schoolName = schoolInfo?.nama || 'SMK Bakti Putra Mandiri';
    const text = `Assalamu'alaikum Wr. Wb. Yth. Bpk/Ibu ${assignment.namaGuru},

Mengingatkan kembali terkait agenda pelaporan capaian hasil belajar (Raport) ${schoolName}:
📚 Mata Pelajaran: *${assignment.namaMapel}*
🏫 Kelas/Rombel: *${assignment.namaKelas}*
📊 Progres Pengisian: *${assignment.siswaTerisi} dari ${assignment.totalSiswa} Siswa (${assignment.persentase}%)*
Status: *${assignment.status}*

Mohon kesediaan Bpk/Ibu guru untuk segera melengkapi pengisian nilai di Portal Guru SMK Bakti Putra Mandiri sebelum batas waktu verifikasi leger nilai.

Atas kerja sama dan dedikasi Bpk/Ibu, kami ucapkan terima kasih.
_Wassalamu'alaikum Wr. Wb._
*Admin & Kurikulum ${schoolName}*`;

    return text;
  };

  const handleCopyReminder = (assignment: TeacherSubjectClassAssignment) => {
    const text = generateWhatsAppReminder(assignment);
    navigator.clipboard.writeText(text);
    setCopiedNotice(assignment.id);
    setTimeout(() => setCopiedNotice(null), 3000);
  };

  const handleOpenWhatsApp = (assignment: TeacherSubjectClassAssignment) => {
    const text = encodeURIComponent(generateWhatsAppReminder(assignment));
    const phone = (assignment.teleponGuru || '').replace(/[^0-9]/g, '');
    const cleanPhone = phone.startsWith('0') ? `62${phone.slice(1)}` : phone;
    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${text}`, '_blank');
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'No',
      'Guru Pengampu',
      'NIP/ID',
      'Mata Pelajaran',
      'Kode Mapel',
      'Kelas/Rombel',
      'Total Siswa',
      'Siswa Terisi',
      'Formatif/LM Terisi',
      'PTS Terisi',
      'PAS/PAT Terisi',
      'Nilai Akhir Terisi',
      'Persentase Progres',
      'Status Pengisian',
      'Rata-rata Nilai Akhir'
    ];

    const rows = filteredAssignments.map((a, i) => [
      i + 1,
      `"${a.namaGuru}"`,
      `"${a.nipGuru || '-'}"`,
      `"${a.namaMapel}"`,
      `"${a.kodeMapel || '-'}"`,
      `"${a.namaKelas}"`,
      a.totalSiswa,
      a.siswaTerisi,
      a.countFormatif,
      a.countPts,
      a.countPas,
      a.countAkhir,
      `${a.persentase}%`,
      `"${a.status}"`,
      a.rataRataNilaiAkhir || '-'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + 
      [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Monitoring_Pengisian_Nilai_Guru_${getLocalDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Detailed student list for selected assignment modal
  const selectedClassStudents = useMemo(() => {
    if (!selectedAssignment) return [];

    const kNama = selectedAssignment.namaKelas;
    const mId = selectedAssignment.idMapel;
    const mMapel = selectedAssignment.namaMapel;

    const classStudents = activeStudents.filter(s => 
      isSameKelas(s.kelas, kNama) || 
      isSameKelas(s.namaKelas, kNama) ||
      s.idKelas === selectedAssignment.idKelas
    );

    const classGrades = nilaiList.filter(n => {
      const matchMapel = (mId && n.mapelId === mId) || 
                         (n.mapelNama && n.mapelNama.trim().toLowerCase() === mMapel.toLowerCase());
      const matchKls = isSameKelas(n.kelas, kNama) || n.kelas === selectedAssignment.idKelas;
      return matchMapel && matchKls;
    });

    return classStudents.map((st, idx) => {
      const g = classGrades.find(grade => isRecordForStudent(grade as any, st));
      return {
        no: idx + 1,
        student: st,
        grade: g || null,
        isFilled: Boolean(g && (Number(g.nilaiAkhir) > 0 || Number(g.nilaiPts) > 0 || Number(g.nilaiPas) > 0 || Number(g.nilaiFormatif) > 0 || Number(g.lm1) > 0))
      };
    });
  }, [selectedAssignment, activeStudents, nilaiList]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-200">
              <GraduationCap className="w-6 h-6 text-amber-600" />
            </span>
            <div className="inline-flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Monitoring Pengisian Nilai Guru
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Live Sinkron Cloud
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl">
            Pantau kemajuan input nilai raport, formatif/LM, PTS, dan PAS oleh seluruh guru mata pelajaran per rombel kelas secara langsung & real-time.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSyncWithDataGuru}
            disabled={isSyncingWithDataGuru}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
            title="Sinkronkan penugasan seluruh guru pengampu di Monitoring Nilai dengan Data Guru & Cadangan Database"
          >
            <GraduationCap className={`w-3.5 h-3.5 ${isSyncingWithDataGuru ? 'animate-bounce' : ''}`} />
            <span>{isSyncingWithDataGuru ? 'Menyelaraskan...' : 'Sinkronkan dengan Data Guru'}</span>
          </button>

          {onPullAllFromCloud && (
            <button
              type="button"
              onClick={handleRefreshCloud}
              disabled={isRefreshingCloud}
              className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
              title="Ambil pembaruan nilai terbaru yang diinput guru dari Cloud Firestore"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isRefreshingCloud ? 'animate-spin' : ''}`} />
              <span>{isRefreshingCloud ? 'Memuat Cloud...' : 'Muat Ulang dari Cloud'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            title="Export Rekapitulasi Progres ke File CSV / Excel"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="Cetak Laporan Monitoring Resmi untuk Kepala Sekolah & Kurikulum"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Laporan</span>
          </button>
        </div>
      </div>

      {syncSuccessNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncSuccessNotice}</span>
          </div>
          <button type="button" onClick={() => setSyncSuccessNotice(null)} className="text-emerald-700 hover:text-emerald-950 font-bold px-2 py-0.5 rounded-lg hover:bg-emerald-100">✕</button>
        </div>
      )}

      {refreshNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-semibold flex items-center justify-between">
          <span>✅ {refreshNotice}</span>
          <button type="button" onClick={() => setRefreshNotice(null)} className="text-emerald-700 font-bold px-2">✕</button>
        </div>
      )}

      {reassignSuccessNotice && (
        <div className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-950 rounded-2xl text-xs font-semibold flex items-center justify-between">
          <span>🎉 {reassignSuccessNotice}</span>
          <button type="button" onClick={() => setReassignSuccessNotice(null)} className="text-indigo-700 font-bold px-2">✕</button>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 print:hidden">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs text-center space-y-1">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Total Rombel-Mapel</div>
          <div className="text-2xl font-black text-slate-900">{stats.totalRombelMapel}</div>
          <div className="text-[10px] text-slate-400 font-medium">{stats.uniqueTeachers} Guru Pengampu</div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-xs text-center space-y-1">
          <div className="text-[11px] font-bold text-emerald-800 uppercase flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tuntas (100%)</span>
          </div>
          <div className="text-2xl font-black text-emerald-900">{stats.tuntasCount}</div>
          <div className="text-[10px] text-emerald-700 font-bold">
            {stats.totalRombelMapel > 0 ? Math.round((stats.tuntasCount / stats.totalRombelMapel) * 100) : 0}% Rombel
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-xs text-center space-y-1">
          <div className="text-[11px] font-bold text-amber-800 uppercase flex items-center justify-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Sedang Mengisi</span>
          </div>
          <div className="text-2xl font-black text-amber-900">{stats.sedangCount}</div>
          <div className="text-[10px] text-amber-700 font-medium">Progres Sebagian</div>
        </div>

        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 shadow-xs text-center space-y-1">
          <div className="text-[11px] font-bold text-rose-800 uppercase flex items-center justify-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Belum Mengisi (0%)</span>
          </div>
          <div className="text-2xl font-black text-rose-900">{stats.belumCount}</div>
          <div className="text-[10px] text-rose-700 font-medium">Perlu Diberi Pengingat</div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 shadow-xs text-center space-y-1">
          <div className="text-[11px] font-bold text-blue-800 uppercase">Siswa Terinput</div>
          <div className="text-2xl font-black text-blue-900">{stats.totalSiswaTerisi}</div>
          <div className="text-[10px] text-blue-700 font-medium">dari {stats.totalSiswaExpected} target</div>
        </div>

        <div className="bg-gradient-to-br from-violet-600 to-indigo-700 text-white rounded-2xl p-4 shadow-xs text-center space-y-1">
          <div className="text-[11px] font-bold text-indigo-200 uppercase">Progres Sekolah</div>
          <div className="text-2xl font-black">{stats.persentaseSekolah}%</div>
          <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden mt-1">
            <div 
              className="bg-emerald-400 h-full rounded-full transition-all duration-500" 
              style={{ width: `${stats.persentaseSekolah}%` }} 
            />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3 print:hidden">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari guru, mata pelajaran, NIP, rombel kelas..."
              className="w-full pl-10 pr-8 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs w-4 h-4 rounded-full flex items-center justify-center bg-slate-100"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Filter Buttons */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setFilterStatus('Semua')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterStatus === 'Semua' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({assignments.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('Belum Mengisi')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterStatus === 'Belum Mengisi' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-700 hover:text-rose-900'
              }`}
            >
              Belum ({stats.belumCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('Sedang Mengisi')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterStatus === 'Sedang Mengisi' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-700 hover:text-amber-900'
              }`}
            >
              Sedang ({stats.sedangCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('Tuntas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterStatus === 'Tuntas' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:text-emerald-900'
              }`}
            >
              Tuntas ({stats.tuntasCount})
            </button>
          </div>
        </div>

        {/* Second Row: Filter Presets & Combinations */}
        <div className="space-y-2.5 pt-2 border-t border-slate-100 text-xs">
          {/* Quick Presets Row 1: Status Ujian & Rombel Utama */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 mr-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Status Ujian:</span>
            </span>

            {/* Filter Kelas yang Ujian */}
            <button
              type="button"
              onClick={() => {
                const nextMode = filterUjianMode === 'hanya_ujian' ? 'semua' : 'hanya_ujian';
                setFilterUjianMode(nextMode);
                setFilterUjianOnly(nextMode === 'hanya_ujian');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterUjianMode === 'hanya_ujian' || filterUjianOnly
                  ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-400'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
              }`}
              title="Filter khusus kelas/rombel yang memiliki agenda atau jadwal ujian (CAT HOTS)"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>🔥 Kelas yang Ujian</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${filterUjianMode === 'hanya_ujian' || filterUjianOnly ? 'bg-white text-rose-700' : 'bg-rose-200 text-rose-800'}`}>
                {assignments.filter(a => isClassTakingExam(a.namaKelas, a.idKelas)).length}
              </span>
            </button>

            {/* Filter Kelas Tanpa Jadwal Ujian */}
            <button
              type="button"
              onClick={() => {
                const nextMode = filterUjianMode === 'tanpa_ujian' ? 'semua' : 'tanpa_ujian';
                setFilterUjianMode(nextMode);
                setFilterUjianOnly(false);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterUjianMode === 'tanpa_ujian'
                  ? 'bg-slate-800 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
              title="Tampilkan kelas yang tidak memiliki agenda ujian aktif"
            >
              Kelas Tanpa Jadwal Ujian
            </button>

            {/* Preset: Semua Rombel */}
            <button
              type="button"
              onClick={() => {
                setFilterTingkat('Semua');
                setSelectedTingkatans(['X', 'XI', 'XII']);
                setFilterJurusan('Semua');
                setSelectedJurusans([]);
                setFilterKelas('Semua');
                setSelectedKelasList([]);
                setFilterUjianOnly(false);
                setFilterUjianMode('semua');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterTingkat === 'Semua' && selectedTingkatans.length === 3 && filterJurusan === 'Semua' && selectedJurusans.length === 0 && filterKelas === 'Semua' && selectedKelasList.length === 0 && filterUjianMode === 'semua' && !filterUjianOnly
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Semua Rombel (Reset)
            </button>

            <span className="text-slate-300 mx-1 hidden sm:inline">|</span>

            {/* Toggle Panel Pilih Beberapa Kelas / Jurusan */}
            <button
              type="button"
              onClick={() => setShowMultiSelectPanel(!showMultiSelectPanel)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                showMultiSelectPanel || selectedJurusans.length > 0 || selectedKelasList.length > 0
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}
              title="Buka panel checklist pemilihan multi-kelas dan multi-jurusan"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Beberapa Kelas / Jurusan</span>
              {(selectedJurusans.length > 0 || selectedKelasList.length > 0) && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-white text-emerald-800">
                  {selectedJurusans.length + selectedKelasList.length} dipilih
                </span>
              )}
            </button>
          </div>

          {/* Quick Presets Row 2: Filter Tingkat & Kelas (Semua Kelas, Kelas X, XI, XII, X & XI, XI & XII, X & XII) */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-extrabold uppercase text-indigo-700 mr-1 flex items-center gap-1 bg-indigo-50 px-1.5 py-0.5 rounded">
              <span>Kelas / Tingkat:</span>
            </span>

            {tingkatOptions.map(opt => {
              const isActive =
                opt.list.length === 3
                  ? selectedTingkatans.length === 3
                  : opt.list.length === 1
                  ? selectedTingkatans.length === 1 && selectedTingkatans[0] === opt.list[0]
                  : selectedTingkatans.length === 2 && selectedTingkatans.includes(opt.list[0]) && selectedTingkatans.includes(opt.list[1]);

              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    setSelectedTingkatans(opt.list);
                    setFilterTingkat(opt.key === 'semua' ? 'Semua' : (opt.list.length === 1 ? opt.list[0] : opt.key));
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-2xs ring-1 ring-indigo-400'
                      : 'bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/60'
                  }`}
                  title={`Tampilkan ${opt.fullLabel}`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Quick Presets Row 3: Filter Jurusan (Semua Jurusan, Satuan, dan Kombinasi 2 Jurusan) */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-extrabold uppercase text-emerald-700 mr-1 flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded">
              <span>Jurusan:</span>
            </span>

            {/* Semua Jurusan */}
            <button
              type="button"
              onClick={() => {
                setSelectedJurusans([]);
                setFilterJurusan('Semua');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedJurusans.length === 0 && filterJurusan === 'Semua'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80'
              }`}
            >
              Semua Jurusan
            </button>

            {/* Individual Distinct Jurusan Chips */}
            {distinctJurusans.map(j => {
              const isChecked = (selectedJurusans.length === 1 && selectedJurusans[0] === j) || (selectedJurusans.length === 0 && filterJurusan === j);
              const shortLabel = j.replace('Asisten ', '').replace(' & Spa', '');
              return (
                <button
                  key={j}
                  type="button"
                  onClick={() => {
                    setSelectedJurusans([j]);
                    setFilterJurusan(j);
                  }}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isChecked
                      ? 'bg-emerald-600 text-white shadow-2xs ring-1 ring-emerald-400'
                      : 'bg-emerald-50/50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60'
                  }`}
                  title={`Filter khusus jurusan ${j}`}
                >
                  {shortLabel}
                </button>
              );
            })}

            <span className="text-slate-300 mx-0.5 hidden md:inline">|</span>

            {/* Jurusan Combinatorial Pairs (Pola yang sama dengan kombinasi kelas) */}
            {jurPairs.map(p => {
              const isActive = selectedJurusans.length === 2 && selectedJurusans.includes(p.jurusans[0]) && selectedJurusans.includes(p.jurusans[1]);
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setSelectedJurusans(p.jurusans);
                    setFilterJurusan(p.fullLabel);
                  }}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-teal-600 text-white shadow-2xs ring-1 ring-teal-400'
                      : 'bg-teal-50/60 hover:bg-teal-100 text-teal-800 border border-teal-200/70'
                  }`}
                  title={`Filter kombinasi: ${p.fullLabel}`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Interactive Multi-Select Panel for Beberapa Kelas & Beberapa Jurusan */}
          {showMultiSelectPanel && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-fade-in">
              {/* Row 1: Pilih Beberapa Jurusan */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-[11px] text-slate-700 uppercase tracking-wide flex items-center gap-1">
                    <span>Pilih Beberapa Jurusan / Program Keahlian:</span>
                  </span>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setSelectedJurusans([...distinctJurusans])}
                      className="text-emerald-700 hover:underline font-semibold cursor-pointer"
                    >
                      Pilih Semua Jurusan
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedJurusans([]);
                        setFilterJurusan('Semua');
                      }}
                      className="text-slate-500 hover:underline font-semibold cursor-pointer"
                    >
                      Semua (Reset)
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedJurusans([]);
                      setFilterJurusan('Semua');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedJurusans.length === 0 && filterJurusan === 'Semua'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    Semua Jurusan
                  </button>

                  {distinctJurusans.map(jur => {
                    const isChecked = selectedJurusans.includes(jur) || filterJurusan === jur;
                    return (
                      <button
                        key={jur}
                        type="button"
                        onClick={() => {
                          if (selectedJurusans.includes(jur)) {
                            setSelectedJurusans(selectedJurusans.filter(j => j !== jur));
                          } else {
                            setSelectedJurusans([...selectedJurusans, jur]);
                          }
                          setFilterJurusan('Semua');
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          isChecked
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80'
                        }`}
                      >
                        <span>{isChecked ? '✓' : '+'}</span>
                        <span>{jur}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Preset Cepat Kombinasi 2 Jurusan & 3 Jurusan */}
                <div className="pt-1.5 flex flex-wrap items-center gap-1 text-[11px]">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Pilih 2 Jurusan:</span>
                  {jurPairs.map(p => {
                    const isSelected = p.jurusans.every(j => selectedJurusans.includes(j)) && selectedJurusans.length === p.jurusans.length;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => {
                          setSelectedJurusans(p.jurusans);
                          setFilterJurusan(p.fullLabel);
                        }}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-emerald-700 text-white shadow-xs'
                            : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-1 flex flex-wrap items-center gap-1 text-[11px]">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase">Pilih 3 Jurusan:</span>
                  {jurTriplets.map(t => {
                    const isSelected = t.jurusans.every(j => selectedJurusans.includes(j)) && selectedJurusans.length === t.jurusans.length;
                    return (
                      <button
                        key={t.label}
                        type="button"
                        onClick={() => {
                          setSelectedJurusans(t.jurusans);
                          setFilterJurusan(t.fullLabel);
                        }}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-emerald-700 text-white shadow-xs'
                            : 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200 border border-emerald-300 font-bold'
                        }`}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 2: Pilih Beberapa Kelas / Rombel Spesifik (1, 2, atau 3 Kelas) */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-[11px] text-slate-700 uppercase tracking-wide flex items-center gap-1">
                    <span>Pilih Beberapa Rombel / Kelas ({availableClassOptions.length} tersedia):</span>
                    {selectedKelasList.length > 0 && (
                      <span className="bg-indigo-100 text-indigo-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1">
                        {selectedKelasList.length} Kelas Dipilih
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setSelectedKelasList(availableClassOptions.map(k => k.namaKelas))}
                      className="text-indigo-700 hover:underline font-semibold cursor-pointer"
                    >
                      Pilih Semua Kelas Ini
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedKelasList([]);
                        setFilterKelas('Semua');
                      }}
                      className="text-slate-500 hover:underline font-semibold cursor-pointer"
                    >
                      Semua (Reset)
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 max-h-40 overflow-y-auto p-1 bg-white rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedKelasList([]);
                      setFilterKelas('Semua');
                    }}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      selectedKelasList.length === 0 && filterKelas === 'Semua'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    Semua Kelas
                  </button>

                  {kelasList.map(k => {
                    const isChecked = selectedKelasList.includes(k.namaKelas) || selectedKelasList.includes(k.id) || filterKelas === k.namaKelas;
                    const isExam = isClassTakingExam(k.namaKelas, k.id);
                    return (
                      <button
                        key={k.id}
                        type="button"
                        onClick={() => {
                          if (selectedKelasList.includes(k.namaKelas)) {
                            setSelectedKelasList(selectedKelasList.filter(name => name !== k.namaKelas));
                          } else {
                            setSelectedKelasList([...selectedKelasList, k.namaKelas]);
                          }
                          setFilterKelas('Semua');
                        }}
                        className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          isChecked
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'bg-slate-50 hover:bg-indigo-50 text-slate-700 border border-slate-200'
                        }`}
                      >
                        <span>{isChecked ? '✓' : '+'}</span>
                        <span>{k.namaKelas}</span>
                        {isExam && <span title="Memiliki jadwal ujian aktif">🔥</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Preset Cepat Pilih 3 Kelas */}
                <div className="pt-1.5 flex flex-wrap items-center gap-1 text-[11px]">
                  <span className="text-[10px] font-bold text-indigo-700 uppercase">Preset Pilih 3 Kelas:</span>
                  {(() => {
                    const kelasX = kelasList.filter(k => k.namaKelas.startsWith('X ') || k.tingkat === 'X').map(k => k.namaKelas);
                    const kelasXI = kelasList.filter(k => k.namaKelas.startsWith('XI ') || k.tingkat === 'XI').map(k => k.namaKelas);
                    const kelasXII = kelasList.filter(k => k.namaKelas.startsWith('XII ') || k.tingkat === 'XII').map(k => k.namaKelas);
                    return (
                      <>
                        {kelasX.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedKelasList(kelasX.slice(0, 3));
                              setFilterKelas('Semua');
                            }}
                            className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 cursor-pointer"
                          >
                            3 Kelas Tingkat X ({kelasX.slice(0, 3).join(', ')})
                          </button>
                        )}
                        {kelasXI.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedKelasList(kelasXI.slice(0, 3));
                              setFilterKelas('Semua');
                            }}
                            className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 cursor-pointer"
                          >
                            3 Kelas Tingkat XI ({kelasXI.slice(0, 3).join(', ')})
                          </button>
                        )}
                        {kelasXII.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedKelasList(kelasXII.slice(0, 3));
                              setFilterKelas('Semua');
                            }}
                            className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 cursor-pointer"
                          >
                            3 Kelas Tingkat XII ({kelasXII.slice(0, 3).join(', ')})
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Third Row: Dropdowns for Tingkat, Jurusan, Specific Class, and Teacher */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 text-xs">
          {/* Dropdown Filter Ujian */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-600 text-[11px]">Status Ujian:</span>
            <select
              value={filterUjianMode}
              onChange={(e) => {
                const val = e.target.value as any;
                setFilterUjianMode(val);
                setFilterUjianOnly(val === 'hanya_ujian');
              }}
              className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white font-medium"
            >
              <option value="semua">Semua Status (Ujian & KBM)</option>
              <option value="hanya_ujian">🔥 Hanya Kelas yang Ujian</option>
              <option value="tanpa_ujian">Kelas Tanpa Jadwal Ujian</option>
            </select>
          </div>

          {/* Dropdown Tingkat / Kelas (termasuk kelas X, XI, XII, X dan XI, XI dan XII, X dan XII, semua kelas) */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-600 text-[11px]">Tingkatan / Kelas:</span>
            <select
              value={
                selectedTingkatans.length === 3 ? 'semua' :
                selectedTingkatans.length === 1 ? selectedTingkatans[0].toLowerCase() :
                (selectedTingkatans.includes('X') && selectedTingkatans.includes('XI')) ? 'x_xi' :
                (selectedTingkatans.includes('XI') && selectedTingkatans.includes('XII')) ? 'xi_xii' :
                (selectedTingkatans.includes('X') && selectedTingkatans.includes('XII')) ? 'x_xii' :
                'custom'
              }
              onChange={(e) => {
                const val = e.target.value;
                const found = tingkatOptions.find(o => o.key === val);
                if (found) {
                  setSelectedTingkatans(found.list);
                  setFilterTingkat(found.key === 'semua' ? 'Semua' : (found.list.length === 1 ? found.list[0] : found.key));
                }
              }}
              className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white font-medium"
            >
              {tingkatOptions.map(opt => (
                <option key={opt.key} value={opt.key}>{opt.fullLabel}</option>
              ))}
              {selectedTingkatans.length !== 3 && selectedTingkatans.length !== 1 && selectedTingkatans.length !== 2 && (
                <option value="custom">Kombinasi Kustom ({selectedTingkatans.join(', ')})</option>
              )}
            </select>
          </div>

          {/* Dropdown Jurusan (termasuk Semua Jurusan, Jurusan Tunggal, Kombinasi 2 Jurusan, dan Kombinasi 3 Jurusan) */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-600 text-[11px]">Jurusan:</span>
            <select
              value={
                selectedJurusans.length === 0 ? 'Semua' :
                selectedJurusans.length === 1 ? selectedJurusans[0] :
                selectedJurusans.join('+')
              }
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'Semua') {
                  setSelectedJurusans([]);
                  setFilterJurusan('Semua');
                } else if (val.includes('+')) {
                  const parts = val.split('+');
                  setSelectedJurusans(parts);
                  setFilterJurusan(parts.join(' dan '));
                } else {
                  setSelectedJurusans([val]);
                  setFilterJurusan(val);
                }
              }}
              className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white font-medium max-w-[210px] truncate"
            >
              <option value="Semua">Semua Jurusan ({distinctJurusans.length})</option>
              <optgroup label="Jurusan Satuan">
                {distinctJurusans.map(j => (
                  <option key={j} value={j}>{j}</option>
                ))}
              </optgroup>
              <optgroup label="Kombinasi 2 Jurusan">
                {jurPairs.map(p => (
                  <option key={p.label} value={p.jurusans.join('+')}>{p.fullLabel}</option>
                ))}
              </optgroup>
              <optgroup label="Kombinasi 3 Jurusan">
                {jurTriplets.map(t => (
                  <option key={t.label} value={t.jurusans.join('+')}>{t.fullLabel}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Dropdown Specific Kelas */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-bold text-slate-600 text-[11px]">Rombel/Kelas:</span>
            <select
              value={filterKelas}
              onChange={(e) => {
                setFilterKelas(e.target.value);
                if (e.target.value === 'Semua') {
                  setSelectedKelasList([]);
                } else {
                  setSelectedKelasList([e.target.value]);
                }
              }}
              className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white font-medium max-w-[200px]"
            >
              <option value="Semua">
                {selectedKelasList.length > 1 ? `${selectedKelasList.length} Kelas Dipilih` : `Semua Kelas (${availableClassOptions.length})`}
              </option>
              {availableClassOptions.map(k => {
                const isExam = isClassTakingExam(k.namaKelas, k.id);
                return (
                  <option key={k.id} value={k.namaKelas}>
                    {k.namaKelas} {isExam ? '🔥 (Ada Ujian)' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Dropdown Guru */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-600 text-[11px]">Guru:</span>
            <select
              value={filterGuru}
              onChange={(e) => setFilterGuru(e.target.value)}
              className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white font-medium max-w-[190px] truncate"
            >
              <option value="Semua">Semua Guru ({teachersList.length})</option>
              {teachersList.map(t => (
                <option key={t.id} value={t.nama}>{t.nama}</option>
              ))}
            </select>
          </div>

          {(filterKelas !== 'Semua' || selectedKelasList.length > 0 || filterGuru !== 'Semua' || filterStatus !== 'Semua' || filterTingkat !== 'Semua' || selectedTingkatans.length < 3 || filterJurusan !== 'Semua' || selectedJurusans.length > 0 || filterUjianOnly || filterUjianMode !== 'semua' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setFilterStatus('Semua');
                setFilterTingkat('Semua');
                setSelectedTingkatans(['X', 'XI', 'XII']);
                setFilterJurusan('Semua');
                setSelectedJurusans([]);
                setFilterKelas('Semua');
                setSelectedKelasList([]);
                setFilterUjianOnly(false);
                setFilterUjianMode('semua');
                setFilterGuru('Semua');
              }}
              className="ml-auto text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-3 py-1 rounded-lg text-[11px] font-extrabold border border-amber-200 transition-colors cursor-pointer"
            >
              Reset Semua Filter ✕
            </button>
          )}
        </div>
      </div>

      {/* Printable Official Kop Surat (visible when printing) */}
      <div className="hidden print:block mb-4">
        <KopSuratView schoolInfo={schoolInfo} />
        <div className="text-center my-4">
          <h3 className="text-base font-extrabold uppercase tracking-wide">
            LAPORAN HASIL MONITORING PENGISIAN NILAI RAPORT GURU
          </h3>
          <p className="text-xs text-slate-600">
            Tahun Ajaran {schoolInfo?.tahunAjaranPembelajaran || '2026/2027'} - Dicetak pada {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}
          </p>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-3 text-center w-12">No</th>
                <th className="py-3.5 px-4 min-w-[200px]">Guru Pengampu</th>
                <th className="py-3.5 px-4 min-w-[180px]">Mata Pelajaran</th>
                <th className="py-3.5 px-3 min-w-[130px]">Rombel Kelas</th>
                <th className="py-3.5 px-3 text-center min-w-[110px]">Target Siswa</th>
                <th className="py-3.5 px-4 text-center min-w-[150px]">Rincian Input</th>
                <th className="py-3.5 px-4 text-center min-w-[160px]">Progres & Status</th>
                <th className="py-3.5 px-3 text-center min-w-[120px] print:hidden">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAssignments.map((assignment, idx) => {
                const isTuntas = assignment.status === 'Tuntas';
                const isSedang = assignment.status === 'Sedang Mengisi';
                const isBelum = assignment.status === 'Belum Mengisi';

                return (
                  <tr key={assignment.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-3 text-center font-semibold text-slate-400">
                      {idx + 1}
                    </td>

                    {/* Guru */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          isTuntas ? 'bg-emerald-100 text-emerald-800' :
                          isSedang ? 'bg-amber-100 text-amber-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {assignment.fotoGuru ? (
                            <img src={assignment.fotoGuru} alt={assignment.namaGuru} className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            assignment.namaGuru.charAt(0) || 'G'
                          )}
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <div className="font-bold text-slate-900 truncate">{assignment.namaGuru}</div>
                          <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                            {assignment.jabatanGuru && (
                              <span className="text-teal-800 bg-teal-50 border border-teal-200/80 px-1.5 py-0.2 rounded font-semibold truncate max-w-[190px]">
                                {assignment.jabatanGuru}
                              </span>
                            )}
                            <span className="text-slate-500 font-mono">
                              NIP: {assignment.nipGuru || '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Mapel */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">{assignment.namaMapel}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                        {assignment.kodeMapel && (
                          <span className="font-mono bg-slate-100 px-1 rounded">{assignment.kodeMapel}</span>
                        )}
                        <span>{assignment.kelompokMapel || 'Kurikulum Merdeka'}</span>
                      </div>
                    </td>

                    {/* Kelas */}
                    <td className="py-3.5 px-3">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-bold text-[11px] inline-block">
                        {assignment.namaKelas}
                      </span>
                    </td>

                    {/* Target Siswa */}
                    <td className="py-3.5 px-3 text-center">
                      <div className="font-black text-slate-900 text-sm">
                        {assignment.siswaTerisi} <span className="text-slate-400 font-normal text-xs">/ {assignment.totalSiswa}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {assignment.totalSiswa - assignment.siswaTerisi > 0 ? (
                          <span className="text-rose-600 font-bold">{assignment.totalSiswa - assignment.siswaTerisi} belum</span>
                        ) : (
                          <span className="text-emerald-600 font-bold">Lengkap</span>
                        )}
                      </div>
                    </td>

                    {/* Rincian Komponen */}
                    <td className="py-3.5 px-4">
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
                        <div className="flex items-center justify-between bg-slate-50 px-1.5 py-0.5 rounded">
                          <span className="text-slate-500">Formatif:</span>
                          <strong className={assignment.countFormatif > 0 ? 'text-slate-900' : 'text-slate-400'}>
                            {assignment.countFormatif}/{assignment.totalSiswa}
                          </strong>
                        </div>
                        <div className="flex items-center justify-between bg-slate-50 px-1.5 py-0.5 rounded">
                          <span className="text-slate-500">PTS:</span>
                          <strong className={assignment.countPts > 0 ? 'text-slate-900' : 'text-slate-400'}>
                            {assignment.countPts}/{assignment.totalSiswa}
                          </strong>
                        </div>
                        <div className="flex items-center justify-between bg-slate-50 px-1.5 py-0.5 rounded">
                          <span className="text-slate-500">PAS:</span>
                          <strong className={assignment.countPas > 0 ? 'text-slate-900' : 'text-slate-400'}>
                            {assignment.countPas}/{assignment.totalSiswa}
                          </strong>
                        </div>
                        <div className="flex items-center justify-between bg-slate-50 px-1.5 py-0.5 rounded">
                          <span className="text-slate-500">NA:</span>
                          <strong className={assignment.countAkhir > 0 ? 'text-emerald-700' : 'text-slate-400'}>
                            {assignment.countAkhir}/{assignment.totalSiswa}
                          </strong>
                        </div>
                      </div>
                    </td>

                    {/* Progres & Status */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isTuntas ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          isSedang ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}>
                          {assignment.status}
                        </span>
                        <span className="font-mono font-bold text-xs text-slate-800">
                          {assignment.persentase}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isTuntas ? 'bg-emerald-500' :
                            isSedang ? 'bg-amber-500' :
                            'bg-rose-500'
                          }`}
                          style={{ width: `${assignment.persentase}%` }}
                        />
                      </div>
                    </td>

                    {/* Aksi */}
                    <td className="py-3.5 px-3 text-center print:hidden">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedAssignment(assignment)}
                          className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer"
                          title="Lihat Rincian Nilai Tiap Siswa"
                        >
                          <BookOpen className="w-3 h-3 text-slate-500" />
                          <span>Rincian</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenReassignModal(assignment)}
                          className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer border border-indigo-200"
                          title="Sesuaikan / Ganti Guru Pengampu Sebenarnya untuk Rombel Ini"
                        >
                          <UserCheck className="w-3 h-3 text-indigo-600" />
                          <span>Ganti Guru</span>
                        </button>

                        {!isTuntas && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleCopyReminder(assignment)}
                              className="p-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 transition-all cursor-pointer"
                              title="Salin Draft Pengingat Pengisian Nilai"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenWhatsApp(assignment)}
                              className="p-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-all cursor-pointer"
                              title="Kirim Pengingat via WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>

                      {copiedNotice === assignment.id && (
                        <div className="text-[9px] text-emerald-700 font-bold mt-1">
                          ✓ Pesan disalin!
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredAssignments.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 bg-slate-50/50">
                    <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-600">Tidak ada data penugasan mengajar yang cocok.</p>
                    <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau reset filter.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Signatures for Printed Report */}
      <div className="hidden print:grid grid-cols-2 gap-8 pt-8 mt-6 border-t border-slate-300 text-xs">
        <div className="text-center space-y-16">
          <div>
            <p>Mengetahui,</p>
            <p className="font-bold">Kepala SMK Bakti Putra Mandiri</p>
          </div>
          <div>
            <p className="font-bold underline">{schoolInfo?.kepalaSekolah || 'Dr. H. Ahmad Fauzi, M.Pd.'}</p>
            <p className="text-slate-600">NIP: {schoolInfo?.nipKepalaSekolah || '19750812 200003 1 002'}</p>
          </div>
        </div>

        <div className="text-center space-y-16">
          <div>
            <p>Parung Panjang, {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</p>
            <p className="font-bold">Wakil Kepala Sekolah Bidang Kurikulum</p>
          </div>
          <div>
            <p className="font-bold underline">Waka Kurikulum / Administrator</p>
            <p className="text-slate-600">NIP: -</p>
          </div>
        </div>
      </div>

      {/* MODAL: DETAIL SISWA PER PENUGASAN MAPEL-ROMBEL */}
      {selectedAssignment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-slate-50 border-b border-slate-200 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800">
                    Rincian Input Nilai Siswa
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    selectedAssignment.status === 'Tuntas' ? 'bg-emerald-100 text-emerald-800' :
                    selectedAssignment.status === 'Sedang Mengisi' ? 'bg-amber-100 text-amber-800' :
                    'bg-rose-100 text-rose-800'
                  }`}>
                    {selectedAssignment.status} ({selectedAssignment.persentase}%)
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  {selectedAssignment.namaMapel} — Kelas {selectedAssignment.namaKelas}
                </h3>
                <p className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap mt-0.5">
                  <span>Guru Pengampu: <strong className="text-slate-800">{selectedAssignment.namaGuru}</strong> {selectedAssignment.nipGuru && `(NIP: ${selectedAssignment.nipGuru})`}</span>
                  {selectedAssignment.jabatanGuru && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                      {selectedAssignment.jabatanGuru}
                    </span>
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAssignment(null)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Content - Student Grade Table */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold block">Total Siswa</span>
                  <span className="text-lg font-black text-slate-900">{selectedAssignment.totalSiswa}</span>
                </div>
                <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-emerald-700 font-bold block">Sudah Ada Nilai</span>
                  <span className="text-lg font-black text-emerald-900">{selectedAssignment.siswaTerisi}</span>
                </div>
                <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                  <span className="text-[10px] text-rose-700 font-bold block">Belum Ada Nilai</span>
                  <span className="text-lg font-black text-rose-900">{selectedAssignment.totalSiswa - selectedAssignment.siswaTerisi}</span>
                </div>
                <div className="bg-indigo-50 p-2.5 rounded-xl border border-indigo-200">
                  <span className="text-[10px] text-indigo-700 font-bold block">Rata-rata Nilai Akhir</span>
                  <span className="text-lg font-black text-indigo-900">{selectedAssignment.rataRataNilaiAkhir || '-'}</span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 text-center">No</th>
                      <th className="py-2.5 px-3">NIPD</th>
                      <th className="py-2.5 px-3">Nama Siswa</th>
                      <th className="py-2.5 px-2 text-center">Formatif</th>
                      <th className="py-2.5 px-2 text-center">PTS</th>
                      <th className="py-2.5 px-2 text-center">PAS/PAT</th>
                      <th className="py-2.5 px-2 text-center">Nilai Akhir</th>
                      <th className="py-2.5 px-2 text-center">Predikat</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedClassStudents.map(({ no, student, grade, isFilled }) => (
                      <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 text-center text-slate-400 font-semibold">{no}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{student.nipd || student.nipOrNis || '-'}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{student.nama}</td>
                        <td className="py-2.5 px-2 text-center font-mono">{grade?.nilaiFormatif ?? grade?.lm1 ?? '-'}</td>
                        <td className="py-2.5 px-2 text-center font-mono">{grade?.nilaiPts ?? '-'}</td>
                        <td className="py-2.5 px-2 text-center font-mono">{grade?.nilaiPas ?? grade?.nilaiPat ?? '-'}</td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-900">
                          {grade?.nilaiAkhir ?? '-'}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${
                            grade?.predikat === 'A' ? 'bg-emerald-100 text-emerald-800' :
                            grade?.predikat === 'B' ? 'bg-blue-100 text-blue-800' :
                            grade?.predikat === 'C' ? 'bg-amber-100 text-amber-800' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {grade?.predikat || '-'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isFilled ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {isFilled ? '✓ Terisi' : '✕ Belum'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {selectedClassStudents.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-6 text-center text-slate-400">
                          Tidak ada siswa yang terdaftar di kelas {selectedAssignment.namaKelas}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                Pencatatan nilai otomatis tersimpan di Cloud Firestore secara permanen.
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyReminder(selectedAssignment)}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Pesan Pengingat</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAssignment(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PENYESUAIAN GURU PENGAMPU SEBENARNYA */}
      {reassignModalAssignment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 sm:p-6 bg-slate-50 border-b border-slate-200 flex items-start justify-between gap-3">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-800">
                  Sinkronisasi Guru Pengampu Sebenarnya
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1">
                  {reassignModalAssignment.namaMapel}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rombel: <strong className="text-slate-800">{reassignModalAssignment.namaKelas}</strong> • Guru Saat Ini: <strong className="text-indigo-600">{reassignModalAssignment.namaGuru}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReassignModalAssignment(null)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Cari Nama / NIP Guru Pengampu Baru:
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={teacherSearchFilter}
                    onChange={(e) => setTeacherSearchFilter(e.target.value)}
                    placeholder="Ketik nama atau NIP guru..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {teachersList
                  .filter(t => {
                    if (!teacherSearchFilter) return true;
                    const q = teacherSearchFilter.toLowerCase();
                    return (t.nama && t.nama.toLowerCase().includes(q)) ||
                           (t.nipOrNis && t.nipOrNis.includes(q)) ||
                           (t.idGuru && t.idGuru.includes(q)) ||
                           (t.jabatanTambahan && t.jabatanTambahan.toLowerCase().includes(q));
                  })
                  .map(t => {
                    const isSelected = selectedNewTeacherId === t.id;
                    const formatted = formatTeacherNameWithDegree(t, usersList);
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedNewTeacherId(t.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-400 shadow-xs'
                            : 'bg-white hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {formatted.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate">{formatted}</div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1.5 truncate">
                              <span>NIP: {t.nipOrNis || t.idGuru || '-'}</span>
                              {t.jabatanTambahan && <span>• {t.jabatanTambahan}</span>}
                            </div>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
              </div>

              <p className="text-[11px] text-slate-500 bg-blue-50/70 p-3 rounded-xl border border-blue-200/60 leading-relaxed">
                ℹ️ Memilih guru baru akan memperbarui <strong>Master Mata Pelajaran</strong>, menyesuaikan <strong>Jadwal Pelajaran KBM</strong> rombel ini, dan menyinkronkan lembar nilai siswa secara otomatis ke Cloud Firestore.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setReassignModalAssignment(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!selectedNewTeacherId}
                onClick={handleSaveReassignedTeacher}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                Simpan & Sinkronkan Guru Pengampu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
