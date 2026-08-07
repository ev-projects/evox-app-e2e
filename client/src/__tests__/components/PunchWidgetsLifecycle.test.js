/**
 * PunchWidgetsLifecycle.test.js
 *
 * SOURCE FILES UNDER TEST
 *   components/Dashboard/PunchComponents/RecentPunch/RecentPunch.js
 *   components/Dashboard/RecentDtrNav/RecentDtrNav.js
 *   components/Template/NavQuickPunch/NavQuickPunch.js
 *
 * MENU PATH
 *   RecentPunch    Sidebar -> Multi Clock-in  (/app/punch_history/, container/DtrPunch)
 *                  -> "Recent Punch" table underneath the multi-login puncher
 *   NavQuickPunch  Top navigation bar (Template/Header) -> the nav clock dropdown.
 *                  Rendered on EVERY authenticated page.
 *   RecentDtrNav   Top navigation bar -> nav clock dropdown -> "RECENT DTR" tab
 *
 * COVERAGE BEFORE THIS SUITE (measured, 29 Jul master run)
 *   RecentPunch.js    0 %      - never mounted by any test
 *   RecentDtrNav.js   60 %
 *   NavQuickPunch.js  56.41 %
 *   66 uncovered statements across the three files.
 *
 * WHAT IS WALKED HERE, PHASE BY PHASE
 *   PHASE 1  MOUNT/FETCH   what each widget asks the server for and with which date window,
 *                          and what it shows while that answer has not arrived
 *   PHASE 2  DATA ARRIVES  which rows render, in which order, with which status label,
 *                          which warning banners fire and which card colour is painted
 *   PHASE 3  PUNCH STATE   which DTR rows offer a Clock Out control and which do not
 *                          (open / closed / stale / never-clocked-in)
 *   PHASE 4  SUBMIT        the FormData actually dispatched by the RECENT DTR tab
 *
 * FINDINGS characterised below (each test asserts TODAY's behaviour, it does not endorse it):
 *   RDN-HOLIDAY-1  RecentDtrNav builds a `status` block containing the holiday name via
 *                  DtrFormatter.displayHoliday and then never renders it. On a holiday the
 *                  employee sees only a changed card background - the holiday name is
 *                  nowhere in the nav dropdown. (Pure JSX/JS, identical in Chrome.)
 *   RDN-RESTDAY-1  The "you cannot clock in on a rest day" notice is keyed strictly on
 *                  recent_dtr[1]. The missing-schedule warning right above it falls back to
 *                  recent_dtr[0]; the rest-day notice does not, so when the window returns a
 *                  single DTR row the notice can never appear. (Pure JS, identical in Chrome.)
 *   RDN-SESSION-1  A punch fired from the RECENT DTR tab carries no session_id, while the
 *                  very same /dtr/quickpunch call fired from the nav clock (NavPuncher) sets
 *                  session_id from localStorage. Two punch paths, two different payloads.
 *
 * DEAD CODE RECORDED (reachable by no click - reported, not fixed):
 *   RecentPunch.js   lines 24-39   onSubmitHandler + the biometrixLog dispatch: render()
 *                                  emits no <form> and no <Button>, so nothing can call it.
 *   RecentDtrNav.js  lines 130-133 `status` (attendance slug block + holiday list) is built
 *                                  on every row and never placed in the returned JSX.
 *   RecentDtrNav.js  lines 190-193 the inner `recent_dtr.length > 0` else-arm ("loading"
 *                                  card) sits inside a branch the outer ternary only enters
 *                                  when the same condition is already true.
 *   RecentDtrNav.js  lines 70-71   canClockOut's `!clock_in && !this.state.compare_to_clock_in`
 *                                  guard: compare_to_clock_in is always a Date, so the guard
 *                                  can never return 0.
 *   RecentDtrNav.js  lines 80-81   `from` / `to` computed on every render, never read.
 *   NavQuickPunch.js lines 72-74   `showErr` computed on every render and never rendered.
 *   NavQuickPunch.js lines 55-63   onClickHandler() has an empty body and no caller.
 *   NavQuickPunch.js line 83       the component passes user.id to getMyDtrNotifications, but
 *                                  mapDispatchToProps is `() => dispatch(getMyDtrNotifications())`
 *                                  and drops it. (Read, not asserted - connect() is stubbed
 *                                  out by the house react-redux mock, so the wrapper's
 *                                  mapDispatchToProps is not exercised here.)
 *
 * DETERMINISM
 *   The wall clock is pinned to a fixed instant for every test (both widgets build their
 *   fetch window from moment(), and RecentDtrNav's clock-out window is measured against
 *   state.compare_to_clock_in). Jest fake timers drive RecentDtrNav's 1-second interval.
 *   No assertion depends on the real date.
 *
 * ADDITIVE ONLY - no existing test file and no application source was touched.
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

jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader: ({ children }) => <div>{children}</div>,
    Content: ({ children }) => <div>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody: ({ children }) => <div>{children}</div>,
    Row: ({ children }) => <div>{children}</div>,
    Col: ({ children }) => <div>{children}</div>,
}));
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);

// NavQuickPunch's three children - stubbed so this suite measures NavQuickPunch itself.
// NOTE: this mocks the folder INDEX modules only; RecentDtrNav.js is required directly
// further down and stays REAL.
jest.mock('../../components/Template/NavPuncher/NavPuncher',
    () => () => <div data-testid="nav-puncher" />);
jest.mock('../../components/Dashboard/RecentDtrNav',
    () => () => <div data-testid="recent-dtr-nav" />);
jest.mock('../../components/Dashboard/DtrNotifications',
    () => () => <div data-testid="dtr-notifications" />);

jest.mock('../../store/actions/userActions', () => ({
    logOut: jest.fn(),
    fetchUser: jest.fn(),
}));
jest.mock('../../store/actions/dashboard/dashboardActions', () => ({
    getRecentPunches: jest.fn(),
    getRecentDtr: jest.fn(),
    getMyDtrNotifications: jest.fn(),
    clearRecentDtrInstance: jest.fn(),
}));
jest.mock('../../store/actions/dtr/quickpunchActions', () => ({ biometrixLog: jest.fn() }));
jest.mock('../../store/actions/dtr/dtrActions', () => ({ getIncompleteDtr: jest.fn() }));

jest.mock('react-bootstrap', () => {
    const R = require('react');
    const passthrough = ({ children }) => R.createElement('div', null, children);

    const Dropdown = passthrough;
    Dropdown.Toggle = passthrough;
    Dropdown.Menu = passthrough;
    Dropdown.Item = passthrough;

    const Tab = ({ children, title, eventKey, disabled, id }) =>
        R.createElement('div', {
            'data-testid': 'tab',
            'data-eventkey': eventKey || '',
            'data-title': typeof title === 'string' ? title : '',
            'data-id': id || '',
            'data-disabled': disabled ? 'true' : 'false',
        }, children);

    return {
        Dropdown,
        Tab,
        Tabs: ({ children }) => R.createElement('div', { 'data-testid': 'tabs' }, children),
        Container: ({ children, className }) => R.createElement('div', { className }, children),
        Row: ({ children, className }) => R.createElement('div', { className }, children),
        Col: ({ children, className }) => R.createElement('div', { className }, children),
        Card: ({ children, className }) => R.createElement('div', { className }, children),
        Table: ({ children, className }) => R.createElement('table', { className }, children),
        Image: () => R.createElement('img', { alt: '' }),
        Spinner: () => R.createElement('div', { 'data-testid': 'spinner' }),
        Badge: ({ children }) => R.createElement('span', null, children),
        Modal: passthrough,
        Form: passthrough,
        Button: ({ children, onClick, type, disabled, className }) =>
            R.createElement('button',
                { onClick, type: type || 'button', disabled: !!disabled, className },
                children),
    };
});

// resolve every global link to a path that names the link key, so a rendered href is checkable
global.links = new Proxy({}, {
    get: (_t, prop) => (typeof prop === 'string' ? '/x/' + prop : undefined),
});

const RecentPunch =
    require('../../components/Dashboard/PunchComponents/RecentPunch/RecentPunch').default;
const RecentDtrNav =
    require('../../components/Dashboard/RecentDtrNav/RecentDtrNav').default;
const NavQuickPunch =
    require('../../components/Template/NavQuickPunch/NavQuickPunch').default;

/* ------------------------------------------------------------------ pinned clock */

const RealDate = Date;
const FIXED_MS = new RealDate('2026-08-04T06:00:00.000Z').getTime();

function pinClock() {
    // eslint-disable-next-line no-global-assign
    global.Date = class extends RealDate {
        constructor(...args) {
            if (args.length === 0) return new RealDate(FIXED_MS);
            return new RealDate(...args);
        }
        static now() { return FIXED_MS; }
    };
}
function unpinClock() {
    // eslint-disable-next-line no-global-assign
    global.Date = RealDate;
}

const at = (hoursBefore) => new RealDate(FIXED_MS - hoursBefore * 3600 * 1000).toISOString();
const day = (offsetDays = 0) => moment(FIXED_MS).add(offsetDays, 'days').format('YYYY-MM-DD');

/* ----------------------------------------------------------------------- helpers */

const flush = async () => {
    await act(async () => { await Promise.resolve(); });
    await act(async () => { await Promise.resolve(); });
    await act(async () => { await Promise.resolve(); });
};

const click = async (el) => {
    await act(async () => { fireEvent.click(el); });
    await flush();
};

const btn = (container, label) =>
    Array.from(container.querySelectorAll('button'))
        .find((b) => b.textContent.indexOf(label) !== -1);

const texts = (nodes) => Array.from(nodes).map((n) => n.textContent.trim());

/* =================================================================================
 * RECENT PUNCH  -  Sidebar -> Multi Clock-in -> "Recent Punch" table
 * =============================================================================== */

const punchRow = (over = {}) => ({
    date: day(0),
    time_in: '09:01:00',
    time_out: '18:04:00',
    hours: '9.05',
    project_name: 'Project Atlas',
    log_in_type: 'Log_in',
    log_out_type: 'Log_out',
    ...over,
});

const punchProps = (over = {}) => ({
    user: { id: 42, first_name: 'Ana' },
    dashboard: { recent_punch: [], isRecentPunchLoaded: false },
    getRecentPunches: jest.fn(),
    biometrixLog: jest.fn(),
    ...over,
});

const renderPunch = (props) => {
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter><RecentPunch ref={ref} {...props} /></MemoryRouter>
    );
    return { ...utils, ref };
};

describe('Recent Punch table (Sidebar -> Multi Clock-in) - page lifecycle', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        pinClock();
        jest.useFakeTimers();
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });
    afterEach(() => {
        console.log.mockRestore();
        jest.clearAllTimers();
        jest.useRealTimers();
        unpinClock();
    });

    /* --------------------------------------------------- PHASE 1 - MOUNT / FETCH */

    test('opening_the_punch_history_page_asks_the_server_for_the_signed_in_employees_punches_from_yesterday_up_to_today', async () => {
        const props = punchProps();
        renderPunch(props);
        await flush();

        expect(props.getRecentPunches).toHaveBeenCalledTimes(1);
        expect(props.getRecentPunches)
            .toHaveBeenCalledWith(42, day(-1), day(0));
    });

    test('the_punch_window_requested_on_mount_is_exactly_two_calendar_days_wide', async () => {
        const props = punchProps();
        renderPunch(props);
        await flush();

        const [, from, to] = props.getRecentPunches.mock.calls[0];
        expect(moment(to, 'YYYY-MM-DD').diff(moment(from, 'YYYY-MM-DD'), 'days')).toBe(1);
    });

    test('while_the_punch_list_is_still_loading_the_widget_shows_neither_the_table_nor_the_empty_message_even_though_rows_are_already_in_the_store', async () => {
        const props = punchProps({
            dashboard: { recent_punch: [punchRow()], isRecentPunchLoaded: false },
        });
        const { container } = renderPunch(props);
        await flush();

        expect(container.querySelector('table')).toBeNull();
        expect(container.textContent).not.toContain('No Previous Punch logs');
    });

    test('the_punch_history_is_fetched_once_per_visit_and_not_again_when_the_store_pushes_new_rows_in', async () => {
        const props = punchProps();
        const { rerender } = renderPunch(props);
        await flush();

        rerender(
            <MemoryRouter>
                <RecentPunch
                    {...props}
                    dashboard={{ recent_punch: [punchRow()], isRecentPunchLoaded: true }}
                />
            </MemoryRouter>
        );
        await flush();

        expect(props.getRecentPunches).toHaveBeenCalledTimes(1);
    });

    /* ------------------------------------------------- PHASE 2 - DATA ARRIVES */

    test('an_employee_with_no_punches_in_the_window_is_told_there_are_no_previous_punch_logs_instead_of_being_shown_an_empty_table', async () => {
        const props = punchProps({
            dashboard: { recent_punch: [], isRecentPunchLoaded: true },
        });
        const { container } = renderPunch(props);
        await flush();

        expect(container.querySelector('.no-previous-dtr').textContent)
            .toBe('No Previous Punch logs');
        expect(container.querySelector('table')).toBeNull();
    });

    test('the_loaded_punch_table_carries_the_six_columns_an_employee_reads_in_order', async () => {
        const props = punchProps({
            dashboard: { recent_punch: [punchRow()], isRecentPunchLoaded: true },
        });
        const { container } = renderPunch(props);
        await flush();

        expect(texts(container.querySelectorAll('thead th'))).toEqual([
            'Date', 'Clock In', 'Clock Out', 'Hour Count', 'Punch Status', 'Project Worked on',
        ]);
    });

    test('each_punch_row_shows_the_date_the_in_time_the_out_time_the_hour_count_and_the_project_worked_on', async () => {
        const props = punchProps({
            dashboard: {
                recent_punch: [punchRow({
                    date: day(0), time_in: '09:01:00', time_out: '18:04:00',
                    hours: '9.05', project_name: 'Project Atlas',
                })],
                isRecentPunchLoaded: true,
            },
        });
        const { container } = renderPunch(props);
        await flush();

        const cells = texts(container.querySelectorAll('tbody tr td'));
        expect(cells[0]).toBe(day(0));
        expect(cells[1]).toBe('09:01:00');
        expect(cells[2]).toBe('18:04:00');
        expect(cells[3]).toBe('9.05');
        expect(cells[5]).toBe('Project Atlas');
    });

    test('the_punch_table_lists_the_newest_punch_first_by_reversing_the_order_the_server_sent', async () => {
        const props = punchProps({
            dashboard: {
                recent_punch: [
                    punchRow({ date: day(-1), project_name: 'Oldest' }),
                    punchRow({ date: day(0), project_name: 'Middle' }),
                    punchRow({ date: day(0), project_name: 'Newest' }),
                ],
                isRecentPunchLoaded: true,
            },
        });
        const { container } = renderPunch(props);
        await flush();

        const projects = Array.from(container.querySelectorAll('tbody tr'))
            .map((tr) => tr.querySelectorAll('td')[5].textContent.trim());
        expect(projects).toEqual(['Newest', 'Middle', 'Oldest']);
    });

    test('reversing_the_punch_rows_for_display_does_not_reorder_the_array_held_in_the_store', async () => {
        const rows = [
            punchRow({ project_name: 'A' }),
            punchRow({ project_name: 'B' }),
        ];
        const props = punchProps({
            dashboard: { recent_punch: rows, isRecentPunchLoaded: true },
        });
        renderPunch(props);
        await flush();

        expect(rows.map((r) => r.project_name)).toEqual(['A', 'B']);
    });

    /* ------------------------------------------- PHASE 2b - PUNCH STATUS COLUMN */

    const statusOf = (container, rowIndex = 0) => {
        const cell = container.querySelectorAll('tbody tr')[rowIndex].querySelectorAll('td')[4];
        const icon = cell.querySelector('i');
        return {
            label: cell.querySelector('b').textContent,
            icon: icon ? icon.getAttribute('class') : null,
        };
    };

    const renderStatus = async (over) => {
        const props = punchProps({
            dashboard: { recent_punch: [punchRow(over)], isRecentPunchLoaded: true },
        });
        const { container } = renderPunch(props);
        await flush();
        return container;
    };

    test('a_punch_that_was_clocked_in_and_clocked_out_normally_is_labelled_logout_with_the_sign_out_icon', async () => {
        const container = await renderStatus({ log_in_type: 'Log_in', log_out_type: 'Log_out' });
        expect(statusOf(container)).toEqual({ label: 'Logout', icon: 'fa fa-sign-out' });
    });

    test('a_punch_resumed_from_a_pause_and_then_clocked_out_is_also_labelled_logout', async () => {
        const container = await renderStatus({ log_in_type: 'Continue', log_out_type: 'Log_out' });
        expect(statusOf(container)).toEqual({ label: 'Logout', icon: 'fa fa-sign-out' });
    });

    test('a_punch_closed_with_a_pause_is_labelled_pause_with_the_pause_icon', async () => {
        const container = await renderStatus({ log_in_type: 'Log_in', log_out_type: 'Pause' });
        expect(statusOf(container)).toEqual({ label: 'Pause', icon: 'fa fa-pause' });
    });

    test('a_rest_day_work_punch_that_is_not_closed_by_a_pause_is_labelled_rest_day_work_with_the_calendar_icon', async () => {
        const container = await renderStatus({
            log_in_type: 'rest_day_work', log_out_type: null,
        });
        expect(statusOf(container)).toEqual({ label: 'Rest Day Work', icon: 'fa fa-calendar-times-o' });
    });

    test('a_rest_day_work_punch_that_is_still_open_but_paused_reports_pause_because_the_pause_check_is_evaluated_before_the_rest_day_check', async () => {
        const container = await renderStatus({
            log_in_type: 'rest_day_work', log_out_type: 'Pause',
        });
        expect(statusOf(container)).toEqual({ label: 'Pause', icon: 'fa fa-pause' });
    });

    test('a_punch_that_is_still_running_has_a_blank_punch_status_and_no_icon', async () => {
        const container = await renderStatus({
            log_in_type: 'Log_in', log_out_type: null, time_out: null,
        });
        expect(statusOf(container)).toEqual({ label: '', icon: null });
    });

    /* -------------------------------------------------- DEAD CODE - no submit UI */

    test('the_recent_punch_table_is_read_only_it_renders_no_form_and_no_button_so_its_punch_dispatch_can_never_fire', async () => {
        const props = punchProps({
            dashboard: { recent_punch: [punchRow(), punchRow()], isRecentPunchLoaded: true },
        });
        const { container } = renderPunch(props);
        await flush();

        // DEAD CODE (RecentPunch.js 24-39): onSubmitHandler builds a FormData and dispatches
        // biometrixLog, but render() emits no <form>, no <Formik> and no <Button>.
        expect(container.querySelectorAll('form').length).toBe(0);
        expect(container.querySelectorAll('button').length).toBe(0);
        expect(props.biometrixLog).not.toHaveBeenCalled();
    });
});

/* =================================================================================
 * RECENT DTR NAV  -  top nav clock dropdown -> "RECENT DTR" tab
 * =============================================================================== */

const dtrRow = (over = {}) => ({
    id: 500,
    date: day(0),
    attendance_status: { slug: 'present', name: 'Present' },
    holidays: [],
    is_rest_day: 0,
    start_datetime: day(0) + ' 09:00:00',
    end_datetime: day(0) + ' 18:00:00',
    start_flexy_datetime: null,
    end_flexy_datetime: null,
    time_in: null,
    time_out: null,
    ...over,
});

const navDashboard = (yesterday = {}, today = {}) => ({
    recent_dtr: [
        dtrRow({ id: 500, date: day(-1), start_datetime: day(-1) + ' 09:00:00', ...yesterday }),
        dtrRow({ id: 600, date: day(0), ...today }),
    ],
});

const dtrNavProps = (over = {}) => ({
    user: { id: 42, first_name: 'Ana' },
    dashboard: navDashboard(),
    getRecentDtr: jest.fn(),
    biometrixLog: jest.fn(),
    fetchUser: jest.fn(),
    ...over,
});

const renderDtrNav = (props) => {
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter><RecentDtrNav ref={ref} {...props} /></MemoryRouter>
    );
    return { ...utils, ref };
};

const cards = (container) => Array.from(container.querySelectorAll('.card-body.card-size'));

describe('Recent DTR tab of the nav clock dropdown - page lifecycle', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        pinClock();
        jest.useFakeTimers();
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });
    afterEach(() => {
        console.log.mockRestore();
        jest.clearAllTimers();
        jest.useRealTimers();
        unpinClock();
    });

    /* --------------------------------------------------- PHASE 1 - MOUNT / CLOCK */

    test('opening_the_recent_dtr_tab_never_fetches_the_daily_record_itself_it_only_paints_what_another_screen_already_loaded', async () => {
        const props = dtrNavProps();
        renderDtrNav(props);
        await flush();

        expect(props.getRecentDtr).not.toHaveBeenCalled();
    });

    test('the_recent_dtr_tab_re_reads_the_wall_clock_every_second_so_the_clock_out_window_keeps_shrinking_while_the_dropdown_is_open', async () => {
        const props = dtrNavProps();
        const { ref } = renderDtrNav(props);
        await flush();

        const before = ref.current.state.compare_to_clock_in;
        act(() => { jest.advanceTimersByTime(1000); });
        expect(ref.current.state.compare_to_clock_in).not.toBe(before);

        const second = ref.current.state.compare_to_clock_in;
        act(() => { jest.advanceTimersByTime(1000); });
        expect(ref.current.state.compare_to_clock_in).not.toBe(second);
    });

    test('closing_the_dropdown_cancels_the_one_second_clock_using_the_timer_handle_that_was_opened', async () => {
        const props = dtrNavProps();
        const { ref, unmount } = renderDtrNav(props);
        await flush();

        const handle = ref.current.timer;
        expect(handle).not.toBe(0);
        const clearSpy = jest.spyOn(window, 'clearTimeout');

        unmount();

        expect(clearSpy).toHaveBeenCalledWith(handle);
        clearSpy.mockRestore();
    });

    /* ---------------------------------------------------- PHASE 2 - DATA ARRIVES */

    test('an_employee_with_no_daily_record_in_the_window_sees_no_previous_dtr_and_no_cards', async () => {
        const props = dtrNavProps({ dashboard: { recent_dtr: [] } });
        const { container } = renderDtrNav(props);
        await flush();

        expect(container.querySelector('.no-previous-dtr').textContent).toBe('No Previous DTR');
        expect(cards(container).length).toBe(0);
    });

    test('after_the_daily_record_cache_is_cleared_to_an_empty_object_the_tab_degrades_to_no_previous_dtr_rather_than_breaking', async () => {
        // CLEAR_RECENT_DTR_INSTANCE writes recent_dtr : {} - an object, not an array
        const props = dtrNavProps({ dashboard: { recent_dtr: {} } });
        const { container } = renderDtrNav(props);
        await flush();

        expect(container.querySelector('.no-previous-dtr').textContent).toBe('No Previous DTR');
    });

    test('the_two_fetched_days_are_shown_newest_first_with_the_attendance_status_name_on_each_card', async () => {
        const props = dtrNavProps({
            dashboard: navDashboard(
                { attendance_status: { slug: 'absent', name: 'Absent' } },
                { attendance_status: { slug: 'present', name: 'Present' } }),
        });
        const { container } = renderDtrNav(props);
        await flush();

        const cardTexts = texts(container.querySelectorAll('.card-text'));
        expect(cardTexts.length).toBe(2);
        expect(cardTexts[0]).toContain('Present');
        expect(cardTexts[0]).toContain(moment(day(0)).format('MMM'));
        expect(cardTexts[1]).toContain('Absent');
    });

    test('a_daily_record_dated_in_the_future_is_dropped_from_the_tab_so_tomorrows_generated_row_is_never_shown', async () => {
        const props = dtrNavProps({
            dashboard: {
                recent_dtr: [
                    dtrRow({ id: 500, date: day(0) }),
                    dtrRow({ id: 600, date: day(2), attendance_status: { slug: 'future', name: 'Future' } }),
                ],
            },
        });
        const { container } = renderDtrNav(props);
        await flush();

        expect(cards(container).length).toBe(1);
        expect(container.textContent).not.toContain('Future');
    });

    test('the_loading_placeholder_card_is_unreachable_because_the_only_branch_that_could_show_it_already_requires_rows_to_exist', async () => {
        // DEAD CODE (RecentDtrNav.js 190-193)
        const populated = renderDtrNav(dtrNavProps());
        await flush();
        expect(populated.container.textContent).not.toContain('loading');
        populated.unmount();

        const empty = renderDtrNav(dtrNavProps({ dashboard: { recent_dtr: [] } }));
        await flush();
        expect(empty.container.textContent).not.toContain('loading');
        expect(empty.container.textContent).toContain('No Previous DTR');
    });

    /* ------------------------------------------ PHASE 2b - CARD COLOUR / HOLIDAY */

    test('an_ordinary_working_day_paints_the_card_with_the_attendance_status_slug', async () => {
        const props = dtrNavProps({
            dashboard: { recent_dtr: [dtrRow({ attendance_status: { slug: 'late', name: 'Late' } })] },
        });
        const { container } = renderDtrNav(props);
        await flush();

        expect(cards(container)[0].getAttribute('class')).toContain('late-bg-color');
    });

    test('a_rest_day_with_no_holiday_paints_the_card_as_a_rest_day_instead_of_using_the_attendance_status', async () => {
        const props = dtrNavProps({
            dashboard: {
                recent_dtr: [dtrRow({
                    is_rest_day: 1,
                    attendance_status: { slug: 'absent', name: 'Absent' },
                })],
            },
        });
        const { container } = renderDtrNav(props);
        await flush();

        const cls = cards(container)[0].getAttribute('class');
        expect(cls).toContain('rest_day-bg-color');
        expect(cls).not.toContain('absent-bg-color');
    });

    test('a_holiday_outranks_both_the_attendance_status_and_the_rest_day_flag_when_the_card_colour_is_chosen', async () => {
        const props = dtrNavProps({
            dashboard: {
                recent_dtr: [dtrRow({
                    is_rest_day: 1,
                    attendance_status: { slug: 'absent', name: 'Absent' },
                    holidays: [{ type: 'legal_holiday', name: 'Independence Day' }],
                })],
            },
        });
        const { container } = renderDtrNav(props);
        await flush();

        const cls = cards(container)[0].getAttribute('class');
        expect(cls).toContain('legal_holiday-bg-color');
        expect(cls).not.toContain('rest_day-bg-color');
    });

    test('the_holiday_name_is_computed_for_every_card_and_then_never_shown_to_the_employee_FINDING_RDN_HOLIDAY_1', async () => {
        const props = dtrNavProps({
            dashboard: {
                recent_dtr: [dtrRow({
                    attendance_status: { slug: 'absent', name: 'Absent' },
                    holidays: [{ type: 'legal_holiday', name: 'Independence Day' }],
                })],
            },
        });
        const { container } = renderDtrNav(props);
        await flush();

        // FINDING RDN-HOLIDAY-1 (characterised): `status` - the block that carries
        // DtrFormatter.displayHoliday(dtr.holidays) - is assigned on every row and is never
        // placed in the returned JSX. Only the background colour changes; the employee is
        // never told WHICH holiday it is.
        expect(cards(container)[0].getAttribute('class')).toContain('legal_holiday-bg-color');
        expect(container.textContent).not.toContain('Independence Day');
    });

    /* --------------------------------------------------- PHASE 2c - WARNING BANNERS */

    const MISSING_SCHEDULE = 'on a day with no';
    const RESTDAY_NOTICE = 'You cannot clock-in on a';

    test('clocking_in_on_a_day_with_no_default_schedule_raises_the_missing_schedule_warning', async () => {
        const props = dtrNavProps({
            dashboard: navDashboard({}, {
                start_datetime: null, time_in: at(2), is_rest_day: 0,
            }),
        });
        const { container } = renderDtrNav(props);
        await flush();

        expect(container.textContent).toContain(MISSING_SCHEDULE);
    });

    test('a_day_that_has_a_default_schedule_raises_no_missing_schedule_warning', async () => {
        const props = dtrNavProps({
            dashboard: navDashboard({}, { time_in: at(2) }),
        });
        const { container } = renderDtrNav(props);
        await flush();

        expect(container.textContent).not.toContain(MISSING_SCHEDULE);
    });

    test('when_today_is_fine_the_missing_schedule_warning_still_fires_for_yesterdays_unscheduled_clock_in', async () => {
        const props = dtrNavProps({
            dashboard: navDashboard(
                { start_datetime: null, time_in: at(20), is_rest_day: 0 },
                { time_in: at(2) }),
        });
        const { container } = renderDtrNav(props);
        await flush();

        expect(container.textContent).toContain(MISSING_SCHEDULE);
    });

    test('a_day_with_no_schedule_that_was_never_clocked_into_raises_no_missing_schedule_warning', async () => {
        const props = dtrNavProps({
            dashboard: navDashboard(
                { start_datetime: null, time_in: null },
                { start_datetime: null, time_in: null }),
        });
        const { container } = renderDtrNav(props);
        await flush();

        expect(container.textContent).not.toContain(MISSING_SCHEDULE);
    });

    test('an_unscheduled_rest_day_is_excluded_from_the_missing_schedule_warning', async () => {
        const props = dtrNavProps({
            dashboard: navDashboard({}, {
                start_datetime: null, time_in: at(2), is_rest_day: 1,
            }),
        });
        const { container } = renderDtrNav(props);
        await flush();

        expect(container.textContent).not.toContain(MISSING_SCHEDULE);
    });

    test('when_today_is_a_rest_day_the_employee_is_pointed_at_the_rest_day_work_request_form', async () => {
        const props = dtrNavProps({
            dashboard: navDashboard({}, { is_rest_day: 1 }),
        });
        const { container } = renderDtrNav(props);
        await flush();

        expect(container.textContent).toContain(RESTDAY_NOTICE);
        expect(container.querySelector('.alert-restday-notice a').getAttribute('href'))
            .toBe('/x/rest_day_work');
    });

    test('an_ordinary_working_day_shows_no_rest_day_notice', async () => {
        const props = dtrNavProps();
        const { container } = renderDtrNav(props);
        await flush();

        expect(container.textContent).not.toContain(RESTDAY_NOTICE);
        expect(container.querySelector('.alert-restday-notice')).toBeNull();
    });

    test('a_single_row_rest_day_never_produces_the_rest_day_notice_even_though_the_warning_above_it_falls_back_to_that_row_FINDING_RDN_RESTDAY_1', async () => {
        const single = dtrNavProps({
            dashboard: {
                recent_dtr: [dtrRow({
                    is_rest_day: 1, start_datetime: null, time_in: at(2),
                })],
            },
        });
        const { container } = renderDtrNav(single);
        await flush();

        // FINDING RDN-RESTDAY-1 (characterised): restDay_notice reads recent_dtr[1] only.
        // dtr_warning, three lines above, falls back to recent_dtr[0] when [1] does not
        // match - the rest-day notice has no such fallback, so a one-row window silently
        // loses the "request a Rest Day Work" pointer.
        expect(container.querySelector('.alert-restday-notice')).toBeNull();
        expect(container.textContent).not.toContain(RESTDAY_NOTICE);
        // and the card itself is still painted as a rest day, so the day IS known to be one
        expect(cards(container)[0].getAttribute('class')).toContain('rest_day-bg-color');
    });

    /* --------------------------------------------- PHASE 3 - WHO CAN CLOCK OUT */

    test('a_day_that_is_still_open_and_was_clocked_into_within_the_last_22_hours_offers_a_clock_out_button', async () => {
        const props = dtrNavProps({
            dashboard: { recent_dtr: [dtrRow({ time_in: at(3), time_out: null })] },
        });
        const { container } = renderDtrNav(props);
        await flush();

        expect(btn(container, 'Clock Out')).toBeTruthy();
    });

    test('a_day_already_clocked_out_offers_no_clock_out_button_and_shows_the_out_log_instead', async () => {
        const props = dtrNavProps({
            dashboard: { recent_dtr: [dtrRow({ time_in: at(9), time_out: at(1) })] },
        });
        const { container } = renderDtrNav(props);
        await flush();

        expect(btn(container, 'Clock Out')).toBeUndefined();
        expect(container.querySelectorAll('.in-out .month').length).toBe(2);
    });

    test('a_day_that_was_never_clocked_into_offers_no_clock_out_button', async () => {
        const props = dtrNavProps({
            dashboard: { recent_dtr: [dtrRow({ time_in: null, time_out: null })] },
        });
        const { container } = renderDtrNav(props);
        await flush();

        expect(btn(container, 'Clock Out')).toBeUndefined();
    });

    test('an_open_punch_21_hours_old_can_still_be_closed_from_the_dropdown', async () => {
        const props = dtrNavProps({
            dashboard: { recent_dtr: [dtrRow({ time_in: at(21), time_out: null })] },
        });
        const { container } = renderDtrNav(props);
        await flush();

        expect(btn(container, 'Clock Out')).toBeTruthy();
    });

    test('an_open_punch_that_has_reached_22_hours_loses_its_clock_out_button_and_the_employee_is_left_with_no_way_to_close_the_day_here', async () => {
        const props = dtrNavProps({
            dashboard: { recent_dtr: [dtrRow({ time_in: at(22), time_out: null })] },
        });
        const { container } = renderDtrNav(props);
        await flush();

        expect(btn(container, 'Clock Out')).toBeUndefined();
    });

    test('the_clock_out_window_is_measured_from_the_ticking_clock_so_a_punch_that_ages_past_the_limit_loses_its_button_without_a_refetch', async () => {
        const props = dtrNavProps({
            dashboard: { recent_dtr: [dtrRow({ time_in: at(21), time_out: null })] },
        });
        const { container, ref } = renderDtrNav(props);
        await flush();

        expect(btn(container, 'Clock Out')).toBeTruthy();   // 21h old -> inside the window
        // push state.compare_to_clock_in forward by 2 hours through the component's own setter
        await act(async () => {
            ref.current.setState({
                compare_to_clock_in: new RealDate(FIXED_MS + 2 * 3600 * 1000),
            });
        });

        expect(btn(container, 'Clock Out')).toBeUndefined();
    });

    /* -------------------------------------------------------- PHASE 4 - SUBMIT */

    test('clocking_out_from_the_recent_dtr_tab_sends_an_out_punch_for_that_exact_day_and_that_employee', async () => {
        const props = dtrNavProps({
            dashboard: { recent_dtr: [dtrRow({ id: 777, time_in: at(3), time_out: null })] },
        });
        const { container } = renderDtrNav(props);
        await flush();

        await click(btn(container, 'Clock Out'));

        expect(props.biometrixLog).toHaveBeenCalledTimes(1);
        const [formData, userId] = props.biometrixLog.mock.calls[0];
        expect(formData.get('quickpunch')).toBe('out');
        expect(formData.get('dtr_id')).toBe('777');
        expect(userId).toBe(42);
    });

    test('with_two_open_days_on_screen_each_clock_out_button_closes_only_its_own_day', async () => {
        const props = dtrNavProps({
            dashboard: {
                recent_dtr: [
                    dtrRow({ id: 111, date: day(-1), start_datetime: day(-1) + ' 09:00:00', time_in: at(20) }),
                    dtrRow({ id: 222, date: day(0), time_in: at(3) }),
                ],
            },
        });
        const { container } = renderDtrNav(props);
        await flush();

        const buttons = Array.from(container.querySelectorAll('button'))
            .filter((b) => b.textContent.indexOf('Clock Out') !== -1);
        expect(buttons.length).toBe(2);

        // rows are reversed for display, so the FIRST button belongs to today (id 222)
        await click(buttons[0]);
        expect(props.biometrixLog.mock.calls[0][0].get('dtr_id')).toBe('222');

        await click(buttons[1]);
        expect(props.biometrixLog.mock.calls[1][0].get('dtr_id')).toBe('111');
    });

    test('a_punch_fired_from_the_recent_dtr_tab_carries_no_session_id_unlike_the_same_punch_fired_from_the_nav_clock_FINDING_RDN_SESSION_1', async () => {
        localStorage.setItem('session_id', 'sess-99');
        const props = dtrNavProps({
            dashboard: { recent_dtr: [dtrRow({ id: 777, time_in: at(3) })] },
        });
        const { container } = renderDtrNav(props);
        await flush();

        await click(btn(container, 'Clock Out'));

        // FINDING RDN-SESSION-1 (characterised): NavPuncher.onSubmitHandler does
        // formData.set('session_id', localStorage.getItem('session_id')) before dispatching
        // the identical biometrixLog call. RecentDtrNav.onSubmitHandler does not, so the
        // same /dtr/quickpunch endpoint receives two different payload shapes depending on
        // which control the employee used.
        const formData = props.biometrixLog.mock.calls[0][0];
        expect(formData.get('session_id')).toBeNull();
        expect(formData.get('quickpunch')).toBe('out');
        localStorage.removeItem('session_id');
    });

    test('the_recent_dtr_punch_posts_neither_the_generate_flag_nor_the_early_clock_out_flag_that_the_nav_clock_can_post', async () => {
        const props = dtrNavProps({
            dashboard: { recent_dtr: [dtrRow({ id: 777, time_in: at(3) })] },
        });
        const { container } = renderDtrNav(props);
        await flush();

        await click(btn(container, 'Clock Out'));

        const formData = props.biometrixLog.mock.calls[0][0];
        expect(formData.get('quickpunch')).toBe('out');
        expect(formData.get('dtr_id')).toBe('777');
        expect(formData.get('isGenerate')).toBeNull();
        expect(formData.get('early_clock_out')).toBeNull();
    });
});

/* =================================================================================
 * NAV QUICK PUNCH  -  top navigation bar, present on every authenticated page
 * =============================================================================== */

const notif = (over = {}) => ({ id: 1, time_in: at(9), time_out: at(1), ...over });

const quickProps = (over = {}) => ({
    user: { id: 42, first_name: 'Ana' },
    settings: {},
    dashboard: { recent_dtr: [], my_dtr_notifications: [] },
    incompletedtr: {},
    getRecentDtr: jest.fn(),
    getMyDtrNotifications: jest.fn(),
    biometrixLog: jest.fn(),
    clearRecentDtrInstance: jest.fn(),
    getIncompleteDtr: jest.fn(),
    ...over,
});

const renderQuick = (props) => {
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter><NavQuickPunch ref={ref} {...props} /></MemoryRouter>
    );
    return { ...utils, ref };
};

const tabByKey = (container, key) =>
    container.querySelector('[data-testid="tab"][data-eventkey="' + key + '"]');

describe('Nav quick punch dropdown (top navigation bar) - page lifecycle', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        pinClock();
        jest.useFakeTimers();
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });
    afterEach(() => {
        console.log.mockRestore();
        jest.clearAllTimers();
        jest.useRealTimers();
        unpinClock();
    });

    /* --------------------------------------------------- PHASE 1 - MOUNT / FETCH */

    test('landing_on_any_authenticated_page_pulls_the_signed_in_employees_recent_daily_record_over_a_two_hour_shifted_window', async () => {
        const props = quickProps();
        renderQuick(props);
        await flush();

        const expectedFrom = moment(FIXED_MS).add(2, 'hours').subtract(1, 'days').format('YYYY-MM-DD');
        const expectedTo = moment(FIXED_MS).add(2, 'hours').format('YYYY-MM-DD');

        expect(props.getRecentDtr).toHaveBeenCalledTimes(1);
        expect(props.getRecentDtr).toHaveBeenCalledWith(42, expectedFrom, expectedTo);
        expect(moment(expectedTo, 'YYYY-MM-DD')
            .diff(moment(expectedFrom, 'YYYY-MM-DD'), 'days')).toBe(1);
    });

    test('landing_on_any_authenticated_page_also_pulls_the_employees_own_dtr_notifications', async () => {
        const props = quickProps();
        renderQuick(props);
        await flush();

        expect(props.getMyDtrNotifications).toHaveBeenCalledTimes(1);
        expect(props.getMyDtrNotifications).toHaveBeenCalledWith(42);
    });

    test('the_incomplete_dtr_action_is_wired_up_but_the_nav_never_calls_it', async () => {
        const props = quickProps();
        renderQuick(props);
        await flush();

        expect(props.getIncompleteDtr).not.toHaveBeenCalled();
        expect(props.clearRecentDtrInstance).not.toHaveBeenCalled();
    });

    test('the_nav_fetches_once_per_session_and_refuses_to_refetch_when_the_daily_record_in_the_store_changes', async () => {
        const props = quickProps();
        const { rerender, ref } = renderQuick(props);
        await flush();

        expect(ref.current.state.NavHasLoaded).toBe(true);

        rerender(
            <MemoryRouter>
                <NavQuickPunch
                    {...props}
                    dashboard={{
                        recent_dtr: [dtrRow({ time_in: at(2) })],
                        my_dtr_notifications: [],
                    }}
                />
            </MemoryRouter>
        );
        await flush();

        expect(props.getRecentDtr).toHaveBeenCalledTimes(1);
        expect(props.getMyDtrNotifications).toHaveBeenCalledTimes(1);
    });

    test('a_page_rendered_before_the_user_record_exists_fetches_nothing_and_still_draws_the_dropdown', async () => {
        const props = quickProps({ user: null });
        const { container } = renderQuick(props);
        await flush();

        expect(props.getRecentDtr).not.toHaveBeenCalled();
        expect(props.getMyDtrNotifications).not.toHaveBeenCalled();
        expect(container.querySelector('[data-testid="nav-puncher"]')).not.toBeNull();
    });

    test('a_user_record_that_has_arrived_without_an_id_yet_is_not_used_to_fetch_anything', async () => {
        const props = quickProps({ user: { id: null, first_name: 'Ana' } });
        renderQuick(props);
        await flush();

        expect(props.getRecentDtr).not.toHaveBeenCalled();
        expect(props.getMyDtrNotifications).not.toHaveBeenCalled();
    });

    test('the_fetch_is_deferred_until_the_user_record_lands_so_a_late_login_still_loads_the_nav_clock', async () => {
        const props = quickProps({ user: null });
        const { rerender } = renderQuick(props);
        await flush();
        expect(props.getRecentDtr).not.toHaveBeenCalled();

        rerender(
            <MemoryRouter>
                <NavQuickPunch {...props} user={{ id: 77, first_name: 'Ben' }} />
            </MemoryRouter>
        );
        await flush();

        expect(props.getRecentDtr).toHaveBeenCalledTimes(1);
        expect(props.getRecentDtr.mock.calls[0][0]).toBe(77);
    });

    /* ------------------------------------------------- PHASE 2 - DROPDOWN CONTENT */

    test('the_dropdown_offers_the_punch_button_the_recent_dtr_tab_and_the_dtr_notifications_tab', async () => {
        const props = quickProps();
        const { container } = renderQuick(props);
        await flush();

        expect(container.querySelector('[data-testid="nav-puncher"]')).not.toBeNull();
        expect(tabByKey(container, 'recent').getAttribute('data-title')).toBe('RECENT DTR');
        expect(tabByKey(container, 'recent')
            .querySelector('[data-testid="recent-dtr-nav"]')).not.toBeNull();
        expect(tabByKey(container, 'notifications').getAttribute('data-title'))
            .toBe('DTR NOTIFICATIONS');
        expect(tabByKey(container, 'notifications')
            .querySelector('[data-testid="dtr-notifications"]')).not.toBeNull();
    });

    /* --------------------------------------- PHASE 2b - INCOMPLETE TIMELOG COUNTER */

    const incLogsTab = (container) =>
        container.querySelector('[data-testid="tab"][data-id="incLogs"]');

    test('an_employee_with_no_dtr_notifications_gets_a_blank_incomplete_timelog_label', async () => {
        const props = quickProps();
        const { container } = renderQuick(props);
        await flush();

        expect(incLogsTab(container).getAttribute('data-title')).toBe('');
    });

    test('an_employee_whose_notifications_are_all_complete_gets_a_blank_incomplete_timelog_label', async () => {
        const props = quickProps({
            dashboard: {
                recent_dtr: [],
                my_dtr_notifications: [notif({ id: 1 }), notif({ id: 2 })],
            },
        });
        const { container } = renderQuick(props);
        await flush();

        expect(incLogsTab(container).getAttribute('data-title')).toBe('');
    });

    test('a_day_missing_its_clock_out_and_a_day_missing_its_clock_in_are_both_counted_as_incomplete_timelogs', async () => {
        const props = quickProps({
            dashboard: {
                recent_dtr: [],
                my_dtr_notifications: [
                    notif({ id: 1, time_out: null }),
                    notif({ id: 2, time_in: null }),
                    notif({ id: 3 }),
                ],
            },
        });
        const { container } = renderQuick(props);
        await flush();

        expect(incLogsTab(container).getAttribute('data-title'))
            .toBe('Incomplete Timelogs: 2');
    });

    test('a_day_missing_both_punches_is_still_counted_only_once', async () => {
        const props = quickProps({
            dashboard: {
                recent_dtr: [],
                my_dtr_notifications: [notif({ id: 1, time_in: null, time_out: null })],
            },
        });
        const { container } = renderQuick(props);
        await flush();

        expect(incLogsTab(container).getAttribute('data-title'))
            .toBe('Incomplete Timelogs: 1');
    });

    test('the_incomplete_timelog_tab_is_a_label_only_it_stays_disabled_even_when_there_is_something_to_look_at', async () => {
        const props = quickProps({
            dashboard: {
                recent_dtr: [],
                my_dtr_notifications: [notif({ id: 1, time_out: null })],
            },
        });
        const { container } = renderQuick(props);
        await flush();

        expect(incLogsTab(container).getAttribute('data-title'))
            .toBe('Incomplete Timelogs: 1');
        expect(incLogsTab(container).getAttribute('data-disabled')).toBe('true');
    });

    /* ----------------------------------------------------------------- DEAD CODE */

    test('the_nav_computes_a_missing_schedule_flag_on_every_render_and_never_shows_it_the_banner_only_exists_inside_the_recent_dtr_tab', async () => {
        // DEAD CODE (NavQuickPunch.js 72-74): showErr is assigned and never read.
        const props = quickProps({
            dashboard: {
                recent_dtr: [
                    dtrRow({ id: 500, date: day(-1) }),
                    dtrRow({ id: 600, start_datetime: null, time_in: at(2), is_rest_day: 0 }),
                ],
                my_dtr_notifications: [],
            },
        });
        const { container } = renderQuick(props);
        await flush();

        expect(container.querySelector('.dtr-warning')).toBeNull();
        expect(container.textContent).not.toContain('on a day with no');
        // the warning lives in RecentDtrNav, which the nav renders as a child
        expect(container.querySelector('[data-testid="recent-dtr-nav"]')).not.toBeNull();
    });

    test('the_nav_click_handler_is_an_empty_stub_that_changes_no_state_when_invoked', async () => {
        // DEAD CODE (NavQuickPunch.js 55-63): onClickHandler has an empty body and no caller.
        const props = quickProps();
        const { ref } = renderQuick(props);
        await flush();

        const before = { ...ref.current.state };
        act(() => { ref.current.onClickHandler(); });

        expect(ref.current.state.NavHasLoaded).toBe(before.NavHasLoaded);
        expect(ref.current.state.incompletedtr).toEqual({});
    });
});
