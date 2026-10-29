import { SoalPG, SoalIsian, JenisUjian, StatusDokumen } from '../types';

export interface ParseResult {
  metadata: {
    idGuruLogin?: string;
    mapelDiampu?: string;
    lingkupMateri?: string;
    bab?: string;
    sasaranKelas?: string[];
    jenisUjian?: JenisUjian;
    waktuUjian?: string;
    token?: string;
    statusDokumen?: StatusDokumen;
    modeCetak?: string;
    rawMeta: Record<string, string>;
  };
  soalPG: SoalPG[];
  soalIsian: SoalIsian[];
  errors: string[];
}

export function parseAikenUjian(rawText: string): ParseResult {
  const lines = rawText.replace(/\r/g, '').split('\n');
  const metadata: Record<string, string> = {};
  const soalPG: SoalPG[] = [];
  const soalIsian: SoalIsian[] = [];
  const errors: string[] = [];

  let isBagianIsian = false;
  let currentPertanyaan = '';
  let currentOptions: Record<string, string> = {};
  let pgCounter = 1;
  let isianCounter = 1;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) continue;

    // 1. Metadata in brackets: [KEY] = VALUE
    const metaMatch = line.match(/^\[(.*?)\]\s*=\s*(.*?)$/);
    if (metaMatch) {
      metadata[metaMatch[1].trim()] = metaMatch[2].trim();
      continue;
    }

    if (line === '---' || line.startsWith('---')) {
      continue;
    }

    // 2. Section divider for short answers
    if (line.toUpperCase().includes('BAGIAN SOAL ISIAN')) {
      isBagianIsian = true;
      currentPertanyaan = '';
      continue;
    }

    if (!isBagianIsian) {
      // Pilihan Ganda (Aiken format)
      // Check for Option: A. Text or A) Text
      const optMatch = line.match(/^([A-E])[\.\)]\s*(.*)$/i);
      if (optMatch) {
        const key = optMatch[1].toLowerCase();
        currentOptions[key] = optMatch[2].trim();
        continue;
      }

      // Check for Answer: ANSWER: A
      const ansMatch = line.match(/^ANSWER:\s*([A-E])/i);
      if (ansMatch) {
        if (!currentPertanyaan) {
          errors.push(`Baris ${i + 1}: Kunci jawaban ditemukan tanpa teks pertanyaan.`);
        } else {
          soalPG.push({
            id: `pg-parsed-${pgCounter}`,
            nomor: pgCounter,
            pertanyaan: currentPertanyaan.trim(),
            opsi: {
              a: currentOptions['a'] || '',
              b: currentOptions['b'] || '',
              c: currentOptions['c'] || '',
              d: currentOptions['d'] || '',
              e: currentOptions['e'] || '',
            },
            kunci: ansMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D' | 'E',
          });
          pgCounter++;
          currentPertanyaan = '';
          currentOptions = {};
        }
        continue;
      }

      // If not option or answer, it's question body
      if (currentPertanyaan) {
        currentPertanyaan += ' ' + line;
      } else {
        currentPertanyaan = line;
      }
    } else {
      // Isian Singkat
      const ansKeyMatch = line.match(/^ANSWER_KEY:\s*(.*)$/i);
      if (ansKeyMatch) {
        if (!currentPertanyaan) {
          errors.push(`Baris ${i + 1}: ANSWER_KEY ditemukan tanpa pertanyaan isian.`);
        } else {
          soalIsian.push({
            id: `is-parsed-${isianCounter}`,
            nomor: isianCounter,
            pertanyaan: currentPertanyaan.trim(),
            kunci: ansKeyMatch[1].trim(),
          });
          isianCounter++;
          currentPertanyaan = '';
        }
        continue;
      }

      if (currentPertanyaan) {
        currentPertanyaan += ' ' + line;
      } else {
        currentPertanyaan = line;
      }
    }
  }

  // Parse structured target classes
  let sasaranKelas: string[] | undefined = undefined;
  if (metadata['SASARAN_KELAS'] || metadata['TARGET_KELAS']) {
    const rawKelas = metadata['SASARAN_KELAS'] || metadata['TARGET_KELAS'];
    sasaranKelas = rawKelas.split(',').map(k => k.trim()).filter(Boolean);
  }

  // Determine jenis ujian
  let jenisUjian: JenisUjian = 'UJIAN_TENGAH_SEMESTER';
  const rawJenis = (metadata['JENIS_UJIAN'] || '').toUpperCase();
  if (rawJenis.includes('AKHIR') || rawJenis.includes('PAS') || rawJenis.includes('PAT')) {
    jenisUjian = 'UJIAN_AKHIR';
  }

  // Determine status dokumen
  let statusDokumen: StatusDokumen = 'DRAFT_PROSES';
  const targetPG = jenisUjian === 'UJIAN_AKHIR' ? 40 : 30;
  const targetIsian = 5;

  if (soalPG.length >= targetPG && soalIsian.length >= targetIsian) {
    statusDokumen = 'READY';
  } else if (soalPG.length === 0 && soalIsian.length === 0) {
    statusDokumen = 'BELUM_BUAT';
  } else {
    statusDokumen = 'DRAFT_PROSES';
  }

  return {
    metadata: {
      idGuruLogin: metadata['ID_GURU_LOGIN'] || metadata['AUTH_LOGIN_GURU'],
      mapelDiampu: metadata['MAPEL_DIAMPU'] || metadata['MATA_PELAJARAN'],
      lingkupMateri: metadata['LINGKUP_MATERI'] || metadata['CAPAIAN_PEMBELAJARAN'] || metadata['MATERI'],
      bab: metadata['BAB'] || metadata['POKOK_BAHASAN'] || metadata['BAB_MATERI'],
      sasaranKelas,
      jenisUjian,
      waktuUjian: metadata['WAKTU_UJIAN'] || `${metadata['HARI_TANGGAL'] || ''} ${metadata['JAM_MULAI'] || ''}`,
      token: metadata['TOKEN_SAYA'] || metadata['TOKEN_AKSES'] || metadata['TOKEN'],
      statusDokumen,
      modeCetak: metadata['MODE_CETAK'],
      rawMeta: metadata,
    },
    soalPG,
    soalIsian,
    errors,
  };
}

export function generateTeacherPrompt({
  namaGuru,
  namaMapel,
  lingkupMateri = '',
  bab = '',
  targetKelas = [],
  jenisUjian,
  token,
  waktuUjian,
}: {
  namaGuru: string;
  namaMapel: string;
  lingkupMateri?: string;
  bab?: string;
  targetKelas: string[];
  jenisUjian: JenisUjian;
  token: string;
  waktuUjian: string;
}): string {
  const isPAS = jenisUjian === 'UJIAN_AKHIR';
  const targetPG = isPAS ? 40 : 30;

  const isPenjas = (namaMapel || '').toLowerCase().includes('jasmani') || (namaMapel || '').toLowerCase().includes('pjok');
  const isAgama = (namaMapel || '').toLowerCase().includes('agama') || (namaMapel || '').toLowerCase().includes('pai');

  const roleText = isPenjas 
    ? 'Guru Pendidikan Jasmani, Olahraga & Kesehatan (PJOK) SMK'
    : isAgama 
    ? 'Guru Pendidikan Agama Islam & Budi Pekerti SMK'
    : `Guru Mata Pelajaran ${namaMapel || 'SMK'}`;

  const studiKasusGuidance = isPenjas
    ? 'skenario analisis keterampilan gerak cabang olahraga, komponen kebugaran jasmani, penanganan cedera fisik, pola hidup sehat dan nutrisi atlet'
    : isAgama
    ? 'skenario kontekstual pemahaman ayat/hadits, akhlak mulia dalam pergaulan remaja, fikih ibadah dan muamalah kontemporer'
    : 'studi kasus riil di lapangan kerja (misal: resep obat racikan, rekam medis pasien klinik, pelayanan reservasi hotel, diagnosa kulit/rambut spa)';

  return `Bertindaklah sebagai ${roleText} di SMK Bakti Putra Mandiri, sekaligus Pakar Pembuat Soal CAT Berbasis HOTS. 

Saya ingin Anda membuatkan paket bank soal ${isPAS ? 'UJIAN AKHIR (PAS/PAT)' : 'PENILAIAN TENGAH SEMESTER (PTS)'} sesuai kurikulum dan parameter administrasi resmi sekolah berikut. Tuliskan parameter administrasi ini di baris paling awal dokumen:

1. PARAMETER ADMINISTRASI SOAL (Wajib ditulis di baris awal):
   [ID_GURU_LOGIN]     = ${namaGuru}
   [MAPEL_DIAMPU]      = ${namaMapel}
   [LINGKUP_MATERI]   = ${lingkupMateri || (isPenjas ? 'Kebugaran Jasmani & Pola Hidup Sehat' : 'Kompetensi Terapan')}
   [BAB]               = ${bab || (isPenjas ? 'Bab 1: Analisis Kebugaran Jasmani Terapan' : 'Bab Terkait')}
   [SASARAN_KELAS]     = ${targetKelas.join(', ') || 'Semua Kelas'}
   [JENIS_UJIAN]       = ${jenisUjian}
   [WAKTU_UJIAN]       = ${waktuUjian}
   [TOKEN_SAYA]        = ${token}
   [STATUS_DOKUMEN]    = READY
   [MODE_CETAK]        = SUPPORT_OFFLINE_PRINTING
   ---

2. REGULASI STRUKTUR SOAL & STANDAR KELULUSAN:
   - Anda WAJIB membuat total ${targetPG} Soal Pilihan Ganda (PG) dan 5 Soal Isian Singkat.
   - Materi soal HARUS FOKUS pada Lingkup Materi: "${lingkupMateri || namaMapel}" dan Bab: "${bab || 'Seluruh Bab'}".
   - Pilihan Ganda: Tulis pertanyaan secara bersih tanpa angka nomor di depan. Opsi pilihan A. sampai E. diikuti satu spasi. Kunci jawaban ditulis tepat di bawah opsi E dengan sintaks "ANSWER: [Huruf]".
   - Isian Singkat: Berikan pembatas "=== BAGIAN SOAL ISIAN ===" sebelum masuk ke soal isian singkat. Tuliskan kunci jawaban dengan sintaks "ANSWER_KEY: [Jawaban Singkat]".

3. INDIKATOR SOAL HOTS:
   - Diawali narasi kontekstual (${studiKasusGuidance}) yang menuntut analisis berpikir kritis (C4-C5).
   - Pastikan terminologi baku, keilmuan, dan kunci jawaban 100% akurat.

Hasilkan dokumen bank soal ini sekarang secara lengkap sesuai format di atas.`;
}

/**
 * Konversi daftar soal PG dan Isian kembali ke teks format AIKEN standar
 */
export function exportToAikenText(soalPG: SoalPG[] = [], soalIsian: SoalIsian[] = []): string {
  const parts: string[] = [];

  soalPG.forEach((s) => {
    const qText = (s.pertanyaan || '').trim();
    const optA = (s.opsi?.a || '').trim();
    const optB = (s.opsi?.b || '').trim();
    const optC = (s.opsi?.c || '').trim();
    const optD = (s.opsi?.d || '').trim();
    const optE = (s.opsi?.e || '').trim();
    const ans = (s.kunci || 'A').toUpperCase();

    let block = `${qText}\n`;
    block += `A. ${optA}\n`;
    block += `B. ${optB}\n`;
    if (optC && optC !== '-') block += `C. ${optC}\n`;
    if (optD && optD !== '-') block += `D. ${optD}\n`;
    if (optE && optE !== '-') block += `E. ${optE}\n`;
    block += `ANSWER: ${ans}`;

    parts.push(block);
  });

  if (soalIsian.length > 0) {
    let isianBlock = '=== BAGIAN SOAL ISIAN ===\n';
    soalIsian.forEach((is) => {
      isianBlock += `\n${is.pertanyaan.trim()}\n`;
      isianBlock += `ANSWER_KEY: ${is.kunci.trim()}\n`;
    });
    parts.push(isianBlock.trim());
  }

  return parts.join('\n\n');
}

export const TEMPLATE_PROMPT_GURU_PAS = `Bertindaklah sebagai seorang Guru Produktif SMK Rumpun Kesehatan (Farmasi / Asisten Keperawatan), sekaligus Pakar Pembuat Soal CAT Berbasis HOTS. 

Saya ingin Anda membuatkan paket soal UJIAN AKHIR (PAS/PAT) sesuai batasan hak akses akun saya sebagai Guru Pengampu berikut. Tuliskan parameter administrasi ini di baris paling awal dokumen:

1. PARAMETER AKUN GURU (Wajib ditulis di baris awal):
   [ID_GURU_LOGIN]  = [Nama Guru Pengampu]
   [MAPEL_DIAMPU]   = Simulasi Klinis & Farmakoterapi Kesehatan
   [SASARAN_KELAS]  = XII-FARMASI-1, XII-KEPERAWATAN-1
   [JENIS_UJIAN]    = UJIAN_AKHIR
   [WAKTU_UJIAN]    = Senin, 21 September 2026 | 08:00 WIB | 90 Menit
   [TOKEN_SAYA]     = KSH72A
   [STATUS_DOKUMEN]  = DRAFT_PROSES
   [MODE_CETAK]      = SUPPORT_OFFLINE_PRINTING
   ---

2. REGULASI STRUKTUR SOAL JURUSAN KESEHATAN:
   - Anda WAJIB membuat total 40 Soal Pilihan Ganda (PG) dan 5 Soal Isian Singkat. Semua wajib berbasis HOTS.
   - Pilihan Ganda: Jangan gunakan nomor urut angka di depan pertanyaan. Gunakan format Aiken bersih. Opsi A. sampai E. diikuti satu spasi. Kunci jawaban ditulis tepat di bawah opsi E dengan sintaks "ANSWER: [Huruf]".
   - Isian Singkat: Berikan pembatas "=== BAGIAN SOAL ISIAN ===" sebelum masuk ke soal isian singkat. Untuk isian, gunakan penanda kunci jawaban "ANSWER_KEY: [Jawaban Singkat]".

3. INDIKATOR SOAL HOTS & EKSAK MEDIS:
   - Soal tidak boleh sekadar hafalan definisi. Wajib diawali narasi studi kasus klinis riil (data rekam medis, keluhan fisik pasien, resep dokter, atau situasi darurat di bangsal/apotek) agar siswa harus menganalisis (C4) atau mengevaluasi (C5) terlebih dahulu.
   - Khusus soal eksak (hitung dosis maksimum anak/lansia, pengenceran larutan, rumus tetesan infus, atau balance cairan): Pastikan logika klinis, angka, dan rumusnya 100% akurat. Sediakan opsi pengecoh dari kesalahan hitung yang umum dilakukan siswa.

4. FORMAT DUAL-MODE (ONLINE & OFFLINE PRINTING):
   Pastikan format penulisan bersih tanpa simbol aneh. Jika sewaktu-waktu dokumen ini diekspor oleh sistem ke format cetak kertas (PDF/Word), struktur teks tidak akan rusak dan sistem dapat memunculkan nomor ujian konvensional secara otomatis.

Hasilkan dokumen bank soal UJIAN AKHIR ini sekarang secara lengkap tanpa kalimat pengantar dari AI di luar format di atas.`;

export const TEMPLATE_PROMPT_GURU_PTS = `Bertindaklah sebagai seorang Guru Produktif SMK Rumpun Kesehatan (Farmasi / Asisten Keperawatan), sekaligus Pakar Pembuat Soal CAT Berbasis HOTS. 

Saya ingin Anda membuatkan paket soal UJIAN TENGAH SEMESTER (PTS) sesuai batasan hak akses akun saya sebagai Guru Pengampu berikut. Tuliskan parameter administrasi ini di baris paling awal dokumen:

1. PARAMETER AKUN GURU (Wajib ditulis di baris awal):
   [ID_GURU_LOGIN]  = [Nama Guru Pengampu]
   [MAPEL_DIAMPU]   = Kebutuhan Dasar Manusia (KDM)
   [SASARAN_KELAS]  = XII-KEPERAWATAN-1, XII-KEPERAWATAN-2
   [JENIS_UJIAN]    = UJIAN_TENGAH_SEMESTER
   [WAKTU_UJIAN]    = Selasa, 22 September 2026 | 08:00 WIB | 90 Menit
   [TOKEN_SAYA]     = KDM26X
   [STATUS_DOKUMEN]  = DRAFT_PROSES
   [MODE_CETAK]      = SUPPORT_OFFLINE_PRINTING
   ---

2. REGULASI STRUKTUR SOAL JURUSAN KESEHATAN:
   - Anda WAJIB membuat total 30 Soal Pilihan Ganda (PG) dan 5 Soal Isian Singkat. Semua wajib berbasis HOTS.
   - Pilihan Ganda: Gunakan format Aiken bersih (A. sampai E. diikuti satu spasi, lalu ANSWER: [Huruf]).
   - Isian Singkat: Di bawah pembatas "=== BAGIAN SOAL ISIAN ===" dengan ANSWER_KEY: [Jawaban].
   - Sertakan studi kasus klinis riil dan perhitungan medis/farmasi eksak yang akurat.`;
