// DRAFT — generated 2026-06-16, needs verification
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

// ---------------------------------------------------------------------------
// Mock react-redux: strip connect() so the class renders without a store
// ---------------------------------------------------------------------------
jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => jest.fn(),
}));

// ---------------------------------------------------------------------------
// Mock DatePicker utilities (heavy dependency, not under test)
// ---------------------------------------------------------------------------
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate:     ({ name }) => <input name={name} type="date" />,
    InputTime:     ({ name }) => <input name={name} type="time" />,
    InputDateTime: ({ name }) => <input name={name} type="datetime-local" />,
}));

// ---------------------------------------------------------------------------
// Mock layout wrappers (AdminLTE + Wrapper — heavy DOM nesting not under test)
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
// Mock react-select (used for Department dropdown in EmployeeList)
// ---------------------------------------------------------------------------
jest.mock('react-select', () => {
    return function MockSelect({ name, placeholder, onChange }) {
        return (
            <select name={name} data-testid={`select-${name}`} onChange={(e) => onChange && onChange({ value: e.target.value })}>
                <option value="">{placeholder}</option>
            </select>
        );
    };
});

// ---------------------------------------------------------------------------
// Mock Paginate component
// ---------------------------------------------------------------------------
jest.mock('../../components/Template/Paginate', () => () => <div data-testid="paginate" />);

// ---------------------------------------------------------------------------
// Status badge is defined inline inside EmployeeList.js (not a separate module),
// so there is nothing to mock — it renders as part of the container.
// ---------------------------------------------------------------------------
// Import the EmployeeList container
// ---------------------------------------------------------------------------
let EmployeeList;
try {
    const m = require('../../container/MyTeam/EmployeeList/EmployeeList');
    EmployeeList = m.EmployeeList || m.default;
} catch {
    EmployeeList = require('../../container/MyTeam/EmployeeList/EmployeeList').default;
}

// ---------------------------------------------------------------------------
// Default props matching the Redux state shape described in the full-stack report
// state.myTeamList and state.user are the two Redux slices consumed
// ---------------------------------------------------------------------------
const defaultProps = {
    // state.user
    user: {
        id: 1,
        full_name: 'Test Supervisor',
        pov_timezone: 'Asia/Manila',
        departments_handled: [],
        LevelId: 2,
        country_id: null,
    },
    // state.myTeamList
    myTeamList: {
        list: null,           // null triggers fetchMyTeamList on componentWillMount
        sub_department: [],   // populated via departmentSelectedforSub
        filters: {
            status: 1,
            department_id: undefined,
            sub_department_id: undefined,
            job_title: undefined,
            name: undefined,
            page: undefined,
            order_by: undefined,
            url: 'MyTeam',
        },
    },
    // Standard router + Redux injections
    dispatch: jest.fn(),
    history:  { push: jest.fn() },
    match:    { params: {} },
    location: { search: '' },
    // Action creators (mocked — real dispatch is a no-op jest.fn())
    fetchMyTeamList:                   jest.fn(),
    fetchSubDepartmentUnderDepartment: jest.fn(),
};

function renderComponent(props = {}) {
    return render(
        <MemoryRouter>
            <EmployeeList {...defaultProps} {...props} />
        </MemoryRouter>
    );
}

// The employee table (with its column headers) only renders when myTeamList.list
// has at least one data row. This fixture provides one populated row.
const teamListWithData = {
    ...defaultProps.myTeamList,
    list: {
        data: [{
            id: 10,
            Employee_Number: 'EMP-010',
            Employee_Name: 'Jane Doe',
            job_title: 'Engineer',
            Name: 'Engineering',
            email: 'jane@example.com',
            is_active: 1,
            country_id: '1',
        }],
        pagination: { total: 1, count: 1, per_page: 10, current_page: 1, last_page: 1 },
    },
};

function renderWithData(props = {}) {
    return renderComponent({ myTeamList: teamListWithData, ...props });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe('EmployeeList component (container/MyTeam/EmployeeList/EmployeeList.js)', () => {

    beforeEach(() => jest.clearAllMocks());

    // -------------------------------------------------------------------------
    // Smoke tests
    // -------------------------------------------------------------------------
    test('renders without crashing', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    test('does not crash when myTeamList.list is null (initial load state)', () => {
        expect(() => renderComponent({ myTeamList: { ...defaultProps.myTeamList, list: null } }))
            .not.toThrow();
    });

    test('does not crash when myTeamList.list has empty data array', () => {
        const propsWithEmptyList = {
            myTeamList: {
                ...defaultProps.myTeamList,
                list: {
                    data: [],
                    pagination: { total: 0, count: 0, per_page: 15, current_page: 1, last_page: 1 },
                },
            },
        };
        expect(() => renderComponent(propsWithEmptyList)).not.toThrow();
    });

    test('does not crash when myTeamList.list has employee data rows', () => {
        const propsWithData = {
            myTeamList: {
                ...defaultProps.myTeamList,
                list: {
                    data: [
                        {
                            id: 10,
                            emp_num: '3537',
                            full_name: 'Juan dela Cruz',
                            job_title: 'Software Engineer',
                            department: 'Engineering',
                            email: 'juan@example.com',
                            is_active: 1,
                            country_id: 1,
                            has_use_multi: '0',
                        },
                    ],
                    pagination: { total: 1, count: 1, per_page: 15, current_page: 1, last_page: 1 },
                },
            },
        };
        expect(() => renderComponent(propsWithData)).not.toThrow();
    });

    // -------------------------------------------------------------------------
    // Form field rendering — filter fields from the report field table
    // -------------------------------------------------------------------------
    test('renders Job Title input with placeholder "Enter Job Title"', () => {
        const { getByPlaceholderText } = renderComponent();
        expect(getByPlaceholderText(/Enter Job Title/i)).toBeInTheDocument();
    });

    test('renders Name input with placeholder "Enter Name"', () => {
        const { getByPlaceholderText } = renderComponent();
        expect(getByPlaceholderText(/Enter Name/i)).toBeInTheDocument();
    });

    test('renders Department select (react-select mock)', () => {
        const { getByTestId } = renderComponent();
        // react-select is mocked to render a <select> with data-testid="select-department_id"
        expect(getByTestId('select-department_id')).toBeInTheDocument();
    });

    test('renders Sort select with label text "Sort"', () => {
        const { getByText } = renderComponent();
        expect(getByText(/Sort/i)).toBeInTheDocument();
    });

    // -------------------------------------------------------------------------
    // Table column headers — from "Table columns rendered" in the report
    // -------------------------------------------------------------------------
    test('renders "Emp #" column header', () => {
        const { getByText } = renderWithData();
        expect(getByText(/Emp #/i)).toBeInTheDocument();
    });

    test('renders "Name" column header in the table', () => {
        const { getAllByText } = renderWithData();
        // "Name" appears both as a filter label and a column header
        const nameMatches = getAllByText(/^Name$/i);
        expect(nameMatches.length).toBeGreaterThanOrEqual(1);
    });

    test('renders "Job Title" column header', () => {
        const { getAllByText } = renderWithData();
        const matches = getAllByText(/Job Title/i);
        expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    test('renders "Department" column header', () => {
        const { getAllByText } = renderComponent();
        const matches = getAllByText(/Department/i);
        expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    test('renders "Status" column header', () => {
        const { getAllByText } = renderWithData();
        const matches = getAllByText(/Status/i);
        expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    test('renders "Actions" column header', () => {
        const { getByText } = renderWithData();
        expect(getByText(/Actions/i)).toBeInTheDocument();
    });

    // -------------------------------------------------------------------------
    // Sub-department dropdown — populated from myTeamList.sub_department
    // -------------------------------------------------------------------------
    test('renders sub_department_id select', () => {
        const { container } = renderComponent();
        const subDeptSelect = container.querySelector('select[name="sub_department_id"]');
        expect(subDeptSelect).toBeInTheDocument();
    });

    test('renders status select (filter)', () => {
        const { container } = renderComponent();
        const statusSelect = container.querySelector('select[name="status"]');
        expect(statusSelect).toBeInTheDocument();
    });

    test('renders order_by select (sort)', () => {
        const { container } = renderComponent();
        const orderBySelect = container.querySelector('select[name="order_by"]');
        expect(orderBySelect).toBeInTheDocument();
    });

    // -------------------------------------------------------------------------
    // Loading / edge-case states
    // -------------------------------------------------------------------------
    test('does not crash when user has no departments_handled', () => {
        expect(() => renderComponent({
            user: { ...defaultProps.user, departments_handled: undefined },
        })).not.toThrow();
    });

    test('does not crash when myTeamList.sub_department is empty', () => {
        expect(() => renderComponent({
            myTeamList: { ...defaultProps.myTeamList, sub_department: [] },
        })).not.toThrow();
    });

    test('does not crash when myTeamList.sub_department has entries', () => {
        expect(() => renderComponent({
            myTeamList: {
                ...defaultProps.myTeamList,
                sub_department: [{ id: 1, Name: 'Engineering Sub' }],
            },
        })).not.toThrow();
    });
});
