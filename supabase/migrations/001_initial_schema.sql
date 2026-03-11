-- Migration: 001_initial_schema
-- Created: 2026-03-09
-- Description: Initial schema for BrainSpot Dashboard
--   Tables: clients, employees, projects, time_logs, revenues, expenses

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- CLIENTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE clients (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text        NOT NULL,
  contact_person text,
  email          text,
  phone          text,
  status         text        NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active', 'inactive')),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_clients_status ON clients (status);

-- ─────────────────────────────────────────────────────────────
-- EMPLOYEES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE employees (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name  text        NOT NULL,
  position   text,
  department text,
  start_date date,
  status     text        NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_employees_status     ON employees (status);
CREATE INDEX idx_employees_department ON employees (department);

-- ─────────────────────────────────────────────────────────────
-- PROJECTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE projects (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid        NOT NULL REFERENCES clients (id) ON DELETE RESTRICT,
  name        text        NOT NULL,
  description text,
  start_date  date,
  end_date    date,
  status      text        NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_client_id ON projects (client_id);
CREATE INDEX idx_projects_status    ON projects (status);

-- ─────────────────────────────────────────────────────────────
-- TIME LOGS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE time_logs (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid          NOT NULL REFERENCES employees (id) ON DELETE RESTRICT,
  project_id  uuid          NOT NULL REFERENCES projects  (id) ON DELETE RESTRICT,
  date        date          NOT NULL,
  hours       numeric(5, 2) NOT NULL CHECK (hours > 0),
  description text,
  created_at  timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX idx_time_logs_employee_id ON time_logs (employee_id);
CREATE INDEX idx_time_logs_project_id  ON time_logs (project_id);
CREATE INDEX idx_time_logs_date        ON time_logs (date);

-- ─────────────────────────────────────────────────────────────
-- REVENUES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE revenues (
  id          uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid           NOT NULL REFERENCES clients  (id) ON DELETE RESTRICT,
  project_id  uuid                    REFERENCES projects (id) ON DELETE SET NULL,
  amount      numeric(12, 2) NOT NULL CHECK (amount > 0),
  currency    text           NOT NULL DEFAULT 'BGN',
  received_at date           NOT NULL,
  notes       text,
  created_at  timestamptz    NOT NULL DEFAULT now()
);

CREATE INDEX idx_revenues_client_id   ON revenues (client_id);
CREATE INDEX idx_revenues_project_id  ON revenues (project_id);
CREATE INDEX idx_revenues_received_at ON revenues (received_at);

-- ─────────────────────────────────────────────────────────────
-- EXPENSES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE expenses (
  id         uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  category   text           NOT NULL,
  amount     numeric(12, 2) NOT NULL CHECK (amount > 0),
  currency   text           NOT NULL DEFAULT 'BGN',
  paid_at    date           NOT NULL,
  project_id uuid                    REFERENCES projects (id) ON DELETE SET NULL,
  notes      text,
  created_at timestamptz    NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_project_id ON expenses (project_id);
CREATE INDEX idx_expenses_category   ON expenses (category);
CREATE INDEX idx_expenses_paid_at    ON expenses (paid_at);
