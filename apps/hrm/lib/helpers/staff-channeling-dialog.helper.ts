export function buildChannelingSyncDialogDescription(options: {
  mode: 'create' | 'update' | 'delete' | 'bulkDelete';
  changedFields?: string[];
  linkedCount?: number;
  totalCount?: number;
  hasChannelingLink?: boolean;
}): string {
  const { mode, changedFields = [], linkedCount = 0, totalCount = 0, hasChannelingLink } =
    options;

  if (mode === 'create') {
    return (
      'This will save the staff member in HRM and also create the matching staff record in Channeling. ' +
      'HR-only details such as EPF, ETF, and legacy code will remain in HRM only.'
    );
  }

  if (mode === 'update') {
    if (changedFields.length > 0) {
      return (
        `The following Channeling-related fields have changed: ${changedFields.join(', ')}. ` +
        'Do you want to apply these changes in Channeling as well? HR-only details will remain in HRM only.'
      );
    }

    if (!hasChannelingLink) {
      return (
        'This staff member is not linked to Channeling yet. Do you want to create the matching staff record in Channeling as well?'
      );
    }
  }

  if (mode === 'delete') {
    if (hasChannelingLink) {
      return (
        'This will delete the staff member from HRM and also delete the linked staff record in Channeling. ' +
        'This action cannot be undone.'
      );
    }

    return (
      'This will delete the staff member from HRM only. This staff record is not linked to Channeling.'
    );
  }

  if (mode === 'bulkDelete') {
    if (linkedCount > 0) {
      return (
        `This will delete ${totalCount} staff member(s) from HRM. ` +
        `${linkedCount} of them are linked to Channeling and will also be deleted there. ` +
        'This action cannot be undone.'
      );
    }

    return (
      `This will delete ${totalCount} staff member(s) from HRM. ` +
      'None of the selected records are linked to Channeling.'
    );
  }

  return 'Apply these changes in Channeling as well?';
}
