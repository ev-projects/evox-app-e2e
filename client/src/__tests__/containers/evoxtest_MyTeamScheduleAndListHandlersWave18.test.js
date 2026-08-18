/**
 * evoxtest_MyTeamScheduleAndListHandlersWave18.test.js
 *
 * SOURCE FILES UNDER TEST
 *   src/container/MyTeam/MyTeamSchedule/MyTeamSchedule.js   (handler level only)
 *   src/container/MyTeam/EmployeeList/EmployeeList.js       (handler level only)
 *
 * MENU PATH
 *   My Team -> Team Schedule
 *   My Team -> Employee List
 *
 * CURRENT MEASURED COVERAGE (17 Aug run)
 *   MyTeamSchedule  6 uncovered functions / 8 uncovered branches
 *   EmployeeList    5 uncovered functions / 2 uncovered branches
 *   Five of MyTeamSchedule's six and four of EmployeeList's five are connect wiring, taken by
 *   evoxtest_MyTeamReportConnectWiringWave18.test.js. What is left here:
 *     MyTeamSchedule.js:38-52  onSubmitHandler and its four branch arms (start_date / end_date /
 *                              default / the null-or-empty skip)
 *     EmployeeList.js:78       the empty-department arm of departmentSelectedforSub
 *
 * WHY NOTHING IS RENDERED
 *   Both classes are instantiated directly instead of mounted. For EmployeeList that keeps the
 *   test on the two department handlers. For MyTeamSchedule it is deliberate: the existing
 *   MyTeamScheduleLifecycle suite is known to fail intermittently in full runs, and mounting the
 *   same grid a second time would put that flake into this file too. Both handlers are plain
 *   class-property arrows assigned in the constructor, so a direct instance exercises exactly
 *   the code the screen runs.
 *
 * FINDINGS
 *   MTS-DEAD-SUBMIT  MyTeamSchedule.js:38 onSubmitHandler has NO caller. The Filter button
 *                    (line 237) is wired to filterSchedule (line 35), which calls handleSubmit
 *                    (line 84) — a near-identical copy that reads this.state instead of the
 *                    values argument. There is no <Formik onSubmit> in this file. The handler
 *                    below is therefore dead code that duplicates handleSubmit; a fix should
 *                    delete it rather than keep both. Its contract is asserted here so that
 *                    whichever of the two survives is known to behave this way.
 *   MTS-NOSTATUS     MyTeamSchedule.js:521 — the `no_status` arm of displayStatus is still
 *                    uncovered after this wave. Reaching it needs the month/week grid mounted
 *                    with a crafted team_schedule payload, which is exactly the render path
 *                    that flakes. Deliberately not taken; flagged for a dedicated pass.
 *
 * ADDITIVE ONLY — no existing test file touched, no application source changed.
 */

import React from 'react';
import moment from 'moment';
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
jest.mock('../../components/Template/ReportNavigator/ReportNavigator.js', () => () => null);
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate: ({ name }) => <input type="date" name={name} />,
    InputTime: ({ name }) => <input type="time" name={name} />,
}));
jest.mock('react-select', () => () => null);
jest.mock('../../services/Authenticator', () => ({
    scanLevel: jest.fn(() => true), scanFeature: jest.fn(() => true),
}));
jest.mock('../../store/actions/filters/myTeamActions', () => ({
    fetchTeamSchedule: jest.fn(),
    fetchMyTeamList: jest.fn(),
    fetchTeamUnderDepartment: jest.fn(),
    fetchSubDepartmentUnderDepartment: jest.fn(),
}));

global.links = new Proxy({}, { get: () => '/x/' });

const MyTeamSchedule = require('../../container/MyTeam/MyTeamSchedule/MyTeamSchedule').default;
const EmployeeList = require('../../container/MyTeam/EmployeeList/EmployeeList').default;

/* ============================================================== MyTeamSchedule */

describe('MyTeamSchedule — the schedule filter payload (MTS-DEAD-SUBMIT)', () => {
    const makeSchedule = () => {
        const fetchTeamSchedule = jest.fn();
        const props = {
            user: { id: 7, departments_handled: [{ id: 5, department_name: 'Engineering' }] },
            team: { filters: {}, team_list: [], day: [] },
            myTeamList: { filters: {}, sub_department: [] },
            fetchTeamSchedule,
            fetchTeamUnderDepartment: jest.fn(),
            fetchSubDepartmentUnderDepartment: jest.fn(),
        };
        return { instance: new MyTeamSchedule(props), fetchTeamSchedule };
    };

    test('the two moment dates are serialised to plain YYYY-MM-DD and everything else passes through', () => {
        const { instance, fetchTeamSchedule } = makeSchedule();

        instance.onSubmitHandler({
            start_date: moment('2026-08-17'),
            end_date: moment('2026-08-23'),
            department_id: 5,
            team_id: 3,
            scope_type: 'week',
        });

        expect(fetchTeamSchedule).toHaveBeenCalledTimes(1);
        expect(fetchTeamSchedule).toHaveBeenCalledWith({
            start_date: '2026-08-17',
            end_date: '2026-08-23',
            department_id: 5,
            team_id: 3,
            scope_type: 'week',
        });
    });

    test('a filter the manager left blank is dropped instead of being sent as null or empty', () => {
        const { instance, fetchTeamSchedule } = makeSchedule();

        instance.onSubmitHandler({
            start_date: moment('2026-08-17'),
            end_date: moment('2026-08-17'),
            department_id: 5,
            name: null,
            team_id: '',
            sub_department_id: undefined,
            scope_type: 'day',
        });

        const sent = fetchTeamSchedule.mock.calls[0][0];
        expect(sent).toEqual({
            start_date: '2026-08-17', end_date: '2026-08-17',
            department_id: 5, scope_type: 'day',
        });
        expect(sent).not.toHaveProperty('name');
        expect(sent).not.toHaveProperty('team_id');
        expect(sent).not.toHaveProperty('sub_department_id');
    });

    test('a false flag is dropped as well, so show_more never travels as false', () => {
        // The guard is `!= ""`, and false == "" in JS, so a boolean false is filtered out
        // exactly like an empty string. show_more only ever reaches the server as true.
        const { instance, fetchTeamSchedule } = makeSchedule();

        instance.onSubmitHandler({
            start_date: moment('2026-08-17'),
            end_date: moment('2026-08-17'),
            department_id: 5,
            show_more: false,
        });

        expect(fetchTeamSchedule.mock.calls[0][0]).not.toHaveProperty('show_more');

        instance.onSubmitHandler({
            start_date: moment('2026-08-17'),
            end_date: moment('2026-08-17'),
            department_id: 5,
            show_more: true,
        });

        expect(fetchTeamSchedule.mock.calls[1][0].show_more).toBe(true);
    });

    test('the constructor opens the screen on today, scoped to the first department handled', () => {
        const { instance } = makeSchedule();
        expect(instance.state.department_id).toBe(5);
        expect(instance.state.scope_type).toBe('day');
        expect(instance.state.show_more).toBe(false);
    });

    test('a manager who handles no department opens the screen with no department scope', () => {
        const props = {
            user: { id: 7, departments_handled: [] },
            team: { filters: {}, team_list: [], day: [] },
            myTeamList: { filters: {} },
            fetchTeamSchedule: jest.fn(),
        };
        const instance = new MyTeamSchedule(props);
        expect(instance.state.department_id).toBeNull();
    });
});

/* ================================================================ EmployeeList */

describe('EmployeeList — the department drilldowns', () => {
    const makeList = () => {
        const props = {
            user: { id: 7, departments_handled: [{ id: 5, department_name: 'Engineering' }] },
            myTeamList: { list: null, filters: {} },
            fetchMyTeamList: jest.fn(),
            fetchTeamUnderDepartment: jest.fn(),
            fetchSubDepartmentUnderDepartment: jest.fn(),
        };
        return { instance: new EmployeeList(props), props };
    };

    test('choosing a department loads its teams and its sub-departments for the logged in user', () => {
        const { instance, props } = makeList();

        instance.departmentSelected('5');
        expect(props.fetchTeamUnderDepartment).toHaveBeenCalledWith(7, '5');

        instance.departmentSelectedforSub('5');
        expect(props.fetchSubDepartmentUnderDepartment).toHaveBeenCalledWith(7, '5');
    });

    test('clearing the department back to the placeholder fetches nothing', () => {
        const { instance, props } = makeList();

        instance.departmentSelected('');
        instance.departmentSelectedforSub('');

        expect(props.fetchTeamUnderDepartment).not.toHaveBeenCalled();
        expect(props.fetchSubDepartmentUnderDepartment).not.toHaveBeenCalled();
    });

    test('the filter submit drops blank filters and sends the rest under the user id', () => {
        const { instance, props } = makeList();

        instance.onSubmitHandler({
            status: 1, department_id: 5, sub_department_id: '',
            job_title: null, name: 'ann', page: 2, url: 'MyTeam',
        });

        expect(props.fetchMyTeamList).toHaveBeenCalledTimes(1);
        const [userId, sent] = props.fetchMyTeamList.mock.calls[0];
        expect(userId).toBe(7);
        expect(sent).toEqual({ status: 1, department_id: 5, name: 'ann', page: 2, url: 'MyTeam' });
    });

    test('the previous filter set is restored from the store when the screen is reopened', () => {
        const props = {
            user: { id: 7, departments_handled: [] },
            myTeamList: {
                list: null,
                filters: { department_id: 9, sub_department_id: 4, job_title: 'QA', name: 'bob', page: 3, order_by: 'name' },
            },
            fetchMyTeamList: jest.fn(),
        };
        const instance = new EmployeeList(props);
        expect(instance.state.filters).toEqual({
            status: 1, department_id: 9, sub_department_id: 4, job_title: 'QA',
            name: 'bob', page: 3, order_by: 'name', url: 'MyTeam',
        });
    });
});
