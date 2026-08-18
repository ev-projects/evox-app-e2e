/**
 * evoxtest_AnnouncementsPageAndListDeep3.test.js
 *
 * SOURCES UNDER TEST:
 *   container/DepartmentAnnouncements/AnnouncementsPage/AnnouncementsPage.js
 *   container/DepartmentAnnouncements/DepartmentAnnouncementsList/DepartmentAnnouncementsList.js
 *
 * MENU PATHS: Announcements -> (open an announcement) — route announcement_page/:id;
 *             Announcements -> Manage my Departments Announcements.
 *
 * WHY THIS SUITE EXISTS: both screens decide per card whether an announcement opens an
 * external link or an EVOX page, and the reading page additionally decides whether the
 * visitor is entitled to see the announcement at all (an announcement outside your
 * departments comes back without a title). Those arms, the mount-time fetch gating on the
 * route id, and the sidebar's fallback path had no coverage.
 *
 * FINDINGS: none.
 *   Documented as-is, not raised as defects:
 *   - AnnouncementsPage calls this.props.fetchDashboardAnnouncementList() from inside
 *     render() when the sidebar feed has not loaded. Dispatching from render is a smell,
 *     but the creator is idempotent and the render output is unaffected; pinned below.
 *   - AnnouncementsPage computes `const method` from the route id and never uses it.
 *   - DepartmentAnnouncementsList.onSubmitHandler is an empty leftover wired to nothing;
 *     pinned as inert so a future edit giving it a body is noticed.
 */

import React from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
}));

jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader: ({ children }) => <div>{children}</div>,
    Content: ({ children, title }) => <div>{title}{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody: ({ children }) => <div>{children}</div>,
    Row: ({ children }) => <div>{children}</div>,
    Col: ({ children }) => <div>{children}</div>,
}));
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading" />);
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate: ({ name }) => <input name={name} type="date" />,
    InputTime: ({ name }) => <input name={name} type="time" />,
}));
jest.mock('react-joyride', () => ({
    __esModule: true,
    default: () => <div data-testid="joyride" />,
    ACTIONS: { CLOSE: 'close' },
    EVENTS: { STEP_AFTER: 'step:after' },
    STATUS: { FINISHED: 'finished', SKIPPED: 'skipped' },
}));
jest.mock('../../services/Authenticator', () => ({
    scanLevel: jest.fn(() => true), scanFeature: jest.fn(() => true),
}));
jest.mock('../../store/actions/announcement/departmentAnnouncementActions', () => ({
    fetchDashboardAnnouncementList: jest.fn(),
    fetchDepartmentAnnouncementStrict: jest.fn(),
    clearDepartmentAnnouncementListInstance: jest.fn(),
    fetchMyHandleAnnouncementList: jest.fn(),
    deleteDepartmentAnnouncement: jest.fn(),
}));
jest.mock('../../store/actions/redirectActions', () => ({ setRedirect: jest.fn() }));

global.links = new Proxy({}, { get: (_t, key) => '/app/' + String(key) + '/' });

const AnnouncementsPage =
    require('../../container/DepartmentAnnouncements/AnnouncementsPage/AnnouncementsPage').default;
const DepartmentAnnouncementsList =
    require('../../container/DepartmentAnnouncements/DepartmentAnnouncementsList/DepartmentAnnouncementsList').default;

const INSTANCE = {
    id: 31, title: 'Town hall', release_date: '2026-05-02', category: 'Department',
    thumbnail: '/img/townhall.png', content: '<p>Join us on the 5th floor</p>',
};

const SIDEBAR = [
    { id: 31, title: 'Town hall', release_date: '2026-05-02', category: 'Department', on_link: 0, link: null },
    { id: 32, title: 'Benefits update', release_date: '2026-05-03', category: 'HR', on_link: 1, link: 'https://intranet.eastvantage.com/benefits' },
    { id: 33, title: 'Fire drill', release_date: '2026-05-04', category: 'Admin', on_link: 0, link: null },
    { id: 34, title: 'Payroll', release_date: '2026-05-05', category: 'Finance', on_link: 0, link: null },
    { id: 35, title: 'Fifth item', release_date: '2026-05-06', category: 'Admin', on_link: 0, link: null },
];

function renderPage(props = {}) {
    const actions = {
        fetchDashboardAnnouncementList: jest.fn(),
        clearDepartmentAnnouncementListInstance: jest.fn(),
        fetchDepartmentAnnouncementStrict: jest.fn(),
        setRedirect: jest.fn(),
    };
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter>
            <AnnouncementsPage
                ref={ref}
                params={{ id: '31' }}
                constant={{}}
                user={{ id: 1 }}
                instance={INSTANCE}
                isInstanceLoaded
                departmentAnnouncement={{
                    isDepartmentAnnouncementListLoaded: true,
                    depAnnouncementlist: SIDEBAR,
                }}
                {...actions}
                {...props}
            />
        </MemoryRouter>
    );
    return { ...utils, ref, actions };
}

const CARD = {
    id: 31, title: 'Town hall', headline: 'Everyone welcome', thumbnail: '/img/townhall.png',
    is_expired: false, on_link: 0, link: null,
};

function renderList(props = {}) {
    const actions = {
        clearDepartmentAnnouncementListInstance: jest.fn(() => Promise.resolve()),
        fetchMyHandleAnnouncementList: jest.fn(() => Promise.resolve()),
        deleteDepartmentAnnouncement: jest.fn(),
        dispatch: jest.fn(),
    };
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter>
            <DepartmentAnnouncementsList
                ref={ref}
                user={{ id: 1 }}
                dashboard={{}}
                departmentAnnouncement={{
                    isDepartmentAnnouncementListLoaded: true,
                    depAnnouncementlist: [{ ...CARD }],
                }}
                {...actions}
                {...props}
            />
        </MemoryRouter>
    );
    return { ...utils, ref, actions };
}

const settle = async () => { await act(async () => { await Promise.resolve(); }); };

beforeEach(() => {
    jest.clearAllMocks();
    // The list's constructor reads a joyride marker out of localStorage; clearing it keeps
    // the tour state (and therefore the render) identical on every run.
    window.localStorage.clear();
});

describe('Announcements -> reading one announcement', () => {
    test('opening an announcement clears the previous feed, loads that announcement and refreshes the sidebar', async () => {
        const { actions } = renderPage();
        await settle();
        expect(actions.clearDepartmentAnnouncementListInstance).toHaveBeenCalledTimes(1);
        expect(actions.fetchDepartmentAnnouncementStrict).toHaveBeenCalledWith('31');
        expect(actions.fetchDashboardAnnouncementList).toHaveBeenCalledTimes(1);
    });

    test('reaching the page without an announcement id loads only the sidebar feed', async () => {
        const { actions } = renderPage({ params: {} });
        await settle();
        expect(actions.fetchDepartmentAnnouncementStrict).not.toHaveBeenCalled();
        expect(actions.fetchDashboardAnnouncementList).toHaveBeenCalledTimes(1);
    });

    test('the loader is shown until the announcement itself has arrived', () => {
        const { queryByTestId, queryByText } = renderPage({ isInstanceLoaded: false });
        expect(queryByTestId('page-loading')).not.toBeNull();
        expect(queryByText('Town hall')).toBeNull();
    });

    test('the announcement body shows its title, posting date, category and rendered content', () => {
        const { container } = renderPage();
        expect(container.querySelector('.page-content-title').textContent).toBe('Town hall');
        expect(container.querySelector('.page-content-info').textContent).toContain('2026-05-02');
        expect(container.querySelector('.page-content-info').textContent).toContain('Department');
        expect(container.querySelector('.page-img').getAttribute('src')).toBe('/img/townhall.png');
        expect(container.querySelector('.page-content').innerHTML).toBe('<p>Join us on the 5th floor</p>');
    });

    // An announcement outside the visitor's departments comes back from the strict
    // endpoint stripped of its fields, which is how the page detects the refusal.
    test('an announcement the visitor may not read shows the refusal message instead of a body', () => {
        const { container, getByText } = renderPage({ instance: { id: 31 } });
        expect(getByText(/does not seem to be part of your departments/i)).toBeInTheDocument();
        expect(container.querySelector('.page-content-title')).toBeNull();
    });

    test('an announcement whose title came back null is treated the same as a refusal', () => {
        const { container, getByText } = renderPage({ instance: { id: 31, title: null } });
        expect(getByText(/does not seem to be part of your departments/i)).toBeInTheDocument();
        expect(container.querySelector('.page-content-title')).toBeNull();
    });

    test('the sidebar shows only the four latest announcements', () => {
        const { container } = renderPage();
        const cards = container.querySelectorAll('.announcement-list-card');
        expect(cards.length).toBe(4);
        expect(container.textContent).toContain('Town hall');
        expect(container.textContent).not.toContain('Fifth item');
    });

    test('a sidebar entry for a link announcement opens the external URL in a new tab, a page one stays in EVOX', () => {
        const { container } = renderPage();
        // Queried across the whole container: the AdminLte Col stub drops className, so
        // the ".announcement-list-content" wrapper does not survive into the test DOM.
        const anchors = [...container.querySelectorAll('a')];
        const external = anchors.find((a) => a.getAttribute('target') === '_blank');
        const internal = anchors.find((a) => a.getAttribute('target') === '_self');

        expect(external.getAttribute('href')).toBe('https://intranet.eastvantage.com/benefits');
        expect(internal.getAttribute('href')).toBe('/app/announcement_page/31');
    });

    // Pins the dispatch-from-render noted in the header: the extra call is the render
    // pass asking for the feed a second time, on top of the one from componentWillMount.
    test('when the sidebar feed has not loaded the page asks for it again and shows a placeholder there', () => {
        const { actions, queryAllByTestId } = renderPage({
            departmentAnnouncement: {
                isDepartmentAnnouncementListLoaded: false, depAnnouncementlist: [],
            },
        });
        expect(actions.fetchDashboardAnnouncementList).toHaveBeenCalledTimes(2);
        expect(queryAllByTestId('page-loading').length).toBe(1);
    });
});

describe('Announcements -> Manage my Departments Announcements', () => {
    test('the page clears the previous list then loads the announcements of the departments handled', async () => {
        const { actions } = renderList();
        await settle();
        expect(actions.clearDepartmentAnnouncementListInstance).toHaveBeenCalledTimes(1);
        expect(actions.fetchMyHandleAnnouncementList).toHaveBeenCalledTimes(1);
    });

    test('the loader is shown until the list has arrived', () => {
        const { queryByTestId, queryByText } = renderList({
            departmentAnnouncement: {
                isDepartmentAnnouncementListLoaded: false, depAnnouncementlist: [],
            },
        });
        expect(queryByTestId('page-loading')).not.toBeNull();
        expect(queryByText('Town hall')).toBeNull();
    });

    test('a list that arrives as anything other than an array keeps the loader up', () => {
        const { queryByTestId } = renderList({
            departmentAnnouncement: {
                isDepartmentAnnouncementListLoaded: true, depAnnouncementlist: {},
            },
        });
        expect(queryByTestId('page-loading')).not.toBeNull();
    });

    test('the create card is always offered and links to the blank announcement form', () => {
        const { container } = renderList();
        const createLink = container.querySelector('.create-announcement-card').closest('a');
        expect(createLink.getAttribute('href')).toBe('/app/department_announcement_form/');
    });

    test('each card offers an edit link to its own announcement', () => {
        const { container } = renderList();
        const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
        expect(hrefs).toContain('/app/department_announcement_form/31');
    });

    test('a card without a thumbnail falls back to the stock image', () => {
        const withThumb = renderList();
        expect(withThumb.container.querySelector('.announcement-list-img').getAttribute('src'))
            .toBe('/img/townhall.png');

        const without = renderList({
            departmentAnnouncement: {
                isDepartmentAnnouncementListLoaded: true,
                depAnnouncementlist: [{ ...CARD, thumbnail: null }],
            },
        });
        expect(without.container.querySelector('.announcement-list-img').getAttribute('src'))
            .toContain('images.unsplash.com');
    });

    test('a live card is labelled ongoing and an expired one expired', () => {
        const live = renderList();
        expect(live.container.querySelector('.ongoing')).not.toBeNull();

        const expired = renderList({
            departmentAnnouncement: {
                isDepartmentAnnouncementListLoaded: true,
                depAnnouncementlist: [{ ...CARD, is_expired: true }],
            },
        });
        expect(expired.container.querySelector('.expired')).not.toBeNull();
    });

    test('a card without a headline falls back to "Check it out"', () => {
        const withHeadline = renderList();
        expect(withHeadline.container.textContent).toContain('Everyone welcome');

        const without = renderList({
            departmentAnnouncement: {
                isDepartmentAnnouncementListLoaded: true,
                depAnnouncementlist: [{ ...CARD, headline: null }],
            },
        });
        expect(without.container.textContent).toContain('Check it out');
    });

    test('a link announcement offers Visit Link to the external URL, a page one offers Visit Page inside EVOX', () => {
        const asPage = renderList();
        expect(asPage.container.textContent).toContain('Visit Page');
        expect([...asPage.container.querySelectorAll('a')].map((a) => a.getAttribute('href')))
            .toContain('/app/announcement_page/31');

        const asLink = renderList({
            departmentAnnouncement: {
                isDepartmentAnnouncementListLoaded: true,
                depAnnouncementlist: [{ ...CARD, on_link: 1, link: 'https://intranet.eastvantage.com/th' }],
            },
        });
        expect(asLink.container.textContent).toContain('Visit Link');
        const external = [...asLink.container.querySelectorAll('a')]
            .find((a) => a.getAttribute('target') === '_blank');
        expect(external.getAttribute('href')).toBe('https://intranet.eastvantage.com/th');
    });

    test('a link saved without a scheme is prefixed with http:// so it is not treated as a relative path', () => {
        const { container } = renderList({
            departmentAnnouncement: {
                isDepartmentAnnouncementListLoaded: true,
                depAnnouncementlist: [{ ...CARD, on_link: 1, link: 'intranet.eastvantage.com/th' }],
            },
        });
        const external = [...container.querySelectorAll('a')]
            .find((a) => a.getAttribute('target') === '_blank');
        expect(external.getAttribute('href')).toBe('http://intranet.eastvantage.com/th');
    });

    test('confirming Delete removes that announcement by id and drops its card from the list', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { ref, actions } = renderList();

        await act(async () => { ref.current.onDeleteHandler(CARD, 0); });

        expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to Remove this Anoouncement ?');
        expect(actions.deleteDepartmentAnnouncement).toHaveBeenCalledWith(31);
        expect(ref.current.props.departmentAnnouncement.depAnnouncementlist).toEqual([]);
        confirmSpy.mockRestore();
    });

    test('cancelling Delete keeps the announcement', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
        const { ref, actions } = renderList();

        await act(async () => { ref.current.onDeleteHandler(CARD, 0); });

        expect(actions.deleteDepartmentAnnouncement).not.toHaveBeenCalled();
        expect(ref.current.props.departmentAnnouncement.depAnnouncementlist.length).toBe(1);
        confirmSpy.mockRestore();
    });

    test('the unused list submit handler touches neither state nor any action', () => {
        const { ref, actions } = renderList();
        const before = { ...ref.current.state };
        ref.current.onSubmitHandler(CARD, 0);
        expect(ref.current.state).toEqual(before);
        expect(actions.deleteDepartmentAnnouncement).not.toHaveBeenCalled();
    });
});
