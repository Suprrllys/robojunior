-- RoboJunior — схема базы данных Supabase
-- Выполни этот SQL в Supabase Dashboard → SQL Editor

-- ==============================
-- Профили пользователей
-- ==============================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  username text not null unique,
  country text not null default 'OTHER',
  age integer not null default 15,
  avatar_color text not null default '#1E90FF',
  avatar_accessory text not null default 'none',
  avatar_role_drone text not null default 'default',
  avatar_role_robot text not null default 'default',
  avatar_role_entrepreneur text not null default 'default',
  xp integer not null default 0,
  game_currency integer not null default 100,
  is_verified boolean not null default false,
  parent_id uuid references public.profiles(id) on delete set null,
  gender_filter text not null default 'all' check (gender_filter in ('all', 'same')),
  only_verified_partners boolean not null default false,
  preferred_language text not null default 'en' check (preferred_language in ('en', 'ru', 'ar')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone" on public.profiles
  for select using (true);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Автоматически создаём профиль при регистрации
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, username, preferred_language, country)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'preferred_language', 'en'),
    coalesce(new.raw_user_meta_data->>'country', 'OTHER')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==============================
-- Прогресс по миссиям
-- ==============================
create table public.mission_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text not null check (role in ('drone_programmer', 'robot_constructor', 'entrepreneur')),
  mission_number integer not null,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'completed')),
  score integer not null default 0,
  hints_used integer not null default 0,
  metrics jsonb not null default '{}',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, role, mission_number)
);

alter table public.mission_progress enable row level security;

create policy "Mission progress viewable by authenticated users" on public.mission_progress
  for select using (auth.uid() is not null);

create policy "Users can insert own mission progress" on public.mission_progress
  for insert with check (auth.uid() = user_id);

create policy "Users can update own mission progress" on public.mission_progress
  for update using (auth.uid() = user_id);

-- ==============================
-- Очки компетенций
-- ==============================
create table public.competency_scores (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  technical_precision integer not null default 0,
  analytical_thinking integer not null default 0,
  creativity integer not null default 0,
  teamwork integer not null default 0,
  management integer not null default 0,
  learning_speed integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.competency_scores enable row level security;

create policy "Users can view own competency scores" on public.competency_scores
  for select using (auth.uid() = user_id);

create policy "Users can upsert own competency scores" on public.competency_scores
  for all using (auth.uid() = user_id);

-- ==============================
-- Бейджи
-- ==============================
create table public.badges (
  id uuid default gen_random_uuid() primary key,
  key text not null unique,
  name_en text not null,
  name_ru text not null,
  name_ar text not null,
  description_en text not null,
  description_ru text not null,
  description_ar text not null,
  icon text not null default '🏆',
  xp_reward integer not null default 50
);

insert into public.badges (key, name_en, name_ru, name_ar, description_en, description_ru, description_ar, icon, xp_reward) values
  ('first_mission', 'First Steps', 'Первые шаги', 'الخطوات الأولى', 'Complete your first mission', 'Завершил первую миссию', 'أكمل أول مهمة لك', '🚀', 100),
  ('drone_master', 'Drone Master', 'Мастер дронов', 'سيد الطائرات', 'Complete all drone missions', 'Прошёл все миссии программиста дронов', 'أكمل جميع مهام الطائرة', '🛸', 300),
  ('robot_builder', 'Robot Builder', 'Строитель роботов', 'بناء الروبوتات', 'Complete all robot missions', 'Прошёл все миссии конструктора роботов', 'أكمل جميع مهام الروبوت', '🤖', 300),
  ('entrepreneur', 'Tech Entrepreneur', 'Технопредприниматель', 'رائد الأعمال التقني', 'Complete all entrepreneur missions', 'Прошёл все миссии предпринимателя', 'أكمل جميع مهام ريادة الأعمال', '💡', 300),
  ('team_player', 'Team Player', 'Командный игрок', 'لاعب الفريق', 'Complete first coop mission', 'Завершил первую кооп-миссию', 'أكمل أول مهمة تعاونية', '🤝', 200),
  ('all_roles', 'Renaissance Engineer', 'Инженер эпохи Возрождения', 'المهندس المتعدد', 'Try all 3 roles', 'Попробовал все 3 роли', 'جرب جميع الأدوار الثلاثة', '⭐', 500),
  ('brics_cooperator', 'BRICS+ Cooperator', 'Кооператор БРИКС+', 'متعاون بريكس+', 'Complete coop with player from another country', 'Завершил кооп с игроком из другой страны', 'أكمل مهمة تعاونية مع لاعب من بلد آخر', '🌍', 400);

alter table public.badges enable row level security;
create policy "Badges viewable by everyone" on public.badges for select using (true);

-- ==============================
-- Бейджи пользователей
-- ==============================
create table public.user_badges (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  badge_id uuid references public.badges(id) on delete cascade not null,
  earned_at timestamptz not null default now(),
  unique(user_id, badge_id)
);

alter table public.user_badges enable row level security;

create policy "Users can view own badges" on public.user_badges
  for select using (auth.uid() = user_id);

create policy "Users can earn badges" on public.user_badges
  for insert with check (auth.uid() = user_id);

-- ==============================
-- Кооп-сессии (таблица без политик, которые ссылаются на participants)
-- ==============================
create table public.coop_sessions (
  id uuid default gen_random_uuid() primary key,
  mission_template text not null,
  status text not null default 'waiting' check (status in ('waiting', 'active', 'completed', 'abandoned')),
  created_by uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.coop_sessions enable row level security;

-- ==============================
-- Участники кооп-сессий
-- ==============================
create table public.coop_participants (
  id uuid default gen_random_uuid() primary key,
  coop_session_id uuid references public.coop_sessions(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text not null check (role in ('drone_programmer', 'robot_constructor', 'entrepreneur')),
  progress jsonb not null default '{}',
  is_completed boolean not null default false,
  score integer default null,
  last_active_at timestamptz not null default now(),
  unique(coop_session_id, user_id)
);

alter table public.coop_participants enable row level security;

-- ==============================
-- Helper function to check participation (SECURITY DEFINER bypasses RLS, prevents recursion)
-- ==============================
create or replace function public.is_coop_participant(session_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from coop_participants
    where coop_session_id = session_id and user_id = auth.uid()
  );
$$;

-- ==============================
-- Политики для coop_sessions (добавляем ПОСЛЕ создания coop_participants)
-- ==============================
create policy "Coop sessions viewable" on public.coop_sessions
  for select using (
    auth.uid() = created_by
    or status = 'waiting'
    or public.is_coop_participant(id)
  );

create policy "Users can create coop sessions" on public.coop_sessions
  for insert with check (auth.uid() = created_by);

create policy "Participants can update session" on public.coop_sessions
  for update using (
    auth.uid() = created_by
    or public.is_coop_participant(id)
  );

-- ==============================
-- Политики для coop_participants
-- ==============================
create policy "Participants viewable by session members" on public.coop_participants
  for select using (
    user_id = auth.uid()
    or public.is_coop_participant(coop_session_id)
    or exists (
      select 1 from public.coop_sessions cs
      where cs.id = coop_session_id and cs.status = 'waiting'
    )
  );

create policy "Users can join sessions" on public.coop_participants
  for insert with check (auth.uid() = user_id);

create policy "Users can update own participation" on public.coop_participants
  for update using (auth.uid() = user_id);

-- ==============================
-- Чат кооп-сессий
-- ==============================
create table public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  coop_session_id uuid references public.coop_sessions(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  is_preset boolean not null default false,
  preset_key text,
  created_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;

create policy "Chat messages viewable by session participants" on public.chat_messages
  for select using (
    exists (
      select 1 from public.coop_participants
      where coop_session_id = chat_messages.coop_session_id and user_id = auth.uid()
    )
  );

create policy "Participants can send messages" on public.chat_messages
  for insert with check (
    auth.uid() = user_id and
    exists (
      select 1 from public.coop_participants
      where coop_session_id = chat_messages.coop_session_id and user_id = auth.uid()
    )
  );

-- ==============================
-- Отслеживание завершённых кооп-миссий (для ачивок и статистики)
-- ==============================
create table public.coop_completed_missions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  coop_session_id uuid references public.coop_sessions(id) on delete cascade not null,
  mission_template text not null,
  role text not null,
  score integer not null default 0,
  stars integer not null default 0,
  total_session_score integer not null default 0,
  partner_country text,
  completed_at timestamptz not null default now(),
  unique(user_id, coop_session_id)
);

alter table public.coop_completed_missions enable row level security;

create policy "Users can view own coop completions" on public.coop_completed_missions
  for select using (auth.uid() = user_id);

create policy "Users can insert own coop completions" on public.coop_completed_missions
  for insert with check (auth.uid() = user_id);

create policy "Users can update own coop completions" on public.coop_completed_missions
  for update using (auth.uid() = user_id);

-- Разрешаем выход из сессий в ожидании
create policy "Users can leave waiting sessions" on public.coop_participants
  for delete using (
    auth.uid() = user_id and
    exists (
      select 1 from public.coop_sessions cs
      where cs.id = coop_session_id and cs.status = 'waiting'
    )
  );

-- ==============================
-- Удаление аккаунта (полное — профиль + auth.users)
-- ==============================
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  delete from public.profiles where id = uid;
  delete from auth.users where id = uid;
end;
$$;

-- Включаем realtime для чата и кооп-сессий
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.coop_sessions;
alter publication supabase_realtime add table public.coop_participants;
