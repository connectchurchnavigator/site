import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { churchAPI, visitorAPI } from '../lib/api';
import { 
  User, Phone, MapPin, Mail, Send, CheckCircle2, 
  ChevronRight, Sparkles, Heart
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
    location: '',
    email: '',
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
    if (!formData.name || !formData.phone) {
      toast.error("Please fill in your name and phone number");
      return;
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-brand"></div>
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">We're glad you're here!</h1>
          <p className="text-slate-500 mb-8 leading-relaxed">
            Thank you for connecting with <strong>{church?.name}</strong>. Someone from our team will reach out to you soon.
          </p>
          <Button 
            onClick={() => navigate('/')} 
            className="w-full bg-brand hover:bg-brand-hover text-white rounded-2xl h-14 font-bold"
          >
            Explore More Churches
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
      {/* Dynamic Header */}
      <div className="relative h-64 overflow-hidden">
        {church?.cover_image ? (
          <img src={church.cover_image} alt={church.name} className="w-full h-full object-cover opacity-40" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-brand/20 to-slate-900"></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent"></div>
        
        <div className="absolute bottom-0 left-0 w-full p-8 text-center">
          {church?.logo && (
            <img src={church.logo} alt="Logo" className="w-20 h-20 rounded-2xl mx-auto mb-4 border-2 border-white/20 shadow-2xl bg-white" />
          )}
          <h1 className="text-3xl font-bold text-white tracking-tight">{church?.name}</h1>
          <p className="text-white/60 text-sm mt-1 flex items-center justify-center">
            <MapPin className="h-3 w-3 mr-1" /> {church?.city}, {church?.state}
          </p>
        </div>
      </div>

      {/* Connection Form */}
      <div className="flex-grow flex items-start justify-center p-4 -mt-6 relative z-10">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden">
          <div className="p-8 md:p-10">
            <div className="flex items-center space-x-2 mb-8">
              <div className="w-8 h-8 bg-brand/10 rounded-lg flex items-center justify-center">
                <Heart className="h-4 w-4 text-brand" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Connect with us</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-brand transition-colors" />
                  <input 
                    type="text" 
                    required
                    className="w-full h-14 pl-12 pr-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all text-slate-900 font-medium placeholder:text-slate-300"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-brand transition-colors" />
                  <input 
                    type="tel" 
                    required
                    className="w-full h-14 pl-12 pr-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all text-slate-900 font-medium placeholder:text-slate-300"
                    placeholder="+91 00000 00000"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Your Location</label>
                <div className="relative group">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-brand transition-colors" />
                  <input 
                    type="text" 
                    className="w-full h-14 pl-12 pr-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all text-slate-900 font-medium placeholder:text-slate-300"
                    placeholder="City or Neighborhood"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Email (Optional)</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-brand transition-colors" />
                  <input 
                    type="email" 
                    className="w-full h-14 pl-12 pr-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all text-slate-900 font-medium placeholder:text-slate-300"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-2 pb-4">
                <input 
                  type="checkbox" 
                  id="pastor_request"
                  className="w-5 h-5 rounded-lg border-slate-200 text-brand focus:ring-brand/20"
                  checked={formData.pastor_request}
                  onChange={(e) => setFormData({...formData, pastor_request: e.target.checked})}
                />
                <label htmlFor="pastor_request" className="text-sm font-medium text-slate-600 cursor-pointer">
                  I would like a call from the Pastor
                </label>
              </div>

              <Button 
                type="submit" 
                disabled={submitting}
                className="w-full bg-brand hover:bg-brand-hover text-white rounded-2xl h-16 text-base font-bold shadow-xl shadow-brand/20 transition-all flex items-center justify-center group"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    Send My Info <Send className="ml-2 h-4 w-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>
          </div>
          
          <div className="bg-slate-50 p-6 border-t border-slate-100 flex items-center justify-center space-x-2">
            <Sparkles className="h-4 w-4 text-brand/40" />
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Powered by Church Navigator</p>
          </div>
        </div>
      </div>
      
      <div className="py-10 text-center">
        <p className="text-white/20 text-[10px] uppercase tracking-widest font-bold flex items-center justify-center">
          Secure & Verified <CheckCircle2 className="h-3 w-3 ml-1" />
        </p>
      </div>
    </div>
  );
};

export default ConnectPage;
