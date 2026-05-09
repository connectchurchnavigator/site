import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  MapPin, ChevronDown, ChevronUp, Users, Globe, 
  ArrowLeft, Phone, Mail, Facebook, Instagram, Youtube, Twitter,
  Linkedin, Camera, Send, Share2, ExternalLink,
  Bookmark, Link2, Sparkles, ChevronRight, Shield,
  ChevronLeft, X, User, Languages, Briefcase, GraduationCap, Award, Video, Clock, QrCode, ShieldCheck, Navigation
} from 'lucide-react';
import ClaimListingModal from '../components/ClaimListingModal';
import { motion, AnimatePresence } from 'framer-motion';
import { NavbarPremium } from '../components/NavbarPremium';
import { Footer } from '../components/Footer';
import { PastorCard } from '../components/PastorCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { pastorAPI, churchAPI, analyticsAPI } from '../lib/api';
import { getImageUrl, getFallbackImage, ensureExternalUrl, getSessionId } from '../lib/utils';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

const XIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932L18.901 1.153ZM17.61 20.644h2.039L6.486 3.24H4.298L17.61 20.644Z" />
  </svg>
);

const getYouTubeEmbedUrl = (url) => {
  if (!url) return "";
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  const id = (match && match[2].length === 11) ? match[2] : null;
  return id ? `https://www.youtube.com/embed/${id}` : url;
};

const SectionCard = ({ children, className = "" }) => (
  <div className={cn("bg-white rounded-[5px] p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300", className)}>
    {children}
  </div>
);

const SectionHeading = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-2.5 mb-5">
    <div className="w-8 h-8 rounded-[5px] bg-[#6c1cff]/10 flex items-center justify-center">
      <Icon size={18} className="text-[#6c1cff]" />
    </div>
    <h2 className="text-[1rem] font-semibold text-slate-700">{title}</h2>
  </div>
);

const Lightbox = ({ isOpen, onClose, images, currentIndex, onNext, onPrev }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onNext, onPrev, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 touch-none"
          onClick={onClose}
        >
          <button onClick={onClose} className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors z-[110]">
            <X size={32} />
          </button>
          <div className="relative w-full max-w-5xl aspect-auto flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {images.length > 1 && (
              <>
                <button onClick={onPrev} className="absolute left-0 lg:-left-20 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all z-[110]">
                  <ChevronLeft size={24} />
                </button>
                <button onClick={onNext} className="absolute right-0 lg:-right-20 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all z-[110]">
                  <ChevronRight size={24} />
                </button>
              </>
            )}
            <motion.div key={currentIndex} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative rounded-[5px] overflow-hidden shadow-2xl">
              <img src={getImageUrl(images[currentIndex])} alt="View" className="max-h-[85vh] w-auto object-contain select-none" />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const PastorDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [pastor, setPastor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");
  const [associatedChurches, setAssociatedChurches] = useState([]);
  const [lightbox, setLightbox] = useState({ isOpen: false, images: [], currentIndex: 0 });
  const [messageData, setMessageData] = useState({ name: '', email: '', message: '' });
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    if (pastor) {
      fetchRecommendations();
    }
  }, [pastor]);

  const fetchRecommendations = async () => {
    try {
      const res = await pastorAPI.getAll({ 
        denomination: pastor.denomination,
        limit: 10 
      });
      
      let items = res.data.data || [];
      items = items.filter(p => p.id !== pastor.id);

      items.sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;
        if (a.city === pastor.city) scoreA += 50;
        if (b.city === pastor.city) scoreB += 50;
        return scoreB - scoreA;
      });

      setRecommendations(items.slice(0, 4));
    } catch (e) {
      console.error("Failed to fetch recommendations", e);
    }
  };

  const handleMessageSubmit = async (e) => {
    e.preventDefault();
    if (!messageData.name || !messageData.email || !messageData.message) {
      return toast.error("Please fill in all fields");
    }
    setSendingMessage(true);
    try {
      // Mock sending logic
      await new Promise(r => setTimeout(r, 1000));
      toast.success("Message sent successfully!");
      setMessageData({ name: '', email: '', message: '' });
    } catch (error) {
      console.error("Message send failed:", error?.message || error);
      toast.error("Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: pastor.name,
        text: pastor.current_designation,
        url: window.location.href,
      }).catch(err => {
        if (err.name !== 'AbortError') {
          console.error("Share failed:", err.message);
        }
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  const handleDownloadQR = () => {
    const qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(window.location.href)}`;
    const link = document.createElement('a');
    link.href = qrImage;
    link.download = `${pastor.name.replace(/\s+/g, '_')}_QR.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    fetchPastorDetails();
  }, [slug]);

  const fetchPastorDetails = async () => {
    try {
      setLoading(true);
      const res = await pastorAPI.getById(slug);
      if (res.data) {
        setPastor(res.data);
        const churchAssoc = res.data.church_associated_to;
        if (churchAssoc && churchAssoc !== 'not_listed') {
          const churchesToFetch = Array.isArray(churchAssoc) ? churchAssoc : [churchAssoc];
          fetchMultipleChurchDetails(churchesToFetch);
        }
        
        // Track view (silent failure)
        try {
          await analyticsAPI.track({
            listing_id: res.data.id,
            listing_type: 'pastor',
            event_type: 'view',
            session_id: getSessionId(),
            referrer: document.referrer
          });
        } catch (analyticsError) {
          console.warn("Analytics tracking failed:", analyticsError.response?.data || analyticsError.message);
        }
      }
    } catch (error) {
      console.error("Critical Error: Failed to fetch pastor details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      toast.error("Could not load profile. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const fetchMultipleChurchDetails = async (names) => {
    try {
      const results = await Promise.all(names.map(async (name) => {
        const res = await churchAPI.getAll({ search: name, limit: 5 });
        if (res.data.data?.length > 0) {
          return res.data.data.find(c => c.name.toLowerCase() === name.toLowerCase()) || res.data.data[0];
        }
        return null;
      }));
      setAssociatedChurches(results.filter(c => c !== null));
    } catch (e) {
      console.error("Failed to fetch associated churches", e);
    }
  };

  const openLightbox = (images, index) => setLightbox({ isOpen: true, images, currentIndex: index });
  const nextImage = () => setLightbox(prev => ({ ...prev, currentIndex: (prev.currentIndex + 1) % prev.images.length }));
  const prevImage = () => setLightbox(prev => ({ ...prev, currentIndex: (prev.currentIndex - 1 + prev.images.length) % prev.images.length }));

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <Sparkles className="w-12 h-12 text-[#6c1cff] animate-pulse" />
        <p className="text-slate-400 font-medium animate-pulse">Gathering spiritual leader details...</p>
      </div>
    </div>
  );

  if (!pastor) return null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f4f4f4' }}>
      <NavbarPremium />

      {/* Banner / Hero */}
      <div className="relative">
        <div className="h-48 sm:h-64 md:h-72 overflow-hidden">
          {pastor.cover_image ? (
            <img src={getImageUrl(pastor.cover_image)} alt={pastor.name} className="w-full h-full object-cover" />
          ) : (
            <img src={getFallbackImage('pastor')} alt={pastor.name} className="w-full h-full object-cover opacity-40 grayscale" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-slate-900/10" />
        </div>
        <div className="max-w-7xl mx-auto px-4 relative">
          <div className={cn(
            "absolute -bottom-16 left-4 w-32 h-32 rounded-[5px] bg-white border-4 border-white shadow-xl flex items-center justify-center overflow-hidden ring-2 ring-[#6c1cff]/10",
            !pastor.profile_picture && "p-6"
          )}>
            {pastor.profile_picture ? (
              <img src={getImageUrl(pastor.profile_picture)} alt={pastor.name} className="w-full h-full object-cover" />
            ) : (
              <img src={getFallbackImage('pastor')} alt={pastor.name} className="w-full h-full object-cover" />
            )}
          </div>
        </div>
      </div>

      {/* Header Info */}
      <div className="max-w-7xl mx-auto px-4 pt-20 pb-0 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-700">{pastor.name}</h1>
            </div>
            {pastor.current_designation && (
              <p className="text-[#6c1cff] font-semibold text-sm mt-1 mb-1">{pastor.current_designation}</p>
            )}
            <div className="flex items-center gap-3 text-sm text-slate-500 font-medium flex-wrap">
              {pastor.city && (
                <span className="flex items-center gap-1"><MapPin size={14} /> {pastor.city}</span>
              )}
              {pastor.city && pastor.denomination && (
                <span className="text-slate-300">|</span>
              )}
              {pastor.denomination && (
                <span className="flex items-center gap-1 text-[#6c1cff] font-bold"><Sparkles size={14} /> {pastor.denomination}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button className="bg-[#6c1cff] text-white hover:bg-[#5a15d4] shadow-xl shadow-[#6c1cff]/20 rounded-full px-6 font-bold gap-2" onClick={() => window.open(`tel:${pastor.phone}`)}>
              <Phone size={16} /> Contact Now
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 mt-8 border-b border-slate-200">
          <button
            onClick={() => setActiveTab("profile")}
            className={`pb-3 text-sm font-semibold transition-all border-b-2 ${activeTab === "profile" ? "border-[#6c1cff] text-[#6c1cff]" : "border-transparent text-slate-400 hover:text-slate-600"}`}
          >
            About & Life
          </button>
          <button
            onClick={() => setActiveTab("experience")}
            className={`pb-3 text-sm font-semibold transition-all border-b-2 ${activeTab === "experience" ? "border-[#6c1cff] text-[#6c1cff]" : "border-transparent text-slate-400 hover:text-slate-600"}`}
          >
            Ministry & Experience
          </button>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="max-w-7xl mx-auto px-4 py-5">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {[
            { icon: Mail, label: "Send Email", onClick: () => window.open(`mailto:${pastor.email}`) },
            { icon: Globe, label: "Website", hide: !pastor.website, onClick: () => window.open(pastor.website) },
            { icon: Bookmark, label: "Bookmark", onClick: () => toast.success("Added to bookmarks") },
            { icon: Share2, label: "Share Profile", onClick: handleShare },
            { 
              icon: ShieldCheck, 
              label: "Claim profile", 
              onClick: () => {
                if (!isAuthenticated) {
                  toast.info("Please sign in to claim this profile");
                  navigate('/auth/login', { state: { from: { pathname: `/pastor/${slug}` } } });
                  return;
                }
                setIsClaimModalOpen(true);
              }
            },
          ].map((btn) => (
            !btn.hide && (
              <button
                key={btn.label}
                onClick={btn.onClick}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:border-[#6c1cff] hover:text-[#6c1cff] hover:shadow-sm transition-all"
              >
                <btn.icon size={15} /> {btn.label}
              </button>
            )
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 pb-16">
        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* LEFT: Main Bio & Details */}
          <div className="lg:col-span-2 space-y-6">
            
            {activeTab === 'profile' ? (
              <>
                {/* My Calling & Journey Card */}
                {(pastor.bio || pastor.highest_degree || pastor.bible_college || (pastor.years_in_ministry && pastor.years_in_ministry > 0) || pastor.denomination) && (
                  <SectionCard className="p-6">
                    <SectionHeading icon={User} title="My Calling & Journey" />
                    {pastor.bio && (
                      <div className="text-slate-600 text-[14px] leading-relaxed mb-6 whitespace-pre-line">
                        {pastor.bio}
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(pastor.highest_degree || pastor.bible_college) && (
                        <div className="p-4 rounded-[5px] bg-slate-50 border border-slate-100 flex items-center gap-4">
                          <div className="w-10 h-10 rounded-[5px] bg-blue-50 flex items-center justify-center text-blue-600">
                            <GraduationCap size={20} />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Education</p>
                            <p className="text-[14px] font-semibold text-slate-700">
                              {pastor.highest_degree ? `${pastor.highest_degree} ${pastor.bible_college ? `from ${pastor.bible_college}` : ''}` : pastor.bible_college}
                            </p>
                          </div>
                        </div>
                      )}
                      {(pastor.years_in_ministry !== null && pastor.years_in_ministry > 0) && (
                        <div className="p-4 rounded-[5px] bg-slate-50 border border-slate-100 flex items-center gap-4">
                          <div className="w-10 h-10 rounded-[5px] bg-orange-50 flex items-center justify-center text-orange-600">
                            <Award size={20} />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Experience</p>
                            <p className="text-[14px] font-semibold text-slate-700">{pastor.years_in_ministry} Years in Ministry</p>
                          </div>
                        </div>
                      )}
                      {pastor.denomination && (
                        <div className="p-4 rounded-[5px] bg-slate-50 border border-slate-100 flex items-center gap-4">
                          <div className="w-10 h-10 rounded-[5px] bg-purple-50 flex items-center justify-center text-purple-600">
                            <Shield size={20} />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Denomination</p>
                            <p className="text-[14px] font-semibold text-slate-700">{pastor.denomination}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </SectionCard>
                )}

                {/* Languages Section */}
                {pastor.languages_known?.length > 0 && (
                  <SectionCard className="p-6">
                    <SectionHeading icon={Languages} title="Languages" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-3 mt-4">
                      {pastor.languages_known.map(l => (
                        <div key={l} className="flex items-center gap-3 group" title={l}>
                          <div className="w-9 h-9 rounded-full bg-[#6c1cff]/5 flex items-center justify-center group-hover:bg-[#6c1cff]/10 transition-colors flex-shrink-0">
                            <Languages size={15} className="text-[#6c1cff]" />
                          </div>
                          <span className="text-[13px] font-medium text-slate-800 truncate">{l}</span>
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                )}

                {/* Passion Areas Section */}
                {pastor.passion_areas?.length > 0 && (
                  <SectionCard className="p-6">
                    <SectionHeading icon={Sparkles} title="Passion Areas" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-3 mt-4">
                      {pastor.passion_areas.map(p => (
                        <div key={p} className="flex items-center gap-3 group" title={p}>
                          <div className="w-9 h-9 rounded-full bg-[#6c1cff]/5 flex items-center justify-center group-hover:bg-[#6c1cff]/10 transition-colors flex-shrink-0">
                            <Sparkles size={15} className="text-[#6c1cff]" />
                          </div>
                          <span className="text-[13px] font-medium text-slate-800 truncate">{p}</span>
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                )}

                {/* Gallery */}
                {pastor.gallery_images?.length > 0 && (
                  <SectionCard className="p-6">
                    <SectionHeading icon={Camera} title="Gallery" />
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {pastor.gallery_images.slice(0, 6).map((img, i) => {
                        const isLast = i === 5 && pastor.gallery_images.length > 6;
                        return (
                          <div 
                            key={i} 
                            className="aspect-[4/3] rounded-[5px] overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all group relative" 
                            onClick={() => openLightbox(pastor.gallery_images, i)}
                          >
                            <img src={getImageUrl(img)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            {isLast && (
                              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center transition-opacity group-hover:bg-black/70">
                                <span className="text-white text-xl md:text-2xl font-bold">
                                  +{pastor.gallery_images.length - 5}
                                </span>
                                <span className="text-white/80 text-[10px] md:text-[11px] font-bold uppercase tracking-widest mt-1">
                                  View More
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </SectionCard>
                )}

                {/* Video */}
                {pastor.video_url && (
                  <SectionCard className="p-6">
                    <SectionHeading icon={Video} title="Introduction Video" />
                    <div className="rounded-[5px] overflow-hidden aspect-video shadow-lg">
                      <iframe className="w-full h-full border-0" src={getYouTubeEmbedUrl(pastor.video_url)} allowFullScreen />
                    </div>
                  </SectionCard>
                )}
              </>
            ) : (
              /* Experience Tab */
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                {/* Ministry Footprint Card */}
                {(pastor.ministry_experience?.length > 0 || 
                  pastor.training?.length > 0 || 
                  pastor.cities_served?.length > 0 || 
                  pastor.roles_interested?.length > 0 || 
                  pastor.recognitions) && (
                  <SectionCard className="p-8">
                    <SectionHeading icon={Briefcase} title="Ministry Footprint" />
                    <div className="space-y-8">
                      {pastor.ministry_experience?.length > 0 && (
                        <div>
                          <h4 className="text-[12px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Areas of Expertise</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-3 mt-4">
                            {pastor.ministry_experience.map(exp => (
                              <div key={exp} className="flex items-center gap-3 group" title={exp}>
                                <div className="w-9 h-9 rounded-full bg-[#6c1cff]/5 flex items-center justify-center group-hover:bg-[#6c1cff]/10 transition-colors flex-shrink-0">
                                  <Briefcase size={15} className="text-[#6c1cff]" />
                                </div>
                                <span className="text-[13px] font-medium text-slate-800 truncate">{exp}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {pastor.training?.length > 0 && (
                        <div>
                          <h4 className="text-[12px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Training & Certifications</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-3 mt-4">
                            {pastor.training.map(t => (
                              <div key={t} className="flex items-center gap-3 group" title={t}>
                                <div className="w-9 h-9 rounded-full bg-[#6c1cff]/5 flex items-center justify-center group-hover:bg-[#6c1cff]/10 transition-colors flex-shrink-0">
                                  <Shield size={15} className="text-[#6c1cff]" />
                                </div>
                                <span className="text-[13px] font-medium text-slate-800 truncate">{t}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {pastor.cities_served?.length > 0 && (
                        <div>
                          <h4 className="text-[12px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Cities Served</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-3 mt-4">
                            {pastor.cities_served.map(city => (
                              <div key={city} className="flex items-center gap-3 group" title={city}>
                                <div className="w-9 h-9 rounded-full bg-[#6c1cff]/5 flex items-center justify-center group-hover:bg-[#6c1cff]/10 transition-colors flex-shrink-0">
                                  <MapPin size={15} className="text-[#6c1cff]" />
                                </div>
                                <span className="text-[13px] font-medium text-slate-800 truncate">{city}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {pastor.roles_interested?.length > 0 && (
                        <div>
                          <h4 className="text-[12px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Roles Interested In</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-3 mt-4">
                            {pastor.roles_interested.map(role => (
                              <div key={role} className="flex items-center gap-3 group" title={role}>
                                <div className="w-9 h-9 rounded-full bg-[#6c1cff]/5 flex items-center justify-center group-hover:bg-[#6c1cff]/10 transition-colors flex-shrink-0">
                                  <User size={15} className="text-[#6c1cff]" />
                                </div>
                                <span className="text-[13px] font-medium text-slate-800 truncate">{role}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {pastor.recognitions && (
                        <div>
                          <h4 className="text-[12px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Recognitions & Awards</h4>
                          <div className="p-5 rounded-[5px] bg-[#6c1cff]/5 border border-[#6c1cff]/10">
                            <p className="text-[14px] text-[#6c1cff] font-medium leading-relaxed italic">{pastor.recognitions}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </SectionCard>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: Sidebar */}
          <div className="space-y-6 sticky top-24 self-start">
            
            {/* Associated Church Card */}
            {(associatedChurches.length > 0 || (pastor.church_associated_to && pastor.church_associated_to !== 'not_listed')) && (
              <SectionCard className="p-5 overflow-hidden">
                 <SectionHeading icon={Users} title="Associated Church" />
                 <div className="space-y-8">
                    {associatedChurches.length > 0 ? (
                      associatedChurches.map((church, idx) => (
                        <div key={church.id || idx} onClick={() => navigate(`/church/${church.slug}`)} className="cursor-pointer group border-b border-slate-50 last:border-0 pb-6 last:pb-0">
                          <div className={cn(
                            "aspect-video w-full rounded-[5px] overflow-hidden mb-4 relative bg-slate-100 border border-slate-100 flex items-center justify-center",
                            !(church.cover_image || church.logo) && "p-8"
                          )}>
                            <img 
                              src={getImageUrl(church.cover_image) || getImageUrl(church.logo) || getFallbackImage('church')} 
                              className={cn(
                                "w-full h-full object-cover group-hover:scale-105 transition-transform duration-500",
                                !(church.cover_image || church.logo) && "object-contain opacity-40"
                              )} 
                              alt={church.name}
                            />
                            <div className="absolute inset-0 bg-black/10" />
                            {church.logo && (
                              <div className={cn("absolute bottom-2 left-2 w-10 h-10 rounded-[5px] bg-white shadow-lg overflow-hidden border border-white/50 z-10", !church.logo && "p-2")}>
                                <img src={getImageUrl(church.logo)} className="w-full h-full object-cover rounded-md" alt="Logo" />
                              </div>
                            )}
                          </div>
                          <h4 className="text-[15px] font-bold text-slate-700 group-hover:text-[#6c1cff] transition-colors">{church.name}</h4>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-1"><MapPin size={12} /> {[church.city, church.state].filter(Boolean).join(', ')}</p>
                          <Button variant="outline" className="w-full mt-4 h-9 rounded-[5px] border-[#6c1cff]/20 text-[#6c1cff] text-[11px] font-bold uppercase tracking-widest hover:bg-[#6c1cff] hover:text-white transition-all">View Church</Button>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 rounded-[5px] border border-dashed border-slate-200 text-center">
                        <p className="text-sm font-bold text-slate-400">
                          {Array.isArray(pastor.church_associated_to) ? pastor.church_associated_to.join(', ') : pastor.church_associated_to}
                        </p>
                      </div>
                    )}
                 </div>
              </SectionCard>
            )}

            {/* Location & Contact Card (Unified) */}
            <SectionCard className="overflow-hidden p-5">
              <SectionHeading icon={MapPin} title="Location" />
              

              <div className="space-y-3">
                {[
                  { icon: MapPin, text: [pastor.address_line1, pastor.city, pastor.state].filter(Boolean).join(', ') + (pastor.zip_code ? ` ${pastor.zip_code}` : ''), isLink: false, show: !!(pastor.address_line1 || pastor.city || pastor.state) },
                  { icon: Phone, text: pastor.phone, isLink: true, href: `tel:${pastor.phone}`, show: !!pastor.phone },
                  { icon: Mail, text: pastor.email, isLink: true, href: `mailto:${pastor.email}`, show: !!pastor.email },
                  { icon: Briefcase, text: pastor.current_designation || "Lead Pastor", isLink: false, show: true },
                ].filter(item => item.show).map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 group">
                    <div className="w-8 h-8 rounded-[5px] bg-[#6c1cff]/10 flex items-center justify-center shrink-0 group-hover:bg-[#6c1cff]/20 transition-colors">
                      <item.icon size={14} className="text-[#6c1cff]" />
                    </div>
                    {item.isLink ? (
                      <a href={ensureExternalUrl(item.href)} target="_blank" rel="noreferrer" className="text-sm text-[#6c1cff] hover:underline pt-1.5 transition-colors break-all">{item.text}</a>
                    ) : (
                      <p className="text-sm text-slate-800 pt-1.5 leading-tight break-words">{item.text}</p>
                    )}
                  </div>
                ))}

                {/* Social Links */}
                <div className="pt-4 mt-2 border-t border-slate-100 flex flex-wrap gap-2">
                  {[
                    { icon: Instagram, url: pastor.instagram, label: "Instagram", hover: "hover:bg-[#E4405F] hover:border-[#E4405F]" },
                    { icon: Youtube, url: pastor.youtube, label: "YouTube", hover: "hover:bg-[#FF0000] hover:border-[#FF0000]" },
                    { icon: Facebook, url: pastor.facebook, label: "Facebook", hover: "hover:bg-[#1877F2] hover:border-[#1877F2]" },
                    { icon: XIcon, url: pastor.twitter, label: "X", hover: "hover:bg-black hover:border-black" },
                  ].map((s) => (
                    <a
                      key={s.label}
                      href={ensureExternalUrl(s.url)}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(
                        "w-11 h-11 rounded-full border border-slate-100 flex items-center justify-center transition-all duration-300 text-slate-500 hover:text-white hover:scale-110 active:scale-95 shadow-sm hover:shadow-md",
                        s.hover,
                        !s.url && "hidden"
                      )}
                      title={s.label}
                    >
                      <s.icon size={22} />
                    </a>
                  ))}
                </div>
              </div>
            </SectionCard>


            {/* Contact Form Card */}
            <SectionCard className="p-5">
              <SectionHeading icon={Mail} title="Contact Form" />
              <form onSubmit={handleMessageSubmit} className="space-y-4">
                <div className="space-y-1">
                  <input 
                    type="text" 
                    placeholder="Your Name" 
                    value={messageData.name}
                    onChange={(e) => setMessageData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-[#6c1cff]/10 focus:border-[#6c1cff] transition-all text-sm outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <input 
                    type="email" 
                    placeholder="Your Email" 
                    value={messageData.email}
                    onChange={(e) => setMessageData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-[#6c1cff]/10 focus:border-[#6c1cff] transition-all text-sm outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <textarea 
                    placeholder="Write your message..." 
                    rows={4}
                    value={messageData.message}
                    onChange={(e) => setMessageData(prev => ({ ...prev, message: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-[#6c1cff]/10 focus:border-[#6c1cff] transition-all text-sm outline-none resize-none"
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={sendingMessage}
                  className="w-full bg-[#6c1cff] text-white hover:bg-[#5a15d4] h-11 rounded-xl font-bold shadow-lg shadow-[#6c1cff]/10 gap-2 transition-all active:scale-95"
                >
                  {sendingMessage ? "Sending..." : "Send Message"} <Send size={16} />
                </Button>
              </form>
            </SectionCard>

            {/* QR Code */}
            <SectionCard className="p-5">
              <SectionHeading icon={QrCode} title="Scan Now" />
              <div className="flex justify-center mb-6">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(window.location.href)}`} 
                  alt="QR" 
                  className="w-32 h-32"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleDownloadQR}
                  className="flex-1 gap-1.5 border-[#6c1cff] text-[#6c1cff] hover:bg-[#6c1cff] hover:text-white text-[11px] transition-all h-10 rounded-[5px] font-normal px-2"
                >
                  <ExternalLink size={14} /> Download
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleShare}
                  className="flex-1 gap-1.5 border-slate-200 text-slate-600 hover:border-[#6c1cff] hover:text-[#6c1cff] text-[11px] transition-all h-10 rounded-[5px] font-normal px-2"
                >
                  <Share2 size={14} /> Share
                </Button>
              </div>
            </SectionCard>

          </div>
        </div>
      </div>

      {/* Recommended Pastors Section */}
      <div className="max-w-7xl mx-auto px-4 py-16 border-t border-slate-100">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800">You may also be interested in</h2>
          <p className="text-slate-500 mt-1">Discover more spiritual leaders within the {pastor.denomination} community</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {recommendations.slice(0, 3).map(item => (
            <PastorCard key={item.id} pastor={item} />
          ))}

          {/* Explore All Card */}
          <Link 
            to="/explore"
            className="group block h-full min-h-[350px]"
          >
            <div className="h-full rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center p-6 text-center transition-all duration-300 group-hover:bg-white group-hover:border-[#6c1cff] group-hover:border-solid hover:shadow-md">
              <div className="w-16 h-16 rounded-full bg-[#6c1cff]/10 flex items-center justify-center text-[#6c1cff] mb-4 group-hover:scale-110 transition-transform">
                <Users size={30} />
              </div>
              <h3 className="font-bold text-lg text-slate-800 mb-2">Explore All</h3>
              <p className="text-sm text-slate-500">View our entire directory of spiritual leaders</p>
              <div className="mt-6 flex items-center justify-center w-10 h-10 rounded-full bg-white border border-slate-200 text-[#6c1cff] group-hover:bg-[#6c1cff] group-hover:text-white transition-colors">
                <ChevronRight size={20} />
              </div>
            </div>
          </Link>
        </div>
      </div>

      {lightbox.isOpen && (
        <Lightbox 
          isOpen={lightbox.isOpen}
          onClose={() => setLightbox({ ...lightbox, isOpen: false })}
          images={lightbox.images}
          currentIndex={lightbox.currentIndex}
          onNext={nextImage}
          onPrev={prevImage}
        />
      )}

      {pastor && (
        <ClaimListingModal 
          isOpen={isClaimModalOpen}
          onClose={() => setIsClaimModalOpen(false)}
          listingId={pastor.id}
          listingType="pastor"
          listingName={pastor.name}
        />
      )}

      <Footer />
    </div>
  );
};

export default PastorDetailPage;