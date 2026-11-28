import { Badge, Card, CardContent, CardHeader, CardTitle } from '@archmage/ui';
import {
  EVALUATION_SCORE_MAX,
  type RecentEvaluation
} from '@/types/performance';

/** Green ≥ 4.0, amber 3.0–3.9, red < 3.0 (matches the Evaluations preview). */
function getScoreClassName(score: number): string {
  if (score >= 4) return 'border-0 bg-emerald-100 text-emerald-800 hover:bg-emerald-100';
  if (score >= 3) return 'border-0 bg-amber-100 text-amber-800 hover:bg-amber-100';
  return 'border-0 bg-red-100 text-red-700 hover:bg-red-100';
}

type SectionRecentEvaluationsProps = {
  items: RecentEvaluation[];
};

export default function SectionRecentEvaluations({
  items
}: SectionRecentEvaluationsProps) {
  return (
    <Card className="rounded-lg border border-border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Recent Evaluations</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No recent evaluations.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.department}
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className={`shrink-0 tabular-nums ${getScoreClassName(item.score)}`}
                >
                  {item.score.toFixed(1)} / {EVALUATION_SCORE_MAX.toFixed(1)}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
