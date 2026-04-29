
import React from 'react';
import { calculateDistance } from '../utils/geo';
import { MapPin } from 'lucide-react';

interface RouteLineProps {
  mapState?: any;
  latLngToPixel?: (latLng: [number, number]) => [number, number];
  userLocation: [number, number];
  taskLocation: [number, number];
}

export const RouteLine: React.FC<RouteLineProps> = ({ latLngToPixel, userLocation, taskLocation }) => {
  // Pigeon Maps injects latLngToPixel. If it's missing (e.g. not rendered in Map), return null.
  if (!latLngToPixel) return null;

  const [uX, uY] = latLngToPixel(userLocation);
  const [tX, tY] = latLngToPixel(taskLocation);

  // Safety Check: If positions are too close or NaN, don't render the line
  if (isNaN(uX) || isNaN(uY) || isNaN(tX) || isNaN(tY)) return null;

  const deltaX = tX - uX;
  const deltaY = tY - uY;
  const distPixels = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

  if (distPixels < 5) return null; // Too close to draw a meaningful arc

  // Calculate perpendicular vector for the curve control point
  const curvature = 0.2;
  const arcHeight = distPixels * curvature;

  // Calculate normal vector (-dy, dx)
  const normX = -deltaY;
  const normY = deltaX;

  // Normalize and scale with safety check for zero distance (already checked distPixels < 5, but let's be safe)
  const len = Math.max(distPixels, 0.001);
  const offsetX = (normX / len) * arcHeight;
  const offsetY = (normY / len) * arcHeight;

  // Control Point for Quadratic Bezier
  const controlX = (uX + tX) / 2 + offsetX;
  const controlY = (uY + tY) / 2 + offsetY;

  // Final check for NaN before setting path string
  if (isNaN(controlX) || isNaN(controlY)) return null;

  // SVG Path Data
  const pathData = `M ${uX} ${uY} Q ${controlX} ${controlY} ${tX} ${tY}`;

  // Calculate point on curve at t=0.5 for the label
  const t = 0.5;
  const labelX = (1 - t) * (1 - t) * uX + 2 * (1 - t) * t * controlX + t * t * tX;
  const labelY = (1 - t) * (1 - t) * uY + 2 * (1 - t) * t * controlY + t * t * tY;

  const distance = calculateDistance(userLocation[0], userLocation[1], taskLocation[0], taskLocation[1]);

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-20 overflow-visible">
      <svg className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="neonGradient" x1="0%" y1="0%" x2="100%" y2="0%" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.6" />
          </linearGradient>

          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto"
          >
            <path d="M1,1 L7,4 L1,7 L2,4 Z" fill="#2563eb" />
          </marker>

          <marker
            id="startDot"
            markerWidth="6"
            markerHeight="6"
            refX="3"
            refY="3"
            orient="auto"
          >
            <circle cx="3" cy="3" r="2" fill="#60a5fa" />
          </marker>
        </defs>

        {/* Subtle Shadow Path */}
        <path
          d={pathData}
          stroke="black"
          strokeWidth="3"
          fill="none"
          opacity="0.1"
          transform="translate(0, 2)"
        />

        {/* The Fine Neon Arc */}
        <path
          d={pathData}
          stroke="url(#neonGradient)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeDasharray="8, 6"
          className="route-line-animation"
          markerEnd="url(#arrowhead)"
          markerStart="url(#startDot)"
          filter="url(#glow)"
        />
      </svg>

      {/* Minimal Distance Badge */}
      <div
        className="absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-auto"
        style={{ left: labelX, top: labelY }}
      >
        <div className="bg-slate-900/80 backdrop-blur-sm text-white px-2 py-0.5 rounded-full shadow-sm border border-blue-500/20 flex items-center gap-1 animate-in zoom-in duration-300">
          <MapPin size={8} className="text-blue-400 fill-blue-400" />
          <span className="text-[10px] font-bold tracking-wide text-blue-50">{distance} км</span>
        </div>
      </div>

      <style>{`
        .route-line-animation {
          animation: dashDraw 2s linear infinite;
        }
        @keyframes dashDraw {
          from {
            stroke-dashoffset: 14;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  );
};
