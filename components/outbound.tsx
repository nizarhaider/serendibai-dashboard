"use client";

import { useEffect, useState } from "react";
import { parse } from "csv-parse/browser/esm/sync";
import type { PortalData } from "@/lib/types";

type Row = { id: string; phone: string; data: Record<string, string>; result: Record<string, string> | null; state: string | null; error: string | null; transcript: string | null };
type Batch = { id: string; name: string; instructions: string; columns: string[]; headers: string[]; agent_id: string };

export function Outbound({ data }: { data: PortalData }) {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [phoneColumn, setPhoneColumn] = useState("");
  const [instructions, setInstructions] = useState("");
  const [agentId, setAgentId] = useState(data.agents.find(a => a.status !== "archived")?.id || "");
  const [batches, setBatches] = useState<{ id: string; name: string; rows: number }[]>([]);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function load(id?: string) {
    const response = await fetch(`/api/outbound${id ? `?id=${id}` : ""}`);
    const result = await response.json();
    if (!response.ok) throw Error(result.error);
    if (id) { setBatch(result.batch); setRows(result.rows); }
    else setBatches(result);
  }
  useEffect(() => {
    fetch("/api/outbound")
      .then(response => response.json())
      .then(setBatches)
      .catch(e => setError(e.message));
  }, []);

  async function selectFile(next: File | undefined) {
    setFile(null);
    setHeaders([]);
    setError("");
    if (!next) return;
    try {
      if (next.size > 1000000) throw Error("CSV must be under 1 MB.");
      const records = parse(await next.text(), { columns: true, bom: true, skip_empty_lines: true, to: 2 }) as Record<string, string>[];
      const names = records.length ? Object.keys(records[0]) : [];
      if (!names.length) throw Error("CSV needs a header row and at least one contact.");
      setHeaders(names);
      setPhoneColumn(names.find(name => /phone|mobile|whatsapp/i.test(name)) || names[0]);
      setFile(next);
    } catch (e) { setError((e as Error).message); }
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return;
    setBusy("create"); setError("");
    try {
      const form = new FormData();
      form.set("file", file); form.set("phone_column", phoneColumn);
      form.set("instructions", instructions); form.set("agent_id", agentId);
      const response = await fetch("/api/outbound", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      await load(); await load(result.id);
      setFile(null); setHeaders([]); setInstructions("");
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(""); }
  }

  async function act(rowId: string, action: "call" | "result") {
    if (!batch) return;
    setBusy(rowId); setError("");
    try {
      await requestAction(batch.id, rowId, action);
      await load(batch.id);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(""); }
  }

  async function requestAction(batchId: string, rowId: string, action: "call" | "result") {
    const response = await fetch(`/api/outbound?id=${batchId}&action=${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ row_id: rowId }) });
    const result = await response.json();
    if (!response.ok) throw Error(result.error);
  }

  async function runBatch(action: "call" | "result") {
    if (!batch) return;
    setBusy("all"); setError("");
    try {
      const selected = rows.filter(row => action === "call" ? !row.state : row.state === "completed" && !row.result);
      for (const row of selected) await requestAction(batch.id, row.id, action);
      await load(batch.id);
    } catch (e) { setError((e as Error).message); await load(batch.id); }
    finally { setBusy(""); }
  }

  return <div className="outbound-page">
    {error && <p className="toast error" role="alert">{error}</p>}
    <section className="outbound-card">
      <h2>New call list</h2>
      <p>Upload a CSV, choose the phone column, and describe exactly what each call should verify.</p>
      <form onSubmit={create}>
        <label>CSV file<input type="file" accept=".csv,text/csv" onChange={e => void selectFile(e.target.files?.[0])} required /></label>
        {headers.length > 0 && <label>Phone number column<select value={phoneColumn} onChange={e => setPhoneColumn(e.target.value)}>{headers.map(header => <option key={header}>{header}</option>)}</select></label>}
        <label>Voice agent<select value={agentId} onChange={e => setAgentId(e.target.value)}>{data.agents.filter(agent => agent.status !== "archived").map(agent => <option key={agent.id} value={agent.id}>{agent.name} · {agent.company_name}</option>)}</select></label>
        {file && <label>Validation instructions<textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={5} maxLength={6000} placeholder="For example: Confirm the candidate's current role and years of experience. Ask two questions to assess spoken English. Mark details verified only when the candidate confirms them." required /></label>}
        <button className="button primary" disabled={!file || !agentId || instructions.trim().length < 20 || !!busy}>{busy === "create" ? "Preparing…" : "Prepare call list"}</button>
      </form>
    </section>
    {batches.length > 0 && <section className="outbound-card"><h2>Call lists</h2><div className="outbound-lists">{batches.map(item => <button key={item.id} onClick={() => void load(item.id).catch(e => setError(e.message))}>{item.name} · {item.rows} contacts</button>)}</div></section>}
    {batch && <section className="outbound-card">
      <div className="outbound-title"><div><h2>{batch.name}</h2><p>{batch.instructions}</p><small>Result columns: {batch.columns.join(", ")}</small></div><a className="button" href={`/api/outbound?id=${batch.id}&format=csv`}>Download CSV</a></div>
      <div className="outbound-actions"><button className="button primary" disabled={!!busy || !rows.some(row => !row.state)} onClick={() => void runBatch("call")}>{busy === "all" ? "Working…" : "Call remaining"}</button><button className="button" disabled={!!busy || !rows.some(row => row.state === "completed" && !row.result)} onClick={() => void runBatch("result")}>Update completed results</button></div>
      <div className="outbound-table"><table><thead><tr><th>Phone</th><th>Context</th><th>Call</th><th>Result</th><th></th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{row.phone}</td><td>{Object.entries(row.data).filter(([key]) => !/phone|mobile|whatsapp/i.test(key)).map(([key, value]) => `${key}: ${value}`).join(" · ")}</td><td>{row.state || "Not called"}{row.error && <small>{row.error}</small>}</td><td>{row.result ? batch.columns.map(column => `${column}: ${row.result?.[column] || "—"}`).join(" · ") : "—"}</td><td>{row.state === "completed" ? <button disabled={!!busy} onClick={() => void act(row.id, "result")}>{busy === row.id ? "Working…" : "Update result"}</button> : !row.state || ["failed", "declined", "expired"].includes(row.state) ? <button disabled={!!busy} onClick={() => void act(row.id, "call")}>{busy === row.id ? "Calling…" : "Call"}</button> : null}</td></tr>)}</tbody></table></div>
      <button className="button" onClick={() => void load(batch.id).catch(e => setError(e.message))}>Refresh status</button>
    </section>}
  </div>;
}
