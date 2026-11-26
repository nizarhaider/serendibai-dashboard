"use client";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import type { PortalData } from "@/lib/types";

export function MessageHistory({ data }: { data: PortalData }) {
  const [query, setQuery] = useState("");
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
        messages: messages.reverse(),
      }))
      .filter(({ phone, messages }) =>
        `${phone} ${messages.map((item) => item.body).join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      )
      .sort((a, b) => b.latest.localeCompare(a.latest));
  }, [storedMessages, query]);

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
        conversations.map(({ phone, messages }) => (
          <article className="message-conversation" key={phone}>
            <h2>{phone}</h2>
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
