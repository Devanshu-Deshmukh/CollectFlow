# CollectFlow

CollectFlow is a receivables-management workspace for small Indian B2B service businesses. It tracks invoices, payments and follow-ups in one place so a business can see what it is owed, which invoices are overdue, and which follow-ups are past their due date.

The product helps you understand the current position and decide what to chase next. It does not claim that customers will pay faster.

## Features

Core:

- User registration and JWT-based authentication
- Business profile with currency, billing email, phone and address
- Customer management
- Invoice creation with line items, quantities and rates
- Payment recording with part payments and automatic balance updates
- Invoice status that is calculated, not typed: pending, partially paid, overdue and paid
- Receivables dashboard: outstanding, overdue, due in the next 7 days, collected this month
- Invoice ageing report in not-yet-due, 1-30, 31-60, 61-90 and 90+ day buckets
- Follow-up history per invoice

Operational:

- Scheduled payment reminders with a daily Spring scheduling job
- Configurable reminder templates with placeholders
- Email notifications through SMTP (disabled by default; reminders are still logged)
- Follow-up tasks with assignee and due date
- Customer payment history
- CSV import and export for customers and invoices
- Overdue invoice report
- Expected collections report

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite, React Router, Tailwind CSS 4, plain JavaScript (`.js` / `.jsx`) |
| Backend | Java 21, Spring Boot 4, Spring MVC |
| Security | Spring Security, JWT (jjwt) |
| Persistence | Spring Data JPA / Hibernate, MySQL 8 |
| Migrations | Flyway |
| Validation | Jakarta Bean Validation |
| Scheduling | Spring `@Scheduled` |
| Email | Spring Mail (SMTP) |
| Tests | JUnit 5, Mockito, MockMvc, H2 in memory (test scope only) |
| Linting | oxlint |

## Architecture

The repository holds the Spring Boot API at the root and the React client in `frontend/`. They are separate builds that talk over a REST API; during development Vite proxies `/api` to `http://localhost:8080`.

Request flow:

```
Browser (React + Tailwind)
        |  fetch /api/*  (JWT in Authorization header)
        v
Vite dev server  --proxy-->  Spring Boot :8080
                                  |
                                  v
                        JwtAuthFilter -> CurrentUser (user + business)
                                  |
                                  v
                        Controller -> Service -> Repository
                                  |
                                  v
                                MySQL 8  (schema owned by Flyway)
```

Backend packages under `src/main/java/com/collectflow`:

| Package | Responsibility |
| --- | --- |
| `domain` | JPA entities and enums (invoices, payments, reminders, follow-ups) |
| `repo` | Spring Data repositories and aggregate queries |
| `service` | Business logic: auth, invoices, payments, reminders, follow-ups, reports, CSV, dashboard |
| `web` | REST controllers, request/response DTOs, global exception handling |
| `web.dto` | Validated request records and response payloads |
| `security` | JWT issuing and parsing, the authentication filter, current-user resolution |
| `config` | Security rules, application properties, demo data seeder |

Business rules worth knowing:

- Invoice status is derived from the outstanding balance and the due date (`InvoiceStatusService`), so recording a payment recalculates the invoice.
- Recording a payment that settles an invoice cancels its scheduled reminders.
- Reminder jobs run on a cron (`0 0 8 * * *` by default) and can also be triggered manually from the UI.
- Every query is scoped to the signed-in user's business; a user only sees their own data.

## Data model

Flyway migration `src/main/resources/db/migration/V1__initial_schema.sql` creates the schema. Hibernate runs in `validate` mode, so entities and tables must agree.

| Table | Purpose | Key columns |
| --- | --- | --- |
| `users` | Accounts | id, name, email, password_hash |
| `businesses` | Business profile | id, name, currency, email, phone, address |
| `business_memberships` | Users linked to businesses | user_id, business_id, role |
| `customers` | Customers of a business | id, business_id, name, email, phone, company |
| `invoices` | Invoices issued | id, business_id, customer_id, invoice_number, issue_date, due_date, total_amount, amount_paid, status |
| `invoice_lines` | Invoice line items | id, invoice_id, description, quantity, unit_price, amount |
| `payments` | Payments recorded | id, invoice_id, amount, payment_date, method, reference |
| `reminder_templates` | Reusable reminder messages | id, business_id, name, trigger_type, offset_days, subject, body |
| `reminders` | Reminder queue and history | id, invoice_id, scheduled_at, sent_at, status, subject, body |
| `follow_ups` | Collection activity and tasks | id, invoice_id, activity_type, notes, assigned_to, due_date, status |

## API overview

All endpoints are JSON and require `Authorization: Bearer <token>` except register and login.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Create a user, business and membership |
| POST | `/api/auth/login` | Exchange credentials for a JWT |
| GET | `/api/auth/me` | Current user, business and role |
| GET / PUT | `/api/business` | Read or update the business profile |
| GET | `/api/business/members` | Team members |
| GET / POST | `/api/customers` | List or create customers |
| GET / PUT / DELETE | `/api/customers/{id}` | Read, update or remove a customer |
| GET / POST | `/api/invoices` | List (filtered) or create invoices |
| GET | `/api/invoices/next-number` | Suggest the next invoice number |
| GET | `/api/invoices/{id}` | Invoice with lines, payments and history |
| GET / POST | `/api/invoices/{id}/payments` | Payments for an invoice |
| GET | `/api/payments/recent` | Recent payments |
| GET | `/api/invoices/{id}/reminders` | Reminders for an invoice |
| POST | `/api/invoices/{id}/reminders` | Schedule a reminder |
| GET | `/api/reminders` | Reminder queue and history |
| POST | `/api/reminders/process` | Run the pending reminder queue now |
| GET / POST | `/api/reminder-templates` | List or create templates |
| PUT / DELETE | `/api/reminder-templates/{id}` | Update or delete a template |
| GET / POST | `/api/invoices/{id}/follow-ups` | Follow-up history for an invoice |
| GET | `/api/follow-ups` | Follow-up tasks across invoices |
| PATCH | `/api/follow-ups/{id}` | Update status, notes or due date |
| GET | `/api/dashboard` | Dashboard aggregates |
| GET | `/api/reports/ageing` | Invoice ageing buckets |
| GET | `/api/reports/overdue` | Overdue invoices |
| GET | `/api/reports/expected-collections` | Expected collections by week |
| GET | `/api/export/customers.csv` | Export customers |
| GET | `/api/export/invoices.csv` | Export invoices |
| POST | `/api/import/customers` | Import customers from CSV |
| POST | `/api/import/invoices` | Import invoices from CSV |

## Running the project

Requirements: JDK 21, Node.js 20 or newer, MySQL 8. The Maven wrapper is included, so no Maven install is needed.

1. Create the database once:

```sql
CREATE DATABASE collectflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Provide the database credentials. Either set environment variables:

```bash
export DB_USERNAME=root
export DB_PASSWORD=your-password
```

or create `application-local.yml` in the project root (git-ignored) with:

```yaml
spring:
  datasource:
    username: root
    password: your-password
```

3. Start the backend. Flyway applies the migration on first run and the demo workspace is seeded:

```bash
./mvnw spring-boot:run
```

The API is on `http://localhost:8080` and the H2/MySQL schema is validated at startup.

4. Start the frontend in another terminal:

```bash
cd frontend
npm install
npm run dev
```

The app is on `http://127.0.0.1:5173` and proxies `/api` to the backend.

5. Sign in with the seeded demo account:

```
demo@collectflow.app / demo12345
```

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_NAME` | `localhost`, `3306`, `collectflow` | Database location |
| `DB_USERNAME`, `DB_PASSWORD` | `root`, empty | Database credentials |
| `JWT_SECRET` | development key | JWT signing key, change outside local use |
| `JWT_TTL_HOURS` | `168` | Token lifetime |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Allowed browser origins |
| `MAIL_HOST`, `MAIL_PORT` | `localhost`, `1025` | SMTP server |
| `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM` | empty | SMTP credentials and sender |
| `EMAIL_ENABLED` | `false` | Send reminder emails instead of only logging them |
| `REMINDER_CRON` | `0 0 8 * * *` | Daily reminder job schedule |
| `SEED_DEMO_DATA` | `true` | Create the demo workspace on first start |

## Tests and checks

```bash
./mvnw test                 # 24 JUnit 5 tests, runs on in-memory H2
cd frontend && npm run lint # oxlint
cd frontend && npm run build
```

Backend tests cover invoice creation and status transitions, payment recording, reminder scheduling and template rendering, plus an HTTP-level integration test for the auth, customer and invoice endpoints. They run against H2 in MySQL compatibility mode, so your local MySQL data is never touched.

## Project structure

```
CollectFlow/
  src/main/java/com/collectflow/     Spring Boot application
    config/  domain/  repo/  security/  service/  web/
  src/main/resources/
    application.yml                  configuration and env defaults
    db/migration/V1__initial_schema.sql
  src/test/java/com/collectflow/     unit and API tests
  frontend/
    src/pages/                       dashboard, invoices, customers, reminders, tasks, reports, settings
    src/pages/LandingPage.jsx        public cover page
    src/components/                  layout, shared UI, logo
    src/lib/                         API client, hooks, formatters
    src/auth/                        session and auth context
  pom.xml  mvnw
```

## Notes and limitations

- Email sending is off by default: reminders are recorded and marked as logged until SMTP is configured and `EMAIL_ENABLED=true`.
- The frontend stores the JWT in `localStorage`, which suits local and demo use. A production deployment should consider httpOnly cookies.
- Registration creates one business per account; multi-business membership is modelled in the database but not exposed in the UI yet.
- Amounts are stored as `DECIMAL(14,2)` and displayed in Indian numbering (for example `5,15,500.00`).
