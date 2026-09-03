/**
 * evoxtest_ManageTeamsFormArmsWave18.test.js
 *
 * SOURCE FILE UNDER TEST
 *   src/container/MyTeam/ManageTeams/ManageTeams.js
 *
 * MENU PATH
 *   My Team -> Manage Team
 *
 * CURRENT MEASURED COVERAGE (17 Aug run)
 *   11 uncovered functions / 2 uncovered branches. Seven of the eleven functions are the
 *   connect() wiring, covered in evoxtest_MyTeamReportConnectWiringWave18.test.js. This suite
 *   takes the remaining UI arms that evoxtest_ManageTeamsDeep2.test.js does not reach:
 *     - handleChange (ManageTeams.js:149), the only plain prototype method on the class
 *     - the inline `onChange={(e) => this.handleChange(e)}` on the Team Name box (line 356)
 *     - the empty arm of the Select Team dropdown (line 337), i.e. a lead who handles a
 *       department but owns no teams yet
 *
 * FINDINGS
 *   MT-DEADARM  The department dropdown at ManageTeams.js:375 re-tests
 *               `user.departments_handled?.length > 0` inside a block that only renders when
 *               `user.departments_handled.length > 0` is already true (line 351). Its `null`
 *               arm (line 383) is therefore unreachable through any UI state. No test is
 *               written for it; recorded so the next coverage pass does not chase it.
 *
 * ADDITIVE ONLY — no existing test file touched, no application source changed.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
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
    Row:              ({ children }) => <div>{children}</div>,
    Col:              ({ children }) => <div>{children}</div>,
}));
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading" />);
jest.mock('react-multi-select-component', () => () => <div data-testid="multiselect" />);
jest.mock('../../services/DateFormatter', () => ({ convert_date: jest.fn((d) => d) }));
jest.mock('../../store/actions/lookup/lookupListActions', () => ({
    fetchUserList: jest.fn(), fetchTeamsHandledList: jest.fn(),
    fetchDepartmentUsersList: jest.fn(), fetchTeam: jest.fn(),
}));
jest.mock('../../store/actions/team/teamActions', () => ({
    createTeam: jest.fn(), updateTeam: jest.fn(), deleteTeam: jest.fn(),
}));
jest.mock('../../store/actions/redirectActions', () => ({ setRedirect: jest.fn() }));

const ManageTeams = require('../../container/MyTeam/ManageTeams/ManageTeams').default;

const makeActions = () => ({
    fetchUserList: jest.fn(() => Promise.resolve()),
    fetchTeamsHandledList: jest.fn(() => Promise.resolve()),
    fetchDepartmentUsersList: jest.fn(() => Promise.resolve()),
    fetchTeam: jest.fn(() => Promise.resolve()),
    createTeam: jest.fn(() => Promise.resolve()),
    updateTeam: jest.fn(() => Promise.resolve()),
    deleteTeam: jest.fn(() => Promise.resolve()),
});

const baseProps = {
    user: { id: 42, departments_handled: [{ id: 5, department_name: 'Engineering' }] },
    teams_handled: [{ id: 1, name: 'Alpha' }],
    team_leader: [{ id: 7, full_name: 'Lead One' }],
    department_users: [],
    team: null,
};

function renderMT(props = {}) {
    const ref = React.createRef();
    const actions = makeActions();
    const utils = render(
        <MemoryRouter>
            <ManageTeams ref={ref} {...baseProps} {...actions} {...props} />
        </MemoryRouter>
    );
    return { ...utils, ref, actions };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => jest.clearAllMocks());

describe('ManageTeams — the Team Name box', () => {
    test('typing a team name writes it to state under the input own name attribute', async () => {
        const { ref, container } = renderMT();

        await ref.current.handleSelectActionType({ target: { value: 'store' } });
        await flush(); // componentDidUpdate's reset settles before the field is read
        // componentDidUpdate blanks name on an action-type change; seed a string so the input
        // is a genuinely controlled field before the keystroke.
        // Formik reinitialises from state (enableReinitialize), so let that commit before reading.
        await act(async () => {
            ref.current.setState({ name: 'Alpha' });
            await flush();
        });

        const nameInput = container.querySelector('input[name="name"]');
        expect(nameInput).not.toBeNull();
        expect(nameInput.value).toBe('Alpha');

        fireEvent.change(nameInput, { target: { name: 'name', value: 'Bravo Squad' } });
        expect(ref.current.state.name).toBe('Bravo Squad');
    });

    test('handleChange keys state off the field name, so a second field cannot overwrite the first', () => {
        const { ref } = renderMT();

        ref.current.handleChange({ target: { name: 'name', value: 'Charlie' } });
        expect(ref.current.state.name).toBe('Charlie');

        ref.current.handleChange({ target: { name: 'other_field', value: 'x' } });
        expect(ref.current.state.name).toBe('Charlie');
        expect(ref.current.state.other_field).toBe('x');
    });

    test('an emptied Team Name box stores the empty string rather than being ignored', () => {
        // Yup requires a name, so the empty string has to survive into state for the
        // "This field is required" message to be produced on submit.
        const { ref } = renderMT();
        ref.current.handleChange({ target: { name: 'name', value: '' } });
        expect(ref.current.state.name).toBe('');
    });
});

describe('ManageTeams — the Select Team dropdown in update mode', () => {
    test('a lead who owns teams gets one option per team on top of the placeholder', async () => {
        const { ref, container } = renderMT({
            teams_handled: [{ id: 1, name: 'Alpha' }, { id: 2, name: 'Bravo' }],
        });
        await ref.current.handleSelectActionType({ target: { value: 'update' } });
        await flush();

        const options = container.querySelectorAll('select[name="team_id"] option');
        expect(options).toHaveLength(3);
        expect(options[1]).toHaveAttribute('value', '1');
        expect(options[1].textContent).toBe('Alpha');
        expect(options[2].textContent).toBe('Bravo');
    });

    test('a lead who owns no teams yet gets the placeholder only, and no team rows', async () => {
        const { ref, container } = renderMT({ teams_handled: [] });
        await ref.current.handleSelectActionType({ target: { value: 'update' } });
        await flush();

        const select = container.querySelector('select[name="team_id"]');
        expect(select).not.toBeNull();
        const options = select.querySelectorAll('option');
        expect(options).toHaveLength(1);
        expect(options[0]).toHaveAttribute('label', 'Select Team');
    });

    test('the dropdown is absent entirely in create mode', async () => {
        const { ref, container } = renderMT();
        await ref.current.handleSelectActionType({ target: { value: 'store' } });
        await flush();
        expect(container.querySelector('select[name="team_id"]')).toBeNull();
    });
});
