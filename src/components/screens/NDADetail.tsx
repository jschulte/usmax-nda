import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../ui/AppCard';
import { Badge } from '../ui/AppBadge';
import { Button } from '../ui/AppButton';
import {
  ArrowLeft,
  Download,
  Send,
  ExternalLink,
  Calendar,
  Building,
  User,
  FileText,
  MessageSquare,
  Clock,
  Eye,
  CheckCircle,
  Circle,
  Bell,
  BellOff,
  Loader2,
  Upload,
  Trash2,
  Archive,
  Check
} from 'lucide-react';
import type { WorkflowStep } from '../../types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { toast } from 'sonner@2.0.3';
import { getNDA, updateNDAStatus, type NdaDetail, type NdaStatus } from '../../client/services/ndaService';
import { getNDAAuditTrail, type TimelineEntry } from '../../client/services/auditService';
import { subscribe, unsubscribe, getNDASubscriptions, type Subscriber } from '../../client/services/notificationService';
import {
  uploadDocument,
  listDocuments,
  downloadDocument,
  generateDocument,
  markAsExecuted,
  downloadAllDocuments,
  type Document
} from '../../client/services/documentService';

export function NDADetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Data state
  const [nda, setNda] = useState<NdaDetail | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  // Document state
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<'overview' | 'document' | 'activity'>('overview');
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showAddNoteDialog, setShowAddNoteDialog] = useState(false);
  const [showMarkExecutedDialog, setShowMarkExecutedDialog] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  // Load NDA data on mount
  useEffect(() => {
    if (!id) return;

    const loadNDAData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getNDA(id);
        setNda(data);
      } catch (err) {
        console.error('Failed to load NDA:', err);
        setError(err instanceof Error ? err.message : 'Failed to load NDA');
      } finally {
        setLoading(false);
      }
    };

    loadNDAData();
  }, [id]);

  // Load audit trail when activity tab is opened
  useEffect(() => {
    if (!id || activeTab !== 'activity') return;

    const loadAuditTrail = async () => {
      try {
        const data = await getNDAAuditTrail(id);
        setTimeline(data.timeline);
      } catch (err) {
        console.error('Failed to load audit trail:', err);
        toast.error('Failed to load activity history');
      }
    };

    loadAuditTrail();
  }, [id, activeTab]);

  // Load subscribers when component mounts
  useEffect(() => {
    if (!id) return;

    const loadSubscribers = async () => {
      try {
        const data = await getNDASubscriptions(id);
        setSubscribers(data.subscribers);
        // Check if current user is subscribed (this would need current user ID)
        // For now, we'll implement a simple check
      } catch (err) {
        console.error('Failed to load subscribers:', err);
      }
    };

    loadSubscribers();
  }, [id]);

  // Load documents when document tab is opened
  useEffect(() => {
    if (!id || activeTab !== 'document') return;

    const loadDocuments = async () => {
      try {
        setDocumentsLoading(true);
        const docs = await listDocuments(id);
        setDocuments(docs);
      } catch (err) {
        console.error('Failed to load documents:', err);
        toast.error('Failed to load documents');
      } finally {
        setDocumentsLoading(false);
      }
    };

    loadDocuments();
  }, [id, activeTab]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
          <p className="text-[var(--color-text-secondary)]">Loading NDA details...</p>
        </div>
      </div>
    );
  }

  if (error || !nda) {
    return (
      <div className="p-8">
        <Button
          variant="subtle"
          size="sm"
          icon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate('/requests')}
          className="mb-4"
        >
          Back to requests
        </Button>
        <Card>
          <div className="text-center py-12">
            <p className="text-lg mb-2">{error || 'NDA not found'}</p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              The NDA you're looking for doesn't exist or you don't have permission to view it.
            </p>
          </div>
        </Card>
      </div>
    );
  }
  
  const handleDownloadPDF = () => {
    toast.success('PDF download started', {
      description: `Downloading ${nda.companyName} NDA...`
    });
    // TODO: Implement actual PDF download when document service is available
  };

  const handleSendForSignature = () => {
    setShowSendDialog(true);
  };

  const confirmSendForSignature = async () => {
    if (!id) return;

    try {
      setStatusUpdating(true);
      await updateNDAStatus(id, 'EMAILED', 'Sent for signature');
      toast.success('NDA sent for signature', {
        description: 'An email has been sent to the counterparty'
      });
      // Reload NDA data
      const updatedNda = await getNDA(id);
      setNda(updatedNda);
      setShowSendDialog(false);
    } catch (err) {
      console.error('Failed to send NDA:', err);
      toast.error('Failed to send NDA for signature');
    } finally {
      setStatusUpdating(false);
    }
  };

  // External signing portal removed - out of scope per PRD

  const handleStartReview = () => {
    setShowReviewDialog(true);
  };

  const handleCompleteReview = async () => {
    if (!id) return;

    try {
      setStatusUpdating(true);
      await updateNDAStatus(id, 'IN_REVISION', reviewNotes || 'Review completed');
      toast.success('Review completed', {
        description: 'The NDA has been marked as reviewed and is ready for approval.'
      });
      // Reload NDA data
      const updatedNda = await getNDA(id);
      setNda(updatedNda);
      setShowReviewDialog(false);
      setReviewNotes('');
    } catch (err) {
      console.error('Failed to complete review:', err);
      toast.error('Failed to complete review');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleApprove = () => {
    setShowApprovalDialog(true);
  };

  const confirmApproval = async () => {
    if (!id) return;

    try {
      setStatusUpdating(true);
      await updateNDAStatus(id, 'EMAILED', 'Approved and ready for signature');
      toast.success('NDA approved', {
        description: 'The NDA has been approved and can now be sent for signature.'
      });
      // Reload NDA data
      const updatedNda = await getNDA(id);
      setNda(updatedNda);
      setShowApprovalDialog(false);
    } catch (err) {
      console.error('Failed to approve NDA:', err);
      toast.error('Failed to approve NDA');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleToggleSubscription = async () => {
    if (!id) return;

    try {
      setSubscribing(true);
      if (isSubscribed) {
        await unsubscribe(id);
        setIsSubscribed(false);
        toast.success('Unsubscribed', {
          description: 'You will no longer receive notifications for this NDA'
        });
      } else {
        await subscribe(id);
        setIsSubscribed(true);
        toast.success('Subscribed', {
          description: 'You will receive notifications for updates to this NDA'
        });
      }
      // Reload subscribers
      const data = await getNDASubscriptions(id);
      setSubscribers(data.subscribers);
    } catch (err) {
      console.error('Failed to toggle subscription:', err);
      toast.error('Failed to update subscription');
    } finally {
      setSubscribing(false);
    }
  };

  const handleAddNote = () => {
    if (internalNotes.trim()) {
      toast.success('Note added', {
        description: 'Internal note has been saved successfully.'
      });
      setInternalNotes('');
      // TODO: Implement note saving when comment/note API is available
    }
  };


  // Document handlers
  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0 || !id) return;

    const file = files[0];

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/rtf',
      'text/rtf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type', {
        description: 'Only PDF, RTF, and DOCX files are allowed'
      });
      return;
    }

    // Validate file size (50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File too large', {
        description: 'Maximum file size is 50MB'
      });
      return;
    }

    try {
      setUploading(true);
      const document = await uploadDocument(id, file);
      toast.success('Document uploaded', {
        description: `${file.name} has been uploaded successfully`
      });
      // Reload documents
      const docs = await listDocuments(id);
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to upload document:', err);
      toast.error('Upload failed', {
        description: err instanceof Error ? err.message : 'Failed to upload document'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    await handleFileSelect(e.dataTransfer.files);
  };

  const handleDownloadDocument = async (doc: Document) => {
    if (!id) return;

    try {
      await downloadDocument(id, doc.id);
      toast.success('Download started', {
        description: `Downloading ${doc.filename}`
      });
    } catch (err) {
      console.error('Failed to download document:', err);
      toast.error('Download failed', {
        description: err instanceof Error ? err.message : 'Failed to download document'
      });
    }
  };

  const handleGenerateDocument = async () => {
    if (!id) return;

    try {
      setGenerating(true);
      const result = await generateDocument(id);
      toast.success('Document generated', {
        description: `${result.filename} has been generated successfully`
      });
      // Reload documents
      const docs = await listDocuments(id);
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to generate document:', err);
      toast.error('Generation failed', {
        description: err instanceof Error ? err.message : 'Failed to generate document'
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleMarkAsExecuted = (doc: Document) => {
    setSelectedDocument(doc);
    setShowMarkExecutedDialog(true);
  };

  const confirmMarkAsExecuted = async () => {
    if (!selectedDocument || !id) return;

    try {
      setStatusUpdating(true);
      await markAsExecuted(selectedDocument.id);
      toast.success('Document marked as executed', {
        description: 'The NDA status has been updated to Fully Executed'
      });
      // Reload documents and NDA
      const docs = await listDocuments(id);
      setDocuments(docs);
      const updatedNda = await getNDA(id);
      setNda(updatedNda);
      setShowMarkExecutedDialog(false);
      setSelectedDocument(null);
    } catch (err) {
      console.error('Failed to mark as executed:', err);
      toast.error('Failed to mark as executed', {
        description: err instanceof Error ? err.message : 'An error occurred'
      });
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleDownloadAll = async () => {
    if (!id) return;

    try {
      await downloadAllDocuments(id);
      toast.success('Download started', {
        description: 'Downloading all documents as ZIP'
      });
    } catch (err) {
      console.error('Failed to download all documents:', err);
      toast.error('Download failed', {
        description: err instanceof Error ? err.message : 'Failed to download documents'
      });
    }
  };

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  // Map backend status to UI display status
  const getDisplayStatus = (status: NdaStatus): string => {
    const statusMap: Record<NdaStatus, string> = {
      CREATED: 'Draft',
      EMAILED: 'Waiting for signature',
      IN_REVISION: 'In legal review',
      FULLY_EXECUTED: 'Executed',
      INACTIVE: 'Inactive',
      CANCELLED: 'Cancelled'
    };
    return statusMap[status] || status;
  };

  // Map backend status to risk/badge variant
  const getStatusVariant = (status: NdaStatus): 'success' | 'warning' | 'error' | 'info' => {
    switch (status) {
      case 'FULLY_EXECUTED':
        return 'success';
      case 'EMAILED':
      case 'IN_REVISION':
        return 'warning';
      case 'CANCELLED':
      case 'INACTIVE':
        return 'error';
      default:
        return 'info';
    }
  };

  // Build workflow steps based on backend status
  const workflowSteps: WorkflowStep[] = [
    {
      id: '1',
      name: 'Request created',
      status: 'completed',
      timestamp: nda.createdAt,
      actor: `${nda.createdBy.firstName} ${nda.createdBy.lastName}`
    },
    {
      id: '2',
      name: 'Legal review',
      status: nda.status === 'IN_REVISION' ? 'in-progress' : nda.status === 'CREATED' ? 'pending' : 'completed',
      timestamp: nda.status !== 'CREATED' ? nda.updatedAt : undefined,
    },
    {
      id: '3',
      name: 'Sent to counterparty',
      status: nda.status === 'EMAILED' ? 'in-progress' : nda.status === 'FULLY_EXECUTED' ? 'completed' : 'pending',
      timestamp: nda.status === 'EMAILED' ? nda.updatedAt : undefined
    },
    {
      id: '4',
      name: 'Signed by counterparty',
      status: nda.status === 'FULLY_EXECUTED' ? 'completed' : 'pending'
    },
    {
      id: '5',
      name: 'Signed by government',
      status: nda.status === 'FULLY_EXECUTED' ? 'completed' : 'pending',
      timestamp: nda.status === 'FULLY_EXECUTED' ? nda.effectiveDate : undefined
    },
    {
      id: '6',
      name: 'Executed',
      status: nda.status === 'FULLY_EXECUTED' ? 'completed' : 'pending',
      timestamp: nda.status === 'FULLY_EXECUTED' ? nda.effectiveDate : undefined
    }
  ];

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };
  
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <Button 
          variant="subtle" 
          size="sm" 
          icon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate('/requests')}
          className="mb-4"
        >
          Back to requests
        </Button>
        
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1">
            <h1 className="mb-3">{nda.companyName} - {nda.agencyGroup.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge variant={getStatusVariant(nda.status)}>{getDisplayStatus(nda.status)}</Badge>
              <Badge variant="info">{nda.displayId}</Badge>
              <Badge variant="default">{nda.usMaxPosition}</Badge>
              {nda.effectiveDate && (
                <Badge variant="info">Effective {new Date(nda.effectiveDate).toLocaleDateString()}</Badge>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={subscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : isSubscribed ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
              onClick={handleToggleSubscription}
              disabled={subscribing}
            >
              {isSubscribed ? 'Unsubscribe' : 'Subscribe'}
            </Button>
            <Button variant="secondary" icon={<Download className="w-4 h-4" />} onClick={handleDownloadPDF}>
              Download PDF
            </Button>
            {nda.status === 'IN_REVISION' && (
              <Button variant="primary" icon={<Send className="w-4 h-4" />} onClick={handleSendForSignature} disabled={statusUpdating}>
                Send for signature
              </Button>
            )}
            {/* External signing portal button removed - out of scope per PRD */}
          </div>
        </div>
      </div>
      
      {/* Main content area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Main content with tabs */}
        <div className="lg:col-span-2">
          <Card padding="none">
            {/* Tabs */}
            <div className="border-b border-[var(--color-border)]">
              <div className="flex">
                {[
                  { key: 'overview', label: 'Overview' },
                  { key: 'document', label: 'Document' },
                  { key: 'activity', label: 'Activity' }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`px-6 py-4 border-b-2 transition-colors ${
                      activeTab === tab.key
                        ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                        : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="p-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* At-a-glance summary */}
                  <div>
                    <h3 className="mb-4">At-a-glance summary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-start gap-3">
                        <Building className="w-5 h-5 text-[var(--color-text-secondary)] flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-[var(--color-text-secondary)] mb-1">Agency Group</p>
                          <p>{nda.agencyGroup.name}</p>
                        </div>
                      </div>
                      {nda.subagency && (
                        <div className="flex items-start gap-3">
                          <Building className="w-5 h-5 text-[var(--color-text-secondary)] flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm text-[var(--color-text-secondary)] mb-1">Subagency</p>
                            <p>{nda.subagency.name}</p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-start gap-3">
                        <Building className="w-5 h-5 text-[var(--color-text-secondary)] flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-[var(--color-text-secondary)] mb-1">Company</p>
                          <p>{nda.companyName}</p>
                          {nda.companyCity && nda.companyState && (
                            <p className="text-sm text-[var(--color-text-secondary)]">{nda.companyCity}, {nda.companyState}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Calendar className="w-5 h-5 text-[var(--color-text-secondary)] flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-[var(--color-text-secondary)] mb-1">Created</p>
                          <p>{new Date(nda.createdAt).toLocaleDateString()}</p>
                          <p className="text-sm text-[var(--color-text-muted)]">by {nda.createdBy.firstName} {nda.createdBy.lastName}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Calendar className="w-5 h-5 text-[var(--color-text-secondary)] flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-[var(--color-text-secondary)] mb-1">Last Updated</p>
                          <p>{new Date(nda.updatedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      {nda.effectiveDate && (
                        <div className="flex items-start gap-3">
                          <Calendar className="w-5 h-5 text-[var(--color-text-secondary)] flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm text-[var(--color-text-secondary)] mb-1">Effective Date</p>
                            <p>{new Date(nda.effectiveDate).toLocaleDateString()}</p>
                          </div>
                        </div>
                      )}
                      {nda.stateOfIncorporation && (
                        <div className="flex items-start gap-3">
                          <Building className="w-5 h-5 text-[var(--color-text-secondary)] flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm text-[var(--color-text-secondary)] mb-1">State of Incorporation</p>
                            <p>{nda.stateOfIncorporation}</p>
                          </div>
                        </div>
                      )}
                      {nda.agencyOfficeName && (
                        <div className="flex items-start gap-3">
                          <Building className="w-5 h-5 text-[var(--color-text-secondary)] flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm text-[var(--color-text-secondary)] mb-1">Agency Office</p>
                            <p>{nda.agencyOfficeName}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Scope and data */}
                  <div className="pt-6 border-t border-[var(--color-border)]">
                    <h3 className="mb-4">Scope and data</h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-[var(--color-text-secondary)] mb-2">Authorized Purpose</p>
                        <p>{nda.authorizedPurpose}</p>
                      </div>
                      <div>
                        <p className="text-sm text-[var(--color-text-secondary)] mb-2">Abbreviated Name</p>
                        <p>{nda.abbreviatedName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-[var(--color-text-secondary)] mb-2">US/MAX Position</p>
                        <p>{nda.usMaxPosition}</p>
                      </div>
                      {nda.isNonUsMax && (
                        <div>
                          <Badge variant="warning">Non-US/MAX Agreement</Badge>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Workflow status */}
                  <div className="pt-6 border-t border-[var(--color-border)]">
                    <h3 className="mb-4">Workflow status</h3>
                    <div className="space-y-4">
                      {workflowSteps.map((step, index) => (
                        <div key={step.id} className="flex gap-4">
                          <div className="relative">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                              step.status === 'completed' 
                                ? 'bg-[var(--color-success)] border-[var(--color-success)]' 
                                : step.status === 'in-progress'
                                ? 'bg-blue-100 border-[var(--color-primary)]'
                                : 'bg-white border-[var(--color-border)]'
                            }`}>
                              {step.status === 'completed' ? (
                                <CheckCircle className="w-5 h-5 text-white" />
                              ) : step.status === 'in-progress' ? (
                                <Clock className="w-4 h-4 text-[var(--color-primary)]" />
                              ) : (
                                <Circle className="w-4 h-4 text-[var(--color-text-muted)]" />
                              )}
                            </div>
                            {index < workflowSteps.length - 1 && (
                              <div className={`absolute left-1/2 top-8 bottom-0 w-0.5 -translate-x-1/2 ${
                                step.status === 'completed' ? 'bg-[var(--color-success)]' : 'bg-[var(--color-border)]'
                              }`} />
                            )}
                          </div>
                          <div className="flex-1 pb-6">
                            <p className={step.status === 'completed' || step.status === 'in-progress' ? '' : 'text-[var(--color-text-secondary)]'}>
                              {step.name}
                            </p>
                            {step.timestamp && (
                              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                                {new Date(step.timestamp).toLocaleDateString()} 
                                {step.actor && ` • ${step.actor}`}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Document Tab */}
              {activeTab === 'document' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3>Documents ({documents.length})</h3>
                    <div className="flex gap-2">
                      {documents.length > 0 && (
                        <Button
                          variant="subtle"
                          size="sm"
                          icon={<Archive className="w-4 h-4" />}
                          onClick={handleDownloadAll}
                        >
                          Download all
                        </Button>
                      )}
                      {!nda.isNonUsMax && (
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                          onClick={handleGenerateDocument}
                          disabled={generating}
                        >
                          {generating ? 'Generating...' : 'Generate document'}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Upload area with drag and drop */}
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center mb-6 transition-colors ${
                      dragActive
                        ? 'border-[var(--color-primary)] bg-blue-50'
                        : 'border-[var(--color-border)] hover:border-gray-400'
                    }`}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      id="document-upload"
                      className="hidden"
                      accept=".pdf,.rtf,.docx,.doc"
                      onChange={(e) => handleFileSelect(e.target.files)}
                      disabled={uploading}
                    />
                    {uploading ? (
                      <div className="flex flex-col items-center">
                        <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin mb-3" />
                        <p className="text-[var(--color-text-secondary)]">Uploading document...</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-3" />
                        <p className="text-[var(--color-text-secondary)] mb-2">
                          Drag and drop a document here, or{' '}
                          <label htmlFor="document-upload" className="text-[var(--color-primary)] cursor-pointer hover:underline">
                            browse
                          </label>
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          Supports PDF, RTF, and DOCX files up to 50MB
                        </p>
                      </>
                    )}
                  </div>

                  {/* Documents list */}
                  {documentsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
                      <p className="ml-3 text-[var(--color-text-secondary)]">Loading documents...</p>
                    </div>
                  ) : documents.length > 0 ? (
                    <div className="space-y-3">
                      {documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-4 border border-[var(--color-border)] rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <FileText className="w-5 h-5 text-[var(--color-text-secondary)] flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium truncate">{doc.filename}</p>
                                {doc.isFullyExecuted && (
                                  <Badge variant="success" className="flex-shrink-0">
                                    <Check className="w-3 h-3 mr-1" />
                                    Executed
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-[var(--color-text-secondary)]">
                                Version {doc.versionNumber} • {formatFileSize(doc.fileSize)} •{' '}
                                {new Date(doc.uploadedAt).toLocaleDateString()} •{' '}
                                Uploaded by {doc.uploadedBy.firstName} {doc.uploadedBy.lastName}
                              </p>
                              {doc.notes && (
                                <p className="text-xs text-[var(--color-text-muted)] mt-1 truncate">
                                  {doc.notes}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0 ml-4">
                            <Button
                              variant="subtle"
                              size="sm"
                              icon={<Download className="w-4 h-4" />}
                              onClick={() => handleDownloadDocument(doc)}
                            >
                              Download
                            </Button>
                            {!doc.isFullyExecuted && nda.status !== 'FULLY_EXECUTED' && (
                              <Button
                                variant="primary"
                                size="sm"
                                icon={<CheckCircle className="w-4 h-4" />}
                                onClick={() => handleMarkAsExecuted(doc)}
                              >
                                Mark as executed
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border border-[var(--color-border)] rounded-lg p-12 text-center">
                      <FileText className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-3" />
                      <p className="text-[var(--color-text-secondary)] mb-2">No documents yet</p>
                      <p className="text-sm text-[var(--color-text-muted)]">
                        Generate a document or upload a file to get started
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Activity Tab */}
              {activeTab === 'activity' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3>Activity Log</h3>
                    <Button variant="subtle" size="sm">Filter</Button>
                  </div>
                  <div className="space-y-3">
                    {timeline.length > 0 ? (
                      timeline.map((entry) => (
                        <div key={entry.id} className="flex items-start gap-4 p-3 border border-[var(--color-border)] rounded-lg">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0`} style={{ backgroundColor: entry.color + '20', color: entry.color }}>
                            {entry.icon === 'check' && <CheckCircle className="w-4 h-4" />}
                            {entry.icon === 'send' && <Send className="w-4 h-4" />}
                            {entry.icon === 'file' && <FileText className="w-4 h-4" />}
                            {entry.icon === 'message' && <MessageSquare className="w-4 h-4" />}
                            {entry.icon === 'eye' && <Eye className="w-4 h-4" />}
                            {entry.icon === 'clock' && <Clock className="w-4 h-4" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-1">
                              <p className="font-medium">{entry.label}</p>
                              <span className="text-xs text-[var(--color-text-muted)]">{entry.relativeTime}</span>
                            </div>
                            <p className="text-sm text-[var(--color-text-secondary)] mb-1">{entry.description}</p>
                            <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                              <span>{entry.user.name}</span>
                              <span>•</span>
                              <span>{new Date(entry.timestamp).toLocaleString()}</span>
                            </div>
                            {entry.details && Object.keys(entry.details).length > 0 && (
                              <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                                <pre className="whitespace-pre-wrap">{JSON.stringify(entry.details, null, 2)}</pre>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-[var(--color-text-secondary)] text-center py-8">No activity recorded yet</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
        
        {/* Right column - Side panels */}
        <div className="space-y-6">
          {/* People */}
          <Card>
            <h3 className="mb-4">People</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-[var(--color-text-secondary)] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-[var(--color-text-secondary)]">Created By</p>
                  <p className="text-sm">{nda.createdBy.firstName} {nda.createdBy.lastName}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-[var(--color-text-secondary)] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-[var(--color-text-secondary)]">Relationship POC</p>
                  <p className="text-sm">{nda.relationshipPoc.firstName} {nda.relationshipPoc.lastName}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{nda.relationshipPoc.email}</p>
                </div>
              </div>
              {nda.opportunityPoc && (
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-[var(--color-text-secondary)] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-[var(--color-text-secondary)]">Opportunity POC</p>
                    <p className="text-sm">{nda.opportunityPoc.firstName} {nda.opportunityPoc.lastName}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{nda.opportunityPoc.email}</p>
                  </div>
                </div>
              )}
              {nda.contractsPoc && (
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-[var(--color-text-secondary)] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-[var(--color-text-secondary)]">Contracts POC</p>
                    <p className="text-sm">{nda.contractsPoc.firstName} {nda.contractsPoc.lastName}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{nda.contractsPoc.email}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Subscribers */}
          {subscribers.length > 0 && (
            <Card>
              <h3 className="mb-4">Subscribers ({subscribers.length})</h3>
              <div className="space-y-3">
                {subscribers.slice(0, 5).map((subscriber) => (
                  <div key={subscriber.id} className="flex items-center gap-2">
                    <User className="w-4 h-4 text-[var(--color-text-secondary)]" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{subscriber.contact.firstName} {subscriber.contact.lastName}</p>
                      <p className="text-xs text-[var(--color-text-muted)] truncate">{subscriber.contact.email}</p>
                    </div>
                  </div>
                ))}
                {subscribers.length > 5 && (
                  <p className="text-xs text-[var(--color-text-muted)] text-center pt-2">
                    +{subscribers.length - 5} more
                  </p>
                )}
              </div>
            </Card>
          )}
          
          {/* Tasks */}
          {nda.status !== 'FULLY_EXECUTED' && nda.status !== 'INACTIVE' && nda.status !== 'CANCELLED' && (
            <Card>
              <h3 className="mb-4">Actions</h3>
              <div className="space-y-3">
                {nda.status === 'IN_REVISION' && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm mb-2">Complete Review</p>
                    <p className="text-xs text-[var(--color-text-muted)] mb-3">
                      Review the NDA and send for signature
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full"
                      onClick={handleStartReview}
                      disabled={statusUpdating}
                    >
                      {statusUpdating ? 'Updating...' : 'Complete review'}
                    </Button>
                  </div>
                )}
                {nda.status === 'CREATED' && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm mb-2">Send NDA</p>
                    <p className="text-xs text-[var(--color-text-muted)] mb-3">
                      Send this NDA for signature
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full"
                      onClick={handleSendForSignature}
                      disabled={statusUpdating}
                    >
                      {statusUpdating ? 'Sending...' : 'Send for signature'}
                    </Button>
                  </div>
                )}
                {nda.availableActions && nda.availableActions.length > 0 && (
                  <div className="pt-3 border-t border-[var(--color-border)]">
                    <p className="text-xs text-[var(--color-text-muted)] mb-2">Available actions:</p>
                    {nda.availableActions.map((action) => (
                      <Badge key={action} variant="info" className="mr-1 mb-1">
                        {action}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )}
          
          {/* Notes */}
          <Card>
            <h3 className="mb-4">Internal notes</h3>
            <textarea
              placeholder="Add internal notes (visible only to your team)..."
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
            />
            <Button variant="secondary" size="sm" className="w-full mt-2" onClick={handleAddNote}>Add note</Button>
          </Card>
        </div>
      </div>
      
      {/* Dialogs */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review NDA</DialogTitle>
            <DialogDescription>
              Please review the NDA and provide any necessary notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <textarea
              placeholder="Add review notes..."
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setShowReviewDialog(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCompleteReview}>
              Complete review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve NDA</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this NDA? This will allow it to be sent for signature.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setShowApprovalDialog(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={confirmApproval}>
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send NDA for Signature</DialogTitle>
            <DialogDescription>
              Are you sure you want to send this NDA for signature? An email will be sent to the counterparty.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setShowSendDialog(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={confirmSendForSignature}>
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showMarkExecutedDialog} onOpenChange={setShowMarkExecutedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark document as fully executed?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark "{selectedDocument?.filename}" as the fully executed version and automatically
              update the NDA status to "Fully Executed". This action can be reversed if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowMarkExecutedDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmMarkAsExecuted} disabled={statusUpdating}>
              {statusUpdating ? 'Marking...' : 'Mark as executed'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}