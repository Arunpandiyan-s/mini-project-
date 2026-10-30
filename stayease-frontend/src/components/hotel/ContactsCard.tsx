import { useState } from "react";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { contacts, type Contact } from "@/lib/hotel-data";

export function ContactsCard() {
  const [active, setActive] = useState<Contact | null>(null);

  return (
    <section className="card-surface p-4" aria-labelledby="contacts-title">
      <h2 id="contacts-title" className="text-base font-semibold">
        Hotel contacts
      </h2>
      <p className="text-xs text-muted-foreground">Call, WhatsApp or email any desk instantly.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {contacts.map((contact) => (
          <button
            key={contact.name}
            type="button"
            onClick={() => setActive(contact)}
            className="rounded-xl bg-secondary/70 px-3 py-3 text-left transition active:scale-[0.98]"
          >
            <span className="block text-sm font-semibold">{contact.name}</span>
            <span className="block text-xs text-muted-foreground">{contact.detail}</span>
          </button>
        ))}
      </div>

      <Sheet open={active !== null} onOpenChange={(open) => !open && setActive(null)}>
        <SheetContent side="bottom" className="rounded-t-[1.75rem] pb-8">
          <SheetHeader className="text-left">
            <SheetTitle>{active?.name}</SheetTitle>
            <SheetDescription>{active?.detail}</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            <Button variant="hero" size="xl" className="w-full" asChild>
              <a href={`tel:${active?.phone}`}>
                <Phone className="h-4 w-4" /> Call
              </a>
            </Button>
            <Button variant="gold" size="xl" className="w-full" asChild>
              <a
                href={`https://wa.me/${active?.phone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            </Button>
            <Button variant="outline" size="xl" className="w-full" asChild>
              <a href={`mailto:${active?.email}`}>
                <Mail className="h-4 w-4" /> Email
              </a>
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}