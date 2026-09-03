/**
 * evoxtest_RequestListsDeep3.test.js
 * Sources under test:
 *   src/container/MyRequests/MyRequests.js              Menu: My Requests
 *   src/container/MyOverallRequest/MyOverallRequest.js  Menu: My Requests -> Overall
 *
 * Wave-6 residue after evoxtest_MyRequestsDeep_frontend and evoxtest_MyOverallRequestDeep2:
 * MyRequests 8 fns / 6 branch arms, MyOverallRequest 6 fns / 3 branch arms. What is left on
 * MyRequests is the filter bar itself — the tab strip, the four status toggles and the Filter
 * button, i.e. every control that re-queries the list — plus the date range the page starts on
 * and the status counters. What is left on MyOverallRequest is its store wiring and the same
 * counter fallback.
 *
 * Two functions in each file (the `pagination` array built at MyRequests.js:92-104 and
 * MyOverallRequest.js:93-105) are unreachable: the array is assembled on every render and then
 * never placed in the tree — both pages paginate through <Paginate/> instead. Dead code, left
 * uncovered deliberately.
 *
 * ADDITIVE ONLY — no existing test, mock or app file is touched.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: (mapStateToProps, mapDispatchToProps) => (Component) => {
        Component.__mapStateToProps = mapStateToProps;
        Component.__mapDispatchToProps = mapDispatchToProps;
        return Component;
    },
}));

jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader:  ({ children }) => <div>{children}</div>,
    Content:          ({ children }) => <div>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
}));
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/Template/Paginate', () => () => <div data-testid="paginate" />);
jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading" />);
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate: ({ name }) => <input type="date" name={name} />,
    InputTime: ({ name }) => <input type="time" name={name} />,
}));

// Tabs/ToggleButton stand-ins that expose the real onSelect / onClick wiring.
jest.mock('react-bootstrap', () => {
    const React = require('react');
    const passthrough = ({ children }) => <div>{children}</div>;
    return {
        Container: passthrough, Col: passthrough, Row: passthrough,
        Table: ({ children }) => <table>{children}</table>,
        Button: ({ children, onClick, type }) => <button onClick={onClick} type={type}>{children}</button>,
        Badge: ({ children, className }) => <span className={className}>{children}</span>,
        Tabs: ({ children, onSelect, defaultActiveKey }) => (
            <div data-testid="tabs" data-active={String(defaultActiveKey)}>
                {React.Children.map(children, (child) => (
                    <button
                        data-testid={`tab-${child.props.eventKey}`}
                        onClick={() => onSelect && onSelect(child.props.eventKey)}
                    >
                        {child.props.title}
                    </button>
                ))}
            </div>
        ),
        Tab: ({ children }) => <div>{children}</div>,
        Pagination: passthrough,
        FormControl: (props) => <input {...props} />,
        ToggleButton: ({ children, onClick, checked }) => (
            <button data-testid="status-toggle" data-checked={String(checked)} onClick={onClick}>{children}</button>
        ),
        ButtonGroup: ({ children }) => <div data-testid="button-group">{children}</div>,
    };
});

jest.mock('../../store/actions/filters/requestListActions', () => ({
    fetchRequestList:   jest.fn((p) => ({ type: 'LIST_FETCH', p })),
    fetchStatusNumbers: jest.fn((p) => ({ type: 'NUMBERS_FETCH', p })),
    bulkRequest:        jest.fn((p) => ({ type: 'BULK', p })),
}));

const MyRequests = require('../../container/MyRequests/MyRequests').default;
const MyOverallRequest = require('../../container/MyOverallRequest/MyOverallRequest').default;
const requestListActions = require('../../store/actions/filters/requestListActions');

global.links = {
    base: '/', alter_log: '/r/AlterLog/', alter_log_punch: '/r/AlterLogPunch/',
    overtime: '/r/Overtime/', rest_day_work: '/r/RestDayWork/', change_schedule: '/r/ChangeSchedule/',
};

const rows = [
    {
        id: 1, table_name: 'alter_logs', status: 'Pending',
        created_at: '2026-08-01', date_requested: '2026-08-01', employee_note: 'forgot to punch out',
        updated_by: null, updated_at: null,
        fourth_column: { current_time_in: '08:00', current_time_out: '17:00' },
        fifth_column: { new_time_in: '08:30', new_time_out: '17:30' },
    },
    {
        id: 2, table_name: 'overtimes', status: 'Approved',
        created_at: '2026-08-02', date_requested: '2026-08-02', employee_note: null,
        updated_by: 'Gary', updated_at: '2026-08-03',
        fourth_column: '2 hours', fifth_column: '19:00-21:00',
    },
];

const requestList = { result: { data: rows, last_page: 2, current_page: 1 }, record_number: '1-2 of 2' };

const flush = async () => { await act(async () => { await Promise.resolve(); }); };
const lastCall = (fn) => fn.mock.calls[fn.mock.calls.length - 1][0];

function renderMyRequests(props = {}) {
    const fetchRequestList = jest.fn();
    const fetchStatusNumbers = jest.fn();
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter>
            <MyRequests
                ref={ref}
                requestList={requestList}
                isListLoaded
                isNumbersLoaded
                statusNumbers={{ pending: 3, approved: 4, canceled: 1, declined: 2 }}
                filters={null}
                settings={{ current_payroll_cutoff: { start_date: '2026-07-16', end_date: '2026-08-15' } }}
                fetchRequestList={fetchRequestList}
                fetchStatusNumbers={fetchStatusNumbers}
                {...props}
            />
        </MemoryRouter>
    );
    return { ...utils, ref, fetchRequestList, fetchStatusNumbers };
}

beforeEach(() => jest.clearAllMocks());

describe('My Requests — the date range the page opens on', () => {
    test('with no saved filters the range is the current payroll cut-off', () => {
        const { fetchRequestList, fetchStatusNumbers } = renderMyRequests({ isListLoaded: false });

        expect(fetchRequestList).toHaveBeenCalledTimes(1);
        expect(fetchStatusNumbers).toHaveBeenCalledTimes(1);
        const sent = fetchRequestList.mock.calls[0][0];
        expect(sent.valid_from).toBe('2026-07-16');
        expect(sent.valid_to).toBe('2026-08-15');
        expect(sent.status).toBe('pending');
        expect(sent.request_type).toBe('all');
        expect(sent.url).toBe('my_requests');
    });

    test('a saved filter range wins over the payroll cut-off', () => {
        const { fetchRequestList } = renderMyRequests({
            isListLoaded: false,
            filters: { valid_from: '2026-05-01', valid_to: '2026-05-31', status: 'approved', page: 2, request_type: 'overtime' },
        });

        const sent = fetchRequestList.mock.calls[0][0];
        expect(sent.valid_from).toBe('2026-05-01');
        expect(sent.valid_to).toBe('2026-05-31');
        expect(sent.status).toBe('approved');
        expect(sent.page).toBe(2);
        expect(sent.request_type).toBe('overtime');
    });

    test('with neither a saved range nor a cut-off the dates are sent empty', () => {
        const { fetchRequestList } = renderMyRequests({ isListLoaded: false, settings: {} });

        const sent = fetchRequestList.mock.calls[0][0];
        expect(sent.valid_from).toBeNull();
        expect(sent.valid_to).toBeNull();
    });

    test('an already-loaded list is not re-fetched on mount', () => {
        const { fetchRequestList, fetchStatusNumbers } = renderMyRequests();
        expect(fetchRequestList).not.toHaveBeenCalled();
        expect(fetchStatusNumbers).not.toHaveBeenCalled();
    });
});

describe('My Requests — the filter bar', () => {
    test('choosing a request-type tab re-queries the list for that type', async () => {
        const { getByTestId, fetchRequestList, fetchStatusNumbers } = renderMyRequests();

        fireEvent.click(getByTestId('tab-overtime'));
        await flush();

        expect(lastCall(fetchRequestList).request_type).toBe('overtime');
        expect(lastCall(fetchStatusNumbers).request_type).toBe('overtime');

        fireEvent.click(getByTestId('tab-alter_logs_punches'));
        await flush();
        expect(lastCall(fetchRequestList).request_type).toBe('alter_logs_punches');
    });

    test('each status toggle re-queries that status and sends the user back to page 1', async () => {
        const { getAllByTestId, fetchRequestList } = renderMyRequests({
            filters: { status: 'pending', page: 4 },
        });
        const [pending, approved, cancelled, declined] = getAllByTestId('status-toggle');

        expect(pending.getAttribute('data-checked')).toBe('true');
        expect(approved.getAttribute('data-checked')).toBe('false');

        fireEvent.click(approved);
        await flush();
        expect(lastCall(fetchRequestList).status).toBe('approved');
        expect(lastCall(fetchRequestList).page).toBe(1);

        fireEvent.click(cancelled);
        await flush();
        expect(lastCall(fetchRequestList).status).toBe('canceled');

        fireEvent.click(declined);
        await flush();
        expect(lastCall(fetchRequestList).status).toBe('declined');

        fireEvent.click(pending);
        await flush();
        expect(lastCall(fetchRequestList).status).toBe('pending');
    });

    test('the Filter button re-queries the chosen range from the first page', async () => {
        const { getByText, container, fetchRequestList } = renderMyRequests({
            filters: { page: 5, status: 'pending' },
        });

        fireEvent.click(getByText('Filter'));
        await act(async () => { fireEvent.submit(container.querySelector('form')); });

        expect(fetchRequestList).toHaveBeenCalled();
        expect(lastCall(fetchRequestList).page).toBe(1);
        expect(lastCall(fetchRequestList).valid_from).toBe('2026-07-16');
    });

    test('an empty field is dropped from the query rather than sent as a blank', async () => {
        const { ref, container, fetchRequestList } = renderMyRequests();

        act(() => {
            ref.current.setState({
                filters: { ...ref.current.state.filters, name: '', department_id: null, status: 'approved' },
            });
        });
        await act(async () => { fireEvent.submit(container.querySelector('form')); });

        const sent = lastCall(fetchRequestList);
        expect(sent.status).toBe('approved');
        expect(sent).not.toHaveProperty('name');
        expect(sent).not.toHaveProperty('department_id');
    });
});

describe('My Requests — the list itself', () => {
    test('the status counters show the numbers the server returned', () => {
        const { container } = renderMyRequests();
        const counters = Array.from(container.querySelectorAll('.counter-request')).map((b) => b.textContent);
        expect(counters).toEqual(['3', '4', '1', '2']);
    });

    test('a status the server did not count shows zero rather than nothing', () => {
        const { container } = renderMyRequests({ statusNumbers: { approved: 4 } });
        const counters = Array.from(container.querySelectorAll('.counter-request')).map((b) => b.textContent);
        expect(counters).toEqual(['0', '4', '0', '0']);
    });

    test('the counters stay at zero until the numbers have loaded', () => {
        const { container } = renderMyRequests({ isNumbersLoaded: false });
        const counters = Array.from(container.querySelectorAll('.counter-request')).map((b) => b.textContent);
        expect(counters).toEqual(['0', '0', '0', '0']);
    });

    test('each request links to its own form and shows both sides of the change', () => {
        const { container, getByText } = renderMyRequests();

        expect(container.querySelectorAll('tbody tr').length).toBe(2);
        getByText('In: 08:30');       // requested time
        getByText('In: 08:00');       // current time
        getByText('2 hours');
        expect(container.querySelector('tbody tr a').getAttribute('href')).toBe('/r/AlterLog/1');
        getByText('1-2 of 2');
        expect(container.textContent).toContain('forgot to punch out');
    });

    test('an empty list says so, and an unloaded list shows the loader', () => {
        const empty = renderMyRequests({ requestList: { result: { data: [], last_page: 1, current_page: 1 }, record_number: '0' } });
        expect(empty.container.textContent).toMatch(/No Record Found/i);

        const loading = renderMyRequests({ isListLoaded: false });
        expect(loading.container.querySelector('[data-testid="page-loading"]')).not.toBeNull();
    });

    test('store wiring reads the myRequestList slice and exposes both fetches', () => {
        const state = {
            myRequestList: {
                instance: requestList, isListLoaded: true, isNumbersLoaded: true,
                statusNumbers: { pending: 1 }, filters: { page: 1 },
            },
            settings: { current_payroll_cutoff: {} },
        };

        expect(MyRequests.__mapStateToProps(state)).toEqual({
            requestList: requestList, isListLoaded: true, isNumbersLoaded: true,
            statusNumbers: { pending: 1 }, filters: { page: 1 }, settings: { current_payroll_cutoff: {} },
        });

        const dispatch = jest.fn();
        const p = MyRequests.__mapDispatchToProps(dispatch);
        p.fetchRequestList({ page: 1 });
        p.fetchStatusNumbers({ page: 1 });

        expect(requestListActions.fetchRequestList).toHaveBeenCalledWith({ page: 1 });
        expect(requestListActions.fetchStatusNumbers).toHaveBeenCalledWith({ page: 1 });
        expect(dispatch.mock.calls.map((c) => c[0].type)).toEqual(['LIST_FETCH', 'NUMBERS_FETCH']);
    });
});

describe('My Overall Request', () => {
    function renderOverall(props = {}) {
        const fetchRequestList = jest.fn();
        const fetchStatusNumbers = jest.fn();
        const utils = render(
            <MemoryRouter>
                <MyOverallRequest
                    requestList={requestList}
                    isListLoaded
                    isNumbersLoaded
                    statusNumbers={{ pending: 3, approved: 4, canceled: 1, declined: 2 }}
                    filters={null}
                    requesttype={null}
                    settings={{}}
                    user={{ id: 1, departments_handled_strict: [] }}
                    fetchRequestList={fetchRequestList}
                    fetchStatusNumbers={fetchStatusNumbers}
                    {...props}
                />
            </MemoryRouter>
        );
        return { ...utils, fetchRequestList, fetchStatusNumbers };
    }

    test('the page always refreshes both the list and the counters on open', () => {
        const { fetchRequestList, fetchStatusNumbers } = renderOverall();

        expect(fetchRequestList).toHaveBeenCalledTimes(1);
        expect(fetchStatusNumbers).toHaveBeenCalledTimes(1);
        const sent = fetchRequestList.mock.calls[0][0];
        expect(sent.url).toBe('my_requests');
        expect(sent.request_type).toBe('alteration');   // default when the store has no type
        expect(sent.valid_from).toBeNull();             // this page opens with no date range
        expect(sent.valid_to).toBeNull();
    });

    test('the request type held in the store decides which tab opens', () => {
        const { fetchRequestList } = renderOverall({ requesttype: 'overtime' });
        expect(fetchRequestList.mock.calls[0][0].request_type).toBe('overtime');
    });

    test('each status toggle re-queries that status from the first page', async () => {
        const { getAllByTestId, fetchRequestList, fetchStatusNumbers } = renderOverall();
        const [pending, approved, cancelled, declined] = getAllByTestId('status-toggle');

        expect(pending.getAttribute('data-checked')).toBe('true');

        fireEvent.click(cancelled);
        await flush();
        expect(lastCall(fetchRequestList).status).toBe('canceled');
        expect(lastCall(fetchRequestList).page).toBe(1);
        expect(lastCall(fetchStatusNumbers).status).toBe('canceled');

        fireEvent.click(declined);
        await flush();
        expect(lastCall(fetchRequestList).status).toBe('declined');

        fireEvent.click(approved);
        await flush();
        expect(lastCall(fetchRequestList).status).toBe('approved');

        fireEvent.click(pending);
        await flush();
        expect(lastCall(fetchRequestList).status).toBe('pending');
    });

    test('choosing a request-type tab re-queries the list for that type', async () => {
        const { getByTestId, fetchRequestList } = renderOverall();

        fireEvent.click(getByTestId('tab-change_schedule'));
        await flush();

        expect(lastCall(fetchRequestList).request_type).toBe('change_schedule');
    });

    test('a status the server did not count shows zero rather than nothing', () => {
        const { container } = renderOverall({ statusNumbers: { declined: 2 } });
        const counters = Array.from(container.querySelectorAll('.counter-request')).map((b) => b.textContent);
        expect(counters).toEqual(['0', '0', '0', '2']);
    });

    test('store wiring reads the myRequestList slice plus the remembered request type', () => {
        const state = {
            myRequestList: {
                instance: requestList, isListLoaded: true, isNumbersLoaded: false,
                statusNumbers: {}, filters: null,
            },
            settings: { s: 1 },
            myTeamRequestList: { requesttype: 'overtime' },
        };

        expect(MyOverallRequest.__mapStateToProps(state)).toEqual({
            requestList: requestList, isListLoaded: true, isNumbersLoaded: false,
            statusNumbers: {}, filters: null, settings: { s: 1 }, requesttype: 'overtime',
        });

        const dispatch = jest.fn();
        const p = MyOverallRequest.__mapDispatchToProps(dispatch);
        p.fetchRequestList({ page: 2 });
        p.fetchStatusNumbers({ page: 2 });

        expect(requestListActions.fetchRequestList).toHaveBeenCalledWith({ page: 2 });
        expect(requestListActions.fetchStatusNumbers).toHaveBeenCalledWith({ page: 2 });
        expect(dispatch.mock.calls.map((c) => c[0].type)).toEqual(['LIST_FETCH', 'NUMBERS_FETCH']);
    });
});
