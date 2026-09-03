/**
 * evoxtest_ProfileScheduleGridDeep3.test.js
 * Source under test: src/container/Profile/Schedule/Schedule.js
 * Menu: (avatar) -> My Profile -> Schedule tab / My Team -> employee -> Schedule tab
 *
 * Wave-6 residue after evoxtest_ProfileScheduleDeep2: 7 uncovered functions (the whole store
 * wiring) and 17 uncovered branch arms, all of them in the MONTH grid — the week grid is the
 * one Deep2 exercised. The month grid decides, per day, whether to show the DTR row, the
 * default schedule or a temporary schedule, and whether the day is a rest day; every one of
 * those decisions is asserted below.
 *
 * ADDITIVE ONLY — no existing test, mock or app file is touched.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import moment from 'moment';

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
jest.mock('../../components/Template/ReportNavigator', () => () => <div data-testid="report-navigator" />);
jest.mock('../../container/Profile/LeaveCredits', () => () => <div />);
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate: ({ name }) => <input type="date" name={name} />,
}));
jest.mock('react-datepicker', () => () => <input type="date" />);
jest.mock('../../services/Authenticator', () => ({
    scanFeature: jest.fn(() => true), scanLevel: jest.fn(() => true), check: jest.fn(() => true),
}));
jest.mock('../../store/actions/profile/profileActions', () => ({
    fetchTimeOff: jest.fn((id, s, e) => ({ type: 'P_TIMEOFF', id, s, e })),
    setDateList:  jest.fn((d) => ({ type: 'P_DATES', d })),
    setScope:     jest.fn((s) => ({ type: 'P_SCOPE', s })),
    setWeekList:  jest.fn((w) => ({ type: 'P_WEEKS', w })),
}));
jest.mock('../../store/actions/dtr/dtrActions', () => ({
    viewEmployeeDtr: jest.fn((id, f, t) => ({ type: 'DTR_VIEW', id, f, t })),
}));

const Schedule = require('../../container/Profile/Schedule/Schedule').default;
const profileActions = require('../../store/actions/profile/profileActions');
const dtrActions = require('../../store/actions/dtr/dtrActions');

// Two calendar weeks: Mon 3 Aug 2026 .. Sun 16 Aug 2026.
const DAYS = Array.from({ length: 14 }, (_, i) => moment('2026-08-03').add(i, 'days'));
const DATE_LIST = DAYS.map((d) => d.format('YYYY-MM-DD'));
const MONTH_DATA = [DAYS.slice(0, 7), DAYS.slice(7, 14)];

const defaultSchedule = {
    rest_day: ['sat', 'sun'],
    schedule_details: { all: { start_time: '09:00', end_time: '18:00', start_flexy_time: '08:00', end_flexy_time: '19:00' } },
};

// ten DTR rows against a fourteen-day range: the last four days have no record
const dtrRows = DATE_LIST.slice(0, 10).map((d, i) => ({
    attendance_status: { name: i === 0 ? 'Rest Day' : 'Present' },
    start_datetime: i === 2 ? null : `${d} 09:00:00`,
    end_datetime: i === 2 ? null : `${d} 18:00:00`,
    start_flexy_datetime: i === 2 ? null : `${d} 08:00:00`,
    end_flexy_datetime: i === 2 ? null : `${d} 19:00:00`,
}));

const temporarySchedules = [
    {   // a one-day temporary schedule on 13 Aug
        valid_from: '2026-08-13', valid_to: '2026-08-13', rest_day: [],
        schedule_details: { all: { start_time: '07:00', end_time: '16:00', start_flexy_time: '06:00', end_flexy_time: '17:00' } },
    },
    {   // a three-day temporary schedule, 14-16 Aug, whose rest day is Saturday
        valid_from: '2026-08-14', valid_to: '2026-08-16', rest_day: ['sat'],
        schedule_details: { all: { start_time: '11:00', end_time: '20:00', start_flexy_time: '10:00', end_flexy_time: '21:00' } },
    },
];

function renderSchedule(profileOverrides = {}, props = {}) {
    const actions = {
        fetchTimeOff: jest.fn(), setDateList: jest.fn(), setScope: jest.fn(),
        setWeekList: jest.fn(), viewEmployeeDtr: jest.fn(),
    };
    const utils = render(
        <MemoryRouter>
            <Schedule
                id={7}
                user={{ id: 7 }}
                dtr={dtrRows}
                schedule={defaultSchedule}
                start_date={moment('2026-08-03')}
                end_date={moment('2026-08-16')}
                profile={{
                    scope: 'month',
                    dates: MONTH_DATA,
                    date_list: DATE_LIST,
                    week_list: [['Wednesday', 'Sunday'], ['Monday', 'Friday']],
                    schedule: defaultSchedule,
                    temporary_schedule: temporarySchedules,
                    ...profileOverrides,
                }}
                {...actions}
                {...props}
            />
        </MemoryRouter>
    );
    return { ...utils, actions };
}

// one entry per rendered day, in calendar order
const dayCells = (utils) => Array.from(utils.container.querySelectorAll('.schedule_info'));

beforeEach(() => jest.clearAllMocks());

describe('Profile Schedule — the month grid', () => {
    test('every day of both weeks gets a cell', () => {
        const utils = renderSchedule();
        expect(dayCells(utils).length).toBe(14);
    });

    test('a day with a DTR record shows that record: rest days say so, worked days show the punches', () => {
        const cells = dayCells(renderSchedule());

        expect(cells[0].textContent).toBe('REST DAY');           // attendance status Rest Day
        expect(cells[1].textContent).toContain('09:00');         // start_datetime
        expect(cells[1].textContent).toContain('18:00');         // end_datetime
        expect(cells[1].textContent).toContain('08:00');         // flexy start
        expect(cells[1].textContent).toContain('19:00');         // flexy end
    });

    test('a DTR record with no punch times shows blanks rather than "Invalid date"', () => {
        const utils = renderSchedule();
        expect(dayCells(utils)[2].textContent.replace(/[\s-]/g, '')).toBe('');
        expect(utils.container.textContent).not.toContain('Invalid date');
    });

    test('the card of a rest day is styled differently from a worked day', () => {
        const utils = renderSchedule();
        const bodies = Array.from(utils.container.querySelectorAll('.card-body'));
        expect(bodies[0].className).toContain('rest_day');
        expect(bodies[1].className).toContain('early');
    });

    test('a day past the end of the DTR falls back to the default schedule and its rest days', () => {
        // no temporary schedules at all: 13-16 Aug have no DTR row either
        const cells = dayCells(renderSchedule({ temporary_schedule: [] }));

        expect(cells[10].textContent).toContain('09:00'); // 13 Aug (Thu) — default hours
        expect(cells[10].textContent).toContain('18:00');
        expect(cells[12].textContent).toBe('REST DAY');   // 15 Aug is a Saturday
        expect(cells[13].textContent).toBe('REST DAY');   // 16 Aug is a Sunday
    });

    test('a one-day temporary schedule replaces the default hours on exactly that day', () => {
        const cells = dayCells(renderSchedule());
        expect(cells[10].textContent).toContain('07:00'); // 13 Aug — temporary
        expect(cells[10].textContent).toContain('16:00');
        expect(cells[9].textContent).not.toContain('07:00');
    });

    test('a multi-day temporary schedule applies on its first day, inside the range and on its last day', () => {
        const cells = dayCells(renderSchedule());

        expect(cells[11].textContent).toContain('11:00');  // 14 Aug — first day of the range
        expect(cells[11].textContent).toContain('20:00');
        expect(cells[13].textContent).toContain('11:00');  // 16 Aug — last day of the range
    });

    test('the temporary schedule brings its own rest day with it', () => {
        const cells = dayCells(renderSchedule());
        // 15 Aug is a Saturday and the temporary schedule rests on Saturday
        expect(cells[12].textContent).toBe('REST DAY');
        // 16 Aug is a Sunday: a rest day under the default schedule, but not under this one
        expect(cells[13].textContent).not.toBe('REST DAY');
    });

    test('an employee with no month data renders an empty grid instead of failing', () => {
        const utils = renderSchedule({ dates: [] });
        expect(dayCells(utils).length).toBe(0);
        utils.getByTestId('report-navigator');
    });

    test('a scope the page does not know about renders neither grid', () => {
        const utils = renderSchedule({ scope: 'decade' });
        expect(dayCells(utils).length).toBe(0);
        utils.getByText('Neither');
    });
});

describe('Profile Schedule — store wiring', () => {
    test('mapStateToProps exposes the profile and the logged-in user', () => {
        const state = { profile: { scope: 'week' }, user: { id: 7 }, junk: 1 };
        expect(Schedule.__mapStateToProps(state)).toEqual({ profile: { scope: 'week' }, user: { id: 7 } });
    });

    test('every mapDispatchToProps handler dispatches its own action creator', () => {
        const dispatch = jest.fn();
        const p = Schedule.__mapDispatchToProps(dispatch);

        p.fetchTimeOff(7, 'from', 'to');
        p.setDateList(['d']);
        p.setWeekList({ week_list: [] });
        p.setScope('month');
        p.viewEmployeeDtr(7, 'from', 'to');

        expect(profileActions.fetchTimeOff).toHaveBeenCalledWith(7, 'from', 'to');
        expect(dtrActions.viewEmployeeDtr).toHaveBeenCalledWith(7, 'from', 'to');
        expect(dispatch.mock.calls.map((c) => c[0].type)).toEqual([
            'P_TIMEOFF', 'P_DATES', 'P_WEEKS', 'P_SCOPE', 'DTR_VIEW',
        ]);
    });
});
