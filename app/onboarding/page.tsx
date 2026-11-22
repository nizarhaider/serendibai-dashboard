import { redirect } from "next/navigation";
import { session } from "@/lib/auth";
import { getData } from "@/lib/data";
import { Onboarding } from "@/components/onboarding";

export default async function Page() {
  const user = await session();
  if (!user) redirect("/login");
  if (user.is_admin) redirect("/dashboard");
  if (user.onboarding_completed) redirect("/connections");
  const data = await getData(user.customer_id, user.email, 30, undefined, "onboarding");
  return <Onboarding agents={data.agents} businessName={data.business_name} standalone />;
}
