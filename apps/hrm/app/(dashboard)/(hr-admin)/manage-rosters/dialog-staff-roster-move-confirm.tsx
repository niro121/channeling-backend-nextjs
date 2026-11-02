'use client';

import { CustomAlertDialog } from '@archmage/ui';
import { buttonStyles } from '@/lib/utils/common-styles';
import { useManageRosterUi } from './manage-roster-ui-context';

export default function DialogStaffRosterMoveConfirm() {
  const {
    moveConfirm,
    confirmMoveAssign,
    cancelMoveAssign,
    membershipSaving
  } = useManageRosterUi();

  const movers =
    moveConfirm?.candidates.filter((candidate) => {
      const code = candidate.currentRosterCode.trim().toUpperCase();
      return (
        code.length > 0 &&
        code !== moveConfirm.targetRosterCode.trim().toUpperCase()
      );
    }) ?? [];

  const description =
    movers.length === 1
      ? `${movers[0].staffName} (${movers[0].staffCode}) is already on roster "${movers[0].currentRosterName || movers[0].currentRosterCode}". Move them to "${moveConfirm?.targetRosterName}" (${moveConfirm?.targetRosterCode})? Standing shift assignments are not moved automatically.`
      : `${movers.length} selected staff members belong to another roster group. Move them to "${moveConfirm?.targetRosterName}" (${moveConfirm?.targetRosterCode})? Standing shift assignments are not moved automatically.`;

  return (
    <CustomAlertDialog
      open={Boolean(moveConfirm)}
      title="Move staff to this roster?"
      description={description}
      loading={membershipSaving}
      handleVisibilityChange={(open) => {
        if (!open && !membershipSaving) cancelMoveAssign();
      }}
      handleContinue={confirmMoveAssign}
      className={{
        actionButton: buttonStyles.save
      }}
    />
  );
}
