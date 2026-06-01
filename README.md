# FPGWC In-Kind Inventory System

A production web application for **Family Promise of Greater Washington County** to track in-kind donation inventory — from the moment a donation arrives to the moment it goes to a client in need.

---

## What This App Does

- **Check In donations** — record donors, item details, condition, fair market value (FMV), and photos in a 2-step mobile-friendly form
- **Check Out items** — assign items to clients with HMIS number, case manager, and program tracking
- **Inventory view** — searchable, filterable table of all items by location and category with stock levels
- **Item detail pages** — full history of all check-ins and check-outs, with a printable QR code label
- **QR code labels** — each item gets a unique QR code; scan it to jump straight to the item detail page
- **Reports (admin)** — inventory by location, quarterly FMV totals, items by client, items by donor, CSV exports
- **Admin panel** — invite staff via email, manage roles (Admin / Coordinator / Case Manager)
- **Bloomerang sync** — optionally pushes donation records to Bloomerang CRM when a donor has a Bloomerang contact ID

---

## Prerequisites

- **Node.js 18+** — [nodejs.org](https://nodejs.org)
- **Supabase account** — [supabase.com](https://supabase.com) (free tier works)
- **Vercel account** (for deployment) — [vercel.com](https://vercel.com)
- Optional: Bloomerang API key if you use Bloomerang CRM

---

## Local Setup

### 1. Clone or download this repository

```bash
git clone <your-repo-url>
cd fpgwc-inventory
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your **Project URL** and **anon key** (under Settings > API)
3. Note your **service_role key** (same page — keep this secret)

### 4. Run the database migration

1. In the Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Paste the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Click **Run**

This creates all tables, Row Level Security policies, and an auto-profile trigger.

### 5. Create the photo storage bucket

1. In the Supabase dashboard, go to **Storage**
2. Click **New Bucket**
3. Name it exactly: `item-photos`
4. Check **Public bucket** (so uploaded photos can be displayed without auth)
5. Click **Create**

### 6. Configure environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
BLOOMERANG_API_KEY=optional_leave_blank_if_not_using
```

### 7. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to the login page.

---

## First-Time User Setup

Because this app does not have a public sign-up page (intentional — staff only), you need to create the first admin user manually:

**Step 1:** In the Supabase dashboard, go to **Authentication > Users** and click **Add User**. Enter the admin's email and a temporary password.

**Step 2:** The trigger in the migration will auto-create a profile with role `case_manager`. To promote them to admin, run this in the SQL Editor:

```sql
update profiles
set role = 'admin'
where id = 'paste-the-user-uuid-here';
```

The UUID is visible in Authentication > Users.

**Step 3:** Sign in at the app with the credentials you just created.

**Step 4:** Use the **Admin panel** (top nav) to invite additional staff by email. They will receive a magic link to set their password.

---

## Deploying to Vercel

1. Push your code to GitHub (create a new private repo first)
2. Go to [vercel.com](https://vercel.com) and click **Add New Project**
3. Import your GitHub repo
4. Under **Environment Variables**, add all four variables from `.env.local`
5. Click **Deploy**

Vercel will build and deploy automatically. Future pushes to `main` trigger automatic redeployments.

---

## Feature Overview

### Roles

| Role | Can Do |
|------|--------|
| Admin | Everything: check in, check out, reports, admin panel, invite users |
| Coordinator | Check in donations, check out items, view inventory |
| Case Manager | Check out items to clients, view inventory |

### Check-In Flow

1. Search for an existing donor or add a new one (name, organization, email, phone)
2. Enter item details: category, description, storage location, condition, quantity
3. FMV is auto-estimated based on category and condition — can be overridden
4. Optionally attach a photo (camera or file upload)
5. On submit: inventory is updated, a QR code is generated, Bloomerang sync runs in background
6. A success screen shows the QR code with a Print Label button

### Check-Out Flow

1. Search for an inventory item by name, category, or paste its UUID (from a QR scan)
2. Fill in client info, HMIS number (optional), case manager, program, quantity, date
3. Submit: inventory count decremented, record saved

### QR Codes

Each inventory item has a unique UUID that doubles as its QR code content. Scanning the QR code gives you the item's UUID, which you can paste into the Check Out search bar to instantly find the item. The item detail page (`/inventory/[id]`) shows the QR code and a Print Label button.

### Reports (Admin Only)

- **Inventory**: real-time stock grouped by storage location, exportable to CSV
- **Quarterly Value**: total FMV of all donations per quarter, exportable to CSV; also exports full check-in log
- **By Client**: search any client by name or HMIS number to see all items they received
- **By Donor**: search any donor to see all donations and total FMV given

### Bloomerang Integration

If a donor has a `bloomerang_contact_id` in the database, each check-in will attempt to create a transaction record in Bloomerang using the API. Failures are silent (won't block the check-in). To link donors to Bloomerang, populate `bloomerang_contact_id` in the `donors` table with the numeric Bloomerang account ID.

---

## Tech Stack

- **Next.js 14** (App Router, Server Components, Server Actions)
- **TypeScript**
- **Tailwind CSS** (mobile-first)
- **Supabase** (PostgreSQL, Auth, Storage)
- **qrcode** npm package
- **html5-qrcode** (available for QR scanning integration)
- **react-hot-toast** for notifications
- **date-fns** for date formatting

---

## Project Structure

```
fpgwc-inventory/
├── app/
│   ├── actions/         # Server Actions (checkIn, checkOut, admin)
│   ├── admin/           # Admin panel
│   ├── check-in/        # Donation check-in form
│   ├── check-out/       # Item check-out form
│   ├── inventory/       # Inventory list + [id] detail page
│   ├── login/           # Auth page
│   ├── reports/         # Reports (admin only)
│   └── page.tsx         # Dashboard
├── components/          # Nav, Layout
├── lib/
│   ├── supabase/        # client.ts, server.ts, middleware.ts
│   ├── bloomerang.ts    # Bloomerang API helper
│   ├── constants.ts     # Categories, locations, programs
│   └── fmv.ts           # FMV estimation logic
├── supabase/
│   └── migrations/      # SQL schema
└── middleware.ts        # Auth guard
```
