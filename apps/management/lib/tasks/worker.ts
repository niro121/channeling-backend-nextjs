import { runRecurringJob, runReminderJob } from '@/lib/tasks/recurring';

/**
 * Creates recurring-task occurrences and sends due-soon/overdue reminders every few minutes.
 * Started from instrumentation.ts. Safe with several dynos: occurrences are unique per day
 * and each reminder is claimed before it is sent. Set TASKS_WORKER=false to turn it off.
 */
const INTERVAL_MS = 5 * 60_000;
let started = false;
let running = false;

async function tick() {
  if (running) return;
  running = true;
  try {
    const created = await runRecurringJob();
    const reminded = await runReminderJob();
    if (created || reminded) console.log(`[tasks worker] created ${created} recurring, sent ${reminded} reminders`);
  } catch (error) {
    console.error('[tasks worker]', error);
  } finally {
    running = false;
  }
}

export function startTasksWorker(): void {
  if (started || process.env.TASKS_WORKER === 'false' || !process.env.MANAGEMENT_DATABASE_URL) return;
  started = true;
  setTimeout(() => void tick(), 20_000);
  setInterval(() => void tick(), INTERVAL_MS).unref();
}
