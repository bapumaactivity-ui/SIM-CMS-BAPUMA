/**
 * Barcode & Identification Utility for SMK Bakti Putra Mandiri
 * Generates Code 128 / Code 39 SVG barcodes for student NIPD & NISN
 */

// Code 39 Character encoding table (patterns of 9 bars: 0=narrow bar, 1=wide bar, 0=narrow space, 1=wide space)
const CODE39_PATTERNS: { [char: string]: string } = {
  '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000',
  '4': '000110001', '5': '100110000', '6': '001110000', '7': '000100101',
  '8': '100100100', '9': '001100100', 'A': '100001001', 'B': '001001001',
  'C': '101001000', 'D': '000011001', 'E': '100011000', 'F': '001011000',
  'G': '000001101', 'H': '100001100', 'I': '001001100', 'J': '000011100',
  'K': '100000011', 'L': '001000011', 'M': '101000010', 'N': '000010011',
  'O': '100010010', 'P': '001010010', 'Q': '000000111', 'R': '100000110',
  'S': '001000110', 'T': '000010110', 'U': '110000001', 'V': '011000001',
  'W': '111000000', 'X': '010010001', 'Y': '110010000', 'Z': '011010000',
  '-': '010000101', '.': '110000100', ' ': '011000100', '$': '010101000',
  '/': '010100010', '+': '010001010', '%': '000101010', '*': '010010100'
};

/**
 * Generate an SVG barcode string for any text (e.g. NIPD "24.25.10.001")
 */
export function generateBarcodeSvg(value: string, width = 240, height = 65, showText = true): string {
  const clean = value.toUpperCase().replace(/[^0-9A-Z\-.\s$/+%]/g, '');
  const encoded = `*${clean}*`;
  
  let currentX = 10;
  const narrowWidth = 1.8;
  const wideWidth = 4.2;
  const barHeight = showText ? height - 18 : height - 6;

  const rects: string[] = [];

  for (let i = 0; i < encoded.length; i++) {
    const char = encoded[i];
    const pattern = CODE39_PATTERNS[char] || CODE39_PATTERNS['-'];

    for (let j = 0; j < 9; j++) {
      const isBar = j % 2 === 0;
      const isWide = pattern[j] === '1';
      const elementWidth = isWide ? wideWidth : narrowWidth;

      if (isBar) {
        rects.push(`<rect x="${currentX.toFixed(1)}" y="4" width="${elementWidth.toFixed(1)}" height="${barHeight}" fill="#0f172a" />`);
      }
      currentX += elementWidth;
    }
    // Inter-character gap
    currentX += narrowWidth;
  }

  const totalWidth = Math.max(width, currentX + 10);
  const textElement = showText ? `
    <text x="${(totalWidth / 2).toFixed(1)}" y="${height - 2}" font-family="monospace, Courier" font-size="11" font-weight="700" letter-spacing="2" text-anchor="middle" fill="#1e293b">${value}</text>
  ` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${height}" width="100%" height="${height}" style="background:#ffffff; border-radius:4px;">
    ${rects.join('')}
    ${textElement}
  </svg>`;
}

export const generateCode39Svg = generateBarcodeSvg;

