import { useState } from "react";
import { Send, MessageSquare, ShieldQuestion, CalendarDays, Package, Siren } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/store";

const TOPICS = [
  { id: "Message Manager", icon: MessageSquare },
  { id: "Request Permission", icon: ShieldQuestion },
  { id: "Request Leave", icon: CalendarDays },
  { id: "Request Supplies", icon: Package },
  { id: "Report Emergency", icon: Siren },
];

export function CommunicationPanel() {
  const { messages, sendMessage } = useApp();
  const [topic, setTopic] = useState(TOPICS[0]!.id);
  const [text, setText] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendMessage(topic, text.trim());
    setText("");
    toast.success(
      topic === "Report Emergency" ? "Emergency reported to management" : `${topic} sent`,
    );
  };

  return (
    <section className="surface flex flex-col p-5">
      <h2 className="text-lg font-semibold">Communication</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">Reach your manager in one tap.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {TOPICS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTopic(t.id)}
            className={cn(
              "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors",
              topic === t.id
                ? t.id === "Report Emergency"
                  ? "border-destructive bg-destructive/10 text-destructive"
                  : "border-primary bg-primary-soft text-accent-foreground"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            <t.icon className="size-3.5" />
            {t.id}
          </button>
        ))}
      </div>

      <div className="mt-4 max-h-72 space-y-3 overflow-y-auto rounded-2xl bg-muted/50 p-3">
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.from === "me" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-soft",
                m.from === "me"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-card-foreground",
              )}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                {m.topic}
              </p>
              <p className="mt-1 leading-relaxed">{m.text}</p>
              <p className="mt-1 text-[10px] opacity-70">{m.time}</p>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="mt-3 flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Write your ${topic.toLowerCase()}...`}
          className="h-12 rounded-xl"
          maxLength={300}
        />
        <Button type="submit" className="h-12 w-12 shrink-0 rounded-xl p-0" aria-label="Send">
          <Send className="size-4" />
        </Button>
      </form>
    </section>
  );
}
