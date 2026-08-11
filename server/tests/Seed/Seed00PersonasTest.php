<?php
/**
 * SEED STEP 0 — verify the six seed personas exist before anything else runs.
 *
 * One test per persona so the run output tells the operator exactly which account is
 * missing. Nothing is written here; this step only resolves each E2E_USER_* env var to a
 * live user row. Create the accounts through the normal staging Register User flow (so
 * levels, departments and BHR side-tables are filled the way the app fills them) using
 * tests/Seed/SEED-USERS.csv as the checklist, then put each account's email into .env.
 *
 * Personas:
 *   EMPLOYEE_PHILIPPINES   baseline employee; owns every seeded request; has a direct supervisor
 *   SUPERVISOR_PHILIPPINES Head-level; supervises the employee; performs every approve/decline
 *   ADMIN_PHILIPPINES      admin level + role
 *   HR_PHILIPPINES         HR-level user (HR-restricted announcement visibility tests)
 *   EMPLOYEE_SECOND        second employee, different department, not on any team, own email/mobile
 *   MULTIPUNCH             employee with the Use Multi-Login permission (punch-flow tests) — optional in this wave
 */

namespace Tests\Seed;

class Seed00PersonasTest extends SeedTestCase
{
    /** @test */
    public function employee_philippines_persona_exists_and_is_active()
    {
        $user = $this->requirePersona('EMPLOYEE_PHILIPPINES');
        $this->assertEquals(1, (int) $user->is_active, 'EMPLOYEE_PHILIPPINES exists but is not active.');
    }

    /** @test */
    public function supervisor_philippines_persona_exists_and_is_active()
    {
        $user = $this->requirePersona('SUPERVISOR_PHILIPPINES');
        $this->assertEquals(1, (int) $user->is_active, 'SUPERVISOR_PHILIPPINES exists but is not active.');
    }

    /** @test */
    public function admin_philippines_persona_exists_and_is_active()
    {
        $user = $this->requirePersona('ADMIN_PHILIPPINES');
        $this->assertEquals(1, (int) $user->is_active, 'ADMIN_PHILIPPINES exists but is not active.');
    }

    /** @test */
    public function hr_persona_exists_and_is_active()
    {
        $user = $this->requirePersona('HR_PHILIPPINES');
        $this->assertEquals(1, (int) $user->is_active, 'HR_PHILIPPINES exists but is not active.');
    }

    /** @test */
    public function second_employee_persona_exists_and_is_active()
    {
        $user = $this->requirePersona('EMPLOYEE_SECOND');
        $this->assertEquals(1, (int) $user->is_active, 'EMPLOYEE_SECOND exists but is not active.');
    }

    /** @test */
    public function multipunch_persona_exists_when_configured()
    {
        // Optional in this wave: punch-flow seeding lands in wave 2 once the account exists.
        $user = $this->persona('MULTIPUNCH');
        if (!$user) {
            $this->markTestSkipped(
                'MULTIPUNCH persona not configured yet (optional). Create it with the Use Multi-Login ' .
                'permission and set E2E_USER_MULTIPUNCH in .env to include punch-flow seeding.'
            );
        }
        $this->assertEquals(1, (int) $user->is_active, 'MULTIPUNCH exists but is not active.');
    }
}
