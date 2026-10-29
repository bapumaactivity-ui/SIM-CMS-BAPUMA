import React, { useState, useEffect } from 'react';
import { PaketUjian, User, HasilUjian, SchoolInfo, Kelas, Mapel } from '../types';
import { CATCreatorView } from './CATCreatorView';
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  HelpCircle, 
  ArrowLeft, 
  ArrowRight, 
  Send, 
  Award, 
  Check, 
  X, 
  BookOpen, 
  Key, 
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';

interface CATSiswaViewProps {
  currentUser: User | null;
  ujianList: PaketUjian[];
  onFinishUjian: (hasil: HasilUjian) => void;
  schoolInfo?: SchoolInfo;
  kelasList?: Kelas[];
  mapelList?: Mapel[];
  hasilList?: HasilUjian[];
  onSaveUjian?: (ujian: PaketUjian) => void;
  onDeleteUjian?: (id: string) => void;
}

export const CATSiswaView: React.FC<CATSiswaViewProps> = ({
  currentUser,
  ujianList,
  onFinishUjian,
  schoolInfo,
  kelasList = [],
  mapelList = [],
  hasilList = [],
  onSaveUjian = () => {},
  onDeleteUjian = () => {},
}) => {
  // If user is Admin, Staf, or Guru: they do not take exams, they create & manage exams!
  if (currentUser && currentUser.role !== 'siswa') {
    return (
      <CATCreatorView
        currentUser={currentUser}
        ujianList={ujianList}
        kelasList={kelasList}
        mapelList={mapelList}
        hasilList={hasilList}
        onSaveUjian={onSaveUjian}
        onDeleteUjian={onDeleteUjian}
        schoolInfo={schoolInfo}
      />
    );
  }

  // Available exams that match student's class or are ready
  const availableExams = ujianList.filter(u => 
    u.statusDokumen === 'READY' &&
    (!currentUser?.namaKelas || u.targetKelas.length === 0 || u.targetKelas.includes(currentUser.namaKelas))
  );

  const [selectedExam, setSelectedExam] = useState<PaketUjian | null>(availableExams[0] || null);
  const [inputToken, setInputToken] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [isExamStarted, setIsExamStarted] = useState(false);

  // Exam state
  const [currentIndex, setCurrentIndex] = useState(0); // 0 to totalQuestions - 1
  const [jawabanPG, setJawabanPG] = useState<Record<string, string>>({});
  const [raguRagu, setRaguRagu] = useState<Record<string, boolean>>({});
  const [jawabanIsian, setJawabanIsian] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(90 * 60); // 90 minutes in seconds
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [examResult, setExamResult] = useState<HasilUjian | null>(null);

  // Timer effect
  useEffect(() => {
    let timer: any = null;
    if (isExamStarted && !examResult && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleSubmitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isExamStarted, examResult, timeLeft]);

  // Combine PG and Isian questions into a single flat list for navigation
  const questionsList = selectedExam ? [
    ...selectedExam.soalPG.map(q => ({ type: 'pg' as const, data: q })),
    ...selectedExam.soalIsian.map(q => ({ type: 'isian' as const, data: q })),
  ] : [];

  const currentItem = questionsList[currentIndex];

  const handleStartExam = () => {
    if (!selectedExam) return;
    if (inputToken.trim().toUpperCase() !== selectedExam.token.toUpperCase()) {
      setTokenError(`Token tidak valid. Silakan gunakan token "${selectedExam.token}" untuk sesi ini.`);
      return;
    }
    setTokenError('');
    setTimeLeft(selectedExam.durasiMenit * 60);
    setIsExamStarted(true);
  };

  const handleSelectOption = (opsiKey: string) => {
    if (!currentItem || currentItem.type !== 'pg') return;
    setJawabanPG({
      ...jawabanPG,
      [currentItem.data.id]: opsiKey.toUpperCase(),
    });
  };

  const handleToggleRagu = () => {
    if (!currentItem) return;
    const qId = currentItem.data.id;
    setRaguRagu({
      ...raguRagu,
      [qId]: !raguRagu[qId],
    });
  };

  const handleSubmitExam = () => {
    if (!selectedExam) return;

    // Calculate score
    const totalPG = selectedExam.soalPG.length;
    let benarPG = 0;
    selectedExam.soalPG.forEach(q => {
      if (jawabanPG[q.id] === q.kunci) {
        benarPG++;
      }
    });

    // Score calculations: PG is 80% weight, Isian is 20% weight
    const nilaiPG = totalPG > 0 ? Math.round((benarPG / totalPG) * 80) : 0;

    let benarIsian = 0;
    selectedExam.soalIsian.forEach(q => {
      const jwb = (jawabanIsian[q.id] || '').trim().toLowerCase();
      const target = q.kunci.trim().toLowerCase();
      if (jwb && (jwb === target || target.includes(jwb) || jwb.includes(target))) {
        benarIsian++;
      }
    });
    const totalIsian = selectedExam.soalIsian.length;
    const nilaiIsian = totalIsian > 0 ? Math.round((benarIsian / totalIsian) * 20) : 0;

    const totalNilai = nilaiPG + nilaiIsian;
    const isLulus = totalNilai >= selectedExam.passingGrade;

    const result: HasilUjian = {
      id: `res-${Date.now()}`,
      idUjian: selectedExam.id,
      nisn: currentUser?.nipOrNis || '0061234567',
      namaSiswa: currentUser?.nama || 'Siswa Peserta Ujian',
      idKelas: currentUser?.idKelas || 'k-1',
      namaKelas: currentUser?.namaKelas || 'XII-FARMASI-1',
      jawabanPG,
      raguRagu,
      jawabanIsian,
      nilaiPG,
      nilaiIsian,
      totalNilai,
      statusLulus: isLulus,
      waktuSelesai: new Date().toISOString().replace('T', ' ').substring(0, 16) + ' WIB',
    };

    setExamResult(result);
    setShowSubmitModal(false);
    onFinishUjian(result);
  };

  // Formatting timer
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 1. RESULT SCREEN
  if (examResult && selectedExam) {
    return (
      <div className="min-h-screen bg-slate-100 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Result Card Header */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 text-center">
            <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 ${
              examResult.statusLulus ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
            }`}>
              <Award className="w-9 h-9" />
            </div>

            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              HASIL EVALUASI KOMPUTERISASI UJIAN (CAT)
            </div>
            <h2 className="text-2xl font-black text-slate-900 mt-1">
              {selectedExam.namaUjian}
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Siswa: <strong className="text-slate-800">{examResult.namaSiswa}</strong> ({examResult.namaKelas}) • NISN: {examResult.nisn}
            </p>

            {/* Score Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
              <div className="p-3 rounded-xl bg-slate-50">
                <div className="text-xs text-slate-500">Nilai PG (Bobot 80)</div>
                <div className="text-xl font-bold text-slate-900">{examResult.nilaiPG}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <div className="text-xs text-slate-500">Nilai Isian (Bobot 20)</div>
                <div className="text-xl font-bold text-slate-900">{examResult.nilaiIsian}</div>
              </div>
              <div className="p-3 rounded-xl bg-teal-50 border border-teal-200">
                <div className="text-xs text-teal-700 font-semibold">Total Nilai Akhir</div>
                <div className="text-2xl font-black text-teal-900">{examResult.totalNilai}</div>
              </div>
              <div className={`p-3 rounded-xl border ${
                examResult.statusLulus 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                <div className="text-xs font-semibold">Status KKM ({selectedExam.passingGrade})</div>
                <div className="text-lg font-bold">
                  {examResult.statusLulus ? 'LULUS KOMPETEN' : 'REMEDIAL'}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={() => {
                  setExamResult(null);
                  setIsExamStarted(false);
                  setInputToken('');
                  setJawabanPG({});
                  setJawabanIsian({});
                  setCurrentIndex(0);
                }}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs flex items-center gap-2 shadow"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Kembali ke Beranda Ujian</span>
              </button>
            </div>
          </div>

          {/* Review Pembahasan HOTS */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Pembahasan & Analisis Klinis Soal HOTS
                </h3>
                <p className="text-xs text-slate-500">
                  Pelajari telaah jawaban dan konsep medis untuk penguatan kompetensi kejuruan.
                </p>
              </div>
              <span className="px-3 py-1 rounded bg-slate-100 text-slate-700 text-xs font-mono">
                {selectedExam.soalPG.length} PG + {selectedExam.soalIsian.length} Isian
              </span>
            </div>

            <div className="space-y-4">
              {selectedExam.soalPG.slice(0, 5).map((q, idx) => {
                const userAns = examResult.jawabanPG[q.id];
                const isCorrect = userAns === q.kunci;
                return (
                  <div key={q.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Soal Nomor {idx + 1}</span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 ${
                        isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {isCorrect ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                        {isCorrect ? 'Jawaban Benar' : `Salah (Jawaban Anda: ${userAns || 'Kosong'})`}
                      </span>
                    </div>

                    <p className="text-xs text-slate-800 leading-relaxed font-medium">{q.pertanyaan}</p>

                    <div className="text-xs text-teal-800 font-semibold pt-1">
                      Kunci Jawaban Resmi: Opsi {q.kunci}
                    </div>

                    {q.pembahasan && (
                      <div className="p-2.5 rounded-lg bg-teal-50/80 border border-teal-100 text-[11px] text-teal-900 leading-relaxed">
                        <strong>💡 Telaah Klinis:</strong> {q.pembahasan}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. EXAM START GATEWAY / TOKEN ENTRY
  if (!isExamStarted) {
    return (
      <div className="min-h-screen bg-slate-100 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-xl w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-600 flex items-center justify-center mx-auto shadow-sm">
              <BookOpen className="w-7 h-7" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              Computer Assisted Test (CAT)
            </h1>
            <p className="text-xs text-slate-600">
              Portal Ujian Sekolah & Kejuruan {schoolInfo?.nama || 'SMK Bakti Putra Mandiri'}
            </p>
          </div>

          {/* Student Identitas Box */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Nama Siswa:</span>
              <span className="font-bold text-slate-900">{currentUser?.nama || 'Siswa Peserta Ujian'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">NISN:</span>
              <span className="font-mono font-bold text-slate-800">{currentUser?.nipOrNis || '0061234567'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Kelas:</span>
              <span className="font-semibold text-teal-700">{currentUser?.namaKelas || 'XII-FARMASI-1'}</span>
            </div>
          </div>

          {/* Choose Available Exam */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Pilih Paket Ujian Aktif:
            </label>
            <select
              value={selectedExam?.id || ''}
              onChange={(e) => {
                const ex = availableExams.find(item => item.id === e.target.value);
                setSelectedExam(ex || null);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
            >
              {availableExams.map(ex => (
                <option key={ex.id} value={ex.id}>
                  {ex.namaUjian} ({ex.soalPG.length} PG + {ex.soalIsian.length} Isian)
                </option>
              ))}
            </select>
          </div>

          {/* Exam Details preview */}
          {selectedExam && (
            <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200 text-xs text-teal-950 space-y-2">
              <div className="font-bold text-teal-900 border-b border-teal-200 pb-1 flex items-center justify-between">
                <span>Informasi Paket Ujian</span>
                <span className="px-2 py-0.5 rounded bg-teal-200 text-[10px] font-mono font-bold">
                  {selectedExam.jenisUjian}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>Mapel: <strong>{selectedExam.namaMapel}</strong></div>
                <div>Guru: <strong>{selectedExam.namaGuru}</strong></div>
                <div>Durasi: <strong>{selectedExam.durasiMenit} Menit</strong></div>
                <div>Passing Grade: <strong>{selectedExam.passingGrade}</strong></div>
              </div>
              <div className="text-[11px] text-teal-800 bg-white/70 p-2 rounded border border-teal-100">
                💡 Token Ujian Saat Ini: <strong className="font-mono text-teal-900">{selectedExam.token}</strong> (Salin token ini ke kolom di bawah untuk memulai).
              </div>
            </div>
          )}

          {/* Token Input Box */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-teal-600" />
              <span>Masukkan Token Ujian (6 Karakter):</span>
            </label>
            <input
              type="text"
              maxLength={8}
              placeholder="Contoh: KSH72A"
              value={inputToken}
              onChange={(e) => {
                setInputToken(e.target.value.toUpperCase());
                setTokenError('');
              }}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 text-center text-lg font-mono font-bold uppercase tracking-widest focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
            {tokenError && (
              <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {tokenError}
              </p>
            )}
          </div>

          <button
            onClick={handleStartExam}
            disabled={!selectedExam}
            className="w-full py-3.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
          >
            <span>Mulai Pengerjaan Ujian CAT</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // 3. MAIN EXAM RUNNING SCREEN
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Floating Exam Header */}
      <header className="bg-slate-900 text-white px-4 sm:px-8 py-3 sticky top-0 z-40 border-b border-slate-800 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-500 text-slate-950 font-black flex items-center justify-center text-sm">
            CAT
          </div>
          <div>
            <div className="font-bold text-xs sm:text-sm text-slate-100 line-clamp-1">
              {selectedExam?.namaUjian}
            </div>
            <div className="text-[11px] text-slate-400">
              {currentUser?.nama || 'Siswa Peserta Ujian'} ({currentUser?.namaKelas || 'XII-FARMASI-1'})
            </div>
          </div>
        </div>

        {/* Timer Box */}
        <div className="flex items-center gap-3">
          <div className={`px-4 py-1.5 rounded-xl border flex items-center gap-2 text-sm font-mono font-bold shadow-inner ${
            timeLeft < 600
              ? 'bg-rose-950 text-rose-400 border-rose-800 animate-pulse'
              : 'bg-slate-800 text-teal-400 border-slate-700'
          }`}>
            <Clock className="w-4 h-4" />
            <span>{formatTime(timeLeft)}</span>
          </div>

          <button
            onClick={() => setShowSubmitModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Selesaikan Ujian</span>
          </button>
        </div>
      </header>

      {/* Main Workspace: Left Question Area + Right Question Palette Grid */}
      <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Question Box */}
        <div className="lg:col-span-8 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 flex flex-col justify-between min-h-[520px]">
          <div>
            {/* Question Subheader */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-lg bg-teal-600 text-white font-bold text-xs">
                  SOAL NO. {currentIndex + 1}
                </span>
                <span className="text-xs font-semibold text-slate-500 uppercase">
                  {currentItem?.type === 'pg' ? 'Pilihan Ganda' : 'Isian Singkat'}
                </span>
              </div>

              {/* Ragu-ragu checkbox button */}
              <button
                onClick={handleToggleRagu}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  currentItem && raguRagu[currentItem.data.id]
                    ? 'bg-amber-400 text-slate-900 font-bold shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{currentItem && raguRagu[currentItem.data.id] ? 'Tanda Ragu-Ragu Aktif' : 'Ragu-Ragu'}</span>
              </button>
            </div>

            {/* Question Text */}
            <div className="text-slate-900 text-sm sm:text-base leading-relaxed mb-6 font-medium">
              {currentItem?.data.pertanyaan}
            </div>

            {/* Options Area (Pilihan Ganda) */}
            {currentItem?.type === 'pg' && (
              <div className="space-y-3">
                {(['a', 'b', 'c', 'd', 'e'] as const).map((key) => {
                  const optText = (currentItem.data as any).opsi[key];
                  if (!optText) return null;
                  const isSelected = jawabanPG[currentItem.data.id] === key.toUpperCase();

                  return (
                    <div
                      key={key}
                      onClick={() => handleSelectOption(key)}
                      className={`p-3.5 rounded-xl border-2 flex items-start gap-3 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-teal-600 bg-teal-50/60 text-slate-900 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {key.toUpperCase()}
                      </div>
                      <span className="text-xs sm:text-sm leading-relaxed">{optText}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Options Area (Isian Singkat) */}
            {currentItem?.type === 'isian' && (
              <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <label className="block text-xs font-semibold text-slate-700">
                  Tuliskan Jawaban Singkat Anda:
                </label>
                <input
                  type="text"
                  placeholder="Ketik jawaban singkat / angka di sini..."
                  value={jawabanIsian[currentItem.data.id] || ''}
                  onChange={(e) => setJawabanIsian({
                    ...jawabanIsian,
                    [currentItem.data.id]: e.target.value
                  })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white font-medium"
                />
                <span className="text-[11px] text-slate-500">
                  *Periksa kembali ejaan kata atau angka sebelum beralih ke soal berikutnya.
                </span>
              </div>
            )}
          </div>

          {/* Bottom Navigation Buttons */}
          <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                currentIndex === 0
                  ? 'text-slate-300 bg-slate-100 cursor-not-allowed'
                  : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Sebelumnya</span>
            </button>

            <button
              onClick={() => setCurrentIndex(prev => Math.min(questionsList.length - 1, prev + 1))}
              disabled={currentIndex === questionsList.length - 1}
              className={`px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                currentIndex === questionsList.length - 1
                  ? 'text-slate-300 bg-slate-100 cursor-not-allowed'
                  : 'text-white bg-teal-600 hover:bg-teal-500 shadow'
              }`}
            >
              <span>Selanjutnya</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: Question Navigation Palette */}
        <div className="lg:col-span-4 bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
          <div className="font-bold text-xs text-slate-800 border-b border-slate-100 pb-2 flex items-center justify-between">
            <span>Daftar Nomor Soal</span>
            <span className="text-[11px] text-slate-500">Total: {questionsList.length} Butir</span>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-3 gap-1.5 text-[10px] text-slate-600 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-emerald-500"></span>
              <span>Sudah Dijawab</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-amber-400"></span>
              <span>Ragu-Ragu</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-slate-200"></span>
              <span>Belum Diisi</span>
            </div>
          </div>

          {/* Number Grid */}
          <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-5 gap-2 max-h-[360px] overflow-y-auto pr-1">
            {questionsList.map((item, idx) => {
              const qId = item.data.id;
              const isAnswered = item.type === 'pg' 
                ? Boolean(jawabanPG[qId]) 
                : Boolean((jawabanIsian[qId] || '').trim());
              const isRagu = raguRagu[qId];
              const isCurrent = currentIndex === idx;

              let btnClass = 'bg-slate-100 text-slate-700 hover:bg-slate-200';
              if (isRagu) {
                btnClass = 'bg-amber-400 text-slate-950 font-bold';
              } else if (isAnswered) {
                btnClass = 'bg-emerald-500 text-white font-bold';
              }

              if (isCurrent) {
                btnClass += ' ring-2 ring-teal-600 ring-offset-2';
              }

              return (
                <button
                  key={qId}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-9 rounded-lg text-xs font-semibold transition-all ${btnClass}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => setShowSubmitModal(true)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5 text-teal-400" />
              <span>Selesai & Kumpulkan Jawaban</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="font-bold text-slate-900 text-center text-lg">
              Konfirmasi Selesai Ujian
            </h3>

            <p className="text-xs text-slate-600 text-center leading-relaxed">
              Apakah Anda yakin ingin menyelesaikan ujian ini sekarang? Pastikan seluruh soal telah dijawab dengan seksama.
            </p>

            {/* Answered Summary stats */}
            <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs text-slate-700">
              <div className="flex justify-between">
                <span>Soal Terjawab:</span>
                <span className="font-bold text-emerald-600">
                  {Object.keys(jawabanPG).length + Object.values(jawabanIsian).filter(v => v.trim()).length} / {questionsList.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Masih Ditandai Ragu-ragu:</span>
                <span className="font-bold text-amber-600">
                  {Object.values(raguRagu).filter(Boolean).length} Soal
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                Kembali Periksa
              </button>
              <button
                onClick={handleSubmitExam}
                className="w-1/2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow"
              >
                Ya, Kumpulkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
