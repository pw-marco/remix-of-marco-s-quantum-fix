// components/TriggerCleanup.tsx
"use client";

import { useEffect } from "react";

export default function TriggerCleanup() {
  useEffect(() => {
    // Initial cleanup on mount
    fetch("/api/cleanupVerifications", { method: "POST" }).catch(console.error);

    // Set up interval for regular cleanup (every 30 minutes)
    const cleanupInterval = setInterval(async () => {
      try {
        await fetch('/api/cleanupVerifications', {
          method: 'POST',
          keepalive: true,
        });
      } catch (error) {
        console.error("Periodic cleanup failed:", error);
      }
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(cleanupInterval);
  }, []);

  return null; // This component doesn't render anything
}