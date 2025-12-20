import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/AppCard';
import { Button } from '../ui/AppButton';
import { Input, TextArea, Select } from '../ui/AppInput';
import { Stepper } from '../ui/Stepper';
import { Badge } from '../ui/AppBadge';
import { ArrowLeft, ArrowRight, Info, AlertTriangle } from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import type { NDAType, InformationType, RiskLevel } from '../../types';
import { toast } from 'sonner';
import {
  getNDA,
  createNDA,
  updateNDA,
  searchCompanies,
  getCompanyDefaults,
  type CreateNdaData,
  type UpdateNdaData,
  type UsMaxPosition,
} from '../../client/services/ndaService';
import {
  listAgencyGroups,
  listSubagencies,
  type AgencyGroup,
  type Subagency,
} from '../../client/services/agencyService';
import {
  searchContacts,
  type Contact,
} from '../../client/services/userService';

const ndaTypes: { value: NDAType; label: string; description: string }[] = [
  { value: 'Mutual', label: 'Mutual', description: 'Both parties will exchange confidential information' },
  { value: 'One-way government disclosing', label: 'One-way (Government Disclosing)', description: 'Government shares information with counterparty' },
  { value: 'One-way counterparty disclosing', label: 'One-way (Counterparty Disclosing)', description: 'Counterparty shares information with government' },
  { value: 'Visitor', label: 'Visitor', description: 'For facility visitors and short-term access' },
  { value: 'Research', label: 'Research', description: 'Academic or research collaborations' },
  { value: 'Vendor access', label: 'Vendor Access', description: 'For vendors accessing systems or data' }
];

const informationTypes: InformationType[] = [
  'PII',
  'Financial data',
  'Technical data',
  'Source code',
  'Facility access',
  'Other'
];

export function RequestWizard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: ndaId } = useParams<{ id: string }>();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dropdown data
  const [agencyGroups, setAgencyGroups] = useState<AgencyGroup[]>([]);
  const [subagencies, setSubagencies] = useState<Subagency[]>([]);
  const [companySuggestions, setCompanySuggestions] = useState<string[]>([]);
  const [contactSuggestions, setContactSuggestions] = useState<Contact[]>([]);

  // Form state - map backend fields to form fields
  const [formData, setFormData] = useState({
    companyName: '',
    companyCity: '',
    companyState: '',
    stateOfIncorporation: '',
    agencyGroupId: '',
    subagencyId: '',
    agencyOfficeName: '',
    abbreviatedName: '',
    authorizedPurpose: '',
    effectiveDate: '',
    usMaxPosition: '' as UsMaxPosition | '',
    isNonUsMax: false,
    opportunityPocId: '',
    opportunityPocName: '',
    contractsPocId: '',
    contractsPocName: '',
    relationshipPocId: '',
    relationshipPocName: '',
    systemInput: '',
    confirmed: false,
  });
  
  const steps = [
    { label: 'Basic details', description: 'Request information' },
    { label: 'Company and agency', description: 'Organization details' },
    { label: 'Review and submit', description: 'Final confirmation' }
  ];

  // Load existing NDA if editing
  useEffect(() => {
    if (ndaId) {
      setIsLoading(true);
      getNDA(ndaId)
        .then((nda) => {
          setFormData({
            companyName: nda.companyName,
            companyCity: nda.companyCity || '',
            companyState: nda.companyState || '',
            stateOfIncorporation: nda.stateOfIncorporation || '',
            agencyGroupId: nda.agencyGroup.id,
            subagencyId: nda.subagency?.id || '',
            agencyOfficeName: nda.agencyOfficeName || '',
            abbreviatedName: nda.abbreviatedName,
            authorizedPurpose: nda.authorizedPurpose,
            effectiveDate: nda.effectiveDate || '',
            usMaxPosition: nda.usMaxPosition,
            isNonUsMax: nda.isNonUsMax,
            opportunityPocId: nda.opportunityPoc?.id || '',
            opportunityPocName: nda.opportunityPoc
              ? `${nda.opportunityPoc.firstName} ${nda.opportunityPoc.lastName}`
              : '',
            contractsPocId: nda.contractsPoc?.id || '',
            contractsPocName: nda.contractsPoc
              ? `${nda.contractsPoc.firstName} ${nda.contractsPoc.lastName}`
              : '',
            relationshipPocId: nda.relationshipPoc.id,
            relationshipPocName: `${nda.relationshipPoc.firstName} ${nda.relationshipPoc.lastName}`,
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
    }
  }, [ndaId, navigate]);

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

  // Debounced company search
  const handleCompanySearch = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setCompanySuggestions([]);
        return;
      }

      try {
        const response = await searchCompanies(query);
        setCompanySuggestions(response.companies.map((c) => c.name));
      } catch (err) {
        console.error('Failed to search companies:', err);
      }
    },
    []
  );

  // Load company defaults when company is selected
  const handleCompanySelect = useCallback(async (companyName: string) => {
    setFormData((prev) => ({ ...prev, companyName }));

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

  // Debounced contact search
  const handleContactSearch = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setContactSuggestions([]);
        return;
      }

      try {
        const response = await searchContacts(query, 'all');
        setContactSuggestions(response.contacts);
      } catch (err) {
        console.error('Failed to search contacts:', err);
      }
    },
    []
  );
  
  const canProceed = () => {
    if (currentStep === 1) {
      return (
        formData.abbreviatedName &&
        formData.authorizedPurpose &&
        formData.usMaxPosition
      );
    }
    if (currentStep === 2) {
      return (
        formData.companyName &&
        formData.agencyGroupId &&
        formData.relationshipPocId
      );
    }
    if (currentStep === 3) {
      return formData.confirmed;
    }
    return false;
  };

  const handleSubmit = async () => {
    if (!canProceed()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: CreateNdaData | UpdateNdaData = {
        companyName: formData.companyName,
        agencyGroupId: formData.agencyGroupId,
        subagencyId: formData.subagencyId || undefined,
        agencyOfficeName: formData.agencyOfficeName || undefined,
        abbreviatedName: formData.abbreviatedName,
        authorizedPurpose: formData.authorizedPurpose,
        effectiveDate: formData.effectiveDate || undefined,
        usMaxPosition: formData.usMaxPosition as UsMaxPosition,
        isNonUsMax: formData.isNonUsMax,
        opportunityPocId: formData.opportunityPocId || undefined,
        contractsPocId: formData.contractsPocId || undefined,
        relationshipPocId: formData.relationshipPocId,
        companyCity: formData.companyCity || undefined,
        companyState: formData.companyState || undefined,
        stateOfIncorporation: formData.stateOfIncorporation || undefined,
      };

      if (ndaId) {
        // Update existing NDA
        const response = await updateNDA(ndaId, payload as UpdateNdaData);
        toast.success('NDA updated successfully!');
        navigate(`/requests/${ndaId}`);
      } else {
        // Create new NDA
        const response = await createNDA(payload as CreateNdaData);
        toast.success('NDA created successfully!');
        // Extract NDA ID from response
        const newNdaId = (response.nda as any)?.id;
        if (newNdaId) {
          navigate(`/requests/${newNdaId}`);
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
      </div>
      
      {/* Mobile-friendly stepper with horizontal scroll */}
      <div className="mb-6 md:mb-8 overflow-x-auto">
        <Stepper steps={steps} currentStep={currentStep} className="min-w-max md:min-w-0" />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2">
          <Card>
            {/* Step 1: Basic Details */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2>Basic details</h2>

                <Input
                  label="Abbreviated name *"
                  placeholder="e.g., TechCorp Integration"
                  value={formData.abbreviatedName}
                  onChange={(e) => setFormData({ ...formData, abbreviatedName: e.target.value })}
                  helperText="Short name for this NDA"
                />

                <TextArea
                  label="Authorized purpose *"
                  placeholder="Describe the authorized purpose of this NDA and the project context"
                  rows={4}
                  value={formData.authorizedPurpose}
                  onChange={(e) => setFormData({ ...formData, authorizedPurpose: e.target.value })}
                />

                <div>
                  <label className="block text-sm mb-3 text-[var(--color-text-primary)]">
                    USMAX position *
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {(['PRIME', 'SUB', 'TEAMING', 'OTHER'] as UsMaxPosition[]).map((position) => (
                      <button
                        key={position}
                        onClick={() => setFormData({ ...formData, usMaxPosition: position })}
                        className={`p-3 border-2 rounded-lg text-center transition-all ${
                          formData.usMaxPosition === position
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                            : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)]'
                        }`}
                      >
                        <p className="text-sm font-medium">{position}</p>
                      </button>
                    ))}
                  </div>
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
                    }}
                    onBlur={() => {
                      if (formData.companyName && companySuggestions.includes(formData.companyName)) {
                        handleCompanySelect(formData.companyName);
                      }
                    }}
                  />
                  {companySuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-[var(--color-border)] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {companySuggestions.map((company) => (
                        <button
                          key={company}
                          onClick={() => {
                            handleCompanySelect(company);
                            setCompanySuggestions([]);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                        >
                          {company}
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
                      setFormData({ ...formData, agencyGroupId: e.target.value, subagencyId: '' });
                    }}
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

                <div className="border-t border-[var(--color-border)] pt-6">
                  <h3 className="mb-4">Points of contact</h3>

                  <div className="space-y-4">
                    <div className="relative">
                      <Input
                        label="Relationship POC *"
                        placeholder="Search for contact..."
                        value={formData.relationshipPocName}
                        onChange={(e) => {
                          setFormData({ ...formData, relationshipPocName: e.target.value, relationshipPocId: '' });
                          handleContactSearch(e.target.value);
                        }}
                        helperText="Required: Primary relationship point of contact"
                      />
                      {contactSuggestions.length > 0 && !formData.relationshipPocId && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-[var(--color-border)] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {contactSuggestions.map((contact) => (
                            <button
                              key={contact.id}
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  relationshipPocId: contact.id,
                                  relationshipPocName: `${contact.firstName} ${contact.lastName}`,
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

                    <div className="relative">
                      <Input
                        label="Contracts POC"
                        placeholder="Search for contact (optional)..."
                        value={formData.contractsPocName}
                        onChange={(e) => {
                          setFormData({ ...formData, contractsPocName: e.target.value, contractsPocId: '' });
                          handleContactSearch(e.target.value);
                        }}
                      />
                      {contactSuggestions.length > 0 && !formData.contractsPocId && formData.contractsPocName && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-[var(--color-border)] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {contactSuggestions.map((contact) => (
                            <button
                              key={contact.id}
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  contractsPocId: contact.id,
                                  contractsPocName: `${contact.firstName} ${contact.lastName}`,
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

                    <div className="relative">
                      <Input
                        label="Opportunity POC"
                        placeholder="Search for contact (optional)..."
                        value={formData.opportunityPocName}
                        onChange={(e) => {
                          setFormData({ ...formData, opportunityPocName: e.target.value, opportunityPocId: '' });
                          handleContactSearch(e.target.value);
                        }}
                      />
                      {contactSuggestions.length > 0 && !formData.opportunityPocId && formData.opportunityPocName && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-[var(--color-border)] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {contactSuggestions.map((contact) => (
                            <button
                              key={contact.id}
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  opportunityPocId: contact.id,
                                  opportunityPocName: `${contact.firstName} ${contact.lastName}`,
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
                        <dt className="text-[var(--color-text-secondary)] mb-1">USMAX position</dt>
                        <dd>
                          <Badge variant="info">{formData.usMaxPosition}</Badge>
                          {formData.isNonUsMax && (
                            <Badge variant="warning" className="ml-2">
                              Non-USMAX
                            </Badge>
                          )}
                        </dd>
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
                      {formData.opportunityPocName && (
                        <div>
                          <dt className="text-[var(--color-text-secondary)] mb-1">Opportunity POC</dt>
                          <dd>{formData.opportunityPocName}</dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm">
                      <Info className="inline w-4 h-4 mr-1" />
                      {ndaId
                        ? 'This NDA will be updated with the information provided above.'
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
              </div>

              <div className="flex gap-2">
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
                    {isSubmitting ? 'Saving...' : ndaId ? 'Save changes' : 'Create NDA'}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
        
        {/* Right panel - Context and help */}
        <div>
          <Card>
            <div className="flex items-start gap-3 mb-4">
              <Info className="w-5 h-5 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="mb-2">Help & guidance</h3>
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
                        <strong>USMAX position:</strong> Your organization's role in the relationship
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
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}