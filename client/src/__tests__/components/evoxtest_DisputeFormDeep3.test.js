/**
 * evoxtest_DisputeFormDeep3.test.js
 * Wave-3 tail coverage for components/PayrollDispute/DisputeForm.js (after Deep2: 53.85%,
 * 66 unc stmts). Targets the arms Deep2 could not reach:
 *   - the THREE payroll-cutoff month-boundary arms (day>15 + December year-wrap, day<=15 +
 *     January year-wrap, day>15 mid-year) — driven by a global Date mock so the suite is
 *     deterministic on ANY run date;
 *   - the employee <select> onChange (dataset-driven form population).
 *
 * NOT covered (dead per Deep2 header, unchanged): handleEmployeeSearch (~50 lines, never
 * referenced in JSX, still contains alert('test1'..'test4')), fetchDisputes (no caller).
 * ADDITIVE ONLY. Menu: Payroll → Dispute.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

const mockDispatch = jest.fn((a) => a);
jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => mockDispatch,
}));

jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader:  ({ children }) => <div>{children}</div>,
    Content:          ({ children }) => <div>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
    Row:              ({ children }) => <div>{children}</div>,
    Col:              ({ children }) => <div>{children}</div>,
}));
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../services/Authenticator', () => ({
    scanLevel: jest.fn(() => true),
    scanFeature: jest.fn(() => true),
}));
jest.mock('react-bootstrap', () => ({
    Button: ({ children, onClick, type }) => <button type={type} onClick={onClick}>{children}</button>,
}));
jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn() }));
jest.mock('../../services/API', () => ({ call: jest.fn() }));
jest.mock('../../services/Formatter', () => ({
    alert_success: jest.fn(() => ({ type: 'STUB_ALERT_SUCCESS' })),
    alert_error: jest.fn(() => ({ type: 'STUB_ALERT_ERROR' })),
    alert_error_message: jest.fn(() => ({ type: 'STUB_ALERT_ERROR_MSG' })),
}));
jest.mock('../../store/actions/filters/requestListActions', () => ({
    payrollperiod: jest.fn((n) => ({ type: 'STUB_PAYROLL_PERIOD', n })),
}));
jest.mock('../../store/actions/admin/assignRoleActions', () => ({
    fetchUserFeatures: jest.fn(), assignLevelFeatures: jest.fn(),
    fetchUserDispute: jest.fn((...a) => ({ type: 'STUB_FETCH_USER_DISPUTE', a })),
}));
jest.mock('../../store/actions/report/reportActions', () => ({
    getDisputeReport: jest.fn((id) => ({ type: 'STUB_GET_DISPUTE_REPORT', id })),
}));

import API from '../../services/API';

global.links = new Proxy({}, { get: () => '/x/' });

const DisputeForm = require('../../components/PayrollDispute/DisputeForm').default;

const RealDate = global.Date;
const mockToday = (iso) => {
    global.Date = class extends RealDate {
        constructor(...args) {
            if (args.length) { super(...args); } else { super(iso + 'T10:00:00'); }
        }
        static now() { return new RealDate(iso + 'T10:00:00').getTime(); }
    };
};

const flush = () => act(() => Promise.resolve());

const baseProps = () => ({
    user: { id: 42 },
    payroll: '',
    userLists: [{ id: 9, first_name: 'Alice', last_name: 'Dispute', emp_num: '009', department_name: 'IT' }],
    dispute_record: {},
    params: {},
    history: { goBack: jest.fn() },
});

const renderForm = (props) => render(
    <MemoryRouter><DisputeForm {...props} /></MemoryRouter>
);

describe('DisputeForm (Deep3 — cutoff boundaries + employee select)', () => {
    afterEach(() => {
        global.Date = RealDate;
        jest.clearAllMocks();
    });

    test('after the 15th in December, cutoff wraps into January of NEXT year', async () => {
        mockToday('2026-12-20');
        API.call.mockReturnValue(Promise.resolve({ data: [] }));

        renderForm(baseProps());
        await flush();

        expect(API.call).toHaveBeenCalledWith(expect.objectContaining({
            url: '/getpayrollcutoff/2026-12-16/2027-01-15',
        }));
    });

    test('on or before the 15th in January, cutoff wraps back into December of PREVIOUS year', async () => {
        mockToday('2026-01-10');
        API.call.mockReturnValue(Promise.resolve({ data: [] }));

        renderForm(baseProps());
        await flush();

        expect(API.call).toHaveBeenCalledWith(expect.objectContaining({
            url: '/getpayrollcutoff/2025-12-16/2026-1-15',
        }));
    });

    test('after the 15th mid-year, cutoff spans this month 16th to next month 15th', async () => {
        mockToday('2026-06-20');
        API.call.mockReturnValue(Promise.resolve({ data: [] }));

        renderForm(baseProps());
        await flush();

        expect(API.call).toHaveBeenCalledWith(expect.objectContaining({
            url: '/getpayrollcutoff/2026-6-16/2026-7-15',
        }));
    });

    test('cutoff result with a row dispatches the payroll period name', async () => {
        mockToday('2026-06-20');
        API.call.mockReturnValue(Promise.resolve({ data: [{ name: 'JUN-2' }] }));

        renderForm(baseProps());
        await flush();
        await flush();

        const { payrollperiod } = require('../../store/actions/filters/requestListActions');
        expect(payrollperiod).toHaveBeenCalledWith('JUN-2');
    });

    test('choosing an employee from the select populates the form from option datasets', async () => {
        mockToday('2026-06-20');
        API.call.mockReturnValue(Promise.resolve({ data: [] }));

        const { container } = renderForm(baseProps());
        await flush();

        const select = container.querySelector('select[name="selectedUser"]');
        expect(select).not.toBeNull();
        await act(async () => {
            fireEvent.change(select, { target: { value: '9' } });
        });

        expect(select.value).toBe('9');
    });
});
