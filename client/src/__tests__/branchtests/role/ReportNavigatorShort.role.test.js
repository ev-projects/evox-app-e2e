/**
 * ROLE-AWARE TEST — ReportNavigatorShort
 * Source: src/components/Template/ReportNavigatorShort/ReportNavigatorShort.js
 * Copy into client tree at: client/src/__tests__/branchtests/role/ReportNavigatorShort.role.test.js
 *
 * Why: The "Custom" date-range tab is only rendered for HR users that also hold the
 * `view_attendance_report` feature (Authenticator.scanLevel_Feature("HR", ...)).
 * Everyone else sees only Today / Monthly. Drives both branches.
 *
 * NO real HTTP: Authenticator mocked; component makes no API calls.
 */

import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import moment from 'moment';

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

import ReportNavigatorShort from '../../../components/Template/ReportNavigatorShort/ReportNavigatorShort';

function renderNav({ level, features = [] }) {
  mockAuth.level = level;
  mockAuth.features = features;

  const store = createStore((s = {}) => s, applyMiddleware(thunk));

  return render(
    <Provider store={store}>
      <ReportNavigatorShort
        start_date={moment()}
        end_date={moment()}
        default_view_type="month"
        handleChangeDate={jest.fn()}
      />
    </Provider>
  );
}

describe('ReportNavigatorShort — role-based Custom range tab', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    if (console.error.mockRestore) console.error.mockRestore();
    if (console.log.mockRestore) console.log.mockRestore();
  });

  test('HR with view_attendance_report sees the Custom tab', () => {
    renderNav({ level: 'HR', features: ['view_attendance_report'] });
    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Monthly')).toBeInTheDocument();
  });

  test('HR without the feature does NOT see the Custom tab', () => {
    renderNav({ level: 'HR', features: [] });
    expect(screen.queryByText('Custom')).not.toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  test('EMPLOYEE does NOT see the Custom tab', () => {
    renderNav({ level: 'Employee', features: ['view_attendance_report'] });
    expect(screen.queryByText('Custom')).not.toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Monthly')).toBeInTheDocument();
  });
});
