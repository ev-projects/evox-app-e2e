# Branch-test generation SPEC (read before generating)

## ⚠ FRAMEWORK VERSIONS — assert only APIs that exist in these (verified from composer.json)
- **Laravel 5.7.28** · **PHPUnit ^7.0** · **PHP ^7.1.3** · **Mockery ^1.0**
- **BANNED (newer than 5.7 / 7.x — cause errors):** `assertJsonPath`, `assertJsonMissingPath` (L6+); `assertOk/assertCreated/assertNoContent/assertUnprocessable/assertForbidden/assertUnauthorized/assertNotFound` (L7+); `str_contains/str_starts_with/str_ends_with` and other PHP8 fns; PHPUnit 8/9 methods (`assertMatchesRegularExpression`, `createStub`, `expectExceptionMessageMatches`); arrow `fn()` (PHP7.4 — the box is 7.1+, avoid); typed properties.
- **USE INSTEAD:** `assertStatus(200)`, `assertJson([...])`, `assertJsonStructure([...])`, `assertJsonFragment([...])` (all exist in 5.7); `assertStringContainsString` is OK (PHPUnit 7.5).
- FormRequest note: `withoutMiddleware()` does NOT bypass FormRequest validation; and a `rules(SomeFormRequest $r)` signature **cascade-validates** that injected request's whole ruleset — build payloads to satisfy ALL required fields of the cascade.


You generate PHPUnit **branch tests** for ONE EVOX controller, against the **LATEST code** only.
AUTHORED but must be written to PASS when run. Do NOT run anything, do NOT touch staging, do NOT deploy.

## Source of truth — LATEST code (use ONLY this, never the old evox-app/)
- Backend root: `D:\Projects\EVOX-AI-Delivery\coverage-max\latest-code\server\app`
- Routes: `D:\Projects\EVOX-AI-Delivery\coverage-max\latest-code\server\routes\api.php` (top-level controllers)
  and `...\app\Modules\<Module>\Routes\api.php` (module controllers). Grep for `<Controller>@` to get exact URIs/verbs (mount under `/api`).
- Pattern reference (mocking style only — code is stale, do NOT copy assertions): `...scratchpad\branch-tests-stale-bak\` has examples.

## What to produce — one test per BRANCH
For EVERY public method, enumerate every `if / elseif / else / try-catch / ternary` arm and write **one test per branch outcome**, INCLUDING the exception/`catch` arm. Read the REAL method body — do not guess. Assert the ACTUAL status code from the code (`success_response`=200 `{message,content}`; `error_response` default=400 `{error:{message,content}}` but MANY methods pass `HTTP_NOT_FOUND`=404 or other codes — verify each `error_response(...)` call).

## Naming = menu -> page -> action -> branch  (MANDATORY)
- **Folder:** `D:\Projects\EVOX-AI-Delivery\coverage-max\branch-tests\<Menu>\<Page>\`
- **File per action-type:** `<action>.<Page>BranchTest.php` where **action ∈ {load, filter, submit, approve, export, delete}**
  - `load` = GET list/index/get_*/show/holidays/notifications/attendance (page loads / reads)
  - `filter` = GET with filter/search/by-* params
  - `submit` = POST store/create/update (form submit)
  - `approve` = approve/decline/pending/cancel (approval actions) — one file `approve.<Page>BranchTest.php` covering all four
  - `export` = export/download/csv
  - `delete` = destroy/delete
- **Class:** `<Page><Action>BranchTest` (e.g. `OvertimeSubmitBranchTest`).
- **Namespace:** `Tests\Feature\BranchTests\<Menu>\<Page>` (deploys to `server/tests/Feature/BranchTests/<Menu>/<Page>/`).
- **Method name:** `<method>__<action>__<condition>__<expected>()` e.g. `approve__approve__already_approved__rejected()`, `store__submit__exception__error_400()`.

## Hard safety rules (non-negotiable)
- `class X extends Tests\TestCase` + `use Illuminate\Foundation\Testing\DatabaseTransactions;` (NEVER RefreshDatabase).
- `Mail::fake()` + `Queue::fake()` in setUp; `withoutMiddleware()`; `actingAs($user)` where a user is needed.
- **IoC-mock every constructor-injected dependency** via `$this->app->instance(Interface::class, Mockery::mock(...))`. Exception arm: mocked method `->andThrow(new \Exception('boom'))`.
- **NEVER** author a branch that reaches `call_sp(...)`, a real BHR/external/FreshService/HTTP call, `truncate()`, or a destructive `delete()/update()/save()` on real data. SKIP it with `// SKIPPED-SP` / `// SKIPPED-EXTERNAL` / `// SKIPPED-DESTRUCTIVE` and cover only arms that return BEFORE such calls.
- **NEVER scan all records in a table** — scope every query to a fixture (`->first()`, a specific id). No unbounded `->get()`/`->all()` on real tables.
- Fixture user: `App\Modules\User\Models\User::where('is_active',1)->first()`.
- If a controller has **no constructor deps** (uses DB/Eloquent facades directly), cover read-only arms + force the `catch` via `DB::shouldReceive(...)->andThrow(...)`; skip write arms as `// SKIPPED-DESTRUCTIVE`.
- Every method's `catch` gets an exception test **unless** the catch is unreachable (e.g. missing `use Exception;` makes it dead — note `// FINDING:` and skip).

## File docblock (every file)
`PHASE 3 v2 (latest code) - AUTHORED. Branch tests for <Controller>::<action> arms. Menu=<Menu> Page=<Page>.`
List any SKIPPED arms + `// FINDING:` bugs at the top.

Reply with ONLY: files written (paths) + total test methods + SKIPPED/FINDING counts.
