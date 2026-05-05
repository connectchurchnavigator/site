import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone } from 'lucide-react';
import { Badge } from './ui/badge';
import { getImageUrl, getFallbackImage, isOpenNow } from '../lib/utils';

export const ChurchCard = ({ church, dark }) => {
  const [isHovered, setIsHovered] = useState(false);
  const openStatus = isOpenNow(church.service_timings || church.services);

  return (
    <Link
      to={`/church/${church.slug || church.id}`}
      className="block"
      data-testid={`church-card-${church.id}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`rounded-2xl border transition-all duration-300 overflow-hidden group hover:-translate-y-1 ${
        dark 
          ? 'bg-white/7 border-white/10 text-white shadow-2xl backdrop-blur-md' 
          : 'bg-white border-slate-100 shadow-sm hover:shadow-md'
      }`}>
        <div className="relative h-48 bg-slate-100 overflow-hidden">
          {church.cover_image ? (
            <img
              src={getImageUrl(church.cover_image)}
              alt={church.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <img
              src={getFallbackImage('church')}
              alt={church.name}
              className="w-full h-full object-contain p-12 group-hover:scale-105 transition-transform duration-300 opacity-40"
            />
          )}
          
          {/* Logo Overlay */}
          <div className={`absolute bottom-4 left-4 w-16 h-16 bg-white rounded-xl shadow-lg overflow-hidden border-2 border-white flex items-center justify-center ${!church.logo ? 'p-3' : ''}`}>
            <img
              src={church.logo ? getImageUrl(church.logo) : getFallbackImage('church')}
              alt={`${church.name} logo`}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Open Status */}
          {openStatus !== null && (
            <div className="absolute top-4 right-4">
              <Badge className={openStatus ? 'bg-green-500 text-white' : 'bg-slate-500 text-white'}>
                {openStatus ? 'Open Now' : 'Closed'}
              </Badge>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-1 line-clamp-1" data-testid="church-card-name">
            {church.name}
          </h3>
          


          {/* Location */}
          <div className="flex items-center text-sm text-slate-500 mb-3">
            <MapPin className="h-4 w-4 mr-1" />
            <span className="line-clamp-1">{[church.city, church.state].filter(Boolean).join(', ')}</span>
          </div>

          {/* Denomination Badge */}
          {church.denomination && (
            <div className="mb-3">
              <Badge variant="secondary" className="text-xs">
                {church.denomination}
              </Badge>
            </div>
          )}

          {/* Phone on Hover */}
          {isHovered && church.phone && (
            <div className="flex items-center text-sm text-brand animate-fade-in">
              <Phone className="h-4 w-4 mr-2" />
              <a href={`tel:${church.phone}`} className="hover:underline">
                {church.phone}
              </a>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};