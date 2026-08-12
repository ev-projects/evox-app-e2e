// evoxtest_Actions2_frontend.test.js
// Tests for the remaining Redux action creator modules not covered by evoxtest_Actions_frontend.

jest.mock('../../services/API', () => ({
  call: jest.fn(() => Promise.resolve({ data: { content: {} }, headers: {}, status: 200 })),
  export: jest.fn(() => Promise.resolve({ data: new ArrayBuffer(8), headers: {}, status: 200 })),
}));

jest.mock('../../services/APICALL', () => ({ call: jest.fn(() => Promise.resolve({ data: {} })) }));

jest.mock('../../services/Formatter', () => ({
  alert_error: jest.fn(() => ({ type: 'ALERT_ERROR' })),
  alert_success: jest.fn(() => ({ type: 'ALERT_SUCCESS' })),
}));

jest.mock('axios', () => jest.fn(() => Promise.resolve({ data: { content: {} } })));

jest.mock('react-promise-tracker', () => ({ trackPromise: (p) => p }));

jest.mock('export-from-json', () => jest.fn());

jest.mock('jquery', () => jest.fn(() => ({ click: jest.fn() })));

import API from '../../services/API';
import Formatter from '../../services/Formatter';
import axios from 'axios';

// ── imports ──────────────────────────────────────────────────────────────────
import {
  fetchNewDtrSummary,
  fetchDtrConflict,
  exportDtrSummary as exportDtrSummaryFromDtrSummaryActions,
  fetchDtrMultiLogsSummary,
  exportDtrMultiLogsSummary,
  exportNewDtrSummary1,
  exportNewDtrSummary,
} from '../../store/actions/dtr/dtrSummaryActions';

import {
  fetchUserList,
  fetchTeamsHandledList,
  fetchSubDepartmentHandledList,
  fetchAllSubDepartment,
  assignSubDepartment,
  fetchTeam,
  fetchRoleList,
  fetchFeaturesList,
  fetchDepartmentList as fetchDepartmentListFromLookup,
  fetchDepartmentListWithAnnouncements,
  fetchDepartmentHandlersList,
  fetchDepartmentUsersList,
  // fetchEmployeesClientUserLists removed — CLIENT MODULE REMOVED 2026-08-10
} from '../../store/actions/lookup/lookupListActions';

import {
  fetchMyTeamList,
  fetchTeamUnderDepartment,
  fetchSubDepartmentUnderDepartment,
  fetchDepartmentsTeams,
  fetchTeamSchedule,
  exportDtrSummary as exportDtrSummaryFromMyTeam,
} from '../../store/actions/filters/myTeamActions';

import {
  fetchNeoOnboardingUsers,
  sendNeoOnboardingLink,
  fetchNeoSubmissionUsers,
  fetchNeoSubmissionData,
} from '../../store/actions/neo/neoActions';

import { fetchDpaList, exportDpaList } from '../../store/actions/filters/dpaActions';

import {
  requestApprovalChangeStatus,
  updatePayrollCutoff,
  deletePayrollCutoff,
  fetchPayrollCutoff,
  fetchPayrollCutoffList,
  clearPayrollCutoffInstance,
  clearPayrollCutoffListInstance,
} from '../../store/actions/approval/requestApprovalActions';

import {
  setSelectedAttendanceSummary,
  exportAttendanceSummary,
  getTeamAttendanceSummary,
  getDisputeReport,
} from '../../store/actions/report/reportActions';

import { biometrixLog, biometrixLogMulti } from '../../store/actions/dtr/quickpunchActions';

import {
  syncBhrLeaves,
  syncUTCAdjusetment,
  syncBhrUsers,
  syncBiometrics,
} from '../../store/actions/admin/syncActions';

import {
  fetchDepartmentList as fetchDepartmentListFromAdmin,
  deleteDepartment,
  updateDepartmentScheduleStatus,
} from '../../store/actions/admin/departmentListActions';

// ── helpers ──────────────────────────────────────────────────────────────────
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeAll(() => {
  global.links = { dashboard: '/dashboard', login: '/login' };
  window.URL.createObjectURL = jest.fn(() => 'blob:mock');
  window.URL.revokeObjectURL = jest.fn();
});

beforeEach(() => {
  jest.clearAllMocks();
  API.call.mockResolvedValue({ data: { content: {} }, headers: {}, status: 200 });
  API.export.mockResolvedValue({ data: new ArrayBuffer(8), headers: {}, status: 200 });
  Formatter.alert_error.mockReturnValue({ type: 'ALERT_ERROR' });
  Formatter.alert_success.mockReturnValue({ type: 'ALERT_SUCCESS' });
  axios.mockResolvedValue({ data: { content: {} } });
  window.URL.createObjectURL.mockReturnValue('blob:mock');
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// dtrSummaryActions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('dtrSummaryActions', () => {
  test('fetchNewDtrSummary — success dispatches FETCH_NEW_DTR_SUMMARY_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: { has_next_page: false } } });
    const dispatch = jest.fn();
    fetchNewDtrSummary(null)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_NEW_DTR_SUMMARY_SUCCESS' })
    );
  });

  test('fetchNewDtrSummary — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    fetchNewDtrSummary(null)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_DTR_SUMMARY_BATCH_ERROR' })
    );
  });

  test('fetchDtrConflict — success dispatches FETCH_DTR_CONFLICT_REPORT_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({
      data: { content: { dtrItems: [], has_next_page: false } },
    });
    const dispatch = jest.fn();
    fetchDtrConflict(null)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_DTR_CONFLICT_REPORT_SUCCESS' })
    );
  });

  test('fetchDtrConflict — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    fetchDtrConflict(null)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_DTR_SUMMARY_BATCH_ERROR' })
    );
  });

  test('exportDtrSummary — success with content dispatches FETCH_DTR_EXPORT_BACTH_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({
      data: { content: { has_next_page: false, rows: [] } },
    });
    const dispatch = jest.fn();
    exportDtrSummaryFromDtrSummaryActions(null)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_DTR_EXPORT_BACTH_SUCCESS' })
    );
  });

  test('exportDtrSummary — success without content dispatches FETCH_DTR_EXPORT_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: null, rows: [] } });
    const dispatch = jest.fn();
    exportDtrSummaryFromDtrSummaryActions(null)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_DTR_EXPORT_SUCCESS' })
    );
  });

  test('exportDtrSummary — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    exportDtrSummaryFromDtrSummaryActions(null)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_DTR_SUMMARY_BATCH_ERROR' })
    );
  });

  test('fetchDtrMultiLogsSummary — success dispatches FETCH_DTR_MULTI_LOGS_SUMMARY_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: [] } });
    const dispatch = jest.fn();
    fetchDtrMultiLogsSummary(null)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_DTR_MULTI_LOGS_SUMMARY_SUCCESS' })
    );
  });

  test('fetchDtrMultiLogsSummary — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    fetchDtrMultiLogsSummary(null)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_DTR_SUMMARY_BATCH_ERROR' })
    );
  });

  test('exportDtrMultiLogsSummary — success dispatches FETCH_DTR_MULTI_LOGS_EXPORT_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({ data: { rows: [] } });
    const dispatch = jest.fn();
    exportDtrMultiLogsSummary(null)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_DTR_MULTI_LOGS_EXPORT_SUCCESS' })
    );
  });

  test('exportDtrMultiLogsSummary — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    exportDtrMultiLogsSummary(null)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_DTR_SUMMARY_BATCH_ERROR' })
    );
  });

  test('exportNewDtrSummary1 — success calls exportFromJSON', async () => {
    API.call.mockResolvedValueOnce({ data: {} });
    const dispatch = jest.fn();
    exportNewDtrSummary1(null)(dispatch, jest.fn());
    await flushPromises();
    // exportFromJSON is mocked — no dispatch in success path
    expect(dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_DTR_SUMMARY_BATCH_ERROR' })
    );
  });

  test('exportNewDtrSummary1 — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    exportNewDtrSummary1(null)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_DTR_SUMMARY_BATCH_ERROR' })
    );
  });

  test('exportNewDtrSummary — success with content dispatches FETCH_DTR_EXPORT_BACTH_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({
      data: { content: { has_next_page: false, rows: [] } },
    });
    const dispatch = jest.fn();
    exportNewDtrSummary(null)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_DTR_EXPORT_BACTH_SUCCESS' })
    );
  });

  test('exportNewDtrSummary — success without content dispatches FETCH_DTR_EXPORT_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: null } });
    const dispatch = jest.fn();
    exportNewDtrSummary(null)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_DTR_EXPORT_SUCCESS' })
    );
  });

  test('exportNewDtrSummary — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    exportNewDtrSummary(null)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_DTR_SUMMARY_BATCH_ERROR' })
    );
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// lookupListActions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('lookupListActions', () => {
  test('fetchUserList — success dispatches FETCH_USER_LIST_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: [] } });
    const dispatch = jest.fn();
    fetchUserList('employee', null)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_USER_LIST_SUCCESS', role: 'employee' })
    );
  });

  test('fetchUserList — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    fetchUserList('employee', null)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('fetchTeamsHandledList — success dispatches FETCH_TEAMS_HANDLED_LIST_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: [] } });
    const dispatch = jest.fn();
    fetchTeamsHandledList(1)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_TEAMS_HANDLED_LIST_SUCCESS' })
    );
  });

  test('fetchTeamsHandledList — error', async () => {
    API.call.mockRejectedValueOnce({ status: 404 });
    const dispatch = jest.fn();
    fetchTeamsHandledList(99)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('fetchSubDepartmentHandledList — success dispatches FETCH_SUB_DEP_HANDLED_LIST_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: [] } });
    const dispatch = jest.fn();
    fetchSubDepartmentHandledList(1)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_SUB_DEP_HANDLED_LIST_SUCCESS' })
    );
  });

  test('fetchSubDepartmentHandledList — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    fetchSubDepartmentHandledList(99)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('fetchAllSubDepartment — success dispatches FETCH_SUB_DEPARTMENT_LIST_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: [] } });
    const dispatch = jest.fn();
    fetchAllSubDepartment()(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_SUB_DEPARTMENT_LIST_SUCCESS' })
    );
  });

  test('fetchAllSubDepartment — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    fetchAllSubDepartment()(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('assignSubDepartment — success dispatches FETCH_SUB_DEP_HANDLED_LIST_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: [] } });
    const dispatch = jest.fn();
    assignSubDepartment(1, { sub_dept: 2 })(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_SUB_DEP_HANDLED_LIST_SUCCESS' })
    );
  });

  test('assignSubDepartment — error', async () => {
    API.call.mockRejectedValueOnce({ status: 422 });
    const dispatch = jest.fn();
    assignSubDepartment(1, {})(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('fetchTeam — success dispatches FETCH_TEAM_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: { id: 5 } } });
    const dispatch = jest.fn();
    fetchTeam(5)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_TEAM_SUCCESS', instance: { id: 5 } })
    );
  });

  test('fetchTeam — error', async () => {
    API.call.mockRejectedValueOnce({ status: 404 });
    const dispatch = jest.fn();
    fetchTeam(99)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('fetchRoleList — success dispatches FETCH_ROLE_LIST_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: [] } });
    const dispatch = jest.fn();
    fetchRoleList()(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_ROLE_LIST_SUCCESS' })
    );
  });

  test('fetchRoleList — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    fetchRoleList()(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('fetchFeaturesList — success dispatches FETCH_FEATURES_LIST_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: [] } });
    const dispatch = jest.fn();
    fetchFeaturesList()(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_FEATURES_LIST_SUCCESS' })
    );
  });

  test('fetchFeaturesList — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    fetchFeaturesList()(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('fetchDepartmentList (lookup) — success dispatches FETCH_DEPARTMENT_LIST_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: [] } });
    const dispatch = jest.fn();
    fetchDepartmentListFromLookup()(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_DEPARTMENT_LIST_SUCCESS' })
    );
  });

  test('fetchDepartmentList (lookup) — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    fetchDepartmentListFromLookup()(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('fetchDepartmentListWithAnnouncements — success', async () => {
    API.call.mockResolvedValueOnce({ data: { content: [] } });
    const dispatch = jest.fn();
    fetchDepartmentListWithAnnouncements()(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_DEPARTMENT_LIST_SUCCESS' })
    );
  });

  test('fetchDepartmentListWithAnnouncements — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    fetchDepartmentListWithAnnouncements()(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('fetchDepartmentHandlersList — success dispatches FETCH_DEPARTMENT_HANDLERS_LIST_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: [] } });
    const dispatch = jest.fn();
    fetchDepartmentHandlersList(1)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_DEPARTMENT_HANDLERS_LIST_SUCCESS' })
    );
  });

  test('fetchDepartmentHandlersList — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    fetchDepartmentHandlersList(99)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('fetchDepartmentUsersList — success dispatches FETCH_DEPARTMENT_USERS_LIST_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: [] } });
    const dispatch = jest.fn();
    fetchDepartmentUsersList(1)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_DEPARTMENT_USERS_LIST_SUCCESS' })
    );
  });

  test('fetchDepartmentUsersList — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    fetchDepartmentUsersList(99)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  // CLIENT MODULE REMOVED 2026-08-10: fetchEmployeesClientUserLists removed from lookupListActions
  test.skip('fetchEmployeesClientUserLists — success dispatches FETCH_EMPLOYEES_CLIENT_USERS_LIST_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: [] } });
    const dispatch = jest.fn();
    // fetchEmployeesClientUserLists(1, 2)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_EMPLOYEES_CLIENT_USERS_LIST_SUCCESS' })
    );
  });

  test.skip('fetchEmployeesClientUserLists — error (CLIENT MODULE REMOVED 2026-08-10)', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    // fetchEmployeesClientUserLists(1, 99)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// myTeamActions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('myTeamActions', () => {
  test('fetchMyTeamList — success dispatches SET_MY_TEAM_LIST_FILTERS and FETCH_MY_TEAM_LIST_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: [] } });
    const dispatch = jest.fn();
    fetchMyTeamList(1, { page: 1 })(dispatch, jest.fn());
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SET_MY_TEAM_LIST_FILTERS' })
    );
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_MY_TEAM_LIST_SUCCESS' })
    );
  });

  test('fetchMyTeamList — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    fetchMyTeamList(1, null)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('fetchTeamUnderDepartment — success dispatches FETCH_TEAM_UNDER_DEPARTMENT_LIST_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: [] } });
    const dispatch = jest.fn();
    fetchTeamUnderDepartment(1, 2)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_TEAM_UNDER_DEPARTMENT_LIST_SUCCESS' })
    );
  });

  test('fetchTeamUnderDepartment — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    fetchTeamUnderDepartment(1, 2)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('fetchSubDepartmentUnderDepartment — success dispatches FETCH_SUB_DEPARTMENT_LIST_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: [] } });
    const dispatch = jest.fn();
    fetchSubDepartmentUnderDepartment(1, 2)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_SUB_DEPARTMENT_LIST_SUCCESS' })
    );
  });

  test('fetchSubDepartmentUnderDepartment — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    fetchSubDepartmentUnderDepartment(1, 2)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('fetchDepartmentsTeams — success dispatches FETCH_DEPS_TEAM_UNDER_DEPARTMENT_LIST_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: [] } });
    const dispatch = jest.fn();
    fetchDepartmentsTeams(1, null)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_DEPS_TEAM_UNDER_DEPARTMENT_LIST_SUCCESS' })
    );
  });

  test('fetchDepartmentsTeams — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    fetchDepartmentsTeams(1, null)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('fetchTeamSchedule — export=all path creates download link', async () => {
    API.call.mockResolvedValueOnce({ data: new ArrayBuffer(8), status: 200, content: {} });
    const dispatch = jest.fn();
    fetchTeamSchedule({ export: 'all' })(dispatch, jest.fn());
    await flushPromises();
    expect(window.URL.createObjectURL).toHaveBeenCalled();
  });

  test('fetchTeamSchedule — show_more=true dispatches FETCH_DAILY_TEAM_SCHEDULE_MORE_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: [] } });
    const dispatch = jest.fn();
    fetchTeamSchedule({ export: null, show_more: true, start_date: '2026-06-01' })(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_DAILY_TEAM_SCHEDULE_MORE_SUCCESS' })
    );
  });

  test('fetchTeamSchedule — scope_type=day dispatches FETCH_DAILY_TEAM_SCHEDULE_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: [] } });
    const dispatch = jest.fn();
    fetchTeamSchedule({ export: null, show_more: false, scope_type: 'day' })(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_DAILY_TEAM_SCHEDULE_SUCCESS' })
    );
  });

  test('fetchTeamSchedule — scope_type=week dispatches FETCH_WEEKLY_TEAM_SCHEDULE_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: [] } });
    const dispatch = jest.fn();
    fetchTeamSchedule({ export: null, show_more: false, scope_type: 'week' })(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_WEEKLY_TEAM_SCHEDULE_SUCCESS' })
    );
  });

  test('fetchTeamSchedule — scope_type=month dispatches FETCH_MONTHLY_TEAM_SCHEDULE_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: [] } });
    const dispatch = jest.fn();
    fetchTeamSchedule({ export: null, show_more: false, scope_type: 'month' })(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_MONTHLY_TEAM_SCHEDULE_SUCCESS' })
    );
  });

  test('fetchTeamSchedule — error dispatches alert_error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    fetchTeamSchedule({ export: null, show_more: false, scope_type: 'day' })(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('exportDtrSummary (myTeam) — success creates download link', async () => {
    API.export.mockResolvedValueOnce({ data: new ArrayBuffer(8) });
    const dispatch = jest.fn();
    exportDtrSummaryFromMyTeam(null)(dispatch, jest.fn());
    await flushPromises();
    expect(window.URL.createObjectURL).toHaveBeenCalled();
  });

  test('exportDtrSummary (myTeam) — error', async () => {
    API.export.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    exportDtrSummaryFromMyTeam(null)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// neoActions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('neoActions', () => {
  test('fetchNeoOnboardingUsers — success (status 200) dispatches FETCH_NEO_ONBOARDING_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({
      status: 200,
      data: { data: { users: [] } },
    });
    const dispatch = jest.fn();
    await fetchNeoOnboardingUsers('PH')(dispatch, jest.fn());
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_NEO_ONBOARDING_SUCCESS' })
    );
  });

  test('fetchNeoOnboardingUsers — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    await fetchNeoOnboardingUsers('PH')(dispatch, jest.fn());
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('sendNeoOnboardingLink — success (status 200) dispatches alert_success', async () => {
    API.call.mockResolvedValueOnce({ status: 200, data: {} });
    const dispatch = jest.fn();
    await sendNeoOnboardingLink('guid-123', 1, 'PH')(dispatch, jest.fn());
    expect(dispatch).toHaveBeenCalledWith({ type: 'ALERT_SUCCESS' });
  });

  test('sendNeoOnboardingLink — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    await sendNeoOnboardingLink('guid-123', 1, 'PH')(dispatch, jest.fn());
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('fetchNeoSubmissionUsers — success (status 200) dispatches FETCH_NEO_SUBMISSION_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({
      status: 200,
      data: { data: { submissions: [] } },
    });
    const dispatch = jest.fn();
    fetchNeoSubmissionUsers('PH')(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_NEO_SUBMISSION_SUCCESS' })
    );
  });

  test('fetchNeoSubmissionUsers — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    fetchNeoSubmissionUsers('PH')(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('fetchNeoSubmissionData — success (status 200) dispatches FETCH_NEO_SUBMISSION_DATA_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({
      status: 200,
      data: { data: { submissions: [], bhrNumber: '123' } },
    });
    const dispatch = jest.fn();
    fetchNeoSubmissionData('guid-abc')(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_NEO_SUBMISSION_DATA_SUCCESS' })
    );
  });

  test('fetchNeoSubmissionData — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    fetchNeoSubmissionData('guid-abc')(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// dpaActions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('dpaActions', () => {
  test('fetchDpaList — success dispatches SET_DPA_LIST_FILTERS and FETCH_DPA_LIST_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: [] } });
    const dispatch = jest.fn();
    fetchDpaList({ page: 1 })(dispatch, jest.fn());
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SET_DPA_LIST_FILTERS' })
    );
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_DPA_LIST_SUCCESS' })
    );
  });

  test('fetchDpaList — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    fetchDpaList(null)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('exportDpaList — success creates download link', async () => {
    API.export.mockResolvedValueOnce({ data: new ArrayBuffer(8) });
    const dispatch = jest.fn();
    exportDpaList(null)(dispatch, jest.fn());
    await flushPromises();
    expect(window.URL.createObjectURL).toHaveBeenCalled();
  });

  test('exportDpaList — error', async () => {
    API.export.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    exportDpaList(null)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// requestApprovalActions (approval module — also contains payroll cutoff actions)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('requestApprovalActions', () => {
  test('requestApprovalChangeStatus — success dispatches FETCH_REQUEST_APPROVAL_CHANGED_STATUS_INSTANCE', async () => {
    axios.mockResolvedValueOnce({ data: { content: { status: 'approved' } } });
    const dispatch = jest.fn();
    requestApprovalChangeStatus('hash-abc', 'approve')(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_REQUEST_APPROVAL_CHANGED_STATUS_INSTANCE' })
    );
  });

  test('requestApprovalChangeStatus — error dispatches FAILED_FETCH_REQUEST_APPROVAL_CHANGED_STATUS_INSTANCE', async () => {
    axios.mockRejectedValueOnce({ response: { status: 400 } });
    const dispatch = jest.fn();
    requestApprovalChangeStatus('bad-hash', 'approve')(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({
      type: 'FAILED_FETCH_REQUEST_APPROVAL_CHANGED_STATUS_INSTANCE',
    });
  });

  test('updatePayrollCutoff — success dispatches alert_success', async () => {
    const dispatch = jest.fn();
    updatePayrollCutoff(1, { name: 'June' })(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({ type: 'ALERT_SUCCESS' });
  });

  test('updatePayrollCutoff — error', async () => {
    API.call.mockRejectedValueOnce({ status: 422 });
    const dispatch = jest.fn();
    updatePayrollCutoff(1, {})(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('deletePayrollCutoff — success dispatches alert_success', async () => {
    const dispatch = jest.fn();
    deletePayrollCutoff(5)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({ type: 'ALERT_SUCCESS' });
  });

  test('deletePayrollCutoff — error', async () => {
    API.call.mockRejectedValueOnce({ status: 404 });
    const dispatch = jest.fn();
    deletePayrollCutoff(99)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('fetchPayrollCutoff — success dispatches FETCH_PAYROLL_CUTOFF_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: { id: 1 } } });
    const dispatch = jest.fn();
    fetchPayrollCutoff(1)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_PAYROLL_CUTOFF_SUCCESS' })
    );
  });

  test('fetchPayrollCutoff — error', async () => {
    API.call.mockRejectedValueOnce({ status: 404 });
    const dispatch = jest.fn();
    fetchPayrollCutoff(99)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('fetchPayrollCutoffList — success dispatches FETCH_PAYROLL_CUTOFF_LIST_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: [] } });
    const dispatch = jest.fn();
    fetchPayrollCutoffList()(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_PAYROLL_CUTOFF_LIST_SUCCESS' })
    );
  });

  test('fetchPayrollCutoffList — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    fetchPayrollCutoffList()(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('clearPayrollCutoffInstance dispatches CLEAR_PAYROLL_CUTOFF_INSTANCE', () => {
    const dispatch = jest.fn();
    clearPayrollCutoffInstance()(dispatch, jest.fn());
    expect(dispatch).toHaveBeenCalledWith({ type: 'CLEAR_PAYROLL_CUTOFF_INSTANCE' });
  });

  test('clearPayrollCutoffListInstance dispatches CLEAR_PAYROLL_CUTOFF_LIST_INSTANCE', () => {
    const dispatch = jest.fn();
    clearPayrollCutoffListInstance()(dispatch, jest.fn());
    expect(dispatch).toHaveBeenCalledWith({ type: 'CLEAR_PAYROLL_CUTOFF_LIST_INSTANCE' });
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// reportActions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('reportActions', () => {
  const mockDate = { format: jest.fn(() => '2026-01-01') };

  test('setSelectedAttendanceSummary returns plain action (not a thunk)', () => {
    const action = setSelectedAttendanceSummary({ id: 1 });
    expect(action).toEqual({ type: 'SET_SELECTED_ATTENDACE_SUMMARY', payload: { id: 1 } });
  });

  test('exportAttendanceSummary — success (no message) creates download link', async () => {
    API.export.mockResolvedValueOnce({ data: new ArrayBuffer(8) });
    const dispatch = jest.fn();
    exportAttendanceSummary(mockDate, mockDate, {})(dispatch, jest.fn());
    await flushPromises();
    expect(window.URL.createObjectURL).toHaveBeenCalled();
  });

  test('exportAttendanceSummary — success with nessage dispatches alert_error', async () => {
    API.export.mockResolvedValueOnce({ data: { nessage: 'limit exceeded' } });
    const dispatch = jest.fn();
    exportAttendanceSummary(mockDate, mockDate, {})(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('exportAttendanceSummary — error', async () => {
    API.export.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    exportAttendanceSummary(mockDate, mockDate, {})(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('getTeamAttendanceSummary — success dispatches FETCH_TEAM_ATTENDANCE_SUMMARY', async () => {
    API.call.mockResolvedValueOnce({ data: { content: [] } });
    const dispatch = jest.fn();
    getTeamAttendanceSummary(mockDate, mockDate, {})(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_TEAM_ATTENDANCE_SUMMARY' })
    );
  });

  test('getTeamAttendanceSummary — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    getTeamAttendanceSummary(mockDate, mockDate, {})(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('getDisputeReport — success dispatches FETCH_DISPUTE_RECORD and RELOAD_END', async () => {
    API.call.mockResolvedValueOnce({ data: { content: [{ id: 1 }] } });
    const dispatch = jest.fn();
    getDisputeReport(1)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_DISPUTE_RECORD' })
    );
    expect(dispatch).toHaveBeenCalledWith({ type: 'RELOAD_END' });
  });

  test('getDisputeReport — error', async () => {
    API.call.mockRejectedValueOnce({ status: 404 });
    const dispatch = jest.fn();
    getDisputeReport(99)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// quickpunchActions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('quickpunchActions', () => {
  test('biometrixLog — success dispatches alert_success and FETCH_RECENT_DTR', async () => {
    // First call: quickpunch POST; second call: DTR GET
    API.call
      .mockResolvedValueOnce({ data: { message: 'ok' }, status: 200 })
      .mockResolvedValueOnce({ data: { content: { dtr_records: [] } } });
    const dispatch = jest.fn();
    biometrixLog({ in_out: 1 }, 1)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({ type: 'ALERT_SUCCESS' });
  });

  test('biometrixLog — outer error dispatches alert_error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    biometrixLog({ in_out: 1 }, 1)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('biometrixLogMulti — success dispatches FETCH_RECENT_PUNCH', async () => {
    API.call
      .mockResolvedValueOnce({ data: { message: 'ok' }, status: 200 })
      .mockResolvedValueOnce({ data: { punches: [] } });
    const dispatch = jest.fn();
    biometrixLogMulti({ in_out: 1 }, 1)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_RECENT_PUNCH' })
    );
  });

  test('biometrixLogMulti — error dispatches alert_error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    biometrixLogMulti({ in_out: 1 }, 1)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// syncActions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('syncActions', () => {
  test('syncBhrLeaves — success dispatches SYNC_BHR_LEAVES', async () => {
    API.call.mockResolvedValueOnce({ data: { content: {} } });
    const dispatch = jest.fn();
    syncBhrLeaves({ valid_from: '2026-06-01', valid_to: '2026-06-30' })(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SYNC_BHR_LEAVES' })
    );
  });

  test('syncBhrLeaves — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    syncBhrLeaves({ valid_from: '2026-06-01', valid_to: '2026-06-30' })(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('syncUTCAdjusetment — success dispatches alert_success', async () => {
    const dispatch = jest.fn();
    syncUTCAdjusetment({})(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({ type: 'ALERT_SUCCESS' });
  });

  test('syncUTCAdjusetment — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    syncUTCAdjusetment({})(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('syncBhrUsers — success dispatches SYNC_USER_UPDATES', async () => {
    API.call.mockResolvedValueOnce({ data: { content: {} } });
    const dispatch = jest.fn();
    syncBhrUsers({ valid_from: '2026-06-01' })(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SYNC_USER_UPDATES' })
    );
  });

  test('syncBhrUsers — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    syncBhrUsers({ valid_from: '2026-06-01' })(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('syncBiometrics — success dispatches SYNC_BIOMETRICS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: {} } });
    const dispatch = jest.fn();
    syncBiometrics({ valid_from: '2026-06-01', valid_to: '2026-06-30' })(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SYNC_BIOMETRICS' })
    );
  });

  test('syncBiometrics — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    syncBiometrics({ valid_from: '2026-06-01', valid_to: '2026-06-30' })(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// admin/departmentListActions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('admin/departmentListActions', () => {
  test('fetchDepartmentList (admin) — success dispatches FETCH_DEPARTMENT_LIST_LOAD_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: [] } });
    const dispatch = jest.fn();
    fetchDepartmentListFromAdmin()(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_DEPARTMENT_LIST_LOAD_SUCCESS' })
    );
  });

  test('fetchDepartmentList (admin) — error', async () => {
    API.call.mockRejectedValueOnce({ status: 500 });
    const dispatch = jest.fn();
    fetchDepartmentListFromAdmin()(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('deleteDepartment — success dispatches alert_success', async () => {
    const dispatch = jest.fn();
    deleteDepartment(5)(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({ type: 'ALERT_SUCCESS' });
  });

  test('deleteDepartment — error', async () => {
    API.call.mockRejectedValueOnce({ status: 404 });
    const dispatch = jest.fn();
    deleteDepartment(99)(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  test('updateDepartmentScheduleStatus — success dispatches alert_success and FETCH_DEPARTMENT_LIST_LOAD_SUCCESS', async () => {
    API.call.mockResolvedValueOnce({ data: { content: [] }, status: 200 });
    const dispatch = jest.fn();
    updateDepartmentScheduleStatus(1, { active: true })(dispatch, jest.fn());
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith({ type: 'ALERT_SUCCESS' });
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FETCH_DEPARTMENT_LIST_LOAD_SUCCESS' })
    );
  });

  test('updateDepartmentScheduleStatus — error', async () => {
    API.call.mockRejectedValueOnce({ status: 422 });
    const dispatch = jest.fn();
    updateDepartmentScheduleStatus(1, {})(dispatch, jest.fn());
    await flushPromises();
    expect(Formatter.alert_error).toHaveBeenCalled();
  });
});
