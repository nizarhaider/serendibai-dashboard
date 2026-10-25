"use client";
import { useState } from "react";
import {
  ArrowDownToLine,
  ChevronLeft,
  ChevronRight,
  PhoneIncoming,
  Search,
} from "lucide-react";
import type { PortalData } from "@/lib/types";
import { Status } from "./portal";

export function CallHistory({ data }: { data: PortalData }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const calls = data.calls.filter((call) =>
    `${call.customer_phone} ${call.agent_name} ${call.transcript || ""}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(calls.length / 10) - 1),
  );
  function download() {
    const rows = [
      ["Phone", "Agent", "Date", "Status", "Duration seconds", "Transcript"],
      ...calls.map((call) => [
        call.customer_phone,
        call.agent_name,
        call.created_at,
        call.status,
        call.duration_seconds,
        call.transcript,
      ]),
    ];
    const csv = rows
      .map((row) =>
        row
          .map((value) => {
            const text = String(value ?? "");
            return `"${(/^[=+@\-\t\r]/.test(text) ? "'" + text : text).replaceAll('"', '""')}"`;
          })
          .join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "conversations.csv";
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <div className="list-toolbar">
        <div className="search-input">
          <Search size={16} />
          <input
            aria-label="Search recent calls"
            placeholder="Search number, agent or conversation…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
          />
        </div>
        <button className="button" disabled={!calls.length} onClick={download}>
          <ArrowDownToLine size={15} /> Export calls
        </button>
      </div>
      <div className="client-calls">
        {calls.slice(currentPage * 10, currentPage * 10 + 10).map((call) => (
          <article key={call.id}>
            <div className="client-call-heading">
              <strong>{call.customer_phone || "Unknown caller"}</strong>
              <Status value={call.status} />
              <time>
                {new Date(call.created_at).toLocaleString("en-GB", {
                  timeZone: "Asia/Colombo",
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </time>
            </div>
            <p className="muted">
              {call.agent_name || "Voice agent"}
              {call.duration_seconds == null
                ? ""
                : ` · ${Math.floor(call.duration_seconds / 60)}m ${Math.round(call.duration_seconds % 60)}s`}
            </p>
            <details>
              <summary>View conversation</summary>
              <div className="transcript">
                {call.transcript || "No transcript is available for this call."}
              </div>
            </details>
          </article>
        ))}
        {!calls.length && (
          <div className="records-empty">
            <PhoneIncoming size={28} />
            <strong>
              {query ? "No matching conversations" : "No calls in this period"}
            </strong>
            <p>
              {query
                ? "Try a different phone number, name or keyword."
                : "Choose a longer date range, or return after your agent handles a call."}
            </p>
            {query && (
              <button className="button" onClick={() => setQuery("")}>
                Clear search
              </button>
            )}
          </div>
        )}
      </div>
      <div className="list-footer">
        <span>
          {query
            ? `${calls.length} matches in ${data.calls.length} recent calls`
            : `${data.calls.length} recent calls loaded`}
          {data.totals.calls > data.calls.length
            ? ` of ${data.totals.calls} in this period. Only the latest 100 are available here.`
            : ""}
        </span>
        {calls.length > 10 && (
          <div>
            <button
              className="icon-button"
              aria-label="Previous calls"
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
            >
              <ChevronLeft size={18} />
            </button>
            <span>
              {currentPage + 1} / {Math.ceil(calls.length / 10)}
            </span>
            <button
              className="icon-button"
              aria-label="Next calls"
              disabled={(currentPage + 1) * 10 >= calls.length}
              onClick={() => setPage(currentPage + 1)}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
