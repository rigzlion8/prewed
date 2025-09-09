'use client';

import React, { useState, useEffect } from 'react';

interface QRCodeProps {
  url: string;
  size?: number;
}

export const QRCode: React.FC<QRCodeProps> = ({ url, size = 200 }) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  useEffect(() => {
    // Generate QR code using a simple API
    const generateQRCode = async () => {
      try {
        // Using qr-server.com API (free, no API key required)
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`;
        setQrCodeDataUrl(qrUrl);
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    };

    generateQRCode();
  }, [url, size]);

  if (!qrCodeDataUrl) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <img 
        src={qrCodeDataUrl} 
        alt="QR Code" 
        className="border-2 border-gray-200 rounded-lg"
        style={{ width: size, height: size }}
      />
      <p className="text-xs text-gray-500 mt-2 text-center max-w-xs">
        Scan to visit our pre-wedding website
      </p>
    </div>
  );
};
