// WAVE-2 REACHABILITY PASS — authored 2026-07-27, needs first live Jest run
// Target: src/container/Profile/Schedule/Schedule.js (154 stmts, 0% — no test existed)
// Reachability: imported by container/Profile/Profile.js (Schedule tab) at /app/profile/:id
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
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/Template/BackButton', () => () => <div />);
jest.mock('../../components/Template/ReportNavigator', () => () => <div>ReportNavigator</div>);
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate:     ({ name }) => <input name={name} type="date" />,
    InputTime:     ({ name }) => <input name={name} type="time" />,
    InputDateTime: ({ name }) => <input name={name} type="datetime-local" />,
}));
jest.mock('../../container/Profile/LeaveCredits', () => () => <div>LeaveCredits</div>);
jest.mock('react-datepicker', () => () => <input type="date" />);

const ScheduleTab = require('../../container/Profile/Schedule/Schedule').default;

const defaultProps = {
    id: 1,
    user: { id: 1, full_name: 'Test User' },
    dtr: [],
    start_date: '2026-07-01',
    end_date: '2026-07-07',
    // profile shape per the component's week-view render path
    profile: {
        scope: 'week',
        dates: [],
        date_list: [],
        week_list: [[]],
        schedule: {},
        temporary_schedule: [],
        details: { full_name: 'Test User' },
    },
    fetchTimeOff: jest.fn(),
    setDateList: jest.fn(),
    setWeekList: jest.fn(),
    setScope: jest.fn(),
    viewEmployeeDtr: jest.fn(),
};

function renderTab(props = {}) {
    return render(
        <MemoryRouter>
            <ScheduleTab {...defaultProps} {...props} />
        </MemoryRouter>
    );
}

describe('Profile Schedule tab (container/Profile/Schedule)', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing in week scope with empty dtr', () => {
        expect(() => renderTab()).not.toThrow();
    });

    test('renders without crashing in month scope', () => {
        expect(() =>
            renderTab({ profile: { ...defaultProps.profile, scope: 'month' } })
        ).not.toThrow();
    });

    test('does not fetch on mount (no mount lifecycle)', () => {
        renderTab();
        expect(defaultProps.viewEmployeeDtr).not.toHaveBeenCalled();
        expect(defaultProps.fetchTimeOff).not.toHaveBeenCalled();
    });

    test('renders nothing visible-crash-free with an empty profile object', () => {
        // Validator.isValid({}) gate — component should fall back, not throw
        expect(() => renderTab({ profile: {} })).not.toThrow();
    });
});
