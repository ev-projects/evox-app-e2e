<?php

namespace Tests\Feature\BranchTests\Unit\Resources;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Carbon\Carbon;
use App\Modules\User\Models\User;
use App\Modules\User\Resources\DpaUserListResource;
use App\Modules\User\Resources\DpaUserListResourceCollection;
use App\Modules\User\Resources\UserListBasicResource;
use App\Modules\User\Resources\UserListResourceCollection;
use App\Modules\Department\Models\EvoxSubDepartment;

/**
 * The four zero-coverage User resources — each is a single toArray(), so covering it completes
 * the whole class rather than part of one.
 *
 *   DpaUserListResource            0/1  →  the DPA employee list (Admin → DPA List)
 *   UserListBasicResource          0/1  →  the trimmed user list used by pickers and lookups
 *   DpaUserListResourceCollection  0/1  →  paginated wrapper for the above
 *   UserListResourceCollection     0/1  →  paginated wrapper for the full user list
 *
 * SHAPE: resources are pure transformations, so they are driven by UNSAVED in-memory User models —
 * no DB writes anywhere. The one exception is the sub-department lookup inside DpaUserListResource,
 * which issues a bounded read (`where Id = ?` → first()); that path uses a real probed row and skips
 * when the table is empty. DatabaseTransactions is on regardless so nothing can escape.
 *
 * FINDINGS CHARACTERIZED HERE (asserted as CURRENT behaviour, app NOT modified)
 *   DPA-SUBDEPT-1  DpaUserListResource dereferences ->first()->Name with no null guard. A user whose
 *                  SubDepartmentID points at a row that no longer exists takes the whole DPA list
 *                  down with "property on null" rather than showing that one row blank.
 *   RESCOLL-PAGE-1 Both collections call $this->total()/perPage()/currentPage()/lastPage(), which
 *                  exist only on a LengthAwarePaginator. Handed a plain Collection — which is what
 *                  every non-paginated repository method returns — they fatal on an undefined method.
 */
class UserListResourcesTest extends TestCase
{
    use DatabaseTransactions;

    /** An unsaved User carrying just the fields these resources read. */
    private function makeUser(array $overrides = []): User
    {
        $u = new User();
        foreach (array_merge([
            'id'             => 4242,
            'emp_num'        => 'E-4242',
            'first_name'     => 'Ana',
            'middle_name'    => 'Reyes',
            'last_name'      => 'Cruz',
            'is_active'      => 1,
            'job_title'      => 'Delivery Analyst',
            'email'          => 'ana.cruz@example.test',
            'dpa_ticked_at'  => null,
            'SubDepartmentID' => null,
        ], $overrides) as $k => $v) {
            $u->{$k} = $v;
        }
        return $u;
    }

    // ───────────────────────────────── UserListBasicResource

    /** @test */
    public function the_basic_user_list_maps_every_field_the_picker_needs()
    {
        $out = (new UserListBasicResource($this->makeUser()))->toArray(request());

        $this->assertSame(4242, $out['id']);
        $this->assertSame('E-4242', $out['emp_num']);
        $this->assertSame('Ana', $out['first_name']);
        $this->assertSame('Reyes', $out['middle_name']);
        $this->assertSame('Cruz', $out['last_name']);
        $this->assertSame(1, $out['is_active']);
        $this->assertSame('Delivery Analyst', $out['job_title']);
        $this->assertSame('ana.cruz@example.test', $out['email']);
        // getFullName(1) folds the middle name in only when it is present
        $this->assertSame('Ana Reyes Cruz', $out['full_name']);
    }

    /** @test */
    public function a_user_with_no_middle_name_produces_a_full_name_without_a_double_space()
    {
        $out = (new UserListBasicResource($this->makeUser(['middle_name' => null])))->toArray(request());

        $this->assertSame('Ana Cruz', $out['full_name']);
        $this->assertNull($out['middle_name']);
    }

    /** @test */
    public function the_department_is_null_when_the_user_has_no_department_relation()
    {
        // `department` is unset on an in-memory model, so is_valid() sees null and the guard holds.
        $out = (new UserListBasicResource($this->makeUser()))->toArray(request());

        $this->assertNull($out['department'], 'a user with no department must not break the list');
        $this->assertArrayHasKey('department', $out, 'the key is always present, only its value varies');
    }

    /** @test */
    public function the_department_name_is_flattened_out_of_the_relation_when_one_exists()
    {
        $user = $this->makeUser();
        // setRelation is how Eloquent exposes a loaded relation; the resource reads ->department->department_name
        $user->setRelation('department', (object) ['department_name' => 'Delivery']);

        $out = (new UserListBasicResource($user))->toArray(request());

        $this->assertSame('Delivery', $out['department']);
    }

    // ───────────────────────────────── DpaUserListResource

    /** @test */
    public function the_dpa_list_reports_never_ticked_users_as_not_applicable()
    {
        $out = (new DpaUserListResource($this->makeUser(['dpa_ticked_at' => null])))->toArray(request());

        $this->assertSame('N/A', $out['dpa_ticked_at'],
            'a user who has never accepted the DPA shows N/A, not null and not an empty string');
        $this->assertSame(4242, $out['id']);
        $this->assertSame('Ana Reyes Cruz', $out['full_name']);
        $this->assertNull($out['department'], 'no sub-department id means no lookup and a null column');
    }

    /** @test */
    public function a_ticked_dpa_timestamp_is_normalised_to_a_full_datetime_string()
    {
        $out = (new DpaUserListResource($this->makeUser([
            'dpa_ticked_at' => '2026-07-16 09:30:00',
        ])))->toArray(request());

        $this->assertSame('2026-07-16 09:30:00', $out['dpa_ticked_at']);
    }

    /** @test */
    public function a_date_only_dpa_timestamp_is_padded_out_to_midnight()
    {
        // Carbon::parse widens a bare date; the column is rendered to the second either way, so the
        // frontend never has to cope with two shapes.
        $out = (new DpaUserListResource($this->makeUser(['dpa_ticked_at' => '2026-07-16'])))->toArray(request());

        $this->assertSame('2026-07-16 00:00:00', $out['dpa_ticked_at']);
    }

    /** @test */
    public function the_sub_department_name_is_resolved_for_a_user_who_has_one()
    {
        $sub = EvoxSubDepartment::orderBy('Id', 'desc')->first();
        if (!$sub) $this->markTestSkipped('no EVOX_SUB_DEPARTMENT row to resolve against');

        $out = (new DpaUserListResource($this->makeUser(['SubDepartmentID' => $sub->Id])))->toArray(request());

        $this->assertSame($sub->Name, $out['department'],
            'the DPA list shows the sub-department NAME, not its id');
    }

    /**
     * FINDING DPA-SUBDEPT-1 — CHARACTERIZATION, DO NOT "FIX" THIS TEST.
     *
     * The resource does:
     *     EvoxSubDepartment::where("Id", $this->SubDepartmentID)->first()->Name
     * with no null check. is_valid() only proves the id is non-empty — not that the row still exists.
     * A user pointing at a deleted sub-department therefore takes the ENTIRE DPA list down with
     * "Attempt to read property on null", rather than rendering that one row with a blank column.
     *
     * When a null guard is added this test starts failing — that is the signal. Flip it to assert a
     * null department and it becomes the regression guard.
     *
     * @test
     */
    public function a_user_pointing_at_a_deleted_sub_department_takes_the_whole_list_down_FINDING_DPA_SUBDEPT_1()
    {
        $orphanId = ((int) (EvoxSubDepartment::max('Id') ?? 0)) + 999999;

        $this->expectException(\Throwable::class);

        (new DpaUserListResource($this->makeUser(['SubDepartmentID' => $orphanId])))->toArray(request());
    }

    // ───────────────────────────────── the two collections

    /** Build a real paginator so total()/perPage()/currentPage()/lastPage() resolve. */
    private function paginator(array $items, int $perPage = 2, int $page = 1, int $total = null)
    {
        return new LengthAwarePaginator(
            new Collection($items), $total ?? count($items), $perPage, $page
        );
    }

    /** @test */
    public function the_user_list_collection_wraps_rows_with_a_full_pagination_block()
    {
        $paged = $this->paginator([$this->makeUser(), $this->makeUser(['id' => 4243])], 2, 1, 7);

        $out = (new UserListResourceCollection($paged))->toArray(request());

        $this->assertArrayHasKey('data', $out);
        $this->assertCount(2, $out['data'], 'data carries this page only');
        $this->assertSame([
            'total'        => 7,
            'count'        => 2,
            'per_page'     => 2,
            'current_page' => 1,
            'last_page'    => 4,      // ceil(7 / 2)
        ], $out['pagination'], 'the frontend pager reads every one of these five keys');
    }

    /** @test */
    public function the_dpa_collection_reports_the_same_pagination_contract()
    {
        $paged = $this->paginator([$this->makeUser()], 5, 2, 11);

        $out = (new DpaUserListResourceCollection($paged))->toArray(request());

        $this->assertSame(11, $out['pagination']['total']);
        $this->assertSame(1, $out['pagination']['count'], 'count is rows on THIS page, not the total');
        $this->assertSame(5, $out['pagination']['per_page']);
        $this->assertSame(2, $out['pagination']['current_page']);
        $this->assertSame(3, $out['pagination']['last_page']);
    }

    /** @test */
    public function an_empty_page_still_returns_the_pagination_block_rather_than_nothing()
    {
        $out = (new UserListResourceCollection($this->paginator([], 10, 1, 0)))->toArray(request());

        $this->assertSame([], $out['data']->all(), 'no rows is a valid page, not an error');
        $this->assertSame(0, $out['pagination']['total']);
        $this->assertSame(1, $out['pagination']['last_page'], 'an empty result still has one page');
    }

    /**
     * FINDING RESCOLL-PAGE-1 — CHARACTERIZATION, DO NOT "FIX" THIS TEST.
     *
     * Both collections call $this->total(), perPage(), currentPage() and lastPage(). Those exist on
     * a LengthAwarePaginator and NOT on a plain Collection — which is what every non-paginated
     * repository method in this codebase returns. Wrapping an unpaginated result therefore fatals
     * with an undefined-method error instead of returning the rows with an empty pagination block.
     *
     * It matters because the two are interchangeable everywhere else in Laravel, so the mistake is
     * easy to make and the failure is a 500, not a degraded response.
     *
     * @test
     */
    public function wrapping_an_unpaginated_collection_fatals_instead_of_degrading_FINDING_RESCOLL_PAGE_1()
    {
        $plain = new Collection([$this->makeUser()]);

        $this->expectException(\Throwable::class);

        (new UserListResourceCollection($plain))->toArray(request());
    }
}
