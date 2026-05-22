-- ============================================
-- DocPlant 🌱 - Esquema de Base de Datos
-- ============================================
-- Motor: SQLite3 (better-sqlite3)
-- Descripción: Esquema completo con tablas, índices, triggers y datos iniciales

-- Habilitar claves foráneas
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- ============================================
-- Tabla: clients (Clientes/Usuarios)
-- ============================================
CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    membership TEXT NOT NULL DEFAULT 'free' CHECK(membership IN ('free', 'premium', 'admin')),
    daily_uploads_used INTEGER NOT NULL DEFAULT 0,
    last_upload_reset TEXT DEFAULT (datetime('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1))
);

-- ============================================
-- Tabla: sessions (Sesiones activas)
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_token TEXT NOT NULL UNIQUE,
    client_id INTEGER,
    ip_address TEXT,
    uploads_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
);

-- ============================================
-- Tabla: uploaded_files (Archivos subidos)
-- ============================================
CREATE TABLE IF NOT EXISTS uploaded_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,
    session_id TEXT,
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK(file_type IN ('template', 'content')),
    mime_type TEXT NOT NULL,
    file_size INTEGER NOT NULL DEFAULT 0,
    file_path TEXT NOT NULL,
    uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
    is_processed INTEGER NOT NULL DEFAULT 0 CHECK(is_processed IN (0, 1)),
    is_deleted INTEGER NOT NULL DEFAULT 0 CHECK(is_deleted IN (0, 1)),
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
);

-- ============================================
-- Tabla: generated_files (Archivos generados)
-- ============================================
CREATE TABLE IF NOT EXISTS generated_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,
    session_id TEXT,
    template_file_id INTEGER,
    content_file_id INTEGER,
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL,
    format TEXT NOT NULL DEFAULT 'docx' CHECK(format IN ('docx', 'pdf')),
    file_size INTEGER NOT NULL DEFAULT 0,
    file_path TEXT NOT NULL,
    generated_at TEXT NOT NULL DEFAULT (datetime('now')),
    is_downloaded INTEGER NOT NULL DEFAULT 0 CHECK(is_downloaded IN (0, 1)),
    is_deleted INTEGER NOT NULL DEFAULT 0 CHECK(is_deleted IN (0, 1)),
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
    FOREIGN KEY (template_file_id) REFERENCES uploaded_files(id) ON DELETE SET NULL,
    FOREIGN KEY (content_file_id) REFERENCES uploaded_files(id) ON DELETE SET NULL
);

-- ============================================
-- Tabla: invoices (Facturas/Pagos)
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    invoice_number TEXT NOT NULL UNIQUE,
    paypal_order_id TEXT,
    paypal_payer_email TEXT,
    amount REAL NOT NULL DEFAULT 0.00,
    currency TEXT NOT NULL DEFAULT 'USD',
    payment_method TEXT NOT NULL DEFAULT 'paypal',
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK(payment_status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
    membership_type TEXT NOT NULL DEFAULT 'premium',
    period_start TEXT,
    period_end TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- ============================================
-- Índices para optimización de consultas
-- ============================================

-- Índices para clients
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_membership ON clients(membership);
CREATE INDEX IF NOT EXISTS idx_clients_is_active ON clients(is_active);

-- Índices para sessions
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_client_id ON sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON sessions(is_active);

-- Índices para uploaded_files
CREATE INDEX IF NOT EXISTS idx_uploaded_files_client_id ON uploaded_files(client_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_session_id ON uploaded_files(session_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_file_type ON uploaded_files(file_type);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_is_deleted ON uploaded_files(is_deleted);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_uploaded_at ON uploaded_files(uploaded_at);

-- Índices para generated_files
CREATE INDEX IF NOT EXISTS idx_generated_files_client_id ON generated_files(client_id);
CREATE INDEX IF NOT EXISTS idx_generated_files_session_id ON generated_files(session_id);
CREATE INDEX IF NOT EXISTS idx_generated_files_is_deleted ON generated_files(is_deleted);
CREATE INDEX IF NOT EXISTS idx_generated_files_generated_at ON generated_files(generated_at);

-- Índices para invoices
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_paypal_order_id ON invoices(paypal_order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_status ON invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);

-- ============================================
-- Triggers para auto-actualización de timestamps
-- ============================================

-- Trigger: actualizar updated_at en clients al modificar
CREATE TRIGGER IF NOT EXISTS trg_clients_updated_at
AFTER UPDATE ON clients
FOR EACH ROW
BEGIN
    UPDATE clients SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- ============================================
-- Datos iniciales: Usuario administrador
-- ============================================
-- Contraseña: admin123 (hash generado con bcryptjs, rounds=10)
-- El hash real se genera en tiempo de ejecución por la aplicación
-- Este INSERT se usa como fallback; la app genera el admin al iniciar
INSERT OR IGNORE INTO clients (name, email, password_hash, membership, is_active)
VALUES (
    'Administrador DocPlant',
    'admin@docplant.com',
    '$2a$10$placeholder_hash_replaced_at_runtime',
    'admin',
    1
);
