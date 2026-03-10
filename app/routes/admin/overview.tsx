import { useQuery } from "@tanstack/react-query";
import { Trophy, Medal, Users, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
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
import { HttpAdminApi } from "~/lib/api/http-admin-api";

const adminApi = new HttpAdminApi();

const GENDER_LABEL: Record<string, string> = {
  MALE: "Men",
  FEMALE: "Women",
};

export function meta() {
  return [{ title: "Overview — FantaBeach Admin" }];
}

export default function OverviewPage() {
  const { data: championships = [], isLoading: loadingChampionships } =
    useQuery({
      queryKey: ["championships"],
      queryFn: () => adminApi.getChampionships(),
    });

  const { data: leaguesData, isLoading: loadingLeagues } = useQuery({
    queryKey: ["leagues"],
    queryFn: () => adminApi.getLeagues({ limit: 1 }),
  });

  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ["users", "overview"],
    queryFn: () => adminApi.getUsers({ limit: 1 }),
  });

  const recentChampionships = championships.slice(0, 8);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Overview</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Championships"
          value={championships.length}
          icon={Trophy}
          loading={loadingChampionships}
        />
        <StatCard
          title="Leagues"
          value={leaguesData?.meta.total ?? 0}
          icon={Medal}
          loading={loadingLeagues}
        />
        <StatCard
          title="Users"
          value={usersData?.meta.total ?? 0}
          icon={Users}
          loading={loadingUsers}
        />
        <StatCard
          title="Seasons"
          value={new Set(championships.map((c) => c.seasonYear)).size}
          icon={Calendar}
          loading={loadingChampionships}
        />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium">Championships</h2>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Season</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingChampionships ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 4 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : recentChampionships.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No championships yet.
                  </TableCell>
                </TableRow>
              ) : (
                recentChampionships.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {GENDER_LABEL[c.gender] ?? c.gender}
                      </Badge>
                    </TableCell>
                    <TableCell>{c.seasonYear}</TableCell>
                    <TableCell>
                      {new Date(c.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  loading,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-7 w-16" />
        ) : (
          <p className="text-2xl font-bold">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}
