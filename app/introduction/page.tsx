'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { ShareModal } from '@/components/ShareModal';

export default function IntroductionPage() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const websiteUrl = typeof window !== 'undefined' ? window.location.href : 'http://localhost:3004';

  useEffect(() => {
    const updateCountdown = () => {
      const ayieDate = new Date('September 13, 2025 14:00:00').getTime();
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

  return (
    <div className="bg-gradient-to-br from-pink-50 to-purple-50 font-sans">
      {/* Navigation */}
      <nav className="bg-white shadow-lg fixed w-full z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className="text-2xl font-serif text-pink-600">#Nike Moments</span>
            </div>
            <div className="hidden md:flex space-x-8">
              <a href="/" className="text-gray-700 hover:text-pink-600 transition">Home</a>
              <a href="/gallery" className="text-gray-700 hover:text-pink-600 transition">Gallery</a>
              <a href="/introduction" className="text-gray-700 hover:text-pink-600 transition">Introduction</a>
              <a href="/wishes" className="text-gray-700 hover:text-pink-600 transition">Read Wishes</a>
              <a href="/#upload" className="text-gray-700 hover:text-pink-600 transition">Share Memories</a>
              <button 
                onClick={() => setShowShareModal(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                </svg>
                <span>Share</span>
              </button>
              <a href="/gallery" className="bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 transition-colors">View All Photos</a>
            </div>
            <div className="md:hidden">
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        {/* Mobile Menu */}
        <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:hidden bg-white pb-4 px-4`}>
          <a href="/" className="block py-2 text-gray-700 hover:text-pink-600">Home</a>
          <a href="/gallery" className="block py-2 text-gray-700 hover:text-pink-600">Gallery</a>
          <a href="/introduction" className="block py-2 text-gray-700 hover:text-pink-600">Introduction</a>
          <a href="/wishes" className="block py-2 text-gray-700 hover:text-pink-600">Read Wishes</a>
          <a href="/#upload" className="block py-2 text-gray-700 hover:text-pink-600">Share Memories</a>
          <button 
            onClick={() => {
              setShowShareModal(true);
              setIsMobileMenuOpen(false);
            }}
            className="block w-full py-2 bg-green-600 text-white rounded-lg mx-2 text-center hover:bg-green-700 transition-colors"
          >
            Share Website
          </button>
          <a href="/gallery" className="block py-2 bg-pink-600 text-white rounded-lg mx-2 text-center hover:bg-pink-700 transition-colors mt-2">View All Photos</a>
        </div>
      </nav>

      {/* Hero Section with Hashtag and Timer */}
      <section 
        id="home" 
        className="pt-20 pb-32 px-4 bg-gradient-to-br from-black via-gray-900 to-black relative"
      >
        <div className="max-w-4xl mx-auto text-center text-white pt-24">
          <h1 className="text-4xl md:text-6xl font-serif font-bold mb-6 bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">#Nike Moments</h1>
          <p className="text-xl md:text-2xl mb-4 text-yellow-300">He Asked, They said Ayie!</p>
          <p className="text-lg md:text-xl mb-8 text-yellow-200">13.09.2025</p>
          <div className="flex justify-center space-x-2 md:space-x-4 flex-wrap">
            <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg p-3 md:p-4 text-center text-black shadow-lg mb-2">
              <span className="block text-2xl md:text-3xl font-bold">{timeLeft.days.toString().padStart(2, '0')}</span>
              <span className="text-sm md:text-base font-semibold">Days</span>
            </div>
            <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg p-3 md:p-4 text-center text-black shadow-lg mb-2">
              <span className="block text-2xl md:text-3xl font-bold">{timeLeft.hours.toString().padStart(2, '0')}</span>
              <span className="text-sm md:text-base font-semibold">Hours</span>
            </div>
            <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg p-3 md:p-4 text-center text-black shadow-lg mb-2">
              <span className="block text-2xl md:text-3xl font-bold">{timeLeft.minutes.toString().padStart(2, '0')}</span>
              <span className="text-sm md:text-base font-semibold">Minutes</span>
            </div>
            <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg p-3 md:p-4 text-center text-black shadow-lg mb-2">
              <span className="block text-2xl md:text-3xl font-bold">{timeLeft.seconds.toString().padStart(2, '0')}</span>
              <span className="text-sm md:text-base font-semibold">Seconds</span>
            </div>
          </div>
          
          {/* Share Button */}
          <div className="mt-8">
              <button 
                onClick={() => setShowShareModal(true)}
                className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-6 py-3 rounded-lg hover:from-yellow-500 hover:to-yellow-700 transition-all font-semibold flex items-center space-x-2 mx-auto shadow-lg"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zm6 12h8v-8h-8v8zm2-6h4v4h-4v-4zM3 21h8v-8H3v8zm2-6h4v4H5v-4zm8-6V3h8v8h-8zm6-6h-4v4h4V3z"/>
                </svg>
                <span>Share QR Code</span>
              </button>
          </div>
        </div>
      </section>

      {/* Ayie Moments Section */}
      <section id="about" className="py-16 px-4 bg-gradient-to-br from-gray-900 via-black to-gray-800">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-center text-yellow-400 mb-12">#Nike Moments</h2>
          
          {/* Initial Write-up */}
          <div className="text-center text-white mb-12">
            <p className="text-lg md:text-xl leading-relaxed max-w-4xl mx-auto">
              Drumroll, please… 🥁 The stars of the Ayie have entered the chat! 💕✨ Before we get to the dance floor fails, the epic selfies, and the unforgettable squad moments, here's a little peek at the bride and groom stealing the spotlight (as they should 😉). Once you've admired these, it's your turn — upload your photos and let's relive the magic together! 📸🎊
            </p>
          </div>
          
          {/* Two Photos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mb-12">
            <div className="relative w-full h-[32rem] md:h-[40rem] lg:h-[44rem] image-container bg-gray-100 rounded-2xl overflow-hidden" style={{ position: 'relative', height: '512px', minHeight: '512px' }}>
              <Image 
                src="/images/nikita-kevin.jpg" 
                alt="Nikita & Kevin" 
                fill
                className="rounded-2xl shadow-lg object-contain border-2 border-yellow-400"
                style={{ objectPosition: 'center center' }}
              />
            </div>
            <div className="relative w-full h-[32rem] md:h-[40rem] lg:h-[44rem] image-container bg-gray-100 rounded-2xl overflow-hidden" style={{ position: 'relative', height: '512px', minHeight: '512px' }}>
              <Image 
                src="/images/nikita-kevin002.jpg" 
                alt="Ayie Moments" 
                fill
                className="rounded-2xl shadow-lg object-contain border-2 border-yellow-400"
                style={{ objectPosition: 'center center' }}
              />
            </div>
          </div>
          
          {/* Gallery Button */}
          <div className="text-center mt-4 md:mt-6">
            <a
              href="/gallery"
              className="inline-block bg-pink-600 text-white px-6 py-3 rounded-lg hover:bg-pink-700 transition-colors"
            >
              View Gallery
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-black via-gray-900 to-black text-white py-12 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-8">
            <h3 className="text-2xl font-serif font-bold mb-6 text-yellow-400">#Nike Moments</h3>
            <p className="text-lg text-yellow-200 mb-4">Ayie Ceremony</p>
            <p className="text-yellow-300 mb-6">13.09.2025</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="text-center md:text-left">
              <h3 className="text-xl font-bold mb-4 text-yellow-400">Quick Links</h3>
              <ul className="space-y-2">
                <li><a href="/" className="text-yellow-200 hover:text-yellow-400 transition">Home</a></li>
                <li><a href="/gallery" className="text-yellow-200 hover:text-yellow-400 transition">Gallery</a></li>
                <li><a href="/introduction" className="text-yellow-200 hover:text-yellow-400 transition">Introduction</a></li>
                <li><a href="/wishes" className="text-yellow-200 hover:text-yellow-400 transition">Read Wishes</a></li>
                <li><a href="/#upload" className="text-yellow-200 hover:text-yellow-400 transition">Share Memories</a></li>
              </ul>
            </div>
            <div className="text-center md:text-left">
              <h3 className="text-xl font-bold mb-4 text-yellow-400">Contact Us</h3>
              <p className="text-yellow-200 mb-2">Have questions about the Nyombo?</p>
              <p className="text-yellow-200">Email: nikitaaymanz@gmail.com</p>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-8 pt-8 border-t border-yellow-400 text-center text-yellow-200">
          <p>© 2025 #Nike Moments - Nyombo Ceremony. All rights reserved.</p>
        </div>
      </footer>

      {/* Share Modal */}
      <ShareModal 
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        websiteUrl={websiteUrl}
      />
    </div>
  );
}


