<?php
/**
 * UNIT tests for app/Helpers/summary_helper.php (LATEST code).
 *
 * grouped_payroll_items() is a pure grouping/reshaping helper. Tests\TestCase boots the app so the
 * helper autoloads and get_constant('PAYROLL_ITEM_TAGS.*' / 'PAYROLL_ITEMS.*') resolve from
 * config/constants.php. NO DB access — the payroll-items argument is an in-memory array of plain
 * stdClass rows (tag/item/value), exactly the shape the function iterates.
 *
 * Relevant constants (config/constants.php):
 *   PAYROLL_ITEM_TAGS: regular|overlapped|underlapped
 *   PAYROLL_ITEMS:     late, undertime, rendered_hours, night_diff, overtime, overtime_night_diff
 */

namespace Tests\Feature\BranchTests\Unit\Helpers;

use Tests\TestCase;

class SummaryHelperTest extends TestCase
{
    private function item($tag, $key, $value)
    {
        $o = new \stdClass();
        $o->tag = $tag;
        $o->item = get_constant('PAYROLL_ITEMS.' . $key);
        $o->value = $value;
        return $o;
    }

    // ---------------------------------------------------------------- default structure

    public function test_empty_collection_returns_zeroed_default_structure()
    {
        $grouped = grouped_payroll_items([]);

        $regular     = get_constant('PAYROLL_ITEM_TAGS.regular');
        $overlapped  = get_constant('PAYROLL_ITEM_TAGS.overlapped');
        $underlapped = get_constant('PAYROLL_ITEM_TAGS.underlapped');

        // top-level tags present
        $this->assertArrayHasKey($regular, $grouped);
        $this->assertArrayHasKey($overlapped, $grouped);
        $this->assertArrayHasKey($underlapped, $grouped);

        // regular tag holds all six payroll items, each zeroed
        $this->assertCount(6, $grouped[$regular]);
        $this->assertSame(0, $grouped[$regular][get_constant('PAYROLL_ITEMS.late')]);
        $this->assertSame(0, $grouped[$regular][get_constant('PAYROLL_ITEMS.undertime')]);
        $this->assertSame(0, $grouped[$regular][get_constant('PAYROLL_ITEMS.rendered_hours')]);
        $this->assertSame(0, $grouped[$regular][get_constant('PAYROLL_ITEMS.night_diff')]);
        $this->assertSame(0, $grouped[$regular][get_constant('PAYROLL_ITEMS.overtime')]);
        $this->assertSame(0, $grouped[$regular][get_constant('PAYROLL_ITEMS.overtime_night_diff')]);

        // overlapped -> 4 items, underlapped -> 2 items
        $this->assertCount(4, $grouped[$overlapped]);
        $this->assertCount(2, $grouped[$underlapped]);
    }

    // ---------------------------------------------------------------- value application

    public function test_applies_values_to_matching_tag_and_item()
    {
        $regular = get_constant('PAYROLL_ITEM_TAGS.regular');
        $items = [
            $this->item($regular, 'late', 120),
            $this->item($regular, 'overtime', 60),
        ];

        $grouped = grouped_payroll_items($items);

        $this->assertSame(120, $grouped[$regular][get_constant('PAYROLL_ITEMS.late')]);
        $this->assertSame(60, $grouped[$regular][get_constant('PAYROLL_ITEMS.overtime')]);
        // untouched item stays zero
        $this->assertSame(0, $grouped[$regular][get_constant('PAYROLL_ITEMS.undertime')]);
    }

    public function test_null_tag_defaults_to_regular()
    {
        $regular = get_constant('PAYROLL_ITEM_TAGS.regular');
        $items = [$this->item(null, 'night_diff', 45)];

        $grouped = grouped_payroll_items($items);

        $this->assertSame(45, $grouped[$regular][get_constant('PAYROLL_ITEMS.night_diff')]);
    }

    public function test_values_routed_to_correct_tag_bucket()
    {
        $overlapped  = get_constant('PAYROLL_ITEM_TAGS.overlapped');
        $underlapped = get_constant('PAYROLL_ITEM_TAGS.underlapped');

        $items = [
            $this->item($overlapped, 'rendered_hours', 480),
            $this->item($underlapped, 'overtime', 90),
        ];

        $grouped = grouped_payroll_items($items);

        $this->assertSame(480, $grouped[$overlapped][get_constant('PAYROLL_ITEMS.rendered_hours')]);
        $this->assertSame(90, $grouped[$underlapped][get_constant('PAYROLL_ITEMS.overtime')]);
        // regular bucket remains fully zeroed
        $this->assertSame(0, $grouped[get_constant('PAYROLL_ITEM_TAGS.regular')][get_constant('PAYROLL_ITEMS.late')]);
    }
}
