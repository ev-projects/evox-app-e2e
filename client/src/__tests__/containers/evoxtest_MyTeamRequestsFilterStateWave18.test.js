/**
 * evoxtest_MyTeamRequestsFilterStateWave18.test.js
 *
 * SOURCE FILE UNDER TEST
 *   src/container/MyTeam/MyTeamRequests/MyTeamRequests.js
 *
 * MENU PATH
 *   My Team -> Requests   (url filter: my_team_requests)
 *
 * CURRENT MEASURED COVERAGE (17 Aug run)
 *   8 uncovered functions / 11 uncovered branches. The connect wiring (5 of the 8 functions)
 *   is taken by evoxtest_MyTeamReportConnectWiringWave18.test.js. This suite takes the
 *   remaining reachable branch arms that evoxtest_MyTeamRequestsDeep2.test.js does not:
 *     lines 39/40/41  the constructor's three "restore the previous filter" coercions
 *     line 158        componentDidUpdate when the response carries no department list
 *     lines 234-237   the status counters when the numbers endpoint returns an empty object
 *     line 434        turning ShowAll back OFF (Deep2 only turns it on)
 *
 * FINDINGS
 *   MTR-DEADARM-1  MyTeamRequests.js:127-134 — `filters = first_load == true ? {cutoff} : filters`.
 *                  `first_load` is only ever written as the literal `true`
 *                  (requestListActions.js:211) or defaulted to `true` (line 47), and a `false`
 *                  value would fail the Validator.isValid guard on line 126 (Validator treats
 *                  false as invalid because `false != ""` is false). Both alternate arms are
 *                  therefore unreachable from the application. Not tested; recorded so the next
 *                  pass does not chase them.
 *   MTR-DEADARM-2  MyTeamRequests.js:549-580 — the four `?? 'N/A'` fallbacks on the
 *                  alter_log_punches times. `new Date(x).toLocaleTimeString(...)` always returns
 *                  a string, so neither the optional-chain short circuit nor the 'N/A' default
 *                  can be produced by any payload. Unreachable, not tested.
 *   MTR-DEADARM-3  MyTeamRequests.js:216-226 and 677-682 — the `pagination` array of <Field>
 *                  buttons and the `resetValues` helper it calls. The only place `pagination`
 *                  was rendered (line 643) is commented out in favour of <Paginate>, so the
 *                  Field render-prop, its Button onClick and resetValues are all dead. Three
 *                  uncovered functions that a fix should DELETE rather than test.
 *
 * ADDITIVE ONLY — no existing test file touched, no application source changed.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
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
    InputDate: ({ name }) => <input name={name} type="date" data-testid={`datepicker-${name}`} />,
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

const MyTeamRequests = require('../../container/MyTeam/MyTeamRequests/MyTeamRequests').default;

const loadedList = (department) => ({
    result: { data: [], last_page: 1, current_page: 1, ...(department ? { department } : {}) },
    record_number: '0',
});

const baseProps = {
    user: { id: 1, full_name: 'Manager', departments_handled_strict: [] },
    requestList: loadedList([{ id: 5, DepartmentName: 'Engineering' }]),
    isListLoaded: true,
    isNumbersLoaded: true,
    statusNumbers: { pending: 3, approved: 4, canceled: 1, declined: 1 },
    filters: null,
    settings: { current_payroll_cutoff: { start_date: '2026-08-01', end_date: '2026-08-15' } },
    fetchRequestList: jest.fn(() => Promise.resolve()),
    fetchStatusNumbers: jest.fn(() => Promise.resolve()),
    bulkRequest: jest.fn(() => Promise.resolve()),
};

function renderMTR(props = {}) {
    const ref = React.createRef();
    const actions = {
        fetchRequestList: jest.fn(() => Promise.resolve()),
        fetchStatusNumbers: jest.fn(() => Promise.resolve()),
        bulkRequest: jest.fn(() => Promise.resolve()),
    };
    const merged = { ...baseProps, ...actions, ...props };
    const utils = render(
        <MemoryRouter><MyTeamRequests ref={ref} {...merged} /></MemoryRouter>
    );
    return { ...utils, ref, actions, merged };
}

beforeEach(() => jest.clearAllMocks());

describe('MyTeamRequests — restoring the previous filter on re-entry', () => {
    test('a fresh visit starts unfiltered, showing every department the manager handles', () => {
        const { ref } = renderMTR({ filters: null });
        const f = ref.current.state.filters;
        expect(f.use_filter).toBe(0);
        expect(f.showall).toBe(0);
        expect(f.departmentselect).toBe(1);
        expect(f.status).toBe('pending');
        expect(f.request_type).toBe('all');
    });

    test('coming back to the screen re-applies the filter flags the manager left set', () => {
        const { ref } = renderMTR({
            filters: {
                status: 'approved', page: 3, name: 'ann',
                use_filter: 1, showall: 1, departmentselect: 1,
                request_type: 'overtime',
            },
        });
        const f = ref.current.state.filters;
        expect(f.use_filter).toBe(1);
        expect(f.showall).toBe(1);
        expect(f.departmentselect).toBe(1);
        expect(f.status).toBe('approved');
        expect(f.page).toBe(3);
        expect(f.name).toBe('ann');
        expect(f.request_type).toBe('overtime');
    });

    test('a stored departmentselect of 0 is forced back to 1, while use_filter and showall keep their 0', () => {
        // departmentselect is the only one of the three that has a non-zero default, so a
        // falsy stored value is coerced rather than preserved.
        const { ref } = renderMTR({
            filters: { use_filter: 0, showall: 0, departmentselect: 0 },
        });
        const f = ref.current.state.filters;
        expect(f.departmentselect).toBe(1);
        expect(f.use_filter).toBe(0);
        expect(f.showall).toBe(0);
    });

    test('the restored date range is used verbatim instead of the current payroll cutoff', () => {
        const { ref } = renderMTR({
            filters: { valid_from: '2026-05-01', valid_to: '2026-05-15' },
        });
        const f = ref.current.state.filters;
        expect(f.valid_from).toEqual(new Date('2026-05-01'));
        expect(f.valid_to).toEqual(new Date('2026-05-15'));
    });

    test('with no restored range and no cutoff in settings the date filter starts empty', () => {
        const { ref } = renderMTR({ filters: null, settings: {} });
        expect(ref.current.state.filters.valid_from).toBeNull();
        expect(ref.current.state.filters.valid_to).toBeNull();
    });
});

describe('MyTeamRequests — the department dropdown fed by componentDidUpdate', () => {
    const rerenderWith = (utils, requestList) => utils.rerender(
        <MemoryRouter><MyTeamRequests ref={utils.ref} {...utils.merged} requestList={requestList} /></MemoryRouter>
    );

    test('a response carrying departments fills the dropdown', () => {
        const utils = renderMTR();
        rerenderWith(utils, loadedList([
            { id: 5, DepartmentName: 'Engineering' },
            { id: 6, DepartmentName: 'Support' },
        ]));
        const labels = Array.from(
            utils.container.querySelectorAll('select[name="department_id"] option')
        ).map((o) => o.label);
        expect(labels).toEqual(['- Department -', 'Engineering', 'Support']);
    });

    test('a response with no department key at all leaves the dropdown at its placeholder', () => {
        const utils = renderMTR();
        rerenderWith(utils, loadedList(null));
        expect(utils.ref.current.state.store_departments).toEqual([]);
        expect(utils.container.querySelectorAll('select[name="department_id"] option')).toHaveLength(1);
    });

    test('an empty department array is not copied into state, so a previous list is kept', () => {
        const utils = renderMTR();
        rerenderWith(utils, loadedList([{ id: 5, DepartmentName: 'Engineering' }]));
        expect(utils.ref.current.state.store_departments).toHaveLength(1);

        rerenderWith(utils, loadedList([]));
        expect(utils.ref.current.state.store_departments).toHaveLength(1);
    });
});

describe('MyTeamRequests — the status counters', () => {
    test('the four counters print the numbers the endpoint returned', () => {
        const { container } = renderMTR({
            isNumbersLoaded: true,
            statusNumbers: { pending: 12, approved: 7, canceled: 2, declined: 5 },
        });
        const counters = Array.from(container.querySelectorAll('.counter-request'))
            .map((b) => b.textContent);
        expect(counters).toEqual(['12', '7', '2', '5']);
    });

    test('a status the endpoint omitted counts as zero rather than printing nothing', () => {
        const { container } = renderMTR({
            isNumbersLoaded: true,
            statusNumbers: { approved: 7 },
        });
        const counters = Array.from(container.querySelectorAll('.counter-request'))
            .map((b) => b.textContent);
        expect(counters).toEqual(['0', '7', '0', '0']);
    });

    test('every counter is zero while the numbers endpoint has not answered yet', () => {
        const { container } = renderMTR({
            isNumbersLoaded: false,
            statusNumbers: { pending: 12, approved: 7, canceled: 2, declined: 5 },
        });
        const counters = Array.from(container.querySelectorAll('.counter-request'))
            .map((b) => b.textContent);
        expect(counters).toEqual(['0', '0', '0', '0']);
    });
});

describe('MyTeamRequests — the ShowAll switch (Division Head / HR only)', () => {
    test('turning ShowAll off again refetches scoped to the departments handled', async () => {
        const { container, actions, findByText } = renderMTR({
            filters: { showall: 1, departmentselect: 1, use_filter: 1 },
        });
        const box = container.querySelector('.showall_checkbox');
        expect(box.checked).toBe(true);

        fireEvent.click(box);
        await findByText('My Team Request');

        expect(actions.fetchRequestList).toHaveBeenCalledTimes(1);
        const formData = actions.fetchRequestList.mock.calls[0][0];
        expect(formData.showall).toBe(0);
        expect(formData.departmentselect).toBe(1);
        expect(formData.page).toBe(1);
        expect(formData.department_id).toBeUndefined();
    });

    test('turning ShowAll on refetches across every department', async () => {
        const { container, actions, findByText } = renderMTR({
            filters: { showall: 0, departmentselect: 0 },
        });
        expect(container.querySelector('.showall_checkbox').checked).toBe(false);

        fireEvent.click(container.querySelector('.showall_checkbox'));
        await findByText('My Team Request');

        expect(actions.fetchRequestList.mock.calls[0][0].showall).toBe(1);
    });
});
