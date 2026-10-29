import QRCode from 'qrcode';

/**
 * Generate a 2D Square QR Code Data URL (PNG)
 */
export async function generateQrDataUrl(text: string, options?: QRCode.QRCodeToDataURLOptions): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: options?.width || 256,
      margin: options?.margin ?? 1,
      color: {
        dark: options?.color?.dark || '#0f172a', // Slate 900
        light: options?.color?.light || '#ffffff',
      },
      errorCorrectionLevel: 'M',
      ...options,
    });
  } catch (err) {
    console.error('Error generating QR Code data URL:', err);
    return '';
  }
}

/**
 * Generate a 2D Square QR Code as inline SVG string
 */
export async function generateQrSvgString(text: string, options?: QRCode.QRCodeToStringOptions): Promise<string> {
  try {
    return await QRCode.toString(text, {
      type: 'svg',
      margin: options?.margin ?? 1,
      color: {
        dark: options?.color?.dark || '#0f172a',
        light: options?.color?.light || '#ffffff',
      },
      errorCorrectionLevel: 'M',
      ...options,
    });
  } catch (err) {
    console.error('Error generating QR Code SVG string:', err);
    return '';
  }
}

/**
 * Synchronous client-side lightweight SVG QR Code generator (fallback or fast sync render)
 */
export function getQrCodePlaceholderSvg(text: string): string {
  // Returns clean SVG wrapper
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <rect width="100" height="100" fill="#ffffff" />
    <rect x="10" y="10" width="25" height="25" fill="#0f172a" />
    <rect x="15" y="15" width="15" height="15" fill="#ffffff" />
    <rect x="18" y="18" width="9" height="9" fill="#0f172a" />
    <rect x="65" y="10" width="25" height="25" fill="#0f172a" />
    <rect x="70" y="15" width="15" height="15" fill="#ffffff" />
    <rect x="73" y="18" width="9" height="9" fill="#0f172a" />
    <rect x="10" y="65" width="25" height="25" fill="#0f172a" />
    <rect x="15" y="70" width="15" height="15" fill="#ffffff" />
    <rect x="18" y="73" width="9" height="9" fill="#0f172a" />
    <rect x="45" y="45" width="10" height="10" fill="#0f172a" />
    <rect x="40" y="20" width="10" height="10" fill="#0f172a" />
    <rect x="40" y="70" width="10" height="10" fill="#0f172a" />
    <rect x="65" y="50" width="10" height="10" fill="#0f172a" />
    <rect x="75" y="75" width="15" height="15" fill="#0f172a" />
  </svg>`;
}
