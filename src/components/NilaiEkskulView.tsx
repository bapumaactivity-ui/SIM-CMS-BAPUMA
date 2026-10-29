import React, { useState, useMemo } from 'react';
import { User, Ekskul, NilaiEkskulSiswa, Kelas, SchoolInfo } from '../types';
import { KopSuratView } from './KopSuratView';
import { 
  isUserAdmin, 
  isUserWalas, 
  getWalasAssignedClasses, 
  getPembinaAssignedEkskuls, 
  isUserPembina, 
  canAccessNilaiEkskul,
  formatKepsekIdentifier,
  formatTeacherIdentifier
} from '../utils/academicHelpers';
import { 
  Award, 
  Search, 
  Save, 
  CheckCircle2, 
  Users, 
  CheckCheck, 
  Sparkles, 
  ShieldCheck, 
  Filter, 
  UserCheck,
  Lock,
  AlertTriangle,
  Printer
} from 'lucide-react';

export interface NilaiEkskulViewProps {
  currentUser: User;
  ekskulList: Ekskul[];
  usersList: User[];
  kelasList: Kelas[];
  nilaiEkskulList: NilaiEkskulSiswa[];
  schoolInfo?: SchoolInfo;
  onSaveNilaiEkskul: (list: NilaiEkskulSiswa[]) => void;
  onUpdateUser?: (user: User) => void;
}

export const NilaiEkskulView: React.FC<NilaiEkskulViewProps> = ({
  currentUser,
  ekskulList,
  usersList,
  kelasList,
  nilaiEkskulList,
  schoolInfo,
  onSaveNilaiEkskul,
}) => {
  const isAdmin = isUserAdmin(currentUser);
  const walasAssignedClasses = getWalasAssignedClasses(currentUser, kelasList);
  const isWalas = isAdmin || isUserWalas(currentUser, kelasList);
  const pembinaEkskuls = getPembinaAssignedEkskuls(currentUser, ekskulList);
  const isPembina = isUserPembina(currentUser, ekskulList);
  const canAccess = canAccessNilaiEkskul(currentUser, ekskulList, kelasList);

  // If user is neither Admin, Walas, nor Pembina, access is strictly denied
  if (!canAccess) {
    return (
      <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm max-w-2xl mx-auto text-center space-y-4 my-8">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto text-3xl font-black">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-black text-slate-900">Hak Akses Dibatasi</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
            Pengisian dan pengelolaan nilai ekstrakurikuler hanya dapat diakses oleh <strong>Pembina Ekstrakurikuler</strong>, <strong>Wali Kelas</strong>, dan <strong>Administrator</strong>.
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 text-left space-y-1">
          <p className="font-bold text-slate-800">Status Akun Anda:</p>
          <p>Nama: <strong>{currentUser.nama}</strong> ({currentUser.nipOrNis || currentUser.username})</p>
          <p>Peran: <strong>Guru Mata Pelajaran</strong> (bukan Pembina Ekskul dan bukan Wali Kelas)</p>
          <p className="text-slate-500 pt-1">
            Sebagai Guru Mata Pelajaran biasa, Anda hanya berhak mengelola dan mencetak nilai/leger mata pelajaran yang Anda ampu secara pribadi.
          </p>
        </div>
      </div>
    );
  }

  // Determine allowed ekskuls:
  // STRICT: Guru Pembina HANYA dapat mengakses dan mencetak ekstrakurikuler yang dibina oleh dirinya sendiri!
  const availableEkskuls = useMemo(() => {
    if (isAdmin || isWalas) return ekskulList;
    if (isPembina || currentUser.role === 'pembina_ekskul') {
      return pembinaEkskuls;
    }
    return [];
  }, [isAdmin, isWalas, isPembina, currentUser.role, pembinaEkskuls, ekskulList]);

  // If Pembina has no assigned ekskuls yet, show a helpful clear banner
  if (availableEkskuls.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm max-w-2xl mx-auto text-center space-y-4 my-8">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto text-3xl font-black">
          <Award className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-black text-slate-900">Belum Ada Ekstrakurikuler Ditugaskan</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
            Anda terdaftar sebagai Pembina, namun saat ini belum ada kegiatan ekstrakurikuler yang ditetapkan atas nama Anda (<strong>{currentUser.nama}</strong>).
          </p>
          <p className="text-xs text-slate-400 pt-2">
            Silakan hubungi Administrator Sekolah untuk memetakan kegiatan ekstrakurikuler binaan Anda agar dapat menginput dan mencetak leger nilainya.
          </p>
        </div>
      </div>
    );
  }

  // Initial selected ekskul
  const defaultEkskulId = isPembina && pembinaEkskuls.length > 0
    ? pembinaEkskuls[0].id 
    : (availableEkskuls[0]?.id || '');
  
  const [selectedEkskulId, setSelectedEkskulId] = useState<string>(defaultEkskulId);

  // If selectedEkskulId is not in availableEkskuls, auto correct it
  const effectiveEkskulId = availableEkskuls.some(e => e.id === selectedEkskulId)
    ? selectedEkskulId
    : (availableEkskuls[0]?.id || '');

  // Walas specific classes
  const walasKelas = walasAssignedClasses[0];

  const [selectedKelasId, setSelectedKelasId] = useState<string>(
    isWalas && !isAdmin && walasKelas ? walasKelas.id : 'all'
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  // Local draft mapping for quick edits: `${nipd}_${ekskulId}` -> { isEnrolled, predikat, keterangan }
  const [draftGrades, setDraftGrades] = useState<Record<string, {
    isEnrolled: boolean;
    predikat: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Kurang';
    keterangan: string;
  }>>({});

  const activeEkskul = availableEkskuls.find(e => e.id === effectiveEkskulId) || availableEkskuls[0] || ekskulList[0];

  // List all students
  const allStudents = useMemo(() => {
    return usersList.filter(u => u.role === 'siswa');
  }, [usersList]);

  // Filter students based on class selection and role permissions
  const filteredStudents = useMemo(() => {
    return allStudents.filter(s => {
      const studentClassObj = kelasList.find(k => k.namaKelas === s.kelas || k.id === s.idKelas);
      const studentKelasId = studentClassObj?.id || s.idKelas || '';

      // If walas (and not admin, and not pembina of this ekskul), restrict strictly to walas classes
      const isCoachOfCurrentEkskul = pembinaEkskuls.some(pe => pe.id === effectiveEkskulId);
      if (isWalas && !isAdmin && !isCoachOfCurrentEkskul) {
        const belongsToWalas = walasAssignedClasses.some(wk => wk.id === studentKelasId || wk.namaKelas === s.kelas);
        if (!belongsToWalas) return false;
      }

      // Dropdown filter
      if (selectedKelasId !== 'all') {
        if (studentKelasId !== selectedKelasId && s.kelas !== selectedKelasId) {
          const selectedObj = kelasList.find(k => k.id === selectedKelasId);
          if (!selectedObj || s.kelas !== selectedObj.namaKelas) {
            return false;
          }
        }
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nipd = (s.nipd || s.nipOrNis || '').toLowerCase();
        const nama = (s.nama || '').toLowerCase();
        const kls = (s.kelas || s.namaKelas || '').toLowerCase();
        return nipd.includes(q) || nama.includes(q) || kls.includes(q);
      }

      return true;
    });
  }, [allStudents, isWalas, isAdmin, pembinaEkskuls, effectiveEkskulId, walasAssignedClasses, selectedKelasId, searchQuery, kelasList]);

  // Helper to get grade info for a student
  const getStudentGradeState = (student: User) => {
    if (!activeEkskul) return { isEnrolled: false, predikat: 'Baik' as const, keterangan: '' };
    const nipdKey = student.nipd || student.nipOrNis || student.id;
    const key = `${nipdKey}_${activeEkskul.id}`;

    if (draftGrades[key]) {
      return draftGrades[key];
    }

    // Check existing stored grade
    const existingGrade = nilaiEkskulList.find(n => n.nipd === nipdKey && (n.idEkskul === activeEkskul.id || n.namaEkskul === activeEkskul.nama));
    if (existingGrade) {
      return {
        isEnrolled: true,
        predikat: existingGrade.predikat || 'Sangat Baik',
        keterangan: existingGrade.keterangan || 'Menunjukkan antusiasme tinggi dan disiplin dalam seluruh kegiatan ekstrakurikuler.',
      };
    }

    // Default enrollment check
    const isWajib = activeEkskul.kategori === 'wajib';
    const isKeputrian = activeEkskul.nama.toLowerCase().includes('keputrian');
    const isPerempuan = student.jenisKelamin === 'Perempuan' || student.jk === 'P';

    const enrolled = isWajib 
      ? (isKeputrian ? isPerempuan : true)
      : (student.ekskulDiikuti || []).includes(activeEkskul.id) || (student.ekskulDiikuti || []).includes(activeEkskul.nama);

    return {
      isEnrolled: enrolled,
      predikat: 'Sangat Baik' as const,
      keterangan: 'Aktif berpartisipasi dan menyelesaikan agenda kegiatan dengan baik.',
    };
  };

  const handleUpdateStudentDraft = (
    student: User, 
    field: 'isEnrolled' | 'predikat' | 'keterangan', 
    value: any
  ) => {
    if (!activeEkskul) return;
    const nipdKey = student.nipd || student.nipOrNis || student.id;
    const key = `${nipdKey}_${activeEkskul.id}`;
    const current = getStudentGradeState(student);

    setDraftGrades(prev => ({
      ...prev,
      [key]: {
        ...current,
        [field]: value,
      }
    }));
  };

  const handleBulkEnroll = (enrolled: boolean) => {
    if (!activeEkskul) return;
    const updated = { ...draftGrades };
    filteredStudents.forEach(s => {
      const nipdKey = s.nipd || s.nipOrNis || s.id;
      const key = `${nipdKey}_${activeEkskul.id}`;
      const current = getStudentGradeState(s);
      updated[key] = {
        ...current,
        isEnrolled: enrolled,
      };
    });
    setDraftGrades(updated);
  };

  const handleBulkPredicate = (predikat: 'Sangat Baik' | 'Baik') => {
    if (!activeEkskul) return;
    const updated = { ...draftGrades };
    filteredStudents.forEach(s => {
      const nipdKey = s.nipd || s.nipOrNis || s.id;
      const key = `${nipdKey}_${activeEkskul.id}`;
      const current = getStudentGradeState(s);
      updated[key] = {
        ...current,
        predikat,
        keterangan: predikat === 'Sangat Baik' 
          ? 'Menunjukkan dedikasi prima, kedisiplinan tinggi, dan penguasaan materi ekstrakurikuler yang sangat baik.'
          : 'Menunjukkan kehadiran teratur, minat yang baik, dan kerja sama aktif dalam setiap latihan.'
      };
    });
    setDraftGrades(updated);
  };

  const handleSaveAllGrades = () => {
    if (!activeEkskul) return;

    // Merge current drafts with global nilaiEkskulList
    const newGradesList = [...nilaiEkskulList];

    filteredStudents.forEach(s => {
      const nipdKey = s.nipd || s.nipOrNis || s.id;
      const gradeState = getStudentGradeState(s);

      const existingIndex = newGradesList.findIndex(n => 
        n.nipd === nipdKey && (n.idEkskul === activeEkskul.id || n.namaEkskul === activeEkskul.nama)
      );

      if (gradeState.isEnrolled) {
        const item: NilaiEkskulSiswa = {
          id: existingIndex >= 0 ? newGradesList[existingIndex].id : `ne-${Date.now()}-${nipdKey}`,
          nipd: nipdKey,
          namaSiswa: s.nama,
          kelas: s.kelas || s.namaKelas || 'X',
          idEkskul: activeEkskul.id,
          namaEkskul: activeEkskul.nama,
          predikat: gradeState.predikat,
          keterangan: gradeState.keterangan,
        };

        if (existingIndex >= 0) {
          newGradesList[existingIndex] = item;
        } else {
          newGradesList.push(item);
        }
      } else {
        // If un-enrolled, remove existing grade entry
        if (existingIndex >= 0) {
          newGradesList.splice(existingIndex, 1);
        }
      }
    });

    onSaveNilaiEkskul(newGradesList);
    try {
      localStorage.setItem('saved_nilai_ekskul_list', JSON.stringify(newGradesList));
    } catch (_) {}

    setNotification(`Nilai Ekstrakurikuler "${activeEkskul.nama}" untuk ${filteredStudents.length} siswa berhasil disimpan ke Rapor resmi!`);
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-800 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/30 border border-purple-400/40 text-purple-200 text-xs font-bold uppercase tracking-wider">
              <Award className="w-4 h-4 text-purple-300" />
              <span>Penilaian Resmi Ekstrakurikuler Kurikulum Merdeka</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black">
              Pengisian Nilai Ekstrakurikuler Peserta Didik
            </h2>
            <p className="text-xs sm:text-sm text-purple-200 max-w-2xl leading-relaxed">
              Dapat diisi oleh <strong>Administrator</strong>, <strong>Wali Kelas</strong>, dan <strong>Pembina Ekstrakurikuler</strong>. Nilai dan capaian kompetensi akan langsung tercetak pada dokumen resmi Raport Kurikulum Merdeka.
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-1.5 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15">
            <span className="text-[11px] text-purple-200 font-semibold">Peran Penginput:</span>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>
                {isAdmin ? 'Super Administrator (Akses Penuh)' : 
                 isWalas && isPembina ? `Wali Kelas & Pembina Ekskul (${currentUser.nama})` :
                 isWalas ? `Wali Kelas (${walasKelas?.namaKelas || 'Rombel Binaan'})` :
                 isPembina ? `Pembina Ekskul (${pembinaEkskuls.map(p => p.nama).join(', ')})` :
                 `Guru / Pembina (${currentUser.nama})`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-900 text-xs font-bold shadow-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Control Panel: Select Ekskul, Filter Class, Search */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* 1. Pilih Ekskul */}
          <div className="space-y-1 sm:col-span-2">
            <div className="flex items-center justify-between">
              <label className="block font-bold text-slate-700">
                Pilih Kegiatan Ekstrakurikuler *
              </label>
              {isPembina && !isAdmin && !isWalas && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                  Mode Pembina Ekskul
                </span>
              )}
            </div>
            <select
              value={effectiveEkskulId}
              onChange={(e) => setSelectedEkskulId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-purple-900 bg-purple-50/40 focus:outline-none focus:border-purple-500"
            >
              {availableEkskuls.map(e => {
                const isMyEkskul = (e.pembina || '').toLowerCase().includes(currentUser.nama.toLowerCase());
                return (
                  <option key={e.id} value={e.id}>
                    {e.nama} ({e.kategori.toUpperCase()}) — Pembina: {e.pembina || 'Belum Ditetapkan'} {isMyEkskul ? '★ (Binaan Anda)' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* 2. Filter Kelas */}
          <div className="space-y-1">
            <label className="block font-bold text-slate-700">
              Filter Rombel / Kelas
            </label>
            <select
              value={selectedKelasId}
              onChange={(e) => setSelectedKelasId(e.target.value)}
              disabled={isWalas && !isAdmin && (!isPembina || !pembinaEkskuls.some(pe => pe.id === effectiveEkskulId))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-semibold text-slate-800 bg-white focus:outline-none focus:border-purple-500 disabled:bg-slate-100 disabled:text-slate-500"
            >
              {(isAdmin || (isPembina && pembinaEkskuls.some(pe => pe.id === effectiveEkskulId))) && (
                <option value="all">Semua Rombel ({allStudents.length} Siswa)</option>
              )}
              {(isWalas && !isAdmin ? walasAssignedClasses : kelasList).map(k => (
                <option key={k.id} value={k.id}>
                  {k.namaKelas} ({k.jurusan})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Search Siswa */}
          <div className="space-y-1">
            <label className="block font-bold text-slate-700">
              Cari Nama / NISN Siswa
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik nama / NIPD..."
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-800 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Quick Toolbar */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-500 mr-1">Tindakan Cepat:</span>
            <button
              type="button"
              onClick={() => handleBulkEnroll(true)}
              className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 font-semibold border border-purple-200 transition-colors"
            >
              ✓ Tandai Semua Ikut
            </button>
            <button
              type="button"
              onClick={() => handleBulkPredicate('Sangat Baik')}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200 transition-colors"
            >
              ★ Beri Sangat Baik (A) Semua
            </button>
            <button
              type="button"
              onClick={() => handleBulkPredicate('Baik')}
              className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 font-semibold border border-blue-200 transition-colors"
            >
              ✓ Beri Baik (B) Semua
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md shadow-amber-600/20 flex items-center gap-2 transition-all cursor-pointer"
              title="Cetak Buku Leger / Rekapitulasi Nilai Ekstrakurikuler Resmi"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Leger Nilai Ekskul</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAllGrades}
              className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs shadow-md shadow-purple-700/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Nilai Ekstrakurikuler ke Raport</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Students Grading Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-sm">
              Daftar Penilaian: {activeEkskul?.nama}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold uppercase">
              {activeEkskul?.kategori}
            </span>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Menampilkan {filteredStudents.length} Peserta Didik
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4 w-28 text-center">Status Ikut</th>
                <th className="py-3 px-4 w-32">NIPD / NISN</th>
                <th className="py-3 px-4">Nama Peserta Didik</th>
                <th className="py-3 px-4 w-28">Kelas</th>
                <th className="py-3 px-4 w-44">Predikat Rapor</th>
                <th className="py-3 px-4">Keterangan Capaian / Deskripsi Rapor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((student, idx) => {
                const gradeState = getStudentGradeState(student);
                return (
                  <tr 
                    key={student.id} 
                    className={`transition-colors ${gradeState.isEnrolled ? 'bg-purple-50/20 hover:bg-purple-50/40' : 'hover:bg-slate-50 opacity-60'}`}
                  >
                    <td className="py-3 px-4 text-center text-slate-400 font-semibold">
                      {idx + 1}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={gradeState.isEnrolled}
                          onChange={(e) => handleUpdateStudentDraft(student, 'isEnrolled', e.target.checked)}
                          className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                        />
                        <span className={`text-[11px] font-bold ${gradeState.isEnrolled ? 'text-purple-700' : 'text-slate-400'}`}>
                          {gradeState.isEnrolled ? 'Aktif' : 'Tidak'}
                        </span>
                      </label>
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-slate-700">
                      {student.nipd || student.nipOrNis || '-'}
                    </td>

                    <td className="py-3 px-4 font-bold text-slate-900">
                      {student.nama}
                    </td>

                    <td className="py-3 px-4 font-semibold text-slate-600">
                      {student.kelas || student.namaKelas || '-'}
                    </td>

                    <td className="py-3 px-4">
                      {gradeState.isEnrolled ? (
                        <select
                          value={gradeState.predikat}
                          onChange={(e) => handleUpdateStudentDraft(student, 'predikat', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl border border-purple-300 font-bold text-xs bg-white text-purple-900 focus:outline-none focus:border-purple-600 shadow-xs"
                        >
                          <option value="Sangat Baik">Sangat Baik (A)</option>
                          <option value="Baik">Baik (B)</option>
                          <option value="Cukup">Cukup (C)</option>
                          <option value="Kurang">Kurang (D)</option>
                        </select>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Tidak Mengikuti</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {gradeState.isEnrolled ? (
                        <input
                          type="text"
                          value={gradeState.keterangan}
                          onChange={(e) => handleUpdateStudentDraft(student, 'keterangan', e.target.value)}
                          placeholder="Deskripsi capaian kegiatan..."
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:border-purple-500"
                        />
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    Tidak ada siswa yang sesuai dengan filter atau kata kunci pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info & submit button */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            Nilai yang disimpan akan langsung terakumulasi ke dalam dokumen resmi Rapor Siswa pada bagian <strong>Tabel Kegiatan Ekstrakurikuler</strong>.
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Leger Nilai Ekskul</span>
            </button>
            <button
              type="button"
              onClick={handleSaveAllGrades}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs shadow-md shadow-purple-700/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Nilai Ekstrakurikuler</span>
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* PRINTABLE OFFICIAL LEGER EKSTRAKURIKULER DOCUMENT (PAPER OUTPUT) */}
      {/* ============================================================== */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm 10mm 12mm;
          }
          body {
            background: white !important;
            color: black !important;
          }
          .no-print, header, nav, aside {
            display: none !important;
          }
          .printable-ekskul-doc {
            display: block !important;
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
            border: 1px solid #000000 !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="hidden print:block printable-ekskul-doc bg-white text-black p-4">
        {/* Kop Surat Resmi */}
        <KopSuratView schoolInfo={schoolInfo} />

        {/* Document Title Header */}
        <div className="text-center my-4 pb-2 border-b border-black">
          <h2 className="text-sm font-black tracking-wider uppercase font-serif">
            BUKU LEGER REKAPITULASI NILAI EKSTRAKURIKULER
          </h2>
          <p className="text-xs font-bold font-serif uppercase tracking-wide mt-0.5">
            KEGIATAN: {activeEkskul?.nama || '-'} ({activeEkskul?.kategori || 'Pilihan'})
          </p>
          <p className="text-[11px] font-sans text-slate-800 mt-1">
            Tahun Ajaran: {schoolInfo?.tahunAjaranPembelajaran || '2026/2027'} • Pembina: {activeEkskul?.pembina || currentUser.nama}
          </p>
        </div>

        {/* Official Grade Ledger Table */}
        <table className="w-full text-[11px] print-border-table mb-6">
          <thead>
            <tr className="bg-slate-100 font-bold text-center">
              <th className="py-2 px-2 w-10">NO</th>
              <th className="py-2 px-2 w-28">NIPD / NISN</th>
              <th className="py-2 px-3 text-left">NAMA PESERTA DIDIK</th>
              <th className="py-2 px-2 w-28">KELAS / ROMBEL</th>
              <th className="py-2 px-2 w-28">PREDIKAT NILAI</th>
              <th className="py-2 px-3 text-left">CAPAIAN KOMPETENSI / KETERANGAN PEMBINAAN</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents
              .filter(s => getStudentGradeState(s).isEnrolled)
              .map((student, idx) => {
                const gradeState = getStudentGradeState(student);
                return (
                  <tr key={student.id}>
                    <td className="py-1.5 px-2 text-center font-bold">{idx + 1}</td>
                    <td className="py-1.5 px-2 text-center font-mono">{student.nipd || student.nipOrNis || '-'}</td>
                    <td className="py-1.5 px-3 font-bold uppercase">{student.nama}</td>
                    <td className="py-1.5 px-2 text-center">{student.kelas || student.namaKelas || '-'}</td>
                    <td className="py-1.5 px-2 text-center font-bold">{gradeState.predikat}</td>
                    <td className="py-1.5 px-3 text-[10px] leading-tight">{gradeState.keterangan || 'Mengikuti kegiatan ekstrakurikuler dengan sangat baik dan aktif.'}</td>
                  </tr>
                );
              })}
            {filteredStudents.filter(s => getStudentGradeState(s).isEnrolled).length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-500 italic">
                  Belum ada peserta didik yang ditandai aktif mengikuti kegiatan ekstrakurikuler ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Signatures Block */}
        <div className="flex justify-between items-start pt-6 text-xs text-black break-inside-avoid">
          <div className="text-center w-60">
            <p className="mb-1">Mengetahui,</p>
            <p className="font-bold">Kepala Sekolah</p>
            <div className="h-16"></div>
            <p className="font-bold underline uppercase">{schoolInfo?.kepalaSekolah || (schoolInfo as any)?.namaKepsek || 'H. Muh. Sumardi, S.Pd., M.M'}</p>
            <p className="text-[10px] text-slate-700">{formatKepsekIdentifier(schoolInfo)}</p>
          </div>

          <div className="text-center w-60">
            <p className="mb-1">{schoolInfo?.alamatLengkap ? schoolInfo.alamatLengkap.split(',')[0] : 'Bogor'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p className="font-bold">Pembina Ekstrakurikuler</p>
            <div className="h-16"></div>
            <p className="font-bold underline uppercase">{activeEkskul?.pembina || currentUser.nama}</p>
            <p className="text-[10px] text-slate-700">{formatTeacherIdentifier(currentUser)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
