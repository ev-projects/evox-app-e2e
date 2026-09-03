/**
 * evoxtest_MyTeamAllRequestArmsWave18.test.js
 *
 * SOURCE FILE UNDER TEST
 *   src/container/MyTeam/MyTeamRequests/MyTeamAllRequest.js   (class MyTeamAllRequests)
 *
 * MENU PATH
 *   My Team -> Overall Requests   (url filter: my_team_requests, request_type defaults to
 *   "alteration" unless the store supplies one)
 *
 * CURRENT MEASURED COVERAGE (17 Aug run)
 *   8 uncovered functions / 6 uncovered branches. Five of the functions are the connect wiring,
 *   taken by evoxtest_MyTeamReportConnectWiringWave18.test.js. This suite takes the reachable
 *   branch arms:
 *     lines 61-62   the date keys inside the BULK path (the default path's copies of the same
 *                   two cases are already covered; the bulk loop has its own pair)
 *     line 172      componentDidUpdate with and without a department list in the response
 *     line 232      the status counters when the numbers endpoint omits a status
 *   and the request_type default that decides which tab the screen opens on.
 *
 * HOW THE BULK TEST DRIVES THE SCREEN
 *   The bulk-with-dates case calls ref.current.onSubmitHandler(values) directly. Those values are
 *   exactly what the form produces — the two <InputDate> fields write valid_from/valid_to into
 *   Formik and the Update button sets action="bulk_action" — but going through the mocked
 *   datepicker cannot set a Formik date, so the handler is called with the values the UI would
 *   have built. Read it as a statement about the handler, not about Formik validation.
 *
 * FINDINGS
 *   MTAR-DEADARM-1  MyTeamAllRequest.js:122-123 — componentDidMount formats valid_from/valid_to
 *                   "if valid", but the constructor hard-codes both to null (lines 30-31) and
 *                   nothing runs between the two. The true arm of both ternaries is unreachable;
 *                   the mount fetch always goes out with a null date range. Not tested.
 *   MTAR-DEADARM-2  MyTeamAllRequest.js:214-224 and 603-608 — the <Field> pagination array and
 *                   the resetValues helper it calls are dead for the same reason as in
 *                   MyTeamRequests.js: the <Pagination> that rendered them is commented out.
 *                   Three uncovered functions that a fix should delete rather than test.
 *
 * ADDITIVE ONLY — no existing test file touched, no application source changed.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
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
jest.mock('../../components/Template/Paginate', () => () => <div data-testid="paginate" />);
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate: ({ name }) => <input name={name} type="date" />,
    InputTime: ({ name }) => <input name={name} type="time" />,
}));
jest.mock('../../services/Authenticator', () => ({
    scanFeature: jest.fn(() => true),
    scanLevel:   jest.fn(() => true),
}));
jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading" />);
jest.mock('react-bootstrap', () => {
    const React = require('react');
    const passthrough = ({ children }) => <div>{children}</div>;
    return {
        Container: passthrough, Col: passthrough, Row: passthrough,
        Table: ({ children }) => <table>{children}</table>,
        Button: ({ children, onClick, type }) => <button onClick={onClick} type={type}>{children}</button>,
        Badge: ({ children, className }) => <span className={className}>{children}</span>,
        Tabs: ({ children }) => <div data-testid="tabs">{children}</div>,
        Tab: ({ children, title }) => <div data-testid={`tab-${title}`}>{children}</div>,
        Pagination: ({ children }) => <div>{children}</div>,
        FormControl: (props) => <input {...props} />,
        ToggleButton: ({ children, onClick, checked }) => (
            <button onClick={onClick} data-checked={String(checked)}>{children}</button>
        ),
        ButtonGroup: ({ children }) => <div>{children}</div>,
    };
});
jest.mock('../../store/actions/filters/requestListActions', () => ({
    fetchRequestList:   jest.fn(() => Promise.resolve()),
    fetchStatusNumbers: jest.fn(() => Promise.resolve()),
    bulkRequest:        jest.fn(() => Promise.resolve()),
}));

global.links = new Proxy({}, { get: () => '/x/' });

const MyTeamAllRequests = require('../../container/MyTeam/MyTeamRequests/MyTeamAllRequest').default;

const loadedList = (department) => ({
    result: { data: [], last_page: 1, current_page: 1, ...(department ? { department } : {}) },
    record_number: '0',
});

function renderAll(props = {}) {
    const ref = React.createRef();
    const actions = {
        fetchRequestList: jest.fn(() => Promise.resolve()),
        fetchStatusNumbers: jest.fn(() => Promise.resolve()),
        bulkRequest: jest.fn(() => Promise.resolve()),
    };
    const merged = {
        user: { id: 1, full_name: 'Manager', departments_handled_strict: [] },
        requestList: loadedList([{ id: 5, DepartmentName: 'Engineering' }]),
        isListLoaded: true,
        isNumbersLoaded: true,
        statusNumbers: { pending: 3, approved: 4, canceled: 1, declined: 1 },
        filters: null,
        requesttype: null,
        settings: { current_payroll_cutoff: { start_date: '2026-08-01', end_date: '2026-08-15' } },
        ...actions,
        ...props,
    };
    const utils = render(
        <MemoryRouter><MyTeamAllRequests ref={ref} {...merged} /></MemoryRouter>
    );
    return { ...utils, ref, actions, merged };
}

beforeEach(() => jest.clearAllMocks());

describe('MyTeamAllRequest — which tab the screen opens on', () => {
    test('with no request type in the store the screen opens on Alteration', () => {
        const { ref } = renderAll({ requesttype: null });
        expect(ref.current.state.filters.request_type).toBe('alteration');
    });

    test('a request type left in the store reopens that tab', () => {
        const { ref } = renderAll({ requesttype: 'overtime' });
        expect(ref.current.state.filters.request_type).toBe('overtime');
    });

    test('the mount fetch always goes out with a null date range and the my_team_requests url', () => {
        const { actions } = renderAll();
        expect(actions.fetchRequestList).toHaveBeenCalledTimes(1);
        const sent = actions.fetchRequestList.mock.calls[0][0];
        expect(sent.url).toBe('my_team_requests');
        expect(sent.valid_from).toBeNull();
        expect(sent.valid_to).toBeNull();
        expect(sent.request_type).toBe('alteration');
    });
});

describe('MyTeamAllRequest — the bulk approve / deny path', () => {
    test('a bulk update formats the date range and forwards it, then refreshes the list', async () => {
        const { ref, actions } = renderAll();
        actions.fetchRequestList.mockClear(); // drop the mount fetch

        await ref.current.onSubmitHandler({
            action: 'bulk_action',
            bulk_action: 'approve',
            checkedList: ['1.alter_logs', '2.overtimes'],
            valid_from: new Date(2026, 7, 1),
            valid_to: new Date(2026, 7, 15),
            status: 'pending',
            page: 1,
        });

        expect(actions.bulkRequest).toHaveBeenCalledTimes(1);
        const sent = actions.bulkRequest.mock.calls[0][0];
        expect(sent.valid_from).toBe('2026-08-01');
        expect(sent.valid_to).toBe('2026-08-15');
        expect(sent.bulk_action).toBe('approve');
        expect(sent.checkedList).toEqual(['1.alter_logs', '2.overtimes']);
        expect(sent.url).toBe('my_team_requests');

        // the refresh reuses the very same payload
        expect(actions.fetchRequestList).toHaveBeenCalledTimes(1);
        expect(actions.fetchRequestList.mock.calls[0][0]).toBe(sent);
    });

    test('a bulk update clears the selection so the next screen paint starts unchecked', async () => {
        const { ref } = renderAll();
        const values = {
            action: 'bulk_action', bulk_action: 'deny',
            checkedList: ['1.alter_logs'], valid_from: null, valid_to: null,
        };
        await ref.current.onSubmitHandler(values);
        expect(values.checkedList).toEqual([]);
        expect(values.action).toBe('');
    });

    test('a null date range is dropped from the bulk payload rather than sent as "Invalid date"', async () => {
        const { ref, actions } = renderAll();
        await ref.current.onSubmitHandler({
            action: 'bulk_action', bulk_action: 'approve',
            checkedList: ['1.alter_logs'], valid_from: null, valid_to: null,
        });
        const sent = actions.bulkRequest.mock.calls[0][0];
        expect(sent).not.toHaveProperty('valid_from');
        expect(sent).not.toHaveProperty('valid_to');
    });

    test('a failed bulk update is swallowed and the list is NOT refreshed', async () => {
        const { ref, actions } = renderAll();
        actions.fetchRequestList.mockClear();
        actions.bulkRequest.mockRejectedValueOnce(new Error('HTTP 500'));

        await ref.current.onSubmitHandler({
            action: 'bulk_action', bulk_action: 'approve', checkedList: ['1.alter_logs'],
        });

        expect(actions.bulkRequest).toHaveBeenCalledTimes(1);
        expect(actions.fetchRequestList).not.toHaveBeenCalled();
    });
});

describe('MyTeamAllRequest — the department dropdown fed by componentDidUpdate', () => {
    const rerenderWith = (utils, requestList) => utils.rerender(
        <MemoryRouter><MyTeamAllRequests ref={utils.ref} {...utils.merged} requestList={requestList} /></MemoryRouter>
    );

    test('departments returned with the list fill the dropdown', () => {
        const utils = renderAll();
        rerenderWith(utils, loadedList([
            { id: 5, DepartmentName: 'Engineering' },
            { id: 6, DepartmentName: 'Support' },
        ]));
        const labels = Array.from(
            utils.container.querySelectorAll('select[name="department_id"] option')
        ).map((o) => o.label);
        expect(labels).toEqual(['- Department -', 'Engineering', 'Support']);
    });

    test('a response without a department key leaves the dropdown at its placeholder', () => {
        const utils = renderAll();
        rerenderWith(utils, loadedList(null));
        expect(utils.container.querySelectorAll('select[name="department_id"] option')).toHaveLength(1);
    });
});

describe('MyTeamAllRequest — the status counters', () => {
    test('the counters print what the endpoint returned', () => {
        const { container } = renderAll({
            isNumbersLoaded: true,
            statusNumbers: { pending: 9, approved: 8, canceled: 7, declined: 6 },
        });
        expect(Array.from(container.querySelectorAll('.counter-request')).map((b) => b.textContent))
            .toEqual(['9', '8', '7', '6']);
    });

    test('a status the endpoint omitted counts as zero', () => {
        const { container } = renderAll({
            isNumbersLoaded: true,
            statusNumbers: { canceled: 7 },
        });
        expect(Array.from(container.querySelectorAll('.counter-request')).map((b) => b.textContent))
            .toEqual(['0', '0', '7', '0']);
    });
});
