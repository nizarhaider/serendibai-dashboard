"use client";
import { AlertCircle, Phone, Ticket } from "lucide-react";
import type { PortalData, Ticket as SupportTicket } from "@/lib/types";
import { RecordStatus } from "./portal";

const date = (value: string) => new Intl.DateTimeFormat("en-LK", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Colombo" }).format(new Date(value));
const label = (value: string) => value.replace("_", " ");

export function Tickets({ data, refresh }: { data: PortalData; refresh: () => Promise<void> }) {
  return (
    <section className="panel records-panel">
      <div className="panel-heading"><div><h2>Support tickets</h2><p>Manage call issues here. External helpdesk sync needs a configured integration.</p></div><span className="icon-tile lavender"><Ticket size={19} /></span></div>
      {data.tickets.length ? <div className="records-list">{data.tickets.map((ticket: SupportTicket) => <article key={ticket.id} className="record-card"><div className="record-main"><div className="record-title"><div><h3>{ticket.subject}</h3><p>{ticket.customer_name}</p></div><div className="record-badges"><span className={`priority ${ticket.priority}`}>{label(ticket.priority)}</span><RecordStatus id={ticket.id} resource="tickets" value={ticket.status} options={["open", "in_progress", "resolved", "closed"]} refresh={refresh} /></div></div><p className="record-description">{ticket.description}</p><div className="record-meta"><span>{date(ticket.created_at)}</span>{ticket.agent_name && <span>{ticket.agent_name}</span>}{ticket.customer_phone && <span><Phone size={13} /> {ticket.customer_phone}</span>}</div></div></article>)}</div> : <div className="records-empty"><AlertCircle size={30} /><strong>No support tickets yet</strong><p>Issues confirmed during customer calls will appear here automatically.</p></div>}
    </section>
  );
}
