import { useEffect, useRef, useState, useCallback } from "react";
import { MessageSquare, Send, Loader2, User, ConciergeBell, Check, CheckCheck } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getGuestMessages, sendGuestMessage } from "@/lib/api";
import type { ApiGuestMessage } from "@/lib/types";

interface ReceptionChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservationId?: string;
  guestName?: string;
}

export function ReceptionChatModal({
  open,
  onOpenChange,
  reservationId,
  guestName = "Guest",
}: ReceptionChatModalProps) {
  const [messages, setMessages] = useState<ApiGuestMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchHistory = useCallback(async () => {
    try {
      const data = await getGuestMessages(reservationId);
      setMessages(data);
    } catch {
      // ignore
    }
  }, [reservationId]);

  useEffect(() => {
    if (open) {
      setFetching(true);
      fetchHistory().finally(() => setFetching(false));

      // Poll every 5s while open
      const interval = setInterval(fetchHistory, 5000);
      return () => clearInterval(interval);
    }
  }, [open, fetchHistory]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const text = input.trim();
    setInput("");
    setLoading(true);

    try {
      const newMsg = await sendGuestMessage(text, reservationId);
      setMessages((prev) => [...prev, newMsg]);
    } catch {
      setInput(text);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto flex h-[85vh] max-w-lg flex-col rounded-t-[2rem] p-0 overflow-hidden bg-card"
      >
        <SheetHeader className="border-b border-border/80 px-5 py-4 text-left bg-muted/40">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <ConciergeBell className="size-5" />
            </div>
            <div>
              <SheetTitle className="text-base font-bold text-foreground">
                Front Desk Reception
              </SheetTitle>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                Live 24/7 Hotel Staff Assistance
              </p>
            </div>
          </div>
        </SheetHeader>

        {/* Message history */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {fetching && messages.length === 0 ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center px-4">
              <div className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground mb-3">
                <MessageSquare className="size-6" />
              </div>
              <p className="text-sm font-bold text-foreground">Welcome, {guestName}!</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Need anything during your stay? Send a message directly to reception staff.
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isGuest = m.sender_type === "guest";
              return (
                <div
                  key={m.message_id || m.id}
                  className={`flex flex-col ${isGuest ? "items-end" : "items-start"}`}
                >
                  <span className="text-[10px] font-semibold text-muted-foreground mb-1 px-1">
                    {isGuest ? "You" : m.sender_name}
                  </span>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs font-medium shadow-xs ${
                      isGuest
                        ? "bg-primary text-primary-foreground rounded-br-xs"
                        : "bg-muted text-foreground rounded-bl-xs border border-border/80"
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                    <div
                      className={`mt-1 flex items-center justify-end gap-1 text-[9px] ${
                        isGuest ? "text-primary-foreground/75" : "text-muted-foreground"
                      }`}
                    >
                      <span>
                        {new Date(m.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {isGuest && (m.is_read ? <CheckCheck className="size-3" /> : <Check className="size-3" />)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input box */}
        <form onSubmit={handleSend} className="border-t border-border/80 p-3 bg-muted/20">
          <div className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask reception a question..."
              className="h-11 rounded-xl text-xs"
              disabled={loading}
            />
            <Button
              type="submit"
              disabled={loading || !input.trim()}
              size="icon"
              className="size-11 shrink-0 rounded-xl"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
