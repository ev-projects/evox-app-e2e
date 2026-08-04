// WAVE-2 REACHABILITY PASS — authored 2026-07-27, needs first live Jest run
// Target: src/components/Dashboard/RecentDtrNav/RecentDtrNav.js (49 stmts, 0% — no test existed)
// Reachability: imported+rendered by components/Template/NavQuickPunch (header chain).
// componentWillMount starts a 1s setInterval -> fake timers to avoid leakage.
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => jest.fn(),
    useSelector: jest.fn(),
}));

jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader:  ({ children }) => <div>{children}</div>,
    Content:          ({ children }) => <div>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
    Row:              ({ children }) => <div>{children}</div>,
    Col:              ({ children }) => <div>{children}</div>,
}));
jest.mock('../../services/DtrFormatter', () => ({
    displayLog:       jest.fn(() => '08:00:00'),
    displayDate:      jest.fn(() => '2026-07-01'),
    displayDateBasic:  jest.fn(() => '2026-07-01'),  // called at RecentDtrNav.js:152 (07-28 run fix)
    displayHoliday:   jest.fn(() => null),           // called at RecentDtrNav.js:132 (07-27 run fix)
    displaySchedule:  jest.fn(() => ''),             // called at RecentDtrNav.js:154 (07-29 run fix)
}));
jest.mock('react-datepicker', () => () => <input type="date" />);

const RecentDtrNav = require('../../components/Dashboard/RecentDtrNav/RecentDtrNav').default;

const defaultProps = {
    user: { id: 1, full_name: 'Test User' },
    dashboard: {
        recent_dtr: [],
        isRecentDtrLoaded: false,
    },
    getRecentDtr: jest.fn(),
    biometrixLog: jest.fn(),
    fetchUser: jest.fn(),
};

function renderNav(props = {}) {
    return render(
        <MemoryRouter>
            <RecentDtrNav {...defaultProps} {...props} />
        </MemoryRouter>
    );
}

describe('RecentDtrNav component', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.clearAllMocks();
    });
    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    test('renders without crashing with empty recent dtr', () => {
        expect(() => renderNav()).not.toThrow();
    });

    test('renders without crashing with a recent dtr entry', () => {
        expect(() =>
            renderNav({
                dashboard: {
                    isRecentDtrLoaded: true,
                    recent_dtr: [{
                        id: 1, date: '2026-07-01',
                        time_in: 1000000000, time_out: null,
                        log_in_type: 'Log_in', log_out_type: null,
                        attendance_status: { slug: 'present', name: 'Present' },  // 07-27 run fix
                        holidays: [],
                    }],
                },
            })
        ).not.toThrow();
    });

    test('mount does not dispatch fetches (all mount fetches are commented out)', () => {
        renderNav();
        expect(defaultProps.getRecentDtr).not.toHaveBeenCalled();
        expect(defaultProps.fetchUser).not.toHaveBeenCalled();
    });

    test('interval tick does not crash after unmount (cleanup runs)', () => {
        const { unmount } = renderNav();
        unmount();
        expect(() => jest.advanceTimersByTime(3000)).not.toThrow();
    });
});
