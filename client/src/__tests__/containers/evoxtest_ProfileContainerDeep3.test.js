/**
 * evoxtest_ProfileContainerDeep3.test.js
 * Source under test: src/container/Profile/Profile.js
 * Menu: (avatar) -> My Profile / My Team -> employee (route: profile/:id)
 *
 * Wave-6 residue: 14 uncovered functions (mapStateToProps plus all twelve dispatch handlers —
 * the whole store wiring of the page) and 1 uncovered branch arm (the avatar fallback when the
 * employee has no photo on file). Both are covered here, together with the tab switch that
 * decides which fetch the page fires.
 *
 * ADDITIVE ONLY — no existing test, mock or app file is touched.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
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
    Content:          ({ children, title }) => <div><span data-testid="content-title">{title}</span>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
}));
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/Template/BackButton', () => () => <div />);
jest.mock('../../components/ChangePasswordForm', () => () => <div />);
jest.mock('../../container/Profile/PersonalInformation', () => () => <div data-testid="tab-personal" />);
jest.mock('../../container/Profile/JobInformation', () => () => <div data-testid="tab-job" />);
jest.mock('../../container/Profile/TimeOff', () => () => <div data-testid="tab-timeoff" />);
jest.mock('../../container/Profile/Schedule', () => () => <div data-testid="tab-schedule" />);
jest.mock('../../container/Profile/ScheduleHistory', () => () => <div data-testid="tab-schedule-history" />);
jest.mock('../../container/Profile/LeaveCredits', () => () => <div />);
jest.mock('react-select', () => () => <select />);
jest.mock('../../services/Authenticator', () => ({
    scanFeature: jest.fn(() => true), scanLevel: jest.fn(() => false), check: jest.fn(() => true),
}));
jest.mock('../../store/actions/profile/profileActions', () => ({
    fetchProfile:            jest.fn((id) => ({ type: 'P_PROFILE', id })),
    fetchPersonalInformation: jest.fn((id) => ({ type: 'P_PERSONAL', id })),
    fetchJobInformation:     jest.fn((id) => ({ type: 'P_JOB', id })),
    fetchLeaveCredits:       jest.fn((id) => ({ type: 'P_CREDITS', id })),
    fetchSchedule:           jest.fn((id) => ({ type: 'P_SCHED', id })),
    fetchScheduleHistory:    jest.fn((id, params) => ({ type: 'P_SCHED_HIST', id, params })),
    fetchTimeOff:            jest.fn((id, s, e) => ({ type: 'P_TIMEOFF', id, s, e })),
    fetchTemporarySchedule:  jest.fn((id) => ({ type: 'P_TEMP_SCHED', id })),
    setDateList:             jest.fn((d) => ({ type: 'P_DATES', d })),
    setWeekList:             jest.fn((w) => ({ type: 'P_WEEKS', w })),
    setScope:                jest.fn((s) => ({ type: 'P_SCOPE', s })),
}));
jest.mock('../../store/actions/dtr/dtrActions', () => ({
    viewEmployeeDtr: jest.fn((id, f, t) => ({ type: 'DTR_VIEW', id, f, t })),
}));

const Profile = require('../../container/Profile/Profile').default;
const profileActions = require('../../store/actions/profile/profileActions');
const dtrActions = require('../../store/actions/dtr/dtrActions');

function makeActions() {
    return {
        fetchProfile: jest.fn(), fetchPersonalInformation: jest.fn(), fetchJobInformation: jest.fn(),
        fetchLeaveCredits: jest.fn(), fetchSchedule: jest.fn(), fetchScheduleHistory: jest.fn(),
        fetchTimeOff: jest.fn(), fetchTemporarySchedule: jest.fn(), setDateList: jest.fn(),
        setWeekList: jest.fn(), setScope: jest.fn(), viewEmployeeDtr: jest.fn(),
    };
}

const baseProfile = {
    details: { id: 7, full_name: 'Jane Doe', department: 'Engineering', job_title: 'Developer' },
    profile_picture: null,
    leaves_list: [],
    schedule: {},
    personal_information: {},
    employment_status: {},
    job_information: {},
};

function renderProfile(props = {}, actions = makeActions()) {
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter>
            <Profile
                ref={ref}
                profile={{ ...baseProfile, ...(props.profile || {}) }}
                user={{ id: 7 }}
                page={{ isReloading: false }}
                dtr={{ list: [] }}
                params={{ id: '7' }}
                location={{ pathname: '/profile/7' }}
                {...actions}
                {...props}
            />
        </MemoryRouter>
    );
    return { ...utils, ref, actions };
}

beforeEach(() => jest.clearAllMocks());

describe('Profile — opening an employee page', () => {
    test('mount loads the DTR week, the profile and the personal-information tab', () => {
        const { actions, getByTestId } = renderProfile();

        expect(actions.fetchProfile).toHaveBeenCalledWith('7');
        expect(actions.fetchPersonalInformation).toHaveBeenCalledWith('7');
        expect(actions.setScope).toHaveBeenCalledWith('week');
        expect(actions.viewEmployeeDtr).toHaveBeenCalledTimes(1);
        const [id, from, to] = actions.viewEmployeeDtr.mock.calls[0];
        expect(id).toBe('7');
        expect(from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        getByTestId('tab-personal');
    });

    test('an employee with a stored photo shows it inline; without one the default avatar is used', () => {
        const withPhoto = renderProfile({ profile: { ...baseProfile, profile_picture: 'QUJD' } });
        expect(withPhoto.container.querySelector('img').getAttribute('src')).toBe('data:image/jpg;base64,QUJD');

        const withoutPhoto = renderProfile();
        expect(withoutPhoto.container.querySelector('img').getAttribute('src')).toBe('/images/default-user-image.png');
    });

    test('the tab strip is hidden while the profile is still empty or reloading', () => {
        const empty = renderProfile({ profile: { ...baseProfile, details: {} } });
        expect(empty.queryByTestId('tab-personal')).toBeNull();

        const reloading = renderProfile({ page: { isReloading: true } });
        expect(reloading.queryByTestId('tab-personal')).toBeNull();
    });

    test('each tab fires only its own fetch', () => {
        const { ref, actions, getByTestId } = renderProfile();
        actions.fetchPersonalInformation.mockClear();

        ref.current.setTab('job_information');
        expect(actions.fetchJobInformation).toHaveBeenCalledWith('7');
        getByTestId('tab-job');

        ref.current.setTab('time_off');
        expect(actions.fetchLeaveCredits).toHaveBeenCalledWith('7');
        expect(actions.fetchTimeOff).toHaveBeenCalledTimes(1);

        ref.current.setTab('schedule');
        expect(actions.fetchSchedule).toHaveBeenCalledWith('7');
        expect(actions.fetchTemporarySchedule).toHaveBeenCalledWith('7');

        ref.current.setTab('schedule_history');
        expect(actions.fetchScheduleHistory).toHaveBeenCalledWith('7', null);

        ref.current.setTab('personal_information');
        expect(actions.fetchPersonalInformation).toHaveBeenCalledWith('7');
        expect(actions.fetchJobInformation).toHaveBeenCalledTimes(1);
    });

    test('navigating to another employee reloads the page from scratch', () => {
        const { ref, actions } = renderProfile();
        actions.fetchProfile.mockClear();

        ref.current.componentDidUpdate(
            { location: { pathname: '/profile/9' }, params: { id: '7' } },
            ref.current.state
        );

        expect(actions.fetchProfile).toHaveBeenCalledWith('7');
    });
});

describe('Profile — store wiring', () => {
    test('mapStateToProps exposes the profile, user, dtr and page slices', () => {
        const state = { profile: { details: {} }, user: { id: 7 }, dtr: { list: [] }, page: { isReloading: false }, junk: 1 };
        expect(Profile.__mapStateToProps(state)).toEqual({
            profile: { details: {} }, user: { id: 7 }, dtr: { list: [] }, page: { isReloading: false },
        });
    });

    test('every mapDispatchToProps handler dispatches its own action creator', () => {
        const dispatch = jest.fn();
        const p = Profile.__mapDispatchToProps(dispatch);

        p.fetchProfile(7);
        p.fetchPersonalInformation(7);
        p.fetchJobInformation(7);
        p.fetchLeaveCredits(7);
        p.fetchSchedule(7);
        p.fetchScheduleHistory(7, { page: 1 });
        p.fetchTimeOff(7, 'from', 'to');
        p.fetchTemporarySchedule(7);
        p.setDateList(['d']);
        p.setWeekList({ week_list: [] });
        p.setScope('week');
        p.viewEmployeeDtr(7, 'from', 'to');

        expect(profileActions.fetchScheduleHistory).toHaveBeenCalledWith(7, { page: 1 });
        expect(profileActions.fetchTimeOff).toHaveBeenCalledWith(7, 'from', 'to');
        expect(dtrActions.viewEmployeeDtr).toHaveBeenCalledWith(7, 'from', 'to');
        expect(dispatch.mock.calls.map((c) => c[0].type)).toEqual([
            'P_PROFILE', 'P_PERSONAL', 'P_JOB', 'P_CREDITS', 'P_SCHED', 'P_SCHED_HIST',
            'P_TIMEOFF', 'P_TEMP_SCHED', 'P_DATES', 'P_WEEKS', 'P_SCOPE', 'DTR_VIEW',
        ]);
    });
});
