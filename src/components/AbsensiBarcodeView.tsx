import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, AbsensiRecord, Kelas, SchoolInfo } from '../types';
import { SquareQrCode } from './SquareQrCode';
import { KopSuratView } from './KopSuratView';
import { canPrintKartuRombel, isRecordForStudent, cleanScannedQrString, normalizeKelas, isSameKelas, getLocalDateString, getLocalTimeString, isHariSekolahEfektif, getNamaHariIndo, getDateForDayInSameWeek, isWeekend, getAlasanHariTidakEfektif } from '../utils/academicHelpers';
import { 
  Scan, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  UserCheck, 
  Search, 
  Calendar, 
  Download, 
  Printer, 
  Filter, 
  UserX, 
  RefreshCw, 
  QrCode, 
  Volume2, 
  VolumeX, 
  Plus, 
  FileSpreadsheet,
  BadgeCheck,
  Trash2,
  Sparkles,
  Zap,
  RotateCcw,
  Check,
  ShieldCheck,
  UserCheck2,
  Camera,
  Percent,
  Users,
  CheckCheck,
  XCircle,
  RotateCw,
  LayoutTemplate,
  Smartphone,
  CalendarCheck,
  Upload,
  BarChart3
} from 'lucide-react';
import jsQR from 'jsqr';
import { printDocumentArea } from '../utils/printHelper';
import { downloadTemplateAbsensiExcel, parseAbsensiSpreadsheet } from '../utils/excelHelper';
import { MonthlyAttendanceDashboard } from './MonthlyAttendanceDashboard';
import { ensureSeptemberAttendance } from '../data/mockAcademicData';

interface AbsensiBarcodeViewProps {
  currentUser: User;
  usersList?: User[];
  allUsersList?: User[];
  kelasList: Kelas[];
  absensiList: AbsensiRecord[];
  onAddAbsensi: (record: AbsensiRecord) => void;
  onUpdateAbsensi: (record: AbsensiRecord) => void;
  onDeleteAbsensi: (id: string) => void;
  onBatchAddAbsensi?: (records: AbsensiRecord[], overwrite?: boolean) => void;
  onResetTodayAbsensi?: (tanggal: string) => void;
  onAutoAbsenAll?: (kelas: string, tanggal: string) => void;
  schoolInfo?: SchoolInfo;
}

export const AbsensiBarcodeView: React.FC<AbsensiBarcodeViewProps> = ({
  currentUser,
  usersList = [],
  allUsersList = [],
  kelasList,
  absensiList: rawAbsensiList = [],
  onAddAbsensi,
  onBatchAddAbsensi,
  onUpdateAbsensi,
  onDeleteAbsensi,
  onResetTodayAbsensi,
  onAutoAbsenAll,
  schoolInfo,
}) => {
  const absensiList = useMemo(() => ensureSeptemberAttendance(rawAbsensiList), [rawAbsensiList]);
  const effectiveUsersList = usersList.length > 0 ? usersList : allUsersList;
  const canPrintKartu = canPrintKartuRombel(currentUser, kelasList);
  const [activeTab, setActiveTab] = useState<'scanner' | 'dasbor_tren' | 'riwayat' | 'qr_harian' | 'kartu_qr'>('scanner');
  const [barcodeInput, setBarcodeInput] = useState('');
  const todayIso = getLocalDateString();
  const [currentDateString, setCurrentDateString] = useState<string>(todayIso);
  const [selectedStatus, setSelectedStatus] = useState<'Hadir' | 'Terlambat' | 'Sakit' | 'Izin' | 'Alpa'>('Hadir');
  const [keteranganInput, setKeteranganInput] = useState('');
  const [filterKelas, setFilterKelas] = useState<string>('Semua');
  const [filterTanggalMulai, setFilterTanggalMulai] = useState<string>(todayIso);
  const [filterTanggalSelesai, setFilterTanggalSelesai] = useState<string>(todayIso);
  const [filterTanggal, setFilterTanggal] = useState<string>(todayIso); // Backward compatibility

  // Modal Presensi Otomatis (Per Kelas atau Semua Kelas, Sesuai Tanggal Bebas yang Dipilih)
  const [showAutoAbsenModal, setShowAutoAbsenModal] = useState(false);
  const [autoAbsenTanggal, setAutoAbsenTanggal] = useState<string>(todayIso);
  const [autoAbsenKelas, setAutoAbsenKelas] = useState<string>('Semua');
  const [autoAbsenStatus, setAutoAbsenStatus] = useState<'Hadir' | 'Terlambat' | 'Sakit' | 'Izin' | 'Alpa'>('Hadir');
  const [autoAbsenMode, setAutoAbsenMode] = useState<'belum_ada' | 'semua'>('belum_ada');
  const [autoAbsenKeterangan, setAutoAbsenKeterangan] = useState('Otomatis Ditandai Hadir oleh Petugas');

  // Auto-detect when day transitions or tab is refocused on a new day
  useEffect(() => {
    const handleDateSync = () => {
      const liveToday = getLocalDateString();
      if (liveToday !== currentDateString) {
        setCurrentDateString(liveToday);
        setFilterTanggalMulai(liveToday);
        setFilterTanggalSelesai(liveToday);
        setFilterTanggal(liveToday);
      }
    };

    const interval = setInterval(handleDateSync, 15000);
    window.addEventListener('focus', handleDateSync);
    window.addEventListener('visibilitychange', handleDateSync);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleDateSync);
      window.removeEventListener('visibilitychange', handleDateSync);
    };
  }, [currentDateString]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastScannedStudent, setLastScannedStudent] = useState<{ student: User; record: AbsensiRecord } | null>(null);
  const [searchStudentQuery, setSearchStudentQuery] = useState('');
  const [printFilterKelas, setPrintFilterKelas] = useState<string>('Semua');
  const [cardOrientation, setCardOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [printScope, setPrintScope] = useState<'semua' | 'hadir' | 'tidak_hadir'>('semua');
  const [qrTokenSuffix, setQrTokenSuffix] = useState<string>(Math.random().toString(36).substring(2, 6).toUpperCase());
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [riwayatViewMode, setRiwayatViewMode] = useState<'rombel_semua' | 'log_tercatat'>('rombel_semua');
  const [riwayatLayout, setRiwayatLayout] = useState<'kartu' | 'tabel'>('kartu');
  const [searchRiwayatQuery, setSearchRiwayatQuery] = useState('');
  const [isAllDates, setIsAllDates] = useState(false);

  // Modal Import Absensi Excel / CSV State
  const [showImportExcelModal, setShowImportExcelModal] = useState(false);
  const [importRecordsPreview, setImportRecordsPreview] = useState<AbsensiRecord[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importIsLoading, setImportIsLoading] = useState(false);
  const [importUnmatched, setImportUnmatched] = useState<string[]>([]);
  const [importTab, setImportTab] = useState<'upload' | 'september_otomatis' | 'template'>('upload');
  const [septemberTargetKelas, setSeptemberTargetKelas] = useState<string>('Semua');
  const [septemberStatus, setSeptemberStatus] = useState<'Hadir' | 'Terlambat' | 'Sakit' | 'Izin' | 'Alpa'>('Hadir');
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // Helper format tanggal Indonesia
  const formatTanggalIndo = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const date = new Date(year, month, day);
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      }
    } catch (_) {}
    return dateStr;
  };

  const scannerInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const lastScannedTimeRef = useRef<number>(0);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
  };

  const startCameraStream = async (facing: 'environment' | 'user' = cameraFacing) => {
    stopCameraStream();
    setCameraError(null);
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 720 }, height: { ideal: 720 } }
        });
      } catch {
        // Fallback without strict constraints
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      streamRef.current = stream;
      setIsCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.warn);
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError('Izin kamera tidak diberikan atau perangkat tidak mendukung. Pastikan izin kamera aktif pada browser.');
      setIsCameraActive(false);
    }
  };

  // Toggle Camera
  const toggleCamera = async () => {
    if (isCameraActive) {
      stopCameraStream();
      setIsCameraActive(false);
      setCameraError(null);
    } else {
      await startCameraStream(cameraFacing);
    }
  };

  // Switch between front and rear camera
  const toggleCameraFacing = async () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    if (isCameraActive) {
      await startCameraStream(nextFacing);
    }
  };

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  // Attach stream to video ref when isCameraActive changes
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(console.warn);
    }
  }, [isCameraActive]);

  // Real-time camera QR/Barcode frame scan loop using jsQR
  useEffect(() => {
    if (!isCameraActive) {
      if (scanLoopRef.current) {
        cancelAnimationFrame(scanLoopRef.current);
        scanLoopRef.current = null;
      }
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const scanFrame = () => {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const video = videoRef.current;
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            });

            if (code && code.data && code.data.trim()) {
              const now = Date.now();
              // Prevent duplicate triggers within 2 seconds
              if (now - lastScannedTimeRef.current > 2000) {
                lastScannedTimeRef.current = now;
                handleProcessScan(code.data.trim());
              }
            }
          }
        }
      }
      scanLoopRef.current = requestAnimationFrame(scanFrame);
    };

    scanLoopRef.current = requestAnimationFrame(scanFrame);

    return () => {
      if (scanLoopRef.current) {
        cancelAnimationFrame(scanLoopRef.current);
        scanLoopRef.current = null;
      }
    };
  }, [isCameraActive]);

  // Class Officer identification
  const isPengurusKelas = Boolean(
    currentUser.isKetuaKelas || 
    (currentUser.jabatanKelas && currentUser.jabatanKelas !== 'Anggota')
  );
  const isSuperAdmin = currentUser.role === 'admin' || currentUser.role === 'staf';
  const isWalas = currentUser.role === 'walas' || currentUser.isWalas || kelasList.some(k => 
    k.idWalas === currentUser.id || 
    (currentUser.nipOrNis && k.idWalas === currentUser.nipOrNis) ||
    k.namaWalas?.toLowerCase() === currentUser.nama?.toLowerCase() ||
    (currentUser.walasKelasId && (k.id === currentUser.walasKelasId || currentUser.walasKelasId.includes(k.id)))
  );
  // Full attendance manager: Admin, Staf, or Walas
  const isFullAttendanceManager = isSuperAdmin || isWalas;
  const isStafOrAdmin = isSuperAdmin || currentUser.role === 'walas' || currentUser.role === 'guru';
  const pengurusClass = currentUser.kelas || currentUser.namaKelas || '';

  // Auto-switch to scanner if regular teacher somehow lands on qr_harian or kartu_qr
  useEffect(() => {
    if (!isFullAttendanceManager && activeTab === 'qr_harian') {
      setActiveTab('scanner');
    }
    if (!canPrintKartu && activeTab === 'kartu_qr') {
      setActiveTab('scanner');
    }
  }, [isFullAttendanceManager, canPrintKartu, activeTab]);

  // Filter students based on role permission
  const allSiswa = effectiveUsersList.filter(u => u.role === 'siswa');
  const siswaList = (isPengurusKelas && !isStafOrAdmin && pengurusClass)
    ? allSiswa.filter(s => isSameKelas(s.kelas, pengurusClass) || isSameKelas(s.namaKelas, pengurusClass))
    : allSiswa;

  // Auto-set filterKelas for Class Officer
  useEffect(() => {
    if (isPengurusKelas && !isStafOrAdmin && pengurusClass) {
      setFilterKelas(pengurusClass);
      setPrintFilterKelas(pengurusClass);
    }
  }, [isPengurusKelas, isStafOrAdmin, pengurusClass]);

  // Play audio beep
  const playBeep = (type: 'success' | 'warning' | 'error' = 'success') => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc.frequency.setValueAtTime(1320, audioCtx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      } else {
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.setValueAtTime(330, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      }
    } catch {
      // Audio might be blocked
    }
  };

  useEffect(() => {
    if (activeTab === 'scanner') {
      scannerInputRef.current?.focus();
    }
  }, [activeTab]);

  const handleProcessScan = (scannedNipdOrNisn: string) => {
    const rawQuery = scannedNipdOrNisn.trim();
    if (!rawQuery) return;
    const cleanQuery = cleanScannedQrString(rawQuery);
    const query = cleanQuery.toLowerCase();
    const dotlessQuery = query.replace(/\./g, '');

    // Find student by ID, NIPD, NISN, username, or name
    const matched = siswaList.find(s => {
      if (s.id === cleanQuery) return true;
      if (s.nipd && (s.nipd.toLowerCase() === query || s.nipd.replace(/\./g, '') === dotlessQuery)) return true;
      if (s.nipOrNis && (s.nipOrNis.toLowerCase() === query || s.nipOrNis.replace(/\./g, '') === dotlessQuery)) return true;
      if (s.nisn && s.nisn.toLowerCase() === query) return true;
      if (s.username && s.username.toLowerCase() === query) return true;
      if (s.nama && s.nama.toLowerCase() === query) return true;
      if (s.nama && s.nama.replace(/[^a-z0-9]/gi, '').toLowerCase() === query.replace(/[^a-z0-9]/gi, '').toLowerCase()) return true;
      return false;
    });

    if (!matched) {
      playBeep('error');
      alert(`Siswa dengan QR Code / NIPD / NISN "${rawQuery}" tidak ditemukan.`);
      setBarcodeInput('');
      return;
    }

    const now = new Date();
    const timeStr = getLocalTimeString(now, true);
    const dateStr = getLocalDateString(now);

    // Sekolah 5 hari: Sabtu & Minggu libur, dan Tanggal Merah / Libur Nasional libur
    if (!isHariSekolahEfektif(dateStr)) {
      playBeep('warning');
      const alasan = getAlasanHariTidakEfektif(dateStr) || 'Hari Libur';
      alert(`Hari ini (${getNamaHariIndo(dateStr)}, ${dateStr}) adalah ${alasan}. Presensi otomatis ditiadakan.`);
      setBarcodeInput('');
      return;
    }

    const existing = absensiList.find(a => 
      isRecordForStudent(a, matched) && a.tanggal === dateStr
    );

    if (existing) {
      playBeep('warning');
      alert(`Pemberitahuan Presensi:\nSiswa "${matched.nama}" SUDAH tercatat hadir untuk hari ini (${dateStr}) dengan status [${existing.status}] pada pukul ${existing.waktu || '-'} WIB.\nCatatan tidak diulang agar tidak terjadi data presensi ganda.`);
      setBarcodeInput('');
      setLastScannedStudent({ student: matched, record: existing });
      scannerInputRef.current?.focus();
      return;
    }

    const newRecord: AbsensiRecord = {
      id: `abs-${Date.now()}-${matched.id}`,
      userId: matched.id,
      nipd: matched.nipd || matched.nipOrNis,
      nisn: matched.nisn || matched.username,
      namaSiswa: matched.nama,
      kelas: (matched.kelas || matched.namaKelas || 'XII').replace(/^Kelas\s+/i, ''),
      tanggal: dateStr,
      waktu: timeStr,
      status: selectedStatus,
      metode: 'QR Code Scan',
      keterangan: keteranganInput || (selectedStatus === 'Terlambat' ? 'Presensi Terlambat' : 'Hadir Tepat Waktu'),
      petugas: `${currentUser.nama} (${isPengurusKelas ? currentUser.jabatanKelas || 'Pengurus Kelas' : currentUser.role})`,
    };

    onAddAbsensi(newRecord);

    playBeep(selectedStatus === 'Hadir' ? 'success' : 'warning');
    setLastScannedStudent({ student: matched, record: newRecord });
    setBarcodeInput('');
    scannerInputRef.current?.focus();
  };

  // Perhitungan Target Siswa & Statistik untuk Modal Presensi Otomatis
  const autoAbsenTargetStudents = useMemo(() => {
    if (autoAbsenKelas === 'Semua') {
      return siswaList;
    }
    return siswaList.filter(s => {
      if (isSameKelas(s.kelas, autoAbsenKelas) || isSameKelas(s.namaKelas, autoAbsenKelas)) return true;
      if (s.idKelas) {
        const kObj = kelasList.find(k => k.id === s.idKelas);
        if (kObj && (isSameKelas(kObj.namaKelas, autoAbsenKelas) || kObj.id === autoAbsenKelas)) return true;
      }
      return false;
    });
  }, [siswaList, autoAbsenKelas, kelasList]);

  const autoAbsenStats = useMemo(() => {
    const targetDate = autoAbsenTanggal || todayIso;
    let existingCount = 0;
    let unmarkedCount = 0;

    autoAbsenTargetStudents.forEach(s => {
      const hasRecord = absensiList.some(a => isRecordForStudent(a, s) && a.tanggal === targetDate);
      if (hasRecord) {
        existingCount++;
      } else {
        unmarkedCount++;
      }
    });

    const willMarkCount = autoAbsenMode === 'belum_ada' ? unmarkedCount : autoAbsenTargetStudents.length;

    return {
      total: autoAbsenTargetStudents.length,
      existingCount,
      unmarkedCount,
      willMarkCount
    };
  }, [autoAbsenTargetStudents, absensiList, autoAbsenTanggal, autoAbsenMode, todayIso]);

  // Buka Modal Presensi Otomatis dengan pre-fill kelas dan tanggal
  const handleOpenAutoAbsenModal = (initialKelas?: string, initialTanggal?: string) => {
    const targetD = initialTanggal || (isAllDates ? todayIso : (filterTanggalMulai || todayIso));
    const targetK = initialKelas || filterKelas || 'Semua';
    setAutoAbsenTanggal(targetD);
    setAutoAbsenKelas(targetK);
    setAutoAbsenStatus('Hadir');
    setAutoAbsenMode('belum_ada');
    setAutoAbsenKeterangan('Otomatis Ditandai Hadir oleh Petugas');
    setShowAutoAbsenModal(true);
  };

  const handleAutoAbsenHadir = () => {
    handleOpenAutoAbsenModal(filterKelas, isAllDates ? todayIso : (filterTanggalMulai || todayIso));
  };

  // Eksekusi Presensi Otomatis Sesuai Tanggal dan Kelas
  const handleExecuteAutoAbsen = () => {
    const targetDate = autoAbsenTanggal || todayIso;
    const isEffective = isHariSekolahEfektif(targetDate);

    if (!isEffective) {
      const alasan = getAlasanHariTidakEfektif(targetDate) || 'Hari Libur';
      const confirmWeekend = window.confirm(
        `Perhatian:\nTanggal ${formatTanggalIndo(targetDate)} (${getNamaHariIndo(targetDate)}) adalah ${alasan}.\n\nApakah Anda yakin ingin tetap memproses presensi siswa untuk tanggal ini (misalnya kegiatan ekstrakurikuler, remedial, atau kegiatan sekolah khusus)?`
      );
      if (!confirmWeekend) return;
    }

    if (autoAbsenTargetStudents.length === 0) {
      alert(`Tidak ada siswa terdaftar pada pilihan rombel "${autoAbsenKelas}". Silakan periksa data siswa.`);
      return;
    }

    const timeStr = getLocalTimeString();
    const recordsToCreate: AbsensiRecord[] = [];
    const recordsToUpdate: AbsensiRecord[] = [];

    autoAbsenTargetStudents.forEach(s => {
      const nipdKey = s.nipd || s.nipOrNis;
      const existing = absensiList.find(a => isRecordForStudent(a, s) && a.tanggal === targetDate);
      const cleanKelas = (s.kelas || s.namaKelas || (autoAbsenKelas !== 'Semua' ? autoAbsenKelas : 'XII')).replace(/^Kelas\s+/i, '');

      if (!existing) {
        const record: AbsensiRecord = {
          id: `abs-auto-${Date.now()}-${s.id}-${Math.random().toString(36).substring(2, 6)}`,
          userId: s.id,
          nipd: nipdKey,
          nisn: s.nisn || s.username,
          namaSiswa: s.nama,
          kelas: cleanKelas,
          tanggal: targetDate,
          waktu: timeStr,
          status: autoAbsenStatus,
          metode: 'Manual',
          keterangan: autoAbsenKeterangan || `Otomatis Ditandai ${autoAbsenStatus} oleh Petugas`,
          petugas: `${currentUser.nama} (${isPengurusKelas ? currentUser.jabatanKelas || 'Pengurus Kelas' : currentUser.role})`,
        };
        recordsToCreate.push(record);
      } else if (autoAbsenMode === 'semua') {
        const updatedRecord: AbsensiRecord = {
          ...existing,
          status: autoAbsenStatus,
          keterangan: autoAbsenKeterangan || `Otomatis Diperbarui menjadi ${autoAbsenStatus}`,
          petugas: `${currentUser.nama} (${isPengurusKelas ? currentUser.jabatanKelas || 'Pengurus Kelas' : currentUser.role})`,
        };
        recordsToUpdate.push(updatedRecord);
      }
    });

    const totalProcessed = recordsToCreate.length + recordsToUpdate.length;

    if (totalProcessed === 0) {
      alert(`Seluruh ${autoAbsenTargetStudents.length} siswa pada rombel ini sudah memiliki catatan presensi pada tanggal ${formatTanggalIndo(targetDate)} (${targetDate}).\n\nPilih mode "Perbarui seluruh siswa" jika ingin menimpa status kehadiran mereka.`);
      return;
    }

    // Update existing records
    recordsToUpdate.forEach(r => onUpdateAbsensi(r));

    // Batch add new records
    if (recordsToCreate.length > 0) {
      if (onBatchAddAbsensi) {
        onBatchAddAbsensi(recordsToCreate, autoAbsenMode === 'semua');
      } else {
        recordsToCreate.forEach(r => onAddAbsensi(r));
      }
    }

    playBeep('success');
    setShowAutoAbsenModal(false);
    alert(
      `Berhasil memproses presensi [${autoAbsenStatus}] untuk ${totalProcessed} siswa pada ${
        autoAbsenKelas === 'Semua' ? 'seluruh kelas' : `kelas ${autoAbsenKelas}`
      } tanggal ${formatTanggalIndo(targetDate)} (${targetDate})!`
    );
  };

  // Unduh Template Excel Presensi Siswa
  const handleDownloadTemplate = () => {
    downloadTemplateAbsensiExcel(effectiveUsersList, '2026-09');
  };

  // Handler Pilih Berkas Spreadsheet (Excel / CSV)
  const handleSelectImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    setImportError(null);
    setImportIsLoading(true);

    try {
      const parsed = await parseAbsensiSpreadsheet(file, effectiveUsersList, currentUser.nama || 'Petugas');
      setImportRecordsPreview(parsed.records);
      setImportUnmatched(parsed.unmatched);
      if (parsed.records.length === 0) {
        setImportError('Tidak ada baris data absensi yang valid terdeteksi dalam berkas ini.');
      }
    } catch (err: any) {
      setImportError(err?.message || 'Gagal membaca berkas spreadsheet');
      setImportRecordsPreview([]);
    } finally {
      setImportIsLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  // Konfirmasi Impor Berkas Presensi ke Database
  const handleConfirmImport = () => {
    if (importRecordsPreview.length === 0) return;
    if (onBatchAddAbsensi) {
      onBatchAddAbsensi(importRecordsPreview, false);
    } else {
      importRecordsPreview.forEach(r => onAddAbsensi(r));
    }
    playBeep('success');
    setShowImportExcelModal(false);
    alert(`✅ Berhasil mengimpor ${importRecordsPreview.length} data absensi siswa dari berkas "${importFileName}" ke sistem!`);
    setImportRecordsPreview([]);
    setImportFileName('');
  };

  // Generate Otomatis Presensi Seluruh Hari Efektif Bulan September 2026
  const handleGenerateFullSeptember2026 = () => {
    const septEffectiveDates: string[] = [];
    for (let day = 1; day <= 30; day++) {
      const dateStr = `2026-09-${String(day).padStart(2, '0')}`;
      if (isHariSekolahEfektif(dateStr)) {
        septEffectiveDates.push(dateStr);
      }
    }

    const studentList = effectiveUsersList.filter(u => u.role === 'siswa');
    const targetStudents = septemberTargetKelas === 'Semua' 
      ? studentList 
      : studentList.filter(s => isSameKelas(s.kelas || s.namaKelas, septemberTargetKelas));

    if (targetStudents.length === 0) {
      alert(`Tidak ada data siswa ditemukan untuk kelas "${septemberTargetKelas}".`);
      return;
    }

    const recordsToCreate: AbsensiRecord[] = [];
    targetStudents.forEach(student => {
      const nipdKey = student.nipd || student.nipOrNis || student.id;
      septEffectiveDates.forEach(dateStr => {
        recordsToCreate.push({
          id: `abs-sept26-${nipdKey}-${dateStr}`,
          nipd: nipdKey,
          nisn: student.nisn || '',
          userId: student.id,
          namaSiswa: student.nama,
          kelas: student.kelas || student.namaKelas || 'X Farmasi 1',
          tanggal: dateStr,
          waktu: '07:15:00',
          status: septemberStatus,
          metode: 'Manual',
          keterangan: `Presensi Bulan September 2026 (${septemberStatus})`,
          petugas: currentUser.nama || 'Petugas Absensi',
        });
      });
    });

    if (onBatchAddAbsensi) {
      onBatchAddAbsensi(recordsToCreate, true);
    } else {
      recordsToCreate.forEach(r => onAddAbsensi(r));
    }

    playBeep('success');
    setShowImportExcelModal(false);
    alert(
      `✅ Berhasil memasukkan presensi [${septemberStatus}] Bulan September 2026 untuk ${targetStudents.length} siswa ` +
      `pada ${septemberTargetKelas === 'Semua' ? 'seluruh kelas' : `kelas ${septemberTargetKelas}`} ` +
      `(${septEffectiveDates.length} hari efektif KBM, total ${recordsToCreate.length} catatan kehadiran)!`
    );
  };

  // Quick 1-Touch attendance status setter for Admin, Walas, and Pengurus Kelas
  const handleQuickStudentStatus = (student: User, status: 'Hadir' | 'Terlambat' | 'Sakit' | 'Izin' | 'Alpa') => {
    const liveToday = getLocalDateString();
    // Prioritaskan tanggal yang sedang dipilih pada filter tanggal agar bisa absen di tanggal mana pun
    const targetDate = filterTanggal || (isDateRange ? (filterTanggalMulai || liveToday) : liveToday);

    const now = new Date();
    const timeStr = getLocalTimeString(now, true);
    const nipdKey = student.nipd || student.nipOrNis;
    const existing = absensiList.find(a => isRecordForStudent(a, student) && a.tanggal === targetDate);

    const record: AbsensiRecord = {
      id: existing ? existing.id : `abs-manual-${Date.now()}-${student.id}`,
      userId: student.id,
      nipd: nipdKey,
      nisn: student.nisn || student.username,
      namaSiswa: student.nama,
      kelas: (student.kelas || student.namaKelas || 'XII').replace(/^Kelas\s+/i, ''),
      tanggal: targetDate,
      waktu: timeStr,
      status: status,
      metode: isPengurusKelas && !isStafOrAdmin ? 'Pengurus Kelas (Manual)' : 'Manual',
      keterangan: status === 'Hadir' ? 'Hadir Tepat Waktu' : status === 'Terlambat' ? 'Presensi Terlambat' : `Keterangan: ${status}`,
      petugas: `${currentUser.nama} (${isPengurusKelas ? currentUser.jabatanKelas || 'Pengurus Kelas' : currentUser.role})`,
    };

    if (existing) {
      onUpdateAbsensi(record);
    } else {
      onAddAbsensi(record);
    }
    setLastScannedStudent({ student, record });
    playBeep(status === 'Hadir' ? 'success' : 'warning');
    if (navigator.vibrate) {
      try { navigator.vibrate(50); } catch (_) {}
    }
  };

  // Reset Presensi Hari Ini
  const handleResetToday = () => {
    const todayStr = filterTanggal || getLocalDateString();
    if (window.confirm(`Yakin ingin mereset/mengosongkan seluruh riwayat presensi pada tanggal ${todayStr}?`)) {
      if (onResetTodayAbsensi) {
        onResetTodayAbsensi(todayStr);
      } else {
        const recordsToday = absensiList.filter(a => a.tanggal === todayStr);
        recordsToday.forEach(r => onDeleteAbsensi(r.id));
      }
      playBeep('warning');
      alert(`Riwayat presensi tanggal ${todayStr} berhasil direset.`);
    }
  };

  // Check if date range is active
  const isDateRange = filterTanggalMulai !== filterTanggalSelesai;

  // Daftar seluruh siswa aktif dalam rombel / kelas yang dipilih untuk analisis statistik & cetak presensi
  const cohortStudents = siswaList
    .filter(s => filterKelas === 'Semua' || isSameKelas(s.kelas, filterKelas) || isSameKelas(s.namaKelas, filterKelas))
    .sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));

  // Attendance records within the selected date range and class (WITHOUT search filter, to ensure accurate presence calculation)
  const cohortRecords = absensiList.filter(rec => {
    const matchTanggal = isAllDates || (
      (!filterTanggalMulai || rec.tanggal >= filterTanggalMulai) &&
      (!filterTanggalSelesai || rec.tanggal <= filterTanggalSelesai)
    );
    const matchKelas = filterKelas === 'Semua' || 
                       isSameKelas(rec.kelas, filterKelas) ||
                       cohortStudents.some(s => isRecordForStudent(rec, s));

    return matchTanggal && matchKelas;
  });

  const todayStr = getLocalDateString();
  const isTodayEffective = isHariSekolahEfektif(todayStr);
  const selectedDateForSingleDay = filterTanggalMulai || todayStr;
  const isSelectedDateEffective = isHariSekolahEfektif(selectedDateForSingleDay);

  const todayRecords = absensiList
    .filter(a => a.tanggal === todayStr)
    .sort((a, b) => (b.waktu || '').localeCompare(a.waktu || ''));

  // Detailed attendance records for each student in the cohort (supports single date and date range)
  const detailedCohortAttendance = cohortStudents.map(student => {
    // Saring hanya hari sekolah efektif (Senin - Jumat) dan urutkan
    const rawStudentRecords = cohortRecords
      .filter(r => isRecordForStudent(r, student) && isHariSekolahEfektif(r.tanggal))
      .sort((a, b) => {
        const dComp = (b.tanggal || '').localeCompare(a.tanggal || '');
        if (dComp !== 0) return dComp;
        return (b.waktu || '').localeCompare(a.waktu || '');
      });

    // Deduplikasi per tanggal sehingga 1 tanggal sekolah efektif = tepat 1 catatan presensi
    const dateMap = new Map<string, AbsensiRecord>();
    rawStudentRecords.forEach(r => {
      if (!dateMap.has(r.tanggal)) {
        dateMap.set(r.tanggal, r);
      } else {
        const cur = dateMap.get(r.tanggal)!;
        if ((cur.status !== 'Hadir' && cur.status !== 'Terlambat') && (r.status === 'Hadir' || r.status === 'Terlambat')) {
          dateMap.set(r.tanggal, r);
        }
      }
    });
    const studentRecords = Array.from(dateMap.values());

    if (isDateRange || isAllDates) {
      const hCount = studentRecords.filter(r => r.status === 'Hadir').length;
      const tCount = studentRecords.filter(r => r.status === 'Terlambat').length;
      const sCount = studentRecords.filter(r => r.status === 'Sakit').length;
      const iCount = studentRecords.filter(r => r.status === 'Izin').length;
      const aCount = studentRecords.filter(r => r.status === 'Alpa').length;
      const totalSesi = hCount + tCount + sCount + iCount + aCount;
      const totalHadirSiswa = hCount + tCount;
      const persenHadirSiswa = totalSesi > 0 
        ? ((totalHadirSiswa / totalSesi) * 100).toFixed(1) 
        : '100.0';

      return {
        student,
        record: studentRecords[0] || null,
        status: `${totalHadirSiswa} Hari Hadir`,
        isHadir: totalHadirSiswa > 0,
        isTidakHadir: (sCount + iCount + aCount) > 0,
        waktu: `${totalSesi} Sesi`,
        metode: studentRecords[0]?.metode || 'Barcode/Manual',
        keterangan: Number(persenHadirSiswa) >= 90 ? 'Sangat Baik' : Number(persenHadirSiswa) >= 75 ? 'Baik' : 'Perlu Perhatian',
        hCount,
        tCount,
        sCount,
        iCount,
        aCount,
        totalSesi,
        totalHadirSiswa,
        persenHadirSiswa
      };
    }

    // Single day matching
    const matchedRecord = studentRecords[0];
    const isHadir = matchedRecord?.status === 'Hadir';
    const isTerlambat = matchedRecord?.status === 'Terlambat';
    const isSakit = matchedRecord?.status === 'Sakit';
    const isIzin = matchedRecord?.status === 'Izin';
    // Sekolah 5 hari: Sabtu & Minggu libur, jika tidak ada record di hari libur statusnya 'Hari Libur (Bukan Hari Efektif)'
    const isWeekend = !isSelectedDateEffective;
    const isAlpa = !isWeekend && (matchedRecord?.status === 'Alpa' || !matchedRecord);

    const statusDisplay = matchedRecord?.status || (isWeekend ? 'Hari Libur (Bukan Hari Efektif)' : 'Alpa / Belum Hadir');

    return {
      student,
      record: matchedRecord,
      status: statusDisplay,
      isHadir: isHadir || isTerlambat,
      isTidakHadir: isSakit || isIzin || isAlpa,
      waktu: matchedRecord?.waktu || (isWeekend ? 'Libur' : '-'),
      metode: matchedRecord?.metode || (matchedRecord ? 'Sistem' : isWeekend ? 'Libur 5 Hari Sekolah' : '-'),
      keterangan: matchedRecord?.keterangan || (matchedRecord ? '-' : isWeekend ? 'Hari libur akhir pekan (Sabtu-Minggu bukan hari efektif KBM)' : 'Belum melakukan absensi pada sesi ini'),
      hCount: isHadir ? 1 : 0,
      tCount: isTerlambat ? 1 : 0,
      sCount: isSakit ? 1 : 0,
      iCount: isIzin ? 1 : 0,
      aCount: isAlpa ? 1 : 0,
      totalSesi: matchedRecord ? 1 : isWeekend ? 0 : 1,
      totalHadirSiswa: (isHadir || isTerlambat) ? 1 : 0,
      persenHadirSiswa: isWeekend ? '100.0' : ((isHadir || isTerlambat) ? '100.0' : '0.0')
    };
  });

  // Filtered detailed cohort attendance based on multi-keyword search input
  const searchedCohortAttendance = useMemo(() => {
    const raw = searchRiwayatQuery.trim().toLowerCase();
    if (!raw) return detailedCohortAttendance;
    const tokens = raw.split(/\s+/).filter(Boolean);

    return detailedCohortAttendance.filter(({ student, record, status, metode, keterangan }) => {
      const studentFields = [
        student.nama,
        student.nipd,
        student.nipOrNis,
        student.nisn,
        student.username,
        student.kelas,
        student.namaKelas
      ].filter(Boolean).join(' ').toLowerCase();

      const recordFields = [
        record?.status,
        record?.metode,
        record?.petugas,
        record?.keterangan,
        record?.tanggal,
        record?.waktu,
        status,
        metode,
        keterangan
      ].filter(Boolean).join(' ').toLowerCase();

      const combined = `${studentFields} ${recordFields}`;
      return tokens.every(tok => combined.includes(tok));
    });
  }, [detailedCohortAttendance, searchRiwayatQuery]);

  // Mode 2: Filtered raw attendance logs matching date, class, and search query
  const filteredRecords = useMemo(() => {
    const raw = searchRiwayatQuery.trim().toLowerCase();
    const tokens = raw ? raw.split(/\s+/).filter(Boolean) : [];

    return cohortRecords.filter(rec => {
      if (tokens.length === 0) return true;
      const combined = [
        rec.namaSiswa,
        rec.nipd,
        rec.nisn,
        rec.kelas,
        rec.status,
        rec.metode,
        rec.petugas,
        rec.keterangan,
        rec.tanggal,
        rec.waktu
      ].filter(Boolean).join(' ').toLowerCase();

      return tokens.every(tok => combined.includes(tok));
    });
  }, [cohortRecords, searchRiwayatQuery]);

  const totalSiswaCohort = cohortStudents.length;
  const isMultiDay = isDateRange || isAllDates;
  const countHadirTepat = isMultiDay 
    ? detailedCohortAttendance.reduce((acc, d) => acc + d.hCount, 0)
    : detailedCohortAttendance.filter(d => d.record?.status === 'Hadir').length;
  const countHadirTerlambat = isMultiDay
    ? detailedCohortAttendance.reduce((acc, d) => acc + d.tCount, 0)
    : detailedCohortAttendance.filter(d => d.record?.status === 'Terlambat').length;
  const totalHadir = countHadirTepat + countHadirTerlambat;
  const countSakitCohort = isMultiDay
    ? detailedCohortAttendance.reduce((acc, d) => acc + d.sCount, 0)
    : detailedCohortAttendance.filter(d => d.record?.status === 'Sakit').length;
  const countIzinCohort = isMultiDay
    ? detailedCohortAttendance.reduce((acc, d) => acc + d.iCount, 0)
    : detailedCohortAttendance.filter(d => d.record?.status === 'Izin').length;
  const countAlpaCohort = isMultiDay
    ? detailedCohortAttendance.reduce((acc, d) => acc + d.aCount, 0)
    : (!isSelectedDateEffective ? 0 : detailedCohortAttendance.filter(d => d.record?.status === 'Alpa' || !d.record).length);
  const totalTidakHadir = countSakitCohort + countIzinCohort + countAlpaCohort;
  const grandTotalEntries = totalHadir + totalTidakHadir;

  const persenHadir = grandTotalEntries > 0 ? ((totalHadir / grandTotalEntries) * 100).toFixed(1) : (totalSiswaCohort > 0 ? ((totalHadir / totalSiswaCohort) * 100).toFixed(1) : '0.0');
  const persenSakit = grandTotalEntries > 0 ? ((countSakitCohort / grandTotalEntries) * 100).toFixed(1) : (totalSiswaCohort > 0 ? ((countSakitCohort / totalSiswaCohort) * 100).toFixed(1) : '0.0');
  const persenIzin = grandTotalEntries > 0 ? ((countIzinCohort / grandTotalEntries) * 100).toFixed(1) : (totalSiswaCohort > 0 ? ((countIzinCohort / totalSiswaCohort) * 100).toFixed(1) : '0.0');
  const persenAlpa = grandTotalEntries > 0 ? ((countAlpaCohort / grandTotalEntries) * 100).toFixed(1) : (totalSiswaCohort > 0 ? ((countAlpaCohort / totalSiswaCohort) * 100).toFixed(1) : '0.0');
  const persenTidakHadir = grandTotalEntries > 0 ? ((totalTidakHadir / grandTotalEntries) * 100).toFixed(1) : (totalSiswaCohort > 0 ? ((totalTidakHadir / totalSiswaCohort) * 100).toFixed(1) : '0.0');

  // Items to display in the modal based on selected scope
  const filteredDisplayList = detailedCohortAttendance.filter(item => {
    if (printScope === 'hadir') return item.isHadir;
    if (printScope === 'tidak_hadir') return item.isTidakHadir;
    return true; // 'semua'
  });

  const studentsToPrint = siswaList.filter(s => {
    if (printFilterKelas === 'Semua') return true;
    return isSameKelas(s.kelas, printFilterKelas) || isSameKelas(s.namaKelas, printFilterKelas);
  });

  // Daily QR Code String for Student Self-Attendance
  const dailyQrValue = `BPM-ABSEN|${todayStr}|${filterKelas === 'Semua' ? 'SEMUA' : filterKelas}|${qrTokenSuffix}`;

  return (
    <>
      <div className={`space-y-6 ${showPrintModal ? 'print:hidden' : ''}`}>
        {/* Header Banner */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
              <QrCode className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-800">
                  {isFullAttendanceManager ? 'Presensi & Absensi QR Code Terpadu' : 'Presensi Barcode Kelas'}
                </h2>
                {isPengurusKelas && !isStafOrAdmin && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300">
                    Mode Pengurus: {currentUser.jabatanKelas} ({pengurusClass})
                  </span>
                )}
                {currentUser.role === 'staf' && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold border border-blue-300">
                    Mode Staf Tata Usaha
                  </span>
                )}
                <span 
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs"
                  title="Sistem tersambung ke Firebase Firestore Real-time Cloud: seluruh scan barcode, QR code mandiri, dan GPS Geofence siswa tersinkronisasi instan di seluruh perangkat secara bersamaan tanpa reload."
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                  </span>
                  <span>Cloud Real-time Multi-Perangkat</span>
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {isFullAttendanceManager
                  ? 'Pindai Square QR Code kartu siswa, tayangkan QR Code harian mandiri, serta cetak kehadiran resmi. Sinkronisasi instan antar perangkat via Firebase Cloud.'
                  : 'Pindai barcode / QR kartu siswa untuk mencatat kehadiran peserta didik di dalam kelas secara real-time.'}
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Otomatis Absen Semua Hadir - Khusus Walas, Guru & Admin */}
          {(isFullAttendanceManager || currentUser.role === 'guru') && (
            <>
              <button
                onClick={handleAutoAbsenHadir}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title="Set presensi kehadiran siswa secara otomatis (per kelas atau semua kelas, sesuai tanggal terpilih)"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Otomatis Absen Hadir</span>
              </button>

              <button
                onClick={() => {
                  setImportRecordsPreview([]);
                  setImportFileName('');
                  setImportError(null);
                  setShowImportExcelModal(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title="Import data absensi siswa dari Excel / CSV atau isi penuh presensi Bulan September 2026"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import Absensi Excel</span>
              </button>
            </>
          )}

          {/* Cetak Kehadiran */}
          <button
            onClick={() => setShowPrintModal(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Kehadiran</span>
          </button>

          {/* Reset Presensi Hari Ini - Khusus Walas & Admin */}
          {isFullAttendanceManager && (
            <button
              onClick={handleResetToday}
              className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1.5 border border-rose-200 transition-all"
              title="Reset riwayat presensi hari ini"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Hari Ini</span>
            </button>
          )}

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-all ${
              soundEnabled
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}
            title={soundEnabled ? 'Suara Bunyi Pindai Aktif' : 'Suara Bunyi Pindai Nonaktif'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* BANNER NOTIFIKASI SUKSES PRESENSI TERAKHIR (TERLIHAT DI SELURUH TAB & HP) */}
      {lastScannedStudent && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 border-2 border-emerald-400 text-white shadow-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200 print:hidden">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/30 border border-emerald-400/50 flex items-center justify-center text-emerald-300 font-black text-base shrink-0 shadow-inner">
              {lastScannedStudent.student.nama.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-xs sm:text-sm text-white truncate">
                  {lastScannedStudent.student.nama}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase shadow-xs ${
                  lastScannedStudent.record.status === 'Hadir' ? 'bg-emerald-400 text-slate-950' :
                  lastScannedStudent.record.status === 'Terlambat' ? 'bg-amber-400 text-slate-950' :
                  lastScannedStudent.record.status === 'Sakit' ? 'bg-blue-400 text-slate-950' :
                  lastScannedStudent.record.status === 'Izin' ? 'bg-indigo-400 text-slate-950' :
                  'bg-rose-400 text-slate-950'
                }`}>
                  ● {lastScannedStudent.record.status}
                </span>
              </div>
              <p className="text-[11px] text-emerald-200 truncate mt-0.5">
                Kelas: <span className="font-bold text-white">{lastScannedStudent.record.kelas}</span> • NIPD: {lastScannedStudent.record.nipd} • Pukul: {lastScannedStudent.record.waktu} WIB ({lastScannedStudent.record.metode})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLastScannedStudent(null)}
            className="w-7 h-7 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-200 hover:text-white flex items-center justify-center text-xs font-bold transition-colors cursor-pointer shrink-0"
            title="Tutup konfirmasi"
          >
            ✕
          </button>
        </div>
      )}

      {/* BANNER NOTIFIKASI SISTEM 5 HARI SEKOLAH (SABTU & MINGGU LIBUR) */}
      {!isTodayEffective && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 shadow-xs flex items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-amber-200 text-amber-800 flex items-center justify-center shrink-0 font-bold">
              🏖️
            </span>
            <div className="text-xs">
              <span className="font-extrabold text-amber-950">
                Hari Ini {getNamaHariIndo(todayStr)}: Hari Libur Akhir Pekan (Sistem 5 Hari Sekolah)
              </span>
              <p className="text-[11px] text-amber-800">
                Sekolah menerapkan 5 hari efektif (Senin - Jumat). Hari Sabtu & Minggu bukan hari efektif KBM sehingga siswa tidak dihitung alpa/absen.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-amber-200/80 border border-amber-300 text-amber-900 text-[10px] font-black uppercase tracking-wider shrink-0">
            Libur KBM
          </span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3 print:hidden">
        <button
          onClick={() => setActiveTab('scanner')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'scanner'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Scan className="w-4 h-4" />
          <span>{isFullAttendanceManager ? 'Pemindai QR Code Siswa' : 'Pemindai Barcode Kelas'}</span>
        </button>

        <button
          onClick={() => setActiveTab('dasbor_tren')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'dasbor_tren'
              ? 'bg-emerald-700 text-white shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-emerald-500" />
          <span>Dasbor & Tren Bulanan (Recharts)</span>
        </button>

        {isFullAttendanceManager && (
          <button
            onClick={() => setActiveTab('qr_harian')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'qr_harian'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>QR Code Presensi Harian (Siswa Scan Sendiri)</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('riwayat')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'riwayat'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>{isFullAttendanceManager ? `Riwayat & Rekap Kehadiran (${filteredRecords.length})` : `Riwayat Kehadiran Kelas (${filteredRecords.length})`}</span>
        </button>

        {canPrintKartu && (
          <button
            onClick={() => setActiveTab('kartu_qr')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'kartu_qr'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Kartu QR Pelajar ({siswaList.length})</span>
          </button>
        )}
      </div>

      {/* TAB: DASBOR TREN BULANAN MENGGUNAKAN RECHARTS */}
      {activeTab === 'dasbor_tren' && (
        <MonthlyAttendanceDashboard
          absensiList={absensiList}
          usersList={effectiveUsersList}
          kelasList={kelasList}
          currentUser={currentUser}
          onNavigateToScanner={() => setActiveTab('scanner')}
          onNavigateToRiwayat={() => setActiveTab('riwayat')}
        />
      )}

      {/* TAB 1: PEMINDAI QR CODE SISWA */}
      {activeTab === 'scanner' && (
        <div className="space-y-4">
          {!isTodayEffective && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-start sm:items-center gap-3 text-amber-900 shadow-xs">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
              <div className="flex-1">
                <div className="font-bold text-xs uppercase tracking-wide text-amber-800 flex items-center gap-2">
                  <span>Hari Ini {getNamaHariIndo(todayStr)}: {getAlasanHariTidakEfektif(todayStr)} (Otomatis Tidak Ada Presensi)</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-800 text-[10px] font-black uppercase">Libur</span>
                </div>
                <p className="text-xs text-amber-700 mt-0.5">
                  Sesuai kalender akademik SMK Bakti Putra Mandiri, hari libur akhir pekan dan tanggal merah hari libur nasional otomatis ditiadakan dari kegiatan KBM dan presensi.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-5">
            {/* Status Selector */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
              <label className="text-xs font-bold text-slate-700 block">
                Pilih Status Kehadiran yang Direkam:
              </label>
              <div className="grid grid-cols-5 gap-2">
                {(['Hadir', 'Terlambat', 'Sakit', 'Izin', 'Alpa'] as const).map(status => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setSelectedStatus(status)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold text-center border transition-all ${
                      selectedStatus === status
                        ? status === 'Hadir' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' :
                          status === 'Terlambat' ? 'bg-amber-600 text-white border-amber-600 shadow-md' :
                          status === 'Sakit' ? 'bg-blue-600 text-white border-blue-600 shadow-md' :
                          status === 'Izin' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' :
                          'bg-rose-600 text-white border-rose-600 shadow-md'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Catatan / keterangan tambahan (opsional)..."
                  value={keteranganInput}
                  onChange={(e) => setKeteranganInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Square QR Scanner Viewfinder (Pemindai Persegi 1:1) */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 rounded-3xl p-6 text-white shadow-2xl space-y-5 border-2 border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span className="text-xs font-bold text-emerald-400">
                    Pemindai Persegi (1:1 Square QR Code)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isCameraActive && (
                    <button
                      type="button"
                      onClick={toggleCameraFacing}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1 border border-slate-700 transition-colors"
                      title="Ganti Kamera Belakang / Depan"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{cameraFacing === 'environment' ? 'Belakang' : 'Depan'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={toggleCamera}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                      isCameraActive 
                        ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-md' 
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{isCameraActive ? 'Tutup Kamera' : 'Buka Kamera HP/PC'}</span>
                  </button>
                  <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                    Petugas: {currentUser.nama}
                  </span>
                </div>
              </div>

              {cameraError && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{cameraError}</span>
                </div>
              )}

              {/* BINGKAI PEMINDAI PERSEGI (SQUARE 1:1) */}
              <div className="flex flex-col items-center justify-center py-2">
                <div className="relative w-56 h-56 sm:w-72 sm:h-72 max-w-[280px] aspect-square rounded-3xl overflow-hidden bg-slate-950 border-2 border-slate-700 shadow-2xl flex items-center justify-center group">
                  {/* Corner Reticles (Persegi 4 Sudut) */}
                  <div className="absolute top-3 left-3 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl z-20 pointer-events-none"></div>
                  <div className="absolute top-3 right-3 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl z-20 pointer-events-none"></div>
                  <div className="absolute bottom-3 left-3 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl z-20 pointer-events-none"></div>
                  <div className="absolute bottom-3 right-3 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl z-20 pointer-events-none"></div>

                  {/* Video Stream or Interactive Target Viewfinder */}
                  {isCameraActive ? (
                    <video
                      ref={(el) => {
                        videoRef.current = el;
                        if (el && streamRef.current && el.srcObject !== streamRef.current) {
                          el.srcObject = streamRef.current;
                          el.play().catch(console.warn);
                        }
                      }}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover aspect-square transform scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3 bg-radial from-slate-900 to-slate-950">
                      <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border-2 border-dashed border-emerald-400/50 flex items-center justify-center text-emerald-400 relative">
                        <QrCode className="w-10 h-10 animate-pulse" />
                        <div className="absolute inset-0 bg-emerald-400/5 rounded-2xl animate-ping opacity-30"></div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-white tracking-wide">
                          Arahkan Square QR Code Siswa ke Sini
                        </div>
                        <p className="text-[10px] text-slate-400 max-w-[200px]">
                          Format rasio persegi 1:1 terkalibrasi presisi dengan barcode kartu tanda pelajar resmi
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Animated Sweeping Laser Line inside the Square */}
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] z-20 pointer-events-none animate-bounce opacity-80"></div>
                  
                  {/* Subtle Grid Lines inside Square */}
                  <div className="absolute inset-4 border border-dashed border-white/10 rounded-2xl pointer-events-none z-10"></div>
                </div>

                <div className="mt-2 text-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-[10px] font-mono text-emerald-300">
                    <Scan className="w-3 h-3 text-emerald-400" />
                    <span>Square Viewfinder Ratio 1:1 Aktif</span>
                  </span>
                </div>
              </div>

              {/* Barcode / NIPD Input Field */}
              <div className="relative">
                <input
                  ref={scannerInputRef}
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleProcessScan(barcodeInput);
                    }
                  }}
                  placeholder="Scan barcode gun / ketik NIPD atau NISN siswa..."
                  className="w-full bg-slate-950/90 border-2 border-emerald-500/80 rounded-2xl px-4 py-3.5 text-emerald-300 font-mono text-sm tracking-wider placeholder:text-slate-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/20"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => handleProcessScan(barcodeInput)}
                  className="absolute right-2 top-2 bottom-2 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md transition-all"
                >
                  <Scan className="w-4 h-4" />
                  <span>Proses</span>
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <p className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Mendukung scanner USB/Bluetooth, kamera HP, atau entri NIPD manual.</span>
                </p>
                <button
                  type="button"
                  onClick={() => scannerInputRef.current?.focus()}
                  className="text-emerald-400 hover:underline text-[10px] font-mono shrink-0 ml-2"
                >
                  Fokus Scanner
                </button>
              </div>
            </div>

            {/* Quick Student Selector */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  Daftar Siswa Cepat ({siswaList.length} Siswa)
                </label>
                <div className="relative w-48">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari siswa / NIPD..."
                    value={searchStudentQuery}
                    onChange={(e) => setSearchStudentQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 border border-slate-100 rounded-xl p-2 bg-slate-50/50">
                {siswaList
                  .filter(s => 
                    !searchStudentQuery || 
                    s.nama.toLowerCase().includes(searchStudentQuery.toLowerCase()) || 
                    (s.nipd || '').includes(searchStudentQuery) ||
                    (s.kelas || '').toLowerCase().includes(searchStudentQuery.toLowerCase())
                  )
                  .slice(0, 20)
                  .map(s => {
                    const isAlreadyToday = todayRecords.some(r => r.nipd === (s.nipd || s.nipOrNis));
                    return (
                      <div
                        key={s.id}
                        onClick={() => handleProcessScan(s.nipd || s.nipOrNis)}
                        className={`flex items-center justify-between p-2 rounded-lg bg-white border cursor-pointer transition-all text-xs group ${
                          isAlreadyToday 
                            ? 'border-emerald-200 bg-emerald-50/30' 
                            : 'border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full font-bold flex items-center justify-center text-[10px] ${
                            isAlreadyToday ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {s.nama.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800 group-hover:text-emerald-700 flex items-center gap-1.5">
                              <span>{s.nama}</span>
                              {isAlreadyToday && (
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              NIPD: {s.nipd || s.nipOrNis} • {s.kelas || s.namaKelas}
                            </div>
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isAlreadyToday 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-slate-100 text-slate-600 group-hover:bg-emerald-600 group-hover:text-white'
                        }`}>
                          {isAlreadyToday ? 'Sudah Presensi' : `Presensi ${selectedStatus}`}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Right Column: Scan Confirmation & Square QR Card Preview */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <BadgeCheck className="w-5 h-5 text-emerald-600" />
                Konfirmasi Pindai Terakhir
              </h3>

              {lastScannedStudent ? (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 shadow-sm">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Presensi Berhasil
                    </span>
                    <span className="text-xs font-mono text-emerald-800 font-bold">
                      {lastScannedStudent.record.waktu} WIB
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-200 border-2 border-emerald-400 flex items-center justify-center text-emerald-900 font-black text-2xl shadow-inner">
                      {lastScannedStudent.student.nama.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-slate-900 leading-tight">
                        {lastScannedStudent.student.nama}
                      </h4>
                      <div className="text-xs text-slate-600 font-mono mt-0.5">
                        NIPD: <span className="font-bold text-emerald-800">{lastScannedStudent.record.nipd}</span>
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        {lastScannedStudent.record.kelas}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-3 border border-emerald-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Status</span>
                      <span className="font-bold text-emerald-700">{lastScannedStudent.record.status}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Metode</span>
                      <span className="font-semibold text-slate-700">{lastScannedStudent.record.metode}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Petugas</span>
                      <span className="font-semibold text-slate-700">{lastScannedStudent.record.petugas}</span>
                    </div>
                  </div>

                  {/* Square QR Code Rendering */}
                  <div className="bg-white p-3 rounded-xl border border-emerald-100 flex flex-col items-center justify-center">
                    <SquareQrCode value={lastScannedStudent.record.nipd} size={110} />
                    <span className="text-[10px] font-mono font-bold text-slate-500 mt-1">
                      {lastScannedStudent.record.nipd}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Scan className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-700">Belum Ada Siswa Dipindai</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                      Pindai QR code kartu pelajar menggunakan scanner atau pilih siswa dari daftar.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Live Feed: Latest scans today with direct self-attendance support */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <span className="text-xs font-bold text-slate-800">Presensi Hari Ini ({todayRecords.length} Siswa)</span>
                  <div className="text-[10px] text-slate-400 font-mono">{todayStr}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('riwayat')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] transition-colors"
                >
                  Lihat Riwayat & Pencarian →
                </button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {todayRecords.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs hover:bg-slate-100/70 transition-colors">
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-slate-800 truncate">{r.namaSiswa}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                        <span>{r.kelas}</span>
                        <span>•</span>
                        <span className="font-mono font-semibold text-slate-700">{r.waktu}</span>
                        <span>•</span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-200/80 text-slate-600 text-[9px] font-medium">{r.metode}</span>
                      </div>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      r.status === 'Hadir' ? 'bg-emerald-100 text-emerald-800' :
                      r.status === 'Terlambat' ? 'bg-amber-100 text-amber-800' :
                      r.status === 'Sakit' ? 'bg-blue-100 text-blue-800' :
                      r.status === 'Izin' ? 'bg-indigo-100 text-indigo-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {r.status}
                    </span>
                  </div>
                ))}
                {todayRecords.length === 0 && (
                  <div className="text-center py-6 text-slate-400">
                    <Scan className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                    <p className="text-xs">Belum ada aktivitas presensi hari ini.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* TAB 2: QR CODE PRESENSI HARIAN (SISWA SCAN SENDIRI) */}
      {activeTab === 'qr_harian' && isFullAttendanceManager && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          {!isTodayEffective && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-start sm:items-center gap-3 text-amber-900 shadow-xs">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
              <div className="flex-1">
                <div className="font-bold text-xs uppercase tracking-wide text-amber-800 flex items-center gap-2">
                  <span>Hari Ini {getNamaHariIndo(todayStr)} - Libur Akhir Pekan (Presensi Mandiri Ditiadakan)</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-800 text-[10px] font-black uppercase">5 Hari Sekolah</span>
                </div>
                <p className="text-xs text-amber-700 mt-0.5">
                  SMK Bakti Putra Mandiri menerapkan sistem 5 hari sekolah (Senin s.d. Jumat). Hari Sabtu dan Minggu otomatis tidak ada presensi mandiri siswa.
                </p>
              </div>
            </div>
          )}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>QR Code Presensi Mandiri Siswa</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                Pajang / Tayangkan QR Code Presensi Hari Ini
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xl">
                Siswa dapat membuka portal akun siswa di HP mereka, memilih menu <strong>"Scan QR Presensi"</strong>, lalu memindai kode di bawah ini untuk mencatatkan kehadiran secara langsung.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setQrTokenSuffix(Math.random().toString(36).substring(2, 6).toUpperCase())}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5"
                title="Perbarui kode token agar siswa tidak bisa membagikan screenshot lama"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Perbarui Token QR</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('printable-qr-poster');
                  if (el) {
                    printDocumentArea(el, {
                      title: `Poster QR Presensi Gerbang - ${schoolInfo?.nama || 'SMK BPM'}`,
                      paperSize: 'A4',
                      orientation: 'portrait',
                      margin: 'sempit',
                    });
                  } else {
                    window.print();
                  }
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                title="Cetak lembar poster QR saja (tanpa elemen halaman web)"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Lembar Poster QR</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row items-center justify-center gap-8 py-6">
            {/* Big Square QR Card */}
            <div id="printable-qr-poster" className="bg-gradient-to-b from-slate-900 to-slate-950 p-8 rounded-3xl text-white shadow-2xl border-4 border-emerald-500 text-center max-w-md w-full space-y-4 printable-document">
              <div className="flex items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white p-1 flex items-center justify-center shadow-md border border-emerald-300 shrink-0">
                  <img 
                    src={schoolInfo?.logoUrl || '/logo_bpm.png'} 
                    alt="Logo" 
                    className="w-full h-full object-contain"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
                <div className="text-left">
                  <h4 className="font-extrabold text-sm uppercase text-slate-100">{schoolInfo?.nama || 'SMK BAKTI PUTRA MANDIRI'}</h4>
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">PRESENSI MANDIRI SISWA</span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl inline-block shadow-inner">
                <SquareQrCode value={dailyQrValue} size={240} />
              </div>

              <div className="space-y-1">
                <div className="font-mono text-xs font-bold text-emerald-400 bg-slate-800/80 py-1.5 px-3 rounded-xl inline-block">
                  KODE SESI: {dailyQrValue}
                </div>
                <p className="text-[11px] text-slate-300">
                  Tanggal: <strong className="text-white">{todayStr}</strong> • Rombel: <strong className="text-white">{filterKelas}</strong>
                </p>
              </div>
            </div>

            {/* Instruction Guide */}
            <div className="max-w-md space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                <h4 className="font-bold text-emerald-950 flex items-center gap-1.5 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Tata Cara Siswa Melakukan Presensi Mandiri:</span>
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 text-emerald-900 font-medium leading-relaxed">
                  <li>Siswa login ke akun mereka di portal sekolah.</li>
                  <li>Buka tab <strong>"Ujian & Akademik Siswa"</strong> atau klik tombol <strong>"Scan QR Presensi"</strong>.</li>
                  <li>Arahkan kamera HP ke Square QR Code di layar ini atau di pintu kelas.</li>
                  <li>Presensi otomatis tercatat sebagai <strong>"Hadir (QR Code Mandiri)"</strong> dalam hitungan detik.</li>
                </ol>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                <h5 className="font-bold text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                  <span>Keamanan Anti-Kecurangan</span>
                </h5>
                <p className="text-[11px] text-amber-800">
                  Setiap kode QR memiliki token berkala yang dapat diperbarui oleh guru / pengurus kelas untuk mencegah penyebaran foto kode.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RIWAYAT & REKAP KEHADIRAN */}
      {activeTab === 'riwayat' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                Data Rekapitulasi Presensi Siswa
              </h3>
              <p className="text-xs text-slate-500">
                Data kehadiran terhubung secara real-time dari seluruh sesi scanner barcode & presensi mandiri.
              </p>
            </div>

            {/* Filter Bar with Date Range, Search Query, and Class Filter */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Kolom Pencarian Riwayat Kehadiran */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchRiwayatQuery}
                  onChange={(e) => setSearchRiwayatQuery(e.target.value)}
                  placeholder="Cari siswa, NIPD, NISN, kelas, status..."
                  className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-medium"
                />
                {searchRiwayatQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchRiwayatQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] hover:bg-slate-300 cursor-pointer"
                    title="Hapus pencarian"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200 text-xs">
                <span className="text-[11px] font-bold text-slate-500">Rentang:</span>
                <input
                  type="date"
                  disabled={isAllDates}
                  value={filterTanggalMulai}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFilterTanggalMulai(val);
                    setFilterTanggal(val);
                  }}
                  className="px-2 py-1 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-500 bg-white font-medium disabled:opacity-50"
                  title="Dari Tanggal (tgl/bln/tahun)"
                />
                <span className="text-slate-400 font-bold text-xs">s.d.</span>
                <input
                  type="date"
                  disabled={isAllDates}
                  value={filterTanggalSelesai}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFilterTanggalSelesai(val);
                  }}
                  className="px-2 py-1 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-500 bg-white font-medium disabled:opacity-50"
                  title="Sampai Tanggal (tgl/bln/tahun)"
                />
              </div>

              <button
                type="button"
                onClick={() => setIsAllDates(!isAllDates)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  isAllDates
                    ? 'bg-teal-700 text-white shadow-xs ring-2 ring-teal-300'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                }`}
                title="Tampilkan riwayat kehadiran dari seluruh tanggal tanpa batas rentang"
              >
                {isAllDates ? '✓ Semua Tanggal' : 'Semua Tanggal'}
              </button>

              <select
                value={filterKelas}
                onChange={(e) => setFilterKelas(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 bg-white font-medium"
              >
                <option value="Semua">Semua Kelas</option>
                {kelasList.map(k => {
                  const cleanK = (k.namaKelas || '').replace(/^Kelas\s+/i, '').trim();
                  return (
                    <option key={k.id} value={cleanK}>{cleanK}</option>
                  );
                })}
              </select>

              {/* Preset buttons */}
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsAllDates(false);
                    setFilterTanggalMulai('2026-09-01');
                    setFilterTanggalSelesai('2026-09-30');
                    setFilterTanggal('2026-09-01');
                  }}
                  className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                    !isAllDates && filterTanggalMulai === '2026-09-01' && filterTanggalSelesai === '2026-09-30'
                      ? 'bg-emerald-700 text-white shadow-xs ring-2 ring-emerald-300'
                      : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300'
                  }`}
                  title="Tampilkan langsung presensi lengkap Bulan September 2026 (22 Hari KBM Efektif)"
                >
                  ★ September 2026 (22 Hari)
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('dasbor_tren')}
                  className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                  title="Buka Dasbor Grafik Batang Tren Absensi Recharts"
                >
                  <BarChart3 className="w-3 h-3 text-emerald-400" />
                  <span>Grafik Tren Bulanan →</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsAllDates(false);
                    const today = getLocalDateString();
                    setFilterTanggalMulai(today);
                    setFilterTanggalSelesai(today);
                    setFilterTanggal(today);
                  }}
                  className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                    !isAllDates && filterTanggalMulai === todayIso && filterTanggalSelesai === todayIso
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Hari Ini
                </button>

                {/* Day of Week Selector: Ganti Hari Otomatis Ganti Tanggal */}
                <div className="flex items-center gap-0.5 bg-slate-100/90 p-0.5 rounded-lg border border-slate-200">
                  {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map((h) => {
                    const isLibur = h === 'Sabtu' || h === 'Minggu';
                    const isSingleDay = !isAllDates && filterTanggalMulai === filterTanggalSelesai;
                    const isDaySelected = isSingleDay && getNamaHariIndo(filterTanggalMulai) === h;

                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => {
                          setIsAllDates(false);
                          const targetDate = getDateForDayInSameWeek(h, filterTanggalMulai || todayIso);
                          setFilterTanggalMulai(targetDate);
                          setFilterTanggalSelesai(targetDate);
                          setFilterTanggal(targetDate);
                        }}
                        className={`px-1.5 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                          isDaySelected
                            ? isLibur
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'bg-emerald-700 text-white shadow-xs'
                            : isLibur
                              ? 'text-amber-700 hover:bg-amber-100/60'
                              : 'text-slate-600 hover:bg-white hover:text-slate-900'
                        }`}
                        title={isLibur ? `Hari ${h}: Libur Akhir Pekan (Otomatis Tidak Ada Absen)` : `Pilih Hari ${h} (Otomatis Menyesuaikan Tanggal)`}
                      >
                        {h.slice(0, 3)}
                        {isLibur && <span className="text-[8px] opacity-75 font-normal ml-0.5">*</span>}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsAllDates(false);
                    const today = getLocalDateString();
                    const d = new Date();
                    d.setDate(d.getDate() - 7);
                    setFilterTanggalMulai(getLocalDateString(d));
                    setFilterTanggalSelesai(today);
                  }}
                  className="px-2 py-1 text-[10px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  7 Hari
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAllDates(false);
                    const today = getLocalDateString();
                    const d = new Date();
                    const startOfMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
                    setFilterTanggalMulai(startOfMonth);
                    setFilterTanggalSelesai(today);
                  }}
                  className="px-2 py-1 text-[10px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Bulan Ini
                </button>
              </div>

              <button
                onClick={() => {
                  setIsAllDates(false);
                  setSearchRiwayatQuery('');
                  const today = getLocalDateString();
                  setFilterTanggalMulai(today);
                  setFilterTanggalSelesai(today);
                  setFilterTanggal(today);
                  setFilterKelas('Semua');
                }}
                className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
                title="Reset Filter"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              {(isFullAttendanceManager || currentUser.role === 'guru') && (
                <button
                  type="button"
                  onClick={() => handleOpenAutoAbsenModal(filterKelas, isAllDates ? todayIso : (filterTanggalMulai || todayIso))}
                  className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm ml-auto cursor-pointer transition-all"
                  title="Set presensi otomatis untuk tanggal dan kelas yang sedang dipilih"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Set Absen Otomatis</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowPrintModal(true)}
                className={`px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm ${(isFullAttendanceManager || currentUser.role === 'guru') ? '' : 'ml-auto'}`}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Rekap & Persentase</span>
              </button>
            </div>

            {/* NOTIFIKASI JIKA TANGGAL TERPILIH ADALAH HARI LIBUR (AKHIR PEKAN ATAU LIBUR NASIONAL) */}
            {!isAllDates && filterTanggalMulai === filterTanggalSelesai && !isHariSekolahEfektif(filterTanggalMulai) && (
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl flex items-start sm:items-center gap-3 text-amber-900 shadow-xs">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
                <div className="text-xs">
                  <span className="font-bold text-amber-800">
                    {getAlasanHariTidakEfektif(filterTanggalMulai) || 'Hari Libur'} ({getNamaHariIndo(filterTanggalMulai)}, {formatTanggalIndo(filterTanggalMulai)}):
                  </span>{' '}
                  Sesuai kalender akademik di SMK Bakti Putra Mandiri, hari libur akhir pekan dan tanggal merah libur nasional otomatis ditiadakan dari kegiatan KBM serta presensi.
                </div>
              </div>
            )}
          </div>

          {/* Quick Stats Badges with Percentages */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
              <span className="text-[11px] font-bold text-slate-600 block">Total Siswa</span>
              <span className="text-xl font-extrabold text-slate-900">{totalSiswaCohort}</span>
              <span className="text-[10px] text-slate-400 font-semibold">100.0% Terdaftar</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
              <span className="text-[11px] font-bold text-emerald-700 block">Hadir</span>
              <span className="text-xl font-extrabold text-emerald-900">{totalHadir}</span>
              <span className="text-[10px] text-emerald-700 font-bold block">{persenHadir}%</span>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
              <span className="text-[11px] font-bold text-amber-700 block">Terlambat</span>
              <span className="text-xl font-extrabold text-amber-900">{countHadirTerlambat}</span>
              <span className="text-[10px] text-amber-700 font-bold block">
                {totalSiswaCohort > 0 ? ((countHadirTerlambat / totalSiswaCohort) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
              <span className="text-[11px] font-bold text-blue-700 block">Sakit</span>
              <span className="text-xl font-extrabold text-blue-900">{countSakitCohort}</span>
              <span className="text-[10px] text-blue-700 font-bold block">{persenSakit}%</span>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-center">
              <span className="text-[11px] font-bold text-indigo-700 block">Izin</span>
              <span className="text-xl font-extrabold text-indigo-900">{countIzinCohort}</span>
              <span className="text-[10px] text-indigo-700 font-bold block">{persenIzin}%</span>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-center">
              <span className="text-[11px] font-bold text-rose-700 block">Alpa / Belum Hadir</span>
              <span className="text-xl font-extrabold text-rose-900">{countAlpaCohort}</span>
              <span className="text-[10px] text-rose-700 font-bold block">{persenAlpa}%</span>
            </div>
          </div>

          {/* Sub-Header: Mode Tampilan & Layout Fleksibel HP */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
            {/* View Mode: Semua Siswa Rombel vs Hanya Log Masuk */}
            <div className="inline-flex rounded-xl bg-white p-1 border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setRiwayatViewMode('rombel_semua')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  riwayatViewMode === 'rombel_semua'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>Semua Siswa Rombel ({cohortStudents.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setRiwayatViewMode('log_tercatat')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  riwayatViewMode === 'log_tercatat'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Log Scan Masuk ({filteredRecords.length})</span>
              </button>
            </div>

            {/* Layout Switcher: Kartu HP Fleksibel vs Tabel */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">Tampilan:</span>
              <div className="inline-flex rounded-xl bg-white p-1 border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setRiwayatLayout('kartu')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    riwayatLayout === 'kartu'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Tampilan Kartu responsif yang sangat nyaman digunakan di layar HP smartphone"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Kartu HP</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRiwayatLayout('tabel')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    riwayatLayout === 'tabel'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Tampilan Tabel Standar untuk Layar Lebar Komputer/Laptop"
                >
                  <LayoutTemplate className="w-3.5 h-3.5" />
                  <span>Tabel</span>
                </button>
              </div>
            </div>
          </div>

          {/* MODE 1: SELURUH SISWA ROMBEL DENGAN TOMBOL 1-SENTUH (SANGAT NYAMAN DI HP & LAPTOP) */}
          {riwayatViewMode === 'rombel_semua' && (
            <div className="space-y-3">
              {/* Active Search Result Banner */}
              {searchRiwayatQuery.trim() && (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs px-3.5 py-2 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Ditemukan <strong>{searchedCohortAttendance.length}</strong> dari <strong>{detailedCohortAttendance.length}</strong> siswa untuk kata kunci: <em>"{searchRiwayatQuery}"</em>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSearchRiwayatQuery('')}
                    className="font-bold underline text-emerald-700 hover:text-emerald-900 ml-2 cursor-pointer text-[11px]"
                  >
                    Reset Pencarian
                  </button>
                </div>
              )}

              {/* Layout Kartu HP */}
              {riwayatLayout === 'kartu' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {searchedCohortAttendance.map(({ student, record, status, isHadir, isTidakHadir, waktu, metode }, idx) => {
                    const currentStat = record?.status || 'Belum Presensi';
                    return (
                      <div 
                        key={student.id} 
                        className={`p-4 rounded-2xl border transition-all space-y-3 ${
                          record 
                            ? 'bg-white border-slate-200 shadow-xs' 
                            : 'bg-slate-50/70 border-dashed border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-10 h-10 rounded-2xl font-bold flex items-center justify-center text-sm shrink-0 ${
                              isHadir ? 'bg-emerald-100 text-emerald-800' :
                              record?.status === 'Sakit' ? 'bg-blue-100 text-blue-800' :
                              record?.status === 'Izin' ? 'bg-indigo-100 text-indigo-800' :
                              record?.status === 'Alpa' ? 'bg-rose-100 text-rose-800' :
                              'bg-slate-200 text-slate-700'
                            }`}>
                              {student.nama?.charAt(0) || 'S'}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-xs text-slate-900 truncate">{student.nama}</h4>
                              <div className="text-[10px] text-slate-500 font-mono">
                                NIPD: {student.nipd || student.nipOrNis || '-'}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {student.kelas || student.namaKelas}
                              </div>
                            </div>
                          </div>

                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                            record?.status === 'Hadir' ? 'bg-emerald-100 text-emerald-800' :
                            record?.status === 'Terlambat' ? 'bg-amber-100 text-amber-800' :
                            record?.status === 'Sakit' ? 'bg-blue-100 text-blue-800' :
                            record?.status === 'Izin' ? 'bg-indigo-100 text-indigo-800' :
                            record?.status === 'Alpa' ? 'bg-rose-100 text-rose-800' :
                            'bg-slate-200 text-slate-600'
                          }`}>
                            {record?.status || 'Belum Presensi'}
                          </span>
                        </div>

                        {record && (
                          <div className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-center justify-between">
                            <span>Waktu: <strong className="font-mono text-slate-700">{record.waktu}</strong></span>
                            <span>Metode: <strong className="text-slate-700">{record.metode}</strong></span>
                          </div>
                        )}

                        {/* 1-Touch Status Buttons (Sangat Mudah di HP) */}
                        <div className="space-y-1 pt-1 border-t border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                            Pilih Status Kehadiran (1-Sentuh):
                          </span>
                          <div className="grid grid-cols-5 gap-1 text-[11px]">
                            <button
                              type="button"
                              onClick={() => handleQuickStudentStatus(student, 'Hadir')}
                              className={`py-1.5 px-1 rounded-xl font-bold text-center border transition-all ${
                                currentStat === 'Hadir'
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-300'
                                  : 'bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                              }`}
                              title="Tandai Hadir"
                            >
                              Hadir
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickStudentStatus(student, 'Terlambat')}
                              className={`py-1.5 px-1 rounded-xl font-bold text-center border transition-all ${
                                currentStat === 'Terlambat'
                                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs ring-2 ring-amber-300'
                                  : 'bg-amber-50/70 hover:bg-amber-100 text-amber-800 border-amber-200'
                              }`}
                              title="Tandai Terlambat"
                            >
                              Telat
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickStudentStatus(student, 'Sakit')}
                              className={`py-1.5 px-1 rounded-xl font-bold text-center border transition-all ${
                                currentStat === 'Sakit'
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-300'
                                  : 'bg-blue-50/70 hover:bg-blue-100 text-blue-800 border-blue-200'
                              }`}
                              title="Tandai Sakit"
                            >
                              Sakit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickStudentStatus(student, 'Izin')}
                              className={`py-1.5 px-1 rounded-xl font-bold text-center border transition-all ${
                                currentStat === 'Izin'
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs ring-2 ring-indigo-300'
                                  : 'bg-indigo-50/70 hover:bg-indigo-100 text-indigo-800 border-indigo-200'
                              }`}
                              title="Tandai Izin"
                            >
                              Izin
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickStudentStatus(student, 'Alpa')}
                              className={`py-1.5 px-1 rounded-xl font-bold text-center border transition-all ${
                                currentStat === 'Alpa'
                                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs ring-2 ring-rose-300'
                                  : 'bg-rose-50/70 hover:bg-rose-100 text-rose-800 border-rose-200'
                              }`}
                              title="Tandai Alpa"
                            >
                              Alpa
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {searchedCohortAttendance.length === 0 && (
                    <div className="col-span-full py-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                      <p>{searchRiwayatQuery.trim() ? `Tidak ada siswa yang sesuai dengan pencarian "${searchRiwayatQuery}".` : 'Tidak ada siswa dalam filter kelas yang dipilih.'}</p>
                      {searchRiwayatQuery.trim() && (
                        <button
                          type="button"
                          onClick={() => setSearchRiwayatQuery('')}
                          className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-300"
                        >
                          Hapus Kata Kunci
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Layout Tabel Standar untuk Desktop */
                <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3 text-center">No</th>
                        <th className="py-3 px-3">NIPD</th>
                        <th className="py-3 px-3">Nama Siswa</th>
                        <th className="py-3 px-3">Kelas</th>
                        <th className="py-3 px-3 text-center">Status Presensi</th>
                        <th className="py-3 px-3">Waktu</th>
                        <th className="py-3 px-3">Metode</th>
                        <th className="py-3 px-3 text-center">Ubah Status (1-Sentuh)</th>
                        <th className="py-3 px-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {searchedCohortAttendance.map(({ student, record, status }, idx) => (
                        <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-3 text-center text-slate-400 font-semibold">{idx + 1}</td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-800">{student.nipd || student.nipOrNis || '-'}</td>
                          <td className="py-3 px-3 font-semibold text-slate-900">{student.nama}</td>
                          <td className="py-3 px-3 text-slate-600">{student.kelas || student.namaKelas}</td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              record?.status === 'Hadir' ? 'bg-emerald-100 text-emerald-800' :
                              record?.status === 'Terlambat' ? 'bg-amber-100 text-amber-800' :
                              record?.status === 'Sakit' ? 'bg-blue-100 text-blue-800' :
                              record?.status === 'Izin' ? 'bg-indigo-100 text-indigo-800' :
                              record?.status === 'Alpa' ? 'bg-rose-100 text-rose-800' :
                              'bg-slate-100 text-slate-500'
                            }`}>
                              {record?.status || 'Belum Presensi'}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-500">{record?.waktu || '-'}</td>
                          <td className="py-3 px-3 text-slate-600">{record?.metode || '-'}</td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleQuickStudentStatus(student, 'Hadir')}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  record?.status === 'Hadir' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                                }`}
                                title="Set Hadir"
                              >
                                H
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickStudentStatus(student, 'Terlambat')}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  record?.status === 'Terlambat' ? 'bg-amber-600 text-white' : 'bg-amber-50 hover:bg-amber-100 text-amber-700'
                                }`}
                                title="Set Terlambat"
                              >
                                T
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickStudentStatus(student, 'Sakit')}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  record?.status === 'Sakit' ? 'bg-blue-600 text-white' : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
                                }`}
                                title="Set Sakit"
                              >
                                S
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickStudentStatus(student, 'Izin')}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  record?.status === 'Izin' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
                                }`}
                                title="Set Izin"
                              >
                                I
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickStudentStatus(student, 'Alpa')}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  record?.status === 'Alpa' ? 'bg-rose-600 text-white' : 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                                }`}
                                title="Set Alpa"
                              >
                                A
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {record ? (
                              <button
                                onClick={() => onDeleteAbsensi(record.id)}
                                className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                title="Hapus rekaman presensi"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {searchedCohortAttendance.length === 0 && (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-400 space-y-2">
                            <p>{searchRiwayatQuery.trim() ? `Tidak ada siswa yang sesuai dengan pencarian "${searchRiwayatQuery}".` : 'Tidak ada siswa pada rombel yang dipilih.'}</p>
                            {searchRiwayatQuery.trim() && (
                              <button
                                type="button"
                                onClick={() => setSearchRiwayatQuery('')}
                                className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-300 inline-block"
                              >
                                Hapus Kata Kunci
                              </button>
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* MODE 2: LOG RECORD MASUK (HANYA YANG SUDAH TERPANDAI) */}
          {riwayatViewMode === 'log_tercatat' && (
            <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3 text-center">No</th>
                    <th className="py-3 px-3">NIPD</th>
                    <th className="py-3 px-3">Nama Siswa</th>
                    <th className="py-3 px-3">Kelas</th>
                    <th className="py-3 px-3">Waktu</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3">Metode</th>
                    <th className="py-3 px-3">Petugas</th>
                    <th className="py-3 px-3 text-center">Ubah Status</th>
                    <th className="py-3 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map((rec, idx) => (
                    <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 text-center text-slate-400 font-semibold">{idx + 1}</td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">{rec.nipd}</td>
                      <td className="py-3 px-3 font-semibold text-slate-900">{rec.namaSiswa}</td>
                      <td className="py-3 px-3 text-slate-600">{rec.kelas}</td>
                      <td className="py-3 px-3 font-mono text-slate-500">{rec.waktu}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          rec.status === 'Hadir' ? 'bg-emerald-100 text-emerald-800' :
                          rec.status === 'Terlambat' ? 'bg-amber-100 text-amber-800' :
                          rec.status === 'Sakit' ? 'bg-blue-100 text-blue-800' :
                          rec.status === 'Izin' ? 'bg-indigo-100 text-indigo-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {rec.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">{rec.metode}</td>
                      <td className="py-3 px-3 text-slate-500 truncate max-w-xs">{rec.petugas || '-'}</td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onUpdateAbsensi({ ...rec, status: 'Hadir' })}
                            className="px-1.5 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold"
                            title="Ubah ke Hadir"
                          >
                            H
                          </button>
                          <button
                            onClick={() => onUpdateAbsensi({ ...rec, status: 'Terlambat' })}
                            className="px-1.5 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-700 text-[10px] font-bold"
                            title="Ubah ke Terlambat"
                          >
                            T
                          </button>
                          <button
                            onClick={() => onUpdateAbsensi({ ...rec, status: 'Sakit' })}
                            className="px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold"
                            title="Ubah ke Sakit"
                          >
                            S
                          </button>
                          <button
                            onClick={() => onUpdateAbsensi({ ...rec, status: 'Izin' })}
                            className="px-1.5 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold"
                            title="Ubah ke Izin"
                          >
                            I
                          </button>
                          <button
                            onClick={() => onUpdateAbsensi({ ...rec, status: 'Alpa' })}
                            className="px-1.5 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold"
                            title="Ubah ke Alpa"
                          >
                            A
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => onDeleteAbsensi(rec.id)}
                          className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                          title="Hapus Rekam Presensi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredRecords.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        Tidak ada catatan presensi pada tanggal / filter kelas yang dipilih.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: CETAK KARTU QR CODE SISWA (HANYA WALAS & ADMIN) */}
      {activeTab === 'kartu_qr' && canPrintKartu && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 print:hidden">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-600" />
                Generator Kartu Pelajar Square QR Code Resmi
              </h3>
              <p className="text-xs text-slate-500">
                Kartu Tanda Pelajar siap cetak dengan Square QR Code beresolusi tinggi (NIPD) untuk pemindaian scanner gerbang dan kelas.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Orientation Switcher */}
              <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setCardOrientation('portrait')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 ${
                    cardOrientation === 'portrait' 
                      ? 'bg-emerald-600 text-white shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Portrait (Tegak)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCardOrientation('landscape')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 ${
                    cardOrientation === 'landscape' 
                      ? 'bg-emerald-600 text-white shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LayoutTemplate className="w-3.5 h-3.5" />
                  <span>Landscape (Mendatar)</span>
                </button>
              </div>

              <select
                value={printFilterKelas}
                onChange={(e) => setPrintFilterKelas(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 font-medium focus:outline-none focus:border-emerald-500 bg-white"
              >
                <option value="Semua">Semua Rombel ({siswaList.length} Siswa)</option>
                {kelasList.map(k => {
                  const cleanK = (k.namaKelas || '').replace(/^Kelas\s+/i, '').trim();
                  return (
                    <option key={k.id} value={cleanK}>{cleanK}</option>
                  );
                })}
              </select>

              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('printable-student-cards');
                  if (el) {
                    printDocumentArea(el, {
                      title: `Lembar Kartu Presensi Siswa - ${printFilterKelas}`,
                      paperSize: 'A4',
                      orientation: cardOrientation,
                      margin: 'minimal',
                    });
                  } else {
                    window.print();
                  }
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                title="Cetak lembar kartu presensi saja ke printer/PDF"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Lembar Kartu ({cardOrientation === 'portrait' ? 'Portrait' : 'Landscape'})</span>
              </button>
            </div>
          </div>

          {/* Grid of Student ID QR Cards */}
          {(() => {
            const getCleanKejuruanSiswa = (s: any) => {
              let val = s.jurusan || '';
              if (!val || !val.trim()) {
                val = s.namaKelas || s.kelas || '';
              }
              const cleaned = val
                .replace(/^Kelas\s+/i, '')
                .replace(/^(X|XI|XII|10|11|12)\s+/i, '')
                .replace(/\s+[0-9]+$/g, '')
                .trim();

              if (/^TKJ$/i.test(cleaned)) return 'Teknik Komputer & Jaringan';
              if (/^AKL$/i.test(cleaned)) return 'Akuntansi & Keuangan Lembaga';
              if (/^MPLB$/i.test(cleaned)) return 'Manajemen Perkantoran';
              if (/^Farmasi$/i.test(cleaned)) return 'Farmasi';

              return cleaned || 'Teknik Komputer & Jaringan';
            };

            return cardOrientation === 'portrait' ? (
              <div id="printable-student-cards" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 printable-document">
                {studentsToPrint.map((siswa, idx) => (
                  <div 
                    key={siswa.id || idx}
                    className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-white via-slate-50 to-emerald-50/30 text-slate-900 p-3 shadow-md relative overflow-hidden flex flex-col justify-between max-w-[270px] mx-auto w-full print:max-w-none print:shadow-none print:border-emerald-600 print:break-inside-avoid print:p-2.5"
                    style={{ minHeight: '360px' }}
                  >
                    {/* Decorative Top Ribbon */}
                    <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-2 rounded-xl flex items-center justify-between shadow-xs shrink-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-white p-0.5 flex items-center justify-center border border-emerald-200 shadow-2xs shrink-0">
                          <img 
                            src={schoolInfo?.logoUrl || '/logo_bpm.png'} 
                            alt="Logo" 
                            className="w-full h-full object-contain"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        </div>
                        <div className="min-w-0 leading-tight">
                          <div className="text-[9px] font-black uppercase tracking-wider text-white truncate">
                            {schoolInfo?.nama || 'SMK BAKTI PUTRA MANDIRI'}
                          </div>
                          <div className="text-[6.5px] text-emerald-100 font-bold uppercase">KARTU ABSEN & PELAJAR</div>
                        </div>
                      </div>
                      <span className="px-1 py-0.5 rounded bg-white/20 backdrop-blur-xs border border-white/30 text-white text-[6.5px] font-extrabold shrink-0">
                        AKTIF
                      </span>
                    </div>

                    {/* Body Portrait: Foto Diperbesar + Identitas + Kejuruan & QR Sejajar */}
                    <div className="py-2 flex flex-col items-center text-center space-y-1.5 my-auto flex-1 justify-between">
                      {/* Foto Siswa Diperbesar */}
                      <div className="w-24 h-32 sm:w-28 sm:h-36 rounded-2xl bg-white border-2 border-emerald-500/50 flex-shrink-0 flex items-center justify-center text-slate-400 font-bold overflow-hidden shadow-xs mx-auto">
                        {siswa.fotoProfilUrl ? (
                          <img src={siswa.fotoProfilUrl} alt={siswa.nama} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center">
                            <span className="text-emerald-700 text-3xl font-black">{siswa.nama.charAt(0)}</span>
                            <span className="text-[7px] text-slate-400 font-bold mt-1">PAS FOTO</span>
                          </div>
                        )}
                      </div>

                      {/* Identitas Siswa (Tingkat Kelas TIDAK ditampilkan) */}
                      <div className="w-full space-y-1">
                        <h5 className="font-black text-xs sm:text-[13px] text-slate-900 truncate leading-tight px-1" title={siswa.nama}>
                          {siswa.nama}
                        </h5>
                        <div className="flex items-center justify-center gap-1.5 text-[7.5px] font-mono">
                          <span className="font-bold text-emerald-800 bg-emerald-100/80 px-1.5 py-0.5 rounded border border-emerald-200">
                            NIPD: {siswa.nipd || siswa.nipOrNis}
                          </span>
                          <span className="text-slate-600 font-semibold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            NISN: {siswa.nisn || siswa.username}
                          </span>
                        </div>
                      </div>

                      {/* Kejuruan SEJAJAR dengan QR Code Presensi (Tingkat Kelas Dihilangkan) */}
                      <div className="w-full grid grid-cols-12 gap-1.5 items-center bg-white/95 p-1.5 rounded-xl border border-emerald-200 shadow-2xs mt-auto">
                        <div className="col-span-7 flex flex-col justify-center text-left pl-1">
                          <span className="text-[6.5px] uppercase font-bold text-slate-400 tracking-wider">
                            KEJURUAN
                          </span>
                          <span className="text-[10px] font-black text-emerald-800 leading-tight line-clamp-2 mt-0.5">
                            {getCleanKejuruanSiswa(siswa)}
                          </span>
                          <span className="text-[6px] text-slate-400 font-medium mt-0.5 truncate">
                            Bakti Putra Mandiri
                          </span>
                        </div>
                        <div className="col-span-5 flex flex-col items-center justify-center border-l border-emerald-100 pl-1">
                          <div className="p-1 bg-white rounded-lg shadow-2xs border border-emerald-300/60 flex items-center justify-center">
                            <SquareQrCode 
                              value={siswa.nipd || siswa.nipOrNis || '24.25.10.001'} 
                              size={46} 
                            />
                          </div>
                          <span className="font-mono text-[5.5px] text-emerald-800 font-black mt-0.5 tracking-wider text-center">
                            QR PRESENSI
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="text-[7px] text-slate-500 border-t border-emerald-100 pt-1 flex items-center justify-between shrink-0">
                      <span>Berlaku selama siswa aktif</span>
                      <span className="font-bold text-emerald-700">Parungpanjang, Bogor</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 printable-document">
                {studentsToPrint.map((siswa, idx) => (
                  <div 
                    key={siswa.id || idx}
                    className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-white via-slate-50 to-emerald-50/30 text-slate-900 p-4 shadow-md relative overflow-hidden flex flex-col justify-between print:break-inside-avoid"
                    style={{ minHeight: '230px' }}
                  >
                    {/* Decorative Top Ribbon */}
                    <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-2.5 rounded-xl flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center border border-emerald-200 shadow-2xs">
                          <img 
                            src={schoolInfo?.logoUrl || '/logo_bpm.png'} 
                            alt="Logo" 
                            className="w-full h-full object-contain"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        </div>
                        <div>
                          <div className="text-[11px] font-black uppercase tracking-wider text-white truncate">
                            {schoolInfo?.nama || 'SMK BAKTI PUTRA MANDIRI'}
                          </div>
                          <div className="text-[8px] text-emerald-100 font-bold uppercase">KARTU TANDA PELAJAR RESMI</div>
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 rounded bg-white/20 backdrop-blur-xs border border-white/30 text-white text-[8px] font-extrabold">
                        AKREDITASI {schoolInfo?.akreditasi || 'A'}
                      </span>
                    </div>

                    {/* Student Info Body */}
                    <div className="py-2.5 flex items-start gap-3">
                      <div className="w-16 h-20 rounded-xl bg-white border-2 border-emerald-500/40 flex-shrink-0 flex items-center justify-center text-slate-400 font-bold text-lg overflow-hidden shadow-xs">
                        {siswa.fotoProfilUrl ? (
                          <img src={siswa.fotoProfilUrl} alt={siswa.nama} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-emerald-700 font-black">{siswa.nama.charAt(0)}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5 text-slate-700">
                        <h5 className="font-black text-sm text-slate-900 truncate leading-tight">{siswa.nama}</h5>
                        <div className="text-[9.5px] font-extrabold text-emerald-700 truncate">
                          {getCleanKejuruanSiswa(siswa)}
                        </div>
                        <div>
                          <span className="text-[10px] font-mono text-emerald-800 font-extrabold bg-emerald-100/80 px-1.5 py-0.5 rounded border border-emerald-200 inline-block">
                            NIPD: {siswa.nipd || siswa.nipOrNis}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          NISN: {siswa.nisn || siswa.username}
                        </div>
                        {siswa.jabatanKelas && siswa.jabatanKelas !== 'Anggota' && (
                          <span className="inline-block px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 text-[8.5px] font-bold border border-amber-300">
                            {siswa.jabatanKelas}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Square QR Code based on NIPD */}
                    <div className="bg-white rounded-xl p-2.5 flex items-center justify-center shadow-xs border border-emerald-100">
                      <SquareQrCode 
                        value={siswa.nipd || siswa.nipOrNis || '24.25.10.001'} 
                        size={72} 
                      />
                      <div className="ml-3 text-left">
                        <div className="text-[9.5px] text-emerald-800 uppercase font-black tracking-wider">QR Code Presensi</div>
                        <div className="text-xs font-mono font-black text-slate-900">
                          {siswa.nipd || siswa.nipOrNis}
                        </div>
                        <div className="text-[8.5px] text-emerald-700 font-medium">Tersinkronisasi Presensi Gerbang</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}
    </div>

    {/* CETAK REKAP KEHADIRAN SISWA MODAL */}
    {showPrintModal && (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:static print:inset-auto print:z-auto print:bg-white print:p-0 print:m-0 print:overflow-visible print:block print:w-full print:h-auto print:max-h-none print:shadow-none print:border-none">
        <div className="bg-white rounded-3xl max-w-5xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto print:static print:inset-auto print:max-h-none print:h-auto print:max-w-none print:w-full print:overflow-visible print:p-0 print:m-0 print:border-none print:shadow-none print:rounded-none print:block">
            
            {/* Modal Controls Bar (Hidden When Printed) */}
            <div className="print:hidden space-y-4 border-b border-slate-200 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                    <Printer className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      Cetak Lembar Presensi & Rekapitulasi Persentase Kehadiran
                    </h3>
                    <p className="text-xs text-slate-500">
                      Pilih lingkup cetak (keseluruhan, hadir saja, atau tidak hadir saja) dan simpan ke PDF atau printer.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Scope & Filter Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                {/* 3 Scope Buttons */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPrintScope('semua')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      printScope === 'semua'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Keseluruhan ({totalSiswaCohort} Siswa)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrintScope('hadir')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      printScope === 'hadir'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
                    }`}
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Yang Hadir Saja ({totalHadir} • {persenHadir}%)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrintScope('tidak_hadir')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      printScope === 'tidak_hadir'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Yang Tidak Hadir ({totalTidakHadir} • {persenTidakHadir}%)</span>
                  </button>
                </div>

                {/* Date Range & Class Dropdown */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={filterKelas}
                    onChange={(e) => setFilterKelas(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 font-semibold bg-white"
                  >
                    <option value="Semua">Semua Rombel</option>
                    {kelasList.map(k => {
                      const cleanK = (k.namaKelas || '').replace(/^Kelas\s+/i, '').trim();
                      return (
                        <option key={k.id} value={cleanK}>{cleanK}</option>
                      );
                    })}
                  </select>

                  <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-300 text-xs">
                    <span className="text-[10px] font-bold text-slate-500">Rentang:</span>
                    <input
                      type="date"
                      value={filterTanggalMulai}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFilterTanggalMulai(val);
                        setFilterTanggal(val);
                      }}
                      className="px-2 py-1 text-xs rounded-lg border border-slate-300 font-semibold bg-white"
                      title="Dari Tanggal (tgl/bln/tahun)"
                    />
                    <span className="text-slate-400 font-bold text-xs">s.d.</span>
                    <input
                      type="date"
                      value={filterTanggalSelesai}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFilterTanggalSelesai(val);
                      }}
                      className="px-2 py-1 text-xs rounded-lg border border-slate-300 font-semibold bg-white"
                      title="Sampai Tanggal (tgl/bln/tahun)"
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const today = getLocalDateString();
                        setFilterTanggalMulai(today);
                        setFilterTanggalSelesai(today);
                        setFilterTanggal(today);
                      }}
                      className="px-2 py-1 text-[10px] font-bold rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700"
                    >
                      Hari Ini
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const today = getLocalDateString();
                        const d = new Date();
                        const startOfMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
                        setFilterTanggalMulai(startOfMonth);
                        setFilterTanggalSelesai(today);
                      }}
                      className="px-2 py-1 text-[10px] font-bold rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700"
                    >
                      Bulan Ini
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('printable-rekap-doc');
                      if (el) {
                        printDocumentArea(el, {
                          title: `Rekapitulasi Presensi - ${filterKelas}`,
                          paperSize: 'A4',
                          orientation: 'portrait',
                          margin: 'sempit',
                        });
                      } else {
                        window.print();
                      }
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer"
                    title="Cetak lembar rekapitulasi saja (tanpa elemen halaman web)"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Cetak Dokumen Sekarang</span>
                  </button>
                </div>
              </div>
            </div>

            {/* THE PRINTABLE OFFICIAL DOCUMENT */}
            <div id="printable-rekap-doc" className="printable-document space-y-5 text-slate-900 bg-white">
              {/* Kop Surat Resmi */}
              <KopSuratView schoolInfo={schoolInfo} />

              {/* Title & Scope Header */}
              <div className="text-center space-y-1">
                <h3 className="text-sm font-black uppercase text-slate-950 underline underline-offset-4 tracking-wider">
                  REKAPITULASI DETAIL PRESENSI & PERSENTASE KEHADIRAN SISWA
                </h3>
                <p className="text-xs text-slate-700 font-medium">
                  Lingkup: <strong>
                    {printScope === 'semua' && 'Keseluruhan Siswa (Hadir, Sakit, Izin, & Alpa)'}
                    {printScope === 'hadir' && 'Khusus Siswa Hadir (Tepat Waktu & Terlambat)'}
                    {printScope === 'tidak_hadir' && 'Khusus Siswa Tidak Hadir (Sakit, Izin, & Alpa / Belum Absen)'}
                  </strong> • Rombel: <strong>{filterKelas === 'Semua' ? 'Seluruh Rombongan Belajar' : filterKelas}</strong> • {isDateRange ? (
                    <>Rentang Tanggal: <strong>{formatTanggalIndo(filterTanggalMulai)} s.d. {formatTanggalIndo(filterTanggalSelesai)}</strong></>
                  ) : (
                    <>Tanggal: <strong>{formatTanggalIndo(filterTanggalMulai || todayStr)}</strong></>
                  )}
                </p>
              </div>

              {/* TABEL RINGKASAN PERSENTASE KEHADIRAN RESMI */}
              <div className="border-2 border-slate-800 rounded-xl overflow-hidden print:break-inside-avoid">
                <div className="bg-slate-900 text-white px-3 py-1.5 font-bold text-[11px] uppercase tracking-wider flex items-center justify-between">
                  <span>Ringkasan Statistik Persentase Kehadiran Resmi</span>
                  <span>Total Murid: {totalSiswaCohort} Orang</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-6 divide-x divide-y sm:divide-y-0 divide-slate-300 text-center text-xs">
                  <div className="p-2.5 bg-slate-50">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase block">Total Siswa</span>
                    <span className="text-base font-black text-slate-900">{totalSiswaCohort}</span>
                    <span className="text-[10px] text-slate-500 block">100.0%</span>
                  </div>
                  <div className="p-2.5 bg-emerald-50/70">
                    <span className="text-[10px] text-emerald-800 font-semibold uppercase block">Hadir (H+T)</span>
                    <span className="text-base font-black text-emerald-900">{totalHadir}</span>
                    <span className="text-[10px] text-emerald-700 font-bold block">{persenHadir}%</span>
                  </div>
                  <div className="p-2.5 bg-blue-50/70">
                    <span className="text-[10px] text-blue-800 font-semibold uppercase block">Sakit (S)</span>
                    <span className="text-base font-black text-blue-900">{countSakitCohort}</span>
                    <span className="text-[10px] text-blue-700 font-bold block">{persenSakit}%</span>
                  </div>
                  <div className="p-2.5 bg-indigo-50/70">
                    <span className="text-[10px] text-indigo-800 font-semibold uppercase block">Izin (I)</span>
                    <span className="text-base font-black text-indigo-900">{countIzinCohort}</span>
                    <span className="text-[10px] text-indigo-700 font-bold block">{persenIzin}%</span>
                  </div>
                  <div className="p-2.5 bg-rose-50/70">
                    <span className="text-[10px] text-rose-800 font-semibold uppercase block">Alpa / Belum Absen (A)</span>
                    <span className="text-base font-black text-rose-900">{countAlpaCohort}</span>
                    <span className="text-[10px] text-rose-700 font-bold block">{persenAlpa}%</span>
                  </div>
                  <div className="p-2.5 bg-amber-50/70">
                    <span className="text-[10px] text-amber-800 font-semibold uppercase block">Efektivitas Kehadiran</span>
                    <span className="text-base font-black text-amber-900">{persenHadir}%</span>
                    <span className="text-[10px] font-bold text-amber-700 block">
                      {parseFloat(persenHadir) >= 90 ? 'Sangat Baik' : parseFloat(persenHadir) >= 75 ? 'Baik' : 'Perlu Perhatian'}
                    </span>
                  </div>
                </div>
              </div>

              {/* TABEL DETAIL KEHADIRAN SISWA */}
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 font-bold border-b border-slate-300">
                    <tr>
                      <th className="py-2 px-2 text-center border-r border-slate-300 w-8">No</th>
                      <th className="py-2 px-2 border-r border-slate-300 w-24">NIPD / NISN</th>
                      <th className="py-2 px-2.5 border-r border-slate-300">Nama Lengkap Siswa</th>
                      <th className="py-2 px-2 border-r border-slate-300 w-28">Kelas / Rombel</th>
                      {isDateRange ? (
                        <>
                          <th className="py-2 px-1 text-center border-r border-slate-300 w-10 bg-emerald-50 text-emerald-900" title="Hadir (H)">H</th>
                          <th className="py-2 px-1 text-center border-r border-slate-300 w-10 bg-amber-50 text-amber-900" title="Terlambat (T)">T</th>
                          <th className="py-2 px-1 text-center border-r border-slate-300 w-10 bg-blue-50 text-blue-900" title="Sakit (S)">S</th>
                          <th className="py-2 px-1 text-center border-r border-slate-300 w-10 bg-indigo-50 text-indigo-900" title="Izin (I)">I</th>
                          <th className="py-2 px-1 text-center border-r border-slate-300 w-10 bg-rose-50 text-rose-900" title="Alpa (A)">A</th>
                          <th className="py-2 px-2 text-center border-r border-slate-300 w-16">Total Hadir</th>
                          <th className="py-2 px-2 text-center border-r border-slate-300 w-16">% Hadir</th>
                          <th className="py-2 px-2 border-r border-slate-300 w-24">Evaluasi</th>
                        </>
                      ) : (
                        <>
                          <th className="py-2 px-2.5 text-center border-r border-slate-300 w-24">Status Presensi</th>
                          <th className="py-2 px-2.5 text-center border-r border-slate-300 w-20">Jam Pindai</th>
                          <th className="py-2 px-2.5 border-r border-slate-300 w-24">Metode</th>
                          <th className="py-2 px-2.5 border-r border-slate-300">Keterangan</th>
                        </>
                      )}
                      <th className="py-2 px-2 text-center w-14">Paraf</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredDisplayList.map((item, idx) => {
                      const isHadir = item.record?.status === 'Hadir';
                      const isTerlambat = item.record?.status === 'Terlambat';
                      const isSakit = item.record?.status === 'Sakit';
                      const isIzin = item.record?.status === 'Izin';
                      const isAlpa = item.record?.status === 'Alpa' || !item.record;

                      return (
                        <tr key={item.student.id} className={`${idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'} print:break-inside-avoid`}>
                          <td className="py-2 px-2 text-center border-r border-slate-200 font-medium">{idx + 1}</td>
                          <td className="py-2 px-2 font-mono border-r border-slate-200">
                            <span className="font-bold text-slate-800 text-[11px]">{item.student.nipd || item.student.nipOrNis || '-'}</span>
                            {item.student.nisn && (
                              <span className="block text-[9.5px] text-slate-400 font-mono">NISN: {item.student.nisn}</span>
                            )}
                          </td>
                          <td className="py-2 px-2.5 font-bold border-r border-slate-200 text-slate-900">
                            {item.student.nama}
                          </td>
                          <td className="py-2 px-2 border-r border-slate-200 text-slate-700 text-[11px]">
                            {item.student.kelas || item.student.namaKelas || filterKelas}
                          </td>
                          {isDateRange ? (
                            <>
                              <td className="py-2 px-1 text-center font-bold border-r border-slate-200 text-emerald-800 bg-emerald-50/30">
                                {item.hCount}
                              </td>
                              <td className="py-2 px-1 text-center font-bold border-r border-slate-200 text-amber-800 bg-amber-50/30">
                                {item.tCount}
                              </td>
                              <td className="py-2 px-1 text-center font-bold border-r border-slate-200 text-blue-800 bg-blue-50/30">
                                {item.sCount}
                              </td>
                              <td className="py-2 px-1 text-center font-bold border-r border-slate-200 text-indigo-800 bg-indigo-50/30">
                                {item.iCount}
                              </td>
                              <td className="py-2 px-1 text-center font-bold border-r border-slate-200 text-rose-800 bg-rose-50/30">
                                {item.aCount}
                              </td>
                              <td className="py-2 px-2 text-center font-extrabold border-r border-slate-200 text-slate-900">
                                {item.totalHadirSiswa} Hari
                              </td>
                              <td className="py-2 px-2 text-center font-mono font-bold border-r border-slate-200 text-slate-800">
                                {item.persenHadirSiswa}%
                              </td>
                              <td className="py-2 px-2 border-r border-slate-200 text-[10.5px]">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  Number(item.persenHadirSiswa) >= 90 ? 'bg-emerald-100 text-emerald-800' :
                                  Number(item.persenHadirSiswa) >= 75 ? 'bg-amber-100 text-amber-800' :
                                  'bg-rose-100 text-rose-800'
                                }`}>
                                  {item.keterangan}
                                </span>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="py-2 px-2.5 text-center border-r border-slate-200">
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isHadir ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                                  isTerlambat ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                                  isSakit ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                                  isIzin ? 'bg-indigo-100 text-indigo-800 border border-indigo-300' :
                                  'bg-rose-100 text-rose-800 border border-rose-300'
                                }`}>
                                  {item.status}
                                </span>
                              </td>
                              <td className="py-2 px-2.5 text-center font-mono border-r border-slate-200 text-slate-700">
                                {item.waktu}
                              </td>
                              <td className="py-2 px-2.5 border-r border-slate-200 text-slate-600 text-[11px]">
                                {item.metode}
                              </td>
                              <td className="py-2 px-2.5 border-r border-slate-200 text-slate-600 text-[11px]">
                                {item.keterangan}
                              </td>
                            </>
                          )}
                          <td className="py-2 px-2 text-center text-slate-300 font-mono text-[10px]">
                            ______
                          </td>
                        </tr>
                      );
                    })}

                    {filteredDisplayList.length === 0 && (
                      <tr>
                        <td colSpan={isDateRange ? 13 : 9} className="py-8 text-center text-slate-400 text-xs">
                          {printScope === 'tidak_hadir' 
                            ? 'Luar biasa! Seluruh siswa pada rombel dan rentang tanggal ini tercatat HADIR (0 Siswa Absen).'
                            : 'Tidak ada data siswa yang cocok dengan kriteria filter presensi.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Official Signatures */}
              <div className="pt-6 grid grid-cols-2 text-xs text-slate-800 print:break-inside-avoid">
                <div className="text-center space-y-12">
                  <div>
                    <p>Petugas Presensi / Wali Kelas,</p>
                  </div>
                  <div>
                    <p className="font-bold underline">{currentUser.nama}</p>
                    <p className="text-[10px] text-slate-500">NIP/NIPD: {currentUser.nipOrNis || '-'}</p>
                  </div>
                </div>

                <div className="text-center space-y-12">
                  <div>
                    <p>
                      {schoolInfo?.raporConfig?.tempatTitimangsa || 'Parungpanjang, Bogor'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <p>Kepala {schoolInfo?.nama || 'Sekolah'},</p>
                  </div>
                  <div>
                    <p className="font-bold underline">{schoolInfo?.kepalaSekolah || 'Dr. Nurul Husnul Lail, M.Kes.'}</p>
                    <p className="text-[10px] text-slate-500">NIP: {schoolInfo?.nipKepalaSekolah || '197108151998021004'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Buttons (Hidden When Printed) */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 print:hidden">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Format cetak otomatis disesuaikan ke standar dokumen resmi A4 / F4.</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('printable-rekap-doc') || document.querySelector('.printable-document');
                    if (el) {
                      printDocumentArea(el as HTMLElement, {
                        title: `Rekapitulasi Presensi - ${filterKelas}`,
                        paperSize: 'A4',
                        orientation: 'portrait',
                        margin: 'sempit',
                      });
                    } else {
                      window.print();
                    }
                  }}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md flex items-center gap-1.5 transition-all transform hover:-translate-y-0.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Lembar Presensi Sekarang (PDF / Print)</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL PRESENSI OTOMATIS (PER KELAS ATAU SEMUA KELAS, SESUAI TANGGAL TERPILIH) */}
      {showAutoAbsenModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto border border-slate-100">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Presensi Otomatis Siswa
                  </h3>
                  <p className="text-xs text-slate-500">
                    Set presensi kehadiran siswa sesuai tanggal terpilih (per kelas atau semua kelas).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAutoAbsenModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center font-bold text-xs transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* 1. Pilih Tanggal Presensi */}
              <div className="space-y-2 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    1. Pilih Tanggal Presensi (Bebas Pilih Tanggal)
                  </span>
                  <span className="text-[11px] font-semibold text-slate-600 font-mono">
                    {autoAbsenTanggal ? `${getNamaHariIndo(autoAbsenTanggal)}, ${formatTanggalIndo(autoAbsenTanggal)}` : '-'}
                  </span>
                </label>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    value={autoAbsenTanggal}
                    onChange={(e) => setAutoAbsenTanggal(e.target.value)}
                    className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-500 bg-white shadow-2xs"
                  />

                  {/* Quick Date Presets */}
                  <button
                    type="button"
                    onClick={() => setAutoAbsenTanggal(todayIso)}
                    className={`px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      autoAbsenTanggal === todayIso
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Hari Ini
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() - 1);
                      setAutoAbsenTanggal(getLocalDateString(d));
                    }}
                    className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    Kemarin
                  </button>

                  {filterTanggalMulai && filterTanggalMulai !== todayIso && (
                    <button
                      type="button"
                      onClick={() => setAutoAbsenTanggal(filterTanggalMulai)}
                      className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-white text-teal-700 border border-teal-200 hover:bg-teal-50 transition-all cursor-pointer"
                    >
                      Sesuai Filter ({formatTanggalIndo(filterTanggalMulai)})
                    </button>
                  )}
                </div>

                {/* Status Hari Efektif / Libur */}
                <div className="pt-1">
                  {isHariSekolahEfektif(autoAbsenTanggal) ? (
                    <div className="text-[11px] text-emerald-700 flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Hari Sekolah Efektif KBM (Senin - Jumat)</span>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">
                          {getAlasanHariTidakEfektif(autoAbsenTanggal) || 'Hari Libur'}
                        </span>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          Hari akhir pekan / libur nasional bukan KBM reguler. Anda tetap dapat menyimpan presensi jika ada kegiatan khusus, ekskul, atau ujian susulan.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Pilih Rombel / Kelas */}
              <div className="space-y-2.5 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    2. Pilih Rombel / Kelas (Per Kelas atau Semua Kelas)
                  </span>
                  <span className="text-[11px] font-bold text-blue-700">
                    {autoAbsenTargetStudents.length} Siswa Terdaftar
                  </span>
                </label>

                {/* Scope Switcher Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAutoAbsenKelas('Semua')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      autoAbsenKelas === 'Semua'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-200'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-extrabold text-xs flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      <span>Semua Kelas</span>
                    </div>
                    <div className={`text-[10px] mt-0.5 ${autoAbsenKelas === 'Semua' ? 'text-blue-100' : 'text-slate-500'}`}>
                      Seluruh {siswaList.length} siswa sekolah
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (autoAbsenKelas === 'Semua') {
                        const firstK = kelasList[0]?.namaKelas?.replace(/^Kelas\s+/i, '').trim() || 'X TKJ 1';
                        setAutoAbsenKelas(firstK);
                      }
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      autoAbsenKelas !== 'Semua'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-200'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-extrabold text-xs flex items-center gap-1.5">
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Per Kelas Tertentu</span>
                    </div>
                    <div className={`text-[10px] mt-0.5 ${autoAbsenKelas !== 'Semua' ? 'text-blue-100' : 'text-slate-500'}`}>
                      {autoAbsenKelas !== 'Semua' ? `Kelas ${autoAbsenKelas}` : 'Pilih salah satu rombel'}
                    </div>
                  </button>
                </div>

                {/* Class Dropdown */}
                <div className="pt-1">
                  <select
                    value={autoAbsenKelas}
                    onChange={(e) => setAutoAbsenKelas(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="Semua">🌐 Semua Kelas / Seluruh Siswa ({siswaList.length} Siswa)</option>
                    {kelasList.map(k => {
                      const cleanK = (k.namaKelas || '').replace(/^Kelas\s+/i, '').trim();
                      const countInK = siswaList.filter(s => isSameKelas(s.kelas, cleanK) || isSameKelas(s.namaKelas, cleanK)).length;
                      return (
                        <option key={k.id} value={cleanK}>
                          🏫 Kelas {cleanK} ({countInK} Siswa)
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* 3. Pilih Status Presensi */}
              <div className="space-y-2 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  3. Pilih Status Kehadiran
                </label>

                <div className="grid grid-cols-5 gap-1.5">
                  {(['Hadir', 'Terlambat', 'Sakit', 'Izin', 'Alpa'] as const).map(stat => (
                    <button
                      key={stat}
                      type="button"
                      onClick={() => setAutoAbsenStatus(stat)}
                      className={`py-2 px-1 rounded-xl text-xs font-extrabold text-center border transition-all cursor-pointer ${
                        autoAbsenStatus === stat
                          ? stat === 'Hadir' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-200' :
                            stat === 'Terlambat' ? 'bg-amber-600 text-white border-amber-600 shadow-sm ring-2 ring-amber-200' :
                            stat === 'Sakit' ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-200' :
                            stat === 'Izin' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-200' :
                            'bg-rose-600 text-white border-rose-600 shadow-sm ring-2 ring-rose-200'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {stat}
                    </button>
                  ))}
                </div>

                <div className="pt-1">
                  <input
                    type="text"
                    placeholder="Keterangan / catatan presensi..."
                    value={autoAbsenKeterangan}
                    onChange={(e) => setAutoAbsenKeterangan(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 bg-white"
                  />
                </div>
              </div>

              {/* 4. Mode Perekaman Data */}
              <div className="space-y-2 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-600" />
                  4. Aturan Siswa yang Sudah Memiliki Presensi pada Tanggal Ini
                </label>

                <div className="space-y-2">
                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                    <input
                      type="radio"
                      name="autoAbsenMode"
                      checked={autoAbsenMode === 'belum_ada'}
                      onChange={() => setAutoAbsenMode('belum_ada')}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-900 block">
                        Hanya siswa yang BELUM memiliki presensi di tanggal ini (Disarankan)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Siswa yang sudah scan barcode/QR mandiri tidak akan ditimpa, hanya melengkapi siswa yang belum absen ({autoAbsenStats.unmarkedCount} siswa).
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                    <input
                      type="radio"
                      name="autoAbsenMode"
                      checked={autoAbsenMode === 'semua'}
                      onChange={() => setAutoAbsenMode('semua')}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-900 block">
                        Perbarui / Setel SEMUA siswa di rombel ini
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Menimpa catatan seluruh siswa pada kelas terpilih menjadi status [{autoAbsenStatus}] ({autoAbsenTargetStudents.length} siswa).
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* 5. Live Summary Banner */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[11px] text-slate-500 block uppercase font-bold tracking-wider">
                    Ringkasan Eksekusi Presensi:
                  </span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {autoAbsenStats.willMarkCount} Siswa akan ditandai [{autoAbsenStatus}]
                  </span>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    Kelas: <strong className="text-emerald-800">{autoAbsenKelas}</strong> • Tanggal: <strong className="text-emerald-800">{formatTanggalIndo(autoAbsenTanggal)}</strong>
                  </div>
                </div>

                <div className="text-right">
                  <span className="px-3 py-1 rounded-full bg-emerald-600 text-white font-extrabold text-xs shadow-xs">
                    {autoAbsenStats.willMarkCount} Siswa
                  </span>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAutoAbsenModal(false)}
                className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={autoAbsenStats.willMarkCount === 0}
                onClick={handleExecuteAutoAbsen}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer ${
                  autoAbsenStats.willMarkCount > 0
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white transform hover:-translate-y-0.5'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Zap className="w-4 h-4" />
                <span>
                  {autoAbsenStats.willMarkCount > 0
                    ? `Terapkan Presensi (${autoAbsenStats.willMarkCount} Siswa) ⚡`
                    : 'Seluruh Siswa Sudah Terabsen'}
                </span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL IMPOR ABSENSI SISWA (EXCEL / CSV / SEPTEMBER 2026) */}
      {showImportExcelModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-5 my-auto max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Import Presensi Siswa (Excel / CSV)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Unggah rekap kehadiran atau generate otomatis presensi Bulan September 2026.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowImportExcelModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center font-bold text-xs transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Sub-Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <button
                type="button"
                onClick={() => setImportTab('upload')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  importTab === 'upload'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                📁 Unggah Berkas Excel/CSV
              </button>
              <button
                type="button"
                onClick={() => setImportTab('september_otomatis')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  importTab === 'september_otomatis'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                ⚡ Presensi September 2026
              </button>
              <button
                type="button"
                onClick={() => setImportTab('template')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  importTab === 'template'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                📋 Format Template
              </button>
            </div>

            {/* Modal Content Scroll Area */}
            <div className="overflow-y-auto space-y-4 flex-1 pr-1">
              {/* TAB 1: UPLOAD FILE */}
              {importTab === 'upload' && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-center space-y-3">
                    <FileSpreadsheet className="w-10 h-10 text-indigo-500 mx-auto" />
                    <div>
                      <p className="text-xs font-bold text-slate-700">Pilih Berkas Excel (.xlsx, .xls) atau CSV</p>
                      <p className="text-[11px] text-slate-500">
                        Format kolom otomatis mengenali NIPD, NISN, Nama Siswa, Kelas, Tanggal, dan Status Kehadiran.
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-3">
                      <input
                        ref={importFileInputRef}
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={handleSelectImportFile}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => importFileInputRef.current?.click()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                      >
                        Pilih Berkas Komputer
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadTemplate}
                        className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                        <span>Unduh Template</span>
                      </button>
                    </div>
                    {importFileName && (
                      <p className="text-[11px] text-emerald-700 font-bold bg-emerald-50 py-1 px-3 rounded-lg inline-block border border-emerald-200">
                        Berkas terpilih: {importFileName}
                      </p>
                    )}
                  </div>

                  {importIsLoading && (
                    <div className="p-4 text-center text-xs text-indigo-600 font-bold flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Sedang membaca dan memverifikasi baris data presensi...</span>
                    </div>
                  )}

                  {importError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                      <span>{importError}</span>
                    </div>
                  )}

                  {importRecordsPreview.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700">
                          Pratinjau Data ({importRecordsPreview.length} Catatan Terbaca)
                        </span>
                        <span className="text-[11px] text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded-md">
                          Siap diimpor ke sistem
                        </span>
                      </div>

                      <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-xl text-[11px]">
                        <table className="w-full text-left divide-y divide-slate-200">
                          <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0">
                            <tr>
                              <th className="py-2 px-2.5">Siswa</th>
                              <th className="py-2 px-2.5">Kelas</th>
                              <th className="py-2 px-2.5">Tanggal</th>
                              <th className="py-2 px-2.5">Status</th>
                              <th className="py-2 px-2.5">Waktu</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {importRecordsPreview.slice(0, 15).map((rec, rIdx) => (
                              <tr key={rec.id || rIdx} className="hover:bg-slate-50">
                                <td className="py-1.5 px-2.5 font-semibold text-slate-800">{rec.namaSiswa}</td>
                                <td className="py-1.5 px-2.5 text-slate-600">{rec.kelas}</td>
                                <td className="py-1.5 px-2.5 text-slate-600 font-mono">{rec.tanggal}</td>
                                <td className="py-1.5 px-2.5">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    rec.status === 'Hadir' ? 'bg-emerald-100 text-emerald-800' :
                                    rec.status === 'Terlambat' ? 'bg-amber-100 text-amber-800' :
                                    rec.status === 'Sakit' ? 'bg-blue-100 text-blue-800' :
                                    rec.status === 'Izin' ? 'bg-purple-100 text-purple-800' :
                                    'bg-rose-100 text-rose-800'
                                  }`}>
                                    {rec.status}
                                  </span>
                                </td>
                                <td className="py-1.5 px-2.5 text-slate-500 font-mono">{rec.waktu}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {importRecordsPreview.length > 15 && (
                        <p className="text-[10px] text-slate-400 italic text-center">
                          Menampilkan 15 dari {importRecordsPreview.length} catatan presensi.
                        </p>
                      )}

                      {importUnmatched.length > 0 && (
                        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800">
                          ⚠️ {importUnmatched.length} nama siswa dalam berkas tidak ditemukan di database sekolah. Data tetap diimpor dengan nama yang tertera di berkas.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: GENERATE SEPTEMBER 2026 */}
              {importTab === 'september_otomatis' && (
                <div className="space-y-4">
                  <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span>Generator Presensi Penuh Bulan September 2026</span>
                    </div>
                    <p className="text-xs text-indigo-800 leading-relaxed">
                      Fitur ini otomatis memasukkan catatan presensi untuk <strong>seluruh hari efektif KBM (Senin - Jumat) di bulan September 2026</strong> (total 22 hari sekolah, tanggal merah dan akhir pekan dikecualikan).
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Sasaran Rombel / Kelas:</label>
                      <select
                        value={septemberTargetKelas}
                        onChange={(e) => setSeptemberTargetKelas(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="Semua">Semua Kelas ({effectiveUsersList.filter(u => u.role === 'siswa').length} Siswa)</option>
                        {kelasList.map(k => (
                          <option key={k.id} value={k.namaKelas}>{k.namaKelas} ({k.jurusan})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Status Kehadiran Default:</label>
                      <select
                        value={septemberStatus}
                        onChange={(e) => setSeptemberStatus(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="Hadir">Hadir (07:15 WIB)</option>
                        <option value="Terlambat">Terlambat</option>
                        <option value="Izin">Izin</option>
                        <option value="Sakit">Sakit</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
                    <p className="font-bold text-slate-700">Rincian Hari Efektif September 2026:</p>
                    <p>• 1 - 4 September 2026 (Selasa - Jumat)</p>
                    <p>• 7 - 11 September 2026 (Senin - Jumat)</p>
                    <p>• 14 - 18 September 2026 (Senin - Jumat)</p>
                    <p>• 21 - 25 September 2026 (Senin - Jumat)</p>
                    <p>• 28 - 30 September 2026 (Senin - Rabu)</p>
                    <p className="text-emerald-700 font-semibold mt-1">✓ Total: 22 hari KBM efektif</p>
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateFullSeptember2026}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Zap className="w-4 h-4" />
                    <span>Generate & Simpan Presensi September 2026 Sekarang</span>
                  </button>
                </div>
              )}

              {/* TAB 3: FORMAT TEMPLATE */}
              {importTab === 'template' && (
                <div className="space-y-3 text-xs">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <h4 className="font-bold text-slate-800">Petunjuk Format Kolom Excel:</h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Sistem mendukung berkas Microsoft Excel (.xlsx, .xls) dan CSV (.csv). Baris pertama harus berisi judul kolom. Kolom yang dikenali:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-700 font-medium">
                      <li><strong>NIPD / NISN:</strong> Nomor induk siswa (kunci identifikasi utama)</li>
                      <li><strong>Nama Siswa:</strong> Nama lengkap siswa</li>
                      <li><strong>Kelas:</strong> Nama rombongan belajar (contoh: X Farmasi 1)</li>
                      <li><strong>Tanggal:</strong> Format YYYY-MM-DD (contoh: 2026-09-01) atau DD/MM/YYYY</li>
                      <li><strong>Status:</strong> Hadir, Sakit, Izin, Alpa, atau Terlambat</li>
                      <li><strong>Waktu:</strong> Format jam:menit (contoh: 07:15) (opsional)</li>
                      <li><strong>Keterangan:</strong> Catatan tambahan (opsional)</li>
                    </ul>
                  </div>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Unduh Template Excel Resmi (.xlsx)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowImportExcelModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Tutup
              </button>

              {importTab === 'upload' && importRecordsPreview.length > 0 && (
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Terapkan {importRecordsPreview.length} Data Absensi ⚡</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
