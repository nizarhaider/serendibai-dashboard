import Link from "next/link";
import { notFound } from "next/navigation";

export default async function Page({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  if (reference !== "WL-1042") notFound();
  return <main className="case-studio">
    <Link href="/cases" className="case-brand">Wear Luma Clothing</Link>
    <p className="case-eyebrow">Fictional order · Demo tracker</p>
    <h1>Your wedding suit.</h1>
    <p className="case-intro">Order WL-1042 · Navy wedding suit</p>
    <section className="case-card">
      <div><p className="case-eyebrow">Current stage</p><h2>Final alterations and quality check</h2><p>Your suit is being finished before courier collection. It has not been dispatched yet.</p></div>
      <div><h3>What happens next</h3><p>Quality check → courier collection → delivery.</p><p>Demo dispatch estimate: two working days. This is an illustrative estimate, not a guaranteed delivery date.</p></div>
    </section>
    <p className="case-note">This page shows a fictional showcase order. It is not connected to a real clothing business or courier. Ask the demo agent to record an urgent follow-up with your wedding date.</p>
  </main>;
}
