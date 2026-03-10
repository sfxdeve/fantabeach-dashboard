// ── Enums ─────────────────────────────────────────────────────

export type Gender = "MALE" | "FEMALE";

export type TournamentStatus =
  | "UPCOMING"
  | "REGISTRATION_OPEN"
  | "LOCKED"
  | "ONGOING"
  | "COMPLETED";

export type MatchRound =
  | "QUALIFICATION_R1"
  | "QUALIFICATION_R2"
  | "POOL"
  | "R12"
  | "QF"
  | "SF"
  | "FINAL"
  | "THIRD_PLACE";

export type MatchStatus =
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CORRECTED";

export type MatchSide = "A" | "B";

export type LeagueType = "PUBLIC" | "PRIVATE";
export type RankingMode = "OVERALL" | "HEAD_TO_HEAD";

export type CreditTransactionType = "PURCHASE" | "SPEND" | "BONUS" | "REFUND";
export type CreditTransactionSource = "STRIPE" | "ADMIN" | "SYSTEM";

export type UserRole = "ADMIN" | "USER";

// ── Pagination ────────────────────────────────────────────────

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PagedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface ImportResult {
  created: number;
  updated: number;
  errors: unknown[];
}

// ── API Error ─────────────────────────────────────────────────

export interface ApiErrorEnvelope {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  traceId?: string;
}

// ── Auth & Session ────────────────────────────────────────────

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  active: boolean;
}

export interface Session {
  token: string;
  user: AdminUser;
  expiresAt: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

// ── Championship ──────────────────────────────────────────────

export interface Championship {
  id: string;
  name: string;
  gender: Gender;
  seasonYear: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChampionshipInput {
  name: string;
  gender: Gender;
  seasonYear: number;
}

export type UpdateChampionshipInput = Partial<CreateChampionshipInput>;

// ── Athlete ───────────────────────────────────────────────────

export interface Athlete {
  id: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  rank: number;
  cost: number;
  championshipId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AthleteFilters extends PaginationParams {
  championshipId: string;
}

export interface CreateAthleteInput {
  firstName: string;
  lastName: string;
  gender: Gender;
  rank: number;
  championshipId: string;
}

export interface UpdateAthleteInput {
  firstName?: string;
  lastName?: string;
  rank?: number;
}

// ── Tournament ────────────────────────────────────────────────

export interface Tournament {
  id: string;
  championshipId: string;
  startDate: string;
  endDate: string;
  status: TournamentStatus;
  lineupLockAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TournamentFilters extends PaginationParams {
  championshipId: string;
}

export interface CreateTournamentInput {
  championshipId: string;
  startDate: string;
  endDate: string;
  lineupLockAt?: string;
}

export interface UpdateTournamentInput {
  status?: TournamentStatus;
  startDate?: string;
  endDate?: string;
  lineupLockAt?: string | null;
}

export interface LineupLockOverrideInput {
  lineupLockAt: string;
}

// ── Match ─────────────────────────────────────────────────────

export interface Match {
  id: string;
  tournamentId: string;
  round: MatchRound;
  status: MatchStatus;
  scheduledAt: string;
  set1A?: number | null;
  set1B?: number | null;
  set2A?: number | null;
  set2B?: number | null;
  set3A?: number | null;
  set3B?: number | null;
  winnerSide?: MatchSide | null;
  sideAAthlete1Id: string;
  sideAAthlete2Id: string;
  sideBAthlete1Id: string;
  sideBAthlete2Id: string;
  createdAt: string;
  updatedAt: string;
}

export interface MatchFilters {
  tournamentId?: string;
  round?: MatchRound;
  status?: MatchStatus;
}

export interface CreateMatchInput {
  tournamentId: string;
  round: MatchRound;
  scheduledAt: string;
  sideAAthlete1Id: string;
  sideAAthlete2Id: string;
  sideBAthlete1Id: string;
  sideBAthlete2Id: string;
}

export interface UpdateMatchInput {
  round?: MatchRound;
  scheduledAt?: string;
  sideAAthlete1Id?: string;
  sideAAthlete2Id?: string;
  sideBAthlete1Id?: string;
  sideBAthlete2Id?: string;
}

export interface MatchResultInput {
  set1A: number;
  set1B: number;
  set2A: number;
  set2B: number;
  set3A?: number;
  set3B?: number;
  winnerSide: MatchSide;
}

// ── League ────────────────────────────────────────────────────

export interface League {
  id: string;
  name: string;
  type: LeagueType;
  joinCode?: string | null;
  rankingMode: RankingMode;
  isOpen: boolean;
  rosterSize: number;
  startersSize: number;
  budgetPerTeam: number;
  entryFeeCredits?: number | null;
  maxMembers?: number | null;
  isMarketEnabled: boolean;
  prize1st?: string | null;
  prize2nd?: string | null;
  prize3rd?: string | null;
  championshipId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeagueFilters extends PaginationParams {
  type?: LeagueType;
}

export interface CreatePublicLeagueInput {
  type: "PUBLIC";
  name: string;
  championshipId: string;
  rosterSize: number;
  startersSize: number;
  budgetPerTeam: number;
  entryFeeCredits?: number;
  maxMembers?: number;
  isMarketEnabled?: boolean;
  prize1st?: string;
  prize2nd?: string;
  prize3rd?: string;
}

export interface CreatePrivateLeagueInput {
  type: "PRIVATE";
  name: string;
  championshipId: string;
  rankingMode?: RankingMode;
  rosterSize: number;
  startersSize: number;
  budgetPerTeam: number;
  entryFeeCredits?: number;
  maxMembers?: number;
  isMarketEnabled?: boolean;
  prize1st?: string;
  prize2nd?: string;
  prize3rd?: string;
}

export type CreateLeagueInput =
  | CreatePublicLeagueInput
  | CreatePrivateLeagueInput;

export interface UpdateLeagueInput {
  name?: string;
  isOpen?: boolean;
  maxMembers?: number | null;
  prize1st?: string | null;
  prize2nd?: string | null;
  prize3rd?: string | null;
}

// ── CreditPack ────────────────────────────────────────────────

export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  priceCents: number;
  stripePriceId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCreditPackInput {
  name: string;
  credits: number;
  priceCents: number;
  stripePriceId: string;
  isActive?: boolean;
}

// ── CreditTransaction ─────────────────────────────────────────

export interface CreditTransaction {
  id: string;
  walletId: string;
  type: CreditTransactionType;
  source: CreditTransactionSource;
  amount: number;
  newBalance: number;
  meta?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface GrantCreditsInput {
  userId: string;
  amount: number;
  reason?: string;
}

// ── User ──────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isVerified: boolean;
  isBlocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserFilters extends PaginationParams {
  email?: string;
  isBlocked?: boolean;
}

export interface UpdateUserInput {
  isBlocked?: boolean;
  role?: UserRole;
}

// ── AuditLog ──────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  adminId: string;
  admin: { id: string; name: string; email: string };
  action: string;
  entity: string;
  entityId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogFilters extends PaginationParams {
  entity?: string;
  from?: string;
  to?: string;
}
