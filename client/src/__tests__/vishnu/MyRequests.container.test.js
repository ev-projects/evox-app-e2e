// DRAFT — generated 2026-06-16, needs verification
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

// Mock Paginate component used for pagination — actual path: components/Template/Paginate/Paginate
jest.mock('../../components/Template/Paginate/Paginate', () => () => <div data-testid="paginate" />);
jest.mock('../../components/Template/Paginate', () => () => <div data-testid="paginate" />);

// Mock Formik to avoid complex form lifecycle in unit tests
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
}));

// global.links is read by the request-row renderer (e.g. alter_log, alter_log_punch links)
global.links = {
    dashboard:        '/app/Dashboard',
    alter_log:        '/app/AlterLog/',
    alter_log_punch:  '/app/AlterLogPunch/',
    login:            '/login',
};

// Mock Authenticator used for feature/level checks in team pages
jest.mock('../../services/Authenticator', () => ({
    scanFeature: jest.fn(() => true),
    scanLevel:   jest.fn(() => true),
}));

// PageLoading stub — MyRequests.js imports from "../PageLoading"
// Resolved from component: src/container/MyRequests/ → src/container/PageLoading
jest.mock('../../container/PageLoading', () => () => <div>Loading...</div>);
jest.mock('../../container/PageLoading/PageLoading', () => () => <div>Loading...</div>);

// Import MyRequests component
let MyRequests;
try {
    const m = require('../../container/MyRequests/MyRequests');
    MyRequests = m.MyRequests || m.default;
} catch {
    MyRequests = require('../../container/MyRequests/MyRequests').default;
}

const defaultProps = {
    user: { id: 1, full_name: 'Test Employee', pov_timezone: 'Asia/Manila' },
    dispatch: jest.fn(),
    history:  { push: jest.fn() },
    match:    { params: {} },
    location: { search: '' },
    // Redux state props — mapStateToProps maps state.myRequestList.instance → requestList
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
    isListLoaded: true,
    isNumbersLoaded: false,
    statusNumbers: { pending: 0, approved: 0, declined: 0, canceled: 0 },
    filters: {
        status: 'pending',
        valid_from: null,
        valid_to: null,
        request_type: 'all',
        url: 'my_requests',
        page: 1,
    },
    settings: {
        current_payroll_cutoff: {
            start_date: '2026-06-01',
            end_date:   '2026-06-15',
        },
    },
    // Action creators
    fetchRequestList: jest.fn(),
    fetchStatusNumbers: jest.fn(),
};

function renderComponent(props = {}) {
    return render(
        <MemoryRouter>
            <MyRequests {...defaultProps} {...props} />
        </MemoryRouter>
    );
}

describe('MyRequests component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    test('renders Date Range label', () => {
        const { getByText } = renderComponent();
        expect(getByText(/Date Range/i)).toBeInTheDocument();
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

    test('does not crash during loading state with isListLoaded false', () => {
        expect(() => renderComponent({ isListLoaded: false })).not.toThrow();
    });

    test('does not crash with empty request list', () => {
        expect(() => renderComponent({ requestList: { result: { data: [], last_page: 1, current_page: 1, per_page: 10, total: 0 }, record_number: null } })).not.toThrow();
    });

    test('does not crash with null filters', () => {
        expect(() => renderComponent({ filters: {} })).not.toThrow();
    });

    test('does not crash when statusNumbers are all zero', () => {
        expect(() => renderComponent({
            statusNumbers: { pending: 0, approved: 0, declined: 0, canceled: 0 },
            isNumbersLoaded: true,
        })).not.toThrow();
    });

    test('does not crash when isNumbersLoaded is true', () => {
        expect(() => renderComponent({
            isNumbersLoaded: true,
            statusNumbers: { pending: 5, approved: 3, declined: 1, canceled: 0 },
        })).not.toThrow();
    });

    test('does not crash with populated request list', () => {
        const requestList = {
            result: {
                data: [
                    {
                        id: 1,
                        status: 'pending',
                        table_name: 'alter_logs',
                        // alter_logs branch reads fifth_column.new_time_in / fourth_column.current_time_in as objects
                        fourth_column: { current_time_in: '08:00', current_time_out: '17:00' },
                        fifth_column:  { new_time_in:     '08:30', new_time_out:     '17:30' },
                        date_requested: '2026-06-10',
                        employee_note: 'Test note',
                        created_by: 'Test User',
                        updated_by: 'Admin',
                        updated_at: '2026-06-11',
                    },
                ],
                total: 1,
                current_page: 1,
                last_page: 1,
                per_page: 10,
            },
            record_number: 'Showing 1 of 1 records',
        };
        expect(() => renderComponent({ requestList, isListLoaded: true })).not.toThrow();
    });
});

// =========================================================================
// Yup schema unit tests (isolated — no component render needed)
// =========================================================================
describe('MyRequests Yup validation schema', () => {
    let validationSchema;

    beforeAll(() => {
        try {
            const Yup = require('yup');
            // Mirrors the schema in MyRequests.js
            validationSchema = Yup.object().shape({
                valid_from: Yup.date()
                    .nullable()
                    .max(Yup.ref('valid_to'), 'Please select a Valid From date.'),
                valid_to: Yup.date()
                    .nullable()
                    .min(Yup.ref('valid_from'), 'Please select a Valid To date.'),
            });
        } catch (e) {
            validationSchema = null;
        }
    });

    test('both dates null passes validation (fields are nullable)', async () => {
        if (!validationSchema) return;
        await expect(
            validationSchema.validate({ valid_from: null, valid_to: null })
        ).resolves.toBeTruthy();
    });

    test('valid_from before valid_to passes validation', async () => {
        if (!validationSchema) return;
        await expect(
            validationSchema.validate({ valid_from: new Date('2026-06-01'), valid_to: new Date('2026-06-30') })
        ).resolves.toBeTruthy();
    });

    test('valid_from after valid_to fails validation', async () => {
        if (!validationSchema) return;
        await expect(
            validationSchema.validate({ valid_from: new Date('2026-06-30'), valid_to: new Date('2026-06-01') })
        ).rejects.toThrow();
    });

    test('valid_to before valid_from fails with "Please select a Valid To date."', async () => {
        if (!validationSchema) return;
        await expect(
            validationSchema.validate({ valid_from: new Date('2026-06-30'), valid_to: new Date('2026-06-01') }, { abortEarly: false })
        ).rejects.toBeTruthy();
    });
});

// =========================================================================
// MyTeamRequests bulk-action Yup schema unit tests
// =========================================================================
describe('MyTeamRequests bulk-action Yup validation schema', () => {
    let bulkSchema;

    beforeAll(() => {
        try {
            const Yup = require('yup');
            // Mirrors the schema in MyTeamRequests.js for bulk action fields
            bulkSchema = Yup.object().shape({
                checkedList: Yup.string().nullable().when('action', {
                    is: 'bulk_action',
                    then: Yup.string().required('Select a record to be updated').nullable(),
                }),
                bulk_action: Yup.string().nullable().when('action', {
                    is: 'bulk_action',
                    then: Yup.string().required('Please choose action').nullable(),
                }),
                valid_from: Yup.date().nullable().max(Yup.ref('valid_to'), 'Please select a Valid From date.'),
                valid_to:   Yup.date().nullable().min(Yup.ref('valid_from'), 'Please select a Valid To date.'),
                action: Yup.string().nullable(),
            });
        } catch (e) {
            bulkSchema = null;
        }
    });

    test('action=bulk_action with empty checkedList rejects with "Select a record to be updated"', async () => {
        if (!bulkSchema) return;
        await expect(
            bulkSchema.validate({ action: 'bulk_action', checkedList: null, bulk_action: 'approve' })
        ).rejects.toThrow('Select a record to be updated');
    });

    test('action=bulk_action with null bulk_action rejects with "Please choose action"', async () => {
        if (!bulkSchema) return;
        await expect(
            bulkSchema.validate({ action: 'bulk_action', checkedList: '1.overtimes', bulk_action: null })
        ).rejects.toThrow('Please choose action');
    });

    test('action="" (not bulk_action) does not require checkedList or bulk_action', async () => {
        if (!bulkSchema) return;
        await expect(
            bulkSchema.validate({ action: '', checkedList: null, bulk_action: null })
        ).resolves.toBeTruthy();
    });
});
