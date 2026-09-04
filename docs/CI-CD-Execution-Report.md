# EVOX-18 — CI/CD Execution Report

**Project:** evox-app-e2e
**Prepared for:** Project management review
**Subject:** Automated testing and staging deployment pipeline — configuration summary and team process

---

## 1. Executive summary

The evox-app-e2e project now has a fully automated pipeline that:
- Runs the complete backend and frontend test suite on every code change, before it can be merged.
- Automatically deploys approved changes to the staging server, with a mandatory human approval step before anything touches the live server.
- Enforces that no one can approve their own deployment.
- Produces a visible, reviewable test result on every pull request, so reviewers see pass/fail status before approving.

As of this report, the pipeline has completed a full, real, end-to-end run: a code change was merged, tests ran and passed automatically, a reviewer approved the deployment, and the change went live on staging — with every step verified, not assumed.

---

## 2. How the pipeline is built

### 2.1 Where it runs
A dedicated server (the staging server itself) runs a background service that listens for work from GitHub and executes it. This means testing and deployment both happen on infrastructure the team already controls, with no third-party build service involved.

### 2.2 What happens automatically, and when

| Trigger | What runs | Purpose |
|---|---|---|
| A pull request is opened or updated | Full test suite | Lets a reviewer see test results before deciding to approve |
| A pull request is merged into `master` | Full test suite, then deployment (pending approval) | The actual release path |
| Every night | Full test suite, including a full test-coverage report | Coverage measurement doesn't need to slow down every-day work; it runs once daily instead |
| Manually, on demand | Either job, on any branch | For checking something without needing a pull request |

### 2.3 The deployment safety gate
Deployment to the staging server is never automatic-and-unattended. After tests pass, the deployment step **pauses** and waits for a specifically designated reviewer to click "approve" in GitHub. This is enforced by GitHub itself, not by a script that could be bypassed:
- Only people on an explicit, named reviewer list can approve a deployment.
- **The person who merged the change can never approve their own deployment** — GitHub enforces this natively.
- Even repository administrators cannot bypass this gate.

### 2.4 What "passing tests" actually means for deployment
Rather than requiring every single test in a very large suite to pass before every deployment — which becomes impractical to sustain as a test suite grows into the thousands — the pipeline distinguishes between:
- **Business-critical paths:** payroll calculations, attendance/DTR record-keeping, and login/authorization. A failure here **blocks deployment**, full stop.
- **Everything else:** still run, still reported, still expected to get fixed — but a failure here does not, on its own, prevent an otherwise-ready change from reaching staging.

This distinction is a deliberate, reviewed configuration (a specific list of which tests count as business-critical), not an automatic percentage or a guess — and it can be revisited and tightened as the team's confidence and tooling mature.

---

## 3. Roles and responsibilities

### 3.1 Developer
1. Create a branch, make the change, push it to GitHub.
2. Open a pull request against `master`.
3. The test suite runs automatically — wait for the result before requesting review, and fix anything the pipeline flags as business-critical before expecting it to be mergeable.
4. Request review from a teammate.
5. Once approved and green, the change merges (automatically, if auto-merge is enabled, or by clicking merge) — **the developer's job ends here**; deployment is a separate, later step handled by different people.

### 3.2 Reviewer
1. Review the pull request's code changes as usual.
2. Check the automated test result attached to the pull request before approving — a red/failing check on a business-critical test is a reason to hold approval; a non-critical failure is a judgment call, same as any other code review comment.
3. Approve the pull request. If auto-merge is on, this is the action that actually merges the change and sets deployment in motion.
4. **Note:** approving the *pull request* (a code review decision) and approving the *deployment* (§3.3) are two separate actions on two separate screens, even though the same person is often eligible to do both — just not for the same change they themselves merged.

### 3.3 Deployment approver
1. Once a merged change's tests pass, GitHub shows a pending deployment waiting for approval.
2. The deployment approver reviews that the change is actually intended to go to staging now (not, for example, mid-way through a larger multi-PR feature that isn't ready yet).
3. Clicks "approve" — deployment proceeds automatically from that point (build, sync, go-live on staging).
4. **A deployment approver cannot be the same person who merged that specific change** — this is enforced by GitHub, not left to trust.
5. Currently eligible deployment approvers are a named, fixed list of people with write access to the repository — not "anyone who happens to have access."

### 3.4 Pipeline/infrastructure maintainer
A smaller, ongoing responsibility, distinct from day-to-day development:
- Keeps the server's background listener service running (it can occasionally need a restart if it goes idle for a long stretch).
- Owns the list of who's on the deployment-approver list, and keeps repository secrets (database credentials, test account credentials) current and rotated if ever exposed.
- Is the point of contact if the pipeline itself needs a configuration change (e.g. tightening what counts as "business-critical," changing which tests block deployment).

---

## 4. Current status

- The pipeline is live and operating on the `master` branch.
- A complete, real deployment — code merge → automated tests → human approval → live on staging — has been verified end-to-end, with every step's actual outcome confirmed rather than assumed.
- The deployment approval gate has been confirmed to be genuinely configured and enforced (not merely present in a configuration file but never actually applied).

---

## 5. What this report intentionally does not cover

This report describes the pipeline's design, roles, and current operating status for a project-management audience. It does not walk through the individual technical issues that came up while building it or how each was diagnosed and resolved — that history exists separately as engineering record, not as part of this summary.
