import { Suspense } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import BatchDetailPage from "./BatchDetail";

interface PageProps {
  params: { batchid: string };
}

export default async function Page({ params }: PageProps) {
  const batchId = params.batchid;

  // Check if user is authenticated
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (!token) {
    redirect('/auth');
  }


  return (
    <Suspense fallback={<div className="text-center p-4 text-red-600">Loading...</div>}>
      <BatchDetailPage />
    </Suspense>
  );
}
