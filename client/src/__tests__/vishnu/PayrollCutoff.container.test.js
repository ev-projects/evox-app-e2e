// DRAFT — generated 2026-06-16, needs verification
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

// ---------------------------------------------------------------------------
// Redux: replace connect() with a passthrough so the container renders
// without a real store. Module-specific Redux state props are injected via
// defaultProps below.
// ---------------------------------------------------------------------------
jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => jest.fn(),
}));

// ---------------------------------------------------------------------------
// DatePicker components — rendered as plain <input> elements
// ---------------------------------------------------------------------------
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate:     ({ name }) => <input name={name} type="date" />,
    InputTime:     ({ name }) => <input name={name} type="time" />,
    InputDateTime: ({ name }) => <input name={name} type="datetime-local" />,
}));

// ---------------------------------------------------------------------------
// Layout / shell components
// ---------------------------------------------------------------------------
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);

jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader:  ({ children }) => <div>{children}</div>,
    Content:          ({ title, subtitle, children }) => <div>{title && <span>{title}</span>}{subtitle}{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
    Row:              ({ children }) => <div>{children}</div>,
    Col:              ({ children }) => <div>{children}</div>,
}));

// ---------------------------------------------------------------------------
// react-data-table-component — renders a basic stub
// ---------------------------------------------------------------------------
jest.mock('react-data-table-component', () => ({
    __esModule: true,
    default: ({ columns, data, progressPending }) => (
        <div data-testid="data-table">
            {progressPending && <div>Loading...</div>}
            <table>
                <thead>
                    <tr>{columns && columns.map((col, i) => <th key={i}>{col.name}</th>)}</tr>
                </thead>
                <tbody>
                    {data && data.map((row, i) => <tr key={i}><td>{row.name}</td></tr>)}
                </tbody>
            </table>
        </div>
    ),
}));

// ---------------------------------------------------------------------------
// Formik — render children directly (avoids Formik internals in unit tests)
// ---------------------------------------------------------------------------
jest.mock('formik', () => {
    const actual = jest.requireActual('formik');
    return {
        ...actual,
        Formik: ({ children }) => {
            const fakeProps = {
                values:       { method: 'store', id: null, name: '', start_date: null, end_date: null },
                errors:       {},
                touched:      {},
                handleChange: jest.fn(),
                handleBlur:   jest.fn(),
                handleSubmit: jest.fn(),
                setFieldValue: jest.fn(),
                isSubmitting: false,
            };
            return <div>{typeof children === 'function' ? children(fakeProps) : children}</div>;
        },
    };
});

// ---------------------------------------------------------------------------
// react-bootstrap — render minimal HTML equivalents
// ---------------------------------------------------------------------------
jest.mock('react-bootstrap', () => ({
    Form:     Object.assign(
        ({ children }) => <form>{children}</form>,
        {
            Group:    ({ children }) => <div>{children}</div>,
            Label:    ({ children }) => <label>{children}</label>,
            Control:  Object.assign(
                ({ name, placeholder, value, onChange }) => (
                    <input name={name} placeholder={placeholder} value={value || ''} onChange={onChange || (() => {})} />
                ),
                { Feedback: ({ children }) => <div>{children}</div> }
            ),
            Row:      ({ children }) => <div>{children}</div>,
            Feedback: ({ children }) => <div>{children}</div>,
        }
    ),
    Button:        ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
    Col:           ({ children }) => <div>{children}</div>,
    Row:           ({ children }) => <div>{children}</div>,
    InputGroup:    Object.assign(
        ({ children }) => <div>{children}</div>,
        { Prepend: ({ children }) => <div>{children}</div>, Append: ({ children }) => <div>{children}</div> }
    ),
    FormControl:   ({ name, placeholder, value, onChange, variant }) => (
        <input name={name} placeholder={placeholder} value={value || ''} onChange={onChange || (() => {})} />
    ),
    Modal:    Object.assign(
        ({ children, show }) => show ? <div role="dialog">{children}</div> : null,
        {
            Header: ({ children }) => <div>{children}</div>,
            Body:   ({ children }) => <div>{children}</div>,
            Footer: ({ children }) => <div>{children}</div>,
            Title:  ({ children }) => <h4>{children}</h4>,
        }
    ),
}));

// ---------------------------------------------------------------------------
// PayrollCutoff.js imports RequestButtons, RequestSubtitle, PageLoading, Authenticator
// ---------------------------------------------------------------------------
jest.mock('../../components/RequestComponent/RequestButtons/RequestButtons', () => () => <div data-testid="request-buttons" />);
jest.mock('../../components/RequestComponent/RequestButtons/RequestSubtitle', () => () => <div data-testid="request-subtitle" />);
jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading" />);
jest.mock('../../services/Authenticator', () => ({
    scanFeature: jest.fn(() => true),
    scanLevel:   jest.fn(() => true),
}));

// ---------------------------------------------------------------------------
// moment — use the real library (date formatting is tested in PHPUnit layer)
// ---------------------------------------------------------------------------
// No mock needed; moment is a pure JS lib with no side effects in tests.

// ---------------------------------------------------------------------------
// Load the component (handles both named and default exports)
// ---------------------------------------------------------------------------
let PayrollCutoff;
try {
    const m = require('../../container/Admin/PayrollCutoff/PayrollCutoff');
    PayrollCutoff = m.PayrollCutoff || m.default;
} catch {
    PayrollCutoff = require('../../container/Admin/PayrollCutoff/PayrollCutoff').default;
}

let PayrollCutoffForm;
try {
    const m = require('../../container/Admin/PayrollCutoff/PayrollCutoffForm');
    PayrollCutoffForm = m.PayrollCutoffForm || m.default;
} catch {
    PayrollCutoffForm = require('../../container/Admin/PayrollCutoff/PayrollCutoffForm').default;
}

// ---------------------------------------------------------------------------
// Default props — match Redux state keys from payrollCutoffReducers.js
// and the props injected by connect() in the container
// ---------------------------------------------------------------------------
const defaultProps = {
    user:                    { id: 1, full_name: 'Test Employee', pov_timezone: 'Asia/Manila' },
    dispatch:                jest.fn(),
    history:                 { push: jest.fn() },
    match:                   { params: {} },
    location:                { search: '' },
    // Redux slice: payrollCutoff
    listInstance:            [],
    isListInstanceLoaded:    false,
    instance:                {},
    isInstanceLoaded:        false,
    // Dispatch-mapped action props
    clearPayrollCutoffListInstance: jest.fn(),
    fetchPayrollCutoffs:            jest.fn(),
    fetchPayrollCutoffList:         jest.fn(),
    fetchPayrollCutoff:             jest.fn(),
    clearPayrollCutoffInstance:     jest.fn(),
    deletePayrollCutoff:            jest.fn(),
    setRedirect:                    jest.fn(),
};

const defaultFormProps = {
    ...defaultProps,
    method:      'store',
    hideForm:    jest.fn(),
    instance:    {},
    isInstanceLoaded: false,
};

function renderComponent(props = {}) {
    return render(
        <MemoryRouter>
            <PayrollCutoff {...defaultProps} {...props} />
        </MemoryRouter>
    );
}

function renderForm(props = {}) {
    return render(
        <MemoryRouter>
            <PayrollCutoffForm {...defaultFormProps} {...props} />
        </MemoryRouter>
    );
}

// ---------------------------------------------------------------------------
// Tests — PayrollCutoff list container
// ---------------------------------------------------------------------------
describe('PayrollCutoff list container', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    test('renders "Payroll Cut-Off" heading text', () => {
        const { getByText } = renderComponent();
        // The page shell renders "Payroll Cut-Off" as the ContainerHeader title
        expect(getByText(/Payroll Cut-Off/i)).toBeInTheDocument();
    });

    test('renders Add button', () => {
        const { getByText } = renderComponent();
        expect(getByText(/Add/i)).toBeInTheDocument();
    });

    test('renders DataTable with expected column headers', () => {
        const { getByText } = renderComponent();
        // DataTable columns from the report: ID, Name, Start Date, End Date, Actions
        expect(getByText(/Name/i)).toBeInTheDocument();
        expect(getByText(/Start Date/i)).toBeInTheDocument();
        expect(getByText(/End Date/i)).toBeInTheDocument();
    });

    test('does not crash during loading state (listInstance is null)', () => {
        expect(() => renderComponent({ listInstance: null, isListInstanceLoaded: false })).not.toThrow();
    });

    test('does not crash with populated listInstance', () => {
        const listInstance = [
            { id: 1, name: 'Jan 2031', start_date: '2031-01-01', end_date: '2031-01-31' },
            { id: 2, name: 'Feb 2031', start_date: '2031-02-01', end_date: '2031-02-28' },
        ];
        expect(() => renderComponent({ listInstance, isListInstanceLoaded: true })).not.toThrow();
    });

    test('does not crash with empty list (no rows)', () => {
        expect(() => renderComponent({ listInstance: [], isListInstanceLoaded: true })).not.toThrow();
    });
});

// ---------------------------------------------------------------------------
// Tests — PayrollCutoffForm inline form
// ---------------------------------------------------------------------------
describe('PayrollCutoffForm inline form', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing in store mode', () => {
        expect(() => renderForm({ method: 'store' })).not.toThrow();
    });

    test('renders without crashing in update mode', () => {
        const instance = {
            id: 1, name: 'Test Cutoff', start_date: '2031-01-01', end_date: '2031-01-31',
        };
        expect(() => renderForm({ method: 'update', instance, isInstanceLoaded: true })).not.toThrow();
    });

    test('renders Name label', () => {
        const { getByText } = renderForm();
        expect(getByText(/Name/i)).toBeInTheDocument();
    });

    test('renders Start Date label', () => {
        const { getByText } = renderForm();
        expect(getByText(/Start Date/i)).toBeInTheDocument();
    });

    test('renders End Date label', () => {
        const { getByText } = renderForm();
        expect(getByText(/End Date/i)).toBeInTheDocument();
    });

    test('renders Name input with placeholder "Name"', () => {
        const { getByPlaceholderText } = renderForm();
        // FormControl for name uses placeholder="Name" per the report field table
        expect(getByPlaceholderText(/^Name$/i)).toBeInTheDocument();
    });

    test('renders start_date date input', () => {
        const { container } = renderForm();
        // InputDate is mocked to render <input name="start_date" type="date" />
        const input = container.querySelector('input[name="start_date"]');
        expect(input).toBeInTheDocument();
    });

    test('renders end_date date input', () => {
        const { container } = renderForm();
        const input = container.querySelector('input[name="end_date"]');
        expect(input).toBeInTheDocument();
    });

    test('renders Submit button', () => {
        const { getByText } = renderForm();
        expect(getByText(/Submit/i)).toBeInTheDocument();
    });

    test('renders Cancel button', () => {
        const { getByText } = renderForm();
        expect(getByText(/Cancel/i)).toBeInTheDocument();
    });

    test('does not crash when instance is empty object (waiting for Redux)', () => {
        expect(() => renderForm({ instance: {}, isInstanceLoaded: false })).not.toThrow();
    });

    test('does not crash when isInstanceLoaded transitions to true with valid instance', () => {
        const instance = {
            id: 5, name: 'Q1 Cutoff', start_date: '2031-01-01', end_date: '2031-03-31',
        };
        expect(() => renderForm({ instance, isInstanceLoaded: true })).not.toThrow();
    });
});
