/**
 * evoxtest_ViewReportsDeep2.test.js
 * Wave-6 coverage for components/DateReport/ViewReport.js (47 unc / 42.7%) and
 * ViewReportMorocco.js (44 unc / 47.6%) — the India and Morocco payroll reports.
 * Arms: mount year-list build + country fetch, month/year validators (both, year-only,
 * month-only), valid save fetch (India country=1 / Morocco country=4 + department),
 * CSV export with the named download + failure alert, month-change label updates.
 * ADDITIVE ONLY. Menu: Reports → India/Morocco Payroll (routes: view_report, view_report_morocco).
 */

import React from 'react';
import { render, fireEvent, within } from '@testing-library/react';
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
jest.mock('react-bootstrap', () => {
    const React = require('react');
    const passthrough = ({ children, onClick }) => <div onClick={onClick}>{children}</div>;
    const Dropdown = ({ children, onClick }) => <div data-testid="export-dropdown" onClick={onClick}>{children}</div>;
    Dropdown.Toggle = passthrough; Dropdown.Menu = passthrough; Dropdown.Item = passthrough;
    return {
        Row: passthrough, Col: passthrough,
        Table: ({ children }) => <table>{children}</table>,
        Button: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
        Dropdown, Form: passthrough, Container: passthrough,
    };
});
jest.mock('../../services/API', () => ({ call: jest.fn() }));
jest.mock('../../services/Formatter', () => ({
    alert_error: jest.fn(() => ({ type: 'STUB_ALERT_ERROR' })),
    alert_success: jest.fn(() => ({ type: 'STUB_ALERT_SUCCESS' })),
}));
jest.mock('../../components/PoliciesDocument/PoliciesDocumentApi.js', () => ({
    fecthUserContry: jest.fn(() => ({ type: 'STUB_FETCH_COUNTRY' })),
    fecthUserDepartment: jest.fn(() => ({ type: 'STUB_FETCH_DEPT' })),
    fecthMoroccoPayrollParams: jest.fn(() => ({ type: 'STUB_FETCH_MA_PARAMS' })),
}), { virtual: true });

// Morocco builds its month/year options from this prop (dashboard.morocco_payroll_params)
const maParams = {
    month: [{ month_number: 7 }, { month_number: 8 }],
    year: [{ year_name: new Date().getFullYear() }],
    department: [{ department_id: 12, department_name: 'Casablanca' }],
};

import API from '../../services/API';
import Formatter from '../../services/Formatter';

const ViewReport = require('../../components/DateReport/ViewReport').default;
const ViewReportMorocco = require('../../components/DateReport/ViewReportMorocco').default;

const flush = () => new Promise((r) => setTimeout(r, 10));

function selects(container) {
    return container.querySelectorAll('select');
}

function pickMonthYear(container, month = '7', year = String(new Date().getFullYear())) {
    fireEvent.change(selects(container)[0], { target: { value: month } });
    fireEvent.change(selects(container)[1], { target: { value: year } });
}

beforeEach(() => {
    jest.clearAllMocks();
    API.call.mockResolvedValue({ status: 200, data: { content: { timeoffItems: [], timeoffItemsnew: [] } } });
    window.URL.createObjectURL = jest.fn(() => 'blob:csv');
});

describe('ViewReport (India)', () => {
    test('empty save trips both validators; year-only and month-only trip one each', async () => {
        const utils = render(<ViewReport user={{ id: 1 }} />);
        fireEvent.click(utils.getByText(/Filter/));
        utils.getByText('Please Select Month');
        utils.getByText('Please Select Year');
        expect(API.call).not.toHaveBeenCalled();

        fireEvent.change(selects(utils.container)[1], { target: { value: String(new Date().getFullYear()) } });
        fireEvent.click(utils.getByText(/Filter/));
        utils.getByText('Please Select Month'); // month still missing
    });

    test('valid save fetches the India allocation (country=1)', async () => {
        const utils = render(<ViewReport user={{ id: 1 }} />);
        pickMonthYear(utils.container);
        fireEvent.click(utils.getByText(/Filter/));
        await flush();

        expect(API.call).toHaveBeenCalledTimes(1);
        const url = API.call.mock.calls[0][0].url;
        expect(url).toContain('timeoff_month=7');
        expect(url).toContain('country=1');
        expect(utils.queryByText('Please Select Month')).toBeNull();
    });

    test('export downloads the named CSV; failure dispatches alert_error', async () => {
        const clicks = [];
        const origCreate = document.createElement.bind(document);
        const spy = jest.spyOn(document, 'createElement').mockImplementation((tag) => {
            const el = origCreate(tag);
            if (tag === 'a') el.click = () => clicks.push(el.getAttribute('download'));
            return el;
        });

        const utils = render(<ViewReport user={{ id: 1 }} />);
        pickMonthYear(utils.container);
        fireEvent.click(utils.getByTestId('export-dropdown'));
        await flush();

        expect(API.call.mock.calls[0][0].url).toContain('export=1');
        expect(clicks[0]).toMatch(/^India_Payroll_Report_Jul_\d{4}\.csv$/);
        spy.mockRestore();

        API.call.mockRejectedValueOnce(new Error('HTTP 500'));
        fireEvent.click(utils.getByTestId('export-dropdown'));
        await flush();
        expect(Formatter.alert_error).toHaveBeenCalled();
    });
});

describe('ViewReportMorocco', () => {
    test('valid save fetches the Morocco allocation (country=4 with department)', async () => {
        const utils = render(<ViewReportMorocco user={{ id: 1 }} userparams={maParams} />);
        pickMonthYear(utils.container);
        fireEvent.click(utils.getByText(/Filter/));
        await flush();
        const url = API.call.mock.calls[0][0].url;
        expect(url).toContain('country=4');
        expect(url).toContain('department=');
    });

    test('export uses the Morocco CSV name; empty save trips the validators', async () => {
        const clicks = [];
        const origCreate = document.createElement.bind(document);
        const spy = jest.spyOn(document, 'createElement').mockImplementation((tag) => {
            const el = origCreate(tag);
            if (tag === 'a') el.click = () => clicks.push(el.getAttribute('download'));
            return el;
        });

        const utils = render(<ViewReportMorocco user={{ id: 1 }} userparams={maParams} />);
        fireEvent.click(utils.getByTestId('export-dropdown')); // nothing picked
        utils.getByText('Please Select Month');
        utils.getByText('Please Select Year');
        expect(API.call).not.toHaveBeenCalled();

        pickMonthYear(utils.container);
        fireEvent.click(utils.getByTestId('export-dropdown'));
        await flush();
        expect(clicks[0]).toMatch(/^Morocco_Payroll_Report_Jul_\d{4}\.csv$/);
        spy.mockRestore();
    });
});
