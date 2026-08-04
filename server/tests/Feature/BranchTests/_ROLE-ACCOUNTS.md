# EVOX Role Accounts — the 15 test users (single source for all role-based tests)

Password for ALL: `{ev2010}`. Resolve in PHPUnit by `User::where('email', ...)->first()` (skip test if absent).
Same accounts the existing E2E `e2e/roles/` suite uses — keep backend + API + Playwright consistent with these.

| Key                 | Role / Geo            | email |
|---------------------|-----------------------|-------|
| ph_employee         | PH Employee           | glenn.macasarte@eastvantage.com |
| ph_supervisor       | PH Supervisor         | gary.aure@eastvantage.com |
| admin               | Admin                 | dummyman@ops.eastvantage.com |
| hr_head             | HR Head               | atea.ortiz@eastvantage.com |
| ph_hr               | PH HR                 | alvini.cruz@eastvantage.com |
| india_hr            | India HR              | toiba.qureshi@eastvantage.com |
| morocco_hr          | Morocco HR            | khaoula.laaraibi@eastvantage.com |
| payroll_head        | Payroll Head          | testPayroll@eastvantage.com |
| ph_payroll          | PH Payroll            | susan.calderon@eastvantage.com |
| india_payroll       | India Payroll         | niveditha.sathyanarayana@eastvantage.com |
| morocco_payroll     | Morocco Payroll       | testPayrollMAR@eastvantage.com |
| india_employee      | India Employee        | komal.prasad@unq.eastvantage.com |
| india_supervisor    | India Supervisor      | nidhi.shrivastava@unq.eastvantage.com |
| morocco_employee    | Morocco Employee      | mariam.elmakrini@unit-t.eastvantage.com |
| morocco_supervisor  | Morocco Supervisor    | hajar.alaoui@eastvantage.com |

**Known supervisor→employee links** (from earlier: PH): gary.aure (supervisor) → glenn.macasarte (his supervisee). Use for self-approval / is_under_supervisee tests. India: nidhi→komal. Morocco: hajar→mariam.

## Role-matrix intent (per permission-gated endpoint)
- **self** (the employee acting on their OWN request) → expect reject / self-approval blocked
- **own supervisor** (e.g. gary for glenn) → expect ALLOW
- **other supervisor** (a supervisor NOT over that employee) → expect reject (`is_under_supervisee=false`)
- **admin** → expect allow (or documented current reality if the gate is missing = A27 finding)
- **hr / payroll / heads** → per the endpoint's actual gate
