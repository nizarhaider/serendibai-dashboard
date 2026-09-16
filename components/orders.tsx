"use client";
import { MapPin, PackageCheck, Phone } from "lucide-react";
import type { Order, PortalData } from "@/lib/types";
import { Status } from "./portal";

const date = (value: string) => new Intl.DateTimeFormat("en-LK", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Colombo" }).format(new Date(value));
const items = (order: Order) => order.items.map((item) => `${item.quantity} × ${item.name}`).join(", ");

export function Orders({ data }: { data: PortalData }) {
  return (
    <section className="panel records-panel">
      <div className="panel-heading"><div><h2>Orders</h2><p>Confirmed orders created during customer calls.</p></div><span className="icon-tile lavender"><PackageCheck size={19} /></span></div>
      {data.orders.length ? <div className="records-list">{data.orders.map((order) => <article key={order.id} className="record-card"><div className="record-main"><div className="record-title"><h3>{order.customer_name}</h3><Status value={order.status} /></div><p className="record-items">{items(order)}</p><div className="record-meta"><span>{date(order.created_at)}</span>{order.agent_name && <span>{order.agent_name}</span>}{order.customer_phone && <span><Phone size={13} /> {order.customer_phone}</span>}</div>{order.delivery_address && <p className="record-detail"><MapPin size={14} /> {order.delivery_address}</p>}{order.notes && <p className="record-notes">{order.notes}</p>}</div></article>)}</div> : <div className="records-empty"><PackageCheck size={30} /><strong>No orders yet</strong><p>Confirmed orders from customer calls will appear here automatically.</p></div>}
    </section>
  );
}
