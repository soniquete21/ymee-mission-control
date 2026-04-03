"use client";

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { Send, Bot, User, Loader2, AlertCircle, RefreshCw } from "lucide-react";

interface Message {
  id: string;
  content: string;
  senderId: string | null;
  agentId: string | null;
  taskId: string | null;
  createdAt: string;
  sender: { id: string; name: string } | null;
  agent: { id: string; name: string } | null;
}

interface Agent {
  id: string;
  name: string;
  slug: string;
  role: string;
  isActive: boolean;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Fetch agents
  const { data: agents } = useSWR<Agent[]>("/api/agents", fetcher);

  // Fetch messages — poll every 3s for near-real-time updates
  const chatKey = selectedAgent
    ? `/api/chat?agentId=${selectedAgent}`
    : "/api/chat";
  const { data: messages, mutate: mutateMessages } = useSWR<Message[]>(
    chatKey,
    fetcher,
    { refreshInterval: 3000 }
  );

  // Auto-select Main Agent
  useEffect(() => {
    if (agents && agents.length > 0 && !selectedAgent) {
      const mainAgent = agents.find((a) => a.slug === "main-agent");
      setSelectedAgent(mainAgent?.id || agents[0].id);
    }
  }, [agents, selectedAgent]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || sending) return;
    setError(null);
    setSending(true);

    try {
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: input.trim(),
          agentId: selectedAgent,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send message");
      }

      setInput("");
      mutateMessages();
    } catch (err) {
      setError(String(err));
    } finally {
      setSending(false);
    }
  }

  const selectedAgentName =
    agents?.find((a) => a.id === selectedAgent)?.name || "Agent";

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mission Chat</h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Communication with OpenClaw agents
          </p>
        </div>
        <button
          onClick={() => mutateMessages()}
          className="p-2 rounded-lg transition-colors hover:bg-white/5"
          title="Refresh messages"
        >
          <RefreshCw size={16} style={{ color: "var(--muted)" }} />
        </button>
      </div>

      {/* Agent selector */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {agents?.map((agent) => (
          <button
            key={agent.id}
            onClick={() => setSelectedAgent(agent.id)}
            className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
            style={{
              background:
                selectedAgent === agent.id
                  ? "var(--accent)"
                  : "rgba(124, 140, 255, 0.08)",
              color: selectedAgent === agent.id ? "#fff" : "var(--muted)",
            }}
          >
            {agent.name}
          </button>
        ))}
      </div>

      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto rounded-xl panel p-4 space-y-3"
        style={{ minHeight: 0 }}
      >
        {!messages || messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot
              size={40}
              className="mb-3"
              style={{ color: "var(--muted)" }}
            />
            <p style={{ color: "var(--muted)" }} className="text-sm">
              No messages yet with {selectedAgentName}.
            </p>
            <p style={{ color: "var(--muted)" }} className="text-xs mt-1">
              Send a message to start a conversation.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = !!msg.senderId;
            return (
              <div
                key={msg.id}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className="max-w-[80%] rounded-2xl px-4 py-3"
                  style={{
                    background: isUser
                      ? "var(--accent)"
                      : "rgba(255,255,255,0.05)",
                    color: isUser ? "#fff" : "var(--text)",
                  }}
                >
                  <div
                    className="flex items-center gap-1.5 mb-1"
                    style={{ opacity: 0.7 }}
                  >
                    {isUser ? (
                      <User size={11} />
                    ) : (
                      <Bot size={11} />
                    )}
                    <span className="text-[11px] uppercase tracking-widest">
                      {isUser
                        ? msg.sender?.name || "You"
                        : msg.agent?.name || selectedAgentName}
                    </span>
                  </div>
                  <div className="text-sm whitespace-pre-wrap">
                    {msg.content}
                  </div>
                  <div
                    className="text-[10px] mt-2"
                    style={{ opacity: 0.5 }}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {sending && (
          <div className="flex justify-start">
            <div
              className="rounded-2xl px-4 py-3 flex items-center gap-2"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <Loader2 size={14} className="animate-spin" />
              <span className="text-xs" style={{ color: "var(--muted)" }}>
                Sending to {selectedAgentName}...
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Error display */}
      {error && (
        <div
          className="flex items-center gap-2 mt-2 px-4 py-2 rounded-lg text-xs"
          style={{
            background: "rgba(251, 113, 133, 0.1)",
            color: "var(--danger)",
          }}
        >
          <AlertCircle size={14} />
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-auto underline"
          >
            dismiss
          </button>
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 mt-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
          placeholder={`Message ${selectedAgentName}...`}
          disabled={sending}
          className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
          style={{
            background: "var(--panel)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            opacity: sending ? 0.6 : 1,
          }}
        />
        <button
          onClick={sendMessage}
          disabled={sending || !input.trim()}
          className="px-4 py-3 rounded-xl transition-colors"
          style={{
            background: "var(--accent)",
            color: "#fff",
            opacity: sending || !input.trim() ? 0.5 : 1,
          }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
