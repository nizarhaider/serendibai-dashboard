import Card from "@mui/material/Card";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Customer } from "@/lib/types";
import { Status } from "./portal";

export function AdminOverview({ customers }: { customers: Customer[] }) {
  const connections = customers.flatMap(customer => customer.connections.map(connection => ({ ...connection, workspace: customer.business_name })));
  const totals = [
    ["Customer workspaces", customers.length, "Across your portal"],
    ["Active users", customers.reduce((total, customer) => total + customer.users.length, 0), "With portal access"],
    ["Voice agents", customers.reduce((total, customer) => total + customer.agents, 0), "Across all workspaces"],
    ["Connected numbers", connections.filter(connection => connection.status === "connected").length, "WhatsApp lines online"],
  ] as const;
  const modelUsage = customers.reduce<Record<string, { request_count: number; total_tokens: number; input_tokens: number; output_tokens: number; audio_seconds: number }>>((all, customer) => {
    for (const [model, usage] of Object.entries(customer.model_usage || {})) {
      const total = all[model] ??= { request_count: 0, total_tokens: 0, input_tokens: 0, output_tokens: 0, audio_seconds: 0 };
      total.request_count += Number(usage.request_count) || 0;
      total.total_tokens += Number(usage.total_tokens) || 0;
      total.input_tokens += Number(usage.input_tokens) || 0;
      total.output_tokens += Number(usage.output_tokens) || 0;
      total.audio_seconds += Number(usage.audio_seconds) || 0;
    }
    return all;
  }, {});

  return <div className="admin-overview">
    <div className="admin-totals">{totals.map(([label, count, detail]) => <Card className="panel admin-stat" key={label}><span>{label}</span><strong>{count}</strong><small>{detail}</small></Card>)}</div>
    <Card component="section" className="panel admin-section"><div className="panel-heading"><div><h2>Model usage</h2><p>{customers.reduce((sum, customer) => sum + customer.call_minutes, 0).toFixed(1)} total call minutes</p></div></div>
      {Object.entries(modelUsage).length ? Object.entries(modelUsage).map(([model, usage]) => <div className="admin-row" key={model}><div className="admin-row-main"><strong>{model === "gemini-3.8-live" ? "Gemini 3.8 Live" : model === "gemini-3.8-flash-lite-tts" ? "Nishadi TTS · Gemini 3.8 Flash-Lite" : model}</strong><small>{usage.request_count} requests · {usage.total_tokens.toLocaleString()} tokens{usage.audio_seconds ? ` · ${(usage.audio_seconds / 60).toFixed(1)} generated audio min` : ""}</small></div></div>) : <p className="admin-empty">No model usage recorded yet.</p>}
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
