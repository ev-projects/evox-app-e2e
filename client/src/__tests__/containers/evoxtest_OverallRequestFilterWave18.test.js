/**
 * evoxtest_OverallRequestFilterWave18.test.js
 *
 * SOURCE FILE UNDER TEST
 *   src/container/MyTeam/OverallRequest.js
 *
 * MENU PATH
 *   My Team -> Overall Request   (global.links.overallrequest)
 *
 * CURRENT MEASURED COVERAGE (17 Aug run)
 *   2 uncovered functions / 3 uncovered branches. One of the two functions is mapStateToProps,
 *   taken by evoxtest_MyTeamReportConnectWiringWave18.test.js. The other is the To-date input's
 *   onChange (OverallRequest.js:63), covered here together with the payroll-cutoff prefill arms
 *   and the department dropdown.
 *
 * DATES
 *   The cutoff strings are parsed with Date.parse (UTC midnight) and printed with date-fns
 *   format (local). Run with TZ=Asia/Manila as CI pins it; on a positive UTC offset the calendar
 *   day is unchanged, which is what the assertions below encode. No assertion reads the clock.
 *
 * FINDINGS
 *   OR-DEADARM  OverallRequest.js:166-203 — the local Status component has four switch arms
 *               (Pending / Canceled / Approved / Declined) but the single table row is
 *               hard-coded to <Status status={"Pending"} /> (line 136) and the row loop that
 *               would have varied it is commented out (lines 121-122, 154). The Canceled,
 *               Approved and Declined arms (lines 177, 185, 193) cannot be produced by any
 *               state of this screen. Not tested; recorded so the next pass does not chase them.
 *               The whole screen is still a hard-coded mock-up: one fabricated row for
 *               "Lakshmanaswamy S" with the Filter and Reset buttons wired to nothing.
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
jest.mock('react-bootstrap', () => {
    const React = require('react');
    const passthrough = ({ children }) => <div>{children}</div>;
    return {
        Container: passthrough, Col: passthrough, Row: passthrough,
        Table: ({ children }) => <table>{children}</table>,
        Tabs: passthrough, Tab: passthrough,
        Badge: ({ children, variant }) => <span data-variant={variant}>{children}</span>,
        Button: ({ children, onClick, type }) => <button type={type} onClick={onClick}>{children}</button>,
        Pagination: passthrough,
        FormControl: (props) => <input {...props} />,
        ToggleButton: ({ children }) => <button>{children}</button>,
        ButtonGroup: passthrough,
    };
});

global.links = new Proxy({}, { get: () => '/x/' });

const OverallRequest = require('../../container/MyTeam/OverallRequest').default;

const CUTOFF = { start_date: '2026-08-01', end_date: '2026-08-15' };

function renderOR(props = {}) {
    return render(
        <MemoryRouter>
            <OverallRequest
                user={{ id: 1, departments_handled: [{ id: 5, department_name: 'Engineering' }] }}
                myTeamList={{ list: null }}
                settings={{ current_payroll_cutoff: CUTOFF }}
                payrollcut={CUTOFF}
                {...props}
            />
        </MemoryRouter>
    );
}

const dateInputs = (container) => container.querySelectorAll('input[type="date"]');

describe('OverallRequest — the date range', () => {
    test('the current payroll cutoff prefills both ends of the range on open', () => {
        const { container } = renderOR();
        const [from, to] = dateInputs(container);
        expect(from.value).toBe('2026-08-01');
        expect(to.value).toBe('2026-08-15');
    });

    test('with no payroll cutoff in the store both date boxes open empty', () => {
        const { container } = renderOR({ payrollcut: undefined, settings: {} });
        const [from, to] = dateInputs(container);
        expect(from.value).toBe('');
        expect(to.value).toBe('');
    });

    test('picking a new To date replaces only the end of the range', () => {
        const { container } = renderOR();
        const [from, to] = dateInputs(container);

        fireEvent.change(to, { target: { value: '2026-09-30' } });

        expect(dateInputs(container)[1].value).toBe('2026-09-30');
        expect(dateInputs(container)[0].value).toBe('2026-08-01'); // From untouched
        expect(from.value).toBe('2026-08-01');
    });

    test('picking a new From date replaces only the start of the range', () => {
        const { container } = renderOR();
        fireEvent.change(dateInputs(container)[0], { target: { value: '2026-07-16' } });

        expect(dateInputs(container)[0].value).toBe('2026-07-16');
        expect(dateInputs(container)[1].value).toBe('2026-08-15'); // To untouched
    });

    test('both ends can be re-picked independently in one sitting', () => {
        const { container } = renderOR();
        fireEvent.change(dateInputs(container)[0], { target: { value: '2026-07-16' } });
        fireEvent.change(dateInputs(container)[1], { target: { value: '2026-07-31' } });

        expect(dateInputs(container)[0].value).toBe('2026-07-16');
        expect(dateInputs(container)[1].value).toBe('2026-07-31');
    });
});

describe('OverallRequest — the department dropdown', () => {
    test('one option per department the manager handles, under the placeholder', () => {
        const { container } = renderOR({
            user: {
                id: 1,
                departments_handled: [
                    { id: 5, department_name: 'Engineering' },
                    { id: 6, department_name: 'Support' },
                ],
            },
        });
        const options = container.querySelectorAll('select[name="department_id"] option');
        expect(options).toHaveLength(3);
        expect(options[0]).toHaveAttribute('label', '- Department -');
        expect(options[1]).toHaveAttribute('value', '5');
        expect(options[2]).toHaveAttribute('label', 'Support');
    });

    test('a manager handling no departments gets the placeholder only', () => {
        const { container } = renderOR({ user: { id: 1, departments_handled: [] } });
        expect(container.querySelectorAll('select[name="department_id"] option')).toHaveLength(1);
    });
});
