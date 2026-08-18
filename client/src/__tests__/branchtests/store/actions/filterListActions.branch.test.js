/**
 * EVOX — Jest: filter/list thunks behind My Team, Requests, DPA, COE and NEO
 *
 * Sources under test:
 *   src/store/actions/filters/myTeamActions.js
 *   src/store/actions/filters/requestListActions.js
 *   src/store/actions/filters/dpaActions.js
 *   src/store/actions/requests/coeActions.js
 *   src/store/actions/neo/neoActions.js
 *
 * Menu paths: My Team -> Team List / Team Schedule, Requests -> My Requests & My Team Requests,
 *             Admin -> DPA List, Requests -> Certificate of Employment, HR -> NEO Onboarding
 *
 * Coverage before this file: myTeamActions 6 uncovered branch arms, requestListActions 3,
 *   coeActions 6, neoActions 4, dpaActions 2.
 *
 * Rules asserted here (both arms of every conditional):
 *   - The request list dispatches the MY TEAM action names only when the caller asks for
 *     `my_team_requests`; every other scope gets the personal ones and no status-number refresh.
 *   - Team schedule fans out to the day / week / month+custom reducers, to the "show more"
 *     reducer, or to a CSV download when the caller asked to export everything.
 *   - The COE download filename comes from the content-disposition header when the server
 *     sends one, and falls back to certificate-of-employment.pdf when it does not.
 *   - NEO thunks act only on HTTP 200; any other status is ignored.
 *   - Every thunk routes failures through Formatter.alert_error.
 */

jest.mock('../../../../services/API', () => ({
    __esModule: true,
    default: { call: jest.fn(), export: jest.fn() },
}));

jest.mock('../../../../services/Formatter', () => ({
    __esModule: true,
    default: {
        alert_success: jest.fn((result, timeOut) => ({ type: 'SHOW_ALERT', __arm: 'success', result, timeOut })),
        alert_error: jest.fn((error) => ({ type: 'SHOW_ALERT', __arm: 'error', error })),
        alert_error_message: jest.fn((msg) => ({ type: 'SHOW_ALERT_MESSAGE', errorMessage: msg })),
    },
}));

import API from '../../../../services/API';
import Formatter from '../../../../services/Formatter';
import {
    fetchMyTeamList,
    fetchTeamUnderDepartment,
    fetchSubDepartmentUnderDepartment,
    fetchDepartmentsTeams,
    fetchTeamSchedule,
    exportDtrSummary,
} from '../../../../store/actions/filters/myTeamActions';
import {
    fetchRequestList,
    fetchStatusNumbers,
    fetchRequestListDisputes,
    myfetchStatusNumbers_dashboard,
    get_dashboard_holiday,
    fetchStatusNumbers_dashboard,
    bulkRequest,
    eventclick,
    eventclick1,
    payrollperiod,
} from '../../../../store/actions/filters/requestListActions';
import { fetchDpaList, exportDpaList } from '../../../../store/actions/filters/dpaActions';
import { addCOE, fetchCOE } from '../../../../store/actions/requests/coeActions';
import {
    fetchNeoOnboardingUsers,
    sendNeoOnboardingLink,
    fetchNeoSubmissionUsers,
    fetchNeoSubmissionData,
} from '../../../../store/actions/neo/neoActions';

const flush = () => new Promise((resolve) => setImmediate(resolve));
const failure = { status: 500, statusText: 'Server Error', data: {} };

let dispatch;
let getState;
let clickedLinks;

beforeEach(() => {
    jest.clearAllMocks();
    // clearAllMocks keeps queued mockResolvedValueOnce values; reset the API doubles outright so
    // an unconsumed queue entry from an earlier test can never leak into the next one.
    API.call.mockReset();
    API.export.mockReset();
    document.body.innerHTML = '';
    dispatch = jest.fn();
    getState = jest.fn(() => ({}));
    clickedLinks = [];
    // jsdom 11 has no URL.createObjectURL; the browser supplies it.
    window.URL.createObjectURL = jest.fn(() => 'blob:evox/csv');
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

describe('myTeamActions — team lists', () => {
    test('fetchMyTeamList records the filters used before the list comes back', async () => {
        API.call.mockResolvedValueOnce({ data: { content: { users: [{ id: 1 }] } } });

        fetchMyTeamList(7, { page: 2, search: 'ana' })(dispatch, getState);

        expect(dispatch).toHaveBeenNthCalledWith(1, {
            type: 'SET_MY_TEAM_LIST_FILTERS',
            filters: { page: 2, search: 'ana' },
        });
        await flush();
        expect(API.call).toHaveBeenCalledWith({
            method: 'get',
            url: '/user/7/my_team_list',
            params: { page: 2, search: 'ana' },
        });
        expect(dispatch).toHaveBeenNthCalledWith(2, {
            type: 'FETCH_MY_TEAM_LIST_SUCCESS',
            list: { users: [{ id: 1 }] },
        });
    });

    test('fetchMyTeamList called with no filters still records the empty filter set', async () => {
        API.call.mockResolvedValueOnce({ data: { content: {} } });

        fetchMyTeamList(7)(dispatch, getState);
        await flush();

        expect(dispatch).toHaveBeenNthCalledWith(1, {
            type: 'SET_MY_TEAM_LIST_FILTERS',
            filters: null,
        });
        expect(API.call).toHaveBeenCalledWith({
            method: 'get',
            url: '/user/7/my_team_list',
            params: null,
        });
    });

    test('a failed team list surfaces an alert instead of a list', async () => {
        API.call.mockRejectedValueOnce(failure);

        fetchMyTeamList(7, {})(dispatch, getState);
        await flush();

        expect(Formatter.alert_error).toHaveBeenCalledWith(failure);
        expect(dispatch).toHaveBeenCalledWith(Formatter.alert_error.mock.results[0].value);
    });

    test('fetchTeamUnderDepartment reads the teams of one department', async () => {
        API.call.mockResolvedValueOnce({ data: { content: [{ id: 2, name: 'Team A' }] } });

        fetchTeamUnderDepartment(7, 4)(dispatch, getState);
        await flush();

        expect(API.call).toHaveBeenCalledWith({ method: 'get', url: '/user/7/team_list/4' });
        expect(dispatch).toHaveBeenCalledWith({
            type: 'FETCH_TEAM_UNDER_DEPARTMENT_LIST_SUCCESS',
            list: [{ id: 2, name: 'Team A' }],
        });
    });

    test('a failed department team list surfaces an alert', async () => {
        API.call.mockRejectedValueOnce(failure);

        fetchTeamUnderDepartment(7, 4)(dispatch, getState);
        await flush();

        expect(dispatch).toHaveBeenCalledWith(Formatter.alert_error.mock.results[0].value);
    });

    test('fetchSubDepartmentUnderDepartment reads the sub-departments of one department', async () => {
        API.call.mockResolvedValueOnce({ data: { content: [{ id: 9 }] } });

        fetchSubDepartmentUnderDepartment(7, 4)(dispatch, getState);
        await flush();

        expect(API.call).toHaveBeenCalledWith({ method: 'get', url: '/user/7/sub_department/4' });
        expect(dispatch).toHaveBeenCalledWith({
            type: 'FETCH_SUB_DEPARTMENT_LIST_SUCCESS',
            list: [{ id: 9 }],
        });
    });

    test('a failed sub-department list surfaces an alert', async () => {
        API.call.mockRejectedValueOnce(failure);

        fetchSubDepartmentUnderDepartment(7, 4)(dispatch, getState);
        await flush();

        expect(dispatch).toHaveBeenCalledWith(Formatter.alert_error.mock.results[0].value);
    });

    test('fetchDepartmentsTeams posts the selected departments and stores the combined list', async () => {
        API.call.mockResolvedValueOnce({ data: { content: [{ id: 1 }, { id: 2 }] } });

        fetchDepartmentsTeams(7, { departments: [1, 2] })(dispatch, getState);
        await flush();

        expect(API.call).toHaveBeenCalledWith({
            method: 'post',
            url: '/user/7/team_list_all/',
            data: { departments: [1, 2] },
        });
        expect(dispatch).toHaveBeenCalledWith({
            type: 'FETCH_DEPS_TEAM_UNDER_DEPARTMENT_LIST_SUCCESS',
            list: [{ id: 1 }, { id: 2 }],
        });
    });

    test('fetchDepartmentsTeams called with no payload still posts and a failure alerts', async () => {
        API.call.mockRejectedValueOnce(failure);

        fetchDepartmentsTeams(7)(dispatch, getState);
        await flush();

        expect(API.call).toHaveBeenCalledWith({
            method: 'post',
            url: '/user/7/team_list_all/',
            data: null,
        });
        expect(dispatch).toHaveBeenCalledWith(Formatter.alert_error.mock.results[0].value);
    });
});

describe('myTeamActions — team schedule scopes', () => {
    const schedulePayload = { data: { content: [{ emp_num: 'EV1' }] } };

    test('an export of everything downloads team_schedule.csv and dispatches nothing', async () => {
        API.call.mockResolvedValueOnce({ data: 'emp_num,date' });

        fetchTeamSchedule({ export: 'all' })(dispatch, getState);
        await flush();

        expect(API.call).toHaveBeenCalledWith({
            method: 'get',
            url: '/report/team_schedule?link=team_schedule',
            params: { export: 'all' },
        });
        expect(clickedLinks).toHaveLength(1);
        expect(clickedLinks[0].getAttribute('download')).toBe('team_schedule.csv');
        expect(dispatch).not.toHaveBeenCalled();
    });

    test('"show more" appends to the daily schedule and carries the start date', async () => {
        API.call.mockResolvedValueOnce(schedulePayload);

        fetchTeamSchedule({ show_more: true, scope_type: 'day', start_date: '2026-08-18' })(dispatch, getState);
        await flush();

        expect(dispatch).toHaveBeenCalledWith({
            type: 'FETCH_DAILY_TEAM_SCHEDULE_MORE_SUCCESS',
            team_schedule: [{ emp_num: 'EV1' }],
            date: '2026-08-18',
        });
        expect(clickedLinks).toHaveLength(0);
    });

    test('the day scope dispatches the daily schedule', async () => {
        API.call.mockResolvedValueOnce(schedulePayload);

        fetchTeamSchedule({ scope_type: 'day' })(dispatch, getState);
        await flush();

        expect(dispatch).toHaveBeenCalledWith({
            type: 'FETCH_DAILY_TEAM_SCHEDULE_SUCCESS',
            team_schedule: [{ emp_num: 'EV1' }],
        });
    });

    test('the week scope dispatches the weekly schedule', async () => {
        API.call.mockResolvedValueOnce(schedulePayload);

        fetchTeamSchedule({ scope_type: 'week' })(dispatch, getState);
        await flush();

        expect(dispatch).toHaveBeenCalledWith({
            type: 'FETCH_WEEKLY_TEAM_SCHEDULE_SUCCESS',
            team_schedule: [{ emp_num: 'EV1' }],
        });
    });

    test('the month scope dispatches the monthly schedule', async () => {
        API.call.mockResolvedValueOnce(schedulePayload);

        fetchTeamSchedule({ scope_type: 'month' })(dispatch, getState);
        await flush();

        expect(dispatch).toHaveBeenCalledWith({
            type: 'FETCH_MONTHLY_TEAM_SCHEDULE_SUCCESS',
            team_schedule: [{ emp_num: 'EV1' }],
        });
    });

    test('a custom date range reuses the monthly schedule reducer', async () => {
        API.call.mockResolvedValueOnce(schedulePayload);

        fetchTeamSchedule({ scope_type: 'custom' })(dispatch, getState);
        await flush();

        expect(dispatch).toHaveBeenCalledWith({
            type: 'FETCH_MONTHLY_TEAM_SCHEDULE_SUCCESS',
            team_schedule: [{ emp_num: 'EV1' }],
        });
    });

    test('an unknown scope dispatches nothing at all', async () => {
        API.call.mockResolvedValueOnce(schedulePayload);

        fetchTeamSchedule({ scope_type: 'year' })(dispatch, getState);
        await flush();

        expect(dispatch).not.toHaveBeenCalled();
    });

    test('a failed team schedule surfaces an alert', async () => {
        API.call.mockRejectedValueOnce(failure);

        fetchTeamSchedule({ scope_type: 'day' })(dispatch, getState);
        await flush();

        expect(dispatch).toHaveBeenCalledWith(Formatter.alert_error.mock.results[0].value);
    });

    test('a team schedule requested with no filters at all surfaces an alert', async () => {
        API.call.mockResolvedValueOnce(schedulePayload);

        fetchTeamSchedule()(dispatch, getState);
        await flush();

        expect(API.call).toHaveBeenCalledWith({
            method: 'get',
            url: '/report/team_schedule?link=team_schedule',
            params: null,
        });
        expect(dispatch).toHaveBeenCalledWith(Formatter.alert_error.mock.results[0].value);
    });

    test('the team-scoped DTR summary export downloads dtr_summary.csv', async () => {
        API.export.mockResolvedValueOnce({ data: 'emp_num,hours' });

        exportDtrSummary({ department_id: 4 })(dispatch, getState);
        await flush();

        expect(API.export).toHaveBeenCalledWith({
            method: 'get',
            url: '/report/dtr_summary/export',
            params: { department_id: 4 },
        });
        expect(clickedLinks[0].getAttribute('download')).toBe('dtr_summary.csv');
    });

    test('a failed DTR summary export surfaces an alert and downloads nothing', async () => {
        API.export.mockRejectedValueOnce(failure);

        exportDtrSummary()(dispatch, getState);
        await flush();

        expect(clickedLinks).toHaveLength(0);
        expect(dispatch).toHaveBeenCalledWith(Formatter.alert_error.mock.results[0].value);
    });
});

describe('requestListActions — request list scopes', () => {
    const listPayload = {
        data: { content: { result: { status_numbers: { pending: 3 } }, requests: [] } },
    };

    test('the my-team scope stores the team filters, list, department refresh and status numbers', async () => {
        API.call.mockResolvedValueOnce(listPayload);

        fetchRequestList({ url: 'my_team_requests', status: 'pending' })(dispatch, getState);

        expect(dispatch).toHaveBeenNthCalledWith(1, {
            type: 'SET_MY_TEAM_REQUEST_LIST_FILTERS',
            filters: { url: 'my_team_requests', status: 'pending' },
        });
        await flush();

        const types = dispatch.mock.calls.map((c) => c[0].type);
        expect(types).toEqual([
            'SET_MY_TEAM_REQUEST_LIST_FILTERS',
            'FETCH_MY_TEAM_REQUEST_LIST_SUCCESS',
            'FETCH_MY_TEAM_REFRESH_DEP_LIST',
            'FETCH_MY_TEAM_REQUEST_STATUS_NUMBERS',
        ]);
        expect(dispatch).toHaveBeenLastCalledWith({
            type: 'FETCH_MY_TEAM_REQUEST_STATUS_NUMBERS',
            statusNumbers: { pending: 3 },
        });
    });

    test('the personal scope stores only the personal filters and list', async () => {
        API.call.mockResolvedValueOnce(listPayload);

        fetchRequestList({ url: 'my_requests', status: 'pending' })(dispatch, getState);
        await flush();

        const types = dispatch.mock.calls.map((c) => c[0].type);
        expect(types).toEqual(['SET_MY_REQUEST_LIST_FILTERS', 'FETCH_MY_REQUEST_LIST_SUCCESS']);
    });

    test('a failed request list surfaces an alert after the filters were stored', async () => {
        API.call.mockRejectedValueOnce(failure);

        fetchRequestList({ url: 'my_requests' })(dispatch, getState);
        await flush();

        expect(dispatch).toHaveBeenLastCalledWith(Formatter.alert_error.mock.results[0].value);
    });

    test('fetchStatusNumbers uses the team counters for the team scope', async () => {
        API.call.mockResolvedValueOnce({
            data: { content: { status_numbers: { pending: 2 } } },
        });

        fetchStatusNumbers({ url: 'my_team_requests', request_type: 'overtime' })(dispatch, getState);
        await flush();

        expect(dispatch).toHaveBeenNthCalledWith(1, {
            type: 'FETCH_MY_TEAM_REQUEST_STATUS_NUMBERS',
            statusNumbers: { pending: 2 },
        });
        expect(dispatch).toHaveBeenNthCalledWith(2, {
            type: 'EVENT_CLICK',
            requesttype: 'overtime',
        });
    });

    test('fetchStatusNumbers uses the personal counters for any other scope', async () => {
        API.call.mockResolvedValueOnce({
            data: { content: { status_numbers: { pending: 1 } } },
        });

        fetchStatusNumbers({ url: 'my_requests', request_type: 'all' })(dispatch, getState);
        await flush();

        expect(dispatch).toHaveBeenNthCalledWith(1, {
            type: 'FETCH_MY_REQUEST_STATUS_NUMBERS',
            statusNumbers: { pending: 1 },
        });
    });

    test('a failed status-number call surfaces an alert', async () => {
        API.call.mockRejectedValueOnce(failure);

        fetchStatusNumbers({ url: 'my_requests' })(dispatch, getState);
        await flush();

        expect(dispatch).toHaveBeenCalledWith(Formatter.alert_error.mock.results[0].value);
    });

    test('the dispute list is stored with its count only on HTTP 200', async () => {
        API.call.mockResolvedValueOnce({
            status: 200,
            data: { content: { dispute_list: [{ id: 5 }], dispute_count: 1 } },
        });

        fetchRequestListDisputes({ page: 1 })(dispatch, getState);
        await flush();

        expect(dispatch).toHaveBeenCalledWith({
            type: 'FETCH_MY_DISPUTE_REQUEST_LIST_SUCCESS',
            disputeRequestList: [{ id: 5 }],
            disputeRequestCount: 1,
        });
    });

    test('a non-200 dispute response is ignored', async () => {
        API.call.mockResolvedValueOnce({ status: 204, data: { content: {} } });

        fetchRequestListDisputes()(dispatch, getState);
        await flush();

        expect(dispatch).not.toHaveBeenCalled();
    });

    test('a failed dispute list surfaces an alert', async () => {
        API.call.mockRejectedValueOnce(failure);

        fetchRequestListDisputes()(dispatch, getState);
        await flush();

        expect(dispatch).toHaveBeenCalledWith(Formatter.alert_error.mock.results[0].value);
    });

    test('the retired personal dashboard counter thunk is a no-op that calls no endpoint', () => {
        const setters = [jest.fn(), jest.fn(), jest.fn(), jest.fn(), jest.fn()];

        myfetchStatusNumbers_dashboard(...setters)(dispatch, getState);

        expect(API.call).not.toHaveBeenCalled();
        expect(dispatch).not.toHaveBeenCalled();
        setters.forEach((setter) => expect(setter).not.toHaveBeenCalled());
    });

    test('the dashboard holiday call feeds both the local setter and the store', async () => {
        const setHoliday = jest.fn();
        API.call.mockResolvedValueOnce({ data: [{ name: 'Independence Day' }] });

        get_dashboard_holiday(setHoliday, '2026-08-01', '2026-08-31')(dispatch, getState);
        await flush();

        expect(API.call).toHaveBeenCalledWith({
            method: 'get',
            url: '/report/get_dashboard_holiday',
            params: { start_date: '2026-08-01', end_date: '2026-08-31' },
        });
        expect(setHoliday).toHaveBeenCalledWith([{ name: 'Independence Day' }]);
        expect(dispatch).toHaveBeenCalledWith({
            type: 'DASHBOARD_HOLIDAY',
            dashboardholiday: [{ name: 'Independence Day' }],
        });
    });

    test('a failed holiday call alerts and leaves the local setter alone', async () => {
        const setHoliday = jest.fn();
        API.call.mockRejectedValueOnce(failure);

        get_dashboard_holiday(setHoliday, '2026-08-01', '2026-08-31')(dispatch, getState);
        await flush();

        expect(setHoliday).not.toHaveBeenCalled();
        expect(dispatch).toHaveBeenCalledWith(Formatter.alert_error.mock.results[0].value);
    });

    test('the dashboard pending counters fill every widget setter and the store', async () => {
        const setters = Array.from({ length: 9 }, () => jest.fn());
        API.call.mockResolvedValueOnce({
            data: {
                content: {
                    status_numbers: {
                        team_alterlogpending: 1,
                        team_overtimepending: 2,
                        team_restdayworkpending: 3,
                        team_changeschedulepending: 4,
                        alterlogpending: 5,
                        overtimepending: 6,
                        restdayworkpending: 7,
                        changeschedulepending: 8,
                    },
                },
            },
        });

        fetchStatusNumbers_dashboard(...setters)(dispatch, getState);
        await flush();

        expect(API.call).toHaveBeenCalledWith({
            method: 'get',
            url: '/request/request-numbers_dashboard',
            params: {
                url: 'my_team_requests',
                status: 'pending',
                page: '1',
                request_type: 'all',
                first_load: true,
            },
        });
        expect(setters[0]).toHaveBeenCalledWith(1);
        expect(setters[3]).toHaveBeenCalledWith(4);
        expect(setters[4]).toHaveBeenCalledWith(5);
        expect(setters[7]).toHaveBeenCalledWith(8);
        expect(setters[8]).toHaveBeenCalledWith(true);
        expect(dispatch).toHaveBeenCalledWith({
            type: 'ALTER_LOG_PENDING',
            alterrequest: 1,
            overtimerequest: 2,
            restdayrequest: 3,
            changeschedulerequest: 4,
            myalterrequest: 5,
            myovertimerequest: 6,
            myrestdayrequest: 7,
            mychangeschedulerequest: 8,
        });
    });

    test('a failed counter call alerts and leaves every widget setter untouched', async () => {
        const setters = Array.from({ length: 9 }, () => jest.fn());
        API.call.mockRejectedValueOnce(failure);

        fetchStatusNumbers_dashboard(...setters)(dispatch, getState);
        await flush();

        setters.forEach((setter) => expect(setter).not.toHaveBeenCalled());
        expect(dispatch).toHaveBeenCalledWith(Formatter.alert_error.mock.results[0].value);
    });

    test('a bulk approval alerts for ten seconds and hands the result back to the caller', async () => {
        const result = { data: { message: '3 requests approved' } };
        API.call.mockResolvedValueOnce(result);

        const returned = await bulkRequest({ ids: [1, 2, 3], status: 'approved' })(dispatch, getState);

        expect(API.call).toHaveBeenCalledWith({
            method: 'post',
            url: '/request/bulk-request/',
            data: { ids: [1, 2, 3], status: 'approved' },
        });
        expect(Formatter.alert_success).toHaveBeenCalledWith(result, 10000);
        expect(returned).toBe(result);
    });

    test('a failed bulk approval alerts and re-throws so the screen can stop its spinner', async () => {
        API.call.mockRejectedValueOnce(failure);

        await expect(bulkRequest({ ids: [1] })(dispatch, getState)).rejects.toBe(failure);
        expect(dispatch).toHaveBeenCalledWith(Formatter.alert_error.mock.results[0].value);
    });

    test('the request-type tabs dispatch the clicked type', () => {
        eventclick('overtime')(dispatch, getState);
        eventclick1('rest_day_work')(dispatch, getState);
        payrollperiod('2026-08 Cut-off')(dispatch, getState);

        expect(dispatch).toHaveBeenNthCalledWith(1, { type: 'EVENT_CLICK', requesttype: 'overtime' });
        expect(dispatch).toHaveBeenNthCalledWith(2, { type: 'EVENT_CLICK', requesttype: 'rest_day_work' });
        expect(dispatch).toHaveBeenNthCalledWith(3, {
            type: 'FETCH_PAYROLL_PERIOD',
            payroll: '2026-08 Cut-off',
        });
    });
});

describe('dpaActions', () => {
    test('the DPA list records its filters then stores the list', async () => {
        API.call.mockResolvedValueOnce({ data: { content: { users: [] } } });

        fetchDpaList({ ticked: false })(dispatch, getState);

        expect(dispatch).toHaveBeenNthCalledWith(1, {
            type: 'SET_DPA_LIST_FILTERS',
            filters: { ticked: false },
        });
        await flush();
        expect(dispatch).toHaveBeenNthCalledWith(2, {
            type: 'FETCH_DPA_LIST_SUCCESS',
            list: { users: [] },
        });
    });

    test('the DPA list called with no filters passes null through to the API', async () => {
        API.call.mockRejectedValueOnce(failure);

        fetchDpaList()(dispatch, getState);
        await flush();

        expect(API.call).toHaveBeenCalledWith({
            method: 'get',
            url: '/user/get_dpa_list',
            params: null,
        });
        expect(dispatch).toHaveBeenLastCalledWith(Formatter.alert_error.mock.results[0].value);
    });

    test('the DPA export downloads dpa_list.csv', async () => {
        API.export.mockResolvedValueOnce({ data: 'emp_num,ticked' });

        exportDpaList({ ticked: true })(dispatch, getState);
        await flush();

        expect(API.export).toHaveBeenCalledWith({
            method: 'get',
            url: '/user/export_dpa_list',
            params: { ticked: true },
        });
        expect(clickedLinks[0].getAttribute('download')).toBe('dpa_list.csv');
    });

    test('a failed DPA export alerts and downloads nothing', async () => {
        API.export.mockRejectedValueOnce(failure);

        exportDpaList()(dispatch, getState);
        await flush();

        expect(clickedLinks).toHaveLength(0);
        expect(dispatch).toHaveBeenCalledWith(Formatter.alert_error.mock.results[0].value);
    });
});

describe('coeActions — certificate of employment', () => {
    test('a quoted filename in the content-disposition header names the download', async () => {
        API.export.mockResolvedValueOnce({
            headers: { 'content-disposition': 'attachment; filename="COE-EV0007.pdf"' },
            data: 'pdf-bytes',
        });
        API.call.mockResolvedValueOnce({ data: { content: [] } });

        addCOE({ purpose: 'Visa' })(dispatch, getState);
        await flush();

        expect(API.export).toHaveBeenCalledWith({
            method: 'post',
            url: '/request/coe',
            data: { purpose: 'Visa' },
        });
        expect(dispatch).toHaveBeenCalledWith({
            type: 'REQUEST_COE_SUCCESS',
            data: 'pdf-bytes',
            filename: 'COE-EV0007.pdf',
        });
    });

    test('an unquoted filename is used as it stands', async () => {
        API.export.mockResolvedValueOnce({
            headers: { 'content-disposition': 'attachment; filename=COE-EV0008.pdf' },
            data: 'pdf-bytes',
        });
        API.call.mockResolvedValueOnce({ data: { content: [] } });

        addCOE({ purpose: 'Bank' })(dispatch, getState);
        await flush();

        expect(dispatch).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'REQUEST_COE_SUCCESS', filename: 'COE-EV0008.pdf' }),
        );
    });

    test('a header with no filename falls back to certificate-of-employment.pdf', async () => {
        API.export.mockResolvedValueOnce({
            headers: { 'content-disposition': 'attachment' },
            data: 'pdf-bytes',
        });
        API.call.mockResolvedValueOnce({ data: { content: [] } });

        addCOE({})(dispatch, getState);
        await flush();

        expect(dispatch).toHaveBeenCalledWith(
            expect.objectContaining({ filename: 'certificate-of-employment.pdf' }),
        );
    });

    test('a response with no content-disposition header at all falls back to the default name', async () => {
        API.export.mockResolvedValueOnce({ headers: {}, data: 'pdf-bytes' });
        API.call.mockResolvedValueOnce({ data: { content: [] } });

        addCOE({})(dispatch, getState);
        await flush();

        expect(dispatch).toHaveBeenCalledWith(
            expect.objectContaining({ filename: 'certificate-of-employment.pdf' }),
        );
    });

    test('a failed COE request alerts and dispatches no download', async () => {
        API.export.mockRejectedValueOnce(failure);

        addCOE({})(dispatch, getState);
        await flush();

        expect(dispatch).toHaveBeenCalledWith(Formatter.alert_error.mock.results[0].value);
        expect(dispatch).not.toHaveBeenCalledWith(
            expect.objectContaining({ type: 'REQUEST_COE_SUCCESS' }),
        );
    });

    test('fetchCOE stores the issued certificates', async () => {
        API.call.mockResolvedValueOnce({ data: { content: [{ id: 1, purpose: 'Visa' }] } });

        fetchCOE()(dispatch, getState);
        await flush();

        expect(API.call).toHaveBeenCalledWith({ method: 'get', url: '/request/coe/' });
        expect(dispatch).toHaveBeenCalledWith({
            type: 'FETCH_COE_SUCCESS',
            coe: [{ id: 1, purpose: 'Visa' }],
        });
    });

    test('a failed fetchCOE surfaces an alert', async () => {
        API.call.mockRejectedValueOnce(failure);

        fetchCOE()(dispatch, getState);
        await flush();

        expect(dispatch).toHaveBeenCalledWith(Formatter.alert_error.mock.results[0].value);
    });
});

describe('neoActions — new employee onboarding', () => {
    test('the onboarding list is stored only when the server answers 200', async () => {
        API.call.mockResolvedValueOnce({
            status: 200,
            data: { data: { users: [{ guid: 'abc' }] } },
        });

        await fetchNeoOnboardingUsers('PH')(dispatch, getState);

        expect(API.call).toHaveBeenCalledWith({
            method: 'get',
            url: '/get_neo_onboarding_users/',
            params: { country: 'PH' },
        });
        expect(dispatch).toHaveBeenCalledWith({
            type: 'FETCH_NEO_ONBOARDING_SUCCESS',
            list: [{ guid: 'abc' }],
            isLoaded: true,
        });
    });

    test('a non-200 onboarding response leaves the list untouched', async () => {
        API.call.mockResolvedValueOnce({ status: 204, data: { data: { users: [] } } });

        await fetchNeoOnboardingUsers('IN')(dispatch, getState);

        expect(dispatch).not.toHaveBeenCalled();
    });

    test('a failed onboarding list surfaces an alert', async () => {
        API.call.mockRejectedValueOnce(failure);

        await fetchNeoOnboardingUsers('PH')(dispatch, getState);

        expect(dispatch).toHaveBeenCalledWith(Formatter.alert_error.mock.results[0].value);
    });

    test('sending an onboarding link confirms with a three second success alert', async () => {
        const result = { status: 200, data: { message: 'Link sent' } };
        API.call.mockResolvedValueOnce(result);

        await sendNeoOnboardingLink('abc', 12, 'PH')(dispatch, getState);

        expect(API.call).toHaveBeenCalledWith({
            method: 'post',
            url: '/send_onboarding_link/',
            params: { guid: 'abc', user_id: 12, country: 'PH' },
        });
        expect(Formatter.alert_success).toHaveBeenCalledWith(result, 3000);
    });

    test('a non-200 answer to the onboarding link shows no confirmation', async () => {
        API.call.mockResolvedValueOnce({ status: 202, data: {} });

        await sendNeoOnboardingLink('abc', 12, 'PH')(dispatch, getState);

        expect(Formatter.alert_success).not.toHaveBeenCalled();
        expect(dispatch).not.toHaveBeenCalled();
    });

    test('a failed onboarding link surfaces an alert', async () => {
        API.call.mockRejectedValueOnce(failure);

        await sendNeoOnboardingLink('abc', 12, 'PH')(dispatch, getState);

        expect(dispatch).toHaveBeenCalledWith(Formatter.alert_error.mock.results[0].value);
    });

    test('pending submissions are stored only on HTTP 200', async () => {
        API.call.mockResolvedValueOnce({
            status: 200,
            data: { data: { submissions: [{ guid: 'x' }] } },
        });

        fetchNeoSubmissionUsers('PH')(dispatch, getState);
        await flush();

        expect(dispatch).toHaveBeenCalledWith({
            type: 'FETCH_NEO_SUBMISSION_SUCCESS',
            list: [{ guid: 'x' }],
            isLoaded: true,
        });
    });

    test('a non-200 submissions response is ignored, and a failure alerts', async () => {
        API.call.mockResolvedValueOnce({ status: 500, data: { data: { submissions: [] } } });
        fetchNeoSubmissionUsers('PH')(dispatch, getState);
        await flush();
        expect(dispatch).not.toHaveBeenCalled();

        API.call.mockRejectedValueOnce(failure);
        fetchNeoSubmissionUsers('PH')(dispatch, getState);
        await flush();
        expect(dispatch).toHaveBeenCalledWith(Formatter.alert_error.mock.results[0].value);
    });

    test('one submission carries its BHR number alongside the answers', async () => {
        API.call.mockResolvedValueOnce({
            status: 200,
            data: { data: { submissions: { name: 'Ana' }, bhrNumber: 'BHR-9' } },
        });

        fetchNeoSubmissionData('abc')(dispatch, getState);
        await flush();

        expect(API.call).toHaveBeenCalledWith({
            method: 'get',
            url: '/get_user_submissions_data/',
            params: { guid: 'abc' },
        });
        expect(dispatch).toHaveBeenCalledWith({
            type: 'FETCH_NEO_SUBMISSION_DATA_SUCCESS',
            data: { name: 'Ana' },
            isLoaded: true,
            bhr_num: 'BHR-9',
        });
    });

    test('a non-200 submission detail is ignored, and a failure alerts', async () => {
        API.call.mockResolvedValueOnce({ status: 404, data: { data: {} } });
        fetchNeoSubmissionData('abc')(dispatch, getState);
        await flush();
        expect(dispatch).not.toHaveBeenCalled();

        API.call.mockRejectedValueOnce(failure);
        fetchNeoSubmissionData('abc')(dispatch, getState);
        await flush();
        expect(dispatch).toHaveBeenCalledWith(Formatter.alert_error.mock.results[0].value);
    });
});
