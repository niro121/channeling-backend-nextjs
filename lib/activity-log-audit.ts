import fs from 'fs';
import path from 'path';

export type AuditAction = {
  action: string;
  importance: string;
  when: string;
};

export type AuditSection = {
  title: string;
  actions: AuditAction[];
};

/**
 * Read docs/ACTIVITY_LOG_AUDIT.md and return sections with actions.
 * Uses fs.readFileSync + string split/regex only (no markdown parser).
 * Used for "View all tracked actions" in User Activity report.
 */
export function getActivityLogAuditSections(): AuditSection[] {
  const docPath = path.join(process.cwd(), 'docs', 'ACTIVITY_LOG_AUDIT.md');
  let content: string;
  try {
    content = fs.readFileSync(docPath, 'utf-8');
  } catch {
    return [];
  }

  const sections: AuditSection[] = [];
  const sectionBlocks = content.split(/\n## /);

  for (let i = 0; i < sectionBlocks.length; i++) {
    const block = sectionBlocks[i];
    const lines = block.split('\n');
    const titleLine = lines[0]?.trim() ?? '';
    if (!titleLine || titleLine.startsWith('#') || titleLine === 'Summary for Auditors') continue;

    const title = titleLine.replace(/^#+\s*/, '').trim();
    const actions: AuditAction[] = [];

    for (let j = 0; j < lines.length; j++) {
      const line = lines[j];
      const match = line.match(/\|\s*`([^`]+)`\s*\|\s*(Low|Medium|High)\s*\|\s*(.+?)\s*\|/);
      if (match) {
        actions.push({
          action: match[1],
          importance: match[2],
          when: match[3].trim(),
        });
      }
    }

    if (actions.length > 0) {
      sections.push({ title, actions });
    }
  }

  return sections;
}
