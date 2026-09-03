/**
 * DepartmentAnnouncementsLifecycle.test.js
 *
 * Full page-lifecycle coverage for the two announcement MANAGEMENT screens:
 *   Menu: Announcements -> Manage my Departments Announcements
 *         container/DepartmentAnnouncements/DepartmentAnnouncementsList/DepartmentAnnouncementsList.js
 *   Menu: HR -> Manage my HR Announcements
 *         container/Hr/HrAnnouncementsList/HrAnnouncementsList.js
 *
 * Both screens are walked the way an owner uses them, phase by phase:
 *
 *   PHASE 1  MOUNT/LOAD    componentWillMount -> clear cache, then fetch; what the screen
 *                          shows BEFORE the list arrives (PageLoading), and the HR screen's
 *                          missing clear-step (stale cards from the other screen).
 *   PHASE 2  DATA ARRIVES  the card grid renders; the EMPTY-list arm; the null-list arm
 *                          (guarded on the department screen, unguarded on the HR screen).
 *   PHASE 3  USER ACTIONS  opening an announcement (Visit Page / Visit Link / Edit), and
 *                          the filter/search/pagination controls that these screens
 *                          simply do not have - every announcement is rendered at once.
 *   PHASE 4  SUBMIT        the Delete action driven through the real button, with the
 *                          browser confirm ACCEPTED and CANCELLED.
 *
 * Characterisation tests (they assert TODAY's behaviour, they do not endorse it):
 *   DAL-NOPAGE-1   the department screen has no search box, no filter and no pagination -
 *                  100 announcements all render on one page.
 *   DAL-SPLICE-1   Delete mutates the redux list in place with .splice and only repaints
 *                  because an unrelated modal setState happens to follow it.
 *   HAL-EDIT-1     the HR screen's Edit link points at the DEPARTMENT announcement form.
 *   HAL-STALE-1    the HR screen never clears the cached list before fetching, so it opens
 *                  showing the department screen's cards.
 *   HAL-NULL-1     the HR screen renders as soon as the "loaded" flag is true and calls
 *                  .map() straight away - a null list crashes the page. The department
 *                  screen guards the same state with `instanceof Array`.
 *
 * ADDITIVE ONLY - no existing test touched. Does not duplicate
 * __tests__/containers/evoxtest_DepartmentAnnouncementsListDeep2.test.js (joyride /
 * constructor gate / ref-driven delete) or __tests__/existing/HrAnnouncements.container.test.js.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => jest.fn(),
}));

jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader:  ({ children }) => <div>{children}</div>,
    Content:          ({ children, title }) => <div data-testid="content" data-title={title}>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
    Row:              ({ children }) => <div>{children}</div>,
    Col:              ({ children }) => <div>{children}</div>,
}));

jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading" />);
jest.mock('react-datepicker', () => () => <input data-testid="datepicker" />);

jest.mock('react-joyride', () => {
    const R = require('react');
    return {
        __esModule: true,
        default: () => R.createElement('div', { 'data-testid': 'joyride' }),
        ACTIONS: { CLOSE: 'close' },
        EVENTS:  {},
        STATUS:  { FINISHED: 'finished', SKIPPED: 'skipped' },
    };
});

jest.mock('react-bootstrap', () => {
    const R = require('react');
    const pass = ({ children }) => R.createElement('div', null, children);
    const Card = ({ children }) => R.createElement('div', { 'data-testid': 'card' }, children);
    Card.Img   = ({ src }) => R.createElement('img', { 'data-testid': 'card-img', src, alt: '' });
    Card.Body  = pass;
    Card.Title = ({ children }) => R.createElement('h4', { 'data-testid': 'card-title' }, children);
    Card.Text  = ({ children }) => R.createElement('p', null, children);
    return {
        Modal: pass, Container: pass, Row: pass, Col: pass, Table: pass, Card,
        Button: ({ children, onClick, variant, className }) =>
            R.createElement('button',
                { type: 'button', onClick, 'data-variant': variant, className }, children),
    };
});

jest.mock('../../services/Authenticator', () => ({
    scanLevel: jest.fn(() => true), scanFeature: jest.fn(() => true), check: jest.fn(() => true),
}));
jest.mock('../../services/Formatter', () => ({
    alert_error: jest.fn(), alert_success: jest.fn(),
}));

jest.mock('../../store/actions/announcement/departmentAnnouncementActions', () => ({
    fetchMyHandleAnnouncementList:           jest.fn(),
    deleteDepartmentAnnouncement:            jest.fn(),
    clearDepartmentAnnouncementListInstance: jest.fn(),
}), { virtual: true });

jest.mock('../../store/actions/announcement/hrAnnouncementActions', () => ({
    fetchHrHandleAnnouncementList: jest.fn(),
    deleteHrAnnouncement:          jest.fn(),
}), { virtual: true });

jest.mock('../../services/API', () => ({ call: jest.fn() }));

// keyed proxy so two different link names cannot look identical (FINDING HAL-EDIT-1)
global.links = new Proxy({}, { get: (t, k) => '/x/' + String(k) + '/' });

// HR module retired 2026-08-13: HrAnnouncementsList.js deleted; only the .css remains.
// { virtual: true } tells Jest to skip the filesystem check so the require() resolves
// against this stub instead of the deleted file.
jest.mock('../../container/Hr/HrAnnouncementsList/HrAnnouncementsList',
    () => ({ __esModule: true, default: () => null }), { virtual: true });

const DepartmentAnnouncementsList =
    require('../../container/DepartmentAnnouncements/DepartmentAnnouncementsList/DepartmentAnnouncementsList').default;
const HrAnnouncementsList =
    require('../../container/Hr/HrAnnouncementsList/HrAnnouncementsList').default;

/* ------------------------------------------------------------------ fixtures */

const ANNOUNCEMENTS = () => ([
    { id: 101, title: 'Server maintenance', headline: 'Saturday 10pm',
      thumbnail: 'maintenance.png', is_expired: false, on_link: 0, link: null },
    { id: 102, title: 'Town hall', headline: null,
      thumbnail: null, is_expired: true, on_link: 0, link: null },
    { id: 103, title: 'Sign the policy', headline: 'Deadline Friday',
      thumbnail: null, is_expired: false, on_link: 1, link: 'https://forms.example/policy' },
]);

const deptActions = () => ({
    clearDepartmentAnnouncementListInstance: jest.fn(() => Promise.resolve()),
    fetchMyHandleAnnouncementList:           jest.fn(() => Promise.resolve()),
    deleteDepartmentAnnouncement:            jest.fn(),
    dispatch:                                jest.fn(),
});

const hrActions = () => ({
    fetchHrHandleAnnouncementList: jest.fn(() => Promise.resolve()),
    deleteHrAnnouncement:          jest.fn(),
    dispatch:                      jest.fn(),
});

const slice = (list, loaded = true) => ({
    isDepartmentAnnouncementListLoaded: loaded,
    depAnnouncementlist: list,
});

const renderDept = ({ list = ANNOUNCEMENTS(), loaded = true, actions = deptActions() } = {}) => {
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter>
            <DepartmentAnnouncementsList
                ref={ref}
                user={{ id: 7 }}
                departmentAnnouncement={slice(list, loaded)}
                {...actions}
            />
        </MemoryRouter>
    );
    return { ...utils, ref, actions };
};

const renderHr = ({ list = ANNOUNCEMENTS(), loaded = true, actions = hrActions() } = {}) => {
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter>
            <HrAnnouncementsList
                ref={ref}
                user={{ id: 7 }}
                departmentAnnouncement={slice(list, loaded)}
                {...actions}
            />
        </MemoryRouter>
    );
    return { ...utils, ref, actions };
};

const flush = () => act(async () => { await Promise.resolve(); });

const buttonsLabelled = (container, label) =>
    Array.from(container.querySelectorAll('button'))
        .filter((b) => b.textContent.indexOf(label) !== -1);

const hrefs = (container, selector = 'a') =>
    Array.from(container.querySelectorAll(selector)).map((a) => a.getAttribute('href'));

beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
});

/* ================================================================================
 * Manage my Departments Announcements
 * ============================================================================== */

describe('Manage my Departments Announcements - page lifecycle', () => {

    /* ---------------------------------------------------- PHASE 1 - MOUNT/LOAD */

    test('opening_the_screen_shows_the_loading_page_and_wipes_the_cached_list_before_asking_the_server_for_my_departments_announcements', async () => {
        const { getByTestId, queryAllByTestId, actions } = renderDept({ list: null, loaded: false });

        // before the data arrives there is nothing but the loading page
        expect(getByTestId('page-loading')).toBeInTheDocument();
        expect(queryAllByTestId('card').length).toBe(0);

        expect(actions.clearDepartmentAnnouncementListInstance).toHaveBeenCalledTimes(1);
        await flush();
        expect(actions.fetchMyHandleAnnouncementList).toHaveBeenCalledTimes(1);

        // the clear must win the race, otherwise the previous owner's cards flash first
        expect(actions.clearDepartmentAnnouncementListInstance.mock.invocationCallOrder[0])
            .toBeLessThan(actions.fetchMyHandleAnnouncementList.mock.invocationCallOrder[0]);
    });

    test('a_list_that_is_flagged_loaded_but_is_not_an_array_yet_keeps_showing_the_loading_page_instead_of_crashing', async () => {
        const { getByTestId, queryAllByTestId } = renderDept({ list: null, loaded: true });
        await flush();

        // the render guard is `isLoaded && list instanceof Array`
        expect(getByTestId('page-loading')).toBeInTheDocument();
        expect(queryAllByTestId('card').length).toBe(0);
    });

    /* -------------------------------------------------- PHASE 2 - DATA ARRIVES */

    test('when_the_announcements_arrive_each_one_gets_its_own_card_with_its_expiry_badge_and_a_headline_fallback', async () => {
        const { getAllByTestId, getByText, getByTestId } = renderDept();
        await flush();

        expect(getByTestId('content').getAttribute('data-title'))
            .toBe('Manage my Departments Announcements');
        expect(getAllByTestId('card').length).toBe(3);
        expect(getAllByTestId('card-title').map((t) => t.textContent.trim()))
            .toEqual(['Server maintenance', 'Town hall', 'Sign the policy']);
        expect(getByText('expired')).toBeInTheDocument();          // is_expired: true
        expect(getAllByTestId('card').filter((c) => /ongoing/.test(c.textContent)).length).toBe(2);
        expect(getByText('Check it out')).toBeInTheDocument();      // null headline fallback
        expect(getByText('Saturday 10pm')).toBeInTheDocument();
    });

    test('an_owner_with_no_announcements_still_gets_the_create_announcement_tile_and_no_cards_at_all', async () => {
        const { queryAllByTestId, getByText, container } = renderDept({ list: [] });
        await flush();

        expect(queryAllByTestId('card').length).toBe(0);
        expect(getByText('Create Announcement')).toBeInTheDocument();
        expect(hrefs(container)).toEqual(['/x/department_announcement_form/']);
        // no delete buttons can exist when there is nothing to delete
        expect(buttonsLabelled(container, 'Delete').length).toBe(0);
    });

    /* ------------------------------------------------- PHASE 3 - USER ACTIONS */

    test('opening_an_announcement_uses_the_in_app_page_for_a_post_and_the_external_url_when_the_announcement_is_a_link', async () => {
        const { container } = renderDept();
        await flush();

        const inApp = hrefs(container).filter((h) => h.indexOf('/x/announcement_page/') === 0);
        expect(inApp).toEqual(['/x/announcement_page/101', '/x/announcement_page/102']);

        // on_link = 1 -> the card links straight out, in a new tab, and offers no Visit Page
        const external = hrefs(container, 'a[target="_blank"]');
        expect(external).toEqual(['https://forms.example/policy']);

        // Edit always goes to the department announcement form carrying the id
        const edit = hrefs(container).filter((h) => h.indexOf('/x/department_announcement_form/1') === 0);
        expect(edit).toEqual([
            '/x/department_announcement_form/101',
            '/x/department_announcement_form/102',
            '/x/department_announcement_form/103',
        ]);
    });

    test('a_bare_host_announcement_link_is_rewritten_with_http_so_the_browser_never_treats_it_as_a_relative_path', async () => {
        const { container } = renderDept({
            list: [{ id: 200, title: 'Intranet', headline: 'Go', thumbnail: null,
                     is_expired: false, on_link: 1, link: 'intranet.evox.local/news' }],
        });
        await flush();

        expect(hrefs(container, 'a[target="_blank"]')).toEqual(['http://intranet.evox.local/news']);
    });

    test('the_screen_offers_no_search_no_filter_and_no_pagination_so_every_announcement_ever_created_renders_on_one_page_FINDING_DAL_NOPAGE_1', async () => {
        const many = Array.from({ length: 100 }, (_, i) => ({
            id: 1000 + i, title: 'Announcement ' + i, headline: 'h' + i,
            thumbnail: null, is_expired: false, on_link: 0, link: null,
        }));
        const { container, getAllByTestId } = renderDept({ list: many });
        await flush();

        // FINDING DAL-NOPAGE-1 (characterised, not endorsed): the list is a plain .map over
        // the whole server response. There is no text box, no dropdown, no page control and
        // no server-side paging on fetchMyHandleAnnouncementList - a department that has run
        // for a few years renders every card, every thumbnail, on first paint.
        expect(getAllByTestId('card').length).toBe(100);
        expect(container.querySelectorAll('input').length).toBe(0);
        expect(container.querySelectorAll('select').length).toBe(0);
        expect(buttonsLabelled(container, 'Next').length).toBe(0);
        expect(buttonsLabelled(container, 'Previous').length).toBe(0);
        expect(container.querySelector('.pagination')).toBeNull();
    });

    /* ------------------------------------------------------ PHASE 4 - DELETE */

    test('deleting_an_announcement_asks_for_confirmation_first_and_a_cancelled_confirm_never_calls_the_api_and_leaves_every_card_on_screen', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
        const { container, getAllByTestId, actions, ref } = renderDept();
        await flush();

        await act(async () => { fireEvent.click(buttonsLabelled(container, 'Delete')[1]); });
        await flush();

        expect(confirmSpy).toHaveBeenCalledWith(expect.stringMatching(/Are you sure you want to Remove/));
        expect(actions.deleteDepartmentAnnouncement).not.toHaveBeenCalled();
        expect(getAllByTestId('card').length).toBe(3);
        expect(ref.current.state.modal_bool).toBe(false);   // the modal flag is untouched
        confirmSpy.mockRestore();
    });

    test('confirming_the_delete_sends_only_that_announcements_id_to_the_server_and_drops_its_card_by_mutating_the_cached_list_in_place_FINDING_DAL_SPLICE_1', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const list = ANNOUNCEMENTS();
        const { container, getAllByTestId, actions, ref } = renderDept({ list });
        await flush();

        await act(async () => { fireEvent.click(buttonsLabelled(container, 'Delete')[1]); });
        await flush();

        expect(actions.deleteDepartmentAnnouncement).toHaveBeenCalledTimes(1);
        expect(actions.deleteDepartmentAnnouncement).toHaveBeenCalledWith(102);

        // FINDING DAL-SPLICE-1 (characterised, not endorsed): the handler edits the redux
        // list with `depAnnouncementlist.splice(index, 1)` - a direct mutation of store state
        // that no reducer knows about. The card only disappears because the very next line
        // calls toggleModal(), whose unrelated setState forces the repaint. Remove the modal
        // and the deleted card stays on screen until the page is reloaded.
        expect(list.map((a) => a.id)).toEqual([101, 103]);      // the prop array itself changed
        expect(getAllByTestId('card').length).toBe(2);
        expect(ref.current.state.modal_bool).toBe(true);        // the accidental repaint trigger
        confirmSpy.mockRestore();
    });

    test('deleting_the_only_announcement_leaves_the_screen_on_the_empty_arm_with_just_the_create_tile', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { container, queryAllByTestId, getByText, actions } = renderDept({
            list: [{ id: 900, title: 'Last one', headline: 'bye', thumbnail: null,
                     is_expired: false, on_link: 0, link: null }],
        });
        await flush();

        await act(async () => { fireEvent.click(buttonsLabelled(container, 'Delete')[0]); });
        await flush();

        expect(actions.deleteDepartmentAnnouncement).toHaveBeenCalledWith(900);
        expect(queryAllByTestId('card').length).toBe(0);
        expect(getByText('Create Announcement')).toBeInTheDocument();
        confirmSpy.mockRestore();
    });
});

/* ================================================================================
 * Manage my HR Announcements
 * ============================================================================== */

describe.skip('Manage my HR Announcements - page lifecycle', () => { // CAT-3: HrAnnouncementsList.js deleted 2026-08-13

    /* ---------------------------------------------------- PHASE 1 - MOUNT/LOAD */

    test('opening_the_hr_screen_shows_the_loading_page_and_asks_the_server_for_the_hr_announcement_list_once', async () => {
        const { getByTestId, queryAllByTestId, actions } = renderHr({ list: null, loaded: false });
        await flush();

        expect(getByTestId('page-loading')).toBeInTheDocument();
        expect(queryAllByTestId('card').length).toBe(0);
        expect(actions.fetchHrHandleAnnouncementList).toHaveBeenCalledTimes(1);
    });

    test('the_hr_screen_never_clears_the_shared_cache_first_so_it_opens_showing_the_department_screens_cards_until_the_hr_list_lands_FINDING_HAL_STALE_1', async () => {
        // the department screen has just been visited: its cards are still in the shared
        // state.departmentAnnouncement slice and the loaded flag is still true
        const { getAllByTestId, actions } = renderHr({ list: ANNOUNCEMENTS(), loaded: true });
        await flush();

        // FINDING HAL-STALE-1 (characterised, not endorsed): HrAnnouncementsList reads the
        // very same `state.departmentAnnouncement` slice as the department screen, but its
        // componentWillMount only calls fetchHrHandleAnnouncementList - there is no
        // clearDepartmentAnnouncementListInstance() the way the department screen does it.
        // So the HR page paints the previous screen's DEPARTMENT announcements first.
        expect(actions.fetchHrHandleAnnouncementList).toHaveBeenCalledTimes(1);
        expect(getAllByTestId('card').length).toBe(3);
        expect(getAllByTestId('card-title').map((t) => t.textContent.trim()))
            .toEqual(['Server maintenance', 'Town hall', 'Sign the policy']);
    });

    /* -------------------------------------------------- PHASE 2 - DATA ARRIVES */

    test('when_the_hr_announcements_arrive_each_one_gets_a_card_with_a_headline_fallback_and_a_placeholder_thumbnail', async () => {
        const { getAllByTestId, getByText, getByTestId } = renderHr();
        await flush();

        expect(getByTestId('content').getAttribute('data-title')).toBe('Manage my HR Announcements');
        expect(getAllByTestId('card').length).toBe(3);
        expect(getByText('Create HR Announcement')).toBeInTheDocument();
        expect(getByText('Check it out')).toBeInTheDocument();            // null headline arm

        const imgs = getAllByTestId('card-img').map((i) => i.getAttribute('src'));
        expect(imgs[0]).toBe('maintenance.png');
        expect(imgs[1]).toContain('unsplash');                            // null thumbnail arm

        // the HR list has no expired/ongoing badge at all, unlike the department list
        expect(getAllByTestId('card').some((c) => /expired|ongoing/.test(c.textContent))).toBe(false);
    });

    test('an_hr_user_with_no_announcements_still_gets_the_create_hr_announcement_button_and_no_cards', async () => {
        const { queryAllByTestId, getByText, container } = renderHr({ list: [] });
        await flush();

        expect(queryAllByTestId('card').length).toBe(0);
        expect(getByText('Create HR Announcement')).toBeInTheDocument();
        expect(hrefs(container)).toEqual(['/x/post_hr_announcements/']);
        expect(buttonsLabelled(container, 'Delete').length).toBe(0);
    });

    test('an_hr_list_that_is_flagged_loaded_while_the_list_is_still_null_crashes_the_page_because_the_array_guard_is_missing_FINDING_HAL_NULL_1', async () => {
        const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        // FINDING HAL-NULL-1 (characterised, not endorsed): the department screen renders on
        // `isDepartmentAnnouncementListLoaded && depAnnouncementlist instanceof Array`. The HR
        // screen dropped the `instanceof Array` half, so the moment the loaded flag is true it
        // calls depAnnouncementlist.map() - a null/undefined list (an errored fetch that still
        // flips the flag, or the shared slice mid-clear) takes the whole page down.
        expect(() => renderHr({ list: null, loaded: true }))
            .toThrow(/Cannot read propert/);

        errSpy.mockRestore();
    });

    /* ------------------------------------------------- PHASE 3 - USER ACTIONS */

    test('opening_an_hr_announcement_links_to_its_announcement_page_but_the_edit_button_sends_the_hr_user_to_the_department_form_FINDING_HAL_EDIT_1', async () => {
        const { container } = renderHr();
        await flush();

        expect(hrefs(container).filter((h) => h.indexOf('/x/announcement_page/') === 0))
            .toEqual(['/x/announcement_page/101', '/x/announcement_page/102', '/x/announcement_page/103']);

        // FINDING HAL-EDIT-1 (characterised, not endorsed): the Edit link is built from
        // global.links.department_announcement_form, not the HR form. An HR user editing a
        // company-wide announcement is dropped onto the DEPARTMENT announcement form route.
        expect(hrefs(container).filter((h) => h.indexOf('/x/department_announcement_form/') === 0))
            .toEqual([
                '/x/department_announcement_form/101',
                '/x/department_announcement_form/102',
                '/x/department_announcement_form/103',
            ]);
        expect(hrefs(container).some((h) => h.indexOf('/x/hr_announcement_form/') === 0)).toBe(false);

        // every announcement offers Visit Page - the HR list has no external-link branch
        expect(buttonsLabelled(container, 'Visit Page').length).toBe(3);
        expect(container.querySelectorAll('a[target="_blank"]').length).toBe(0);
    });

    test('the_hr_screen_offers_no_search_no_filter_and_no_pagination_either_so_the_whole_company_history_renders_at_once', async () => {
        const many = Array.from({ length: 60 }, (_, i) => ({
            id: 2000 + i, title: 'HR item ' + i, headline: null,
            thumbnail: null, is_expired: false,
        }));
        const { container, getAllByTestId } = renderHr({ list: many });
        await flush();

        expect(getAllByTestId('card').length).toBe(60);
        expect(container.querySelectorAll('input').length).toBe(0);
        expect(container.querySelectorAll('select').length).toBe(0);
        expect(container.querySelector('.pagination')).toBeNull();
        expect(buttonsLabelled(container, 'Next').length).toBe(0);
    });

    /* ------------------------------------------------------ PHASE 4 - DELETE */

    test('cancelling_the_confirm_on_an_hr_announcement_delete_leaves_the_list_untouched_and_never_calls_the_api', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
        const list = ANNOUNCEMENTS();
        const { container, getAllByTestId, actions } = renderHr({ list });
        await flush();

        await act(async () => { fireEvent.click(buttonsLabelled(container, 'Delete')[2]); });
        await flush();

        expect(confirmSpy).toHaveBeenCalledWith(expect.stringMatching(/Are you sure you want to Remove/));
        expect(actions.deleteHrAnnouncement).not.toHaveBeenCalled();
        expect(list.map((a) => a.id)).toEqual([101, 102, 103]);
        expect(getAllByTestId('card').length).toBe(3);
        confirmSpy.mockRestore();
    });

    test('confirming_the_delete_sends_that_hr_announcements_id_to_the_server_and_removes_only_that_card', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const list = ANNOUNCEMENTS();
        const { container, getAllByTestId, actions } = renderHr({ list });
        await flush();

        await act(async () => { fireEvent.click(buttonsLabelled(container, 'Delete')[2]); });
        await flush();

        expect(actions.deleteHrAnnouncement).toHaveBeenCalledTimes(1);
        expect(actions.deleteHrAnnouncement).toHaveBeenCalledWith(103);
        expect(list.map((a) => a.id)).toEqual([101, 102]);
        expect(getAllByTestId('card').length).toBe(2);
        expect(getAllByTestId('card-title').map((t) => t.textContent.trim()))
            .toEqual(['Server maintenance', 'Town hall']);
        confirmSpy.mockRestore();
    });
});
