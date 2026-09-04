# EVOX CI/CD — Linux Server Configuration Playbook

**Project:** evox-app-e2e (Jira EVOX-18)
**Audience:** Anyone setting up or re-creating this CI/CD pipeline from scratch on a Linux server, with no prior assumption of GitHub Actions experience.
**Scope:** Self-hosted GitHub Actions runner + automated test + staging deploy, running entirely on the staging Linux server itself.

---

## 1. What you're building — the big picture

Two things run on the same server:

1. A **GitHub Actions self-hosted runner** — a background service that listens for jobs from GitHub and executes them locally.
2. Two GitHub Actions **jobs**, defined in `.github/workflows/ci.yml`, that the runner executes:
   - **`test`** — installs dependencies, runs the full backend (PHPUnit) and frontend (Jest, optionally Playwright) test suites, on every pull request, every push to `master`, and nightly.
   - **`deploy`** — builds the frontend and syncs the backend on the live staging server, but only after `test` passes, only on a push to `master`, and only after a human clicks "approve" on a protected GitHub Environment.

Because the runner lives on the same box it deploys to, "deploy" is just local file operations (`git checkout`, `composer install`, copy a build folder) — no SSH, no separate credentials for that part.

```
Push to master (a merged PR)
        │
        ▼
   test job runs ──fails──► stop, nothing deploys
        │ passes
        ▼
  deploy job starts, then PAUSES
        │
        ▼
  Human reviewer approves in GitHub UI
        │
        ▼
  Build frontend → sync backend (composer) → swap in new frontend build
```

---

## 2. Prerequisites — what the server needs before you start

Confirm each of these on the target server (commands shown are for Ubuntu; adjust for your distro):

| Requirement | Check command | Notes |
|---|---|---|
| A non-root user with `sudo` | `whoami` | This session used `lms-dev`. Registering/running the runner does **not** need sudo; installing it as a service does. |
| PHP 7.4+ | `php -v` | Match whatever version the app actually targets. |
| A coverage driver (optional but recommended) | `php -m \| grep -Ei 'pcov\|xdebug'` | Either works; PCOV is faster. If using Xdebug, set `xdebug.mode=develop,debug,coverage` in `php.ini`. |
| `memory_limit` generous enough for the full suite | `php -i \| grep memory_limit` | `-1` (unlimited) avoids surprises on a large suite. |
| **Composer 1.x** — not 2.x | `composer --version` | **This matters a lot.** Older Laravel apps (5.x) can crash under Composer 2 with a cryptic `PackageManifest.php: Undefined index name` error. If your server only has Composer 2, install a 1.x binary alongside it and point deploy scripts at that one explicitly. |
| Node.js 18.x, via `nvm` | `nvm list` / `node -v` | Install via `nvm`, not just the distro package — you'll likely find an ancient system Node (e.g. v10 or v12) already present from years ago; leave it alone, just make sure the runner's own `PATH` prefers the new one (see §5.4). |
| git | `git --version` | Any recent version. |
| systemd | `systemctl --version` | Used to run the runner as a persistent service. |

---

## 3. Decide your directory layout — read this before you register anything

**Do this differently from how this project initially did it.** Keep two directories **completely separate**:

- **The runner's own working directory** (e.g. `/opt/actions-runner` or `~/actions-runner`) — this is throwaway; GitHub Actions creates a fresh checkout under `_work/` for every single job run and discards it afterward. Nobody should ever manually edit files in here.
- **The persistent deploy target** (e.g. `/var/www/html/<app>`) — this is the actual live application directory the `deploy` job's `git checkout -B master origin/master` operates on. **Nobody should ever manually edit files in this directory either.** Any local, uncommitted change here — even something as small as a stray edit to a config file — will make `git checkout` refuse to run and silently block every future deploy until someone finds and resolves it (see §8, "keep the deploy checkout clean").

If you need a sandbox to poke around, test things by hand, or write throwaway scripts on the server, use a **third, separate directory** that nothing in the pipeline ever touches.

---

## 4. Register the self-hosted runner

1. On GitHub: **repo → Settings → Actions → Runners → New self-hosted runner → Linux x64**. GitHub shows you a `config.sh` command with a one-time registration token baked in.
2. On the server, as the deploy user (no sudo needed for this part):
   ```bash
   mkdir ~/actions-runner && cd ~/actions-runner
   curl -o actions-runner-linux-x64.tar.gz -L <the URL GitHub showed you>
   tar xzf actions-runner-linux-x64.tar.gz
   ./config.sh --url https://github.com/<org>/<repo> --token <the token GitHub showed you>
   ```
3. **When prompted for a runner name, give it a real, descriptive one** (e.g. `evox-staging-linux`). Don't skip the prompt — a runner that falls back to its bare hostname is confusing to identify later, especially once you have more than one runner registered over time.
4. Accept the defaults for work folder and labels unless you have a reason not to.

---

## 5. Install the runner as a systemd service

Running `./run.sh` in a terminal only works as long as that terminal stays open. Install it as a proper service instead:

```bash
cd ~/actions-runner
sudo ./svc.sh install
sudo ./svc.sh start
sudo ./svc.sh status
```

### 5.1 Confirm it's actually listening
`sudo ./svc.sh status` should show it active/running. On GitHub, **repo → Settings → Actions → Runners** should show your runner as "Idle" (green), not offline.

### 5.2 Restarting it
You will need this occasionally — self-hosted runners can silently drop their connection to GitHub after being idle a long time (this project saw it happen more than once; a job would sit `queued` forever with nothing else competing for the runner). The fix is always the same:
```bash
cd ~/actions-runner
sudo ./svc.sh stop
sudo ./svc.sh start
```
There's no harm in doing this proactively if a run has been stuck in `queued` for more than a few minutes with nothing else running.

### 5.3 If you ever need to fully decommission a runner
Don't just stop the service — also remove its registration from GitHub (**Settings → Actions → Runners → click the runner → Remove**), otherwise it lingers in the UI looking like a valid target.

### 5.4 Node version pitfall
The runner service's own environment can end up with a **stale, cached `PATH`** pointing at an old Node version, separate from whatever your interactive shell resolves. If `npm ci` or any Node-based step behaves as if it's using the wrong Node version despite `nvm` looking correct interactively, check:
```bash
cat ~/actions-runner/.path
```
and fix any old version reference there directly (e.g. `sed -i 's|v10.18.1|v18.20.8|g' ~/actions-runner/.path`), then restart the service (§5.2) for it to take effect.

---

## 6. Configure GitHub repository secrets

**Settings → Secrets and variables → Actions → New repository secret.** Add every secret the workflow's `Write server/.env` and `Write client/.env.e2e` steps reference — for this project:

**Backend DB secrets:**
`DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`, `DB_EVOX_LOGS_HOST`, `DB_EVOX_LOGS_PORT`, `DB_EVOX_LOGS_DATABASE`, `DB_EVOX_LOGS_USERNAME`, `DB_EVOX_LOGS_PASSWORD`, `BIO_DB_HOST`, `BIO_DB_PORT`, `BIO_DB_DATABASE`, `BIO_DB_USERNAME`, `BIO_DB_PASSWORD`

**E2E test account secrets:**
`E2E_API_KEY`, `E2E_PASSWORD`, and one `E2E_USER_<ROLE>_<COUNTRY>` secret per test account the E2E suite logs in as (e.g. `E2E_USER_EMPLOYEE_PHILIPPINES`, `E2E_USER_HR_INDIA`, `E2E_USER_PAYROLL_HEAD`, etc.) — check `client/e2e/global-setup.ts`'s `ROLES` array for the exact current list.

Treat every one of these as a real credential: if one is ever accidentally pasted somewhere outside GitHub's own secret store (a chat, a log, a commit), rotate it — don't assume it's fine because "it was only shared once."

---

## 7. Configure branch protection on the default branch

**Settings → Rules → Rulesets** (or the older Settings → Branches → Branch protection rules, depending on your GitHub plan):
- Require pull requests before merging to `master` — no direct pushes.
- Require the `test` status check to pass before merging.
- Optionally require a minimum number of approving reviews.
- Optionally enable **auto-merge** at the repo level (Settings → General → Pull Requests → Allow auto-merge) so an approved PR with a green check merges itself without someone needing to click the merge button.

---

## 8. Configure the deploy approval gate — a GitHub Environment

This is the single most important control in the whole pipeline, and it is **easy to think you've configured when you actually haven't** — GitHub silently auto-creates a bare, unprotected environment the first time a workflow references one that doesn't already exist, with **zero** protection rules. If you only ever set `environment: staging` in the workflow file and never separately visit the Environments settings page, deploys will run completely unattended.

1. **Settings → Environments → New environment**, name it to match exactly what your workflow's `environment:` key says (e.g. `staging`).
2. Check **"Required reviewers"** and add every person who should be able to approve a deploy (they need at least Write access to the repo to be eligible — a common early mistake is adding someone who's only ever had Read access, which silently makes them ineligible without an obvious error).
3. Check **"Prevent self-review"** — this stops a reviewer who is also the one who pushed/approved the code from approving their own deployment. (GitHub *always* refuses to let the literal person who triggered the run approve it, regardless of this setting, but "prevent self-review" is a stricter belt-and-suspenders check worth turning on.)
4. Leave "Deployment branches" unrestricted unless you specifically want to lock deploys to only fire from `master` (the workflow's own `if:` condition, §9, already does this at the job level).
5. **Verify it actually saved**, don't just trust the UI — from a machine with `gh` CLI access:
   ```bash
   gh api repos/<org>/<repo>/environments/<environment-name>
   ```
   Look for a non-empty `"protection_rules"` array containing a `"required_reviewers"` entry with your reviewers listed, and confirm `"can_admins_bypass": false`. An empty `protection_rules: []` means the gate does not exist yet, no matter what the workflow file says.

---

## 9. The workflow file — `.github/workflows/ci.yml`

### 9.1 Triggers
```yaml
on:
  pull_request:
  workflow_dispatch:
  push:
    branches: [master]
  schedule:
    - cron: '0 18 * * *'
```
- `pull_request` — runs `test` on every PR, so reviewers see results before approving.
- `workflow_dispatch` — lets anyone with write access manually trigger a run from the GitHub UI or `gh workflow run`, on any branch/ref, useful for testing changes to the pipeline itself without needing a PR.
- `push: branches: [master]` — the actual deploy trigger. This only fires on a real push to the default branch (i.e., after a PR merges), never on a PR's own commits.
- `schedule` — a nightly full run (adjust the cron expression to your timezone/needs), useful for running expensive things (e.g. full coverage collection, see §10.1) that you don't want slowing down every single PR check.

### 9.2 Concurrency guard
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event_name == 'schedule' && 'nightly' || github.ref }}
  cancel-in-progress: true
```
With only one runner servicing the repo, without this, every new push to a branch queues its own full run behind whatever's already running instead of replacing it — pushes pile up and get worked through one stale run at a time. This cancels a still-running/queued run for the same workflow+ref the moment a newer one exists for it. The nightly scheduled run gets its own ref-independent group so it's never cancelled by, or cancels, unrelated PR activity.

### 9.3 The `test` job — steps, in order
1. **Checkout** — `actions/checkout@v4`.
2. **Install backend dependencies** — `composer install` (plain, since the server's default Composer is already 1.x per §2; if yours isn't, point this explicitly at a 1.x binary).
3. **Write `server/.env`** — copies `.env.example`, generates an app key, strips out the placeholder DB_* lines from the example file, then appends the real values from secrets.
   - **Gotcha:** if `.env.example` doesn't end in a newline, blindly appending with `cat >> .env` glues your first new line onto the example file's last existing line. Always `printf '\n' >> .env` immediately before the `cat >>` block.
4. **Install frontend dependencies** — `npm ci --legacy-peer-deps` (the `--legacy-peer-deps` flag is there because of pre-existing peer-dependency conflicts in an older dependency tree; drop it if/when the dependency tree is modernized) and `npx playwright install chromium` (installs the browser binary; only needed if Playwright is actually enabled, see §10.2).
5. **Write `client/.env.e2e`** — same idea as step 3, for the frontend's E2E test config and account credentials.
6. **Run full suite** — a single step that calls `bash scripts/run-all-tests.sh`, which internally runs PHPUnit, then (optionally) Playwright, then Jest, and produces a JUnit XML + coverage output. See §10 for exactly how this orchestrator script decides what blocks vs. what's just reported.
7. **Publish PHPUnit results** — `dorny/test-reporter@v1`, reads the JUnit XML and renders results as a GitHub check annotation. Runs `if: always()` so it still reports even if the suite failed.
8. **Upload coverage & reports** — `actions/upload-artifact@v4`, uploads the whole `coverage/` directory (HTML reports, JUnit XML, logs) as a downloadable build artifact. Also `if: always()`.

### 9.4 The `deploy` job — steps, in order
```yaml
deploy:
  needs: test
  if: ${{ (github.event_name == 'push' && github.ref == 'refs/heads/master') || github.event_name == 'workflow_dispatch' }}
  environment: staging
```
- `needs: test` means a run where `test` fails or is cancelled can **never** reach `deploy` — GitHub enforces this natively, no extra logic needed.
- The `if:` condition is what makes deploy fire only on a real push to `master`, or a manual dispatch (useful for re-running just the deploy side without a new commit).
- `environment: staging` ties this job to the environment gate configured in §8 — the job pauses here, before any step runs, until a required reviewer approves.

Steps once approved:
1. **Checkout** — a fresh throwaway workspace (not the persistent deploy directory).
2. **Build frontend (static assets)** — `npm ci --legacy-peer-deps && npm run build`, in that throwaway workspace, so a build never touches the live directory's files until the explicit swap step below. Two environment variables matter a lot here and are easy to miss if you're setting this up fresh:
   - `NODE_OPTIONS=--openssl-legacy-provider` — needed if your frontend still uses an older webpack (bundled inside an older `react-scripts`, for example) on Node 17+; without it the build crashes with `error:0308010C:digital envelope routines::unsupported` (OpenSSL 3 removed the hash algorithm the old webpack expects by default).
   - `CI=false` — **GitHub Actions sets `CI=true` on every job by default**, including self-hosted runners. Create-react-app-based builds (`react-scripts build`) treat *every* ESLint warning as a fatal build error under `CI=true`. Any codebase with pre-existing lint warnings (nearly all of them, over time) will fail here unless you explicitly override it back to `false` for this step. This does not hide the warnings — they still print — it just stops them from failing the build, matching what a normal local `npm run build` does.
3. **Deploy backend (sync + composer install)** — in the persistent deploy directory: `git fetch origin master`, `git checkout -B master origin/master`, then a Composer version guard (refuses to proceed with a clear error if Composer isn't 1.x, rather than letting a cryptic crash happen later), then `composer install --no-dev --optimize-autoloader`.
   - **This step will refuse to run if the persistent deploy directory has any uncommitted local changes** — see §3's warning about keeping it clean. If it ever does, `git status` in that directory to see what's dirty, decide with whoever's responsible for the server whether those changes are meaningful work that needs rescuing or just leftover debris, then `git reset --hard origin/master` to clear tracked-file drift once you're sure (this does not touch untracked files, so it's safe to run without also deleting the runner's own install directory or other untracked content sitting alongside).
4. **Deploy frontend (swap in new static build)** — copies the fresh build to a `build_new` folder alongside the live `build/`, then does an atomic-ish move: old `build/` → `build_previous`, new `build_new` → `build`. `build_previous` doubles as a cheap one-deploy-deep manual rollback point if something goes visibly wrong right after a deploy.

Deliberately **not** done by this job, by design — keep these as separate, manual, deliberate actions:
- `php artisan migrate` — migrations here are often hand-picked per release; running them blindly on every deploy risks conflicting with manual DB changes.
- Restarting PHP-FPM / Nginx / queue workers — not normally needed after this kind of deploy.
- Touching `.env` on the server — stays manually managed.

---

## 10. The test orchestrator — `scripts/run-all-tests.sh`

This script is what step 9.3.6 actually calls. It runs three suites in sequence and decides, independently for each, whether a failure should actually block the pipeline (`FAILED_SUITES`, causes the script — and therefore the `test` job — to exit 1) or just be reported (`NON_BLOCKING_ISSUES`, printed in the summary, does not fail anything).

### 10.1 PHPUnit — critical-path gating, not all-or-nothing
Requiring literally every backend test to pass before every single deploy isn't realistic long-term for a large, long-lived suite — but silently ignoring failures isn't acceptable either, and a flat pass-rate percentage threshold (e.g. "85% must pass") can't tell a business-critical bug apart from a cosmetic one; it would let either through equally easily. Instead:
- **`server/phpunit-critical.xml`** is a second, small PHPUnit config listing only the tests that cover payroll calculations, attendance/DTR writes, and authentication/authorization — the paths where wrong output has real financial, legal, or security consequences.
- The full suite always runs first, for complete visibility and (optionally) coverage.
- The critical subset is then re-run on its own.
- **Only a failure in that critical subset adds to `FAILED_SUITES`** (blocks deploy). A failure anywhere else in the full suite is logged as a non-blocking issue — visible, expected to get fixed, but not gating.
- Adding a test to the critical list is a deliberate, reviewed edit to `phpunit-critical.xml` — never automatic, never a number that can silently drift.

**Coverage collection is opt-in, not automatic.** Passing `--coverage-*` flags to PHPUnit (via Xdebug or PCOV instrumentation) is expensive at scale — on a large suite it can be slow enough to actually crash the runner (an out-of-memory kill mid-run, observed directly on this project's Linux runner). The script only turns coverage on when `COLLECT_COVERAGE=true` is set as a step-level environment variable — the workflow sets this to `true` only for the nightly `schedule` event, `false` otherwise. Regular PR/push runs skip coverage entirely and stay fast and memory-safe; the nightly run is the one place full coverage gets collected, when there's no one waiting on it and no risk of blocking a deploy.

### 10.2 Playwright — disabled by default
Real end-to-end browser tests (logging in as every configured role/geo account against the live staging site, then walking through UI flows) are valuable but slow — they were, at one point, the single largest chunk of CI wall time on this project, dwarfing the backend suite and the frontend unit tests combined. The script skips this step entirely unless `RUN_PLAYWRIGHT=true` is set (as a step-level env var in the workflow, or in your own shell for a manual run) — nothing about the step is deleted, it's just gated off by default. Turn it back on for a specific run (or permanently, by flipping the workflow's default) whenever real E2E coverage is actually needed for that change.

### 10.3 Jest — always runs, but never blocks deploy on its own
There's no frontend equivalent of `phpunit-critical.xml` yet, so — as a deliberate, current policy decision, not an oversight — **every** Jest failure is treated as non-blocking: reported in the summary, but the script does not exit non-zero because of it. This was decided after observing a Jest failure that reproduced only on the CI runner and never locally across repeated full-suite runs — indistinguishable, in the moment, from an environment/worker-parallelism flake rather than a real regression, and there was no reason to hold up an otherwise-ready deploy on something unreproducible. If a proper frontend "critical path" concept is ever built (mirroring §10.1's PHPUnit approach), tighten this back up then.

---

## 11. Verifying the whole thing end-to-end

Once everything above is in place, prove it actually works before trusting it:

1. **Trigger a `test`-only run:** open any PR, or use `workflow_dispatch` on a branch. Confirm the runner picks it up (repo → Actions tab shows it moving through steps), and that it actually finishes (not just starts).
2. **Confirm the deploy gate exists for real**, not just in the workflow file — re-run the `gh api` check from §8 step 5 right before you rely on it for anything real.
3. **Merge something small to `master`** (or use `workflow_dispatch` with the ref set to `master`) and confirm:
   - `deploy` actually appears and shows `waiting`/paused, not `skipped` and not already running unattended.
   - The right person can approve it, and the wrong person (whoever triggered it) genuinely cannot.
   - Every deploy step after approval actually completes — don't stop checking at "the job started," confirm the final conclusion of every step, especially the ones that touch the real server.
4. Only after you've watched one real, successful, fully-approved deploy complete end-to-end should you consider the pipeline actually configured, not just theoretically configured.

---

## 12. Quick troubleshooting reference

| Symptom | Likely cause | Fix |
|---|---|---|
| A job sits `queued` for a long time with nothing else running | Runner service silently disconnected | §5.2 — stop/start the service |
| `npm ci` / `npm run build` uses the wrong Node version | Runner service's cached `PATH` | §5.4 — fix `~/actions-runner/.path`, restart service |
| Composer install crashes with `PackageManifest.php: Undefined index name` | Composer 2 running against an older Laravel app | Point the deploy/test steps at a Composer 1.x binary explicitly |
| Frontend build crashes: `error:0308010C:digital envelope routines::unsupported` | OpenSSL 3 (Node 17+) vs. an old webpack | `NODE_OPTIONS=--openssl-legacy-provider` on the build step |
| Frontend build fails with `Failed to compile` / lists only ESLint warnings, no real errors | `CI=true` (GitHub Actions' default) makes CRA treat warnings as fatal | `CI=false` on the build step specifically |
| `.env` values look glued onto the wrong line | Missing trailing newline before appending | `printf '\n' >> .env` before the `cat >>` block |
| Deploy's `git checkout -B master origin/master` refuses, citing local changes | Someone edited tracked files directly in the persistent deploy directory | §9.4 step 3 — investigate before discarding, then `git reset --hard origin/master` |
| Deploy runs with no approval pause at all | The environment's protection rules were never actually saved (GitHub auto-creates it bare) | §8 step 5 — verify via `gh api`, not just the workflow file |
| A re-run of just the failed job doesn't ask for approval again | *(Expected the other way round)* — actually, re-runs **do** require a fresh approval each time, they don't remember a prior one | Just approve it again; this is normal |
