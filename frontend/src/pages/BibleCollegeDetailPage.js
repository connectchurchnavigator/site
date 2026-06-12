import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Globe, Facebook, Instagram, Youtube, BookOpen, Calendar, Award, Users, Languages, CheckCircle, Heart, Share2, ExternalLink } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ListingChatWidget from '../components/ListingChatWidget';

const API_BASE = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

const BibleCollegeDetailPage = () => {
  const { slug } = useParams();
  const [college, setCollege] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [following, setFollowing] = useState(false);
  const [applicationData, setApplicationData] = useState({
    name: '',
    email: '',
    phone: '',
    course: '',
    message: ''
  });

  useEffect(() => {
    fetchCollege();
  }, [slug]);

  const fetchCollege = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/colleges/${slug}`);
      if (response.ok) {
        const data = await response.json();
        setCollege(data);
      }
    } catch (error) {
      console.error('Error fetching college:', error);
    }
    setLoading(false);
  };

  const handleApplicationSubmit = (e) => {
    e.preventDefault();
    alert('Application submitted! The college will contact you soon.');
    setApplicationData({ name: '', email: '', phone: '', course: '', message: '' });
  };

  const handleFollow = () => {
    setFollowing(!following);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: college.name,
        text: college.tagline,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading college details...</p>
        </div>
      </div>
    );
  }

  if (!college) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">College Not Found</h1>
          <Link to="/colleges" className="text-blue-600 hover:underline">Back to Colleges</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="relative h-96 bg-gradient-to-br from-blue-600 to-purple-600">
        {college.cover_image ? (
          <img src={college.cover_image} alt={college.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen size={120} className="text-white opacity-30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
      </div>

      <div className="container mx-auto px-4 -mt-32 relative z-10">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-xl p-8 mb-8">
              <div className="flex items-start gap-6 mb-6">
                {college.logo && (
                  <img src={college.logo} alt={college.name} className="w-24 h-24 rounded-lg object-cover border-4 border-white shadow-lg" />
                )}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h1 className="text-4xl font-bold text-gray-900 mb-2">{college.name}</h1>
                      {college.tagline && <p className="text-xl text-gray-600">{college.tagline}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleFollow} className={`p-3 rounded-full ${following ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'} hover:bg-opacity-80 transition`}>
                        <Heart size={20} fill={following ? 'currentColor' : 'none'} />
                      </button>
                      <button onClick={handleShare} className="p-3 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition">
                        <Share2 size={20} />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {college.is_verified && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold flex items-center gap-1">
                        <CheckCircle size={16} /> Verified
                      </span>
                    )}
                    {college.is_featured && (
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">Featured</span>
                    )}
                    {college.scholarships_available && (
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-semibold">Scholarships Available</span>
                    )}
                    {college.online_available && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">Online Courses</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 p-6 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{college.courses?.length || 0}</div>
                  <div className="text-sm text-gray-600">Courses</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{college.alumni_count || 'N/A'}</div>
                  <div className="text-sm text-gray-600">Alumni</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{college.founded_year || 'N/A'}</div>
                  <div className="text-sm text-gray-600">Founded</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{college.languages_of_instruction?.length || 1}</div>
                  <div className="text-sm text-gray-600">Languages</div>
                </div>
              </div>

              <div className="border-b mb-6">
                <div className="flex gap-4">
                  <button onClick={() => setActiveTab('profile')} className={`px-4 py-3 font-semibold ${activeTab === 'profile' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}>Profile</button>
                  <button onClick={() => setActiveTab('courses')} className={`px-4 py-3 font-semibold ${activeTab === 'courses' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}>Courses</button>
                  <button onClick={() => setActiveTab('apply')} className={`px-4 py-3 font-semibold ${activeTab === 'apply' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}>Apply</button>
                </div>
              </div>

              {activeTab === 'profile' && (
                <div className="space-y-6">
                  {college.description && (
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-3">About</h2>
                      <p className="text-gray-700 leading-relaxed whitespace-pre-line">{college.description}</p>
                    </div>
                  )}

                  {college.accreditation && (
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                        <Award className="text-blue-600" size={24} /> Accreditation
                      </h3>
                      <p className="text-gray-700">{college.accreditation}</p>
                    </div>
                  )}

                  {college.campus_facilities && college.campus_facilities.length > 0 && (
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-3">Campus Facilities</h3>
                      <div className="grid md:grid-cols-2 gap-3">
                        {college.campus_facilities.map((facility, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-gray-700">
                            <CheckCircle size={16} className="text-green-600" />
                            <span>{facility}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {college.entry_requirements && (
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Entry Requirements</h3>
                      <p className="text-gray-700 whitespace-pre-line">{college.entry_requirements}</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'courses' && (
                <div className="space-y-4">
                  {college.courses && college.courses.length > 0 ? (
                    college.courses.map((course, idx) => (
                      <div key={idx} className="border rounded-lg p-6 hover:shadow-md transition">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="text-xl font-bold text-gray-900">{course.name}</h3>
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">{course.level}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                          <span className="flex items-center gap-1">
                            <Calendar size={16} /> {course.duration}
                          </span>
                          <span className="font-semibold text-green-600">{course.fees}</span>
                        </div>
                        <p className="text-gray-700">{course.description}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-600 py-8">No courses listed yet</p>
                  )}
                </div>
              )}

              {activeTab === 'apply' && (
                <form onSubmit={handleApplicationSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
                    <input type="text" required className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500" value={applicationData.name} onChange={(e) => setApplicationData({...applicationData, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email *</label>
                    <input type="email" required className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500" value={applicationData.email} onChange={(e) => setApplicationData({...applicationData, email: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                    <input type="tel" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500" value={applicationData.phone} onChange={(e) => setApplicationData({...applicationData, phone: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Course Interested In *</label>
                    <select required className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500" value={applicationData.course} onChange={(e) => setApplicationData({...applicationData, course: e.target.value})}>
                      <option value="">Select a course</option>
                      {college.courses?.map((course, idx) => (
                        <option key={idx} value={course.name}>{course.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Message</label>
                    <textarea rows="4" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500" value={applicationData.message} onChange={(e) => setApplicationData({...applicationData, message: e.target.value})}></textarea>
                  </div>
                  <button type="submit" className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition">Submit Application</button>
                </form>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact</h2>
              <div className="space-y-4">
                {college.address_line1 && (
                  <div className="flex items-start gap-3">
                    <MapPin className="text-gray-400 mt-1" size={20} />
                    <div>
                      <div className="text-gray-700">{college.address_line1}</div>
                      <div className="text-gray-700">{college.city}, {college.country}</div>
                    </div>
                  </div>
                )}
                {college.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="text-gray-400" size={20} />
                    <a href={`tel:${college.phone}`} className="text-blue-600 hover:underline">{college.phone}</a>
                  </div>
                )}
                {college.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="text-gray-400" size={20} />
                    <a href={`mailto:${college.email}`} className="text-blue-600 hover:underline">{college.email}</a>
                  </div>
                )}
                {college.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="text-gray-400" size={20} />
                    <a href={college.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                      Visit Website <ExternalLink size={14} />
                    </a>
                  </div>
                )}
                <div className="flex gap-3 pt-4">
                  {college.facebook && (
                    <a href={college.facebook} target="_blank" rel="noopener noreferrer" className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition">
                      <Facebook size={20} />
                    </a>
                  )}
                  {college.instagram && (
                    <a href={college.instagram} target="_blank" rel="noopener noreferrer" className="p-2 bg-pink-100 text-pink-600 rounded-full hover:bg-pink-200 transition">
                      <Instagram size={20} />
                    </a>
                  )}
                  {college.youtube && (
                    <a href={college.youtube} target="_blank" rel="noopener noreferrer" className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition">
                      <Youtube size={20} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {college.latitude && college.longitude && (
              <div className="bg-white rounded-lg shadow-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Location</h3>
                <div className="aspect-video bg-gray-200 rounded-lg mb-4">
                  <iframe
                    title="College Location"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    src={`https://www.google.com/maps?q=${college.latitude},${college.longitude}&output=embed`}
                    className="rounded-lg"
                  ></iframe>
                </div>
                {college.google_maps_link && (
                  <a href={college.google_maps_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm flex items-center gap-1">
                    Open in Google Maps <ExternalLink size={14} />
                  </a>
                )}
              </div>
            )}

            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg shadow-xl p-6 border border-yellow-200">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Fees & Scholarships</h3>
              {college.courses && college.courses.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Course Fees:</p>
                  {college.courses.slice(0, 3).map((course, idx) => (
                    <div key={idx} className="text-sm text-gray-700 mb-1">
                      <span className="font-semibold">{course.name}:</span> {course.fees}
                    </div>
                  ))}
                </div>
              )}
              {college.scholarships_available && (
                <div className="bg-white rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="text-yellow-600" size={20} />
                    <span className="font-semibold text-gray-900">Scholarships Available</span>
                  </div>
                  {college.scholarship_details && (
                    <p className="text-sm text-gray-700">{college.scholarship_details}</p>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-xl p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Share QR Code</h3>
              <div className="bg-gray-100 p-4 rounded-lg text-center">
                <div className="w-48 h-48 mx-auto bg-white p-4 rounded-lg">
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.href)}`} alt="QR Code" className="w-full h-full" />
                </div>
                <p className="text-sm text-gray-600 mt-3">Scan to view this college</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ListingChatWidget listingType="college" listingId={college._id} listingName={college.name} />
      <Footer />
    </div>
  );
};

export default BibleCollegeDetailPage;