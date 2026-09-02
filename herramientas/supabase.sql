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
-- PRIVILEGIOS EXPLÍCITOS
-- Postgres tiene dos capas y hacen falta las dos: los PRIVILEGIOS deciden si
-- el rol puede tocar la tabla, y las POLÍTICAS deciden qué filas. Se ponen a
-- mano para no depender de cómo esté configurado el proyecto: así funciona
-- tengas marcado o no "Automatically expose new tables".
-- =============================================================================
grant usage on schema public to anon;
grant insert on table equipos  to anon;
grant insert on table intentos to anon;
grant usage, select on sequence intentos_id_seq to anon;

-- Y lo que NO se da, que importa más: ni leer, ni modificar, ni borrar.
revoke select, update, delete on table equipos  from anon;
revoke select, update, delete on table intentos from anon;

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

-- La vista es SOLO para el panel de organizadores. Si quedara legible por la
-- clave pública, un equipo vería el marcador entero desde el navegador.
revoke all on marcador from anon;
grant select on marcador to service_role;

-- =============================================================================
-- COMPROBACIONES. Las tres deben salir bien o algo quedó mal ejecutado.
-- =============================================================================

-- 1) las dos tablas con seguridad por fila activada
select tablename,
       rowsecurity as seguridad_por_fila,
       case when rowsecurity then 'bien' else 'MAL: actívala' end as revision
from pg_tables
where schemaname = 'public' and tablename in ('equipos', 'intentos');

-- 2) la clave pública solo puede insertar (debe decir INSERT y nada más)
select table_name, string_agg(privilege_type, ', ' order by privilege_type) as permisos,
       case when string_agg(privilege_type, ',' order by privilege_type) = 'INSERT'
            then 'bien' else 'MAL: sobra un permiso' end as revision
from information_schema.role_table_grants
where grantee = 'anon' and table_schema = 'public'
group by table_name;

-- 3) la vista del marcador NO debe aparecer para anon (cero filas es lo correcto)
select 'MAL: el marcador es legible por los equipos' as revision
from information_schema.role_table_grants
where grantee = 'anon' and table_name = 'marcador';
