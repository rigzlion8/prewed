'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useMedia, MediaItem } from '@/hooks/useMedia';

export default function AdminPage() {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'photo' | 'video'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'size'>('newest');
  
  const itemsPerPage = 20;
  
  const { media, loading, error, deleteMedia, fetchMedia } = useMedia();

  // Filter and sort media
  const filteredMedia = media
    .filter(item => {
      const matchesSearch = item.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.uploadedBy?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.caption?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || item.type === filterType;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'name':
          return a.originalName.localeCompare(b.originalName);
        case 'size':
          return b.size - a.size;
        default:
          return 0;
      }
    });

  // Pagination
  const totalPages = Math.ceil(filteredMedia.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentMedia = filteredMedia.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedItems.length === currentMedia.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(currentMedia.map(item => item._id));
    }
  };

  const handleSelectItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  // Delete handlers
  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    
    setDeleteLoading(true);
    try {
      const deletePromises = selectedItems.map(id => deleteMedia(id));
      await Promise.all(deletePromises);
      
      setSelectedItems([]);
      setShowDeleteConfirm(false);
      await fetchMedia(); // Refresh the list
    } catch (error) {
      console.error('Error deleting media:', error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSingleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      await deleteMedia(id);
      await fetchMedia(); // Refresh the list
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading admin panel: {error}</p>
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
              <span className="text-sm text-gray-500">Admin</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link 
                href="/gallery" 
                className="text-gray-700 hover:text-pink-600 transition-colors font-medium"
              >
                📸 Gallery
              </Link>
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
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-800 mb-4">
              Admin Panel
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Manage all photos and videos in your gallery
            </p>
            <div className="mt-4 text-sm text-gray-500">
              {media.length} total items • {filteredMedia.length} filtered
            </div>
          </div>

          {/* Controls */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, uploader, or caption..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
                />
              </div>

              {/* Filter by Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as 'all' | 'photo' | 'video')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="photo">Photos Only</option>
                  <option value="video">Videos Only</option>
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'name' | 'size')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="name">Name A-Z</option>
                  <option value="size">Largest First</option>
                </select>
              </div>

              {/* Bulk Actions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Actions
                </label>
                <div className="flex space-x-2">
                  <button
                    onClick={handleSelectAll}
                    className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    {selectedItems.length === currentMedia.length ? 'Deselect All' : 'Select All'}
                  </button>
                  {selectedItems.length > 0 && (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex-1 bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
                    >
                      Delete ({selectedItems.length})
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Selection Summary */}
            {selectedItems.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-blue-800 text-sm">
                  {selectedItems.length} item(s) selected
                </p>
              </div>
            )}
          </div>

          {/* Media Grid */}
          {currentMedia.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                {currentMedia.map((item: MediaItem) => (
                  <div 
                    key={item._id} 
                    className={`bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all cursor-pointer ${
                      selectedItems.includes(item._id) ? 'ring-2 ring-pink-500' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <div className="p-3 border-b">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item._id)}
                          onChange={() => handleSelectItem(item._id)}
                          className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
                        />
                        <span className="text-sm text-gray-600">Select</span>
                      </label>
                    </div>

                    {/* Media Preview */}
                    <div className="relative">
                      {item.type === 'photo' ? (
                        <Image
                          src={item.url}
                          alt={item.caption || item.originalName}
                          width={300}
                          height={200}
                          className="w-full h-48 object-cover"
                        />
                      ) : (
                        <video
                          src={item.url}
                          className="w-full h-48 object-cover"
                          muted
                        />
                      )}
                      <div className="absolute top-2 right-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.type === 'photo' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {item.type === 'photo' ? '📸' : '🎥'}
                        </span>
                      </div>
                    </div>

                    {/* Media Info */}
                    <div className="p-4">
                      <h3 className="font-medium text-gray-800 mb-2 truncate">
                        {item.originalName}
                      </h3>
                      
                      <div className="space-y-1 text-sm text-gray-600">
                        <p><strong>By:</strong> {item.uploadedBy || 'Guest'}</p>
                        <p><strong>Size:</strong> {formatFileSize(item.size)}</p>
                        <p><strong>Date:</strong> {new Date(item.createdAt).toLocaleDateString()}</p>
                        {item.caption && (
                          <p><strong>Caption:</strong> {item.caption}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="mt-4 flex space-x-2">
                        <button
                          onClick={() => handleSingleDelete(item._id)}
                          className="flex-1 bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
                        >
                          Delete
                        </button>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm text-center"
                        >
                          View
                        </a>
                      </div>
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No Media Found</h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm || filterType !== 'all' 
                    ? 'Try adjusting your search or filters' 
                    : 'No media has been uploaded yet'
                  }
                </p>
                <Link 
                  href="/gallery" 
                  className="inline-block bg-pink-600 text-white px-6 py-3 rounded-lg hover:bg-pink-700 transition-colors font-semibold"
                >
                  Go to Gallery
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Confirm Deletion
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete {selectedItems.length} item(s)? This action cannot be undone.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={deleteLoading}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
