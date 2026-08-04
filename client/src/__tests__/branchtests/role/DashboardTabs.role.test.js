/**
 * ROLE-AWARE TEST — DashboardTabs
 * Source: src/components/Dashboard/DashboardTabs/DashboardTabs.js
 * Copy into client tree at: client/src/__tests__/branchtests/role/DashboardTabs.role.test.js
 *
 * Why: Supervisor-level users (SubDepartment/Department/Division Head, Board, Admin,
 * HR, Payroll) get extra "Summary" and "Engagements" dashboard tabs and default to
 * the Summary tab. Plain Employees only see Announcements / Job Opening / Policies.
 * This drives both branches.
 *
 * NO real HTTP: Authenticator mocked; heavy connected child panels are mocked to
 * empty divs so none of them fire API calls; the announcement fetch action is mocked.
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

// Mock heavy connected panels so they don't touch the API / store deeply.
jest.mock('../../../components/Summary/SummaryDashbord', () => () => <div>SUMMARY_PANEL</div>);
jest.mock('../../../components/Dashboard/Engagement/Engagement', () => () => <div>ENGAGEMENT_PANEL</div>);
jest.mock('../../../components/Dashboard/DashboardAnnouncementsList', () => () => <div>ANN_PANEL</div>);
jest.mock('../../../components/Dashboard/JobOpenings', () => () => <div>JOBS_PANEL</div>);
jest.mock('../../../components/Dashboard/ChangeLogs', () => () => <div>CHANGELOGS_PANEL</div>);
jest.mock('../../../components/PoliciesDocument/PoliciesDocumentDownload', () => () => <div>POLICIES_PANEL</div>);

jest.mock('../../../store/actions/announcement/departmentAnnouncementActions', () => ({
  fetchDashboardAnnouncementList: jest.fn(() => ({ type: 'MOCK_FETCH_ANN' })),
}));

import DashboardTabs from '../../../components/Dashboard/DashboardTabs/DashboardTabs';

function renderTabs({ level, features = [] }) {
  mockAuth.level = level;
  mockAuth.features = features;

  const state = {
    user: { id: '123', level: { Name: level }, features_access: features },
    departmentAnnouncement: {},
  };
  const store = createStore((s = state) => s, applyMiddleware(thunk));

  return render(
    <Provider store={store}>
      <DashboardTabs />
    </Provider>
  );
}

describe('DashboardTabs — role-based tab visibility', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    if (console.error.mockRestore) console.error.mockRestore();
    if (console.warn.mockRestore) console.warn.mockRestore();
  });

  test('SUPERVISOR (Department Head) sees Summary + Engagements tabs', () => {
    renderTabs({ level: 'Department Head' });
    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText('Engagements')).toBeInTheDocument();
    expect(screen.getByText('Announcements')).toBeInTheDocument();
  });

  test('HR sees Summary + Engagements tabs', () => {
    renderTabs({ level: 'HR' });
    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText('Engagements')).toBeInTheDocument();
  });

  test('EMPLOYEE does NOT see Summary/Engagements tabs, only Announcements', () => {
    renderTabs({ level: 'Employee' });
    expect(screen.queryByText('Summary')).not.toBeInTheDocument();
    expect(screen.queryByText('Engagements')).not.toBeInTheDocument();
    expect(screen.getByText('Announcements')).toBeInTheDocument();
  });
});
