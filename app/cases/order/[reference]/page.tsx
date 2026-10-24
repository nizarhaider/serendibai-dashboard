import Link from "next/link";
import { notFound } from "next/navigation";

export default async function Page({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  if (!/^[a-zA-Z0-9-]{3,30}$/.test(reference)) notFound();
  return <main className="case-studio">
    <Link href="/cases" className="case-brand">Roma Suits</Link>
    <p className="case-eyebrow">Fictional order · Demo tracker</p>
    <h1>Your wedding suit.</h1>
    <p className="case-intro">Order {reference} · Navy wedding suit</p>
    <section className="case-card">
      <div><p className="case-eyebrow">Current stage</p><h2>Ready at Bambalapitiya</h2><p>Your suit is packed and waiting for courier collection at our Bambalapitiya branch in Colombo. It has not been dispatched yet.</p></div>
      <div><h3>Your collection options</h3><p>Courier pickup is expected within the next two days. Ask the agent to request priority collection from the delivery partner, or arrange to collect it yourself from the branch.</p><p>Branch collection: Monday–Saturday, 9 am–6 pm. The pickup estimate is not a guaranteed delivery date.</p></div>
    </section>
    <p className="case-note">This page shows a fictional showcase order. It is not connected to a real clothing business or courier. Ask the demo agent to record an urgent follow-up with your wedding date.</p>
  </main>;
}
