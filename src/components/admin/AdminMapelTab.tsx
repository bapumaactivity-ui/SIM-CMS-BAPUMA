import React, { useState, useMemo } from 'react';
import { Mapel, JadwalPelajaran, User } from '../../types';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Clock, 
  Layers, 
  Tag,
  Sparkles,
  Cloud,
  CheckCircle2,
  UserCheck,
  Users,
  PowerOff,
  Power,
  AlertTriangle,
  RotateCcw,
  GraduationCap
} from 'lucide-react';
import { INITIAL_MAPEL } from '../../data/initialData';

interface AdminMapelTabProps {
  mapelList: Mapel[];
  jadwalPelajaranList?: JadwalPelajaran[];
  usersList?: User[];
  onAddMapel: (mapel: Mapel) => void;
  onUpdateMapel?: (mapel: Mapel) => void;
  onDeleteMapel?: (mapelId: string) => void;
  onResetToDefaultMapel?: () => void;
  onSyncMapel?: () => void;
  onBatchUpdateMapel?: (newMapels: Mapel[]) => void;
}

export const AdminMapelTab: React.FC<AdminMapelTabProps> = ({
  mapelList,
  jadwalPelajaranList = [],
  usersList = [],
  onAddMapel,
  onUpdateMapel = () => {},
  onDeleteMapel = () => {},
  onSyncMapel,
  onBatchUpdateMapel,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKelompok, setFilterKelompok] = useState<string>('all');
  const [filterJurusan, setFilterJurusan] = useState<string>('all');
  const [filterTingkat, setFilterTingkat] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'ada_guru' | 'tanpa_guru' | 'nonaktif'>('all');
  const [onlyWithTeachers, setOnlyWithTeachers] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Daftar dewan guru untuk pemilihan Guru Pengampu
  const teachersList = useMemo(() => {
    return (usersList || []).filter(u => 
      u.role === 'guru' || 
      u.role === 'walas' || 
      u.role === 'staf' || 
      u.role === 'kepala_sekolah' || 
      u.role === 'operator' || 
      u.role === 'bendahara' ||
      (Array.isArray(u.mapelDiampu) && u.mapelDiampu.length > 0)
    );
  }, [usersList]);

  // Set of initial mapel IDs to identify user-created ones
  const initialMapelIdSet = useMemo(() => new Set(INITIAL_MAPEL.map(m => m.id)), []);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingMapelId, setEditingMapelId] = useState<string | null>(null);
  const [deleteConfirmMapel, setDeleteConfirmMapel] = useState<Mapel | null>(null);
  const [showBulkDeactivateModal, setShowBulkDeactivateModal] = useState(false);

  // Form State
  const [formKode, setFormKode] = useState('');
  const [formNamaMapel, setFormNamaMapel] = useState('');
  const [formKelompok, setFormKelompok] = useState<'Muatan Umum' | 'Muatan Kejuruan' | 'Muatan Lokal'>('Muatan Umum');
  const [formJurusan, setFormJurusan] = useState<string>('Umum');
  const [formTingkat, setFormTingkat] = useState<string>('Semua');
  const [formJamPerMinggu, setFormJamPerMinggu] = useState<number>(3);
  const [formKeterangan, setFormKeterangan] = useState<string>('');
  const [formGuruPengampu, setFormGuruPengampu] = useState<string>('');
  const [formIdGuru, setFormIdGuru] = useState<string>('');

  // Map each Mapel to its assigned teachers and classes from Jadwal Pelajaran
  const mapelScheduleMap = useMemo(() => {
    const map = new Map<string, {
      hasTeacher: boolean;
      teachers: string[];
      classes: string[];
      scheduleCount: number;
      totalJP: number;
    }>();

    const normM = (s?: string) => (s || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

    mapelList.forEach(m => {
      const mNorm = normM(m.namaMapel);
      const mKode = (m.kode || '').trim().toLowerCase();
      const mId = m.id;

      const matchingSchedules = (jadwalPelajaranList || []).filter(j => {
        const jMId = (j.idMapel || '').trim();
        const jMKode = (j.idMapel || '').trim().toLowerCase();
        const jMNorm = normM(j.namaMapel);

        const isMatch = (jMId && (jMId === mId || jMKode === mKode)) || (jMNorm && jMNorm === mNorm);
        const hasTeacher = !!((j.namaGuru && j.namaGuru.trim()) || (j.idGuru && j.idGuru.trim()));
        return isMatch && hasTeacher;
      });

      const teacherSet = new Set<string>();
      const classSet = new Set<string>();
      let totalJP = 0;

      matchingSchedules.forEach(j => {
        const guruName = (j.namaGuru || '').trim();
        if (guruName) teacherSet.add(guruName);
        if (j.namaKelas) classSet.add(j.namaKelas);
        totalJP += (j.jumlahJam || 2);
      });

      const teachers = Array.from(teacherSet);
      const classes = Array.from(classSet);

      map.set(m.id, {
        hasTeacher: teachers.length > 0,
        teachers,
        classes,
        scheduleCount: matchingSchedules.length,
        totalJP
      });
    });

    return map;
  }, [mapelList, jadwalPelajaranList]);

  // Statistics
  const countWithTeachers = useMemo(() => {
    return mapelList.filter(m => mapelScheduleMap.get(m.id)?.hasTeacher).length;
  }, [mapelList, mapelScheduleMap]);

  const countWithoutTeachers = mapelList.length - countWithTeachers;

  const countDeactivated = useMemo(() => {
    return mapelList.filter(m => m.status === 'nonaktif').length;
  }, [mapelList]);

  const countUmum = mapelList.filter(m => m.kelompok?.includes('Umum') || m.kelompok?.includes('Nasional') || m.jurusan === 'Umum' || m.jurusan === 'Semua Jurusan').length;
  const countKejuruan = mapelList.filter(m => m.kelompok?.includes('Kejuruan') || m.kelompok?.includes('C3') || (m.jurusan !== 'Umum' && m.jurusan !== 'Semua Jurusan')).length;

  const openAddModal = () => {
    setEditingMapelId(null);
    setFormKode(`MP-${Date.now().toString().slice(-4)}`);
    setFormNamaMapel('');
    setFormKelompok('Muatan Umum');
    setFormJurusan('Umum');
    setFormTingkat('Semua');
    setFormJamPerMinggu(3);
    setFormKeterangan('');
    setFormGuruPengampu('');
    setFormIdGuru('');
    setShowModal(true);
  };

  const openEditModal = (mapel: Mapel) => {
    setEditingMapelId(mapel.id);
    setFormKode(mapel.kode);
    setFormNamaMapel(mapel.namaMapel);
    setFormKelompok((mapel.kelompok as any) || (mapel.jurusan === 'Umum' ? 'Muatan Umum' : 'Muatan Kejuruan'));
    setFormJurusan(mapel.jurusan);
    setFormTingkat(mapel.tingkat || 'Semua');
    setFormJamPerMinggu(mapel.jamPerMinggu || 3);
    setFormKeterangan(mapel.keterangan || '');
    setFormGuruPengampu(mapel.guruPengampu || '');
    setFormIdGuru(mapel.idGuru || '');
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNamaMapel.trim() || !formKode.trim()) {
      setNotification('Nama mata pelajaran dan kode wajib diisi!');
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    if (editingMapelId) {
      const existing = mapelList.find(m => m.id === editingMapelId);
      const updated: Mapel = {
        ...existing,
        id: editingMapelId,
        kode: formKode.trim(),
        namaMapel: formNamaMapel.trim(),
        kelompok: formKelompok,
        jurusan: formJurusan,
        tingkat: formTingkat,
        jamPerMinggu: formJamPerMinggu,
        keterangan: formKeterangan.trim(),
        guruPengampu: formGuruPengampu.trim() || undefined,
        idGuru: formIdGuru.trim() || undefined,
      };
      onUpdateMapel(updated);
      setNotification(`Mata pelajaran "${updated.namaMapel}" berhasil diperbarui!`);
    } else {
      const newMapel: Mapel = {
        id: `m-${Date.now()}`,
        kode: formKode.trim(),
        namaMapel: formNamaMapel.trim(),
        kelompok: formKelompok,
        jurusan: formJurusan,
        tingkat: formTingkat,
        jamPerMinggu: formJamPerMinggu,
        keterangan: formKeterangan.trim(),
        guruPengampu: formGuruPengampu.trim() || undefined,
        idGuru: formIdGuru.trim() || undefined,
        status: 'aktif',
        aktif: true
      };
      onAddMapel(newMapel);
      setSearchTerm('');
      setFilterKelompok('all');
      setFilterJurusan('all');
      setFilterTingkat('all');
      setFilterStatus('all');
      setOnlyWithTeachers(false);
      setNotification(`Mata pelajaran baru "${newMapel.namaMapel}" (${newMapel.kode}) berhasil disimpan dan langsung aktif di daftar paling atas!`);
    }
    setShowModal(false);
    setTimeout(() => setNotification(null), 4500);
  };

  const handleDelete = (mapel: Mapel) => {
    setDeleteConfirmMapel(mapel);
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmMapel) return;
    onDeleteMapel(deleteConfirmMapel.id);
    setNotification(`Mata pelajaran "${deleteConfirmMapel.namaMapel}" (${deleteConfirmMapel.kode}) berhasil dihapus.`);
    setDeleteConfirmMapel(null);
    setTimeout(() => setNotification(null), 3000);
  };

  // Toggle Single Mapel Active / Inactive Status
  const handleToggleMapelStatus = (mapel: Mapel) => {
    const isNowNonaktif = mapel.status === 'nonaktif';
    const nextStatus: 'aktif' | 'nonaktif' = isNowNonaktif ? 'aktif' : 'nonaktif';
    const updated: Mapel = {
      ...mapel,
      status: nextStatus,
      aktif: nextStatus === 'aktif'
    };
    onUpdateMapel(updated);
    if (onBatchUpdateMapel) {
      onBatchUpdateMapel([updated]);
    }
    setNotification(`Mata pelajaran "${mapel.namaMapel}" berhasil ${nextStatus === 'aktif' ? 'diaktifkan kembali' : 'dinonaktifkan (disembunyikan)'}.`);
    setTimeout(() => setNotification(null), 3500);
  };

  // Bulk Deactivate Mapel Without Assigned Teachers in Schedule
  const handleDeactivateUnscheduled = () => {
    let deactivated = 0;
    let activated = 0;

    const updatedList = mapelList.map(m => {
      const info = mapelScheduleMap.get(m.id);
      const hasTeacher = !!info?.hasTeacher;
      const newStatus = hasTeacher ? 'aktif' : 'nonaktif';
      if (newStatus === 'nonaktif') deactivated++;
      else activated++;
      return {
        ...m,
        status: newStatus as 'aktif' | 'nonaktif',
        aktif: hasTeacher
      };
    });

    if (onBatchUpdateMapel) {
      onBatchUpdateMapel(updatedList);
    } else {
      updatedList.forEach(m => onUpdateMapel(m));
    }

    setOnlyWithTeachers(true);
    setFilterStatus('ada_guru');
    setShowBulkDeactivateModal(false);
    setNotification(`Sukses! ${deactivated} mata pelajaran tanpa guru telah dinonaktifkan. Sekarang hanya ${activated} mata pelajaran yang ada gurunya yang aktif di sistem.`);
    setTimeout(() => setNotification(null), 5000);
  };

  // Activate All Mapel Back
  const handleActivateAll = () => {
    const updatedList = mapelList.map(m => ({
      ...m,
      status: 'aktif' as const,
      aktif: true
    }));

    if (onBatchUpdateMapel) {
      onBatchUpdateMapel(updatedList);
    } else {
      updatedList.forEach(m => onUpdateMapel(m));
    }

    setOnlyWithTeachers(false);
    setFilterStatus('all');
    setNotification('Seluruh mata pelajaran telah berhasil diaktifkan kembali!');
    setTimeout(() => setNotification(null), 3500);
  };

  // Filtered & Sorted Mapel
  const filteredMapel = useMemo(() => {
    return mapelList
      .filter(m => {
        const info = mapelScheduleMap.get(m.id);
        const isNonaktif = m.status === 'nonaktif';

        // Filter: Hanya Mapel yang Ada Gurunya di Jadwal (Toggle Switch)
        if (onlyWithTeachers) {
          if (!info?.hasTeacher || isNonaktif) return false;
        }

        // Filter: Status Dropdown
        if (filterStatus === 'ada_guru') {
          if (!info?.hasTeacher || isNonaktif) return false;
        } else if (filterStatus === 'tanpa_guru') {
          if (info?.hasTeacher || isNonaktif) return false;
        } else if (filterStatus === 'nonaktif') {
          if (!isNonaktif) return false;
        }

        const matchSearch = 
          m.namaMapel.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.kode.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (m.keterangan || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.jurusan.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (info?.teachers || []).some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchKelompok = 
          filterKelompok === 'all' || 
          (filterKelompok === 'Umum' && (m.kelompok?.includes('Umum') || m.kelompok?.includes('Nasional') || m.kelompok?.includes('Wajib') || m.jurusan === 'Umum' || m.jurusan === 'Semua Jurusan')) ||
          (filterKelompok === 'Kejuruan' && (m.kelompok?.includes('Kejuruan') || m.kelompok?.includes('C3') || m.kelompok?.includes('Dasar') || (m.jurusan !== 'Umum' && m.jurusan !== 'Semua Jurusan'))) ||
          (filterKelompok === 'Mulok' && (m.kelompok?.toLowerCase().includes('lokal') || m.kelompok?.toLowerCase().includes('mulok') || (m.keterangan || '').toLowerCase().includes('mulok')));

        const matchJurusan = 
          filterJurusan === 'all' || 
          m.jurusan === filterJurusan ||
          (filterJurusan === 'Umum' && (m.jurusan === 'Semua Jurusan' || m.jurusan === 'Umum' || m.jurusan === 'Semua')) ||
          (filterJurusan === 'Kesehatan' && (m.jurusan === 'Kesehatan' || m.jurusan === 'Farmasi' || m.jurusan === 'Asisten Keperawatan'));

        const matchTingkat =
          filterTingkat === 'all' ||
          m.tingkat === filterTingkat ||
          m.tingkat === 'Semua' ||
          !m.tingkat;

        return matchSearch && matchKelompok && matchJurusan && matchTingkat;
      })
      .sort((a, b) => {
        const aIsNew = !initialMapelIdSet.has(a.id);
        const bIsNew = !initialMapelIdSet.has(b.id);
        if (aIsNew && !bIsNew) return -1;
        if (!aIsNew && bIsNew) return 1;

        // Active ones above deactivated ones
        const aNonaktif = a.status === 'nonaktif';
        const bNonaktif = b.status === 'nonaktif';
        if (!aNonaktif && bNonaktif) return -1;
        if (aNonaktif && !bNonaktif) return 1;

        return 0;
      });
  }, [mapelList, searchTerm, filterKelompok, filterJurusan, filterTingkat, filterStatus, onlyWithTeachers, mapelScheduleMap, initialMapelIdSet]);

  return (
    <div className="space-y-6">
      {notification && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-900 text-xs font-semibold shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* STATUS MAPEL TERBARU & MANAJEMEN GURU BANNER */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-5 rounded-2xl shadow-md border border-emerald-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold">
            <Check className="w-3.5 h-3.5 text-emerald-200" />
            <span>Sinkronisasi Mapel & Jadwal Guru Aktif</span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-white">
            Kelola Mata Pelajaran & Filter Guru Pengampu
          </h2>
          <p className="text-xs text-emerald-100 max-w-3xl leading-relaxed">
            Gunakan tombol <strong>Nonaktifkan Mapel Tanpa Guru</strong> agar sistem hanya memunculkan mata pelajaran yang memiliki guru pengampu aktif sesuai jadwal pelajaran sekolah. Anda juga dapat mengaktifkan atau menonaktifkan mata pelajaran individual secara instan.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onSyncMapel && (
            <button
              type="button"
              onClick={() => {
                onSyncMapel();
                setNotification('Sinkronisasi sukses! Seluruh mata pelajaran telah berhasil disinkronkan dan tersimpan aman ke Cloud Firestore.');
                setTimeout(() => setNotification(null), 4500);
              }}
              className="px-4 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
              title="Sinkronkan seluruh mata pelajaran ke Cloud Firestore"
            >
              <Cloud className="w-4 h-4 text-emerald-700" />
              <span>Sinkronkan ke Cloud</span>
            </button>
          )}
        </div>
      </div>

      {/* STATS OVERVIEW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <BookOpen className="w-4 h-4 text-amber-600" />
            <span>Total Mata Pelajaran</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{mapelList.length}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Semua Kurikulum & Muatan</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs bg-emerald-50/30">
          <div className="flex items-center gap-2 text-emerald-700 text-xs font-semibold mb-1">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>Ada Guru di Jadwal</span>
          </div>
          <div className="text-2xl font-bold text-emerald-700">{countWithTeachers}</div>
          <p className="text-[11px] text-emerald-600/80 mt-0.5">Memiliki Guru Pengampu Aktif</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs bg-amber-50/20">
          <div className="flex items-center gap-2 text-amber-700 text-xs font-semibold mb-1">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Tanpa Guru di Jadwal</span>
          </div>
          <div className="text-2xl font-bold text-amber-700">{countWithoutTeachers}</div>
          <p className="text-[11px] text-amber-600/80 mt-0.5">Belum dialokasikan di jadwal</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <PowerOff className="w-4 h-4 text-rose-600" />
            <span>Mapel Dinonaktifkan</span>
          </div>
          <div className="text-2xl font-bold text-rose-600">{countDeactivated}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Disembunyikan dari pilihan</p>
        </div>
      </div>

      {/* FILTER & ACTIONS BAR */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        {/* ACTION BUTTONS ROW: NONAKTIFKAN MAPEL TANPA GURU & FILTER CEPAT */}
        <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-amber-950 uppercase tracking-wide">
                  Opsi Cepat Tampilan Mapel
                </span>
                {onlyWithTeachers && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white animate-pulse">
                    Filter Guru Aktif
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-900/80 mt-0.5">
                Pilih apakah ingin menampilkan semua mapel, atau hanya mapel yang ada gurunya saja sesuai jadwal.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* TOGGLE CEPAT: HANYA MAPEL YANG ADA GURUNYA DI JADWAL */}
            <button
              type="button"
              onClick={() => {
                const next = !onlyWithTeachers;
                setOnlyWithTeachers(next);
                if (next) setFilterStatus('ada_guru');
                else setFilterStatus('all');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
                onlyWithTeachers
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-300'
                  : 'bg-white hover:bg-amber-100 text-amber-900 border border-amber-300'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>
                {onlyWithTeachers ? 'Tampilkan Semua Mapel' : `Hanya Mapel Ada Guru di Jadwal (${countWithTeachers})`}
              </span>
            </button>

            {/* TOMBOL NONAKTIFKAN MAPEL TANPA GURU (BULK DEACTIVATE) */}
            <button
              type="button"
              onClick={() => setShowBulkDeactivateModal(true)}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              title="Nonaktifkan semua mata pelajaran yang tidak memiliki guru di jadwal pelajaran sekolah"
            >
              <PowerOff className="w-4 h-4" />
              <span>Nonaktifkan Mapel Tanpa Guru</span>
            </button>

            {/* AKTIFKAN SEMUA MAPEL JIKA ADA YANG NONAKTIF */}
            {countDeactivated > 0 && (
              <button
                type="button"
                onClick={handleActivateAll}
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Aktifkan kembali seluruh mata pelajaran yang sebelumnya dinonaktifkan"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Aktifkan Semua ({countDeactivated})</span>
              </button>
            )}
          </div>
        </div>

        {/* SEARCH & DETAILED FILTER DROPDOWNS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari kode, nama mapel, guru pengampu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* FILTER STATUS MAPEL */}
            <select
              value={filterStatus}
              onChange={(e) => {
                const val = e.target.value as any;
                setFilterStatus(val);
                if (val === 'ada_guru') setOnlyWithTeachers(true);
                else setOnlyWithTeachers(false);
              }}
              className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Semua Status ({mapelList.length})</option>
              <option value="ada_guru">🟢 Ada Guru di Jadwal ({countWithTeachers})</option>
              <option value="tanpa_guru">⚪ Tanpa Guru di Jadwal ({countWithoutTeachers})</option>
              <option value="nonaktif">🚫 Mapel Dinonaktifkan ({countDeactivated})</option>
            </select>

            <select
              value={filterTingkat}
              onChange={(e) => setFilterTingkat(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Semua Tingkat</option>
              <option value="X">Kelas X (Kurmer)</option>
              <option value="XI">Kelas XI</option>
              <option value="XII">Kelas XII</option>
            </select>

            <select
              value={filterKelompok}
              onChange={(e) => setFilterKelompok(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Semua Kelompok</option>
              <option value="Umum">Muatan Umum & Nasional</option>
              <option value="Kejuruan">Muatan Kejuruan & C3</option>
              <option value="Mulok">Muatan Lokal (Mulok)</option>
            </select>

            <select
              value={filterJurusan}
              onChange={(e) => setFilterJurusan(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Semua Alokasi</option>
              <option value="Umum">Umum / Semua Jurusan</option>
              <option value="Farmasi">Farmasi</option>
              <option value="Asisten Keperawatan">Asisten Keperawatan</option>
              <option value="Kesehatan">Kesehatan</option>
              <option value="Tata Kecantikan & Spa">Tata Kecantikan & Spa</option>
              <option value="Perhotelan">Perhotelan</option>
            </select>

            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Mapel Manual</span>
            </button>
          </div>
        </div>
      </div>

      {/* TABLE DATA MAPEL */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">Kurikulum & Daftar Mata Pelajaran</h3>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
            <span>
              Menampilkan <strong>{filteredMapel.length}</strong> dari <strong>{mapelList.length}</strong> mata pelajaran
            </span>
            {onlyWithTeachers && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                Mode Guru Sesuai Jadwal
              </span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Kode</th>
                <th className="py-3 px-4">Mata Pelajaran</th>
                <th className="py-3 px-4">Guru Pengampu (Jadwal)</th>
                <th className="py-3 px-4">Kelompok Muatan</th>
                <th className="py-3 px-4">Alokasi Jurusan</th>
                <th className="py-3 px-4 text-center">Tingkat</th>
                <th className="py-3 px-4 text-center">Beban (JP)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMapel.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400 space-y-2">
                    <p className="font-semibold text-slate-500">
                      Tidak ada mata pelajaran yang cocok dengan filter aktif.
                    </p>
                    {onlyWithTeachers && (
                      <button
                        type="button"
                        onClick={() => {
                          setOnlyWithTeachers(false);
                          setFilterStatus('all');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-900 text-xs font-bold hover:bg-amber-200 transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Tampilkan Semua Mapel</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredMapel.map((mapel) => {
                  const isUmum = mapel.kelompok === 'Muatan Umum' || mapel.jurusan === 'Umum' || mapel.jurusan === 'Semua';
                  const schedInfo = mapelScheduleMap.get(mapel.id);
                  const hasTeacher = !!schedInfo?.hasTeacher;
                  const isNonaktif = mapel.status === 'nonaktif';

                  return (
                    <tr 
                      key={mapel.id} 
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isNonaktif ? 'bg-slate-50/50 opacity-60' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-900">
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200/60 text-[11px]">
                          {mapel.kode}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={isNonaktif ? 'line-through text-slate-400' : ''}>
                              {mapel.namaMapel}
                            </span>
                            {!initialMapelIdSet.has(mapel.id) && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                                <span>MAPEL BARU</span>
                              </span>
                            )}
                          </div>
                          {mapel.keterangan && (
                            <p className="text-[10px] text-slate-400 font-normal mt-0.5">
                              {mapel.keterangan}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* GURU PENGAMPU SESUAI JADWAL ATAU MASTER */}
                      <td className="py-3.5 px-4">
                        {hasTeacher ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-emerald-800 font-bold text-[11px]">
                              <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="line-clamp-1">{schedInfo.teachers.join(', ')}</span>
                            </div>
                            {schedInfo.classes.length > 0 && (
                              <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                                <GraduationCap className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="line-clamp-1">{schedInfo.classes.join(', ')}</span>
                              </div>
                            )}
                          </div>
                        ) : mapel.guruPengampu ? (
                          <div className="flex items-center gap-1.5 text-teal-800 font-semibold text-[11px]">
                            <UserCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                            <span className="line-clamp-1">{mapel.guruPengampu}</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                            <span>Belum ada di jadwal</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isUmum
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : 'bg-purple-50 text-purple-800 border border-purple-200'
                          }`}
                        >
                          {mapel.kelompok || (isUmum ? 'Muatan Umum' : 'Muatan Kejuruan')}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {mapel.jurusan}
                      </td>

                      <td className="py-3.5 px-4 text-center font-medium text-slate-600">
                        {mapel.tingkat || 'Semua'}
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                        {mapel.jamPerMinggu ? `${mapel.jamPerMinggu} JP` : '-'}
                      </td>

                      {/* STATUS BADGE */}
                      <td className="py-3.5 px-4 text-center">
                        {isNonaktif ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <PowerOff className="w-2.5 h-2.5" />
                            <span>Nonaktif</span>
                          </span>
                        ) : hasTeacher ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Aktif di Jadwal</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <span>Aktif</span>
                          </span>
                        )}
                      </td>

                      {/* AKSI: TOGGLE STATUS, EDIT, DELETE */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* BUTTON TOGGLE NONAKTIF / AKTIF */}
                          <button
                            type="button"
                            onClick={() => handleToggleMapelStatus(mapel)}
                            title={isNonaktif ? "Aktifkan mata pelajaran ini" : "Nonaktifkan mata pelajaran ini"}
                            className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                              isNonaktif
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-slate-200'
                            }`}
                          >
                            {isNonaktif ? (
                              <>
                                <Power className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-[10px]">Aktifkan</span>
                              </>
                            ) : (
                              <>
                                <PowerOff className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-600" />
                                <span className="text-[10px]">Nonaktifkan</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => openEditModal(mapel)}
                            title="Edit Mata Pelajaran"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDelete(mapel)}
                            title="Hapus Mata Pelajaran"
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

      {/* MODAL KONFIRMASI NONAKTIFKAN MAPEL TANPA GURU (BULK) */}
      {showBulkDeactivateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <PowerOff className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-bold text-slate-900">
                Nonaktifkan Mapel Tanpa Guru Sesuai Jadwal
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Sistem mendeteksi ada <strong>{countWithoutTeachers}</strong> mata pelajaran yang belum dialokasikan guru di jadwal pelajaran aktif sekolah.
              </p>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-left text-xs text-rose-900 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-rose-950">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Dampak Penonaktifan:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-800">
                  <li>
                    Hanya <strong>{countWithTeachers} mata pelajaran</strong> yang memiliki guru aktif di jadwal yang akan muncul di dropdown & filter.
                  </li>
                  <li>
                    Sebanyak <strong>{countWithoutTeachers} mata pelajaran</strong> tanpa jadwal akan diberi status "Nonaktif" (disembunyikan).
                  </li>
                  <li>
                    Nilai rapor & catatan yang sudah ada tetap aman dan tidak terhapus.
                  </li>
                  <li>
                    Anda dapat mengaktifkan kembali mata pelajaran sewaktu-waktu dengan tombol <em>"Aktifkan Semua"</em>.
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowBulkDeactivateModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeactivateUnscheduled}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <PowerOff className="w-4 h-4" />
                <span>Ya, Nonaktifkan Sekarang ({countWithoutTeachers} Mapel)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORM TAMBAH / EDIT MAPEL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {editingMapelId ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {editingMapelId ? 'Perbarui data mata pelajaran kurikulum' : 'Tambahkan mapel umum, kejuruan, atau mulok baru'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kode Mapel <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: MP-01"
                    value={formKode}
                    onChange={(e) => setFormKode(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Mata Pelajaran <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Anatomi Fisiologi"
                    value={formNamaMapel}
                    onChange={(e) => setFormNamaMapel(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kelompok Muatan
                  </label>
                  <select
                    value={formKelompok}
                    onChange={(e) => setFormKelompok(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 bg-white"
                  >
                    <option value="Muatan Umum">Muatan Umum / Nasional (A & B)</option>
                    <option value="Muatan Kejuruan">Muatan Kejuruan / C3</option>
                    <option value="Muatan Lokal">Muatan Lokal (Mulok)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Alokasi Jurusan
                  </label>
                  <select
                    value={formJurusan}
                    onChange={(e) => setFormJurusan(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 bg-white"
                  >
                    <option value="Umum">Umum (Semua Jurusan)</option>
                    <option value="Farmasi">Farmasi</option>
                    <option value="Asisten Keperawatan">Asisten Keperawatan</option>
                    <option value="Kesehatan">Kesehatan (Farmasi & Keperawatan)</option>
                    <option value="Tata Kecantikan & Spa">Tata Kecantikan & Spa</option>
                    <option value="Perhotelan">Perhotelan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tingkat Kelas
                  </label>
                  <select
                    value={formTingkat}
                    onChange={(e) => setFormTingkat(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 bg-white"
                  >
                    <option value="Semua">Semua Tingkat (X - XII)</option>
                    <option value="X">Kelas X</option>
                    <option value="XI">Kelas XI</option>
                    <option value="XII">Kelas XII</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Beban Jam Pelajaran (JP/Minggu)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={formJamPerMinggu}
                    onChange={(e) => setFormJamPerMinggu(parseInt(e.target.value) || 2)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Guru Pengampu (Utama)
                </label>
                <select
                  value={formIdGuru}
                  onChange={(e) => {
                    const selId = e.target.value;
                    setFormIdGuru(selId);
                    const foundT = teachersList.find(t => t.id === selId);
                    setFormGuruPengampu(foundT?.nama || '');
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 bg-white"
                >
                  <option value="">-- Pilih Guru Pengampu (Opsional / Belum Ditentukan) --</option>
                  {teachersList.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.nama} {t.gelar ? `(${t.gelar})` : ''} - {t.role === 'guru' ? 'Guru' : t.role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Keterangan Singkat
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Teori & Praktik Lab"
                  value={formKeterangan}
                  onChange={(e) => setFormKeterangan(e.target.value)}
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
                  <span>{editingMapelId ? 'Simpan Perubahan' : 'Tambahkan Mapel'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS MAPEL */}
      {deleteConfirmMapel && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Hapus Mata Pelajaran</h3>
              <p className="text-xs text-slate-600">
                Apakah Anda yakin ingin menghapus mata pelajaran <strong className="text-slate-900">{deleteConfirmMapel.namaMapel}</strong> ({deleteConfirmMapel.kode})?
              </p>
              <p className="text-[11px] text-rose-600 mt-2">
                Tindakan ini akan menghapus mata pelajaran ini dari daftar dan menyinkronkan perubahan ke Cloud database.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmMapel(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                Ya, Hapus Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
