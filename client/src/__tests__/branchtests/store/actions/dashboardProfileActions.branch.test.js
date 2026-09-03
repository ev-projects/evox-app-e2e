/**
 * EVOX — Jest: dashboard, profile, announcement, role and schedule-template thunks
 *
 * Sources under test:
 *   src/store/actions/dashboard/dashboardActions.js
 *   src/store/actions/profile/profileActions.js
 *   src/store/actions/announcement/departmentAnnouncementActions.js
 *   src/store/actions/admin/assignRoleActions.js
 *   src/store/actions/scheduleActions.js (getTemplateSchedule)
 *
 * Menu paths: Dashboard, My Profile, Announcements -> Department Announcements,
 *             Admin -> Assign Role, Schedule -> Templates
 *
 * Coverage before this file: dashboardActions 2 uncovered branch arms, profileActions
 *   4 uncovered functions + 1 branch arm, departmentAnnouncementActions 3,
 *   assignRoleActions 2, scheduleActions 1.
 *
 * Rules asserted here (both arms of every conditional):
 *   - The combined dashboard endpoint fans out by page type: 1 = holiday/leave/pending counters,
 *     2 = birthdays, 3 = announcements — and within type 3, a paged call appends while a first
 *     load replaces the list and refreshes the department filter.
 *   - Editing an announcement returns the editor to whichever list it was opened from.
 *   - Changing a password only clears the forced-change flag when the change was a forced reset.
 *   - Searching users for a dispute warns when the endpoint answers with a non-list payload.
 *   - A schedule template read routes to the template or the default-template reducer, and to
 *     neither for an unknown kind.
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
    getDashboardOverall,
    getMyDtrNotifications,
    getBirthdayAnniv,
    getTeamAttendanceStatus,
    getThisMonthHoliday,
    getRecentDtr,
    getRecentPunches,
    getRecentPunches2,
    clearRecentPunches2,
    clearRecentDtrInstance,
    getMyNotifications,
} from '../../../../store/actions/dashboard/dashboardActions';
import {
    setDateList,
    setEmpSchedule,
    setScope,
    setWeekList,
    fetchProfile,
    fetchPersonalInformation,
    fetchJobInformation,
    fetchLeaveCredits,
    fetchSchedule,
    fetchScheduleHistory,
    fetchTemporarySchedule,
    changePassword,
    tickDpa,
} from '../../../../store/actions/profile/profileActions';
import {
    createDepartmentAnnouncement,
    updateDepartmentAnnouncement,
    fetchDepartmentAnnouncement,
    fetchDepartmentAnnouncementStrict,
    fetchDepartmentAnnouncementList,
    fetchDashboardAnnouncementList,
    incrementDashboardAnnouncementList,
    fetchMyHandleAnnouncementList,
    deleteDepartmentAnnouncement,
    clearDepartmentAnnouncementInstance,
    clearDepartmentAnnouncementListInstance,
} from '../../../../store/actions/announcement/departmentAnnouncementActions';
import {
    fetchUserFeatures,
    fetchUser,
    fetchUserDispute,
    assignLevelFeatures,
} from '../../../../store/actions/admin/assignRoleActions';
import { getTemplateSchedule } from '../../../../store/actions/scheduleActions';

// The app resolves menu links through this global; the house pattern is a Proxy that answers
// every key with a stable path so link lookups never depend on the real route table.
global.links = new Proxy({}, { get: (target, name) => '/x/' + String(name) });

const flush = () => new Promise((resolve) => setImmediate(resolve));
const failure = { status: 500, statusText: 'Server Error', data: {} };

let dispatch;
let getState;

beforeEach(() => {
    jest.clearAllMocks();
    API.call.mockReset();
    API.export.mockReset();
    dispatch = jest.fn();
    getState = jest.fn(() => ({}));
});

describe('dashboardActions — the combined dashboard endpoint', () => {
    test('page type 1 publishes holidays, both leave lists and the pending counters', async () => {
        API.call.mockResolvedValueOnce({
            data: {
                data: {
                    dashboardholiday: [{ name: 'Ninoy Aquino Day' }],
                    todayleaves: [{ emp_num: 'EV1' }],
                    tommorowleaves: [{ emp_num: 'EV2' }],
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

        getDashboardOverall(1)(dispatch, getState);
        await flush();

        expect(API.call).toHaveBeenCalledWith({
            method: 'get',
            url: '/get_dashboard_all/1',
            params: null,
        });
        const types = dispatch.mock.calls.map((c) => c[0].type);
        expect(types).toEqual(['DASHBOARD_HOLIDAY', 'TODAY_LEAVES', 'TOMMOROW_LEAVES', 'ALTER_LOG_PENDING']);
        expect(dispatch).toHaveBeenLastCalledWith({
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

    test('page type 2 publishes only the birthday and anniversary list', async () => {
        API.call.mockResolvedValueOnce({
            data: { data: { team_birthday: [{ emp_num: 'EV1', date: '2026-08-20' }] } },
        });

        getDashboardOverall(2, { department_id: 3 })(dispatch, getState);
        await flush();

        expect(API.call).toHaveBeenCalledWith({
            method: 'get',
            url: '/get_dashboard_all/2',
            params: { department_id: 3 },
        });
        expect(dispatch).toHaveBeenCalledTimes(1);
        expect(dispatch).toHaveBeenCalledWith({
            type: 'FETCH_BIRTHDAY_ANNIVERSARY',
            data: [{ emp_num: 'EV1', date: '2026-08-20' }],
        });
    });

    test('page type 3 on first load replaces the announcements and refreshes the department filter', async () => {
        API.call.mockResolvedValueOnce({
            data: { data: { announcements: [{ id: 1 }], departments: [{ id: 4 }] } },
        });

        getDashboardOverall(3)(dispatch, getState);
        await flush();

        const types = dispatch.mock.calls.map((c) => c[0].type);
        expect(types).toEqual([
            'FETCH_DEPARTMENT_ANNOUNCEMENT_INDEX_LOAD_SUCCESS',
            'FETCH_DEPARTMENT_LIST_SUCCESS',
        ]);
    });

    test('page type 3 with a page number appends to the announcements already shown', async () => {
        API.call.mockResolvedValueOnce({
            data: { data: { announcements: [{ id: 2 }], departments: [{ id: 4 }] } },
        });

        getDashboardOverall(3, { page: 2 })(dispatch, getState);
        await flush();

        expect(dispatch).toHaveBeenCalledTimes(1);
        expect(dispatch).toHaveBeenCalledWith({
            type: 'INCREMENT_DEPARTMENT_ANNOUNCEMENT_INDEX_LOAD_SUCCESS',
            list: [{ id: 2 }],
        });
    });

    test('page type 3 with filters but no page number is still a first load', async () => {
        API.call.mockResolvedValueOnce({
            data: { data: { announcements: [{ id: 3 }], departments: [] } },
        });

        getDashboardOverall(3, { department_id: 4, page: null })(dispatch, getState);
        await flush();

        const types = dispatch.mock.calls.map((c) => c[0].type);
        expect(types).toEqual([
            'FETCH_DEPARTMENT_ANNOUNCEMENT_INDEX_LOAD_SUCCESS',
            'FETCH_DEPARTMENT_LIST_SUCCESS',
        ]);
    });

    test('an unknown page type publishes nothing', async () => {
        API.call.mockResolvedValueOnce({ data: { data: {} } });

        getDashboardOverall(9)(dispatch, getState);
        await flush();

        expect(dispatch).not.toHaveBeenCalled();
    });

    test('a failed dashboard call surfaces an alert', async () => {
        API.call.mockRejectedValueOnce(failure);

        getDashboardOverall(1)(dispatch, getState);
        await flush();

        expect(dispatch).toHaveBeenCalledWith(Formatter.alert_error.mock.results[0].value);
    });
});

describe('dashboardActions — widget feeds', () => {
    test('my DTR notifications are published and a failure alerts', async () => {
        API.call.mockResolvedValueOnce({ data: { content: [{ date: '2026-08-17' }] } });
        getMyDtrNotifications()(dispatch, getState);
        await flush();
        expect(API.call).toHaveBeenCalledWith({ method: 'get', url: '/report/my_dtr_notifications' });
        expect(dispatch).toHaveBeenCalledWith({
            type: 'FETCH_MY_DTR_NOTIFICATIONS',
            data: [{ date: '2026-08-17' }],
        });

        API.call.mockRejectedValueOnce(failure);
        getMyDtrNotifications()(dispatch, getState);
        await flush();
        expect(dispatch).toHaveBeenLastCalledWith(Formatter.alert_error.mock.results[0].value);
    });

    test('the birthday widget passes its filters through and a failure alerts', async () => {
        API.call.mockResolvedValueOnce({ data: { content: [{ emp_num: 'EV1' }] } });
        getBirthdayAnniv({ department_id: 2 })(dispatch, getState);
        await flush();
        expect(API.call).toHaveBeenCalledWith({
            method: 'get',
            url: '/report/team_birthday_anniversary',
            params: { department_id: 2 },
        });
        expect(dispatch).toHaveBeenCalledWith({
            type: 'FETCH_BIRTHDAY_ANNIVERSARY',
            data: [{ emp_num: 'EV1' }],
        });

        API.call.mockRejectedValueOnce(failure);
        getBirthdayAnniv()(dispatch, getState);
        await flush();
        expect(API.call).toHaveBeenLastCalledWith({
            method: 'get',
            url: '/report/team_birthday_anniversary',
            params: null,
        });
        expect(dispatch).toHaveBeenLastCalledWith(Formatter.alert_error.mock.results[0].value);
    });

    test('the team attendance widget passes its filters through and a failure alerts', async () => {
        API.call.mockResolvedValueOnce({ data: { content: { present: 4, absent: 1 } } });
        getTeamAttendanceStatus({ date: '2026-08-18' })(dispatch, getState);
        await flush();
        expect(dispatch).toHaveBeenCalledWith({
            type: 'FETCH_TEAM_ATTENDANCE_STATUS',
            data: { present: 4, absent: 1 },
        });

        API.call.mockRejectedValueOnce(failure);
        getTeamAttendanceStatus()(dispatch, getState);
        await flush();
        expect(dispatch).toHaveBeenLastCalledWith(Formatter.alert_error.mock.results[0].value);
    });

    test('the holiday widget publishes the month holidays and a failure alerts', async () => {
        API.call.mockResolvedValueOnce({ data: { content: [{ name: 'Ninoy Aquino Day' }] } });
        getThisMonthHoliday(7)(dispatch, getState);
        await flush();
        expect(dispatch).toHaveBeenCalledWith({
            type: 'FETCH_HOLIDAYS',
            data: [{ name: 'Ninoy Aquino Day' }],
        });

        API.call.mockRejectedValueOnce(failure);
        getThisMonthHoliday(7)(dispatch, getState);
        await flush();
        expect(dispatch).toHaveBeenLastCalledWith(Formatter.alert_error.mock.results[0].value);
    });

    test('the recent DTR widget reads the date window given to it', async () => {
        API.call.mockResolvedValueOnce({ data: { content: { dtr_records: [{ id: 1 }] } } });
        getRecentDtr(7, '2026-08-17', '2026-08-18')(dispatch, getState);
        await flush();
        expect(API.call).toHaveBeenCalledWith({ method: 'get', url: '/dtr/7/2026-08-17/2026-08-18' });
        expect(dispatch).toHaveBeenCalledWith({ type: 'FETCH_RECENT_DTR', recent_dtr: [{ id: 1 }] });

        API.call.mockRejectedValueOnce(failure);
        getRecentDtr(7, '2026-08-17', '2026-08-18')(dispatch, getState);
        await flush();
        expect(dispatch).toHaveBeenLastCalledWith(Formatter.alert_error.mock.results[0].value);
    });

    test('the punch widgets publish to their own slices and a failure alerts', async () => {
        API.call.mockResolvedValueOnce({ data: { punches: [{ id: 1 }] } });
        getRecentPunches(7, '2026-08-17', '2026-08-18')(dispatch, getState);
        await flush();
        expect(API.call).toHaveBeenCalledWith({ method: 'get', url: '/dtr/punch/7/2026-08-17/2026-08-18' });
        expect(dispatch).toHaveBeenCalledWith({ type: 'FETCH_RECENT_PUNCH', data: { punches: [{ id: 1 }] } });

        API.call.mockResolvedValueOnce({ data: { punches: [] } });
        getRecentPunches2(7, '2026-08-17', '2026-08-18')(dispatch, getState);
        await flush();
        expect(dispatch).toHaveBeenLastCalledWith({
            type: 'FETCH_SINGLE_PUNCH_SUCCESS',
            data: { punches: [] },
        });

        API.call.mockRejectedValueOnce(failure);
        getRecentPunches(7, 'a', 'b')(dispatch, getState);
        await flush();
        expect(dispatch).toHaveBeenLastCalledWith(Formatter.alert_error.mock.results[0].value);

        API.call.mockRejectedValueOnce(failure);
        getRecentPunches2(7, 'a', 'b')(dispatch, getState);
        await flush();
        expect(dispatch).toHaveBeenLastCalledWith(Formatter.alert_error.mock.results[0].value);
    });

    test('the clear thunks reset the punch and DTR widgets without calling the API', () => {
        clearRecentPunches2()(dispatch, getState);
        clearRecentDtrInstance()(dispatch, getState);

        expect(API.call).not.toHaveBeenCalled();
        expect(dispatch).toHaveBeenNthCalledWith(1, { type: 'CLEAR_SINGLE_PUNCH_SUCCESS' });
        expect(dispatch).toHaveBeenNthCalledWith(2, { type: 'CLEAR_RECENT_DTR_INSTANCE' });
    });

    test('the notification bell totals approvals, request updates, announcements, celebrations and missed punches', async () => {
        API.call.mockResolvedValueOnce({
            data: {
                requestsForApproval: [{ id: 1 }, { id: 2 }],
                requestStatus: [{ id: 3 }],
                announcements: [{ id: 4 }],
                celebrations: [{ id: 5 }, { id: 6 }],
                missedDtr: [{ id: 7 }],
            },
        });

        getMyNotifications(7)(dispatch, getState);
        await flush();

        expect(API.call).toHaveBeenCalledWith({ method: 'get', url: '/get_redis_notifications/7' });
        expect(dispatch).toHaveBeenLastCalledWith({
            type: 'FETCH_MY_NOTIFICATIONS_COUNT',
            approval: 3,
            announcement: 1,
            celebration: 2,
            missingdtr: 1,
            alldata: 7,
        });
    });

    test('a failed notification read alerts and publishes no counts', async () => {
        API.call.mockRejectedValueOnce(failure);

        getMyNotifications(7)(dispatch, getState);
        await flush();

        expect(dispatch).toHaveBeenCalledTimes(1);
        expect(dispatch).toHaveBeenCalledWith(Formatter.alert_error.mock.results[0].value);
    });
});

describe('profileActions — schedule scope setters', () => {
    test('the four scope setters publish their payload with no API call', () => {
        setDateList(['2026-08-17', '2026-08-18'])(dispatch, getState);
        setEmpSchedule({ start_time: '09:00' })(dispatch, getState);
        setScope('week')(dispatch, getState);
        setWeekList([['Monday', 'Sunday']])(dispatch, getState);

        expect(API.call).not.toHaveBeenCalled();
        expect(dispatch.mock.calls.map((c) => c[0])).toEqual([
            { type: 'SET_DATE_LIST', date_list: ['2026-08-17', '2026-08-18'] },
            { type: 'SET_EMP_SCHEDULE', emp_sched: { start_time: '09:00' } },
            { type: 'SET_SCOPE', scope: 'week' },
            { type: 'SET_WEEK_LIST', data: [['Monday', 'Sunday']] },
        ]);
    });
});

describe('profileActions — profile reads', () => {
    test('the profile read publishes the user together with the profile picture', async () => {
        API.call.mockResolvedValueOnce({
            data: { content: { user: { id: 7 }, profile_picture: 'ana.png' } },
        });

        fetchProfile(7)(dispatch, getState);
        await flush();

        expect(API.call).toHaveBeenCalledWith({ method: 'get', url: '/user/7/profile' });
        expect(dispatch).toHaveBeenCalledWith({
            type: 'FETCH_PROFILE',
            user: { id: 7 },
            profile_picture: 'ana.png',
        });
    });

    test('personal and job information land in their own slices', async () => {
        API.call.mockResolvedValueOnce({ data: { content: { address: 'Manila' } } });
        fetchPersonalInformation(7)(dispatch, getState);
        await flush();
        expect(dispatch).toHaveBeenCalledWith({
            type: 'FETCH_PERSONAL_INFORMATION',
            personal_information: { address: 'Manila' },
        });

        API.call.mockResolvedValueOnce({
            data: { content: { job_information: { title: 'Analyst' }, employment_status: 'Regular' } },
        });
        fetchJobInformation(7)(dispatch, getState);
        await flush();
        expect(dispatch).toHaveBeenLastCalledWith({
            type: 'FETCH_JOB_INFORMATION',
            job_information: { title: 'Analyst' },
            employment_status: 'Regular',
        });
    });

    test('leave credits, schedule, schedule history and temporary schedules each publish their slice', async () => {
        API.call.mockResolvedValueOnce({ data: { content: { vacation: 5 } } });
        fetchLeaveCredits(7)(dispatch, getState);
        await flush();
        expect(dispatch).toHaveBeenLastCalledWith({
            type: 'FETCH_LEAVE_CREDITS',
            leave_credits: { vacation: 5 },
        });

        API.call.mockResolvedValueOnce({ data: { content: { start_time: '09:00' } } });
        fetchSchedule(7)(dispatch, getState);
        await flush();
        expect(dispatch).toHaveBeenLastCalledWith({
            type: 'FETCH_SCHEDULE',
            schedule: { start_time: '09:00' },
        });

        API.call.mockResolvedValueOnce({ data: { content: [{ id: 1 }] } });
        fetchScheduleHistory(7, { page: 2 })(dispatch, getState);
        await flush();
        expect(API.call).toHaveBeenLastCalledWith({
            method: 'get',
            url: '/user/7/schedule_history/',
            params: { page: 2 },
        });
        expect(dispatch).toHaveBeenLastCalledWith({
            type: 'FETCH_SCHEDULE_HISTORY',
            schedule_history: [{ id: 1 }],
        });

        API.call.mockResolvedValueOnce({ data: { content: [{ id: 2 }] } });
        fetchTemporarySchedule(7)(dispatch, getState);
        await flush();
        expect(dispatch).toHaveBeenLastCalledWith({
            type: 'FETCH_TEMPORARY_SCHEDULE',
            schedule: [{ id: 2 }],
        });
    });

    test('every profile read surfaces an alert when it fails', async () => {
        const reads = [
            fetchProfile(7),
            fetchPersonalInformation(7),
            fetchJobInformation(7),
            fetchLeaveCredits(7),
            fetchSchedule(7),
            fetchScheduleHistory(7),
            fetchTemporarySchedule(7),
        ];

        for (const read of reads) {
            API.call.mockRejectedValueOnce(failure);
            read(dispatch, getState);
            await flush();
        }

        expect(dispatch).toHaveBeenCalledTimes(reads.length);
        dispatch.mock.calls.forEach(([action]) => expect(action.__arm).toBe('error'));
    });

    test('the schedule history read with no filters passes null through', async () => {
        API.call.mockResolvedValueOnce({ data: { content: [] } });

        fetchScheduleHistory(7)(dispatch, getState);
        await flush();

        expect(API.call).toHaveBeenCalledWith({
            method: 'get',
            url: '/user/7/schedule_history/',
            params: null,
        });
    });
});

describe('profileActions — password change and DPA', () => {
    test('a forced password reset closes the form, confirms, and lowers the forced-change flag', async () => {
        const result = { data: { message: 'Password changed' } };
        API.call.mockResolvedValueOnce(result);

        changePassword(7, { reset_password: true, password: 'x' })(dispatch, getState);
        await flush();

        expect(API.call).toHaveBeenCalledWith({
            method: 'post',
            url: '/user/7/change_password',
            data: { reset_password: true, password: 'x' },
        });
        const types = dispatch.mock.calls.map((c) => c[0].type);
        expect(types).toEqual(['CLOSE_ALL_FORM', 'SHOW_ALERT', 'CLOSE_ALL_FORM', 'TOGGLE_FORCE_CHANGE_PASSWORD']);
        expect(Formatter.alert_success).toHaveBeenCalledWith(result, 3000);
    });

    test('a voluntary password change leaves the forced-change flag alone', async () => {
        API.call.mockResolvedValueOnce({ data: { message: 'Password changed' } });

        changePassword(7, { password: 'x' })(dispatch, getState);
        await flush();

        const types = dispatch.mock.calls.map((c) => c[0].type);
        expect(types).toEqual(['CLOSE_ALL_FORM', 'SHOW_ALERT', 'CLOSE_ALL_FORM']);
    });

    test('a rejected password change alerts and never closes the form', async () => {
        API.call.mockRejectedValueOnce(failure);

        changePassword(7, { password: 'x' })(dispatch, getState);
        await flush();

        expect(dispatch).toHaveBeenCalledTimes(1);
        expect(dispatch).toHaveBeenCalledWith(Formatter.alert_error.mock.results[0].value);
    });

    test('ticking the DPA sends the session id and stamps the acceptance', async () => {
        localStorage.setItem('session_id', 'sess-42');
        const result = { data: { message: 'DPA accepted' } };
        API.call.mockResolvedValueOnce(result);

        tickDpa(7)(dispatch, getState);
        await flush();

        expect(API.call).toHaveBeenCalledWith({
            method: 'post',
            url: '/user/7/tick_dpa',
            data: { session_id: 'sess-42' },
        });
        expect(dispatch).toHaveBeenLastCalledWith({ type: 'TICK_DPA' });
    });

    test('a failed DPA tick alerts and stamps nothing', async () => {
        API.call.mockRejectedValueOnce(failure);

        tickDpa(7)(dispatch, getState);
        await flush();

        expect(dispatch).toHaveBeenCalledTimes(1);
        expect(dispatch).toHaveBeenCalledWith(Formatter.alert_error.mock.results[0].value);
    });
});

describe('departmentAnnouncementActions', () => {
    const formDataStub = (values) => ({ get: (key) => (key in values ? values[key] : null) });

    test('creating an announcement posts multipart and returns to the department list', async () => {
        const result = { data: { message: 'Announcement created' } };
        API.call.mockResolvedValueOnce(result);
        const payload = formDataStub({ title: 'Town hall' });

        createDepartmentAnnouncement(payload)(dispatch, getState);
        await flush();

        expect(API.call).toHaveBeenCalledWith({
            method: 'post',
            url: '/department/announcements/create ',
            headers: { 'Content-Type': 'multipart/form-data' },
            data: payload,
        });
        expect(Formatter.alert_success).toHaveBeenCalledWith(result, 3000);
        expect(dispatch).toHaveBeenLastCalledWith({
            type: 'SET_REDIRECT',
            link: global.links.department_announcement_list,
        });
    });

    test('a failed create alerts and redirects nowhere', async () => {
        API.call.mockRejectedValueOnce(failure);

        createDepartmentAnnouncement(formDataStub({}))(dispatch, getState);
        await flush();

        expect(dispatch).toHaveBeenCalledTimes(1);
        expect(dispatch).toHaveBeenCalledWith(Formatter.alert_error.mock.results[0].value);
    });

    test('an edit opened from the admin list returns to the admin list', async () => {
        API.call.mockResolvedValueOnce({ data: { message: 'Updated' } });

        updateDepartmentAnnouncement(9, formDataStub({ previousPath: 'AdminAnnouncementList' }))(dispatch, getState);
        await flush();

        expect(API.call).toHaveBeenCalledWith(
            expect.objectContaining({
                method: 'post',
                url: '/department/announcements/my_handle_announcements/9/update',
            }),
        );
        expect(dispatch).toHaveBeenLastCalledWith({
            type: 'SET_REDIRECT',
            link: global.links.admin_announcement_list,
        });
    });

    test('an edit opened from anywhere else returns to the department list', async () => {
        API.call.mockResolvedValueOnce({ data: { message: 'Updated' } });

        updateDepartmentAnnouncement(9, formDataStub({ previousPath: 'DepartmentAnnouncementList' }))(dispatch, getState);
        await flush();

        expect(dispatch).toHaveBeenLastCalledWith({
            type: 'SET_REDIRECT',
            link: global.links.department_announcement_list,
        });
    });

    test('an edit with no recorded origin returns to the department list', async () => {
        API.call.mockResolvedValueOnce({ data: { message: 'Updated' } });

        updateDepartmentAnnouncement(9, formDataStub({}))(dispatch, getState);
        await flush();

        expect(dispatch).toHaveBeenLastCalledWith({
            type: 'SET_REDIRECT',
            link: global.links.department_announcement_list,
        });
    });

    test('a failed edit alerts and redirects nowhere', async () => {
        API.call.mockRejectedValueOnce(failure);

        updateDepartmentAnnouncement(9, formDataStub({}))(dispatch, getState);
        await flush();

        expect(dispatch).toHaveBeenCalledTimes(1);
        expect(dispatch).toHaveBeenCalledWith(Formatter.alert_error.mock.results[0].value);
    });

    test('the open and strict reads both publish one announcement', async () => {
        API.call.mockResolvedValueOnce({ data: { content: { id: 9, title: 'Town hall' } } });
        fetchDepartmentAnnouncement(9)(dispatch, getState);
        await flush();
        expect(API.call).toHaveBeenCalledWith({ method: 'get', url: '/department/announcements/9' });
        expect(dispatch).toHaveBeenLastCalledWith({
            type: 'FETCH_DEPARTMENT_ANNOUNCEMENT_SUCCESS',
            announcement: { id: 9, title: 'Town hall' },
        });

        API.call.mockResolvedValueOnce({ data: { content: { id: 9 } } });
        fetchDepartmentAnnouncementStrict(9)(dispatch, getState);
        await flush();
        expect(API.call).toHaveBeenLastCalledWith({
            method: 'get',
            url: '/department/announcements/strict/9',
        });
    });

    test('a failed read of either kind surfaces an alert', async () => {
        API.call.mockRejectedValueOnce(failure);
        fetchDepartmentAnnouncement(9)(dispatch, getState);
        await flush();
        expect(dispatch).toHaveBeenLastCalledWith(Formatter.alert_error.mock.results[0].value);

        API.call.mockRejectedValueOnce(failure);
        fetchDepartmentAnnouncementStrict(9)(dispatch, getState);
        await flush();
        expect(dispatch).toHaveBeenCalledTimes(2);
    });

    test('the three list reads publish to the index slice and the paged one appends', async () => {
        API.call.mockResolvedValueOnce({ data: { content: [{ id: 1 }] } });
        fetchDepartmentAnnouncementList({ page: 1 })(dispatch, getState);
        await flush();
        expect(API.call).toHaveBeenLastCalledWith({
            method: 'get',
            url: '/department/announcements/all',
            params: { page: 1 },
        });
        expect(dispatch).toHaveBeenLastCalledWith({
            type: 'FETCH_DEPARTMENT_ANNOUNCEMENT_INDEX_LOAD_SUCCESS',
            list: [{ id: 1 }],
        });

        API.call.mockResolvedValueOnce({ data: { content: [{ id: 2 }] } });
        fetchDashboardAnnouncementList()(dispatch, getState);
        await flush();
        expect(API.call).toHaveBeenLastCalledWith({
            method: 'get',
            url: '/department/announcements/dashboard_departments',
            params: null,
        });

        API.call.mockResolvedValueOnce({ data: { content: [{ id: 3 }] } });
        incrementDashboardAnnouncementList({ page: 2 })(dispatch, getState);
        await flush();
        expect(dispatch).toHaveBeenLastCalledWith({
            type: 'INCREMENT_DEPARTMENT_ANNOUNCEMENT_INDEX_LOAD_SUCCESS',
            list: [{ id: 3 }],
        });

        API.call.mockResolvedValueOnce({ data: { content: [{ id: 4 }] } });
        fetchMyHandleAnnouncementList()(dispatch, getState);
        await flush();
        expect(API.call).toHaveBeenLastCalledWith({
            method: 'get',
            url: '/department/announcements/my_handle_announcements/all',
        });
    });

    test('each list read surfaces an alert when it fails', async () => {
        const reads = [
            fetchDepartmentAnnouncementList(),
            fetchDashboardAnnouncementList(),
            incrementDashboardAnnouncementList(),
            fetchMyHandleAnnouncementList(),
        ];

        for (const read of reads) {
            API.call.mockRejectedValueOnce(failure);
            read(dispatch, getState);
            await flush();
        }

        expect(dispatch).toHaveBeenCalledTimes(reads.length);
        dispatch.mock.calls.forEach(([action]) => expect(action.__arm).toBe('error'));
    });

    test('deleting an announcement confirms with no timeout, and a failure alerts', async () => {
        const result = { data: { message: 'Deleted' } };
        API.call.mockResolvedValueOnce(result);
        deleteDepartmentAnnouncement(9)(dispatch, getState);
        await flush();
        expect(API.call).toHaveBeenCalledWith({
            method: 'delete',
            url: '/department/announcements/my_handle_announcements/9/',
        });
        expect(Formatter.alert_success).toHaveBeenCalledWith(result);

        API.call.mockRejectedValueOnce(failure);
        deleteDepartmentAnnouncement(9)(dispatch, getState);
        await flush();
        expect(dispatch).toHaveBeenLastCalledWith(Formatter.alert_error.mock.results[0].value);
    });

    test('the two clear thunks empty the instance and the list without calling the API', () => {
        clearDepartmentAnnouncementInstance()(dispatch, getState);
        clearDepartmentAnnouncementListInstance()(dispatch, getState);

        expect(API.call).not.toHaveBeenCalled();
        expect(dispatch.mock.calls.map((c) => c[0].type)).toEqual([
            'CLEAR_DEPARTMENT_ANNOUNCEMENT_INSTANCE',
            'CLEAR_DEPARTMENT_ANNOUNCEMENT_LIST_INSTANCE',
        ]);
    });
});

describe('assignRoleActions', () => {
    test('reading a user\'s features publishes the level and the feature list', async () => {
        API.call.mockResolvedValueOnce({
            data: { content: { level: { Name: 'Supervisor' }, features: ['dtr', 'requests'] } },
        });

        fetchUserFeatures(7)(dispatch, getState);
        await flush();

        expect(API.call).toHaveBeenCalledWith({ method: 'get', url: '/user/7/features' });
        expect(dispatch).toHaveBeenCalledWith({
            type: 'FETCH_USER_FEATURES',
            userLevel: { Name: 'Supervisor' },
            userFeatures: ['dtr', 'requests'],
        });
    });

    test('a failed feature read surfaces an alert', async () => {
        API.call.mockRejectedValueOnce(failure);

        fetchUserFeatures(7)(dispatch, getState);
        await flush();

        expect(dispatch).toHaveBeenCalledWith(Formatter.alert_error.mock.results[0].value);
    });

    test('the user search publishes the matches for the typed name', async () => {
        API.call.mockResolvedValueOnce({ data: { content: [{ id: 7, name: 'Ana' }] } });

        fetchUser('ana')(dispatch, getState);
        await flush();

        expect(API.call).toHaveBeenCalledWith({ method: 'get', url: '/user/search-user/ana' });
        expect(dispatch).toHaveBeenCalledWith({
            type: 'FETCH_USER',
            userLists: [{ id: 7, name: 'Ana' }],
        });
    });

    test('a failed user search surfaces an alert', async () => {
        API.call.mockRejectedValueOnce(failure);

        fetchUser('ana')(dispatch, getState);
        await flush();

        expect(dispatch).toHaveBeenCalledWith(Formatter.alert_error.mock.results[0].value);
    });

    test('the dispute user search publishes a list without warning when the server sends one', async () => {
        API.call.mockResolvedValueOnce({ data: [{ id: 7 }, { id: 8 }] });

        fetchUserDispute()(dispatch, getState);
        await flush();

        expect(Formatter.alert_error_message).not.toHaveBeenCalled();
        expect(dispatch).toHaveBeenCalledTimes(1);
        expect(dispatch).toHaveBeenCalledWith({
            type: 'FETCH_DEP_USER_LIST',
            data: [{ id: 7 }, { id: 8 }],
        });
    });

    test('a dispute search that answers with no list warns that no user was found', async () => {
        API.call.mockResolvedValueOnce({ data: { content: null } });

        fetchUserDispute()(dispatch, getState);
        await flush();

        expect(Formatter.alert_error_message).toHaveBeenCalledWith('No User Found...');
        expect(dispatch.mock.calls.map((c) => c[0].type)).toEqual([
            'SHOW_ALERT_MESSAGE',
            'FETCH_DEP_USER_LIST',
        ]);
    });

    test('a failed dispute search surfaces an alert', async () => {
        API.call.mockRejectedValueOnce(failure);

        fetchUserDispute()(dispatch, getState);
        await flush();

        expect(dispatch).toHaveBeenCalledWith(Formatter.alert_error.mock.results[0].value);
    });

    test('assigning a level confirms and pushes the updated user into the store', async () => {
        const result = { data: { content: { id: 7, level: { Name: 'Manager' } }, message: 'Saved' } };
        API.call.mockResolvedValueOnce(result);

        assignLevelFeatures(7, { level_id: 3, features: ['dtr'] })(dispatch, getState);
        await flush();

        expect(API.call).toHaveBeenCalledWith({
            method: 'POST',
            url: '/user/7/assign_level_features/',
            data: { level_id: 3, features: ['dtr'] },
        });
        expect(Formatter.alert_success).toHaveBeenCalledWith(result, 3000);
        expect(dispatch).toHaveBeenLastCalledWith({
            type: 'UPDATE_USER',
            user: { id: 7, level: { Name: 'Manager' } },
        });
    });

    test('a rejected level assignment alerts and updates no user', async () => {
        API.call.mockRejectedValueOnce(failure);

        assignLevelFeatures(7, {})(dispatch, getState);
        await flush();

        expect(dispatch).toHaveBeenCalledTimes(1);
        expect(dispatch).toHaveBeenCalledWith(Formatter.alert_error.mock.results[0].value);
    });
});

describe('scheduleActions — getTemplateSchedule', () => {
    test('a template read publishes to the template slice between the reload markers', async () => {
        API.call.mockResolvedValueOnce({ data: { content: { id: 3, name: 'Standard' } } });

        getTemplateSchedule(3, 'Template')(dispatch, getState);

        expect(dispatch).toHaveBeenNthCalledWith(1, { type: 'RELOAD_START' });
        await flush();

        expect(API.call).toHaveBeenCalledWith({ method: 'get', url: '/schedule/3/' });
        expect(dispatch.mock.calls.map((c) => c[0].type)).toEqual([
            'RELOAD_START',
            'FETCH_TEMPLATE_SCHEDULE_SUCCESS',
            'RELOAD_END',
        ]);
        expect(dispatch).toHaveBeenNthCalledWith(2, {
            type: 'FETCH_TEMPLATE_SCHEDULE_SUCCESS',
            templatedata: { id: 3, name: 'Standard' },
        });
    });

    test('a default-template read publishes to the default-template slice', async () => {
        API.call.mockResolvedValueOnce({ data: { content: { id: 1 } } });

        getTemplateSchedule(1, 'Default')(dispatch, getState);
        await flush();

        expect(dispatch).toHaveBeenNthCalledWith(2, {
            type: 'FETCH_TEMPLATE_DEFAULT_SCHEDULE_SUCCESS',
            templatedata: { id: 1 },
        });
    });

    test('an unknown template kind publishes under an empty action type', async () => {
        API.call.mockResolvedValueOnce({ data: { content: { id: 5 } } });

        getTemplateSchedule(5, 'Something else')(dispatch, getState);
        await flush();

        expect(dispatch).toHaveBeenNthCalledWith(2, { type: '', templatedata: { id: 5 } });
    });

    test('a failed template read alerts with the raw HTTP response', async () => {
        API.call.mockRejectedValueOnce({ response: { status: 404, statusText: 'Not Found' } });

        getTemplateSchedule(3, 'Template')(dispatch, getState);
        await flush();

        expect(Formatter.alert_error).toHaveBeenCalledWith({ status: 404, statusText: 'Not Found' });
        expect(dispatch.mock.calls.map((c) => c[0].type)).toEqual(['RELOAD_START', 'SHOW_ALERT']);
    });
});
