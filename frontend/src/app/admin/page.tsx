import { redirect } from "next/navigation";
import {
  AnnouncementForm,
  AdminSupportCenter,
  BankSettingsForm,
  BalanceAdjustmentForm,
  BroadcastForm,
  CardDecisionControl,
  EmailSettingsForm,
  KycDecisionControl,
  RetirementFeeSettingsForm,
  RetirementWithdrawalDecisionControl,
  TestEmailForm,
  TransferDecisionControl,
  TransferSettingsForm,
  UserProfileEditControl,
  UserStatusControl,
  WalletForm,
  WalletManagementPanel
} from "@/components/admin/admin-controls";
import { StatusBadge } from "@/components/banking/status-badge";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentUser } from "@/lib/auth";
import { getAdminData } from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");
  const data = await getAdminData();
  const params = await searchParams;
  const userQuery = params?.q?.trim().toLowerCase() ?? "";

  const pendingKyc = data.kycSubmissions.filter((item) => item.status === "PENDING" || item.status === "UNDER_REVIEW").length;
  const pendingTransfers = data.transfers.filter((item) => item.status === "SUBMITTED" || item.status === "UNDER_REVIEW").length;
  const openTickets = data.tickets.filter((item) => item.status !== "CLOSED").length;
  const pendingRetirement = data.retirementWithdrawals.filter((item) => item.status === "SUBMITTED" || item.status === "UNDER_REVIEW").length;
  const retirementFeeSettings = {
    ...data.retirementFeeSettings,
    feePercentage: Number(data.retirementFeeSettings.feePercentage)
  };
  const visibleUsers = userQuery
    ? data.users.filter((accountUser) =>
        [
          accountUser.firstName,
          accountUser.lastName,
          accountUser.email,
          accountUser.phone,
          accountUser.country,
          accountUser.address
        ].some((value) => value.toLowerCase().includes(userQuery))
      )
    : data.users;
  const supportTickets = data.tickets.map((ticket) => ({
    id: ticket.id,
    subject: ticket.subject,
    status: ticket.status,
    priority: ticket.priority,
    user: {
      id: ticket.user.id,
      firstName: ticket.user.firstName,
      lastName: ticket.user.lastName,
      email: ticket.user.email
    },
    assignedAdmin: ticket.assignedAdmin
      ? {
          id: ticket.assignedAdmin.id,
          firstName: ticket.assignedAdmin.firstName,
          lastName: ticket.assignedAdmin.lastName,
          email: ticket.assignedAdmin.email
        }
      : null,
    messages: ticket.messages.map((message) => ({
      id: message.id,
      body: message.body,
      senderId: message.senderId,
      attachmentUrl: message.attachmentUrl,
      createdAt: message.createdAt.toISOString(),
      senderName: `${message.sender.firstName} ${message.sender.lastName}`,
      senderRole: message.sender.role
    }))
  }));
  const moduleLinks = [
    ["Overview", "#overview"],
    ["Users", "#users"],
    ["KYC", "#kyc"],
    ["Transfers", "#transfers"],
    ["401(k)", "#retirement"],
    ["Wallets", "#wallets"],
    ["Support", "#support"],
    ["Settings", "#settings"],
    ["Audit", "#audit"]
  ];

  return (
    <ProtectedShell adminOnly>
      <div className="grid gap-6">
        <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#111827] via-[#0d1713] to-[#101827] p-5 shadow-2xl lg:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-300/70">Banking Operations</p>
              <h1 className="mt-2 text-3xl font-black text-white lg:text-4xl">Admin Command Center</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
                Review customers, compliance, money movement, support conversations, crypto infrastructure, and audit trails from one responsive operations desk.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[34rem]">
              {[
                ["KYC", pendingKyc],
                ["Transfers", pendingTransfers],
                ["401(k)", pendingRetirement],
                ["Support", openTickets]
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/7 p-4">
                  <p className="text-2xl font-black text-white">{value}</p>
                  <p className="text-xs font-bold uppercase tracking-wider text-white/40">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <nav className="sticky top-0 z-10 -mx-4 overflow-x-auto border-y border-white/8 bg-[#0b0f18]/90 px-4 py-3 backdrop-blur-xl lg:top-[4.5rem] lg:mx-0 lg:rounded-2xl lg:border">
          <div className="flex min-w-max gap-2">
            {moduleLinks.map(([label, href]) => (
              <a key={href} href={href} className="rounded-full border border-white/10 bg-white/7 px-4 py-2 text-xs font-black text-white/65 transition hover:border-emerald-300/40 hover:bg-emerald-400/12 hover:text-white">
                {label}
              </a>
            ))}
          </div>
        </nav>

        <section id="overview" className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            ["Users", data.users.length, "Registered banking profiles"],
            ["KYC Queue", pendingKyc, "Manual verification reviews"],
            ["Transfer Reviews", pendingTransfers, "Submitted transfer requests"],
            ["401(k) Reviews", pendingRetirement, "Retirement withdrawal queue"],
            ["Active Support", openTickets, "Open tickets and chats"]
          ].map(([title, value, description]) => (
            <Card key={title} className="border-white/10 bg-white/5">
              <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent><p className="text-3xl font-black text-white">{value}</p></CardContent>
            </Card>
          ))}
        </section>

        <section id="users">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle>Users</CardTitle>
                  <CardDescription>Edit profiles, freeze, unfreeze, suspend, and activate accounts with recorded reasons.</CardDescription>
                </div>
                <form className="flex w-full gap-2 lg:w-[28rem]" action="/admin#users">
                  <Input name="q" placeholder="Search users, email, phone..." defaultValue={params?.q ?? ""} />
                  <Button type="submit">Search</Button>
                  {userQuery ? <Button asChild variant="outline"><a href="/admin#users">Clear</a></Button> : null}
                </form>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              {visibleUsers.map((accountUser) => (
                <div key={accountUser.id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
                    <div className="min-w-0">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-lg font-black text-white">{accountUser.firstName} {accountUser.lastName}</p>
                          <p className="truncate text-sm text-muted-foreground">{accountUser.email} · {accountUser.phone}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge status={accountUser.kycSubmissions[0]?.status ?? "PENDING"} />
                          <StatusBadge status={accountUser.status} />
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl bg-black/20 p-3">
                          <p className="text-xs font-bold text-white/35">Total balances</p>
                          <p className="mt-1 font-black text-white">{formatCurrency(accountUser.accounts.reduce((sum, account) => sum + Number(account.balance), 0))}</p>
                        </div>
                        <div className="rounded-2xl bg-black/20 p-3">
                          <p className="text-xs font-bold text-white/35">Country</p>
                          <p className="mt-1 font-black text-white">{accountUser.country}</p>
                        </div>
                        <div className="rounded-2xl bg-black/20 p-3">
                          <p className="text-xs font-bold text-white/35">Accounts</p>
                          <p className="mt-1 font-black text-white">{accountUser.accounts.length}</p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <UserProfileEditControl user={accountUser} />
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="mb-3 text-sm font-black text-white">Status control</p>
                      <UserStatusControl userId={accountUser.id} />
                    </div>
                  </div>
                </div>
              ))}
              {!visibleUsers.length ? (
                <p className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm font-semibold text-muted-foreground">
                  No users match that search.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </section>

        <section id="accounts">
          <BalanceAdjustmentForm users={data.users} />
        </section>

        <section id="kyc">
          <Card>
            <CardHeader>
              <CardTitle>KYC Review Queue</CardTitle>
              <CardDescription>Manual approval, rejection, document requests, and verification history.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Decision</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.kycSubmissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell>{submission.user.firstName} {submission.user.lastName}</TableCell>
                      <TableCell>{submission.documentType}</TableCell>
                      <TableCell><StatusBadge status={submission.status} /></TableCell>
                      <TableCell>{formatDate(submission.createdAt)}</TableCell>
                      <TableCell className="min-w-96"><KycDecisionControl id={submission.id} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        <section id="wallets" className="grid gap-5 xl:grid-cols-[1fr_28rem]">
          <WalletManagementPanel wallets={data.wallets} />
          <WalletForm />
        </section>

        <section id="retirement" className="grid gap-5">
          <RetirementFeeSettingsForm settings={retirementFeeSettings} />
          <Card>
            <CardHeader>
              <CardTitle>401(k) Retirement Accounts</CardTitle>
              <CardDescription>All retirement balances, account status, withdrawal eligibility, and contribution summaries.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Eligibility</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.retirementAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell>{account.user.firstName} {account.user.lastName}</TableCell>
                      <TableCell>401(k) •••• {account.accountNumber.slice(-4)}</TableCell>
                      <TableCell>{formatCurrency(Number(account.balance))}</TableCell>
                      <TableCell>{account.withdrawalEligibilityStatus}</TableCell>
                      <TableCell><StatusBadge status={account.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>401(k) Withdrawal Review</CardTitle>
              <CardDescription>Approve, reject, request more documents, and add internal compliance notes. No automatic money movement occurs.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Decision</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.retirementWithdrawals.map((withdrawal) => (
                    <TableRow key={withdrawal.id}>
                      <TableCell>
                        <p className="font-bold">{withdrawal.user.firstName} {withdrawal.user.lastName}</p>
                        <p className="text-xs text-muted-foreground">{withdrawal.reason}</p>
                      </TableCell>
                      <TableCell>{formatCurrency(Number(withdrawal.amount), withdrawal.currency)}</TableCell>
                      <TableCell>
                        <p className="font-semibold">{withdrawal.feeEnabled ? formatCurrency(Number(withdrawal.feeAmount)) : "Disabled"}</p>
                        <p className="text-xs text-muted-foreground">{withdrawal.paymentMethod.replaceAll("_", " ")}</p>
                      </TableCell>
                      <TableCell><StatusBadge status={withdrawal.status} /></TableCell>
                      <TableCell className="min-w-96"><RetirementWithdrawalDecisionControl id={withdrawal.id} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        <section id="transfers" className="grid gap-5">
          <TransferSettingsForm settings={data.transferSettings} />
          <Card>
            <CardHeader>
              <CardTitle>Transfer Requests</CardTitle>
              <CardDescription>Admin review for internal, domestic, and international transfers.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Beneficiary</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Decision</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.transfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell>{transfer.user.firstName} {transfer.user.lastName}</TableCell>
                      <TableCell>{transfer.beneficiaryName}</TableCell>
                      <TableCell>{formatCurrency(Number(transfer.amount), transfer.currency)}</TableCell>
                      <TableCell><StatusBadge status={transfer.status} /></TableCell>
                      <TableCell className="min-w-96"><TransferDecisionControl id={transfer.id} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        <section id="cards">
          <Card>
            <CardHeader>
              <CardTitle>Card Applications</CardTitle>
              <CardDescription>Classic, Gold, Platinum, and Signature card review.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Card</TableHead>
                    <TableHead>Income</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Decision</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.cards.map((application) => (
                    <TableRow key={application.id}>
                      <TableCell>{application.user.firstName} {application.user.lastName}</TableCell>
                      <TableCell>{application.type}</TableCell>
                      <TableCell>{formatCurrency(Number(application.annualIncome))}</TableCell>
                      <TableCell><StatusBadge status={application.status} /></TableCell>
                      <TableCell className="min-w-96"><CardDecisionControl id={application.id} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        <section id="support">
          <AdminSupportCenter tickets={supportTickets} adminId={user.id} />
        </section>

        <section id="email" className="grid gap-5 xl:grid-cols-2">
          <EmailSettingsForm settings={data.emailSettings ? { ...data.emailSettings, appPasswordEncrypted: data.emailSettings.appPasswordEncrypted ? "configured" : null } : null} />
          <Card>
            <CardHeader>
              <CardTitle>Email Operations</CardTitle>
              <CardDescription>Test SMTP and review broadcast tracking.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <TestEmailForm />
              <BroadcastForm />
              <div className="grid gap-2">
                {data.broadcasts.map((broadcast) => (
                  <div key={broadcast.id} className="rounded-md border p-3">
                    <p className="font-bold">{broadcast.subject}</p>
                    <p className="text-xs text-muted-foreground">{broadcast.status} · Sent {broadcast.sentCount} · Failed {broadcast.failedCount}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="notifications" className="grid gap-5 xl:grid-cols-2">
          <AnnouncementForm />
          <Card>
            <CardHeader>
              <CardTitle>Announcement Banners</CardTitle>
              <CardDescription>Current user and admin banners.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {data.announcements.map((announcement) => (
                <div key={announcement.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-black">{announcement.title}</p>
                    <Badge variant={announcement.active ? "success" : "secondary"}>{announcement.active ? "Active" : "Inactive"}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{announcement.body}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section id="settings">
          <BankSettingsForm settings={data.bankSettings} />
        </section>

        <section id="audit">
          <Card>
            <CardHeader>
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>Every admin action and key user security event is recorded.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{formatDate(log.createdAt)}</TableCell>
                      <TableCell>{log.actor?.email ?? "System"}</TableCell>
                      <TableCell className="font-semibold">{log.action}</TableCell>
                      <TableCell>{log.entity} {log.entityId ? `· ${log.entityId.slice(0, 8)}` : ""}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      </div>
    </ProtectedShell>
  );
}
