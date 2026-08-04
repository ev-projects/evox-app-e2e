<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use App\Modules\Opsschedule\Models\OpsSchedule;
use App\Modules\User\Models\User;

/**
 * OpsScheduleController (Menu=OpsSchedule — 43.0%, 90 unc lines). Pure Eloquent CRUD + formatting;
 * zero SPs (verified). All writes roll back (DatabaseTransactions); image uploads go to a FAKED
 * storage disk — the real filesystem is never touched. Own fixtures are created through the
 * controller itself, so tests are independent of existing table content.
 *
 * Arms: store form (work-day flag loop, JS-datestring time parsing, scope default) / store image
 * (new + replace-existing) / getList filtered+unfiltered with Form and Image formatting arms /
 * get() image-vs-form department blocks + chunking / show() work-day expansion / update form +
 * image / delete + its catch arm (null id) / store catch arm (malformed time string).
 *
 * Routes: /api/opsschedule (get, show/{id}, list/{dept?}, POST /, PUT /{id}, DELETE /{id}).
 */
class OpsScheduleControllerBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $user;
    /** @var array */
    private $dept;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->withoutMiddleware();
        $this->user = User::where('is_active', 1)->orderBy('id', 'desc')->first();
        if (!$this->user) $this->markTestSkipped('no active user in test DB');
        $this->dept = config('constants.OPS_DEPTS')[0];          // Marketing, id 4
    }

    /** JS Date.toString() shape the controller parses: index 4 is the HH:MM:SS token. */
    private function jsTime($hms)
    {
        return "Sun Aug 01 2027 {$hms} GMT+0800 (Philippine Standard Time)";
    }

    private function storeForm(array $overrides = [])
    {
        return $this->actingAs($this->user)->postJson('/api/opsschedule', array_merge([
            'type' => 'form', 'department' => $this->dept['id'],
            'name' => 'Ops Seam Row', 'position' => 'Lead', 'email' => 'ops@evox.test',
            'domain' => 'evox', 'scope' => 'PH,IN', 'timezone' => 'GMT+8',
            'start_time' => $this->jsTime('08:00:00'), 'end_time' => $this->jsTime('17:00:00'),
            'sun' => 'false', 'mon' => 'true', 'tue' => 'true', 'wed' => 'true',
            'thu' => 'true', 'fri' => 'true', 'sat' => 'false',
        ], $overrides));
    }

    // ----------------------------------------------------------------------- store()
    /** @test */
    public function store_form_builds_work_days_and_converts_js_times()
    {
        $res = $this->storeForm();

        $res->assertStatus(201);
        $row = OpsSchedule::find($res->json('content.id'));
        $this->assertSame('mon,tue,wed,thu,fri', $row->work_days);   // flag loop + rtrim arm
        $this->assertEquals(8 * 3600, $row->start_time);             // 08:00 UTC seconds
        $this->assertEquals(17 * 3600, $row->end_time);
        $this->assertSame('PH,IN', $row->scope);
        $this->assertSame('form', $row->type);
    }

    /** @test */
    public function store_image_creates_then_replaces_for_same_department()
    {
        $first = $this->actingAs($this->user)->post('/api/opsschedule', [
            'type' => 'image', 'department' => $this->dept['id'],
            'image' => UploadedFile::fake()->image('sched.png'),
        ]);
        $first->assertStatus(201);
        $countAfterFirst = OpsSchedule::where('department_id', $this->dept['id'])
            ->where('type', 'image')->count();
        $this->assertGreaterThanOrEqual(1, $countAfterFirst);    // create OR replace arm, data-dependent

        // second upload for the same department ALWAYS hits the replace-existing arm: no new row
        $second = $this->actingAs($this->user)->post('/api/opsschedule', [
            'type' => 'image', 'department' => $this->dept['id'],
            'image' => UploadedFile::fake()->image('sched2.png'),
        ]);
        $second->assertStatus(201);
        $this->assertSame($countAfterFirst, OpsSchedule::where('department_id', $this->dept['id'])
            ->where('type', 'image')->count());
    }

    /** @test */
    public function store_with_malformed_time_string_hits_catch_arm()
    {
        $res = $this->storeForm(['start_time' => 'not-a-js-date']);

        $res->assertStatus(400);
        $this->assertArrayHasKey('error', $res->json());
    }

    // --------------------------------------------------------------- getList() / get()
    /** @test */
    public function get_list_formats_form_and_image_rows_with_and_without_filter()
    {
        $this->storeForm()->assertStatus(201);
        $this->actingAs($this->user)->post('/api/opsschedule', [
            'type' => 'image', 'department' => config('constants.OPS_DEPTS')[1]['id'],
            'image' => UploadedFile::fake()->image('s.png'),
        ])->assertStatus(201);

        // filtered arm: only the form department's rows, Form formatting applied
        $res = $this->actingAs($this->user)->getJson('/api/opsschedule/list/' . $this->dept['id']);
        $res->assertStatus(200);
        $rows = collect($res->json('content'))->where('department', $this->dept['name']);
        $this->assertNotEmpty($rows);
        $formRow = $rows->firstWhere('type', 'Form');
        $this->assertSame('Mon - Fri', $formRow['work_days']);       // range formatting arm
        $this->assertSame(['PH', 'IN'], $formRow['scope']);
        $this->assertSame('8am - 5pm', $formRow['start_end_time']);

        // unfiltered arm includes the image row with a storage URL
        $res = $this->actingAs($this->user)->getJson('/api/opsschedule/list');
        $imageRow = collect($res->json('content'))->firstWhere('type', 'Image');
        $this->assertNotNull($imageRow);
        $this->assertSame([], $imageRow['scope']);
        $this->assertStringContainsString('/storage/', $imageRow['path']);
    }

    /** @test */
    public function get_groups_departments_by_image_or_form_and_chunks_in_two()
    {
        $this->storeForm()->assertStatus(201);                        // form dept block
        $this->actingAs($this->user)->post('/api/opsschedule', [      // image dept block
            'type' => 'image', 'department' => config('constants.OPS_DEPTS')[1]['id'],
            'image' => UploadedFile::fake()->image('s.png'),
        ])->assertStatus(201);

        $res = $this->actingAs($this->user)->getJson('/api/opsschedule');

        $res->assertStatus(200);
        $chunks = $res->json('content');
        $this->assertLessThanOrEqual(2, count($chunks));              // array_chunk halves arm
        $flat = collect($chunks)->flatten(1);
        $this->assertNotNull($flat->firstWhere('type', 'form'));
        $this->assertNotNull($flat->firstWhere('type', 'image'));
    }

    // ------------------------------------------------------- show() / update() / delete()
    /** @test */
    public function show_expands_work_days_into_boolean_flags()
    {
        $id = $this->storeForm()->json('content.id');

        $res = $this->actingAs($this->user)->getJson('/api/opsschedule/show/' . $id);

        $res->assertStatus(200);
        $this->assertSame('08:00', $res->json('content.start_time'));
        $this->assertTrue($res->json('content.mon'));                 // day-flag expansion arm
        $this->assertNull($res->json('content.sun'));
    }

    /** @test */
    public function update_form_rewrites_row_and_update_image_stores_new_path()
    {
        $id = $this->storeForm()->json('content.id');

        $res = $this->actingAs($this->user)->putJson('/api/opsschedule/' . $id, [
            'type' => 'form', 'department' => $this->dept['id'],
            'name' => 'Updated Ops Row', 'position' => 'Lead', 'email' => 'ops@evox.test',
            'timezone' => 'GMT+8',
            'start_time' => $this->jsTime('09:00:00'), 'end_time' => $this->jsTime('18:00:00'),
            'mon' => 'true', 'tue' => 'false', 'wed' => 'false', 'thu' => 'false',
            'fri' => 'false', 'sat' => 'false', 'sun' => 'false',
        ]);
        $res->assertStatus(200);
        $row = OpsSchedule::find($id);
        $this->assertSame('Updated Ops Row', $row->name);
        $this->assertSame('mon', $row->work_days);
        $this->assertSame('', $row->scope);                           // ?? '' default arm

        $res = $this->actingAs($this->user)->put('/api/opsschedule/' . $id, [
            'type' => 'image', 'image' => UploadedFile::fake()->create('u.png', 8),
        ]);
        $res->assertStatus(200);
        $this->assertStringContainsString("opsschedules/{$id}/", OpsSchedule::find($id)->path);
    }

    /** @test */
    public function delete_removes_row_and_missing_id_hits_catch()
    {
        $id = $this->storeForm()->json('content.id');

        $this->actingAs($this->user)->deleteJson('/api/opsschedule/' . $id)->assertStatus(200);
        $this->assertNull(OpsSchedule::find($id));

        // find(missing) -> null->delete() raises PHP Error, which catch(Exception) MISSES -> 500.
        // Characterized as-is (FINDING OPS-ERR-1: delete/show catch blocks don't catch \Error;
        // an unknown id 500s instead of returning the friendly error_response).
        $this->actingAs($this->user)->deleteJson('/api/opsschedule/999999999')->assertStatus(500);
    }
}
