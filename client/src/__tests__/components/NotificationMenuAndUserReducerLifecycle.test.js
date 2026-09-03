/**
 * NotificationMenuAndUserReducerLifecycle.test.js
 *
 * SOURCE FILES UNDER TEST
 *   1. components/Template/NotificationMenu/NotificationMenu.js
 *   2. store/reducers/user/userReducers.js
 *
 * MENU PATH
 *   1. Top navigation bar -> Bell icon (notification dropdown; present on every authenticated page)
 *   2. (no menu) Redux store slice `state.user` — written by Login, Reload-user, DPA tick,
 *      Profile update, and the Asset / EVA / COC / Happiness-survey screens.
 *
 * 29-JUL COVERAGE (baseline carried over from the 29-Jul run; NOT re-measured for this file)
 *   NotificationMenu.js .......... 54 uncovered lines (49.1%)
 *   userReducers.js .............. 32 uncovered lines (57.9%)
 *
 * SCOPE NOTE — this file is ADDITIVE. `evoxtest_NotificationMenuDeep2.test.js` already drives the
 * instance methods (convertDate/formatDate/mergeNotifications/initializeNotificationState) and the
 * mount-time fetch guard, all through the instance ref and the component STATE.
 * The emphasis here is the RENDERED output that state produces — per-type row markup, per-pagetype
 * deep links, avatar resolution, sort + "Show more" paging, the empty arm — plus the reducer's
 * IDENTITY / IMMUTABILITY / state-discard rules, which nothing else covers.
 * Overlap with Deep2 is deliberate where this suite asserts the DOM rather than the state: the
 * bell-visibility tests and the dropdown open-state test check that state actually reaches the
 * rendered markup / the react-bootstrap props, which Deep2 never inspects.
 *
 * FINDINGS DISCOVERED (each characterized, never fixed — test names carry the _FINDING_<CODE> suffix)
 *   FINDING_REQPREFIX  — a plain approval/"request" notification falls into the render's celebration
 *                        default arm and is displayed with the literal "It's " prefix, so an approval
 *                        reads "It's Request Status". Only DTR / missedDTR / announcement / status
 *                        have their own arm.
 *   FINDING_DTRLINK    — a DTR row's arrow link is `${link}${requestID}` where `link` comes from a
 *                        switch on `pagetype`. Any request type outside the four hardcoded ones
 *                        (change_schedules / alter_logs / rest_day_works / overtimes) yields link ''
 *                        so the href degrades to the bare requestID — a relative, broken route.
 *   FINDING_PREVPATH   — that same link passes `previousPath: global.links.base.dashboard`, but
 *                        `global.links.base` is the STRING "/app/" (config/GlobalVariables.js:16),
 *                        so `.dashboard` is always undefined and previousPath is never populated.
 *   FINDING_SORTMUT    — render() calls `notificaion_list.sort(...)` directly on the state array,
 *                        mutating component state during render instead of sorting a copy.
 *   FINDING_NOEMPTY    — the empty arm renders "" (the "No Notifications Available." element is
 *                        commented out), so a tab with zero notifications shows a blank panel.
 *   FINDING_LOGOUTLEAK — LOGOUT_SUCCESS removes user_server_timestamp / user_server_timestamp_mils /
 *                        browser_timestamp_mils but NOT user_local_offset_mils or
 *                        user_local_timestamp_mils, which LOGIN_SUCCESS wrote — they survive logout.
 *   FINDING_NOOPCOPY   — UPDATE_USER for a different user id returns a NEW object (`{...state}` built
 *                        at the top of the reducer) instead of the same reference, so every unrelated
 *                        user update invalidates every connect() subscriber to state.user.
 *   FINDING_DEADCASE   — userReducers has a second `case "UPDATE_USER"` (department-handler sync);
 *                        it is unreachable because the first case wins, so departments_handled is
 *                        never synced. (There is also a second `case "FETCH_ALL_ASSETS"`, but it is
 *                        byte-identical to the first — dead, yet no test can observe the difference,
 *                        so it is documented here and NOT characterized by an assertion.)
 *   FINDING_LOOSEEQ    — UPDATE_USER matches with `==`, so the string "5" merges into user id 5, and
 *                        an action carrying no `user` at all matches a state that has no `id`.
 *
 * ADD ONLY: no app source and no existing test file was modified.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import moment from 'moment';
import '@testing-library/jest-dom/extend-expect';

/* ------------------------------------------------------------------ mocks */

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
}));

// Module-load isolation only: NotificationMenu.js imports this module at the top level, and the real
// one drags in the axios/config chain. It is NOT a dispatch spy — connect() is stubbed to identity
// above, so mapDispatchToProps never runs and the component uses the getMyNotifications prop that
// mountMenu() injects.
jest.mock('../../store/actions/dashboard/dashboardActions', () => ({
    getMyNotifications: jest.fn(),
}));

// react-bootstrap Dropdown/Tabs render through portals + context; flatten them so the
// notification rows and the tab strip are actually in the DOM and inspectable.
// The stubs surface the props the SOURCE passes (`show={dropdownOpen}`, `activeKey={selectedTag}`)
// as data-show / data-activekey attributes. Assertions on those attributes are assertions about the
// source's prop wiring, not about the stub — but they do NOT exercise the real library's behaviour
// (onToggle/onSelect are invoked directly via the instance ref instead of by user interaction).
jest.mock('react-bootstrap', () => {
    const R = require('react');
    const Dropdown = ({ children, show }) => (
        <div data-testid="dropdown" data-show={String(show)}>{children}</div>
    );
    Dropdown.Toggle = ({ children }) => <div data-testid="dropdown-toggle">{children}</div>;
    Dropdown.Menu = ({ children }) => <div data-testid="dropdown-menu">{children}</div>;
    Dropdown.Item = ({ children }) => <div>{children}</div>;
    return {
        Dropdown,
        Tabs: ({ children, activeKey }) => (
            <div data-testid="tabs" data-activekey={activeKey}>{children}</div>
        ),
        Tab: ({ eventKey, title }) => <div data-testid={`tab-${eventKey}`}>{title}</div>,
        Button: ({ children, onClick }) => (
            <button type="button" data-testid="show-more" onClick={onClick}>{children}</button>
        ),
    };
});

// Load the REAL route table (config/GlobalVariables.js assigns global.links as an import side
// effect). Not hand-copied: the deep-link assertions below must go red if a route is renamed.
// Note `base` is a STRING "/app/" in that file — see FINDING_PREVPATH.
require('../../config/GlobalVariables');

const NotificationMenu = require('../../components/Template/NotificationMenu/NotificationMenu').default;
const userReducer = require('../../store/reducers/user/userReducers').default;

/* -------------------------------------------------------------- fixtures */

const emptyCenter = {
    requestsForApproval: [],
    requestStatus: [],
    announcements: [],
    celebrations: [],
    missedDtr: [],
};

const center = (over = {}) => ({ ...emptyCenter, ...over });

const baseProps = {
    user: { id: 42 },
    notificationCenter: emptyCenter,
    alldata: 4,
    approval: 1,
    announcement: 1,
    celebration: 1,
    missingdtr: 1,
};

let lastLocation = null;
const LocationSpy = () => {
    lastLocation = useLocation();
    return null;
};

function mountMenu(props = {}) {
    const ref = React.createRef();
    const getMyNotifications = jest.fn();
    const utils = render(
        <MemoryRouter initialEntries={['/app/Dashboard']}>
            <NotificationMenu ref={ref} {...baseProps} getMyNotifications={getMyNotifications} {...props} />
            <LocationSpy />
        </MemoryRouter>
    );
    return { ...utils, ref, getMyNotifications };
}

/** Populate the rendered list deterministically (no props churn, no timers). */
function loadList(ref, tag, data) {
    act(() => {
        ref.current.mergeNotifications(tag, data);
    });
}

const rows = (container) => Array.from(container.querySelectorAll('.notification'));
const rowText = (container) => rows(container).map((r) => r.textContent.trim().replace(/\s+/g, ' '));
const hrefs = (container) => Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'));
const avatars = (container) => Array.from(container.querySelectorAll('img')).map((i) => i.getAttribute('src'));

beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    lastLocation = null;
    window.scrollTo = jest.fn();
});

/* ==========================================================================
 * 1. NotificationMenu — the bell visibility gate
 * ====================================================================== */

describe('NotificationMenu — bell visibility gate', () => {
    test('the bell dropdown is rendered when there is at least one notification (alldata > 0)', () => {
        const { container, getByTestId } = mountMenu({ alldata: 4 });
        expect(getByTestId('dropdown')).toBeInTheDocument();
        expect(container.querySelector('i.fa-bell-o')).not.toBeNull();
        expect(container.textContent).toContain('Notifications');
    });

    test('with zero notifications the nav item is rendered empty — no bell, no dropdown, no panel', () => {
        const { container, queryByTestId } = mountMenu({ alldata: 0 });
        expect(container.querySelector('li.nav-item')).not.toBeNull();
        expect(queryByTestId('dropdown')).toBeNull();
        expect(container.querySelector('i.fa-bell-o')).toBeNull();
        expect(container.textContent).toBe('');
    });
});

/* ==========================================================================
 * 2. NotificationMenu — the tab strip is driven by the per-bucket counters
 * ====================================================================== */

describe('NotificationMenu — tab strip', () => {
    test('a tab is shown for every counter that is greater than zero, with its label', () => {
        const { getByTestId } = mountMenu();
        expect(getByTestId('tab-request')).toHaveTextContent('Approval');
        expect(getByTestId('tab-announcements')).toHaveTextContent('Announcements');
        expect(getByTestId('tab-birthday')).toHaveTextContent('Celebrations');
        expect(getByTestId('tab-DTR')).toHaveTextContent('Missed DTR');
    });

    test('counters at zero suppress their tab — only the buckets with items get a tab', () => {
        const { queryByTestId, getByTestId } = mountMenu({ approval: 0, celebration: 0 });
        expect(queryByTestId('tab-request')).toBeNull();
        expect(queryByTestId('tab-birthday')).toBeNull();
        expect(getByTestId('tab-announcements')).toBeInTheDocument();
        expect(getByTestId('tab-DTR')).toBeInTheDocument();
    });

    test('with every counter at zero no tab at all is rendered, yet the strip still points at "DTR"', () => {
        const { container, getByTestId } = mountMenu({
            approval: 0, announcement: 0, celebration: 0, missingdtr: 0,
        });
        expect(container.querySelectorAll('[data-testid^="tab-"]').length).toBe(0);
        // initializeNotificationState's final else-arm selects "DTR" unconditionally, so the strip's
        // activeKey names a tab that was never rendered.
        expect(getByTestId('tabs').getAttribute('data-activekey')).toBe('DTR');
    });

    test('the active tab mirrors selectedTag and follows a tab change, scrolling the panel to the top', () => {
        const { getByTestId, ref } = mountMenu();
        expect(getByTestId('tabs').getAttribute('data-activekey')).toBe('request');

        act(() => {
            ref.current.handleTabSelect('birthday');
        });
        expect(getByTestId('tabs').getAttribute('data-activekey')).toBe('birthday');
        expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    });
});

/* ==========================================================================
 * 3. NotificationMenu — what each notification TYPE renders
 * ====================================================================== */

describe('NotificationMenu — per-type row rendering', () => {
    test('a DTR row (a request carrying a requestID) shows its description plus an arrow link', () => {
        const { container, ref } = mountMenu();
        loadList(ref, 'request', center({
            requestsForApproval: [{
                id: 1, requestID: 900, requestType: 'overtimes',
                description: 'Overtime filed by Ana', timestamp: '2026-07-20T09:00:00',
            }],
        }));

        expect(rows(container).length).toBe(1);
        expect(rowText(container)[0]).toBe('Overtime filed by Ana');
        expect(container.querySelector('i.fa-arrow-right')).not.toBeNull();
        expect(hrefs(container)).toEqual(['/app/request/Overtime/900']);
    });

    test('a missedDTR row shows the TITLE (not the description) and links to the Alter Log form', () => {
        const { container, ref } = mountMenu();
        loadList(ref, 'DTR', center({
            missedDtr: [{
                id: 5, title: 'Missed time out on 07/20', description: 'ignored-by-this-arm',
                timestamp: '2026-07-20T20:00:00', dtrDate: '07/20/2026 00:00:00',
                timeIn: '07/20/2026 09:00:00', timeOut: '07/20/2026 18:00:00',
            }],
        }));

        expect(rowText(container)[0]).toBe('Missed time out on 07/20');
        expect(rowText(container)[0]).not.toContain('ignored-by-this-arm');
        expect(hrefs(container)).toEqual(['/app/request/AlterLog/']);
    });

    test('following a missedDTR link carries the converted date and both punch times to the Alter Log page', () => {
        const { container, ref } = mountMenu();
        loadList(ref, 'DTR', center({
            missedDtr: [{
                id: 5, title: 'Missed time out', timestamp: '2026-07-20T20:00:00',
                dtrDate: '07/20/2026 00:00:00',
                timeIn: '07/20/2026 09:00:00', timeOut: '07/20/2026 18:00:00',
            }],
        }));
        act(() => {
            ref.current.toggleDropdown(true);
        });

        fireEvent.click(container.querySelector('a'));

        expect(lastLocation.pathname).toBe('/app/request/AlterLog/');
        // convertDate: MM/DD/YYYY -> YYYY-MM-DD, via toLocaleDateString('en-CA').
        // Requires a full-ICU Node (default since Node 13); on a small-icu build 'en-CA' degrades to
        // the en-US pattern and this line reports the environment, not the component.
        expect(lastLocation.date).toBe('2026-07-20');
        expect(lastLocation.current_time_in).toBe('2026-07-20 09:00:00');  // formatDate
        expect(lastLocation.current_time_out).toBe('2026-07-20 18:00:00');
        // clicking any notification link also closes the dropdown
        expect(ref.current.state.dropdownOpen).toBe(false);
    });

    test('an announcement row shows the description and links to that announcement page by id', () => {
        const { container, ref } = mountMenu();
        loadList(ref, 'announcements', center({
            announcements: [{
                id: 3, title: 'Town hall', description: 'Town hall on Friday',
                announcementId: 77, timestamp: '2026-07-19T08:00:00',
            }],
        }));

        expect(rowText(container)[0]).toBe('Town hall on Friday');
        expect(hrefs(container)).toEqual(['/app/team/Anouncement/Page/77']);
    });

    test('a request-status row shows the action status as plain text with no arrow link', () => {
        const { container, ref } = mountMenu();
        loadList(ref, 'request', center({
            requestStatus: [{
                id: 2, actionStatus: 'Your Overtime request was Approved',
                approverId: 22, timestamp: '2026-07-18T08:00:00',
            }],
        }));

        expect(rowText(container)[0]).toBe('Your Overtime request was Approved');
        expect(hrefs(container)).toEqual([]);
        expect(container.querySelector('i.fa-arrow-right')).toBeNull();
    });

    test('a celebration row is prefixed with "It\'s" and carries no link', () => {
        const { container, ref } = mountMenu();
        loadList(ref, 'birthday', center({
            celebrations: [{ id: 4, eventType: 'Birthday', eventDate: '2026-07-21T00:00:00', celebrationID: 44 }],
        }));

        expect(rowText(container)[0]).toBe("It's Birthday");
        expect(hrefs(container)).toEqual([]);
    });

    // FINDING_REQPREFIX — the render has arms for DTR, missedDTR, announcement and status only.
    // An approval notification with no requestID has type "request" and therefore lands in the
    // celebration-shaped default arm, so the user sees "It's Leave Request" for an approval.
    test('an approval notification with no requestID is rendered with the celebration "It\'s" prefix _FINDING_REQPREFIX', () => {
        const { container, ref } = mountMenu();
        loadList(ref, 'request', center({
            requestsForApproval: [{
                id: 9, title: 'Leave Request', description: 'Leave Request',
                userId: 11, timestamp: '2026-07-20T09:00:00',
            }],
        }));

        expect(ref.current.state.notificaion_list[0].type).toBe('request');
        expect(rowText(container)[0]).toBe("It's Leave Request");
        expect(hrefs(container)).toEqual([]); // and it offers no way to open the request
    });
});

/* ==========================================================================
 * 4. NotificationMenu — deep-link resolution from pagetype
 * ====================================================================== */

describe('NotificationMenu — DTR deep links', () => {
    const dtrItem = (id, requestType, ts) => ({
        id, requestID: id, requestType, description: `req-${id}`, timestamp: ts,
    });

    test('each known request type resolves to its own request route, newest notification first', () => {
        const { container, ref } = mountMenu();
        loadList(ref, 'request', center({
            requestsForApproval: [
                dtrItem(101, 'change_schedules', '2026-07-20T12:00:00'),
                dtrItem(102, 'alter_logs', '2026-07-20T11:00:00'),
                dtrItem(103, 'rest_day_works', '2026-07-20T10:00:00'),
                dtrItem(104, 'overtimes', '2026-07-20T09:00:00'),
            ],
        }));

        expect(hrefs(container)).toEqual([
            '/app/request/ChangeSchedule/101',
            '/app/request/AlterLog/102',
            '/app/request/RestDayWork/103',
            '/app/request/Overtime/104',
        ]);
    });

    // FINDING_DTRLINK — the pagetype switch has no fallback route: an unmapped request type
    // (or a missedDtr item, which carries a requestID but no requestType) produces link '' so the
    // href is the bare request id, a relative URL that resolves against whatever page you are on.
    test('an unmapped request type produces a bare relative href instead of a request route _FINDING_DTRLINK', () => {
        const { container, ref } = mountMenu();
        loadList(ref, 'request', center({
            requestsForApproval: [dtrItem(555, 'undertime_requests', '2026-07-20T09:00:00')],
        }));

        expect(ref.current.state.notificaion_list[0].pagetype).toBe('undertime_requests');
        expect(hrefs(container)).toEqual(['555']);           // no leading slash, no /app/request/ prefix
        expect(hrefs(container)[0]).not.toContain('/app/');
    });

    // FINDING_PREVPATH — `previousPath: global.links.base.dashboard` reads `.dashboard` off the
    // STRING "/app/", so the back-reference handed to the request page is always undefined.
    test('the previousPath handed to a request page is always undefined _FINDING_PREVPATH', () => {
        const { container, ref } = mountMenu();
        loadList(ref, 'request', center({
            requestsForApproval: [dtrItem(606, 'overtimes', '2026-07-20T09:00:00')],
        }));

        expect(global.links.base.dashboard).toBeUndefined(); // "/app/" is a string, not an object
        fireEvent.click(container.querySelector('a'));
        expect(lastLocation.pathname).toBe('/app/request/Overtime/606');
        expect(lastLocation.previousPath).toBeUndefined();
    });
});

/* ==========================================================================
 * 5. NotificationMenu — avatar resolution
 * ====================================================================== */

describe('NotificationMenu — avatar resolution', () => {
    test('a sender with a stored profile photo is shown as an inline base64 avatar', () => {
        const { container, ref } = mountMenu();
        loadList(ref, 'request', center({
            requestStatus: [{ id: 2, actionStatus: 'Approved', approverId: 11, timestamp: '2026-07-20T09:00:00' }],
            profilePhotos: [{ userId: 11, userPhoto: JSON.stringify({ UserPhoto: 'AAAneverending' }) }],
        }));

        expect(avatars(container)).toEqual(['data:image/jpeg;base64, AAAneverending']);
    });

    test('a sender with no stored photo falls back to the default user image', () => {
        const { container, ref } = mountMenu();
        loadList(ref, 'request', center({
            requestStatus: [{ id: 2, actionStatus: 'Approved', approverId: 99, timestamp: '2026-07-20T09:00:00' }],
            profilePhotos: [{ userId: 11, userPhoto: JSON.stringify({ UserPhoto: 'AAA' }) }],
        }));

        expect(avatars(container)).toEqual(['/images/default-user-image.png']);
    });

    test('a photo row with an empty userPhoto also falls back to the default image', () => {
        const { container, ref } = mountMenu();
        loadList(ref, 'request', center({
            requestStatus: [{ id: 2, actionStatus: 'Approved', approverId: 11, timestamp: '2026-07-20T09:00:00' }],
            profilePhotos: [{ userId: 11, userPhoto: '' }],
        }));

        expect(ref.current.state.photo_list[11]).toBeUndefined();
        expect(avatars(container)).toEqual(['/images/default-user-image.png']);
    });

    test('an announcement always uses the announcement banner, never the sender photo', () => {
        const { container, ref } = mountMenu();
        loadList(ref, 'announcements', center({
            announcements: [{ id: 3, description: 'Holiday', announcementId: 5, userId: 11, timestamp: '2026-07-20T09:00:00' }],
            profilePhotos: [{ userId: 11, userPhoto: JSON.stringify({ UserPhoto: 'AAA' }) }],
        }));

        expect(avatars(container)).toEqual(['/images/img3.jpg']);
    });
});

/* ==========================================================================
 * 6. NotificationMenu — ordering, paging and the empty state
 * ====================================================================== */

describe('NotificationMenu — ordering, paging and empty state', () => {
    const many = (n) => Array.from({ length: n }, (_, i) => ({
        id: i + 1,
        actionStatus: `status-${i + 1}`,
        approverId: 1,
        // ascending timestamps: status-N is the newest
        timestamp: `2026-07-${String(i + 1).padStart(2, '0')}T09:00:00`,
    }));

    test('notifications are listed newest first regardless of the order they arrive in', () => {
        const { container, ref } = mountMenu();
        loadList(ref, 'request', center({ requestStatus: many(3) }));
        expect(rowText(container)).toEqual(['status-3', 'status-2', 'status-1']);
    });

    test('only the first five notifications are listed and a "Show more" button is offered', () => {
        const { container, ref, getByTestId } = mountMenu();
        loadList(ref, 'request', center({ requestStatus: many(7) }));

        expect(rows(container).length).toBe(5);
        expect(rowText(container)).toEqual(['status-7', 'status-6', 'status-5', 'status-4', 'status-3']);
        expect(getByTestId('show-more')).toHaveTextContent('Show more');
    });

    test('"Show more" reveals the next five and disappears once everything is listed', () => {
        const { container, ref, getByTestId, queryByTestId } = mountMenu();
        loadList(ref, 'request', center({ requestStatus: many(7) }));

        fireEvent.click(getByTestId('show-more'));

        expect(ref.current.state.setNumNotificationsToShow).toBe(10);
        expect(rows(container).length).toBe(7);
        expect(rowText(container)[6]).toBe('status-1');
        expect(queryByTestId('show-more')).toBeNull(); // 10 >= 7, nothing left to reveal
    });

    test('exactly five notifications fit on one page, so no "Show more" is offered (boundary)', () => {
        const { container, ref, queryByTestId } = mountMenu();
        loadList(ref, 'request', center({ requestStatus: many(5) }));

        expect(rows(container).length).toBe(5);
        expect(queryByTestId('show-more')).toBeNull();
    });

    // FINDING_NOEMPTY — the false arm of `notificaion_list.length > 0` renders the empty string.
    // The "No Notifications Available." element is commented out in source, so a tab whose bucket
    // is empty shows a header and a blank body with no explanation.
    test('a tab with no notifications renders a blank panel with no empty-state message _FINDING_NOEMPTY', () => {
        const { container, ref, queryByTestId } = mountMenu();
        loadList(ref, 'birthday', center({ celebrations: [] }));

        expect(ref.current.state.notificaion_list).toEqual([]);
        expect(rows(container).length).toBe(0);
        expect(queryByTestId('show-more')).toBeNull();
        expect(container.textContent).not.toContain('No Notifications');
        expect(container.querySelector('.scrollable-notifications').textContent).toBe('');
    });

    // FINDING_SORTMUT — render() sorts the state array in place (`notificaion_list.sort(...)`),
    // so rendering mutates component state. React state must be treated as immutable; a re-render
    // of the same list silently reorders the stored array.
    test('rendering sorts the state array in place instead of a copy _FINDING_SORTMUT', () => {
        const { ref } = mountMenu();
        loadList(ref, 'request', center({ requestStatus: many(3) }));

        const listAfterRender = ref.current.state.notificaion_list;
        // mergeNotifications pushed many(3) in ascending timestamp order (status-1 first) and stored
        // THAT array in state. It now reads descending, which is only possible if render()'s sort
        // rewrote the stored array itself — a copy would have left state ascending.
        expect(listAfterRender.map((n) => n.description)).toEqual(['status-3', 'status-2', 'status-1']);
    });

    test('switching tabs empties the list first and then repopulates it from the new bucket', () => {
        const data = center({
            requestStatus: many(2),
            celebrations: [{ id: 41, eventType: 'Work Anniversary', eventDate: '2026-07-21T00:00:00', celebrationID: 44 }],
        });
        const { container, ref } = mountMenu({ notificationCenter: data });

        loadList(ref, 'request', data);
        expect(rows(container).length).toBe(2);

        // handleTabSelect sets `notificaion_list: []` and only re-merges from the setState callback,
        // so the list is observably empty at the instant the re-merge begins. Capture it there —
        // otherwise only the final state is proven and the "empties first" half of the name is not.
        const realMerge = ref.current.mergeNotifications;
        let listWhenMergeStarted = null;
        ref.current.mergeNotifications = (tag, payload) => {
            listWhenMergeStarted = ref.current.state.notificaion_list;
            return realMerge(tag, payload);
        };
        try {
            act(() => {
                ref.current.handleTabSelect('birthday');
            });
        } finally {
            ref.current.mergeNotifications = realMerge;
        }

        expect(listWhenMergeStarted).toEqual([]);        // cleared before the new bucket was read
        expect(ref.current.state.selectedTag).toBe('birthday');
        expect(rowText(container)).toEqual(["It's Work Anniversary"]);
    });
});

/* ==========================================================================
 * 7. NotificationMenu — dropdown open/close state reaches the DOM
 * ====================================================================== */

describe('NotificationMenu — dropdown open state', () => {
    test('the dropdown starts closed, opens on toggle and closes again when a link is clicked', () => {
        const { getByTestId, ref } = mountMenu();
        expect(getByTestId('dropdown').getAttribute('data-show')).toBe('false');

        act(() => {
            ref.current.toggleDropdown(true);
        });
        expect(getByTestId('dropdown').getAttribute('data-show')).toBe('true');

        act(() => {
            ref.current.handleLinkClick();
        });
        expect(getByTestId('dropdown').getAttribute('data-show')).toBe('false');
    });
});

/* ==========================================================================
 * 8. userReducer — login / logout / reload lifecycle
 * ====================================================================== */

describe('userReducer — login, reload and logout', () => {
    const loginUser = {
        id: 5, emp_num: 'E5', first_name: 'Ana',
        user_server_timestamp: '2026-07-20 09:00:00',
        user_server_timestamp_mils: 1753000000000,
        user_offset_seconds: 28800,
    };

    test('LOGIN_SUCCESS replaces the whole slice with the user and attaches the payload', () => {
        const previous = { error_message: 'stale', leftover_flag: true };
        const next = userReducer(previous, { type: 'LOGIN_SUCCESS', user: loginUser, payload: { token: 'jwt' } });

        expect(next.id).toBe(5);
        expect(next.first_name).toBe('Ana');
        expect(next.payload).toEqual({ token: 'jwt' });
        expect(next.leftover_flag).toBeUndefined();   // prior slice is discarded, not merged
        expect(next.error_message).toBeUndefined();
        expect(previous).toEqual({ error_message: 'stale', leftover_flag: true }); // input untouched
    });

    test('LOGIN_SUCCESS persists the four clock keys, converting the offset from seconds to millis', () => {
        userReducer({}, { type: 'LOGIN_SUCCESS', user: loginUser, payload: null });

        expect(localStorage.getItem('user_server_timestamp')).toBe('2026-07-20 09:00:00');
        expect(localStorage.getItem('user_server_timestamp_mils')).toBe('1753000000000');
        expect(localStorage.getItem('user_local_offset_mils')).toBe('28800000'); // 28800 * 1000
        expect(localStorage.getItem('user_local_timestamp_mils')).toBe('1753000000000');
    });

    test('FETCH_USER_SUCCESS refreshes the slice and rewrites the clock keys with the new values', () => {
        userReducer({}, { type: 'LOGIN_SUCCESS', user: loginUser, payload: null });

        const reloaded = { ...loginUser, first_name: 'Ana Maria', user_offset_seconds: 0, user_server_timestamp_mils: 1 };
        const next = userReducer({ id: 5, stale: true }, { type: 'FETCH_USER_SUCCESS', user: reloaded, payload: 'p' });

        expect(next.first_name).toBe('Ana Maria');
        expect(next.stale).toBeUndefined();          // wholesale replacement, same as login
        expect(next.payload).toBe('p');
        expect(localStorage.getItem('user_local_offset_mils')).toBe('0');
        expect(localStorage.getItem('user_server_timestamp_mils')).toBe('1');
    });

    test('LOGOUT_SUCCESS resets the slice to the initial state and raises clearLoginParameters', () => {
        const logged = userReducer({}, { type: 'LOGIN_SUCCESS', user: loginUser, payload: null });
        const out = userReducer(logged, { type: 'LOGOUT_SUCCESS' });

        expect(out).toEqual({ error_message: '', clearLoginParameters: true });
        expect(out.id).toBeUndefined();
    });

    // FINDING_LOGOUTLEAK — logout removes three keys, one of which (browser_timestamp_mils) login
    // never wrote, while the two keys login DID write (user_local_offset_mils and
    // user_local_timestamp_mils) survive logout and are read back by NavPuncher on the next session.
    test('logout leaves the local clock keys behind in localStorage _FINDING_LOGOUTLEAK', () => {
        const logged = userReducer({}, { type: 'LOGIN_SUCCESS', user: loginUser, payload: null });
        userReducer(logged, { type: 'LOGOUT_SUCCESS' });

        expect(localStorage.getItem('user_server_timestamp')).toBeNull();
        expect(localStorage.getItem('user_server_timestamp_mils')).toBeNull();
        // still there after logout:
        expect(localStorage.getItem('user_local_offset_mils')).toBe('28800000');
        expect(localStorage.getItem('user_local_timestamp_mils')).toBe('1753000000000');
    });

    test('LOGOUT_FAILED replaces the whole slice with the error payload', () => {
        const next = userReducer({ id: 5, first_name: 'Ana' }, { type: 'LOGOUT_FAILED', error: { error_message: 'network down' } });

        expect(next.error_message).toBe('network down');
        expect(next.id).toBeUndefined();  // the signed-in user is wiped by a failed logout
    });

    test('LOGOUT_FAILED with no error object empties the slice completely (empty arm)', () => {
        const next = userReducer({ id: 5 }, { type: 'LOGOUT_FAILED' });
        expect(next).toEqual({});
    });

    test('FETCH_USER_FAILED replaces the slice with the error and drops the cached user', () => {
        const withError = userReducer({ id: 5, first_name: 'Ana' }, { type: 'FETCH_USER_FAILED', error: { error_message: 'reload failed' } });
        expect(withError).toEqual({ error_message: 'reload failed' });

        const withoutError = userReducer({ id: 5 }, { type: 'FETCH_USER_FAILED' });
        expect(withoutError).toEqual({});
    });
});

/* ==========================================================================
 * 9. userReducer — flags
 * ====================================================================== */

describe('userReducer — force-password and DPA flags', () => {
    test('TOGGLE_FORCE_CHANGE_PASSWORD always lands on false and keeps the rest of the user', () => {
        const fromTrue = userReducer({ id: 5, first_name: 'Ana', force_change_password: true }, { type: 'TOGGLE_FORCE_CHANGE_PASSWORD' });
        expect(fromTrue.force_change_password).toBe(false);
        expect(fromTrue.first_name).toBe('Ana');

        const fromFalse = userReducer({ id: 5, force_change_password: false }, { type: 'TOGGLE_FORCE_CHANGE_PASSWORD' });
        expect(fromFalse.force_change_password).toBe(false); // it is a setter, not a toggle
    });

    test('TICK_DPA stamps the acceptance time as a local YYYY-MM-DD HH:mm:ss string', () => {
        const fixed = new Date(2026, 6, 20, 13, 45, 30).getTime();
        const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(fixed);
        try {
            const next = userReducer({ id: 5, first_name: 'Ana' }, { type: 'TICK_DPA' });
            expect(next.dpa_ticked_at).toBe('2026-07-20 13:45:30');
            expect(next.dpa_ticked_at).toBe(moment(fixed).format('YYYY-MM-DD HH:mm:ss'));
            expect(next.first_name).toBe('Ana');   // rest of the user preserved
        } finally {
            nowSpy.mockRestore();
        }
    });
});

/* ==========================================================================
 * 10. userReducer — UPDATE_USER
 * ====================================================================== */

describe('userReducer — UPDATE_USER', () => {
    test('an update for the signed-in user is merged field by field over the current slice', () => {
        const state = { id: 5, first_name: 'Ana', last_name: 'Reyes', force_change_password: true };
        const next = userReducer(state, { type: 'UPDATE_USER', user: { id: 5, last_name: 'Reyes-Cruz' } });

        expect(next).toEqual({ id: 5, first_name: 'Ana', last_name: 'Reyes-Cruz', force_change_password: true });
        expect(state.last_name).toBe('Reyes');   // the input state was not mutated
    });

    test('an update for a different user leaves the signed-in user unchanged', () => {
        const state = { id: 5, first_name: 'Ana' };
        const next = userReducer(state, { type: 'UPDATE_USER', user: { id: 6, first_name: 'Ben' } });

        expect(next).toEqual({ id: 5, first_name: 'Ana' });
        expect(next.first_name).not.toBe('Ben');
    });

    // FINDING_NOOPCOPY — `let result = {...state}` runs before the switch, so the non-matching arm
    // (which only `break`s) returns that fresh copy. Redux consumers comparing by reference see a
    // change on every unrelated user update and re-render the whole authenticated shell.
    test('an update for a different user still returns a brand-new state object _FINDING_NOOPCOPY', () => {
        const state = { id: 5, first_name: 'Ana' };
        const next = userReducer(state, { type: 'UPDATE_USER', user: { id: 6 } });

        expect(next).toEqual(state);
        expect(next).not.toBe(state);    // no-op, yet a new reference
    });

    // FINDING_LOOSEEQ — the guard is `state.id == action.user?.id`, so an id arriving as a string
    // from the API still matches the numeric id in state.
    test('an id that arrives as a string still matches the numeric signed-in id _FINDING_LOOSEEQ', () => {
        const next = userReducer({ id: 5, first_name: 'Ana' }, { type: 'UPDATE_USER', user: { id: '5', first_name: 'Ana B' } });
        expect(next.first_name).toBe('Ana B');
    });

    // FINDING_LOOSEEQ (second face) — with no `user` on the action, `action.user?.id` is undefined;
    // a slice that has no id (nobody signed in yet) therefore counts as a MATCH and takes the merge
    // arm rather than being ignored.
    test('an UPDATE_USER carrying no user matches an empty slice and takes the merge arm _FINDING_LOOSEEQ', () => {
        const next = userReducer({ error_message: '' }, { type: 'UPDATE_USER' });
        expect(next).toEqual({ error_message: '' });   // spread of undefined merges nothing

        const ignored = userReducer({ id: 5 }, { type: 'UPDATE_USER' });
        expect(ignored).toEqual({ id: 5 });            // a signed-in slice does not match undefined
    });

    // FINDING_DEADCASE — a second `case "UPDATE_USER"` further down syncs departments_handled from
    // action.department. JavaScript takes the first matching case, so that block is unreachable:
    // a department the user now handles is never added, and one they lost is never removed.
    test('the duplicate UPDATE_USER case never syncs departments_handled _FINDING_DEADCASE', () => {
        const state = { id: 5, emp_num: 'E5', departments_handled: [] };

        // user IS in the new department's handler list -> the dead case would push it
        const added = userReducer(state, {
            type: 'UPDATE_USER',
            user: { id: 99 },
            department: { id: 7, department_name: 'Finance', department_handlers: [{ emp_num: 'E5' }] },
        });
        expect(added.departments_handled).toEqual([]);   // never pushed

        // user is NOT in the handler list -> the dead case would remove the department
        const removed = userReducer(
            { id: 5, emp_num: 'E5', departments_handled: [{ id: 7, department_name: 'Finance' }] },
            { type: 'UPDATE_USER', user: { id: 99 }, department: { id: 7, department_handlers: [] } }
        );
        expect(removed.departments_handled).toEqual([{ id: 7, department_name: 'Finance' }]); // never removed
    });
});

/* ==========================================================================
 * 11. userReducer — asset / EVA / COC / happiness-survey fetch+clear pairs
 * ====================================================================== */

describe('userReducer — asset, EVA, COC and happiness-survey slices', () => {
    const signedIn = { id: 5, first_name: 'Ana' };

    test('FETCH_USER_ASSET and FETCH_USER_ASSETS store their payload and the loaded flag', () => {
        const one = userReducer(signedIn, { type: 'FETCH_USER_ASSET', data: { asset_tag: 'LT-1' }, is_asset_loaded: true });
        expect(one.user_asset).toEqual({ asset_tag: 'LT-1' });
        expect(one.is_asset_loaded).toBe(true);
        expect(one.first_name).toBe('Ana');   // the signed-in user survives

        const many = userReducer(one, { type: 'FETCH_USER_ASSETS', data: [{ asset_tag: 'LT-1' }, { asset_tag: 'LT-2' }], is_asset_loaded: true });
        expect(many.user_assets).toHaveLength(2);
        expect(many.user_asset).toEqual({ asset_tag: 'LT-1' }); // the single-asset slice is kept
    });

    test('CLEAR_USER_ASSET_LOAD lowers the loaded flag but keeps the fetched assets', () => {
        const loaded = userReducer(signedIn, { type: 'FETCH_USER_ASSET', data: { asset_tag: 'LT-1' }, is_asset_loaded: true });
        const cleared = userReducer(loaded, { type: 'CLEAR_USER_ASSET_LOAD', is_asset_loaded: false });

        expect(cleared.is_asset_loaded).toBe(false);
        expect(cleared.user_asset).toEqual({ asset_tag: 'LT-1' });
    });

    test('FETCH_ALL_ASSETS stores the report rows, the loaded flag and the filters used', () => {
        const next = userReducer(signedIn, {
            type: 'FETCH_ALL_ASSETS',
            data: [{ asset_tag: 'LT-1' }],
            is_all_asset_loaded: true,
            filters: { department: 'IT', status: 'Deployed' },
        });

        expect(next.all_assets).toEqual([{ asset_tag: 'LT-1' }]);
        expect(next.is_all_asset_loaded).toBe(true);
        expect(next.asset_reports_filter).toEqual({ department: 'IT', status: 'Deployed' });
    });

    // NOTE, not a characterization: userReducers.js has a second `case "FETCH_ALL_ASSETS"` (line 159)
    // that is byte-identical to the first (line 150). It is dead code, but NO assertion can tell the
    // two apart, so nothing here claims to prove which one ran — this test only pins the null-filter
    // path, which the test above does not cover.
    test('FETCH_ALL_ASSETS with a null filter set stores the null verbatim', () => {
        const a = userReducer(signedIn, { type: 'FETCH_ALL_ASSETS', data: [1], is_all_asset_loaded: true, filters: null });
        expect(a.asset_reports_filter).toBeNull();
        expect(a.all_assets).toEqual([1]);
    });

    test('each of the EVA, EVA-registration, COC and happiness slices stores its data and clears only its flag', () => {
        const pairs = [
            ['FETCH_USER_EVA', 'user_eva', 'CLEAR_USER_EVA', 'is_eva_loaded'],
            ['FETCH_USER_EVA_REG', 'user_eva_reg', 'CLEAR_USER_EVA_REG', 'is_eva_reg_loaded'],
            ['FETCH_USER_COC', 'user_coc', 'CLEAR_USER_COC', 'is_coc_loaded'],
            ['FETCH_USER_HAPPINESS_SURVEY', 'user_happiness_survey', 'CLEAR_USER_HAPPINESS_SURVEY', 'is_happiness_survey_loaded'],
        ];

        pairs.forEach(([fetchType, dataKey, clearType, flagKey]) => {
            const loaded = userReducer(signedIn, { type: fetchType, data: [{ row: dataKey }], [flagKey]: true });
            expect(loaded[dataKey]).toEqual([{ row: dataKey }]);
            expect(loaded[flagKey]).toBe(true);
            expect(loaded.id).toBe(5);

            const cleared = userReducer(loaded, { type: clearType, [flagKey]: false });
            expect(cleared[flagKey]).toBe(false);
            expect(cleared[dataKey]).toEqual([{ row: dataKey }]); // data is kept, only the flag drops
            expect(cleared).not.toBe(loaded);
        });
    });
});

/* ==========================================================================
 * 12. userReducer — default arm, initial state and immutability
 * ====================================================================== */

describe('userReducer — default arm and immutability', () => {
    test('an action the user slice does not handle returns the very same state object', () => {
        const state = { id: 5, first_name: 'Ana' };
        const next = userReducer(state, { type: 'FETCH_DASHBOARD_SUCCESS', data: [1, 2] });

        expect(next).toBe(state);   // identity preserved, so connect() does not re-render
    });

    test('an unhandled action on an uninitialised slice yields the initial state', () => {
        expect(userReducer(undefined, { type: '@@INIT' })).toEqual({ error_message: '' });
    });

    test('no handled action mutates the state object it was given', () => {
        const actions = [
            { type: 'TOGGLE_FORCE_CHANGE_PASSWORD' },
            { type: 'TICK_DPA' },
            { type: 'UPDATE_USER', user: { id: 5, first_name: 'Changed' } },
            { type: 'UPDATE_USER', user: { id: 6, first_name: 'Other' } },
            { type: 'FETCH_USER_ASSET', data: { a: 1 }, is_asset_loaded: true },
            { type: 'FETCH_USER_ASSETS', data: [1], is_asset_loaded: true },
            { type: 'CLEAR_USER_ASSET_LOAD', is_asset_loaded: false },
            { type: 'FETCH_ALL_ASSETS', data: [1], is_all_asset_loaded: true, filters: {} },
            { type: 'FETCH_USER_EVA', data: [1], is_eva_loaded: true },
            { type: 'CLEAR_USER_EVA', is_eva_loaded: false },
            { type: 'FETCH_USER_COC', data: [1], is_coc_loaded: true },
            { type: 'CLEAR_USER_COC', is_coc_loaded: false },
            { type: 'FETCH_USER_EVA_REG', data: [1], is_eva_reg_loaded: true },
            { type: 'CLEAR_USER_EVA_REG', is_eva_reg_loaded: false },
            { type: 'FETCH_USER_HAPPINESS_SURVEY', data: [1], is_happiness_survey_loaded: true },
            { type: 'CLEAR_USER_HAPPINESS_SURVEY', is_happiness_survey_loaded: false },
        ];

        actions.forEach((action) => {
            // Nested arrays/objects on purpose: a flat fixture would not notice an in-place push,
            // sort or field write one level down (exactly what the dead UPDATE_USER arm does to
            // departments_handled), because the top-level keys would still stringify the same.
            const state = {
                id: 5,
                first_name: 'Ana',
                is_asset_loaded: true,
                departments_handled: [{ id: 7, department_name: 'Finance' }],
                user_asset: { asset_tag: 'LT-1', specs: { ram: 16 } },
                user_assets: [{ asset_tag: 'LT-1' }, { asset_tag: 'LT-2' }],
            };
            const snapshot = JSON.stringify(state);
            const next = userReducer(state, action);

            expect(JSON.stringify(state)).toBe(snapshot);  // input untouched, nested levels included
            expect(next).not.toBe(state);                  // and a new object came back
        });
    });
});
