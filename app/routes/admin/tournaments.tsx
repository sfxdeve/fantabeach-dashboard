import { useState, useEffect } from "react";
import { Link } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { PlusIcon, EyeIcon, PencilIcon, UploadIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
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
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import {
  DatePickerField,
  DateTimePickerField,
} from "~/components/ui/date-picker";
import { HttpAdminApi } from "~/lib/api/http-admin-api";
import type { Tournament, TournamentStatus } from "~/lib/api/types";
import { useRef } from "react";

const adminApi = new HttpAdminApi();

const STATUS_VARIANT: Record<
  TournamentStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  UPCOMING: "outline",
  REGISTRATION_OPEN: "secondary",
  LOCKED: "destructive",
  ONGOING: "default",
  COMPLETED: "outline",
};

const STATUS_LABEL: Record<TournamentStatus, string> = {
  UPCOMING: "Upcoming",
  REGISTRATION_OPEN: "Open",
  LOCKED: "Locked",
  ONGOING: "Ongoing",
  COMPLETED: "Completed",
};

export function meta() {
  return [{ title: "Tournaments — FantaBeach Admin" }];
}

export default function TournamentsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tournament | null>(null);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [championshipId, setChampionshipId] = useState<string>("");
  const importRef = useRef<HTMLInputElement>(null);

  const { data: championships = [] } = useQuery({
    queryKey: ["championships"],
    queryFn: () => adminApi.getChampionships(),
  });

  // Auto-select first championship
  useEffect(() => {
    if (championships.length > 0 && !championshipId) {
      setChampionshipId(championships[0].id);
    }
  }, [championships, championshipId]);

  const { data: tournamentsData, isLoading } = useQuery({
    queryKey: [
      "tournaments",
      {
        championshipId,
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
      },
    ],
    queryFn: () =>
      adminApi.getTournaments({
        championshipId,
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
      }),
    enabled: !!championshipId,
  });

  const tournaments = tournamentsData?.items ?? [];
  const totalPages = tournamentsData?.meta.pages ?? 0;

  const createMutation = useMutation({
    mutationFn: (input: {
      championshipId: string;
      startDate: string;
      endDate: string;
      lineupLockAt?: string;
    }) => adminApi.createTournament(input),
    onSuccess: () => {
      toast.success("Tournament created");
      void queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      setOpen(false);
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Create failed"),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      ...input
    }: {
      id: string;
      startDate?: string;
      endDate?: string;
      lineupLockAt?: string;
      status?: TournamentStatus;
    }) => adminApi.updateTournament(id, input),
    onSuccess: () => {
      toast.success("Tournament updated");
      void queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      setOpen(false);
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => adminApi.importTournaments(file),
    onSuccess: (result) => {
      toast.success(
        `Import complete: ${result.created} created, ${result.updated} updated`,
      );
      if (result.errors.length > 0)
        toast.warning(`${result.errors.length} rows had errors`);
      void queryClient.invalidateQueries({ queryKey: ["tournaments"] });
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Import failed"),
  });

  const form = useForm({
    defaultValues: {
      championshipId: "",
      startDate: "",
      endDate: "",
      lineupLockAt: "",
      status: "UPCOMING" as TournamentStatus,
    },
    onSubmit: async ({ value }) => {
      const payload = {
        ...value,
        lineupLockAt: value.lineupLockAt || undefined,
      };
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          startDate: value.startDate,
          endDate: value.endDate,
          lineupLockAt: value.lineupLockAt || undefined,
          status: value.status,
        });
      } else {
        await createMutation.mutateAsync(payload);
      }
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function openCreate() {
    setEditing(null);
    form.reset({
      championshipId: (championshipId || championships[0]?.id) ?? "",
      startDate: "",
      endDate: "",
      lineupLockAt: "",
      status: "UPCOMING",
    });
    setOpen(true);
  }

  function openEdit(item: Tournament) {
    setEditing(item);
    setOpen(true);
  }

  useEffect(() => {
    if (open && editing) {
      form.reset({
        championshipId: editing.championshipId,
        startDate: editing.startDate ? editing.startDate.slice(0, 10) : "",
        endDate: editing.endDate ? editing.endDate.slice(0, 10) : "",
        lineupLockAt: editing.lineupLockAt
          ? editing.lineupLockAt.slice(0, 16)
          : "",
        status: editing.status,
      });
    }
  }, [open, editing]);

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) importMutation.mutate(file);
    e.target.value = "";
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tournaments</h1>
        <div className="flex items-center gap-2">
          <input
            ref={importRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={handleImport}
          />
          <Button
            variant="outline"
            onClick={() => importRef.current?.click()}
            disabled={importMutation.isPending}
          >
            <UploadIcon className="size-4" />
            {importMutation.isPending ? "Importing…" : "Import CSV"}
          </Button>
          <Dialog
            open={open}
            onOpenChange={(o) => {
              setOpen(o);
              if (!o) {
                setEditing(null);
                form.reset();
              }
            }}
          >
            <Button onClick={openCreate}>
              <PlusIcon className="size-4" />
              New Tournament
            </Button>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editing ? "Edit Tournament" : "New Tournament"}
                </DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void form.handleSubmit();
                }}
                className="space-y-4"
              >
                <FieldGroup>
                  {!editing && (
                    <form.Field
                      name="championshipId"
                      validators={{
                        onChange: ({ value }) =>
                          !value ? "Championship is required" : undefined,
                      }}
                    >
                      {(field) => (
                        <Field
                          data-invalid={
                            field.state.meta.isTouched &&
                            field.state.meta.errors.length > 0
                          }
                        >
                          <FieldLabel>Championship</FieldLabel>
                          <Select
                            value={field.state.value}
                            onValueChange={(v) => field.handleChange(v ?? "")}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select championship">
                                {(value) => {
                                  if (!value) return undefined;
                                  const c = championships.find(
                                    (ch) => ch.id === String(value),
                                  );
                                  return c
                                    ? `${c.name} (${c.seasonYear})`
                                    : "Select championship";
                                }}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {championships.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name} ({c.seasonYear})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FieldError
                            errors={field.state.meta.errors.map((e) => ({
                              message: String(e),
                            }))}
                          />
                        </Field>
                      )}
                    </form.Field>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <form.Field
                      name="startDate"
                      validators={{
                        onChange: ({ value }) =>
                          !value ? "Required" : undefined,
                      }}
                    >
                      {(field) => (
                        <Field
                          data-invalid={
                            field.state.meta.isTouched &&
                            field.state.meta.errors.length > 0
                          }
                        >
                          <FieldLabel>Start Date</FieldLabel>
                          <DatePickerField
                            value={field.state.value}
                            onChange={field.handleChange}
                            onBlur={field.handleBlur}
                            placeholder="Pick start date"
                          />
                          <FieldError
                            errors={field.state.meta.errors.map((e) => ({
                              message: String(e),
                            }))}
                          />
                        </Field>
                      )}
                    </form.Field>

                    <form.Field
                      name="endDate"
                      validators={{
                        onChange: ({ value }) =>
                          !value ? "Required" : undefined,
                      }}
                    >
                      {(field) => (
                        <Field
                          data-invalid={
                            field.state.meta.isTouched &&
                            field.state.meta.errors.length > 0
                          }
                        >
                          <FieldLabel>End Date</FieldLabel>
                          <DatePickerField
                            value={field.state.value}
                            onChange={field.handleChange}
                            onBlur={field.handleBlur}
                            placeholder="Pick end date"
                          />
                          <FieldError
                            errors={field.state.meta.errors.map((e) => ({
                              message: String(e),
                            }))}
                          />
                        </Field>
                      )}
                    </form.Field>
                  </div>

                  <form.Field name="lineupLockAt">
                    {(field) => (
                      <Field>
                        <FieldLabel>Lineup Lock Time (optional)</FieldLabel>
                        <DateTimePickerField
                          value={field.state.value}
                          onChange={field.handleChange}
                          onBlur={field.handleBlur}
                          placeholder="Pick lock date and time"
                        />
                      </Field>
                    )}
                  </form.Field>

                  {editing && (
                    <form.Field name="status">
                      {(field) => (
                        <Field>
                          <FieldLabel>Status</FieldLabel>
                          <Select
                            value={field.state.value}
                            onValueChange={(v) =>
                              field.handleChange(
                                (v ?? "UPCOMING") as TournamentStatus,
                              )
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select status">
                                {(value) =>
                                  value
                                    ? STATUS_LABEL[value as TournamentStatus]
                                    : undefined
                                }
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {(
                                Object.keys(STATUS_LABEL) as TournamentStatus[]
                              ).map((status) => (
                                <SelectItem key={status} value={status}>
                                  {STATUS_LABEL[status]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-sm text-muted-foreground">
                            Setting a tournament to `LOCKED` locks all lineups.
                            Setting it to `COMPLETED` runs the scoring pipeline.
                          </p>
                        </Field>
                      )}
                    </form.Field>
                  )}
                </FieldGroup>

                <DialogFooter>
                  <form.Subscribe
                    selector={(s) => [s.canSubmit, s.isSubmitting]}
                  >
                    {([canSubmit, isSubmitting]) => (
                      <Button
                        type="submit"
                        disabled={!canSubmit || isSubmitting || isPending}
                      >
                        {isSubmitting || isPending
                          ? "Saving…"
                          : editing
                            ? "Save changes"
                            : "Create"}
                      </Button>
                    )}
                  </form.Subscribe>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Championship selector */}
      <div className="flex items-center gap-3">
        <Select
          value={championshipId}
          onValueChange={(v) => {
            setChampionshipId(v ?? "");
            setPagination((p) => ({ ...p, pageIndex: 0 }));
          }}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select championship">
              {(value) => {
                if (!value) return "Select championship";
                const c = championships.find((ch) => ch.id === String(value));
                return c
                  ? `${c.name} (${c.seasonYear})`
                  : "Select championship";
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {championships.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} ({c.seasonYear})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>End</TableHead>
              <TableHead>Lineup Lock</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {!championshipId ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  Select a championship to view tournaments.
                </TableCell>
              </TableRow>
            ) : isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : tournaments.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  No tournaments found.
                </TableCell>
              </TableRow>
            ) : (
              tournaments.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[t.status]}>
                      {STATUS_LABEL[t.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(t.startDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {new Date(t.endDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {t.lineupLockAt
                      ? new Date(t.lineupLockAt).toLocaleString()
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(t)}
                      >
                        <PencilIcon className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        render={<Link to={`/admin/tournaments/${t.id}`} />}
                      >
                        <EyeIcon className="size-4" />
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
            {tournamentsData && ` · ${tournamentsData.meta.total} total`}
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
    </div>
  );
}
