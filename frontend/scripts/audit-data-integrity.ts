import { prisma } from "../src/lib/db";

type Finding = { code: string; recordId: string };
const findings: Finding[] = [];
const hasSubCentPrecision = (value: number) =>
  !Number.isFinite(value) || Math.abs(value * 100 - Math.round(value * 100)) > 1e-7;

async function main() {
  const [accounts, transactions, transfers, tickets, messages] = await Promise.all([
    prisma.account.findMany({ select: { id: true, balance: true, availableBalance: true } }),
    prisma.transaction.findMany({ select: { id: true, accountId: true, reference: true, amount: true } }),
    prisma.transferRequest.findMany({ select: { id: true, amount: true, status: true } }),
    prisma.supportTicket.findMany({ select: { id: true } }),
    prisma.supportMessage.findMany({ select: { id: true, ticketId: true } })
  ]);

  const accountIds = new Set(accounts.map((account) => account.id));
  const ticketIds = new Set(tickets.map((ticket) => ticket.id));
  const references = new Map<string, string>();
  const ledgerReferences = new Set(transactions.map((transaction) => transaction.reference));

  for (const account of accounts) {
    if (hasSubCentPrecision(Number(account.balance)) || hasSubCentPrecision(Number(account.availableBalance))) {
      findings.push({ code: "ACCOUNT_SUB_CENT_PRECISION", recordId: account.id });
    }
  }
  for (const transaction of transactions) {
    if (!accountIds.has(transaction.accountId)) findings.push({ code: "ORPHAN_TRANSACTION", recordId: transaction.id });
    if (hasSubCentPrecision(Number(transaction.amount))) findings.push({ code: "TRANSACTION_SUB_CENT_PRECISION", recordId: transaction.id });
    const prior = references.get(transaction.reference);
    if (prior) findings.push({ code: "DUPLICATE_TRANSACTION_REFERENCE", recordId: transaction.id });
    else references.set(transaction.reference, transaction.id);
  }
  for (const transfer of transfers) {
    if (hasSubCentPrecision(Number(transfer.amount))) findings.push({ code: "TRANSFER_SUB_CENT_PRECISION", recordId: transfer.id });
    if (transfer.status === "APPROVED" && !ledgerReferences.has(`TRF-${transfer.id}`)) {
      findings.push({ code: "APPROVED_TRANSFER_WITHOUT_LEDGER", recordId: transfer.id });
    }
  }
  for (const message of messages) {
    if (!ticketIds.has(message.ticketId)) findings.push({ code: "ORPHAN_SUPPORT_MESSAGE", recordId: message.id });
  }

  console.log(JSON.stringify({
    scanned: {
      accounts: accounts.length,
      transactions: transactions.length,
      transfers: transfers.length,
      supportTickets: tickets.length,
      supportMessages: messages.length
    },
    findingCount: findings.length,
    findings
  }, null, 2));
  if (findings.length) process.exitCode = 2;
}

main()
  .catch((error) => {
    console.error("Data integrity audit failed:", error instanceof Error ? error.message : "Unknown database error");
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
