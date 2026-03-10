import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { PlusIcon, PencilIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
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
import { HttpAdminApi } from "~/lib/api/http-admin-api";
import type { Athlete, Gender } from "~/lib/api/types";

const adminApi = new HttpAdminApi();

export function meta() {
  return [{ title: "Athletes — FantaBeach Admin" }];
}

export default function AthletesPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Athlete | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Athlete | null>(null);
  const [championshipId, setChampionshipId] = useState<string>("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
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

  const { data: athletesData, isLoading } = useQuery({
    queryKey: [
      "athletes",
      {
        championshipId,
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
      },
    ],
    queryFn: () =>
      adminApi.getAthletes({
        championshipId,
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
      }),
    enabled: !!championshipId,
  });

  const athletes = athletesData?.items ?? [];
  const totalPages = athletesData?.meta.pages ?? 0;

  const createMutation = useMutation({
    mutationFn: (input: {
      firstName: string;
      lastName: string;
      gender: Gender;
      rank: number;
      championshipId: string;
    }) => adminApi.createAthlete(input),
    onSuccess: () => {
      toast.success("Athlete created");
      void queryClient.invalidateQueries({ queryKey: ["athletes"] });
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
      firstName: string;
      lastName: string;
      rank: number;
    }) => adminApi.updateAthlete(id, input),
    onSuccess: () => {
      toast.success("Athlete updated");
      void queryClient.invalidateQueries({ queryKey: ["athletes"] });
      setOpen(false);
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteAthlete(id),
    onSuccess: () => {
      toast.success("Athlete deleted");
      void queryClient.invalidateQueries({ queryKey: ["athletes"] });
      setDeleteTarget(null);
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => adminApi.importAthletes(file),
    onSuccess: (result) => {
      toast.success(
        `Import complete: ${result.created} created, ${result.updated} updated`,
      );
      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} rows had errors`);
      }
      void queryClient.invalidateQueries({ queryKey: ["athletes"] });
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Import failed"),
  });

  const form = useForm({
    defaultValues: {
      firstName: "",
      lastName: "",
      gender: "MALE" as Gender,
      rank: 1,
      championshipId: "",
    },
    onSubmit: async ({ value }) => {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          firstName: value.firstName,
          lastName: value.lastName,
          rank: value.rank,
        });
      } else {
        await createMutation.mutateAsync(value);
      }
    },
  });

  function openCreate() {
    setEditing(null);
    form.reset({
      firstName: "",
      lastName: "",
      gender: "MALE",
      rank: 1,
      championshipId: (championshipId || championships[0]?.id) ?? "",
    });
    setOpen(true);
  }

  function openEdit(item: Athlete) {
    setEditing(item);
    setOpen(true);
  }

  useEffect(() => {
    if (open && editing) {
      form.reset({
        firstName: editing.firstName,
        lastName: editing.lastName,
        gender: editing.gender,
        rank: editing.rank,
        championshipId: editing.championshipId,
      });
    }
  }, [open, editing]);

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      importMutation.mutate(file);
    }
    e.target.value = "";
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Athletes</h1>
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
              New Athlete
            </Button>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editing ? "Edit Athlete" : "New Athlete"}
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
                  <div className="grid grid-cols-2 gap-3">
                    <form.Field
                      name="firstName"
                      validators={{
                        onChange: ({ value }) =>
                          !value.trim() ? "Required" : undefined,
                      }}
                    >
                      {(field) => (
                        <Field
                          data-invalid={
                            field.state.meta.isTouched &&
                            field.state.meta.errors.length > 0
                          }
                        >
                          <FieldLabel htmlFor={field.name}>
                            First Name
                          </FieldLabel>
                          <Input
                            id={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
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
                      name="lastName"
                      validators={{
                        onChange: ({ value }) =>
                          !value.trim() ? "Required" : undefined,
                      }}
                    >
                      {(field) => (
                        <Field
                          data-invalid={
                            field.state.meta.isTouched &&
                            field.state.meta.errors.length > 0
                          }
                        >
                          <FieldLabel htmlFor={field.name}>
                            Last Name
                          </FieldLabel>
                          <Input
                            id={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
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

                  {!editing && (
                    <form.Field name="gender">
                      {(field) => (
                        <Field>
                          <FieldLabel>Gender</FieldLabel>
                          <Select
                            value={field.state.value}
                            onValueChange={(v) =>
                              field.handleChange(v as Gender)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select gender">
                                {(value) =>
                                  value === "MALE"
                                    ? "Men"
                                    : value === "FEMALE"
                                      ? "Women"
                                      : undefined
                                }
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MALE">Men</SelectItem>
                              <SelectItem value="FEMALE">Women</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                      )}
                    </form.Field>
                  )}

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

                  <form.Field
                    name="rank"
                    validators={{
                      onChange: ({ value }) =>
                        value < 1 ? "Rank must be at least 1" : undefined,
                    }}
                  >
                    {(field) => (
                      <Field
                        data-invalid={
                          field.state.meta.isTouched &&
                          field.state.meta.errors.length > 0
                        }
                      >
                        <FieldLabel htmlFor={field.name}>World Rank</FieldLabel>
                        <Input
                          id={field.name}
                          type="number"
                          min={1}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) =>
                            field.handleChange(Number(e.target.value))
                          }
                        />
                        <FieldError
                          errors={field.state.meta.errors.map((e) => ({
                            message: String(e),
                          }))}
                        />
                      </Field>
                    )}
                  </form.Field>
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

      {/* Championship filter */}
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

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Rank</TableHead>
              <TableHead>Cost (FC)</TableHead>
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
                  Select a championship to view athletes.
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
            ) : athletes.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  No athletes found.
                </TableCell>
              </TableRow>
            ) : (
              athletes.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">
                    {a.firstName} {a.lastName}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {a.gender === "MALE" ? "Men" : "Women"}
                    </Badge>
                  </TableCell>
                  <TableCell>#{a.rank}</TableCell>
                  <TableCell>{a.cost} FC</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(a)}
                      >
                        <PencilIcon className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(a)}
                      >
                        <Trash2Icon className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.pageIndex + 1} of {totalPages}
            {athletesData && ` · ${athletesData.meta.total} total`}
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

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete athlete?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <strong>
                {deleteTarget?.firstName} {deleteTarget?.lastName}
              </strong>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteTarget && deleteMutation.mutate(deleteTarget.id)
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
