'use client';

import { useState, useEffect } from 'react';

export type DeviceClass = 'mobile' | 'tablet' | 'desktop';
export type Orientation = 'portrait' | 'landscape';

export interface ResponsiveDeviceInfo {
  device: DeviceClass;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  orientation: Orientation;
  isTouch: boolean;
  width: number;
  height: number;
}

const DEFAULT_STATE: ResponsiveDeviceInfo = {
  device: 'desktop',
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  orientation: 'landscape',
  isTouch: false,
  width: 1440,
  height: 900,
};

export function useResponsiveDevice(): ResponsiveDeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<ResponsiveDeviceInfo>(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_STATE;
    }
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const orientation: Orientation = width > height ? 'landscape' : 'portrait';

    let device: DeviceClass = 'desktop';
    if (width <= 640) {
      device = 'mobile';
    } else if (width <= 1024) {
      device = 'tablet';
    }

    return {
      device,
      isMobile: device === 'mobile',
      isTablet: device === 'tablet',
      isDesktop: device === 'desktop',
      orientation,
      isTouch,
      width,
      height,
    };
  });

  useEffect(() => {
    function handleResize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const orientation: Orientation = width > height ? 'landscape' : 'portrait';

      let device: DeviceClass = 'desktop';
      if (width <= 640) {
        device = 'mobile';
      } else if (width <= 1024) {
        device = 'tablet';
      }

      setDeviceInfo({
        device,
        isMobile: device === 'mobile',
        isTablet: device === 'tablet',
        isDesktop: device === 'desktop',
        orientation,
        isTouch,
        width,
        height,
      });
    }

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return deviceInfo;
}
