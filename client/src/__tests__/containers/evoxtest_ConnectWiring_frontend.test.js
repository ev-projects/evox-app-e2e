// evoxtest_ConnectWiring_frontend.test.js
// The existing Vishnu tests for these containers mock react-redux's `connect` as an
// identity passthrough (`connect: () => (Component) => Component`) so they can render
// standalone without a store. That means each file's mapStateToProps/mapDispatchToProps
// closures — several statements each — never execute, regardless of how thoroughly the
// UI itself is tested. These tests mount the REAL connected default export against the
// real store (mocking only the thunk action-creator modules so dispatch doesn't hit real
// HTTP), purely to exercise that wiring. UI depth is already covered by the existing
// dedicated *.test.js files for each of these components.

jest.mock('../../store/actions/filters/requestListActions', () => ({
  fetchRequestList: (...a) => ({ type: 'STUB', a }),
  fetchRequestListDisputes: (...a) => ({ type: 'STUB', a }),
  fetchStatusNumbers: (...a) => ({ type: 'STUB', a }),
}));
jest.mock('../../store/actions/freshservice/freshServiceActions', () => ({
  fetchWorkSpaces: (...a) => ({ type: 'STUB', a }),
}));
jest.mock('../../store/actions/requests/overtimeActions', () => ({
  fetchOvertime: (...a) => ({ type: 'STUB', a }),
  addOvertime: (...a) => ({ type: 'STUB', a }),
  updateOvertime: (...a) => ({ type: 'STUB', a }),
  updateOvertimeStatus: (...a) => ({ type: 'STUB', a }),
  clearOvertimeInstance: () => ({ type: 'STUB' }),
  resetOvertimeInstance: () => ({ type: 'STUB' }),
}));
jest.mock('../../store/actions/requests/changeScheduleActions', () => ({
  addChangeSchedule: (...a) => ({ type: 'STUB', a }),
  updateChangeSchedule: (...a) => ({ type: 'STUB', a }),
  updateChangeScheduleStatus: (...a) => ({ type: 'STUB', a }),
  fetchChangeSchedule: (...a) => ({ type: 'STUB', a }),
  clearChangeScheduleInstance: () => ({ type: 'STUB' }),
  resetChangeScheduleInstance: () => ({ type: 'STUB' }),
}));
jest.mock('../../store/actions/requests/restDayWorkActions', () => ({
  fetchRestDayWork: (...a) => ({ type: 'STUB', a }),
  addRestDayWork: (...a) => ({ type: 'STUB', a }),
  updateRestDayWork: (...a) => ({ type: 'STUB', a }),
  updateRestDayWorkStatus: (...a) => ({ type: 'STUB', a }),
  resetRestDayWorkInstance: () => ({ type: 'STUB' }),
  clearRestDayWorkInstance: () => ({ type: 'STUB' }),
}));
// Same physical module resolves for both the extension-less and .js-suffixed import
// paths used across different containers — one mock covering the union of both files'
// real named exports.
jest.mock('../../store/actions/dtr/dtrSummaryActions', () => ({
  fetchDtrSummary: (...a) => ({ type: 'STUB', a }),
  exportDtrSummary: (...a) => ({ type: 'STUB', a }),
  exportNewDtrSummary: (...a) => ({ type: 'STUB', a }),
  fetchDtrMultiLogsSummary: (...a) => ({ type: 'STUB', a }),
  exportDtrMultiLogsSummary: (...a) => ({ type: 'STUB', a }),
}));
jest.mock('../../store/actions/userActions', () => ({
  getUserAsset: (...a) => ({ type: 'STUB', a }),
  getUserAssets: (...a) => ({ type: 'STUB', a }),
  addUserAsset: (...a) => ({ type: 'STUB', a }),
  updateUserAsset: (...a) => ({ type: 'STUB', a }),
  fetchUser: (...a) => ({ type: 'STUB', a }),
}));
jest.mock('../../store/actions/dtr/dtrActions', () => ({
  viewEmployeeDtr: (...a) => ({ type: 'STUB', a }),
  viewEmployeePunch: (...a) => ({ type: 'STUB', a }),
  getFilterForDtr: (...a) => ({ type: 'STUB', a }),
  setSelectedPayrollCutoff: (...a) => ({ type: 'STUB', a }),
  getUserDtrSummary: (...a) => ({ type: 'STUB', a }),
}));
jest.mock('../../store/actions/dtr/quickpunchActions', () => ({
  biometrixLog: (...a) => ({ type: 'STUB', a }),
  biometrixLogMulti: (...a) => ({ type: 'STUB', a }),
}));
jest.mock('../../store/actions/opsschedule/opsScheduleActions', () => ({
  fetchOpsSchedules: (...a) => ({ type: 'STUB', a }),
}));
jest.mock('../../store/actions/profile/profileActions', () => ({
  tickDpa: (...a) => ({ type: 'STUB', a }),
}));
jest.mock('../../store/actions/settings/alertActions', () => ({
  showAlert: (...a) => ({ type: 'STUB', a }),
}));
jest.mock('react-player/lazy', () => () => <div data-testid="react-player" />);
jest.mock('../../store/actions/dashboard/dashboardActions', () => ({
  getRecentDtr: (...a) => ({ type: 'STUB', a }),
  getDashboardOverall: (...a) => ({ type: 'STUB', a }),
}));
jest.mock('../../store/actions/requests/coeActions', () => ({
  addCOE: (...a) => ({ type: 'STUB', a }),
  fetchCOE: (...a) => ({ type: 'STUB', a }),
}));
// @fullcalendar/core ships ESM-only and isn't transformed by CRA's default Jest config;
// DailyTimeRecordPuncher.js imports one named export from it that's unused in the render
// paths these tests exercise, so a stub is sufficient to unblock the module load.
jest.mock('@fullcalendar/core/internal-common', () => ({ s: {} }));
jest.mock('../../store/actions/redirectActions', () => ({
  setRedirect: (...a) => ({ type: 'STUB', a }),
  clearRedirect: () => ({ type: 'STUB' }),
}));

import React from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import store from '../../store';

import MyRequests from '../../container/MyRequests/MyRequests';
import Overtime from '../../container/Request/Overtime/Overtime';
import ChangeSchedule from '../../container/Request/ChangeSchedule/ChangeSchedule';
import RestDayWork from '../../container/Request/RestDayWork/RestDayWork';
import AssetManagementForm from '../../components/AssetManagementForm/AssetManagementForm';
import DailyTimeRecord from '../../container/DailyTimeRecord/DailyTimeRecord';
import RecentDtr from '../../components/Dashboard/RecentDtr/RecentDtr';
import COE from '../../container/Request/COE/COE';
import DailyTimeRecordPuncher from '../../container/DailyTimeRecordPuncher/DailyTimeRecordPuncher';
import MyRequestsDispute from '../../container/MyRequestsDispute/MyRequestsDispute';
import FreshServiceForm from '../../components/FreshService/FreshServiceForm';
import FreshServiceTickets from '../../components/FreshService/FreshServiceTickets';
import DtrMultiLogsSummary from '../../container/MyTeam/DtrMultiLogsSummary/DtrMultiLogsSummary';
import OpsSchedule from '../../container/OpsSchedule/OpsSchedule';
import DPAForm from '../../container/DPAForm/DPAForm';
import QuickPunch from '../../components/Dashboard/QuickPunch/QuickPunch';
import MultiQuickpunch from '../../components/Dashboard/PunchComponents/MultiQuickpunch/MultiQuickpunch';

const renderWithStore = (ui) => render(
  <Provider store={store}><MemoryRouter>{ui}</MemoryRouter></Provider>
);

describe('Real connect() wiring — mapStateToProps/mapDispatchToProps coverage', () => {
  beforeAll(() => {
    // Several of these containers read this.props.user.* directly (id, departments_handled,
    // pov_timezone) with no optional chaining, so a logged-out default state.user (just
    // {error_message: ""}) crashes them. Seed a real logged-in user via the real reducer.
    store.dispatch({
      type: 'LOGIN_SUCCESS',
      user: {
        id: 1,
        full_name: 'Test Employee',
        pov_timezone: 'Asia/Manila',
        departments_handled: [],
        user_server_timestamp: '2026-03-15 08:00:00',
        user_server_timestamp_mils: 0,
        user_offset_seconds: 0,
      },
      payload: {},
    });
  });

  test('MyRequests mounts via the real connected export', () => {
    expect(() => renderWithStore(<MyRequests params={{}} />)).not.toThrow();
  });

  test('Overtime mounts via the real connected export', () => {
    expect(() => renderWithStore(<Overtime params={{}} />)).not.toThrow();
  });

  test('ChangeSchedule mounts via the real connected export', () => {
    expect(() => renderWithStore(<ChangeSchedule params={{}} />)).not.toThrow();
  });

  test('RestDayWork mounts via the real connected export', () => {
    expect(() => renderWithStore(<RestDayWork params={{}} />)).not.toThrow();
  });

  test('AssetManagementForm mounts via the real connected export (create mode)', () => {
    expect(() => renderWithStore(<AssetManagementForm params={{}} />)).not.toThrow();
  });

  test('AssetManagementForm mounts via the real connected export (edit mode, exercises getUserAsset)', () => {
    expect(() => renderWithStore(<AssetManagementForm params={{ id: '5' }} />)).not.toThrow();
  });

  // NOTE: same gap as DtrSummary — DailyTimeRecord.js's mapStateToProps never maps
  // state.user, despite render() reading this.props.user.id directly.
  test('DailyTimeRecord mounts via the real connected export', () => {
    expect(() =>
      renderWithStore(<DailyTimeRecord params={{}} user={{ id: 1 }} />)
    ).not.toThrow();
  });

  test('RecentDtr mounts via the real connected export', () => {
    expect(() => renderWithStore(<RecentDtr params={{}} />)).not.toThrow();
  });

  test('COE mounts via the real connected export', () => {
    expect(() => renderWithStore(<COE params={{}} />)).not.toThrow();
  });

  // NOTE: same gap as DtrSummary/DailyTimeRecord — mapStateToProps never maps state.user.
  test('DailyTimeRecordPuncher mounts via the real connected export', () => {
    expect(() =>
      renderWithStore(<DailyTimeRecordPuncher params={{ id: '1' }} user={{ id: 1 }} />)
    ).not.toThrow();
  });

  test('MyRequestsDispute mounts via the real connected export', () => {
    expect(() => renderWithStore(<MyRequestsDispute params={{}} />)).not.toThrow();
  });

  test('FreshServiceForm mounts via the real connected export', () => {
    expect(() => renderWithStore(<FreshServiceForm params={{}} />)).not.toThrow();
  });

  test('FreshServiceTickets mounts via the real connected export', () => {
    expect(() => renderWithStore(<FreshServiceTickets params={{}} />)).not.toThrow();
  });

  // NOTE: same gap as DtrSummary/DailyTimeRecord/DailyTimeRecordPuncher — mapStateToProps
  // never maps state.user.
  test('DtrMultiLogsSummary mounts via the real connected export', () => {
    expect(() =>
      renderWithStore(<DtrMultiLogsSummary params={{}} user={{ id: 1, departments_handled: [] }} />)
    ).not.toThrow();
  });

  test('OpsSchedule mounts via the real connected export', () => {
    expect(() => renderWithStore(<OpsSchedule params={{}} />)).not.toThrow();
  });

  test('DPAForm mounts via the real connected export', () => {
    expect(() => renderWithStore(<DPAForm params={{}} />)).not.toThrow();
  });

  test('QuickPunch mounts via the real connected export', () => {
    expect(() => renderWithStore(<QuickPunch params={{}} />)).not.toThrow();
  });

  test('MultiQuickpunch mounts via the real connected export', () => {
    expect(() => renderWithStore(<MultiQuickpunch params={{}} />)).not.toThrow();
  });
});
