import React from 'react';

/**
 * A premium Google Maps display for a single location.
 * Uses the embed interface which is familiar and reliable.
 */
const GoogleMap = ({ latitude, longitude, address, city, state, churchName }) => {
  // Use coordinates if available, otherwise fall back to address string
  const query = (latitude && longitude) 
    ? `${latitude},${longitude}` 
    : encodeURIComponent(`${address || ''}, ${city || ''}, ${state || ''}`);

  // Base URL for Google Maps Embed (No-key version for standard usage)
  const mapUrl = `https://maps.google.com/maps?q=${query}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

  return (
    <div className="w-full h-full relative group">
      <iframe
        title={`Map showing ${churchName || 'location'}`}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        src={mapUrl}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="grayscale-[0.2] contrast-[1.1] brightness-[1.05]"
      ></iframe>
      
      {/* Premium Overlay (Optional: can be removed if user wants full interactivity immediate) */}
      <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/20 to-transparent pointer-events-none">
        <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg inline-flex items-center gap-2 shadow-xl border border-white/50 animate-in fade-in slide-in-from-bottom-2 duration-500">
           <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
           <span className="text-[10px] font-bold text-slate-800 uppercase tracking-widest leading-none">Verified Location</span>
        </div>
      </div>
    </div>
  );
};

export default GoogleMap;
