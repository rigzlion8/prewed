'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useMedia, MediaItem } from '@/hooks/useMedia';
import { compressImages, formatFileSize, CompressionResult } from '@/lib/compression';

export default function GalleryPage() {
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSlideshowActive, setIsSlideshowActive] = useState(false);
  const [slideshowIndex, setSlideshowIndex] = useState(0);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadedBy, setUploadedBy] = useState('');
  const [caption, setCaption] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadFailed, setUploadFailed] = useState(false);
  const [lastUploadError, setLastUploadError] = useState('');
  const [compressionResults, setCompressionResults] = useState<CompressionResult[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionQuality, setCompressionQuality] = useState<'ultra' | 'high' | 'medium' | 'low'>('high');
  const [selectedFileList, setSelectedFileList] = useState<File[]>([]);
  
  const itemsPerPage = 12;
  
  const { media, loading, error, deleteMedia, uploadMedia, fetchMedia } = useMedia();

  // Slideshow functionality
  useEffect(() => {
    if (isSlideshowActive && media.length > 0) {
      const interval = setInterval(() => {
        setSlideshowIndex((prev) => (prev + 1) % media.length);
      }, 3000); // Change slide every 3 seconds
      return () => clearInterval(interval);
    }
  }, [isSlideshowActive, media.length]);

  const startSlideshow = () => {
    setSlideshowIndex(0);
    setIsSlideshowActive(true);
  };

  const stopSlideshow = () => {
    setIsSlideshowActive(false);
  };

  const nextSlide = () => {
    setSlideshowIndex((prev) => (prev + 1) % media.length);
  };

  const prevSlide = () => {
    setSlideshowIndex((prev) => (prev - 1 + media.length) % media.length);
  };

  // Upload functionality
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      setSelectedFiles(files);
      setSelectedFileList(prev => [...prev, ...newFiles]);
      setUploadFailed(false);
      setUploadStatus('');
    }
  };

  const removeFile = (index: number) => {
    const newFileList = selectedFileList.filter((_, i) => i !== index);
    setSelectedFileList(newFileList);
    
    // Create new FileList from remaining files
    const dataTransfer = new DataTransfer();
    newFileList.forEach(file => dataTransfer.items.add(file));
    setSelectedFiles(dataTransfer.files);
  };

  const clearAllFiles = () => {
    setSelectedFileList([]);
    setSelectedFiles(null);
    setUploadStatus('');
    // Reset file input
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      setUploadStatus('Please select files to upload');
      return;
    }

    setIsUploading(true);
    setIsCompressing(true);
    setUploadProgress(0);
    setUploadFailed(false);
    setUploadStatus('Compressing images...');

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
      
      // Debug: Log file types
      console.log('Compressed files:', compressedFiles.map(f => ({ name: f.name, type: f.constructor.name, size: f.size })));
      
      // Create a proper FileList using DataTransfer
      const dataTransfer = new DataTransfer();
      compressedFiles.forEach(file => {
        if (file instanceof File) {
          dataTransfer.items.add(file);
        } else {
          console.error('Invalid file object:', file);
        }
      });
      
      setIsCompressing(false);
      setUploadStatus('Uploading compressed files...');
      setUploadProgress(10);

      const result = await uploadMedia(
        dataTransfer.files,
        uploadedBy || 'Guest',
        caption,
        (progress) => setUploadProgress(10 + (progress.percentage * 0.9))
      );

      if (result.success) {
        const totalOriginalSize = compressionResults.reduce((sum, r) => sum + r.originalSize, 0);
        const totalCompressedSize = compressionResults.reduce((sum, r) => sum + r.compressedSize, 0);
        const totalSaved = totalOriginalSize - totalCompressedSize;
        const compressionRatio = ((totalSaved / totalOriginalSize) * 100).toFixed(1);
        
        setUploadStatus(`Successfully uploaded ${result.data?.length || 0} file(s). Saved ${formatFileSize(totalSaved)} (${compressionRatio}% compression)`);
        setSelectedFiles(null);
        setSelectedFileList([]);
        setUploadedBy('');
        setCaption('');
        setCompressionResults([]);
        setShowUploadForm(false);
        // Refresh media list
        await fetchMedia();
      } else {
        setUploadFailed(true);
        setUploadStatus('Upload failed');
        setLastUploadError(result.error || 'Unknown error');
      }
    } catch (error) {
      setUploadFailed(true);
      setUploadStatus('Upload failed');
      setLastUploadError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsUploading(false);
      setIsCompressing(false);
    }
  };

  const handleRetryUpload = () => {
    if (selectedFiles) {
      handleUpload();
    }
  };

  const handleDeleteMedia = async (id: string) => {
    if (confirm('Are you sure you want to delete this media?')) {
      const result = await deleteMedia(id);
      if (result.success) {
        // Close modal if the deleted item was selected
        if (selectedMedia && selectedMedia._id === id) {
          setSelectedMedia(null);
        }
        // Stop slideshow if the deleted item was the current slide
        if (isSlideshowActive && media[slideshowIndex]?._id === id) {
          stopSlideshow();
        }
      }
    }
  };

  const openModal = (item: MediaItem) => {
    setSelectedMedia(item);
  };

  const closeModal = () => {
    setSelectedMedia(null);
  };

  // Pagination
  const totalPages = Math.ceil(media.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentMedia = media.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading gallery...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading gallery: {error}</p>
          <Link href="/" className="text-pink-600 hover:text-pink-700">
            ← Back to Homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      {/* Navigation */}
      <nav className="bg-gradient-to-r from-gray-900 to-black shadow-lg fixed w-full z-50 border-b border-yellow-400">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2 flex-shrink-0">
              <span className="text-xl md:text-2xl font-serif font-bold text-yellow-400">#Nike Moments</span>
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              {media.length > 0 && (
                <button
                  onClick={isSlideshowActive ? stopSlideshow : startSlideshow}
                  className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-6 py-3 rounded-xl hover:from-yellow-500 hover:to-yellow-700 transition-all font-bold text-base shadow-2xl transform hover:scale-105 duration-300 border-2 border-yellow-300"
                >
                  {isSlideshowActive ? '⏸️ Stop Slideshow' : '▶️ Start Slideshow'}
                </button>
              )}
              <button
                onClick={() => setShowUploadForm(!showUploadForm)}
                className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-6 py-3 rounded-xl hover:from-yellow-500 hover:to-yellow-700 transition-all font-bold text-base shadow-2xl transform hover:scale-105 duration-300 border-2 border-yellow-300"
              >
                📤 Upload Photos
              </button>
              <Link 
                href="/" 
                className="text-yellow-200 hover:text-yellow-400 transition-colors font-medium"
              >
                ← Back to Homepage
              </Link>
            </div>
            
            {/* Mobile Navigation */}
            <div className="md:hidden flex items-center space-x-2">
              {media.length > 0 && (
                <button
                  onClick={isSlideshowActive ? stopSlideshow : startSlideshow}
                  className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-3 py-2 rounded-lg hover:from-yellow-500 hover:to-yellow-700 transition-all font-semibold text-sm shadow-lg border border-yellow-300"
                >
                  {isSlideshowActive ? '⏸️' : '▶️'}
                </button>
              )}
              <button
                onClick={() => setShowUploadForm(!showUploadForm)}
                className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-3 py-2 rounded-lg hover:from-yellow-500 hover:to-yellow-700 transition-all font-semibold text-sm shadow-lg border border-yellow-300"
              >
                📤
              </button>
              <Link 
                href="/" 
                className="text-yellow-200 hover:text-yellow-400 transition-colors font-medium text-sm"
              >
                ←
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-20 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-yellow-400 mb-4">
              #Nike Moments Gallery
            </h1>
            <p className="text-lg text-yellow-200 max-w-2xl mx-auto">
              All the beautiful Ayie memories shared by our family and friends
            </p>
            <div className="mt-4 text-sm text-yellow-300">
              {media.length} {media.length === 1 ? 'item' : 'items'} total
            </div>
          </div>

          {/* Upload Form */}
          {showUploadForm && (
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-lg shadow-lg border border-yellow-400 mb-8">
              <h3 className="text-xl font-semibold text-yellow-400 mb-4">Upload Photos & Videos</h3>
              
              {/* Compression Quality Selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-yellow-200 mb-2">
                  Compression Quality
                </label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="compressionQuality"
                      value="ultra"
                      checked={compressionQuality === 'ultra'}
                      onChange={(e) => setCompressionQuality(e.target.value as 'ultra' | 'high' | 'medium' | 'low')}
                      className="mr-2"
                    />
                    <span className="text-sm text-yellow-200">Ultra High</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="compressionQuality"
                      value="high"
                      checked={compressionQuality === 'high'}
                      onChange={(e) => setCompressionQuality(e.target.value as 'ultra' | 'high' | 'medium' | 'low')}
                      className="mr-2"
                    />
                    <span className="text-sm text-yellow-200">High Quality</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="compressionQuality"
                      value="medium"
                      checked={compressionQuality === 'medium'}
                      onChange={(e) => setCompressionQuality(e.target.value as 'ultra' | 'high' | 'medium' | 'low')}
                      className="mr-2"
                    />
                    <span className="text-sm text-yellow-200">Medium Quality</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="compressionQuality"
                      value="low"
                      checked={compressionQuality === 'low'}
                      onChange={(e) => setCompressionQuality(e.target.value as 'ultra' | 'high' | 'medium' | 'low')}
                      className="mr-2"
                    />
                    <span className="text-sm text-yellow-200">Low Quality</span>
                  </label>
                </div>
                <p className="text-xs text-yellow-300 mt-1">
                  {compressionQuality === 'ultra' && 'Near-lossless quality for HD photos (up to 30MB, 6K resolution)'}
                  {compressionQuality === 'high' && 'Excellent quality for HD photos (up to 15MB, 4K resolution)'}
                  {compressionQuality === 'medium' && 'Good quality, balanced size (up to 8MB, 2K resolution)'}
                  {compressionQuality === 'low' && 'Smaller files, acceptable quality (up to 3MB, Full HD)'}
                </p>
                <p className="text-xs text-yellow-200 mt-2 bg-yellow-900 bg-opacity-30 p-2 rounded">
                  💡 <strong>Tip:</strong> For large uploads, try uploading 2-3 files at a time. Videos up to 50MB, images up to 100MB.
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
              
              <div className="mb-4">
                <input
                  type="file"
                  id="fileInput"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label
                  htmlFor="fileInput"
                  className="block w-full bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:bg-gray-200 transition-colors"
                >
                  <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-gray-600">
                    {selectedFiles ? `${selectedFiles.length} file(s) selected` : 'Click to select photos and videos'}
                  </span>
                </label>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                  uploadStatus.includes('Successfully') 
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
                      {lastUploadError.includes('too large') && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-yellow-800">
                          <div className="font-medium mb-1">💡 Suggestions:</div>
                          <ul className="text-left space-y-1">
                            <li>• Try uploading fewer files at once (2-3 instead of many)</li>
                            <li>• For images: Use "Medium Quality" or "Low Quality" compression</li>
                            <li>• For videos: Try smaller video files (under 50MB)</li>
                            <li>• Check your internet connection</li>
                            <li>• Try uploading one file at a time</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Slideshow */}
          {isSlideshowActive && media.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800">
                  Slideshow ({slideshowIndex + 1} of {media.length})
                </h3>
                <button
                  onClick={stopSlideshow}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  Stop Slideshow
                </button>
              </div>
              
              <div className="relative bg-black rounded-lg overflow-hidden">
                {media[slideshowIndex] && (
                  <>
                    {media[slideshowIndex].type === 'photo' ? (
                      <Image
                        src={media[slideshowIndex].url}
                        alt={media[slideshowIndex].caption || media[slideshowIndex].originalName}
                        width={800}
                        height={600}
                        className="w-full h-96 object-contain"
                      />
                    ) : (
                      <video
                        src={media[slideshowIndex].url}
                        controls
                        className="w-full h-96 object-contain"
                      />
                    )}
                    
                    {/* Slideshow Controls */}
                    <button
                      onClick={prevSlide}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-all"
                    >
                      ←
                    </button>
                    <button
                      onClick={nextSlide}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-all"
                    >
                      →
                    </button>
                  </>
                )}
              </div>
              
              {media[slideshowIndex] && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-600">
                    <strong>By:</strong> {media[slideshowIndex].uploadedBy || 'Guest'} | 
                    <strong> Date:</strong> {new Date(media[slideshowIndex].createdAt).toLocaleDateString()}
                  </p>
                  {media[slideshowIndex].caption && (
                    <p className="text-sm text-gray-800 mt-1">{media[slideshowIndex].caption}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Gallery Grid */}
          {media.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
                {currentMedia.map((item: MediaItem) => (
                  <div 
                    key={item._id} 
                    className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow cursor-pointer group"
                    onClick={() => openModal(item)}
                  >
                    {item.type === 'photo' ? (
                      <div className="relative bg-gray-100">
                        <Image
                          src={item.url}
                          alt={item.caption || item.originalName}
                          width={250}
                          height={300}
                          className="w-full h-64 object-contain group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                          <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                          </svg>
                        </div>
                      </div>
                    ) : (
                      <div className="relative bg-gray-100">
                        <video
                          src={item.url}
                          className="w-full h-64 object-contain group-hover:scale-105 transition-transform duration-300"
                          muted
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                          <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        </div>
                      </div>
                    )}
                    <div className="p-3">
                      <p className="text-xs text-gray-600 mb-1 truncate">
                        By: {item.uploadedBy || 'Guest'}
                      </p>
                      {item.caption && (
                        <p className="text-xs text-gray-800 mb-2 line-clamp-2">{item.caption}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center space-x-2 mb-8">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-2 rounded-lg bg-white text-gray-700 hover:bg-pink-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Previous
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => goToPage(page)}
                      className={`px-3 py-2 rounded-lg transition-colors ${
                        currentPage === page
                          ? 'bg-pink-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-pink-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 rounded-lg bg-white text-gray-700 hover:bg-pink-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16">
              <div className="bg-white rounded-lg p-12 shadow-md">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No Photos Yet</h3>
                <p className="text-gray-600 mb-6">Be the first to share your memories!</p>
                <button
                  onClick={() => setShowUploadForm(true)}
                  className="inline-block bg-pink-600 text-white px-6 py-3 rounded-lg hover:bg-pink-700 transition-colors font-semibold"
                >
                  Upload Photos & Videos
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {selectedMedia && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">
                {selectedMedia.caption || selectedMedia.originalName}
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleDeleteMedia(selectedMedia._id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Delete
                </button>
                <button
                  onClick={closeModal}
                  className="text-gray-600 hover:text-gray-800"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-4">
              {selectedMedia.type === 'photo' ? (
                <Image
                  src={selectedMedia.url}
                  alt={selectedMedia.caption || selectedMedia.originalName}
                  width={800}
                  height={600}
                  className="w-full h-auto max-h-[60vh] object-contain"
                />
              ) : (
                <video
                  src={selectedMedia.url}
                  controls
                  className="w-full h-auto max-h-[60vh]"
                />
              )}
              
              <div className="mt-4 text-sm text-gray-600">
                <p><strong>Uploaded by:</strong> {selectedMedia.uploadedBy || 'Guest'}</p>
                <p><strong>Date:</strong> {new Date(selectedMedia.createdAt).toLocaleDateString()}</p>
                {selectedMedia.caption && (
                  <p><strong>Caption:</strong> {selectedMedia.caption}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
