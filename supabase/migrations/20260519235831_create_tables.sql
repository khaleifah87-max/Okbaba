-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  phone text unique,
  user_type text not null check (user_type in ('customer', 'technician')),
  location text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Technician profiles
create table if not exists public.technician_profiles (
  id uuid references public.profiles(id) on delete cascade primary key,
  profession text not null,
  emirates_id_url text,
  certifications_url text,
  bio text,
  hourly_rate numeric(10,2),
  rating numeric(3,2) default 0,
  total_reviews integer default 0,
  is_verified boolean default false,
  is_available boolean default true,
  latitude numeric(10,6),
  longitude numeric(10,6),
  created_at timestamptz default now()
);

-- Subscriptions
create table if not exists public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  technician_id uuid references public.profiles(id) on delete cascade not null,
  plan text not null check (plan in ('trial', 'basic', 'pro', 'premium')),
  status text not null check (status in ('active', 'expired', 'cancelled')) default 'active',
  trial_ends_at timestamptz default (now() + interval '45 days'),
  current_period_start timestamptz default now(),
  current_period_end timestamptz,
  amount numeric(10,2),
  created_at timestamptz default now()
);

-- Bookings
create table if not exists public.bookings (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid references public.profiles(id) on delete cascade not null,
  technician_id uuid references public.profiles(id) on delete cascade not null,
  service text not null,
  status text not null check (status in ('pending', 'accepted', 'in_progress', 'completed', 'cancelled')) default 'pending',
  scheduled_at timestamptz,
  address text,
  notes text,
  amount numeric(10,2),
  created_at timestamptz default now()
);

-- Messages
create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid references public.bookings(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  read boolean default false,
  created_at timestamptz default now()
);

-- Reviews
create table if not exists public.reviews (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid references public.bookings(id) on delete cascade not null,
  customer_id uuid references public.profiles(id) on delete cascade not null,
  technician_id uuid references public.profiles(id) on delete cascade not null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now()
);