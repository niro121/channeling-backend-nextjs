'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@archmage/ui';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { usePermissions } from '@/components/hooks/use-permissions';
import { buttonStyles } from '@/lib/utils/common-styles';
import type {
  LetterSummary,
  PerformanceSummary,
  RecentEvaluation
} from '@/types/performance';
import SectionLetters from './section-letters';
import SectionRecentEvaluations from './section-recent-evaluations';
import SectionSummary from './section-summary';
import SheetEvaluationForm from './sheet-evaluation-form';

type PerformanceEvaluationsWorkspaceProps = {
  summary: PerformanceSummary;
  recentEvaluations: RecentEvaluation[];
  letters: LetterSummary[];
};

export default function PerformanceEvaluationsWorkspace({
  summary,
  recentEvaluations,
  letters
}: PerformanceEvaluationsWorkspaceProps) {
  const { has } = usePermissions();
  const [formOpen, setFormOpen] = useState(false);
  const canAdd = has('performance', 'add');

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Performance Management"
        description="Reviews, promotions, warnings and appreciations"
        actions={
          canAdd ? (
            <Button
              type="button"
              className={`${buttonStyles.save} gap-1.5`}
              onClick={() => setFormOpen(true)}
            >
              <Plus className="h-4 w-4" />
              New Evaluation
            </Button>
          ) : undefined
        }
      />

      <SectionSummary summary={summary} />

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionRecentEvaluations items={recentEvaluations} />
        <SectionLetters letters={letters} />
      </div>

      <SheetEvaluationForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
