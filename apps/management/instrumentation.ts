export async function register() {
  // Written as an if-block (not an early return) so the Edge build drops the Node-only import
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startTasksWorker } = await import('./lib/tasks/worker');
    startTasksWorker();
  }
}
