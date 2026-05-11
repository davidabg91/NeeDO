
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Map, Overlay } from 'pigeon-maps';
import { Task, TaskStatus } from '../types';
import { Navigation, Loader2, Plus, Minus, Map as MapIcon, Globe, Users, Briefcase, Zap, MessageSquare } from 'lucide-react';
import { RouteLine } from './RouteLine';
import { useLanguage } from '../contexts/LanguageContext';
import { CATEGORIES_LIST } from '../constants';

// Cast Overlay to any to avoid "key" prop error in strict environments
const OverlayAny = Overlay as any;

interface MapBoardProps {
    tasks: Task[];
    onTaskClick: (task: Task) => void;
    center: [number, number];
    onLocateMe: () => void;
    userLocation: [number, number] | null;
    viewTrigger: number;
    viewedTaskIds: Set<string>;
    onMeClick?: () => void;
    selectedTask?: Task | null;
}

const processOverlappingTasks = (tasks: Task[]) => {
    const sortedTasks = [...tasks].sort((a, b) => a.id.localeCompare(b.id));
    const processedTasks: (Task & { renderLat: number, renderLng: number, isGrouped: boolean })[] = [];
    const clusters: Task[][] = [];
    const THRESHOLD = 0.0005;

    const assigned = new Set<string>();

    sortedTasks.forEach(task => {
        if (assigned.has(task.id)) return;
        const cluster = [task];
        assigned.add(task.id);
        sortedTasks.forEach(neighbor => {
            if (!assigned.has(neighbor.id)) {
                const dLat = Math.abs(task.location.lat - neighbor.location.lat);
                const dLng = Math.abs(task.location.lng - neighbor.location.lng);
                if (dLat < THRESHOLD && dLng < THRESHOLD) {
                    cluster.push(neighbor);
                    assigned.add(neighbor.id);
                }
            }
        });
        clusters.push(cluster);
    });

    clusters.forEach(cluster => {
        if (cluster.length === 1) {
            processedTasks.push({
                ...cluster[0],
                renderLat: cluster[0].location.lat,
                renderLng: cluster[0].location.lng,
                isGrouped: false
            });
        } else {
            const centerLat = cluster[0].location.lat;
            const centerLng = cluster[0].location.lng;
            const count = cluster.length;
            const SPACING_LNG = 0.0010;
            const startLng = centerLng - ((count - 1) * SPACING_LNG) / 2;
            cluster.forEach((task, index) => {
                const offsetLng = startLng + (index * SPACING_LNG);
                processedTasks.push({
                    ...task,
                    renderLat: centerLat,
                    renderLng: offsetLng,
                    isGrouped: true
                });
            });
        }
    });
    return processedTasks;
};

interface ClusterPoint {
    id: string;
    lat: number;
    lng: number;
    count: number;
    taskIds: string[];
}

const generateClusters = (tasks: Task[], zoom: number): ClusterPoint[] => {
    const radius = 20 / Math.pow(2, zoom);
    const clusters: ClusterPoint[] = [];
    const processed = new Set<string>();
    tasks.forEach(task => {
        if (processed.has(task.id)) return;
        const clusterTasks = [task];
        processed.add(task.id);
        tasks.forEach(neighbor => {
            if (!processed.has(neighbor.id)) {
                const dLat = Math.abs(task.location.lat - neighbor.location.lat);
                const dLng = Math.abs(task.location.lng - neighbor.location.lng);
                if (dLat < radius && dLng < radius) {
                    clusterTasks.push(neighbor);
                    processed.add(neighbor.id);
                }
            }
        });
        const avgLat = clusterTasks.reduce((sum, t) => sum + t.location.lat, 0) / clusterTasks.length;
        const avgLng = clusterTasks.reduce((sum, t) => sum + t.location.lng, 0) / clusterTasks.length;
        clusters.push({
            id: `cluster-${task.id}`,
            lat: avgLat,
            lng: avgLng,
            count: clusterTasks.length,
            taskIds: clusterTasks.map(t => t.id)
        });
    });
    return clusters;
};

export const MapBoard: React.FC<MapBoardProps> = ({ tasks, onTaskClick, center, onLocateMe, userLocation, viewTrigger, viewedTaskIds, onMeClick, selectedTask }) => {
    const [isLocating, setIsLocating] = useState(false);

    // State for map view control
    const { t } = useLanguage();
    const [internalCenter, setInternalCenter] = useState(center);
    const [internalZoom, setInternalZoom] = useState(13);
    const [mapTheme, setMapTheme] = useState<'standard' | 'satellite'>('standard');

    // Update internal center when viewTrigger changes (explicit navigation).
    useEffect(() => {
        setInternalCenter(center);
        if (viewTrigger > 0) {
            setInternalZoom(prev => Math.max(prev, 14));
        }
    }, [viewTrigger, center]);

    const fallbackImage = 'https://images.unsplash.com/photo-1581578731117-104f2a8d2305?w=100&auto=format&fit=crop&q=60';
    const ZOOM_THRESHOLD = 11.5;

    const renderableTasks = useMemo(() => {
        if (internalZoom >= ZOOM_THRESHOLD) return processOverlappingTasks(tasks);
        return [];
    }, [tasks, internalZoom]);

    const clusters = useMemo(() => {
        if (internalZoom < ZOOM_THRESHOLD) return generateClusters(tasks, internalZoom);
        return [];
    }, [tasks, internalZoom]);

    // --- Dynamic Scaling Logic ---
    const markerScale = useMemo(() => {
        if (internalZoom < ZOOM_THRESHOLD) return 1;
        // Base zoom is 15. Every 1 zoom level = ~10% size change
        const scale = Math.pow(1.1, internalZoom - 14.5);
        return Math.max(0.65, Math.min(1.4, scale));
    }, [internalZoom]);

    const handleLocateClick = () => {
        setIsLocating(true);
        onLocateMe();
        setTimeout(() => setIsLocating(false), 1500);
    };

    const handleZoomIn = () => {
        setInternalZoom(prev => Math.min(prev + 1, 18));
    };

    const handleZoomOut = () => {
        setInternalZoom(prev => Math.max(prev - 1, 3));
    };

    const handleClusterClick = (cluster: ClusterPoint) => {
        setInternalCenter([cluster.lat, cluster.lng]);
        setInternalZoom(prev => Math.min(prev + 3, 15));
    };

    const toggleMapTheme = () => setMapTheme(prev => prev === 'standard' ? 'satellite' : 'standard');

    const mapProvider = (x: number, y: number, z: number, dpr?: number) => {
        if (mapTheme === 'satellite') return `https://mt1.google.com/vt/lyrs=y&x=${x}&y=${y}&z=${z}`;
        const s = String.fromCharCode(97 + ((x + y + z) % 3));
        return `https://${s}.tile.openstreetmap.org/${z}/${x}/${y}.png`;
    };

    return (
        <div className="w-full h-full absolute top-0 left-0 z-0 bg-slate-100 overflow-hidden" style={{ touchAction: 'none' }}>
            <Map
                center={internalCenter}
                zoom={internalZoom}
                minZoom={3}
                maxZoom={18}
                touchEvents={true}
                metaWheelZoom={false}
                twoFingerDrag={false}
                zoomSnap={false}
                provider={mapProvider}
                onBoundsChanged={({ center, zoom }) => {
                    setInternalCenter(center);
                    setInternalZoom(zoom);
                }}
            >
                {userLocation && selectedTask && internalZoom >= ZOOM_THRESHOLD && (
                    <RouteLine userLocation={userLocation} taskLocation={[selectedTask.location.lat, selectedTask.location.lng]} />
                )}

                {userLocation && (
                    <OverlayAny anchor={userLocation} offset={[24, 42]}>
                        <div className="relative group cursor-pointer hover:scale-110 transition-transform" onClick={(e) => { e.stopPropagation(); onMeClick?.(); }}>
                            <div className="absolute -inset-4 bg-blue-500/20 rounded-full animate-ping pointer-events-none"></div>
                            <div className="relative w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full shadow-lg border-[3px] border-white flex items-center justify-center z-20">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                            </div>
                        </div>
                    </OverlayAny>
                )}

                {internalZoom < ZOOM_THRESHOLD && clusters.map(cluster => (
                    <OverlayAny
                        key={cluster.id}
                        anchor={[cluster.lat, cluster.lng]}
                        offset={[20, 20]}
                    >
                        <button
                            onClick={() => handleClusterClick(cluster)}
                            className="relative group hover:scale-110 cursor-pointer transition-transform duration-300 ease-out"
                        >
                            <div className="absolute -inset-2 bg-blue-500/30 rounded-full animate-pulse"></div>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg border-2 border-white flex items-center justify-center z-10">
                                <span className="text-white font-black text-sm">{cluster.count}</span>
                            </div>
                        </button>
                    </OverlayAny>
                ))}

                {internalZoom >= ZOOM_THRESHOLD && renderableTasks.map(task => {
                    const isSelected = selectedTask?.id === task.id;
                    const hasOffers = (task.offersCount || 0) > 0 || (task.offers && task.offers.length > 0);
                    const isViewed = viewedTaskIds.has(task.id);
                    const showNewBadge = !hasOffers && !isViewed;

                    return (
                        <OverlayAny
                            key={task.id}
                            anchor={[task.renderLat, task.renderLng]}
                            offset={[40, 118]}
                        >
                            <button
                                onClick={() => onTaskClick(task)}
                                className={`group relative flex flex-col items-center justify-end cursor-pointer ${isSelected ? 'z-[100]' : 'z-50 hover:z-[90]'}`}
                                style={{
                                    transform: `scale(${isSelected ? markerScale * 1.15 : markerScale})`,
                                    transformOrigin: 'bottom center',
                                    transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.3s ease',
                                    filter: isSelected ? 'drop-shadow(0 0 15px rgba(59, 130, 246, 0.5))' : 'none',
                                    WebkitBackfaceVisibility: 'hidden',
                                    backfaceVisibility: 'hidden'
                                }}
                            >
                                {/* iOS MIRROR CARD BODY - STABILIZED FOR ALL BROWSERS */}
                                <div
                                    className={`
                                        relative w-[80px] h-[100px] rounded-[24px] 
                                        bg-white border border-white/40 
                                        p-[0.5px] shadow-[0_15px_35px_-5px_rgba(0,0,0,0.3)] 
                                        group-hover:-translate-y-2 group-hover:shadow-[0_25px_50px_-10px_rgba(0,0,0,0.4)] 
                                        transition-all duration-500 ring-1 ring-white/10
                                    `}
                                    style={{
                                        backfaceVisibility: 'hidden',
                                        isolation: 'isolate',
                                        WebkitFontSmoothing: 'antialiased'
                                    }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/30 to-transparent pointer-events-none z-20"></div>
                                    <div className="w-full h-full rounded-[23.5px] overflow-hidden relative isolate bg-slate-100">
                                        <img
                                            src={task.imageUrl || fallbackImage}
                                            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                                            alt=""
                                        />
                                        <div className="absolute bottom-1.5 left-1.5 right-1.5 z-30">
                                            <div className="bg-slate-900 border border-white/20 shadow-2xl px-1.5 py-1 rounded-xl text-center">
                                                <p className="text-[8.5px] font-bold text-white leading-tight line-clamp-2 uppercase tracking-tight">
                                                    {task.title}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    {(hasOffers || showNewBadge) && (
                                        <div className="absolute -top-3 -right-3 z-40 animate-in zoom-in duration-300">
                                            <div className={`
                                                h-8 min-w-[32px] px-2 rounded-2xl flex items-center justify-center gap-1
                                                border border-white/40 shadow-[0_8px_16px_rgba(0,0,0,0.4)] backdrop-blur-md
                                                ring-2 ring-white
                                                ${hasOffers 
                                                    ? 'bg-gradient-to-br from-amber-500 via-orange-600 to-amber-700' 
                                                    : 'bg-gradient-to-br from-blue-600 via-indigo-700 to-blue-800 animate-pulse'}
                                            `}>
                                                {hasOffers ? (
                                                    <span className="text-[14px] font-black text-white leading-none drop-shadow-sm">
                                                        {task.offersCount || task.offers.length}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-black text-white leading-none uppercase tracking-tighter drop-shadow-sm">
                                                        {t('badge_new')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="relative flex flex-col items-center -mt-[1px]">
                                    <div className="w-6 h-5 text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.2)]">
                                        <svg viewBox="0 0 24 20" fill="currentColor" className="w-full h-full">
                                            <path d="M0 0 C 6 0, 8 18, 12 18 C 16 18, 18 0, 24 0 L 24 2 L 0 2 Z" />
                                        </svg>
                                    </div>
                                    <div className="absolute bottom-0 w-3 h-3 bg-white rounded-full border-[2.5px] border-blue-500 shadow-sm animate-in zoom-in duration-500 translate-y-1/2"></div>
                                </div>
                                <div className="w-10 h-2 bg-black/30 blur-md rounded-full absolute -bottom-2 opacity-50"></div>
                            </button>
                        </OverlayAny>
                    );
                })}
            </Map>

            {/* CONTROLS */}
            <div className="absolute top-32 right-4 z-30 flex flex-col gap-2">
                <div className="bg-[#0f0f0f]/95 backdrop-blur-2xl border border-white/10 rounded-[22px] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] flex flex-col items-center py-2 w-[44px] ring-1 ring-white/5">
                    <button onClick={toggleMapTheme} className="w-9 h-9 flex items-center justify-center text-white/70 hover:text-white transition-all active:scale-90" title="Map Theme">{mapTheme === 'standard' ? <Globe size={18} className="text-blue-400" /> : <MapIcon size={18} />}</button>
                    <div className="w-5 h-[1px] bg-white/10 my-1.5"></div>
                    <button onClick={handleZoomIn} className="w-9 h-9 flex items-center justify-center text-white/70 hover:text-white transition-all active:scale-90" title="Zoom In"><Plus size={18} /></button>
                    <button onClick={handleZoomOut} className="w-9 h-9 flex items-center justify-center text-white/70 hover:text-white transition-all active:scale-90" title="Zoom Out"><Minus size={18} /></button>
                    <div className="w-5 h-[1px] bg-white/10 my-1.5"></div>
                    <button onClick={handleLocateClick} disabled={isLocating} className={`w-9 h-9 flex items-center justify-center transition-all active:scale-90 ${isLocating ? 'text-blue-500' : 'text-white/70 hover:text-white'}`} title="Locate Me">{isLocating ? <Loader2 size={18} className="animate-spin" /> : <Navigation size={18} />}</button>
                </div>
            </div>
        </div>
    );
};
