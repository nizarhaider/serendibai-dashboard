"use client";
import { useState } from "react";
import { RecordFilters } from "./record-filters";
import { AlertCircle, Phone } from "lucide-react";
import type { PortalData, Ticket as SupportTicket } from "@/lib/types";
import { RecordStatus } from "./portal";

const date = (value: string) =>
  new Intl.DateTimeFormat("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Colombo",
  }).format(new Date(value));
const label = (value: string) => value.replace("_", " ");

export function Tickets({
  data,
  refresh,
}: {
  data: PortalData;
  refresh: () => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("active");
  const records = data.tickets.filter(
    (item) =>
      (status === "all" ||
        (status === "active"
          ? ["open", "in_progress"].includes(item.status)
          : !["open", "in_progress"].includes(item.status))) &&
      `${item.customer_name} ${item.customer_phone} ${item.subject} ${item.description}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <section className="panel records-panel">
      <RecordFilters
        query={query}
        onQuery={setQuery}
        status={status}
        onStatus={setStatus}
        placeholder="Search name, number or details…"
        options={[
          { value: "active", label: "Needs attention" },
          { value: "closed", label: "Closed" },
          { value: "all", label: "All follow-ups" },
        ]}
      />
      {records.length ? (
        <div className="records-list">
          {records.map((ticket: SupportTicket) => (
            <article key={ticket.id} className="record-card">
              <div className="record-main">
                <div className="record-title">
                  <div>
                    <h3>{ticket.subject}</h3>
                    <p>{ticket.customer_name}</p>
                  </div>
                  <div className="record-badges">
                    <span className={`priority ${ticket.priority}`}>
                      {label(ticket.priority)}
                    </span>
                    <RecordStatus
                      id={ticket.id}
                      resource="tickets"
                      value={ticket.status}
                      options={["open", "in_progress", "resolved", "closed"]}
                      refresh={refresh}
                    />
                  </div>
                </div>
                <details className="record-extra">
                  <summary>Request details</summary>
                  <p className="record-description">{ticket.description}</p>
                </details>
                <div className="record-meta">
                  <span>{date(ticket.created_at)}</span>
                  {ticket.agent_name && <span>{ticket.agent_name}</span>}
                  {ticket.customer_phone && (
                    <span>
                      <Phone size={13} /> {ticket.customer_phone}
                    </span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="records-empty">
          <AlertCircle size={30} />
          <strong>
            {query ? "No matching follow-ups" : "No follow-ups to show"}
          </strong>
          <p>
            Requests from customer calls appear here. Use “All follow-ups” to
            review closed requests.
          </p>
        </div>
      )}
    </section>
  );
}
