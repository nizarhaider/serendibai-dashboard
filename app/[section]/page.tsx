import { notFound, redirect } from "next/navigation";
import { session } from "@/lib/auth";
import { getData } from "@/lib/data";
import { Portal } from "@/components/portal";
import { canAccessSection } from "@/lib/permissions";
import { getCustomers } from "@/lib/customers";

export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!["dashboard", "appointments", "orders", "tickets", "knowledge", "catalogue", "agents", "outbound", "admin"].includes(section))
    notFound();
  const user = await session();
  if (!user) redirect("/login");
  if (!canAccessSection(user, section)) redirect("/dashboard");
  const [data, customers] = await Promise.all([
    getData(user.customer_id, user.email, 30, undefined, section),
    section === "admin" ? getCustomers() : Promise.resolve([]),
  ]);
  return (
    <Portal
      key={section}
      section={section}
      initial={data}
      initialCustomers={JSON.parse(JSON.stringify(customers))}
    />
  );
}
