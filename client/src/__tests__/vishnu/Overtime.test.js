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
// DatePicker / InputTime stubs (used for date and amount fields)
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
// RequestButtons stubs (approval/decline/cancel buttons)
// ---------------------------------------------------------------------------
jest.mock('../../components/RequestComponent/RequestButtons/RequestButtons', () => () => <div />);
jest.mock('../../components/RequestComponent/RequestButtons/RequestSubtitle', () => () => <div />);

// ---------------------------------------------------------------------------
// PageLoading stub (shown when isInstanceLoaded === false)
// ---------------------------------------------------------------------------
jest.mock('../../container/PageLoading', () => () => <div>Loading...</div>);

// ---------------------------------------------------------------------------
// Formik stub — renders children and form elements
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
// Import the Overtime component
// ---------------------------------------------------------------------------
let OvertimeComponent;
try {
    const m = require('../../container/Request/Overtime/Overtime');
    OvertimeComponent = m.Overtime || m.default;
} catch {
    OvertimeComponent = require('../../container/Request/Overtime/Overtime').default;
}

// ---------------------------------------------------------------------------
// Default props reflecting Redux state props from the full-stack report:
// state.overtime.instance, isInstanceLoaded, state.user, state.constant,
// state.settings.current_payroll_cutoff
// ---------------------------------------------------------------------------
const defaultProps = {
    user: {
        id: 1,
        full_name: 'Test Employee',
        pov_timezone: 'Asia/Manila',
    },
    dispatch: jest.fn(),
    history:  { push: jest.fn() },
    match:    { params: {} },
    params:   {},
    location: { search: '' },

    // overtime Redux slice
    instance:         {},
    isInstanceLoaded: false,

    // constants Redux slice (OVERTIME_TYPE enum)
    constant: {
        OVERTIME_TYPE: {
            pre_overtime:  'pre_overtime',
            post_overtime: 'post_overtime',
        },
    },

    // settings payroll cutoff
    settings: {
        current_payroll_cutoff: {
            start_date: '2026-06-01',
            end_date:   '2026-06-15',
        },
    },

    // action creators (mapped from overtimeActions)
    fetchOvertime:         jest.fn(),
    addOvertime:           jest.fn(),
    updateOvertime:        jest.fn(),
    updateOvertimeStatus:  jest.fn(),
    clearOvertimeInstance: jest.fn(),
    resetOvertimeInstance: jest.fn(),
};

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function renderComponent(props = {}) {
    return render(
        <MemoryRouter>
            <OvertimeComponent {...defaultProps} {...props} />
        </MemoryRouter>
    );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('Overtime component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing (store mode — no id in params)', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    test('renders without crashing when isInstanceLoaded is false (loading state)', () => {
        expect(() => renderComponent({ isInstanceLoaded: false, instance: {} })).not.toThrow();
    });

    test('renders without crashing when isInstanceLoaded is true (form mode)', () => {
        expect(() =>
            renderComponent({
                isInstanceLoaded: true,
                instance: {
                    id:            42,
                    date:          '2026-06-10',
                    amount:        '01:30',
                    type:          'pre_overtime',
                    employee_note: 'Working late',
                    approver_note: '',
                    status:        'pending',
                    is_under_supervisee: false,
                },
                params: { id: '42' },
            })
        ).not.toThrow();
    });

    test('does not crash with empty constant (OVERTIME_TYPE not loaded yet)', () => {
        expect(() =>
            renderComponent({ constant: {} })
        ).not.toThrow();
    });

    test('does not crash with null OVERTIME_TYPE', () => {
        expect(() =>
            renderComponent({ constant: { OVERTIME_TYPE: null } })
        ).not.toThrow();
    });

    test('does not crash in approval mode (is_under_supervisee = true)', () => {
        expect(() =>
            renderComponent({
                isInstanceLoaded: true,
                instance: {
                    id:                  55,
                    date:                '2026-06-10',
                    amount:              '02:00',
                    type:                'post_overtime',
                    employee_note:       'Need OT approval',
                    approver_note:       '',
                    status:              'pending',
                    is_under_supervisee: true,
                    user_id:             2,
                    employee_name:       'Another Employee',
                },
                params: { id: '55' },
            })
        ).not.toThrow();
    });

    test('clearOvertimeInstance is called on component mount (store mode)', () => {
        renderComponent();
        expect(defaultProps.clearOvertimeInstance).toHaveBeenCalled();
    });

    test('clearOvertimeInstance is called on component mount (view mode)', () => {
        renderComponent({ params: { id: '10' } });
        expect(defaultProps.clearOvertimeInstance).toHaveBeenCalled();
    });

    test('fetchOvertime is called when id param is present', () => {
        renderComponent({ params: { id: '10' } });
        expect(defaultProps.fetchOvertime).toHaveBeenCalledWith('10');
    });

    test('fetchOvertime is NOT called when no id param (store mode)', () => {
        renderComponent({ params: {} });
        expect(defaultProps.fetchOvertime).not.toHaveBeenCalled();
    });

    test('renders Date label', () => {
        const { getByText } = renderComponent();
        expect(getByText(/Date:/i)).toBeInTheDocument();
    });

    test('renders Amount(Hours) label', () => {
        const { getByText } = renderComponent();
        expect(getByText(/Amount/i)).toBeInTheDocument();
    });

    test('renders Type label', () => {
        const { getByText } = renderComponent();
        expect(getByText(/Type:/i)).toBeInTheDocument();
    });

    test('renders Enter Note label or placeholder', () => {
        const { container } = renderComponent();
        const noteArea = container.querySelector('textarea[name="employee_note"]');
        // textarea may be rendered; placeholder is "Enter Note..."
        if (noteArea) {
            expect(noteArea.placeholder).toMatch(/Enter Note/i);
        } else {
            // label text fallback
            expect(container.textContent).toMatch(/Enter Note|Employee Note/i);
        }
    });

    test('renders amount input (time field)', () => {
        const { container } = renderComponent({
            isInstanceLoaded: true,
            instance: {
                id: 1, date: '2026-06-01', amount: '01:00',
                type: 'pre_overtime', employee_note: '', approver_note: '',
                status: 'pending', is_under_supervisee: false,
            },
            params: { id: '1' },
        });
        const timeInput = container.querySelector('input[name="amount"]');
        expect(timeInput).not.toBeNull();
    });

    test('renders date input', () => {
        const { container } = renderComponent({
            isInstanceLoaded: true,
            instance: {
                id: 1, date: '2026-06-01', amount: '01:00',
                type: 'pre_overtime', employee_note: '', approver_note: '',
                status: 'pending', is_under_supervisee: false,
            },
            params: { id: '1' },
        });
        const dateInput = container.querySelector('input[name="date"]');
        expect(dateInput).not.toBeNull();
    });

    test('does not crash with empty instance object', () => {
        expect(() => renderComponent({ instance: {} })).not.toThrow();
    });
});
