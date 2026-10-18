"use client";

import { useState } from "react";
import type { Customer } from "@/lib/types";
import { toolLabels, toolNames } from "@/lib/permissions";
import { api } from "./portal";

export function Customers({ initial }: { initial: Customer[] }) {
  const [customers, setCustomers] = useState(initial);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function save(customer: Customer) {
    setBusy(customer.id); setError(""); setMessage("");
    try {
      await api(`customers/${customer.id}`, "PUT", { read_only: customer.read_only, allowed_tools: customer.allowed_tools });
      setCustomers(await api("customers"));
      setMessage(`${customer.business_name} access saved. New calls use these features.`);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(""); }
  }
  function update(id: string, change: Partial<Customer>) {
    setCustomers(rows => rows.map(row => row.id === id ? { ...row, ...change } : row));
  }
  return <div className="customer-admin">
    <section className="panel">
      <div className="panel-heading"><div><h2>Create a customer account</h2><p>Client accounts start with access to calls and transcripts only.</p></div></div>
      <form className="customer-create" onSubmit={async event => {
        event.preventDefault(); const form = event.currentTarget;
        setBusy("create"); setError(""); setMessage("");
        try {
          await api("customers", "POST", { ...Object.fromEntries(new FormData(form)), read_only: true, allowed_tools: ["search_knowledge", "send_whatsapp_message"] });
          setCustomers(await api("customers")); form.reset(); setMessage("Customer account created.");
        } catch (e) { setError((e as Error).message); }
        finally { setBusy(""); }
      }}>
        <label>Business name<input name="business_name" required maxLength={160} /></label>
        <label>Contact name<input name="contact_name" required maxLength={160} /></label>
        <label>Email<input name="email" type="email" required autoComplete="off" /></label>
        <label>Password<input name="password" type="password" required autoComplete="new-password" maxLength={200} /></label>
        <button className="button primary" disabled={!!busy}>{busy === "create" ? "Creating…" : "Create account"}</button>
      </form>
    </section>
    {error && <p className="toast error" role="alert">{error}</p>}
    {message && <p className="toast success" role="status">{message}</p>}
    {customers.map(customer => <section className="panel" key={customer.id}>
      <div className="panel-heading"><div><h2>{customer.business_name}</h2><p>{customer.agents} agents · {customer.calls} calls</p></div></div>
      <div className="customer-access">
        <h3>Users</h3>
        {!customer.users.length && <p className="muted">No portal users assigned.</p>}
        {customer.users.map(user => <p key={user.email}>{user.name || customer.contact_name} · {user.email}{user.is_admin ? " · Administrator" : ""}</p>)}
        <h3>Enabled bot features</h3>
        <div className="customer-features">{toolNames.map(tool => <label key={tool}>
          <input type="checkbox" checked={customer.allowed_tools.includes(tool)} disabled={!!busy} onChange={event => update(customer.id, { allowed_tools: event.target.checked ? [...customer.allowed_tools, tool] : customer.allowed_tools.filter(value => value !== tool) })} />
          {toolLabels[tool]}
        </label>)}</div>
        <label className="customer-editing"><input type="checkbox" checked={!customer.read_only} disabled={!!busy} onChange={event => update(customer.id, { read_only: !event.target.checked })} />Allow this customer to edit agent settings and enabled resources</label>
        <p className="muted">With editing off, clients can only view their own call history and transcripts. Disabled features are blocked by the server.</p>
        <button className="button primary" disabled={!!busy} onClick={() => save(customer)}>{busy === customer.id ? "Saving…" : "Save access"}</button>
      </div>
    </section>)}
  </div>;
}
