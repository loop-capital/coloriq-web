import React from 'react';
import Image from 'next/image';

interface LogoIconProps {
  className?: string;
  size?: number; // height in px for the logo image
  variant?: 'mark' | 'lockup'; // mark = Q only (dashboards, small sizes); lockup = Q + tagline (sign-in page)
  color?: string; // legacy prop from interim wordmark era; ignored for image rendering
  alt?: string;
}

// Dotted-Q brand asset (2026-10-16): full lockup (with 'Powered by Pixels &
// Peroxide') for the sign-in page; mark-only for dashboard chrome and any
// small context where the tagline would be illegible.
export const ColorIqLogo: React.FC<LogoIconProps> = ({
  className = '',
  size = 36,
  variant = 'mark',
  alt = 'COLORiq',
}) => {
  const src =
    variant === 'lockup'
      ? '/images/logos/coloriq-q-lockup.jpg'
      : '/images/logos/coloriq-q-mark.jpg';
  // Lockup is wider than tall; mark is square.
  const width = variant === 'lockup' ? Math.round(size * 1.0) : size;
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={size}
      className={className}
      priority
    />
  );
};

export default ColorIqLogo;
