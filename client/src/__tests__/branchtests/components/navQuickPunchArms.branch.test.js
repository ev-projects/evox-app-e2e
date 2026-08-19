/**
 * EVOX — Jest: the header clock's dropdown
 *
 * Sources under test:
 *   src/components/Template/NavQuickPunch/NavQuickPunch.js
 *
 * Menu path: global — the panel that drops out of the top navigation clock (Recent DTR /
 *            DTR Notifications / Incomplete Timelogs).
 *
 * Coverage before this file: NavQuickPunch 74.36% statements / 81.82% branches / 66.67%
 *   functions. What was open: the whole punch handler, the one-shot load gate that guards the
 *   two mount fetches, and the store wiring.
 *
 * Rules asserted here (both arms of every conditional):
 *   - The dropdown asks for the recent DTR and the DTR notifications exactly once, on the first
 *     render that has a signed-in user, and never again on a re-render; with no user id it asks
 *     for nothing.
 *   - The third tab is labelled with the count of days missing either punch, and is left blank
 *     when every day is complete and when there are no notifications at all.
 *   - A punch posted from the dropdown carries the filled fields only, against the signed-in user.
 *   - mapStateToProps reads the four slices the dropdown needs; mapDispatchToProps can refresh
 *     the DTR, the notifications and the incomplete list, clear the cache and post a punch.
 *
 * Determinism: fake timers, no date-dependent assertion. NavPuncher and the two panels inside
 * the dropdown are connected screens of their own and are stubbed out.
 *
 * Dead code observed (not a defect): lines 72-74 compute `showErr`, the "you clocked in on a day
 * with no default schedule" flag, and never render it. The user is not deprived of the warning —
 * RecentDtrNav, which sits in this dropdown's first tab, renders it from the same expression —
 * so this is a redundant copy rather than a missing banner. Line 55's onClickHandler is empty.
 */

import React from 'react';
import { render, act } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { MemoryRouter } from 'react-router-dom';

global.__connected = [];

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: (mapStateToProps, mapDispatchToProps) => (Component) => {
        global.__connected.push({ mapStateToProps, mapDispatchToProps });
        return Component;
    },
}));

jest.mock('jquery', () => jest.fn(() => ({ on: jest.fn() })));

jest.mock('../../../store/actions/userActions', () => ({ logOut: jest.fn() }));
jest.mock('../../../store/actions/dtr/quickpunchActions', () => ({
    biometrixLog: jest.fn((post_data, id) => ({ type: 'THUNK_BIOMETRIX', id })),
}));
jest.mock('../../../store/actions/dashboard/dashboardActions', () => ({
    getRecentDtr: jest.fn((user_id, from, to) => ({ type: 'THUNK_RECENT_DTR', user_id, from, to })),
    clearRecentDtrInstance: jest.fn(() => ({ type: 'THUNK_CLEAR_RECENT_DTR' })),
    getMyDtrNotifications: jest.fn(() => ({ type: 'THUNK_DTR_NOTIFICATIONS' })),
}));
jest.mock('../../../store/actions/dtr/dtrActions', () => ({
    getIncompleteDtr: jest.fn(() => ({ type: 'THUNK_INCOMPLETE_DTR' })),
}));

jest.mock('react-bootstrap', () => {
    const passthrough = ({ children }) => <div>{children}</div>;
    const Dropdown = passthrough;
    Dropdown.Toggle = passthrough;
    Dropdown.Menu = passthrough;
    Dropdown.Item = passthrough;
    return {
        Dropdown, Container: passthrough, Row: passthrough, Col: passthrough,
        Table: ({ children }) => <table>{children}</table>,
        Image: () => <img alt="" />, Spinner: () => <div />,
        Button: ({ children, onClick, type, disabled }) => (
            <button onClick={onClick} type={type} disabled={disabled}>{children}</button>
        ),
        Badge: ({ children }) => <span>{children}</span>,
        Tabs: ({ children }) => <div>{children}</div>,
        Tab: ({ children, title, id }) => <div data-tab-id={id} data-tab-title={String(title)}>{children}</div>,
    };
});

// The clock face and the two panels inside the dropdown are separately connected screens with
// their own suites; the dropdown's own wiring is what is under test here.
jest.mock('../../../components/Template/NavPuncher/NavPuncher', () => () => <div data-testid="nav-puncher" />);
jest.mock('../../../components/Dashboard/DtrNotifications', () => () => <div data-testid="dtr-notifications" />);
jest.mock('../../../components/Dashboard/RecentDtrNav', () => () => <div data-testid="recent-dtr-nav" />);

global.links = new Proxy({}, { get: (target, name) => '/x/' + String(name) });

const dashboardActions = require('../../../store/actions/dashboard/dashboardActions');
const dtrActions = require('../../../store/actions/dtr/dtrActions');

const NavQuickPunch = require('../../../components/Template/NavQuickPunch/NavQuickPunch').default;
const navQuickPunchWiring = global.__connected[global.__connected.length - 1];

beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    localStorage.clear();
});

afterEach(() => {
    jest.useRealTimers();
});

describe('NavQuickPunch — the one-shot load of the dropdown contents', () => {
    const renderQuickPunch = (props = {}) => {
        const ref = React.createRef();
        const getRecentDtr = jest.fn();
        const getMyDtrNotifications = jest.fn();
        const utils = render(
            <MemoryRouter>
                <NavQuickPunch
                    ref={ref}
                    user={{ id: 42 }}
                    settings={{}}
                    dashboard={{ recent_dtr: [], my_dtr_notifications: [], isNavDtrLoaded: true }}
                    incompletedtr={{}}
                    getRecentDtr={getRecentDtr}
                    getMyDtrNotifications={getMyDtrNotifications}
                    biometrixLog={jest.fn()}
                    {...props}
                />
            </MemoryRouter>,
        );
        return { ...utils, ref, getRecentDtr, getMyDtrNotifications };
    };

    test('a signed-in user triggers exactly one fetch of the recent DTR and the notifications', () => {
        const { ref, getRecentDtr, getMyDtrNotifications } = renderQuickPunch();

        expect(getRecentDtr).toHaveBeenCalledTimes(1);
        expect(getRecentDtr.mock.calls[0][0]).toBe(42);
        expect(getMyDtrNotifications).toHaveBeenCalledWith(42);
        expect(ref.current.state.NavHasLoaded).toBe(true);
    });

    test('a re-render does not fetch the dropdown contents a second time', () => {
        const { ref, getRecentDtr, getMyDtrNotifications } = renderQuickPunch();

        act(() => { ref.current.forceUpdate(); });

        expect(getRecentDtr).toHaveBeenCalledTimes(1);
        expect(getMyDtrNotifications).toHaveBeenCalledTimes(1);
    });

    test('a user whose id has not arrived yet triggers no fetch at all', () => {
        const { getRecentDtr, getMyDtrNotifications } = renderQuickPunch({ user: { id: null } });

        expect(getRecentDtr).not.toHaveBeenCalled();
        expect(getMyDtrNotifications).not.toHaveBeenCalled();
    });

    test('the incomplete-timelog tab counts the days missing either punch', () => {
        const { container } = renderQuickPunch({
            dashboard: {
                recent_dtr: [],
                my_dtr_notifications: [
                    { time_in: '09:00', time_out: null },
                    { time_in: null, time_out: '18:00' },
                    { time_in: '09:00', time_out: '18:00' },
                ],
                isNavDtrLoaded: true,
            },
        });

        expect(container.querySelector('[data-tab-id="incLogs"]'))
            .toHaveAttribute('data-tab-title', 'Incomplete Timelogs: 2');
    });

    test('the incomplete-timelog tab is left blank when every day is complete', () => {
        const { container } = renderQuickPunch({
            dashboard: {
                recent_dtr: [],
                my_dtr_notifications: [{ time_in: '09:00', time_out: '18:00' }],
                isNavDtrLoaded: true,
            },
        });

        expect(container.querySelector('[data-tab-id="incLogs"]'))
            .toHaveAttribute('data-tab-title', '');
    });

    test('with no notifications at all the tab is also left blank', () => {
        const { container } = renderQuickPunch();

        expect(container.querySelector('[data-tab-id="incLogs"]'))
            .toHaveAttribute('data-tab-title', '');
    });

    test('a punch from the dropdown posts the filled fields only, against the signed-in user', async () => {
        const biometrixLog = jest.fn();
        const { ref } = renderQuickPunch({ biometrixLog });

        await act(async () => {
            await ref.current.onSubmitHandler({ quickpunch: 'out', dtr_id: 200, remarks: null });
        });

        const [formData, userId] = biometrixLog.mock.calls[0];
        expect(formData.get('quickpunch')).toBe('out');
        expect(formData.get('dtr_id')).toBe('200');
        expect(formData.has('remarks')).toBe(false);
        expect(userId).toBe(42);
    });
});

describe('NavQuickPunch — store wiring', () => {
    test('the dropdown reads the user, settings, dashboard and incomplete-DTR slices', () => {
        const state = {
            user: { id: 42 },
            settings: { country: 'Philippines' },
            dashboard: { recent_dtr: [] },
            dtr: { incompleteDtr: { count: 3 } },
        };

        expect(navQuickPunchWiring.mapStateToProps(state)).toEqual({
            user: state.user,
            settings: state.settings,
            dashboard: state.dashboard,
            incompletedtr: { count: 3 },
        });
    });

    test('the dropdown can refresh the DTR, the notifications and the incomplete list, and clear its cache', () => {
        const dispatch = jest.fn();
        const props = navQuickPunchWiring.mapDispatchToProps(dispatch);

        props.getRecentDtr(42, '2026-08-18', '2026-08-19');
        props.getMyDtrNotifications();
        props.clearRecentDtrInstance();
        props.getIncompleteDtr();
        props.biometrixLog('PAYLOAD', 42);

        expect(dashboardActions.getMyDtrNotifications).toHaveBeenCalledTimes(1);
        expect(dashboardActions.clearRecentDtrInstance).toHaveBeenCalledTimes(1);
        expect(dtrActions.getIncompleteDtr).toHaveBeenCalledTimes(1);
        expect(dispatch).toHaveBeenNthCalledWith(2, { type: 'THUNK_DTR_NOTIFICATIONS' });
        expect(dispatch).toHaveBeenNthCalledWith(3, { type: 'THUNK_CLEAR_RECENT_DTR' });
        expect(dispatch).toHaveBeenNthCalledWith(4, { type: 'THUNK_INCOMPLETE_DTR' });
        expect(dispatch).toHaveBeenNthCalledWith(5, { type: 'THUNK_BIOMETRIX', id: 42 });
    });
});

