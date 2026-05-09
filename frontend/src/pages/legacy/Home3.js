import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, MapPin, Church, User, CheckCircle, 
  ArrowRight, Sparkles, Clock, ChevronRight,
  Shield, Users, Globe, Play
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { 
  Tabs, TabsList, TabsTrigger 
} from '../components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../components/ui/select';
import { NavbarPremium } from '../components/NavbarPremium';
import { FooterPremium } from '../components/FooterPremium';
import { taxonomyAPI, homepageAPI } from '../lib/api';
import './Home3.css';

const Home3 = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('churches');
  const [searchData, setSearchData] = useState({ name: '', location: '', denomination: '' });
  const [data, setData] = useState({
    featuredChurches: [],
    openChurches: [],
    featuredPastors: [],
    denominations: []
  });
  const [loading, setLoading] = useState(true);
  const [scrollY, setScrollY] = useState(0);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const heroRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [churchData, pastorData, openData, taxData] = await Promise.all([
          homepageAPI.getFeaturedChurches(),
          homepageAPI.getFeaturedPastors(),
          homepageAPI.getOpenChurches(),
          taxonomyAPI.getAll()
        ]);
        setData({
          featuredChurches: churchData.data || [],
          featuredPastors: pastorData.data || [],
          openChurches: openData.data || [],
          denominations: taxData.data.denomination || []
        });
      } catch (error) {
        console.error("Error fetching homepage data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (loading) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [loading]);

  const handleSearch = () => {
    const queryParams = new URLSearchParams();
    if (searchData.name) queryParams.set('name', searchData.name);
    if (searchData.location) queryParams.set('location', searchData.location);
    if (searchData.denomination) queryParams.set('denomination', searchData.denomination);
    navigate(`/explore?type=${activeTab}&${queryParams.toString()}`);
  };

  const SplitText = ({ text }) => {
    return text.split(' ').map((word, i) => (
      <span key={i} className="inline-block overflow-hidden mr-[0.3em]">
        <span className="inline-block animate-word-reveal" style={{ animationDelay: `${i * 0.1}s` }}>
          {word}
        </span>
      </span>
    ));
  };

  const CustomChurchCard = ({ church }) => {
    const cardRef = useRef(null);
    const [tilt, setTilt] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      setTilt({ x: x * 15, y: -y * 15 });
    };

    const imageUrl = church.cover_image 
      ? (church.cover_image.startsWith('http') ? church.cover_image : `http://localhost:8000/uploads/${church.cover_image}`)
      : 'https://images.unsplash.com/photo-1438032005730-c779502df39b?auto=format&fit=crop&q=80&w=800';

    return (
      <div 
        ref={cardRef}
        className="custom-church-card group"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTilt({ x: 0, y: 0 })}
        style={{
          transform: `perspective(1000px) rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)`
        }}
      >
        <div className="card-image-wrap">
          <img src={imageUrl} alt={church.name} className="card-image group-hover:scale-110 transition-transform duration-700" />
          <div className="card-content-overlay">
            <div className="overlay-inner p-8 flex flex-col justify-end h-full">
              <h3 className="text-2xl font-bold text-white mb-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">{church.name}</h3>
              <p className="text-white/70 text-sm mb-6 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">{church.city}, {church.state}</p>
              <Button 
                onClick={() => navigate(`/church/${church.slug || church.id}`)}
                className="w-fit bg-white text-slate-900 hover:bg-brand hover:text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 delay-200"
              >
                View Details <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const CustomPastorCard = ({ pastor }) => {
    const imageUrl = pastor.profile_picture 
      ? (pastor.profile_picture.startsWith('http') ? pastor.profile_picture : `http://localhost:8000/uploads/${pastor.profile_picture}`)
      : 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=600';

    return (
      <div className="custom-pastor-card group" onClick={() => navigate(`/pastor/${pastor.slug || pastor.id}`)}>
        <div className="pastor-image-box">
          <img src={imageUrl} alt={pastor.name} className="pastor-img group-hover:scale-110 transition-transform duration-700" />
          <div className="pastor-bio-overlay">
            <div className="p-6 text-white h-full flex flex-col justify-end">
              <h4 className="font-bold text-xl">{pastor.name}</h4>
              <p className="text-xs text-white/60 mb-2 truncate">{pastor.current_designation || 'Spiritual Leader'}</p>
              <p className="text-xs line-clamp-2 opacity-0 group-hover:opacity-100 transition-all duration-500">{pastor.bio || 'Leading the community with faith and vision.'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="home3-container">
      <NavbarPremium />

      {/* Hero Section */}
      <section ref={heroRef} className="hero-section">
        <div className="hero-parallax-bg" style={{ transform: `translateY(${scrollY * 0.4}px)` }}>
           <div className="hero-overlay"></div>
           <div className="particles-container">
             {[...Array(20)].map((_, i) => (
               <div key={i} className="particle" style={{
                 left: `${Math.random() * 100}%`,
                 top: `${Math.random() * 100}%`,
                 animationDelay: `${Math.random() * 5}s`,
                 animationDuration: `${10 + Math.random() * 15}s`
               }}></div>
             ))}
           </div>
        </div>
        
        <div className="hero-content container mx-auto px-4 z-10 text-center">
          <div className="reveal">
            <span className="badge">Next Gen Faith Discovery</span>
          </div>
          <h1 className="hero-title">
            <SplitText text="Experience The Future of Faith Communities" />
          </h1>
          <p className="hero-subtitle reveal delay-1">
            Immersive. Verified. Spiritual. Connecting over 1200+ faith communities globally.
          </p>

          <div className={`search-container ${isSearchExpanded ? 'expanded' : ''} reveal delay-2`}>
            <div className="search-glass" onClick={() => setIsSearchExpanded(true)}>
              <div className="flex flex-col lg:flex-row gap-4 items-center">
                <div className="search-input-group flex-1">
                  <Search className="search-icon" />
                  <input 
                    type="text" 
                    placeholder={`Search ${activeTab}...`}
                    value={searchData.name}
                    onChange={(e) => setSearchData({...searchData, name: e.target.value})}
                    onFocus={() => setIsSearchExpanded(true)}
                  />
                </div>
                
                {isSearchExpanded && (
                  <>
                    <div className="search-input-group flex-1 animate-fade-in">
                      <MapPin className="search-icon" />
                      <input 
                        type="text" 
                        placeholder="Location"
                        value={searchData.location}
                        onChange={(e) => setSearchData({...searchData, location: e.target.value})}
                      />
                    </div>
                    <div className="search-input-group flex-1 animate-fade-in">
                      <Select value={searchData.denomination} onValueChange={(v) => setSearchData({ ...searchData, denomination: v })}>
                        <SelectTrigger className="search-trigger">
                          <SelectValue placeholder="Denomination" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white">
                          {data.denominations.map(d => (
                            <SelectItem key={d} value={d} className="focus:bg-white/10">{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                <Button onClick={handleSearch} className="search-btn">
                  {isSearchExpanded ? 'Explore Now' : <Search />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section py-20 bg-white">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            { label: 'Communities', value: '1,200+', icon: Shield },
            { label: 'Verified Leaders', value: '450+', icon: CheckCircle },
            { label: 'Global Cities', value: '85+', icon: Globe },
            { label: 'Open Now', value: '12', icon: Play },
          ].map((stat, i) => (
            <div key={i} className="stat-card reveal" style={{ transitionDelay: `${i * 0.1}s` }}>
              <div className="stat-icon-wrapper">
                <stat.icon className="stat-icon" />
              </div>
              <div className="stat-info">
                <h3 className="stat-value">{stat.value}</h3>
                <p className="stat-label">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Churches */}
      <section className="featured-churches-section py-32 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="section-header reveal mb-20 flex flex-col md:flex-row justify-between items-end gap-8">
            <div className="max-w-xl">
              <span className="badge">Featured Selection</span>
              <h2 className="section-title">Verified <span className="gradient-text">Faith Communities</span></h2>
              <p className="text-slate-500 mt-4">Discover churches that align with your spiritual journey, vetted for excellence and impact.</p>
            </div>
            <Button variant="link" className="text-brand group" onClick={() => navigate('/explore?type=churches')}>
              Explore All <ChevronRight className="ml-1 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {loading ? (
              [...Array(3)].map((_, i) => <div key={i} className="h-[450px] rounded-3xl shimmer" />)
            ) : data.featuredChurches.slice(0, 3).map((church) => (
              <div key={church.id} className="reveal section-stagger">
                <CustomChurchCard church={church} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="why-us-section py-32 bg-slate-950 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-brand/10 blur-[120px] rounded-full"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-24 reveal">
            <h2 className="section-title text-white">Why <span className="gradient-text">Choose Us</span></h2>
            <p className="text-white/40 max-w-xl mx-auto mt-6 text-lg">Elevating the way you find, connect, and grow with your faith community.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { title: 'Smart Match', desc: 'Find communities that align with your worship style and values.', icon: Sparkles },
              { title: 'Verified Profiles', desc: 'Secure connection with vetted spiritual leaders and pastors.', icon: Shield },
              { title: 'Global Presence', desc: 'Access faith resources across 80+ major cities worldwide.', icon: Globe },
            ].map((feature, i) => (
              <div key={i} className="feature-card reveal" style={{ transitionDelay: `${i * 0.1}s` }}>
                <div className="feature-icon-box">
                  <feature.icon className="feature-icon" />
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-desc">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Leadership Section */}
      <section className="pastors-section py-32 bg-white">
        <div className="container mx-auto px-4 mb-20 text-center">
          <div className="reveal">
            <span className="badge">Vetted Leadership</span>
            <h2 className="section-title">Spiritual <span className="gradient-text">Visionaries</span></h2>
            <p className="text-slate-500 max-w-lg mx-auto mt-4">Connect with leaders who are shaping the spiritual landscape of today.</p>
          </div>
        </div>

        <div className="pastors-scroll-container">
          <div className="pastors-track">
            {loading ? (
              [...Array(6)].map((_, i) => <div key={i} className="w-[320px] h-[450px] shrink-0 rounded-3xl shimmer mx-6" />)
            ) : data.featuredPastors.map((pastor, i) => (
              <div key={pastor.id} className="pastor-card-wrap reveal" style={{ transitionDelay: `${i * 0.15}s` }}>
                <CustomPastorCard pastor={pastor} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer-immersive pt-32 pb-12 bg-slate-950 text-white relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-brand/50 to-transparent"></div>
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-20 mb-32">
            <div className="reveal">
              <div className="text-3xl font-bold gradient-text mb-8">Church Navigator</div>
              <p className="text-white/40 leading-relaxed mb-10 text-lg">
                The modern standard for global faith exploration and community building.
              </p>
              <div className="flex gap-4">
                {[...Array(4)].map((_, i) => <div key={i} className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center hover:bg-brand transition-all cursor-pointer border border-white/5"><Globe size={18} /></div>)}
              </div>
            </div>

            <div className="reveal delay-1">
              <h4 className="text-xs font-bold uppercase tracking-[0.2em] mb-10 text-white/50">Discovery</h4>
              <ul className="space-y-6">
                {['Find Communities', 'Meet Leaders', 'Live Experience', 'Verified Badge'].map(link => (
                  <li key={link} className="footer-link-anim text-lg">{link}</li>
                ))}
              </ul>
            </div>

            <div className="reveal delay-2">
              <h4 className="text-xs font-bold uppercase tracking-[0.2em] mb-10 text-white/50">Ecosystem</h4>
              <ul className="space-y-6">
                {['About Vision', 'Testimonials', 'Partner with us', 'Active Support'].map(link => (
                  <li key={link} className="footer-link-anim text-lg">{link}</li>
                ))}
              </ul>
            </div>

            <div className="reveal delay-3">
              <h4 className="text-xs font-bold uppercase tracking-[0.2em] mb-10 text-white/50">Journal</h4>
              <p className="text-white/40 mb-8 text-sm">Join our newsletter for spiritual insights.</p>
              <div className="newsletter-wrapper">
                <input type="email" placeholder="Email" className="newsletter-input" />
                <button className="newsletter-btn"><ChevronRight /></button>
              </div>
            </div>
          </div>

          <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center text-white/30 text-[10px] uppercase tracking-widest gap-8">
            <p>© 2026 CHURCH NAVIGATOR. REDEFINING FAITH CONNECTIVITY.</p>
            <div className="flex gap-12">
              <span className="hover:text-white cursor-pointer transition-colors">Privacy Ethics</span>
              <span className="hover:text-white cursor-pointer transition-colors">Digital Terms</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home3;
