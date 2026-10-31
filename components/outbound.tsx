"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDownToLine, ArrowRight, FileSpreadsheet, Loader2, Phone, Plus, RefreshCw, Upload, X } from "lucide-react";
import { parse } from "csv-parse/browser/esm/sync";

type Row = { id: string; phone: string; result: Record<string, string | boolean> | null; state: string | null; call_status: string | null; call_id: string | null; error: string | null; transcript: string | null };
type Batch = { id: string; name: string };
type SavedList = { id: string; name: string; rows: number; created_at: string };
type Preview = { headers: string[]; rows: string[][] };
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

export function Outbound() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
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
  const remaining = rows.filter(row => !row.state).length;
  const missingResults = rows.filter(row => row.state === "completed" && !row.result).length;
  const watching = !!batchId && (busy === "call-all" || missingResults > 0 || rows.some(row => row.id === busy || activeStates.includes(row.state || "")));

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
        for (const row of result.rows.filter((row: Row) => row.state === "completed" && !row.result)) {
          await request(`?id=${batchId}&action=result`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ row_id: row.id }), signal: controller.signal });
        }
        const latest = result.rows.some((row: Row) => row.state === "completed" && !row.result) ? await request(`?id=${batchId}`, { signal: controller.signal }) : result;
        if (!controller.signal.aborted) { setRows(latest.rows); setLiveError(false); }
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
    setFile(next);
    setPreview(null);
    setSelectedColumns([]);
    try {
      const records = parse(await next.text(), { bom: true, skip_empty_lines: true }) as string[][];
      setPreview({ headers: records[0] || [], rows: records.slice(1, 4) });
    } catch {
      setPreview({ headers: [], rows: [] });
      setError("Could not read this CSV. Check its format and try again.");
    }
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
      form.set("file", file);
      selectedColumns.forEach(column => form.append("validate_column", column));
      const result = await request("", { method: "POST", body: form });
      setBatches(await request());
      await loadList(result.id);
      setShowForm(false); setFile(null); setPreview(null); setSelectedColumns([]);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(""); }
  }

  async function run(rowId?: string) {
    if (!batch || busy) return;
    const selected = rowId ? rows.filter(row => row.id === rowId) : rows.filter(row => !row.state);
    setBusy(rowId || "call-all");
    setProgress({ done: 0, total: selected.length }); setError("");
    try {
      for (const [index, row] of selected.entries()) {
        await request(`?id=${batch.id}&action=call`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ row_id: row.id }) });
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
      <div className="outbound-card-heading"><div className="outbound-symbol"><Phone size={21} /></div><div><h2>Upload a call list</h2><p>Choose a CSV and we’ll handle the call setup.</p></div>{batch && <button className="icon-button" aria-label="Close new list" disabled={!!busy} onClick={() => setShowForm(false)}><X size={18} /></button>}</div>
      <form onSubmit={create}>
        <label className={`outbound-upload ${dragging ? "dragging" : ""} ${file ? "has-file" : ""}`} onDragOver={e => { e.preventDefault(); if (!busy) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); if (!busy) void selectFile(e.dataTransfer.files[0]); }}>
          <input className="sr-only" type="file" accept=".csv,text/csv" disabled={!!busy} aria-label="Upload contacts CSV" onChange={e => { void selectFile(e.target.files?.[0]); e.target.value = ""; }} />
          <span className="outbound-file-icon">{file ? <FileSpreadsheet size={25} /> : <Upload size={25} />}</span>
          <strong>{file ? file.name : "Upload your contacts"}</strong>
          <span>{file ? "CSV selected · Click to replace" : "Choose a CSV file or drop it here"}</span>
          {!file && <small>CSV up to 4 MB</small>}
        </label>
        {file && preview && <>
          <div className="outbound-preview"><strong>CSV preview <small>First {preview.rows.length} rows</small></strong>{preview.headers.length ? <div><table><thead><tr>{preview.headers.map(header => <th key={header}>{header}</th>)}</tr></thead><tbody>{preview.rows.map((row, index) => <tr key={index}>{preview.headers.map((_, column) => <td key={column} title={row[column] || ""}>{row[column]}</td>)}</tr>)}</tbody></table></div> : <small>Preview unavailable for this CSV.</small>}</div>
          {preview.headers.length > 0 && <fieldset className="outbound-validation-columns"><legend>Select columns to validate</legend><div>{preview.headers.map(column => <label key={column}><span><input type="checkbox" checked={selectedColumns.includes(column)} onChange={event => setSelectedColumns(current => event.target.checked ? [...current, column] : current.filter(value => value !== column))} />{column}</span></label>)}</div></fieldset>}
        </>}
        <a className="button" href="/outbound-template.csv" download><ArrowDownToLine size={16} />Download CSV template</a>
        {file && <>
          <button className="button primary" disabled={!selectedColumns.length || !!busy}>{busy === "create" ? <><Loader2 className="outbound-spin" size={16} /> Preparing list…</> : <>Create call list <ArrowRight size={16} /></>}</button>
        </>}
      </form>
    </section> : <section className="outbound-card outbound-workspace">
      <header className="outbound-batch-heading"><div className="outbound-symbol"><FileSpreadsheet size={22} /></div><div><h2>{batch.name.replace(/\.csv$/i, "")}</h2><p>{rows.length} {rows.length === 1 ? "contact" : "contacts"}</p></div><button className="icon-button" aria-label="Refresh call status" disabled={!!busy} onClick={() => void refresh()}><RefreshCw size={17} className={busy === "refresh" ? "outbound-spin" : ""} /></button></header>
      <div className="outbound-actions"><button className="button primary" disabled={!!busy || !remaining} onClick={() => void run()}>{busy === "call-all" ? <><Loader2 className="outbound-spin" size={16} /> Starting {progress.done} of {progress.total}</> : <><Phone size={16} />{remaining ? `Call remaining (${remaining})` : "All contacts attempted"}</>}</button><a className="button" href={`/api/outbound?id=${batch.id}&format=csv`}><ArrowDownToLine size={16} />Download CSV</a>{watching && <span className="outbound-live-indicator" role="status"><i />Live updates</span>}</div>
      {busy === "call-all" && <p className="outbound-inline-note" role="status">Keep this page open while calls are being started.</p>}
      {liveError && <p className="outbound-inline-note" role="status">Live updates interrupted. Reconnecting…</p>}
      <div className="outbound-table"><table><thead><tr><th scope="col">Phone number</th><th scope="col">Call</th><th scope="col">Status</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td className="outbound-phone">+{row.phone}</td><td>{!row.state || retryStates.includes(row.state) ? <button className="outbound-call-button" disabled={!!busy} onClick={() => void run(row.id)}>{busy === row.id ? <Loader2 className="outbound-spin" size={14} /> : <Phone size={14} />}{busy === row.id ? "Starting" : row.state ? "Retry" : "Call"}</button> : <span className="outbound-dash">—</span>}</td><td><span className={`outbound-status ${row.state || "idle"}`}><i />{callProgress(row)}</span>{row.error && <small className="outbound-row-error">{row.error}</small>}{row.call_id && <details className="outbound-transcript"><summary>View transcript</summary><pre>{row.transcript || "Waiting for conversation…"}</pre></details>}</td></tr>)}</tbody></table></div>
      <footer className="outbound-table-footer">Progress is saved automatically.</footer>
    </section>}
  </div>;
}
