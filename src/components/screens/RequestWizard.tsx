import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, TextArea, Select } from '../ui/Input';
import { Stepper } from '../ui/Stepper';
import { Badge } from '../ui/Badge';
import { ArrowLeft, ArrowRight, Info, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { NDAType, InformationType, RiskLevel } from '../../types';

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
  const [currentStep, setCurrentStep] = useState(1);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    purpose: '',
    counterpartyOrg: '',
    counterpartyContact: '',
    counterpartyEmail: '',
    ndaType: '' as NDAType | '',
    informationShared: [] as InformationType[],
    sensitivity: '' as RiskLevel | '',
    systems: [] as string[],
    systemInput: '',
    confirmed: false
  });
  
  const steps = [
    { label: 'Basic details', description: 'Request information' },
    { label: 'Information and risk', description: 'Data classification' },
    { label: 'Review and submit', description: 'Final confirmation' }
  ];
  
  const calculateRiskLevel = (): RiskLevel => {
    let riskScore = 0;
    
    // High-risk information types
    if (formData.informationShared.includes('PII')) riskScore += 2;
    if (formData.informationShared.includes('Financial data')) riskScore += 2;
    if (formData.informationShared.includes('Source code')) riskScore += 2;
    
    // Medium-risk information types
    if (formData.informationShared.includes('Technical data')) riskScore += 1;
    
    // Sensitivity level
    if (formData.sensitivity === 'High') riskScore += 3;
    if (formData.sensitivity === 'Medium') riskScore += 1;
    
    // Number of systems
    if (formData.systems.length > 2) riskScore += 1;
    
    if (riskScore >= 5) return 'High';
    if (riskScore >= 2) return 'Medium';
    return 'Low';
  };
  
  const toggleInformationType = (type: InformationType) => {
    setFormData(prev => ({
      ...prev,
      informationShared: prev.informationShared.includes(type)
        ? prev.informationShared.filter(t => t !== type)
        : [...prev.informationShared, type]
    }));
  };
  
  const addSystem = () => {
    if (formData.systemInput.trim() && !formData.systems.includes(formData.systemInput.trim())) {
      setFormData(prev => ({
        ...prev,
        systems: [...prev.systems, prev.systemInput.trim()],
        systemInput: ''
      }));
    }
  };
  
  const removeSystem = (system: string) => {
    setFormData(prev => ({
      ...prev,
      systems: prev.systems.filter(s => s !== system)
    }));
  };
  
  const canProceed = () => {
    if (currentStep === 1) {
      return formData.title && formData.purpose && formData.counterpartyOrg && 
             formData.counterpartyContact && formData.counterpartyEmail && formData.ndaType;
    }
    if (currentStep === 2) {
      return formData.informationShared.length > 0 && formData.sensitivity;
    }
    if (currentStep === 3) {
      return formData.confirmed;
    }
    return false;
  };
  
  const handleSubmit = () => {
    console.log('Submitting NDA request:', formData);
    navigate('/requests');
  };
  
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <Button 
          variant="subtle" 
          size="sm" 
          icon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate('/requests')}
          className="mb-4"
        >
          Back to requests
        </Button>
        <h1 className="mb-2">Request new NDA</h1>
        <p className="text-[var(--color-text-secondary)]">Complete the following steps to submit your NDA request</p>
      </div>
      
      <Stepper steps={steps} currentStep={currentStep} className="mb-8" />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            {/* Step 1: Basic Details */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2>Basic details</h2>
                
                <Input
                  label="Request title"
                  placeholder="e.g., TechCorp Software Integration NDA"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
                
                <TextArea
                  label="Purpose or project"
                  placeholder="Describe the purpose of this NDA and the project context"
                  rows={3}
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Counterparty organization name"
                    placeholder="e.g., TechCorp Solutions Inc."
                    value={formData.counterpartyOrg}
                    onChange={(e) => setFormData({ ...formData, counterpartyOrg: e.target.value })}
                  />
                  
                  <Input
                    label="Counterparty contact name"
                    placeholder="e.g., Jane Smith"
                    value={formData.counterpartyContact}
                    onChange={(e) => setFormData({ ...formData, counterpartyContact: e.target.value })}
                  />
                </div>
                
                <Input
                  label="Counterparty contact email"
                  type="email"
                  placeholder="jane.smith@example.com"
                  value={formData.counterpartyEmail}
                  onChange={(e) => setFormData({ ...formData, counterpartyEmail: e.target.value })}
                />
                
                <div>
                  <label className="block text-sm mb-3 text-[var(--color-text-primary)]">
                    Type of NDA
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {ndaTypes.map((type) => (
                      <button
                        key={type.value}
                        onClick={() => setFormData({ ...formData, ndaType: type.value })}
                        className={`p-4 border-2 rounded-lg text-left transition-all ${
                          formData.ndaType === type.value
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                            : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)]'
                        }`}
                      >
                        <p className="mb-1">{type.label}</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">{type.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Step 2: Information and Risk */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h2>Information and risk assessment</h2>
                
                <div>
                  <label className="block text-sm mb-3 text-[var(--color-text-primary)]">
                    What will be shared? (select all that apply)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {informationTypes.map((type) => (
                      <button
                        key={type}
                        onClick={() => toggleInformationType(type)}
                        className={`px-4 py-2 border rounded-full transition-all ${
                          formData.informationShared.includes(type)
                            ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                            : 'bg-white text-[var(--color-text-primary)] border-[var(--color-border)] hover:border-[var(--color-border-hover)]'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm mb-3 text-[var(--color-text-primary)]">
                    Sensitivity level
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {(['Low', 'Medium', 'High'] as RiskLevel[]).map((level) => (
                      <button
                        key={level}
                        onClick={() => setFormData({ ...formData, sensitivity: level })}
                        className={`p-4 border-2 rounded-lg text-left transition-all ${
                          formData.sensitivity === level
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                            : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)]'
                        }`}
                      >
                        <Badge variant="risk" risk={level} className="mb-2">{level}</Badge>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          {level === 'Low' && 'Public or internal use only'}
                          {level === 'Medium' && 'Sensitive business information'}
                          {level === 'High' && 'Highly confidential or regulated data'}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm mb-1.5 text-[var(--color-text-primary)]">
                    Systems or locations involved
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Enter system name and press Add"
                      value={formData.systemInput}
                      onChange={(e) => setFormData({ ...formData, systemInput: e.target.value })}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSystem())}
                      className="flex-1 px-3 py-2 border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                    />
                    <Button variant="secondary" onClick={addSystem}>Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.systems.map((system) => (
                      <span
                        key={system}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm"
                      >
                        {system}
                        <button
                          onClick={() => removeSystem(system)}
                          className="text-[var(--color-text-secondary)] hover:text-[var(--color-danger)]"
                        >
                          ×
                        </button>
                      </span>
                    ))}
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
                    <h3 className="mb-3">Request summary</h3>
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <dt className="text-[var(--color-text-secondary)] mb-1">Title</dt>
                        <dd>{formData.title}</dd>
                      </div>
                      <div>
                        <dt className="text-[var(--color-text-secondary)] mb-1">NDA Type</dt>
                        <dd><Badge variant="type">{formData.ndaType}</Badge></dd>
                      </div>
                      <div>
                        <dt className="text-[var(--color-text-secondary)] mb-1">Counterparty</dt>
                        <dd>{formData.counterpartyOrg}</dd>
                      </div>
                      <div>
                        <dt className="text-[var(--color-text-secondary)] mb-1">Contact</dt>
                        <dd>{formData.counterpartyContact} ({formData.counterpartyEmail})</dd>
                      </div>
                      <div>
                        <dt className="text-[var(--color-text-secondary)] mb-1">Sensitivity</dt>
                        <dd><Badge variant="risk" risk={formData.sensitivity as RiskLevel}>{formData.sensitivity}</Badge></dd>
                      </div>
                      <div>
                        <dt className="text-[var(--color-text-secondary)] mb-1">Information types</dt>
                        <dd className="flex flex-wrap gap-1">
                          {formData.informationShared.map(type => (
                            <Badge key={type} variant="info">{type}</Badge>
                          ))}
                        </dd>
                      </div>
                      <div className="md:col-span-2">
                        <dt className="text-[var(--color-text-secondary)] mb-1">Purpose</dt>
                        <dd>{formData.purpose}</dd>
                      </div>
                    </dl>
                  </div>
                  
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm">
                      <strong>Template:</strong> Based on your selections, the <strong>Standard {formData.ndaType} NDA</strong> template will be used.
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
                      I confirm that the information provided is accurate and complete, and I have the authority to request this NDA on behalf of my department.
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
                  >
                    Back
                  </Button>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => navigate('/requests')}>
                  Save as draft
                </Button>
                {currentStep < 3 ? (
                  <Button
                    variant="primary"
                    icon={<ArrowRight className="w-4 h-4" />}
                    disabled={!canProceed()}
                    onClick={() => setCurrentStep(currentStep + 1)}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    disabled={!canProceed()}
                    onClick={handleSubmit}
                  >
                    Submit for legal review
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
                    <p>Choose the NDA type that best matches your situation:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li><strong>Mutual:</strong> For partnerships where both parties share information</li>
                      <li><strong>One-way:</strong> When only one party discloses confidential data</li>
                      <li><strong>Visitor:</strong> For short-term facility access</li>
                    </ul>
                  </div>
                )}
                {currentStep === 2 && (
                  <div className="text-sm text-[var(--color-text-secondary)] space-y-2">
                    <p>Be specific about what information will be shared:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Select all types that apply</li>
                      <li>Higher sensitivity requires additional review</li>
                      <li>List all systems that may be accessed</li>
                    </ul>
                  </div>
                )}
                {currentStep === 3 && (
                  <div className="text-sm text-[var(--color-text-secondary)] space-y-2">
                    <p>Before submitting:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Review all information for accuracy</li>
                      <li>Ensure counterparty details are correct</li>
                      <li>Confirm you have proper authorization</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
            
            {currentStep === 2 && formData.informationShared.length > 0 && formData.sensitivity && (
              <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    calculateRiskLevel() === 'High' ? 'text-[var(--color-danger)]' :
                    calculateRiskLevel() === 'Medium' ? 'text-[var(--color-warning)]' :
                    'text-[var(--color-success)]'
                  }`} />
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm">Calculated risk level:</span>
                      <Badge variant="risk" risk={calculateRiskLevel()}>{calculateRiskLevel()}</Badge>
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {calculateRiskLevel() === 'High' && 'This NDA will require security review and additional approvals.'}
                      {calculateRiskLevel() === 'Medium' && 'Standard legal review process will apply.'}
                      {calculateRiskLevel() === 'Low' && 'Expedited review may be available.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
