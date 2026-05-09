import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Search, MapPin, Church, User, CheckCircle, 
  ArrowRight, Sparkles, Clock 
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { 
  Tabs, TabsList, TabsTrigger 
} from '../components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../components/ui/select';
import { NavbarPremium } from '../components/NavbarPremium';
import { Footer } from '../components/Footer';
import { ChurchCard } from '../components/ChurchCard';
import { PastorCard } from '../components/PastorCard';
import { taxonomyAPI, homepageAPI } from '../lib/api';
import './Home2.css';

const Home2 = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('churches');
  const [searchData, setSearchData] = useState({ name: '', location: '', denomination: '' });
  const [data, setData] = useState({
    featuredChurches: [],
    openChurches: [],
    featuredPastors: [],
    newPastors: [],
    denominations: []
  });
  const [loading, setLoading] = useState(true);
  const heroRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [churchData, pastorData, openData, taxData, newData] = await Promise.all([
          homepageAPI.getFeaturedChurches(),
          homepageAPI.getFeaturedPastors(),
          homepageAPI.getOpenChurches(),
          taxonomyAPI.getAll(),
          homepageAPI.getNewPastors()
        ]);
        setData({
          featuredChurches: churchData.data || [],
          featuredPastors: pastorData.data || [],
          openChurches: openData.data || [],
          newPastors: newData.data || [],
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

  // Simplified Reveal Animation logic (no 3D)
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
    if (searchData.name) queryParams.set('search', searchData.name);
    if (searchData.location) queryParams.set('city', searchData.location);
    if (searchData.denomination) queryParams.set('denomination', searchData.denomination);
    navigate(`/explore?type=${activeTab === 'churches' ? 'church' : 'pastor'}&${queryParams.toString()}`);
  };


  return (
    <div className="home2-container min-h-screen font-sans" style={{ backgroundColor: '#f4f4f4' }}>
      <NavbarPremium />

      {/* Hero Section */}
      <section 
        ref={heroRef} 
        className="relative min-h-screen flex items-center justify-center pt-24 overflow-hidden bg-hero-dark-custom"
        style={{
          backgroundImage: `linear-gradient(rgba(2, 6, 23, 0.7), rgba(2, 6, 23, 0.85)), url('/hero-church-3.jpg')`
        }}
      >
        <div className="aura-blob top-[-10%] left-[-10%] opacity-20"></div>
        <div className="aura-blob bottom-[-10%] right-[-10%] opacity-10 delay-1000" style={{ animationDelay: '2s' }}></div>
        
        <div className="relative z-10 max-w-6xl mx-auto px-4 text-center">
          <div className="reveal">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-[1.05] text-white hero-text-glow tracking-tight">
              Find Your <span className="text-gradient">Spiritual</span> Home
            </h1>
            <p className="text-lg md:text-xl text-white/50 mb-12 max-w-2xl mx-auto font-light leading-relaxed tracking-wide">
              Experience the next generation of faith exploration. Verified communities, real connections, zero clutter.
            </p>
          </div>

          {/* De-Clustered Premium Search Bar - Dark Glass Mod for Hero */}
          <div className="reveal delay-1 max-w-5xl mx-auto">
            <div className="bg-white/12 backdrop-blur-3xl rounded-[2.5rem] p-6 border border-white/20 shadow-[0_0_50px_rgba(108,28,255,0.15)] transition-all">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-white/10 backdrop-blur-md rounded-xl mb-8 self-center p-1 w-fit mx-auto border border-white/10">
                  <TabsTrigger value="churches" className="rounded-lg px-8 h-9 text-xs uppercase tracking-widest data-[state=active]:bg-brand data-[state=active]:text-white transition-all">
                    <Church className="h-4 w-4 mr-2" /> Churches
                  </TabsTrigger>
                  <TabsTrigger value="pastors" className="rounded-lg px-8 h-9 text-xs uppercase tracking-widest data-[state=active]:bg-brand data-[state=active]:text-white transition-all">
                    <User className="h-4 w-4 mr-2" /> Pastors
                  </TabsTrigger>
                </TabsList>

                <div className="flex flex-col lg:flex-row items-stretch gap-4">
                  <div className="flex-[1.5] flex items-center px-5 bg-white/10 rounded-2xl border border-white/10 focus-within:border-brand/40 transition-all">
                    <Search className="h-4 w-4 text-brand mr-3" />
                    <input 
                      type="text" 
                      placeholder={activeTab === 'churches' ? "Search church name..." : "Search pastor profile..."} 
                      className="bg-transparent border-none focus:ring-0 focus:outline-none focus-visible:ring-0 w-full h-14 text-sm text-white font-medium placeholder:text-white/60"
                      value={searchData.name}
                      onChange={(e) => setSearchData({...searchData, name: e.target.value})}
                    />
                  </div>
                  
                  <div className="flex-1 flex items-center px-4 bg-white/10 rounded-2xl border border-white/10">
                    <MapPin className="h-4 w-4 text-brand mr-3" />
                    <input 
                      type="text" 
                      placeholder="Near city..." 
                      className="bg-transparent border-none focus:ring-0 w-full h-14 text-sm text-white font-medium placeholder:text-white/60"
                      value={searchData.location}
                      onChange={(e) => setSearchData({...searchData, location: e.target.value})}
                    />
                  </div>

                  <div className="flex-1 flex items-center px-1 bg-white/10 rounded-2xl border border-white/10">
                    <Select value={searchData.denomination} onValueChange={(v) => setSearchData({ ...searchData, denomination: v })}>
                      <SelectTrigger className="border-none bg-transparent focus:ring-0 h-14 shadow-none text-sm text-white/60">
                        <SelectValue placeholder="Denomination" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10 text-white rounded-xl shadow-2xl z-[200]">
                        {[...(data.denominations || [])].sort((a, b) => a.localeCompare(b)).map(d => (
                          <SelectItem 
                            key={d} 
                            value={d} 
                            className="rounded-lg text-sm focus:bg-brand focus:text-white data-[highlighted]:bg-brand data-[highlighted]:text-white transition-colors cursor-pointer"
                          >
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    onClick={handleSearch}
                    className="bg-brand hover:bg-brand-hover text-white px-10 rounded-2xl h-14 text-sm font-bold shadow-xl shadow-brand/20 transition-all active:scale-95 border border-white/5"
                  >
                    Search
                  </Button>
                </div>
              </Tabs>
            </div>
          </div>
        </div>
      </section>

      {/* Refined Premium Minimalist Stats */}
      <section className="relative z-20 py-20 bg-white border-y border-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Verified Listing', value: '1000+', icon: CheckCircle },
              { label: 'Cities Covered', value: '50+', icon: MapPin },
              { label: 'Faith Communities', value: '20+', icon: Church },
              { label: 'Pastors Profiled', value: '500+', icon: User },
            ].map((stat, i) => (
              <div key={i} className="reveal px-8 py-6 rounded-2xl border border-slate-200 bg-slate-100/80 flex items-center justify-center space-x-6 hover:border-brand/30 hover:bg-white hover:shadow-xl hover:shadow-brand/5 transition-all cursor-default">
                <div className="text-3xl font-bold text-slate-900 tracking-tighter">{stat.value}</div>
                <div className="h-4 w-[1px] bg-slate-300"></div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recommended Churches - Light */}
      <section className="py-24 bg-mesh-light/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-left mb-16 reveal">
            <div className="inline-flex items-center text-brand text-xs font-bold tracking-widest uppercase mb-4">
              <Sparkles className="h-3 w-3 mr-2" /> Curated Selections
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
              Recommended <span className="text-gradient">Churches</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loading ? (
              [...Array(6)].map((_, i) => <div key={i} className="h-64 bg-slate-100 rounded-3xl shimmer" />)
            ) : (data.featuredChurches || []).map((church, i) => (
              <div key={church.id} className="reveal transition-transform hover:-translate-y-2 duration-500">
                <ChurchCard church={church} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live & Active - Soft High Impact */}
      <section className="py-24 bg-white border-y border-slate-100 relative overflow-hidden">
        <div className="aura-blob top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-150 opacity-40"></div>
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-left mb-16 reveal">
            <div className="inline-flex items-center text-brand text-xs font-bold tracking-widest uppercase mb-4">
               <Clock className="h-3 w-3 mr-2" /> Live Interaction
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
              Worship <span className="text-gradient">Right Now</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {(data.openChurches || []).length > 0 ? (
              (data.openChurches || []).map((church, i) => (
                <div key={church.id} className="reveal transition-transform hover:-translate-y-2 duration-500">
                   <ChurchCard church={church} />
                </div>
              ))
            ) : (
              <div className="col-span-full h-64 flex flex-col items-center justify-center border border-slate-100 rounded-[2.5rem] bg-slate-50/50 backdrop-blur-md">
                <Clock className="h-8 w-8 text-slate-300 mb-4" />
                <p className="text-slate-400 text-sm">No sessions active currently.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Spiritual Leadership - Light */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-left mb-16 reveal">
            <div className="inline-flex items-center text-brand text-xs font-bold tracking-widest uppercase mb-4">
               <User className="h-3 w-3 mr-2" /> Spiritual Leadership
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
              Shepherd <span className="text-gradient">Profiles</span>
            </h2>
            <p className="text-slate-500 text-base font-light mt-4">Connect with visionaries leading the spiritual growth in your city.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {(data.featuredPastors || []).map((pastor, i) => (
              <div key={pastor.id} className="reveal transition-transform hover:-translate-y-2 duration-500">
                <PastorCard pastor={pastor} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newly Added Pastors - Fresh Faces */}
      <section className="py-24 bg-white border-t border-slate-100 transition-all">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-left mb-16 reveal">
            <div className="inline-flex items-center text-brand text-xs font-bold tracking-widest uppercase mb-4">
               <Sparkles className="h-3 w-3 mr-2" /> Fresh Faces
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
              Newly Added <span className="text-gradient">Pastors</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {(data.newPastors || []).length > 0 ? (
              (data.newPastors || []).map((pastor, i) => (
                <div key={pastor.id} className="reveal transition-transform hover:-translate-y-2 duration-500">
                  <PastorCard pastor={pastor} />
                </div>
              ))
            ) : (
                <div className="col-span-full h-48 flex items-center justify-center border border-dashed border-slate-200 rounded-3xl">
                   <p className="text-slate-400">Loading newest profiles...</p>
                </div>
            )}
          </div>
        </div>
      </section>

      {/* High Impact CTA - Glass Variant */}
      <section className="pt-0 pb-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="bg-slate-950 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden border border-white/10 shadow-2xl group transition-all duration-700 animate-in fade-in zoom-in-95">
            {/* Central Anchor Glow */}
            <div 
              className="absolute inset-0 pointer-events-none opacity-60"
              style={{ background: 'radial-gradient(circle at center, rgba(108,28,255,0.4) 0%, transparent 70%)' }}
            ></div>
            
            {/* Moving Bubbles / Floating Blobs */}
            <div className="floating-blob w-[400px] h-[400px] bg-brand/30 -top-20 -left-20 group-hover:bg-brand/40 transition-colors"></div>
            <div className="floating-blob w-[300px] h-[300px] bg-blue-500/10 -bottom-20 -right-20 group-hover:bg-blue-500/20 transition-colors" style={{ animationDelay: '-5s' }}></div>
            <div className="floating-blob w-[250px] h-[250px] bg-purple-400/10 top-1/2 left-1/4 group-hover:bg-purple-400/15 transition-colors" style={{ animationDelay: '-10s' }}></div>

            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-brand/10 to-transparent pointer-events-none"></div>
            
            <div className="relative z-10">
              <h2 className="text-4xl md:text-7xl font-black text-white mb-10 leading-none tracking-tighter">
                Expand Your <br /> <span className="text-brand">Reach</span>
              </h2>
              <p className="text-slate-300 text-xl mb-12 max-w-xl mx-auto font-medium leading-relaxed opacity-80">
                A high-fidelity directory that puts your community in front of thousands seeking spiritual guidance.
              </p>
               <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                   onClick={() => {
                      if (isAuthenticated) {
                         navigate('/add-listing');
                      } else {
                         toast.info('Please sign in to add a listing');
                         navigate('/auth/login', { state: { from: { pathname: '/add-listing' } } });
                      }
                   }} 
                   size="lg" 
                   className="bg-brand hover:bg-brand-hover text-white rounded-2xl px-12 h-16 text-base font-bold transition-all hover:shadow-2xl border border-white/10"
                >
                  Get Listed Now
                </Button>
                <Button onClick={() => navigate('/about')} variant="outline" size="lg" className="text-white border-white/10 hover:bg-white/5 rounded-2xl px-12 h-16 backdrop-blur-sm">
                  Our Vision
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home2;
