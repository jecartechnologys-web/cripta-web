-- =============================================
-- CRIPTA WEB — DROP + RECREATE completo
-- =============================================

-- Dropear funciones primero (tienen dependencias)
DROP FUNCTION IF EXISTS rendimiento_km_l(TEXT);
DROP FUNCTION IF EXISTS ganancia_neta(TEXT, DATE);

-- Dropear tablas en orden inverso (FK constraints)
DROP TABLE IF EXISTS pagos_deuda CASCADE;
DROP TABLE IF EXISTS presupuestos CASCADE;
DROP TABLE IF EXISTS metas CASCADE;
DROP TABLE IF EXISTS deudas CASCADE;
DROP TABLE IF EXISTS gasolina CASCADE;
DROP TABLE IF EXISTS gastos CASCADE;
DROP TABLE IF EXISTS ingresos CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- =============================================
-- Recrear todo con TEXT en user_id
-- =============================================

CREATE TABLE usuarios (
  id TEXT PRIMARY KEY,
  nombre TEXT DEFAULT '',
  meta_diaria NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ingresos (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  monto NUMERIC NOT NULL,
  descripcion TEXT DEFAULT '',
  categoria TEXT DEFAULT 'general',
  fecha DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE gastos (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  monto NUMERIC NOT NULL,
  descripcion TEXT DEFAULT '',
  categoria TEXT DEFAULT 'general',
  fecha DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE gasolina (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  litros NUMERIC DEFAULT 0,
  costo NUMERIC NOT NULL,
  km_recorridos NUMERIC DEFAULT 0,
  descripcion TEXT DEFAULT '',
  fecha DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE deudas (
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

CREATE TABLE pagos_deuda (
  id BIGSERIAL PRIMARY KEY,
  deuda_id BIGINT NOT NULL REFERENCES deudas(id) ON DELETE CASCADE,
  monto NUMERIC NOT NULL,
  fecha DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE metas (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  monto_objetivo NUMERIC NOT NULL,
  fecha DATE DEFAULT CURRENT_DATE,
  completada BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE presupuestos (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL,
  monto_limite NUMERIC NOT NULL,
  monto_gastado NUMERIC DEFAULT 0,
  fecha_inicio DATE DEFAULT CURRENT_DATE,
  fecha_fin DATE DEFAULT (CURRENT_DATE + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_ingresos_user_fecha ON ingresos(user_id, fecha);
CREATE INDEX idx_gastos_user_fecha ON gastos(user_id, fecha);
CREATE INDEX idx_gasolina_user_fecha ON gasolina(user_id, fecha);
CREATE INDEX idx_deudas_user_estado ON deudas(user_id, estado);

-- RLS deshabilitado (single-user app)
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE ingresos DISABLE ROW LEVEL SECURITY;
ALTER TABLE gastos DISABLE ROW LEVEL SECURITY;
ALTER TABLE gasolina DISABLE ROW LEVEL SECURITY;
ALTER TABLE deudas DISABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_deuda DISABLE ROW LEVEL SECURITY;
ALTER TABLE metas DISABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos DISABLE ROW LEVEL SECURITY;

-- Funciones
CREATE OR REPLACE FUNCTION ganancia_neta(p_user_id TEXT, p_fecha DATE DEFAULT CURRENT_DATE)
RETURNS NUMERIC AS $$
DECLARE
  total_ingresos NUMERIC;
  total_gastos NUMERIC;
  total_gasolina NUMERIC;
BEGIN
  SELECT COALESCE(SUM(monto), 0) INTO total_ingresos FROM ingresos WHERE user_id = p_user_id AND fecha = p_fecha;
  SELECT COALESCE(SUM(monto), 0) INTO total_gastos FROM gastos WHERE user_id = p_user_id AND fecha = p_fecha;
  SELECT COALESCE(SUM(costo), 0) INTO total_gasolina FROM gasolina WHERE user_id = p_user_id AND fecha = p_fecha;
  RETURN total_ingresos - total_gastos - total_gasolina;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION rendimiento_km_l(p_user_id TEXT)
RETURNS NUMERIC AS $$
DECLARE total_km NUMERIC; total_litros NUMERIC;
BEGIN
  SELECT COALESCE(SUM(km_recorridos), 0), COALESCE(SUM(litros), 0) INTO total_km, total_litros FROM gasolina WHERE user_id = p_user_id;
  IF total_litros = 0 THEN RETURN 0; END IF;
  RETURN ROUND(total_km / total_litros, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
