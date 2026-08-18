/**
 * EVOX — Jest: DTR report reducers (summary, conflict and multi-log slices)
 *
 * Sources under test:
 *   src/store/reducers/dtr/dtrSummaryReducers.js
 *   src/store/reducers/dtr/dtrConflictReducer.js
 *   src/store/reducers/dtr/dtrMultiLogsSummaryReducers.js
 *
 * Menu path: Reports -> DTR Summary / DTR Conflict / Multiple Logs
 *
 * Coverage before this file: dtrSummaryReducers 3 uncovered branch arms,
 *   dtrConflictReducer 3, dtrMultiLogsSummaryReducers 1 uncovered function + 2 branch arms.
 *
 * Rules asserted here (both arms of every conditional):
 *   - While more pages remain (current_page < last_page) the reducer keeps the real paging
 *     numbers; once the last page arrives it collapses paging back to 1/1/false so the
 *     batching loop in dtrSummaryActions stops.
 *   - Page 1 replaces the accumulated rows; every later page appends to them.
 *   - The three CSV download actions build a blob link and click it.
 *   - A batch error empties the slice.
 *
 * FINDING DTR-DEAD-PROCESSITEMS-1 is characterized at the bottom of this file.
 */

import dtrSummary from '../../../../store/reducers/dtr/dtrSummaryReducers';
import dtrConflict from '../../../../store/reducers/dtr/dtrConflictReducer';
import dtrMultiLogsSummary from '../../../../store/reducers/dtr/dtrMultiLogsSummaryReducers';

const initState = {
    isListLoaded: false,
    instance: {},
    pagination: { current_page: 1, last_page: 1, has_next_page: false },
    dtrItems: [],
};

// jsdom 11 ships no URL.createObjectURL; the browser provides it. Stubbing it here is an
// environment shim, not a workaround for an application defect.
let createdBlobs;
let clickedLinks;

beforeEach(() => {
    createdBlobs = [];
    clickedLinks = [];
    document.body.innerHTML = '';
    window.URL.createObjectURL = jest.fn((blob) => {
        createdBlobs.push(blob);
        return 'blob:evox/csv';
    });
    const realCreate = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tag) => {
        const el = realCreate(tag);
        if (tag === 'a') {
            el.click = jest.fn(() => clickedLinks.push(el));
        }
        return el;
    });
});

afterEach(() => {
    document.createElement.mockRestore();
});

describe('dtrSummary reducer — batched summary pages', () => {
    test('a mid-run page keeps the real paging numbers and replaces rows on page 1', () => {
        const result = dtrSummary(initState, {
            type: 'FETCH_DTR_SUMMARY_SUCCESS',
            dtrSummary: {
                current_page: 1,
                last_page: 3,
                has_next_page: true,
                summary: [{ emp_num: 'EV1' }],
            },
        });

        expect(result.pagination).toEqual({ current_page: 1, last_page: 3, has_next_page: true });
        expect(result.isListLoaded).toBe(false);
        expect(result.dtrItems).toEqual([{ emp_num: 'EV1' }]);
    });

    test('a later page appends its rows to the rows already accumulated', () => {
        const afterFirst = dtrSummary(initState, {
            type: 'FETCH_DTR_SUMMARY_SUCCESS',
            dtrSummary: { current_page: 1, last_page: 3, has_next_page: true, summary: [{ emp_num: 'EV1' }] },
        });

        const afterSecond = dtrSummary(afterFirst, {
            type: 'FETCH_DTR_SUMMARY_SUCCESS',
            dtrSummary: { current_page: 2, last_page: 3, has_next_page: true, summary: [{ emp_num: 'EV2' }] },
        });

        expect(afterSecond.dtrItems).toEqual([{ emp_num: 'EV1' }, { emp_num: 'EV2' }]);
        expect(afterSecond.pagination.current_page).toBe(2);
    });

    test('the final page collapses paging to 1/1/false and marks the list loaded', () => {
        const result = dtrSummary(initState, {
            type: 'FETCH_DTR_SUMMARY_SUCCESS',
            dtrSummary: { current_page: 3, last_page: 3, has_next_page: false, summary: [{ emp_num: 'EV9' }] },
        });

        expect(result.pagination).toEqual({ current_page: 1, last_page: 1, has_next_page: false });
        expect(result.isListLoaded).toBe(true);
    });

    test('FETCH_NEW_DTR_SUMMARY_SUCCESS keeps paging while pages remain', () => {
        const result = dtrSummary(initState, {
            type: 'FETCH_NEW_DTR_SUMMARY_SUCCESS',
            dtrSummary: { current_page: 2, last_page: 5, has_next_page: true, dtrItems: [{ emp_num: 'EV4' }] },
        });

        expect(result.pagination).toEqual({ current_page: 2, last_page: 5, has_next_page: true });
        expect(result.dtrItems).toEqual([{ emp_num: 'EV4' }]);
        expect(result.isListLoaded).toBe(true);
    });

    test('FETCH_NEW_DTR_SUMMARY_SUCCESS collapses paging on the last page', () => {
        const result = dtrSummary(initState, {
            type: 'FETCH_NEW_DTR_SUMMARY_SUCCESS',
            dtrSummary: { current_page: 5, last_page: 5, has_next_page: true, dtrItems: [] },
        });

        expect(result.pagination).toEqual({ current_page: 1, last_page: 1, has_next_page: false });
    });

    test('an export batch page keeps paging but never accumulates rows', () => {
        const result = dtrSummary(initState, {
            type: 'FETCH_DTR_EXPORT_BACTH_SUCCESS',
            dtrSummary: { current_page: 1, last_page: 2, has_next_page: true },
        });

        expect(result.pagination).toEqual({ current_page: 1, last_page: 2, has_next_page: true });
        expect(result.dtrItems).toEqual([]);
        expect(result.instance).toEqual({});
    });

    test('the final export batch page collapses paging to 1/1/false', () => {
        const result = dtrSummary(initState, {
            type: 'FETCH_DTR_EXPORT_BACTH_SUCCESS',
            dtrSummary: { current_page: 2, last_page: 2, has_next_page: true },
        });

        expect(result.pagination).toEqual({ current_page: 1, last_page: 1, has_next_page: false });
    });

    test('FETCH_DTR_EXPORT_SUCCESS downloads dtr_summary.csv and empties the slice', () => {
        const result = dtrSummary({ ...initState, dtrItems: [{ emp_num: 'EV1' }] }, {
            type: 'FETCH_DTR_EXPORT_SUCCESS',
            data: 'emp_num,date',
        });

        expect(window.URL.createObjectURL).toHaveBeenCalledTimes(1);
        expect(clickedLinks).toHaveLength(1);
        expect(clickedLinks[0].getAttribute('download')).toBe('dtr_summary.csv');
        expect(result).toEqual(initState);
    });

    test('FETCH_DTR_CONFLICT_EXPORT_SUCCESS downloads dtr_conflict_data.csv', () => {
        const result = dtrSummary(initState, {
            type: 'FETCH_DTR_CONFLICT_EXPORT_SUCCESS',
            data: 'emp_num,conflict',
        });

        expect(clickedLinks).toHaveLength(1);
        expect(clickedLinks[0].getAttribute('download')).toBe('dtr_conflict_data.csv');
        expect(result.isListLoaded).toBe(false);
    });

    test('a batch error empties the slice', () => {
        const result = dtrSummary({ ...initState, dtrItems: [{ emp_num: 'EV1' }], isListLoaded: true }, {
            type: 'FETCH_DTR_SUMMARY_BATCH_ERROR',
            e: { status: 500, statusText: 'Server Error' },
        });

        expect(result).toEqual(initState);
    });

    test('an unrelated action returns the same state instance', () => {
        const state = { ...initState, isListLoaded: true };

        expect(dtrSummary(state, { type: 'FETCH_PROFILE' })).toBe(state);
    });

    test('the reducer seeds the empty slice when called with no state', () => {
        expect(dtrSummary(undefined, { type: '@@INIT' })).toEqual(initState);
    });
});

describe('dtrConflict reducer', () => {
    test('a mid-run conflict page keeps the real paging numbers', () => {
        const result = dtrConflict(initState, {
            type: 'FETCH_DTR_CONFLICT_REPORT_SUCCESS',
            dtrConflict: {
                current_page: 1,
                last_page: 4,
                has_next_page: true,
                dtrItems: [{ emp_num: 'EV1', conflict: 'overlap' }],
            },
        });

        expect(result.pagination).toEqual({ current_page: 1, last_page: 4, has_next_page: true });
        expect(result.dtrItems).toEqual([{ emp_num: 'EV1', conflict: 'overlap' }]);
        expect(result.isListLoaded).toBe(true);
    });

    test('the final conflict page collapses paging to 1/1/false', () => {
        const result = dtrConflict(initState, {
            type: 'FETCH_DTR_CONFLICT_REPORT_SUCCESS',
            dtrConflict: { current_page: 4, last_page: 4, has_next_page: true, dtrItems: [] },
        });

        expect(result.pagination).toEqual({ current_page: 1, last_page: 1, has_next_page: false });
    });

    test('an unrelated action returns the same state instance', () => {
        const state = { ...initState, isListLoaded: true };

        expect(dtrConflict(state, { type: 'FETCH_DTR_SUMMARY_SUCCESS' })).toBe(state);
    });

    test('the reducer seeds the empty slice when called with no state', () => {
        expect(dtrConflict(undefined, { type: '@@INIT' })).toEqual(initState);
    });
});

describe('dtrMultiLogsSummary reducer', () => {
    test('a successful fetch stores the instance and its rows and marks the list loaded', () => {
        const payload = { dtrItems: [{ emp_num: 'EV1', logs: 4 }], current_page: 1, last_page: 1 };

        const result = dtrMultiLogsSummary(initState, {
            type: 'FETCH_DTR_MULTI_LOGS_SUMMARY_SUCCESS',
            dtrMultiLogsSummary: payload,
        });

        expect(result.instance).toBe(payload);
        expect(result.dtrItems).toEqual([{ emp_num: 'EV1', logs: 4 }]);
        expect(result.isListLoaded).toBe(true);
        expect(result.pagination).toBeUndefined();
    });

    test('the export action downloads dtr_multi_logs_summary.csv and empties the slice', () => {
        const result = dtrMultiLogsSummary(
            { ...initState, dtrItems: [{ emp_num: 'EV1' }], isListLoaded: true },
            { type: 'FETCH_DTR_MULTI_LOGS_EXPORT_SUCCESS', data: 'emp_num,logs' },
        );

        expect(window.URL.createObjectURL).toHaveBeenCalledTimes(1);
        expect(clickedLinks).toHaveLength(1);
        expect(clickedLinks[0].getAttribute('download')).toBe('dtr_multi_logs_summary.csv');
        expect(result).toEqual(initState);
    });

    test('an unrelated action returns the same state instance', () => {
        const state = { ...initState, isListLoaded: true };

        expect(dtrMultiLogsSummary(state, { type: 'FETCH_DTR_SUMMARY_SUCCESS' })).toBe(state);
    });

    test('the reducer seeds the empty slice when called with no state', () => {
        expect(dtrMultiLogsSummary(undefined, { type: '@@INIT' })).toEqual(initState);
    });
});

/**
 * FINDING DTR-DEAD-PROCESSITEMS-1 — dtrMultiLogsSummaryReducers.js carries a dead copy of
 * `processItems`.
 *
 * The function at line 48 of src/store/reducers/dtr/dtrMultiLogsSummaryReducers.js is a
 * verbatim copy of the accumulator used by dtrSummaryReducers.js (line 115). In the multi-log
 * reducer it is never called and never exported — a repo-wide search for `processItems`
 * finds only the definition and the sibling reducer's own use. It is unreachable by any
 * caller, so it is left uncovered on purpose rather than tested through a back door.
 *
 * The visible consequence: FETCH_DTR_MULTI_LOGS_SUMMARY_SUCCESS overwrites `dtrItems` with
 * the incoming page instead of appending, and it does not maintain a `pagination` key at all
 * (asserted above). Multi-log reports are therefore single-page only; if the backend ever
 * paginates that endpoint, earlier pages are silently dropped.
 */
test('_FINDING_DTR_DEAD_PROCESSITEMS_1 a second multi-log page replaces the first instead of appending', () => {
    const afterFirst = dtrMultiLogsSummary(initState, {
        type: 'FETCH_DTR_MULTI_LOGS_SUMMARY_SUCCESS',
        dtrMultiLogsSummary: { current_page: 1, last_page: 2, dtrItems: [{ emp_num: 'EV1' }] },
    });

    const afterSecond = dtrMultiLogsSummary(afterFirst, {
        type: 'FETCH_DTR_MULTI_LOGS_SUMMARY_SUCCESS',
        dtrMultiLogsSummary: { current_page: 2, last_page: 2, dtrItems: [{ emp_num: 'EV2' }] },
    });

    expect(afterSecond.dtrItems).toEqual([{ emp_num: 'EV2' }]);
});
