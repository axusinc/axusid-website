import { AtSign, Check, Eye, FilePlus, Gauge, KeyRound, Layers, Share2, Shield, Ticket, UserPlus, Users } from "lucide-react";

const icons = { "at-sign": AtSign, check: Check, eye: Eye, "file-plus": FilePlus, gauge: Gauge, key: KeyRound, layers: Layers, share: Share2, shield: Shield, ticket: Ticket, "user-plus": UserPlus, users: Users };
export function PermissionIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = name && Object.hasOwn(icons, name) ? icons[name as keyof typeof icons] : KeyRound;
  return <Icon aria-hidden className={className ?? "h-4 w-4 shrink-0 text-neutral-400"} />;
}
