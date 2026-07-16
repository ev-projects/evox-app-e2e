// DRAFT — generated 2026-06-17, needs verification
/**
 * EVOX Jest P0: MyOverallRequest Container Tests
 * Source: src/container/MyOverallRequest/MyOverallRequest.js
 * Business case: Employee views all their requests (alterations, overtime,
 * rest day work, change schedule) with status filter tabs and date range filter.
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
    Pagination:    ({ children }) => <div>{children}</div>,
    FormControl:   (props) => <input {...props} />,
    ToggleButton:  ({ children }) => <button>{children}</button>,
    ButtonGroup:   ({ children }) => <div>{children}</div>,
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

jest.mock('../../components/Template/Paginate', () => () => <div data-testid="paginate" />);
jest.mock('../../components/Template/Paginate/Paginate', () => () => <div data-testid="paginate" />);

jest.mock('formik', () => ({
    ...jest.requireActual('formik'),
    Formik: ({ children, initialValues, onSubmit }) => {
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
    slug_to_title: jest.fn((s) => s),
}));

global.links = {
    dashboard:       '/app/Dashboard',
    alter_log:       '/app/AlterLog/',
    alter_log_punch: '/app/AlterLogPunch/',
    change_schedule: '/app/ChangeSchedule/',
    rest_day_work:   '/app/RestDayWork/',
    overtime:        '/app/Overtime/',
    login:           '/login',
    base:            '/app/',
};

// Import component — exported class is anonymous default; no named export
let MyOverallRequest;
try {
    const m = require('../../container/MyOverallRequest/MyOverallRequest');
    MyOverallRequest = m.MyRequests || m.default;
} catch {
    MyOverallRequest = require('../../container/MyOverallRequest/MyOverallRequest').default;
}

const defaultProps = {
    user: { id: 1, full_name: 'Test Employee', pov_timezone: 'Asia/Manila' },
    dispatch: jest.fn(),
    history:  { push: jest.fn() },
    match:    { params: {} },
    location: { search: '' },
    requestList: {
        result: {
            data: [],
            last_page: 1,
            current_page: 1,
            per_page: 10,
            total: 0,
        },
        record_number: null,
    },
    isListLoaded:    true,
    isNumbersLoaded: false,
    statusNumbers: { pending: 0, approved: 0, declined: 0, canceled: 0 },
    filters: {
        status:       'pending',
        valid_from:   null,
        valid_to:     null,
        request_type: 'alteration',
        url:          'my_requests',
        page:         1,
    },
    settings: {
        current_payroll_cutoff: {
            start_date: '2026-06-01',
            end_date:   '2026-06-15',
        },
    },
    fetchRequestList:   jest.fn(),
    fetchStatusNumbers: jest.fn(),
    // MyOverallRequest reads requesttype from myTeamRequestList
    requesttype: 'alteration',
};

function renderComponent(props = {}) {
    return render(
        <MemoryRouter>
            <MyOverallRequest {...defaultProps} {...props} />
        </MemoryRouter>
    );
}

describe('MyOverallRequest component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    test('renders My Overall Requests heading', () => {
        const { getByText } = renderComponent();
        expect(getByText(/My Overall Requests/i)).toBeInTheDocument();
    });

    test('renders valid_from date input', () => {
        const { container } = renderComponent();
        const input = container.querySelector('input[name="valid_from"]');
        expect(input).toBeInTheDocument();
    });

    test('renders valid_to date input', () => {
        const { container } = renderComponent();
        const input = container.querySelector('input[name="valid_to"]');
        expect(input).toBeInTheDocument();
    });

    test('does not crash when isListLoaded is false (shows PageLoading)', () => {
        expect(() => renderComponent({ isListLoaded: false })).not.toThrow();
    });

    test('does not crash with empty request list', () => {
        expect(() => renderComponent({
            requestList: {
                result: { data: [], last_page: 1, current_page: 1, per_page: 10, total: 0 },
                record_number: null,
            },
        })).not.toThrow();
    });

    test('does not crash when statusNumbers are loaded', () => {
        expect(() => renderComponent({
            isNumbersLoaded: true,
            statusNumbers: { pending: 5, approved: 3, declined: 1, canceled: 2 },
        })).not.toThrow();
    });
});
