import { httpClient } from "~/lib/api/client";
import { ApiError } from "~/lib/api/client";
import type {
  AuditLog,
  AuditLogFilters,
  Athlete,
  AthleteFilters,
  Championship,
  CreditPack,
  CreditTransaction,
  CreateAthleteInput,
  CreateChampionshipInput,
  CreateCreditPackInput,
  CreateLeagueInput,
  CreateMatchInput,
  CreateTournamentInput,
  GrantCreditsInput,
  League,
  LeagueFilters,
  LineupLockOverrideInput,
  LoginInput,
  Match,
  MatchFilters,
  MatchResultInput,
  ImportResult,
  PagedResult,
  Session,
  Tournament,
  TournamentFilters,
  UpdateAthleteInput,
  UpdateChampionshipInput,
  UpdateLeagueInput,
  UpdateMatchInput,
  UpdateTournamentInput,
  UpdateUserInput,
  User,
  UserFilters,
} from "~/lib/api/types";

function decodeJwtExpiry(token: string): string {
  try {
    const payload = JSON.parse(atob(token.split(".")[1])) as { exp: number };
    return new Date(payload.exp * 1000).toISOString();
  } catch {
    return new Date(Date.now() + 15 * 60 * 1000).toISOString();
  }
}

export class HttpAdminApi {
  // ── Auth ───────────────────────────────────────────────────

  async login(input: LoginInput): Promise<Session> {
    const { data } = await httpClient.post<{
      accessToken: string;
      user: { id: string; name: string; email: string; role: string };
    }>("/api/v1/auth/login", input);

    if (data.user.role !== "ADMIN") {
      throw new ApiError("Admin access required", "FORBIDDEN");
    }

    return {
      token: data.accessToken,
      user: {
        id: data.user.id,
        email: data.user.email,
        displayName: data.user.name,
        active: true,
      },
      expiresAt: decodeJwtExpiry(data.accessToken),
    };
  }

  async logout(): Promise<void> {
    await httpClient.post("/api/v1/auth/logout");
  }

  // ── Championships ──────────────────────────────────────────

  async getChampionships(): Promise<Championship[]> {
    const { data } = await httpClient.get<PagedResult<Championship>>(
      "/api/v1/championships",
      { params: { limit: 500 } },
    );
    return data.items;
  }

  async createChampionship(
    input: CreateChampionshipInput,
  ): Promise<Championship> {
    const { data } = await httpClient.post<{ championship: Championship }>(
      "/api/v1/championships",
      input,
    );
    return data.championship;
  }

  async updateChampionship(
    id: string,
    input: UpdateChampionshipInput,
  ): Promise<Championship> {
    const { data } = await httpClient.patch<{ championship: Championship }>(
      `/api/v1/championships/${id}`,
      input,
    );
    return data.championship;
  }

  async importChampionships(file: File): Promise<ImportResult> {
    const form = new FormData();
    form.append("file", file);
    const { data } = await httpClient.post<ImportResult>(
      "/api/v1/championships/import",
      form,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  }

  // ── Athletes ───────────────────────────────────────────────

  async getAthletes(filters: AthleteFilters): Promise<PagedResult<Athlete>> {
    const { championshipId, ...params } = filters;
    const { data } = await httpClient.get<PagedResult<Athlete>>(
      `/api/v1/championships/${championshipId}/athletes`,
      { params },
    );
    return data;
  }

  async createAthlete(input: CreateAthleteInput): Promise<Athlete> {
    const { data } = await httpClient.post<{ athlete: Athlete }>(
      "/api/v1/athletes",
      input,
    );
    return data.athlete;
  }

  async updateAthlete(id: string, input: UpdateAthleteInput): Promise<Athlete> {
    const { data } = await httpClient.patch<{ athlete: Athlete }>(
      `/api/v1/athletes/${id}`,
      input,
    );
    return data.athlete;
  }

  async deleteAthlete(id: string): Promise<void> {
    await httpClient.delete(`/api/v1/athletes/${id}`);
  }

  async importAthletes(file: File): Promise<ImportResult> {
    const form = new FormData();
    form.append("file", file);
    const { data } = await httpClient.post<ImportResult>(
      "/api/v1/athletes/import",
      form,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  }

  // ── Tournaments ────────────────────────────────────────────

  async getTournaments(
    filters: TournamentFilters,
  ): Promise<PagedResult<Tournament>> {
    const { championshipId, ...params } = filters;
    const { data } = await httpClient.get<PagedResult<Tournament>>(
      `/api/v1/championships/${championshipId}/tournaments`,
      { params },
    );
    return data;
  }

  async getTournament(id: string): Promise<Tournament> {
    const { data } = await httpClient.get<{ tournament: Tournament }>(
      `/api/v1/tournaments/${id}`,
    );
    return data.tournament;
  }

  async createTournament(input: CreateTournamentInput): Promise<Tournament> {
    const { data } = await httpClient.post<{ tournament: Tournament }>(
      "/api/v1/tournaments",
      input,
    );
    return data.tournament;
  }

  async updateTournament(
    id: string,
    input: UpdateTournamentInput,
  ): Promise<Tournament> {
    const { data } = await httpClient.patch<{ tournament: Tournament }>(
      `/api/v1/tournaments/${id}`,
      input,
    );
    return data.tournament;
  }

  async overrideLineupLock(
    id: string,
    input: LineupLockOverrideInput,
  ): Promise<Tournament> {
    const { data } = await httpClient.patch<{ tournament: Tournament }>(
      `/api/v1/tournaments/${id}/lineup-lock`,
      input,
    );
    return data.tournament;
  }

  async importTournaments(file: File): Promise<ImportResult> {
    const form = new FormData();
    form.append("file", file);
    const { data } = await httpClient.post<ImportResult>(
      "/api/v1/tournaments/import",
      form,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  }

  // ── Matches ────────────────────────────────────────────────

  async getMatches(filters?: MatchFilters): Promise<PagedResult<Match>> {
    const { data } = await httpClient.get<PagedResult<Match>>(
      "/api/v1/matches",
      {
        params: filters,
      },
    );
    return data;
  }

  async getMatchesByTournament(
    tournamentId: string,
  ): Promise<PagedResult<Match>> {
    const { data } = await httpClient.get<PagedResult<Match>>(
      `/api/v1/tournaments/${tournamentId}/matches`,
    );
    return data;
  }

  async createMatch(input: CreateMatchInput): Promise<Match> {
    const { data } = await httpClient.post<{ match: Match }>(
      "/api/v1/matches",
      input,
    );
    return data.match;
  }

  async updateMatch(id: string, input: UpdateMatchInput): Promise<Match> {
    const { data } = await httpClient.patch<{ match: Match }>(
      `/api/v1/matches/${id}`,
      input,
    );
    return data.match;
  }

  async enterMatchResult(id: string, input: MatchResultInput): Promise<Match> {
    const { data } = await httpClient.post<{ match: Match }>(
      `/api/v1/matches/${id}/result`,
      input,
    );
    return data.match;
  }

  async importMatches(file: File): Promise<ImportResult> {
    const form = new FormData();
    form.append("file", file);
    const { data } = await httpClient.post<ImportResult>(
      "/api/v1/matches/import",
      form,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  }

  // ── Leagues ────────────────────────────────────────────────

  async getLeagues(filters?: LeagueFilters): Promise<PagedResult<League>> {
    const { data } = await httpClient.get<PagedResult<League>>(
      "/api/v1/admin/leagues",
      { params: filters },
    );
    return data;
  }

  async createLeague(input: CreateLeagueInput): Promise<League> {
    const { data } = await httpClient.post<{ league: League }>(
      "/api/v1/leagues",
      input,
    );
    return data.league;
  }

  async updateLeague(id: string, input: UpdateLeagueInput): Promise<League> {
    const { data } = await httpClient.patch<{ league: League }>(
      `/api/v1/leagues/${id}`,
      input,
    );
    return data.league;
  }

  // ── Credit Packs ───────────────────────────────────────────

  async getCreditPacks(): Promise<CreditPack[]> {
    const { data } = await httpClient.get<{ items: CreditPack[] }>(
      "/api/v1/credits/admin/packs",
    );
    return data.items;
  }

  async createCreditPack(input: CreateCreditPackInput): Promise<CreditPack> {
    const { data } = await httpClient.post<{ pack: CreditPack }>(
      "/api/v1/credits/admin/packs",
      input,
    );
    return data.pack;
  }

  async toggleCreditPack(id: string): Promise<CreditPack> {
    const { data } = await httpClient.patch<{ pack: CreditPack }>(
      `/api/v1/credits/admin/packs/${id}/toggle`,
    );
    return data.pack;
  }

  // ── Credit Transactions ────────────────────────────────────

  async getWalletTransactions(params?: {
    page?: number;
    limit?: number;
  }): Promise<PagedResult<CreditTransaction>> {
    const { data } = await httpClient.get<PagedResult<CreditTransaction>>(
      "/api/v1/admin/transactions",
      { params },
    );
    return data;
  }

  async grantCredits(input: GrantCreditsInput): Promise<void> {
    await httpClient.post("/api/v1/credits/admin/grant", input);
  }

  // ── Users ───────────────────────────────────────────────────

  async getUsers(filters?: UserFilters): Promise<PagedResult<User>> {
    const { data } = await httpClient.get<PagedResult<User>>(
      "/api/v1/admin/users",
      { params: filters },
    );
    return data;
  }

  async getUser(id: string): Promise<User> {
    const { data } = await httpClient.get<{ user: User }>(
      `/api/v1/admin/users/${id}`,
    );
    return data.user;
  }

  async updateUser(id: string, input: UpdateUserInput): Promise<User> {
    const { data } = await httpClient.patch<{ user: User }>(
      `/api/v1/admin/users/${id}`,
      input,
    );
    return data.user;
  }

  // ── Audit Logs ─────────────────────────────────────────────

  async getAuditLogs(
    filters?: AuditLogFilters,
  ): Promise<PagedResult<AuditLog>> {
    const { data } = await httpClient.get<PagedResult<AuditLog>>(
      "/api/v1/admin/audit-logs",
      { params: filters },
    );
    return data;
  }
}
