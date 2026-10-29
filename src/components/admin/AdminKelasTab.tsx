import React, { useState, useMemo } from 'react';
import { Kelas, User, SchoolInfo, KejuruanDetail } from '../../types';
import { SCHOOL_INFO } from '../../data/initialData';
import { 
  GraduationCap, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Users, 
  School, 
  Check, 
  X, 
  Building, 
  Layers,
  Power,
  PowerOff,
  AlertTriangle,
  BookOpen,
  Sparkles,
  Info
} from 'lucide-react';

interface AdminKelasTabProps {
  kelasList: Kelas[];
  usersList: User[];
  schoolInfo?: SchoolInfo;
  onAddKelas: (kelas: Kelas) => void;
  onUpdateKelas: (kelas: Kelas) => void;
  onDeleteKelas: (kelasId: string) => void;
  onUpdateSchoolInfo?: (info: SchoolInfo) => void;
}

export const AdminKelasTab: React.FC<AdminKelasTabProps> = ({
  kelasList,
  usersList,
  schoolInfo,
  onAddKelas,
  onUpdateKelas,
  onDeleteKelas,
  onUpdateSchoolInfo,
}) => {
  // Navigation: Sub-tab switcher between Rombel Kelas & Program Kejuruan
  const [activeSubTab, setActiveSubTab] = useState<'rombel' | 'jurusan'>('rombel');
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // -------------------------------------------------------------
  // KEJURUAN / JURUSAN DATA & STATE
  // -------------------------------------------------------------
  const currentKejuruanList: KejuruanDetail[] = useMemo(() => {
    if (schoolInfo?.kejuruanList && schoolInfo.kejuruanList.length > 0) {
      return schoolInfo.kejuruanList;
    }
    return SCHOOL_INFO.kejuruanList || [];
  }, [schoolInfo?.kejuruanList]);

  const availableJurusanNames = useMemo(() => {
    if (currentKejuruanList.length > 0) {
      return currentKejuruanList.map(j => j.singkatan || j.nama);
    }
    return ['Farmasi', 'Asisten Keperawatan', 'Kesehatan', 'Tata Kecantikan & Spa', 'Perhotelan'];
  }, [currentKejuruanList]);

  // Jurusan Search & Filters
  const [jurusanSearchTerm, setJurusanSearchTerm] = useState('');
  const [jurusanFilterStatus, setJurusanFilterStatus] = useState<'all' | 'aktif' | 'nonaktif'>('all');

  // Jurusan Modal State
  const [showJurusanModal, setShowJurusanModal] = useState(false);
  const [editingJurusanId, setEditingJurusanId] = useState<string | null>(null);
  const [jurKode, setJurKode] = useState('');
  const [jurNama, setJurNama] = useState('');
  const [jurSingkatan, setJurSingkatan] = useState('');
  const [jurDeskripsi, setJurDeskripsi] = useState('');
  const [jurVisi, setJurVisi] = useState('');
  const [jurKuotaRombel, setJurKuotaRombel] = useState<number>(1);
  const [jurKuotaSiswa, setJurKuotaSiswa] = useState<number>(36);
  const [jurFasilitasLab, setJurFasilitasLab] = useState('');
  const [jurProspekKerja, setJurProspekKerja] = useState('');
  const [jurStatus, setJurStatus] = useState<'aktif' | 'nonaktif'>('aktif');

  // Confirm Toggle Status Modal (for Rombel & Jurusan)
  const [confirmToggleKelas, setConfirmToggleKelas] = useState<Kelas | null>(null);
  const [confirmToggleJurusan, setConfirmToggleJurusan] = useState<KejuruanDetail | null>(null);

  // -------------------------------------------------------------
  // ROMBEL KELAS STATE & HANDLERS
  // -------------------------------------------------------------
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTingkat, setFilterTingkat] = useState<string>('all');
  const [filterJurusan, setFilterJurusan] = useState<string>('all');
  const [filterStatusKelas, setFilterStatusKelas] = useState<'all' | 'aktif' | 'nonaktif'>('all');

  // Rombel Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingKelasId, setEditingKelasId] = useState<string | null>(null);

  // Form State
  const [formTingkat, setFormTingkat] = useState<'X' | 'XI' | 'XII'>('X');
  const [formJurusan, setFormJurusan] = useState<string>('Farmasi');
  const [formNamaKelas, setFormNamaKelas] = useState('');
  const [formIdWalas, setFormIdWalas] = useState('');
  const [formRuang, setFormRuang] = useState('Gedung A - R. 101');
  const [formKapasitas, setFormKapasitas] = useState(36);
  const [formTahunAjaran, setFormTahunAjaran] = useState('2026/2027');
  const [formStatusKelas, setFormStatusKelas] = useState<'aktif' | 'nonaktif'>('aktif');

  const teachersList = usersList.filter(u => u.role === 'guru' || u.role === 'walas');

  const getTeacherClassesText = (teacherId: string) => {
    const holding = kelasList.filter(k => (k.idWalas === teacherId) && k.id !== editingKelasId);
    if (holding.length > 0) {
      return ` [Wali Kelas: ${holding.map(k => k.namaKelas).join(', ')}]`;
    }
    return '';
  };

  const openAddModal = () => {
    setEditingKelasId(null);
    setFormTingkat('X');
    setFormJurusan(availableJurusanNames[0] || 'Farmasi');
    setFormNamaKelas('X Farmasi 3');
    setFormIdWalas('');
    setFormRuang('Gedung A - R. 103');
    setFormKapasitas(36);
    setFormTahunAjaran('2026/2027');
    setFormStatusKelas('aktif');
    setShowModal(true);
  };

  const openEditModal = (kelas: Kelas) => {
    setEditingKelasId(kelas.id);
    setFormTingkat(kelas.tingkat || 'X');
    setFormJurusan(kelas.jurusan as any || 'Farmasi');
    setFormNamaKelas(kelas.namaKelas);
    setFormIdWalas(kelas.idWalas || '');
    setFormRuang(kelas.ruang || 'Ruang 101');
    setFormKapasitas(kelas.kapasitas || 36);
    setFormTahunAjaran(kelas.tahunAjaran || '2026/2027');
    setFormStatusKelas(kelas.status === 'nonaktif' ? 'nonaktif' : 'aktif');
    setShowModal(true);
  };

  const handleSubmitKelas = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedWalas = teachersList.find(t => t.id === formIdWalas);
    const walasName = selectedWalas ? selectedWalas.nama : 'Belum Ditentukan';

    if (editingKelasId) {
      const updated: Kelas = {
        id: editingKelasId,
        namaKelas: formNamaKelas,
        tingkat: formTingkat,
        jurusan: formJurusan,
        idWalas: formIdWalas,
        namaWalas: walasName,
        ruang: formRuang,
        kapasitas: formKapasitas,
        tahunAjaran: formTahunAjaran,
        status: formStatusKelas,
        aktif: formStatusKelas === 'aktif',
      };
      onUpdateKelas(updated);
      showNotification(`Rombel kelas "${formNamaKelas}" berhasil diperbarui!`);
    } else {
      const newKelas: Kelas = {
        id: `k-${Date.now()}`,
        namaKelas: formNamaKelas,
        tingkat: formTingkat,
        jurusan: formJurusan,
        idWalas: formIdWalas,
        namaWalas: walasName,
        ruang: formRuang,
        kapasitas: formKapasitas,
        tahunAjaran: formTahunAjaran,
        status: formStatusKelas,
        aktif: formStatusKelas === 'aktif',
      };
      onAddKelas(newKelas);
      showNotification(`Rombel kelas "${formNamaKelas}" berhasil ditambahkan!`);
    }
    setShowModal(false);
  };

  // Toggle Status Rombel Kelas (Nonaktifkan / Aktifkan)
  const handleToggleStatusKelas = (kelas: Kelas) => {
    const isCurrentlyNonaktif = kelas.status === 'nonaktif';
    if (!isCurrentlyNonaktif) {
      // If currently active, prompt confirmation before deactivating
      setConfirmToggleKelas(kelas);
    } else {
      // If currently inactive, reactivate immediately
      const updated: Kelas = {
        ...kelas,
        status: 'aktif',
        aktif: true,
      };
      onUpdateKelas(updated);
      showNotification(`Rombel kelas "${kelas.namaKelas}" berhasil diaktifkan kembali!`);
    }
  };

  const handleConfirmDeactivateKelas = () => {
    if (!confirmToggleKelas) return;
    const updated: Kelas = {
      ...confirmToggleKelas,
      status: 'nonaktif',
      aktif: false,
    };
    onUpdateKelas(updated);
    showNotification(`Rombel kelas "${confirmToggleKelas.namaKelas}" berhasil dinonaktifkan.`);
    setConfirmToggleKelas(null);
  };

  const handleDeleteKelas = (kelas: Kelas) => {
    if (confirm(`Apakah Anda yakin ingin menghapus rombel kelas "${kelas.namaKelas}" secara permanen? Data yang telah dihapus tidak dapat dikembalikan.`)) {
      onDeleteKelas(kelas.id);
      showNotification(`Rombel kelas "${kelas.namaKelas}" berhasil dihapus.`);
    }
  };

  // -------------------------------------------------------------
  // PROGRAM KEJURUAN HANDLERS
  // -------------------------------------------------------------
  const handleOpenAddJurusan = () => {
    setEditingJurusanId(null);
    setJurKode('');
    setJurNama('');
    setJurSingkatan('');
    setJurDeskripsi('');
    setJurVisi('');
    setJurKuotaRombel(1);
    setJurKuotaSiswa(36);
    setJurFasilitasLab('');
    setJurProspekKerja('');
    setJurStatus('aktif');
    setShowJurusanModal(true);
  };

  const handleOpenEditJurusan = (jur: KejuruanDetail) => {
    setEditingJurusanId(jur.id);
    setJurKode(jur.kode || '');
    setJurNama(jur.nama || '');
    setJurSingkatan(jur.singkatan || '');
    setJurDeskripsi(jur.deskripsi || '');
    setJurVisi(jur.visi || '');
    setJurKuotaRombel(jur.kuotaRombel || 1);
    setJurKuotaSiswa(jur.kuotaSiswa || 36);
    setJurFasilitasLab(jur.fasilitasLab || '');
    setJurProspekKerja(jur.prospekKerja || '');
    setJurStatus(jur.status === 'nonaktif' ? 'nonaktif' : 'aktif');
    setShowJurusanModal(true);
  };

  const handleSaveJurusan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jurNama.trim()) {
      alert('Nama kejuruan wajib diisi.');
      return;
    }

    const currentList = [...currentKejuruanList];
    let updatedList: KejuruanDetail[];

    if (editingJurusanId) {
      updatedList = currentList.map(j => {
        if (j.id === editingJurusanId) {
          return {
            ...j,
            kode: jurKode.trim().toUpperCase() || 'JUR',
            nama: jurNama.trim(),
            singkatan: jurSingkatan.trim() || jurNama.trim(),
            deskripsi: jurDeskripsi.trim(),
            visi: jurVisi.trim(),
            kuotaRombel: Number(jurKuotaRombel) || 1,
            kuotaSiswa: Number(jurKuotaSiswa) || 36,
            fasilitasLab: jurFasilitasLab.trim(),
            prospekKerja: jurProspekKerja.trim(),
            status: jurStatus,
            aktif: jurStatus === 'aktif',
          };
        }
        return j;
      });
    } else {
      const newJur: KejuruanDetail = {
        id: `jur-${Date.now()}`,
        kode: jurKode.trim().toUpperCase() || 'JUR',
        nama: jurNama.trim(),
        singkatan: jurSingkatan.trim() || jurNama.trim(),
        deskripsi: jurDeskripsi.trim(),
        visi: jurVisi.trim(),
        kuotaRombel: Number(jurKuotaRombel) || 1,
        kuotaSiswa: Number(jurKuotaSiswa) || 36,
        fasilitasLab: jurFasilitasLab.trim(),
        prospekKerja: jurProspekKerja.trim(),
        status: jurStatus,
        aktif: jurStatus === 'aktif',
      };
      updatedList = [...currentList, newJur];
    }

    if (onUpdateSchoolInfo) {
      const baseSchool = schoolInfo || SCHOOL_INFO;
      onUpdateSchoolInfo({
        ...baseSchool,
        kejuruanList: updatedList,
      });
    }
    showNotification(`Program keahlian "${jurNama}" berhasil disimpan!`);
    setShowJurusanModal(false);
  };

  const handleToggleStatusJurusan = (jur: KejuruanDetail) => {
    const isCurrentlyNonaktif = jur.status === 'nonaktif';
    if (!isCurrentlyNonaktif) {
      setConfirmToggleJurusan(jur);
    } else {
      const nextStatus: 'aktif' | 'nonaktif' = 'aktif';
      const updatedList: KejuruanDetail[] = currentKejuruanList.map(j => {
        if (j.id === jur.id) {
          return { ...j, status: nextStatus, aktif: true };
        }
        return j;
      });
      if (onUpdateSchoolInfo) {
        onUpdateSchoolInfo({
          ...(schoolInfo || SCHOOL_INFO),
          kejuruanList: updatedList,
        });
      }
      showNotification(`Program keahlian "${jur.nama}" berhasil diaktifkan kembali!`);
    }
  };

  const handleConfirmDeactivateJurusan = () => {
    if (!confirmToggleJurusan) return;
    const updatedList: KejuruanDetail[] = currentKejuruanList.map(j => {
      if (j.id === confirmToggleJurusan.id) {
        return { ...j, status: 'nonaktif' as const, aktif: false };
      }
      return j;
    });
    if (onUpdateSchoolInfo) {
      onUpdateSchoolInfo({
        ...(schoolInfo || SCHOOL_INFO),
        kejuruanList: updatedList,
      });
    }
    showNotification(`Program keahlian "${confirmToggleJurusan.nama}" berhasil dinonaktifkan.`);
    setConfirmToggleJurusan(null);
  };

  const handleDeleteJurusan = (jur: KejuruanDetail) => {
    if (confirm(`Apakah Anda yakin ingin menghapus program keahlian "${jur.nama}"?`)) {
      const updatedList = currentKejuruanList.filter(j => j.id !== jur.id);
      if (onUpdateSchoolInfo) {
        onUpdateSchoolInfo({
          ...(schoolInfo || SCHOOL_INFO),
          kejuruanList: updatedList,
        });
      }
      showNotification(`Program keahlian "${jur.nama}" berhasil dihapus.`);
    }
  };

  // -------------------------------------------------------------
  // FILTERED LISTS & STATS
  // -------------------------------------------------------------
  // Filtered Rombel Kelas
  const filteredKelas = kelasList.filter(k => {
    const matchSearch = 
      k.namaKelas.toLowerCase().includes(searchTerm.toLowerCase()) ||
      k.namaWalas.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (k.ruang || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchTingkat = filterTingkat === 'all' || k.tingkat === filterTingkat;
    const matchJurusan = filterJurusan === 'all' || k.jurusan === filterJurusan;
    const isNonaktif = k.status === 'nonaktif';
    const matchStatus = 
      filterStatusKelas === 'all' ||
      (filterStatusKelas === 'aktif' && !isNonaktif) ||
      (filterStatusKelas === 'nonaktif' && isNonaktif);

    return matchSearch && matchTingkat && matchJurusan && matchStatus;
  });

  // Filtered Jurusan
  const filteredJurusan = currentKejuruanList.filter(j => {
    const matchSearch = 
      j.nama.toLowerCase().includes(jurusanSearchTerm.toLowerCase()) ||
      j.kode.toLowerCase().includes(jurusanSearchTerm.toLowerCase()) ||
      j.singkatan.toLowerCase().includes(jurusanSearchTerm.toLowerCase());
    const isNonaktif = j.status === 'nonaktif';
    const matchStatus =
      jurusanFilterStatus === 'all' ||
      (jurusanFilterStatus === 'aktif' && !isNonaktif) ||
      (jurusanFilterStatus === 'nonaktif' && isNonaktif);

    return matchSearch && matchStatus;
  });

  // Calculate Student Counts per Class
  const getStudentCount = (namaKelas: string) => {
    return usersList.filter(u => u.role === 'siswa' && (u.namaKelas === namaKelas || u.kelas === namaKelas)).length;
  };

  // Rombel Stats
  const activeKelasCount = kelasList.filter(k => k.status !== 'nonaktif').length;
  const inactiveKelasCount = kelasList.filter(k => k.status === 'nonaktif').length;
  const totalSiswaRombel = kelasList.reduce((acc, k) => acc + getStudentCount(k.namaKelas), 0);
  const totalKapasitas = kelasList.reduce((acc, k) => acc + (k.kapasitas || 36), 0);

  // Jurusan Stats
  const activeJurusanCount = currentKejuruanList.filter(j => j.status !== 'nonaktif').length;
  const inactiveJurusanCount = currentKejuruanList.filter(j => j.status === 'nonaktif').length;
  const totalKuotaSiswaJurusan = currentKejuruanList.reduce((acc, j) => acc + (Number(j.kuotaSiswa) || 36), 0);
  const totalAlokasiRombelJurusan = currentKejuruanList.reduce((acc, j) => acc + (Number(j.kuotaRombel) || 1), 0);

  return (
    <div className="space-y-6">
      {/* NOTIFICATION BANNER */}
      {notification && (
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between animate-fade-in text-xs font-semibold">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-200" />
            <span>{notification}</span>
          </div>
          <button 
            onClick={() => setNotification(null)}
            className="text-emerald-200 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TOP HEADER & SUB-TAB NAVIGATION */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 font-bold flex items-center justify-center border border-amber-200">
              <School className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-base font-black text-slate-900">
                Manajemen Rombel Kelas &amp; Program Kejuruan
              </h2>
              <p className="text-xs text-slate-500">
                Atur struktur rombongan belajar dan keahlian sekolah: Tambah, Edit, Hapus, serta <strong>Nonaktifkan</strong> status rombel/jurusan.
              </p>
            </div>
          </div>
        </div>

        {/* SUB-TAB TOGGLE */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start md:self-auto border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveSubTab('rombel')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'rombel'
                ? 'bg-white text-amber-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-amber-600" />
            <span>Rombel Kelas</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeSubTab === 'rombel' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'
            }`}>
              {activeKelasCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('jurusan')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'jurusan'
                ? 'bg-white text-purple-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 text-purple-600" />
            <span>Program Kejuruan</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeSubTab === 'jurusan' ? 'bg-purple-100 text-purple-800' : 'bg-slate-200 text-slate-600'
            }`}>
              {activeJurusanCount}
            </span>
          </button>
        </div>
      </div>

      {/* ============================================================= */}
      {/* VIEW 1: ROMBEL KELAS */}
      {/* ============================================================= */}
      {activeSubTab === 'rombel' && (
        <div className="space-y-6">
          {/* STATS OVERVIEW */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
                <School className="w-4 h-4 text-amber-600" />
                <span>Total Rombel Kelas</span>
              </div>
              <div className="text-2xl font-bold text-slate-900">{kelasList.length}</div>
              <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                <span className="text-emerald-700 font-bold">🟢 {activeKelasCount} Aktif</span>
                {inactiveKelasCount > 0 && (
                  <span className="text-rose-600 font-bold">· 🔴 {inactiveKelasCount} Nonaktif</span>
                )}
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>Siswa Terdaftar</span>
              </div>
              <div className="text-2xl font-bold text-emerald-700">{totalSiswaRombel}</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Terdistribusi di rombel</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
                <Building className="w-4 h-4 text-blue-600" />
                <span>Total Kapasitas</span>
              </div>
              <div className="text-2xl font-bold text-blue-700">{totalKapasitas}</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Kursi belajar tersedia</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
                <PowerOff className="w-4 h-4 text-rose-600" />
                <span>Rombel Dinonaktifkan</span>
              </div>
              <div className="text-2xl font-bold text-rose-600">{inactiveKelasCount}</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Diarsipkan dari KBM aktif</p>
            </div>
          </div>

          {/* FILTER & ACTIONS BAR */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari rombel kelas, wali kelas, atau gedung ruangan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={filterStatusKelas}
                  onChange={(e) => setFilterStatusKelas(e.target.value as any)}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="all">Semua Status ({kelasList.length})</option>
                  <option value="aktif">🟢 Rombel Aktif ({activeKelasCount})</option>
                  <option value="nonaktif">🔴 Rombel Nonaktif ({inactiveKelasCount})</option>
                </select>

                <select
                  value={filterTingkat}
                  onChange={(e) => setFilterTingkat(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="all">Semua Tingkat</option>
                  <option value="X">Kelas X</option>
                  <option value="XI">Kelas XI</option>
                  <option value="XII">Kelas XII</option>
                </select>

                <select
                  value={filterJurusan}
                  onChange={(e) => setFilterJurusan(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="all">Semua Kejuruan</option>
                  {availableJurusanNames.map(j => (
                    <option key={j} value={j}>{j}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={openAddModal}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Rombel Kelas</span>
                </button>
              </div>
            </div>
          </div>

          {/* TABLE DATA KELAS */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">Daftar Rombongan Belajar (Rombel)</h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Menampilkan {filteredKelas.length} dari {kelasList.length} kelas
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Nama Rombel</th>
                    <th className="py-3 px-4">Tingkat &amp; Jurusan</th>
                    <th className="py-3 px-4">Status Rombel</th>
                    <th className="py-3 px-4">Wali Kelas</th>
                    <th className="py-3 px-4">Ruang Kelas</th>
                    <th className="py-3 px-4 text-center">Kapasitas &amp; Siswa</th>
                    <th className="py-3 px-4 text-center">Tahun Ajaran</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredKelas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Tidak ada rombel kelas yang sesuai dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredKelas.map((kelas) => {
                      const studentCount = getStudentCount(kelas.namaKelas);
                      const kapasitas = kelas.kapasitas || 36;
                      const percentFilled = Math.min(100, Math.round((studentCount / kapasitas) * 100));
                      const isNonaktif = kelas.status === 'nonaktif';

                      return (
                        <tr 
                          key={kelas.id} 
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isNonaktif ? 'bg-slate-50/60 opacity-75' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                            <span className={`w-7 h-7 rounded-lg font-bold text-[11px] flex items-center justify-center border ${
                              isNonaktif 
                                ? 'bg-slate-100 text-slate-500 border-slate-300' 
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                              {kelas.tingkat || 'X'}
                            </span>
                            <div className="flex flex-col">
                              <span className={isNonaktif ? 'text-slate-600 line-through decoration-rose-400' : 'text-slate-900'}>
                                {kelas.namaKelas}
                              </span>
                              {isNonaktif && (
                                <span className="text-[10px] text-rose-600 font-semibold">
                                  Rombel dinonaktifkan
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-slate-800">{kelas.jurusan}</span>
                              <span className="text-[10px] text-slate-400">Tingkat {kelas.tingkat || 'X'}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            {isNonaktif ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
                                <PowerOff className="w-3 h-3 text-rose-500" />
                                <span>Nonaktif</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>Aktif</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                                {kelas.namaWalas.charAt(0)}
                              </div>
                              <span className="font-medium text-slate-700">{kelas.namaWalas}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[11px] font-medium">
                              {kelas.ruang || 'R. Teori'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col items-center gap-1 w-28 mx-auto">
                              <div className="flex items-center justify-between w-full text-[11px]">
                                <span className="font-bold text-slate-800">{studentCount} Siswa</span>
                                <span className="text-slate-400">/ {kapasitas}</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all ${
                                    percentFilled > 90 ? 'bg-rose-500' : percentFilled > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${percentFilled}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center font-medium text-slate-600">
                            {kelas.tahunAjaran || '2026/2027'}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* TOMBOL NONAKTIFKAN / AKTIFKAN ROMBEL */}
                              <button
                                type="button"
                                onClick={() => handleToggleStatusKelas(kelas)}
                                title={isNonaktif ? 'Aktifkan Kembali Rombel' : 'Nonaktifkan Rombel Kelas'}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  isNonaktif
                                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                                    : 'bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700'
                                }`}
                              >
                                {isNonaktif ? <Power className="w-4 h-4 text-emerald-600" /> : <PowerOff className="w-4 h-4 text-rose-600" />}
                              </button>

                              {/* TOMBOL EDIT */}
                              <button
                                type="button"
                                onClick={() => openEditModal(kelas)}
                                title="Edit Rombel Kelas"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              {/* TOMBOL HAPUS */}
                              <button
                                type="button"
                                onClick={() => handleDeleteKelas(kelas)}
                                title="Hapus Rombel Kelas Permanen"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* VIEW 2: PROGRAM KEJURUAN */}
      {/* ============================================================= */}
      {activeSubTab === 'jurusan' && (
        <div className="space-y-6">
          {/* STATS OVERVIEW */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
                <Layers className="w-4 h-4 text-purple-600" />
                <span>Total Program Kejuruan</span>
              </div>
              <div className="text-2xl font-bold text-slate-900">{currentKejuruanList.length}</div>
              <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                <span className="text-emerald-700 font-bold">🟢 {activeJurusanCount} Aktif</span>
                {inactiveJurusanCount > 0 && (
                  <span className="text-rose-600 font-bold">· 🔴 {inactiveJurusanCount} Nonaktif</span>
                )}
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>Total Kuota Siswa PPDB</span>
              </div>
              <div className="text-2xl font-bold text-emerald-700">{totalKuotaSiswaJurusan}</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Daya tampung calon siswa</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
                <Building className="w-4 h-4 text-blue-600" />
                <span>Alokasi Rombel</span>
              </div>
              <div className="text-2xl font-bold text-blue-700">{totalAlokasiRombelJurusan} Rombel</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Target rombongan belajar</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
                <PowerOff className="w-4 h-4 text-rose-600" />
                <span>Jurusan Dinonaktifkan</span>
              </div>
              <div className="text-2xl font-bold text-rose-600">{inactiveJurusanCount}</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Disembunyikan dari PPDB & KBM</p>
            </div>
          </div>

          {/* FILTER & ACTIONS BAR */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari program keahlian, kode jurusan, atau singkatan..."
                  value={jurusanSearchTerm}
                  onChange={(e) => setJurusanSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={jurusanFilterStatus}
                  onChange={(e) => setJurusanFilterStatus(e.target.value as any)}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="all">Semua Status ({currentKejuruanList.length})</option>
                  <option value="aktif">🟢 Jurusan Aktif ({activeJurusanCount})</option>
                  <option value="nonaktif">🔴 Jurusan Nonaktif ({inactiveJurusanCount})</option>
                </select>

                <button
                  type="button"
                  onClick={handleOpenAddJurusan}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Program Kejuruan</span>
                </button>
              </div>
            </div>
          </div>

          {/* LIST KARTU KEJURUAN */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredJurusan.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 p-6">
                Tidak ada program keahlian yang sesuai dengan kriteria pencarian.
              </div>
            ) : (
              filteredJurusan.map((jur, index) => {
                const isNonaktif = jur.status === 'nonaktif';
                return (
                  <div 
                    key={jur.id} 
                    className={`p-5 rounded-2xl border transition-all space-y-3.5 shadow-xs flex flex-col justify-between ${
                      isNonaktif 
                        ? 'bg-slate-50/70 border-dashed border-rose-300 opacity-75' 
                        : 'bg-white border-slate-200 hover:border-amber-300'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Header Card: Kode, Nama, Status & Tombol Aksi */}
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center shadow-xs shrink-0 ${
                            isNonaktif ? 'bg-slate-400 text-white' : 'bg-purple-600 text-white'
                          }`}>
                            {jur.kode}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-slate-900 text-sm leading-snug">
                                {jur.nama}
                              </h4>
                              {isNonaktif ? (
                                <span className="text-[10px] text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200 flex items-center gap-1">
                                  <PowerOff className="w-3 h-3 text-rose-500" />
                                  <span>Nonaktif</span>
                                </span>
                              ) : (
                                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>Aktif</span>
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-purple-800 font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                Singkatan: {jur.singkatan}
                              </span>
                              <span className="text-[10px] text-slate-500 font-semibold">
                                #{index + 1}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Tombol Aksi: Nonaktifkan, Edit & Hapus */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleStatusJurusan(jur)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isNonaktif
                                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                                : 'bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700'
                            }`}
                            title={isNonaktif ? 'Aktifkan Kembali Program Kejuruan' : 'Nonaktifkan Program Kejuruan'}
                          >
                            {isNonaktif ? <Power className="w-3.5 h-3.5 text-emerald-600" /> : <PowerOff className="w-3.5 h-3.5 text-rose-600" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditJurusan(jur)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-800 transition-colors cursor-pointer"
                            title="Edit Program Kejuruan"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteJurusan(jur)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 transition-colors cursor-pointer"
                            title="Hapus Program Kejuruan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Kuota & Rombel Pill */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px]">
                          Kuota Siswa: {jur.kuotaSiswa || 36}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 font-bold text-[11px]">
                          Alokasi Rombel: {jur.kuotaRombel || 1} Rombel
                        </span>
                      </div>

                      {/* Deskripsi */}
                      <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="font-bold text-slate-700 block mb-0.5 text-[11px]">Profil &amp; Deskripsi:</span>
                        {jur.deskripsi || 'Belum ada ringkasan profil kejuruan.'}
                      </div>

                      {/* Visi */}
                      {jur.visi && (
                        <div className="text-[11px] text-amber-900 bg-amber-50/70 p-2 rounded-xl border border-amber-100">
                          <span className="font-bold block text-[10px] text-amber-800 uppercase tracking-wide">Visi Keahlian:</span>
                          {jur.visi}
                        </div>
                      )}

                      {/* Fasilitas Lab */}
                      {jur.fasilitasLab && (
                        <div className="text-[11px] text-slate-600">
                          <strong className="text-slate-800">Fasilitas Lab:</strong> {jur.fasilitasLab}
                        </div>
                      )}

                      {/* Prospek Kerja */}
                      {jur.prospekKerja && (
                        <div className="text-[11px] text-slate-600">
                          <strong className="text-slate-800">Peluang Karir:</strong> {jur.prospekKerja}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <span>ID: {jur.id}</span>
                      <button
                        type="button"
                        onClick={() => handleOpenEditJurusan(jur)}
                        className="font-bold text-purple-700 hover:text-purple-800 text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <span>Ubah Detail</span>
                        <Edit3 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL FORM KELAS (TAMBAH & EDIT) */}
      {/* ============================================================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {editingKelasId ? 'Edit Rombongan Belajar' : 'Tambah Rombongan Belajar Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Atur nama kelas, jurusan, wali kelas pendamping, daya tampung, dan status keaktifan.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitKelas} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tingkat Kelas *
                  </label>
                  <select
                    value={formTingkat}
                    onChange={(e) => setFormTingkat(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="X">Kelas X (Sepuluh)</option>
                    <option value="XI">Kelas XI (Sebelas)</option>
                    <option value="XII">Kelas XII (Dua Belas)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Program Kejuruan *
                  </label>
                  <select
                    value={formJurusan}
                    onChange={(e) => setFormJurusan(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-amber-500"
                  >
                    {availableJurusanNames.map(j => (
                      <option key={j} value={j}>{j}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Resmi Rombel *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: X Kesehatan, XI Asisten Keperawatan 1"
                  value={formNamaKelas}
                  onChange={(e) => setFormNamaKelas(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 font-semibold text-slate-900"
                />
              </div>

              {/* STATUS ROMBEL KELAS (AKTIF / NONAKTIF) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status Keaktifan Rombel *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormStatusKelas('aktif')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      formStatusKelas === 'aktif'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs ring-1 ring-emerald-500'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>🟢 Aktif (Berjalan)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormStatusKelas('nonaktif')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      formStatusKelas === 'nonaktif'
                        ? 'bg-rose-50 border-rose-500 text-rose-800 shadow-xs ring-1 ring-rose-500'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <PowerOff className="w-3.5 h-3.5 text-rose-600" />
                    <span>🔴 Nonaktif (Diarsipkan)</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Rombel nonaktif tidak muncul saat pendaftaran siswa baru, tetapi riwayat nilai siswa tetap aman.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Wali Kelas Pendamping *
                  </label>
                  <span className="text-[10px] text-amber-600 font-medium">Guru dapat memegang 2 kelas walas</span>
                </div>
                <select
                  value={formIdWalas}
                  onChange={(e) => setFormIdWalas(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-amber-500 font-medium"
                >
                  <option value="">-- Pilih Guru Sebagai Wali Kelas --</option>
                  {teachersList.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.nama} ({teacher.jurusan || 'Guru'}){getTeacherClassesText(teacher.id)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ruangan Kelas
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Gedung A - R. 101"
                    value={formRuang}
                    onChange={(e) => setFormRuang(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Daya Tampung Kapasitas Siswa
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={50}
                    value={formKapasitas}
                    onChange={(e) => setFormKapasitas(parseInt(e.target.value) || 36)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tahun Ajaran
                </label>
                <input
                  type="text"
                  placeholder="2026/2027"
                  value={formTahunAjaran}
                  onChange={(e) => setFormTahunAjaran(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingKelasId ? 'Simpan Perubahan' : 'Tambahkan Rombel'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL FORM PROGRAM KEJURUAN (TAMBAH & EDIT) */}
      {/* ============================================================= */}
      {showJurusanModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
                  <BookOpen className="w-5 h-5 text-purple-700" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {editingJurusanId ? 'Edit Program Kejuruan' : 'Tambah Program Kejuruan Baru'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Kelola data kurikulum, kuota penerimaan, dan status aktif kejuruan.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowJurusanModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveJurusan} className="space-y-3.5">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kode Jurusan *
                  </label>
                  <input
                    type="text"
                    required
                    value={jurKode}
                    onChange={(e) => setJurKode(e.target.value.toUpperCase())}
                    placeholder="Contoh: FAR"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-purple-600 font-mono font-bold uppercase"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Singkatan / Panggilan *
                  </label>
                  <input
                    type="text"
                    required
                    value={jurSingkatan}
                    onChange={(e) => setJurSingkatan(e.target.value)}
                    placeholder="Contoh: Farmasi"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-purple-600 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Resmi Program Keahlian *
                </label>
                <input
                  type="text"
                  required
                  value={jurNama}
                  onChange={(e) => setJurNama(e.target.value)}
                  placeholder="Contoh: Farmasi Klinis & Komunitas"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-purple-600 font-bold text-slate-900"
                />
              </div>

              {/* STATUS KEJURUAN */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Status Program Kejuruan *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setJurStatus('aktif')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      jurStatus === 'aktif'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs ring-1 ring-emerald-500'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>🟢 Aktif (Berjalan)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setJurStatus('nonaktif')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      jurStatus === 'nonaktif'
                        ? 'bg-rose-50 border-rose-500 text-rose-800 shadow-xs ring-1 ring-rose-500'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <PowerOff className="w-3.5 h-3.5 text-rose-600" />
                    <span>🔴 Nonaktif (Disembunyikan)</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Jurusan nonaktif tidak akan muncul di formulir PPDB dan pemilihan rombel baru.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Alokasi Rombel
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={jurKuotaRombel}
                    onChange={(e) => setJurKuotaRombel(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-purple-600 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kuota Siswa SPMB
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={360}
                    value={jurKuotaSiswa}
                    onChange={(e) => setJurKuotaSiswa(parseInt(e.target.value) || 36)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-purple-600 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deskripsi &amp; Profil Keahlian
                </label>
                <textarea
                  rows={2}
                  value={jurDeskripsi}
                  onChange={(e) => setJurDeskripsi(e.target.value)}
                  placeholder="Ringkasan kompetensi yang dipelajari..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Visi &amp; Keunggulan Kejuruan
                </label>
                <input
                  type="text"
                  value={jurVisi}
                  onChange={(e) => setJurVisi(e.target.value)}
                  placeholder="Visi keunggulan lulusan..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Fasilitas Laboratorium &amp; Praktik
                </label>
                <input
                  type="text"
                  value={jurFasilitasLab}
                  onChange={(e) => setJurFasilitasLab(e.target.value)}
                  placeholder="Contoh: Lab Komputer, Lab Farmasi..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Prospek Kerja &amp; Karir Lulusan
                </label>
                <input
                  type="text"
                  value={jurProspekKerja}
                  onChange={(e) => setJurProspekKerja(e.target.value)}
                  placeholder="Contoh: Asisten Tenaga Kefarmasian, Staf RS..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-purple-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowJurusanModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingJurusanId ? 'Simpan Perubahan' : 'Tambahkan Kejuruan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL KONFIRMASI NONAKTIFKAN ROMBEL KELAS */}
      {/* ============================================================= */}
      {confirmToggleKelas && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center border border-rose-200 shrink-0">
                <PowerOff className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Nonaktifkan Rombel Kelas?
                </h3>
                <p className="text-xs text-slate-500">
                  {confirmToggleKelas.namaKelas} ({confirmToggleKelas.jurusan})
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-100 text-xs text-rose-900 space-y-2">
              <div className="font-bold flex items-center gap-1 text-rose-950">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Konfirmasi Dampak Penonaktifan:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-rose-800">
                <li>Rombel ini akan diberi status <strong>Nonaktif</strong> dan disembunyikan dari penempatan siswa baru.</li>
                <li><strong>Seluruh data siswa, presensi, dan nilai rapor yang sudah ada tetap aman tersimpan</strong> di sistem dan tidak terhapus.</li>
                <li>Anda dapat mengaktifkan kembali rombel ini kapan saja dengan sekali klik tombol <strong>Aktifkan</strong>.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmToggleKelas(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeactivateKelas}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <PowerOff className="w-3.5 h-3.5" />
                <span>Ya, Nonaktifkan Rombel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL KONFIRMASI NONAKTIFKAN JURUSAN */}
      {/* ============================================================= */}
      {confirmToggleJurusan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center border border-rose-200 shrink-0">
                <PowerOff className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Nonaktifkan Program Kejuruan?
                </h3>
                <p className="text-xs text-slate-500">
                  {confirmToggleJurusan.nama} ({confirmToggleJurusan.kode})
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-100 text-xs text-rose-900 space-y-2">
              <div className="font-bold flex items-center gap-1 text-rose-950">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Konfirmasi Dampak Penonaktifan:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-rose-800">
                <li>Jurusan ini akan berstatus <strong>Nonaktif</strong> dan tidak muncul pada formulir pendaftaran siswa baru (PPDB).</li>
                <li>Data siswa, rombel, dan kurikulum yang sudah ada tetap aman dan tersimpan.</li>
                <li>Dapat diaktifkan kembali kapan saja dengan sekali klik tombol <strong>Aktifkan</strong>.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmToggleJurusan(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeactivateJurusan}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <PowerOff className="w-3.5 h-3.5" />
                <span>Ya, Nonaktifkan Jurusan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
