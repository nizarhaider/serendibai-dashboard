"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDownToLine, ArrowRight, Check, ChevronDown, FileSpreadsheet, Loader2, Phone, Plus, RefreshCw, Upload, X } from "lucide-react";
import { parse } from "csv-parse/browser/esm/sync";
import type { PortalData } from "@/lib/types";

type Row = { id: string; phone: string; result: Record<string, string> | null; state: string | null; call_status: string | null; call_id: string | null; error: string | null; transcript: string | null };
type Batch = { id: string; name: string; instructions: string; columns: string[]; agent_id: string };
type SavedList = { id: string; name: string; rows: number; created_at: string };
const activeStates = ["pending", "preparing", "permission", "calling"];
const retryStates = ["failed", "declined", "expired"];
const date = (value: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Colombo" }).format(new Date(value));

async function request(path = "", init?: RequestInit) {
  const response = await fetch(`/api/outbound${path}`, init);
  if (response.status === 401) throw Error("Your session has expired. Sign in again to continue.");
  const result = await response.json();
  if (!response.ok) throw Error(result.error || "Something went wrong. Please try again.");
  return result;
}

function callProgress(row: Row) {
  if (row.state === "permission") return "Awaiting permission";
  if (row.state === "pending" || row.state === "preparing") return "Placing call";
  if (row.state === "calling") return row.call_status === "active" ? "In conversation" : "Ringing";
  if (row.state === "completed") return "Called";
  if (row.state === "failed") return "Call failed";
  if (row.state === "declined") return "Permission declined";
  if (row.state === "expired") return "Timed out";
  return "Not called";
}

export function Outbound({ data }: { data: PortalData }) {
  const agents = data.agents.filter(agent => agent.status !== "archived");
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [contactCount, setContactCount] = useState(0);
  const [phoneColumn, setPhoneColumn] = useState("");
  const [instructions, setInstructions] = useState("");
  const [agentId, setAgentId] = useState(agents[0]?.id || "");
  const [batches, setBatches] = useState<SavedList[]>([]);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState("");
  const [liveError, setLiveError] = useState(false);
  const [dragging, setDragging] = useState(false);
  const selection = useRef(0);
  const batchId = batch?.id;
  const watching = !!batchId && (busy === "call-all" || rows.some(row => row.id === busy || activeStates.includes(row.state || "")));
  const remaining = rows.filter(row => !row.state).length;
  const missingResults = rows.filter(row => row.state === "completed" && !row.result).length;

  const loadList = useCallback(async (id: string) => {
    const version = ++selection.current;
    const result = await request(`?id=${id}`);
    if (version !== selection.current) return;
    setBatch(result.batch);
    setRows(result.rows);
    window.history.replaceState(null, "", `/outbound?list=${id}`);
  }, []);

  useEffect(() => {
    let mounted = true;
    request().then(async (lists: SavedList[]) => {
      if (!mounted) return;
      setBatches(lists);
      const requested = new URLSearchParams(window.location.search).get("list");
      const selected = lists.find(item => item.id === requested)?.id || lists[0]?.id;
      if (selected) await loadList(selected);
      else window.history.replaceState(null, "", "/outbound");
    }).catch(e => { if (mounted) setError(e.message); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [loadList]);

  useEffect(() => {
    if (!batchId || !watching) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const result = await request(`?id=${batchId}`, { signal: controller.signal });
        if (!controller.signal.aborted) { setRows(result.rows); setLiveError(false); }
      } catch {
        if (!controller.signal.aborted) setLiveError(true);
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(poll, 4000);
      }
    }
    timer = setTimeout(poll, 4000);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [batchId, watching]);

  async function selectFile(next?: File) {
    if (!next) return;
    setError("");
    try {
      if (!next.name.toLowerCase().endsWith(".csv") || next.size > 1000000) throw Error("Choose a CSV file under 1 MB.");
      const records = parse(await next.text(), { bom: true, skip_empty_lines: true }) as string[][];
      const names = records[0] || [];
      if (records.length < 2 || records.length > 501) throw Error("Your CSV needs a header row and between 1 and 500 contacts.");
      if (!names.length || names.length > 50 || names.some(name => !name.trim()) || new Set(names).size !== names.length) throw Error("Give each column a unique, non-empty heading. Use up to 50 columns.");
      setHeaders(names);
      setPhoneColumn(names.find(name => /phone|mobile|whatsapp/i.test(name)) || names[0]);
      setContactCount(records.length - 1);
      setFile(next);
    } catch (e) { setError((e as Error).message); }
  }

  async function chooseList(id: string) {
    setLoading(true); setError("");
    try { await loadList(id); setShowForm(false); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!file || busy) return;
    setBusy("create"); setError("");
    try {
      const form = new FormData();
      form.set("file", file); form.set("phone_column", phoneColumn);
      form.set("instructions", instructions); form.set("agent_id", agentId);
      const result = await request("", { method: "POST", body: form });
      setBatches(await request());
      await loadList(result.id);
      setShowForm(false); setFile(null); setHeaders([]); setInstructions("");
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(""); }
  }

  async function run(action: "call" | "result", rowId?: string) {
    if (!batch || busy) return;
    const selected = rowId ? rows.filter(row => row.id === rowId) : rows.filter(row => action === "call" ? !row.state : row.state === "completed" && !row.result);
    setBusy(rowId || (action === "call" ? "call-all" : "results"));
    setProgress({ done: 0, total: selected.length }); setError("");
    try {
      for (const [index, row] of selected.entries()) {
        await request(`?id=${batch.id}&action=${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ row_id: row.id }) });
        setProgress({ done: index + 1, total: selected.length });
        await loadList(batch.id);
      }
    } catch (e) {
      setError((e as Error).message);
      await loadList(batch.id).catch(() => {});
    } finally { setBusy(""); }
  }

  async function refresh() {
    if (!batch || busy) return;
    setBusy("refresh"); setError("");
    try { await loadList(batch.id); setLiveError(false); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(""); }
  }

  return <div className="outbound-page">
    {error && <div className="outbound-notice error" role="alert"><span>{error}</span><button aria-label="Dismiss error" onClick={() => setError("")}><X size={17} /></button></div>}
    {batches.length > 0 && <div className="outbound-toolbar">
      <label className="outbound-list-picker"><span>Saved call lists</span><select value={batch?.id || ""} disabled={!!busy || loading} onChange={e => void chooseList(e.target.value)}><option value="" disabled>Select a list</option>{batches.map(item => <option key={item.id} value={item.id}>{item.name} · {date(item.created_at)}</option>)}</select></label>
      <button className="button" disabled={!!busy || loading} onClick={() => { setShowForm(true); setError(""); }}><Plus size={16} /> New list</button>
    </div>}
    {loading ? <div className="outbound-loading" role="status"><Loader2 className="outbound-spin" size={22} /> Loading your call lists…</div> : showForm || !batch ? <section className="outbound-card outbound-setup">
      <div className="outbound-card-heading"><div className="outbound-symbol"><Phone size={21} /></div><div><h2>Who would you like to call?</h2><p>Add your contacts. Tell your agent what to check.</p></div>{batch && <button className="icon-button" aria-label="Close new list" disabled={!!busy} onClick={() => setShowForm(false)}><X size={18} /></button>}</div>
      <ol className="outbound-steps" aria-label="Call setup"><li className={!file ? "current" : "done"}><span>{file ? <Check size={13} /> : "1"}</span>Contacts</li><li className={file ? "current" : ""}><span>2</span>Instructions</li><li><span>3</span>Start calls</li></ol>
      <form onSubmit={create}>
        <label className={`outbound-upload ${dragging ? "dragging" : ""} ${file ? "has-file" : ""}`} onDragOver={e => { e.preventDefault(); if (!busy) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); if (!busy) void selectFile(e.dataTransfer.files[0]); }}>
          <input className="sr-only" type="file" accept=".csv,text/csv" disabled={!!busy} aria-label="Upload contacts CSV" onChange={e => { void selectFile(e.target.files?.[0]); e.target.value = ""; }} />
          <span className="outbound-file-icon">{file ? <FileSpreadsheet size={25} /> : <Upload size={25} />}</span>
          <strong>{file ? file.name : "Upload your contacts"}</strong>
          <span>{file ? `${contactCount} ${contactCount === 1 ? "contact" : "contacts"} · Click to replace` : "Choose a CSV file or drop it here"}</span>
          {!file && <small>Up to 500 contacts · 1 MB</small>}
        </label>
        {file && <>
          <div className="outbound-fields"><label>Phone number column<select disabled={!!busy} value={phoneColumn} onChange={e => setPhoneColumn(e.target.value)}>{headers.map(header => <option key={header}>{header}</option>)}</select></label><label>Calling agent<select disabled={!!busy} value={agentId} onChange={e => setAgentId(e.target.value)}>{agents.length ? agents.map(agent => <option key={agent.id} value={agent.id}>{agent.name} · {agent.company_name}</option>) : <option value="">No agents available</option>}</select></label></div>
          <label>What should the agent check?<textarea disabled={!!busy} value={instructions} onChange={e => setInstructions(e.target.value)} rows={4} minLength={20} maxLength={6000} placeholder="Confirm each candidate’s current role and years of experience. Assess spoken English with two short questions." required /><small>Be specific about what to verify and how to assess it. We’ll create the result columns for you.</small></label>
          {!agents.length && <p className="outbound-notice">Add a voice agent in <Link href="/agents">Agent Management</Link> to continue.</p>}
          <div className="outbound-form-footer"><span>You can review the list before calling.</span><button className="button primary" disabled={!agentId || instructions.trim().length < 20 || !!busy}>{busy === "create" ? <><Loader2 className="outbound-spin" size={16} /> Preparing list…</> : <>Prepare call list <ArrowRight size={16} /></>}</button></div>
        </>}
      </form>
    </section> : <section className="outbound-card outbound-workspace">
      <header className="outbound-batch-heading"><div className="outbound-symbol"><FileSpreadsheet size={22} /></div><div><h2>{batch.name.replace(/\.csv$/i, "")}</h2><p>{rows.length} {rows.length === 1 ? "contact" : "contacts"} <span>·</span> {data.agents.find(agent => agent.id === batch.agent_id)?.name || "Voice agent"}</p></div><button className="icon-button" aria-label="Refresh call status" disabled={!!busy} onClick={() => void refresh()}><RefreshCw size={17} className={busy === "refresh" ? "outbound-spin" : ""} /></button></header>
      <details className="outbound-instructions"><summary>Call instructions <ChevronDown size={15} /></summary><p>{batch.instructions}</p><div className="outbound-columns">{batch.columns.map(column => <span key={column}>{column.replaceAll("_", " ")}</span>)}</div></details>
      <div className="outbound-actions"><button className="button primary" disabled={!!busy || !remaining} onClick={() => void run("call")}>{busy === "call-all" ? <><Loader2 className="outbound-spin" size={16} /> Starting {progress.done} of {progress.total}</> : <><Phone size={16} />{remaining ? `Call remaining (${remaining})` : "All contacts attempted"}</>}</button><a className="button" href={`/api/outbound?id=${batch.id}&format=csv`}><ArrowDownToLine size={16} />Download CSV</a>{watching && <span className="outbound-live-indicator" role="status"><i />Live updates</span>}</div>
      {busy === "call-all" && <p className="outbound-inline-note" role="status">Keep this page open while calls are being started.</p>}
      {liveError && <p className="outbound-inline-note" role="status">Live updates interrupted. Reconnecting…</p>}
      {missingResults > 0 && <div className="outbound-results"><span>{missingResults} completed {missingResults === 1 ? "call is" : "calls are"} ready to add to your CSV.</span><button disabled={!!busy} onClick={() => void run("result")}>{busy === "results" ? <><Loader2 className="outbound-spin" size={14} />Updating {progress.done} of {progress.total}</> : <>Update results <ArrowRight size={14} /></>}</button></div>}
      <div className="outbound-table"><table><thead><tr><th scope="col">Phone number</th><th scope="col">Call</th><th scope="col">Status</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td className="outbound-phone">+{row.phone}</td><td>{!row.state || retryStates.includes(row.state) ? <button className="outbound-call-button" disabled={!!busy} onClick={() => void run("call", row.id)}>{busy === row.id ? <Loader2 className="outbound-spin" size={14} /> : <Phone size={14} />}{busy === row.id ? "Starting" : row.state ? "Retry" : "Call"}</button> : <span className="outbound-dash">—</span>}</td><td><span className={`outbound-status ${row.state || "idle"}`}><i />{callProgress(row)}</span>{row.error && <small className="outbound-row-error">{row.error}</small>}{row.call_id && <details className="outbound-transcript"><summary>View transcript</summary><pre>{row.transcript || "Waiting for conversation…"}</pre></details>}</td></tr>)}</tbody></table></div>
      <footer className="outbound-table-footer">Progress is saved automatically.</footer>
    </section>}
  </div>;
}
