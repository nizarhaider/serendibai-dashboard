"use client";
import { useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BookOpen,
  Check,
  FileSpreadsheet,
  FileText,
  Loader2,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { PortalData, Product } from "@/lib/types";
import { api, Modal, number } from "./portal";

const blank = (): Product => ({
  name: "",
  sku: "",
  description: "",
  category: "Product",
  price: null,
  currency: "LKR",
  stock: null,
  status: "active",
});
export function Resources({
  section,
  data,
  refresh,
  notify,
}: {
  section: string;
  data: PortalData;
  refresh: () => Promise<void>;
  notify: (s: string) => void;
}) {
  const [query, setQuery] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [preview, setPreview] = useState<{ name: string; content: string } | null>(
      null,
    ),
    [remove, setRemove] = useState<{
      kind: string;
      id: string;
      name: string;
    } | null>(null),
    [editing, setEditing] = useState<Product[] | null>(null),
    [imported, setImported] = useState<Product[] | null>(null),
    [drag, setDrag] = useState(false);
  const picker = useRef<HTMLInputElement>(null),
    knowledge = section === "knowledge";
  async function upload(file?: File) {
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      if (knowledge) {
        const form = new FormData();
        form.set("file", file);
        await api("documents", "POST", form);
        await refresh();
        notify(`${file.name} is ready for your agents.`);
      } else {
        if (file.size > 5000000) throw Error("Maximum workbook size is 5 MB.");
        const ExcelJS = await import("exceljs");
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(await file.arrayBuffer());
        const sheet = wb.worksheets[0];
        if (!sheet) throw Error("No worksheet found.");
        if (sheet.rowCount > 501)
          throw Error("Import up to 500 rows at a time.");
        const headers: string[] = [];
        sheet
          .getRow(1)
          .eachCell(
            (c, i) =>
              (headers[i] = c.text.toLowerCase().trim().replaceAll(" ", "_")),
          );
        if (!headers.includes("name"))
          throw Error(
            "The first row must contain a “name” column. Download the template for the supported format.",
          );
        const rows: Product[] = [];
        sheet.eachRow((row, i) => {
          if (i === 1) return;
          const value: Record<string, string> = {};
          row.eachCell((c, j) => {
            if (c.type === ExcelJS.ValueType.Formula)
              throw Error(
                `Row ${i} contains a formula. Paste values before importing.`,
              );
            value[headers[j]] = c.text.trim();
          });
          if (!value.name) return;
          rows.push({
            ...blank(),
            name: value.name,
            sku: value.sku || "",
            description: value.description || "",
            category: value.category || "Product",
            price: value.price ? Number(value.price) : null,
            currency: (value.currency || "LKR").toUpperCase(),
            stock: value.stock ? Number(value.stock) : null,
            status: value.status || "active",
          });
        });
        if (!rows.length) throw Error("The workbook has no named products.");
        if (
          rows.some(
            (r) =>
              (r.price != null && (!Number.isFinite(r.price) || r.price < 0)) ||
              (r.stock != null && (!Number.isInteger(r.stock) || r.stock < 0)),
          )
        )
          throw Error("Prices and stock must be valid, non-negative numbers.");
        setImported(rows);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (picker.current) picker.current.value = "";
    }
  }
  async function template() {
    const ExcelJS = await import("exceljs");
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet("Products");
    sheet.addRow([
      "name",
      "sku",
      "description",
      "category",
      "price",
      "currency",
      "stock",
      "status",
    ]);
    sheet.addRow([
      "Example service",
      "SVC-001",
      "Replace this row with your product or service.",
      "Service",
      2500,
      "LKR",
      null,
      "draft",
    ]);
    sheet.getRow(1).font = { bold: true };
    sheet.columns.forEach((c) => (c.width = 24));
    const url = URL.createObjectURL(
      new Blob([await wb.xlsx.writeBuffer()], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "serendibai-catalogue-template.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }
  async function save(rows: Product[], isImport = false) {
    setBusy(true);
    setError("");
    try {
      await api("products", "POST", { rows });
      setEditing(null);
      setImported(null);
      await refresh();
      notify(
        `${rows.length} catalogue items ${isImport ? "imported" : "saved"}. Your agents can search them immediately.`,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const products = (editing || data.products).filter(
    (p) =>
      editing ||
      `${p.name} ${p.sku} ${p.category}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <input
        ref={picker}
        type="file"
        className="sr-only"
        aria-label={knowledge ? "Upload document" : "Import Excel workbook"}
        accept={knowledge ? ".pdf,.docx,.txt,.md,.csv" : ".xlsx"}
        onChange={(e) => upload(e.target.files?.[0])}
      />
      {error && (
        <div className="toast error" role="alert">
          {error}
          <button aria-label="Dismiss error" onClick={() => setError("")}>
            <X size={16} />
          </button>
        </div>
      )}
      <div className="resource-summary">
        <div className="resource-stat">
          <span className="icon-tile lavender">
            {knowledge ? <BookOpen size={22} /> : <BoxIcon />}
          </span>
          <div>
            <strong>
              {knowledge ? data.documents.length : data.products.length}
            </strong>
            <span>
              {knowledge ? "knowledge sources" : "products & services"}
            </span>
          </div>
        </div>
        <div className="resource-stat">
          <span className="icon-tile mint">
            <Check size={22} />
          </span>
          <div>
            <strong>
              {knowledge
                ? number(data.documents.reduce((n, d) => n + d.characters, 0))
                : data.products.filter((p) => p.status === "active").length}
            </strong>
            <span>
              {knowledge ? "searchable characters" : "active catalogue items"}
            </span>
          </div>
        </div>
        <div className="resource-summary-note">
          <span className="status green">
            <i /> Connected knowledge
          </span>
          <p>
            Available to your agents when the corresponding search tool is
            enabled.
          </p>
        </div>
      </div>
      {knowledge ? (
        <section
          className={`upload-zone ${drag ? "dragging" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            void upload(e.dataTransfer.files[0]);
          }}
        >
          <div className="upload-icon">
            {busy ? (
              <Loader2 className="spin" size={26} />
            ) : (
              <ArrowUpFromLine size={26} />
            )}
          </div>
          <h2>
            {busy
              ? "Reading and indexing your document…"
              : "Good answers begin with good knowledge."}
          </h2>
          <p>
            Drop a document here, or browse your files to teach your agents
            something new.
          </p>
          <button
            className="button primary"
            disabled={busy}
            onClick={() => picker.current?.click()}
          >
            <Plus size={16} /> Upload document
          </button>
          <small>PDF, Word, TXT, Markdown or CSV · Up to 5 MB per file</small>
        </section>
      ) : (
        <section className="catalogue-banner">
          <span className="excel-icon">
            <FileSpreadsheet size={32} />
          </span>
          <div>
            <h2>Your catalogue, without the busywork.</h2>
            <p>
              Bring in an Excel workbook or build your table right here. Changes
              are available to your agents immediately.
            </p>
          </div>
          <button className="button" onClick={template}>
            <ArrowDownToLine size={16} /> Download template
          </button>
          <button
            className="button primary"
            disabled={busy}
            onClick={() => picker.current?.click()}
          >
            {busy ? (
              <Loader2 className="spin" size={16} />
            ) : (
              <ArrowUpFromLine size={16} />
            )}{" "}
            Import Excel
          </button>
        </section>
      )}
      <section className="panel resource-panel">
        <div className="panel-heading">
          <div>
            <h2>
              {knowledge ? "Your knowledge library" : "Products & services"}{" "}
              <span className="count">
                {knowledge ? data.documents.length : data.products.length}
              </span>
            </h2>
            <p>
              {knowledge
                ? "Stored securely in Neon. Searchable as soon as they’re uploaded."
                : "Edit a row, set availability and keep your agent in the know."}
            </p>
          </div>
          <div className="toolbar-actions">
            <div className="search-input">
              <Search size={16} />
              <input
                aria-label={knowledge ? "Search documents" : "Search products"}
                placeholder={
                  knowledge ? "Find a document…" : "Search catalogue…"
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {!knowledge && (
              <>
                {editing ? (
                  <>
                    <button className="button" onClick={() => setEditing(null)}>
                      Cancel
                    </button>
                    <button
                      className="button primary"
                      onClick={() => save(editing)}
                      disabled={busy}
                    >
                      <Save size={15} />
                      {busy ? "Saving…" : "Save changes"}
                    </button>
                  </>
                ) : (
                  <button
                    className="button"
                    onClick={() =>
                      setEditing(data.products.map((p) => ({ ...p })))
                    }
                  >
                    Edit table
                  </button>
                )}
                <button
                  className="button"
                  onClick={() => {
                    setQuery("");
                    setEditing([
                      ...(editing || data.products).map((p) => ({ ...p })),
                      blank(),
                    ]);
                  }}
                >
                  <Plus size={15} /> Add row
                </button>
              </>
            )}
          </div>
        </div>
        {knowledge ? (
          <>
            <div className="document-list">
              {data.documents
                .filter((d) =>
                  d.name.toLowerCase().includes(query.toLowerCase()),
                )
                .map((d) => (
                  <div className="document-row" key={d.id}>
                    <span className="doc-icon">
                      <FileText size={23} />
                    </span>
                    <button
                      className="document-title"
                      onClick={async () => {
                        try {
                          setPreview(await api(`documents/${d.id}`));
                        } catch (e) {
                          setError((e as Error).message);
                        }
                      }}
                    >
                      <strong>{d.name}</strong>
                      <span>
                        {number(d.bytes / 1024)} KB · {number(d.characters)}{" "}
                        characters · Added{" "}
                        {new Date(d.created_at).toLocaleDateString("en-GB", {
                          timeZone: "Asia/Colombo",
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </button>
                    <span className="status green">
                      <i /> Searchable
                    </span>
                    <button
                      className="icon-button"
                      aria-label={`Delete ${d.name}`}
                      onClick={() =>
                        setRemove({ kind: "documents", id: d.id, name: d.name })
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
            </div>
            {!data.documents.length && (
              <div className="empty">
                <BookOpen size={29} />
                <h3>Your business knowledge belongs here.</h3>
                <p>
                  Add FAQs, policies, company information or service guides.
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="table-scroll catalogue-table">
            <table>
              <thead>
                <tr>
                  <th>NAME & DESCRIPTION</th>
                  <th>SKU</th>
                  <th>TYPE</th>
                  <th>PRICE</th>
                  <th>CURRENCY</th>
                  <th>STOCK</th>
                  <th>STATUS</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => (
                  <tr key={p.id || `new-${i}`}>
                    {editing ? (
                      <>
                        <td>
                          <input
                            aria-label={`Product name row ${i + 1}`}
                            value={p.name}
                            placeholder="Product or service name"
                            onChange={(e) => {
                              const rows = [...editing];
                              rows[i] = { ...p, name: e.target.value };
                              setEditing(rows);
                            }}
                          />
                          <input
                            aria-label={`Description row ${i + 1}`}
                            className="description-input"
                            value={p.description}
                            placeholder="Description for your agent"
                            onChange={(e) => {
                              const rows = [...editing];
                              rows[i] = { ...p, description: e.target.value };
                              setEditing(rows);
                            }}
                          />
                        </td>
                        {(
                          [
                            "sku",
                            "category",
                            "price",
                            "currency",
                            "stock",
                            "status",
                          ] as const
                        ).map((k) => (
                          <td key={k}>
                            {k === "status" ? (
                              <select
                                aria-label={`Status row ${i + 1}`}
                                value={p[k]}
                                onChange={(e) => {
                                  const rows = [...editing];
                                  rows[i] = { ...p, [k]: e.target.value };
                                  setEditing(rows);
                                }}
                              >
                                {["active", "draft", "archived"].map((s) => (
                                  <option key={s}>{s}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                aria-label={`${k} row ${i + 1}`}
                                type={
                                  k === "price" || k === "stock"
                                    ? "number"
                                    : "text"
                                }
                                min="0"
                                step={k === "price" ? "0.01" : "1"}
                                value={p[k] ?? ""}
                                placeholder={k === "stock" ? "Unlimited" : ""}
                                onChange={(e) => {
                                  const rows = [...editing];
                                  rows[i] = {
                                    ...p,
                                    [k]:
                                      k === "price" || k === "stock"
                                        ? e.target.value === ""
                                          ? null
                                          : Number(e.target.value)
                                        : e.target.value,
                                  };
                                  setEditing(rows);
                                }}
                              />
                            )}
                          </td>
                        ))}
                      </>
                    ) : (
                      <>
                        <td>
                          <strong>{p.name}</strong>
                          <small>{p.description || "No description"}</small>
                        </td>
                        <td className="mono">{p.sku || "—"}</td>
                        <td>
                          <span className="tag">{p.category}</span>
                        </td>
                        <td>{number(p.price)}</td>
                        <td>{p.currency}</td>
                        <td>
                          {p.stock == null ? "Unlimited" : number(p.stock)}
                        </td>
                        <td>
                          <span
                            className={`status ${p.status === "active" ? "green" : "neutral"}`}
                          >
                            <i />
                            {p.status}
                          </span>
                        </td>
                      </>
                    )}
                    <td>
                      <button
                        className="icon-button"
                        aria-label={`Delete ${p.name || "new row"}`}
                        onClick={() => {
                          if (!p.id)
                            setEditing(editing!.filter((_, j) => j !== i));
                          else
                            setRemove({
                              kind: "products",
                              id: p.id,
                              name: p.name,
                            });
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!products.length && (
              <div className="empty">
                <FileSpreadsheet size={30} />
                <h3>
                  {query
                    ? "No products match your search."
                    : "Make your catalogue conversational."}
                </h3>
                <p>
                  Add products, services, prices and availability. Your agent
                  can look them up in real time.
                </p>
                <button
                  className="button"
                  onClick={() => setEditing([blank()])}
                >
                  <Plus size={15} /> Add your first item
                </button>
              </div>
            )}
          </div>
        )}
        <div className="table-footer">
          {knowledge
            ? "Knowledge is shared across this workspace."
            : "Active items are available to agents. Draft and archived items are excluded."}
          <span>
            <Check size={13} /> Persisted in Neon
          </span>
        </div>
      </section>
      {preview && (
        <Modal title={preview.name} onClose={() => setPreview(null)} wide>
          <div className="modal-content">
            <p className="muted">
              This is the extracted text your agents can search.
            </p>
            <pre className="document-preview">{preview.content}</pre>
          </div>
        </Modal>
      )}
      {remove && (
        <Modal title="Remove from workspace?" onClose={() => setRemove(null)}>
          <div className="modal-content">
            <p>
              Delete <strong>{remove.name}</strong>? Agents will no longer be
              able to look it up. You can upload or add it again later.
            </p>
            <div className="modal-actions">
              <button className="button" onClick={() => setRemove(null)}>
                Cancel
              </button>
              <button
                className="button danger"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await api(`${remove.kind}/${remove.id}`, "DELETE");
                    setRemove(null);
                    setEditing(null);
                    await refresh();
                    notify("Item removed.");
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Delete item
              </button>
            </div>
          </div>
        </Modal>
      )}
      {imported && (
        <Modal
          title="Review your Excel import"
          onClose={() => setImported(null)}
          wide
        >
          <div className="modal-content">
            <div className="import-info">
              <FileSpreadsheet size={24} />
              <div>
                <strong>{imported.length} rows ready to import</strong>
                <p>
                  These will be added as new items. Existing catalogue entries
                  stay in place.
                </p>
              </div>
            </div>
            {error && <p className="error">{error}</p>}
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>NAME</th>
                    <th>CATEGORY</th>
                    <th>PRICE</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {imported.slice(0, 12).map((r, i) => (
                    <tr key={i}>
                      <td>{r.name}</td>
                      <td>{r.category}</td>
                      <td>
                        {r.currency} {number(r.price)}
                      </td>
                      <td>{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {imported.length > 12 && (
              <p className="muted">And {imported.length - 12} more rows…</p>
            )}
            <div className="modal-actions">
              <button className="button" onClick={() => setImported(null)}>
                Cancel
              </button>
              <button
                className="button primary"
                disabled={busy}
                onClick={() => save(imported, true)}
              >
                {busy ? "Importing…" : `Import ${imported.length} items`}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
function BoxIcon() {
  return <FileSpreadsheet size={22} />;
}
