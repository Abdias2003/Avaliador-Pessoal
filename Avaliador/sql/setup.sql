-- SQL para criar as tabelas necessárias no Supabase
-- Crie duas tabelas: genres (padrões de gêneros) e reviews (avaliações)

-- genres: id (serial), name, description, color, popularity, created_at
create table if not exists public.genres (
  id serial primary key,
  name text not null,
  description text,
  color text,
  popularity int default 0,
  created_at timestamptz default now()
);

-- reviews: id (uuid), user_id (uuid), genre_id (int FK), type, title, rating, opinion, season, created_at
create table if not exists public.reviews (
  id uuid default gen_random_uuid() primary key,
  user_id uuid,
  genre_id int references public.genres(id) on delete set null,
  type text not null,
  title text not null,
  rating int check (rating >= 1 and rating <= 5),
  opinion text,
  season int,
  created_at timestamptz default now()
);

-- Exemplos de inserção de gêneros
insert into public.genres (name, description, color, popularity) values
('Ação','Filmes com muitas cenas de ação','#ef4444', 10),
('Comédia','Filmes e séries para rir','#f59e0b', 8),
('Drama','Histórias dramáticas e emocionantes','#3b82f6', 9)
on conflict do nothing;

-- Observação: dependendo das configurações do seu projeto Supabase, talvez seja necessário habilitar políticas de RLS (Row Level Security) ou ajustá-las.
-- Para testes locais simples, você pode desabilitar RLS nas tabelas via interface do Supabase.
