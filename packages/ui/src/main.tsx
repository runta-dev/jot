import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUp,
  Plus,
  X,
  Square,
  ChevronDown,
  Check,
  Copy,
  Menu,
  Command,
  Trash2,
} from "lucide-react";
import "./style.css";
import {ToolCalls} from "./ToolCalls";
import {applyAgentEvent,type Message} from "./chat-state";
import type {AgentEvent,Selection} from "@jot/agent";

const storageKey = "jev.chats";
type CharacterChoice = Selection;
type Chat = { id: string; title: string; messages: Message[]; updated: number };
const uid = () => crypto.randomUUID();
const newChat = (): Chat => ({
  id: uid(),
  title: "New chat",
  messages: [],
  updated: Date.now(),
});
function restore(): Chat[] {
  try {
    const data = JSON.parse(localStorage.getItem(storageKey) || "[]");
    if (Array.isArray(data))
      return data
        .filter(
          (c) =>
            typeof c?.id === "string" &&
            typeof c.title === "string" &&
            Array.isArray(c.messages) &&
            c.messages.every(
              (m: Message) =>
                typeof m?.content === "string" &&
                ["user", "assistant"].includes(m.role),
            ),
        )
        .slice(0, 30)
        .map((c) => ({
          ...c,
          messages: c.messages.map((m: Message) =>
            m.status === "writing" ? { ...m, status: "stopped" } : m,
          ),
        }));
  } catch {
    /* storage is optional */
  }
  return [];
}
function App() {
  const [chats, setChats] = useState<Chat[]>(() => {
    const saved = restore();
    return saved.length ? saved : [newChat()];
  });
  const [activeId, setActiveId] = useState<string>("");
  const chat = chats.find((c) => c.id === activeId) || chats[0];
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [sidebar, setSidebar] = useState(false);
  const [inspect, setInspect] = useState(false);
  const [choice, setChoice] = useState<CharacterChoice | null>(null);
  const [copied, setCopied] = useState("");
  const abort = useRef<AbortController | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const scroll = useRef<HTMLElement>(null);
  const follow = useRef(true);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(chats.slice(0, 30)));
    } catch {
      /* private mode or full storage */
    }
  }, [chats]);
  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => setConfigured(d.configured))
      .catch(() => setConfigured(false));
  }, []);
  useEffect(() => {
    if (follow.current)
      end.current?.scrollIntoView({ behavior: "instant", block: "end" });
  }, [chat.messages]);
  useEffect(() => {
    if (textarea.current) {
      textarea.current.style.height = "24px";
      textarea.current.style.height =
        Math.min(textarea.current.scrollHeight, 144) + "px";
    }
  }, [input]);
  const startNew = () => {
    if (busy) return;
    const fresh = newChat();
    setChats((c) =>
      [fresh, ...c.filter((x) => x.messages.length)].slice(0, 30),
    );
    setActiveId(fresh.id);
    setInput("");
    setError("");
    setSidebar(false);
    setChoice(null);
    follow.current = true;
    setTimeout(() => textarea.current?.focus(), 0);
  };
  const deleteChat = (id: string) => {
    if (busy) return;
    const target = chats.find((c) => c.id === id);
    if (!target) return;
    const remaining = chats.filter((c) => c.id !== id);
    if (!remaining.length) remaining.push(newChat());
    setChats(remaining);
    if (chat.id === id) {
      setActiveId(remaining[0].id);
      setInput("");
      setError("");
      setChoice(null);
      follow.current = true;
    }
  };
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        if (!busy) startNew();
      }
      if (event.key === "Escape") {
        setSidebar(false);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  function updateMessage(
    chatId: string,
    messageId: string,
    update: Partial<Message> | ((m: Message) => Partial<Message>),
  ) {
    setChats((cs) =>
      cs.map((c) =>
        c.id !== chatId
          ? c
          : {
              ...c,
              messages: c.messages.map((m) =>
                m.id === messageId
                  ? {
                      ...m,
                      ...(typeof update === "function" ? update(m) : update),
                    }
                  : m,
              ),
            },
      ),
    );
  }
  async function send(text = input) {
    if (busy || !text.trim()) return;
    const content = text.trim();
    const chatId = chat.id;
    const messageId = uid();
    const history = [
      ...chat.messages.filter((m) => m.content || m.toolCalls?.length),
      { id: uid(), role: "user" as const, content },
    ];
    setChats((cs) =>
      cs.map((c) =>
        c.id === chatId
          ? {
              ...c,
              title: c.messages.length ? c.title : content.slice(0, 38),
              updated: Date.now(),
              messages: [
                ...history,
                {
                  id: messageId,
                  role: "assistant",
                  content: "",
                  status: "writing",
                },
              ],
            }
          : c,
      ),
    );
    setInput("");
    setError("");
    setBusy(true);
    setChoice(null);
    follow.current = true;
    const controller = new AbortController();
    abort.current = controller;
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map(({ role, content, toolCalls }) => ({ role, content, ...(toolCalls ? { toolCalls } : {}) })),
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Could not connect to Jev.");
      }
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finished = false;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as (AgentEvent & {elapsed:number}) | {type:"error";error:string};
          if (event.type === "error") throw new Error(event.error);
          updateMessage(chatId, messageId, m => applyAgentEvent(m, event, event.elapsed));
          if (event.type === "text_delta" && event.selection) setChoice(event.selection);
          if (event.type === "done") finished = true;
        }
      }
      if (!finished)
        throw new Error("Connection interrupted. Please try again.");
    } catch (err) {
      if (controller.signal.aborted)
        updateMessage(chatId, messageId, { status: "stopped" });
      else {
        setError((err as Error).message);
        updateMessage(chatId, messageId, { status: "error" });
      }
    } finally {
      controller.abort();
      abort.current = null;
      setBusy(false);
      textarea.current?.focus();
    }
  }
  const empty = chat.messages.length === 0;
  return (
    <div className="app">
      {sidebar && <div className="scrim" onClick={() => setSidebar(false)} />}
      <aside className={`sidebar ${sidebar ? "open" : ""}`}>
        <button className="new-chat" onClick={startNew} disabled={busy}>
          <Plus size={16} />
          <span>New chat</span>
          <span className="shortcut">
            <Command size={10} /> K
          </span>
        </button>
        <div className="history-label">Chats</div>
        <nav aria-label="Conversations">
          {chats
            .filter((c) => c.messages.length)
            .map((c) => (
              <div className="history-row" key={c.id}>
                <button
                  disabled={busy}
                  className={`history-item ${c.id === chat.id ? "selected" : ""}`}
                  onClick={() => {
                    setActiveId(c.id);
                    setError("");
                    setSidebar(false);
                    setChoice(null);
                    follow.current = true;
                  }}
                >
                  <span>{c.title}</span>
                </button>
                <button
                  className="delete-chat"
                  disabled={busy}
                  aria-label={`Delete chat: ${c.title}`}
                  title="Delete chat"
                  onClick={() => deleteChat(c.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          {!chats.some((c) => c.messages.length) && (
            <p className="history-empty">No conversations yet.</p>
          )}
        </nav>
      </aside>
      <main className="workspace">
        <header>
          <div className="header-left">
            <button
              className="mobile-menu icon-button"
              aria-label="Open sidebar"
              onClick={() => setSidebar(true)}
            >
              <Menu size={20} />
            </button>
          </div>
          {configured === false && (
            <span className="setup-status">API key required</span>
          )}
        </header>
        <section
          className={`conversation ${empty ? "is-empty" : ""}`}
          ref={scroll}
          onScroll={() => {
            const el = scroll.current;
            if (el)
              follow.current =
                el.scrollHeight - el.scrollTop - el.clientHeight < 120;
          }}
        >
          {empty ? (
            <div className="welcome">
              <h1><img className="welcome-wordmark" src="/brand/jot-wordmark.svg" alt="Jot" width="176" height="64" /></h1>
              <p className="intro">What would you like to talk about?</p>
            </div>
          ) : (
            <div className="messages">
              {chat.messages.map((m) => (
                <article className={`message ${m.role}`} key={m.id}>
                  {m.role === "assistant" && (
                    <div className="message-label">
                      <span className="avatar"><img src="/brand/jot-mark.svg" alt="" width="24" height="24" /></span>Jot
                    </div>
                  )}
                  {m.role === "assistant" && !!m.toolCalls?.length && <ToolCalls calls={m.toolCalls} status={m.status}/>}
                  <div className="message-content">
                    {m.content ||
                      (m.status === "writing" ? (m.toolCalls?.length ? null : (
                        <span className="thinking">
                          Working<span>...</span>
                        </span>
                      )) : (
                        <span className="empty-response">
                          {m.status === "complete"
                            ? "The reply ended without text."
                            : m.status === "stopped"
                              ? "Generation stopped."
                              : "No response received."}
                        </span>
                      ))}
                    {m.status === "writing" && m.content && (
                      <span className="cursor" />
                    )}
                  </div>
                  {m.role === "assistant" &&
                    m.status !== "writing" &&
                    m.content && (
                      <div className="message-meta">
                        <span>{((m.elapsed || 0) / 1000).toFixed(1)}s</span>
                        {m.status === "repetition" && (
                          <span>· Repetition detected, stopped</span>
                        )}
                        {m.status === "limit" && (
                          <span>· Reply limit reached</span>
                        )}
                        {m.status === "budget" && <span>· Budget reached</span>}
                        {m.status === "stopped" && <span>· Stopped</span>}
                        {m.status === "error" && <span>· Interrupted</span>}
                        <button
                          className="copy-button"
                          aria-label="Copy response"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(m.content);
                              setCopied(m.id);
                              setTimeout(() => setCopied(""), 2000);
                            } catch {
                              setError(
                                "Clipboard unavailable in this browser.",
                              );
                            }
                          }}
                        >
                          {copied === m.id ? (
                            <Check size={13} />
                          ) : (
                            <Copy size={13} />
                          )}
                        </button>
                      </div>
                    )}
                </article>
              ))}
              <div ref={end} />
            </div>
          )}
        </section>
        <div className="compose-area">
          {error && (
            <div role="alert" className="error">
              <span>{error}</span>
              <button
                className="icon-button"
                aria-label="Dismiss error"
                onClick={() => setError("")}
              >
                <X size={14} />
              </button>
            </div>
          )}
          {inspect && (
            <div className="inspector">
              <div>
                <span>Selected continuation</span>
                <span className="inspector-caption">
                  {choice
                    ? `Selected: ${choice.choice === " " ? "space" : choice.choice === "\n" ? "newline" : choice.choice}`
                    : "Waiting for a reply"}
                </span>
              </div>
              {choice && (
                <div className="alternatives">
                  {choice.alternatives.map((a) => (
                    <div key={a.char}>
                      <code>
                        {a.char === " " ? "␣" : a.char === "\n" ? "↵" : a.char}
                      </code>
                      <span>{(a.probability * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <form
            className={`composer ${busy ? "generating" : ""}`}
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <textarea
              ref={textarea}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message Jot"
              aria-label="Message Jot"
              maxLength={4000}
              rows={1}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            <div className="composer-bottom">
              <button
                type="button"
                className={`choice-toggle ${inspect ? "active" : ""}`}
                aria-expanded={inspect}
                onClick={() => setInspect(!inspect)}
              >
                <span className="choice-icon">[a]</span>Details
                <ChevronDown size={12} />
              </button>
              {busy ? (
                <button
                  className="send-button stop"
                  type="button"
                  onClick={() => abort.current?.abort()}
                  aria-label="Stop generation"
                >
                  <Square size={14} fill="currentColor" />
                </button>
              ) : (
                <button
                  className="send-button"
                  type="submit"
                  disabled={!input.trim() || configured === false}
                  aria-label="Send message"
                >
                  <ArrowUp size={19} />
                </button>
              )}
            </div>
          </form>
        </div>
      </main>

    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
