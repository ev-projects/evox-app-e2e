/**
 * evoxtest_ManageTeamsDeep2.test.js
 * Wave-3 coverage for container/MyTeam/ManageTeams/ManageTeams.js (29 Jul: 66 unc / 29%).
 * Arms: componentWillMount fetches, onSubmitHandler store/update (multiselect →
 * id-array mapping, _method PUT, refresh) + confirm-declined, deleteTeam confirm arms,
 * action-type reset via componentDidUpdate, team-select fetch, department cascade,
 * and componentWillReceiveProps' three change detectors.
 * ADDITIVE ONLY. Menu: My Team → Manage Teams (route: via team management).
 */

import React from 'react';
import { render } from '@testing-library/react';
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

function makeActions() {
    return {
        fetchUserList: jest.fn(() => Promise.resolve()),
        fetchTeamsHandledList: jest.fn(() => Promise.resolve()),
        fetchDepartmentUsersList: jest.fn(() => Promise.resolve()),
        fetchTeam: jest.fn(() => Promise.resolve()),
        createTeam: jest.fn(() => Promise.resolve()),
        updateTeam: jest.fn(() => Promise.resolve()),
        deleteTeam: jest.fn(() => Promise.resolve()),
        setRedirect: jest.fn(),
    };
}

const baseProps = {
    user: { id: 42, departments_handled: [{ id: 5, department_name: 'Engineering' }] },
    teams_handled: [{ id: 1, name: 'Alpha' }],
    team_leader: [{ id: 7, full_name: 'Lead One' }],
    department_users: [],
    team: null,
};

function renderMT(props = {}, actions = makeActions()) {
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter>
            <ManageTeams ref={ref} {...baseProps} {...actions} {...props} />
        </MemoryRouter>
    );
    return { ...utils, ref, actions, props: { ...baseProps, ...actions, ...props } };
}

function rerenderMT(utils, nextProps) {
    utils.rerender(
        <MemoryRouter>
            <ManageTeams ref={utils.ref} {...utils.props} {...nextProps} />
        </MemoryRouter>
    );
}

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => jest.clearAllMocks());

describe('ManageTeams — mount and submit arms', () => {
    test('mount fetches the team-leader list and the teams handled by the user', async () => {
        const { actions } = renderMT();
        expect(actions.fetchUserList).toHaveBeenCalledWith('team_leader', { page: 'all' });
        await flush(); // componentWillMount awaits the first fetch before the second
        expect(actions.fetchTeamsHandledList).toHaveBeenCalledWith(42);
    });

    test('store maps multiselects to id arrays, creates the team and refreshes', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { ref, actions } = renderMT();
        await ref.current.onSubmitHandler({
            action_type: 'store', name: 'New Team', department_id: 5,
            team_handlers: [{ label: 'Lead One', value: 7 }],
            team_users: [{ label: 'User A', value: 9 }, { label: 'User B', value: 10 }],
        });

        expect(actions.createTeam).toHaveBeenCalledTimes(1);
        const fd = actions.createTeam.mock.calls[0][0];
        expect(fd.team_handlers).toEqual([7]);
        expect(fd.team_users).toEqual([9, 10]);
        expect(fd.name).toBe('New Team');
        expect(actions.fetchTeamsHandledList).toHaveBeenCalledWith(42);
        confirmSpy.mockRestore();
    });

    test('update adds _method PUT and targets the team id; declined confirm does nothing', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm');
        const { ref, actions } = renderMT();

        confirmSpy.mockReturnValueOnce(true);
        await ref.current.onSubmitHandler({
            action_type: 'update', team_id: 3, name: 'Renamed',
            team_handlers: [{ value: 7 }], team_users: [],
        });
        expect(actions.updateTeam).toHaveBeenCalledTimes(1);
        const [id, fd] = actions.updateTeam.mock.calls[0];
        expect(id).toBe(3);
        expect(fd._method).toBe('PUT');

        confirmSpy.mockReturnValueOnce(false);
        await ref.current.onSubmitHandler({ action_type: 'store', team_handlers: [], team_users: [] });
        expect(actions.createTeam).not.toHaveBeenCalled();
        confirmSpy.mockRestore();
    });

    test('deleteTeam confirms, deletes the selected team, refreshes and resets selection', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { ref, actions } = renderMT();
        ref.current.setState({ selectedTeam: '3', selectedTeamLeaders: [{ value: 7 }] });

        await ref.current.deleteTeam();
        expect(actions.deleteTeam).toHaveBeenCalledWith('3');
        expect(ref.current.state.selectedTeam).toBeNull();
        expect(ref.current.state.selectedTeamLeaders).toEqual([]);

        confirmSpy.mockReturnValue(false);
        await ref.current.deleteTeam();
        expect(actions.deleteTeam).toHaveBeenCalledTimes(1); // unchanged
        confirmSpy.mockRestore();
    });
});

describe('ManageTeams — selection handlers', () => {
    test('choosing an action type resets team/department/member selections (componentDidUpdate)', async () => {
        const { ref } = renderMT();
        ref.current.setState({ selectedTeam: '3', selectedTeamUsers: [{ value: 9 }] });
        await ref.current.handleSelectActionType({ target: { value: 'update' } });
        await flush();

        expect(ref.current.state.selectedActionType).toBe('update');
        expect(ref.current.state.selectedTeam).toBeNull();
        expect(ref.current.state.selectedTeamUsers).toEqual([]);
    });

    test('selecting a team fetches it; empty value is ignored', async () => {
        const { ref, actions } = renderMT();
        await ref.current.handleSelectTeam({ target: { value: '3' } });
        expect(actions.fetchTeam).toHaveBeenCalledWith('3');
        expect(ref.current.state.selectedTeam).toBe('3');

        await ref.current.handleSelectTeam({ target: { value: '' } });
        expect(actions.fetchTeam).toHaveBeenCalledTimes(1);
    });

    test('department selection fetches its users and clears member selections', async () => {
        const { ref, actions } = renderMT();
        ref.current.setState({ selectedTeamLeaders: [{ value: 7 }] });
        await ref.current.setSelectedDepartment(5);
        expect(actions.fetchDepartmentUsersList).toHaveBeenCalledWith(5);
        expect(ref.current.state.selectedDepartment).toBe(5);
        expect(ref.current.state.selectedTeamLeaders).toEqual([]);
    });
});

describe('ManageTeams — componentWillReceiveProps detectors', () => {
    test('team_leader and department_users changes rebuild the multiselect lists', () => {
        const utils = renderMT();
        rerenderMT(utils, {
            team_leader: [{ id: 8, full_name: 'Lead Two' }],
            department_users: [{ id: 9, full_name: 'User A' }],
        });
        expect(utils.ref.current.state.teamLeadersList).toEqual([{ label: 'Lead Two', value: 8 }]);
        expect(utils.ref.current.state.teamUserList).toEqual([{ label: 'User A', value: 9 }]);
    });

    test('loaded team hydrates name, department cascade and both member selections', async () => {
        const utils = renderMT();
        rerenderMT(utils, {
            team: {
                name: 'Alpha', department_id: 5,
                team_handlers: [{ id: 7, full_name: 'Lead One' }],
                team_users: [{ id: 9, full_name: 'User A' }],
            },
        });
        await flush();

        const s = utils.ref.current.state;
        expect(s.name).toBe('Alpha');
        expect(utils.props.fetchDepartmentUsersList).toHaveBeenCalledWith(5);
        expect(s.selectedTeamLeaders).toEqual([{ label: 'Lead One', value: 7 }]);
        expect(s.selectedTeamUsers).toEqual([{ label: 'User A', value: 9 }]);
    });
});
