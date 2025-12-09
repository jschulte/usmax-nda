import React, { useState } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { Input, TextArea, Select } from './Input';
import { Badge } from './Badge';
import { Check, ChevronLeft, Info } from 'lucide-react';

interface RequestWizardProps {
  onClose: () => void;
  onSubmit: () => void;
}

export function RequestWizard({ onClose, onSubmit }: RequestWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    purpose: '',
    counterpartyOrg: '',
    counterpartyName: '',
    counterpartyEmail: '',
    ndaType: 'mutual',
    dataTypes: [] as string[],
    sensitivityLevel: 'medium',
    systems: '',
    riskLevel: 'medium'
  });

  const steps = [
    { number: 1, label: 'Basic Details' },
    { number: 2, label: 'Information & Risk' },
    { number: 3, label: 'Review & Submit' }
  ];

  const ndaTypes = [
    { value: 'mutual', label: 'Mutual NDA', description: 'Both parties share confidential information' },
    { value: 'one-way-gov', label: 'One-way (Gov Disclosing)', description: 'Government shares information only' },
    { value: 'one-way-counter', label: 'One-way (Counterparty Disclosing)', description: 'Counterparty shares information only' },
    { value: 'visitor', label: 'Visitor NDA', description: 'For facility visitors and short-term access' },
    { value: 'research', label: 'Research NDA', description: 'For research partnerships and collaborations' },
    { value: 'vendor', label: 'Vendor Access NDA', description: 'For vendor and contractor access' }
  ];

  const dataTypeOptions = [
    'PII',
    'Financial Data',
    'Technical Data',
    'Source Code',
    'Facility Access',
    'Strategic Plans',
    'Procurement Data',
    'Other'
  ];

  const toggleDataType = (type: string) => {
    setFormData(prev => ({
      ...prev,
      dataTypes: prev.dataTypes.includes(type)
        ? prev.dataTypes.filter(t => t !== type)
        : [...prev.dataTypes, type]
    }));
  };

  const calculateRiskLevel = () => {
    let score = 0;
    if (formData.sensitivityLevel === 'high') score += 2;
    if (formData.sensitivityLevel === 'medium') score += 1;
    if (formData.dataTypes.includes('PII')) score += 1;
    if (formData.dataTypes.includes('Financial Data')) score += 1;
    if (formData.dataTypes.includes('Source Code')) score += 1;
    
    if (score >= 3) return 'high';
    if (score >= 1) return 'medium';
    return 'low';
  };

  const handleNext = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = () => {
    onSubmit();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-4">
            <h2>Request New NDA</h2>
            <button onClick={onClose} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
              ✕
            </button>
          </div>
          
          {/* Stepper */}
          <div className="flex items-center gap-2">
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                    step.number < currentStep 
                      ? 'bg-[var(--color-primary)] text-white'
                      : step.number === currentStep
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {step.number < currentStep ? <Check size={16} /> : step.number}
                  </div>
                  <span className={`text-sm ${
                    step.number === currentStep ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'
                  }`}>
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-px ${
                    step.number < currentStep ? 'bg-[var(--color-primary)]' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentStep === 1 && (
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 space-y-4">
                <Input
                  label="Request Title"
                  placeholder="e.g., Vendor ABC - Cloud Services NDA"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
                
                <Input
                  label="Purpose or Project"
                  placeholder="e.g., Cloud migration project"
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                />
                
                <Input
                  label="Counterparty Organization Name"
                  placeholder="e.g., XYZ Corporation"
                  value={formData.counterpartyOrg}
                  onChange={(e) => setFormData({ ...formData, counterpartyOrg: e.target.value })}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Counterparty Contact Name"
                    placeholder="John Smith"
                    value={formData.counterpartyName}
                    onChange={(e) => setFormData({ ...formData, counterpartyName: e.target.value })}
                  />
                  <Input
                    label="Counterparty Email"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.counterpartyEmail}
                    onChange={(e) => setFormData({ ...formData, counterpartyEmail: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm text-[var(--color-text-primary)] mb-2 block">Type of NDA</label>
                  <div className="grid grid-cols-2 gap-3">
                    {ndaTypes.map((type) => (
                      <button
                        key={type.value}
                        onClick={() => setFormData({ ...formData, ndaType: type.value })}
                        className={`p-4 border rounded-lg text-left transition-all ${
                          formData.ndaType === type.value
                            ? 'border-[var(--color-primary)] bg-blue-50'
                            : 'border-[var(--color-border)] hover:border-gray-300'
                        }`}
                      >
                        <div className="text-sm mb-1">{type.label}</div>
                        <div className="text-xs text-[var(--color-text-secondary)]">{type.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="col-span-1">
                <Card className="bg-blue-50 border-blue-200">
                  <div className="flex gap-2 mb-2">
                    <Info size={18} className="text-blue-600 flex-shrink-0" />
                    <h4 className="text-sm text-blue-900">Template Selection</h4>
                  </div>
                  <p className="text-xs text-blue-800">
                    The default template will be chosen based on the NDA type and your department. You can review and modify the template in the next steps.
                  </p>
                </Card>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 space-y-4">
                <div>
                  <label className="text-sm text-[var(--color-text-primary)] mb-2 block">What will be shared?</label>
                  <div className="flex flex-wrap gap-2">
                    {dataTypeOptions.map((type) => (
                      <button
                        key={type}
                        onClick={() => toggleDataType(type)}
                        className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                          formData.dataTypes.includes(type)
                            ? 'bg-[var(--color-primary)] text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm text-[var(--color-text-primary)] mb-2 block">Sensitivity Level</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'low', label: 'Low', description: 'Public or minimally sensitive' },
                      { value: 'medium', label: 'Medium', description: 'Internal use, some sensitivity' },
                      { value: 'high', label: 'High', description: 'Highly confidential or restricted' }
                    ].map((level) => (
                      <button
                        key={level.value}
                        onClick={() => setFormData({ ...formData, sensitivityLevel: level.value })}
                        className={`p-4 border rounded-lg text-left transition-all ${
                          formData.sensitivityLevel === level.value
                            ? 'border-[var(--color-primary)] bg-blue-50'
                            : 'border-[var(--color-border)] hover:border-gray-300'
                        }`}
                      >
                        <div className="text-sm mb-1">{level.label}</div>
                        <div className="text-xs text-[var(--color-text-secondary)]">{level.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <TextArea
                  label="Systems or Locations Involved"
                  placeholder="Enter systems, databases, or physical locations (comma-separated)"
                  value={formData.systems}
                  onChange={(e) => setFormData({ ...formData, systems: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="col-span-1">
                <Card className="bg-amber-50 border-amber-200">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-sm">Risk Level Indicator</div>
                  </div>
                  <div className="flex items-center justify-center py-4">
                    <Badge color={calculateRiskLevel()} className="text-lg px-4 py-2">
                      {calculateRiskLevel().toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-amber-800 mt-3">
                    Based on your selections, this NDA is classified as {calculateRiskLevel()} risk. 
                    {calculateRiskLevel() === 'high' && ' Additional security review may be required.'}
                  </p>
                </Card>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <Card>
                <h3 className="mb-4">Review Your Request</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-[var(--color-text-secondary)]">Request Title</div>
                      <div className="text-sm mt-1">{formData.title || 'Not provided'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-[var(--color-text-secondary)]">Purpose</div>
                      <div className="text-sm mt-1">{formData.purpose || 'Not provided'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-[var(--color-text-secondary)]">Counterparty Organization</div>
                      <div className="text-sm mt-1">{formData.counterpartyOrg || 'Not provided'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-[var(--color-text-secondary)]">Contact</div>
                      <div className="text-sm mt-1">{formData.counterpartyName || 'Not provided'} ({formData.counterpartyEmail || 'N/A'})</div>
                    </div>
                    <div>
                      <div className="text-sm text-[var(--color-text-secondary)]">NDA Type</div>
                      <div className="text-sm mt-1">
                        <Badge color="mutual">{formData.ndaType}</Badge>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-[var(--color-text-secondary)]">Sensitivity Level</div>
                      <div className="text-sm mt-1">
                        <Badge color={formData.sensitivityLevel as any}>{formData.sensitivityLevel}</Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-[var(--color-text-secondary)]">Information Types</div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {formData.dataTypes.length > 0 ? (
                        formData.dataTypes.map(type => (
                          <Badge key={type} color="info">{type}</Badge>
                        ))
                      ) : (
                        <span className="text-sm text-[var(--color-text-secondary)]">None selected</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-[var(--color-text-secondary)]">Calculated Risk Level</div>
                    <div className="mt-1">
                      <Badge color={calculateRiskLevel()} className="text-sm">
                        {calculateRiskLevel().toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="bg-blue-50 border-blue-200">
                <div className="flex items-start gap-3">
                  <input type="checkbox" className="mt-1" />
                  <div>
                    <p className="text-sm">I confirm these details are accurate</p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                      By submitting this request, you confirm that the information provided is accurate and complete.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[var(--color-border)] flex items-center justify-between">
          <Button variant="secondary" onClick={currentStep === 1 ? onClose : handleBack}>
            <ChevronLeft size={16} />
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </Button>
          {currentStep < 3 ? (
            <Button onClick={handleNext}>
              Next
            </Button>
          ) : (
            <Button onClick={handleSubmit}>
              Submit for Legal Review
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
