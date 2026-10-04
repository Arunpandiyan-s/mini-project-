/**
 * SettingsPanel — Phase 8 Integration
 * Displays real guest profile from FastAPI.
 * Logout calls onLogout() from parent (which clears token + disconnects WS).
 * No hardcoded guest data. No webhook calls.
 */
import { LogOut, User } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import avatar from "@/assets/guest-avatar.jpg";
import type { ApiGuestProfile } from "@/lib/types";

export function SettingsPanel({
  open,
  onOpenChange,
  guest,
  onLogout,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guest: ApiGuestProfile | null;
  onLogout: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[88%] overflow-y-auto sm:max-w-md">
        <SheetHeader className="text-left">
          <SheetTitle>Profile &amp; settings</SheetTitle>
        </SheetHeader>

        <div className="mt-4 flex items-center gap-3">
          <img
            src={avatar}
            alt="Your profile photo"
            width={512}
            height={512}
            loading="lazy"
            className="h-16 w-16 rounded-2xl object-cover ring-2 ring-gold/70"
          />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">{guest?.name ?? "Guest"}</p>
            <p className="text-xs text-muted-foreground">{guest?.email ?? ""}</p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile-name">Full name</Label>
            <Input
              id="profile-name"
              defaultValue={guest?.name ?? ""}
              className="h-12 rounded-xl"
              readOnly
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-phone">Phone number</Label>
            <Input
              id="profile-phone"
              defaultValue={guest?.phone ?? ""}
              className="h-12 rounded-xl"
              readOnly
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-email">Email</Label>
            <Input
              id="profile-email"
              defaultValue={guest?.email ?? ""}
              className="h-12 rounded-xl"
              readOnly
            />
          </div>

          <div className="space-y-2">
            <Label>Preferred language</Label>
            <Select defaultValue="en">
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ar">العربية</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="hi">हिन्दी</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-2xl bg-secondary/60 p-4">
            <p className="text-sm font-semibold">Notification preferences</p>
            <div className="mt-3 space-y-3">
              {["Service updates", "Food order updates", "Checkout reminders"].map((label) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <Label htmlFor={label} className="text-sm font-normal">
                    {label}
                  </Label>
                  <Switch id={label} defaultChecked />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-muted/40 p-3 flex items-start gap-2">
            <User className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Profile details are managed by the hotel. For changes, contact the front desk.
            </p>
          </div>

          <Button
            variant="soft"
            size="xl"
            className="w-full text-destructive"
            onClick={() => {
              onOpenChange(false);
              onLogout();
            }}
          >
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}