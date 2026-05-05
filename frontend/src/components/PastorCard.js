import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { Badge } from './ui/badge';
import { getImageUrl, getFallbackImage } from '../lib/utils';

export const PastorCard = ({ pastor, dark }) => {
  return (
    <Link
      to={`/pastor/${pastor.slug || pastor.id}`}
      className="block"
      data-testid={`pastor-card-${pastor.id}`}
    >
      <div className={`rounded-2xl border transition-all duration-300 overflow-hidden group hover:-translate-y-1 ${
        dark 
          ? 'bg-white/5 border-white/10 text-white shadow-2xl backdrop-blur-sm' 
          : 'bg-white border-slate-100 shadow-sm hover:shadow-md'
      }`}>
        {/* Banner Image */}
        <div className="relative h-48 bg-slate-100 overflow-hidden">
          {pastor.cover_image ? (
            <img
              src={getImageUrl(pastor.cover_image)}
              alt={pastor.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <img
              src={getFallbackImage('pastor')}
              alt={pastor.name}
              className="w-full h-full object-contain p-12 group-hover:scale-105 transition-transform duration-300 opacity-40"
            />
          )}
          
          {/* Profile Picture Overlay */}
          <div className={`absolute bottom-4 left-4 w-16 h-16 bg-white rounded-full shadow-lg overflow-hidden border-2 border-white flex items-center justify-center ${!pastor.profile_picture ? 'p-3' : ''}`}>
            <img
              src={pastor.profile_picture ? getImageUrl(pastor.profile_picture) : getFallbackImage('pastor')}
              alt={pastor.name}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className={`font-semibold text-lg mb-1 line-clamp-1 ${dark ? 'text-white' : ''}`} data-testid="pastor-card-name">
            {pastor.name}
          </h3>
          
          {pastor.current_designation && (
            <p className={`text-sm mb-3 ${dark ? 'text-slate-400' : 'text-slate-600'}`}>{pastor.current_designation}</p>
          )}

          {/* Location */}
          <div className={`flex items-center text-sm mb-3 ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
            <MapPin className="h-4 w-4 mr-1 text-brand" />
            <span className="line-clamp-1">{pastor.city}</span>
          </div>

          {/* Denomination Badge */}
          {pastor.denomination && (
            <div className="mb-2">
              <Badge variant={dark ? 'outline' : 'secondary'} className={`text-xs ${dark ? 'border-white/20 text-white' : ''}`}>
                {pastor.denomination}
              </Badge>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};