/**
 * EVOX — Jest: DTR Summary report thunks (pagination / export batching)
 *
 * Source under test:
 *   src/store/actions/dtr/dtrSummaryActions.js
 *
 * Menu path: Reports -> DTR Summary (also Reports -> DTR Conflict, Reports -> Multiple Logs)
 *
 * Coverage before this file: 100% statements / 21.05% branches (19 uncovered branch arms).
 *
 * Rules asserted here (both arms of every conditional):
 *   - A page with has_next_page = true re-clicks the generate/export button so the next
 *     batch is fetched; has_next_page = false stops the batching.
 *   - The export button id is chosen from the request payload: explicit `export` wins,
 *     otherwise `department_id` selects the department button, otherwise the "all" button.
 *   - A response with no `content` is treated as the finished CSV download, not a batch.
 *   - Every thunk funnels failures into FETCH_DTR_SUMMARY_BATCH_ERROR.
 */

jest.mock('../../../../services/API', () => ({
    __esModule: true,
    default: { call: jest.fn(), export: jest.fn() },
}));

jest.mock('export-from-json', () => ({
    __esModule: true,
    default: jest.fn(),
}));

import API from '../../../../services/API';
import exportFromJSON from 'export-from-json';
import {
    fetchNewDtrSummary,
    fetchDtrConflict,
    exportDtrSummary,
    fetchDtrMultiLogsSummary,
    exportDtrMultiLogsSummary,
    exportNewDtrSummary1,
    exportNewDtrSummary,
} from '../../../../store/actions/dtr/dtrSummaryActions';

const flush = () => new Promise((resolve) => setImmediate(resolve));

const makeButton = (id) => {
    const btn = document.createElement('button');
    btn.id = id;
    const spy = jest.fn();
    btn.addEventListener('click', spy);
    document.body.appendChild(btn);
    return spy;
};

describe('dtrSummaryActions — batched report fetching and export', () => {
    let dispatch;
    let getState;
    const failure = { status: 500, statusText: 'Server Error', data: {} };

    beforeEach(() => {
        jest.clearAllMocks();
        // clearAllMocks keeps queued mockResolvedValueOnce values; reset the API doubles outright.
        API.call.mockReset();
        API.export.mockReset();
        document.body.innerHTML = '';
        dispatch = jest.fn();
        getState = jest.fn(() => ({}));
    });

    describe('fetchNewDtrSummary', () => {
        test('a page that reports another page waiting re-clicks the generate button', async () => {
            const clicked = makeButton('btn-generate');
            API.call.mockResolvedValueOnce({
                data: { content: { has_next_page: true, current_page: 1, last_page: 3 } },
            });

            fetchNewDtrSummary({ department_id: 4 })(dispatch, getState);
            await flush();

            expect(API.call).toHaveBeenCalledWith({
                method: 'get',
                url: '/report/dtr_summary/new_team',
                params: { department_id: 4 },
            });
            expect(dispatch).toHaveBeenCalledWith({
                type: 'FETCH_NEW_DTR_SUMMARY_SUCCESS',
                dtrSummary: { has_next_page: true, current_page: 1, last_page: 3 },
            });
            expect(clicked).toHaveBeenCalledTimes(1);
        });

        test('the last page does not re-click the generate button', async () => {
            const clicked = makeButton('btn-generate');
            API.call.mockResolvedValueOnce({
                data: { content: { has_next_page: false, current_page: 3, last_page: 3 } },
            });

            fetchNewDtrSummary()(dispatch, getState);
            await flush();

            expect(API.call).toHaveBeenCalledWith({
                method: 'get',
                url: '/report/dtr_summary/new_team',
                params: null,
            });
            expect(clicked).not.toHaveBeenCalled();
        });

        test('a failed call dispatches the batch error with the raw error attached', async () => {
            API.call.mockRejectedValueOnce(failure);

            fetchNewDtrSummary({ page: 2 })(dispatch, getState);
            await flush();

            expect(dispatch).toHaveBeenCalledWith({
                type: 'FETCH_DTR_SUMMARY_BATCH_ERROR',
                e: failure,
            });
            expect(dispatch).toHaveBeenCalledTimes(1);
        });
    });

    describe('fetchDtrConflict', () => {
        test('a successful page writes a CSV of the conflict rows and dispatches the rows', async () => {
            makeButton('btn-generate');
            const content = {
                dtrItems: [{ emp_num: 'EV1', date: '2026-08-01' }],
                has_next_page: false,
                current_page: 1,
                last_page: 1,
            };
            API.call.mockResolvedValueOnce({ data: { content } });

            fetchDtrConflict({ start_date: '2026-08-01' })(dispatch, getState);
            await flush();

            expect(API.call).toHaveBeenCalledWith({
                method: 'get',
                url: '/report/dtr_summary/dtr_conflict',
                params: { start_date: '2026-08-01' },
            });
            expect(exportFromJSON).toHaveBeenCalledWith({
                data: content.dtrItems,
                fileName: 'Dtr_Conflict_Report',
                exportType: 'csv',
            });
            expect(dispatch).toHaveBeenCalledWith({
                type: 'FETCH_DTR_CONFLICT_REPORT_SUCCESS',
                dtrConflict: content,
            });
        });

        test('another page waiting re-clicks generate after the CSV of the current page', async () => {
            const clicked = makeButton('btn-generate');
            API.call.mockResolvedValueOnce({
                data: { content: { dtrItems: [], has_next_page: true, current_page: 1, last_page: 2 } },
            });

            fetchDtrConflict()(dispatch, getState);
            await flush();

            expect(clicked).toHaveBeenCalledTimes(1);
        });

        test('a failed call dispatches the batch error and writes no CSV', async () => {
            API.call.mockRejectedValueOnce(failure);

            fetchDtrConflict()(dispatch, getState);
            await flush();

            expect(exportFromJSON).not.toHaveBeenCalled();
            expect(dispatch).toHaveBeenCalledWith({
                type: 'FETCH_DTR_SUMMARY_BATCH_ERROR',
                e: failure,
            });
        });
    });

    describe('exportDtrSummary', () => {
        test('an explicit export target picks the matching export button', async () => {
            const clicked = makeButton('btn-export-team');
            API.call.mockResolvedValueOnce({
                data: { content: { has_next_page: true, current_page: 1, last_page: 2 } },
            });

            exportDtrSummary({ export: 'team', department_id: 9 })(dispatch, getState);
            await flush();

            expect(dispatch).toHaveBeenCalledWith({
                type: 'FETCH_DTR_EXPORT_BACTH_SUCCESS',
                dtrSummary: { has_next_page: true, current_page: 1, last_page: 2 },
            });
            expect(clicked).toHaveBeenCalledTimes(1);
        });

        test('a department scoped export with no explicit target picks the department button', async () => {
            const departmentBtn = makeButton('btn-export-department');
            const allBtn = makeButton('btn-export-all');
            API.call.mockResolvedValueOnce({
                data: { content: { has_next_page: true, current_page: 1, last_page: 2 } },
            });

            exportDtrSummary({ department_id: 9 })(dispatch, getState);
            await flush();

            expect(departmentBtn).toHaveBeenCalledTimes(1);
            expect(allBtn).not.toHaveBeenCalled();
        });

        test('an unscoped export falls back to the "all" button', async () => {
            const allBtn = makeButton('btn-export-all');
            API.call.mockResolvedValueOnce({
                data: { content: { has_next_page: true, current_page: 1, last_page: 2 } },
            });

            exportDtrSummary({})(dispatch, getState);
            await flush();

            expect(allBtn).toHaveBeenCalledTimes(1);
        });

        test('a response without content is dispatched as the finished download, not a batch', async () => {
            const allBtn = makeButton('btn-export-all');
            const payload = 'emp_num,date\nEV1,2026-08-01';
            API.call.mockResolvedValueOnce({ data: payload });

            exportDtrSummary(null)(dispatch, getState);
            await flush();

            expect(dispatch).toHaveBeenCalledWith({
                type: 'FETCH_DTR_EXPORT_SUCCESS',
                data: payload,
            });
            expect(dispatch).not.toHaveBeenCalledWith(
                expect.objectContaining({ type: 'FETCH_DTR_EXPORT_BACTH_SUCCESS' }),
            );
            expect(allBtn).not.toHaveBeenCalled();
        });

        test('a failed export dispatches the batch error', async () => {
            API.call.mockRejectedValueOnce(failure);

            exportDtrSummary({ export: 'all' })(dispatch, getState);
            await flush();

            expect(dispatch).toHaveBeenCalledWith({
                type: 'FETCH_DTR_SUMMARY_BATCH_ERROR',
                e: failure,
            });
        });
    });

    describe('fetchDtrMultiLogsSummary', () => {
        test('a successful call dispatches the multi-log rows', async () => {
            const content = { dtrItems: [{ emp_num: 'EV2' }] };
            API.call.mockResolvedValueOnce({ data: { content } });

            fetchDtrMultiLogsSummary({ page: 1 })(dispatch, getState);
            await flush();

            expect(API.call).toHaveBeenCalledWith({
                method: 'get',
                url: '/report/dtr_summary/multi_logs',
                params: { page: 1 },
            });
            expect(dispatch).toHaveBeenCalledWith({
                type: 'FETCH_DTR_MULTI_LOGS_SUMMARY_SUCCESS',
                dtrMultiLogsSummary: content,
            });
        });

        test('a failed call dispatches the batch error', async () => {
            API.call.mockRejectedValueOnce(failure);

            fetchDtrMultiLogsSummary()(dispatch, getState);
            await flush();

            expect(dispatch).toHaveBeenCalledWith({
                type: 'FETCH_DTR_SUMMARY_BATCH_ERROR',
                e: failure,
            });
        });
    });

    describe('exportDtrMultiLogsSummary', () => {
        test('a successful export hands the raw payload to the download reducer', async () => {
            API.call.mockResolvedValueOnce({ data: 'csv-bytes' });

            exportDtrMultiLogsSummary({ department_id: 2 })(dispatch, getState);
            await flush();

            expect(API.call).toHaveBeenCalledWith({
                method: 'get',
                url: '/report/dtr_summary/multi_logs_export',
                params: { department_id: 2 },
            });
            expect(dispatch).toHaveBeenCalledWith({
                type: 'FETCH_DTR_MULTI_LOGS_EXPORT_SUCCESS',
                data: 'csv-bytes',
            });
        });

        test('a failed export dispatches the batch error', async () => {
            API.call.mockRejectedValueOnce(failure);

            exportDtrMultiLogsSummary()(dispatch, getState);
            await flush();

            expect(dispatch).toHaveBeenCalledWith({
                type: 'FETCH_DTR_SUMMARY_BATCH_ERROR',
                e: failure,
            });
        });
    });

    describe('exportNewDtrSummary1', () => {
        test('a successful call writes the conflict CSV client side and dispatches nothing', async () => {
            API.call.mockResolvedValueOnce({ data: [{ emp_num: 'EV3' }] });

            exportNewDtrSummary1({ start_date: '2026-08-01' })(dispatch, getState);
            await flush();

            expect(API.call).toHaveBeenCalledWith({
                method: 'get',
                url: '/report/dtr_summary/export_dtr_conflict',
                params: { start_date: '2026-08-01' },
            });
            expect(exportFromJSON).toHaveBeenCalledWith({
                data: [{ emp_num: 'EV3' }],
                fileName: 'Dtr_Conflict_Report',
                exportType: 'csv',
            });
            expect(dispatch).not.toHaveBeenCalled();
        });

        test('a failed call dispatches the batch error and writes no CSV', async () => {
            API.call.mockRejectedValueOnce(failure);

            exportNewDtrSummary1()(dispatch, getState);
            await flush();

            expect(exportFromJSON).not.toHaveBeenCalled();
            expect(dispatch).toHaveBeenCalledWith({
                type: 'FETCH_DTR_SUMMARY_BATCH_ERROR',
                e: failure,
            });
        });
    });

    describe('exportNewDtrSummary', () => {
        test('a department scoped batch clicks the "department_new" button', async () => {
            const departmentBtn = makeButton('btn-export-department_new');
            const allBtn = makeButton('btn-export-all_new');
            API.call.mockResolvedValueOnce({
                data: { content: { has_next_page: true, current_page: 1, last_page: 4 } },
            });

            exportNewDtrSummary({ department_id: 3 })(dispatch, getState);
            await flush();

            expect(API.call).toHaveBeenCalledWith({
                method: 'get',
                url: '/report/dtr_summary/new_export',
                params: { department_id: 3 },
            });
            expect(departmentBtn).toHaveBeenCalledTimes(1);
            expect(allBtn).not.toHaveBeenCalled();
        });

        test('an unscoped batch clicks the "all_new" button', async () => {
            const allBtn = makeButton('btn-export-all_new');
            API.call.mockResolvedValueOnce({
                data: { content: { has_next_page: true, current_page: 2, last_page: 4 } },
            });

            exportNewDtrSummary({})(dispatch, getState);
            await flush();

            expect(allBtn).toHaveBeenCalledTimes(1);
        });

        test('an explicit export target wins over the department scope', async () => {
            const targetBtn = makeButton('btn-export-payroll');
            const departmentBtn = makeButton('btn-export-department_new');
            API.call.mockResolvedValueOnce({
                data: { content: { has_next_page: true, current_page: 1, last_page: 2 } },
            });

            exportNewDtrSummary({ export: 'payroll', department_id: 3 })(dispatch, getState);
            await flush();

            expect(targetBtn).toHaveBeenCalledTimes(1);
            expect(departmentBtn).not.toHaveBeenCalled();
        });

        test('the last page dispatches the batch page but clicks nothing', async () => {
            const allBtn = makeButton('btn-export-all_new');
            const content = { has_next_page: false, current_page: 4, last_page: 4 };
            API.call.mockResolvedValueOnce({ data: { content } });

            exportNewDtrSummary()(dispatch, getState);
            await flush();

            expect(dispatch).toHaveBeenCalledWith({
                type: 'FETCH_DTR_EXPORT_BACTH_SUCCESS',
                dtrSummary: content,
            });
            expect(allBtn).not.toHaveBeenCalled();
        });

        test('a response without content is dispatched as the finished download', async () => {
            API.call.mockResolvedValueOnce({ data: '' });

            exportNewDtrSummary({})(dispatch, getState);
            await flush();

            expect(dispatch).toHaveBeenCalledWith({
                type: 'FETCH_DTR_EXPORT_SUCCESS',
                data: '',
            });
        });

        test('a failed export dispatches the batch error', async () => {
            API.call.mockRejectedValueOnce(failure);

            exportNewDtrSummary({})(dispatch, getState);
            await flush();

            expect(dispatch).toHaveBeenCalledWith({
                type: 'FETCH_DTR_SUMMARY_BATCH_ERROR',
                e: failure,
            });
        });
    });
});
