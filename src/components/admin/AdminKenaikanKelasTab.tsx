import React, { useState, useMemo } from 'react';
import { 
  User, 
  Kelas, 
  NilaiMapelSiswa, 
  AbsensiRecord, 
  SchoolInfo,
  KenaikanKelasLog,
  KeputusanKenaikanSiswa
} from '../../types';
import { 
  GraduationCap, 
  Award, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Printer, 
  RotateCcw, 
  Save, 
  Users, 
  Building2, 
  Search, 
  Filter, 
  Calendar, 
  Sparkles,
  FileSpreadsheet,
  FileCheck2,
  Check,
  XCircle,
  HelpCircle,
  History
} from 'lucide-react';
import { saveToStorage, STORAGE_KEYS, loadFromStorage } from '../../utils/storage';
import { printDocumentArea } from '../../utils/printHelper';

interface AdminKenaikanKelasTabProps {
  usersList: User[];
  kelasList: Kelas[];
  nilaiList: NilaiMapelSiswa[];
  absensiList: AbsensiRecord[];
  schoolInfo: SchoolInfo;
  onUpdateUser: (user: User) => void;
  onUpdateSchoolInfo: (info: SchoolInfo) => void;
  onSaveUsersList?: (newUsers: User[]) => void;
}

export const AdminKenaikanKelasTab: React.FC<AdminKenaikanKelasTabProps> = ({
  usersList,
  kelasList,
  nilaiList,
  absensiList,
  schoolInfo,
  onUpdateUser,
  onUpdateSchoolInfo,
  onSaveUsersList,
}) => {
  // Filter Rombel
  const activeStudents = useMemo(() => usersList.filter(u => u.role === 'siswa'), [usersList]);
  const [selectedKelasId, setSelectedKelasId] = useState<string>(kelasList[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showBeritaAcara, setShowBeritaAcara] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);

  // Selected Class
  const currentKelas = kelasList.find(k => k.id === selectedKelasId) || kelasList[0];
  const isTingkatAkhir = currentKelas?.tingkat === 'XII' || (currentKelas?.namaKelas || '').toUpperCase().includes('XII');

  // Students belonging to selected class
  const classStudents = useMemo(() => {
    return activeStudents.filter(u => {
      if (u.idKelas && currentKelas && u.idKelas === currentKelas.id) return true;
      if (u.kelas && currentKelas && (u.kelas === currentKelas.namaKelas || u.namaKelas === currentKelas.namaKelas)) return true;
      return false;
    });
  }, [activeStudents, currentKelas]);

  // Suggested Target Class based on current class tingkat and major
  const getNextClassSuggestion = (student: User, sourceClass?: Kelas): { id: string; namaKelas: string; isGraduation: boolean } => {
    if (!sourceClass) {
      return { id: '', namaKelas: 'Lulus / Alumni', isGraduation: true };
    }

    const t = sourceClass.tingkat || (sourceClass.namaKelas.includes('X ') ? 'X' : sourceClass.namaKelas.includes('XI ') ? 'XI' : 'XII');
    const sJurusan = (student.jurusan || sourceClass.jurusan || '').toLowerCase();

    if (t === 'XII') {
      return { id: 'alumni', namaKelas: 'LULUS (Tamat Belajar Satuan Pendidikan)', isGraduation: true };
    }

    if (t === 'X') {
      // Find class in XI with matching major
      const match = kelasList.find(k => {
        const isXI = k.tingkat === 'XI' || k.namaKelas.includes('XI');
        if (!isXI) return false;
        const kJur = (k.jurusan || k.namaKelas).toLowerCase();
        if (sJurusan.includes('farmasi') && kJur.includes('farmasi')) return true;
        if (sJurusan.includes('keperawatan') && kJur.includes('keperawatan')) return true;
        if (sJurusan.includes('kecantikan') && kJur.includes('kecantikan')) return true;
        if (sJurusan.includes('perhotelan') && kJur.includes('perhotelan')) return true;
        return k.jurusan === student.jurusan;
      });
      if (match) return { id: match.id, namaKelas: match.namaKelas, isGraduation: false };
      // Fallback first XI class
      const fallbackXI = kelasList.find(k => k.tingkat === 'XI' || k.namaKelas.includes('XI'));
      if (fallbackXI) return { id: fallbackXI.id, namaKelas: fallbackXI.namaKelas, isGraduation: false };
      return { id: '', namaKelas: 'XI ' + (student.jurusan || 'Kejuruan'), isGraduation: false };
    }

    if (t === 'XI') {
      // Find class in XII with matching major
      const match = kelasList.find(k => {
        const isXII = k.tingkat === 'XII' || k.namaKelas.includes('XII');
        if (!isXII) return false;
        const kJur = (k.jurusan || k.namaKelas).toLowerCase();
        if (sJurusan.includes('farmasi') && kJur.includes('farmasi')) return true;
        if (sJurusan.includes('keperawatan') && kJur.includes('keperawatan')) return true;
        if (sJurusan.includes('kecantikan') && kJur.includes('kecantikan')) return true;
        if (sJurusan.includes('perhotelan') && kJur.includes('perhotelan')) return true;
        return k.jurusan === student.jurusan;
      });
      if (match) return { id: match.id, namaKelas: match.namaKelas, isGraduation: false };
      const fallbackXII = kelasList.find(k => k.tingkat === 'XII' || k.namaKelas.includes('XII'));
      if (fallbackXII) return { id: fallbackXII.id, namaKelas: fallbackXII.namaKelas, isGraduation: false };
      return { id: '', namaKelas: 'XII ' + (student.jurusan || 'Kejuruan'), isGraduation: false };
    }

    return { id: 'alumni', namaKelas: 'LULUS (Tamat Belajar Satuan Pendidikan)', isGraduation: true };
  };

  // Classes of the next grade level for quick rombel suggestion
  const nextGradeClasses = useMemo(() => {
    if (!currentKelas) return [];
    const t = currentKelas.tingkat || (currentKelas.namaKelas.includes('X ') ? 'X' : currentKelas.namaKelas.includes('XI ') ? 'XI' : 'XII');
    const targetT = t === 'X' ? 'XI' : t === 'XI' ? 'XII' : '';
    if (!targetT) return [];
    return kelasList.filter(k => k.tingkat === targetT || k.namaKelas.includes(targetT));
  }, [currentKelas, kelasList]);

  // Bulk target class controls
  const [bulkTargetRombel, setBulkTargetRombel] = useState<string>('');
  const [bulkCustomNama, setBulkCustomNama] = useState<string>('');

  // State decisions per student: map of student nipd -> KeputusanKenaikanSiswa
  const [decisions, setDecisions] = useState<{ [nipd: string]: KeputusanKenaikanSiswa }>({});

  // Initialize decisions when class changes
  React.useEffect(() => {
    if (!currentKelas) return;
    const initial: { [nipd: string]: KeputusanKenaikanSiswa } = {};

    classStudents.forEach(st => {
      const sNipd = st.nipd || st.nipOrNis;
      
      // Calculate student average grades
      const sGrades = nilaiList.filter(n => n.nipd === sNipd && n.nilaiAkhir !== undefined && n.nilaiAkhir > 0);
      const avg = sGrades.length > 0 
        ? Math.round(sGrades.reduce((a, b) => a + (b.nilaiAkhir || 0), 0) / sGrades.length) 
        : 82; // Default reasonable grade if not yet entered
      
      // Calculate unexcused absences (Alpa)
      const alpaCount = absensiList.filter(a => a.nipd === sNipd && a.status === 'Alpa').length;

      const suggestion = getNextClassSuggestion(st, currentKelas);
      const isGrad = isTingkatAkhir;

      // Criteria: average >= 75 and alpa <= 5
      const meetsCriteria = avg >= 75 && alpaCount <= 5;

      const defaultStatus = isGrad 
        ? (meetsCriteria ? 'Lulus' : 'Tidak Lulus') 
        : (meetsCriteria ? 'Naik Kelas' : 'Tinggal Kelas');

      initial[sNipd] = {
        nipd: sNipd,
        namaSiswa: st.nama,
        kelasAsal: currentKelas.namaKelas,
        idKelasAsal: currentKelas.id,
        statusKenaikan: (st.statusKenaikan as any) || defaultStatus,
        targetKelasId: st.targetKelasBerikutnya || suggestion.id,
        targetNamaKelas: st.targetNamaKelasBerikutnya || suggestion.namaKelas,
        rataRataNilai: avg,
        totalAlpa: alpaCount,
        catatan: st.catatanKenaikan || (meetsCriteria ? 'Memenuhi seluruh kriteria ketuntasan minimal & kehadiran' : 'Perlu evaluasi ketuntasan dan disiplin belajar'),
        tanggalKeputusan: new Date().toISOString().split('T')[0],
      };
    });

    setDecisions(initial);
  }, [selectedKelasId, classStudents.length, isTingkatAkhir]);

  // Apply bulk target rombel to all students in current class
  const handleApplyBulkTargetToAll = () => {
    const finalNama = bulkCustomNama.trim() || (kelasList.find(k => k.id === bulkTargetRombel)?.namaKelas) || '';
    if (!finalNama) {
      alert('Silakan pilih salah satu rombel atau ketik manual nama rombel target terlebih dahulu.');
      return;
    }
    const matchedK = kelasList.find(k => k.namaKelas.toLowerCase() === finalNama.toLowerCase());
    const finalId = matchedK ? matchedK.id : (bulkTargetRombel !== '__manual__' ? bulkTargetRombel : '');

    setDecisions(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(nipd => {
        if (updated[nipd].statusKenaikan === 'Naik Kelas') {
          updated[nipd] = {
            ...updated[nipd],
            targetKelasId: finalId,
            targetNamaKelas: finalNama
          };
        }
      });
      return updated;
    });

    setNotification(`Target rombel seluruh siswa yang naik kelas berhasil diset ke: "${finalNama}"`);
    setTimeout(() => setNotification(null), 4000);
  };

  // Handle single student decision change
  const handleUpdateStudentDecision = (nipd: string, updates: Partial<KeputusanKenaikanSiswa>) => {
    setDecisions(prev => ({
      ...prev,
      [nipd]: {
        ...prev[nipd],
        ...updates
      }
    }));
  };

  // Execution: Bulk apply promotion/graduation for selected class
  const handleExecutePromotion = () => {
    if (!currentKelas) return;

    const count = Object.keys(decisions).length;
    if (count === 0) {
      alert('Tidak ada siswa di rombel ini untuk diproses.');
      return;
    }

    const confirmMsg = isTingkatAkhir
      ? `Proses kelulusan untuk ${count} siswa kelas ${currentKelas.namaKelas}? Siswa yang dinyatakan "Lulus" akan dialihkan ke status Alumni/Lulus.`
      : `Proses kenaikan kelas untuk ${count} siswa kelas ${currentKelas.namaKelas}? Siswa akan dipindahkan ke rombel baru yang telah ditentukan.`;

    if (!window.confirm(confirmMsg)) return;

    setIsProcessing(true);

    const nowStr = new Date().toISOString().split('T')[0];
    const currentYear = schoolInfo.tahunAjaranPembelajaran || '2026/2027';

    // Calculate next academic year
    const years = currentYear.split('/');
    const nextYear = years.length === 2 && !isNaN(Number(years[0])) && !isNaN(Number(years[1]))
      ? `${Number(years[0]) + 1}/${Number(years[1]) + 1}`
      : '2027/2028';

    let promotedCount = 0;
    let retainedCount = 0;
    let graduatedCount = 0;
    const detailLogs: any[] = [];

    const updatedUsersList = usersList.map(u => {
      const sNipd = u.nipd || u.nipOrNis;
      const dec = decisions[sNipd];

      if (!dec) return u;

      const prevRiwayat = u.riwayatKelas || [];
      const newRiwayatItem = {
        tahunAjaran: currentYear,
        kelas: currentKelas.namaKelas,
        tingkat: currentKelas.tingkat,
        semester: schoolInfo.semesterPembelajaran || 'Genap',
        status: dec.statusKenaikan,
        tanggal: nowStr,
        catatan: dec.catatan
      };

      if (dec.statusKenaikan === 'Lulus') {
        graduatedCount++;
        detailLogs.push({ nipd: sNipd, nama: u.nama, status: 'Lulus', keKelas: 'Alumni' });
        return {
          ...u,
          statusKenaikan: 'Lulus' as const,
          statusAlumni: true,
          tahunLulus: currentYear,
          catatanKenaikan: dec.catatan,
          riwayatKelas: [...prevRiwayat, newRiwayatItem],
        };
      } else if (dec.statusKenaikan === 'Naik Kelas') {
        promotedCount++;
        const targetK = kelasList.find(k => k.id === dec.targetKelasId || k.namaKelas.toLowerCase() === (dec.targetNamaKelas || '').toLowerCase());
        const resolvedNama = dec.targetNamaKelas?.trim() || targetK?.namaKelas || 'Kelas Lanjutan';
        const resolvedId = targetK?.id || dec.targetKelasId || `k-custom-${Date.now()}`;
        detailLogs.push({ nipd: sNipd, nama: u.nama, status: 'Naik Kelas', keKelas: resolvedNama });
        return {
          ...u,
          idKelas: resolvedId,
          namaKelas: resolvedNama,
          kelas: resolvedNama,
          statusKenaikan: 'Naik Kelas' as const,
          targetKelasBerikutnya: resolvedId,
          targetNamaKelasBerikutnya: resolvedNama,
          catatanKenaikan: dec.catatan,
          riwayatKelas: [...prevRiwayat, newRiwayatItem],
        };
      } else if (dec.statusKenaikan === 'Tinggal Kelas') {
        retainedCount++;
        detailLogs.push({ nipd: sNipd, nama: u.nama, status: 'Tinggal Kelas', keKelas: currentKelas.namaKelas });
        return {
          ...u,
          statusKenaikan: 'Tinggal Kelas' as const,
          catatanKenaikan: dec.catatan,
          riwayatKelas: [...prevRiwayat, newRiwayatItem],
        };
      } else {
        return {
          ...u,
          statusKenaikan: dec.statusKenaikan,
          catatanKenaikan: dec.catatan,
        };
      }
    });

    // Save updated users list to state & storage
    if (onSaveUsersList) {
      onSaveUsersList(updatedUsersList);
    } else {
      updatedUsersList.forEach(u => onUpdateUser(u));
    }
    saveToStorage(STORAGE_KEYS.USERS, updatedUsersList);

    // Save execution log
    const newLog: KenaikanKelasLog = {
      id: `log-${Date.now()}`,
      tanggal: nowStr,
      tahunAjaranSebelumnya: currentYear,
      tahunAjaranBaru: nextYear,
      semester: schoolInfo.semesterPembelajaran || 'Genap',
      kelasAsal: currentKelas.namaKelas,
      jumlahSiswa: count,
      jumlahNaik: promotedCount,
      jumlahTinggal: retainedCount,
      jumlahLulus: graduatedCount,
      operator: 'Super Administrator / Tim Pleno',
      detail: detailLogs,
    };

    const existingLogs = loadFromStorage<KenaikanKelasLog[]>(STORAGE_KEYS.KENAIKAN_KELAS_LOG, []);
    const updatedLogs = [newLog, ...existingLogs];
    saveToStorage(STORAGE_KEYS.KENAIKAN_KELAS_LOG, updatedLogs);

    setIsProcessing(false);
    setNotification(`Berhasil memproses hasil rapat pleno untuk kelas ${currentKelas.namaKelas}! Data rombel dan status siswa langsung diperbarui secara permanen.`);
    setTimeout(() => setNotification(null), 5000);
  };

  // Next Academic Year Transition Modal / Action
  const handlePromoteAcademicYear = () => {
    const currentYear = schoolInfo.tahunAjaranPembelajaran || '2026/2027';
    const years = currentYear.split('/');
    const nextYear = years.length === 2 && !isNaN(Number(years[0])) && !isNaN(Number(years[1]))
      ? `${Number(years[0]) + 1}/${Number(years[1]) + 1}`
      : '2027/2028';

    if (window.confirm(`Perbarui Tahun Ajaran Sekolah dari ${currentYear} (Semester Genap) ke Tahun Ajaran Baru ${nextYear} (Semester Ganjil)?`)) {
      const updatedInfo: SchoolInfo = {
        ...schoolInfo,
        tahunAjaranPembelajaran: nextYear,
        semesterPembelajaran: 'Ganjil',
      };
      onUpdateSchoolInfo(updatedInfo);
      saveToStorage(STORAGE_KEYS.SCHOOL_INFO, updatedInfo);
      setNotification(`Tahun ajaran sekolah berhasil dimajukan ke ${nextYear} Semester Ganjil!`);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const filteredStudents = classStudents.filter(s => 
    s.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.nipd || '').includes(searchQuery) ||
    (s.nisn || '').includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-400/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Modul Akhir Semester 2 & Ulangan Akhir (PAT/ASAT)</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Kenaikan Kelas & Kelulusan Terpadu
            </h2>
            <p className="text-slate-200 text-xs sm:text-sm leading-relaxed">
              Otomasi penilaian pleno kelulusan dan kenaikan jenjang rombel siswa (Kelas X ke XI, XI ke XII, dan XII ke Alumni/Lulus). Dilengkapi verifikasi ketuntasan nilai raport, presensi alpa, cetak Berita Acara Pleno resmi, dan penyimpanan permanen.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => setShowBeritaAcara(true)}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center justify-center gap-2 border border-white/20 transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4 text-emerald-300" />
              <span>Cetak Berita Acara</span>
            </button>
            <button
              onClick={handlePromoteAcademicYear}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
            >
              <Calendar className="w-4 h-4 text-slate-950" />
              <span>Naikkan Tahun Ajaran ({schoolInfo.tahunAjaranPembelajaran})</span>
            </button>
          </div>
        </div>
      </div>

      {notification && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-900 text-xs font-semibold shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Control Bar: Pilih Rombel & Filter */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-emerald-600" />
              Pilih Rombongan Belajar:
            </span>
            <select
              value={selectedKelasId}
              onChange={(e) => setSelectedKelasId(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white font-bold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            >
              {kelasList.map(k => (
                <option key={k.id} value={k.id}>
                  {k.namaKelas} (Tingkat {k.tingkat || 'X'} - {k.jurusan})
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Cari siswa atau NIPD..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 w-48 sm:w-60"
            />
          </div>
        </div>

        {/* Quick Class Summary & Execute Button */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          <div className="text-right hidden sm:block">
            <span className="text-[11px] text-slate-500 font-medium block">
              Total: {classStudents.length} Siswa Terdaftar
            </span>
            <span className="text-xs font-bold text-slate-800">
              Wali Kelas: {currentKelas?.namaWalas || 'Belum Ditentukan'}
            </span>
          </div>

          <button
            onClick={handleExecutePromotion}
            disabled={isProcessing || classStudents.length === 0}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all ${
              isTingkatAkhir 
                ? 'bg-amber-600 hover:bg-amber-500 text-white' 
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>{isTingkatAkhir ? 'Eksekusi Kelulusan Rombel' : 'Eksekusi Kenaikan Kelas Rombel'}</span>
          </button>
        </div>
      </div>

      {/* Roster & Promotion Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              Daftar Keputusan Pleno Siswa: {currentKelas?.namaKelas}
            </h3>
            <p className="text-xs text-slate-500">
              Ubah status keputusan dan kelas tujuan perorangan jika ada pertimbangan khusus sebelum mengeksekusi.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold">
              {isTingkatAkhir ? 'Status Kelulusan Akhir' : 'Kenaikan Jenjang'}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700 font-bold">
              Tahun Ajaran: {schoolInfo.tahunAjaranPembelajaran} ({schoolInfo.semesterPembelajaran || 'Genap'})
            </span>
          </div>
        </div>

        {/* BAR ATUR TARGET ROMBEL SEKALIGUS (BULK SET) */}
        {!isTingkatAkhir && (
          <div className="p-3.5 bg-emerald-50/80 border-b border-emerald-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5 shrink-0">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Atur Target Rombel Sekaligus (Kolektif):
              </span>
              
              <select
                value={bulkTargetRombel}
                onChange={(e) => {
                  const val = e.target.value;
                  setBulkTargetRombel(val);
                  if (val !== '__manual__' && val !== '') {
                    const targetK = kelasList.find(k => k.id === val);
                    if (targetK) setBulkCustomNama(targetK.namaKelas);
                  }
                }}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-bold text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
              >
                <option value="">-- Pilih Rombel Sistem --</option>
                {nextGradeClasses.length > 0 && (
                  <optgroup label="Rombel Tingkat Lanjutan">
                    {nextGradeClasses.map(k => (
                      <option key={k.id} value={k.id}>{k.namaKelas} ({k.jurusan})</option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Seluruh Rombel Sekolah">
                  {kelasList.map(k => (
                    <option key={k.id} value={k.id}>{k.namaKelas}</option>
                  ))}
                </optgroup>
                <option value="__manual__">✏️ Input Manual (Kustom)...</option>
              </select>

              <input
                type="text"
                placeholder="Atau ketik manual nama rombel target..."
                value={bulkCustomNama}
                onChange={(e) => setBulkCustomNama(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs w-52 sm:w-64 font-semibold text-slate-900 focus:outline-none focus:border-emerald-600"
              />

              <button
                type="button"
                onClick={handleApplyBulkTargetToAll}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Terapkan ke Semua Siswa</span>
              </button>
            </div>
            <span className="text-[11px] text-slate-500 italic">
              * Rombel target akan disinkronkan ke seluruh siswa naik kelas di rombel ini.
            </span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3 w-10 text-center">No</th>
                <th className="py-3 px-4 min-w-[200px]">Nama Siswa & NIPD</th>
                <th className="py-3 px-3 text-center w-24">Rata-rata Nilai</th>
                <th className="py-3 px-3 text-center w-24">Presensi Alpa</th>
                <th className="py-3 px-4 w-44">Status Keputusan Pleno</th>
                <th className="py-3 px-4 min-w-[260px]">{isTingkatAkhir ? 'Status Akhir' : 'Tujuan Rombel Baru'}</th>
                <th className="py-3 px-4 min-w-[220px]">Catatan Wali Kelas / Pleno</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((st, idx) => {
                const sNipd = st.nipd || st.nipOrNis;
                const dec = decisions[sNipd] || {
                  statusKenaikan: isTingkatAkhir ? 'Lulus' : 'Naik Kelas',
                  targetKelasId: '',
                  targetNamaKelas: '',
                  rataRataNilai: 80,
                  totalAlpa: 0,
                  catatan: '',
                };

                const isWarning = (dec.rataRataNilai || 0) < 75 || (dec.totalAlpa || 0) > 3;

                return (
                  <tr key={st.id} className={`hover:bg-slate-50/70 transition-colors ${isWarning ? 'bg-amber-50/30' : ''}`}>
                    <td className="py-3 px-3 text-center font-mono font-medium text-slate-500">
                      {idx + 1}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{st.nama}</div>
                      <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
                        <span>NIPD: {sNipd}</span>
                        {st.nisn && <span>• NISN: {st.nisn}</span>}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-md font-bold text-xs ${
                        (dec.rataRataNilai || 0) >= 85 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : (dec.rataRataNilai || 0) >= 75 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-rose-100 text-rose-800 font-black'
                      }`}>
                        {dec.rataRataNilai || '-'}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-md font-bold text-xs ${
                        (dec.totalAlpa || 0) === 0 
                          ? 'bg-slate-100 text-slate-700' 
                          : (dec.totalAlpa || 0) <= 3 
                          ? 'bg-amber-100 text-amber-800' 
                          : 'bg-rose-100 text-rose-800 font-black'
                      }`}>
                        {dec.totalAlpa || 0} Hari
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <select
                        value={dec.statusKenaikan}
                        onChange={(e) => handleUpdateStudentDecision(sNipd, { statusKenaikan: e.target.value as any })}
                        className={`w-full px-2.5 py-1.5 rounded-lg border font-bold text-xs focus:outline-none focus:ring-1 ${
                          dec.statusKenaikan === 'Naik Kelas' || dec.statusKenaikan === 'Lulus'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                            : dec.statusKenaikan === 'Tinggal Kelas' || dec.statusKenaikan === 'Tidak Lulus'
                            ? 'bg-rose-50 border-rose-300 text-rose-900'
                            : 'bg-slate-50 border-slate-300 text-slate-800'
                        }`}
                      >
                        {isTingkatAkhir ? (
                          <>
                            <option value="Lulus">LULUS (Tamat)</option>
                            <option value="Tidak Lulus">Tidak Lulus</option>
                            <option value="Ditangguhkan">Ditangguhkan</option>
                          </>
                        ) : (
                          <>
                            <option value="Naik Kelas">Naik Kelas</option>
                            <option value="Tinggal Kelas">Tinggal di Kelas Ini</option>
                            <option value="Ditangguhkan">Ditangguhkan</option>
                          </>
                        )}
                      </select>
                    </td>

                    <td className="py-3 px-4">
                      {isTingkatAkhir ? (
                        <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                          <GraduationCap className="w-4 h-4 text-emerald-600" />
                          <span>Status Lulusan / Alumni SMK Bakti Putra Mandiri</span>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {/* Dropdown Rombel Sistem */}
                          <select
                            value={
                              kelasList.some(k => k.id === dec.targetKelasId || k.namaKelas.toLowerCase() === (dec.targetNamaKelas || '').toLowerCase())
                                ? (kelasList.find(k => k.id === dec.targetKelasId || k.namaKelas.toLowerCase() === (dec.targetNamaKelas || '').toLowerCase())?.id || '')
                                : '__manual__'
                            }
                            disabled={dec.statusKenaikan !== 'Naik Kelas'}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '__manual__') {
                                handleUpdateStudentDecision(sNipd, { targetKelasId: '' });
                              } else {
                                const targetK = kelasList.find(k => k.id === val);
                                handleUpdateStudentDecision(sNipd, { 
                                  targetKelasId: val,
                                  targetNamaKelas: targetK?.namaKelas || ''
                                });
                              }
                            }}
                            className="w-full px-2 py-1 rounded-lg border border-slate-300 bg-white font-medium text-[11px] text-slate-900 disabled:bg-slate-100 disabled:text-slate-400 focus:outline-none focus:border-emerald-600"
                          >
                            <option value="">-- Sesuaikan Rombel --</option>
                            {nextGradeClasses.length > 0 && (
                              <optgroup label="Rombel Tingkat Lanjutan">
                                {nextGradeClasses.map(k => (
                                  <option key={k.id} value={k.id}>{k.namaKelas} ({k.jurusan})</option>
                                ))}
                              </optgroup>
                            )}
                            <optgroup label="Seluruh Rombel Sekolah">
                              {kelasList.map(k => (
                                <option key={k.id} value={k.id}>{k.namaKelas}</option>
                              ))}
                            </optgroup>
                            <option value="__manual__">✏️ Input Manual (Kustom)...</option>
                          </select>

                          {/* Input Manual Bebas */}
                          <input
                            type="text"
                            value={dec.targetNamaKelas || ''}
                            disabled={dec.statusKenaikan !== 'Naik Kelas'}
                            onChange={(e) => {
                              const txt = e.target.value;
                              const matched = kelasList.find(k => k.namaKelas.toLowerCase() === txt.trim().toLowerCase());
                              handleUpdateStudentDecision(sNipd, { 
                                targetNamaKelas: txt,
                                targetKelasId: matched ? matched.id : ''
                              });
                            }}
                            placeholder="Atau ketik manual nama rombel..."
                            className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-500 font-semibold text-slate-800 disabled:bg-slate-100 disabled:text-slate-400"
                          />
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={dec.catatan || ''}
                        onChange={(e) => handleUpdateStudentDecision(sNipd, { catatan: e.target.value })}
                        placeholder="Catatan hasil rapat pleno..."
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </td>
                  </tr>
                );
              })}

              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                    Tidak ada siswa yang ditemukan di rombel ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL / CETAK BERITA ACARA RAPAT PLENO RESMI */}
      {showBeritaAcara && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-10 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 no-print">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-emerald-600" />
                Lembar Cetak Berita Acara Rapat Pleno Kenaikan Kelas & Kelulusan
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('printable-berita-acara');
                    if (el) {
                      printDocumentArea(el, {
                        title: 'Berita Acara Rapat Pleno Kenaikan Kelas & Kelulusan',
                        paperSize: 'A4',
                        orientation: 'portrait',
                        margin: 'sempit',
                      });
                    } else {
                      window.print();
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                  title="Cetak lembar berita acara saja ke printer/PDF"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Dokumen</span>
                </button>
                <button
                  onClick={() => setShowBeritaAcara(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Content */}
            <div className="space-y-6 text-slate-900 text-xs print:p-0 print:border-none">
              {/* Kop Surat Sekolah Resmi */}
              <div className="border-b-4 border-double border-slate-900 pb-4 text-center relative">
                <div className="flex items-center justify-center gap-4">
                  <img 
                    src={schoolInfo?.logoUrl || '/logo_bpm.png'} 
                    alt="Logo Sekolah" 
                    className="w-20 h-20 object-contain absolute left-0 top-0 hidden sm:block"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold tracking-widest uppercase text-slate-600">
                      {schoolInfo?.kopSekolah?.yayasan || 'YAYASAN PENDIDIKAN BAKTI PUTRA MANDIRI'}
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black tracking-wide text-slate-900 uppercase">
                      {schoolInfo?.kopSekolah?.instansi || schoolInfo?.namaLengkap || schoolInfo?.nama || 'SMK BAKTI PUTRA MANDIRI'}
                    </h1>
                    <div className="text-xs font-semibold text-emerald-800">
                      {schoolInfo?.kopSekolah?.subJudul || 'KOMPETENSI KEAHLIAN: ASISTEN FARMASI & KLINIK • ASISTEN KEPERAWATAN • TATA KECANTIKAN & SPA • PERHOTELAN'}
                    </div>
                    <p className="text-[11px] text-slate-600 max-w-xl mx-auto leading-tight">
                      {schoolInfo?.alamatLengkap || schoolInfo?.alamat}
                      <br />
                      NPSN: {schoolInfo?.npsn || '69987123'} • Akreditasi: {schoolInfo?.akreditasi || 'A'} • Telp: {schoolInfo?.telepon || '(021) 5978-2345'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Title */}
              <div className="text-center space-y-1">
                <h2 className="text-base sm:text-lg font-black tracking-wider uppercase underline underline-offset-4">
                  BERITA ACARA RAPAT DEWAN GURU
                </h2>
                <div className="text-xs sm:text-sm font-extrabold uppercase text-slate-800">
                  {isTingkatAkhir ? 'PENETAPAN KELULUSAN PESERTA DIDIK TINGKAT XII' : `PENETAPAN KENAIKAN KELAS TAHUN AJARAN ${schoolInfo.tahunAjaranPembelajaran}`}
                </div>
                <div className="text-[11px] text-slate-500">
                  Nomor: 421.5 / {isTingkatAkhir ? 'SK-LULUS' : 'BA-NAIK'} / SMK-BAPUMA / VI / 2026
                </div>
              </div>

              {/* Body Statement */}
              <div className="space-y-3 leading-relaxed text-justify">
                <p>
                  Pada hari ini, tanggal <strong>{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong>, telah diselenggarakan Rapat Pleno Dewan Guru SMK Bakti Putra Mandiri mengenai penetapan {isTingkatAkhir ? 'kelulusan peserta didik tingkat akhir (Kelas XII)' : 'kenaikan kelas peserta didik semester genap'} Tahun Ajaran <strong>{schoolInfo.tahunAjaranPembelajaran}</strong> untuk rombongan belajar <strong>{currentKelas?.namaKelas}</strong> program keahlian <strong>{currentKelas?.jurusan}</strong>.
                </p>
                <p>
                  Berdasarkan evaluasi capaian hasil belajar seluruh mata pelajaran (intrakurikuler), nilai ekstrakurikuler, catatan kepribadian dan karakter, serta rekapitulasi kehadiran peserta didik, rapat memutuskan sebagai berikut:
                </p>
              </div>

              {/* Summary Table */}
              <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold">
                    <th className="py-2 px-3 w-8 text-center border-r border-slate-300">No</th>
                    <th className="py-2 px-3 border-r border-slate-300">Nama Siswa</th>
                    <th className="py-2 px-3 w-28 text-center border-r border-slate-300">NIPD / NISN</th>
                    <th className="py-2 px-3 w-28 text-center border-r border-slate-300">Keputusan</th>
                    <th className="py-2 px-3">Tujuan Rombel / Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {classStudents.map((st, idx) => {
                    const sNipd = st.nipd || st.nipOrNis;
                    const dec = decisions[sNipd];
                    return (
                      <tr key={st.id}>
                        <td className="py-1.5 px-3 text-center border-r border-slate-200">{idx + 1}</td>
                        <td className="py-1.5 px-3 font-semibold text-slate-900 border-r border-slate-200">{st.nama}</td>
                        <td className="py-1.5 px-3 text-center font-mono border-r border-slate-200">{sNipd}</td>
                        <td className="py-1.5 px-3 text-center font-bold text-slate-900 border-r border-slate-200">
                          {dec?.statusKenaikan || (isTingkatAkhir ? 'Lulus' : 'Naik Kelas')}
                        </td>
                        <td className="py-1.5 px-3 text-slate-700 text-[11px]">
                          {isTingkatAkhir 
                            ? 'Lulus Memenuhi Kriteria Kelulusan Satuan Pendidikan' 
                            : (dec?.statusKenaikan === 'Naik Kelas' ? `Naik ke ${dec.targetNamaKelas || 'Kelas Berikutnya'}` : 'Tinggal di kelas')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Tanda Tangan */}
              <div className="pt-8 grid grid-cols-2 gap-8 text-center">
                <div className="space-y-1">
                  <div className="text-slate-500">Wali Kelas {currentKelas?.namaKelas},</div>
                  <div className="h-20"></div>
                  <div className="font-bold text-slate-900 underline">
                    {currentKelas?.namaWalas || 'Wali Kelas Resmi'}
                  </div>
                  <div className="text-[10px] text-slate-600">NIP. 198709232011012003</div>
                </div>

                <div className="space-y-1">
                  <div className="text-slate-500">Kepala Sekolah SMK Bakti Putra Mandiri,</div>
                  <div className="h-20"></div>
                  <div className="font-bold text-slate-900 underline">
                    {schoolInfo.kepalaSekolah || 'Dr. H. Hendra Gunawan, M.Pd'}
                  </div>
                  <div className="text-[10px] text-slate-600">NIP. {schoolInfo.nipKepalaSekolah || '197506122002121003'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
