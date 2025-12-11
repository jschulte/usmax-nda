import React, { useState } from 'react';
import { Card } from '../ui/AppCard';
import { Button } from '../ui/AppButton';
import { Input } from '../ui/AppInput';
import { useParams } from 'react-router-dom';
import { Badge } from '../ui/AppBadge';
import { Shield, CheckCircle, FileText, Calendar, Scale } from 'lucide-react';

export function ExternalSigningPortal() {
  const [currentStep, setCurrentStep] = useState(1);
  const [hasRead, setHasRead] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [signatureDate] = useState(new Date().toLocaleDateString());
  const [email] = useState('jane.smith@techcorp.com');
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const steps = [
    { label: 'Review', description: 'Read the agreement' },
    { label: 'Confirm details', description: 'Verify information' },
    { label: 'Sign', description: 'Complete signature' }
  ];
  
  const handleSign = () => {
    setIsSubmitted(true);
  };
  
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <Card className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-[var(--color-success)]" />
            </div>
            <h1 className="mb-4">Agreement signed successfully!</h1>
            <p className="text-[var(--color-text-secondary)] mb-8">
              Thank you for signing the confidentiality agreement. A copy has been sent to your email address.
            </p>
            
            <div className="p-6 bg-gray-50 rounded-lg text-left mb-8">
              <h3 className="mb-4">What happens next?</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-[var(--color-success)] flex-shrink-0 mt-0.5" />
                  <span>You will receive a fully executed copy via email within 24 hours</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-[var(--color-success)] flex-shrink-0 mt-0.5" />
                  <span>The agreement is now in effect and all parties are bound by its terms</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-[var(--color-success)] flex-shrink-0 mt-0.5" />
                  <span>Please retain this document for your records</span>
                </li>
              </ul>
            </div>
            
            <div className="flex items-center justify-center gap-3">
              <Button variant="primary">Download signed copy</Button>
              <Button variant="secondary">Close window</Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Header Banner */}
      <div className="bg-[var(--color-primary)] text-white py-6">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8" />
            <h1 className="text-white">Government Agency</h1>
          </div>
          <p className="text-blue-100">Confidentiality Agreement</p>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Stepper steps={steps} currentStep={currentStep} className="mb-8" />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-2">
            <Card>
              {/* Step 1: Review Document */}
              {currentStep === 1 && (
                <div>
                  <h2 className="mb-6">Review the agreement</h2>
                  
                  <div className="border border-[var(--color-border)] rounded-lg p-8 bg-gray-50 max-h-[600px] overflow-y-auto mb-6">
                    <div className="max-w-3xl mx-auto bg-white p-8 shadow-sm">
                      <div className="text-center mb-8">
                        <h2 className="mb-2">NON-DISCLOSURE AGREEMENT</h2>
                        <p className="text-sm text-[var(--color-text-secondary)]">(Mutual)</p>
                      </div>
                      
                      <div className="space-y-4 text-sm">
                        <p>This Non-Disclosure Agreement (the "Agreement") is entered into as of December 7, 2025, by and between:</p>
                        
                        <p><strong>Government Agency</strong> ("Government"), and</p>
                        <p><strong>TechCorp Solutions Inc.</strong> ("Counterparty")</p>
                        <p>Collectively referred to as the "Parties."</p>
                        
                        <div className="mt-6">
                          <p className="mb-2"><strong>1. PURPOSE</strong></p>
                          <p>The Parties wish to explore a business opportunity of mutual interest related to software integration project for citizen services portal. In connection with this opportunity, each Party may disclose to the other certain confidential technical and business information that the disclosing Party desires the receiving Party to treat as confidential.</p>
                        </div>
                        
                        <div className="mt-6">
                          <p className="mb-2"><strong>2. DEFINITION OF CONFIDENTIAL INFORMATION</strong></p>
                          <p>For purposes of this Agreement, "Confidential Information" means all information disclosed by one party (the "Disclosing Party") to the other party (the "Receiving Party"), whether orally or in writing, that is designated as confidential or that reasonably should be understood to be confidential given the nature of the information and the circumstances of disclosure.</p>
                        </div>
                        
                        <div className="mt-6">
                          <p className="mb-2"><strong>3. CONFIDENTIALITY OBLIGATIONS</strong></p>
                          <p>The Receiving Party agrees to:</p>
                          <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                            <li>Hold and maintain the Confidential Information in strict confidence</li>
                            <li>Not disclose the Confidential Information to third parties without prior written consent</li>
                            <li>Not use the Confidential Information except for the Purpose stated above</li>
                            <li>Protect the Confidential Information using the same degree of care used for its own confidential information</li>
                          </ul>
                        </div>
                        
                        <div className="mt-6">
                          <p className="mb-2"><strong>4. TERM</strong></p>
                          <p>This Agreement shall commence on the date first written above and shall continue for a period of one (1) year. The confidentiality obligations shall survive termination for a period of three (3) years.</p>
                        </div>
                        
                        <div className="mt-6">
                          <p className="mb-2"><strong>5. RETURN OF MATERIALS</strong></p>
                          <p>Upon request or termination of this Agreement, the Receiving Party shall promptly return or destroy all Confidential Information, including all copies, notes, and derivatives thereof.</p>
                        </div>
                        
                        <div className="mt-6">
                          <p className="mb-2"><strong>6. NO LICENSE</strong></p>
                          <p>Nothing in this Agreement grants any license or right to any intellectual property of either Party.</p>
                        </div>
                        
                        <div className="mt-6">
                          <p className="mb-2"><strong>7. GOVERNING LAW</strong></p>
                          <p>This Agreement shall be governed by and construed in accordance with applicable federal and state laws.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <label className="flex items-start gap-3 cursor-pointer p-4 border-2 border-[var(--color-border)] rounded-lg hover:border-[var(--color-primary)] transition-colors">
                    <input
                      type="checkbox"
                      checked={hasRead}
                      onChange={(e) => setHasRead(e.target.checked)}
                      className="mt-1 w-5 h-5 rounded"
                    />
                    <span className="text-sm">
                      I have read and understand the terms of this Non-Disclosure Agreement. I agree to be bound by its terms and conditions.
                    </span>
                  </label>
                  
                  <div className="flex justify-end mt-6">
                    <Button
                      variant="primary"
                      disabled={!hasRead}
                      onClick={() => setCurrentStep(2)}
                    >
                      Continue to confirm details
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Step 2: Confirm Details */}
              {currentStep === 2 && (
                <div>
                  <h2 className="mb-6">Confirm your details</h2>
                  
                  <div className="space-y-6">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm">
                        Please verify that the information below is correct before proceeding to sign.
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-[var(--color-text-secondary)] mb-1">Organization</p>
                      <p>TechCorp Solutions Inc.</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-[var(--color-text-secondary)] mb-1">Your name</p>
                      <p>Jane Smith</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-[var(--color-text-secondary)] mb-1">Email address</p>
                      <p>{email}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-[var(--color-text-secondary)] mb-1">Title/Role</p>
                      <p>Director of Partnerships</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-[var(--color-text-secondary)] mb-1">Date</p>
                      <p>{signatureDate}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-8 pt-6 border-t border-[var(--color-border)]">
                    <Button variant="subtle" onClick={() => setCurrentStep(1)}>
                      Back
                    </Button>
                    <Button variant="primary" onClick={() => setCurrentStep(3)}>
                      Continue to sign
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Step 3: Sign */}
              {currentStep === 3 && (
                <div>
                  <h2 className="mb-6">Complete your signature</h2>
                  
                  <div className="space-y-6">
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm">
                        By typing your name below, you are creating a legally binding electronic signature.
                      </p>
                    </div>
                    
                    <Input
                      label="Type your full name"
                      placeholder="Jane Smith"
                      value={signatureName}
                      onChange={(e) => setSignatureName(e.target.value)}
                    />
                    
                    {signatureName && (
                      <div className="p-6 border-2 border-[var(--color-border)] rounded-lg bg-white">
                        <p className="text-sm text-[var(--color-text-secondary)] mb-2">Signature preview:</p>
                        <p className="text-3xl font-serif text-[var(--color-primary)] mb-4">{signatureName}</p>
                        <div className="flex items-center gap-6 text-sm text-[var(--color-text-secondary)]">
                          <div>
                            <p className="mb-1">Date</p>
                            <p>{signatureDate}</p>
                          </div>
                          <div>
                            <p className="mb-1">Email</p>
                            <p>{email}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" className="mt-1 w-5 h-5 rounded" required />
                      <span className="text-sm">
                        I confirm that I am authorized to sign this agreement on behalf of TechCorp Solutions Inc. and that the information provided is accurate.
                      </span>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between mt-8 pt-6 border-t border-[var(--color-border)]">
                    <Button variant="subtle" onClick={() => setCurrentStep(2)}>
                      Back
                    </Button>
                    <Button
                      variant="primary"
                      disabled={!signatureName}
                      onClick={handleSign}
                    >
                      Sign and submit
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
          
          {/* Sidebar - Key Terms Summary */}
          <div>
            <Card>
              <h3 className="mb-4">Key terms</h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-[var(--color-text-secondary)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-[var(--color-text-secondary)] mb-1">Agreement type</p>
                    <Badge variant="type">Mutual NDA</Badge>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-[var(--color-text-secondary)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-[var(--color-text-secondary)] mb-1">Term</p>
                    <p className="text-sm">1 year</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-[var(--color-text-secondary)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-[var(--color-text-secondary)] mb-1">Survival period</p>
                    <p className="text-sm">3 years after termination</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Scale className="w-5 h-5 text-[var(--color-text-secondary)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-[var(--color-text-secondary)] mb-1">Governing law</p>
                    <p className="text-sm">Federal and state laws</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-[var(--color-border)]">
                <p className="text-xs text-[var(--color-text-muted)]">
                  Need help? Contact us at legal@government.gov
                </p>
              </div>
            </Card>
            
            <Card className="mt-6">
              <div className="flex items-start gap-3">
                <Shield className="w-6 h-6 text-[var(--color-primary)] flex-shrink-0" />
                <div>
                  <h4 className="mb-2">Secure signing</h4>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    This signature process is encrypted and secure. Your information is protected and the signed document will be legally binding.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}