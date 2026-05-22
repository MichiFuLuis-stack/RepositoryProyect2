-- ============================================
-- DocPlant 🌱 - Datos de Prueba (Seeds)
-- ============================================
-- Estos datos se insertan para pruebas en desarrollo
-- Las contraseñas hasheadas se generan en tiempo de ejecución

-- ============================================
-- Clientes de prueba
-- ============================================

-- Cliente Free (contraseña: user123)
INSERT OR IGNORE INTO clients (name, email, password_hash, membership, is_active)
VALUES (
    'María García',
    'maria@example.com',
    '$2a$10$placeholder_free_user_hash',
    'free',
    1
);

-- Cliente Premium (contraseña: premium123)
INSERT OR IGNORE INTO clients (name, email, password_hash, membership, is_active)
VALUES (
    'Carlos López',
    'carlos@example.com',
    '$2a$10$placeholder_premium_user_hash',
    'premium',
    1
);

-- Cliente Admin adicional (contraseña: superadmin123)
INSERT OR IGNORE INTO clients (name, email, password_hash, membership, is_active)
VALUES (
    'Ana Martínez',
    'ana.admin@docplant.com',
    '$2a$10$placeholder_admin_hash',
    'admin',
    1
);

-- ============================================
-- Sesiones de prueba
-- ============================================
INSERT OR IGNORE INTO sessions (session_token, client_id, ip_address, uploads_count, expires_at)
VALUES (
    'test-session-free-001',
    (SELECT id FROM clients WHERE email = 'maria@example.com'),
    '127.0.0.1',
    2,
    datetime('now', '+24 hours')
);

INSERT OR IGNORE INTO sessions (session_token, client_id, ip_address, uploads_count, expires_at)
VALUES (
    'test-session-premium-001',
    (SELECT id FROM clients WHERE email = 'carlos@example.com'),
    '127.0.0.1',
    0,
    datetime('now', '+24 hours')
);

-- ============================================
-- Archivos de prueba (simulados, no existen en disco)
-- ============================================
INSERT OR IGNORE INTO uploaded_files (client_id, session_id, original_name, stored_name, file_type, mime_type, file_size, file_path)
VALUES (
    (SELECT id FROM clients WHERE email = 'maria@example.com'),
    'test-session-free-001',
    'plantilla_carta.docx',
    'seed-template-001.docx',
    'template',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    25600,
    'uploads/seed-template-001.docx'
);

INSERT OR IGNORE INTO uploaded_files (client_id, session_id, original_name, stored_name, file_type, mime_type, file_size, file_path)
VALUES (
    (SELECT id FROM clients WHERE email = 'maria@example.com'),
    'test-session-free-001',
    'datos_carta.txt',
    'seed-content-001.txt',
    'content',
    'text/plain',
    1024,
    'uploads/seed-content-001.txt'
);

INSERT OR IGNORE INTO uploaded_files (client_id, session_id, original_name, stored_name, file_type, mime_type, file_size, file_path)
VALUES (
    (SELECT id FROM clients WHERE email = 'carlos@example.com'),
    'test-session-premium-001',
    'template_informe.docx',
    'seed-template-002.docx',
    'template',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    51200,
    'uploads/seed-template-002.docx'
);

-- ============================================
-- Factura de prueba
-- ============================================
INSERT OR IGNORE INTO invoices (client_id, invoice_number, paypal_order_id, paypal_payer_email, amount, currency, payment_status, membership_type, period_start, period_end)
VALUES (
    (SELECT id FROM clients WHERE email = 'carlos@example.com'),
    'DP-2024-000001',
    'PAYPAL-SANDBOX-ORDER-001',
    'carlos@example.com',
    9.99,
    'USD',
    'completed',
    'premium',
    datetime('now'),
    datetime('now', '+30 days')
);
