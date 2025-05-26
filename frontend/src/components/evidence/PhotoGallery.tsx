import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

// Component to handle authenticated image loading
interface AuthenticatedImageProps {
  src: string;
  alt: string;
  className?: string;
  token?: string;
}

const AuthenticatedImage: React.FC<AuthenticatedImageProps> = ({ src, alt, className, token }) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      if (!token) {
        setError(true);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(src, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const blob = await response.blob();
          const imageUrl = URL.createObjectURL(blob);
          setImageSrc(imageUrl);
        } else {
          setError(true);
        }
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadImage();

    // Cleanup function to revoke object URL
    return () => {
      if (imageSrc) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [src, token]);

  if (loading) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-200`}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
      </div>
    );
  }

  if (error || !imageSrc) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-200`}>
        <span className="text-gray-500 text-xs">Failed to load</span>
      </div>
    );
  }

  return <img src={imageSrc} alt={alt} className={className} />;
};

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
  canDelete?: boolean;
  refreshTrigger?: number;
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({ 
  findingId, 
  canDelete = false, 
  refreshTrigger = 0
}) => {
  const { user, session } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [deletingPhoto, setDeletingPhoto] = useState<string | null>(null);

  useEffect(() => {
    loadPhotos();
  }, [findingId]);

  useEffect(() => {
    if (refreshTrigger > 0) {
      loadPhotos();
    }
  }, [refreshTrigger]);

  const loadPhotos = async () => {
    try {
      if (!session?.access_token) {
        console.error('No access token available');
        return;
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/evidence/finding/${findingId}?type=photos`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
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

  const handleDeletePhoto = async (photoId: string) => {
    if (!session?.access_token) {
      setError('Authentication required. Please log in again.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this photo? This action cannot be undone.')) {
      return;
    }

    setDeletingPhoto(photoId);
    setError('');

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/evidence/${photoId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();
      if (response.ok) {
        // Remove the photo from the list
        setPhotos(prev => prev.filter(photo => photo.id !== photoId));
        // Close modal if this photo was selected
        if (selectedPhoto?.id === photoId) {
          setSelectedPhoto(null);
        }
      } else {
        setError(data.message || 'Failed to delete photo');
      }
    } catch (error) {
      setError('Network error deleting photo');
    } finally {
      setDeletingPhoto(null);
    }
  };

  const getPhotoUrl = (photo: Photo, thumbnail = true) => {
    const thumbnailParam = thumbnail && photo.thumbnail_path ? '?thumbnail=true' : '';
    return `${process.env.REACT_APP_API_BASE_URL}/evidence/${photo.id}/file${thumbnailParam}`;
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
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Photo Grid */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="group relative bg-gray-100 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div 
                className="aspect-square cursor-pointer"
                onClick={() => setSelectedPhoto(photo)}
              >
                <AuthenticatedImage
                  src={getPhotoUrl(photo, true)}
                  alt={photo.description || photo.file_name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  token={session?.access_token}
                />
              </div>
              
              {/* Delete button */}
              {canDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePhoto(photo.id);
                  }}
                  disabled={deletingPhoto === photo.id}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 disabled:opacity-50"
                  title="Delete photo"
                >
                  {deletingPhoto === photo.id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </button>
              )}
              
              {/* Overlay with info */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity duration-200 pointer-events-none">
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
          <div className="text-sm">Photos will appear here when uploaded</div>
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
                <div className="flex items-center space-x-2">
                  {canDelete && (
                    <button
                      onClick={() => handleDeletePhoto(selectedPhoto.id)}
                      disabled={deletingPhoto === selectedPhoto.id}
                      className="text-red-500 hover:text-red-700 disabled:opacity-50"
                      title="Delete photo"
                    >
                      {deletingPhoto === selectedPhoto.id ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-500"></div>
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  )}
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
            </div>
            
            <div className="p-4">
              <AuthenticatedImage
                src={getPhotoUrl(selectedPhoto, false)}
                alt={selectedPhoto.description || selectedPhoto.file_name}
                className="max-w-full max-h-96 mx-auto"
                token={session?.access_token}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoGallery; 