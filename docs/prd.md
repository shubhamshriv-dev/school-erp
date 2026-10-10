# School ERP — Version 1 scope

Source: School ERP Initial Requirements (PRD + BRD) v0.1, 11 October 2026.

The full requirements describe a multi-campus product (modules A–R). Version 1 is the first slice a team can open and use. It follows the document’s own priority tags and build order, and it stops before admissions workflow, gradebook, transport, HR, and integrations.

## In this version

| Requirements area | What works now |
|---|---|
| Q. Users and roles | Admin, Teacher, Parent. Each role sees only its own scope. |
| A. Setup | One group, one legal entity, one campus, one academic year, grades and sections. |
| C. Students | Directory, profile, guardians, current enrolment. One student identity. |
| F. Attendance | Daily register: Present, Absent, Late, Early leave, Leave. Teacher marks their own class. |
| D. Fees | One tuition plan per grade, invoices, counter payment (cash, UPI, bank transfer), receipt number, running balance. |
| I. Parent view | Parent sees linked children, attendance, and fees. |
| P. Dashboard | Counts for strength, today’s register, and fees still due. |

## Rules carried from the requirements

- Hierarchy is Group → Legal entity → Campus → Academic year → Grade → Section.
- A medium school is the same model with one campus.
- Parents see only children linked to them.
- Teachers mark only the section where they are class teacher.
- Payments are new rows. The invoice amount is never edited.
- Deleting a student is not part of this version.

## Explicitly later

Admissions funnel, exams and report cards, certificates, timetable, transport, staff and payroll, visitors, library, payment gateway, SMS, and a separate phone app. The parent and teacher screens in this version are the web portal those apps will grow from.
