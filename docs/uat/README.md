# UAT (User Acceptance Testing) – Customer Instructions

This folder contains the UAT test cases used to verify the application before sign-off. Please complete the tests in the provided spreadsheet and return it with your results.

## What is in scope

The test cases cover these areas (Channeling and Dashboard are **not** included):

- **Consultants**: Doctor, Doctor Session, Bulk Price Change, Speciality, Doctor Leave  
- **Organization**: Department, Zones, Rooms, Location  
- **People**: Patients, Staff, Users, User Groups  
- **Agency & billing**: Agency Books, Agency, Discount  
- **Other**: Tags, SMS Playground, Reports  

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
