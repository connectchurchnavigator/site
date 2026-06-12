import React from 'react';
import { Link } from 'react-router-dom';
import { getOptimizedImageUrl } from '../utils/imageUtils';

const ChurchCard = ({ church }) => {
  const imageUrl = church.image_url || 'https://ik.imagekit.io/cuizrvzly/church_navigator/default-church.jpg';
  const optimizedUrl = getOptimizedImageUrl(imageUrl, 400, 80);

  return (
    <Link to={`/church/${church.slug}`} className="block bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300">
      <div className="aspect-w-16 aspect-h-9 bg-gray-200 rounded-t-lg overflow-hidden">
        <img
          src={optimizedUrl}
          alt={church.name}
          loading="lazy"
          className="w-full h-48 object-cover"
        />
      </div>
      <div className="p-4">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{church.name}</h3>
        <p className="text-gray-600 mb-2">
          {church.denomination && <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-2">{church.denomination}</span>}
        </p>
        <p className="text-gray-700 text-sm">{church.city}, {church.postcode}</p>
        {church.pastor_name && (
          <p className="text-gray-600 text-sm mt-2">Pastor: {church.pastor_name}</p>
        )}
      </div>
    </Link>
  );
};

export default ChurchCard;