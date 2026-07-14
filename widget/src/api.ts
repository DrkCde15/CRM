export interface WidgetConfig {
  id: number;
  name: string;
  logo_url: string;
  primary_color: string;
  welcome_message: string;
  agent_avatar_url: string;
  position: string;
  language: string;
  theme: string;
  whatsapp_number?: string;
  contact_email?: string;
}

export interface ChatMessage {
  id: number;
  sender: string;
  message: string;
  attachments: { filename: string }[];
  created_at: string;
}

export interface VisitorInfo {
  session_id: string;
  name?: string;
  email?: string;
  phone?: string;
  ip?: string;
  user_agent?: string;
  country?: string;
  city?: string;
}

const apiUrl = (): string => {
  const el = document.getElementById("convexo-chat");
  const fromAttr = el?.getAttribute("data-api");
  const fromGlobal = (window as any).CONVEXO_API as string | undefined;
  return fromAttr || fromGlobal || "";
};

export async function fetchConfig(token: string): Promise<WidgetConfig> {
  const res = await fetch(`${apiUrl()}/widget/config?token=${encodeURIComponent(token)}`);
  if (!res.ok) throw new Error("widget config failed");
  return res.json();
}

export async function connect(info: VisitorInfo): Promise<{ id: number }> {
  const res = await fetch(`${apiUrl()}/chat/connect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(info),
  });
  if (!res.ok) throw new Error("connect failed");
  return res.json();
}

export async function loadHistory(conversationId: number): Promise<ChatMessage[]> {
  const res = await fetch(`${apiUrl()}/chat/history/${conversationId}`);
  if (!res.ok) return [];
  return res.json();
}

export async function sendMessage(
  conversationId: number,
  message: string,
  attachments: any[] = [],
): Promise<void> {
  await fetch(`${apiUrl()}/chat/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversation_id: conversationId, message, attachments }),
  });
}

export async function uploadFile(conversationId: number, file: File): Promise<any> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${apiUrl()}/chat/upload?conversation_id=${conversationId}`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error("upload failed");
  return res.json();
}

export interface WidgetEmailIn {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export async function sendWidgetEmail(
  token: string,
  data: WidgetEmailIn,
): Promise<void> {
  const res = await fetch(`${apiUrl()}/widget/email?token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("email send failed");
}

export interface WidgetLeadIn {
  channel: string;
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
}

export async function sendWidgetLead(
  token: string,
  data: WidgetLeadIn,
): Promise<void> {
  const res = await fetch(`${apiUrl()}/widget/lead?token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("lead failed");
}

export function openSocket(
  conversationId: number,
  onMessage: (data: any) => void,
): WebSocket {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(`${proto}://${new URL(apiUrl()).host}/chat/ws?conversation_id=${conversationId}`);
  ws.onmessage = (e) => onMessage(JSON.parse(e.data));
  return ws;
}
