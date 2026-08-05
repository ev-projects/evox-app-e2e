/**
 * EVOX-36 — Jest P0: RecentDtr Component Tests
 * Source: src/components/Dashboard/RecentDtr/RecentDtr.js
 * Component reads from this.props.dashboard.recent_dtr (mapStateToProps)
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
}));

jest.mock('../../services/DtrFormatter', () => ({
    displayDate: (date) => date || '',
    displayLog: (time) => time || '—',
    displaySchedule: () => '09:00 - 18:00',
    displayHoliday: () => '',
}));

const mockGetRecentDtr = jest.fn();
const mockBiometrixLog = jest.fn();

const sampleDtr = [
    {
        id: 1, date: '2026-05-18',
        time_in: '2026-05-18 09:00:00', time_out: '2026-05-18 18:00:00',
        is_rest_day: 0, start_datetime: '2026-05-18 09:00:00',
        attendance_status: { slug: 'present', name: 'Present' }, holidays: [],
    },
    {
        id: 2, date: '2026-05-17',
        time_in: '2026-05-17 09:05:00', time_out: '2026-05-17 18:02:00',
        is_rest_day: 0, start_datetime: '2026-05-17 09:00:00',
        attendance_status: { slug: 'present', name: 'Present' }, holidays: [],
    },
];

const defaultProps = {
    user: { id: 1, full_name: 'Test Employee' },
    dashboard: { recent_dtr: [], isLoading: false },
    getRecentDtr: mockGetRecentDtr,
    biometrixLog: mockBiometrixLog,
};

let RecentDtrComponent;
try {
    const m = require('../../components/Dashboard/RecentDtr/RecentDtr');
    RecentDtrComponent = m.RecentDtr || m.default;
} catch {
    RecentDtrComponent = require('../../components/Dashboard/RecentDtr/RecentDtr').default;
}

function renderRecentDtr(props = {}) {
    return render(
        <MemoryRouter>
            <RecentDtrComponent {...defaultProps} {...props} />
        </MemoryRouter>
    );
}

describe('RecentDtr component', () => {
    beforeEach(() => { jest.clearAllMocks(); jest.useFakeTimers(); });
    afterEach(() => jest.useRealTimers());

    test('renders without crashing (empty DTR)', () => {
        expect(() => renderRecentDtr()).not.toThrow();
    });

    test('calls getRecentDtr on mount with user ID', () => {
        renderRecentDtr();
        expect(mockGetRecentDtr).toHaveBeenCalledWith(1, expect.any(String), expect.any(String));
    });

    test('renders DTR table headers', () => {
        const { getByText } = renderRecentDtr({ dashboard: { recent_dtr: sampleDtr } });
        expect(getByText('Date')).toBeInTheDocument();
        expect(getByText('Clock In')).toBeInTheDocument();
        expect(getByText('Clock Out')).toBeInTheDocument();
    });

    test('renders DTR date records', () => {
        const { getByText } = renderRecentDtr({ dashboard: { recent_dtr: sampleDtr } });
        expect(getByText('2026-05-18')).toBeInTheDocument();
    });

    test('does not crash with empty array', () => {
        expect(() => renderRecentDtr({ dashboard: { recent_dtr: [] } })).not.toThrow();
    });

    test('does not crash during loading state', () => {
        expect(() => renderRecentDtr({ dashboard: { recent_dtr: [], isLoading: true } })).not.toThrow();
    });
});
