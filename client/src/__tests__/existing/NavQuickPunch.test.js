/**
 * EVOX-36 — Jest P0: NavQuickPunch Component Tests
 * Source: src/components/Template/NavQuickPunch/NavQuickPunch.js
 * Covers: clock-in/out widget in navbar, time display
 */

import React from 'react';
import { render } from '@testing-library/react';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
}));

// Mock sub-components to avoid deep dependency trees
jest.mock('../../components/Template/NavPuncher/NavPuncher', () => () => <div />);
jest.mock('../../components/Dashboard/DtrNotifications', () => () => <div />);
jest.mock('../../components/Dashboard/RecentDtrNav', () => () => <div />);
jest.mock('../../services/DtrFormatter', () => ({
    displayDate: (d) => d || '',
    displayLog: (t) => t || '—',
    displaySchedule: () => '09:00 - 18:00',
    displayHoliday: () => '',
}));

import { MemoryRouter } from 'react-router-dom';

const mockBiometrixLog = jest.fn();
const mockGetRecentDtr = jest.fn();
const mockGetMyDtrNotifications = jest.fn();
const mockGetIncompleteDtr = jest.fn();
const mockLogOut = jest.fn();
const mockClearRecentDtrInstance = jest.fn();

const defaultProps = {
    user: {
        id: 1,
        full_name: 'Test Employee',
        is_active: 1,
        country_id: 2,
    },
    dashboard: { recent_dtr: [], my_dtr_notifications: [] },
    dtr: { recentDtr: null, incompleteDtr: {}, isLoading: false },
    notifications: { myDtrNotifications: [] },
    biometrixLog: mockBiometrixLog,
    getRecentDtr: mockGetRecentDtr,
    getMyDtrNotifications: mockGetMyDtrNotifications,
    getIncompleteDtr: mockGetIncompleteDtr,
    logOut: mockLogOut,
    clearRecentDtrInstance: mockClearRecentDtrInstance,
};

function renderNavQuickPunch(props = {}) {
    const Module = require('../../components/Template/NavQuickPunch/NavQuickPunch');
    const NavQuickPunch = Module.default || Module;

    return render(
        <MemoryRouter>
            <NavQuickPunch {...defaultProps} {...props} />
        </MemoryRouter>
    );
}

describe('NavQuickPunch component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('renders without crashing', () => {
        expect(() => renderNavQuickPunch()).not.toThrow();
    });

    test('calls getRecentDtr on mount', () => {
        renderNavQuickPunch();
        expect(mockGetRecentDtr).toHaveBeenCalled();
    });

    test('calls getMyDtrNotifications on mount', () => {
        renderNavQuickPunch();
        expect(mockGetMyDtrNotifications).toHaveBeenCalled();
    });

    test('does not crash when user has no recent DTR', () => {
        expect(() =>
            renderNavQuickPunch({ dtr: { recentDtr: null, incompleteDtr: {} } })
        ).not.toThrow();
    });

    // Gary: add assertions for actual UI elements visible in the navbar
    // e.g.: expect(screen.getByText(/clock in/i)).toBeInTheDocument()
});
