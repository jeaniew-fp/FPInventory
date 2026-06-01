-- =====================================================================
-- FPGWC In-Kind Inventory System — Initial Schema
-- Run this in: Supabase Dashboard > SQL Editor > New Query
-- =====================================================================

-- User profiles (extends Supabase auth.users)
create table if not exists profiles (
  id uuid references auth.users primary key,
  full_name text not null,
  role text not null check (role in ('admin', 'coordinator', 'case_manager')),
  created_at timestamptz default now()
);

-- Donors
create table if not exists donors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  organization text,
  email text,
  phone text,
  bloomerang_contact_id text,
  created_at timestamptz default now()
);

-- Inventory items
create table if not exists inventory_items (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  description text not null,
  storage_location text not null,
  current_quantity integer not null default 0,
  qr_code text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Check-ins (donations received)
create table if not exists check_ins (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid references inventory_items not null,
  donor_id uuid references donors not null,
  quantity integer not null,
  condition text not null,
  fmv_per_unit numeric(10,2),
  total_fmv numeric(10,2),
  photo_url text,
  notes text,
  date_received date not null default current_date,
  created_by uuid references profiles not null,
  created_at timestamptz default now()
);

-- Check-outs (items given to clients)
create table if not exists check_outs (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid references inventory_items not null,
  client_first_name text not null,
  client_last_name text not null,
  hmis_number text,
  case_manager_id uuid references profiles not null,
  program text not null,
  quantity integer not null,
  date_given date not null default current_date,
  created_by uuid references profiles not null,
  created_at timestamptz default now()
);

-- =====================================================================
-- Row-Level Security
-- =====================================================================

alter table profiles enable row level security;
alter table donors enable row level security;
alter table inventory_items enable row level security;
alter table check_ins enable row level security;
alter table check_outs enable row level security;

-- Profiles
create policy "Authenticated users can read all profiles"
  on profiles for select
  using (auth.role() = 'authenticated');

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

-- Donors
create policy "Authenticated users can read donors"
  on donors for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can insert donors"
  on donors for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update donors"
  on donors for update
  using (auth.role() = 'authenticated');

-- Inventory items
create policy "Authenticated users can read inventory"
  on inventory_items for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can insert inventory"
  on inventory_items for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update inventory"
  on inventory_items for update
  using (auth.role() = 'authenticated');

-- Check-ins
create policy "Authenticated users can read check_ins"
  on check_ins for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can insert check_ins"
  on check_ins for insert
  with check (auth.role() = 'authenticated');

-- Check-outs
create policy "Authenticated users can read check_outs"
  on check_outs for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can insert check_outs"
  on check_outs for insert
  with check (auth.role() = 'authenticated');

-- =====================================================================
-- Trigger: auto-create profile on new user sign-up
-- (optional — admin can also create profiles manually)
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'case_manager')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
