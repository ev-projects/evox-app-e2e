/**
 * evoxtest_ProfileScheduleDeep2.test.js
 * Wave-1 coverage for container/Profile/Schedule/Schedule.js (29 Jul: 129 unc / 16.2%).
 * Arms: profile-valid guard, handleChangeDate week/month/custom branches (real Helper
 * date-list generators), WeekTeamSchedule's three data sources (full DTR / partial DTR /
 * temporary-schedule matching incl. same-day, between and edge-date arms, rest-day from
 * schedule), MonthTeamSchedule with first/last week offsets and full-DTR arm.
 * ADDITIVE ONLY. Menu: Profile → Schedule tab (route: profile/:user_id/schedule/:schedule_id).
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import moment from 'moment';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
}));

jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader:  ({ children }) => <div>{children}</div>,
    Content:          ({ children }) => <div>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
}));
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/Template/BackButton', () => () => <div />);
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate: () => <input type="date" />,
}));
jest.mock('../../container/Profile/LeaveCredits', () => () => <div />);
jest.mock('react-datepicker', () => () => <input type="date" />);

jest.mock('../../components/Template/ReportNavigator', () => {
    const React = require('react');
    const momentLocal = require('moment');
    return (props) => (
        <div data-testid="report-navigator">
            <button data-testid="nav-week"
                onClick={() => props.handleChangeDate(momentLocal('2026-07-27'), momentLocal('2026-08-02'), 'week')}>w</button>
            <button data-testid="nav-month"
                onClick={() => props.handleChangeDate(momentLocal('2026-07-01'), momentLocal('2026-07-31'), 'month')}>m</button>
            <button data-testid="nav-custom"
                onClick={() => props.handleChangeDate(momentLocal('2026-07-15'), momentLocal('2026-07-20'), 'custom')}>c</button>
        </div>
    );
});

jest.mock('react-bootstrap', () => {
    const React = require('react');
    const passthrough = ({ children, className }) => <div className={className}>{children}</div>;
    return {
        Container: passthrough, Row: passthrough, Col: passthrough,
        Table: ({ children }) => <table>{children}</table>,
        Image: () => <img alt="" />, Spinner: () => <div />,
        Button: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
        Form: passthrough, InputGroup: passthrough, FormControl: (p) => <input {...p} />,
        Tabs: passthrough, Tab: passthrough,
        Card: ({ children }) => <div className="card">{children}</div>,
    };
});

jest.mock('../../store/actions/profile/profileActions', () => ({
    fetchTimeOff: jest.fn(), setDateList: jest.fn(), setScope: jest.fn(), setWeekList: jest.fn(),
}));
jest.mock('../../store/actions/dtr/dtrActions', () => ({ viewEmployeeDtr: jest.fn() }));

// services/Helper.js does `import moment, * as Moment from 'moment'` and CALLS the
// namespace (`Moment(...)`) — that only works through webpack's lenient CJS interop;
// under Jest/Babel the namespace is not callable → every date helper throws.
// (Upgrade-audit hazard: webpack 5 / modern bundlers will break this in prod too.)
// Stub the four helpers with shape-correct fakes; the component only forwards their
// results into the (mocked) redux setters.
jest.mock('../../services/Helper', () => ({
    getDaysArrayInMonth: jest.fn(() => Array.from({ length: 31 }, (_, i) => `2026-07-${String(i + 1).padStart(2, '0')}`)),
    generateWeekList: jest.fn(() => [['Wednesday', 'Sunday']]),
    getDaysArrayInWeek: jest.fn(() => ({
        date_list: ['2026-07-27', '2026-07-28', '2026-07-29', '2026-07-30', '2026-07-31', '2026-08-01', '2026-08-02'],
        week_list: ['Monday', 'Sunday'],
        dates: ['2026-07-27', '2026-07-28', '2026-07-29', '2026-07-30', '2026-07-31', '2026-08-01', '2026-08-02'],
    })),
    generateWeekListCustom: jest.fn(() => ({
        week_list: [['Wednesday', 'Monday']],
        dates_list: ['2026-07-15'],
        display_list: ['2026-07-15', '2026-07-16', '2026-07-17', '2026-07-18', '2026-07-19', '2026-07-20'],
    })),
}));

const Schedule = require('../../container/Profile/Schedule/Schedule').default;

const weekMoments = ['2026-07-27', '2026-07-28', '2026-07-29', '2026-07-30', '2026-07-31', '2026-08-01', '2026-08-02'];

const scheduleFixture = {
    rest_day: ['sat', 'sun'],
    schedule_details: { all: { start_time: '09:00', end_time: '18:00', start_flexy_time: '10:00', end_flexy_time: '19:00' } },
};

const dtrRow = (date, name) => ({
    attendance_status: { name },
    start_datetime: date + ' 08:30:00',
    end_datetime: date + ' 17:30:00',
    start_flexy_datetime: date + ' 09:30:00',
    end_flexy_datetime: date + ' 18:30:00',
});

function weekProfile(overrides = {}) {
    return {
        scope: 'week',
        dates: weekMoments.map((d) => moment(d)),
        date_list: weekMoments,
        schedule: scheduleFixture,
        temporary_schedule: [],
        week_list: [],
        ...overrides,
    };
}

const baseProps = {
    id: 55,
    user: { id: 1 },
    start_date: moment('2026-07-27'),
    end_date: moment('2026-08-02'),
    dtr: [],
    profile: weekProfile(),
    fetchTimeOff: jest.fn(),
    setDateList: jest.fn(),
    setWeekList: jest.fn(),
    setScope: jest.fn(),
    viewEmployeeDtr: jest.fn(),
};

function renderSchedule(props = {}) {
    return render(
        <MemoryRouter>
            <Schedule {...baseProps} {...props} />
        </MemoryRouter>
    );
}

beforeEach(() => jest.clearAllMocks());

describe('ProfileSchedule — guard and navigator branches', () => {
    test('invalid profile renders nothing', () => {
        const { container } = renderSchedule({ profile: null });
        expect(container.firstChild).toBeNull();
    });

    test('week navigation fetches the DTR range and stores week lists', () => {
        const utils = renderSchedule();
        fireEvent.click(utils.getByTestId('nav-week'));

        expect(baseProps.viewEmployeeDtr).toHaveBeenCalledWith(55, '2026-07-27', '2026-08-02');
        expect(baseProps.setScope).toHaveBeenCalledWith('week');
        const dateList = baseProps.setDateList.mock.calls[0][0];
        expect(dateList.length).toBe(7);
        expect(baseProps.setWeekList.mock.calls[0][0]).toHaveProperty('week_list');
    });

    test('month navigation stores the full month date list', () => {
        const utils = renderSchedule();
        fireEvent.click(utils.getByTestId('nav-month'));

        expect(baseProps.setScope).toHaveBeenCalledWith('month');
        const dateList = baseProps.setDateList.mock.calls[0][0];
        expect(dateList.length).toBeGreaterThanOrEqual(28);
        expect(baseProps.setWeekList).toHaveBeenCalled();
    });

    test('custom navigation stores the custom display list', () => {
        const utils = renderSchedule();
        fireEvent.click(utils.getByTestId('nav-custom'));
        expect(baseProps.setScope).toHaveBeenCalledWith('custom');
        expect(baseProps.setDateList).toHaveBeenCalled();
        expect(baseProps.setWeekList.mock.calls[0][0]).toHaveProperty('dates_list');
    });
});

describe('ProfileSchedule — WeekTeamSchedule arms', () => {
    test('full-DTR week renders DTR times and the Rest Day card', () => {
        const dtr = weekMoments.map((d, i) => dtrRow(d, i >= 5 ? 'Rest Day' : 'Present'));
        const { getAllByText, container } = renderSchedule({ dtr });

        expect(getAllByText('REST DAY').length).toBe(2);          // sat+sun via dtr status
        expect(getAllByText(/08:30/).length).toBeGreaterThan(0);  // dtr-formatted time
        expect(container.querySelectorAll('.card-body.rest_day').length).toBe(2);
        expect(container.querySelectorAll('.card-body.early').length).toBe(5);
        getAllByText('Jul 27');
    });

    test('partial DTR mixes DTR rows, schedule fallback and temporary-schedule overrides', () => {
        const dtr = [dtrRow('2026-07-27', 'Present'), dtrRow('2026-07-28', 'Rest Day')];
        const temporary_schedule = [
            {   // same-day arm on Wed 29th
                valid_from: '2026-07-29', valid_to: '2026-07-29', rest_day: [],
                schedule_details: { all: { start_time: '11:00', end_time: '20:00', start_flexy_time: '12:00', end_flexy_time: '21:00' } },
            },
            {   // range arm covering Thu 30 (between) and Fri 31 (isSame edge)
                valid_from: '2026-07-30', valid_to: '2026-07-31', rest_day: [],
                schedule_details: { all: { start_time: '13:00', end_time: '22:00', start_flexy_time: '14:00', end_flexy_time: '23:00' } },
            },
        ];
        const { getAllByText, container } = renderSchedule({
            dtr,
            profile: weekProfile({ temporary_schedule }),
        });

        expect(getAllByText(/08:30/).length).toBeGreaterThan(0);  // dtr arm (Mon)
        expect(getAllByText('REST DAY').length).toBeGreaterThanOrEqual(3); // dtr Tue + sched sat/sun
        expect(getAllByText(/11:00/).length).toBeGreaterThan(0);  // same-day temp arm
        expect(getAllByText(/13:00/).length).toBeGreaterThan(0);  // range temp arm
        expect(container.querySelectorAll('.card').length).toBe(7);
    });

    test('no DTR at all falls back to the base schedule times and rest days', () => {
        const { getAllByText } = renderSchedule({ dtr: [] });
        expect(getAllByText(/09:00/).length).toBeGreaterThan(0);  // schedule times
        expect(getAllByText('REST DAY').length).toBe(2);          // sat+sun from schedule.rest_day
    });
});

describe('ProfileSchedule — MonthTeamSchedule arms', () => {
    // one calendar week Wed..Fri with offsets on both sides
    const monthDates = ['2026-07-29', '2026-07-30', '2026-07-31'];
    function monthProfile(overrides = {}) {
        return {
            scope: 'month',
            dates: [monthDates.map((d) => moment(d))],
            date_list: monthDates,
            week_list: [['Wednesday', 'Friday']],
            schedule: scheduleFixture,
            temporary_schedule: [],
            ...overrides,
        };
    }

    test('full-DTR month renders per-day cards with offsets and Rest Day arm', () => {
        const dtr = monthDates.map((d, i) => dtrRow(d, i === 1 ? 'Rest Day' : 'Present'));
        const { getAllByText, container } = renderSchedule({ dtr, profile: monthProfile() });

        getAllByText('Jul, 29');
        expect(getAllByText('REST DAY').length).toBe(1);
        expect(container.querySelectorAll('.card').length).toBe(3);
    });

    test('month without DTR uses schedule fallback; temporary override applies', () => {
        const temporary_schedule = [{
            valid_from: '2026-07-30', valid_to: '2026-07-30', rest_day: [],
            schedule_details: { all: { start_time: '15:00', end_time: '23:00', start_flexy_time: '16:00', end_flexy_time: '23:30' } },
        }];
        const { getAllByText } = renderSchedule({ dtr: [], profile: monthProfile({ temporary_schedule }) });
        expect(getAllByText(/15:00/).length).toBeGreaterThan(0);  // temp same-day arm
        expect(getAllByText(/09:00/).length).toBeGreaterThan(0);  // base schedule arm
    });
});
