import React, { useState } from 'react';
import { ArrowLeft, Instagram, Facebook, Youtube, TrendingUp, Calendar, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

const platformIcons = {
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
  tiktok: TrendingUp
};

const platformColors = {
  instagram: 'from-pink-500 to-purple-500',
  facebook: 'from-blue-600 to-blue-700',
  youtube: 'from-red-600 to-red-700',
  tiktok: 'from-black to-gray-800'
};

const SocialHealthPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [platform, setPlatform] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [formData, setFormData] = useState({
    follower_count: '',
    posts_per_week: '',
    avg_likes: '',
    avg_comments: '',
    avg_shares: '',
    last_post_days_ago: '',
    has_stories: false,
    has_reels: false,
    profile_complete: false,
    link_in_bio: false
  });

  const handlePlatformSelect = (selectedPlatform) => {
    setPlatform(selectedPlatform);
    setStep(2);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const churchId = localStorage.getItem('church_id') || 'demo-church-id';
      const response = await axios.post(`${API_URL}/tools/social-health/analyse`, {
        church_id: churchId,
        platform,
        follower_count: parseInt(formData.follower_count),
        posts_per_week: parseFloat(formData.posts_per_week),
        avg_likes: parseFloat(formData.avg_likes),
        avg_comments: parseFloat(formData.avg_comments),
        avg_shares: parseFloat(formData.avg_shares || 0),
        last_post_days_ago: parseInt(formData.last_post_days_ago),
        has_stories: formData.has_stories,
        has_reels: formData.has_reels,
        profile_complete: formData.profile_complete,
        link_in_bio: formData.link_in_bio
      });

      setResults(response.data);
      setStep(3);
    } catch (error) {
      console.error('Error analyzing social health:', error);
      alert('Failed to analyze social media health. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const resetForm = () => {
    setStep(1);
    setPlatform('');
    setResults(null);
    setFormData({
      follower_count: '',
      posts_per_week: '',
      avg_likes: '',
      avg_comments: '',
      avg_shares: '',
      last_post_days_ago: '',
      has_stories: false,
      has_reels: false,
      profile_complete: false,
      link_in_bio: false
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-lavender-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/tools')}
          className="flex items-center text-purple-600 hover:text-purple-700 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Tools
        </button>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-lavender-600 text-white p-8">
            <h1 className="text-3xl font-bold mb-2">Social Media Health Check</h1>
            <p className="text-purple-100">Analyze your church's social media performance and get AI-powered recommendations</p>
          </div>

          <div className="p-8">
            {step === 1 && (
              <div>
                <h2 className="text-2xl font-semibold mb-6 text-gray-800">Select Platform</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.keys(platformIcons).map((p) => {
                    const Icon = platformIcons[p];
                    return (
                      <button
                        key={p}
                        onClick={() => handlePlatformSelect(p)}
                        className={`p-6 rounded-xl border-2 border-gray-200 hover:border-purple-400 transition-all hover:shadow-lg group`}
                      >
                        <div className={`w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br ${platformColors[p]} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <Icon className="w-8 h-8 text-white" />
                        </div>
                        <p className="text-sm font-medium text-gray-700 capitalize">{p}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 2 && (
              <form onSubmit={handleSubmit}>
                <div className="flex items-center mb-6">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${platformColors[platform]} flex items-center justify-center mr-3`}>
                    {React.createElement(platformIcons[platform], { className: 'w-6 h-6 text-white' })}
                  </div>
                  <h2 className="text-2xl font-semibold text-gray-800 capitalize">{platform} Stats</h2>
                </div>

                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Follower Count</label>
                      <input
                        type="number"
                        name="follower_count"
                        value={formData.follower_count}
                        onChange={handleInputChange}
                        required
                        min="0"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="e.g., 1250"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Posts Per Week</label>
                      <input
                        type="number"
                        step="0.1"
                        name="posts_per_week"
                        value={formData.posts_per_week}
                        onChange={handleInputChange}
                        required
                        min="0"
                        max="50"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="e.g., 3.5"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Avg Likes Per Post</label>
                      <input
                        type="number"
                        step="0.1"
                        name="avg_likes"
                        value={formData.avg_likes}
                        onChange={handleInputChange}
                        required
                        min="0"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="e.g., 45"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Avg Comments</label>
                      <input
                        type="number"
                        step="0.1"
                        name="avg_comments"
                        value={formData.avg_comments}
                        onChange={handleInputChange}
                        required
                        min="0"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="e.g., 8"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Avg Shares</label>
                      <input
                        type="number"
                        step="0.1"
                        name="avg_shares"
                        value={formData.avg_shares}
                        onChange={handleInputChange}
                        min="0"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="e.g., 2"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Days Since Last Post</label>
                    <input
                      type="number"
                      name="last_post_days_ago"
                      value={formData.last_post_days_ago}
                      onChange={handleInputChange}
                      required
                      min="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="e.g., 2"
                    />
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-sm font-medium text-gray-700 mb-3">Profile Features</p>
                    <div className="grid md:grid-cols-2 gap-3">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          name="has_stories"
                          checked={formData.has_stories}
                          onChange={handleInputChange}
                          className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                        />
                        <span className="text-sm text-gray-700">Has Stories/Status</span>
                      </label>
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          name="has_reels"
                          checked={formData.has_reels}
                          onChange={handleInputChange}
                          className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                        />
                        <span className="text-sm text-gray-700">Has Reels/Short Videos</span>
                      </label>
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          name="profile_complete"
                          checked={formData.profile_complete}
                          onChange={handleInputChange}
                          className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                        />
                        <span className="text-sm text-gray-700">Profile Complete (bio, photo)</span>
                      </label>
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          name="link_in_bio"
                          checked={formData.link_in_bio}
                          onChange={handleInputChange}
                          className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                        />
                        <span className="text-sm text-gray-700">Link in Bio/Description</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-4 mt-8">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-lavender-600 text-white rounded-lg hover:from-purple-700 hover:to-lavender-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {loading ? 'Analyzing...' : 'Analyze'}
                  </button>
                </div>
              </form>
            )}

            {step === 3 && results && (
              <div className="space-y-6">
                <div className="text-center py-8 border-b">
                  <div className={`w-32 h-32 mx-auto rounded-full ${getScoreBg(results.overall_score)} flex items-center justify-center mb-4`}>
                    <span className={`text-4xl font-bold ${getScoreColor(results.overall_score)}`}>
                      {Math.round(results.overall_score)}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Overall Health Score</h2>
                  <p className="text-gray-600">
                    {results.overall_score >= 80 ? 'Excellent' : results.overall_score >= 60 ? 'Good' : 'Needs Improvement'}
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Engagement</span>
                      <span className={`text-lg font-bold ${getScoreColor(results.engagement_score)}`}>
                        {Math.round(results.engagement_score)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-purple-600 to-lavender-600 h-2 rounded-full"
                        style={{ width: `${results.engagement_score}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{results.engagement_rate}% engagement rate</p>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Posting Consistency</span>
                      <span className={`text-lg font-bold ${getScoreColor(results.posting_score)}`}>
                        {Math.round(results.posting_score)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-600 to-blue-400 h-2 rounded-full"
                        style={{ width: `${results.posting_score}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Recency</span>
                      <span className={`text-lg font-bold ${getScoreColor(results.recency_score)}`}>
                        {Math.round(results.recency_score)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-green-600 to-green-400 h-2 rounded-full"
                        style={{ width: `${results.recency_score}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Profile Completeness</span>
                      <span className={`text-lg font-bold ${getScoreColor(results.profile_score)}`}>
                        {Math.round(results.profile_score)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-yellow-600 to-yellow-400 h-2 rounded-full"
                        style={{ width: `${results.profile_score}%` }}
                      />
                    </div>
                  </div>
                </div>

                {(results.benchmark_engagement || results.benchmark_posting) && (
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Benchmark Comparison</h3>
                    <div className="space-y-3">
                      {results.benchmark_engagement && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Your engagement rate</span>
                          <span className="text-sm font-medium">{results.engagement_rate}%</span>
                        </div>
                      )}
                      {results.benchmark_engagement && (
                        <div className="flex items-center justify-between text-purple-600">
                          <span className="text-sm">Similar churches average</span>
                          <span className="text-sm font-medium">{results.benchmark_engagement}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="bg-gradient-to-br from-purple-50 to-lavender-50 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-lavender-600 rounded-full flex items-center justify-center mr-3">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">AI Recommendations</h3>
                  </div>
                  <div className="space-y-3">
                    {results.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start space-x-3 bg-white rounded-lg p-4">
                        <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </span>
                        <p className="text-sm text-gray-700 leading-relaxed">{rec}</p>
                      </div>
                    ))}
                  </div>
                  {results.cached && (
                    <p className="text-xs text-gray-500 mt-3 flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Recommendations cached for 7 days
                    </p>
                  )}
                </div>

                <button
                  onClick={resetForm}
                  className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-lavender-600 text-white rounded-lg hover:from-purple-700 hover:to-lavender-700 transition-all font-medium"
                >
                  Check Another Platform
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialHealthPage;