import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

// Server-side Gemini Client
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

/**
 * Healthcheck & Configuration status
 */
app.get('/api/ai/status', (req, res) => {
  return res.json({
    status: 'ok',
    hasApiKey: !!apiKey,
    model: 'gemini-3.1-flash-lite',
  });
});

/**
 * Direct Gemini Question Generation Endpoint
 */
app.post('/api/ai/generate-questions', async (req, res) => {
  try {
    const {
      prompt,
      namaGuru = 'Guru Pengampu',
      namaMapel = 'Mata Pelajaran Kejuruan',
      lingkupMateri = '',
      bab = '',
      targetKelas = [],
      jenisUjian = 'UJIAN_TENGAH_SEMESTER',
      token = 'MED2026',
      waktuUjian = '90 Menit',
      jumlahPG,
      jumlahIsian = 5,
      instruksiTambahan = '',
    } = req.body;

    if (!ai) {
      return res.status(503).json({
        error: 'Kunci API Gemini (GEMINI_API_KEY) belum terpasang di Secrets aplikasi. Silakan tambahkan GEMINI_API_KEY di Settings > Secrets.',
      });
    }

    const isPAS = jenisUjian === 'UJIAN_AKHIR';
    const targetCountPG = Number(jumlahPG) || (isPAS ? 40 : 30);
    const targetCountIsian = Number(jumlahIsian) || 5;

    let finalPrompt = prompt;

    if (!finalPrompt) {
      const isPenjas = (namaMapel || '').toLowerCase().includes('jasmani') || (namaMapel || '').toLowerCase().includes('pjok');
      const isAgama = (namaMapel || '').toLowerCase().includes('agama') || (namaMapel || '').toLowerCase().includes('pai');
      const roleText = isPenjas 
        ? 'Guru Pendidikan Jasmani, Olahraga & Kesehatan (PJOK) SMK'
        : isAgama 
        ? 'Guru Pendidikan Agama Islam & Budi Pekerti SMK'
        : `Guru Kejuruan Produktif Mata Pelajaran ${namaMapel || 'SMK'}`;

      const studiKasusGuidance = isPenjas
        ? 'skenario analisis keterampilan gerak cabang olahraga, komponen kebugaran jasmani, penanganan cedera fisik, pola hidup sehat dan nutrisi atlet'
        : isAgama
        ? 'skenario kontekstual pemahaman ayat/hadits, akhlak mulia dalam pergaulan remaja, fikih ibadah dan muamalah kontemporer'
        : 'studi kasus riil di lapangan kerja (misal: peracikan resep obat, etiket dosis, rekam medis pasien klinik asisten keperawatan, keselamatan kerja laboratorium)';

      finalPrompt = `Bertindaklah sebagai ${roleText} di SMK Bakti Putra Mandiri, sekaligus Pakar Pembuat Soal CAT Berbasis HOTS (Higher Order Thinking Skills).

Saya ingin Anda membuatkan paket bank soal ${isPAS ? 'UJIAN AKHIR (PAS/PAT)' : 'PENILAIAN TENGAH SEMESTER (PTS)'} berstandar resmi sekolah.

Tuliskan parameter administrasi ini tepat di baris paling awal dokumen:
[ID_GURU_LOGIN]     = ${namaGuru}
[MAPEL_DIAMPU]      = ${namaMapel}
[LINGKUP_MATERI]   = ${lingkupMateri || (isPenjas ? 'Kebugaran Jasmani & Pola Hidup Sehat' : 'Kompetensi Kejuruan Terapan')}
[BAB]               = ${bab || (isPenjas ? 'Bab 1: Analisis Kebugaran Jasmani Terapan' : 'Kompetensi Inti')}
[SASARAN_KELAS]     = ${Array.isArray(targetKelas) ? targetKelas.join(', ') : targetKelas || 'Semua Kelas'}
[JENIS_UJIAN]       = ${jenisUjian}
[WAKTU_UJIAN]       = ${waktuUjian}
[TOKEN_SAYA]        = ${token}
[STATUS_DOKUMEN]    = READY
[MODE_CETAK]        = SUPPORT_OFFLINE_PRINTING
---

ATURAN STRUKTUR SOAL & FORMAT AIKEN WAJIB DIIKUTI:
1. Buat tepat ${targetCountPG} Soal Pilihan Ganda (PG) dan ${targetCountIsian} Soal Isian Singkat.
2. Materi soal HARUS FOKUS pada Lingkup Materi: "${lingkupMateri || namaMapel}" dan Bab: "${bab || 'Kompetensi Terkait'}".
${instruksiTambahan ? `Catatan Khusus Guru: ${instruksiTambahan}` : ''}
3. FORMAT PILIHAN GANDA (AIKEN):
   - Tulis teks pertanyaan secara langsung tanpa awalan nomor (misal JANGAN pakai "1." atau "Soal 1:").
   - Opsi jawaban A. sampai E. ditulis masing-masing di baris baru dengan huruf kapital diikuti tanda titik dan satu spasi (contoh: "A. Pilihan...").
   - Kunci jawaban ditulis tepat di bawah baris opsi E dengan format persis: "ANSWER: [Huruf]" (contoh: "ANSWER: C").
   - Sisipkan satu baris kosong antar butir soal.

4. FORMAT SOAL ISIAN:
   - Tulis pembatas persis: "=== BAGIAN SOAL ISIAN ===" sebelum butir soal isian pertama.
   - Tulis pertanyaan isian di baris tersendiri tanpa nomor.
   - Tulis kunci jawaban di baris berikutnya dengan format: "ANSWER_KEY: [Kunci Jawaban Singkat]".
   - Sisipkan satu baris kosong antar butir soal isian.

5. INDIKATOR SOAL HOTS (C4-C5):
   - Gunakan stimulus kontekstual (${studiKasusGuidance}) yang menuntut daya analisa, penalaran, dan pemecahan masalah kritis.
   - Pastikan opsi pengecoh (distractor) homogen dan kunci jawaban 100% benar secara keilmuan.

Hasilkan seluruh dokumen naskah soal lengkap sekarang dalam format teks Aiken di atas tanpa penjelasan pembuka/penutup.`;
    }

    // Try models in order: gemini-3.1-flash-lite, then gemini-3.8-flash, then gemini-flash-latest
    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
    let lastError: any = null;
    let generatedText = '';
    let successModel = '';

    for (const modelName of candidateModels) {
      try {
        console.log(`[AI Gen] Generating questions using ${modelName}...`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: finalPrompt,
        });

        if (response.text) {
          generatedText = response.text;
          successModel = modelName;
          break;
        }
      } catch (err: any) {
        console.warn(`[AI Gen] Model ${modelName} failed or busy:`, err?.message || err);
        lastError = err;
      }
    }

    if (!generatedText) {
      throw lastError || new Error('Semua model Gemini sedang mengalami beban tinggi. Silakan coba lagi.');
    }

    // Clean markdown code blocks if any (```aiken or ```)
    let cleanedText = generatedText
      .replace(/^```[a-zA-Z]*\n?/gm, '')
      .replace(/```$/gm, '')
      .trim();

    return res.json({
      text: cleanedText,
      modelUsed: successModel,
      targetPG: targetCountPG,
      targetIsian: targetCountIsian,
    });
  } catch (error: any) {
    console.error('Error in /api/ai/generate-questions:', error);
    return res.status(500).json({
      error: error?.message || 'Gagal menghasilkan bank soal melalui Gemini AI.',
    });
  }
});

/**
 * Intelligent Document Exam Parser using Gemini AI
 * Parses raw text extracted from Word (.docx) or PDF (.pdf) into structured SoalPG & SoalIsian
 */
app.post('/api/ai/parse-exam-document', async (req, res) => {
  try {
    const { text, fileName } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Teks dokumen kosong atau tidak terbaca.' });
    }

    if (!ai) {
      return res.status(503).json({
        error: 'Kunci API Gemini belum dikonfigurasi. Mode parsing lokal otomatis tetap aktif.',
      });
    }

    const truncatedText = text.slice(0, 35000);
    const parsePrompt = `Anda adalah asisten cerdas ekstraksi naskah soal ujian kurikulum SMK.
Berikut adalah teks mentah yang diekstrak dari berkas soal (${fileName || 'Dokumen Soal'}):

--- AWAL TEKS ---
${truncatedText}
--- AKHIR TEKS ---

TUGAS ANDA:
1. Ekstraksi secara akurat SEMUA butir Soal Pilihan Ganda (PG) dan Soal Isian/Essay yang ada dalam teks.
2. Identifikasi pertanyaan, opsi A, B, C, D, E, kunci jawaban yang benar (A, B, C, D, atau E), dan pembahasan singkat.
3. Jika kunci jawaban berada di bagian akhir dokumen (seperti "KUNCI JAWABAN: 1. A, 2. C..."), hubungkan secara akurat ke nomor soal yang sesuai.
4. Pastikan teks pertanyaan bersih dari nomor soal (nomor soal disimpan di atribut "nomor").
5. Format balasan HARUS HANYA JSON MURNI (tanpa tanda kutip tiga markdown \`\`\`json) dengan skema:
{
  "judulUjian": "Judul atau nama ujian jika tertera",
  "soalPG": [
    {
      "nomor": 1,
      "pertanyaan": "Isi pertanyaan lengkap",
      "opsi": {
        "a": "Opsi A",
        "b": "Opsi B",
        "c": "Opsi C",
        "d": "Opsi D",
        "e": "Opsi E"
      },
      "kunci": "A",
      "pembahasan": "Pembahasan atau referensi singkat"
    }
  ],
  "soalIsian": [
    {
      "nomor": 1,
      "pertanyaan": "Isi pertanyaan isian",
      "kunciJawaban": "Kunci jawaban isian"
    }
  ]
}`;

    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
    let aiResponseText = '';
    let usedModel = '';

    for (const model of candidateModels) {
      try {
        console.log(`[AI Parse Document] Attempting parse with ${model}...`);
        const result = await ai.models.generateContent({
          model,
          contents: parsePrompt,
        });
        if (result.text) {
          aiResponseText = result.text;
          usedModel = model;
          break;
        }
      } catch (err: any) {
        console.warn(`[AI Parse Document] Model ${model} failed:`, err?.message || err);
      }
    }

    if (!aiResponseText) {
      return res.status(500).json({ error: 'Gagal memproses dokumen dengan AI. Silakan gunakan pemrosesan lokal.' });
    }

    // Clean potential markdown wrap
    let cleanJson = aiResponseText
      .replace(/^```[a-zA-Z]*\n?/gm, '')
      .replace(/```$/gm, '')
      .trim();

    const parsedData = JSON.parse(cleanJson);
    return res.json({
      success: true,
      modelUsed: usedModel,
      judulUjian: parsedData.judulUjian || '',
      soalPG: parsedData.soalPG || [],
      soalIsian: parsedData.soalIsian || [],
    });
  } catch (err: any) {
    console.error('Error in /api/ai/parse-exam-document:', err);
    return res.status(500).json({
      error: err?.message || 'Gagal mengekstrak struktur soal dengan AI.',
    });
  }
});

/**
 * Start Server with Vite Middleware in Development or Static Files in Production
 */
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log(`[Vite Dev] Middleware attached.`);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SMK Bakti Putra Mandiri Server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
