import React from 'react';
import { Link } from 'react-router-dom';

const SearchResultCard = ({ result }) => {
  const typeRoutes = {
    'church': '/churches',
    'event': '/events',
    'pastor': '/pastors',
    'worship-leader': '/worship-leaders',
    'media-team': '/media-teams',
    'bible-college': '/bible-colleges'
  };

  const baseRoute = typeRoutes[result.type] || '/churches';
  const imageUrl = result.image || 'https://ik.imagekit.io/cuizrvzly/church_navigator/default-church.jpg';

  return (
    <Link to={`${baseRoute}/${result.slug}`} className="block bg-white rounded-lg shadow hover:shadow-lg transition p-6">
      <div className="flex gap-4">
        <img
          src={imageUrl}
          alt={result.name}
          className="w-24 h-24 rounded-lg object-cover"
          onError={(e) => {
            e.target.src = 'https://ik.imagekit.io/cuizrvzly/church_navigator/default-church.jpg';
          }}
        />
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                {result.name}
                {result.is_verified && (
                  <span className="ml-2 text-blue-600 text-sm">✓ Verified</span>
                )}
              </h3>
              <p className="text-gray-600 text-sm mt-1">
                {result.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                {result.city && ` • ${result.city}`}
                {result.denomination && ` • ${result.denomination}`}
              </p>
            </div>
            {result.rating && (
              <div className="flex items-center gap-1">
                <span className="text-yellow-500">★</span>
                <span className="font-semibold">{result.rating.toFixed(1)}</span>
                <span className="text-gray-500 text-sm">({result.total_reviews || 0})</span>
              </div>
            )}
          </div>
          {result.distance_km && (
            <p className="text-sm text-gray-500 mt-2">
              📍 {result.distance_km.toFixed(1)} km away
            </p>
          )}
        </div>
      </div>
    </Link>
  );
};

export default SearchResultCard;
