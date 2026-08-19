"use client";

import dynamic from "next/dynamic";
import React from "react";

const HLSPlayer = dynamic(() => import("@/app/components/HLSPlayer"), {
  ssr: false,
});
const DashPlayer = dynamic(() => import("@/app/components/dashPlayer"), {
  ssr: false,
});

type Props = {
  url: string;
  clearKeys?: Record<string, string>;
  attachment?: string;
};

/**
 * Plays whatever the stream API returns:
 *  - .m3u8  -> HLS player
 *  - .mpd   -> Shaka (DASH) player with clearKeys
 *  - other  -> embedded player page (iframe)
 */
const StreamPlayer: React.FC<Props> = ({ url, clearKeys, attachment }) => {
  if (!url) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        No stream url available
      </div>
    );
  }

  const clean = url.split("#")[0];
  const hasKeys = !!clearKeys && Object.keys(clearKeys).length > 0;
  // Some providers serve a DASH manifest from a non-.mpd path (e.g. rcx.php)
  const looksLikeDash = /\.mpd(\?|$)/i.test(clean) || /rcx\.php/i.test(clean) || hasKeys;

  if (/\.m3u8(\?|$)/i.test(clean)) {
    return <HLSPlayer baseUrl={url} signedQuery="" attachment={attachment} />;
  }

  if (looksLikeDash) {
    return (
      <DashPlayer
        src={url}
        type="dash"
        drmConfig={{ clearKeys: clearKeys || {} }}
        Attachment={attachment}
      />
    );
  }


  return (
    <div className="w-full h-screen bg-black">
      <iframe
        src={url}
        className="w-full h-full border-0"
        allow="autoplay; encrypted-media; fullscreen"
        allowFullScreen
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-presentation"
      />
    </div>
  );
};

export default StreamPlayer;
