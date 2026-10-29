import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PaketUjian, User, HasilUjian, SchoolInfo, Kelas, Mapel, SoalPG, SoalIsian } from '../types';
import { TemplatePromptModal } from './TemplatePromptModal';
import { getMatchingClassesForMapel } from '../utils/academicHelpers';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  FileText, 
  FileCheck,
  CheckCircle2, 
  Clock, 
  Key, 
  Users, 
  Sparkles, 
  Search, 
  Download, 
  Award, 
  ShieldCheck, 
  AlertCircle,
  HelpCircle,
  BarChart3,
  Layers,
  Check,
  Edit3,
  RefreshCw,
  Upload
} from 'lucide-react';
import { EditUjianModal } from './EditUjianModal';
import { UploadSoalModal } from './UploadSoalModal';
import { requestAIGenerateQuestions } from '../services/aiService';
import { extractTextFromFile, parseExamQuestionsFromText } from '../utils/fileExamParser';

interface CATCreatorViewProps {
  currentUser: User;
  ujianList: PaketUjian[];
  kelasList: Kelas[];
  mapelList: Mapel[];
  hasilList: HasilUjian[];
  onSaveUjian: (ujian: PaketUjian) => void;
  onDeleteUjian: (id: string) => void;
  schoolInfo?: SchoolInfo;
}

export const CATCreatorView: React.FC<CATCreatorViewProps> = ({
  currentUser,
  ujianList,
  kelasList,
  mapelList,
  hasilList,
  onSaveUjian,
  onDeleteUjian,
  schoolInfo,
}) => {
  const [activeTab, setActiveTab] = useState<'daftar' | 'buat' | 'hasil'>('daftar');
  const [selectedExamForEdit, setSelectedExamForEdit] = useState<PaketUjian | null>(null);

  // Filter exams based on role (Guru sees exams they made or their subjects, Admin sees all)
  const accessibleExams = currentUser.role === 'admin' 
    ? ujianList 
    : ujianList.filter(u => u.idGuru === currentUser.id || currentUser.mapelDiampu?.includes(u.idMapel));

  // Helper to identify teacher's subject
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
    const nameLower = (currentUser.nama + ' ' + (currentUser.username || '')).toLowerCase();
    if ((nameLower.includes('pika') || nameLower.includes('penjas') || nameLower.includes('pjok')) && m.namaMapel.toLowerCase().includes('jasmani')) {
      return true;
    }
    if (currentUser.jurusan && currentUser.jurusan !== 'Umum') {
      if (m.jurusan.toLowerCase().includes(currentUser.jurusan.toLowerCase())) {
        return true;
      }
    }
    return false;
  };

  const teacherMapel = useMemo(() => {
    if (currentUser.role === 'admin') return mapelList;
    const filtered = mapelList.filter(isTeacherMapel);
    return filtered.length > 0 ? filtered : mapelList;
  }, [currentUser, mapelList]);

  // Form State for creating exam
  const [formJudul, setFormJudul] = useState('');
  const [formJenis, setFormJenis] = useState<'UJIAN_AKHIR' | 'UJIAN_TENGAH_SEMESTER'>('UJIAN_AKHIR');
  const [formMapelId, setFormMapelId] = useState<string>(() => {
    return teacherMapel[0]?.id || mapelList[0]?.id || 'm-f1';
  });
  const [formTargetKelas, setFormTargetKelas] = useState<string[]>([]);
  const [formDurasi, setFormDurasi] = useState(90);
  const [formToken, setFormToken] = useState(Math.random().toString(36).substring(2, 8).toUpperCase());
  const [aikenText, setAikenText] = useState('');
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [soalList, setSoalList] = useState<SoalPG[]>([]);
  const [soalIsianList, setSoalIsianList] = useState<SoalIsian[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiCountPG, setAiCountPG] = useState(30);

  // New streamlined method state
  const [questionInputMethod, setQuestionInputMethod] = useState<'upload' | 'ai' | 'manual'>('upload');
  const [inlineFileProcessing, setInlineFileProcessing] = useState(false);
  const [inlineProcessingStatus, setInlineProcessingStatus] = useState('');
  const inlineFileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadWordTemplate = () => {
    const docContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Template Naskah Soal Ujian SMK Bakti Putra Mandiri</title>
<style>
body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.4; margin: 2cm; }
h3 { text-align: center; margin: 0; }
.header { border-bottom: 2px solid black; padding-bottom: 8px; margin-bottom: 16px; text-align: center; }
.section-title { font-weight: bold; margin-top: 14pt; margin-bottom: 6pt; }
p { margin: 4pt 0; }
</style>
</head>
<body>
<div class="header">
<h3>SMK BAKTI PUTRA MANDIRI</h3>
<p>PENILAIAN SUMATIF AKHIR SEMESTER (PAS) TAHUN AJARAN 2026/2027</p>
<p>Mata Pelajaran: ${selectedMapelObj?.namaMapel || 'Kompetensi Kejuruan'} | Alokasi Waktu: ${formDurasi} Menit</p>
</div>

<div class="section-title">A. SOAL PILIHAN GANDA</div>

<p>1. Seorang pasien anak usia 5 tahun dengan berat badan 20 kg memerlukan resep amoksisilin 40 mg/kgBB/hari terbagi dalam 3 dosis. Jika sediaan yang tersedia adalah sirup kering 250 mg/5 mL, berapa mL sirup yang harus diminum pasien per satu kali pemberian?</p>
<p>A. 2,3 mL</p>
<p>B. 3,5 mL</p>
<p>C. 5,3 mL</p>
<p>D. 7,0 mL</p>
<p>E. 10,6 mL</p>
<p>Kunci: C</p>
<p>Pembahasan: Dosis harian = 40 mg x 20 kg = 800 mg. Dosis sekali = 800 / 3 = 266,7 mg. Volume = (266,7 / 250) x 5 mL = 5,3 mL.</p>

<p>2. Resep dokter spesialis kulit tertulis: "R/ Acid Salicyl 2%, Sulfur Praecip 4%, Vaselin ad 50 gram". Berapa bobot Vaselin yang harus ditimbang oleh asisten farmasi?</p>
<p>A. 2 gram</p>
<p>B. 4 gram</p>
<p>C. 44 gram</p>
<p>D. 47 gram</p>
<p>E. 50 gram</p>
<p>Kunci: C</p>
<p>Pembahasan: Pengurangan bobot total sediaan dengan zat aktif.</p>

<p>3. Standar posisi tidur semi-fowler untuk pasien yang mengalami sesak napas di ruang rawat inap adalah kemiringan...</p>
<p>A. 15 - 30 derajat</p>
<p>B. 30 - 45 derajat</p>
<p>C. 60 - 90 derajat</p>
<p>D. 90 - 120 derajat</p>
<p>E. 0 derajat terlentang</p>
<p>Kunci: B</p>
<p>Pembahasan: Posisi semi-fowler menggunakan sudut 30 - 45 derajat untuk memaksimalkan ekspansi paru.</p>

<div class="section-title">B. SOAL ISIAN SINGKAT</div>

<p>1. Singkatan latin "s.d.d" pada etiket aturan pakai resep dokter memiliki arti...</p>
<p>Kunci: Sehari dua kali (semel de die)</p>

<p>2. Tiga jenis pemeriksaan tanda-tanda vital (TTV) primer pada pasien adalah...</p>
<p>Kunci: Tekanan darah, denyut nadi, dan suhu tubuh</p>
</body>
</html>`;

    const blob = new Blob(['\ufeff' + docContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Template_Soal_SMK_Bakti_Putra_Mandiri.doc';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleProcessInlineFile = async (selectedFile: File) => {
    setInlineFileProcessing(true);
    setInlineProcessingStatus(`Membaca dokumen ${selectedFile.name}...`);
    try {
      const { text } = await extractTextFromFile(selectedFile);
      if (!text || !text.trim()) {
        throw new Error('Dokumen kosong atau tidak memiliki teks yang terbaca.');
      }
      setInlineProcessingStatus('Memetakan butir soal, opsi A-E, dan kunci jawaban...');
      const parsed = parseExamQuestionsFromText(text);
      if (parsed.soalPG.length === 0 && parsed.soalIsian.length === 0) {
        throw new Error('Tidak ditemukan butir soal yang valid. Pastikan format dokumen memuat nomor soal (misal: "1. ") dan opsi (misal: "A. ").');
      }
      handleImportFromDoc(parsed.soalPG, parsed.soalIsian, parsed.detectedTitle);
    } catch (err: any) {
      alert(err?.message || 'Gagal memproses berkas soal.');
    } finally {
      setInlineFileProcessing(false);
      setInlineProcessingStatus('');
    }
  };

  const handleImportFromDoc = (importedPG: SoalPG[], importedIsian: SoalIsian[], detectedTitle?: string) => {
    if (importedPG.length > 0) {
      setSoalList(prev => [...prev, ...importedPG.map((s, idx) => ({ ...s, nomor: prev.length + idx + 1 }))]);
    }
    if (importedIsian.length > 0) {
      setSoalIsianList(prev => [...prev, ...importedIsian.map((s, idx) => ({ ...s, nomor: prev.length + idx + 1 }))]);
    }
    if (detectedTitle && !formJudul.trim()) {
      setFormJudul(detectedTitle);
    } else if (!formJudul.trim() && selectedMapelObj?.namaMapel) {
      setFormJudul(`Ujian Sekolah - ${selectedMapelObj.namaMapel}`);
    }
    // Automatically switch to the exam creation form so teacher sees their imported questions immediately!
    setActiveTab('buat');
    setNotification(`🎉 Berhasil memuat ${importedPG.length} Soal PG ${importedIsian.length > 0 ? `dan ${importedIsian.length} Soal Isian` : ''} dari dokumen berkas Anda! Silakan tinjau naskah soal di bawah lalu klik "Simpan & Terbitkan Paket Ujian".`);
    setTimeout(() => setNotification(null), 8000);
  };

  const handleGenerateAikenAI = async () => {
    setIsGeneratingAI(true);
    setNotification('Gemini AI sedang menyusun naskah soal HOTS berstandar kurikulum...');

    try {
      const res = await requestAIGenerateQuestions({
        namaGuru: currentUser.nama,
        namaMapel: selectedMapelObj?.namaMapel || 'Mata Pelajaran',
        lingkupMateri: formJudul || selectedMapelObj?.namaMapel || 'Kompetensi Kejuruan',
        bab: 'Kompetensi Inti & Terapan',
        targetKelas: formTargetKelas.length > 0 ? formTargetKelas : matchingClassesForExam.map(k => k.namaKelas),
        jenisUjian: formJenis,
        token: formToken,
        waktuUjian: `${formDurasi} Menit`,
        jumlahPG: aiCountPG,
        jumlahIsian: 5,
      });

      if (!res.success || !res.text) {
        alert(res.error || 'Gagal menghasilkan soal dari AI.');
        return;
      }

      setAikenText(res.text);
      setNotification(`✨ Soal berhasil digenerate oleh Gemini AI (${res.modelUsed})! Teks Aiken telah diisi. Silakan klik "Proses Teks Aiken" untuk memuat.`);
    } catch (err: any) {
      alert(err?.message || 'Terjadi kesalahan saat menghubungi server AI.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Selected mapel object
  const selectedMapelObj = useMemo(() => {
    return mapelList.find(m => m.id === formMapelId) || teacherMapel[0] || mapelList[0];
  }, [mapelList, formMapelId, teacherMapel]);

  // Target classes dynamically matching the selected subject
  const matchingClassesForExam = useMemo(() => {
    return getMatchingClassesForMapel(selectedMapelObj, kelasList);
  }, [selectedMapelObj, kelasList]);

  // Synchronize formMapelId whenever teacherMapel changes
  useEffect(() => {
    if (teacherMapel.length > 0) {
      const exists = mapelList.some(m => m.id === formMapelId);
      if (!exists || (currentUser.role === 'guru' && !teacherMapel.some(m => m.id === formMapelId))) {
        setFormMapelId(teacherMapel[0].id);
      }
    }
  }, [currentUser, teacherMapel, formMapelId]);

  // Auto-initialize formTargetKelas to match the subject when switching mapel if empty
  useEffect(() => {
    if (formTargetKelas.length === 0 && matchingClassesForExam.length > 0) {
      setFormTargetKelas(matchingClassesForExam.map(k => k.namaKelas));
    }
  }, [matchingClassesForExam]);

  // Single question builder
  const [currentPertanyaan, setCurrentPertanyaan] = useState('');
  const [currentOpsiA, setCurrentOpsiA] = useState('');
  const [currentOpsiB, setCurrentOpsiB] = useState('');
  const [currentOpsiC, setCurrentOpsiC] = useState('');
  const [currentOpsiD, setCurrentOpsiD] = useState('');
  const [currentOpsiE, setCurrentOpsiE] = useState('');
  const [currentKunci, setCurrentKunci] = useState<'A' | 'B' | 'C' | 'D' | 'E'>('A');
  const [currentPembahasan, setCurrentPembahasan] = useState('');

  // Results search & filter
  const [searchHasilQuery, setSearchHasilQuery] = useState('');
  const [filterHasilKelas, setFilterHasilKelas] = useState('Semua');

  // Toggle class selection for target
  const handleToggleKelas = (namaKelas: string) => {
    if (formTargetKelas.includes(namaKelas)) {
      setFormTargetKelas(formTargetKelas.filter(k => k !== namaKelas));
    } else {
      setFormTargetKelas([...formTargetKelas, namaKelas]);
    }
  };

  // Add individual question to draft
  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPertanyaan.trim() || !currentOpsiA.trim() || !currentOpsiB.trim()) {
      alert('Pertanyaan dan minimal opsi A dan B wajib diisi!');
      return;
    }

    const newSoal: SoalPG = {
      id: `soal-${Date.now()}-${soalList.length + 1}`,
      nomor: soalList.length + 1,
      pertanyaan: currentPertanyaan.trim(),
      opsi: {
        a: currentOpsiA.trim(),
        b: currentOpsiB.trim(),
        c: currentOpsiC.trim() || '-',
        d: currentOpsiD.trim() || '-',
        e: currentOpsiE.trim() || '-',
      },
      kunci: currentKunci,
      pembahasan: currentPembahasan.trim(),
    };

    setSoalList([...soalList, newSoal]);
    // Reset question builder
    setCurrentPertanyaan('');
    setCurrentOpsiA('');
    setCurrentOpsiB('');
    setCurrentOpsiC('');
    setCurrentOpsiD('');
    setCurrentOpsiE('');
    setCurrentPembahasan('');
  };

  // Parse Aiken Format
  const handleParseAiken = () => {
    if (!aikenText.trim()) return;

    try {
      const blocks = aikenText.split(/\n\s*\n/);
      const parsed: SoalPG[] = [];

      blocks.forEach((block, idx) => {
        const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length >= 3) {
          const questionText = lines[0];
          let opsiA = '', opsiB = '', opsiC = '', opsiD = '', opsiE = '';
          let kunci: 'A' | 'B' | 'C' | 'D' | 'E' = 'A';

          lines.slice(1).forEach(line => {
            if (line.startsWith('A.') || line.startsWith('A)')) opsiA = line.substring(2).trim();
            else if (line.startsWith('B.') || line.startsWith('B)')) opsiB = line.substring(2).trim();
            else if (line.startsWith('C.') || line.startsWith('C)')) opsiC = line.substring(2).trim();
            else if (line.startsWith('D.') || line.startsWith('D)')) opsiD = line.substring(2).trim();
            else if (line.startsWith('E.') || line.startsWith('E)')) opsiE = line.substring(2).trim();
            else if (line.toUpperCase().startsWith('ANSWER:')) {
              const ans = line.split(':')[1]?.trim()?.toUpperCase();
              if (['A', 'B', 'C', 'D', 'E'].includes(ans)) {
                kunci = ans as any;
              }
            }
          });

          if (questionText && opsiA && opsiB) {
            parsed.push({
              id: `aiken-${Date.now()}-${idx + 1}`,
              nomor: soalList.length + parsed.length + 1,
              pertanyaan: questionText,
              opsi: {
                a: opsiA,
                b: opsiB,
                c: opsiC || '-',
                d: opsiD || '-',
                e: opsiE || '-',
              },
              kunci,
              pembahasan: 'Diimpor via Aiken Format',
            });
          }
        }
      });

      if (parsed.length > 0) {
        setSoalList([...soalList, ...parsed]);
        setAikenText('');
        alert(`Berhasil mengimpor ${parsed.length} butir soal dari format Aiken!`);
      } else {
        alert('Format Aiken tidak terbaca. Pastikan format: Pertanyaan, A. ..., B. ..., ANSWER: A');
      }
    } catch (e) {
      alert('Gagal memproses teks Aiken.');
    }
  };

  // Save new exam package
  const handleSaveExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formJudul.trim()) {
      alert('Judul ujian wajib diisi!');
      return;
    }

    const selectedMapel = mapelList.find(m => m.id === formMapelId) || mapelList[0];

    const newExam: PaketUjian = {
      id: `ujian-${Date.now()}`,
      namaUjian: formJudul,
      judul: formJudul,
      jenisUjian: formJenis,
      idGuru: currentUser.id,
      namaGuru: currentUser.nama,
      idMapel: selectedMapel.id,
      kodeMapel: selectedMapel.kode,
      namaMapel: selectedMapel.namaMapel,
      targetKelas: formTargetKelas.length > 0 ? formTargetKelas : matchingClassesForExam.map(k => k.namaKelas),
      hariTanggal: new Date().toISOString().split('T')[0],
      jamMulai: '08:00',
      durasiMenit: Number(formDurasi) || 90,
      token: formToken.toUpperCase(),
      tokenUjian: formToken.toUpperCase(),
      statusDokumen: 'READY',
      soalPG: soalList.length > 0 ? soalList : [
        {
          id: `soal-${Date.now()}-1`,
          nomor: 1,
          pertanyaan: `Contoh soal materi pokok ${selectedMapel.namaMapel}: Jelaskan indikasi dan kaidah penggunaan yang tepat?`,
          opsi: {
            a: 'Digunakan sesuai dengan resep dan dosis yang dianjurkan',
            b: 'Digunakan secara bebas tanpa petunjuk',
            c: 'Disimpan di tempat terbuka yang terkena matahari langsung',
            d: 'Dilarang berkonsultasi dengan apoteker/tenaga medis',
            e: 'Hanya boleh diminum saat malam hari',
          },
          kunci: 'A',
          pembahasan: 'Penggunaan sediaan harus tepat indikasi, tepat dosis, dan tepat pasien.',
        }
      ],
      soalIsian: soalIsianList,
      passingGrade: 75,
      createdAt: new Date().toISOString(),
    };

    onSaveUjian(newExam);
    setNotification(`Paket Ujian "${newExam.namaUjian}" berhasil dibuat dan siap diujikan kepada siswa dengan Token: ${newExam.tokenUjian}!`);
    setTimeout(() => setNotification(null), 5000);
    
    // Reset form
    setFormJudul('');
    setSoalList([]);
    setSoalIsianList([]);
    setFormToken(Math.random().toString(36).substring(2, 8).toUpperCase());
    setActiveTab('daftar');
  };

  const filteredHasil = hasilList.filter(h => {
    const matchClass = filterHasilKelas === 'Semua' || h.namaKelas === filterHasilKelas;
    const matchSearch = !searchHasilQuery || 
      h.namaSiswa.toLowerCase().includes(searchHasilQuery.toLowerCase()) ||
      h.nisn.toLowerCase().includes(searchHasilQuery.toLowerCase());
    return matchClass && matchSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner - Clarifying Creator vs Examinee */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span>Mode Pembuat Soal & Pengawas CAT ({currentUser.role.toUpperCase()})</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Pusat Pembuatan & Manajemen Bank Soal CAT
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Sebagai tenaga pendidik dan pengelola sistem ({currentUser.nama}), Anda bertindak sebagai <strong>Pembuat Naskah Soal & Pengawas Ujian</strong>. Peserta didik akan mengerjakan ujian dengan token yang Anda tentukan di bawah ini.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm shadow-lg hover:shadow-xl transition-all flex items-center gap-2 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload File Soal (Word / PDF)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('buat');
              setFormToken(Math.random().toString(36).substring(2, 8).toUpperCase());
            }}
            className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm border border-slate-700 shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Paket Manual</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-semibold flex items-center gap-3 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{accessibleExams.length}</div>
            <div className="text-xs text-slate-500 font-medium">Paket Ujian Aktif</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {accessibleExams.reduce((sum, u) => sum + (u.soalPG?.length || 0) + (u.soalIsian?.length || 0), 0)}
            </div>
            <div className="text-xs text-slate-500 font-medium">Total Butir Soal Terbit</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{hasilList.length}</div>
            <div className="text-xs text-slate-500 font-medium">Hasil Pengerjaan Siswa</div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-sm flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('daftar')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'daftar'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Daftar & Bank Soal Ujian ({accessibleExams.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('buat')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'buat'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Buat Paket Ujian Baru</span>
        </button>

        <button
          onClick={() => setActiveTab('hasil')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'hasil'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Monitoring Hasil Nilai Siswa ({hasilList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setShowUploadModal(true)}
          className="ml-auto px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all whitespace-nowrap bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          <span>Upload File Soal (Word / PDF)</span>
        </button>
      </div>

      {/* TAB 1: DAFTAR PAKET UJIAN */}
      {activeTab === 'daftar' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
          {/* Quick Action Banner for Uploading Questions */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 rounded-2xl p-5 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold">
                <FileText className="w-3.5 h-3.5 text-emerald-200" />
                <span>Fitur Cepat & Praktis Dewan Guru</span>
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
              className="px-4 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>Upload File Soal Sekarang</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Bank Paket Ujian CBT Sekolah</h2>
              <p className="text-xs text-slate-500">
                Kelola naskah soal, jadwal durasi pengerjaan, dan token rahasia untuk peserta ujian
              </p>
            </div>
            <button
              onClick={() => setActiveTab('buat')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Paket Ujian</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {accessibleExams.map(ujian => {
              const soalCount = (ujian.soalPG?.length || 0) + (ujian.soalIsian?.length || 0);
              return (
                <div
                  key={ujian.id}
                  className="bg-slate-50 hover:bg-white rounded-2xl p-5 border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                        {ujian.jenisUjian === 'UJIAN_TENGAH_SEMESTER' ? 'PTS (Tengah Semester)' : 'PAS (Akhir Semester)'}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold">
                        Token: {ujian.tokenUjian}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      {ujian.namaUjian || ujian.judul}
                    </h3>
                    <p className="text-xs font-medium text-emerald-700">
                      {ujian.namaMapel || ujian.kodeMapel}
                    </p>

                    <div className="text-[11px] text-slate-500 space-y-1 pt-1">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Durasi: {ujian.durasiMenit} Menit</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        <span>{soalCount} Soal ({ujian.soalPG?.length || 0} PG, {ujian.soalIsian?.length || 0} Isian)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>Target: {ujian.targetKelas?.join(', ') || 'Semua Kelas'}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Guru Pengampu: {ujian.namaGuru}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setSelectedExamForEdit(ujian)}
                      className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1 border border-indigo-200 shadow-2xs"
                      title="Edit Jadwal & Butir Soal"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Soal & Jadwal</span>
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`Yakin ingin menghapus paket ujian "${ujian.namaUjian}"?`)) {
                          onDeleteUjian(ujian.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Hapus Paket Ujian"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}

            {accessibleExams.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <BookOpen className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-sm text-slate-600">Belum ada paket ujian yang dibuat</p>
                <p className="text-xs text-slate-400 mt-1">Klik "Buat Paket Ujian Baru" untuk mulai menyusun naskah soal.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: BUAT PAKET UJIAN BARU */}
      {activeTab === 'buat' && (
        <div className="space-y-6">
          <form onSubmit={handleSaveExam} className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">Formulir Penyusunan Paket Ujian Baru</h2>
              <p className="text-xs text-slate-500">
                Lengkapi identitas naskah ujian, alokasi waktu, token akses, dan butir soal di bawah ini
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">
                  Nama / Judul Paket Ujian <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formJudul}
                  onChange={(e) => setFormJudul(e.target.value)}
                  placeholder="Contoh: Asesmen Sumatif Akhir Semester Ganjil - Farmakologi"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Mata Pelajaran <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formMapelId}
                  onChange={(e) => setFormMapelId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium focus:outline-none focus:border-emerald-500 bg-white"
                >
                  {currentUser.role === 'guru' && teacherMapel.length > 0 && (
                    <optgroup label="Mata Pelajaran yang Anda Ampu">
                      {teacherMapel.map(m => (
                        <option key={`my-${m.id}`} value={m.id}>★ {m.namaMapel} ({m.kode})</option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label={currentUser.role === 'guru' ? 'Mata Pelajaran Lainnya' : 'Semua Mata Pelajaran'}>
                    {mapelList.map(m => (
                      <option key={m.id} value={m.id}>{m.namaMapel} ({m.kode})</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Jenis Asesmen
                </label>
                <select
                  value={formJenis}
                  onChange={(e) => setFormJenis(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium focus:outline-none focus:border-emerald-500 bg-white"
                >
                  <option value="UJIAN_AKHIR">PAS / Penilaian Akhir Semester</option>
                  <option value="UJIAN_TENGAH_SEMESTER">PTS / Penilaian Tengah Semester</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Durasi Pengerjaan (Menit)
                </label>
                <input
                  type="number"
                  value={formDurasi}
                  onChange={(e) => setFormDurasi(Number(e.target.value))}
                  min={10}
                  max={240}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Token Rahasia Ujian
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formToken}
                    onChange={(e) => setFormToken(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono font-bold text-emerald-700 uppercase focus:outline-none focus:border-emerald-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setFormToken(Math.random().toString(36).substring(2, 8).toUpperCase())}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-bold text-xs"
                    title="Buat Token Acak Baru"
                  >
                    Acak
                  </button>
                </div>
              </div>
            </div>

            {/* Target Kelas Selection */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700 flex items-center gap-2">
                  <span>Pilih Target Rombel / Kelas yang Mengikuti Ujian:</span>
                  <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {matchingClassesForExam.length} Rombel Terkait {selectedMapelObj?.namaMapel}
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFormTargetKelas(matchingClassesForExam.map(k => k.namaKelas))}
                    className="text-[11px] text-emerald-600 hover:text-emerald-800 font-bold hover:underline"
                  >
                    Pilih Semua ({matchingClassesForExam.length})
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={() => setFormTargetKelas([])}
                    className="text-[11px] text-slate-500 hover:text-slate-700 font-medium hover:underline"
                  >
                    Kosongkan
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                {matchingClassesForExam.map(k => {
                  const isSelected = formTargetKelas.includes(k.namaKelas);
                  return (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => handleToggleKelas(k.namaKelas)}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all border flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{k.namaKelas}</span>
                      <span className={`text-[10px] ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                        ({k.jurusan})
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400">
                *Sasaran rombel otomatis disesuaikan secara cerdas dengan cakupan mata pelajaran {selectedMapelObj?.namaMapel}.
              </p>
            </div>

            {/* OPSI 1: UNGGAH FILE SOAL WORD / PDF (CARA PALING MUDAH & CEPAT) */}
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-300 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold uppercase tracking-wide shadow-2xs">
                      Paling Mudah & Praktis
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Upload className="w-4 h-4 text-emerald-600" />
                      <span>Unggah Naskah Soal dari File Word (.docx) atau PDF (.pdf)</span>
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                    Bapak/Ibu Guru tidak perlu mengetik butir soal satu per satu. Cukup pilih berkas naskah soal yang sudah ada di komputer/laptop (baik berformat Microsoft Word, PDF, atau Teks), sistem akan secara otomatis membaca nomor soal, opsi jawaban A-E, dan kunci jawaban!
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(true)}
                    className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Unggah File Soal (Word / PDF)</span>
                  </button>
                </div>
              </div>

              {soalList.length > 0 && (
                <div className="p-3 bg-white/80 rounded-xl border border-emerald-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-emerald-800">
                    ✓ Sudah terisi {soalList.length} Soal PG {soalIsianList.length > 0 ? `dan ${soalIsianList.length} Soal Isian` : ''} dalam draft paket ujian ini.
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(true)}
                    className="text-emerald-700 hover:text-emerald-900 font-bold hover:underline cursor-pointer"
                  >
                    + Tambah Lagi Dari Berkas Lain
                  </button>
                </div>
              )}
            </div>

            {/* AIKEN Fast Import Section & Gemini AI Integration */}
            <div className="p-5 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    Cara 2: Input Soal Format Aiken (Moodle / AI)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPromptModal(true)}
                    className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-[11px] font-bold flex items-center gap-1 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Template Prompt AI</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Word/PDF</span>
                  </button>
                  <select
                    value={aiCountPG}
                    onChange={(e) => setAiCountPG(Number(e.target.value))}
                    disabled={isGeneratingAI}
                    className="px-2.5 py-1 rounded-lg bg-white border border-indigo-200 text-xs font-semibold text-slate-700 focus:outline-none"
                  >
                    <option value={30}>30 Soal PG</option>
                    <option value={40}>40 Soal PG</option>
                    <option value={20}>20 Soal PG</option>
                    <option value={10}>10 Soal PG</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleGenerateAikenAI}
                    disabled={isGeneratingAI}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-extrabold shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                    <span>{isGeneratingAI ? 'Menyusun Soal...' : '✨ Buat Soal via Gemini AI'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleParseAiken}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs flex items-center gap-1"
                  >
                    <span>Proses Teks Aiken</span>
                  </button>
                </div>
              </div>

              <textarea
                value={aikenText}
                onChange={(e) => setAikenText(e.target.value)}
                placeholder={`Contoh Format Aiken:\n\nApa fungsi utama dari resep dokter?\nA. Catatan keuangan pasien\nB. Instruksi tertulis dari dokter kepada apoteker\nC. Surat izin masuk rumah sakit\nD. Dokumen garansi obat\nE. Kartu asuransi kesehatan\nANSWER: B`}
                rows={4}
                className="w-full p-3 rounded-xl border border-indigo-200 text-xs font-mono bg-white text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Individual Question Builder */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-emerald-600" />
                  Tambah Butir Soal Pilihan Ganda Secara Manual (Soal #{soalList.length + 1})
                </span>
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambahkan Soal Ini</span>
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Pertanyaan:</label>
                  <textarea
                    value={currentPertanyaan}
                    onChange={(e) => setCurrentPertanyaan(e.target.value)}
                    placeholder="Tuliskan naskah pertanyaan atau studi kasus di sini..."
                    rows={2}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-white font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Opsi A:</label>
                    <input
                      type="text"
                      value={currentOpsiA}
                      onChange={(e) => setCurrentOpsiA(e.target.value)}
                      placeholder="Teks pilihan A..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Opsi B:</label>
                    <input
                      type="text"
                      value={currentOpsiB}
                      onChange={(e) => setCurrentOpsiB(e.target.value)}
                      placeholder="Teks pilihan B..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Opsi C:</label>
                    <input
                      type="text"
                      value={currentOpsiC}
                      onChange={(e) => setCurrentOpsiC(e.target.value)}
                      placeholder="Teks pilihan C..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Opsi D:</label>
                    <input
                      type="text"
                      value={currentOpsiD}
                      onChange={(e) => setCurrentOpsiD(e.target.value)}
                      placeholder="Teks pilihan D..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Opsi E:</label>
                    <input
                      type="text"
                      value={currentOpsiE}
                      onChange={(e) => setCurrentOpsiE(e.target.value)}
                      placeholder="Teks pilihan E..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Kunci Jawaban Benar:</label>
                    <select
                      value={currentKunci}
                      onChange={(e) => setCurrentKunci(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-emerald-700 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="A">Kunci: A</option>
                      <option value="B">Kunci: B</option>
                      <option value="C">Kunci: C</option>
                      <option value="D">Kunci: D</option>
                      <option value="E">Kunci: E</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Pembahasan / Catatan (Opsional):</label>
                    <input
                      type="text"
                      value={currentPembahasan}
                      onChange={(e) => setCurrentPembahasan(e.target.value)}
                      placeholder="Penjelasan ringkas jawaban..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* List of currently created questions */}
            {soalList.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Daftar Soal yang Disusun ({soalList.length} Butir Soal):
                  </span>
                  <button
                    type="button"
                    onClick={() => setSoalList([])}
                    className="text-xs text-rose-600 hover:underline font-semibold"
                  >
                    Kosongkan Semua Soal
                  </button>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {soalList.map((s, idx) => (
                    <div key={s.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span className="font-bold text-slate-900">
                          {idx + 1}. {s.pertanyaan}
                        </span>
                        <div className="text-[11px] text-slate-500">
                          Kunci: <strong className="text-emerald-700">{s.kunci}</strong> • Opsi: A ({s.opsi.a}), B ({s.opsi.b})
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSoalList(soalList.filter((_, i) => i !== idx))}
                        className="text-rose-500 hover:text-rose-700 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveTab('daftar')}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Simpan & Terbitkan Paket Ujian</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: MONITORING HASIL NILAI SISWA */}
      {activeTab === 'hasil' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Rekap Nilai Siswa Hasil CBT Online</h2>
              <p className="text-xs text-slate-500">
                Data real-time siswa yang telah menyelesaikan paket ujian CAT CBT
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchHasilQuery}
                  onChange={(e) => setSearchHasilQuery(e.target.value)}
                  placeholder="Cari siswa / NISN..."
                  className="pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <select
                value={filterHasilKelas}
                onChange={(e) => setFilterHasilKelas(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium bg-white"
              >
                <option value="Semua">Semua Rombel</option>
                {kelasList.map(k => (
                  <option key={k.id} value={k.namaKelas}>{k.namaKelas}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="py-3 px-4 w-10 text-center">No</th>
                  <th className="py-3 px-4">Nama Siswa</th>
                  <th className="py-3 px-3">NISN</th>
                  <th className="py-3 px-4">Kelas / Rombel</th>
                  <th className="py-3 px-4">Mata Pelajaran</th>
                  <th className="py-3 px-3 text-center">Nilai PG</th>
                  <th className="py-3 px-3 text-center">Nilai Isian</th>
                  <th className="py-3 px-3 text-center font-bold text-slate-900 bg-slate-100">Total Skor</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4">Waktu Selesai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredHasil.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{item.namaSiswa}</td>
                    <td className="py-3 px-3 font-mono text-slate-600">{item.nisn}</td>
                    <td className="py-3 px-4 text-slate-700">{item.namaKelas}</td>
                    <td className="py-3 px-4 text-slate-700">{item.namaMapel || '-'}</td>
                    <td className="py-3 px-3 text-center font-bold text-blue-700">{item.nilaiPG}</td>
                    <td className="py-3 px-3 text-center font-bold text-purple-700">{item.nilaiIsian}</td>
                    <td className="py-3 px-3 text-center font-black text-sm bg-slate-50 text-emerald-700">
                      {item.totalNilai}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.statusLulus 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {item.statusLulus ? 'LULUS' : 'REMIDIAL'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">{item.waktuSelesai}</td>
                  </tr>
                ))}

                {filteredHasil.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-slate-400">
                      Belum ada catatan hasil ujian siswa yang terekam.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Template Prompt AI Modal */}
      <TemplatePromptModal
        isOpen={showPromptModal}
        onClose={() => setShowPromptModal(false)}
        namaGuru={currentUser.nama}
        namaMapel={mapelList.find(m => m.id === formMapelId)?.namaMapel || teacherMapel[0]?.namaMapel || 'Mata Pelajaran'}
        lingkupMateri={formJudul}
        targetKelas={formTargetKelas}
        jenisUjian={formJenis}
        durasi={formDurasi}
        token={formToken}
        onApplySampleAiken={(sampleText) => {
          setAikenText(sampleText);
          setNotification('Contoh soal standar Aiken berhasil dimasukkan! Silakan klik "Proses Teks Aiken".');
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
            setNotification(`Paket Ujian "${updated.namaUjian}" berhasil diperbarui!`);
            setTimeout(() => setNotification(null), 5000);
          }}
          onClose={() => setSelectedExamForEdit(null)}
        />
      )}

      {/* Upload Soal Berkas Word / PDF / Teks Modal */}
      <UploadSoalModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onImportQuestions={handleImportFromDoc}
        currentPGCount={soalList.length}
        currentIsianCount={soalIsianList.length}
      />
    </div>
  );
};
