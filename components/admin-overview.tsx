import Card from "@mui/material/Card";
import Link from "next/link";
import type { Customer } from "@/lib/types";
import { Status } from "./portal";

export function AdminOverview({ customers }: { customers: Customer[] }) {
  const connections = customers.flatMap(customer => customer.connections.map(connection => ({ ...connection, workspace: customer.business_name })));
  const totals = [
    ["Workspaces", customers.length],
    ["Users", customers.reduce((total, customer) => total + customer.users.length, 0)],
    ["Agents", customers.reduce((total, customer) => total + customer.agents, 0)],
    ["Connected numbers", connections.filter(connection => connection.status === "connected").length],
  ];
  return <div className="admin-overview">
    <div className="admin-totals">{totals.map(([label, count]) => <div className="panel" key={label}><span>{label}</span><strong>{count}</strong></div>)}</div>
    <Card component="section" className="panel admin-section"><div className="panel-heading"><div><h2>Customer workspaces</h2><p>View calls or manage each workspace’s access and agents.</p></div><Link href="/admin" className="button">Manage customers</Link></div>
      {customers.length ? customers.map(customer => <div className="admin-row" key={customer.id}><div><strong>{customer.business_name}</strong><small>{customer.users.length} users · {customer.agents} agents · {customer.calls} calls</small></div><div className="admin-row-actions"><Link href={`/dashboard?workspace=${customer.id}`}>View calls</Link><Link href={`/agents?workspace=${customer.id}`}>Manage agents</Link></div></div>) : <p className="muted">No customer workspaces yet.</p>}
    </Card>
    <Card component="section" className="panel admin-section"><div className="panel-heading"><div><h2>WhatsApp numbers</h2><p>Connection status across customer workspaces.</p></div></div>
      {connections.length ? connections.map(connection => <div className="admin-row" key={connection.id}><div><strong>{connection.phone ? `+${connection.phone}` : "Number pending"}</strong><small>{connection.workspace} · {connection.agent_name || "No agent"}{connection.error ? ` · ${connection.error}` : ""}</small></div><Status value={connection.enabled ? connection.status : "disabled"} /></div>) : <p className="muted">No customer numbers registered.</p>}
    </Card>
  </div>;
}
