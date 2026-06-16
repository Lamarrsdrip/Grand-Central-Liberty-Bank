import { redirect } from "next/navigation";
import {
  AnnouncementForm,
  BankSettingsForm,
  BroadcastForm,
  CardDecisionControl,
  EmailSettingsForm,
  KycDecisionControl,
  RetirementFeeSettingsForm,
  RetirementWithdrawalDecisionControl,
  SupportStatusControl,
  TestEmailForm,
  TransferDecisionControl,
  TransferSettingsForm,
  UserStatusControl,
  WalletForm
} from "@/components/admin/admin-controls";
import { StatusBadge } from "@/components/banking/status-badge";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentUser } from "@/lib/auth";
import { getAdminData } from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");
  const data = await getAdminData();

  const pendingKyc = data.kycSubmissions.filter((item) => item.status === "PENDING" || item.status === "UNDER_REVIEW").length;
  const pendingTransfers = data.transfers.filter((item) => item.status === "SUBMITTED" || item.status === "UNDER_REVIEW").length;
  const openTickets = data.tickets.filter((item) => item.status !== "CLOSED").length;
  const pendingRetirement = data.retirementWithdrawals.filter((item) => item.status === "SUBMITTED" || item.status === "UNDER_REVIEW").length;
  const retirementFeeSettings = {
    ...data.retirementFeeSettings,
    feePercentage: Number(data.retirementFeeSettings.feePercentage)
  };

  return (
    <ProtectedShell adminOnly>
      <div className="grid gap-6">
        <section id="overview" className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>Registered banking profiles</CardDescription>
            </CardHeader>
            <CardContent><p className="text-3xl font-black">{data.users.length}</p></CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>KYC Queue</CardTitle>
              <CardDescription>Manual verification reviews</CardDescription>
            </CardHeader>
            <CardContent><p className="text-3xl font-black">{pendingKyc}</p></CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Transfer Reviews</CardTitle>
              <CardDescription>Submitted transfer requests</CardDescription>
            </CardHeader>
            <CardContent><p className="text-3xl font-black">{pendingTransfers}</p></CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>401(k) Reviews</CardTitle>
              <CardDescription>Retirement withdrawal queue</CardDescription>
            </CardHeader>
            <CardContent><p className="text-3xl font-black">{pendingRetirement}</p></CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Active Support</CardTitle>
              <CardDescription>Open tickets and chats</CardDescription>
            </CardHeader>
            <CardContent><p className="text-3xl font-black">{openTickets}</p></CardContent>
          </Card>
        </section>

        <section id="users">
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>Search, freeze, unfreeze, suspend, and activate accounts with recorded reasons.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>KYC</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Balances</TableHead>
                    <TableHead>Admin control</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.users.map((accountUser) => (
                    <TableRow key={accountUser.id}>
                      <TableCell>
                        <p className="font-bold">{accountUser.firstName} {accountUser.lastName}</p>
                        <p className="text-xs text-muted-foreground">{accountUser.email}</p>
                      </TableCell>
                      <TableCell><StatusBadge status={accountUser.kycSubmissions[0]?.status ?? "PENDING"} /></TableCell>
                      <TableCell><StatusBadge status={accountUser.status} /></TableCell>
                      <TableCell>{formatCurrency(accountUser.accounts.reduce((sum, account) => sum + Number(account.balance), 0))}</TableCell>
                      <TableCell className="min-w-96"><UserStatusControl userId={accountUser.id} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
          <Card>
            <CardHeader>
              <CardTitle>Crypto Wallet Infrastructure</CardTitle>
              <CardDescription>Add, edit, enable, and disable global deposit wallet addresses.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {data.wallets.map((wallet) => (
                <div key={wallet.id} className="rounded-md border p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-black">{wallet.coin} ({wallet.symbol})</p>
                      <p className="break-all text-sm text-muted-foreground">{wallet.network} · {wallet.address}</p>
                    </div>
                    <Badge variant={wallet.enabled ? "success" : "secondary"}>{wallet.enabled ? "Enabled" : "Disabled"}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
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
          <Card>
            <CardHeader>
              <CardTitle>Support Center</CardTitle>
              <CardDescription>Active chats, open tickets, closed tickets, and assignment controls.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {data.tickets.map((ticket) => (
                <div key={ticket.id} className="rounded-md border p-4">
                  <div className="grid gap-3 lg:grid-cols-[1fr_22rem]">
                    <div>
                      <p className="font-black">{ticket.subject}</p>
                      <p className="text-sm text-muted-foreground">{ticket.user.email} · {ticket.messages.length} messages</p>
                      <StatusBadge status={ticket.status} />
                    </div>
                    <SupportStatusControl id={ticket.id} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
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
