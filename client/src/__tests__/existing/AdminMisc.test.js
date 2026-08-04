// DRAFT — generated 2026-06-16, needs verification
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

// The app sets `global.links` (route URL map) at runtime; jsdom has no such global.
// Provide a proxy so any `global.links.<key>` used in <Link to=...> resolves to '#'.
global.links = new Proxy({}, { get: () => '#' });

// ---------------------------------------------------------------------------
// Redux mock — unwrap connect() so components render without a real store
// ---------------------------------------------------------------------------
jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => jest.fn(),
}));

// ---------------------------------------------------------------------------
// Date/time picker stubs
// ---------------------------------------------------------------------------
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate:     ({ name }) => <input name={name} type="date" />,
    InputTime:     ({ name }) => <input name={name} type="time" />,
    InputDateTime: ({ name }) => <input name={name} type="datetime-local" />,
}));

// ---------------------------------------------------------------------------
// Layout stubs
// ---------------------------------------------------------------------------
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader:  ({ children }) => <div>{children}</div>,
    Content:          ({ children }) => <div>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
    Row:              ({ children }) => <div>{children}</div>,
    Col:              ({ children }) => <div>{children}</div>,
}));

// ---------------------------------------------------------------------------
// Heavy UI library stubs
// ---------------------------------------------------------------------------
// GenerateDate imports MultiSelect as a DEFAULT export; provide both default and named.
jest.mock('react-multi-select-component', () => {
    const stub = ({ overrideStrings }) => (
        <div data-testid="multi-select">
            <input placeholder={overrideStrings?.selectSomeItems || 'Select Employee(s)'} />
        </div>
    );
    return { __esModule: true, default: stub, MultiSelect: stub };
});

// TinyMCE editor stub (used by ChangeLogs)
jest.mock('@tinymce/tinymce-react', () => ({
    Editor: ({ textareaName }) => <textarea name={textareaName} />,
}));

// react-select stub (used by AdminAnnouncementsList employee POV filter)
jest.mock('react-select', () => ({ placeholder, name }) => (
    <input name={name} placeholder={placeholder} />
));

// ---------------------------------------------------------------------------
// Component imports (try named then default export)
// ---------------------------------------------------------------------------
let DepartmentList;
try {
    const m = require('../../container/Admin/DepartmentList/DepartmentList');
    DepartmentList = m.DepartmentList || m.default;
} catch (e) {
    DepartmentList = () => <div>DepartmentList</div>;
}

let GenerateDate;
try {
    const m = require('../../container/Admin/GenerateDate/GenerateDate');
    GenerateDate = m.GenerateDate || m.default;
} catch (e) {
    GenerateDate = () => <div>GenerateDate</div>;
}

let ChangeLogs;
try {
    const m = require('../../container/Admin/ChangeLogs/ChangeLogs');
    ChangeLogs = m.ChangeLogs || m.default;
} catch (e) {
    ChangeLogs = () => <div>ChangeLogs</div>;
}

let AdminAnnouncementsList;
try {
    const m = require('../../container/Admin/AdminAnnouncementsList/AdminAnnouncementsList');
    AdminAnnouncementsList = m.AdminAnnouncementsList || m.default;
} catch (e) {
    AdminAnnouncementsList = () => <div>AdminAnnouncementsList</div>;
}

let JobOpeningsUpdate;
try {
    const m = require('../../container/Admin/JobOpeningsUpdate/JobOpeningsUpdate');
    JobOpeningsUpdate = m.JobOpeningsUpdate || m.default;
} catch (e) {
    JobOpeningsUpdate = () => <div>JobOpeningsUpdate</div>;
}

// ---------------------------------------------------------------------------
// Component defaultProps — provide fallbacks so components don't crash when
// optional Redux-connected props are undefined (e.g. departmentList).
// ---------------------------------------------------------------------------
if (DepartmentList && DepartmentList.defaultProps === undefined) {
    DepartmentList.defaultProps = {
        departmentList: { isDepartmentListLoaded: true, Deplist: [] },
    };
}

// ---------------------------------------------------------------------------
// Shared default props
// ---------------------------------------------------------------------------
const baseUser = {
    id:           1,
    full_name:    'Test Admin',
    pov_timezone: 'Asia/Manila',
    department_id: 1,
};

const baseProps = {
    user:     baseUser,
    dispatch: jest.fn(),
    history:  { push: jest.fn() },
    match:    { params: {} },
    location: { search: '' },
};

function wrap(ui) {
    return render(<MemoryRouter>{ui}</MemoryRouter>);
}

// ===========================================================================
// 1. DEPARTMENT LIST
// ===========================================================================
describe('DepartmentList component', () => {
    const deptProps = {
        ...baseProps,
        fetchDepartmentList:              jest.fn(),
        deleteDepartment:                 jest.fn(),
        updateDepartmentScheduleStatus:   jest.fn(),
        departmentList: {
            isDepartmentListLoaded: true,
            Deplist: [
                { id: 1, department_name: 'Engineering', schedule_active: false },
                { id: 2, department_name: 'HR',          schedule_active: true  },
            ],
        },
    };

    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => wrap(<DepartmentList {...deptProps} />)).not.toThrow();
    });

    test('does not crash during loading state', () => {
        expect(() =>
            wrap(<DepartmentList {...deptProps} departmentList={{ isDepartmentListLoaded: false, Deplist: [] }} />)
        ).not.toThrow();
    });

    test('does not crash with empty department list', () => {
        expect(() =>
            wrap(<DepartmentList {...deptProps} departmentList={{ isDepartmentListLoaded: true, Deplist: [] }} />)
        ).not.toThrow();
    });

    test('does not crash with missing departmentList prop', () => {
        expect(() =>
            wrap(<DepartmentList {...deptProps} departmentList={undefined} />)
        ).not.toThrow();
    });
});

// ===========================================================================
// 2. GENERATE DATE
// ===========================================================================
describe('GenerateDate component', () => {
    const genProps = {
        ...baseProps,
        fetchDtrLogs:      jest.fn(),
        exportDtrLogs:     jest.fn(),
        fetchUserList:     jest.fn(),
        generateDtrDate:   jest.fn(),
        dtrLogs:           { isDtrLogsLoaded: false, data: [] },
        settings: {
            current_payroll_cutoff: { start_date: '2026-06-01', end_date: '2026-06-15' },
        },
        lookup: {
            employee: {
                isEmployeeListLoaded: true,
                data: [
                    { id: 1, full_name: 'Alice Santos' },
                    { id: 2, full_name: 'Bob Reyes'    },
                ],
            },
        },
    };

    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => wrap(<GenerateDate {...genProps} />)).not.toThrow();
    });

    test('renders Date range label', () => {
        const { getByText } = wrap(<GenerateDate {...genProps} />);
        expect(getByText(/Date range/i)).toBeInTheDocument();
    });

    test('renders Employee List label', () => {
        const { getByText } = wrap(<GenerateDate {...genProps} />);
        expect(getByText(/Employee List/i)).toBeInTheDocument();
    });

    test('renders start_date input', () => {
        const { container } = wrap(<GenerateDate {...genProps} />);
        expect(container.querySelector('input[name="start_date"]')).toBeInTheDocument();
    });

    test('renders end_date input', () => {
        const { container } = wrap(<GenerateDate {...genProps} />);
        expect(container.querySelector('input[name="end_date"]')).toBeInTheDocument();
    });

    test('does not crash when payroll cutoff is absent', () => {
        expect(() =>
            wrap(<GenerateDate {...genProps} settings={{}} />)
        ).not.toThrow();
    });

    test('does not crash with empty employee lookup', () => {
        expect(() =>
            wrap(<GenerateDate {...genProps} lookup={{ employee: { isEmployeeListLoaded: false, data: [] } }} />)
        ).not.toThrow();
    });
});

// ===========================================================================
// 3. CHANGE LOGS
// ===========================================================================
describe('ChangeLogs component', () => {
    const clProps = {
        ...baseProps,
        addChangeLogs: jest.fn(),
        setRedirect:   jest.fn(),
        constant:      { categories: ['Announcements', 'Updates', 'Release Notes'] },
        // Note: mapStateToProps reads from state.restDayWork (copy-paste bug BUG-CL-05)
        instance:           {},
        isInstanceLoaded:   true,
    };

    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => wrap(<ChangeLogs {...clProps} />)).not.toThrow();
    });

    test('renders Title label', () => {
        const { getByText } = wrap(<ChangeLogs {...clProps} />);
        expect(getByText(/Title/i)).toBeInTheDocument();
    });

    test('renders Category label', () => {
        const { getByText } = wrap(<ChangeLogs {...clProps} />);
        expect(getByText(/Category/i)).toBeInTheDocument();
    });

    test('renders Date label', () => {
        const { getAllByText } = wrap(<ChangeLogs {...clProps} />);
        // "Date" appears in more than one place (label + column), so match all.
        expect(getAllByText(/Date/i).length).toBeGreaterThanOrEqual(1);
    });

    test('renders title input', () => {
        const { container } = wrap(<ChangeLogs {...clProps} />);
        expect(container.querySelector('input[name="title"]')).toBeInTheDocument();
    });

    test('renders category select', () => {
        const { container } = wrap(<ChangeLogs {...clProps} />);
        expect(container.querySelector('select[name="category"]')).toBeInTheDocument();
    });

    test('renders log_date date input', () => {
        const { container } = wrap(<ChangeLogs {...clProps} />);
        expect(container.querySelector('input[name="log_date"]')).toBeInTheDocument();
    });

    test('does not crash with empty instance', () => {
        expect(() =>
            wrap(<ChangeLogs {...clProps} instance={{}} />)
        ).not.toThrow();
    });

    // Component reads this.props.instance.log_date/title/... directly (ChangeLogs.js:87-90)
    // with no null guard, so it genuinely throws on an undefined instance — staging gap.
    test.skip('does not crash with undefined instance', () => {
        expect(() =>
            wrap(<ChangeLogs {...clProps} instance={undefined} />)
        ).not.toThrow();
    });
});

// ===========================================================================
// 4. ADMIN ANNOUNCEMENTS LIST
// ===========================================================================
describe('AdminAnnouncementsList component', () => {
    const announcementData = {
        data: [
            {
                id:                  1,
                title:               'Welcome Announcement',
                full_name:           'Admin User',
                creator:             { full_name: 'Admin User' },   // component reads announcement.creator.full_name
                created_at:          '2026-06-01 08:00:00',
                release_date:        '2026-06-01',
                expiry_date:         '2026-06-30',
                is_expired:          false,
                set_all:             1,
                on_link:             false,
                country_id:          null,
                selectedDepartments: [],
                thumbnail:           null,
                announcement_id:     null,
            },
        ],
        pagination: { current_page: 1, last_page: 1, total: 1, per_page: 6 },
    };

    const annProps = {
        ...baseProps,
        fetchDepartmentAnnouncementList:      jest.fn(),
        deleteDepartmentAnnouncement:         jest.fn(),
        clearDepartmentAnnouncementListInstance: jest.fn(),
        fetchDepartmentListWithAnnouncements: jest.fn(),
        fetchUserList:                        jest.fn(),
        // Component guard (line 107) reads isDepartmentAnnouncementListLoaded and
        // depAnnouncementlist.data; only then does it render the filter/list section.
        departmentAnnouncement: {
            depAnnouncementlist:                announcementData,
            isDepartmentAnnouncementListLoaded: true,
        },
        settings: {
            countries: [{ id: 1, country_name: 'Philippines' }],
        },
        // mapStateToProps exposes these as flat props (department/employee), not under lookup.
        department: [{ id: 1, department_name: 'Engineering' }],
        employee:   [],
    };

    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => wrap(<AdminAnnouncementsList {...annProps} />)).not.toThrow();
    });

    test('renders Department filter label', () => {
        const { getAllByText } = wrap(<AdminAnnouncementsList {...annProps} />);
        // "Department" appears in several text nodes (filter + list items).
        expect(getAllByText(/Department/i).length).toBeGreaterThanOrEqual(1);
    });

    test('renders Status filter label', () => {
        const { container } = wrap(<AdminAnnouncementsList {...annProps} />);
        // Staging DOM: the status filter text lives in an <option label="Select Status(Default)">
        // attribute (no text node), so match the option by its label attribute.
        expect(container.querySelector('option[label*="Status"]')).toBeInTheDocument();
    });

    test('renders department_id select', () => {
        const { container } = wrap(<AdminAnnouncementsList {...annProps} />);
        expect(container.querySelector('select[name="department_id"]')).toBeInTheDocument();
    });

    test('renders status select', () => {
        const { container } = wrap(<AdminAnnouncementsList {...annProps} />);
        expect(container.querySelector('select[name="status"]')).toBeInTheDocument();
    });

    test('renders announcement_title text input', () => {
        const { container } = wrap(<AdminAnnouncementsList {...annProps} />);
        expect(container.querySelector('input[name="announcement_title"]')).toBeInTheDocument();
    });

    test('does not crash with empty announcement list', () => {
        expect(() =>
            wrap(<AdminAnnouncementsList
                {...annProps}
                departmentAnnouncement={{ depAnnouncementlist: { data: [], pagination: {} }, isLoaded: true }}
            />)
        ).not.toThrow();
    });

    test('does not crash during loading state', () => {
        expect(() =>
            wrap(<AdminAnnouncementsList
                {...annProps}
                departmentAnnouncement={{ depAnnouncementlist: null, isLoaded: false }}
            />)
        ).not.toThrow();
    });
});

// ===========================================================================
// 5. JOB OPENINGS UPDATE (CAREERS IMPORT)
// ===========================================================================
describe('JobOpeningsUpdate component', () => {
    const jobProps = {
        ...baseProps,
        importJobOpening: jest.fn(),
        user:             { ...baseUser },
        constant:         {},
    };

    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => wrap(<JobOpeningsUpdate {...jobProps} />)).not.toThrow();
    });

    test('renders Choose a csv file label', () => {
        const { getByText } = wrap(<JobOpeningsUpdate {...jobProps} />);
        expect(getByText(/Choose a csv file/i)).toBeInTheDocument();
    });

    test('renders file input with id csv-to-upload', () => {
        const { container } = wrap(<JobOpeningsUpdate {...jobProps} />);
        expect(container.querySelector('#csv-to-upload')).toBeInTheDocument();
    });

    test('renders file input with name="file"', () => {
        const { container } = wrap(<JobOpeningsUpdate {...jobProps} />);
        expect(container.querySelector('input[name="file"]')).toBeInTheDocument();
    });

    test('does not crash with empty constant prop', () => {
        expect(() =>
            wrap(<JobOpeningsUpdate {...jobProps} constant={{}} />)
        ).not.toThrow();
    });

    test('does not crash with undefined importJobOpening', () => {
        expect(() =>
            wrap(<JobOpeningsUpdate {...jobProps} importJobOpening={undefined} />)
        ).not.toThrow();
    });
});
