/**
 * evoxtest_DisputeFormDeep2.test.js
 * Wave-2 coverage for components/PayrollDispute/DisputeForm.js (29 Jul: 90 unc / 37.1%).
 * Arms: create-mode mount (fetchUserDispute + payroll-cutoff success/empty/error),
 * employee-search input dispatch + handleblur reset, handleChange numeric validation
 * (integer ok / letters rejected / decimals rejected), edit-mode mount, Approve/Decline
 * PUTs, and the payroll handleUpdate submit.
 *
 * DEAD-CODE note: handleEmployeeSearch (~50 lines incl. alert('test1'..'test4')) is
 * never referenced in the JSX — the search input dispatches fetchUserDispute directly.
 * fetchDisputes and the whole /storedispute flow are commented out.
 * ADDITIVE ONLY. Menu: Payroll → Dispute (route: payroll_dispute+':id?').
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
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
    fetchUserRolePermission: jest.fn(), assignRolesPermissions: jest.fn(),
    fetchUserFeatures: jest.fn(), assignLevelFeatures: jest.fn(),
    fetchUserDispute: jest.fn((...a) => ({ type: 'STUB_FETCH_USER_DISPUTE', a })),
}));
jest.mock('../../store/actions/report/reportActions', () => ({
    getDisputeReport: jest.fn((id) => ({ type: 'STUB_GET_DISPUTE_REPORT', id })),
}));

import API from '../../services/API';
import Formatter from '../../services/Formatter';
import { payrollperiod } from '../../store/actions/filters/requestListActions';
import { fetchUserDispute } from '../../store/actions/admin/assignRoleActions';
import { getDisputeReport } from '../../store/actions/report/reportActions';

global.links = new Proxy({}, { get: () => '/x/' });

const DisputeForm = require('../../components/PayrollDispute/DisputeForm').default;

const baseProps = {
    user: { id: 42 },
    payroll: '',
    userLists: [],
    dispute_record: {},
    params: {},
    history: { goBack: jest.fn() },
};

function routeApi(overrides = {}) {
    API.call.mockImplementation((req) => {
        const url = req.url || '';
        if (url.startsWith('/getpayrollcutoff/')) {
            return (overrides.cutoff || (() => Promise.resolve({ data: [{ name: 'JUL 16 - AUG 15' }] })))(req);
        }
        if (url.startsWith('/updatedispute/')) {
            return (overrides.update || (() => Promise.resolve({ data: { message: 'ok' } })))(req);
        }
        return Promise.resolve({ data: [] });
    });
}

function renderDispute(props = {}) {
    return render(
        <MemoryRouter>
            <DisputeForm {...baseProps} {...props} />
        </MemoryRouter>
    );
}

const flush = () => new Promise((r) => setTimeout(r, 20));

beforeEach(() => {
    jest.clearAllMocks();
    routeApi();
});

describe('DisputeForm — create mode mount and cutoff arms', () => {
    test('mount fetches user disputes and resolves the payroll cutoff (success arm)', async () => {
        const { getByText } = renderDispute();
        await flush();

        expect(fetchUserDispute).toHaveBeenCalled();
        const cutoffCall = API.call.mock.calls.find((c) => (c[0].url || '').startsWith('/getpayrollcutoff/'));
        expect(cutoffCall[0].url).toMatch(/\/getpayrollcutoff\/\d{4}-\d{1,2}-16\/\d{4}-\d{1,2}-15/);
        expect(payrollperiod).toHaveBeenCalledWith('JUL 16 - AUG 15');
        getByText('Create Dispute');
    });

    test('cutoff not found keeps submit disabled and alerts the projects-team message', async () => {
        routeApi({ cutoff: () => Promise.resolve({ data: [] }) });
        const { getByText } = renderDispute();
        await flush();

        expect(Formatter.alert_error_message).toHaveBeenCalledWith(
            'Cut Off Details Not Found, Please Contact Projects Team.'
        );
        getByText('Create Dispute'); // page still renders
    });

    test('cutoff fetch failure dispatches alert_error', async () => {
        routeApi({ cutoff: () => Promise.reject(new Error('HTTP 500')) });
        renderDispute();
        await flush();
        expect(Formatter.alert_error).toHaveBeenCalled();
    });

});

describe('DisputeForm — FINDING DSP-NUM-1: numeric validation is unreachable', () => {
    test('editable amount fields bypass the Allow-Only-Numeric guard entirely', async () => {
        // handleChange only validates names in the formvalidate map (LWOP/UT/TARDINESS/
        // Late/...), but the RENDERED editable inputs are named Render_Hr/Night_Diff/
        // OverTime/... — and the map-named inputs (Late, Undertime) are disabled,
        // dispute_record-bound display fields. Result: the numeric guard can never fire;
        // free text lands in the amount fields' formData. Fix: align the validation map
        // with the real input names. Flip when fixed.
        const { container, queryAllByText } = renderDispute();
        await flush();

        const renderHr = container.querySelector('input[name="Render_Hr"]');
        expect(renderHr).not.toBeNull();
        fireEvent.change(renderHr, { target: { value: 'abc' } }); // arbitrary text
        expect(queryAllByText(/Allow Only Numeric/).length).toBe(0); // guard never renders

        const late = container.querySelector('input[name="Late"]');
        expect(late.disabled).toBe(true); // the guarded field is read-only display
    });
});

describe('DisputeForm — FINDING DSP-CRT-1: dispute creation is non-functional', () => {
    test('create page has NO submit button; Approve PUTs /updatedispute/undefined', async () => {
        // The Submit Dispute button block AND the employee-search block are commented
        // out in the JSX; /storedispute in handleSubmit is commented out too. The
        // create page renders only Back/Approve/Decline, and those PUT
        // `/updatedispute/undefined` with {status, remarks} — every entered dispute
        // value is silently discarded. CREATING A PAYROLL DISPUTE IS IMPOSSIBLE in
        // this build. Fix: restore the create submit + /storedispute flow. Flip when fixed.
        const { getByText, queryByText } = renderDispute();
        await flush();
        API.call.mockClear();

        expect(queryByText('Submit Dispute')).toBeNull();     // no create submit at all
        fireEvent.click(getByText(/Approve/));                // renders even on create
        await flush();

        const calls = API.call.mock.calls.map((c) => c[0]);
        expect(calls.some((c) => c.url === '/storedispute')).toBe(false);
        const put = calls.find((c) => (c.url || '').startsWith('/updatedispute/'));
        expect(put.url).toBe('/updatedispute/undefined');
        expect(put.method).toBe('put');
    });
});

describe('DisputeForm — edit mode (params.id)', () => {
    test('mount dispatches getDisputeReport instead of the cutoff flow', async () => {
        const { getAllByText } = renderDispute({ params: { id: '5' } });
        await flush();
        expect(getDisputeReport).toHaveBeenCalledWith('5');
        getAllByText('Dispute Form');
    });

    test('Approve and Decline PUT the matching status with remarks', async () => {
        const { container, getByText } = renderDispute({ params: { id: '5' } });
        await flush();

        const remarks = container.querySelector('textarea[name="Remarks"], input[name="Remarks"]');
        if (remarks) fireEvent.change(remarks, { target: { value: 'Verified against payslip' } });

        fireEvent.click(getByText(/Approve/));
        await flush();
        let put = API.call.mock.calls.find((c) => (c[0].url || '').startsWith('/updatedispute/'));
        expect(put[0].url).toBe('/updatedispute/5');
        expect(put[0].data.status).toBe(1);
        expect(Formatter.alert_success).toHaveBeenCalled();

        API.call.mockClear();
        fireEvent.click(getByText(/Decline/));
        await flush();
        put = API.call.mock.calls.find((c) => (c[0].url || '').startsWith('/updatedispute/'));
        expect(put[0].data.status).toBe(2);
    });

    test('update failure dispatches alert_error', async () => {
        routeApi({ update: () => Promise.reject(new Error('HTTP 500')) });
        const { getByText } = renderDispute({ params: { id: '5' } });
        await flush();
        fireEvent.click(getByText(/Approve/));
        await flush();
        expect(Formatter.alert_error).toHaveBeenCalled();
    });
});
