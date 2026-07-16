// DRAFT — generated 2026-06-16, needs verification
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

// The app sets `global.links` (route URL map) at runtime; jsdom has no such global.
// Provide a proxy so any `global.links.<key>` used in <Link to=...> resolves to '#'.
global.links = new Proxy({}, { get: () => '#' });

// ─── Redux mock ───────────────────────────────────────────────────────────────
jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => jest.fn(),
    useSelector: jest.fn(),
}));

// ─── DatePicker mock ─────────────────────────────────────────────────────────
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate:     ({ name }) => <input name={name} type="date" />,
    InputTime:     ({ name }) => <input name={name} type="time" />,
    InputDateTime: ({ name }) => <input name={name} type="datetime-local" />,
}));

// ─── Layout mocks ────────────────────────────────────────────────────────────
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader:  ({ children }) => <div>{children}</div>,
    Content:          ({ children }) => <div>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
    Row:              ({ children }) => <div>{children}</div>,
    Col:              ({ children }) => <div>{children}</div>,
}));

// ─── TinyMCE mock (used in DepartmentAnnouncementsForm) ──────────────────────
jest.mock('@tinymce/tinymce-react', () => ({
    Editor: ({ value }) => <textarea data-testid="tinymce-editor" defaultValue={value} />,
}));

// ─── react-multi-select-component mock (used in Form for department MultiSelect)
// The Form imports MultiSelect as a DEFAULT export; the List uses the named one.
// Provide both so neither renders the module object (Element type is invalid).
jest.mock('react-multi-select-component', () => {
    const stub = ({ overrideStrings }) => (
        <div data-testid="multi-select">
            {overrideStrings && overrideStrings.selectSomeItems
                ? overrideStrings.selectSomeItems
                : 'Select Departments'}
        </div>
    );
    return { __esModule: true, default: stub, MultiSelect: stub };
});

// ─── Joyride mock (used in List and Form) ────────────────────────────────────
jest.mock('react-joyride', () => () => <div data-testid="joyride" />);

// ─── PageLoading mock ────────────────────────────────────────────────────────
jest.mock('../../container/PageLoading', () => () => (
    <div data-testid="page-loading">Loading...</div>
));

// ─── Import components (try named then default) ───────────────────────────────
let DepartmentAnnouncementsList;
try {
    const m = require('../../container/DepartmentAnnouncements/DepartmentAnnouncementsList/DepartmentAnnouncementsList');
    DepartmentAnnouncementsList = m.DepartmentAnnouncementsList || m.default;
} catch {
    DepartmentAnnouncementsList = require('../../container/DepartmentAnnouncements/DepartmentAnnouncementsList/DepartmentAnnouncementsList').default;
}

let DepartmentAnnouncementsForm;
try {
    const m = require('../../container/DepartmentAnnouncements/DepartmentAnnouncementsForm/DepartmentAnnouncementsForm');
    DepartmentAnnouncementsForm = m.DepartmentAnnouncementsForm || m.default;
} catch {
    DepartmentAnnouncementsForm = require('../../container/DepartmentAnnouncements/DepartmentAnnouncementsForm/DepartmentAnnouncementsForm').default;
}

let AnnouncementsPage;
try {
    const m = require('../../container/DepartmentAnnouncements/AnnouncementsPage/AnnouncementsPage');
    AnnouncementsPage = m.AnnouncementsPage || m.default;
} catch {
    AnnouncementsPage = require('../../container/DepartmentAnnouncements/AnnouncementsPage/AnnouncementsPage').default;
}

// ─── Shared default props ─────────────────────────────────────────────────────
const defaultUser = {
    id:           1,
    full_name:    'Test Employee',
    pov_timezone: 'Asia/Manila',
    LevelId:      3,
    country_id:   1,
    department_id: 1,
};

const defaultListProps = {
    user:       defaultUser,
    dispatch:   jest.fn(),
    history:    { push: jest.fn() },
    match:      { params: {} },
    location:   { search: '' },
    // Redux state.departmentAnnouncement slice
    departmentAnnouncement: {
        depAnnouncementlist:              [],
        isDepartmentAnnouncementListLoaded: true,
        instance:                         {},
        isInstanceLoaded:                 false,
    },
    depAnnouncementlist:              [],
    isDepartmentAnnouncementListLoaded: true,
    // Actions
    clearDepartmentAnnouncementListInstance: jest.fn(),
    fetchMyHandleAnnouncementList:          jest.fn(),
    deleteDepartmentAnnouncement:           jest.fn(),
};

const defaultFormProps = {
    user:       defaultUser,
    dispatch:   jest.fn(),
    history:    { push: jest.fn() },
    match:      { params: {} },
    params:     { id: undefined },   // component reads this.props.params.id directly
    location:   { search: '' },
    // Redux state keys used by DepartmentAnnouncementsForm
    department:       [],
    constant:         {},
    instance:         {},
    isInstanceLoaded: false,
    settings:         { countries: [] },
    // Actions
    fetchDepartmentList:                  jest.fn(),
    clearDepartmentAnnouncementInstance:  jest.fn(),
    fetchDepartmentAnnouncementStrict:    jest.fn(),
    createDepartmentAnnouncement:         jest.fn(),
    updateDepartmentAnnouncement:         jest.fn(),
    setRedirect:                          jest.fn(),
};

const defaultPageProps = {
    user:       defaultUser,
    dispatch:   jest.fn(),
    history:    { push: jest.fn() },
    match:      { params: { id: '42' } },
    params:     { id: '42' },   // component reads this.props.params.id directly
    location:   { search: '' },
    // Redux state keys used by AnnouncementsPage
    constant:   {},
    instance:   {
        id:           42,
        title:        'Test Announcement Title',
        headline:     'Test headline',
        release_date: '2026-07-01',
        expiry_date:  '2026-09-01',
        category:     'Department',
        content:      '<p>Announcement content here</p>',
        thumbnail:    null,
        on_link:      0,
    },
    isInstanceLoaded: true,
    departmentAnnouncement: {
        depAnnouncementlist:              [],
        isDepartmentAnnouncementListLoaded: true,
        instance:                         {},
        isInstanceLoaded:                 true,
    },
    // Actions
    clearDepartmentAnnouncementListInstance: jest.fn(),
    fetchDepartmentAnnouncementStrict:       jest.fn(),
    fetchDashboardAnnouncementList:          jest.fn(),
};

// ─── Render helpers ───────────────────────────────────────────────────────────
function renderList(props = {}) {
    const merged = { ...defaultListProps, ...props };
    // The component reads the redux slice this.props.departmentAnnouncement.*,
    // so mirror flat list/loaded overrides into that nested object.
    merged.departmentAnnouncement = {
        ...defaultListProps.departmentAnnouncement,
        ...(props.departmentAnnouncement || {}),
        ...(props.depAnnouncementlist !== undefined ? { depAnnouncementlist: props.depAnnouncementlist } : {}),
        ...(props.isDepartmentAnnouncementListLoaded !== undefined
            ? { isDepartmentAnnouncementListLoaded: props.isDepartmentAnnouncementListLoaded } : {}),
    };
    return render(
        <MemoryRouter>
            <DepartmentAnnouncementsList {...merged} />
        </MemoryRouter>
    );
}

function renderForm(props = {}) {
    return render(
        <MemoryRouter>
            <DepartmentAnnouncementsForm {...defaultFormProps} {...props} />
        </MemoryRouter>
    );
}

function renderPage(props = {}) {
    return render(
        <MemoryRouter>
            <AnnouncementsPage {...defaultPageProps} {...props} />
        </MemoryRouter>
    );
}

// =============================================================================
// DepartmentAnnouncementsList
// =============================================================================
describe('DepartmentAnnouncementsList component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderList()).not.toThrow();
    });

    test('renders "Create Announcement" link', () => {
        const { getByText } = renderList();
        expect(getByText(/Create Announcement/i)).toBeInTheDocument();
    });

    test('renders loading state when isDepartmentAnnouncementListLoaded is false', () => {
        const { getByTestId } = renderList({ isDepartmentAnnouncementListLoaded: false });
        expect(getByTestId('page-loading')).toBeInTheDocument();
    });

    test('does not crash with empty announcement list', () => {
        expect(() => renderList({ depAnnouncementlist: [] })).not.toThrow();
    });

    test('renders announcement cards when list has items', () => {
        const announcements = [
            {
                id:           1,
                title:        'Q2 Team Update',
                headline:     'Important update',
                release_date: '2026-07-01',
                expiry_date:  '2026-09-01',
                category:     'Department',
                on_link:      0,
                thumbnail:    null,
                is_expired:   false,
            },
        ];
        const { getByText } = renderList({
            depAnnouncementlist:              announcements,
            isDepartmentAnnouncementListLoaded: true,
            departmentAnnouncement: {
                depAnnouncementlist:              announcements,
                isDepartmentAnnouncementListLoaded: true,
            },
        });
        expect(getByText(/Q2 Team Update/i)).toBeInTheDocument();
    });

    test('does not crash with null announcement list (loading guard)', () => {
        expect(() =>
            renderList({
                depAnnouncementlist: null,
                isDepartmentAnnouncementListLoaded: false,
            })
        ).not.toThrow();
    });
});

// =============================================================================
// DepartmentAnnouncementsForm
// =============================================================================
describe('DepartmentAnnouncementsForm component (store mode)', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing in store mode', () => {
        expect(() => renderForm()).not.toThrow();
    });

    test('renders "Title:" label', () => {
        const { getByText } = renderForm();
        expect(getByText(/Title:/i)).toBeInTheDocument();
    });

    test('renders "Headline:" label', () => {
        const { getByText } = renderForm();
        expect(getByText(/Headline:/i)).toBeInTheDocument();
    });

    test('renders "Release Date:" label', () => {
        const { getByText } = renderForm();
        expect(getByText(/Release Date:/i)).toBeInTheDocument();
    });

    test('renders "Expiry Date:" label', () => {
        const { getByText } = renderForm();
        expect(getByText(/Expiry Date:/i)).toBeInTheDocument();
    });

    test('renders release_date date input', () => {
        const { container } = renderForm();
        // InputDate mock renders <input type="date" name="release_date">
        const input = container.querySelector('input[name="release_date"]');
        expect(input).toBeInTheDocument();
    });

    test('renders expiry_date date input', () => {
        const { container } = renderForm();
        const input = container.querySelector('input[name="expiry_date"]');
        expect(input).toBeInTheDocument();
    });

    test('renders "(Optional)" placeholder on headline field', () => {
        const { getByPlaceholderText } = renderForm();
        expect(getByPlaceholderText(/Optional/i)).toBeInTheDocument();
    });

    test('renders "All Departments" radio option', () => {
        const { getAllByText } = renderForm();
        // The form renders the "All Departments" label in more than one place.
        expect(getAllByText(/All Departments/i).length).toBeGreaterThanOrEqual(1);
    });

    test('renders "Select Departments" multi-select', () => {
        const { getByText } = renderForm();
        expect(getByText(/Select Departments/i)).toBeInTheDocument();
    });

    test('renders "Content:" label', () => {
        const { getByText } = renderForm();
        expect(getByText(/Content:/i)).toBeInTheDocument();
    });

    test('does not crash during loading state (update mode not yet loaded)', () => {
        expect(() =>
            renderForm({
                match:            { params: { id: '5' } },
                isInstanceLoaded: false,
            })
        ).not.toThrow();
    });

    test('renders with pre-loaded instance in edit mode', () => {
        const instance = {
            id:           5,
            title:        'Existing Announcement',
            headline:     'Existing headline',
            release_date: '2026-07-01',
            expiry_date:  '2026-09-01',
            category:     'Department',
            content:      '<p>Existing content</p>',
            on_link:      0,
            set_all:      1,
            set_exclude:  0,
            set_country_all: 1,
            country_id:   1,
            selectedDepartments: null,
            link:         null,
        };
        expect(() =>
            renderForm({
                match:            { params: { id: '5' } },
                isInstanceLoaded: true,
                instance,
            })
        ).not.toThrow();
    });
});

// =============================================================================
// AnnouncementsPage
// =============================================================================
describe('AnnouncementsPage component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderPage()).not.toThrow();
    });

    test('renders announcement title', () => {
        const { getByText } = renderPage();
        expect(getByText(/Test Announcement Title/i)).toBeInTheDocument();
    });

    test('renders category badge', () => {
        const { getByText } = renderPage();
        expect(getByText(/Department/i)).toBeInTheDocument();
    });

    test('shows loading state when isInstanceLoaded is false', () => {
        const { getByTestId } = renderPage({ isInstanceLoaded: false });
        expect(getByTestId('page-loading')).toBeInTheDocument();
    });

    test('renders "not part of your departments" message when instance title is null', () => {
        const { getByText } = renderPage({
            instance: { title: null },
            isInstanceLoaded: true,
        });
        expect(
            getByText(/does not seem to be part of your departments/i)
        ).toBeInTheDocument();
    });

    test('renders sidebar section when announcement list is loaded', () => {
        const sidebarItems = [
            {
                id:           10,
                title:        'Sidebar Announcement',
                on_link:      0,
                release_date: '2026-07-01',
            },
        ];
        const { getByText } = renderPage({
            departmentAnnouncement: {
                depAnnouncementlist:              sidebarItems,
                isDepartmentAnnouncementListLoaded: true,
                instance:                         { title: 'Test Announcement Title' },
                isInstanceLoaded:                 true,
            },
        });
        expect(getByText(/Sidebar Announcement/i)).toBeInTheDocument();
    });

    test('does not crash with empty props object on instance', () => {
        expect(() => renderPage({ instance: {} })).not.toThrow();
    });

    test('does not crash with empty sidebar list', () => {
        expect(() =>
            renderPage({
                departmentAnnouncement: {
                    depAnnouncementlist:              [],
                    isDepartmentAnnouncementListLoaded: true,
                    instance:                         {},
                    isInstanceLoaded:                 true,
                },
            })
        ).not.toThrow();
    });
});
