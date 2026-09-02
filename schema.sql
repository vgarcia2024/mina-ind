-- ============================================
-- MINA — Esquema de base de datos (Supabase)
-- ============================================
-- Pegá todo este archivo en Supabase → SQL Editor → Run

-- Extensión para generar UUIDs
create extension if not exists "pgcrypto";

-- ============================================
-- 1. PRENDAS (productos con su estructura de costos)
-- ============================================
create table prendas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  precio_compra numeric not null default 0,
  costo_bolsa numeric not null default 0,
  costo_etiqueta numeric not null default 0,
  costo_otros numeric not null default 0,
  costo_total numeric generated always as
    (precio_compra + costo_bolsa + costo_etiqueta + costo_otros) stored,
  precio_venta numeric not null default 0,
  stock integer not null default 0,
  imagen_url text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================
-- 2. COMPRAS (ingreso de mercadería, ligado a stock)
-- ============================================
create table compras (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  proveedor text,
  prenda_id uuid references prendas(id) on delete set null,
  cantidad integer not null check (cantidad > 0),
  costo_total numeric not null check (costo_total >= 0),
  costo_unitario numeric generated always as
    (round(costo_total / nullif(cantidad, 0), 2)) stored,
  pagado boolean not null default true,
  observacion text,
  created_at timestamptz not null default now()
);

-- ============================================
-- 3. VENTAS (se guarda el costo real de la prenda al momento de vender,
--    para que la ganancia histórica no cambie si después actualizás el costo)
-- ============================================
create table ventas (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  prenda_id uuid references prendas(id) on delete set null,
  prenda_nombre text not null,
  cantidad integer not null check (cantidad > 0),
  precio_venta numeric not null check (precio_venta >= 0),
  costo_unitario numeric not null default 0,
  medio_pago text not null default 'efectivo',
  envio numeric not null default 0,
  total numeric generated always as
    (precio_venta * cantidad + envio) stored,
  ganancia numeric generated always as
    ((precio_venta - costo_unitario) * cantidad) stored,
  created_at timestamptz not null default now()
);

-- ============================================
-- 4. GASTOS (gastos generales del emprendimiento)
-- ============================================
create table gastos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  descripcion text not null,
  categoria text not null default 'otros',
  monto numeric not null check (monto >= 0),
  medio_pago text not null default 'efectivo',
  observacion text,
  created_at timestamptz not null default now()
);

-- ============================================
-- TRIGGERS: mantener el stock de "prendas" sincronizado
-- ============================================

-- Al insertar una compra, sumar stock
create or replace function fn_compra_suma_stock()
returns trigger as $$
begin
  if new.prenda_id is not null then
    update prendas set stock = stock + new.cantidad where id = new.prenda_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_compra_suma_stock
after insert on compras
for each row execute function fn_compra_suma_stock();

-- Si se borra una compra, restar el stock que había sumado
create or replace function fn_compra_borrada_resta_stock()
returns trigger as $$
begin
  if old.prenda_id is not null then
    update prendas set stock = stock - old.cantidad where id = old.prenda_id;
  end if;
  return old;
end;
$$ language plpgsql;

create trigger trg_compra_borrada_resta_stock
after delete on compras
for each row execute function fn_compra_borrada_resta_stock();

-- Al insertar una venta, restar stock
create or replace function fn_venta_resta_stock()
returns trigger as $$
begin
  if new.prenda_id is not null then
    update prendas set stock = stock - new.cantidad where id = new.prenda_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_venta_resta_stock
after insert on ventas
for each row execute function fn_venta_resta_stock();

-- Si se borra una venta, devolver el stock
create or replace function fn_venta_borrada_suma_stock()
returns trigger as $$
begin
  if old.prenda_id is not null then
    update prendas set stock = stock + old.cantidad where id = old.prenda_id;
  end if;
  return old;
end;
$$ language plpgsql;

create trigger trg_venta_borrada_suma_stock
after delete on ventas
for each row execute function fn_venta_borrada_suma_stock();

-- ============================================
-- SEGURIDAD (RLS)
-- Como es un sistema de uso personal (una sola usuaria, sin login),
-- se deja acceso abierto con la anon key. Si más adelante sumás login,
-- reemplazá estas políticas por reglas basadas en auth.uid().
-- ============================================
alter table prendas enable row level security;
alter table compras enable row level security;
alter table ventas enable row level security;
alter table gastos enable row level security;

create policy "acceso total prendas" on prendas for all using (true) with check (true);
create policy "acceso total compras" on compras for all using (true) with check (true);
create policy "acceso total ventas" on ventas for all using (true) with check (true);
create policy "acceso total gastos" on gastos for all using (true) with check (true);

-- ============================================
-- STORAGE: bucket para imágenes de prendas
-- (esto también se puede crear desde Storage → New bucket en el dashboard)
-- ============================================
insert into storage.buckets (id, name, public)
values ('prendas', 'prendas', true)
on conflict (id) do nothing;

create policy "lectura publica imagenes prendas"
on storage.objects for select
using (bucket_id = 'prendas');

create policy "subida publica imagenes prendas"
on storage.objects for insert
with check (bucket_id = 'prendas');

create policy "borrado publico imagenes prendas"
on storage.objects for delete
using (bucket_id = 'prendas');
