import React, { useState } from 'react';
import { CheckCircle, TrendingUp, Calendar, User, Instagram, Facebook, Youtube, Music } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.churchnavigator.com';

const platformIcons = {
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
  tiktok: Music
};

const platformColors = {
  instagram: 'from-purple-500 to-pink-500',
  facebook: 'from-blue-600 to-blue-400',
  youtube: 'from-red-600 to-red-400',
  tiktok: 'from-black to-gray-700'
};

const SocialHealthPage = () => {
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
      const churchId = localStorage.getItem('church_id') || 'demo_church_001';
      
      const response = await axios.post(`${API_URL}/tools/social-health/analyse`, {
        church_id: churchId,
        platform: platform,
        follower_count: parseInt(formData.follower_count) || 0,
        posts_per_week: parseFloat(formData.posts_per_week) || 0,
        avg_likes: parseInt(formData.avg_likes) || 0,
        avg_comments: parseInt(formData.avg_comments) || 0,
        avg_shares: parseInt(formData.avg_shares) || 0,
        last_post_days_ago: parseInt(formData.last_post_days_ago) || 0,
        has_stories: formData.has_stories,
        has_reels: formData.has_reels,
        profile_complete: formData.profile_complete,
        link_in_bio: formData.link_in_bio
      });

      setResults(response.data);
      setStep(3);
    } catch (error) {
      console.error('Analysis error:', error);
      alert('Failed to analyze social media health. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBg = (score) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    if (score >= 40) return 'bg-orange-100';
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
    <div className="min-h-screen bg-gradient-to-br from-lavender-50 via-white to-lavender-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Social Media Health Check</h1>
          <p className="text-gray-600">Get AI-powered insights and actionable recommendations</p>
        </div>

        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Select Platform</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['instagram', 'facebook', 'youtube', 'tiktok'].map((p) => {
                const Icon = platformIcons[p];
                return (
                  <button
                    key={p}
                    onClick={() => handlePlatformSelect(p)}
                    className={`p-6 rounded-xl border-2 border-gray-200 hover:border-lavender-500 transition-all hover:shadow-lg group`}
                  >
                    <div className={`w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br ${platformColors[p]} flex items-center justify-center`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <p className="font-semibold text-gray-900 capitalize">{p}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Enter Your {platform.charAt(0).toUpperCase() + platform.slice(1)} Stats</h2>
              <button onClick={() => setStep(1)} className="text-lavender-600 hover:text-lavender-700 font-medium">Change Platform</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Follower Count</label>
                  <input
                    type="number"
                    name="follower_count"
                    value={formData.follower_count}
                    onChange={handleInputChange}
                    required
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lavender-500 focus:border-transparent"
                    placeholder="e.g., 1250"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Posts Per Week</label>
                  <input
                    type="number"
                    name="posts_per_week"
                    value={formData.posts_per_week}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lavender-500 focus:border-transparent"
                    placeholder="e.g., 3.5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Average Likes Per Post</label>
                  <input
                    type="number"
                    name="avg_likes"
                    value={formData.avg_likes}
                    onChange={handleInputChange}
                    required
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lavender-500 focus:border-transparent"
                    placeholder="e.g., 45"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Average Comments Per Post</label>
                  <input
                    type="number"
                    name="avg_comments"
                    value={formData.avg_comments}
                    onChange={handleInputChange}
                    required
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lavender-500 focus:border-transparent"
                    placeholder="e.g., 8"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Average Shares Per Post</label>
                  <input
                    type="number"
                    name="avg_shares"
                    value={formData.avg_shares}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lavender-500 focus:border-transparent"
                    placeholder="e.g., 3"
                  />
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lavender-500 focus:border-transparent"
                    placeholder="e.g., 2"
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <p className="text-sm font-medium text-gray-700 mb-4">Profile Features</p>
                <div className="grid md:grid-cols-2 gap-4">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="has_stories"
                      checked={formData.has_stories}
                      onChange={handleInputChange}
                      className="w-5 h-5 text-lavender-600 border-gray-300 rounded focus:ring-lavender-500"
                    />
                    <span className="text-gray-700">Active Stories/Status</span>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="has_reels"
                      checked={formData.has_reels}
                      onChange={handleInputChange}
                      className="w-5 h-5 text-lavender-600 border-gray-300 rounded focus:ring-lavender-500"
                    />
                    <span className="text-gray-700">Reels/Short Videos</span>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="profile_complete"
                      checked={formData.profile_complete}
                      onChange={handleInputChange}
                      className="w-5 h-5 text-lavender-600 border-gray-300 rounded focus:ring-lavender-500"
                    />
                    <span className="text-gray-700">Complete Profile Info</span>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="link_in_bio"
                      checked={formData.link_in_bio}
                      onChange={handleInputChange}
                      className="w-5 h-5 text-lavender-600 border-gray-300 rounded focus:ring-lavender-500"
                    />
                    <span className="text-gray-700">Link in Bio</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-lavender-600 to-lavender-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-lavender-700 hover:to-lavender-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Analyzing...' : 'Analyze My Social Media'}
              </button>
            </form>
          </div>
        )}

        {step === 3 && results && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="text-center mb-8">
                <div className={`w-32 h-32 mx-auto mb-4 rounded-full ${getScoreBg(results.overall_score)} flex items-center justify-center`}>
                  <span className={`text-4xl font-bold ${getScoreColor(results.overall_score)}`}>{results.overall_score}</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Overall Health Score</h2>
                <p className="text-gray-600">Your {platform.charAt(0).toUpperCase() + platform.slice(1)} performance analysis</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-8">
                {Object.entries(results.metrics).map(([key, metric]) => (
                  <div key={key} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{metric.label}</h3>
                      <span className={`text-xl font-bold ${getScoreColor(metric.score)}`}>{metric.score}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div
                        className={`h-2 rounded-full ${metric.score >= 80 ? 'bg-green-500' : metric.score >= 60 ? 'bg-yellow-500' : metric.score >= 40 ? 'bg-orange-500' : 'bg-red-500'}`}
                        style={{ width: `${metric.score}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-600">{metric.description}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 pt-6 mb-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Benchmark Comparison</h3>
                <div className="space-y-4">
                  {results.benchmarks.map((benchmark, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">{benchmark.label}</span>
                        <span className="text-sm text-gray-600">
                          You: {benchmark.your_value} | Peers: {benchmark.peer_average}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <div className="w-full bg-lavender-200 rounded-full h-3">
                            <div
                              className="bg-lavender-600 h-3 rounded-full"
                              style={{ width: `${Math.min(100, (benchmark.your_value / Math.max(benchmark.your_value, benchmark.peer_average)) * 100)}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                              className="bg-gray-400 h-3 rounded-full"
                              style={{ width: `${Math.min(100, (benchmark.peer_average / Math.max(benchmark.your_value, benchmark.peer_average)) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-lavender-600" />
                  AI Recommendations
                </h3>
                <div className="space-y-3">
                  {results.recommendations.map((rec, idx) => (
                    <div key={idx} className="flex items-start space-x-3 p-4 bg-lavender-50 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-lavender-600 mt-0.5 flex-shrink-0" />
                      <p className="text-gray-700">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={resetForm}
                className="w-full mt-6 bg-white border-2 border-lavender-600 text-lavender-600 py-3 px-6 rounded-lg font-semibold hover:bg-lavender-50 transition-all"
              >
                Check Another Platform
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SocialHealthPage;
