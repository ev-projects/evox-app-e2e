/**
 * SummaryDashbordLifecycle.test.js
 * Full page-lifecycle coverage for components/Summary/SummaryDashbord.js  (note the spelling).
 * Menu: Dashboard -> Summary tab (rendered by DashboardTabs, and directly by EmployeeDashboard).
 *
 * The screen is walked the way an employee/supervisor uses it, phase by phase:
 *
 *   PHASE 1  MOUNT/LOAD    the single mount effect -> what is dispatched, and what the four
 *                          pending-request cards render BEFORE any number has arrived
 *   PHASE 2  DATA ARRIVES  dashboard counts / today leaves / tomorrow leaves / holidays land
 *                          -> numbers, rows and tab titles appear; plus the EMPTY-data arms
 *                          for leaves and for holidays (they behave differently - see findings)
 *   PHASE 3  USER ACTIONS  all 9 controls on the screen:
 *                          4 "My Request" count links   -> eventclick  + /my_overall_request
 *                          4 "Team Request" count links -> eventclick1 + /my_team_all_requests
 *                          1 Who's Out tab switch (Today <-> Tommorow)
 *   PHASE 4  SUBMIT        this screen has NO submit, save, approve or export control - it is
 *                          read-only drill-down. The drill-down navigation IS the terminal
 *                          action, so phase 4 asserts the exact dispatched payload + the exact
 *                          route pushed for both drill-down families, and that nothing else is
 *                          dispatched on the way out.
 *
 * Characterisation tests (they assert TODAY's behaviour, they do NOT endorse it):
 *   SD-EFFECT-1  the mount effect dispatches ONLY getDashboardOverall(1); the five other
 *                fetches (today leaves, tomorrow leaves, holidays, team status numbers, my
 *                status numbers) are commented out, so their imports and all 13 useState
 *                counters in the component are dead code that still ships.
 *   SD-LEAVES-1  an empty leaves list renders an EMPTY table instead of "No Leaves Found":
 *                the guard is `dashboard.todayleaves ? ... : <div>No Leaves Found</div>` and
 *                [] is truthy, so the not-found arm is unreachable. The Holidays card next to
 *                it uses `.length > 0` and gets it right - two different rules on one screen.
 *   SD-LEAVES-2  a missing (undefined) leaves list crashes the whole dashboard: the tab title
 *                reads `dashboard.todayleaves.length` before any guard runs.
 *   SD-COUNT-1   a count that is undefined rather than null renders a blank clickable link
 *                instead of the loading placeholder (the guard is `!== null`).
 *   SD-HOLIDAY-1 a holiday whose date the browser cannot parse crashes the Holidays card -
 *                format(Date.parse(bad)) is format(NaN) and date-fns throws RangeError.
 *   SD-DOM-1     both Who's Out tables put a <tr> directly under <table>, outside any <tbody>.
 *   SD-LOG-1     every render logs the whole props object to the browser console.
 *
 * ADDITIVE ONLY - no existing test touched, no app code changed.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

const mockDispatch = jest.fn((a) => a);
jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => mockDispatch,
}));

const mockPush = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useHistory: () => ({ push: mockPush }),
    useParams: () => ({}),
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

jest.mock('../../container/PageLoading/PageLoading.js', () => () => <div data-testid="page-loading" />);
jest.mock('../../container/PageLoadingCard.js/PageLoadingCard.js',
    () => () => <div data-testid="loading-card" />);
jest.mock('../../components/Dashboard/BirthdayAnniversary/BirthdayAnniversary.js',
    () => () => <div data-testid="birthday-anniversary" />);
jest.mock('../../components/Dashboard/Holiday/Holiday.js',
    () => () => <div data-testid="holiday-widget" />);

// Tabs mock keeps the real contract: titles are clickable, only the ACTIVE tab's body renders.
jest.mock('react-bootstrap', () => {
    const R = require('react');
    return {
        Card:   ({ children, className }) => R.createElement('div', { className }, children),
        Table:  ({ children }) => R.createElement('table', null, children),
        Button: ({ children, onClick, type }) =>
            R.createElement('button', { type: type || 'button', onClick }, children),
        Tab: () => null,
        Tabs: ({ children, defaultActiveKey, onSelect }) => {
            const kids = R.Children.toArray(children);
            const [active, setActive] = R.useState(defaultActiveKey);
            return R.createElement('div', { 'data-testid': 'tabs', 'data-active': active },
                kids.map((c) => R.createElement('button', {
                    key: c.props.eventKey,
                    type: 'button',
                    'data-testid': 'tab-' + c.props.eventKey,
                    onClick: () => { setActive(c.props.eventKey); if (onSelect) onSelect(c.props.eventKey); },
                }, c.props.title)),
                kids.filter((c) => c.props.eventKey === active).map((c) =>
                    R.createElement('div',
                        { key: c.props.eventKey, 'data-testid': 'tabpanel-' + c.props.eventKey },
                        c.props.children)));
        },
    };
});

jest.mock('../../services/API', () => ({ call: jest.fn() }));

jest.mock('../../store/actions/filters/requestListActions', () => ({
    fetchStatusNumbers_dashboard:   jest.fn(),
    myfetchStatusNumbers_dashboard: jest.fn(),
    get_today_leaves:               jest.fn(),
    get_tommrow_leaves:             jest.fn(),
    get_dashboard_holiday:          jest.fn(),
    eventclick:  jest.fn((t) => ({ type: 'STUB_EVENT_CLICK_MINE', requesttype: t })),
    eventclick1: jest.fn((t) => ({ type: 'STUB_EVENT_CLICK_TEAM', requesttype: t })),
}));
jest.mock('../../store/actions/dashboard/dashboardActions', () => ({
    getDashboardOverall: jest.fn((page_type) => ({ type: 'STUB_DASHBOARD_OVERALL', page_type })),
}));

import { eventclick, eventclick1 } from '../../store/actions/filters/requestListActions';
import { getDashboardOverall } from '../../store/actions/dashboard/dashboardActions';

// keyed proxy so the two drill-down destinations stay distinguishable in assertions
global.links = new Proxy({}, { get: (_t, key) => '/x/' + String(key) });

const SummaryDashbord = require('../../components/Summary/SummaryDashbord').default;

/* ------------------------------------------------------------------ fixtures */

const LOADED_COUNTS = {
    myalterrequest: 2,          alterrequest: 7,
    myovertimerequest: 1,       overtimerequest: 5,
    myrestdayrequest: 0,        restdayrequest: 3,
    mychangeschedulerequest: 4, changeschedulerequest: 9,
};

const EMPTY_COUNTS = {
    myalterrequest: null,          alterrequest: null,
    myovertimerequest: null,       overtimerequest: null,
    myrestdayrequest: null,        restdayrequest: null,
    mychangeschedulerequest: null, changeschedulerequest: null,
};

const dashboardState = (over = {}) => ({
    ...LOADED_COUNTS,
    todayleaves: [
        { name: 'Ana Cruz', type: 'Vacation Leave' },
        { name: 'Ben Reyes', type: 'Sick Leave' },
    ],
    tommorowleaves: [{ name: 'Cara Lim', type: 'Emergency Leave' }],
    dashboardholiday: [
        { name: 'Independence Day', date: '2026-06-12' },
        { name: 'Christmas Day', date: '2026-12-25' },
    ],
    ...over,
});

const renderScreen = (over = {}) => render(
    <MemoryRouter><SummaryDashbord dashboard={dashboardState(over)} /></MemoryRouter>
);

const flush = () => act(async () => { await Promise.resolve(); });

// DOM order of the eight count links, top-left to bottom-right.
const COUNT_LINKS = [
    'alteration-mine', 'alteration-team',
    'overtime-mine', 'overtime-team',
    'restday-mine', 'restday-team',
    'changeschedule-mine', 'changeschedule-team',
];
const countLinks = (container) => Array.from(container.querySelectorAll('a.request_count'));
const countLink = (container, name) => countLinks(container)[COUNT_LINKS.indexOf(name)];

let logSpy;
let errSpy;

describe('Summary Dashboard - page lifecycle', () => {
    beforeEach(() => {
        // the component console.logs its props on every render (SD-LOG-1)
        logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });
    afterEach(() => {
        logSpy.mockRestore();
        if (errSpy) { errSpy.mockRestore(); errSpy = undefined; }
        jest.clearAllMocks();
    });

    /* ============================================================ PHASE 1 - MOUNT */

    test('opening_the_summary_tab_asks_the_server_once_for_the_whole_dashboard_payload_for_page_type_one', async () => {
        renderScreen();
        await flush();

        expect(getDashboardOverall).toHaveBeenCalledTimes(1);
        expect(getDashboardOverall).toHaveBeenCalledWith(1);
        expect(mockDispatch).toHaveBeenCalledWith({ type: 'STUB_DASHBOARD_OVERALL', page_type: 1 });
    });

    test('the_mount_effect_fires_exactly_one_dispatch_because_the_five_other_dashboard_fetches_are_commented_out_FINDING_SD_EFFECT_1', async () => {
        const {
            get_today_leaves, get_tommrow_leaves, get_dashboard_holiday,
            fetchStatusNumbers_dashboard, myfetchStatusNumbers_dashboard,
        } = require('../../store/actions/filters/requestListActions');

        renderScreen();
        await flush();

        // FINDING SD-EFFECT-1 (characterised): the effect body still imports and still holds
        // dead calls to all five of these. They ship in the bundle and never run, and so do
        // the 13 useState counters (altercount, overtimecount, ... taskcompletestatus1) that
        // only those calls would ever have set.
        expect(mockDispatch).toHaveBeenCalledTimes(1);
        expect(get_today_leaves).not.toHaveBeenCalled();
        expect(get_tommrow_leaves).not.toHaveBeenCalled();
        expect(get_dashboard_holiday).not.toHaveBeenCalled();
        expect(fetchStatusNumbers_dashboard).not.toHaveBeenCalled();
        expect(myfetchStatusNumbers_dashboard).not.toHaveBeenCalled();
    });

    test('re_rendering_the_screen_never_refetches_the_dashboard_because_the_effect_is_mount_only', async () => {
        const { rerender } = renderScreen();
        await flush();

        rerender(<MemoryRouter><SummaryDashbord dashboard={dashboardState({ alterrequest: 99 })} /></MemoryRouter>);
        await flush();

        expect(getDashboardOverall).toHaveBeenCalledTimes(1);
    });

    test('before_any_number_arrives_all_eight_pending_request_cards_show_a_loading_placeholder_and_no_clickable_count', async () => {
        const { container, getAllByTestId } = renderScreen(EMPTY_COUNTS);
        await flush();

        expect(getAllByTestId('loading-card').length).toBe(8);
        expect(countLinks(container).length).toBe(0);
    });

    test('the_four_card_captions_are_rendered_even_while_the_numbers_are_still_loading', async () => {
        const { getByText } = renderScreen(EMPTY_COUNTS);
        await flush();

        expect(getByText('Alteration Pending Request')).toBeInTheDocument();
        expect(getByText('OverTime Pending Request')).toBeInTheDocument();
        expect(getByText('RestdayWork Pending Request')).toBeInTheDocument();
        expect(getByText('ChangeSchedule Pending Request')).toBeInTheDocument();
    });

    test('every_render_dumps_the_whole_props_object_into_the_browser_console_FINDING_SD_LOG_1', async () => {
        renderScreen();
        await flush();

        // FINDING SD-LOG-1 (characterised): a bare `console.log(props)` sits in the component
        // body, so the dashboard state of every logged-in user is printed to the console on
        // each render. Debug logging left in shipped code.
        expect(logSpy).toHaveBeenCalledWith(expect.objectContaining({ dashboard: expect.any(Object) }));
    });

    /* ====================================================== PHASE 2 - DATA ARRIVES */

    test('when_the_counts_arrive_each_card_shows_its_own_my_request_and_team_request_number_as_a_link', async () => {
        const { container } = renderScreen();
        await flush();

        const links = countLinks(container);
        expect(links.length).toBe(8);
        expect(links.map((a) => a.textContent))
            .toEqual(['2', '7', '1', '5', '0', '3', '4', '9']);
        expect(container.querySelectorAll('[data-testid="loading-card"]').length).toBe(0);
    });

    test('a_zero_pending_count_renders_a_clickable_zero_rather_than_the_loading_placeholder', async () => {
        const { container } = renderScreen();
        await flush();

        expect(countLink(container, 'restday-mine').textContent).toBe('0');
        expect(container.querySelectorAll('[data-testid="loading-card"]').length).toBe(0);
    });

    test('one_card_still_loading_while_the_others_have_arrived_shows_a_mixed_state', async () => {
        const { container, getAllByTestId } = renderScreen({ overtimerequest: null });
        await flush();

        expect(getAllByTestId('loading-card').length).toBe(1);
        expect(countLinks(container).length).toBe(7);
    });

    test('a_count_that_comes_back_undefined_instead_of_null_renders_a_blank_clickable_link_instead_of_the_loader_FINDING_SD_COUNT_1', async () => {
        const { container } = renderScreen({ alterrequest: undefined });
        await flush();

        // FINDING SD-COUNT-1 (characterised): the guard is `dashboard.alterrequest !== null`.
        // undefined passes it, so a payload that simply omits the key paints an empty <a> the
        // user can click, instead of the loading placeholder the null path gives.
        expect(container.querySelectorAll('[data-testid="loading-card"]').length).toBe(0);
        expect(countLinks(container).length).toBe(8);
        expect(countLink(container, 'alteration-team').textContent).toBe('');
    });

    test('when_the_leaves_arrive_the_whos_out_card_opens_on_today_and_lists_every_person_with_their_leave_type', async () => {
        const { getByTestId, getByText, queryByText } = renderScreen();
        await flush();

        expect(getByTestId('tabs').getAttribute('data-active')).toBe('home');
        expect(getByTestId('tab-home').textContent).toBe('Today (2)');
        expect(getByTestId('tab-profile').textContent).toBe('Tommorow (1)');

        expect(getByText('Vacation Leave')).toBeInTheDocument();
        expect(getByText('Sick Leave')).toBeInTheDocument();
        // tomorrow's tab body is not mounted until it is selected
        expect(queryByText('Emergency Leave')).toBeNull();
    });

    test('when_the_holidays_arrive_each_one_is_listed_with_its_date_formatted_as_year_month_day', async () => {
        const { getByText } = renderScreen();
        await flush();

        expect(getByText('Independence Day')).toBeInTheDocument();
        expect(getByText('2026-06-12')).toBeInTheDocument();
        expect(getByText('Christmas Day')).toBeInTheDocument();
        expect(getByText('2026-12-25')).toBeInTheDocument();
    });

    test('an_empty_holiday_list_shows_the_no_holidays_found_message', async () => {
        const { getByText } = renderScreen({ dashboardholiday: [] });
        await flush();

        expect(getByText('No Holidays Found')).toBeInTheDocument();
    });

    test('an_empty_leaves_list_shows_an_empty_table_and_never_the_no_leaves_found_message_FINDING_SD_LEAVES_1', async () => {
        const { getByTestId, queryByText } = renderScreen({ todayleaves: [], tommorowleaves: [] });
        await flush();

        // FINDING SD-LEAVES-1 (characterised): the guard is `dashboard.todayleaves ? map : msg`
        // and [] is truthy, so the "No Leaves Found" arm is unreachable dead markup. The user
        // sees the header row and nothing under it. The Holidays card three lines below uses
        // `.length > 0` and does show its empty message - two rules on one screen.
        expect(queryByText('No Leaves Found')).toBeNull();
        expect(getByTestId('tab-home').textContent).toBe('Today (0)');
        expect(getByTestId('tabpanel-home').querySelectorAll('tbody tr').length).toBe(0);
        // the counter row itself is still painted, so the card is not blank
        expect(getByTestId('tabpanel-home').textContent).toMatch(/Today \(0\)/);
    });

    test('an_empty_tomorrow_leaves_list_behaves_the_same_way_once_the_tab_is_opened_FINDING_SD_LEAVES_1', async () => {
        const { getByTestId, queryByText } = renderScreen({ todayleaves: [], tommorowleaves: [] });
        await flush();

        await act(async () => { fireEvent.click(getByTestId('tab-profile')); });
        await flush();

        expect(queryByText('No Leaves Found')).toBeNull();
        expect(getByTestId('tabpanel-profile').querySelectorAll('tbody tr').length).toBe(0);
    });

    test('a_dashboard_payload_without_a_leaves_list_at_all_crashes_the_whole_summary_screen_FINDING_SD_LEAVES_2', async () => {
        errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        // FINDING SD-LEAVES-2 (characterised): the tab title reads
        //   title={"Today ("+dashboard.todayleaves.length+")"}
        // which runs BEFORE the `dashboard.todayleaves ? ...` guard inside the body. A payload
        // that omits todayleaves (or an error response that leaves it unset) takes down the
        // entire dashboard, not just the Who's Out card.
        expect(() => render(
            <MemoryRouter>
                <SummaryDashbord dashboard={dashboardState({ todayleaves: undefined })} />
            </MemoryRouter>
        )).toThrow(/Cannot read propert.* of undefined \(reading 'length'\)/);
    });

    test('a_holiday_with_an_unparseable_date_crashes_the_holidays_card_FINDING_SD_HOLIDAY_1', async () => {
        errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        // FINDING SD-HOLIDAY-1 (characterised): format(Date.parse('not a date'), 'yyyy-MM-dd')
        // is format(NaN, ...) and date-fns v2 throws RangeError: Invalid time value. One bad
        // row in the holiday table takes the screen down; there is no per-row guard.
        expect(() => render(
            <MemoryRouter>
                <SummaryDashbord dashboard={dashboardState({
                    dashboardholiday: [{ name: 'Broken Holiday', date: 'not a date' }],
                })} />
            </MemoryRouter>
        )).toThrow(/Invalid time value/);
    });

    test('both_whos_out_tables_put_a_row_directly_under_the_table_element_outside_any_tbody_FINDING_SD_DOM_1', async () => {
        const { container } = renderScreen();
        await flush();

        // FINDING SD-DOM-1 (characterised): the counter row is written as a bare <tr> straight
        // under <Table>, so React renders table > tr with no tbody wrapper. Invalid HTML that
        // React warns about in development on every render of the dashboard.
        expect(container.querySelector('table > tr')).not.toBeNull();
    });

    /* ===================================================== PHASE 3 - USER ACTIONS */

    test('clicking_my_alteration_count_files_an_alteration_drill_down_and_opens_my_overall_requests', async () => {
        const { container } = renderScreen();
        await flush();

        await act(async () => { fireEvent.click(countLink(container, 'alteration-mine')); });
        await flush();

        expect(eventclick).toHaveBeenCalledWith('alteration');
        expect(mockPush).toHaveBeenCalledWith('/x/my_overall_request');
    });

    test('clicking_my_overtime_count_files_an_overtime_drill_down_and_opens_my_overall_requests', async () => {
        const { container } = renderScreen();
        await flush();

        await act(async () => { fireEvent.click(countLink(container, 'overtime-mine')); });
        await flush();

        expect(eventclick).toHaveBeenCalledWith('overtime');
        expect(mockPush).toHaveBeenCalledWith('/x/my_overall_request');
    });

    test('clicking_my_restday_count_files_a_rest_day_work_drill_down_and_opens_my_overall_requests', async () => {
        const { container } = renderScreen();
        await flush();

        await act(async () => { fireEvent.click(countLink(container, 'restday-mine')); });
        await flush();

        expect(eventclick).toHaveBeenCalledWith('rest_day_work');
        expect(mockPush).toHaveBeenCalledWith('/x/my_overall_request');
    });

    test('clicking_my_change_schedule_count_files_a_change_schedule_drill_down_and_opens_my_overall_requests', async () => {
        const { container } = renderScreen();
        await flush();

        await act(async () => { fireEvent.click(countLink(container, 'changeschedule-mine')); });
        await flush();

        expect(eventclick).toHaveBeenCalledWith('change_schedule');
        expect(mockPush).toHaveBeenCalledWith('/x/my_overall_request');
    });

    test('clicking_the_team_alteration_count_files_a_team_alteration_drill_down_and_opens_my_team_all_requests', async () => {
        const { container } = renderScreen();
        await flush();

        await act(async () => { fireEvent.click(countLink(container, 'alteration-team')); });
        await flush();

        expect(eventclick1).toHaveBeenCalledWith('alteration');
        expect(eventclick).not.toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith('/x/my_team_all_requests');
    });

    test('clicking_the_team_overtime_count_files_a_team_overtime_drill_down_and_opens_my_team_all_requests', async () => {
        const { container } = renderScreen();
        await flush();

        await act(async () => { fireEvent.click(countLink(container, 'overtime-team')); });
        await flush();

        expect(eventclick1).toHaveBeenCalledWith('overtime');
        expect(mockPush).toHaveBeenCalledWith('/x/my_team_all_requests');
    });

    test('clicking_the_team_restday_count_files_a_team_rest_day_work_drill_down_and_opens_my_team_all_requests', async () => {
        const { container } = renderScreen();
        await flush();

        await act(async () => { fireEvent.click(countLink(container, 'restday-team')); });
        await flush();

        expect(eventclick1).toHaveBeenCalledWith('rest_day_work');
        expect(mockPush).toHaveBeenCalledWith('/x/my_team_all_requests');
    });

    test('clicking_the_team_change_schedule_count_files_a_team_change_schedule_drill_down_and_opens_my_team_all_requests', async () => {
        const { container } = renderScreen();
        await flush();

        await act(async () => { fireEvent.click(countLink(container, 'changeschedule-team')); });
        await flush();

        expect(eventclick1).toHaveBeenCalledWith('change_schedule');
        expect(mockPush).toHaveBeenCalledWith('/x/my_team_all_requests');
    });

    test('a_count_of_zero_is_still_clickable_and_drills_down_to_an_empty_result_list', async () => {
        const { container } = renderScreen();
        await flush();

        expect(countLink(container, 'restday-mine').textContent).toBe('0');
        await act(async () => { fireEvent.click(countLink(container, 'restday-mine')); });
        await flush();

        expect(eventclick).toHaveBeenCalledWith('rest_day_work');
        expect(mockPush).toHaveBeenCalledTimes(1);
    });

    test('while_the_counts_are_still_loading_there_is_nothing_to_click_so_no_drill_down_can_be_started', async () => {
        const { container } = renderScreen(EMPTY_COUNTS);
        await flush();

        expect(countLinks(container).length).toBe(0);
        expect(eventclick).not.toHaveBeenCalled();
        expect(eventclick1).not.toHaveBeenCalled();
        expect(mockPush).not.toHaveBeenCalled();
    });

    test('switching_the_whos_out_card_to_the_tommorow_tab_swaps_todays_leavers_for_tomorrows_without_calling_the_server_again', async () => {
        const { getByTestId, getByText, queryByText } = renderScreen();
        await flush();

        await act(async () => { fireEvent.click(getByTestId('tab-profile')); });
        await flush();

        expect(getByTestId('tabs').getAttribute('data-active')).toBe('profile');
        expect(getByText('Cara Lim')).toBeInTheDocument();
        expect(getByText('Emergency Leave')).toBeInTheDocument();
        expect(queryByText('Vacation Leave')).toBeNull();
        // the whole dashboard came down in one payload, so a tab switch is client side only
        expect(getDashboardOverall).toHaveBeenCalledTimes(1);
        expect(mockDispatch).toHaveBeenCalledTimes(1);
    });

    test('switching_back_to_the_today_tab_restores_todays_leavers', async () => {
        const { getByTestId, getByText, queryByText } = renderScreen();
        await flush();

        await act(async () => { fireEvent.click(getByTestId('tab-profile')); });
        await flush();
        await act(async () => { fireEvent.click(getByTestId('tab-home')); });
        await flush();

        expect(getByTestId('tabs').getAttribute('data-active')).toBe('home');
        expect(getByText('Ana Cruz')).toBeInTheDocument();
        expect(queryByText('Cara Lim')).toBeNull();
    });

    /* ========================================================== PHASE 4 - "SUBMIT" */

    test('a_my_request_drill_down_dispatches_the_personal_event_click_payload_and_nothing_else_before_navigating', async () => {
        const { container } = renderScreen();
        await flush();
        mockDispatch.mockClear();

        await act(async () => { fireEvent.click(countLink(container, 'alteration-mine')); });
        await flush();

        expect(mockDispatch).toHaveBeenCalledTimes(1);
        expect(mockDispatch).toHaveBeenCalledWith({
            type: 'STUB_EVENT_CLICK_MINE', requesttype: 'alteration',
        });
        expect(mockPush).toHaveBeenCalledTimes(1);
    });

    test('a_team_request_drill_down_dispatches_the_team_event_click_payload_and_nothing_else_before_navigating', async () => {
        const { container } = renderScreen();
        await flush();
        mockDispatch.mockClear();

        await act(async () => { fireEvent.click(countLink(container, 'changeschedule-team')); });
        await flush();

        expect(mockDispatch).toHaveBeenCalledTimes(1);
        expect(mockDispatch).toHaveBeenCalledWith({
            type: 'STUB_EVENT_CLICK_TEAM', requesttype: 'change_schedule',
        });
        expect(mockPush).toHaveBeenCalledTimes(1);
    });

    test('the_request_type_filter_is_always_stored_before_the_route_change_so_the_target_list_opens_pre_filtered', async () => {
        const order = [];
        eventclick1.mockImplementation((t) => { order.push('dispatch:' + t); return { type: 'STUB_EVENT_CLICK_TEAM', requesttype: t }; });
        mockPush.mockImplementation((p) => { order.push('push:' + p); });

        const { container } = renderScreen();
        await flush();

        await act(async () => { fireEvent.click(countLink(container, 'overtime-team')); });
        await flush();

        expect(order).toEqual(['dispatch:overtime', 'push:/x/my_team_all_requests']);
    });

    test('drilling_down_twice_in_a_row_files_the_second_request_type_and_navigates_again', async () => {
        const { container } = renderScreen();
        await flush();

        await act(async () => { fireEvent.click(countLink(container, 'alteration-team')); });
        await flush();
        await act(async () => { fireEvent.click(countLink(container, 'overtime-mine')); });
        await flush();

        expect(eventclick1).toHaveBeenCalledWith('alteration');
        expect(eventclick).toHaveBeenCalledWith('overtime');
        expect(mockPush.mock.calls.map((c) => c[0]))
            .toEqual(['/x/my_team_all_requests', '/x/my_overall_request']);
    });

    test('the_summary_screen_offers_no_save_approve_delete_or_export_control_at_all', async () => {
        const { container } = renderScreen();
        await flush();

        const labels = Array.from(container.querySelectorAll('button'))
            .map((b) => b.textContent);
        // the only buttons on the screen are the two Who's Out tab titles
        expect(labels).toEqual(['Today (2)', 'Tommorow (1)']);
        expect(container.querySelector('form')).toBeNull();
        expect(container.querySelector('input')).toBeNull();
    });
});
