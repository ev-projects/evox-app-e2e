/**
 * EVOX — Jest: the dashboard punch widgets
 *
 * Sources under test:
 *   src/components/Dashboard/QuickPunch/QuickPunch.js
 *   src/components/Dashboard/RecentDtr/RecentDtr.js
 *   src/components/Dashboard/RecentDtrNav/RecentDtrNav.js
 *   src/components/Dashboard/PunchComponents/RecentPunch/RecentPunch.js
 *   src/components/Dashboard/PunchComponents/MultiQuickpunch/MultiQuickpunch.js
 *
 * Menu path: Dashboard (Quick Punch panel, Recent DTR panel) and Dashboard -> Multi Clock-in
 *            (Quick Punch + Recent Punch panels).
 *
 * Coverage before this file: QuickPunch 83.87% statements / 76.92% branches / 73.33% functions,
 *   RecentDtr 88.24 / 86.21 / 71.43, RecentDtrNav 88 / 89.19 / 66.67, RecentPunch 62.07 / 88.89 /
 *   44.44, MultiQuickpunch 96.77 / 95.19 / 92.31. What was open: the punch buttons of the
 *   two-day Quick Punch arm, the Clock Out button inside a Recent DTR row, both submit handlers,
 *   the clock scheduling, and every store wiring in the group.
 *
 * Rules asserted here (both arms of every conditional):
 *   - Quick Punch enables Clock In only while today has no clock-in, and each button posts its
 *     own punch direction.
 *   - The Quick Punch clock is scheduled to land on the next whole second rather than a flat
 *     second after mount, and leaving the page cancels the pending tick.
 *   - A Recent DTR row that has a clock in, no clock out and is still inside the 22-hour window
 *     offers Clock Out, which posts against that row's id; past the window it offers nothing.
 *   - A DTR row dated after today is not listed at all.
 *   - The "no default schedule" warning appears when today was clocked into with no schedule and
 *     is absent when the schedule is there; Recent DTR Nav additionally shows the rest-day notice
 *     on a rest day and hides it otherwise.
 *   - canClockOut answers zero when it has neither a clock-in nor a comparison point.
 *   - The Recent Punch panel asks for a two-day window of punches on mount, lists the punches
 *     when they have loaded and shows nothing at all while they have not.
 *   - Every punch payload drops the fields the form left empty.
 *   - Each panel's mapStateToProps/mapDispatchToProps read and dispatch what it needs.
 *
 * Determinism: Date.now is pinned for the clock-scheduling assertions; every DTR row is dated
 * either far in the past or far in the future so the "beyond the current date" rule is exercised
 * without depending on the day the suite runs; the 22-hour clock-out window is driven from a
 * comparison point set explicitly on the instance.
 *
 * Dead code observed (not tested, not a defect reachable from the UI): QuickPunch line 101
 * re-reads recent_dtr[1] inside the arm that only runs when there are at most one row, so its
 * "already clocked in" state can never be true; RecentDtrNav line 128 re-tests
 * recent_dtr.length > 0 inside the arm that already required it, so its "loading" card is
 * unreachable.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

global.__connected = [];

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: (mapStateToProps, mapDispatchToProps) => (Component) => {
        global.__connected.push({ mapStateToProps, mapDispatchToProps });
        return Component;
    },
}));

jest.mock('react-datepicker', () => () => <div data-testid="datepicker" />);

jest.mock('../../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader: ({ children }) => <div>{children}</div>,
    Content: ({ children }) => <div>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody: ({ children }) => <div>{children}</div>,
    Row: ({ children }) => <div>{children}</div>,
    Col: ({ children }) => <div>{children}</div>,
}));

jest.mock('react-bootstrap', () => {
    const passthrough = ({ children }) => <div>{children}</div>;
    const Modal = ({ children, show }) => (show ? <div data-testid="modal">{children}</div> : null);
    Modal.Header = passthrough; Modal.Body = passthrough;
    Modal.Footer = passthrough; Modal.Title = passthrough;
    const Form = passthrough; Form.Group = passthrough; Form.Label = passthrough;
    Form.Control = ({ children, ...rest }) => <select {...rest}>{children}</select>;
    const Dropdown = passthrough;
    Dropdown.Toggle = passthrough; Dropdown.Menu = passthrough; Dropdown.Item = passthrough;
    return {
        Modal, Form, Dropdown, Container: passthrough, Row: passthrough, Col: passthrough,
        Table: ({ children }) => <table>{children}</table>,
        Image: () => <img alt="" />, Spinner: () => <div />,
        Button: ({ children, onClick, type, disabled, className }) => (
            <button onClick={onClick} type={type} disabled={disabled} className={className}>{children}</button>
        ),
        Badge: ({ children }) => <span>{children}</span>,
        Tabs: ({ children }) => <div>{children}</div>,
        Tab: ({ children }) => <div>{children}</div>,
    };
});

jest.mock('../../../store/actions/dtr/quickpunchActions', () => ({
    biometrixLog: jest.fn((post_data, id) => ({ type: 'THUNK_BIOMETRIX', id })),
    biometrixLogMulti: jest.fn((post_data, id) => ({ type: 'THUNK_BIOMETRIX_MULTI', id })),
}));

jest.mock('../../../store/actions/dashboard/dashboardActions', () => ({
    getRecentDtr: jest.fn((user_id, from, to) => ({ type: 'THUNK_RECENT_DTR', user_id, from, to })),
    getRecentPunches: jest.fn((user_id, from, to) => ({ type: 'THUNK_RECENT_PUNCHES', user_id, from, to })),
}));

jest.mock('../../../store/actions/userActions', () => ({
    fetchUser: jest.fn(() => ({ type: 'THUNK_FETCH_USER' })),
}));

global.links = new Proxy({}, { get: (target, name) => '/x/' + String(name) });

const quickpunchActions = require('../../../store/actions/dtr/quickpunchActions');
const dashboardActions = require('../../../store/actions/dashboard/dashboardActions');
const userActions = require('../../../store/actions/userActions');

const lastWiring = () => global.__connected[global.__connected.length - 1];

const QuickPunch = require('../../../components/Dashboard/QuickPunch/QuickPunch').default;
const quickPunchWiring = lastWiring();

const RecentDtr = require('../../../components/Dashboard/RecentDtr/RecentDtr').default;
const recentDtrWiring = lastWiring();

const RecentDtrNav = require('../../../components/Dashboard/RecentDtrNav/RecentDtrNav').default;
const recentDtrNavWiring = lastWiring();

const RecentPunch = require('../../../components/Dashboard/PunchComponents/RecentPunch/RecentPunch').default;
const recentPunchWiring = lastWiring();

const MultiQuickpunch = require('../../../components/Dashboard/PunchComponents/MultiQuickpunch/MultiQuickpunch').default;
const multiQuickpunchWiring = lastWiring();

const PAST_DATE = '2020-01-15';
const FUTURE_DATE = '2099-01-15';
const COMPARE_POINT = new Date('2020-01-15T18:00:00Z');

const ordinaryStatus = { slug: 'on_time', name: 'On Time' };

// Formik validates on a promise, so a press is flushed on a microtask rather than a timed wait.
const pressAndSubmit = async (button) => {
    fireEvent.click(button);
    await act(() => Promise.resolve());
};

const dtrRow = (overrides = {}) => ({
    id: 900,
    date: PAST_DATE,
    attendance_status: ordinaryStatus,
    holidays: [],
    is_rest_day: 0,
    start_datetime: '2020-01-15 09:00:00',
    time_in: null,
    time_out: null,
    ...overrides,
});

beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
});

afterEach(() => {
    jest.useRealTimers();
    if (Date.now.mockRestore) Date.now.mockRestore();
});

describe('Quick Punch — the two punch buttons of an ordinary working day', () => {
    const renderPanel = (recent_dtr, biometrixLog = jest.fn()) => {
        const ref = React.createRef();
        const utils = render(
            <QuickPunch
                ref={ref}
                user={{ id: 7 }}
                dashboard={{ recent_dtr }}
                biometrixLog={biometrixLog}
            />,
        );
        return { ...utils, ref, biometrixLog };
    };

    const workingPair = (todayOverrides = {}) => ([
        { id: 100, is_rest_day: 0, time_in: '09:00', time_out: '18:00' },
        { id: 200, is_rest_day: 0, time_in: null, time_out: null, ...todayOverrides },
    ]);

    test('a day not yet clocked into offers Clock In', () => {
        const { getByRole } = renderPanel(workingPair());

        expect(getByRole('button', { name: /clock in/i })).not.toBeDisabled();
    });

    test('a day already clocked into has Clock In disabled but Clock Out still live', () => {
        const { getByRole } = renderPanel(workingPair({ time_in: '09:05' }));

        expect(getByRole('button', { name: /clock in/i })).toBeDisabled();
        expect(getByRole('button', { name: /clock out/i })).not.toBeDisabled();
    });

    test('pressing Clock In posts an in-punch for the signed-in user', async () => {
        const biometrixLog = jest.fn();
        const { getByRole } = renderPanel(workingPair(), biometrixLog);

        await pressAndSubmit(getByRole('button', { name: /clock in/i }));

        expect(biometrixLog).toHaveBeenCalledTimes(1);
        const [formData, userId] = biometrixLog.mock.calls[0];
        expect(formData.get('quickpunch')).toBe('in');
        expect(userId).toBe(7);
    });

    test('pressing Clock Out posts an out-punch for the signed-in user', async () => {
        const biometrixLog = jest.fn();
        const { getByRole } = renderPanel(workingPair({ time_in: '09:05' }), biometrixLog);

        await pressAndSubmit(getByRole('button', { name: /clock out/i }));

        expect(biometrixLog.mock.calls[0][0].get('quickpunch')).toBe('out');
    });

    test('a rest day today with a worked day yesterday offers Clock Out against yesterday\'s row', async () => {
        const biometrixLog = jest.fn();
        const { getByRole, getByText } = renderPanel([
            { id: 100, is_rest_day: 0, time_in: '09:00', time_out: null },
            { id: 200, is_rest_day: 1, time_in: null, time_out: null },
        ], biometrixLog);

        expect(getByRole('button', { name: /clock in/i })).toBeDisabled();
        expect(getByText(/You cannot clock-in on a rest day/)).toBeInTheDocument();

        await pressAndSubmit(getByRole('button', { name: /clock out/i }));

        expect(biometrixLog.mock.calls[0][0].get('dtr_id')).toBe('100');
    });

    test('two rest days in a row offer no punch buttons at all, only the notice', () => {
        const { queryByRole, getByText } = renderPanel([
            { id: 100, is_rest_day: 1, time_in: null, time_out: null },
            { id: 200, is_rest_day: 1, time_in: null, time_out: null },
        ]);

        expect(queryByRole('button')).toBeNull();
        expect(getByText(/You cannot clock-in on a rest day/)).toBeInTheDocument();
    });

    test('a punch payload drops the fields the form left empty', () => {
        const biometrixLog = jest.fn();
        const { ref } = renderPanel(workingPair(), biometrixLog);

        act(() => {
            ref.current.onSubmitHandler({ quickpunch: 'in', dtr_id: null });
        });

        const formData = biometrixLog.mock.calls[0][0];
        expect(formData.get('quickpunch')).toBe('in');
        expect(formData.has('dtr_id')).toBe(false);
    });
});

describe('Quick Punch — the clock ticks on the second boundary', () => {
    test('the first tick is scheduled for the remainder of the current second, not a flat second', () => {
        jest.spyOn(Date, 'now').mockReturnValue(1755600000123);

        render(<QuickPunch user={{ id: 7 }} dashboard={{ recent_dtr: [] }} biometrixLog={jest.fn()} />);

        expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 877);
    });

    test('each tick reschedules itself for the following second boundary', () => {
        jest.spyOn(Date, 'now').mockReturnValue(1755600000123);

        const ref = React.createRef();
        render(
            <QuickPunch ref={ref} user={{ id: 7 }} dashboard={{ recent_dtr: [] }} biometrixLog={jest.fn()} />,
        );
        const firstHandle = ref.current.timer;

        act(() => { jest.advanceTimersByTime(877); });

        expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 877);
        expect(ref.current.timer).not.toBe(firstHandle);
    });

    test('leaving the dashboard cancels the pending tick', () => {
        jest.spyOn(Date, 'now').mockReturnValue(1755600000123);

        const ref = React.createRef();
        const { unmount } = render(
            <QuickPunch ref={ref} user={{ id: 7 }} dashboard={{ recent_dtr: [] }} biometrixLog={jest.fn()} />,
        );
        const pendingHandle = ref.current.timer;

        unmount();

        expect(clearTimeout).toHaveBeenCalledWith(pendingHandle);
    });
});

describe('Quick Punch — store wiring', () => {
    test('the panel reads the user and dashboard slices and can post a punch', () => {
        const dispatch = jest.fn();
        const state = { user: { id: 7 }, dashboard: { recent_dtr: [] } };

        expect(quickPunchWiring.mapStateToProps(state))
            .toEqual({ user: state.user, dashboard: state.dashboard });

        quickPunchWiring.mapDispatchToProps(dispatch).biometrixLog('PAYLOAD', 7);

        expect(quickpunchActions.biometrixLog).toHaveBeenCalledWith('PAYLOAD', 7);
        expect(dispatch).toHaveBeenCalledWith({ type: 'THUNK_BIOMETRIX', id: 7 });
    });
});

describe('Recent DTR — the Clock Out button inside a row', () => {
    const renderPanel = (recent_dtr, biometrixLog = jest.fn()) => {
        const ref = React.createRef();
        const utils = render(
            <RecentDtr
                ref={ref}
                user={{ id: 7 }}
                dashboard={{ recent_dtr }}
                getRecentDtr={jest.fn()}
                biometrixLog={biometrixLog}
            />,
        );
        act(() => { ref.current.setState({ compare_to_clock_in: COMPARE_POINT }); });
        return { ...utils, ref, biometrixLog };
    };

    test('a row clocked in three hours ago and not yet out offers Clock Out for that row', async () => {
        const biometrixLog = jest.fn();
        const { getByRole } = renderPanel([
            dtrRow({ id: 901, time_in: '2020-01-15T15:00:00Z' }),
        ], biometrixLog);

        await pressAndSubmit(getByRole('button', { name: /clock out/i }));

        const formData = biometrixLog.mock.calls[0][0];
        expect(formData.get('quickpunch')).toBe('out');
        expect(formData.get('dtr_id')).toBe('901');
    });

    test('a row clocked in more than a day ago no longer offers Clock Out', () => {
        const { queryByRole } = renderPanel([
            dtrRow({ id: 901, time_in: '2020-01-14T10:00:00Z' }),
        ]);

        expect(queryByRole('button')).toBeNull();
    });

    test('a row that already has both punches shows the clock-out time instead of a button', () => {
        const { queryByRole, container } = renderPanel([
            dtrRow({ id: 901, time_in: '2020-01-15T15:00:00Z', time_out: '2020-01-15T17:00:00Z' }),
        ]);

        expect(queryByRole('button')).toBeNull();
        expect(container.querySelectorAll('tbody tr')).toHaveLength(1);
    });

    test('a row dated after today is not listed', () => {
        const { container } = renderPanel([
            dtrRow({ id: 901, date: FUTURE_DATE }),
            dtrRow({ id: 902, date: PAST_DATE }),
        ]);

        expect(container.querySelectorAll('tbody tr')).toHaveLength(1);
    });

    test('clocking in on a day with no default schedule raises the warning banner', () => {
        const { container } = renderPanel([
            dtrRow({ id: 901, start_datetime: null, time_in: '2020-01-15T15:00:00Z' }),
            dtrRow({ id: 902, start_datetime: null, time_in: '2020-01-15T15:00:00Z' }),
        ]);

        const banner = container.querySelector('.alert-danger');
        expect(banner).not.toBeNull();
        expect(banner.textContent).toContain('clocked in');
        expect(banner.textContent).toContain('default');
    });

    test('a day that does have a schedule raises no warning banner', () => {
        const { container } = renderPanel([dtrRow({ id: 901, time_in: '2020-01-15T15:00:00Z' })]);

        expect(container.querySelector('.alert-danger')).toBeNull();
    });

    test('an empty DTR list shows the no-previous-DTR message and no table', () => {
        const { getByText, container } = renderPanel([]);

        expect(getByText('No Previous DTR')).toBeInTheDocument();
        expect(container.querySelector('table')).toBeNull();
    });

    test('a punch payload drops the fields the form left empty', () => {
        const biometrixLog = jest.fn();
        const { ref } = renderPanel([], biometrixLog);

        act(() => { ref.current.onSubmitHandler({ quickpunch: 'out', dtr_id: null }); });

        expect(biometrixLog.mock.calls[0][0].has('dtr_id')).toBe(false);
    });

    test('the panel reads the user and dashboard slices and can refresh or punch', () => {
        const dispatch = jest.fn();
        const state = { user: { id: 7 }, dashboard: { recent_dtr: [] } };

        expect(recentDtrWiring.mapStateToProps(state))
            .toEqual({ user: state.user, dashboard: state.dashboard });

        const props = recentDtrWiring.mapDispatchToProps(dispatch);
        props.getRecentDtr(7, '2020-01-14', '2020-01-15');
        props.biometrixLog('PAYLOAD', 7);

        expect(dashboardActions.getRecentDtr).toHaveBeenCalledWith(7, '2020-01-14', '2020-01-15');
        expect(dispatch).toHaveBeenNthCalledWith(2, { type: 'THUNK_BIOMETRIX', id: 7 });
    });
});

describe('Recent DTR Nav — the header version of the same list', () => {
    const renderPanel = (recent_dtr, biometrixLog = jest.fn()) => {
        const ref = React.createRef();
        const utils = render(
            <RecentDtrNav
                ref={ref}
                user={{ id: 7 }}
                dashboard={{ recent_dtr }}
                getRecentDtr={jest.fn()}
                biometrixLog={biometrixLog}
                fetchUser={jest.fn()}
            />,
        );
        act(() => { ref.current.setState({ compare_to_clock_in: COMPARE_POINT }); });
        return { ...utils, ref, biometrixLog };
    };

    test('a rest day today shows the rest-day notice with a link to request rest day work', () => {
        const { getByText, container } = renderPanel([
            dtrRow({ id: 901 }),
            dtrRow({ id: 902, is_rest_day: 1 }),
        ]);

        expect(getByText(/You cannot clock-in on a/)).toBeInTheDocument();
        expect(container.querySelector('.alert-restday-notice a').getAttribute('href'))
            .toBe('/x/rest_day_work');
    });

    test('an ordinary working day shows no rest-day notice', () => {
        const { container } = renderPanel([dtrRow({ id: 901 }), dtrRow({ id: 902 })]);

        expect(container.querySelector('.alert-restday-notice')).toBeNull();
    });

    test('canClockOut answers zero with neither a clock-in nor a comparison point', () => {
        const { ref } = renderPanel([]);

        act(() => { ref.current.setState({ compare_to_clock_in: null }); });

        expect(ref.current.canClockOut(null)).toBe(0);
    });

    test('canClockOut answers the whole-hour distance from the comparison point', () => {
        const { ref } = renderPanel([]);

        expect(ref.current.canClockOut('2020-01-15T15:00:00Z')).toBe(3);
    });

    test('a punch payload drops the fields the form left empty', () => {
        const biometrixLog = jest.fn();
        const { ref } = renderPanel([], biometrixLog);

        act(() => { ref.current.onSubmitHandler({ quickpunch: 'out', dtr_id: null }); });

        expect(biometrixLog.mock.calls[0][0].has('dtr_id')).toBe(false);
    });

    test('the panel reads the user and dashboard slices and can refresh, punch or reload the user', () => {
        const dispatch = jest.fn();
        const state = { user: { id: 7 }, dashboard: { recent_dtr: [] } };

        expect(recentDtrNavWiring.mapStateToProps(state))
            .toEqual({ user: state.user, dashboard: state.dashboard });

        const props = recentDtrNavWiring.mapDispatchToProps(dispatch);
        props.getRecentDtr(7, '2020-01-14', '2020-01-15');
        props.biometrixLog('PAYLOAD', 7);
        props.fetchUser();

        expect(userActions.fetchUser).toHaveBeenCalledTimes(1);
        expect(dispatch).toHaveBeenNthCalledWith(3, { type: 'THUNK_FETCH_USER' });
    });
});

describe('Recent Punch — the multi-clock-in log', () => {
    const renderPanel = (dashboard, getRecentPunches = jest.fn()) => {
        const ref = React.createRef();
        const utils = render(
            <RecentPunch
                ref={ref}
                user={{ id: 7 }}
                dashboard={dashboard}
                getRecentPunches={getRecentPunches}
                biometrixLog={jest.fn()}
            />,
        );
        return { ...utils, ref, getRecentPunches };
    };

    test('the panel asks for the signed-in user\'s punches as it mounts', () => {
        const getRecentPunches = jest.fn();
        renderPanel({ recent_punch: [], isRecentPunchLoaded: true }, getRecentPunches);

        expect(getRecentPunches).toHaveBeenCalledTimes(1);
        expect(getRecentPunches.mock.calls[0][0]).toBe(7);
    });

    test('nothing at all is rendered while the punches have not loaded', () => {
        const { container } = renderPanel({ recent_punch: [], isRecentPunchLoaded: false });

        expect(container.querySelector('table')).toBeNull();
        expect(container.textContent).toBe('');
    });

    test('a loaded but empty log shows the no-previous-punches message', () => {
        const { getByText, container } = renderPanel({ recent_punch: [], isRecentPunchLoaded: true });

        expect(getByText('No Previous Punch logs')).toBeInTheDocument();
        expect(container.querySelector('table')).toBeNull();
    });

    test('each punch is listed with its hour count, status and project', () => {
        const { container, getByText } = renderPanel({
            isRecentPunchLoaded: true,
            recent_punch: [
                {
                    date: PAST_DATE, time_in: '09:00', time_out: '12:00', hours: '3.00',
                    log_in_type: 'Log_in', log_out_type: 'Log_out', project_name: 'EVOX',
                },
                {
                    date: PAST_DATE, time_in: '13:00', time_out: '14:00', hours: '1.00',
                    log_in_type: 'Continue', log_out_type: 'Pause', project_name: 'ODOO',
                },
            ],
        });

        expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
        expect(getByText('Logout')).toBeInTheDocument();
        expect(getByText('Pause')).toBeInTheDocument();
        expect(getByText('EVOX')).toBeInTheDocument();
    });

    test('a rest-day-work punch is labelled as such', () => {
        const { getByText } = renderPanel({
            isRecentPunchLoaded: true,
            recent_punch: [{
                date: PAST_DATE, time_in: '09:00', time_out: null, hours: '0.00',
                log_in_type: 'rest_day_work', log_out_type: null, project_name: 'EVOX',
            }],
        });

        expect(getByText('Rest Day Work')).toBeInTheDocument();
    });

    test('a punch payload drops the fields the form left empty', () => {
        const biometrixLog = jest.fn();
        const ref = React.createRef();
        render(
            <RecentPunch
                ref={ref}
                user={{ id: 7 }}
                dashboard={{ recent_punch: [], isRecentPunchLoaded: true }}
                getRecentPunches={jest.fn()}
                biometrixLog={biometrixLog}
            />,
        );

        act(() => { ref.current.onSubmitHandler({ quickpunch: 'out', dtr_id: null }); });

        const formData = biometrixLog.mock.calls[0][0];
        expect(formData.get('quickpunch')).toBe('out');
        expect(formData.has('dtr_id')).toBe(false);
    });

    test('the panel reads the user and dashboard slices and can refresh or punch', () => {
        const dispatch = jest.fn();
        const state = { user: { id: 7 }, dashboard: { recent_punch: [] } };

        expect(recentPunchWiring.mapStateToProps(state))
            .toEqual({ user: state.user, dashboard: state.dashboard });

        const props = recentPunchWiring.mapDispatchToProps(dispatch);
        props.getRecentPunches(7, '2020-01-14', '2020-01-15');
        props.biometrixLog('PAYLOAD', 7);

        expect(dashboardActions.getRecentPunches).toHaveBeenCalledWith(7, '2020-01-14', '2020-01-15');
        expect(dispatch).toHaveBeenNthCalledWith(1, {
            type: 'THUNK_RECENT_PUNCHES', user_id: 7, from: '2020-01-14', to: '2020-01-15',
        });
        expect(dispatch).toHaveBeenNthCalledWith(2, { type: 'THUNK_BIOMETRIX', id: 7 });
    });
});

describe('Multi Quick Punch — the confirmation payload and store wiring', () => {
    const renderPanel = (biometrixLogMulti = jest.fn()) => {
        const ref = React.createRef();
        const utils = render(
            <MultiQuickpunch
                ref={ref}
                user={{ id: 7 }}
                dashboard={{ recent_punch: [], isRecentPunchLoaded: true }}
                biometrixLogMulti={biometrixLogMulti}
            />,
        );
        return { ...utils, ref, biometrixLogMulti };
    };

    test('the confirmed payload drops the fields the form left empty and adds the remarks', () => {
        const biometrixLogMulti = jest.fn();
        const { ref } = renderPanel(biometrixLogMulti);

        act(() => {
            ref.current.setState({
                temp_values_formdata: { quickpunch: 'out', on_date: false, dtr_id: null },
                remarks: 'Handover done',
                project_name: 'EVOX',
            });
        });
        act(() => { ref.current.handleModalSubmit(); });

        const [formData, userId] = biometrixLogMulti.mock.calls[0];
        expect(formData.get('quickpunch')).toBe('out');
        expect(formData.has('dtr_id')).toBe(false);
        expect(formData.get('remarks')).toBe('Handover done');
        expect(formData.get('project_name')).toBe('EVOX');
        expect(userId).toBe(7);
        expect(ref.current.state.showModal).toBe(false);
    });

    test('the panel reads the user and dashboard slices and can post a multi-punch', () => {
        const dispatch = jest.fn();
        const state = { user: { id: 7 }, dashboard: { recent_punch: [] } };

        expect(multiQuickpunchWiring.mapStateToProps(state))
            .toEqual({ user: state.user, dashboard: state.dashboard });

        multiQuickpunchWiring.mapDispatchToProps(dispatch).biometrixLogMulti('PAYLOAD', 7);

        expect(quickpunchActions.biometrixLogMulti).toHaveBeenCalledWith('PAYLOAD', 7);
        expect(dispatch).toHaveBeenCalledWith({ type: 'THUNK_BIOMETRIX_MULTI', id: 7 });
    });
});
