// 📁 app/watch/WatchClient.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import "../globals.css";
import { toast } from "sonner";
import StreamPlayer from "@/app/components/StreamPlayer";

export default function WatchClient() {
  const params = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [streamUrl, setStreamUrl] = useState("");
  const [clearKeys, setClearKeys] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  // Params
  const batchId = params?.get("batchId") || "";
  const childId = params?.get("ContentId") || params?.get("ChildId") || "";
  const urlType = params?.get("Type") || "penpencilvdo";

  useEffect(() => {
    if (!batchId || !childId) {
      setLoading(false);
      setError("Missing required parameters");
      return;
    }

    let cancelled = false;

    async function loadStream() {
      try {
        setLoading(true);

        const res = await fetch(
          `/api/stream-url?parentId=${encodeURIComponent(
            batchId
          )}&childId=${encodeURIComponent(childId)}&urlType=${encodeURIComponent(
            urlType
          )}`
        );

        const json = await res.json();

        if (!res.ok || !json?.success || !json?.data?.videoUrl) {
          throw new Error(json?.message || "Failed to fetch stream url");
        }

        if (cancelled) return;
        setStreamUrl(json.data.videoUrl);
        setClearKeys(json.data.clearKeys || {});
      } catch (err: any) {
        if (cancelled) return;
        console.error("❌ Stream error:", err);
        setError(err?.message || "Failed to load video");
        toast.error(err?.message || "Failed to load video");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadStream();
    return () => {
      cancelled = true;
    };
  }, [batchId, childId, urlType]);

  // ✅ Auto-rotate to landscape
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleFullscreenChange = () => {
      const isFullscreen = !!document.fullscreenElement;

      if (
        isFullscreen &&
        screen.orientation &&
        typeof (screen.orientation as any).lock === "function"
      ) {
        (screen.orientation as any).lock("landscape").catch((err: unknown) => {
          console.warn("Orientation lock failed:", err);
        });
      } else if (screen.orientation?.unlock) {
        screen.orientation.unlock?.();
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
          <p className="text-white">Loading video...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <div className="text-center max-w-md px-4">
          <div className="text-6xl mb-4">❌</div>
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-red-500 rounded-lg hover:bg-red-600 transition"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  return <StreamPlayer url={streamUrl} clearKeys={clearKeys} />;
}
