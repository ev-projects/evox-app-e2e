<?php
/**
 * UNIT tests for app/Helpers/validator_helper.php (LATEST code).
 *
 * Pure global helpers, called directly. Tests\TestCase boots the app so the helpers autoload.
 * NO DB access. (This file defines only is_valid(), clean(), clean_number() — there is no
 * is_under_supervisee() here, so nothing DB-bound to skip.)
 *
 * Note the is_valid() quirk: numeric 0 / "0" are treated as VALID (the is_numeric branch), which
 * is why the timestamp/seconds helpers accept 0. Only null / empty-non-numeric are invalid.
 */

namespace Tests\Feature\BranchTests\Unit\Helpers;

use Tests\TestCase;

class ValidatorHelperTest extends TestCase
{
    // ---------------------------------------------------------------- is_valid

    public function test_is_valid_true_for_non_empty_values()
    {
        $this->assertTrue(is_valid('abc'));
        $this->assertTrue(is_valid('2020-01-01'));
        $this->assertTrue(is_valid(5));
    }

    public function test_is_valid_true_for_numeric_zero()
    {
        // numeric branch: 0 and "0" are considered valid.
        $this->assertTrue(is_valid(0));
        $this->assertTrue(is_valid('0'));
        $this->assertTrue(is_valid(0.0));
    }

    public function test_is_valid_false_for_null_and_empty()
    {
        $this->assertFalse(is_valid(null));
        $this->assertFalse(is_valid(''));
        $this->assertFalse(is_valid([]));
        $this->assertFalse(is_valid(false));
    }

    // ---------------------------------------------------------------- clean

    public function test_clean_removes_spaces_and_special_chars()
    {
        $this->assertSame('HelloWorld', clean('Hello World!@#'));
        $this->assertSame('123abc', clean('123 abc'));
    }

    public function test_clean_keeps_alphanumeric_and_hyphen()
    {
        $this->assertSame('a-bcd', clean('a-b c.d')); // hyphen kept, space + dot dropped
        $this->assertSame('abc-123', clean('abc-123'));
    }

    public function test_clean_empty_string()
    {
        $this->assertSame('', clean(''));
        $this->assertSame('', clean('!@#$%'));
    }

    // ---------------------------------------------------------------- clean_number

    public function test_clean_number_rounds_to_two_decimals()
    {
        $this->assertEquals(1.24, clean_number(1.239));
        $this->assertEquals(3.14, clean_number(3.14159));
    }

    public function test_clean_number_strips_trailing_zeros()
    {
        // round(..)+0 drops the trailing zero: 2.50 -> 2.5, 10.00 -> 10.
        $this->assertEquals(2.5, clean_number(2.50));
        $this->assertEquals(10, clean_number(10));
        $this->assertEquals(0, clean_number(0));
    }

    public function test_clean_number_custom_precision()
    {
        $this->assertEquals(6, clean_number(5.6, 0));
        $this->assertEquals(3.142, clean_number(3.14159, 3));
    }
}
