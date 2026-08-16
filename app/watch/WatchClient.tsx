// 📁 app/watch/WatchClient.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import "../globals.css";
import { toast } from "sonner";

interface ScheduleData {
  _id: string;
  topic: string;
  videoDetails: {
    _id: string;
    id: string;
    name: string;
  };
}

export default function WatchClient() {
  const params = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [iframeUrl, setIframeUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Params
  const batchId = params?.get("batchId") || "";
  const subjectId = params?.get("SubjectId") || "";
  const childId = params?.get("ContentId") || params?.get("ChildId") || "";
  const videoId = params?.get("videoId") || "";

  useEffect(() => {
    if (!batchId || !subjectId || !childId) {
      setLoading(false);
      setError("Missing required parameters");
      return;
    }

    async function buildVideoUrl() {
      try {
        setLoading(true);

        // ✅ Fetch Schedule API
        const scheduleRes = await fetch(
          `/api/Schedule?BatchId=${batchId}&SubjectId=${subjectId}&ContentId=${childId}`
        );

        if (!scheduleRes.ok) {
          throw new Error("Failed to fetch schedule");
        }

        const scheduleData = await scheduleRes.json();
        const video: ScheduleData = scheduleData.data;

        if (!video) {
          throw new Error("Video data not found in schedule");
        }

        // ✅ Build VidStream URL
        const params = new URLSearchParams();

        params.set('batch_id', batchId || '');
        params.set('subject_id', subjectId || '');
        
        const topicId = video?.videoDetails?.id || childId || '';
        params.set('topic_id', topicId);
        
        params.set('video_id', childId || videoId || '');
        
        const typeId = video?.videoDetails?._id || '';
        params.set('typeId', typeId);
        
        params.set('video_url', '');
        
        const videoName = video?.topic || 'Video';
        params.set('video_name', videoName);
        
        params.set('video_type', 'new');
        params.set('play_type', 'Lecture');

        const url = `https://vid-stream-marco.vercel.app/play.php?${params.toString()}`;

        // ✅ YAHAN MISSING THA - SET IFRAME URL
        console.log("🎬 Iframe URL:", url);
        setIframeUrl(url);

      } catch (err: any) {
        console.error("❌ Error:", err);
        setError(err.message || "Failed to load video");
        toast.error(err.message || "Failed to load video");
      } finally {
        setLoading(false);
      }
    }

    buildVideoUrl();
  }, [batchId, subjectId, childId, videoId]);

  // ✅ Auto-rotate to landscape
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleFullscreenChange = () => {
      const isFullscreen = !!document.fullscreenElement;

      if (isFullscreen && (screen.orientation && typeof (screen.orientation as any).lock === "function")) {
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

  return (
    <div className="w-full h-screen bg-black">
      {iframeUrl ? (
        <iframe
          src={iframeUrl}
          className="w-full h-full border-0"
          allow="autoplay; encrypted-media; fullscreen"
          allowFullScreen
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-presentation"
        />
      ) : (
        <div className="flex items-center justify-center h-full text-white">
          <p>No video URL available</p>
        </div>
      )}
    </div>
  );
}