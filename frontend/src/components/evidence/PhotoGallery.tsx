import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface Photo {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  description?: string;
  created_at: string;
  thumbnail_path?: string;
  uploaded_by_profile: {
    first_name: string;
    last_name: string;
    role: string;
  };
}

interface PhotoGalleryProps {
  findingId: string;
  canUpload?: boolean;
  showUploadButton?: boolean;
  maxPhotos?: number;
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({ 
  findingId, 
  canUpload = false, 
  showUploadButton = true,
  maxPhotos = 20
}) => {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    loadPhotos();
  }, [findingId]);

  const loadPhotos = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/evidence/finding/${findingId}?type=photos`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (response.ok) {
        setPhotos(data.data || []);
      } else {
        setError(data.message || 'Failed to load photos');
      }
    } catch (error) {
      setError('Network error loading photos');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files: FileList) => {
    if (!files.length || !canUpload) return;

    // Check if adding these files would exceed the limit
    if (photos.length + files.length > maxPhotos) {
      setError(`Cannot upload more than ${maxPhotos} photos`);
      return;
    }

    setUploading(true);
    setError('');

    for (const file of Array.from(files)) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError(`${file.name} is not a valid image file`);
        continue;
      }

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setError(`${file.name} is too large (max 10MB)`);
        continue;
      }

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('description', '');
        formData.append('is_corrective_action', 'false');

        const token = localStorage.getItem('token');
        const response = await fetch(
          `${process.env.REACT_APP_API_BASE_URL}/evidence/finding/${findingId}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            body: formData,
          }
        );

        const data = await response.json();
        if (response.ok) {
          // Add the new photo to the list
          setPhotos(prev => [data.data, ...prev]);
        } else {
          setError(data.message || `Failed to upload ${file.name}`);
        }
      } catch (error) {
        setError(`Network error uploading ${file.name}`);
      }
    }

    setUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const getPhotoUrl = (photo: Photo, thumbnail = true) => {
    const token = localStorage.getItem('token');
    const thumbnailParam = thumbnail && photo.thumbnail_path ? 'thumbnail=true' : '';
    const tokenParam = token ? `token=${token}` : '';
    
    // Combine parameters properly
    const params = [thumbnailParam, tokenParam].filter(Boolean).join('&');
    const queryString = params ? `?${params}` : '';
    
    return `${process.env.REACT_APP_API_BASE_URL}/evidence/${photo.id}/file${queryString}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading photos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          Photos ({photos.length})
        </h3>
        
        {canUpload && showUploadButton && (
          <div className="flex items-center space-x-2">
            <input
              type="file"
              id="photo-upload"
              multiple
              accept="image/*"
              onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              className="hidden"
            />
            <label
              htmlFor="photo-upload"
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
            >
              📷 Add Photos
            </label>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Upload Area (drag and drop) */}
      {canUpload && photos.length < maxPhotos && (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="space-y-2">
            <div className="text-gray-400">
              <svg className="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="text-sm text-gray-600">
              {uploading ? (
                <span className="text-blue-600">Uploading photos...</span>
              ) : (
                <>
                  <span className="font-medium">Drop photos here</span> or{' '}
                  <label htmlFor="photo-upload" className="text-blue-600 hover:text-blue-500 cursor-pointer">
                    browse
                  </label>
                </>
              )}
            </div>
            <div className="text-xs text-gray-500">
              PNG, JPG, GIF up to 10MB each (max {maxPhotos} photos)
            </div>
          </div>
        </div>
      )}

      {/* Photo Grid */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="group relative bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedPhoto(photo)}
            >
              <div className="aspect-square">
                <img
                  src={getPhotoUrl(photo, true)}
                  alt={photo.description || photo.file_name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  loading="lazy"
                />
              </div>
              
              {/* Overlay with info */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity duration-200">
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black to-transparent">
                  <div className="text-white text-xs truncate">
                    {photo.description || photo.file_name}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-8">
          <div className="text-4xl mb-2">📷</div>
          <div>No photos yet</div>
          {canUpload && (
            <div className="text-sm">Add photos to document this observation</div>
          )}
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="max-w-4xl max-h-full bg-white rounded-lg overflow-hidden">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">
                    {selectedPhoto.description || selectedPhoto.file_name}
                  </h3>
                  <div className="text-sm text-gray-500">
                    {formatFileSize(selectedPhoto.file_size)} • {formatDate(selectedPhoto.created_at)} • 
                    by {selectedPhoto.uploaded_by_profile.first_name} {selectedPhoto.uploaded_by_profile.last_name}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-4">
              <img
                src={getPhotoUrl(selectedPhoto, false)}
                alt={selectedPhoto.description || selectedPhoto.file_name}
                className="max-w-full max-h-96 mx-auto"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoGallery; 