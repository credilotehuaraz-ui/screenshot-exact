-- ==========================================================
-- Esquema de Base de Datos para Supabase (Control Cabify)
-- ==========================================================

-- 1. Tabla de Conductores (drivers)
CREATE TABLE IF NOT EXISTS public.drivers (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    usuario TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    placa TEXT NOT NULL,
    activo BOOLEAN DEFAULT true,
    creado DATE DEFAULT CURRENT_DATE,
    password TEXT NOT NULL
);

-- 2. Tabla de Registros Diarios (daily_records)
CREATE TABLE IF NOT EXISTS public.daily_records (
    id TEXT PRIMARY KEY,
    driver_id TEXT NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    estado TEXT NOT NULL CHECK (estado IN ('trabajado', 'no_trabajado', 'pendiente')),
    produccion INTEGER DEFAULT 0, -- Almacenado en centavos (S/ 194.29 = 19429)
    abordo INTEGER DEFAULT 0,
    recibido INTEGER DEFAULT 0,
    peajes INTEGER DEFAULT 0,
    gasolina JSONB DEFAULT '[]'::jsonb, -- Arreglo JSON de [{ id, monto, desc }]
    obs TEXT DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by TEXT DEFAULT 'Sistema',
    CONSTRAINT unique_driver_fecha UNIQUE (driver_id, fecha)
);

-- 3. Tabla de Auditoría / Historial de Cambios (audit_log)
CREATE TABLE IF NOT EXISTS public.audit_log (
    id TEXT PRIMARY KEY,
    at TIMESTAMPTZ DEFAULT NOW(),
    by_name TEXT NOT NULL,
    driver_id TEXT NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    accion TEXT NOT NULL
);

-- 4. Tabla de Cuentas Administrativas (admin_users)
CREATE TABLE IF NOT EXISTS public.admin_users (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    usuario TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    activo BOOLEAN DEFAULT true,
    creado DATE DEFAULT CURRENT_DATE,
    password TEXT NOT NULL
);

-- 5. Tabla de Devoluciones y Reembolsos de Caja Chica (cash_transactions)
CREATE TABLE IF NOT EXISTS public.cash_transactions (
    id TEXT PRIMARY KEY,
    driver_id TEXT NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL,
    monto INTEGER NOT NULL,
    estado TEXT NOT NULL,
    fecha DATE DEFAULT CURRENT_DATE,
    obs TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices de Rendimiento
CREATE INDEX IF NOT EXISTS idx_records_driver_fecha ON public.daily_records(driver_id, fecha);
CREATE INDEX IF NOT EXISTS idx_audit_driver ON public.audit_log(driver_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_driver ON public.cash_transactions(driver_id);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;

-- Politicas RLS permisivas para API Anon / Autenticada
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Acceso total drivers') THEN
        CREATE POLICY "Acceso total drivers" ON public.drivers FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Acceso total daily_records') THEN
        CREATE POLICY "Acceso total daily_records" ON public.daily_records FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Acceso total audit_log') THEN
        CREATE POLICY "Acceso total audit_log" ON public.audit_log FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Acceso total admin_users') THEN
        CREATE POLICY "Acceso total admin_users" ON public.admin_users FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Acceso total cash_transactions') THEN
        CREATE POLICY "Acceso total cash_transactions" ON public.cash_transactions FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
