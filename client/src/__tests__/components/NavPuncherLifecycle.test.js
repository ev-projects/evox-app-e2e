/**
 * NavPuncherLifecycle.test.js
 * Full page-lifecycle coverage for the THREE time-punch controls an employee uses to
 * clock in and out:
 *
 *   components/Template/NavPuncher/NavPuncher.js                    (top nav clock - every page)
 *   components/Dashboard/QuickPunch/QuickPunch.js                   (Dashboard -> Quick Punch card)
 *   components/Dashboard/PunchComponents/MultiQuickpunch/...js      (Dashboard -> Quick Punch, multi-login)
 *
 * Each control is walked the way an employee uses it, phase by phase:
 *
 *   PHASE 1  MOUNT/LOAD    what the button says before the DTR arrives (Loading), what the
 *                          component fetches on mount (nothing - see FINDING NAVP-FETCH-1),
 *                          the running clock, the timezone hint, and the feature/level guards
 *                          that replace the puncher with a dead button
 *   PHASE 2  DATA ARRIVES  the DTR pair lands -> which of the six button states renders:
 *                          Clock In / Clock Out / Day Completed / Rest Day / generate-arm /
 *                          empty-DTR arm
 *   PHASE 3  USER ACTIONS  the early-out warning dialog (opened, cancelled, continued),
 *                          the MultiQuickpunch date selector, Pause/Continue, and the
 *                          confirm-submission modal
 *   PHASE 4  SUBMIT        the punch itself - in AND out - the dispatched FormData payload
 *                          (quickpunch, dtr_id, session_id, user id), every guard arm
 *                          (already punched, rest day, no schedule, outside window) and the
 *                          failure arm when the dispatch blows up
 *
 * Characterisation tests - they assert TODAY's behaviour, they do not endorse it:
 *   NAVP-RESTDAY-1  Clock In / Clock Out on a rest day writes dtr_id in the button's onClick,
 *                   which makes onSubmitHandler skip its only dispatch arm. Unless yesterday
 *                   happens to be `with_in_time`, the click punches NOTHING and says nothing.
 *   NAVP-EARLY-1    the early-out dialog is rendered as <EarlyOutModal props={this.props} />,
 *                   so inside the modal `props.dashboard` is undefined. Continue therefore
 *                   writes dtr_id = undefined - and that broken write is the only reason the
 *                   early clock-out works at all: a real dtr_id would disable the dispatch.
 *   NAVP-DOUBLE-1   one Clock Out fires the punch API TWICE when yesterday is still within
 *                   its window (today-arm + PASS0 arm both run, no else).
 *   NAVP-GEN-1      with no DTR at all, one Clock In fires the punch API TWICE (both
 *                   generate arms run).
 *   NAVP-FETCH-1    getRecentDtr is wired into mapDispatchToProps and never called; mount
 *                   also computes `from`/`to` and throws them away.
 *   NAVP-DEAD-1     onUIHandler (the jQuery dropdown guard) is never wired to anything.
 *   NAVP-FAIL-1     a failing punch escapes onSubmitHandler unhandled - nothing in the
 *                   component catches it and the button never reports a problem.
 *   QP-OUT-1        QuickPunch's Clock Out button is never disabled: an employee who has not
 *                   clocked in can still fire a clock-out.
 *
 * Dead code recorded (no test can reach it, reported not fixed):
 *   NavPuncher.js lines 187-197  `target_previous` / `range` are computed on every render
 *                                and never read.
 *   NavPuncher.js lines 154-155  `from` / `to` built in componentWillMount, never used.
 *   NavPuncher.js lines 98-101   addSeconds() is never called.
 *   NavPuncher.js lines 400-431  a second, commented-out EarlyOutModal.
 *
 * ADDITIVE ONLY - no existing test touched.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import moment from 'moment';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => jest.fn(),
}));

jest.mock('jquery', () => jest.fn(() => ({ on: jest.fn() })));
jest.mock('react-datepicker', () => () => <input data-testid="datepicker" />);
jest.mock('react-multi-select-component', () => () => <div data-testid="multi-select" />);

jest.mock('../../services/Authenticator', () => ({
    scanFeature: jest.fn(() => true),
    scanLevel: jest.fn(() => false),
    check: jest.fn(() => true),
}));

jest.mock('../../store/actions/userActions', () => ({ logOut: jest.fn() }));
jest.mock('../../store/actions/dashboard/dashboardActions', () => ({ getRecentDtr: jest.fn() }));
jest.mock('../../store/actions/dtr/quickpunchActions', () => ({
    biometrixLog: jest.fn(),
    biometrixLogMulti: jest.fn(),
}));

jest.mock('react-bootstrap', () => {
    const R = require('react');
    const passthrough = ({ children }) => R.createElement('div', null, children);

    const Modal = ({ children, show }) =>
        (show ? R.createElement('div', { 'data-testid': 'confirm-modal' }, children) : null);
    Modal.Header = passthrough; Modal.Body = passthrough;
    Modal.Footer = passthrough; Modal.Title = passthrough;

    const Form = passthrough;
    Form.Group = passthrough;
    Form.Label = ({ children }) => R.createElement('label', null, children);
    // `as="select"` and `as="textarea"` both arrive here - never render a void input with children
    Form.Control = ({ children, as, onChange, value, placeholder }) =>
        R.createElement(as === 'textarea' ? 'textarea' : 'select',
            { onChange, defaultValue: value, placeholder, 'data-as': as || 'select' }, children);

    const Dropdown = passthrough;
    Dropdown.Toggle = passthrough; Dropdown.Menu = passthrough; Dropdown.Item = passthrough;

    return {
        Modal, Form, Dropdown,
        ModalHeader: passthrough, ModalBody: passthrough, ModalFooter: passthrough,
        Group: passthrough, Label: passthrough,
        Control: ({ children, ...p }) => R.createElement('select', p, children),
        FormSelect: ({ children, ...p }) => R.createElement('select', p, children),
        Container: ({ children, className }) => R.createElement('div', { className }, children),
        Row: ({ children, className }) => R.createElement('div', { className }, children),
        Col: ({ children, className }) => R.createElement('div', { className }, children),
        Table: ({ children }) => R.createElement('table', null, children),
        Image: () => R.createElement('img', { alt: '' }),
        Spinner: () => R.createElement('div', { 'data-testid': 'spinner' }),
        Badge: ({ children }) => R.createElement('span', null, children),
        Tab: passthrough, Tabs: passthrough,
        Button: ({ children, onClick, type, disabled, className, variant }) =>
            R.createElement('button',
                { onClick, type: type || 'button', disabled: !!disabled, className, 'data-variant': variant },
                children),
    };
});

import Authenticator from '../../services/Authenticator';

global.links = new Proxy({}, { get: () => '/x/' });

const NavPuncher = require('../../components/Template/NavPuncher/NavPuncher').default;
const QuickPunch = require('../../components/Dashboard/QuickPunch/QuickPunch').default;
const MultiQuickpunch =
    require('../../components/Dashboard/PunchComponents/MultiQuickpunch/MultiQuickpunch').default;

/* --------------------------------------------------------------------- helpers */

const flush = () => act(async () => { await Promise.resolve(); });

const click = async (el) => {
    await act(async () => { fireEvent.click(el); });
    await flush();
};

// find a <button> whose visible text contains the given label
const btn = (container, label) =>
    Array.from(container.querySelectorAll('button'))
        .find((b) => b.textContent.indexOf(label) !== -1);

const labels = (container) =>
    Array.from(container.querySelectorAll('button')).map((b) => b.textContent.trim());

const nowSec = () => Math.floor(Date.now() / 1000);

/* -------------------------------------------------------------------- fixtures */

// one DTR row; the two rows the nav puncher reads are [0] = yesterday, [1] = today
const dtrRow = (over = {}) => ({
    id: 100,
    date: moment().format('YYYY-MM-DD'),
    time_in: null,
    time_out: null,
    is_rest_day: 0,
    with_in_time: false,
    before_time_in_half: false,
    user_half_timestamp: nowSec() - 7200,
    start_datetime: '2026-08-03 08:00:00',
    end_datetime: '2026-08-03 17:00:00',
    raw_time: { start_datetime: nowSec() - 90000, end_datetime: nowSec() - 3600 },
    ...over,
});

const dashboardOf = (yesterday = {}, today = {}) => ({
    isNavDtrLoaded: true,
    recent_dtr: [dtrRow({ id: 100, ...yesterday }), dtrRow({ id: 200, ...today })],
});

const navProps = (over = {}) => ({
    user: { id: 42, first_name: 'Ana', timezone: 'Asia/Manila', country: 'Philippines' },
    settings: {},
    constant: {},
    dashboard: dashboardOf(),
    biometrixLog: jest.fn(),
    getRecentDtr: jest.fn(),
    logOut: jest.fn(),
    ...over,
});

const renderNav = (props) => {
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter><NavPuncher ref={ref} {...props} /></MemoryRouter>
    );
    return { ...utils, ref };
};

/* ================================================================================
 * NAV PUNCHER - top navigation clock (every authenticated page)
 * ============================================================================== */

describe('Nav puncher (top navigation clock) - page lifecycle', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        Authenticator.scanFeature.mockImplementation((key) => key === 'login');
        Authenticator.scanLevel.mockImplementation(() => false);
        localStorage.clear();
        localStorage.setItem('session_id', 'sess-1');
        jest.useFakeTimers();
    });
    afterEach(() => jest.useRealTimers());

    /* ------------------------------------------------------ PHASE 1 - MOUNT/LOAD */

    test('opening_any_page_before_the_daily_record_has_loaded_shows_a_loading_clock_button_and_no_punch_control', async () => {
        const props = navProps({ dashboard: { isNavDtrLoaded: false, recent_dtr: [] } });
        const { container } = renderNav(props);
        await flush();

        expect(btn(container, 'Loading')).toBeTruthy();
        expect(btn(container, 'Clock In')).toBeUndefined();
        expect(btn(container, 'Clock Out')).toBeUndefined();
    });

    test('mounting_the_nav_puncher_never_asks_the_server_for_the_recent_daily_record_FINDING_NAVP_FETCH_1', async () => {
        const props = navProps();
        renderNav(props);
        await flush();

        // FINDING NAVP-FETCH-1 (characterised): getRecentDtr is wired into mapDispatchToProps
        // and componentWillMount even builds the from/to range for it - then never calls it.
        // The nav clock is entirely dependent on whatever another screen last fetched.
        expect(props.getRecentDtr).not.toHaveBeenCalled();
    });

    test('the_nav_clock_starts_ticking_on_mount_and_the_interval_is_cleared_when_the_page_is_left', async () => {
        const clearSpy = jest.spyOn(window, 'clearInterval');
        const props = navProps();
        const { ref, unmount } = renderNav(props);
        await flush();

        const before = ref.current.state.time;
        localStorage.setItem('access_token', 'tok');
        localStorage.setItem('user_local_offset_mils', String(2 * 3600 * 1000));
        localStorage.setItem('user_local_timestamp_mils', String(Date.now()));
        act(() => { jest.advanceTimersByTime(1100); });
        expect(ref.current.state.time).not.toBe(before);

        unmount();
        expect(clearSpy).toHaveBeenCalled();
        clearSpy.mockRestore();
    });

    test('a_signed_out_tab_stops_the_clock_instead_of_advancing_it', async () => {
        const props = navProps();
        const { ref } = renderNav(props);
        await flush();

        const before = ref.current.state.time;
        act(() => { jest.advanceTimersByTime(1100); });   // no access_token in storage
        expect(ref.current.state.time).toBe(before);
    });

    test('the_clock_shows_todays_date_and_the_employees_timezone_hint_when_hr_has_set_a_country', async () => {
        const props = navProps();
        const { container, getByText } = renderNav(props);
        await flush();

        expect(getByText(moment().format('dddd, Do MMMM'))).toBeInTheDocument();
        expect(getByText('Asia/Manila')).toBeInTheDocument();
        expect(container.querySelector('[data-tool-tip]').getAttribute('data-tool-tip'))
            .toBe('Your Timezone is Asia/Manila, since your country set by HR is Philippines');
    });

    test('an_employee_with_no_timezone_on_file_gets_the_clock_without_the_timezone_hint', async () => {
        const props = navProps({ user: { id: 42, first_name: 'Ana' } });
        const { container } = renderNav(props);
        await flush();

        expect(container.querySelector('.timezone-item')).toBeNull();
        expect(container.querySelector('[data-tool-tip]')).toBeNull();
    });

    test('a_multi_login_employee_gets_a_permanently_disabled_clock_in_button_because_punching_happens_on_the_dashboard', async () => {
        Authenticator.scanFeature.mockImplementation((key) => key === 'multi_login' || key === 'login');
        const props = navProps();
        const { container } = renderNav(props);
        await flush();

        const b = btn(container, 'Clock In');
        expect(b).toBeTruthy();
        expect(b.disabled).toBe(true);
        await click(b);
        expect(props.biometrixLog).not.toHaveBeenCalled();
    });

    test('a_client_account_and_an_account_without_the_login_feature_both_get_the_same_disabled_clock_in_button', async () => {
        Authenticator.scanLevel.mockImplementation((lvl) => lvl === 'Client');
        const asClient = renderNav(navProps());
        await flush();
        expect(btn(asClient.container, 'Clock In').disabled).toBe(true);
        asClient.unmount();

        Authenticator.scanLevel.mockImplementation(() => false);
        Authenticator.scanFeature.mockImplementation(() => false);   // no "login" feature
        const noFeature = renderNav(navProps());
        await flush();
        expect(btn(noFeature.container, 'Clock In').disabled).toBe(true);
    });

    /* --------------------------------------------------- PHASE 2 - DATA ARRIVES */

    test('a_fresh_working_day_renders_an_enabled_clock_in_button', async () => {
        const { container } = renderNav(navProps());
        await flush();

        const b = btn(container, 'Clock In');
        expect(b).toBeTruthy();
        expect(b.disabled).toBe(false);
        expect(btn(container, 'Clock Out')).toBeUndefined();
    });

    test('once_the_employee_has_clocked_in_the_same_button_becomes_clock_out', async () => {
        const props = navProps({ dashboard: dashboardOf({}, { time_in: '2026-08-04 08:00:00' }) });
        const { container } = renderNav(props);
        await flush();

        expect(btn(container, 'Clock Out')).toBeTruthy();
        expect(btn(container, 'Clock In')).toBeUndefined();
    });

    test('after_clocking_out_the_button_reads_day_completed_and_is_dead', async () => {
        const props = navProps({
            dashboard: dashboardOf({}, { time_in: '2026-08-04 08:00:00', time_out: '2026-08-04 17:00:00' }),
        });
        const { container } = renderNav(props);
        await flush();

        const b = btn(container, 'Day Completed');
        expect(b).toBeTruthy();
        expect(b.disabled).toBe(true);
        await click(b);
        expect(props.biometrixLog).not.toHaveBeenCalled();
    });

    test('a_rest_day_on_both_days_replaces_the_puncher_with_a_disabled_rest_day_button', async () => {
        const props = navProps({ dashboard: dashboardOf({ is_rest_day: 1 }, { is_rest_day: 1 }) });
        const { container } = renderNav(props);
        await flush();

        const b = btn(container, 'Rest Day');
        expect(b).toBeTruthy();
        expect(b.disabled).toBe(true);
    });

    test('a_rest_day_today_after_a_worked_yesterday_that_is_already_closed_also_shows_the_disabled_rest_day_button', async () => {
        const props = navProps({
            dashboard: dashboardOf(
                { is_rest_day: 0, with_in_time: true, time_in: '2026-08-03 08:00', time_out: '2026-08-03 17:00' },
                { is_rest_day: 1 }),
        });
        const { container } = renderNav(props);
        await flush();

        expect(btn(container, 'Rest Day').disabled).toBe(true);
    });

    test('a_rest_day_today_with_yesterdays_night_shift_still_open_offers_the_yesterday_punch_instead', async () => {
        // yesterday never clocked in -> Clock In (for yesterday); already clocked in -> Clock Out
        const openIn = renderNav(navProps({
            dashboard: dashboardOf({ is_rest_day: 0, with_in_time: true, time_in: null }, { is_rest_day: 1 }),
        }));
        await flush();
        expect(btn(openIn.container, 'Clock In')).toBeTruthy();
        openIn.unmount();

        const openOut = renderNav(navProps({
            dashboard: dashboardOf(
                { is_rest_day: 0, with_in_time: true, time_in: '2026-08-03 22:00' }, { is_rest_day: 1 }),
        }));
        await flush();
        expect(btn(openOut.container, 'Clock Out')).toBeTruthy();
    });

    test('an_employee_with_no_daily_record_at_all_gets_a_clock_in_button_that_also_generates_the_record', async () => {
        const props = navProps({ dashboard: { isNavDtrLoaded: true, recent_dtr: [] } });
        const { container } = renderNav(props);
        await flush();

        expect(btn(container, 'Clock In')).toBeTruthy();
        expect(labels(container).some((l) => /Loading/.test(l))).toBe(false);
    });

    /* --------------------------------------------------- PHASE 3 - USER ACTIONS */

    test('clocking_out_before_the_halfway_point_of_the_shift_opens_the_early_out_warning_and_punches_nothing_yet', async () => {
        const props = navProps({
            dashboard: dashboardOf({}, {
                time_in: '2026-08-04 08:00:00',
                before_time_in_half: true,
                user_half_timestamp: nowSec() + 7200,
            }),
        });
        const { container, ref, getByText } = renderNav(props);
        await flush();

        await click(btn(container, 'Clock Out'));

        expect(ref.current.state.earlyOutShow).toBe(true);
        expect(props.biometrixLog).not.toHaveBeenCalled();
        expect(getByText('Clock Out Early?')).toBeInTheDocument();
        expect(getByText(/undertime on this date/)).toBeInTheDocument();
    });

    test('cancelling_the_early_out_warning_closes_it_and_leaves_the_shift_running', async () => {
        const props = navProps({
            dashboard: dashboardOf({}, {
                time_in: '2026-08-04 08:00:00',
                before_time_in_half: true,
                user_half_timestamp: nowSec() + 7200,
            }),
        });
        const { container, ref, queryByText } = renderNav(props);
        await flush();

        await click(btn(container, 'Clock Out'));
        await click(btn(container, 'Cancel'));

        expect(ref.current.state.earlyOutShow).toBe(false);
        expect(queryByText('Clock Out Early?')).toBeNull();
        expect(props.biometrixLog).not.toHaveBeenCalled();
        expect(btn(container, 'Clock Out')).toBeTruthy();     // still punchable
    });

    test('the_x_on_the_early_out_warning_closes_it_the_same_way_as_cancel', async () => {
        const props = navProps({
            dashboard: dashboardOf({}, {
                time_in: '2026-08-04 08:00:00',
                before_time_in_half: true,
                user_half_timestamp: nowSec() + 7200,
            }),
        });
        const { container, ref } = renderNav(props);
        await flush();

        await click(btn(container, 'Clock Out'));
        await act(async () => { fireEvent.click(container.querySelector('span.close')); });
        await flush();

        expect(ref.current.state.earlyOutShow).toBe(false);
    });

    test('confirming_the_early_out_warning_punches_out_and_only_works_because_the_dialog_cannot_read_the_record_id_FINDING_NAVP_EARLY_1', async () => {
        const props = navProps({
            dashboard: dashboardOf({}, {
                time_in: '2026-08-04 08:00:00',
                before_time_in_half: true,
                user_half_timestamp: nowSec() + 7200,
            }),
        });
        const { container, ref } = renderNav(props);
        await flush();

        await click(btn(container, 'Clock Out'));
        await click(btn(container, 'Continue'));

        expect(props.biometrixLog).toHaveBeenCalledTimes(1);
        expect(props.biometrixLog.mock.calls[0][0].get('dtr_id')).toBe('200');
        expect(props.biometrixLog.mock.calls[0][0].get('early_clock_out')).toBe('true');

        // FINDING NAVP-EARLY-1 (characterised, not endorsed): the dialog is mounted as
        //   <EarlyOutModal props={this.props} ... />
        // so inside it `props.dashboard` is undefined and Continue writes dtr_id = undefined.
        // That broken write is load-bearing: onSubmitHandler only dispatches while
        // values["dtr_id"] == null, so a CORRECT dtr_id would silently disable early clock-out.
        props.biometrixLog.mockClear();
        await act(async () => {
            await ref.current.onSubmitHandler({ quickpunch: 'out', early_clock_out: true, dtr_id: 200 });
        });
        expect(props.biometrixLog).not.toHaveBeenCalled();
    });

    test('the_jquery_dropdown_guard_is_declared_but_never_wired_to_the_clock_FINDING_NAVP_DEAD_1', async () => {
        const $ = require('jquery');
        const { ref } = renderNav(navProps());
        await flush();

        // nothing in mount or render calls it...
        expect($).not.toHaveBeenCalled();
        // ...even though it exists and works when called by hand
        await act(async () => { await ref.current.onUIHandler(); });
        expect($).toHaveBeenCalledWith(document);
    });

    /* -------------------------------------------------------- PHASE 4 - SUBMIT */

    test('clocking_in_sends_the_in_punch_for_todays_record_with_the_session_and_the_employee_id', async () => {
        const props = navProps();
        const { container } = renderNav(props);
        await flush();

        await click(btn(container, 'Clock In'));

        expect(props.biometrixLog).toHaveBeenCalledTimes(1);
        const [fd, userId] = props.biometrixLog.mock.calls[0];
        expect(fd.get('quickpunch')).toBe('in');
        expect(fd.get('dtr_id')).toBe('200');
        expect(fd.get('session_id')).toBe('sess-1');
        expect(userId).toBe(42);
    });

    test('clocking_out_after_the_halfway_point_sends_the_out_punch_without_any_warning_dialog', async () => {
        const props = navProps({
            dashboard: dashboardOf({}, {
                time_in: '2026-08-04 08:00:00',
                before_time_in_half: true,
                user_half_timestamp: nowSec() - 7200,     // half mark already passed
            }),
        });
        const { container, ref, queryByText } = renderNav(props);
        await flush();

        await click(btn(container, 'Clock Out'));

        expect(ref.current.state.earlyOutShow).toBe(false);
        expect(queryByText('Clock Out Early?')).toBeNull();
        expect(props.biometrixLog).toHaveBeenCalledTimes(1);
        expect(props.biometrixLog.mock.calls[0][0].get('quickpunch')).toBe('out');
    });

    test('a_punch_from_the_generate_arm_carries_the_generate_flag_and_no_record_id', async () => {
        const props = navProps({ dashboard: { isNavDtrLoaded: true, recent_dtr: [] } });
        const { container } = renderNav(props);
        await flush();

        await click(btn(container, 'Clock In'));

        const fd = props.biometrixLog.mock.calls[0][0];
        expect(fd.get('quickpunch')).toBe('in');
        expect(fd.get('isGenerate')).toBe('true');
        expect(fd.get('dtr_id')).toBeNull();
    });

    test('one_clock_in_with_no_daily_record_fires_the_punch_api_twice_FINDING_NAVP_GEN_1', async () => {
        const props = navProps({ dashboard: { isNavDtrLoaded: true, recent_dtr: [] } });
        const { container } = renderNav(props);
        await flush();

        await click(btn(container, 'Clock In'));

        // FINDING NAVP-GEN-1 (characterised): the "generate yesterday" and "generate today"
        // arms are two independent ifs with no else, so a single click posts /dtr/quickpunch
        // twice with an identical body.
        expect(props.biometrixLog).toHaveBeenCalledTimes(2);
        expect(props.biometrixLog.mock.calls[0][0].get('quickpunch')).toBe('in');
        expect(props.biometrixLog.mock.calls[1][0].get('quickpunch')).toBe('in');
    });

    test('one_clock_out_while_yesterdays_shift_is_still_within_its_window_fires_the_punch_api_twice_FINDING_NAVP_DOUBLE_1', async () => {
        const props = navProps({
            dashboard: dashboardOf(
                { with_in_time: true },
                { time_in: '2026-08-04 08:00:00', with_in_time: false }),
        });
        const { container } = renderNav(props);
        await flush();

        await click(btn(container, 'Clock Out'));

        // FINDING NAVP-DOUBLE-1 (characterised): the today arm punches dtr 200, then the
        // yesterday (PASS0) arm re-uses the SAME FormData object, overwrites dtr_id with 100
        // and punches again. Two punches, and because the FormData is shared the first call's
        // body has already been mutated by the time the network sees it.
        expect(props.biometrixLog).toHaveBeenCalledTimes(2);
        const ids = props.biometrixLog.mock.calls.map((c) => c[0].get('dtr_id'));
        expect(ids).toEqual(['100', '100']);
    });

    test('clocking_in_on_a_rest_day_punches_nothing_at_all_once_todays_rest_day_record_is_inside_its_own_window_FINDING_NAVP_RESTDAY_1', async () => {
        const props = navProps({
            dashboard: dashboardOf(
                { is_rest_day: 0, with_in_time: true, time_in: null },
                { is_rest_day: 1, with_in_time: true }),
        });
        const { container, queryByText } = renderNav(props);
        await flush();

        const b = btn(container, 'Clock In');
        expect(b).toBeTruthy();
        expect(b.disabled).toBe(false);

        await click(b);

        // FINDING NAVP-RESTDAY-1 (characterised, not endorsed): the rest-day buttons write
        // dtr_id in their onClick, and onSubmitHandler's today-arm is gated on
        // values["dtr_id"] == null - so that arm can never run from a rest-day click. The only
        // other arm needs recent_dtr[1].with_in_time != true, which is false as soon as the
        // rest-day record is inside its own window. Result: an enabled, clickable Clock In
        // that posts nothing and shows no message. The button's own dtr_id write is dead in
        // every arm - when a punch does happen the PASS0 arm overwrites it anyway.
        expect(props.biometrixLog).not.toHaveBeenCalled();
        expect(queryByText(/error|failed|cannot/i)).toBeNull();
        expect(btn(container, 'Clock In')).toBeTruthy();      // the button just sits there
    });

    test('clocking_out_on_a_rest_day_reaches_the_server_only_while_yesterday_is_still_within_its_window', async () => {
        const props = navProps({
            dashboard: dashboardOf(
                { is_rest_day: 0, with_in_time: true, time_in: '2026-08-03 22:00' }, { is_rest_day: 1 }),
        });
        const { container } = renderNav(props);
        await flush();

        await click(btn(container, 'Clock Out'));

        expect(props.biometrixLog).toHaveBeenCalledTimes(1);
        const fd = props.biometrixLog.mock.calls[0][0];
        expect(fd.get('quickpunch')).toBe('out');
        expect(fd.get('dtr_id')).toBe('100');                // yesterday's record
    });

    test('a_punch_that_fails_escapes_the_submit_handler_unhandled_FINDING_NAVP_FAIL_1', async () => {
        const props = navProps({
            biometrixLog: jest.fn(() => { throw new Error('quickpunch 500'); }),
        });
        const { ref } = renderNav(props);
        await flush();

        // FINDING NAVP-FAIL-1 (characterised): there is no try/catch anywhere in
        // onSubmitHandler, and the dispatch result is never inspected. A failure leaves the
        // rejection to Formik's "unhandled error caught from submitForm" path.
        await expect(ref.current.onSubmitHandler({ quickpunch: 'out', isGenerate: false }))
            .rejects.toThrow('quickpunch 500');
    });

    test('a_failed_punch_leaves_the_nav_button_exactly_as_it_was_because_the_component_never_reads_the_result', async () => {
        // the real thunk swallows the API error and dispatches a global alert instead
        const props = navProps({
            dashboard: dashboardOf({}, { time_in: '2026-08-04 08:00:00' }),
            biometrixLog: jest.fn(() => undefined),
        });
        const { container, queryByText } = renderNav(props);
        await flush();

        await click(btn(container, 'Clock Out'));

        expect(props.biometrixLog).toHaveBeenCalledTimes(1);
        expect(btn(container, 'Clock Out')).toBeTruthy();
        expect(btn(container, 'Clock Out').disabled).toBe(false);   // re-punchable, no lockout
        expect(queryByText(/error/i)).toBeNull();
    });

    test('the_clock_out_eligibility_helper_reports_whole_hours_since_the_clock_in', async () => {
        const { ref } = renderNav(navProps());
        await flush();

        const threeHoursAgo = new Date(ref.current.state.compare_to_clock_in.getTime() - 3 * 3600 * 1000);
        expect(ref.current.canClockOut(threeHoursAgo.toISOString())).toBe(3);
        expect(ref.current.canClockOut(ref.current.state.compare_to_clock_in.toISOString())).toBe(0);
    });
});

/* ================================================================================
 * QUICK PUNCH - the dashboard punch card
 * ============================================================================== */

const qpProps = (over = {}) => ({
    user: { id: 42, first_name: 'Ana' },
    dashboard: { recent_dtr: [] },
    biometrixLog: jest.fn(),
    getRecentDtr: jest.fn(),
    ...over,
});

describe('Quick punch card (Dashboard) - page lifecycle', () => {
    beforeEach(() => { jest.clearAllMocks(); jest.useFakeTimers(); });
    afterEach(() => jest.useRealTimers());

    /* ----------------------------------------------------- PHASE 1 + 2 */

    test('the_card_opens_on_todays_date_with_a_running_clock_and_both_punch_buttons', async () => {
        const props = qpProps();
        const { container, getByText } = render(<QuickPunch {...props} />);
        await flush();

        expect(getByText(/QUICK PUNCH/i)).toBeInTheDocument();
        expect(container.querySelector('.date').textContent)
            .toBe(moment().format('dddd, MMMM Do'));
        expect(btn(container, 'Clock In')).toBeTruthy();
        expect(btn(container, 'Clock Out')).toBeTruthy();
        expect(container.querySelector('.note').textContent).toMatch(/Night Shift Employees/);
    });

    test('an_employee_who_has_already_clocked_in_today_cannot_clock_in_again', async () => {
        const props = qpProps({
            dashboard: { recent_dtr: [dtrRow({ id: 100 }), dtrRow({ id: 200, time_in: '2026-08-04 08:00' })] },
        });
        const { container } = render(<QuickPunch {...props} />);
        await flush();

        expect(btn(container, 'Clock In').disabled).toBe(true);
        await click(btn(container, 'Clock In'));
        expect(props.biometrixLog).not.toHaveBeenCalled();
    });

    test('a_rest_day_on_both_days_hides_the_punch_buttons_and_points_at_the_rest_day_work_request', async () => {
        const props = qpProps({
            dashboard: { recent_dtr: [dtrRow({ id: 100, is_rest_day: 1 }), dtrRow({ id: 200, is_rest_day: 1 })] },
        });
        const { container } = render(<QuickPunch {...props} />);
        await flush();

        expect(btn(container, 'Clock In')).toBeUndefined();
        expect(btn(container, 'Clock Out')).toBeUndefined();
        expect(container.querySelector('.note').textContent).toMatch(/cannot clock-in on a rest day/);
        expect(container.querySelector('.note a').getAttribute('href')).toBe('/x/');
    });

    test('a_rest_day_today_after_a_worked_yesterday_keeps_only_the_clock_out_for_that_yesterday_record', async () => {
        const props = qpProps({
            dashboard: { recent_dtr: [dtrRow({ id: 100, is_rest_day: 0 }), dtrRow({ id: 200, is_rest_day: 1 })] },
        });
        const { container } = render(<QuickPunch {...props} />);
        await flush();

        expect(btn(container, 'Clock In').disabled).toBe(true);
        await click(btn(container, 'Clock Out'));

        expect(props.biometrixLog).toHaveBeenCalledTimes(1);
        const fd = props.biometrixLog.mock.calls[0][0];
        expect(fd.get('quickpunch')).toBe('out');
        expect(fd.get('dtr_id')).toBe('100');
    });

    /* --------------------------------------------------------- PHASE 3 + 4 */

    test('clicking_clock_in_posts_an_in_punch_for_the_signed_in_employee', async () => {
        const props = qpProps();
        const { container } = render(<QuickPunch {...props} />);
        await flush();

        await click(btn(container, 'Clock In'));

        expect(props.biometrixLog).toHaveBeenCalledTimes(1);
        const [fd, userId] = props.biometrixLog.mock.calls[0];
        expect(fd.get('quickpunch')).toBe('in');
        expect(userId).toBe(42);
    });

    test('clicking_clock_out_posts_an_out_punch_even_when_the_employee_never_clocked_in_FINDING_QP_OUT_1', async () => {
        const props = qpProps();
        const { container } = render(<QuickPunch {...props} />);
        await flush();

        const out = btn(container, 'Clock Out');
        // FINDING QP-OUT-1 (characterised, not endorsed): Clock In is guarded by
        // disabled={recent_dtr[1]?.time_in ? true : false} but Clock Out carries no guard at
        // all, so the card happily posts a clock-out for a shift that was never started and
        // leaves the rejection to the backend.
        expect(out.disabled).toBe(false);

        await click(out);
        expect(props.biometrixLog).toHaveBeenCalledTimes(1);
        expect(props.biometrixLog.mock.calls[0][0].get('quickpunch')).toBe('out');
    });

    test('a_failing_punch_leaves_the_card_usable_and_shows_nothing_of_its_own', async () => {
        const props = qpProps({ biometrixLog: jest.fn(() => undefined) });
        const { container, queryByText } = render(<QuickPunch {...props} />);
        await flush();

        await click(btn(container, 'Clock In'));

        expect(btn(container, 'Clock In')).toBeTruthy();
        expect(queryByText(/error/i)).toBeNull();
    });

    test('leaving_the_dashboard_clears_the_quick_punch_clock_timer', async () => {
        const clearSpy = jest.spyOn(window, 'clearTimeout');
        const { unmount } = render(<QuickPunch {...qpProps()} />);
        await flush();
        unmount();
        expect(clearSpy).toHaveBeenCalled();
        clearSpy.mockRestore();
    });
});

/* ================================================================================
 * MULTI QUICK PUNCH - the multi-login punch card (in / pause / continue / out)
 * ============================================================================== */

const punch = (over = {}) => ({
    recent_log: 'Log_out',
    completed_today: false,
    date: moment().format('Y-MM-DD'),
    date_time_in: moment().hour(8).format('Y-MM-DD HH:mm:ss'),
    date_time_out: moment().hour(17).format('Y-MM-DD HH:mm:ss'),
    time_out: null,
    log_in_type: 'regular',
    ...over,
});

const mqpProps = (over = {}) => ({
    user: { id: 42, user_server_timestamp_mils: null },
    constant: {},
    dashboard: { recent_punch: [], isRecentPunchLoaded: true },
    biometrixLogMulti: jest.fn(),
    ...over,
});

// keep the component off the "select a previous date" arm unless a test asks for it
const midday = () => new Date(new Date().setHours(12, 0, 0, 0));

const renderMqp = (props) => {
    const ref = React.createRef();
    const utils = render(<MultiQuickpunch ref={ref} {...props} />);
    return { ...utils, ref };
};

const atMidday = async (ref) => {
    await act(async () => { ref.current.setState({ time: midday() }); });
};

describe('Multi quick punch card (multi-login) - page lifecycle', () => {
    beforeEach(() => { jest.clearAllMocks(); jest.useFakeTimers(); });
    afterEach(() => jest.useRealTimers());

    /* --------------------------------------------------- PHASE 1 - MOUNT/LOAD */

    test('the_card_shows_only_the_clock_until_the_recent_punches_have_loaded', async () => {
        const props = mqpProps({ dashboard: { recent_punch: [], isRecentPunchLoaded: false } });
        const { container, getByText } = renderMqp(props);
        await flush();

        expect(getByText(/QUICK PUNCH/i)).toBeInTheDocument();
        expect(container.querySelectorAll('button').length).toBe(0);
        expect(btn(container, 'Clock In')).toBeUndefined();
        expect(btn(container, 'Clock Out')).toBeUndefined();
    });

    test('leaving_the_page_clears_the_self_rescheduling_clock_timer', async () => {
        const clearSpy = jest.spyOn(window, 'clearTimeout');
        const { unmount } = renderMqp(mqpProps());
        await flush();
        unmount();
        expect(clearSpy).toHaveBeenCalled();
        clearSpy.mockRestore();
    });

    /* -------------------------------------------------- PHASE 2 - DATA ARRIVES */

    test('an_employee_with_no_punches_today_can_only_clock_in', async () => {
        const { container, ref } = renderMqp(mqpProps());
        await flush();
        await atMidday(ref);

        expect(btn(container, 'Clock In').disabled).toBe(false);
        expect(btn(container, 'Clock Out').disabled).toBe(true);
        expect(btn(container, 'Pause')).toBeUndefined();
        expect(btn(container, 'Continue')).toBeUndefined();
    });

    test('after_clocking_in_the_card_offers_pause_and_clock_out_but_not_another_clock_in', async () => {
        const props = mqpProps({
            dashboard: { recent_punch: [punch({ recent_log: 'Log_in' })], isRecentPunchLoaded: true },
        });
        const { container, ref } = renderMqp(props);
        await flush();
        await atMidday(ref);

        expect(btn(container, 'Clock In').disabled).toBe(true);
        expect(btn(container, 'Pause')).toBeTruthy();
        expect(btn(container, 'Clock Out').disabled).toBe(false);
    });

    test('while_paused_the_card_offers_continue_instead_of_pause_and_blocks_the_clock_out', async () => {
        const props = mqpProps({
            dashboard: { recent_punch: [punch({ recent_log: 'Pause' })], isRecentPunchLoaded: true },
        });
        const { container, ref } = renderMqp(props);
        await flush();
        await atMidday(ref);

        expect(btn(container, 'Continue')).toBeTruthy();
        expect(btn(container, 'Pause')).toBeUndefined();
        expect(btn(container, 'Clock Out').disabled).toBe(true);
    });

    test('a_day_that_is_already_completed_leaves_every_punch_button_dead', async () => {
        const props = mqpProps({
            dashboard: {
                recent_punch: [punch({ recent_log: 'Log_out', completed_today: true, time_out: '17:00' })],
                isRecentPunchLoaded: true,
            },
        });
        const { container, ref } = renderMqp(props);
        await flush();
        await atMidday(ref);

        expect(btn(container, 'Clock In').disabled).toBe(true);
        expect(btn(container, 'Clock Out').disabled).toBe(true);
    });

    test('punching_in_during_the_small_hours_offers_the_previous_day_as_well_as_today', async () => {
        const { container, ref } = renderMqp(mqpProps());
        await flush();
        // 01:00 - inside the 3 hour "still yesterday's shift" window
        await act(async () => { ref.current.setState({ time: new Date(new Date().setHours(1, 0, 0, 0)) }); });

        const select = container.querySelector('select.form-control-sm');
        expect(select).toBeTruthy();
        expect(Array.from(select.options).map((o) => o.label))
            .toEqual([moment().format('Y-MM-DD'), moment().subtract(1, 'day').format('Y-MM-DD')]);
    });

    /* ---------------------------------------------- PHASE 3 + 4 - ACTIONS/SUBMIT */

    test('clicking_clock_in_posts_the_in_punch_straight_away_without_a_confirmation', async () => {
        const props = mqpProps();
        const { container, ref, queryByTestId } = renderMqp(props);
        await flush();
        await atMidday(ref);

        await click(btn(container, 'Clock In'));

        expect(props.biometrixLogMulti).toHaveBeenCalledTimes(1);
        const [fd, userId] = props.biometrixLogMulti.mock.calls[0];
        expect(fd.get('quickpunch')).toBe('in');
        expect(userId).toBe(42);
        expect(queryByTestId('confirm-modal')).toBeNull();
    });

    test('resuming_from_a_pause_posts_the_continue_punch_straight_away', async () => {
        const props = mqpProps({
            dashboard: { recent_punch: [punch({ recent_log: 'Pause' })], isRecentPunchLoaded: true },
        });
        const { container, ref } = renderMqp(props);
        await flush();
        await atMidday(ref);

        await click(btn(container, 'Continue'));

        expect(props.biometrixLogMulti).toHaveBeenCalledTimes(1);
        expect(props.biometrixLogMulti.mock.calls[0][0].get('quickpunch')).toBe('continue');
    });

    test('pausing_asks_for_the_project_and_remarks_first_instead_of_posting', async () => {
        const props = mqpProps({
            dashboard: { recent_punch: [punch({ recent_log: 'Log_in' })], isRecentPunchLoaded: true },
        });
        const { container, ref, getByTestId } = renderMqp(props);
        await flush();
        await atMidday(ref);

        await click(btn(container, 'Pause'));

        expect(props.biometrixLogMulti).not.toHaveBeenCalled();
        expect(getByTestId('confirm-modal')).toBeInTheDocument();
        expect(ref.current.state.temp_values_formdata.quickpunch).toBe('pause');
    });

    test('clocking_out_opens_the_confirm_submission_dialog_and_posts_nothing_yet', async () => {
        const props = mqpProps({
            dashboard: { recent_punch: [punch({ recent_log: 'Log_in' })], isRecentPunchLoaded: true },
        });
        const { container, ref, getByText, getByTestId } = renderMqp(props);
        await flush();
        await atMidday(ref);

        await click(btn(container, 'Clock Out'));

        expect(props.biometrixLogMulti).not.toHaveBeenCalled();
        expect(ref.current.state.showModal).toBe(true);
        expect(getByTestId('confirm-modal')).toBeInTheDocument();
        expect(getByText('Are you sure you want to submit this?')).toBeInTheDocument();
    });

    test('submitting_the_dialog_without_a_project_or_remarks_shows_the_warning_and_never_posts', async () => {
        const props = mqpProps({
            dashboard: { recent_punch: [punch({ recent_log: 'Log_in' })], isRecentPunchLoaded: true },
        });
        const { container, ref, getByText } = renderMqp(props);
        await flush();
        await atMidday(ref);

        await click(btn(container, 'Clock Out'));
        await click(btn(container, 'Submit'));

        expect(props.biometrixLogMulti).not.toHaveBeenCalled();
        expect(getByText('project and remark missing.')).toBeInTheDocument();
        expect(ref.current.state.showModal).toBe(true);
    });

    test('choosing_a_project_and_typing_remarks_posts_the_out_punch_with_both_and_closes_the_dialog', async () => {
        const props = mqpProps({
            dashboard: { recent_punch: [punch({ recent_log: 'Log_in' })], isRecentPunchLoaded: true },
        });
        const { container, ref } = renderMqp(props);
        await flush();
        await atMidday(ref);

        await click(btn(container, 'Clock Out'));

        const projectSelect = container.querySelector('[data-as="select"]');
        const remarks = container.querySelector('[data-as="textarea"]');
        await act(async () => { fireEvent.change(projectSelect, { target: { value: 'EVOX' } }); });
        await act(async () => { fireEvent.change(remarks, { target: { value: 'end of shift' } }); });
        await click(btn(container, 'Submit'));

        expect(props.biometrixLogMulti).toHaveBeenCalledTimes(1);
        const fd = props.biometrixLogMulti.mock.calls[0][0];
        expect(fd.get('quickpunch')).toBe('out');
        expect(fd.get('project_name')).toBe('EVOX');
        expect(fd.get('remarks')).toBe('end of shift');
        expect(ref.current.state.showModal).toBe(false);
    });

    test('cancelling_the_confirm_dialog_closes_it_and_posts_nothing', async () => {
        const props = mqpProps({
            dashboard: { recent_punch: [punch({ recent_log: 'Log_in' })], isRecentPunchLoaded: true },
        });
        const { container, ref, queryByTestId } = renderMqp(props);
        await flush();
        await atMidday(ref);

        await click(btn(container, 'Clock Out'));
        await click(btn(container, 'Cancel'));

        expect(ref.current.state.showModal).toBe(false);
        expect(queryByTestId('confirm-modal')).toBeNull();
        expect(props.biometrixLogMulti).not.toHaveBeenCalled();
    });

    test('punching_for_a_previous_date_asks_the_browser_to_confirm_and_posts_only_when_it_is_accepted', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const props = mqpProps();
        const { container, ref } = renderMqp(props);
        await flush();
        // 01:00 -> initialValues.on_date is true, so the punch goes through window.confirm
        await act(async () => { ref.current.setState({ time: new Date(new Date().setHours(1, 0, 0, 0)) }); });

        await click(btn(container, 'Clock In'));

        expect(confirmSpy).toHaveBeenCalledWith(
            'Are you sure you want Update or create record on seleceted date');
        expect(props.biometrixLogMulti).toHaveBeenCalledTimes(1);
        confirmSpy.mockRestore();
    });

    test('declining_the_previous_date_confirmation_cancels_the_punch', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
        const props = mqpProps();
        const { container, ref } = renderMqp(props);
        await flush();
        await act(async () => { ref.current.setState({ time: new Date(new Date().setHours(1, 0, 0, 0)) }); });

        await click(btn(container, 'Clock In'));

        expect(confirmSpy).toHaveBeenCalled();
        expect(props.biometrixLogMulti).not.toHaveBeenCalled();
        confirmSpy.mockRestore();
    });

    test('changing_the_date_selector_to_yesterday_is_carried_into_the_punch_payload', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const props = mqpProps();
        const { container, ref } = renderMqp(props);
        await flush();
        await act(async () => { ref.current.setState({ time: new Date(new Date().setHours(1, 0, 0, 0)) }); });

        await act(async () => {
            fireEvent.change(container.querySelector('select.form-control-sm'),
                { target: { value: 'yesterday' } });
        });
        await flush();
        await click(btn(container, 'Clock In'));

        expect(props.biometrixLogMulti).toHaveBeenCalledTimes(1);
        expect(props.biometrixLogMulti.mock.calls[0][0].get('date')).toBe('yesterday');
        confirmSpy.mockRestore();
    });
});
