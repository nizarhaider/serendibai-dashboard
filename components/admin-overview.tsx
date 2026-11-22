import Card from "@mui/material/Card";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Customer } from "@/lib/types";
import { Status } from "./portal";

export function AdminOverview({ customers }: { customers: Customer[] }) {
  const connections = customers.flatMap(customer => customer.connections.map(connection => ({ ...connection, workspace: customer.business_name })));
  const totals = [
    ["Customer workspaces", customers.length, "Across your portal"],
    ["Active users", customers.reduce((total, customer) => total + customer.users.length, 0), "With portal access"],
    ["Voice agents", customers.reduce((total, customer) => total + customer.agents, 0), "Across all workspaces"],
    ["Connected numbers", connections.filter(connection => connection.status === "connected").length, "WhatsApp lines online"],
  ] as const;

  return <div className="admin-overview">
    <div className="admin-totals">{totals.map(([label, count, detail]) => <Card className="panel admin-stat" key={label}><span>{label}</span><strong>{count}</strong><small>{detail}</small></Card>)}</div>
    <div className="admin-sections">
      <Card component="section" className="panel admin-section admin-workspaces">
        <div className="panel-heading"><div><h2>Customer workspaces</h2><p>Manage access, agents, and call activity.</p></div><Link href="/admin" className="button">Manage customers</Link></div>
        {customers.length ? customers.map(customer => <div className="admin-row" key={customer.id}>
          <div className="admin-row-main"><strong>{customer.business_name}</strong><small>{customer.users.length} users <span>·</span> {customer.agents} agents <span>·</span> {customer.calls} calls</small></div>
          <div className="admin-row-actions"><Link href={`/dashboard?workspace=${customer.id}`} className="admin-row-action">View calls <ArrowUpRight size={15} /></Link><Link href={`/agents?workspace=${customer.id}`} className="admin-row-action">Manage agents <ArrowUpRight size={15} /></Link></div>
        </div>) : <p className="admin-empty">No customer workspaces yet.</p>}
      </Card>
      <Card component="section" className="panel admin-section admin-connections">
        <div className="panel-heading"><div><h2>WhatsApp numbers</h2><p>Connection status across workspaces.</p></div><span className="admin-count">{connections.length}</span></div>
        {connections.length ? connections.map(connection => <div className="admin-row" key={connection.id}>
          <div className="admin-row-main"><strong>{connection.phone ? `+${connection.phone}` : "Number pending"}</strong><small>{connection.workspace} <span>·</span> {connection.agent_name || "No agent"}{connection.error ? ` · ${connection.error}` : ""}</small></div>
          <Status value={connection.enabled ? connection.status : "disabled"} />
        </div>) : <p className="admin-empty">No customer numbers registered.</p>}
      </Card>
    </div>
  </div>;
}
