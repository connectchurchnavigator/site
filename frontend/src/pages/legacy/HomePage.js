import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { ChurchCard } from '../components/ChurchCard';
import { PastorCard } from '../components/PastorCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { MapPin, Search, Church, User } from 'lucide-react';
import { churchAPI, pastorAPI, taxonomyAPI, homepageAPI } from '../lib/api';
import { toast } from 'sonner';

const HomePage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('churches');
  const [searchData, setSearchData] = useState({
    name: '',
    location: '',
    denomination: '',
    openNow: ''
  });
  
  const [featuredChurches, setFeaturedChurches] = useState([]);
  const [openChurches, setOpenChurches] = useState([]);
  const [featuredPastors, setFeaturedPastors] = useState([]);
  const [newPastors, setNewPastors] = useState([]);
  const [denominations, setDenominations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch taxonomies
      const taxRes = await taxonomyAPI.getAll();
      setDenominations(taxRes.data.denomination || []);

      // Fetch featured churches
      const featuredRes = await homepageAPI.getFeaturedChurches(6);
      setFeaturedChurches(featuredRes.data || []);

      // Fetch open churches
      const openRes = await homepageAPI.getOpenChurches(6);
      setOpenChurches(openRes.data || []);

      // Fetch featured pastors
      const featuredPastorsRes = await homepageAPI.getFeaturedPastors(6);
      setFeaturedPastors(featuredPastorsRes.data || []);

      // Fetch new pastors
      const newRes = await homepageAPI.getNewPastors(6);
      setNewPastors(newRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    params.set('type', activeTab === 'churches' ? 'church' : 'pastor');
    
    if (searchData.name) params.set('search', searchData.name);
    if (searchData.location) params.set('city', searchData.location);
    if (searchData.denomination) params.set('denomination', searchData.denomination);
    if (searchData.openNow) params.set('open_now', 'true');

    navigate(`/explore?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <section 
        className="relative h-[600px] bg-cover bg-center flex items-center"
        style={{ 
          backgroundImage: 'url(https://images.unsplash.com/photo-1555069855-e580a9adbf43?crop=entropy&cs=srgb&fm=jpg&q=85)',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6" data-testid="hero-title">
            Discover and Connect with Churches Around the World
          </h1>
          <p className="text-xl text-white/90 mb-12">
            Find welcoming communities, inspiring services, and faith-based gatherings near you
          </p>

          {/* Search Bar */}
          <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="churches" data-testid="search-tab-churches">
                  <Church className="h-4 w-4 mr-2" />
                  Churches
                </TabsTrigger>
                <TabsTrigger value="pastors" data-testid="search-tab-pastors">
                  <User className="h-4 w-4 mr-2" />
                  Pastors
                </TabsTrigger>
              </TabsList>

              <TabsContent value="churches" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Input
                    placeholder="Church Name"
                    value={searchData.name}
                    onChange={(e) => setSearchData({ ...searchData, name: e.target.value })}
                    data-testid="search-church-name"
                  />
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search City"
                      value={searchData.location}
                      onChange={(e) => setSearchData({ ...searchData, location: e.target.value })}
                      className="pl-10"
                      data-testid="search-location"
                    />
                  </div>
                  <Select value={searchData.denomination} onValueChange={(v) => setSearchData({ ...searchData, denomination: v })}>
                    <SelectTrigger data-testid="search-denomination">
                      <SelectValue placeholder="Denomination" />
                    </SelectTrigger>
                    <SelectContent>
                      {denominations.map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={searchData.openNow} onValueChange={(v) => setSearchData({ ...searchData, openNow: v })}>
                    <SelectTrigger data-testid="search-open-now">
                      <SelectValue placeholder="Open Now" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="now">Now</SelectItem>
                      {Array.from({ length: 24 }, (_, i) => i).map(hour => (
                        <SelectItem key={hour} value={`${hour}:00`}>
                          {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="pastors" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Input
                    placeholder="Pastor Name"
                    value={searchData.name}
                    onChange={(e) => setSearchData({ ...searchData, name: e.target.value })}
                    data-testid="search-pastor-name"
                  />
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search City"
                      value={searchData.location}
                      onChange={(e) => setSearchData({ ...searchData, location: e.target.value })}
                      className="pl-10"
                      data-testid="search-pastor-location"
                    />
                  </div>
                  <Select value={searchData.denomination} onValueChange={(v) => setSearchData({ ...searchData, denomination: v })}>
                    <SelectTrigger data-testid="search-pastor-denomination">
                      <SelectValue placeholder="Denomination" />
                    </SelectTrigger>
                    <SelectContent>
                      {denominations.map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
            </Tabs>

            <Button
              onClick={handleSearch}
              className="w-full mt-6 bg-brand hover:bg-brand-hover text-white rounded-full h-12 text-lg"
              data-testid="search-submit-btn"
            >
              <Search className="h-5 w-5 mr-2" />
              Search
            </Button>
          </div>
        </div>
      </section>

      {/* Top Featured Churches Section */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold mb-8" data-testid="section-featured-churches">
          Top Featured Churches
        </h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-80 bg-slate-100 rounded-2xl shimmer"></div>
            ))}
          </div>
        ) : featuredChurches.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredChurches.map(church => (
              <ChurchCard key={church.id} church={church} />
            ))}
          </div>
        ) : (
          <p className="text-slate-500">No featured churches available yet.</p>
        )}
      </section>

      {/* Open Churches Section */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold mb-8" data-testid="section-open-churches">
            Top Rated Churches That Are Open Now
          </h2>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-80 bg-white rounded-2xl shimmer"></div>
              ))}
            </div>
          ) : openChurches.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {openChurches.map(church => (
                <ChurchCard key={church.id} church={church} />
              ))}
            </div>
          ) : (
            <p className="text-slate-500">No churches available yet.</p>
          )}
        </div>
      </section>

      {/* Featured Pastors Section */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold mb-8" data-testid="section-featured-pastors">
          Featured Pastors
        </h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-80 bg-slate-100 rounded-2xl shimmer"></div>
            ))}
          </div>
        ) : featuredPastors.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredPastors.map(pastor => (
              <PastorCard key={pastor.id} pastor={pastor} />
            ))}
          </div>
        ) : (
          <p className="text-slate-500">No featured pastors available yet.</p>
        )}
      </section>

      {/* New Pastors Section */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold mb-8" data-testid="section-new-pastors">
            List of Newly Added Pastors
          </h2>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-80 bg-white rounded-2xl shimmer"></div>
              ))}
            </div>
          ) : newPastors.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {newPastors.map(pastor => (
                <PastorCard key={pastor.id} pastor={pastor} />
              ))}
            </div>
          ) : (
            <p className="text-slate-500">No pastors available yet.</p>
          )}
        </div>
      </section>

      {/* About Section */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl shadow-card p-8 md:p-12">
          <h2 className="text-3xl font-bold mb-6">About Church Navigator</h2>
          <p className="text-slate-600 text-lg mb-6 leading-relaxed">
            Church Navigator is your trusted platform to discover verified, active, and spirit-led churches near you. 
            We help believers find a worship place that feels like home — with clarity, transparency, and ease.
          </p>
          <Button
            onClick={() => navigate('/about')}
            variant="outline"
            className="rounded-full"
            data-testid="about-know-more-btn"
          >
            Know More
          </Button>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold mb-12 text-center">Why Choose Us</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { title: 'Simplified Search', description: 'Find churches easily with powerful filters' },
              { title: 'Increased Visibility', description: 'Help ministries reach more people' },
              { title: 'Easy Discovery', description: 'Discover churches and pastors in your area' },
              { title: 'Bridge the Gap', description: 'Connect believers with faith communities' }
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-card hover:shadow-hover transition-shadow">
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-slate-600 text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default HomePage;