# UAT (User Acceptance Testing) – Customer Instructions

This folder contains the UAT test cases used to verify the application before sign-off. Please complete the tests in the provided spreadsheet and return it with your results.

## Channeling (simple sign-off)

For the channel booking desk, use **`channeling-uat.xlsx`**. It is a short walkthrough of the desk (shift, booking, settlement, refund, cancel, search, transfer, doctor arrival, float, handover, reconciliation, and doctor payment), then every print (receipts, float slip, handover, reconciliation, session lists) and every report. Fill the yellow cells and return the file. The Sign-off sheet totals the results.

The CSV and markdown files below are the longer case list, including master data and edge cases.

## Withholding tax and DPAY

Two more sign-off workbooks sit in this folder. Fill the yellow cells and return the file. Each Sign-off sheet totals the results.

- **`wht-test-cases.xlsx`** — doctor withholding tax on channeling. The percentage on the doctor, different splits, the two receipts and their numbers, the hidden session, cancel, then doctor balance and the doctor payment reports (Consultant Payments, Withholding Tax, and the cashier summary). A split is two receipts, but the doctor balance moves by the full fee. The tax is reported on its own. The How to use sheet has a small calculator: type the bookings, the doctor percentage, the tax rate on screen, and the two fees, and it shows the tax, the cash, and the balance change.
- **`dpay-test-cases.xlsx`** — DPAY bills, patient receipts, doctor payments, lists, receipt manager, DPAY doctor balance, the DPAY statement, and the doctor payment and doctor due reports. Includes a paused or ended shift, two doctors on one bill, paying the doctor before the patient pays, adding or removing a charge after a payment, and refund methods. A DPAY payment is one receipt and does not withhold tax. It does not change the channeling doctor balance.

## What is in scope

The test cases cover these areas (Channeling and Dashboard are **not** included):

- **Consultants**: Doctor, Doctor Session, Bulk Price Change, Speciality, Doctor Leave  
- **Organization**: Department, Zones, Rooms, Location  
- **People**: Patients, Staff, Users, User Groups  
- **Agency & billing**: Agency Books, Agency, Discount  
- **Other**: Tags, SMS Playground, Reports  

For **Channeling** (shift, float, handover, reconciliation), see the spreadsheet **and** the detailed markdown guides:

- **Float Request**: `float-request-test-cases.md`  
- **Shift Handover & Reconciliation**: `handover-and-reconciliation-test-cases.md` (includes End shift, Handed over to me, Send to reconciliation, Reconciliation list/document, Submit as reconciled, Reject)  

## How to use the spreadsheet

1. **Open in Excel**  
   - Open `uat-test-cases.csv` in Microsoft Excel (File > Open, or double-click and choose Excel).  
   - If you use another tool (e.g. Google Sheets), use File > Import and choose the CSV; ensure columns align as: Module, Feature, Test Case ID, Test Case Description, Steps, Expected Result, Pass/Fail, Notes.

2. **Run each test**  
   - Follow the **Steps** for each row.  
   - Check that the **Expected Result** is met.

3. **Fill your results**  
   - In the **Pass/Fail** column, enter **Pass** or **Fail** for each test case.  
   - In the **Notes** column, add any comments (e.g. what went wrong, what you saw, environment details).

4. **Return the file**  
   - Save the spreadsheet and send it back to us (e.g. by email or your agreed channel).  
   - You can return the same CSV or an Excel version (e.g. `.xlsx`) if you prefer.

## Environment

- Use the UAT URL and login details provided to you separately.  
- If you need test data (e.g. sample locations or doctors) to run a test, note that in **Notes** or ask your contact.

## Questions

If anything is unclear or a step cannot be completed (e.g. missing permission or data), note it in **Notes** and mark **Pass/Fail** as appropriate so we can follow up.
