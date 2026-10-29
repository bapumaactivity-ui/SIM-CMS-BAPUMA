import React, { useState, useEffect, useMemo } from 'react';
import { PaketUjian, User, Kelas, Mapel, HasilUjian, SoalPG, SoalIsian, SchoolInfo, AbsensiRecord, NilaiMapelSiswa, Ekskul, NilaiEkskulSiswa, JadwalPelajaran, AbsenMengajarRecord } from '../types';
import { parseAikenUjian, exportToAikenText, generateTeacherPrompt, TEMPLATE_PROMPT_GURU_PAS, TEMPLATE_PROMPT_GURU_PTS } from '../utils/parserAiken';
import { copyTextToClipboard } from '../utils/clipboard';
import { getMatchingClassesForMapel, canAccessNilaiEkskul, isUserAdmin, isUserWalas, getPembinaAssignedEkskuls, isUserPembina } from '../utils/academicHelpers';
import { TemplatePromptModal } from './TemplatePromptModal';
import { LegerMapelView } from './LegerMapelView';
import { AbsensiBarcodeView } from './AbsensiBarcodeView';
import { NilaiEkskulView } from './NilaiEkskulView';
import { AbsenMengajarView } from './AbsenMengajarView';
import { EditUjianModal } from './EditUjianModal';
import { UploadSoalModal } from './UploadSoalModal';
import { GreetingBanner } from './GreetingBanner';
import { requestAIGenerateQuestions } from '../services/aiService';
import { 
  FileText, 
  Clock, 
  Key, 
  Printer, 
  Upload, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  Calendar, 
  Users, 
  BarChart3, 
  HelpCircle,
  Eye,
  Trash2,
  RefreshCw,
  Sparkles,
  BookOpen,
  Bookmark,
  Scan,
  UserCheck,
  Camera,
  Edit3,
  Award
} from 'lucide-react';

interface GuruDashboardViewProps {
  currentUser: User;
  ujianList: PaketUjian[];
  kelasList: Kelas[];
  mapelList: Mapel[];
  hasilList: HasilUjian[];
  schoolInfo?: SchoolInfo;
  usersList?: User[];
  absensiList?: AbsensiRecord[];
  nilaiList?: NilaiMapelSiswa[];
  ekskulList?: Ekskul[];
  nilaiEkskulList?: NilaiEkskulSiswa[];
  jadwalPelajaranList?: JadwalPelajaran[];
  absenMengajarList?: AbsenMengajarRecord[];
  onSaveNilaiEkskul?: (list: NilaiEkskulSiswa[]) => void;
  onSaveUjian: (ujian: PaketUjian) => void;
  onDeleteUjian: (ujianId: string) => void;
  onAddAbsensi?: (record: AbsensiRecord) => void;
  onBatchAddAbsensi?: (records: AbsensiRecord[]) => void;
  onUpdateAbsensi?: (record: AbsensiRecord) => void;
  onDeleteAbsensi?: (id: string) => void;
  onSaveNilaiList?: (newNilaiList: NilaiMapelSiswa[]) => void;
  onSaveAbsenMengajar?: (record: AbsenMengajarRecord) => void;
  onDeleteAbsenMengajar?: (id: string) => void;
  onUpdateProfile?: (user: User) => void;
  onPullAllFromCloud?: () => Promise<any>;
}

export const GuruDashboardView: React.FC<GuruDashboardViewProps> = ({
  currentUser,
  ujianList,
  kelasList,
  mapelList,
  hasilList,
  schoolInfo,
  usersList = [],
  absensiList = [],
  nilaiList = [],
  ekskulList = [],
  nilaiEkskulList = [],
  jadwalPelajaranList = [],
  absenMengajarList = [],
  onSaveNilaiEkskul = () => {},
  onSaveUjian,
  onDeleteUjian,
  onAddAbsensi = () => {},
  onBatchAddAbsensi,
  onUpdateAbsensi = () => {},
  onDeleteAbsensi = () => {},
  onSaveNilaiList = () => {},
  onSaveAbsenMengajar = () => {},
  onDeleteAbsenMengajar = () => {},
  onUpdateProfile = () => {},
  onPullAllFromCloud,
}) => {
  // Filter only exams created by this teacher or in their subject area
  const teacherExams = ujianList.filter(u => 
    u.idGuru === currentUser.id || 
    (currentUser.mapelDiampu && currentUser.mapelDiampu.includes(u.idMapel)) ||
    currentUser.role === 'admin'
  );

  const isSuperAdmin = isUserAdmin(currentUser);
  const isWalas = isUserWalas(currentUser, kelasList);

  // Pembina Ekskul identification & Access Control (Hanya Pembina, Walas, dan Admin)
  const pembinaEkskuls = getPembinaAssignedEkskuls(currentUser, ekskulList);
  const isPembina = isUserPembina(currentUser, ekskulList);
  const canAccessEkskul = canAccessNilaiEkskul(currentUser, ekskulList, kelasList);

  const isPurePembina = currentUser.role === 'pembina_ekskul' || (isPembina && (!currentUser.mapelDiampu || currentUser.mapelDiampu.length === 0) && !isWalas);
  const [activeTab, setActiveTab] = useState<'jurnal' | 'daftar' | 'buat' | 'cetak' | 'nilai' | 'leger' | 'absensi' | 'ekskul' | 'profil'>(
    isPurePembina ? 'ekskul' : 'jurnal'
  );
  
  const [selectedExamForPrint, setSelectedExamForPrint] = useState<PaketUjian | null>(teacherExams[0] || null);
  const [selectedExamForEdit, setSelectedExamForEdit] = useState<PaketUjian | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Profile Edit State
  const [guruNama, setGuruNama] = useState(currentUser.nama);
  const [guruGelar, setGuruGelar] = useState(currentUser.gelar || '');
  const [guruTelepon, setGuruTelepon] = useState(currentUser.telepon || '');
  const [guruEmail, setGuruEmail] = useState(currentUser.email || '');
  const [guruPassword, setGuruPassword] = useState(currentUser.password || 'guru123');
  const [guruFoto, setGuruFoto] = useState(currentUser.fotoProfilUrl || '');
  const [profileSavedMsg, setProfileSavedMsg] = useState(false);

  const handleSaveGuruProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: User = {
      ...currentUser,
      nama: guruNama,
      gelar: guruGelar,
      telepon: guruTelepon,
      email: guruEmail,
      password: guruPassword,
      fotoProfilUrl: guruFoto,
    };
    onUpdateProfile(updated);
    setProfileSavedMsg(true);
    setTimeout(() => setProfileSavedMsg(false), 3000);
  };

  const handleGuruPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setGuruFoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Helper to determine whether a mapel matches the teacher's taught subjects
  const isTeacherMapel = (m: Mapel): boolean => {
    if (currentUser.role === 'admin') return true;
    if (currentUser.mapelDiampu && currentUser.mapelDiampu.length > 0) {
      return currentUser.mapelDiampu.some(val => {
        if (!val) return false;
        const v = val.toLowerCase().trim();
        return (
          m.id.toLowerCase() === v ||
          m.kode.toLowerCase() === v ||
          m.namaMapel.toLowerCase() === v ||
          m.namaMapel.toLowerCase().includes(v) ||
          v.includes(m.namaMapel.toLowerCase()) ||
          (v.includes('jasmani') && m.namaMapel.toLowerCase().includes('jasmani')) ||
          (v.includes('pjok') && (m.kode.toLowerCase().includes('pjok') || m.namaMapel.toLowerCase().includes('jasmani'))) ||
          (v.includes('agama') && (m.kode.toLowerCase().includes('pai') || m.namaMapel.toLowerCase().includes('agama'))) ||
          (v.includes('farmasi') && m.namaMapel.toLowerCase().includes('farmasi')) ||
          (v.includes('keperawatan') && m.namaMapel.toLowerCase().includes('keperawatan')) ||
          (v.includes('kecantikan') && m.namaMapel.toLowerCase().includes('kecantikan')) ||
          (v.includes('perhotelan') && m.namaMapel.toLowerCase().includes('perhotelan'))
        );
      });
    }
    // Match if teacher's username or name indicates subject (e.g. 'pika' -> jasmani)
    const nameLower = (currentUser.nama + ' ' + (currentUser.username || '')).toLowerCase();
    if ((nameLower.includes('pika') || nameLower.includes('penjas') || nameLower.includes('pjok')) && m.namaMapel.toLowerCase().includes('jasmani')) {
      return true;
    }
    // Match by jurusan if applicable
    if (currentUser.jurusan && currentUser.jurusan !== 'Umum') {
      if (m.jurusan.toLowerCase().includes(currentUser.jurusan.toLowerCase())) {
        return true;
      }
    }
    return false;
  };

  // Filtered Mapel that this teacher teaches (fallback to all mapel if none matched)
  const teacherMapel = useMemo(() => {
    if (currentUser.role === 'admin') return mapelList;
    const filtered = mapelList.filter(isTeacherMapel);
    return filtered.length > 0 ? filtered : mapelList;
  }, [currentUser, mapelList]);

  // Helper to dynamically get default topics & matched classes based on the teacher's subject
  const getDefaultTopicsForMapel = (mapel?: Mapel) => {
    const matched = getMatchingClassesForMapel(mapel, kelasList);
    const defaultClasses = matched.map(k => k.namaKelas);
    if (!mapel) {
      return {
        lingkupMateri: 'Kompetensi Terapan Kejuruan & HOTS',
        bab: 'Bab 1: Analisis Kasus & Penerapan Keterampilan',
        targetKelas: defaultClasses.length > 0 ? defaultClasses : ['X Kesehatan'],
      };
    }
    const name = mapel.namaMapel.toLowerCase();
    if (name.includes('jasmani') || name.includes('pjok') || name.includes('olahraga')) {
      return {
        lingkupMateri: 'Kebugaran Jasmani, Keterampilan Gerak & Pola Hidup Sehat',
        bab: 'Bab 1: Analisis Kebugaran Jasmani & Keterampilan Gerak Cabang Olahraga',
        targetKelas: defaultClasses,
      };
    }
    if (name.includes('agama') || name.includes('pai')) {
      return {
        lingkupMateri: 'Akidah Akhlak, Fikih Ibadah & Muamalah Kontemporer',
        bab: 'Bab 1: Menjaga Martabat Manusia dengan Menjauhi Pergaulan Bebas dan Zina',
        targetKelas: defaultClasses,
      };
    }
    if (name.includes('pancasila') || name.includes('ppkn')) {
      return {
        lingkupMateri: 'Harmonisasi Hak dan Kewajiban Warga Negara dalam Konstitusi',
        bab: 'Bab 1: Nilai-Nilai Pancasila dalam Praktik Penyelenggaraan Pemerintahan',
        targetKelas: defaultClasses,
      };
    }
    if (name.includes('indonesia')) {
      return {
        lingkupMateri: 'Teks Laporan Hasil Observasi & Teks Prosedur Kompleks',
        bab: 'Bab 1: Menganalisis Struktur & Kaidah Kebahasaan Teks LHO',
        targetKelas: defaultClasses,
      };
    }
    if (name.includes('inggris')) {
      return {
        lingkupMateri: 'Analytical Exposition, Formal Invitation & Job Interview Conversation',
        bab: 'Chapter 1: Writing Application Letters and Handling Professional Inquiries',
        targetKelas: defaultClasses,
      };
    }
    if (name.includes('matematika')) {
      return {
        lingkupMateri: 'Eksponen, Barisan & Deret Aritmatika serta Statistika Deskriptif',
        bab: 'Bab 1: Penyajian Data Distribusi Frekuensi & Ukuran Pemusatan Data',
        targetKelas: defaultClasses,
      };
    }
    if (name.includes('farma') || name.includes('resep') || name.includes('obat')) {
      return {
        lingkupMateri: 'Simulasi Klinis, Farmakoterapi Gangguan Sistem & Dispensing Resep',
        bab: 'Bab 3: Analisis Interaksi Obat & Dispensing Resep Klinis',
        targetKelas: defaultClasses,
      };
    }
    if (name.includes('perawat') || name.includes('kdm') || name.includes('anatomi')) {
      return {
        lingkupMateri: 'Kebutuhan Dasar Manusia (KDM) & Keterampilan Tindakan Keperawatan',
        bab: 'Bab 2: Prosedur Pengukuran Tanda-Tanda Vital (TTV) & Dokumentasi Asuhan',
        targetKelas: defaultClasses,
      };
    }
    if (name.includes('cantik') || name.includes('kulit') || name.includes('rambut') || name.includes('spa')) {
      return {
        lingkupMateri: 'Perawatan Kulit Wajah, Tata Rias Panggung & Terapi Spa Tradisional',
        bab: 'Bab 1: Analisis Morfologi Kulit Wajah & Prosedur Facial Treatment',
        targetKelas: defaultClasses,
      };
    }
    if (name.includes('hotel') || name.includes('front office') || name.includes('housekeeping')) {
      return {
        lingkupMateri: 'Front Office Reservation, Housekeeping Operasional & F&B Service',
        bab: 'Bab 2: Prosedur Check-In Tamu VIP & Manajemen Sanitasi Kamar Hotel',
        targetKelas: defaultClasses,
      };
    }
    return {
      lingkupMateri: `Materi Pokok & Capaian Pembelajaran ${mapel.namaMapel}`,
      bab: `Bab 1: Analisis Kasus & Penerapan Kompetensi ${mapel.namaMapel}`,
      targetKelas: defaultClasses,
    };
  };

  const activeDefaultMapel = teacherMapel[0] || mapelList[0];
  const initialTopics = getDefaultTopicsForMapel(activeDefaultMapel);

  // Form State for creating/editing Exam
  const [formNamaUjian, setFormNamaUjian] = useState('');
  const [formJenisUjian, setFormJenisUjian] = useState<'UJIAN_AKHIR' | 'UJIAN_TENGAH_SEMESTER'>('UJIAN_TENGAH_SEMESTER');
  const [formMapelId, setFormMapelId] = useState<string>(activeDefaultMapel?.id || '');
  const [formLingkupMateri, setFormLingkupMateri] = useState('');
  const [formBab, setFormBab] = useState('');
  const [formTargetKelas, setFormTargetKelas] = useState<string[]>(initialTopics.targetKelas);
  const [formHariTanggal, setFormHariTanggal] = useState('Senin, 21 September 2026');
  const [formJamMulai, setFormJamMulai] = useState('08:00 WIB');
  const [formDurasi, setFormDurasi] = useState(90);
  const [formToken, setFormToken] = useState('MED' + Math.floor(100 + Math.random() * 900));
  const [rawAikenText, setRawAikenText] = useState('');
  const [parseNotice, setParseNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  // Dynamic matching classes based on currently chosen mapel in Create Exam form
  const selectedFormMapel = useMemo(() => {
    return mapelList.find(m => m.id === formMapelId) || activeDefaultMapel;
  }, [mapelList, formMapelId, activeDefaultMapel]);

  const matchingTargetClasses = useMemo(() => {
    return getMatchingClassesForMapel(selectedFormMapel, kelasList);
  }, [selectedFormMapel, kelasList]);

  // Synchronize formMapelId whenever teacherMapel or currentUser changes
  useEffect(() => {
    if (teacherMapel.length > 0) {
      const exists = teacherMapel.some(m => m.id === formMapelId);
      if (!exists) {
        const nextMapel = teacherMapel[0];
        setFormMapelId(nextMapel.id);
        const nextTopics = getDefaultTopicsForMapel(nextMapel);
        setFormLingkupMateri('');
        setFormBab('');
        setFormTargetKelas(nextTopics.targetKelas);
      }
    }
  }, [currentUser, teacherMapel, formMapelId]);

  const handleGenerateRandomToken = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let res = '';
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormToken(res);
  };

  // AI Direct Generation State
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiProgressText, setAiProgressText] = useState('');
  const [aiJumlahPG, setAiJumlahPG] = useState<number>(30);
  const [aiInstruksiTambahan, setAiInstruksiTambahan] = useState('');
  const [aiErrorMsg, setAiErrorMsg] = useState<string | null>(null);

  // Keep aiJumlahPG synced with formJenisUjian by default
  useEffect(() => {
    setAiJumlahPG(formJenisUjian === 'UJIAN_AKHIR' ? 40 : 30);
  }, [formJenisUjian]);

  const handleGenerateQuestionsWithGemini = async () => {
    setIsGeneratingAI(true);
    setAiErrorMsg(null);
    setParseNotice(null);
    setAiProgressText('Gemini AI sedang menyusun naskah soal HOTS berstandar kurikulum...');

    const selectedMapelObj = mapelList.find(m => m.id === formMapelId) || activeDefaultMapel;

    try {
      const res = await requestAIGenerateQuestions({
        namaGuru: currentUser.nama,
        namaMapel: selectedMapelObj?.namaMapel || 'Mata Pelajaran Kejuruan',
        lingkupMateri: formLingkupMateri,
        bab: formBab,
        targetKelas: formTargetKelas,
        jenisUjian: formJenisUjian,
        token: formToken,
        waktuUjian: `${formHariTanggal} | ${formJamMulai} | ${formDurasi} Menit`,
        jumlahPG: aiJumlahPG,
        jumlahIsian: 5,
        instruksiTambahan: aiInstruksiTambahan,
      });

      if (!res.success || !res.text) {
        setAiErrorMsg(res.error || 'Gagal menghasilkan naskah soal dari Gemini AI.');
        return;
      }

      setRawAikenText(res.text);

      // Auto-parse into form
      const result = parseAikenUjian(res.text);
      if (result.metadata.token) setFormToken(result.metadata.token);
      if (result.metadata.lingkupMateri) setFormLingkupMateri(result.metadata.lingkupMateri);
      if (result.metadata.bab) setFormBab(result.metadata.bab);

      setParseNotice({
        type: 'success',
        message: `✨ Berhasil digenerate oleh Gemini AI (${res.modelUsed || 'Gemini 3.1 Flash'})! Terdeteksi ${result.soalPG.length} Soal PG dan ${result.soalIsian.length} Soal Isian siap pakai.`
      });
    } catch (err: any) {
      setAiErrorMsg(err?.message || 'Terjadi kesalahan teknis saat menghubungi AI.');
    } finally {
      setIsGeneratingAI(false);
      setAiProgressText('');
    }
  };

  const handleParseAiken = () => {
    if (!rawAikenText.trim()) {
      setParseNotice({ type: 'error', message: 'Teks soal masih kosong. Tempelkan format soal Aiken di area teks.' });
      return;
    }

    const result = parseAikenUjian(rawAikenText);
    const targetPG = formJenisUjian === 'UJIAN_AKHIR' ? 40 : 30;
    const targetIsian = 5;

    // Apply parsed metadata if found
    if (result.metadata.token) setFormToken(result.metadata.token);
    if (result.metadata.lingkupMateri) setFormLingkupMateri(result.metadata.lingkupMateri);
    if (result.metadata.bab) setFormBab(result.metadata.bab);
    if (result.metadata.sasaranKelas && result.metadata.sasaranKelas.length > 0) {
      setFormTargetKelas(result.metadata.sasaranKelas);
    }
    if (result.metadata.jenisUjian) setFormJenisUjian(result.metadata.jenisUjian);

    if (result.soalPG.length === 0 && result.soalIsian.length === 0) {
      setParseNotice({
        type: 'error',
        message: 'Gagal mendeteksi butir soal. Pastikan menggunakan format opsi A. s/d E. dan penanda ANSWER: [Huruf].'
      });
      return;
    }

    setParseNotice({
      type: 'success',
      message: `Berhasil mengekstrak ${result.soalPG.length} Pilihan Ganda dan ${result.soalIsian.length} Soal Isian! Status dokumen: ${result.metadata.statusDokumen} (Target: ${targetPG} PG & ${targetIsian} Isian).`
    });
  };

  const handleImportFromUploadModal = (importedPG: SoalPG[], importedIsian: SoalIsian[], detectedTitle?: string) => {
    if (importedPG.length === 0 && importedIsian.length === 0) return;
    const aikenTextFromImport = exportToAikenText(importedPG, importedIsian);
    setRawAikenText(prev => prev ? `${prev}\n\n${aikenTextFromImport}` : aikenTextFromImport);
    if (detectedTitle && !formNamaUjian.trim()) {
      setFormNamaUjian(detectedTitle);
    }
    setParseNotice({
      type: 'success',
      message: `🎉 Berhasil mengimpor ${importedPG.length} Soal PG ${importedIsian.length > 0 ? `dan ${importedIsian.length} Soal Isian` : ''} dari berkas dokumen Anda! Format butir soal telah otomatis tertata rapi. Silakan tinjau dan klik "Simpan & Rilis Paket Ujian".`
    });
    setActiveTab('buat');
    setShowUploadModal(false);
  };

  const handleSaveExamPackage = () => {
    const parsed = parseAikenUjian(rawAikenText);
    const selectedMapelObj = mapelList.find(m => m.id === formMapelId);

    const targetPG = formJenisUjian === 'UJIAN_AKHIR' ? 40 : 30;
    const targetIsian = 5;

    const pgCount = parsed.soalPG.length;
    const isianCount = parsed.soalIsian.length;

    // Soal esai opsional di CBT: guru bisa isi manual secara tertulis di lembar kertas
    let docStatus: 'BELUM_BUAT' | 'DRAFT_PROSES' | 'READY' = 'DRAFT_PROSES';
    if (pgCount >= targetPG) {
      docStatus = 'READY';
    } else if (pgCount === 0 && isianCount === 0) {
      docStatus = 'BELUM_BUAT';
    }

    const newExam: PaketUjian = {
      id: `ex-${Date.now()}`,
      namaUjian: formNamaUjian || `${formJenisUjian === 'UJIAN_AKHIR' ? 'PAS/PAT' : 'PTS'} ${selectedMapelObj?.namaMapel || 'Mapel Kejuruan'}`,
      jenisUjian: formJenisUjian,
      idGuru: currentUser.id,
      namaGuru: currentUser.nama,
      idMapel: formMapelId,
      namaMapel: selectedMapelObj?.namaMapel || 'Mapel Kejuruan',
      lingkupMateri: formLingkupMateri,
      bab: formBab,
      targetKelas: formTargetKelas,
      hariTanggal: formHariTanggal,
      jamMulai: formJamMulai,
      durasiMenit: Number(formDurasi),
      token: formToken,
      statusDokumen: docStatus,
      soalPG: parsed.soalPG,
      soalIsian: parsed.soalIsian,
      passingGrade: 75,
    };

    onSaveUjian(newExam);
    setSelectedExamForPrint(newExam);
    setSaveNotice(`Paket Ujian "${newExam.namaUjian}" berhasil disimpan dengan status: ${docStatus}!`);
    setActiveTab('daftar');
  };

  const handleCopyPrompt = async (text: string) => {
    const success = await copyTextToClipboard(text);
    if (success) {
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2500);
    } else {
      setShowPromptModal(true);
    }
  };

  // Filtered results for this teacher's subject & target classes
  const teacherResults = hasilList.filter(res => {
    const exam = ujianList.find(u => u.id === res.idUjian);
    return exam && (exam.idGuru === currentUser.id || (currentUser.mapelDiampu && currentUser.mapelDiampu.includes(exam.idMapel)));
  });

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Sapaan Waktu & Ucapan Ulang Tahun */}
        <GreetingBanner user={currentUser} />

        {/* Top Banner */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Panel Pendidik & Tenaga Kependidikan</span>
              </span>

              {/* Badges for Concurrent Roles */}
              {isWalas && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-800 text-[11px] font-bold border border-purple-200">
                  <Award className="w-3 h-3 text-purple-600" />
                  <span>Wali Kelas: {currentUser.walasNamaKelas || 'Aktif'}</span>
                </span>
              )}

              {isPembina && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 text-[11px] font-bold border border-amber-300">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>Pembina Ekskul: {pembinaEkskuls.map(e => e.nama).join(', ') || 'Aktif'}</span>
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              {isPurePembina ? 'Portal Pengelolaan & Penilaian Ekstrakurikuler' : 'Manajemen Soal Ujian, Penilaian Siswa & Ekstrakurikuler'}
            </h1>
            <p className="text-xs text-slate-600">
              Pengguna: <strong className="text-slate-800">{currentUser.nama}</strong> ({currentUser.nipOrNis}) • 
              {isPembina && isWalas ? ' Merangkap Guru Mapel, Wali Kelas & Pembina Ekskul' : isPembina ? ' Menjabat Pembina Ekstrakurikuler' : isWalas ? ' Merangkap Guru Mapel & Wali Kelas' : ' Guru Pengampu Mata Pelajaran'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {!isPurePembina && (
              <>
                <button
                  onClick={() => setActiveTab('jurnal')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'jurnal' 
                      ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-300' 
                      : 'bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100'
                  }`}
                >
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>Absen & Jurnal Mengajar</span>
                </button>
                <button
                  onClick={() => setActiveTab('daftar')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    activeTab === 'daftar' ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Daftar Paket Ujian ({teacherExams.length})
                </button>
                <button
                  onClick={() => setActiveTab('buat')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    activeTab === 'buat' ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>Buat Soal Baru</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Upload naskah soal langsung dari file Word (.docx) atau PDF (.pdf)"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload Soal (Word / PDF)</span>
                </button>
                <button
                  onClick={() => setActiveTab('cetak')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    activeTab === 'cetak' ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Soal</span>
                </button>
                <button
                  onClick={() => setActiveTab('nilai')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    activeTab === 'nilai' ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Nilai Ujian CAT</span>
                </button>
                <button
                  onClick={() => setActiveTab('leger')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    activeTab === 'leger' ? 'bg-emerald-600 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  <span>Leger Nilai Mapel</span>
                </button>
                <button
                  onClick={() => setActiveTab('absensi')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    activeTab === 'absensi' ? 'bg-purple-600 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Scan className="w-4 h-4 text-purple-600" />
                  <span>Presensi Barcode</span>
                </button>
              </>
            )}

            {canAccessEkskul && (
              <button
                onClick={() => setActiveTab('ekskul')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'ekskul'
                    ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-300'
                    : 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
                }`}
              >
                <Award className="w-4 h-4 text-amber-600" />
                <span>
                  {isPembina 
                    ? `Bina Ekskul (${pembinaEkskuls.map(e => e.nama).join(', ') || 'Aktif'})` 
                    : 'Nilai Ekstrakurikuler'}
                </span>
                {isPembina && (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                    {pembinaEkskuls.length}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={() => setActiveTab('profil')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'profil' ? 'bg-slate-900 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Camera className="w-4 h-4 text-slate-600" />
              <span>Profil Saya</span>
            </button>
          </div>
        </div>

        {saveNotice && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-sm animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{saveNotice}</span>
            </div>
            <button
              onClick={() => setSaveNotice(null)}
              className="text-emerald-700 hover:text-emerald-900 font-bold px-2 py-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* TAB 0: ABSEN & JURNAL MENGAJAR GURU */}
        {activeTab === 'jurnal' && (
          <AbsenMengajarView
            currentUser={currentUser}
            kelasList={kelasList}
            mapelList={mapelList}
            jadwalPelajaranList={jadwalPelajaranList}
            absenMengajarList={absenMengajarList}
            usersList={usersList}
            schoolInfo={schoolInfo}
            onSaveAbsenMengajar={onSaveAbsenMengajar}
            onDeleteAbsenMengajar={onDeleteAbsenMengajar}
            isAdminView={currentUser.role === 'admin'}
          />
        )}

        {/* TAB 1: DAFTAR PAKET UJIAN GURU */}
        {activeTab === 'daftar' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {teacherExams.map((exam) => {
                const totalPG = exam.soalPG.length;
                const totalIsian = exam.soalIsian.length;
                const targetPG = exam.jenisUjian === 'UJIAN_AKHIR' ? 40 : 30;

                return (
                  <div 
                    key={exam.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          exam.statusDokumen === 'READY' 
                            ? 'bg-emerald-100 text-emerald-800'
                            : exam.statusDokumen === 'DRAFT_PROSES'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {exam.statusDokumen === 'READY' && '● READY (Siap Ujian)'}
                          {exam.statusDokumen === 'DRAFT_PROSES' && `● PROSES (${totalPG}/${targetPG} PG)`}
                          {exam.statusDokumen === 'BELUM_BUAT' && '● BELUM LENGKAP'}
                        </span>

                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          Token: {exam.token}
                        </span>
                      </div>

                      <h3 className="font-bold text-slate-900 text-sm leading-snug">
                        {exam.namaUjian}
                      </h3>

                      <div className="text-xs text-slate-600 space-y-1 pt-1 border-t border-slate-100">
                        <div>Mapel: <strong>{exam.namaMapel}</strong></div>
                        {exam.lingkupMateri && (
                          <div className="text-[11px] text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                            Materi: <strong>{exam.lingkupMateri}</strong>
                          </div>
                        )}
                        {exam.bab && (
                          <div className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                            Bab: <strong>{exam.bab}</strong>
                          </div>
                        )}
                        <div>Jadwal: {exam.hariTanggal} ({exam.jamMulai})</div>
                        <div>Durasi: {exam.durasiMenit} Menit • KKM: {exam.passingGrade}</div>
                        <div>Target Kelas: <span className="text-blue-700 font-semibold">{exam.targetKelas.join(', ')}</span></div>
                        <div>Jumlah Soal: <strong>{totalPG} PG</strong> + <strong>{totalIsian} Isian</strong></div>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => {
                            setSelectedExamForPrint(exam);
                            setActiveTab('cetak');
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Cetak</span>
                        </button>

                        <button
                          onClick={() => setSelectedExamForEdit(exam)}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1 border border-indigo-200 shadow-xs"
                          title="Edit Waktu Pelaksanaan & Butir Soal"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Soal & Jadwal</span>
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          if (confirm(`Yakin ingin menghapus paket ujian "${exam.namaUjian}"?`)) {
                            onDeleteUjian(exam.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        title="Hapus Ujian"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: BUAT / INPUT SOAL BARU & PARSER AIKEN */}
        {activeTab === 'buat' && (
          <div className="space-y-6">
            {/* Quick Action Banner for Uploading Questions from Word or PDF */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 rounded-2xl p-5 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold">
                  <FileText className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Fitur Paling Praktis & Cepat</span>
                </div>
                <h3 className="text-base font-bold text-white">
                  Punya Naskah Soal di Microsoft Word (.docx) atau PDF (.pdf)?
                </h3>
                <p className="text-xs text-emerald-100 max-w-2xl leading-relaxed">
                  Bapak/Ibu guru tidak perlu mengetik butir soal satu per satu. Cukup upload berkas naskah soal Word atau PDF Anda, sistem akan secara otomatis membaca nomor soal, pilihan A-E, dan kunci jawaban langsung siap diujikan!
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(true)}
                className="px-5 py-3 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <Upload className="w-4 h-4 text-emerald-600" />
                <span>Upload File Soal (Word / PDF) Sekarang</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left: Metadata & Settings Form */}
              <div className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
                <h3 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-2">
                  1. Parameter Sesi Ujian & Sasaran Kelas
                </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama / Judul Paket Ujian
                </label>
                <input
                  type="text"
                  placeholder="Contoh: PTS Simulasi Klinis Farmasi Genap"
                  value={formNamaUjian}
                  onChange={(e) => setFormNamaUjian(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jenis Ujian
                  </label>
                  <select
                    value={formJenisUjian}
                    onChange={(e) => setFormJenisUjian(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="UJIAN_TENGAH_SEMESTER">PTS (Wajib 30 PG + 5 Isian)</option>
                    <option value="UJIAN_AKHIR">PAS / PAT (Wajib 40 PG + 5 Isian)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mata Pelajaran Diampu
                  </label>
                  <select
                    value={formMapelId}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setFormMapelId(newId);
                      const targetMapel = mapelList.find(m => m.id === newId);
                      if (targetMapel) {
                        const topics = getDefaultTopicsForMapel(targetMapel);
                        setFormLingkupMateri('');
                        setFormBab('');
                        setFormTargetKelas(topics.targetKelas);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                  >
                    {teacherMapel.map(m => (
                      <option key={m.id} value={m.id}>{m.namaMapel} ({m.kode})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Isian Wajib: Lingkup Materi dan Bab */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-blue-700" />
                    <span>Lingkup Materi / Capaian Pembelajaran *</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Farmakoterapi Gangguan Sistem Saraf & K3LH"
                    value={formLingkupMateri}
                    onChange={(e) => setFormLingkupMateri(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Elemen modul / cakupan materi utama</span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                    <Bookmark className="w-3.5 h-3.5 text-blue-700" />
                    <span>Bab / Pokok Bahasan *</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Bab 3: Interaksi Obat & Resep Klinis"
                    value={formBab}
                    onChange={(e) => setFormBab(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Bab spesifik atau unit kompetensi diujikan</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <span>Pilih Sasaran Kelas yang Diizinkan Ujian:</span>
                    <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {matchingTargetClasses.length} Rombel Terkait {selectedFormMapel?.namaMapel}
                    </span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFormTargetKelas(matchingTargetClasses.map(k => k.namaKelas))}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-bold hover:underline"
                    >
                      Pilih Semua
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => setFormTargetKelas([])}
                      className="text-[10px] text-slate-500 hover:text-slate-700 font-medium hover:underline"
                    >
                      Kosongkan
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  {matchingTargetClasses.map(k => {
                    const isChecked = formTargetKelas.includes(k.namaKelas);
                    return (
                      <label key={k.id} className="flex items-center gap-2 cursor-pointer p-1 rounded-lg hover:bg-white transition-colors">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormTargetKelas([...formTargetKelas, k.namaKelas]);
                            } else {
                              setFormTargetKelas(formTargetKelas.filter(c => c !== k.namaKelas));
                            }
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-slate-800 font-medium">{k.namaKelas}</span>
                        <span className="text-[10px] text-slate-400">({k.jurusan})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Hari & Tanggal
                  </label>
                  <input
                    type="text"
                    value={formHariTanggal}
                    onChange={(e) => setFormHariTanggal(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Jam Mulai
                  </label>
                  <input
                    type="text"
                    value={formJamMulai}
                    onChange={(e) => setFormJamMulai(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Durasi (Menit)
                  </label>
                  <input
                    type="number"
                    value={formDurasi}
                    onChange={(e) => setFormDurasi(Number(e.target.value))}
                    className="w-full px-2 py-1.5 text-xs rounded border border-slate-300 font-bold"
                  />
                </div>
              </div>

              {/* Token Generator Box */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-blue-900 flex items-center gap-1">
                    <Key className="w-3.5 h-3.5 text-blue-700" />
                    <span>Token Ujian Akses Siswa</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomToken}
                    className="text-[11px] text-blue-700 font-bold hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Acak Token
                  </button>
                </div>
                <input
                  type="text"
                  value={formToken}
                  onChange={(e) => setFormToken(e.target.value.toUpperCase())}
                  className="w-full px-3 py-1.5 rounded-lg border border-blue-300 bg-white font-mono font-bold text-center text-sm tracking-widest text-blue-950"
                />
              </div>

              {/* 1-Click Master Prompt AI Helper */}
              <div className="p-3.5 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200 rounded-2xl space-y-2 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold text-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowPromptModal(true)}
                    className="flex items-center gap-1.5 text-blue-900 hover:text-blue-700 font-extrabold text-xs text-left group"
                    title="Klik untuk melihat dan menyalin template prompt AI pembuat soal"
                  >
                    <Sparkles className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
                    <span className="underline decoration-blue-300 underline-offset-2">Template Prompt AI Pembuat Soal</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowPromptModal(true)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 text-[11px] font-bold shadow-xs flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-600" />
                      <span>Lihat Template</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const selectedMapelObj = mapelList.find(m => m.id === formMapelId) || teacherMapel[0];
                        const prompt = generateTeacherPrompt({
                          namaGuru: currentUser.nama,
                          namaMapel: selectedMapelObj?.namaMapel || teacherMapel[0]?.namaMapel || 'Mata Pelajaran',
                          lingkupMateri: formLingkupMateri,
                          bab: formBab,
                          targetKelas: formTargetKelas,
                          jenisUjian: formJenisUjian,
                          token: formToken,
                          waktuUjian: `${formHariTanggal} | ${formJamMulai} | ${formDurasi} Menit`,
                        });
                        handleCopyPrompt(prompt);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold flex items-center gap-1 shadow-sm transition-all"
                    >
                      {copiedPrompt ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedPrompt ? 'Prompt Tersalin!' : 'Salin Prompt'}</span>
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Buka template instruksi ChatGPT / Gemini untuk membuat 30/40 butir naskah soal HOTS format standar Aiken.
                </p>
              </div>
            </div>

            {/* Right: Aiken Input Area & Parser */}
            <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      2. Input Bank Soal (Aiken / Key-Value Text)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Tempelkan teks soal dari Word, PDF, atau AI di bawah ini.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowUploadModal(true)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                      title="Unggah berkas Word (.docx) atau PDF (.pdf) untuk mengisi soal secara instan"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Word/PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleParseAiken}
                      className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Uji Parsing Soal</span>
                    </button>
                  </div>
                </div>

                {/* Interactive Gemini AI Direct Generator Panel */}
                <div className="bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-md border border-indigo-700/50 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-amber-400/20 border border-amber-300/30 text-amber-300">
                        <Sparkles className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-white text-sm sm:text-base">
                            AI Generator Soal Langsung (Gemini)
                          </h4>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-bold">
                            Siap Digunakan
                          </span>
                        </div>
                        <p className="text-[11px] text-blue-200">
                          Buat naskah soal HOTS berstandar kurikulum nasional secara otomatis tanpa perlu keluar aplikasi.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    <div>
                      <label className="text-[10px] font-bold text-blue-200 uppercase tracking-wider block mb-1">
                        Target Jumlah Soal PG:
                      </label>
                      <select
                        value={aiJumlahPG}
                        onChange={(e) => setAiJumlahPG(Number(e.target.value))}
                        disabled={isGeneratingAI}
                        className="w-full bg-white/10 border border-blue-300/30 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:bg-slate-800"
                      >
                        <option value={30} className="text-slate-900">30 Soal PG + 5 Isian (Standar PTS)</option>
                        <option value={40} className="text-slate-900">40 Soal PG + 5 Isian (Standar PAS)</option>
                        <option value={20} className="text-slate-900">20 Soal PG + 3 Isian (Uji Modul)</option>
                        <option value={10} className="text-slate-900">10 Soal PG + 2 Isian (Kuis Kilat)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-bold text-blue-200 uppercase tracking-wider block mb-1">
                        Catatan Khusus / Kasus Klinis (Opsional):
                      </label>
                      <input
                        type="text"
                        value={aiInstruksiTambahan}
                        onChange={(e) => setAiInstruksiTambahan(e.target.value)}
                        disabled={isGeneratingAI}
                        placeholder="Misal: Tambahkan skenario resep obat sirup anak & etiket dosis..."
                        className="w-full bg-white/10 border border-blue-300/30 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-blue-300/50 focus:outline-none focus:bg-slate-800"
                      />
                    </div>
                  </div>

                  {/* Action Button & Status */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-white/10">
                    <div className="text-[11px] text-blue-200 flex items-center gap-1.5">
                      {isGeneratingAI ? (
                        <span className="flex items-center gap-2 text-amber-300 font-semibold animate-pulse">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-300" />
                          {aiProgressText}
                        </span>
                      ) : (
                        <span>Model: <strong className="text-white">Gemini 3.1 Flash</strong> • Standar HOTS C4-C5</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleGenerateQuestionsWithGemini}
                      disabled={isGeneratingAI}
                      className={`px-4 py-2 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all ${
                        isGeneratingAI
                          ? 'bg-blue-800 text-blue-300 cursor-not-allowed opacity-80'
                          : 'bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 hover:shadow-amber-500/30 active:scale-98'
                      }`}
                    >
                      <Sparkles className="w-4 h-4 text-slate-950" />
                      <span>{isGeneratingAI ? 'Menyusun Soal...' : '✨ Buat Soal Otomatis dengan AI'}</span>
                    </button>
                  </div>

                  {aiErrorMsg && (
                    <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-400/40 text-rose-200 text-xs flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-300 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="font-bold text-white">Gagal Generate Soal:</p>
                        <p>{aiErrorMsg}</p>
                      </div>
                    </div>
                  )}
                </div>

                {parseNotice && (
                  <div className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                    parseNotice.type === 'success' 
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}>
                    {parseNotice.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                    <span>{parseNotice.message}</span>
                  </div>
                )}

                <textarea
                  rows={16}
                  placeholder={`[ID_GURU_LOGIN] = ${currentUser.nama}
[MAPEL_DIAMPU] = Simulasi Klinis Farmasi
[SASARAN_KELAS] = XII-FARMASI-1
[JENIS_UJIAN] = ${formJenisUjian}
[TOKEN_SAYA] = ${formToken}
---

Seorang pasien anak berusia 5 tahun dengan berat badan 20 kg...
A. 2,3 mL
B. 3,5 mL
C. 5,3 mL
D. 7,0 mL
E. 10,6 mL
ANSWER: C

=== BAGIAN SOAL ISIAN ===

Tuliskan warna etiket obat standar apotek untuk sediaan obat dalam!
ANSWER_KEY: putih`}
                  value={rawAikenText}
                  onChange={(e) => setRawAikenText(e.target.value)}
                  className="w-full p-4 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none leading-relaxed bg-slate-50"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  Target: <strong>{formJenisUjian === 'UJIAN_AKHIR' ? '40' : '30'} PG</strong> • <span className="text-emerald-700 font-medium">Soal esai di CBT opsional (dapat diisi manual tertulis di kertas untuk dikoreksi guru)</span>
                </div>

                <button
                  type="button"
                  onClick={handleSaveExamPackage}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan & Rilis Paket Ujian</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* TAB 3: CETAK SOAL KERTAS (OFFLINE PRINTING ENGINE) */}
        {activeTab === 'cetak' && (
          <div className="space-y-6">
            {/* Control Bar */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-slate-700">Pilih Paket Ujian:</label>
                <select
                  value={selectedExamForPrint?.id || ''}
                  onChange={(e) => {
                    const ex = teacherExams.find(item => item.id === e.target.value);
                    setSelectedExamForPrint(ex || null);
                  }}
                  className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 font-medium"
                >
                  {teacherExams.map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.namaUjian}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1.5 shadow"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Naskah Ujian Sekarang</span>
                </button>
              </div>
            </div>

            {/* Formal Printable Offline Exam Sheet */}
            {selectedExamForPrint && (
              <div className="bg-white p-8 sm:p-12 rounded-2xl shadow-md border border-slate-300 printable-document space-y-6 text-slate-900">
                {/* Formal School Kop */}
                <div className="text-center border-b-2 border-slate-900 pb-4">
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-600">
                    PEMERINTAH DAERAH PROVINSI JAWA BARAT / CABANG DINAS PENDIDIKAN
                  </div>
                  <h2 className="text-xl font-black text-slate-900 uppercase">
                    {schoolInfo?.nama || 'SMK BAKTI PUTRA MANDIRI'}
                  </h2>
                  <p className="text-xs text-slate-600">
                    NASKAH SOAL UJIAN RESMI TAHUN AJARAN {schoolInfo?.tahunAjaranPembelajaran || '2026/2027'} (SEMESTER {schoolInfo?.semesterPembelajaran?.toUpperCase() || 'GANJIL'})
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {schoolInfo?.alamatLengkap || 'Jl. Sawah, Kp. Sukasari, RT. 06/01, Desa Kabasiran, Kec. Parung Panjang, Kab. Bogor'}
                  </p>
                </div>

                {/* Exam Sub-Header Table */}
                <div className="grid grid-cols-1 sm:grid-cols-2 text-xs border border-slate-300 p-3 rounded-lg bg-slate-50/50 gap-2">
                  <div className="space-y-1">
                    <div>Mata Pelajaran: <strong>{selectedExamForPrint.namaMapel}</strong></div>
                    <div>Lingkup Materi: <strong>{selectedExamForPrint.lingkupMateri || 'Kompetensi Terapan'}</strong></div>
                    <div>Bab / Pokok Bahasan: <strong>{selectedExamForPrint.bab || 'Semua Pokok Bahasan'}</strong></div>
                    <div>Tingkat / Sasaran Kelas: <strong>{selectedExamForPrint.targetKelas.join(', ')}</strong></div>
                    <div>Guru Pengampu: <strong>{selectedExamForPrint.namaGuru}</strong></div>
                  </div>
                  <div className="space-y-1 text-right sm:text-left">
                    <div>Hari / Tanggal: <strong>{selectedExamForPrint.hariTanggal}</strong></div>
                    <div>Alokasi Waktu: <strong>{selectedExamForPrint.durasiMenit} Menit</strong></div>
                    <div>Bentuk Soal: <strong>{selectedExamForPrint.soalPG.length} Pilihan Ganda & {selectedExamForPrint.soalIsian.length} Isian</strong></div>
                    <div>Token Akses: <strong className="font-mono">{selectedExamForPrint.token}</strong></div>
                    <div>Karakteristik: <strong>Standar Evaluasi HOTS Berbasis Kasus</strong></div>
                  </div>
                </div>

                {/* Instructions */}
                <div className="text-[11px] text-slate-600 italic border-b border-slate-200 pb-2">
                  Petunjuk: Berilah tanda silang (X) pada huruf A, B, C, D, atau E pada lembar jawaban yang Anda anggap paling benar. Untuk soal hitungan eksak, gunakan logika klinis yang akurat.
                </div>

                {/* PART I: PILIHAN GANDA (1, 2, 3...) */}
                <div className="space-y-5">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
                    BAGIAN I: SOAL PILIHAN GANDA
                  </h3>

                  {selectedExamForPrint.soalPG.map((q, idx) => (
                    <div key={q.id} className="text-xs space-y-1.5 page-break-inside-avoid">
                      <div className="font-medium text-slate-900 flex items-start gap-1.5">
                        <span className="font-bold">{idx + 1}.</span>
                        <span className="leading-relaxed">{q.pertanyaan}</span>
                      </div>
                      <div className="pl-4 space-y-1 text-slate-800">
                        <div>A. {q.opsi.a}</div>
                        <div>B. {q.opsi.b}</div>
                        <div>C. {q.opsi.c}</div>
                        <div>D. {q.opsi.d}</div>
                        <div>E. {q.opsi.e}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* PART II: ISIAN SINGKAT */}
                {selectedExamForPrint.soalIsian.length > 0 && (
                  <div className="space-y-5 pt-6 border-t-2 border-slate-300 page-break-before">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
                      BAGIAN II: SOAL ISIAN SINGKAT
                    </h3>

                    {selectedExamForPrint.soalIsian.map((q, idx) => (
                      <div key={q.id} className="text-xs space-y-2 page-break-inside-avoid">
                        <div className="font-medium text-slate-900 flex items-start gap-1.5">
                          <span className="font-bold">{idx + 1}.</span>
                          <span className="leading-relaxed">{q.pertanyaan}</span>
                        </div>
                        <div className="pl-4 h-8 border-b border-dotted border-slate-400"></div>
                      </div>
                    ))}
                  </div>
                )}

                {/* LEMBAR KUNCI JAWABAN KHUSUS GURU (PAGE BREAK SEPARATE) */}
                <div className="pt-10 border-t-4 border-double border-slate-800 page-break-before space-y-4">
                  <div className="text-center">
                    <span className="px-3 py-1 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded">
                      LEMBAR KUNCI JAWABAN & PEDOMAN PENSKORAN (PEGANGAN GURU / PENGAWAS)
                    </span>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Paket Ujian: {selectedExamForPrint.namaUjian} • KKM: {selectedExamForPrint.passingGrade}
                    </p>
                  </div>

                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 text-xs font-mono">
                    {selectedExamForPrint.soalPG.map((q, idx) => (
                      <div key={q.id} className="p-2 border rounded bg-slate-50 text-center">
                        <span className="text-slate-500 text-[10px]">No {idx + 1}:</span>
                        <div className="font-bold text-slate-900 text-sm">{q.kunci}</div>
                      </div>
                    ))}
                  </div>

                  {selectedExamForPrint.soalIsian.length > 0 && (
                    <div className="pt-3 border-t border-slate-200">
                      <div className="font-bold text-xs text-slate-800 mb-1">Kunci Jawaban Isian:</div>
                      <div className="space-y-1 text-xs">
                        {selectedExamForPrint.soalIsian.map((q, idx) => (
                          <div key={q.id} className="flex gap-2">
                            <span className="font-bold">Isian {idx + 1}:</span>
                            <span className="text-slate-800 italic">{q.kunci}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: DAFTAR NILAI SISWA MAPEL DIAMPU */}
        {activeTab === 'nilai' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Rekapitulasi Nilai Ujian Siswa (Mapel yang Diampu)
                </h3>
                <p className="text-xs text-slate-500">
                  Data hasil pengerjaan CAT komputer dari kelas sasaran.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                Total Riwayat: {teacherResults.length} Siswa
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="py-2.5 px-3">No</th>
                    <th className="py-2.5 px-3">NISN</th>
                    <th className="py-2.5 px-3">Nama Siswa</th>
                    <th className="py-2.5 px-3">Kelas</th>
                    <th className="py-2.5 px-3 text-center">Nilai PG</th>
                    <th className="py-2.5 px-3 text-center">Nilai Isian</th>
                    <th className="py-2.5 px-3 text-center">Total Nilai</th>
                    <th className="py-2.5 px-3 text-center">Status Ketuntasan</th>
                    <th className="py-2.5 px-3">Waktu Selesai</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teacherResults.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-slate-500">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono">{row.nisn}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{row.namaSiswa}</td>
                      <td className="py-2.5 px-3 text-slate-600">{row.namaKelas}</td>
                      <td className="py-2.5 px-3 text-center font-bold">{row.nilaiPG}</td>
                      <td className="py-2.5 px-3 text-center font-bold">{row.nilaiIsian}</td>
                      <td className="py-2.5 px-3 text-center font-black text-blue-700 text-sm">{row.totalNilai}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.statusLulus ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {row.statusLulus ? 'LULUS (TUNTAS)' : 'REMEDIAL'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">{row.waktuSelesai}</td>
                    </tr>
                  ))}
                  {teacherResults.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        Belum ada siswa yang menyelesaikan ujian pada mapel ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: LEGER NILAI MATA PELAJARAN & TUJUAN PEMBELAJARAN */}
        {activeTab === 'leger' && (
          <LegerMapelView
            currentUser={currentUser}
            kelasList={kelasList}
            mapelList={mapelList}
            hasilList={hasilList}
            usersList={usersList}
            nilaiList={nilaiList}
            onSaveNilaiList={onSaveNilaiList}
            absensiList={absensiList}
            schoolInfo={schoolInfo}
            ekskulList={ekskulList}
            nilaiEkskulList={nilaiEkskulList}
            jadwalPelajaranList={jadwalPelajaranList}
            onPullAllFromCloud={onPullAllFromCloud}
          />
        )}

        {/* TAB 6: PRESENSI BARCODE HARIAN */}
        {activeTab === 'absensi' && (
          <AbsensiBarcodeView
            currentUser={currentUser}
            usersList={usersList}
            kelasList={kelasList}
            absensiList={absensiList}
            onAddAbsensi={onAddAbsensi}
            onBatchAddAbsensi={onBatchAddAbsensi}
            onUpdateAbsensi={onUpdateAbsensi}
            onDeleteAbsensi={onDeleteAbsensi}
            schoolInfo={schoolInfo}
          />
        )}

        {/* TAB 7: NILAI EKSTRAKURIKULER (HANYA PEMBINA, WALAS & ADMIN) */}
        {activeTab === 'ekskul' && canAccessEkskul && (
          <NilaiEkskulView
            currentUser={currentUser}
            ekskulList={ekskulList}
            usersList={usersList}
            kelasList={kelasList}
            nilaiEkskulList={nilaiEkskulList}
            schoolInfo={schoolInfo}
            onSaveNilaiEkskul={onSaveNilaiEkskul}
            onUpdateUser={onUpdateProfile}
          />
        )}

        {/* TAB 8: PROFIL GURU & UPLOAD FOTO */}
        {activeTab === 'profil' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">Profil & Akun Guru</h3>
                <p className="text-xs text-slate-500">Perbarui foto profil, nomor kontak, dan kata sandi akun login Anda.</p>
              </div>
              {currentUser.isWalas && (
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-emerald-600" />
                  Wali Kelas: {currentUser.walasNamaKelas || currentUser.namaKelas}
                </span>
              )}
            </div>

            {profileSavedMsg && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Profil dan kata sandi Anda berhasil disimpan!</span>
              </div>
            )}

            <form onSubmit={handleSaveGuruProfile} className="space-y-4 text-xs max-w-xl">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Foto Profil</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center text-2xl font-black text-blue-600">
                    {guruFoto ? (
                      <img src={guruFoto} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      currentUser.nama.charAt(0)
                    )}
                  </div>
                  <div className="space-y-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleGuruPhotoUpload}
                      className="text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700"
                    />
                    <p className="text-[10px] text-slate-400">Format PNG/JPG/WebP, maksimal 2MB</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Lengkap & Gelar *</label>
                <input
                  type="text"
                  required
                  value={guruNama}
                  onChange={(e) => setGuruNama(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Gelar Depan / Belakang</label>
                  <input
                    type="text"
                    value={guruGelar}
                    onChange={(e) => setGuruGelar(e.target.value)}
                    placeholder="Contoh: S.Pd. / S.Farm., Apt."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">No. WhatsApp</label>
                  <input
                    type="text"
                    value={guruTelepon}
                    onChange={(e) => setGuruTelepon(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Resmi Guru</label>
                <input
                  type="email"
                  value={guruEmail}
                  onChange={(e) => setGuruEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500"
                />
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="block font-bold text-slate-800 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-blue-600" />
                  Kata Sandi Akun Guru
                </label>
                <input
                  type="text"
                  required
                  value={guruPassword}
                  onChange={(e) => setGuruPassword(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-mono text-xs focus:border-blue-500 bg-white"
                />
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
              >
                Simpan Profil Saya
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Template Prompt AI Modal */}
      <TemplatePromptModal
        isOpen={showPromptModal}
        onClose={() => setShowPromptModal(false)}
        namaGuru={currentUser.nama}
        namaMapel={mapelList.find(m => m.id === formMapelId)?.namaMapel || teacherMapel[0]?.namaMapel || 'Mata Pelajaran'}
        lingkupMateri={formLingkupMateri}
        bab={formBab}
        targetKelas={formTargetKelas}
        jenisUjian={formJenisUjian}
        durasi={formDurasi}
        token={formToken}
        onApplySampleAiken={(sampleText) => {
          setRawAikenText(sampleText);
          setParseNotice({
            type: 'success',
            message: 'Contoh naskah soal Aiken berhasil dimasukkan! Silakan klik "Periksa & Ekstrak Format Aiken" di bawah.'
          });
        }}
      />

      {/* Edit Ujian & Soal Modal */}
      {selectedExamForEdit && (
        <EditUjianModal
          ujian={selectedExamForEdit}
          currentUser={currentUser}
          kelasList={kelasList}
          mapelList={mapelList}
          onSave={(updated) => {
            onSaveUjian(updated);
            setSelectedExamForEdit(null);
            setSaveNotice(`Paket ujian "${updated.namaUjian}" berhasil diperbarui!`);
            setTimeout(() => setSaveNotice(null), 5000);
          }}
          onClose={() => setSelectedExamForEdit(null)}
        />
      )}

      {/* Upload Soal Berkas Word / PDF / Teks Modal */}
      <UploadSoalModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onImportQuestions={handleImportFromUploadModal}
      />
    </div>
  );
};
