"use client";

import { useEffect, useState, useTransition } from "react";
import { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Member = {
  id: string;
  email: string;
  name?: string | null;
  role: Role;
};

type MemberManagerProps = {
  projectId: string;
  initialMembers: Member[];
};

export default function MemberManager({
  projectId,
  initialMembers,
}: MemberManagerProps) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>(Role.MEMBER);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const refreshMembers = async () => {
    const response = await fetch(`/api/projects/${projectId}/members`);
    if (!response.ok) return;
    const data = await response.json();
    setMembers(
      data.data.map((member: any) => ({
        id: member.userId,
        email: member.user.email,
        name: member.user.name,
        role: member.role,
      }))
    );
  };

  useEffect(() => {
    refreshMembers();
  }, [projectId]);

  const handleInvite = () => {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error ?? "Failed to invite member");
        }
        // TODO: trigger email/notification once mailing service is wired.
        setInviteEmail("");
        refreshMembers();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to invite member"
        );
      }
    });
  };

  const handleRoleChange = (userId: string, role: Role) => {
    startTransition(async () => {
      await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: members.find((member) => member.id === userId)?.email,
          role,
        }),
      });
      refreshMembers();
    });
  };

  const handleRemove = (userId: string) => {
    startTransition(async () => {
      await fetch(`/api/projects/${projectId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      refreshMembers();
    });
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold">Members</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-[2fr_1fr_auto]">
        <Input
          placeholder="email@example.com"
          value={inviteEmail}
          onChange={(event) => setInviteEmail(event.target.value)}
          disabled={isPending}
        />
        <select
          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
          value={inviteRole}
          onChange={(event) => setInviteRole(event.target.value as Role)}
          disabled={isPending}
        >
          {Object.values(Role).map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
        <Button onClick={handleInvite} disabled={isPending}>
          Invite
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <ul className="mt-6 divide-y divide-slate-200 text-sm text-slate-700">
        {members.map((member) => (
          <li
            key={member.id}
            className="flex flex-wrap items-center gap-2 py-3"
          >
            <div className="flex-1">
              <p className="font-medium">{member.name ?? member.email}</p>
              <p className="text-xs text-slate-500">{member.email}</p>
            </div>
            <select
              className="h-9 rounded-md border border-slate-200 bg-white px-3"
              value={member.role}
              onChange={(event) =>
                handleRoleChange(member.id, event.target.value as Role)
              }
              disabled={isPending}
            >
              {Object.values(Role).map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <Button
              variant="ghost"
              onClick={() => handleRemove(member.id)}
              disabled={isPending}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
