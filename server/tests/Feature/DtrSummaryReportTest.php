<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class DtrSummaryReportTest extends TestCase
{
    use DatabaseTransactions;

    public function test_user_can_fetch_dtr_summary_report()
    {
        $this->withoutMiddleware();
    
        $supervisor = User::find(1698);
    
        if (!$supervisor) {
            $this->markTestSkipped('Test supervisor not found.');
        }

        $response = $this->actingAs($supervisor)->getJson(
            '/api/report/dtr_summary/new_team?'
            .'page=1'
            .'&valid_from=2026-04-16'
            .'&valid_to=2026-05-15'
            .'&department_id=403'
            .'&is_active=1'
        );

        $response->assertStatus(200);
    
        $response->assertJsonStructure([
            'message',
            'content' => [
                'current_page',
                'last_page',
                'has_next_page',
                'dtrItems'
            ]
        ]);
    
        $data = $response->json('content');
    
        $this->assertIsArray($data['dtrItems']);
    }
    
    public function test_user_can_export_dtr_summary_report_csv()
    {
        $this->withoutMiddleware();
    
        $supervisor = User::find(1698);
    
        if (!$supervisor) {
            $this->markTestSkipped('Test supervisor not found.');
        }
    
        $response = $this->actingAs($supervisor)->get(
            '/api/report/dtr_summary/new_export?'
            .'page=1'
            .'&valid_from=2026-01-16'
            .'&valid_to=2026-04-15'
            .'&department_id=403'
            .'&is_active=1'
        );

        $response->assertStatus(200);
        
        /**
         * Get raw CSV content
         */
        $file = $response->baseResponse->getFile();
        $content = file_get_contents($file->getPathname());
        
        /**
         * Basic structure checks
         */
        $this->assertStringContainsString('"Employee Name"', $content);
        $this->assertStringContainsString('"Employee Number"', $content);
        $this->assertStringContainsString('"Department"', $content);
        $this->assertStringContainsString('"reg_rendered_hr"', $content);
        
        /**
         * Ensure at least one data row exists (not just headers)
         */
        $lines = explode("\n", trim($content));
        
        // first line = headers, second line should be data
        $this->assertGreaterThanOrEqual(2, count($lines));
        
        /**
         * Validate sample data row contains expected format
         */
        $this->assertStringContainsString('Glenn Lungay Macasarte', $content);
    }
}
