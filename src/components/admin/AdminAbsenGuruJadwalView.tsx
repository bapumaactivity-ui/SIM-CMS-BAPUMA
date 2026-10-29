import React, { useState, useMemo } from 'react';
import { 
  AbsenMengajarRecord, 
  JadwalPelajaran, 
  Kelas, 
  Mapel, 
  User, 
  SchoolInfo 
} from '../../types';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  UserCheck, 
  Users, 
  BookOpen, 
  Search, 
  Printer, 
  Download, 
  Plus, 
  X, 
  Edit3, 
  Trash2, 
  Sparkles, 
  Check, 
  FileSpreadsheet, 
  Building2,
  CalendarCheck,
  ChevronRight,
  ShieldCheck,
  Info
} from 'lucide-react';
import { 
  exportAbsenMengajarToExcel, 
  downloadTemplateJadwalExcel,
  normalizeExcelTime,
  formatDisplayJamKBM 
} from '../../utils/excelHelper';
import { KopSuratView } from '../KopSuratView';
import { printDocumentArea } from '../../utils/printHelper';
import { getDateForDayInSameWeek, isHariSekolahEfektif, isWeekend, getAlasanHariTidakEfektif } from '../../utils/academicHelpers';

interface AdminAbsenGuruJadwalViewProps {
  currentUser: User;
  jadwalPelajaranList: JadwalPelajaran[];
  absenMengajarList: AbsenMengajarRecord[];
  kelasList: Kelas[];
  mapelList: Mapel[];
  usersList: User[];
  schoolInfo: SchoolInfo;
  onSaveAbsenMengajar: (record: AbsenMengajarRecord) => void;
  onDeleteAbsenMengajar: (id: string) => void;
  onClearAllAbsenMengajar?: () => void;
}

export const AdminAbsenGuruJadwalView: React.FC<AdminAbsenGuruJadwalViewProps> = ({
  currentUser,
  jadwalPelajaranList,
  absenMengajarList,
  kelasList,
  mapelList,
  usersList,
  schoolInfo,
  onSaveAbsenMengajar,
  onDeleteAbsenMengajar,
  onClearAllAbsenMengajar,
}) => {
  // Helper hari indonesia
  const getHariIndo = (dateStr: string): 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu' | 'Minggu' => {
    try {
      const date = new Date(dateStr + 'T12:00:00');
      const days: ('Minggu' | 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu')[] = [
        'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'
      ];
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

  const [selectedTanggal, setSelectedTanggal] = useState(todayStr);
  const [selectedHari, setSelectedHari] = useState<string>(getHariIndo(todayStr));
  const [filterKelas, setFilterKelas] = useState<string>('SEMUA');
  const [filterGuru, setFilterGuru] = useState<string>('SEMUA');
  const [filterStatus, setFilterStatus] = useState<string>('SEMUA');
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Tab mode: Absen Harian Sesuai Jadwal vs Rekapitulasi Jam Mengajar Tiap Kelas
  const [viewMode, setViewMode] = useState<'jadwal_harian' | 'rekap_jam' | 'semua_riwayat'>('jadwal_harian');

  // Modal Detail Catat Absen
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [modalTargetJadwal, setModalTargetJadwal] = useState<JadwalPelajaran | null>(null);
  const [modalExistingRecord, setModalExistingRecord] = useState<AbsenMengajarRecord | null>(null);

  // Modal Form Inputs
  const [formMateriPokok, setFormMateriPokok] = useState('');
  const [formKegiatanKBM, setFormKegiatanKBM] = useState('');
  const [formJumlahJam, setFormJumlahJam] = useState<number>(2);
  const [formStatusKehadiran, setFormStatusKehadiran] = useState<AbsenMengajarRecord['statusKehadiran']>('Hadir Mengajar');
  const [formJumlahHadir, setFormJumlahHadir] = useState<number>(34);
  const [formJumlahSakit, setFormJumlahSakit] = useState<number>(0);
  const [formJumlahIzin, setFormJumlahIzin] = useState<number>(0);
  const [formJumlahAlpa, setFormJumlahAlpa] = useState<number>(0);
  const [formCatatan, setFormCatatan] = useState('');

  // In-App Confirmation Modal States (eliminates window.confirm block)
  const [recordToDelete, setRecordToDelete] = useState<{ id: string; title: string; subtitle?: string } | null>(null);
  const [showClearTemplateModal, setShowClearTemplateModal] = useState(false);

  // Print Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Filter dewan guru
  const teachersList = useMemo(() => {
    return usersList.filter(u => u.role === 'guru' || u.role === 'walas' || u.role === 'admin' || u.role === 'pembina_ekskul');
  }, [usersList]);

  // When selected date changes, auto update day name
  const handleDateChange = (dateStr: string) => {
    if (!dateStr) return;
    setSelectedTanggal(dateStr);
    const day = getHariIndo(dateStr);
    setSelectedHari(day);
  };

  // When selected day changes, auto update date to match that day in current week
  const handleDayChange = (dayName: string) => {
    setSelectedHari(dayName);
    const newDate = getDateForDayInSameWeek(dayName, selectedTanggal);
    setSelectedTanggal(newDate);
  };

  // Cek apakah hari atau tanggal yang dipilih adalah libur akhir pekan (Sabtu atau Minggu)
  const isWeekendSelected = selectedHari === 'Sabtu' || selectedHari === 'Minggu' || !isHariSekolahEfektif(selectedTanggal);

  // Scheduled classes for selected day
  const daySchedules = useMemo(() => {
    return jadwalPelajaranList.filter(j => {
      const matchDay = selectedHari === 'SEMUA' || j.hari === selectedHari;
      const matchKelas = filterKelas === 'SEMUA' || j.idKelas === filterKelas;
      const matchGuru = filterGuru === 'SEMUA' || j.idGuru === filterGuru;
      const matchQuery = !searchQuery.trim() || 
        j.namaGuru.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.namaMapel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.namaKelas.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.ruang.toLowerCase().includes(searchQuery.toLowerCase());

      return matchDay && matchKelas && matchGuru && matchQuery;
    });
  }, [jadwalPelajaranList, selectedHari, filterKelas, filterGuru, searchQuery]);

  // Map existing records for the selected date
  const recordsByJadwalOrSlot = useMemo(() => {
    const map = new Map<string, AbsenMengajarRecord>();
    absenMengajarList.forEach(rec => {
      if (rec.tanggal === selectedTanggal) {
        // By explicit idJadwal if available
        if (rec.idJadwal) {
          map.set(`jadwal-${rec.idJadwal}`, rec);
        }
        // Also fallback key: idKelas + idMapel + idGuru
        map.set(`slot-${rec.idKelas}-${rec.idMapel}-${rec.idGuru}`, rec);
        map.set(`slot-kelas-jam-${rec.idKelas}-${rec.jamMulai}`, rec);
      }
    });
    return map;
  }, [absenMengajarList, selectedTanggal]);

  // Find record for a schedule
  const getRecordForSchedule = (j: JadwalPelajaran): AbsenMengajarRecord | undefined => {
    return recordsByJadwalOrSlot.get(`jadwal-${j.id}`) ||
      recordsByJadwalOrSlot.get(`slot-${j.idKelas}-${j.idMapel}-${j.idGuru}`) ||
      recordsByJadwalOrSlot.get(`slot-kelas-jam-${j.idKelas}-${j.jamMulai}`);
  };

  // Helper calculate default JP from schedule
  const getScheduleJP = (j: JadwalPelajaran): number => {
    if (j.jumlahJam && j.jumlahJam > 0) return j.jumlahJam;
    // Guess based on time difference (e.g. 45 min per JP)
    try {
      const cleanMulai = normalizeExcelTime(j.jamMulai, '07:15');
      const cleanSelesai = normalizeExcelTime(j.jamSelesai, '08:45');
      const [startH, startM] = cleanMulai.split(':').map(Number);
      const [endH, endM] = cleanSelesai.split(':').map(Number);
      const diffMins = (endH * 60 + endM) - (startH * 60 + startM);
      if (diffMins > 0) {
        const calculated = Math.round(diffMins / 45);
        return Math.max(1, calculated);
      }
    } catch (_) {}
    return 2;
  };

  // Quick 1-Click attendance handler
  const handleQuickMarkAttendance = (
    jadwal: JadwalPelajaran, 
    status: AbsenMengajarRecord['statusKehadiran'],
    customJP?: number
  ) => {
    if (isWeekendSelected) {
      const alasan = getAlasanHariTidakEfektif(selectedTanggal) || 'Hari Libur';
      setNotification({
        text: `Tanggal ${selectedTanggal} (${selectedHari}) adalah ${alasan}. Otomatis tidak ada presensi mengajar.`,
        type: 'error',
      });
      setTimeout(() => setNotification(null), 4000);
      return;
    }

    const existing = getRecordForSchedule(jadwal);
    const jp = customJP !== undefined ? customJP : (existing?.jumlahJam || getScheduleJP(jadwal));
    const cleanMulai = normalizeExcelTime(jadwal.jamMulai, '07:15');
    const cleanSelesai = normalizeExcelTime(jadwal.jamSelesai, '08:45');
    const jamKeStr = jadwal.jamKe || `${jp} JP (${cleanMulai} - ${cleanSelesai})`;

    const record: AbsenMengajarRecord = {
      id: existing ? existing.id : `absen-adm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      idJadwal: jadwal.id,
      idGuru: jadwal.idGuru,
      namaGuru: jadwal.namaGuru,
      nipOrNis: usersList.find(u => u.id === jadwal.idGuru)?.nipOrNis || '-',
      tanggal: selectedTanggal,
      hari: selectedHari as any,
      jamMulai: cleanMulai,
      jamSelesai: cleanSelesai,
      jamKe: jamKeStr,
      jumlahJam: jp,
      idKelas: jadwal.idKelas,
      namaKelas: jadwal.namaKelas,
      idMapel: jadwal.idMapel,
      namaMapel: jadwal.namaMapel,
      materiPokok: existing?.materiPokok || `KBM ${jadwal.namaMapel} (Sesuai Kurikulum)`,
      kegiatanKBM: existing?.kegiatanKBM || `Tatap muka pembelajaran di kelas ${jadwal.namaKelas} ruang ${jadwal.ruang || 'Lab/Teori'}.`,
      jumlahHadir: existing?.jumlahHadir ?? 34,
      jumlahSakit: existing?.jumlahSakit ?? 0,
      jumlahIzin: existing?.jumlahIzin ?? 0,
      jumlahAlpa: existing?.jumlahAlpa ?? 0,
      catatanSiswa: existing?.catatanSiswa || '',
      statusKehadiran: status,
      ruangKelas: jadwal.ruang,
      fotoDokumentasiUrl: existing?.fotoDokumentasiUrl || '',
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
      recordedBy: 'admin',
    };

    onSaveAbsenMengajar(record);
    setNotification({
      text: `Presensi ${jadwal.namaGuru} (${jadwal.namaKelas} - ${jp} JP) berhasil ditandai sebagai "${status}"!`,
      type: 'success',
    });
    setTimeout(() => setNotification(null), 3500);
  };

  // Batch action: Mark all unrecorded schedules as Hadir
  const handleBatchMarkAllHadir = () => {
    if (isWeekendSelected) {
      const alasan = getAlasanHariTidakEfektif(selectedTanggal) || 'Hari Libur';
      setNotification({
        text: `Tanggal ${selectedTanggal} (${selectedHari}) adalah ${alasan}. Otomatis tidak ada presensi.`,
        type: 'error',
      });
      setTimeout(() => setNotification(null), 4000);
      return;
    }

    let count = 0;
    daySchedules.forEach(j => {
      const existing = getRecordForSchedule(j);
      if (!existing) {
        const jp = getScheduleJP(j);
        const record: AbsenMengajarRecord = {
          id: `absen-adm-batch-${Date.now()}-${count}-${Math.random().toString(36).substring(2, 6)}`,
          idJadwal: j.id,
          idGuru: j.idGuru,
          namaGuru: j.namaGuru,
          nipOrNis: usersList.find(u => u.id === j.idGuru)?.nipOrNis || '-',
          tanggal: selectedTanggal,
          hari: selectedHari as any,
          jamMulai: j.jamMulai,
          jamSelesai: j.jamSelesai,
          jamKe: j.jamKe || `${jp} JP`,
          jumlahJam: jp,
          idKelas: j.idKelas,
          namaKelas: j.namaKelas,
          idMapel: j.idMapel,
          namaMapel: j.namaMapel,
          materiPokok: `KBM ${j.namaMapel} Sesuai Silabus`,
          kegiatanKBM: `Pembelajaran tatap muka di ${j.ruang || 'ruang kelas'}.`,
          jumlahHadir: 34,
          jumlahSakit: 0,
          jumlahIzin: 0,
          jumlahAlpa: 0,
          statusKehadiran: 'Hadir Mengajar',
          ruangKelas: j.ruang,
          createdAt: new Date().toISOString(),
          recordedBy: 'admin',
        };
        onSaveAbsenMengajar(record);
        count++;
      }
    });

    if (count > 0) {
      setNotification({
        text: `Sukses! Berhasil mengabsen ${count} sesi jadwal pelajaran hari ini sebagai "Hadir Mengajar".`,
        type: 'success',
      });
    } else {
      setNotification({
        text: `Semua sesi jadwal hari ini sudah memiliki catatan absensi.`,
        type: 'info',
      });
    }
    setTimeout(() => setNotification(null), 4000);
  };

  // Open modal for detail edit / custom agenda
  const handleOpenDetailModal = (jadwal: JadwalPelajaran) => {
    const existing = getRecordForSchedule(jadwal);
    setModalTargetJadwal(jadwal);
    setModalExistingRecord(existing || null);

    const jp = existing?.jumlahJam || getScheduleJP(jadwal);
    setFormJumlahJam(jp);
    setFormMateriPokok(existing?.materiPokok || `KBM ${jadwal.namaMapel}`);
    setFormKegiatanKBM(existing?.kegiatanKBM || `Pembelajaran di ${jadwal.ruang || 'kelas'}.`);
    setFormStatusKehadiran(existing?.statusKehadiran || 'Hadir Mengajar');
    setFormJumlahHadir(existing?.jumlahHadir ?? 34);
    setFormJumlahSakit(existing?.jumlahSakit ?? 0);
    setFormJumlahIzin(existing?.jumlahIzin ?? 0);
    setFormJumlahAlpa(existing?.jumlahAlpa ?? 0);
    setFormCatatan(existing?.catatanSiswa || '');
    setShowDetailModal(true);
  };

  // Submit Detail Modal
  const handleSubmitDetailModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTargetJadwal) return;

    const record: AbsenMengajarRecord = {
      id: modalExistingRecord ? modalExistingRecord.id : `absen-adm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      idJadwal: modalTargetJadwal.id,
      idGuru: modalTargetJadwal.idGuru,
      namaGuru: modalTargetJadwal.namaGuru,
      nipOrNis: usersList.find(u => u.id === modalTargetJadwal.idGuru)?.nipOrNis || '-',
      tanggal: selectedTanggal,
      hari: selectedHari as any,
      jamMulai: modalTargetJadwal.jamMulai,
      jamSelesai: modalTargetJadwal.jamSelesai,
      jamKe: `${formJumlahJam} JP (${modalTargetJadwal.jamMulai} - ${modalTargetJadwal.jamSelesai})`,
      jumlahJam: Number(formJumlahJam),
      idKelas: modalTargetJadwal.idKelas,
      namaKelas: modalTargetJadwal.namaKelas,
      idMapel: modalTargetJadwal.idMapel,
      namaMapel: modalTargetJadwal.namaMapel,
      materiPokok: formMateriPokok.trim(),
      kegiatanKBM: formKegiatanKBM.trim(),
      jumlahHadir: Number(formJumlahHadir),
      jumlahSakit: Number(formJumlahSakit),
      jumlahIzin: Number(formJumlahIzin),
      jumlahAlpa: Number(formJumlahAlpa),
      catatanSiswa: formCatatan.trim(),
      statusKehadiran: formStatusKehadiran,
      ruangKelas: modalTargetJadwal.ruang,
      fotoDokumentasiUrl: modalExistingRecord?.fotoDokumentasiUrl || '',
      createdAt: modalExistingRecord ? modalExistingRecord.createdAt : new Date().toISOString(),
      recordedBy: 'admin',
    };

    onSaveAbsenMengajar(record);
    setShowDetailModal(false);
    setNotification({
      text: `Berhasil menyimpan catatan jurnal & absen ${modalTargetJadwal.namaGuru} (${formJumlahJam} JP)!`,
      type: 'success',
    });
    setTimeout(() => setNotification(null), 3500);
  };

  // Delete attendance record with in-app confirmation modal
  const handleDeleteAttendance = (recId: string, title?: string, subtitle?: string) => {
    setRecordToDelete({
      id: recId,
      title: title || 'Hapus status kehadiran guru untuk sesi ini?',
      subtitle: subtitle || 'Status jadwal akan kembali menjadi "Belum Diabsen".'
    });
  };

  const handleConfirmDeleteRecord = () => {
    if (!recordToDelete) return;
    onDeleteAbsenMengajar(recordToDelete.id);
    const deletedId = recordToDelete.id;
    setRecordToDelete(null);
    setNotification({
      text: 'Catatan presensi/jurnal berhasil dihapus secara permanen.',
      type: 'info',
    });
    setTimeout(() => setNotification(null), 3000);
  };

  // Statistics for today's schedules
  const statsToday = useMemo(() => {
    const totalSesi = daySchedules.length;
    let hadirCount = 0;
    let izinCount = 0;
    let sakitCount = 0;
    let alpaCount = 0;
    let dinasLuarCount = 0;
    let belumCount = 0;
    let totalJPHadir = 0;

    daySchedules.forEach(j => {
      const rec = getRecordForSchedule(j);
      if (!rec) {
        belumCount++;
      } else {
        const jp = rec.jumlahJam || getScheduleJP(j);
        if (rec.statusKehadiran === 'Hadir Mengajar') {
          hadirCount++;
          totalJPHadir += jp;
        } else if (rec.statusKehadiran === 'Izin (Tugas Terlampir)') {
          izinCount++;
        } else if (rec.statusKehadiran === 'Sakit (Tugas Terlampir)') {
          sakitCount++;
        } else if (rec.statusKehadiran === 'Dinas Luar') {
          dinasLuarCount++;
          totalJPHadir += jp;
        } else if (rec.statusKehadiran === 'Alpa / Tidak Hadir') {
          alpaCount++;
        }
      }
    });

    const totalTerabsen = totalSesi - belumCount;
    const keterlaksanaan = totalSesi > 0 ? Math.round((totalTerabsen / totalSesi) * 100) : 0;

    return {
      totalSesi,
      hadirCount,
      izinCount,
      sakitCount,
      alpaCount,
      dinasLuarCount,
      belumCount,
      totalJPHadir,
      keterlaksanaan,
    };
  }, [daySchedules, recordsByJadwalOrSlot]);

  // Rekapitulasi Jam Mengajar Tiap Guru & Tiap Kelas (Berdasarkan catatan absen mengajar bulan berjalan)
  const rekapGuruPerKelas = useMemo(() => {
    type GuruSummary = {
      idGuru: string;
      namaGuru: string;
      nipOrNis: string;
      totalSesi: number;
      totalJP: number;
      totalHadir: number;
      totalIzin: number;
      totalSakit: number;
      totalAlpa: number;
      breakdownKelas: { [namaKelas: string]: number }; // namaKelas -> total JP
    };

    const map = new Map<string, GuruSummary>();

    // Initial setup from teachers list
    teachersList.forEach(g => {
      map.set(g.id, {
        idGuru: g.id,
        namaGuru: g.nama,
        nipOrNis: g.nipOrNis || '-',
        totalSesi: 0,
        totalJP: 0,
        totalHadir: 0,
        totalIzin: 0,
        totalSakit: 0,
        totalAlpa: 0,
        breakdownKelas: {},
      });
    });

    // Populate from all absenMengajarList
    absenMengajarList.forEach(rec => {
      let entry = map.get(rec.idGuru);
      if (!entry) {
        entry = {
          idGuru: rec.idGuru,
          namaGuru: rec.namaGuru,
          nipOrNis: rec.nipOrNis || '-',
          totalSesi: 0,
          totalJP: 0,
          totalHadir: 0,
          totalIzin: 0,
          totalSakit: 0,
          totalAlpa: 0,
          breakdownKelas: {},
        };
        map.set(rec.idGuru, entry);
      }

      entry.totalSesi += 1;
      const jp = rec.jumlahJam || 2;

      if (rec.statusKehadiran === 'Hadir Mengajar' || rec.statusKehadiran === 'Dinas Luar') {
        entry.totalHadir += 1;
        entry.totalJP += jp;
        entry.breakdownKelas[rec.namaKelas] = (entry.breakdownKelas[rec.namaKelas] || 0) + jp;
      } else if (rec.statusKehadiran === 'Izin (Tugas Terlampir)') {
        entry.totalIzin += 1;
      } else if (rec.statusKehadiran === 'Sakit (Tugas Terlampir)') {
        entry.totalSakit += 1;
      } else if (rec.statusKehadiran === 'Alpa / Tidak Hadir') {
        entry.totalAlpa += 1;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalJP - a.totalJP);
  }, [teachersList, absenMengajarList]);

  return (
    <div className="space-y-6">
      {/* NOTIFICATION TOAST */}
      {notification && (
        <div className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-semibold shadow-md animate-fadeIn ${
          notification.type === 'success' 
            ? 'bg-emerald-500 text-slate-950 font-bold border border-emerald-400' 
            : notification.type === 'info'
              ? 'bg-sky-500 text-white font-bold border border-sky-400'
              : 'bg-rose-500 text-white font-bold border border-rose-400'
        }`}>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-current opacity-80 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TOP HEADER & ACTION BAR */}
      <div className="bg-gradient-to-r from-teal-800 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold border border-teal-400/30">
            <CalendarCheck className="w-4 h-4 text-teal-300" />
            <span>KENDALI ABSENSI & JAM MENGAJAR GURU</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            Presensi Guru Sesuai Jadwal & Alokasi Jam (JP) Tiap Kelas
          </h1>
          <p className="text-xs sm:text-sm text-teal-100/80 max-w-2xl">
            Admin dapat langsung mengabsen kehadiran seluruh dewan guru per jam pelajaran (JP) sesuai rombongan belajar tiap kelas, dengan 1-klik absen cepat atau rincian materi KBM.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 z-10">
          <button
            type="button"
            onClick={() => downloadTemplateJadwalExcel(kelasList, mapelList, usersList)}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-2 border border-white/20 backdrop-blur-xs transition-all shadow-sm cursor-pointer"
            title="Unduh format template jadwal pelajaran Microsoft Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
            <span>Unduh Template Jadwal (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={() => exportAbsenMengajarToExcel(absenMengajarList, schoolInfo.nama, selectedTanggal)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer"
            title="Ekspor seluruh rekap absen guru ke Excel biasa (.xlsx)"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Rekap Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPrintModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-200 text-xs font-bold flex items-center gap-2 border border-teal-500/30 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-teal-400" />
            <span>Cetak Dokumen (KOP)</span>
          </button>
        </div>
      </div>

      {/* VIEW SUB-TAB TOGGLES */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 flex flex-wrap gap-2 shadow-xs justify-between items-center">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setViewMode('jadwal_harian')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              viewMode === 'jadwal_harian'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Absen Harian Sesuai Jadwal ({daySchedules.length} Sesi Terjadwal)</span>
          </button>

          <button
            onClick={() => setViewMode('rekap_jam')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              viewMode === 'rekap_jam'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Rekapitulasi Jam Mengajar Tiap Guru & Kelas</span>
          </button>

          <button
            onClick={() => setViewMode('semua_riwayat')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              viewMode === 'semua_riwayat'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Semua Riwayat Jurnal Guru ({absenMengajarList.length} Catatan)</span>
          </button>
        </div>

        {/* Quick Batch Hadir Button */}
        {viewMode === 'jadwal_harian' && statsToday.belumCount > 0 && !isWeekendSelected && (
          <button
            type="button"
            onClick={handleBatchMarkAllHadir}
            className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="Tandai seluruh sesi jadwal hari ini yang belum diabsen langsung menjadi Hadir Mengajar"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Absen Cepat Semua Jadwal Hari Ini ({statsToday.belumCount} Sesi)</span>
          </button>
        )}
      </div>

      {/* KPI STATS BAR (FOR JADWAL HARIAN) */}
      {viewMode === 'jadwal_harian' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <div className="text-[11px] font-bold text-slate-500 uppercase">Jadwal Sesi</div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{statsToday.totalSesi}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{selectedHari}, {selectedTanggal}</div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-xs bg-emerald-50/30">
            <div className="text-[11px] font-bold text-emerald-700 uppercase">Hadir Mengajar</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-800 mt-1">{statsToday.hadirCount}</div>
            <div className="text-[10px] text-emerald-600 mt-0.5">Total: {statsToday.totalJPHadir} Jam Pelajaran (JP)</div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-xs bg-amber-50/30">
            <div className="text-[11px] font-bold text-amber-700 uppercase">Izin / Tugas</div>
            <div className="text-xl sm:text-2xl font-black text-amber-800 mt-1">{statsToday.izinCount}</div>
            <div className="text-[10px] text-amber-600 mt-0.5">Tugas terlampir</div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-sky-200 shadow-xs bg-sky-50/30">
            <div className="text-[11px] font-bold text-sky-700 uppercase">Sakit</div>
            <div className="text-xl sm:text-2xl font-black text-sky-800 mt-1">{statsToday.sakitCount}</div>
            <div className="text-[10px] text-sky-600 mt-0.5">Surat dokter / tugas</div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-rose-200 shadow-xs bg-rose-50/30">
            <div className="text-[11px] font-bold text-rose-700 uppercase">Belum Diabsen</div>
            <div className="text-xl sm:text-2xl font-black text-rose-800 mt-1">{statsToday.belumCount}</div>
            <div className="text-[10px] text-rose-600 mt-0.5">Menunggu konfirmasi</div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-indigo-200 shadow-xs bg-indigo-50/30">
            <div className="text-[11px] font-bold text-indigo-700 uppercase">Keterlaksanaan</div>
            <div className="text-xl sm:text-2xl font-black text-indigo-800 mt-1">{statsToday.keterlaksanaan}%</div>
            <div className="text-[10px] text-indigo-600 mt-0.5">{statsToday.totalSesi - statsToday.belumCount}/{statsToday.totalSesi} Sesi</div>
          </div>
        </div>
      )}

      {/* FILTER & DATE CONTROLLER BAR */}
      {viewMode === 'jadwal_harian' && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
          {/* BANNER HARI LIBUR (AKHIR PEKAN ATAU LIBUR NASIONAL) */}
          {isWeekendSelected && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start sm:items-center gap-3 text-amber-900 shadow-xs">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
              <div className="flex-1">
                <div className="font-bold text-xs uppercase tracking-wide text-amber-800 flex items-center gap-2">
                  <span>{getAlasanHariTidakEfektif(selectedTanggal) || 'Hari Libur'} ({selectedHari}, {selectedTanggal}) - Otomatis Tidak Ada Absen</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-800 text-[10px] font-black uppercase">Libur</span>
                </div>
                <p className="text-xs text-amber-700 mt-0.5">
                  Sesuai kalender akademik SMK Bakti Putra Mandiri, hari libur akhir pekan dan tanggal merah hari libur nasional otomatis ditiadakan dari kegiatan KBM serta presensi mengajar guru.
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              {/* Tanggal Picker */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <Calendar className="w-4 h-4 text-teal-600 shrink-0" />
                <span className="text-xs font-bold text-slate-700">Tanggal:</span>
                <input
                  type="date"
                  value={selectedTanggal}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-900 focus:outline-hidden cursor-pointer"
                />
              </div>

              {/* Hari Filter - Klik Hari Otomatis Ganti Tanggal */}
              <div className="flex flex-wrap items-center gap-1">
                {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map((h) => {
                  const isLibur = h === 'Sabtu' || h === 'Minggu';
                  const isSelected = selectedHari === h;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => handleDayChange(h)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        isSelected
                          ? isLibur
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-teal-700 text-white shadow-xs'
                          : isLibur
                            ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/80'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      title={isLibur ? `Hari ${h}: Libur Akhir Pekan (Otomatis Tidak Ada Absen)` : `Pilih Hari ${h} (Otomatis Menyesuaikan Tanggal)`}
                    >
                      <span>{h}</span>
                      {isLibur && <span className="text-[9px] opacity-80 font-normal">(Libur)</span>}
                    </button>
                  );
                })}
              </div>

              {/* Filter Rombel Kelas */}
              <select
                value={filterKelas}
                onChange={(e) => setFilterKelas(e.target.value)}
                className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
              >
                <option value="SEMUA">Semua Kelas / Rombel</option>
                {kelasList.map(k => (
                  <option key={k.id} value={k.id}>{k.namaKelas} ({k.jurusan})</option>
                ))}
              </select>

              {/* Filter Guru */}
              <select
                value={filterGuru}
                onChange={(e) => setFilterGuru(e.target.value)}
                className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
              >
                <option value="SEMUA">Semua Guru Pengampu</option>
                {teachersList.map(g => (
                  <option key={g.id} value={g.id}>{g.nama}</option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari guru, mapel, kelas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-teal-500/30"
              />
            </div>
          </div>
        </div>
      )}

      {/* 1. VIEW MODE: JADWAL HARIAN (SCHEDULE-BASED ATTENDANCE MATRIX) */}
      {viewMode === 'jadwal_harian' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-teal-600" />
                <span>Jadwal Pelajaran Hari {selectedHari}, Tanggal {selectedTanggal}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Daftar alokasi jam mengajar tiap kelas. Klik tombol di kolom <strong>"Aksi Cepat Absen"</strong> untuk mencatat kehadiran guru sesuai jumlah jamnya (JP).
              </p>
            </div>

            <div className="text-xs font-semibold text-slate-600">
              Menampilkan <strong>{daySchedules.length}</strong> sesi mata pelajaran
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-3.5 px-4">Jam KBM & Durasi (JP)</th>
                  <th className="py-3.5 px-4">Kelas & Rombel</th>
                  <th className="py-3.5 px-4">Mata Pelajaran</th>
                  <th className="py-3.5 px-4">Guru Pengampu</th>
                  <th className="py-3.5 px-4">Ruang Lab / Teori</th>
                  <th className="py-3.5 px-4 text-center">Status Kehadiran</th>
                  <th className="py-3.5 px-4 text-center min-w-[260px]">Aksi Cepat Absen (Admin)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {daySchedules.map((j) => {
                  const rec = getRecordForSchedule(j);
                  const scheduledJP = getScheduleJP(j);
                  const currentJP = rec?.jumlahJam || scheduledJP;
                  const isHadir = rec?.statusKehadiran === 'Hadir Mengajar';
                  const isIzin = rec?.statusKehadiran === 'Izin (Tugas Terlampir)';
                  const isSakit = rec?.statusKehadiran === 'Sakit (Tugas Terlampir)';
                  const isDinas = rec?.statusKehadiran === 'Dinas Luar';
                  const isAlpa = rec?.statusKehadiran === 'Alpa / Tidak Hadir';

                  return (
                    <tr 
                      key={j.id} 
                      className={`transition-colors ${
                        isHadir 
                          ? 'bg-emerald-50/20 hover:bg-emerald-50/40' 
                          : rec 
                            ? 'bg-amber-50/20 hover:bg-amber-50/40' 
                            : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Jam & JP */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-800 text-xs">
                          {normalizeExcelTime(j.jamMulai, '07:15')} - {normalizeExcelTime(j.jamSelesai, '08:45')}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-900 font-extrabold text-[11px]">
                            {currentJP} JP
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ({j.hari})
                          </span>
                        </div>
                      </td>

                      {/* Kelas */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-xs">{j.namaKelas}</div>
                        <div className="text-[10px] text-slate-400">
                          {kelasList.find(k => k.id === j.idKelas)?.jurusan || 'Kejuruan'}
                        </div>
                      </td>

                      {/* Mapel */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-xs">{j.namaMapel}</div>
                        {rec?.materiPokok && (
                          <div className="text-[10px] text-teal-700 line-clamp-1 mt-0.5" title={rec.materiPokok}>
                            📌 {rec.materiPokok}
                          </div>
                        )}
                      </td>

                      {/* Guru */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{j.namaGuru}</div>
                        <div className="text-[10px] font-mono text-slate-500">
                          NIP: {usersList.find(u => u.id === j.idGuru)?.nipOrNis || '-'}
                        </div>
                      </td>

                      {/* Ruang */}
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-medium text-[11px]">
                          {j.ruang || 'Lab / Teori'}
                        </span>
                      </td>

                      {/* Status Kehadiran Badge */}
                      <td className="py-3.5 px-4 text-center">
                        {rec ? (
                          <div className="space-y-1">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                              isHadir
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : isIzin
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : isSakit
                                    ? 'bg-sky-100 text-sky-800 border border-sky-300'
                                    : isDinas
                                      ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{rec.statusKehadiran} ({rec.jumlahJam || currentJP} JP)</span>
                            </span>
                            <div className="text-[10px] text-slate-400">
                              Dicatat oleh: <strong>{rec.recordedBy === 'admin' ? 'Admin' : 'Guru'}</strong>
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold border border-slate-200">
                            <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                            <span>Belum Diabsen</span>
                          </span>
                        )}
                      </td>

                      {/* Aksi Cepat Absen (1-Klik oleh Admin) */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                          {/* Tombol Cepat Hadir */}
                          <button
                            type="button"
                            onClick={() => handleQuickMarkAttendance(j, 'Hadir Mengajar', scheduledJP)}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                              isHadir
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                            }`}
                            title={`Tandai Hadir Mengajar (${scheduledJP} JP)`}
                          >
                            <Check className="w-3 h-3" />
                            <span>Hadir ({scheduledJP} JP)</span>
                          </button>

                          {/* Tombol Izin */}
                          <button
                            type="button"
                            onClick={() => handleQuickMarkAttendance(j, 'Izin (Tugas Terlampir)', scheduledJP)}
                            className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                              isIzin
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                            title="Tandai Izin dengan tugas terlampir"
                          >
                            Izin
                          </button>

                          {/* Tombol Sakit */}
                          <button
                            type="button"
                            onClick={() => handleQuickMarkAttendance(j, 'Sakit (Tugas Terlampir)', scheduledJP)}
                            className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                              isSakit
                                ? 'bg-sky-600 text-white shadow-xs'
                                : 'bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300'
                            }`}
                            title="Tandai Sakit"
                          >
                            Sakit
                          </button>

                          {/* Tombol Detail / Jurnal Lengkap */}
                          <button
                            type="button"
                            onClick={() => handleOpenDetailModal(j)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                            title="Ubah detail materi, catatan KBM & jumlah JP"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Tombol Reset/Hapus jika sudah diabsen */}
                          {rec && (
                            <button
                              type="button"
                              onClick={() => handleDeleteAttendance(rec.id, `Hapus presensi ${j.namaGuru}?`, `${j.namaKelas} • ${j.namaMapel}`)}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Hapus status kehadiran (reset belum diabsen)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {daySchedules.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      <div className="space-y-2">
                        <Clock className="w-8 h-8 mx-auto text-slate-300" />
                        <div className="font-semibold text-slate-600">Tidak ada jadwal pelajaran untuk kriteria filter ini.</div>
                        <p className="text-xs text-slate-400">
                          Pastikan hari "{selectedHari}" memiliki alokasi jadwal pelajaran di menu Jadwal KBM.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. VIEW MODE: REKAPITULASI JAM MENGAJAR TIAP GURU & KELAS */}
      {viewMode === 'rekap_jam' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-teal-600" />
                <span>Rekapitulasi Alokasi Jam Mengajar (JP) Tiap Guru & Rombel Kelas</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Akumulasi jam tatap muka KBM terlaksana tiap guru berdasarkan catatan absensi resmi.
              </p>
            </div>

            <button
              type="button"
              onClick={() => exportAbsenMengajarToExcel(absenMengajarList, schoolInfo.nama, 'Rekap_Jam')}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor Rekap Jam (.xlsx)</span>
            </button>
          </div>

          <div className="overflow-x-auto p-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-3.5 px-4">No.</th>
                  <th className="py-3.5 px-4">Nama Tenaga Pendidik (Guru)</th>
                  <th className="py-3.5 px-4">NIP / NUPTK</th>
                  <th className="py-3.5 px-4 text-center">Total Jam Mengajar (JP)</th>
                  <th className="py-3.5 px-4 text-center">Sesi Terlaksana</th>
                  <th className="py-3.5 px-4">Rincian Jam Per Kelas (Rombel)</th>
                  <th className="py-3.5 px-4 text-center">Izin / Sakit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rekapGuruPerKelas.map((g, idx) => (
                  <tr key={g.idGuru} className="hover:bg-teal-50/20 transition-colors">
                    <td className="py-3 px-4 text-slate-400 font-mono">{idx + 1}.</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{g.namaGuru}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{g.nipOrNis}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-3 py-1 rounded-xl bg-teal-100 text-teal-900 font-black text-sm">
                        {g.totalJP} JP
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-800">
                      {g.totalHadir} Sesi KBM
                    </td>
                    <td className="py-3 px-4">
                      {Object.keys(g.breakdownKelas).length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(g.breakdownKelas).map(([namaKelas, jp]) => (
                            <span 
                              key={namaKelas}
                              className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold"
                            >
                              {namaKelas}: <strong>{jp} JP</strong>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Belum ada jam tercatat</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-600">
                      {g.totalIzin + g.totalSakit > 0 ? (
                        <span className="text-amber-700 font-semibold">
                          Izin: {g.totalIzin} | Sakit: {g.totalSakit}
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-semibold">Nihil (100% Hadir)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. VIEW MODE: SEMUA RIWAYAT JURNAL MENGAJAR GURU */}
      {viewMode === 'semua_riwayat' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-teal-600" />
                <span>Semua Catatan Jurnal & Absensi Mengajar ({absenMengajarList.length})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Riwayat lengkap seluruh presensi dan jurnal materi guru di kelas.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {absenMengajarList.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowClearTemplateModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Bersihkan semua data template dan riwayat jurnal guru"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>Bersihkan Semua Data Jurnal</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => exportAbsenMengajarToExcel(absenMengajarList, schoolInfo.nama, 'Semua')}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Ekspor Semua (.xlsx)</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-3 px-4">Tanggal & Jam</th>
                  <th className="py-3 px-4">Guru Pengampu</th>
                  <th className="py-3 px-4">Kelas & Mapel</th>
                  <th className="py-3 px-4">Pokok Materi KBM</th>
                  <th className="py-3 px-4 text-center">Durasi (JP)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {absenMengajarList.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono">
                      <div className="font-bold text-slate-800">{rec.tanggal}</div>
                      <div className="text-[10px] text-slate-500">{rec.hari}, {rec.jamMulai} - {rec.jamSelesai}</div>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{rec.namaGuru}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{rec.namaKelas}</div>
                      <div className="text-[10px] text-slate-500">{rec.namaMapel}</div>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-medium text-slate-800 line-clamp-1">{rec.materiPokok}</div>
                      {rec.catatanSiswa && (
                        <div className="text-[10px] text-slate-400 line-clamp-1 italic">{rec.catatanSiswa}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-1 rounded-md bg-teal-100 text-teal-900 font-bold text-xs">
                        {rec.jumlahJam || 2} JP
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        rec.statusKehadiran === 'Hadir Mengajar'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {rec.statusKehadiran}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteAttendance(rec.id, `Hapus jurnal ${rec.namaGuru}?`, `${rec.namaKelas} • ${rec.namaMapel} (Tanggal ${rec.tanggal})`)}
                        className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Hapus Catatan Jurnal Mengajar Ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DETAIL MODAL: ISI AGENDA LENGKAP & EDIT JP */}
      {showDetailModal && modalTargetJadwal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Detail Presensi & Jurnal Mengajar
                  </h3>
                  <p className="text-xs text-slate-500">
                    {modalTargetJadwal.namaKelas} • {modalTargetJadwal.namaMapel} • {modalTargetJadwal.namaGuru}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitDetailModal} className="space-y-4 text-xs">
              {/* Jumlah Jam (JP) & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Alokasi Jumlah Jam Pelajaran (JP) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={formJumlahJam}
                    onChange={(e) => setFormJumlahJam(Number(e.target.value))}
                    required
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-teal-900"
                  />
                  <span className="text-[10px] text-slate-400">Contoh: 2 JP, 3 JP, 4 JP</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Status Kehadiran Guru <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formStatusKehadiran}
                    onChange={(e) => setFormStatusKehadiran(e.target.value as any)}
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="Hadir Mengajar">Hadir Mengajar</option>
                    <option value="Izin (Tugas Terlampir)">Izin (Tugas Terlampir)</option>
                    <option value="Sakit (Tugas Terlampir)">Sakit (Tugas Terlampir)</option>
                    <option value="Dinas Luar">Dinas Luar</option>
                    <option value="Alpa / Tidak Hadir">Alpa / Tidak Hadir</option>
                  </select>
                </div>
              </div>

              {/* Pokok Bahasan */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Pokok Bahasan / Materi Pembelajaran (TP / Bab) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formMateriPokok}
                  onChange={(e) => setFormMateriPokok(e.target.value)}
                  placeholder="Contoh: Praktikum Pembuatan Sediaan Farmasi..."
                  required
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                />
              </div>

              {/* Uraian Kegiatan */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Uraian Kegiatan Pembelajaran / Metode (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={formKegiatanKBM}
                  onChange={(e) => setFormKegiatanKBM(e.target.value)}
                  placeholder="Penjelasan singkat aktivitas pembelajaran di kelas..."
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              {/* Rekap Siswa */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="block font-bold text-slate-800">
                  Kehadiran Siswa di Kelas Saat Jam Pelajaran Ini:
                </span>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[11px] text-emerald-800 font-bold mb-0.5">Hadir</label>
                    <input
                      type="number"
                      min={0}
                      value={formJumlahHadir}
                      onChange={(e) => setFormJumlahHadir(Number(e.target.value))}
                      className="w-full py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-sky-800 font-bold mb-0.5">Sakit</label>
                    <input
                      type="number"
                      min={0}
                      value={formJumlahSakit}
                      onChange={(e) => setFormJumlahSakit(Number(e.target.value))}
                      className="w-full py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-amber-800 font-bold mb-0.5">Izin</label>
                    <input
                      type="number"
                      min={0}
                      value={formJumlahIzin}
                      onChange={(e) => setFormJumlahIzin(Number(e.target.value))}
                      className="w-full py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-rose-800 font-bold mb-0.5">Alpa</label>
                    <input
                      type="number"
                      min={0}
                      value={formJumlahAlpa}
                      onChange={(e) => setFormJumlahAlpa(Number(e.target.value))}
                      className="w-full py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-center font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Catatan Tambahan */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Catatan Tambahan / Kendala Kelas (Opsional)
                </label>
                <input
                  type="text"
                  value={formCatatan}
                  onChange={(e) => setFormCatatan(e.target.value)}
                  placeholder="Catatan kendala, proyektor, atau siswa yang perlu diperhatikan..."
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Presensi ({formJumlahJam} JP)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT PREVIEW MODAL */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-4 my-8 max-h-[95vh] overflow-y-auto border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 no-print">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-teal-700" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Cetak Rekap Presensi & Alokasi Jam Mengajar Guru Resmi
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('printable-rekap-guru-doc');
                    if (el) {
                      printDocumentArea(el, {
                        title: 'Rekap Presensi & Alokasi Mengajar Guru',
                        paperSize: 'A4',
                        orientation: 'landscape',
                        margin: 'sempit',
                      });
                    } else {
                      window.print();
                    }
                  }}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                  title="Cetak lembar dokumen rekap mengajar saja ke printer/PDF"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Dokumen Sekarang</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Container */}
            <div id="printable-rekap-guru-doc" className="printable-document space-y-4 p-4 text-black bg-white">
              <KopSuratView schoolInfo={schoolInfo} />

              <div className="text-center space-y-1 my-3">
                <h2 className="text-base font-black uppercase tracking-wide">
                  REKAPITULASI AGENDA & PRESENSI MENGAJAR GURU (KBM)
                </h2>
                <p className="text-xs text-slate-600">
                  Hari: <strong>{selectedHari}</strong> • Tanggal: <strong>{selectedTanggal}</strong> • Semester: <strong>{schoolInfo.semesterPembelajaran}</strong> • T.A. <strong>{schoolInfo.tahunAjaranPembelajaran}</strong>
                </p>
              </div>

              <table className="w-full text-left text-xs border border-slate-400 border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-400">
                    <th className="py-2 px-3 border-r border-slate-400">No.</th>
                    <th className="py-2 px-3 border-r border-slate-400">Jam KBM</th>
                    <th className="py-2 px-3 border-r border-slate-400">Kelas</th>
                    <th className="py-2 px-3 border-r border-slate-400">Mata Pelajaran</th>
                    <th className="py-2 px-3 border-r border-slate-400">Guru Pengampu</th>
                    <th className="py-2 px-3 border-r border-slate-400 text-center">Durasi</th>
                    <th className="py-2 px-3 border-r border-slate-400 text-center">Status</th>
                    <th className="py-2 px-3">Materi Pokok / Agenda KBM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {daySchedules.map((j, idx) => {
                    const rec = getRecordForSchedule(j);
                    const jp = rec?.jumlahJam || getScheduleJP(j);

                    return (
                      <tr key={j.id} className="border-b border-slate-300">
                        <td className="py-2 px-3 border-r border-slate-300 text-center">{idx + 1}.</td>
                        <td className="py-2 px-3 border-r border-slate-300 font-mono text-[11px] whitespace-nowrap">
                          {normalizeExcelTime(j.jamMulai, '07:15')} - {normalizeExcelTime(j.jamSelesai, '08:45')}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-300 font-bold">{j.namaKelas}</td>
                        <td className="py-2 px-3 border-r border-slate-300">{j.namaMapel}</td>
                        <td className="py-2 px-3 border-r border-slate-300 font-semibold">{j.namaGuru}</td>
                        <td className="py-2 px-3 border-r border-slate-300 text-center font-bold">{jp} JP</td>
                        <td className="py-2 px-3 border-r border-slate-300 text-center font-bold">
                          {rec ? rec.statusKehadiran : 'Belum Diabsen'}
                        </td>
                        <td className="py-2 px-3 text-[11px]">
                          {rec?.materiPokok || `KBM ${j.namaMapel}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Tanda Tangan */}
              <div className="pt-6 grid grid-cols-2 text-center text-xs">
                <div>
                  <p>Mengetahui,</p>
                  <p className="font-bold">Kepala Sekolah</p>
                  <div className="h-16"></div>
                  <p className="font-bold underline">{schoolInfo.kepalaSekolah}</p>
                  <p className="text-[11px] text-slate-600">NIP: {schoolInfo.nipKepalaSekolah || '-'}</p>
                </div>

                <div>
                  <p>Bogor, {selectedTanggal}</p>
                  <p className="font-bold">Koordinator Kurikulum / Admin</p>
                  <div className="h-16"></div>
                  <p className="font-bold underline">{currentUser.nama}</p>
                  <p className="text-[11px] text-slate-600">NIP: {currentUser.nipOrNis || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS JURNAL TUNGGAL (In-App Modal, Pengganti window.confirm) */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-scaleUp">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Konfirmasi Hapus Jurnal Mengajar</h3>
              <p className="text-xs text-slate-600 mt-1 font-semibold">
                {recordToDelete.title}
              </p>
              {recordToDelete.subtitle && (
                <p className="text-xs text-slate-500 mt-1">
                  {recordToDelete.subtitle}
                </p>
              )}
              <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 mt-3">
                Catatan presensi & jurnal akan dihapus secara permanen dari basis data, dan status jadwal mengajar ini akan kembali menjadi <strong>Belum Diabsen</strong>.
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
                onClick={handleConfirmDeleteRecord}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                Ya, Hapus Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI BERSIHKAN SEMUA DATA TEMPLATE & RIWAYAT JURNAL */}
      {showClearTemplateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-rose-200 animate-scaleUp">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Bersihkan Riwayat Jurnal Guru</h3>
              <p className="text-xs text-slate-600 mt-1">
                Apakah Anda yakin ingin menghapus seluruh data riwayat jurnal & presensi mengajar guru ({absenMengajarList.length} catatan)?
              </p>
              <p className="text-[11px] text-rose-800 bg-rose-50 p-3 rounded-xl border border-rose-200 mt-3">
                Semua data template bawaan dan riwayat mengajar tersimpan akan dikosongkan secara permanen dari Cloud Firestore dan penyimpanan lokal.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowClearTemplateModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onClearAllAbsenMengajar) {
                    onClearAllAbsenMengajar();
                  } else {
                    absenMengajarList.forEach(rec => onDeleteAbsenMengajar(rec.id));
                  }
                  setShowClearTemplateModal(false);
                  setNotification({
                    text: 'Seluruh riwayat jurnal mengajar dan data template berhasil dibersihkan!',
                    type: 'info',
                  });
                  setTimeout(() => setNotification(null), 3000);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                Ya, Bersihkan Semua
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
