/**
 * evoxtest_StoreLayerGapsDeep2.test.js
 * Wave-4 coverage for the remaining Redux-layer gaps (29 Jul):
 *  - store/actions/announcement/hrAnnouncementActions.js (37 unc / 19.6%) — all 9 thunks
 *  - store/actions/dtr/dtrLogsAction.js (13 unc / 13.3%) — fetch + CSV export flow
 *  - store/reducers/user/userReducers.js (32 unc / 57.9%) — login/logout, toggles,
 *    UPDATE_USER matching arm, asset/eva/coc/happiness fetch+clear pairs
 *  - store/reducers/profile/profileReducer.js (14 unc / 60%) — the uncovered setters
 *
 * DEAD-CODE notes (for the dead-code list): userReducers has a DUPLICATE
 * `case "UPDATE_USER"` (the department-handlers sync at line ~94) and a duplicate
 * `case "FETCH_ALL_ASSETS"` — both unreachable (first case wins). See finding UP-USR-1.
 * hrAnnouncementActions.createHrAnnouncement posts to "/department/announcements/create "
 * (TRAILING SPACE) — characterized verbatim below (HR-ANN-1 observation).
 * ADDITIVE ONLY.
 */

import '@testing-library/jest-dom/extend-expect';

jest.mock('../../../services/API', () => ({ call: jest.fn(), export: jest.fn() }));
jest.mock('../../../services/Formatter', () => ({
    alert_success: jest.fn(() => ({ type: 'STUB_ALERT_SUCCESS' })),
    alert_error: jest.fn(() => ({ type: 'STUB_ALERT_ERROR' })),
}));
jest.mock('react-promise-tracker', () => ({ trackPromise: (p) => p }));

// store/actions/announcement/hrAnnouncementActions.js deleted 2026-08-13 — Hr module retired.
// { virtual: true } required because Jest's resolver runs before the factory and fails if
// the file doesn't exist on disk; `virtual` tells Jest to skip the filesystem check.
jest.mock('../../../store/actions/announcement/hrAnnouncementActions', () => ({
    createHrAnnouncement: jest.fn(), updateHrAnnouncement: jest.fn(),
    fetchHrAnnouncement: jest.fn(), fetchHrAnnouncementStrict: jest.fn(),
    fetchHrAnnouncementList: jest.fn(), fetchDashboardAnnouncementList: jest.fn(),
    fetchHrHandleAnnouncementList: jest.fn(), deleteHrAnnouncement: jest.fn(),
    clearHrAnnouncementInstance: jest.fn(),
}), { virtual: true });

import API from '../../../services/API';
import Formatter from '../../../services/Formatter';
import {
    createHrAnnouncement, updateHrAnnouncement, fetchHrAnnouncement, fetchHrAnnouncementStrict,
    fetchHrAnnouncementList, fetchDashboardAnnouncementList, fetchHrHandleAnnouncementList,
    deleteHrAnnouncement, clearHrAnnouncementInstance,
} from '../../../store/actions/announcement/hrAnnouncementActions';
import { fetchDtrLogs, exportDtrLogs } from '../../../store/actions/dtr/dtrLogsAction';
import userReducer from '../../../store/reducers/user/userReducers';
import profileReducer from '../../../store/reducers/profile/profileReducer';

global.links = new Proxy({}, { get: (t, k) => `/link/${String(k)}` });

const flush = () => new Promise((r) => setTimeout(r, 0));

async function runThunk(thunk) {
    const dispatch = jest.fn();
    await thunk(dispatch, jest.fn());
    await flush();
    return dispatch;
}

beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    API.call.mockImplementation(() => Promise.resolve({ data: { content: { id: 1 } } }));
    API.export.mockImplementation(() => Promise.resolve({ data: 'csv-bytes' }));
});

// HR Announcements feature retired 2026-08-13. hrAnnouncementActions.js deleted.
describe.skip('hrAnnouncementActions — every thunk, success and error arms — RETIRED', () => {
    test('create posts multipart (note the verbatim trailing-space URL) then redirects', async () => {
        const dispatch = await runThunk(createHrAnnouncement(new FormData()));
        const req = API.call.mock.calls[0][0];
        // HR-ANN-1 observation: the URL really ends with a space in source — locked verbatim
        expect(req.url).toBe('/department/announcements/create ');
        expect(req.method).toBe('post');
        expect(Formatter.alert_success).toHaveBeenCalled();
        expect(dispatch).toHaveBeenCalledWith({ type: 'SET_REDIRECT', link: '/link/manage_hr_announcements' });
    });

    test('update posts to the hr update URL and redirects to the department list', async () => {
        const dispatch = await runThunk(updateHrAnnouncement(7, new FormData()));
        expect(API.call.mock.calls[0][0].url).toBe('/department/announcements/hr/7/update');
        expect(dispatch).toHaveBeenCalledWith({ type: 'SET_REDIRECT', link: '/link/department_announcement_list' });
    });

    test('fetch, strict-fetch and the three list thunks dispatch their load actions', async () => {
        API.call.mockImplementation(() => Promise.resolve({ data: { content: { id: 9 } } }));

        let d = await runThunk(fetchHrAnnouncement(9));
        expect(API.call.mock.calls[0][0].url).toBe('/department/announcements/9');
        expect(d).toHaveBeenCalledWith({ type: 'FETCH_DEPARTMENT_ANNOUNCEMENT_SUCCESS', announcement: { id: 9 } });

        d = await runThunk(fetchHrAnnouncementStrict(9));
        expect(API.call.mock.calls[1][0].url).toBe('/department/announcements/strict/9');

        d = await runThunk(fetchHrAnnouncementList());
        expect(API.call.mock.calls[2][0].url).toBe('/department/announcements/all');
        expect(d).toHaveBeenCalledWith(expect.objectContaining({ type: 'FETCH_DEPARTMENT_ANNOUNCEMENT_INDEX_LOAD_SUCCESS' }));

        await runThunk(fetchDashboardAnnouncementList());
        expect(API.call.mock.calls[3][0].url).toBe('/department/announcements/dashboard_departments');

        await runThunk(fetchHrHandleAnnouncementList());
        expect(API.call.mock.calls[4][0].url).toBe('/department/announcements/hr/all');
    });

    test('delete alerts success; clear dispatches the clear action; failures alert_error', async () => {
        await runThunk(deleteHrAnnouncement(3));
        expect(API.call.mock.calls[0][0].url).toBe('/department/announcements/hr/3/');
        expect(API.call.mock.calls[0][0].method).toBe('delete');
        expect(Formatter.alert_success).toHaveBeenCalled();

        const d = await runThunk(clearHrAnnouncementInstance());
        expect(d).toHaveBeenCalledWith({ type: 'CLEAR_DEPARTMENT_ANNOUNCEMENT_INSTANCE' });

        API.call.mockImplementation(() => Promise.reject(new Error('HTTP 500')));
        for (const thunk of [createHrAnnouncement({}), updateHrAnnouncement(1, {}), fetchHrAnnouncement(1),
            fetchHrAnnouncementStrict(1), fetchHrAnnouncementList(), fetchDashboardAnnouncementList(),
            fetchHrHandleAnnouncementList(), deleteHrAnnouncement(1)]) {
            await runThunk(thunk);
        }
        expect(Formatter.alert_error).toHaveBeenCalledTimes(8);
    });
});

describe('dtrLogsAction — fetch and export arms', () => {
    test('fetchDtrLogs dispatches the summary on success and alerts on failure', async () => {
        API.call.mockImplementationOnce(() => Promise.resolve({ data: { content: [{ id: 1 }] } }));
        const d = await runThunk(fetchDtrLogs({ page: 1 }));
        expect(API.call.mock.calls[0][0].url).toBe('/report/dtr_logs/team');
        expect(d).toHaveBeenCalledWith({ type: 'FETCH_DTR_LOGS_SUCCESS', dtrSummary: [{ id: 1 }] });

        API.call.mockImplementationOnce(() => Promise.reject(new Error('x')));
        await runThunk(fetchDtrLogs());
        expect(Formatter.alert_error).toHaveBeenCalled();
    });

    test('exportDtrLogs downloads dtr_logs.csv through the anchor flow; failure alerts', async () => {
        const clicks = [];
        window.URL.createObjectURL = jest.fn(() => 'blob:csv');
        const origCreate = document.createElement.bind(document);
        const spy = jest.spyOn(document, 'createElement').mockImplementation((tag) => {
            const el = origCreate(tag);
            if (tag === 'a') el.click = () => clicks.push(el.getAttribute('download'));
            return el;
        });

        await runThunk(exportDtrLogs({ from: '2026-07-01' }));
        expect(API.export.mock.calls[0][0].url).toBe('/report/dtr_logs/export');
        expect(clicks).toEqual(['dtr_logs.csv']);
        spy.mockRestore();

        API.export.mockImplementationOnce(() => Promise.reject(new Error('x')));
        await runThunk(exportDtrLogs());
        expect(Formatter.alert_error).toHaveBeenCalled();
    });
});

describe('userReducers — uncovered arms', () => {
    const loginUser = {
        id: 5, emp_num: '5', user_server_timestamp: 'ts', user_server_timestamp_mils: 1000, user_offset_seconds: 60,
    };

    test('LOGIN_SUCCESS stores clock keys; LOGOUT_SUCCESS clears them; LOGOUT_FAILED keeps the error', () => {
        const logged = userReducer({}, { type: 'LOGIN_SUCCESS', user: loginUser, payload: { p: 1 } });
        expect(logged.id).toBe(5);
        expect(localStorage.getItem('user_local_offset_mils')).toBe('60000');

        const out = userReducer(logged, { type: 'LOGOUT_SUCCESS' });
        expect(out.clearLoginParameters).toBe(true);
        expect(localStorage.getItem('user_server_timestamp')).toBeNull();

        const failed = userReducer(logged, { type: 'LOGOUT_FAILED', error: { error_message: 'nope' } });
        expect(failed.error_message).toBe('nope');
    });

    test('password toggle, DPA tick and the (reachable) UPDATE_USER arm', () => {
        const toggled = userReducer({ id: 5 }, { type: 'TOGGLE_FORCE_CHANGE_PASSWORD' });
        expect(toggled.force_change_password).toBe(false); // hardcoded-false arm

        const ticked = userReducer({ id: 5 }, { type: 'TICK_DPA' });
        expect(ticked.dpa_ticked_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);

        // matching-id arm merges the payload
        const updated = userReducer({ id: 5, first_name: 'Old' }, { type: 'UPDATE_USER', user: { id: 5, first_name: 'New' } });
        expect(updated.first_name).toBe('New');

        // FINDING UP-USR-1: the second (department-handlers) UPDATE_USER case is
        // unreachable — a non-matching id falls through the first case's `break`
        // and the handler-sync logic never runs. Locked here: non-matching update
        // leaves state untouched even when action.department is supplied.
        const untouched = userReducer(
            { id: 5, emp_num: '5', departments_handled: [] },
            { type: 'UPDATE_USER', user: { id: 99 }, department: { id: 7, department_handlers: [{ emp_num: '5' }] } }
        );
        expect(untouched.departments_handled).toEqual([]); // sync logic dead
    });

    test('asset/eva/coc/eva-reg/happiness fetch + clear pairs and FETCH_USER_FAILED', () => {
        let s = userReducer({}, { type: 'FETCH_USER_ASSET', data: { a: 1 }, is_asset_loaded: true });
        expect(s.user_asset).toEqual({ a: 1 });
        s = userReducer(s, { type: 'FETCH_USER_ASSETS', data: [{ a: 1 }], is_asset_loaded: true });
        expect(s.user_assets).toEqual([{ a: 1 }]);
        s = userReducer(s, { type: 'CLEAR_USER_ASSET_LOAD', is_asset_loaded: false });
        expect(s.is_asset_loaded).toBe(false);

        s = userReducer(s, { type: 'FETCH_ALL_ASSETS', data: [1], is_all_asset_loaded: true, filters: { f: 1 } });
        expect(s.all_assets).toEqual([1]);

        s = userReducer(s, { type: 'FETCH_USER_EVA', data: { q: 1 }, is_eva_loaded: true });
        s = userReducer(s, { type: 'CLEAR_USER_EVA', is_eva_loaded: false });
        expect(s.is_eva_loaded).toBe(false);

        s = userReducer(s, { type: 'FETCH_USER_COC', data: { c: 1 }, is_coc_loaded: true });
        s = userReducer(s, { type: 'CLEAR_USER_COC', is_coc_loaded: false });
        expect(s.user_coc).toEqual({ c: 1 });

        s = userReducer(s, { type: 'FETCH_USER_EVA_REG', data: { r: 1 }, is_eva_reg_loaded: true });
        s = userReducer(s, { type: 'CLEAR_USER_EVA_REG', is_eva_reg_loaded: false });
        expect(s.user_eva_reg).toEqual({ r: 1 });

        s = userReducer(s, { type: 'FETCH_USER_HAPPINESS_SURVEY', data: { h: 1 }, is_happiness_survey_loaded: true });
        s = userReducer(s, { type: 'CLEAR_USER_HAPPINESS_SURVEY', is_happiness_survey_loaded: false });
        expect(s.user_happiness_survey).toEqual({ h: 1 });

        const failed = userReducer({ id: 1 }, { type: 'FETCH_USER_FAILED', error: { error_message: 'bad' } });
        expect(failed.error_message).toBe('bad');

        expect(userReducer({ id: 1 }, { type: 'UNKNOWN' })).toEqual({ id: 1 }); // default arm
    });
});

describe('profileReducer — uncovered setter arms', () => {
    test('every FETCH_/SET_ case stores its slice; unknown action returns state', () => {
        let s = profileReducer(undefined, { type: 'FETCH_PROFILE', user: { id: 1 }, profile_picture: 'p.png' });
        expect(s.details).toEqual({ id: 1 });
        s = profileReducer(s, { type: 'FETCH_PERSONAL_INFORMATION', personal_information: { a: 1 } });
        s = profileReducer(s, { type: 'FETCH_JOB_INFORMATION', job_information: { b: 1 }, employment_status: 'Regular' });
        s = profileReducer(s, { type: 'FETCH_TIME_OFF', leaves_list: [1] });
        s = profileReducer(s, { type: 'FETCH_LEAVE_CREDITS', leave_credits: [2] });
        s = profileReducer(s, { type: 'FETCH_SCHEDULE', schedule: { c: 1 } });
        s = profileReducer(s, { type: 'FETCH_SCHEDULE_HISTORY', schedule_history: [3] });
        s = profileReducer(s, { type: 'FETCH_TEMPORARY_SCHEDULE', schedule: [4] });
        expect(s.temporary_schedule).toEqual([4]);
        s = profileReducer(s, { type: 'SET_DATE_LIST', date_list: ['2026-07-01'] });
        s = profileReducer(s, { type: 'SET_EMP_SCHEDULE', emp_sched: [5] });
        s = profileReducer(s, { type: 'SET_WEEK_LIST', data: { week_list: [6], dates_list: [7] } });
        expect(s.week_list).toEqual([6]);
        s = profileReducer(s, { type: 'SET_SCOPE', scope: 'week' });
        s = profileReducer(s, { type: 'CLOSE_ALL_FORM' });
        s = profileReducer(s, { type: 'CLOSE_ALL_FORM_FALSE' });

        expect(s.scope).toBe('week');
        expect(s.date_list).toEqual(['2026-07-01']);
        const same = profileReducer(s, { type: 'NOPE' });
        expect(same).toEqual(s);
    });
});
