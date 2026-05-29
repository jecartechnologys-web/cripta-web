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

-- Deudas
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

-- Pagos de deudas
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
-- RLS (Row Level Security) — deshabilitado para
-- device-based single-user app. Seguridad vía
-- CSP + anon key + sanitización frontend.
-- =============================================
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE ingresos DISABLE ROW LEVEL SECURITY;
ALTER TABLE gastos DISABLE ROW LEVEL SECURITY;
ALTER TABLE gasolina DISABLE ROW LEVEL SECURITY;
ALTER TABLE deudas DISABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_deuda DISABLE ROW LEVEL SECURITY;
ALTER TABLE metas DISABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos DISABLE ROW LEVEL SECURITY;

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
