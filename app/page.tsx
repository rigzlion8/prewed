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
  const [compressionQuality, setCompressionQuality] = useState<'ultra' | 'high' | 'medium' | 'low'>('high');
  const [wishName, setWishName] = useState('');
  const [wishMessage, setWishMessage] = useState('');
  const [wishStatus, setWishStatus] = useState('');
  const [isSubmittingWish, setIsSubmittingWish] = useState(false);
  const [selectedFileList, setSelectedFileList] = useState<File[]>([]);
  const [recentWishes, setRecentWishes] = useState<Array<{name: string, message: string, createdAt: string}>>([]);
  
  const { media, loading, error, uploadMedia, deleteMedia } = useMedia();
  const { wishes, submitWish, fetchWishes } = useWishes();
  
  // Get the current website URL
  const websiteUrl = typeof window !== 'undefined' ? window.location.href : 'http://localhost:3004';

  // Fetch recent wishes for display
  useEffect(() => {
    fetchWishes();
  }, []);

  // Update recent wishes when wishes state changes
  useEffect(() => {
    if (wishes && wishes.length > 0) {
      // Get the 2 most recent wishes
      const recent = wishes
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 2)
        .map(wish => ({
          name: wish.name,
          message: wish.message,
          createdAt: wish.createdAt
        }));
      setRecentWishes(recent);
    }
  }, [wishes]);

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
        
        // Refresh recent wishes to show the new one
        fetchWishes();
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
    
    let progressInterval: NodeJS.Timeout | null = null;
    
    try {
      // Get compression options based on quality setting
      const compressionOptions = compressionQuality === 'ultra' ? 
        { maxSizeMB: 30, maxWidthOrHeight: 6144, useWebWorker: true, quality: 0.98 } :
        compressionQuality === 'high' ? 
        { maxSizeMB: 15, maxWidthOrHeight: 4096, useWebWorker: true, quality: 0.95 } :
        compressionQuality === 'medium' ?
        { maxSizeMB: 8, maxWidthOrHeight: 2560, useWebWorker: true, quality: 0.85 } :
        { maxSizeMB: 3, maxWidthOrHeight: 1920, useWebWorker: true, quality: 0.75 };

      // Compress images
      const compressionResults = await compressImages(selectedFiles, compressionOptions);
      setCompressionResults(compressionResults);
      
      // Create new FileList with compressed files
      const compressedFiles = compressionResults.map(result => result.compressedFile);
      const compressedFileList = new DataTransfer();
      compressedFiles.forEach(file => compressedFileList.items.add(file));
      
      setIsCompressing(false);
      setUploadStatus('Uploading files... Large files may take up to 5 minutes. Please be patient.');
      setUploadProgress(10);
      
      // Show progress updates every 30 seconds for large files
      progressInterval = setInterval(() => {
        setUploadStatus(prev => {
          if (prev.includes('Uploading files')) {
            return 'Still uploading... Large files take time. Please keep this page open.';
          }
          return prev;
        });
      }, 30000);

      const result = await uploadMedia(compressedFileList.files, uploadedBy, caption);
      
      // Clear the progress interval
      if (progressInterval) {
        clearInterval(progressInterval);
      }
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
      if (progressInterval) {
        clearInterval(progressInterval);
      }
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

  // Derive dance/practice videos once for homepage section
  const danceVideos = media
    .filter((m) => m.type === 'video')
    .filter((m) => {
      const tags = (m.tags || []).map(t => t.toLowerCase());
      const caption = (m.caption || '').toLowerCase();
      const name = (m.originalName || '').toLowerCase();
      const tagHit = tags.some(t =>
        ['dance', 'dance practice', 'dance-practice', 'ruracio', 'ruracio-squad', 'squad', 'practice'].includes(t)
      );
      const textHit = /dance practice|dance|practice/.test(caption) || /dance|practice/.test(name);
      return tagHit || textHit;
    });

  return (
    <div className="bg-gradient-to-br from-amber-50 to-emerald-50 font-sans">
      {/* Navigation */}
      <nav className="bg-white shadow-lg fixed w-full z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className="text-2xl font-serif text-amber-700">#Ruracio</span>
            </div>
            <div className="hidden md:flex space-x-8">
              <a href="#home" className="text-gray-700 hover:text-amber-700 transition">Home</a>
              <a href="/gallery" className="text-gray-700 hover:text-amber-700 transition">Gallery</a>
              <a href="/introduction" className="text-gray-700 hover:text-amber-700 transition">Introduction</a>
              <a href="/wishes" className="text-gray-700 hover:text-amber-700 transition">Read Wishes</a>
              <a href="#upload" className="text-gray-700 hover:text-amber-700 transition">Share Memories</a>
              <button 
                onClick={() => setShowShareModal(true)}
                className="bg-emerald-700 text-white px-4 py-2 rounded-lg hover:bg-emerald-800 transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                </svg>
                <span>Share</span>
              </button>
              <a href="/gallery" className="bg-amber-700 text-white px-4 py-2 rounded-lg hover:bg-amber-800 transition-colors">View All Photos</a>
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
          <a href="#home" className="block py-2 text-gray-700 hover:text-amber-700">Home</a>
          <a href="/gallery" className="block py-2 text-gray-700 hover:text-amber-700">Gallery</a>
          <a href="/introduction" className="block py-2 text-gray-700 hover:text-amber-700">Introduction</a>
          <a href="/wishes" className="block py-2 text-gray-700 hover:text-amber-700">Read Wishes</a>
          <a href="#upload" className="block py-2 text-gray-700 hover:text-amber-700">Share Memories</a>
          <button 
            onClick={() => {
              setShowShareModal(true);
              setIsMobileMenuOpen(false);
            }}
            className="block w-full py-2 bg-green-600 text-white rounded-lg mx-2 text-center hover:bg-green-700 transition-colors"
          >
            Share Website
          </button>
          <a href="/gallery" className="block py-2 bg-amber-700 text-white rounded-lg mx-2 text-center hover:bg-amber-800 transition-colors mt-2">View All Photos</a>
        </div>
      </nav>

      {/* Hero Section */}
      <section 
        id="home" 
        className="pt-20 pb-32 px-4 bg-gradient-to-br from-black via-red-900 to-green-900 relative"
      >
        <div className="max-w-4xl mx-auto text-center text-white pt-24">
          <h1 className="text-4xl md:text-6xl font-serif font-bold mb-6 bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
            Where Mugithi 🎸 meets Ohangla 🥁 — and love finally found its beat!
          </h1>
          <p className="text-lg md:text-xl mb-8 text-amber-200">15.11.2025</p>
          <div className="flex justify-center space-x-2 md:space-x-4 flex-wrap">
            <div className="bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg p-3 md:p-4 text-center text-black shadow-lg mb-2">
              <span className="block text-2xl md:text-3xl font-bold">{timeLeft.days.toString().padStart(2, '0')}</span>
              <span className="text-sm md:text-base font-semibold">Days</span>
            </div>
            <div className="bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg p-3 md:p-4 text-center text-black shadow-lg mb-2">
              <span className="block text-2xl md:text-3xl font-bold">{timeLeft.hours.toString().padStart(2, '0')}</span>
              <span className="text-sm md:text-base font-semibold">Hours</span>
            </div>
            <div className="bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg p-3 md:p-4 text-center text-black shadow-lg mb-2">
              <span className="block text-2xl md:text-3xl font-bold">{timeLeft.minutes.toString().padStart(2, '0')}</span>
              <span className="text-sm md:text-base font-semibold">Minutes</span>
            </div>
            <div className="bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg p-3 md:p-4 text-center text-black shadow-lg mb-2">
              <span className="block text-2xl md:text-3xl font-bold">{timeLeft.seconds.toString().padStart(2, '0')}</span>
              <span className="text-sm md:text-base font-semibold">Seconds</span>
            </div>
          </div>
          
          {/* Welcome Message */}
          <div className="mt-8 bg-white bg-opacity-10 border border-amber-400 rounded-xl p-6 text-left max-w-3xl mx-auto">
            <p className="text-amber-100 italic text-center mb-4">“It’s All Happening Now!”</p>
            <p className="text-amber-100 leading-relaxed">
              You’re stepping into the NiKe Nyombo vibes right this moment. The Kikuyu highlands are already tuning their Mugithi guitars, and the Lakeside squad is adjusting their fly whisks. Laughter is rising, aunties are settling into strategic gossip positions, and uncles are warming up for negotiations. We’re live, we’re loud, and we’re loving it. 😎🔥
            </p>
          </div>
          
          {/* Share Button */}
          <div className="mt-8">
              <button 
                onClick={() => setShowShareModal(true)}
                className="bg-gradient-to-r from-amber-400 to-amber-600 text-black px-6 py-3 rounded-lg hover:from-amber-500 hover:to-amber-700 transition-all font-semibold flex items-center space-x-2 mx-auto shadow-lg"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zm6 12h8v-8h-8v8zm2-6h4v4h-4v-4zM3 21h8v-8H3v8zm2-6h4v4H5v-4zm8-6V3h8v8h-8zm6-6h-4v4h4V3z"/>
                </svg>
                <span>Share QR Code</span>
              </button>
          </div>
        </div>
      </section>

      {/* Nyombo Photos Section */}
      <section className="py-16 px-4 bg-gradient-to-br from-gray-900 via-black to-gray-800">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-center text-amber-400 mb-12">Nyombo Moments</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <div className="relative w-full h-80 bg-gray-100 rounded-2xl overflow-hidden border border-amber-400">
              <Image 
                src="/images/nyombo1.jpeg" 
                alt="Nyombo moment 1" 
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 33vw"
                priority
              />
            </div>
            <div className="relative w-full h-80 bg-gray-100 rounded-2xl overflow-hidden border border-amber-400">
              <Image 
                src="/images/nyombo2.jpeg" 
                alt="Nyombo moment 2" 
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </div>
            <div className="relative w-full h-80 bg-gray-100 rounded-2xl overflow-hidden border border-amber-400">
              <Image 
                src="/images/nyombo3.jpeg" 
                alt="Nyombo moment 3" 
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Proposal Section */}
      <section className="py-16 px-4 bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-center text-amber-400 mb-6">💍😂 By the Way… A Small Announcement</h2>
          <div className="text-center text-white mb-10">
            <p className="text-lg md:text-xl leading-relaxed max-w-4xl mx-auto">
              Oh, by the way — in case you missed the memo while focusing on the goats, the outfits, and the dance moves… the groom proposed. Yes, proposed. Shocked us all. The man knelt, the ring sparkled, and before anyone could even shout “ayie!”, the bride said a very confident YES. So please, clap for the groom’s bravery, clap for the ring’s brightness, and clap for the bride’s speed in accepting. We are officially in the “she said yes, he said finally” era. 😄🔥💙
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[
              '/images/pic001.jpeg',
              '/images/pic002.jpeg',
              '/images/pic003.jpeg',
              '/images/pic004.jpeg',
              '/images/pic005.jpeg',
              '/images/pic006.jpeg',
              '/images/pic007.jpeg',
              '/images/pic008.jpeg',
              '/images/pic009.jpeg',
            ].map((src, idx) => (
              <div key={src} className="relative w-full h-64 bg-gray-100 rounded-xl overflow-hidden border border-amber-400">
                <Image
                  src={src}
                  alt={`Proposal moment ${idx + 1}`}
                  fill
                  className="object-contain"
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dance Videos Section */}
      <section className="py-16 px-4 bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-center text-amber-400 mb-6">😂💃🔥 Ruracio Squad Practice — Pure Comedy, Zero Regret</h2>
          <div className="text-center text-white mb-10">
            <p className="text-lg md:text-xl leading-relaxed max-w-4xl mx-auto">
              Before you watch the videos below, please understand one thing: this Ruracio Squad did not come to play — they came to embarrass their ancestors with confidence. We practiced like a group that had no business dancing, but somehow decided “wacha tujaribu.” People were counting beats loudly, hips were going one direction, legs another, and at some point someone shouted “STOP! START AGAIN!” like a frustrated choir master. But listen… the energy was unmatched, the laughter was uncontrollable, and the chaos was beautiful. If discipline had a cousin named vibes — that was us. Now enjoy the footage. Viewer discretion: Expect vibes, struggle, and unnecessary enthusiasm. 🤣💃🕺🔥
            </p>
          </div>
          {/* Video Cards (tagged in Gallery) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {danceVideos.slice(0, 2)
              .map((video) => (
                <div key={video._id} className="bg-white rounded-xl overflow-hidden shadow-md border border-amber-400">
                  <div className="relative bg-black">
                    <video
                      src={video.url}
                      controls
                      className="w-full h-56 object-contain bg-black"
                    />
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-gray-700 mb-1 truncate">
                      By: {video.uploadedBy || 'Guest'}
                    </p>
                    {video.caption && (
                      <p className="text-sm text-gray-900 line-clamp-2">{video.caption}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">{new Date(video.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
          </div>
          {/* If no videos match yet */}
          {danceVideos.length === 0 && (
            <p className="text-center text-amber-200 mt-6">Tagged dance videos will appear here once uploaded to the gallery.</p>
          )}
        </div>
      </section>

      {/* Gallery Section */}
      <section id="gallery" className="py-16 px-4 bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-center text-amber-400 mb-8">Gallery</h2>
          
          {/* Gallery Description */}
          <div className="text-center text-white mb-12">
            <p className="text-lg md:text-xl leading-relaxed max-w-4xl mx-auto">
              You came, you smiled, you partied… now show us the proof! 😍🎉 Drop your photos here and let's stitch together the story of our Nyombo day—through your lens. The more the merrier, so don't be shy… upload away!
            </p>
          </div>
          
          <p className="text-center text-amber-200 mb-8 text-sm md:text-base">Click anywhere to view all photos</p>
          <div 
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 cursor-pointer hover:opacity-90 transition-opacity duration-300 relative group"
            onClick={() => window.location.href = '/gallery'}
          >
            {/* Gallery Items */}
            <div className="rounded-lg overflow-hidden shadow-md transition-transform duration-300 hover:scale-105 bg-gray-100">
              <Image 
                src="/images/nikita-kevin003.jpg" 
                alt="Nike Moments" 
                width={400}
                height={300}
                className="w-full h-48 md:h-56 object-contain"
                priority
              />
            </div>
            <div className="rounded-lg overflow-hidden shadow-md transition-transform duration-300 hover:scale-105 bg-gray-100">
              <Image 
                src="/images/nikita-kevin004.jpg" 
                alt="Nike Moments" 
                width={400}
                height={300}
                className="w-full h-48 md:h-56 object-contain"
                priority
              />
            </div>
            <div className="rounded-lg overflow-hidden shadow-md transition-transform duration-300 hover:scale-105 bg-gray-100">
              <Image 
                src="/images/nikita-kevin005.jpg" 
                alt="Nike Moments" 
                width={400}
                height={300}
                className="w-full h-48 md:h-56 object-contain"
              />
            </div>
            <div className="rounded-lg overflow-hidden shadow-md transition-transform duration-300 hover:scale-105 bg-gray-100">
              <Image 
                src="/images/nikita-kevin006.jpg" 
                alt="Nike Moments" 
                width={400}
                height={300}
                className="w-full h-48 md:h-56 object-contain"
              />
            </div>
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300 rounded-lg flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white bg-opacity-90 px-4 py-2 rounded-lg shadow-lg">
                <span className="text-gray-800 font-medium text-sm">View Full Gallery</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feedback Section removed per request */}

      {/* Upload Section */}
      <section id="upload" className="py-16 px-4 bg-gradient-to-br from-gray-900 via-black to-gray-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-center text-amber-400 mb-8">Share Your Ruracio Moments</h2>
          <p className="text-center text-amber-200 mb-8 text-lg leading-relaxed">
            And that's a wrap on our Nyombo story (for now 😉). Thank you for the laughter, the love, and the memories that made 13.09.2025 unforgettable! 💍✨ Whether you danced till your feet gave up 💃🏾, ate like it was your last buffet 🍽, or snapped selfies worthy of a magazine cover 📸—you made this day magical. Keep the love flowing, keep the photos coming, and remember: forever has only just begun for us ❤🔥.
          </p>
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 md:p-8 rounded-lg shadow-lg border border-amber-400">
            <div className="border-2 border-dashed border-amber-400 rounded-lg p-6 md:p-8 text-center mb-8">
              <svg className="w-12 h-12 text-amber-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-amber-200 mb-2 text-sm md:text-base">Upload photos and videos from our Nyombo celebration</p>
              <div className="text-xs text-amber-300 mb-4">
                <p>• Supported: JPEG, PNG, GIF, WebP, MP4, WebM</p>
                <p>• Photos will be automatically compressed for faster upload</p>
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
                          <div className="text-amber-700">
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
                className="inline-block bg-amber-700 text-white px-6 py-3 rounded-lg cursor-pointer hover:bg-amber-800 transition font-semibold"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                  placeholder="Add a caption..."
                />
              </div>
            </div>
            
            <button
              onClick={handleUpload}
              disabled={!selectedFiles || isUploading}
              className="w-full bg-amber-700 text-white py-2 px-4 rounded-lg hover:bg-amber-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-semibold mb-4"
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
                    className="bg-amber-600 h-2 rounded-full transition-all duration-300 ease-out"
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
                    <div className="mb-2">Error: {lastUploadError}</div>
                    {(lastUploadError.includes('too large') || lastUploadError.includes('timeout')) && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-yellow-800">
                        <div className="font-medium mb-1">💡 Suggestions:</div>
                        <ul className="text-left space-y-1">
                          <li>• Try uploading fewer files at once (2-3 instead of many)</li>
                          <li>• For images: Use "Medium Quality" or "Low Quality" compression</li>
                          <li>• For videos: Try smaller video files (under 200MB)</li>
                          <li>• Check your internet connection speed</li>
                          <li>• Try uploading one file at a time</li>
                          <li>• Large files may take several minutes to upload</li>
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-black via-gray-900 to-black text-white py-12 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-8">
            <h3 className="text-2xl font-serif font-bold mb-6 text-amber-400">Final Words — Live From the Dala x Gĩcagi Headquarters</h3>
            <div className="bg-black bg-opacity-30 p-6 md:p-8 rounded-xl border border-amber-400 shadow-lg max-w-4xl mx-auto text-left">
              <p className="text-amber-100 text-lg leading-relaxed">
                If you’re still scrolling right now, just know you have officially passed the endurance test of this Nyombo website. As we speak, the vibe on the ground is louder than the drums, aunties are already positioning themselves for photos, dancers are shaking off their nerves, and the whole compound is operating on pure excitement and vibes. The Lakeside swagger is mixing with Highland energy like a cultural smoothie, and honestly — it’s beautiful chaos. So before you close this page and join the real event, we leave you with one final prayer request: May Kevin choose the correct bride. 😄🔥💍
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="text-center md:text-left">
              <h3 className="text-xl font-bold mb-4 text-amber-400">Quick Links</h3>
              <ul className="space-y-2">
                <li><a href="#home" className="text-amber-200 hover:text-amber-400 transition">Home</a></li>
                <li><a href="/gallery" className="text-amber-200 hover:text-amber-400 transition">Gallery</a></li>
                <li><a href="/introduction" className="text-amber-200 hover:text-amber-400 transition">Introduction</a></li>
                <li><a href="/wishes" className="text-amber-200 hover:text-amber-400 transition">Read Wishes</a></li>
                <li><a href="#upload" className="text-amber-200 hover:text-amber-400 transition">Share Memories</a></li>
              </ul>
            </div>
            <div className="text-center md:text-left">
              <h3 className="text-xl font-bold mb-4 text-amber-400">Contact Us</h3>
              <p className="text-amber-200 mb-2">Have questions about the Nyombo?</p>
              <p className="text-amber-200">Email: nikitaaymanz@gmail.com</p>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-8 pt-8 border-t border-amber-400 text-center text-amber-200">
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