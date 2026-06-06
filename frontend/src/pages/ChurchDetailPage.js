import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Heart, Share2, MapPin, Clock, Phone, Globe, Users, 
  Calendar, Info, ChevronRight, MessageSquare, Shield,
  Layers, Lock, Play, Music, HeartHandshake, Church,
  Camera, ChevronDown, ChevronUp, ArrowLeft, Mail, Facebook, Linkedin,
  Instagram, Youtube, Twitter, Navigation, QrCode, Send, 
  ExternalLink, Bookmark, Star, PhoneCall, Link2, Sparkles, 
  ChevronLeft, X, User, Building2, Video, Languages, ShieldCheck
} from 'lucide-react';
import ClaimListingModal from '../components/ClaimListingModal';
import GoogleMap from '../components/GoogleMap';
import { motion, AnimatePresence } from 'framer-motion';
import { NavbarPremium } from '../components/NavbarPremium';
import { Footer } from '../components/Footer';
import { ChurchCard } from '../components/ChurchCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Separator } from '../components/ui/separator';
import { 
  churchAPI, 
  relationshipAPI, 
  analyticsAPI,
  taxonomyAPI,
  pastorAPI,
  bookmarkAPI,
  messageAPI
} from '../lib/api';
import { getImageUrl, getFallbackImage, ensureExternalUrl, isOpenNow, formatTimeTo12h, getSessionId } from '../lib/utils';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

const XIcon = ({ size = 24, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
  >
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932L18.901 1.153ZM17.61 20.644h2.039L6.486 3.24H4.298L17.61 20.644Z" />
  </svg>
);

// Ported Helper Components from source
const getYouTubeEmbedUrl = (url) => {
  if (!url) return "";
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  const id = (match && match[2].length === 11) ? match[2] : null;
  return id ? `https://www.youtube.com/embed/${id}` : url;
};

const SectionCard = ({ children, className = "" }) => (
  <div className={`bg-white rounded-[5px] border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300 ${className}`}>
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
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors z-[110]"
          >
            <X size={32} />
          </button>

          <div className="relative w-full max-w-5xl aspect-auto flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {images.length > 1 && (
              <>
                <button 
                  onClick={onPrev}
                  className="absolute left-0 lg:-left-20 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all z-[110]"
                >
                  <ChevronLeft size={24} />
                </button>
                <button 
                  onClick={onNext}
                  className="absolute right-0 lg:-right-20 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all z-[110]"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}

            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.9, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: -20 }}
              className="relative rounded-[5px] overflow-hidden shadow-2xl"
            >
              <img 
                src={getImageUrl(images[currentIndex])} 
                alt="Enlarged view" 
                className="max-h-[85vh] w-auto object-contain select-none"
              />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-black/50 text-white/70 text-xs font-bold backdrop-blur-md">
                {currentIndex + 1} / {images.length}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const TeamCard = ({ team, i, onImageClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVideosExpanded, setIsVideosExpanded] = useState(false);
  const description = team.details?.description || "";
  const isLong = description.length > 180;
  const hasImages = team.details?.images?.length > 0;

  return (
    <SectionCard className="flex flex-col p-6 animate-in fade-in slide-in-from-bottom-4 duration-500 hover:shadow-xl transition-all border-[#6c1cff]/5 group">
      <div>
        <SectionHeading icon={team.icon} title={team.name} />
        
        {/* Team Description */}
        {description && (
          <div className="mb-6">
            <p className={cn(
              "text-slate-600 text-sm leading-relaxed transition-all",
              !isExpanded && "line-clamp-4"
            )}>
              {description}
            </p>
            {isLong && (
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-[#6c1cff] text-xs font-bold mt-2 hover:underline flex items-center gap-1"
              >
                {isExpanded ? (
                  <>Show Less <ChevronUp size={14} /></>
                ) : (
                  <>Show More <ChevronDown size={14} /></>
                )}
              </button>
            )}
          </div>
        )}

        {/* Team Photos */}
        {hasImages && (
          <div className="mb-6">
            <h4 className="text-[16px] font-semibold text-slate-800 mb-4">Team Gallery</h4>
            <div className="grid grid-cols-2 gap-2">
              {team.details.images.slice(0, 4).map((img, j) => {
                const isLast = j === 3 && team.details.images.length > 4;
                return (
                  <div 
                    key={j} 
                    className="aspect-[3/2] rounded-[5px] overflow-hidden border border-slate-100 group/img cursor-pointer shadow-sm hover:shadow-md transition-shadow relative"
                    onClick={() => onImageClick(team.details.images, j)}
                  >
                    <img 
                      src={getImageUrl(img)} 
                      alt={`${team.name} ${j}`} 
                      className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-500" 
                    />
                    {isLast && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center transition-opacity group-hover/img:bg-black/70">
                        <span className="text-white text-base font-semibold">
                          +{team.details.images.length - 3}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Team Video Highlights */}
      {(() => {
        const urls = team.details?.video_urls?.filter(Boolean) || (team.details?.video_url ? [team.details.video_url] : []);
        if (urls.length === 0) return null;

        const displayedUrls = isVideosExpanded ? urls : urls.slice(0, 2);

        return (
          <div className={cn(
            "pb-2",
            hasImages && "pt-6 border-t border-slate-50 mt-2"
          )}>
            <h4 className="text-[16px] font-semibold text-slate-800 mb-4">Highlights</h4>
            <div className="grid grid-cols-1 gap-4">
              {displayedUrls.map((url, idx) => (
                <div key={idx} className="rounded-[5px] overflow-hidden aspect-video border border-slate-100 shadow-sm relative">
                  <iframe
                    className="w-full h-full border-0"
                    src={getYouTubeEmbedUrl(url)}
                    title={`${team.name} Video ${idx + 1}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ))}
            </div>
            
            {urls.length > 2 && (
              <button 
                onClick={() => setIsVideosExpanded(!isVideosExpanded)}
                className="text-[#6c1cff] text-xs font-bold mt-4 hover:underline flex items-center gap-1 w-full justify-center py-2 bg-slate-50 rounded-[5px] border border-slate-100"
              >
                {isVideosExpanded ? (
                  <>Show Less <ChevronUp size={14} /></>
                ) : (
                  <>View More (+{urls.length - 2}) <ChevronDown size={14} /></>
                )}
              </button>
            )}
          </div>
        );
      })()}
    </SectionCard>
  );
};

const ChurchDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [church, setChurch] = useState(null);
  const [churches, setChurches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");
  const [pastorProfiles, setPastorProfiles] = useState([]);
  const [groupedServices, setGroupedServices] = useState({});
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkId, setBookmarkId] = useState(null);
  const [lightbox, setLightbox] = useState({ isOpen: false, images: [], currentIndex: 0 });
  const [messageData, setMessageData] = useState({ name: '', email: '', phone: '', message: '' });
  const [sendingMessage, setSendingMessage] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [isBranchesExpanded, setIsBranchesExpanded] = useState(false);
  // ===== SEO Metadata =====
  useEffect(() => {
    if (!church) return;

    const siteName = 'ChurchNavigator';
    const title = `${church.name} | ${siteName}`;
    const description = church.description
      ? church.description.replace(/<[^>]+>/g, '').slice(0, 155) + '...'
      : `Find ${church.name} in ${[church.city, church.state].filter(Boolean).join(', ')}. ${church.denomination || ''} church listed on ChurchNavigator.`;
    const canonical = `https://churchnavigator.com/church/${church.slug}`;
    const image = church.cover_image || church.logo || 'https://churchnavigator.com/logo.png';

    document.title = title;

    const setMeta = (attr, key, value) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', value);
    };

    setMeta('name', 'description', description);

    let canonicalEl = document.querySelector('link[rel="canonical"]');
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute('href', canonical);

    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:image', image);
    setMeta('property', 'og:url', canonical);
    setMeta('property', 'og:type', 'place');
    setMeta('property', 'og:site_name', siteName);

    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', image);

    return () => {
      document.title = siteName;
    };
  }, [church]);

  // ===== JSON-LD Structured Data =====
  useEffect(() => {
    if (!church) return;

    const schema = {
      "@context": "https://schema.org",
      "@type": "Church",
      "name": church.name,
      "description": church.description
        ? church.description.replace(/<[^>]+>/g, '').slice(0, 200)
        : `${church.name} is a ${church.denomination || ''} church listed on ChurchNavigator.`,
      "url": `https://churchnavigator.com/church/${church.slug}`,
      "telephone": church.phone || undefined,
      "email": church.email || undefined,
      "sameAs": [
        church.website,
        church.facebook,
        church.instagram,
        church.youtube,
        church.twitter,
        church.linkedin,
      ].filter(Boolean),
      "address": {
        "@type": "PostalAddress",
        "streetAddress": church.address_line1 || undefined,
        "addressLocality": church.city || undefined,
        "addressRegion": church.state || undefined,
        "postalCode": church.zip_code || undefined,
        "addressCountry": church.country || "GB"
      },
      "geo": church.latitude && church.longitude ? {
        "@type": "GeoCoordinates",
        "latitude": church.latitude,
        "longitude": church.longitude
      } : undefined,
      "logo": church.logo
        ? { "@type": "ImageObject", "url": church.logo }
        : undefined,
      "image": church.cover_image || church.logo || undefined,
      "denomination": church.denomination || undefined,
    };

    // Remove undefined values
    const cleanSchema = JSON.parse(JSON.stringify(schema));

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'church-jsonld';
    script.textContent = JSON.stringify(cleanSchema);
    document.head.appendChild(script);

    return () => {
      const el = document.getElementById('church-jsonld');
      if (el) el.remove();
    };
  }, [church]);

  useEffect(() => {
    if (church) {
      fetchRecommendations();
    }
  }, [church]);

  const fetchRecommendations = async () => {
    try {
      const res = await churchAPI.getAll({ 
        denomination: church.denomination,
        limit: 10 
      });
      
      let items = res.data.data || [];
      items = items.filter(c => c.id !== church.id);

      if (church.latitude && church.longitude) {
        items.sort((a, b) => {
          const getDist = (c) => (c.latitude && c.longitude) 
            ? Math.sqrt(Math.pow(c.latitude - church.latitude, 2) + Math.pow(c.longitude - church.longitude, 2))
            : Infinity;
          return getDist(a) - getDist(b);
        });
      }

      setRecommendations(items.slice(0, 4));
    } catch (e) {
      console.error("Failed to fetch recommendations", e);
    }
  };

  const openLightbox = (images, index) => {
    setLightbox({ isOpen: true, images, currentIndex: index });
  };

  const nextImage = () => {
    setLightbox(prev => ({
      ...prev,
      currentIndex: (prev.currentIndex + 1) % prev.images.length
    }));
  };

  const prevImage = () => {
    setLightbox(prev => ({
      ...prev,
      currentIndex: (prev.currentIndex - 1 + prev.images.length) % prev.images.length
    }));
  };

  const scrollToSchedule = () => {
    if (activeTab !== 'profile') {
      setActiveTab('profile');
      // Give React a moment to render the profile tab content/sidebar
      setTimeout(() => {
        const element = document.getElementById('service-schedule');
        if (element) {
          const offset = 100; // Account for sticky navbar
          const bodyRect = document.body.getBoundingClientRect().top;
          const elementRect = element.getBoundingClientRect().top;
          const elementPosition = elementRect - bodyRect;
          const offsetPosition = elementPosition - offset;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      }, 100);
      return;
    }

    const element = document.getElementById('service-schedule');
    if (element) {
      const offset = 100; // Account for sticky navbar
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    fetchChurchDetails();
    fetchAllChurches();
  }, [slug]);

  const fetchAllChurches = async () => {
    try {
      const res = await churchAPI.getAll({ limit: 500 });
      setChurches(res.data.data || []);
    } catch (e) {
      console.error("Error fetching all churches for lookup:", e);
    }
  };

  useEffect(() => {
    if (church && isAuthenticated) {
      checkBookmarkStatus();
    }
  }, [church, isAuthenticated]);

  const { mainBranch, otherSisterChurches } = React.useMemo(() => {
    if (!church || !churches.length) return { mainBranch: null, otherSisterChurches: [] };
    
    const currentId = church.id;
    const churchMainId = church.main_branch_id;
    const hiddenIds = church.hidden_branches || [];
    
    const isExplicitExcluded = (id) => !id || id === 'independent' || id === 'none';
    const isHidden = (c) => hiddenIds.includes(c.id) || hiddenIds.includes(c._id) || hiddenIds.includes(c.slug);

    let main = null;
    const others = [];
    const seenIds = new Set();

    const addChurch = (c) => {
      if (!c) return;
      const id = c.id || c._id;
      if (id === currentId || id === church._id || c.slug === church.slug) return;
      if (seenIds.has(id) || isHidden(c)) return;
      
      seenIds.add(id);
      others.push(c);
    };

    const findMatch = (idOrSlug) => {
      if (isExplicitExcluded(idOrSlug)) return null;
      return churches.find(c => c.id === idOrSlug || c._id === idOrSlug || c.slug === idOrSlug);
    };

    // 1. Find the Main Branch (if it's not hidden)
    main = findMatch(churchMainId);
    if (main && isHidden(main)) main = null;

    // 1.5 Fallback to bidirectional main branch from backend
    if (!main && church.main_branch_info) {
      main = church.main_branch_info;
    }

    churches.forEach(c => {
      const cMainId = c.main_branch_id;
      const cId = c.id || c._id;
      
      // 2. Is current the main church for 'c'? (Reciprocal)
      // Check if c.main_branch_id matches current church's ID or Slug
      if (!isExplicitExcluded(cMainId) && (cMainId === currentId || cMainId === church.slug || cMainId === church._id)) {
        addChurch(c);
        return;
      }
      
      // 3. Are they siblings?
      // Do they share the same parent? (Match parent ID or Slug)
      if (!isExplicitExcluded(churchMainId) && !isExplicitExcluded(cMainId)) {
        if (cMainId === churchMainId) {
          addChurch(c);
          return;
        }
        // Fuzzy sibling: Check if their parent objects are the same
        const parentOfC = findMatch(cMainId);
        if (parentOfC && main && (parentOfC.id === main.id || parentOfC.slug === main.slug)) {
          addChurch(c);
          return;
        }
      }
      
      // 4. Other branches explicit links
      if (church.other_branches?.some(b => {
        const bId = typeof b === 'string' ? b : (b.id || b._id || b.slug);
        return bId === cId || bId === c.slug;
      })) {
        addChurch(c);
        return;
      }
    });

    const sortedOthers = others.sort((a, b) => {
      const aIsMain = a.main_branch_id === 'none';
      const bIsMain = b.main_branch_id === 'none';
      if (aIsMain && !bIsMain) return -1;
      if (!aIsMain && bIsMain) return 1;
      return 0;
    });

    return { mainBranch: main, otherSisterChurches: sortedOthers };
  }, [church, churches]);

  const checkBookmarkStatus = async () => {
    if (!church) return;
    try {
      const response = await bookmarkAPI.getAll();
      const existing = response.data.find(b => b.listing && b.listing.id === church.id);
      if (existing) {
        setIsBookmarked(true);
        setBookmarkId(existing.bookmark_id);
      } else {
        setIsBookmarked(false);
        setBookmarkId(null);
      }
    } catch (error) {
      console.error("Error checking bookmark status:", error);
    }
  };

  const handleBookmarkToggle = async () => {
    if (!isAuthenticated) {
      toast.info("Please sign in to bookmark churches");
      navigate('/auth/login', { state: { from: { pathname: `/church/${slug}` } } });
      return;
    }

    try {
      if (isBookmarked) {
        await bookmarkAPI.remove(bookmarkId);
        setIsBookmarked(false);
        setBookmarkId(null);
        toast.success("Removed from bookmarks");
      } else {
        await bookmarkAPI.add(church.id, 'church');
        await checkBookmarkStatus();
        toast.success("Saved to bookmarks");
      }
    } catch (error) {
      console.error("Bookmark operation failed:", error);
      toast.error("Failed to update bookmark");
    }
  };

  const fetchChurchDetails = async () => {
    try {
      setLoading(true);
      const response = await churchAPI.getById(slug);
      if (response.data) {
        const churchData = response.data;
        setChurch(churchData);
        groupServicesByDay(churchData.services || []);
        fetchPastorProfiles(churchData);
      }
    } catch (error) {
      console.error("Error fetching church details:", error);
      toast.error("Could not load church details");
    } finally {
      setLoading(false);
    }
  };

  const trackView = async () => {
    if (!church) return;
    try {
      await analyticsAPI.track({
        listing_id: church.id,
        listing_type: 'church',
        event_type: 'view',
        session_id: getSessionId(),
        referrer: document.referrer
      });
    } catch (error) {
      console.error("Error tracking view:", error);
    }
  };

  useEffect(() => {
    if (church) {
      trackView();
    }
  }, [church]);

  const groupServicesByDay = (services) => {
    const formatRange = (start, end, endsNextDay) => {
      const s = formatTimeTo12h(start);
      const e = formatTimeTo12h(end);
      if (!s) return e ? (e + (endsNextDay ? " (+1 day)" : "")) : "";
      if (!e) return s;
      return `${s} — ${e}${endsNextDay ? " (+1 day)" : ""}`;
    };

    // Filter out services that are effectively empty (no day, no event name, and default time)
    const validServices = (services || []).filter(s => {
      const hasDay = !!s.day;
      const hasName = !!(s.event_name || s.name || s.title);
      const hasTime = s.start_time && s.start_time !== '::PM';
      return hasDay || hasName || hasTime;
    });

    const grouped = validServices.reduce((acc, service) => {
      const day = service.day || 'Special';
      if (!acc[day]) acc[day] = [];
      const rawTitle = service.event_name || service.name || service.title || 'Service';
      const capitalizedTitle = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);
      
      acc[day].push({
        time: formatRange(service.start_time, service.end_time, service.ends_next_day),
        title: capitalizedTitle
      });
      return acc;
    }, {});
    setGroupedServices(grouped);
  };

  const fetchPastorProfiles = async (churchData) => {
    try {
      let profiles = [];

      // 1. Try relationships
      const relResponse = await relationshipAPI.getByChurch(churchData.id);
      const relationships = relResponse.data || [];
      
      if (relationships.length > 0) {
        profiles = await Promise.all(
          relationships
            .filter(r => r.status === 'approved' && (r.pastor_id || r.pastor_details))
            .map(async (r) => {
              try {
                const fullPastor = await pastorAPI.getById(r.pastor_id);
                return { ...fullPastor.data, role: r.role };
              } catch (e) {
                return { ...r.pastor_details, id: r.pastor_id, role: r.role };
              }
            })
        );
      }

      // 2. Try direct church record pastor_id if profiles still empty
      if (profiles.length === 0 && (churchData.pastor_id || churchData.pastor_slug)) {
        try {
          const directPastor = await pastorAPI.getById(churchData.pastor_id || churchData.pastor_slug);
          if (directPastor.data) {
            profiles.push({ ...directPastor.data, role: 'Senior Pastor' });
          }
        } catch (e) {}
      }

      // 3. Fallback to basic names
      if (profiles.length === 0 && churchData.pastor_name) {
        setPastorProfiles([{
          name: churchData.pastor_name,
          role: 'Pastor',
          profile_picture: churchData.pastor_image
        }]);
      } else {
        setPastorProfiles(profiles.slice(0, 1));
      }
    } catch (error) {
      console.error("Error fetching pastor profiles:", error);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: church.name,
        text: church.tagline,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  const handleDownloadQR = () => {
    const qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(window.location.href)}`;
    const link = document.createElement('a');
    link.href = qrImage;
    link.download = `${church.name.replace(/\s+/g, '_')}_QR.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageData.name || !messageData.email || !messageData.phone || !messageData.message) {
      toast.error("Please fill in all fields");
      return;
    }

    const cleanPhone = messageData.phone.trim().replace(/[\s\-\(\)]/g, '');
    if (!/^\+?[0-9]{8,15}$/.test(cleanPhone)) {
      toast.error("Please enter a valid phone number (8 to 15 digits)");
      return;
    }

    try {
      setSendingMessage(true);
      await messageAPI.submit(slug, messageData);
      toast.success("Message sent successfully!");
      setMessageData({ name: '', email: '', phone: '', message: '' });
    } catch (error) {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <Sparkles className="w-12 h-12 text-[#6c1cff] animate-pulse" />
        <p className="text-slate-400 font-medium animate-pulse">Gathering community details...</p>
      </div>
    </div>
  );

  if (!church) return null;

  const currentStatus = isOpenNow(church?.services || []);

  const teams = [
    { 
      name: "Praise & Worship Team", 
      icon: Music, 
      details: church.worship_team 
    },
    { 
      name: "IT & Media Team", 
      icon: Camera, 
      details: church.it_media_team 
    },
    { 
      name: "Outreach Team", 
      icon: Users, 
      details: church.outreach_team 
    }
  ].filter(t => t.details && (t.details.description || (t.details.images && t.details.images.length > 0) || t.details.video_url));

  // Handle ministries (can be strings or objects)
  const otherTeams = (church.ministries || [])
    .map(m => {
      // If it's a string, normalize to object-like structure
      if (typeof m === 'string') {
        return {
          name: m,
          icon: Users,
          details: { description: '', images: [], video_url: '' }
        };
      }
      // If it's an object from WordPress/other source
      return {
        name: m.name,
        icon: Users,
        details: { 
          description: m.description, 
          images: m.images || [], 
          video_url: m.video_url 
        }
      };
    })
    // 1. Filter out primary teams to avoid duplication (keyword-based)
    .filter(t => {
      const n = t.name?.toLowerCase() || "";
      const isPrimary = ["praise", "worship", "it", "media", "outreach", "sound"].some(k => n.includes(k));
      return !isPrimary;
    })
    // 2. Strict Filter: Only show if it has rich details (for the Our Team tab)
    // Simple ministries stay in the Profile tab as badges
    .filter(t => t.details && (t.details.description || (t.details.images && t.details.images.length > 0) || t.details.video_url));

  const allTeams = [...teams, ...otherTeams];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f4f4f4' }}>
      <NavbarPremium />

      {/* Banner */}
      <div className="relative">
        <div className="h-56 sm:h-72 md:h-80 overflow-hidden">
          {church.cover_image ? (
            <img 
              src={getImageUrl(church.cover_image, 1200)} 
              alt={church.name} 
              className="w-full h-full object-cover" 
            />
          ) : (
            <div className="w-full h-full bg-slate-200 flex items-center justify-center">
              <Church className="h-20 w-20 text-slate-400/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-slate-900/10" />
        </div>
        <div className="max-w-7xl mx-auto px-4 relative">
          <div className={cn(
            "absolute -bottom-12 left-4 w-24 h-24 rounded-full bg-white border-4 border-white shadow-xl flex items-center justify-center overflow-hidden ring-2 ring-[#6c1cff]/20",
            !church.logo && "p-5"
          )}>
            {church.logo ? (
              <img src={getImageUrl(church.logo, 200, 200)} alt={church.name} className="w-full h-full object-cover" />
            ) : (
              <img src={getFallbackImage('church')} alt={church.name} className="w-full h-full object-cover" />
            )}
          </div>
        </div>
      </div>

      {/* Header info */}
      <div className="max-w-7xl mx-auto px-4 pt-16 pb-0 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-700">{church.name}</h1>
              {church.is_verified && (
                <span className="px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Verified
                </span>
              )}
            </div>
            {church.tagline && (
              <p className="text-slate-500 text-sm mt-1.5 italic">{church.tagline}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-sm text-slate-500 flex-wrap">
              <span className="flex items-center gap-1"><MapPin size={14} /> {[church.city, church.state].filter(Boolean).join(', ')}</span>
            </div>
          </div>
          <Button 
            onClick={scrollToSchedule}
            className={cn(
              "gap-2 shrink-0 self-start shadow-xl transition-all font-medium px-6 h-11 rounded-full border-none",
              currentStatus 
                ? "bg-green-600 hover:bg-green-700 text-white shadow-green-600/20" 
                : "bg-[#f6c5ff] hover:bg-[#efb1f9] text-slate-600 shadow-[#f6c5ff]/40"
            )}
          >
            <Clock size={16} /> 
            {currentStatus ? "Open Now" : "See Open Hours"}
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 mt-6 border-b border-slate-200">
          <button
            onClick={() => setActiveTab("profile")}
            className={`pb-3 text-sm font-semibold transition-all border-b-2 ${activeTab === "profile" ? "border-[#6c1cff] text-[#6c1cff]" : "border-transparent text-slate-400 hover:text-slate-600"}`}
          >
            Profile
          </button>
          {allTeams.length > 0 && (
            <button
              onClick={() => setActiveTab("our-team")}
              className={`pb-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-1.5 ${activeTab === "our-team" ? "border-[#6c1cff] text-[#6c1cff]" : "border-transparent text-slate-400 hover:text-slate-600"}`}
            >
              Our Team
            </button>
          )}
        </div>
      </div>

      {/* Action buttons row */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {[
            { 
              icon: Navigation, 
              label: "Get directions", 
              primary: true, 
              onClick: () => {
                const query = (church.latitude && church.longitude) 
                  ? `${church.latitude},${church.longitude}` 
                  : `${church.address_line1}, ${church.city}`;
                window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`);
              } 
            },
            { icon: PhoneCall, label: "Call now", onClick: () => church.phone && window.open(`tel:${church.phone}`) },
            { icon: Link2, label: "Website", onClick: () => church.website && window.open(ensureExternalUrl(church.website)) },
            { 
              icon: isBookmarked ? Heart : Bookmark, 
              label: isBookmarked ? "Saved" : "Bookmark", 
              active: isBookmarked,
              onClick: handleBookmarkToggle 
            },
            { icon: Share2, label: "Share", onClick: handleShare },
            { 
              icon: ShieldCheck,
              label: "Claim listing",
              primary: false,
              onClick: () => {
                if (!isAuthenticated) {
                  toast.info("Please sign in to claim this listing");
                  navigate('/auth/login', { state: { from: { pathname: `/church/${slug}` } } });
                  return;
                }
                setIsClaimModalOpen(true);
              }
            },
          ].map((btn) => (
            <button
              key={btn.label}
              onClick={btn.onClick}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm whitespace-nowrap shrink-0 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                btn.primary
                  ? "bg-[#6c1cff] text-white border-[#6c1cff] shadow-md shadow-[#6c1cff]/20 hover:shadow-lg hover:shadow-[#6c1cff]/30"
                  : btn.active
                    ? "bg-[#6c1cff]/10 text-[#6c1cff] border-[#6c1cff] font-semibold"
                    : "border-slate-200 bg-white text-slate-700 hover:border-[#6c1cff] hover:text-[#6c1cff] hover:shadow-sm"
              }`}
            >
              <btn.icon size={16} className={btn.active ? "fill-[#6c1cff]" : ""} /> {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Layout Container */}
      <div className="max-w-7xl mx-auto px-4 pb-12 transition-all duration-500">
        <div className={activeTab === 'profile' ? "grid lg:grid-cols-5 gap-6" : "block"}>

          {/* LEFT COLUMN — Main content */}
          <div className={cn("space-y-6", activeTab === 'profile' && "lg:col-span-3")}>
            {activeTab === "profile" ? (
              <>
                {/* About Church */}
                <SectionCard className="p-6">
                  <SectionHeading 
                    icon={Church} 
                    title="About Church" 
                  />
                  <div 
                    className="text-slate-700 text-sm leading-relaxed mb-5" 
                    dangerouslySetInnerHTML={{ __html: church.description || "Welcome to our spiritual community." }} 
                  />
                  <div className="grid sm:grid-cols-1 gap-3">
                    <div className="flex items-center gap-3 p-4 rounded-[5px] bg-gradient-to-r from-[#6c1cff]/5 to-slate-50 border border-[#6c1cff]/10 hover:border-[#6c1cff]/25 transition-colors w-fit">
                      <div className="w-10 h-10 rounded-[5px] bg-[#6c1cff]/10 flex items-center justify-center shrink-0">
                        <Globe size={18} className="text-[#6c1cff]" />
                      </div>
                      <div className="min-w-0 pr-4">
                        <p className="text-xs text-slate-400 font-medium tracking-tight">Denomination</p>
                        <p className="text-sm text-slate-800 font-medium truncate">
                          {church.denomination || 'Apostolic'}
                        </p>
                      </div>
                    </div>
                  </div>
                </SectionCard>

                {/* Pastor Section */}
                {(pastorProfiles.length > 0 || church.pastor_name) && (
                  <SectionCard className="p-6">
                    <SectionHeading 
                      icon={User} 
                      title="Pastor" 
                    />
                    <div className="space-y-5 mt-2">
                      {pastorProfiles.map((p, idx) => {
                        const linkId = p?.slug || church.pastor_slug || p?.id || p?._id || church.pastor_id;
                        const hasLink = !!linkId;
                        const displayName = p?.name || church.pastor_name || 'Senior Pastor';
                        const profilePic = p?.profile_picture || church.pastor_image;

                        return (
                          <div 
                            key={idx}
                            onClick={() => hasLink && navigate(`/pastor/${linkId}`)}
                            className={cn(
                              "flex items-center gap-4 transition-all group",
                              hasLink && "cursor-pointer"
                            )}
                          >
                              <div className={cn(
                                "w-16 h-16 rounded-full overflow-hidden border-2 border-[#6c1cff]/10 group-hover:border-[#6c1cff]/30 transition-all bg-slate-100 flex items-center justify-center",
                                !profilePic && "p-3"
                              )}>
                                {profilePic ? (
                                  <img 
                                    src={getImageUrl(profilePic, 120, 120)} 
                                    alt={displayName} 
                                    className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                                  />
                                ) : (
                                  <img 
                                    src={getFallbackImage('pastor')} 
                                    alt={displayName} 
                                    className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                                  />
                                )}
                              </div>
                            <div className="min-w-0">
                              <h3 className={cn(
                                "text-[16px] font-bold text-slate-800 transition-colors",
                                hasLink && "group-hover:text-[#6c1cff]"
                              )}>
                                {displayName}
                              </h3>
                              <p className="text-xs text-slate-400 font-medium">{p.role || (idx === 0 ? "Senior Pastor" : "Pastor")}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </SectionCard>
                )}

                {/* Worship Styles Section */}
                {church.worship_styles?.length > 0 && (
                  <div className="mb-6">
                    <SectionCard className="p-6">
                      <SectionHeading icon={Sparkles} title="Worship Styles" />
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-3 mt-4">
                        {church.worship_styles.map(s => (
                          <div key={s} className="flex items-center gap-3 group" title={s}>
                            <div className="w-9 h-9 rounded-full bg-[#6c1cff]/5 flex items-center justify-center group-hover:bg-[#6c1cff]/10 transition-colors flex-shrink-0">
                              <Sparkles size={15} className="text-[#6c1cff]" />
                            </div>
                            <span className="text-[13px] font-medium text-slate-800 truncate">{s}</span>
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  </div>
                )}

                {/* Facilities Section */}
                {church.facilities?.length > 0 && (
                  <div className="mb-6">
                    <SectionCard className="p-6">
                      <SectionHeading icon={Building2} title="Facilities" />
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-3 mt-4">
                        {church.facilities.map(f => (
                          <div key={f} className="flex items-center gap-3 group" title={f}>
                            <div className="w-9 h-9 rounded-full bg-[#6c1cff]/5 flex items-center justify-center group-hover:bg-[#6c1cff]/10 transition-colors flex-shrink-0">
                              <Building2 size={15} className="text-[#6c1cff]" />
                            </div>
                            <span className="text-[13px] font-medium text-slate-800 truncate">{f}</span>
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  </div>
                )}

                {/* Ministries Section */}
                {church.ministries && church.ministries.length > 0 && (
                  <SectionCard className="p-6">
                    <SectionHeading icon={HeartHandshake} title="Ministries" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-3 mt-4">
                      {church.ministries.map(m => (
                        <div key={m} className="flex items-center gap-3 group" title={m}>
                          <div className="w-9 h-9 rounded-full bg-[#6c1cff]/5 flex items-center justify-center group-hover:bg-[#6c1cff]/10 transition-colors flex-shrink-0">
                            <HeartHandshake size={15} className="text-[#6c1cff]" />
                          </div>
                          <span className="text-[13px] font-medium text-slate-800 truncate">{m}</span>
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                )}

                {/* Languages Section */}
                {church.languages?.length > 0 && (
                  <div className="mb-6">
                    <SectionCard className="p-6">
                      <SectionHeading icon={Languages} title="Languages" />
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-3 mt-4">
                        {church.languages.map(l => (
                          <div key={l} className="flex items-center gap-3 group" title={l}>
                            <div className="w-9 h-9 rounded-full bg-[#6c1cff]/5 flex items-center justify-center group-hover:bg-[#6c1cff]/10 transition-colors flex-shrink-0">
                              <Languages size={15} className="text-[#6c1cff]" />
                            </div>
                            <span className="text-[13px] font-medium text-slate-800 truncate">{l}</span>
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  </div>
                )}

                {/* Gallery */}
                {church.gallery_images?.length > 0 && (
                  <div className="mb-6">
                    <SectionCard className="p-6">
                      <SectionHeading icon={Camera} title="Gallery" />
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {church.gallery_images.slice(0, 6).map((img, i) => {
                          const isLast = i === 5 && church.gallery_images.length > 6;
                          return (
                            <div 
                              key={i} 
                              className="aspect-[4/3] rounded-[5px] overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all group relative" 
                              onClick={() => openLightbox(church.gallery_images, i)}
                            >
                              <img
                                src={getImageUrl(img)}
                                alt={`Gallery ${i}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                              />
                              {isLast && (
                                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center transition-opacity group-hover:bg-black/70">
                                  <span className="text-white text-xl md:text-2xl font-bold">
                                    +{church.gallery_images.length - 5}
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
                  </div>
                )}

                {/* Video */}
                {church.video_url && (
                  <SectionCard className="p-6">
                    <SectionHeading icon={Video} title="Featured Video" />
                    <div className="rounded-[5px] overflow-hidden aspect-video shadow-lg">
                      <iframe
                        className="w-full h-full border-0"
                        src={getYouTubeEmbedUrl(church.video_url)}
                        title="Church Video"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </SectionCard>
                )}
              </>
            ) : (
              /* Our Team Tab Content - Dynamic Grid (1, 2, or 3 Columns) */
              <div className={cn(
                "grid gap-6 animate-in fade-in duration-500",
                allTeams.length === 1 ? "grid-cols-1 max-w-2xl mx-auto" : 
                allTeams.length === 2 ? "grid-cols-1 md:grid-cols-2" : 
                "grid-cols-1 md:grid-cols-3"
              )}>
                {allTeams.length > 0 ? (
                  allTeams.map((team, i) => (
                    <TeamCard key={i} team={team} i={i} onImageClick={openLightbox} />
                  ))
                ) : (
                  <div className="col-span-full">
                    <SectionCard className="p-12 text-center text-slate-400">
                      <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p className="font-medium">No team details available yet.</p>
                    </SectionCard>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN — Sidebar (Conditional) */}
          {activeTab === 'profile' && (
            <div className="space-y-6 sticky top-24 self-start lg:col-span-2">
              {/* Service Schedule */}
              {Object.keys(groupedServices).length > 0 && (
                <div id="service-schedule">
                  <SectionCard className="p-5">
                    <SectionHeading icon={Clock} title="Service Schedule" />
                    <div className="space-y-2.5">
                      {Object.entries(groupedServices).map(([day, times]) => (
                        <div key={day} className="space-y-2 last:pb-0 border-b last:border-0 border-slate-50 pb-2">
                          <div className="space-y-1.5">
                            {times.map((t, idx) => (
                              <div key={idx} className="flex gap-1.5 text-[13px] text-slate-600 font-medium leading-relaxed items-center">
                                <span className="w-[84px] shrink-0 tracking-tight">{day}</span>
                                <span className="text-slate-200 text-[10px] shrink-0 font-normal">|</span>
                                <span className="flex-1 truncate font-medium text-slate-500 pl-1">{t.title}</span>
                                {t.time && (
                                  <>
                                    <span className="text-slate-200 text-[10px] shrink-0 font-normal">•</span>
                                    <span className="shrink-0 font-medium text-slate-700">{t.time}</span>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                </div>
              )}



              {/* Location Map */}
              <SectionCard className="overflow-hidden p-5">
                <SectionHeading icon={MapPin} title="Location" />
                <div className="h-48 relative rounded-[5px] overflow-hidden mb-5">
                  <GoogleMap 
                    address={church.address_line1}
                    city={church.city}
                    state={church.state}
                    latitude={church.latitude}
                    longitude={church.longitude}
                    churchName={church.name}
                  />
                </div>
                <div className="space-y-3">
                  {[
                    { icon: MapPin, text: [church.address_line1, church.city, church.state].filter(Boolean).join(', ') + (church.zip_code ? ` ${church.zip_code}` : ''), isLink: false, show: !!(church.address_line1 || church.city || church.state) },
                    { icon: Phone, text: church.phone, isLink: true, href: `tel:${church.phone}`, show: !!church.phone },
                    { icon: Mail, text: church.email, isLink: true, href: `mailto:${church.email}`, show: !!church.email },
                    { icon: Globe, text: church.website, isLink: true, href: church.website?.startsWith('http') ? church.website : `https://${church.website}`, show: !!church.website },
                  ].filter(item => item.show).map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 group">
                      <div className="w-8 h-8 rounded-[5px] bg-[#6c1cff]/10 flex items-center justify-center shrink-0 group-hover:bg-[#6c1cff]/20 transition-colors">
                        <item.icon size={14} className="text-[#6c1cff]" />
                      </div>
                      {item.isLink ? (
                        <a href={item.href} target="_blank" rel="noreferrer" className="text-sm text-[#6c1cff] hover:underline pt-1.5 transition-colors break-all">{item.text}</a>
                      ) : (
                        <p className="text-sm text-slate-800 pt-1.5 leading-tight break-words">{item.text}</p>
                      )}
                    </div>
                  ))}
                  <div className="pt-3 mt-1 border-t border-slate-100 flex flex-wrap gap-2">
                    {[
                      { icon: Instagram, url: church.instagram, label: "Instagram", hover: "hover:bg-[#E4405F] hover:border-[#E4405F]" },
                      { icon: Youtube, url: church.youtube, label: "YouTube", hover: "hover:bg-[#FF0000] hover:border-[#FF0000]" },
                      { icon: Facebook, url: church.facebook, label: "Facebook", hover: "hover:bg-[#1877F2] hover:border-[#1877F2]" },
                      { icon: Linkedin, url: church.linkedin, label: "LinkedIn", hover: "hover:bg-[#0A66C2] hover:border-[#0A66C2]" },
                      { icon: XIcon, url: church.twitter, label: "X", hover: "hover:bg-black hover:border-black" },
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

              {/* Contact Form */}
              <div className="bg-white rounded-[5px] p-5 border border-slate-200 shadow-sm">
                <SectionHeading icon={Mail} title="Contact Form" />
                <form className="space-y-3" onSubmit={handleSendMessage}>
                  <input 
                    type="text" 
                    placeholder="Your Name" 
                    value={messageData.name}
                    onChange={(e) => setMessageData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-[5px] border border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-[#6c1cff]/10 focus:border-[#6c1cff] transition-all text-sm outline-none"
                  />
                  <div className="space-y-1">
                    <input 
                      type="email" 
                      placeholder="Your Email" 
                      value={messageData.email}
                      onChange={(e) => setMessageData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-[5px] border border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-[#6c1cff]/10 focus:border-[#6c1cff] transition-all text-sm outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <input 
                      type="tel" 
                      placeholder="Your Phone Number" 
                      value={messageData.phone || ''}
                      onChange={(e) => setMessageData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-[5px] border border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-[#6c1cff]/10 focus:border-[#6c1cff] transition-all text-sm outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <textarea 
                      placeholder="Write your message..." 
                      rows={4}
                      value={messageData.message}
                      onChange={(e) => setMessageData(prev => ({ ...prev, message: e.target.value }))}
                      className="w-full px-4 py-3 rounded-[5px] border border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-[#6c1cff]/10 focus:border-[#6c1cff] transition-all text-sm outline-none resize-none"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={sendingMessage}
                    className="w-full bg-[#6c1cff] text-white hover:bg-[#5a15d4] h-11 rounded-[5px] font-bold shadow-lg shadow-[#6c1cff]/10 gap-2 transition-all active:scale-95"
                  >
                    <Send size={15} /> Send
                  </Button>
                </form>
              </div>

              {/* Network & Branches */}
              {(mainBranch || otherSisterChurches.length > 0 || church.main_branch_id === 'none') && (
                <SectionCard className="p-5">
                  <SectionHeading icon={Layers} title="Branch Churches" />
                  
                  {/* Status Indicator removed */}
                  {mainBranch && (
                    <div className="mb-6">
                      <div 
                        onClick={() => navigate(`/church/${mainBranch.slug || mainBranch.id}`)}
                        className="relative flex items-center gap-3 p-4 rounded-[5px] bg-white border border-slate-100 hover:border-[#6c1cff]/30 hover:bg-[#6c1cff]/5 transition-all cursor-pointer group"
                      >
                        <div className="w-10 h-10 rounded-full bg-white border border-[#6c1cff]/10 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                          {mainBranch.logo ? (
                            <img src={getImageUrl(mainBranch.logo)} alt={mainBranch.name} className="w-full h-full object-cover" />
                          ) : (
                            <img src={getFallbackImage('church')} alt={mainBranch.name} className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 group-hover:text-[#6c1cff] transition-colors line-clamp-1 pr-16">
                            {mainBranch.name}
                          </p>
                          {(mainBranch.city || mainBranch.state) && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              {[mainBranch.city, mainBranch.state].filter(Boolean).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sister/Sibling Churches */}
                  {otherSisterChurches.length > 0 && (
                    <div className="space-y-3">
                      {(isBranchesExpanded ? otherSisterChurches : otherSisterChurches.slice(0, 3)).map((resolvedBranch, idx) => {
                        const branchName = resolvedBranch?.name || 
                                         resolvedBranch?.church_name || 
                                         'Secondary Branch';
                        
                        const branchSlug = resolvedBranch?.slug || resolvedBranch?.id;
                        
                        return (
                          <div 
                            key={idx} 
                            onClick={() => branchSlug && navigate(`/church/${branchSlug}`)}
                            className={cn(
                              "relative flex items-center gap-3 transition-all group rounded-[5px] border p-4",
                              branchSlug && "cursor-pointer",
                              "border-slate-100 hover:border-[#6c1cff]/30 hover:bg-[#6c1cff]/5"
                            )}
                          >
                            <div className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                              {resolvedBranch.logo ? (
                                <img src={getImageUrl(resolvedBranch.logo)} alt={branchName} className="w-full h-full object-cover" />
                              ) : (
                                <img src={getFallbackImage('church')} alt={branchName} className="w-full h-full object-cover" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold transition-colors line-clamp-1 text-slate-700 font-medium">
                                {branchName}
                              </p>
                              {(resolvedBranch?.city || resolvedBranch?.state) && (
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {[resolvedBranch.city, resolvedBranch.state].filter(Boolean).join(', ')}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {otherSisterChurches.length > 3 && (
                        <Button 
                          variant="ghost" 
                          onClick={() => setIsBranchesExpanded(!isBranchesExpanded)}
                          className="w-full text-[#6c1cff] hover:text-[#5a15d4] hover:bg-[#6c1cff]/5 text-xs font-bold gap-1.5 h-9 rounded-[5px]"
                        >
                          {isBranchesExpanded ? (
                            <>Show Less <ChevronUp size={14} /></>
                          ) : (
                            <>View More ({otherSisterChurches.length - 3}) <ChevronDown size={14} /></>
                          )}
                        </Button>
                      )}
                    </div>
                  )}
                </SectionCard>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recommended Churches Section */}
      <div className="max-w-7xl mx-auto px-4 py-16 border-t border-slate-100">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800">You may also be interested in</h2>
          <p className="text-slate-500 mt-1">Discover more churches within the {church.denomination} community</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {recommendations.slice(0, 3).map(item => (
            <ChurchCard key={item.id} church={item} />
          ))}
          
          {/* Explore All Card */}
          <Link 
            to="/explore"
            className="group block h-full min-h-[350px]"
          >
            <div className="h-full rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center p-6 text-center transition-all duration-300 group-hover:bg-white group-hover:border-[#6c1cff] group-hover:border-solid hover:shadow-md">
              <div className="w-16 h-16 rounded-full bg-[#6c1cff]/10 flex items-center justify-center text-[#6c1cff] mb-4 group-hover:scale-110 transition-transform">
                <Globe size={30} />
              </div>
              <h3 className="font-bold text-lg text-slate-800 mb-2">Explore All</h3>
              <p className="text-sm text-slate-500">View our entire directory of spiritual communities</p>
              <div className="mt-6 flex items-center justify-center w-10 h-10 rounded-full bg-white border border-slate-200 text-[#6c1cff] group-hover:bg-[#6c1cff] group-hover:text-white transition-colors">
                <ChevronRight size={20} />
              </div>
            </div>
          </Link>
        </div>
      </div>

      <Lightbox 
        isOpen={lightbox.isOpen}
        images={lightbox.images}
        currentIndex={lightbox.currentIndex}
        onClose={() => setLightbox(prev => ({ ...prev, isOpen: false }))}
        onNext={nextImage}
        onPrev={prevImage}
      />

      {church && (
        <ClaimListingModal 
          isOpen={isClaimModalOpen}
          onClose={() => setIsClaimModalOpen(false)}
          listingId={church.id}
          listingType="church"
          listingName={church.name}
        />
      )}
<ChurchChatWidget church={church} />
     
      <Footer />
    </div>
  );
};

// ── AI-Powered ChurchChatWidget ──────────────────────────────────────────────
// Drop-in replacement for ChurchChatWidget in ChurchDetailPage.js
// Uses Claude API to respond intelligently based on church data
// Saves conversations to backend MongoDB

// ── AI-Powered ChurchChatWidget ──────────────────────────────────────────────
// Drop-in replacement for ChurchChatWidget in ChurchDetailPage.js
// Uses Claude API to respond intelligently based on church data
// Saves conversations to backend MongoDB

function ChurchChatWidget({ church }) {
  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState("chat");
  const [chatMsgs, setChatMsgs] = React.useState([
    { id:1, from:"entity", text:`Peace be unto you! 🙏 I'm the virtual assistant for ${church?.name||"our church"}. I'm here 24/7 to answer your questions. How can I help you today?` }
  ]);
  const [prayerMsgs, setPrayerMsgs] = React.useState([
    { id:1, from:"entity", text:"Our pastoral team reads every prayer request personally. Share what's on your heart — you can stay anonymous if you prefer. 🙏" }
  ]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [anon, setAnon] = React.useState(false);
  const [conversationId] = React.useState(`conv_${Date.now()}_${Math.random().toString(36).substr(2,9)}`);
  const [history, setHistory] = React.useState([]);
  const msgsRef = React.useRef(null);
  const API_URL = process.env.REACT_APP_BACKEND_URL || "https://api.churchnavigator.com";

  React.useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  }, [chatMsgs, prayerMsgs, loading]);

  // Build system prompt from real church data
  const buildSystemPrompt = () => {
    const c = church || {};
    const services = (c.services||[]).map(s =>
      `${s.day}: ${s.event_name||"Service"} ${s.start_time||""} — ${s.end_time||""}`
    ).join(", ") || "Please contact us for service times";

    const ministries = (c.ministries||[]).join(", ") || "Various ministries available";
    const languages = (c.languages||[]).join(", ") || "English";
    const facilities = (c.facilities||[]).join(", ") || "";
    const worshipStyles = (c.worship_styles||[]).join(", ") || "";

    return `You are a warm, helpful and faith-filled virtual assistant for ${c.name||"our church"}, a ${c.denomination||"Christian"} church located in ${c.city||"London"}, UK.

CHURCH DETAILS:
- Name: ${c.name||"Our Church"}
- Denomination: ${c.denomination||"Christian"}
- Address: ${c.address_line1||""} ${c.city||"London"}
- Phone: ${c.phone||"Please visit our website"}
- Email: ${c.email||"Please visit our website"}
- Pastor: ${c.pastor_name||"Our Senior Pastor"}
- Service Times: ${services}
- Ministries: ${ministries}
- Languages Spoken: ${languages}
- Facilities: ${facilities}
- Worship Styles: ${worshipStyles}
- Website: ${c.website||"churchnavigator.com"}

YOUR PERSONALITY:
- Warm, welcoming and faith-filled
- Speak as if you truly represent this church community
- Use gentle religious expressions naturally (🙏 ✝️ God bless)
- Be honest — if you don't know something specific, say "I'd recommend contacting us directly"
- Keep responses concise (2-4 sentences max)
- Always make the person feel welcome and valued
- If someone seems to be struggling emotionally, be compassionate and offer to connect them with the pastor

CONTACT CAPTURE:
- If someone says they want to visit, gently ask for their name and email so the welcome team can look out for them
- If someone has a specific need, offer to pass their details to the relevant team

NEVER:
- Make up specific details not in the church data above
- Be preachy or pushy
- Share personal opinions on theology or denominations
- Discuss other churches negatively`;
  };

  const callClaudeAPI = async (userMessage, isPrayer = false) => {
    // Build conversation history for context
    const msgs = isPrayer ? prayerMsgs : chatMsgs;
    const newHistory = [
      ...history,
      { role: "user", content: isPrayer ? `[PRAYER REQUEST] ${userMessage}` : userMessage }
    ];

    try {
      // Try backend first (saves to MongoDB)
      const backendRes = await fetch(`${API_URL}/api/chat/ai-reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          church_id: church?.id,
          church_slug: church?.slug,
          conversation_id: conversationId,
          is_prayer: isPrayer,
          anonymous: anon,
          history: newHistory,
          system_prompt: buildSystemPrompt()
        })
      });

      if (backendRes.ok) {
        const data = await backendRes.json();
        setHistory([...newHistory, { role: "assistant", content: data.reply }]);
        return data.reply;
      }
    } catch (e) {
      // Backend not available — fall through to direct API
    }

    // Direct Claude API call (fallback)
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.REACT_APP_ANTHROPIC_API_KEY || "",
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 300,
          system: buildSystemPrompt(),
          messages: [
            ...newHistory.slice(-6), // last 3 exchanges for context
            { role: "user", content: isPrayer ? `[PRAYER REQUEST] ${userMessage}` : userMessage }
          ]
        })
      });

      if (res.ok) {
        const data = await res.json();
        const reply = data.content?.[0]?.text || getSmartFallback(userMessage, isPrayer);
        setHistory([...newHistory, { role: "assistant", content: reply }]);
        return reply;
      }
    } catch (e) {}

    // Final fallback — smart contextual responses
    return getSmartFallback(userMessage, isPrayer);
  };

  // Smart fallback when API unavailable
  const getSmartFallback = (msg, isPrayer) => {
    if (isPrayer) return "Thank you for trusting us with your prayer request. 🙏 Our pastoral team will lift this before God. You are not alone — He sees you and loves you deeply. ✝️";
    const m = msg.toLowerCase();
    if (m.includes("time") || m.includes("when") || m.includes("sunday") || m.includes("service")) {
      const s = church?.services?.[0];
      return s ? `Our ${s.event_name||"Sunday service"} runs ${s.start_time||""} — ${s.end_time||""} on ${s.day}. We'd love to see you there! 🙏` : "Please contact us directly for our current service times. We'd love to see you! 🙏";
    }
    if (m.includes("park")) return "There is street parking available near the church. We recommend arriving a few minutes early on Sundays! 🙏";
    if (m.includes("child") || m.includes("kid") || m.includes("youth")) return `We have a wonderful children's ministry! 🙏 All ages are welcome at ${church?.name||"our church"}. Please contact us for details about our youth programmes.`;
    if (m.includes("first time") || m.includes("never been") || m.includes("new")) return `Welcome! 🙏 There's nothing to worry about — come as you are. You'll be warmly greeted and can sit wherever you're comfortable. We're so glad you're considering joining us!`;
    if (m.includes("pastor") || m.includes("speak") || m.includes("meet")) return `${church?.pastor_name||"Our pastor"} would love to meet you! 🙏 You're welcome to reach out via the contact form on this page, or simply come along to a service.`;
    if (m.includes("wheelchair") || m.includes("disabled") || m.includes("accessible")) return "Our church is accessible and we welcome everyone regardless of mobility needs. 🙏 Please contact us in advance so we can ensure your visit is comfortable.";
    if (m.includes("volunteer") || m.includes("involved") || m.includes("serve")) return `We'd love for you to get involved! 🙏 ${church?.name||"Our church"} has various teams you can join. Come along to a service and speak to our welcome team!`;
    return `Thank you for reaching out to ${church?.name||"us"}! 🙏 For the best answer, please contact us directly at ${church?.phone||church?.email||"the details on this page"}. God bless you!`;
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    // Moderation
    if (/\b(stupid|idiot|hate|damn|hell|bloody|crap)\b/i.test(text)) {
      toast.info("We kept this one between us 🙏 ChurchNavigator is a place of encouragement and faith. Try sharing something uplifting!");
      setInput("");
      return;
    }

    const userMsg = { id: Date.now(), from: "user", text, anon: anon && tab === "prayer" };
    if (tab === "chat") setChatMsgs(m => [...m, userMsg]);
    else setPrayerMsgs(m => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const reply = await callClaudeAPI(text, tab === "prayer");
      const aiMsg = { id: Date.now()+1, from: "entity", text: reply };
      if (tab === "chat") setChatMsgs(m => [...m, aiMsg]);
      else setPrayerMsgs(m => [...m, aiMsg]);
    } catch(e) {
      const fallback = { id: Date.now()+1, from: "entity", text: getSmartFallback(text, tab === "prayer") };
      if (tab === "chat") setChatMsgs(m => [...m, fallback]);
      else setPrayerMsgs(m => [...m, fallback]);
    } finally {
      setLoading(false);
    }
  };

  const msgs = tab === "chat" ? chatMsgs : prayerMsgs;
  const logo = church?.logo;
  const name = church?.name || "Church";

  return (
    <div style={{ position:"fixed", bottom:24, right:24, zIndex:200 }}>
      {open && (
        <div style={{ position:"absolute", bottom:70, right:0, width:320, borderRadius:20, overflow:"hidden", boxShadow:"0 20px 60px rgba(0,0,0,0.3)", display:"flex", flexDirection:"column", maxHeight:480, background:"#fff" }}>

          {/* Header */}
          <div style={{ background:"linear-gradient(135deg,#0d0520,#1a0d3d)", padding:"14px 16px", display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
            <div style={{ position:"relative", width:42, height:42, flexShrink:0 }}>
              {logo
                ? <img src={logo} alt={name} style={{ width:42, height:42, borderRadius:"50%", objectFit:"cover", display:"block" }} />
                : <div style={{ width:42, height:42, borderRadius:"50%", background:"#6c1cff", display:"flex", alignItems:"center", justifyContent:"center" }}><i className="ti ti-building-church" style={{ fontSize:20, color:"#fff" }} /></div>
              }
              <div style={{ position:"absolute", inset:-3, borderRadius:"50%", border:"2px solid #6c1cff", animation:"ringPulse 2s ease-in-out infinite", pointerEvents:"none" }} />
              <div style={{ position:"absolute", bottom:1, right:1, width:10, height:10, borderRadius:"50%", background:"#10b981", border:"2px solid #0d0520" }} />
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:500, color:"#fff" }}>{name}</div>
              <div style={{ fontSize:10, color:"#6ee7b7", display:"flex", alignItems:"center", gap:4, marginTop:2 }}>
                <div style={{ width:5, height:5, borderRadius:"50%", background:"#10b981" }} />
                AI assistant · Available 24/7
              </div>
            </div>
            <button onClick={()=>setOpen(false)} style={{ background:"rgba(255,255,255,0.1)", border:"none", borderRadius:"50%", width:26, height:26, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"rgba(255,255,255,0.6)", fontSize:18, fontFamily:"inherit" }}>×</button>
          </div>

          {/* Tabs */}
          <div style={{ display:"flex", background:"#f8fafc", borderBottom:"0.5px solid #e2e8f0", flexShrink:0 }}>
            {["chat","prayer"].map(t=>(
              <div key={t} onClick={()=>setTab(t)} style={{ flex:1, padding:8, fontSize:11, fontWeight:500, cursor:"pointer", textAlign:"center", color:tab===t?"#6c1cff":"#64748b", borderBottom:`2px solid ${tab===t?"#6c1cff":"transparent"}`, background:tab===t?"#fff":"transparent" }}>
                {t==="chat"?"💬 Chat":"🙏 Prayer"}
              </div>
            ))}
          </div>

          {/* Messages */}
          <div ref={msgsRef} style={{ flex:1, overflowY:"auto", padding:12, display:"flex", flexDirection:"column", gap:8 }}>
            {msgs.map(msg=>(
              <div key={msg.id} style={{ maxWidth:"85%", alignSelf:msg.from==="user"?"flex-end":"flex-start" }}>
                {msg.from==="entity" && (
                  <div style={{ fontSize:10, color:"#94a3b8", marginBottom:3, paddingLeft:4, display:"flex", alignItems:"center", gap:4 }}>
                    {logo && <img src={logo} alt="" style={{ width:14, height:14, borderRadius:"50%", objectFit:"cover" }} />}
                    AI Assistant
                  </div>
                )}
                <div style={{
                  padding:"9px 12px", fontSize:12, lineHeight:1.6,
                  borderRadius:msg.from==="user"?"14px 4px 14px 14px":"4px 14px 14px 14px",
                  background:msg.from==="user"?"#6c1cff":tab==="prayer"&&msg.from==="entity"?"linear-gradient(135deg,#fef9ec,#fef3c7)":"#f1f5f9",
                  color:msg.from==="user"?"#fff":tab==="prayer"&&msg.from==="entity"?"#78350f":"#1e293b",
                  borderLeft:tab==="prayer"&&msg.from==="entity"?"3px solid #d97706":"none"
                }}>
                  {msg.anon && <div style={{ fontSize:10, opacity:.7, marginBottom:2 }}>Anonymous</div>}
                  {msg.text}
                </div>
                <div style={{ fontSize:10, color:"#94a3b8", marginTop:2, textAlign:msg.from==="user"?"right":"left", padding:"0 4px" }}>
                  {msg.from==="user"?"You":"Just now"}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf:"flex-start", display:"flex", gap:4, padding:"10px 14px", background:"#f1f5f9", borderRadius:"4px 14px 14px 14px" }}>
                {[0,1,2].map(i=>(
                  <div key={i} style={{ width:6, height:6, borderRadius:"50%", background:"#94a3b8", animation:`dotBounce 1.2s ease-in-out infinite ${i*0.2}s` }} />
                ))}
              </div>
            )}
          </div>

          {/* Anonymous toggle (prayer only) */}
          {tab==="prayer" && (
            <div style={{ padding:"6px 12px", background:"#f8fafc", borderTop:"0.5px solid #e2e8f0", flexShrink:0 }}>
              <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, color:"#64748b", cursor:"pointer" }}>
                <input type="checkbox" checked={anon} onChange={e=>setAnon(e.target.checked)} /> Stay anonymous
              </label>
            </div>
          )}

          {/* Input */}
          <div style={{ display:"flex", gap:8, padding:"10px 12px", background:"#fff", borderTop:"0.5px solid #e2e8f0", flexShrink:0 }}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()}
              placeholder={tab==="chat"?"Ask anything about our church...":"Share your prayer request..."}
              disabled={loading}
              style={{ flex:1, padding:"8px 12px", fontSize:12, border:"0.5px solid #e2e8f0", borderRadius:20, background:"#f8fafc", fontFamily:"inherit", outline:"none", opacity:loading?0.6:1 }} />
            <button onClick={send} disabled={loading||!input.trim()} style={{ width:34, height:34, borderRadius:"50%", background:input.trim()&&!loading?"#6c1cff":"#e2e8f0", border:"none", display:"flex", alignItems:"center", justifyContent:"center", cursor:input.trim()&&!loading?"pointer":"default", flexShrink:0, transition:"background 0.2s" }}>
              <i className="ti ti-send" style={{ fontSize:15, color:input.trim()&&!loading?"#fff":"#94a3b8" }} />
            </button>
          </div>

          <style>{`
            @keyframes ringPulse{0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(108,28,255,0.4)}50%{transform:scale(1.05);box-shadow:0 0 0 6px rgba(108,28,255,0)}}
            @keyframes dotBounce{0%,100%{transform:translateY(0);opacity:0.4}50%{transform:translateY(-4px);opacity:1}}
          `}</style>
        </div>
      )}

      {/* Floating pill */}
      <div onClick={()=>setOpen(o=>!o)} style={{ display:"flex", alignItems:"center", gap:10, background:"#fff", border:"0.5px solid #e2e8f0", borderRadius:50, padding:"8px 16px 8px 8px", boxShadow:"0 8px 30px rgba(108,28,255,0.25)", cursor:"pointer", userSelect:"none" }}>
        <div style={{ position:"relative", width:44, height:44, flexShrink:0 }}>
          {logo
            ? <img src={logo} alt={name} style={{ width:44, height:44, borderRadius:"50%", objectFit:"cover", display:"block" }} />
            : <div style={{ width:44, height:44, borderRadius:"50%", background:"#6c1cff", display:"flex", alignItems:"center", justifyContent:"center" }}><i className="ti ti-building-church" style={{ fontSize:20, color:"#fff" }} /></div>
          }
          <div style={{ position:"absolute", inset:-3, borderRadius:"50%", border:"2px solid #6c1cff", animation:"ringPulse 2s ease-in-out infinite", pointerEvents:"none" }} />
          <div style={{ position:"absolute", bottom:1, right:1, width:12, height:12, borderRadius:"50%", background:"#10b981", border:"2px solid #fff" }} />
        </div>
        <div>
          <div style={{ fontSize:12, fontWeight:500, color:"#1e293b" }}>{name}</div>
          <div style={{ fontSize:11, color:"#6c1cff" }}>Ask our AI assistant 🤖</div>
        </div>
      </div>

    </div>
  );
}

export default ChurchDetailPage;
