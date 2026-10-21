import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, List, UserPlus } from 'lucide-react';
import { Button } from '@archmage/ui';
import { getAppointmentLetterOnboardContextAction } from '@/app/actions/recruitment-actions/staff-onboard.actions';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { checkRouteAccess } from '@/lib/server-permissions';
import { buttonStyles } from '@/lib/utils/common-styles';

type SearchParams = {
  searchParams?: Promise<{
    letterId?: string;
    candidate?: string;
  }>;
};

export default async function StaffOnboardPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/staff');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const params = await searchParams;
  const letterId = params?.letterId?.trim() ?? '';

  if (!letterId) {
    return (
      <div className="space-y-6">
        <CommonManagerHeader
          title="Staff onboarding"
          description="Start from an accepted appointment letter."
          backwordButton
        />
        <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          Missing letter ID. Open onboarding from Appointment Letters (UserPlus
          on an accepted offer).
        </div>
        <Button variant="outline" className={buttonStyles.cancel.healthy} asChild>
          <Link href="/appointment-letters">Back to Appointment Letters</Link>
        </Button>
      </div>
    );
  }

  const ctx = await getAppointmentLetterOnboardContextAction(letterId);
  if (ctx.isError || !ctx.data) {
    return (
      <div className="space-y-6">
        <CommonManagerHeader
          title="Staff onboarding"
          description="Appointment letter handoff"
          backwordButton
        />
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          {ctx.errors?.message ?? 'Unable to load appointment letter.'}
        </div>
        <Button variant="outline" className={buttonStyles.cancel.healthy} asChild>
          <Link href="/appointment-letters">Back to Appointment Letters</Link>
        </Button>
      </div>
    );
  }

  const { letter, employmentHints } = ctx.data;
  const createHref = `/staff/add?from=appointment&letterId=${encodeURIComponent(letter.letterId)}`;
  const listHref = `/staff?keyword=${encodeURIComponent(letter.candidateName)}`;

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Staff onboarding"
        description={`Handoff from appointment letter ${letter.letterNumber}`}
        backwordButton
      />

      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Offer summary
        </h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Candidate</dt>
            <dd className="font-medium">{letter.candidateName}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Letter</dt>
            <dd className="font-medium tabular-nums">{letter.letterNumber}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Position</dt>
            <dd className="font-medium">{letter.position || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Department</dt>
            <dd className="font-medium">{letter.department || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Reporting date</dt>
            <dd className="font-medium tabular-nums">
              {letter.appointmentDate || '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Salary</dt>
            <dd className="font-medium">{letter.salary || '—'}</dd>
          </div>
        </dl>
        {(employmentHints.department || employmentHints.designation) && (
          <p className="mt-4 text-xs text-muted-foreground">
            After creating staff, complete the Employment tab (department / designation
            / category) using the offer details above.
          </p>
        )}
      </div>

      {letter.alreadyOnboarded && letter.staffId ? (
        <div className="space-y-4 rounded-lg border border-emerald-200 bg-emerald-50/60 p-5">
          <p className="text-sm text-emerald-900">
            This letter is already linked to a staff record.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button className={buttonStyles.save} asChild>
              <Link href={`/staff/${letter.staffId}/edit`}>
                Open staff record
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" className={buttonStyles.cancel.healthy} asChild>
              <Link href="/staff">Browse staff list</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-lg border border-primary/20 bg-card p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <UserPlus className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">Create staff from letter</h3>
            <p className="text-sm text-muted-foreground">
              Open Add Staff with name, contact, and join date prefilled from this
              offer. NIC and remaining HR fields still need confirmation.
            </p>
            <Button className={`${buttonStyles.save} mt-auto gap-1.5`} asChild>
              <Link href={createHref}>
                Create with prefill
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-foreground">
              <List className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">Browse staff list</h3>
            <p className="text-sm text-muted-foreground">
              Go to the staff register (search prefilled with the candidate name) if
              the person may already exist or you prefer to create manually.
            </p>
            <Button
              variant="outline"
              className={`${buttonStyles.cancel.healthy} mt-auto gap-1.5`}
              asChild
            >
              <Link href={listHref}>
                Open staff list
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
