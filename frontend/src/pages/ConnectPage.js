import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { churchAPI, visitorAPI } from '../lib/api';
import { getImageUrl, getFallbackImage } from '../lib/utils';
import { 
  User, Phone, MapPin, Mail, Send, CheckCircle2, 
  Sparkles, Heart, Church as ChurchIcon, Calendar, MessageCircleQuestion
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

const ConnectPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [church, setChurch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    heard_from: '',
    date_visited: new Date().toISOString().split('T')[0],
    pastor_request: false
  });

  useEffect(() => {
    const fetchChurch = async () => {
      try {
        const response = await churchAPI.getById(slug);
        setChurch(response.data);
      } catch (error) {
        console.error("Error fetching church:", error);
        toast.error("Church not found");
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    fetchChurch();
  }, [slug, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error("Please fill in your name");
      return;
    }
    if (!formData.phone && !formData.email) {
      toast.error("Please provide at least your phone number or email address");
      return;
    }

    // Phone number validation if provided
    if (formData.phone) {
      const cleanPhone = formData.phone.trim().replace(/[\s\-\(\)]/g, '');
      if (!/^\+?[0-9]{8,15}$/.test(cleanPhone)) {
        toast.error("Please enter a valid phone number (8 to 15 digits)");
        return;
      }
    }

    setSubmitting(true);
    try {
      await visitorAPI.submit(slug, formData);
      setSuccess(true);
      toast.success("Thank you for connecting!");
    } catch (error) {
      console.error("Connection error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-[#f5f3ff] to-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading check-in...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-[#f5f3ff] via-[#faf9ff] to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-10 text-center shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-100">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-3">Welcome to the family!</h1>
          <p className="text-slate-500 mb-8 leading-relaxed text-[15px] font-medium">
            We are so glad you joined us today at <strong className="text-brand">{church?.name}</strong>. Someone from our connection team will be delighted to reach out to you.
          </p>
          <Button 
            onClick={() => navigate('/')} 
            className="w-full bg-brand hover:bg-brand-hover text-white rounded-2xl h-14 font-bold shadow-lg shadow-brand/25 transition-all"
          >
            Explore More Churches
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#f5f3ff] via-[#faf9ff] to-white flex flex-col font-sans justify-between">
      
      {/* Centered Connection Card container */}
      <div className="flex-grow flex items-center justify-center p-4 md:py-12">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          
          {/* Brand header card banner */}
          <div className="relative h-44 overflow-hidden bg-slate-900">
            {church?.cover_image ? (
              <img 
                src={getImageUrl(church.cover_image)} 
                alt={church.name} 
                className="w-full h-full object-cover opacity-60" 
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-brand/80 to-purple-900"></div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
            
            {/* Logo ring overlapping */}
            <div className="absolute bottom-4 left-6 flex items-end gap-4 z-10">
              <div className="w-16 h-16 rounded-2xl border-2 border-white shadow-lg overflow-hidden bg-white flex items-center justify-center shrink-0">
                {church?.logo ? (
                  <img 
                    src={getImageUrl(church.logo)} 
                    alt="Logo" 
                    className="h-full w-full object-cover" 
                  />
                ) : (
                  <ChurchIcon className="h-7 w-7 text-brand" />
                )}
              </div>
              <div className="mb-1 text-left">
                <h1 className="text-lg font-black text-white leading-tight drop-shadow-sm">{church?.name}</h1>
                {church?.address_line1 && (
                  <p className="text-white/80 text-xs mt-0.5 flex items-center">
                    <MapPin className="h-3.5 w-3.5 mr-1 text-brand/80 shrink-0" />
                    {church.address_line1}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6 md:p-8">
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-8 h-8 bg-brand/10 rounded-lg flex items-center justify-center">
                <Heart className="h-4 w-4 text-brand fill-brand/20" />
              </div>
              <h2 className="text-md font-bold text-slate-800 tracking-tight">Visitor Check-in Form</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-brand transition-colors" />
                  <input 
                    type="text" 
                    required
                    className="w-full h-12 pl-11 pr-4 bg-slate-50/70 border border-slate-100 rounded-xl focus:bg-white focus:ring-4 focus:ring-purple-100 focus:border-brand outline-none transition-all text-slate-900 font-semibold placeholder:text-slate-300 text-sm"
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                  Phone Number <span className="text-brand/60 normal-case font-medium">(or email below)</span>
                </label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-brand transition-colors" />
                  <input 
                    type="tel"
                    className="w-full h-12 pl-11 pr-4 bg-slate-50/70 border border-slate-100 rounded-xl focus:bg-white focus:ring-4 focus:ring-purple-100 focus:border-brand outline-none transition-all text-slate-900 font-semibold placeholder:text-slate-300 text-sm"
                    placeholder="Enter your phone number"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                  Email <span className="text-brand/60 normal-case font-medium">(or phone above)</span>
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-brand transition-colors" />
                  <input 
                    type="email" 
                    className="w-full h-12 pl-11 pr-4 bg-slate-50/70 border border-slate-100 rounded-xl focus:bg-white focus:ring-4 focus:ring-purple-100 focus:border-brand outline-none transition-all text-slate-900 font-semibold placeholder:text-slate-300 text-sm"
                    placeholder="yourname@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Date Visited</label>
                <div className="relative group">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-brand transition-colors" />
                  <input 
                    type="date"
                    className="w-full h-12 pl-11 pr-4 bg-slate-50/70 border border-slate-100 rounded-xl focus:bg-white focus:ring-4 focus:ring-purple-100 focus:border-brand outline-none transition-all text-slate-900 font-semibold text-sm"
                    value={formData.date_visited}
                    onChange={(e) => setFormData({...formData, date_visited: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Where did you hear from us?</label>
                <div className="relative group">
                  <MessageCircleQuestion className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-brand transition-colors pointer-events-none" />
                  <select
                    className="w-full h-12 pl-11 pr-4 bg-slate-50/70 border border-slate-100 rounded-xl focus:bg-white focus:ring-4 focus:ring-purple-100 focus:border-brand outline-none transition-all text-slate-900 font-semibold text-sm appearance-none cursor-pointer"
                    value={formData.heard_from}
                    onChange={(e) => setFormData({...formData, heard_from: e.target.value})}
                  >
                    <option value="">Select an option...</option>
                    <option value="Friend / Family">Friend / Family</option>
                    <option value="Social Media">Social Media</option>
                    <option value="Google Search">Google Search</option>
                    <option value="Church Navigator App">Church Navigator App</option>
                    <option value="Flyer / Banner">Flyer / Banner</option>
                    <option value="Walk-in">Walk-in</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={submitting}
                className="w-full bg-gradient-to-r from-brand to-purple-600 hover:from-brand-hover hover:to-purple-700 text-white rounded-xl h-14 text-sm font-bold shadow-lg shadow-brand/25 transition-all flex items-center justify-center group mt-6"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    Connect & Check-in <Send className="ml-2 h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </>
                )}
              </Button>
            </form>
          </div>
          
          {/* Footer branding */}
          <div className="bg-slate-50 p-5 border-t border-slate-100 flex items-center justify-center space-x-2">
            <Sparkles className="h-4 w-4 text-brand/40" />
            <p className="text-[9px] text-slate-400 uppercase tracking-widest font-black">Powered by Church Navigator</p>
          </div>
        </div>
      </div>
      
      {/* Bottom badge */}
      <div className="pb-8 text-center">
        <p className="text-slate-400 text-[9px] uppercase tracking-widest font-black flex items-center justify-center gap-1">
          Secure & Verified Connection <CheckCircle2 className="h-3 w-3 text-green-500" />
        </p>
      </div>
    </div>
  );
};

export default ConnectPage;
