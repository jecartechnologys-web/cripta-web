-- =============================================
-- CRIPTA WEB — Supabase Schema
-- v2.0 — Sin login, device-based users
-- =============================================

-- Tabla de usuarios (device-based, sin auth)
CREATE TABLE IF NOT EXISTS usuarios (
  id TEXT PRIMARY KEY,
  nombre TEXT DEFAULT '',
  meta_diaria NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ingresos
CREATE TABLE IF NOT EXISTS ingresos (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  monto NUMERIC NOT NULL,
  descripcion TEXT DEFAULT '',
  categoria TEXT DEFAULT 'general',
  fecha DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gastos
CREATE TABLE IF NOT EXISTS gastos (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  monto NUMERIC NOT NULL,
  descripcion TEXT DEFAULT '',
  categoria TEXT DEFAULT 'general',
  fecha DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gasolina
CREATE TABLE IF NOT EXISTS gasolina (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  litros NUMERIC DEFAULT 0,
  costo NUMERIC NOT NULL,
  km_recorridos NUMERIC DEFAULT 0,
  descripcion TEXT DEFAULT '',
  fecha DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pasivos (antes "Deudas")
CREATE TABLE IF NOT EXISTS deudas (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  monto_total NUMERIC NOT NULL,
  monto_pagado NUMERIC DEFAULT 0,
  tasa_interes NUMERIC DEFAULT 0,
  fecha_limite DATE,
  estado TEXT DEFAULT 'activa' CHECK (estado IN ('activa', 'pagada')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pagos de pasivos
CREATE TABLE IF NOT EXISTS pagos_deuda (
  id BIGSERIAL PRIMARY KEY,
  deuda_id BIGINT NOT NULL REFERENCES deudas(id) ON DELETE CASCADE,
  monto NUMERIC NOT NULL,
  fecha DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Metas diarias
CREATE TABLE IF NOT EXISTS metas (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  monto_objetivo NUMERIC NOT NULL,
  fecha DATE DEFAULT CURRENT_DATE,
  completada BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Presupuestos semanales
CREATE TABLE IF NOT EXISTS presupuestos (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL,
  monto_limite NUMERIC NOT NULL,
  monto_gastado NUMERIC DEFAULT 0,
  fecha_inicio DATE DEFAULT CURRENT_DATE,
  fecha_fin DATE DEFAULT (CURRENT_DATE + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Índices para performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_ingresos_user_fecha ON ingresos(user_id, fecha);
CREATE INDEX IF NOT EXISTS idx_gastos_user_fecha ON gastos(user_id, fecha);
CREATE INDEX IF NOT EXISTS idx_gasolina_user_fecha ON gasolina(user_id, fecha);
CREATE INDEX IF NOT EXISTS idx_deudas_user_estado ON deudas(user_id, estado);

-- =============================================
-- RLS (Row Level Security) — modo open para
-- device-based app. Seguridad vía device ID
-- aleatorio + CSP headers + anon key pública.
-- =============================================
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingresos ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE gasolina ENABLE ROW LEVEL SECURITY;
ALTER TABLE deudas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_deuda ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos ENABLE ROW LEVEL SECURITY;

-- Políticas allow-all para anon key
CREATE POLICY IF NOT EXISTS anon_all_usuarios ON usuarios FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS anon_all_ingresos ON ingresos FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS anon_all_gastos ON gastos FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS anon_all_gasolina ON gasolina FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS anon_all_deudas ON deudas FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS anon_all_pagos_deuda ON pagos_deuda FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS anon_all_metas ON metas FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS anon_all_presupuestos ON presupuestos FOR ALL TO anon USING (true) WITH CHECK (true);

-- =============================================
-- Funciones útiles
-- =============================================

-- Calcular ganancia neta del día
CREATE OR REPLACE FUNCTION ganancia_neta(p_user_id TEXT, p_fecha DATE DEFAULT CURRENT_DATE)
RETURNS NUMERIC AS $$
DECLARE
  total_ingresos NUMERIC;
  total_gastos NUMERIC;
  total_gasolina NUMERIC;
BEGIN
  SELECT COALESCE(SUM(monto), 0) INTO total_ingresos
  FROM ingresos WHERE user_id = p_user_id AND fecha = p_fecha;

  SELECT COALESCE(SUM(monto), 0) INTO total_gastos
  FROM gastos WHERE user_id = p_user_id AND fecha = p_fecha;

  SELECT COALESCE(SUM(costo), 0) INTO total_gasolina
  FROM gasolina WHERE user_id = p_user_id AND fecha = p_fecha;

  RETURN total_ingresos - total_gastos - total_gasolina;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rendimiento km/L
CREATE OR REPLACE FUNCTION rendimiento_km_l(p_user_id TEXT)
RETURNS NUMERIC AS $$
DECLARE
  total_km NUMERIC;
  total_litros NUMERIC;
BEGIN
  SELECT COALESCE(SUM(km_recorridos), 0), COALESCE(SUM(litros), 0)
  INTO total_km, total_litros
  FROM gasolina WHERE user_id = p_user_id;

  IF total_litros = 0 THEN RETURN 0; END IF;
  RETURN ROUND(total_km / total_litros, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
