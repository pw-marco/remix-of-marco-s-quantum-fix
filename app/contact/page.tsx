"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Send,
  User2,
  MessageSquare,
  Rocket,
  Shield,
  ExternalLink,
  Link2,
  BookOpen,
  GraduationCap,
  Info,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default function ContactPage() {
  const [serverInfo, setServerInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchServerInfo() {
      try {
        const res = await fetch("/api/auth/serverInfo");
        if (!res.ok) throw new Error("Failed to fetch server info");
        const data = await res.json();
        setServerInfo(data);
      } catch (err) {
        setError("Could not load server info");
      } finally {
        setLoading(false);
      }
    }
    fetchServerInfo();
  }, []);

  const appName = serverInfo?.webName || process.env.NEXT_PUBLIC_APP_NAME || "PW Quantum";
  const tg_channel = serverInfo?.tg_channel;
  const tg_username = serverInfo?.tg_username;
  const sidebarLogoUrl = serverInfo?.sidebarLogoUrl;
  const sidebarTitle = serverInfo?.sidebarTitle;
  const tg_bot = serverInfo?.tg_bot;
  const isDirectLoginOpen = serverInfo?.isDirectLoginOpen as boolean | undefined;

  const tgChannelHref = tg_channel
    ? `https://t.me/${String(tg_channel).replace("@", "")}`
    : "#";
  const tgOwnerHref = tg_username
    ? `https://t.me/${String(tg_username).replace("@", "")}`
    : "#";
  const tgBotHref = tg_bot ? `https://t.me/${String(tg_bot).replace("@", "")}` : "#";

  return (
    <div className="container mx-auto px-4 py-6 max-w-[1400px]">
      {/* Intro / About */}
      <div className="bg-background border rounded-lg p-4 sm:p-6 mb-6 divshadow">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-semibold">About {appName}</h2>
            <p className="text-muted-foreground">
              Your study companion for live classes, schedules, and resources — designed to be fast, clean, and distraction-free.
            </p>
          </div>
          {sidebarLogoUrl && (
            <img
              src={sidebarLogoUrl}
              alt={sidebarTitle || appName}
              className="w-10 h-10 rounded-md border"
            />
          )}
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2 py-1 rounded-md border bg-background/60">Secure</span>
          <span className="px-2 py-1 rounded-md border bg-background/60">Reliable</span>
          <span className="px-2 py-1 rounded-md border bg-background/60">Responsive</span>
        </div>
      </div>

      {/* Primary Contacts */}
      <div className="bg-background border rounded-lg p-4 sm:p-6 mb-6 divshadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border p-4 bg-background/50">
            <div className="flex items-center gap-2 mb-2">
              <Send className="w-4 h-4" />
              <h3 className="font-medium">Official Telegram Channel</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">Get the latest updates and announcements.</p>
            <Button asChild className="w-full md:w-auto" disabled={!tg_channel}>
              <a href={tgChannelHref} target="_blank" rel="noopener noreferrer">
                Join Channel
              </a>
            </Button>
            {!tg_channel && <p className="text-xs text-muted-foreground mt-2">Channel not available</p>}
          </div>

          <div className="rounded-lg border p-4 bg-background/50">
            <div className="flex items-center gap-2 mb-2">
              <User2 className="w-4 h-4" />
              <h3 className="font-medium">Contact Owner</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">For queries, collaborations, or support.</p>
            <Button asChild variant="secondary" className="w-full md:w-auto" disabled={!tg_username}>
              <a href={tgOwnerHref} target="_blank" rel="noopener noreferrer">
                Message on Telegram
              </a>
            </Button>
            {!tg_username && <p className="text-xs text-muted-foreground mt-2">Owner contact not available</p>}
          </div>
        </div>
      </div>

      {/* Developer / Maintainer */}
      <div className="bg-background border rounded-lg p-4 sm:p-6 mb-6 divshadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border p-4 bg-background/50">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4" />
              <h3 className="font-medium">Developer & Maintainer</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Reach out for technical issues, feature requests, or security concerns.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" disabled={!tg_username}>
                <a href="https://telegram.me/Deltaverse_owner" target="_blank" rel="noopener noreferrer">
                  Developer
                </a>
              </Button>
              <Button asChild variant="outline" disabled={!tg_bot}>
                <a href="javascript:void(0)" target="_blank" rel="noopener noreferrer">
                  Telegram Bot
                </a>
              </Button>
            </div>
          </div>

          <div className="rounded-lg border p-4 bg-background/50">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4" />
              <h3 className="font-medium">Status & Info</h3>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs px-2 py-1 rounded-md border ${isDirectLoginOpen ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"}`}>
                Direct Login: {isDirectLoginOpen ? "Enabled" : "Disabled"}
              </span>
              {sidebarTitle && (
                <span className="text-xs px-2 py-1 rounded-md border bg-background/60">{sidebarTitle}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Resources */}
      <div className="bg-background border rounded-lg p-4 sm:p-6 mb-6 divshadow">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            <h3 className="text-md font-medium">Resources & Links</h3>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="ghost">
            <a href="/study">
              Study Home
            </a>
          </Button>
          <Button asChild variant="ghost">
            <a href="/study/batches">
              Batches
            </a>
          </Button>
          <Button asChild variant="ghost">
            <a href="/study/mybatches">
              My Batches
            </a>
          </Button>
        </div>
      </div>

      {/* Powered By */}
      <div className="bg-background border rounded-lg p-4 sm:p-6 divshadow">
        <div className="flex items-center gap-2 mb-3">
          <Rocket className="w-4 h-4" />
          <h3 className="text-md font-medium">Powered by</h3>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2 py-1 rounded-md border bg-background/60">Next.js</span>
          <span className="px-2 py-1 rounded-md border bg-background/60">Tailwind CSS</span>
          <span className="px-2 py-1 rounded-md border bg-background/60">TypeScript</span>
          <span className="px-2 py-1 rounded-md border bg-background/60">MongoDB</span>
          <span className="px-2 py-1 rounded-md border bg-background/60">Mongoose</span>
          <span className="px-2 py-1 rounded-md border bg-background/60">shadcn/ui</span>
          <span className="px-2 py-1 rounded-md border bg-background/60">lucide-icons</span>
        </div>
      </div>
    </div>
  );
}