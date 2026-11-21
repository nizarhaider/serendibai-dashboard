import { Setup } from "@/components/setup";

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <Setup token={token || ""} />;
}
