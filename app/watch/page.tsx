import React, { Suspense } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import WatchClient from "./WatchClient";

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function WatchPage({ searchParams }: PageProps) {
  // Check if user is authenticated
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (!token) {
    redirect('/auth');
  }


  return (
    <Suspense fallback={<div>You Need to enable JavaScript.</div>}>
      <WatchClient />
    </Suspense>
  );
}
