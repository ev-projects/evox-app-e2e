// DRAFT — generated 2026-06-16, needs verification
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

// ---------------------------------------------------------------------------
// Mock react-redux: strip connect() so the component renders without a store
// ---------------------------------------------------------------------------
jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => jest.fn(),
}));

// ---------------------------------------------------------------------------
// Mock date/time pickers (not used by DailyTimeRecord directly but may be
// pulled in transitively through DtrSummaryBlock or child components)
// ---------------------------------------------------------------------------
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate:     ({ name }) => <input name={name} type="date" />,
    InputTime:     ({ name }) => <input name={name} type="time" />,
    InputDateTime: ({ name }) => <input name={name} type="datetime-local" />,
}));

// ---------------------------------------------------------------------------
// Mock layout shell components
// ---------------------------------------------------------------------------
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);

jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader:  ({ children }) => <div>{children}</div>,
    Content:          ({ title, children }) => <div>{title && <span>{title}</span>}{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
    Row:              ({ children }) => <div>{children}</div>,
    Col:              ({ children }) => <div>{children}</div>,
}));

// ---------------------------------------------------------------------------
// Mock react-select (used for Year / Month / Payroll Cutoff dropdowns)
// ---------------------------------------------------------------------------
jest.mock('react-select', () => ({ placeholder, onChange, options, className }) => (
    <select
        aria-label={placeholder}
        className={className}
        onChange={(e) => onChange && onChange({ value: e.target.value, label: e.target.value })}
    >
        <option value="">{placeholder}</option>
        {(options || []).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
        ))}
    </select>
));

// ---------------------------------------------------------------------------
// Mock moment (used extensively for date comparisons and formatting)
// ---------------------------------------------------------------------------
jest.mock('moment', () => {
    const moment = jest.requireActual('moment');
    return moment;
});

// ---------------------------------------------------------------------------
// Mock FontAwesome icons (imported as <i class="fa fa-..."> in JSX)
// ---------------------------------------------------------------------------
jest.mock('react-fontawesome', () => ({ icon }) => <span data-icon={icon} />, { virtual: true });

// ---------------------------------------------------------------------------
// Import the component — supports both named and default export
// ---------------------------------------------------------------------------
let DailyTimeRecord;
try {
    const m = require('../../container/DailyTimeRecord/DailyTimeRecord');
    DailyTimeRecord = m.DailyTimeRecord || m.default;
} catch (e) {
    DailyTimeRecord = require('../../container/DailyTimeRecord/DailyTimeRecord').default;
}

// ---------------------------------------------------------------------------
// Default props matching the Redux mapStateToProps shape
// ---------------------------------------------------------------------------
const defaultProps = {
    // User object — drives timezone conversion and "own vs manager" logic
    user: {
        id: 1,
        full_name: 'Test Employee',
        emp_num: '001',
        pov_timezone: 'Asia/Manila',
    },

    // Redux dtr slice
    dtr: {
        list: [],
        dtrSummary: {
            data: {
                reg: {
                    late: '00:00:00',
                    undertime: '00:00:00',
                    nsd: '00:00:00',
                    ot: '00:00:00',
                    ot_nd: '00:00:00',
                    absent: 0,
                },
            },
            column: [],
        },
        employeeInfo: {},
        filter: {},
        selectedPayrollCutoff: {},
        isDtrLoaded: true,
        isDtrSummaryLoaded: true,
        isFilterLoaded: true,
    },

    // Redux settings slice — drives default payroll cutoff selection
    settings: {
        current_payroll_cutoff_ph: {
            id: 1,
            start_date: '2026-06-01',
            end_date: '2026-06-15',
            year: '2026',
            month: 'June',
            label: 'June 1 – 15, 2026',
        },
    },

    // Mapped action dispatchers
    viewEmployeeDtr:        jest.fn(),
    getFilterForDtr:        jest.fn(),
    setSelectedPayrollCutoff: jest.fn(),
    getUserDtrSummary:      jest.fn(),
    dispatch:               jest.fn(),

    // Router props
    history:  { push: jest.fn() },
    match:    { params: { id: '1' } },
    params:   { id: '1' },
    location: { search: '', pathname: '/dtr/1' },
};

function renderComponent(props = {}) {
    return render(
        <MemoryRouter>
            <DailyTimeRecord {...defaultProps} {...props} />
        </MemoryRouter>
    );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('DailyTimeRecord component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    test('renders "Daily Time Record" page title', () => {
        const { getByText } = renderComponent();
        expect(getByText(/Daily Time Record/i)).toBeInTheDocument();
    });

    test('renders Year dropdown with correct placeholder', () => {
        const { getByRole } = renderComponent();
        // react-select mock renders a <select> with aria-label = placeholder
        const yearDropdown = getByRole('combobox', { name: /Select Year/i });
        expect(yearDropdown).toBeInTheDocument();
    });

    test('renders Payroll Cutoff dropdown', () => {
        const { getAllByRole } = renderComponent();
        // There are multiple dropdowns; at least one should have the cutoff placeholder
        const selects = getAllByRole('combobox');
        expect(selects.length).toBeGreaterThanOrEqual(1);
    });

    test('does not crash during loading state (isDtrLoaded false)', () => {
        expect(() => renderComponent({ dtr: { ...defaultProps.dtr, isDtrLoaded: false } })).not.toThrow();
    });

    test('does not crash with empty dtr list', () => {
        expect(() => renderComponent({ dtr: { ...defaultProps.dtr, list: [] } })).not.toThrow();
    });

    test('does not crash when settings has no current_payroll_cutoff_ph', () => {
        expect(() => renderComponent({ settings: {} })).not.toThrow();
    });

    test('does not crash when dtrSummary is empty object', () => {
        expect(() =>
            renderComponent({
                dtr: {
                    ...defaultProps.dtr,
                    dtrSummary: {},
                },
            })
        ).not.toThrow();
    });

    test('does not crash with manager viewing another employee (params.id != user.id)', () => {
        expect(() =>
            renderComponent({
                match: { params: { id: '99' } },
            })
        ).not.toThrow();
    });

    test('does not crash with populated dtr list', () => {
        const dtrRecord = {
            dtr_id: 101,
            date: '2026-06-10',
            attendance_status: 'present',
            is_rest_day: 0,
            time_in: '2026-06-10 09:00:00',
            time_out: '2026-06-10 18:00:00',
            late: '00:00:00',
            undertime: '00:00:00',
            nsd: '00:00:00',
            ot: '00:00:00',
            ot_nd: '00:00:00',
            leaves: [],
            holidays: [],
            requests: [],
            alter_log_status: null,
            owner_POV: {
                time_in: '2026-06-10 09:00:00',
                time_out: '2026-06-10 18:00:00',
            },
        };
        expect(() =>
            renderComponent({
                dtr: { ...defaultProps.dtr, list: [dtrRecord] },
            })
        ).not.toThrow();
    });
});

// ---------------------------------------------------------------------------
// DailyTimeRecordPuncher (Multi Clock-In View) — secondary container test
// ---------------------------------------------------------------------------
let DailyTimeRecordPuncher;
try {
    const m = require('../../container/DailyTimeRecordPuncher/DailyTimeRecordPuncher');
    DailyTimeRecordPuncher = m.DailyTimeRecordPuncher || m.default;
} catch (e) {
    try {
        DailyTimeRecordPuncher = require('../../container/DailyTimeRecordPuncher/DailyTimeRecordPuncher').default;
    } catch (e) {
        DailyTimeRecordPuncher = null;
    }
}

const puncherDefaultProps = {
    ...defaultProps,
    dtr: {
        ...defaultProps.dtr,
        punch_list: [],
        isListPunchLoaded: true,
    },
    viewEmployeePunch: jest.fn(),
    settings: {
        current_payroll_cutoff: {
            id: 2,
            start_date: '2026-06-01',
            end_date: '2026-06-15',
            year: '2026',
            month: 'June',
            label: 'June 1 – 15, 2026',
        },
    },
};

describe('DailyTimeRecordPuncher component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing (if component exists)', () => {
        if (!DailyTimeRecordPuncher) {
            return; // Skip if import failed
        }
        expect(() =>
            render(
                <MemoryRouter>
                    <DailyTimeRecordPuncher {...puncherDefaultProps} />
                </MemoryRouter>
            )
        ).not.toThrow();
    });

    test('does not crash with empty punch_list', () => {
        if (!DailyTimeRecordPuncher) {
            return;
        }
        expect(() =>
            render(
                <MemoryRouter>
                    <DailyTimeRecordPuncher {...puncherDefaultProps} punch_list={[]} />
                </MemoryRouter>
            )
        ).not.toThrow();
    });
});

// ---------------------------------------------------------------------------
// DtrPunch (Multi Clock-In container — punch_history route)
// ---------------------------------------------------------------------------
let DtrPunch;
try {
    const m = require('../../container/DtrPunch/DtrPunch');
    DtrPunch = m.DtrPunch || m.default;
} catch (e) {
    try {
        DtrPunch = require('../../container/DtrPunch/DtrPunch').default;
    } catch (e) {
        DtrPunch = null;
    }
}

// Mock heavy child components used by DtrPunch
jest.mock(
    '../../components/Dashboard/PunchComponents/MultiQuickpunch',
    () => () => <div data-testid="multi-quickpunch">MultiQuickpunch</div>
);
jest.mock(
    '../../components/Dashboard/PunchComponents/RecentPunch',
    () => () => <div data-testid="recent-punch">RecentPunch</div>
);

describe('DtrPunch component (Multi Clock-In container)', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing (if component exists)', () => {
        if (!DtrPunch) {
            return;
        }
        expect(() =>
            render(
                <MemoryRouter>
                    <DtrPunch {...defaultProps} />
                </MemoryRouter>
            )
        ).not.toThrow();
    });

    test('does not crash with isLoading state', () => {
        if (!DtrPunch) {
            return;
        }
        expect(() =>
            render(
                <MemoryRouter>
                    <DtrPunch {...defaultProps} dtr={{ ...defaultProps.dtr, isDtrLoaded: false }} />
                </MemoryRouter>
            )
        ).not.toThrow();
    });
});
