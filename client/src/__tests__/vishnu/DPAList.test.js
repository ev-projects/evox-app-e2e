// DRAFT — generated 2026-06-17, needs verification
/**
 * EVOX Jest P0: DPAList Container Tests
 * Source: src/container/MyTeam/DPAList/DPAList.js
 * Business case: Team manager views the DPA (Data Privacy Act) consent list
 * for employees, filtering by active/inactive status, DPA submission status,
 * department, and name.
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
    Container:     ({ children }) => <div>{children}</div>,
    Col:           ({ children }) => <div>{children}</div>,
    Row:           ({ children }) => <div>{children}</div>,
    Tabs:          ({ children }) => <div>{children}</div>,
    Tab:           ({ children }) => <div>{children}</div>,
    Badge:         ({ children }) => <span>{children}</span>,
    Table:         ({ children }) => <table>{children}</table>,
    Button:        ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
    Dropdown:      Object.assign(
        ({ children }) => <div>{children}</div>,
        {
            Toggle: ({ children }) => <button>{children}</button>,
            Menu:   ({ children }) => <div>{children}</div>,
            Item:   ({ children }) => <div>{children}</div>,
        }
    ),
    FormControl:   (props) => <input {...props} />,
}));

jest.mock('react-select', () => (props) => <select data-testid="react-select" />);

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

jest.mock('../../components/Template/Paginate', () => () => <div data-testid="paginate" />);
jest.mock('../../components/Template/Paginate/Paginate', () => () => <div data-testid="paginate" />);

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
    Field: ({ name, type, placeholder }) => <input name={name} type={type || 'text'} placeholder={placeholder} />,
    Form:  ({ children }) => <form>{children}</form>,
    useFormikContext: () => ({
        values: { is_active: 1, submitted_dpa: undefined, department_id: undefined, page: 1 },
        handleChange: jest.fn(),
        setFieldValue: jest.fn(),
    }),
    ErrorMessage: () => null,
    getIn: jest.fn(),
}));

jest.mock('../../container/PageLoading', () => () => <div>Loading...</div>);

jest.mock('../../services/Validator', () => ({
    isValid: jest.fn((v) => v != null && v !== '' && v !== undefined),
}));

let DPAList;
try {
    const m = require('../../container/MyTeam/DPAList/DPAList');
    DPAList = m.DPAList || m.default;
} catch {
    DPAList = require('../../container/MyTeam/DPAList/DPAList').default;
}

const defaultProps = {
    user: {
        id: 1,
        full_name: 'Test Manager',
        departments_handled: [
            { id: 1, department_name: 'Engineering' },
        ],
    },
    dpaList: {
        list: null,
        filters: {
            is_active:     1,
            submitted_dpa: undefined,
            department_id: undefined,
            page:          1,
        },
    },
    dispatch:      jest.fn(),
    fetchDpaList:  jest.fn(),
    exportDpaList: jest.fn(),
    history:       { push: jest.fn() },
    match:         { params: {} },
    location:      { search: '' },
};

function renderComponent(props = {}) {
    return render(
        <MemoryRouter>
            <DPAList {...defaultProps} {...props} />
        </MemoryRouter>
    );
}

describe('DPAList component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    test('renders DPA List page title', () => {
        const { getByText } = renderComponent();
        expect(getByText(/DPA List/i)).toBeInTheDocument();
    });

    test('renders Employee Status select', () => {
        const { container } = renderComponent();
        const select = container.querySelector('select[name="is_active"]');
        expect(select).toBeInTheDocument();
    });

    test('renders DPA status select', () => {
        const { container } = renderComponent();
        const select = container.querySelector('select[name="submitted_dpa"]');
        expect(select).toBeInTheDocument();
    });

    test('does not crash when dpaList.list is null (empty state)', () => {
        expect(() => renderComponent({
            dpaList: { list: null, filters: { is_active: 1 } },
        })).not.toThrow();
    });

    test('does not crash when dpaList.list has data', () => {
        expect(() => renderComponent({
            dpaList: {
                list: {
                    data: [
                        {
                            emp_num:      'EMP001',
                            full_name:    'Juan Dela Cruz',
                            department:   'Engineering',
                            dpa_ticked_at: '2026-01-10',
                            is_active:    1,
                        },
                    ],
                    pagination: { count: 1, total: 1 },
                },
                filters: { is_active: 1 },
            },
        })).not.toThrow();
    });
});
