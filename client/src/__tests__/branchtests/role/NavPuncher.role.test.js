/**
 * ROLE-AWARE TEST — NavPuncher (top-nav clock in/out action button)
 * Source: src/components/Template/NavPuncher/NavPuncher.js
 * Copy into client tree at: client/src/__tests__/branchtests/role/NavPuncher.role.test.js
 *
 * Why: The nav "Clock In" action is DISABLED (rendered as a dead newfeature button)
 * for users on the multi-login feature, for Client-level users, or when the `login`
 * feature is absent -- otherwise a live Formik-backed Clock In/Out button is shown.
 * That gate is:  scanFeature("multi_login") || scanLevel("Client") || !scanFeature("login").
 * This drives the enabled vs disabled branch across roles/features.
 *
 * NO real HTTP: Authenticator mocked; API service mocked; no fetch runs on mount
 * (componentWillMount only starts a clock timer).
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

// Defensive: guarantee no real HTTP even if an action were dispatched.
jest.mock('../../../services/API', () => ({
  __esModule: true,
  default: {
    get: jest.fn(() => Promise.resolve({ data: {} })),
    post: jest.fn(() => Promise.resolve({ data: {} })),
  },
}));

import NavPuncher from '../../../components/Template/NavPuncher/NavPuncher';

const baseDtr = [
  { id: '1', is_rest_day: 0, time_in: null, time_out: null, with_in_time: false },
  { id: '2', is_rest_day: 0, time_in: null, time_out: null, with_in_time: false },
];

function renderPuncher({ level = '', features = [], recent_dtr = baseDtr } = {}) {
  mockAuth.level = level;
  mockAuth.features = features;

  const state = {
    user: { timezone: 'PST' },
    dashboard: { isNavDtrLoaded: true, recent_dtr },
    redirect: { link: null },
  };
  const store = createStore((s = state) => s, applyMiddleware(thunk));

  return render(
    <Provider store={store}>
      <NavPuncher
        user={{ id: '12345', first_name: 'John', last_name: 'Doe', timezone: 'PST' }}
        params={{ id: '1593' }}
        location={{}}
        history={{ push: jest.fn() }}
      />
    </Provider>
  );
}

describe('NavPuncher — role/feature gated Clock In button', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    if (console.error.mockRestore) console.error.mockRestore();
    if (console.log.mockRestore) console.log.mockRestore();
  });

  test('EMPLOYEE with login feature (no multi_login, not Client) gets a LIVE Clock In button', () => {
    renderPuncher({ level: 'Employee', features: ['login'] });
    const btn = screen.getByRole('button', { name: /clock in/i });
    expect(btn).not.toBeDisabled();
  });

  test('CLIENT level gets the DISABLED Clock In button', () => {
    renderPuncher({ level: 'Client', features: ['login'] });
    const btn = screen.getByRole('button', { name: /clock in/i });
    expect(btn).toBeDisabled();
  });

  test('multi_login feature forces the DISABLED Clock In button', () => {
    renderPuncher({ level: 'Employee', features: ['login', 'multi_login'] });
    const btn = screen.getByRole('button', { name: /clock in/i });
    expect(btn).toBeDisabled();
  });

  test('missing login feature forces the DISABLED Clock In button', () => {
    renderPuncher({ level: 'Employee', features: [] });
    const btn = screen.getByRole('button', { name: /clock in/i });
    expect(btn).toBeDisabled();
  });
});
