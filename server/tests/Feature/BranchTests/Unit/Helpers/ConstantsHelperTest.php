<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. PURE UNIT tests for the constants helpers.
 *
 * Source of truth (LATEST only):
 *   ...\coverage-max\latest-code\server\app\Helpers\constants_helper.php
 *
 * Functions under test (both are thin wrappers over Illuminate\Support\Facades\Config):
 *   get_constant($key=null)      -> Config::get('constants.'.$key)  (or whole array when $key is null)
 *   get_imploded_constant($key)  -> array => implode(',', $var); scalar/null => returned as-is
 *
 * NO DB / NO SP / NO external. Config is an in-memory array store; tests seed deterministic keys
 * via Config::set so they never depend on the real config/constants.php contents (a couple of
 * real, stable keys — DAYS, TIMESTAMP.hour — are also asserted to prove the wiring).
 */

namespace Tests\Feature\BranchTests\Unit\Helpers;

use Tests\TestCase;
use Illuminate\Support\Facades\Config;

class ConstantsHelperTest extends TestCase
{
    // ============================================================ get_constant()

    // Normal: an existing scalar key is returned verbatim.
    /** @test */
    public function get_constant__scalar_key__returns_value()
    {
        Config::set('constants.UT_SCALAR', 'hello');

        $this->assertSame('hello', get_constant('UT_SCALAR'));
    }

    // Normal: an existing array key is returned as the array (no transformation).
    /** @test */
    public function get_constant__array_key__returns_array()
    {
        Config::set('constants.UT_LIST', ['a', 'b', 'c']);

        $this->assertSame(['a', 'b', 'c'], get_constant('UT_LIST'));
    }

    // Normal: dot-notation nested key resolves through the constants array.
    /** @test */
    public function get_constant__nested_dot_key__resolves()
    {
        Config::set('constants.UT_NEST', ['hour' => 3600]);

        $this->assertSame(3600, get_constant('UT_NEST.hour'));
    }

    // Edge: unknown key -> Config::get returns null.
    /** @test */
    public function get_constant__unknown_key__returns_null()
    {
        $this->assertNull(get_constant('UT_DOES_NOT_EXIST_9999'));
    }

    // Edge/boundary: no argument (null key) -> whole 'constants' array is returned.
    /** @test */
    public function get_constant__no_key__returns_whole_constants_array()
    {
        Config::set('constants.UT_WHOLE_MARKER', 'present');

        $all = get_constant();

        $this->assertIsArray($all);
        $this->assertArrayHasKey('UT_WHOLE_MARKER', $all);
        $this->assertSame('present', $all['UT_WHOLE_MARKER']);
    }

    // Wiring: real, stable keys from config/constants.php are readable.
    /** @test */
    public function get_constant__real_known_keys__match_config()
    {
        $this->assertSame(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], get_constant('DAYS'));
        $this->assertSame(3600, get_constant('TIMESTAMP.hour'));
    }

    // =================================================== get_imploded_constant()

    // Normal: array value is comma-imploded.
    /** @test */
    public function get_imploded_constant__array__comma_joined()
    {
        Config::set('constants.UT_IMPL', ['x', 'y', 'z']);

        $this->assertSame('x,y,z', get_imploded_constant('UT_IMPL'));
    }

    // Boundary: single-element array -> no comma.
    /** @test */
    public function get_imploded_constant__single_element__no_comma()
    {
        Config::set('constants.UT_IMPL_ONE', ['solo']);

        $this->assertSame('solo', get_imploded_constant('UT_IMPL_ONE'));
    }

    // Boundary: empty array -> empty string.
    /** @test */
    public function get_imploded_constant__empty_array__empty_string()
    {
        Config::set('constants.UT_IMPL_EMPTY', []);

        $this->assertSame('', get_imploded_constant('UT_IMPL_EMPTY'));
    }

    // Edge: scalar value is returned unchanged (not imploded).
    /** @test */
    public function get_imploded_constant__scalar__returned_as_is()
    {
        Config::set('constants.UT_IMPL_SCALAR', 'plain');

        $this->assertSame('plain', get_imploded_constant('UT_IMPL_SCALAR'));
    }

    // Edge: unknown key -> get_constant returns null, is_array(null) is false -> null.
    /** @test */
    public function get_imploded_constant__unknown_key__returns_null()
    {
        $this->assertNull(get_imploded_constant('UT_IMPL_MISSING_9999'));
    }
}
