// DRAFT — generated 2026-06-17, needs verification
/**
 * EVOX Jest P0: ManageTeams Container Tests
 * Source: src/container/MyTeam/ManageTeams/ManageTeams.js
 * Business case: Supervisor creates, updates, or deletes a team by selecting
 * team leaders and employees from multi-select dropdowns, scoped to their
 * department.
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
            Check: (props) => <input type="checkbox" {...props} />,
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
    FieldArray: ({ render: renderFn }) => renderFn ? renderFn({}) : null,
    ErrorMessage: () => null,
    getIn: jest.fn(),
}));

jest.mock('../../container/PageLoading', () => () => <div>Loading...</div>);
jest.mock('../../container/PageLoading/PageLoading', () => () => <div>Loading...</div>);

jest.mock('../../services/Validator', () => ({
    isValid: jest.fn((v) => v != null && v !== '' && v !== undefined),
}));

jest.mock('../../services/Formatter', () => ({
    array_to_multiselect_array: jest.fn((arr, labelKey, valueKey) =>
        (arr || []).map((item) => ({ label: item[labelKey], value: item[valueKey] }))
    ),
}));

jest.mock('../../services/DateFormatter', () => ({
    formatDate: jest.fn((d) => d),
}));

let ManageTeams;
try {
    const m = require('../../container/MyTeam/ManageTeams/ManageTeams');
    ManageTeams = m.ManageTeams || m.default;
} catch {
    ManageTeams = require('../../container/MyTeam/ManageTeams/ManageTeams').default;
}

const defaultProps = {
    user: {
        id: 1,
        full_name: 'Test Supervisor',
        departments_handled: [
            { id: 1, department_name: 'Engineering' },
        ],
    },
    teams_handled:   [],
    team_leader:     [],
    team:            null,
    department_users: [],
    dispatch:        jest.fn(),
    fetchUserList:             jest.fn(),
    fetchTeamsHandledList:     jest.fn(),
    fetchDepartmentUsersList:  jest.fn(),
    fetchTeam:                 jest.fn(),
    createTeam:                jest.fn(),
    updateTeam:                jest.fn(),
    deleteTeam:                jest.fn(),
    setRedirect:               jest.fn(),
    history:  { push: jest.fn() },
    match:    { params: {} },
    location: { search: '' },
};

function renderComponent(props = {}) {
    return render(
        <MemoryRouter>
            <ManageTeams {...defaultProps} {...props} />
        </MemoryRouter>
    );
}

describe('ManageTeams component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    test('renders Manage Team heading', () => {
        const { getByText } = renderComponent();
        expect(getByText(/Manage Team/i)).toBeInTheDocument();
    });

    test('renders Create Team radio option', () => {
        const { getByDisplayValue } = renderComponent();
        expect(getByDisplayValue('store')).toBeInTheDocument();
    });

    test('renders Update Team radio option', () => {
        const { getByDisplayValue } = renderComponent();
        expect(getByDisplayValue('update')).toBeInTheDocument();
    });

    test('does not crash when teams_handled is empty (loading state shows nothing)', () => {
        // teams_handled=undefined triggers PageLoading
        expect(() => renderComponent({ teams_handled: undefined })).not.toThrow();
    });

    test('does not crash when team_leader is undefined (shows PageLoading)', () => {
        expect(() => renderComponent({ team_leader: undefined })).not.toThrow();
    });

    test('does not crash with populated teams_handled list', () => {
        expect(() => renderComponent({
            teams_handled: [{ id: 1, name: 'Alpha Team' }, { id: 2, name: 'Beta Team' }],
            team_leader:   [{ id: 10, full_name: 'Lead One' }],
        })).not.toThrow();
    });
});
