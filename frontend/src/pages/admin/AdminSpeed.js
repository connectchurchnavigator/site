import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { 
  Gauge, 
  HelpCircle, 
  Search, 
  Zap, 
  Smartphone, 
  Monitor, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  RefreshCw
} from 'lucide-react';
import { utilityAPI } from '../../lib/api';
import { toast } from 'sonner';

export default function AdminSpeed() {
  const [url, setUrl] = useState('');
  const [strategy, setStrategy] = useState('desktop');
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  // Auto-set SEO Title for Admin page
  useEffect(() => {
    document.title = 'Speed Analyzer | Church Navigator Admin';
  }, []);

  // Cycle loading messages to make the wait engaging
  useEffect(() => {
    let interval;
    if (loading) {
      setLoadingStage(0);
      interval = setInterval(() => {
        setLoadingStage((prev) => (prev + 1) % 4);
      }, 5000);
    } else {
      setLoadingStage(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const loadingMessages = [
    'Connecting to Google PageSpeed Insights...',
    'Spinning up simulated Lighthouse sandbox environment...',
    'Measuring Core Web Vitals (LCP, FID, CLS)...',
    'Compiling performance audit metrics and scores...'
  ];

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!url) {
      toast.error('Please enter a URL to audit.');
      return;
    }

    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const res = await utilityAPI.getPageSpeed(url, strategy);
      setReport(res.data);
      toast.success('Page speed audit completed successfully!');
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.detail || 'Failed to complete page speed analysis. Google API might be throttled or the site is inaccessible.';
      setError(errMsg);
      toast.error('Audit failed');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-emerald-600 stroke-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 50) return 'text-amber-500 stroke-amber-500 bg-amber-50 border-amber-200';
    return 'text-rose-600 stroke-rose-600 bg-rose-50 border-rose-200';
  };

  const getScoreTier = (score) => {
    if (score >= 90) return { label: 'Excellent', icon: CheckCircle2, color: 'text-emerald-700 bg-emerald-100 border-emerald-200' };
    if (score >= 50) return { label: 'Needs Improvement', icon: AlertTriangle, color: 'text-amber-700 bg-amber-100 border-amber-200' };
    return { label: 'Poor Performance', icon: XCircle, color: 'text-rose-700 bg-rose-100 border-rose-200' };
  };

  const getMetricBadge = (score) => {
    if (score >= 0.9) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (score >= 0.5) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-rose-100 text-rose-800 border-rose-200';
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Gauge className="h-6 w-6 text-brand" />
            Page Speed Analyzer
          </h1>
          <p className="text-slate-600">Audit loading speed and core web vitals of any web page via Google APIs.</p>
        </div>
      </div>

      {/* Input console */}
      <Card className="p-6 shadow-md border-slate-200/80 bg-white">
        <form onSubmit={handleAnalyze} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="url-input" className="text-slate-700 font-semibold">Web Page URL</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="url-input"
                  type="text"
                  placeholder="https://connectchurch.com or any public website"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={loading}
                  className="pl-9 h-11 border-slate-300 focus:ring-brand focus:border-brand"
                />
              </div>
            </div>

            <div className="w-full md:w-48 space-y-1.5">
              <Label htmlFor="strategy-select" className="text-slate-700 font-semibold">Device Type</Label>
              <select
                id="strategy-select"
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                disabled={loading}
                className="w-full h-11 px-3 border border-slate-300 rounded-md bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition"
              >
                <option value="desktop">🖥️ Desktop</option>
                <option value="mobile">📱 Mobile</option>
              </select>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full md:w-auto h-11 bg-brand hover:bg-brand/90 text-white font-semibold px-6 shadow-sm flex items-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Running Audit...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Analyze Speed
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>

      {/* Loading State */}
      {loading && (
        <Card className="p-12 text-center shadow-md border-slate-100 flex flex-col items-center justify-center space-y-6 bg-white min-h-[350px]">
          <div className="relative flex items-center justify-center">
            {/* Spinning outward rings */}
            <div className="absolute w-24 h-24 rounded-full border-4 border-slate-100 border-t-brand animate-spin" />
            <div className="absolute w-16 h-16 rounded-full border-4 border-slate-100 border-b-brand animate-spin [animation-direction:reverse]" />
            <Gauge className="h-10 w-10 text-brand animate-pulse" />
          </div>
          <div className="space-y-2 max-w-md">
            <h3 className="font-bold text-lg text-slate-800">Generating Performance Report</h3>
            <p className="text-sm text-slate-500 animate-pulse transition-all duration-500">
              {loadingMessages[loadingStage]}
            </p>
            <div className="w-48 h-1 bg-slate-100 rounded-full mx-auto overflow-hidden mt-4">
              <div className="h-full bg-brand rounded-full animate-progress" style={{ width: '100%' }} />
            </div>
          </div>
        </Card>
      )}

      {/* Error state */}
      {error && (
        <Card className="p-6 border-rose-200 bg-rose-50/50 shadow-sm text-center space-y-3">
          <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto" />
          <h3 className="font-bold text-rose-800 text-lg">Analysis Failed</h3>
          <p className="text-sm text-rose-700 max-w-2xl mx-auto">{error}</p>
          <p className="text-xs text-rose-500">Verify that the URL is public, spelt correctly, and isn't blocking Google crawl requests.</p>
        </Card>
      )}

      {/* Report Dashboard */}
      {report && !loading && (
        <div className="space-y-6 animate-fadeIn">
          {/* Summary Score Card */}
          <Card className="p-8 shadow-md border-slate-200 bg-white">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="space-y-3 text-center lg:text-left flex-1">
                <div className="flex flex-wrap gap-2 items-center justify-center lg:justify-start">
                  <span className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider bg-slate-100 text-slate-600 border flex items-center gap-1.5">
                    {report.strategy === 'desktop' ? <Monitor className="h-3.5 w-3.5" /> : <Smartphone className="h-3.5 w-3.5" />}
                    {report.strategy} Audit
                  </span>
                  {(() => {
                    const tier = getScoreTier(report.overallScore);
                    const TierIcon = tier.icon;
                    return (
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full border flex items-center gap-1.5 ${tier.color}`}>
                        <TierIcon className="h-3.5 w-3.5" />
                        {tier.label}
                      </span>
                    );
                  })()}
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900 break-all">{report.url}</h2>
                <p className="text-xs text-slate-500">
                  Analysis completed on {new Date(report.analyzedAt).toLocaleString()}
                </p>
              </div>

              {/* SVG Radial Progress Meter */}
              <div className="flex flex-col items-center justify-center">
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    {/* Background circle */}
                    <circle
                      cx="72"
                      cy="72"
                      r="60"
                      className="stroke-slate-100 fill-none"
                      strokeWidth="10"
                    />
                    {/* Foreground score progress */}
                    <circle
                      cx="72"
                      cy="72"
                      r="60"
                      className={`fill-none transition-all duration-1000 ease-out ${getScoreColor(report.overallScore)}`}
                      strokeWidth="10"
                      strokeDasharray={376.99}
                      strokeDashoffset={376.99 - (376.99 * report.overallScore) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute text-center flex flex-col items-center">
                    <span className="text-4xl font-extrabold tracking-tighter text-slate-800">{report.overallScore}</span>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mt-0.5">SCORE</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Performance Audit Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* First Contentful Paint */}
            <Card className="p-5 flex flex-col justify-between hover:border-slate-300 transition-all bg-white border-slate-200">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                      First Contentful Paint
                      <div className="group relative cursor-pointer">
                        <HelpCircle className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 transition" />
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 text-white text-[10px] rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 text-center font-normal leading-normal">
                          FCP marks the time at which the first text or image is painted on the screen.
                        </span>
                      </div>
                    </h3>
                    <p className="text-[11px] text-slate-500">DOM response rendering start.</p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getMetricBadge(report.metrics.fcp.score)}`}>
                    {report.metrics.fcp.displayValue}
                  </span>
                </div>
              </div>
              <div className="mt-6 pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-400">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                Target limit: &lt; 1.8s
              </div>
            </Card>

            {/* Largest Contentful Paint */}
            <Card className="p-5 flex flex-col justify-between hover:border-slate-300 transition-all bg-white border-slate-200">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                      Largest Contentful Paint
                      <div className="group relative cursor-pointer">
                        <HelpCircle className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 transition" />
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 text-white text-[10px] rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 text-center font-normal leading-normal">
                          LCP marks the time at which the main content of a page has likely loaded.
                        </span>
                      </div>
                    </h3>
                    <p className="text-[11px] text-slate-500">Core Web Vital: perceived speed.</p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getMetricBadge(report.metrics.lcp.score)}`}>
                    {report.metrics.lcp.displayValue}
                  </span>
                </div>
              </div>
              <div className="mt-6 pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-400">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                Target limit: &lt; 2.5s
              </div>
            </Card>

            {/* Cumulative Layout Shift */}
            <Card className="p-5 flex flex-col justify-between hover:border-slate-300 transition-all bg-white border-slate-200">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                      Cumulative Layout Shift
                      <div className="group relative cursor-pointer">
                        <HelpCircle className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 transition" />
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 text-white text-[10px] rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 text-center font-normal leading-normal">
                          CLS measures visual stability. It quantifies unexpected layout shifts during load.
                        </span>
                      </div>
                    </h3>
                    <p className="text-[11px] text-slate-500">Core Web Vital: visual stability.</p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getMetricBadge(report.metrics.cls.score)}`}>
                    {report.metrics.cls.displayValue}
                  </span>
                </div>
              </div>
              <div className="mt-6 pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-400">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                Target limit: &lt; 0.1
              </div>
            </Card>

            {/* Total Blocking Time */}
            <Card className="p-5 flex flex-col justify-between hover:border-slate-300 transition-all bg-white border-slate-200">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                      Total Blocking Time
                      <div className="group relative cursor-pointer">
                        <HelpCircle className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 transition" />
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 text-white text-[10px] rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 text-center font-normal leading-normal">
                          TBT measures the total amount of time between FCP and Interactive, where task blocks exceeded 50ms.
                        </span>
                      </div>
                    </h3>
                    <p className="text-[11px] text-slate-500">Quantifies input responsiveness.</p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getMetricBadge(report.metrics.tbt.score)}`}>
                    {report.metrics.tbt.displayValue}
                  </span>
                </div>
              </div>
              <div className="mt-6 pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-400">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                Target limit: &lt; 200ms
              </div>
            </Card>

            {/* Speed Index */}
            <Card className="p-5 flex flex-col justify-between hover:border-slate-300 transition-all bg-white border-slate-200">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                      Speed Index
                      <div className="group relative cursor-pointer">
                        <HelpCircle className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 transition" />
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 text-white text-[10px] rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 text-center font-normal leading-normal">
                          Speed Index shows how quickly the contents of a page are visibly populated.
                        </span>
                      </div>
                    </h3>
                    <p className="text-[11px] text-slate-500">Visual population velocity.</p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getMetricBadge(report.metrics.speedIndex.score)}`}>
                    {report.metrics.speedIndex.displayValue}
                  </span>
                </div>
              </div>
              <div className="mt-6 pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-400">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                Target limit: &lt; 3.4s
              </div>
            </Card>

            {/* Explanatory Info Card */}
            <Card className="p-5 flex flex-col justify-between bg-slate-50 border-slate-200">
              <div className="space-y-2">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  Lighthouse Audit Guidelines
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Scores correspond to performance classifications:
                </p>
                <div className="space-y-1.5 mt-2">
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-slate-600 font-semibold">90 - 100</span>
                    <span className="text-slate-400">(Good / Passed)</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="text-slate-600 font-semibold">50 - 89</span>
                    <span className="text-slate-400">(Needs Improvement)</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span className="text-slate-600 font-semibold">0 - 49</span>
                    <span className="text-slate-400">(Poor Performance)</span>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 italic">Core Web Vitals are verified dynamically based on real-time simulated sandbox load environments.</p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
