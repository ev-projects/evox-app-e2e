/**
 * MyTeamScheduleLifecycle.test.js
 *
 * SOURCE FILES UNDER TEST
 *   1. container/MyTeam/MyTeamSchedule/MyTeamSchedule.js   Menu: My Team -> My Team Schedule
 *   2. container/MyTeam/ManageTeams/ManageTeams.js         Menu: My Team -> Manage Teams
 *
 * 29-JUL COVERAGE BASELINE
 *   Both files were 0% covered on the 29-Jul master run (no suite referenced either
 *   container). 199 uncovered lines combined - the whole schedule grid (day / week /
 *   month / custom renderers + displayStatus), the department -> sub-department filter
 *   cascade, the export builder, and the entire Manage Teams create/update/delete CRUD.
 *
 * WHAT IS EXERCISED
 *   PHASE 1  MOUNT      constructor default filter object, componentDidMount fetch payload,
 *                       the "no department handled" arm, restored filters from the store
 *   PHASE 2  FILTERS    department select (cascade + the clear arm), sub-department select,
 *                       name box, Filter button, paginate, export / export-all
 *   PHASE 3  GRID       day / week / month / custom / unknown scope renderers, displayStatus
 *                       class precedence, Show More wiring, holiday markers, empty arms
 *   PHASE 4  TEAMS CRUD Manage Teams mount lookups, action-type radio reset, team select
 *                       guard, department cascade, create + update + delete, confirm-cancel
 *                       arm, Yup validation rejection arm
 *
 * FINDINGS (characterised, NOT fixed - every one asserts today's behaviour)
 *   MTS-PROPMUT-1  the constructor assigns `this.props.team.filters = this.initialState.filters`
 *                  and `this.state` to the SAME object, so component state and the redux
 *                  props object are aliased - writing state writes straight into props.
 *   MTS-SHOWMORE-1 `show_more:false` is silently dropped from every request payload: the
 *                  builder's `value != ""` guard is loose, and `false == ""` in JS.
 *   MTS-PAGE-NAN-1 paginate() before any view change sends `page: NaN` - `this.state.page`
 *                  is never initialised in the constructor and `undefined + 1` is NaN.
 *   MTS-SCOPE-1    handleChangeDate writes this.state.scope_type by direct mutation with no
 *                  setState, so the grid keeps rendering the OLD view until some unrelated
 *                  setState happens to repaint it.
 *   MTS-CLEAR-1    clearState() blanks `team.week` / `team.month` / `team.day`, but the
 *                  reducer stores the grid under `team.team_schedule` - stale rows survive
 *                  every filter change.
 *   MTS-DEPT-CLEAR-1 choosing the blank "Select Department" option cannot clear the filter:
 *                  the `department_id != ''` guard skips the assignment entirely.
 *   MTS-HOLIDAY-1  the week renderer indexes holiday_list unconditionally; the daily reducer
 *                  arm never sets holiday_list, so switching to week after a day fetch throws.
 *   MTS-MONTHHOL-1 the month renderer builds a `holiday = "(name)"` string and then never
 *                  uses it - the cell always shows the hardcoded "PH Holiday".
 *   MTS-MONTHEMPTY-1 the month grid renders completely empty when week_list is missing, even
 *                  though data rows were returned.
 *   MTS-DEBUG-1    WeekTeamSchedule ships a `console.log(holiday_list)` on every repaint.
 *   MTS-NAMEINPUT-1 the name box is `<input type="textfield">`, not a valid HTML input type.
 *                  React only routes onChange for whitelisted text types, so the filter
 *                  works only where the host normalises the unknown type back to "text";
 *                  on a literal reflection the value changes and onChange never fires.
 *   MT-UNKNOWN-1   Manage Teams re-fetches the teams-handled list after a submit whose
 *                  action_type matched neither "store" nor "update" - a no-op round trip.
 *   MT-RESET-1     componentDidUpdate wipes selectedTeam/department/name/leaders/users the
 *                  moment the action-type radio changes, so any work in progress is lost.
 *   MT-TEAMID-0    handleSelectTeam rejects team id "0" because Validator.isValid() treats
 *                  every numeric zero as empty - a team with id 0 could never be edited.
 *
 * ADDITIVE ONLY - no existing test file and no application source was modified.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import moment from 'moment';

/* ------------------------------------------------------------------ mocks */

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
}));

jest.mock('../../components/GridComponent/AdminLte.js', () => {
    const R = require('react');
    return {
        ContainerHeader:  ({ children }) => R.createElement('div', null, children),
        Content:          ({ children }) => R.createElement('div', null, children),
        ContainerWrapper: ({ children }) => R.createElement('div', null, children),
        ContainerBody:    ({ children }) => R.createElement('div', null, children),
        Row:              ({ children }) => R.createElement('div', null, children),
        Col:              ({ children }) => R.createElement('div', null, children),
    };
});

jest.mock('../../components/Template/Wrapper',
    () => ({ children }) => <div data-testid="wrapper">{children}</div>);

jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading" />);

jest.mock('react-multi-select-component',
    () => (props) => <div data-testid={'multi-select-' + (props.name || 'x')} />);

// The date navigator drags in react-datepicker; replace it with buttons that call the
// real handleChangeDate contract (start_date, end_date, scope_type).
jest.mock('../../components/Template/ReportNavigator/ReportNavigator.js', () => {
    const R = require('react');
    return (props) => R.createElement('div', { 'data-testid': 'report-navigator' },
        ['day', 'week', 'month', 'custom'].map((type) => R.createElement('button', {
            key: type,
            type: 'button',
            'data-testid': 'nav-' + type,
            onClick: () => props.handleChangeDate(props.start_date, props.end_date, type),
        }, type)));
});

jest.mock('react-bootstrap', () => {
    const R = require('react');
    const passthrough = (tag) => ({ children, className, title }) =>
        R.createElement(tag, { className, title }, children);

    const Button = ({ children, onClick, type, className }) =>
        R.createElement('button', { type: type || 'button', onClick, className }, children);

    const Dropdown = ({ children }) => R.createElement('div', { 'data-testid': 'dropdown' }, children);
    Dropdown.Toggle = ({ children }) => R.createElement('button', { type: 'button' }, children);
    Dropdown.Menu   = ({ children }) => R.createElement('div', null, children);
    Dropdown.Item   = ({ children, onClick }) =>
        R.createElement('button', { type: 'button', onClick, 'data-testid': 'dropdown-item' }, children);

    const Form = ({ children }) => R.createElement('div', null, children);
    Form.Group = ({ children }) => R.createElement('div', null, children);
    const FormControlNS = ({ children }) => R.createElement('div', null, children);
    FormControlNS.Feedback = ({ children }) => R.createElement('div', null, children);
    Form.Control = FormControlNS;

    return {
        Card:        passthrough('div'),
        Row:         passthrough('div'),
        Col:         passthrough('div'),
        Table:       passthrough('table'),
        Badge:       passthrough('span'),
        Tabs:        passthrough('div'),
        Tab:         () => null,
        InputGroup:  passthrough('div'),
        FormControl: (p) => R.createElement('input', { name: p.name, onChange: p.onChange }),
        Button,
        Dropdown,
        Form,
    };
});

// Action creators are never invoked (connect is a passthrough) but the modules pull in
// axios; stub them so nothing can reach the network.
jest.mock('../../store/actions/filters/myTeamActions', () => ({
    fetchTeamSchedule: jest.fn(),
    fetchTeamUnderDepartment: jest.fn(),
    fetchSubDepartmentUnderDepartment: jest.fn(),
}));
jest.mock('../../store/actions/lookup/lookupListActions', () => ({
    fetchUserList: jest.fn(),
    fetchTeamsHandledList: jest.fn(),
    fetchDepartmentUsersList: jest.fn(),
    fetchTeam: jest.fn(),
}));
jest.mock('../../store/actions/team/teamActions', () => ({
    createTeam: jest.fn(), updateTeam: jest.fn(), deleteTeam: jest.fn(),
}));
jest.mock('../../store/actions/redirectActions', () => ({
    setRedirect: jest.fn(), clearRedirect: jest.fn(),
}));

global.links = new Proxy({}, { get: () => '/x/' });

const MyTeamSchedule =
    require('../../container/MyTeam/MyTeamSchedule/MyTeamSchedule').default;
const ManageTeams =
    require('../../container/MyTeam/ManageTeams/ManageTeams').default;

/* ------------------------------------------------------------------ helpers */

const TODAY = moment().format('YYYY-MM-DD');

const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

const typeInto = (el, value) => {
    const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, value);
    fireEvent.change(el);
};

const btn = (container, label) =>
    Array.from(container.querySelectorAll('button'))
        .find((b) => b.textContent.indexOf(label) !== -1);

const lastArgs = (spy) => spy.mock.calls[spy.mock.calls.length - 1];

/* ---------------------------------------------------- MyTeamSchedule fixtures */

const emptyGrid = () => ({ data: [], date_list: [], week_list: [], holiday_list: [] });

const schedProps = (over = {}) => ({
    user: {
        id: 7,
        departments_handled: [
            { id: 3, department_name: 'Information Technology' },
            { id: 4, department_name: 'Human Resources' },
        ],
    },
    team: { team_list: [], team_schedule: emptyGrid(), filters: {} },
    myTeamList: { sub_department: [], filters: {} },
    fetchTeamSchedule: jest.fn(),
    fetchTeamUnderDepartment: jest.fn(),
    fetchSubDepartmentUnderDepartment: jest.fn(),
    ...over,
});

const renderSchedule = (props) => {
    const ref = React.createRef();
    const view = render(
        <MemoryRouter><MyTeamSchedule {...props} ref={ref} /></MemoryRouter>
    );
    return { ...view, ref };
};

const dayRow = (over = {}) => ({
    Name: 'Ana Cruz',
    type: ['late'],
    Schedule: '09:00-18:00',
    day_type: 'underlapped',
    hour: 8,
    on_duty: '2026-07-13T09:30:00',
    ...over,
});

/* ================================================================== */
describe('My Team Schedule - mount and the request payload builder', () => {

    it('fetches today as a single day for the first handled department on mount', () => {
        const props = schedProps();
        renderSchedule(props);

        expect(props.fetchTeamSchedule).toHaveBeenCalledTimes(1);
        expect(props.fetchTeamSchedule).toHaveBeenCalledWith({
            start_date: TODAY,
            end_date: TODAY,
            department_id: 3,
            scope_type: 'day',
        });
    });

    // FINDING MTS-SHOWMORE-1: show_more is initialised to boolean false, and the payload
    // builder skips any value failing `value != ""`. In JS `false == ""` is true, so the
    // flag never reaches the API on a normal load. The server therefore relies on the key
    // being ABSENT rather than false - a silent contract only this coercion keeps alive.
    it('drops the show_more flag from the payload because false loosely equals empty string _FINDING_MTS-SHOWMORE-1', () => {
        const props = schedProps();
        renderSchedule(props);

        expect(Object.keys(props.fetchTeamSchedule.mock.calls[0][0]))
            .not.toContain('show_more');
    });

    it('omits department_id entirely when the supervisor handles no department', () => {
        const props = schedProps({ user: { id: 7, departments_handled: [] } });
        renderSchedule(props);

        const payload = props.fetchTeamSchedule.mock.calls[0][0];
        expect(payload).not.toHaveProperty('department_id');
        expect(payload.scope_type).toBe('day');
    });

    it('restores the name and team_id filters that the store had kept from the last visit', () => {
        const props = schedProps({
            team: {
                team_list: [], team_schedule: emptyGrid(),
                filters: { name: 'cruz', team_id: 12 },
            },
        });
        renderSchedule(props);

        const payload = props.fetchTeamSchedule.mock.calls[0][0];
        expect(payload.name).toBe('cruz');
        expect(payload.team_id).toBe(12);
    });

    it('seeds sub_department_id from the myTeamList slice, not from the team slice', () => {
        const props = schedProps({
            myTeamList: { sub_department: [], filters: { sub_department_id: 21 } },
        });
        renderSchedule(props);

        expect(props.fetchTeamSchedule.mock.calls[0][0].sub_department_id).toBe(21);
    });

    // FINDING MTS-PROPMUT-1: the constructor stores ONE object in two places -
    // `this.state` and `this.props.team.filters`. The component's state and the redux
    // props object are the same reference, so any direct mutation of state (and this
    // component does several) rewrites props behind redux's back.
    it('aliases component state onto the redux props object so state writes leak into props _FINDING_MTS-PROPMUT-1', () => {
        const props = schedProps();
        const { ref } = renderSchedule(props);

        expect(props.team.filters).toBe(ref.current.state);
        expect(props.team.filters.scope_type).toBe('day');

        act(() => { ref.current.handleSelectDepartment('4'); });
        expect(props.team.filters.department_id).toBe('4');
    });
});

/* ================================================================== */
describe('My Team Schedule - department / team / name filter cascade', () => {

    it('renders a placeholder plus one option per handled department', () => {
        const { container } = renderSchedule(schedProps());
        const select = container.querySelector('select[name="department_id"]');

        expect(select.querySelectorAll('option')).toHaveLength(3);
        expect(select.querySelectorAll('option')[1]).toHaveAttribute('label', 'Information Technology');
        expect(select.querySelectorAll('option')[2]).toHaveAttribute('label', 'Human Resources');
    });

    it('picking a department loads that department\'s teams and does NOT refetch the grid', () => {
        const props = schedProps();
        const { container } = renderSchedule(props);
        props.fetchTeamSchedule.mockClear();

        fireEvent.change(container.querySelector('select[name="department_id"]'),
            { target: { value: '4' } });

        expect(props.fetchSubDepartmentUnderDepartment).toHaveBeenCalledWith(7, '4');
        expect(props.fetchTeamSchedule).not.toHaveBeenCalled();
    });

    // FINDING MTS-DEPT-CLEAR-1: the blank option exists in the markup, but
    // handleSelectDepartment only assigns when `department_id != ''`. Selecting
    // "Select Department" therefore clears the grid and leaves the previous department
    // still applied to the very next Filter click.
    it('choosing the blank department option cannot clear the applied department _FINDING_MTS-DEPT-CLEAR-1', () => {
        const props = schedProps();
        const { container, ref } = renderSchedule(props);
        props.fetchTeamSchedule.mockClear();

        fireEvent.change(container.querySelector('select[name="department_id"]'),
            { target: { value: '' } });

        expect(props.fetchSubDepartmentUnderDepartment).not.toHaveBeenCalled();
        expect(ref.current.state.department_id).toBe(3);

        act(() => { ref.current.filterSchedule(); });
        expect(lastArgs(props.fetchTeamSchedule)[0].department_id).toBe(3);
    });

    it('renders the sub-department options supplied by the store', () => {
        const props = schedProps({
            myTeamList: {
                sub_department: [{ Id: 21, Name: 'Backend Pod' }, { Id: 22, Name: 'QA Pod' }],
                filters: {},
            },
        });
        const { container } = renderSchedule(props);
        const options = container.querySelectorAll('select[name="sub_department_id"] option');

        expect(options).toHaveLength(3);
        expect(options[1]).toHaveAttribute('label', 'Backend Pod');
    });

    it('renders only the placeholder when the department has no sub-departments', () => {
        const { container } = renderSchedule(schedProps());
        expect(container.querySelectorAll('select[name="sub_department_id"] option'))
            .toHaveLength(1);
    });

    it('choosing a sub-department stores it and the Filter button sends it', () => {
        const props = schedProps({
            myTeamList: { sub_department: [{ Id: 21, Name: 'Backend Pod' }], filters: {} },
        });
        const { container } = renderSchedule(props);
        props.fetchTeamSchedule.mockClear();

        fireEvent.change(container.querySelector('select[name="sub_department_id"]'),
            { target: { value: '21' } });
        fireEvent.click(btn(container, 'Filter'));

        expect(lastArgs(props.fetchTeamSchedule)[0].sub_department_id).toBe('21');
    });

    it('a typed name is applied on Filter and an emptied box drops the key from the payload', () => {
        const props = schedProps();
        const { container, ref } = renderSchedule(props);
        const nameBox = container.querySelector('input[name="name"]');

        act(() => {
            ref.current.handleFilterChange({ target: { name: 'name', value: 'cruz' } });
        });
        fireEvent.click(btn(container, 'Filter'));
        expect(lastArgs(props.fetchTeamSchedule)[0].name).toBe('cruz');
        expect(nameBox.value).toBe('cruz');   // the box is a controlled field once populated

        act(() => {
            ref.current.handleFilterChange({ target: { name: 'name', value: '' } });
        });
        fireEvent.click(btn(container, 'Filter'));
        expect(lastArgs(props.fetchTeamSchedule)[0]).not.toHaveProperty('name');
    });

    // FINDING MTS-NAMEINPUT-1: "textfield" is not a valid HTML input type. React's change
    // plugin only treats an <input> as a text field when elem.type is one of its whitelisted
    // types, so the box only works where the host normalises an unknown type back to "text".
    // Under a literal type reflection the value changes but onChange is never delivered and
    // the filter silently does nothing - proven here: the DOM value becomes "cruz" while the
    // component state and the resulting request payload stay empty.
    it('renders the name box with the invalid type "textfield" so its change event is never delivered _FINDING_MTS-NAMEINPUT-1', () => {
        const props = schedProps();
        const { container, ref } = renderSchedule(props);
        const nameBox = container.querySelector('input[name="name"]');

        expect(nameBox).toHaveAttribute('type', 'textfield');
        expect(nameBox.type).toBe('textfield');   // not normalised to "text" here

        typeInto(nameBox, 'cruz');

        expect(nameBox.value).toBe('cruz');
        expect(ref.current.state.name).toBeNull();

        fireEvent.click(btn(container, 'Filter'));
        expect(lastArgs(props.fetchTeamSchedule)[0]).not.toHaveProperty('name');
    });

    // FINDING MTS-CLEAR-1: clearState() blanks team.week / team.month / team.day, but the
    // reducer keeps the grid in team.team_schedule. The three keys it writes do not exist
    // in the store shape at all, so the previous department's rows stay on screen while
    // the new request is still in flight.
    it('clearing the grid writes three keys the reducer does not use and leaves the rows on screen _FINDING_MTS-CLEAR-1', () => {
        const grid = { data: [dayRow()], date_list: [], week_list: [], holiday_list: [] };
        const props = schedProps({
            team: { team_list: [], team_schedule: grid, filters: {} },
        });
        const { container, ref } = renderSchedule(props);

        act(() => { ref.current.clearState(); });

        expect(props.team.week).toEqual({ data: [], date_list: [] });
        expect(props.team.month).toEqual({ data: [], date_list: [], week_list: [] });
        expect(props.team.day).toEqual([]);
        expect(props.team.team_schedule.data).toHaveLength(1);
        expect(container.querySelector('.emp_sched')).not.toBeNull();
    });
});

/* ================================================================== */
describe('My Team Schedule - navigation, pagination and export', () => {

    // FINDING MTS-SCOPE-1: handleChangeDate assigns this.state.scope_type directly instead
    // of calling setState. The fetch goes out with the new scope, but React is never told
    // to repaint, so the user keeps staring at the previous view until an unrelated
    // setState (here: typing in the name box) happens to flush the pending value.
    it('switching to the week view fetches week data but keeps painting the day view _FINDING_MTS-SCOPE-1', () => {
        const props = schedProps({
            myTeamList: { sub_department: [{ Id: 21, Name: 'Backend Pod' }], filters: {} },
        });
        const { container, getByTestId, queryByText, ref } = renderSchedule(props);
        props.fetchTeamSchedule.mockClear();

        fireEvent.click(getByTestId('nav-week'));

        expect(lastArgs(props.fetchTeamSchedule)[0].scope_type).toBe('week');
        expect(ref.current.state.scope_type).toBe('week');
        expect(queryByText('Wednesday')).toBeNull();   // week header still absent

        // any unrelated setState finally flushes the pending view type to the DOM
        fireEvent.change(container.querySelector('select[name="sub_department_id"]'),
            { target: { value: '21' } });
        expect(queryByText('Wednesday')).not.toBeNull();
    });

    it('every view switch resets the page back to the first page', () => {
        const props = schedProps();
        const { getByTestId } = renderSchedule(props);

        fireEvent.click(getByTestId('nav-month'));
        expect(lastArgs(props.fetchTeamSchedule)[0].page).toBe(1);
        expect(lastArgs(props.fetchTeamSchedule)[0].scope_type).toBe('month');
    });

    // FINDING MTS-PAGE-NAN-1: `page` is missing from the constructor's filter object, so
    // the first paginate() computes `undefined + 1` = NaN and ships `page: NaN`. NaN
    // survives the payload builder because NaN != null and NaN != "" are both true.
    it('paginating before any view change requests page NaN _FINDING_MTS-PAGE-NAN-1', () => {
        const props = schedProps();
        const { ref } = renderSchedule(props);
        props.fetchTeamSchedule.mockClear();

        act(() => { ref.current.paginate(); });

        expect(Number.isNaN(lastArgs(props.fetchTeamSchedule)[0].page)).toBe(true);
    });

    it('paginating after a view change advances from page 1 to page 2', () => {
        const props = schedProps();
        const { getByTestId, ref } = renderSchedule(props);

        fireEvent.click(getByTestId('nav-day'));
        act(() => { ref.current.paginate(); });

        expect(lastArgs(props.fetchTeamSchedule)[0].page).toBe(2);
    });

    it('Export keeps the department filter and asks for the unpaginated set', () => {
        const props = schedProps();
        const { getAllByTestId } = renderSchedule(props);
        props.fetchTeamSchedule.mockClear();

        const items = getAllByTestId('dropdown-item');
        expect(items[0]).toHaveTextContent('Export');
        expect(items[1]).toHaveTextContent('Export All');

        fireEvent.click(items[0]);

        const payload = lastArgs(props.fetchTeamSchedule)[0];
        expect(payload.department_id).toBe(3);
        expect(payload.pagination).toBe('all');
        expect(payload.export).toBe('all');
    });

    it('Export All strips the department filter so every handled department is included', () => {
        const props = schedProps();
        const { getAllByTestId } = renderSchedule(props);
        props.fetchTeamSchedule.mockClear();

        fireEvent.click(getAllByTestId('dropdown-item')[1]);

        const payload = lastArgs(props.fetchTeamSchedule)[0];
        expect(payload).not.toHaveProperty('department_id');
        expect(payload.export).toBe('all');
    });

    it('Show More re-requests a single date with both range ends pinned to it', () => {
        const props = schedProps();
        const { ref } = renderSchedule(props);
        props.fetchTeamSchedule.mockClear();

        act(() => { ref.current.showMoreSchedule('2026-07-13'); });

        const payload = lastArgs(props.fetchTeamSchedule)[0];
        expect(payload.start_date).toBe('2026-07-13');
        expect(payload.end_date).toBe('2026-07-13');
        expect(payload.show_more).toBe(true);
        expect(payload.scope_type).toBe('day');
    });
});

/* ================================================================== */
describe('My Team Schedule - the day grid', () => {

    const renderDay = (rows, over = {}) => {
        const grid = { data: rows, date_list: [], week_list: [], holiday_list: [], ...over };
        return renderSchedule(schedProps({
            team: { team_list: [], team_schedule: grid, filters: {} },
        }));
    };

    it('draws the 24-hour ruler and one bar per employee once rows exist', () => {
        const { container, getByText } = renderDay([dayRow(), dayRow({ Name: 'Ben Reyes' })]);

        expect(getByText('12NN')).toBeInTheDocument();
        expect(container.querySelectorAll('.emp_sched')).toHaveLength(2);
    });

    it('draws nothing at all when the day returned no rows', () => {
        const { container, queryByText } = renderDay([]);
        expect(queryByText('12NN')).toBeNull();
        expect(container.querySelectorAll('.emp_sched')).toHaveLength(0);
    });

    it('suppresses the whole day grid when the payload also carries a date_list', () => {
        const { container, queryByText } = renderDay([dayRow()], { date_list: ['2026-07-13'] });
        expect(queryByText('12NN')).toBeNull();
        expect(container.querySelectorAll('.emp_sched')).toHaveLength(0);
    });

    it('an underlapped shift paints the label on the LEFT block sized hour x 4 percent', () => {
        const { container } = renderDay([dayRow({ day_type: 'underlapped', hour: 8 })]);
        const row = container.querySelector('.emp_sched');
        const [left, right] = row.querySelectorAll('div');

        expect(left).toHaveTextContent('Ana Cruz - 09:00-18:00');
        expect(left).toHaveClass('late');
        expect(left.style.width).toBe('32%');
        expect(right.textContent).toBe('');
        expect(row).toHaveAttribute('title', '');
    });

    it('an overlapped shift paints the label on the RIGHT block and offsets it by (25 - hour) x 4', () => {
        const { container } = renderDay([dayRow({ day_type: 'overlapped', hour: 5 })]);
        const row = container.querySelector('.emp_sched');
        const [left, right] = row.querySelectorAll('div');

        expect(left.textContent).toBe('');
        expect(left.style.width).toBe('80%');
        expect(right).toHaveTextContent('Ana Cruz - 09:00-18:00');
        expect(right.style.width).toBe('20%');
        expect(row).toHaveAttribute('title', 'Ana Cruz - 09:00-18:00 ');
    });

    it('a normal shift offsets the bar by the on_duty clock time, minutes included', () => {
        // 09:30 -> (9 + 30/60) * 4 = 38% left spacer, then hour(8) * 4 = 32% of colour.
        const { container } = renderDay([dayRow({ day_type: 'normal', hour: 8 })]);
        const [left, right] = container.querySelector('.emp_sched').querySelectorAll('div');

        expect(left.style.width).toBe('38%');
        expect(right.style.width).toBe('32%');
        expect(right).toHaveTextContent('Ana Cruz - 09:00-18:00');
    });

    it('status classes follow a fixed precedence - early beats late when both are present', () => {
        const { container } = renderDay([
            dayRow({ Name: 'Early Elle', type: ['late', 'early'], day_type: 'overlapped', hour: 5 }),
        ]);
        const right = container.querySelector('.emp_sched').querySelectorAll('div')[1];
        expect(right).toHaveClass('early');
        expect(right).not.toHaveClass('late');
    });

    it('maps each supported status token to its own colour class', () => {
        const tokens = ['on_leave', 'holiday', 'rest_day', 'absent', 'no_schedule', 'no_status'];
        tokens.forEach((token) => {
            const { container, unmount } = renderDay([
                dayRow({ Name: 'X ' + token, type: [token], day_type: 'overlapped', hour: 5 }),
            ]);
            expect(container.querySelector('.emp_sched').querySelectorAll('div')[1])
                .toHaveClass(token);
            unmount();
        });
    });

    it('an empty Schedule string still renders the employee name and the separator', () => {
        const { container } = renderDay([
            dayRow({ Schedule: '', day_type: 'overlapped', hour: 5 }),
        ]);
        expect(container.querySelector('.emp_sched'))
            .toHaveAttribute('title', 'Ana Cruz - ');
    });
});

/* ================================================================== */
describe('My Team Schedule - the week grid', () => {

    const weekGrid = (over = {}) => ({
        data: {
            '2026-07-13': [{ Name: 'Ana Cruz', type: ['late'], Schedule: '09:00-18:00' }],
            '2026-07-14': [
                { Name: 'Ben Reyes', type: ['early'], Schedule: '08:00-17:00' },
                { Name: 'Cara Lim', type: ['absent'], Schedule: '' },
            ],
        },
        date_list: { '2026-07-13': true, '2026-07-14': false },
        week_list: [],
        holiday_list: { '07-14': { name: 'Independence Day' } },
        ...over,
    });

    const renderWeek = (grid) => {
        const props = schedProps({
            team: { team_list: [], team_schedule: grid, filters: {} },
        });
        const view = renderSchedule(props);
        act(() => { view.ref.current.setState({ scope_type: 'week' }); });
        return { ...view, props };
    };

    it('lays out the seven weekday headers and one column per returned date', () => {
        const { container, getByText } = renderWeek(weekGrid());

        expect(getByText('Monday')).toBeInTheDocument();
        expect(getByText('Sunday')).toBeInTheDocument();
        expect(getByText(/July 13/)).toBeInTheDocument();
        expect(getByText(/July 14/)).toBeInTheDocument();
        expect(container.querySelectorAll('.schedule-col')).toHaveLength(2);
    });

    it('renders one card per employee on a date and colours it by status', () => {
        const { container, getByText } = renderWeek(weekGrid());

        expect(container.querySelectorAll('.card-body')).toHaveLength(3);
        expect(getByText('Ana Cruz').closest('.card-body')).toHaveClass('late');
        expect(getByText('Cara Lim').closest('.card-body')).toHaveClass('absent');
    });

    it('flags a public holiday on the matching MM-DD only', () => {
        const { container } = renderWeek(weekGrid());
        expect(container.querySelectorAll('.schedule-holiday')).toHaveLength(1);
    });

    it('offers Show More only for dates the API marked as truncated', () => {
        const { container } = renderWeek(weekGrid());
        expect(container.querySelectorAll('a')).toHaveLength(1);
    });

    it('Show More re-requests exactly the truncated date with show_more set', () => {
        const { container, props } = renderWeek(weekGrid());
        props.fetchTeamSchedule.mockClear();

        fireEvent.click(container.querySelector('a'));

        const payload = lastArgs(props.fetchTeamSchedule)[0];
        expect(payload.start_date).toBe('2026-07-13');
        expect(payload.end_date).toBe('2026-07-13');
        expect(payload.show_more).toBe(true);
        expect(payload.scope_type).toBe('week');
    });

    it('renders an empty week without cards when the range returned no dates', () => {
        const { container } = renderWeek(weekGrid({ data: {}, date_list: {} }));
        expect(container.querySelectorAll('.schedule-col')).toHaveLength(0);
        expect(container.querySelectorAll('.card-body')).toHaveLength(0);
    });

    // FINDING MTS-DEBUG-1: a raw console.log(holiday_list) is left in the week renderer and
    // fires on every repaint of the busiest supervisor screen.
    it('logs the holiday list to the browser console on every repaint _FINDING_MTS-DEBUG-1', () => {
        const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
        renderWeek(weekGrid());
        expect(spy).toHaveBeenCalledWith({ '07-14': { name: 'Independence Day' } });
        spy.mockRestore();
    });

    // FINDING MTS-HOLIDAY-1: FETCH_DAILY_TEAM_SCHEDULE_SUCCESS rebuilds team_schedule with
    // only { data, date_list, week_list } - holiday_list is dropped. The week renderer then
    // indexes it unconditionally and the whole page dies with a TypeError.
    it('crashes when the week view repaints a payload the daily reducer left without holiday_list _FINDING_MTS-HOLIDAY-1', () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const grid = weekGrid();
        delete grid.holiday_list;

        const props = schedProps({
            team: { team_list: [], team_schedule: grid, filters: {} },
        });
        const { ref } = renderSchedule(props);

        expect(() => {
            act(() => { ref.current.setState({ scope_type: 'week' }); });
        }).toThrow(TypeError);

        logSpy.mockRestore();
        errorSpy.mockRestore();
    });
});

/* ================================================================== */
describe('My Team Schedule - the month / custom grid', () => {

    const monthGrid = (over = {}) => ({
        data: {
            '2026-07-13': [{ Name: 'Ana Cruz', type: ['late'], Schedule: '09:00-18:00' }],
            '2026-07-19': [{ Name: 'Ben Reyes', type: ['rest_day'], Schedule: '' }],
        },
        date_list: { '2026-07-13': false, '2026-07-19': true },
        week_list: [['Monday', 'Sunday']],
        holiday_list: { '07-13': { name: 'Independence Day' } },
        ...over,
    });

    const renderMonth = (grid, scope = 'month') => {
        const props = schedProps({
            team: { team_list: [], team_schedule: grid, filters: {} },
        });
        const view = renderSchedule(props);
        act(() => { view.ref.current.setState({ scope_type: scope }); });
        return { ...view, props };
    };

    it('renders one calendar cell per returned date under the weekday header row', () => {
        const { container, getByText } = renderMonth(monthGrid());

        expect(getByText('Monday')).toBeInTheDocument();
        expect(getByText(/July 13/)).toBeInTheDocument();
        expect(getByText(/July 19/)).toBeInTheDocument();
        expect(container.querySelectorAll('.employee_list')).toHaveLength(2);
    });

    it('pads the calendar with blank cells before the first and after the last weekday', () => {
        // Wednesday(2) leading blanks, Friday(4) -> 6..5 trailing blanks = 4 empty cells.
        const { container } = renderMonth(monthGrid({ week_list: [['Wednesday', 'Friday']] }));
        const blanks = Array.from(container.querySelectorAll('.schedule-col'))
            .filter((el) => el.children.length === 0);

        expect(blanks).toHaveLength(4);
    });

    // FINDING MTS-MONTHHOL-1: the renderer builds `holiday = "(" + name + ")"` and then
    // never reads the variable. The cell always shows the hardcoded "PH Holiday", so the
    // actual holiday name the API returned is thrown away.
    it('discards the holiday name it just formatted and prints the hardcoded label _FINDING_MTS-MONTHHOL-1', () => {
        const { container, queryByText } = renderMonth(monthGrid());

        expect(container.querySelectorAll('.schedule-holiday')).toHaveLength(1);
        expect(container.querySelector('.schedule-holiday')).toHaveTextContent('PH Holiday');
        expect(queryByText(/Independence Day/)).toBeNull();
    });

    it('offers Show More only on the month dates the API marked as truncated', () => {
        const { container, props } = renderMonth(monthGrid());
        props.fetchTeamSchedule.mockClear();

        const links = container.querySelectorAll('a');
        expect(links).toHaveLength(1);

        fireEvent.click(links[0]);
        expect(lastArgs(props.fetchTeamSchedule)[0].start_date).toBe('2026-07-19');
    });

    // FINDING MTS-MONTHEMPTY-1: everything the month renderer does is nested inside
    // `if (week_list.length > 0)`. A payload with rows but no week_list - exactly what the
    // daily and weekly reducer arms produce - renders a blank calendar with no error.
    it('renders a blank calendar when rows arrive without a week_list _FINDING_MTS-MONTHEMPTY-1', () => {
        const { container } = renderMonth(monthGrid({ week_list: [] }));

        expect(container.querySelectorAll('.schedule-date')).toHaveLength(0);
        expect(container.querySelectorAll('.emp_sched')).toHaveLength(1);
    });

    it('the custom range view reuses the month calendar renderer', () => {
        const { getByText } = renderMonth(monthGrid(), 'custom');
        expect(getByText(/July 13/)).toBeInTheDocument();
    });

    it('an unrecognised scope type falls through to the literal "Neither" placeholder', () => {
        const view = renderSchedule(schedProps());
        act(() => { view.ref.current.setState({ scope_type: 'quarter' }); });
        expect(view.getByText('Neither')).toBeInTheDocument();
    });
});

/* ---------------------------------------------------- ManageTeams fixtures */

const TEAM_LEADERS = [
    { id: 1, full_name: 'Lead One' },
    { id: 2, full_name: 'Lead Two' },
];
const DEPARTMENT_USERS = [
    { id: 8, full_name: 'User Eight' },
    { id: 9, full_name: 'User Nine' },
];

const teamProps = (over = {}) => ({
    user: { id: 7, departments_handled: [{ id: 3, department_name: 'Information Technology' }] },
    team: undefined,
    team_leader: TEAM_LEADERS,
    teams_handled: [{ id: 5, name: 'Alpha Team' }, { id: 6, name: 'Beta Team' }],
    department_users: undefined,
    fetchUserList: jest.fn(() => Promise.resolve()),
    fetchTeamsHandledList: jest.fn(() => Promise.resolve()),
    fetchTeam: jest.fn(() => Promise.resolve()),
    fetchDepartmentUsersList: jest.fn(() => Promise.resolve()),
    createTeam: jest.fn(() => Promise.resolve()),
    updateTeam: jest.fn(() => Promise.resolve()),
    deleteTeam: jest.fn(() => Promise.resolve()),
    ...over,
});

const renderTeams = (props) => {
    const ref = React.createRef();
    const view = render(
        <MemoryRouter><ManageTeams {...props} ref={ref} /></MemoryRouter>
    );
    return { ...view, ref, rerenderWith: (next) => view.rerender(
        <MemoryRouter><ManageTeams {...next} ref={ref} /></MemoryRouter>
    ) };
};

/* ================================================================== */
describe('Manage Teams - mount, gating and the action-type radios', () => {

    it('shows the loading page until both lookup lists have landed', () => {
        const { getByTestId } = renderTeams(teamProps({ teams_handled: undefined }));
        expect(getByTestId('page-loading')).toBeInTheDocument();
    });

    it('still shows the loading page when only the teams-handled list arrived', () => {
        const { getByTestId } = renderTeams(teamProps({ team_leader: undefined }));
        expect(getByTestId('page-loading')).toBeInTheDocument();
    });

    it('renders the form once both lookup lists are present', () => {
        const { container, queryByTestId } = renderTeams(teamProps());
        expect(queryByTestId('page-loading')).toBeNull();
        expect(container.querySelector('input[value="store"]')).not.toBeNull();
        expect(container.querySelector('input[value="update"]')).not.toBeNull();
    });

    it('requests the full team-leader roster and the caller\'s teams on mount', async () => {
        const props = teamProps();
        renderTeams(props);
        await flush();

        expect(props.fetchUserList).toHaveBeenCalledWith('team_leader', { page: 'all' });
        expect(props.fetchTeamsHandledList).toHaveBeenCalledWith(7);
    });

    it('skips the teams-handled lookup when the signed-in user has no usable id', async () => {
        const props = teamProps({
            user: { id: 0, departments_handled: [{ id: 3, department_name: 'IT' }] },
        });
        renderTeams(props);
        await flush();

        expect(props.fetchUserList).toHaveBeenCalled();
        expect(props.fetchTeamsHandledList).not.toHaveBeenCalled();
    });

    it('picking Create Team reveals the name and department fields but no team picker', () => {
        const { container } = renderTeams(teamProps());

        act(() => { fireEvent.click(container.querySelector('input[value="store"]')); });

        expect(container.querySelector('select[name="team_id"]')).toBeNull();
        expect(container.querySelector('input[name="name"]')).not.toBeNull();
        expect(container.querySelector('select[name="department_id"]')).not.toBeNull();
    });

    it('picking Update Team reveals the team picker filled from the teams-handled list', () => {
        const { container } = renderTeams(teamProps());

        act(() => { fireEvent.click(container.querySelector('input[value="update"]')); });

        const select = container.querySelector('select[name="team_id"]');
        expect(select).not.toBeNull();
        expect(select.querySelectorAll('option')).toHaveLength(3);
        expect(select.querySelectorAll('option')[1]).toHaveTextContent('Alpha Team');
        // the name/department block stays hidden until a team is actually chosen
        expect(container.querySelector('input[name="name"]')).toBeNull();
    });

    it('hides the name and department block when the supervisor handles no department', () => {
        const { container } = renderTeams(teamProps({
            user: { id: 7, departments_handled: [] },
        }));

        act(() => { fireEvent.click(container.querySelector('input[value="store"]')); });

        expect(container.querySelector('input[name="name"]')).toBeNull();
        expect(container.querySelector('select[name="department_id"]')).toBeNull();
    });

    // FINDING MT-RESET-1: componentDidUpdate reacts to ANY change of selectedActionType by
    // blanking the team, department, name and both member lists. A supervisor who has
    // filled the form and then taps the other radio out of curiosity loses everything.
    it('toggling the action-type radio discards every field already filled in _FINDING_MT-RESET-1', () => {
        const { container, ref } = renderTeams(teamProps());

        act(() => { ref.current.setState({ selectedActionType: 'update' }); });
        act(() => {
            ref.current.setState({
                selectedTeam: '5', selectedDepartment: 3, name: 'Alpha Team',
                selectedTeamLeaders: [{ label: 'Lead One', value: 1 }],
                selectedTeamUsers: [{ label: 'User Eight', value: 8 }],
            });
        });
        expect(ref.current.state.selectedTeam).toBe('5');

        act(() => { fireEvent.click(container.querySelector('input[value="store"]')); });

        expect(ref.current.state.selectedActionType).toBe('store');
        expect(ref.current.state.selectedTeam).toBeNull();
        expect(ref.current.state.selectedDepartment).toBeNull();
        expect(ref.current.state.name).toBeNull();
        expect(ref.current.state.selectedTeamLeaders).toEqual([]);
        expect(ref.current.state.selectedTeamUsers).toEqual([]);
    });
});

/* ================================================================== */
describe('Manage Teams - team selection and the department cascade', () => {

    it('choosing a team loads it and records the selection', async () => {
        const props = teamProps();
        const { container, ref } = renderTeams(props);
        act(() => { fireEvent.click(container.querySelector('input[value="update"]')); });

        await act(async () => {
            fireEvent.change(container.querySelector('select[name="team_id"]'),
                { target: { value: '5' } });
        });

        expect(props.fetchTeam).toHaveBeenCalledWith('5');
        expect(ref.current.state.selectedTeam).toBe('5');
    });

    it('choosing the blank team option loads nothing and leaves the selection empty', async () => {
        const props = teamProps();
        const { container, ref } = renderTeams(props);
        act(() => { fireEvent.click(container.querySelector('input[value="update"]')); });

        await act(async () => {
            fireEvent.change(container.querySelector('select[name="team_id"]'),
                { target: { value: '' } });
        });

        expect(props.fetchTeam).not.toHaveBeenCalled();
        expect(ref.current.state.selectedTeam).toBeNull();
    });

    // FINDING MT-TEAMID-0: Validator.isValid() reports false for any numeric zero, so a
    // team whose primary key is 0 is indistinguishable from "nothing selected" and can
    // never be opened for editing.
    it('refuses to open a team whose id is zero _FINDING_MT-TEAMID-0', async () => {
        const props = teamProps({ teams_handled: [{ id: 0, name: 'Legacy Team' }] });
        const { container, ref } = renderTeams(props);
        act(() => { fireEvent.click(container.querySelector('input[value="update"]')); });

        await act(async () => {
            fireEvent.change(container.querySelector('select[name="team_id"]'),
                { target: { value: '0' } });
        });

        expect(props.fetchTeam).not.toHaveBeenCalled();
        expect(ref.current.state.selectedTeam).toBeNull();
    });

    it('choosing a department loads its employees and clears any previous member picks', async () => {
        const props = teamProps();
        const { container, ref } = renderTeams(props);
        act(() => { fireEvent.click(container.querySelector('input[value="store"]')); });
        act(() => {
            ref.current.setState({
                selectedTeamLeaders: [{ label: 'Lead One', value: 1 }],
                selectedTeamUsers: [{ label: 'User Eight', value: 8 }],
            });
        });

        await act(async () => {
            fireEvent.change(container.querySelector('select[name="department_id"]'),
                { target: { value: '3' } });
        });

        expect(props.fetchDepartmentUsersList).toHaveBeenCalledWith('3');
        expect(ref.current.state.selectedDepartment).toBe('3');
        expect(ref.current.state.selectedTeamLeaders).toEqual([]);
        expect(ref.current.state.selectedTeamUsers).toEqual([]);
    });

    it('a new team-leader roster is reshaped into label/value options for the picker', async () => {
        const props = teamProps();
        const { rerenderWith, ref } = renderTeams(props);

        await act(async () => {
            rerenderWith({ ...props, team_leader: TEAM_LEADERS.concat({ id: 3, full_name: 'Lead Three' }) });
        });

        expect(ref.current.state.teamLeadersList).toEqual([
            { label: 'Lead One', value: 1 },
            { label: 'Lead Two', value: 2 },
            { label: 'Lead Three', value: 3 },
        ]);
    });

    it('a new department-employee roster is reshaped into label/value options', async () => {
        const props = teamProps();
        const { rerenderWith, ref } = renderTeams(props);

        await act(async () => { rerenderWith({ ...props, department_users: DEPARTMENT_USERS }); });

        expect(ref.current.state.teamUserList).toEqual([
            { label: 'User Eight', value: 8 },
            { label: 'User Nine', value: 9 },
        ]);
    });

    it('a loaded team pre-fills the name, cascades its department and pre-ticks its members', async () => {
        const props = teamProps();
        const { rerenderWith, ref } = renderTeams(props);

        await act(async () => {
            rerenderWith({
                ...props,
                team: {
                    id: 5, name: 'Alpha Team', department_id: 3,
                    team_handlers: [{ id: 1, full_name: 'Lead One' }],
                    team_users: DEPARTMENT_USERS,
                },
            });
        });

        expect(props.fetchDepartmentUsersList).toHaveBeenCalledWith(3);
        expect(ref.current.state.name).toBe('Alpha Team');
        expect(ref.current.state.selectedDepartment).toBe(3);
        expect(ref.current.state.selectedTeamLeaders).toEqual([{ label: 'Lead One', value: 1 }]);
        expect(ref.current.state.selectedTeamUsers).toEqual([
            { label: 'User Eight', value: 8 },
            { label: 'User Nine', value: 9 },
        ]);
    });

    it('shows both member pickers only after a department is chosen and its rosters loaded', async () => {
        const props = teamProps();
        const { container, ref, queryByTestId } = renderTeams(props);
        act(() => { fireEvent.click(container.querySelector('input[value="store"]')); });

        expect(queryByTestId('multi-select-team_handlers[]')).toBeNull();

        await act(async () => {
            ref.current.setState({
                selectedDepartment: 3,
                teamLeadersList: [{ label: 'Lead One', value: 1 }],
                teamUserList: [{ label: 'User Eight', value: 8 }],
            });
        });

        expect(queryByTestId('multi-select-team_handlers[]')).not.toBeNull();
        expect(queryByTestId('multi-select-team_users[]')).not.toBeNull();
    });
});

/* ================================================================== */
describe('Manage Teams - create, update and delete', () => {

    // Brings the form to a submittable state: action type first (componentDidUpdate wipes
    // everything on that transition), then the rest of the fields.
    const armForm = async (ref, actionType, over = {}) => {
        await act(async () => { ref.current.setState({ selectedActionType: actionType }); });
        await act(async () => {
            ref.current.setState({
                selectedTeam: actionType === 'update' ? '5' : null,
                selectedDepartment: 3,
                name: 'Alpha Team',
                teamLeadersList: [{ label: 'Lead One', value: 1 }],
                teamUserList: [{ label: 'User Eight', value: 8 }, { label: 'User Nine', value: 9 }],
                selectedTeamLeaders: [{ label: 'Lead One', value: 1 }],
                selectedTeamUsers: [{ label: 'User Eight', value: 8 }, { label: 'User Nine', value: 9 }],
                ...over,
            });
        });
    };

    let confirmSpy;
    let logSpy;
    beforeEach(() => {
        confirmSpy = jest.spyOn(window, 'confirm').mockImplementation(() => true);
        logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });
    afterEach(() => { confirmSpy.mockRestore(); logSpy.mockRestore(); });

    it('shows a Save button for create and swaps in Update plus Delete for edit', async () => {
        const { container, ref } = renderTeams(teamProps());

        await armForm(ref, 'store');
        expect(btn(container, 'Save')).not.toBeUndefined();
        expect(btn(container, 'Delete')).toBeUndefined();

        await armForm(ref, 'update');
        expect(btn(container, 'Update')).not.toBeUndefined();
        expect(btn(container, 'Delete')).not.toBeUndefined();
    });

    it('lists every picked leader and member back to the supervisor for confirmation', async () => {
        const { container, ref, getByText } = renderTeams(teamProps());
        await armForm(ref, 'store');

        expect(getByText('Lead One')).toBeInTheDocument();
        expect(getByText('User Eight')).toBeInTheDocument();
        expect(container.querySelectorAll('li')).toHaveLength(3);
    });

    it('saving a new team posts the picked members as bare ids and refreshes the team list', async () => {
        const props = teamProps();
        const { container, ref } = renderTeams(props);
        await armForm(ref, 'store');
        props.fetchTeamsHandledList.mockClear();

        await act(async () => { fireEvent.submit(container.querySelector('form')); });
        await flush();

        expect(props.createTeam).toHaveBeenCalledTimes(1);
        expect(props.createTeam).toHaveBeenCalledWith({
            action_type: 'store',
            department_id: 3,
            name: 'Alpha Team',
            team_handlers: [1],
            team_users: [8, 9],
        });
        expect(props.updateTeam).not.toHaveBeenCalled();
        expect(props.fetchTeamsHandledList).toHaveBeenCalledWith(7);
    });

    it('updating an existing team sends the id separately and spoofs the PUT verb', async () => {
        const props = teamProps();
        const { container, ref } = renderTeams(props);
        await armForm(ref, 'update');

        await act(async () => { fireEvent.submit(container.querySelector('form')); });
        await flush();

        expect(props.createTeam).not.toHaveBeenCalled();
        expect(props.updateTeam).toHaveBeenCalledWith('5', {
            action_type: 'update',
            team_id: '5',
            department_id: 3,
            name: 'Alpha Team',
            team_handlers: [1],
            team_users: [8, 9],
            _method: 'PUT',
        });
    });

    it('answering No to the confirm prompt saves nothing and does not refresh the list', async () => {
        confirmSpy.mockImplementation(() => false);
        const props = teamProps();
        const { container, ref } = renderTeams(props);
        await armForm(ref, 'store');
        props.fetchTeamsHandledList.mockClear();

        await act(async () => { fireEvent.submit(container.querySelector('form')); });
        await flush();

        expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to create/update this Team?');
        expect(props.createTeam).not.toHaveBeenCalled();
        expect(props.fetchTeamsHandledList).not.toHaveBeenCalled();
    });

    it('a team name shorter than three characters is rejected before anything is sent', async () => {
        const props = teamProps();
        const { container, ref } = renderTeams(props);
        await armForm(ref, 'store', { name: 'ab' });

        await act(async () => { fireEvent.submit(container.querySelector('form')); });
        await flush();

        expect(props.createTeam).not.toHaveBeenCalled();
        expect(confirmSpy).not.toHaveBeenCalled();
    });

    it('a team with no leaders selected can never reach the submit button', async () => {
        const props = teamProps();
        const { container, ref } = renderTeams(props);
        await armForm(ref, 'store', { selectedTeamLeaders: [] });

        expect(btn(container, 'Save')).toBeUndefined();
        expect(container.querySelector('button[type="submit"]')).toBeNull();
    });

    it('a team with no members selected can never reach the submit button', async () => {
        const props = teamProps();
        const { container, ref } = renderTeams(props);
        await armForm(ref, 'store', { selectedTeamUsers: [] });

        expect(btn(container, 'Save')).toBeUndefined();
    });

    it('deleting a team removes it, refreshes the list and clears the selection', async () => {
        const props = teamProps();
        const { container, ref } = renderTeams(props);
        await armForm(ref, 'update');
        props.fetchTeamsHandledList.mockClear();

        await act(async () => { fireEvent.click(btn(container, 'Delete')); });
        await flush();

        expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete this Team?');
        expect(props.deleteTeam).toHaveBeenCalledWith('5');
        expect(props.fetchTeamsHandledList).toHaveBeenCalledWith(7);
        expect(ref.current.state.selectedTeam).toBeNull();
        expect(ref.current.state.selectedDepartment).toBeNull();
        expect(ref.current.state.selectedTeamLeaders).toEqual([]);
        expect(ref.current.state.selectedActionType).toBe('update');
    });

    it('answering No to the delete prompt keeps the team and the selection intact', async () => {
        confirmSpy.mockImplementation(() => false);
        const props = teamProps();
        const { container, ref } = renderTeams(props);
        await armForm(ref, 'update');

        await act(async () => { fireEvent.click(btn(container, 'Delete')); });
        await flush();

        expect(props.deleteTeam).not.toHaveBeenCalled();
        expect(ref.current.state.selectedTeam).toBe('5');
    });

    // FINDING MT-UNKNOWN-1: the switch in onSubmitHandler has an empty default arm, but the
    // teams-handled refresh sits AFTER the switch inside the confirm block. A submission
    // carrying an unknown action_type therefore saves nothing yet still burns a round trip.
    it('an unrecognised action type saves nothing but still re-fetches the team list _FINDING_MT-UNKNOWN-1', async () => {
        const props = teamProps();
        const { ref } = renderTeams(props);
        props.fetchTeamsHandledList.mockClear();

        await act(async () => {
            await ref.current.onSubmitHandler({
                action_type: 'archive', name: 'Alpha Team',
                team_handlers: [{ label: 'Lead One', value: 1 }],
                team_users: [{ label: 'User Eight', value: 8 }],
            });
        });

        expect(props.createTeam).not.toHaveBeenCalled();
        expect(props.deleteTeam).not.toHaveBeenCalled();
        expect(props.fetchTeamsHandledList).toHaveBeenCalledWith(7);
    });

    it('null form values are stripped from the payload while empty member lists survive', async () => {
        const props = teamProps();
        const { ref } = renderTeams(props);

        await act(async () => {
            await ref.current.onSubmitHandler({
                action_type: 'store', team_id: null, department_id: 3,
                name: 'Alpha Team', team_handlers: [], team_users: [],
            });
        });

        expect(props.createTeam).toHaveBeenCalledWith({
            action_type: 'store', department_id: 3, name: 'Alpha Team',
            team_handlers: [], team_users: [],
        });
    });
});
