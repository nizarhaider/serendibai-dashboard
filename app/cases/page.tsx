import { CaseDemo } from "@/components/case-demo";
import { getCases } from "@/lib/cases";

export const dynamic = "force-dynamic";

export default async function Page() {
  return <CaseDemo cases={await getCases()} />;
}
