import { redirect } from "next/navigation";
import { session } from "@/lib/auth";
import { PortalShell } from "@/components/portal-shell";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await session();
  if (!user) redirect("/login");
  if (!user.is_admin && !user.onboarding_completed) redirect("/onboarding");
  return <PortalShell account={{ business_name: user.business_name, display_name: user.display_name, email: user.email, is_admin: user.is_admin, read_only: user.read_only, allowed_tools: user.allowed_tools }}>{children}</PortalShell>;
}
