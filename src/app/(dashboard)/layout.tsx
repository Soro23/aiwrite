import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, verifyToken } from "@/lib/auth/jwt";
import { getUserById } from "@/services/auth.service";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    redirect("/login");
  }

  const payload = verifyToken(token);
  if (!payload || !payload.role) {
    // Stale or malformed token — force re-login
    redirect("/login");
  }

  const user = await getUserById(payload.sub);
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen bg-[#171717] overflow-hidden">
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {children}
      </div>
    </div>
  );
}
