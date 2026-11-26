"use client";

import Card from "@mui/material/Card";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Customer } from "@/lib/types";
import { Status } from "./portal";

type UsageRequest = Record<string, unknown>;
type UsageBucket = { request_count: number; total_tokens: number; input_tokens: number; output_tokens: number; input_audio_tokens?: number; output_audio_tokens?: number; audio_seconds?: number; requests?: UsageRequest[][] };
type ModelRates = Partial<Record<"inputText" | "inputAudio" | "inputOther" | "outputText" | "outputAudio", number>>;

const number = (value: unknown) => Number(value) || 0;
const modalityTokens = (value: unknown, modality: string) => Array.isArray(value)
  ? value.reduce((sum, item) => sum + (item && typeof item === "object" && (item as UsageRequest).modality === modality ? number((item as UsageRequest).token_count) : 0), 0)
  : 0;

function requestsFrom(value: unknown, nested = false): UsageRequest[] {
  if (!Array.isArray(value)) return [];
  const rows = nested ? value.flat(2) : value;
  return rows.filter((item): item is UsageRequest => !!item && typeof item === "object" && !Array.isArray(item));
}

function rateFor(model: string): ModelRates | null {
  const future = new Date() >= new Date("2027-01-01T00:00:00Z");
  if (model === "gemini-3.8-live") return { inputText: 0.75, inputAudio: 3, inputOther: 1, outputText: 4.5, outputAudio: 12 };
  if (model === "gemini-3.8-flash-lite-tts") return { inputText: future ? 1 : 0.5, outputAudio: future ? 12 : 6 };
  if (model === "gemini-3.8-flash-tts") return { inputText: future ? 1 : 0.5, outputAudio: future ? 18 : 9 };
  if (model === "gemini-3.8-flash") return { inputText: future ? 1.5 : 0.75, outputText: future ? 7.5 : 3.75 };
  return null;
}

function usageBreakdown(model: string, bucket: UsageBucket) {
  const requests = requestsFrom(bucket.requests, true);
  const rows = requests.length ? requests : [{
    prompt_token_count: bucket.input_tokens,
    candidates_token_count: bucket.output_tokens,
    prompt_tokens_details: [{ modality: "AUDIO", token_count: bucket.input_audio_tokens || 0 }],
    candidates_tokens_details: [{ modality: "AUDIO", token_count: bucket.output_audio_tokens || 0 }],
  }];
  const result = { inputText: 0, inputAudio: 0, inputOther: 0, toolPrompt: 0, outputText: 0, outputAudio: 0, total: 0, freeRequests: 0, requests: requests.length || number(bucket.request_count) };
  const paid = { inputText: 0, inputAudio: 0, inputOther: 0, toolPrompt: 0, outputText: 0, outputAudio: 0 };
  for (const request of rows) {
    const prompt = number(request.prompt_token_count ?? request.input_token_count);
    const candidates = number(request.candidates_token_count ?? request.response_token_count);
    const thoughts = number(request.thoughts_token_count);
    const inputAudio = modalityTokens(request.prompt_tokens_details, "AUDIO");
    const inputOther = modalityTokens(request.prompt_tokens_details, "IMAGE") + modalityTokens(request.prompt_tokens_details, "VIDEO");
    const toolPrompt = number(request.tool_use_prompt_token_count);
    const outputAudio = modalityTokens(request.candidates_tokens_details ?? request.response_tokens_details, "AUDIO");
    const inputText = Math.max(0, prompt - inputAudio - inputOther);
    const outputText = Math.max(0, candidates - outputAudio) + thoughts;
    const free = String(request.traffic_type || "").toUpperCase().includes("FREE");
    result.inputText += inputText;
    result.inputAudio += inputAudio;
    result.inputOther += inputOther;
    result.toolPrompt += toolPrompt;
    result.outputText += outputText;
    result.outputAudio += outputAudio;
    result.total += (number(request.total_token_count) || prompt + candidates + thoughts + toolPrompt) + (model === "gemini-3.8-live" ? thoughts : 0);
    if (free) result.freeRequests += 1;
    else {
      paid.inputText += inputText;
      paid.inputAudio += inputAudio;
      paid.inputOther += inputOther;
      paid.toolPrompt += toolPrompt;
      paid.outputText += outputText;
      paid.outputAudio += outputAudio;
    }
  }
  const rates = rateFor(model);
  const cost = rates ? (
    (paid.inputText + paid.toolPrompt) * (rates.inputText || 0) + paid.inputAudio * (rates.inputAudio || 0) + paid.inputOther * (rates.inputOther || 0) + paid.outputText * (rates.outputText || 0) + paid.outputAudio * (rates.outputAudio || 0)
  ) * 333 / 1_000_000 : null;
  return { ...result, rates, paid, cost, assumedPaidRequests: Math.max(0, result.requests - result.freeRequests) };
}

export function AdminOverview({ customers }: { customers: Customer[] }) {
  const connections = customers.flatMap(customer => customer.connections.map(connection => ({ ...connection, workspace: customer.business_name })));
  const callsPlaced = customers.reduce((total, customer) => total + customer.calls, 0);
  const callMinutes = customers.reduce((total, customer) => total + customer.call_minutes, 0);
  const tokensUsed = customers.reduce((total, customer) => total + Object.entries(customer.model_usage || {}).reduce((sum, [model, usage]) => sum + number(usage.total_tokens) + (model === "gemini-3.8-live" ? requestsFrom(usage.requests, true).reduce((tokens, request) => tokens + number(request.thoughts_token_count), 0) : 0), 0) + Object.values(customer.message_usage || {}).reduce((sum, usage) => sum + number(usage.total_tokens), 0), 0);
  const totals = [
    ["Calls placed", callsPlaced.toLocaleString("en-US"), "Across all workspaces"],
    ["Minutes used", callMinutes.toLocaleString("en-US", { maximumFractionDigits: 1 }), "Across all workspaces"],
    ["Tokens used", tokensUsed.toLocaleString("en-US"), "Across all workspaces"],
  ] as const;
  const lkr = (amount: number) => new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  const callModels = new Map<string, UsageBucket>();
  const messageModels = new Map<string, UsageBucket>();
  for (const customer of customers) {
    for (const [model, usage] of Object.entries(customer.model_usage || {})) {
      const current = callModels.get(model) || { request_count: 0, total_tokens: 0, input_tokens: 0, output_tokens: 0, input_audio_tokens: 0, output_audio_tokens: 0, audio_seconds: 0, requests: [] };
      current.request_count += number(usage.request_count);
      current.total_tokens += number(usage.total_tokens);
      current.input_tokens += number(usage.input_tokens);
      current.output_tokens += number(usage.output_tokens);
      current.input_audio_tokens = number(current.input_audio_tokens) + number(usage.input_audio_tokens);
      current.output_audio_tokens = number(current.output_audio_tokens) + number(usage.output_audio_tokens);
      current.audio_seconds = number(current.audio_seconds) + number(usage.audio_seconds);
      current.requests?.push(...(usage.requests || []));
      callModels.set(model, current);
    }
    for (const [model, usage] of Object.entries(customer.message_usage || {})) {
      const current = messageModels.get(model) || { request_count: 0, total_tokens: 0, input_tokens: 0, output_tokens: 0, requests: [] };
      current.request_count += number(usage.request_count);
      current.total_tokens += number(usage.total_tokens);
      current.input_tokens += number(usage.input_tokens);
      current.output_tokens += number(usage.output_tokens);
      current.requests?.push(usage.requests);
      messageModels.set(model, current);
    }
  }
  const callCosts = [...callModels].map(([model, usage]) => ({ model, usage, stats: usageBreakdown(model, usage) }));
  const messageCosts = [...messageModels].map(([model, usage]) => ({ model, usage, stats: usageBreakdown(model, usage) }));
  const callTotal = callCosts.reduce((sum, row) => sum + (row.model === "gemini-3.8-live" ? 0 : row.stats.cost || 0), 0);
  const messageTotal = messageCosts.reduce((sum, row) => sum + (row.stats.cost || 0), 0);
  const messageCount = messageCosts.reduce((sum, row) => sum + row.stats.requests, 0);
  const modelLabel = (model: string) => ({ "gemini-3.8-live": "Gemini 3.8 Live", "gemini-3.8-flash-lite-tts": "Gemini 3.8 Flash-Lite TTS", "gemini-3.8-flash-tts": "Gemini 3.8 Flash TTS", "gemini-3.8-flash": "Gemini 3.8 Flash" }[model] || model);
  const tokenRows = (model: string, stats: ReturnType<typeof usageBreakdown>) => {
    if (!stats.rates) return [];
    const rows = model === "gemini-3.8-live" ? [
      ["Text input", stats.inputText, stats.paid.inputText, stats.rates.inputText || 0],
      ["Audio input", stats.inputAudio, stats.paid.inputAudio, stats.rates.inputAudio || 0],
      ["Image/video input", stats.inputOther, stats.paid.inputOther, stats.rates.inputOther || 0],
      ["Tool-use prompt", stats.toolPrompt, stats.paid.toolPrompt, stats.rates.inputText || 0],
      ["Text output, including thinking", stats.outputText, stats.paid.outputText, stats.rates.outputText || 0],
      ["Audio output", stats.outputAudio, stats.paid.outputAudio, stats.rates.outputAudio || 0],
    ] as const : model === "gemini-3.8-flash-lite-tts" || model === "gemini-3.8-flash-tts" ? [
      ["Text input", stats.inputText, stats.paid.inputText, stats.rates.inputText || 0],
      ["Tool-use prompt", stats.toolPrompt, stats.paid.toolPrompt, stats.rates.inputText || 0],
      ["Audio output", stats.outputAudio, stats.paid.outputAudio, stats.rates.outputAudio || 0],
    ] as const : [
      ["Text input", stats.inputText, stats.paid.inputText, stats.rates.inputText || 0],
      ["Tool-use prompt", stats.toolPrompt, stats.paid.toolPrompt, stats.rates.inputText || 0],
      ["Text output, including thinking", stats.outputText, stats.paid.outputText, stats.rates.outputText || 0],
    ] as const;
    return rows.map(([label, tokens, billableTokens, rate]) => ({ label, tokens, billableTokens, rateLkr: rate * 333, cost: billableTokens * rate * 333 / 1_000_000 }));
  };

  return <div className="admin-overview">
    <div className="admin-totals">{totals.map(([label, count, detail]) => <Card className="panel admin-stat" key={label}><span>{label}</span><strong>{count}</strong><small>{detail}</small></Card>)}</div>
    <Card component="section" className="panel admin-section admin-pricing">
      <div className="panel-heading"><div><h2>Gemini usage cost breakdown</h2><p>Gemini response token counts × published rates · all tracked activity</p></div></div>
      <div className="admin-row">
        <div className="admin-row-main"><strong>Phone calls · average cost per minute</strong><small>{lkr(callTotal)} estimated across {callMinutes.toLocaleString("en-US", { maximumFractionDigits: 2 })} recorded call minutes</small></div>
        <strong className="admin-price">{callMinutes ? `${lkr(callTotal / callMinutes)} / min` : "No call usage"}</strong>
      </div>
      {callCosts.map(({ model, usage, stats }) => <details className="admin-usage-breakdown" key={`call-${model}`}>
        <summary><span><strong>{modelLabel(model)}</strong><small>{stats.requests.toLocaleString("en-US")} Gemini requests · {stats.total.toLocaleString("en-US")} tokens</small></span><strong>{stats.cost === null ? "Rate unavailable" : model === "gemini-3.8-live" ? `Rs 0.00 billed · ${lkr(stats.cost)} paid-rate equivalent` : lkr(stats.cost)}</strong></summary>
        {stats.rates ? <div className="admin-usage-table-wrap"><table className="admin-usage-table"><thead><tr><th>Token type</th><th>Gemini tokens</th><th>Billable tokens</th><th>Rate / 1M</th><th>Estimated cost</th></tr></thead><tbody>{tokenRows(model, stats).map(row => <tr key={row.label}><td>{row.label}</td><td>{row.tokens.toLocaleString("en-US")}</td><td>{row.billableTokens.toLocaleString("en-US")}</td><td>{lkr(row.rateLkr)}</td><td>{lkr(row.cost)}</td></tr>)}</tbody></table><small>Gemini reported {usage.request_count.toLocaleString("en-US")} requests; {stats.freeRequests} marked free. {stats.assumedPaidRequests} requests without a free-tier marker use the Standard paid rate. Estimate: billable tokens × rate, converted at Rs 333 per USD.</small></div> : <p className="admin-empty">No published rate mapping is configured for this model.</p>}
      </details>)}
      <div className="admin-row">
        <div className="admin-row-main"><strong>WhatsApp replies · average cost per message</strong><small>{messageCount ? `${lkr(messageTotal)} estimated across ${messageCount.toLocaleString("en-US")} Gemini replies` : "Gemini token usage will appear after the first reply recorded by this version."}</small></div>
        <strong className="admin-price">{messageCount ? `${lkr(messageTotal / messageCount)} / message` : "Awaiting usage"}</strong>
      </div>
      {messageCosts.map(({ model, usage, stats }) => <details className="admin-usage-breakdown" key={`message-${model}`}>
        <summary><span><strong>{modelLabel(model)}</strong><small>{stats.requests.toLocaleString("en-US")} Gemini replies · {stats.total.toLocaleString("en-US")} tokens</small></span><strong>{stats.cost === null ? "Rate unavailable" : lkr(stats.cost)}</strong></summary>
        {stats.rates ? <div className="admin-usage-table-wrap"><table className="admin-usage-table"><thead><tr><th>Token type</th><th>Gemini tokens</th><th>Billable tokens</th><th>Rate / 1M</th><th>Estimated cost</th></tr></thead><tbody>{tokenRows(model, stats).map(row => <tr key={row.label}><td>{row.label}</td><td>{row.tokens.toLocaleString("en-US")}</td><td>{row.billableTokens.toLocaleString("en-US")}</td><td>{lkr(row.rateLkr)}</td><td>{lkr(row.cost)}</td></tr>)}</tbody></table><small>Gemini reported {usage.request_count.toLocaleString("en-US")} requests; {stats.freeRequests} marked free. {stats.assumedPaidRequests} requests without a free-tier marker use the Standard paid rate. Estimate: billable tokens × rate, converted at Rs 333 per USD.</small></div> : <p className="admin-empty">No published rate mapping is configured for this model.</p>}
      </details>)}
      <small className="admin-pricing-source">Counts come from Gemini response metadata, including modality, tool-use and thinking tokens where returned. Requests marked free by Gemini are costed at Rs 0; requests without a tier marker use the Standard paid rate. Gemini Live is included at Rs 0 in the call average because AI Studio showed no charge in its Nov 25 check; its paid-rate equivalent remains available in the breakdown. Historical WhatsApp replies have no saved usage metadata. This covers portal runtime records, not manual AI Studio calls or startup warmups without a linked call. Conversion uses Rs 333 per USD (Nov 26). <a href="https://ai.google.dev/gemini-api/docs/pricing" target="_blank" rel="noreferrer">Google Gemini pricing</a>.</small>
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
