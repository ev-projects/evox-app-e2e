/**
 * Status: DRAFT — generated 2026-06-17, needs verification
 *
 * EVOX-36 — Jest P0: DateReport Component Tests
 * Sources:
 *   src/components/DateReport/ViewReport.js          (India Payroll Report)
 *   src/components/DateReport/ViewReportMorocco.js   (Morocco Payroll Report)
 *
 * Business case: Payroll report views that let an admin select a month/year
 * (and optionally a department for Morocco) then call the API to generate and
 * export a time-off/payroll summary table.
 *
 * Tests cover: renders without crashing, month/year select inputs present,
 * Filter button visible, Export button visible, loading/empty-results states.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

// ---------------------------------------------------------------------------
// react-redux — connect passthrough + useDispatch stub
// ---------------------------------------------------------------------------
const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect:    () => (Component) => Component,
    useDispatch: () => mockDispatch,
}));

// ---------------------------------------------------------------------------
// react-bootstrap — render children / minimal stubs so JSX resolves
// ---------------------------------------------------------------------------
jest.mock('react-bootstrap', () => {
    const React = require('react');
    const passthrough = ({ children, ...rest }) => React.createElement('div', rest, children);
    const Button = ({ children, onClick, variant, ...rest }) =>
        React.createElement('button', { onClick, 'data-variant': variant, ...rest }, children);
    const SelectEl = ({ children, name, value, onChange, required, ...rest }) =>
        React.createElement('select', { name, value, onChange, required }, children);
    const OptionEl = ({ children, value }) =>
        React.createElement('option', { value }, children);
    const TableEl = ({ children, ...rest }) =>
        React.createElement('table', rest, children);
    const Thead = ({ children }) => React.createElement('thead', null, children);
    const Tbody = ({ children }) => React.createElement('tbody', null, children);
    const Tr    = ({ children }) => React.createElement('tr', null, children);
    const Th    = ({ children }) => React.createElement('th', null, children);
    const Td    = ({ children }) => React.createElement('td', null, children);
    // Dropdown with a Toggle child
    const DropdownToggle = ({ children, ...rest }) =>
        React.createElement('button', rest, children);
    const Dropdown = ({ children, onClick, ...rest }) =>
        React.createElement('div', { onClick, 'data-testid': 'export-dropdown', ...rest }, children);
    Dropdown.Toggle = DropdownToggle;

    return {
        Container:   passthrough,
        Row:         passthrough,
        Col:         passthrough,
        Tabs:        passthrough,
        Tab:         passthrough,
        Badge:       passthrough,
        Table:       TableEl,
        Button,
        FormControl: (props) => React.createElement('input', props),
        ToggleButton: passthrough,
        ButtonGroup:  passthrough,
        Dropdown,
        Select:      SelectEl,
        Option:      OptionEl,
        Thead,
        Tbody,
        Tr,
        Th,
        Td,
    };
});

// ---------------------------------------------------------------------------
// GridComponent/AdminLte — layout shell stubs
// ---------------------------------------------------------------------------
jest.mock('../../components/GridComponent/AdminLte.js', () => {
    const React = require('react');
    const p = ({ children }) => React.createElement('div', null, children);
    return {
        ContainerHeader:  p,
        Content:          p,
        ContainerWrapper: p,
        ContainerBody:    p,
        Row:              p,
        Col:              p,
    };
});

// ---------------------------------------------------------------------------
// Template/Wrapper stub
// ---------------------------------------------------------------------------
jest.mock('../../components/Template/Wrapper', () =>
    ({ children }) => {
        const React = require('react');
        return React.createElement('div', null, children);
    }
);

// ---------------------------------------------------------------------------
// DatePickerComponent stub (not used by ViewReport but imported transitively)
// ---------------------------------------------------------------------------
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate:     ({ name }) => {
        const React = require('react');
        return React.createElement('input', { name, type: 'date' });
    },
    InputTime:     ({ name }) => {
        const React = require('react');
        return React.createElement('input', { name, type: 'time' });
    },
    InputDateTime: ({ name }) => {
        const React = require('react');
        return React.createElement('input', { name, type: 'datetime-local' });
    },
}));

// ---------------------------------------------------------------------------
// react-select stub
// ---------------------------------------------------------------------------
jest.mock('react-select', () => {
    const React = require('react');
    return ({ inputId }) => React.createElement('div', { 'data-testid': 'react-select', id: inputId });
});

// ---------------------------------------------------------------------------
// formik — useFormikContext (imported but not called during render)
// ---------------------------------------------------------------------------
jest.mock('formik', () => ({
    ...jest.requireActual('formik'),
    useFormikContext: jest.fn(() => ({ values: {}, setFieldValue: jest.fn() })),
}));

// ---------------------------------------------------------------------------
// API service stub — prevent real HTTP calls
// ---------------------------------------------------------------------------
jest.mock('../../services/API', () => ({
    __esModule: true,
    default: {
        call: jest.fn(() => Promise.resolve({ status: 200, data: { content: { timeoffItems: [], timeoffItemsnew: [] } } })),
    },
}));

// ---------------------------------------------------------------------------
// Formatter service stub
// ---------------------------------------------------------------------------
jest.mock('../../services/Formatter', () => ({
    __esModule: true,
    default: {
        alert_error:   jest.fn(() => ({ type: 'ALERT_ERROR' })),
        alert_success: jest.fn(() => ({ type: 'ALERT_SUCCESS' })),
    },
}));

// ---------------------------------------------------------------------------
// PayrollReportApi stub — prevent dispatch of real thunks
// ---------------------------------------------------------------------------
jest.mock('../../components/DateReport/PayrollReportApi.js', () => ({
    fecthUserContry:          jest.fn(() => ({ type: 'FETCH_MY_COUNTRY_NOOP' })),
    fecthMoroccoPayrollParams: jest.fn(() => ({ type: 'FETCH_MOROCCO_PAYROLL_PARAMS_NOOP' })),
}));

// ---------------------------------------------------------------------------
// opsschedule actions stub
// ---------------------------------------------------------------------------
jest.mock('../../store/actions/opsschedule/opsScheduleActions.js', () => ({
    clearOpsScheduleInstance: jest.fn(() => ({ type: 'CLEAR_OPS_SCHEDULE_NOOP' })),
}));

// ===========================================================================
// ViewReport (India Payroll Report)
// ===========================================================================
let ViewReport;
try {
    const m = require('../../components/DateReport/ViewReport');
    ViewReport = m.ViewReport || m.default;
} catch {
    ViewReport = require('../../components/DateReport/ViewReport').default;
}

const defaultViewReportProps = {
    user:        { id: 1, full_name: 'Test Admin' },
    usercountry: [],
    dispatch:    mockDispatch,
};

function renderViewReport(props = {}) {
    return render(
        <MemoryRouter>
            <ViewReport {...defaultViewReportProps} {...props} />
        </MemoryRouter>
    );
}

describe('ViewReport — India Payroll Report', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderViewReport()).not.toThrow();
    });

    test('renders India Payroll Report page title', () => {
        const { getByText } = renderViewReport();
        expect(getByText(/India Payroll Report/i)).toBeInTheDocument();
    });

    test('renders month select input', () => {
        const { container } = renderViewReport();
        const selects = container.querySelectorAll('select');
        expect(selects.length).toBeGreaterThanOrEqual(1);
    });

    test('month select has a default empty option', () => {
        const { getAllByRole } = renderViewReport();
        const options = getAllByRole('option');
        const placeholder = options.find(
            (o) => o.textContent === '- Select Month -'
        );
        expect(placeholder).toBeInTheDocument();
    });

    test('year select has a default empty option', () => {
        const { getAllByRole } = renderViewReport();
        const options = getAllByRole('option');
        const placeholder = options.find(
            (o) => o.textContent === '- Select Year -'
        );
        expect(placeholder).toBeInTheDocument();
    });

    test('renders Filter / Generate button', () => {
        const { getByText } = renderViewReport();
        expect(getByText(/Filter/i)).toBeInTheDocument();
    });

    test('renders Export button', () => {
        const { getByText } = renderViewReport();
        expect(getByText(/Export/i)).toBeInTheDocument();
    });

    test('dispatches fecthUserContry on mount', () => {
        renderViewReport();
        expect(mockDispatch).toHaveBeenCalled();
    });

    test('empty results state — table renders with no data rows', () => {
        const { container } = renderViewReport();
        const tbody = container.querySelector('tbody');
        expect(tbody).toBeInTheDocument();
        // No data rows rendered yet (datatimeoff starts empty)
        const rows = tbody.querySelectorAll('tr');
        expect(rows.length).toBe(0);
    });

    test('does not crash when usercountry is undefined', () => {
        expect(() => renderViewReport({ usercountry: undefined })).not.toThrow();
    });

    test('does not crash when usercountry is null', () => {
        expect(() => renderViewReport({ usercountry: null })).not.toThrow();
    });

    test('does not crash with a populated usercountry list', () => {
        expect(() =>
            renderViewReport({
                usercountry: [
                    { country_id: 1, country_name: 'India' },
                    { country_id: 4, country_name: 'Morocco' },
                ],
            })
        ).not.toThrow();
    });
});

// ===========================================================================
// ViewReportMorocco (Morocco Payroll Report)
// ===========================================================================
let ViewReportMorocco;
try {
    const m = require('../../components/DateReport/ViewReportMorocco');
    ViewReportMorocco = m.ViewReportMorocco || m.default;
} catch {
    ViewReportMorocco = require('../../components/DateReport/ViewReportMorocco').default;
}

const defaultMoroccoProps = {
    user:        { id: 1, full_name: 'Test Admin' },
    usercountry: [],
    // userparams is read from store; supply safe shape to avoid optional-chain crashes
    userparams:  { month: [], year: [], department: [] },
    dispatch:    mockDispatch,
};

function renderViewReportMorocco(props = {}) {
    return render(
        <MemoryRouter>
            <ViewReportMorocco {...defaultMoroccoProps} {...props} />
        </MemoryRouter>
    );
}

describe('ViewReportMorocco — Morocco Payroll Report', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderViewReportMorocco()).not.toThrow();
    });

    test('renders Morocco Payroll Report page title', () => {
        const { getByText } = renderViewReportMorocco();
        expect(getByText(/Morocco Payroll Report/i)).toBeInTheDocument();
    });

    test('renders at least two select inputs (month + year)', () => {
        const { container } = renderViewReportMorocco();
        const selects = container.querySelectorAll('select');
        // month, year, and department selects
        expect(selects.length).toBeGreaterThanOrEqual(2);
    });

    test('renders Filter button', () => {
        const { getByText } = renderViewReportMorocco();
        expect(getByText(/Filter/i)).toBeInTheDocument();
    });

    test('renders Export button', () => {
        const { getByText } = renderViewReportMorocco();
        expect(getByText(/Export/i)).toBeInTheDocument();
    });

    test('dispatches fecthUserContry and fecthMoroccoPayrollParams on mount', () => {
        renderViewReportMorocco();
        expect(mockDispatch).toHaveBeenCalledTimes(2);
    });

    test('empty results state — table body has no data rows', () => {
        const { container } = renderViewReportMorocco();
        const tbody = container.querySelector('tbody');
        expect(tbody).toBeInTheDocument();
        const rows = tbody.querySelectorAll('tr');
        expect(rows.length).toBe(0);
    });

    test('does not crash when userparams is undefined', () => {
        expect(() => renderViewReportMorocco({ userparams: undefined })).not.toThrow();
    });

    test('does not crash with populated month/year/department params', () => {
        expect(() =>
            renderViewReportMorocco({
                userparams: {
                    month:      [{ month_number: 1, month_name: 'January' }],
                    year:       [{ year_name: 2026 }],
                    department: [{ Id: 10, Name: 'Engineering' }],
                },
            })
        ).not.toThrow();
    });

    test('renders Department select when params are supplied', () => {
        const { container } = renderViewReportMorocco({
            userparams: {
                month:      [{ month_number: 6, month_name: 'June' }],
                year:       [{ year_name: 2026 }],
                department: [{ Id: 10, Name: 'Engineering' }],
            },
        });
        const options = container.querySelectorAll('option');
        const deptPlaceholder = Array.from(options).find(
            (o) => o.textContent === '- Select Department -'
        );
        expect(deptPlaceholder).toBeInTheDocument();
    });
});
