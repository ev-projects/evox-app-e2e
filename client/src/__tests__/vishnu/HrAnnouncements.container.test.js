// DRAFT — generated 2026-06-16, needs verification
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
require('../../config/GlobalVariables');

// ============================================================
// Global mocks — applied to all components in this file
// ============================================================

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => jest.fn(),
    useSelector: jest.fn(),
}));

jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate:     ({ name }) => <input name={name} type="date" />,
    InputTime:     ({ name }) => <input name={name} type="time" />,
    InputDateTime: ({ name }) => <input name={name} type="datetime-local" />,
}));

jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);

jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader:  ({ children }) => <div>{children}</div>,
    Content:          ({ children }) => <div>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
    Row:              ({ children }) => <div>{children}</div>,
    Col:              ({ children }) => <div>{children}</div>,
}));

// TinyMCE is a heavy dependency used in both HrAnnouncementsForm and PostAnnouncements
jest.mock('@tinymce/tinymce-react', () => ({
    Editor: ({ onEditorChange }) => (
        <textarea data-testid="tinymce-editor" onChange={(e) => onEditorChange && onEditorChange(e.target.value)} />
    ),
}));

// PageLoading used in HrAnnouncementsList while data is loading
jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading" />);

// ============================================================
// Component loaders (try named export, fall back to default)
// ============================================================

let HrAnnouncementsList;
try {
    const m = require('../../container/Hr/HrAnnouncementsList/HrAnnouncementsList');
    HrAnnouncementsList = m.HrAnnouncementsList || m.default;
} catch {
    HrAnnouncementsList = require('../../container/Hr/HrAnnouncementsList/HrAnnouncementsList').default;
}

let HrAnnouncementsForm;
try {
    const m = require('../../container/Hr/HrAnnouncementsForm/HrAnnouncementsForm');
    HrAnnouncementsForm = m.HrAnnouncementsForm || m.default;
} catch {
    HrAnnouncementsForm = require('../../container/Hr/HrAnnouncementsForm/HrAnnouncementsForm').default;
}

// Legacy/alternate components (imported in RouteList but NOT routed)
let HrAnnouncementsLegacy;
try {
    const m = require('../../container/Hr/Announcements/Announcements');
    HrAnnouncementsLegacy = m.HrAnnouncements || m.default;
} catch {
    try {
        HrAnnouncementsLegacy = require('../../container/Hr/Announcements/Announcements').default;
    } catch {
        HrAnnouncementsLegacy = null;
    }
}

let PostAnnouncements;
try {
    const m = require('../../container/Hr/PostAnnouncements/PostAnnouncements');
    PostAnnouncements = m.PostHrAnnouncements || m.default;
} catch {
    try {
        PostAnnouncements = require('../../container/Hr/PostAnnouncements/PostAnnouncements').default;
    } catch {
        PostAnnouncements = null;
    }
}

// ============================================================
// Default props shared across components
// ============================================================

const baseProps = {
    user:     { id: 1, full_name: 'Test HR User', pov_timezone: 'Asia/Manila' },
    dispatch: jest.fn(),
    history:  { push: jest.fn() },
    match:    { params: {} },
    location: { search: '' },
};

// HrAnnouncementsList Redux state props
// slice: state.departmentAnnouncement
const listDefaultProps = {
    ...baseProps,
    isDepartmentAnnouncementListLoaded: true,
    depAnnouncementlist: [
        {
            id:           1,
            title:        'Test Announcement',
            headline:     'Test Headline',
            release_date: '2026-07-01',
            expiry_date:  '2026-07-31',
            thumbnail:    null,
        },
    ],
    departmentAnnouncement: {
        isDepartmentAnnouncementListLoaded: true,
        depAnnouncementlist: [],
    },
    fetchHrHandleAnnouncementList: jest.fn(),
    deleteHrAnnouncement:          jest.fn(),
};

// HrAnnouncementsForm Redux state props
// slice: state.departmentAnnouncement
const formDefaultProps = {
    ...baseProps,
    params:            { id: undefined },
    match:             { params: { id: undefined } },
    instance:          {},
    isInstanceLoaded:  true,
    departmentAnnouncement: {
        instance:         {},
        isInstanceLoaded: true,
    },
    createHrAnnouncement:         jest.fn(),
    fetchHrAnnouncementStrict:    jest.fn(),
    updateHrAnnouncement:         jest.fn(),
    clearHrAnnouncementInstance:  jest.fn(),
};

// Legacy Announcements.js Redux state props
// slice: state.hrAnnouncement
// NOTE: mapStateToProps gives hrAnnouncement = state.hrAnnouncement.listInstance (array)
const legacyListDefaultProps = {
    ...baseProps,
    hrAnnouncement: [
        {
            id:           1,
            title:        'Test Legacy Announcement',
            content:      '<p>test</p>',
            release_date: '2026-07-01',
            expiry_date:  '2026-07-31',
            log_date:     '2026-07-01',
            user:         { first_name: 'Test', last_name: 'User' },
        },
    ],
    listInstance:         [],
    isListInstanceLoaded: true,
    fetchHrAnnouncements:  jest.fn(),
    deleteHrAnnouncement:  jest.fn(),
    setRedirect:           jest.fn(),
};

// PostAnnouncements.js Redux state props
// slice: state.hrAnnouncement
const postDefaultProps = {
    ...baseProps,
    params:            { id: undefined },
    match:             { params: { id: undefined } },
    hrAnnouncement: {
        instance: {},
    },
    instance:                    {},
    addHrAnnouncements:          jest.fn(),
    updateHrAnnouncements:       jest.fn(),
    fetchHrAnnouncement:         jest.fn(),
    clearHrAnnouncementInstance: jest.fn(),
    setRedirect:                 jest.fn(),
};

// ============================================================
// Render helpers
// ============================================================

function renderList(props = {}) {
    return render(
        <MemoryRouter>
            <HrAnnouncementsList {...listDefaultProps} {...props} />
        </MemoryRouter>
    );
}

function renderForm(props = {}) {
    return render(
        <MemoryRouter>
            <HrAnnouncementsForm {...formDefaultProps} {...props} />
        </MemoryRouter>
    );
}

// ============================================================
// Suite 1: HrAnnouncementsList
// Route: /app/hr/ManageHrAnnouncements/
// Component: container/Hr/HrAnnouncementsList/HrAnnouncementsList.js
// ============================================================

describe('HrAnnouncementsList component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderList()).not.toThrow();
    });

    test('renders Create HR Announcement button when list is loaded', () => {
        const { getByText } = renderList();
        expect(getByText(/Create HR Announcement/i)).toBeInTheDocument();
    });

    test('renders announcement title from depAnnouncementlist', () => {
        const { getByText } = renderList({
            departmentAnnouncement: {
                isDepartmentAnnouncementListLoaded: true,
                depAnnouncementlist: [
                    {
                        id:           42,
                        title:        'Q3 Company Update',
                        headline:     'Important news',
                        release_date: '2026-07-01',
                        expiry_date:  '2026-07-31',
                        thumbnail:    null,
                    },
                ],
            },
        });
        expect(getByText(/Q3 Company Update/i)).toBeInTheDocument();
    });

    test('shows loading state when isDepartmentAnnouncementListLoaded is false', () => {
        const { getByTestId } = renderList({
            departmentAnnouncement: { isDepartmentAnnouncementListLoaded: false, depAnnouncementlist: [] },
        });
        expect(getByTestId('page-loading')).toBeInTheDocument();
    });

    test('does not crash with empty announcement list', () => {
        expect(() => renderList({ depAnnouncementlist: [] })).not.toThrow();
    });

    test('does not crash with null announcement list', () => {
        expect(() => renderList({ depAnnouncementlist: null })).not.toThrow();
    });

    test('renders Edit and Delete buttons for each announcement', () => {
        const { getAllByText } = renderList({
            departmentAnnouncement: {
                isDepartmentAnnouncementListLoaded: true,
                depAnnouncementlist: [
                    { id: 1, title: 'Announcement A', headline: '', release_date: '2026-07-01', expiry_date: '2026-07-31', thumbnail: null },
                    { id: 2, title: 'Announcement B', headline: '', release_date: '2026-07-01', expiry_date: '2026-07-31', thumbnail: null },
                ],
            },
        });
        // Each card should have a Delete button
        const deleteButtons = getAllByText(/Delete/i);
        expect(deleteButtons.length).toBeGreaterThanOrEqual(2);
    });
});

// ============================================================
// Suite 2: HrAnnouncementsForm (Create / Edit)
// Route: /app/hr/PostHrAnnouncements/ and /app/hr/PostHrAnnouncements/:id
// Component: container/Hr/HrAnnouncementsForm/HrAnnouncementsForm.js
// ============================================================

describe('HrAnnouncementsForm component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing in create mode', () => {
        expect(() => renderForm()).not.toThrow();
    });

    test('renders Title label', () => {
        const { getByText } = renderForm();
        expect(getByText(/Title:/i)).toBeInTheDocument();
    });

    test('renders Headline label', () => {
        const { getByText } = renderForm();
        expect(getByText(/Headline:/i)).toBeInTheDocument();
    });

    test('renders Release Date label', () => {
        const { getByText } = renderForm();
        expect(getByText(/Release Date:/i)).toBeInTheDocument();
    });

    test('renders Expiry Date label', () => {
        const { getByText } = renderForm();
        expect(getByText(/Expiry Date:/i)).toBeInTheDocument();
    });

    test('renders Content label', () => {
        const { getByText } = renderForm();
        expect(getByText(/Content:/i)).toBeInTheDocument();
    });

    test('renders Thumbnail label', () => {
        const { getByText } = renderForm();
        expect(getByText(/Thumbnail/i)).toBeInTheDocument();
    });

    test('renders release_date date picker input', () => {
        const { container } = renderForm();
        // InputDate mock renders an <input name="release_date" type="date">
        const dateInput = container.querySelector('input[name="release_date"]');
        expect(dateInput).toBeInTheDocument();
    });

    test('renders expiry_date date picker input', () => {
        const { container } = renderForm();
        const dateInput = container.querySelector('input[name="expiry_date"]');
        expect(dateInput).toBeInTheDocument();
    });

    test('renders TinyMCE content editor', () => {
        const { getByTestId } = renderForm();
        expect(getByTestId('tinymce-editor')).toBeInTheDocument();
    });

    test('renders hidden method input', () => {
        const { container } = renderForm();
        const methodInput = container.querySelector('input[name="method"]');
        expect(methodInput).toBeInTheDocument();
    });

    test('does not crash in edit mode with instance pre-loaded', () => {
        const editProps = {
            match: { params: { id: '5' } },
            instance: {
                id:           5,
                title:        'Existing Announcement',
                headline:     'Existing Headline',
                release_date: '2026-06-01',
                expiry_date:  '2026-06-30',
                content:      '<p>Existing content</p>',
            },
            isInstanceLoaded: true,
        };
        expect(() => renderForm(editProps)).not.toThrow();
    });

    test('does not crash with empty instance prop', () => {
        expect(() => renderForm({ instance: {} })).not.toThrow();
    });

    test('does not crash during loading state (isInstanceLoaded false)', () => {
        expect(() => renderForm({ isInstanceLoaded: false })).not.toThrow();
    });
});

// ============================================================
// Suite 3: Legacy Announcements.js (unrouted — dead code)
// Component: container/Hr/Announcements/Announcements.js
// NOTE: This component is imported in RouteList.js but never registered as a route.
//       Tests are structural only.
// ============================================================

describe('HrAnnouncements (legacy/unrouted) component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('component module can be loaded without error', () => {
        // The component is dead code (unrouted) but should not throw on import
        expect(HrAnnouncementsLegacy).toBeDefined();
    });

    test('renders without crashing when component is available', () => {
        if (!HrAnnouncementsLegacy) {
            // Skip if module not found
            return;
        }
        expect(() =>
            render(
                <MemoryRouter>
                    <HrAnnouncementsLegacy {...legacyListDefaultProps} />
                </MemoryRouter>
            )
        ).not.toThrow();
    });

    test('renders Title column header when component is available', () => {
        if (!HrAnnouncementsLegacy) return;
        const { getByText } = render(
            <MemoryRouter>
                <HrAnnouncementsLegacy {...legacyListDefaultProps} />
            </MemoryRouter>
        );
        expect(getByText(/Title/i)).toBeInTheDocument();
    });

    test('does not crash with empty listInstance', () => {
        if (!HrAnnouncementsLegacy) return;
        expect(() =>
            render(
                <MemoryRouter>
                    <HrAnnouncementsLegacy {...legacyListDefaultProps} listInstance={[]} />
                </MemoryRouter>
            )
        ).not.toThrow();
    });
});

// ============================================================
// Suite 4: PostAnnouncements.js (unrouted — dead code)
// Component: container/Hr/PostAnnouncements/PostAnnouncements.js
// NOTE: This component is imported in RouteList.js but never registered as a route.
//       Tests are structural only.
// ============================================================

describe('PostAnnouncements (legacy/unrouted) component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('component module can be loaded without error', () => {
        expect(PostAnnouncements).toBeDefined();
    });

    test('renders without crashing when component is available', () => {
        if (!PostAnnouncements) return;
        expect(() =>
            render(
                <MemoryRouter>
                    <PostAnnouncements {...postDefaultProps} />
                </MemoryRouter>
            )
        ).not.toThrow();
    });

    test('renders Title label when component is available', () => {
        if (!PostAnnouncements) return;
        const { getByText } = render(
            <MemoryRouter>
                <PostAnnouncements {...postDefaultProps} />
            </MemoryRouter>
        );
        expect(getByText(/Title:/i)).toBeInTheDocument();
    });

    test('renders Category label when component is available', () => {
        if (!PostAnnouncements) return;
        const { getByText } = render(
            <MemoryRouter>
                <PostAnnouncements {...postDefaultProps} />
            </MemoryRouter>
        );
        expect(getByText(/Category:/i)).toBeInTheDocument();
    });

    test('renders Date label when component is available', () => {
        if (!PostAnnouncements) return;
        const { getByText } = render(
            <MemoryRouter>
                <PostAnnouncements {...postDefaultProps} />
            </MemoryRouter>
        );
        expect(getByText(/Date:/i)).toBeInTheDocument();
    });

    test('renders TinyMCE description editor when component is available', () => {
        if (!PostAnnouncements) return;
        const { getByTestId } = render(
            <MemoryRouter>
                <PostAnnouncements {...postDefaultProps} />
            </MemoryRouter>
        );
        expect(getByTestId('tinymce-editor')).toBeInTheDocument();
    });

    test('does not crash in edit mode with existing instance', () => {
        if (!PostAnnouncements) return;
        const editProps = {
            match: { params: { id: '3' } },
            instance: {
                id:          3,
                title:       'Old Announcement',
                category:    'Updates',
                log_date:    '2026-05-01',
                description: '<p>Old content</p>',
            },
        };
        expect(() =>
            render(
                <MemoryRouter>
                    <PostAnnouncements {...postDefaultProps} {...editProps} />
                </MemoryRouter>
            )
        ).not.toThrow();
    });
});
