'use client';

import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { CustomDataTable } from '@/components/common/custom-data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { REPORT_CATEGORIES, reportColumns, type ReportCategory, type ReportListItem } from './columns';

type CategoryFilter = ReportCategory | 'all';

export function ReportsCatalog({ reports }: { reports: ReportListItem[] }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');

  const normalizedQuery = query.trim().toLowerCase();

  const matchingQuery = useMemo(() => {
    if (!normalizedQuery) return reports;
    return reports.filter((report) => {
      const haystack = `${report.masterData} ${report.description}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [reports, normalizedQuery]);

  const counts = useMemo(() => {
    const byCategory = Object.fromEntries(
      REPORT_CATEGORIES.map((name) => [name, matchingQuery.filter((report) => report.category === name).length])
    ) as Record<ReportCategory, number>;
    return { all: matchingQuery.length, ...byCategory };
  }, [matchingQuery]);

  const visible = category === 'all'
    ? matchingQuery
    : matchingQuery.filter((report) => report.category === category);

  const sections = REPORT_CATEGORIES.map((title) => ({
    title,
    items: visible.filter((report) => report.category === title),
  })).filter((section) => section.items.length > 0);

  const filtersActive = normalizedQuery.length > 0 || category !== 'all';

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search reports"
            className="h-9 pl-8 pr-8"
            aria-label="Search reports"
          />
          {query ? (
            <button
              type="button"
              className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <CategoryButton
            label="All"
            count={counts.all}
            active={category === 'all'}
            onClick={() => setCategory('all')}
          />
          {REPORT_CATEGORIES.map((name) => (
            <CategoryButton
              key={name}
              label={name}
              count={counts[name]}
              active={category === name}
              onClick={() => setCategory(name)}
            />
          ))}
          {filtersActive ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9"
              onClick={() => {
                setQuery('');
                setCategory('all');
              }}
            >
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      {sections.length === 0 ? (
        <div className="rounded-lg border border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground">
          No reports match your search.
        </div>
      ) : (
        sections.map((section) => (
          <CustomDataTable<ReportListItem, unknown>
            key={section.title}
            heading={section.title}
            subHeading=""
            columns={reportColumns}
            data={section.items}
            rowCount={section.items.length}
            haveBulkDelete={false}
            showPagination={false}
          />
        ))
      )}
    </div>
  );
}

function CategoryButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={active ? 'default' : 'outline'}
      size="sm"
      className="h-9"
      onClick={onClick}
      disabled={!active && count === 0}
    >
      {label}
      <span className={active ? 'ml-1.5 text-primary-foreground/80' : 'ml-1.5 text-muted-foreground'}>
        {count}
      </span>
    </Button>
  );
}
