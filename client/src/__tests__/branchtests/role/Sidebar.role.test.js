/**
 * ROLE-AWARE TEST — Sidebar (main navigation menu)
 * Source: src/components/Template/Sidebar/Sidebar.js
 * Copy into client tree at: client/src/__tests__/branchtests/role/Sidebar.role.test.js
 *
 * Why: Sidebar renders completely different menu trees depending on the logged-in
 * user's level (Admin / HR / Payroll / supervisor / Employee) and feature flags.
 * A single-role render test misses every other branch. Here we drive the SAME
 * component with 5 different roles and assert which menu items appear / disappear.
 *
 * Testing library: @testing-library/react (uses `wait`, not `waitFor`).
 * NO real HTTP: Authenticator is mocked (faithful re-implementation of scanLevel /
 * scanFeature / scanLevel_Feature against a mutable in-memory role), and the
 * component makes no API calls of its own. Redux store is a static mock reducer.
 */

import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';

// ---- Mutable role driving the mocked Authenticator ----
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
      checkRole: () => false,
      checkPermission: () => false,
      check: () => false,
    },
  };
});

import Sidebar from '../../../components/Template/Sidebar/Sidebar';

// global.links.* is used as router targets everywhere in the Sidebar.
// A Proxy returns a valid string path for ANY key so <Link to=...> never breaks.
global.links = new Proxy(
  {},
  { get: (_t, prop) => (typeof prop === 'string' ? '/' + prop : '/') }
);

function renderSidebar({ level, features = [], country = 'Philippines' }) {
  mockAuth.level = level;
  mockAuth.features = features;

  const state = {
    user: {
      id: '123',
      first_name: 'Test',
      last_name: 'User',
      country,
      level: { Name: level },
      features_access: features,
    },
    settings: { country, profile_picture: null },
    report: { selected_summary: null },
    myTeamRequestList: { statusNumbers: { pending: 0 } },
  };

  const store = createStore((s = state) => s, applyMiddleware(thunk));

  return render(
    <Provider store={store}>
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    </Provider>
  );
}

describe('Sidebar — role-based menu visibility', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    if (console.error.mockRestore) console.error.mockRestore();
  });

  test('common item (Dashboard) is visible for every role', () => {
    renderSidebar({ level: 'Employee' });
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  test('ADMIN sees Admin Functions; not Payroll Functions', () => {
    renderSidebar({ level: 'Admin' });
    expect(screen.getByText('Admin Functions')).toBeInTheDocument();
    expect(screen.getByText('My Team')).toBeInTheDocument(); // Admin is in supervisor list
    expect(screen.queryByText('Payroll Functions')).not.toBeInTheDocument();
  });

  test('EMPLOYEE sees Request Form + DTR; not Admin/My Team', () => {
    renderSidebar({
      level: 'Employee',
      features: ['dtr_access', 'request_overtime'],
      country: 'Philippines',
    });
    expect(screen.getByText('Daily Time Record')).toBeInTheDocument();
    expect(screen.getByText('Request Form')).toBeInTheDocument();
    expect(screen.queryByText('Admin Functions')).not.toBeInTheDocument();
    expect(screen.queryByText('My Team')).not.toBeInTheDocument();
  });

  test('HR sees HR menu (Employee COE) + Attendance Summary; not Admin Functions', () => {
    renderSidebar({ level: 'HR', features: ['view_attendance_report'] });
    expect(screen.getByText('Employee COE')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
    expect(screen.getByText('Attendance Summary')).toBeInTheDocument();
    expect(screen.queryByText('Admin Functions')).not.toBeInTheDocument();
  });

  test('PAYROLL sees Payroll Functions + Payroll Cutoff; not Admin Functions', () => {
    renderSidebar({ level: 'Payroll', features: ['manage_payroll_cutoff'] });
    expect(screen.getByText('Payroll Functions')).toBeInTheDocument();
    expect(screen.getByText('Payroll Cutoff')).toBeInTheDocument();
    expect(screen.queryByText('Admin Functions')).not.toBeInTheDocument();
  });

  test('SUPERVISOR (Department Head) sees My Team + Employee List; not Admin/Payroll', () => {
    renderSidebar({ level: 'Department Head', features: ['view_employee_list'] });
    expect(screen.getByText('My Team')).toBeInTheDocument();
    expect(screen.getByText('Employee List')).toBeInTheDocument();
    expect(screen.queryByText('Admin Functions')).not.toBeInTheDocument();
    expect(screen.queryByText('Payroll Functions')).not.toBeInTheDocument();
  });
});
