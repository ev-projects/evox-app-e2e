/**
 * evoxtest_Reducers_frontend.test.js
 * Pure function tests for all Redux reducers. No React rendering.
 */

window.URL.createObjectURL = jest.fn(() => 'blob:mock');

jest.mock('../../services/Formatter', () => ({
  alert_error: jest.fn(() => ({ type: 'SHOW_ALERT' })),
}));

import overtimeReducers from '../../store/reducers/requests/overtimeReducers';
import changeScheduleReducers from '../../store/reducers/requests/changeScheduleReducers';
import restDayWorkReducers from '../../store/reducers/requests/restDayWorkReducers';
import alterLogReducers from '../../store/reducers/requests/alterLogReducers';
import alterLogPunchReducers from '../../store/reducers/requests/alterLogPunchReducers';
import coeReducers from '../../store/reducers/requests/coeReducers';
import myRequestListReducers from '../../store/reducers/filters/myRequestListReducers';
import myDisputeRequestListReducers from '../../store/reducers/filters/myDisputeRequestListReducers';
import myTeamRequestListReducers from '../../store/reducers/filters/myTeamRequestListReducers';
import myTeamListReducers from '../../store/reducers/filters/myTeamListReducers';
import myDepartmentsTeamsListReducers from '../../store/reducers/filters/myDepartmentsTeamsListReducers';
import dpaListReducers from '../../store/reducers/filters/dpaListReducers';
import alertReducer from '../../store/reducers/settings/alertReducers';
import pageReducer from '../../store/reducers/settings/pageReducers';
import currentActionReducers from '../../store/reducers/settings/currentActionReducers';
import modalLoginReducer from '../../store/reducers/settings/modalLoginReducer';
import settingsReducers from '../../store/reducers/settings/settingsReducers';
import constantReducers from '../../store/reducers/settings/constantReducers';
import redirectReducers from '../../store/reducers/settings/redirectReducers';
import userReducer from '../../store/reducers/user/userReducers';
import dashboardReducers from '../../store/reducers/dashboard/dashboardReducers';
import dtrReducer from '../../store/reducers/dtr/dtrReducers';
import dtrLogs from '../../store/reducers/dtr/dtrLogsReducers';
import dtrSummary from '../../store/reducers/dtr/dtrSummaryReducers';
import dtrConflict from '../../store/reducers/dtr/dtrConflictReducer';
import dtrMultiLogsSummary from '../../store/reducers/dtr/dtrMultiLogsSummaryReducers';
import scheduleReducer from '../../store/reducers/schedule/scheduleReducers';
import teamSchedule from '../../store/reducers/schedule/teamSchedule';
import profileReducer from '../../store/reducers/profile/profileReducer';
import reportReducers from '../../store/reducers/report/reportReducers';
import requestApprovalReducers from '../../store/reducers/approvals/requestApprovalReducers';
import lookupListReducers from '../../store/reducers/lookup/lookupListReducers';
import assignRoleReducers from '../../store/reducers/admin/assignRoleReducers';
import departmentListReducers from '../../store/reducers/admin/departmentListReducers';
import payrollCutoffReducers from '../../store/reducers/admin/payrollCutoffReducers';
import registerUserReducers from '../../store/reducers/admin/registerUserReducers';
import syncReducers from '../../store/reducers/admin/syncReducers';
import departmentAnnouncementReducers from '../../store/reducers/announcements/departmentAnnouncementReducers';
import hrAnnouncementReducers from '../../store/reducers/hr/hrAnnouncementReducers';
import freshServiceReducers from '../../store/reducers/freshservice/freshServiceReducers';
import neoReducers from '../../store/reducers/neo/neoReducers';
import opsScheduleReducers from '../../store/reducers/opsschedule/opsScheduleReducers';

beforeEach(() => jest.clearAllMocks());

// ─── overtimeReducers ─────────────────────────────────────────────────────────

describe('overtimeReducers', () => {
  const init = { isInstanceLoaded: false, instance: {} };

  test('returns initial state on unknown action', () => {
    expect(overtimeReducers(undefined, {})).toEqual(init);
  });

  test('FETCH_OVERTIME_SUCCESS sets instance and isInstanceLoaded', () => {
    const result = overtimeReducers(undefined, { type: 'FETCH_OVERTIME_SUCCESS', overtime: { id: 1 } });
    expect(result.instance).toEqual({ id: 1 });
    expect(result.isInstanceLoaded).toBe(true);
  });

  test('STORE_OVERTIME_SUCCESS returns empty object', () => {
    const result = overtimeReducers(undefined, { type: 'STORE_OVERTIME_SUCCESS' });
    expect(result).toEqual({});
  });

  test('CLEAR_OVERTIME_INSTANCE resets to empty', () => {
    const result = overtimeReducers({ instance: { id: 1 }, isInstanceLoaded: true }, { type: 'CLEAR_OVERTIME_INSTANCE' });
    expect(result).toEqual({ instance: {}, isInstanceLoaded: false });
  });
});

// ─── changeScheduleReducers ───────────────────────────────────────────────────

describe('changeScheduleReducers', () => {
  test('returns initial state on unknown action', () => {
    expect(changeScheduleReducers(undefined, {})).toEqual({ isInstanceLoaded: false, instance: {} });
  });

  test('FETCH_CHANGE_SCHEDULE_SUCCESS sets instance', () => {
    const result = changeScheduleReducers(undefined, { type: 'FETCH_CHANGE_SCHEDULE_SUCCESS', changeSchedule: { id: 5 } });
    expect(result.instance).toEqual({ id: 5 });
    expect(result.isInstanceLoaded).toBe(true);
  });

  test('RESET_CHANGE_SCHEDULE_INSTANCE keeps id', () => {
    const result = changeScheduleReducers({ instance: { id: 7, name: 'x' }, isInstanceLoaded: true }, { type: 'RESET_CHANGE_SCHEDULE_INSTANCE' });
    expect(result.instance).toEqual({ id: 7 });
    expect(result.isInstanceLoaded).toBe(true);
  });

  test('CLEAR_CHANGE_SCHEDULE_INSTANCE resets', () => {
    const result = changeScheduleReducers({ instance: { id: 7 }, isInstanceLoaded: true }, { type: 'CLEAR_CHANGE_SCHEDULE_INSTANCE' });
    expect(result).toEqual({ instance: {}, isInstanceLoaded: false });
  });
});

// ─── restDayWorkReducers ──────────────────────────────────────────────────────

describe('restDayWorkReducers', () => {
  test('returns initial state on unknown action', () => {
    expect(restDayWorkReducers(undefined, {})).toEqual({ isInstanceLoaded: false, instance: {} });
  });

  test('FETCH_REST_DAY_WORK_SUCCESS sets instance', () => {
    const result = restDayWorkReducers(undefined, { type: 'FETCH_REST_DAY_WORK_SUCCESS', restDayWork: { id: 3 } });
    expect(result.instance).toEqual({ id: 3 });
    expect(result.isInstanceLoaded).toBe(true);
  });

  test('RESET_REST_DAY_WORK_INSTANCE keeps id', () => {
    const result = restDayWorkReducers({ instance: { id: 4, note: 'x' }, isInstanceLoaded: true }, { type: 'RESET_REST_DAY_WORK_INSTANCE' });
    expect(result.instance).toEqual({ id: 4 });
  });

  test('CLEAR_REST_DAY_WORK_INSTANCE resets', () => {
    const result = restDayWorkReducers({ instance: { id: 4 }, isInstanceLoaded: true }, { type: 'CLEAR_REST_DAY_WORK_INSTANCE' });
    expect(result).toEqual({ instance: {}, isInstanceLoaded: false });
  });
});

// ─── alterLogReducers ─────────────────────────────────────────────────────────

describe('alterLogReducers', () => {
  test('returns initial state on unknown action', () => {
    expect(alterLogReducers(undefined, {})).toEqual({ isInstanceLoaded: false, instance: {} });
  });

  test('FETCH_ALTER_LOG_SUCCESS sets instance', () => {
    const result = alterLogReducers(undefined, { type: 'FETCH_ALTER_LOG_SUCCESS', alterLog: { id: 2 } });
    expect(result.instance).toEqual({ id: 2 });
    expect(result.isInstanceLoaded).toBe(true);
  });

  test('RESET_ALTER_LOG_INSTANCE keeps id', () => {
    const result = alterLogReducers({ instance: { id: 8, x: 1 }, isInstanceLoaded: true }, { type: 'RESET_ALTER_LOG_INSTANCE' });
    expect(result.instance).toEqual({ id: 8 });
  });

  test('CLEAR_ALTER_LOG_INSTANCE resets', () => {
    const result = alterLogReducers({ instance: { id: 8 }, isInstanceLoaded: true }, { type: 'CLEAR_ALTER_LOG_INSTANCE' });
    expect(result).toEqual({ instance: {}, isInstanceLoaded: false });
  });
});

// ─── alterLogPunchReducers ────────────────────────────────────────────────────

describe('alterLogPunchReducers', () => {
  test('returns initial state on unknown action', () => {
    expect(alterLogPunchReducers(undefined, {})).toEqual({ isInstanceLoaded: false, instance: {} });
  });

  test('FETCH_ALTER_LOG_PUNCH_SUCCESS sets instance', () => {
    const result = alterLogPunchReducers(undefined, { type: 'FETCH_ALTER_LOG_PUNCH_SUCCESS', alterLogPunch: { id: 9 } });
    expect(result.instance).toEqual({ id: 9 });
    expect(result.isInstanceLoaded).toBe(true);
  });

  test('RESET_ALTER_LOG_PUNCH_INSTANCE keeps id', () => {
    const result = alterLogPunchReducers({ instance: { id: 9, y: 2 }, isInstanceLoaded: true }, { type: 'RESET_ALTER_LOG_PUNCH_INSTANCE' });
    expect(result.instance).toEqual({ id: 9 });
  });

  test('CLEAR_ALTER_LOG_PUNCH_INSTANCE resets', () => {
    const result = alterLogPunchReducers({ instance: { id: 9 }, isInstanceLoaded: true }, { type: 'CLEAR_ALTER_LOG_PUNCH_INSTANCE' });
    expect(result).toEqual({ instance: {}, isInstanceLoaded: false });
  });
});

// ─── coeReducers ─────────────────────────────────────────────────────────────

describe('coeReducers', () => {
  test('returns initial state on unknown action', () => {
    expect(coeReducers(undefined, {})).toEqual({ isInstanceLoaded: false, instance: {} });
  });

  test('FETCH_COE_SUCCESS sets instance', () => {
    const result = coeReducers(undefined, { type: 'FETCH_COE_SUCCESS', coe: { id: 10 } });
    expect(result.instance).toEqual({ id: 10 });
    expect(result.isInstanceLoaded).toBe(true);
  });

  test('REQUEST_COE_SUCCESS triggers download and returns state', () => {
    const prevState = { instance: { id: 10 }, isInstanceLoaded: true };
    const result = coeReducers(prevState, { type: 'REQUEST_COE_SUCCESS', data: 'pdfdata', filename: 'coe.pdf' });
    expect(window.URL.createObjectURL).toHaveBeenCalled();
    expect(result).toEqual(prevState);
  });
});

// ─── myRequestListReducers ────────────────────────────────────────────────────

describe('myRequestListReducers', () => {
  const init = { isListLoaded: false, isNumbersLoaded: false, instance: {}, statusNumbers: null, filters: {} };

  test('returns initial state on unknown action', () => {
    expect(myRequestListReducers(undefined, {})).toEqual(init);
  });

  test('FETCH_MY_REQUEST_LIST_SUCCESS_INITIALLY sets instance', () => {
    const result = myRequestListReducers(undefined, { type: 'FETCH_MY_REQUEST_LIST_SUCCESS_INITIALLY', requestList: [1, 2] });
    expect(result.instance).toEqual([1, 2]);
    expect(result.isListLoaded).toBe(true);
  });

  test('FETCH_MY_REQUEST_LIST_SUCCESS sets instance', () => {
    const result = myRequestListReducers(undefined, { type: 'FETCH_MY_REQUEST_LIST_SUCCESS', requestList: [3] });
    expect(result.instance).toEqual([3]);
    expect(result.isListLoaded).toBe(true);
  });

  test('FETCH_MY_REQUEST_STATUS_NUMBERS sets statusNumbers', () => {
    const result = myRequestListReducers(undefined, { type: 'FETCH_MY_REQUEST_STATUS_NUMBERS', statusNumbers: { pending: 2 } });
    expect(result.statusNumbers).toEqual({ pending: 2 });
    expect(result.isNumbersLoaded).toBe(true);
  });

  test('SET_MY_REQUEST_LIST_FILTERS sets filters', () => {
    const result = myRequestListReducers(undefined, { type: 'SET_MY_REQUEST_LIST_FILTERS', filters: { status: 'pending' } });
    expect(result.filters).toEqual({ status: 'pending' });
  });
});

// ─── myDisputeRequestListReducers ─────────────────────────────────────────────

describe('myDisputeRequestListReducers', () => {
  test('returns initial state on unknown action', () => {
    expect(myDisputeRequestListReducers(undefined, {})).toEqual({ isListLoaded: false, isNumbersLoaded: false, instance: {}, statusNumbers: null, filters: {} });
  });

  test('FETCH_MY_DISPUTE_REQUEST_LIST_SUCCESS sets instance', () => {
    const result = myDisputeRequestListReducers(undefined, {
      type: 'FETCH_MY_DISPUTE_REQUEST_LIST_SUCCESS',
      disputeRequestList: [{ id: 1 }],
      disputeRequestCount: 1,
    });
    expect(result.instance).toEqual([{ id: 1 }]);
    expect(result.instanceCount).toBe(1);
    expect(result.isListLoaded).toBe(true);
  });
});

// ─── myTeamRequestListReducers ────────────────────────────────────────────────

describe('myTeamRequestListReducers', () => {
  test('returns initial state on unknown action', () => {
    const result = myTeamRequestListReducers(undefined, {});
    expect(result.isListLoaded).toBe(false);
  });

  test('FETCH_MY_TEAM_REQUEST_LIST_SUCCESS sets instance', () => {
    const result = myTeamRequestListReducers(undefined, { type: 'FETCH_MY_TEAM_REQUEST_LIST_SUCCESS', requestList: [{ id: 1 }] });
    expect(result.instance).toEqual([{ id: 1 }]);
    expect(result.isListLoaded).toBe(true);
  });

  test('FETCH_MY_TEAM_REFRESH_DEP_LIST with non-empty department updates stored_departments', () => {
    const result = myTeamRequestListReducers(undefined, {
      type: 'FETCH_MY_TEAM_REFRESH_DEP_LIST',
      content: { result: { department: [{ id: 1 }] } },
    });
    expect(result.stored_departments).toEqual([{ id: 1 }]);
  });

  test('FETCH_MY_TEAM_REFRESH_DEP_LIST with empty department returns state', () => {
    const result = myTeamRequestListReducers(undefined, {
      type: 'FETCH_MY_TEAM_REFRESH_DEP_LIST',
      content: { result: { department: [] } },
    });
    expect(result.stored_departments).toEqual({});
  });

  test('FETCH_MY_TEAM_REQUEST_STATUS_NUMBERS sets statusNumbers', () => {
    const result = myTeamRequestListReducers(undefined, { type: 'FETCH_MY_TEAM_REQUEST_STATUS_NUMBERS', statusNumbers: { total: 5 } });
    expect(result.statusNumbers).toEqual({ total: 5 });
    expect(result.isNumbersLoaded).toBe(true);
  });

  test('SET_MY_TEAM_REQUEST_LIST_FILTERS sets filters', () => {
    const result = myTeamRequestListReducers(undefined, { type: 'SET_MY_TEAM_REQUEST_LIST_FILTERS', filters: { type: 'overtime' } });
    expect(result.filters).toEqual({ type: 'overtime' });
  });

  test('EVENT_CLICK sets requesttype', () => {
    const result = myTeamRequestListReducers(undefined, { type: 'EVENT_CLICK', requesttype: 'overtime' });
    expect(result.requesttype).toBe('overtime');
  });

  test('OVERRALL_REQUEST sets overrallstatusNumbers', () => {
    const result = myTeamRequestListReducers(undefined, { type: 'OVERRALL_REQUEST', overrallstatusNumbers: { total: 10 } });
    expect(result.overrallstatusNumbers).toEqual({ total: 10 });
  });
});

// ─── myTeamListReducers ───────────────────────────────────────────────────────

describe('myTeamListReducers', () => {
  test('returns initial state on unknown action', () => {
    expect(myTeamListReducers(undefined, {}).list).toBeNull();
  });

  test('FETCH_MY_TEAM_LIST_SUCCESS sets list', () => {
    const result = myTeamListReducers(undefined, { type: 'FETCH_MY_TEAM_LIST_SUCCESS', list: [{ id: 1 }] });
    expect(result.list).toEqual([{ id: 1 }]);
  });

  test('FETCH_TEAM_LIST_SUCCESS sets team_list', () => {
    const result = myTeamListReducers(undefined, { type: 'FETCH_TEAM_LIST_SUCCESS', list: [{ id: 2 }] });
    expect(result.team_list).toEqual([{ id: 2 }]);
  });

  test('SET_MY_TEAM_LIST_FILTERS sets filters', () => {
    const result = myTeamListReducers(undefined, { type: 'SET_MY_TEAM_LIST_FILTERS', filters: { q: 'john' } });
    expect(result.filters).toEqual({ q: 'john' });
  });

  test('FETCH_TEAM_UNDER_DEPARTMENT_LIST_SUCCESS sets team_list', () => {
    const result = myTeamListReducers(undefined, { type: 'FETCH_TEAM_UNDER_DEPARTMENT_LIST_SUCCESS', list: [{ id: 3 }] });
    expect(result.team_list).toEqual([{ id: 3 }]);
  });

  test('FETCH_SUB_DEPARTMENT_LIST_SUCCESS sets sub_department', () => {
    const result = myTeamListReducers(undefined, { type: 'FETCH_SUB_DEPARTMENT_LIST_SUCCESS', list: [{ id: 4 }] });
    expect(result.sub_department).toEqual([{ id: 4 }]);
  });
});

// ─── myDepartmentsTeamsListReducers ──────────────────────────────────────────

describe('myDepartmentsTeamsListReducers', () => {
  test('returns initial state on unknown action', () => {
    expect(myDepartmentsTeamsListReducers(undefined, {}).list).toBeNull();
  });

  test('FETCH_MY_DEPS_TEAM_LIST_SUCCESS sets list', () => {
    const result = myDepartmentsTeamsListReducers(undefined, { type: 'FETCH_MY_DEPS_TEAM_LIST_SUCCESS', list: [1] });
    expect(result.list).toEqual([1]);
  });

  test('FETCH_DEPS_TEAM_LIST_SUCCESS sets team_list', () => {
    const result = myDepartmentsTeamsListReducers(undefined, { type: 'FETCH_DEPS_TEAM_LIST_SUCCESS', list: [2] });
    expect(result.team_list).toEqual([2]);
  });

  test('SET_MY_DEPS_TEAM_LIST_FILTERS sets filters', () => {
    const result = myDepartmentsTeamsListReducers(undefined, { type: 'SET_MY_DEPS_TEAM_LIST_FILTERS', filters: { x: 1 } });
    expect(result.filters).toEqual({ x: 1 });
  });

  test('FETCH_DEPS_TEAM_UNDER_DEPARTMENT_LIST_SUCCESS sets team_list', () => {
    const result = myDepartmentsTeamsListReducers(undefined, { type: 'FETCH_DEPS_TEAM_UNDER_DEPARTMENT_LIST_SUCCESS', list: [3] });
    expect(result.team_list).toEqual([3]);
  });
});

// ─── dpaListReducers ─────────────────────────────────────────────────────────

describe('dpaListReducers', () => {
  test('returns initial state on unknown action', () => {
    expect(dpaListReducers(undefined, {})).toEqual({ list: null, filters: {} });
  });

  test('FETCH_DPA_LIST_SUCCESS sets list', () => {
    const result = dpaListReducers(undefined, { type: 'FETCH_DPA_LIST_SUCCESS', list: [{ id: 1 }] });
    expect(result.list).toEqual([{ id: 1 }]);
  });

  test('SET_DPA_LIST_FILTERS sets filters', () => {
    const result = dpaListReducers(undefined, { type: 'SET_DPA_LIST_FILTERS', filters: { status: 'active' } });
    expect(result.filters).toEqual({ status: 'active' });
  });
});

// ─── alertReducer ────────────────────────────────────────────────────────────

describe('alertReducer', () => {
  test('returns initial state on unknown action', () => {
    const result = alertReducer(undefined, {});
    expect(result.onShow).toBe(false);
  });

  test('SHOW_ALERT with error produces danger variant', () => {
    const result = alertReducer(undefined, {
      type: 'SHOW_ALERT',
      error: { data: { error: { message: 'fail' } } },
    });
    expect(result.onShow).toBe(true);
    expect(result.variant).toBe('danger');
    expect(result.body).toBe('fail');
  });

  test('SHOW_ALERT without error produces success variant', () => {
    const result = alertReducer(undefined, { type: 'SHOW_ALERT', header: 'Done' });
    expect(result.variant).toBe('success');
    expect(result.header).toBe('Done');
  });

  test('SHOW_ALERT_MESSAGE produces danger with errorMessage', () => {
    const result = alertReducer(undefined, { type: 'SHOW_ALERT_MESSAGE', errorMessage: 'bad input' });
    expect(result.onShow).toBe(true);
    expect(result.variant).toBe('danger');
    expect(result.body).toBe('bad input');
  });

  test('HIDE_ALERT returns initial state', () => {
    const result = alertReducer({ onShow: true, variant: 'danger' }, { type: 'HIDE_ALERT' });
    expect(result.onShow).toBe(false);
  });

  test('TOGGLE_TIMEOUT flips isTimeOutActive', () => {
    const result = alertReducer({ onShow: true, isTimeOutActive: false }, { type: 'TOGGLE_TIMEOUT' });
    expect(result.isTimeOutActive).toBe(true);
  });
});

// ─── pageReducer ─────────────────────────────────────────────────────────────

describe('pageReducer', () => {
  test('returns initial state on unknown action', () => {
    expect(pageReducer(undefined, {})).toEqual({ isReloading: false, isRequesting: false });
  });

  test('RELOAD_START sets isReloading true', () => {
    expect(pageReducer(undefined, { type: 'RELOAD_START' }).isReloading).toBe(true);
  });

  test('RELOAD_END sets isReloading false', () => {
    expect(pageReducer({ isReloading: true }, { type: 'RELOAD_END' }).isReloading).toBe(false);
  });

  test('REQUEST_START sets isRequesting true', () => {
    expect(pageReducer(undefined, { type: 'REQUEST_START' }).isRequesting).toBe(true);
  });

  test('REQUEST_END sets isRequesting false', () => {
    expect(pageReducer({ isRequesting: true }, { type: 'REQUEST_END' }).isRequesting).toBe(false);
  });
});

// ─── currentActionReducers ────────────────────────────────────────────────────

describe('currentActionReducers', () => {
  test('returns initial state on unknown action', () => {
    expect(currentActionReducers(undefined, {})).toEqual({});
  });

  test('EVENT_CLICK spreads requesttype into state', () => {
    const result = currentActionReducers(undefined, { type: 'EVENT_CLICK', requesttype: { label: 'overtime' } });
    expect(result).toEqual({ label: 'overtime' });
  });
});

// ─── modalLoginReducer ────────────────────────────────────────────────────────

describe('modalLoginReducer', () => {
  test('returns initial state on unknown action', () => {
    expect(modalLoginReducer(undefined, {})).toEqual({ onShow: false });
  });

  test('SHOW_MODAL_LOGIN sets onShow true', () => {
    expect(modalLoginReducer(undefined, { type: 'SHOW_MODAL_LOGIN' }).onShow).toBe(true);
  });

  test('HIDE_MODAL_LOGIN resets to initial', () => {
    expect(modalLoginReducer({ onShow: true }, { type: 'HIDE_MODAL_LOGIN' }).onShow).toBe(false);
  });
});

// ─── settingsReducers ─────────────────────────────────────────────────────────

describe('settingsReducers', () => {
  test('returns empty initial state on unknown action', () => {
    expect(settingsReducers(undefined, {})).toEqual({});
  });

  test('RENDER_SETTINGS spreads settings', () => {
    const result = settingsReducers(undefined, { type: 'RENDER_SETTINGS', settings: { theme: 'dark' } });
    expect(result).toEqual({ theme: 'dark' });
  });
});

// ─── constantReducers ─────────────────────────────────────────────────────────

describe('constantReducers', () => {
  test('returns empty initial state on unknown action', () => {
    expect(constantReducers(undefined, {})).toEqual({});
  });

  test('RENDER_CONSTANT spreads constant', () => {
    const result = constantReducers(undefined, { type: 'RENDER_CONSTANT', constant: { roles: ['admin'] } });
    expect(result).toEqual({ roles: ['admin'] });
  });
});

// ─── redirectReducers ─────────────────────────────────────────────────────────

describe('redirectReducers', () => {
  test('returns initial state on unknown action', () => {
    expect(redirectReducers(undefined, {})).toEqual({ run: false, link: null });
  });

  test('SET_REDIRECT sets run and link', () => {
    const result = redirectReducers(undefined, { type: 'SET_REDIRECT', link: '/dashboard' });
    expect(result).toEqual({ run: true, link: '/dashboard' });
  });

  test('SET_REDIRECT without link sets link to null', () => {
    const result = redirectReducers(undefined, { type: 'SET_REDIRECT' });
    expect(result).toEqual({ run: true, link: null });
  });

  test('CLEAR_REDIRECT resets to initial', () => {
    const result = redirectReducers({ run: true, link: '/x' }, { type: 'CLEAR_REDIRECT' });
    expect(result).toEqual({ run: false, link: null });
  });
});

// ─── userReducer ─────────────────────────────────────────────────────────────

describe('userReducer', () => {
  test('returns initial state on unknown action', () => {
    expect(userReducer(undefined, {})).toEqual({ error_message: '' });
  });

  test('LOGIN_SUCCESS returns user + payload', () => {
    const user = { id: 1, name: 'Alice', user_server_timestamp: 'ts', user_server_timestamp_mils: 0, user_offset_seconds: 28800 };
    const result = userReducer(undefined, { type: 'LOGIN_SUCCESS', user, payload: 'p' });
    expect(result.id).toBe(1);
    expect(result.payload).toBe('p');
  });

  test('LOGOUT_SUCCESS clears user', () => {
    const result = userReducer({ id: 1 }, { type: 'LOGOUT_SUCCESS' });
    expect(result.error_message).toBe('');
    expect(result.clearLoginParameters).toBe(true);
  });

  test('LOGOUT_FAILED spreads error', () => {
    const result = userReducer(undefined, { type: 'LOGOUT_FAILED', error: { message: 'err' } });
    expect(result.message).toBe('err');
  });

  test('FETCH_USER_SUCCESS returns user', () => {
    const user = { id: 2, user_server_timestamp: 'ts', user_server_timestamp_mils: 0, user_offset_seconds: 0 };
    const result = userReducer(undefined, { type: 'FETCH_USER_SUCCESS', user, payload: 'x' });
    expect(result.id).toBe(2);
  });

  test('TOGGLE_FORCE_CHANGE_PASSWORD sets to false', () => {
    const result = userReducer({ force_change_password: true }, { type: 'TOGGLE_FORCE_CHANGE_PASSWORD' });
    expect(result.force_change_password).toBe(false);
  });

  test('TICK_DPA sets dpa_ticked_at string', () => {
    const result = userReducer({}, { type: 'TICK_DPA' });
    expect(typeof result.dpa_ticked_at).toBe('string');
  });

  test('UPDATE_USER when id matches merges user', () => {
    const result = userReducer({ id: 1, name: 'Old' }, { type: 'UPDATE_USER', user: { id: 1, name: 'New' } });
    expect(result.name).toBe('New');
  });

  test('UPDATE_USER when id differs returns state unchanged', () => {
    const result = userReducer({ id: 1, name: 'Old' }, { type: 'UPDATE_USER', user: { id: 99, name: 'New' } });
    expect(result.name).toBe('Old');
  });

  test('FETCH_USER_ASSET sets user_asset', () => {
    const result = userReducer({}, { type: 'FETCH_USER_ASSET', data: [{ id: 1 }], is_asset_loaded: true });
    expect(result.user_asset).toEqual([{ id: 1 }]);
    expect(result.is_asset_loaded).toBe(true);
  });

  test('FETCH_USER_ASSETS sets user_assets', () => {
    const result = userReducer({}, { type: 'FETCH_USER_ASSETS', data: [{ id: 1 }], is_asset_loaded: true });
    expect(result.user_assets).toEqual([{ id: 1 }]);
  });

  test('CLEAR_USER_ASSET_LOAD sets is_asset_loaded', () => {
    const result = userReducer({ is_asset_loaded: true }, { type: 'CLEAR_USER_ASSET_LOAD', is_asset_loaded: false });
    expect(result.is_asset_loaded).toBe(false);
  });

  test('FETCH_USER_FAILED spreads error', () => {
    const result = userReducer(undefined, { type: 'FETCH_USER_FAILED', error: { code: 403 } });
    expect(result.code).toBe(403);
  });

  test('FETCH_USER_EVA sets user_eva', () => {
    const result = userReducer({}, { type: 'FETCH_USER_EVA', data: { score: 90 }, is_eva_loaded: true });
    expect(result.user_eva).toEqual({ score: 90 });
  });

  test('CLEAR_USER_EVA sets is_eva_loaded', () => {
    const result = userReducer({}, { type: 'CLEAR_USER_EVA', is_eva_loaded: false });
    expect(result.is_eva_loaded).toBe(false);
  });

  test('FETCH_USER_COC sets user_coc', () => {
    const result = userReducer({}, { type: 'FETCH_USER_COC', data: { level: 1 }, is_coc_loaded: true });
    expect(result.user_coc).toEqual({ level: 1 });
  });

  test('CLEAR_USER_COC sets is_coc_loaded', () => {
    const result = userReducer({}, { type: 'CLEAR_USER_COC', is_coc_loaded: false });
    expect(result.is_coc_loaded).toBe(false);
  });

  test('FETCH_USER_EVA_REG sets user_eva_reg', () => {
    const result = userReducer({}, { type: 'FETCH_USER_EVA_REG', data: { reg: 1 }, is_eva_reg_loaded: true });
    expect(result.user_eva_reg).toEqual({ reg: 1 });
  });

  test('CLEAR_USER_EVA_REG sets is_eva_reg_loaded', () => {
    const result = userReducer({}, { type: 'CLEAR_USER_EVA_REG', is_eva_reg_loaded: false });
    expect(result.is_eva_reg_loaded).toBe(false);
  });

  test('FETCH_USER_HAPPINESS_SURVEY sets survey data', () => {
    const result = userReducer({}, { type: 'FETCH_USER_HAPPINESS_SURVEY', data: { q: 1 }, is_happiness_survey_loaded: true });
    expect(result.user_happiness_survey).toEqual({ q: 1 });
  });

  test('CLEAR_USER_HAPPINESS_SURVEY sets flag', () => {
    const result = userReducer({}, { type: 'CLEAR_USER_HAPPINESS_SURVEY', is_happiness_survey_loaded: false });
    expect(result.is_happiness_survey_loaded).toBe(false);
  });
});

// ─── dashboardReducers ────────────────────────────────────────────────────────

describe('dashboardReducers', () => {
  test('returns initial state on unknown action', () => {
    const result = dashboardReducers(undefined, {});
    expect(result.my_dtr_notifications).toEqual([]);
    expect(result.worktour).toBe(true);
  });

  test('FETCH_MY_DTR_NOTIFICATIONS sets data', () => {
    const result = dashboardReducers(undefined, { type: 'FETCH_MY_DTR_NOTIFICATIONS', data: [1] });
    expect(result.my_dtr_notifications).toEqual([1]);
  });

  test('FETCH_MY_NOTIFICATIONS sets data', () => {
    const result = dashboardReducers(undefined, { type: 'FETCH_MY_NOTIFICATIONS', data: [2] });
    expect(result.my_notifications).toEqual([2]);
  });

  test('FETCH_MY_COUNTRY sets country', () => {
    const result = dashboardReducers(undefined, { type: 'FETCH_MY_COUNTRY', data: 'PH' });
    expect(result.my_country).toBe('PH');
  });

  test('FETCH_PAYROLL_CUTOFF sets cutoff', () => {
    const result = dashboardReducers(undefined, { type: 'FETCH_PAYROLL_CUTOFF', data: { id: 1 } });
    expect(result.payroll_cutoff).toEqual({ id: 1 });
  });

  test('FETCH_MY_POLICIES_DOC sets content', () => {
    const result = dashboardReducers(undefined, { type: 'FETCH_MY_POLICIES_DOC', data: { content: 'html' } });
    expect(result.my_doc).toBe('html');
  });

  test('FETCH_MY_POLICY_DOC sets file', () => {
    const result = dashboardReducers(undefined, { type: 'FETCH_MY_POLICY_DOC', data: { url: 'file.pdf' } });
    expect(result.my_doc_file).toEqual({ url: 'file.pdf' });
  });

  test('CLEAR_MY_POLICY_DOC resets to empty array', () => {
    const result = dashboardReducers(undefined, { type: 'CLEAR_MY_POLICY_DOC' });
    expect(result.my_doc_file).toEqual([]);
  });

  test('FETCH_MY_DEPT sets department', () => {
    const result = dashboardReducers(undefined, { type: 'FETCH_MY_DEPT', data: { name: 'Eng' } });
    expect(result.my_department).toEqual({ name: 'Eng' });
  });

  test('FETCH_DISPUTE_LIST sets list', () => {
    const result = dashboardReducers(undefined, { type: 'FETCH_DISPUTE_LIST', data: [1, 2] });
    expect(result.dispute_list).toEqual([1, 2]);
  });

  test('FETCH_DEP_USER_LIST sets user_list', () => {
    const result = dashboardReducers(undefined, { type: 'FETCH_DEP_USER_LIST', data: [3] });
    expect(result.user_list).toEqual([3]);
  });

  test('FETCH_BIRTHDAY_ANNIVERSARY sets data', () => {
    const result = dashboardReducers(undefined, { type: 'FETCH_BIRTHDAY_ANNIVERSARY', data: [{ name: 'Alice' }] });
    expect(result.birthday_and_anniv).toEqual([{ name: 'Alice' }]);
  });

  test('FETCH_TEAM_ATTENDANCE_STATUS sets data', () => {
    const result = dashboardReducers(undefined, { type: 'FETCH_TEAM_ATTENDANCE_STATUS', data: [{ in: 1 }] });
    expect(result.team_attendance).toEqual([{ in: 1 }]);
  });

  test('FETCH_RECENT_DTR sets recent_dtr and isNavDtrLoaded', () => {
    const result = dashboardReducers(undefined, { type: 'FETCH_RECENT_DTR', recent_dtr: [{ date: '2026-06-01' }] });
    expect(result.recent_dtr).toEqual([{ date: '2026-06-01' }]);
    expect(result.isNavDtrLoaded).toBe(true);
  });

  test('FETCH_RECENT_PUNCH sets recent_punch', () => {
    const result = dashboardReducers(undefined, { type: 'FETCH_RECENT_PUNCH', data: { content: [1] } });
    expect(result.recent_punch).toEqual([1]);
    expect(result.isRecentPunchLoaded).toBe(true);
  });

  test('CLEAR_RECENT_DTR_INSTANCE resets', () => {
    const result = dashboardReducers(undefined, { type: 'CLEAR_RECENT_DTR_INSTANCE' });
    expect(result.isNavDtrLoaded).toBe(false);
    expect(result.recent_dtr).toEqual({});
  });

  test('FETCH_HOLIDAYS sets holidays', () => {
    const result = dashboardReducers(undefined, { type: 'FETCH_HOLIDAYS', data: [{ name: 'NY' }] });
    expect(result.holidays).toEqual([{ name: 'NY' }]);
  });

  test('FETCH_CHANGE_LOGS sets changelogs', () => {
    const result = dashboardReducers(undefined, { type: 'FETCH_CHANGE_LOGS', data: [{ v: '1.0' }] });
    expect(result.changelogs).toEqual([{ v: '1.0' }]);
  });

  test('ALTER_LOG_PENDING sets request fields', () => {
    const result = dashboardReducers(undefined, {
      type: 'ALTER_LOG_PENDING',
      alterrequest: 1, overtimerequest: 2, restdayrequest: 3, changeschedulerequest: 4,
      myalterrequest: 5, myovertimerequest: 6, myrestdayrequest: 7, mychangeschedulerequest: 8,
    });
    expect(result.alterrequest).toBe(1);
    expect(result.mychangeschedulerequest).toBe(8);
  });

  test('MY_ALTER_LOG_PENDING sets my request fields', () => {
    const result = dashboardReducers(undefined, {
      type: 'MY_ALTER_LOG_PENDING',
      myalterrequest: 10, myovertimerequest: 11, myrestdayrequest: 12, mychangeschedulerequest: 13,
    });
    expect(result.myalterrequest).toBe(10);
    expect(result.mychangeschedulerequest).toBe(13);
  });

  test('TODAY_LEAVES sets todayleaves', () => {
    const result = dashboardReducers(undefined, { type: 'TODAY_LEAVES', todayleaves: [{ emp: 'Alice' }] });
    expect(result.todayleaves).toEqual([{ emp: 'Alice' }]);
  });

  test('TOMMOROW_LEAVES sets tommorowleaves', () => {
    const result = dashboardReducers(undefined, { type: 'TOMMOROW_LEAVES', tommorowleaves: [{ emp: 'Bob' }] });
    expect(result.tommorowleaves).toEqual([{ emp: 'Bob' }]);
  });

  test('WORK_TOUR sets worktour', () => {
    const result = dashboardReducers(undefined, { type: 'WORK_TOUR', worktour: false });
    expect(result.worktour).toBe(false);
  });

  test('DASHBOARD_HOLIDAY sets dashboardholiday', () => {
    const result = dashboardReducers(undefined, { type: 'DASHBOARD_HOLIDAY', dashboardholiday: [{ name: 'Xmas' }] });
    expect(result.dashboardholiday).toEqual([{ name: 'Xmas' }]);
  });

  test('FETCH_MY_NOTIFICATIONS_COUNT sets approval and alldata', () => {
    const result = dashboardReducers(undefined, {
      type: 'FETCH_MY_NOTIFICATIONS_COUNT',
      approval: 5, announcement: 2, celebration: 1, missingdtr: 3, alldata: { total: 11 },
    });
    expect(result.approval).toBe(5);
    expect(result.alldata).toEqual({ total: 11 });
  });

  test('FETCH_MOROCCO_PAYROLL_PARAMS sets params', () => {
    const result = dashboardReducers(undefined, { type: 'FETCH_MOROCCO_PAYROLL_PARAMS', data: { rate: 1.5 } });
    expect(result.morocco_payroll_params).toEqual({ rate: 1.5 });
  });
});

// ─── dtrReducer ───────────────────────────────────────────────────────────────

describe('dtrReducer', () => {
  test('returns initial state on unknown action', () => {
    const result = dtrReducer(undefined, {});
    expect(result.isDtrLoaded).toBe(false);
    expect(result.list).toEqual([]);
  });

  test('FETCH_DTR_SUCCESS sets list', () => {
    const result = dtrReducer(undefined, { type: 'FETCH_DTR_SUCCESS', list: [{ id: 1 }] });
    expect(result.list).toEqual([{ id: 1 }]);
    expect(result.isDtrLoaded).toBe(true);
  });

  test('FETCH_PUNCH_SUCCESS sets punch_list', () => {
    const result = dtrReducer(undefined, { type: 'FETCH_PUNCH_SUCCESS', list: [{ p: 1 }] });
    expect(result.punch_list).toEqual([{ p: 1 }]);
    expect(result.isListPunchLoaded).toBe(true);
  });

  test('FETCH_SINGLE_PUNCH_SUCCESS sets single_punch_list', () => {
    const result = dtrReducer(undefined, { type: 'FETCH_SINGLE_PUNCH_SUCCESS', data: { content: [{ s: 1 }] } });
    expect(result.single_punch_list).toEqual([{ s: 1 }]);
    expect(result.isSingleListPunchLoaded).toBe(true);
  });

  test('FETCH_DTR_FILTER_SUCCESS sets filter', () => {
    const result = dtrReducer(undefined, { type: 'FETCH_DTR_FILTER_SUCCESS', filter: [{ f: 1 }] });
    expect(result.filter).toEqual([{ f: 1 }]);
    expect(result.isFilterLoaded).toBe(true);
  });

  test('FETCH_USER_DTR_SUMMARY_SUCCESS sets dtrSummary', () => {
    const result = dtrReducer(undefined, {
      type: 'FETCH_USER_DTR_SUMMARY_SUCCESS',
      dtrSummary: { col: [], data: [] },
      column_names: ['a'],
      employeeInfo: { id: 1 },
    });
    expect(result.isDtrSummaryLoaded).toBe(true);
    expect(result.employeeInfo).toEqual({ id: 1 });
  });

  test('FETCH_DTR_FAILED spreads error', () => {
    const result = dtrReducer(undefined, { type: 'FETCH_DTR_FAILED', error: { code: 500 } });
    expect(result.code).toBe(500);
  });

  test('SET_SELECTED_PAYROLL_CUTOFF sets selectedPayrollCutoff', () => {
    const result = dtrReducer(undefined, { type: 'SET_SELECTED_PAYROLL_CUTOFF', payrollCutoff: { id: 2 } });
    expect(result.selectedPayrollCutoff).toEqual({ id: 2 });
  });

  test('FETCH_INCOMPLETE_DTR sets incompleteDtr', () => {
    const result = dtrReducer(undefined, { type: 'FETCH_INCOMPLETE_DTR', data: { data: [{ emp: 'Alice' }] } });
    expect(result.incompleteDtr).toEqual([{ emp: 'Alice' }]);
  });

  test('CLEAR_SINGLE_PUNCH_SUCCESS resets single_punch_list', () => {
    const result = dtrReducer(undefined, { type: 'CLEAR_SINGLE_PUNCH_SUCCESS' });
    expect(result.single_punch_list).toEqual([]);
    expect(result.isSingleListPunchLoaded).toBe(false);
  });
});

// ─── dtrLogs ─────────────────────────────────────────────────────────────────

describe('dtrLogs', () => {
  test('returns initial state on unknown action', () => {
    expect(dtrLogs(undefined, {})).toEqual({ isListLoaded: false, instance: {} });
  });

  test('FETCH_DTR_LOGS_SUCCESS sets instance', () => {
    const result = dtrLogs(undefined, { type: 'FETCH_DTR_LOGS_SUCCESS', dtrSummary: { items: [1] } });
    expect(result.instance).toEqual({ items: [1] });
    expect(result.isListLoaded).toBe(true);
  });
});

// ─── dtrSummary ───────────────────────────────────────────────────────────────

describe('dtrSummary reducer', () => {
  test('returns initial state on unknown action', () => {
    const result = dtrSummary(undefined, {});
    expect(result.isListLoaded).toBe(false);
    expect(result.dtrItems).toEqual([]);
  });

  test('FETCH_DTR_SUMMARY_BATCH_ERROR resets and calls alert_error', () => {
    const result = dtrSummary(undefined, { type: 'FETCH_DTR_SUMMARY_BATCH_ERROR', e: new Error('fail') });
    expect(result.isListLoaded).toBe(false);
    expect(result.dtrItems).toEqual([]);
  });

  test('FETCH_DTR_EXPORT_BACTH_SUCCESS on last page resets pagination', () => {
    const result = dtrSummary(undefined, {
      type: 'FETCH_DTR_EXPORT_BACTH_SUCCESS',
      dtrSummary: { current_page: 2, last_page: 2, has_next_page: false },
    });
    expect(result.isListLoaded).toBe(false);
  });

  test('FETCH_DTR_EXPORT_BACTH_SUCCESS not on last page sets pagination', () => {
    const result = dtrSummary(undefined, {
      type: 'FETCH_DTR_EXPORT_BACTH_SUCCESS',
      dtrSummary: { current_page: 1, last_page: 3, has_next_page: true },
    });
    expect(result.pagination.has_next_page).toBe(true);
  });

  test('FETCH_DTR_EXPORT_SUCCESS triggers download and resets', () => {
    const result = dtrSummary(undefined, { type: 'FETCH_DTR_EXPORT_SUCCESS', data: 'csv' });
    expect(window.URL.createObjectURL).toHaveBeenCalled();
    expect(result.dtrItems).toEqual([]);
  });

  test('FETCH_DTR_CONFLICT_EXPORT_SUCCESS triggers download and resets', () => {
    const result = dtrSummary(undefined, { type: 'FETCH_DTR_CONFLICT_EXPORT_SUCCESS', data: 'csv' });
    expect(result.dtrItems).toEqual([]);
  });

  test('FETCH_DTR_SUMMARY_SUCCESS on page 1 — dtrItems equals summary', () => {
    const result = dtrSummary(undefined, {
      type: 'FETCH_DTR_SUMMARY_SUCCESS',
      dtrSummary: { current_page: 1, last_page: 1, has_next_page: false, summary: [{ id: 1 }] },
    });
    expect(result.dtrItems).toEqual([{ id: 1 }]);
  });

  test('FETCH_DTR_SUMMARY_SUCCESS on page 2 — dtrItems concatenates', () => {
    const prev = { isListLoaded: false, instance: {}, pagination: { current_page: 1, last_page: 1, has_next_page: false }, dtrItems: [{ id: 0 }] };
    const result = dtrSummary(prev, {
      type: 'FETCH_DTR_SUMMARY_SUCCESS',
      dtrSummary: { current_page: 2, last_page: 3, has_next_page: true, summary: [{ id: 1 }] },
    });
    expect(result.dtrItems).toEqual([{ id: 0 }, { id: 1 }]);
  });

  test('FETCH_NEW_DTR_SUMMARY_SUCCESS sets dtrItems from action', () => {
    const result = dtrSummary(undefined, {
      type: 'FETCH_NEW_DTR_SUMMARY_SUCCESS',
      dtrSummary: { current_page: 1, last_page: 1, has_next_page: false, dtrItems: [{ id: 5 }] },
    });
    expect(result.dtrItems).toEqual([{ id: 5 }]);
    expect(result.isListLoaded).toBe(true);
  });
});

// ─── dtrConflict ─────────────────────────────────────────────────────────────

describe('dtrConflict reducer', () => {
  test('returns initial state on unknown action', () => {
    expect(dtrConflict(undefined, {}).isListLoaded).toBe(false);
  });

  test('FETCH_DTR_CONFLICT_REPORT_SUCCESS sets instance and pagination', () => {
    const result = dtrConflict(undefined, {
      type: 'FETCH_DTR_CONFLICT_REPORT_SUCCESS',
      dtrConflict: { current_page: 1, last_page: 1, has_next_page: false, dtrItems: [{ id: 1 }] },
    });
    expect(result.isListLoaded).toBe(true);
    expect(result.dtrItems).toEqual([{ id: 1 }]);
  });
});

// ─── dtrMultiLogsSummary ─────────────────────────────────────────────────────

describe('dtrMultiLogsSummary reducer', () => {
  test('returns initial state on unknown action', () => {
    expect(dtrMultiLogsSummary(undefined, {}).isListLoaded).toBe(false);
  });

  test('FETCH_DTR_MULTI_LOGS_SUMMARY_SUCCESS sets instance', () => {
    const result = dtrMultiLogsSummary(undefined, {
      type: 'FETCH_DTR_MULTI_LOGS_SUMMARY_SUCCESS',
      dtrMultiLogsSummary: { id: 1, dtrItems: [{ row: 1 }] },
    });
    expect(result.isListLoaded).toBe(true);
    expect(result.dtrItems).toEqual([{ row: 1 }]);
  });

  test('FETCH_DTR_MULTI_LOGS_EXPORT_SUCCESS triggers download and resets', () => {
    const result = dtrMultiLogsSummary(undefined, { type: 'FETCH_DTR_MULTI_LOGS_EXPORT_SUCCESS', data: 'csv' });
    expect(result.dtrItems).toEqual([]);
  });
});

// ─── scheduleReducer ─────────────────────────────────────────────────────────

describe('scheduleReducer', () => {
  test('returns initial state on unknown action', () => {
    const result = scheduleReducer(undefined, {});
    expect(result.isScheduleLoaded).toBe(false);
    expect(result.templateList).toEqual([]);
  });

  test('FETCH_DEFAULT_SCHEDULE_SUCCESS sets defaultSchedule', () => {
    const result = scheduleReducer(undefined, { type: 'FETCH_DEFAULT_SCHEDULE_SUCCESS', schedule: { id: 1 } });
    expect(result.defaultSchedule).toEqual({ id: 1 });
    expect(result.isScheduleLoaded).toBe(true);
  });

  test('FETCH_TEMPLATE_DEFAULT_SCHEDULE_SUCCESS sets templateData', () => {
    const result = scheduleReducer(undefined, { type: 'FETCH_TEMPLATE_DEFAULT_SCHEDULE_SUCCESS', templatedata: { id: 2 } });
    expect(result.templateData).toEqual({ id: 2 });
    expect(result.isTemplateDataLoaded).toBe(true);
  });

  test('FETCH_TEMPLATE_SCHEDULE_SUCCESS spreads templatedata', () => {
    const result = scheduleReducer(undefined, { type: 'FETCH_TEMPLATE_SCHEDULE_SUCCESS', templatedata: { name: 'T1' } });
    expect(result.name).toBe('T1');
    expect(result.isScheduleLoaded).toBe(true);
  });

  test('FETCH_TEMPLATES_SCHEDULE_SUCCESS sets templateList', () => {
    const result = scheduleReducer(undefined, { type: 'FETCH_TEMPLATES_SCHEDULE_SUCCESS', template: [{ id: 1 }] });
    expect(result.templateList).toEqual([{ id: 1 }]);
    expect(result.isTemplateListLoaded).toBe(true);
  });

  test('FETCH_USER_INFO sets userInfo', () => {
    const result = scheduleReducer(undefined, { type: 'FETCH_USER_INFO', userInfo: { id: 3 } });
    expect(result.userInfo).toEqual({ id: 3 });
  });

  test('FETCH_DEFAULT_SCHEDULE_FAILED spreads error', () => {
    const result = scheduleReducer(undefined, { type: 'FETCH_DEFAULT_SCHEDULE_FAILED', error: { msg: 'fail' } });
    expect(result.msg).toBe('fail');
  });
});

// ─── teamSchedule ────────────────────────────────────────────────────────────

describe('teamSchedule reducer', () => {
  test('returns initial state on unknown action', () => {
    const result = teamSchedule(undefined, {});
    expect(result.list).toBeNull();
    expect(result.team_list).toEqual([]);
  });

  test('FETCH_MY_TEAM_LIST_SUCCESS sets list', () => {
    const result = teamSchedule(undefined, { type: 'FETCH_MY_TEAM_LIST_SUCCESS', list: [1] });
    expect(result.list).toEqual([1]);
  });

  test('FETCH_TEAM_LIST_SUCCESS sets team_list', () => {
    const result = teamSchedule(undefined, { type: 'FETCH_TEAM_LIST_SUCCESS', list: [2] });
    expect(result.team_list).toEqual([2]);
  });

  test('FETCH_DAILY_TEAM_SCHEDULE_SUCCESS sets data', () => {
    const result = teamSchedule(undefined, {
      type: 'FETCH_DAILY_TEAM_SCHEDULE_SUCCESS',
      team_schedule: { data: { '2026-06-01': [] } },
    });
    expect(result.team_schedule.data).toEqual({ '2026-06-01': [] });
  });

  test('FETCH_DAILY_TEAM_SCHEDULE_MORE_SUCCESS updates date entry', () => {
    const prev = { ...teamSchedule(undefined, {}), team_schedule: { data: {}, date_list: {} } };
    const result = teamSchedule(prev, {
      type: 'FETCH_DAILY_TEAM_SCHEDULE_MORE_SUCCESS',
      date: '2026-06-01',
      team_schedule: { data: { '2026-06-01': ['entry'] } },
    });
    expect(result.team_schedule.data['2026-06-01']).toEqual(['entry']);
    expect(result.team_schedule.date_list['2026-06-01']).toBe(false);
  });

  test('FETCH_WEEKLY_TEAM_SCHEDULE_SUCCESS sets weekly data', () => {
    const result = teamSchedule(undefined, {
      type: 'FETCH_WEEKLY_TEAM_SCHEDULE_SUCCESS',
      team_schedule: { data: {}, date_list: ['d1'], holiday_list: ['h1'] },
    });
    expect(result.team_schedule.date_list).toEqual(['d1']);
  });

  test('FETCH_MONTHLY_TEAM_SCHEDULE_SUCCESS sets monthly data', () => {
    const result = teamSchedule(undefined, {
      type: 'FETCH_MONTHLY_TEAM_SCHEDULE_SUCCESS',
      team_schedule: { data: {}, date_list: ['d'], holiday_list: ['h'], week_list: ['w'] },
    });
    expect(result.team_schedule.week_list).toEqual(['w']);
  });

  test('SET_MY_TEAM_LIST_FILTERS sets filters', () => {
    const result = teamSchedule(undefined, { type: 'SET_MY_TEAM_LIST_FILTERS', filters: { dep: 'A' } });
    expect(result.filters).toEqual({ dep: 'A' });
  });

  test('FETCH_TEAM_UNDER_DEPARTMENT_LIST_SUCCESS sets team_list', () => {
    const result = teamSchedule(undefined, { type: 'FETCH_TEAM_UNDER_DEPARTMENT_LIST_SUCCESS', list: [3] });
    expect(result.team_list).toEqual([3]);
  });
});

// ─── profileReducer ───────────────────────────────────────────────────────────

describe('profileReducer', () => {
  test('returns initial state on unknown action', () => {
    const result = profileReducer(undefined, {});
    expect(result.scope).toBe('week');
    expect(result.closeAllForm).toBe(false);
  });

  test('FETCH_PROFILE sets details', () => {
    const result = profileReducer(undefined, { type: 'FETCH_PROFILE', user: { id: 1 }, profile_picture: 'pic.jpg' });
    expect(result.details).toEqual({ id: 1 });
    expect(result.profile_picture).toBe('pic.jpg');
  });

  test('FETCH_PERSONAL_INFORMATION sets personal_information', () => {
    const result = profileReducer(undefined, { type: 'FETCH_PERSONAL_INFORMATION', personal_information: [{ field: 'name' }] });
    expect(result.personal_information).toEqual([{ field: 'name' }]);
  });

  test('FETCH_JOB_INFORMATION sets job_information', () => {
    const result = profileReducer(undefined, { type: 'FETCH_JOB_INFORMATION', job_information: [{ title: 'Dev' }], employment_status: 'regular' });
    expect(result.job_information).toEqual([{ title: 'Dev' }]);
    expect(result.employment_status).toBe('regular');
  });

  test('FETCH_TIME_OFF sets leaves_list', () => {
    const result = profileReducer(undefined, { type: 'FETCH_TIME_OFF', leaves_list: [{ type: 'SL' }] });
    expect(result.leaves_list).toEqual([{ type: 'SL' }]);
  });

  test('FETCH_LEAVE_CREDITS sets leave_credits', () => {
    const result = profileReducer(undefined, { type: 'FETCH_LEAVE_CREDITS', leave_credits: { VL: 5 } });
    expect(result.leave_credits).toEqual({ VL: 5 });
  });

  test('FETCH_SCHEDULE sets schedule', () => {
    const result = profileReducer(undefined, { type: 'FETCH_SCHEDULE', schedule: { id: 1 } });
    expect(result.schedule).toEqual({ id: 1 });
  });

  test('FETCH_SCHEDULE_HISTORY sets history', () => {
    const result = profileReducer(undefined, { type: 'FETCH_SCHEDULE_HISTORY', schedule_history: [{ id: 1 }] });
    expect(result.schedule_history).toEqual([{ id: 1 }]);
  });

  test('FETCH_TEMPORARY_SCHEDULE sets temporary_schedule', () => {
    const result = profileReducer(undefined, { type: 'FETCH_TEMPORARY_SCHEDULE', schedule: { temp: true } });
    expect(result.temporary_schedule).toEqual({ temp: true });
  });

  test('SET_DATE_LIST sets date_list', () => {
    const result = profileReducer(undefined, { type: 'SET_DATE_LIST', date_list: ['2026-06-01'] });
    expect(result.date_list).toEqual(['2026-06-01']);
  });

  test('SET_EMP_SCHEDULE sets emp_sched', () => {
    const result = profileReducer(undefined, { type: 'SET_EMP_SCHEDULE', emp_sched: [{ day: 'Mon' }] });
    expect(result.emp_sched).toEqual([{ day: 'Mon' }]);
  });

  test('SET_WEEK_LIST sets week_list and dates', () => {
    const result = profileReducer(undefined, { type: 'SET_WEEK_LIST', data: { week_list: ['w1'], dates_list: ['d1'] } });
    expect(result.week_list).toEqual(['w1']);
    expect(result.dates).toEqual(['d1']);
  });

  test('SET_SCOPE sets scope', () => {
    const result = profileReducer(undefined, { type: 'SET_SCOPE', scope: 'month' });
    expect(result.scope).toBe('month');
  });

  test('CLOSE_ALL_FORM sets closeAllForm true', () => {
    const result = profileReducer(undefined, { type: 'CLOSE_ALL_FORM' });
    expect(result.closeAllForm).toBe(true);
  });

  test('CLOSE_ALL_FORM_FALSE sets closeAllForm false', () => {
    const result = profileReducer({ closeAllForm: true }, { type: 'CLOSE_ALL_FORM_FALSE' });
    expect(result.closeAllForm).toBe(false);
  });
});

// ─── reportReducers ───────────────────────────────────────────────────────────

describe('reportReducers', () => {
  test('returns initial state on unknown action', () => {
    expect(reportReducers(undefined, {}).selected_summary).toBe('attendance');
  });

  test('FETCH_TEAM_ATTENDANCE_SUMMARY sets summary', () => {
    const result = reportReducers(undefined, { type: 'FETCH_TEAM_ATTENDANCE_SUMMARY', data: [{ emp: 'A' }] });
    expect(result.team_attendance_summary).toEqual([{ emp: 'A' }]);
  });

  test('SET_SELECTED_ATTENDACE_SUMMARY sets selected_summary', () => {
    const result = reportReducers(undefined, { type: 'SET_SELECTED_ATTENDACE_SUMMARY', payload: 'dispute' });
    expect(result.selected_summary).toBe('dispute');
  });

  test('FETCH_DISPUTE_RECORD sets dispute_record', () => {
    const result = reportReducers(undefined, { type: 'FETCH_DISPUTE_RECORD', data: [{ id: 1 }] });
    expect(result.dispute_record).toEqual([{ id: 1 }]);
  });
});

// ─── requestApprovalReducers ──────────────────────────────────────────────────

describe('requestApprovalReducers', () => {
  test('returns initial state on unknown action', () => {
    expect(requestApprovalReducers(undefined, {})).toEqual({ instance: null, isInstanceValid: null });
  });

  test('FETCH_REQUEST_APPROVAL_CHANGED_STATUS_INSTANCE sets instance valid', () => {
    const result = requestApprovalReducers(undefined, { type: 'FETCH_REQUEST_APPROVAL_CHANGED_STATUS_INSTANCE', instance: { id: 1 } });
    expect(result.instance).toEqual({ id: 1 });
    expect(result.isInstanceValid).toBe(true);
  });

  test('FAILED_FETCH_REQUEST_APPROVAL_CHANGED_STATUS_INSTANCE sets isInstanceValid false', () => {
    const result = requestApprovalReducers(undefined, { type: 'FAILED_FETCH_REQUEST_APPROVAL_CHANGED_STATUS_INSTANCE' });
    expect(result.isInstanceValid).toBe(false);
  });
});

// ─── lookupListReducers ───────────────────────────────────────────────────────

describe('lookupListReducers', () => {
  test('returns initial state on unknown action', () => {
    expect(lookupListReducers(undefined, {})).toEqual({});
  });

  test('FETCH_USER_LIST_SUCCESS sets role-keyed list', () => {
    const result = lookupListReducers(undefined, { type: 'FETCH_USER_LIST_SUCCESS', role: 'employee', list: [{ id: 1 }] });
    expect(result.employee).toEqual([{ id: 1 }]);
  });

  test('UPDATE_USER_LIST updates user in role-keyed list', () => {
    const state = { employee: [{ id: 1, name: 'Old' }, { id: 2, name: 'Bob' }] };
    const result = lookupListReducers(state, { type: 'UPDATE_USER_LIST', role: 'employee', user: { id: 1, name: 'New' } });
    expect(result.employee[0].name).toBe('New');
  });

  test('FETCH_DEPARTMENT_LIST_SUCCESS sets department', () => {
    const result = lookupListReducers(undefined, { type: 'FETCH_DEPARTMENT_LIST_SUCCESS', list: [{ id: 1 }] });
    expect(result.department).toEqual([{ id: 1 }]);
  });

  test('FETCH_DEPARTMENT_HANDLERS_LIST_SUCCESS sets department_handlers', () => {
    const result = lookupListReducers(undefined, { type: 'FETCH_DEPARTMENT_HANDLERS_LIST_SUCCESS', list: [{ id: 2 }] });
    expect(result.department_handlers).toEqual([{ id: 2 }]);
  });

  test('FETCH_DEPARTMENT_USERS_LIST_SUCCESS sets department_users', () => {
    const result = lookupListReducers(undefined, { type: 'FETCH_DEPARTMENT_USERS_LIST_SUCCESS', list: [{ id: 3 }] });
    expect(result.department_users).toEqual([{ id: 3 }]);
  });

  test.skip('FETCH_EMPLOYEES_CLIENT_USERS_LIST_SUCCESS sets employees_client_users — CLIENT MODULE REMOVED 2026-08-10: reducer case deleted with client module', () => {
    const result = lookupListReducers(undefined, { type: 'FETCH_EMPLOYEES_CLIENT_USERS_LIST_SUCCESS', list: [{ id: 4 }] });
    expect(result.employees_client_users).toEqual([{ id: 4 }]);
  });

  test('FETCH_ROLE_LIST_SUCCESS sets roles', () => {
    const result = lookupListReducers(undefined, { type: 'FETCH_ROLE_LIST_SUCCESS', list: ['admin'] });
    expect(result.roles).toEqual(['admin']);
  });

  test('FETCH_FEATURES_LIST_SUCCESS sets features', () => {
    const result = lookupListReducers(undefined, { type: 'FETCH_FEATURES_LIST_SUCCESS', list: ['feat1'] });
    expect(result.features).toEqual(['feat1']);
  });

  test('FETCH_TEAMS_HANDLED_LIST_SUCCESS sets teams_handled', () => {
    const result = lookupListReducers(undefined, { type: 'FETCH_TEAMS_HANDLED_LIST_SUCCESS', list: [{ t: 1 }] });
    expect(result.teams_handled).toEqual([{ t: 1 }]);
  });

  test('FETCH_SUB_DEP_HANDLED_LIST_SUCCESS sets sub_departments_handled', () => {
    const result = lookupListReducers(undefined, { type: 'FETCH_SUB_DEP_HANDLED_LIST_SUCCESS', list: [{ sd: 1 }] });
    expect(result.sub_departments_handled).toEqual([{ sd: 1 }]);
  });

  test('FETCH_SUB_DEPARTMENT_LIST_SUCCESS sets sub_departments_list', () => {
    const result = lookupListReducers(undefined, { type: 'FETCH_SUB_DEPARTMENT_LIST_SUCCESS', list: [{ sd: 2 }] });
    expect(result.sub_departments_list).toEqual([{ sd: 2 }]);
  });

  test('FETCH_TEAM_SUCCESS sets team', () => {
    const result = lookupListReducers(undefined, { type: 'FETCH_TEAM_SUCCESS', instance: { id: 5 } });
    expect(result.team).toEqual({ id: 5 });
  });
});

// ─── assignRoleReducers ───────────────────────────────────────────────────────

describe('assignRoleReducers', () => {
  test('returns initial state on unknown action', () => {
    const result = assignRoleReducers(undefined, {});
    expect(result.isRolesLoaded).toBe(false);
  });

  test('FETCH_ROLES sets roles', () => {
    const result = assignRoleReducers(undefined, { type: 'FETCH_ROLES', roles: [{ id: 1 }] });
    expect(result.roles).toEqual([{ id: 1 }]);
    expect(result.isRolesLoaded).toBe(true);
  });

  test('FETCH_USER sets userLists', () => {
    const result = assignRoleReducers(undefined, { type: 'FETCH_USER', userLists: [{ id: 1 }] });
    expect(result.userLists).toEqual([{ id: 1 }]);
    expect(result.isUserListLoaded).toBe(true);
  });

  test('FETCH_PAYROLL_PERIOD sets payroll', () => {
    const result = assignRoleReducers(undefined, { type: 'FETCH_PAYROLL_PERIOD', payroll: 'monthly' });
    expect(result.payroll).toBe('monthly');
  });

  test('FETCH_USER_ROLE_AND_PERMISSION — case removed from reducer, returns unchanged state', () => {
    // The FETCH_USER_ROLE_AND_PERMISSION case was removed from assignRoleReducers when
    // Spatie laravel-permission was dropped from the backend. The action now falls through
    // to `default` and the state is returned unchanged (userRole stays null).
    const result = assignRoleReducers(undefined, { type: 'FETCH_USER_ROLE_AND_PERMISSION', userRole: ['admin'], userPermission: ['read'] });
    expect(result.userRole).toBeNull();
    expect(result.isUserRolesPermissionsLoaded).toBe(false);
  });

  test('FETCH_USER_FEATURES sets userFeatures', () => {
    const result = assignRoleReducers(undefined, { type: 'FETCH_USER_FEATURES', userLevel: 'L1', userFeatures: ['feat1'] });
    expect(result.userFeatures).toEqual(['feat1']);
    expect(result.userLevel).toBe('L1');
  });
});

// ─── departmentListReducers ───────────────────────────────────────────────────

describe('departmentListReducers', () => {
  test('returns initial state on unknown action', () => {
    expect(departmentListReducers(undefined, {}).isDepartmentListLoaded).toBe(false);
  });

  test('FETCH_DEPARTMENT_LIST_LOAD_SUCCESS sets Deplist', () => {
    const result = departmentListReducers(undefined, { type: 'FETCH_DEPARTMENT_LIST_LOAD_SUCCESS', list: [{ id: 1 }] });
    expect(result.Deplist).toEqual([{ id: 1 }]);
    expect(result.isDepartmentListLoaded).toBe(true);
  });
});

// jobOpeningReducers removed (EVOX-721, Careers Dead Code Removal) —
// store/reducers/admin/jobOpeningReducers.js no longer exists.

// ─── payrollCutoffReducers ────────────────────────────────────────────────────

describe('payrollCutoffReducers', () => {
  test('returns initial state on unknown action', () => {
    const result = payrollCutoffReducers(undefined, {});
    expect(result.isInstanceLoaded).toBe(false);
    expect(result.isListInstanceLoaded).toBe(false);
  });

  test('FETCH_PAYROLL_CUTOFF_LIST_SUCCESS sets listInstance', () => {
    const result = payrollCutoffReducers(undefined, { type: 'FETCH_PAYROLL_CUTOFF_LIST_SUCCESS', list: [{ id: 1 }] });
    expect(result.listInstance).toEqual([{ id: 1 }]);
    expect(result.isListInstanceLoaded).toBe(true);
  });

  test('FETCH_PAYROLL_CUTOFF_SUCCESS sets instance', () => {
    const result = payrollCutoffReducers(undefined, { type: 'FETCH_PAYROLL_CUTOFF_SUCCESS', payrollCutoff: { id: 2 } });
    expect(result.instance).toEqual({ id: 2 });
    expect(result.isInstanceLoaded).toBe(true);
  });

  test('CLEAR_PAYROLL_CUTOFF_INSTANCE resets instance', () => {
    const result = payrollCutoffReducers({ instance: { id: 2 }, isInstanceLoaded: true }, { type: 'CLEAR_PAYROLL_CUTOFF_INSTANCE' });
    expect(result.instance).toEqual({});
    expect(result.isInstanceLoaded).toBe(false);
  });

  test('CLEAR_PAYROLL_CUTOFF_LIST_INSTANCE resets listInstance', () => {
    const result = payrollCutoffReducers({ listInstance: [{ id: 1 }], isListInstanceLoaded: true }, { type: 'CLEAR_PAYROLL_CUTOFF_LIST_INSTANCE' });
    expect(result.listInstance).toEqual({});
    expect(result.isListInstanceLoaded).toBe(false);
  });
});

// ─── registerUserReducers ─────────────────────────────────────────────────────

describe('registerUserReducers', () => {
  test('returns initial state on unknown action', () => {
    expect(registerUserReducers(undefined, {})).toEqual({ isSuccessful: false });
  });

  test('REGISTER_USER_SUCCESSFUL sets isSuccessful', () => {
    const result = registerUserReducers(undefined, { type: 'REGISTER_USER_SUCCESSFUL' });
    expect(result.isSuccessful).toBe(true);
  });
});

// ─── syncReducers ────────────────────────────────────────────────────────────

describe('syncReducers', () => {
  test('returns initial state on unknown action', () => {
    expect(syncReducers(undefined, {}).leaves).toEqual([]);
  });

  test('SYNC_BHR_LEAVES sets leaves', () => {
    const result = syncReducers(undefined, { type: 'SYNC_BHR_LEAVES', content: [{ id: 1 }] });
    expect(result.leaves).toEqual([{ id: 1 }]);
  });

  test('SYNC_UTC_ADJUST sets leaves', () => {
    const result = syncReducers(undefined, { type: 'SYNC_UTC_ADJUST', content: [{ id: 2 }] });
    expect(result.leaves).toEqual([{ id: 2 }]);
  });

  test('SYNC_USER_UPDATES sets users', () => {
    const result = syncReducers(undefined, { type: 'SYNC_USER_UPDATES', content: [{ id: 3 }] });
    expect(result.users).toEqual([{ id: 3 }]);
  });

  test('SYNC_BIOMETRICS sets biometrics', () => {
    const result = syncReducers(undefined, { type: 'SYNC_BIOMETRICS', content: [{ id: 4 }] });
    expect(result.biometrics).toEqual([{ id: 4 }]);
  });
});

// ─── departmentAnnouncementReducers ──────────────────────────────────────────

describe('departmentAnnouncementReducers', () => {
  test('returns initial state on unknown action', () => {
    expect(departmentAnnouncementReducers(undefined, {}).isDepartmentAnnouncementListLoaded).toBe(false);
  });

  test('FETCH_DEPARTMENT_ANNOUNCEMENT_INDEX_LOAD_SUCCESS sets list', () => {
    const result = departmentAnnouncementReducers(undefined, {
      type: 'FETCH_DEPARTMENT_ANNOUNCEMENT_INDEX_LOAD_SUCCESS',
      list: [{ id: 1 }],
    });
    expect(result.depAnnouncementlist).toEqual([{ id: 1 }]);
    expect(result.isDepartmentAnnouncementListLoaded).toBe(true);
  });

  test('INCREMENT_DEPARTMENT_ANNOUNCEMENT_INDEX_LOAD_SUCCESS concatenates list', () => {
    const prev = { depAnnouncementlist: [{ id: 1 }], isDepartmentAnnouncementListLoaded: true, hideShowMore: false };
    // 3-item list → length == 3 is not < 3 and not == 0 → hideShowMore = false
    const newItems = [{ id: 2 }, { id: 3 }, { id: 4 }];
    const result = departmentAnnouncementReducers(prev, {
      type: 'INCREMENT_DEPARTMENT_ANNOUNCEMENT_INDEX_LOAD_SUCCESS',
      list: newItems,
    });
    expect(result.depAnnouncementlist).toEqual([{ id: 1 }, ...newItems]);
    expect(result.hideShowMore).toBe(false);
  });

  test('INCREMENT — empty list sets hideShowMore true', () => {
    const prev = { depAnnouncementlist: [{ id: 1 }], isDepartmentAnnouncementListLoaded: true, hideShowMore: false };
    const result = departmentAnnouncementReducers(prev, {
      type: 'INCREMENT_DEPARTMENT_ANNOUNCEMENT_INDEX_LOAD_SUCCESS',
      list: [],
    });
    expect(result.hideShowMore).toBe(true);
  });

  test('FETCH_DEPARTMENT_ANNOUNCEMENT_SUCCESS sets instance', () => {
    const result = departmentAnnouncementReducers(undefined, {
      type: 'FETCH_DEPARTMENT_ANNOUNCEMENT_SUCCESS',
      announcement: { id: 3 },
    });
    expect(result.instance).toEqual({ id: 3 });
    expect(result.isInstanceLoaded).toBe(true);
  });

  test('CLEAR_DEPARTMENT_ANNOUNCEMENT_INSTANCE resets instance', () => {
    const result = departmentAnnouncementReducers({ instance: { id: 3 } }, { type: 'CLEAR_DEPARTMENT_ANNOUNCEMENT_INSTANCE' });
    expect(result.instance).toEqual({});
    expect(result.isInstanceLoaded).toBe(false);
  });

  test('CLEAR_DEPARTMENT_ANNOUNCEMENT_LIST_INSTANCE resets list', () => {
    const result = departmentAnnouncementReducers(undefined, { type: 'CLEAR_DEPARTMENT_ANNOUNCEMENT_LIST_INSTANCE' });
    expect(result.isDepartmentAnnouncementListLoaded).toBe(false);
  });
});

// ─── hrAnnouncementReducers ───────────────────────────────────────────────────

describe('hrAnnouncementReducers', () => {
  test('returns initial state on unknown action', () => {
    expect(hrAnnouncementReducers(undefined, {}).isListInstanceLoaded).toBe(false);
  });

  test('FETCH_HR_ANNOUNCEMENTS_LIST_SUCCESS sets listInstance', () => {
    const result = hrAnnouncementReducers(undefined, { type: 'FETCH_HR_ANNOUNCEMENTS_LIST_SUCCESS', list: [{ id: 1 }] });
    expect(result.listInstance).toEqual([{ id: 1 }]);
    expect(result.isListInstanceLoaded).toBe(true);
  });

  test('FETCH_HR_ANNOUNCEMENT_SUCCESS sets instance', () => {
    const result = hrAnnouncementReducers(undefined, { type: 'FETCH_HR_ANNOUNCEMENT_SUCCESS', list: { id: 2 } });
    expect(result.instance).toEqual({ id: 2 });
  });

  test('CLEAR_HR_ANNOUNCEMENT_INSTANCE resets instance', () => {
    const result = hrAnnouncementReducers({ instance: { id: 2 } }, { type: 'CLEAR_HR_ANNOUNCEMENT_INSTANCE' });
    expect(result.instance).toEqual({});
    expect(result.isListInstanceLoaded).toBe(false);
  });
});

// ─── freshServiceReducers ─────────────────────────────────────────────────────

describe('freshServiceReducers', () => {
  test('returns initial state on unknown action', () => {
    expect(freshServiceReducers(undefined, {}).isInstanceLoaded).toBe(false);
  });

  test('FETCH_WORKSPACES_SUCCESS sets workspaces', () => {
    const result = freshServiceReducers(undefined, {
      type: 'FETCH_WORKSPACES_SUCCESS',
      workspaces: [{ id: 1 }],
      categories: ['cat1'],
      sub_categories: ['sub1'],
      isLoaded: true,
    });
    expect(result.workspaces).toEqual([{ id: 1 }]);
    expect(result.isInstanceLoaded).toBe(true);
  });

  test('CLEAR_FRESHSERVICE_INSTANCE resets', () => {
    const result = freshServiceReducers({ instance: { id: 1 }, isInstanceLoaded: true }, { type: 'CLEAR_FRESHSERVICE_INSTANCE' });
    expect(result.instance).toEqual({});
    expect(result.isInstanceLoaded).toBe(false);
  });
});

// ─── neoReducers ─────────────────────────────────────────────────────────────

describe('neoReducers', () => {
  test('returns initial state on unknown action', () => {
    expect(neoReducers(undefined, {}).isInstanceLoaded).toBe(false);
  });

  test('FETCH_NEO_ONBOARDING_SUCCESS sets neo_onboarding', () => {
    const result = neoReducers(undefined, { type: 'FETCH_NEO_ONBOARDING_SUCCESS', list: [{ id: 1 }], isLoaded: true });
    expect(result.neo_onboarding).toEqual([{ id: 1 }]);
    expect(result.neo_onboarding_loaded).toBe(true);
  });

  test('FETCH_NEO_SUBMISSION_SUCCESS sets neo_submissions', () => {
    const result = neoReducers(undefined, { type: 'FETCH_NEO_SUBMISSION_SUCCESS', list: [{ id: 2 }], isLoaded: true });
    expect(result.neo_submissions).toEqual([{ id: 2 }]);
  });

  test('FETCH_NEO_SUBMISSION_DATA_SUCCESS sets submission data', () => {
    const result = neoReducers(undefined, {
      type: 'FETCH_NEO_SUBMISSION_DATA_SUCCESS',
      data: { score: 80 }, isLoaded: true, bhr_num: 'BHR001',
    });
    expect(result.neo_submission_data).toEqual({ score: 80 });
    expect(result.neo_bhr_num).toBe('BHR001');
  });
});

// ─── opsScheduleReducers ──────────────────────────────────────────────────────

describe('opsScheduleReducers', () => {
  test('returns initial state on unknown action', () => {
    expect(opsScheduleReducers(undefined, {}).isInstanceLoaded).toBe(false);
  });

  test('FETCH_OPSSCHEDULES_SUCCESS with items sets isListInstanceLoaded', () => {
    const result = opsScheduleReducers(undefined, { type: 'FETCH_OPSSCHEDULES_SUCCESS', list: [{ id: 1 }] });
    expect(result.listInstance).toEqual([{ id: 1 }]);
    expect(result.isListInstanceLoaded).toBe(true);
  });

  test('FETCH_OPSSCHEDULES_SUCCESS with empty list sets isListInstanceLoaded false', () => {
    const result = opsScheduleReducers(undefined, { type: 'FETCH_OPSSCHEDULES_SUCCESS', list: [] });
    expect(result.isListInstanceLoaded).toBe(false);
  });

  test('FETCH_OPSSCHEDULE_SUCCESS sets instance', () => {
    const result = opsScheduleReducers(undefined, { type: 'FETCH_OPSSCHEDULE_SUCCESS', data: { id: 2 } });
    expect(result.instance).toEqual({ id: 2 });
    expect(result.isInstanceLoaded).toBe(true);
  });

  test('STORE_OPSSCHEDULE_SUCCESS returns empty object', () => {
    expect(opsScheduleReducers(undefined, { type: 'STORE_OPSSCHEDULE_SUCCESS' })).toEqual({});
  });

  test('CLEAR_OPSSCHEDULE_INSTANCE resets', () => {
    const result = opsScheduleReducers({ instance: { id: 2 }, isInstanceLoaded: true }, { type: 'CLEAR_OPSSCHEDULE_INSTANCE' });
    expect(result.instance).toEqual({});
    expect(result.isInstanceLoaded).toBe(false);
  });
});
