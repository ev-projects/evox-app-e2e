# Task: Generate PHPUnit Test Coverage for EVOX Core Modules

## Objective

Create PHPUnit unit and integration tests for the highest-priority EVOX modules:

* Payroll
* Attendance
* Leave (read-only BambooHR synchronized data)

The primary goal is to increase backend test coverage and validate critical business workflows across the application.

---

## Source of Truth

Before generating any tests, analyze and use the following documents as the authoritative references:

### Core Documentation

1. `docs/requirements.md`
2. `docs/api-surface.md`

### Feature Documentation

3. `docs/features/payroll__-__*.md`
4. `docs/features/attendance__-__*.md`

These feature documents contain module-specific business rules and should be treated as authoritative implementation references.

Do not infer behavior that contradicts the documented requirements, API contracts, or feature specifications.

---

## Module-Specific Notes

### Leave Module

Leave records are synchronized from BambooHR through scheduled synchronization jobs.

Leave data should be treated as read-only within EVOX.

Do NOT generate tests for:

- Leave creation workflows
- Leave modification workflows
- Leave approval workflows
- Leave accrual calculations
- Leave deduction calculations
- Leave balance calculations
- Leave entitlement management
- Leave policy enforcement

Instead, focus only on functionality that exists within EVOX:

- BambooHR synchronization jobs
- Leave data import and persistence
- Leave data mapping and transformation
- Data integrity after synchronization
- Duplicate prevention during synchronization
- Sync error handling and recovery
- Leave data retrieval APIs and queries
- Read-only access behavior
- Relationships between synchronized leave records and employees

Do not assume EVOX owns leave management logic. Treat BambooHR as the system of record for leave data.

---

## Unit Test Requirements

Generate PHPUnit tests covering:

### Models

* Model methods
* Accessors and mutators
* Computed attributes
* Casting behavior
* Validation-related logic where applicable

### Services

* Service class methods
* Business workflows
* Error handling
* Edge-case handling

### Helpers and Utilities

* Helper functions
* Shared utility classes
* Calculation utilities

---

## Core Business Logic

### Payroll

Generate tests for:

* Payroll calculations
* Salary computation
* Deductions
* Adjustments
* Overtime calculations
* Net pay calculations
* Payroll period processing
* Payroll status transitions
* Payroll-related validation rules

### Attendance

Generate tests for:

* Attendance calculations
* Time-in/time-out processing
* Shift computations
* Late and undertime calculations
* Attendance summaries
* Attendance validation rules
* Attendance-related business workflows

### Permissions

Generate tests for:

* Role-based access checks
* Authorization logic
* Permission validation rules
* Module-level access restrictions

---

## Integration Test Requirements

Generate PHPUnit integration tests covering:

### Database Interactions

* Record creation
* Updates
* Deletions
* Query behavior
* Transaction handling

### Eloquent Relationships

* Relationship integrity
* Relationship loading behavior
* Relationship constraints

### Queue Jobs

Generate tests for:

* Job dispatching
* Queue execution
* Payroll-related jobs
* Attendance-related jobs
* BambooHR synchronization jobs (if present)

### Events and Listeners

Generate tests for:

* Event dispatching
* Listener execution
* Expected state changes
* Side effects after processing

### BambooHR Synchronization

If synchronization components exist, generate tests for:

* Import workflows
* Data mapping
* Duplicate handling
* Sync failure handling
* Data consistency after synchronization

---

## Test Structure

Place generated tests under:

```text
evox-app/server/tests/
```

Follow Laravel and PHPUnit best practices:

* Clear naming conventions
* Readable Arrange / Act / Assert structure
* Factory-based test data generation when available
* Minimal duplication
* Maintainable organization
* Deterministic assertions

---

## Expected Output

Generate:

1. Unit tests for Payroll, Attendance, and Leave modules
2. Integration tests for Payroll, Attendance, and Leave modules
3. Required factories and fixtures
4. Required mocks and test helpers
5. Coverage configuration if missing
6. Recommendations for uncovered areas
7. Documentation of assumptions made during test generation

---

## Workflow

### Your Responsibility

1. Analyze all source documents.
2. Identify testable components.
3. Map documented requirements to test scenarios.
4. Generate initial test scaffolding.
5. Implement meaningful assertions where behavior is documented.
6. Flag assumptions and undocumented behavior.

### Developer Responsibility

1. Run generated tests.
2. Validate correctness.
3. Fix failing or incomplete cases.
4. Expand coverage where necessary.

---

## Prioritization

Focus in the following order:

1. Payroll
2. Attendance
3. Leave synchronization and reporting

Prioritize:

* Business-critical workflows
* High-risk calculations
* Payroll accuracy
* Attendance accuracy
* Authorization logic
* Data integrity
* BambooHR synchronization integrity
* Maintainability and readability of tests

Avoid generating speculative tests for undocumented behavior.
