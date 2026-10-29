import React, { useState, useMemo, useRef } from 'react';
import { AbsenMengajarRecord, User, Kelas, Mapel, JadwalPelajaran, SchoolInfo } from '../types';
import { KopSuratView } from './KopSuratView';
import { getDateForDayInSameWeek, isHariSekolahEfektif, isWeekend, getAlasanHariTidakEfektif } from '../utils/academicHelpers';
import { 
  Calendar, 
  Clock, 
  BookOpen, 
  CheckCircle2, 
  Plus, 
  Search, 
  Filter, 
  Printer, 
  Trash2, 
  Edit3, 
  Camera, 
  Upload, 
  FileText, 
  Users, 
  AlertCircle, 
  MapPin, 
  X, 
  Download,
  Eye,
  Sparkles,
  ChevronDown,
  Building2,
  Award,
  Layers
} from 'lucide-react';

interface AbsenMengajarViewProps {
  currentUser: User;
  kelasList: Kelas[];
  mapelList: Mapel[];
  jadwalPelajaranList?: JadwalPelajaran[];
  absenMengajarList: AbsenMengajarRecord[];
  usersList?: User[];
  schoolInfo?: SchoolInfo;
  onSaveAbsenMengajar: (record: AbsenMengajarRecord) => void;
  onDeleteAbsenMengajar: (id: string) => void;
  isAdminView?: boolean;
}

export const AbsenMengajarView: React.FC<AbsenMengajarViewProps> = ({
  currentUser,
  kelasList,
  mapelList,
  jadwalPelajaranList = [],
  absenMengajarList,
  usersList = [],
  schoolInfo,
  onSaveAbsenMengajar,
  onDeleteAbsenMengajar,
  isAdminView = false,
}) => {
  // Helper to get day name from YYYY-MM-DD
  const getHariIndo = (dateStr: string): string => {
    try {
      const date = new Date(dateStr + 'T12:00:00');
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      return days[date.getDay()] || 'Senin';
    } catch (_) {
      return 'Senin';
    }
  };

  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterKelas, setFilterKelas] = useState('SEMUA');
  const [filterMapel, setFilterMapel] = useState('SEMUA');
  const [filterBulan, setFilterBulan] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [filterGuru, setFilterGuru] = useState<string>(isAdminView ? 'SEMUA' : currentUser.id);

  // Modal Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AbsenMengajarRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<{ id: string; title: string; subtitle?: string } | null>(null);

  // Form Fields
  const [formIdGuru, setFormIdGuru] = useState(currentUser.id);
  const [formTanggal, setFormTanggal] = useState(todayStr);
  const [formHari, setFormHari] = useState(getHariIndo(todayStr));
  const [formJamMulai, setFormJamMulai] = useState('07:30');
  const [formJamSelesai, setFormJamSelesai] = useState('09:45');
  const [formJamKe, setFormJamKe] = useState('1 - 3 (3 JP)');
  const [formIdKelas, setFormIdKelas] = useState(kelasList[0]?.id || '');
  const [formIdMapel, setFormIdMapel] = useState('');
  const [formRuangKelas, setFormRuangKelas] = useState('Lab / Ruang Teori');
  const [formMateriPokok, setFormMateriPokok] = useState('');
  const [formKegiatanKBM, setFormKegiatanKBM] = useState('');
  const [formJumlahHadir, setFormJumlahHadir] = useState<number>(34);
  const [formJumlahSakit, setFormJumlahSakit] = useState<number>(1);
  const [formJumlahIzin, setFormJumlahIzin] = useState<number>(0);
  const [formJumlahAlpa, setFormJumlahAlpa] = useState<number>(0);
  const [formCatatanSiswa, setFormCatatanSiswa] = useState('');
  const [formStatusKehadiran, setFormStatusKehadiran] = useState<AbsenMengajarRecord['statusKehadiran']>('Hadir Mengajar');
  const [formFotoDokumentasi, setFormFotoDokumentasi] = useState<string>('');
  const [formNotification, setFormNotification] = useState<string | null>(null);

  // Image Zoom Modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Print Mode Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Teachers list for admin selector
  const guruList = useMemo(() => {
    return usersList.filter(u => u.role === 'guru' || u.role === 'walas' || u.role === 'pembina_ekskul' || u.role === 'admin');
  }, [usersList]);

  // List of mapel for current selected teacher
  const availableMapel = useMemo(() => {
    const targetGuru = usersList.find(u => u.id === formIdGuru) || currentUser;
    if (targetGuru.role === 'admin' || !targetGuru.mapelDiampu || targetGuru.mapelDiampu.length === 0) {
      return mapelList;
    }
    const filtered = mapelList.filter(m => 
      targetGuru.mapelDiampu?.some(val => 
        val.toLowerCase() === m.id.toLowerCase() ||
        val.toLowerCase() === m.kode.toLowerCase() ||
        val.toLowerCase() === m.namaMapel.toLowerCase() ||
        m.namaMapel.toLowerCase().includes(val.toLowerCase())
      )
    );
    return filtered.length > 0 ? filtered : mapelList;
  }, [formIdGuru, usersList, currentUser, mapelList]);

  // When opening modal for new entry, auto-fill default values
  const handleOpenAddModal = () => {
    setEditingRecord(null);
    setFormIdGuru(currentUser.id);
    setFormTanggal(todayStr);
    setFormHari(getHariIndo(todayStr));
    setFormJamMulai('07:30');
    setFormJamSelesai('09:45');
    setFormJamKe('1 - 3 (3 JP)');
    
    // Choose appropriate class
    const defaultKelas = kelasList[0]?.id || '';
    setFormIdKelas(defaultKelas);

    // Auto-select first available mapel
    const defaultMapel = availableMapel[0]?.id || mapelList[0]?.id || '';
    setFormIdMapel(defaultMapel);
    setFormRuangKelas('Lab Komputer / Teori');
    setFormMateriPokok('');
    setFormKegiatanKBM('');
    setFormJumlahHadir(34);
    setFormJumlahSakit(1);
    setFormJumlahIzin(0);
    setFormJumlahAlpa(0);
    setFormCatatanSiswa('');
    setFormStatusKehadiran('Hadir Mengajar');
    setFormFotoDokumentasi('');
    setFormNotification(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (rec: AbsenMengajarRecord) => {
    setEditingRecord(rec);
    setFormIdGuru(rec.idGuru);
    setFormTanggal(rec.tanggal);
    setFormHari(rec.hari || getHariIndo(rec.tanggal));
    setFormJamMulai(rec.jamMulai || '07:30');
    setFormJamSelesai(rec.jamSelesai || '09:45');
    setFormJamKe(rec.jamKe || '1 - 3 (3 JP)');
    setFormIdKelas(rec.idKelas);
    setFormIdMapel(rec.idMapel);
    setFormRuangKelas(rec.ruangKelas || 'Lab / Ruang Kelas');
    setFormMateriPokok(rec.materiPokok);
    setFormKegiatanKBM(rec.kegiatanKBM || '');
    setFormJumlahHadir(rec.jumlahHadir ?? 34);
    setFormJumlahSakit(rec.jumlahSakit ?? 0);
    setFormJumlahIzin(rec.jumlahIzin ?? 0);
    setFormJumlahAlpa(rec.jumlahAlpa ?? 0);
    setFormCatatanSiswa(rec.catatanSiswa || '');
    setFormStatusKehadiran(rec.statusKehadiran);
    setFormFotoDokumentasi(rec.fotoDokumentasiUrl || '');
    setFormNotification(null);
    setIsModalOpen(true);
  };

  const handleFotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Ukuran foto terlalu besar. Maksimal 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormFotoDokumentasi(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMateriPokok.trim()) {
      setFormNotification('Silakan isi Pokok Bahasan / Materi Pembelajaran.');
      return;
    }

    if (formHari === 'Sabtu' || formHari === 'Minggu' || !isHariSekolahEfektif(formTanggal)) {
      const alasan = getAlasanHariTidakEfektif(formTanggal) || 'Hari Libur';
      setFormNotification(`Tanggal ${formTanggal} (${formHari}) adalah ${alasan}. Otomatis tidak ada kegiatan KBM dan absen mengajar.`);
      return;
    }

    const selectedTeacher = usersList.find(u => u.id === formIdGuru) || currentUser;
    const selectedKelasObj = kelasList.find(k => k.id === formIdKelas);
    const selectedMapelObj = mapelList.find(m => m.id === formIdMapel);

    const record: AbsenMengajarRecord = {
      id: editingRecord ? editingRecord.id : `absen-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      idGuru: formIdGuru,
      namaGuru: selectedTeacher.nama,
      nipOrNis: selectedTeacher.nipOrNis,
      tanggal: formTanggal,
      hari: formHari,
      jamMulai: formJamMulai,
      jamSelesai: formJamSelesai,
      jamKe: formJamKe,
      idKelas: formIdKelas,
      namaKelas: selectedKelasObj?.namaKelas || 'Kelas X',
      idMapel: formIdMapel,
      namaMapel: selectedMapelObj?.namaMapel || 'Mata Pelajaran',
      materiPokok: formMateriPokok.trim(),
      kegiatanKBM: formKegiatanKBM.trim(),
      jumlahHadir: Number(formJumlahHadir),
      jumlahSakit: Number(formJumlahSakit),
      jumlahIzin: Number(formJumlahIzin),
      jumlahAlpa: Number(formJumlahAlpa),
      catatanSiswa: formCatatanSiswa.trim(),
      statusKehadiran: formStatusKehadiran,
      ruangKelas: formRuangKelas,
      fotoDokumentasiUrl: formFotoDokumentasi,
      createdAt: editingRecord ? editingRecord.createdAt : new Date().toISOString(),
    };

    onSaveAbsenMengajar(record);
    setIsModalOpen(false);
  };

  // Filtered list
  const filteredRecords = useMemo(() => {
    return absenMengajarList.filter(rec => {
      // Guru filter
      if (!isAdminView && rec.idGuru !== currentUser.id && currentUser.role !== 'admin') {
        return false;
      }
      if (isAdminView && filterGuru !== 'SEMUA' && rec.idGuru !== filterGuru) {
        return false;
      }

      // Kelas filter
      if (filterKelas !== 'SEMUA' && rec.idKelas !== filterKelas) {
        return false;
      }

      // Mapel filter
      if (filterMapel !== 'SEMUA' && rec.idMapel !== filterMapel) {
        return false;
      }

      // Bulan filter (YYYY-MM)
      if (filterBulan && !rec.tanggal.startsWith(filterBulan)) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchMateri = rec.materiPokok.toLowerCase().includes(q);
        const matchGuru = rec.namaGuru.toLowerCase().includes(q);
        const matchKelas = rec.namaKelas.toLowerCase().includes(q);
        const matchMapel = rec.namaMapel.toLowerCase().includes(q);
        if (!matchMateri && !matchGuru && !matchKelas && !matchMapel) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => (b.tanggal + b.jamMulai).localeCompare(a.tanggal + a.jamMulai));
  }, [absenMengajarList, currentUser, isAdminView, filterGuru, filterKelas, filterMapel, filterBulan, searchQuery]);

  // Today teaching count for logged in teacher
  const todayRecords = useMemo(() => {
    return absenMengajarList.filter(rec => 
      rec.tanggal === todayStr && 
      (rec.idGuru === currentUser.id || currentUser.role === 'admin')
    );
  }, [absenMengajarList, todayStr, currentUser]);

  // Statistics
  const totalJP = useMemo(() => {
    return filteredRecords.reduce((acc, rec) => {
      const match = rec.jamKe.match(/(\d+)\s*JP/i);
      if (match) return acc + parseInt(match[1], 10);
      return acc + 2; // Default 2 JP
    }, 0);
  }, [filteredRecords]);

  const avgStudentAttendance = useMemo(() => {
    if (filteredRecords.length === 0) return 100;
    let totalHadir = 0;
    let totalSiswa = 0;
    filteredRecords.forEach(r => {
      const h = r.jumlahHadir || 0;
      const s = r.jumlahSakit || 0;
      const i = r.jumlahIzin || 0;
      const a = r.jumlahAlpa || 0;
      const tot = h + s + i + a;
      if (tot > 0) {
        totalHadir += h;
        totalSiswa += tot;
      }
    });
    return totalSiswa > 0 ? Math.round((totalHadir / totalSiswa) * 100) : 100;
  }, [filteredRecords]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      alert('Tidak ada data absen mengajar untuk diunduh.');
      return;
    }
    const headers = ['No', 'Tanggal', 'Hari', 'Jam Ke', 'Waktu', 'Guru', 'NIP', 'Kelas', 'Mata Pelajaran', 'Ruang', 'Pokok Bahasan/Materi', 'Kegiatan KBM', 'Hadir', 'Sakit', 'Izin', 'Alpa', 'Status', 'Catatan'];
    const rows = filteredRecords.map((r, i) => [
      i + 1,
      r.tanggal,
      r.hari,
      r.jamKe,
      `${r.jamMulai} - ${r.jamSelesai}`,
      r.namaGuru,
      r.nipOrNis || '-',
      r.namaKelas,
      r.namaMapel,
      r.ruangKelas || '-',
      `"${r.materiPokok.replace(/"/g, '""')}"`,
      `"${(r.kegiatanKBM || '').replace(/"/g, '""')}"`,
      r.jumlahHadir ?? 0,
      r.jumlahSakit ?? 0,
      r.jumlahIzin ?? 0,
      r.jumlahAlpa ?? 0,
      r.statusKehadiran,
      `"${(r.catatanSiswa || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Rekap_Absen_Mengajar_${filterBulan}_${schoolInfo?.nama || 'SMK'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-80 h-80 rounded-full bg-white/5 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-blue-200 text-xs font-semibold backdrop-blur-xs">
              <Calendar className="w-3.5 h-3.5 text-blue-300" />
              <span>Agenda KBM & Presensi Tatap Muka Terpadu</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {isAdminView ? 'Monitoring Jurnal & Absen Mengajar Guru' : 'Portal Absen & Jurnal Mengajar Guru'}
            </h2>
            <p className="text-xs sm:text-sm text-blue-100/90 max-w-2xl leading-relaxed">
              Catat presensi mengajar, pokok materi kurikulum merdeka, rekap kehadiran siswa di kelas, serta dokumentasi pembelajaran harian secara transparan dan terdata di Cloud.
            </p>

            {/* Quick Status Today */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border ${
                todayRecords.length > 0 
                  ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40' 
                  : 'bg-amber-500/20 text-amber-200 border-amber-400/40'
              }`}>
                {todayRecords.length > 0 ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Sudah Mengisi Absen Mengajar Hari Ini ({todayRecords.length} Sesi KBM)</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Belum ada sesi mengajar tercatat hari ini ({todayStr})</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/30 transition-all cursor-pointer transform hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4 text-slate-950" />
              <span>Catat Absen Mengajar</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm flex items-center gap-2 border border-white/20 backdrop-blur-xs transition-all cursor-pointer"
              title="Cetak format rekapitulasi agenda mengajar guru"
            >
              <Printer className="w-4 h-4 text-blue-200" />
              <span>Cetak Jurnal</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm flex items-center gap-2 border border-white/20 backdrop-blur-xs transition-all cursor-pointer"
              title="Unduh format spreadsheet CSV"
            >
              <Download className="w-4 h-4 text-emerald-300" />
              <span>Excel/CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900">{filteredRecords.length}</div>
            <div className="text-xs text-slate-500 font-medium">Sesi KBM Terlaksana</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900">{totalJP} JP</div>
            <div className="text-xs text-slate-500 font-medium">Total Jam Tatap Muka</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900">{avgStudentAttendance}%</div>
            <div className="text-xs text-slate-500 font-medium">Rata-rata Kehadiran Siswa</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900">
              {new Set(filteredRecords.map(r => r.idKelas)).size} Kelas
            </div>
            <div className="text-xs text-slate-500 font-medium">Cakupan Rombongan Belajar</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari pokok materi, kelas, mapel, atau guru..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          {isAdminView && (
            <select
              value={filterGuru}
              onChange={(e) => setFilterGuru(e.target.value)}
              className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold"
            >
              <option value="SEMUA">Semua Dewan Guru</option>
              {guruList.map(g => (
                <option key={g.id} value={g.id}>{g.nama}</option>
              ))}
            </select>
          )}

          <select
            value={filterKelas}
            onChange={(e) => setFilterKelas(e.target.value)}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold"
          >
            <option value="SEMUA">Semua Kelas</option>
            {kelasList.map(k => (
              <option key={k.id} value={k.id}>{k.namaKelas}</option>
            ))}
          </select>

          <select
            value={filterMapel}
            onChange={(e) => setFilterMapel(e.target.value)}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold"
          >
            <option value="SEMUA">Semua Mapel</option>
            {mapelList.map(m => (
              <option key={m.id} value={m.id}>{m.namaMapel}</option>
            ))}
          </select>

          <input
            type="month"
            value={filterBulan}
            onChange={(e) => setFilterBulan(e.target.value)}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold"
            title="Pilih Bulan & Tahun"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Menampilkan <strong>{filteredRecords.length}</strong> catatan
        </div>
      </div>

      {/* Table Records */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-700 uppercase font-bold tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 text-center w-12">No</th>
                <th className="py-3.5 px-4">Tanggal & Jam</th>
                {isAdminView && <th className="py-3.5 px-4">Guru Pengampu</th>}
                <th className="py-3.5 px-4">Kelas & Mapel</th>
                <th className="py-3.5 px-4 min-w-[240px]">Pokok Bahasan / Materi KBM</th>
                <th className="py-3.5 px-4 text-center">Presensi Siswa</th>
                <th className="py-3.5 px-4 text-center">Foto Bukti</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={isAdminView ? 9 : 8} className="py-12 text-center text-slate-400">
                    <BookOpen className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">Belum ada riwayat agenda mengajar yang sesuai filter.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Klik tombol "Catat Absen Mengajar" untuk mencatat sesi KBM hari ini.</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec, idx) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 text-center font-mono text-slate-400 font-semibold">{idx + 1}</td>
                    
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{rec.hari}, {new Date(rec.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                      <div className="font-mono text-[11px] text-blue-600 font-semibold flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>Jam {rec.jamMulai} - {rec.jamSelesai}</span>
                      </div>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono text-[10px] font-bold">
                        {rec.jamKe}
                      </span>
                    </td>

                    {isAdminView && (
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{rec.namaGuru}</div>
                        <div className="text-[10px] text-slate-500 font-mono">NIP: {rec.nipOrNis || '-'}</div>
                      </td>
                    )}

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{rec.namaKelas}</div>
                      <div className="text-[11px] text-slate-600 font-medium">{rec.namaMapel}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Ruang: {rec.ruangKelas || '-'}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 text-xs">{rec.materiPokok}</div>
                      {rec.kegiatanKBM && (
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                          {rec.kegiatanKBM}
                        </p>
                      )}
                      {rec.catatanSiswa && (
                        <div className="mt-1 text-[10px] bg-amber-50 text-amber-800 px-2 py-1 rounded border border-amber-200/60 inline-block">
                          <strong>Catatan:</strong> {rec.catatanSiswa}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold" title="Hadir">
                          H: {rec.jumlahHadir ?? 0}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold" title="Sakit">
                          S: {rec.jumlahSakit ?? 0}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold" title="Izin">
                          I: {rec.jumlahIzin ?? 0}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold" title="Alpa">
                          A: {rec.jumlahAlpa ?? 0}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      {rec.fotoDokumentasiUrl ? (
                        <button
                          type="button"
                          onClick={() => setPreviewImage(rec.fotoDokumentasiUrl!)}
                          className="relative group cursor-pointer inline-block"
                          title="Lihat foto dokumentasi KBM"
                        >
                          <img
                            src={rec.fotoDokumentasiUrl}
                            alt="Dokumentasi KBM"
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200 shadow-xs group-hover:opacity-80 transition-opacity"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-white">
                            <Eye className="w-3.5 h-3.5" />
                          </div>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Tanpa Foto</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        rec.statusKehadiran === 'Hadir Mengajar'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : rec.statusKehadiran === 'Dinas Luar'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {rec.statusKehadiran}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(rec)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Edit Catatan Jurnal"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRecordToDelete({
                              id: rec.id,
                              title: `Hapus catatan jurnal "${rec.materiPokok}"?`,
                              subtitle: `${rec.namaKelas} • ${rec.namaMapel} (Tanggal ${rec.tanggal})`
                            });
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Hapus Catatan Jurnal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL INPUT / EDIT ABSEN MENGAJAR */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingRecord ? 'Ubah Catatan Jurnal & Absen Mengajar' : 'Catat Absen & Jurnal Mengajar Guru'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Isi detail pertemuan KBM, materi pokok yang diajarkan, dan rekap kehadiran siswa.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formNotification && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formNotification}</span>
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="space-y-4">
              {/* If Admin view, allow selecting which teacher is teaching */}
              {isAdminView && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Guru Pengampu <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formIdGuru}
                    onChange={(e) => setFormIdGuru(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    {guruList.map(g => (
                      <option key={g.id} value={g.id}>{g.nama} ({g.nipOrNis || 'Guru'})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Tanggal, Hari, Waktu & Jam Ke */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tanggal KBM <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formTanggal}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setFormTanggal(newDate);
                      setFormHari(getHariIndo(newDate));
                    }}
                    required
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hari KBM <span className="text-slate-400 font-normal text-[10px]">(Pilih hari auto-ganti tanggal)</span>
                  </label>
                  <select
                    value={formHari}
                    onChange={(e) => {
                      const dayVal = e.target.value;
                      setFormHari(dayVal);
                      const newDate = getDateForDayInSameWeek(dayVal, formTanggal);
                      setFormTanggal(newDate);
                    }}
                    className={`w-full py-2 px-3 border rounded-xl text-xs font-bold cursor-pointer ${
                      formHari === 'Sabtu' || formHari === 'Minggu' || !isHariSekolahEfektif(formTanggal)
                        ? 'bg-amber-50 border-amber-300 text-amber-800'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map((h) => (
                      <option key={h} value={h}>
                        {h} {h === 'Sabtu' || h === 'Minggu' ? '(Libur Akhir Pekan)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jam Pelajaran Ke- <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formJamKe}
                    onChange={(e) => setFormJamKe(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    <option value="1 - 2 (2 JP)">Jam Ke 1 - 2 (2 JP)</option>
                    <option value="1 - 3 (3 JP)">Jam Ke 1 - 3 (3 JP)</option>
                    <option value="1 - 4 (4 JP)">Jam Ke 1 - 4 (4 JP)</option>
                    <option value="3 - 4 (2 JP)">Jam Ke 3 - 4 (2 JP)</option>
                    <option value="4 - 6 (3 JP)">Jam Ke 4 - 6 (3 JP)</option>
                    <option value="5 - 6 (2 JP)">Jam Ke 5 - 6 (2 JP)</option>
                    <option value="7 - 8 (2 JP)">Jam Ke 7 - 8 (2 JP)</option>
                    <option value="7 - 9 (3 JP)">Jam Ke 7 - 9 (3 JP)</option>
                    <option value="Full Day KBM">Praktik Lapangan / Full Day</option>
                  </select>
                </div>
              </div>

              {/* WARNING JIKA HARI LIBUR (AKHIR PEKAN ATAU LIBUR NASIONAL) */}
              {(formHari === 'Sabtu' || formHari === 'Minggu' || !isHariSekolahEfektif(formTanggal)) && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2.5 text-amber-900 shadow-xs">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-bold text-amber-800">{getAlasanHariTidakEfektif(formTanggal) || 'Hari Libur'} ({formHari}, {formTanggal}): </span>
                    Sesuai kalender akademik di SMK Bakti Putra Mandiri, hari libur akhir pekan dan tanggal merah hari libur nasional otomatis tidak ada kegiatan KBM dan presensi mengajar.
                  </div>
                </div>
              )}

              {/* Jam Mulai - Jam Selesai & Ruang */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Waktu Mulai (HH:mm)
                  </label>
                  <input
                    type="time"
                    value={formJamMulai}
                    onChange={(e) => setFormJamMulai(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Waktu Selesai (HH:mm)
                  </label>
                  <input
                    type="time"
                    value={formJamSelesai}
                    onChange={(e) => setFormJamSelesai(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ruang Kelas / Lab
                  </label>
                  <input
                    type="text"
                    value={formRuangKelas}
                    placeholder="misal: Lab Farmasi 1 / R. Teori 201"
                    onChange={(e) => setFormRuangKelas(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Kelas & Mapel */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kelas yang Diajar <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formIdKelas}
                    onChange={(e) => setFormIdKelas(e.target.value)}
                    required
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    {kelasList.map(k => (
                      <option key={k.id} value={k.id}>{k.namaKelas}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mata Pelajaran <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formIdMapel}
                    onChange={(e) => setFormIdMapel(e.target.value)}
                    required
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    {availableMapel.map(m => (
                      <option key={m.id} value={m.id}>{m.namaMapel}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pokok Bahasan / Materi Pembelajaran */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pokok Bahasan / Materi Pembelajaran (Capaian Pembelajaran / TP) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Praktikum Pembuatan Sediaan Serbuk Bagi (Pulveres) & Uji Homogenitas"
                  value={formMateriPokok}
                  onChange={(e) => setFormMateriPokok(e.target.value)}
                  required
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>

              {/* Uraian Kegiatan Pembelajaran */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Uraian Kegiatan Pembelajaran / Metode KBM (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Penjelasan ringkas alur KBM (Apersepsi, demonstrasi alat laboratorium, kerja kelompok praktikum, evaluasi formatif)..."
                  value={formKegiatanKBM}
                  onChange={(e) => setFormKegiatanKBM(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              {/* Rekapitulasi Presensi Siswa di Kelas */}
              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Rekap Presensi Siswa di Kelas Saat KBM Berlangsung</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-800 mb-1">Jumlah Hadir</label>
                    <input
                      type="number"
                      min={0}
                      value={formJumlahHadir}
                      onChange={(e) => setFormJumlahHadir(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full py-1.5 px-3 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-blue-800 mb-1">Sakit (S)</label>
                    <input
                      type="number"
                      min={0}
                      value={formJumlahSakit}
                      onChange={(e) => setFormJumlahSakit(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full py-1.5 px-3 bg-white border border-blue-300 rounded-xl text-xs font-bold text-blue-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-amber-800 mb-1">Izin (I)</label>
                    <input
                      type="number"
                      min={0}
                      value={formJumlahIzin}
                      onChange={(e) => setFormJumlahIzin(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full py-1.5 px-3 bg-white border border-amber-300 rounded-xl text-xs font-bold text-amber-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-rose-800 mb-1">Alpa (A)</label>
                    <input
                      type="number"
                      min={0}
                      value={formJumlahAlpa}
                      onChange={(e) => setFormJumlahAlpa(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full py-1.5 px-3 bg-white border border-rose-300 rounded-xl text-xs font-bold text-rose-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Catatan Siswa / Keterangan Khusus (Nama yang Sakit/Izin/Kendala Siswa):
                  </label>
                  <input
                    type="text"
                    placeholder="misal: Siti Rahma sakit izin puskesmas; seluruh siswa aktif praktikum"
                    value={formCatatanSiswa}
                    onChange={(e) => setFormCatatanSiswa(e.target.value)}
                    className="w-full py-1.5 px-3 bg-white border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Status & Foto Dokumentasi KBM */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Status Kehadiran Mengajar Guru
                  </label>
                  <select
                    value={formStatusKehadiran}
                    onChange={(e) => setFormStatusKehadiran(e.target.value as any)}
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="Hadir Mengajar">Hadir Mengajar (Tatap Muka Normal)</option>
                    <option value="Izin (Tugas Terlampir)">Izin Berhalangan (Tugas Siswa Terlampir)</option>
                    <option value="Sakit (Tugas Terlampir)">Sakit (Tugas Siswa Terlampir)</option>
                    <option value="Dinas Luar">Tugas Dinas Luar / Workshop</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Foto Dokumentasi KBM (Kamera / Unggah)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFotoUpload}
                      id="foto-kbm-input"
                      className="hidden"
                    />
                    <label
                      htmlFor="foto-kbm-input"
                      className="flex-1 py-2 px-3 rounded-xl border border-dashed border-slate-300 hover:border-blue-400 bg-slate-50 hover:bg-blue-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Camera className="w-4 h-4 text-blue-600" />
                      <span>{formFotoDokumentasi ? 'Ganti Foto' : 'Ambil Foto / Unggah'}</span>
                    </label>

                    {formFotoDokumentasi && (
                      <div className="relative">
                        <img
                          src={formFotoDokumentasi}
                          alt="Thumbnail KBM"
                          className="w-9 h-9 rounded-lg object-cover border border-slate-200"
                        />
                        <button
                          type="button"
                          onClick={() => setFormFotoDokumentasi('')}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white rounded-full flex items-center justify-center text-[10px]"
                          title="Hapus foto"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingRecord ? 'Perbarui Jurnal Mengajar' : 'Simpan Absen & Jurnal'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ZOOM PREVIEW FOTO DOKUMENTASI */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-2xl max-h-[85vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl p-2" onClick={e => e.stopPropagation()}>
            <img 
              src={previewImage} 
              alt="Preview Dokumentasi KBM" 
              className="max-w-full max-h-[80vh] rounded-xl object-contain mx-auto"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* MODAL CETAK REKAPITULASI JURNAL MENGAJAR GURU (RESMI A4 PRINTABLE) */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl my-6 max-h-[92vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 no-print">
              <div>
                <h3 className="text-base font-bold text-slate-900">Lembar Rekapitulasi Jurnal Mengajar Guru</h3>
                <p className="text-xs text-slate-500">Format resmi ber-Kop Surat sekolah untuk arsip kurikulum, supervisi, dan laporan kehadiran.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Dokumen (Print)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Target Printable Area */}
            <div className="printable-document bg-white p-4 sm:p-8 border border-slate-200 rounded-2xl space-y-6 text-black">
              {/* KOP SURAT SEKOLAH RESMI */}
              <KopSuratView schoolInfo={schoolInfo} />

              <div className="text-center space-y-1 border-t-2 border-slate-900 pt-3">
                <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-black">
                  AGENDA & JURNAL HARIAN MENGAJAR GURU
                </h2>
                <p className="text-xs text-slate-700">
                  Tahun Pelajaran {schoolInfo?.tahunAjaranPembelajaran || '2026/2027'} • Semester {schoolInfo?.semesterPembelajaran || 'Ganjil'}
                </p>
              </div>

              {/* Biodata Guru */}
              <div className="grid grid-cols-2 text-xs gap-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-300">
                <div>
                  <span className="text-slate-500 inline-block w-28">Nama Guru:</span>
                  <strong className="text-slate-900">{isAdminView && filterGuru !== 'SEMUA' ? (guruList.find(g => g.id === filterGuru)?.nama || currentUser.nama) : currentUser.nama}</strong>
                </div>
                <div>
                  <span className="text-slate-500 inline-block w-28">NIP / NUPTK:</span>
                  <strong className="font-mono text-slate-900">{currentUser.nipOrNis || '-'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 inline-block w-28">Periode / Bulan:</span>
                  <strong className="text-slate-900">{filterBulan}</strong>
                </div>
                <div>
                  <span className="text-slate-500 inline-block w-28">Total Pertemuan:</span>
                  <strong className="text-blue-700 font-bold">{filteredRecords.length} Sesi ({totalJP} JP)</strong>
                </div>
              </div>

              {/* Table of Records */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-400">
                  <thead className="bg-slate-100 font-bold border-b border-slate-400 text-slate-800">
                    <tr>
                      <th className="p-2 border border-slate-400 text-center w-8">No</th>
                      <th className="p-2 border border-slate-400 w-28">Hari, Tanggal</th>
                      <th className="p-2 border border-slate-400 w-16 text-center">Jam Ke</th>
                      <th className="p-2 border border-slate-400 w-28">Kelas & Mapel</th>
                      <th className="p-2 border border-slate-400 min-w-[180px]">Pokok Bahasan & Kegiatan Pembelajaran</th>
                      <th className="p-2 border border-slate-400 text-center w-24">Siswa (H/S/I/A)</th>
                      <th className="p-2 border border-slate-400 text-center w-24">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-slate-500 italic">Tidak ada catatan agenda mengajar pada filter ini.</td>
                      </tr>
                    ) : (
                      filteredRecords.map((r, i) => (
                        <tr key={r.id} className="border-b border-slate-300">
                          <td className="p-2 border border-slate-300 text-center font-mono">{i + 1}</td>
                          <td className="p-2 border border-slate-300">
                            <strong>{r.hari}</strong>, <br />
                            <span className="text-[11px] text-slate-600">{r.tanggal}</span>
                          </td>
                          <td className="p-2 border border-slate-300 text-center font-mono text-[11px]">{r.jamKe}</td>
                          <td className="p-2 border border-slate-300">
                            <strong>{r.namaKelas}</strong>
                            <div className="text-[11px] text-slate-600">{r.namaMapel}</div>
                          </td>
                          <td className="p-2 border border-slate-300">
                            <strong className="text-slate-900">{r.materiPokok}</strong>
                            {r.kegiatanKBM && <p className="text-[11px] text-slate-600 mt-0.5">{r.kegiatanKBM}</p>}
                            {r.catatanSiswa && <div className="text-[10px] text-slate-500 italic mt-0.5">Catatan: {r.catatanSiswa}</div>}
                          </td>
                          <td className="p-2 border border-slate-300 text-center font-mono text-[11px]">
                            {r.jumlahHadir ?? 0} / {r.jumlahSakit ?? 0} / {r.jumlahIzin ?? 0} / {r.jumlahAlpa ?? 0}
                          </td>
                          <td className="p-2 border border-slate-300 text-center font-semibold text-[11px]">
                            {r.statusKehadiran}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Tanda Tangan Pengesahan Guru & Kepala Sekolah */}
              <div className="grid grid-cols-2 text-center text-xs pt-8 gap-8">
                <div>
                  <p className="text-slate-500">Mengetahui,</p>
                  <p className="font-bold text-slate-800">Kepala {schoolInfo?.nama || 'SMK Bakti Putra Mandiri'}</p>
                  <div className="h-20"></div>
                  <p className="font-bold underline text-slate-900">{schoolInfo?.kepalaSekolah || 'Drs. H. M. Sumardi, M.Pd'}</p>
                  <p className="text-slate-500 font-mono text-[11px]">NIP: {schoolInfo?.nipKepalaSekolah || '197005121998021001'}</p>
                </div>

                <div>
                  <p className="text-slate-500">Parung Panjang, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p className="font-bold text-slate-800">Guru Mata Pelajaran</p>
                  <div className="h-20"></div>
                  <p className="font-bold underline text-slate-900">{currentUser.nama}</p>
                  <p className="text-slate-500 font-mono text-[11px]">NIP/NUPTK: {currentUser.nipOrNis || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS JURNAL (In-App Modal) */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-scaleUp">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Konfirmasi Hapus Jurnal Mengajar</h3>
              <p className="text-xs text-slate-700 mt-1 font-semibold">
                {recordToDelete.title}
              </p>
              {recordToDelete.subtitle && (
                <p className="text-xs text-slate-500 mt-1">
                  {recordToDelete.subtitle}
                </p>
              )}
              <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 mt-3">
                Catatan jurnal dan presensi ini akan dihapus secara permanen dari riwayat mengajar Anda.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteAbsenMengajar(recordToDelete.id);
                  setRecordToDelete(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
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
