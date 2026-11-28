"use client";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import type { PortalData } from "@/lib/types";

export function MessageHistory({ data }: { data: PortalData }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const conversations = useMemo(() => {
    const groups = new Map<string, PortalData["messages"]>();
    for (const message of data.messages || []) {
      const rows = groups.get(message.contact_phone) || [];
      rows.push(message);
      groups.set(message.contact_phone, rows);
    }
    return [...groups.entries()].map(([phone, messages]) => ({
      phone,
      label: messages.find(message => message.display_phone)?.display_phone || (phone.length > 13 ? "WhatsApp contact" : phone),
      latest: messages[0],
      messages: [...messages].reverse(),
    })).filter(({ phone, label, messages }) =>
      `${phone} ${label} ${messages.map(item => item.body).join(" ")}`.toLowerCase().includes(query.toLowerCase()),
    ).sort((a, b) => b.latest.created_at.localeCompare(a.latest.created_at));
  }, [data.messages, query]);
  const active = conversations.find(item => item.phone === selected);

  return <div className="message-history">
    <div className="message-search"><Input aria-label="Search messages" placeholder="Search contact or message…" value={query} onChange={event => setQuery(event.target.value)} /></div>
    <div className="message-inbox">
      <div className="message-contacts" aria-label="Conversations">
        {conversations.length ? conversations.map(({ phone, label, latest }) => <button type="button" className={`message-contact ${active?.phone === phone ? "selected" : ""}`} key={phone} onClick={() => setSelected(phone)}><strong>{label}</strong><span>{latest.body}</span></button>) : <p className="message-empty">{query ? "No matching messages" : "No messages yet"}</p>}
      </div>
      <article className="message-conversation">
        {active ? <><h2>{active.label}</h2><div className="message-thread">{active.messages.map(message => <div className={`message-row ${message.direction}`} key={message.id}><div className="message-bubble"><p>{message.body}</p><div className="message-meta"><time>{new Date(message.created_at).toLocaleString("en-GB", { timeZone: "Asia/Colombo", dateStyle: "medium", timeStyle: "short" })}</time></div></div></div>)}</div></> : <p className="message-empty">Select a contact to view the conversation.</p>}
      </article>
    </div>
  </div>;
}
