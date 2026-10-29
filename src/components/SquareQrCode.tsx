import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';

interface SquareQrCodeProps {
  value: string;
  size?: number;
  className?: string;
  darkColor?: string;
  lightColor?: string;
}

// In-memory cache to guarantee instantaneous QR code rendering across cards & previews
const qrCache = new Map<string, string>();

export const SquareQrCode: React.FC<SquareQrCodeProps> = ({
  value,
  size = 140,
  className = '',
  darkColor = '#0f172a',
  lightColor = '#ffffff',
}) => {
  const cacheKey = `${value}_${size}_${darkColor}_${lightColor}`;
  const [dataUrl, setDataUrl] = useState<string>(() => qrCache.get(cacheKey) || '');

  useEffect(() => {
    let isMounted = true;
    if (!value) {
      setDataUrl('');
      return;
    }

    if (qrCache.has(cacheKey)) {
      setDataUrl(qrCache.get(cacheKey)!);
      return;
    }

    QRCode.toDataURL(value, {
      width: size * 2, // 2x for sharp retina / print rendering
      margin: 1,
      color: {
        dark: darkColor,
        light: lightColor,
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        qrCache.set(cacheKey, url);
        if (isMounted) setDataUrl(url);
      })
      .catch((err) => {
        console.error('Failed to generate QR code:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [value, size, darkColor, lightColor, cacheKey]);

  if (!dataUrl) {
    return (
      <div 
        style={{ width: size, height: size }} 
        className={`bg-slate-100 flex items-center justify-center rounded-lg border border-slate-200 animate-pulse ${className}`}
      >
        <span className="text-[10px] text-slate-400">QR Code...</span>
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt={`QR Code: ${value}`}
      width={size}
      height={size}
      className={`object-contain block ${className}`}
      style={{ width: size, height: size }}
    />
  );
};
