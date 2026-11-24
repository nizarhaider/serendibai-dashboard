"use client";

import Card from "@mui/material/Card";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { Customer } from "@/lib/types";
import { NativeSelect } from "@/components/ui/native-select";
import { Status } from "./portal";

export function AdminOverview({ customers }: { customers: Customer[] }) {
  const [workspaceId, setWorkspaceId] = useState("all");
  const selectedCustomers = workspaceId === "all" ? customers : customers.filter(customer => customer.id === workspaceId);
  const connections = customers.flatMap(customer => customer.connections.map(connection => ({ ...connection, workspace: customer.business_name })));
  const callsPlaced = customers.reduce((total, customer) => total + customer.calls, 0);
  const callMinutes = customers.reduce((total, customer) => total + customer.call_minutes, 0);
  const tokensUsed = customers.reduce((total, customer) => total + Object.values(customer.model_usage || {}).reduce((sum, usage) => sum + (Number(usage.total_tokens) || 0), 0), 0);
  const totals = [
    ["Calls placed", callsPlaced.toLocaleString("en-US"), "Across all workspaces"],
    ["Minutes used", callMinutes.toLocaleString("en-US", { maximumFractionDigits: 1 }), "Across all workspaces"],
    ["Tokens used", tokensUsed.toLocaleString("en-US"), "Across all workspaces"],
  ] as const;
  const modelUsage = selectedCustomers.reduce<Record<string, { request_count: number; total_tokens: number; input_tokens: number; output_tokens: number; input_audio_tokens: number; output_audio_tokens: number; audio_seconds: number }>>((all, customer) => {
    for (const [model, usage] of Object.entries(customer.model_usage || {})) {
      const total = all[model] ??= { request_count: 0, total_tokens: 0, input_tokens: 0, output_tokens: 0, input_audio_tokens: 0, output_audio_tokens: 0, audio_seconds: 0 };
      total.request_count += Number(usage.request_count) || 0;
      total.total_tokens += Number(usage.total_tokens) || 0;
      total.input_tokens += Number(usage.input_tokens) || 0;
      total.output_tokens += Number(usage.output_tokens) || 0;
      total.input_audio_tokens += Number(usage.input_audio_tokens) || 0;
      total.output_audio_tokens += Number(usage.output_audio_tokens) || 0;
      total.audio_seconds += Number(usage.audio_seconds) || 0;
    }
    return all;
  }, {});
  const ttsInputRate = new Date() < new Date("2027-01-01T00:00:00Z") ? 0.5 : 1;
  const ttsAudioRate = new Date() < new Date("2027-01-01T00:00:00Z") ? 6 : 12;
  const pricing = Object.entries(modelUsage).map(([model, usage]) => {
    const inputAudio = usage.input_audio_tokens;
    const outputAudio = usage.output_audio_tokens || (model === "gemini-3.8-flash-lite-tts" ? Math.round(usage.audio_seconds * 25) : 0);
    const inputText = Math.max(0, usage.input_tokens - inputAudio);
    const outputText = Math.max(0, usage.output_tokens - outputAudio);
    const cost = model === "gemini-3.8-live"
      ? (inputText * 0.75 + inputAudio * 3 + outputText * 4.5 + outputAudio * 12) / 1_000_000
      : model === "gemini-3.8-flash-lite-tts"
        ? (inputText * ttsInputRate + outputAudio * ttsAudioRate) / 1_000_000
        : null;
    return { model, usage, inputAudio, outputAudio, cost };
  });
  const totalCost = pricing.reduce((total, row) => total + (row.cost ?? 0), 0);
  const usd = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount > 0 ? Math.ceil((amount - Number.EPSILON) * 100) / 100 : amount);
  const modelName = (model: string) => model === "gemini-3.8-live" ? "Gemini 3.8 Live" : model === "gemini-3.8-flash-lite-tts" ? "Nishadi TTS · Gemini 3.8 Flash-Lite" : model;

  return <div className="admin-overview">
    <div className="admin-totals">{totals.map(([label, count, detail]) => <Card className="panel admin-stat" key={label}><span>{label}</span><strong>{count}</strong><small>{detail}</small></Card>)}</div>
    <Card component="section" className="panel admin-section admin-pricing">
      <div className="panel-heading"><div><h2>API pricing</h2><p>{usd(totalCost)} total across {selectedCustomers.reduce((sum, customer) => sum + customer.call_minutes, 0).toLocaleString("en-US", { maximumFractionDigits: 1 })} call minutes</p></div>
        <NativeSelect className="admin-workspace-filter" aria-label="Filter API pricing by workspace" value={workspaceId} onChange={event => setWorkspaceId(event.target.value)}>
          <option value="all">All workspaces</option>
          {customers.map(customer => <option key={customer.id} value={customer.id}>{customer.business_name}</option>)}
        </NativeSelect>
      </div>
      {pricing.length ? pricing.map(({ model, cost }) => <div className="admin-row" key={model}>
        <div className="admin-row-main"><strong>{modelName(model)}</strong></div>
        <strong className="admin-price">{cost === null ? "Rate unavailable" : usd(cost)}</strong>
      </div>) : <p className="admin-empty">No model usage recorded for this workspace yet.</p>}
      <details className="admin-pricing-method"><summary>Rates and calculation</summary><div className="admin-pricing-formulas">
        <p><strong>Gemini 3.8 Live</strong><code>cost = (text in × $0.75 + audio in × $3 + text out × $4.50 + audio out × $12) ÷ 1,000,000</code></p>
        <p><strong>Nishadi TTS</strong><code>cost = (text in × ${ttsInputRate} + audio out × ${ttsAudioRate}) ÷ 1,000,000</code></p>
        <small>Rates are USD per million tokens. Audio is 25 tokens/second: Live input ≈ $0.005/min and output ≈ $0.018/min; TTS output ≈ ${usd(ttsAudioRate * 1_500 / 1_000_000)}/min. Free-tier traffic is $0.</small>
      </div></details>
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
