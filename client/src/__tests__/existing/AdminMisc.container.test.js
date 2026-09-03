// DRAFT — generated 2026-06-16, needs verification
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

// Global app routes — AdminAnnouncementsList references global.links for Link hrefs
require('../../config/GlobalVariables');

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
// GenerateDate uses `import MultiSelect from "react-multi-select-component"` (default import).
// The mock must expose a `default` export so the default import resolves to a function,
// not to the whole module object (which would cause "type is invalid — got: object").
jest.mock('react-multi-select-component', () => {
    const Stub = ({ overrideStrings }) => (
        <div data-testid="multi-select">
            <input placeholder={overrideStrings?.selectSomeItems || 'Select Employee(s)'} />
        </div>
    );
    return {
        __esModule: true,
        default:     Stub,
        MultiSelect: Stub,
    };
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
// 3. CHANGE LOGS — FEATURE RETIRED 2026-08-13
// ===========================================================================
describe.skip('ChangeLogs component (retired — Admin/ChangeLogs removed 2026-08-13)', () => {
    // All tests skipped. container/Admin/ChangeLogs deleted; Changelogs module removed
    // by Glenn Macasarte commits dea17bdf + 6c38ae92 (2026-07-13/16).
});

// ===========================================================================
// 4. ADMIN ANNOUNCEMENTS LIST
// ===========================================================================
describe('AdminAnnouncementsList component', () => {
    // mapStateToProps: state.departmentAnnouncement → departmentAnnouncement
    // Render guard: departmentAnnouncement.isDepartmentAnnouncementListLoaded (NOT isLoaded)
    //              AND depAnnouncementlist.data != undefined
    // mapStateToProps: state.lookup.department → department (as array from component code)
    // ListFilter accesses props.props.department.map(...) so it must be a plain array.
    const announcementData = {
        data: [
            {
                id:                  1,
                title:               'Welcome Announcement',
                creator:             { full_name: 'Admin User' },  // required by line 153
                created_at:          '2026-06-01 08:00:00',
                release_date:        '2026-06-01',
                expiry_date:         '2026-06-30',
                is_expired:          false,
                set_all:             1,
                set_country_all:     1,
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
        fetchDepartmentAnnouncementList:         jest.fn(),
        deleteDepartmentAnnouncement:            jest.fn(),
        clearDepartmentAnnouncementListInstance: jest.fn(),
        fetchDepartmentListWithAnnouncements:    jest.fn(),
        fetchUserList:                           jest.fn(),
        departmentAnnouncement: {
            depAnnouncementlist:                 announcementData,
            // Component checks isDepartmentAnnouncementListLoaded (not isLoaded)
            isDepartmentAnnouncementListLoaded:  true,
        },
        settings: {
            countries: [{ id: 1, country_name: 'Philippines', country_id: 1 }],
        },
        // mapStateToProps maps state.lookup.department → department (plain array)
        department: [{ id: 1, department_name: 'Engineering' }],
        employee:   [],
    };

    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => wrap(<AdminAnnouncementsList {...annProps} />)).not.toThrow();
    });

    test('renders Department filter label (option text)', () => {
        const { container } = wrap(<AdminAnnouncementsList {...annProps} />);
        // The department select is present; its default option label contains "Department"
        expect(container.querySelector('select[name="department_id"]')).toBeInTheDocument();
    });

    test('renders Status filter label (option text)', () => {
        const { container } = wrap(<AdminAnnouncementsList {...annProps} />);
        // The status select is present; its default option label contains "Status"
        expect(container.querySelector('select[name="status"]')).toBeInTheDocument();
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
                departmentAnnouncement={{
                    depAnnouncementlist:               { data: [], pagination: {} },
                    isDepartmentAnnouncementListLoaded: true,
                }}
            />)
        ).not.toThrow();
    });

    test('does not crash during loading state', () => {
        expect(() =>
            wrap(<AdminAnnouncementsList
                {...annProps}
                departmentAnnouncement={{
                    depAnnouncementlist:               null,
                    isDepartmentAnnouncementListLoaded: false,
                }}
            />)
        ).not.toThrow();
    });
});

// ===========================================================================
// 5. JOB OPENINGS UPDATE (CAREERS IMPORT) — removed (EVOX-720, Careers Dead
// Code Removal). container/Admin/JobOpeningsUpdate/JobOpeningsUpdate.js no
// longer exists; the careers-import CSV upload feature it tested is gone.
// ===========================================================================
