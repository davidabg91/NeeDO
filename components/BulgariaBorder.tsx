
import React from 'react';

interface BulgariaBorderProps {
  latLngToPixel?: (latLng: [number, number]) => [number, number];
}

export const BulgariaBorder: React.FC<BulgariaBorderProps> = ({ latLngToPixel }) => {
  // Implicitly passed by pigeon-maps
  if (!latLngToPixel) return null;

  // Approximate border coordinates for Bulgaria
  const borderPoints: [number, number][] = [
    [44.218, 22.668], [43.695, 24.787], [44.021, 26.606], [43.950, 27.500],
    [43.750, 28.500], [42.800, 27.900], [42.000, 28.000], [41.976, 26.500],
    [41.240, 25.260], [41.339, 23.030], [42.270, 22.360], [44.218, 22.668]
  ];

  const pixelPoints = borderPoints.map(p => latLngToPixel(p));
  const pathData = "M " + pixelPoints.map(p => `${p[0]} ${p[1]}`).join(" L ");

  return (
    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 10 }}>
       <path d={pathData} fill="rgba(59, 130, 246, 0.05)" stroke="rgba(59, 130, 246, 0.3)" strokeWidth="2" />
    </svg>
  );
};
