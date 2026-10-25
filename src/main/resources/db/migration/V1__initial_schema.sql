-- CollectFlow initial schema
-- Written to run on MySQL 8+ and on H2 in MySQL compatibility mode (local development).

CREATE TABLE users (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(190) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_users_email UNIQUE (email)
);

CREATE TABLE businesses (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(160) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    email VARCHAR(190),
    phone VARCHAR(40),
    address VARCHAR(500),
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE business_memberships (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    business_id BIGINT NOT NULL,
    role VARCHAR(20) NOT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_membership_user_business UNIQUE (user_id, business_id),
    CONSTRAINT fk_membership_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_membership_business FOREIGN KEY (business_id) REFERENCES businesses (id)
);

CREATE TABLE customers (
    id BIGINT NOT NULL AUTO_INCREMENT,
    business_id BIGINT NOT NULL,
    name VARCHAR(160) NOT NULL,
    email VARCHAR(190),
    phone VARCHAR(40),
    company VARCHAR(160),
    notes VARCHAR(1000),
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_customer_business FOREIGN KEY (business_id) REFERENCES businesses (id)
);
CREATE INDEX idx_customer_business ON customers (business_id);

CREATE TABLE invoices (
    id BIGINT NOT NULL AUTO_INCREMENT,
    business_id BIGINT NOT NULL,
    customer_id BIGINT NOT NULL,
    invoice_number VARCHAR(40) NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(24) NOT NULL,
    notes VARCHAR(1000),
    total_amount DECIMAL(14, 2) NOT NULL,
    amount_paid DECIMAL(14, 2) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_invoice_business_number UNIQUE (business_id, invoice_number),
    CONSTRAINT fk_invoice_business FOREIGN KEY (business_id) REFERENCES businesses (id),
    CONSTRAINT fk_invoice_customer FOREIGN KEY (customer_id) REFERENCES customers (id)
);
CREATE INDEX idx_invoice_business_due ON invoices (business_id, due_date);
CREATE INDEX idx_invoice_customer ON invoices (customer_id);
CREATE INDEX idx_invoice_status ON invoices (business_id, status);

CREATE TABLE invoice_lines (
    id BIGINT NOT NULL AUTO_INCREMENT,
    invoice_id BIGINT NOT NULL,
    description VARCHAR(300) NOT NULL,
    quantity DECIMAL(12, 2) NOT NULL,
    unit_price DECIMAL(14, 2) NOT NULL,
    amount DECIMAL(14, 2) NOT NULL,
    line_order INT NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_line_invoice FOREIGN KEY (invoice_id) REFERENCES invoices (id)
);
CREATE INDEX idx_line_invoice ON invoice_lines (invoice_id);

CREATE TABLE payments (
    id BIGINT NOT NULL AUTO_INCREMENT,
    invoice_id BIGINT NOT NULL,
    amount DECIMAL(14, 2) NOT NULL,
    payment_date DATE NOT NULL,
    method VARCHAR(32),
    reference VARCHAR(120),
    notes VARCHAR(500),
    created_by BIGINT,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_payment_invoice FOREIGN KEY (invoice_id) REFERENCES invoices (id),
    CONSTRAINT fk_payment_user FOREIGN KEY (created_by) REFERENCES users (id)
);
CREATE INDEX idx_payment_invoice ON payments (invoice_id);
CREATE INDEX idx_payment_date ON payments (payment_date);

CREATE TABLE reminder_templates (
    id BIGINT NOT NULL AUTO_INCREMENT,
    business_id BIGINT NOT NULL,
    name VARCHAR(120) NOT NULL,
    trigger_type VARCHAR(20) NOT NULL,
    offset_days INT NOT NULL,
    subject VARCHAR(250) NOT NULL,
    body TEXT NOT NULL,
    active BOOLEAN NOT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_template_business FOREIGN KEY (business_id) REFERENCES businesses (id)
);

CREATE TABLE reminders (
    id BIGINT NOT NULL AUTO_INCREMENT,
    invoice_id BIGINT NOT NULL,
    template_id BIGINT,
    scheduled_at DATETIME NOT NULL,
    sent_at DATETIME,
    status VARCHAR(20) NOT NULL,
    recipient_email VARCHAR(190),
    subject VARCHAR(250) NOT NULL,
    body TEXT NOT NULL,
    note VARCHAR(500),
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_reminder_invoice FOREIGN KEY (invoice_id) REFERENCES invoices (id),
    CONSTRAINT fk_reminder_template FOREIGN KEY (template_id) REFERENCES reminder_templates (id)
);
CREATE INDEX idx_reminder_due ON reminders (status, scheduled_at);

CREATE TABLE follow_ups (
    id BIGINT NOT NULL AUTO_INCREMENT,
    invoice_id BIGINT NOT NULL,
    activity_type VARCHAR(20) NOT NULL,
    notes VARCHAR(2000) NOT NULL,
    created_by BIGINT,
    assigned_to BIGINT,
    due_date DATE,
    status VARCHAR(20) NOT NULL,
    created_at DATETIME NOT NULL,
    completed_at DATETIME,
    PRIMARY KEY (id),
    CONSTRAINT fk_followup_invoice FOREIGN KEY (invoice_id) REFERENCES invoices (id),
    CONSTRAINT fk_followup_created_by FOREIGN KEY (created_by) REFERENCES users (id),
    CONSTRAINT fk_followup_assigned_to FOREIGN KEY (assigned_to) REFERENCES users (id)
);
CREATE INDEX idx_followup_invoice ON follow_ups (invoice_id);
CREATE INDEX idx_followup_status ON follow_ups (status, due_date);
