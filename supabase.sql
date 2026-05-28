-- =============================================
-- CRIPTA WEB — Supabase Schema
-- =============================================

-- Tabla de usuarios (vinculada a auth de Supabase)
CREATE TABLE usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT,
  meta_diaria NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ingresos
CREATE TABLE ingresos (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  monto NUMERIC NOT NULL,
  descripcion TEXT,
  categoria TEXT DEFAULT 'general',
  fecha DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gastos
CREATE TABLE gastos (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  monto NUMERIC NOT NULL,
  descripcion TEXT,
  categoria TEXT DEFAULT 'general',
  fecha DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gasolina
CREATE TABLE gasolina (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  litros NUMERIC NOT NULL,
  costo NUMERIC NOT NULL,
  km_recorridos NUMERIC DEFAULT 0,
  fecha DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deudas
CREATE TABLE deudas (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  monto_total NUMERIC NOT NULL,
  monto_pagado NUMERIC DEFAULT 0,
  tasa_interes NUMERIC DEFAULT 0,
  fecha_limite DATE,
  estado TEXT DEFAULT 'activa' CHECK (estado IN ('activa', 'pagada')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pagos de deudas
CREATE TABLE pagos_deuda (
  id BIGSERIAL PRIMARY KEY,
  deuda_id BIGINT REFERENCES deudas(id) ON DELETE CASCADE,
  monto NUMERIC NOT NULL,
  fecha DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Metas diarias
CREATE TABLE metas (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  monto_objetivo NUMERIC NOT NULL,
  fecha DATE DEFAULT CURRENT_DATE,
  completada BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Presupuestos semanales
CREATE TABLE presupuestos (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL,
  monto_limite NUMERIC NOT NULL,
  monto_gastado NUMERIC DEFAULT 0,
  fecha_inicio DATE DEFAULT CURRENT_DATE,
  fecha_fin DATE DEFAULT (CURRENT_DATE + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- RLS (Row Level Security)
-- =============================================

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingresos ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE gasolina ENABLE ROW LEVEL SECURITY;
ALTER TABLE deudas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_deuda ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos ENABLE ROW LEVEL SECURITY;

-- Políticas: cada usuario solo ve sus datos
CREATE POLICY "usuarios_own" ON usuarios FOR ALL USING (auth.uid() = id);
CREATE POLICY "ingresos_own" ON ingresos FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "gastos_own" ON gastos FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "gasolina_own" ON gasolina FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "deudas_own" ON deudas FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "pagos_deuda_own" ON pagos_deuda FOR ALL USING (
  EXISTS (SELECT 1 FROM deudas WHERE deudas.id = pagos_deuda.deuda_id AND auth.uid() = deudas.user_id)
);
CREATE POLICY "metas_own" ON metas FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "presupuestos_own" ON presupuestos FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- Funciones útiles
-- =============================================

-- Calcular ganancia neta del día
CREATE OR REPLACE FUNCTION ganancia_neta(p_user_id UUID, p_fecha DATE DEFAULT CURRENT_DATE)
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
CREATE OR REPLACE FUNCTION rendimiento_km_l(p_user_id UUID)
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
