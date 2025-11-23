
import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  setRating?: (rating: number) => void;
  size?: number;
  interactive?: boolean;
  totalStars?: number;
}

export const StarRating: React.FC<StarRatingProps> = ({ 
  rating, 
  setRating, 
  size = 16, 
  interactive = false,
  totalStars = 5 
}) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const handleMouseEnter = (index: number) => {
    if (interactive) setHoverValue(index + 1);
  };

  const handleMouseLeave = () => {
    if (interactive) setHoverValue(null);
  };

  const handleClick = (index: number) => {
    if (interactive && setRating) setRating(index + 1);
  };

  return (
    <div className="flex items-center gap-0.5">
      {[...Array(totalStars)].map((_, index) => {
        const isFilled = (hoverValue !== null ? hoverValue : rating) > index;
        return (
          <Star
            key={index}
            size={size}
            className={`transition-colors duration-150 ${
              isFilled 
                ? 'fill-yellow-400 text-yellow-400' 
                : 'fill-gray-200 text-gray-200'
            } ${interactive ? 'cursor-pointer hover:scale-110' : ''}`}
            onMouseEnter={() => handleMouseEnter(index)}
            onMouseLeave={handleMouseLeave}
            onClick={() => handleClick(index)}
          />
        );
      })}
    </div>
  );
};
