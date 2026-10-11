# School ERP — Version 1 architecture

Source: School ERP Technical Architecture (React + Node.js + PostgreSQL) v0.1.

## Stack in this repo

| Layer | Choice | Version 1 note |
|---|---|---|
| Language | TypeScript | Shared Zod schemas in `packages/shared` |
| API | NestJS modular monolith | One process, modules for auth, setup, students, admissions, attendance, fees, academics, notices, certificates, timetable |
| Web | React 18 + Vite | Staff and parent use one app; navigation depends on role |
| Database | PostgreSQL + Prisma | Tables use the architecture prefixes (`set_`, `sis_`, `att_`, `fee_`, `plt_`, `adm_`, `aca_`, `com_`, `cer_`, `tt_`) |
| Auth | JWT in an httpOnly cookie | Password login. Parent OTP and staff MFA come later |
| Jobs, Redis, object storage | Not in version 1 | The architecture allows Postgres-only queues later (`pg-boss`) |

## Layout

```
apps/api        NestJS API, prefix /v1
apps/web        React app
packages/shared Zod schemas
docs            This scope and the architecture notes
```

## Tenancy

Every table has `tenant_id`. Campus data also has `campus_id`. Fee invoices carry `legal_entity_id` because the requirements say receipts belong to the legal entity.

Version 1 enforces scope in the API services (admin: campus, teacher: own class, parent: linked children). PostgreSQL row-level security from the architecture document is the next hardening step, once the app connects as a non-owner database role. A table owner bypasses those policies, so turning them on against the migrate role would not protect anything yet.

## Module boundaries

- `setup` owns campuses, years, grades, sections.
- `students` owns student, guardian, and enrolment rows.
- `attendance` writes only attendance rows.
- `fees` writes invoices and append-only payments.
- `admissions` writes enquiry rows, and calls students and fees when an offer is enrolled.
- `academics` writes exams, subjects, and marks. A published exam is locked.
- `notices` writes notice rows. A teacher or parent reads only school-wide notices and notices for their own grades.
- `certificates` writes bonafide certificate rows. The wording is stored when it is issued. A parent reads only a linked child’s certificate.
- `timetable` writes period rows for a section. A teacher or parent reads only their own class.
- Cross-module reads go through the other module’s exported service helpers in `common/scope.ts` for version 1 (student visibility). They do not write another module’s tables.

## Local run

PostgreSQL on the machine (Homebrew). No Docker is required. See the root `README.md`.
