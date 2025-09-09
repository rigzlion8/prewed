'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useMedia, MediaItem } from '@/hooks/useMedia';

export default function GalleryPage() {
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  
  const { media, loading, error, deleteMedia } = useMedia();

  const handleDeleteMedia = async (id: string) => {
    if (confirm('Are you sure you want to delete this media?')) {
      const result = await deleteMedia(id);
      if (result.success) {
        // Close modal if the deleted item was selected
        if (selectedMedia && selectedMedia._id === id) {
          setSelectedMedia(null);
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
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      {/* Navigation */}
      <nav className="bg-white shadow-lg fixed w-full z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-2xl font-serif font-bold text-pink-600">N&K</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link 
                href="/" 
                className="text-gray-700 hover:text-pink-600 transition-colors font-medium"
              >
                ← Back to Homepage
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
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-800 mb-4">
              Photo & Video Gallery
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              All the beautiful memories shared by our family and friends
            </p>
            <div className="mt-4 text-sm text-gray-500">
              {media.length} {media.length === 1 ? 'item' : 'items'} total
            </div>
          </div>

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
                      <div className="relative">
                        <Image
                          src={item.url}
                          alt={item.caption || item.originalName}
                          width={250}
                          height={200}
                          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                          <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                          </svg>
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <video
                          src={item.url}
                          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
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
                <Link 
                  href="/#upload" 
                  className="inline-block bg-pink-600 text-white px-6 py-3 rounded-lg hover:bg-pink-700 transition-colors font-semibold"
                >
                  Upload Photos & Videos
                </Link>
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
