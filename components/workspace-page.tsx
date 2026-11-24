"use client";

import useSWR from "swr";
import { redirect } from "next/navigation";
import { canAccessSection } from "@/lib/permissions";
import type { Customer, PortalData } from "@/lib/types";
import { api, Portal } from "./portal";
import { useAccount } from "./portal-shell";

const options = { revalidateIfStale: false, revalidateOnFocus: true, shouldRetryOnError: false };

export function WorkspacePage({ section, workspace }: { section: string; workspace: string }) {
  const account = useAccount();
  const allowed = canAccessSection(account, section);
  const { data: customers, error: customersError, mutate: refreshCustomers } = useSWR<Customer[]>(account.is_admin && allowed ? "customers" : null, api, options);
  const target = account.is_admin && section === "agents" ? workspace || customers?.[0]?.id || "" : account.is_admin && section === "dashboard" ? workspace : "";
  const validTarget = !target || customers?.some(customer => customer.id === target);
  const needsData = section !== "outbound" && section !== "admin" && !(account.is_admin && section === "dashboard" && !target);
  const key = needsData && allowed && (!account.is_admin || customers) && validTarget ? `data?section=${section}${target && ["agents", "dashboard"].includes(section) ? `&workspace=${encodeURIComponent(target)}` : ""}` : null;
  const { data, error, mutate } = useSWR<PortalData>(key, api, options);
  if (!allowed) redirect("/dashboard");
  if (customersError || error) return <div role="alert" className="workspace-message"><p>{(customersError || error).message}</p><button className="button" onClick={() => { void refreshCustomers(); void mutate(); }}>Try again</button></div>;
  if (!validTarget && customers) return <div role="alert" className="workspace-message">Workspace not found.</div>;
  if ((needsData && !data) || (account.is_admin && !customers)) return <div className="workspace-message" role="status">Loading page…</div>;
  const initial = data || { ...account, generatedAt: 0, agents: [], documents: [], products: [], calls: [], appointments: [], orders: [], tickets: [], totals: { calls: 0, answered: 0, failed: 0, minutes: null, inbound_minutes: null, outbound_minutes: null }, attention: { tickets: 0, orders: 0, appointments: 0 } };
  return <Portal key={`${section}:${target}`} initial={initial} section={section} workspace={target} initialCustomers={customers || []} />;
}
