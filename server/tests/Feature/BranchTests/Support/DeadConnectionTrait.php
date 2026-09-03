<?php

namespace Tests\Feature\BranchTests\Support;

use Illuminate\Database\ConnectionResolverInterface;
use Illuminate\Database\Eloquent\Model as EloquentModel;

/**
 * THE "does this repository swallow a database failure?" SEAM.
 *
 * WHY THIS EXISTS
 * Every Request-module repository wraps its body in try/catch(Exception) and every catch arm does
 * the same three things: DB::rollback() where a transaction was opened, log_error($e), throw $e.
 * Those arms are the difference between a failed approval surfacing to the approver and a failed
 * approval silently returning null — a security-relevant distinction in the approval workflow —
 * yet several of them had never executed.
 *
 * Reaching them needs a failure that is DETERMINISTIC and DESTROYS NOTHING. findOrFail() covers the
 * "row is gone" arms, but store(), find() and where() have no findOrFail, so this seam swaps
 * Eloquent's connection resolver for one that throws on first use. The DB facade is untouched, so
 * the DatabaseTransactions transaction opened by the test case is unaffected and rolls back
 * normally; the resolver is restored in a finally, including when the assertion fails.
 *
 * ORDER MATTERS: the authenticated user must already be resolved (call be()/actingAs() in setUp)
 * because log_error() -> log_to_file() reads auth()->user() from inside the catch arm and must not
 * need the database to do it.
 *
 * Copied from the withDeadConnection() helper proven in RepositoryTailsWave2Test; lifted here so
 * the Request-module suites share one implementation.
 */
trait DeadConnectionTrait
{
    /** Run $fn with Eloquent's connection resolver replaced by one that throws on first use. */
    protected function withDeadConnection(callable $fn)
    {
        $original = EloquentModel::getConnectionResolver();

        EloquentModel::setConnectionResolver(new class implements ConnectionResolverInterface {
            public function connection($name = null)
            {
                throw new \RuntimeException('DEAD-CONNECTION (test seam)');
            }
            public function getDefaultConnection() { return 'mysql'; }
            public function setDefaultConnection($name) { }
        });

        try {
            return $fn();
        } finally {
            EloquentModel::setConnectionResolver($original);
        }
    }

    /**
     * Assert the method under test rethrows the database failure to its caller instead of
     * swallowing it and returning null. Returns the caught exception for further assertions.
     */
    protected function assertRethrowsDeadConnection(callable $fn)
    {
        $caught = null;
        try {
            $this->withDeadConnection($fn);
        } catch (\Exception $e) {
            $caught = $e;
        }

        $this->assertNotNull(
            $caught,
            'the repository swallowed the database failure instead of rethrowing it to the caller'
        );

        $chain = [];
        for ($e = $caught; $e !== null; $e = $e->getPrevious()) {
            $chain[] = $e->getMessage();
        }
        $this->assertStringContainsString('DEAD-CONNECTION (test seam)', implode(' | ', $chain));

        return $caught;
    }
}
