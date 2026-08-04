// DRAFT — generated 2026-06-18, needs verification
/**
 * EVOX Jest P0: DailyTimeRecordIndiaMorocco Container Tests
 * Source: src/container/DailyTimeRecordIndiaMorocco/DailyTimeRecordIndiaMorocco.js
 * Business case: India/Morocco variant of the Daily Time Record view.
 * Supervisors and employees view DTR by selecting Year, Month, and Payroll
 * Cutoff from cascading react-select dropdowns. Uses
 * settings.current_payroll_cutoff_in_mar (not current_payroll_cutoff).
 * Route: /app/dtr_in_mar/:id
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

// ---------------------------------------------------------------------------
// react-redux: connect passthrough
// ---------------------------------------------------------------------------
jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
}));

// ---------------------------------------------------------------------------
// react-select: render as native <select> so tests can query by name
// ---------------------------------------------------------------------------
jest.mock('react-select', () => ({ name, options, onChange, placeholder, value }) => (
    <select
        name={name}
        data-testid={`select-${name}`}
        onChange={(e) => onChange && onChange({ value: e.target.value, label: e.target.value })}
        defaultValue={value?.value || ''}
    >
        <option value="">{placeholder || 'Select'}</option>
        {(options || []).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
        ))}
    </select>
));

// ---------------------------------------------------------------------------
// react-bootstrap: passthrough stubs
// ---------------------------------------------------------------------------
jest.mock('react-bootstrap', () => ({
    Container:   ({ children }) => <div>{children}</div>,
    Row:         ({ children }) => <div>{children}</div>,
    Col:         ({ children }) => <div>{children}</div>,
    Table:       ({ children }) => <table>{children}</table>,
    Image:       (props) => <img alt="" {...props} />,
    Card:        ({ children }) => <div>{children}</div>,
    Spinner:     () => <div>Loading...</div>,
    Form:        ({ children }) => <form>{children}</form>,
    Button:      ({ children, onClick, type }) => <button type={type || 'button'} onClick={onClick}>{children}</button>,
    InputGroup:  ({ children }) => <div>{children}</div>,
    FormControl: (props) => <input {...props} />,
    Toast:       ({ children }) => <div>{children}</div>,
}));

// ---------------------------------------------------------------------------
// Layout / template wrappers
// ---------------------------------------------------------------------------
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/Template/BackButton', () => () => <button>Back</button>);
jest.mock('../../components/RequestComponent/RequestButtons/RequestSubtitle', () => () => <span />);
jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader:  ({ children }) => <div>{children}</div>,
    Content:          ({ title, subtitle, children }) => (
        <div>{title && <span>{title}</span>}{subtitle}{children}</div>
    ),
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
}));

// ---------------------------------------------------------------------------
// Services — stub only; logic not under test here
// ---------------------------------------------------------------------------
jest.mock('../../services/Authenticator', () => ({
    scanFeature: jest.fn(() => false),
    isLoggedIn:  () => true,
}));

jest.mock('../../services/Validator', () => ({
    isValid: jest.fn((v) => {
        if (v == null || v === '' || v === false || v === undefined) return false;
        if (typeof v === 'object' && Object.keys(v).length === 0) return false;
        return true;
    }),
}));

// ---------------------------------------------------------------------------
// Suppress console noise from the component
// ---------------------------------------------------------------------------
beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterAll(() => {
    console.log.mockRestore();
    console.error.mockRestore();
    console.warn.mockRestore();
});

// ---------------------------------------------------------------------------
// Action mocks
// ---------------------------------------------------------------------------
const mockGetFilterForDtr = jest.fn();
const mockViewEmployeeDtr = jest.fn(() => Promise.resolve());
const mockSetSelectedPayrollCutoff = jest.fn(() => Promise.resolve());

// ---------------------------------------------------------------------------
// Default props — mirrors Redux mapStateToProps + mapDispatchToProps output
// ---------------------------------------------------------------------------
const defaultProps = {
    user: { id: 1, full_name: 'Test Employee', pov_timezone: 'Asia/Manila' },
    dtr: {
        filter: {},
        isFilterLoaded: false,
        isDtrLoaded: false,
        isDtrSummaryLoaded: false,
        dtrSummary: {},
        employeeInfo: { timezone: 'Asia/Manila', full_name: 'Test Employee' },
        selectedPayrollCutoff: {},
    },
    settings: {
        current_payroll_cutoff_in_mar: {
            id: 1,
            name: 'May 2026 1st Half',
            start_date: '2026-05-01',
            end_date: '2026-05-15',
            year: '2026',
            month: '05',
            month_label: 'May',
        },
    },
    // EVOX pattern: params is a separate top-level prop, NOT inside match
    params:                   { id: 1 },
    getFilterForDtr:          mockGetFilterForDtr,
    viewEmployeeDtr:          mockViewEmployeeDtr,
    fetchUser:                jest.fn(),
    setRedirect:              jest.fn(),
    setSelectedPayrollCutoff: mockSetSelectedPayrollCutoff,
    getUserDtrSummary:        jest.fn(),
    dispatch:                 jest.fn(),
    history:  { push: jest.fn() },
    match:    { params: {} },
    location: { search: '', pathname: '/app/dtr_in_mar/1/' },
};

// ---------------------------------------------------------------------------
// Component loader
// ---------------------------------------------------------------------------
let DailyTimeRecordIndiaMorocco;
try {
    const m = require('../../container/DailyTimeRecordIndiaMorocco/DailyTimeRecordIndiaMorocco');
    DailyTimeRecordIndiaMorocco = m.DailyTimeRecordIndiaMorocco || m.default;
} catch (e) {
    DailyTimeRecordIndiaMorocco = require('../../container/DailyTimeRecordIndiaMorocco/DailyTimeRecordIndiaMorocco').default;
}

function renderComponent(props = {}) {
    return render(
        <MemoryRouter>
            <DailyTimeRecordIndiaMorocco
                {...defaultProps}
                {...props}
                dtr={{ ...defaultProps.dtr, ...(props.dtr || {}) }}
                settings={{ ...defaultProps.settings, ...(props.settings || {}) }}
            />
        </MemoryRouter>
    );
}

// ===========================================================================
// TEST SUITE
// ===========================================================================
describe('DailyTimeRecordIndiaMorocco container', () => {
    beforeEach(() => jest.clearAllMocks());

    // -------------------------------------------------------------------------
    // Smoke / crash-free
    // -------------------------------------------------------------------------
    test('renders without crashing', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    test('renders "Daily Time Record" heading', () => {
        const { getByText } = renderComponent();
        expect(getByText(/Daily Time Record/i)).toBeInTheDocument();
    });

    // -------------------------------------------------------------------------
    // Mount behaviour
    // -------------------------------------------------------------------------
    test('calls getFilterForDtr on mount with params.id', () => {
        renderComponent();
        expect(mockGetFilterForDtr).toHaveBeenCalledWith(defaultProps.params.id);
    });

    // -------------------------------------------------------------------------
    // Filter dropdowns — gated on dtr.isFilterLoaded
    // -------------------------------------------------------------------------
    test('does not show Year select when isFilterLoaded is false', () => {
        const { queryByTestId } = renderComponent();
        expect(queryByTestId('select-year')).not.toBeInTheDocument();
    });

    test('shows Year select when isFilterLoaded is true', () => {
        const { getByTestId } = renderComponent({
            dtr: { isFilterLoaded: true, filter: {}, isDtrLoaded: false, selectedPayrollCutoff: {} },
        });
        expect(getByTestId('select-year')).toBeInTheDocument();
    });

    test('Year select is populated from dtr.filter keys when isFilterLoaded is true', () => {
        const { getByTestId } = renderComponent({
            dtr: {
                isFilterLoaded: true,
                isDtrLoaded:    false,
                selectedPayrollCutoff: {},
                filter: {
                    '2025': { '01': { label: 'January', data: {} } },
                    '2026': { '05': { label: 'May', data: {} } },
                },
            },
        });
        const yearSelect = getByTestId('select-year');
        expect(yearSelect.options.length).toBeGreaterThanOrEqual(2);
    });

    // -------------------------------------------------------------------------
    // Resilience tests — null/undefined edge cases
    // -------------------------------------------------------------------------
    test('does not crash when settings.current_payroll_cutoff_in_mar is null', () => {
        expect(() => renderComponent({
            settings: { current_payroll_cutoff_in_mar: null },
        })).not.toThrow();
    });

    test('does not crash when params.id is undefined', () => {
        expect(() => renderComponent({ params: {} })).not.toThrow();
    });

    test('does not crash when dtr.selectedPayrollCutoff is empty object', () => {
        expect(() => renderComponent({
            dtr: { ...defaultProps.dtr, selectedPayrollCutoff: {} },
        })).not.toThrow();
    });

    test('does not crash when dtr.filter is empty', () => {
        expect(() => renderComponent({
            dtr: { ...defaultProps.dtr, filter: {}, isFilterLoaded: false },
        })).not.toThrow();
    });

    test('does not crash in self-view mode (user.id === params.id)', () => {
        expect(() => renderComponent({ params: { id: 1 } })).not.toThrow();
    });

    test('does not crash in approval mode (viewer is not the employee)', () => {
        expect(() => renderComponent({ params: { id: 99 } })).not.toThrow();
    });

    test('does not crash when dtr.employeeInfo is empty object', () => {
        expect(() => renderComponent({
            dtr: { ...defaultProps.dtr, employeeInfo: {} },
        })).not.toThrow();
    });
});
