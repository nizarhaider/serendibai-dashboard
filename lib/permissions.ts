export const toolNames = ["search_knowledge", "search_products", "book_appointment", "create_order", "create_ticket", "send_whatsapp_message"] as const;
export const toolLabels: Record<string, string> = {
  search_knowledge: "Business information",
  search_products: "Product catalogue",
  book_appointment: "Appointments",
  create_order: "Orders",
  create_ticket: "Support tickets",
  send_whatsapp_message: "WhatsApp link sharing",
};
export type Access = { is_admin: boolean; read_only: boolean; allowed_tools: string[] };
export const resourceTools: Record<string, string> = {
  documents: "search_knowledge", knowledge: "search_knowledge",
  products: "search_products", catalogue: "search_products",
  appointments: "book_appointment", orders: "create_order", tickets: "create_ticket",
};
export function canAccessSection(user: Access, section: string) {
  if (section === "dashboard") return true;
  if (section === "admin") return user.is_admin;
  return !user.read_only && (!resourceTools[section] || user.allowed_tools.includes(resourceTools[section]));
}
