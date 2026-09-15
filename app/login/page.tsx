import { redirect } from "next/navigation";
import { session } from "@/lib/auth";
import { Login } from "@/components/login";
export const dynamic = "force-dynamic";
export default async function Page() {
  if (await session()) redirect("/dashboard");
  return <Login />;
}
