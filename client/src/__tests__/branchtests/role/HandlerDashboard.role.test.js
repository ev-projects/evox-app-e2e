/**
 * ROLE-AWARE TEST — HandlerDashboard
 * Source: src/components/Dashboard/HandlerDashboard/HandlerDashboard.js
 * Copy into client tree at: client/src/__tests__/branchtests/role/HandlerDashboard.role.test.js
 *
 * Why: For "Client" level users the handler dashboard renders a weekly team
 * "This Week's Attendance Summary" panel and an "Upcoming holidays" panel; for
 * non-Client handlers (supervisors) those blocks are omitted. Client also triggers
 * an extra summary fetch in componentWillMount. Drives both branches.
 *
 * NO real HTTP: Authenticator mocked; all connected child panels mocked to empty
 * divs; every dispatched action module is mocked to plain action objects.
 */

import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';

const mockAuth = { level: '', features: [] };

jest.mock('../../../services/Authenticator', () => {
  const hasLevel = (lvl) => {
    const n = mockAuth.level;
    if (!n) return false;
    return Array.isArray(lvl) ? lvl.includes(n) : lvl === n;
  };
  const hasFeature = (f) => {
    if (f == null || f === '') return false;
    const fa = mockAuth.features || [];
    return Array.isArray(f) ? f.some((x) => fa.includes(x)) : fa.includes(f);
  };
  return {
    __esModule: true,
    default: {
      scanLevel: hasLevel,
      scanFeature: hasFeature,
      scanLevel_Feature: (lvl, f) => hasLevel(lvl) && hasFeature(f),
    },
  };
});

// Mock connected child panels -> no API traffic.
jest.mock('../../../components/Dashboard/BirthdayAnniversary', () => () => <div>BDAY_PANEL</div>);
jest.mock('../../../components/Dashboard/TeamAttendance', () => () => <div>TEAM_ATTENDANCE_PANEL</div>);
jest.mock('../../../components/Dashboard/Holiday', () => () => <div>HOLIDAY_PANEL</div>);
jest.mock('../../../components/Report/TeamAttendanceSummaryPanel', () => () => <div>SUMMARY_PANEL</div>);

// Mock dispatched actions.
jest.mock('../../../store/actions/dashboard/dashboardActions', () => ({
  getTeamAttendanceStatus: jest.fn(() => ({ type: 'MOCK_TEAM_STATUS' })),
  getBirthdayAnniv: jest.fn(() => ({ type: 'MOCK_BDAY' })),
}));
jest.mock('../../../store/actions/report/reportActions', () => ({
  getTeamAttendanceSummary: jest.fn(() => ({ type: 'MOCK_TEAM_SUMMARY' })),
}));
jest.mock('../../../store/actions/userActions', () => ({
  fetchUser: jest.fn(() => ({ type: 'MOCK_FETCH_USER' })),
}));

import HandlerDashboard from '../../../components/Dashboard/HandlerDashboard/HandlerDashboard';

function renderHandler({ level }) {
  mockAuth.level = level;
  mockAuth.features = [];

  const state = {
    user: {
      id: '123',
      level: { Name: level },
      departments_handled: [{ id: '1', department_name: 'Dept A' }],
    },
    client: {},
    report: { team_attendance_summary: { status: 'ok' } },
  };
  const store = createStore((s = state) => s, applyMiddleware(thunk));

  return render(
    <Provider store={store}>
      <HandlerDashboard />
    </Provider>
  );
}

describe('HandlerDashboard — role-based panels', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    if (console.error.mockRestore) console.error.mockRestore();
  });

  test('CLIENT sees weekly attendance summary + upcoming holidays', () => {
    renderHandler({ level: 'Client' });
    expect(screen.getByText("This Week's Attendance Summary")).toBeInTheDocument();
    expect(screen.getByText('Upcoming holidays')).toBeInTheDocument();
    // common panels still present
    expect(screen.getByText("Today's attendance")).toBeInTheDocument();
    expect(screen.getByText('Celebrations')).toBeInTheDocument();
  });

  test('SUPERVISOR (non-Client) does NOT see client-only weekly summary/holidays', () => {
    renderHandler({ level: 'Department Head' });
    expect(screen.queryByText("This Week's Attendance Summary")).not.toBeInTheDocument();
    expect(screen.queryByText('Upcoming holidays')).not.toBeInTheDocument();
    // common panels remain
    expect(screen.getByText("Today's attendance")).toBeInTheDocument();
    expect(screen.getByText('Celebrations')).toBeInTheDocument();
  });
});
