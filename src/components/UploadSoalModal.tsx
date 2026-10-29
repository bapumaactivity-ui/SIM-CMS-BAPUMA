import React, { useState, useRef } from 'react';
import { SoalPG, SoalIsian } from '../types';
import { 
  extractTextFromFile, 
  parseExamQuestionsFromText, 
  ParseResult 
} from '../utils/fileExamParser';
import { requestAIParseExamDocument } from '../services/aiService';
import { 
  Upload, 
  FileText, 
  FileCheck, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Sparkles, 
  RefreshCw, 
  Download, 
  Check, 
  Trash2, 
  Eye, 
  HelpCircle,
  FileCode,
  Layers
} from 'lucide-react';

interface UploadSoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportQuestions: (soalPG: SoalPG[], soalIsian: SoalIsian[], detectedTitle?: string) => void;
  currentPGCount?: number;
  currentIsianCount?: number;
}

export const UploadSoalModal: React.FC<UploadSoalModalProps> = ({
  isOpen,
  onClose,
  onImportQuestions,
  currentPGCount = 0,
  currentIsianCount = 0,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [extractedText, setExtractedText] = useState<string>('');
  const [parsedData, setParsedData] = useState<ParseResult | null>(null);
  const [useAI, setUseAI] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<'pg' | 'isian' | 'raw'>('pg');

  // Editable preview questions state
  const [editablePG, setEditablePG] = useState<SoalPG[]>([]);
  const [editableIsian, setEditableIsian] = useState<SoalIsian[]>([]);
  const [detectedExamTitle, setDetectedExamTitle] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      await processSelectedFile(selectedFile);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      await processSelectedFile(droppedFile);
    }
  };

  const processSelectedFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setProcessingStatus(`Membaca berkas ${selectedFile.name}...`);

    try {
      // Step 1: Extract plain text
      const { text, fileType } = await extractTextFromFile(selectedFile);
      if (!text || !text.trim()) {
        throw new Error('Dokumen kosong atau tidak memiliki teks yang dapat diekstrak.');
      }

      setExtractedText(text);
      setProcessingStatus('Menganalisis butir soal, opsi A-E, dan kunci jawaban...');

      // Step 2: Parse using local smart parser
      const localResult = parseExamQuestionsFromText(text);

      if (localResult.soalPG.length === 0 && localResult.soalIsian.length === 0) {
        // Fallback: If local parser found 0, attempt AI if available
        setProcessingStatus('Mencoba analisis dengan Gemini AI...');
        try {
          const aiResult = await requestAIParseExamDocument(text, selectedFile.name);
          if (aiResult.success && aiResult.soalPG && aiResult.soalPG.length > 0) {
            const mappedPG: SoalPG[] = aiResult.soalPG.map((item, idx) => ({
              id: `pg-ai-${Date.now()}-${idx + 1}`,
              nomor: idx + 1,
              pertanyaan: item.pertanyaan || `Soal ${idx + 1}`,
              opsi: item.opsi || { a: '-', b: '-', c: '-', d: '-', e: '-' },
              kunci: item.kunci || 'A',
              pembahasan: item.pembahasan || 'Dianalisis oleh AI',
            }));
            const mappedIsian: SoalIsian[] = (aiResult.soalIsian || []).map((item, idx) => ({
              id: `isian-ai-${Date.now()}-${idx + 1}`,
              nomor: idx + 1,
              pertanyaan: item.pertanyaan || `Pertanyaan isian ${idx + 1}`,
              kunci: item.kunciJawaban || item.kunci || '',
              kunciJawaban: item.kunciJawaban || item.kunci || '',
            }));

            setEditablePG(mappedPG);
            setEditableIsian(mappedIsian);
            setDetectedExamTitle(aiResult.judulUjian || '');
            setParsedData({
              soalPG: mappedPG,
              soalIsian: mappedIsian,
              detectedTitle: aiResult.judulUjian,
              totalParsed: mappedPG.length + mappedIsian.length,
              rawText: text,
            });
            setSuccessMessage(`Berhasil mengekstrak ${mappedPG.length} Soal PG & ${mappedIsian.length} Soal Isian menggunakan Bantuan AI!`);
            setIsProcessing(false);
            return;
          }
        } catch {
          // Ignore AI failure and throw friendly local error
        }

        throw new Error('Tidak ditemukan butir soal yang valid dalam berkas. Pastikan dokumen memuat nomor soal (misal: "1. Pertanyaan...") dan opsi pilihan jawaban ("A. ... B. ...").');
      }

      setEditablePG(localResult.soalPG);
      setEditableIsian(localResult.soalIsian);
      setDetectedExamTitle(localResult.detectedTitle || '');
      setParsedData(localResult);
      setSuccessMessage(`Berhasil membaca ${localResult.soalPG.length} Soal PG & ${localResult.soalIsian.length} Soal Isian dari berkas!`);
    } catch (err: any) {
      console.error('File parsing error:', err);
      setErrorMessage(err.message || 'Gagal memproses berkas soal.');
      setParsedData(null);
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleReparseWithAI = async () => {
    if (!extractedText) return;
    setIsProcessing(true);
    setProcessingStatus('Sedang memproses ulang seluruh naskah dengan Gemini AI untuk akurasi maksimal...');
    setErrorMessage(null);

    try {
      const aiResult = await requestAIParseExamDocument(extractedText, file?.name);
      if (!aiResult.success) {
        throw new Error(aiResult.error || 'Gemini AI tidak dapat memproses naskah.');
      }

      const mappedPG: SoalPG[] = (aiResult.soalPG || []).map((item, idx) => ({
        id: `pg-ai-${Date.now()}-${idx + 1}`,
        nomor: idx + 1,
        pertanyaan: item.pertanyaan || `Soal ${idx + 1}`,
        opsi: item.opsi || { a: '-', b: '-', c: '-', d: '-', e: '-' },
        kunci: (['A', 'B', 'C', 'D', 'E'].includes(item.kunci) ? item.kunci : 'A') as any,
        pembahasan: item.pembahasan || 'Diverifikasi AI',
      }));

      const mappedIsian: SoalIsian[] = (aiResult.soalIsian || []).map((item, idx) => ({
        id: `isian-ai-${Date.now()}-${idx + 1}`,
        nomor: idx + 1,
        pertanyaan: item.pertanyaan || `Pertanyaan isian ${idx + 1}`,
        kunci: item.kunciJawaban || item.kunci || '',
        kunciJawaban: item.kunciJawaban || item.kunci || '',
      }));

      setEditablePG(mappedPG);
      setEditableIsian(mappedIsian);
      if (aiResult.judulUjian) setDetectedExamTitle(aiResult.judulUjian);
      setSuccessMessage(`✨ Gemini AI (${aiResult.modelUsed || 'Gemini'}) berhasil menyusun ulang ${mappedPG.length} Soal PG dan ${mappedIsian.length} Soal Isian dengan rapi!`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menjalankan pemrosesan AI.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleUpdateKunci = (idx: number, newKunci: 'A' | 'B' | 'C' | 'D' | 'E') => {
    const updated = [...editablePG];
    updated[idx].kunci = newKunci;
    setEditablePG(updated);
  };

  const handleDeleteQuestion = (idx: number) => {
    const updated = editablePG.filter((_, i) => i !== idx).map((s, i) => ({ ...s, nomor: i + 1 }));
    setEditablePG(updated);
  };

  const handleDeleteIsian = (idx: number) => {
    const updated = editableIsian.filter((_, i) => i !== idx).map((s, i) => ({ ...s, nomor: i + 1 }));
    setEditableIsian(updated);
  };

  const handleConfirmImport = () => {
    if (editablePG.length === 0 && editableIsian.length === 0) {
      alert('Belum ada soal yang berhasil diekstrak.');
      return;
    }

    onImportQuestions(editablePG, editableIsian, detectedExamTitle);
    onClose();
  };

  const handleDownloadWordTemplate = () => {
    const docContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Template Naskah Soal Ujian SMK Bakti Putra Mandiri</title>
<style>
body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.4; margin: 2cm; }
h1, h2, h3 { text-align: center; margin: 0; }
.header { border-bottom: 2px solid black; padding-bottom: 8px; margin-bottom: 16px; text-align: center; }
.section-title { font-weight: bold; margin-top: 14pt; margin-bottom: 6pt; }
p { margin: 4pt 0; }
</style>
</head>
<body>
<div class="header">
<h3>SMK BAKTI PUTRA MANDIRI</h3>
<p>PENILAIAN AKHIR SEMESTER (PAS) TAHUN AJARAN 2026/2027</p>
<p>Mata Pelajaran: Farmasi Klinis & Layanan Kesehatan | Alokasi Waktu: 90 Menit</p>
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

  const handleDownloadTemplate = () => {
    const sampleText = `PENILAIAN AKHIR SEMESTER (PAS)
Mata Pelajaran: Farmasi Klinis & Asisten Keperawatan
Tahun Pelajaran: 2026/2027

A. SOAL PILIHAN GANDA

1. Seorang pasien anak usia 5 tahun dengan berat badan 20 kg memerlukan amoksisilin 40 mg/kgBB/hari. Berapa dosis yang dibutuhkan?
A. 2,3 mL
B. 3,5 mL
C. 5,3 mL
D. 7,0 mL
E. 10,6 mL
Kunci: C
Pembahasan: Dihitung berdasarkan rumus dosis standar anak per kg berat badan.

2. Resep dokter tertulis R/ Acid Salicyl 2%, Sulfur Praecip 4%, Vaselin ad 50 gram. Berapa bobot Vaselin yang ditimbang?
A. 2 gram
B. 4 gram
C. 44 gram
D. 47 gram
E. 50 gram
Kunci: C
Pembahasan: Pengurangan bobot total 50g dengan persentase zat aktif.

3. Standar posisi tidur semi-fowler untuk pasien sesak napas di ranjang rawat inap adalah kemiringan...
A. 15 - 30 derajat
B. 30 - 45 derajat
C. 60 - 90 derajat
D. 90 - 120 derajat
E. 0 derajat datar
Kunci: B
Pembahasan: Posisi semi-fowler menggunakan sudut kemiringan 30 hingga 45 derajat untuk memaksimalkan ekspansi paru.

B. SOAL ISIAN SINGKAT

1. Singkatan latin "s.d.d" pada etiket resep dokter memiliki arti...
Kunci: Sehari dua kali (semel de die)

2. Tiga jenis pemeriksaan tanda-tanda vital (TTV) primer pada pasien adalah...
Kunci: Tekanan darah, nadi, dan suhu tubuh`;

    const blob = new Blob([sampleText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Contoh_Format_Soal_SMK_Bakti_Putra_Mandiri.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
              <Upload className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold leading-tight">Unggah Berkas Soal (Word / PDF / Teks)</h2>
              <p className="text-xs text-emerald-100">
                Memudahkan bapak/ibu guru mengimpor bank soal langsung dari dokumen tanpa perlu mengetik manual satu per satu
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Upload Dropzone */}
          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-200 ${
              file 
                ? 'border-emerald-500 bg-emerald-50/40' 
                : 'border-slate-300 hover:border-emerald-500 bg-slate-50/60 hover:bg-emerald-50/20'
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".docx,.doc,.pdf,.txt,.aiken"
              className="hidden"
            />
            
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                {file ? <FileCheck className="w-8 h-8 text-emerald-600" /> : <Upload className="w-8 h-8" />}
              </div>
              
              <div>
                <p className="text-base font-semibold text-slate-800">
                  {file ? file.name : 'Klik untuk Memilih File atau Tarik Berkas ke Sini'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Mendukung berkas Microsoft Word (<span className="font-semibold text-emerald-700">.docx</span>), PDF (<span className="font-semibold text-emerald-700">.pdf</span>), dan Teks (<span className="font-semibold text-emerald-700">.txt</span>)
                </p>
                {file && (
                  <p className="text-xs text-emerald-700 font-medium mt-1">
                    Ukuran: {(file.size / 1024).toFixed(1)} KB • Klik untuk ganti file
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
                >
                  Pilih File Dari Komputer
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadWordTemplate();
                  }}
                  className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-lg flex items-center space-x-1.5 transition-all"
                  title="Unduh contoh template Microsoft Word (.doc) resmi"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  <span>Unduh Template Word (.doc)</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadTemplate();
                  }}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg flex items-center space-x-1.5 transition-all"
                  title="Unduh contoh naskah format teks (.txt)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Format Teks (.txt)</span>
                </button>
              </div>

              {/* Format Guide Box */}
              <div className="mt-4 p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-left text-xs text-amber-900 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <HelpCircle className="w-4 h-4 text-amber-600" />
                  <span>Format Penulisan Soal di Word / PDF Sangat Mudah:</span>
                </div>
                <div className="font-mono text-[11px] bg-white/90 p-2.5 rounded-lg border border-amber-200 text-slate-700 leading-relaxed">
                  1. Pertanyaan soal nomor satu ditulis di sini...<br />
                  A. Pilihan jawaban A<br />
                  B. Pilihan jawaban B<br />
                  C. Pilihan jawaban C<br />
                  D. Pilihan jawaban D<br />
                  E. Pilihan jawaban E<br />
                  <strong className="text-emerald-700">Kunci: C</strong> <span className="text-slate-400 font-sans">(atau letakkan tabel kunci jawaban di akhir dokumen)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Loading Indicator */}
          {isProcessing && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-3 text-emerald-800 animate-pulse">
              <RefreshCw className="w-5 h-5 animate-spin text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold">Sedang Mengekstrak Soal...</p>
                <p className="text-xs text-emerald-700">{processingStatus || 'Mohon tunggu sejenak...'}</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3 text-red-800">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold">Kendala Ekstraksi Dokumen</p>
                <p className="text-xs text-red-700 mt-0.5">{errorMessage}</p>
                <div className="mt-2 text-xs text-red-600 bg-white/70 p-2 rounded border border-red-200">
                  💡 <strong>Tips Format:</strong> Pastikan setiap soal memiliki nomor (misal <code>1.</code>), opsi jawaban dengan huruf kapital (<code>A.</code>, <code>B.</code>, <code>C.</code>, <code>D.</code>, <code>E.</code>), dan kunci jawaban (misal <code>Kunci: A</code> atau di tabel kunci jawaban di bagian bawah dokumen).
                </div>
              </div>
            </div>
          )}

          {/* Success Banner & Overview */}
          {parsedData && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <FileCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      Hasil Ekstraksi Berkas Soal
                    </h3>
                    <p className="text-xs text-slate-500">
                      {detectedExamTitle ? `Judul Terdeteksi: "${detectedExamTitle}"` : 'Dokumen berhasil dipetakan ke dalam butir soal'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleReparseWithAI}
                    disabled={isProcessing}
                    className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-indigo-600 text-white text-xs font-semibold rounded-lg shadow-sm hover:opacity-90 flex items-center space-x-1.5 transition-all"
                    title="Gunakan AI untuk merapikan kembali soal jika ada opsi/kunci yang terlewat"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Perbaiki / Rapikan via Gemini AI</span>
                  </button>
                </div>
              </div>

              {/* Stats badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center space-x-3 shadow-xs">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-sm">
                    {editablePG.length}
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-slate-500 uppercase">Pilihan Ganda (PG)</p>
                    <p className="text-xs font-bold text-emerald-700">Siap Diimpor</p>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center space-x-3 shadow-xs">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-sm">
                    {editableIsian.length}
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-slate-500 uppercase">Soal Isian Singkat</p>
                    <p className="text-xs font-bold text-purple-700">Siap Diimpor</p>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center space-x-3 shadow-xs">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
                    {editablePG.length + editableIsian.length}
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-slate-500 uppercase">Total Butir Soal</p>
                    <p className="text-xs font-bold text-blue-700">Semua Bagian</p>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center space-x-3 shadow-xs">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 font-bold flex items-center justify-center text-sm">
                    {editablePG.filter(p => !p.kunci).length === 0 ? '✓' : '!'}
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-slate-500 uppercase">Kunci Jawaban</p>
                    <p className="text-xs font-bold text-amber-700">
                      {editablePG.filter(p => !p.kunci).length === 0 ? 'Lengkap Terkunci' : 'Periksa Kunci'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tabs for Preview */}
              <div className="flex items-center space-x-2 border-b border-slate-200 pt-2">
                <button
                  type="button"
                  onClick={() => setPreviewTab('pg')}
                  className={`pb-2 px-3 text-xs font-semibold flex items-center space-x-1.5 transition-colors border-b-2 ${
                    previewTab === 'pg'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Daftar Pilihan Ganda ({editablePG.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('isian')}
                  className={`pb-2 px-3 text-xs font-semibold flex items-center space-x-1.5 transition-colors border-b-2 ${
                    previewTab === 'isian'
                      ? 'border-purple-600 text-purple-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Daftar Soal Isian ({editableIsian.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('raw')}
                  className={`pb-2 px-3 text-xs font-semibold flex items-center space-x-1.5 transition-colors border-b-2 ${
                    previewTab === 'raw'
                      ? 'border-slate-800 text-slate-800'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Teks Mentah Terbaca</span>
                </button>
              </div>

              {/* Tab 1: Soal PG Preview */}
              {previewTab === 'pg' && (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {editablePG.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      Tidak ada soal pilihan ganda yang terdeteksi.
                    </div>
                  ) : (
                    editablePG.map((soal, idx) => (
                      <div 
                        key={soal.id || idx} 
                        className="p-3.5 bg-white rounded-xl border border-slate-200 hover:border-emerald-300 transition-colors shadow-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start space-x-2">
                            <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                              {soal.pertanyaan}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(idx)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                            title="Hapus butir soal ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Options */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2.5 pl-8">
                          {(['a', 'b', 'c', 'd', 'e'] as const).map(huruf => {
                            const val = soal.opsi?.[huruf];
                            if (!val || val === '-') return null;
                            const isKunci = soal.kunci?.toUpperCase() === huruf.toUpperCase();
                            return (
                              <div 
                                key={huruf}
                                className={`text-[11px] px-2.5 py-1.5 rounded-lg flex items-center space-x-1.5 ${
                                  isKunci 
                                    ? 'bg-emerald-50 border border-emerald-300 text-emerald-900 font-semibold' 
                                    : 'bg-slate-50 text-slate-700 border border-slate-100'
                                }`}
                              >
                                <span className={`w-4 h-4 rounded text-[10px] font-bold flex items-center justify-center ${
                                  isKunci ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                                }`}>
                                  {huruf.toUpperCase()}
                                </span>
                                <span className="truncate flex-1">{val}</span>
                                {isKunci && <Check className="w-3 h-3 text-emerald-600 flex-shrink-0" />}
                              </div>
                            );
                          })}
                        </div>

                        {/* Footer row: Kunci selector & Pembahasan */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 pl-8 text-[11px]">
                          <div className="flex items-center space-x-2">
                            <span className="text-slate-500 font-medium">Kunci Jawaban:</span>
                            <select
                              value={soal.kunci || 'A'}
                              onChange={(e) => handleUpdateKunci(idx, e.target.value as any)}
                              className="text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 rounded px-2 py-0.5 focus:outline-none"
                            >
                              <option value="A">Kunci A</option>
                              <option value="B">Kunci B</option>
                              <option value="C">Kunci C</option>
                              <option value="D">Kunci D</option>
                              <option value="E">Kunci E</option>
                            </select>
                          </div>

                          {soal.pembahasan && (
                            <span className="text-slate-500 italic truncate max-w-xs">
                              💡 {soal.pembahasan}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 2: Soal Isian Preview */}
              {previewTab === 'isian' && (
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {editableIsian.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      Tidak ada soal isian singkat yang terdeteksi dalam berkas.
                    </div>
                  ) : (
                    editableIsian.map((isian, idx) => (
                      <div 
                        key={isian.id || idx}
                        className="p-3 bg-white rounded-xl border border-slate-200 hover:border-purple-300 transition-colors shadow-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start space-x-2">
                            <span className="w-6 h-6 rounded-md bg-purple-100 text-purple-800 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <div>
                              <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                                {isian.pertanyaan}
                              </p>
                              <p className="text-[11px] text-purple-700 font-medium mt-1">
                                Kunci Jawaban: <span className="font-semibold">{isian.kunci || isian.kunciJawaban || '-'}</span>
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteIsian(idx)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                            title="Hapus butir isian ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 3: Raw Extracted Text */}
              {previewTab === 'raw' && (
                <div className="bg-slate-900 text-emerald-400 p-4 rounded-xl text-xs font-mono max-h-72 overflow-y-auto whitespace-pre-wrap">
                  {extractedText}
                </div>
              )}

            </div>
          )}

          {/* Information & Format Guide */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-xl space-y-2 text-xs text-slate-700">
            <div className="flex items-center space-x-2 text-emerald-900 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Panduan Format Berkas Soal yang Didukung</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
              <li>
                <strong>Format Naskah Word (.docx) & PDF:</strong> Penomoran standar seperti <code>1.</code>, <code>2.</code>, atau <code>Soal 1:</code>.
              </li>
              <li>
                <strong>Opsi Jawaban:</strong> Cukup tulis <code>A. [Teks Opsi]</code>, <code>B. [Teks Opsi]</code> sampai <code>E.</code> di baris baru.
              </li>
              <li>
                <strong>Kunci Jawaban:</strong> Sistem otomatis mengenali kunci yang tertulis langsung di bawah butir soal (misal: <code>Kunci: A</code> atau <code>Jawaban: B</code>) maupun <strong>Tabel Kunci Jawaban di bagian akhir dokumen</strong>.
              </li>
              <li>
                <strong>Soal Isian:</strong> Jika ada soal isian, pisahkan dengan judul bagian (misal: <code>B. SOAL ISIAN</code>).
              </li>
            </ul>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {editablePG.length > 0 || editableIsian.length > 0 ? (
              <span className="text-emerald-700 font-semibold">
                ✓ Siap menambahkan {editablePG.length} Soal PG & {editableIsian.length} Isian ke dalam paket ujian
              </span>
            ) : (
              'Pilih berkas Word atau PDF untuk memulai ekstraksi'
            )}
          </div>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium text-xs rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={editablePG.length === 0 && editableIsian.length === 0}
              onClick={handleConfirmImport}
              className={`flex-1 sm:flex-none px-5 py-2 font-semibold text-xs rounded-xl shadow-md flex items-center justify-center space-x-2 transition-all ${
                editablePG.length > 0 || editableIsian.length > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>Masukkan ke Paket Soal ({editablePG.length + editableIsian.length})</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
