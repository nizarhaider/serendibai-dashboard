"use client";
import { useState } from "react";
import { RecordFilters } from "./record-filters";
import { MapPin, PackageCheck, Phone } from "lucide-react";
import type { Order, PortalData } from "@/lib/types";
import { RecordStatus } from "./portal";

const date = (value: string) =>
  new Intl.DateTimeFormat("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Colombo",
  }).format(new Date(value));
const items = (order: Order) =>
  order.items.map((item) => `${item.quantity} × ${item.name}`).join(", ");

export function Orders({
  data,
  refresh,
}: {
  data: PortalData;
  refresh: () => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("active");
  const records = data.orders.filter(
    (item) =>
      (status === "all" ||
        (status === "active"
          ? ["placed", "processing"].includes(item.status)
          : !["placed", "processing"].includes(item.status))) &&
      `${item.customer_name} ${item.customer_phone} ${items(item)}`
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
          { value: "active", label: "To fulfil" },
          { value: "closed", label: "Closed" },
          { value: "all", label: "All orders" },
        ]}
      />
      {records.length ? (
        <div className="records-list">
          {records.map((order) => (
            <article key={order.id} className="record-card">
              <div className="record-main">
                <div className="record-title">
                  <h3>{order.customer_name}</h3>
                  <RecordStatus
                    id={order.id}
                    resource="orders"
                    value={order.status}
                    options={["placed", "processing", "completed", "cancelled"]}
                    refresh={refresh}
                  />
                </div>
                <p className="record-items">{items(order)}</p>
                <div className="record-meta">
                  <span>{date(order.created_at)}</span>
                  {order.agent_name && <span>{order.agent_name}</span>}
                  {order.customer_phone && (
                    <span>
                      <Phone size={13} /> {order.customer_phone}
                    </span>
                  )}
                </div>
                {order.delivery_address && (
                  <p className="record-detail">
                    <MapPin size={14} /> {order.delivery_address}
                  </p>
                )}
                {order.notes && <p className="record-notes">{order.notes}</p>}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="records-empty">
          <PackageCheck size={30} />
          <strong>{query ? "No matching orders" : "No orders to show"}</strong>
          <p>
            Orders confirmed during calls appear here. Use “All orders” to
            review completed work.
          </p>
        </div>
      )}
    </section>
  );
}
