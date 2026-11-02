-- ==========================================================
-- Esquema de Base de Datos y Políticas RLS (Control Cabify)
-- ==========================================================

-- 1. Tabla de Conductores (drivers)
CREATE TABLE IF NOT EXISTS public.drivers (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    nombre TEXT NOT NULL,
    usuario TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    placa TEXT NOT NULL,
    activo BOOLEAN DEFAULT true,
    creado DATE DEFAULT CURRENT_DATE,
    password TEXT DEFAULT ''
);

-- 2. Tabla de Registros Diarios (daily_records)
CREATE TABLE IF NOT EXISTS public.daily_records (
    id TEXT PRIMARY KEY,
    driver_id TEXT NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    estado TEXT NOT NULL CHECK (estado IN ('trabajado', 'no_trabajado', 'pendiente')),
    produccion INTEGER DEFAULT 0, -- Almacenado en centavos
    abordo INTEGER DEFAULT 0,
    recibido INTEGER DEFAULT 0,
    peajes INTEGER DEFAULT 0,
    gasolina JSONB DEFAULT '[]'::jsonb, -- Arreglo JSON
    gastos JSONB DEFAULT '[]'::jsonb,
    obs TEXT DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by TEXT DEFAULT 'Sistema',
    CONSTRAINT unique_driver_fecha UNIQUE (driver_id, fecha)
);

-- 3. Tabla de Cuentas Administrativas (admin_users)
CREATE TABLE IF NOT EXISTS public.admin_users (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    nombre TEXT NOT NULL,
    usuario TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    activo BOOLEAN DEFAULT true,
    creado DATE DEFAULT CURRENT_DATE,
    password TEXT DEFAULT ''
);

-- 4. Tabla de Transacciones y Amortizaciones de Caja Chica (cash_transactions)
CREATE TABLE IF NOT EXISTS public.cash_transactions (
    id TEXT PRIMARY KEY,
    driver_id TEXT NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    period_id DATE,
    tipo TEXT NOT NULL,
    monto INTEGER NOT NULL,
    estado TEXT NOT NULL,
    fecha DATE DEFAULT CURRENT_DATE,
    obs TEXT DEFAULT '',
    ref_comprobante TEXT DEFAULT '',
    verified_at TIMESTAMPTZ,
    verified_by TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabla de Auditoría / Historial de Cambios (audit_log)
CREATE TABLE IF NOT EXISTS public.audit_log (
    id TEXT PRIMARY KEY,
    at TIMESTAMPTZ DEFAULT NOW(),
    by_name TEXT NOT NULL,
    driver_id TEXT NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    accion TEXT NOT NULL
);

-- Migraciones de Columnas Existentes
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.daily_records ADD COLUMN IF NOT EXISTS gastos JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.cash_transactions ADD COLUMN IF NOT EXISTS period_id DATE;
ALTER TABLE public.cash_transactions ADD COLUMN IF NOT EXISTS ref_comprobante TEXT DEFAULT '';
ALTER TABLE public.cash_transactions ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE public.cash_transactions ADD COLUMN IF NOT EXISTS verified_by TEXT DEFAULT '';

-- Indices de Rendimiento
CREATE INDEX IF NOT EXISTS idx_records_driver_fecha ON public.daily_records(driver_id, fecha);
CREATE INDEX IF NOT EXISTS idx_audit_driver ON public.audit_log(driver_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_driver ON public.cash_transactions(driver_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_period ON public.cash_transactions(period_id);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Limpieza de políticas antiguas
DO $$
BEGIN
    DROP POLICY IF EXISTS "Acceso total drivers" ON public.drivers;
    DROP POLICY IF EXISTS "Acceso total daily_records" ON public.daily_records;
    DROP POLICY IF EXISTS "Acceso total audit_log" ON public.audit_log;
    DROP POLICY IF EXISTS "Acceso total admin_users" ON public.admin_users;
    DROP POLICY IF EXISTS "Acceso total cash_transactions" ON public.cash_transactions;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- POLÍTICAS RLS SEGURA PARA DRIVERS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'drivers_select_policy') THEN
        CREATE POLICY "drivers_select_policy" ON public.drivers FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'drivers_all_authenticated') THEN
        CREATE POLICY "drivers_all_authenticated" ON public.drivers FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- POLÍTICAS RLS SEGURA PARA DAILY_RECORDS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'daily_records_select_policy') THEN
        CREATE POLICY "daily_records_select_policy" ON public.daily_records FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'daily_records_write_policy') THEN
        CREATE POLICY "daily_records_write_policy" ON public.daily_records FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- POLÍTICAS RLS SEGURA PARA CASH_TRANSACTIONS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cash_tx_select_policy') THEN
        CREATE POLICY "cash_tx_select_policy" ON public.cash_transactions FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cash_tx_write_policy') THEN
        CREATE POLICY "cash_tx_write_policy" ON public.cash_transactions FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- POLÍTICAS RLS SEGURA PARA ADMIN_USERS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'admin_users_select_policy') THEN
        CREATE POLICY "admin_users_select_policy" ON public.admin_users FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'admin_users_write_policy') THEN
        CREATE POLICY "admin_users_write_policy" ON public.admin_users FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- POLÍTICAS RLS SEGURA PARA AUDIT_LOG
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'audit_log_policy') THEN
        CREATE POLICY "audit_log_policy" ON public.audit_log FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
