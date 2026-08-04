<?php
/**
 * UNIT tests for app/Helpers/parse_helper.php (LATEST code).
 *
 * Pure global helpers, called directly. Tests\TestCase boots the app so helpers autoload and the
 * Laravel encrypter (APP_KEY) is available for the encrypt/decrypt round-trip helpers. NO DB access.
 *
 * parse_request_to_hash_code() / parse_hash_code_to_request_detail_array() are pure w.r.t. the DB:
 * they only read $request->getTable()/$request->id/$recepient->id and call encrypt()/decrypt().
 * The request/recipient are plain Mockery doubles here (no persistence), so no DB is touched.
 */

namespace Tests\Feature\BranchTests\Unit\Helpers;

use Tests\TestCase;
use Mockery;

class ParseHelperTest extends TestCase
{
    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    // ---------------------------------------------------------------- parse_emp_num_for_biometrics

    public function test_parse_emp_num_for_biometrics_prefixes_20()
    {
        $this->assertSame('2012345', parse_emp_num_for_biometrics('12345'));
        $this->assertSame('200', parse_emp_num_for_biometrics('0'));
        $this->assertSame('20', parse_emp_num_for_biometrics(''));
    }

    // ---------------------------------------------------------------- parse_emp_num_for_evox

    public function test_parse_emp_num_for_evox_strips_first_two_chars()
    {
        $this->assertSame('12345', parse_emp_num_for_evox('2012345'));
        $this->assertSame('', parse_emp_num_for_evox('20'));
    }

    public function test_parse_emp_num_round_trip()
    {
        $this->assertSame('98765', parse_emp_num_for_evox(parse_emp_num_for_biometrics('98765')));
    }

    // ---------------------------------------------------------------- text_to_slug

    public function test_text_to_slug_lowercases_and_underscores_spaces()
    {
        $this->assertSame('hello_world_test', text_to_slug('Hello World Test'));
        $this->assertSame('multiple_words', text_to_slug('Multiple    Words')); // collapses runs of whitespace
        $this->assertSame('single', text_to_slug('single'));
    }

    // ---------------------------------------------------------------- slug_to_text

    public function test_slug_to_text_titlecases_and_spaces_underscores()
    {
        $this->assertSame('Hello World Test', slug_to_text('hello_world_test'));
        $this->assertSame('Single', slug_to_text('single'));
    }

    public function test_slug_text_round_trip()
    {
        $this->assertSame('hello_world', text_to_slug(slug_to_text('hello_world')));
    }

    // ---------------------------------------------------------------- str_to_float

    public function test_str_to_float_parses_numeric_prefix()
    {
        $this->assertSame(12.5, str_to_float('12.5abc'));
        $this->assertSame(3.99, str_to_float('3.99'));
        $this->assertSame(42.0, str_to_float('42'));
    }

    public function test_str_to_float_non_numeric_returns_zero()
    {
        $this->assertSame(0.0, str_to_float('abc'));
        $this->assertSame(0.0, str_to_float(''));
    }

    // ---------------------------------------------------------------- parse hash-code helpers

    public function test_parse_hash_code_to_request_detail_array()
    {
        $hash = encrypt('overtimes|5|10');
        $this->assertSame(['overtimes', '5', '10'], parse_hash_code_to_request_detail_array($hash));
    }

    public function test_parse_request_to_hash_code_round_trip()
    {
        $request = Mockery::mock();
        $request->shouldReceive('getTable')->andReturn('overtimes');
        $request->id = 5;

        $recepient = Mockery::mock();
        $recepient->id = 10;

        $hash = parse_request_to_hash_code($request, $recepient);
        $this->assertInternalType('string', $hash);

        $this->assertSame(['overtimes', '5', '10'], parse_hash_code_to_request_detail_array($hash));
    }
}
