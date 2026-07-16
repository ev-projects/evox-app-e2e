// DRAFT — generated 2026-06-17, needs verification
/**
 * EVOX Jest P0: AssignSubDepartment Container Tests
 * Source: src/container/Admin/AssignSubDepartment/AssignSubDepartment.js
 * Business case: Admin assigns or removes a supervisor's responsibility over
 * a sub-department (Team Head Allocation page).
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => jest.fn(),
}));

jest.mock('react-bootstrap', () => ({
    Form: Object.assign(
        ({ children }) => <form>{children}</form>,
        {
            Group: ({ children }) => <div>{children}</div>,
            Control: Object.assign(
                (props) => <input {...props} />,
                { Feedback: ({ children }) => <div>{children}</div> }
            ),
        }
    ),
    Button:      ({ children, onClick, type }) => <button type={type} onClick={onClick}>{children}</button>,
    InputGroup:  ({ children }) => <div>{children}</div>,
    FormControl: (props) => <input {...props} />,
}));

jest.mock('react-multi-select-component', () => ({
    __esModule: true,
    default: ({ options, value, onChange, labelledBy }) => (
        <div data-testid="multi-select" aria-label={labelledBy}>
            {options && options.map((o) => (
                <span key={o.value}>{o.label}</span>
            ))}
        </div>
    ),
}));

jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/Template/Wrapper/index.js', () => ({ children }) => <div>{children}</div>);

jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader:  ({ children }) => <div>{children}</div>,
    Content:          ({ children, title }) => <div>{title}{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
    Row:              ({ children }) => <div>{children}</div>,
    Col:              ({ children }) => <div>{children}</div>,
}));

jest.mock('formik', () => ({
    ...jest.requireActual('formik'),
    Formik: ({ children, initialValues }) => {
        const fakeFormik = {
            values: initialValues || {},
            errors: {},
            touched: {},
            handleSubmit: jest.fn(),
            handleChange: jest.fn(),
            setFieldValue: jest.fn(),
            isSubmitting: false,
        };
        return <div>{typeof children === 'function' ? children(fakeFormik) : children}</div>;
    },
    ErrorMessage: () => null,
    getIn: jest.fn(),
}));

jest.mock('../../container/PageLoading/index.js', () => () => <div>Loading...</div>);
jest.mock('../../container/PageLoading', () => () => <div>Loading...</div>);

jest.mock('../../services/Validator.js', () => ({
    isValid: jest.fn((v) => v != null && v !== '' && v !== undefined),
}));

jest.mock('../../services/DateFormatter.js', () => ({
    formatDate: jest.fn((d) => d),
}));

let AssignSubDepartment;
try {
    const m = require('../../container/Admin/AssignSubDepartment/AssignSubDepartment');
    AssignSubDepartment = m.AssignSubDepartment || m.default;
} catch {
    AssignSubDepartment = require('../../container/Admin/AssignSubDepartment/AssignSubDepartment').default;
}

const defaultProps = {
    user: {
        id: 1,
        full_name: 'Admin User',
        departments_handled: [{ id: 1, department_name: 'Engineering' }],
    },
    supervisor: [
        {
            id: 10,
            full_name: 'Supervisor One',
            departments_handled: [{ id: 1, department_name: 'Engineering' }],
        },
    ],
    department:             [],
    department_users:       [],
    myTeamList:             {},
    sub_departments_handled: [],
    sub_departments_list:    [{ id: 'SD1', Name: 'Sub Dept Alpha' }],
    dispatch:               jest.fn(),
    fetchUserList:                  jest.fn(),
    fetchDepartmentList:            jest.fn(),
    fetchAllSubDepartment:          jest.fn(),
    assignSubDepartment:            jest.fn(),
    fetchSubDepartmentHandledList:  jest.fn(),
    history:  { push: jest.fn() },
    match:    { params: {} },
    location: { search: '' },
};

function renderComponent(props = {}) {
    return render(
        <MemoryRouter>
            <AssignSubDepartment {...defaultProps} {...props} />
        </MemoryRouter>
    );
}

describe('AssignSubDepartment component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    test('renders Team Head Allocation heading', () => {
        const { getByText } = renderComponent();
        expect(getByText(/Team Head Allocation/i)).toBeInTheDocument();
    });

    test('renders Supervisors label', () => {
        const { getByText } = renderComponent();
        expect(getByText(/Supervisors/i)).toBeInTheDocument();
    });

    test('renders supervisor select dropdown', () => {
        const { container } = renderComponent();
        const select = container.querySelector('select[name="supervisor_id"]');
        expect(select).toBeInTheDocument();
    });

    test('does not crash when supervisor list is undefined (shows PageLoading)', () => {
        expect(() => renderComponent({ supervisor: undefined })).not.toThrow();
    });

    test('does not crash when supervisor list is empty', () => {
        expect(() => renderComponent({ supervisor: [] })).not.toThrow();
    });

    test('does not crash when sub_departments_list is empty', () => {
        expect(() => renderComponent({ sub_departments_list: [] })).not.toThrow();
    });
});
