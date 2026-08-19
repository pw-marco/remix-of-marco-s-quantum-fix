"use client";

import { useEffect, useState } from "react";
import StreamPlayer from "@/app/components/StreamPlayer";
import { toast } from "sonner";

export default function LivePage() {
  const [url, setUrl] = useState<string>("");
  const [clearKeys, setClearKeys] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const batchId = params.get("batchId");
    const subjectId = params.get("SubjectId");
    const childId = params.get("ChildId");
    const urlType = params.get("Type") || "awsVideo";

    if (!batchId || !childId) {
      const err = "Missing required query parameters.";
      toast.error(err);
      setErrorMsg(err);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      // 1️⃣ Primary: stream-url worker
      try {
        const res = await fetch(
          `/api/stream-url?parentId=${encodeURIComponent(
            batchId
          )}&childId=${encodeURIComponent(childId)}&urlType=${encodeURIComponent(
            urlType
          )}`
        );
        const json = await res.json();

        if (res.ok && json?.success && json?.data?.videoUrl) {
          if (cancelled) return;
          setUrl(json.data.videoUrl);
          setClearKeys(json.data.clearKeys || {});
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn("stream-url failed, falling back", err);
      }

      // 2️⃣ Fallback: existing provider chain
      try {
        const res = await fetch(
          `/api/get-video-url?batchId=${batchId}&subjectId=${subjectId || ""}&childId=${childId}`
        );
        const data = await res.json();

        if (!data?.success) {
          throw new Error(data?.message || "Failed to fetch video EROR_CODE_902");
        }

        const videoData = data.data || {};
        const playableUrl =
          videoData.hls_url || videoData.m3u8_url || videoData.url;

        if (!playableUrl) throw new Error("Invalid video URL response from server");

        if (cancelled) return;
        setUrl(playableUrl);
        setClearKeys(videoData.clearKeys || {});
      } catch (err: any) {
        if (cancelled) return;
        const msg = err?.message || "Error loading video link";
        toast.error(msg);
        setErrorMsg(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-black text-white">
        <span>Loading live class...</span>
      </div>
    );
  }

  if (errorMsg || !url) {
    return (
      <div className="text-red-500 text-center p-4">
        <p>{errorMsg || "Unknown error occurred."}</p>
      </div>
    );
  }

  return <StreamPlayer url={url} clearKeys={clearKeys} />;
}
