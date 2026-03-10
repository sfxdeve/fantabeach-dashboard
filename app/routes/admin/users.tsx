import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDebouncer } from "@tanstack/react-pacer";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { HttpAdminApi } from "~/lib/api/http-admin-api";
import type { User, UserRole } from "~/lib/api/types";

const adminApi = new HttpAdminApi();

export function meta() {
  return [{ title: "Users — FantaBeach Admin" }];
}

type ConfirmAction =
  | { type: "block"; user: User }
  | { type: "unblock"; user: User }
  | { type: "role"; user: User; newRole: UserRole };

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [rawEmail, setRawEmail] = useState("");
  const [email, setEmail] = useState("");
  const [blockedFilter, setBlockedFilter] = useState<string>("all");
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(
    null,
  );

  const emailDebouncer = useDebouncer(setEmail, { wait: 300 });

  const isBlockedParam =
    blockedFilter === "blocked"
      ? true
      : blockedFilter === "active"
        ? false
        : undefined;

  const { data: usersData, isLoading } = useQuery({
    queryKey: [
      "users",
      {
        email: email || undefined,
        isBlocked: isBlockedParam,
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
      },
    ],
    queryFn: () =>
      adminApi.getUsers({
        email: email || undefined,
        isBlocked: isBlockedParam,
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
      }),
  });

  const users = usersData?.items ?? [];
  const totalPages = usersData?.meta.pages ?? 0;

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      ...input
    }: { id: string } & Parameters<typeof adminApi.updateUser>[1]) =>
      adminApi.updateUser(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      setConfirmAction(null);
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  function handleConfirm() {
    if (!confirmAction) return;
    if (confirmAction.type === "block") {
      updateMutation.mutate({ id: confirmAction.user.id, isBlocked: true });
      toast.success(`${confirmAction.user.name} blocked`);
    } else if (confirmAction.type === "unblock") {
      updateMutation.mutate({ id: confirmAction.user.id, isBlocked: false });
      toast.success(`${confirmAction.user.name} unblocked`);
    } else if (confirmAction.type === "role") {
      updateMutation.mutate({
        id: confirmAction.user.id,
        role: confirmAction.newRole,
      });
      toast.success(
        `${confirmAction.user.name} role changed to ${confirmAction.newRole}`,
      );
    }
  }

  function confirmLabel(): string {
    if (!confirmAction) return "";
    if (confirmAction.type === "block")
      return `Block ${confirmAction.user.name}?`;
    if (confirmAction.type === "unblock")
      return `Unblock ${confirmAction.user.name}?`;
    return `Change ${confirmAction.user.name}'s role to ${confirmAction.newRole}?`;
  }

  function confirmDescription(): string {
    if (!confirmAction) return "";
    if (confirmAction.type === "block")
      return "This user will no longer be able to log in or use the platform.";
    if (confirmAction.type === "unblock")
      return "This user will regain access to the platform.";
    return confirmAction.newRole === "ADMIN"
      ? "This user will gain admin access to the dashboard."
      : "This user will lose admin access and become a regular user.";
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Users</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          className="w-64"
          placeholder="Search by email"
          value={rawEmail}
          onChange={(e) => {
            setRawEmail(e.target.value);
            emailDebouncer.maybeExecute(e.target.value);
            setPagination((p) => ({ ...p, pageIndex: 0 }));
          }}
        />

        <Select
          value={blockedFilter}
          onValueChange={(v) => {
            setBlockedFilter(v ?? "all");
            setPagination((p) => ({ ...p, pageIndex: 0 }));
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All users">
              {(value) =>
                value === "all"
                  ? "All Users"
                  : value === "active"
                    ? "Active"
                    : value === "blocked"
                      ? "Blocked"
                      : "All Users"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>

        {(rawEmail || blockedFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setRawEmail("");
              setEmail("");
              setBlockedFilter("all");
              setPagination((p) => ({ ...p, pageIndex: 0 }));
            }}
          >
            Clear
          </Button>
        )}
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Verified</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-muted-foreground"
                >
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.email}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={user.role === "ADMIN" ? "default" : "outline"}
                    >
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isVerified ? "secondary" : "outline"}>
                      {user.isVerified ? "Verified" : "Unverified"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isBlocked ? "destructive" : "outline"}>
                      {user.isBlocked ? "Blocked" : "Active"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setConfirmAction(
                            user.isBlocked
                              ? { type: "unblock", user }
                              : { type: "block", user },
                          )
                        }
                      >
                        {user.isBlocked ? "Unblock" : "Block"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setConfirmAction({
                            type: "role",
                            user,
                            newRole: user.role === "ADMIN" ? "USER" : "ADMIN",
                          })
                        }
                      >
                        {user.role === "ADMIN" ? "Demote" : "Promote"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.pageIndex + 1} of {totalPages}
            {usersData && ` · ${usersData.meta.total} total`}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPagination((p) => ({ ...p, pageIndex: p.pageIndex - 1 }))
              }
              disabled={pagination.pageIndex === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPagination((p) => ({ ...p, pageIndex: p.pageIndex + 1 }))
              }
              disabled={pagination.pageIndex >= totalPages - 1}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog
        open={!!confirmAction}
        onOpenChange={(o) => {
          if (!o) setConfirmAction(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{confirmLabel()}</DialogTitle>
            <DialogDescription>{confirmDescription()}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmAction(null)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant={
                confirmAction?.type === "block" ? "destructive" : "default"
              }
              onClick={handleConfirm}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
