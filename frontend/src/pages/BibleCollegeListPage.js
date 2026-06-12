import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, BookOpen, Globe, Filter } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const API_BASE = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

const BibleCollegeListPage = () => {
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    city: '',
    denomination: '',
    online: null,
    featured: null
  });

  useEffect(() => {
    fetchColleges();
  }, [filters]);

  const fetchColleges = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.city) params.append('city', filters.city);
      if (filters.denomination) params.append('denomination', filters.denomination);
      if (filters.online !== null) params.append('online', filters.online);
      if (filters.featured !== null) params.append('featured', filters.featured);
      
      const response = await fetch(`${API_BASE}/api/colleges?${params}`);
      const data = await response.json();
      setColleges(data.colleges || []);
    } catch (error) {
      console.error('Error fetching colleges:', error);
      setColleges([]);
    }
    setLoading(false);
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      fetchColleges();
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/colleges/search?q=${encodeURIComponent(searchTerm)}`);
      const data = await response.json();
      setColleges(data.colleges || []);
    } catch (error) {
      console.error('Error searching colleges:', error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Bible Colleges & Training</h1>
          <p className="text-xl opacity-90">Discover theological education and ministry training across the UK</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search colleges by name, city, or denomination..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>
            <button
              onClick={handleSearch}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Search
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={filters.city}
              onChange={(e) => setFilters({ ...filters, city: e.target.value })}
            >
              <option value="">All Cities</option>
              <option value="London">London</option>
              <option value="Birmingham">Birmingham</option>
              <option value="Manchester">Manchester</option>
              <option value="Glasgow">Glasgow</option>
            </select>

            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={filters.denomination}
              onChange={(e) => setFilters({ ...filters, denomination: e.target.value })}
            >
              <option value="">All Denominations</option>
              <option value="Non-denominational">Non-denominational</option>
              <option value="Baptist">Baptist</option>
              <option value="Pentecostal">Pentecostal</option>
              <option value="Anglican">Anglican</option>
            </select>

            <button
              className={`px-4 py-2 rounded-lg border ${filters.online ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 hover:border-blue-600'}`}
              onClick={() => setFilters({ ...filters, online: filters.online ? null : true })}
            >
              <Globe size={16} className="inline mr-2" />
              Online Available
            </button>

            <button
              className={`px-4 py-2 rounded-lg border ${filters.featured ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-300 hover:border-purple-600'}`}
              onClick={() => setFilters({ ...filters, featured: filters.featured ? null : true })}
            >
              Featured
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading colleges...</p>
          </div>
        ) : colleges.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <Filter size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No colleges found</h3>
            <p className="text-gray-600">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {colleges.map((college) => (
              <Link
                key={college._id}
                to={`/colleges/${college.slug}`}
                className="bg-white rounded-lg shadow-md hover:shadow-xl transition overflow-hidden group"
              >
                <div className="relative h-48 bg-gradient-to-br from-blue-100 to-purple-100">
                  {college.cover_image ? (
                    <img
                      src={college.cover_image}
                      alt={college.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <BookOpen size={64} className="text-blue-300" />
                    </div>
                  )}
                  {college.is_featured && (
                    <div className="absolute top-3 right-3 bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      Featured
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    {college.logo && (
                      <img
                        src={college.logo}
                        alt={college.name}
                        className="w-16 h-16 rounded-lg object-cover border-2 border-gray-200"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition">
                        {college.name}
                      </h3>
                      {college.tagline && (
                        <p className="text-sm text-gray-600 mt-1">{college.tagline}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-gray-400" />
                      <span>{college.city}, {college.country}</span>
                    </div>
                    {college.denomination && (
                      <div className="flex items-center gap-2">
                        <BookOpen size={16} className="text-gray-400" />
                        <span>{college.denomination}</span>
                      </div>
                    )}
                    {college.courses && college.courses.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <span className="font-semibold text-blue-600">
                          {college.courses.length} {college.courses.length === 1 ? 'Course' : 'Courses'} Available
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {college.online_available && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                        Online
                      </span>
                    )}
                    {college.scholarships_available && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                        Scholarships
                      </span>
                    )}
                    {college.is_verified && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        Verified
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default BibleCollegeListPage;