"use client";
import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Phone } from "lucide-react";
import type { Appointment, PortalData } from "@/lib/types";

const zone = "Asia/Colombo";
const dateParts = (date: Date) =>
  Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
const keyFor = (date: Date) => {
  const p = dateParts(date);
  return `${p.year}-${p.month}-${p.day}`;
};
const timeFor = (value: string) =>
  new Intl.DateTimeFormat("en-LK", {
    timeZone: zone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
const fullDate = (value: string) =>
  new Intl.DateTimeFormat("en-LK", {
    timeZone: zone,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

export function Appointments({ data }: { data: PortalData }) {
  const today = dateParts(new Date());
  const [month, setMonth] = useState(
    new Date(Date.UTC(Number(today.year), Number(today.month) - 1, 1)),
  );
  const appointments = useMemo(() => {
    const grouped = new Map<string, Appointment[]>();
    for (const appointment of data.appointments) {
      const key = keyFor(new Date(appointment.appointment_at));
      grouped.set(key, [...(grouped.get(key) || []), appointment]);
    }
    return grouped;
  }, [data.appointments]);
  const days = useMemo(() => {
    const first = new Date(month);
    const offset = (first.getUTCDay() + 6) % 7;
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(first);
      date.setUTCDate(1 - offset + index);
      return date;
    });
  }, [month]);
  const upcoming = data.appointments
    .filter((appointment) => appointment.status === "booked" && new Date(appointment.appointment_at) >= new Date())
    .slice(0, 8);
  const move = (amount: number) =>
    setMonth(new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + amount, 1)));
  const reset = () =>
    setMonth(new Date(Date.UTC(Number(today.year), Number(today.month) - 1, 1)));

  return (
    <div className="appointments-layout">
      <section className="panel calendar-panel">
        <div className="calendar-toolbar">
          <div>
            <span className="eyebrow">ASIA/COLOMBO</span>
            <h2>{new Intl.DateTimeFormat("en-LK", { month: "long", year: "numeric", timeZone: "UTC" }).format(month)}</h2>
          </div>
          <div>
            <button className="button secondary" onClick={reset}>Today</button>
            <button className="icon-button" aria-label="Previous month" onClick={() => move(-1)}><ChevronLeft size={18} /></button>
            <button className="icon-button" aria-label="Next month" onClick={() => move(1)}><ChevronRight size={18} /></button>
          </div>
        </div>
        <div className="calendar-scroll">
          <div className="calendar-grid calendar-weekdays">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <div key={day}>{day}</div>)}
          </div>
          <div className="calendar-grid calendar-days">
            {days.map((date) => {
              const key = date.toISOString().slice(0, 10);
              const outside = date.getUTCMonth() !== month.getUTCMonth();
              return (
                <div key={key} className={`${outside ? "outside" : ""} ${key === `${today.year}-${today.month}-${today.day}` ? "today" : ""}`}>
                  <span className="calendar-date">{date.getUTCDate()}</span>
                  <div className="calendar-events">
                    {(appointments.get(key) || []).map((appointment) => (
                      <article key={appointment.id} className={`calendar-event ${appointment.status}`} title={`${appointment.customer_name}: ${appointment.service}`}>
                        <time>{timeFor(appointment.appointment_at)}</time>
                        <strong>{appointment.customer_name}</strong>
                        <span>{appointment.service}</span>
                      </article>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      <aside className="panel upcoming-panel">
        <div className="panel-heading">
          <div><h2>Upcoming</h2><p>Bookings made during calls.</p></div>
          <span className="icon-tile lavender"><CalendarDays size={19} /></span>
        </div>
        {upcoming.length ? (
          <div className="upcoming-list">
            {upcoming.map((appointment) => (
              <article key={appointment.id}>
                <div className="appointment-date"><strong>{new Intl.DateTimeFormat("en-LK", { day: "2-digit", timeZone: zone }).format(new Date(appointment.appointment_at))}</strong><span>{new Intl.DateTimeFormat("en-LK", { month: "short", timeZone: zone }).format(new Date(appointment.appointment_at))}</span></div>
                <div>
                  <h3>{appointment.customer_name}</h3>
                  <p>{appointment.service}</p>
                  <span><Clock3 size={13} /> {fullDate(appointment.appointment_at)} at {timeFor(appointment.appointment_at)}</span>
                  {appointment.customer_phone && <span><Phone size={13} /> {appointment.customer_phone}</span>}
                  <small>{appointment.agent_name || "Voice agent"} · {appointment.duration_minutes} min</small>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="appointments-empty"><CalendarDays size={28} /><strong>No upcoming appointments</strong><p>Confirmed bookings from voice calls will appear here automatically.</p></div>
        )}
      </aside>
    </div>
  );
}
