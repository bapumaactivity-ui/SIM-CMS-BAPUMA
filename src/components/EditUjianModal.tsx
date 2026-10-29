import React, { useState, useMemo, useEffect } from 'react';
import { PaketUjian, User, Kelas, Mapel, SoalPG, SoalIsian } from '../types';
import { getMatchingClassesForMapel, canUserEditExam, isUserAdmin } from '../utils/academicHelpers';
import { parseAikenUjian, exportToAikenText } from '../utils/parserAiken';
import { requestAIGenerateQuestions } from '../services/aiService';
import { UploadSoalModal } from './UploadSoalModal';
import { 
  X, 
  Save, 
  Calendar, 
  Clock, 
  Key, 
  BookOpen, 
  Layers, 
  Edit3, 
  Trash2, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  FileText, 
  Users, 
  Check, 
  ShieldCheck,
  HelpCircle,
  Sparkles,
  Upload
} from 'lucide-react';

interface EditUjianModalProps {
  ujian: PaketUjian;
  currentUser: User;
  kelasList: Kelas[];
  mapelList: Mapel[];
  onSave: (updatedUjian: PaketUjian) => void;
  onClose: () => void;
}

export const EditUjianModal: React.FC<EditUjianModalProps> = ({
  ujian,
  currentUser,
  kelasList,
  mapelList,
  onSave,
  onClose,
}) => {
  const isAdmin = isUserAdmin(currentUser);
  const isAuthorized = canUserEditExam(currentUser, ujian, mapelList);

  const [activeTab, setActiveTab] = useState<'jadwal' | 'soal_visual' | 'soal_aiken'>('jadwal');

  // Waktu Pelaksanaan & Parameter Sesi Ujian
  const [namaUjian, setNamaUjian] = useState(ujian.namaUjian || ujian.judul || '');
  const [jenisUjian, setJenisUjian] = useState<'UJIAN_AKHIR' | 'UJIAN_TENGAH_SEMESTER'>(
    ujian.jenisUjian || 'UJIAN_TENGAH_SEMESTER'
  );
  const [idMapel, setIdMapel] = useState(ujian.idMapel || mapelList[0]?.id || '');
  const [hariTanggal, setHariTanggal] = useState(ujian.hariTanggal || new Date().toISOString().split('T')[0]);
  const [jamMulai, setJamMulai] = useState(ujian.jamMulai || '08:00');
  const [durasiMenit, setDurasiMenit] = useState<number>(ujian.durasiMenit || 90);
  const [token, setToken] = useState(ujian.token || ujian.tokenUjian || 'MED2026');
  const [targetKelas, setTargetKelas] = useState<string[]>(ujian.targetKelas || []);
  const [passingGrade, setPassingGrade] = useState<number>(ujian.passingGrade || 75);
  const [lingkupMateri, setLingkupMateri] = useState(ujian.lingkupMateri || '');
  const [bab, setBab] = useState(ujian.bab || '');

  // Butir Soal State
  const [soalPG, setSoalPG] = useState<SoalPG[]>(ujian.soalPG || []);
  const [soalIsian, setSoalIsian] = useState<SoalIsian[]>(ujian.soalIsian || []);

  // Inline Question Edit State
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editPertanyaan, setEditPertanyaan] = useState('');
  const [editOpsiA, setEditOpsiA] = useState('');
  const [editOpsiB, setEditOpsiB] = useState('');
  const [editOpsiC, setEditOpsiC] = useState('');
  const [editOpsiD, setEditOpsiD] = useState('');
  const [editOpsiE, setEditOpsiE] = useState('');
  const [editKunci, setEditKunci] = useState<'A' | 'B' | 'C' | 'D' | 'E'>('A');
  const [editPembahasan, setEditPembahasan] = useState('');

  // Add New Question State
  const [isAddingPG, setIsAddingPG] = useState(false);
  const [newPertanyaan, setNewPertanyaan] = useState('');
  const [newOpsiA, setNewOpsiA] = useState('');
  const [newOpsiB, setNewOpsiB] = useState('');
  const [newOpsiC, setNewOpsiC] = useState('');
  const [newOpsiD, setNewOpsiD] = useState('');
  const [newOpsiE, setNewOpsiE] = useState('');
  const [newKunci, setNewKunci] = useState<'A' | 'B' | 'C' | 'D' | 'E'>('A');
  const [newPembahasan, setNewPembahasan] = useState('');

  // Add New Isian State
  const [isAddingIsian, setIsAddingIsian] = useState(false);
  const [newIsianPertanyaan, setNewIsianPertanyaan] = useState('');
  const [newIsianKunci, setNewIsianKunci] = useState('');

  // Aiken Text Bulk Editor State
  const [aikenText, setAikenText] = useState(() => exportToAikenText(ujian.soalPG || [], ujian.soalIsian || []));
  const [aikenNotice, setAikenNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const handleImportFromUpload = (importedPG: SoalPG[], importedIsian: SoalIsian[]) => {
    if (importedPG.length > 0) {
      setSoalPG(prev => [...prev, ...importedPG.map((s, idx) => ({ ...s, nomor: prev.length + idx + 1 }))]);
    }
    if (importedIsian.length > 0) {
      setSoalIsian(prev => [...prev, ...importedIsian.map((s, idx) => ({ ...s, nomor: prev.length + idx + 1 }))]);
    }
    setSaveSuccessNotice(`🎉 Berhasil menambahkan ${importedPG.length} Soal PG ${importedIsian.length > 0 ? `dan ${importedIsian.length} Soal Isian` : ''} dari berkas dokumen!`);
    setTimeout(() => setSaveSuccessNotice(null), 6000);
  };

  // Selected Mapel Object
  const selectedMapel = useMemo(() => {
    return mapelList.find(m => m.id === idMapel) || mapelList[0];
  }, [mapelList, idMapel]);

  // Matching classes for current mapel
  const matchingClasses = useMemo(() => {
    return getMatchingClassesForMapel(selectedMapel, kelasList);
  }, [selectedMapel, kelasList]);

  // Target count guidelines
  const targetPGCount = jenisUjian === 'UJIAN_AKHIR' ? 40 : 30;

  // Toggle class selection
  const handleToggleKelas = (namaK: string) => {
    if (targetKelas.includes(namaK)) {
      setTargetKelas(targetKelas.filter(k => k !== namaK));
    } else {
      setTargetKelas([...targetKelas, namaK]);
    }
  };

  const handleSelectAllMatchingClasses = () => {
    const names = matchingClasses.map(k => k.namaKelas);
    setTargetKelas(Array.from(new Set([...targetKelas, ...names])));
  };

  const handleGenerateRandomToken = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let res = '';
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setToken(res);
  };

  // Start editing a specific PG question inline
  const handleStartEditQuestion = (soal: SoalPG) => {
    setEditingQuestionId(soal.id);
    setEditPertanyaan(soal.pertanyaan);
    setEditOpsiA(soal.opsi?.a || '');
    setEditOpsiB(soal.opsi?.b || '');
    setEditOpsiC(soal.opsi?.c || '');
    setEditOpsiD(soal.opsi?.d || '');
    setEditOpsiE(soal.opsi?.e || '');
    setEditKunci(soal.kunci || 'A');
    setEditPembahasan(soal.pembahasan || '');
  };

  // Save the inline edited question
  const handleSaveInlineQuestion = (id: string) => {
    if (!editPertanyaan.trim() || !editOpsiA.trim() || !editOpsiB.trim()) {
      alert('Teks pertanyaan dan opsi A & B wajib diisi!');
      return;
    }

    setSoalPG(prev => prev.map(s => {
      if (s.id !== id) return s;
      return {
        ...s,
        pertanyaan: editPertanyaan.trim(),
        opsi: {
          a: editOpsiA.trim(),
          b: editOpsiB.trim(),
          c: editOpsiC.trim() || '-',
          d: editOpsiD.trim() || '-',
          e: editOpsiE.trim() || '-',
        },
        kunci: editKunci,
        pembahasan: editPembahasan.trim(),
      };
    }));

    setEditingQuestionId(null);
  };

  // Delete a PG question
  const handleDeletePG = (id: string) => {
    if (confirm('Hapus butir soal ini? Nomor soal berikutnya akan dirapikan otomatis.')) {
      setSoalPG(prev => {
        const filtered = prev.filter(s => s.id !== id);
        return filtered.map((s, idx) => ({ ...s, nomor: idx + 1 }));
      });
      if (editingQuestionId === id) setEditingQuestionId(null);
    }
  };

  // Add new PG question
  const handleAddNewPG = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPertanyaan.trim() || !newOpsiA.trim() || !newOpsiB.trim()) {
      alert('Teks pertanyaan dan minimal opsi A dan B wajib diisi!');
      return;
    }

    const createdSoal: SoalPG = {
      id: `soal-${Date.now()}-${soalPG.length + 1}`,
      nomor: soalPG.length + 1,
      pertanyaan: newPertanyaan.trim(),
      opsi: {
        a: newOpsiA.trim(),
        b: newOpsiB.trim(),
        c: newOpsiC.trim() || '-',
        d: newOpsiD.trim() || '-',
        e: newOpsiE.trim() || '-',
      },
      kunci: newKunci,
      pembahasan: newPembahasan.trim(),
    };

    setSoalPG(prev => [...prev, createdSoal]);
    setNewPertanyaan('');
    setNewOpsiA('');
    setNewOpsiB('');
    setNewOpsiC('');
    setNewOpsiD('');
    setNewOpsiE('');
    setNewPembahasan('');
    setIsAddingPG(false);
  };

  // Add new Isian
  const handleAddNewIsian = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIsianPertanyaan.trim() || !newIsianKunci.trim()) {
      alert('Pertanyaan isian dan kunci jawaban wajib diisi!');
      return;
    }

    const createdIsian: SoalIsian = {
      id: `is-${Date.now()}-${soalIsian.length + 1}`,
      nomor: soalIsian.length + 1,
      pertanyaan: newIsianPertanyaan.trim(),
      kunci: newIsianKunci.trim(),
    };

    setSoalIsian(prev => [...prev, createdIsian]);
    setNewIsianPertanyaan('');
    setNewIsianKunci('');
    setIsAddingIsian(false);
  };

  // Delete Isian
  const handleDeleteIsian = (id: string) => {
    if (confirm('Hapus soal isian ini?')) {
      setSoalIsian(prev => {
        const filtered = prev.filter(is => is.id !== id);
        return filtered.map((is, idx) => ({ ...is, nomor: idx + 1 }));
      });
    }
  };

  // Sync from visual to Aiken text
  const handleReloadAikenFromState = () => {
    const text = exportToAikenText(soalPG, soalIsian);
    setAikenText(text);
    setAikenNotice({
      type: 'success',
      message: `Teks Aiken berhasil diperbarui dari ${soalPG.length} butir PG dan ${soalIsian.length} isian saat ini.`
    });
    setTimeout(() => setAikenNotice(null), 4000);
  };

  // Apply Aiken text to state
  const handleApplyAikenText = () => {
    if (!aikenText.trim()) {
      setAikenNotice({ type: 'error', message: 'Teks Aiken masih kosong!' });
      return;
    }

    try {
      const res = parseAikenUjian(aikenText);
      if (res.soalPG.length === 0 && res.soalIsian.length === 0) {
        setAikenNotice({
          type: 'error',
          message: 'Format Aiken tidak terbaca. Pastikan terdapat format: Pertanyaan, A. ..., B. ..., ANSWER: [A-E]'
        });
        return;
      }

      setSoalPG(res.soalPG);
      if (res.soalIsian.length > 0) {
        setSoalIsian(res.soalIsian);
      }

      setAikenNotice({
        type: 'success',
        message: `Berhasil mengimpor dan memperbarui ${res.soalPG.length} soal PG dan ${res.soalIsian.length} soal isian dari format Aiken!`
      });
      setTimeout(() => setAikenNotice(null), 5000);
    } catch (err) {
      setAikenNotice({ type: 'error', message: 'Gagal memproses format Aiken.' });
    }
  };

  // Direct Gemini AI Question Generation
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiCountPG, setAiCountPG] = useState(30);

  const handleGenerateAikenWithGemini = async () => {
    setIsGeneratingAI(true);
    setAikenNotice({
      type: 'success',
      message: 'Gemini AI sedang menyusun naskah soal HOTS berstandar kurikulum...'
    });

    try {
      const selectedMapel = mapelList.find(m => m.id === idMapel);
      const res = await requestAIGenerateQuestions({
        namaGuru: currentUser.nama,
        namaMapel: selectedMapel?.namaMapel || ujian.namaMapel || 'Mata Pelajaran',
        lingkupMateri: lingkupMateri || namaUjian,
        bab: bab || 'Kompetensi Ujian',
        targetKelas,
        jenisUjian,
        token,
        waktuUjian: `${hariTanggal} | ${jamMulai} | ${durasiMenit} Menit`,
        jumlahPG: aiCountPG,
        jumlahIsian: 5,
      });

      if (!res.success || !res.text) {
        setAikenNotice({
          type: 'error',
          message: res.error || 'Gagal menghasilkan naskah soal dari Gemini AI.'
        });
        return;
      }

      setAikenText(res.text);
      const parsed = parseAikenUjian(res.text);
      setAikenNotice({
        type: 'success',
        message: `✨ Berhasil digenerate oleh Gemini AI (${res.modelUsed})! Terdeteksi ${parsed.soalPG.length} PG & ${parsed.soalIsian.length} Isian. Klik "Terapkan & Perbarui" di bawah untuk menerapkan ke butir soal.`
      });
    } catch (err: any) {
      setAikenNotice({
        type: 'error',
        message: err?.message || 'Terjadi kesalahan saat menghubungi server AI.'
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Save changes to exam package
  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaUjian.trim()) {
      alert('Nama / Judul Paket Ujian tidak boleh kosong!');
      return;
    }

    // Determine status dokumen
    let statusDokumen = ujian.statusDokumen || 'DRAFT_PROSES';
    if (soalPG.length >= targetPGCount) {
      statusDokumen = 'READY';
    } else if (soalPG.length === 0 && soalIsian.length === 0) {
      statusDokumen = 'BELUM_BUAT';
    } else {
      statusDokumen = 'DRAFT_PROSES';
    }

    const updatedExam: PaketUjian = {
      ...ujian,
      namaUjian: namaUjian.trim(),
      judul: namaUjian.trim(),
      jenisUjian,
      idMapel: selectedMapel.id,
      kodeMapel: selectedMapel.kode,
      namaMapel: selectedMapel.namaMapel,
      hariTanggal: hariTanggal.trim(),
      jamMulai: jamMulai.trim(),
      durasiMenit: Number(durasiMenit) || 90,
      token: token.trim().toUpperCase(),
      tokenUjian: token.trim().toUpperCase(),
      targetKelas: targetKelas.length > 0 ? targetKelas : matchingClasses.map(k => k.namaKelas),
      passingGrade: Number(passingGrade) || 75,
      lingkupMateri: lingkupMateri.trim(),
      bab: bab.trim(),
      statusDokumen,
      soalPG,
      soalIsian,
    };

    onSave(updatedExam);
    setSaveSuccessNotice(`Paket Ujian "${updatedExam.namaUjian}" berhasil diperbarui!`);
    setTimeout(() => {
      setSaveSuccessNotice(null);
      onClose();
    }, 1200);
  };

  if (!isAuthorized) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Akses Edit Tidak Diizinkan</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Paket ujian ini hanya dapat diedit oleh <strong>Guru Pengampu Mata Pelajaran yang bersangkutan</strong> ({ujian.namaGuru || ujian.namaMapel}) atau oleh <strong>Super Administrator</strong>.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/75 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 flex items-center justify-between shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <Edit3 className="w-4 h-4" />
              </span>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                Edit Paket Ujian, Jadwal & Butir Soal
              </h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isAdmin 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {isAdmin ? 'Otoritas: Administrator' : `Guru Mapel: ${currentUser.nama}`}
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Paket: <strong className="text-white">{ujian.namaUjian}</strong> • Mapel: {ujian.namaMapel} • Guru: {ujian.namaGuru}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between gap-2 overflow-x-auto shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('jadwal')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'jadwal'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>1. Waktu & Sesi Pelaksanaan</span>
            </button>

            <button
              onClick={() => setActiveTab('soal_visual')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'soal_visual'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>2. Butir Soal Interaktif ({soalPG.length} PG, {soalIsian.length} Isian)</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('soal_aiken');
                setAikenText(exportToAikenText(soalPG, soalIsian));
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'soal_aiken'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>3. Editor Format AIKEN (Teks Massal)</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 hidden sm:flex items-center gap-2">
            <span>Status:</span>
            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
              soalPG.length >= targetPGCount
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}>
              {soalPG.length >= targetPGCount ? '● READY (Lengkap)' : `● PROSES (${soalPG.length}/${targetPGCount})`}
            </span>
          </div>
        </div>

        {/* Success Alert */}
        {saveSuccessNotice && (
          <div className="bg-emerald-500 text-white px-6 py-2.5 text-xs font-bold flex items-center gap-2 animate-fade-in shrink-0">
            <CheckCircle2 className="w-4 h-4" />
            <span>{saveSuccessNotice}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: JADWAL & PARAMETER PELAKSANAAN */}
          {activeTab === 'jadwal' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 text-xs text-indigo-900 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-bold">Pengaturan Waktu Pelaksanaan & Sesi Siswa</div>
                  <p className="text-indigo-800/80 leading-relaxed text-[11px]">
                    Ubah tanggal ujian, jam pelaksanaan, durasi pengerjaan, atau token rahasia ujian. Perubahan akan langsung berlaku bagi peserta didik saat mengakses halaman CAT.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Judul Ujian */}
                <div className="space-y-1 md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Nama / Judul Paket Ujian *
                  </label>
                  <input
                    type="text"
                    value={namaUjian}
                    onChange={(e) => setNamaUjian(e.target.value)}
                    placeholder="Contoh: PTS Simulasi Klinis Farmasi Semester Ganjil"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    required
                  />
                </div>

                {/* Jenis Ujian */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Jenis Evaluasi / Ujian *
                  </label>
                  <select
                    value={jenisUjian}
                    onChange={(e) => setJenisUjian(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold bg-white focus:outline-none focus:border-indigo-600"
                  >
                    <option value="UJIAN_TENGAH_SEMESTER">PTS (Penilaian Tengah Semester - Target 30 PG)</option>
                    <option value="UJIAN_AKHIR">PAS / PAT (Penilaian Akhir Semester - Target 40 PG)</option>
                  </select>
                </div>

                {/* Mapel */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Mata Pelajaran *
                  </label>
                  <select
                    value={idMapel}
                    onChange={(e) => setIdMapel(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold bg-white focus:outline-none focus:border-indigo-600"
                  >
                    {mapelList.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.namaMapel} ({m.kode}) - {m.jurusan}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Hari & Tanggal Pelaksanaan */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>Hari & Tanggal Pelaksanaan *</span>
                    <span className="text-[10px] text-slate-400 font-normal">Format: YYYY-MM-DD / Hari, Tgl</span>
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={hariTanggal}
                      onChange={(e) => setHariTanggal(e.target.value)}
                      placeholder="Contoh: 2026-09-24 atau Kamis, 24 September 2026"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                  <div className="flex gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setHariTanggal(new Date().toISOString().split('T')[0])}
                      className="text-[10px] font-bold text-indigo-600 hover:underline"
                    >
                      Set Hari Ini ({new Date().toISOString().split('T')[0]})
                    </button>
                  </div>
                </div>

                {/* Jam Mulai Pelaksanaan */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Jam Mulai Pelaksanaan *
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={jamMulai}
                      onChange={(e) => setJamMulai(e.target.value)}
                      placeholder="Contoh: 08:00 WIB"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>

                {/* Durasi Ujian & Quick Presets */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Durasi Pengerjaan Ujian (Menit) *
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={10}
                      max={240}
                      value={durasiMenit}
                      onChange={(e) => setDurasiMenit(Number(e.target.value))}
                      className="w-28 px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:outline-none focus:border-indigo-600"
                    />
                    <div className="flex items-center gap-1">
                      {[45, 60, 90, 120].map(mins => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => setDurasiMenit(mins)}
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                            durasiMenit === mins
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                          }`}
                        >
                          {mins}m
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Token Ujian */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Token Rahasia Ujian (6 Karakter) *
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={token}
                        onChange={(e) => setToken(e.target.value.toUpperCase())}
                        maxLength={10}
                        placeholder="Contoh: KSH72A"
                        className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 font-mono font-black text-amber-800 text-xs tracking-wider uppercase focus:outline-none focus:border-indigo-600 bg-amber-50/30"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateRandomToken}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 border border-slate-200"
                      title="Generate Token Acak Baru"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Acak</span>
                    </button>
                  </div>
                </div>

                {/* Lingkup Materi & Bab */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Lingkup Materi Pokok
                  </label>
                  <input
                    type="text"
                    value={lingkupMateri}
                    onChange={(e) => setLingkupMateri(e.target.value)}
                    placeholder="Contoh: Farmakoterapi Gangguan Sistem Kardiovaskular"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Bab / Sub Topik
                  </label>
                  <input
                    type="text"
                    value={bab}
                    onChange={(e) => setBab(e.target.value)}
                    placeholder="Contoh: Bab 3: Analisis Resep dan Dispensing Obat"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:border-indigo-600"
                  />
                </div>

                {/* KKM Passing Grade */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Kriteria Ketuntasan Minimal (KKM / Passing Grade)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={passingGrade}
                    onChange={(e) => setPassingGrade(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Target Kelas Selection */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    Sasaran Rombel / Kelas Peserta Ujian *
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllMatchingClasses}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    + Pilih Semua Rombel Terkait ({matchingClasses.length})
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {kelasList.map(k => {
                    const isChecked = targetKelas.includes(k.namaKelas);
                    const isMatched = matchingClasses.some(mc => mc.id === k.id);
                    return (
                      <button
                        key={k.id}
                        type="button"
                        onClick={() => handleToggleKelas(k.namaKelas)}
                        className={`p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition-all ${
                          isChecked
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="leading-tight">{k.namaKelas}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{k.jurusan}</div>
                        </div>
                        {isChecked && (
                          <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BUTIR SOAL INTERAKTIF (VISUAL EDITOR) */}
          {activeTab === 'soal_visual' && (
            <div className="space-y-6 animate-fade-in">
              {/* Top Action Bar */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                    Daftar Butir Soal Terdaftar ({soalPG.length} PG, {soalIsian.length} Isian)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Klik tombol "Edit" pada tiap butir soal untuk mengoreksi pertanyaan, pilihan jawaban, kunci jawaban, dan pembahasan.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(true)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                    title="Impor butir soal dari berkas Word (.docx) atau PDF (.pdf)"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Soal (Word / PDF)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingPG(true);
                      setIsAddingIsian(false);
                    }}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Butir Soal PG</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingIsian(true);
                      setIsAddingPG(false);
                    }}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Soal Isian</span>
                  </button>
                </div>
              </div>

              {/* Form Tambah Soal PG Baru */}
              {isAddingPG && (
                <form onSubmit={handleAddNewPG} className="p-5 rounded-2xl bg-indigo-50/50 border-2 border-dashed border-indigo-300 space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-indigo-600" />
                      Tambah Soal Pilihan Ganda Baru (Nomor {soalPG.length + 1})
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingPG(false)}
                      className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                    >
                      Batal
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Teks Pertanyaan / Kasus Klinis / Masalah *
                    </label>
                    <textarea
                      rows={3}
                      value={newPertanyaan}
                      onChange={(e) => setNewPertanyaan(e.target.value)}
                      placeholder="Tuliskan naskah soal lengkap..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-indigo-600"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Opsi A *</label>
                      <input
                        type="text"
                        value={newOpsiA}
                        onChange={(e) => setNewOpsiA(e.target.value)}
                        placeholder="Pilihan jawaban A"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Opsi B *</label>
                      <input
                        type="text"
                        value={newOpsiB}
                        onChange={(e) => setNewOpsiB(e.target.value)}
                        placeholder="Pilihan jawaban B"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Opsi C</label>
                      <input
                        type="text"
                        value={newOpsiC}
                        onChange={(e) => setNewOpsiC(e.target.value)}
                        placeholder="Pilihan jawaban C"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Opsi D</label>
                      <input
                        type="text"
                        value={newOpsiD}
                        onChange={(e) => setNewOpsiD(e.target.value)}
                        placeholder="Pilihan jawaban D"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">Opsi E</label>
                      <input
                        type="text"
                        value={newOpsiE}
                        onChange={(e) => setNewOpsiE(e.target.value)}
                        placeholder="Pilihan jawaban E"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Kunci Jawaban Benar *
                      </label>
                      <div className="flex gap-2">
                        {(['A', 'B', 'C', 'D', 'E'] as const).map(k => (
                          <button
                            key={k}
                            type="button"
                            onClick={() => setNewKunci(k)}
                            className={`w-9 h-9 rounded-xl font-bold text-xs transition-all ${
                              newKunci === k
                                ? 'bg-emerald-600 text-white shadow'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {k}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Pembahasan Soal (Opsional)
                      </label>
                      <input
                        type="text"
                        value={newPembahasan}
                        onChange={(e) => setNewPembahasan(e.target.value)}
                        placeholder="Alasan jawaban benar..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-indigo-200/50">
                    <button
                      type="button"
                      onClick={() => setIsAddingPG(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/50"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm"
                    >
                      Simpan Butir Soal PG
                    </button>
                  </div>
                </form>
              )}

              {/* Form Tambah Soal Isian Baru */}
              {isAddingIsian && (
                <form onSubmit={handleAddNewIsian} className="p-5 rounded-2xl bg-amber-50/50 border-2 border-dashed border-amber-300 space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-amber-600" />
                      Tambah Soal Isian Singkat Baru (Nomor {soalIsian.length + 1})
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingIsian(false)}
                      className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                    >
                      Batal
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Teks Pertanyaan Isian Singkat *
                    </label>
                    <textarea
                      rows={2}
                      value={newIsianPertanyaan}
                      onChange={(e) => setNewIsianPertanyaan(e.target.value)}
                      placeholder="Tuliskan naskah soal isian..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-amber-600"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Pedoman Kunci Jawaban Isian *
                    </label>
                    <input
                      type="text"
                      value={newIsianKunci}
                      onChange={(e) => setNewIsianKunci(e.target.value)}
                      placeholder="Kata kunci jawaban benar..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-amber-200/50">
                    <button
                      type="button"
                      onClick={() => setIsAddingIsian(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/50"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-sm"
                    >
                      Simpan Soal Isian
                    </button>
                  </div>
                </form>
              )}

              {/* List of PG Questions */}
              <div className="space-y-3">
                <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span>Bagian A: Pilihan Ganda ({soalPG.length} Butir Soal)</span>
                  <span className="text-[11px] text-slate-400">Target: {targetPGCount} Butir</span>
                </div>

                {soalPG.map((soal, idx) => {
                  const isEditingThis = editingQuestionId === soal.id;

                  if (isEditingThis) {
                    return (
                      <div key={soal.id} className="p-5 rounded-2xl bg-indigo-50/70 border-2 border-indigo-400 shadow-md space-y-4 animate-fade-in">
                        <div className="flex items-center justify-between border-b border-indigo-200 pb-2">
                          <span className="font-extrabold text-xs text-indigo-950 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">
                              {idx + 1}
                            </span>
                            Edit Butir Soal Nomor {idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditingQuestionId(null)}
                            className="text-xs font-bold text-slate-500 hover:text-slate-800"
                          >
                            Batal
                          </button>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Teks Pertanyaan *
                          </label>
                          <textarea
                            rows={3}
                            value={editPertanyaan}
                            onChange={(e) => setEditPertanyaan(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-1 focus:ring-indigo-600"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="font-bold text-slate-600">Opsi A:</span>
                            <input
                              type="text"
                              value={editOpsiA}
                              onChange={(e) => setEditOpsiA(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 mt-0.5"
                            />
                          </div>
                          <div>
                            <span className="font-bold text-slate-600">Opsi B:</span>
                            <input
                              type="text"
                              value={editOpsiB}
                              onChange={(e) => setEditOpsiB(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 mt-0.5"
                            />
                          </div>
                          <div>
                            <span className="font-bold text-slate-600">Opsi C:</span>
                            <input
                              type="text"
                              value={editOpsiC}
                              onChange={(e) => setEditOpsiC(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 mt-0.5"
                            />
                          </div>
                          <div>
                            <span className="font-bold text-slate-600">Opsi D:</span>
                            <input
                              type="text"
                              value={editOpsiD}
                              onChange={(e) => setEditOpsiD(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 mt-0.5"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <span className="font-bold text-slate-600">Opsi E:</span>
                            <input
                              type="text"
                              value={editOpsiE}
                              onChange={(e) => setEditOpsiE(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 mt-0.5"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-indigo-200">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-700">Kunci Jawaban:</span>
                            <div className="flex gap-1">
                              {(['A', 'B', 'C', 'D', 'E'] as const).map(k => (
                                <button
                                  key={k}
                                  type="button"
                                  onClick={() => setEditKunci(k)}
                                  className={`w-7 h-7 rounded-lg font-bold text-xs ${
                                    editKunci === k
                                      ? 'bg-emerald-600 text-white shadow'
                                      : 'bg-white border border-slate-300 text-slate-700'
                                  }`}
                                >
                                  {k}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingQuestionId(null)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-200/50"
                            >
                              Batal
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveInlineQuestion(soal.id)}
                              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm flex items-center gap-1"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>Simpan Butir {idx + 1}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={soal.id}
                      className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 shadow-sm transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <p className="text-xs font-bold text-slate-900 leading-relaxed">
                            {soal.pertanyaan}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEditQuestion(soal)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-[11px] font-bold flex items-center gap-1 border border-slate-200"
                            title="Edit Soal Ini"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePG(soal.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Hapus Soal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Options Preview */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs pl-8">
                        {(['a', 'b', 'c', 'd', 'e'] as const).map(optKey => {
                          const val = soal.opsi?.[optKey];
                          if (!val || val === '-') return null;
                          const isCorrect = (soal.kunci || 'A').toLowerCase() === optKey;
                          return (
                            <div
                              key={optKey}
                              className={`p-2 rounded-xl text-[11px] flex items-center gap-2 border ${
                                isCorrect
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                                  : 'bg-slate-50/70 border-slate-100 text-slate-600'
                              }`}
                            >
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                                isCorrect
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-200 text-slate-700'
                              }`}>
                                {optKey.toUpperCase()}
                              </span>
                              <span className="truncate">{val}</span>
                              {isCorrect && (
                                <Check className="w-3.5 h-3.5 text-emerald-600 ml-auto shrink-0" />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {soal.pembahasan && (
                        <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-xl pl-8 border border-slate-100 italic">
                          Pembahasan: {soal.pembahasan}
                        </div>
                      )}
                    </div>
                  );
                })}

                {soalPG.length === 0 && (
                  <div className="text-center py-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 text-xs space-y-1">
                    <p className="font-bold">Belum ada butir soal Pilihan Ganda</p>
                    <p>Klik "Tambah Butir Soal PG" di atas atau impor format Aiken massal.</p>
                  </div>
                )}
              </div>

              {/* List of Isian Questions */}
              {soalIsian.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-200">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                    Bagian B: Soal Isian Singkat ({soalIsian.length} Butir Soal)
                  </div>

                  {soalIsian.map((is, idx) => (
                    <div
                      key={is.id}
                      className="p-4 rounded-2xl bg-amber-50/30 border border-amber-200 space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2">
                          <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-900 font-extrabold text-xs flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="font-bold text-slate-900">{is.pertanyaan}</div>
                            <div className="text-[11px] text-emerald-700 font-semibold mt-1">
                              Kunci: <span className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-200">{is.kunci}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteIsian(is.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Hapus Soal Isian"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EDITOR FORMAT AIKEN (TEKS MASSAL) */}
          {activeTab === 'soal_aiken' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold">Editor Teks Massal Format AIKEN</div>
                  <p className="text-amber-800 text-[11px] leading-relaxed">
                    Anda dapat menyunting seluruh naskah soal sekaligus, menyalin dari ChatGPT / Prompt AI, atau merevisi teks di bawah ini. Pastikan format setiap butir soal memuat:
                    <br />
                    <code className="font-mono bg-white px-1 py-0.5 rounded border border-amber-300">
                      Teks Pertanyaan
                      <br />A. Pilihan Satu
                      <br />B. Pilihan Dua
                      <br />ANSWER: A
                    </code>
                  </p>
                </div>
              </div>

              {/* Gemini AI Generator Banner */}
              <div className="bg-gradient-to-r from-indigo-900 to-blue-900 rounded-2xl p-4 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm border border-indigo-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-400/20 text-amber-300">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-sm text-white">Generate Soal Otomatis (Gemini AI)</h5>
                    <p className="text-xs text-blue-200">
                      Buat atau perbarui draft naskah soal HOTS {namaUjian} secara otomatis dalam format Aiken.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={aiCountPG}
                    onChange={(e) => setAiCountPG(Number(e.target.value))}
                    disabled={isGeneratingAI}
                    className="bg-white/10 border border-blue-300/30 text-white rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:bg-slate-800"
                  >
                    <option value={30} className="text-slate-900">30 Soal PG</option>
                    <option value={40} className="text-slate-900">40 Soal PG</option>
                    <option value={20} className="text-slate-900">20 Soal PG</option>
                    <option value={10} className="text-slate-900">10 Soal PG</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleGenerateAikenWithGemini}
                    disabled={isGeneratingAI}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-slate-950 font-bold text-xs shadow flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                    <span>{isGeneratingAI ? 'Menyusun Soal...' : '✨ Buat Soal AI'}</span>
                  </button>
                </div>
              </div>

              {aikenNotice && (
                <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  aikenNotice.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  {aikenNotice.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />}
                  <span>{aikenNotice.message}</span>
                </div>
              )}

              <div className="flex items-center justify-between gap-2">
                <label className="block text-xs font-bold text-slate-700">
                  Area Teks Format AIKEN
                </label>
                <button
                  type="button"
                  onClick={handleReloadAikenFromState}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Muat Ulang dari Soal Tersimpan Saat Ini</span>
                </button>
              </div>

              <textarea
                rows={16}
                value={aikenText}
                onChange={(e) => setAikenText(e.target.value)}
                placeholder="Tempelkan format Aiken di sini..."
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 font-mono text-xs leading-relaxed focus:outline-none focus:border-indigo-600 bg-slate-50 focus:bg-white"
              />

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleApplyAikenText}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Terapkan & Perbarui Butir Soal dari Teks AIKEN</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600 text-center sm:text-left">
            Total Soal Siap: <strong className="text-indigo-900">{soalPG.length} PG</strong> + <strong className="text-indigo-900">{soalIsian.length} Isian</strong> • Durasi: <strong>{durasiMenit} Menit</strong> • Token: <strong className="font-mono text-amber-800">{token}</strong>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-200/70 transition-colors"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Perubahan Paket Ujian</span>
            </button>
          </div>
        </div>
      </div>

      <UploadSoalModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onImportQuestions={handleImportFromUpload}
        currentPGCount={soalPG.length}
        currentIsianCount={soalIsian.length}
      />
    </div>
  );
};
