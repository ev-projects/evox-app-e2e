<?php

namespace Tests\Feature\Api;

use App\Modules\Bhr\Repositories\BhrRepositoryInterface;
use App\Modules\User\Models\User;
use Illuminate\Support\Collection;

/**
 * Minimal genuine BHR stub for E2E cron tests.
 *
 * Bind into IoC per-test:
 *   $this->app->bind(BhrRepositoryInterface::class, fn() => new evoxtest_BhrMock());
 *
 * Design principles:
 *   - Field names match real BHR API schema (BHR_USER_SYNC_FIELDS constant).
 *   - BHR number 42734 maps to a real existing EVOX user → sync_users/initial_sync_of_users
 *     take the UPDATE path (find user by bhr_num, update fields) — no INSERT, no constraint risk.
 *   - supervisorEId 41143 is also a real BHR number in the DB so apply_user_supervisor_pivot
 *     can resolve the supervisor relationship.
 *   - Leaves return empty — valid scenario (no approved leaves in the sync period).
 *   - DatabaseTransactions rolls back any updates from the test run.
 */
class evoxtest_BhrMock implements BhrRepositoryInterface
{
    /**
     * One real BHR employee number. This ID exists in the EVOX users table
     * (bhr_num=42734, user id=10) so initial_sync_of_users takes the "user
     * already exists" branch (no new INSERT).
     *
     * @return Collection
     */
    public function get_all_bhr_user_numbers(): Collection
    {
        return collect(['42734']);
    }

    /**
     * One recently-changed BHR employee number (same user as above).
     * sync_users calls show_via_bhr_number('42734') → finds user id=10 → UPDATE path.
     *
     * @return array
     */
    public function get_changed_users($start_date): array
    {
        return ['42734' => '42734'];
    }

    /**
     * Returns a minimal but schema-valid BHR employee object.
     *
     * Fields match BHR_USER_SYNC_FIELDS from config/constants.php:
     *   employeeNumber, firstName, middleName, lastName, department,
     *   bestEmail, dateOfBirth, nickname, status, hireDate, jobTitle,
     *   mobilePhone, terminationDate, employmentHistoryStatus,
     *   supervisorEId, country, lastChanged, division, couttry (sic — BHR typo kept)
     *
     * Values mirror the real EVOX user for bhr_num=42734 (Gianpaoulo Acesor)
     * so update_bhr_user_to_evox() writes no-op changes (same email, same emp_num).
     *
     * supervisorEId=41143 is also a real BHR number in the DB so the supervisor
     * pivot relationship resolves without creating phantom users.
     */
    public function get_user(string $bhr_user_number, $for_sync = false)
    {
        return (object)[
            'id'                      => '42734',
            'employeeNumber'          => '2222',
            'firstName'               => 'Gianpaoulo',
            'middleName'              => '',
            'lastName'                => 'Acesor',
            'nickname'                => 'GP',
            'bestEmail'               => 'gianpaoulo.acesor@pactgroup.com',
            'department'              => 'Technology',
            'status'                  => 'Active',
            'employmentHistoryStatus' => 'Active',
            'hireDate'                => '2020-01-01',
            'jobTitle'                => 'Software Engineer',
            'mobilePhone'             => '+639000000000',
            'country'                 => 'Philippines',
            'dateOfBirth'             => '1990-01-01',
            'terminationDate'         => '0000-00-00',
            'supervisorEId'           => '41143',
            'lastChanged'             => '2026-01-01T00:00:00+00:00',
            'division'                => 'East Vantage',
            'couttry'                 => 'Philippines',
        ];
    }

    public function get_profile_picture(string $bhr_user_number)
    {
        return null;
    }

    public function get_user_bhr_field(string $bhr_user_number, string $user_fields_key = '', $additional_fields = [])
    {
        return [];
    }

    public function get_user_job_information(string $bhr_user_number, string $field_name)
    {
        return null;
    }

    public function get_report(string $report_id)
    {
        return [];
    }

    public function get_leave_credits(string $bhr_user_number, string $end_date)
    {
        return [];
    }

    /**
     * No-op: The controller calls this, then immediately calls
     * dtr->bind_holidays_to_dtr() against the real DB.
     * The mock's job is to prevent BHR HTTP calls — DB binding still runs.
     */
    public function sync_holidays(string $start_date, string $end_date)
    {
        // intentional no-op
    }

    public function get_holidays(string $start_date, string $end_date): array
    {
        return [];
    }

    /**
     * Returns one genuine approved leave sourced from the EVOX leaves table.
     *
     * Source record (queried 2026-07-12, no leaves existed for last Friday 2026-07-10):
     *   leaves.id=17031870, dtr_id=27685041, date=2026-06-16 (Monday)
     *   user_id=1593, bhr_num=43284, emp_num=2772, name=Glenn Macasarte
     *   type=Vacation Leave, status=approved, amount=1.0
     *
     * Field names match the BHR time_off/requests API response schema consumed by
     * DtrRepository::bind_leaves_to_dtr():
     *   $row->employeeId  → show_via_bhr_number() lookup
     *   $row->start/end   → DTR date range query (dtr_id=27685041 exists for 2026-06-16)
     *   $row->dates->{date} → hours (8.0 = full day → normalized to amount=1)
     *   $row->type->name, $row->status->status, $row->notes->*
     *
     * DatabaseTransactions rolls back the InsertOrUpdateLeaves SP call after the test.
     *
     * @return array
     */
    public function get_leaves(string $start_date, string $end_date, User $user = null): array
    {
        $dates = new \stdClass();
        $dates->{'2026-06-16'} = 8.0;

        return [
            (object)[
                'id'         => 'E2E_BHR_LEAVE_001',
                'employeeId' => '43284',
                'start'      => '2026-06-16',
                'end'        => '2026-06-16',
                'status'     => (object)[
                    'status'              => 'approved',
                    'lastChangedByUserId' => null,
                ],
                'type'       => (object)['name' => 'Vacation Leave'],
                'notes'      => (object)[
                    'employee' => 'Employee note',
                    'manager'  => 'Manager note',
                ],
                'dates'      => $dates,
                'amount'     => (object)['amount' => 1.0],
            ],
        ];
    }
}
