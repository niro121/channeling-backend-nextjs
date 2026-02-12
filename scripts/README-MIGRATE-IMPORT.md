# Migrate import script

Imports data from the Sails **Migrate API** into this app’s MongoDB (Prisma).  
See the API guide: `node/ruhunu-backend-channeling-sails/migrate/MIGRATE_API_IMPORT_GUIDE.md`.

## Usage

```bash
npm run migrate:import
# or
npx tsx scripts/migrate-import.ts
```

### Flush (delete) and import

- **No flags** – The script **asks**: “Delete existing data in migrate-related tables and import as new? (yes/no)”. Answer **yes** to flush then import, **no** to exit.
- **`--flush`** – Flush the migrate-related tables **then** import (no prompt). Same as answering “yes”.
- **`--no-flush`** – **Do not** delete anything; import only (no prompt). Use when you want to add data without clearing first (may hit unique constraint errors if data already exists).

```bash
npm run migrate:import -- --flush
npm run migrate:import -- --no-flush
```

### Import one step at a time (for testing)

Use **`--only=...`** to run specific steps and exit. Steps run in dependency order; if a step needs data from a previous step (e.g. doctors need specialities), the script builds the mapping from the **existing DB** (e.g. speciality by `code`) when that step wasn’t run in this run.

Steps (comma-separated):  
`specialities`, `doctors`, `departments`, `locations`, `zones`, `rooms`, `tags`, `discounts`, `agencies`.

Examples:

```bash
# Flush, then import only specialities and exit (so you can check the table)
npm run migrate:import -- --flush --only=specialities

# Then import only doctors (links to existing specialities by code)
npm run migrate:import -- --only=doctors

# Flush and import only specialities + doctors
npm run migrate:import -- --flush --only=specialities,doctors
```

## Env

The script loads `.env` from the project root (via `dotenv`). Add to `.env` (or set in the shell):

- **`MIGRATE_BASE_URL`** – Base URL of the Sails app (e.g. `http://localhost:1337`). Default: `http://localhost:1337`.
- **`MIGRATE_USER_KEY`** – API key for the Migrate API (same as `user_key` / `API_KEY` in the Sails app). **Required.**

Prisma uses **`MONGODB_URI`** from `.env` as usual.

## Import order and linking

The script imports in dependency order and keeps id maps so relations are correct:

1. **Specialities** → map source id → new ObjectId  
2. **Doctors** → `specialityId` from map  
3. **Departments**  
4. **Locations** → map source id → new ObjectId  
5. **Zones** → one “Default” zone per location (Migrate API has no zones endpoint)  
6. **Rooms** → `locationId` and `zoneId` from maps (room’s source `location`/`zone` → location map + default zone)  
7. **Tags**  
8. **Discounts** → `discount_method` / `payment_type` mapped to Prisma enums  
9. **Agencies** → then `parentAgencyId` set from source id map  

## Tables affected by “delete”

If you answer **yes** to the prompt, the script deletes (in this order):

`Session`, `DoctorSession`, `AgencyBook`, `Log`, `Agency`, `VoucherCode`, `Discount`, `Room`, `Zone`, `Location`, `Doctor`, `Department`, `Speciality`, `Tag`.

Other tables (e.g. `User`, `Patient`, `Shift`) are **not** touched.
