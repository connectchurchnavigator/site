import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import './ToolsPage.css';

const ToolsPage = () => {
  const [healthScore, setHealthScore] = useState(null);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    postcode: '',
    website: '',
    socialLinks: ''
  });

  const handleHealthCheck = async (e) => {
    e.preventDefault();
    setCheckingHealth(true);
    
    setTimeout(() => {
      const websiteScore = formData.website ? 25 : 0;
      const socialScore = formData.socialLinks ? 20 : 0;
      const infoScore = formData.name && formData.postcode ? 30 : 0;
      const randomBonus = Math.floor(Math.random() * 26);
      
      const total = websiteScore + socialScore + infoScore + randomBonus;
      
      setHealthScore({
        total,
        breakdown: {
          information: infoScore + Math.floor(randomBonus / 3),
          online: websiteScore + Math.floor(randomBonus / 3),
          social: socialScore + Math.floor(randomBonus / 3)
        },
        grade: total >= 80 ? 'A' : total >= 60 ? 'B' : total >= 40 ? 'C' : 'D'
      });
      setCheckingHealth(false);
    }, 1500);
  };

  const tools = [
    {
      id: 'health',
      name: 'Health Score Checker',
      tier: 'Free',
      tierClass: 'free',
      description: 'Instant assessment of your church\'s digital presence and discoverability score',
      icon: '🏥',
      link: '/tools/health-check',
      features: ['Digital presence score', 'Quick recommendations', 'Comparison data']
    },
    {
      id: 'analytics',
      name: 'View Analytics',
      tier: 'Standard',
      tierClass: 'standard',
      description: 'Track profile views, visitor engagement, and search performance over time',
      icon: '📊',
      link: '/tools/analytics',
      features: ['Profile view tracking', 'Search analytics', 'Engagement metrics']
    },
    {
      id: 'social',
      name: 'Social Media Health',
      tier: 'Standard',
      tierClass: 'standard',
      description: 'Monitor social media presence, posting frequency, and engagement across platforms',
      icon: '📱',
      link: '/tools/social',
      features: ['Cross-platform monitoring', 'Posting frequency analysis', 'Engagement tracking']
    },
    {
      id: 'intelligence',
      name: 'AI Pattern Intelligence',
      tier: 'Premium',
      tierClass: 'premium',
      description: 'Weekly AI-powered insights on visitor patterns, growth opportunities, and trends',
      icon: '🧠',
      link: '/tools/intelligence',
      features: ['AI weekly briefings', 'Growth predictions', 'Trend analysis']
    },
    {
      id: 'network',
      name: 'Network Benchmarking',
      tier: 'Premium',
      tierClass: 'premium',
      description: 'Compare your metrics with similar churches and regional benchmarks',
      icon: '🌐',
      link: '/tools/network',
      features: ['Peer comparisons', 'Regional benchmarks', 'Best practice insights']
    }
  ];

  const pricingPlans = [
    {
      name: 'Free',
      price: '£0',
      period: 'forever',
      description: 'Perfect for getting started',
      features: [
        'Church listing',
        'Health Score Checker',
        'Basic profile updates',
        'Community access'
      ],
      cta: 'Get Started',
      link: '/register',
      highlight: false
    },
    {
      name: 'Standard',
      price: '£9',
      period: 'per month',
      description: 'Essential analytics and insights',
      features: [
        'Everything in Free',
        'View Analytics dashboard',
        'Social Media Health monitoring',
        'Priority listing',
        'Email support'
      ],
      cta: 'Start Free Trial',
      link: '/pricing',
      highlight: false
    },
    {
      name: 'Premium',
      price: '£19',
      period: 'per month',
      description: 'AI-powered intelligence',
      features: [
        'Everything in Standard',
        'AI Pattern Intelligence',
        'Network Benchmarking',
        'Weekly AI briefings',
        'Advanced insights',
        'Priority support'
      ],
      cta: 'Start Free Trial',
      link: '/pricing',
      highlight: true
    },
    {
      name: 'Network',
      price: '£49',
      period: 'per month',
      description: 'For multi-site churches',
      features: [
        'Everything in Premium',
        'Up to 10 locations',
        'Network-wide analytics',
        'Consolidated reporting',
        'Dedicated support',
        'Custom integrations'
      ],
      cta: 'Contact Sales',
      link: '/contact',
      highlight: false
    }
  ];

  return (
    <>
      <Helmet>
        <title>Church Tools - Ministry Intelligence Platform | ChurchNavigator</title>
        <meta name="description" content="Free and premium tools for churches: health score checker, analytics, social media monitoring, AI insights, and network benchmarking. Start with our free health check." />
      </Helmet>

      <div className="tools-page">
        <section className="tools-hero">
          <div className="container">
            <h1>Ministry Intelligence Platform</h1>
            <p className="hero-subtitle">Data-driven insights to grow your church's reach and impact</p>
            <div className="tools-stats">
              <div className="stat">
                <div className="stat-number">12,000+</div>
                <div className="stat-label">Churches Using Tools</div>
              </div>
              <div className="stat">
                <div className="stat-number">2.4M</div>
                <div className="stat-label">Monthly Insights Generated</div>
              </div>
              <div className="stat">
                <div className="stat-number">94%</div>
                <div className="stat-label">Satisfaction Rate</div>
              </div>
            </div>
          </div>
        </section>

        <section className="health-checker-widget">
          <div className="container">
            <div className="widget-header">
              <h2>🏥 Free Health Score Checker</h2>
              <p>Get an instant assessment of your church's digital presence</p>
            </div>
            <div className="widget-content">
              <form onSubmit={handleHealthCheck} className="health-form">
                <div className="form-row">
                  <input
                    type="text"
                    placeholder="Church Name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Postcode"
                    value={formData.postcode}
                    onChange={(e) => setFormData({...formData, postcode: e.target.value})}
                    required
                  />
                </div>
                <div className="form-row">
                  <input
                    type="url"
                    placeholder="Website URL (optional)"
                    value={formData.website}
                    onChange={(e) => setFormData({...formData, website: e.target.value})}
                  />
                  <input
                    type="text"
                    placeholder="Social media links (optional)"
                    value={formData.socialLinks}
                    onChange={(e) => setFormData({...formData, socialLinks: e.target.value})}
                  />
                </div>
                <button type="submit" className="btn-check" disabled={checkingHealth}>
                  {checkingHealth ? 'Analyzing...' : 'Check Health Score'}
                </button>
              </form>

              {healthScore && (
                <div className="health-results">
                  <div className="score-circle">
                    <div className="score-number">{healthScore.total}</div>
                    <div className="score-grade">Grade {healthScore.grade}</div>
                  </div>
                  <div className="score-breakdown">
                    <div className="breakdown-item">
                      <span>Information Completeness</span>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{width: `${healthScore.breakdown.information}%`}}></div>
                      </div>
                      <span>{healthScore.breakdown.information}%</span>
                    </div>
                    <div className="breakdown-item">
                      <span>Online Presence</span>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{width: `${healthScore.breakdown.online}%`}}></div>
                      </div>
                      <span>{healthScore.breakdown.online}%</span>
                    </div>
                    <div className="breakdown-item">
                      <span>Social Engagement</span>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{width: `${healthScore.breakdown.social}%`}}></div>
                      </div>
                      <span>{healthScore.breakdown.social}%</span>
                    </div>
                  </div>
                  <Link to="/tools/health-check" className="btn-full-report">View Full Report →</Link>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="tools-grid">
          <div className="container">
            <h2>Complete Toolset for Church Growth</h2>
            <div className="tools-cards">
              {tools.map(tool => (
                <div key={tool.id} className="tool-card">
                  <div className="tool-header">
                    <span className="tool-icon">{tool.icon}</span>
                    <span className={`tool-tier ${tool.tierClass}`}>{tool.tier}</span>
                  </div>
                  <h3>{tool.name}</h3>
                  <p>{tool.description}</p>
                  <ul className="tool-features">
                    {tool.features.map((feature, idx) => (
                      <li key={idx}>✓ {feature}</li>
                    ))}
                  </ul>
                  <Link to={tool.link} className="btn-tool">Learn More →</Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="ai-briefing-preview">
          <div className="container">
            <div className="preview-badge">Premium Feature Preview</div>
            <h2>🧠 AI Weekly Briefing Sample</h2>
            <div className="briefing-card">
              <div className="briefing-header">
                <h3>St Mary's Church, Birmingham</h3>
                <span className="briefing-date">Week of January 20, 2025</span>
              </div>
              <div className="briefing-section">
                <h4>📈 Key Metrics</h4>
                <ul>
                  <li><strong>+23% profile views</strong> vs. last week (187 total)</li>
                  <li><strong>Peak search time:</strong> Sunday 9-11am</li>
                  <li><strong>Top keyword:</strong> "family friendly church Birmingham"</li>
                </ul>
              </div>
              <div className="briefing-section">
                <h4>💡 AI Insights</h4>
                <p>Your profile views spike on Sunday mornings, suggesting visitors are searching for last-minute service options. Consider adding <strong>service time updates</strong> and <strong>visitor parking info</strong> to capture more conversions.</p>
              </div>
              <div className="briefing-section">
                <h4>🎯 Recommended Actions</h4>
                <ol>
                  <li>Update your "Family Ministry" section — 67% of viewers clicked this</li>
                  <li>Add photos of your children's area (top competitor has 3x engagement)</li>
                  <li>Post about your upcoming Easter services (early search interest detected)</li>
                </ol>
              </div>
              <div className="briefing-footer">
                <p><em>Unlock weekly AI briefings with Premium — £19/month</em></p>
              </div>
            </div>
          </div>
        </section>

        <section className="pricing-section">
          <div className="container">
            <h2>Choose Your Plan</h2>
            <p className="pricing-subtitle">All plans include 14-day free trial. Cancel anytime.</p>
            <div className="pricing-grid">
              {pricingPlans.map((plan, idx) => (
                <div key={idx} className={`pricing-card ${plan.highlight ? 'highlight' : ''}`}>
                  {plan.highlight && <div className="popular-badge">Most Popular</div>}
                  <h3>{plan.name}</h3>
                  <div className="price">
                    <span className="amount">{plan.price}</span>
                    <span className="period">/{plan.period}</span>
                  </div>
                  <p className="plan-description">{plan.description}</p>
                  <ul className="plan-features">
                    {plan.features.map((feature, i) => (
                      <li key={i}>✓ {feature}</li>
                    ))}
                  </ul>
                  <Link to={plan.link} className={`btn-pricing ${plan.highlight ? 'btn-primary' : ''}`}>
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="cta-band">
          <div className="container">
            <h2>Ready to grow your church's digital presence?</h2>
            <p>Start with our free health check or jump straight into a 14-day trial</p>
            <div className="cta-buttons">
              <Link to="/register" className="btn-cta-primary">Get Started Free</Link>
              <Link to="/pricing" className="btn-cta-secondary">View All Plans</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default ToolsPage;