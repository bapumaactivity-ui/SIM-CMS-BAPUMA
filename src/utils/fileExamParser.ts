import { SoalPG, SoalIsian } from '../types';

export interface ParseResult {
  soalPG: SoalPG[];
  soalIsian: SoalIsian[];
  detectedTitle?: string;
  totalParsed: number;
  rawText: string;
}

/**
 * Extract plain text from Word document (.docx) via dynamic import
 */
export async function extractTextFromDocx(file: File): Promise<string> {
  const mammothModule = await import('mammoth');
  const mammoth = mammothModule.default || mammothModule;
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value || '';
}

/**
 * Extract plain text from PDF document (.pdf) with fallback via dynamic import
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
      } catch (_) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
      }
    }
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ 
      data: arrayBuffer,
      useWorkerFetch: false,
      useSystemFonts: true,
    });
    const pdfDoc = await loadingTask.promise;
    let fullText = '';

    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      const pageLines: string[] = [];
      let currentY: number | null = null;
      let currentLine = '';

      for (const item of textContent.items) {
        if ('str' in item) {
          const text = item.str;
          const transform = (item as any).transform;
          const y = transform ? transform[5] : null;

          if (currentY !== null && y !== null && Math.abs(y - currentY) > 5) {
            if (currentLine.trim()) pageLines.push(currentLine.trim());
            currentLine = text;
          } else {
            currentLine += (currentLine ? ' ' : '') + text;
          }
          currentY = y;
        }
      }
      if (currentLine.trim()) pageLines.push(currentLine.trim());

      fullText += pageLines.join('\n') + '\n\n';
    }

    if (fullText.trim().length > 0) {
      return fullText.trim();
    }
    throw new Error('PDF kosong atau tidak memiliki teks yang terbaca.');
  } catch (err: any) {
    console.warn('PDF.js standard parse fallback:', err);
    try {
      const rawText = await file.text();
      const textSnippets = rawText.match(/[\w\s\.,;:?!'"\(\)\/\-–—]{6,}/g);
      if (textSnippets && textSnippets.length > 5) {
        return textSnippets.join('\n');
      }
    } catch (_) {}
    throw new Error(`Tidak dapat mengekstrak teks dari berkas PDF "${file.name}". Pastikan berkas PDF bukan hasil pemindaian/scan berupa gambar murni, atau gunakan berkas Microsoft Word (.docx).`);
  }
}

/**
 * Extract text from plain text or Aiken file (.txt, .aiken)
 */
export async function extractTextFromTxt(file: File): Promise<string> {
  return await file.text();
}

/**
 * Master file text extractor supporting .docx, .pdf, and .txt
 */
export async function extractTextFromFile(file: File): Promise<{ text: string; fileType: 'docx' | 'pdf' | 'txt' | 'unknown' }> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.docx') || file.type.includes('wordprocessingml')) {
    const text = await extractTextFromDocx(file);
    return { text, fileType: 'docx' };
  } else if (name.endsWith('.pdf') || file.type === 'application/pdf') {
    const text = await extractTextFromPdf(file);
    return { text, fileType: 'pdf' };
  } else if (name.endsWith('.txt') || name.endsWith('.aiken') || file.type.includes('text')) {
    const text = await extractTextFromTxt(file);
    return { text, fileType: 'txt' };
  } else {
    // Try text as fallback
    try {
      const text = await file.text();
      return { text, fileType: 'txt' };
    } catch {
      throw new Error(`Format file "${file.name}" tidak didukung. Harap gunakan file Word (.docx), PDF (.pdf), atau Teks (.txt).`);
    }
  }
}

/**
 * Local intelligent exam parser
 * Recognizes Indonesian exam papers format from Word and PDF
 */
export function parseExamQuestionsFromText(rawText: string): ParseResult {
  if (!rawText || !rawText.trim()) {
    return { soalPG: [], soalIsian: [], totalParsed: 0, rawText: '' };
  }

  // Normalize line endings
  const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Look for detached answer key section at bottom
  // e.g. "KUNCI JAWABAN: 1. A, 2. B, 3. C" or "1. A \n 2. B"
  const detachedKeysMap: Record<number, 'A' | 'B' | 'C' | 'D' | 'E'> = {};
  const detachedKeyRegex = /(?:kunci\s*jawaban|jawaban\s*benar|kunci\s*soal)[\s\S]*$/i;
  const keySectionMatch = text.match(detachedKeyRegex);

  if (keySectionMatch) {
    const keySectionText = keySectionMatch[0];
    const keyPairs = keySectionText.matchAll(/(\d+)[\.\s:=]+([A-Ea-e])\b/g);
    for (const match of keyPairs) {
      const num = parseInt(match[1], 10);
      const letter = match[2].toUpperCase() as 'A' | 'B' | 'C' | 'D' | 'E';
      detachedKeysMap[num] = letter;
    }
  }

  // Look for potential exam title from top header
  let detectedTitle = '';
  const headerLines = text.split('\n').slice(0, 10);
  for (const line of headerLines) {
    const trimmed = line.trim();
    if (/penilaian|ujian|asesmen|ulangan|pts|pas|pat|us|ukk/i.test(trimmed) && trimmed.length > 5 && trimmed.length < 100) {
      detectedTitle = trimmed;
      break;
    }
  }

  // Split into paragraphs / lines
  const lines = text.split('\n');

  // Check if isian section exists
  // Separator like "BAGIAN II : SOAL ISIAN", "B. SOAL ISIAN", "SOAL ESSAY / ISIAN"
  const isianSeparatorIndex = lines.findIndex(l => 
    /(?:soal\s+isian|bagian\s+(?:ii|b|2)|soal\s+essay|pertanyaan\s+uraian)/i.test(l.trim()) &&
    !/pilihan\s*ganda/i.test(l.trim())
  );

  let pgLines = lines;
  let isianLines: string[] = [];

  if (isianSeparatorIndex !== -1) {
    pgLines = lines.slice(0, isianSeparatorIndex);
    isianLines = lines.slice(isianSeparatorIndex + 1);
  }

  // Parse PG
  const soalPG: SoalPG[] = parseMultipleChoiceLines(pgLines, detachedKeysMap);

  // Parse Isian
  const soalIsian: SoalIsian[] = isianLines.length > 0 ? parseIsianLines(isianLines) : [];

  return {
    soalPG,
    soalIsian,
    detectedTitle: detectedTitle || undefined,
    totalParsed: soalPG.length + soalIsian.length,
    rawText,
  };
}

/**
 * Helper to parse multiple choice questions from lines of text
 */
function parseMultipleChoiceLines(
  lines: string[], 
  detachedKeysMap: Record<number, 'A' | 'B' | 'C' | 'D' | 'E'>
): SoalPG[] {
  const result: SoalPG[] = [];
  
  // Group lines into question blocks
  // A question starts with number like "1.", "1)", "[1]", "Soal 1.", "No. 1:"
  const questionNumberRegex = /^(?:soal\s+|no\.?\s*)?(\d+)[\.\)]\s*(.*)$/i;
  
  interface RawQuestionBlock {
    rawNumber: number;
    lines: string[];
  }

  const blocks: RawQuestionBlock[] = [];
  let currentBlock: RawQuestionBlock | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check if line starts a new question
    const qMatch = trimmed.match(questionNumberRegex);
    // Ignore lines that look like options e.g. "A. ..." or "B. ..."
    const isOptionStart = /^[A-Ea-e][\.\)]\s+/.test(trimmed);

    if (qMatch && !isOptionStart) {
      if (currentBlock) {
        blocks.push(currentBlock);
      }
      currentBlock = {
        rawNumber: parseInt(qMatch[1], 10),
        lines: [qMatch[2] ? qMatch[2] : trimmed],
      };
    } else if (currentBlock) {
      currentBlock.lines.push(trimmed);
    }
  }

  if (currentBlock) {
    blocks.push(currentBlock);
  }

  // If no numbered blocks found, fallback to Aiken-style empty-line blocks
  if (blocks.length === 0) {
    const full = lines.join('\n');
    const aikenBlocks = full.split(/\n\s*\n/);
    aikenBlocks.forEach((ab, idx) => {
      const abLines = ab.split('\n').map(l => l.trim()).filter(Boolean);
      if (abLines.length >= 3) {
        blocks.push({
          rawNumber: idx + 1,
          lines: abLines,
        });
      }
    });
  }

  // Now process each block into SoalPG
  blocks.forEach((block, index) => {
    let questionText = '';
    const opsi: { a: string; b: string; c: string; d: string; e: string } = {
      a: '',
      b: '',
      c: '',
      d: '',
      e: '',
    };
    let kunci: 'A' | 'B' | 'C' | 'D' | 'E' = detachedKeysMap[block.rawNumber] || 'A';
    let pembahasan = '';
    let currentOption: 'a' | 'b' | 'c' | 'd' | 'e' | null = null;

    for (let i = 0; i < block.lines.length; i++) {
      const line = block.lines[i];

      // Check for inline answer key: e.g. "Kunci: A", "Jawaban: B", "ANSWER: C"
      const keyMatch = line.match(/(?:kunci|jawaban|answer|kunci\s*jawaban)[\s:=]+([A-Ea-e])\b/i);
      if (keyMatch) {
        kunci = keyMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D' | 'E';
        continue;
      }

      // Check for explanation: "Pembahasan: ..."
      const pembMatch = line.match(/(?:pembahasan|penjelasan|alasan)[\s:=]+(.*)$/i);
      if (pembMatch) {
        pembahasan = pembMatch[1].trim();
        continue;
      }

      // Check for option prefix: "A. ...", "A) ...", "a. ...", "(A) ..."
      const optMatch = line.match(/^[\(\[]?([A-Ea-e])[\)\]\.]\s*(.*)$/);
      if (optMatch) {
        const optLetter = optMatch[1].toLowerCase() as 'a' | 'b' | 'c' | 'd' | 'e';
        currentOption = optLetter;
        opsi[optLetter] = optMatch[2].trim();
      } else if (currentOption) {
        // Multi-line option continuation
        opsi[currentOption] += ' ' + line.trim();
      } else {
        // Question text continuation
        questionText += (questionText ? ' ' : '') + line.trim();
      }
    }

    // Clean question text if it still contains question number prefix
    questionText = questionText.replace(/^(?:soal\s+|no\.?\s*)?\d+[\.\)]\s*/i, '').trim();

    // Verify it has at least question text and options A and B
    if (questionText && (opsi.a || opsi.b)) {
      result.push({
        id: `pg-upload-${Date.now()}-${index + 1}`,
        nomor: index + 1,
        pertanyaan: questionText,
        opsi: {
          a: opsi.a || '-',
          b: opsi.b || '-',
          c: opsi.c || '-',
          d: opsi.d || '-',
          e: opsi.e || '-',
        },
        kunci,
        pembahasan: pembahasan || 'Diimpor dari dokumen soal',
      });
    }
  });

  return result;
}

/**
 * Helper to parse fill-in-the-blank / essay questions
 */
function parseIsianLines(lines: string[]): SoalIsian[] {
  const result: SoalIsian[] = [];
  const questionNumberRegex = /^(?:soal\s+|no\.?\s*)?(\d+)[\.\)]\s*(.*)$/i;

  let currentPertanyaan = '';
  let currentKunci = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const qMatch = trimmed.match(questionNumberRegex);
    if (qMatch) {
      if (currentPertanyaan) {
        result.push({
          id: `isian-upload-${Date.now()}-${result.length + 1}`,
          nomor: result.length + 1,
          pertanyaan: currentPertanyaan.trim(),
          kunci: currentKunci.trim() || 'Jawaban singkat sesuai materi',
          kunciJawaban: currentKunci.trim() || 'Jawaban singkat sesuai materi',
        });
      }
      currentPertanyaan = qMatch[2] || trimmed;
      currentKunci = '';
    } else {
      const keyMatch = trimmed.match(/(?:kunci|jawaban|answer_key)[\s:=]+(.*)$/i);
      if (keyMatch) {
        currentKunci = keyMatch[1].trim();
      } else {
        currentPertanyaan += (currentPertanyaan ? ' ' : '') + trimmed;
      }
    }
  }

  if (currentPertanyaan) {
    result.push({
      id: `isian-upload-${Date.now()}-${result.length + 1}`,
      nomor: result.length + 1,
      pertanyaan: currentPertanyaan.trim(),
      kunci: currentKunci.trim() || 'Jawaban singkat sesuai materi',
      kunciJawaban: currentKunci.trim() || 'Jawaban singkat sesuai materi',
    });
  }

  return result;
}
