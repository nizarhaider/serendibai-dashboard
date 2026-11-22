import { notFound, redirect } from "next/navigation";
import { session } from "@/lib/auth";
import { getData } from "@/lib/data";
import { Portal } from "@/components/portal";
import { canAccessSection } from "@/lib/permissions";
import { getCustomers } from "@/lib/customers";
import { Onboarding } from "@/components/onboarding";

export const dynamic = "force-dynamic";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ workspace?: string }>;
}) {
  const { section } = await params;
  const { workspace } = await searchParams;
  if (!["dashboard", "appointments", "orders", "tickets", "knowledge", "catalogue", "agents", "outbound", "admin", "onboarding", "connections"].includes(section))
    notFound();
  const user = await session();
  if (!user) redirect("/login");
  if (!user.is_admin && !user.onboarding_completed && section !== "onboarding") redirect("/onboarding");
  if (section === "onboarding" && user.is_admin) redirect("/dashboard");
  if (section === "onboarding" && user.onboarding_completed) redirect("/connections");
  if (!canAccessSection(user, section)) redirect("/dashboard");
  const customers = user.is_admin ? await getCustomers() : [];
  const target = user.is_admin && section === "agents" ? workspace || customers[0]?.id : user.is_admin && section === "dashboard" ? workspace : undefined;
  if (target && !customers.some(customer => customer.id === target)) notFound();
  const data = await getData(user.customer_id, user.email, 30, undefined, section, target);
  if (!user.is_admin && !user.onboarding_completed) return <Onboarding agents={data.agents} businessName={data.business_name} standalone />;
  return (
    <Portal
      key={section}
      section={section}
      workspace={target || ""}
      initial={data}
      initialCustomers={JSON.parse(JSON.stringify(customers))}
    />
  );
}
