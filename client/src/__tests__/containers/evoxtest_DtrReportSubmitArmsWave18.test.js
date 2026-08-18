/**
 * evoxtest_DtrReportSubmitArmsWave18.test.js
 *
 * SOURCE FILES UNDER TEST
 *   src/container/MyTeam/DtrSummaryNew/DtrSummaryNew.js
 *   src/container/MyTeam/DtrConflictReport/DtrConflictReport.js
 *   src/container/MyTeam/DtrMultiLogsSummary/DtrMultiLogsSummary.js
 *
 * MENU PATH
 *   My Team -> DTR Summary
 *   My Team -> DTR Conflict Report
 *   My Team -> DTR Multi Logs Summary
 *
 * CURRENT MEASURED COVERAGE (17 Aug run)
 *   DtrSummaryNew        3 uncovered functions / 8 uncovered branches
 *   DtrConflictReport    4 uncovered functions / 1 uncovered branch
 *   DtrMultiLogsSummary  2 uncovered functions / 2 uncovered branches
 *   Every uncovered function in all three is connect wiring, taken by
 *   evoxtest_MyTeamReportConnectWiringWave18.test.js. What is left, and what this suite takes,
 *   is the page-number arithmetic that each export mode re-implements for itself:
 *     DtrSummaryNew   lines 76-77 (export "all"), 102-103 ("all_new"), 127-128
 *                     ("department_new") plus the null-value skip on line 81
 *     DtrConflict     line 50, the same ternary in its single handler
 *     DtrMultiLogs    line 70, the null-value skip inside its "all_new" loop
 *
 * WHY THE HANDLER IS CALLED DIRECTLY
 *   Each export mode is chosen from a dropdown that sets Formik's `export` field and submits.
 *   Driving that through the mocked datepicker cannot produce a Formik date, so the tests call
 *   ref.current.onSubmitHandler(values) with exactly the values the form would have built. Yup
 *   validation is therefore not exercised here; the existing lifecycle suites cover that.
 *
 * FINDINGS
 *   DTR-DEADARM-1  DtrSummaryNew.js:36 and DtrMultiLogsSummary.js:36 — componentDidMount guards
 *                  on `!this.state.initialState.department_id`, but the constructor hard-codes
 *                  department_id to null and nothing runs in between. The false arm is
 *                  unreachable. Not tested.
 *   DTR-PAGEBUMP   All four export blocks ask the server for `current_page + 1` whenever the
 *                  LAST response said has_next_page. An export therefore starts from the page
 *                  after the one on screen, not from page 1 — the first page of an export is
 *                  silently skipped whenever more pages exist. Asserted as it behaves today.
 *
 * ADDITIVE ONLY — no existing test file touched, no application source changed.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
}));
jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader:  ({ children }) => <div>{children}</div>,
    Content:          ({ children }) => <div>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
    Row:              ({ children }) => <div>{children}</div>,
    Col:              ({ children }) => <div>{children}</div>,
}));
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/Template/Paginate', () => () => <div data-testid="paginate" />);
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate: ({ name }) => <input type="date" name={name} />,
    InputTime: ({ name }) => <input type="time" name={name} />,
}));
jest.mock('react-datepicker', () => () => <div data-testid="datepicker" />);
jest.mock('../../services/Authenticator', () => ({
    scanLevel: jest.fn(() => true), scanFeature: jest.fn(() => true),
}));
// displayLog is what the conflict table calls per row (DtrConflictReport.js:177-178); the other
// two are used by the sibling DTR screens that share this module.
jest.mock('../../services/DtrFormatter', () => ({
    displayLog: jest.fn((v) => v),
    convert_to_hours: jest.fn((v) => v),
    convert_date: jest.fn((v) => v),
}));
jest.mock('../../store/actions/dtr/dtrSummaryActions', () => ({
    fetchNewDtrSummary: jest.fn(), exportDtrSummary: jest.fn(),
    exportNewDtrSummary: jest.fn(), exportNewDtrSummary1: jest.fn(),
    fetchDtrConflict: jest.fn(),
    fetchDtrMultiLogsSummary: jest.fn(), exportDtrMultiLogsSummary: jest.fn(),
}));

global.links = new Proxy({}, { get: () => '/x/' });

const DtrSummaryNew = require('../../container/MyTeam/DtrSummaryNew/DtrSummaryNew').default;
const DtrConflictReport = require('../../container/MyTeam/DtrConflictReport/DtrConflictReport').default;
const DtrMultiLogsSummary = require('../../container/MyTeam/DtrMultiLogsSummary/DtrMultiLogsSummary').default;

const SETTINGS = { current_payroll_cutoff: { start_date: '2026-07-16', end_date: '2026-08-15' } };

// departments_handled is empty on purpose: componentDidMount only auto-submits when the manager
// handles at least one department, so this keeps every assertion below about the handler call
// the test itself makes.
const NO_AUTO_SUBMIT_USER = { id: 1, departments_handled: [] };

// Dates are built with local-time constructors, so the moment(...).format() results below hold
// in any timezone.
const values = (over = {}) => ({
    valid_from: new Date(2026, 6, 16),
    valid_to: new Date(2026, 7, 15),
    department_id: 5,
    name: null,
    is_active: 1,
    export: false,
    ...over,
});

beforeEach(() => jest.clearAllMocks());

/* =============================================================== DtrSummaryNew */

describe('DtrSummaryNew — what each export mode sends', () => {
    const actions = () => ({
        fetchNewDtrSummary: jest.fn(), exportDtrSummary: jest.fn(),
        exportNewDtrSummary: jest.fn(), exportNewDtrSummary1: jest.fn(),
    });

    const renderDSN = (dtrSummary, acts) => {
        const ref = React.createRef();
        render(
            <MemoryRouter>
                <DtrSummaryNew ref={ref} user={NO_AUTO_SUBMIT_USER} settings={SETTINGS}
                    dtrSummary={dtrSummary} {...acts} />
            </MemoryRouter>
        );
        return ref;
    };

    const LOADED = { isListLoaded: false, dtrItems: [], pagination: { current_page: 3, has_next_page: true } };
    const NO_PAGINATION = { isListLoaded: false, dtrItems: [] };

    test('an all-departments export drops the department and name filters but keeps the range', () => {
        const acts = actions();
        const ref = renderDSN(NO_PAGINATION, acts);
        ref.current.onSubmitHandler(values({ export: 'all' }));

        expect(acts.exportDtrSummary).toHaveBeenCalledTimes(1);
        expect(acts.exportDtrSummary.mock.calls[0][0]).toEqual({
            page: 1,
            valid_from: '2026-07-16',
            valid_to: '2026-08-15',
            is_active: 1,
            export: 'all',
        });
    });

    test('DTR-PAGEBUMP an all-departments export starts one page PAST the page on screen', () => {
        const acts = actions();
        const ref = renderDSN(LOADED, acts);
        ref.current.onSubmitHandler(values({ export: 'all' }));
        expect(acts.exportDtrSummary.mock.calls[0][0].page).toBe(4); // current_page 3 + 1
    });

    test('an all-departments export stays on the current page when there is nothing after it', () => {
        const acts = actions();
        const ref = renderDSN({ isListLoaded: false, dtrItems: [], pagination: { current_page: 3, has_next_page: false } }, acts);
        ref.current.onSubmitHandler(values({ export: 'all' }));
        expect(acts.exportDtrSummary.mock.calls[0][0].page).toBe(3);
    });

    test('the new all-departments export uses the new endpoint and the same key rules', () => {
        const acts = actions();
        const ref = renderDSN(NO_PAGINATION, acts);
        ref.current.onSubmitHandler(values({ export: 'all_new', name: 'Alice' }));

        expect(acts.exportNewDtrSummary).toHaveBeenCalledTimes(1);
        expect(acts.exportDtrSummary).not.toHaveBeenCalled();
        const sent = acts.exportNewDtrSummary.mock.calls[0][0];
        expect(sent.page).toBe(1);
        expect(sent.export).toBe('all_new');
        expect(sent).not.toHaveProperty('department_id');
        expect(sent).not.toHaveProperty('name');
    });

    test('the new all-departments export also bumps past the current page', () => {
        const acts = actions();
        const ref = renderDSN(LOADED, acts);
        ref.current.onSubmitHandler(values({ export: 'all_new' }));
        expect(acts.exportNewDtrSummary.mock.calls[0][0].page).toBe(4);
    });

    test('the department-scoped new export KEEPS the department and still drops the name', () => {
        const acts = actions();
        const ref = renderDSN(NO_PAGINATION, acts);
        ref.current.onSubmitHandler(values({ export: 'department_new', name: 'Alice' }));

        const sent = acts.exportNewDtrSummary.mock.calls[0][0];
        expect(sent.department_id).toBe(5);
        expect(sent).not.toHaveProperty('name');
        expect(sent.export).toBe('department_new');
        expect(sent.page).toBe(1);
    });

    test('the department-scoped new export bumps past the current page too', () => {
        const acts = actions();
        const ref = renderDSN(LOADED, acts);
        ref.current.onSubmitHandler(values({ export: 'department_new' }));
        expect(acts.exportNewDtrSummary.mock.calls[0][0].page).toBe(4);
    });

    test('the old department export keeps both filters and never sends the export flag through the loop', () => {
        const acts = actions();
        const ref = renderDSN(NO_PAGINATION, acts);
        ref.current.onSubmitHandler(values({ export: 'department', name: 'Alice' }));

        const sent = acts.exportDtrSummary.mock.calls[0][0];
        expect(sent.department_id).toBe(5);
        expect(sent.name).toBe('Alice');
        // the first loop skips `export` outright; the handler re-adds it explicitly afterwards
        expect(sent.export).toBe('department');
    });

    test('a plain generate fetches the list and sends no export flag at all', () => {
        const acts = actions();
        const ref = renderDSN(NO_PAGINATION, acts);
        ref.current.onSubmitHandler(values({ export: false, name: 'Alice' }));

        expect(acts.fetchNewDtrSummary).toHaveBeenCalledTimes(1);
        const sent = acts.fetchNewDtrSummary.mock.calls[0][0];
        expect(sent).not.toHaveProperty('export');
        expect(sent.department_id).toBe(5);
        expect(sent.name).toBe('Alice');
        expect(acts.exportDtrSummary).not.toHaveBeenCalled();
        expect(acts.exportNewDtrSummary).not.toHaveBeenCalled();
    });
});

/* =========================================================== DtrConflictReport */

describe('DtrConflictReport — generate vs export', () => {
    const actions = () => ({ exportNewDtrSummary1: jest.fn(), fetchDtrConflict: jest.fn() });

    const renderConflict = (dtrSummary, acts) => {
        const ref = React.createRef();
        render(
            <MemoryRouter>
                <DtrConflictReport ref={ref} user={NO_AUTO_SUBMIT_USER} settings={SETTINGS}
                    dtrSummary={dtrSummary} {...acts} />
            </MemoryRouter>
        );
        return ref;
    };

    const conflictState = (pagination) => ({
        isListLoaded: true, dtrItems: [], ...(pagination ? { pagination } : {}),
    });

    test('generate asks for page 1 when no page has been loaded yet, and drops empty filters', () => {
        const acts = actions();
        const ref = renderConflict(conflictState(null), acts);
        ref.current.onSubmitHandler(values({ export: false, name: null, department_id: '' }));

        expect(acts.fetchDtrConflict).toHaveBeenCalledTimes(1);
        const sent = acts.fetchDtrConflict.mock.calls[0][0];
        expect(sent.page).toBe(1);
        expect(sent.valid_from).toBe('2026-07-16');
        expect(sent.valid_to).toBe('2026-08-15');
        expect(sent).not.toHaveProperty('name');          // null skipped
        expect(sent).not.toHaveProperty('department_id'); // empty string skipped
        expect(acts.exportNewDtrSummary1).not.toHaveBeenCalled();
    });

    test('generate reuses the page already on screen when there is nothing after it', () => {
        const acts = actions();
        const ref = renderConflict(conflictState({ current_page: 2, has_next_page: false }), acts);
        ref.current.onSubmitHandler(values({ export: false }));
        expect(acts.fetchDtrConflict.mock.calls[0][0].page).toBe(2);
    });

    test('DTR-PAGEBUMP generate asks for the NEXT page whenever the last response had one', () => {
        const acts = actions();
        const ref = renderConflict(conflictState({ current_page: 2, has_next_page: true }), acts);
        ref.current.onSubmitHandler(values({ export: false }));
        expect(acts.fetchDtrConflict.mock.calls[0][0].page).toBe(3);
    });

    test('exporting the conflict report goes to the export endpoint instead of the fetch', () => {
        const acts = actions();
        const ref = renderConflict(conflictState({ current_page: 1, has_next_page: false }), acts);
        ref.current.onSubmitHandler(values({ export: 'dtr_conflict', name: 'Alice' }));

        expect(acts.exportNewDtrSummary1).toHaveBeenCalledTimes(1);
        expect(acts.fetchDtrConflict).not.toHaveBeenCalled();
        const sent = acts.exportNewDtrSummary1.mock.calls[0][0];
        expect(sent.page).toBe(1);
        expect(sent.name).toBe('Alice');
        expect(sent).not.toHaveProperty('export'); // the single loop skips the export key
    });
});

/* ========================================================= DtrMultiLogsSummary */

describe('DtrMultiLogsSummary — generate vs the two exports', () => {
    const actions = () => ({
        fetchDtrMultiLogsSummary: jest.fn(), exportDtrMultiLogsSummary: jest.fn(),
    });

    const renderMulti = (acts) => {
        const ref = React.createRef();
        render(
            <MemoryRouter>
                <DtrMultiLogsSummary ref={ref} user={NO_AUTO_SUBMIT_USER} settings={SETTINGS}
                    dtrMultiLogsSummary={{ isListLoaded: false, dtrItems: [] }} {...acts} />
            </MemoryRouter>
        );
        return ref;
    };

    test('generate keeps every filter the manager set and sends no page number', () => {
        const acts = actions();
        const ref = renderMulti(acts);
        ref.current.onSubmitHandler(values({ export: false, name: 'Alice' }));

        expect(acts.fetchDtrMultiLogsSummary).toHaveBeenCalledTimes(1);
        expect(acts.fetchDtrMultiLogsSummary.mock.calls[0][0]).toEqual({
            valid_from: '2026-07-16', valid_to: '2026-08-15',
            department_id: 5, name: 'Alice', is_active: 1,
        });
    });

    test('the all-departments export drops department, name and any empty filter', () => {
        const acts = actions();
        const ref = renderMulti(acts);
        ref.current.onSubmitHandler(values({ export: 'all_new', name: null, is_active: '' }));

        expect(acts.exportDtrMultiLogsSummary).toHaveBeenCalledTimes(1);
        expect(acts.exportDtrMultiLogsSummary.mock.calls[0][0]).toEqual({
            valid_from: '2026-07-16', valid_to: '2026-08-15', export: 'all_new',
        });
        expect(acts.fetchDtrMultiLogsSummary).not.toHaveBeenCalled();
    });

    test('the department-scoped export keeps the department but still drops the name', () => {
        const acts = actions();
        const ref = renderMulti(acts);
        ref.current.onSubmitHandler(values({ export: 'department_new', name: 'Alice' }));

        const sent = acts.exportDtrMultiLogsSummary.mock.calls[0][0];
        expect(sent.department_id).toBe(5);
        expect(sent).not.toHaveProperty('name');
        expect(sent.export).toBe('department_new');
    });
});
