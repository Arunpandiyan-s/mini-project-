import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send, Sparkles, User, AlertCircle } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiChatMessage } from "@/lib/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isError?: boolean;
}

const suggestedPrompts = [
  "What time is checkout?",
  "Can I request extra towels?",
  "Recommend a good local restaurant",
  "What are the spa & pool hours?",
];

interface AiConciergeChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AiConciergeChat({ open, onOpenChange }: AiConciergeChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello Aisha! 👋 I am your StayEase AI Concierge. How can I assist with your stay in Room 512 today?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (open) {
      setTimeout(scrollToBottom, 150);
    }
  }, [open, messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input.trim();
    if (!text || loading) return;

    const timeStamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: timeStamp,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setLoading(true);

    try {
      // Build brief history for context
      const history = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const reply = await apiChatMessage(text, history);

      const assistantMsg: Message = {
        id: `agent-${Date.now()}`,
        role: "assistant",
        content: reply || "I've received your request and forwarded it to our concierge desk.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error(err);
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content:
          "I'm having a brief connection issue with the agent server. Your message was logged, or you can retry below.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex h-[88vh] flex-col rounded-t-[1.75rem] p-0 sm:max-w-md sm:ml-auto sm:mr-6 sm:mb-6 sm:h-[85vh] sm:rounded-3xl sm:border sm:border-border/60 sm:shadow-2xl"
      >
        {/* Header */}
        <SheetHeader className="border-b border-border/60 px-5 py-4 text-left gradient-gold/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative grid h-10 w-10 place-items-center rounded-xl gradient-gold text-gold-foreground shadow-sm">
                <Sparkles className="h-5 w-5" />
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background" />
              </div>
              <div>
                <SheetTitle className="text-base font-semibold">AI Concierge Assistant</SheetTitle>
                <p className="text-xs text-muted-foreground">Connected to SNS Agent Hub</p>
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-none"
                    : msg.isError
                      ? "bg-destructive/15 text-destructive border border-destructive/30 rounded-bl-none"
                      : "bg-secondary text-secondary-foreground rounded-bl-none"
                }`}
              >
                {msg.isError && (
                  <div className="flex items-center gap-1.5 font-semibold text-xs mb-1">
                    <AlertCircle className="h-3.5 w-3.5" /> Notice
                  </div>
                )}
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                <span className="mt-1 block text-[10px] opacity-70 text-right">
                  {msg.timestamp}
                </span>
              </div>

              {msg.role === "user" && (
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-none bg-secondary px-4 py-3 text-xs">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Agent is thinking…</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggest Chips */}
        {messages.length < 5 && !loading && (
          <div className="px-5 pb-2">
            <p className="mb-2 text-xs text-muted-foreground font-medium">Suggested questions:</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSend(prompt)}
                  className="rounded-full border border-border/80 bg-background px-3 py-1.5 text-xs text-foreground transition hover:bg-secondary active:scale-[0.98]"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="border-t border-border bg-background p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask AI Concierge anything…"
              className="h-12 rounded-xl text-sm"
              disabled={loading}
            />
            <Button
              type="submit"
              variant="hero"
              size="icon"
              className="h-12 w-12 shrink-0 rounded-xl"
              disabled={!input.trim() || loading}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
