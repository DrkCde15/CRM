import { useEffect, useRef, useState } from "react";

const menuBtn: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 10px",
  border: "none",
  borderRadius: 8,
  background: "#f1f5f9",
  cursor: "pointer",
  fontSize: 14,
  textAlign: "left",
  color: "#0f172a",
};

const inp: React.CSSProperties = {
  padding: "8px 10px",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  fontSize: 14,
  fontFamily: "inherit",
  width: "100%",
  boxSizing: "border-box",
};
import {
  ChatMessage,
  VisitorInfo,
  connect,
  fetchConfig,
  loadHistory,
  openSocket,
  sendMessage,
  sendWidgetEmail,
  sendWidgetLead,
  uploadFile,
} from "./api";

interface Props {
  token: string;
}

export default function ChatWidget({ token }: Props) {
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({ name: "", email: "", message: "" });
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [config, setConfig] = useState<any>(null);
  const [convId, setConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [busy, setBusy] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEnd = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchConfig(token)
      .then(setConfig)
      .catch(() => setConfig({ name: "Convexo", welcome_message: "Olá!", primary_color: "#059669" }))
      .finally(() => setBusy(false));
  }, [token]);

  const ensureSession = async () => {
    if (convId) return convId;
    const info: VisitorInfo = {
      session_id:
        (window as any).CONVEXO_SESSION ||
        (() => {
          const s = crypto.randomUUID();
          (window as any).CONVEXO_SESSION = s;
          return s;
        })(),
      user_agent: navigator.userAgent,
    };
    const conv = await connect(info);
    setConvId(conv.id);
    const hist = await loadHistory(conv.id);
    setMessages(hist);
    return conv.id;
  };

  useEffect(() => {
    if (!open || convId === null) return;
    const ws = openSocket(convId, (data) => {
      if (data.type === "typing") setTyping(true);
      else if (data.type === "message") {
        setTyping(false);
        setMessages((m) => [
          ...m,
          {
            id: data.id,
            sender: data.sender,
            message: data.message,
            attachments: data.attachments || [],
            created_at: data.created_at,
          },
        ]);
      }
    });
    wsRef.current = ws;
    return () => ws.close();
  }, [open, convId]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const send = async () => {
    const value = text.trim();
    if (!value) return;
    const id = await ensureSession();
    setText("");
    await sendMessage(id, value, []);
    setMessages((m) => [...m, { id: Date.now(), sender: "visitor", message: value, attachments: [], created_at: new Date().toISOString() }]);
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const id = await ensureSession();
    await uploadFile(id, file);
  };

  const openSite = () => {
    setMenu(false);
    setOpen(true);
  };
  const openWhatsApp = () => {
    const num = (config?.whatsapp_number || "5500000000000").replace(/\D/g, "");
    sendWidgetLead(token, {
      channel: "whatsapp",
      phone: num,
      message: "Cliente clicou em falar pelo WhatsApp.",
    }).catch(() => {});
    const text = encodeURIComponent("Olá! Gostaria de falar com o suporte.");
    window.open(`https://wa.me/${num}?text=${text}`, "_blank");
    setMenu(false);
  };
  const openEmail = () => {
    setMenu(false);
    setEmailOpen(true);
  };
  const submitEmail = async () => {
    setEmailError("");
    try {
      await sendWidgetEmail(token, {
        name: emailForm.name,
        email: emailForm.email,
        subject: "Atendimento via site",
        message: emailForm.message,
      });
      setEmailSent(true);
    } catch (e) {
      setEmailError("Falha ao enviar. Tente novamente.");
    }
  };

  if (busy) return null;
  const primary = config?.primary_color || "#059669";
  const dark = config?.theme === "dark";
  const pos = config?.position === "left" ? "left" : "";

  return (
    <div className={`cvx-root ${pos} ${dark ? "cvx-dark" : ""}`} style={{ ["--cvx-primary" as any]: primary }}>
      {open && (
        <div className="cvx-panel">
          <div className="cvx-header" style={{ background: primary }}>
            {config?.logo_url ? (
              <img src={config.logo_url} alt="" width={32} height={32} style={{ borderRadius: 8 }} />
            ) : null}
            <div>
              <div style={{ fontWeight: 700 }}>{config?.name || "Convexo"}</div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>Online</div>
            </div>
            <div style={{ marginLeft: "auto", cursor: "pointer" }} onClick={() => setOpen(false)}>
              ✕
            </div>
          </div>
          <div className="cvx-messages">
            <div className="cvx-msg agent">{config?.welcome_message || "Olá! Como podemos ajudar?"}</div>
            {messages.map((m) => (
              <div key={m.id} className={`cvx-msg ${m.sender}`}>
                {m.message}
              </div>
            ))}
            <div ref={messagesEnd} />
          </div>
          {typing && <div className="cvx-typing">digitando…</div>}
          <div className="cvx-input">
            <input
              value={text}
              placeholder="Escreva uma mensagem…"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
            />
            <input type="file" style={{ display: "none" }} id="cvx-file" onChange={onFile} />
            <label htmlFor="cvx-file" style={{ cursor: "pointer", alignSelf: "center" }}>📎</label>
            <button onClick={send}>Enviar</button>
          </div>
        </div>
      )}

      {!open && emailOpen && (
        <div className="cvx-panel">
          <div className="cvx-header" style={{ background: primary }}>
            <div style={{ fontWeight: 700 }}>Falar por e-mail</div>
            <div style={{ marginLeft: "auto", cursor: "pointer" }} onClick={() => setEmailOpen(false)}>
              ✕
            </div>
          </div>
          {emailSent ? (
            <div className="cvx-messages">
              <div className="cvx-msg agent">Mensagem enviada! Em breve entraremos em contato.</div>
            </div>
          ) : (
            <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <input
                placeholder="Seu nome"
                value={emailForm.name}
                onChange={(e) => setEmailForm({ ...emailForm, name: e.target.value })}
                style={inp}
              />
              <input
                placeholder="Seu e-mail"
                value={emailForm.email}
                onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
                style={inp}
              />
              <textarea
                placeholder="Sua mensagem"
                value={emailForm.message}
                onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
                style={{ ...inp, minHeight: 80 }}
              />
              {emailError && <div style={{ color: "#dc2626", fontSize: 12 }}>{emailError}</div>}
              <button
                onClick={submitEmail}
                style={{ ...inp, background: primary, color: "#fff", cursor: "pointer" }}
              >
                Enviar
              </button>
            </div>
          )}
        </div>
      )}

      {!open && !emailOpen && (
        <>
          {menu && (
            <div
              className="cvx-channel-menu"
              style={{
                position: "absolute",
                bottom: 72,
                ...(pos === "left" ? { left: 0 } : { right: 0 }),
                background: "#fff",
                color: "#0f172a",
                borderRadius: 12,
                boxShadow: "0 8px 24px rgba(15,23,42,0.18)",
                padding: 8,
                display: "flex",
                flexDirection: "column",
                gap: 6,
                minWidth: 190,
                zIndex: 9999,
              }}
            >
              <button style={menuBtn} onClick={openSite}>💬 Chat no site</button>
              <button style={menuBtn} onClick={openWhatsApp}>📱 WhatsApp</button>
              <button style={menuBtn} onClick={openEmail}>✉️ E-mail</button>
            </div>
          )}
          <div
            className="cvx-bubble"
            style={{ background: primary }}
            onClick={() => setMenu((m) => !m)}
          >
            💬
          </div>
        </>
      )}
    </div>
  );
}
