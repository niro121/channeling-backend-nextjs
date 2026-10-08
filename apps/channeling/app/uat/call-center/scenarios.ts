import { patientName } from "../cashier-summary/scenarios";
import { WIZARDS, type Wizard } from "../cashier-summary/wizards.generated";

export type Step = {
  id: string;
  do: string;
  amount: string;
  report: string;
};

export type Scenario = {
  id: string;
  title: string;
  learn: string;
  steps: Step[];
};

export type Sheet = {
  no: number;
  note: string;
  doctors: { slot: string; doctor: string; code: string; time: string; hospital: string; professional: string; bill: string }[];
  scenarios: Scenario[];
};

function rs(n: number): string {
  return Math.abs(Math.round(n)).toLocaleString("en-US");
}

export const DECLARATION = [
  "I know how to take a call booking.",
  "I know how to change a call booking.",
  "I know how to cancel a call booking that is not paid.",
  "I know how to book for an agency.",
  "I know how to refund an agency booking and wait for approval.",
  "I know how to cancel an agency booking and wait for approval.",
  "I know how to take an agency deposit by bank slip.",
  "I know how to hand over the shift.",
  "I do not request a float.",
  "I do not take cash.",
];

export function buildSheet(wizard: Wizard): Sheet {
  const [a, b, c] = wizard.sessions;
  const phone = `071${String((8123456 + wizard.no * 120173) % 10000000).padStart(7, "0")}`;
  const p = (slot: number) => patientName(wizard.no, slot, 700);
  const deposit = 1000 + wizard.no * 100;
  const session = (doctor: string, code: string, time: string) => `${doctor} (${code}), ${time}`;

  const scenarios: Scenario[] = [
    {
      id: "call",
      title: "How to take a call booking",
      learn: "Choose On-Call. Do not take money. The patient pays at the hospital. Do not request a float.",
      steps: [
        {
          id: "c-1",
          do: "Open one shift at Ruhunu Hospital. Do not request a float.",
          amount: "—",
          report: "—",
        },
        {
          id: "c-2",
          do: `Book ${session(a.doctor, a.code, a.time)}. Patient ${p(0)}. Choose On-Call. Do not take money.`,
          amount: rs(a.bill),
          report: "Not paid",
        },
        {
          id: "c-3",
          do: `Book ${session(b.doctor, b.code, b.time)}. Patient ${p(1)}. Choose On-Call. Do not take money.`,
          amount: rs(b.bill),
          report: "Not paid",
        },
        {
          id: "c-4",
          do: `Book ${session(c.doctor, c.code, c.time)}. Patient ${p(2)}. Choose On-Call. Do not take money.`,
          amount: rs(c.bill),
          report: "Not paid",
        },
      ],
    },
    {
      id: "change",
      title: "How to change or cancel a call booking",
      learn: "A call booking that is not paid has no refund. Cancel it directly.",
      steps: [
        {
          id: "ch-1",
          do: `Open ${p(0)}. Change. Set the phone to ${phone}. Save.`,
          amount: "—",
          report: "—",
        },
        {
          id: "ch-2",
          do: `Open ${p(1)}. Cancel. It is not paid, so press Cancel Booking. Do not refund any money.`,
          amount: "—",
          report: "Cancelled, not paid",
        },
      ],
    },
    {
      id: "agent",
      title: "How to book for an agency",
      learn: "Book on the agent account. Take no cash. The amount stays on the agency.",
      steps: [
        {
          id: "ag-1",
          do: `Book ${session(a.doctor, a.code, a.time)}. Agency ${wizard.agency} (${wizard.agencyCode}). Patient ${p(3)}. On the agent account. Take no cash.`,
          amount: `${rs(a.bill)} agent`,
          report: "Agent Billed → Agent",
        },
        {
          id: "ag-2",
          do: `Book ${session(c.doctor, c.code, c.time)}. Same agency. Patient ${p(4)}. On the agent account. Take no cash.`,
          amount: `${rs(c.bill)} agent`,
          report: "Agent Billed → Agent",
        },
      ],
    },
    {
      id: "refund",
      title: "How to refund an agency booking — wait for approval",
      learn: "Tick one fee only. Refund to the agent, not as cash. Wait for a manager, then you complete it.",
      steps: [
        {
          id: "rf-1",
          do: `Open ${p(3)}. Refund. Tick Hospital Fee only. Refund to Agent. Remarks: Refund hospital fee. Press Request refund.`,
          amount: rs(a.hospital),
          report: "Waiting",
        },
        {
          id: "rf-2",
          do: "Stop. Wait until a manager approves. Do not end the shift.",
          amount: "—",
          report: "—",
        },
        {
          id: "rf-3",
          do: "When it says Approved, press Refund. No cash leaves your desk.",
          amount: `${rs(a.hospital)} agent`,
          report: "Agent Refunded",
        },
      ],
    },
    {
      id: "cancel",
      title: "How to cancel an agency booking — wait for approval",
      learn: "Cancel returns the whole bill to the agent account. Same wait. No cash.",
      steps: [
        {
          id: "cx-1",
          do: `Open ${p(4)}. Cancel. Refund to Agent. Remarks: Cancel the booking. Press Request cancellation.`,
          amount: rs(c.bill),
          report: "Waiting",
        },
        {
          id: "cx-2",
          do: "Stop. Wait until a manager approves. Do not end the shift.",
          amount: "—",
          report: "—",
        },
        {
          id: "cx-3",
          do: "When it says Approved, press Cancel Booking. No cash leaves your desk.",
          amount: `${rs(c.bill)} agent`,
          report: "Agent Canceled",
        },
      ],
    },
    {
      id: "deposit",
      title: "How to take an agency deposit",
      learn: "Use Ledger. Choose Agency Deposit and pay by bank slip. Do not choose Cash.",
      steps: [
        {
          id: "dp-1",
          do: `Open Ledger. Agency Deposit for ${wizard.agency}. Payment method: Slip, not Cash. Slip reference CC${String(wizard.no).padStart(2, "0")}.`,
          amount: `${rs(deposit)} slip`,
          report: "Agent Deposit → Slip",
        },
      ],
    },
    {
      id: "handover",
      title: "How to hand over for approval",
      learn: "Do this last. Finish every refund and cancel first. An open refund blocks the handover. You have no cash. After you confirm, print the user-wise cashier detail and attach it.",
      steps: [
        {
          id: "ho-1",
          do: "Press End shift.",
          amount: "—",
          report: "—",
        },
        {
          id: "ho-2",
          do: "Cash is 0. Do not enter any cash.",
          amount: "0 cash",
          report: "Handover",
        },
        {
          id: "ho-3",
          do: `Enter the slip for the agency deposit. Card, cheque, credit, and e-wallet are 0.`,
          amount: `${rs(deposit)} slip`,
          report: "Handover",
        },
        {
          id: "ho-4",
          do: "Choose the bulk cashier who will approve it. Press Confirm handover & end shift.",
          amount: "—",
          report: "Handover",
        },
        {
          id: "ho-5",
          do: "Print Userwise Cashier Detail - Channel for this shift. Attach the printout to the handover.",
          amount: "—",
          report: "Attach to handover",
        },
      ],
    },
  ];

  return {
    no: wizard.no,
    note: `Thursday 8 October 2026. Agency: ${wizard.agency} (${wizard.agencyCode}). Take no cash. Do not request a float.`,
    doctors: [
      { slot: "A", ...a, hospital: rs(a.hospital), professional: rs(a.professional), bill: rs(a.bill) },
      { slot: "B", ...b, hospital: rs(b.hospital), professional: rs(b.professional), bill: rs(b.bill) },
      { slot: "C", ...c, hospital: rs(c.hospital), professional: rs(c.professional), bill: rs(c.bill) },
    ],
    scenarios,
  };
}

export const SHEET_COUNT = WIZARDS.length;

export function sheetByNo(no: number): Sheet {
  const wizard = WIZARDS.find((item) => item.no === no) ?? WIZARDS[0];
  return buildSheet(wizard);
}
