import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import FileUpload from './FileUpload';
import { toast } from 'sonner';
import { claimAPI } from '../lib/api';
import { ShieldCheck, Mail, Phone, User, FileText, Send, AlertTriangle } from 'lucide-react';

const ClaimListingModal = ({ isOpen, onClose, listingId, listingType, listingName }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    message_to_admin: '',
    proof_documents: [],
    website_url: '' // Honeypot field
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFilesUpload = (urls) => {
    setFormData(prev => ({ ...prev, proof_documents: urls }));
  };

  const validateStep1 = () => {
    if (!formData.contact_name || !formData.contact_email || !formData.contact_phone) {
      toast.error('Please fill in all contact details');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (formData.proof_documents.length === 0) {
      toast.error('Please upload at least one proof document');
      return;
    }

    setLoading(true);
    try {
      await claimAPI.submit({
        listing_id: listingId,
        listing_type: listingType,
        ...formData
      });
      toast.success('Claim request submitted successfully! Admin will review it shortly.');
      onClose();
      setStep(1);
      setFormData({
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        message_to_admin: '',
        proof_documents: [],
        website_url: ''
      });
    } catch (error) {
      console.error('Claim submission error:', error);
      toast.error(error.response?.data?.detail || 'Failed to submit claim request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-[#6c1cff] mb-2">
            <ShieldCheck className="h-6 w-6" />
            <DialogTitle className="text-xl">Claim Listing</DialogTitle>
          </div>
          <DialogDescription>
            You are claiming ownership of <span className="font-bold text-gray-900">{listingName}</span>. 
            Once approved, you will be able to manage this listing.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Progress Indicator */}
          <div className="flex items-center gap-2 mb-6">
            <div className={`h-2 flex-1 rounded-full ${step >= 1 ? 'bg-[#6c1cff]' : 'bg-gray-100'}`} />
            <div className={`h-2 flex-1 rounded-full ${step >= 2 ? 'bg-[#6c1cff]' : 'bg-gray-100'}`} />
          </div>

          {step === 1 ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-1">
                <label className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" /> Full Name
                </label>
                <Input 
                  name="contact_name"
                  placeholder="Your official name"
                  value={formData.contact_name}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" /> Email
                  </label>
                  <Input 
                    name="contact_email"
                    type="email"
                    placeholder="official@church.com"
                    value={formData.contact_email}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" /> Phone
                  </label>
                  <Input 
                    name="contact_phone"
                    placeholder="+91 98765 43210"
                    value={formData.contact_phone}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              
              {/* Honeypot Field */}
              <div className="hidden">
                <Input 
                  name="website_url"
                  tabIndex="-1"
                  autoComplete="off"
                  value={formData.website_url}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-1">
                <label className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" /> Proof of Authority
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Please upload documents that prove you represent this listing (e.g., ID card, Letterhead, Utility bill).
                </p>
                <FileUpload 
                  category="verification"
                  onUploadComplete={(url) => handleFilesUpload([url])}
                  multiple={false}
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-sm font-medium">Message to Admin (Optional)</label>
                <Textarea 
                  name="message_to_admin"
                  placeholder="Provide any additional context for your claim..."
                  className="h-24 resize-none"
                  value={formData.message_to_admin}
                  onChange={handleInputChange}
                />
              </div>

              <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-800">
                  Submitting false claims may result in permanent suspension of your account.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {step === 1 ? (
            <>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button 
                onClick={() => validateStep1() && setStep(2)}
                className="bg-[#6c1cff] hover:bg-[#5a15e0]"
              >
                Next Step
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setStep(1)} disabled={loading}>Back</Button>
              <Button 
                onClick={handleSubmit}
                disabled={loading}
                className="bg-[#6c1cff] hover:bg-[#5a15e0] gap-2"
              >
                {loading ? 'Submitting...' : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit Claim
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ClaimListingModal;
