'use client';

import { CustomAlertDialog } from '@archmage/ui';
import { buttonStyles } from '@/lib/utils/common-styles';
import { useManageRosterUi } from './manage-roster-ui-context';

export default function DialogStaffRosterRemoveConfirm() {
  const {
    removeTarget,
    closeRemoveConfirm,
    confirmRemove,
    membershipSaving
  } = useManageRosterUi();

  return (
    <CustomAlertDialog
      open={Boolean(removeTarget)}
      title="Remove from roster group?"
      description={
        removeTarget
          ? `Remove ${removeTarget.staffName} (${removeTarget.staffCode}) from "${removeTarget.rosterName}" (${removeTarget.rosterCode})? This clears roster membership only — day duties and standing assignments are not deleted here.`
          : 'Remove this staff member from the roster group?'
      }
      loading={membershipSaving}
      handleVisibilityChange={(open) => {
        if (!open && !membershipSaving) closeRemoveConfirm();
      }}
      handleContinue={confirmRemove}
      className={{
        actionButton: buttonStyles.delete.danger
      }}
    />
  );
}
