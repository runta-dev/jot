import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUp,
  ChevronDown,
  Check,
  SquarePen,
  X,
  Square,
  Menu,
  Trash2,
  Settings,
} from "lucide-react";
import "./style.css";
import {MessageCopyButton} from "./MessageCopyButton";
import {ToolCalls} from "./ToolCalls";
import {BrowserOpenButton,BrowserPanel} from "./BrowserPanel";
import {BrowserView} from "./BrowserView";
import {applyAgentEvent,type Message} from "./chat-state";
import {SettingsPage} from "./SettingsPage";
import type {AgentEvent} from "@jot/agent";

const storageKey = "jev.chats";
const draftKey = "jot.localDraft";
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [localDraft, setLocalDraft] = useState(()=>{
    try{return localStorage.getItem(draftKey)!=="0";}catch{return true;}
  });
  const [browserOpen, setBrowserOpen] = useState(false);
  const browserToggle = useRef<HTMLButtonElement>(null);
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
  useEffect(()=>{try{localStorage.setItem(draftKey,localDraft?"1":"0");}catch{/* private mode */}},[localDraft]);
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
    setSettingsOpen(false);
    follow.current = true;
    setTimeout(() => textarea.current?.focus(), 0);
    void fetch(`/api/browser/${encodeURIComponent(fresh.id)}/warmup`,{method:'POST'}).catch(()=>{});
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
    follow.current = true;
    const controller = new AbortController();
    abort.current = controller;
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId,
          messages: history.map(({ role, content, toolCalls }) => ({ role, content, ...(toolCalls ? { toolCalls } : {}) })), localDraft,
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
          if (event.type === "tool_call" && event.call.name.startsWith("browser_")) setBrowserOpen(true);
          updateMessage(chatId, messageId, m => applyAgentEvent(m, event, event.elapsed));
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
          <SquarePen size={16} strokeWidth={1.7} />
          <span>New chat</span>
        </button>
        <div className="history-label">Chats</div>
        <nav aria-label="Conversations">
          {chats
            .filter((c) => c.messages.length)
            .map((c) => (
              <div className="history-row" key={c.id}>
                <button
                  disabled={busy}
                  className={`history-item ${!settingsOpen && c.id === chat.id ? "selected" : ""}`}
                  onClick={() => {
                    setActiveId(c.id);
                    setError("");
                    setSidebar(false);
                    setSettingsOpen(false);
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
        <button type="button" className={`sidebar-settings ${settingsOpen?"selected":""}`} onClick={()=>{setSettingsOpen(true);setSidebar(false);}}>
          <Settings size={16} strokeWidth={1.75} />
          <span>Settings</span>
        </button>
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
            <h2 className="conversation-title" title={settingsOpen?"Settings":chat.title}>{settingsOpen?"Settings":chat.title}</h2>
          </div>
          {!settingsOpen&&!browserOpen && <BrowserOpenButton buttonRef={browserToggle} onClick={() => setBrowserOpen(true)}/>}
          {configured === false && (
            <span className="setup-status">API key required</span>
          )}
        </header>
        {settingsOpen?<SettingsPage localDraft={localDraft} onLocalDraft={setLocalDraft}/>:<section
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
                  {m.role === "user" && <MessageCopyButton text={m.content}/>}
                  {m.role === "assistant" && !!m.toolCalls?.length && <ToolCalls calls={m.toolCalls} status={m.status} elapsedMs={m.elapsed}/>}
                  <div className="message-content">
                    {m.content ||
                      (m.status === "writing" ? (m.toolCalls?.length ? null : (
                        <span className="thinking">
                          Working
                        </span>
                      )) : (
                        <span className={m.status === "stopped" || m.status === "error" ? "empty-response" : undefined}>
                          {m.status === "complete"
                            ? "Done."
                            : m.status === "stopped"
                              ? "Generation stopped."
                              : m.status === "error" ? "Interrupted." : "Done."}
                        </span>
                      ))}
                  </div>
                  {m.role === "assistant" && m.content && ["limit", "budget", "stopped", "error"].includes(m.status || "") && (
                    <p className="message-status">{m.status === "limit" ? "Reply limit reached" : m.status === "budget" ? "Budget reached" : m.status === "stopped" ? "Stopped" : "Interrupted"}</p>
                  )}
                </article>
              ))}
              <div ref={end} />
            </div>
          )}
        </section>}
        {!settingsOpen&&<div className="compose-area">
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
              <div className="model-picker">
                <button type="button" className="composer-model" popoverTarget="model-menu" aria-label="Choose model">
                  Jev 1.13 <ChevronDown size={14} />
                </button>
                <div id="model-menu" popover="auto" className="model-popover">
                  <button type="button" className="model-option" popoverTarget="model-menu" popoverTargetAction="hide" aria-label="Jev 1.13, selected">
                    <span>Jev 1.13</span><Check size={14} aria-hidden="true" />
                  </button>
                </div>
              </div>
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
        </div>}
      </main>
      <BrowserPanel open={browserOpen}><BrowserView onClose={() => { setBrowserOpen(false); requestAnimationFrame(() => browserToggle.current?.focus()); }} key={chat.id} active={browserOpen} chatId={chat.id} onTakeOver={() => abort.current?.abort()}/></BrowserPanel>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
