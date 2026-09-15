export type Agent = {
  id: string;
  name: string;
  company_url: string;
  system_prompt: string;
  greeting: string;
  voice: string;
  languages: string[];
  tools: string[];
  max_calls: number;
  hourly_budget: number;
  phone_number_id: string;
  instance_id: number | null;
  status: string;
  version: number;
  deployed_version: number;
  heartbeat_at: string | null;
  telemetry: Record<string, number | string>;
  has_credentials: boolean;
  created_at: string;
};
export type Product = {
  id?: string;
  name: string;
  sku: string;
  description: string;
  category: string;
  price: number | null;
  currency: string;
  stock: number | null;
  status: string;
};
export type Document = {
  id: string;
  name: string;
  bytes: number;
  type: string;
  created_at: string;
  characters: number;
};
export type Call = {
  id: string;
  agent_id: string;
  agent_name: string;
  customer_phone: string;
  status: string;
  transcript: string | null;
  duration_seconds: number | null;
  tokens: number | null;
  created_at: string;
  source: string;
};
export type PortalData = {
  generatedAt: number;
  email: string;
  agents: Agent[];
  documents: Document[];
  products: Product[];
  calls: Call[];
  daily: {
    date: string;
    calls: number;
    minutes: number | null;
    tokens: number | null;
  }[];
  totals: {
    calls: number;
    answered: number;
    minutes: number | null;
    tokens: number | null;
    measured_minutes: number;
    measured_tokens: number;
  };
  quotas: { tokens: number; minutes: number; calls: number; label: string };
  events: { id: string; action: string; detail: string; created_at: string }[];
};
