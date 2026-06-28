import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Send, Copy, Download, Loader2, BrainCircuit, RotateCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "nexagrowth-strategist-chat";
const CHAT_ID = "marketing-strategist";

const SEED_GREETING: UIMessage = {
  id: "seed-greeting",
  role: "assistant",
  parts: [
    {
      type: "text",
      text:
        "👋 Hey, I'm **NexaGrowth AI** — your on-demand marketing strategist.\n\nI can build you a complete growth strategy: channel mix, 30-day plan, content ideas, budget allocation, and KPI targets.\n\nTo get started, tell me:\n- **What's your business?**\n- **Who's your target audience?**\n- **Monthly marketing budget?**\n- **Top goal for the next 90 days?**",
    },
  ],
};

function loadMessages(): UIMessage[] {
  if (typeof window === "undefined") return [SEED_GREETING];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [SEED_GREETING];
    const parsed = JSON.parse(raw) as UIMessage[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [SEED_GREETING];
  } catch {
    return [SEED_GREETING];
  }
}

function messageText(m: UIMessage): string {
  return m.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("");
}

const SUGGESTIONS = [
  "I run a B2B SaaS. Build me a 90-day plan.",
  "How should I allocate a $3k/mo budget?",
  "Give me 10 content ideas for my D2C brand.",
];

export const MarketingStrategist = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [initialMessages] = useState<UIMessage[]>(loadMessages);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const transport = useRef(
    new DefaultChatTransport({
      api: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/marketing-strategist`,
      headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
    })
  ).current;

  const { messages, sendMessage, status, setMessages, error } = useChat({
    id: CHAT_ID,
    messages: initialMessages,
    transport,
    onError: (err) => {
      const text = err?.message ?? "";
      if (text.includes("429")) toast.error("Rate limit hit. Try again in a moment.");
      else if (text.includes("402")) toast.error("AI credits exhausted. Please top up.");
      else toast.error("Something went wrong. Try again.");
    },
  });

  // Persist
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {}
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  // Focus textarea on open
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  const isBusy = status === "submitted" || status === "streaming";

  const handleSubmit = async (text?: string) => {
    const value = (text ?? input).trim();
    if (!value || isBusy) return;
    setInput("");
    await sendMessage({ text: value });
  };

  const handleReset = () => {
    setMessages([SEED_GREETING]);
    toast.success("Conversation reset");
  };

  const handleCopy = (m: UIMessage) => {
    navigator.clipboard.writeText(messageText(m));
    toast.success("Copied to clipboard");
  };

  const handleDownload = (m: UIMessage) => {
    const blob = new Blob([messageText(m)], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexagrowth-strategy-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Strategy downloaded");
  };

  return (
    <>
      {/* Floating launcher */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="launcher"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-50 group"
            aria-label="Open AI Marketing Strategist"
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-accent blur-lg opacity-60 group-hover:opacity-100 transition-opacity" />
            <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-xl">
              <BrainCircuit className="w-6 h-6 text-white" />
            </div>
            <span className="absolute -top-2 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-accent" />
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-6 right-6 z-50 w-[calc(100vw-3rem)] sm:w-[420px] h-[calc(100vh-3rem)] sm:h-[640px] sm:max-h-[80vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
            style={{
              background: "hsl(var(--card) / 0.85)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid hsl(var(--border) / 0.6)",
              boxShadow: "0 24px 60px -12px hsl(250 80% 20% / 0.6), 0 0 0 1px hsl(var(--primary) / 0.1)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/50 bg-gradient-to-r from-primary/10 via-transparent to-accent/10">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <BrainCircuit className="w-4 h-4 text-white" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-card" />
                </div>
                <div>
                  <p className="font-heading font-semibold text-sm leading-tight">NexaGrowth AI</p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> Marketing Strategist
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleReset}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-colors"
                  title="Reset conversation"
                  aria-label="Reset conversation"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
              {messages.map((m) => {
                const isUser = m.role === "user";
                const text = messageText(m);
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[88%] ${isUser ? "order-2" : ""}`}>
                      {isUser ? (
                        <div className="px-4 py-2.5 rounded-2xl rounded-tr-sm bg-gradient-to-br from-primary to-accent text-primary-foreground text-sm leading-relaxed shadow-sm">
                          {text}
                        </div>
                      ) : (
                        <div className="rounded-2xl rounded-tl-sm bg-secondary/40 border border-border/50 p-4 text-sm">
                          <div className="prose prose-sm prose-invert max-w-none prose-headings:font-heading prose-headings:font-semibold prose-headings:mb-2 prose-headings:mt-3 prose-headings:first:mt-0 prose-h1:text-base prose-h2:text-sm prose-h3:text-sm prose-p:my-2 prose-p:leading-relaxed prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-strong:text-foreground prose-strong:font-semibold prose-code:text-accent prose-code:bg-background/50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-[12px] prose-code:before:content-none prose-code:after:content-none prose-table:text-xs prose-th:text-foreground prose-hr:border-border">
                            <ReactMarkdown>{text || (isBusy ? " " : "")}</ReactMarkdown>
                          </div>
                          {text && m.id !== "seed-greeting" && (
                            <div className="flex gap-1 mt-3 pt-3 border-t border-border/40">
                              <button
                                onClick={() => handleCopy(m)}
                                className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded hover:bg-secondary/60 transition-colors"
                              >
                                <Copy className="w-3 h-3" /> Copy
                              </button>
                              <button
                                onClick={() => handleDownload(m)}
                                className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded hover:bg-secondary/60 transition-colors"
                              >
                                <Download className="w-3 h-3" /> Download
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {status === "submitted" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="rounded-2xl rounded-tl-sm bg-secondary/40 border border-border/50 px-4 py-3 text-sm flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    <span className="text-muted-foreground">Thinking…</span>
                  </div>
                </motion.div>
              )}

              {/* Quick suggestions when empty-ish */}
              {messages.length === 1 && !isBusy && (
                <div className="space-y-2 pt-2">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide px-1">Try asking</p>
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSubmit(s)}
                      className="w-full text-left text-xs px-3 py-2 rounded-lg bg-secondary/40 hover:bg-secondary border border-border/40 hover:border-primary/40 text-muted-foreground hover:text-foreground transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Composer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
              className="p-3 border-t border-border/50 bg-background/40"
            >
              <div className="flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  placeholder="Ask anything about marketing…"
                  rows={1}
                  className="flex-1 resize-none bg-secondary/40 border border-border/50 rounded-xl px-3 py-2.5 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 max-h-32"
                  disabled={isBusy}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || isBusy}
                  className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent hover:opacity-90 shrink-0"
                  aria-label="Send"
                >
                  {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 text-center">
                Powered by Lovable AI · Saved in your browser
              </p>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MarketingStrategist;
