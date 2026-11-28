import type { ReactNode } from 'react';
import { AlertTriangle, Award, ThumbsUp, TrendingUp } from 'lucide-react';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@archmage/ui';
import type { LetterKind, LetterSummary } from '@/types/performance';

type LetterStyle = {
  icon: ReactNode;
  iconWrapClass: string;
  badgeClass: string;
};

const LETTER_STYLES: Record<LetterKind, LetterStyle> = {
  warning: {
    icon: <AlertTriangle className="h-4 w-4 text-red-600" />,
    iconWrapClass: 'bg-red-50',
    badgeClass: 'border-0 bg-red-100 text-red-700 hover:bg-red-100'
  },
  appreciation: {
    icon: <ThumbsUp className="h-4 w-4 text-emerald-700" />,
    iconWrapClass: 'bg-emerald-50',
    badgeClass: 'border-0 bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
  },
  promotion: {
    icon: <TrendingUp className="h-4 w-4 text-emerald-700" />,
    iconWrapClass: 'bg-emerald-50',
    badgeClass: 'border-0 bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
  },
  confirmation: {
    icon: <Award className="h-4 w-4 text-muted-foreground" />,
    iconWrapClass: 'bg-muted',
    badgeClass: 'border-0 bg-muted text-muted-foreground hover:bg-muted'
  }
};

type SectionLettersProps = {
  letters: LetterSummary[];
};

export default function SectionLetters({ letters }: SectionLettersProps) {
  return (
    <Card className="rounded-lg border border-border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Letters &amp; Documents</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {letters.map((letter) => {
            const style = LETTER_STYLES[letter.kind];
            return (
              <div
                key={letter.kind}
                className="rounded-lg border border-border p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${style.iconWrapClass}`}
                  >
                    {style.icon}
                  </span>
                  <Badge variant="secondary" className={style.badgeClass}>
                    {letter.issued} issued
                  </Badge>
                </div>
                <p className="mt-3 text-sm font-medium">{letter.label}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
