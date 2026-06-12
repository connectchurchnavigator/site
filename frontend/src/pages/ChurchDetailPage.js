import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getResponsiveImageSet } from '../utils/imageUtils';

const ChurchDetailPage = () => {
  const { slug } = useParams();
  const [church, setChurch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchChurch = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/churches/${slug}`);
        if (!response.ok) throw new Error('Church not found');
        const data = await response.json();
        setChurch(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchChurch();
  }, [slug]);

  if (loading) return <div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div></div>;
  if (error) return <div className="container mx-auto px-4 py-8"><div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div></div>;
  if (!church) return null;

  const imageUrl = church.image_url || 'https://ik.imagekit.io/cuizrvzly/church_navigator/default-church.jpg';
  const imageSizes = getResponsiveImageSet(imageUrl);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Church',
    'name': church.name,
    'address': {
      '@type': 'PostalAddress',
      'streetAddress': church.address,
      'addressLocality': church.city,
      'postalCode': church.postcode,
      'addressCountry': 'GB'
    },
    'image': imageUrl,
    'telephone': church.phone,
    'email': church.email,
    'url': church.website
  };

  return (
    <>
      <Helmet>
        <title>{church.name} - {church.city} | ChurchNavigator</title>
        <meta name="description" content={`${church.name} in ${church.city}. ${church.denomination || 'Church'} - ${church.description?.substring(0, 150) || 'Find service times, contact details and more'}`} />
        <link rel="canonical" href={`https://churchnavigator.com/church/${slug}`} />
        <meta property="og:title" content={`${church.name} - ${church.city}`} />
        <meta property="og:description" content={church.description?.substring(0, 200) || `${church.denomination || 'Church'} in ${church.city}`} />
        <meta property="og:image" content={imageUrl} />
        <meta property="og:url" content={`https://churchnavigator.com/church/${slug}`} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <div className="bg-gray-50 min-h-screen">
        <div className="relative h-96 bg-gray-900">
          <picture>
            <source media="(max-width: 640px)" srcSet={imageSizes.mobile} />
            <source media="(max-width: 1024px)" srcSet={imageSizes.tablet} />
            <img
              src={imageSizes.desktop}
              alt={church.name}
              loading="eager"
              className="w-full h-full object-cover opacity-70"
            />
          </picture>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
            <div className="container mx-auto">
              <h1 className="text-4xl md:text-5xl font-bold mb-2">{church.name}</h1>
              <p className="text-xl">{church.city}, {church.postcode}</p>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold mb-4">About</h2>
                <p className="text-gray-700 whitespace-pre-line">{church.description || 'No description available.'}</p>
              </div>

              {church.service_times && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-2xl font-bold mb-4">Service Times</h2>
                  <p className="text-gray-700 whitespace-pre-line">{church.service_times}</p>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold mb-4">Contact</h2>
                {church.phone && <p className="mb-2"><strong>Phone:</strong> <a href={`tel:${church.phone}`} className="text-blue-600 hover:underline">{church.phone}</a></p>}
                {church.email && <p className="mb-2"><strong>Email:</strong> <a href={`mailto:${church.email}`} className="text-blue-600 hover:underline">{church.email}</a></p>}
                {church.website && <p className="mb-2"><strong>Website:</strong> <a href={church.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Visit Website</a></p>}
                {church.address && <p className="mb-2"><strong>Address:</strong> {church.address}, {church.city}, {church.postcode}</p>}
              </div>

              {church.denomination && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-2xl font-bold mb-4">Details</h2>
                  <p><strong>Denomination:</strong> {church.denomination}</p>
                </div>
              )}

              {church.pastor_name && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-2xl font-bold mb-4">Leadership</h2>
                  <p><strong>Pastor:</strong> {church.pastor_slug ? <Link to={`/pastor/${church.pastor_slug}`} className="text-blue-600 hover:underline">{church.pastor_name}</Link> : church.pastor_name}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChurchDetailPage;