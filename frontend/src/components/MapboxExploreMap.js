import React, { useEffect, useState, useMemo } from 'react';
import Map, { Marker, Popup, NavigationControl, GeolocateControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, Church, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getImageUrl } from '../lib/utils';
import { toast } from 'sonner';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

const MapboxExploreMap = ({ results, type = 'church', hoveredId, onMarkerHover, onBoundsChange, center }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!MAPBOX_TOKEN) {
      toast.error("Map Token Missing", {
        description: "Set REACT_APP_MAPBOX_TOKEN in your Railway dashboard.",
      });
    }
  }, []);
  const [mapMoved, setMapMoved] = useState(false);
  const prevCenterRef = React.useRef(center);
  const [viewport, setViewport] = useState({
    latitude: 20,
    longitude: 0,
    zoom: 2
  });
  const [popupInfo, setPopupInfo] = useState(null);

  useEffect(() => {
    // Reset manual lock if the center prop changes explicitly (e.g. from a city search)
    if (center?.lat !== prevCenterRef.current?.lat || center?.lng !== prevCenterRef.current?.lng) {
      setMapMoved(false);
      prevCenterRef.current = center;
    }
  }, [center]);

  useEffect(() => {
    if (center?.lat && center?.lng && !mapMoved) {
      setViewport(prev => ({
        ...prev,
        latitude: center.lat,
        longitude: center.lng,
        zoom: 12
      }));
    }
  }, [center]);

  useEffect(() => {
      const safeParse = (val) => {
         const p = parseFloat(val);
         return isNaN(p) ? null : p;
      };

      const validPoints = results?.filter(r => {
                const lat = safeParse(r.latitude);
                const lng = safeParse(r.longitude);
                return lat !== null && lng !== null && 
                       (Math.abs(lat) > 0.0001 || Math.abs(lng) > 0.0001) &&
                       !(Math.abs(lat - 17.39) < 0.01 && Math.abs(lng - 17.39) < 0.01); 
      }) || [];
      
      // ONLY auto-center if the results exist and the user hasn't manually moved yet.
      if (validPoints.length > 0 && !mapMoved) {
          // Priority 1: If we have a detected center (from IP), stay there initially
          if (center?.lat && center?.lng) {
              setViewport(prev => ({
                ...prev,
                latitude: center.lat,
                longitude: center.lng,
                zoom: 12
              }));
              return;
          }

          // Priority 2: Handling multiple results
          if (validPoints.length === 1) {
              const lat = safeParse(validPoints[0].latitude);
              const lng = safeParse(validPoints[0].longitude);
              if (lat !== null && lng !== null) {
                  setViewport(prev => ({ ...prev, latitude: lat, longitude: lng, zoom: 14 }));
              }
          } else {
              const lats = validPoints.map(p => safeParse(p.latitude)).filter(l => l !== null);
              const lngs = validPoints.map(p => safeParse(p.longitude)).filter(l => l !== null);
              
              const minLat = Math.min(...lats);
              const maxLat = Math.max(...lats);
              const minLng = Math.min(...lngs);
              const maxLng = Math.max(...lngs);

              if ((maxLat - minLat) > 10 || (maxLng - minLng) > 15) {
                const firstLat = safeParse(validPoints[0].latitude);
                const firstLng = safeParse(validPoints[0].longitude);
                setViewport(prev => ({ ...prev, latitude: firstLat, longitude: firstLng, zoom: 12 }));
              } else {
                const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
                const avgLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
                setViewport(prev => ({ ...prev, latitude: avgLat, longitude: avgLng, zoom: 12.5 }));
              }
          }
      }
   }, [results, center, mapMoved]);

  const markers = useMemo(() => results?.filter(r => {
    const lat = parseFloat(r.latitude);
    const lng = parseFloat(r.longitude);
    return r.latitude && r.longitude && 
           (Math.abs(lat) > 0.0001 || Math.abs(lng) > 0.0001) &&
           !(Math.abs(lat - 17.39) < 0.01 && Math.abs(lng - 17.39) < 0.01);
  }).map((item) => {
    const isHovered = hoveredId === item.id;
    return (
      <Marker
        key={item.id}
        latitude={parseFloat(item.latitude) || 0}
        longitude={parseFloat(item.longitude) || 0}
        anchor="bottom"
        onClick={e => {
          e.originalEvent.stopPropagation();
          setPopupInfo(item);
        }}
      >
        <div 
          className={`cursor-pointer transition-all duration-300 ${isHovered ? 'scale-125 z-50' : 'scale-100 hover:scale-110'}`}
          onMouseEnter={() => onMarkerHover?.(item.id)}
          onMouseLeave={() => onMarkerHover?.(null)}
        >
          <div className="relative group/marker">
            {isHovered && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white px-2 py-1 rounded shadow-lg text-[10px] font-bold text-slate-800 whitespace-nowrap border border-slate-100 animate-in fade-in slide-in-from-bottom-1">
                    {item.name}
                </div>
            )}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 transition-colors ${
                isHovered 
                  ? 'bg-brand border-white ring-4 ring-brand/20' 
                  : (type === 'church' ? 'bg-[#6c1cff] border-white' : 'bg-teal-500 border-white')
            }`}>
              {type === 'church' ? <Church size={14} className="text-white" /> : <User size={14} className="text-white" />}
            </div>
            {/* Pulsing effect for hovered */}
            {isHovered && <div className="absolute inset-0 rounded-full bg-brand animate-ping opacity-20 -z-10"></div>}
          </div>
        </div>
      </Marker>
    );
  }), [results, type, hoveredId, onMarkerHover]);

  return (
    <div className="w-full h-full relative">
      <Map
        {...viewport}
        onMove={evt => {
            setViewport(evt.viewState);
            setMapMoved(true);
        }}
        onMoveEnd={evt => {
            const map = evt.target;
            const b = map.getBounds();
            onBoundsChange?.({
                minLat: b.getSouth(),
                maxLat: b.getNorth(),
                minLng: b.getWest(),
                maxLng: b.getEast()
            });
        }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
      >
        {markers}

        {popupInfo && (
          <Popup
            anchor="top"
            longitude={parseFloat(popupInfo.longitude)}
            latitude={parseFloat(popupInfo.latitude)}
            onClose={() => setPopupInfo(null)}
            closeButton={false}
            className="z-50"
          >
            <div 
                className="p-1 max-w-[200px] cursor-pointer"
                onClick={() => navigate(`/${type}/${popupInfo.slug}`)}
            >
              <div className="h-24 w-full rounded-lg overflow-hidden mb-2 bg-slate-100">
                <img 
                    src={getImageUrl(popupInfo.cover_image || popupInfo.profile_picture || popupInfo.logo)} 
                    alt="" 
                    className="w-full h-full object-cover"
                />
              </div>
              <p className="text-[12px] font-bold text-slate-800 line-clamp-1">{popupInfo.name}</p>
              <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                <MapPin size={10} /> {popupInfo.city}
              </p>
            </div>
          </Popup>
        )}
        
        <GeolocateControl 
          position="top-right" 
          positionOptions={{ enableHighAccuracy: true }}
          trackUserLocation={true}
          showUserHeading={true}
        />
        <NavigationControl position="top-right" />
      </Map>

    </div>
  );
};

export default MapboxExploreMap;
