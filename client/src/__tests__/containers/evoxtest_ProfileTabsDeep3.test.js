/**
 * evoxtest_ProfileTabsDeep3.test.js
 * Sources under test:
 *   src/container/Profile/LeaveCredits/LeaveCredits.js        (the file itself, NOT the dead
 *                                                              nested LeaveCredits/LeaveCredits copy)
 *   src/container/Profile/TimeOff/TimeOff.js
 *   src/container/Profile/ScheduleHistory/ScheduleHistory.js
 *   src/container/Profile/PersonalInformation/PersonalInformation.js
 * Menu: (avatar) -> My Profile -> Time Off / Schedule History / Personal Info tabs
 *
 * Wave-6 residue: LeaveCredits 5 fns / 6 branch arms, ScheduleHistory 4 fns / 6 branch arms,
 * TimeOff 4 fns / 3 branch arms, PersonalInformation 3 fns / 2 branch arms.
 *
 * FINDING SCHEDHIST-ONWARDS — an open-ended schedule never shows the "ONWARDS" label; see the
 * comment above that test. Characterised as it behaves today, so the test fails when it is fixed.
 *
 * ADDITIVE ONLY — no existing test, mock or app file is touched.
 */

import React from 'react';
import { render, fireEvent, act, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: (mapStateToProps, mapDispatchToProps) => (Component) => {
        Component.__mapStateToProps = mapStateToProps;
        Component.__mapDispatchToProps = mapDispatchToProps;
        return Component;
    },
}));

jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader:  ({ children }) => <div>{children}</div>,
    Content:          ({ children }) => <div>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
}));
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/Template/BackButton', () => () => <div />);
jest.mock('../../components/Template/Paginate', () => ({ pagination }) => (
    <div data-testid="paginate">{pagination && pagination.total}</div>
));
// the navigator owns the date range control; this stand-in lets the test move the range
jest.mock('../../components/Template/ReportNavigator', () => ({ handleChangeDate }) => (
    <button data-testid="move-range" onClick={() => handleChangeDate('2026-09-01', '2026-09-30', 'month')}>range</button>
));
jest.mock('../../components/ChangePasswordFormComponent', () => () => <div data-testid="change-password-form" />);
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate: ({ name }) => <input type="date" name={name} />,
}));
jest.mock('react-datepicker', () => () => <input type="date" />);
jest.mock('react-select', () => () => <select />);
jest.mock('../../services/Authenticator', () => ({
    scanFeature: jest.fn(() => true), scanLevel: jest.fn(() => false), check: jest.fn(() => true),
}));
jest.mock('../../store/actions/profile/profileActions', () => ({
    fetchTimeOff:         jest.fn((id, s, e) => ({ type: 'P_TIMEOFF', id, s, e })),
    changePassword:       jest.fn(() => ({ type: 'P_PASSWORD' })),
    fetchScheduleHistory: jest.fn((id, params) => ({ type: 'P_SCHED_HIST', id, params })),
    fetchProfile:         jest.fn((id) => ({ type: 'P_PROFILE', id })),
}));

const LeaveCredits = require('../../container/Profile/LeaveCredits/LeaveCredits').default;
const TimeOffModule = require('../../container/Profile/TimeOff/TimeOff');
const TimeOff = TimeOffModule.default;
const { LeaveIcon, LeaveStatus } = TimeOffModule;
const ScheduleHistory = require('../../container/Profile/ScheduleHistory/ScheduleHistory').default;
const PersonalInformation = require('../../container/Profile/PersonalInformation/PersonalInformation').default;
const profileActions = require('../../store/actions/profile/profileActions');

global.links = { profile: '/profile/' };

const wrap = (element) => render(<MemoryRouter>{element}</MemoryRouter>);

beforeEach(() => jest.clearAllMocks());

describe('Profile / Leave Credits card', () => {
    const profile = {
        details: { id: 7 },
        leave_credits: [
            { type: 'Vacation Leave', balance: 5 },
            { type: 'Sick Leave', balance: 0 },      // spent: must not be offered
            { type: 'Birthday Leave', balance: 1 },
        ],
    };

    test('only the leave types with a balance left are offered', () => {
        const utils = wrap(<LeaveCredits profile={profile} user={{ id: 7 }} />);

        utils.getByText('Vacation Leave');
        utils.getByText('Birthday Leave');
        expect(utils.queryByText('Sick Leave')).toBeNull();
        expect(utils.getAllByText('DAYS AVAILABLE').length).toBe(2);
        utils.getByText('5');
    });

    test('an employee with no credits at all, or no profile loaded, shows no card', () => {
        const noCredits = wrap(<LeaveCredits profile={{ details: { id: 7 }, leave_credits: [] }} user={{ id: 7 }} />);
        expect(noCredits.container.textContent).toBe('');

        const noProfile = wrap(<LeaveCredits profile={null} user={{ id: 7 }} />);
        expect(noProfile.container.textContent).toBe('');
    });

    test('store wiring reads the profile slice and exposes the time-off fetch', () => {
        expect(LeaveCredits.__mapStateToProps({ profile: { details: {} }, user: { id: 7 }, junk: 1 }))
            .toEqual({ profile: { details: {} }, user: { id: 7 } });

        const dispatch = jest.fn();
        LeaveCredits.__mapDispatchToProps(dispatch).fetchTimeOff(7, 'from', 'to');
        expect(profileActions.fetchTimeOff).toHaveBeenCalledWith(7, 'from', 'to');
        expect(dispatch).toHaveBeenCalledWith({ type: 'P_TIMEOFF', id: 7, s: 'from', e: 'to' });
    });
});

describe('Profile / Time Off tab', () => {
    const profile = {
        details: { id: 7 },
        leave_credits: [{ type: 'Vacation Leave', balance: 3 }],
        leaves_list: [
            { date: '2026-08-10', type: 'Vacation Leave', status: 'approved', amount: '1.0', employee_note: 'holiday' },
            { date: '2026-08-11', type: 'Sick Leave', status: 'requested', amount: '0.5', employee_note: 'fever' },
        ],
    };

    test('the leaves in range are listed newest first with their note and day count', () => {
        const utils = wrap(<TimeOff profile={profile} user={{ id: 7 }} fetchTimeOff={jest.fn()} />);

        const rows = utils.container.querySelectorAll('.leave-row');
        expect(rows.length).toBe(2);
        expect(rows[0].textContent).toContain('Sick Leave');       // reversed: latest first
        expect(rows[0].textContent).toContain('fever');
        expect(rows[1].textContent).toContain('Vacation Leave');
        expect(rows[1].textContent).toContain('1 day of');
    });

    test('an empty range says so instead of showing an empty list', () => {
        const utils = wrap(<TimeOff profile={{ ...profile, leaves_list: [] }} user={{ id: 7 }} fetchTimeOff={jest.fn()} />);
        utils.getByText("You don't have any leaves within this date range.");
    });

    test('moving the date range refetches that employee\'s leaves for the new range', () => {
        const fetchTimeOff = jest.fn();
        const utils = wrap(<TimeOff profile={profile} user={{ id: 7 }} fetchTimeOff={fetchTimeOff} />);

        fireEvent.click(utils.getByTestId('move-range'));

        expect(fetchTimeOff).toHaveBeenCalledWith(7, '2026-09-01', '2026-09-30');
    });

    test('nothing renders until the profile is loaded', () => {
        const utils = wrap(<TimeOff profile={null} user={{ id: 7 }} fetchTimeOff={jest.fn()} />);
        expect(utils.container.textContent).toBe('');
    });

    test('each leave type gets its own icon, and an unknown type gets the generic one', () => {
        const iconFor = (type) => wrap(<LeaveIcon type={type} />).container.querySelector('i').className;

        expect(iconFor('Vacation Leave')).toContain('fa-plane');
        expect(iconFor('Sick Leave')).toContain('fa-medkit');
        expect(iconFor('Magna Carta Leave For Woman')).toContain('fa-female');
        expect(iconFor('Maternity Leave')).toContain('fa-child');
        expect(iconFor('Paternity Leave')).toContain('fa-child');
        expect(iconFor('Birthday Leave')).toContain('fa-birthday-cake');
        expect(iconFor('Bereavement Leave')).toContain('fa-handshake-o');
        expect(iconFor('Study Leave')).toContain('fa-user');
    });

    test('each leave status gets its own icon and an unknown status shows none', () => {
        const statusFor = (status) => wrap(<LeaveStatus status={status} />).container.querySelector('i');

        expect(statusFor('requested').className).toContain('fa-hourglass');
        expect(statusFor('approved').className).toContain('fa-check-circle');
        expect(statusFor('denied').className).toContain('fa-times-circle');
        expect(statusFor('canceled').className).toContain('fa-ban');
        expect(statusFor('archived')).toBeNull();
    });

    test('store wiring reads the profile slice and exposes the time-off fetch', () => {
        expect(TimeOff.__mapStateToProps({ profile: { details: {} }, user: { id: 7 }, junk: 1 }))
            .toEqual({ profile: { details: {} }, user: { id: 7 } });

        const dispatch = jest.fn();
        TimeOff.__mapDispatchToProps(dispatch).fetchTimeOff(7, 'from', 'to');
        expect(profileActions.fetchTimeOff).toHaveBeenCalledWith(7, 'from', 'to');
        expect(dispatch).toHaveBeenCalledWith({ type: 'P_TIMEOFF', id: 7, s: 'from', e: 'to' });
    });
});

describe('Profile / Schedule History tab', () => {
    const profile = {
        details: { id: 7 },
        schedule_history: {
            data: [
                { id: 11, source_type: 'Default', work_days: ['mon', 'tue', 'wed'], valid_from: '2026-01-01', valid_to: '2026-06-30' },
                { id: 12, source_type: 'Temporary', work_days: ['sat'], valid_from: '2026-07-01', valid_to: null },
            ],
            pagination: { total: 2 },
        },
    };

    const renderHistory = (overrides = {}) => {
        const ref = React.createRef();
        const fetchScheduleHistory = jest.fn();
        const utils = wrap(
            <ScheduleHistory ref={ref} profile={{ ...profile, ...overrides }} user={{ id: 7 }} fetchScheduleHistory={fetchScheduleHistory} />
        );
        return { ...utils, ref, fetchScheduleHistory };
    };

    test('every schedule the employee has held is listed with its work days and a details link', () => {
        const utils = renderHistory();

        const rows = utils.container.querySelectorAll('tbody tr');
        expect(rows.length).toBe(2);
        expect(rows[0].textContent).toContain('Default');
        expect(rows[0].textContent).toContain('mon, tue, wed');
        expect(rows[0].querySelector('a').getAttribute('href')).toBe('/profile/7/schedule/11');
        expect(utils.container.textContent).toContain('Total: 2');
        utils.getByTestId('paginate');
    });

    test('nothing renders until the history is loaded', () => {
        const utils = renderHistory({ schedule_history: null });
        expect(utils.container.textContent).toBe('');
    });

    /**
     * FINDING SCHEDHIST-ONWARDS — the "Valid to" cell is meant to read ONWARDS for a schedule
     * with no end date, but the guard is `item.valid_to != null || item.valid_to != ""`, which
     * is true for every possible value (null passes the second test, "" passes the first). The
     * label is therefore unreachable and an open-ended schedule shows an empty cell. Pure JS,
     * nothing to do with the test environment. Fix: `item.valid_to != null && item.valid_to != ""`.
     * When that lands this test fails — flip it to expect 'ONWARDS'.
     */
    test('FINDING_SCHEDHIST-ONWARDS: an open-ended schedule shows a blank end date, not "ONWARDS"', () => {
        const utils = renderHistory();

        const openEndedRow = utils.container.querySelectorAll('tbody tr')[1];
        expect(openEndedRow.children[4].textContent).toBe('');
        expect(utils.container.textContent).not.toContain('ONWARDS');
    });

    test('filtering posts only the filters that carry a value', async () => {
        const { ref, fetchScheduleHistory, container } = renderHistory();

        ref.current.setState({ filters: { status: 1, page: 2, url: '', order_by: null } });
        await act(async () => { fireEvent.submit(container.querySelector('form')); });

        expect(fetchScheduleHistory).toHaveBeenCalledTimes(1);
        expect(fetchScheduleHistory).toHaveBeenCalledWith(7, { status: 1, page: 2 });
    });

    test('store wiring reads the profile slice and exposes the history fetch', () => {
        expect(ScheduleHistory.__mapStateToProps({ profile: { details: {} }, user: { id: 7 }, junk: 1 }))
            .toEqual({ profile: { details: {} }, user: { id: 7 } });

        const dispatch = jest.fn();
        ScheduleHistory.__mapDispatchToProps(dispatch).fetchScheduleHistory(7, { page: 1 });
        expect(profileActions.fetchScheduleHistory).toHaveBeenCalledWith(7, { page: 1 });
        expect(dispatch).toHaveBeenCalledWith({ type: 'P_SCHED_HIST', id: 7, params: { page: 1 } });
    });
});

describe('Profile / Personal Information tab', () => {
    const profile = {
        details: {
            id: 7, first_name: 'Jane', last_name: 'Doe', email: 'jane@ev.com',
            mobile_number: '09170000000', emp_num: '1001', nickname: 'Janey',
            birthdate: '1990-01-01', is_active: 1,
        },
    };

    test('the employee\'s own details are shown and every field is read-only', () => {
        const utils = wrap(<PersonalInformation profile={profile} user={{ id: 7 }} />);

        expect(utils.container.querySelector('input[name="first_name"]').value).toBe('Jane');
        expect(utils.container.querySelector('input[name="email"]').value).toBe('jane@ev.com');
        expect(utils.container.querySelector('input[name="mobile_number"]').disabled).toBe(true);
        expect(utils.container.querySelector('input[name="first_name"]').disabled).toBe(true);
    });

    test('the Change Password button belongs to the owner of the profile only', () => {
        const owner = wrap(<PersonalInformation profile={profile} user={{ id: 7 }} />);
        expect(within(owner.container).queryByText('Change Password')).not.toBeNull();

        const visitor = wrap(<PersonalInformation profile={profile} user={{ id: 9 }} />);
        expect(within(visitor.container).queryByText('Change Password')).toBeNull();
    });

    test('opening Change Password reveals the form and scrolls it into view', () => {
        jest.useFakeTimers();
        const scrollIntoView = jest.fn();
        const original = window.HTMLElement.prototype.scrollIntoView;
        window.HTMLElement.prototype.scrollIntoView = scrollIntoView;

        const utils = wrap(<PersonalInformation profile={profile} user={{ id: 7 }} />);
        expect(utils.queryByTestId('change-password-form')).toBeNull();

        fireEvent.click(utils.getByText('Change Password'));
        utils.getByTestId('change-password-form');

        jest.advanceTimersByTime(200);
        expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'end', inline: 'nearest' });

        window.HTMLElement.prototype.scrollIntoView = original;
        jest.useRealTimers();
    });

    // The reducer's initial profile is `{ details: {} }`, so this is what the tab shows in the
    // moment between opening it and the fetch returning. (The component's `Validator.isValid(profile)`
    // guard can never take its null arm: line 47 dereferences profile.details before the guard runs.)
    test('before the fetch returns, the fields render blank rather than failing', () => {
        const utils = wrap(<PersonalInformation profile={{ details: {} }} user={{ id: 7 }} />);

        expect(utils.container.querySelector('input[name="first_name"]').value).toBe('');
        expect(utils.container.querySelector('input[name="email"]').value).toBe('');
        // the profile is not yet known to be the viewer's own, so no password control is offered
        expect(within(utils.container).queryByText('Change Password')).toBeNull();
    });

    test('store wiring reads the profile slice', () => {
        expect(PersonalInformation.__mapStateToProps({ profile: { details: {} }, user: { id: 7 }, junk: 1 }))
            .toEqual({ profile: { details: {} }, user: { id: 7 } });
        expect(PersonalInformation.__mapDispatchToProps).toBeUndefined();
    });
});
