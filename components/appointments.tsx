"use client";
import { useState } from "react";
import { CalendarDays, Phone } from "lucide-react";
import type { PortalData } from "@/lib/types";
import { RecordStatus } from "./portal";
import { RecordFilters } from "./record-filters";

export function Appointments({
  data,
  refresh,
}: {
  data: PortalData;
  refresh: () => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("upcoming");
  const appointments = data.appointments
    .filter((a) => {
      const future = new Date(a.appointment_at).getTime() >= data.generatedAt;
      return (
        (status === "all" ||
          (status === "upcoming"
            ? future && a.status === "booked"
            : !future || a.status !== "booked")) &&
        `${a.customer_name} ${a.customer_phone} ${a.service}`
          .toLowerCase()
          .includes(query.toLowerCase())
      );
    })
    .sort(
      (a, b) =>
        (new Date(a.appointment_at).getTime() -
          new Date(b.appointment_at).getTime()) *
        (status === "past" ? -1 : 1),
    );
  return (
    <section className="panel records-panel">
      <RecordFilters
        query={query}
        onQuery={setQuery}
        status={status}
        onStatus={setStatus}
        placeholder="Search name, number or service…"
        options={[
          { value: "upcoming", label: "Upcoming" },
          { value: "past", label: "Past & closed" },
          { value: "all", label: "All bookings" },
        ]}
      />
      {appointments.length ? (
        <div className="records-list">
          {appointments.map((a) => (
            <article key={a.id} className="record-card booking-row">
              <div className="booking-date">
                <strong>
                  {new Date(a.appointment_at).toLocaleDateString("en-GB", {
                    timeZone: "Asia/Colombo",
                    day: "2-digit",
                  })}
                </strong>
                <span>
                  {new Date(a.appointment_at).toLocaleDateString("en-GB", {
                    timeZone: "Asia/Colombo",
                    month: "short",
                  })}
                </span>
              </div>
              <div className="record-main">
                <div className="record-title">
                  <div>
                    <h3>{a.customer_name}</h3>
                    <p>{a.service}</p>
                  </div>
                  <RecordStatus
                    id={a.id}
                    resource="appointments"
                    value={a.status}
                    options={["booked", "completed", "cancelled"]}
                    refresh={refresh}
                  />
                </div>
                <div className="record-meta">
                  <time>
                    {new Date(a.appointment_at).toLocaleString("en-GB", {
                      timeZone: "Asia/Colombo",
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}{" "}
                    · {a.duration_minutes} min
                  </time>
                  {a.customer_phone && (
                    <span>
                      <Phone size={13} />
                      {a.customer_phone}
                    </span>
                  )}
                </div>
                {a.notes && (
                  <details className="record-extra">
                    <summary>Booking notes</summary>
                    <p>{a.notes}</p>
                  </details>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="records-empty">
          <CalendarDays size={28} />
          <strong>
            {query
              ? "No matching bookings"
              : status === "upcoming"
                ? "No upcoming bookings"
                : "No bookings to show"}
          </strong>
          <p>
            {query
              ? "Try another name, phone number or service."
              : "Appointments confirmed during calls appear here."}
          </p>
          {(query || status !== "all") && (
            <button
              className="button"
              onClick={() => {
                setQuery("");
                setStatus("all");
              }}
            >
              View all bookings
            </button>
          )}
        </div>
      )}
      <div className="list-footer">
        {appointments.length} bookings · All times in Sri Lanka
      </div>
    </section>
  );
}
