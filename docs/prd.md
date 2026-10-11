# School ERP — Version 1 scope

Source: School ERP Initial Requirements (PRD + BRD) v0.1, 11 October 2026.

The full requirements describe a multi-campus product (modules A–R). The demo slice a team can open covers setup through the weekly timetable. It stops before transport, HR, and integrations.

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
| B. Admissions | Enquiry, offer, and enrolment into a section with a seat. Enrolment creates the student, guardian, and tuition invoice. |
| E. Academics | One exam per term, subjects per grade, class marks, and a report card with total and percentage. Parents see a card after it is published. |
| G. Community | Admin posts a notice for the whole school or one grade. Teachers and parents see notices for their own classes, plus school-wide notices. |
| H. Certificates | Admin issues a bonafide certificate. It records the child’s name, admission number, grade, purpose, and issue date. A parent opens only a linked child’s certificate. |
| J. Timetable | Admin sets Monday-to-Friday periods for a section. Each period has a subject and a time. The class teacher and a parent open only their own class. |

## Rules carried from the requirements

- Hierarchy is Group → Legal entity → Campus → Academic year → Grade → Section.
- A medium school is the same model with one campus.
- Parents see only children linked to them.
- Teachers mark attendance and exam marks only for the section where they are class teacher.
- Payments are new rows. The invoice amount is never edited.
- Deleting a student is not part of this version.

## Explicitly later

Transport, staff and payroll, visitors, library, payment gateway, SMS, and a separate phone app. The parent and teacher screens in this version are the web portal those apps will grow from.
