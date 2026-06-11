-- ============================================================
-- ESPAZIO - Migration 001: Schema Completo
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ============================================================
-- ENUMS
-- ============================================================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('administrator', 'editor', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE log_action AS ENUM (
    'login', 'logout', 'create', 'update', 'delete',
    'stock_entry', 'stock_output', 'role_change', 'password_change'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- TABELA: companies
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

-- ============================================================
-- TABELA: profiles (espelha auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id  UUID NOT NULL REFERENCES companies(id),
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  role        user_role NOT NULL DEFAULT 'viewer',
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

-- ============================================================
-- TABELA: employees
-- ============================================================
CREATE TABLE IF NOT EXISTS employees (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id),
  name          TEXT NOT NULL,
  registration  TEXT,
  department    TEXT,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

-- ============================================================
-- TABELA: categories
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID NOT NULL REFERENCES companies(id),
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: products
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  ca              TEXT,
  size            TEXT,
  minimum_stock   INTEGER NOT NULL DEFAULT 0 CHECK (minimum_stock >= 0),
  current_stock   INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

-- ============================================================
-- TABELA: stock_entries
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_entries (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID NOT NULL REFERENCES companies(id),
  product_id  UUID NOT NULL REFERENCES products(id),
  user_id     UUID NOT NULL REFERENCES profiles(id),
  quantity    INTEGER NOT NULL CHECK (quantity > 0),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: stock_outputs
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_outputs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id),
  product_id    UUID NOT NULL REFERENCES products(id),
  employee_id   UUID NOT NULL REFERENCES employees(id),
  user_id       UUID NOT NULL REFERENCES profiles(id),
  quantity      INTEGER NOT NULL CHECK (quantity > 0),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: activity_logs (imutável - nunca update/delete)
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id   UUID NOT NULL REFERENCES companies(id),
  user_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action       log_action NOT NULL,
  entity_type  TEXT,
  entity_id    UUID,
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES
-- ============================================================

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_company    ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email      ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role       ON profiles(role);

-- employees
CREATE INDEX IF NOT EXISTS idx_employees_company   ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_active    ON employees(company_id, active);

-- categories
CREATE INDEX IF NOT EXISTS idx_categories_company  ON categories(company_id);

-- products
CREATE INDEX IF NOT EXISTS idx_products_company    ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_category   ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_stock      ON products(company_id, current_stock, minimum_stock);
CREATE INDEX IF NOT EXISTS idx_products_name       ON products(company_id, name);
CREATE INDEX IF NOT EXISTS idx_products_active     ON products(company_id, active, deleted_at);

-- stock_entries
CREATE INDEX IF NOT EXISTS idx_entries_product     ON stock_entries(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_entries_company     ON stock_entries(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_entries_user        ON stock_entries(user_id, created_at DESC);

-- stock_outputs
CREATE INDEX IF NOT EXISTS idx_outputs_product     ON stock_outputs(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outputs_company     ON stock_outputs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outputs_employee    ON stock_outputs(employee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outputs_user        ON stock_outputs(user_id, created_at DESC);

-- activity_logs
CREATE INDEX IF NOT EXISTS idx_logs_company        ON activity_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_user           ON activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_entity         ON activity_logs(entity_type, entity_id);

-- ============================================================
-- FUNÇÕES HELPER (SECURITY DEFINER - bypass RLS seguro)
-- ============================================================

CREATE OR REPLACE FUNCTION auth_company_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid() AND deleted_at IS NULL LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role FROM profiles WHERE id = auth.uid() AND deleted_at IS NULL LIMIT 1;
$$;

-- ============================================================
-- FUNÇÕES DE ATUALIZAÇÃO AUTOMÁTICA: updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers updated_at
DROP TRIGGER IF EXISTS trg_companies_updated_at   ON companies;
DROP TRIGGER IF EXISTS trg_profiles_updated_at    ON profiles;
DROP TRIGGER IF EXISTS trg_employees_updated_at   ON employees;
DROP TRIGGER IF EXISTS trg_categories_updated_at  ON categories;
DROP TRIGGER IF EXISTS trg_products_updated_at    ON products;

CREATE TRIGGER trg_companies_updated_at
  BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_employees_updated_at
  BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================
-- TRIGGER: Entrada de Estoque
-- ============================================================

CREATE OR REPLACE FUNCTION fn_apply_stock_entry()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE products
  SET
    current_stock = current_stock + NEW.quantity,
    updated_at = NOW()
  WHERE id = NEW.product_id;

  INSERT INTO activity_logs (company_id, user_id, action, entity_type, entity_id, metadata)
  VALUES (
    NEW.company_id,
    NEW.user_id,
    'stock_entry',
    'products',
    NEW.product_id,
    jsonb_build_object(
      'quantity', NEW.quantity,
      'entry_id', NEW.id,
      'notes', NEW.notes
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stock_entry ON stock_entries;
CREATE TRIGGER trg_stock_entry
  AFTER INSERT ON stock_entries
  FOR EACH ROW EXECUTE FUNCTION fn_apply_stock_entry();

-- ============================================================
-- TRIGGER: Saída de Estoque (com bloqueio pessimista)
-- ============================================================

CREATE OR REPLACE FUNCTION fn_apply_stock_output()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_current_stock INTEGER;
  v_product_name  TEXT;
BEGIN
  -- Bloqueio pessimista: garante consistência em acessos concorrentes
  SELECT current_stock, name
  INTO v_current_stock, v_product_name
  FROM products
  WHERE id = NEW.product_id
  FOR UPDATE;

  IF v_current_stock < NEW.quantity THEN
    RAISE EXCEPTION
      'Estoque insuficiente para "%". Disponível: %, Solicitado: %',
      v_product_name, v_current_stock, NEW.quantity;
  END IF;

  UPDATE products
  SET
    current_stock = current_stock - NEW.quantity,
    updated_at = NOW()
  WHERE id = NEW.product_id;

  INSERT INTO activity_logs (company_id, user_id, action, entity_type, entity_id, metadata)
  VALUES (
    NEW.company_id,
    NEW.user_id,
    'stock_output',
    'products',
    NEW.product_id,
    jsonb_build_object(
      'quantity', NEW.quantity,
      'employee_id', NEW.employee_id,
      'output_id', NEW.id,
      'notes', NEW.notes
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stock_output ON stock_outputs;
CREATE TRIGGER trg_stock_output
  AFTER INSERT ON stock_outputs
  FOR EACH ROW EXECUTE FUNCTION fn_apply_stock_output();

-- ============================================================
-- TRIGGER: Criar profile ao registrar usuário no Auth
-- ============================================================

CREATE OR REPLACE FUNCTION fn_handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Só insere se company_id vier nos metadados do usuário
  IF NEW.raw_user_meta_data->>'company_id' IS NOT NULL THEN
    INSERT INTO profiles (id, company_id, name, email, role)
    VALUES (
      NEW.id,
      (NEW.raw_user_meta_data->>'company_id')::UUID,
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
      NEW.email,
      COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'viewer')
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_new_auth_user ON auth.users;
CREATE TRIGGER trg_new_auth_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION fn_handle_new_auth_user();

-- ============================================================
-- VIEW: Produtos com estoque baixo
-- ============================================================

CREATE OR REPLACE VIEW v_low_stock_products AS
SELECT
  p.id,
  p.company_id,
  p.name,
  p.ca,
  p.size,
  p.current_stock,
  p.minimum_stock,
  p.category_id,
  c.name AS category_name
FROM products p
LEFT JOIN categories c ON c.id = p.category_id
WHERE
  p.current_stock <= p.minimum_stock
  AND p.deleted_at IS NULL
  AND p.active = TRUE;

-- ============================================================
-- VIEW: Movimentações recentes (unificada entrada + saída)
-- ============================================================

CREATE OR REPLACE VIEW v_recent_movements AS
SELECT
  'output'            AS type,
  so.id,
  so.company_id,
  so.created_at,
  p.name              AS product_name,
  pr.name             AS user_name,
  e.name              AS employee_name,
  -so.quantity        AS delta,
  so.quantity         AS quantity,
  so.product_id,
  so.employee_id,
  so.user_id
FROM stock_outputs so
JOIN products p    ON p.id = so.product_id
JOIN profiles pr   ON pr.id = so.user_id
JOIN employees e   ON e.id = so.employee_id
UNION ALL
SELECT
  'entry'             AS type,
  se.id,
  se.company_id,
  se.created_at,
  p.name              AS product_name,
  pr.name             AS user_name,
  NULL                AS employee_name,
  se.quantity         AS delta,
  se.quantity         AS quantity,
  se.product_id,
  NULL                AS employee_id,
  se.user_id
FROM stock_entries se
JOIN products p    ON p.id = se.product_id
JOIN profiles pr   ON pr.id = se.user_id;

-- ============================================================
-- VIEW: Relatório de saídas agrupado por produto
-- ============================================================

CREATE OR REPLACE VIEW v_product_output_summary AS
SELECT
  so.company_id,
  so.product_id,
  p.name      AS product_name,
  p.ca,
  SUM(so.quantity)   AS total_output,
  COUNT(so.id)       AS total_transactions,
  MIN(so.created_at) AS first_at,
  MAX(so.created_at) AS last_at
FROM stock_outputs so
JOIN products p ON p.id = so.product_id
GROUP BY so.company_id, so.product_id, p.name, p.ca;

-- ============================================================
-- RLS: Habilitar em todas as tabelas
-- ============================================================

ALTER TABLE companies        ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees        ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE products         ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_entries    ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_outputs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs    ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLICIES: companies
-- ============================================================
DROP POLICY IF EXISTS "companies_select" ON companies;
CREATE POLICY "companies_select" ON companies
  FOR SELECT USING (id = auth_company_id());

-- ============================================================
-- POLICIES: profiles
-- ============================================================
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "profiles_delete" ON profiles;

CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (company_id = auth_company_id());

CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (
    auth_user_role() = 'administrator'
    AND company_id = auth_company_id()
  );

CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (
    auth_user_role() = 'administrator'
    AND company_id = auth_company_id()
  );

CREATE POLICY "profiles_delete" ON profiles
  FOR UPDATE USING (
    auth_user_role() = 'administrator'
    AND company_id = auth_company_id()
  );

-- ============================================================
-- POLICIES: employees
-- ============================================================
DROP POLICY IF EXISTS "employees_select" ON employees;
DROP POLICY IF EXISTS "employees_write"  ON employees;

CREATE POLICY "employees_select" ON employees
  FOR SELECT USING (company_id = auth_company_id());

CREATE POLICY "employees_write" ON employees
  FOR ALL USING (
    auth_user_role() IN ('administrator', 'editor')
    AND company_id = auth_company_id()
  );

-- ============================================================
-- POLICIES: categories
-- ============================================================
DROP POLICY IF EXISTS "categories_select" ON categories;
DROP POLICY IF EXISTS "categories_write"  ON categories;

CREATE POLICY "categories_select" ON categories
  FOR SELECT USING (company_id = auth_company_id());

CREATE POLICY "categories_write" ON categories
  FOR ALL USING (
    auth_user_role() IN ('administrator', 'editor')
    AND company_id = auth_company_id()
  );

-- ============================================================
-- POLICIES: products
-- ============================================================
DROP POLICY IF EXISTS "products_select" ON products;
DROP POLICY IF EXISTS "products_write"  ON products;

CREATE POLICY "products_select" ON products
  FOR SELECT USING (company_id = auth_company_id());

CREATE POLICY "products_write" ON products
  FOR ALL USING (
    auth_user_role() IN ('administrator', 'editor')
    AND company_id = auth_company_id()
  );

-- ============================================================
-- POLICIES: stock_entries (imutável - sem update/delete)
-- ============================================================
DROP POLICY IF EXISTS "stock_entries_select" ON stock_entries;
DROP POLICY IF EXISTS "stock_entries_insert" ON stock_entries;

CREATE POLICY "stock_entries_select" ON stock_entries
  FOR SELECT USING (company_id = auth_company_id());

CREATE POLICY "stock_entries_insert" ON stock_entries
  FOR INSERT WITH CHECK (
    auth_user_role() IN ('administrator', 'editor')
    AND company_id = auth_company_id()
  );

-- ============================================================
-- POLICIES: stock_outputs (imutável - sem update/delete)
-- ============================================================
DROP POLICY IF EXISTS "stock_outputs_select" ON stock_outputs;
DROP POLICY IF EXISTS "stock_outputs_insert" ON stock_outputs;

CREATE POLICY "stock_outputs_select" ON stock_outputs
  FOR SELECT USING (company_id = auth_company_id());

CREATE POLICY "stock_outputs_insert" ON stock_outputs
  FOR INSERT WITH CHECK (
    auth_user_role() IN ('administrator', 'editor')
    AND company_id = auth_company_id()
  );

-- ============================================================
-- POLICIES: activity_logs (somente admin lê, trigger insere)
-- ============================================================
DROP POLICY IF EXISTS "activity_logs_select" ON activity_logs;

CREATE POLICY "activity_logs_select" ON activity_logs
  FOR SELECT USING (
    company_id = auth_company_id()
    AND auth_user_role() = 'administrator'
  );

-- ============================================================
-- SEED: Empresa padrão (ESPAZIO)
-- ============================================================
INSERT INTO companies (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'ESPAZIO', 'espazio')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- FIM DA MIGRATION 001
-- ============================================================
