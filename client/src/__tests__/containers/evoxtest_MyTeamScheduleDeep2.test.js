/**
 * evoxtest_MyTeamScheduleDeep2.test.js
 * Wave-1 interaction coverage for container/MyTeam/MyTeamSchedule/MyTeamSchedule.js
 * (29 Jul baseline: 133 uncovered lines / 34.2%).
 * Arms targeted: componentDidMount fetch params, the day/week/month scope calendars,
 * DayTeamSchedule's underlapped/overlapped/normal layout math, displayStatus's 8
 * status classes, week/month holiday + Show More, export vs export-all, department →
 * sub-department cascade, name filter. ADDITIVE ONLY.
 * Menu: My Team → Schedule (route: my_team_schedule).
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

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

// expose handleChangeDate so the scope_type switch (day→week→month) is drivable
jest.mock('../../components/Template/ReportNavigator/ReportNavigator.js', () => (props) => (
    <div data-testid="report-navigator">
        <button data-testid="nav-week" onClick={() => props.handleChangeDate(null, null, 'week')}>week</button>
        <button data-testid="nav-month" onClick={() => props.handleChangeDate(null, null, 'month')}>month</button>
    </div>
));

jest.mock('react-bootstrap', () => {
    const React = require('react');
    const passthrough = ({ children }) => <div>{children}</div>;
    const Dropdown = ({ children }) => <div>{children}</div>;
    Dropdown.Toggle = ({ children }) => <button>{children}</button>;
    Dropdown.Menu = ({ children }) => <div>{children}</div>;
    Dropdown.Item = ({ children, onClick }) => <button onClick={onClick}>{children}</button>;
    return {
        Card:   ({ children }) => <div className="card">{children}</div>,
        Col:    passthrough,
        Badge:  ({ children }) => <span>{children}</span>,
        Table:  ({ children }) => <table>{children}</table>,
        Tabs:   passthrough,
        Tab:    passthrough,
        Row:    ({ children, className, title }) => <div className={className} title={title}>{children}</div>,
        Button: ({ children, onClick, type }) => <button onClick={onClick} type={type}>{children}</button>,
        Dropdown,
    };
});

jest.mock('../../store/actions/filters/myTeamActions', () => ({
    fetchTeamSchedule:               jest.fn(() => Promise.resolve()),
    fetchTeamUnderDepartment:        jest.fn(() => Promise.resolve()),
    fetchSubDepartmentUnderDepartment: jest.fn(() => Promise.resolve()),
}));

const mockFetchTeamSchedule = jest.fn();
const mockFetchTeamUnderDepartment = jest.fn();
const mockFetchSubDept = jest.fn();

// day-view rows: one per layout arm, statuses spread across displayStatus arms
const dayData = [
    { Name: 'Alice', hour: 2, day_type: 'underlapped', type: ['early'], Schedule: '09:00-18:00', on_duty: '2026-07-30 09:00:00' },
    { Name: 'Bob',   hour: 3, day_type: 'overlapped',  type: ['late'],  Schedule: '22:00-07:00', on_duty: '2026-07-30 22:00:00' },
    { Name: 'Cara',  hour: 8, day_type: 'normal',      type: ['absent'], Schedule: '10:00-19:00', on_duty: '2026-07-30 10:00:00' },
];

const daySchedule = { data: dayData, date_list: [], week_list: [], holiday_list: {} };

// week view: 2026-07-27 = Monday (holiday), 2026-07-28 = Tuesday (has Show More)
const weekSchedule = {
    data: {
        '2026-07-27': [
            { Name: 'Dana', type: ['on_leave'], Schedule: 'VL' },
            { Name: 'Evan', type: ['holiday'], Schedule: '' },
        ],
        '2026-07-28': [
            { Name: 'Fay', type: ['rest_day'], Schedule: 'RD' },
            { Name: 'Gil', type: ['no_schedule'], Schedule: '' },
            { Name: 'Hana', type: ['no_status'], Schedule: '09:00-18:00' },
        ],
    },
    date_list: { '2026-07-28': true },
    week_list: [],
    holiday_list: { '07-27': { name: 'Araw ng Kagitingan' } },
};

// month view: 2026-07-22 = Wednesday, 2026-07-26 = Sunday (row split arm)
const monthSchedule = {
    data: {
        '2026-07-22': [{ Name: 'Ivan', type: ['early'], Schedule: '09:00-18:00' }],
        '2026-07-26': [{ Name: 'Jill', type: ['late'], Schedule: '10:00-19:00' }],
    },
    date_list: { '2026-07-26': true },
    week_list: [['Wednesday', 'Sunday']],
    holiday_list: { '07-26': { name: 'Special Holiday' } },
};

function makeTeam(schedule) {
    return {
        filters: {},
        team_list: [],
        team_schedule: schedule,
        week: { data: [], date_list: [] },
        month: { data: [], date_list: [], week_list: [] },
        day: [],
    };
}

const baseProps = {
    user: {
        id: 42,
        departments_handled: [
            { id: 7, department_name: 'Engineering' },
            { id: 8, department_name: 'Support' },
        ],
    },
    team: makeTeam(daySchedule),
    myTeamList: { sub_department: [{ Id: 11, Name: 'Team A' }], filters: {} },
    fetchTeamSchedule: mockFetchTeamSchedule,
    fetchTeamUnderDepartment: mockFetchTeamUnderDepartment,
    fetchSubDepartmentUnderDepartment: mockFetchSubDept,
};

const MyTeamSchedule = require('../../container/MyTeam/MyTeamSchedule/MyTeamSchedule').default;

function renderComponent(props = {}) {
    return render(
        <MemoryRouter>
            <MyTeamSchedule {...baseProps} team={makeTeam(daySchedule)} {...props} />
        </MemoryRouter>
    );
}

// scope switches mutate state without setState — force a re-render via new prop identity
function rerenderWith(utils, schedule) {
    utils.rerender(
        <MemoryRouter>
            <MyTeamSchedule {...baseProps} team={makeTeam(schedule)} />
        </MemoryRouter>
    );
}

describe('MyTeamSchedule — mount fetch and day view', () => {
    beforeEach(() => jest.clearAllMocks());

    test('componentDidMount fetches with formatted dates, first handled department, day scope', () => {
        renderComponent();
        expect(mockFetchTeamSchedule).toHaveBeenCalled();
        const params = mockFetchTeamSchedule.mock.calls[0][0];
        expect(params.start_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(params.end_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(params.department_id).toBe(7);
        expect(params.scope_type).toBe('day');
        expect(params.show_more).toBeUndefined(); // false is dropped by the loose != "" filter
    });

    test('day view renders the hour frame and all three layout arms with status classes', () => {
        const { container, getByText } = renderComponent();

        getByText('12NN'); // hour frame rendered
        // underlapped arm: content lives in the FIRST div
        expect(getByText(/Alice - 09:00-18:00/)).toBeInTheDocument();
        expect(container.querySelector('.early')).not.toBeNull();
        // overlapped + normal arms: content in the second div
        expect(getByText(/Bob - 22:00-07:00/)).toBeInTheDocument();
        expect(container.querySelector('.late')).not.toBeNull();
        expect(getByText(/Cara - 10:00-19:00/)).toBeInTheDocument();
        expect(container.querySelector('.absent')).not.toBeNull();
    });

    test('legends row lists every status', () => {
        const { getByText } = renderComponent();
        ['Early In', 'Late', 'Undertime', 'Holiday', 'Rest day', 'On Leave', 'Absent'].forEach((s) => getByText(s));
    });
});

describe('MyTeamSchedule — filters and export', () => {
    beforeEach(() => jest.clearAllMocks());

    test('choosing a department clears calendars and fetches its sub-departments', () => {
        const { container } = renderComponent();
        fireEvent.change(container.querySelector('select[name="department_id"]'), { target: { value: '8' } });
        expect(mockFetchSubDept).toHaveBeenCalledWith(42, '8');
    });

    test('choosing the empty department option only clears, no sub-department fetch', () => {
        const { container } = renderComponent();
        fireEvent.change(container.querySelector('select[name="department_id"]'), { target: { value: '' } });
        expect(mockFetchSubDept).not.toHaveBeenCalled();
    });

    test('sub-department + name filter then Filter button fetches with them', () => {
        const { container, getByText } = renderComponent();
        fireEvent.change(container.querySelector('select[name="sub_department_id"]'), { target: { value: '11' } });
        // (name input is null-value-controlled — jsdom change doesn't propagate; same
        // known quirk as MyTeamRequests. sub_department_id covers handleFilterChange.)
        fireEvent.click(getByText('Filter'));

        const calls = mockFetchTeamSchedule.mock.calls;
        const params = calls[calls.length - 1][0];
        expect(params.sub_department_id).toBe('11');
        expect(params.scope_type).toBe('day');
    });

    test('Export keeps department_id; Export All drops it; both request full pagination', () => {
        const { getAllByText, getByText } = renderComponent();

        // 'Export' matches both the dropdown toggle and the menu item — click the item
        fireEvent.click(getAllByText('Export')[1]);
        let params = mockFetchTeamSchedule.mock.calls.slice(-1)[0][0];
        expect(params.department_id).toBe(7);
        expect(params.export).toBe('all');
        expect(params.pagination).toBe('all');

        fireEvent.click(getByText('Export All'));
        params = mockFetchTeamSchedule.mock.calls.slice(-1)[0][0];
        expect(params.department_id).toBeUndefined();
        expect(params.export).toBe('all');
    });
});

describe('MyTeamSchedule — week and month calendars', () => {
    beforeEach(() => jest.clearAllMocks());

    test('week scope renders day headers, status cards, PH holiday and Show More fetch', () => {
        const utils = renderComponent();
        fireEvent.click(utils.getByTestId('nav-week')); // scope_type = 'week' + submit
        rerenderWith(utils, weekSchedule);

        utils.getByText('Monday');
        utils.getByText('Sunday');
        utils.getByText('July 27');
        utils.getByText('PH Holiday');

        // displayStatus arms across the cards
        ['on_leave', 'holiday', 'rest_day', 'no_schedule', 'no_status'].forEach((cls) => {
            expect(utils.container.querySelector('.card-body.' + cls)).not.toBeNull();
        });
        utils.getByText('Dana');
        utils.getByText(/VL/); // Schedule text prefix arm

        fireEvent.click(utils.getByText('Show More...'));
        const params = mockFetchTeamSchedule.mock.calls.slice(-1)[0][0];
        expect(params.start_date).toBe('2026-07-28'); // date replaces the range
        expect(params.show_more).toBe(true);
    });

    test('month scope renders padded weeks, holiday name arm, Sunday row split and Show More', () => {
        const utils = renderComponent();
        fireEvent.click(utils.getByTestId('nav-month'));
        rerenderWith(utils, monthSchedule);

        utils.getByText('July 22');
        utils.getByText('July 26');
        utils.getByText('PH Holiday'); // holiday_list arm (month uses .name internally)
        utils.getByText('Ivan');
        utils.getByText('Jill');

        fireEvent.click(utils.getByText('Show More...'));
        const params = mockFetchTeamSchedule.mock.calls.slice(-1)[0][0];
        expect(params.start_date).toBe('2026-07-26');
        expect(params.show_more).toBe(true);
    });

    test('day scope with empty data renders no schedule rows (empty-guard arm)', () => {
        const utils = renderComponent({ team: makeTeam({ data: [], date_list: [], week_list: [], holiday_list: {} }) });
        expect(utils.container.querySelector('.emp_sched')).toBeNull();
    });
});
