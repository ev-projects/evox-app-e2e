<?php

namespace Tests\Feature\BranchTests\Unit\Models;

use Tests\TestCase;
use App\Modules\Payroll\Models\DtrPayrollItems;

/**
 * Pure boolean-helper test.
 * DtrPayrollItems tag/item helpers compare attributes against the PAYROLL_ITEM_TAGS
 * and PAYROLL_ITEMS constant maps. No DB access.
 */
class DtrPayrollItemsTest extends TestCase
{
    private function item($attributes)
    {
        $model = new DtrPayrollItems();
        foreach ($attributes as $key => $value) {
            $model->{$key} = $value;
        }
        return $model;
    }

    public function test_is_regular_when_tag_is_null()
    {
        $model = new DtrPayrollItems();

        $this->assertTrue($model->isRegular());
    }

    public function test_is_regular_false_when_tag_set()
    {
        $model = $this->item(['tag' => 'overlapped']);

        $this->assertFalse($model->isRegular());
    }

    public function test_is_underlapped()
    {
        $this->assertTrue($this->item(['tag' => 'underlapped'])->isUnderlapped());
        $this->assertFalse($this->item(['tag' => 'overlapped'])->isUnderlapped());
    }

    public function test_is_overlapped()
    {
        $this->assertTrue($this->item(['tag' => 'overlapped'])->isOverlapped());
        $this->assertFalse($this->item(['tag' => 'underlapped'])->isOverlapped());
    }

    public function test_is_late()
    {
        $this->assertTrue($this->item(['item' => 'late'])->isLate());
        $this->assertFalse($this->item(['item' => 'undertime'])->isLate());
    }

    public function test_is_undertime()
    {
        $this->assertTrue($this->item(['item' => 'undertime'])->isUndertime());
        $this->assertFalse($this->item(['item' => 'late'])->isUndertime());
    }

    public function test_is_night_diff()
    {
        $this->assertTrue($this->item(['item' => 'night_diff'])->isNightDiff());
        $this->assertFalse($this->item(['item' => 'overtime'])->isNightDiff());
    }

    public function test_is_overtime()
    {
        $this->assertTrue($this->item(['item' => 'overtime'])->isOvertime());
        $this->assertFalse($this->item(['item' => 'night_diff'])->isOvertime());
    }

    public function test_is_overtime_night_diff()
    {
        $this->assertTrue($this->item(['item' => 'overtime_night_diff'])->isOvertimeNightDiff());
        $this->assertFalse($this->item(['item' => 'overtime'])->isOvertimeNightDiff());
    }

    public function test_is_rendered_hours()
    {
        $this->assertTrue($this->item(['item' => 'rendered_hours'])->isRenderedHours());
        $this->assertFalse($this->item(['item' => 'late'])->isRenderedHours());
    }
}
