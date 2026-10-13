import React from 'react';

interface LogoIconProps {
  className?: string;
  size?: number; // font size in px for the interim wordmark
  color?: string; // text color
}

// INTERIM (2026-10-13, launch-blocking fix): the approved dotted-Q logo asset
// (the @getcoloriq profile picture) is not in the repo -- BLOCKED on the asset.
// Rendering a text "COLORiq" wordmark until it lands; swap this component's
// body for the image when the asset arrives.
export const ColorIqLogo: React.FC<LogoIconProps> = ({
  className = '',
  size = 20,
  color = '#FFFFFF',
}) => (
  <span
    className={'font-black tracking-tight ' + className}
    style={{ fontSize: size, color: color, lineHeight: 1, whiteSpace: 'nowrap' }}
  >
    COLORiq
  </span>
);

export default ColorIqLogo;
