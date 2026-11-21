"use client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useState } from "react";
import type { Customer } from "@/lib/types";
import { toolLabels, toolNames } from "@/lib/permissions";
import { Search, Plus } from "lucide-react";
import { api } from "./portal";

export function Customers({ initial }: { initial: Customer[] }) {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [customers, setCustomers] = useState(initial);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function save(customer: Customer) {
    setBusy(customer.id);
    setError("");
    setMessage("");
    try {
      await api(`customers/${customer.id}`, "PUT", {
        read_only: customer.read_only,
        allowed_tools: customer.allowed_tools,
      });
      setCustomers(await api("customers"));
      setMessage(
        `${customer.business_name} access saved. New calls use these features.`,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  function update(id: string, change: Partial<Customer>) {
    setCustomers((rows) =>
      rows.map((row) => (row.id === id ? { ...row, ...change } : row)),
    );
  }
  return (
    <div className="customer-admin">
      <div className="list-toolbar admin-toolbar">
        <div className="search-input">
          <Search size={16} />
          <Input
            aria-label="Search customers"
            placeholder="Search business or email…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <Button variant="ghost"
          className="button primary"
          onClick={() => setCreating(!creating)}
        >
          <Plus size={16} />
          {creating ? "Cancel" : "New customer"}
        </Button>
      </div>
      {creating && (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>New customer</h2>
              <p>The customer receives a password setup link, then connects WhatsApp before entering the workspace.</p>
            </div>
          </div>
          <form
            className="customer-create"
            onSubmit={async (event) => {
              event.preventDefault();
              const form = event.currentTarget;
              setBusy("create");
              setError("");
              setMessage("");
              try {
                const formData = new FormData(form);
                const result = await api("customers", "POST", {
                  business_name: formData.get("business_name"),
                  contact_name: formData.get("contact_name"),
                  email: formData.get("email"),
                  read_only: !formData.has("can_edit"),
                  allowed_tools: toolNames.filter((tool) => formData.has(tool)),
                });
                setCustomers(await api("customers"));
                form.reset();
                setCreating(false);
                setMessage(result.invitation_sent ? "Customer created. The setup invitation has been emailed." : "Customer created, but the invitation email could not be sent. Use Resend invitation below.");
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy("");
              }
            }}
          >
            <label>
              Business name
              <Input name="business_name" required maxLength={160} />
            </label>
            <label>
              Contact name
              <Input name="contact_name" required maxLength={160} />
            </label>
            <label>
              Email
              <Input name="email" type="email" required autoComplete="off" />
            </label>
            <fieldset><legend>Workspace access</legend>{toolNames.map(tool => <label key={tool}><input type="checkbox" name={tool} defaultChecked /> {toolLabels[tool]}</label>)}<label><input type="checkbox" name="can_edit" defaultChecked /> Allow customer to edit agent settings</label></fieldset>
            <Button variant="ghost" className="button primary" disabled={!!busy}>
              {busy === "create" ? "Creating…" : "Create account"}
            </Button>
          </form>
        </section>
      )}
      {error && (
        <p className="toast error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="toast success" role="status">
          {message}
        </p>
      )}
      {customers
        .filter((customer) =>
          `${customer.business_name} ${customer.users.map((user) => user.email).join(" ")}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
        .map((customer) => (
          <details className="panel customer-card" key={customer.id}>
            <summary>
              <span>
                <strong>{customer.business_name}</strong>
                <small>
                  {customer.users.map((user) => user.email).join(", ") ||
                    "No users assigned"}
                </small>
              </span>
              <span className="tag">
                {customer.read_only ? "View only" : "Can edit"}
              </span>
            </summary>
            <div className="customer-access">
              <h3>Users</h3>
              <p className="muted">Each user invited here shares this workspace’s feature access.</p>
              {!customer.users.length && (
                <p className="muted">No portal users assigned.</p>
              )}
              {customer.users.map((user) => (
                <p key={user.id}>
                  {user.name || customer.contact_name} · {user.email}
                  {user.is_admin ? " · Administrator" : ""}
                  {user.invitation_pending ? user.invitation_sent ? " · Invitation sent" : " · Invitation pending" : ""}
                  {user.invitation_pending && !user.is_admin && <Button variant="ghost" className="button" disabled={!!busy} onClick={async () => { setBusy(customer.id); setError(""); setMessage(""); try { await api(`customers/${customer.id}/invite`, "POST"); setCustomers(await api("customers")); setMessage(`Invitation sent to ${user.email}.`); } catch (e) { setError((e as Error).message); } finally { setBusy(""); } }}>Resend invitation</Button>}
                  {!user.is_admin && <Button variant="ghost" className="button" disabled={!!busy} onClick={async () => { if (!window.confirm(`Remove ${user.email} from ${customer.business_name}?`)) return; setBusy(customer.id); setError(""); setMessage(""); try { await api(`customers/${customer.id}/users/${user.id}`, "DELETE"); setCustomers(await api("customers")); setMessage(`${user.email} removed from ${customer.business_name}.`); } catch (e) { setError((e as Error).message); } finally { setBusy(""); } }}>Remove user</Button>}
                </p>
              ))}
              <form className="customer-create" onSubmit={async (event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const values = new FormData(form);
                setBusy(customer.id); setError(""); setMessage("");
                try {
                  const result = await api(`customers/${customer.id}/users`, "POST", { contact_name: values.get("contact_name"), email: values.get("email") });
                  setCustomers(await api("customers")); form.reset();
                  setMessage(result.invitation_sent ? `Invitation sent to ${values.get("email")}.` : "User added, but the invitation could not be sent. Use Resend invitation.");
                } catch (e) { setError((e as Error).message); }
                finally { setBusy(""); }
              }}>
                <label>Contact name<Input name="contact_name" required maxLength={160} /></label>
                <label>Email to invite<Input name="email" type="email" required autoComplete="off" /></label>
                <Button variant="ghost" className="button primary" disabled={!!busy}>{busy === customer.id ? "Sending…" : "Add email and send invite"}</Button>
              </form>
              <h3>Enabled bot features</h3>
              <div className="customer-features">
                {toolNames.map((tool) => (
                  <label key={tool}>
                    <input
                      type="checkbox"
                      checked={customer.allowed_tools.includes(tool)}
                      disabled={!!busy}
                      onChange={(event) =>
                        update(customer.id, {
                          allowed_tools: event.target.checked
                            ? [...customer.allowed_tools, tool]
                            : customer.allowed_tools.filter(
                                (value) => value !== tool,
                              ),
                        })
                      }
                    />
                    {toolLabels[tool]}
                  </label>
                ))}
              </div>
              <label className="customer-editing">
                <input
                  type="checkbox"
                  checked={!customer.read_only}
                  disabled={!!busy}
                  onChange={(event) =>
                    update(customer.id, { read_only: !event.target.checked })
                  }
                />
                Allow this customer to edit agent settings and enabled resources
              </label>
              <p className="muted">
                With editing off, the customer can only view calls and
                transcripts.
              </p>
              <Button variant="ghost"
                className="button primary"
                disabled={!!busy}
                onClick={() => save(customer)}
              >
                {busy === customer.id ? "Saving…" : "Save access"}
              </Button>
              <Button variant="ghost" className="button danger" disabled={!!busy} onClick={async () => {
                if (!window.confirm(`Permanently delete ${customer.business_name}, including all users, agents, calls, and workspace data?`)) return;
                setBusy(`delete:${customer.id}`); setError(""); setMessage("");
                try { await api(`customers/${customer.id}`, "DELETE"); setCustomers(await api("customers")); setMessage(`${customer.business_name} workspace deleted.`); }
                catch (e) { setError((e as Error).message); }
                finally { setBusy(""); }
              }}>{busy === `delete:${customer.id}` ? "Deleting…" : "Delete workspace"}</Button>
            </div>
          </details>
        ))}
      {!customers.some((customer) =>
        `${customer.business_name} ${customer.users.map((user) => user.email).join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ) && (
        <div className="records-empty">
          <strong>No customers found</strong>
          <p>Try a different business name or email.</p>
        </div>
      )}
    </div>
  );
}
