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
-- Primero se quita TODO y después se devuelve solo lo imprescindible.
-- Quitar permisos de uno en uno no sirve: Supabase concede un paquete por
-- defecto que incluye TRUNCATE, y con TRUNCATE cualquier equipo podría vaciar
-- la tabla de resultados de todos. Se limpia entero y se concede a mano.
revoke all on table equipos  from anon, authenticated;
revoke all on table intentos from anon, authenticated;
revoke all on sequence intentos_id_seq from anon, authenticated;

grant usage  on schema public to anon;
grant insert on table equipos  to anon;
grant insert on table intentos to anon;
-- usage (no select) sobre la secuencia: basta para que la fila obtenga su id
grant usage  on sequence intentos_id_seq to anon;

-- Y el rol del PANEL, que es el único que puede leer. Hay que concedérselo a
-- mano igual que al otro: con "Automatically expose new tables" desmarcada,
-- Supabase no da permisos a ningún rol, tampoco a este.
grant select on table equipos  to service_role;
grant select on table intentos to service_role;

-- =============================================================================
-- SABOTAJES: lo que un equipo puede lanzarle a otro
--
-- Aquí se abre una rendija en la regla de "escribir pero no leer", y conviene
-- ver exactamente cuánto: los equipos pasan a poder leer la tabla `equipos`
-- (solo id, nombre y hora de alta) y la de sabotajes. El código enviado sigue
-- en `intentos`, y esa NO se abre. Nadie ve el trabajo de nadie.
-- =============================================================================
create table if not exists sabotajes (
  id         bigserial primary key,
  de_equipo  uuid not null references equipos(id) on delete cascade,
  de_nombre  text not null,
  a_equipo   uuid not null references equipos(id) on delete cascade,
  tipo       text not null,
  creado_en  timestamptz not null default now()
);
create index if not exists sabotajes_destino on sabotajes (a_equipo, creado_en);

alter table sabotajes enable row level security;

-- EL SERVIDOR COMPRUEBA QUE EL ATAQUE ESTÉ GANADO.
-- Si esto lo decidiera el navegador, bastaría con abrir las herramientas de
-- desarrollo para tener sabotajes infinitos. La regla: solo se pueden enviar
-- tantos como encargos distintos haya resuelto el equipo.
create or replace function sabotaje_ganado() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  ganados integer;
  usados  integer;
begin
  select count(distinct reto) into ganados
    from intentos where equipo_id = new.de_equipo and paso;
  select count(*) into usados
    from sabotajes where de_equipo = new.de_equipo;
  if usados >= ganados then
    raise exception 'Sin sabotajes disponibles: resueltos %, ya enviados %', ganados, usados;
  end if;
  if new.de_equipo = new.a_equipo then
    raise exception 'Un equipo no puede sabotearse a si mismo';
  end if;
  return new;
end $$;

drop trigger if exists sabotajes_solo_ganados on sabotajes;
create trigger sabotajes_solo_ganados before insert on sabotajes
  for each row execute function sabotaje_ganado();

-- Los equipos pueden lanzar y ver los ataques (quién ataca a quién es parte
-- del juego). La tabla equipos se abre solo para poder elegir objetivo: ahí
-- no hay más que nombres.
revoke all on table sabotajes from anon, authenticated;
grant select, insert on table sabotajes to anon;
grant usage on sequence sabotajes_id_seq to anon;
grant select on table equipos to anon;
grant select on table sabotajes to authenticated;

drop policy if exists sabotajes_ver on sabotajes;
create policy sabotajes_ver on sabotajes for select to anon using (true);
drop policy if exists sabotajes_lanzar on sabotajes;
create policy sabotajes_lanzar on sabotajes for insert to anon with check (true);

drop policy if exists equipos_nombres on equipos;
create policy equipos_nombres on equipos for select to anon using (true);

-- =============================================================================
-- QUIÉN PUEDE LEER: la lista de organizadores
--
-- El panel entra con usuario y contraseña, no con la clave de administrador.
-- Pero no basta con "estar autenticado": Supabase permite que cualquiera se
-- registre con la clave pública, y entonces sería un usuario autenticado más.
-- Por eso leer exige además estar en ESTA lista, que solo se toca desde aquí.
-- =============================================================================
create table if not exists organizadores (
  email  text primary key,
  nota   text,
  alta   timestamptz not null default now()
);
-- nadie llega a esta tabla desde la API, ni para leerla
revoke all on table organizadores from anon, authenticated;

-- AGREGA AQUÍ LOS CORREOS DE QUIENES VAN A ENTRAR AL PANEL:
insert into organizadores (email, nota) values
  ('cambia@esto.com', 'organizador')
on conflict (email) do nothing;

-- La comprobación va en una función con permisos propios: si la policy
-- consultara la tabla directamente, necesitaría dar acceso a la lista, que es
-- justo lo que no queremos.
create or replace function es_organizador() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from organizadores
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
grant execute on function es_organizador() to authenticated;

grant select on table equipos  to authenticated;
grant select on table intentos to authenticated;

drop policy if exists equipos_leer on equipos;
create policy equipos_leer on equipos
  for select to authenticated using (es_organizador());

drop policy if exists intentos_leer on intentos;
create policy intentos_leer on intentos
  for select to authenticated using (es_organizador());

-- =============================================================================
-- Vista para el panel: una fila por equipo con lo que interesa de un vistazo.
-- =============================================================================
-- security_invoker: la vista aplica las reglas de QUIEN consulta. Sin esto
-- correría con los permisos de su dueño y saltaría la lista de
-- organizadores, dejando el marcador a la vista de cualquier registrado.
create or replace view marcador with (security_invoker = true) as
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
grant select on marcador to authenticated, service_role;

-- =============================================================================
-- COMPROBACIONES. Las tres deben salir bien o algo quedó mal ejecutado.
-- =============================================================================

-- 1) las dos tablas con seguridad por fila activada
select tablename,
       rowsecurity as seguridad_por_fila,
       case when rowsecurity then 'bien' else 'MAL: actívala' end as revision
from pg_tables
where schemaname = 'public' and tablename in ('equipos', 'intentos');

-- 2) LAS REGLAS QUE IMPORTAN, dichas con palabras.
--    Antes esto volcaba la lista de permisos y marcaba MAL todo lo que no
--    fuera INSERT. Cuando el sabotaje abrió la lectura de `equipos` a
--    propósito, empezó a dar tres falsas alarmas. Una comprobación que grita
--    sin motivo enseña a ignorarla, y entonces no sirve para nada.
select regla, revision from (
  select 1 as orden,
         'Los equipos NO pueden leer el codigo (tabla intentos)' as regla,
         case when exists (
           select 1 from information_schema.role_table_grants
           where grantee = 'anon' and table_schema = 'public'
             and table_name = 'intentos' and privilege_type = 'SELECT')
         then 'MAL: el codigo ajeno queda a la vista' else 'bien' end as revision
  union all
  select 2,
         'Los equipos NO pueden borrar, cambiar ni vaciar nada',
         case when exists (
           select 1 from information_schema.role_table_grants
           where grantee = 'anon' and table_schema = 'public'
             and privilege_type in ('DELETE', 'UPDATE', 'TRUNCATE')
             and table_name in ('equipos', 'intentos', 'sabotajes'))
         then 'MAL: sobra un permiso destructivo' else 'bien' end
  union all
  select 3,
         'Los equipos SI pueden registrar sus intentos',
         case when exists (
           select 1 from information_schema.role_table_grants
           where grantee = 'anon' and table_name = 'intentos'
             and privilege_type = 'INSERT')
         then 'bien' else 'MAL: no podran guardar nada' end
  union all
  select 4,
         'Los equipos SI pueden ver nombres y lanzar sabotajes',
         case when exists (
           select 1 from information_schema.role_table_grants
           where grantee = 'anon' and table_name = 'equipos' and privilege_type = 'SELECT')
          and exists (
           select 1 from information_schema.role_table_grants
           where grantee = 'anon' and table_name = 'sabotajes' and privilege_type = 'INSERT')
         then 'bien' else 'MAL: el sabotaje no funcionara' end
) t order by orden;

-- 3) la vista del marcador NO debe aparecer para anon (cero filas es lo correcto)
select 'MAL: el marcador es legible por los equipos' as revision
from information_schema.role_table_grants
where grantee = 'anon' and table_name = 'marcador';

-- 4) el panel SÍ debe poder leer (dos filas con 'bien')
select table_name,
       case when count(*) filter (where privilege_type = 'SELECT') > 0
            then 'bien' else 'MAL: el panel no podra leer' end as revision
from information_schema.role_table_grants
where grantee = 'service_role' and table_schema = 'public'
  and table_name in ('equipos', 'intentos')
group by table_name;
