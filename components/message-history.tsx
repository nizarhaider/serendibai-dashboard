"use client";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { PortalData } from "@/lib/types";

const categories = ["New inquiry", "Sales", "Support", "Product question", "Booking", "Other"];
const statuses = ["Open", "Waiting", "Resolved"];

export function MessageHistory({ data }: { data: PortalData }) {
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState("");
  const [threadUpdates, setThreadUpdates] = useState<Record<string, { category?: string; status?: string }>>({});
  const storedMessages = useMemo(() => data.messages || [], [data.messages]);
  const conversations = useMemo(() => {
    const groups = new Map<string, PortalData["messages"]>();
    for (const message of storedMessages) {
      const rows = groups.get(message.contact_phone) || [];
      rows.push(message);
      groups.set(message.contact_phone, rows);
    }
    return [...groups.entries()]
      .map(([phone, messages]) => ({
        phone,
        latest: messages[0]?.created_at || "",
        category: threadUpdates[phone]?.category || messages[0]?.category || "New inquiry",
        status: threadUpdates[phone]?.status || messages[0]?.thread_status || "Open",
        messages: messages.reverse(),
      }))
      .filter(({ phone, messages }) =>
        `${phone} ${messages.map((item) => item.body).join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      )
      .sort((a, b) => b.latest.localeCompare(a.latest));
  }, [storedMessages, query, threadUpdates]);

  async function updateThread(phone: string, field: "category" | "status", value: string) {
    setSaving(phone);
    try {
      const response = await fetch("/api/portal/message-threads", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contact_phone: phone, [field]: value }) });
      if (!response.ok) throw new Error("Could not update inquiry.");
      setThreadUpdates(current => ({ ...current, [phone]: { ...current[phone], [field]: value } }));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not update inquiry.");
    } finally { setSaving(""); }
  }

  return (
    <div className="message-history">
      <div className="message-search">
        <Input
          aria-label="Search messages"
          placeholder="Search contact or message…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <span>{storedMessages.length} recent messages loaded</span>
      </div>
      {!conversations.length ? (
        <div className="records-empty">
          <strong>{query ? "No matching messages" : "No messages yet"}</strong>
          <p>{query ? "Try another number or keyword." : "Incoming and sent WhatsApp messages will appear here."}</p>
        </div>
      ) : (
        conversations.map(({ phone, messages, category, status }) => (
          <article className="message-conversation" key={phone}>
            <h2>{phone}</h2>
            <div className="message-thread-controls">
              <label>Category <NativeSelect size="sm" aria-label={`Category for ${phone}`} value={category} disabled={saving === phone} onChange={event => void updateThread(phone, "category", event.target.value)}>{categories.map(item => <option key={item}>{item}</option>)}</NativeSelect></label>
              <label>Status <NativeSelect size="sm" aria-label={`Status for ${phone}`} value={status} disabled={saving === phone} onChange={event => void updateThread(phone, "status", event.target.value)}>{statuses.map(item => <option key={item}>{item}</option>)}</NativeSelect></label>
            </div>
            <div className="message-thread">
              {messages.map((message) => {
                const tokens = message.usage?.total_token_count;
                return (
                  <div className={`message-row ${message.direction}`} key={message.id}>
                    <div className="message-bubble">
                      <div className="message-meta">
                        <span>{message.direction === "inbound" ? "Customer" : "Agent"}</span>
                        <span>{message.status}</span>
                        <time>{new Date(message.created_at).toLocaleString("en-GB", { timeZone: "Asia/Colombo", dateStyle: "medium", timeStyle: "short" })}</time>
                      </div>
                      <p>{message.body}</p>
                      {message.model && <small>{message.model}{typeof tokens === "number" ? ` · ${tokens.toLocaleString()} tokens` : ""}</small>}
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        ))
      )}
    </div>
  );
}
