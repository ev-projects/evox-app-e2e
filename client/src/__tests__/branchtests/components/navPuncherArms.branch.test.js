/**
 * EVOX — Jest: the header clock's punch buttons
 *
 * Sources under test:
 *   src/components/Template/NavPuncher/NavPuncher.js
 *
 * Menu path: global — the clock in the top navigation bar, on every authenticated page.
 *
 * Coverage before this file: NavPuncher 91.75% statements / 85.71% branches / 85.71% functions.
 *   What was open: the render arms that read yesterday's shift when today has not started, the
 *   empty-field arm of the punch payload, the canClockOut guard and the store wiring.
 *
 * Rules asserted here (both arms of every conditional):
 *   - When yesterday's shift is still within its clock-out window and today has not started,
 *     the header offers Clock Out for yesterday; once yesterday has both a clock in and a clock
 *     out it reads "Day Completed" instead.
 *   - A punch payload never carries a field the form left empty, and always carries the stored
 *     session id and the signed-in user's id.
 *   - canClockOut answers zero when it has neither a clock-in nor a comparison point, and the
 *     whole-hour distance otherwise.
 *   - mapStateToProps/mapDispatchToProps read and dispatch what the header clock needs.
 *
 * Determinism: fake timers throughout; canClockOut is driven from an explicit comparison point
 * set on the instance, so no assertion depends on the day the suite runs.
 *
 * Dead code observed (not tested, not a defect reachable from the UI): NavPuncher computes
 * `target_previous` over four nested conditions (lines 187-197) and never reads it; addSeconds
 * and onUIHandler are only referenced from commented-out code.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
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

jest.mock('../../../services/Authenticator', () => ({
    __esModule: true,
    default: {
        scanLevel: jest.fn(() => false),
        scanFeature: jest.fn((f) => f === 'login'),
        scanLevel_Feature: jest.fn(() => false),
        check: jest.fn(() => false),
    },
}));

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
    const ReactStub = require('react');
    const passthrough = ({ children }) => <div>{children}</div>;
    const Dropdown = passthrough;
    Dropdown.Toggle = passthrough;
    Dropdown.Menu = passthrough;
    Dropdown.Item = passthrough;
    const Modal = ({ children, show }) => (show ? <div data-testid="modal">{children}</div> : null);
    Modal.Header = passthrough; Modal.Body = passthrough; Modal.Footer = passthrough; Modal.Title = passthrough;
    const Form = passthrough; Form.Group = passthrough; Form.Label = passthrough;
    Form.Control = ({ children, ...rest }) => <select {...rest}>{children}</select>;
    return {
        Modal, Form, Dropdown, Container: passthrough, Row: passthrough, Col: passthrough,
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

global.links = new Proxy({}, { get: (target, name) => '/x/' + String(name) });

const quickpunchActions = require('../../../store/actions/dtr/quickpunchActions');
const dashboardActions = require('../../../store/actions/dashboard/dashboardActions');

const lastWiring = () => global.__connected[global.__connected.length - 1];

const NavPuncher = require('../../../components/Template/NavPuncher/NavPuncher').default;
const navPuncherWiring = lastWiring();

beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    localStorage.clear();
    localStorage.setItem('session_id', 'sess-1');
});

afterEach(() => {
    jest.useRealTimers();
});

const renderPuncher = (recent_dtr, extra = {}) => {
    const ref = React.createRef();
    const biometrixLog = jest.fn();
    const utils = render(
        <MemoryRouter>
            <NavPuncher
                ref={ref}
                user={{ id: 42, first_name: 'Ana' }}
                settings={{}}
                dashboard={{ isNavDtrLoaded: true, recent_dtr, ...extra }}
                biometrixLog={biometrixLog}
                getRecentDtr={jest.fn()}
            />
        </MemoryRouter>,
    );
    return { ...utils, ref, biometrixLog };
};

describe('NavPuncher — yesterday\'s shift is still open', () => {
    test('a yesterday shift still within its window offers Clock Out even though today is untouched', () => {
        const { getByRole } = renderPuncher([
            { id: 100, is_rest_day: 0, with_in_time: true, time_in: '2026-08-18 22:00:00', time_out: null },
            { id: 200, is_rest_day: 0, with_in_time: false, time_in: null, time_out: null },
        ]);

        const button = getByRole('button', { name: /clock out/i });
        expect(button).not.toBeDisabled();
    });

    test('once yesterday has both punches the header reads Day Completed and offers nothing to click', () => {
        const { getByRole } = renderPuncher([
            {
                id: 100, is_rest_day: 0, with_in_time: true,
                time_in: '2026-08-18 22:00:00', time_out: '2026-08-19 07:00:00',
            },
            { id: 200, is_rest_day: 0, with_in_time: false, time_in: null, time_out: null },
        ]);

        const button = getByRole('button', { name: /day completed/i });
        expect(button).toBeDisabled();
    });

    test('today already punched in but not out still offers Clock Out for today', () => {
        const { getByRole } = renderPuncher([
            { id: 100, is_rest_day: 0, with_in_time: false, time_in: null, time_out: null },
            { id: 200, is_rest_day: 0, with_in_time: false, time_in: '2026-08-19 09:00:00', time_out: null },
        ]);

        expect(getByRole('button', { name: /clock out/i })).not.toBeDisabled();
    });

    test('a day with nothing punched anywhere offers Clock In', () => {
        const { getByRole } = renderPuncher([
            { id: 100, is_rest_day: 0, with_in_time: false, time_in: null, time_out: null },
            { id: 200, is_rest_day: 0, with_in_time: false, time_in: null, time_out: null },
        ]);

        expect(getByRole('button', { name: /clock in/i })).not.toBeDisabled();
    });
});

describe('NavPuncher — the punch payload', () => {
    test('a field the form left empty is not sent to the server', async () => {
        // Yesterday has a DTR row, today does not, so exactly one generate-punch arm fires.
        const { ref, biometrixLog } = renderPuncher([
            { id: 100, is_rest_day: 0, with_in_time: false, time_in: '09:00', time_out: '18:00' },
            {},
        ]);

        await act(async () => {
            await ref.current.onSubmitHandler({ quickpunch: 'in', dtr_id: null, isGenerate: true });
        });

        expect(biometrixLog).toHaveBeenCalledTimes(1);
        const [formData, userId] = biometrixLog.mock.calls[0];
        expect(formData.get('quickpunch')).toBe('in');
        expect(formData.has('dtr_id')).toBe(false);
        expect(formData.get('session_id')).toBe('sess-1');
        expect(userId).toBe(42);
    });

    test('canClockOut answers zero with neither a clock-in nor a comparison point', () => {
        const { ref } = renderPuncher([]);

        act(() => {
            ref.current.setState({ compare_to_clock_in: null });
        });

        expect(ref.current.canClockOut(null)).toBe(0);
    });

    test('canClockOut answers the whole-hour distance from the comparison point', () => {
        const { ref } = renderPuncher([]);

        act(() => {
            ref.current.setState({ compare_to_clock_in: new Date('2026-08-19T10:00:00Z') });
        });

        expect(ref.current.canClockOut('2026-08-19T07:00:00Z')).toBe(3);
    });

    test('dismissing the early-out warning closes it', () => {
        const { ref } = renderPuncher([]);

        act(() => { ref.current.setState({ earlyOutShow: true }); });
        act(() => { ref.current.handleOnhide(); });

        expect(ref.current.state.earlyOutShow).toBe(false);
    });
});

describe('NavPuncher — store wiring', () => {
    test('the header clock reads the user, settings and dashboard slices', () => {
        const state = {
            user: { id: 42 },
            settings: { country: 'Philippines' },
            dashboard: { recent_dtr: [] },
            dtr: { incompleteDtr: {} },
        };

        expect(navPuncherWiring.mapStateToProps(state)).toEqual({
            user: state.user,
            settings: state.settings,
            dashboard: state.dashboard,
        });
    });

    test('the header clock can refresh the recent DTR and post a punch', () => {
        const dispatch = jest.fn();
        const props = navPuncherWiring.mapDispatchToProps(dispatch);

        props.getRecentDtr(42, '2026-08-18', '2026-08-19');
        props.biometrixLog('PAYLOAD', 42);

        expect(dashboardActions.getRecentDtr).toHaveBeenCalledWith(42, '2026-08-18', '2026-08-19');
        expect(quickpunchActions.biometrixLog).toHaveBeenCalledWith('PAYLOAD', 42);
        expect(dispatch).toHaveBeenNthCalledWith(1, {
            type: 'THUNK_RECENT_DTR', user_id: 42, from: '2026-08-18', to: '2026-08-19',
        });
        expect(dispatch).toHaveBeenNthCalledWith(2, { type: 'THUNK_BIOMETRIX', id: 42 });
    });
});

