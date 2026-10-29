import React, { useState } from 'react';
import { Sparkles, Copy, Check, X, FileText, Bot, HelpCircle, CheckCircle2 } from 'lucide-react';
import { copyTextToClipboard } from '../utils/clipboard';

interface TemplatePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  namaGuru: string;
  namaMapel: string;
  lingkupMateri?: string;
  bab?: string;
  targetKelas?: string[];
  jenisUjian?: 'UJIAN_AKHIR' | 'UJIAN_TENGAH_SEMESTER';
  durasi?: number;
  token?: string;
  onApplySampleAiken?: (sampleText: string) => void;
}

export const TemplatePromptModal: React.FC<TemplatePromptModalProps> = ({
  isOpen,
  onClose,
  namaGuru,
  namaMapel,
  lingkupMateri = '',
  bab = '',
  targetKelas = [],
  jenisUjian = 'UJIAN_AKHIR',
  durasi = 90,
  token = 'CATBPM',
  onApplySampleAiken,
}) => {
  const [activeTab, setActiveTab] = useState<'kustom' | 'pas' | 'pts' | 'contoh'>('kustom');
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);

  if (!isOpen) return null;

  const isPAS = jenisUjian === 'UJIAN_AKHIR';
  const targetPG = isPAS ? 40 : 30;

  const isPenjas = namaMapel.toLowerCase().includes('jasmani') || namaMapel.toLowerCase().includes('pjok');
  const isAgama = namaMapel.toLowerCase().includes('agama') || namaMapel.toLowerCase().includes('pai');

  const roleText = isPenjas 
    ? 'Guru Pendidikan Jasmani, Olahraga & Kesehatan (PJOK) SMK'
    : isAgama 
    ? 'Guru Pendidikan Agama Islam & Budi Pekerti SMK'
    : `Guru Mata Pelajaran ${namaMapel || 'SMK'}`;

  const studiKasusKustom = isPenjas
    ? '- Sertakan skenario/studi kasus analisis gerak teknik cabang olahraga (bola besar/atletik/senam), kebugaran jasmani, penanganan cedera fisik, pola hidup sehat dan nutrisi atlet.'
    : isAgama
    ? '- Sertakan skenario/studi kasus kontekstual pemahaman ayat/hadits, akhlak terpuji dalam pergaulan remaja, fikih ibadah dan muamalah kontemporer.'
    : '- Sertakan skenario/studi kasus riil di lapangan kerja (misal: resep obat racikan, rekam medis pasien klinik, pelayanan reservasi hotel, diagnosa kulit/rambut spa).';

  // 1. Customized prompt based on current form
  const promptKustom = `Bertindaklah sebagai ${roleText} di SMK Bakti Putra Mandiri dan Pakar Pembuat Soal CAT Berbasis HOTS.

Saya ingin Anda membuatkan paket bank soal ${isPAS ? 'UJIAN AKHIR SEMESTER (PAS/PAT)' : 'PENILAIAN TENGAH SEMESTER (PTS)'} berformat standar AIKEN yang langsung siap diimpor ke sistem CBT Sekolah. Tuliskan blok parameter administrasi ini di baris paling awal dokumen persis seperti di bawah:

[ID_GURU_LOGIN]     = ${namaGuru || 'Guru Pengampu'}
[MAPEL_DIAMPU]      = ${namaMapel || 'Mata Pelajaran'}
[LINGKUP_MATERI]   = ${lingkupMateri || (isPenjas ? 'Kebugaran Jasmani & Pola Hidup Sehat' : 'Kompetensi Terapan')}
[BAB]               = ${bab || (isPenjas ? 'Bab 1: Analisis Kebugaran Jasmani Terapan' : 'Bab Terkait')}
[SASARAN_KELAS]     = ${targetKelas.length > 0 ? targetKelas.join(', ') : 'Semua Kelas'}
[JENIS_UJIAN]       = ${jenisUjian}
[WAKTU_UJIAN]       = ${durasi} Menit
[TOKEN_SAYA]        = ${token}
[STATUS_DOKUMEN]    = READY
[MODE_CETAK]        = SUPPORT_OFFLINE_PRINTING
---

ATURAN STRUKTUR SOAL WAJIB (FORMAT AIKEN):
1. Buat total ${targetPG} Soal Pilihan Ganda (PG) dan 5 Soal Isian Singkat.
2. Karakteristik Soal HOTS:
   ${studiKasusKustom}
   - Memerlukan daya nalar tingkat tinggi (C4 Analisis, C5 Evaluasi, C6 Kreasi).
3. Format Pilihan Ganda (PG):
   - Tulis pertanyaan tanpa nomor di awal baris.
   - Opsi pilihan ditulis:
     A. [Teks Opsi A]
     B. [Teks Opsi B]
     C. [Teks Opsi C]
     D. [Teks Opsi D]
     E. [Teks Opsi E]
   - Kunci jawaban ditulis tepat di bawah baris opsi E dengan format:
     ANSWER: [Huruf Kunci A/B/C/D/E]
   - Berikan satu baris kosong di antara setiap butir soal.
4. Format Soal Isian Singkat:
   - Tuliskan pembatas tepat sebelum soal isian: "=== BAGIAN SOAL ISIAN ==="
   - Tulis naskah pertanyaan isian.
   - Kunci jawaban ditulis di bawah pertanyaan dengan format:
     ANSWER_KEY: [Kunci Jawaban Singkat]

Buatkan seluruh butir soal lengkap sekarang tanpa terpotong!`;

  // 2. Standard PAS Prompt
  const promptPAS = `Bertindaklah sebagai ${roleText} di SMK Bakti Putra Mandiri dan Pakar Pembuat Naskah Soal CAT HOTS.

Buatkan paket bank soal Penilaian Akhir Semester (PAS) Standar Kurikulum Merdeka Kejuruan dengan spesifikasi berikut:

[ID_GURU_LOGIN]     = ${namaGuru || 'Guru Pengampu'}
[MAPEL_DIAMPU]      = ${namaMapel || 'Mata Pelajaran Terapan'}
[LINGKUP_MATERI]   = ${lingkupMateri || (isPenjas ? 'Standar Kebugaran Jasmani & Keterampilan Olahraga' : 'Standar Kompetensi Kejuruan Terpadu')}
[BAB]               = ${bab || 'Penilaian Akhir Semester (Komprehensif)'}
[SASARAN_KELAS]     = ${targetKelas.length > 0 ? targetKelas.join(', ') : 'Kelas X/XI/XII'}
[JENIS_UJIAN]       = UJIAN_AKHIR
[WAKTU_UJIAN]       = ${durasi} Menit
[TOKEN_SAYA]        = ${token}
[STATUS_DOKUMEN]    = READY
[MODE_CETAK]        = SUPPORT_OFFLINE_PRINTING
---

STRUKTUR FORMAT AIKEN:
- Wajib 40 Butir Pilihan Ganda (Opsi A sampai E, diakhiri "ANSWER: X")
- Wajib 5 Butir Isian Singkat (Diawali "=== BAGIAN SOAL ISIAN ===", diakhiri "ANSWER_KEY: Jawaban")
- Seluruh butir soal harus berbasis studi kasus kontekstual dengan tingkat kesulitan HOTS (Higher Order Thinking Skills).`;

  // 3. Standard PTS Prompt
  const promptPTS = `Bertindaklah sebagai ${roleText} di SMK Bakti Putra Mandiri dan Pakar Pembuat Naskah Soal CAT HOTS.

Buatkan paket bank soal Penilaian Tengah Semester (PTS) Standar Kurikulum Merdeka dengan spesifikasi berikut:

[ID_GURU_LOGIN]     = ${namaGuru || 'Guru Pengampu'}
[MAPEL_DIAMPU]      = ${namaMapel || 'Mata Pelajaran Terapan'}
[LINGKUP_MATERI]   = ${lingkupMateri || 'Capaian Pembelajaran Tengah Semester'}
[BAB]               = ${bab || 'Evaluasi Teori & Prosedur Praktik'}
[SASARAN_KELAS]     = ${targetKelas.length > 0 ? targetKelas.join(', ') : 'Kelas X/XI/XII'}
[JENIS_UJIAN]       = UJIAN_TENGAH_SEMESTER
[WAKTU_UJIAN]       = 60 Menit
[TOKEN_SAYA]        = ${token}
[STATUS_DOKUMEN]    = READY
[MODE_CETAK]        = SUPPORT_OFFLINE_PRINTING
---

STRUKTUR FORMAT AIKEN:
- Wajib 30 Butir Pilihan Ganda (Opsi A sampai E, diakhiri "ANSWER: X")
- Wajib 5 Butir Isian Singkat (Diawali "=== BAGIAN SOAL ISIAN ===", diakhiri "ANSWER_KEY: Jawaban")
- Butir soal menguji pemahaman konsep, analisis kasus, dan prosedur praktik yang akurat.`;

  // 4. Sample ready-to-use Aiken questions
  const contohAiken = isPenjas ? `[ID_GURU_LOGIN]     = ${namaGuru || 'Guru Pengampu'}
[MAPEL_DIAMPU]      = ${namaMapel || 'Pendidikan Jasmani, Olahraga & Kesehatan'}
[LINGKUP_MATERI]   = Kebugaran Jasmani, Keterampilan Gerak & Pola Hidup Sehat
[BAB]               = Bab 1: Analisis Kebugaran Jasmani Terapan & Permainan Bola Besar
[SASARAN_KELAS]     = ${targetKelas.length > 0 ? targetKelas.join(', ') : 'X-KESEHATAN-1'}
[JENIS_UJIAN]       = ${jenisUjian}
[WAKTU_UJIAN]       = ${durasi} Menit
[TOKEN_SAYA]        = ${token}
[STATUS_DOKUMEN]    = READY
[MODE_CETAK]        = SUPPORT_OFFLINE_PRINTING
---

Dalam permainan bola basket modern, seorang guard melakukan penetrasi cepat ke area pertahanan lawan dan dihadang oleh dua center lawan yang memiliki postur tinggi. Teknik passing yang paling efektif dengan lintasan memantul ke lantai untuk memberikan umpan terobosan kepada rekan yang bebas di bawah ring adalah?
A. Bounce pass dengan pantulan sekitar 2/3 jarak dari rekan penerima bola
B. Chest pass setinggi dada dengan gerakan putaran bola backspin
C. Overhead pass melambung tinggi melewati atas kepala pemain bertahan
D. Baseball pass jarak jauh menggunakan ayunan satu tangan
E. Behind the back pass secara spekulatif tanpa melihat posisi kawan
ANSWER: A

Seorang siswa SMK yang mengikuti tes kebugaran jasmani lari 2,4 km mengalami kram akut pada otot gastrocnemius (betis) sesaat setelah mencapai garis finis akibat dehidrasi dan penumpukan asam laktat. Tindakan pertolongan pertama (first aid) yang paling tepat dan aman dilakukan adalah?
A. Melakukan peregangan statis perlahan dengan menarik ujung telapak kaki ke arah lutut (dorsofleksi) serta mengompres dingin
B. Memijat keras dengan teknik pukulan tapotement tepat di bagian otot yang kram
C. Mengompres dengan air panas mendidih langsung di atas kulit
D. Menekuk lutut secara paksa hingga menyentuh area dada
E. Menginstruksikan siswa untuk langsung berlari sprint pendek guna melancarkan darah
ANSWER: A

Pada cabang olahraga atletik nomor lari jarak pendek (sprint 100 meter), posisi badan pelari saat aba-aba "SIAP" pada start jongkok (crouch start) yang sesuai dengan prinsip biomekanika gerak adalah?
A. Panggul diangkat sedikit lebih tinggi dari bahu dengan berat badan bertumpu pada kedua tangan dan kaki depan
B. Panggul diturunkan lebih rendah dari bahu dan pandangan lurus menatap garis finis
C. Kedua lengan ditekuk ke dalam dan kepala mendongak ke atas
D. Lutut kaki belakang menempel rapat di tanah dan pinggang ditarik ke belakang
E. Berat badan sepenuhnya bertumpu pada kedua lutut tanpa menyentuh balok start
ANSWER: A

Komponen kebugaran jasmani yang paling dominan dilatih melalui rangkaian gerakan push-up, sit-up, dan plank secara berulang selama 60 detik tanpa henti adalah?
A. Daya tahan otot (muscular endurance) dan kekuatan otot (muscular strength)
B. Kecepatan reaksi visual (reaction time) dan kelenturan statis
C. Keseimbangan dinamis dan daya ledak anaerobik murni
D. Fleksibilitas sendi bahu dan koordinasi mata-kaki
E. Kapasitas aerobik paru-jantung jarak maraton
ANSWER: A

Seseorang yang menerapkan pola hidup sehat aktif dianjurkan untuk menghitung denyut nadi maksimal (DNM) sebagai panduan zona latihan aerobik kardiovaskular. Jika seorang remaja berusia 17 tahun ingin berlatih pada intensitas 70% dari denyut nadi maksimalnya, berapakah target denyut nadi latihannya per menit?
A. 142 denyut per menit
B. 120 denyut per menit
C. 165 denyut per menit
D. 185 denyut per menit
E. 203 denyut per menit
ANSWER: A

=== BAGIAN SOAL ISIAN ===

Berapa ukuran standar tinggi net bola voli untuk kategori putra menurut regulasi resmi FIVB / PBVSI?
ANSWER_KEY: 2,43 meter

Bentuk tes kebugaran jasmani lari bolak-balik menempuh jarak 20 meter yang dipandu irama ketukan suara audio (beep) untuk mengukur kapasitas VO2Max disebut?
ANSWER_KEY: Multi-Stage Fitness Test (Bleep Test)` : `[ID_GURU_LOGIN]     = ${namaGuru || 'Guru Pengampu'}
[MAPEL_DIAMPU]      = ${namaMapel || 'Farmakologi & Pelayanan Resep Klinis'}
[LINGKUP_MATERI]   = Analisis Interaksi Obat & Skrining Resep
[BAB]               = Bab 3: Dispensing Klinis & Keselamatan Pasien
[SASARAN_KELAS]     = ${targetKelas.length > 0 ? targetKelas.join(', ') : 'XII-FARMASI-1'}
[JENIS_UJIAN]       = ${jenisUjian}
[WAKTU_UJIAN]       = ${durasi} Menit
[TOKEN_SAYA]        = ${token}
[STATUS_DOKUMEN]    = READY
[MODE_CETAK]        = SUPPORT_OFFLINE_PRINTING
---

Seorang pasien geriatri berusia 68 tahun datang dengan keluhan nyeri ulu hati dan riwayat hipertensi. Pada resep tertulis kombinasi obat Amlodipine 10mg dan Ketorolac 10mg. Berdasarkan skrining farmakokinetik, potensi interaksi obat yang paling krusial untuk dikomunikasikan kepada dokter penulis resep adalah?
A. Penurunan efektivitas antihipertensi dan peningkatan risiko perdarahan saluran cerna akibat NSAID
B. Ketorolac akan meningkatkan klirens renal dari Amlodipine secara drastis
C. Terjadi kompetisi ikatan protein plasma yang memicu hipotensi ortostatik berat
D. Amlodipine menginaktivasi efek analgesik perifer dari Ketorolac
E. Pengendapan kristaluria pada tubulus ginjal akibat penurunan pH urin
ANSWER: A

Dalam peracikan sediaan serbuk bagi (pulveres) yang mengandung bahan higroskopis seperti Ekstrak Belladonnae dan Natrium Bromida, tindakan teknis yang harus diambil asisten apoteker di meja laboratorium agar serbuk tidak basah atau mencair adalah?
A. Menggerus bahan higroskopis bersama laktosa dalam keadaan mortir hangat
B. Menambahkan pelarut etanol 96% sebelum digerus
C. Mengganti bahan higroskopis dengan senyawa kalsium laktat
D. Menghaluskan bahan di mortir dingin tanpa bahan pengisi
E. Mengemas serbuk dalam amplop kertas perkamen terbuka
ANSWER: A

Berdasarkan Permenkes tentang Standar Pelayanan Kefarmasian di Apotek, suhu penyimpanan ideal untuk sediaan suspensi antibiotik rekonstitusi setelah dicampur air matang adalah?
A. Suhu beku (-20°C sampai -10°C)
B. Suhu dingin (2°C sampai 8°C) dan terlindung dari cahaya langsung
C. Suhu ruang terkendali (20°C sampai 25°C)
D. Suhu hangat (30°C sampai 40°C)
E. Di atas waterbath konstan 37°C
ANSWER: B

=== BAGIAN SOAL ISIAN ===

Tuliskan singkatan latin dalam resep dokter yang bermakna "tandai tiga kali sehari satu bungkus sebelum makan"?
ANSWER_KEY: S. 3. d. d. pulv. I a.c.

Sebutkan alat perlindungan diri (APD) utama yang wajib dipakai oleh petugas di laboratorium peracikan sediaan sitostatika untuk menghindari inhalasi uap aerosol berbahaya?
ANSWER_KEY: Masker N95 dan BSC (Biological Safety Cabinet)`;

  let currentContent = promptKustom;
  if (activeTab === 'pas') currentContent = promptPAS;
  else if (activeTab === 'pts') currentContent = promptPTS;
  else if (activeTab === 'contoh') currentContent = contohAiken;

  const handleCopy = async () => {
    const ok = await copyTextToClipboard(currentContent);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } else {
      alert('Gagal menyalin teks secara otomatis. Silakan pilih dan salin teks secara manual.');
    }
  };

  const handleApply = () => {
    if (onApplySampleAiken) {
      onApplySampleAiken(contohAiken);
      setApplied(true);
      setTimeout(() => {
        setApplied(false);
        onClose();
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[11px] font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Prompt Engineering & AI Assistant Bank Soal</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
              Template Prompt AI Pembuat Naskah Soal CAT
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Gunakan panduan prompt di bawah ini untuk disalin ke ChatGPT, Gemini, atau Claude guna menyusun bank soal HOTS klinis dalam format standar Aiken secara instan.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors shrink-0"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Guru & Mapel Info Bar */}
        <div className="bg-slate-50 px-5 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-600 font-medium">Guru Pengampu:</span>
            <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">{namaGuru}</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-600 font-medium">Mata Pelajaran:</span>
            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shadow-2xs flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" />
              {namaMapel}
            </span>
          </div>
          <div className="text-[11px] text-slate-500">
            Target: <strong className="text-slate-700">{targetPG} Butir PG & 5 Isian</strong>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="bg-slate-100 p-2 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('kustom')}
            className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'kustom'
                ? 'bg-white text-indigo-900 shadow-xs border border-indigo-100'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Prompt Sesuai Form Ini</span>
          </button>

          <button
            onClick={() => setActiveTab('pas')}
            className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'pas'
                ? 'bg-white text-indigo-900 shadow-xs border border-indigo-100'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>Template Standar PAS (40 PG)</span>
          </button>

          <button
            onClick={() => setActiveTab('pts')}
            className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'pts'
                ? 'bg-white text-indigo-900 shadow-xs border border-indigo-100'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-purple-600" />
            <span>Template Standar PTS (30 PG)</span>
          </button>

          <button
            onClick={() => setActiveTab('contoh')}
            className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'contoh'
                ? 'bg-white text-emerald-900 shadow-xs border border-emerald-100'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-emerald-600" />
            <span>Contoh Soal Aiken Siap Impor</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700">
              {activeTab === 'contoh' 
                ? 'Format Hasil Jadi Naskah Soal Aiken (Siap Diproses):' 
                : 'Teks Prompt Siap Salin ke AI (ChatGPT / Gemini / Claude):'}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {currentContent.length} karakter
            </span>
          </div>

          <div className="relative">
            <textarea
              readOnly
              value={currentContent}
              rows={12}
              className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-900 text-slate-100 text-xs font-mono leading-relaxed focus:outline-none selection:bg-indigo-500 selection:text-white"
            />
          </div>

          {/* Quick Guidance Box */}
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
            <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-[11px] leading-relaxed">
              <strong>Cara Praktis Menggunakan:</strong>
              <ol className="list-decimal list-inside space-y-0.5">
                <li>Klik tombol <strong>"Salin Prompt ke Clipboard"</strong> di bawah.</li>
                <li>Buka ChatGPT (chatgpt.com) atau Google Gemini (gemini.google.com).</li>
                <li>Tempelkan (Ctrl+V) dan kirim pesan. AI akan menghasilkan soal berstandar Aiken lengkap.</li>
                <li>Salin hasil dari AI dan tempelkan langsung ke kotak teks <strong>"Teks Format Soal Aiken"</strong> di menu buat soal!</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {copied && (
              <span className="text-emerald-600 font-bold flex items-center gap-1.5 animate-pulse">
                <CheckCircle2 className="w-4 h-4" />
                Prompt berhasil disalin! Silakan tempel di ChatGPT / Gemini.
              </span>
            )}
            {applied && (
              <span className="text-blue-600 font-bold flex items-center gap-1.5 animate-pulse">
                <CheckCircle2 className="w-4 h-4" />
                Contoh soal berhasil dimasukkan ke form pembuat soal!
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {onApplySampleAiken && (
              <button
                type="button"
                onClick={handleApply}
                className="px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 flex items-center gap-1.5 transition-colors"
                title="Langsung masukkan contoh soal ke input teks Aiken"
              >
                <Bot className="w-4 h-4" />
                <span>Gunakan Contoh Soal Aiken Ini Langsung</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopy}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all hover:scale-102"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Tersalin ke Clipboard!' : 'Salin Prompt ke Clipboard'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
