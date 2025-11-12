'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { QRCode } from './QRCode';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  websiteUrl: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, websiteUrl }) => {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  // Countdown timer logic
  useEffect(() => {
    const updateCountdown = () => {
      const ayieDate = new Date('November 15, 2025 14:00:00').getTime();
      const now = new Date().getTime();
      const distance = ayieDate - now;

      if (distance > 0) {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000)
        });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const shareMessage = `🎉 Join us in celebrating Nikita & Kevin's Ruracio! 

Check out our beautiful website with photos, our love story, and upload your own memories:

${websiteUrl}

#Ruracio #NikitaKevinRuracio`;

  const handleWhatsAppShare = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(websiteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(shareMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-black via-gray-900 to-black rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-amber-400">
          <h3 className="text-xl font-semibold text-amber-400">#Ruracio - Share the vibes</h3>
          <button
            onClick={onClose}
            className="text-amber-400 hover:text-amber-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 space-y-8">
          {/* Ruracio Header */}
          <div className="text-center text-white">
            <h1 className="text-3xl md:text-4xl font-serif font-bold mb-2 bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">#Ruracio</h1>
            <p className="text-lg md:text-xl mb-2 text-amber-300">Traditional Ceremony</p>
            <p className="text-base md:text-lg text-amber-200">15.11.2025</p>
          </div>

          {/* Countdown Timer */}
          <div className="text-center">
            <h4 className="text-lg font-medium text-amber-400 mb-4">Countdown to Ruracio</h4>
            <div className="flex justify-center space-x-2 md:space-x-3 flex-wrap">
              <div className="bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg p-2 md:p-3 text-center text-black shadow-lg">
                <span className="block text-xl md:text-2xl font-bold">{timeLeft.days.toString().padStart(2, '0')}</span>
                <span className="text-xs md:text-sm font-semibold">Days</span>
              </div>
              <div className="bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg p-2 md:p-3 text-center text-black shadow-lg">
                <span className="block text-xl md:text-2xl font-bold">{timeLeft.hours.toString().padStart(2, '0')}</span>
                <span className="text-xs md:text-sm font-semibold">Hours</span>
              </div>
              <div className="bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg p-2 md:p-3 text-center text-black shadow-lg">
                <span className="block text-xl md:text-2xl font-bold">{timeLeft.minutes.toString().padStart(2, '0')}</span>
                <span className="text-xs md:text-sm font-semibold">Minutes</span>
              </div>
              <div className="bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg p-2 md:p-3 text-center text-black shadow-lg">
                <span className="block text-xl md:text-2xl font-bold">{timeLeft.seconds.toString().padStart(2, '0')}</span>
                <span className="text-xs md:text-sm font-semibold">Seconds</span>
              </div>
            </div>
          </div>


          {/* QR Code */}
          <div className="text-center">
            <h4 className="text-lg font-medium text-amber-400 mb-4">Share Our Website</h4>
            <QRCode url={websiteUrl} size={180} />
          </div>

          {/* WhatsApp Share */}
          <div className="text-center">
            <h4 className="text-lg font-medium text-amber-400 mb-4">Share on WhatsApp</h4>
            <button
              onClick={handleWhatsAppShare}
              className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
              </svg>
              <span>Share on WhatsApp</span>
            </button>
          </div>

          {/* Copy Options */}
          <div className="space-y-3">
            <h4 className="text-lg font-medium text-amber-400">Copy to Clipboard</h4>
            
            <div className="space-y-2">
              <button
                onClick={handleCopyLink}
                className="w-full bg-gray-800 text-amber-200 py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors text-sm flex items-center justify-between border border-amber-400"
              >
                <span>Copy Website Link</span>
                {copied && <span className="text-green-400 text-xs">Copied!</span>}
              </button>
              
              <button
                onClick={handleCopyMessage}
                className="w-full bg-gray-800 text-amber-200 py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors text-sm flex items-center justify-between border border-amber-400"
              >
                <span>Copy Full Message</span>
                {copied && <span className="text-green-400 text-xs">Copied!</span>}
              </button>
            </div>
          </div>

          {/* Social Media Links */}
          <div className="space-y-3">
            <h4 className="text-lg font-medium text-amber-400">Share on Social Media</h4>
            <div className="grid grid-cols-2 gap-3">
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(websiteUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm text-center"
              >
                Facebook
              </a>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-400 text-white py-2 px-4 rounded-lg hover:bg-blue-500 transition-colors text-sm text-center"
              >
                Twitter
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
