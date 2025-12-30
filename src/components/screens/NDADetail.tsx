import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../client/hooks/useAuth';
import { Card } from '../ui/AppCard';
import { Badge } from '../ui/AppBadge';
import { Button } from '../ui/AppButton';
import {
  ArrowLeft,
  Download,
  Edit,
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
  Check,
  AlertCircle,
  X,
  Info
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
import { NDADocumentPreview } from '../NDADocumentPreview';
import { NDAWorkflowProgress } from '../NDAWorkflowProgress';
import { RecipientSelector, type Recipient } from '../RecipientSelector';
import { EmailPreview } from '../EmailPreview';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
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
import {
  getNdaDetail,
  updateNDAStatus,
  getEmailPreview,
  sendNdaEmail,
  getStatusInfo,
  routeForApproval,
  approveNda,
  rejectNda,
  type EmailPreview,
  type NdaDetail,
  type NdaStatus,
  type StatusInfoResponse,
} from '../../client/services/ndaService';
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
import {
  listTemplates,
  generatePreview,
  type RtfTemplate,
} from '../../client/services/templateService';
import {
  listEmailTemplates,
  type EmailTemplateSummary,
} from '../../client/services/emailTemplateService';
import * as notesService from '../../client/services/notesService'; // Story 9.1
import { formatAuditDetails } from '../../client/utils/formatAuditChanges'; // Story 9.6
import { getStatusDisplayName } from '../../client/utils/statusFormatter'; // Story 10.3

// Story 10.1: USmax Position display labels
const usMaxPositionLabels: Record<string, string> = {
  PRIME: 'Prime',
  SUB_CONTRACTOR: 'Sub-contractor',
  OTHER: 'Other'
};

// Story 10.2: NDA Type display labels
const ndaTypeLabels: Record<string, string> = {
  MUTUAL: 'Mutual NDA',
  CONSULTANT: 'Consultant'
};

export function NDADetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth(); // Story 10.8

  // Data state
  const [nda, setNda] = useState<NdaDetail | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [statusInfo, setStatusInfo] = useState<StatusInfoResponse | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Document state
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [templates, setTemplates] = useState<RtfTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [previewing, setPreviewing] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState<'overview' | 'document' | 'activity'>('overview');
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailForm, setEmailForm] = useState({
    subject: '',
    toRecipients: '',
    ccRecipients: '',
    bccRecipients: '',
    body: '',
  });
  const [emailAttachments, setEmailAttachments] = useState<EmailPreview['attachments']>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplateSummary[]>([]);
  const [selectedEmailTemplateId, setSelectedEmailTemplateId] = useState<string>('');
  const [availableRecipients, setAvailableRecipients] = useState<Recipient[]>([]);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<Set<string>>(new Set());
  const [showAddNoteDialog, setShowAddNoteDialog] = useState(false);
  const [showMarkExecutedDialog, setShowMarkExecutedDialog] = useState(false);
  const [showStatusChangeModal, setShowStatusChangeModal] = useState(false); // Story 9.8
  const [selectedNewStatus, setSelectedNewStatus] = useState<NdaStatus | null>(null); // Story 9.8
  const [reviewNotes, setReviewNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [savedNotes, setSavedNotes] = useState<notesService.InternalNote[]>([]); // Story 9.1

  // Load NDA data on mount
  useEffect(() => {
    if (!id) return;

    const loadNDAData = async () => {
      try {
        setLoading(true);
        setError(null);
        const detail = await getNdaDetail(id);
        setNda({
          ...detail.nda,
          documents: detail.documents,
          emails: detail.emails,
          auditTrail: detail.auditTrail,
          statusHistory: detail.statusHistory,
          availableActions: detail.availableActions,
          statusProgression: detail.statusProgression,
        });
        setDocuments(detail.documents as Document[]);
      } catch (err) {
        console.error('Failed to load NDA:', err);
        setError(err instanceof Error ? err.message : 'Failed to load NDA');
      } finally {
        setLoading(false);
      }
    };

    loadNDAData();
  }, [id]);

  useEffect(() => {
    if (!nda?.agencyGroup?.id) return;

    const loadTemplates = async () => {
      try {
        const data = await listTemplates(nda.agencyGroup.id);
        setTemplates(data.templates);
        const selected = nda.rtfTemplateId && data.templates.some((template) => template.id === nda.rtfTemplateId)
          ? nda.rtfTemplateId
          : undefined;
        const recommended = data.templates.find((t) => t.isRecommended)?.id;
        setSelectedTemplateId(selected || recommended || data.templates[0]?.id || '');
      } catch (err) {
        console.error('Failed to load templates:', err);
      }
    };

    loadTemplates();
  }, [nda?.agencyGroup?.id]);

  useEffect(() => {
    const loadStatusInfo = async () => {
      try {
        const info = await getStatusInfo();
        setStatusInfo(info);
      } catch (err) {
        console.error('Failed to load status info:', err);
      }
    };

    loadStatusInfo();
  }, []);

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

  // Story 9.1: Load internal notes
  useEffect(() => {
    if (id) {
      notesService.getNotes(id)
        .then(data => setSavedNotes(data.notes))
        .catch(err => console.error('Failed to load notes:', err));
    }
  }, [id]);

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
          onClick={() => navigate('/ndas')}
          className="mb-4"
        >
          Back to NDAs
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
  
  const refreshNdaDetail = async () => {
    if (!id) return;
    const detail = await getNdaDetail(id);
    setNda({
      ...detail.nda,
      documents: detail.documents,
      emails: detail.emails,
      auditTrail: detail.auditTrail,
      statusHistory: detail.statusHistory,
      availableActions: detail.availableActions,
      statusProgression: detail.statusProgression,
    });
    setDocuments(detail.documents as Document[]);
  };

  const handleDownloadPDF = () => {
    toast.success('PDF download started', {
      description: `Downloading ${nda.companyName} NDA...`
    });
    // Story 9.1: Document service implemented - this TODO is outdated and can be removed
  };

  const openEmailComposer = async () => {
    if (!id) return;

    try {
      setEmailLoading(true);
      setShowEmailComposer(true);

      let templateId: string | undefined;
      try {
        const templateResponse = await listEmailTemplates();
        setEmailTemplates(templateResponse.templates);
        templateId =
          templateResponse.templates.find((template) => template.isDefault)?.id ||
          templateResponse.templates[0]?.id;
      } catch (templateError) {
        console.warn('Failed to load email templates:', templateError);
        setEmailTemplates([]);
      }

      const preview = await getEmailPreview(id, templateId);

      // Build recipients list from NDA POCs
      const recipients: Recipient[] = [];
      const selectedIds = new Set<string>();

      // Add relationship POC (always present)
      if (nda.relationshipPoc) {
        const recipientId = `relationship-${nda.relationshipPoc.id}`;
        recipients.push({
          id: recipientId,
          firstName: nda.relationshipPoc.firstName,
          lastName: nda.relationshipPoc.lastName,
          email: nda.relationshipPoc.email,
          role: 'Relationship POC',
          company: nda.companyName
        });
        // Auto-select if in preview.toRecipients
        if (preview.toRecipients.includes(nda.relationshipPoc.email)) {
          selectedIds.add(recipientId);
        }
      }

      // Add contracts POC
      if (nda.contractsPoc) {
        const recipientId = `contracts-${nda.contractsPoc.id}`;
        recipients.push({
          id: recipientId,
          firstName: nda.contractsPoc.firstName,
          lastName: nda.contractsPoc.lastName,
          email: nda.contractsPoc.email,
          role: 'Contracts POC',
          company: nda.companyName
        });
        if (preview.toRecipients.includes(nda.contractsPoc.email)) {
          selectedIds.add(recipientId);
        }
      }

      // Add opportunity POC
      if (nda.opportunityPoc) {
        const recipientId = `opportunity-${nda.opportunityPoc.id}`;
        recipients.push({
          id: recipientId,
          firstName: nda.opportunityPoc.firstName,
          lastName: nda.opportunityPoc.lastName,
          email: nda.opportunityPoc.email,
          role: 'Opportunity POC',
          company: nda.companyName
        });
        if (preview.toRecipients.includes(nda.opportunityPoc.email)) {
          selectedIds.add(recipientId);
        }
      }

      // Add contacts POC
      if (nda.contactsPoc) {
        const recipientId = `contacts-${nda.contactsPoc.id}`;
        recipients.push({
          id: recipientId,
          firstName: nda.contactsPoc.firstName,
          lastName: nda.contactsPoc.lastName,
          email: nda.contactsPoc.email,
          role: 'Contacts POC',
          company: nda.companyName
        });
        if (preview.toRecipients.includes(nda.contactsPoc.email)) {
          selectedIds.add(recipientId);
        }
      }

      setAvailableRecipients(recipients);
      setSelectedRecipientIds(selectedIds);

      setEmailForm({
        subject: preview.subject,
        toRecipients: preview.toRecipients.join(', '),
        ccRecipients: preview.ccRecipients.join(', '),
        bccRecipients: preview.bccRecipients.join(', '),
        body: preview.body,
      });
      setEmailAttachments(preview.attachments);
      setSelectedEmailTemplateId(preview.templateId || templateId || '');
    } catch (err) {
      console.error('Failed to load email preview:', err);
      toast.error('Failed to load email preview');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleEmailTemplateChange = async (templateId: string) => {
    if (!id) return;
    setSelectedEmailTemplateId(templateId);

    try {
      setEmailLoading(true);
      const preview = await getEmailPreview(id, templateId || undefined);
      setEmailForm((prev) => ({
        ...prev,
        subject: preview.subject,
        body: preview.body,
        toRecipients: prev.toRecipients || preview.toRecipients.join(', '),
        ccRecipients: prev.ccRecipients || preview.ccRecipients.join(', '),
        bccRecipients: prev.bccRecipients || preview.bccRecipients.join(', '),
      }));
      setEmailAttachments(preview.attachments);
    } catch (err) {
      console.error('Failed to refresh email preview:', err);
      toast.error('Failed to refresh email preview');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleSendForSignature = async () => {
    if (!canSendEmail) {
      toast.error("You don't have permission to send emails.");
      return;
    }

    // Story 10.7: Preview before send
    try {
      setPreviewing(true);
      const result = await generatePreview(id!, selectedTemplateId || undefined);
      window.open(result.preview.previewUrl, '_blank', 'noopener,noreferrer');

      // Wait briefly for preview to open, then confirm
      setTimeout(() => {
        let confirmMessage = 'Preview opened in new tab.\n\nProceed to send this NDA?';

        // Story 10.14: Extra confirmation for Non-USmax NDAs
        if (nda?.isNonUsMax) {
          confirmMessage = '⚠️ Warning: This is a Non-USmax NDA.\n\nUSmax signed a partner\'s NDA. Are you sure you want to send an email?\n\nClick OK to confirm this email send is intentional.';
        }

        const confirmed = window.confirm(confirmMessage);
        if (confirmed) {
          openEmailComposer();
        }
      }, 500);
    } catch (err) {
      console.error('Failed to generate preview:', err);
      toast.error('Preview failed', {
        description: 'Cannot send without previewing document first'
      });
    } finally {
      setPreviewing(false);
    }
  };

  // Story 10.6 + 10.7: Route for approval with preview
  const handleRouteForApproval = async () => {
    if (!id) return;

    // Story 10.7: Preview before routing
    try {
      setPreviewing(true);
      const result = await generatePreview(id, selectedTemplateId || undefined);
      window.open(result.preview.previewUrl, '_blank', 'noopener,noreferrer');

      setTimeout(async () => {
        const confirmed = window.confirm('Preview opened in new tab.\n\nRoute this NDA for approval?');
        if (confirmed) {
          try {
            await routeForApproval(id);
            toast.success('NDA routed for approval');
            // Reload NDA to show new status
            const updated = await getNdaDetail(id);
            setNda(updated);
          } catch (err) {
            toast.error('Failed to route for approval', {
              description: err instanceof Error ? err.message : 'Unknown error'
            });
          }
        }
      }, 500);
    } catch (err) {
      console.error('Failed to generate preview:', err);
      toast.error('Preview failed', {
        description: 'Cannot route without previewing document first'
      });
    } finally {
      setPreviewing(false);
    }
  };

  // Story 10.6 + 10.8: Approve NDA handler (supports self-approval)
  const handleApproveNda = async () => {
    if (!id) return;

    // Story 10.8: Check if user is approving their own NDA
    const isApprovingOwnNda = nda?.createdBy?.id === user?.id;

    if (isApprovingOwnNda) {
      const confirmed = window.confirm(
        'You are approving your own NDA.\n\nThis is allowed, but will be noted in the audit log. Continue?'
      );
      if (!confirmed) return;
    }

    try {
      await approveNda(id);
      toast.success('NDA approved - ready to send');
      // Reload and open email composer
      const updated = await getNdaDetail(id);
      setNda(updated);
      openEmailComposer();
    } catch (err) {
      toast.error('Failed to approve NDA', {
        description: err instanceof Error ? err.message : 'Unknown error'
      });
    }
  };

  // Story 10.6: Reject NDA handler
  const handleRejectNda = async () => {
    if (!id) return;

    const reason = window.prompt('Enter rejection reason (optional):');
    if (reason === null) return; // User cancelled

    try {
      await rejectNda(id, reason || undefined);
      toast.success('NDA rejected - returned to creator');
      // Reload to show new status
      const updated = await getNdaDetail(id);
      setNda(updated);
    } catch (err) {
      toast.error('Failed to reject NDA', {
        description: err instanceof Error ? err.message : 'Unknown error'
      });
    }
  };

  const parseRecipientInput = (value: string) =>
    value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);

  const handleToggleRecipient = (recipientId: string) => {
    setSelectedRecipientIds(prev => {
      const next = new Set(prev);
      if (next.has(recipientId)) {
        next.delete(recipientId);
      } else {
        next.add(recipientId);
      }
      return next;
    });
  };

  const handleAddCustomRecipient = (email: string) => {
    const customId = `custom-${Date.now()}`;
    const newRecipient: Recipient = {
      id: customId,
      firstName: null,
      lastName: null,
      email: email,
      role: 'Custom Recipient'
    };
    setAvailableRecipients(prev => [...prev, newRecipient]);
    setSelectedRecipientIds(prev => new Set([...prev, customId]));
  };

  const getSelectedRecipientEmails = (): string[] => {
    return availableRecipients
      .filter(r => selectedRecipientIds.has(r.id))
      .map(r => r.email);
  };

  const handleSendEmail = async () => {
    if (!id) return;
    if (!emailAttachments.length) {
      toast.error('No attachment available', {
        description: 'Generate an NDA document before sending.',
      });
      return;
    }

    const selectedEmails = getSelectedRecipientEmails();
    if (selectedEmails.length === 0) {
      toast.error('No recipients selected', {
        description: 'Please select at least one recipient.',
      });
      return;
    }

    try {
      setIsSendingEmail(true);
      const result = await sendNdaEmail(id, {
        subject: emailForm.subject,
        toRecipients: selectedEmails,
        ccRecipients: parseRecipientInput(emailForm.ccRecipients),
        bccRecipients: parseRecipientInput(emailForm.bccRecipients),
        body: emailForm.body,
        templateId: selectedEmailTemplateId || undefined,
      });

      if (result.status === 'SENT') {
        toast.success('Email sent ✓', {
          description: 'The NDA email was sent successfully.',
        });
      } else {
        toast.message('Email queued for delivery', {
          description: 'We will retry sending this email automatically.',
        });
      }

      await refreshNdaDetail();
      setShowEmailComposer(false);
    } catch (err) {
      console.error('Failed to send NDA email:', err);
      toast.error('Failed to send NDA email', {
        description: err instanceof Error ? err.message : 'Please try again later.',
      });
    } finally {
      setIsSendingEmail(false);
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
      await refreshNdaDetail();
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
      await updateNDAStatus(id, 'SENT_PENDING_SIGNATURE', 'Approved and ready for signature');
      toast.success('NDA approved', {
        description: 'The NDA has been approved and can now be sent for signature.'
      });
      await refreshNdaDetail();
      setShowApprovalDialog(false);
    } catch (err) {
      console.error('Failed to approve NDA:', err);
      toast.error('Failed to approve NDA');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleStatusSelect = async (newStatus: NdaStatus) => {
    if (!id || newStatus === nda.status) return;

    try {
      setStatusUpdating(true);
      await updateNDAStatus(id, newStatus, 'Manual status change');
      toast.success('Status updated', {
        description: `NDA status changed to ${getDisplayStatus(newStatus)}`
      });
      await refreshNdaDetail();
    } catch (err) {
      console.error('Failed to update status:', err);
      toast.error('Failed to update status');
    } finally {
      setStatusUpdating(false);
    }
  };

  // Story 9.8: Status change modal confirmation handler
  const handleConfirmStatusChange = async () => {
    if (!selectedNewStatus || !id) return;

    try {
      setStatusUpdating(true);
      await updateNDAStatus(id, selectedNewStatus, 'Manual status change');
      toast.success('Status updated', {
        description: `NDA status changed to ${getDisplayStatus(selectedNewStatus)}`
      });
      setShowStatusChangeModal(false);
      setSelectedNewStatus(null);
      await refreshNdaDetail();
    } catch (err) {
      console.error('Failed to update status:', err);
      toast.error('Failed to update status');
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

  const handleAddNote = async () => {
    if (internalNotes.trim() && id) {
      try {
        await notesService.createNote(id, internalNotes);
        toast.success('Note added', {
          description: 'Internal note has been saved successfully.'
        });
        setInternalNotes('');
        // Reload notes
        const data = await notesService.getNotes(id);
        setSavedNotes(data.notes);
      } catch (error) {
        toast.error('Failed to save note');
        console.error('Error saving note:', error);
      }
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!id) return;
    try {
      await notesService.deleteNote(id, noteId);
      toast.success('Note deleted');
      // Reload notes
      const data = await notesService.getNotes(id);
      setSavedNotes(data.notes);
    } catch (error) {
      toast.error('Failed to delete note');
      console.error('Error deleting note:', error);
    }
  };


  // Document handlers
  const handleFileSelect = async (files: FileList | null) => {
    if (!canUploadDocument) {
      toast.error("You don't have permission to upload documents.");
      return;
    }
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
      await refreshNdaDetail();
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
    if (!canUploadDocument) return;
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!canUploadDocument) return;
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!canUploadDocument) return;
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    if (!canUploadDocument) return;
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
    if (!canEdit) {
      toast.error("You don't have permission to generate documents.");
      return;
    }

    // Story 10.14: Confirm for Non-USmax NDAs
    if (nda?.isNonUsMax) {
      const confirmed = window.confirm(
        'This is a Non-USmax NDA. Document generation is typically not needed since USmax signed a partner\'s NDA.\n\nProceed anyway?'
      );
      if (!confirmed) return;
    }

    try {
      setGenerating(true);
      const result = await generateDocument(id, selectedTemplateId || undefined);
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

  const handlePreviewDocument = async () => {
    if (!id) return;

    try {
      setPreviewing(true);
      const result = await generatePreview(id, selectedTemplateId || undefined);
      window.open(result.preview.previewUrl, '_blank', 'noopener,noreferrer');
      toast.success('Preview generated', {
        description: 'Opened preview in a new tab'
      });
    } catch (err) {
      console.error('Failed to generate preview:', err);
      toast.error('Preview failed', {
        description: err instanceof Error ? err.message : 'Failed to generate preview'
      });
    } finally {
      setPreviewing(false);
    }
  };

  const handleMarkAsExecuted = (doc: Document) => {
    setSelectedDocument(doc);
    setShowMarkExecutedDialog(true);
  };

  const confirmMarkAsExecuted = async () => {
    if (!selectedDocument || !id) return;
    if (!canEdit) {
      toast.error("You don't have permission to update NDA status.");
      return;
    }

    try {
      setStatusUpdating(true);
      await markAsExecuted(selectedDocument.id);
      toast.success('Document marked as executed', {
        description: 'The NDA status has been updated to Fully Executed'
      });
      await refreshNdaDetail();
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

  const formatRecipients = (recipients: string[]) =>
    recipients.length > 0 ? recipients.join(', ') : '—';

  const renderPermissionedButton = (
    button: React.ReactElement,
    isDisabled: boolean,
    tooltip: string
  ) => {
    if (!isDisabled) {
      return button;
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">{button}</span>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    );
  };
  
  // Map backend status to UI display status
  // Story 10.3: Use legacy display names
  const getDisplayStatus = (status: NdaStatus): string => {
    return getStatusDisplayName(status);
  };

  // Map backend status to risk/badge variant
  const getStatusVariant = (status: NdaStatus): 'success' | 'warning' | 'error' | 'info' => {
    switch (status) {
      case 'FULLY_EXECUTED':
        return 'success';
      case 'SENT_PENDING_SIGNATURE':
      case 'IN_REVISION':
        return 'warning';
      case 'INACTIVE_CANCELED':
      case 'EXPIRED':
        return 'error';
      default:
        return 'info';
    }
  };

  const workflowSteps: WorkflowStep[] = nda.statusProgression?.steps?.length
    ? nda.statusProgression.steps.map((step, index) => ({
        id: String(index + 1),
        name: step.label,
        status: step.completed ? 'completed' : step.isCurrent ? 'in-progress' : 'pending',
        timestamp: step.timestamp,
        actor: step.changedBy
          ? `${step.changedBy.firstName} ${step.changedBy.lastName}`.trim()
          : undefined,
      }))
    : [
        {
          id: '1',
          name: 'Request created',
          status: 'completed',
          timestamp: nda.createdAt,
          actor: `${nda.createdBy.firstName} ${nda.createdBy.lastName}`,
        },
        {
          id: '2',
          name: 'Legal review',
          status:
            nda.status === 'IN_REVISION'
              ? 'in-progress'
              : nda.status === 'CREATED'
                ? 'pending'
                : 'completed',
          timestamp: nda.status !== 'CREATED' ? nda.updatedAt : undefined,
        },
        {
          id: '3',
          name: 'Sent to counterparty',
          status:
            nda.status === 'SENT_PENDING_SIGNATURE'
              ? 'in-progress'
              : nda.status === 'FULLY_EXECUTED'
                ? 'completed'
                : 'pending',
          timestamp: nda.status === 'SENT_PENDING_SIGNATURE' ? nda.updatedAt : undefined,
        },
        {
          id: '4',
          name: 'Signed by counterparty',
          status: nda.status === 'FULLY_EXECUTED' ? 'completed' : 'pending',
        },
        {
          id: '5',
          name: 'Signed by government',
          status: nda.status === 'FULLY_EXECUTED' ? 'completed' : 'pending',
          timestamp: nda.status === 'FULLY_EXECUTED' ? nda.effectiveDate : undefined,
        },
        {
          id: '6',
          name: 'Executed',
          status: nda.status === 'FULLY_EXECUTED' ? 'completed' : 'pending',
          timestamp: nda.status === 'FULLY_EXECUTED' ? nda.effectiveDate : undefined,
        },
      ];

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const validStatusTransitions =
    statusInfo?.statuses?.[nda.status]?.validTransitions ?? [];

  const availableActionBadges = [
    nda.availableActions?.canEdit ? 'Edit' : null,
    nda.availableActions?.canSendEmail ? 'Send Email' : null,
    nda.availableActions?.canUploadDocument ? 'Upload Document' : null,
    nda.availableActions?.canChangeStatus ? 'Change Status' : null,
    nda.availableActions?.canDelete ? 'Delete' : null,
  ].filter(Boolean) as string[];

  const canEdit = !!nda.availableActions?.canEdit;
  const canSendEmail = !!nda.availableActions?.canSendEmail;
  const canUploadDocument = !!nda.availableActions?.canUploadDocument;
  const canChangeStatus = !!nda.availableActions?.canChangeStatus;
  
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <Button 
          variant="subtle" 
          size="sm" 
          icon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate('/ndas')}
          className="mb-4"
        >
          Back to NDAs
        </Button>

        {/* Story 10.14: Non-USmax NDA Warning Banner */}
        {nda.isNonUsMax && (
          <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-orange-900 mb-1">
                ⚠️ Non-USmax NDA: USmax signed partner's NDA
              </h3>
              <p className="text-sm text-orange-800">
                Exercise caution with email sends. This NDA was created by the partner, not USmax.
              </p>
            </div>
          </div>
        )}

        {/* Story 10.8: Self-approval notice */}
        {nda.status === 'PENDING_APPROVAL' && nda.createdBy?.id === user?.id && nda.availableActions?.canApprove && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-blue-900 mb-1">
                You are approving your own NDA
              </h3>
              <p className="text-sm text-blue-800">
                This approval will be noted in the audit log as a self-approval.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1">
            <h1 className="mb-3">{nda.companyName} - {nda.agencyGroup.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge variant={getStatusVariant(nda.status)}>{getDisplayStatus(nda.status)}</Badge>
              <Badge variant="info">{nda.displayId}</Badge>
              <Badge variant="default">{usMaxPositionLabels[nda.usMaxPosition] || nda.usMaxPosition}</Badge>
              {nda.effectiveDate && (
                <Badge variant="info">Effective {new Date(nda.effectiveDate).toLocaleDateString()}</Badge>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={subscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : isSubscribed ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
              onClick={handleToggleSubscription}
              disabled={subscribing}
            >
              {isSubscribed ? 'Unsubscribe' : 'Subscribe'}
            </Button>
            <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />} onClick={handleDownloadPDF}>
              Download PDF
            </Button>

            {/* Story 10.6: Route for Approval button (when CREATED) */}
            {nda.status === 'CREATED' && nda.availableActions?.canRouteForApproval && (
              <Button
                variant="warning"
                icon={<Send className="w-4 h-4" />}
                onClick={handleRouteForApproval}
                disabled={previewing}
              >
                Route for Approval
              </Button>
            )}

            {/* Story 10.6: Approve & Send button (when PENDING_APPROVAL) */}
            {nda.status === 'PENDING_APPROVAL' && nda.availableActions?.canApprove && (
              <Button
                variant="primary"
                icon={<CheckCircle className="w-4 h-4" />}
                onClick={handleApproveNda}
              >
                Approve & Send
              </Button>
            )}

            {/* Story 10.6: Reject button (when PENDING_APPROVAL) */}
            {nda.status === 'PENDING_APPROVAL' && nda.availableActions?.canApprove && (
              <Button
                variant="secondary"
                icon={<X className="w-4 h-4" />}
                onClick={handleRejectNda}
              >
                Reject
              </Button>
            )}

            {nda.status === 'IN_REVISION' && renderPermissionedButton(
              <Button
                variant="primary"
                icon={<Send className="w-4 h-4" />}
                onClick={handleSendForSignature}
                disabled={statusUpdating || !canSendEmail}
              >
                Send for signature
              </Button>,
              !canSendEmail,
              "You don't have permission to send emails"
            )}
            {/* External signing portal button removed - out of scope per PRD */}
          </div>
        </div>
      </div>

      {/* Workflow Progress */}
      <NDAWorkflowProgress
        currentStatus={nda.status}
        hasDocument={documents.length > 0}
        canApprove={nda.availableActions?.canApprove || false}
        canSend={canSendEmail}
        canRouteForApproval={nda.availableActions?.canRouteForApproval || false}
        isCreator={nda.createdBy?.id === user?.id}
      />

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
                  {/* Document Preview - Prominent placement */}
                  <NDADocumentPreview
                    ndaId={id!}
                    documents={documents}
                    templateId={selectedTemplateId}
                    canEdit={canEdit}
                  />

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
                      {nda.clonedFrom && (
                        <div className="flex items-start gap-3">
                          <ExternalLink className="w-5 h-5 text-[var(--color-text-secondary)] flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm text-[var(--color-text-secondary)] mb-1">Cloned from</p>
                            <Button
                              variant="subtle"
                              className="p-0 h-auto text-[var(--color-primary)] hover:bg-transparent"
                              onClick={() => navigate(`/nda/${nda.clonedFrom?.id}`)}
                            >
                              NDA #{nda.clonedFrom.displayId} · {nda.clonedFrom.companyName}
                            </Button>
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
                        <p className="text-sm text-[var(--color-text-secondary)] mb-2">USmax Position</p>
                        <p>{usMaxPositionLabels[nda.usMaxPosition] || nda.usMaxPosition}</p>
                      </div>
                      <div>
                        <p className="text-sm text-[var(--color-text-secondary)] mb-2">NDA Type</p>
                        <p>{ndaTypeLabels[nda.ndaType] || nda.ndaType}</p>
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

                  {/* Email history */}
                  <div className="pt-6 border-t border-[var(--color-border)]">
                    <h3 className="mb-4">Email history</h3>
                    {nda.emails && nda.emails.length > 0 ? (
                      <div className="space-y-3">
                        {nda.emails.map((email) => (
                          <div key={email.id} className="border border-[var(--color-border)] rounded-lg p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-medium">{email.subject}</p>
                                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                                  To: {formatRecipients(email.toRecipients)}
                                </p>
                                {email.ccRecipients?.length ? (
                                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                                    CC: {formatRecipients(email.ccRecipients)}
                                  </p>
                                ) : null}
                                {email.bccRecipients?.length ? (
                                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                                    BCC: {formatRecipients(email.bccRecipients)}
                                  </p>
                                ) : null}
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-[var(--color-text-muted)]">
                                  {new Date(email.sentAt).toLocaleString()}
                                </p>
                                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                                  {email.sentBy.firstName} {email.sentBy.lastName}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--color-text-secondary)]">No emails sent yet.</p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Document Tab */}
              {activeTab === 'document' && (
                <div>
                  {/* Issue #25: Document workflow guidance */}
                  {documents.length === 0 && (
                    <>
                      {templates.length > 0 ? (
                        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-start gap-3">
                            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium text-blue-900 mb-2">Generate your NDA document</p>
                              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                                <li>Choose a template from the dropdown below</li>
                                <li>Click "Generate document" to create the RTF file</li>
                                <li>Click "Preview Document" in Quick Actions to review</li>
                                <li>Route for approval when ready</li>
                              </ol>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium text-amber-900 mb-1">No templates available</p>
                              <p className="text-sm text-amber-800">Contact an administrator to create RTF templates before generating documents.</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3>Documents ({documents.length})</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {templates.length > 0 && (
                        <select
                          className="px-3 py-2 border rounded-md bg-white text-sm max-w-xs"
                          value={selectedTemplateId}
                          onChange={(e) => setSelectedTemplateId(e.target.value)}
                        >
                          {templates.map((template) => (
                            <option key={template.id} value={template.id}>
                              {template.name}{template.isRecommended ? ' (recommended)' : ''}
                            </option>
                          ))}
                        </select>
                      )}
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
                      {templates.length > 0 && (
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={previewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                          onClick={handlePreviewDocument}
                          disabled={previewing}
                        >
                          {previewing ? 'Previewing...' : 'Preview RTF'}
                        </Button>
                      )}
                      {!nda.isNonUsMax && renderPermissionedButton(
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                          onClick={handleGenerateDocument}
                          disabled={generating || !canEdit}
                        >
                          {generating ? 'Generating...' : 'Generate document'}
                        </Button>,
                        !canEdit,
                        "You don't have permission to generate documents"
                      )}
                    </div>
                  </div>

                  {/* Upload area with drag and drop */}
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center mb-6 transition-colors ${
                      dragActive
                        ? 'border-[var(--color-primary)] bg-blue-50'
                        : 'border-[var(--color-border)] hover:border-gray-400'
                    } ${canUploadDocument ? '' : 'opacity-60 cursor-not-allowed'}`}
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
                      disabled={uploading || !canUploadDocument}
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
                          {canUploadDocument ? (
                            <>
                              Drag and drop a document here, or{' '}
                              <label htmlFor="document-upload" className="text-[var(--color-primary)] cursor-pointer hover:underline">
                                browse
                              </label>
                            </>
                          ) : (
                            "You don't have permission to upload documents."
                          )}
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
                            {!doc.isFullyExecuted && nda.status !== 'FULLY_EXECUTED' && renderPermissionedButton(
                              <Button
                                variant="primary"
                                size="sm"
                                icon={<CheckCircle className="w-4 h-4" />}
                                onClick={() => handleMarkAsExecuted(doc)}
                                disabled={!canEdit}
                              >
                                Mark as executed
                              </Button>,
                              !canEdit,
                              "You don't have permission to update NDA status"
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
                            {/* Story 9.6: Human-readable changes display */}
                            {entry.details && Object.keys(entry.details).length > 0 && (() => {
                              const formatted = formatAuditDetails(entry.details);

                              return (
                                <div className="mt-2">
                                  {formatted.changes.length > 0 && (
                                    <ul className="space-y-1 bg-blue-50 p-2 rounded border border-blue-200">
                                      {formatted.changes.map((change, i) => (
                                        <li key={i} className="text-xs">• {change}</li>
                                      ))}
                                    </ul>
                                  )}
                                  {formatted.hasOtherFields && (
                                    <details className="mt-2">
                                      <summary className="cursor-pointer text-xs text-blue-600 hover:text-blue-800">
                                        Show details
                                      </summary>
                                      <pre className="text-xs bg-gray-50 p-2 rounded mt-1">
                                        {JSON.stringify(formatted.otherFields, null, 2)}
                                      </pre>
                                    </details>
                                  )}
                                </div>
                              );
                            })()}
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
          {/* Quick Actions */}
          <Card>
            <h3 className="mb-4">Quick actions</h3>
            <div className="space-y-2">
              {renderPermissionedButton(
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  icon={<Edit className="w-4 h-4" />}
                  onClick={() => navigate(`/nda/${nda.id}/edit`)}
                  disabled={!canEdit}
                >
                  Edit
                </Button>,
                !canEdit,
                "You don't have permission to edit NDAs"
              )}
              {renderPermissionedButton(
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  icon={<Send className="w-4 h-4" />}
                  onClick={handleSendForSignature}
                  disabled={!canSendEmail || isSendingEmail}
                >
                  {isSendingEmail ? 'Sending...' : 'Send Email'}
                </Button>,
                !canSendEmail,
                "You don't have permission to send emails"
              )}
              {renderPermissionedButton(
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  icon={<Upload className="w-4 h-4" />}
                  onClick={() => setActiveTab('document')}
                  disabled={!canUploadDocument}
                >
                  Upload Document
                </Button>,
                !canUploadDocument,
                "You don't have permission to upload documents"
              )}
              {/* Issue #17: Preview Document button in Quick Actions */}
              {renderPermissionedButton(
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full"
                  icon={previewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                  onClick={handlePreviewDocument}
                  disabled={previewing || !canEdit}
                >
                  {previewing ? 'Previewing...' : 'Preview Document'}
                </Button>,
                !canEdit,
                "You don't have permission to generate previews"
              )}
              {renderPermissionedButton(
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  icon={<Check className="w-4 h-4" />}
                  onClick={() => setShowStatusChangeModal(true)}
                  disabled={!canChangeStatus || statusUpdating || validStatusTransitions.length === 0}
                >
                  {validStatusTransitions.length === 0 ? 'No valid transitions' : 'Change Status'}
                </Button>,
                !canChangeStatus,
                "You don't have permission to change status"
              )}
            </div>
          </Card>

          {/* Issue #20: Moved Actions card to top for better visibility */}
          {/* Tasks */}
          {nda.status !== 'FULLY_EXECUTED' && nda.status !== 'INACTIVE_CANCELED' && nda.status !== 'EXPIRED' && (
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
                    {renderPermissionedButton(
                      <Button
                        variant="primary"
                        size="sm"
                        className="w-full"
                        onClick={handleSendForSignature}
                        disabled={isSendingEmail || !canSendEmail}
                      >
                        {isSendingEmail ? 'Sending...' : 'Send for signature'}
                      </Button>,
                      !canSendEmail,
                      "You don't have permission to send emails"
                    )}
                  </div>
                )}
                {availableActionBadges.length > 0 && (
                  <div className="pt-3 border-t border-[var(--color-border)]">
                    <p className="text-xs text-[var(--color-text-muted)] mb-2">Available actions:</p>
                    {availableActionBadges.map((action) => (
                      <Badge key={action} variant="info" className="mr-1 mb-1">
                        {action}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )}

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

          {/* Status Management */}
          {nda.availableActions?.canChangeStatus && (
            <Card id="nda-status-card">
              <h3 className="mb-4">Status</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-[var(--color-text-muted)] mb-2">Current status</p>
                  <Badge variant={getStatusVariant(nda.status)}>{getDisplayStatus(nda.status)}</Badge>
                </div>
                <div>
                  <label className="block text-xs text-[var(--color-text-muted)] mb-2">Change status</label>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => setShowStatusChangeModal(true)}
                    disabled={statusUpdating || validStatusTransitions.length === 0}
                  >
                    {validStatusTransitions.length === 0 ? 'No valid transitions' : 'Change Status...'}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Notes */}
          <Card>
            <h3 className="mb-4">Internal notes</h3>

            {/* Story 9.1: Display saved notes */}
            {savedNotes.length > 0 && (
              <div className="mb-4 space-y-3">
                {savedNotes.map((note) => (
                  <div key={note.id} className="border border-[var(--color-border)] rounded-md p-3 bg-slate-50">
                    <p className="text-sm mb-2">{note.noteText}</p>
                    <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                      <span>
                        {note.user.firstName} {note.user.lastName} • {new Date(note.createdAt).toLocaleString()}
                      </span>
                      <Button
                        variant="subtle"
                        size="sm"
                        icon={<Trash2 className="w-3 h-3" />}
                        onClick={() => handleDeleteNote(note.id)}
                        className="text-xs"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

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
      
      <Dialog open={showEmailComposer} onOpenChange={setShowEmailComposer}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Send NDA Email</DialogTitle>
            <DialogDescription>
              Select recipients and review your email before sending.
            </DialogDescription>
          </DialogHeader>
          {emailLoading ? (
            <div className="flex items-center gap-3 py-6">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--color-primary)]" />
              <p className="text-sm text-[var(--color-text-secondary)]">Loading email preview...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Email Editing */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-[var(--color-text-primary)] mb-2 block">Subject</label>
                  <input
                    value={emailForm.subject}
                    onChange={(e) => setEmailForm((prev) => ({ ...prev, subject: e.target.value }))}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm"
                    placeholder="Enter email subject..."
                  />
                </div>

                <RecipientSelector
                  recipients={availableRecipients}
                  selectedRecipientIds={selectedRecipientIds}
                  onToggle={handleToggleRecipient}
                  onAddCustom={handleAddCustomRecipient}
                  allowCustomRecipients={true}
                />

                <div>
                  <label className="text-sm font-medium text-[var(--color-text-primary)] mb-2 block">Email Template</label>
                  <select
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-white"
                    value={selectedEmailTemplateId}
                    onChange={(e) => handleEmailTemplateChange(e.target.value)}
                    disabled={!emailTemplates.length}
                  >
                    {emailTemplates.length ? (
                      emailTemplates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}{template.isDefault ? ' (default)' : ''}
                        </option>
                      ))
                    ) : (
                      <option value="">Default template</option>
                    )}
                  </select>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    {emailTemplates.length
                      ? 'Select a template to update subject and body content.'
                      : 'Using default message.'}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-[var(--color-text-primary)] mb-2 block">Message Body</label>
                  <textarea
                    value={emailForm.body}
                    onChange={(e) => setEmailForm((prev) => ({ ...prev, body: e.target.value }))}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm min-h-[200px]"
                    placeholder="Enter email message..."
                  />
                </div>
              </div>

              {/* Right Column: Email Preview */}
              <div>
                <EmailPreview
                  subject={emailForm.subject}
                  toRecipients={getSelectedRecipientEmails()}
                  ccRecipients={parseRecipientInput(emailForm.ccRecipients)}
                  bccRecipients={parseRecipientInput(emailForm.bccRecipients)}
                  body={emailForm.body}
                  attachments={emailAttachments.map(a => ({ filename: a.filename }))}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setShowEmailComposer(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSendEmail}
              disabled={isSendingEmail || emailLoading || !emailAttachments.length || selectedRecipientIds.size === 0}
            >
              {isSendingEmail ? 'Sending...' : selectedRecipientIds.size === 0 ? 'Select Recipients' : 'Send Email'}
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

      {/* Story 9.8: Status Change Modal */}
      <Dialog open={showStatusChangeModal} onOpenChange={setShowStatusChangeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change NDA Status</DialogTitle>
            <DialogDescription>
              Current status: {nda && getDisplayStatus(nda.status)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <p className="text-sm text-[var(--color-text-secondary)] mb-3">
              Select new status:
            </p>
            {validStatusTransitions.map((status) => (
              <label
                key={status}
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedNewStatus === status
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                    : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)]'
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value={status}
                  checked={selectedNewStatus === status}
                  onChange={() => setSelectedNewStatus(status)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">{getDisplayStatus(status)}</span>
              </label>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setShowStatusChangeModal(false);
                setSelectedNewStatus(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmStatusChange}
              disabled={!selectedNewStatus || statusUpdating}
            >
              {statusUpdating ? 'Updating...' : 'Change Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
