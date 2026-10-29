/**
 * Client-side service for Gemini AI Question Generation
 * Communicates with server-side endpoint /api/ai/generate-questions
 */

export interface GenerateQuestionsParams {
  prompt?: string;
  namaGuru?: string;
  namaMapel?: string;
  lingkupMateri?: string;
  bab?: string;
  targetKelas?: string[];
  jenisUjian?: 'UJIAN_AKHIR' | 'UJIAN_TENGAH_SEMESTER';
  token?: string;
  waktuUjian?: string;
  jumlahPG?: number;
  jumlahIsian?: number;
  instruksiTambahan?: string;
}

export interface GenerateQuestionsResult {
  success: boolean;
  text?: string;
  modelUsed?: string;
  error?: string;
}

export async function requestAIGenerateQuestions(
  params: GenerateQuestionsParams
): Promise<GenerateQuestionsResult> {
  try {
    const res = await fetch('/api/ai/generate-questions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data.error || `Gagal menghubungi server Gemini AI (Kode ${res.status}).`,
      };
    }

    return {
      success: true,
      text: data.text,
      modelUsed: data.modelUsed,
    };
  } catch (err: any) {
    console.error('requestAIGenerateQuestions error:', err);
    return {
      success: false,
      error: err.message || 'Koneksi ke server AI terputus. Pastikan server aktif.',
    };
  }
}

export interface ParseDocumentResult {
  success: boolean;
  judulUjian?: string;
  soalPG?: any[];
  soalIsian?: any[];
  modelUsed?: string;
  error?: string;
}

export async function requestAIParseExamDocument(
  text: string,
  fileName?: string
): Promise<ParseDocumentResult> {
  try {
    const res = await fetch('/api/ai/parse-exam-document', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, fileName }),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.error || `Gagal memproses dokumen dengan AI (Kode ${res.status}).`,
      };
    }

    return {
      success: true,
      judulUjian: data.judulUjian,
      soalPG: data.soalPG,
      soalIsian: data.soalIsian,
      modelUsed: data.modelUsed,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Koneksi ke server AI terputus.',
    };
  }
}

