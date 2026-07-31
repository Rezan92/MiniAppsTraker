import React from 'react';
import { useNetwork } from '../../hooks/useNetwork';

export const NetworkBanner = () => {
  const isOnline = useNetwork();

  if (isOnline) return null;

  return (
    <div className="w-full bg-error text-on-error px-4 py-2 flex items-center justify-center gap-3 shadow-md z-50 sticky top-0">
      <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
        wifi_off
      </span>
      <p className="font-label-md text-sm font-medium">
        You are currently offline. Some features may be unavailable until your connection is restored.
      </p>
    </div>
  );
};
