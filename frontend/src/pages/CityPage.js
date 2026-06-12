import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import ChurchCard from '../components/ChurchCard';
import '../styles/CityPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

const CityPage = () => {
  const { city } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCityData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/api/cities/${city}/summary`);
        if (!response.ok) throw new Error('City not found');
        const result = await response.json();
        setData(result);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCityData();
  }, [city]);

  if (loading) {
    return (
      <div className="city-page loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="city-page error">
        <h1>City Not Found</h1>
        <p>Sorry, we couldn't find any churches in this city.</p>
        <Link to="/" className="btn-primary">Return Home</Link>
      </div>
    );
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `Churches in ${data.city}`,
    "description": data.seo.description,
    "numberOfItems": data.totalChurches,
    "itemListElement": data.featured.map((church, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "Church",
        "name": church.name,
        "address": church.address,
        "url": `https://churchnavigator.com/church/${church._id}`
      }
    }))
  };

  return (
    <>
      <Helmet>
        <title>{data.seo.title}</title>
        <meta name="description" content={data.seo.description} />
        <link rel="canonical" href={data.seo.canonical} />
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      <div className="city-page">
        <section className="city-hero">
          <div className="container">
            <h1>{data.seo.h1}</h1>
            <p className="city-count">{data.totalChurches} churches • {data.denominations.length} denominations • {data.languages.length} languages</p>
          </div>
        </section>

        <section className="city-stats">
          <div className="container">
            <div className="stats-grid">
              <div className="stat-card">
                <h3>{data.totalChurches}</h3>
                <p>Churches</p>
              </div>
              <div className="stat-card">
                <h3>{data.denominations.length}</h3>
                <p>Denominations</p>
              </div>
              <div className="stat-card">
                <h3>{data.languages.length}</h3>
                <p>Languages</p>
              </div>
              <div className="stat-card">
                <h3>{data.events.length}</h3>
                <p>Upcoming Events</p>
              </div>
            </div>
          </div>
        </section>

        <section className="featured-churches">
          <div className="container">
            <h2>Featured Churches in {data.city}</h2>
            <div className="church-grid">
              {data.featured.map((church) => (
                <ChurchCard key={church._id} church={church} />
              ))}
            </div>
          </div>
        </section>

        {data.denominations.length > 0 && (
          <section className="denominations">
            <div className="container">
              <h2>Denominations in {data.city}</h2>
              <div className="denomination-grid">
                {data.denominations.slice(0, 8).map((denom) => (
                  <div key={denom.name} className="denomination-card">
                    <h4>{denom.name}</h4>
                    <p>{denom.count} {denom.count === 1 ? 'church' : 'churches'}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {data.events.length > 0 && (
          <section className="events">
            <div className="container">
              <h2>Upcoming Events in {data.city}</h2>
              <div className="events-list">
                {data.events.map((event) => (
                  <div key={event._id} className="event-card">
                    <h4>{event.name}</h4>
                    <p className="event-date">{new Date(event.date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    {event.description && <p>{event.description.substring(0, 150)}...</p>}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {data.pastors.length > 0 && (
          <section className="pastors">
            <div className="container">
              <h2>Church Leaders in {data.city}</h2>
              <div className="pastors-grid">
                {data.pastors.map((pastor) => (
                  <div key={pastor._id} className="pastor-card">
                    {pastor.imageUrl && <img src={pastor.imageUrl} alt={pastor.name} />}
                    <h4>{pastor.name}</h4>
                    {pastor.church && <p>{pastor.church}</p>}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {data.nearby.length > 0 && (
          <section className="nearby-cities">
            <div className="container">
              <h2>Churches in Nearby Cities</h2>
              <div className="nearby-grid">
                {data.nearby.map((nearbyCity) => (
                  <Link
                    key={nearbyCity.slug}
                    to={`/churches/${nearbyCity.slug}`}
                    className="nearby-card"
                  >
                    <h4>{nearbyCity.name}</h4>
                    <p>{nearbyCity.count} churches</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="all-churches">
          <div className="container">
            <h2>All Churches in {data.city}</h2>
            <div className="church-grid">
              {data.allChurches.map((church) => (
                <ChurchCard key={church._id} church={church} />
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default CityPage;
