# School ERP — version 1

A first working slice of the school ERP, built the way the architecture document describes and limited to the requirements that belong in this version.

Version 1 includes:

- Login for Admin, Teacher, and Parent
- One campus, academic year, grades, and sections
- Student directory, guardians, and enrolment
- Daily attendance for the class teacher
- Tuition invoices and counter payments (cash, UPI, bank transfer)

Admissions, exams, transport, payroll, and a payment gateway are later modules.

## Run it locally

PostgreSQL must be running (Homebrew is enough; Docker is not required).

```bash
brew services start postgresql@17
createdb school_erp
pnpm install
pnpm db:setup
pnpm dev
```

Open http://localhost:5173

| Role | Email | Password |
|---|---|---|
| Admin | anita.deshpande@riverside.edu | Admin@123 |
| Teacher | priya.natarajan@riverside.edu | Teacher@123 |
| Parent | meera.shah@riverside.edu | Parent@123 |

The API is http://localhost:3001/v1. The web app calls it through the Vite dev server.

## Live site

The public site is one Node service. It serves the website and the API together, and it uses the free Render Postgres database named in `render.yaml`. The first visit after a quiet period can take about a minute while the free server wakes up. The free database expires 30 days after it is created.

Copy `apps/api/.env.example` to `apps/api/.env` if you clone this on another machine, and replace `YOUR_MAC_USERNAME` with the user `psql` prints. Do not commit real secrets.

## Where the documents live

- `docs/prd.md` — what version 1 includes, taken from the requirements document
- `docs/architecture.md` — how this repo is structured, taken from the architecture document
