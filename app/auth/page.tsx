import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import Login from "./login"; // Your client login component
import { redirect } from "next/navigation";
import { getAuthEnabled } from "@/lib/authMode";
import { JWT_SECRET_VALUE } from "@/lib/defaults";

export const dynamic = "force-dynamic";

export default async function AuthPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;
  const SECRET = new TextEncoder().encode(JWT_SECRET_VALUE);

  if (token) {
    try {
      await jwtVerify(token, SECRET);

      // If token valid, redirect to /study
      redirect("/study");
    } catch {
      // Invalid token, continue below
    }
  }

  // ✅ Auth OFF: never show the login page — create a guest session instead.
  const authEnabled = await getAuthEnabled();
  if (!authEnabled) {
    redirect("/api/auth/guest?next=/study");
  }

  return <Login />;
}
