/**
 * TeamListsLifecycle.test.js
 *
 * SOURCE FILES UNDER TEST
 *   1. src/container/MyTeam/OverallRequest.js
 *        Menu: My Team -> OverAll Requests   (link global.links.overallrequest)
 *   2. src/container/MyTeam/EmployeeList/EmployeeList.js
 *        Menu: My Team -> Employee List      (route global.links.employee_list)
 *   3. src/container/MyTeam/DtrLogs/DtrLogs.js
 *        Menu: My Team -> DTR Logs           (route global.links.dtr_logs = /app/team/DtrLogs)
 *   Not under test: the mapStateToProps / mapDispatchToProps of all three files - this suite
 *   mocks react-redux `connect` to the identity function, so that wiring never executes here.
 *
 * COVERAGE BASELINE GIVEN FOR THIS PACKET (29-Jul run)
 *   container/MyTeam/OverallRequest.js            0%      - never mounted by any suite
 *   container/MyTeam/EmployeeList/EmployeeList.js 57.38%
 *   container/MyTeam/DtrLogs/DtrLogs.js           44.12%
 *   71 uncovered statements across the three.
 *
 * WHAT IS WALKED, IN THE ORDER A SUPERVISOR HITS IT
 *   PHASE A  OverAll Requests  mount, payroll-cutoff seeding, department dropdown, the
 *                              Filter/Reset controls, the table body, the row link
 *   PHASE B  Employee List     mount fetch gate (cached / not cached / cached-but-empty),
 *                              restored filters, row rendering, per-row action gates
 *                              (level + feature + country + multi-punch), the filter form,
 *                              department -> sub-department cascade, sort, pagination
 *   PHASE C  DTR Logs          cutoff seeding, validation (all three required fields, both
 *                              arms), Generate vs Export, the 23-column log table, the
 *                              Toggle Outlook point-of-view switch, pagination, empty states
 *
 * FINDINGS (characterised - these tests assert what the code does TODAY, they do not endorse it)
 *   OVR-DEAD-1     OverallRequest is imported by config/RouteList.js (line 94) but no
 *                  <ProtectedRoute> ever renders it, and its only sidebar entry
 *                  (Sidebar.js lines 510-522) is commented out. The screen cannot be reached in
 *                  the running app, yet it ships in the bundle. Everything below is therefore
 *                  characterisation of dead-but-shipped code.
 *   OVR-STUB-1     the table body is hard-coded demo data - employee 3537 "Lakshmanaswamy S",
 *                  "Dummy Manager", 2023-06-02 timestamps - and the real
 *                  `request_list.data.map` is commented out (source lines 121-122, 154). The row
 *                  is identical for every user and every department.
 *   OVR-DEADBTN-1  Filter and Reset are <Button type="button"> with no onClick, and the name box
 *                  and department dropdown have no value/onChange binding. Pressing Reset does
 *                  not clear a typed name; pressing Filter does not change the table.
 *   OVR-EFFECT-1   the payroll cutoff is copied into the date boxes by a useEffect with an empty
 *                  dependency array, so a cutoff that arrives after first paint (settings load
 *                  asynchronously) never reaches the fields - they stay blank forever.
 *   OVR-SELFLINK-1 the row's "view" icon links to global.links.overallrequest - the list screen
 *                  itself - not to a request detail route.
 *   EL-STATUS-STICKY-1  EmployeeList's constructor restores department / sub-department /
 *                  job title / name / page / order_by from the saved filters but hard-codes
 *                  status back to 1, so a supervisor who filtered to Inactive and navigated away
 *                  silently returns to Active while every other filter is remembered.
 *   EL-STATUS-BLANK-1   the Status badge switches on parseInt(is_active) and handles only 1 and
 *                  0; a null / absent is_active yields NaN, falls through both cases, and the
 *                  cell renders completely empty - no badge, no text, no "unknown".
 *   EL-COUNTRY-TYPE-1   the DTR link picks the India/Morocco route with
 *                  `user.country_id === "1" || user.country_id === "4"` - strict, string-only -
 *                  while the multi-punch gate two lines below uses `has_use_multi == "1"`, loose.
 *                  A numeric country_id 1 from the API therefore sends an India employee to the
 *                  Philippine DTR screen while the numeric multi-punch flag still works.
 *   EL-DEAD-1      departmentSelected() / fetchTeamUnderDepartment are dead: no control on the
 *                  screen calls them (the department Select calls departmentSelectedforSub), and
 *                  the `team_list` the endpoint feeds is destructured in the filter component and
 *                  never used.
 *   EL-STALESUB-1  clearing the department leaves the previous department's sub-department
 *                  options in the dropdown and still selectable - the reset call that would have
 *                  emptied them is commented out (source line 147) - so a supervisor can submit
 *                  department=<none> plus a sub-department belonging to the cleared department.
 *   DTRL-POV-INVERT-1   Toggle Outlook is wired backwards against its own labels: with the toggle
 *                  ON the header reads POV "(User)" but the time cells come from the RAW
 *                  list.time_in / time_out / duty fields and the POV cell shows the LOGGED-IN
 *                  SUPERVISOR's timezone; with the toggle OFF the header reads "(Default)" and
 *                  the cells come from the field literally named user_POV. Label and data
 *                  disagree in both positions.
 *   DTRL-TOGGLE-DROP-1  the toggle is only sent to the server when it is ON. onSubmitHandler
 *                  strips values where `value != ""` is false, and in JavaScript `false != ""`
 *                  IS false, so toggle_pov=false is dropped from the payload - the server cannot
 *                  tell "user turned it off" from "field not supplied".
 *   DTRL-EMPTYSET-1     the result table is gated on dtrLogs.isListLoaded, not on row count, so a
 *                  search that legitimately matches nothing renders a 23-column table with an
 *                  empty body plus a pagination bar instead of "Sorry, no record found".
 *   DTRL-CONSOLE-1      render calls console.log(list, index) once per log row, on every render,
 *                  in production - a per-row debug statement that dumps employee numbers, names
 *                  and timestamps into the browser console.
 *   DTRL-GUARD-1        the department dropdown is built from this.props.user.departments_handled
 *                  with no guard, and that JSX is evaluated BEFORE <Wrapper> can apply its
 *                  level/feature gate, so a user payload without departments_handled crashes the
 *                  whole page instead of being shown PageNotAllowed. That the field can be
 *                  missing is conceded by EmployeeList itself, which reads the same field as
 *                  `props.props.user?.departments_handled`.
 *
 * NOT REPORTED AS FINDINGS (deliberate - these are test-environment artefacts, not app defects)
 *   - All three screens declare their text filters as <input type="textfield">. jsdom 11 leaves
 *     .type as "textfield", which is not in React's supported-text-input list, so React's change
 *     plugin does not track the field and fireEvent.change cannot drive it. A real browser coerces
 *     any unknown type to "text" (invalid-value default of an enumerated attribute) and the box
 *     works normally. This suite therefore never types into those boxes: the name / job title
 *     filters are exercised through the production path that seeds them (saved filters restored
 *     by the constructor) or, where no such path exists, through a clearly-named handler-level
 *     test. Their DOM values are still read and asserted, which is unaffected by the quirk.
 *   - React key/controlled-input console warnings are not asserted anywhere in this file.
 *
 * DETERMINISM
 *   No assertion depends on the current date. Every date fixture is an unambiguous local-time
 *   string ("2026-07-16 00:00:00" / "...T00:00:00"), never a bare ISO date, so Date.parse cannot
 *   shift it by a day depending on the machine's timezone. There are no timers, no FileReader and
 *   no polling in these three screens; the only asynchrony is Formik's validation promise, which
 *   is flushed with `await act(async () => ...)` after every submit.
 *
 * ADDITIVE ONLY - no existing test file and no application source was modified.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

/* ------------------------------------------------------------------ mocks */

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
}));

jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader:  ({ children }) => <div>{children}</div>,
    Content:          ({ children }) => <div>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
    Row:              ({ children }) => <div>{children}</div>,
    Col:              ({ children }) => <div>{children}</div>,
}));

// Wrapper is the level/feature gate. It is stubbed to a passthrough so that these tests measure
// the three containers, not Authenticator. DTRL-GUARD-1 below explains why the gate's position
// still matters even when it is stubbed.
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading" />);

// InputDate stub.
// CONTRACT CHECKED AGAINST SOURCE (components/DatePickerComponent/DatePicker.js lines 172-193):
// InputDate renders react-datepicker inside a Formik <Field> and its onChange is
// `date => form.setFieldValue(props.name, date)` - it writes its OWN `name` prop, carrying a Date
// object. The stub reproduces exactly that, synchronously.
// It also reproduces the sibling <ErrorMessage component="div" name={props.name}/> the real
// component renders (same source lines), so the date-range validation messages are observable.
// DIVERGENCE, stated on purpose: the real component reads its displayed value from
// eval('field.value.' + props.name); the stub displays the `value` prop DtrLogs passes it, which
// is the same Formik value. That makes the seeded payroll cutoff observable in the DOM. What the
// stub does not reproduce is react-datepicker's own parsing/calendar UI.
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => {
    const R = require('react');
    const moment = require('moment');
    const { useFormikContext, ErrorMessage } = require('formik');
    return {
        InputDate: ({ name, value }) => {
            const form = useFormikContext();
            return R.createElement('div', null,
                R.createElement('input', {
                    type: 'text',
                    'data-testid': 'date-' + name,
                    value: value ? moment(value).format('YYYY-MM-DD') : '',
                    onChange: (e) => form.setFieldValue(
                        name, e.target.value ? new Date(e.target.value + 'T00:00:00') : null),
                }),
                R.createElement(ErrorMessage, { component: 'div', name, className: 'input-feedback' }));
        },
        InputTime: () => R.createElement('div', null),
    };
});

// Paginate stub.
// CONTRACT CHECKED AGAINST SOURCE (components/Template/Paginate/Paginate.js line 19): every page
// control is a <Button type="submit"> whose onClick is form.setFieldValue("page", page) - so the
// Formik field name is "page" and the click submits the surrounding form. The stub reproduces
// both. It renders one button per page instead of the real First/Prev/1..10/Next/Last window, so
// it proves the container's reaction to a page change, not Paginate's own windowing.
// Both containers resolve to the same module (EmployeeList imports the directory, DtrLogs imports
// .../Paginate/index.js), so both specifiers are registered.
const mockPaginateStub = () => {
    const R = require('react');
    const { useFormikContext } = require('formik');
    return ({ pagination }) => {
        const form = useFormikContext();
        const pages = [];
        for (let n = 1; n <= (pagination && pagination.last_page ? pagination.last_page : 0); n++) {
            pages.push(n);
        }
        return R.createElement('div', { 'data-testid': 'paginate' },
            pages.map((n) => R.createElement('button', {
                key: n, type: 'submit', 'data-testid': 'page-' + n,
                onClick: () => { form.setFieldValue('page', n); },
            }, String(n))));
    };
};
jest.mock('../../components/Template/Paginate', () => mockPaginateStub());
jest.mock('../../components/Template/Paginate/index.js', () => mockPaginateStub());

// react-select stub.
// CONTRACT CHECKED AGAINST SOURCE (EmployeeList.js lines 137-157) AND react-select v3 docs: the
// department picker is `isClearable`, its options are {label,value} objects built by
// Formatter.array_to_multiselect_array, and onChange receives the SELECTED OPTION OBJECT, or null
// when the value is cleared. The stub emits exactly those two shapes from a native <select>.
jest.mock('react-select', () => {
    const R = require('react');
    return ({ name, options, onChange, placeholder }) => R.createElement('select', {
        'data-testid': 'react-select-' + name,
        onChange: (e) => {
            const raw = e.target.value;
            onChange(raw === '' ? null : options.find((o) => String(o.value) === raw));
        },
    }, [R.createElement('option', { key: '__clear__', value: '' }, placeholder)].concat(
        options.map((o) => R.createElement('option', { key: o.value, value: o.value }, o.label))));
});

jest.mock('../../services/Authenticator', () => ({
    scanFeature: jest.fn(() => true),
    scanLevel:   jest.fn(() => false),
}));

jest.mock('../../store/actions/filters/myTeamActions', () => ({
    fetchMyTeamList:                  jest.fn(),
    fetchTeamUnderDepartment:         jest.fn(),
    fetchSubDepartmentUnderDepartment: jest.fn(),
}));

jest.mock('../../store/actions/dtr/dtrLogsAction', () => ({
    fetchDtrLogs:  jest.fn(),
    exportDtrLogs: jest.fn(),
}));

import Authenticator from '../../services/Authenticator';

// The route table the row links are built from - distinct prefixes so "each action deep-links to
// its own screen" is actually observable.
global.links = {
    overallrequest:       '/app/team/overallrequest',
    dtr:                  '/app/dtr/',
    dtr_in_mar:           '/app/dtr_in_mar/',
    dtr_punchlist:        '/app/dtr_punch_list/',
    schedule_assign_user: '/app/schedule/assign/user/',
    profile:              '/app/profile/',
    dtr_logs:             '/app/team/DtrLogs',
};

const OverallRequest = require('../../container/MyTeam/OverallRequest').default;
const EmployeeList   = require('../../container/MyTeam/EmployeeList/EmployeeList').default;
const DtrLogs        = require('../../container/MyTeam/DtrLogs/DtrLogs').default;

/* --------------------------------------------------------------- helpers */

const DEPARTMENTS = [
    { id: 7, department_name: 'Delivery' },
    { id: 9, department_name: 'Finance' },
];

const button = (container, text) =>
    Array.from(container.querySelectorAll('button'))
        .find((b) => b.textContent.replace(/\s+/g, ' ').trim().includes(text));

const clickAndSettle = async (el) => { await act(async () => { fireEvent.click(el); }); };
const changeAndSettle = async (el, value) => {
    await act(async () => { fireEvent.change(el, { target: { value } }); });
};

const rowCells = (tr) => Array.from(tr.querySelectorAll('td')).map((td) => td.textContent.trim());
const hrefs = (el) => Array.from(el.querySelectorAll('a')).map((a) => a.getAttribute('href'));

/* ==========================================================================
 * PHASE A - My Team -> OverAll Requests   (container/MyTeam/OverallRequest.js)
 * ======================================================================== */

describe('PHASE A - OverAll Requests screen', () => {

    const overallProps = (over = {}) => ({
        user: { id: 11, departments_handled: DEPARTMENTS },
        // Local-time strings on purpose: a bare "2026-07-16" is parsed as UTC midnight by
        // Date.parse and would format to the previous day west of Greenwich.
        payrollcut: { start_date: '2026-07-16T00:00:00', end_date: '2026-07-31T00:00:00' },
        ...over,
    });

    const mountOverall = (over = {}) => {
        const props = overallProps(over);
        const utils = render(
            <MemoryRouter><OverallRequest {...props} /></MemoryRouter>);
        return { ...utils, props };
    };

    const dateBoxes = (container) =>
        Array.from(container.querySelectorAll('input[type="date"]'));

    it('opens with the date range pre-filled from the current payroll cutoff', () => {
        const { container } = mountOverall();
        const [from, to] = dateBoxes(container);
        expect(from.value).toBe('2026-07-16');
        expect(to.value).toBe('2026-07-31');
    });

    it('leaves both date boxes empty when settings carry no payroll cutoff', () => {
        const { container } = mountOverall({ payrollcut: null });
        const [from, to] = dateBoxes(container);
        expect(from.value).toBe('');
        expect(to.value).toBe('');
    });

    // FINDING OVR-EFFECT-1
    it('never picks up a payroll cutoff that arrives after the first paint', () => {
        const props = overallProps({ payrollcut: null });
        const { container, rerender } = render(
            <MemoryRouter><OverallRequest {...props} /></MemoryRouter>);
        expect(dateBoxes(container)[0].value).toBe('');

        // Settings finish loading a moment after the screen opened - the exact production
        // sequence, since settings are fetched asynchronously at app start.
        rerender(
            <MemoryRouter>
                <OverallRequest {...overallProps()} />
            </MemoryRouter>);

        // The effect declares [] as its dependency list, so it never runs again.
        expect(dateBoxes(container)[0].value).toBe('');
        expect(dateBoxes(container)[1].value).toBe('');
    });

    it('accepts a hand-edited start date over the seeded cutoff', () => {
        const { container } = mountOverall();
        const [from] = dateBoxes(container);
        fireEvent.change(from, { target: { value: '2026-08-20' } });
        expect(dateBoxes(container)[0].value).toBe('2026-08-20');
        // the end of the range is untouched by editing the start
        expect(dateBoxes(container)[1].value).toBe('2026-07-31');
    });

    it('lists one department option per handled department, behind a placeholder', () => {
        const { container } = mountOverall();
        const options = Array.from(
            container.querySelector('select[name="department_id"]').querySelectorAll('option'));
        expect(options).toHaveLength(3);
        expect(options[0].value).toBe('');
        expect(options.slice(1).map((o) => o.value)).toEqual(['7', '9']);
        expect(options.slice(1).map((o) => o.getAttribute('label')))
            .toEqual(['Delivery', 'Finance']);
    });

    it('shows only the placeholder when the supervisor handles no departments', () => {
        const { container } = mountOverall({ user: { id: 11, departments_handled: [] } });
        expect(container.querySelector('select[name="department_id"]')
            .querySelectorAll('option')).toHaveLength(1);
        // the table still paints - the row does not come from the department filter
        expect(container.querySelector('tbody.request_list').querySelectorAll('tr')).toHaveLength(1);
    });

    // FINDING OVR-STUB-1
    it('shows the same hard-coded demo row whichever supervisor opens it', () => {
        const first = mountOverall();
        const firstRow = rowCells(first.container.querySelector('tbody.request_list tr'));
        expect(firstRow).toEqual([
            '1', '3537', 'Lakshmanaswamy S', 'Alter Log', 'Pending', 'Dummy Manager',
            '2023-06-02 13:20:00', '2023-06-02 13:20:00', '',
        ]);

        // a different supervisor, different departments, different cutoff - identical row
        const second = mountOverall({
            user: { id: 99, departments_handled: [{ id: 3, department_name: 'Legal' }] },
            payrollcut: { start_date: '2025-01-01T00:00:00', end_date: '2025-01-15T00:00:00' },
        });
        expect(rowCells(second.container.querySelector('tbody.request_list tr'))).toEqual(firstRow);
    });

    it('renders the demo row status as a Pending badge', () => {
        const { container } = mountOverall();
        const badge = container.querySelector('td.status .badge');
        expect(badge).not.toBeNull();
        expect(badge.textContent).toBe('Pending');
        expect(badge.className).toContain('badge-secondary');
    });

    // FINDING OVR-DEADBTN-1
    it('does not clear a typed name when Reset is pressed, and Filter changes nothing', async () => {
        const { container } = mountOverall();
        const nameBox = container.querySelector('input[name="name"]');
        // The box is uncontrolled - no value prop, no onChange in the source - so the browser
        // holds whatever was typed. Assigning .value directly is what a keystroke does to an
        // unbound input; React is not involved, so this is not the jsdom type=textfield quirk.
        nameBox.value = 'Cruz';
        const before = container.querySelector('tbody.request_list').innerHTML;

        await clickAndSettle(button(container, 'Filter'));
        await clickAndSettle(button(container, 'Reset'));

        expect(container.querySelector('input[name="name"]').value).toBe('Cruz');
        expect(container.querySelector('tbody.request_list').innerHTML).toBe(before);
    });

    // FINDING OVR-SELFLINK-1
    it('points the row action at the list screen itself instead of a request detail page', () => {
        const { container } = mountOverall();
        expect(hrefs(container.querySelector('tbody.request_list'))).toEqual(['/app/team/overallrequest']);
    });
});

/* ==========================================================================
 * PHASE B - My Team -> Employee List   (container/MyTeam/EmployeeList/EmployeeList.js)
 * ======================================================================== */

describe('PHASE B - Employee List screen', () => {

    const employee = (over = {}) => ({
        id: 501,
        Employee_Number: '3001',
        Employee_Name: 'Ana Cruz',
        job_title: 'Analyst',
        Name: 'Delivery',
        email: 'ana@example.com',
        is_active: 1,
        country_id: '2',
        has_use_multi: '0',
        ...over,
    });

    const listOf = (rows, pagination = {}) => ({
        data: rows,
        pagination: { total: rows.length, current_page: 1, last_page: 1, ...pagination },
    });

    const listProps = (over = {}) => ({
        user: { id: 42, departments_handled: DEPARTMENTS },
        myTeamList: {
            list: null, team_list: [], sub_department: [], filters: {},
            ...(over.myTeamList || {}),
        },
        fetchMyTeamList: jest.fn(),
        fetchTeamUnderDepartment: jest.fn(),
        fetchSubDepartmentUnderDepartment: jest.fn(),
        ...over,
    });

    const mountList = (over = {}) => {
        const props = listProps(over);
        const ref = React.createRef();
        const utils = render(
            <MemoryRouter><EmployeeList ref={ref} {...props} /></MemoryRouter>);
        return { ...utils, props, ref };
    };

    const payload = (props, call = 0) => props.fetchMyTeamList.mock.calls[call][1];

    beforeEach(() => {
        Authenticator.scanFeature.mockImplementation(() => true);
        Authenticator.scanLevel.mockImplementation(() => false);
    });

    /* -- B1 mount ------------------------------------------------------- */

    it('asks the server for the team list when nothing is cached yet', () => {
        const { props } = mountList();
        expect(props.fetchMyTeamList).toHaveBeenCalledTimes(1);
        expect(props.fetchMyTeamList).toHaveBeenCalledWith(42, { status: 1, url: 'MyTeam' });
    });

    it('reuses the cached team list instead of refetching on every visit', () => {
        const { props, container } = mountList({
            myTeamList: { list: listOf([employee()]), team_list: [], sub_department: [], filters: {} },
        });
        expect(props.fetchMyTeamList).not.toHaveBeenCalled();
        expect(container.querySelectorAll('tbody tr')).toHaveLength(1);
    });

    it('treats a cached empty result as loaded - no refetch, and the empty message instead of a table', () => {
        const { props, container } = mountList({
            myTeamList: { list: listOf([]), team_list: [], sub_department: [], filters: {} },
        });
        expect(props.fetchMyTeamList).not.toHaveBeenCalled();
        expect(container.textContent).toContain('Sorry, no record found');
        expect(container.querySelector('tbody')).toBeNull();
    });

    it('restores the department, sub-department, job title, name and sort filters from the last visit', () => {
        const { container } = mountList({
            myTeamList: {
                list: listOf([employee()]),
                team_list: [],
                sub_department: [{ Id: 21, Name: 'Delivery West' }],
                filters: {
                    department_id: 7, sub_department_id: 21, job_title: 'Analyst',
                    name: 'Cruz', page: 3, order_by: 'name:desc',
                },
            },
        });
        expect(container.querySelector('input[name="job_title"]').value).toBe('Analyst');
        expect(container.querySelector('input[name="name"]').value).toBe('Cruz');
        expect(container.querySelector('select[name="sub_department_id"]').value).toBe('21');
        expect(container.querySelector('select[name="order_by"]').value).toBe('name:desc');
    });

    // FINDING EL-STATUS-STICKY-1
    it('forgets an Inactive status filter on re-entry while remembering every other filter', () => {
        const { container } = mountList({
            myTeamList: {
                list: listOf([employee()]),
                team_list: [], sub_department: [],
                filters: { status: '0', name: 'Cruz', job_title: 'Analyst' },
            },
        });
        // name and job title came back...
        expect(container.querySelector('input[name="name"]').value).toBe('Cruz');
        // ...but status is hard-coded to 1 in the constructor, so the screen silently
        // switches the supervisor back to Active employees.
        expect(container.querySelector('select[name="status"]').value).toBe('1');
    });

    /* -- B2 rows -------------------------------------------------------- */

    it('renders one row per employee with number, name, job title, department and email, and the server total', () => {
        const { container } = mountList({
            myTeamList: {
                list: listOf([
                    employee(),
                    employee({ id: 502, Employee_Number: '3002', Employee_Name: 'Ben Diaz', job_title: 'QA', Name: 'Finance', email: 'ben@example.com' }),
                ], { total: 57 }),
                team_list: [], sub_department: [], filters: {},
            },
        });
        const rows = container.querySelectorAll('tbody tr');
        expect(rows).toHaveLength(2);
        expect(rowCells(rows[0]).slice(0, 5))
            .toEqual(['3001', 'Ana Cruz', 'Analyst', 'Delivery', 'ana@example.com']);
        expect(rowCells(rows[1]).slice(0, 5))
            .toEqual(['3002', 'Ben Diaz', 'QA', 'Finance', 'ben@example.com']);
        expect(container.textContent).toContain('Total: 57');
    });

    it('badges is_active 1 as Active and 0 as Inactive', () => {
        const { container } = mountList({
            myTeamList: {
                list: listOf([employee(), employee({ id: 502, is_active: 0 })]),
                team_list: [], sub_department: [], filters: {},
            },
        });
        const badges = container.querySelectorAll('td.emp-status .badge');
        expect(badges).toHaveLength(2);
        expect(badges[0].textContent).toBe('Active');
        expect(badges[0].className).toContain('badge-success');
        expect(badges[1].textContent).toBe('Inactive');
        expect(badges[1].className).toContain('badge-danger');
    });

    // FINDING EL-STATUS-BLANK-1
    it('shows nothing at all in the status cell when the server sends no is_active', () => {
        const { container } = mountList({
            myTeamList: {
                list: listOf([employee({ is_active: null })]),
                team_list: [], sub_department: [], filters: {},
            },
        });
        const cell = container.querySelector('td.emp-status');
        expect(cell.querySelectorAll('.badge')).toHaveLength(0);
        expect(cell.textContent.trim()).toBe('');
    });

    /* -- B3 row actions ------------------------------------------------- */

    it('sends India and Morocco employees to the localised DTR and everyone else to the standard one', () => {
        const { container } = mountList({
            myTeamList: {
                list: listOf([
                    employee({ id: 601, country_id: '1' }),
                    employee({ id: 604, country_id: '4' }),
                    employee({ id: 602, country_id: '2' }),
                ]),
                team_list: [], sub_department: [], filters: {},
            },
        });
        const rows = container.querySelectorAll('tbody tr');
        expect(hrefs(rows[0])[0]).toBe('/app/dtr_in_mar/601');
        expect(hrefs(rows[1])[0]).toBe('/app/dtr_in_mar/604');
        expect(hrefs(rows[2])[0]).toBe('/app/dtr/602');
    });

    // FINDING EL-COUNTRY-TYPE-1
    it('mis-routes an India employee whose country_id arrives as a number, while the loosely compared multi-punch flag survives the same treatment', () => {
        const { container } = mountList({
            myTeamList: {
                list: listOf([employee({ id: 701, country_id: 1, has_use_multi: 1 })]),
                team_list: [], sub_department: [], filters: {},
            },
        });
        const links = hrefs(container.querySelector('tbody tr'));
        // strict === "1" fails on the number 1 -> Philippine DTR for an India employee
        expect(links[0]).toBe('/app/dtr/701');
        expect(links).not.toContain('/app/dtr_in_mar/701');
        // two lines below, has_use_multi == "1" is loose, so the number 1 still passes
        expect(links).toContain('/app/dtr_punch_list/701');
    });

    it('offers the punch history link only to multi-punch employees', () => {
        const { container } = mountList({
            myTeamList: {
                list: listOf([
                    employee({ id: 801, has_use_multi: '1' }),
                    employee({ id: 802, has_use_multi: '0' }),
                ]),
                team_list: [], sub_department: [], filters: {},
            },
        });
        const rows = container.querySelectorAll('tbody tr');
        expect(hrefs(rows[0])).toContain('/app/dtr_punch_list/801');
        expect(hrefs(rows[1])).not.toContain('/app/dtr_punch_list/802');
    });

    it('hides DTR and schedule from a Client-level viewer but still lets them open the profile', () => {
        Authenticator.scanLevel.mockImplementation((levels) => levels.includes('Client'));
        const { container } = mountList({
            myTeamList: {
                list: listOf([employee({ id: 901, has_use_multi: '1' })]),
                team_list: [], sub_department: [], filters: {},
            },
        });
        const links = hrefs(container.querySelector('tbody tr'));
        expect(links).not.toContain('/app/dtr/901');
        expect(links).not.toContain('/app/schedule/assign/user/901');
        expect(links).toContain('/app/profile/901');
        // the multi-punch link sits OUTSIDE the Client guard, so a Client keeps it
        expect(links).toContain('/app/dtr_punch_list/901');
    });

    it('leaves the actions cell empty when the viewer holds none of the three view features', () => {
        Authenticator.scanFeature.mockImplementation(() => false);
        const { container } = mountList({
            myTeamList: {
                list: listOf([employee({ id: 902, has_use_multi: '1' })]),
                team_list: [], sub_department: [], filters: {},
            },
        });
        expect(hrefs(container.querySelector('td.actions'))).toEqual([]);
    });

    /* -- B4 filters ----------------------------------------------------- */

    it('submits only the filters that carry a value, dropping the blank ones', async () => {
        const { container, props } = mountList({
            myTeamList: {
                list: listOf([employee()]),
                team_list: [], sub_department: [],
                filters: { name: 'Cruz', job_title: '', page: 4, order_by: 'name:asc' },
            },
        });
        await clickAndSettle(button(container, 'Filter'));

        expect(props.fetchMyTeamList).toHaveBeenCalledTimes(1);
        expect(props.fetchMyTeamList.mock.calls[0][0]).toBe(42);
        const sent = payload(props);
        // blank job_title is stripped; every populated filter is forwarded
        expect(Object.keys(sent).sort())
            .toEqual(['name', 'order_by', 'page', 'status', 'url']);
        expect(sent.name).toBe('Cruz');
        expect(sent.order_by).toBe('name:asc');
        expect(sent.status).toBe(1);
        expect(sent.url).toBe('MyTeam');
        // the Filter button resets to the first page of the new result set
        expect(sent.page).toBe(1);
    });

    it('switches the query to inactive employees when the status filter is changed', async () => {
        const { container, props } = mountList({
            myTeamList: { list: listOf([employee()]), team_list: [], sub_department: [], filters: {} },
        });
        await changeAndSettle(container.querySelector('select[name="status"]'), '0');
        await clickAndSettle(button(container, 'Filter'));
        expect(payload(props).status).toBe('0');
    });

    it('loads the sub-departments of a picked department and files it into the query', async () => {
        const { container, props } = mountList({
            myTeamList: { list: listOf([employee()]), team_list: [], sub_department: [], filters: {} },
        });
        await changeAndSettle(container.querySelector('[data-testid="react-select-department_id"]'), '9');

        expect(props.fetchSubDepartmentUnderDepartment).toHaveBeenCalledTimes(1);
        expect(props.fetchSubDepartmentUnderDepartment).toHaveBeenCalledWith(42, 9);

        await clickAndSettle(button(container, 'Filter'));
        expect(payload(props).department_id).toBe(9);
    });

    it('narrows the query to a sub-department when one is chosen', async () => {
        const { container, props } = mountList({
            myTeamList: {
                list: listOf([employee()]), team_list: [],
                sub_department: [{ Id: 21, Name: 'Delivery West' }, { Id: 22, Name: 'Delivery East' }],
                filters: {},
            },
        });
        await changeAndSettle(container.querySelector('select[name="sub_department_id"]'), '22');
        await clickAndSettle(button(container, 'Filter'));
        expect(payload(props).sub_department_id).toBe('22');
    });

    // FINDING EL-STALESUB-1
    it('leaves the cleared department\'s sub-departments listed and selectable with no department beside them', async () => {
        const { container, props } = mountList({
            myTeamList: {
                list: listOf([employee()]), team_list: [],
                sub_department: [{ Id: 21, Name: 'Delivery West' }],
                filters: {},
            },
        });
        const dept = container.querySelector('[data-testid="react-select-department_id"]');
        const sub = () => container.querySelector('select[name="sub_department_id"]');
        await changeAndSettle(dept, '7');
        await changeAndSettle(sub(), '21');

        // clear the department (react-select isClearable hands back null)
        await changeAndSettle(dept, '');
        expect(props.fetchSubDepartmentUnderDepartment).toHaveBeenCalledTimes(1); // only the pick

        // the clear does blank the current sub-department choice...
        expect(sub().value).toBe('');
        // ...but the options themselves belong to the department that was just cleared and are
        // still on offer, because the call that would have emptied them is commented out.
        expect(Array.from(sub().querySelectorAll('option')).map((o) => o.value)).toEqual(['', '21']);

        // so the supervisor can pick one again and it reaches the server as an orphan filter
        await changeAndSettle(sub(), '21');
        await clickAndSettle(button(container, 'Filter'));
        const sent = payload(props);
        expect(sent).not.toHaveProperty('department_id');
        expect(sent.sub_department_id).toBe('21');
    });

    // FINDING EL-DEAD-1
    it('never reaches the team-under-department endpoint from any control on the screen', async () => {
        const { container, props } = mountList({
            myTeamList: {
                list: listOf([employee()]), team_list: [],
                sub_department: [{ Id: 21, Name: 'Delivery West' }], filters: {},
            },
        });
        await changeAndSettle(container.querySelector('[data-testid="react-select-department_id"]'), '7');
        await changeAndSettle(container.querySelector('select[name="sub_department_id"]'), '21');
        await changeAndSettle(container.querySelector('select[name="status"]'), '0');
        await changeAndSettle(container.querySelector('select[name="order_by"]'), 'name:asc');
        await clickAndSettle(button(container, 'Filter'));

        expect(props.fetchSubDepartmentUnderDepartment).toHaveBeenCalled();
        expect(props.fetchTeamUnderDepartment).not.toHaveBeenCalled();
    });

    it('handler-level: departmentSelected forwards a real department id and swallows a blank one', () => {
        // Handler-level unit test, named as such: departmentSelected has no caller on the screen
        // (see EL-DEAD-1), so its guard can only be walked through the instance.
        const { ref, props } = mountList({
            myTeamList: { list: listOf([employee()]), team_list: [], sub_department: [], filters: {} },
        });
        act(() => { ref.current.departmentSelected(''); });
        expect(props.fetchTeamUnderDepartment).not.toHaveBeenCalled();

        act(() => { ref.current.departmentSelected(7); });
        expect(props.fetchTeamUnderDepartment).toHaveBeenCalledWith(42, 7);
    });

    it('re-queries immediately with the chosen sort order', async () => {
        const { container, props } = mountList({
            myTeamList: { list: listOf([employee()]), team_list: [], sub_department: [], filters: {} },
        });
        await changeAndSettle(container.querySelector('select[name="order_by"]'), 'job_title:desc');

        expect(props.fetchMyTeamList).toHaveBeenCalledTimes(1);
        expect(payload(props).order_by).toBe('job_title:desc');
    });

    it('drops the sort filter entirely when the supervisor goes back to Default', async () => {
        const { container, props } = mountList({
            myTeamList: {
                list: listOf([employee()]), team_list: [], sub_department: [],
                filters: { order_by: 'name:asc' },
            },
        });
        await changeAndSettle(container.querySelector('select[name="order_by"]'), '');
        expect(payload(props)).not.toHaveProperty('order_by');
    });

    it('carries the requested page number into the query when a page is clicked', async () => {
        const { container, props } = mountList({
            myTeamList: {
                list: listOf([employee()], { total: 120, current_page: 1, last_page: 5 }),
                team_list: [], sub_department: [], filters: {},
            },
        });
        await clickAndSettle(container.querySelector('[data-testid="page-3"]'));
        expect(props.fetchMyTeamList).toHaveBeenCalledTimes(1);
        expect(payload(props).page).toBe(3);
    });
});

/* ==========================================================================
 * PHASE C - My Team -> DTR Logs   (container/MyTeam/DtrLogs/DtrLogs.js)
 * ======================================================================== */

describe('PHASE C - DTR Logs screen', () => {

    const logRow = (over = {}) => ({
        emp_num: '3001',
        full_name: 'Ana Cruz',
        department: 'Delivery',
        date: '2026-07-16',
        holidays: undefined,
        timezone: 'Asia/Manila',
        time_in: '08:00',
        time_out: '17:00',
        start_datetime: '2026-07-16 08:00',
        end_datetime: '2026-07-16 17:00',
        start_flexy_datetime: '2026-07-16 07:00',
        end_flexy_datetime: '2026-07-16 18:00',
        break_time: '01:00',
        user_POV: {
            time_in: '10:30', time_out: '19:30',
            start_datetime: '2026-07-16 10:30', end_datetime: '2026-07-16 19:30',
            start_flexy_datetime: '2026-07-16 09:30', end_flexy_datetime: '2026-07-16 20:30',
        },
        payroll_items: {
            rendered_hours: '08:00', sl: '0', vl: '0', ul: '0', other_leave: '0',
            late: '00:05', undertime: '00:00', night_diff: '00:00',
            overtime: '01:00', overtime_night_diff: '00:00',
        },
        ...over,
    });

    const dtrProps = (over = {}) => ({
        user: { id: 42, departments_handled: DEPARTMENTS, timezone: 'Europe/Brussels' },
        // "2026-07-16 00:00:00" is parsed as LOCAL midnight, so the formatted payload is the same
        // date in every timezone. A bare "2026-07-16" would be UTC midnight and could slip a day.
        settings: { current_payroll_cutoff: { start_date: '2026-07-16 00:00:00', end_date: '2026-07-31 00:00:00' } },
        dtrLogs: { isListLoaded: false, instance: {} },
        fetchDtrLogs: jest.fn(),
        exportDtrLogs: jest.fn(),
        ...over,
    });

    const mountDtr = (over = {}) => {
        const props = dtrProps(over);
        const ref = React.createRef();
        const utils = render(<MemoryRouter><DtrLogs ref={ref} {...props} /></MemoryRouter>);
        return { ...utils, props, ref };
    };

    const loaded = (rows) => ({
        isListLoaded: true,
        instance: { data: rows, pagination: { total: rows.length, current_page: 1, last_page: 1 } },
    });

    const pickDepartment = (container, id) =>
        changeAndSettle(container.querySelector('select[name="department_id"]'), id);

    // console.log is called once per rendered row by the source. It is silenced per test and the
    // accumulator is therefore reset before every test, so no test can observe another's output.
    beforeEach(() => { jest.spyOn(console, 'log').mockImplementation(() => {}); });
    afterEach(() => { console.log.mockRestore(); });

    /* -- C1 filters and validation -------------------------------------- */

    it('opens with the date range pre-filled from the current payroll cutoff and sends it as YYYY-MM-DD', async () => {
        const { container, props } = mountDtr();
        expect(container.querySelector('[data-testid="date-valid_from"]').value).toBe('2026-07-16');
        expect(container.querySelector('[data-testid="date-valid_to"]').value).toBe('2026-07-31');

        await pickDepartment(container, '7');
        await clickAndSettle(button(container, 'Generate'));

        expect(props.fetchDtrLogs).toHaveBeenCalledTimes(1);
        const sent = props.fetchDtrLogs.mock.calls[0][0];
        expect(sent.valid_from).toBe('2026-07-16');
        expect(sent.valid_to).toBe('2026-07-31');
    });

    it('refuses to query when settings carry no payroll cutoff to seed the date range', async () => {
        const { container, props } = mountDtr({ settings: {} });
        expect(container.querySelector('[data-testid="date-valid_from"]').value).toBe('');

        await pickDepartment(container, '7');
        await clickAndSettle(button(container, 'Generate'));

        expect(props.fetchDtrLogs).not.toHaveBeenCalled();
        expect(props.exportDtrLogs).not.toHaveBeenCalled();
        expect(container.textContent).toContain('This field is required');
    });

    it('refuses to query until a department is chosen, then queries with it', async () => {
        const { container, props } = mountDtr();
        await clickAndSettle(button(container, 'Generate'));
        expect(props.fetchDtrLogs).not.toHaveBeenCalled();
        expect(container.textContent).toContain('This field is required');

        await pickDepartment(container, '9');
        await clickAndSettle(button(container, 'Generate'));
        expect(props.fetchDtrLogs).toHaveBeenCalledTimes(1);
        expect(props.fetchDtrLogs.mock.calls[0][0].department_id).toBe('9');
    });

    it('refuses a date range that ends before it starts', async () => {
        const { container, props } = mountDtr();
        await pickDepartment(container, '7');
        await changeAndSettle(container.querySelector('[data-testid="date-valid_from"]'), '2026-08-20');
        await clickAndSettle(button(container, 'Generate'));

        expect(props.fetchDtrLogs).not.toHaveBeenCalled();
        expect(container.textContent).toContain('Please select a Valid From date.');
    });

    it('sends exactly the four populated filters and never the internal export flag', async () => {
        const { container, props } = mountDtr();
        await pickDepartment(container, '7');
        await clickAndSettle(button(container, 'Generate'));

        const sent = props.fetchDtrLogs.mock.calls[0][0];
        expect(Object.keys(sent).sort())
            .toEqual(['department_id', 'is_active', 'valid_from', 'valid_to']);
        expect(sent.is_active).toBe(1);
        expect(sent).not.toHaveProperty('export');
        expect(sent).not.toHaveProperty('name');
    });

    it('switches the query to inactive employees when the status filter is changed', async () => {
        const { container, props } = mountDtr();
        await pickDepartment(container, '7');
        await changeAndSettle(container.querySelector('select[name="is_active"]'), '0');
        await clickAndSettle(button(container, 'Generate'));
        expect(props.fetchDtrLogs.mock.calls[0][0].is_active).toBe('0');
    });

    it('Export downloads instead of listing, and a following Generate lists instead of downloading', async () => {
        const { container, props } = mountDtr();
        await pickDepartment(container, '7');

        await clickAndSettle(button(container, 'Export'));
        expect(props.exportDtrLogs).toHaveBeenCalledTimes(1);
        expect(props.fetchDtrLogs).not.toHaveBeenCalled();
        expect(props.exportDtrLogs.mock.calls[0][0].department_id).toBe('7');

        await clickAndSettle(button(container, 'Generate'));
        expect(props.fetchDtrLogs).toHaveBeenCalledTimes(1);
        expect(props.exportDtrLogs).toHaveBeenCalledTimes(1);
    });

    it('handler-level: a typed name reaches the query and a blank one is stripped', async () => {
        // Handler-level unit test, named as such. The name box is <input type="textfield">, which
        // jsdom 11 does not normalise to "text", so React's change plugin will not fire for it in
        // this environment - see the header note. The box works in a real browser; the payload
        // rule it feeds is verified here instead.
        const { ref, props } = mountDtr();
        const base = {
            valid_from: new Date('2026-07-16T00:00:00'),
            valid_to: new Date('2026-07-31T00:00:00'),
            department_id: '7', is_active: 1, export: false,
        };
        act(() => { ref.current.onSubmitHandler({ ...base, name: 'Cruz' }); });
        expect(props.fetchDtrLogs.mock.calls[0][0].name).toBe('Cruz');

        act(() => { ref.current.onSubmitHandler({ ...base, name: '' }); });
        expect(props.fetchDtrLogs.mock.calls[1][0]).not.toHaveProperty('name');
    });

    /* -- C2 the log table ----------------------------------------------- */

    it('shows the empty message and no table until a search has been run', () => {
        const { container } = mountDtr();
        expect(container.textContent).toContain('Sorry, no record found');
        expect(container.querySelector('table.dtrSummary')).toBeNull();
    });

    it('lays out every returned log across the 23 DTR columns', () => {
        const { container } = mountDtr({
            dtrLogs: loaded([logRow({ holidays: [{ type: 'Regular', name: 'Independence Day' }] })]),
        });
        const table = container.querySelector('.dtrSummary');
        expect(table).not.toBeNull();
        expect(table.querySelectorAll('thead th')).toHaveLength(23);

        const cells = rowCells(table.querySelector('tbody tr'));
        expect(cells).toHaveLength(23);
        expect(cells.slice(0, 5)).toEqual(['3001', 'Ana Cruz', 'Delivery', '2026-07-16', 'Regular']);
        expect(cells[12]).toBe('01:00');                 // Break
        expect(cells.slice(13, 23))
            .toEqual(['08:00', '0', '0', '0', '0', '00:05', '00:00', '00:00', '01:00', '00:00']);
        // the holiday cell is built by DtrFormatter.displayHolidayType, which tags the type
        expect(table.querySelector('.log-Regular')).not.toBeNull();
    });

    it('blanks the payroll and point-of-view columns for a log the payroll run has not touched', () => {
        const { container } = mountDtr({
            dtrLogs: loaded([logRow({ payroll_items: undefined, user_POV: undefined, holidays: undefined })]),
        });
        const cells = rowCells(container.querySelector('.dtrSummary tbody tr'));
        expect(cells[4]).toBe('');                       // no holidays -> empty wrapper div
        expect(cells.slice(6, 12)).toEqual(['', '', '', '', '', '']);  // default POV reads user_POV
        expect(cells.slice(13, 23).join('')).toBe('');   // ten payroll columns, all empty
        // the identity columns still render, so the row is not lost
        expect(cells.slice(0, 4)).toEqual(['3001', 'Ana Cruz', 'Delivery', '2026-07-16']);
    });

    // FINDING DTRL-EMPTYSET-1
    it('replaces the empty message with a headed but bodyless table when a search matches nothing', () => {
        const { container } = mountDtr({ dtrLogs: loaded([]) });
        expect(container.textContent).not.toContain('Sorry, no record found');
        const table = container.querySelector('.dtrSummary');
        expect(table.querySelectorAll('thead th')).toHaveLength(23);
        expect(table.querySelectorAll('tbody tr')).toHaveLength(0);
        expect(container.querySelector('[data-testid="paginate"]')).not.toBeNull();
    });

    // FINDING DTRL-POV-INVERT-1
    it('swaps the point-of-view data against its own column labels when Toggle Outlook is pressed', async () => {
        const { container } = mountDtr({ dtrLogs: loaded([logRow()]) });

        // OFF: the header says the times are the Default ones, but the cells are read from the
        // field named user_POV, and the timezone shown is the employee's.
        expect(container.querySelector('.dtrSummary thead').textContent).toContain('(Default)');
        let cells = rowCells(container.querySelector('.dtrSummary tbody tr'));
        expect(cells[5]).toBe('Asia/Manila');
        expect(cells.slice(6, 12)).toEqual([
            '10:30', '19:30', '2026-07-16 10:30', '2026-07-16 19:30',
            '2026-07-16 09:30', '2026-07-16 20:30']);

        await clickAndSettle(button(container, 'Toggle Outlook'));

        // ON: the header now says (User), yet the cells switch to the RAW list fields and the
        // timezone shown is the logged-in supervisor's, not the employee's.
        expect(container.querySelector('.dtrSummary thead').textContent).toContain('(User)');
        cells = rowCells(container.querySelector('.dtrSummary tbody tr'));
        expect(cells[5]).toBe('Europe/Brussels');
        expect(cells.slice(6, 12)).toEqual([
            '08:00', '17:00', '2026-07-16 08:00', '2026-07-16 17:00',
            '2026-07-16 07:00', '2026-07-16 18:00']);
    });

    it('fills the blank point-of-view cells of a log with no user_POV once Toggle Outlook is on', async () => {
        const { container } = mountDtr({ dtrLogs: loaded([logRow({ user_POV: undefined })]) });
        expect(rowCells(container.querySelector('.dtrSummary tbody tr')).slice(6, 8)).toEqual(['', '']);

        await clickAndSettle(button(container, 'Toggle Outlook'));
        expect(rowCells(container.querySelector('.dtrSummary tbody tr')).slice(6, 8))
            .toEqual(['08:00', '17:00']);
    });

    // FINDING DTRL-TOGGLE-DROP-1
    it('tells the server about Toggle Outlook only while it is on', async () => {
        const { container, props } = mountDtr({ dtrLogs: loaded([logRow()]) });
        await pickDepartment(container, '7');

        // default (off) - the flag is stripped, because `false != ""` is false in JavaScript
        await clickAndSettle(button(container, 'Generate'));
        expect(props.fetchDtrLogs.mock.calls[0][0]).not.toHaveProperty('toggle_pov');

        await clickAndSettle(button(container, 'Toggle Outlook'));
        await clickAndSettle(button(container, 'Generate'));
        expect(props.fetchDtrLogs.mock.calls[1][0].toggle_pov).toBe(true);

        // switched back off - the server is told nothing at all, so it cannot distinguish
        // "turned off" from "not supplied"
        await clickAndSettle(button(container, 'Toggle Outlook'));
        await clickAndSettle(button(container, 'Generate'));
        expect(props.fetchDtrLogs.mock.calls[2][0]).not.toHaveProperty('toggle_pov');
    });

    it('keeps the Toggle Outlook button label stable and only flips its eye icon', async () => {
        const { container } = mountDtr({ dtrLogs: loaded([logRow()]) });
        const toggle = button(container, 'Toggle Outlook');
        expect(toggle.textContent.replace(/\s+/g, ' ').trim()).toBe('Toggle Outlook');
        expect(toggle.querySelector('i').getAttribute('class')).toBe('fa fa-eye-slash');

        await clickAndSettle(toggle);
        expect(button(container, 'Toggle Outlook').querySelector('i').getAttribute('class'))
            .toBe('fa fa-eye');
        // `{this.state.toggle_pov}` sits in the label but React never prints a boolean
        expect(button(container, 'Toggle Outlook').textContent.replace(/\s+/g, ' ').trim())
            .toBe('Toggle Outlook');
    });

    // FINDING DTRL-CONSOLE-1
    it('dumps every log row to the browser console while rendering the table', () => {
        const row = logRow();
        const { container } = mountDtr({ dtrLogs: loaded([row, logRow({ emp_num: '3002' })]) });

        expect(container.querySelectorAll('.dtrSummary tbody tr')).toHaveLength(2);
        const dumped = console.log.mock.calls.filter((c) => c[0] && c[0].emp_num);

        // The map runs once per render pass, so the dump repeats whenever the table re-renders —
        // asserting an exact call count would make this test depend on React's render scheduling.
        // What matters to the finding is the CONTENT: every row of the table, in order, with its
        // full payroll payload, is written to the browser console where any user can read it.
        expect(dumped.length % 2).toBe(0);
        const firstPass = dumped.slice(0, 2);
        expect(firstPass.map((c) => c[0].emp_num)).toEqual(['3001', '3002']);
        expect(firstPass.map((c) => c[1])).toEqual([0, 1]);
        expect(firstPass[0][0].full_name).toBe('Ana Cruz');
        // the salary-relevant fields go to the console too, not just the identifiers
        expect(firstPass[0][0].payroll_items.rendered_hours).toBe('08:00');
        expect(firstPass[0][0].payroll_items.overtime).toBe('01:00');
    });

    it('re-runs the search for the requested page when a page number is clicked', async () => {
        const { container, props } = mountDtr({
            dtrLogs: {
                isListLoaded: true,
                instance: {
                    data: [logRow()],
                    pagination: { total: 90, current_page: 1, last_page: 4 },
                },
            },
        });
        await pickDepartment(container, '7');
        await clickAndSettle(container.querySelector('[data-testid="page-2"]'));

        expect(props.fetchDtrLogs).toHaveBeenCalledTimes(1);
        const sent = props.fetchDtrLogs.mock.calls[0][0];
        expect(sent.page).toBe(2);
        expect(sent.department_id).toBe('7');
    });

    // FINDING DTRL-GUARD-1
    it('crashes the whole page instead of showing the access screen when the user carries no handled departments', () => {
        // React evaluates the children of <Wrapper> before Wrapper can decide whether the viewer
        // is allowed to see them, and the department dropdown maps user.departments_handled with
        // no guard. EmployeeList reads the same field defensively (`user?.departments_handled`),
        // so the field is known to be optional.
        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
        expect(() => render(
            <MemoryRouter>
                <DtrLogs {...dtrProps({ user: { id: 42, timezone: 'Europe/Brussels' } })} />
            </MemoryRouter>)).toThrow(TypeError);
        spy.mockRestore();
    });
});
