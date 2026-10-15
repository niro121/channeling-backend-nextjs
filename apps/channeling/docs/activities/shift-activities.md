# Shift – what is logged

- **shift.started** – User starts a shift.
- **shift.paused** – User pauses an active shift.
- **shift.resumed** – User resumes a paused shift.
- **shift.ended** – User ends a shift (active or paused). Also logged per leftover shift closed when a later full-till handover is approved (`leftoverOnHandoverApproval` in metadata).
- **shift.leftover.ended_on_handover** – Summary log when leftover open shifts are ended because a later full-till handover was approved. Entity is the approved `ShiftHandover`.
