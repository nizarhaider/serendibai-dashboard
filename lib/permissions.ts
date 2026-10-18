export const toolNames = ["book_appointment", "create_order", "create_ticket"] as const;
export const standardTools = ["search_knowledge", "search_products", "send_whatsapp_message"] as const;
export const toolLabels: Record<string, string> = {
  book_appointment: "Appointments",
  create_order: "Orders",
  create_ticket: "Support tickets",
};
export type Access = { is_admin: boolean; read_only: boolean; allowed_tools: string[] };
export const resourceTools: Record<string, string> = {
  appointments: "book_appointment", orders: "create_order", tickets: "create_ticket",
};
export function canAccessSection(user: Access, section: string) {
  if (section === "dashboard") return true;
  if (section === "admin") return user.is_admin;
  return !user.read_only && (!resourceTools[section] || user.allowed_tools.includes(resourceTools[section]));
}
