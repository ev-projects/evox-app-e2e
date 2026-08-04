// evoxtest_Actions_frontend.test.js
// Tests for Redux action creators across all action modules.
// Every thunk is exercised for both success and error paths.

jest.mock('../../services/API', () => ({
  call: jest.fn(() =>
    Promise.resolve({ data: { content: {} }, headers: {}, status: 200 })
  ),
  export: jest.fn(() =>
    Promise.resolve({ data: new ArrayBuffer(8), headers: {}, status: 200 })
  ),
}));

jest.mock('../../services/APICALL', () => ({
  call: jest.fn(() => Promise.resolve({ data: {} })),
}));

jest.mock('../../services/Formatter', () => ({
  alert_error: jest.fn(() => ({ type: 'ALERT_ERROR' })),
  alert_success: jest.fn(() => ({ type: 'ALERT_SUCCESS' })),
}));

jest.mock('axios', () => {
  const fn = jest.fn(() =>
    Promise.resolve({
      data: {
        content: {
          access_token: 'test-token',
          session_id: 'test-session',
          payload: { id: 1 },
          user: { id: 1, name: 'Test' },
          constant: {},
          settings: {},
        },
      },
    })
  );
  return fn;
});

jest.mock('react-promise-tracker', () => ({
  trackPromise: (p) => p,
}));

import API from '../../services/API';
import Formatter from '../../services/Formatter';
import axios from 'axios';

// ── action imports ──────────────────────────────────────────────────────────
import { setRedirect, clearRedirect } from '../../store/actions/redirectActions';
import { showAlert } from '../../store/actions/settings/alertActions';
import { showModalLogin, hideModalLogin } from '../../store/actions/settings/modalLoginActions';
import {
  addChangeSchedule,
  updateChangeSchedule,
  updateChangeScheduleStatus,
  fetchChangeSchedule,
  clearChangeScheduleInstance,
  resetChangeScheduleInstance,
} from '../../store/actions/requests/changeScheduleActions';
import {
  addOvertime,
  updateOvertime,
  fetchOvertime,
  updateOvertimeStatus,
  clearOvertimeInstance,
  resetOvertimeInstance,
} from '../../store/actions/requests/overtimeActions';
import {
  addRestDayWork,
  updateRestDayWork,
  updateRestDayWorkStatus,
  fetchRestDayWork,
  clearRestDayWorkInstance,
  resetRestDayWorkInstance,
} from '../../store/actions/requests/restDayWorkActions';
import {
  addAlterLog,
  updateAlterLog,
  updateAlterLogStatus,
  fetchAlterLog,
  clearAlterLogInstance,
  resetAlterLogInstance,
} from '../../store/actions/requests/alterLogActions';
import {
  addAlterLogPunch,
  updateAlterLogPunch,
  updateAlterLogPunchStatus,
  fetchAlterLogPunch,
  clearAlterLogPunchInstance,
  resetAlterLogPunchInstance,
} from '../../store/actions/requests/alterPunchLogActions';
import { addCOE, fetchCOE } from '../../store/actions/requests/coeActions';
import {
  logIn,
  authenticateClient,
  authenticateMSClient,
  logOut,
  fetchUser,
  getUserInfo,
  forgotPasswordRequest,
  getAllAssets,
  getUserAsset,
  getUserAssets,
  addUserAsset,
  updateUserAsset,
  getNhoSurvey,
  addNhoSurvey,
  getEvaSurvey,
  addEvaSurvey,
  getUserCoc,
  acknowledgeCOC,
  getEvaReg,
  submitEvaReg,
  getHappinessSurvey,
  addHappinessSurvey,
} from '../../store/actions/userActions';
import {
  viewEmployeeDtr,
  viewEmployeePunch,
  viewEmployeeTargetPunch,
  getFilterForDtr,
  getUserDtrSummary,
  setSelectedPayrollCutoff,
  getIncompleteDtr,
} from '../../store/actions/dtr/dtrActions';
import {
  setDateList,
  setEmpSchedule,
  setScope,
  setWeekList,
  fetchProfile,
  updateUserProfile,
  fetchPersonalInformation,
  fetchJobInformation,
  fetchLeaveCredits,
  fetchSchedule,
  fetchScheduleHistory,
  fetchTemporarySchedule,
  changePassword,
  tickDpa,
} from '../../store/actions/profile/profileActions';
import {
  addTemplateSchedule,
  getScheduleInfo,
  getDefaultSchedule,
  getTemplateSchedule,
  updateSchedule,
  listTemplate,
  deleteSchedule,
  scheduleAssign,
} from '../../store/actions/scheduleActions';
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
  getChangeLogs,
  clearRecentDtrInstance,
  getMyNotifications,
} from '../../store/actions/dashboard/dashboardActions';
import {
  fetchRequestList,
  fetchStatusNumbers,
  fetchRequestListDisputes,
  myfetchStatusNumbers_dashboard,
  get_today_leaves,
  get_tommrow_leaves,
  get_dashboard_holiday,
  fetchStatusNumbers_dashboard,
  bulkRequest,
  eventclick,
  eventclick1,
  payrollperiod,
} from '../../store/actions/filters/requestListActions';
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
} from '../../store/actions/announcement/departmentAnnouncementActions';

// ── helpers ─────────────────────────────────────────────────────────────────
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeAll(() => {
  global.links = {
    dashboard: '/dashboard',
    login: '/login',
    department_announcement_list: '/announcements',
    admin_announcement_list: '/admin/announcements',
  };
  // Keep window.location writable for logOut reload test
  delete window.location;
  window.location = { reload: jest.fn(), href: '' };
});

beforeEach(() => {
  jest.clearAllMocks();
  // Reset default mock return values after clearAllMocks
  API.call.mockResolvedValue({
    data: { content: {} },
    headers: {},
    status: 200,
  });
  API.export.mockResolvedValue({
    data: new ArrayBuffer(8),
    headers: {},
    status: 200,
  });
  Formatter.alert_error.mockReturnValue({ type: 'ALERT_ERROR' });
  Formatter.alert_success.mockReturnValue({ type: 'ALERT_SUCCESS' });
  axios.mockResolvedValue({
    data: {
      content: {
        access_token: 'test-token',
        session_id: 'test-session',
        payload: { id: 1 },
        user: { id: 1, name: 'Test' },
        constant: {},
        settings: {},
      },
    },
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// redirectActions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('redirectActions', () => {
  test('setRedirect dispatches SET_REDIRECT with provided link', () => {
    const dispatch = jest.fn();
    setRedirect('/profile')(dispatch, jest.fn());
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_REDIRECT', link: '/profile' });
  });

  test('setRedirect uses global.links.dashboard when link is null', () => {
    const dispatch = jest.fn();
    setRedirect(null)(dispatch, jest.fn());
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_REDIRECT', link: '/dashboard' });
  });

  test('clearRedirect dispatches CLEAR_REDIRECT', () => {
    const dispatch = jest.fn();
    clearRedirect()(dispatch, jest.fn());
    expect(dispatch).toHaveBeenCalledWith({ type: 'CLEAR_REDIRECT' });
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// alertActions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('alertActions', () => {
  test('showAlert dispatches SHOW_ALERT with message and timeout', () => {
    const dispatch = jest.fn();
    showAlert('Test message', 3000)(dispatch, jest.fn());
    expect(dispatch).toHaveBeenCalledWith({
      type: 'SHOW_ALERT',
      header: 'Test message',
      timeOut: 3000,
    });
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// modalLoginActions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('modalLoginActions', () => {
  test('showModalLogin dispatches SHOW_MODAL_LOGIN', () => {
    const dispatch = jest.fn();
    showModalLogin()(dispatch, jest.fn());
    expect(dispatch).toHaveBeenCalledWith({ type: 'SHOW_MODAL_LOGIN' });
  });

  test('hideModalLogin dispatches HIDE_MODAL_LOGIN', () => {
    const dispatch = jest.fn();
    hideModalLogin()(dispatch, jest.fn());
    expect(dispatch).toHaveBeenCalledWith({ type: 'HIDE_MODAL_LOGIN' });
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// changeScheduleActions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('changeScheduleActions', () => {
  test('addChangeSchedule — success path dispatches alert_success and SET_REDIRECT', async () => {
    const dispatch = jest.fn();
    addChangeSchedule({ date: '2026-06-01' })(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({ type: 'ALERT_SUCCESS' });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_REDIRECT',
      link: '/dashboard',
    });
  });

  test('addChangeSchedule — error path dispatches alert_error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    addChangeSchedule({})(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith({ type: 'ALERT_ERROR' });
  });

  test('updateChangeSchedule — success path dispatches alert_success and SET_REDIRECT', async () => {
    const dispatch = jest.fn();
    updateChangeSchedule(5, { _method: 'PUT' })(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({ type: 'ALERT_SUCCESS' });
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_REDIRECT', link: '/dashboard' });
  });

  test('updateChangeSchedule — error path', async () => {
    API.call.mockRejectedValueOnce({ status: 422 });
    const dispatch = jest.fn();
    updateChangeSchedule(5, {})(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('updateChangeScheduleStatus — success path dispatches multiple actions', async () => {
    const dispatch = jest.fn();
    updateChangeScheduleStatus(1, {}, 'approve', 2, '2026-06-01', '2026-06-30')(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({ type: 'ALERT_SUCCESS' });
  });

  test('updateChangeScheduleStatus — error path', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    updateChangeScheduleStatus(1, {}, 'approve', 2, null, null)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('fetchChangeSchedule — success path dispatches FETCH_CHANGE_SCHEDULE_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: { id: 7 } }, status: 200 });
    const dispatch = jest.fn();
    fetchChangeSchedule(7)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({
      type: 'FETCH_CHANGE_SCHEDULE_SUCCESS',
      changeSchedule: { id: 7 },
    });
  });

  test('fetchChangeSchedule — error path', async () => {
    API.call.mockRejectedValueOnce({ status: 404 });
    const dispatch = jest.fn();
    fetchChangeSchedule(99)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('clearChangeScheduleInstance dispatches CLEAR_CHANGE_SCHEDULE_INSTANCE', () => {
    const dispatch = jest.fn();
    clearChangeScheduleInstance()(dispatch, jest.fn());
    expect(dispatch).toHaveBeenCalledWith({ type: 'CLEAR_CHANGE_SCHEDULE_INSTANCE' });
  });

  test('resetChangeScheduleInstance dispatches RESET_CHANGE_SCHEDULE_INSTANCE', () => {
    const dispatch = jest.fn();
    resetChangeScheduleInstance()(dispatch, jest.fn());
    expect(dispatch).toHaveBeenCalledWith({ type: 'RESET_CHANGE_SCHEDULE_INSTANCE' });
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// overtimeActions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('overtimeActions', () => {
  test('addOvertime — success', async () => {
    const dispatch = jest.fn();
    addOvertime({ hours: 2 })(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({ type: 'ALERT_SUCCESS' });
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_REDIRECT', link: '/dashboard' });
  });

  test('addOvertime — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    addOvertime({})(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('updateOvertime — success', async () => {
    const dispatch = jest.fn();
    updateOvertime(3, { _method: 'PUT' })(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({ type: 'ALERT_SUCCESS' });
  });

  test('updateOvertime — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    updateOvertime(3, {})(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('fetchOvertime — success dispatches FETCH_OVERTIME_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: { id: 3 } } });
    const dispatch = jest.fn();
    fetchOvertime(3)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({
      type: 'FETCH_OVERTIME_SUCCESS',
      overtime: { id: 3 },
    });
  });

  test('fetchOvertime — error', async () => {
    API.call.mockRejectedValueOnce({ status: 404 });
    const dispatch = jest.fn();
    fetchOvertime(99)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('updateOvertimeStatus — success', async () => {
    const dispatch = jest.fn();
    updateOvertimeStatus(1, {}, 'approve', 2, '2026-06-01', '2026-06-30')(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({ type: 'ALERT_SUCCESS' });
  });

  test('updateOvertimeStatus — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    updateOvertimeStatus(1, {}, 'approve', 2, null, null)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('clearOvertimeInstance dispatches CLEAR_OVERTIME_INSTANCE', () => {
    const dispatch = jest.fn();
    clearOvertimeInstance()(dispatch, jest.fn());
    expect(dispatch).toHaveBeenCalledWith({ type: 'CLEAR_OVERTIME_INSTANCE' });
  });

  test('resetOvertimeInstance dispatches RESET_OVERTIME_INSTANCE', () => {
    const dispatch = jest.fn();
    resetOvertimeInstance()(dispatch, jest.fn());
    expect(dispatch).toHaveBeenCalledWith({ type: 'RESET_OVERTIME_INSTANCE' });
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// restDayWorkActions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('restDayWorkActions', () => {
  test('addRestDayWork — success', async () => {
    const dispatch = jest.fn();
    addRestDayWork({ reason: 'project' })(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({ type: 'ALERT_SUCCESS' });
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_REDIRECT', link: '/dashboard' });
  });

  test('addRestDayWork — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    addRestDayWork({})(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('updateRestDayWork — success', async () => {
    const dispatch = jest.fn();
    updateRestDayWork(4, {})(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({ type: 'ALERT_SUCCESS' });
  });

  test('updateRestDayWork — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    updateRestDayWork(4, {})(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('updateRestDayWorkStatus — success', async () => {
    const dispatch = jest.fn();
    updateRestDayWorkStatus(1, {}, 'approve', 2, '2026-06-01', '2026-06-30')(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({ type: 'ALERT_SUCCESS' });
  });

  test('updateRestDayWorkStatus — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    updateRestDayWorkStatus(1, {}, 'approve', 2, null, null)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('fetchRestDayWork — success', async () => {
    API.call.mockResolvedValueOnce({ data: { content: { id: 4 } } });
    const dispatch = jest.fn();
    fetchRestDayWork(4)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({
      type: 'FETCH_REST_DAY_WORK_SUCCESS',
      restDayWork: { id: 4 },
    });
  });

  test('fetchRestDayWork — error', async () => {
    API.call.mockRejectedValueOnce({ status: 404 });
    const dispatch = jest.fn();
    fetchRestDayWork(99)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('clearRestDayWorkInstance dispatches CLEAR_REST_DAY_WORK_INSTANCE', () => {
    const dispatch = jest.fn();
    clearRestDayWorkInstance()(dispatch, jest.fn());
    expect(dispatch).toHaveBeenCalledWith({ type: 'CLEAR_REST_DAY_WORK_INSTANCE' });
  });

  test('resetRestDayWorkInstance dispatches RESET_REST_DAY_WORK_INSTANCE', () => {
    const dispatch = jest.fn();
    resetRestDayWorkInstance()(dispatch, jest.fn());
    expect(dispatch).toHaveBeenCalledWith({ type: 'RESET_REST_DAY_WORK_INSTANCE' });
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// alterLogActions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('alterLogActions', () => {
  test('addAlterLog — success', async () => {
    const dispatch = jest.fn();
    addAlterLog({ note: 'forgot' })(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({ type: 'ALERT_SUCCESS' });
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_REDIRECT', link: '/dashboard' });
  });

  test('addAlterLog — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    addAlterLog({})(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('updateAlterLog — success', async () => {
    const dispatch = jest.fn();
    updateAlterLog(6, {})(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({ type: 'ALERT_SUCCESS' });
  });

  test('updateAlterLog — error', async () => {
    API.call.mockRejectedValueOnce({ status: 422 });
    const dispatch = jest.fn();
    updateAlterLog(6, {})(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('updateAlterLogStatus — success', async () => {
    const dispatch = jest.fn();
    updateAlterLogStatus(1, {}, 'approve', 2, '2026-06-01', '2026-06-30')(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({ type: 'ALERT_SUCCESS' });
  });

  test('updateAlterLogStatus — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    updateAlterLogStatus(1, {}, 'approve', 2, null, null)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('fetchAlterLog — success', async () => {
    API.call.mockResolvedValueOnce({ data: { content: { id: 6 } } });
    const dispatch = jest.fn();
    fetchAlterLog(6)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({
      type: 'FETCH_ALTER_LOG_SUCCESS',
      alterLog: { id: 6 },
    });
  });

  test('fetchAlterLog — error', async () => {
    API.call.mockRejectedValueOnce({ status: 404 });
    const dispatch = jest.fn();
    fetchAlterLog(99)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('clearAlterLogInstance dispatches CLEAR_ALTER_LOG_INSTANCE', () => {
    const dispatch = jest.fn();
    clearAlterLogInstance()(dispatch, jest.fn());
    expect(dispatch).toHaveBeenCalledWith({ type: 'CLEAR_ALTER_LOG_INSTANCE' });
  });

  test('resetAlterLogInstance dispatches RESET_ALTER_LOG_INSTANCE', () => {
    const dispatch = jest.fn();
    resetAlterLogInstance()(dispatch, jest.fn());
    expect(dispatch).toHaveBeenCalledWith({ type: 'RESET_ALTER_LOG_INSTANCE' });
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// alterPunchLogActions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('alterPunchLogActions', () => {
  test('addAlterLogPunch — success', async () => {
    const dispatch = jest.fn();
    addAlterLogPunch({ punch: '08:00' })(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({ type: 'ALERT_SUCCESS' });
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_REDIRECT', link: '/dashboard' });
  });

  test('addAlterLogPunch — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    addAlterLogPunch({})(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('updateAlterLogPunch — success', async () => {
    const dispatch = jest.fn();
    updateAlterLogPunch(8, {})(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({ type: 'ALERT_SUCCESS' });
  });

  test('updateAlterLogPunch — error', async () => {
    API.call.mockRejectedValueOnce({ status: 422 });
    const dispatch = jest.fn();
    updateAlterLogPunch(8, {})(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('updateAlterLogPunchStatus — success', async () => {
    const dispatch = jest.fn();
    updateAlterLogPunchStatus(1, {}, 'approve', 2, '2026-06-01', '2026-06-30')(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({ type: 'ALERT_SUCCESS' });
  });

  test('updateAlterLogPunchStatus — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    updateAlterLogPunchStatus(1, {}, 'approve', 2, null, null)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('fetchAlterLogPunch — success', async () => {
    API.call.mockResolvedValueOnce({ data: { content: { id: 8 } } });
    const dispatch = jest.fn();
    fetchAlterLogPunch(8)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({
      type: 'FETCH_ALTER_LOG_PUNCH_SUCCESS',
      alterLogPunch: { id: 8 },
    });
  });

  test('fetchAlterLogPunch — error', async () => {
    API.call.mockRejectedValueOnce({ status: 404 });
    const dispatch = jest.fn();
    fetchAlterLogPunch(99)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('clearAlterLogPunchInstance dispatches CLEAR_ALTER_LOG_PUNCH_INSTANCE', () => {
    const dispatch = jest.fn();
    clearAlterLogPunchInstance()(dispatch, jest.fn());
    expect(dispatch).toHaveBeenCalledWith({ type: 'CLEAR_ALTER_LOG_PUNCH_INSTANCE' });
  });

  test('resetAlterLogPunchInstance dispatches RESET_ALTER_LOG_PUNCH_INSTANCE', () => {
    const dispatch = jest.fn();
    resetAlterLogPunchInstance()(dispatch, jest.fn());
    expect(dispatch).toHaveBeenCalledWith({ type: 'RESET_ALTER_LOG_PUNCH_INSTANCE' });
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// coeActions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('coeActions', () => {
  test('fetchCOE — success dispatches FETCH_COE_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: [{ id: 1 }] } });
    const dispatch = jest.fn();
    fetchCOE()(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({
      type: 'FETCH_COE_SUCCESS',
      coe: [{ id: 1 }],
    });
  });

  test('fetchCOE — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    fetchCOE()(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('addCOE — success dispatches REQUEST_COE_SUCCESS', async () => {
    API.export.mockResolvedValueOnce({
      data: new ArrayBuffer(4),
      headers: {},
      status: 200,
    });
    // fetchCOE will also call API.call; set it up
    API.call.mockResolvedValueOnce({ data: { content: [] } });
    const dispatch = jest.fn();
    addCOE({ type: 'general' })(dispatch, jest.fn());
    await flushPromises();
    const types = dispatch.mock.calls.map((c) => c[0] && (c[0].type || ''));
    expect(types).toContain('REQUEST_COE_SUCCESS');
  });

  test('addCOE — error', async () => {
    API.export.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    addCOE({})(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// userActions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('userActions', () => {
  test('logIn — success dispatches REQUEST_START then LOGIN_SUCCESS etc', async () => {
    const dispatch = jest.fn();
    logIn({ email: 'a@b.com', password: 'pass' })(dispatch, jest.fn());
    expect(dispatch).toHaveBeenCalledWith({ type: 'REQUEST_START' });
    await flushPromises();
    const types = dispatch.mock.calls.map((c) => c[0].type);
    expect(types).toContain('LOGIN_SUCCESS');
    expect(types).toContain('HIDE_MODAL_LOGIN');
    expect(types).toContain('RENDER_CONSTANT');
    expect(types).toContain('RENDER_SETTINGS');
  });

  test('logIn — error dispatches alert_error', async () => {
    axios.mockRejectedValueOnce({ response: { status: 401 } });
    const dispatch = jest.fn();
    logIn({ email: 'bad@b.com', password: 'wrong' })(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('authenticateClient — success dispatches LOGIN_SUCCESS', async () => {
    const dispatch = jest.fn();
    authenticateClient('some-token')(dispatch, jest.fn());
    expect(dispatch).toHaveBeenCalledWith({ type: 'REQUEST_START' });
    await flushPromises();
    const types = dispatch.mock.calls.map((c) => c[0].type);
    expect(types).toContain('LOGIN_SUCCESS');
    expect(types).toContain('RENDER_CONSTANT');
    expect(types).toContain('RENDER_SETTINGS');
  });

  test('authenticateClient — error is handled silently (catch block commented out)', async () => {
    axios.mockRejectedValueOnce({ response: null });
    const dispatch = jest.fn();
    authenticateClient('bad')(dispatch, jest.fn());
    await flushPromises();
    // Source catch block is commented out — only REQUEST_START should be dispatched
    expect(dispatch).toHaveBeenCalledWith({ type: 'REQUEST_START' });
  });

  test('authenticateMSClient — success sets window.location.href', async () => {
    axios.mockResolvedValueOnce({
      data: { content: { access_token: 'ms-token' } },
    });
    const dispatch = jest.fn();
    authenticateMSClient('ms-code')(dispatch, jest.fn());
    await flushPromises();
    expect(window.location.href).toBe(
      process.env.REACT_APP_PUBLIC_URL + '/login'
    );
  });

  test('authenticateMSClient — error with 403 dispatches alert_error twice', async () => {
    axios.mockRejectedValueOnce({ response: { status: 403 } });
    const dispatch = jest.fn();
    authenticateMSClient('bad-code')(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalledTimes(2);
  });

  test('authenticateMSClient — generic error dispatches alert_error once', async () => {
    axios.mockRejectedValueOnce({ response: { status: 500 } });
    const dispatch = jest.fn();
    authenticateMSClient('bad-code')(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalledTimes(1);
  });

  test('logOut — success dispatches LOGOUT_SUCCESS', async () => {
    const dispatch = jest.fn();
    logOut()(dispatch, jest.fn());
    await flushPromises();
    const types = dispatch.mock.calls.map((c) => c[0] && c[0].type).filter(Boolean);
    expect(types).toContain('LOGOUT_SUCCESS');
    expect(types).toContain('CLEAR_RECENT_DTR_INSTANCE');
  });

  test('logOut — error dispatches alert_error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    logOut()(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('fetchUser — success dispatches FETCH_USER_SUCCESS and RELOAD_END', async () => {
    API.call.mockResolvedValueOnce({
      data: {
        content: {
          payload: { id: 1 },
          user: { id: 1 },
          constant: {},
          settings: {},
        },
      },
    });
    const dispatch = jest.fn();
    fetchUser()(dispatch, jest.fn());
    expect(dispatch).toHaveBeenCalledWith({ type: 'RELOAD_START' });
    await flushPromises();
    const types = dispatch.mock.calls.map((c) => c[0].type);
    expect(types).toContain('FETCH_USER_SUCCESS');
    expect(types).toContain('RELOAD_END');
  });

  test('fetchUser — error', async () => {
    API.call.mockRejectedValueOnce({ status: 401 });
    const dispatch = jest.fn();
    fetchUser()(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('getUserInfo — success dispatches FETCH_USER_INFO', async () => {
    API.call.mockResolvedValueOnce({ data: { content: { name: 'Alice' } } });
    const dispatch = jest.fn();
    getUserInfo(1)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({
      type: 'FETCH_USER_INFO',
      userInfo: { name: 'Alice' },
    });
    expect(dispatch).toHaveBeenCalledWith({ type: 'RELOAD_END' });
  });

  test('getUserInfo — error', async () => {
    API.call.mockRejectedValueOnce({ status: 404 });
    const dispatch = jest.fn();
    getUserInfo(99)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('forgotPasswordRequest — success dispatches alert_success and SET_REDIRECT', async () => {
    axios.mockResolvedValueOnce({ data: { message: 'email sent' } });
    const dispatch = jest.fn();
    forgotPasswordRequest('test@example.com')(dispatch, jest.fn());
    expect(dispatch).toHaveBeenCalledWith({ type: 'REQUEST_START' });
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({ type: 'ALERT_SUCCESS' });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_REDIRECT',
      link: global.links.login,
    });
  });

  test('forgotPasswordRequest — error', async () => {
    axios.mockRejectedValueOnce({ response: { status: 404 } });
    const dispatch = jest.fn();
    forgotPasswordRequest('noone@example.com')(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('getAllAssets — success dispatches FETCH_ALL_ASSETS', async () => {
    API.call.mockResolvedValueOnce({ data: { items: [] } });
    const dispatch = jest.fn();
    getAllAssets({ page: 1 })(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_ALL_ASSETS' })
    );
  });

  test('getAllAssets — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    getAllAssets({})(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('getUserAsset — success dispatches FETCH_USER_ASSET', async () => {
    API.call.mockResolvedValueOnce({ data: { content: { id: 1 } } });
    const dispatch = jest.fn();
    getUserAsset(1)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_USER_ASSET' })
    );
  });

  test('getUserAsset — error', async () => {
    API.call.mockRejectedValueOnce({ status: 404 });
    const dispatch = jest.fn();
    getUserAsset(99)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('getUserAssets — success dispatches FETCH_USER_ASSETS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: [] } });
    const dispatch = jest.fn();
    getUserAssets()(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_USER_ASSETS' })
    );
  });

  test('getUserAssets — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    getUserAssets()(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('addUserAsset — success dispatches CLEAR_USER_ASSET_LOAD and alert_success', async () => {
    const dispatch = jest.fn();
    addUserAsset({ name: 'Laptop' })(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'CLEAR_USER_ASSET_LOAD' })
    );
    expect(dispatch).toHaveBeenCalledWith({ type: 'ALERT_SUCCESS' });
  });

  test('addUserAsset — error', async () => {
    API.call.mockRejectedValueOnce({ status: 422 });
    const dispatch = jest.fn();
    addUserAsset({})(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('updateUserAsset — success', async () => {
    const dispatch = jest.fn();
    updateUserAsset({ id: 1 })(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'CLEAR_USER_ASSET_LOAD' })
    );
  });

  test('updateUserAsset — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    updateUserAsset({})(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('getNhoSurvey — success dispatches FETCH_USER_NHO', async () => {
    API.call.mockResolvedValueOnce({ data: { questions: [] } });
    const dispatch = jest.fn();
    getNhoSurvey()(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_USER_NHO' })
    );
    expect(dispatch).toHaveBeenCalledWith({ type: 'RELOAD_END' });
  });

  test('getNhoSurvey — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    getNhoSurvey()(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('addNhoSurvey — success (status 200) dispatches alert_success', async () => {
    API.call.mockResolvedValueOnce({ status: 200, data: {} });
    const dispatch = jest.fn();
    addNhoSurvey({ q1: 'yes' })(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({ type: 'ALERT_SUCCESS' });
  });

  test('addNhoSurvey — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    addNhoSurvey({})(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('getEvaSurvey — success dispatches FETCH_USER_EVA', async () => {
    API.call.mockResolvedValueOnce({ data: { content: [] } });
    const dispatch = jest.fn();
    getEvaSurvey()(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_USER_EVA' })
    );
  });

  test('getEvaSurvey — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    getEvaSurvey()(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('addEvaSurvey — success (status 200)', async () => {
    API.call.mockResolvedValueOnce({ status: 200, data: {} });
    const dispatch = jest.fn();
    addEvaSurvey({ rating: 5 })(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({ type: 'ALERT_SUCCESS' });
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'CLEAR_USER_EVA' })
    );
  });

  test('addEvaSurvey — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    addEvaSurvey({})(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('getUserCoc — success dispatches FETCH_USER_COC', async () => {
    API.call.mockResolvedValueOnce({ data: { content: {} } });
    const dispatch = jest.fn();
    getUserCoc()(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_USER_COC' })
    );
  });

  test('getUserCoc — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    getUserCoc()(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('acknowledgeCOC — success (status 200)', async () => {
    API.call.mockResolvedValueOnce({ status: 200, data: {} });
    const dispatch = jest.fn();
    acknowledgeCOC()(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({ type: 'ALERT_SUCCESS' });
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'CLEAR_USER_COC' })
    );
  });

  test('acknowledgeCOC — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    acknowledgeCOC()(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('getEvaReg — success dispatches FETCH_USER_EVA_REG', async () => {
    API.call.mockResolvedValueOnce({ data: { content: {} } });
    const dispatch = jest.fn();
    getEvaReg()(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_USER_EVA_REG' })
    );
  });

  test('getEvaReg — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    getEvaReg()(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('submitEvaReg — success (status 200)', async () => {
    API.call.mockResolvedValueOnce({ status: 200, data: {} });
    const dispatch = jest.fn();
    submitEvaReg()(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({ type: 'ALERT_SUCCESS' });
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'CLEAR_USER_EVA_REG' })
    );
  });

  test('submitEvaReg — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    submitEvaReg()(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('getHappinessSurvey — success dispatches FETCH_USER_HAPPINESS_SURVEY', async () => {
    API.call.mockResolvedValueOnce({ data: { content: {} } });
    const dispatch = jest.fn();
    getHappinessSurvey()(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_USER_HAPPINESS_SURVEY' })
    );
  });

  test('getHappinessSurvey — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    getHappinessSurvey()(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('addHappinessSurvey — success (status 200)', async () => {
    API.call.mockResolvedValueOnce({ status: 200, data: {} });
    const dispatch = jest.fn();
    addHappinessSurvey({ score: 8 })(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({ type: 'ALERT_SUCCESS' });
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'CLEAR_USER_HAPPINESS_SURVEY' })
    );
  });

  test('addHappinessSurvey — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    addHappinessSurvey({})(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// dtrActions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('dtrActions', () => {
  test('viewEmployeeDtr — success dispatches FETCH_DTR_SUCCESS and FETCH_USER_DTR_SUMMARY_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({
      data: {
        content: {
          dtr_records: [{ id: 1 }],
          summary: {
            items: { data: [], employee_info: {} },
            column: [],
            column_names: [],
          },
        },
      },
    });
    const dispatch = jest.fn();
    viewEmployeeDtr(1, '2026-06-01', '2026-06-30')(dispatch, jest.fn());
    await flushPromises();
    const types = dispatch.mock.calls.map((c) => c[0].type);
    expect(types).toContain('FETCH_DTR_SUCCESS');
    expect(types).toContain('FETCH_USER_DTR_SUMMARY_SUCCESS');
    expect(types).toContain('RELOAD_END');
  });

  test('viewEmployeeDtr — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    viewEmployeeDtr(1, '2026-06-01', '2026-06-30')(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('viewEmployeePunch — success dispatches FETCH_PUNCH_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: [] } });
    const dispatch = jest.fn();
    viewEmployeePunch(1, '2026-06-01', '2026-06-30')(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_PUNCH_SUCCESS' })
    );
  });

  test('viewEmployeePunch — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    viewEmployeePunch(1, '2026-06-01', '2026-06-30')(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('viewEmployeeTargetPunch — success dispatches FETCH_SINGLE_PUNCH_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: [] } });
    const dispatch = jest.fn();
    viewEmployeeTargetPunch(1, '2026-06-01', '2026-06-30')(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_SINGLE_PUNCH_SUCCESS' })
    );
  });

  test('viewEmployeeTargetPunch — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    viewEmployeeTargetPunch(1, '2026-06-01', '2026-06-30')(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('getFilterForDtr — success dispatches FETCH_DTR_FILTER_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: {} } });
    const dispatch = jest.fn();
    getFilterForDtr(1)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_DTR_FILTER_SUCCESS' })
    );
  });

  test('getFilterForDtr — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    getFilterForDtr(99)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('getUserDtrSummary — success dispatches FETCH_USER_DTR_SUMMARY_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({
      data: {
        content: {
          summary: [{ summary: [], employee_info: {} }],
          column: [],
          column_names: [],
        },
      },
    });
    const dispatch = jest.fn();
    getUserDtrSummary(1, '2026-06-01', '2026-06-30')(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_USER_DTR_SUMMARY_SUCCESS' })
    );
  });

  test('getUserDtrSummary — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    getUserDtrSummary(1, '2026-06-01', '2026-06-30')(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('setSelectedPayrollCutoff dispatches SET_SELECTED_PAYROLL_CUTOFF', () => {
    const dispatch = jest.fn();
    setSelectedPayrollCutoff({ id: 5 })(dispatch, jest.fn());
    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_SELECTED_PAYROLL_CUTOFF',
      payrollCutoff: { id: 5 },
    });
  });

  test('getIncompleteDtr — success dispatches FETCH_INCOMPLETE_DTR', async () => {
    API.call.mockResolvedValueOnce({ data: { items: [] } });
    const dispatch = jest.fn();
    getIncompleteDtr()(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_INCOMPLETE_DTR' })
    );
  });

  test('getIncompleteDtr — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    getIncompleteDtr()(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// profileActions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('profileActions', () => {
  test('setDateList dispatches SET_DATE_LIST', () => {
    const dispatch = jest.fn();
    setDateList(['2026-06-01'])(dispatch, jest.fn());
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_DATE_LIST', date_list: ['2026-06-01'] });
  });

  test('setEmpSchedule dispatches SET_EMP_SCHEDULE', () => {
    const dispatch = jest.fn();
    setEmpSchedule({ type: 'standard' })(dispatch, jest.fn());
    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_EMP_SCHEDULE',
      emp_sched: { type: 'standard' },
    });
  });

  test('setScope dispatches SET_SCOPE', () => {
    const dispatch = jest.fn();
    setScope('team')(dispatch, jest.fn());
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_SCOPE', scope: 'team' });
  });

  test('setWeekList dispatches SET_WEEK_LIST', () => {
    const dispatch = jest.fn();
    setWeekList([1, 2, 3])(dispatch, jest.fn());
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_WEEK_LIST', data: [1, 2, 3] });
  });

  test('fetchProfile — success dispatches FETCH_PROFILE', async () => {
    API.call.mockResolvedValueOnce({
      data: { content: { user: {}, profile_picture: null } },
    });
    const dispatch = jest.fn();
    fetchProfile(1)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_PROFILE' })
    );
  });

  test('fetchProfile — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    fetchProfile(99)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('updateUserProfile — success dispatches alert_success', async () => {
    const dispatch = jest.fn();
    updateUserProfile(1, { name: 'Bob' })(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({ type: 'ALERT_SUCCESS' });
  });

  test('updateUserProfile — error', async () => {
    API.call.mockRejectedValueOnce({ status: 422 });
    const dispatch = jest.fn();
    updateUserProfile(1, {})(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('fetchPersonalInformation — success dispatches FETCH_PERSONAL_INFORMATION', async () => {
    API.call.mockResolvedValueOnce({ data: { content: {} } });
    const dispatch = jest.fn();
    fetchPersonalInformation(1)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_PERSONAL_INFORMATION' })
    );
  });

  test('fetchPersonalInformation — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    fetchPersonalInformation(99)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('fetchJobInformation — success dispatches FETCH_JOB_INFORMATION', async () => {
    API.call.mockResolvedValueOnce({
      data: { content: { job_information: {}, employment_status: '' } },
    });
    const dispatch = jest.fn();
    fetchJobInformation(1)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_JOB_INFORMATION' })
    );
  });

  test('fetchJobInformation — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    fetchJobInformation(99)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('fetchLeaveCredits — success dispatches FETCH_LEAVE_CREDITS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: [] } });
    const dispatch = jest.fn();
    fetchLeaveCredits(1)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_LEAVE_CREDITS' })
    );
  });

  test('fetchLeaveCredits — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    fetchLeaveCredits(99)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('fetchSchedule — success dispatches FETCH_SCHEDULE', async () => {
    API.call.mockResolvedValueOnce({ data: { content: {} } });
    const dispatch = jest.fn();
    fetchSchedule(1)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_SCHEDULE' })
    );
  });

  test('fetchSchedule — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    fetchSchedule(99)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('fetchScheduleHistory — success dispatches FETCH_SCHEDULE_HISTORY', async () => {
    API.call.mockResolvedValueOnce({ data: { content: [] } });
    const dispatch = jest.fn();
    fetchScheduleHistory(1, null)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_SCHEDULE_HISTORY' })
    );
  });

  test('fetchScheduleHistory — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    fetchScheduleHistory(99, null)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('fetchTemporarySchedule — success dispatches FETCH_TEMPORARY_SCHEDULE', async () => {
    API.call.mockResolvedValueOnce({ data: { content: [] } });
    const dispatch = jest.fn();
    fetchTemporarySchedule(1)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_TEMPORARY_SCHEDULE' })
    );
  });

  test('fetchTemporarySchedule — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    fetchTemporarySchedule(99)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('changePassword — success dispatches CLOSE_ALL_FORM and alert_success', async () => {
    const dispatch = jest.fn();
    changePassword(1, { old_password: 'old', new_password: 'new' })(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({ type: 'CLOSE_ALL_FORM' });
    expect(dispatch).toHaveBeenCalledWith({ type: 'ALERT_SUCCESS' });
  });

  test('changePassword — success with reset_password dispatches TOGGLE_FORCE_CHANGE_PASSWORD', async () => {
    const dispatch = jest.fn();
    changePassword(1, { reset_password: true })(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({ type: 'TOGGLE_FORCE_CHANGE_PASSWORD' });
  });

  test('changePassword — error', async () => {
    API.call.mockRejectedValueOnce({ status: 422 });
    const dispatch = jest.fn();
    changePassword(1, {})(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('tickDpa — success dispatches alert_success and TICK_DPA', async () => {
    const dispatch = jest.fn();
    tickDpa(1)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({ type: 'ALERT_SUCCESS' });
    expect(dispatch).toHaveBeenCalledWith({ type: 'TICK_DPA' });
  });

  test('tickDpa — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    tickDpa(99)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// scheduleActions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('scheduleActions', () => {
  test('addTemplateSchedule — success', async () => {
    const dispatch = jest.fn();
    addTemplateSchedule({ name: 'Day Shift' })(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({ type: 'ALERT_SUCCESS' });
  });

  test('addTemplateSchedule — error', async () => {
    API.call.mockRejectedValueOnce({ status: 422 });
    const dispatch = jest.fn();
    addTemplateSchedule({})(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('getScheduleInfo — success dispatches FETCH_DEFAULT_SCHEDULE_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: {} } });
    const dispatch = jest.fn();
    getScheduleInfo('department', 1, 5)(dispatch, jest.fn());
    expect(dispatch).toHaveBeenCalledWith({ type: 'RELOAD_START' });
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_DEFAULT_SCHEDULE_SUCCESS' })
    );
    expect(dispatch).toHaveBeenCalledWith({ type: 'RELOAD_END' });
  });

  test('getScheduleInfo — error', async () => {
    API.call.mockRejectedValueOnce({ status: 404, response: null });
    const dispatch = jest.fn();
    getScheduleInfo('department', 1, 99)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('getDefaultSchedule — success dispatches FETCH_DEFAULT_SCHEDULE_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: {} } });
    const dispatch = jest.fn();
    getDefaultSchedule('user', 1)(dispatch, jest.fn());
    expect(dispatch).toHaveBeenCalledWith({ type: 'RELOAD_START' });
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_DEFAULT_SCHEDULE_SUCCESS' })
    );
  });

  test('getDefaultSchedule — error', async () => {
    API.call.mockRejectedValueOnce({ status: 404, response: null });
    const dispatch = jest.fn();
    getDefaultSchedule('user', 99)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('getTemplateSchedule — type Template dispatches FETCH_TEMPLATE_SCHEDULE_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: {} } });
    const dispatch = jest.fn();
    getTemplateSchedule(1, 'Template')(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_TEMPLATE_SCHEDULE_SUCCESS' })
    );
  });

  test('getTemplateSchedule — type Default dispatches FETCH_TEMPLATE_DEFAULT_SCHEDULE_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: {} } });
    const dispatch = jest.fn();
    getTemplateSchedule(1, 'Default')(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_TEMPLATE_DEFAULT_SCHEDULE_SUCCESS' })
    );
  });

  test('getTemplateSchedule — error', async () => {
    API.call.mockRejectedValueOnce({ status: 404, response: null });
    const dispatch = jest.fn();
    getTemplateSchedule(99, 'Template')(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('updateSchedule — success', async () => {
    const dispatch = jest.fn();
    updateSchedule({ name: 'Night' }, 3)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({ type: 'ALERT_SUCCESS' });
  });

  test('updateSchedule — error', async () => {
    API.call.mockRejectedValueOnce({ status: 422 });
    const dispatch = jest.fn();
    updateSchedule({}, 3)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('listTemplate — success dispatches FETCH_TEMPLATES_SCHEDULE_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: [] } });
    const dispatch = jest.fn();
    listTemplate()(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_TEMPLATES_SCHEDULE_SUCCESS' })
    );
  });

  test('listTemplate — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    listTemplate()(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('deleteSchedule — success', async () => {
    const dispatch = jest.fn();
    deleteSchedule(5)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({ type: 'ALERT_SUCCESS' });
  });

  test('deleteSchedule — error', async () => {
    API.call.mockRejectedValueOnce({ status: 404 });
    const dispatch = jest.fn();
    deleteSchedule(99)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('scheduleAssign — success', async () => {
    const dispatch = jest.fn();
    scheduleAssign({ user_id: 1, schedule_id: 2 })(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({ type: 'ALERT_SUCCESS' });
  });

  test('scheduleAssign — error', async () => {
    API.call.mockRejectedValueOnce({ status: 422 });
    const dispatch = jest.fn();
    scheduleAssign({})(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// dashboardActions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('dashboardActions', () => {
  const statusNumbers = {
    team_alterlogpending: 0,
    team_overtimepending: 0,
    team_restdayworkpending: 0,
    team_changeschedulepending: 0,
    alterlogpending: 0,
    overtimepending: 0,
    restdayworkpending: 0,
    changeschedulepending: 0,
  };

  test('getDashboardOverall page_type=1 — dispatches DASHBOARD_HOLIDAY, TODAY_LEAVES, TOMMOROW_LEAVES, ALTER_LOG_PENDING', async () => {
    API.call.mockResolvedValueOnce({
      data: {
        data: {
          dashboardholiday: [],
          todayleaves: [],
          tommorowleaves: [],
          status_numbers: statusNumbers,
        },
      },
    });
    const dispatch = jest.fn();
    getDashboardOverall(1, null)(dispatch, jest.fn());
    await flushPromises();
    const types = dispatch.mock.calls.map((c) => c[0] && c[0].type).filter(Boolean);
    expect(types).toContain('DASHBOARD_HOLIDAY');
    expect(types).toContain('TODAY_LEAVES');
    expect(types).toContain('TOMMOROW_LEAVES');
    expect(types).toContain('ALTER_LOG_PENDING');
  });

  test('getDashboardOverall page_type=2 — dispatches FETCH_BIRTHDAY_ANNIVERSARY', async () => {
    API.call.mockResolvedValueOnce({
      data: { data: { team_birthday: [] } },
    });
    const dispatch = jest.fn();
    getDashboardOverall(2, null)(dispatch, jest.fn());
    await flushPromises();
    const types = dispatch.mock.calls.map((c) => c[0] && c[0].type).filter(Boolean);
    expect(types).toContain('FETCH_BIRTHDAY_ANNIVERSARY');
  });

  test('getDashboardOverall page_type=3 with params.page — dispatches INCREMENT', async () => {
    API.call.mockResolvedValueOnce({
      data: { data: { announcements: [] } },
    });
    const dispatch = jest.fn();
    getDashboardOverall(3, { page: 2 })(dispatch, jest.fn());
    await flushPromises();
    const types = dispatch.mock.calls.map((c) => c[0] && c[0].type).filter(Boolean);
    expect(types).toContain('INCREMENT_DEPARTMENT_ANNOUNCEMENT_INDEX_LOAD_SUCCESS');
  });

  test('getDashboardOverall page_type=3 without params.page — dispatches FETCH and FETCH_DEPARTMENT_LIST', async () => {
    API.call.mockResolvedValueOnce({
      data: { data: { announcements: [], departments: [] } },
    });
    const dispatch = jest.fn();
    getDashboardOverall(3, null)(dispatch, jest.fn());
    await flushPromises();
    const types = dispatch.mock.calls.map((c) => c[0] && c[0].type).filter(Boolean);
    expect(types).toContain('FETCH_DEPARTMENT_ANNOUNCEMENT_INDEX_LOAD_SUCCESS');
    expect(types).toContain('FETCH_DEPARTMENT_LIST_SUCCESS');
  });

  test('getDashboardOverall — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    getDashboardOverall(1, null)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('getMyDtrNotifications — success dispatches FETCH_MY_DTR_NOTIFICATIONS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: [] } });
    const dispatch = jest.fn();
    getMyDtrNotifications()(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_MY_DTR_NOTIFICATIONS' })
    );
  });

  test('getMyDtrNotifications — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    getMyDtrNotifications()(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('getBirthdayAnniv — success dispatches FETCH_BIRTHDAY_ANNIVERSARY', async () => {
    API.call.mockResolvedValueOnce({ data: { content: [] } });
    const dispatch = jest.fn();
    getBirthdayAnniv(null)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_BIRTHDAY_ANNIVERSARY' })
    );
  });

  test('getBirthdayAnniv — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    getBirthdayAnniv(null)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('getTeamAttendanceStatus — success dispatches FETCH_TEAM_ATTENDANCE_STATUS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: [] } });
    const dispatch = jest.fn();
    getTeamAttendanceStatus(null)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_TEAM_ATTENDANCE_STATUS' })
    );
  });

  test('getTeamAttendanceStatus — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    getTeamAttendanceStatus(null)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('getThisMonthHoliday — success dispatches FETCH_HOLIDAYS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: [] } });
    const dispatch = jest.fn();
    getThisMonthHoliday()(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_HOLIDAYS' })
    );
  });

  test('getThisMonthHoliday — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    getThisMonthHoliday()(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('getRecentDtr — success dispatches FETCH_RECENT_DTR', async () => {
    API.call.mockResolvedValueOnce({ data: { content: { dtr_records: [] } } });
    const dispatch = jest.fn();
    getRecentDtr(1, '2026-06-01', '2026-06-30')(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_RECENT_DTR' })
    );
  });

  test('getRecentDtr — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    getRecentDtr(1, '2026-06-01', '2026-06-30')(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('getRecentPunches — success dispatches FETCH_RECENT_PUNCH', async () => {
    API.call.mockResolvedValueOnce({ data: { punches: [] } });
    const dispatch = jest.fn();
    getRecentPunches(1, '2026-06-01', '2026-06-30')(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_RECENT_PUNCH' })
    );
  });

  test('getRecentPunches — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    getRecentPunches(1, '2026-06-01', '2026-06-30')(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('getRecentPunches2 — success dispatches FETCH_SINGLE_PUNCH_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({ data: { punches: [] } });
    const dispatch = jest.fn();
    getRecentPunches2(1, '2026-06-01', '2026-06-30')(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_SINGLE_PUNCH_SUCCESS' })
    );
  });

  test('getRecentPunches2 — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    getRecentPunches2(1, '2026-06-01', '2026-06-30')(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('clearRecentPunches2 dispatches CLEAR_SINGLE_PUNCH_SUCCESS', () => {
    const dispatch = jest.fn();
    clearRecentPunches2()(dispatch, jest.fn());
    expect(dispatch).toHaveBeenCalledWith({ type: 'CLEAR_SINGLE_PUNCH_SUCCESS' });
  });

  test('getChangeLogs — success dispatches FETCH_CHANGE_LOGS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: [] } });
    const dispatch = jest.fn();
    getChangeLogs()(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_CHANGE_LOGS' })
    );
  });

  test('getChangeLogs — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    getChangeLogs()(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('clearRecentDtrInstance dispatches CLEAR_RECENT_DTR_INSTANCE', () => {
    const dispatch = jest.fn();
    clearRecentDtrInstance()(dispatch, jest.fn());
    expect(dispatch).toHaveBeenCalledWith({ type: 'CLEAR_RECENT_DTR_INSTANCE' });
  });

  test('getMyNotifications — success dispatches FETCH_MY_NOTIFICATIONS and COUNT', async () => {
    API.call.mockResolvedValueOnce({
      data: {
        requestsForApproval: [],
        requestStatus: [],
        announcements: [],
        celebrations: [],
        missedDtr: [],
      },
    });
    const dispatch = jest.fn();
    getMyNotifications(1)(dispatch, jest.fn());
    await flushPromises();
    const types = dispatch.mock.calls.map((c) => c[0].type);
    expect(types).toContain('FETCH_MY_NOTIFICATIONS');
    expect(types).toContain('FETCH_MY_NOTIFICATIONS_COUNT');
  });

  test('getMyNotifications — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    getMyNotifications(1)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// requestListActions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('requestListActions', () => {
  const teamParams = {
    url: 'my_team_requests',
    status: 'pending',
    page: 1,
    request_type: 'all',
    checkedList: [],
    isAll: false,
    action: null,
    bulk_action: null,
    valid_from: null,
    valid_to: null,
    department_id: null,
    name: null,
  };

  const myParams = { ...teamParams, url: 'my_requests' };

  test('fetchRequestList (my_team_requests) — success dispatches FETCH_MY_TEAM_REQUEST_LIST_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({
      data: {
        content: {
          result: { status_numbers: {} },
        },
      },
    });
    const dispatch = jest.fn();
    fetchRequestList(teamParams)(dispatch, jest.fn());
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SET_MY_TEAM_REQUEST_LIST_FILTERS' })
    );
    await flushPromises();
    const types = dispatch.mock.calls.map((c) => c[0].type);
    expect(types).toContain('FETCH_MY_TEAM_REQUEST_LIST_SUCCESS');
    expect(types).toContain('FETCH_MY_TEAM_REFRESH_DEP_LIST');
    expect(types).toContain('FETCH_MY_TEAM_REQUEST_STATUS_NUMBERS');
  });

  test('fetchRequestList (my_requests) — success dispatches FETCH_MY_REQUEST_LIST_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({
      data: { content: { result: { status_numbers: {} } } },
    });
    const dispatch = jest.fn();
    fetchRequestList(myParams)(dispatch, jest.fn());
    await flushPromises();
    const types = dispatch.mock.calls.map((c) => c[0].type);
    expect(types).toContain('FETCH_MY_REQUEST_LIST_SUCCESS');
  });

  test('fetchRequestList — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    fetchRequestList(teamParams)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('fetchStatusNumbers (my_team_requests) — success dispatches FETCH_MY_TEAM_REQUEST_STATUS_NUMBERS', async () => {
    API.call.mockResolvedValueOnce({
      data: { content: { status_numbers: {} } },
    });
    const dispatch = jest.fn();
    fetchStatusNumbers(teamParams)(dispatch, jest.fn());
    await flushPromises();
    const types = dispatch.mock.calls.map((c) => c[0].type);
    expect(types).toContain('FETCH_MY_TEAM_REQUEST_STATUS_NUMBERS');
    expect(types).toContain('EVENT_CLICK');
  });

  test('fetchStatusNumbers (my_requests) — success dispatches FETCH_MY_REQUEST_STATUS_NUMBERS', async () => {
    API.call.mockResolvedValueOnce({
      data: { content: { status_numbers: {} } },
    });
    const dispatch = jest.fn();
    fetchStatusNumbers(myParams)(dispatch, jest.fn());
    await flushPromises();
    const types = dispatch.mock.calls.map((c) => c[0].type);
    expect(types).toContain('FETCH_MY_REQUEST_STATUS_NUMBERS');
  });

  test('fetchStatusNumbers — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    fetchStatusNumbers(teamParams)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('fetchRequestListDisputes — success (status 200)', async () => {
    API.call.mockResolvedValueOnce({
      status: 200,
      data: { content: { dispute_list: [], dispute_count: 0 } },
    });
    const dispatch = jest.fn();
    fetchRequestListDisputes({})(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_MY_DISPUTE_REQUEST_LIST_SUCCESS' })
    );
  });

  test('fetchRequestListDisputes — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    fetchRequestListDisputes({})(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('myfetchStatusNumbers_dashboard — returns empty thunk', () => {
    const dispatch = jest.fn();
    myfetchStatusNumbers_dashboard(jest.fn(), jest.fn(), jest.fn(), jest.fn(), jest.fn())(
      dispatch,
      jest.fn()
    );
    expect(dispatch).not.toHaveBeenCalled();
  });

  test('get_today_leaves — success dispatches TODAY_LEAVES', async () => {
    API.call.mockResolvedValueOnce({ data: { data: [{ id: 1 }] } });
    const setLeaves = jest.fn();
    const dispatch = jest.fn();
    get_today_leaves(setLeaves)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'TODAY_LEAVES' })
    );
    expect(setLeaves).toHaveBeenCalledWith([{ id: 1 }]);
  });

  test('get_today_leaves — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    get_today_leaves(jest.fn())(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('get_tommrow_leaves — success dispatches TOMMOROW_LEAVES', async () => {
    API.call.mockResolvedValueOnce({ data: { data: [] } });
    const dispatch = jest.fn();
    const setter = jest.fn();
    get_tommrow_leaves(setter)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'TOMMOROW_LEAVES' })
    );
  });

  test('get_tommrow_leaves — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    get_tommrow_leaves(jest.fn())(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('get_dashboard_holiday — success dispatches DASHBOARD_HOLIDAY', async () => {
    API.call.mockResolvedValueOnce({ data: { holidays: [] } });
    const dispatch = jest.fn();
    const setter = jest.fn();
    get_dashboard_holiday(setter, '2026-06-01', '2026-06-30')(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'DASHBOARD_HOLIDAY' })
    );
  });

  test('get_dashboard_holiday — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    get_dashboard_holiday(jest.fn(), null, null)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('fetchStatusNumbers_dashboard — success dispatches ALTER_LOG_PENDING', async () => {
    API.call.mockResolvedValueOnce({
      data: {
        content: {
          status_numbers: {
            team_alterlogpending: 1,
            team_overtimepending: 2,
            team_restdayworkpending: 0,
            team_changeschedulepending: 0,
            alterlogpending: 0,
            overtimepending: 0,
            restdayworkpending: 0,
            changeschedulepending: 0,
          },
        },
      },
    });
    const setters = Array.from({ length: 9 }, () => jest.fn());
    const dispatch = jest.fn();
    fetchStatusNumbers_dashboard(...setters)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ALTER_LOG_PENDING' })
    );
  });

  test('fetchStatusNumbers_dashboard — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const setters = Array.from({ length: 9 }, () => jest.fn());
    const dispatch = jest.fn();
    fetchStatusNumbers_dashboard(...setters)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('bulkRequest — success dispatches alert_success and returns result', async () => {
    API.call.mockResolvedValueOnce({ data: { message: 'done' }, status: 200 });
    const dispatch = jest.fn();
    const result = bulkRequest({ ids: [1, 2] })(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({ type: 'ALERT_SUCCESS' });
    await expect(result).resolves.toBeDefined();
  });

  test('bulkRequest — error dispatches alert_error and rethrows', async () => {
    API.call.mockRejectedValueOnce(new Error('network error'));
    const dispatch = jest.fn();
    let threw = false;
    try {
      await bulkRequest({})(dispatch, jest.fn());
    } catch (e) {
      threw = true;
    }
    expect(Formatter.alert_error).toHaveBeenCalled();
    expect(threw).toBe(true);
  });

  test('eventclick dispatches EVENT_CLICK', () => {
    const dispatch = jest.fn();
    eventclick('alter_log')(dispatch, jest.fn());
    expect(dispatch).toHaveBeenCalledWith({ type: 'EVENT_CLICK', requesttype: 'alter_log' });
  });

  test('eventclick1 dispatches EVENT_CLICK', () => {
    const dispatch = jest.fn();
    eventclick1('overtime')(dispatch, jest.fn());
    expect(dispatch).toHaveBeenCalledWith({ type: 'EVENT_CLICK', requesttype: 'overtime' });
  });

  test('payrollperiod dispatches FETCH_PAYROLL_PERIOD', () => {
    const dispatch = jest.fn();
    payrollperiod('june-2026')(dispatch, jest.fn());
    expect(dispatch).toHaveBeenCalledWith({ type: 'FETCH_PAYROLL_PERIOD', payroll: 'june-2026' });
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// departmentAnnouncementActions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('departmentAnnouncementActions', () => {
  test('createDepartmentAnnouncement — success', async () => {
    const dispatch = jest.fn();
    createDepartmentAnnouncement({ title: 'Test' })(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({ type: 'ALERT_SUCCESS' });
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SET_REDIRECT' })
    );
  });

  test('createDepartmentAnnouncement — error', async () => {
    API.call.mockRejectedValueOnce({ status: 422 });
    const dispatch = jest.fn();
    createDepartmentAnnouncement({})(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('updateDepartmentAnnouncement — success path (non-admin)', async () => {
    const formData = { get: jest.fn(() => null) };
    const dispatch = jest.fn();
    updateDepartmentAnnouncement(1, formData)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({ type: 'ALERT_SUCCESS' });
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ link: global.links.department_announcement_list })
    );
  });

  test('updateDepartmentAnnouncement — success path (admin previous path)', async () => {
    const formData = {
      get: jest.fn((key) => (key === 'previousPath' ? 'AdminAnnouncementList' : null)),
    };
    const dispatch = jest.fn();
    updateDepartmentAnnouncement(1, formData)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ link: global.links.admin_announcement_list })
    );
  });

  test('updateDepartmentAnnouncement — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const formData = { get: jest.fn() };
    const dispatch = jest.fn();
    updateDepartmentAnnouncement(1, formData)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('fetchDepartmentAnnouncement — success', async () => {
    API.call.mockResolvedValueOnce({ data: { content: { id: 1 } } });
    const dispatch = jest.fn();
    fetchDepartmentAnnouncement(1)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_DEPARTMENT_ANNOUNCEMENT_SUCCESS' })
    );
  });

  test('fetchDepartmentAnnouncement — error', async () => {
    API.call.mockRejectedValueOnce({ status: 404 });
    const dispatch = jest.fn();
    fetchDepartmentAnnouncement(99)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('fetchDepartmentAnnouncementStrict — success', async () => {
    API.call.mockResolvedValueOnce({ data: { content: {} } });
    const dispatch = jest.fn();
    fetchDepartmentAnnouncementStrict(1)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_DEPARTMENT_ANNOUNCEMENT_SUCCESS' })
    );
  });

  test('fetchDepartmentAnnouncementStrict — error', async () => {
    API.call.mockRejectedValueOnce({ status: 404 });
    const dispatch = jest.fn();
    fetchDepartmentAnnouncementStrict(99)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('fetchDepartmentAnnouncementList — success', async () => {
    API.call.mockResolvedValueOnce({ data: { content: [] } });
    const dispatch = jest.fn();
    fetchDepartmentAnnouncementList(null)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_DEPARTMENT_ANNOUNCEMENT_INDEX_LOAD_SUCCESS' })
    );
  });

  test('fetchDepartmentAnnouncementList — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    fetchDepartmentAnnouncementList(null)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('fetchDashboardAnnouncementList — success', async () => {
    API.call.mockResolvedValueOnce({ data: { content: [] } });
    const dispatch = jest.fn();
    fetchDashboardAnnouncementList(null)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_DEPARTMENT_ANNOUNCEMENT_INDEX_LOAD_SUCCESS' })
    );
  });

  test('fetchDashboardAnnouncementList — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    fetchDashboardAnnouncementList(null)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('incrementDashboardAnnouncementList — success', async () => {
    API.call.mockResolvedValueOnce({ data: { content: [] } });
    const dispatch = jest.fn();
    incrementDashboardAnnouncementList(null)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'INCREMENT_DEPARTMENT_ANNOUNCEMENT_INDEX_LOAD_SUCCESS' })
    );
  });

  test('incrementDashboardAnnouncementList — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    incrementDashboardAnnouncementList(null)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('fetchMyHandleAnnouncementList — success', async () => {
    API.call.mockResolvedValueOnce({ data: { content: [] } });
    const dispatch = jest.fn();
    fetchMyHandleAnnouncementList()(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_DEPARTMENT_ANNOUNCEMENT_INDEX_LOAD_SUCCESS' })
    );
  });

  test('fetchMyHandleAnnouncementList — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    fetchMyHandleAnnouncementList()(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('deleteDepartmentAnnouncement — success', async () => {
    const dispatch = jest.fn();
    deleteDepartmentAnnouncement(1)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({ type: 'ALERT_SUCCESS' });
  });

  test('deleteDepartmentAnnouncement — error', async () => {
    API.call.mockRejectedValueOnce({ status: 404 });
    const dispatch = jest.fn();
    deleteDepartmentAnnouncement(99)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('clearDepartmentAnnouncementInstance dispatches CLEAR_DEPARTMENT_ANNOUNCEMENT_INSTANCE', () => {
    const dispatch = jest.fn();
    clearDepartmentAnnouncementInstance()(dispatch, jest.fn());
    expect(dispatch).toHaveBeenCalledWith({
      type: 'CLEAR_DEPARTMENT_ANNOUNCEMENT_INSTANCE',
    });
  });

  test('clearDepartmentAnnouncementListInstance dispatches CLEAR_DEPARTMENT_ANNOUNCEMENT_LIST_INSTANCE', () => {
    const dispatch = jest.fn();
    clearDepartmentAnnouncementListInstance()(dispatch, jest.fn());
    expect(dispatch).toHaveBeenCalledWith({
      type: 'CLEAR_DEPARTMENT_ANNOUNCEMENT_LIST_INSTANCE',
    });
  });
});
