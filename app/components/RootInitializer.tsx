"use client";
import { useEffect } from "react";

export default function ClientRootLayout({ 
  children, 
  serverInfo 
}: { 
  children: React.ReactNode;
  serverInfo?: any;
}) {
  useEffect(() => {
    const anon_id = document.cookie.split('; ').find(row => row.startsWith('anon_id='))?.split('=')[1];
    
    if (anon_id) {
      fetch('/api/track-anon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anon_id,
          useragent: navigator.userAgent,
          ip: '' // IP will be handled server-side
        }),
        keepalive: true,
      }).catch(error => {
        console.error("Failed to track anon_id:", error);
      });
    }
  }, []);

  useEffect(() => {
    if (serverInfo) {
      (window as any).__SERVER_INFO__ = serverInfo;
    }
  }, [serverInfo]);

  return <>{children}</>;
} 