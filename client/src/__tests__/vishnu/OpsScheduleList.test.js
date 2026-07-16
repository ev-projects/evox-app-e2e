// DRAFT — generated 2026-06-18, needs verification
/**
 * EVOX Jest P0: OpsScheduleList Container Tests
 * Source: src/container/OpsSchedule/OpsScheduleList/OpsScheduleList.js
 * Business case: Operations department schedule list. Admin/HR can view,
 * filter by OPS department, and delete schedules. Supervisors navigate here
 * from the sidebar to manage EV Support Team schedule images.
 * Route: /app/ops/ManageOpsSchedulesList/
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
// react-bootstrap: passthrough stubs
// ---------------------------------------------------------------------------
jest.mock('react-bootstrap', () => ({
    Container:    ({ children }) => <div>{children}</div>,
    Col:          ({ children }) => <div>{children}</div>,
    Row:          ({ children }) => <div>{children}</div>,
    Tabs:         ({ children }) => <div>{children}</div>,
    Tab:          ({ children }) => <div>{children}</div>,
    Badge:        ({ children }) => <span>{children}</span>,
    Table:        ({ children }) => <table>{children}</table>,
    Button:       ({ children, onClick, id }) => <button onClick={onClick} id={id}>{children}</button>,
    Pagination:   ({ children }) => <div>{children}</div>,
    FormControl:  (props) => <input {...props} />,
    ToggleButton: ({ children }) => <button>{children}</button>,
    ButtonGroup:  ({ children }) => <div>{children}</div>,
    Dropdown:     Object.assign(
        ({ children }) => <div>{children}</div>,
        {
            Toggle: ({ children }) => <button>{children}</button>,
            Menu:   ({ children }) => <div>{children}</div>,
            Item:   ({ children }) => <div>{children}</div>,
        }
    ),
    Form: Object.assign(
        ({ children }) => <form>{children}</form>,
        {
            Group:   ({ children }) => <div>{children}</div>,
            Control: Object.assign(
                (props) => <input {...props} />,
                { Feedback: ({ children }) => <div>{children}</div> }
            ),
        }
    ),
}));

// ---------------------------------------------------------------------------
// react-datepicker: stub
// ---------------------------------------------------------------------------
jest.mock('react-datepicker', () => () => <input type="date" />);

// ---------------------------------------------------------------------------
// Formik: inject fake bag so render-prop children work
// ---------------------------------------------------------------------------
jest.mock('formik', () => ({
    ...jest.requireActual('formik'),
    Formik: ({ children, initialValues }) => {
        const bag = {
            values:       initialValues || { id: null },
            errors:       {},
            touched:      {},
            handleSubmit: jest.fn((e) => e && e.preventDefault && e.preventDefault()),
            handleChange: jest.fn(),
            handleReset:  jest.fn(),
            setFieldValue: jest.fn(),
            isSubmitting: false,
        };
        return <div>{typeof children === 'function' ? children(bag) : children}</div>;
    },
    FieldArray:   ({ render: renderFn }) => (renderFn ? renderFn({}) : null),
    Field:        ({ name, type, placeholder }) => <input name={name} type={type || 'text'} placeholder={placeholder} />,
    ErrorMessage: () => null,
    getIn:        jest.fn(),
}));

// ---------------------------------------------------------------------------
// Layout / template wrappers
// ---------------------------------------------------------------------------
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate: ({ name }) => <input name={name} type="date" />,
    InputTime: ({ name }) => <input name={name} type="time" />,
}));
jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader:  ({ children }) => <div>{children}</div>,
    Content:          ({ title, subtitle, children }) => (
        <div>{title && <span>{title}</span>}{subtitle}{children}</div>
    ),
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
}));

// ---------------------------------------------------------------------------
// Authenticator: stub feature checks
// ---------------------------------------------------------------------------
jest.mock('../../services/Authenticator.js', () => ({
    scanFeature: jest.fn(() => true),
    scanLevel:   jest.fn(() => false),
    isLoggedIn:  () => true,
}));

// ---------------------------------------------------------------------------
// global.links: navigation targets used in the component
// ---------------------------------------------------------------------------
global.links = {
    ops_schedule_form: '/app/ops/ManageOpsSchedules/',
    ops_schedule_list: '/app/ops/ManageOpsSchedulesList/',
    dashboard:         '/app/Dashboard',
};

// ---------------------------------------------------------------------------
// Action mocks
// ---------------------------------------------------------------------------
const mockFetchOpsSchedulesList = jest.fn();
const mockDeleteOpsSchedule     = jest.fn();

// ---------------------------------------------------------------------------
// Default props
// ---------------------------------------------------------------------------
const defaultProps = {
    user:     { id: 1 },
    constant: { OPS_DEPTS: [] },
    opsScheduleList: {
        isListInstanceLoaded: false,
        listInstance:         [],
    },
    settings:              {},
    fetchOpsSchedulesList: mockFetchOpsSchedulesList,
    deleteOpsSchedule:     mockDeleteOpsSchedule,
    dispatch:  jest.fn(),
    history:   { push: jest.fn() },
    match:     { params: {} },
    location:  { search: '' },
};

// ---------------------------------------------------------------------------
// Component loader
// ---------------------------------------------------------------------------
let OpsScheduleList;
try {
    const m = require('../../container/OpsSchedule/OpsScheduleList/OpsScheduleList');
    OpsScheduleList = m.OpsScheduleList || m.default;
} catch {
    OpsScheduleList = require('../../container/OpsSchedule/OpsScheduleList/OpsScheduleList').default;
}

function renderComponent(props = {}) {
    return render(
        <MemoryRouter>
            <OpsScheduleList
                {...defaultProps}
                {...props}
                opsScheduleList={{ ...defaultProps.opsScheduleList, ...(props.opsScheduleList || {}) }}
                constant={{ ...defaultProps.constant, ...(props.constant || {}) }}
            />
        </MemoryRouter>
    );
}

// ===========================================================================
// TEST SUITE
// ===========================================================================
describe('OpsScheduleList container', () => {
    beforeEach(() => jest.clearAllMocks());

    // -------------------------------------------------------------------------
    // Smoke / crash-free
    // -------------------------------------------------------------------------
    test('renders without crashing', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    test('renders "OPS Schedule List" heading', () => {
        const { getByText } = renderComponent();
        expect(getByText(/OPS Schedule List/i)).toBeInTheDocument();
    });

    // -------------------------------------------------------------------------
    // Filter controls
    // -------------------------------------------------------------------------
    test('renders department_id select', () => {
        const { container } = renderComponent();
        expect(container.querySelector('select[name="department_id"]')).toBeInTheDocument();
    });

    test('renders Filter button', () => {
        const { getByText } = renderComponent();
        expect(getByText(/Filter/i)).toBeInTheDocument();
    });

    test('renders Add OPS Schedule button', () => {
        const { getByText } = renderComponent();
        expect(getByText(/Add OPS Schedule/i)).toBeInTheDocument();
    });

    // -------------------------------------------------------------------------
    // Mount behaviour
    // -------------------------------------------------------------------------
    test('calls fetchOpsSchedulesList on mount', () => {
        renderComponent();
        expect(mockFetchOpsSchedulesList).toHaveBeenCalledTimes(1);
    });

    // -------------------------------------------------------------------------
    // Empty / loading state
    // -------------------------------------------------------------------------
    test('shows "Sorry, no record found" when isListInstanceLoaded is false', () => {
        const { getByText } = renderComponent({
            opsScheduleList: { isListInstanceLoaded: false, listInstance: [] },
        });
        expect(getByText(/Sorry, no record found/i)).toBeInTheDocument();
    });

    test('does not show no-record message when list is loaded with data', () => {
        const { queryByText } = renderComponent({
            opsScheduleList: {
                isListInstanceLoaded: true,
                listInstance: [{ id: 1, department: 'Operations PH', path: null, scope: [] }],
            },
        });
        expect(queryByText(/Sorry, no record found/i)).not.toBeInTheDocument();
    });

    // -------------------------------------------------------------------------
    // Department dropdown options
    // -------------------------------------------------------------------------
    test('populates department select with OPS_DEPTS options', () => {
        const { container } = renderComponent({
            constant: {
                OPS_DEPTS: [
                    { id: 1, name: 'Operations PH' },
                    { id: 2, name: 'Operations IN' },
                ],
            },
        });
        const select = container.querySelector('select[name="department_id"]');
        // blank option + 2 department options
        expect(select.options.length).toBeGreaterThanOrEqual(2);
    });

    // -------------------------------------------------------------------------
    // Resilience
    // -------------------------------------------------------------------------
    test('does not crash when listInstance is empty and list is loaded', () => {
        expect(() => renderComponent({
            opsScheduleList: { isListInstanceLoaded: true, listInstance: [] },
        })).not.toThrow();
    });

    test('does not crash when listInstance has multiple rows', () => {
        expect(() => renderComponent({
            opsScheduleList: {
                isListInstanceLoaded: true,
                listInstance: [
                    { id: 1, department: 'Operations PH', path: null, scope: [] },
                    { id: 2, department: 'Operations IN', path: '/images/ops-in.png', scope: ['Remote'] },
                ],
            },
        })).not.toThrow();
    });

    test('does not crash when constant.OPS_DEPTS is undefined', () => {
        expect(() => renderComponent({
            constant: {},
        })).not.toThrow();
    });
});
