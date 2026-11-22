export type ChannelingSyncDialogMode = 'create' | 'update' | 'delete';

export type ChannelingSyncDialogContent = {
  title: string;
  description: string;
  hrmOnlyLabel: string;
  continueLabel: string;
};

/**
 * Build reusable Channeling sync dialog copy for any HRM entity
 * (staff, locations, departments, zones, rooms, etc.).
 */
export function buildChannelingSyncDialog(options: {
  /** Singular label shown in copy, e.g. "location", "staff member". */
  entityLabel: string;
  mode: ChannelingSyncDialogMode;
  hasChannelingLink?: boolean;
}): ChannelingSyncDialogContent {
  const { entityLabel, mode, hasChannelingLink } = options;
  const entity = entityLabel.trim() || 'record';

  if (mode === 'create') {
    return {
      title: `Create Channeling ${entity} too?`,
      description:
        `This will save the ${entity} in HRM and also create the matching ${entity} in Channeling. ` +
        'Choose Save HRM only to skip Channeling, Cancel to discard, or Continue to save in both apps.',
      hrmOnlyLabel: 'Save HRM only',
      continueLabel: 'Continue'
    };
  }

  if (mode === 'delete') {
    if (hasChannelingLink) {
      return {
        title: `Delete Channeling ${entity} too?`,
        description:
          `This will delete the ${entity} from HRM and also delete the linked record in Channeling. ` +
          'Choose Delete HRM only to skip Channeling, Cancel to discard, or Continue to delete from both apps.',
        hrmOnlyLabel: 'Delete HRM only',
        continueLabel: 'Continue'
      };
    }

    return {
      title: `Delete ${entity}?`,
      description:
        `This ${entity} is not linked to Channeling. Choose Delete HRM only to remove it from HRM, or Cancel to discard.`,
      hrmOnlyLabel: 'Delete HRM only',
      continueLabel: 'Continue'
    };
  }

  if (!hasChannelingLink) {
    return {
      title: `Create Channeling ${entity} too?`,
      description:
        `You are updating this ${entity} in HRM. It is not linked to Channeling yet. ` +
        'Choose Update HRM only to skip Channeling, Cancel to discard, or Continue to create it in Channeling as well.',
      hrmOnlyLabel: 'Update HRM only',
      continueLabel: 'Continue'
    };
  }

  return {
    title: `Update Channeling ${entity} too?`,
    description:
      `You are updating this ${entity}. Do you want to apply these changes in Channeling as well? ` +
      'Choose Update HRM only to skip Channeling, Cancel to discard, or Continue to update both apps.',
    hrmOnlyLabel: 'Update HRM only',
    continueLabel: 'Continue'
  };
}
