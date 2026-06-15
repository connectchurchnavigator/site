import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, AlertCircle, Lightbulb, Calendar, BarChart3, MessageSquare, RefreshCw } from 'lucide-react';
import api from '../../services/api';

const AIIntelligencePage = () => {
  const [briefing, setBriefing] = useState(null);
  const [patterns, setPatterns] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [askQuery, setAskQuery] = useState('');
  const [askResponse, setAskResponse] = useState(null);
  const [askLoading, setAskLoading] = useState(false);
  const [selectedListing] = useState(() => localStorage.getItem('selectedListingId'));

  useEffect(() => {
    if (!selectedListing) return;
    loadData();
  }, [selectedListing]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [briefingRes, patternsRes] = await Promise.all([
        api.get(`/api/tools/intelligence/${selectedListing}/briefing/latest`),
        api.get(`/api/tools/intelligence/${selectedListing}/patterns`)
      ]);
      setBriefing(briefingRes.data);
      setPatterns(patternsRes.data);
    } catch (error) {
      console.error('Failed to load intelligence:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await api.post(`/api/tools/intelligence/${selectedListing}/briefing?regenerate=true`);
      setBriefing(res.data);
    } catch (error) {
      console.error('Failed to regenerate:', error);
    } finally {
      setRegenerating(false);
    }
  };

  const handleAskAI = async (e) => {
    e.preventDefault();
    if (!askQuery.trim()) return;
    setAskLoading(true);
    try {
      const res = await api.post(`/api/tools/intelligence/${selectedListing}/ask`, { query: askQuery });
      setAskResponse(res.data);
    } catch (error) {
      console.error('Ask AI failed:', error);
    } finally {
      setAskLoading(false);
    }
  };

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-purple-400 text-lg">Loading AI Intelligence...</div>
      </div>
    );
  }

  if (!selectedListing) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400 text-lg">Please select a listing first</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-purple-400" />
            <h1 className="text-3xl font-bold text-white">AI Pattern Intelligence</h1>
            <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-sm rounded-full border border-purple-500/30">Premium</span>
          </div>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
            Regenerate
          </button>
        </div>

        {briefing && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-green-900/30 to-green-950/50 border border-green-500/30 rounded-xl p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <h3 className="text-lg font-semibold text-green-300">What's Working</h3>
              </div>
              <ul className="space-y-2">
                {briefing.what_is_working.map((item, i) => (
                  <li key={i} className="text-green-100 text-sm flex items-start gap-2">
                    <span className="text-green-400 mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-amber-900/30 to-amber-950/50 border border-amber-500/30 rounded-xl p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-semibold text-amber-300">What's Not Working</h3>
              </div>
              <ul className="space-y-2">
                {briefing.what_is_not_working.map((item, i) => (
                  <li key={i} className="text-amber-100 text-sm flex items-start gap-2">
                    <span className="text-amber-400 mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-purple-900/30 to-purple-950/50 border border-purple-500/30 rounded-xl p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-purple-300">This Week's Opportunity</h3>
              </div>
              <p className="text-purple-100 text-sm">{briefing.this_week_opportunity}</p>
            </motion.div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">12-Month View Heatmap</h3>
            </div>
            {patterns && patterns.daily_views && (
              <div className="grid grid-cols-7 gap-1">
                {patterns.daily_views.slice(-90).map((day, i) => {
                  const intensity = Math.min(day.views / 10, 1);
                  return (
                    <div
                      key={i}
                      className="aspect-square rounded"
                      style={{
                        backgroundColor: `rgba(139, 92, 246, ${intensity})`,
                        border: '1px solid rgba(139, 92, 246, 0.3)'
                      }}
                      title={`${day.date}: ${day.views} views`}
                    />
                  );
                })}
              </div>
            )}
            {patterns && (
              <div className="mt-4 flex justify-between text-xs text-slate-400">
                <span>Best: {monthNames[patterns.best_month_of_year - 1]}</span>
                <span>Worst: {monthNames[patterns.worst_month - 1]}</span>
                <span>Peak Day: {patterns.best_day_of_week}</span>
              </div>
            )}
          </div>

          <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-semibold text-white">Content Performance</h3>
            </div>
            {patterns && patterns.content_performance && (
              <div className="space-y-3">
                {patterns.content_performance.slice(0, 5).map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300 capitalize">{item.type}</span>
                      <span className="text-emerald-400">{item.avg_views} avg views</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div
                        className="bg-emerald-500 h-2 rounded-full"
                        style={{ width: `${Math.min((item.avg_views / 100) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {briefing && (
          <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6 mb-8">
            <h3 className="text-xl font-semibold text-white mb-4">AI Strategic Briefing</h3>
            <div className="prose prose-invert max-w-none">
              <p className="text-slate-300 whitespace-pre-line">{briefing.ai_briefing_text}</p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-700">
              <p className="text-xs text-slate-500">Generated {new Date(briefing.generated_at).toLocaleDateString()}</p>
            </div>
          </div>
        )}

        <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Ask AI</h3>
          </div>
          <form onSubmit={handleAskAI} className="mb-4">
            <input
              type="text"
              value={askQuery}
              onChange={(e) => setAskQuery(e.target.value)}
              placeholder="Ask a question about your data..."
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
            />
            <button
              type="submit"
              disabled={askLoading}
              className="mt-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition disabled:opacity-50"
            >
              {askLoading ? 'Thinking...' : 'Ask AI'}
            </button>
          </form>
          <div className="flex flex-wrap gap-2 mb-4">
            {['Why did views drop in May?', 'What content gets most engagement?', 'When should I post?'].map((example, i) => (
              <button
                key={i}
                onClick={() => setAskQuery(example)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-full border border-slate-600 transition"
              >
                {example}
              </button>
            ))}
          </div>
          {askResponse && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-slate-800/50 border border-slate-600 rounded-lg p-4"
            >
              <p className="text-slate-300 whitespace-pre-line">{askResponse.answer}</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIIntelligencePage;
