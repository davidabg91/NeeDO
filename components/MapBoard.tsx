
import React, { useState, useEffect, useMemo } from 'react';
import { Map, Overlay } from 'pigeon-maps';
import { Task, TaskStatus } from '../types';
import { Crosshair, Loader2, Plus, Minus } from 'lucide-react';

interface MapBoardProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  center: [number, number];
  onLocateMe: () => void;
  userLocation: [number, number] | null;
  viewTrigger: number;
}

// Helper function to offset markers that are at the exact same location
const processOverlappingTasks = (tasks: Task[]) => {
  const groups: Record<string, Task[]> = {};
  
  // Group tasks by coordinate key
  tasks.forEach(task => {
    const key = `${task.location.lat.toFixed(5)},${task.location.lng.toFixed(5)}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(task);
  });

  const processedTasks: (Task & { renderLat: number, renderLng: number })[] = [];

  Object.values(groups).forEach(group => {
    if (group.length === 1) {
      processedTasks.push({
        ...group[0],
        renderLat: group[0].location.lat,
        renderLng: group[0].location.lng
      });
    } else {
      // Spread duplicate coordinates in a circle
      // Radius in degrees (0.0005 is roughly 50 meters, ensuring visibility)
      const radius = 0.0005;
      const step = (2 * Math.PI) / group.length;
      
      group.forEach((task, i) => {
        const angle = i * step;
        // Adjust longitude for aspect ratio (multiply by 1.5 to offset Mercator projection distortion at mid-latitudes)
        const latOffset = radius * Math.cos(angle);
        const lngOffset = radius * Math.sin(angle) * 1.5; 
        
        processedTasks.push({
          ...task,
          renderLat: task.location.lat + latOffset,
          renderLng: task.location.lng + lngOffset
        });
      });
    }
  });

  return processedTasks;
};

export const MapBoard: React.FC<MapBoardProps> = ({ tasks, onTaskClick, center, onLocateMe, userLocation, viewTrigger }) => {
  const [isLocating, setIsLocating] = useState(false);
  
  // Internal state to allow free movement (panning/zooming) without snapping back
  const [internalCenter, setInternalCenter] = useState(center);
  const [internalZoom, setInternalZoom] = useState(13);

  // Reliable fallback image that is fast
  const fallbackImage = 'https://images.unsplash.com/photo-1581578731117-104f2a8d2305?w=100&auto=format&fit=crop&q=60';

  // Memoize the processed tasks to avoid recalculating on every render
  const renderableTasks = useMemo(() => processOverlappingTasks(tasks), [tasks]);

  // Update internal center ONLY when explicitly triggered by the parent (e.g. "Locate Me" clicked)
  // This prevents the map from "snapping back" if the parent component re-renders for other reasons.
  useEffect(() => {
    setInternalCenter(center);
    setInternalZoom(prev => prev < 15 ? 15 : prev); 
  }, [viewTrigger]);

  const handleLocateClick = () => {
    setIsLocating(true);
    // Execute the parent's locate function
    onLocateMe();
    
    // Reset loading state after a short delay to allow the map to move
    setTimeout(() => setIsLocating(false), 1500);
  };

  const handleZoomIn = () => {
    setInternalZoom(prev => Math.min(prev + 1, 18));
  };

  const handleZoomOut = () => {
    setInternalZoom(prev => Math.max(prev - 1, 3));
  };

  const getStatusStyles = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.OPEN: 
        return { 
          borderColor: 'border-blue-500', 
          shadow: 'shadow-blue-900/40', 
          text: 'text-blue-600',
          bg: 'bg-blue-500',
          ring: 'ring-blue-500',
          pointerText: 'text-blue-500'
        };
      case TaskStatus.AWAITING_PAYMENT: 
        return { 
          borderColor: 'border-amber-400', 
          shadow: 'shadow-amber-900/40', 
          text: 'text-amber-600',
          bg: 'bg-amber-400',
          ring: 'ring-amber-400',
          pointerText: 'text-amber-400'
        };
      case TaskStatus.IN_PROGRESS: 
        return { 
          borderColor: 'border-purple-500', 
          shadow: 'shadow-purple-900/40', 
          text: 'text-purple-600',
          bg: 'bg-purple-500',
          ring: 'ring-purple-500',
          pointerText: 'text-purple-500'
        };
      case TaskStatus.CLOSED: 
        return { 
          borderColor: 'border-emerald-500', 
          shadow: 'shadow-emerald-900/40', 
          text: 'text-emerald-600',
          bg: 'bg-emerald-500',
          ring: 'ring-emerald-500',
          pointerText: 'text-emerald-500'
        };
      default: 
        return { 
          borderColor: 'border-slate-500', 
          shadow: 'shadow-slate-900/40', 
          text: 'text-slate-600',
          bg: 'bg-slate-500',
          ring: 'ring-slate-500',
          pointerText: 'text-slate-500'
        };
    }
  };

  return (
    <div 
        className="w-full h-full absolute top-0 left-0 z-0 bg-slate-100"
        style={{ touchAction: 'none' }} // CRITICAL for mobile map interaction
    >
      <Map 
        height="100%" 
        center={internalCenter} 
        zoom={internalZoom}
        minZoom={3} 
        maxZoom={18}
        touchEvents={true}
        metaWheelZoom={false} // Disable CTRL+Scroll requirement
        twoFingerDrag={false} // Allow single finger drag for mobile ease
        zoomSnap={false} // Enable smooth pinch-to-zoom on mobile
        onBoundsChanged={({ center, zoom }) => {
            setInternalCenter(center);
            setInternalZoom(zoom);
        }}
      >
        
        {/* User Location Marker */}
        {userLocation && (
          <Overlay anchor={userLocation} offset={[12, 12]}>
            <div className="relative flex items-center justify-center w-6 h-6 pointer-events-none">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600 border-2 border-white shadow-sm"></span>
            </div>
          </Overlay>
        )}

        {renderableTasks.map(task => {
          const styles = getStatusStyles(task.status);
          // Anchor uses renderLat/renderLng to spread overlapping markers
          return (
            <Overlay key={task.id} anchor={[task.renderLat, task.renderLng]} offset={[28, 68]}>
               <button
                  onClick={() => onTaskClick(task)}
                  className="group relative flex flex-col items-center justify-end w-[56px] h-[72px] transform transition-all duration-500 hover:-translate-y-2 z-10 hover:z-50 active:scale-95"
                >
                  {/* Main Pin Head - Full Bleed Image */}
                  <div className={`relative w-[56px] h-[56px] rounded-full shadow-2xl ${styles.shadow} transition-all duration-300 group-hover:scale-110 z-20 bg-white`}>
                    
                    {/* Outer Status Border (Simulated with padding/bg or border) */}
                    <div className={`absolute -inset-[2px] rounded-full border-[3px] ${styles.borderColor} z-20 pointer-events-none`}></div>
                    
                    {/* Inner White Border */}
                    <div className="absolute inset-0 rounded-full border-[2px] border-white z-30 pointer-events-none"></div>

                    {/* Image Container */}
                    <div className="w-full h-full rounded-full overflow-hidden relative z-10">
                       <img 
                        src={task.imageUrl || fallbackImage} 
                        alt={task.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (target.src !== fallbackImage) {
                             target.src = fallbackImage;
                          }
                        }}
                      />
                      {/* Subtle Gloss */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-black/10 to-white/20 pointer-events-none"></div>
                    </div>

                    {/* Notification Dot / Status Indicator */}
                    <div className={`absolute -top-0.5 -right-0.5 w-4 h-4 ${styles.bg} border-2 border-white rounded-full flex items-center justify-center shadow-sm z-40`}>
                        {task.status === TaskStatus.OPEN && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-50"></span>}
                    </div>
                  </div>

                  {/* The Pointer/Arrow (Replaces the stick) */}
                  <div className={`relative -mt-[2px] z-10 drop-shadow-lg ${styles.pointerText}`}>
                      <svg width="20" height="12" viewBox="0 0 20 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M10 12L0.5 0L19.5 0L10 12Z" fill="currentColor" />
                      </svg>
                  </div>

                  {/* Ground Shadow */}
                  <div className="absolute bottom-0 w-8 h-2 bg-black/20 rounded-[100%] blur-[2px] group-hover:scale-50 group-hover:opacity-40 transition-all duration-300 z-0"></div>

                  {/* Modern Tooltip */}
                  <div className="hidden md:block absolute bottom-[100%] left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:-translate-y-1 pointer-events-none min-w-[140px] mb-2">
                    <div className="bg-slate-900/90 backdrop-blur-xl text-white p-3 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-white/10 text-center relative">
                      <p className="font-bold line-clamp-1 text-xs mb-0.5">{task.title}</p>
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${task.status === TaskStatus.OPEN ? 'text-blue-400' : 'text-gray-300'}`}>{task.category || 'Услуга'}</p>
                      
                      {/* Tooltip Arrow */}
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-slate-900/90 border-r border-b border-white/10"></div>
                    </div>
                  </div>
                </button>
            </Overlay>
          );
        })}
      </Map>

      {/* Controls Cluster */}
      <div className="absolute top-28 right-4 z-30 flex flex-col gap-3">
        {/* Locate Me Button */}
        <button 
          onClick={handleLocateClick}
          disabled={isLocating}
          className="flex items-center justify-center w-12 h-12 bg-white/90 backdrop-blur-xl text-slate-700 rounded-2xl shadow-xl border border-white/50 transition-all active:scale-90 active:bg-blue-50 group ring-1 ring-black/5"
          title="Моята локация"
        >
          {isLocating ? (
            <Loader2 size={22} className="animate-spin text-blue-600" />
          ) : (
            <Crosshair size={22} className="group-active:text-blue-600 transition-colors" />
          )}
        </button>

        {/* Zoom Controls */}
        <div className="flex flex-col bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 overflow-hidden ring-1 ring-black/5">
           <button onClick={handleZoomIn} className="w-12 h-12 flex items-center justify-center text-slate-700 hover:bg-blue-50 active:bg-blue-100 transition-colors border-b border-slate-100">
              <Plus size={24} />
           </button>
           <button onClick={handleZoomOut} className="w-12 h-12 flex items-center justify-center text-slate-700 hover:bg-blue-50 active:bg-blue-100 transition-colors">
              <Minus size={24} />
           </button>
        </div>
      </div>
    </div>
  );
};
