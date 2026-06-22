import { handleApi } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

function esc(v: string | number) {
  const s = String(v ?? "");
  // Prefix formula-starting chars to prevent CSV injection in spreadsheet apps
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET() {
  return handleApi(async () => {
    const user = await requireUser();

    const accounts = await prisma.account.findMany({
      where: { userId: user.id },
      include: {
        transactions: { orderBy: { createdAt: "desc" }, take: 200 }
      }
    });

    const transferRequests = await prisma.transferRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { fromAccount: true }
    });

    const rows: string[] = [
      [
        esc("Date"), esc("Type"), esc("Description"), esc("Account"), esc("Amount"), esc("Currency"), esc("Status")
      ].join(",")
    ];

    for (const account of accounts) {
      for (const tx of account.transactions) {
        rows.push([
          esc(new Date(tx.createdAt).toISOString().slice(0, 10)),
          esc("Transaction"),
          esc(tx.description),
          esc(`${account.type} •••${account.accountNumber.slice(-4)}`),
          esc(tx.amount.toFixed(2)),
          esc(tx.currency),
          esc(tx.status)
        ].join(","));
      }
    }

    for (const tr of transferRequests) {
      rows.push([
        esc(new Date(tr.createdAt).toISOString().slice(0, 10)),
        esc("Transfer"),
        esc(`To: ${tr.beneficiaryName}${tr.beneficiaryBank ? ` (${tr.beneficiaryBank})` : ""}`),
        esc(tr.fromAccount ? `${tr.fromAccount.type} •••${tr.fromAccount.accountNumber.slice(-4)}` : ""),
        esc(`-${tr.amount.toFixed(2)}`),
        esc(tr.currency),
        esc(tr.status)
      ].join(","));
    }

    const csv = rows.join("\r\n");
    const today = new Date().toISOString().slice(0, 10);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="gclb-statement-${today}.csv"`,
        "Cache-Control": "no-store"
      }
    });
  });
}
