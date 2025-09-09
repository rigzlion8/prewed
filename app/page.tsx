'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useMedia, MediaItem } from '@/hooks/useMedia';
import { useWishes } from '@/hooks/useWishes';
import { UPLOAD_LIMITS, getFileSize } from '@/lib/upload';
import { ShareModal } from '@/components/ShareModal';
import { compressImages, formatFileSize, getCompressionQualityLabel, MEDIUM_QUALITY_OPTIONS, CompressionResult } from '@/lib/compression';

export default function HomePage() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [uploadedBy, setUploadedBy] = useState('');
  const [caption, setCaption] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFailed, setUploadFailed] = useState(false);
  const [lastUploadError, setLastUploadError] = useState<string>('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [compressionResults, setCompressionResults] = useState<CompressionResult[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionQuality, setCompressionQuality] = useState<'high' | 'medium' | 'low'>('medium');
  const [wishName, setWishName] = useState('');
  const [wishMessage, setWishMessage] = useState('');
  const [wishStatus, setWishStatus] = useState('');
  const [isSubmittingWish, setIsSubmittingWish] = useState(false);
  const [selectedFileList, setSelectedFileList] = useState<File[]>([]);
  
  const { media, loading, error, uploadMedia, deleteMedia } = useMedia();
  const { submitWish } = useWishes();
  
  // Get the current website URL
  const websiteUrl = typeof window !== 'undefined' ? window.location.href : 'http://localhost:3004';

  useEffect(() => {
    const updateCountdown = () => {
      const weddingDate = new Date('October 12, 2025 14:00:00').getTime();
      const now = new Date().getTime();
      const distance = weddingDate - now;

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

  const handleWishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!wishName.trim() || !wishMessage.trim()) {
      setWishStatus('Please fill in both name and message fields.');
      return;
    }

    setIsSubmittingWish(true);
    setWishStatus('');

    try {
      const result = await submitWish(wishName.trim(), wishMessage.trim());
      
      if (result.success) {
        setWishStatus(result.message || 'Thank you for your beautiful wish! We truly appreciate your kind words.');
        setWishName('');
        setWishMessage('');
        // Clear status after 5 seconds
        setTimeout(() => setWishStatus(''), 5000);
      } else {
        setWishStatus(result.error || 'Failed to submit wish. Please try again.');
      }
    } catch (error) {
      setWishStatus('Failed to submit wish. Please try again.');
    } finally {
      setIsSubmittingWish(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(e.target.files);
      setSelectedFileList(prev => [...prev, ...newFiles]);
      setUploadStatus(`Selected ${e.target.files.length} file(s)`);
      setUploadFailed(false);
      setLastUploadError('');
    }
  };

  const removeFile = (index: number) => {
    const newFileList = selectedFileList.filter((_, i) => i !== index);
    setSelectedFileList(newFileList);
    
    // Create new FileList from remaining files
    const dataTransfer = new DataTransfer();
    newFileList.forEach(file => dataTransfer.items.add(file));
    setSelectedFiles(dataTransfer.files);
    
    setUploadStatus(newFileList.length > 0 ? `${newFileList.length} file(s) selected` : '');
  };

  const clearAllFiles = () => {
    setSelectedFileList([]);
    setSelectedFiles(null);
    setUploadStatus('');
    // Reset file input
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleUpload = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!selectedFiles || selectedFiles.length === 0) {
      setUploadStatus('Please select files to upload');
      return;
    }

    setIsUploading(true);
    setIsCompressing(true);
    setUploadProgress(0);
    setUploadStatus('Compressing images...');
    setUploadFailed(false);
    setLastUploadError('');
    
    try {
      // Get compression options based on quality setting
      const compressionOptions = compressionQuality === 'high' ? 
        { maxSizeMB: 5, maxWidthOrHeight: 2560, useWebWorker: true, quality: 0.9 } :
        compressionQuality === 'medium' ?
        { maxSizeMB: 2, maxWidthOrHeight: 1920, useWebWorker: true, quality: 0.8 } :
        { maxSizeMB: 1, maxWidthOrHeight: 1280, useWebWorker: true, quality: 0.6 };

      // Compress images
      const compressionResults = await compressImages(selectedFiles, compressionOptions);
      setCompressionResults(compressionResults);
      
      // Create new FileList with compressed files
      const compressedFiles = compressionResults.map(result => result.compressedFile);
      const compressedFileList = new DataTransfer();
      compressedFiles.forEach(file => compressedFileList.items.add(file));
      
      setIsCompressing(false);
      setUploadStatus('Uploading compressed files...');
      setUploadProgress(10);

      const result = await uploadMedia(compressedFileList.files, uploadedBy, caption);
      
      setUploadProgress(100);
      
      if (result.success) {
        const totalOriginalSize = compressionResults.reduce((sum, r) => sum + r.originalSize, 0);
        const totalCompressedSize = compressionResults.reduce((sum, r) => sum + r.compressedSize, 0);
        const totalSaved = totalOriginalSize - totalCompressedSize;
        const compressionRatio = ((totalSaved / totalOriginalSize) * 100).toFixed(1);
        
        setUploadStatus(`Successfully uploaded ${result.data?.length || 0} file(s)! Saved ${formatFileSize(totalSaved)} (${compressionRatio}% compression)`);
        setSelectedFiles(null);
        setSelectedFileList([]);
        setCaption('');
        setUploadedBy('');
        setUploadFailed(false);
        setCompressionResults([]);
        // Reset file input
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        
        // Reset progress after success
        setTimeout(() => {
          setUploadProgress(0);
        }, 2000);
      } else {
        setUploadStatus(`Upload failed: ${result.error}`);
        setUploadProgress(0);
        setUploadFailed(true);
        setLastUploadError(result.error || 'Unknown error');
      }
    } catch (error) {
      setUploadStatus('Upload failed. Please try again.');
      setUploadProgress(0);
      setUploadFailed(true);
      setLastUploadError('Network error or server issue');
    } finally {
      setIsUploading(false);
      setIsCompressing(false);
    }
  };

  const handleRetryUpload = () => {
    handleUpload();
  };

  const handleDeleteMedia = async (id: string) => {
    if (confirm('Are you sure you want to delete this media?')) {
      const result = await deleteMedia(id);
      if (result.success) {
        setUploadStatus('Media deleted successfully');
      } else {
        setUploadStatus(`Delete failed: ${result.error}`);
      }
    }
  };

  return (
    <div className="bg-gradient-to-br from-pink-50 to-purple-50 font-sans">
      {/* Navigation */}
      <nav className="bg-white shadow-lg fixed w-full z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className="text-2xl font-serif text-pink-600">Nikita & Kevin</span>
            </div>
            <div className="hidden md:flex space-x-8">
              <a href="#home" className="text-gray-700 hover:text-pink-600 transition">Home</a>
              <a href="/gallery" className="text-gray-700 hover:text-pink-600 transition">Gallery</a>
              <a href="#about" className="text-gray-700 hover:text-pink-600 transition">Our Story</a>
              <a href="/wishes" className="text-gray-700 hover:text-pink-600 transition">Read Wishes</a>
              <a href="#upload" className="text-gray-700 hover:text-pink-600 transition">Share Memories</a>
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
          <a href="#home" className="block py-2 text-gray-700 hover:text-pink-600">Home</a>
          <a href="/gallery" className="block py-2 text-gray-700 hover:text-pink-600">Gallery</a>
          <a href="#about" className="block py-2 text-gray-700 hover:text-pink-600">Our Story</a>
          <a href="/wishes" className="block py-2 text-gray-700 hover:text-pink-600">Read Wishes</a>
          <a href="#upload" className="block py-2 text-gray-700 hover:text-pink-600">Share Memories</a>
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

      {/* Hero Section */}
      <section 
        id="home" 
        className="pt-20 pb-32 px-4 bg-cover bg-center bg-no-repeat relative"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('https://images.unsplash.com/photo-1519225421980-715cb0215aed?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1770&q=80')`
        }}
      >
        <div className="max-w-4xl mx-auto text-center text-white pt-24">
          <h1 className="text-4xl md:text-6xl font-serif font-bold mb-6">Nikita & Kevin</h1>
          <p className="text-xl md:text-2xl mb-8">We're getting married on October 12, 2025</p>
          <div className="flex justify-center space-x-2 md:space-x-4 flex-wrap">
            <div className="bg-white bg-opacity-20 rounded-lg p-3 md:p-4 text-center backdrop-blur-sm mb-2">
              <span className="block text-2xl md:text-3xl font-bold">{timeLeft.days.toString().padStart(2, '0')}</span>
              <span className="text-sm md:text-base">Days</span>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-3 md:p-4 text-center backdrop-blur-sm mb-2">
              <span className="block text-2xl md:text-3xl font-bold">{timeLeft.hours.toString().padStart(2, '0')}</span>
              <span className="text-sm md:text-base">Hours</span>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-3 md:p-4 text-center backdrop-blur-sm mb-2">
              <span className="block text-2xl md:text-3xl font-bold">{timeLeft.minutes.toString().padStart(2, '0')}</span>
              <span className="text-sm md:text-base">Minutes</span>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-3 md:p-4 text-center backdrop-blur-sm mb-2">
              <span className="block text-2xl md:text-3xl font-bold">{timeLeft.seconds.toString().padStart(2, '0')}</span>
              <span className="text-sm md:text-base">Seconds</span>
            </div>
          </div>
          
          {/* Share Button */}
          <div className="mt-8">
              <button 
                onClick={() => setShowShareModal(true)}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center space-x-2 mx-auto"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zm6 12h8v-8h-8v8zm2-6h4v4h-4v-4zM3 21h8v-8H3v8zm2-6h4v4H5v-4zm8-6V3h8v8h-8zm6-6h-4v4h4V3z"/>
                </svg>
                <span>Share QR Code</span>
              </button>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section id="gallery" className="py-16 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-center text-gray-800 mb-12">Our Gallery</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {/* Gallery Items */}
            <div className="rounded-lg overflow-hidden shadow-md transition-transform duration-300 hover:scale-105">
              <Image 
                src="https://images.unsplash.com/photo-1532712938310-34cb3982ef74?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1770&q=80" 
                alt="Couple" 
                width={400}
                height={224}
                className="w-full h-48 md:h-56 object-cover"
                priority
              />
            </div>
            <div className="rounded-lg overflow-hidden shadow-md transition-transform duration-300 hover:scale-105">
              <Image 
                src="https://images.unsplash.com/photo-1511285560929-80b456fea0bc?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1769&q=80" 
                alt="Engagement" 
                width={400}
                height={224}
                className="w-full h-48 md:h-56 object-cover"
                priority
              />
            </div>
            <div className="rounded-lg overflow-hidden shadow-md transition-transform duration-300 hover:scale-105">
              <Image 
                src="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1674&q=80" 
                alt="Proposal" 
                width={400}
                height={224}
                className="w-full h-48 md:h-56 object-cover"
              />
            </div>
            <div className="rounded-lg overflow-hidden shadow-md transition-transform duration-300 hover:scale-105">
              <Image 
                src="https://images.unsplash.com/photo-1511285560929-80b456fea0bc?ixlib=rb-4.0.3&auto=format&fit=crop&w=1770&q=80" 
                alt="Together" 
                width={400}
                height={224}
                className="w-full h-48 md:h-56 object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-16 px-4 bg-gradient-to-br from-pink-50 to-purple-100">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-center text-gray-800 mb-12">Our Story</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            <div className="text-center md:text-left">
              <h3 className="text-2xl font-semibold text-pink-600 mb-4">How We Met</h3>
              <p className="text-gray-700 mb-6 leading-relaxed">We first met at a friend's birthday party in 2018. Kevin spilled his drink on Nikita's dress, and instead of getting angry, she laughed it off. We spent the whole night talking and....</p>
              <div className="relative w-full h-80 md:h-96 image-container" style={{ position: 'relative', height: '320px', minHeight: '320px' }}>
                <Image 
                  src="/images/nikita-kevin.jpg" 
                  alt="Nikita & Kevin" 
                  fill
                  className="rounded-lg shadow-md object-cover"
                />
              </div>
            </div>
            <div className="text-center md:text-left">
              <h3 className="text-2xl font-semibold text-pink-600 mb-4">The Proposal</h3>
              <p className="text-gray-700 mb-6 leading-relaxed">On a trip to Paris in 2022, Kevin proposed at the Eiffel Tower at sunset. It was completely unexpected and magical. Of course, Nikita said yes without hesitation!</p>
              <div className="relative w-full h-80 md:h-96 image-container" style={{ position: 'relative', height: '320px', minHeight: '320px' }}>
                <Image 
                  src="https://images.unsplash.com/photo-1519677100203-a0e668c92439?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1770&q=80" 
                  alt="Proposal" 
                  fill
                  className="rounded-lg shadow-md object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feedback Section */}
      <section id="feedback" className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-center text-gray-800 mb-12">Well Wishes</h2>
          <div className="bg-gray-50 p-4 md:p-6 rounded-lg shadow-md mb-12">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Leave a message for the couple</h3>
            <form onSubmit={handleWishSubmit}>
              <div className="mb-4">
                <input 
                  type="text" 
                  placeholder="Your Name" 
                  value={wishName}
                  onChange={(e) => setWishName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-base"
                  required
                  disabled={isSubmittingWish}
                />
              </div>
              <div className="mb-6">
                <textarea 
                  placeholder="Your Message" 
                  rows={4} 
                  value={wishMessage}
                  onChange={(e) => setWishMessage(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-base resize-none"
                  required
                  disabled={isSubmittingWish}
                />
              </div>
              
              {/* Status Message */}
              {wishStatus && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${
                  wishStatus.includes('Thank you') || wishStatus.includes('appreciate')
                    ? 'bg-green-100 text-green-700 border border-green-200'
                    : 'bg-red-100 text-red-700 border border-red-200'
                }`}>
                  {wishStatus}
                </div>
              )}
              
              <button 
                type="submit" 
                disabled={isSubmittingWish}
                className="w-full md:w-auto bg-pink-600 text-white px-8 py-3 rounded-lg hover:bg-pink-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-semibold"
              >
                {isSubmittingWish ? 'Sending...' : 'Submit Wish'}
              </button>
            </form>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sample Wishes */}
            <div className="bg-pink-50 p-4 md:p-6 rounded-lg shadow-sm">
              <p className="text-gray-700 mb-4 leading-relaxed">"So happy for both of you! Can't wait to celebrate your special day with you."</p>
              <p className="text-pink-600 font-semibold">- Jessica & David</p>
            </div>
            <div className="bg-pink-50 p-4 md:p-6 rounded-lg shadow-sm">
              <p className="text-gray-700 mb-4 leading-relaxed">"Wishing you a lifetime of love and happiness together."</p>
              <p className="text-pink-600 font-semibold">- The Miller Family</p>
            </div>
          </div>
        </div>
      </section>

      {/* Upload Section */}
      <section id="upload" className="py-16 px-4 bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-center text-gray-800 mb-12">Share Your Memories</h2>
          <div className="bg-white p-4 md:p-8 rounded-lg shadow-md">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 md:p-8 text-center mb-8">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-gray-600 mb-2 text-sm md:text-base">Upload photos and videos from our pre-wedding events</p>
              <div className="text-xs text-gray-500 mb-4">
                <p>• Maximum {UPLOAD_LIMITS.maxFilesPerUpload} files per upload</p>
                <p>• Maximum {getFileSize(UPLOAD_LIMITS.maxFileSize)} per file</p>
                <p>• Supported: JPEG, PNG, GIF, WebP, MP4, WebM</p>
                <p>• Photos will be automatically compressed for faster upload</p>
              </div>
              
              {/* Compression Quality Selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Compression Quality
                </label>
                <div className="flex space-x-4 justify-center">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="compressionQuality"
                      value="high"
                      checked={compressionQuality === 'high'}
                      onChange={(e) => setCompressionQuality(e.target.value as 'high' | 'medium' | 'low')}
                      className="mr-2"
                    />
                    <span className="text-sm">High Quality</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="compressionQuality"
                      value="medium"
                      checked={compressionQuality === 'medium'}
                      onChange={(e) => setCompressionQuality(e.target.value as 'high' | 'medium' | 'low')}
                      className="mr-2"
                    />
                    <span className="text-sm">Medium Quality</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="compressionQuality"
                      value="low"
                      checked={compressionQuality === 'low'}
                      onChange={(e) => setCompressionQuality(e.target.value as 'high' | 'medium' | 'low')}
                      className="mr-2"
                    />
                    <span className="text-sm">Low Quality</span>
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {compressionQuality === 'high' && 'Best quality, larger files (up to 5MB, 2560px)'}
                  {compressionQuality === 'medium' && 'Balanced quality and size (up to 2MB, 1920px)'}
                  {compressionQuality === 'low' && 'Smaller files, good quality (up to 1MB, 1280px)'}
                </p>
              </div>
              
              {/* Selected Files List */}
              {selectedFileList.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-700">
                      Selected Files ({selectedFileList.length})
                    </h4>
                    <button
                      onClick={clearAllFiles}
                      className="text-red-600 hover:text-red-700 text-xs font-medium"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-2">
                    {selectedFileList.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <div className="text-pink-600">
                            {file.type.startsWith('image/') ? (
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                              </svg>
                            )}
                          </div>
                          <span className="text-sm text-gray-700 truncate">
                            {file.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({(file.size / 1024 / 1024).toFixed(1)} MB)
                          </span>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          className="text-red-600 hover:text-red-700 ml-2"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <input 
                type="file" 
                id="file-upload" 
                className="hidden" 
                multiple 
                accept="image/*,video/*"
                onChange={handleFileSelect}
              />
              <label 
                htmlFor="file-upload" 
                className="inline-block bg-pink-600 text-white px-6 py-3 rounded-lg cursor-pointer hover:bg-pink-700 transition font-semibold"
              >
                Select Files
              </label>
            </div>
            
            {/* Upload Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label htmlFor="uploadedBy" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  id="uploadedBy"
                  value={uploadedBy}
                  onChange={(e) => setUploadedBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <label htmlFor="caption" className="block text-sm font-medium text-gray-700 mb-2">
                  Caption (Optional)
                </label>
                <input
                  type="text"
                  id="caption"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
                  placeholder="Add a caption..."
                />
              </div>
            </div>
            
            <button
              onClick={handleUpload}
              disabled={!selectedFiles || isUploading}
              className="w-full bg-pink-600 text-white py-2 px-4 rounded-lg hover:bg-pink-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-semibold mb-4"
            >
              {isCompressing ? 'Compressing...' : isUploading ? 'Uploading...' : 'Upload Files'}
            </button>
            
            {/* Progress Bar */}
            {(isUploading || isCompressing) && (
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>{isCompressing ? 'Compressing images...' : 'Uploading...'}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-pink-600 h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            {uploadStatus && (
              <div className={`text-center p-3 rounded-lg text-sm ${
                uploadStatus.includes('Successfully') || uploadStatus.includes('deleted') 
                  ? 'bg-green-100 text-green-700' 
                  : uploadStatus.includes('failed') || uploadStatus.includes('error')
                  ? 'bg-red-100 text-red-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                <div className="flex items-center justify-center space-x-2">
                  <span>{uploadStatus}</span>
                  {uploadFailed && !isUploading && (
                    <button
                      onClick={handleRetryUpload}
                      className="ml-2 bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 transition-colors"
                    >
                      Try Again
                    </button>
                  )}
                </div>
                {uploadFailed && lastUploadError && (
                  <div className="mt-2 text-xs text-red-600">
                    Error: {lastUploadError}
                  </div>
                )}
              </div>
            )}
          </div>
          
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center md:text-left">
            <h3 className="text-xl font-serif font-bold mb-4">Nikita & Kevin</h3>
            <p className="text-gray-400 mb-2">October 12, 2025</p>
            <p className="text-gray-400">St. Mary's Church, followed by reception at The Grand Hotel</p>
          </div>
          <div className="text-center md:text-left">
            <h3 className="text-xl font-bold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><a href="#home" className="text-gray-400 hover:text-white transition">Home</a></li>
              <li><a href="/gallery" className="text-gray-400 hover:text-white transition">Gallery</a></li>
              <li><a href="#about" className="text-gray-400 hover:text-white transition">Our Story</a></li>
              <li><a href="/wishes" className="text-gray-400 hover:text-white transition">Read Wishes</a></li>
              <li><a href="#upload" className="text-gray-400 hover:text-white transition">Share Memories</a></li>
            </ul>
          </div>
          <div className="text-center md:text-left">
            <h3 className="text-xl font-bold mb-4">Contact Us</h3>
            <p className="text-gray-400 mb-2">Have questions about the wedding?</p>
            <p className="text-gray-400">Email: nikita.kevin@example.com</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-8 pt-8 border-t border-gray-700 text-center text-gray-400">
          <p>© 2025 Nikita & Kevin's Wedding. All rights reserved.</p>
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