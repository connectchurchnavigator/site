import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar2';
import Footer from '../../components/Footer';
import { Helmet } from 'react-helmet-async';

const PlannerPage = () => {
  const features = [
    {
      icon: 'ti-comments',
      title: 'Tell the AI Your Plans',
      description: 'Describe your trip in plain English — dates, interests, cities, denominations, meeting goals.'
    },
    {
      icon: 'ti-search',
      title: 'AI Finds the Right Matches',
      description: 'Our AI searches 20,000+ UK churches, pastors, events and conferences to match your trip.'
    },
    {
      icon: 'ti-calendar',
      title: 'Get Optimised Itinerary',
      description: 'Receive a day-by-day schedule with travel times, meetings, logistics and backup options.'
    }
  ];

  const useCases = [
    {
      icon: 'ti-world',
      title: 'Visiting Missionary',
      description: 'Coming from overseas? Plan church visits, pastor meetings and support raising efficiently.'
    },
    {
      icon: 'ti-briefcase',
      title: 'Conference + Church Tour',
      description: 'Attending a conference? Add church visits before/after to maximize your UK trip.'
    },
    {
      icon: 'ti-home',
      title: 'Relocating to UK',
      description: 'Moving to a new city? Visit multiple churches in one trip to find your new church home.'
    },
    {
      icon: 'ti-flag',
      title: 'Outreach Mission',
      description: 'Planning a ministry tour? Coordinate multiple church visits, events and team logistics.'
    }
  ];

  const pricingTiers = [
    {
      name: 'Free',
      price: '£0',
      duration: 'Up to 3 days',
      features: [
        'AI trip planning',
        'Up to 5 church matches',
        'Basic itinerary',
        'Email support'
      ],
      cta: 'Start Free',
      featured: false
    },
    {
      name: 'Standard',
      price: '£9',
      duration: 'Up to 7 days',
      features: [
        'Everything in Free',
        'Up to 15 church matches',
        'Detailed day-by-day plan',
        'Travel optimization',
        'Pastor contact details',
        'Priority support'
      ],
      cta: 'Get Standard',
      featured: true
    },
    {
      name: 'Premium',
      price: '£19',
      duration: 'Up to 14 days',
      features: [
        'Everything in Standard',
        'Unlimited church matches',
        'Multi-city routing',
        'Event coordination',
        'Accommodation suggestions',
        'Phone support',
        'Custom requests'
      ],
      cta: 'Get Premium',
      featured: false
    }
  ];

  return (
    <>
      <Helmet>
        <title>Ministry Trip Planner | ChurchNavigator</title>
        <meta name="description" content="Plan your UK ministry trip with AI. Visit churches, meet pastors, attend conferences — all optimised for your time and travel. Free to start." />
        <meta property="og:title" content="Ministry Trip Planner | ChurchNavigator" />
        <meta property="og:description" content="AI-powered ministry trip planning for UK church visits, pastor meetings and conferences." />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://churchnavigator.com/planner" />
      </Helmet>

      <Navbar />

      <section className="hero-section" style={{ paddingTop: '120px', paddingBottom: '80px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-7">
              <h1 className="text-white mb-4" style={{ fontSize: '3rem', fontWeight: '700' }}>
                Plan Your Ministry Trip with AI
              </h1>
              <p className="text-white mb-4" style={{ fontSize: '1.25rem', opacity: '0.95' }}>
                Visiting UK churches? Our AI coordinator plans everything — airport pickup, church visits, pastor meetings, conferences — optimised for your time and travel.
              </p>
              <Link to="/planner/new" className="btn btn-light btn-lg" style={{ padding: '15px 40px', fontSize: '1.1rem', fontWeight: '600', borderRadius: '8px' }}>
                Start Planning — Free <i className="ti-arrow-right ml-2"></i>
              </Link>
            </div>
            <div className="col-lg-5">
              <div className="card shadow-lg" style={{ borderRadius: '12px', border: 'none' }}>
                <div className="card-body p-4">
                  <div className="d-flex align-items-center mb-3">
                    <i className="ti-map-alt" style={{ fontSize: '2rem', color: '#667eea' }}></i>
                    <div className="ml-3">
                      <h6 className="mb-0" style={{ fontWeight: '600' }}>Sample Trip Plan</h6>
                      <small className="text-muted">London, 3 days</small>
                    </div>
                  </div>
                  <div className="border-left pl-3 ml-2" style={{ borderColor: '#667eea', borderWidth: '3px' }}>
                    <div className="mb-3">
                      <div className="d-flex align-items-center mb-1">
                        <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>Day 1</span>
                        <small className="text-muted ml-2">Friday</small>
                      </div>
                      <small><strong>9:00</strong> Airport pickup → Hotel</small><br />
                      <small><strong>14:00</strong> Hillsong London (Pastor meeting)</small><br />
                      <small><strong>19:00</strong> HTB evening service</small>
                    </div>
                    <div className="mb-3">
                      <div className="d-flex align-items-center mb-1">
                        <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>Day 2</span>
                        <small className="text-muted ml-2">Saturday</small>
                      </div>
                      <small><strong>10:00</strong> London City Church tour</small><br />
                      <small><strong>14:00</strong> Leadership Conference</small><br />
                      <small><strong>18:30</strong> Dinner with 3 local pastors</small>
                    </div>
                    <div>
                      <div className="d-flex align-items-center mb-1">
                        <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>Day 3</span>
                        <small className="text-muted ml-2">Sunday</small>
                      </div>
                      <small><strong>10:00</strong> Sunday service at chosen church</small><br />
                      <small><strong>13:00</strong> Lunch + final meetings</small><br />
                      <small><strong>16:00</strong> Airport transfer</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-5 bg-light">
        <div className="container">
          <div className="text-center mb-5">
            <h2 style={{ fontWeight: '700', fontSize: '2.5rem' }}>How It Works</h2>
            <p className="text-muted" style={{ fontSize: '1.1rem' }}>Three simple steps to your perfect ministry trip</p>
          </div>
          <div className="row">
            {features.map((feature, index) => (
              <div key={index} className="col-lg-4 mb-4">
                <div className="card h-100 border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                  <div className="card-body text-center p-4">
                    <div className="mb-3" style={{ fontSize: '3rem', color: '#667eea' }}>
                      <i className={feature.icon}></i>
                    </div>
                    <h5 className="mb-3" style={{ fontWeight: '600' }}>{feature.title}</h5>
                    <p className="text-muted">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-5">
        <div className="container">
          <div className="text-center mb-5">
            <h2 style={{ fontWeight: '700', fontSize: '2.5rem' }}>Perfect For</h2>
            <p className="text-muted" style={{ fontSize: '1.1rem' }}>Whatever your ministry journey looks like</p>
          </div>
          <div className="row">
            {useCases.map((useCase, index) => (
              <div key={index} className="col-lg-6 mb-4">
                <div className="card h-100 border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                  <div className="card-body d-flex align-items-start p-4">
                    <div className="mr-3" style={{ fontSize: '2.5rem', color: '#667eea' }}>
                      <i className={useCase.icon}></i>
                    </div>
                    <div>
                      <h5 className="mb-2" style={{ fontWeight: '600' }}>{useCase.title}</h5>
                      <p className="text-muted mb-0">{useCase.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-5 bg-light">
        <div className="container">
          <div className="text-center mb-5">
            <h2 style={{ fontWeight: '700', fontSize: '2.5rem' }}>Simple Pricing</h2>
            <p className="text-muted" style={{ fontSize: '1.1rem' }}>Choose the plan that fits your trip</p>
          </div>
          <div className="row justify-content-center">
            {pricingTiers.map((tier, index) => (
              <div key={index} className="col-lg-4 mb-4">
                <div className={`card h-100 shadow-sm ${tier.featured ? 'border-primary' : 'border-0'}`} style={{ borderRadius: '12px', borderWidth: tier.featured ? '3px' : '0' }}>
                  {tier.featured && (
                    <div className="card-header bg-primary text-white text-center" style={{ borderRadius: '12px 12px 0 0', padding: '10px' }}>
                      <small style={{ fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Most Popular</small>
                    </div>
                  )}
                  <div className="card-body text-center p-4">
                    <h4 style={{ fontWeight: '700' }}>{tier.name}</h4>
                    <div className="my-4">
                      <h2 className="mb-0" style={{ fontWeight: '700', fontSize: '3rem' }}>{tier.price}</h2>
                      <p className="text-muted">{tier.duration}</p>
                    </div>
                    <ul className="list-unstyled text-left mb-4">
                      {tier.features.map((feature, fIndex) => (
                        <li key={fIndex} className="mb-2">
                          <i className="ti-check text-success mr-2"></i>{feature}
                        </li>
                      ))}
                    </ul>
                    <Link 
                      to="/planner/new" 
                      className={`btn btn-block ${tier.featured ? 'btn-primary' : 'btn-outline-primary'}`}
                      style={{ padding: '12px', fontWeight: '600', borderRadius: '8px' }}
                    >
                      {tier.cta}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-5" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="container text-center">
          <h2 className="text-white mb-4" style={{ fontWeight: '700', fontSize: '2.5rem' }}>Ready to Plan Your Trip?</h2>
          <p className="text-white mb-4" style={{ fontSize: '1.25rem', opacity: '0.95' }}>Start with our free plan — no credit card required</p>
          <Link to="/planner/new" className="btn btn-light btn-lg" style={{ padding: '15px 50px', fontSize: '1.1rem', fontWeight: '600', borderRadius: '8px' }}>
            Start Planning Now <i className="ti-arrow-right ml-2"></i>
          </Link>
        </div>
      </section>

      <Footer />
    </>
  );
};

export default PlannerPage;