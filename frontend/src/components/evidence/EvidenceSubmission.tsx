import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import PhotoGallery from './PhotoGallery';

interface Evidence {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  description?: string;
  created_at: string;
  is_photo: boolean;
  uploaded_by_profile: {
    first_name: string;
    last_name: string;
    role: string;
  };
}

interface EvidenceSubmissionProps {
  findingId: string;
  findingStatus: string;
  onStatusUpdate: (newStatus: string) => void;
  updating: boolean;
}

const EvidenceSubmission: React.FC<EvidenceSubmissionProps> = ({
  findingId,
  findingStatus,
  onStatusUpdate,
  updating
}) => {
  const { user } = useAuth();
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [completionNotes, setCompletionNotes] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadAllEvidence();
  }, [findingId]);

  const loadAllEvidence = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/evidence/finding/${findingId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (response.ok) {
        setEvidence(data.data || []);
      }
    } catch (error) {
      console.error('Error loading evidence:', error);
    }
  };

  const handleFileUpload = async (files: FileList, isCorrectiveAction = true) => {
    if (!files.length) return;

    setUploadingFile(true);
    setError('');
    setSuccess('');

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('description', completionNotes || `Completion evidence: ${file.name}`);
        formData.append('is_corrective_action', isCorrectiveAction.toString());

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
          setSuccess(`✅ ${file.name} uploaded successfully`);
          loadAllEvidence(); // Refresh evidence list
        } else {
          setError(data.message || `Failed to upload ${file.name}`);
        }
      } catch (error) {
        setError(`Network error uploading ${file.name}`);
      }
    }

    setUploadingFile(false);
  };

  const handleSubmitForApproval = async () => {
    if (evidence.length === 0) {
      setError('Please upload at least one piece of evidence before submitting for approval');
      return;
    }

    if (!completionNotes.trim()) {
      setError('Please provide completion notes describing the corrective actions taken');
      return;
    }

    // TODO: Save completion notes as a comment
    try {
      const token = localStorage.getItem('token');
      await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/findings/${findingId}/comments`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: `**COMPLETION NOTES:**\n\n${completionNotes}`,
            is_internal: false
          }),
        }
      );
    } catch (error) {
      console.error('Error saving completion notes:', error);
    }

    // Update status to pending approval
    onStatusUpdate('completed_pending_approval');
  };

  const photos = evidence.filter(e => e.is_photo);
  const documents = evidence.filter(e => !e.is_photo);

  if (user?.role !== 'gc_ehs_officer') {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Status-based workflow guidance */}
      {findingStatus === 'open' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-4">📋 Ready to Start Work?</h3>
          <p className="text-blue-700 mb-4">
            Click below to begin working on this finding. You'll then be able to upload evidence and submit completion notes.
          </p>
          <button
            onClick={() => onStatusUpdate('in_progress')}
            disabled={updating}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {updating ? 'Starting...' : '🚀 Start Work'}
          </button>
        </div>
      )}

      {findingStatus === 'in_progress' && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="border-b border-gray-200 bg-amber-50 px-6 py-4">
            <h3 className="text-lg font-medium text-amber-900">📸 Submit Evidence for Closure</h3>
            <p className="text-amber-700 text-sm mt-1">
              Upload photos, videos, and documents showing completed corrective actions, then provide completion notes.
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* File Upload Section */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">Upload Evidence Files</h4>
              
              {/* Drag & Drop Upload Area */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  id="evidence-upload"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.mp4,.mov,.avi"
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  className="hidden"
                  disabled={uploadingFile}
                />
                <label htmlFor="evidence-upload" className="cursor-pointer">
                  <div className="space-y-2">
                    <div className="text-gray-400">
                      <svg className="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="text-sm text-gray-600">
                      {uploadingFile ? (
                        <span className="text-blue-600">Uploading files...</span>
                      ) : (
                        <>
                          <span className="font-medium">Click to upload</span> or drag and drop
                        </>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      Photos, Videos, Documents (PDF, DOC, DOCX) up to 10MB each
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Current Evidence Summary */}
            {evidence.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h5 className="font-medium text-blue-900 mb-2">📷 Photos ({photos.length})</h5>
                  <div className="text-sm text-blue-700">
                    {photos.length > 0 ? (
                      <ul className="space-y-1">
                        {photos.slice(0, 3).map(photo => (
                          <li key={photo.id} className="truncate">• {photo.file_name}</li>
                        ))}
                        {photos.length > 3 && <li>• ...and {photos.length - 3} more</li>}
                      </ul>
                    ) : (
                      <span className="italic">No photos uploaded yet</span>
                    )}
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <h5 className="font-medium text-green-900 mb-2">📄 Documents ({documents.length})</h5>
                  <div className="text-sm text-green-700">
                    {documents.length > 0 ? (
                      <ul className="space-y-1">
                        {documents.slice(0, 3).map(doc => (
                          <li key={doc.id} className="truncate">• {doc.file_name}</li>
                        ))}
                        {documents.length > 3 && <li>• ...and {documents.length - 3} more</li>}
                      </ul>
                    ) : (
                      <span className="italic">No documents uploaded yet</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Completion Notes */}
            <div>
              <label htmlFor="completion-notes" className="block text-md font-medium text-gray-900 mb-2">
                📝 Completion Notes <span className="text-red-500">*</span>
              </label>
              <p className="text-sm text-gray-600 mb-3">
                Describe the corrective actions you took to resolve this finding.
              </p>
              <textarea
                id="completion-notes"
                rows={6}
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Example:
• Installed proper guardrails around the excavation perimeter
• Secured electrical panel covers and posted warning signs
• Conducted safety briefing with all workers
• Implemented daily inspection checklist"
              />
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                {success}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                {evidence.length > 0 && completionNotes.trim() ? (
                  <span className="text-green-600">✅ Ready to submit for approval</span>
                ) : (
                  <span>Upload evidence and add completion notes to submit</span>
                )}
              </div>
              <button
                onClick={handleSubmitForApproval}
                disabled={updating || evidence.length === 0 || !completionNotes.trim()}
                className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {updating ? 'Submitting...' : '✅ Submit for Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {findingStatus === 'completed_pending_approval' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-yellow-900 mb-4">⏳ Submitted - Awaiting Approval</h3>
          <p className="text-yellow-700 mb-4">
            Your evidence and completion notes have been submitted for review by the Client Safety Manager.
          </p>
          <div className="text-sm text-yellow-600">
            • Evidence files uploaded: {evidence.length}
            • Completion notes: ✅ Provided
          </div>
        </div>
      )}

      {findingStatus === 'closed' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-green-900 mb-4">✅ Finding Approved & Closed</h3>
          <p className="text-green-700">
            Your evidence has been reviewed and approved. Great work completing this finding!
          </p>
        </div>
      )}

      {/* Photos Section (always visible for review) */}
      {photos.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <PhotoGallery
            findingId={findingId}
            canUpload={findingStatus === 'in_progress'}
            showUploadButton={false} // We have our own upload interface above
            maxPhotos={20}
          />
        </div>
      )}
    </div>
  );
};

export default EvidenceSubmission; 