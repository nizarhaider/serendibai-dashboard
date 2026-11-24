import { ForgotPassword } from "@/components/forgot-password";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <ForgotPassword token={token || ""} />;
}
