<?php

namespace Tests\Feature\Api;

use App\Modules\Bhr\Repositories\BhrRepositoryInterface;
use App\Modules\User\Models\User;

/**
 * Lightweight BHR stub used by ApiTestCase::setUp() via IoC bind.
 * Prevents live calls to api.bamboohr.com which return 5000+ employees and OOM under Xdebug.
 * Returns exactly one BHR user (42734) so the UPDATE sync path is exercised without INSERT risk.
 */
class evoxtest_BhrMock implements BhrRepositoryInterface
{
    public function get_all_bhr_user_numbers()
    {
        return collect(['42734']);
    }

    public function get_changed_users($start_date)
    {
        return ['42734' => '42734'];
    }

    public function get_user(string $bhr_user_number, $for_sync = false)
    {
        return null;
    }

    public function get_profile_picture(string $bhr_user_number)
    {
        return null;
    }

    public function get_user_bhr_field(string $bhr_user_number, string $user_fields_key = '', $additional_fields = [])
    {
        // Minimal stub so callers that check `if (!$employee)` proceed rather than short-circuit.
        // COEController casts this to array and passes it to the (separately mocked) COERepository;
        // the concrete field values are only needed when the real repository is called.
        return (object)['id' => $bhr_user_number ?: '42734'];
    }

    public function get_user_job_information(string $bhr_user_number, string $field_name)
    {
        return null;
    }

    public function get_report(string $report_id)
    {
        return null;
    }

    public function get_leave_credits(string $bhr_user_number, string $end_date)
    {
        return null;
    }

    public function sync_holidays(string $start_date, string $end_date)
    {
        // no-op — prevents live BHR call during cron/sync tests
    }

    public function get_holidays(string $start_date, string $end_date)
    {
        return [];
    }

    public function get_leaves(string $start_date, string $end_date, User $user = null)
    {
        return [];
    }
}
