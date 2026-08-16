// app/layout.tsx
import { BRAND_NAME, BRAND_LOGO_URL } from "@/lib/defaults";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../styles/globals.css";
import { Toaster } from "sonner";
import NetworkStatus from '@/components/NetworkStatus';

import RootInitializer from "@/app/components/RootInitializer";
import TriggerCleanup from "@/app/TriggerCleanup";

const inter = Inter({ subsets: ["latin"] });

// Server-side function to fetch server info
async function getServerInfo() {
  try {
    const baseUrl =
      process.env.BASE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

    if (!baseUrl) {
      return null;
    }
const url = `${baseUrl}/api/auth/serverInfo`;
    const res = await fetch(url, {
      cache: "no-store", // Disable caching to get fresh data
    });

    if (!res.ok) {
      console.error("Failed to fetch server info XD: ", url);
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error("Error fetching server info:", error);
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const serverInfo = await getServerInfo();

  return {
    title:
      serverInfo?.webName || BRAND_NAME,
    description: "A comprehensive online study platform for students and learners",

    icons: {
      icon: serverInfo?.sidebarLogoUrl || BRAND_LOGO_URL, // fallback to public/favicon.ico
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch server info on the server side (will be cached from metadata generation)
  const serverInfo = await getServerInfo();

  return (
    <html lang="en">
      <body className={inter.className}>
        <RootInitializer serverInfo={serverInfo}>{children}</RootInitializer>
        <NetworkStatus />
        <Toaster position="top-right" richColors closeButton />
        <TriggerCleanup />
      </body>
    </html>
  );
}
