import React from 'react';
import { Link } from 'react-router-dom';

const SpaceRentalBadge = ({ church, size = 'normal' }) => {
  const hasSpaceAvailable = church?.space_rental?.enabled;
  const needsSpace = church?.space_needed?.enabled;

  if (!hasSpaceAvailable && !needsSpace) return null;

  const sizeClasses = {
    small: 'px-2 py-1 text-xs',
    normal: 'px-3 py-1.5 text-sm',
    large: 'px-4 py-2 text-base'
  };

  const iconSizes = {
    small: 'text-xs',
    normal: 'text-sm',
    large: 'text-base'
  };

  return (
    <div className="flex flex-wrap gap-2">
      {hasSpaceAvailable && (
        <Link
          to={`/church/${church._id}#space-rental`}
          className={`inline-flex items-center gap-1.5 rounded-full font-medium transition-all hover:scale-105 ${
            sizeClasses[size]
          } bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100`}
        >
          <i className={`ti ti-building ${iconSizes[size]}`}></i>
          <span>Space Available</span>
        </Link>
      )}
      {needsSpace && (
        <Link
          to={`/church/${church._id}#space-needed`}
          className={`inline-flex items-center gap-1.5 rounded-full font-medium transition-all hover:scale-105 ${
            sizeClasses[size]
          } bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100`}
        >
          <i className={`ti ti-search ${iconSizes[size]}`}></i>
          <span>Looking for Space</span>
        </Link>
      )}
    </div>
  );
};

export default SpaceRentalBadge;