/**
 * evoxtest_MyTeamScheduleStatusResidueWave19.test.js
 *
 * SOURCE FILE UNDER TEST
 *   src/container/MyTeam/MyTeamSchedule/MyTeamSchedule.js  (displayStatus, line 501-529)
 *
 * MENU PATH
 *   My Team -> Team Schedule
 *
 * CURRENT MEASURED COVERAGE (full-suite run, 18 Aug, before this file)
 *   100% stmts / 98.96% branch / 100% fn - exactly one branch arm left, the fall-through
 *   at line 521 where a row's status matches none of the eight known tokens.
 *
 * WHY THIS MOUNTS THE DAY GRID
 *   displayStatus is a module-private function, and so are the three renderers that call
 *   it (DayTeamSchedule, CardComponent, MonthTeamSchedule). Neither is exported, so an
 *   instance created with `new MyTeamSchedule(props)` cannot reach it - the note in
 *   evoxtest_MyTeamScheduleAndListHandlersWave18 deferred this arm for that reason. The
 *   grid is therefore mounted, but ONLY the day view: the intermittent failure in
 *   MyTeamScheduleLifecycle lives in the week and month renderers (they index a
 *   holiday_list the daily reducer never supplies - see MTS-HOLIDAY-1). The day view
 *   below reads nothing but the row it is given, and the "overlapped" layout is used so
 *   that even the on_duty clock arithmetic is bypassed. Nothing here depends on the
 *   current date or time.
 *
 * ARM CLOSED HERE
 *   521  a status token the front end does not recognise
 *
 * FINDINGS
 *   MTS-STATUS-SILENT  displayStatus falls through with card.class left as the empty
 *                      string for any token outside the eight it knows. The bar is still
 *                      drawn, at full width, with the employee's name and shift on it -
 *                      but with no colour class at all, so it is visually indistinguishable
 *                      from a plain block and the supervisor gets no signal that the
 *                      server sent a status the screen cannot render. There is no default
 *                      arm and no console warning. Characterised below as today's
 *                      behaviour.
 *
 * ADDITIVE ONLY - no existing test file and no application source was modified.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

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
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading" />);
jest.mock('react-multi-select-component', () => () => <div data-testid="multiselect" />);
jest.mock('../../components/Template/ReportNavigator/ReportNavigator.js', () => () => null);

jest.mock('react-bootstrap', () => {
    const R = require('react');
    const passthrough = (tag) => ({ children, className, title }) =>
        R.createElement(tag, { className, title }, children);

    const Button = ({ children, onClick, type, className }) =>
        R.createElement('button', { type: type || 'button', onClick, className }, children);

    const Dropdown = ({ children }) => R.createElement('div', null, children);
    Dropdown.Toggle = ({ children }) => R.createElement('button', { type: 'button' }, children);
    Dropdown.Menu   = ({ children }) => R.createElement('div', null, children);
    Dropdown.Item   = ({ children, onClick }) =>
        R.createElement('button', { type: 'button', onClick }, children);

    const Form = ({ children }) => R.createElement('div', null, children);
    Form.Group = ({ children }) => R.createElement('div', null, children);
    const FormControlNS = ({ children }) => R.createElement('div', null, children);
    FormControlNS.Feedback = ({ children }) => R.createElement('div', null, children);
    Form.Control = FormControlNS;

    return {
        Card: passthrough('div'), Row: passthrough('div'), Col: passthrough('div'),
        Table: passthrough('table'), Badge: passthrough('span'), Tabs: passthrough('div'),
        Tab: () => null, InputGroup: passthrough('div'),
        FormControl: (p) => R.createElement('input', { name: p.name, onChange: p.onChange }),
        Button, Dropdown, Form,
    };
});

jest.mock('../../store/actions/filters/myTeamActions', () => ({
    fetchTeamSchedule: jest.fn(),
    fetchTeamUnderDepartment: jest.fn(),
    fetchSubDepartmentUnderDepartment: jest.fn(),
}));

global.links = new Proxy({}, { get: () => '/x/' });

const MyTeamSchedule =
    require('../../container/MyTeam/MyTeamSchedule/MyTeamSchedule').default;

// "overlapped" puts the label on the right-hand block and sizes both blocks from `hour`
// alone, so no clock reading takes part in the render.
const row = (over = {}) => ({
    Name: 'Ana Cruz',
    type: ['late'],
    Schedule: '09:00-18:00',
    day_type: 'overlapped',
    hour: 5,
    ...over,
});

// Fresh props per render: the constructor aliases props.team.filters onto this.state.
const renderDay = (rows) => render(
    <MemoryRouter>
        <MyTeamSchedule
            user={{ id: 7, departments_handled: [{ id: 3, department_name: 'Information Technology' }] }}
            team={{
                team_list: [],
                team_schedule: { data: rows, date_list: [], week_list: [], holiday_list: [] },
                filters: {},
            }}
            myTeamList={{ sub_department: [], filters: {} }}
            fetchTeamSchedule={jest.fn()}
            fetchTeamUnderDepartment={jest.fn()}
            fetchSubDepartmentUnderDepartment={jest.fn()}
        />
    </MemoryRouter>
);

// The coloured block is the second div of an employee's bar.
const colourBlock = (container, index = 0) =>
    container.querySelectorAll('.emp_sched')[index].querySelectorAll('div')[1];

let logSpy;
beforeEach(() => { logSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); });
afterEach(() => logSpy.mockRestore());

describe('My Team -> Team Schedule: a status the screen does not recognise', () => {

    // FINDING MTS-STATUS-SILENT: there is no default arm after the eight known tokens, so
    // card.class stays "" and the bar is painted with no colour class. The supervisor sees
    // an uncoloured block instead of any indication that the status was not understood.
    test('a status token outside the eight known ones paints the bar with no colour class at all _FINDING_MTS-STATUS-SILENT', () => {
        const { container } = renderDay([row({ Name: 'Ana Cruz', type: ['present'] })]);

        const block = colourBlock(container);
        expect(block).toHaveTextContent('Ana Cruz - 09:00-18:00');
        expect(block.className).toBe('');
        ['early', 'on_leave', 'holiday', 'rest_day', 'late', 'absent', 'no_schedule', 'no_status']
            .forEach((known) => expect(block).not.toHaveClass(known));
    });

    test('a row that arrived with no status tokens at all is painted the same uncoloured way', () => {
        const { container } = renderDay([row({ Name: 'Ben Reyes', type: [] })]);

        const block = colourBlock(container);
        expect(block).toHaveTextContent('Ben Reyes - 09:00-18:00');
        expect(block.className).toBe('');
    });

    test('a recognised token in the same payload still colours its own bar, so the gap is per row', () => {
        const { container } = renderDay([
            row({ Name: 'Ana Cruz', type: ['present'] }),
            row({ Name: 'Ben Reyes', type: ['no_status'] }),
            row({ Name: 'Cara Lim', type: ['on_leave'] }),
        ]);

        expect(container.querySelectorAll('.emp_sched')).toHaveLength(3);
        expect(colourBlock(container, 0).className).toBe('');
        expect(colourBlock(container, 1)).toHaveClass('no_status');
        expect(colourBlock(container, 2)).toHaveClass('on_leave');
    });

    test('the unrecognised row keeps its shift text, so only the colour is lost', () => {
        const { container } = renderDay([
            row({ Name: 'Ana Cruz', type: ['seconded'], Schedule: '' }),
        ]);

        // An empty Schedule leaves the text as just the name and the separator, exactly as
        // it does for a recognised status.
        expect(container.querySelector('.emp_sched')).toHaveAttribute('title', 'Ana Cruz - ');
        expect(colourBlock(container).className).toBe('');
    });
});
