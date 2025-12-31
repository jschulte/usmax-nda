import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '../ui/AppCard';
import { Button } from '../ui/AppButton';
import { Input, TextArea, Select } from '../ui/AppInput';
import { Stepper } from '../ui/Stepper';
import { Badge } from '../ui/AppBadge';
import { ArrowLeft, ArrowRight, Info, Plus, Loader2, Eye, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { formatPhoneNumber, isValidPhoneFormat } from '../../client/utils/phoneFormatter';
import {
  getNDA,
  createNDA,
  updateNDA,
  cloneNDA,
  searchCompanies,
  getCompanySuggestions,
  getCompanyDefaults,
  getAgencySuggestions,
  updateDraft,
  type CreateNdaData,
  type UpdateNdaData,
  type AgencySuggestions,
  type CompanySuggestion,
  type UsMaxPosition,
  type NdaType,
} from '../../client/services/ndaService';
import {
  listAgencyGroups,
  listSubagencies,
  type AgencyGroup,
  type Subagency,
} from '../../client/services/agencyService';
import {
  searchContacts,
  createExternalContact,
  type Contact,
} from '../../client/services/userService';
import {
  listTemplates,
  generatePreview,
  type RtfTemplate,
} from '../../client/services/templateService';
import { generateDocument } from '../../client/services/documentService';

const ndaTypes: { value: NdaType; label: string; description: string }[] = [
  { value: 'MUTUAL', label: 'Mutual NDA', description: 'Both parties will exchange confidential information' },
  { value: 'CONSULTANT', label: 'Consultant', description: 'Consultant or contractor engagement agreement' }
];

const usMaxPositionLabels: Record<UsMaxPosition, string> = {
  PRIME: 'Prime',
  SUB_CONTRACTOR: 'Sub-contractor',
  OTHER: 'Other'
};

export function RequestWizard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: ndaId } = useParams<{ id: string }>();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cloneFromId = useMemo(() => new URLSearchParams(location.search).get('cloneFrom'), [location.search]);
  const [cloneSource, setCloneSource] = useState<{ id: string; displayId: number; companyName: string } | null>(null);
  const [draftId, setDraftId] = useState<string | null>(ndaId ?? null);
  const [draftStatus, setDraftStatus] = useState<'CREATED' | 'OTHER' | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Dropdown data
  const [agencyGroups, setAgencyGroups] = useState<AgencyGroup[]>([]);
  const [subagencies, setSubagencies] = useState<Subagency[]>([]);
  const [companySearchResults, setCompanySearchResults] = useState<Array<{ name: string; count: number }>>([]);
  const [recentCompanies, setRecentCompanies] = useState<CompanySuggestion[]>([]);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [agencySuggestions, setAgencySuggestions] = useState<AgencySuggestions | null>(null);
  const [templates, setTemplates] = useState<RtfTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [contactSuggestions, setContactSuggestions] = useState<Contact[]>([]);
  const [activePocField, setActivePocField] = useState<'relationship' | 'contracts' | 'opportunity' | 'contacts' | null>(null);
  const [hasTouchedPosition, setHasTouchedPosition] = useState(false);
  const [hasTouchedNdaType, setHasTouchedNdaType] = useState(false);
  const lastChangeAtRef = useRef<number | null>(null);
  const lastSavedAtRef = useRef<number | null>(null);
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveInFlightRef = useRef(false);
  const hasInitializedRef = useRef(false);

  // Form state - map backend fields to form fields
  const [formData, setFormData] = useState({
    companyName: '',
    companyCity: '',
    companyState: '',
    stateOfIncorporation: '',
    agencyGroupId: '',
    subagencyId: '',
    agencyOfficeName: '',
    ndaType: 'MUTUAL' as NdaType,
    abbreviatedName: '',
    authorizedPurpose: '',
    effectiveDate: '',
    usMaxPosition: 'PRIME' as UsMaxPosition,
    isNonUsMax: false,
    opportunityPocId: '',
    opportunityPocName: '',
    contractsPocId: '',
    contractsPocName: '',
    contractsPocEmail: '',
    contractsPocPhone: '',
    contractsPocFax: '',
    relationshipPocId: '',
    relationshipPocName: '',
    relationshipPocEmail: '',
    relationshipPocPhone: '',
    relationshipPocFax: '',
    contactsPocId: '',
    contactsPocName: '',
    rtfTemplateId: '',
    systemInput: '',
    confirmed: false,
  });

  const [pocErrors, setPocErrors] = useState({
    relationshipEmail: '',
    relationshipPhone: '',
    relationshipFax: '',
    contractsEmail: '',
    contractsPhone: '',
    contractsFax: '',
  });

  // Story H-1 Task 7: Inline contact creation state
  const [showCreateContactModal, setShowCreateContactModal] = useState(false);
  const [createContactPocType, setCreateContactPocType] = useState<'relationship' | 'contracts' | 'opportunity' | 'contacts' | null>(null);

  // Help section visibility - show on first visit, then collapsible
  const [showHelp, setShowHelp] = useState(() => {
    const hasVisited = localStorage.getItem('usmax-nda-wizard-visited');
    return !hasVisited; // Show on first visit
  });

  // Mark as visited on mount
  useEffect(() => {
    localStorage.setItem('usmax-nda-wizard-visited', 'true');
  }, []);
  const [createContactForm, setCreateContactForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [isCreatingContact, setIsCreatingContact] = useState(false);
  const [createContactErrors, setCreateContactErrors] = useState({
    firstName: '',
    lastName: '',
    email: '',
  });
  const [isPreviewingDocument, setIsPreviewingDocument] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [showInlinePreview, setShowInlinePreview] = useState(false);
  const [autoLoadedPreview, setAutoLoadedPreview] = useState(false);

  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_PATTERN = /^\(\d{3}\) \d{3}-\d{4}$/;

  const steps = [
    { label: 'Basic details', description: 'Request information' },
    { label: 'Company and agency', description: 'Organization details' },
    { label: 'Review and submit', description: 'Final confirmation' }
  ];

  // Auto-generate preview when reaching Step 3
  useEffect(() => {
    if (currentStep === 3 && formData.rtfTemplateId && !autoLoadedPreview && !showInlinePreview) {
      // Automatically load preview when user reaches final step
      handlePreviewDocument();
      setAutoLoadedPreview(true);
    }
  }, [currentStep, formData.rtfTemplateId, autoLoadedPreview, showInlinePreview]);

  // Load existing NDA if editing
  useEffect(() => {
    if (!ndaId) return;

    setIsLoading(true);
    getNDA(ndaId)
      .then((nda) => {
        setCloneSource(null);
        setDraftId(ndaId);
        setDraftStatus(nda.status === 'CREATED' ? 'CREATED' : 'OTHER');
        setHasTouchedPosition(true);
        setHasTouchedNdaType(true);
        setFormData({
          companyName: nda.companyName,
          companyCity: nda.companyCity || '',
          companyState: nda.companyState || '',
          stateOfIncorporation: nda.stateOfIncorporation || '',
          agencyGroupId: nda.agencyGroup.id,
          subagencyId: nda.subagency?.id || '',
          agencyOfficeName: nda.agencyOfficeName || '',
          ndaType: nda.ndaType || 'MUTUAL',
          abbreviatedName: nda.abbreviatedName,
          authorizedPurpose: nda.authorizedPurpose,
          effectiveDate: nda.effectiveDate ? nda.effectiveDate.split('T')[0] : '',
          usMaxPosition: nda.usMaxPosition,
          isNonUsMax: nda.isNonUsMax,
          opportunityPocId: nda.opportunityPoc?.id || '',
          opportunityPocName: nda.opportunityPoc
            ? `${nda.opportunityPoc.firstName || ''} ${nda.opportunityPoc.lastName || ''}`.trim() || nda.opportunityPoc.email
            : '',
          contractsPocId: nda.contractsPoc?.id || '',
          contractsPocName: nda.contractsPoc
            ? `${nda.contractsPoc.firstName || ''} ${nda.contractsPoc.lastName || ''}`.trim() || nda.contractsPoc.email
            : '',
          contractsPocEmail: nda.contractsPoc?.email || '',
          contractsPocPhone: '',
          contractsPocFax: '',
          relationshipPocId: nda.relationshipPoc.id,
          relationshipPocName: `${nda.relationshipPoc.firstName || ''} ${nda.relationshipPoc.lastName || ''}`.trim() || nda.relationshipPoc.email,
          relationshipPocEmail: nda.relationshipPoc.email || '',
          relationshipPocPhone: '',
          relationshipPocFax: '',
          contactsPocId: nda.contactsPoc?.id || '',
          contactsPocName: nda.contactsPoc
            ? `${nda.contactsPoc.firstName || ''} ${nda.contactsPoc.lastName || ''}`.trim() || nda.contactsPoc.email
            : '',
          rtfTemplateId: nda.rtfTemplateId || '',
          systemInput: '',
          confirmed: false,
        });
      })
      .catch((err) => {
        console.error('Failed to load NDA:', err);
        toast.error('Failed to load NDA data');
        navigate('/requests');
      })
      .finally(() => setIsLoading(false));
  }, [ndaId, navigate]);

  // Load NDA to clone if cloneFromId is provided
  useEffect(() => {
    if (!cloneFromId || ndaId) return;

    setIsLoading(true);
    getNDA(cloneFromId)
      .then((nda) => {
        setCloneSource({ id: nda.id, displayId: Number(nda.displayId), companyName: nda.companyName });
        setDraftId(null);
        setDraftStatus(null);
        setHasTouchedPosition(true);
        setHasTouchedNdaType(true);
        setFormData({
          companyName: nda.companyName,
          companyCity: nda.companyCity || '',
          companyState: nda.companyState || '',
          stateOfIncorporation: nda.stateOfIncorporation || '',
          agencyGroupId: nda.agencyGroup.id,
          subagencyId: nda.subagency?.id || '',
          agencyOfficeName: nda.agencyOfficeName || '',
          ndaType: nda.ndaType || 'MUTUAL',
          abbreviatedName: nda.abbreviatedName,
          authorizedPurpose: nda.authorizedPurpose,
          effectiveDate: nda.effectiveDate ? nda.effectiveDate.split('T')[0] : '',
          usMaxPosition: nda.usMaxPosition,
          isNonUsMax: nda.isNonUsMax,
          opportunityPocId: nda.opportunityPoc?.id || '',
          opportunityPocName: nda.opportunityPoc
            ? `${nda.opportunityPoc.firstName || ''} ${nda.opportunityPoc.lastName || ''}`.trim() || nda.opportunityPoc.email
            : '',
          contractsPocId: nda.contractsPoc?.id || '',
          contractsPocName: nda.contractsPoc
            ? `${nda.contractsPoc.firstName || ''} ${nda.contractsPoc.lastName || ''}`.trim() || nda.contractsPoc.email
            : '',
          contractsPocEmail: nda.contractsPoc?.email || '',
          contractsPocPhone: '',
          contractsPocFax: '',
          relationshipPocId: nda.relationshipPoc.id,
          relationshipPocName: `${nda.relationshipPoc.firstName || ''} ${nda.relationshipPoc.lastName || ''}`.trim() || nda.relationshipPoc.email,
          relationshipPocEmail: nda.relationshipPoc.email || '',
          relationshipPocPhone: '',
          relationshipPocFax: '',
          contactsPocId: nda.contactsPoc?.id || '',
          contactsPocName: nda.contactsPoc
            ? `${nda.contactsPoc.firstName || ''} ${nda.contactsPoc.lastName || ''}`.trim() || nda.contactsPoc.email
            : '',
          rtfTemplateId: nda.rtfTemplateId || '',
          systemInput: '',
          confirmed: false,
        });
      })
      .catch((err) => {
        console.error('Failed to load NDA for clone:', err);
        toast.error('Failed to load NDA for cloning');
        navigate('/requests');
      })
      .finally(() => setIsLoading(false));
  }, [cloneFromId, ndaId, navigate]);

  // Load agency groups on mount
  useEffect(() => {
    listAgencyGroups()
      .then((response) => {
        setAgencyGroups(response.agencyGroups);
      })
      .catch((err) => {
        console.error('Failed to load agency groups:', err);
        toast.error('Failed to load agencies');
      });
  }, []);

  // Load subagencies when agency group changes
  useEffect(() => {
    if (formData.agencyGroupId) {
      listSubagencies(formData.agencyGroupId)
        .then((response) => {
          setSubagencies(response.subagencies);
        })
        .catch((err) => {
          console.error('Failed to load subagencies:', err);
          setSubagencies([]);
        });
    } else {
      setSubagencies([]);
    }
  }, [formData.agencyGroupId]);

  // Load agency suggestions when agency changes
  useEffect(() => {
    if (!formData.agencyGroupId) {
      setAgencySuggestions(null);
      return;
    }

    getAgencySuggestions(formData.agencyGroupId)
      .then((response) => {
        const suggestions = response.suggestions;
        setAgencySuggestions(suggestions);

        if (suggestions.typicalPosition && !hasTouchedPosition) {
          setFormData((prev) => ({ ...prev, usMaxPosition: suggestions.typicalPosition! }));
        }
        if (suggestions.typicalNdaType && !hasTouchedNdaType) {
          setFormData((prev) => ({ ...prev, ndaType: suggestions.typicalNdaType! }));
        }
      })
      .catch((err) => {
        console.error('Failed to load agency suggestions:', err);
        setAgencySuggestions(null);
      });
  }, [formData.agencyGroupId, hasTouchedPosition, hasTouchedNdaType]);

  useEffect(() => {
    if (!formData.agencyGroupId) {
      setTemplates([]);
      setFormData((prev) => ({ ...prev, rtfTemplateId: '' }));
      return;
    }

    setTemplatesLoading(true);
    listTemplates(formData.agencyGroupId)
      .then((response) => {
        setTemplates(response.templates);
        setFormData((prev) => {
          const stillValid = prev.rtfTemplateId && response.templates.some((t) => t.id === prev.rtfTemplateId);
          if (stillValid) return prev;
          const recommended = response.templates.find((template) => template.isRecommended)?.id;
          const fallback = response.templates[0]?.id || '';
          return {
            ...prev,
            rtfTemplateId: recommended || fallback,
          };
        });
      })
      .catch((err) => {
        console.error('Failed to load templates:', err);
        setTemplates([]);
      })
      .finally(() => setTemplatesLoading(false));
  }, [formData.agencyGroupId]);

  const handleCompanyFocus = useCallback(async () => {
    setShowCompanyDropdown(true);
    if (recentCompanies.length > 0) return;

    try {
      const response = await getCompanySuggestions();
      setRecentCompanies(response.companies);
    } catch (err) {
      console.error('Failed to load company suggestions:', err);
    }
  }, [recentCompanies.length]);

  // Debounced company search
  const handleCompanySearch = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setCompanySearchResults([]);
        return;
      }

      try {
        const response = await searchCompanies(query);
        setCompanySearchResults(response.companies);
      } catch (err) {
        console.error('Failed to search companies:', err);
      }
    },
    []
  );

  // Load company defaults when company is selected
  const handleCompanySelect = useCallback(async (companyName: string) => {
    setFormData((prev) => ({ ...prev, companyName }));
    setShowCompanyDropdown(false);
    setTouchedFields((prev) => ({ ...prev, companyName: true }));

    try {
      const response = await getCompanyDefaults(companyName);
      const defaults = response.defaults;

      setFormData((prev) => ({
        ...prev,
        companyCity: defaults.companyCity || prev.companyCity,
        companyState: defaults.companyState || prev.companyState,
        stateOfIncorporation: defaults.stateOfIncorporation || prev.stateOfIncorporation,
        relationshipPocId: defaults.lastRelationshipPocId || prev.relationshipPocId,
        relationshipPocName: defaults.lastRelationshipPocName || prev.relationshipPocName,
        contractsPocId: defaults.lastContractsPocId || prev.contractsPocId,
        contractsPocName: defaults.lastContractsPocName || prev.contractsPocName,
        agencyGroupId: defaults.mostCommonAgencyGroupId || prev.agencyGroupId,
        subagencyId: defaults.mostCommonSubagencyId || prev.subagencyId,
      }));

      if (defaults.companyCity || defaults.companyState) {
        toast.success('Company details auto-filled from previous records');
      }
    } catch (err) {
      console.error('Failed to load company defaults:', err);
    }
  }, []);

  const companySuggestionItems = useMemo(() => {
    const items: Array<{ name: string; count?: number; source: 'recent' | 'agency' | 'search' }> = [];
    const seen = new Set<string>();
    const addItem = (name: string, source: 'recent' | 'agency' | 'search', count?: number) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      items.push({ name: trimmed, count, source });
    };

    const hasQuery = formData.companyName.trim().length >= 2;

    if (recentCompanies.length) {
      for (const company of recentCompanies) {
        addItem(company.companyName, 'recent', company.count);
      }
    }

    if (agencySuggestions?.commonCompanies?.length) {
      for (const company of agencySuggestions.commonCompanies) {
        addItem(company.companyName, 'agency', company.count);
      }
    }

    if (hasQuery && companySearchResults.length) {
      for (const company of companySearchResults) {
        addItem(company.name, 'search', company.count);
      }
    }

    return items;
  }, [formData.companyName, recentCompanies, agencySuggestions, companySearchResults]);

  // Debounced contact search
  const handleContactSearch = useCallback(
    async (query: string, field: 'relationship' | 'contracts' | 'opportunity' | 'contacts') => {
      setActivePocField(field);
      const minChars = field === 'opportunity' ? 3 : 2;
      if (query.length < minChars) {
        setContactSuggestions([]);
        return;
      }

      try {
        const searchType = field === 'opportunity' ? 'internal' : field === 'contacts' ? 'all' : 'external';
        const response = await searchContacts(query, searchType);
        setContactSuggestions(response.contacts);
      } catch (err) {
        console.error('Failed to search contacts:', err);
      }
    },
    []
  );

  // Story H-1 Task 7: Inline contact creation handlers
  const openCreateContactModal = useCallback((pocType: 'relationship' | 'contracts' | 'opportunity' | 'contacts') => {
    setCreateContactPocType(pocType);
    setCreateContactForm({ firstName: '', lastName: '', email: '', phone: '' });
    setCreateContactErrors({ firstName: '', lastName: '', email: '' });
    setContactSuggestions([]);
    setShowCreateContactModal(true);
  }, []);

  const handleCreateContact = useCallback(async () => {
    // Validate
    const errors = { firstName: '', lastName: '', email: '' };
    if (!createContactForm.firstName.trim()) {
      errors.firstName = 'First name is required';
    }
    if (!createContactForm.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }
    if (!createContactForm.email.trim()) {
      errors.email = 'Email is required';
    } else if (!EMAIL_PATTERN.test(createContactForm.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (errors.firstName || errors.lastName || errors.email) {
      setCreateContactErrors(errors);
      return;
    }

    setIsCreatingContact(true);
    try {
      const created = await createExternalContact({
        firstName: createContactForm.firstName.trim(),
        lastName: createContactForm.lastName.trim(),
        email: createContactForm.email.trim(),
        phone: createContactForm.phone.trim() || undefined,
      });

      // Update the appropriate POC field based on type
      const fullName = `${created.firstName || ''} ${created.lastName || ''}`.trim() || created.email;
      const phone = created.workPhone || createContactForm.phone || '';

      if (createContactPocType === 'relationship') {
        setFormData((prev) => ({
          ...prev,
          relationshipPocId: created.id,
          relationshipPocName: fullName,
          relationshipPocEmail: created.email || '',
          relationshipPocPhone: phone,
        }));
        markTouched('relationshipPoc');
        setPocErrors((prev) => ({ ...prev, relationshipEmail: '' }));
      } else if (createContactPocType === 'contracts') {
        setFormData((prev) => ({
          ...prev,
          contractsPocId: created.id,
          contractsPocName: fullName,
          contractsPocEmail: created.email || '',
          contractsPocPhone: phone,
        }));
      } else if (createContactPocType === 'opportunity') {
        setFormData((prev) => ({
          ...prev,
          opportunityPocId: created.id,
          opportunityPocName: fullName,
          opportunityPocPhone: phone,
        }));
      } else if (createContactPocType === 'contacts') {
        setFormData((prev) => ({
          ...prev,
          contactsPocId: created.id,
          contactsPocName: fullName,
          contactsPocPhone: phone,
        }));
      }

      toast.success('Contact created', { description: `${fullName} has been added` });
      setShowCreateContactModal(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create contact';
      toast.error('Error creating contact', { description: message });
    } finally {
      setIsCreatingContact(false);
    }
  }, [createContactForm, createContactPocType]);

  const relationshipPocNameValid = formData.relationshipPocName.trim().length > 0;
  const relationshipPocEmailValid = EMAIL_PATTERN.test(formData.relationshipPocEmail);
  const relationshipPocComplete =
    Boolean(formData.relationshipPocId) || (relationshipPocNameValid && relationshipPocEmailValid);

  const authorizedPurposeCount = formData.authorizedPurpose.length;

  const requiredErrors = useMemo(() => {
    const errors: Record<string, string> = {};

    if ((touchedFields.abbreviatedName || showErrors) && !formData.abbreviatedName.trim()) {
      errors.abbreviatedName = 'Abbreviated name is required';
    }
    if ((touchedFields.authorizedPurpose || showErrors) && !formData.authorizedPurpose.trim()) {
      errors.authorizedPurpose = 'Authorized purpose is required';
    } else if (authorizedPurposeCount > 255) {
      errors.authorizedPurpose = 'Authorized purpose must be 255 characters or less';
    }
    if ((touchedFields.usMaxPosition || showErrors) && !formData.usMaxPosition) {
      errors.usMaxPosition = 'USmax position is required';
    }
    if ((touchedFields.companyName || showErrors) && !formData.companyName.trim()) {
      errors.companyName = 'Company name is required';
    }
    if ((touchedFields.agencyGroupId || showErrors) && !formData.agencyGroupId) {
      errors.agencyGroupId = 'Agency group is required';
    }
    if ((touchedFields.relationshipPoc || showErrors) && !relationshipPocComplete) {
      errors.relationshipPoc = 'Relationship POC is required';
    }

    return errors;
  }, [
    touchedFields,
    showErrors,
    formData.abbreviatedName,
    formData.authorizedPurpose,
    formData.usMaxPosition,
    formData.companyName,
    formData.agencyGroupId,
    relationshipPocComplete,
    authorizedPurposeCount,
  ]);

  const markTouched = (field: string) => {
    setTouchedFields((prev) => ({ ...prev, [field]: true }));
  };
  
  const canProceed = () => {
    if (currentStep === 1) {
      return (
        formData.abbreviatedName.trim().length > 0 &&
        formData.authorizedPurpose.trim().length > 0 &&
        authorizedPurposeCount <= 255 &&
        Boolean(formData.usMaxPosition)
      );
    }
    if (currentStep === 2) {
      return (
        formData.companyName.trim().length > 0 &&
        Boolean(formData.agencyGroupId) &&
        relationshipPocComplete
      );
    }
    if (currentStep === 3) {
      return formData.confirmed;
    }
    return false;
  };

  const canCreateDraft = () => {
    return (
      formData.abbreviatedName.trim().length > 0 &&
      formData.authorizedPurpose.trim().length > 0 &&
      authorizedPurposeCount <= 255 &&
      formData.companyName.trim().length > 0 &&
      Boolean(formData.agencyGroupId) &&
      relationshipPocComplete
    );
  };

  const buildPayload = (relationshipPocId: string, contractsPocId?: string, contactsPocId?: string) => {
    const payload: any = {
      companyName: formData.companyName.trim(),
      agencyGroupId: formData.agencyGroupId,
      subagencyId: formData.subagencyId || undefined,
      agencyOfficeName: formData.agencyOfficeName || undefined,
      ndaType: formData.ndaType,
      abbreviatedName: formData.abbreviatedName.trim(),
      authorizedPurpose: formData.authorizedPurpose.trim(),
      effectiveDate: formData.effectiveDate || undefined,
      usMaxPosition: formData.usMaxPosition as UsMaxPosition,
      isNonUsMax: formData.isNonUsMax,
      contractsPocId: contractsPocId || undefined,
      relationshipPocId,
      contactsPocId: contactsPocId || undefined,
      rtfTemplateId: formData.rtfTemplateId || undefined,
      companyCity: formData.companyCity || undefined,
      companyState: formData.companyState || undefined,
      stateOfIncorporation: formData.stateOfIncorporation || undefined,
    };

    // Only include opportunityPocId if explicitly set (let server default to current user)
    if (formData.opportunityPocId) {
      payload.opportunityPocId = formData.opportunityPocId;
    }

    return payload;
  };

  const buildDraftPayload = (relationshipPocId?: string | null, contractsPocId?: string | null) => ({
    companyName: formData.companyName,
    companyCity: formData.companyCity || undefined,
    companyState: formData.companyState || undefined,
    stateOfIncorporation: formData.stateOfIncorporation || undefined,
    agencyGroupId: formData.agencyGroupId || undefined,
    subagencyId: formData.subagencyId || undefined,
    agencyOfficeName: formData.agencyOfficeName || undefined,
    ndaType: formData.ndaType || undefined,
    abbreviatedName: formData.abbreviatedName,
    authorizedPurpose: formData.authorizedPurpose,
    effectiveDate: formData.effectiveDate || undefined,
    usMaxPosition: formData.usMaxPosition || undefined,
    isNonUsMax: formData.isNonUsMax,
    contractsPocId: contractsPocId ?? undefined,
    relationshipPocId: relationshipPocId ?? undefined,
    contactsPocId: formData.contactsPocId || undefined,
    rtfTemplateId: formData.rtfTemplateId || undefined,
  });

  const resolveRelationshipPocId = async (allowCreate: boolean): Promise<string | null> => {
    if (formData.relationshipPocId) return formData.relationshipPocId;
    if (!allowCreate || !relationshipPocEmailValid) return null;

    const [firstName, ...lastNameParts] = formData.relationshipPocName.trim().split(' ');
    const created = await createExternalContact({
      email: formData.relationshipPocEmail,
      firstName: firstName || undefined,
      lastName: lastNameParts.join(' ') || undefined,
      phone: formData.relationshipPocPhone || undefined,
      fax: formData.relationshipPocFax || undefined,
    });
    setFormData((prev) => ({
      ...prev,
      relationshipPocId: created.id,
      relationshipPocName: `${created.firstName || ''} ${created.lastName || ''}`.trim() || created.email,
      relationshipPocEmail: created.email,
    }));
    return created.id;
  };

  const resolveContractsPocId = async (allowCreate: boolean): Promise<string | null> => {
    if (formData.contractsPocId) return formData.contractsPocId;
    if (!allowCreate || !formData.contractsPocEmail) return null;

    if (!EMAIL_PATTERN.test(formData.contractsPocEmail)) {
      return null;
    }

    const [firstName, ...lastNameParts] = formData.contractsPocName.trim().split(' ');
    const created = await createExternalContact({
      email: formData.contractsPocEmail,
      firstName: firstName || undefined,
      lastName: lastNameParts.join(' ') || undefined,
      phone: formData.contractsPocPhone || undefined,
      fax: formData.contractsPocFax || undefined,
    });
    setFormData((prev) => ({
      ...prev,
      contractsPocId: created.id,
      contractsPocName: `${created.firstName || ''} ${created.lastName || ''}`.trim() || created.email,
      contractsPocEmail: created.email,
    }));
    return created.id;
  };

  const handlePreviewDocument = async () => {
    // Ensure we have a draft NDA to preview
    if (!draftId) {
      if (!canCreateDraft()) {
        toast.error('Please complete required fields before previewing', {
          description: 'Fill in company, agency, authorized purpose, and relationship POC'
        });
        return;
      }

      // Create draft first
      try {
        const relationshipId = await resolveRelationshipPocId(true);
        if (!relationshipId) {
          toast.error('Please provide a valid Relationship POC email');
          return;
        }

        const contractsId = await resolveContractsPocId(true);
        const payload = buildPayload(
          relationshipId,
          contractsId || undefined,
          formData.contactsPocId || undefined
        );
        const response = await createNDA(payload as CreateNdaData);
        const newDraftId = (response.nda as any)?.id;
        if (newDraftId) {
          setDraftId(newDraftId);
          setDraftStatus('CREATED');
        } else {
          toast.error('Failed to create draft for preview');
          return;
        }

        // Generate preview with the new draft
        setIsPreviewingDocument(true);
        const result = await generatePreview(newDraftId, formData.rtfTemplateId || undefined);
        setPreviewUrl(result.preview.previewUrl);
        setPreviewHtml(result.preview.htmlContent || null);
        setShowInlinePreview(true);
        toast.success('Document preview generated');
      } catch (err) {
        console.error('Failed to create draft and preview:', err);
        toast.error('Failed to generate preview', {
          description: err instanceof Error ? err.message : 'Unknown error'
        });
      } finally {
        setIsPreviewingDocument(false);
      }
    } else {
      // Draft already exists, just preview it
      try {
        setIsPreviewingDocument(true);
        const result = await generatePreview(draftId, formData.rtfTemplateId || undefined);
        setPreviewUrl(result.preview.previewUrl);
        setPreviewHtml(result.preview.htmlContent || null);
        setShowInlinePreview(true);
        toast.success('Document preview generated');
      } catch (err) {
        console.error('Failed to generate preview:', err);
        toast.error('Failed to generate preview', {
          description: err instanceof Error ? err.message : 'Unknown error'
        });
      } finally {
        setIsPreviewingDocument(false);
      }
    }
  };

  const handleSubmit = async () => {
    setShowErrors(true);
    if (!canProceed()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      if (formData.relationshipPocPhone && !PHONE_PATTERN.test(formData.relationshipPocPhone)) {
        setPocErrors((prev) => ({ ...prev, relationshipPhone: 'Use format (XXX) XXX-XXXX' }));
        toast.error('Relationship POC phone format is invalid');
        setIsSubmitting(false);
        return;
      }

      if (formData.relationshipPocEmail && !EMAIL_PATTERN.test(formData.relationshipPocEmail)) {
        setPocErrors((prev) => ({ ...prev, relationshipEmail: 'Valid email is required' }));
        toast.error('Relationship POC email format is invalid');
        setIsSubmitting(false);
        return;
      }

      if (formData.contractsPocEmail && !EMAIL_PATTERN.test(formData.contractsPocEmail)) {
        setPocErrors((prev) => ({ ...prev, contractsEmail: 'Valid email is required' }));
        toast.error('Contracts POC email format is invalid');
        setIsSubmitting(false);
        return;
      }

      if (formData.contractsPocPhone && !PHONE_PATTERN.test(formData.contractsPocPhone)) {
        setPocErrors((prev) => ({ ...prev, contractsPhone: 'Use format (XXX) XXX-XXXX' }));
        toast.error('Contracts POC phone format is invalid');
        setIsSubmitting(false);
        return;
      }

      const relationshipPocId = await resolveRelationshipPocId(true);
      if (!relationshipPocId) {
        setPocErrors((prev) => ({ ...prev, relationshipEmail: 'Valid email is required' }));
        toast.error('Relationship POC email is required');
        setIsSubmitting(false);
        return;
      }

      const contractsPocId = await resolveContractsPocId(true);

      const payload = buildPayload(
        relationshipPocId,
        contractsPocId || undefined,
        formData.contactsPocId || undefined
      );

      if (ndaId) {
        // Update existing NDA
        await updateNDA(ndaId, payload as UpdateNdaData);
        toast.success('NDA updated successfully!');
        navigate(`/nda/${ndaId}`);
      } else if (cloneSource) {
        const response = await cloneNDA(cloneSource.id, payload as Partial<CreateNdaData>);
        toast.success('NDA cloned successfully!');
        const newNdaId = (response.nda as any)?.id;
        if (newNdaId) {
          // Auto-generate document if template is selected
          if (formData.rtfTemplateId) {
            try {
              await generateDocument(newNdaId, formData.rtfTemplateId);
              toast.success('Document generated automatically');
            } catch (docError) {
              console.error('Failed to auto-generate document:', docError);
              toast.info('NDA cloned, but document generation failed. You can generate it manually.');
            }
          }
          navigate(`/nda/${newNdaId}`);
        } else {
          navigate('/requests');
        }
      } else {
        // Create new NDA
        const response = await createNDA(payload as CreateNdaData);
        toast.success('NDA created successfully!');
        // Extract NDA ID from response
        const newNdaId = (response.nda as any)?.id;
        if (newNdaId) {
          // Auto-generate document if template is selected
          if (formData.rtfTemplateId) {
            try {
              await generateDocument(newNdaId, formData.rtfTemplateId);
              toast.success('Document generated automatically');
            } catch (docError) {
              console.error('Failed to auto-generate document:', docError);
              // Don't block navigation if document generation fails
              toast.info('NDA created, but document generation failed. You can generate it manually.');
            }
          }
          navigate(`/nda/${newNdaId}`);
        } else {
          navigate('/requests');
        }
      }
    } catch (error: any) {
      console.error('Failed to submit NDA:', error);
      toast.error(error.message || 'Failed to save NDA');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!canCreateDraft()) {
      setShowErrors(true);
      toast.error('Fill required fields before saving a draft');
      return;
    }

    setIsSubmitting(true);

    try {
      const relationshipPocId = await resolveRelationshipPocId(true);
      if (!relationshipPocId) {
        setPocErrors((prev) => ({ ...prev, relationshipEmail: 'Valid email is required' }));
        toast.error('Relationship POC email is required');
        setIsSubmitting(false);
        return;
      }

      const contractsPocId = await resolveContractsPocId(true);
      const payload = buildPayload(
        relationshipPocId,
        contractsPocId || undefined,
        formData.contactsPocId || undefined
      );

      if (draftId && draftStatus === 'CREATED') {
        await updateDraft(draftId, payload as UpdateNdaData);
        lastSavedAtRef.current = Date.now();
        toast.success('Draft saved ✓');
        navigate(`/nda/${draftId}`);
        return;
      }

      const response = await createNDA(payload as CreateNdaData);
      const newNdaId = (response.nda as any)?.id;
      if (newNdaId) {
        setDraftId(newNdaId);
        setDraftStatus('CREATED');
        lastSavedAtRef.current = Date.now();
        toast.success('Draft saved ✓');
        navigate(`/nda/${newNdaId}`);
      } else {
        navigate('/requests');
      }
    } catch (error: any) {
      console.error('Failed to save draft:', error);
      toast.error(error.message || 'Failed to save draft');
    } finally {
      setIsSubmitting(false);
    }
  };

  const attemptAutoSave = useCallback(
    async (isRetry = false) => {
      if (autoSaveInFlightRef.current || isSubmitting || isLoading) return;
      if (cloneSource && !draftId) return;
      if (draftStatus && draftStatus !== 'CREATED') return;

      const lastChangeAt = lastChangeAtRef.current;
      if (!lastChangeAt) return;
      if (lastSavedAtRef.current && lastSavedAtRef.current >= lastChangeAt) return;

      autoSaveInFlightRef.current = true;
      setIsAutoSaving(true);

      try {
        let currentDraftId = draftId;

        if (!currentDraftId) {
          if (!canCreateDraft()) {
            return;
          }

          const relationshipId = await resolveRelationshipPocId(true);
          if (!relationshipId) {
            return;
          }

          const contractsId = await resolveContractsPocId(true);
          const payload = buildPayload(
            relationshipId,
            contractsId || undefined,
            formData.contactsPocId || undefined
          );
          const response = await createNDA(payload as CreateNdaData);
          currentDraftId = (response.nda as any)?.id || null;
          if (currentDraftId) {
            setDraftId(currentDraftId);
            setDraftStatus('CREATED');
          }
        } else {
          const payload = buildDraftPayload(formData.relationshipPocId || undefined, formData.contractsPocId || undefined);
          await updateDraft(currentDraftId, payload as UpdateNdaData);
        }

        lastSavedAtRef.current = Date.now();
        if (autoSaveRetryRef.current) {
          clearTimeout(autoSaveRetryRef.current);
          autoSaveRetryRef.current = null;
        }
        toast.success('Draft saved ✓');
      } catch (error) {
        console.error('Auto-save failed:', error);
        if (autoSaveRetryRef.current) return;
        autoSaveRetryRef.current = setTimeout(async () => {
          autoSaveRetryRef.current = null;
          try {
            await attemptAutoSave(true);
          } catch {
            // handled in attemptAutoSave
          }
        }, 5000);

        if (isRetry) {
          toast.error('Auto-save failed - check connection');
        }
      } finally {
        autoSaveInFlightRef.current = false;
        setIsAutoSaving(false);
      }
    },
    [
      isSubmitting,
      isLoading,
      draftId,
      draftStatus,
      cloneSource,
      formData,
      canCreateDraft,
      resolveRelationshipPocId,
      resolveContractsPocId,
      buildPayload,
      buildDraftPayload,
    ]
  );

  useEffect(() => {
    if (isLoading) return;

    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      return;
    }

    lastChangeAtRef.current = Date.now();

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      attemptAutoSave();
    }, 30000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [formData, isLoading, attemptAutoSave]);

  // Issue #24: Warn user about unsaved changes when navigating away
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Check if form has meaningful data
      const hasData = formData.companyName.trim() !== '' ||
                     formData.projectName.trim() !== '' ||
                     formData.relationshipPocName.trim() !== '';

      // Check if there are unsaved changes (null-safe)
      const lastChange = lastChangeAtRef.current ?? 0;
      const lastSaved = lastSavedAtRef.current ?? 0;
      const hasUnsavedChanges = lastChange > lastSaved && lastChange > 0;

      // Warn if there's data and unsaved changes
      if (hasData && hasUnsavedChanges && !isAutoSaving) {
        e.preventDefault();
        e.returnValue = ''; // Required for Chrome
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [formData, isAutoSaving]);

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
            <p className="text-[var(--color-text-secondary)]">Loading NDA...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-6 md:mb-8">
        <Button
          variant="subtle"
          size="sm"
          icon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate('/requests')}
          className="mb-4"
        >
          Back to requests
        </Button>
        <h1 className="mb-2">{ndaId ? 'Edit NDA' : 'Create new NDA'}</h1>
        <p className="text-[var(--color-text-secondary)]">
          {ndaId ? 'Update the NDA information and save changes' : 'Complete the following steps to create your NDA'}
        </p>
        {cloneSource && (
          <div className="mt-4 p-3 bg-[var(--color-primary-light)] border border-[var(--color-border)] rounded-lg text-sm">
            Cloned from NDA #{cloneSource.displayId} ({cloneSource.companyName})
          </div>
        )}
      </div>
      
      {/* Mobile-friendly stepper with horizontal scroll */}
      <div className="mb-6 md:mb-8 overflow-x-auto">
        <Stepper steps={steps} currentStep={currentStep} className="min-w-max md:min-w-0" />
      </div>
      
      <Card>
        {/* Inline collapsible help - shown on first visit, then behind toggle */}
        <div className="mb-6 pb-6 border-b border-[var(--color-border)]">
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="w-full flex items-center justify-between text-left hover:opacity-80 transition-opacity group"
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-[var(--color-primary)]" />
              <h3 className="text-base font-medium">Help & guidance</h3>
              <span className="text-xs text-[var(--color-text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity">
                {showHelp ? 'Click to hide' : 'Click for help'}
              </span>
            </div>
            {showHelp ? (
              <ChevronUp className="w-5 h-5 text-[var(--color-text-secondary)]" />
            ) : (
              <ChevronDown className="w-5 h-5 text-[var(--color-text-secondary)]" />
            )}
          </button>

          {showHelp && (
            <div className="mt-4 text-sm text-[var(--color-text-secondary)]">
              {currentStep === 1 && (
                <div className="space-y-2">
                  <p>Enter the basic details for your NDA:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><strong>Abbreviated name:</strong> A short, memorable name for quick reference</li>
                    <li><strong>Authorized purpose:</strong> Clearly describe the business purpose</li>
                    <li><strong>USmax position:</strong> Your organization's role in the relationship</li>
                    <li><strong>Effective date:</strong> When the NDA becomes active (defaults to today)</li>
                  </ul>
                </div>
              )}
              {currentStep === 2 && (
                <div className="space-y-2">
                  <p>Provide company and organizational details:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Start typing the company name for auto-suggestions</li>
                    <li>Previous details may be auto-filled if company exists</li>
                    <li>Select the appropriate agency and subagency</li>
                    <li>Assign points of contact for relationship management</li>
                  </ul>
                </div>
              )}
              {currentStep === 3 && (
                <div className="space-y-2">
                  <p>Before {ndaId ? 'saving changes' : 'creating the NDA'}:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Review all information for accuracy</li>
                    <li>Verify company and agency details are correct</li>
                    <li>Confirm points of contact are properly assigned</li>
                    <li>Ensure you have proper authorization</li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Step 1: Basic Details */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <h2>Basic details</h2>

                <Input
                  label="Abbreviated name *"
                  placeholder="e.g., TechCorp Integration"
                  value={formData.abbreviatedName}
                  onChange={(e) => setFormData({ ...formData, abbreviatedName: e.target.value })}
                  onBlur={() => markTouched('abbreviatedName')}
                  error={requiredErrors.abbreviatedName}
                  helperText="Short name for this NDA"
                />

                <TextArea
                  label="Authorized purpose *"
                  placeholder="Describe the authorized purpose of this NDA and the project context"
                  rows={4}
                  maxLength={255}
                  value={formData.authorizedPurpose}
                  onChange={(e) => setFormData({ ...formData, authorizedPurpose: e.target.value })}
                  onBlur={() => markTouched('authorizedPurpose')}
                  error={requiredErrors.authorizedPurpose}
                  helperText={`${authorizedPurposeCount}/255`}
                />

                <div>
                  <label className="block text-sm mb-3 text-[var(--color-text-primary)]">
                    NDA type
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {ndaTypes.map((typeOption) => {
                      const isSuggested = agencySuggestions?.typicalNdaType === typeOption.value;
                      return (
                        <button
                          key={typeOption.value}
                          onClick={() => {
                            setHasTouchedNdaType(true);
                            markTouched('ndaType');
                            setFormData({ ...formData, ndaType: typeOption.value });
                          }}
                          className={`p-3 border-2 rounded-lg text-left transition-all ${
                            formData.ndaType === typeOption.value
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                              : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">{typeOption.label}</p>
                            {isSuggested && (
                              <Badge variant="info">Suggested</Badge>
                            )}
                          </div>
                          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                            {typeOption.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                  {agencySuggestions?.typicalNdaType && (
                    <p className="text-xs text-[var(--color-text-secondary)] mt-2">
                      Suggested NDA type based on this agency: {ndaTypes.find((t) => t.value === agencySuggestions.typicalNdaType)?.label}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm mb-3 text-[var(--color-text-primary)]">
                    USmax position *
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {(['PRIME', 'SUB_CONTRACTOR', 'OTHER'] as UsMaxPosition[]).map((position) => (
                      <button
                        key={position}
                        onClick={() => {
                          setHasTouchedPosition(true);
                          markTouched('usMaxPosition');
                          setFormData({ ...formData, usMaxPosition: position });
                        }}
                        className={`p-3 border-2 rounded-lg text-center transition-all ${
                          formData.usMaxPosition === position
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                            : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)]'
                        }`}
                      >
                        <p className="text-sm font-medium">{usMaxPositionLabels[position]}</p>
                      </button>
                    ))}
                  </div>
                  {requiredErrors.usMaxPosition && (
                    <p className="mt-2 text-xs text-[var(--color-danger)]">{requiredErrors.usMaxPosition}</p>
                  )}
                  {agencySuggestions?.typicalPosition && (
                    <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
                      Suggested position based on this agency: {usMaxPositionLabels[agencySuggestions.typicalPosition] || agencySuggestions.typicalPosition}
                    </p>
                  )}
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isNonUsMax}
                    onChange={(e) => setFormData({ ...formData, isNonUsMax: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Non-USMAX entity</span>
                </label>

                <Input
                  label="Effective date"
                  type="date"
                  value={formData.effectiveDate}
                  onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                  helperText="Leave blank to use today's date"
                />
              </div>
            )}
            
            {/* Step 2: Company and Agency */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h2>Company and agency</h2>

                <div className="relative">
                  <Input
                    label="Company name *"
                    placeholder="Start typing to search..."
                    value={formData.companyName}
                    onChange={(e) => {
                      setFormData({ ...formData, companyName: e.target.value });
                      handleCompanySearch(e.target.value);
                      setShowCompanyDropdown(true);
                    }}
                    onFocus={handleCompanyFocus}
                    onBlur={() => {
                      markTouched('companyName');
                      setTimeout(() => setShowCompanyDropdown(false), 150);
                    }}
                    error={requiredErrors.companyName}
                  />
                  {showCompanyDropdown && companySuggestionItems.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-[var(--color-border)] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {companySuggestionItems.map((company) => (
                        <button
                          key={`${company.source}-${company.name}`}
                          onClick={() => {
                            handleCompanySelect(company.name);
                            setCompanySearchResults([]);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span>{company.name}</span>
                            <span className="text-xs text-[var(--color-text-secondary)]">
                              {company.source === 'recent' && 'Recent'}
                              {company.source === 'agency' && 'Agency'}
                              {company.source === 'search' && 'Match'}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="City"
                    placeholder="e.g., Washington"
                    value={formData.companyCity}
                    onChange={(e) => setFormData({ ...formData, companyCity: e.target.value })}
                  />
                  <Input
                    label="State"
                    placeholder="e.g., DC"
                    value={formData.companyState}
                    onChange={(e) => setFormData({ ...formData, companyState: e.target.value })}
                  />
                  <Input
                    label="State of incorporation"
                    placeholder="e.g., DE"
                    value={formData.stateOfIncorporation}
                    onChange={(e) => setFormData({ ...formData, stateOfIncorporation: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Agency group *"
                    value={formData.agencyGroupId}
                    onChange={(e) => {
                      markTouched('agencyGroupId');
                      setFormData({ ...formData, agencyGroupId: e.target.value, subagencyId: '' });
                    }}
                    onBlur={() => markTouched('agencyGroupId')}
                    error={requiredErrors.agencyGroupId}
                  >
                    <option value="">Select agency...</option>
                    {agencyGroups.map((ag) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.name}
                      </option>
                    ))}
                  </Select>

                  <Select
                    label="Subagency"
                    value={formData.subagencyId}
                    onChange={(e) => setFormData({ ...formData, subagencyId: e.target.value })}
                    disabled={!formData.agencyGroupId || subagencies.length === 0}
                  >
                    <option value="">Select subagency (optional)...</option>
                    {subagencies.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <Input
                  label="Agency office name"
                  placeholder="e.g., Office of Technology"
                  value={formData.agencyOfficeName}
                  onChange={(e) => setFormData({ ...formData, agencyOfficeName: e.target.value })}
                />

                {agencySuggestions && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-[var(--color-text-secondary)]">
                    <p className="font-medium text-[var(--color-text-primary)] mb-1">Agency suggestions</p>
                    {agencySuggestions.defaultTemplateName && (
                      <p>Suggested template: {agencySuggestions.defaultTemplateName}</p>
                    )}
                    {agencySuggestions.commonCompanies?.length > 0 && (
                      <p>Common companies: {agencySuggestions.commonCompanies.map((c) => c.companyName).join(', ')}</p>
                    )}
                  </div>
                )}

                <div>
                  <Select
                    label="RTF template"
                    value={formData.rtfTemplateId}
                    onChange={(e) => setFormData({ ...formData, rtfTemplateId: e.target.value })}
                    disabled={!formData.agencyGroupId || templatesLoading || templates.length === 0}
                  >
                    <option value="">
                      {templatesLoading ? 'Loading templates...' : 'Select a template (optional)'}
                    </option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}{template.isRecommended ? ' (recommended)' : ''}
                      </option>
                    ))}
                  </Select>
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                    {templatesLoading
                      ? 'Loading templates...'
                      : templates.length === 0
                        ? 'No templates available for this agency'
                        : 'Select a template for document generation'}
                  </p>
                </div>

                <div className="border-t border-[var(--color-border)] pt-6">
                  <h3 className="mb-4">Points of contact</h3>

                  <div className="space-y-4">
                    <div className="relative">
                      <Input
                        label="Relationship POC * (Primary Point of Contact)"
                        placeholder="Search for primary contact..."
                        helperText="Main relationship manager for this NDA (required)"
                        value={formData.relationshipPocName}
                        onChange={(e) => {
                          setFormData({ ...formData, relationshipPocName: e.target.value, relationshipPocId: '' });
                          handleContactSearch(e.target.value, 'relationship');
                        }}
                        onBlur={() => markTouched('relationshipPoc')}
                        error={requiredErrors.relationshipPoc}
                        helperText="Required: Primary relationship point of contact"
                      />
                      {activePocField === 'relationship' && !formData.relationshipPocId && formData.relationshipPocName.length >= 2 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-[var(--color-border)] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {contactSuggestions.map((contact) => (
                            <button
                              key={contact.id}
                              onClick={() => {
                                // Story 9.14: Auto-fill phone from contact
                                const phone = contact.workPhone || contact.cellPhone || '';
                                setFormData({
                                  ...formData,
                                  relationshipPocId: contact.id,
                                  relationshipPocName: `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || contact.email,
                                  relationshipPocEmail: contact.email || '',
                                  relationshipPocPhone: phone,
                                });
                                markTouched('relationshipPoc');
                                setPocErrors((prev) => ({ ...prev, relationshipEmail: '' }));
                                setContactSuggestions([]);
                              }}
                              className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                            >
                              <div className="font-medium">
                                {`${contact.firstName || ''} ${contact.lastName || ''}`.trim() || contact.email}
                              </div>
                              <div className="text-xs text-[var(--color-text-secondary)]">{contact.email}</div>
                            </button>
                          ))}
                          {/* Story H-1 Task 7: Create New Contact option */}
                          <button
                            onClick={() => openCreateContactModal('relationship')}
                            className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors border-t border-[var(--color-border)] flex items-center gap-2 text-[var(--color-primary)]"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Create New Contact</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Input
                        label="Relationship POC Email *"
                        placeholder="name@example.com"
                        value={formData.relationshipPocEmail}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData({ ...formData, relationshipPocEmail: value });
                          setPocErrors((prev) => ({
                            ...prev,
                            relationshipEmail: value && !EMAIL_PATTERN.test(value) ? 'Please enter a valid email address' : '',
                          }));
                        }}
                        error={pocErrors.relationshipEmail || (requiredErrors.relationshipPoc && !formData.relationshipPocId ? 'Email is required' : '')}
                      />
                      <Input
                        label="Relationship POC Phone"
                        placeholder="(XXX) XXX-XXXX"
                        value={formData.relationshipPocPhone}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData({ ...formData, relationshipPocPhone: value });
                          setPocErrors((prev) => ({
                            ...prev,
                            relationshipPhone: value && !PHONE_PATTERN.test(value) ? 'Use format (XXX) XXX-XXXX' : '',
                          }));
                        }}
                        helperText="Format: (XXX) XXX-XXXX"
                        error={pocErrors.relationshipPhone}
                      />
                      <Input
                        label="Relationship POC Fax"
                        placeholder="(XXX) XXX-XXXX"
                        value={formData.relationshipPocFax}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData({ ...formData, relationshipPocFax: value });
                          setPocErrors((prev) => ({
                            ...prev,
                            relationshipFax: value && !PHONE_PATTERN.test(value) ? 'Use format (XXX) XXX-XXXX' : '',
                          }));
                        }}
                        helperText="Format: (XXX) XXX-XXXX"
                        error={pocErrors.relationshipFax}
                      />
                    </div>

                    <div className="relative">
                      <Input
                        label="Contracts POC (Contract Administration)"
                        placeholder="Search for contract admin (optional)..."
                        helperText="Handles contract-related matters and legal documentation"
                        value={formData.contractsPocName}
                        onChange={(e) => {
                          setFormData({ ...formData, contractsPocName: e.target.value, contractsPocId: '' });
                          handleContactSearch(e.target.value, 'contracts');
                        }}
                      />
                      {activePocField === 'contracts' && !formData.contractsPocId && formData.contractsPocName && formData.contractsPocName.length >= 2 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-[var(--color-border)] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {contactSuggestions.map((contact) => (
                            <button
                              key={contact.id}
                              onClick={() => {
                                // Story 9.14: Auto-fill phone from contact
                                const phone = contact.workPhone || contact.cellPhone || '';
                                setFormData({
                                  ...formData,
                                  contractsPocId: contact.id,
                                  contractsPocName: `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || contact.email,
                                  contractsPocEmail: contact.email || '',
                                  contractsPocPhone: phone,
                                });
                                setPocErrors((prev) => ({ ...prev, contractsEmail: '' }));
                                setContactSuggestions([]);
                              }}
                              className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                            >
                              <div className="font-medium">
                                {`${contact.firstName || ''} ${contact.lastName || ''}`.trim() || contact.email}
                              </div>
                              <div className="text-xs text-[var(--color-text-secondary)]">{contact.email}</div>
                            </button>
                          ))}
                          {/* Story H-1 Task 7: Create New Contact option */}
                          <button
                            onClick={() => openCreateContactModal('contracts')}
                            className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors border-t border-[var(--color-border)] flex items-center gap-2 text-[var(--color-primary)]"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Create New Contact</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Input
                        label="Contracts POC Email"
                        placeholder="name@example.com"
                        value={formData.contractsPocEmail}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData({ ...formData, contractsPocEmail: value });
                          setPocErrors((prev) => ({
                            ...prev,
                            contractsEmail: value && !EMAIL_PATTERN.test(value) ? 'Please enter a valid email address' : '',
                          }));
                        }}
                        error={pocErrors.contractsEmail}
                      />
                      <Input
                        label="Contracts POC Phone"
                        placeholder="(XXX) XXX-XXXX"
                        value={formData.contractsPocPhone}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData({ ...formData, contractsPocPhone: value });
                          setPocErrors((prev) => ({
                            ...prev,
                            contractsPhone: value && !PHONE_PATTERN.test(value) ? 'Use format (XXX) XXX-XXXX' : '',
                          }));
                        }}
                        helperText="Format: (XXX) XXX-XXXX"
                        error={pocErrors.contractsPhone}
                      />
                      <Input
                        label="Contracts POC Fax"
                        placeholder="(XXX) XXX-XXXX"
                        value={formData.contractsPocFax}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData({ ...formData, contractsPocFax: value });
                          setPocErrors((prev) => ({
                            ...prev,
                            contractsFax: value && !PHONE_PATTERN.test(value) ? 'Use format (XXX) XXX-XXXX' : '',
                          }));
                        }}
                        helperText="Format: (XXX) XXX-XXXX"
                        error={pocErrors.contractsFax}
                      />
                    </div>

                    <div className="relative">
                      <Input
                        label="Contacts POC (General Contact)"
                        placeholder="Search for general contact (optional)..."
                        helperText="Day-to-day administrative contact person"
                        value={formData.contactsPocName}
                        onChange={(e) => {
                          setFormData({ ...formData, contactsPocName: e.target.value, contactsPocId: '' });
                          handleContactSearch(e.target.value, 'contacts');
                        }}
                      />
                      {activePocField === 'contacts' && contactSuggestions.length > 0 && !formData.contactsPocId && formData.contactsPocName && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-[var(--color-border)] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {contactSuggestions.map((contact) => (
                            <button
                              key={contact.id}
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  contactsPocId: contact.id,
                                  contactsPocName: `${contact.firstName} ${contact.lastName}`.trim(),
                                });
                                setContactSuggestions([]);
                              }}
                              className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                            >
                              <div className="font-medium">
                                {contact.firstName} {contact.lastName}
                              </div>
                              <div className="text-xs text-[var(--color-text-secondary)]">{contact.email}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Story H-1 Task 6: Only show Copy button if Contracts POC is filled */}
                    {(formData.contractsPocName || formData.contractsPocEmail) && (
                      <div className="flex">
                        <Button
                          variant="subtle"
                          size="sm"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              relationshipPocId: formData.contractsPocId,
                              relationshipPocName: formData.contractsPocName,
                              relationshipPocEmail: formData.contractsPocEmail,
                              relationshipPocPhone: formData.contractsPocPhone,
                              relationshipPocFax: formData.contractsPocFax,
                            });
                            setPocErrors((prev) => ({
                              ...prev,
                              relationshipEmail: '',
                              relationshipPhone: '',
                              relationshipFax: '',
                            }));
                            toast.success('Copied Contracts POC to Relationship POC');
                          }}
                        >
                          Copy to Relationship POC
                        </Button>
                      </div>
                    )}

                    <div className="relative">
                      <Input
                        label="Opportunity POC (Business Opportunity)"
                        placeholder="Search for opportunity lead (optional)..."
                        helperText="Leads the business opportunity or proposal"
                        value={formData.opportunityPocName}
                        onChange={(e) => {
                          setFormData({ ...formData, opportunityPocName: e.target.value, opportunityPocId: '' });
                          handleContactSearch(e.target.value, 'opportunity');
                        }}
                      />
                      {activePocField === 'opportunity' && contactSuggestions.length > 0 && !formData.opportunityPocId && formData.opportunityPocName && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-[var(--color-border)] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {contactSuggestions.map((contact) => (
                            <button
                              key={contact.id}
                              onClick={() => {
                                // Story 9.14: Auto-fill phone from contact
                                const phone = contact.workPhone || contact.cellPhone || '';
                                setFormData({
                                  ...formData,
                                  opportunityPocId: contact.id,
                                  opportunityPocName: `${contact.firstName} ${contact.lastName}`,
                                  opportunityPocPhone: phone,
                                });
                                setContactSuggestions([]);
                              }}
                              className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm">
                                    {contact.firstName} {contact.lastName}
                                  </div>
                                  <div className="text-xs text-[var(--color-text-secondary)] truncate">
                                    {contact.email}
                                  </div>
                                  {contact.jobTitle && (
                                    <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                                      {contact.jobTitle}
                                    </div>
                                  )}
                                </div>
                                {contact.isInternal && (
                                  <Badge variant="info" className="text-xs flex-shrink-0">Internal</Badge>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Step 3: Review and Submit */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h2>Review and submit</h2>

                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="mb-3">NDA summary</h3>
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <dt className="text-[var(--color-text-secondary)] mb-1">Abbreviated name</dt>
                        <dd>{formData.abbreviatedName || '-'}</dd>
                      </div>
                      <div>
                        <dt className="text-[var(--color-text-secondary)] mb-1">USmax position</dt>
                        <dd>
                          <Badge variant="info">{formData.usMaxPosition ? usMaxPositionLabels[formData.usMaxPosition] : '-'}</Badge>
                          {formData.isNonUsMax && (
                            <Badge variant="warning" className="ml-2">
                              Non-USMAX
                            </Badge>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[var(--color-text-secondary)] mb-1">NDA type</dt>
                        <dd>{ndaTypes.find((t) => t.value === formData.ndaType)?.label || formData.ndaType}</dd>
                      </div>
                      <div>
                        <dt className="text-[var(--color-text-secondary)] mb-1">Company</dt>
                        <dd>{formData.companyName || '-'}</dd>
                      </div>
                      <div>
                        <dt className="text-[var(--color-text-secondary)] mb-1">Location</dt>
                        <dd>
                          {formData.companyCity && formData.companyState
                            ? `${formData.companyCity}, ${formData.companyState}`
                            : formData.companyCity || formData.companyState || '-'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[var(--color-text-secondary)] mb-1">Agency</dt>
                        <dd>
                          {agencyGroups.find((ag) => ag.id === formData.agencyGroupId)?.name || '-'}
                          {formData.subagencyId && (
                            <span className="text-[var(--color-text-secondary)]">
                              {' / '}
                              {subagencies.find((s) => s.id === formData.subagencyId)?.name}
                            </span>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[var(--color-text-secondary)] mb-1">Effective date</dt>
                        <dd>{formData.effectiveDate || 'Today'}</dd>
                      </div>
                      <div className="md:col-span-2">
                        <dt className="text-[var(--color-text-secondary)] mb-1">Authorized purpose</dt>
                        <dd>{formData.authorizedPurpose || '-'}</dd>
                      </div>
                      <div>
                        <dt className="text-[var(--color-text-secondary)] mb-1">Relationship POC</dt>
                        <dd>{formData.relationshipPocName || '-'}</dd>
                      </div>
                      {formData.contractsPocName && (
                        <div>
                          <dt className="text-[var(--color-text-secondary)] mb-1">Contracts POC</dt>
                          <dd>{formData.contractsPocName}</dd>
                        </div>
                      )}
                      {formData.contactsPocName && (
                        <div>
                          <dt className="text-[var(--color-text-secondary)] mb-1">Contacts POC</dt>
                          <dd>{formData.contactsPocName}</dd>
                        </div>
                      )}
                      {formData.opportunityPocName && (
                        <div>
                          <dt className="text-[var(--color-text-secondary)] mb-1">Opportunity POC</dt>
                          <dd>{formData.opportunityPocName}</dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  {/* Document Preview - Auto-loads */}
                  {formData.rtfTemplateId && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg overflow-hidden">
                      <div className="p-4 flex items-start justify-between border-b border-blue-300">
                        <div>
                          <h3 className="font-semibold text-blue-900 mb-1">Your NDA Document</h3>
                          <p className="text-sm text-blue-800">
                            {showInlinePreview ? 'Review the document below. Edit if needed after creating the NDA.' : 'Loading document with your information...'}
                          </p>
                        </div>
                        <FileText className="w-8 h-8 text-blue-600" />
                      </div>

                      {isPreviewingDocument && !showInlinePreview ? (
                        <div className="p-8 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
                          <p className="ml-3 text-[var(--color-text-secondary)]">Generating document...</p>
                        </div>
                      ) : showInlinePreview ? (
                        <div className="space-y-3">
                          {/* Inline Preview */}
                          <div className="bg-white border-2 border-blue-300 rounded-lg overflow-hidden">
                            <div className="bg-blue-100 px-4 py-2 flex items-center justify-between border-b border-blue-300">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-700" />
                                <span className="text-sm font-medium text-blue-900">
                                  {templates.find(t => t.id === formData.rtfTemplateId)?.name || 'NDA Document'}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="subtle"
                                  size="sm"
                                  onClick={() => previewUrl && window.open(previewUrl, '_blank')}
                                >
                                  Open in New Tab
                                </Button>
                                <Button
                                  variant="subtle"
                                  size="sm"
                                  onClick={() => {
                                    setShowInlinePreview(false);
                                    setPreviewUrl(null);
                                    setPreviewHtml(null);
                                  }}
                                >
                                  Close Preview
                                </Button>
                              </div>
                            </div>
                            <div
                              className="relative bg-white border border-gray-200 rounded overflow-y-auto overflow-x-hidden"
                              style={{ height: '600px', maxHeight: '600px' }}
                            >
                              {previewHtml ? (
                                <div
                                  className="p-8 prose prose-sm max-w-none"
                                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                                  style={{
                                    fontFamily: 'Georgia, serif',
                                    lineHeight: '1.6',
                                    color: '#1a1a1a',
                                    minHeight: '100%'
                                  }}
                                />
                              ) : (
                                <div className="flex items-center justify-center h-full">
                                  <div className="text-center max-w-md p-6">
                                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                    <p className="text-sm text-gray-600 mb-3">
                                      HTML preview not available. Click "Open in New Tab" to view the full RTF document.
                                    </p>
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      onClick={() => previewUrl && window.open(previewUrl, '_blank')}
                                    >
                                      Open in New Tab
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="secondary"
                            icon={<Eye className="w-4 h-4" />}
                            onClick={handlePreviewDocument}
                            disabled={isPreviewingDocument}
                            size="sm"
                          >
                            Regenerate Preview
                          </Button>
                        </div>
                      ) : (
                        <div className="p-8 text-center">
                          <p className="text-sm text-blue-800 mb-3">
                            Complete the required fields above, then the document will load automatically.
                          </p>
                          <Button
                            variant="secondary"
                            icon={<Eye className="w-4 h-4" />}
                            onClick={handlePreviewDocument}
                            disabled={!canCreateDraft() || isPreviewingDocument}
                          >
                            {isPreviewingDocument ? 'Loading...' : 'Load Document Now'}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm">
                      <Info className="inline w-4 h-4 mr-1" />
                      {ndaId
                        ? 'This NDA will be updated with the information provided above.'
                        : draftId
                          ? 'Your draft NDA will be finalized and moved to the active NDAs list.'
                          : 'A new NDA will be created with the information provided above. You can generate and email the document after creation.'}
                    </p>
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.confirmed}
                      onChange={(e) => setFormData({ ...formData, confirmed: e.target.checked })}
                      className="mt-1 w-4 h-4 rounded"
                    />
                    <span className="text-sm">
                      I confirm that the information provided is accurate and complete, and I have the authority to
                      {ndaId ? ' update' : ' create'} this NDA on behalf of my organization.
                    </span>
                  </label>
                </div>
              </div>
            )}
            
            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-[var(--color-border)]">
              <div>
                {currentStep > 1 && (
                  <Button
                    variant="subtle"
                    icon={<ArrowLeft className="w-4 h-4" />}
                    onClick={() => setCurrentStep(currentStep - 1)}
                    disabled={isSubmitting}
                  >
                    Back
                  </Button>
                )}
                {isAutoSaving && (
                  <span className="ml-3 text-xs text-[var(--color-text-secondary)]">Auto-saving…</span>
                )}
              </div>

              <div className="flex gap-2">
                {!ndaId && (
                  <Button
                    variant="outline"
                    onClick={handleSaveDraft}
                    disabled={isSubmitting || !canCreateDraft()}
                  >
                    Save as Draft
                  </Button>
                )}
                <Button variant="secondary" onClick={() => navigate('/requests')} disabled={isSubmitting}>
                  Cancel
                </Button>
                {currentStep < 3 ? (
                  <Button
                    variant="primary"
                    icon={<ArrowRight className="w-4 h-4" />}
                    disabled={!canProceed() || isSubmitting}
                    onClick={() => setCurrentStep(currentStep + 1)}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    disabled={!canProceed() || isSubmitting}
                    onClick={handleSubmit}
                  >
                    {isSubmitting ? 'Saving...' : ndaId ? 'Save changes' : cloneSource ? 'Create cloned NDA' : 'Create NDA'}
                  </Button>
                )}
              </div>
            </div>
          </Card>

      {/* Inline collapsible help section */}
      <Card className="mt-4">
        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
          className="w-full flex items-center justify-between text-left hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[var(--color-primary)]" />
            <h3 className="text-base font-medium">Help & guidance</h3>
          </div>
          {showHelp ? (
            <ChevronUp className="w-5 h-5 text-[var(--color-text-secondary)]" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[var(--color-text-secondary)]" />
          )}
        </button>

        {showHelp && (
          <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                {currentStep === 1 && (
                  <div className="text-sm text-[var(--color-text-secondary)] space-y-2">
                    <p>Enter the basic details for your NDA:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>
                        <strong>Abbreviated name:</strong> A short, memorable name for quick reference
                      </li>
                      <li>
                        <strong>Authorized purpose:</strong> Clearly describe the business purpose
                      </li>
                      <li>
                        <strong>USmax position:</strong> Your organization's role in the relationship
                      </li>
                      <li>
                        <strong>Effective date:</strong> When the NDA becomes active (defaults to today)
                      </li>
                    </ul>
                  </div>
                )}
                {currentStep === 2 && (
                  <div className="text-sm text-[var(--color-text-secondary)] space-y-2">
                    <p>Provide company and organizational details:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Start typing the company name for auto-suggestions</li>
                      <li>Previous details may be auto-filled if company exists</li>
                      <li>Select the appropriate agency and subagency</li>
                      <li>Assign points of contact for relationship management</li>
                    </ul>
                  </div>
                )}
                {currentStep === 3 && (
                  <div className="text-sm text-[var(--color-text-secondary)] space-y-2">
                    <p>Before {ndaId ? 'saving changes' : 'creating the NDA'}:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Review all information for accuracy</li>
                      <li>Verify company and agency details are correct</li>
                      <li>Confirm points of contact are properly assigned</li>
                      <li>Ensure you have proper authorization</li>
                    </ul>
                  </div>
                )}
          </div>
        )}
      </Card>

      {/* Story H-1 Task 7: Create Contact Modal */}
      <Dialog open={showCreateContactModal} onOpenChange={setShowCreateContactModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Contact</DialogTitle>
            <DialogDescription>
              Add a new external contact for{' '}
              {createContactPocType === 'relationship' ? 'Relationship POC' :
               createContactPocType === 'contracts' ? 'Contracts POC' :
               createContactPocType === 'contacts' ? 'Contacts POC' : 'POC'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name *"
                placeholder="First name"
                value={createContactForm.firstName}
                onChange={(e) => {
                  setCreateContactForm((prev) => ({ ...prev, firstName: e.target.value }));
                  setCreateContactErrors((prev) => ({ ...prev, firstName: '' }));
                }}
                error={createContactErrors.firstName}
              />
              <Input
                label="Last Name *"
                placeholder="Last name"
                value={createContactForm.lastName}
                onChange={(e) => {
                  setCreateContactForm((prev) => ({ ...prev, lastName: e.target.value }));
                  setCreateContactErrors((prev) => ({ ...prev, lastName: '' }));
                }}
                error={createContactErrors.lastName}
              />
            </div>
            <Input
              label="Email *"
              placeholder="email@example.com"
              value={createContactForm.email}
              onChange={(e) => {
                setCreateContactForm((prev) => ({ ...prev, email: e.target.value }));
                setCreateContactErrors((prev) => ({ ...prev, email: '' }));
              }}
              error={createContactErrors.email}
            />
            <Input
              label="Phone"
              placeholder="(XXX) XXX-XXXX (optional)"
              value={createContactForm.phone}
              onChange={(e) => {
                const formatted = formatPhoneNumber(e.target.value);
                setCreateContactForm((prev) => ({ ...prev, phone: formatted }));
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateContactModal(false)}
              disabled={isCreatingContact}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateContact} disabled={isCreatingContact}>
              {isCreatingContact ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Contact'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
