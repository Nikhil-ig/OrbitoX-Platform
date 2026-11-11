import React from 'react';

export interface LogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
  strokeWidth?: number | string;
}

export function OrbitoxLogo({ size = 24, color = 'currentColor', strokeWidth = 2, ...props }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="3" fill={color} />
      <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(-30 12 12)" />
      <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(30 12 12)" />
    </svg>
  );
}

