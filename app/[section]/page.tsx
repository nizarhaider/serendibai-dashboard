import { notFound, redirect } from "next/navigation";
import { session } from "@/lib/auth";
import { getData } from "@/lib/data";
import { Portal } from "@/components/portal";

export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!["dashboard", "knowledge", "catalogue", "agents"].includes(section))
    notFound();
  const user = await session();
  if (!user) redirect("/login");
  return (
    <Portal
      section={section}
      initial={await getData(user.customer_id, user.email)}
    />
  );
}
