import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, Ujian, HasilUjian, JadwalPelajaran, SchoolInfo, AbsensiRecord, NilaiMapelSiswa, Kelas, PraktikKerjaIndustriItem, FormulirPPDB, Mapel } from '../types';
import { SquareQrCode } from './SquareQrCode';
import { AbsensiBarcodeView } from './AbsensiBarcodeView';
import { AbsenGpsModal } from './AbsenGpsModal';
import { KartuPelajarModal } from './KartuPelajarModal';
import { hitungNilaiAkhir } from '../data/mockAcademicData';
import { 
  isClassXIorXII, 
  getDefaultPrakerinForMajor, 
  isRecordForStudent, 
  cleanScannedQrString, 
  getLocalDateString, 
  getLocalTimeString,
  isHariSekolahEfektif,
  getNamaHariIndo,
  getAlasanHariTidakEfektif,
  getMatchingMapelForKelas,
  sortMapelForRaport,
  getRaportMapelGroups,
  buildKurikulumMerdekaCapaian
} from '../utils/academicHelpers';
import { GreetingBanner } from './GreetingBanner';
import { compressStudentPhoto } from '../utils/imageCompressor';
import { printDocumentArea } from '../utils/printHelper';
import { 
  User as UserIcon, 
  QrCode, 
  Calendar, 
  BookOpen, 
  Award, 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Printer, 
  Edit3, 
  Camera, 
  Lock, 
  Phone, 
  Mail, 
  MapPin, 
  ShieldAlert, 
  Download,
  KeyRound,
  Users,
  Scan,
  Eye,
  EyeOff,
  CalendarCheck,
  Sparkles,
  LogOut,
  GraduationCap,
  RotateCw,
  RefreshCw,
  Upload,
  Image as ImageIcon,
  Volume2,
  ShieldCheck,
  Check,
  X,
  BadgeCheck,
  FileCheck,
  Building,
  ExternalLink,
  Search
} from 'lucide-react';
import jsQR from 'jsqr';

interface SiswaDashboardViewProps {
  currentUser: User;
  ujianList: Ujian[];
  hasilList: HasilUjian[];
  jadwalPelajaranList: JadwalPelajaran[];
  absensiList: AbsensiRecord[];
  nilaiList: NilaiMapelSiswa[];
  kelasList: Kelas[];
  mapelList?: Mapel[];
  schoolInfo: SchoolInfo;
  onNavigateToCAT: () => void;
  onUpdateProfile: (updatedUser: User) => void;
  onAddAbsensi: (record: AbsensiRecord) => void;
  onUpdateAbsensi: (record: AbsensiRecord) => void;
  onDeleteAbsensi: (id: string) => void;
  allUsersList: User[];
  onLogout?: () => void;
  formulirList?: FormulirPPDB[];
  onNavigateToPPDB?: () => void;
}

export const SiswaDashboardView: React.FC<SiswaDashboardViewProps> = ({
  currentUser,
  ujianList,
  hasilList,
  jadwalPelajaranList,
  absensiList,
  nilaiList,
  kelasList,
  mapelList = [],
  schoolInfo,
  onNavigateToCAT,
  onUpdateProfile,
  onAddAbsensi,
  onUpdateAbsensi,
  onDeleteAbsensi,
  allUsersList,
  onLogout,
  formulirList = [],
  onNavigateToPPDB,
}) => {
  const [activeTab, setActiveTab] = useState<'profil' | 'kartu' | 'absensi' | 'jadwal' | 'presensi_kelas' | 'nilai' | 'raport'>('absensi');
  const [searchRiwayatSiswa, setSearchRiwayatSiswa] = useState('');
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSiswaPeriode, setSelectedSiswaPeriode] = useState<'PTS' | 'PAS' | 'PAT'>('PTS');
  const [inlineAccountMsg, setInlineAccountMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Profile edit form state
  const [editUsername, setEditUsername] = useState(currentUser.username);
  const [editNama, setEditNama] = useState(currentUser.nama);
  const [editTelepon, setEditTelepon] = useState(currentUser.telepon || '081234567890');
  const [editEmail, setEditEmail] = useState(currentUser.email || `${currentUser.username}@smkbaktiputramandiri.sch.id`);
  const [editAlamat, setEditAlamat] = useState(currentUser.alamat || 'Parung Panjang, Bogor');
  const [editPassword, setEditPassword] = useState(currentUser.password || 'siswa');
  const [editFotoUrl, setEditFotoUrl] = useState(currentUser.fotoProfilUrl || '');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);
  const [showAccountPassword, setShowAccountPassword] = useState(false);

  // Sync edit form with currentUser whenever currentUser updates
  React.useEffect(() => {
    setEditUsername(currentUser.username);
    setEditNama(currentUser.nama);
    setEditTelepon(currentUser.telepon || '081234567890');
    setEditEmail(currentUser.email || `${currentUser.username}@smkbaktiputramandiri.sch.id`);
    setEditAlamat(currentUser.alamat || 'Parung Panjang, Bogor');
    setEditPassword(currentUser.password || 'siswa');
    setEditFotoUrl(currentUser.fotoProfilUrl || '');
  }, [currentUser]);

  // Self QR & GPS Attendance State
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isGpsModalOpen, setIsGpsModalOpen] = useState(false);
  const [isKartuModalOpen, setIsKartuModalOpen] = useState(false);
  const [qrInputCode, setQrInputCode] = useState('');
  const [qrNotice, setQrNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Student Real-time Camera QR Scanner State
  const [isSelfCameraActive, setIsSelfCameraActive] = useState<boolean>(true);
  const [selfCameraFacing, setSelfCameraFacing] = useState<'environment' | 'user'>('environment');
  const [selfCameraError, setSelfCameraError] = useState<string | null>(null);
  const [isProcessingQr, setIsProcessingQr] = useState<boolean>(false);
  const selfVideoRef = useRef<HTMLVideoElement | null>(null);
  const selfStreamRef = useRef<MediaStream | null>(null);
  const selfScanLoopRef = useRef<number | null>(null);
  const selfLastScanTimeRef = useRef<number>(0);

  // Play pleasant audio beep on successful QR scan
  const playSelfBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      osc.frequency.setValueAtTime(1320, audioCtx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch {}
  };

  const stopSelfCamera = () => {
    if (selfStreamRef.current) {
      selfStreamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      selfStreamRef.current = null;
    }
    if (selfScanLoopRef.current) {
      cancelAnimationFrame(selfScanLoopRef.current);
      selfScanLoopRef.current = null;
    }
    setIsSelfCameraActive(false);
  };

  const startSelfCamera = async (facing: 'environment' | 'user' = selfCameraFacing) => {
    stopSelfCamera();
    setSelfCameraError(null);
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 640 }, height: { ideal: 640 } },
          audio: false
        });
      } catch {
        // Fallback without strict constraints
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      selfStreamRef.current = stream;
      setIsSelfCameraActive(true);

      if (selfVideoRef.current) {
        selfVideoRef.current.srcObject = stream;
        selfVideoRef.current.play().catch(console.warn);
      }
    } catch (err: any) {
      console.warn('Student camera access error:', err);
      setSelfCameraError('Kamera tidak dapat diakses atau izin kamera ditolak oleh browser/perangkat Anda. Mohon izinkan akses kamera atau gunakan input kode token di bawah.');
      setIsSelfCameraActive(false);
    }
  };

  const toggleSelfCameraFacing = () => {
    const next = selfCameraFacing === 'environment' ? 'user' : 'environment';
    setSelfCameraFacing(next);
    if (isSelfCameraActive) {
      startSelfCamera(next);
    }
  };

  // Attach stream when video element renders
  useEffect(() => {
    if (isScanModalOpen && isSelfCameraActive && selfVideoRef.current && selfStreamRef.current) {
      selfVideoRef.current.srcObject = selfStreamRef.current;
      selfVideoRef.current.play().catch(console.warn);
    }
  }, [isScanModalOpen, isSelfCameraActive]);

  // Clean up camera on unmount or modal close
  useEffect(() => {
    if (!isScanModalOpen) {
      stopSelfCamera();
    }
  }, [isScanModalOpen]);

  useEffect(() => {
    return () => {
      stopSelfCamera();
    };
  }, []);

  // Process self attendance with a recognized code
  const handleSelfQrSubmitWithCode = (code: string) => {
    const rawTrimmed = code.trim();
    if (!rawTrimmed) return;
    const cleanCode = cleanScannedQrString(rawTrimmed);

    const todayStr = getLocalDateString();
    const now = new Date();
    const timeStr = getLocalTimeString(now);

    if (!isHariSekolahEfektif(todayStr)) {
      const alasan = getAlasanHariTidakEfektif(todayStr) || 'Hari Libur';
      setQrNotice({ 
        type: 'error', 
        message: `Hari ini (${getNamaHariIndo(todayStr)}, ${todayStr}) adalah ${alasan}. Sesuai kebijakan SMK Bakti Putra Mandiri, otomatis tidak ada kegiatan KBM atau presensi.` 
      });
      return;
    }

    // Check if already checked in today using comprehensive matching
    const already = absensiList.find(a => 
      isRecordForStudent(a, currentUser) && 
      a.tanggal === todayStr
    );

    if (already) {
      setQrNotice({ type: 'error', message: `Anda sudah tercatat presensi untuk hari ini (${already.status}) pada pukul ${already.waktu} WIB.` });
      return;
    }

    setIsProcessingQr(true);
    playSelfBeep();
    if (navigator.vibrate) {
      try { navigator.vibrate([100, 50, 100]); } catch {}
    }

    const newRecord: AbsensiRecord = {
      id: `abs-self-${Date.now()}-${currentUser.id}`,
      userId: currentUser.id,
      tanggal: todayStr,
      waktu: timeStr,
      nipd: currentUser.nipd || currentUser.nipOrNis,
      nisn: currentUser.nisn || currentUser.username,
      namaSiswa: currentUser.nama,
      kelas: (currentUser.kelas || currentUser.namaKelas || 'X Farmasi 1').replace(/^Kelas\s+/i, ''),
      status: 'Hadir',
      metode: 'QR Code Mandiri',
      petugas: 'Siswa Mandiri (Kamera Scanner)',
      keterangan: `Presensi mandiri berhasil diverifikasi via scan kamera [${cleanCode || rawTrimmed}]`,
    };

    onAddAbsensi(newRecord);
    setQrNotice({ type: 'success', message: `Alhamdulillah! Presensi Mandiri Anda berhasil diverifikasi pada pukul ${timeStr} WIB. Status: Hadir.` });
    setQrInputCode('');
    stopSelfCamera();
    setIsProcessingQr(false);

    setTimeout(() => {
      setIsScanModalOpen(false);
      setQrNotice(null);
    }, 2400);
  };

  // Continuous frame scanner for student QR modal
  useEffect(() => {
    if (!isScanModalOpen || !isSelfCameraActive || isProcessingQr) {
      if (selfScanLoopRef.current) {
        cancelAnimationFrame(selfScanLoopRef.current);
        selfScanLoopRef.current = null;
      }
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const scanFrame = () => {
      if (selfVideoRef.current && selfVideoRef.current.readyState === selfVideoRef.current.HAVE_ENOUGH_DATA) {
        const video = selfVideoRef.current;
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
              if (now - selfLastScanTimeRef.current > 2500) {
                selfLastScanTimeRef.current = now;
                handleSelfQrSubmitWithCode(code.data.trim());
              }
            }
          }
        }
      }
      selfScanLoopRef.current = requestAnimationFrame(scanFrame);
    };

    selfScanLoopRef.current = requestAnimationFrame(scanFrame);

    return () => {
      if (selfScanLoopRef.current) {
        cancelAnimationFrame(selfScanLoopRef.current);
        selfScanLoopRef.current = null;
      }
    };
  }, [isScanModalOpen, isSelfCameraActive, isProcessingQr]);

  // File upload QR decoder
  const handleUploadQrImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            handleSelfQrSubmitWithCode(code.data.trim());
          } else {
            setQrNotice({ type: 'error', message: 'Tidak dapat menemukan QR Code yang valid pada foto yang diunggah. Silakan gunakan kamera langsung atau masukkan kode manual.' });
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Student Leger & Raport Access Security (Locked by default, requires PIN/Code from Admin)
  const studentNipdKey = currentUser.nipd || currentUser.nipOrNis;
  const [isRaportUnlocked, setIsRaportUnlocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`unlocked_raport_${studentNipdKey}`) === 'true';
    } catch {
      return false;
    }
  });
  const [raportAccessCodeInput, setRaportAccessCodeInput] = useState('');
  const [raportCodeError, setRaportCodeError] = useState<string | null>(null);

  const handleUnlockRaport = (e: React.FormEvent) => {
    e.preventDefault();
    const correctCode = (schoolInfo?.raporConfig?.kodeAksesRaport || 'BPM2026').trim().toUpperCase();
    if (raportAccessCodeInput.trim().toUpperCase() === correctCode) {
      setIsRaportUnlocked(true);
      setRaportCodeError(null);
      try {
        localStorage.setItem(`unlocked_raport_${studentNipdKey}`, 'true');
      } catch {}
    } else {
      setRaportCodeError('Kode akses salah. Silakan minta kode akses raport resmi ke Administrator atau Wali Kelas Anda.');
    }
  };

  const handleLockRaport = () => {
    setIsRaportUnlocked(false);
    setRaportAccessCodeInput('');
    try {
      localStorage.removeItem(`unlocked_raport_${studentNipdKey}`);
    } catch {}
  };

  // Direct self attendance handler: opens GPS Geofence modal with tolerance check
  const handleDirectSelfAttend = () => {
    setIsGpsModalOpen(true);
  };

  const handleSelfQrSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrInputCode.trim()) {
      setQrNotice({ type: 'error', message: 'Silakan masukkan kode barcode / QR presensi harian dari admin, staf, atau pengurus kelas.' });
      return;
    }
    handleSelfQrSubmitWithCode(qrInputCode.trim());
  };

  const studentNipd = currentUser.nipd || currentUser.nipOrNis;
  const studentNisn = currentUser.nisn || currentUser.username;
  const studentKejuruan = (() => {
    let val = currentUser.jurusan || currentUser.namaKelas || currentUser.kelas || '';
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
  })();

  // Filter student's personal attendance (sorted newest first, only effective school days, deduplicated per date)
  const myAbsensiRecords = useMemo(() => {
    const raw = absensiList
      .filter(a => isRecordForStudent(a, currentUser) && isHariSekolahEfektif(a.tanggal))
      .sort((a, b) => {
        const dCompare = (b.tanggal || '').localeCompare(a.tanggal || '');
        if (dCompare !== 0) return dCompare;
        return (b.waktu || '').localeCompare(a.waktu || '');
      });

    const dateMap = new Map<string, AbsensiRecord>();
    raw.forEach(r => {
      if (!dateMap.has(r.tanggal)) {
        dateMap.set(r.tanggal, r);
      } else {
        const cur = dateMap.get(r.tanggal)!;
        if ((cur.status !== 'Hadir' && cur.status !== 'Terlambat') && (r.status === 'Hadir' || r.status === 'Terlambat')) {
          dateMap.set(r.tanggal, r);
        }
      }
    });
    return Array.from(dateMap.values());
  }, [absensiList, currentUser]);

  const filteredMyAbsensiRecords = useMemo(() => {
    const q = searchRiwayatSiswa.trim().toLowerCase();
    if (!q) return myAbsensiRecords;
    return myAbsensiRecords.filter(r => 
      (r.tanggal && r.tanggal.toLowerCase().includes(q)) ||
      (r.status && r.status.toLowerCase().includes(q)) ||
      (r.metode && r.metode.toLowerCase().includes(q)) ||
      (r.keterangan && r.keterangan.toLowerCase().includes(q)) ||
      (r.petugas && r.petugas.toLowerCase().includes(q))
    );
  }, [myAbsensiRecords, searchRiwayatSiswa]);

  const norm = (s?: string) => (s || '').trim().toLowerCase();
  const countHadir = myAbsensiRecords.filter(a => ['hadir', 'h', 'masuk'].includes(norm(a.status))).length;
  const countTerlambat = myAbsensiRecords.filter(a => ['terlambat', 't'].includes(norm(a.status))).length;
  const countSakit = myAbsensiRecords.filter(a => ['sakit', 's'].includes(norm(a.status))).length;
  const countIzin = myAbsensiRecords.filter(a => ['izin', 'ijin', 'i'].includes(norm(a.status))).length;
  const countAlpa = myAbsensiRecords.filter(a => ['alpa', 'alpha', 'a', 'tanpa keterangan'].includes(norm(a.status))).length;
  const totalHari = myAbsensiRecords.length || 1;
  const persenKehadiran = Math.round(((countHadir + countTerlambat) / totalHari) * 100);

  // Rekap presensi resmi untuk lembar Rapor (sinkron dengan input & hasil sinkronisasi wali kelas)
  const [raportAbsensiMap, setRaportAbsensiMap] = useState<Record<string, { hadir: number; sakit: number; izin: number; alpa: number }>>(() => {
    try {
      const raw = localStorage.getItem('saved_raport_absensi');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const handleRemoteAbsen = (e: any) => {
      if (e?.detail && typeof e.detail === 'object') {
        setRaportAbsensiMap(e.detail);
      }
    };
    window.addEventListener('raport_absensi_synced', handleRemoteAbsen);
    return () => window.removeEventListener('raport_absensi_synced', handleRemoteAbsen);
  }, []);

  const studentOfficialAbsensi = useMemo(() => {
    const sNipd = currentUser.nipd || currentUser.nipOrNis || '';
    const cleanKey = sNipd.replace(/\./g, '');
    const customRec = 
      raportAbsensiMap[sNipd] || 
      raportAbsensiMap[cleanKey] || 
      (currentUser.nisn ? raportAbsensiMap[currentUser.nisn] : undefined) || 
      (currentUser.id ? raportAbsensiMap[currentUser.id] : undefined);

    return {
      hadir: (customRec && typeof customRec.hadir === 'number') ? customRec.hadir : (countHadir + countTerlambat),
      sakit: (customRec && typeof customRec.sakit === 'number') ? customRec.sakit : countSakit,
      izin: (customRec && typeof customRec.izin === 'number') ? customRec.izin : countIzin,
      alpa: (customRec && typeof customRec.alpa === 'number') ? customRec.alpa : countAlpa,
    };
  }, [currentUser, raportAbsensiMap, countHadir, countTerlambat, countSakit, countIzin, countAlpa]);

  // Filter student's academic grades sorted by statutory curriculum regulations
  const myGrades = useMemo(() => {
    const raw = nilaiList.filter(n => n.nipd === studentNipd || n.namaSiswa === currentUser.nama || isRecordForStudent(n as any, currentUser));
    return sortMapelForRaport(raw);
  }, [nilaiList, studentNipd, currentUser]);

  // Student's matching class & official curriculum subjects sorted according to Kepmendikbudristek No. 262/M/2022
  const studentKelas = useMemo(() => {
    return kelasList.find(k => k.id === currentUser.idKelas || k.namaKelas === currentUser.kelas || k.namaKelas === currentUser.namaKelas);
  }, [kelasList, currentUser]);

  const studentRaportMapels = useMemo(() => {
    if (!mapelList || mapelList.length === 0) return [];
    const matched = getMatchingMapelForKelas(studentKelas, mapelList, [currentUser]);
    return sortMapelForRaport(matched);
  }, [studentKelas, mapelList, currentUser]);

  const studentRaportGroups = useMemo(() => {
    return getRaportMapelGroups(studentRaportMapels);
  }, [studentRaportMapels]);

  // Robust grade finder for a subject in the student's report card
  const findMySubjectGrade = (mapel: Mapel) => {
    return nilaiList.find(n => {
      const matchS = isRecordForStudent(n as any, currentUser);
      if (!matchS) return false;
      const matchM = n.mapelId === mapel.id || n.mapelId === mapel.kode || (n.mapelNama && n.mapelNama.toLowerCase() === mapel.namaMapel.toLowerCase());
      return matchM;
    });
  };

  // Student's exams
  const myExams = ujianList.filter(u => {
    const targets = u.targetKelas || (Array.isArray(u.kelasTarget) ? u.kelasTarget : []);
    return (
      targets.includes('Semua') || 
      (currentUser.kelas && targets.includes(currentUser.kelas)) ||
      (currentUser.namaKelas && targets.includes(currentUser.namaKelas))
    );
  });

  // Student's timetable
  const myTimetable = jadwalPelajaranList.filter(j => 
    (currentUser.kelas && j.namaKelas.includes(currentUser.kelas)) ||
    (currentUser.namaKelas && j.namaKelas.includes(currentUser.namaKelas)) ||
    j.namaKelas === currentUser.kelas
  );

  // Praktik Kerja Industri (PKL) khusus Kelas XI & XII
  const studentIsXIorXII = isClassXIorXII(currentUser.kelas || currentUser.namaKelas);
  const studentPrakerinList: PraktikKerjaIndustriItem[] = (() => {
    if (!studentIsXIorXII) return [];
    try {
      const raw = localStorage.getItem('saved_raport_prakerin');
      if (raw) {
        const map = JSON.parse(raw);
        const myKey = currentUser.nipd || currentUser.nipOrNis;
        if (map[myKey] && map[myKey].length > 0) {
          return map[myKey];
        }
      }
    } catch {}
    return getDefaultPrakerinForMajor(currentUser.jurusan, currentUser.kelas || currentUser.namaKelas);
  })();

  // Check if student has class leadership role
  const isClassLeader = Boolean(
    currentUser.isKetuaKelas || 
    (currentUser.jabatanKelas && currentUser.jabatanKelas !== 'Anggota')
  );

  const handleQuickSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = editUsername.trim();
    if (!cleanUser) {
      setInlineAccountMsg({ type: 'error', text: 'Username login tidak boleh kosong!' });
      return;
    }
    if (!editPassword.trim()) {
      setInlineAccountMsg({ type: 'error', text: 'Password tidak boleh kosong!' });
      return;
    }

    const isDuplicate = allUsersList.some(
      u => u.id !== currentUser.id && u.username.toLowerCase() === cleanUser.toLowerCase()
    );
    if (isDuplicate) {
      setInlineAccountMsg({ type: 'error', text: `Username "${cleanUser}" sudah digunakan oleh siswa/pengguna lain. Silakan pilih username lain.` });
      return;
    }

    const updated: User = {
      ...currentUser,
      username: cleanUser,
      password: editPassword,
      telepon: editTelepon,
      email: editEmail,
    };
    onUpdateProfile(updated);
    setInlineAccountMsg({ type: 'success', text: 'Alhamdulillah! Username dan Password Anda berhasil diperbarui.' });
    setSaveSuccessMsg(true);
    setTimeout(() => {
      setInlineAccountMsg(null);
      setSaveSuccessMsg(false);
    }, 4500);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = editUsername.trim() || currentUser.username;
    const isDuplicate = allUsersList.some(
      u => u.id !== currentUser.id && u.username.toLowerCase() === cleanUser.toLowerCase()
    );
    if (isDuplicate) {
      alert(`Username "${cleanUser}" sudah digunakan pengguna lain!`);
      return;
    }

    const updated: User = {
      ...currentUser,
      username: cleanUser,
      nama: editNama,
      telepon: editTelepon,
      email: editEmail,
      alamat: editAlamat,
      password: editPassword,
      fotoProfilUrl: editFotoUrl,
    };
    onUpdateProfile(updated);
    setIsEditModalOpen(false);
    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 3500);
  };

  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);
  const [photoCompressFeedback, setPhotoCompressFeedback] = useState<string | null>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsCompressingPhoto(true);
    setPhotoCompressFeedback(null);
    try {
      const result = await compressStudentPhoto(file, 640, 0.86);
      setEditFotoUrl(result.dataUrl);
      const origKb = Math.round(result.originalSize / 1024);
      const compKb = Math.round(result.compressedSize / 1024);
      setPhotoCompressFeedback(`Foto otomatis dioptimasi (${origKb} KB → ${compKb} KB). Kualitas tetap tajam & jernih!`);
      setTimeout(() => setPhotoCompressFeedback(null), 4500);
    } catch (err: any) {
      alert(err?.message || 'Gagal memproses pas foto');
    } finally {
      setIsCompressingPhoto(false);
      e.target.value = '';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Sapaan Waktu & Ucapan Ulang Tahun */}
      <GreetingBanner user={currentUser} />

      {/* Top Banner & Profile Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-emerald-100/50 via-teal-50/30 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none"></div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            {/* Student Avatar */}
            <div className="relative group">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 p-1 shadow-md">
                <div className="w-full h-full rounded-xl bg-white overflow-hidden flex items-center justify-center">
                  {currentUser.fotoProfilUrl ? (
                    <img 
                      src={currentUser.fotoProfilUrl} 
                      alt={currentUser.nama} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <span className="text-3xl font-black text-emerald-700">
                      {currentUser.nama.charAt(0)}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="absolute -bottom-1 -right-1 p-2 bg-slate-900 text-white rounded-xl shadow-md hover:bg-emerald-600 transition-colors"
                title="Ganti Foto Profil"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Student Info */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                  Siswa Aktif
                </span>
                {isClassLeader && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold flex items-center gap-1">
                    <Award className="w-3 h-3 text-amber-700" />
                    {currentUser.jabatanKelas}
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium">
                  {schoolInfo.tahunAjaranPembelajaran}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                {currentUser.nama}
              </h1>

              <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                <span>NIPD: <strong className="text-slate-800 font-mono">{studentNipd}</strong></span>
                <span>•</span>
                <span>NISN: <strong className="text-slate-800 font-mono">{studentNisn}</strong></span>
                <span>•</span>
                <span>Kelas: <strong className="text-emerald-700">{currentUser.kelas || currentUser.namaKelas}</strong></span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab('kartu')}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
            >
              <QrCode className="w-4 h-4 text-emerald-400" />
              <span>Kartu Barcode</span>
            </button>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Profil & Password</span>
            </button>
            {onLogout && (
              <button
                onClick={onLogout}
                className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                title="Keluar dari sesi akun siswa"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-600" />
                <span>Keluar (Logout)</span>
              </button>
            )}
          </div>
        </div>

        {/* Success Toast */}
        {saveSuccessMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Profil dan keamanan akun Anda berhasil diperbarui!</span>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-sm flex items-center gap-1 overflow-x-auto">
        {[
          { id: 'absensi', label: 'Ruang Absen Mandiri & QR', icon: CalendarCheck },
          { id: 'profil', label: 'Profil & Akun Siswa', icon: UserIcon },
          { id: 'kartu', label: 'Kartu Tanda Pelajar', icon: QrCode },
          { id: 'jadwal', label: 'Jadwal Pelajaran', icon: Clock },
          { id: 'nilai', label: 'Nilai & Leger', icon: FileText },
          { id: 'raport', label: 'Rapor Digital', icon: Award },
          ...(isClassLeader ? [{ id: 'presensi_kelas', label: 'Presensi Rombel (Pengurus)', icon: Users }] : []),
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: RINGKASAN PROFIL */}
      {activeTab === 'profil' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Personal Information Data */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-emerald-600" />
                Data Pokok Peserta Didik (Dapodik)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-slate-400 font-bold block uppercase text-[10px]">Nomor Induk Peserta Didik (NIPD)</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{studentNipd}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-slate-400 font-bold block uppercase text-[10px]">Nomor Induk Siswa Nasional (NISN)</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{studentNisn}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-slate-400 font-bold block uppercase text-[10px]">Nama Lengkap</span>
                  <span className="font-bold text-slate-900 text-sm">{currentUser.nama}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-slate-400 font-bold block uppercase text-[10px]">Tempat, Tanggal Lahir</span>
                  <span className="font-medium text-slate-800">
                    {currentUser.tempatLahir || 'Bogor'}, {currentUser.tanggalLahir || '2008-01-01'}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-slate-400 font-bold block uppercase text-[10px]">Jenis Kelamin</span>
                  <span className="font-medium text-slate-800">{currentUser.jenisKelamin || 'Perempuan'}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-slate-400 font-bold block uppercase text-[10px]">Rombongan Belajar (Kelas)</span>
                  <span className="font-bold text-emerald-800">{currentUser.kelas || currentUser.namaKelas}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-slate-400 font-bold block uppercase text-[10px]">Nomor WhatsApp / Telepon</span>
                  <span className="font-medium text-slate-800">{currentUser.telepon || '0812-3456-7890'}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-slate-400 font-bold block uppercase text-[10px]">Email Siswa</span>
                  <span className="font-medium text-slate-800">{currentUser.email || `${currentUser.username}@smkbaktiputramandiri.sch.id`}</span>
                </div>
                <div className="sm:col-span-2 p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-slate-400 font-bold block uppercase text-[10px]">Alamat Tempat Tinggal</span>
                  <span className="font-medium text-slate-800">{currentUser.alamat || 'Parung Panjang, Kabupaten Bogor'}</span>
                </div>
              </div>
            </div>

            {/* Quick Exams Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-emerald-600" />
                  Ujian CAT Online Tersedia ({myExams.length})
                </h3>
                <button
                  onClick={onNavigateToCAT}
                  className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
                >
                  Buka Portal CAT &rarr;
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {myExams.slice(0, 4).map(u => (
                  <div key={u.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        {u.jenis || (u.jenisUjian === 'UJIAN_AKHIR' ? 'PAS / PAT' : 'PTS / SAS')}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">{u.durasiMenit} Menit</span>
                    </div>
                    <h4 className="font-bold text-xs text-slate-800 line-clamp-1">{u.judul || u.namaUjian}</h4>
                    <div className="text-[11px] text-slate-500 font-mono">Token: {u.token}</div>
                    <button
                      onClick={onNavigateToCAT}
                      className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold text-center transition-colors"
                    >
                      Mulai Ujian
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Attendance & Quick Barcode Preview */}
          <div className="lg:col-span-4 space-y-6">
            {/* Quick Attendance Widget */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                Statistik Kehadiran Saya
              </h3>

              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 text-center space-y-1">
                <span className="text-xs text-emerald-800 font-bold uppercase tracking-wider">
                  Tingkat Kehadiran
                </span>
                <div className="text-4xl font-black text-emerald-700">{persenKehadiran}%</div>
                <span className="text-[11px] text-emerald-600">Presensi Barcode Tervalidasi</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 font-semibold">
                  <div className="text-lg font-black">{countHadir}</div>
                  <div className="text-[10px] text-emerald-600">Hadir</div>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-50 text-amber-800 font-semibold">
                  <div className="text-lg font-black">{countTerlambat}</div>
                  <div className="text-[10px] text-amber-600">Terlambat</div>
                </div>
                <div className="p-2.5 rounded-lg bg-blue-50 text-blue-800 font-semibold">
                  <div className="text-lg font-black">{countSakit}</div>
                  <div className="text-[10px] text-blue-600">Sakit</div>
                </div>
                <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-800 font-semibold">
                  <div className="text-lg font-black">{countIzin}</div>
                  <div className="text-[10px] text-indigo-600">Izin</div>
                </div>
              </div>
            </div>

            {/* Quick Barcode Scanner Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3 text-center">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Barcode Presensi Gerbang
              </h4>
              <p className="text-[11px] text-slate-400">
                Tunjukkan barcode ini ke scanner gerbang saat tiba di sekolah
              </p>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center justify-center">
                <SquareQrCode value={studentNipd} size={110} />
                <span className="font-mono text-xs font-bold text-slate-800 mt-2">{studentNipd}</span>
              </div>
              <button
                onClick={() => setActiveTab('kartu')}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Lihat Kartu Lengkap
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: KARTU TANDA PELAJAR DIGITAL */}
      {activeTab === 'kartu' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Kartu Tanda Pelajar Resmi Digital</h3>
              <p className="text-xs text-slate-500">
                Dilengkapi dengan Pas Foto, Profil Lengkap, dan QR Code Persegi untuk Presensi Gerbang & Ujian
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsKartuModalOpen(true)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
              >
                <Eye className="w-4 h-4 text-emerald-400" />
                <span>Format Cetak Bolak-Balik (HD)</span>
              </button>
              <button
                onClick={() => setIsKartuModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Kartu (Portrait / Landscape)</span>
              </button>
            </div>
          </div>

          <div className="max-w-md mx-auto">
            <div className="rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-br from-white via-slate-50 to-emerald-50/30 text-slate-900 p-6 shadow-2xl relative overflow-hidden space-y-5">
              {/* Header with vibrant emerald ribbon */}
              <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-3 rounded-2xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white p-1.5 flex items-center justify-center border border-emerald-200 shadow-xs">
                    <img 
                      src={schoolInfo.logoUrl || '/logo_bpm.png'} 
                      alt="Logo" 
                      className="w-full h-full object-contain"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider text-white truncate drop-shadow-xs">
                      {schoolInfo.nama}
                    </div>
                    <div className="text-[10px] text-emerald-100 font-bold uppercase">KARTU TANDA PELAJAR RESMI</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-white/20 backdrop-blur-xs border border-white/30 text-white text-[10px] font-extrabold">
                  AKREDITASI {schoolInfo.akreditasi || 'A'}
                </span>
              </div>

              {/* Student Details */}
              <div className="flex items-start gap-4 py-2">
                <div className="w-20 h-24 rounded-2xl bg-white border-2 border-emerald-500/40 overflow-hidden flex-shrink-0 flex items-center justify-center text-slate-400 font-bold text-2xl shadow-sm">
                  {currentUser.fotoProfilUrl ? (
                    <img src={currentUser.fotoProfilUrl} alt={currentUser.nama} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-emerald-700 font-black">{currentUser.nama.charAt(0)}</span>
                  )}
                </div>
                <div className="space-y-1 flex-1 min-w-0 text-slate-700">
                  <h4 className="font-black text-base text-slate-900 leading-tight truncate">
                    {currentUser.nama}
                  </h4>
                  <div>
                    <span className="text-xs font-mono text-emerald-800 font-extrabold bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                      NIPD: {studentNipd}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-slate-600 font-semibold">
                    NISN: {studentNisn}
                  </div>
                  <div className="text-xs text-slate-700 font-medium">
                    Kejuruan: <strong className="text-emerald-900 font-bold">{studentKejuruan}</strong>
                  </div>
                  {currentUser.jabatanKelas && (
                    <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                      {currentUser.jabatanKelas}
                    </span>
                  )}
                </div>
              </div>

              {/* QR Code Element */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border-2 border-emerald-500/30 flex flex-col items-center justify-center">
                <SquareQrCode value={studentNipd} size={140} />
                <span className="font-mono text-xs font-black text-emerald-800 mt-2 tracking-widest bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {studentNipd}
                </span>
                <span className="text-[10px] text-slate-500 font-medium mt-1">Scan QR untuk Presensi Masuk / Pulang</span>
              </div>

              {/* Card Footer */}
              <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-emerald-100 pt-3">
                <span>Berlaku Selama Menjadi Siswa Aktif</span>
                <span className="font-bold text-emerald-700">Bogor, Jawa Barat</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: RUANG KHUSUS ABSEN MANDIRI SISWA & QR */}
      {activeTab === 'absensi' && (
        <div className="space-y-6">
          {/* 1. Live Banner & 1-Click Presensi Mandiri */}
          <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-cyan-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold backdrop-blur-md border border-white/20">
                  <CalendarCheck className="w-3.5 h-3.5 text-emerald-300" />
                  Ruang Khusus Absensi Mandiri Siswa
                </span>
                <h2 className="text-xl sm:text-3xl font-black tracking-tight text-white">
                  Presensi Mandiri Harian Siswa
                </h2>
                <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
                  Lakukan absensi mandiri langsung hari ini atau tunjukkan QR Code resmi Anda kepada petugas piket / scanner kamera di gerbang sekolah.
                </p>

                {/* Status Hari Ini */}
                {(() => {
                  const todayStr = getLocalDateString();
                  const todayRecord = absensiList.find(a => 
                    isRecordForStudent(a, currentUser) && 
                    a.tanggal === todayStr
                  );

                  if (todayRecord) {
                    return (
                      <div className="mt-3 p-3.5 rounded-2xl bg-white/15 backdrop-blur-md border border-emerald-300/40 text-xs flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-400 text-emerald-950 flex items-center justify-center font-black">
                          ✓
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm">Status Hari Ini: Terabsen {todayRecord.status.toUpperCase()}</div>
                          <div className="text-emerald-200 text-xs">Pukul {todayRecord.waktu} WIB • Metode: {todayRecord.metode}</div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="mt-3 p-3.5 rounded-2xl bg-amber-500/20 backdrop-blur-md border border-amber-300/40 text-xs flex items-center gap-3 text-amber-200">
                      <AlertCircle className="w-5 h-5 text-amber-300 shrink-0" />
                      <div>
                        <div className="font-bold text-white">Belum Ada Catatan Presensi Hari Ini</div>
                        <div className="text-amber-200/90 text-xs">Silakan tap tombol absen mandiri atau scan barcode token presensi hari ini.</div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row md:flex-col gap-3 w-full md:w-auto">
                <button
                  onClick={handleDirectSelfAttend}
                  className="px-6 py-3.5 rounded-2xl bg-white hover:bg-emerald-50 text-emerald-950 font-extrabold text-xs sm:text-sm shadow-lg hover:shadow-xl transition-all flex flex-col items-center justify-center gap-0.5 transform hover:-translate-y-0.5 text-center"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600 animate-bounce" />
                    <span>Tap Absen Hadir Mandiri (Radius {Math.max(250, schoolInfo.lokasiSekolah?.radiusMeters ?? 250)}M)</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-semibold">
                    Validasi Geofence Maps SMK Bakti Putra Mandiri
                  </span>
                </button>

                <button
                  onClick={() => {
                    setIsScanModalOpen(true);
                    setQrNotice(null);
                    startSelfCamera('environment');
                  }}
                  className="px-6 py-3.5 rounded-2xl bg-emerald-950/80 hover:bg-emerald-950 text-white font-bold text-xs sm:text-sm border border-emerald-400/40 shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4 text-emerald-300" />
                  <span>Buka Kamera Scan QR Presensi Mandiri</span>
                </button>
              </div>
            </div>
          </div>

          {/* 2. Dual Grid: Kartu QR Siswa & Detail Akun Siswa */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Box A: QR Code Siswa Resmi */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-teal-100 text-teal-700">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">QR Code Siswa Mandiri</h3>
                    <p className="text-[11px] text-slate-500">ID Kode Khusus untuk presensi barcode di gerbang</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('kartu')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Kartu</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center">
                  <SquareQrCode value={studentNipd} size={135} />
                  <span className="font-mono text-xs font-bold text-slate-900 mt-2 tracking-widest">{studentNipd}</span>
                </div>
                <div className="space-y-2 text-xs text-slate-600 text-center sm:text-left">
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase font-bold">Nama Lengkap</div>
                    <div className="font-bold text-slate-900 text-sm">{currentUser.nama}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase font-bold">Kelas & Jurusan</div>
                    <div className="font-semibold text-emerald-700">{currentUser.kelas || currentUser.namaKelas}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase font-bold">NISN</div>
                    <div className="font-mono text-slate-800 font-bold">{studentNisn}</div>
                  </div>
                  <p className="text-[10px] text-slate-400 max-w-xs leading-tight pt-1">
                    ✓ QR Code ini unik untuk akun Anda dan langsung terhubung secara realtime dengan buku presensi sekolah.
                  </p>
                </div>
              </div>
            </div>

            {/* Box B: Akun & Keamanan Siswa */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Akun & Profil Siswa</h3>
                    <p className="text-[11px] text-slate-500">Username dan password dapat diubah secara mandiri</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Ubah Username / Password</span>
                </button>
              </div>

              {/* Inline Form to change Username & Password directly */}
              <form onSubmit={handleQuickSaveAccount} className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                {inlineAccountMsg && (
                  <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    inlineAccountMsg.type === 'success' 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}>
                    {inlineAccountMsg.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{inlineAccountMsg.text}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">
                      Username Login (Dapat Diubah)
                    </label>
                    <input
                      type="text"
                      required
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      placeholder="Username baru..."
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 text-xs"
                    />
                    <div className="text-[10px] text-slate-400 mt-1">Digunakan untuk login ke sistem</div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] text-slate-500 font-bold uppercase">
                        Password Baru (Dapat Diubah)
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowAccountPassword(!showAccountPassword)}
                        className="text-slate-400 hover:text-slate-700"
                        title={showAccountPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                      >
                        {showAccountPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <input
                      type={showAccountPassword ? 'text' : 'password'}
                      required
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="Password baru..."
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 text-xs"
                    />
                    <div className="text-[10px] text-slate-400 mt-1">Minimal 4 karakter</div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">
                      Nomor WhatsApp / HP
                    </label>
                    <input
                      type="text"
                      value={editTelepon}
                      onChange={(e) => setEditTelepon(e.target.value)}
                      placeholder="08xxxxxxxxxx"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono font-medium text-slate-800 text-xs"
                    />
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">
                      Email Siswa
                    </label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="siswa@sekolah.sch.id"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono font-medium text-slate-800 text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Simpan Username & Password</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* 3. Rekap & Riwayat Catatan Presensi Siswa */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-600" />
                  Riwayat Presensi & Kehadiran Saya
                </h3>
                <p className="text-xs text-slate-500">
                  Catatan kehadiran harian di sekolah, diverifikasi otomatis dengan sistem pangkalan data
                </p>
              </div>

              {/* Badges Rekap */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                  Kehadiran: {persenKehadiran}%
                </span>
                <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-xs font-semibold">
                  Hadir: {countHadir}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                  Terlambat: {countTerlambat}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-semibold">
                  Izin: {countIzin}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200 text-xs font-semibold">
                  Sakit: {countSakit}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold">
                  Alpa: {countAlpa}
                </span>
              </div>
            </div>

            {/* Kolom Pencarian Riwayat Kehadiran */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchRiwayatSiswa}
                  onChange={(e) => setSearchRiwayatSiswa(e.target.value)}
                  placeholder="Cari riwayat kehadiran (tanggal, status Hadir/Sakit/Izin, atau metode)..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
                {searchRiwayatSiswa && (
                  <button
                    type="button"
                    onClick={() => setSearchRiwayatSiswa('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] hover:bg-slate-300"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="text-[11px] text-slate-500 font-semibold px-1">
                Menampilkan: <strong className="text-slate-800">{filteredMyAbsensiRecords.length}</strong> dari {myAbsensiRecords.length} rekam
              </div>
            </div>

            {/* Mobile View: Kartu Riwayat Presensi HP (Fleksibel & Nyaman di Layar Kecil) */}
            <div className="block md:hidden space-y-3">
              {filteredMyAbsensiRecords.map((rec, idx) => (
                <div key={rec.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-xs text-slate-900">{rec.tanggal}</span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      rec.status === 'Hadir' ? 'bg-emerald-100 text-emerald-800' :
                      rec.status === 'Terlambat' ? 'bg-amber-100 text-amber-800' :
                      rec.status === 'Sakit' ? 'bg-blue-100 text-blue-800' :
                      rec.status === 'Izin' ? 'bg-indigo-100 text-indigo-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {rec.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-200/60">
                    <div>
                      <span className="text-slate-400 block text-[10px]">WAKTU</span>
                      <span className="font-mono font-bold text-slate-800">{rec.waktu} WIB</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">METODE</span>
                      <span className="font-semibold text-slate-700">{rec.metode}</span>
                    </div>
                  </div>

                  {rec.keterangan && (
                    <div className="text-[11px] text-slate-600 bg-white p-2 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Keterangan:</span>
                      <span>{rec.keterangan}</span>
                    </div>
                  )}

                  <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                    <span>Petugas / Validator:</span>
                    <span className="font-medium text-slate-600">{rec.petugas || 'Sistem Mandiri'}</span>
                  </div>
                </div>
              ))}

              {filteredMyAbsensiRecords.length === 0 && (
                <div className="py-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-6">
                  <Calendar className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-xs font-semibold text-slate-600">
                    {searchRiwayatSiswa ? `Tidak ada catatan presensi yang sesuai dengan "${searchRiwayatSiswa}"` : 'Belum ada catatan presensi'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Catatan presensi QR code dan GPS Anda akan tampil di sini.</p>
                </div>
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Waktu Pindai</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Metode</th>
                    <th className="py-3 px-4">Keterangan</th>
                    <th className="py-3 px-4">Petugas / Pengawas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMyAbsensiRecords.map((rec, idx) => (
                    <tr key={rec.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 text-center text-slate-400 font-semibold">{idx + 1}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{rec.tanggal}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{rec.waktu} WIB</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          rec.status === 'Hadir' ? 'bg-emerald-100 text-emerald-800' :
                          rec.status === 'Terlambat' ? 'bg-amber-100 text-amber-800' :
                          rec.status === 'Sakit' ? 'bg-blue-100 text-blue-800' :
                          rec.status === 'Izin' ? 'bg-indigo-100 text-indigo-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {rec.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{rec.metode}</td>
                      <td className="py-3 px-4 text-slate-600">{rec.keterangan || '-'}</td>
                      <td className="py-3 px-4 text-slate-500">{rec.petugas || 'Petugas Piket'}</td>
                    </tr>
                  ))}
                  {filteredMyAbsensiRecords.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        {searchRiwayatSiswa 
                          ? `Tidak ditemukan riwayat presensi yang cocok dengan kata kunci "${searchRiwayatSiswa}".` 
                          : 'Belum ada data presensi yang tercatat untuk NIPD Anda.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* JIKA BELUM MEMASUKKAN KODE AKSES DARI ADMIN / WALAS */}
      {(activeTab === 'nilai' || activeTab === 'raport') && !isRaportUnlocked && (
        <div className="bg-white rounded-3xl p-8 sm:p-12 border-2 border-slate-200 shadow-xl max-w-xl mx-auto text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center text-amber-600 shadow-md">
            <Lock className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Akses Leger & Raport Terkunci (Mode Lihat Saja)</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-800">
              Perlu Kode Akses Resmi dari Admin / Walas
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              Sesuai ketentuan pihak sekolah, lembar nilai leger dan raport hasil belajar dikunci secara resmi. Silakan hubungi <strong>Administrator</strong> atau <strong>Wali Kelas</strong> Anda untuk meminta Kode Akses Raport (PIN).
            </p>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 font-medium">
              🔒 <strong>Ketentuan Akses:</strong> Setelah kode akses dimasukkan, siswa <strong>hanya dapat melihat data nilai (Read-Only)</strong> dan tidak memiliki izin untuk mengedit isi nilai.
            </div>
          </div>

          {raportCodeError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{raportCodeError}</span>
            </div>
          )}

          <form onSubmit={handleUnlockRaport} className="space-y-4 max-w-sm mx-auto">
            <div className="space-y-1 text-left">
              <label className="block text-xs font-bold text-slate-700">
                Masukkan Kode Akses Raport (PIN):
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={raportAccessCodeInput}
                  onChange={(e) => setRaportAccessCodeInput(e.target.value)}
                  placeholder="Contoh: BPM2026 atau kode dari admin..."
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border-2 border-slate-300 font-mono text-sm uppercase font-bold tracking-wider focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/10 text-slate-900 bg-slate-50"
                  required
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Buka Akses Lihat Nilai & Raport</span>
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-center gap-3 text-[11px] text-slate-400">
            <span>Kontak Tata Usaha: {schoolInfo.telepon}</span>
            <span className="hidden sm:inline">•</span>
            <span>Wali Kelas: {currentUser.namaKelas || currentUser.kelas}</span>
          </div>
        </div>
      )}

      {/* TAB 4: NILAI HARIAN & LEGER SAYA (HANYA DITAMPILKAN JIKA SUDAH MEMASUKKAN KODE) */}
      {activeTab === 'nilai' && isRaportUnlocked && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
          {/* Read-Only Notice Banner */}
          <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-start sm:items-center gap-2.5">
            <Eye className="w-4 h-4 text-amber-700 shrink-0 mt-0.5 sm:mt-0" />
            <div className="space-y-0.5">
              <span className="font-extrabold text-amber-900">Hak Akses Siswa: Mode Hanya Lihat (Read-Only)</span>
              <p className="text-[11px] text-amber-800">
                Siswa hanya memiliki hak akses untuk memantau nilai formatif, sumatif, dan capaian kompetensi TP. Siswa tidak dapat mengedit nilai. Pengubahan nilai resmi hanya dapat dilakukan oleh Guru Pengampu atau Wali Kelas.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Akses Nilai Resmi Terbuka (Hanya Lihat)
                </span>
                <button
                  type="button"
                  onClick={handleLockRaport}
                  className="text-[11px] text-slate-400 hover:text-rose-600 underline font-medium"
                >
                  Kunci Kembali
                </button>
              </div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-600" />
                Daftar Nilai Formatif & Leger Peserta Didik
              </h3>
              <p className="text-xs text-slate-500">
                Pilih periode asesmen ({selectedSiswaPeriode}) untuk melihat nilai kumulatif dan capaian TP
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Periode Asesmen Toggle */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                {(['PTS', 'PAS', 'PAT'] as const).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSelectedSiswaPeriode(p)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      selectedSiswaPeriode === p
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setActiveTab('raport')}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Buka Lembar Raport</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="py-3 px-4 w-10 text-center">No</th>
                  <th className="py-3 px-4">Mata Pelajaran</th>
                  <th className="py-3 px-2 text-center">LM 1</th>
                  <th className="py-3 px-2 text-center">LM 2</th>
                  <th className="py-3 px-2 text-center">LM 3</th>
                  <th className="py-3 px-2 text-center">LM 4</th>
                  <th className="py-3 px-3 text-center bg-slate-100 font-bold">Rata LM</th>
                  {selectedSiswaPeriode === 'PTS' && (
                    <th className="py-3 px-3 text-center bg-amber-50 text-amber-900">PTS</th>
                  )}
                  {selectedSiswaPeriode === 'PAS' && (
                    <th className="py-3 px-3 text-center bg-emerald-50 text-emerald-900">PAS</th>
                  )}
                  {selectedSiswaPeriode === 'PAT' && (
                    <th className="py-3 px-3 text-center bg-teal-50 text-teal-900">PAT</th>
                  )}
                  <th className="py-3 px-3 text-center bg-emerald-600 text-white">Nilai Akhir ({selectedSiswaPeriode})</th>
                  <th className="py-3 px-3 text-center">Predikat</th>
                  <th className="py-3 px-4">Capaian Kompetensi TP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myGrades.map((g, idx) => {
                  const computed = hitungNilaiAkhir({ ...g, periode: selectedSiswaPeriode });
                  return (
                    <tr key={g.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{g.mapelNama}</td>
                      <td className="py-3 px-2 text-center text-slate-600 font-mono">{g.lm1 ?? g.tugas1 ?? 82}</td>
                      <td className="py-3 px-2 text-center text-slate-600 font-mono">{g.lm2 ?? g.tugas2 ?? 84}</td>
                      <td className="py-3 px-2 text-center text-slate-600 font-mono">{g.lm3 ?? g.tugas3 ?? 85}</td>
                      <td className="py-3 px-2 text-center text-slate-600 font-mono">{g.lm4 ?? g.ulhar1 ?? 86}</td>
                      <td className="py-3 px-3 text-center font-bold bg-slate-50 text-slate-800">{computed.nilaiFormatif}</td>
                      {selectedSiswaPeriode === 'PTS' && (
                        <td className="py-3 px-3 text-center font-bold bg-amber-50/50 text-amber-900">{g.nilaiPts ?? 85}</td>
                      )}
                      {selectedSiswaPeriode === 'PAS' && (
                        <td className="py-3 px-3 text-center font-bold bg-emerald-50/50 text-emerald-900">{g.nilaiPas ?? 88}</td>
                      )}
                      {selectedSiswaPeriode === 'PAT' && (
                        <td className="py-3 px-3 text-center font-bold bg-teal-50/50 text-teal-900">{g.nilaiPat ?? g.nilaiPas ?? 88}</td>
                      )}
                      <td className="py-3 px-3 text-center font-black text-sm bg-emerald-50 text-emerald-700">{computed.nilaiAkhir}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          {computed.predikat}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-600 max-w-xs leading-relaxed">
                        {g.tpDeskripsi || buildKurikulumMerdekaCapaian({
                          grade: { ...g, nilaiAkhir: computed.nilaiAkhir },
                          mapel: g.mapelNama || g.mapelId,
                          kelas: currentUser.idKelas || currentUser.kelas,
                          displayStyle: 'narasi',
                        }).deskripsiNarasi}
                      </td>
                    </tr>
                  );
                })}
                {myGrades.length === 0 && (
                  <tr>
                    <td colSpan={12} className="py-8 text-center text-slate-400">
                      Nilai untuk periode {selectedSiswaPeriode} sedang dalam proses penginputan oleh guru pengampu.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: RAPORT KURIKULUM MERDEKA SAYA */}
      {activeTab === 'raport' && isRaportUnlocked && (
        <div className="space-y-6">
          {/* Read-Only Notice Banner */}
          <div className="p-3.5 bg-blue-50/90 border border-blue-200 rounded-xl text-xs text-blue-950 flex items-start sm:items-center gap-2.5 print:hidden">
            <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5 sm:mt-0" />
            <div className="space-y-0.5">
              <span className="font-extrabold text-blue-900">Dokumen Resmi Terkunci: Mode Hanya Lihat & Cetak (Read-Only)</span>
              <p className="text-[11px] text-blue-800">
                Siswa dan orang tua hanya memiliki hak akses untuk membaca, mengunduh, dan mencetak lembar raport resmi. Seluruh data nilai, capaian TP, catatan kehadiran, dan keputusan kelulusan/kenaikan kelas ditetapkan resmi oleh Wali Kelas & Kepala Sekolah dan tidak dapat diubah oleh siswa.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Akses Raport Resmi Terbuka (Hanya Lihat)
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-500" />
                  Terkunci dari Pengeditan
                </span>
                <button
                  type="button"
                  onClick={handleLockRaport}
                  className="text-[11px] text-slate-400 hover:text-rose-600 underline font-medium ml-1"
                >
                  Kunci Kembali
                </button>
              </div>
              <h3 className="text-lg font-bold text-slate-800">Raport Hasil Belajar Kurikulum Merdeka</h3>
              <p className="text-xs text-slate-500">
                Format resmi {schoolInfo.nama} (Fase F) • Siap Cetak dan Unduh (Read-Only)
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-600">Periode:</span>
                <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
                  {(['PTS', 'PAS', 'PAT'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setSelectedSiswaPeriode(p)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                        selectedSiswaPeriode === p
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {p === 'PAT' && <GraduationCap className="w-3.5 h-3.5 text-amber-300" />}
                      <span>{p === 'PTS' ? 'PTS (Tengah)' : p === 'PAS' ? 'PAS (Sem. 1)' : 'PAT (Sem. 2 / Kenaikan)'}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const docEl = document.getElementById('printable-raport-doc');
                  if (docEl) {
                    printDocumentArea(docEl, {
                      title: `Raport Siswa - ${currentUser.nama}`,
                      paperSize: 'A4',
                      orientation: 'portrait',
                      margin: 'sempit',
                    });
                  } else {
                    window.print();
                  }
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm ml-auto cursor-pointer"
                title="Cetak lembar raport saja ke printer/PDF (halaman web otomatis disembunyikan)"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Raport Resmi (PDF)</span>
              </button>
            </div>
          </div>

          {/* Official Document Container */}
          <div id="printable-raport-doc" className="printable-document bg-white rounded-3xl p-8 sm:p-12 border-2 border-slate-300 shadow-lg space-y-6 text-slate-900 max-w-4xl mx-auto print:border-none print:shadow-none print:p-0">
            {/* Kop SMK Bakti Putra Mandiri */}
            <div className="border-b-4 border-double border-slate-900 pb-4 text-center relative">
              <div className="flex items-center justify-center gap-4">
                <img 
                  src={schoolInfo.logoUrl || '/logo_bpm.png'} 
                  alt="Logo" 
                  className="w-20 h-20 object-contain absolute left-0 top-0 hidden sm:block"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <div className="space-y-0.5">
                  <div className="text-xs font-bold tracking-widest uppercase text-slate-600">
                    {schoolInfo.kopSekolah?.yayasan || 'YAYASAN PENDIDIKAN'}
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-wide text-slate-900 uppercase">
                    {schoolInfo.kopSekolah?.instansi || schoolInfo.namaLengkap || schoolInfo.nama}
                  </h1>
                  <div className="text-xs font-semibold text-emerald-800">
                    {schoolInfo.kopSekolah?.subJudul || 'KOMPETENSI KEAHLIAN VOKASI & KEJURUAN TERPADU'}
                  </div>
                  <p className="text-[11px] text-slate-600 max-w-xl mx-auto leading-tight">
                    {schoolInfo.alamatLengkap}
                    <br />
                    NPSN: {schoolInfo.npsn} • Akreditasi: {schoolInfo.akreditasi} • Telp: {schoolInfo.telepon}
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center py-2">
              <h2 className="text-base font-black uppercase tracking-wider underline">
                LAPORAN HASIL BELAJAR (RAPOR PESERTA DIDIK)
              </h2>
              <div className="text-xs font-bold text-slate-800 mt-1 uppercase">
                {selectedSiswaPeriode === 'PAT'
                  ? 'ASESMEN SUMATIF AKHIR TAHUN (ASAT / PAT)'
                  : selectedSiswaPeriode === 'PAS'
                  ? 'ASESMEN SUMATIF AKHIR SEMESTER (SAS / PAS / ASAS)'
                  : 'ASESMEN SUMATIF TENGAH SEMESTER (ASTS / PTS)'}
              </div>
              <div className="text-[11px] font-bold text-slate-500">
                KURIKULUM MERDEKA • SEKOLAH MENENGAH KEJURUAN • FASE F
              </div>
            </div>

            {/* Student ID Info */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs border border-slate-300 p-4 rounded-xl bg-slate-50/50">
              <div className="flex">
                <span className="w-32 font-bold text-slate-600">Nama Peserta Didik</span>
                <span className="font-bold text-slate-900">: {currentUser.nama}</span>
              </div>
              <div className="flex">
                <span className="w-32 font-bold text-slate-600">Kelas / Fase</span>
                <span className="font-bold text-slate-900">: {currentUser.kelas || currentUser.namaKelas} / Fase F</span>
              </div>
              <div className="flex">
                <span className="w-32 font-bold text-slate-600">NIS / NIPD</span>
                <span className="font-mono font-bold text-slate-900">: {studentNipd}</span>
              </div>
              <div className="flex">
                <span className="w-32 font-bold text-slate-600">Semester</span>
                <span className="font-bold text-slate-900">
                  : {selectedSiswaPeriode === 'PAT' || schoolInfo.semesterPembelajaran === 'Genap'
                    ? 'Genap (Semester 2 / Akhir Tahun)'
                    : (selectedSiswaPeriode === 'PTS' ? 'Ganjil (Tengah Semester / PTS)' : 'Ganjil (Semester 1 / PAS)')}
                </span>
              </div>
              <div className="flex">
                <span className="w-32 font-bold text-slate-600">NISN</span>
                <span className="font-mono font-bold text-slate-900">: {studentNisn}</span>
              </div>
              <div className="flex">
                <span className="w-32 font-bold text-slate-600">Tahun Ajaran</span>
                <span className="font-bold text-slate-900">: {schoolInfo.tahunAjaranPembelajaran}</span>
              </div>
            </div>

            {/* Subjects Table - Terstruktur Berdasarkan Peraturan Kurikulum Merdeka SMK */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider mb-2 text-slate-800">
                A. Nilai Capaian Hasil Belajar (Intrakurikuler)
              </h3>
              <div className="border border-slate-300 rounded-lg overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold">
                      <th className="py-2.5 px-3 w-10 text-center border-r border-slate-300">No</th>
                      <th className="py-2.5 px-3 border-r border-slate-300 w-64 min-w-[200px]">Mata Pelajaran</th>
                      <th className="py-2.5 px-3 text-center border-r border-slate-300 w-20">Nilai Akhir</th>
                      <th className="py-2.5 px-4 min-w-[280px]">Capaian Kompetensi & Tujuan Pembelajaran (TP)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {studentRaportGroups.map((grp) => (
                      <React.Fragment key={grp.groupKey}>
                        <tr className="bg-slate-100/90 border-y border-slate-300">
                          <td colSpan={4} className="py-2 px-3 font-bold text-slate-900 text-xs tracking-wide uppercase">
                            {grp.groupName}
                          </td>
                        </tr>
                        {grp.mapels.map((m, idx) => {
                          const grade = findMySubjectGrade(m);
                          const hasGrade = grade && grade.nilaiAkhir !== undefined && grade.nilaiAkhir > 0;
                          const nilaiAkhir = hasGrade ? grade.nilaiAkhir : '-';
                          const deskripsi = hasGrade 
                            ? (grade.tpDeskripsi || buildKurikulumMerdekaCapaian({
                                grade,
                                mapel: m,
                                kelas: currentUser.idKelas || currentUser.kelas,
                                displayStyle: 'ringkas',
                              }).deskripsiRingkas)
                            : 'Nilai belum diinput oleh guru mata pelajaran.';

                          return (
                            <tr key={m.id} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3 text-center font-bold text-slate-500 border-r border-slate-200">
                                {idx + 1}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-slate-800 border-r border-slate-200">
                                {m.namaMapel}
                              </td>
                              <td className="py-2.5 px-3 text-center font-black text-sm text-slate-900 border-r border-slate-200 bg-slate-50/60">
                                {nilaiAkhir}
                              </td>
                              <td className="py-2.5 px-4 text-[11px] text-slate-700 leading-relaxed">
                                {deskripsi}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))}
                    {studentRaportGroups.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-400 italic">
                          Belum ada mata pelajaran untuk rombel ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Praktik Kerja Industri (PKL) - Khusus Kelas XI & XII */}
            {studentIsXIorXII && (
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  B. Praktik Kerja Lapangan / Industri (PKL)
                </h3>
                <div className="border border-slate-300 rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 text-slate-900 font-bold">
                        <th className="py-2.5 px-3 w-10 text-center border-r border-slate-300">No</th>
                        <th className="py-2.5 px-4 border-r border-slate-300 min-w-[200px]">Tempat / Lokasi Instansi (Mitra DU/DI)</th>
                        <th className="py-2.5 px-3 w-28 text-center border-r border-slate-300">Lamanya</th>
                        <th className="py-2.5 px-4">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {studentPrakerinList.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-2.5 px-3 text-center font-mono border-r border-slate-200">{item.nomor || idx + 1}</td>
                          <td className="py-2.5 px-4 font-bold text-slate-900 border-r border-slate-200">{item.mitra || '-'}</td>
                          <td className="py-2.5 px-3 text-center font-medium text-slate-800 border-r border-slate-200">{item.lamanya || '-'}</td>
                          <td className="py-2.5 px-4 text-[11px] text-slate-700 leading-snug">{item.keterangan || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Attendance & Ekstrakurikuler */}
            <div className="grid grid-cols-2 gap-6 pt-2">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider mb-2 text-slate-800">
                  {studentIsXIorXII ? 'D' : 'C'}. Ketidakhadiran
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
                      <td className="py-2 px-3 text-center font-bold text-blue-700">{studentOfficialAbsensi.sakit} Hari</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium border-r border-slate-200">Izin (I)</td>
                      <td className="py-2 px-3 text-center font-bold text-amber-700">{studentOfficialAbsensi.izin} Hari</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium border-r border-slate-200">Tanpa Keterangan (A)</td>
                      <td className="py-2 px-3 text-center font-bold text-rose-700">{studentOfficialAbsensi.alpa} Hari</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div>
                <h3 className="text-xs font-black uppercase tracking-wider mb-2 text-slate-800">
                  {studentIsXIorXII ? 'D' : 'C'}. Ekstrakurikuler
                </h3>
                <table className="w-full text-left text-xs border border-slate-300 rounded-lg">
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="py-2 px-3 font-semibold border-r border-slate-200">PMR / Kepalangmerahan</td>
                      <td className="py-2 px-3 text-center font-bold text-emerald-700">A (Sangat Baik)</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold border-r border-slate-200">Pramuka</td>
                      <td className="py-2 px-3 text-center font-bold text-emerald-700">A (Sangat Baik)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Keputusan Kenaikan Kelas / Kelulusan (Semester 2 / Akhir Tahun / PAT) */}
            {(selectedSiswaPeriode === 'PAT' || schoolInfo.semesterPembelajaran === 'Genap' || Boolean(currentUser.statusKenaikan)) && (
              <div className="border-2 border-slate-900 rounded-xl p-4 bg-slate-50/70 space-y-2 text-xs">
                <div className="font-black text-slate-900 uppercase tracking-wider text-center border-b border-slate-300 pb-1.5 flex items-center justify-center gap-2">
                  <GraduationCap className="w-4 h-4 text-emerald-700" />
                  <span>Keputusan Kenaikan Kelas / Kelulusan (Semester Akhir)</span>
                </div>

                {(() => {
                  const kNama = (currentUser.kelas || currentUser.namaKelas || '').toUpperCase();
                  const isGraduation = /\bXII\b|KELAS\s*XII|\b12\b/i.test(kNama) || (currentUser.kelas || '').includes('XII');
                  const status = currentUser.statusKenaikan || (isGraduation ? 'Lulus' : 'Naik Kelas');
                  
                  const jur = (currentUser.jurusan || '').toLowerCase();
                  const isX = /\bX\b|KELAS\s*X|\b10\b/i.test(kNama) || (currentUser.kelas || '').startsWith('X ');
                  let defaultTarget = '';
                  if (isGraduation) {
                    defaultTarget = 'LULUS (Tamat Belajar Satuan Pendidikan)';
                  } else if (isX) {
                    if (jur.includes('farmasi') || kNama.includes('FARMASI')) defaultTarget = 'XI Asisten Farmasi';
                    else if (jur.includes('keperawatan') || kNama.includes('KEPERAWATAN')) defaultTarget = 'XI Asisten Keperawatan';
                    else if (jur.includes('kecantikan') || kNama.includes('KECANTIKAN')) defaultTarget = 'XI Tata Kecantikan & Spa';
                    else if (jur.includes('perhotelan') || kNama.includes('PERHOTELAN')) defaultTarget = 'XI Perhotelan';
                    else defaultTarget = `XI ${currentUser.jurusan || 'Kejuruan'}`;
                  } else {
                    if (jur.includes('farmasi') || kNama.includes('FARMASI')) defaultTarget = 'XII Asisten Farmasi';
                    else if (jur.includes('keperawatan') || kNama.includes('KEPERAWATAN')) defaultTarget = 'XII Asisten Keperawatan';
                    else if (jur.includes('kecantikan') || kNama.includes('KECANTIKAN')) defaultTarget = 'XII Tata Kecantikan & Spa';
                    else if (jur.includes('perhotelan') || kNama.includes('PERHOTELAN')) defaultTarget = 'XII Perhotelan';
                    else defaultTarget = `XII ${currentUser.jurusan || 'Kejuruan'}`;
                  }
                  const targetName = currentUser.targetNamaKelasBerikutnya || defaultTarget;

                  if (isGraduation) {
                    return (
                      <div className="space-y-1.5 text-center">
                        <p className="text-slate-700">
                          Berdasarkan kriteria kelulusan satuan pendidikan SMK Bina Pendidikan Mandiri Tahun Ajaran {schoolInfo.tahunAjaranPembelajaran || '2026/2027'}, peserta didik dinyatakan:
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
                    <div className="space-y-2 text-slate-800">
                      <p className="text-slate-700">
                        Berdasarkan hasil pencapaian seluruh kompetensi pembelajaran pada semester 1 dan semester 2 Tahun Ajaran {schoolInfo.tahunAjaranPembelajaran || '2026/2027'}, peserta didik ditetapkan:
                      </p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div className={`p-2.5 rounded-lg border-2 flex items-center justify-between ${
                          status === 'Naik Kelas'
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-950'
                            : 'border-slate-200 bg-white text-slate-400'
                        }`}>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">1. Naik ke Kelas:</span>
                            <span className={`font-black ${status === 'Naik Kelas' ? 'text-emerald-900 underline' : 'text-slate-400 line-through'}`}>
                              {targetName}
                            </span>
                          </div>
                          {status === 'Naik Kelas' && <span className="text-xs px-2 py-0.5 rounded bg-emerald-600 text-white font-black">TERPILIH</span>}
                        </div>

                        <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
                          status === 'Tinggal Kelas'
                            ? 'border-rose-600 bg-rose-50 text-rose-950'
                            : 'border-slate-200 bg-white text-slate-400'
                        }`}>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">2. Tinggal di Kelas:</span>
                            <span className={`font-black ${status === 'Tinggal Kelas' ? 'text-rose-900 underline' : 'text-slate-400 line-through'}`}>
                              {currentUser.kelas || currentUser.namaKelas || '-'}
                            </span>
                          </div>
                          {status === 'Tinggal Kelas' && <span className="text-xs px-2 py-0.5 rounded bg-rose-600 text-white font-black">TERPILIH</span>}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Signatures */}
            <div className="pt-6 border-t border-slate-200 text-xs text-center grid grid-cols-3 gap-4">
              <div>
                <div className="text-slate-500">Mengetahui,</div>
                <div className="font-bold text-slate-700">Orang Tua / Wali,</div>
                <div className="h-16"></div>
                <div className="font-bold text-slate-900 border-b border-slate-400 inline-block px-8 pb-0.5">
                  ( .................................... )
                </div>
              </div>

              <div>
                <div className="text-slate-500">Bogor, 18 Desember 2026</div>
                <div className="font-bold text-slate-700">Wali Kelas,</div>
                <div className="h-16 flex items-center justify-center">
                  <span className="px-2 py-0.5 rounded border border-dashed border-emerald-300 text-emerald-800 text-[10px] font-bold">
                    Tervalidasi Digital
                  </span>
                </div>
                <div className="font-bold text-slate-900 border-b border-slate-400 inline-block px-4 pb-0.5">
                  {kelasList.find(k => k.namaKelas === currentUser.kelas || k.namaKelas === currentUser.namaKelas)?.namaWalas || 'Wali Kelas'}
                </div>
              </div>

              <div>
                <div className="text-slate-500">Mengetahui,</div>
                <div className="font-bold text-slate-700">Kepala Sekolah,</div>
                <div className="h-16 flex items-center justify-center">
                  <span className="px-2 py-0.5 rounded border border-dashed border-emerald-300 text-emerald-800 text-[10px] font-bold">
                    Tervalidasi Digital
                  </span>
                </div>
                <div className="font-bold text-slate-900 border-b border-slate-400 inline-block px-4 pb-0.5">
                  {schoolInfo.kepalaSekolah}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: JADWAL PELAJARAN SAYA */}
      {activeTab === 'jadwal' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              Jadwal Pelajaran Mingguan Kelas {currentUser.kelas || currentUser.namaKelas}
            </h3>
            <p className="text-xs text-slate-500">
              Waktu pelajaran, ruang kelas/laboratorium, dan guru pengampu
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map(hari => {
              const dayLessons = myTimetable.filter(j => j.hari === hari);
              return (
                <div key={hari} className="rounded-2xl border border-slate-200 p-4 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-900 text-xs">{hari}</span>
                    <span className="text-[10px] text-slate-500 font-medium">{dayLessons.length} Mapel</span>
                  </div>

                  <div className="space-y-2">
                    {dayLessons.map(lesson => (
                      <div key={lesson.id} className="p-2.5 rounded-xl bg-white border border-slate-200/80 space-y-1 text-xs shadow-2xs">
                        <div className="font-bold text-slate-800">{lesson.namaMapel}</div>
                        <div className="text-[10px] text-emerald-700 font-semibold">{lesson.namaGuru}</div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span>{lesson.jamMulai} - {lesson.jamSelesai}</span>
                          <span>{lesson.ruang}</span>
                        </div>
                      </div>
                    ))}
                    {dayLessons.length === 0 && (
                      <p className="text-xs text-slate-400 py-3 text-center">Tidak ada jadwal</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 7: MODE PENGURUS KELAS (KETUA / SEKRETARIS KELAS) */}
      {activeTab === 'presensi_kelas' && isClassLeader && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-200/80 rounded-xl text-amber-900">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-amber-900">
                  Panel Presensi Barcode Khusus Pengurus Kelas ({currentUser.jabatanKelas})
                </h4>
                <p className="text-[11px] text-amber-800">
                  Anda memiliki wewenang untuk memindai barcode teman sekelas saat apel pagi dan jam pertama.
                </p>
              </div>
            </div>
          </div>

          <AbsensiBarcodeView
            currentUser={currentUser}
            usersList={allUsersList}
            kelasList={kelasList}
            absensiList={absensiList}
            onAddAbsensi={onAddAbsensi}
            onUpdateAbsensi={onUpdateAbsensi}
            onDeleteAbsensi={onDeleteAbsensi}
            schoolInfo={schoolInfo}
          />
        </div>
      )}

      {/* MODAL: EDIT PROFIL, FOTO, & PASSWORD */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit Profil & Keamanan Akun Siswa</h3>
                <p className="text-xs text-slate-500">Perbarui kontak pribadi, foto profil, dan kata sandi login</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              {/* Photo upload */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Foto Profil Siswa</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center text-xl font-bold text-emerald-700">
                    {editFotoUrl ? (
                      <img src={editFotoUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      currentUser.nama.charAt(0)
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isCompressingPhoto}
                      onChange={handlePhotoUpload}
                      className="text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer disabled:opacity-50"
                    />
                    {isCompressingPhoto && (
                      <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                        Mengompres foto otomatis &amp; menjaga kejernihan...
                      </p>
                    )}
                    {photoCompressFeedback && (
                      <p className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 p-1 rounded">
                        ✓ {photoCompressFeedback}
                      </p>
                    )}
                    {!isCompressingPhoto && !photoCompressFeedback && (
                      <p className="text-[10px] text-slate-400">Otomatis dikompresi ringan (~40KB) &amp; resolusi tetap jernih untuk kartu pelajar resmi</p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={editNama}
                  onChange={(e) => setEditNama(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nomor Telepon / WA</label>
                  <input
                    type="text"
                    value={editTelepon}
                    onChange={(e) => setEditTelepon(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Alamat Tempat Tinggal</label>
                <input
                  type="text"
                  value={editAlamat}
                  onChange={(e) => setEditAlamat(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div>
                  <label className="block font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                    <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                    Username Akun Siswa *
                  </label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    placeholder="Masukkan username login..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-mono text-xs font-bold focus:outline-none focus:border-emerald-500 bg-white"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Username unik untuk login ke portal siswa dan CAT CBT</p>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    Ganti Kata Sandi (Password Baru) *
                  </label>
                  <input
                    type="text"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Masukkan kata sandi baru..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-mono text-xs focus:outline-none focus:border-emerald-500 bg-white"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Kata sandi digunakan untuk login ke portal siswa dan CAT CBT</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-sm"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: PRESENSI MANDIRI SISWA (LIVE CAMERA SCAN / UPLOAD / INPUT TOKEN) */}
      {isScanModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-lg w-full shadow-2xl space-y-4 border border-slate-200 animate-scaleUp my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-emerald-100 text-emerald-800">
                  <Camera className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Pemindai Kamera QR Presensi Mandiri</h3>
                  <p className="text-[11px] text-slate-500">Scan QR Code token harian di layar atau buku presensi</p>
                </div>
              </div>
              <button
                onClick={() => {
                  stopSelfCamera();
                  setIsScanModalOpen(false);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors"
              >
                ✕
              </button>
            </div>

            {qrNotice && (
              <div className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${
                qrNotice.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold' 
                  : 'bg-rose-50 text-rose-900 border border-rose-300 font-bold'
              }`}>
                {qrNotice.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                )}
                <span>{qrNotice.message}</span>
              </div>
            )}

            {/* LIVE CAMERA VIEWFINDER (PERSEGI 1:1) */}
            <div className="bg-slate-950 rounded-2xl p-4 text-white space-y-3 border-2 border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${isSelfCameraActive ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`}></span>
                  <span className="text-xs font-bold text-emerald-400">
                    {isSelfCameraActive ? 'Kamera Pemindai Aktif' : 'Kamera Nonaktif'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {isSelfCameraActive && (
                    <button
                      type="button"
                      onClick={toggleSelfCameraFacing}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold flex items-center gap-1 border border-slate-700 transition-colors"
                      title="Ganti Kamera Depan/Belakang"
                    >
                      <RotateCw className="w-3 h-3 text-emerald-400" />
                      <span>{selfCameraFacing === 'environment' ? 'Belakang' : 'Depan'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (isSelfCameraActive) {
                        stopSelfCamera();
                      } else {
                        startSelfCamera(selfCameraFacing);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                      isSelfCameraActive 
                        ? 'bg-rose-500/80 hover:bg-rose-600 text-white' 
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                    }`}
                  >
                    <Camera className="w-3 h-3" />
                    <span>{isSelfCameraActive ? 'Tutup Kamera' : 'Buka Kamera'}</span>
                  </button>
                </div>
              </div>

              {selfCameraError && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>Akses Kamera Terkendala</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {selfCameraError}
                  </p>
                  <button
                    type="button"
                    onClick={() => startSelfCamera(selfCameraFacing)}
                    className="px-3 py-1 rounded-lg bg-white text-slate-900 text-[11px] font-bold inline-flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Coba Buka Kamera Lagi</span>
                  </button>
                </div>
              )}

              {/* Viewfinder Frame 1:1 */}
              <div className="relative w-56 h-56 sm:w-64 sm:h-64 aspect-square mx-auto rounded-3xl overflow-hidden bg-black border-2 border-emerald-500/70 shadow-2xl flex items-center justify-center">
                {/* 4 Corner Reticles */}
                <div className="absolute top-3 left-3 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl z-20 pointer-events-none"></div>
                <div className="absolute top-3 right-3 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl z-20 pointer-events-none"></div>
                <div className="absolute bottom-3 left-3 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl z-20 pointer-events-none"></div>
                <div className="absolute bottom-3 right-3 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl z-20 pointer-events-none"></div>

                {isSelfCameraActive ? (
                  <video
                    ref={(el) => {
                      selfVideoRef.current = el;
                      if (el && selfStreamRef.current && el.srcObject !== selfStreamRef.current) {
                        el.srcObject = selfStreamRef.current;
                        el.play().catch(console.warn);
                      }
                    }}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${selfCameraFacing === 'user' ? 'scale-x-[-1]' : ''}`}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-2 bg-radial from-slate-900 to-slate-950">
                    <QrCode className="w-12 h-12 text-slate-500 animate-pulse" />
                    <span className="text-xs font-bold text-slate-300">Kamera Sedang Ditutup</span>
                    <p className="text-[10px] text-slate-500">Klik "Buka Kamera" di atas atau unggah gambar QR</p>
                  </div>
                )}

                {/* Animated Sweeping Laser Line inside the Square */}
                {isSelfCameraActive && (
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] z-20 pointer-events-none animate-bounce opacity-85"></div>
                )}
              </div>

              <div className="text-center pt-1">
                <span className="text-[10px] text-slate-400">
                  {isSelfCameraActive 
                    ? 'Arahkan kamera ke Square QR Code sekolah. Sistem akan otomatis merekam kehadiran saat QR terdeteksi.'
                    : 'Gunakan tombol di bawah jika ingin mengunggah foto QR dari galeri atau ketik token manual.'}
                </span>
              </div>
            </div>

            {/* Alternatif: Unggah Foto QR / Input Manual */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">Alternatif Presensi Token:</span>
                <label className="cursor-pointer text-emerald-700 hover:text-emerald-800 font-bold inline-flex items-center gap-1 text-[11px]">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Pilih Foto QR dari HP</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadQrImage}
                    className="hidden"
                  />
                </label>
              </div>

              <form onSubmit={handleSelfQrSubmit} className="space-y-3 text-xs">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={qrInputCode}
                    onChange={(e) => setQrInputCode(e.target.value)}
                    placeholder="Ketik kode token, contoh: BAKTI-ABSEN-2026-..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs uppercase font-bold focus:outline-none focus:border-emerald-600 bg-slate-50"
                  />
                  <button
                    type="submit"
                    disabled={isProcessingQr || !qrInputCode.trim()}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white rounded-xl font-bold text-xs shrink-0 shadow-sm transition-all"
                  >
                    Kirim
                  </button>
                </div>
              </form>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
              <div className="flex items-center gap-1 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Terhubung real-time ke buku presensi</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  stopSelfCamera();
                  setIsScanModalOpen(false);
                }}
                className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ABSENSI GPS GEOFENCE (RADIUS 50M) */}
      {isGpsModalOpen && (
        <AbsenGpsModal
          currentUser={currentUser}
          schoolInfo={schoolInfo}
          absensiList={absensiList}
          onAddAbsensi={onAddAbsensi}
          onClose={() => setIsGpsModalOpen(false)}
        />
      )}

      {/* MODAL: KARTU TANDA PELAJAR DIGITAL (PRINT & PREVIEW) */}
      {isKartuModalOpen && (
        <KartuPelajarModal
          siswa={currentUser}
          schoolInfo={schoolInfo}
          onClose={() => setIsKartuModalOpen(false)}
        />
      )}
    </div>
  );
};
