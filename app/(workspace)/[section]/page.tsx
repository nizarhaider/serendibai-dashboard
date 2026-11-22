import { notFound } from "next/navigation";
import { WorkspacePage } from "@/components/workspace-page";

export default async function Page({ params, searchParams }: { params: Promise<{ section: string }>; searchParams: Promise<{ workspace?: string }> }) {
  const { section } = await params;
  const { workspace } = await searchParams;
  if (!["dashboard", "appointments", "orders", "tickets", "knowledge", "catalogue", "agents", "outbound", "admin", "connections"].includes(section)) notFound();
  return <WorkspacePage key={`${section}:${workspace || ""}`} section={section} workspace={workspace || ""} />;
}
