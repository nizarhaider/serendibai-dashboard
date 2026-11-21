import { Invite } from "@/components/invite";

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <Invite token={token || ""} />;
}
