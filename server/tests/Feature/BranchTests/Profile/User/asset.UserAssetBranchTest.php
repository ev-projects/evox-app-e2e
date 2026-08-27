<?php
/**
 * COVERAGE WAVE 2026-08-18 — the asset-management endpoints of UserController.
 *
 * Source under test:
 *   server/app/Modules/User/Http/Controllers/UserController.php
 *     getAllAssets, getUserAsset, updateUserAsset, assetExport
 * Menu -> Page:  Profile -> User -> Assets (admin asset register + the employee's own asset row)
 * Routes (app/Modules/User/Routes/api.php, mounted under /api):
 *   GET  /api/user/getallassets
 *   GET  /api/user/getasset/{id}
 *   POST /api/user/updateasset
 *   POST /api/user/assetExport
 *
 * Coverage before this file: getAllAssets 50%, getUserAsset 66.67%, updateUserAsset 87.5%,
 *   assetExport 50%.
 *
 * SEAM: Support/CallSpFake.php intercepts EV_SP_Get_Assets. Leaving it unregistered is how the
 * catch arms of getAllAssets/assetExport are exercised — the seam refuses the call exactly as a
 * missing or failing stored procedure would.
 *
 * WRITES: every asset row created or updated here is inserted by this test inside the
 * DatabaseTransactions transaction and rolls back. No pre-existing row is ever touched — the
 * update test targets the id it just created.
 *
 * NOT COVERABLE (reported, not faked):
 *   getUserAsset() and getUserAssets() catch arms. Their try bodies are one bounded Eloquent read
 *   plus success_response(); there is no statement in either that can throw without mocking the
 *   database connection out from under DatabaseTransactions, which would leave the test
 *   transaction unable to roll back. Left uncovered deliberately.
 */

namespace Tests\Feature\BranchTests\Profile\User;

require_once __DIR__ . '/../../Support/CallSpFake.php';

use Carbon\Carbon;
use Mockery;
use Tests\TestCase;
use Tests\Support\CallSpFake;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use App\Modules\User\Models\AssetManagement;
use App\Modules\User\Models\User;

class UserAssetBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->withoutMiddleware();

        CallSpFake::activate();

        $this->user = User::where('is_active', 1)->whereNotNull('LevelId')
            ->orderBy('id', 'desc')->first();
        if (!$this->user) {
            $this->markTestSkipped('no active user with a LevelId in test DB');
        }
        $this->be($this->user);
    }

    protected function tearDown(): void
    {
        CallSpFake::reset();
        Mockery::close();
        parent::tearDown();
    }

    /** Creates one asset row owned by the acting user and returns it. Rolls back with the test. */
    private function assetFor(array $overrides = [])
    {
        $serial = 'SEAM-' . strtoupper(substr(uniqid(), -10));

        AssetManagement::insert(array_merge([
            'user_id' => $this->user->id,
            'personal_equipment' => 'No',
            'equipment_type' => 'Laptop',
            'serial_no' => $serial,
            'asset_tag' => 'TAG-' . $serial,
            'created_at' => Carbon::now(),
        ], $overrides));

        return AssetManagement::where('serial_no', $serial)->first();
    }

    // ================================================================== getAllAssets()

    /** The admin asset register passes the three screen filters straight through to the SP. */
    /** @test */
    public function all_assets__filter__ok__returns_the_first_result_set_and_forwards_the_filters()
    {
        CallSpFake::fake('EV_SP_Get_Assets', [
            [(object) ['id' => 1, 'serial_no' => 'SN-1', 'equipment_type' => 'Laptop']],
            [(object) ['ignored' => true]],
        ]);

        $res = $this->getJson('/api/user/getallassets?geo_id=2&department_id=9&emp_name=alice');

        $res->assertStatus(200);
        $this->assertSame('SN-1', $res->json('0.serial_no'));
        $this->assertCount(1, $res->json());              // only the first result set is returned
        $this->assertEquals(['2', '9', 'alice'],
            CallSpFake::callsFor('EV_SP_Get_Assets')[0]['params']);
    }

    /** Other arm: no filters at all still calls the SP, with three nulls. */
    /** @test */
    public function all_assets__filter__no_filters__asks_the_sp_for_everything()
    {
        CallSpFake::fake('EV_SP_Get_Assets', [[]]);

        $res = $this->getJson('/api/user/getallassets');

        $res->assertStatus(200);
        $this->assertSame([], $res->json());
        $this->assertSame([null, null, null],
            CallSpFake::callsFor('EV_SP_Get_Assets')[0]['params']);
    }

    /** @test */
    public function all_assets__filter__stored_procedure_fails__error_400()
    {
        $res = $this->getJson('/api/user/getallassets');

        $res->assertStatus(400);
        $this->assertSame(trans('messages.error_default'), $res->json('error.message'));
    }

    // ================================================================== getUserAsset()

    /** Opening one asset row returns that row. */
    /** @test */
    public function asset__load__existing_id__returns_that_asset()
    {
        $asset = $this->assetFor();

        $res = $this->getJson('/api/user/getasset/' . $asset->id);

        $res->assertStatus(200);
        $this->assertSame($asset->id, $res->json('content.id'));
        $this->assertSame($asset->serial_no, $res->json('content.serial_no'));
        $this->assertEquals($this->user->id, $res->json('content.user_id'));
    }

    /** Other arm: an id nobody owns answers 200 with no content rather than an error. */
    /** @test */
    public function asset__load__unknown_id__returns_null_content()
    {
        $missing = (int) AssetManagement::max('id') + 100000;

        $res = $this->getJson('/api/user/getasset/' . $missing);

        $res->assertStatus(200);
        $this->assertNull($res->json('content'));
    }

    /** An asset that has been retired is filtered out by the deleted_at guard. */
    /** @test */
    public function asset__load__soft_deleted_asset__is_not_returned()
    {
        $asset = $this->assetFor(['deleted_at' => Carbon::now()]);

        $res = $this->getJson('/api/user/getasset/' . $asset->id);

        $res->assertStatus(200);
        $this->assertNull($res->json('content'));
    }

    // =============================================================== updateUserAsset()

    /** Editing an asset writes the new values and stamps updated_at. */
    /** @test */
    public function asset__submit__edit__persists_the_new_values()
    {
        $asset = $this->assetFor();

        $res = $this->postJson('/api/user/updateasset', [
            'id' => $asset->id,
            'personal_equipment' => 1,          // tinyint(4) column — use 1 not 'Yes'; MySQL stores 'Yes' as 0
            'equipment_type' => 'Monitor',
            'serial_no' => 'SN-EDITED',
            'asset_tag' => 'TAG-EDITED',
        ]);

        $res->assertStatus(201);
        $this->assertSame(1, $res->json('content'));            // one row affected

        $fresh = AssetManagement::find($asset->id);
        $this->assertSame('Monitor', $fresh->equipment_type);
        $this->assertSame('SN-EDITED', $fresh->serial_no);
        $this->assertSame('TAG-EDITED', $fresh->asset_tag);
        $this->assertEquals(1, $fresh->personal_equipment);    // tinyint — PDO may return string '1', use assertEquals
        $this->assertNotNull($fresh->updated_at);
    }

    /**
     * Other arm of the equipment-type ternary: picking "Others" in the dropdown means the free-text
     * box is what gets stored, not the literal word "Others".
     */
    /** @test */
    public function asset__submit__equipment_type_others__stores_the_free_text_value()
    {
        $asset = $this->assetFor();

        $res = $this->postJson('/api/user/updateasset', [
            'id' => $asset->id,
            'equipment_type' => 'Others',
            'add_equipment_type' => 'Standing Desk',
            'serial_no' => $asset->serial_no,
        ]);

        $res->assertStatus(201);
        $this->assertSame('Standing Desk', AssetManagement::find($asset->id)->equipment_type);
    }

    /** Fields the form leaves out are cleared rather than kept. */
    /** @test */
    public function asset__submit__omitted_fields__are_written_as_null()
    {
        $asset = $this->assetFor();

        $res = $this->postJson('/api/user/updateasset', ['id' => $asset->id]);

        $res->assertStatus(201);
        $fresh = AssetManagement::find($asset->id);
        $this->assertNull($fresh->serial_no);
        $this->assertNull($fresh->asset_tag);
        $this->assertNull($fresh->equipment_type);
        $this->assertNull($fresh->personal_equipment);
    }

    // =================================================================== assetExport()

    /** The export streams the SP result set as AssetReports.csv. */
    /** @test */
    public function asset_export__export__ok__streams_the_csv_named_asset_reports()
    {
        CallSpFake::fake('EV_SP_Get_Assets', [
            [(object) ['id' => 1, 'serial_no' => 'SN-1', 'equipment_type' => 'Laptop']],
        ]);

        $res = $this->post('/api/user/assetExport', ['geo_id' => 2]);

        $res->assertStatus(200);
        $this->assertStringContainsString('AssetReports.csv',
            $res->headers->get('content-disposition'));
        $this->assertEquals(['2', null, null],
            CallSpFake::callsFor('EV_SP_Get_Assets')[0]['params']);
    }

    /** @test */
    public function asset_export__export__stored_procedure_fails__error_400()
    {
        $res = $this->postJson('/api/user/assetExport', ['geo_id' => 2]);

        $res->assertStatus(400);
        $this->assertSame(trans('messages.error_default'), $res->json('error.message'));
    }
}
