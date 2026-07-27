<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\UploadedFile;
use App\Modules\User\Models\User;

class PoliciesDocumentTest extends TestCase
{
    use DatabaseTransactions;

    public function test_it_returns_grouped_policies_successfully()
    {
        $this->withoutMiddleware();

        $user = User::find(1593);

        $response = $this->actingAs($user, 'web')
            ->getJson('/api/show?GlobalType=1&selectedDepartments=All');

        $response->assertOk()
            ->assertJson([
                'message' => 'List of all EV policies!',
            ])
            ->assertJsonStructure([
                'message',
                'content',
            ]);

        $content = $response->json('content');

        $this->assertNotEmpty($content);
        $this->assertArrayHasKey('OPS - Human Resources', $content);

        foreach ($content['OPS - Human Resources'] as $policy) {
            $this->assertArrayHasKey('Id', $policy);
            $this->assertArrayHasKey('Title', $policy);
            $this->assertArrayHasKey('FileName', $policy);
            $this->assertArrayHasKey('FileExtension', $policy);
            $this->assertArrayHasKey('FileType', $policy);
            $this->assertArrayHasKey('Name', $policy);
            $this->assertArrayHasKey('IsGlobal', $policy);
            $this->assertArrayHasKey('countryname', $policy);
        }
    }

    public function test_it_returns_policy_list_successfully()
    {
        $this->withoutMiddleware();

        $user = User::find(1593);

        $response = $this->actingAs($user, 'web')
            ->getJson('/api/showlist?GlobalType=1&selectedDepartments=All');

        $response->assertOk();

        $response->assertJsonStructure([
            'content' => [
                '*' => [
                    'Id',
                    'Title',
                    'FileName',
                    'FileExtension',
                    'FileType',
                    'Name',
                    'IsGlobal',
                    'countryname',
                ],
            ],
        ]);
    }

    public function test_it_updates_policy_status_successfully()
    {
        $this->withoutMiddleware();

        $user = User::find(1593);

        $id = 1;
        $status = 1;

        $response = $this->actingAs($user, 'web')
            ->putJson("/api/updatestatus/{$id}/{$status}");

        $response->assertOk();

        $response->assertJsonStructure([
            'content',
        ]);
    }

    public function test_it_returns_policy_for_download()
    {
        $this->withoutMiddleware();

        $user = User::find(1593);

        $policyId = 1;

        $response = $this->actingAs($user, 'web')
            ->getJson("/api/download_policy/{$policyId}");

        $response->assertOk();

        $response->assertJsonStructure([
            '*' => [
                'FileName',
                'FileExtension',
                'FileType',
            ],
        ]);
    }

    public function test_it_returns_user_departments()
    {
        $this->withoutMiddleware();

        $user = User::find(1593);

        $response = $this->actingAs($user, 'web')
            ->getJson('/api/get_user_departments?GlobalType=1&CountryId=1');

        $response->assertOk()
            ->assertJsonStructure([
                '*' => [
                    'Id',
                    'DepartmentName',
                ],
            ]);

        $this->assertNotEmpty($response->json());
    }

    public function test_it_uploads_policy_file_successfully()
    {
        $this->withoutMiddleware();

        $user = User::find(1593);

        Storage::fake('local');

        $file = UploadedFile::fake()->create(
            'test-policy.csv',
            10,
            'application/octet-stream'
        );

        $response = $this->actingAs($user, 'web')
            ->postJson('/api/uploadfiles', [
                'FileData' => [$file],
                'GlobalType' => 1,
                'CountryId' => 1,
                'selectedDepartments' => 'All',
                'title' => 'Test Policy Upload',
            ]);

        $response->assertOk()
            ->assertJson([
                'message' => 'File uploaded successfully!',
            ]);
    }
}