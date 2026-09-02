-- =============================================================================
-- SECCIÓN 7 — base de datos de la competencia
--
-- Pega este archivo entero en el editor SQL de Supabase y ejecútalo una vez.
-- Crea las dos tablas y, sobre todo, deja los permisos como deben quedar.
--
-- LA REGLA QUE IMPORTA: los equipos pueden ESCRIBIR pero no LEER.
-- La clave del juego viaja dentro de la página, así que cualquiera puede
-- sacarla. Si esa clave también pudiera leer, un equipo consultaría la base y
-- vería el código que enviaron los demás: las soluciones de sus compañeros,
-- servidas. Por eso abajo solo hay políticas de INSERT.
-- El panel de organizadores usa la clave de servicio, que NO se publica.
-- =============================================================================

create table if not exists equipos (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  creado_en   timestamptz not null default now()
);

create table if not exists intentos (
  id            bigserial primary key,
  equipo_id     uuid not null references equipos(id) on delete cascade,
  equipo_nombre text not null,          -- copiado, para leer el panel sin cruzar tablas
  reto          text not null,          -- id del encargo, o __final
  funcion       text,
  codigo        text,                   -- lo que escribió el equipo, tal cual
  paso          boolean not null default false,
  pasados       integer not null default 0,
  total         integer not null default 0,
  error         text,
  puntos        integer not null default 0,
  pista_usada   boolean not null default false,
  segundos      integer not null default 0,   -- tiempo de juego al enviarlo
  creado_en     timestamptz not null default now()
);

create index if not exists intentos_equipo on intentos (equipo_id, creado_en);
create index if not exists intentos_reto    on intentos (reto);

alter table equipos  enable row level security;
alter table intentos enable row level security;

-- Solo insertar. Sin política de select, nadie con la clave pública puede leer.
drop policy if exists equipos_insertar on equipos;
create policy equipos_insertar on equipos
  for insert to anon with check (true);

drop policy if exists intentos_insertar on intentos;
create policy intentos_insertar on intentos
  for insert to anon with check (true);

-- =============================================================================
-- Vista para el panel: una fila por equipo con lo que interesa de un vistazo.
-- =============================================================================
create or replace view marcador as
select
  e.id,
  e.nombre,
  e.creado_en,
  count(*) filter (where i.paso)                    as encargos_resueltos,
  count(*)                                          as intentos_totales,
  coalesce(sum(i.puntos) filter (where i.paso), 0)  as puntos,
  max(i.segundos)                                   as segundos,
  max(i.creado_en)                                  as ultima_actividad
from equipos e
left join intentos i on i.equipo_id = e.id
group by e.id, e.nombre, e.creado_en;

-- Comprobación: debe devolver dos filas, ambas con rowsecurity = true
select tablename, rowsecurity from pg_tables
where schemaname = 'public' and tablename in ('equipos', 'intentos');
