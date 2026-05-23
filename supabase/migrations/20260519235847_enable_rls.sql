-- Enable RLS
alter table public.profiles enable row level security;
alter table public.technician_profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.bookings enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;

-- Profiles: users can read all profiles, only update their own
drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Technician profiles: readable by all, writable by owner
drop policy if exists "Technician profiles viewable by everyone" on public.technician_profiles;
create policy "Technician profiles viewable by everyone" on public.technician_profiles for select using (true);
drop policy if exists "Technicians can insert own profile" on public.technician_profiles;
create policy "Technicians can insert own profile" on public.technician_profiles for insert with check (auth.uid() = id);
drop policy if exists "Technicians can update own profile" on public.technician_profiles;
create policy "Technicians can update own profile" on public.technician_profiles for update using (auth.uid() = id);

-- Subscriptions: only the technician can view/manage
drop policy if exists "Technicians view own subscription" on public.subscriptions;
create policy "Technicians view own subscription" on public.subscriptions for select using (auth.uid() = technician_id);
drop policy if exists "Technicians insert own subscription" on public.subscriptions;
create policy "Technicians insert own subscription" on public.subscriptions for insert with check (auth.uid() = technician_id);
drop policy if exists "Technicians update own subscription" on public.subscriptions;
create policy "Technicians update own subscription" on public.subscriptions for update using (auth.uid() = technician_id);

-- Bookings: viewable by customer and technician involved
drop policy if exists "Bookings viewable by participants" on public.bookings;
create policy "Bookings viewable by participants" on public.bookings for select using (auth.uid() = customer_id or auth.uid() = technician_id);
drop policy if exists "Customers can create bookings" on public.bookings;
create policy "Customers can create bookings" on public.bookings for insert with check (auth.uid() = customer_id);
drop policy if exists "Participants can update bookings" on public.bookings;
create policy "Participants can update bookings" on public.bookings for update using (auth.uid() = customer_id or auth.uid() = technician_id);

-- Messages: viewable by participants in the booking
drop policy if exists "Messages viewable by booking participants" on public.messages;
create policy "Messages viewable by booking participants" on public.messages for select using (
  exists (select 1 from public.bookings where id = booking_id and (customer_id = auth.uid() or technician_id = auth.uid()))
);
drop policy if exists "Participants can send messages" on public.messages;
create policy "Participants can send messages" on public.messages for insert with check (auth.uid() = sender_id);

-- Reviews: public read, only customer can write
drop policy if exists "Reviews are public" on public.reviews;
create policy "Reviews are public" on public.reviews for select using (true);
drop policy if exists "Customers can write reviews" on public.reviews;
create policy "Customers can write reviews" on public.reviews for insert with check (auth.uid() = customer_id);