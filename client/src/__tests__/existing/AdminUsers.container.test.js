// DRAFT — generated 2026-06-16, needs verification
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => jest.fn(),
    useSelector: (selector) => selector({}),
}));

jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate:     ({ name }) => <input name={name} type="date" />,
    InputTime:     ({ name }) => <input name={name} type="time" />,
    InputDateTime: ({ name }) => <input name={name} type="datetime-local" />,
}));

jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);

jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader:  ({ children }) => <div>{children}</div>,
    Content:          ({ children }) => <div>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
    Row:              ({ children }) => <div>{children}</div>,
    Col:              ({ children }) => <div>{children}</div>,
}));

// Mock react-multi-select-component used for roles, departments_handled, supervisor/client lists.
// __esModule: true + default are required so Babel's default-import interop resolves the
// component correctly. Without them, `import MultiSelect from "react-multi-select-component"`
// receives the whole module object instead of the function, causing "got: object" render errors.
jest.mock('react-multi-select-component', () => {
    const MockMultiSelect = ({ labelledBy }) => <div aria-label={labelledBy}>MultiSelect</div>;
    return {
        __esModule: true,
        default: MockMultiSelect,
        MultiSelect: MockMultiSelect,
    };
});

// Mock Formik Field to render a simple input so checkbox/select fields render
jest.mock('formik', () => {
    const actual = jest.requireActual('formik');
    return {
        ...actual,
        Field: ({ name, type, placeholder, children }) => {
            if (typeof children === 'function') {
                return children({ field: { name: name || '', value: '', onChange: jest.fn(), onBlur: jest.fn() }, form: {}, meta: {} });
            }
            return <input name={name} type={type || 'text'} placeholder={placeholder || ''} />;
        },
        ErrorMessage: ({ name }) => <span data-field={name} />,
        Formik: ({ children, initialValues, onSubmit }) => (
            <div>{typeof children === 'function' ? children({ values: initialValues, errors: {}, touched: {}, handleChange: jest.fn(), handleBlur: jest.fn(), handleSubmit: jest.fn() }) : children}</div>
        ),
        Form: ({ children }) => <form>{children}</form>,
    };
});

// -------------------------------------------------------
// RegisterUser component
// -------------------------------------------------------
let RegisterUser;
try {
    const m = require('../../container/Admin/RegisterUser/RegisterUser');
    RegisterUser = m.RegisterUser || m.default;
} catch (e) {
    RegisterUser = require('../../container/Admin/RegisterUser/RegisterUser').default;
}

const registerUserDefaultProps = {
    user:            { id: 1, full_name: 'Test Admin', pov_timezone: 'Asia/Manila' },
    dispatch:        jest.fn(),
    history:         { push: jest.fn() },
    match:           { params: {} },
    location:        { search: '' },
    isLoading:            false,
    isSuccessful:         false,
    roles:                [],
    departments:          [],
    registerUser:         jest.fn(),
    fetchDepartmentList:  jest.fn(),
    fetchRoleList:        jest.fn(),
};

function renderRegisterUser(props = {}) {
    return render(
        <MemoryRouter>
            <RegisterUser {...registerUserDefaultProps} {...props} />
        </MemoryRouter>
    );
}

describe('RegisterUser component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderRegisterUser()).not.toThrow();
    });

    test('renders Select Role(s) label', () => {
        const { getByText } = renderRegisterUser();
        expect(getByText(/Select Role\(s\)/i)).toBeInTheDocument();
    });

    test('does not crash during loading state', () => {
        expect(() => renderRegisterUser({ isLoading: true })).not.toThrow();
    });

    test('does not crash with empty role and department lists', () => {
        expect(() => renderRegisterUser({ roles: [], departments: [] })).not.toThrow();
    });

    test('does not crash with empty props override', () => {
        expect(() => renderRegisterUser({ isSuccessful: true })).not.toThrow();
    });
});

// -------------------------------------------------------
// AssignRolesPermissions component
// -------------------------------------------------------
let AssignRolesPermissions;
try {
    const m = require('../../container/Admin/AssignRolesPermissions/AssignRolesPermissions');
    AssignRolesPermissions = m.AssignRolesPermissions || m.default;
} catch (e) {
    AssignRolesPermissions = require('../../container/Admin/AssignRolesPermissions/AssignRolesPermissions').default;
}

const assignRolesDefaultProps = {
    user:               { id: 1, full_name: 'Test Admin', pov_timezone: 'Asia/Manila' },
    dispatch:           jest.fn(),
    history:            { push: jest.fn() },
    match:              { params: {} },
    location:           { search: '' },
    isLoading:          false,
    roles:              [],
    userLists:          [],
    userRole:           [],
    userPermission:     [],
    fetchUser:          jest.fn(),
    fetchRoleList:      jest.fn(),
    fetchUserRolePermission: jest.fn(),
    assignRolesPermissions:  jest.fn(),
};

function renderAssignRoles(props = {}) {
    return render(
        <MemoryRouter>
            <AssignRolesPermissions {...assignRolesDefaultProps} {...props} />
        </MemoryRouter>
    );
}

describe('AssignRolesPermissions component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderAssignRoles()).not.toThrow();
    });

    test('renders Search Name label', () => {
        const { getByText } = renderAssignRoles();
        expect(getByText(/Search Name/i)).toBeInTheDocument();
    });

    test('renders nameFilter input with placeholder', () => {
        const { getByPlaceholderText } = renderAssignRoles();
        expect(getByPlaceholderText(/Enter Name/i)).toBeInTheDocument();
    });

    test('does not crash during loading state', () => {
        expect(() => renderAssignRoles({ isLoading: true })).not.toThrow();
    });

    test('does not crash with empty user list', () => {
        expect(() => renderAssignRoles({ userLists: [], userRole: [], userPermission: [] })).not.toThrow();
    });
});

// -------------------------------------------------------
// AssignFeature component
// -------------------------------------------------------
let AssignFeature;
try {
    const m = require('../../container/Admin/AssignFeature/AssignFeature');
    AssignFeature = m.AssignFeature || m.default;
} catch (e) {
    AssignFeature = require('../../container/Admin/AssignFeature/AssignFeature').default;
}

const assignFeatureDefaultProps = {
    user:               { id: 1, full_name: 'Test Admin', pov_timezone: 'Asia/Manila' },
    dispatch:           jest.fn(),
    history:            { push: jest.fn() },
    match:              { params: {} },
    location:           { search: '' },
    isLoading:          false,
    roles:              [],
    userLists:          [],
    features:           [],
    userFeatures:       [],
    userLevel:          {},
    fetchUser:          jest.fn(),
    fetchRoleList:      jest.fn(),
    fetchFeaturesList:  jest.fn(),
    fetchUserFeatures:  jest.fn(),
    assignLevelFeatures: jest.fn(),
};

function renderAssignFeature(props = {}) {
    return render(
        <MemoryRouter>
            <AssignFeature {...assignFeatureDefaultProps} {...props} />
        </MemoryRouter>
    );
}

describe('AssignFeature component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderAssignFeature()).not.toThrow();
    });

    test('renders Search Name label', () => {
        const { getByText } = renderAssignFeature();
        expect(getByText(/Search Name/i)).toBeInTheDocument();
    });

    test('renders Enter Name placeholder', () => {
        const { getByPlaceholderText } = renderAssignFeature();
        expect(getByPlaceholderText(/Enter Name/i)).toBeInTheDocument();
    });

    test('does not crash during loading state', () => {
        expect(() => renderAssignFeature({ isLoading: true })).not.toThrow();
    });

    test('does not crash with empty features list', () => {
        expect(() => renderAssignFeature({ features: [], userFeatures: [] })).not.toThrow();
    });
});

// -------------------------------------------------------
// AssignDepartmentHandlers component
// -------------------------------------------------------
let AssignDepartmentHandlers;
try {
    const m = require('../../container/Admin/AssignDepartmentHandlers/AssignDepartmentHandlers');
    AssignDepartmentHandlers = m.AssignDepartmentHandlers || m.default;
} catch (e) {
    AssignDepartmentHandlers = require('../../container/Admin/AssignDepartmentHandlers/AssignDepartmentHandlers').default;
}

const assignDeptHandlersDefaultProps = {
    user:                       { id: 1, full_name: 'Test Admin', pov_timezone: 'Asia/Manila' },
    dispatch:                   jest.fn(),
    history:                    { push: jest.fn() },
    match:                      { params: {} },
    location:                   { search: '' },
    isLoading:                  false,
    supervisor:                 [],
    client:                     [],
    department:                 [],
    departments:                [],
    departmentHandlersList:     [],
    fetchUserList:              jest.fn(),
    fetchDepartmentList:        jest.fn(),
    fetchDepartmentHandlersList: jest.fn(),
    assignDepartmentHandlers:   jest.fn(),
};

function renderAssignDeptHandlers(props = {}) {
    return render(
        <MemoryRouter>
            <AssignDepartmentHandlers {...assignDeptHandlersDefaultProps} {...props} />
        </MemoryRouter>
    );
}

describe('AssignDepartmentHandlers component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderAssignDeptHandlers()).not.toThrow();
    });

    test('renders Departments label', () => {
        const { container } = renderAssignDeptHandlers();
        expect(container.textContent).toMatch(/Departments/i);
    });

    test('does not crash during loading state', () => {
        expect(() => renderAssignDeptHandlers({ isLoading: true })).not.toThrow();
    });

    test('does not crash with empty supervisor and client lists', () => {
        expect(() => renderAssignDeptHandlers({ supervisor: [], client: [] })).not.toThrow();
    });

    test('does not crash with empty department list', () => {
        expect(() => renderAssignDeptHandlers({ departments: [] })).not.toThrow();
    });
});

// -------------------------------------------------------
// AssignEmployeeSupervisors component
// -------------------------------------------------------
let AssignEmployeeSupervisors;
try {
    const m = require('../../container/Admin/AssignEmployeeSupervisors/AssignEmployeeSupervisors');
    AssignEmployeeSupervisors = m.AssignEmployeeSupervisors || m.default;
} catch (e) {
    AssignEmployeeSupervisors = require('../../container/Admin/AssignEmployeeSupervisors/AssignEmployeeSupervisors').default;
}

const assignEmpSupervisorsDefaultProps = {
    user:                           { id: 1, full_name: 'Test Admin', pov_timezone: 'Asia/Manila' },
    dispatch:                       jest.fn(),
    history:                        { push: jest.fn() },
    match:                          { params: {} },
    location:                       { search: '' },
    isLoading:                      false,
    supervisor:                     [],
    departments:                    [],
    department_users:               [],
    fetchUserList:                  jest.fn(),
    fetchDepartmentList:            jest.fn(),
    fetchDepartmentUsersList:       jest.fn(),
    assignEmployeeSupervisorsActions: jest.fn(),
};

function renderAssignEmpSupervisors(props = {}) {
    return render(
        <MemoryRouter>
            <AssignEmployeeSupervisors {...assignEmpSupervisorsDefaultProps} {...props} />
        </MemoryRouter>
    );
}

describe('AssignEmployeeSupervisors component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderAssignEmpSupervisors()).not.toThrow();
    });

    test('renders Supervisors label', () => {
        const { getByText } = renderAssignEmpSupervisors();
        expect(getByText(/Supervisors/i)).toBeInTheDocument();
    });

    test('does not crash during loading state', () => {
        expect(() => renderAssignEmpSupervisors({ isLoading: true })).not.toThrow();
    });

    test('does not crash with empty supervisor list', () => {
        expect(() => renderAssignEmpSupervisors({ supervisor: [] })).not.toThrow();
    });

    test('does not crash with empty department users', () => {
        expect(() => renderAssignEmpSupervisors({ department_users: [] })).not.toThrow();
    });
});

// -------------------------------------------------------
// AssignEmployeesClient component
// -------------------------------------------------------
let AssignEmployeesClient;
try {
    const m = require('../../container/Admin/AssignEmployeesClient/AssignEmployeesClient');
    AssignEmployeesClient = m.AssignEmployeesClient || m.default;
} catch (e) {
    AssignEmployeesClient = require('../../container/Admin/AssignEmployeesClient/AssignEmployeesClient').default;
}

const assignEmpClientDefaultProps = {
    user:                       { id: 1, full_name: 'Test Admin', pov_timezone: 'Asia/Manila' },
    dispatch:                   jest.fn(),
    history:                    { push: jest.fn() },
    match:                      { params: {} },
    location:                   { search: '' },
    isLoading:                  false,
    employee:                   [],
    client:                     [],
    department:                 [],
    departments:                [],
    department_users:           [],
    employees_client_users:     [],
    fetchUserList:              jest.fn(),
    fetchDepartmentList:        jest.fn(),
    fetchDepartmentUsersList:   jest.fn(),
    fetchEmployeesClientUserLists: jest.fn(),
    assignEmployeesClient:      jest.fn(),
};

function renderAssignEmpClient(props = {}) {
    return render(
        <MemoryRouter>
            <AssignEmployeesClient {...assignEmpClientDefaultProps} {...props} />
        </MemoryRouter>
    );
}

describe('AssignEmployeesClient component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderAssignEmpClient()).not.toThrow();
    });

    test('renders Client List label', () => {
        const { container } = renderAssignEmpClient();
        expect(container.textContent).toMatch(/Client List/i);
    });

    test('renders Departments label', () => {
        const { container } = renderAssignEmpClient();
        expect(container.textContent).toMatch(/Departments/i);
    });

    test('does not crash during loading state', () => {
        expect(() => renderAssignEmpClient({ isLoading: true })).not.toThrow();
    });

    test('does not crash with empty employee and client lists', () => {
        expect(() => renderAssignEmpClient({ employee: [], client: [] })).not.toThrow();
    });
});
