import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import EvidenceSubmission from '../evidence/EvidenceSubmission';
import { FindingsService } from '../../services/findingsService';
import type { Finding } from '../../types/findings';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  is_internal: boolean;
  user: {
    first_name: string;
    last_name: string;
    role: string;
  };
}

interface Evidence {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  description?: string;
  created_at: string;
  is_photo: boolean;
  is_corrective_action: boolean;
  uploaded_by_profile: {
    first_name: string;
    last_name: string;
    role: string;
  };
}

const FindingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [finding, setFinding] = useState<Finding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (id) {
      loadFinding();
    }
  }, [id]);

  const loadFinding = async () => {
    try {
      const foundFinding = await FindingsService.getFinding(id!);
      setFinding(foundFinding);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load finding');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (!finding) return;

    setUpdating(true);
    try {
      await FindingsService.updateFinding(id!, {
        status: newStatus as Finding['status'],
      });
      setFinding(prev => prev ? { ...prev, status: newStatus as Finding['status'] } : null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const canUploadEvidence = () => {
    if (!finding || !user) return false;
    
    return (
      user.role === 'gc_ehs_officer' ||
      user.role === 'client_safety_manager' ||
      user.id === finding.created_by_profile.first_name // temp check, should use proper user ID
    );
  };

  const canUpdateStatus = () => {
    if (!finding || !user) return false;
    
    return (
      user.role === 'gc_ehs_officer' ||
      user.role === 'client_safety_manager' ||
      user.role === 'client_project_manager'
    );
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'assigned': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'in_progress': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'completed_pending_approval': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'closed': return 'bg-green-100 text-green-800 border-green-200';
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isOverdue = () => {
    if (!finding) return false;
    return new Date(finding.due_date) < new Date() && finding.status !== 'closed';
  };

  const getCompletionNotes = () => {
    if (!finding?.comments) return null;
    
    // Find completion notes comment (marked with **COMPLETION NOTES:**)
    const completionComment = finding.comments.find(comment => 
      comment.content.includes('**COMPLETION NOTES:**')
    );
    
    if (completionComment && completionComment.user) {
      // Extract the content after the completion notes marker
      const content = completionComment.content.replace('**COMPLETION NOTES:**', '').trim();
      return {
        content,
        submittedBy: completionComment.user,
        submittedAt: completionComment.created_at
      };
    }
    
    return null;
  };

  const getEvidenceDocuments = () => {
    if (!finding?.evidence) return { photos: [], documents: [] };
    
    const photos = finding.evidence.filter(e => e.is_photo) || [];
    const documents = finding.evidence.filter(e => !e.is_photo) || [];
    
    return { photos, documents };
  };

  const downloadEvidence = async (evidenceId: string, fileName: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/evidence/${evidenceId}/download`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading finding...</span>
      </div>
    );
  }

  if (error || !finding) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error || 'Finding not found'}
        </div>
        <button
          onClick={() => navigate('/findings')}
          className="mt-4 text-blue-600 hover:text-blue-500"
        >
          ← Back to Findings
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/findings')}
          className="text-blue-600 hover:text-blue-500 flex items-center"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Findings
        </button>

        {canUpdateStatus() && (
          <div className="flex items-center space-x-2">
            <select
              value={finding.status}
              onChange={(e) => updateStatus(e.target.value)}
              disabled={updating}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="open">Open</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed_pending_approval">Pending Approval</option>
              <option value="closed">Closed</option>
            </select>
            {updating && (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            )}
          </div>
        )}
      </div>

      {/* Finding Details Card */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{finding.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(finding.severity)}`}>
                  {finding.severity.toUpperCase()}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(finding.status)}`}>
                  {finding.status.replace('_', ' ').toUpperCase()}
                </span>
                {isOverdue() && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-red-100 text-red-800 border-red-200">
                    OVERDUE
                  </span>
                )}
                {finding.immediate_action_required && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-red-100 text-red-800 border-red-200">
                    IMMEDIATE ACTION
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* Description */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Description</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{finding.description}</p>
          </div>

          {/* Key Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Location</dt>
                <dd className="mt-1 text-sm text-gray-900">{finding.location}</dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">Project</dt>
                <dd className="mt-1 text-sm text-gray-900">{finding.project.name}</dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">Category</dt>
                <dd className="mt-1 text-sm text-gray-900">{finding.category}</dd>
              </div>

              {finding.regulatory_reference && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Regulatory Reference</dt>
                  <dd className="mt-1 text-sm text-gray-900">{finding.regulatory_reference}</dd>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Created By</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {finding.created_by_profile.first_name} {finding.created_by_profile.last_name}
                  <span className="text-gray-500 ml-1">({finding.created_by_profile.role})</span>
                </dd>
              </div>

              {finding.assigned_to_profile && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Assigned To</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {finding.assigned_to_profile.first_name} {finding.assigned_to_profile.last_name}
                    <span className="text-gray-500 ml-1">({finding.assigned_to_profile.role})</span>
                  </dd>
                </div>
              )}

              <div>
                <dt className="text-sm font-medium text-gray-500">Due Date</dt>
                <dd className={`mt-1 text-sm ${isOverdue() ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                  {formatDate(finding.due_date)}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(finding.created_at)}</dd>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Evidence Submission Workflow */}
      <EvidenceSubmission
        findingId={finding.id}
        findingStatus={finding.status}
        onStatusUpdate={updateStatus}
        updating={updating}
      />

      {/* Approval Section for Client Safety Managers */}
      {user?.role === 'client_safety_manager' && finding?.status === 'completed_pending_approval' && !loading && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="border-b border-gray-200 bg-purple-50 px-6 py-4">
            <h3 className="text-lg font-medium text-purple-900">👔 Review & Approval Required</h3>
            <p className="text-purple-700 text-sm mt-1">
              Review the submitted completion notes and evidence before approving or rejecting this finding closure.
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Completion Notes Section */}
            {(() => {
              const completionNotes = getCompletionNotes();
              return completionNotes ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-md font-medium text-blue-900">📝 Completion Notes</h4>
                    <div className="text-sm text-blue-600">
                      Submitted by {completionNotes.submittedBy?.first_name || 'Unknown'} {completionNotes.submittedBy?.last_name || ''} 
                      <br />
                      <span className="text-xs">{formatDateTime(completionNotes.submittedAt)}</span>
                    </div>
                  </div>
                  <div className="bg-white rounded p-3 border border-blue-200">
                    <p className="text-gray-700 whitespace-pre-wrap">{completionNotes.content}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800">⚠️ No completion notes found. This may indicate an issue with the submission.</p>
                </div>
              );
            })()}

            {/* Evidence Review Section */}
            {(() => {
              const { photos, documents } = getEvidenceDocuments();
              return (
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-900">📎 Submitted Evidence</h4>
                  
                  {/* Photos Section */}
                  {photos.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h5 className="font-medium text-green-900 mb-3">📷 Photos ({photos.length})</h5>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {photos.map((photo) => (
                          <div key={photo.id} className="relative group">
                            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                              <img
                                src={`${process.env.REACT_APP_API_BASE_URL}/evidence/${photo.id}/file?thumbnail=true&token=${localStorage.getItem('token')}`}
                                alt={photo.file_name || 'Evidence photo'}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  (e.currentTarget.nextElementSibling as HTMLElement)!.style.display = 'flex';
                                }}
                              />
                              <div className="hidden w-full h-full items-center justify-center bg-gray-200">
                                <span className="text-gray-500 text-xs">No preview</span>
                              </div>
                            </div>
                            <div className="mt-1">
                              <p className="text-xs text-gray-600 truncate" title={photo.file_name || 'Unknown file'}>
                                {photo.file_name || 'Unknown file'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatFileSize(photo.file_size || 0)}
                              </p>
                            </div>
                            {/* Download overlay on hover */}
                            <div 
                              className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-lg"
                              onClick={() => downloadEvidence(photo.id, photo.file_name || 'download')}
                            >
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Documents Section */}
                  {documents.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <h5 className="font-medium text-amber-900 mb-3">📄 Documents ({documents.length})</h5>
                      <div className="space-y-2">
                        {documents.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between bg-white rounded p-3 border border-amber-200">
                            <div className="flex items-center space-x-3">
                              <div className="flex-shrink-0">
                                {doc.file_type.includes('pdf') ? (
                                  <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center">
                                    <span className="text-red-600 text-xs font-bold">PDF</span>
                                  </div>
                                ) : doc.file_type.includes('word') || doc.file_type.includes('doc') ? (
                                  <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                                    <span className="text-blue-600 text-xs font-bold">DOC</span>
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                                    <span className="text-gray-600 text-xs font-bold">FILE</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate" title={doc.file_name || 'Unknown file'}>
                                  {doc.file_name || 'Unknown file'}
                                </p>
                                <div className="flex items-center space-x-2 text-xs text-gray-500">
                                  <span>{formatFileSize(doc.file_size || 0)}</span>
                                  <span>•</span>
                                  <span>Uploaded {formatDateTime(doc.created_at)}</span>
                                  <span>•</span>
                                  <span>By {doc.uploaded_by_profile?.first_name || 'Unknown'} {doc.uploaded_by_profile?.last_name || ''}</span>
                                </div>
                                {doc.description && (
                                  <p className="text-xs text-gray-600 mt-1">{doc.description}</p>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => downloadEvidence(doc.id, doc.file_name || 'download')}
                              className="flex-shrink-0 px-3 py-1 text-xs bg-amber-600 text-white rounded hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            >
                              Download
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No Evidence Warning */}
                  {photos.length === 0 && documents.length === 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-red-800">❌ No evidence has been submitted. This finding should not be approved without proper evidence.</p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Action Buttons */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {(() => {
                    const completionNotes = getCompletionNotes();
                    const { photos, documents } = getEvidenceDocuments();
                    const hasEvidence = photos.length > 0 || documents.length > 0;
                    
                    if (completionNotes && hasEvidence) {
                      return (
                        <span className="text-green-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Ready for approval: Completion notes and evidence provided
                        </span>
                      );
                    } else {
                      return (
                        <span className="text-red-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Incomplete submission: {!completionNotes ? 'Missing completion notes' : ''} {!hasEvidence ? 'Missing evidence' : ''}
                        </span>
                      );
                    }
                  })()}
                </div>
                
                <div className="flex space-x-4">
                  <button
                    onClick={() => updateStatus('in_progress')}
                    disabled={updating}
                    className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 flex items-center"
                  >
                    {updating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Reject & Reopen
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => updateStatus('closed')}
                    disabled={updating}
                    className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 flex items-center"
                  >
                    {updating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Approve & Close
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FindingDetail; 