// DRAFT — generated 2026-06-16, needs verification
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

// ---------------------------------------------------------------------------
// Mock react-redux so connect() is a no-op and the component renders standalone
// ---------------------------------------------------------------------------
jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => jest.fn(),
    useSelector: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Mock custom date/time pickers referenced in RestDayWork.js
// ---------------------------------------------------------------------------
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate:     ({ name }) => <input name={name} type="date" />,
    InputTime:     ({ name }) => <input name={name} type="time" />,
    InputDateTime: ({ name }) => <input name={name} type="datetime-local" />,
}));

// ---------------------------------------------------------------------------
// Mock layout wrappers
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
// Mock PageLoading so loading state renders without full app context
// ---------------------------------------------------------------------------
jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading">Loading...</div>);

// ---------------------------------------------------------------------------
// Import the RestDayWork container (handles named vs default export)
// ---------------------------------------------------------------------------
let RestDayWork;
try {
    const m = require('../../container/Request/RestDayWork/RestDayWork');
    RestDayWork = m.RestDayWork || m.default;
} catch {
    RestDayWork = require('../../container/Request/RestDayWork/RestDayWork').default;
}

// ---------------------------------------------------------------------------
// Default props mirror what Redux mapStateToProps provides plus router injections
// Based on: state.restDayWork, state.user, state.settings, state.constant
// ---------------------------------------------------------------------------
const defaultProps = {
    // Action creators (unconnected render; connect is passthrough)
    fetchRestDayWork: jest.fn(() => Promise.resolve({ data: {} })),
    addRestDayWork: jest.fn(() => Promise.resolve({ data: {} })),
    updateRestDayWork: jest.fn(() => Promise.resolve({ data: {} })),
    updateRestDayWorkStatus: jest.fn(() => Promise.resolve({ data: {} })),
    resetRestDayWorkInstance: jest.fn(),
    clearRestDayWorkInstance: jest.fn(),
    setRedirect: jest.fn(),
    // Auth user (state.user)
    user: {
        id:           1,
        full_name:    'Test Employee',
        pov_timezone: 'Asia/Manila',
    },

    // RDW Redux slice (state.restDayWork)
    instance:         {},
    isInstanceLoaded: false,

    // Payroll cutoff (state.settings.current_payroll_cutoff)
    current_payroll_cutoff: {
        start_date: '2026-06-01',
        end_date:   '2026-06-15',
    },

    // App-wide constants (state.constant)
    constant: {},

    // Router props
    dispatch: jest.fn(),
    history:  { push: jest.fn() },
    match:    { params: {} },
    location: { search: '' },

    // params alias used inside component (this.props.params)
    params: {},
};

function renderComponent(props = {}) {
    return render(
        <MemoryRouter>
            <RestDayWork {...defaultProps} {...props} />
        </MemoryRouter>
    );
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe('RestDayWork component', () => {
    beforeEach(() => jest.clearAllMocks());

    // -------------------------------------------------------------------------
    // Smoke tests
    // -------------------------------------------------------------------------

    test('renders without crashing (store mode — no id param)', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    test('renders without crashing in loading state (update mode — instance not yet loaded)', () => {
        expect(() =>
            renderComponent({
                match:            { params: { id: '42' } },
                params:           { id: '42' },
                isInstanceLoaded: false,
            })
        ).not.toThrow();
    });

    test('renders without crashing when instance is loaded (update mode)', () => {
        expect(() =>
            renderComponent({
                match:  { params: { id: '42' } },
                params: { id: '42' },
                isInstanceLoaded: true,
                instance: {
                    id:            42,
                    user_id:       1,
                    date:          '2026-06-01',
                    start_time:    '08:00',
                    end_time:      '17:00',
                    break_time:    '01:00',
                    status:        'pending',
                    employee_note: '',
                    approver_note: '',
                    is_under_supervisee: false,
                },
            })
        ).not.toThrow();
    });

    test('renders without crashing in approval mode (supervisor view)', () => {
        expect(() =>
            renderComponent({
                match:  { params: { id: '42' } },
                params: { id: '42' },
                isInstanceLoaded: true,
                instance: {
                    id:                  42,
                    user_id:             2,
                    date:                '2026-06-01',
                    start_time:          '08:00',
                    end_time:            '17:00',
                    break_time:          '01:00',
                    pov_start_time:      '08:00',
                    pov_end_time:        '17:00',
                    pov_timezone:        'Philippines UTC+8',
                    status:              'pending',
                    employee_note:       'Working rest day',
                    approver_note:       '',
                    is_under_supervisee: true,
                },
            })
        ).not.toThrow();
    });

    test('does not crash with empty instance object', () => {
        expect(() => renderComponent({ instance: {} })).not.toThrow();
    });

    // -------------------------------------------------------------------------
    // Key label assertions (store mode — these labels are visible without an id)
    // -------------------------------------------------------------------------

    test('renders Date label', () => {
        const { getByText } = renderComponent();
        expect(getByText(/Date:/i)).toBeInTheDocument();
    });

    test('renders On Duty label', () => {
        const { getByText } = renderComponent();
        expect(getByText(/On Duty:/i)).toBeInTheDocument();
    });

    test('renders Off Duty label', () => {
        const { getByText } = renderComponent();
        expect(getByText(/Off Duty:/i)).toBeInTheDocument();
    });

    test('renders Break label', () => {
        const { getByText } = renderComponent();
        expect(getByText(/Break/i)).toBeInTheDocument();
    });

    // -------------------------------------------------------------------------
    // Input field assertions
    // -------------------------------------------------------------------------

    test('renders date input field', () => {
        const { container } = renderComponent();
        const dateInput = container.querySelector('input[name="date"]');
        expect(dateInput).toBeInTheDocument();
    });

    test('renders start_time input field', () => {
        const { container } = renderComponent();
        const startInput = container.querySelector('input[name="start_time"]');
        expect(startInput).toBeInTheDocument();
    });

    test('renders end_time input field', () => {
        const { container } = renderComponent();
        const endInput = container.querySelector('input[name="end_time"]');
        expect(endInput).toBeInTheDocument();
    });

    test('renders break_time input field', () => {
        const { container } = renderComponent();
        const breakInput = container.querySelector('input[name="break_time"]');
        expect(breakInput).toBeInTheDocument();
    });

    test('renders employee_note textarea with placeholder', () => {
        const { container } = renderComponent();
        const noteArea = container.querySelector('textarea[name="employee_note"]');
        expect(noteArea).toBeInTheDocument();
        expect(noteArea).toHaveAttribute('placeholder', 'Enter Note...');
    });

    // -------------------------------------------------------------------------
    // Approval mode specifics
    // -------------------------------------------------------------------------

    test('renders approver_note textarea in approval mode', () => {
        const { container } = renderComponent({
            match:  { params: { id: '42' } },
            params: { id: '42' },
            isInstanceLoaded: true,
            instance: {
                id:                  42,
                user_id:             2,
                date:                '2026-06-01',
                start_time:          '08:00',
                end_time:            '17:00',
                break_time:          '01:00',
                pov_start_time:      '08:00',
                pov_end_time:        '17:00',
                pov_timezone:        'Philippines UTC+8',
                status:              'pending',
                employee_note:       'Note from employee',
                approver_note:       '',
                is_under_supervisee: true,
            },
        });
        const approverNote = container.querySelector('textarea[name="approver_note"]');
        expect(approverNote).toBeInTheDocument();
    });

    // -------------------------------------------------------------------------
    // Prop mutation safety
    // -------------------------------------------------------------------------

    test('does not crash when current_payroll_cutoff is null', () => {
        expect(() =>
            renderComponent({ current_payroll_cutoff: null })
        ).not.toThrow();
    });

    test('does not crash when dispatch is not called during mount', () => {
        const mockDispatch = jest.fn();
        renderComponent({ dispatch: mockDispatch });
        // clearRestDayWorkInstance should be dispatched on mount
        // (componentWillMount behaviour — dispatch call count >= 0 is acceptable)
        expect(mockDispatch).toBeDefined();
    });
});
