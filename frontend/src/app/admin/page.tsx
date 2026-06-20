import { redirect } from "next/navigation";
import {
  AdminNotificationForm,
  AdminCryptoTopupControl,
  AnnouncementForm,
  AnnouncementToggleControl,
  AdminSupportCenter,
  BankSettingsForm,
  BalanceAdjustmentForm,
  BeneficiaryDeleteControl,
  BroadcastForm,
  CardDecisionControl,
  EmailSettingsForm,
  KycDecisionControl,
  KycDocumentViewer,
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

const TABS = [
  "overview","users","accounts","kyc","crypto-balances","transfers","beneficiaries",
  "cards","retirement","wallets","support","notifications","email","settings","audit",
] as const;
type AdminTab = (typeof TABS)[number];

export default async function AdminPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string; tab?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");
  const data = await getAdminData();
  const params = await searchParams;
  const userQuery = params?.q?.trim().toLowerCase() ?? "";
  const rawTab = params?.tab ?? "overview";
  const activeTab: AdminTab = (TABS as readonly string[]).includes(rawTab) ? (rawTab as AdminTab) : "overview";

  const pendingKyc = data.kycSubmissions.filter((item) => item.status === "PENDING" || item.status === "UNDER_REVIEW").length;
  const pendingTransfers = data.transfers.filter((item) => item.status === "SUBMITTED" || item.status === "UNDER_REVIEW").length;
  const openTickets = data.tickets.filter((item) => item.status !== "CLOSED").length;
  const pendingRetirement = data.retirementWithdrawals.filter((item) => item.status === "SUBMITTED" || item.status === "UNDER_REVIEW").length;
  const activeAnnouncements = data.announcements.filter((a) => a.active).length;

  const retirementFeeSettings = {
    ...data.retirementFeeSettings,
    feePercentage: Number(data.retirementFeeSettings.feePercentage)
  };

  const visibleUsers = userQuery
    ? data.users.filter((u) =>
        [u.firstName, u.lastName, u.email, u.phone, u.country, u.address].some(
          (v) => v.toLowerCase().includes(userQuery)
        )
      )
    : data.users;

  const supportTickets = data.tickets.map((ticket) => ({
    id: ticket.id,
    subject: ticket.subject,
    status: ticket.status,
    priority: ticket.priority,
    user: { id: ticket.user.id, firstName: ticket.user.firstName, lastName: ticket.user.lastName, email: ticket.user.email },
    assignedAdmin: ticket.assignedAdmin
      ? { id: ticket.assignedAdmin.id, firstName: ticket.assignedAdmin.firstName, lastName: ticket.assignedAdmin.lastName, email: ticket.assignedAdmin.email }
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

  const tabLinks: Array<[AdminTab, string, string?]> = [
    ["overview",       "Overview"],
    ["users",          "Users",        pendingKyc > 0 ? undefined : undefined],
    ["accounts",       "Accounts"],
    ["kyc",            "KYC",          pendingKyc > 0 ? String(pendingKyc) : undefined],
    ["crypto-balances","Crypto Bal."],
    ["transfers",      "Transfers",    pendingTransfers > 0 ? String(pendingTransfers) : undefined],
    ["beneficiaries",  "Beneficiaries"],
    ["cards",          "Cards"],
    ["retirement",     "401(k)",       pendingRetirement > 0 ? String(pendingRetirement) : undefined],
    ["wallets",        "Wallets"],
    ["support",        "Support",      openTickets > 0 ? String(openTickets) : undefined],
    ["notifications",  "Notif."],
    ["email",          "Email"],
    ["settings",       "Settings"],
    ["audit",          "Audit"],
  ];

  return (
    <ProtectedShell adminOnly>
      <div className="grid gap-6">
        {/* Header */}
        <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#111827] via-[#0d1713] to-[#101827] p-5 shadow-2xl lg:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-300/70">Banking Operations</p>
              <h1 className="mt-2 text-3xl font-black text-white lg:text-4xl">Admin Command Center</h1>
              <p className="mt-1 text-sm text-white/45">Grand Central Liberty Bank · full platform control</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[34rem]">
              {([
                ["KYC", pendingKyc],
                ["Transfers", pendingTransfers],
                ["401(k)", pendingRetirement],
                ["Support", openTickets]
              ] as [string, number][]).map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/7 p-4">
                  <p className="text-2xl font-black text-white">{value}</p>
                  <p className="text-xs font-bold uppercase tracking-wider text-white/40">{label} pending</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tab Navigation */}
        <nav className="sticky top-0 z-10 -mx-4 border-y border-white/8 bg-[#0b0f18]/90 px-4 py-2.5 backdrop-blur-xl lg:top-[4.5rem] lg:mx-0 lg:rounded-2xl lg:border">
          <div className="flex gap-1 overflow-x-auto scrollbar-none">
            {tabLinks.map(([tab, label, badge]) => (
              <a
                key={tab}
                href={`?tab=${tab}`}
                className={`relative flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-black transition ${
                  activeTab === tab
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                    : "text-white/50 hover:text-white hover:bg-white/8"
                }`}
              >
                {label}
                {badge && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[0.55rem] font-black text-white">{badge}</span>
                )}
              </a>
            ))}
          </div>
        </nav>

        {/* Overview */}
        {activeTab === "overview" && <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {([
            ["Total Users", data.users.length, "Registered profiles"],
            ["KYC Pending", pendingKyc, "Awaiting review"],
            ["Transfer Reviews", pendingTransfers, "Require decision"],
            ["Withdrawal Reviews", pendingRetirement, "401(k) queue"],
            ["Open Support", openTickets, "Active tickets"],
            ["Live Banners", activeAnnouncements, "Published announcements"]
          ] as [string, number, string][]).map(([title, value, description]) => (
            <Card key={title} className="border-white/10 bg-white/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{title}</CardTitle>
                <CardDescription className="text-xs">{description}</CardDescription>
              </CardHeader>
              <CardContent><p className="text-3xl font-black text-white">{value}</p></CardContent>
            </Card>
          ))}
        </section>}

        {/* Crypto Balances */}
        {activeTab === "crypto-balances" && <section>
          <Card>
            <CardHeader>
              <CardTitle>Crypto Balance Management</CardTitle>
              <CardDescription>Top up or adjust a user&apos;s crypto asset balance. All changes are logged and create audit records.</CardDescription>
            </CardHeader>
            <CardContent>
              <AdminCryptoTopupControl users={data.users.map(u => ({ id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email }))} />
            </CardContent>
          </Card>
        </section>}

        {/* Users */}
        {activeTab === "users" && <section>
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle>Users</CardTitle>
                  <CardDescription>Edit profiles, freeze, unfreeze, suspend, and activate accounts.</CardDescription>
                </div>
                <form className="flex w-full gap-2 lg:w-[28rem]" action="/admin">
                  <input type="hidden" name="tab" value="users" />
                  <Input name="q" placeholder="Search by name, email, phone..." defaultValue={params?.q ?? ""} />
                  <Button type="submit">Search</Button>
                  {userQuery ? <Button asChild variant="outline"><a href="/admin?tab=users">Clear</a></Button> : null}
                </form>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              {visibleUsers.map((u) => (
                <div key={u.id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
                    <div className="min-w-0">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-lg font-black text-white">{u.firstName} {u.lastName}</p>
                          <p className="truncate text-sm text-muted-foreground">{u.email} · {u.phone}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge status={u.kycSubmissions[0]?.status ?? "PENDING"} />
                          <StatusBadge status={u.status} />
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl bg-black/20 p-3">
                          <p className="text-xs font-bold text-white/35">Total balance</p>
                          <p className="mt-1 font-black text-white">{formatCurrency(u.accounts.reduce((sum, a) => sum + Number(a.balance), 0))}</p>
                        </div>
                        <div className="rounded-2xl bg-black/20 p-3">
                          <p className="text-xs font-bold text-white/35">Country</p>
                          <p className="mt-1 font-black text-white">{u.country || "—"}</p>
                        </div>
                        <div className="rounded-2xl bg-black/20 p-3">
                          <p className="text-xs font-bold text-white/35">Accounts</p>
                          <p className="mt-1 font-black text-white">{u.accounts.length}</p>
                        </div>
                        <div className="rounded-2xl bg-black/20 p-3">
                          <p className="text-xs font-bold text-white/35">Joined</p>
                          <p className="mt-1 font-black text-white">{formatDate(u.createdAt)}</p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <UserProfileEditControl user={u} />
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="mb-3 text-sm font-black text-white">Account control</p>
                      <UserStatusControl userId={u.id} />
                    </div>
                  </div>
                </div>
              ))}
              {!visibleUsers.length && (
                <p className="rounded-2xl border border-white/10 p-5 text-sm font-semibold text-muted-foreground">
                  No users match that search.
                </p>
              )}
            </CardContent>
          </Card>
        </section>}

        {/* Balance Adjustment */}
        {activeTab === "accounts" && <section>
          <BalanceAdjustmentForm users={data.users} />
        </section>}

        {/* KYC */}
        {activeTab === "kyc" && <section>
          <Card>
            <CardHeader>
              <CardTitle>KYC Review Queue</CardTitle>
              <CardDescription>Approve, reject, or request additional documents for identity verification submissions.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Documents</TableHead>
                    <TableHead>Decision</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.kycSubmissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell>
                        <p className="font-bold">{submission.user.firstName} {submission.user.lastName}</p>
                        <p className="text-xs text-muted-foreground">{submission.user.email}</p>
                      </TableCell>
                      <TableCell>{submission.documentType}</TableCell>
                      <TableCell>{formatDate(submission.createdAt)}</TableCell>
                      <TableCell><StatusBadge status={submission.status} /></TableCell>
                      <TableCell>
                        <KycDocumentViewer submission={{
                          id: submission.id,
                          documentType: submission.documentType,
                          documentUrl: submission.documentUrl,
                          selfieUrl: submission.selfieUrl,
                          user: { firstName: submission.user.firstName, lastName: submission.user.lastName, email: submission.user.email, country: submission.user.country },
                          status: submission.status,
                          createdAt: submission.createdAt,
                          rejectionReason: submission.rejectionReason
                        }} />
                      </TableCell>
                      <TableCell className="min-w-96"><KycDecisionControl id={submission.id} /></TableCell>
                    </TableRow>
                  ))}
                  {!data.kycSubmissions.length && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No KYC submissions yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>}

        {/* Transfers */}
        {activeTab === "transfers" && <section className="grid gap-5">
          <TransferSettingsForm settings={data.transferSettings} />
          <Card>
            <CardHeader>
              <CardTitle>Transfer Requests</CardTitle>
              <CardDescription>Full details for each transfer — approve, reject, or flag for review.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Beneficiary</TableHead>
                    <TableHead>Bank / Account</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Decision</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.transfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell>
                        <p className="font-bold whitespace-nowrap">{transfer.user.firstName} {transfer.user.lastName}</p>
                        <p className="text-xs text-muted-foreground">{transfer.user.email}</p>
                      </TableCell>
                      <TableCell className="font-semibold whitespace-nowrap">{transfer.beneficiaryName || "—"}</TableCell>
                      <TableCell>
                        {transfer.beneficiaryBank ? (
                          <>
                            <p className="text-sm font-semibold">{transfer.beneficiaryBank}</p>
                            <p className="text-xs text-muted-foreground font-mono">{transfer.beneficiaryAccount || "—"}</p>
                            {transfer.ibanSwift ? <p className="text-xs text-muted-foreground">SWIFT: {transfer.ibanSwift}</p> : null}
                          </>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{transfer.recipientCountry || "—"}</TableCell>
                      <TableCell className="font-black whitespace-nowrap">{formatCurrency(Number(transfer.amount), transfer.currency)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs whitespace-nowrap">{transfer.type}</Badge>
                      </TableCell>
                      <TableCell className="max-w-32 truncate text-sm">{transfer.purpose || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground text-xs">{formatDate(transfer.createdAt)}</TableCell>
                      <TableCell><StatusBadge status={transfer.status} /></TableCell>
                      <TableCell className="min-w-96"><TransferDecisionControl id={transfer.id} /></TableCell>
                    </TableRow>
                  ))}
                  {!data.transfers.length && (
                    <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-6">No transfer requests yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>}

        {/* Saved Beneficiaries */}
        {activeTab === "beneficiaries" && <section>
          <Card>
            <CardHeader>
              <CardTitle>Saved Beneficiaries</CardTitle>
              <CardDescription>All user-saved payment recipients across the platform. Remove any suspicious or incorrect entries.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account holder</TableHead>
                    <TableHead>Beneficiary name</TableHead>
                    <TableHead>Nickname</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead>Account / IBAN</TableHead>
                    <TableHead>SWIFT / Routing</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Saved</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.savedBeneficiaries.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>
                        <p className="font-bold whitespace-nowrap">{b.user.firstName} {b.user.lastName}</p>
                        <p className="text-xs text-muted-foreground">{b.user.email}</p>
                      </TableCell>
                      <TableCell className="font-semibold">{b.recipientName}</TableCell>
                      <TableCell className="text-muted-foreground">{b.nickname || "—"}</TableCell>
                      <TableCell>{b.bankName}</TableCell>
                      <TableCell className="font-mono text-xs">{b.accountNumber}</TableCell>
                      <TableCell className="font-mono text-xs">{b.routingSwift || "—"}</TableCell>
                      <TableCell>{b.recipientCountry}</TableCell>
                      <TableCell>{b.currency}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(b.createdAt)}</TableCell>
                      <TableCell><BeneficiaryDeleteControl id={b.id} /></TableCell>
                    </TableRow>
                  ))}
                  {!data.savedBeneficiaries.length && (
                    <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-6">No saved beneficiaries yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>}

        {/* Cards */}
        {activeTab === "cards" && <section>
          <Card>
            <CardHeader>
              <CardTitle>Card Applications</CardTitle>
              <CardDescription>Review and decide on Classic, Gold, Platinum, and Signature card applications.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Card type</TableHead>
                    <TableHead>Annual income</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Decision</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.cards.map((application) => (
                    <TableRow key={application.id}>
                      <TableCell>
                        <p className="font-bold">{application.user.firstName} {application.user.lastName}</p>
                        <p className="text-xs text-muted-foreground">{application.user.email}</p>
                      </TableCell>
                      <TableCell className="font-semibold">{application.type}</TableCell>
                      <TableCell>{formatCurrency(Number(application.annualIncome))}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(application.createdAt)}</TableCell>
                      <TableCell><StatusBadge status={application.status} /></TableCell>
                      <TableCell className="min-w-96"><CardDecisionControl id={application.id} /></TableCell>
                    </TableRow>
                  ))}
                  {!data.cards.length && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No card applications yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>}

        {/* Retirement */}
        {activeTab === "retirement" && <section className="grid gap-5">
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
                    <TableHead>Withdrawal eligibility</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.retirementAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell>
                        <p className="font-bold">{account.user.firstName} {account.user.lastName}</p>
                        <p className="text-xs text-muted-foreground">{account.user.email}</p>
                      </TableCell>
                      <TableCell className="font-mono text-xs">401(k) •••• {account.accountNumber.slice(-4)}</TableCell>
                      <TableCell className="font-black">{formatCurrency(Number(account.balance))}</TableCell>
                      <TableCell>{account.withdrawalEligibilityStatus}</TableCell>
                      <TableCell><StatusBadge status={account.status} /></TableCell>
                    </TableRow>
                  ))}
                  {!data.retirementAccounts.length && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No retirement accounts yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>401(k) Withdrawal Review</CardTitle>
              <CardDescription>Approve, reject, or request documents. No automatic money movement occurs — all decisions are manual.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Reason</TableHead>
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
                        <p className="text-xs text-muted-foreground">{withdrawal.user.email}</p>
                      </TableCell>
                      <TableCell className="max-w-40 truncate text-sm">{withdrawal.reason}</TableCell>
                      <TableCell className="font-black">{formatCurrency(Number(withdrawal.amount), withdrawal.currency)}</TableCell>
                      <TableCell>
                        <p className="font-semibold">{withdrawal.feeEnabled ? formatCurrency(Number(withdrawal.feeAmount)) : "Waived"}</p>
                        <p className="text-xs text-muted-foreground">{withdrawal.paymentMethod.replaceAll("_", " ")}</p>
                      </TableCell>
                      <TableCell><StatusBadge status={withdrawal.status} /></TableCell>
                      <TableCell className="min-w-96"><RetirementWithdrawalDecisionControl id={withdrawal.id} /></TableCell>
                    </TableRow>
                  ))}
                  {!data.retirementWithdrawals.length && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No withdrawal requests yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>}

        {/* Wallets */}
        {activeTab === "wallets" && <section className="grid gap-5 xl:grid-cols-[1fr_28rem]">
          <WalletManagementPanel wallets={data.wallets} />
          <WalletForm />
        </section>}

        {/* Support */}
        {activeTab === "support" && <section>
          <AdminSupportCenter tickets={supportTickets} adminId={user.id} />
        </section>}

        {/* Notifications */}
        {activeTab === "notifications" && <section className="grid gap-5 xl:grid-cols-2">
          <div className="grid gap-5">
            <AdminNotificationForm users={data.users} />
            <AnnouncementForm />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Announcement Banners</CardTitle>
              <CardDescription>Toggle visibility or delete banners shown to users and admins.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {data.announcements.map((announcement) => (
                <div key={announcement.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="font-black text-white">{announcement.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">{announcement.body}</p>
                      <p className="text-xs text-white/35 mt-2">
                        {announcement.tone} · {announcement.audience ?? "All"} · {announcement.locale.toUpperCase()}
                      </p>
                    </div>
                    <Badge variant={announcement.active ? "success" : "secondary"} className="shrink-0">
                      {announcement.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="mt-3">
                    <AnnouncementToggleControl id={announcement.id} active={announcement.active} />
                  </div>
                </div>
              ))}
              {!data.announcements.length && (
                <p className="rounded-2xl border border-white/10 p-5 text-sm text-muted-foreground">No banners published yet.</p>
              )}
            </CardContent>
          </Card>
        </section>}

        {/* Email */}
        {activeTab === "email" && <section className="grid gap-5 xl:grid-cols-2">
          <EmailSettingsForm settings={data.emailSettings ? { ...data.emailSettings, appPasswordEncrypted: data.emailSettings.appPasswordEncrypted ? "configured" : null } : null} />
          <Card>
            <CardHeader>
              <CardTitle>Email Operations</CardTitle>
              <CardDescription>Send test emails and track broadcast history.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <TestEmailForm />
              <BroadcastForm />
              <div className="grid gap-2">
                {data.broadcasts.map((broadcast) => (
                  <div key={broadcast.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="font-bold">{broadcast.subject}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {broadcast.status} · Sent: {broadcast.sentCount} · Failed: {broadcast.failedCount} · {formatDate(broadcast.createdAt)}
                    </p>
                  </div>
                ))}
                {!data.broadcasts.length && (
                  <p className="text-sm text-muted-foreground">No broadcasts sent yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </section>}

        {/* Settings */}
        {activeTab === "settings" && <section>
          <BankSettingsForm settings={data.bankSettings} />
        </section>}

        {/* Audit Logs */}
        {activeTab === "audit" && <section>
          <Card>
            <CardHeader>
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>Every admin action and key user security event, most recent first.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(log.createdAt)}</TableCell>
                      <TableCell className="text-sm">{log.actor?.email ?? "System"}</TableCell>
                      <TableCell className="font-semibold text-sm">{log.action}</TableCell>
                      <TableCell className="text-sm">{log.entity}{log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ""}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{log.ip ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                  {!data.auditLogs.length && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No audit log entries yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>}
      </div>
    </ProtectedShell>
  );
}
