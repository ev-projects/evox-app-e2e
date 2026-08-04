<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. PURE UNIT tests for user_helper.php.
 *
 * Source of truth (LATEST only):
 *   ...\coverage-max\latest-code\server\app\Helpers\user_helper.php
 *
 * Functions under test (PURE only):
 *   under_supervisee_id_list($list) -> maps an iterable of user-like objects to a list of ->id.
 *   generate_username($bhr_user)    -> when employeeNumber/firstName/lastName are all non-null,
 *                                      returns clean( first-initial + lastname + employeeNumber );
 *                                      otherwise falls through -> null. clean() (validator_helper)
 *                                      strips spaces + non-alphanumeric/hyphen chars. All pure.
 *   ordinal($n)                     -> English ordinal suffix (pure string/int math). Bonus pure fn
 *                                      in the same file; included for coverage.
 *
 * // SKIPPED-DB (documented, not executed):
 *   get_authenticated_user($user_id) -> auth()->user()->roles()/permissions() + User::findOrFail +
 *       users_handled() (auth context + Eloquent + live-dump DB).
 *   is_under_supervisee($user_id,...) -> auth()->user()->level_type() + User::findOrFail +
 *       direct_supervisor_temp() (auth context + Eloquent).
 *   Both need an authenticated user and DB access — out of scope for pure unit tests.
 */

namespace Tests\Feature\BranchTests\Unit\Helpers;

use stdClass;
use Tests\TestCase;

class UserHelperTest extends TestCase
{
    private function userObj($id)
    {
        $o = new stdClass();
        $o->id = $id;
        return $o;
    }

    private function bhrUser($employeeNumber, $firstName, $lastName)
    {
        $o = new stdClass();
        $o->employeeNumber = $employeeNumber;
        $o->firstName = $firstName;
        $o->lastName = $lastName;
        return $o;
    }

    // ================================================== under_supervisee_id_list()

    // Normal: extracts ->id from each element in order.
    /** @test */
    public function under_supervisee_id_list__extracts_ids_in_order()
    {
        $list = [$this->userObj(10), $this->userObj(20), $this->userObj(30)];

        $this->assertSame([10, 20, 30], under_supervisee_id_list($list));
    }

    // Boundary: empty list -> empty array.
    /** @test */
    public function under_supervisee_id_list__empty__empty_array()
    {
        $this->assertSame([], under_supervisee_id_list([]));
    }

    // Edge: single element.
    /** @test */
    public function under_supervisee_id_list__single_element()
    {
        $this->assertSame([7], under_supervisee_id_list([$this->userObj(7)]));
    }

    // Edge: duplicate ids are preserved (no de-duplication).
    /** @test */
    public function under_supervisee_id_list__preserves_duplicates()
    {
        $list = [$this->userObj(5), $this->userObj(5)];

        $this->assertSame([5, 5], under_supervisee_id_list($list));
    }

    // ========================================================= generate_username()

    // Normal: first initial + lowercase last name + employee number.
    /** @test */
    public function generate_username__all_fields__composes_username()
    {
        $user = $this->bhrUser('123', 'John', 'Doe');

        $this->assertSame('jdoe123', generate_username($user));
    }

    // Edge: spaces in the last name are stripped by clean().
    /** @test */
    public function generate_username__spaces_stripped()
    {
        $user = $this->bhrUser('45', 'Anna', 'De La Cruz');

        $this->assertSame('adelacruz45', generate_username($user));
    }

    // Edge: special characters are removed by clean() (keeps alphanumerics + hyphen).
    /** @test */
    public function generate_username__special_chars_removed()
    {
        $user = $this->bhrUser('9', "O'Br@ien", 'Smith');
        // first initial from firstName 'o'; last 'smith'; emp '9' -> 'osmith9'
        $this->assertSame('osmith9', generate_username($user));
    }

    // Edge: a null employeeNumber -> guard fails -> function returns null.
    /** @test */
    public function generate_username__missing_employee_number__null()
    {
        $user = $this->bhrUser(null, 'John', 'Doe');

        $this->assertNull(generate_username($user));
    }

    // Edge: a null lastName -> guard fails -> null.
    /** @test */
    public function generate_username__missing_last_name__null()
    {
        $user = $this->bhrUser('123', 'John', null);

        $this->assertNull(generate_username($user));
    }

    // ==================================================================== ordinal()

    // Normal + boundary cases for the ordinal suffix rules.
    /** @test */
    public function ordinal__basic_suffixes()
    {
        $this->assertSame('1st', ordinal(1));
        $this->assertSame('2nd', ordinal(2));
        $this->assertSame('3rd', ordinal(3));
        $this->assertSame('4th', ordinal(4));
    }

    // Boundary: the 11/12/13 teens exception always uses 'th'.
    /** @test */
    public function ordinal__teens_exception_uses_th()
    {
        $this->assertSame('11th', ordinal(11));
        $this->assertSame('12th', ordinal(12));
        $this->assertSame('13th', ordinal(13));
    }

    // Edge: two-digit numbers resume normal suffixing (21st, 22nd, 23rd).
    /** @test */
    public function ordinal__twenties_resume_normal_suffix()
    {
        $this->assertSame('21st', ordinal(21));
        $this->assertSame('22nd', ordinal(22));
        $this->assertSame('23rd', ordinal(23));
    }

    // Edge: three-digit numbers (101 -> 'st', 111 -> 'th' teens exception, 113 -> 'th').
    /** @test */
    public function ordinal__three_digit_numbers()
    {
        $this->assertSame('101st', ordinal(101));
        $this->assertSame('111th', ordinal(111));
        $this->assertSame('113th', ordinal(113));
    }
}
