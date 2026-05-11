
import React, { useState, useEffect, useRef } from 'react';
import { Map, Overlay } from 'pigeon-maps';
import { X, Search, MapPin, Check, Navigation, Loader2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (address: string, lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
  initialAddress?: string;
}

interface AddressResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialLat,
  initialLng,
  initialAddress
}) => {
  const { t } = useLanguage();
  
  // Map State
  const [center, setCenter] = useState<[number, number]>([42.6977, 23.3219]); // Sofia default
  const [zoom, setZoom] = useState(13);
  const [markerPos, setMarkerPos] = useState<[number, number] | null>(null);
  
  // Data State
  const [address, setAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AddressResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);

  // Init
  useEffect(() => {
    if (isOpen) {
      if (initialLat && initialLng) {
        setCenter([initialLat, initialLng]);
        setMarkerPos([initialLat, initialLng]);
        setZoom(15);
      } else {
        // Try to get current location if no initial data
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setCenter([pos.coords.latitude, pos.coords.longitude]);
                // Don't set marker yet, let user choose
            },
            () => {}, // Error or permission denied
            { enableHighAccuracy: true }
        );
      }
      if (initialAddress) {
          setAddress(initialAddress);
          setSearchQuery(initialAddress);
      }
    }
  }, [isOpen, initialLat, initialLng, initialAddress]);

  // Search Logic
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length > 2 && !markerPos) {
        setIsSearching(true);
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=bg&limit=5`);
          const data = await response.json();
          setSearchResults(data);
        } catch (error) {
          console.error("Search error", error instanceof Error ? error.message : String(error));
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Reverse Geocoding (Coords -> Address)
  const fetchAddress = async (lat: number, lng: number) => {
      setIsLoadingAddress(true);
      try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
          const data = await response.json();
          if (data && data.display_name) {
              const addr = data.address || {};
              const road = addr.road || addr.pedestrian || addr.footway || addr.cycleway || addr.path || addr.street;
              const num = addr.house_number;
              const quarter = addr.suburb || addr.neighbourhood || addr.city_district || addr.quarter || addr.hamlet;
              const city = addr.city || addr.town || addr.village;

              let parts = [];
              if (road) parts.push(num ? `${road} ${num}` : road);
              if (quarter) parts.push(quarter);
              if (city) parts.push(city);

              const formattedAddr = parts.length > 0 
                  ? parts.join(', ') 
                  : data.display_name.split(',').slice(0, 3).join(', ');

              setAddress(formattedAddr);
              setSearchQuery(formattedAddr); 
          }
      } catch (e) {
          setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      } finally {
          setIsLoadingAddress(false);
      }
  };

  const handleMapClick = ({ latLng }: { latLng: [number, number] }) => {
      setMarkerPos(latLng);
      setCenter(latLng);
      setSearchResults([]); // Clear search dropdown
      fetchAddress(latLng[0], latLng[1]);
  };

  const handleSelectResult = (result: AddressResult) => {
      const lat = parseFloat(result.lat);
      const lon = parseFloat(result.lon);
      setCenter([lat, lon]);
      setMarkerPos([lat, lon]);
      setZoom(16);
      setAddress(result.display_name);
      setSearchQuery(result.display_name);
      setSearchResults([]);
  };

  const handleConfirm = () => {
      if (markerPos) {
          onConfirm(address || "Избрана локация", markerPos[0], markerPos[1]);
          onClose();
      }
  };

  const handleLocateMe = () => {
      navigator.geolocation.getCurrentPosition((pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCenter([lat, lng]);
          setMarkerPos([lat, lng]);
          setZoom(16);
          fetchAddress(lat, lng);
      });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-0 md:p-6 animate-in fade-in duration-200">
        <div className="w-full h-full md:h-[600px] md:max-w-2xl bg-white md:rounded-[32px] shadow-2xl flex flex-col overflow-hidden relative">
            
            {/* Header */}
            <div className="absolute top-0 left-0 w-full p-4 z-20 pointer-events-none">
                <div className="flex gap-2 pointer-events-auto">
                    <div className="flex-1 relative shadow-lg">
                        <input 
                            type="text" 
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                // If user types, clear current marker lock to allow search
                                if (markerPos && e.target.value !== address) setMarkerPos(null);
                            }}
                            placeholder="Търсене на адрес..."
                            className="w-full pl-10 pr-4 py-3.5 bg-white rounded-2xl text-sm font-bold text-slate-800 outline-none border border-slate-200 focus:border-blue-500 transition-all shadow-sm"
                        />
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        {isSearching && (
                            <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                                <Loader2 size={16} className="animate-spin text-blue-500" />
                            </div>
                        )}

                        {/* Search Results Dropdown */}
                        {searchResults.length > 0 && (
                            <div className="absolute top-[calc(100%+6px)] left-0 w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden max-h-[200px] overflow-y-auto">
                                {searchResults.map((res) => (
                                    <button 
                                        key={res.place_id}
                                        onClick={() => handleSelectResult(res)}
                                        className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-blue-50 border-b border-slate-50 last:border-0 transition-colors flex items-center gap-2"
                                    >
                                        <MapPin size={14} className="text-slate-400 shrink-0" />
                                        <span className="line-clamp-1">{res.display_name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-500 shadow-lg border border-slate-200 hover:bg-slate-50 transition-colors shrink-0"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Map */}
            <div className="flex-1 bg-slate-100 relative">
                <Map 
                    center={center} 
                    zoom={zoom} 
                    onBoundsChanged={({ center, zoom }) => {
                        setCenter(center);
                        setZoom(zoom);
                    }}
                    onClick={handleMapClick}
                >
                    {markerPos && (
                        <Overlay anchor={markerPos} offset={[25, 50]}>
                            <div className="relative">
                                <MapPin size={50} className="text-blue-600 drop-shadow-xl fill-white" style={{ filter: 'drop-shadow(0px 10px 6px rgba(0,0,0,0.3))' }} />
                                <div className="absolute top-[12px] left-[12px] w-6 h-6 bg-blue-600 rounded-full animate-ping opacity-20"></div>
                            </div>
                        </Overlay>
                    )}
                </Map>

                {/* Locate Me Button */}
                <button 
                    onClick={handleLocateMe}
                    className="absolute bottom-6 right-4 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-blue-600 border border-slate-100 z-10 active:scale-95 transition-transform"
                >
                    <Navigation size={20} />
                </button>
            </div>

            {/* Footer */}
            <div className="bg-white p-5 border-t border-slate-100 shrink-0 z-30">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 shrink-0">
                        {isLoadingAddress ? <Loader2 size={20} className="animate-spin" /> : <MapPin size={20} />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Избрана Локация</p>
                        <p className="text-sm font-bold text-slate-800 truncate">
                            {markerPos ? (address || "Координати избрани") : "Моля посочете върху картата"}
                        </p>
                    </div>
                    <button 
                        onClick={handleConfirm}
                        disabled={!markerPos}
                        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                        <Check size={18} />
                        Потвърди
                    </button>
                </div>
            </div>

        </div>
    </div>
  );
};
