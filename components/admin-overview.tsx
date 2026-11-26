"use client";

import Card from "@mui/material/Card";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Customer } from "@/lib/types";
import { Status } from "./portal";

export function AdminOverview({ customers }: { customers: Customer[] }) {
  const connections = customers.flatMap(customer => customer.connections.map(connection => ({ ...connection, workspace: customer.business_name })));
  const callsPlaced = customers.reduce((total, customer) => total + customer.calls, 0);
  const callMinutes = customers.reduce((total, customer) => total + customer.call_minutes, 0);
  const tokensUsed = customers.reduce((total, customer) => total + Object.values(customer.model_usage || {}).reduce((sum, usage) => sum + (Number(usage.total_tokens) || 0), 0), 0);
  const totals = [
    ["Calls placed", callsPlaced.toLocaleString("en-US"), "Across all workspaces"],
    ["Minutes used", callMinutes.toLocaleString("en-US", { maximumFractionDigits: 1 }), "Across all workspaces"],
    ["Tokens used", tokensUsed.toLocaleString("en-US"), "Across all workspaces"],
  ] as const;
  const lkr = (amount: number) => new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

  return <div className="admin-overview">
    <div className="admin-totals">{totals.map(([label, count, detail]) => <Card className="panel admin-stat" key={label}><span>{label}</span><strong>{count}</strong><small>{detail}</small></Card>)}</div>
    <Card component="section" className="panel admin-section admin-pricing">
      <div className="panel-heading"><div><h2>Observed API cost averages</h2><p>Model billing and activity sample · Nov 1–25, 2026</p></div></div>
      <div className="admin-row">
        <div className="admin-row-main"><strong>Phone calls</strong><small>Rs 19.98 billed for Flash-Lite TTS over 1.88 minutes where it ran; Gemini Live showed no charge.</small></div>
        <strong className="admin-price">{lkr(19.98 / (112.604 / 60))} / min</strong>
      </div>
      <div className="admin-row">
        <div className="admin-row-main"><strong>WhatsApp replies</strong><small>Rs 3.33 billed for Flash over 6 logged requests.</small></div>
        <strong className="admin-price">{lkr(3.33 / 6)} / message</strong>
      </div>
      <div className="admin-row">
        <div className="admin-row-main"><strong>Gemini Flash TTS (non-Lite)</strong><small>Billed in the project; not matched to current runtime call records, so excluded from the call average.</small></div>
        <strong className="admin-price">{lkr(26.64)}</strong>
      </div>
      <small className="admin-pricing-source">Observed Google AI Studio model charges, converted at Rs 333 per USD (Nov 26). Account spend as of Nov 26: {lkr(276.39)}; prepay balance: {lkr(9713.61)}. These are small-sample averages, not workspace-level allocations; provider spend can take over 24 hours to update. <a href="https://aistudio.google.com/billing" target="_blank" rel="noreferrer">Open AI Studio billing</a>.</small>
    </Card>
    <div className="admin-sections">
      <Card component="section" className="panel admin-section admin-workspaces">
        <div className="panel-heading"><div><h2>Customer workspaces</h2><p>Manage access, agents, and call activity.</p></div><Link href="/admin" className="button">Manage customers</Link></div>
        {customers.length ? customers.map(customer => <div className="admin-row" key={customer.id}>
          <div className="admin-row-main"><strong>{customer.business_name}</strong><small>{customer.users.length} users <span>·</span> {customer.agents} agents <span>·</span> {customer.calls} calls</small></div>
          <div className="admin-row-actions"><Link href={`/dashboard?workspace=${customer.id}`} className="admin-row-action">View calls <ArrowUpRight size={15} /></Link><Link href={`/agents?workspace=${customer.id}`} className="admin-row-action">Manage agents <ArrowUpRight size={15} /></Link></div>
        </div>) : <p className="admin-empty">No customer workspaces yet.</p>}
      </Card>
      <Card component="section" className="panel admin-section admin-connections">
        <div className="panel-heading"><div><h2>WhatsApp numbers</h2><p>Connection status across workspaces.</p></div><span className="admin-count">{connections.length}</span></div>
        {connections.length ? connections.map(connection => <div className="admin-row" key={connection.id}>
          <div className="admin-row-main"><strong>{connection.phone ? `+${connection.phone}` : "Number pending"}</strong><small>{connection.workspace} <span>·</span> {connection.agent_name || "No agent"}{connection.error ? ` · ${connection.error}` : ""}</small></div>
          <Status value={connection.enabled ? connection.status : "disabled"} />
        </div>) : <p className="admin-empty">No customer numbers registered.</p>}
      </Card>
    </div>
  </div>;
}
