import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import EvidenceSubmission from '../evidence/EvidenceSubmission';
import { FindingsService } from '../../services/findingsService';
import type { Finding } from '../../types/findings';

// Component to handle authenticated image loading
// interface AuthenticatedImageProps {
//   src: string;
//   alt: string;
//   className?: string;
//   token?: string;
// }

// const AuthenticatedImage: React.FC<AuthenticatedImageProps> = ({ src, alt, className, token }) => {
// ... commented out as unused

// interface Comment {
//   id: string;
//   content: string;
//   created_at: string;
//   is_internal: boolean;
//   user: {
//     first_name: string;
//     last_name: string;
//     role: string;
//   };
// }

// interface Evidence {
//   id: string;
//   file_name: string;
//   file_type: string;
//   file_size: number;
//   description?: string;
//   created_at: string;
//   is_photo: boolean;
//   is_corrective_action: boolean;
//   uploaded_by_profile: {
//     first_name: string;
//     last_name: string;
//     role: string;
//   };
// }

const FindingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const [finding, setFinding] = useState<Finding | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  const loadFinding = useCallback(async () => {
    try {
      const foundFinding = await FindingsService.getFinding(id!);
      setFinding(foundFinding);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load finding');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadFinding();
    }
  }, [id, loadFinding]);

  const updateStatus = async (newStatus: string) => {
    if (!finding || !session?.access_token) return;

    setUpdating(true);
    try {
      // Use backend API instead of direct Supabase call
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/findings/${id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: newStatus,
          }),
        }
      );

      const data = await response.json();
      if (response.ok) {
        setFinding(prev => prev ? { ...prev, status: newStatus as Finding['status'] } : null);
      } else {
        setError(data.message || 'Failed to update status');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const canUpdateStatus = () => {
    if (!finding || !user) return false;
    
    return (
      user.role === 'gc_ehs_officer' ||
      user.role === 'client_safety_manager' ||
      user.role === 'client_project_manager'
    );
  };

  // const canUploadEvidence = () => {
  //   if (!finding || !user) return false;
  //   
  //   return (
  //     user.role === 'gc_ehs_officer' ||
  //     user.role === 'client_safety_manager' ||
  //     user.id === finding.created_by_profile.first_name // temp check, should use proper user ID
  //   );
  // };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-danger-light text-danger border-danger-200';
      case 'high': return 'bg-warning-light text-warning border-warning-200';
      case 'medium': return 'bg-info-light text-info border-info-200';
      case 'low': return 'bg-success-light text-success border-success-200';
      default: return 'bg-tertiary text-primary border-default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-info-light text-info border-info-200';
      case 'assigned': return 'bg-warning-light text-warning border-warning-200';
      case 'in_progress': return 'bg-primary-light text-primary border-primary-200';
      case 'completed_pending_approval': return 'bg-warning-light text-warning border-warning-200';
      case 'closed': return 'bg-success-light text-success border-success-200';
      case 'overdue': return 'bg-danger-light text-danger border-danger-200';
      default: return 'bg-tertiary text-primary border-default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // const formatFileSize = (bytes: number) => {
  //   if (bytes === 0) return '0 Bytes';
  //   const k = 1024;
  //   const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  //   const i = Math.floor(Math.log(bytes) / Math.log(k));
  //   return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  // };

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

  // const downloadEvidence = async (evidenceId: string, fileName: string) => {
  //   try {
  //     if (!session?.access_token) {
  //       console.error('No access token available');
  //       return;
  //     }

  //     const response = await fetch(
  //       `${process.env.REACT_APP_API_BASE_URL}/evidence/${evidenceId}/download`,
  //       {
  //         headers: {
  //           'Authorization': `Bearer ${session.access_token}`,
  //         },
  //       }
  //     );

  //     if (response.ok) {
  //       const blob = await response.blob();
  //       const url = window.URL.createObjectURL(blob);
  //       const a = document.createElement('a');
  //       a.style.display = 'none';
  //       a.href = url;
  //       a.download = fileName;
  //       document.body.appendChild(a);
  //       a.click();
  //       window.URL.revokeObjectURL(url);
  //       document.body.removeChild(a);
  //     }
  //   } catch (error) {
  //     console.error('Error downloading file:', error);
  //   }
  // };

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
          className="text-info hover:text-info-hover flex items-center transition-colors"
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
              className="px-3 py-2 border border-default rounded-md text-sm bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="open">Open</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed_pending_approval">Pending Approval</option>
              <option value="closed">Closed</option>
            </select>
            {updating && (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
            )}
          </div>
        )}
      </div>

      {/* Finding Details Card */}
      <div className="bg-surface shadow-base rounded-lg overflow-hidden border border-default">
        <div className="px-6 py-4 border-b border-default">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-primary">{finding.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(finding.severity)}`}>
                  {finding.severity.toUpperCase()}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(finding.status)}`}>
                  {finding.status.replace('_', ' ').toUpperCase()}
                </span>
                {isOverdue() && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-danger-light text-danger border-danger-200">
                    OVERDUE
                  </span>
                )}
                {finding.immediate_action_required && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-danger-light text-danger border-danger-200">
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div>
                <dt className="text-sm font-medium text-secondary">Description</dt>
                <dd className="mt-1 text-sm text-primary">{finding.description}</dd>
              </div>

              {finding.location && (
                <div className="mt-4">
                  <dt className="text-sm font-medium text-secondary">Location</dt>
                  <dd className="mt-1 text-sm text-primary">{finding.location}</dd>
                </div>
              )}

              {finding.category && (
                <div className="mt-4">
                  <dt className="text-sm font-medium text-secondary">Category</dt>
                  <dd className="mt-1 text-sm text-primary">{finding.category.replace('_', ' ')}</dd>
                </div>
              )}

              {finding.regulatory_reference && (
                <div className="mt-4">
                  <dt className="text-sm font-medium text-secondary">Regulatory Reference</dt>
                  <dd className="mt-1 text-sm text-primary">{finding.regulatory_reference}</dd>
                </div>
              )}

              {finding.project && (
                <div className="mt-4">
                  <dt className="text-sm font-medium text-secondary">Project</dt>
                  <dd className="mt-1 text-sm text-primary">
                    {finding.project.name}
                    <span className="text-secondary ml-2">({finding.project.client_company})</span>
                  </dd>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-secondary">Created By</dt>
                <dd className="mt-1 text-sm text-primary">
                  {finding.created_by_profile.first_name} {finding.created_by_profile.last_name}
                  <span className="text-secondary ml-1">({finding.created_by_profile.role})</span>
                </dd>
              </div>

              {finding.assigned_to_profile && (
                <div>
                  <dt className="text-sm font-medium text-secondary">Assigned To</dt>
                  <dd className="mt-1 text-sm text-primary">
                    {finding.assigned_to_profile.first_name} {finding.assigned_to_profile.last_name}
                    <span className="text-secondary ml-1">({finding.assigned_to_profile.role})</span>
                  </dd>
                </div>
              )}

              <div>
                <dt className="text-sm font-medium text-secondary">Due Date</dt>
                <dd className={`mt-1 text-sm ${isOverdue() ? 'text-danger font-medium' : 'text-primary'}`}>
                  {formatDate(finding.due_date)}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-secondary">Created</dt>
                <dd className="mt-1 text-sm text-primary">{formatDate(finding.created_at)}</dd>
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
        <div className="bg-surface shadow-base rounded-lg overflow-hidden border border-default">
          <div className="border-b border-default bg-warning-light px-6 py-4">
            <h3 className="text-lg font-medium text-warning">👔 Review & Approval Required</h3>
            <p className="text-warning-700 text-sm mt-1">
              Review the submitted completion notes and evidence before approving or rejecting this finding closure.
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Completion Notes Section */}
            {(() => {
              const completionNotes = getCompletionNotes();
              return completionNotes ? (
                <div className="bg-info-light border border-info-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-md font-medium text-info">📝 Completion Notes</h4>
                    <div className="text-sm text-info">
                      Submitted by {completionNotes.submittedBy?.first_name || 'Unknown'} {completionNotes.submittedBy?.last_name || ''} 
                      <br />
                      <span className="text-xs">{formatDateTime(completionNotes.submittedAt)}</span>
                    </div>
                  </div>
                  <div className="bg-surface rounded p-3 border border-info-200">
                    <p className="text-primary whitespace-pre-wrap">{completionNotes.content}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-warning-light border border-warning-200 rounded-lg p-4">
                  <p className="text-warning">⚠️ No completion notes found. This may indicate an issue with the submission.</p>
                </div>
              );
            })()}

            {/* Evidence Review Section */}
            {(() => {
              const { photos, documents } = getEvidenceDocuments();
              return (
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-primary mb-4">📸 Evidence Review</h4>
                  
                  {photos.length > 0 && (
                    <div className="bg-success-light border border-success-200 rounded-lg p-4">
                      <h5 className="font-medium text-success mb-3">📷 Photos ({photos.length})</h5>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {photos.map((photo) => (
                          <div key={photo.id} className="relative group">
                            <img
                              src={`${process.env.REACT_APP_API_BASE_URL}/evidence/${photo.id}/file?thumbnail=true&token=${session?.access_token}`}
                              alt={photo.description || 'Evidence photo'}
                              className="w-full h-32 object-cover rounded-lg border border-success-200 cursor-pointer hover:opacity-75 transition-opacity"
                              onClick={() => window.open(`${process.env.REACT_APP_API_BASE_URL}/evidence/${photo.id}/file?token=${session?.access_token}`, '_blank')}
                            />
                            <div className="absolute bottom-2 left-2 right-2">
                              <div className="bg-surface bg-opacity-90 rounded p-1">
                                <p className="text-xs text-primary truncate">{photo.description}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {documents.length > 0 && (
                    <div className="bg-warning-light border border-warning-200 rounded-lg p-4">
                      <h5 className="font-medium text-warning mb-3">📄 Documents ({documents.length})</h5>
                      <div className="space-y-2">
                        {documents.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between bg-surface rounded p-3 border border-warning-200">
                            <div className="flex items-center space-x-3">
                              <div className="flex-shrink-0">
                                {doc.file_type.includes('pdf') ? (
                                  <div className="w-8 h-8 bg-danger-light rounded flex items-center justify-center">
                                    <span className="text-danger text-xs font-bold">PDF</span>
                                  </div>
                                ) : doc.file_type.includes('word') || doc.file_type.includes('doc') ? (
                                  <div className="w-8 h-8 bg-info-light rounded flex items-center justify-center">
                                    <span className="text-info text-xs font-bold">DOC</span>
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 bg-tertiary rounded flex items-center justify-center">
                                    <span className="text-primary text-xs font-bold">FILE</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-primary truncate">
                                  {doc.description || 'Untitled Document'}
                                </div>
                                <div className="text-xs text-secondary">
                                  {doc.file_type} • {formatDate(doc.created_at)}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => window.open(`${process.env.REACT_APP_API_BASE_URL}/evidence/${doc.id}/download?token=${session?.access_token}`, '_blank')}
                              className="text-info hover:text-info-hover text-sm font-medium transition-colors"
                            >
                              View
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {photos.length === 0 && documents.length === 0 && (
                    <div className="bg-danger-light border border-danger-200 rounded-lg p-4">
                      <p className="text-danger">❌ No evidence has been submitted. This finding should not be approved without proper evidence.</p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Action Buttons */}
            <div className="border-t border-default pt-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-secondary">
                  {(() => {
                    const completionNotes = getCompletionNotes();
                    const { photos, documents } = getEvidenceDocuments();
                    const hasEvidence = photos.length > 0 || documents.length > 0;
                    
                    if (completionNotes && hasEvidence) {
                      return (
                        <span className="text-success flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Ready for approval: Completion notes and evidence provided
                        </span>
                      );
                    } else {
                      return (
                        <span className="text-danger flex items-center">
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