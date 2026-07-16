// DRAFT — generated 2026-06-17, needs verification
/**
 * EVOX Jest P0: DepartmentList Container Tests
 * Source: src/container/Admin/DepartmentList/DepartmentList.js
 * Business case: Admin views all departments with the ability to soft-delete
 * a department and toggle the Multi Login (schedule_active) flag per department.
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

jest.mock('react-bootstrap', () => {
    const Dropdown = Object.assign(
        ({ children }) => <div>{children}</div>,
        {
            Toggle: ({ children }) => <button>{children}</button>,
            Menu:   ({ children }) => <div>{children}</div>,
            Item:   ({ children, href }) => <a href={href}>{children}</a>,
        }
    );
    const Form = Object.assign(
        ({ children }) => <form>{children}</form>,
        {
            Check: ({ id, checked, type, label, onClick }) => (
                <input
                    id={id}
                    type={type || 'checkbox'}
                    defaultChecked={!!checked}
                    aria-label={label}
                    onClick={onClick}
                />
            ),
        }
    );
    return {
        Modal:     ({ children }) => <div>{children}</div>,
        Button:    ({ children, onClick, variant }) => <button onClick={onClick}>{children}</button>,
        Container: ({ children }) => <div>{children}</div>,
        Col:       ({ children }) => <div>{children}</div>,
        Table:     ({ children }) => <table>{children}</table>,
        Dropdown,
        Form,
    };
});

jest.mock('react-datepicker', () => () => <input type="date" data-testid="datepicker" />);
jest.mock('react-datepicker/dist/react-datepicker.css', () => {});

jest.mock('react-bootstrap/Dropdown', () => {
    const D = Object.assign(
        ({ children }) => <div>{children}</div>,
        {
            Toggle: ({ children }) => <button>{children}</button>,
            Menu:   ({ children }) => <div>{children}</div>,
            Item:   ({ children }) => <div>{children}</div>,
        }
    );
    return D;
});

jest.mock('react-bootstrap/Form', () => {
    const Form = Object.assign(
        ({ children }) => <form>{children}</form>,
        {
            Check: ({ id, checked, type, label, onClick }) => (
                <input
                    id={id}
                    type={type || 'checkbox'}
                    defaultChecked={!!checked}
                    aria-label={label}
                    onClick={onClick}
                />
            ),
        }
    );
    return Form;
});

jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);

jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader:  ({ children }) => <div>{children}</div>,
    Content:          ({ children }) => <div>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
    Row:              ({ children }) => <div>{children}</div>,
    Col:              ({ children }) => <div>{children}</div>,
}));

jest.mock('../../container/PageLoading', () => () => <div>Loading...</div>);
jest.mock('../../container/PageLoading/PageLoading', () => () => <div>Loading...</div>);

jest.mock('../../services/Formatter', () => ({
    formatDate: jest.fn((d) => d),
    slug_to_title: jest.fn((s) => s),
}));

let DepartmentList;
try {
    const m = require('../../container/Admin/DepartmentList/DepartmentList');
    DepartmentList = m.DepartmentList || m.default;
} catch {
    DepartmentList = require('../../container/Admin/DepartmentList/DepartmentList').default;
}

const sampleDepartments = [
    { id: 1, department_name: 'Engineering', schedule_active: true },
    { id: 2, department_name: 'Operations', schedule_active: false },
];

const defaultProps = {
    departmentList: {
        isDepartmentListLoaded: true,
        Deplist: sampleDepartments,
    },
    dispatch:                   jest.fn(),
    fetchDepartmentList:        jest.fn(),
    deleteDepartment:           jest.fn(),
    updateDepartmentScheduleStatus: jest.fn(),
    history:  { push: jest.fn() },
    match:    { params: {} },
    location: { search: '' },
};

function renderComponent(props = {}) {
    return render(
        <MemoryRouter>
            <DepartmentList {...defaultProps} {...props} />
        </MemoryRouter>
    );
}

describe('DepartmentList component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    test('renders Department List heading', () => {
        const { getByText } = renderComponent();
        expect(getByText(/Department List/i)).toBeInTheDocument();
    });

    test('renders department names in the table', () => {
        const { getByText } = renderComponent();
        expect(getByText('Engineering')).toBeInTheDocument();
        expect(getByText('Operations')).toBeInTheDocument();
    });

    test('renders table headers: Department ID and Department Name', () => {
        const { getByText } = renderComponent();
        expect(getByText(/Department ID/i)).toBeInTheDocument();
        expect(getByText(/Department Name/i)).toBeInTheDocument();
    });

    test('does not crash when isDepartmentListLoaded is false (shows PageLoading)', () => {
        expect(() => renderComponent({
            departmentList: { isDepartmentListLoaded: false, Deplist: [] },
        })).not.toThrow();
    });

    test('does not crash with empty department list', () => {
        expect(() => renderComponent({
            departmentList: { isDepartmentListLoaded: true, Deplist: [] },
        })).not.toThrow();
    });

    test('renders Multi Login toggle switches for each department', () => {
        const { getAllByText } = renderComponent();
        const multiLoginLabels = getAllByText(/Multi Login/i);
        expect(multiLoginLabels.length).toBeGreaterThan(0);
    });
});
