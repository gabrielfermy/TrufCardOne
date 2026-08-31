-- Create profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  email text unique,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for profiles
alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Create game_sessions table
create table public.game_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  player1_name text not null,
  player2_name text not null,
  player3_name text not null,
  player4_name text not null,
  settings jsonb not null default '{
    "multiplier": 1,
    "bid0Bonus": 0,
    "prevent13": false,
    "atasLackMult": -2,
    "atasExcessMult": -1,
    "bawahLackMult": -1,
    "bawahExcessMult": -2
  }'::jsonb,
  is_completed boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for game_sessions
alter table public.game_sessions enable row level security;
create policy "Users can manage their own game sessions" on public.game_sessions
  for all using (auth.uid() = user_id);

-- Create game_rounds table
create table public.game_rounds (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.game_sessions(id) on delete cascade not null,
  round_number integer not null,
  dealer_index integer not null check (dealer_index between 0 and 3),
  truf_suit_index integer not null check (truf_suit_index between 0 and 4), -- 0: Spade, 1: Heart, 2: Diamond, 3: Club, 4: No Truf
  play_mode text check (play_mode in ('atas', 'bawah')), -- Custom decision for bid 13
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (session_id, round_number)
);

-- RLS for game_rounds
alter table public.game_rounds enable row level security;
create policy "Users can manage rounds of their own sessions" on public.game_rounds
  for all using (
    exists (
      select 1 from public.game_sessions
      where game_sessions.id = game_rounds.session_id and game_sessions.user_id = auth.uid()
    )
  );

-- Create player_scores table
create table public.player_scores (
  id uuid default gen_random_uuid() primary key,
  round_id uuid references public.game_rounds(id) on delete cascade not null,
  player_index integer not null check (player_index between 0 and 3),
  bid integer not null check (bid between 0 and 13),
  won integer not null check (won between 0 and 13),
  score_change integer not null,
  score_cumulative integer not null,
  unique (round_id, player_index)
);

-- RLS for player_scores
alter table public.player_scores enable row level security;
create policy "Users can manage player scores of their own sessions" on public.player_scores
  for all using (
    exists (
      select 1 from public.game_rounds
      join public.game_sessions on game_sessions.id = game_rounds.session_id
      where game_rounds.id = player_scores.round_id and game_sessions.user_id = auth.uid()
    )
  );

-- Sync profiles function & trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
