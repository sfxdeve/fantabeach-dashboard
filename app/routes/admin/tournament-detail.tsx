import { useRef, useState } from "react";
import { useParams, Link } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  PlusIcon,
  PencilIcon,
  ClockIcon,
  UploadIcon,
} from "lucide-react";
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
import { DateTimePickerField } from "~/components/ui/date-picker";
import { HttpAdminApi } from "~/lib/api/http-admin-api";
import type {
  Athlete,
  Match,
  MatchRound,
  MatchSide,
  MatchStatus,
  TournamentStatus,
} from "~/lib/api/types";

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

const MATCH_STATUS_LABEL: Record<MatchStatus, string> = {
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CORRECTED: "Corrected",
};

const MATCH_ROUND_LABEL: Record<MatchRound, string> = {
  QUALIFICATION_R1: "Qual R1",
  QUALIFICATION_R2: "Qual R2",
  POOL: "Pool",
  R12: "R12",
  QF: "QF",
  SF: "SF",
  FINAL: "Final",
  THIRD_PLACE: "3rd Place",
};

const MATCH_ROUNDS: MatchRound[] = [
  "QUALIFICATION_R1",
  "QUALIFICATION_R2",
  "POOL",
  "R12",
  "QF",
  "SF",
  "FINAL",
  "THIRD_PLACE",
];

function athleteName(id: string, athletes: Athlete[]): string {
  const a = athletes.find((x) => x.id === id);
  return a ? `${a.firstName} ${a.lastName}` : id;
}

function formatScore(match: Match): string {
  const sets: string[] = [];
  if (match.set1A != null && match.set1B != null)
    sets.push(`${match.set1A}:${match.set1B}`);
  if (match.set2A != null && match.set2B != null)
    sets.push(`${match.set2A}:${match.set2B}`);
  if (match.set3A != null && match.set3B != null)
    sets.push(`${match.set3A}:${match.set3B}`);
  return sets.length > 0 ? sets.join(" ") : "—";
}

// ── Athlete Selector Field ─────────────────────────────────────────────────

function AthleteSelect({
  value,
  onChange,
  athletes,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  athletes: Athlete[];
  placeholder: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v ?? "")}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder}>
          {(v) => {
            if (!v) return undefined;
            const a = athletes.find((x) => x.id === String(v));
            return a ? `${a.firstName} ${a.lastName}` : placeholder;
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {athletes.map((a) => (
          <SelectItem key={a.id} value={a.id}>
            {a.firstName} {a.lastName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ── Result Dialog ──────────────────────────────────────────────────────────

function ResultDialog({
  match,
  athletes,
  onClose,
}: {
  match: Match;
  athletes: Athlete[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const resultMutation = useMutation({
    mutationFn: (input: Parameters<typeof adminApi.enterMatchResult>[1]) =>
      adminApi.enterMatchResult(match.id, input),
    onSuccess: () => {
      toast.success("Result saved");
      void queryClient.invalidateQueries({
        queryKey: ["matches", match.tournamentId],
      });
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  const sideA = `${athleteName(match.sideAAthlete1Id, athletes)} / ${athleteName(match.sideAAthlete2Id, athletes)}`;
  const sideB = `${athleteName(match.sideBAthlete1Id, athletes)} / ${athleteName(match.sideBAthlete2Id, athletes)}`;

  const form = useForm({
    defaultValues: {
      set1A: match.set1A != null ? String(match.set1A) : "",
      set1B: match.set1B != null ? String(match.set1B) : "",
      set2A: match.set2A != null ? String(match.set2A) : "",
      set2B: match.set2B != null ? String(match.set2B) : "",
      set3A: match.set3A != null ? String(match.set3A) : "",
      set3B: match.set3B != null ? String(match.set3B) : "",
      winnerSide: (match.winnerSide ?? "") as MatchSide | "",
    },
    onSubmit: async ({ value }) => {
      const toNum = (v: string) => (v.trim() !== "" ? Number(v) : undefined);
      const set3A = toNum(value.set3A);
      const set3B = toNum(value.set3B);
      await resultMutation.mutateAsync({
        set1A: Number(value.set1A),
        set1B: Number(value.set1B),
        set2A: Number(value.set2A),
        set2B: Number(value.set2B),
        ...(set3A !== undefined && set3B !== undefined ? { set3A, set3B } : {}),
        winnerSide: value.winnerSide as MatchSide,
      });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
      className="space-y-4"
    >
      <div className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Side A:</span> {sideA}
        <br />
        <span className="font-medium text-foreground">Side B:</span> {sideB}
      </div>

      <FieldGroup>
        <div className="space-y-2">
          <p className="text-sm font-medium">Set Scores (A : B)</p>
          {(["1", "2", "3"] as const).map((set) => (
            <div key={set} className="flex items-center gap-2">
              <span className="w-12 text-sm text-muted-foreground">
                Set {set}
                {set === "3" ? " (opt)" : ""}
              </span>
              <form.Field name={`set${set}A` as "set1A" | "set2A" | "set3A"}>
                {(field) => (
                  <Input
                    type="number"
                    min={0}
                    className="w-20 text-center"
                    placeholder="A"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                )}
              </form.Field>
              <span className="text-muted-foreground">:</span>
              <form.Field name={`set${set}B` as "set1B" | "set2B" | "set3B"}>
                {(field) => (
                  <Input
                    type="number"
                    min={0}
                    className="w-20 text-center"
                    placeholder="B"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                )}
              </form.Field>
            </div>
          ))}
        </div>

        <form.Field
          name="winnerSide"
          validators={{
            onChange: ({ value }) =>
              !value ? "Winner is required" : undefined,
          }}
        >
          {(field) => (
            <Field
              data-invalid={
                field.state.meta.isTouched && field.state.meta.errors.length > 0
              }
            >
              <FieldLabel>Winner</FieldLabel>
              <Select
                value={field.state.value}
                onValueChange={(v) =>
                  field.handleChange((v ?? "") as MatchSide | "")
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select winner">
                    {(v) => {
                      if (v === "A") return `Side A: ${sideA}`;
                      if (v === "B") return `Side B: ${sideB}`;
                      return undefined;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Side A: {sideA}</SelectItem>
                  <SelectItem value="B">Side B: {sideB}</SelectItem>
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
      </FieldGroup>

      <DialogFooter>
        <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
          {([canSubmit, isSubmitting]) => (
            <Button
              type="submit"
              disabled={!canSubmit || isSubmitting || resultMutation.isPending}
            >
              {isSubmitting || resultMutation.isPending
                ? "Saving…"
                : "Save Result"}
            </Button>
          )}
        </form.Subscribe>
      </DialogFooter>
    </form>
  );
}

// ── Match Form (Create / Edit) ─────────────────────────────────────────────

function MatchForm({
  tournamentId,
  athletes,
  match,
  onClose,
}: {
  tournamentId: string;
  athletes: Athlete[];
  match?: Match;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (input: Parameters<typeof adminApi.createMatch>[0]) =>
      adminApi.createMatch(input),
    onSuccess: () => {
      toast.success("Match created");
      void queryClient.invalidateQueries({
        queryKey: ["matches", tournamentId],
      });
      onClose();
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Create failed"),
  });

  const updateMutation = useMutation({
    mutationFn: (input: Parameters<typeof adminApi.updateMatch>[1]) =>
      adminApi.updateMatch(match!.id, input),
    onSuccess: () => {
      toast.success("Match updated");
      void queryClient.invalidateQueries({
        queryKey: ["matches", tournamentId],
      });
      onClose();
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  const form = useForm({
    defaultValues: {
      round: (match?.round ?? "POOL") as MatchRound,
      scheduledAt: match?.scheduledAt ? match.scheduledAt.slice(0, 16) : "",
      sideAAthlete1Id: match?.sideAAthlete1Id ?? "",
      sideAAthlete2Id: match?.sideAAthlete2Id ?? "",
      sideBAthlete1Id: match?.sideBAthlete1Id ?? "",
      sideBAthlete2Id: match?.sideBAthlete2Id ?? "",
    },
    onSubmit: async ({ value }) => {
      if (match) {
        await updateMutation.mutateAsync({
          round: value.round,
          scheduledAt: value.scheduledAt || undefined,
          sideAAthlete1Id: value.sideAAthlete1Id || undefined,
          sideAAthlete2Id: value.sideAAthlete2Id || undefined,
          sideBAthlete1Id: value.sideBAthlete1Id || undefined,
          sideBAthlete2Id: value.sideBAthlete2Id || undefined,
        });
      } else {
        await createMutation.mutateAsync({
          tournamentId,
          round: value.round,
          scheduledAt: value.scheduledAt,
          sideAAthlete1Id: value.sideAAthlete1Id,
          sideAAthlete2Id: value.sideAAthlete2Id,
          sideBAthlete1Id: value.sideBAthlete1Id,
          sideBAthlete2Id: value.sideBAthlete2Id,
        });
      }
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const athleteField = (
    name:
      | "sideAAthlete1Id"
      | "sideAAthlete2Id"
      | "sideBAthlete1Id"
      | "sideBAthlete2Id",
    label: string,
  ) => (
    <form.Field
      name={name}
      validators={{
        onChange: ({ value }) => (!value ? "Required" : undefined),
      }}
    >
      {(field) => (
        <Field
          data-invalid={
            field.state.meta.isTouched && field.state.meta.errors.length > 0
          }
        >
          <FieldLabel>{label}</FieldLabel>
          <AthleteSelect
            value={field.state.value}
            onChange={field.handleChange}
            athletes={athletes}
            placeholder={`Select ${label}`}
          />
          <FieldError
            errors={field.state.meta.errors.map((e) => ({
              message: String(e),
            }))}
          />
        </Field>
      )}
    </form.Field>
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
      className="space-y-4"
    >
      <FieldGroup>
        <form.Field name="round">
          {(field) => (
            <Field>
              <FieldLabel>Round</FieldLabel>
              <Select
                value={field.state.value}
                onValueChange={(v) => field.handleChange(v as MatchRound)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select round">
                    {(v) =>
                      v ? MATCH_ROUND_LABEL[v as MatchRound] : undefined
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {MATCH_ROUNDS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {MATCH_ROUND_LABEL[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        </form.Field>

        <form.Field
          name="scheduledAt"
          validators={{
            onChange: ({ value }) =>
              !match && !value ? "Required" : undefined,
          }}
        >
          {(field) => (
            <Field
              data-invalid={
                field.state.meta.isTouched && field.state.meta.errors.length > 0
              }
            >
              <FieldLabel>Scheduled At{match ? " (optional)" : ""}</FieldLabel>
              <DateTimePickerField
                value={field.state.value}
                onChange={field.handleChange}
                onBlur={field.handleBlur}
                placeholder="Pick date and time"
              />
              <FieldError
                errors={field.state.meta.errors.map((e) => ({
                  message: String(e),
                }))}
              />
            </Field>
          )}
        </form.Field>

        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Side A</p>
          <div className="grid grid-cols-2 gap-3">
            {athleteField("sideAAthlete1Id", "Athlete 1")}
            {athleteField("sideAAthlete2Id", "Athlete 2")}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Side B</p>
          <div className="grid grid-cols-2 gap-3">
            {athleteField("sideBAthlete1Id", "Athlete 1")}
            {athleteField("sideBAthlete2Id", "Athlete 2")}
          </div>
        </div>
      </FieldGroup>

      <DialogFooter>
        <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
          {([canSubmit, isSubmitting]) => (
            <Button
              type="submit"
              disabled={!canSubmit || isSubmitting || isPending}
            >
              {isSubmitting || isPending
                ? "Saving…"
                : match
                  ? "Save changes"
                  : "Create"}
            </Button>
          )}
        </form.Subscribe>
      </DialogFooter>
    </form>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export function meta() {
  return [{ title: "Tournament — FantaBeach Admin" }];
}

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editMatch, setEditMatch] = useState<Match | null>(null);
  const [resultMatch, setResultMatch] = useState<Match | null>(null);
  const [lockOpen, setLockOpen] = useState(false);
  const [lockTime, setLockTime] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  const { data: tournament, isLoading: tournamentLoading } = useQuery({
    queryKey: ["tournament", id],
    queryFn: () => adminApi.getTournament(id!),
    enabled: !!id,
  });

  const { data: matchesData, isLoading: matchesLoading } = useQuery({
    queryKey: ["matches", id],
    queryFn: () => adminApi.getMatchesByTournament(id!),
    enabled: !!id,
  });

  const championshipId = tournament?.championshipId ?? "";

  const { data: athletesData } = useQuery({
    queryKey: ["athletes", { championshipId, limit: 500 }],
    queryFn: () => adminApi.getAthletes({ championshipId, limit: 500 }),
    enabled: !!championshipId,
  });
  const athletes = athletesData?.items ?? [];

  const overrideLockMutation = useMutation({
    mutationFn: (lineupLockAt: string) =>
      adminApi.overrideLineupLock(id!, { lineupLockAt }),
    onSuccess: () => {
      toast.success("Lineup lock updated");
      void queryClient.invalidateQueries({ queryKey: ["tournament", id] });
      setLockOpen(false);
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => adminApi.importMatches(file),
    onSuccess: (result) => {
      toast.success(
        `Import complete: ${result.created} created, ${result.updated} updated`,
      );
      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} rows had errors`);
      }
      void queryClient.invalidateQueries({ queryKey: ["matches", id] });
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Import failed"),
  });

  const matches = matchesData?.items ?? [];

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      importMutation.mutate(file);
    }
    e.target.value = "";
  }

  return (
    <div className="space-y-6">
      {/* Back */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          render={<Link to="/admin/tournaments" />}
        >
          <ArrowLeftIcon className="size-4" />
          Tournaments
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          {tournamentLoading ? (
            <>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </>
          ) : tournament ? (
            <>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold">Tournament</h1>
                <Badge variant={STATUS_VARIANT[tournament.status]}>
                  {STATUS_LABEL[tournament.status]}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {new Date(tournament.startDate).toLocaleDateString()} –{" "}
                {new Date(tournament.endDate).toLocaleDateString()}
                {tournament.lineupLockAt &&
                  ` · Lock: ${new Date(tournament.lineupLockAt).toLocaleString()}`}
              </p>
            </>
          ) : null}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setLockTime(tournament?.lineupLockAt?.slice(0, 16) ?? "");
            setLockOpen(true);
          }}
        >
          <ClockIcon className="size-4" />
          Override Lock Time
        </Button>
      </div>

      {/* Lock override dialog */}
      <Dialog
        open={lockOpen}
        onOpenChange={(o) => {
          if (!o) setLockOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Override Lineup Lock Time</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <DateTimePickerField
              value={lockTime}
              onChange={setLockTime}
              placeholder="Pick new lock time"
            />
            <DialogFooter>
              <Button
                onClick={() => overrideLockMutation.mutate(lockTime)}
                disabled={!lockTime || overrideLockMutation.isPending}
              >
                {overrideLockMutation.isPending
                  ? "Saving…"
                  : "Update Lock Time"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Matches section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Matches</h2>
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
              size="sm"
              onClick={() => importRef.current?.click()}
              disabled={importMutation.isPending}
            >
              <UploadIcon className="size-4" />
              {importMutation.isPending ? "Importing…" : "Import CSV"}
            </Button>
            <Dialog
              open={createOpen}
              onOpenChange={(o) => {
                if (!o) setCreateOpen(false);
              }}
            >
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <PlusIcon className="size-4" />
                New Match
              </Button>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>New Match</DialogTitle>
                </DialogHeader>
                {id && (
                  <MatchForm
                    tournamentId={id}
                    athletes={athletes}
                    onClose={() => setCreateOpen(false)}
                  />
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Round</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Side A</TableHead>
                <TableHead>Side B</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Winner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {matchesLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : matches.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No matches yet.
                  </TableCell>
                </TableRow>
              ) : (
                matches.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{MATCH_ROUND_LABEL[m.round]}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(m.scheduledAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{athleteName(m.sideAAthlete1Id, athletes)}</div>
                      <div className="text-muted-foreground">
                        {athleteName(m.sideAAthlete2Id, athletes)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{athleteName(m.sideBAthlete1Id, athletes)}</div>
                      <div className="text-muted-foreground">
                        {athleteName(m.sideBAthlete2Id, athletes)}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatScore(m)}
                    </TableCell>
                    <TableCell>
                      {m.winnerSide ? (
                        <Badge variant="outline">Side {m.winnerSide}</Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          m.status === "COMPLETED" || m.status === "CORRECTED"
                            ? "default"
                            : m.status === "IN_PROGRESS"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {MATCH_STATUS_LABEL[m.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditMatch(m)}
                        >
                          <PencilIcon className="size-4" />
                        </Button>
                        {(m.status === "SCHEDULED" ||
                          m.status === "IN_PROGRESS") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setResultMatch(m)}
                          >
                            <span className="text-xs font-medium">Result</span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Edit match dialog */}
      <Dialog
        open={!!editMatch}
        onOpenChange={(o) => {
          if (!o) setEditMatch(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Match</DialogTitle>
          </DialogHeader>
          {editMatch && id && (
            <MatchForm
              tournamentId={id}
              athletes={athletes}
              match={editMatch}
              onClose={() => setEditMatch(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Result dialog */}
      <Dialog
        open={!!resultMatch}
        onOpenChange={(o) => {
          if (!o) setResultMatch(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enter Result</DialogTitle>
          </DialogHeader>
          {resultMatch && (
            <ResultDialog
              match={resultMatch}
              athletes={athletes}
              onClose={() => setResultMatch(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
