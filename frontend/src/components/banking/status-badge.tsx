import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const variant =
    normalized.includes("APPROVED") || normalized.includes("ACTIVE") || normalized.includes("COMPLETED") || normalized.includes("POSTED")
      ? "success"
      : normalized.includes("REJECTED") || normalized.includes("DECLINED") || normalized.includes("SUSPENDED")
        ? "danger"
        : normalized.includes("PENDING") || normalized.includes("REVIEW") || normalized.includes("REQUESTED") || normalized.includes("FROZEN")
          ? "warning"
          : "secondary";

  return <Badge variant={variant}>{status.replaceAll("_", " ")}</Badge>;
}
