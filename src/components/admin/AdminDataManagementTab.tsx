import React, { useState } from 'react';
import { 
  User, 
  Kelas, 
  Mapel, 
  JadwalPelajaran, 
  JadwalUjianItem,
  NilaiMapelSiswa, 
  NilaiEkskulSiswa,
  AbsensiRecord, 
  FormulirPPDB, 
  Ekskul,
  PaketUjian,
  SchoolInfo 
} from '../../types';
import { 
  Database, 
  Download, 
  Upload, 
  RotateCcw, 
  FileSpreadsheet, 
  Users, 
  GraduationCap, 
  BookOpen, 
  CalendarDays, 
  Award, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  ShieldAlert,
  Archive,
  Trash2,
  Sparkles,
  RefreshCw,
  Cloud,
  Smartphone,
  Laptop,
  Check,
  ShieldCheck
} from 'lucide-react';
import { exportPPDBToCSV, exportPPDBToExcel } from '../../utils/exportPPDB';
import {
  downloadTemplateJadwalExcel,
  downloadTemplateSiswaExcel,
  downloadTemplateGuruExcel,
  downloadTemplateMapelExcel,
  downloadTemplateNilaiExcel,
  exportJadwalToExcel,
  saveWorkbookAsExcel,
  readSpreadsheetFile,
  extractJadwalTimes,
  normalizeExcelTime
} from '../../utils/excelHelper';
import * as XLSX from 'xlsx';
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from '../../utils/storage';
import { isQuotaExhausted, isQuotaError, markQuotaExhausted } from '../../utils/firebaseSync';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export interface InternalBackupSnapshot {
  id: string;
  timestamp: string;
  title: string;
  stats: {
    siswa: number;
    guru: number;
    mapel: number;
    kelas: number;
    jadwal: number;
    nilai: number;
    absensi: number;
    ppdb: number;
  };
  payload: any;
}

interface AdminDataManagementTabProps {
  usersList: User[];
  kelasList: Kelas[];
  mapelList: Mapel[];
  jadwalPelajaranList: JadwalPelajaran[];
  jadwalUjianList?: JadwalUjianItem[];
  nilaiList: NilaiMapelSiswa[];
  nilaiEkskulList?: NilaiEkskulSiswa[];
  absensiList: AbsensiRecord[];
  formulirList: FormulirPPDB[];
  ekskulList: Ekskul[];
  ujianList?: PaketUjian[];
  schoolInfo: SchoolInfo;
  onImportUsers: (newUsers: User[]) => void;
  onImportMapel: (newMapel: Mapel[]) => void;
  onImportJadwal: (newJadwal: JadwalPelajaran[], mode?: 'update' | 'replace' | 'append') => void;
  onClearAllJadwalPelajaran?: () => void;
  onDeduplicateJadwalPelajaran?: () => number;
  onImportNilai: (newNilai: NilaiMapelSiswa[]) => void;
  onResetDatabase: () => void;
  onResetNilai: () => void;
  onResetAbsensi: () => void;
  onResetCalonSiswa: () => void;
  onClearTemplateStudents?: () => void;
  onRestoreAllData: (backupData: any) => void | Promise<void>;
  onSyncAllToCloud?: () => Promise<{ success: boolean; count: number; error?: string }>;
  onPullAllFromCloud?: () => Promise<{ success: boolean; count: number; error?: string }>;
}

export const AdminDataManagementTab: React.FC<AdminDataManagementTabProps> = ({
  usersList,
  kelasList,
  mapelList,
  jadwalPelajaranList,
  jadwalUjianList = [],
  nilaiList,
  nilaiEkskulList = [],
  absensiList,
  formulirList,
  ekskulList,
  ujianList = [],
  schoolInfo,
  onImportUsers,
  onImportMapel,
  onImportJadwal,
  onClearAllJadwalPelajaran,
  onDeduplicateJadwalPelajaran,
  onImportNilai,
  onResetDatabase,
  onResetNilai,
  onResetAbsensi,
  onResetCalonSiswa,
  onClearTemplateStudents,
  onRestoreAllData,
  onSyncAllToCloud,
  onPullAllFromCloud,
}) => {
  const [activeSection, setActiveSection] = useState<'cloud_sync' | 'import_export' | 'backup' | 'reset'>('cloud_sync');
  const [notification, setNotification] = useState<string | null>(null);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [isPullingCloud, setIsPullingCloud] = useState(false);
  const [cloudSyncResult, setCloudSyncResult] = useState<{ success: boolean; msg: string } | null>(null);

  const [internalBackups, setInternalBackups] = useState<InternalBackupSnapshot[]>(() => 
    loadFromStorage<InternalBackupSnapshot[]>(STORAGE_KEYS.INTERNAL_BACKUPS, [])
  );
  const [snapshotLabel, setSnapshotLabel] = useState('');
  const [isSavingSnapshot, setIsSavingSnapshot] = useState(false);

  // Sync internal backups from Firestore on mount
  React.useEffect(() => {
    const fetchCloudBackups = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'internal_backups'));
        if (snap.exists()) {
          const remoteList = snap.data()?.backups as InternalBackupSnapshot[];
          if (Array.isArray(remoteList) && remoteList.length > 0) {
            setInternalBackups(prev => {
              const map = new Map<string, InternalBackupSnapshot>();
              prev.forEach(b => map.set(b.id, b));
              remoteList.forEach(b => map.set(b.id, b));
              const merged = Array.from(map.values()).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
              saveToStorage(STORAGE_KEYS.INTERNAL_BACKUPS, merged);
              return merged;
            });
          }
        }
      } catch (err) {
        console.warn('Notice loading internal backups from cloud:', err);
      }
    };
    fetchCloudBackups();
  }, []);

  // In-app modal states replacing window.confirm / alert
  const [pendingRestore, setPendingRestore] = useState<{
    payload: any;
    fileName: string;
    countSiswa: number;
    countGuru: number;
    countMapel: number;
    countKelas: number;
    countJadwal: number;
    countNilai: number;
    countAbsensi?: number;
    countPPDB?: number;
    hasSchoolInfo: boolean;
  } | null>(null);
  const [restoreSuccessData, setRestoreSuccessData] = useState<{
    fileName: string;
    countSiswa: number;
    countGuru: number;
    countMapel: number;
    countKelas: number;
    countJadwal: number;
    countNilai: number;
    countAbsensi?: number;
    countPPDB?: number;
    hasSchoolInfo: boolean;
  } | null>(null);
  const [restoreErrorModal, setRestoreErrorModal] = useState<string | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [resetConfirmAction, setResetConfirmAction] = useState<'calon' | 'nilai' | 'absensi' | 'template_siswa' | null>(null);

  const handleTriggerCloudSync = async () => {
    if (!onSyncAllToCloud) return;
    setIsSyncingCloud(true);
    setCloudSyncResult(null);
    try {
      const res = await onSyncAllToCloud();
      if (res.success) {
        setCloudSyncResult({
          success: true,
          msg: `Berhasil! ${res.count} data berhasil disinkronkan ke Cloud Firestore. Sekarang data sudah terbarui di HP, tablet, dan komputer lain!`
        });
      } else {
        setCloudSyncResult({
          success: false,
          msg: `Sinkronisasi terhambat: ${res.error || 'Silakan coba beberapa saat lagi'}. Data lokal tetap tersimpan.`
        });
      }
    } catch (e: any) {
      setCloudSyncResult({
        success: false,
        msg: `Error sinkronisasi: ${e.message}`
      });
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handleTriggerCloudPull = async () => {
    if (!onPullAllFromCloud) return;
    setIsPullingCloud(true);
    setCloudSyncResult(null);
    try {
      const res = await onPullAllFromCloud();
      if (res.success) {
        if (res.count === 0) {
          setCloudSyncResult({
            success: true,
            msg: `Cloud Firestore saat ini masih kosong (0 data). Jika Anda memiliki berkas cadangan, silakan gunakan tombol 'Pulihkan Cadangan' atau klik 'Kirim Semua Data ke Cloud' untuk mengunggah data saat ini ke server.`
          });
        } else {
          setCloudSyncResult({
            success: true,
            msg: `Berhasil mengambil data terbaru dari Cloud Firestore! Sebanyak ${res.count} data master (siswa, guru, mapel, jadwal, dll.) telah dimuat dan disinkronkan ke perangkat ini.`
          });
        }
      } else {
        setCloudSyncResult({
          success: false,
          msg: `Gagal mengambil data dari cloud: ${res.error || 'Silakan coba lagi'}`
        });
      }
    } catch (e: any) {
      setCloudSyncResult({
        success: false,
        msg: `Error koneksi cloud: ${e.message}`
      });
    } finally {
      setIsPullingCloud(false);
    }
  };

  // Backup checkboxes
  const [backupOptions, setBackupOptions] = useState({
    siswa: true,
    guru: true,
    mapel: true,
    jadwal: true,
    nilai: true,
    absensi: true,
    ppdb: true,
    ekskul: true,
    schoolInfo: true,
  });

  const [confirmResetText, setConfirmResetText] = useState('');
  const [showFullResetModal, setShowFullResetModal] = useState(false);

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Helper download file (attaches link to DOM and revokes asynchronously to prevent 0-byte downloads)
  const downloadJson = (data: any, filename: string) => {
    try {
      if (!data) {
        alert('Data cadangan kosong atau tidak valid.');
        return;
      }
      const jsonStr = JSON.stringify(data, null, 2);
      if (!jsonStr || jsonStr.trim() === '' || jsonStr.length < 5) {
        alert('Data cadangan tidak memiliki konten yang cukup.');
        return;
      }
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.setAttribute('download', filename);
      a.href = url;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try {
          if (document.body.contains(a)) {
            document.body.removeChild(a);
          }
          URL.revokeObjectURL(url);
        } catch (_) {}
      }, 30000);
    } catch (err: any) {
      alert(`Gagal mengunduh berkas JSON: ${err?.message || err}`);
    }
  };

  const downloadCsv = (csvContent: string, filename: string) => {
    try {
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try {
          if (document.body.contains(a)) {
            document.body.removeChild(a);
          }
          URL.revokeObjectURL(url);
        } catch (_) {}
      }, 2000);
    } catch (err: any) {
      alert(`Gagal mengunduh berkas CSV: ${err?.message || err}`);
    }
  };

  // ===================== EXPORT HANDLERS =====================
  const handleExportSiswa = (format: 'json' | 'csv' | 'excel') => {
    const siswaData = usersList.filter(u => u.role === 'siswa');
    if (format === 'json') {
      downloadJson(siswaData, `DATA_SISWA_BPM_${new Date().toISOString().split('T')[0]}.json`);
    } else if (format === 'excel') {
      const wb = XLSX.utils.book_new();
      const headers = ['NIPD', 'NISN', 'Nama Siswa', 'Kelas', 'Jenis Kelamin', 'Status Aktif'];
      const rows = siswaData.map(s => [
        s.nipd || s.nipOrNis,
        s.nisn || s.username,
        s.nama,
        s.kelas || s.namaKelas || '',
        s.jenisKelamin || 'Laki-laki',
        s.statusAktif !== false ? 'Aktif' : 'Nonaktif',
      ]);
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws['!cols'] = [{ wch: 15 }, { wch: 16 }, { wch: 30 }, { wch: 20 }, { wch: 16 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa');
      saveWorkbookAsExcel(wb, `DATA_SISWA_BPM_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else {
      const header = 'NIPD,NISN,Nama Siswa,Kelas,Jenis Kelamin,Status Aktif\n';
      const rows = siswaData.map(s => 
        `"${s.nipd || s.nipOrNis}","${s.nisn || s.username}","${s.nama}","${s.kelas || s.namaKelas || ''}","${s.jenisKelamin || 'Laki-laki'}","${s.statusAktif !== false ? 'Aktif' : 'Nonaktif'}"`
      ).join('\n');
      downloadCsv(header + rows, `DATA_SISWA_BPM_${new Date().toISOString().split('T')[0]}.csv`);
    }
    notify(`Berhasil mengekspor data ${siswaData.length} siswa!`);
  };

  const handleExportGuru = (format: 'json' | 'csv' | 'excel') => {
    const guruData = usersList.filter(u => u.role === 'guru' || u.role === 'walas');
    if (format === 'json') {
      downloadJson(guruData, `DATA_GURU_BPM_${new Date().toISOString().split('T')[0]}.json`);
    } else if (format === 'excel') {
      const wb = XLSX.utils.book_new();
      const headers = ['NIP', 'Nama Guru', 'Gelar', 'Peran', 'Jurusan', 'Walas Kelas', 'No HP', 'Email', 'Jenis Kelamin', 'Status Aktif'];
      const rows = guruData.map(g => [
        g.nipOrNis,
        g.nama,
        g.gelar || '',
        g.role,
        g.jurusan || 'Umum',
        g.walasNamaKelas || '',
        g.telepon || '',
        g.email || '',
        g.jenisKelamin || 'Laki-laki',
        g.statusAktif !== false ? 'Aktif' : 'Nonaktif',
      ]);
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws['!cols'] = [{ wch: 22 }, { wch: 28 }, { wch: 10 }, { wch: 12 }, { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 25 }, { wch: 15 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Data Guru');
      saveWorkbookAsExcel(wb, `DATA_GURU_BPM_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else {
      const header = 'NIP,Nama Guru,Gelar,Peran,Jurusan,No HP,Email,Status Aktif\n';
      const rows = guruData.map(g => 
        `"${g.nipOrNis}","${g.nama}","${g.gelar || ''}","${g.role}","${g.jurusan || 'Umum'}","${g.telepon || ''}","${g.email || ''}","${g.statusAktif !== false ? 'Aktif' : 'Nonaktif'}"`
      ).join('\n');
      downloadCsv(header + rows, `DATA_GURU_BPM_${new Date().toISOString().split('T')[0]}.csv`);
    }
    notify(`Berhasil mengekspor data ${guruData.length} tenaga pendidik!`);
  };

  const handleExportMapel = (format: 'json' | 'csv' | 'excel') => {
    if (format === 'json') {
      downloadJson(mapelList, `DATA_MAPEL_BPM_${new Date().toISOString().split('T')[0]}.json`);
    } else if (format === 'excel') {
      const wb = XLSX.utils.book_new();
      const headers = ['Kode Mapel', 'Nama Mata Pelajaran', 'Kelompok', 'Jurusan', 'Tingkat', 'Jam Per Minggu'];
      const rows = mapelList.map(m => [
        m.kode,
        m.namaMapel,
        m.kelompok || '',
        m.jurusan || 'Umum',
        m.tingkat || 'Semua',
        m.jamPerMinggu || 3,
      ]);
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws['!cols'] = [{ wch: 15 }, { wch: 32 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Data Mapel');
      saveWorkbookAsExcel(wb, `DATA_MAPEL_BPM_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else {
      const header = 'Kode Mapel,Nama Mata Pelajaran,Kelompok,Jurusan,Tingkat,Jam/Minggu\n';
      const rows = mapelList.map(m => 
        `"${m.kode}","${m.namaMapel}","${m.kelompok || ''}","${m.jurusan || 'Umum'}","${m.tingkat || 'Semua'}","${m.jamPerMinggu || 3}"`
      ).join('\n');
      downloadCsv(header + rows, `DATA_MAPEL_BPM_${new Date().toISOString().split('T')[0]}.csv`);
    }
    notify(`Berhasil mengekspor data ${mapelList.length} mata pelajaran!`);
  };

  const handleExportJadwal = (format: 'json' | 'csv' | 'excel') => {
    if (format === 'json') {
      downloadJson(jadwalPelajaranList, `DATA_JADWAL_BPM_${new Date().toISOString().split('T')[0]}.json`);
    } else if (format === 'excel') {
      exportJadwalToExcel(jadwalPelajaranList, schoolInfo.nama);
    } else {
      const header = 'Hari,Kelas,Jam Mulai,Jam Selesai,Jumlah Jam (JP),Mata Pelajaran,Guru Pengampu,Ruangan\n';
      const rows = jadwalPelajaranList.map(j => 
        `"${j.hari}","${j.namaKelas}","${j.jamMulai}","${j.jamSelesai}","${j.jumlahJam || 2}","${j.namaMapel}","${j.namaGuru}","${j.ruang || ''}"`
      ).join('\n');
      downloadCsv(header + rows, `DATA_JADWAL_BPM_${new Date().toISOString().split('T')[0]}.csv`);
    }
    notify(`Berhasil mengekspor data ${jadwalPelajaranList.length} sesi jadwal pelajaran!`);
  };

  const handleExportNilai = (format: 'json' | 'csv' | 'excel') => {
    if (format === 'json') {
      downloadJson(nilaiList, `DATA_LEGER_NILAI_BPM_${new Date().toISOString().split('T')[0]}.json`);
    } else if (format === 'excel') {
      const wb = XLSX.utils.book_new();
      const headers = ['NIPD', 'Nama Siswa', 'Kelas', 'Mata Pelajaran', 'Periode', 'Formatif', 'PTS', 'PAS/PAT', 'Nilai Akhir', 'Predikat'];
      const rows = nilaiList.map(n => [
        n.nipd,
        n.namaSiswa,
        n.kelas,
        n.mapelNama,
        n.periode || 'PAS',
        n.nilaiFormatif || 0,
        n.nilaiPts || 0,
        n.nilaiPas || n.nilaiPat || 0,
        n.nilaiAkhir || 0,
        n.predikat || 'C',
      ]);
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws['!cols'] = [{ wch: 15 }, { wch: 28 }, { wch: 20 }, { wch: 26 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Leger Nilai');
      saveWorkbookAsExcel(wb, `DATA_LEGER_NILAI_BPM_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else {
      const header = 'NIPD,Nama Siswa,Kelas,Mata Pelajaran,Periode,Formatif,PTS,PAS/PAT,Nilai Akhir,Predikat\n';
      const rows = nilaiList.map(n => 
        `"${n.nipd}","${n.namaSiswa}","${n.kelas}","${n.mapelNama}","${n.periode || 'PAS'}","${n.nilaiFormatif || 0}","${n.nilaiPts || 0}","${n.nilaiPas || n.nilaiPat || 0}","${n.nilaiAkhir || 0}","${n.predikat || 'C'}"`
      ).join('\n');
      downloadCsv(header + rows, `DATA_LEGER_NILAI_BPM_${new Date().toISOString().split('T')[0]}.csv`);
    }
    notify(`Berhasil mengekspor data ${nilaiList.length} rekam nilai siswa!`);
  };

  // ===================== IMPORT HANDLERS (EXCEL .XLSX / CSV / JSON) =====================
  const handleImportFile = async (type: 'siswa' | 'guru' | 'mapel' | 'jadwal' | 'nilai', file: File) => {
    try {
      if (file.name.endsWith('.json')) {
        const text = await file.text();
        const parsed = JSON.parse(text);

        // Deteksi cerdas: jika pengguna mengunggah berkas cadangan sistem lengkap ke tombol impor
        const isFullBackup = !Array.isArray(parsed) && (
          parsed.siswa || parsed.guru || parsed.users || parsed.usersList || parsed.students ||
          parsed.mapel || parsed.mapelList || parsed.kelas || parsed.kelasList ||
          parsed.nilai || parsed.nilaiList || parsed.absensi || parsed.absensiList ||
          parsed.schoolInfo || parsed.payload || parsed.backup || parsed.data
        );

        if (isFullBackup) {
          setActiveSection('backup');
          notify(`Mendeteksi berkas cadangan database lengkap "${file.name}". Membuka pratinjau konfirmasi pemulihan...`);
          handleRestoreFile(file);
          return;
        }

        let arrayData: any[] = [];
        if (Array.isArray(parsed)) {
          arrayData = parsed;
        } else if (Array.isArray(parsed.data)) {
          arrayData = parsed.data;
        } else if (Array.isArray(parsed[type])) {
          arrayData = parsed[type];
        } else {
          throw new Error('Format berkas JSON untuk entitas ini harus berupa daftar array data.');
        }

        if (type === 'siswa' || type === 'guru') {
          onImportUsers(arrayData);
        } else if (type === 'mapel') {
          onImportMapel(arrayData);
        } else if (type === 'jadwal') {
          onImportJadwal(arrayData);
        } else if (type === 'nilai') {
          onImportNilai(arrayData);
        }
        notify(`Berhasil mengimpor ${arrayData.length} data ${type} dari berkas JSON!`);
        return;
      }

      // Read spreadsheet (.xlsx, .xls, .csv)
      const rawRows = await readSpreadsheetFile(file);
      if (rawRows.length <= 1) {
        throw new Error('Berkas spreadsheet kosong atau tidak ada data baris.');
      }

      const headerRow = rawRows[0].map((h: any) => String(h || '').trim().toLowerCase());

      if (type === 'jadwal') {
        const colHari = headerRow.findIndex((h: string) => h.includes('hari'));
        const colKelas = headerRow.findIndex((h: string) => h.includes('kelas') || h.includes('rombel'));
        const colJamMulai = headerRow.findIndex((h: string) => h.includes('mulai') || h.includes('awal'));
        const colJamSelesai = headerRow.findIndex((h: string) => h.includes('selesai') || h.includes('akhir'));
        const colJamKBM = headerRow.findIndex((h: string) => 
          h.includes('jam kbm') || h.includes('waktu kbm') || h.includes('jam pelajaran') || 
          h.includes('waktu pelajaran') || h.includes('jam / waktu') || 
          (h.includes('jam') && !h.includes('jp') && !h.includes('jumlah') && !h.includes('ke'))
        );
        const colJP = headerRow.findIndex((h: string) => h.includes('jp') || h.includes('jumlah jam') || h.includes('durasi') || h.includes('jam ke'));
        const colMapel = headerRow.findIndex((h: string) => h.includes('mapel') || h.includes('mata pelajaran') || h.includes('pelajaran'));
        const colGuru = headerRow.findIndex((h: string) => h.includes('guru') || h.includes('pengampu') || h.includes('pendidik'));
        const colRuang = headerRow.findIndex((h: string) => h.includes('ruang') || h.includes('lab') || h.includes('tempat'));

        const imported: JadwalPelajaran[] = [];
        for (let i = 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length === 0) continue;

          const rawHari = String(row[colHari !== -1 ? colHari : 0] || 'Senin').trim();
          const validHari: ('Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu') =
            ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].includes(rawHari as any)
              ? (rawHari as any)
              : 'Senin';

          const namaKelas = String(row[colKelas !== -1 ? colKelas : 1] || 'X Farmasi 1').trim();
          const { jamMulai, jamSelesai, jp } = extractJadwalTimes(row, colJamMulai, colJamSelesai, colJamKBM, colJP, 2, 3);
          
          const namaMapel = String(
            (colMapel !== -1 ? row[colMapel] : null) || 
            (row.length > 5 ? row[5] : null) || 
            row[4] || 
            'Mata Pelajaran'
          ).trim();

          const namaGuru = String(
            (colGuru !== -1 ? row[colGuru] : null) || 
            (row.length > 6 ? row[6] : null) || 
            row[5] || 
            'Guru Pengampu'
          ).trim();

          const ruang = String(
            (colRuang !== -1 ? row[colRuang] : null) || 
            (row.length > 7 ? row[7] : null) || 
            row[6] || 
            'Lab Praktik'
          ).trim();

          const matchedKelas = kelasList.find(k => k.namaKelas.toLowerCase() === namaKelas.toLowerCase()) || kelasList[0];
          const matchedMapel = mapelList.find(m => m.namaMapel.toLowerCase() === namaMapel.toLowerCase());
          const matchedGuru = usersList.find(u => u.nama.toLowerCase().includes(namaGuru.toLowerCase()));

          imported.push({
            id: `jp-imp-${Date.now()}-${i}`,
            hari: validHari,
            jamMulai,
            jamSelesai,
            jumlahJam: jp,
            jamKe: `${jp} JP`,
            idKelas: matchedKelas?.id || `k-${Date.now()}`,
            namaKelas: matchedKelas?.namaKelas || namaKelas,
            idMapel: matchedMapel?.id || `m-${Date.now()}`,
            namaMapel: matchedMapel?.namaMapel || namaMapel,
            idGuru: matchedGuru?.id || `g-${Date.now()}`,
            namaGuru: matchedGuru?.nama || namaGuru,
            ruang,
            tahunAjaran: schoolInfo.tahunAjaranPembelajaran,
            semester: schoolInfo.semesterPembelajaran,
          });
        }

        onImportJadwal(imported);
        notify(`Berhasil mengimpor ${imported.length} sesi jadwal pelajaran dari Excel!`);
      } else if (type === 'guru') {
        const imported: User[] = [];
        for (let i = 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length < 2) continue;
          const nip = String(row[0] || '').trim();
          const nama = String(row[1] || '').trim();
          if (!nama) continue;
          const gelar = String(row[2] || '').trim();
          const peranRaw = String(row[3] || 'guru').toLowerCase();
          const jurusan = String(row[4] || 'Umum').trim();
          const walasKelasStr = String(row[5] || '').trim();
          const noHp = String(row[6] || '').trim();
          const email = String(row[7] || '').trim();
          const jk = String(row[8] || '').toLowerCase().includes('p') ? 'Perempuan' : 'Laki-laki';

          const isWalas = peranRaw.includes('walas') || walasKelasStr.length > 0;
          const walasClasses = walasKelasStr ? walasKelasStr.split(/[,|]/).map((s: string) => s.trim()).filter(Boolean) : [];

          imported.push({
            id: `u-imp-g-${Date.now()}-${i}`,
            nipOrNis: nip,
            nama,
            gelar,
            username: nip || `guru${Date.now().toString().slice(-4)}`,
            password: 'guru',
            role: isWalas ? 'walas' : 'guru',
            isWalas,
            jurusan,
            walasNamaKelas: walasClasses[0] || '',
            walasNamaKelasList: walasClasses,
            telepon: noHp,
            email,
            jenisKelamin: jk,
            statusAktif: true,
          });
        }
        onImportUsers(imported);
        notify(`Berhasil mengimpor ${imported.length} data guru dari Excel!`);
      } else if (type === 'siswa') {
        const imported: User[] = [];
        for (let i = 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length < 3) continue;
          const nipd = String(row[0] || '').trim();
          const nisn = String(row[1] || '').trim();
          const nama = String(row[2] || '').trim();
          if (!nama) continue;
          const kelas = String(row[3] || 'Kelas X').trim();
          const jk = String(row[4] || '').toLowerCase().includes('p') ? 'Perempuan' : 'Laki-laki';

          imported.push({
            id: `u-imp-s-${Date.now()}-${i}`,
            nipd: nipd || `NIPD${Date.now().toString().slice(-4)}`,
            nipOrNis: nipd,
            nisn: nisn || nipd,
            username: nisn || nipd || `siswa${Date.now().toString().slice(-4)}`,
            nama,
            kelas,
            namaKelas: kelas,
            role: 'siswa',
            password: 'siswa',
            jenisKelamin: jk,
            statusAktif: true,
          });
        }
        onImportUsers(imported);
        notify(`Berhasil mengimpor ${imported.length} data siswa dari Excel!`);
      } else if (type === 'mapel') {
        const imported: Mapel[] = [];
        for (let i = 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length < 2) continue;
          const kode = String(row[0] || '').trim();
          const namaMapel = String(row[1] || '').trim();
          if (!namaMapel) continue;
          const kelompok = String(row[2] || 'Muatan Kejuruan').trim();
          const jurusan = String(row[3] || 'Umum').trim();
          const tingkat = String(row[4] || 'Semua').trim();
          const jamPerMinggu = parseInt(String(row[5] || '3'), 10) || 3;

          imported.push({
            id: `m-imp-${Date.now()}-${i}`,
            kode: kode || `MPL-${Date.now().toString().slice(-4)}`,
            namaMapel,
            kelompok: kelompok as any,
            jurusan,
            tingkat,
            jamPerMinggu,
          });
        }
        onImportMapel(imported);
        notify(`Berhasil mengimpor ${imported.length} mata pelajaran dari Excel!`);
      } else if (type === 'nilai') {
        const imported: NilaiMapelSiswa[] = [];
        for (let i = 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length < 4) continue;
          const nipd = String(row[0] || '').trim();
          const namaSiswa = String(row[1] || '').trim();
          const kelas = String(row[2] || '').trim();
          const mapelNama = String(row[3] || '').trim();
          const periode = String(row[4] || 'PAS').trim() as any;
          const formatif = parseFloat(String(row[5] || '80')) || 80;
          const pts = parseFloat(String(row[6] || '80')) || 80;
          const pas = parseFloat(String(row[7] || '80')) || 80;
          const akhir = parseFloat(String(row[8] || '80')) || 80;
          const predikat = String(row[9] || 'B').trim() as any;

          imported.push({
            id: `nil-imp-${Date.now()}-${i}`,
            nipd,
            namaSiswa,
            kelas,
            mapelId: `m-${Date.now()}`,
            mapelNama,
            periode,
            nilaiFormatif: formatif,
            nilaiPts: pts,
            nilaiPas: pas,
            nilaiAkhir: akhir,
            predikat,
          });
        }
        onImportNilai(imported);
        notify(`Berhasil mengimpor ${imported.length} data nilai dari Excel!`);
      } else if (type === 'jadwal') {
        const imported: JadwalPelajaran[] = [];
        const headerRow = rawRows[0].map((h: any) => String(h || '').trim().toLowerCase());
        const colHari = headerRow.findIndex((h: string) => h.includes('hari'));
        const colKelas = headerRow.findIndex((h: string) => h.includes('kelas') || h.includes('rombel'));
        const colJamMulai = headerRow.findIndex((h: string) => h.includes('mulai') || h.includes('awal'));
        const colJamSelesai = headerRow.findIndex((h: string) => h.includes('selesai') || h.includes('akhir'));
        const colJamKBM = headerRow.findIndex((h: string) => 
          h.includes('jam kbm') || h.includes('waktu kbm') || h.includes('jam pelajaran') || 
          h.includes('waktu pelajaran') || h.includes('jam / waktu')
        );
        const colMapel = headerRow.findIndex((h: string) => h.includes('mapel') || h.includes('pelajaran') || h.includes('mata pelajaran'));
        const colGuru = headerRow.findIndex((h: string) => h.includes('guru') || h.includes('pengajar') || h.includes('pendidik'));
        const colRuang = headerRow.findIndex((h: string) => h.includes('ruang') || h.includes('lab') || h.includes('tempat'));
        const colJP = headerRow.findIndex((h: string) => h.includes('jp') || h.includes('jumlah jam'));

        const teachers = usersList.filter(u => u.role === 'guru' || u.role === 'walas');

        for (let i = 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length < 2) continue;

          const rawHari = colHari !== -1 ? String(row[colHari] || '').trim() : String(row[0] || '').trim();
          const validHari: JadwalPelajaran['hari'] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].includes(rawHari) 
            ? (rawHari as JadwalPelajaran['hari']) 
            : 'Senin';

          const namaKelas = colKelas !== -1 ? String(row[colKelas] || '').trim() : String(row[1] || '').trim();
          if (!namaKelas) continue;

          const { jamMulai, jamSelesai, jp } = extractJadwalTimes(row, colJamMulai, colJamSelesai, colJamKBM, colJP, 2, 3);
          const namaMapel = colMapel !== -1 ? String(row[colMapel] || '').trim() : String(row[4] || 'Muatan Kejuruan').trim();
          const namaGuru = colGuru !== -1 ? String(row[colGuru] || '').trim() : String(row[5] || '').trim();
          const ruang = colRuang !== -1 ? String(row[colRuang] || '').trim() : String(row[6] || 'R. Teori').trim();

          const cleanStr = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const matchedKelas = kelasList.find(k => cleanStr(k.namaKelas) === cleanStr(namaKelas));
          const matchedMapel = mapelList.find(m => cleanStr(m.namaMapel) === cleanStr(namaMapel) || cleanStr(m.kode) === cleanStr(namaMapel));
          const matchedGuru = teachers.find(g => cleanStr(g.nama) === cleanStr(namaGuru));

          imported.push({
            id: `jp-imp-${Date.now()}-${i}`,
            hari: validHari,
            jamMulai,
            jamSelesai,
            jumlahJam: jp,
            jamKe: `${jp} JP`,
            idKelas: matchedKelas?.id || `k-${Date.now()}`,
            namaKelas: matchedKelas?.namaKelas || namaKelas,
            idMapel: matchedMapel?.id || `m-${Date.now()}`,
            namaMapel: matchedMapel?.namaMapel || namaMapel,
            idGuru: matchedGuru?.id || `g-${Date.now()}`,
            namaGuru: matchedGuru?.nama || namaGuru,
            ruang,
            tahunAjaran: schoolInfo.tahunAjaranPembelajaran,
            semester: schoolInfo.semesterPembelajaran,
          });
        }
        if (imported.length > 0) {
          onImportJadwal(imported, 'update');
          notify(`Berhasil mengimpor & memperbarui ${imported.length} sesi jadwal pelajaran tanpa ganda!`);
        } else {
          alert('Tidak ada baris jadwal yang valid dalam berkas.');
        }
      }
    } catch (err: any) {
      alert(`Gagal mengimpor berkas spreadsheet: ${err.message}`);
    }
  };

  // ===================== BACKUP & RESTORE =====================
  const handleCreateSnapshot = async (customTitle?: string, alsoDownload: boolean = false) => {
    setIsSavingSnapshot(true);
    try {
      const now = new Date();
      const countSiswa = usersList.filter(u => u.role === 'siswa').length;
      const countGuru = usersList.filter(u => u.role === 'guru' || u.role === 'walas' || u.role === 'staf').length;
      const backupPayload = {
        backupTimestamp: now.toISOString(),
        school: schoolInfo.nama,
        data: {
          ...(backupOptions.schoolInfo ? { schoolInfo } : {}),
          users: usersList,
          usersList: usersList,
          ...(backupOptions.siswa ? { siswa: usersList.filter(u => u.role === 'siswa') } : {}),
          ...(backupOptions.guru ? { guru: usersList.filter(u => u.role === 'guru' || u.role === 'walas' || u.role === 'staf') } : {}),
          ...(backupOptions.mapel ? { mapel: mapelList, mapelList } : {}),
          ...(backupOptions.jadwal ? { 
            jadwalPelajaran: jadwalPelajaranList, 
            jadwalPelajaranList,
            jadwalUjian: jadwalUjianList,
            jadwalUjianList,
          } : {}),
          ...(backupOptions.nilai ? { 
            nilai: nilaiList, 
            nilaiList,
            nilaiEkskul: nilaiEkskulList,
            nilaiEkskulList,
          } : {}),
          ...(backupOptions.absensi ? { absensi: absensiList, absensiList } : {}),
          ...(backupOptions.ppdb ? { formulirPPDB: formulirList, formulirList } : {}),
          ...(backupOptions.ekskul ? { ekskul: ekskulList, ekskulList } : {}),
          ujian: ujianList,
          ujianList: ujianList,
          kelas: kelasList,
          kelasList: kelasList,
        }
      };

      const title = customTitle || snapshotLabel.trim() || `Cadangan Sistem ${now.toLocaleDateString('id-ID')} ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;

      const newSnapshot: InternalBackupSnapshot = {
        id: `snap-${Date.now()}`,
        timestamp: now.toISOString(),
        title,
        stats: {
          siswa: countSiswa,
          guru: countGuru,
          mapel: mapelList.length,
          kelas: kelasList.length,
          jadwal: jadwalPelajaranList.length,
          nilai: nilaiList.length,
          absensi: absensiList.length,
          ppdb: formulirList.length,
        },
        payload: backupPayload,
      };

      const updated = [newSnapshot, ...internalBackups].slice(0, 10);
      setInternalBackups(updated);

      // Save metadata list to localStorage with latest 3 full payloads to prevent QuotaExceededError
      const storageSafeList = updated.map((item, idx) => {
        if (idx < 3) return item;
        return { ...item, payload: { info: 'Disimpan di Cloud Firestore', data: {} } };
      });
      saveToStorage(STORAGE_KEYS.INTERNAL_BACKUPS, storageSafeList);
      setSnapshotLabel('');

      // Also persist metadata to Firestore settings/internal_backups (well under 50KB!)
      if (!isQuotaExhausted()) {
        try {
          const cloudMeta = updated.map(b => ({
            id: b.id,
            timestamp: b.timestamp,
            title: b.title,
            stats: b.stats
          }));
          await setDoc(doc(db, 'settings', 'internal_backups'), {
            updatedAt: now.toISOString(),
            backups: cloudMeta,
          }, { merge: true });

          // Save this single snapshot document to system_backups/{id} (isolated, never hits 1MB document cap)
          await setDoc(doc(db, 'system_backups', newSnapshot.id), JSON.parse(JSON.stringify(newSnapshot)), { merge: true });
        } catch (cloudErr: any) {
          if (isQuotaError(cloudErr)) markQuotaExhausted();
          console.warn('Notice saving snapshot to cloud:', cloudErr?.message || cloudErr);
        }
      }

      if (alsoDownload) {
        notify(`Titik cadangan "${title}" berhasil disimpan di sistem & Cloud Firestore!`);
      } else {
        notify(`Titik cadangan "${title}" berhasil disimpan ke sistem & Cloud Firestore!`);
      }
    } catch (err: any) {
      alert(`Gagal menyimpan cadangan: ${err?.message || err}`);
    } finally {
      setIsSavingSnapshot(false);
    }
  };

  const handleFullBackup = () => {
    const now = new Date();
    const countSiswa = usersList.filter(u => u.role === 'siswa').length;
    const countGuru = usersList.filter(u => u.role === 'guru' || u.role === 'walas' || u.role === 'staf').length;
    const title = snapshotLabel.trim() || `Cadangan Lengkap ${now.toLocaleDateString('id-ID')} ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
    
    // Prepare comprehensive export payload with ALL current master data
    const exportFilePayload = {
      backupTimestamp: now.toISOString(),
      title,
      school: schoolInfo?.nama || 'SMK Bakti Putra Mandiri',
      stats: {
        siswa: countSiswa,
        guru: countGuru,
        mapel: mapelList.length,
        kelas: kelasList.length,
        jadwal: jadwalPelajaranList.length,
        nilai: nilaiList.length,
        absensi: absensiList.length,
        ppdb: formulirList.length,
      },
      data: {
        schoolInfo,
        users: usersList,
        usersList: usersList,
        kelasList,
        mapelList,
        jadwalPelajaranList,
        jadwalUjianList,
        nilaiList,
        nilaiEkskulList,
        absensiList,
        formulirList,
        ekskulList,
        ujianList,
      }
    };

    // 1. Download immediately on user click without waiting for network (guarantees non-zero byte download)
    const dateFormatted = now.toISOString().split('T')[0];
    const timeFormatted = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    downloadJson(exportFilePayload, `BACKUP_DATABASE_BPM_${dateFormatted}_${timeFormatted}.json`);
    notify(`Berkas cadangan database (${countSiswa} siswa, ${countGuru} guru/staf, ${absensiList.length} absensi) berhasil diunduh ke komputer Anda!`);

    // 2. Persist snapshot internally & to Cloud Firestore
    handleCreateSnapshot(title, false);
  };

  const handleDeleteSnapshot = async (id: string) => {
    if (!window.confirm('Yakin ingin menghapus titik cadangan ini?')) return;
    const updated = internalBackups.filter(b => b.id !== id);
    setInternalBackups(updated);
    saveToStorage(STORAGE_KEYS.INTERNAL_BACKUPS, updated);
    try {
      if (!isQuotaExhausted()) {
        const cloudMeta = updated.map(b => ({
          id: b.id,
          timestamp: b.timestamp,
          title: b.title,
          stats: b.stats
        }));
        await setDoc(doc(db, 'settings', 'internal_backups'), {
          updatedAt: new Date().toISOString(),
          backups: cloudMeta,
        }, { merge: true });
      }
    } catch (_) {}
    notify('Titik cadangan berhasil dihapus.');
  };

  const handleRestoreFromSnapshot = async (snapshot: InternalBackupSnapshot) => {
    setRestoreError(null);
    let payload = snapshot.payload?.data || snapshot.payload;
    if (!payload || !payload.users || Object.keys(payload).length === 0) {
      // Try to load from Firestore system_backups collection
      try {
        const snapDoc = await getDoc(doc(db, 'system_backups', snapshot.id));
        if (snapDoc.exists()) {
          const cloudSnap = snapDoc.data();
          payload = cloudSnap.payload?.data || cloudSnap.payload;
        }
      } catch (e) {
        console.warn('Could not fetch snapshot payload from cloud:', e);
      }
    }

    if (!payload || Object.keys(payload).length === 0) {
      alert('Isi data cadangan ini tidak ditemukan. Silakan gunakan berkas cadangan .json Anda.');
      return;
    }

    const rawSnapAbsensi = payload.absensiList || payload.absensi || payload.presensi || payload.riwayatAbsensi || payload.riwayat_absensi || payload.dataAbsensi || payload.attendance || payload.kehadiran || [];
    const countAbsensi = Array.isArray(rawSnapAbsensi) ? rawSnapAbsensi.length : (snapshot.stats?.absensi || 0);
    const rawSnapPPDB = payload.formulirList || payload.formulirPPDB || payload.ppdb || payload.spmb || payload.calonSiswa || payload.calon_siswa || [];
    const countPPDB = Array.isArray(rawSnapPPDB) ? rawSnapPPDB.length : (snapshot.stats?.ppdb || 0);

    setPendingRestore({
      payload,
      fileName: snapshot.title,
      countSiswa: snapshot.stats.siswa,
      countGuru: snapshot.stats.guru,
      countMapel: snapshot.stats.mapel,
      countKelas: snapshot.stats.kelas,
      countJadwal: snapshot.stats.jadwal,
      countNilai: snapshot.stats.nilai,
      countAbsensi,
      countPPDB,
      hasSchoolInfo: Boolean(payload.schoolInfo)
    });
  };

  const handleDownloadSnapshotFile = async (snapshot: InternalBackupSnapshot) => {
    let payload = snapshot.payload?.data || snapshot.payload;
    if (!payload || !payload.users || Object.keys(payload).length === 0) {
      try {
        const snapDoc = await getDoc(doc(db, 'system_backups', snapshot.id));
        if (snapDoc.exists()) {
          const cloudSnap = snapDoc.data();
          payload = cloudSnap.payload?.data || cloudSnap.payload;
        }
      } catch (e) {
        console.warn('Could not fetch snapshot payload from cloud:', e);
      }
    }

    // Safety fallback if snapshot payload in memory was stripped to save quota
    if (!payload || Object.keys(payload).length === 0) {
      payload = {
        schoolInfo,
        users: usersList,
        kelasList,
        mapelList,
        jadwalPelajaranList,
        jadwalUjianList,
        nilaiList,
        nilaiEkskulList,
        absensiList,
        formulirList,
        ekskulList,
        ujianList,
      };
    }

    const fullExport = {
      backupTimestamp: snapshot.timestamp,
      title: snapshot.title,
      school: schoolInfo?.nama || 'SMK Bakti Putra Mandiri',
      stats: snapshot.stats,
      data: payload,
    };

    downloadJson(fullExport, `BACKUP_BPM_${snapshot.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_${snapshot.timestamp.substring(0, 10)}.json`);
    notify(`Berkas cadangan "${snapshot.title}" berhasil diunduh!`);
  };

  const handleRestoreFile = (file: File) => {
    setRestoreError(null);
    setRestoreErrorModal(null);

    if (!file) return;

    if (file.size === 0) {
      setRestoreErrorModal(`Berkas "${file.name}" berukuran 0 Byte (kosong tanpa data). Silakan gunakan berkas cadangan database resmi (.json) yang valid.`);
      return;
    }

    setIsReadingFile(true);
    const reader = new FileReader();

    reader.onerror = () => {
      setIsReadingFile(false);
      setRestoreErrorModal('Gagal membaca berkas dari media penyimpanan lokal komputer Anda.');
    };

    reader.onload = async (e) => {
      setIsReadingFile(false);
      try {
        const rawText = e.target?.result as string;
        if (!rawText || !rawText.trim()) {
          throw new Error('Berkas yang dipilih kosong.');
        }

        // Clean UTF-8 BOM if present
        const text = rawText.replace(/^\uFEFF/, '').trim();
        let backupData: any;
        try {
          backupData = JSON.parse(text);
        } catch (jsonErr: any) {
          throw new Error(`Format JSON tidak valid atau berkas rusak: ${jsonErr.message}`);
        }

        // Fleksibilitas format: Mendukung array langsung maupun object bersarang
        let payload: any = backupData;
        if (Array.isArray(backupData)) {
          const isAttendance = backupData.some((x: any) => x && (x.tanggal || x.status || x.waktu));
          if (isAttendance) {
            payload = { absensi: backupData };
          } else {
            payload = { siswa: backupData };
          }
        } else {
          payload = backupData.data || backupData.backup || backupData.payload || backupData.database || backupData.state || backupData.collections || backupData.export || backupData;
        }

        // Pengecekan data yang sangat fleksibel: mendukung SEMUA format lama & baru
        const hasValidData = 
          payload.siswa || payload.guru || payload.users || payload.usersList || payload.students ||
          payload.murid || payload.dataSiswa || payload.dataGuru || payload.teachers || payload.pengguna ||
          payload.mapel || payload.mapelList || payload.mataPelajaran || payload.mata_pelajaran || payload.subjects ||
          payload.kelas || payload.kelasList || payload.rombel || payload.classes ||
          payload.jadwal || payload.jadwalPelajaran || payload.jadwalPelajaranList || payload.jadwalUjian ||
          payload.nilai || payload.nilaiList || payload.leger || payload.dataNilai ||
          payload.absensi || payload.absensiList || payload.presensi || payload.riwayatAbsensi || payload.riwayat_absensi || payload.dataAbsensi || payload.attendance || payload.kehadiran || payload.historyAbsen || payload.rekapAbsensi ||
          payload.schoolInfo || payload.sekolah || payload.identitasSekolah ||
          payload.formulirList || payload.formulirPPDB || payload.ppdb || payload.spmb ||
          payload.ekskul || payload.ekskulList || payload.ujian || payload.ujianList;

        if (!hasValidData) {
          throw new Error('Berkas tidak berisi entitas data sekolah SMK Bakti Putra Mandiri yang dikenali. Pastikan Anda memilih file cadangan database resmi (.json).');
        }

        // Hitung siswa dengan cerdas
        const rawSiswaList = payload.siswa || payload.students || payload.dataSiswa || payload.murid || [];
        const rawUsersList = payload.users || payload.usersList || payload.pengguna || [];
        const countSiswa = (rawSiswaList.length > 0)
          ? rawSiswaList.length
          : rawUsersList.filter((u: any) => u.role === 'siswa' || u.nipd || u.nisn || u.kelas).length;

        const rawGuruList = payload.guru || payload.teachers || payload.dataGuru || [];
        const countGuru = (rawGuruList.length > 0)
          ? rawGuruList.length
          : rawUsersList.filter((u: any) => u.role === 'guru' || u.role === 'walas' || u.role === 'staf' || u.idGuru).length;

        const countMapel = (payload.mapelList || payload.mapel || payload.mataPelajaran || payload.subjects || []).length;
        const countKelas = (payload.kelasList || payload.kelas || payload.rombel || payload.classes || []).length;
        const countJadwal = (payload.jadwalPelajaranList || payload.jadwalPelajaran || payload.jadwal || []).length;
        const countNilai = (payload.nilaiList || payload.nilai || payload.leger || payload.dataNilai || []).length;
        const rawFileAbsensi = payload.absensiList || payload.absensi || payload.presensi || payload.riwayatAbsensi || payload.riwayat_absensi || payload.dataAbsensi || payload.attendance || payload.kehadiran || payload.historyAbsen || payload.rekapAbsensi || [];
        const countAbsensi = Array.isArray(rawFileAbsensi) ? rawFileAbsensi.length : 0;
        const rawFilePPDB = payload.formulirList || payload.formulirPPDB || payload.ppdb || payload.spmb || payload.calonSiswa || payload.calon_siswa || [];
        const countPPDB = Array.isArray(rawFilePPDB) ? rawFilePPDB.length : 0;
        const hasSchoolInfo = Boolean(payload.schoolInfo || payload.sekolah || payload.identitasSekolah);

        setPendingRestore({
          payload,
          fileName: file.name,
          countSiswa,
          countGuru,
          countMapel,
          countKelas,
          countJadwal,
          countNilai,
          countAbsensi,
          countPPDB,
          hasSchoolInfo
        });
      } catch (err: any) {
        setRestoreErrorModal(err?.message || 'Gagal membaca berkas cadangan JSON.');
        setRestoreError(err?.message || 'Gagal membaca berkas cadangan JSON.');
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestore) return;
    setIsRestoring(true);
    setRestoreError(null);
    setRestoreErrorModal(null);
    try {
      await onRestoreAllData(pendingRestore.payload);
      const restoredSummary = { ...pendingRestore };
      setRestoreSuccessData(restoredSummary);
      setPendingRestore(null);
      notify(`Database berhasil dipulihkan dari "${restoredSummary.fileName}"!`);
    } catch (err: any) {
      const errMsg = `Gagal memulihkan database: ${err?.message || err}`;
      setRestoreError(errMsg);
      setRestoreErrorModal(errMsg);
    } finally {
      setIsRestoring(false);
    }
  };

  // ===================== RESET HANDLERS =====================
  const handleExecuteFullReset = () => {
    if (confirmResetText !== 'RESET') {
      return;
    }
    onResetDatabase();
    setShowFullResetModal(false);
    setConfirmResetText('');
    notify('Seluruh database telah direset ke setelan awal bersih!');
  };

  return (
    <div className="space-y-6">
      {notification && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2 shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Main Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-200">
              <Database className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Pusat Kelola Data, Impor / Ekspor & Cadangan Database</h2>
              <p className="text-xs text-slate-500">
                Impor dan ekspor CSV/JSON data siswa, guru, mapel, jadwal, leger nilai, serta backup & reset database.
              </p>
            </div>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveSection('cloud_sync')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSection === 'cloud_sync'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-800 hover:bg-emerald-50'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Sinkronisasi HP & Komputer</span>
          </button>
          <button
            onClick={() => setActiveSection('import_export')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSection === 'import_export'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Impor & Ekspor Data
          </button>
          <button
            onClick={() => setActiveSection('backup')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSection === 'backup'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cadangan & Pulihkan
          </button>
          <button
            onClick={() => setActiveSection('reset')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSection === 'reset'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-rose-600 hover:bg-rose-50'
            }`}
          >
            Reset Database
          </button>
        </div>
      </div>

      {/* SECTION 0: SINKRONISASI CLOUD ANTAR PERANGKAT */}
      {activeSection === 'cloud_sync' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-emerald-900 via-slate-900 to-teal-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-500/30 relative overflow-hidden">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-400/30">
                <Cloud className="w-4 h-4 text-emerald-400" />
                <span>Cloud Firestore Multi-Device Sync Engine</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black">
                Sinkronisasi Antar Perangkat (Komputer ↔ Smartphone / Tablet)
              </h3>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                Fitur ini memastikan semua data yang diinput atau diubah di komputer (Identitas Sekolah, Gelombang SPMB, Calon Siswa Baru, Akun Siswa/Guru, Kelas & Mapel) secara instan terkirim ke Cloud Database dan langsung tampil saat Anda membuka aplikasi di HP.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={handleTriggerCloudSync}
                  disabled={isSyncingCloud || isPullingCloud}
                  className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black rounded-2xl shadow-lg flex items-center gap-2.5 transition-all active:scale-95 text-sm cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncingCloud ? 'animate-spin' : ''}`} />
                  <span>{isSyncingCloud ? 'Sedang Mengunggah...' : 'Kirim & Sinkronkan Semua Data ke Cloud'}</span>
                </button>

                {onPullAllFromCloud && (
                  <button
                    type="button"
                    onClick={handleTriggerCloudPull}
                    disabled={isSyncingCloud || isPullingCloud}
                    className="px-5 py-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold rounded-2xl shadow-lg flex items-center gap-2 transition-all active:scale-95 text-sm cursor-pointer"
                  >
                    <Cloud className={`w-4 h-4 ${isPullingCloud ? 'animate-pulse' : ''}`} />
                    <span>{isPullingCloud ? 'Sedang Menarik...' : 'Tarik Data Terbaru dari Cloud'}</span>
                  </button>
                )}

                <div className="flex items-center gap-2 text-xs text-emerald-200/80 bg-emerald-950/60 px-4 py-2 rounded-xl border border-emerald-500/20">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Database Online Real-Time Aktif</span>
                </div>
              </div>

              {cloudSyncResult && (
                <div className={`mt-4 p-4 rounded-2xl border text-xs sm:text-sm flex items-start gap-3 ${
                  cloudSyncResult.success
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-200'
                    : 'bg-rose-950 border-rose-500 text-rose-200'
                }`}>
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">{cloudSyncResult.success ? 'Sinkronisasi Selesai' : 'Perhatian Sinkronisasi'}</p>
                    <p className="text-xs opacity-90 mt-0.5">{cloudSyncResult.msg}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Device Sync Matrix & Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                  <Laptop className="w-5 h-5" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                  Tersambung
                </span>
              </div>
              <h4 className="font-bold text-slate-800 text-sm">Perangkat Komputer (Admin)</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tempat Anda menginput profil sekolah, gelombang pendaftaran SPMB, dan menyetujui calon siswa baru.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                  <Smartphone className="w-5 h-5" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                  Auto-Update
                </span>
              </div>
              <h4 className="font-bold text-slate-800 text-sm">Smartphone / Tablet Calon Siswa</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Menerima data secara langsung via onSnapshot Firestore tanpa perlu refresh browser atau clear cache.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-teal-50 rounded-xl text-teal-600">
                  <Cloud className="w-5 h-5" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-100 text-teal-800">
                  Cloud Rules Aktif
                </span>
              </div>
              <h4 className="font-bold text-slate-800 text-sm">Google Cloud Firestore</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Penyimpanan cloud global yang menjaga konsistensi data antara komputer dan seluruh perangkat mobile.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 1: IMPOR & EKSPOR */}
      {activeSection === 'import_export' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* 1. DATA SISWA */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-xl bg-teal-50 text-teal-700">
                  <Users className="w-5 h-5" />
                </span>
                <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full">
                  {usersList.filter(u => u.role === 'siswa').length} Siswa
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900">Data Peserta Didik (Siswa)</h3>
              <p className="text-xs text-slate-500">
                Unduh template Excel siswa, ekspor data siswa aktif, atau impor berkas Excel/CSV secara massal.
              </p>
            </div>

            <div className="space-y-2.5 pt-3 border-t border-slate-100">
              {/* Tombol Template Excel (.xlsx) */}
              <button
                type="button"
                onClick={() => downloadTemplateSiswaExcel(kelasList)}
                className="w-full py-2 px-3 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Unduh format template data siswa dalam Microsoft Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4 text-teal-600" />
                <span>Unduh Template Siswa (.xlsx)</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleExportSiswa('excel')}
                  className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Ekspor Excel</span>
                </button>
                <button
                  onClick={() => handleExportSiswa('json')}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-amber-600" />
                  <span>Ekspor JSON</span>
                </button>
              </div>

              <label className="w-full py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm">
                <Upload className="w-4 h-4" />
                <span>Impor Siswa (Excel / CSV / JSON)</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImportFile('siswa', f);
                  }}
                />
              </label>
            </div>
          </div>

          {/* 2. DATA GURU */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-xl bg-blue-50 text-blue-700">
                  <GraduationCap className="w-5 h-5" />
                </span>
                <span className="text-[11px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full">
                  {usersList.filter(u => u.role === 'guru' || u.role === 'walas').length} Guru
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900">Data Tenaga Pendidik (Guru)</h3>
              <p className="text-xs text-slate-500">
                Unduh template Excel akun guru, ekspor daftar pendidik, atau impor berkas Excel/CSV massal.
              </p>
            </div>

            <div className="space-y-2.5 pt-3 border-t border-slate-100">
              {/* Tombol Template Excel (.xlsx) */}
              <button
                type="button"
                onClick={() => downloadTemplateGuruExcel(mapelList)}
                className="w-full py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Unduh format template data guru dalam Microsoft Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                <span>Unduh Template Guru (.xlsx)</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleExportGuru('excel')}
                  className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Ekspor Excel</span>
                </button>
                <button
                  onClick={() => handleExportGuru('json')}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-amber-600" />
                  <span>Ekspor JSON</span>
                </button>
              </div>

              <label className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm">
                <Upload className="w-4 h-4" />
                <span>Impor Guru (Excel / CSV / JSON)</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImportFile('guru', f);
                  }}
                />
              </label>
            </div>
          </div>

          {/* 3. DATA MAPEL */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                  <BookOpen className="w-5 h-5" />
                </span>
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {mapelList.length} Mapel
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900">Mata Pelajaran</h3>
              <p className="text-xs text-slate-500">
                Unduh template Excel struktur kurikulum mapel umum & kejuruan atau impor berkas.
              </p>
            </div>

            <div className="space-y-2.5 pt-3 border-t border-slate-100">
              {/* Tombol Template Excel (.xlsx) */}
              <button
                type="button"
                onClick={() => downloadTemplateMapelExcel()}
                className="w-full py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Unduh format template data mata pelajaran dalam Microsoft Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Unduh Template Mapel (.xlsx)</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleExportMapel('excel')}
                  className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Ekspor Excel</span>
                </button>
                <button
                  onClick={() => handleExportMapel('json')}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-amber-600" />
                  <span>Ekspor JSON</span>
                </button>
              </div>

              <label className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm">
                <Upload className="w-4 h-4" />
                <span>Impor Mapel (Excel / CSV / JSON)</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImportFile('mapel', f);
                  }}
                />
              </label>
            </div>
          </div>

          {/* 4. DATA JADWAL */}
          <div className="bg-white rounded-2xl p-5 border-2 border-purple-300 shadow-sm space-y-4 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-purple-600 text-white text-[10px] font-extrabold px-3 py-0.5 rounded-bl-xl uppercase tracking-wider">
              Format Excel .xlsx
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-xl bg-purple-50 text-purple-700">
                  <CalendarDays className="w-5 h-5" />
                </span>
                <span className="text-[11px] font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-full">
                  {jadwalPelajaranList.length} Sesi
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900">Jadwal Pelajaran (KBM)</h3>
              <p className="text-xs text-slate-500">
                Unduh format template Excel resmi (.xlsx) dengan kolom Jumlah Jam (JP) & referensi kelas/guru untuk mempermudah pengerjaan.
              </p>
            </div>

            <div className="space-y-2.5 pt-3 border-t border-slate-100">
              {/* Tombol Template Excel (.xlsx) */}
              <button
                type="button"
                onClick={() => downloadTemplateJadwalExcel(kelasList, mapelList, usersList)}
                className="w-full py-2.5 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300 text-xs font-extrabold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
                title="Unduh format template jadwal pelajaran Microsoft Excel (.xlsx) biasa bukan CSV"
              >
                <FileSpreadsheet className="w-4 h-4 text-purple-600" />
                <span>Unduh Template Jadwal (.xlsx)</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleExportJadwal('excel')}
                  className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Ekspor Excel</span>
                </button>
                <button
                  onClick={() => handleExportJadwal('json')}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-amber-600" />
                  <span>Ekspor JSON</span>
                </button>
              </div>

              <label className="w-full py-2.5 px-3 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm">
                <Upload className="w-4 h-4" />
                <span>Impor Jadwal (Excel .xlsx / CSV)</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImportFile('jadwal', f);
                  }}
                />
              </label>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    if (onDeduplicateJadwalPelajaran) {
                      const removed = onDeduplicateJadwalPelajaran();
                      notify(removed > 0 
                        ? `Berhasil merapikan jadwal! Dihapus ${removed} slot sesi ganda.` 
                        : 'Jadwal pelajaran sudah rapi dan tidak ada sesi ganda.');
                    } else {
                      notify('Jadwal pelajaran telah diperbarui.');
                    }
                  }}
                  className="py-2 px-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title="Pindai dan hilangkan slot jadwal yang ganda/duplikat secara otomatis"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                  <span>Update Anti-Ganda</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (jadwalPelajaranList.length === 0) {
                      alert('Jadwal pelajaran sudah kosong.');
                      return;
                    }
                    if (window.confirm(`Yakin ingin MENGHAPUS SEMUA (${jadwalPelajaranList.length} sesi) jadwal pelajaran? Tindakan ini tidak dapat dibatalkan.`)) {
                      if (onClearAllJadwalPelajaran) {
                        onClearAllJadwalPelajaran();
                        notify('Seluruh jadwal pelajaran berhasil dikosongkan!');
                      }
                    }
                  }}
                  disabled={jadwalPelajaranList.length === 0}
                  className="py-2 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Hapus seluruh jadwal pelajaran"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Hapus Semua</span>
                </button>
              </div>
            </div>
          </div>

          {/* 5. DATA NILAI & LEGER */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-xl bg-amber-50 text-amber-700">
                  <Award className="w-5 h-5" />
                </span>
                <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full">
                  {nilaiList.length} Rekam Nilai
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900">Leger & Nilai Siswa</h3>
              <p className="text-xs text-slate-500">
                Unduh template Excel nilai siswa atau impor nilai dari spreadsheet guru pengampu.
              </p>
            </div>

            <div className="space-y-2.5 pt-3 border-t border-slate-100">
              {/* Tombol Template Excel (.xlsx) */}
              <button
                type="button"
                onClick={() => downloadTemplateNilaiExcel(kelasList, mapelList)}
                className="w-full py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Unduh format template leger nilai siswa dalam Microsoft Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                <span>Unduh Template Nilai (.xlsx)</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleExportNilai('excel')}
                  className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Ekspor Excel</span>
                </button>
                <button
                  onClick={() => handleExportNilai('json')}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  <span>Ekspor JSON</span>
                </button>
              </div>

              <label className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm">
                <Upload className="w-4 h-4" />
                <span>Impor Nilai (Excel / CSV / JSON)</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImportFile('nilai', f);
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: CADANGAN & PULIHKAN (BACKUP & RESTORE) */}
      {activeSection === 'backup' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Archive className="w-5 h-5 text-amber-600" />
                <span>Cadangkan Data Sekolah (Backup)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Pilih entitas data yang ingin disertakan dalam berkas cadangan JSON terenkripsi.
              </p>
            </div>

            {/* Checkboxes */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={backupOptions.siswa}
                  onChange={(e) => setBackupOptions({ ...backupOptions, siswa: e.target.checked })}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>Data Siswa</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={backupOptions.guru}
                  onChange={(e) => setBackupOptions({ ...backupOptions, guru: e.target.checked })}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>Data Guru & Walas</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={backupOptions.mapel}
                  onChange={(e) => setBackupOptions({ ...backupOptions, mapel: e.target.checked })}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>Mata Pelajaran</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={backupOptions.jadwal}
                  onChange={(e) => setBackupOptions({ ...backupOptions, jadwal: e.target.checked })}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>Jadwal Pelajaran</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={backupOptions.nilai}
                  onChange={(e) => setBackupOptions({ ...backupOptions, nilai: e.target.checked })}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>Leger & Nilai Siswa</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={backupOptions.absensi}
                  onChange={(e) => setBackupOptions({ ...backupOptions, absensi: e.target.checked })}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>Presensi / Kehadiran</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={backupOptions.ppdb}
                  onChange={(e) => setBackupOptions({ ...backupOptions, ppdb: e.target.checked })}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>Pendaftar Calon Siswa (PPDB)</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={backupOptions.ekskul}
                  onChange={(e) => setBackupOptions({ ...backupOptions, ekskul: e.target.checked })}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>Kegiatan Ekstrakurikuler</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={backupOptions.schoolInfo}
                  onChange={(e) => setBackupOptions({ ...backupOptions, schoolInfo: e.target.checked })}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>Pengaturan KOP & Sekolah</span>
              </label>
            </div>

            {/* Input Nama & Tombol Simpan Cadangan */}
            <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <input
                  type="text"
                  value={snapshotLabel}
                  onChange={(e) => setSnapshotLabel(e.target.value)}
                  placeholder="Label/Nama titik cadangan (contoh: Cadangan UTS Ganjil, Cadangan 78 Siswa)..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-amber-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder:text-slate-400 shadow-sm"
                />
                <button
                  type="button"
                  disabled={isSavingSnapshot}
                  onClick={() => handleCreateSnapshot(snapshotLabel.trim() || undefined, false)}
                  className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer shrink-0"
                >
                  <Archive className="w-4 h-4" />
                  <span>{isSavingSnapshot ? 'Menyimpan...' : 'Simpan Titik Cadangan ke Sistem & Cloud'}</span>
                </button>
              </div>
              <p className="text-[11px] text-amber-900/80">
                Data cadangan langsung disimpan aman di memori perangkat dan disinkronkan ke Cloud Firestore (dapat dipulihkan kapan saja tanpa perlu cari file).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={handleFullBackup}
                disabled={isSavingSnapshot}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm cursor-pointer"
                title="Menyimpan cadangan ke sistem sekaligus mengunduh berkas .json ke komputer"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>Simpan & Unduh Berkas Cadangan (.json)</span>
              </button>

              <button
                type="button"
                onClick={() => exportPPDBToExcel(formulirList, schoolInfo.nama)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm cursor-pointer"
                title="Unduh rekapitulasi data pendaftar calon siswa PPDB dalam format Excel biasa (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Unduh Rekap Data PPDB ({formulirList.length} Siswa - Excel .xlsx)</span>
              </button>
            </div>
          </div>

          {/* DAFTAR TITIK CADANGAN TERSIMPAN (INTERNAL SNAPSHOTS) */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>Daftar Titik Cadangan Tersimpan di Sistem & Cloud ({internalBackups.length})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Titik pemulihan instan yang tersimpan di sistem lokal dan Cloud Firestore. Siap dipulihkan kapan saja dengan 1 kali klik.
                </p>
              </div>
            </div>

            {internalBackups.length === 0 ? (
              <div className="py-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl p-6 space-y-2">
                <Archive className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-medium text-slate-600">Belum ada titik cadangan yang tersimpan di sistem.</p>
                <p className="text-[11px] text-slate-400">
                  Gunakan tombol "Simpan Titik Cadangan ke Sistem & Cloud" di atas untuk membuat titik pemulihan pertama Anda.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {internalBackups.map((snap) => {
                  const dateObj = new Date(snap.timestamp);
                  const dateFormatted = !isNaN(dateObj.getTime())
                    ? `${dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} pukul ${dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`
                    : snap.timestamp;

                  return (
                    <div 
                      key={snap.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {snap.title}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700 font-mono">
                            {dateFormatted}
                          </span>
                        </div>

                        {/* Stats Badges */}
                        <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                          <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-semibold">
                            {snap.stats.siswa} Siswa
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-semibold">
                            {snap.stats.guru} Guru
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-semibold">
                            {snap.stats.mapel} Mapel
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-semibold">
                            {snap.stats.nilai} Nilai
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-semibold">
                            {snap.stats.absensi} Presensi
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-semibold">
                            {snap.stats.ppdb} PPDB
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleRestoreFromSnapshot(snap)}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                          title="Kembalikan data sekolah dari titik cadangan ini"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Pulihkan Data Ini</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDownloadSnapshotFile(snap)}
                          className="p-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
                          title="Unduh berkas JSON cadangan ini"
                        >
                          <Download className="w-4 h-4 text-emerald-600" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteSnapshot(snap.id)}
                          className="p-1.5 rounded-xl bg-white hover:bg-rose-50 border border-slate-300 hover:border-rose-300 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Hapus titik cadangan ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RESTORE DARI BERKAS FILE JSON */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                <span>Upload Cadangan & Pulihkan Database (.json)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Pilih atau seret berkas cadangan database resmi (.json). Sistem akan memverifikasi file, menampilkan dialog <strong>konfirmasi</strong> serta <strong>keterangan rincian jumlah data</strong> sebelum memulihkan data ke sistem dan cloud.
              </p>
            </div>

            <div 
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const f = e.dataTransfer?.files?.[0];
                if (f) handleRestoreFile(f);
              }}
              className="p-6 rounded-2xl border-2 border-dashed border-sky-300 hover:border-sky-500 bg-sky-50/40 hover:bg-sky-50/80 transition-all flex flex-col items-center justify-center text-center space-y-3 cursor-pointer"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-xs">
                <Upload className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-800">Tarik & Letakkan atau Klik untuk Upload Cadangan (.json)</p>
                <p className="text-[11px] text-slate-500">Mendukung berkas .json hasil cadangan database resmi SMK Bakti Putra Mandiri</p>
              </div>

              <label className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md transition-all hover:scale-102">
                {isReadingFile ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Menganalisis Berkas Cadangan...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Upload / Unggah Berkas Cadangan</span>
                  </>
                )}
                <input
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleRestoreFile(f);
                    e.target.value = ''; // Reset input agar event onChange selalu jalan jika berkas yang sama dipilih ulang
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: RESET DATABASE (DANGER ZONE) */}
      {activeSection === 'reset' && (
        <div className="bg-white rounded-2xl p-6 border border-rose-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-rose-100 pb-4">
            <span className="p-2.5 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200">
              <ShieldAlert className="w-7 h-7" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">Area Pembersihan Data & Reset Selektif</h3>
              <p className="text-xs text-rose-600 font-medium">
                Tindakan di bawah ini akan menghapus data terpilih secara permanen. Pastikan Anda telah mengunduh berkas cadangan (backup).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Reset Calon Siswa */}
            <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/40 space-y-3 flex flex-col justify-between">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-900">Reset / Hapus Semua Calon Siswa (PPDB)</h4>
                <p className="text-[11px] text-slate-500">
                  Menghapus {formulirList.length} formulir pendaftaran PPDB dan akun calon siswa.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResetConfirmAction('calon')}
                className="w-full py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset Calon Siswa</span>
              </button>
            </div>

            {/* Bersihkan Siswa Bawaan Sistem / Template */}
            <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/40 space-y-3 flex flex-col justify-between">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-900">Bersihkan Siswa Bawaan / Template</h4>
                <p className="text-[11px] text-slate-500">
                  Menghapus {usersList.filter(u => u.role === 'siswa' && (u.id.startsWith('u-siswa-gen-') || u.id.startsWith('u-siswa-dummy-'))).length} data siswa generator template bawaan sistem secara permanen.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResetConfirmAction('template_siswa')}
                className="w-full py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Bersihkan Siswa Bawaan</span>
              </button>
            </div>

            {/* Reset Leger Nilai */}
            <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/40 space-y-3 flex flex-col justify-between">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-900">Reset / Kosongkan Nilai & Leger</h4>
                <p className="text-[11px] text-slate-500">
                  Menghapus {nilaiList.length} entri nilai formatif, PTS, PAS, dan PAT yang tersimpan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResetConfirmAction('nilai')}
                className="w-full py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset Data Nilai</span>
              </button>
            </div>

            {/* Reset Presensi */}
            <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/40 space-y-3 flex flex-col justify-between">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-900">Reset Riwayat Presensi / Absensi</h4>
                <p className="text-[11px] text-slate-500">
                  Menghapus {absensiList.length} rekam kehadiran barcode/QR Code siswa.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResetConfirmAction('absensi')}
                className="w-full py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset Presensi</span>
              </button>
            </div>
          </div>

          {/* Full Database Reset */}
          <div className="mt-4 p-5 rounded-2xl bg-rose-100/60 border-2 border-rose-300 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-black text-rose-950 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-700" />
                <span>Reset Total Seluruh Database Sekolah</span>
              </h4>
              <p className="text-xs text-rose-800">
                Mengembalikan seluruh data akun guru, nilai, presensi, calon siswa, dan jadwal ke setelan pabrik bersih.
              </p>
            </div>

            <button
              onClick={() => setShowFullResetModal(true)}
              className="px-5 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-black text-xs shadow-md whitespace-nowrap"
            >
              Reset Total Database
            </button>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL RESTORE BACKUP */}
      {pendingRestore && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-sky-200">
            <div className="flex items-center gap-3 text-sky-700">
              <span className="p-2.5 rounded-2xl bg-sky-50 border border-sky-200">
                <RotateCcw className="w-6 h-6 text-sky-600" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">Pulihkan Cadangan Database</h3>
                <p className="text-xs text-sky-700 font-medium">Berkas: {pendingRestore.fileName}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Sistem telah menganalisis berkas cadangan Anda. Data berikut siap dipulihkan ke sistem dan langsung disinkronkan ke Cloud Firestore:
            </p>

            {/* Entity Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-center">
                <span className="block text-base font-black text-emerald-600">{pendingRestore.countSiswa}</span>
                <span className="text-[10px] text-slate-500 font-semibold">Data Siswa</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-center">
                <span className="block text-base font-black text-amber-600">{pendingRestore.countGuru}</span>
                <span className="text-[10px] text-slate-500 font-semibold">Guru & Walas</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-center">
                <span className="block text-base font-black text-indigo-600">{pendingRestore.countMapel}</span>
                <span className="text-[10px] text-slate-500 font-semibold">Mata Pelajaran</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-center">
                <span className="block text-base font-black text-cyan-600">{pendingRestore.countKelas}</span>
                <span className="text-[10px] text-slate-500 font-semibold">Kelas / Rombel</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-center">
                <span className="block text-base font-black text-purple-600">{pendingRestore.countNilai}</span>
                <span className="text-[10px] text-slate-500 font-semibold">Entri Nilai</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-center">
                <span className="block text-base font-black text-teal-600">{pendingRestore.countJadwal}</span>
                <span className="text-[10px] text-slate-500 font-semibold">Jadwal</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-center">
                <span className="block text-base font-black text-rose-600">{pendingRestore.countAbsensi || 0}</span>
                <span className="text-[10px] text-slate-500 font-semibold">Presensi / Absensi</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-center">
                <span className="block text-base font-black text-blue-600">{pendingRestore.countPPDB || 0}</span>
                <span className="text-[10px] text-slate-500 font-semibold">Calon Siswa PPDB</span>
              </div>
            </div>

            {/* Smart Merge Protection Info */}
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-left">
                <span className="font-bold text-emerald-950 block">Proteksi Data Pintar Aktif:</span>
                <span className="text-[11px] text-emerald-800 leading-relaxed block">
                  Tempat & Tanggal Lahir (TTL), Tahun Masuk, dan Id Guru resmi tetap terjaga dan tidak akan terhapus meskipun berkas cadangan ini dibuat sebelum data tersebut ada.
                </span>
              </div>
            </div>

            {restoreError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{restoreError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setPendingRestore(null);
                  setRestoreError(null);
                }}
                disabled={isRestoring}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={isRestoring}
                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs shadow-md flex items-center gap-2"
              >
                {isRestoring ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Memulihkan & Sinkronisasi...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Ya, Pulihkan & Sinkron ke Cloud</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HASIL PEMULIHAN BERHASIL (SUCCESS RESTORE CONFIRMATION) */}
      {restoreSuccessData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 border-2 border-emerald-300">
            <div className="flex items-center gap-3.5 text-emerald-800">
              <span className="p-3 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-700 shrink-0">
                <CheckCircle2 className="w-8 h-8" />
              </span>
              <div>
                <h3 className="text-lg font-black text-slate-900">Pemulihan Database Berhasil!</h3>
                <p className="text-xs text-emerald-700 font-semibold">
                  Sumber: {restoreSuccessData.fileName}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Seluruh data dari berkas cadangan telah berhasil dipulihkan ke sistem dan disinkronkan secara otomatis ke Cloud Firestore:
            </p>

            {/* Rincian Entitas Data */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200">
              <div className="bg-white p-2.5 rounded-xl border border-emerald-200 text-center shadow-xs">
                <span className="block text-lg font-black text-emerald-700">{restoreSuccessData.countSiswa}</span>
                <span className="text-[10px] text-slate-600 font-semibold">Data Siswa</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-emerald-200 text-center shadow-xs">
                <span className="block text-lg font-black text-amber-700">{restoreSuccessData.countGuru}</span>
                <span className="text-[10px] text-slate-600 font-semibold">Guru & Staf</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-emerald-200 text-center shadow-xs">
                <span className="block text-lg font-black text-indigo-700">{restoreSuccessData.countMapel}</span>
                <span className="text-[10px] text-slate-600 font-semibold">Mata Pelajaran</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-emerald-200 text-center shadow-xs">
                <span className="block text-lg font-black text-cyan-700">{restoreSuccessData.countKelas}</span>
                <span className="text-[10px] text-slate-600 font-semibold">Kelas / Rombel</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-emerald-200 text-center shadow-xs">
                <span className="block text-lg font-black text-purple-700">{restoreSuccessData.countNilai}</span>
                <span className="text-[10px] text-slate-600 font-semibold">Entri Nilai</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-emerald-200 text-center shadow-xs">
                <span className="block text-lg font-black text-teal-700">{restoreSuccessData.countJadwal}</span>
                <span className="text-[10px] text-slate-600 font-semibold">Jadwal</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-emerald-200 text-center shadow-xs">
                <span className="block text-lg font-black text-rose-700">{restoreSuccessData.countAbsensi || 0}</span>
                <span className="text-[10px] text-slate-600 font-semibold">Presensi</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-emerald-200 text-center shadow-xs">
                <span className="block text-lg font-black text-blue-700">{restoreSuccessData.countPPDB || 0}</span>
                <span className="text-[10px] text-slate-600 font-semibold">PPDB</span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 font-medium flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Sistem siap digunakan! Seluruh data Anda telah terpasang rapi dan sinkron ke seluruh perangkat.</span>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRestoreSuccessData(null)}
                className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                Selesai & Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ERROR PEMBACAAN BERKAS CADANGAN */}
      {restoreErrorModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border-2 border-rose-300">
            <div className="flex items-center gap-3 text-rose-700">
              <span className="p-2.5 rounded-2xl bg-rose-50 border border-rose-200 shrink-0">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">Gagal Membaca Berkas Cadangan</h3>
                <p className="text-xs text-rose-600 font-medium">Format Berkas Tidak Dikenali</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-rose-50 p-3 rounded-xl border border-rose-200">
              {restoreErrorModal}
            </p>

            <p className="text-[11px] text-slate-500">
              Pastikan berkas yang Anda pilih berformat <strong>.json</strong> hasil unduhan resmi cadangan database SMK Bakti Putra Mandiri.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setRestoreErrorModal(null);
                  handleFullBackup();
                }}
                className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Cadangan Database Baru Sekarang</span>
              </button>
              <button
                type="button"
                onClick={() => setRestoreErrorModal(null)}
                className="w-full sm:w-auto px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs shadow-sm cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL SELECTIVE RESET */}
      {resetConfirmAction && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-rose-300">
            <div className="flex items-center gap-3 text-rose-600">
              <ShieldAlert className="w-8 h-8 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {resetConfirmAction === 'calon' && 'Reset Calon Siswa (PPDB)'}
                  {resetConfirmAction === 'nilai' && 'Reset Data Nilai & Leger'}
                  {resetConfirmAction === 'absensi' && 'Reset Riwayat Presensi'}
                </h3>
                <p className="text-xs text-rose-600 font-semibold">Tindakan ini permanen dan tidak dapat dibatalkan.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              {resetConfirmAction === 'calon' && 'Apakah Anda yakin ingin menghapus seluruh formulir pendaftaran calon siswa baru (PPDB)?'}
              {resetConfirmAction === 'template_siswa' && 'Apakah Anda yakin ingin menghapus permanen seluruh data siswa bawaan/template (ID generator) dari sistem, browser, dan cloud database? Siswa asli yang ditambahkan manual atau diimpor sekolah tetap aman.'}
              {resetConfirmAction === 'nilai' && 'Apakah Anda yakin ingin mengosongkan seluruh riwayat dan leger nilai siswa?'}
              {resetConfirmAction === 'absensi' && 'Apakah Anda yakin ingin menghapus seluruh riwayat absensi barcode/QR Code siswa?'}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setResetConfirmAction(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (resetConfirmAction === 'calon') {
                    onResetCalonSiswa();
                    notify('Data calon siswa PPDB berhasil direset.');
                  } else if (resetConfirmAction === 'template_siswa') {
                    if (onClearTemplateStudents) {
                      onClearTemplateStudents();
                      notify('Data siswa bawaan template sistem berhasil dibersihkan permanen.');
                    }
                  } else if (resetConfirmAction === 'nilai') {
                    onResetNilai();
                    notify('Data nilai dan leger berhasil dikosongkan.');
                  } else if (resetConfirmAction === 'absensi') {
                    onResetAbsensi();
                    notify('Riwayat presensi siswa berhasil direset.');
                  }
                  setResetConfirmAction(null);
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-md"
              >
                Ya, Lanjutkan Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL FULL RESET */}
      {showFullResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-rose-300">
            <div className="flex items-center gap-3 text-rose-600">
              <ShieldAlert className="w-8 h-8 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-slate-900">Konfirmasi Reset Database Total</h3>
                <p className="text-xs text-rose-600 font-semibold">Tindakan ini menghapus seluruh rekaman data.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Untuk melanjutkan, ketik kata <strong className="font-mono bg-rose-100 text-rose-900 px-1 py-0.5 rounded">RESET</strong> pada kolom di bawah ini:
            </p>

            <input
              type="text"
              value={confirmResetText}
              onChange={(e) => setConfirmResetText(e.target.value)}
              placeholder="Ketik RESET"
              className="w-full px-3.5 py-2.5 rounded-xl border border-rose-300 font-mono text-center font-bold text-sm tracking-widest focus:ring-2 focus:ring-rose-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowFullResetModal(false);
                  setConfirmResetText('');
                }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteFullReset}
                disabled={confirmResetText !== 'RESET'}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white rounded-xl font-bold text-xs shadow-md"
              >
                Konfirmasi & Reset Database
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
