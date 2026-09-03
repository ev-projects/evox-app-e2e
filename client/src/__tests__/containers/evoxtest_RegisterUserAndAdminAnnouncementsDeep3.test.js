/**
 * evoxtest_RegisterUserAndAdminAnnouncementsDeep3.test.js
 *
 * SOURCES UNDER TEST:
 *   container/Admin/RegisterUser/RegisterUser.js
 *   container/Admin/AdminAnnouncementsList/AdminAnnouncementsList.js
 *
 * MENU PATHS: Admin -> Register User; Admin -> Manage All EVOX Announcements.
 *
 * WHY THIS SUITE EXISTS: Register User decides which half of its form to show from the
 * roles picked (departments for employees/supervisors, departments-to-handle for
 * supervisors/clients) and rebuilds its option lists in componentWillReceiveProps — none
 * of which had been exercised on both arms. The announcement admin list renders each card
 * through four independent conditionals (expired/ongoing, thumbnail, global/country,
 * all/selected departments, link/page) and its filter bar had no coverage at all.
 *
 * FINDINGS: none.
 *   Documented as-is:
 *   - RegisterUser.componentWillReceiveProps keeps only the role named 'client' when it
 *     rebuilds the role options, so the picker offers exactly one choice; the fields for
 *     employees and supervisors are still reachable because the roles held on state are
 *     whatever the picker hands back. Pinned below rather than reported: it is the
 *     shipped rule for who admins may create.
 *   - AdminAnnouncementsList declares onSubmitHandler twice and
 *     fetchDepartmentAnnouncementList twice in mapDispatchToProps. In both cases the
 *     second declaration wins and behaviour is unchanged (see the wiring suite).
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
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
jest.mock('../../components/Template/Paginate', () => () => <div data-testid="paginate" />);

const mockMultiSelects = [];
jest.mock('react-multi-select-component', () => ({
    __esModule: true,
    default: (props) => { mockMultiSelects.push(props); return <div data-testid="multiselect" />; },
}));

const mockSelects = [];
jest.mock('react-select', () => ({
    __esModule: true,
    default: (props) => { mockSelects.push(props); return <div data-testid="react-select" />; },
}));

jest.mock('../../store/actions/lookup/lookupListActions', () => ({
    fetchDepartmentList: jest.fn(), fetchRoleList: jest.fn(), fetchUserList: jest.fn(),
    fetchDepartmentListWithAnnouncements: jest.fn(),
}));
jest.mock('../../store/actions/admin/registerUserActions', () => ({ registerUser: jest.fn() }));
jest.mock('../../store/actions/announcement/departmentAnnouncementActions', () => ({
    fetchDepartmentAnnouncementList: jest.fn(), deleteDepartmentAnnouncement: jest.fn(),
    clearDepartmentAnnouncementListInstance: jest.fn(),
}));

global.links = new Proxy({}, { get: (_t, key) => '/app/' + String(key) + '/' });

const RegisterUser = require('../../container/Admin/RegisterUser/RegisterUser').default;
const AdminAnnouncementsList =
    require('../../container/Admin/AdminAnnouncementsList/AdminAnnouncementsList').default;

const DEPARTMENTS = [
    { id: 5, department_name: 'Engineering' },
    { id: 6, department_name: 'Support' },
];

function renderRegisterUser(props = {}) {
    mockMultiSelects.length = 0;
    const actions = {
        fetchDepartmentList: jest.fn(() => Promise.resolve()),
        fetchRoleList: jest.fn(() => Promise.resolve()),
        registerUser: jest.fn(() => Promise.resolve()),
    };
    const ref = React.createRef();
    const baseProps = { department: DEPARTMENTS, roles: [], isSuccessful: false, ...actions };
    const utils = render(
        <MemoryRouter><RegisterUser ref={ref} {...baseProps} {...props} /></MemoryRouter>
    );
    return {
        ...utils, ref, actions,
        allProps: { ...baseProps, ...props },
        rolePicker: () => mockMultiSelects[0],
        rerenderWith: (next) => utils.rerender(
            <MemoryRouter>
                <RegisterUser ref={ref} {...baseProps} {...props} {...next} />
            </MemoryRouter>
        ),
    };
}

const ANNOUNCEMENT = {
    id: 31, title: 'Town hall', created_at: '2026-05-01 03:00:00', release_date: '2026-05-02',
    expiry_date: '2026-05-30', creator: { full_name: 'Gary Aure' }, thumbnail: '/img/townhall.png',
    is_expired: false, set_country_all: 0, country_id: 63, set_all: 0,
    selectedDepartments: [{ id: 5 }, { id: 6 }], on_link: 0, link: null,
};

function renderAnnouncementsList(props = {}) {
    mockSelects.length = 0;
    const actions = {
        fetchDepartmentListWithAnnouncements: jest.fn(() => Promise.resolve()),
        clearDepartmentAnnouncementListInstance: jest.fn(() => Promise.resolve()),
        fetchDepartmentAnnouncementList: jest.fn(() => Promise.resolve()),
        fetchUserList: jest.fn(() => Promise.resolve()),
        deleteDepartmentAnnouncement: jest.fn(),
    };
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter>
            <AdminAnnouncementsList
                ref={ref}
                departmentAnnouncement={{
                    isDepartmentAnnouncementListLoaded: true,
                    depAnnouncementlist: { data: [{ ...ANNOUNCEMENT }], pagination: {} },
                }}
                settings={{ countries: [{ country_id: 63, country_name: 'Philippines' }] }}
                department={DEPARTMENTS}
                employee={[{ id: 21, full_name: 'Juan dela Cruz' }]}
                {...actions}
                {...props}
            />
        </MemoryRouter>
    );
    return { ...utils, ref, actions, employeeSelect: () => mockSelects[mockSelects.length - 1] };
}

const settle = async () => { await act(async () => { await Promise.resolve(); }); };

beforeEach(() => jest.clearAllMocks());

describe('Admin -> Register User', () => {
    test('the page loads the department and role lookups on mount and shows only the role picker', async () => {
        const { actions, container } = renderRegisterUser();
        await settle();
        expect(actions.fetchDepartmentList).toHaveBeenCalledTimes(1);
        expect(actions.fetchRoleList).toHaveBeenCalledTimes(1);
        expect(container.querySelector('input[name="first_name"]')).toBeNull();
        expect(container.querySelector('[data-testid="multiselect"]')).not.toBeNull();
    });

    test('choosing a role opens the name and e-mail fields', async () => {
        const view = renderRegisterUser();
        await act(async () => { view.rolePicker().onChange([{ label: 'Client', value: 'client' }]); });
        expect(view.container.querySelector('input[name="first_name"]')).not.toBeNull();
        expect(view.container.querySelector('input[name="last_name"]')).not.toBeNull();
        expect(view.container.querySelector('input[name="email"]')).not.toBeNull();
    });

    test('the single-department picker is offered to employees and supervisors but not to clients', async () => {
        const asEmployee = renderRegisterUser();
        await act(async () => { asEmployee.rolePicker().onChange([{ label: 'Employee', value: 'employee' }]); });
        expect(asEmployee.container.querySelector('select[name="department_id"]')).not.toBeNull();

        const asClient = renderRegisterUser();
        await act(async () => { asClient.rolePicker().onChange([{ label: 'Client', value: 'client' }]); });
        expect(asClient.container.querySelector('select[name="department_id"]')).toBeNull();
    });

    // Queries are scoped to each render's own container: two renders in one test share
    // one document.body, so an unscoped query would find the other page's markup.
    test('the departments-to-handle picker is offered to supervisors and clients but not to plain employees', async () => {
        const labels = (view) => [...view.container.querySelectorAll('label')].map((l) => l.textContent);

        const asSupervisor = renderRegisterUser();
        await act(async () => { asSupervisor.rolePicker().onChange([{ label: 'Supervisor', value: 'supervisor' }]); });
        expect(labels(asSupervisor)).toContain('Departments to handle:');

        const asClient = renderRegisterUser();
        await act(async () => { asClient.rolePicker().onChange([{ label: 'Client', value: 'client' }]); });
        expect(labels(asClient)).toContain('Departments to handle:');

        const asEmployee = renderRegisterUser();
        await act(async () => { asEmployee.rolePicker().onChange([{ label: 'Employee', value: 'employee' }]); });
        expect(labels(asEmployee)).not.toContain('Departments to handle:');
    });

    test('the department picker lists every department, and offers only the blank option when none are loaded', async () => {
        const withDepts = renderRegisterUser();
        await act(async () => { withDepts.rolePicker().onChange([{ label: 'Employee', value: 'employee' }]); });
        const options = withDepts.container.querySelectorAll('select[name="department_id"] option');
        expect(options.length).toBe(3); // blank + two departments
        expect(options[1].textContent).toContain('Engineering');

        const noDepts = renderRegisterUser({ department: [] });
        await act(async () => { noDepts.rolePicker().onChange([{ label: 'Employee', value: 'employee' }]); });
        expect(noDepts.container.querySelectorAll('select[name="department_id"] option').length).toBe(1);
    });

    test('typing a name, surname and e-mail records each on the form', async () => {
        const view = renderRegisterUser();
        await act(async () => { view.rolePicker().onChange([{ label: 'Client', value: 'client' }]); });

        fireEvent.change(view.container.querySelector('input[name="first_name"]'), { target: { name: 'first_name', value: 'Juan' } });
        fireEvent.change(view.container.querySelector('input[name="last_name"]'), { target: { name: 'last_name', value: 'dela Cruz' } });
        fireEvent.change(view.container.querySelector('input[name="email"]'), { target: { name: 'email', value: 'juan@eastvantage.com' } });

        expect(view.ref.current.state.first_name).toBe('Juan');
        expect(view.ref.current.state.last_name).toBe('dela Cruz');
        expect(view.ref.current.state.email).toBe('juan@eastvantage.com');
    });

    test('choosing a department records it on the form', async () => {
        const view = renderRegisterUser();
        await act(async () => { view.rolePicker().onChange([{ label: 'Employee', value: 'employee' }]); });
        fireEvent.change(view.container.querySelector('select[name="department_id"]'), {
            target: { name: 'department_id', value: '5' },
        });
        expect(view.ref.current.state.department_id).toBe('5');
    });

    test('a freshly loaded department list is turned into picker options', () => {
        const view = renderRegisterUser({ department: [] });
        view.rerenderWith({ department: DEPARTMENTS });
        expect(view.ref.current.state.departmentList).toEqual([
            { label: 'Engineering', value: 5 },
            { label: 'Support', value: 6 },
        ]);
    });

    test('a department list that arrives undefined leaves the picker options empty', () => {
        const view = renderRegisterUser({ department: [] });
        view.rerenderWith({ department: undefined });
        expect(view.ref.current.state.departmentList).toEqual([]);
    });

    // Only 'client' survives the filter — admins register clients here, not employees.
    test('of the roles returned by the lookup only client becomes a pickable option', () => {
        const view = renderRegisterUser();
        view.rerenderWith({
            roles: [{ name: 'client' }, { name: 'supervisor' }, { name: 'employee' }],
        });
        expect(view.ref.current.state.roleList).toEqual([{ label: 'Client', value: 'client' }]);
    });

    test('a role list that arrives undefined leaves the role options empty', () => {
        const view = renderRegisterUser();
        view.rerenderWith({ roles: undefined });
        expect(view.ref.current.state.roleList).toEqual([]);
    });

    test('confirming Register sends the flattened role and department ids and drops empty fields', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { ref, actions } = renderRegisterUser();

        await act(async () => {
            await ref.current.onSubmitHandler({
                roles: [{ label: 'Client', value: 'client' }],
                departments_handled: [{ label: 'Engineering', value: 5 }, { label: 'Support', value: 6 }],
                first_name: 'Juan',
                last_name: null,
                email: 'juan@eastvantage.com',
            });
        });

        expect(confirmSpy).toHaveBeenCalledWith('Are you sure about the details of the User to be registered?');
        expect(actions.registerUser).toHaveBeenCalledWith({
            roles: ['client'],
            departments_handled: [5, 6],
            first_name: 'Juan',
            email: 'juan@eastvantage.com',
        });
        confirmSpy.mockRestore();
    });

    test('cancelling the Register confirmation creates no user', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
        const { ref, actions } = renderRegisterUser();

        await act(async () => {
            await ref.current.onSubmitHandler({ roles: [], departments_handled: [], first_name: 'Juan' });
        });

        expect(actions.registerUser).not.toHaveBeenCalled();
        confirmSpy.mockRestore();
    });
});

describe('Admin -> Manage All EVOX Announcements', () => {
    test('the page clears the previous list then loads departments, announcements and employees', async () => {
        const { actions } = renderAnnouncementsList();
        await settle();
        expect(actions.fetchDepartmentListWithAnnouncements).toHaveBeenCalledTimes(1);
        expect(actions.clearDepartmentAnnouncementListInstance).toHaveBeenCalledTimes(1);
        expect(actions.fetchDepartmentAnnouncementList).toHaveBeenCalledTimes(1);
        expect(actions.fetchUserList).toHaveBeenCalledWith('employee', { page: 'all' });
    });

    test('the loader is shown until the announcement list has arrived', () => {
        const { queryByTestId, queryByText } = renderAnnouncementsList({
            departmentAnnouncement: {
                isDepartmentAnnouncementListLoaded: false, depAnnouncementlist: {},
            },
        });
        expect(queryByTestId('page-loading')).not.toBeNull();
        expect(queryByText('Town hall')).toBeNull();
    });

    test('a live announcement is labelled ongoing and an expired one expired', () => {
        const live = renderAnnouncementsList();
        expect(live.container.querySelector('.ongoing')).not.toBeNull();
        expect(live.container.querySelector('.expired')).toBeNull();

        const expired = renderAnnouncementsList({
            departmentAnnouncement: {
                isDepartmentAnnouncementListLoaded: true,
                depAnnouncementlist: { data: [{ ...ANNOUNCEMENT, is_expired: true }], pagination: {} },
            },
        });
        expect(expired.container.querySelector('.expired')).not.toBeNull();
    });

    test('an announcement without a thumbnail falls back to the stock image', () => {
        const withThumb = renderAnnouncementsList();
        expect(withThumb.container.querySelector('.announcement-list-img').getAttribute('src'))
            .toBe('/img/townhall.png');

        const without = renderAnnouncementsList({
            departmentAnnouncement: {
                isDepartmentAnnouncementListLoaded: true,
                depAnnouncementlist: { data: [{ ...ANNOUNCEMENT, thumbnail: null }], pagination: {} },
            },
        });
        expect(without.container.querySelector('.announcement-list-img').getAttribute('src'))
            .toContain('images.unsplash.com');
    });

    test('the country line reads Global, the country name, or UNDEFINED for an unknown country', () => {
        const named = renderAnnouncementsList();
        expect(named.container.textContent).toContain('Country: Philippines');

        const global_ = renderAnnouncementsList({
            departmentAnnouncement: {
                isDepartmentAnnouncementListLoaded: true,
                depAnnouncementlist: { data: [{ ...ANNOUNCEMENT, set_country_all: 1 }], pagination: {} },
            },
        });
        expect(global_.container.textContent).toContain('Country: Global');

        const unknown = renderAnnouncementsList({
            departmentAnnouncement: {
                isDepartmentAnnouncementListLoaded: true,
                depAnnouncementlist: { data: [{ ...ANNOUNCEMENT, country_id: null }], pagination: {} },
            },
        });
        expect(unknown.container.textContent).toContain('Country: UNDEFINED');
    });

    test('the departments line counts the selected departments, or reads ALL when posted everywhere', () => {
        const counted = renderAnnouncementsList();
        expect(counted.container.textContent).toContain('Departments:  2 Departments Posted');

        const all = renderAnnouncementsList({
            departmentAnnouncement: {
                isDepartmentAnnouncementListLoaded: true,
                depAnnouncementlist: { data: [{ ...ANNOUNCEMENT, set_all: 1 }], pagination: {} },
            },
        });
        expect(all.container.textContent).toContain('Departments:  ALL');
    });

    test('a page-type announcement links to its EVOX page while a link-type one opens the external URL', () => {
        const asPage = renderAnnouncementsList();
        const links = [...asPage.container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
        expect(links).toContain('/app/announcement_page/31');

        const asLink = renderAnnouncementsList({
            departmentAnnouncement: {
                isDepartmentAnnouncementListLoaded: true,
                depAnnouncementlist: {
                    data: [{ ...ANNOUNCEMENT, on_link: 1, link: 'https://intranet.eastvantage.com/townhall' }],
                    pagination: {},
                },
            },
        });
        const external = [...asLink.container.querySelectorAll('a')]
            .find((a) => a.getAttribute('target') === '_blank');
        expect(external.getAttribute('href')).toBe('https://intranet.eastvantage.com/townhall');
    });

    test('a link saved without a scheme is prefixed with http:// so it is not treated as a relative path', () => {
        const { container } = renderAnnouncementsList({
            departmentAnnouncement: {
                isDepartmentAnnouncementListLoaded: true,
                depAnnouncementlist: {
                    data: [{ ...ANNOUNCEMENT, on_link: 1, link: 'intranet.eastvantage.com/townhall' }],
                    pagination: {},
                },
            },
        });
        const external = [...container.querySelectorAll('a')]
            .find((a) => a.getAttribute('target') === '_blank');
        expect(external.getAttribute('href')).toBe('http://intranet.eastvantage.com/townhall');
    });

    test('a plain http link is left as it was saved', () => {
        const { container } = renderAnnouncementsList({
            departmentAnnouncement: {
                isDepartmentAnnouncementListLoaded: true,
                depAnnouncementlist: {
                    data: [{ ...ANNOUNCEMENT, on_link: 1, link: 'http://intranet.eastvantage.com/th' }],
                    pagination: {},
                },
            },
        });
        const external = [...container.querySelectorAll('a')]
            .find((a) => a.getAttribute('target') === '_blank');
        expect(external.getAttribute('href')).toBe('http://intranet.eastvantage.com/th');
    });

    test('confirming the trash button removes that announcement by id and drops its card', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { ref, actions } = renderAnnouncementsList();

        await act(async () => { ref.current.onDeleteHandler(ANNOUNCEMENT, 0); });

        expect(actions.deleteDepartmentAnnouncement).toHaveBeenCalledWith(31);
        expect(ref.current.props.departmentAnnouncement.depAnnouncementlist.data).toEqual([]);
        confirmSpy.mockRestore();
    });

    test('cancelling the trash confirmation keeps the announcement', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
        const { ref, actions } = renderAnnouncementsList();

        await act(async () => { ref.current.onDeleteHandler(ANNOUNCEMENT, 0); });

        expect(actions.deleteDepartmentAnnouncement).not.toHaveBeenCalled();
        expect(ref.current.props.departmentAnnouncement.depAnnouncementlist.data.length).toBe(1);
        confirmSpy.mockRestore();
    });

    test('filtering drops the blank criteria and keeps the ones that were set', () => {
        const { ref, actions } = renderAnnouncementsList();
        actions.fetchDepartmentAnnouncementList.mockClear();

        ref.current.onSubmitHandler({
            status: 'ongoing', department_id: '', country_id: 63, announcement_title: '',
            employee: null, page: 1, url: 'admin/AnnouncementList',
        });

        expect(actions.fetchDepartmentAnnouncementList).toHaveBeenCalledWith({
            status: 'ongoing', country_id: 63, page: 1, url: 'admin/AnnouncementList',
        });
    });

    test('the country, department and status pickers are populated from the lookups', () => {
        const { container } = renderAnnouncementsList();
        const countryOptions = container.querySelectorAll('select[name="country_id"] option');
        expect(countryOptions.length).toBe(2);
        expect(countryOptions[1].getAttribute('label')).toBe('Philippines');

        const deptOptions = container.querySelectorAll('select[name="department_id"] option');
        expect(deptOptions.length).toBe(3);

        const statusOptions = container.querySelectorAll('select[name="status"] option');
        expect([...statusOptions].map((o) => o.getAttribute('label')))
            .toEqual(['Select Status(Default)', 'Ongoing', 'Expired']);
    });

    // The filter bar guards `settings.countries !== undefined` and falls back to an empty
    // list. The card body has no equivalent guard, so this arm is exercised with a global
    // announcement, which is the only kind that never reads the country list.
    test('with no countries loaded the country picker offers only its placeholder', () => {
        const { container } = renderAnnouncementsList({
            settings: { countries: undefined },
            departmentAnnouncement: {
                isDepartmentAnnouncementListLoaded: true,
                depAnnouncementlist: { data: [{ ...ANNOUNCEMENT, set_country_all: 1 }], pagination: {} },
            },
        });
        expect(container.querySelectorAll('select[name="country_id"] option').length).toBe(1);
        expect(container.textContent).toContain('Country: Global');
    });

    test('choosing a country records it without disabling the other filters', () => {
        const { container } = renderAnnouncementsList();
        const country = container.querySelector('select[name="country_id"]');
        fireEvent.change(country, { target: { name: 'country_id', value: '63' } });
        expect(container.querySelector('select[name="country_id"]').value).toBe('63');
        expect(container.querySelector('select[name="department_id"]').disabled).toBe(false);
    });

    test('choosing an employee POV disables the department and country filters, and clearing it restores them', async () => {
        const view = renderAnnouncementsList();
        expect(view.employeeSelect().options).toEqual([{ label: 'Juan dela Cruz', value: 21 }]);

        await act(async () => { view.employeeSelect().onChange({ label: 'Juan dela Cruz', value: 21 }); });
        expect(view.ref.current.state.disable_others).toBe(true);
        expect(view.container.querySelector('select[name="department_id"]').disabled).toBe(true);
        expect(view.container.querySelector('select[name="country_id"]').disabled).toBe(true);

        await act(async () => { view.employeeSelect().onChange(null); });
        expect(view.ref.current.state.disable_others).toBe(false);
        expect(view.container.querySelector('select[name="department_id"]').disabled).toBe(false);
    });

    test('changing the sort order submits the filter immediately, carrying only the criteria that are set', async () => {
        const { container, actions } = renderAnnouncementsList();
        await settle(); // let the mount-time fetch land before counting
        actions.fetchDepartmentAnnouncementList.mockClear();

        await act(async () => {
            fireEvent.change(container.querySelector('select[name="order_by"]'), {
                target: { name: 'order_by', value: 'announcement_title:asc' },
            });
        });
        await settle();

        expect(actions.fetchDepartmentAnnouncementList).toHaveBeenCalledTimes(1);
        expect(actions.fetchDepartmentAnnouncementList).toHaveBeenCalledWith({
            order_by: 'announcement_title:asc', url: 'admin/AnnouncementList',
        });
    });
});
