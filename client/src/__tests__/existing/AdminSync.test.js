// DRAFT — generated 2026-06-16, needs verification
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

// ---------------------------------------------------------------------------
// Redux mock — connect passes component through unchanged
// ---------------------------------------------------------------------------
jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => jest.fn(),
    useSelector: jest.fn(),
}));

// ---------------------------------------------------------------------------
// DatePicker stubs — all four sync pages use InputDate
// ---------------------------------------------------------------------------
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate:     ({ name }) => <input name={name} type="date" />,
    InputTime:     ({ name }) => <input name={name} type="time" />,
    InputDateTime: ({ name }) => <input name={name} type="datetime-local" />,
}));

// ---------------------------------------------------------------------------
// Layout / template stubs
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
// PageLoading stub
// ---------------------------------------------------------------------------
jest.mock('../../container/PageLoading', () => () => <div>Loading...</div>);

// ---------------------------------------------------------------------------
// Formik stub — renders children with controlled form helpers
// ---------------------------------------------------------------------------
jest.mock('formik', () => ({
    ...jest.requireActual('formik'),
    Formik: ({ children, initialValues }) =>
        typeof children === 'function'
            ? children({
                  values: initialValues || {},
                  errors: {},
                  touched: {},
                  handleChange: jest.fn(),
                  handleBlur: jest.fn(),
                  handleSubmit: jest.fn(),
                  setFieldValue: jest.fn(),
                  isSubmitting: false,
              })
            : <div>{children}</div>,
    Form: ({ children }) => <form>{children}</form>,
    Field: ({ name, placeholder, as: As, ...rest }) =>
        As ? <As name={name} placeholder={placeholder} {...rest} /> : <input name={name} placeholder={placeholder} />,
    ErrorMessage: () => null,
}));

// ---------------------------------------------------------------------------
// Import the four Admin Sync components
// Each sync page is a standalone container; we test each separately.
// ---------------------------------------------------------------------------
let SyncBhrLeaves;
try {
    const m = require('../../container/Admin/SyncBhrLeaves/SyncBhrLeaves');
    SyncBhrLeaves = m.SyncBhrLeaves || m.default;
} catch (e) {
    SyncBhrLeaves = require('../../container/Admin/SyncBhrLeaves/SyncBhrLeaves').default;
}

let SyncUserUpdates;
try {
    const m = require('../../container/Admin/SyncUserUpdates/SyncUserUpdates');
    SyncUserUpdates = m.SyncUserUpdates || m.default;
} catch (e) {
    SyncUserUpdates = require('../../container/Admin/SyncUserUpdates/SyncUserUpdates').default;
}

let SyncUTCAdjustment;
try {
    const m = require('../../container/Admin/SyncUTCAdjustment/SyncUTCAdjustment');
    SyncUTCAdjustment = m.SyncUTCAdjustment || m.default;
} catch (e) {
    SyncUTCAdjustment = require('../../container/Admin/SyncUTCAdjustment/SyncUTCAdjustment').default;
}

// ---------------------------------------------------------------------------
// Default props — shared base (all four pages read state.sync + state.settings)
// ---------------------------------------------------------------------------
const baseProps = {
    user: {
        id: 1,
        full_name: 'Test Admin',
        pov_timezone: 'Asia/Manila',
    },
    dispatch: jest.fn(),
    history:  { push: jest.fn() },
    match:    { params: {} },
    location: { search: '' },

    // state.sync — all four initial state keys
    sync: {
        biometrics: [],
        leaves:     [],
        users:      [],
    },

    // state.settings — pre-populates date pickers
    settings: {
        current_payroll_cutoff: {
            start_date: '2026-06-01',
            end_date:   '2026-06-15',
        },
    },
};

// ---------------------------------------------------------------------------
// Per-component default props (add action dispatchers specific to each page)
// ---------------------------------------------------------------------------
const biometricsProps = {
    ...baseProps,
    syncBiometrics: jest.fn(),
};

const bhrLeavesProps = {
    ...baseProps,
    syncBhrLeaves: jest.fn(),
};

const userUpdatesProps = {
    ...baseProps,
    syncBhrUsers: jest.fn(),
};

const utcAdjustmentProps = {
    ...baseProps,
    // Note: function name has a typo in production code: syncUTCAdjusetment (extra 'e')
    syncUTCAdjusetment: jest.fn(),
};

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------
function renderBiometrics(props = {}) {
    return render(
        <MemoryRouter>
            <SyncBiometrics {...biometricsProps} {...props} />
        </MemoryRouter>
    );
}

function renderBhrLeaves(props = {}) {
    return render(
        <MemoryRouter>
            <SyncBhrLeaves {...bhrLeavesProps} {...props} />
        </MemoryRouter>
    );
}

function renderUserUpdates(props = {}) {
    return render(
        <MemoryRouter>
            <SyncUserUpdates {...userUpdatesProps} {...props} />
        </MemoryRouter>
    );
}

function renderUTCAdjustment(props = {}) {
    return render(
        <MemoryRouter>
            <SyncUTCAdjustment {...utcAdjustmentProps} {...props} />
        </MemoryRouter>
    );
}
// SyncBiometrics tests removed 2026-08-06 — the manual biometric-sync page was retired
// (routes, sidebar entry and container all removed). The scheduled cron still feeds
// payroll via `php artisan sync_biometrix_logs`; only the on-demand UI is gone.

describe('SyncBhrLeaves component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderBhrLeaves()).not.toThrow();
    });

    test('renders Date From label', () => {
        const { getByText } = renderBhrLeaves();
        expect(getByText(/Date From/i)).toBeInTheDocument();
    });

    test('renders Date To label', () => {
        const { getByText } = renderBhrLeaves();
        expect(getByText(/Date To/i)).toBeInTheDocument();
    });

    test('renders valid_from date input', () => {
        const { container } = renderBhrLeaves();
        const input = container.querySelector('input[name="valid_from"]');
        expect(input).not.toBeNull();
    });

    test('renders valid_to date input', () => {
        const { container } = renderBhrLeaves();
        const input = container.querySelector('input[name="valid_to"]');
        expect(input).not.toBeNull();
    });

    test('renders Submit button', () => {
        const { container } = renderBhrLeaves();
        const btn = container.querySelector('button[type="submit"]');
        expect(btn).not.toBeNull();
    });

    test('does not render results table when leaves array is empty', () => {
        const { queryByRole } = renderBhrLeaves({ sync: { biometrics: [], leaves: [], users: [] } });
        expect(queryByRole('table')).toBeNull();
    });

    test('does not crash with populated leaves array', () => {
        expect(() =>
            renderBhrLeaves({
                sync: {
                    biometrics: [],
                    leaves: [
                        {
                            date: '2026-06-01',
                            employee_no: '20001',
                            employee_name: 'Juan dela Cruz',
                            leave_type: 'Vacation Leave',
                            status: 'approved',
                        },
                    ],
                    users: [],
                },
            })
        ).not.toThrow();
    });

    test('does not crash with null sync state', () => {
        expect(() => renderBhrLeaves({ sync: null })).not.toThrow();
    });
});

// ===========================================================================
// SyncUserUpdates — container/Admin/SyncUserUpdates/SyncUserUpdates.js
// Route: /app/admin/SyncUserUpdates/
// ===========================================================================
describe('SyncUserUpdates component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderUserUpdates()).not.toThrow();
    });

    test('renders Changes From label', () => {
        const { getByText } = renderUserUpdates();
        expect(getByText(/Changes From/i)).toBeInTheDocument();
    });

    test('renders valid_from date input', () => {
        const { container } = renderUserUpdates();
        const input = container.querySelector('input[name="valid_from"]');
        expect(input).not.toBeNull();
    });

    test('renders Submit button', () => {
        const { container } = renderUserUpdates();
        const btn = container.querySelector('button[type="submit"]');
        expect(btn).not.toBeNull();
    });

    test('does not render results table when users array is empty', () => {
        const { queryByRole } = renderUserUpdates({ sync: { biometrics: [], leaves: [], users: [] } });
        expect(queryByRole('table')).toBeNull();
    });

    test('does not crash with populated users array', () => {
        expect(() =>
            renderUserUpdates({
                sync: {
                    biometrics: [],
                    leaves: [],
                    users: [
                        { emp_num: '20001', name: 'Juan dela Cruz', action: 'Update' },
                        { emp_num: '20002', name: 'Maria Santos', action: 'New User' },
                    ],
                },
            })
        ).not.toThrow();
    });

    test('does not crash with null sync state', () => {
        expect(() => renderUserUpdates({ sync: null })).not.toThrow();
    });

    test('does not crash when settings payroll cutoff is absent', () => {
        expect(() => renderUserUpdates({ settings: {} })).not.toThrow();
    });
});

// ===========================================================================
// SyncUTCAdjustment — container/Admin/SyncUTCAdjustment/SyncUTCAdjustment.js
// Route: /app/admin/SyncUTCAdjustment/
// ===========================================================================
describe('SyncUTCAdjustment component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderUTCAdjustment()).not.toThrow();
    });

    test('renders Check Adjustment button', () => {
        // This page has NO form fields — only a single submit button
        const { container } = renderUTCAdjustment();
        const btn = container.querySelector('button[type="submit"]');
        expect(btn).not.toBeNull();
    });

    test('renders Check Adjustment button label text', () => {
        const { getByText } = renderUTCAdjustment();
        expect(getByText(/Check Adjustment/i)).toBeInTheDocument();
    });

    test('does not render any date input fields', () => {
        // UTC Adjustment page has no date picker fields; 0 expected
        const { container } = renderUTCAdjustment();
        const dateInputs = container.querySelectorAll('input[type="date"]');
        expect(dateInputs.length).toBe(0);
    });

    test('does not crash with empty sync state', () => {
        expect(() =>
            renderUTCAdjustment({ sync: { biometrics: [], leaves: [], users: [] } })
        ).not.toThrow();
    });

    test('does not crash when settings payroll cutoff is absent', () => {
        expect(() => renderUTCAdjustment({ settings: {} })).not.toThrow();
    });
});
