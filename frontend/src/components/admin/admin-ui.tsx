import { AlertTriangle, Inbox, LoaderCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: React.ReactNode }) {
  return <header className="admin-page-header"><div className="min-w-0">{eyebrow ? <p className="text-[0.7rem] font-black uppercase tracking-[.2em] text-emerald-300/70">{eyebrow}</p> : null}<h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">{title}</h1>{description ? <p className="mt-1 max-w-3xl text-sm text-white/45">{description}</p> : null}</div>{actions ? <div className="shrink-0">{actions}</div> : null}</header>;
}

export function StatCard({ label, value, description }: { label: string; value: string | number; description?: string }) {
  return <Card className="admin-stat-card"><CardContent className="p-4"><p className="text-[0.7rem] font-bold uppercase tracking-wider text-white/40">{label}</p><p className="mt-1 text-2xl font-black text-white">{value}</p>{description ? <p className="mt-0.5 truncate text-xs text-white/35" title={description}>{description}</p> : null}</CardContent></Card>;
}

export function ResponsiveTable({ children, label }: { children: React.ReactNode; label: string }) { return <div className="admin-table-scroll" role="region" aria-label={label} tabIndex={0}>{children}</div>; }
export function FilterBar({ children }: { children: React.ReactNode }) { return <div className="admin-filter-bar">{children}</div>; }
export function FormSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) { return <section className="admin-form-section"><div><h2 className="font-black text-white">{title}</h2>{description ? <p className="text-sm text-white/45">{description}</p> : null}</div><div className="min-w-0">{children}</div></section>; }
export function EmptyState({ title = "Nothing here yet", description }: { title?: string; description?: string }) { return <div className="admin-state"><Inbox className="size-6" /><strong>{title}</strong>{description ? <p>{description}</p> : null}</div>; }
export function LoadingState({ label = "Loading" }: { label?: string }) { return <div className="admin-state" aria-live="polite"><LoaderCircle className="size-6 animate-spin" /><strong>{label}</strong></div>; }
export function ErrorState({ message }: { message: string }) { return <div className="admin-state text-red-200" role="alert"><AlertTriangle className="size-6" /><strong>Could not load this section</strong><p>{message}</p></div>; }
export function MobileActionBar({ children }: { children: React.ReactNode }) { return <div className="admin-mobile-actions">{children}</div>; }
export function ConfirmationDialog({ open, title, description, onCancel, onConfirm }: { open: boolean; title: string; description: string; onCancel: () => void; onConfirm: () => void }) { return open ? <div className="admin-dialog-backdrop" role="presentation"><div role="alertdialog" aria-modal="true" aria-labelledby="confirmation-title" className="admin-dialog"><h2 id="confirmation-title" className="text-lg font-black">{title}</h2><p className="mt-2 text-sm text-white/55">{description}</p><div className="mt-5 flex justify-end gap-2"><button onClick={onCancel} className="rounded-lg border border-white/10 px-4 py-2">Cancel</button><button onClick={onConfirm} className="rounded-lg bg-red-500 px-4 py-2 font-bold">Confirm</button></div></div></div> : null; }
