import { WIZARDS, type Wizard } from "./wizards.generated";

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

export type TotalRow = {
  section: string;
  cash: string;
  card: string;
  slip: string;
  cheque: string;
  agent: string;
  credit: string;
  ewallet: string;
};

export type Sheet = {
  no: number;
  note: string;
  doctors: { slot: string; doctor: string; code: string; time: string; hospital: string; professional: string; bill: string }[];
  scenarios: Scenario[];
  totals: TotalRow[];
  grandRupees: string;
  agentLeftOut: string;
  whtOffNote: string;
};

function rs(n: number): string {
  const abs = Math.abs(Math.round(n)).toLocaleString("en-US");
  return n < 0 ? `−${abs}` : abs;
}

function cell(n: number): string {
  return n === 0 ? "" : rs(n);
}

function whtOf(professional: number): number {
  return Math.round((professional * 5) / 100);
}

const GIVEN: { title: string; name: string }[] = [
  { title: "Mr.", name: "Nirosha" },
  { title: "Mrs.", name: "Nadeesha" },
  { title: "Mr.", name: "Kasun" },
  { title: "Miss", name: "Sanduni" },
  { title: "Mr.", name: "Nuwan" },
  { title: "Mrs.", name: "Ishara" },
  { title: "Mr.", name: "Chamara" },
  { title: "Miss", name: "Dilini" },
  { title: "Mr.", name: "Dinesh" },
  { title: "Mrs.", name: "Hansika" },
  { title: "Mr.", name: "Pradeep" },
  { title: "Miss", name: "Tharushi" },
  { title: "Mr.", name: "Asela" },
  { title: "Mrs.", name: "Madhavi" },
  { title: "Mr.", name: "Tharindu" },
  { title: "Miss", name: "Sewwandi" },
  { title: "Mr.", name: "Lahiru" },
  { title: "Mrs.", name: "Chathurika" },
  { title: "Mr.", name: "Madushan" },
  { title: "Miss", name: "Anjali" },
  { title: "Mr.", name: "Sachith" },
  { title: "Mrs.", name: "Pavithra" },
  { title: "Mr.", name: "Isuru" },
  { title: "Miss", name: "Nishadi" },
  { title: "Mr.", name: "Gayan" },
  { title: "Mrs.", name: "Upeksha" },
  { title: "Mr.", name: "Roshan" },
  { title: "Miss", name: "Gayani" },
  { title: "Mr.", name: "Sampath" },
  { title: "Mrs.", name: "Rashmi" },
  { title: "Mr.", name: "Janaka" },
  { title: "Miss", name: "Samadhi" },
  { title: "Mr.", name: "Mahesh" },
  { title: "Mrs.", name: "Hiruni" },
  { title: "Mr.", name: "Buddhika" },
  { title: "Miss", name: "Thisara" },
  { title: "Mr.", name: "Chathura" },
  { title: "Mrs.", name: "Kaushalya" },
  { title: "Mr.", name: "Dilshan" },
  { title: "Miss", name: "Achini" },
];

const SURNAMES = [
  "Kodituwakku",
  "Jayawardena",
  "Perera",
  "Fernando",
  "Silva",
  "Gunasekara",
  "Wickramasinghe",
  "Rajapaksa",
  "Bandara",
  "Dissanayake",
  "Herath",
  "Amarasinghe",
  "Senanayake",
  "Weerasinghe",
  "Pathirana",
  "Abeysekara",
  "Rathnayake",
  "Liyanage",
  "Madushanka",
  "Karunaratne",
  "Ekanayake",
  "Wijesinghe",
  "Alwis",
];

export function patientName(sheetNo: number, slot: number, offset = 0): string {
  const i = (sheetNo - 1) * 13 + slot + offset;
  const given = GIVEN[i % GIVEN.length];
  const surname = SURNAMES[(i * 7) % SURNAMES.length];
  return `${given.title} ${given.name} ${surname}`;
}

export function buildSheet(wizard: Wizard): Sheet {
  const [a, b, c] = wizard.sessions;
  const phone = `077${String((7123456 + wizard.no * 140173) % 10000000).padStart(7, "0")}`;
  const p = (slot: number) => patientName(wizard.no, slot);
  const netA = a.professional - whtOf(a.professional);
  const netB = b.professional - whtOf(b.professional);
  const income = 100 + wizard.no;

  const channelCash = a.bill + a.hospital + a.bill + c.bill + b.bill;
  const channelCard = b.bill + a.professional;
  const refundCash = -a.hospital;
  const cancelCash = -c.bill;
  const agentCash = c.bill;
  const agentCol = b.professional;
  const depositCash = 2000;
  const depositCanceled = -500;
  const doctorCash = -netA;
  const otherCash = income - 50 + 500 - 1000;

  const cash =
    channelCash + refundCash + cancelCash + agentCash + depositCash + depositCanceled + doctorCash + otherCash;
  const card = channelCard;
  const slip = a.bill;
  const cheque = b.bill;
  const credit = c.bill;
  const ewallet = c.bill;
  const grand = cash + card + slip + cheque + credit + ewallet;
  const whtOffCash = cash - whtOf(a.professional);
  const floatTotal = 1000 + wizard.no * 100;
  const tillCash = cash + floatTotal;

  const session = (doctor: string, code: string, time: string) => `${doctor} (${code}), ${time}`;

  const scenarios: Scenario[] = [
    {
      id: "float",
      title: "How to request a float",
      learn: "Do this first. The bulk cashier must approve it. Then you enter the 4-digit code to receive the cash. You cannot end the shift while a float is still waiting.",
      steps: [
        {
          id: "fl-0",
          do: "Open one shift at Ruhunu Hospital. Use the doctors on this sheet. Do not change the fees.",
          amount: "—",
          report: "—",
        },
        {
          id: "fl-1",
          do: "On the shift bar, press Request float.",
          amount: "—",
          report: "—",
        },
        {
          id: "fl-2",
          do: `Select the bulk cashier. Enter 1 × 1,000 and ${wizard.no} × 100. Press Submit request.`,
          amount: rs(floatTotal),
          report: "Float request",
        },
        {
          id: "fl-3",
          do: "Stop. Wait until the bulk cashier approves and gives you the slip. Do not end the shift.",
          amount: "—",
          report: "Waiting",
        },
        {
          id: "fl-4",
          do: "When Receive float appears, enter the 4-digit code from the slip.",
          amount: rs(floatTotal),
          report: "Float received",
        },
      ],
    },
    {
      id: "channel",
      title: "How to channel",
      learn: "Book the patient and take the money. It shows under Channel Billed.",
      steps: [
        {
          id: "ch-2",
          do: `Book ${session(a.doctor, a.code, a.time)}. Patient ${p(0)}. Pay cash.`,
          amount: `${rs(a.bill)} cash`,
          report: "Channel Billed → Cash",
        },
      ],
    },
    {
      id: "pay",
      title: "How to take other payments",
      learn: "Same channel. Each way of paying has its own column. If a card bill shows Rs 90 commission, discount that 90 off.",
      steps: [
        {
          id: "pay-1",
          do: `Book ${session(b.doctor, b.code, b.time)}. Patient ${p(1)}. Pay by card.`,
          amount: `${rs(b.bill)} card`,
          report: "Channel Billed → Card",
        },
        {
          id: "pay-2",
          do: `Book ${session(a.doctor, a.code, a.time)}. Patient ${p(2)}. Pay by bank slip.`,
          amount: `${rs(a.bill)} slip`,
          report: "Channel Billed → Slip",
        },
        {
          id: "pay-3",
          do: `Book ${session(b.doctor, b.code, b.time)}. Patient ${p(3)}. Pay by cheque.`,
          amount: `${rs(b.bill)} cheque`,
          report: "Channel Billed → Cheque",
        },
        {
          id: "pay-4",
          do: `Book ${session(c.doctor, c.code, c.time)}. Patient ${p(4)}. Pay by e-wallet.`,
          amount: `${rs(c.bill)} e-wallet`,
          report: "Channel Billed → E-wallet",
        },
        {
          id: "pay-5",
          do: `Book ${session(c.doctor, c.code, c.time)}. Patient ${p(5)}. Credit customer Archmage Solutions (ARCH).`,
          amount: `${rs(c.bill)} credit`,
          report: "Channel Billed → Credit",
        },
        {
          id: "pay-6",
          do: `Book ${session(a.doctor, a.code, a.time)}. Patient ${p(6)}. Pay ${rs(a.hospital)} cash and ${rs(a.professional)} by card.`,
          amount: `${rs(a.bill)} split`,
          report: "Channel Billed → Cash + Card",
        },
      ],
    },
    {
      id: "refund",
      title: "How to refund — wait for approval",
      learn: "Tick one fee only, hospital or doctor, never both. Press Request refund, then wait. A manager must approve before any money goes out. You cannot end the shift while it is waiting. Only you can finish it.",
      steps: [
        {
          id: "rf-1",
          do: `Book ${session(a.doctor, a.code, a.time)}. Patient ${p(7)}. Pay cash.`,
          amount: `${rs(a.bill)} cash`,
          report: "Channel Billed → Cash",
        },
        {
          id: "rf-2",
          do: `Open ${p(7)}. Refund. Tick Hospital Fee only. Remarks: Refund hospital fee. Refund as CASH. Press Request refund.`,
          amount: rs(a.hospital),
          report: "Waiting",
        },
        {
          id: "rf-3",
          do: "Stop. Wait until a manager approves. Do not end the shift.",
          amount: "—",
          report: "—",
        },
        {
          id: "rf-4",
          do: `When it says Approved, press Refund and give back the hospital fee in cash.`,
          amount: `${rs(-a.hospital)} cash`,
          report: "Channel Refund",
        },
      ],
    },
    {
      id: "cancel",
      title: "How to cancel the whole bill — wait for approval",
      learn: "Cancel returns both fees and cancels the booking. Same wait: request, then a manager, then you complete it.",
      steps: [
        {
          id: "cx-1",
          do: `Book ${session(c.doctor, c.code, c.time)}. Patient ${p(8)}. Pay cash.`,
          amount: `${rs(c.bill)} cash`,
          report: "Channel Billed → Cash",
        },
        {
          id: "cx-2",
          do: `Open ${p(8)}. Cancel. Remarks: Cancel the booking. Refund as CASH. Press Request cancellation.`,
          amount: rs(c.bill),
          report: "Waiting",
        },
        {
          id: "cx-3",
          do: "Stop. Wait until a manager approves. Do not end the shift.",
          amount: "—",
          report: "—",
        },
        {
          id: "cx-4",
          do: "When it says Approved, press Cancel Booking and give the full bill back in cash.",
          amount: `${rs(-c.bill)} cash`,
          report: "Channel Cancel",
        },
      ],
    },
    {
      id: "agent",
      title: "How to book for an agency",
      learn: "Money left on the agent account sits in the Agent column. That column is not inside the grand total. Cash taken from the agency is in the grand total.",
      steps: [
        {
          id: "ag-1",
          do: `Book ${session(b.doctor, b.code, b.time)}. Agency ${wizard.agency} (${wizard.agencyCode}). Patient ${p(9)}. On the agent account. Take no cash.`,
          amount: `${rs(b.bill)} agent`,
          report: "Agent Billed → Agent",
        },
        {
          id: "ag-2",
          do: `Open ${p(9)}. Refund. Tick Hospital Fee only. Refund to Agent. Remarks: Refund hospital fee. Press Request refund. Wait for approval, then complete it.`,
          amount: `${rs(-b.hospital)} agent`,
          report: "Agent Refunded",
        },
        {
          id: "ag-3",
          do: `Book ${session(c.doctor, c.code, c.time)}. Same agency. Patient ${p(10)}. Take the bill in cash.`,
          amount: `${rs(c.bill)} cash`,
          report: "Agent Billed → Cash",
        },
        {
          id: "ag-4",
          do: `Book ${session(c.doctor, c.code, c.time)}. Same agency. Patient ${p(11)}. On the agent account. Take no cash.`,
          amount: `${rs(c.bill)} agent`,
          report: "Agent Billed → Agent",
        },
        {
          id: "ag-5",
          do: `Open ${p(11)}. Cancel the whole bill back to the agent. Remarks: Cancel the booking. Wait for approval, then complete it.`,
          amount: `${rs(-c.bill)} agent`,
          report: "Agent Canceled",
        },
      ],
    },
    {
      id: "deposit",
      title: "How to take and return agency money",
      learn: "A deposit brings cash in. Canceling that deposit reverses it. A withdraw pays cash out. Do not cancel the 2,000 deposit.",
      steps: [
        {
          id: "dp-1",
          do: `Take a cash deposit from ${wizard.agency}.`,
          amount: "+2,000 cash",
          report: "Agent Deposit",
        },
        {
          id: "dp-2",
          do: "Take another 500 cash deposit from the same agency, then cancel that deposit.",
          amount: "+500 then −500",
          report: "Deposit, then Deposit Canceled",
        },
        {
          id: "dp-3",
          do: `Withdraw 500 cash for ${wizard.agency}.`,
          amount: "−500 cash",
          report: "Agent Deposit",
        },
      ],
    },
    {
      id: "doctor",
      title: "How to pay a doctor",
      learn: "Tick withholding tax 5%. The till pays the net, not the full doctor fee. Pay cash. Do this only after the refund and the cancel are finished.",
      steps: [
        {
          id: "dr-1",
          do: `Pay ${a.doctor}. Select only patient ${p(0)}. Tick WHT. WHT is ${rs(whtOf(a.professional))}. Pay cash.`,
          amount: `${rs(-netA)} cash`,
          report: "Doctor Payment",
        },
        {
          id: "dr-2",
          do: `Pay ${b.doctor}. Select only patient ${p(1)}. Tick WHT. Net is ${rs(netB)}. Then cancel that payment.`,
          amount: "net 0",
          report: "Doctor Payment, then cancel",
        },
      ],
    },
    {
      id: "special",
      title: "Special things",
      learn: "On-call is not paid until you settle it at the counter. Change is only the patient details. Put the bank deposit after the doctor payment, before the handover.",
      steps: [
        {
          id: "sp-1",
          do: `Book ${session(b.doctor, b.code, b.time)}. Patient ${p(12)}. Book as On-Call. Do not take money yet.`,
          amount: "—",
          report: "—",
        },
        {
          id: "sp-2",
          do: `Open ${p(12)} and settle it. Pay cash at the counter.`,
          amount: `${rs(b.bill)} cash`,
          report: "Channel Billed → Cash",
        },
        {
          id: "sp-3",
          do: `Open ${p(0)}. Change. Set the phone to ${phone}. Save.`,
          amount: "—",
          report: "—",
        },
        {
          id: "sp-4",
          do: "Enter branch income in cash. Remark: medical report fee.",
          amount: `+${rs(income)} cash`,
          report: "Income",
        },
        {
          id: "sp-5",
          do: "Enter a hospital expense.",
          amount: "−50 cash",
          report: "Expense",
        },
        {
          id: "sp-6",
          do: "Enter a bank withdraw. Cash comes into the till.",
          amount: "+500 cash",
          report: "Bank Withdraw",
        },
        {
          id: "sp-7",
          do: "Enter a bank deposit. Do this after the doctor payment.",
          amount: "−1,000 cash",
          report: "Bank Deposit",
        },
        {
          id: "sp-8",
          do: `Open Userwise Cashier Detail - Channel for this shift. Grand total ${rs(grand)}. Agent ${rs(agentCol)} is not inside that total.`,
          amount: rs(grand),
          report: "Grand total",
        },
      ],
    },
    {
      id: "handover",
      title: "How to hand over for approval",
      learn: "Do this last. Finish every refund and cancel first, and receive the float. An open refund or an open float blocks the handover. After you confirm, print the user-wise cashier detail and attach it.",
      steps: [
        {
          id: "ho-1",
          do: "Press End shift.",
          amount: "—",
          report: "—",
        },
        {
          id: "ho-2",
          do: `Count the cash. Enter notes for ${rs(tillCash)}. That is report cash ${rs(cash)} plus the float ${rs(floatTotal)}.`,
          amount: `${rs(tillCash)} cash`,
          report: "Handover",
        },
        {
          id: "ho-3",
          do: `Enter the other amounts to match the report: card ${rs(card)}, slip ${rs(slip)}, cheque ${rs(cheque)}, credit ${rs(credit)}, e-wallet ${rs(ewallet)}.`,
          amount: "—",
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
          do: "Print Userwise Cashier Detail - Channel for this cashier and this shift. Attach the printout to the handover.",
          amount: rs(grand),
          report: "Attach to handover",
        },
      ],
    },
  ];

  const totals: TotalRow[] = [
    {
      section: "Channel Billed",
      cash: cell(channelCash),
      card: cell(channelCard),
      slip: cell(slip),
      cheque: cell(cheque),
      agent: "",
      credit: cell(credit),
      ewallet: cell(ewallet),
    },
    { section: "Channel Refund", cash: cell(refundCash), card: "", slip: "", cheque: "", agent: "", credit: "", ewallet: "" },
    { section: "Channel Cancel", cash: cell(cancelCash), card: "", slip: "", cheque: "", agent: "", credit: "", ewallet: "" },
    { section: "Agent Billed", cash: cell(agentCash), card: "", slip: "", cheque: "", agent: cell(b.bill + c.bill), credit: "", ewallet: "" },
    { section: "Agent Refunded", cash: "", card: "", slip: "", cheque: "", agent: cell(-b.hospital), credit: "", ewallet: "" },
    { section: "Agent Canceled", cash: "", card: "", slip: "", cheque: "", agent: cell(-c.bill), credit: "", ewallet: "" },
    { section: "Agent Deposit", cash: cell(2000 + 500 - 500), card: "", slip: "", cheque: "", agent: "", credit: "", ewallet: "" },
    { section: "Deposit Canceled", cash: cell(depositCanceled), card: "", slip: "", cheque: "", agent: "", credit: "", ewallet: "" },
    { section: "Doctor Payment", cash: cell(doctorCash), card: "", slip: "", cheque: "", agent: "", credit: "", ewallet: "" },
    { section: "Income / Expense / Bank", cash: cell(otherCash), card: "", slip: "", cheque: "", agent: "", credit: "", ewallet: "" },
    {
      section: "Grand total",
      cash: cell(cash),
      card: cell(card),
      slip: cell(slip),
      cheque: cell(cheque),
      agent: cell(agentCol),
      credit: cell(credit),
      ewallet: cell(ewallet),
    },
  ];

  return {
    no: wizard.no,
    note: `Thursday 8 October 2026. Agency: ${wizard.agency} (${wizard.agencyCode}). Credit customer: Archmage Solutions (ARCH). Amounts are doctor fee + hospital fee.`,
    doctors: [
      { slot: "A", ...a, hospital: rs(a.hospital), professional: rs(a.professional), bill: rs(a.bill) },
      { slot: "B", ...b, hospital: rs(b.hospital), professional: rs(b.professional), bill: rs(b.bill) },
      { slot: "C", ...c, hospital: rs(c.hospital), professional: rs(c.professional), bill: rs(c.bill) },
    ],
    scenarios,
    totals,
    grandRupees: rs(grand),
    agentLeftOut: rs(agentCol),
    whtOffNote: `If withholding tax is off, doctor cash is ${rs(-a.professional)}, grand cash becomes ${rs(whtOffCash)}, and grand rupees become ${rs(grand - whtOf(a.professional))}.`,
  };
}

export const SHEET_COUNT = WIZARDS.length;

export const DECLARATION = [
  "I know how to add a channel.",
  "I know how to take a card, slip, cheque, e-wallet, credit customer, and a split payment.",
  "I know how to refund a channel and wait for approval.",
  "I know how to cancel a channel and wait for approval.",
  "I know how to book for an agency.",
  "I know how to take an agency deposit, cancel a deposit, and withdraw.",
  "I know how to pay a doctor.",
  "I know how to request a float and receive it.",
  "I know how to settle an on-call booking.",
  "I know how to change a patient's details.",
  "I know how to enter income, an expense, and a bank deposit.",
  "I know how to hand over the shift.",
];

export function sheetByNo(no: number): Sheet {
  const wizard = WIZARDS.find((item) => item.no === no) ?? WIZARDS[0];
  return buildSheet(wizard);
}
