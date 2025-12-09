import React, { useState } from 'react';
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
  Link as LinkIcon,
  Clock,
  Eye,
  CheckCircle,
  Circle
} from 'lucide-react';
import { mockNDAs, mockActivities } from '../../data/mockData';
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

export function NDADetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'document' | 'activity' | 'linked'>('overview');
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showAddNoteDialog, setShowAddNoteDialog] = useState(false);
  const [showAddLinkDialog, setShowAddLinkDialog] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  
  const nda = mockNDAs.find(n => n.id === id);
  
  if (!nda) {
    return (
      <div className="p-8">
        <p>NDA not found</p>
      </div>
    );
  }
  
  const handleDownloadPDF = () => {
    toast.success('PDF download started', {
      description: `Downloading ${nda.title}...`
    });
  };
  
  const handleSendForSignature = () => {
    setShowSendDialog(true);
  };
  
  const confirmSendForSignature = () => {
    toast.success('NDA sent for signature', {
      description: `An email has been sent to ${nda.counterpartyEmail}`
    });
    setShowSendDialog(false);
  };
  
  const handleViewSigningPortal = () => {
    navigate(`/sign/${nda.id}`);
  };
  
  const handleStartReview = () => {
    setShowReviewDialog(true);
  };
  
  const handleCompleteReview = () => {
    toast.success('Review completed', {
      description: 'The NDA has been marked as reviewed and is ready for approval.'
    });
    setShowReviewDialog(false);
    setReviewNotes('');
  };
  
  const handleApprove = () => {
    setShowApprovalDialog(true);
  };
  
  const confirmApproval = () => {
    toast.success('NDA approved', {
      description: 'The NDA has been approved and can now be sent for signature.'
    });
    setShowApprovalDialog(false);
  };
  
  const handleAddNote = () => {
    if (internalNotes.trim()) {
      toast.success('Note added', {
        description: 'Internal note has been saved successfully.'
      });
      setInternalNotes('');
    }
  };
  
  const handleAddLink = () => {
    setShowAddLinkDialog(true);
  };
  
  const confirmAddLink = () => {
    if (linkTitle.trim() && linkUrl.trim()) {
      toast.success('Link added', {
        description: `${linkTitle} has been linked to this NDA.`
      });
      setShowAddLinkDialog(false);
      setLinkTitle('');
      setLinkUrl('');
    }
  };
  
  const workflowSteps: WorkflowStep[] = [
    { 
      id: '1', 
      name: 'Request created', 
      status: 'completed', 
      timestamp: nda.createdDate,
      actor: nda.internalOwner
    },
    { 
      id: '2', 
      name: 'Legal review', 
      status: nda.status === 'In legal review' ? 'in-progress' : nda.status === 'Draft' ? 'pending' : 'completed',
      timestamp: nda.status !== 'Draft' ? nda.lastUpdated : undefined,
      actor: nda.status !== 'Draft' ? nda.legalOwner : undefined
    },
    { 
      id: '3', 
      name: 'Manager approval', 
      status: nda.status === 'Pending approval' ? 'in-progress' : 
              ['Waiting for signature', 'Executed'].includes(nda.status) ? 'completed' : 'pending',
      timestamp: nda.status === 'Pending approval' ? nda.lastUpdated : undefined,
      actor: nda.status === 'Pending approval' ? nda.businessOwner : undefined
    },
    { 
      id: '4', 
      name: 'Sent to counterparty', 
      status: nda.status === 'Waiting for signature' ? 'in-progress' : 
              nda.status === 'Executed' ? 'completed' : 'pending',
      timestamp: nda.status === 'Waiting for signature' ? nda.lastUpdated : undefined
    },
    { 
      id: '5', 
      name: 'Signed by counterparty', 
      status: nda.status === 'Executed' ? 'completed' : 'pending'
    },
    { 
      id: '6', 
      name: 'Signed by government', 
      status: nda.status === 'Executed' ? 'completed' : 'pending',
      timestamp: nda.status === 'Executed' ? nda.effectiveDate : undefined
    },
    { 
      id: '7', 
      name: 'Executed', 
      status: nda.status === 'Executed' ? 'completed' : 'pending',
      timestamp: nda.status === 'Executed' ? nda.effectiveDate : undefined
    }
  ];
  
  const ndaActivities = mockActivities.filter(a => a.ndaId === nda.id);
  
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
            <h1 className="mb-3">{nda.title}</h1>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge variant="status" status={nda.status}>{nda.status}</Badge>
              <Badge variant="type">{nda.type}</Badge>
              <Badge variant="risk" risk={nda.riskLevel}>{nda.riskLevel} Risk</Badge>
              {nda.effectiveDate && (
                <Badge variant="info">Effective {new Date(nda.effectiveDate).toLocaleDateString()}</Badge>
              )}
              {nda.expiryDate && (
                <Badge variant="default">Expires {new Date(nda.expiryDate).toLocaleDateString()}</Badge>
              )}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="secondary" icon={<Download className="w-4 h-4" />} onClick={handleDownloadPDF}>
              Download PDF
            </Button>
            {nda.status === 'Pending approval' && (
              <Button variant="primary" icon={<Send className="w-4 h-4" />} onClick={handleSendForSignature}>
                Send for signature
              </Button>
            )}
            {nda.status === 'Waiting for signature' && (
              <Button variant="primary" icon={<ExternalLink className="w-4 h-4" />} onClick={handleViewSigningPortal}>
                View in signing portal
              </Button>
            )}
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
                  { key: 'activity', label: 'Activity' },
                  { key: 'linked', label: 'Linked items' }
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
                          <p className="text-sm text-[var(--color-text-secondary)] mb-1">Government Organization</p>
                          <p>Government Agency</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Building className="w-5 h-5 text-[var(--color-text-secondary)] flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-[var(--color-text-secondary)] mb-1">Counterparty</p>
                          <p>{nda.counterparty}</p>
                          <p className="text-sm text-[var(--color-text-secondary)]">{nda.counterpartyContact}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Calendar className="w-5 h-5 text-[var(--color-text-secondary)] flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-[var(--color-text-secondary)] mb-1">Created</p>
                          <p>{new Date(nda.createdDate).toLocaleDateString()}</p>
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
                      {nda.expiryDate && (
                        <div className="flex items-start gap-3">
                          <Calendar className="w-5 h-5 text-[var(--color-text-secondary)] flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm text-[var(--color-text-secondary)] mb-1">Expiry Date</p>
                            <p>{new Date(nda.expiryDate).toLocaleDateString()}</p>
                          </div>
                        </div>
                      )}
                      {nda.termLength && (
                        <div className="flex items-start gap-3">
                          <Clock className="w-5 h-5 text-[var(--color-text-secondary)] flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm text-[var(--color-text-secondary)] mb-1">Term Length</p>
                            <p>{nda.termLength}</p>
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
                        <p className="text-sm text-[var(--color-text-secondary)] mb-2">Purpose</p>
                        <p>{nda.purpose}</p>
                      </div>
                      <div>
                        <p className="text-sm text-[var(--color-text-secondary)] mb-2">Department</p>
                        <p>{nda.department}</p>
                      </div>
                      <div>
                        <p className="text-sm text-[var(--color-text-secondary)] mb-2">Information types</p>
                        <div className="flex flex-wrap gap-2">
                          {nda.informationTypes.map(type => (
                            <Badge key={type} variant="info">{type}</Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-[var(--color-text-secondary)] mb-2">Systems</p>
                        <div className="flex flex-wrap gap-2">
                          {nda.systems.map(system => (
                            <Badge key={system} variant="default">{system}</Badge>
                          ))}
                        </div>
                      </div>
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
                    <h3>NDA Document</h3>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm">Zoom -</Button>
                      <Button variant="secondary" size="sm">Zoom +</Button>
                    </div>
                  </div>
                  <div className="border border-[var(--color-border)] rounded-lg p-8 bg-gray-50 min-h-[600px]">
                    <div className="max-w-3xl mx-auto bg-white p-12 shadow-sm">
                      <div className="text-center mb-8">
                        <h2 className="mb-2">NON-DISCLOSURE AGREEMENT</h2>
                        <p className="text-sm text-[var(--color-text-secondary)]">({nda.type})</p>
                      </div>
                      <div className="space-y-4 text-sm">
                        <p>This Non-Disclosure Agreement (the "Agreement") is entered into as of [DATE], by and between:</p>
                        <p><strong>Government Agency</strong> ("Government"), and</p>
                        <p><strong>{nda.counterparty}</strong> ("Counterparty")</p>
                        <p>Collectively referred to as the "Parties."</p>
                        <div className="mt-6">
                          <p className="mb-2"><strong>1. PURPOSE</strong></p>
                          <p>{nda.purpose}</p>
                        </div>
                        <div className="mt-6">
                          <p className="mb-2"><strong>2. DEFINITION OF CONFIDENTIAL INFORMATION</strong></p>
                          <p>For purposes of this Agreement, "Confidential Information" means all information disclosed by one party to the other...</p>
                        </div>
                        <p className="text-[var(--color-text-muted)] text-center mt-12">
                          [Document preview - Full document available for download]
                        </p>
                      </div>
                    </div>
                  </div>
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
                    {ndaActivities.length > 0 ? (
                      ndaActivities.map((activity) => (
                        <div key={activity.id} className="flex items-start gap-4 p-3 border border-[var(--color-border)] rounded-lg">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                            {activity.eventType === 'signature' && <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />}
                            {activity.eventType === 'approval' && <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />}
                            {activity.eventType === 'sent' && <Send className="w-4 h-4 text-blue-600" />}
                            {activity.eventType === 'created' && <FileText className="w-4 h-4 text-[var(--color-text-secondary)]" />}
                            {activity.eventType === 'comment' && <MessageSquare className="w-4 h-4 text-[var(--color-text-secondary)]" />}
                            {activity.eventType === 'view' && <Eye className="w-4 h-4 text-[var(--color-text-secondary)]" />}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm mb-1">{activity.action}</p>
                            <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                              <span>{activity.actor}</span>
                              <span>•</span>
                              <span>{new Date(activity.timestamp).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-[var(--color-text-secondary)] text-center py-8">No activity recorded yet</p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Linked Items Tab */}
              {activeTab === 'linked' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3>Linked items</h3>
                    <Button variant="secondary" size="sm" icon={<LinkIcon className="w-4 h-4" />} onClick={handleAddLink}>
                      Add link
                    </Button>
                  </div>
                  <p className="text-sm text-[var(--color-text-secondary)] text-center py-8">No linked items yet</p>
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
                  <p className="text-sm text-[var(--color-text-secondary)]">Internal Owner</p>
                  <p className="text-sm">{nda.internalOwner}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-[var(--color-text-secondary)] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-[var(--color-text-secondary)]">Legal Owner</p>
                  <p className="text-sm">{nda.legalOwner}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-[var(--color-text-secondary)] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-[var(--color-text-secondary)]">Business Owner</p>
                  <p className="text-sm">{nda.businessOwner}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-[var(--color-text-secondary)] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-[var(--color-text-secondary)]">Counterparty Contact</p>
                  <p className="text-sm">{nda.counterpartyContact}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{nda.counterpartyEmail}</p>
                </div>
              </div>
            </div>
          </Card>
          
          {/* Tasks */}
          {nda.status !== 'Executed' && (
            <Card>
              <h3 className="mb-4">Tasks</h3>
              <div className="space-y-3">
                {nda.status === 'In legal review' && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm mb-2">Review NDA</p>
                    <Badge variant="risk" risk="Medium" className="mb-2">Due in 2 days</Badge>
                    <Button variant="primary" size="sm" className="w-full" onClick={handleStartReview}>Start review</Button>
                  </div>
                )}
                {nda.status === 'Pending approval' && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm mb-2">Approve NDA</p>
                    <Badge variant="risk" risk="High" className="mb-2">Due today</Badge>
                    <Button variant="primary" size="sm" className="w-full" onClick={handleApprove}>Approve</Button>
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
      
      <Dialog open={showAddLinkDialog} onOpenChange={setShowAddLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Link</DialogTitle>
            <DialogDescription>
              Add a link to this NDA.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Link title..."
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              value={linkTitle}
              onChange={(e) => setLinkTitle(e.target.value)}
            />
            <input
              type="text"
              placeholder="Link URL..."
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setShowAddLinkDialog(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={confirmAddLink}>
              Add link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}