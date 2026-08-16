// page.tsx (server component)
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import SubjectClientPage from "./SubjectClientPage";

export default async function Page({ params }: { params: Promise<{ batchid: string, subjectid: string }> }) {
  const { batchid } = await params;
  const cookieStore = await cookies();
  
    // If verified, render the client page
  return <SubjectClientPage />;
}
