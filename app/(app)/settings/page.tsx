import { requireUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import {
  archiveUserAsAdmin,
  createUserAsAdmin,
  restoreUserAsAdmin,
  updateMyProfile,
} from "./actions";
import Link from "next/link";

function splitName(name: string | null | undefined) {
  const value = (name ?? "").trim();
  if (!value) return { firstName: "", lastName: "" };
  const parts = value.split(/\s+/);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const user = await requireUser();
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, email: true, role: true },
  });
  const myName = splitName(dbUser?.name ?? user.name);
  const isAdmin = (dbUser?.role ?? user.role) === "ADMIN";
  const activeTab = isAdmin && params?.tab === "admin" ? "admin" : "profile";

  const users = isAdmin
    ? await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          archivedAt: true,
        },
      })
    : [];
  const activeUsers = users.filter((u) => !u.archivedAt);
  const deletedUsers = users.filter((u) => !!u.archivedAt);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b pb-2">
        <Link
          href="/settings?tab=profile"
          className={`rounded-md px-3 py-2 text-sm font-medium ${
            activeTab === "profile"
              ? "bg-primary text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          My Profile
        </Link>
        {isAdmin ? (
          <Link
            href="/settings?tab=admin"
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              activeTab === "admin"
                ? "bg-primary text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Admin Settings
          </Link>
        ) : null}
      </div>

      {activeTab === "profile" ? (
        <Card>
          <CardHeader>
            <CardTitle>My Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              action={updateMyProfile}
              className="grid gap-4 md:grid-cols-2"
            >
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  defaultValue={myName.firstName}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  defaultValue={myName.lastName}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={dbUser?.email ?? user.email ?? ""}
                  readOnly
                  disabled
                />
              </div>
              <div className="md:col-span-2">
                <Button type="submit">Save Profile</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "admin" && isAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle>Admin Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <form
              action={createUserAsAdmin}
              className="grid gap-4 md:grid-cols-2"
            >
              <div className="space-y-2">
                <Label htmlFor="newFirstName">First Name</Label>
                <Input id="newFirstName" name="firstName" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newLastName">Last Name</Label>
                <Input id="newLastName" name="lastName" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newEmail">Email</Label>
                <Input id="newEmail" type="email" name="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  name="password"
                  required
                  minLength={8}
                />
              </div>
              <div className="md:col-span-2">
                <Button type="submit">Add User</Button>
              </div>
            </form>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-700">
                Active Users
              </h3>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left">
                    <tr>
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">Email</th>
                      <th className="px-3 py-2 font-medium">Role</th>
                      <th className="px-3 py-2 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeUsers.map((u) => (
                      <tr key={u.id} className="border-t">
                        <td className="px-3 py-2">{u.name || "-"}</td>
                        <td className="px-3 py-2">{u.email}</td>
                        <td className="px-3 py-2">{u.role}</td>
                        <td className="px-3 py-2">
                          {u.id === user.id ? (
                            <span className="text-xs text-slate-500">
                              Current Admin
                            </span>
                          ) : (
                            <form action={archiveUserAsAdmin}>
                              <input type="hidden" name="userId" value={u.id} />
                              <Button
                                type="submit"
                                variant="outline"
                                className="h-8 text-rose-600"
                              >
                                Archive
                              </Button>
                            </form>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-700">
                Deleted Users
              </h3>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left">
                    <tr>
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">Email</th>
                      <th className="px-3 py-2 font-medium">Role</th>
                      <th className="px-3 py-2 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deletedUsers.map((u) => (
                      <tr key={u.id} className="border-t">
                        <td className="px-3 py-2">{u.name || "-"}</td>
                        <td className="px-3 py-2">{u.email}</td>
                        <td className="px-3 py-2">{u.role}</td>
                        <td className="px-3 py-2">
                          <form action={restoreUserAsAdmin}>
                            <input type="hidden" name="userId" value={u.id} />
                            <Button
                              type="submit"
                              variant="outline"
                              className="h-8"
                            >
                              Restore
                            </Button>
                          </form>
                        </td>
                      </tr>
                    ))}
                    {deletedUsers.length === 0 ? (
                      <tr className="border-t">
                        <td className="px-3 py-2 text-slate-500" colSpan={4}>
                          No archived users.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* {activeTab === "profile" ? (
        <Card>
          <CardHeader>
            <CardTitle>Runtime</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <strong>App Base URL:</strong> {env.APP_BASE_URL}
            </p>
            <p>
              <strong>Crawl page limit:</strong> {env.WEBSITE_CRAWL_PAGE_LIMIT}
            </p>
            <p>
              <strong>Crawl max depth:</strong> {env.WEBSITE_CRAWL_MAX_DEPTH}
            </p>
            <p>
              <strong>Page speed adapter enabled:</strong>{" "}
              {String(env.FEATURE_PAGE_SPEED_ADAPTER)}
            </p>
          </CardContent>
        </Card>
      ) : null} */}
    </div>
  );
}
