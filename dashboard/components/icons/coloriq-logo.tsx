import React from 'react';

interface LogoIconProps {
  className?: string;
  size?: number;
  color?: string;
}

export const ColorIqLogo: React.FC<LogoIconProps> = ({ 
  className = '', 
  size = 32, 
  color = '#9333EA' 
}) => (
  <div
    className={`inline-flex items-center justify-center rounded-md font-black ${className}`}
    style={{
      width: size,
      height: size,
      background: `linear-gradient(135deg, ${color}, #EC4899)`,
      fontSize: size * 0.48,
      lineHeight: 1,
      color: '#FFFFFF',
      letterSpacing: '-0.02em',
      flexShrink: 0,
    }}
  >
    CG
  </div>
);

export default ColorIqLogo;
