/**
 * evoxtest_MyTeamReportConnectWiringWave18.test.js
 *
 * SOURCE FILES UNDER TEST (the connect() wiring only)
 *   container/MyTeam/ManageTeams/ManageTeams.js              My Team -> Manage Team
 *   container/MyTeam/MyTeamRequests/MyTeamRequests.js        My Team -> Requests
 *   container/MyTeam/MyTeamRequests/MyTeamAllRequest.js      My Team -> Overall Requests
 *   container/MyTeam/OverallRequest.js                       My Team -> Overall Request (static)
 *   container/MyTeam/EmployeeList/EmployeeList.js            My Team -> Employee List
 *   container/MyTeam/DtrSummaryNew/DtrSummaryNew.js          My Team -> DTR Summary
 *   container/MyTeam/DtrConflictReport/DtrConflictReport.js  My Team -> DTR Conflict Report
 *   container/MyTeam/DtrLogs/DtrLogs.js                      My Team -> DTR Logs
 *   container/MyTeam/DtrMultiLogsSummary/DtrMultiLogsSummary.js  My Team -> DTR Multi Logs
 *   container/MyTeam/DPAList/DPAList.js                      My Team -> DPA List
 *   container/MyTeam/MyTeamSchedule/MyTeamSchedule.js        My Team -> Team Schedule
 *   container/Report/TeamAttendanceSummary/TeamAttendanceSummary.js      Reports -> Team Attendance Summary
 *   container/Report/HRTeamAttendanceSummary/HRTeamAttendanceSummary.js  Reports -> HR Team Attendance Summary
 *   components/Report/TeamAttendanceSummaryPanel/TeamAttendanceSummaryPanel.js
 *   components/Report/HRTeamAttendanceSummaryPanel/HRTeamAttendanceSummaryPanel.js
 *
 * WHY THIS SUITE EXISTS
 *   Every suite in this repo stubs react-redux with `connect: () => (C) => C` so containers can
 *   render without a store. The consequence is that each file's mapStateToProps and
 *   mapDispatchToProps closures — and, in mapDispatch, every individual `(args) => dispatch(...)`
 *   arrow — are never executed by any test. Across the 15 files above that is ~45 uncovered
 *   functions, and it is the single largest residue in the My Team / Report cluster.
 *
 *   This suite keeps the identity behaviour of that stub but CAPTURES the two functions handed to
 *   connect(), then calls them directly. The assertions are on the wiring contract itself: which
 *   slice of redux state lands on which prop name, and which action creator each dispatch prop
 *   fires and with what arguments. Nothing is rendered here — the render arms are already covered
 *   by the per-screen suites.
 *
 * CURRENT MEASURED COVERAGE (17 Aug run, uncovered function count per file)
 *   ManageTeams 11 | MyTeamRequests 8 | MyTeamAllRequest 8 | OverallRequest 2 | EmployeeList 5
 *   DtrSummaryNew 3 | DtrConflictReport 4 | DtrLogs 2 | DtrMultiLogsSummary 2 | DPAList 4
 *   MyTeamSchedule 6 | TeamAttendanceSummary 5 | HRTeamAttendanceSummary 6 | both panels 3 each.
 *   The majority of every one of those counts is the connect wiring exercised below.
 *
 * FINDINGS
 *   FE-CONNECT-1  DtrConflictReport maps `state.dtrConflict` onto a prop literally named
 *                 `dtrSummary`, and its render/onSubmitHandler read `this.props.dtrSummary`.
 *                 The screen therefore paints conflict rows out of a prop whose name says DTR
 *                 summary. Not a defect (the data is the right slice) but it is why the DTR
 *                 Conflict screen looks copy-pasted from DTR Summary; recorded so a future
 *                 rename is caught. Asserted as-is below.
 *   FE-CONNECT-2  ManageTeams imports setRedirect from redirectActions but never maps it into
 *                 mapDispatchToProps and never calls it — a dead import, asserted below by the
 *                 exact key set of the dispatch props.
 *
 * ADDITIVE ONLY — no existing test file touched, no application source changed.
 */

import '@testing-library/jest-dom/extend-expect';

// Identity connect (so the default export is still the bare component for every other suite's
// convention) PLUS capture of the two mapping functions, keyed by the wrapped component's name.
jest.mock('react-redux', () => {
    const actual = jest.requireActual('react-redux');
    const captured = [];
    return {
        ...actual,
        __captured: captured,
        connect: (mapStateToProps, mapDispatchToProps) => (Component) => {
            captured.push({
                name: Component.displayName || Component.name,
                mapStateToProps,
                mapDispatchToProps,
            });
            return Component;
        },
    };
});

/* ---------------------------------------------------------------- action creator stubs
 * Each creator returns a tagged descriptor so an assertion can prove BOTH that the right
 * creator was reached and that the container forwarded the caller's arguments untouched. */

jest.mock('../../store/actions/lookup/lookupListActions', () => {
    const tag = (name) => (...args) => ({ __action: name, args });
    return {
        fetchUserList: tag('fetchUserList'),
        fetchTeamsHandledList: tag('fetchTeamsHandledList'),
        fetchDepartmentUsersList: tag('fetchDepartmentUsersList'),
        fetchTeam: tag('fetchTeam'),
    };
});
jest.mock('../../store/actions/team/teamActions', () => {
    const tag = (name) => (...args) => ({ __action: name, args });
    return {
        createTeam: tag('createTeam'),
        updateTeam: tag('updateTeam'),
        deleteTeam: tag('deleteTeam'),
    };
});
jest.mock('../../store/actions/redirectActions', () => {
    const tag = (name) => (...args) => ({ __action: name, args });
    return { setRedirect: tag('setRedirect'), clearRedirect: tag('clearRedirect') };
});
jest.mock('../../store/actions/filters/requestListActions', () => {
    const tag = (name) => (...args) => ({ __action: name, args });
    return {
        fetchRequestList: tag('fetchRequestList'),
        fetchRequestListDisputes: tag('fetchRequestListDisputes'),
        fetchStatusNumbers: tag('fetchStatusNumbers'),
        bulkRequest: tag('bulkRequest'),
    };
});
jest.mock('../../store/actions/filters/myTeamActions', () => {
    const tag = (name) => (...args) => ({ __action: name, args });
    return {
        fetchMyTeamList: tag('fetchMyTeamList'),
        fetchTeamUnderDepartment: tag('fetchTeamUnderDepartment'),
        fetchSubDepartmentUnderDepartment: tag('fetchSubDepartmentUnderDepartment'),
        fetchTeamSchedule: tag('fetchTeamSchedule'),
        fetchDepartmentsTeams: tag('fetchDepartmentsTeams'),
    };
});
// One physical module backs both the extension-less and the `.js` import specifier.
jest.mock('../../store/actions/dtr/dtrSummaryActions', () => {
    const tag = (name) => (...args) => ({ __action: name, args });
    return {
        fetchNewDtrSummary: tag('fetchNewDtrSummary'),
        exportDtrSummary: tag('exportDtrSummary'),
        exportNewDtrSummary: tag('exportNewDtrSummary'),
        exportNewDtrSummary1: tag('exportNewDtrSummary1'),
        fetchDtrConflict: tag('fetchDtrConflict'),
        fetchDtrMultiLogsSummary: tag('fetchDtrMultiLogsSummary'),
        exportDtrMultiLogsSummary: tag('exportDtrMultiLogsSummary'),
    };
});
jest.mock('../../store/actions/dtr/dtrLogsAction', () => {
    const tag = (name) => (...args) => ({ __action: name, args });
    return { fetchDtrLogs: tag('fetchDtrLogs'), exportDtrLogs: tag('exportDtrLogs') };
});
jest.mock('../../store/actions/filters/dpaActions', () => {
    const tag = (name) => (...args) => ({ __action: name, args });
    return { fetchDpaList: tag('fetchDpaList'), exportDpaList: tag('exportDpaList') };
});
jest.mock('../../store/actions/report/reportActions', () => {
    const tag = (name) => (...args) => ({ __action: name, args });
    return {
        getTeamAttendanceSummary: tag('getTeamAttendanceSummary'),
        exportAttendanceSummary: tag('exportAttendanceSummary'),
        setSelectedAttendanceSummary: tag('setSelectedAttendanceSummary'),
    };
});

// Heavy leaves stubbed so the 15 modules load quickly; none of them is rendered in this suite.
jest.mock('../../services/Authenticator', () => ({
    scanLevel: jest.fn(() => true),
    scanFeature: jest.fn(() => true),
    scanLevel_Feature: jest.fn(() => true),
}));
jest.mock('react-datepicker', () => () => null);
jest.mock('react-multi-select-component', () => () => null);
jest.mock('react-select', () => () => null);

/* ------------------------------------------------------------------ module loads */

require('../../container/MyTeam/ManageTeams/ManageTeams');
require('../../container/MyTeam/MyTeamRequests/MyTeamRequests');
require('../../container/MyTeam/MyTeamRequests/MyTeamAllRequest');
require('../../container/MyTeam/OverallRequest');
require('../../container/MyTeam/EmployeeList/EmployeeList');
require('../../container/MyTeam/DtrSummaryNew/DtrSummaryNew');
require('../../container/MyTeam/DtrConflictReport/DtrConflictReport');
require('../../container/MyTeam/DtrLogs/DtrLogs');
require('../../container/MyTeam/DtrMultiLogsSummary/DtrMultiLogsSummary');
require('../../container/MyTeam/DPAList/DPAList');
require('../../container/MyTeam/MyTeamSchedule/MyTeamSchedule');
require('../../container/Report/TeamAttendanceSummary/TeamAttendanceSummary');
require('../../container/Report/HRTeamAttendanceSummary/HRTeamAttendanceSummary');
require('../../components/Report/TeamAttendanceSummaryPanel/TeamAttendanceSummaryPanel');
require('../../components/Report/HRTeamAttendanceSummaryPanel/HRTeamAttendanceSummaryPanel');

const wiringFor = (componentName) => {
    const hit = require('react-redux').__captured.find((c) => c.name === componentName);
    if (!hit) {
        throw new Error(
            `connect() was never called for ${componentName}. Captured: ` +
            require('react-redux').__captured.map((c) => c.name).join(', ')
        );
    }
    return hit;
};

// Calls mapDispatchToProps(dispatch), invokes ONE of the produced props, and returns the single
// action object that reached dispatch.
const dispatchedBy = (componentName, propName, args) => {
    const dispatch = jest.fn();
    const props = wiringFor(componentName).mapDispatchToProps(dispatch);
    props[propName](...args);
    expect(dispatch).toHaveBeenCalledTimes(1);
    return dispatch.mock.calls[0][0];
};

/* ================================================================== ManageTeams */

describe('ManageTeams — My Team -> Manage Team', () => {
    const state = {
        user: { id: 42, full_name: 'Team Lead' },
        lookup: {
            team: { id: 3, name: 'Alpha' },
            team_leader: [{ id: 7, full_name: 'Lead One' }],
            teams_handled: [{ id: 3, name: 'Alpha' }],
            department_users: [{ id: 9, full_name: 'User A' }],
        },
    };

    test('the screen reads the logged in user and the four lookup slices it needs', () => {
        expect(wiringFor('ManageTeams').mapStateToProps(state)).toEqual({
            user: state.user,
            team: state.lookup.team,
            team_leader: state.lookup.team_leader,
            teams_handled: state.lookup.teams_handled,
            department_users: state.lookup.department_users,
        });
    });

    test('an empty lookup slice reaches the screen as undefined, which is its PageLoading gate', () => {
        const mapped = wiringFor('ManageTeams').mapStateToProps({ user: {}, lookup: {} });
        expect(mapped.teams_handled).toBeUndefined();
        expect(mapped.team_leader).toBeUndefined();
    });

    /**
     * FE-CONNECT-2 — setRedirect is imported at the top of ManageTeams.js but never mapped and
     * never called. The exact key set below is the guard: if a future change wires it in, this
     * fails and the dead import is either used or removed.
     */
    test('FE-CONNECT-2 exactly seven dispatch props are exposed and setRedirect is not one of them', () => {
        const props = wiringFor('ManageTeams').mapDispatchToProps(jest.fn());
        expect(Object.keys(props).sort()).toEqual([
            'createTeam', 'deleteTeam', 'fetchDepartmentUsersList', 'fetchTeam',
            'fetchTeamsHandledList', 'fetchUserList', 'updateTeam',
        ]);
    });

    test('the lookup dispatch props forward their arguments to the matching creators', () => {
        expect(dispatchedBy('ManageTeams', 'fetchUserList', ['team_leader', { page: 'all' }]))
            .toEqual({ __action: 'fetchUserList', args: ['team_leader', { page: 'all' }] });
        expect(dispatchedBy('ManageTeams', 'fetchTeamsHandledList', [42]))
            .toEqual({ __action: 'fetchTeamsHandledList', args: [42] });
        expect(dispatchedBy('ManageTeams', 'fetchTeam', ['3']))
            .toEqual({ __action: 'fetchTeam', args: ['3'] });
        expect(dispatchedBy('ManageTeams', 'fetchDepartmentUsersList', [5]))
            .toEqual({ __action: 'fetchDepartmentUsersList', args: [5] });
    });

    test('create, update and delete dispatch the team write creators with the team payload', () => {
        const payload = { name: 'Alpha', team_handlers: [7], team_users: [9] };
        expect(dispatchedBy('ManageTeams', 'createTeam', [payload]))
            .toEqual({ __action: 'createTeam', args: [payload] });
        // update is the only one that carries the id ahead of the payload
        expect(dispatchedBy('ManageTeams', 'updateTeam', [3, { ...payload, _method: 'PUT' }]))
            .toEqual({ __action: 'updateTeam', args: [3, { ...payload, _method: 'PUT' }] });
        expect(dispatchedBy('ManageTeams', 'deleteTeam', ['3']))
            .toEqual({ __action: 'deleteTeam', args: ['3'] });
    });
});

/* ============================================== MyTeamRequests / MyTeamAllRequest */

describe('MyTeamRequests — My Team -> Requests', () => {
    const state = {
        myTeamRequestList: {
            stored_departments: [{ id: 5 }],
            instance: { result: { data: [] }, record_number: '0' },
            isListLoaded: true,
            isNumbersLoaded: false,
            statusNumbers: { pending: 3 },
            filters: { status: 'approved' },
            requesttype: 'overtime',
        },
        settings: { current_payroll_cutoff: { start_date: '2026-08-01', end_date: '2026-08-15' } },
    };

    test('the request list, its loaded flags and the payroll cutoff settings reach the screen', () => {
        expect(wiringFor('MyTeamRequests').mapStateToProps(state)).toEqual({
            stored_departments: state.myTeamRequestList.stored_departments,
            requestList: state.myTeamRequestList.instance,
            isListLoaded: true,
            isNumbersLoaded: false,
            statusNumbers: { pending: 3 },
            filters: { status: 'approved' },
            settings: state.settings,
        });
    });

    test('the request list is taken from `instance`, not from the reducer root', () => {
        // The reducer keeps the page payload under .instance; mapping the root instead would
        // hand render() an object with no .result and crash the table.
        const mapped = wiringFor('MyTeamRequests').mapStateToProps(state);
        expect(mapped.requestList.result).toBeDefined();
        expect(mapped.requestList).not.toBe(state.myTeamRequestList);
    });

    test('MyTeamRequests does NOT receive requesttype, unlike the overall-request screen', () => {
        expect(wiringFor('MyTeamRequests').mapStateToProps(state).requesttype).toBeUndefined();
        expect(wiringFor('MyTeamAllRequests').mapStateToProps(state).requesttype).toBe('overtime');
    });

    test('its three dispatch props hit the list, counter and bulk creators', () => {
        const filters = { url: 'my_team_requests', status: 'pending', page: 1 };
        expect(dispatchedBy('MyTeamRequests', 'fetchRequestList', [filters]))
            .toEqual({ __action: 'fetchRequestList', args: [filters] });
        expect(dispatchedBy('MyTeamRequests', 'fetchStatusNumbers', [filters]))
            .toEqual({ __action: 'fetchStatusNumbers', args: [filters] });
        expect(dispatchedBy('MyTeamRequests', 'bulkRequest', [{ ...filters, bulk_action: 'approve' }]))
            .toEqual({ __action: 'bulkRequest', args: [{ ...filters, bulk_action: 'approve' }] });
    });

    test('the overall-request screen exposes the same three dispatch props', () => {
        const props = wiringFor('MyTeamAllRequests').mapDispatchToProps(jest.fn());
        expect(Object.keys(props).sort()).toEqual(['bulkRequest', 'fetchRequestList', 'fetchStatusNumbers']);
        expect(dispatchedBy('MyTeamAllRequests', 'bulkRequest', [{ bulk_action: 'deny' }]))
            .toEqual({ __action: 'bulkRequest', args: [{ bulk_action: 'deny' }] });
        expect(dispatchedBy('MyTeamAllRequests', 'fetchStatusNumbers', [{ page: 2 }]))
            .toEqual({ __action: 'fetchStatusNumbers', args: [{ page: 2 }] });
        expect(dispatchedBy('MyTeamAllRequests', 'fetchRequestList', [{ page: 2 }]))
            .toEqual({ __action: 'fetchRequestList', args: [{ page: 2 }] });
    });
});

/* ================================================================ OverallRequest */

describe('OverallRequest — My Team -> Overall Request', () => {
    test('the payroll cutoff is lifted out of settings onto its own prop', () => {
        const cutoff = { start_date: '2026-08-01', end_date: '2026-08-15' };
        const state = {
            user: { id: 1, departments_handled: [] },
            myTeamList: { list: null },
            settings: { current_payroll_cutoff: cutoff },
        };
        expect(wiringFor('OverallRequest').mapStateToProps(state)).toEqual({
            user: state.user,
            myTeamList: state.myTeamList,
            settings: state.settings,
            payrollcut: cutoff,
        });
    });

    test('with no cutoff in settings the payrollcut prop is undefined, which the date effect guards on', () => {
        const mapped = wiringFor('OverallRequest').mapStateToProps({
            user: {}, myTeamList: {}, settings: {},
        });
        expect(mapped.payrollcut).toBeUndefined();
    });

    test('the screen is connected read-only — it declares no dispatch props at all', () => {
        expect(wiringFor('OverallRequest').mapDispatchToProps).toBeUndefined();
    });
});

/* ==================================================== EmployeeList / DPAList lists */

describe('EmployeeList — My Team -> Employee List', () => {
    test('the user and the team list slice reach the screen', () => {
        const state = { user: { id: 42 }, myTeamList: { list: { data: [] } }, other: 'ignored' };
        expect(wiringFor('EmployeeList').mapStateToProps(state))
            .toEqual({ user: state.user, myTeamList: state.myTeamList });
    });

    test('the list fetch carries the user id ahead of the filters, and the two drilldowns carry the department', () => {
        const filters = { page: 1, name: null };
        expect(dispatchedBy('EmployeeList', 'fetchMyTeamList', [42, filters]))
            .toEqual({ __action: 'fetchMyTeamList', args: [42, filters] });
        expect(dispatchedBy('EmployeeList', 'fetchTeamUnderDepartment', [42, '5']))
            .toEqual({ __action: 'fetchTeamUnderDepartment', args: [42, '5'] });
        expect(dispatchedBy('EmployeeList', 'fetchSubDepartmentUnderDepartment', [42, '5']))
            .toEqual({ __action: 'fetchSubDepartmentUnderDepartment', args: [42, '5'] });
    });
});

describe('DPAList — My Team -> DPA List', () => {
    test('the user and the dpa list slice reach the screen', () => {
        const state = { user: { id: 42 }, dpaList: { list: null } };
        expect(wiringFor('DPAList').mapStateToProps(state))
            .toEqual({ user: state.user, dpaList: state.dpaList });
    });

    test('fetch and export both go to the dpa creators with the same filter payload', () => {
        const params = { page: 1, department_id: 5 };
        expect(dispatchedBy('DPAList', 'fetchDpaList', [params]))
            .toEqual({ __action: 'fetchDpaList', args: [params] });
        expect(dispatchedBy('DPAList', 'exportDpaList', [params]))
            .toEqual({ __action: 'exportDpaList', args: [params] });
    });
});

/* ============================================================== the DTR reports */

describe('DTR report screens — My Team -> DTR Summary / Conflict / Logs / Multi Logs', () => {
    const settings = { current_payroll_cutoff: { start_date: '2026-08-01' } };

    test('DtrSummaryNew reads the dtrSummary slice and the payroll settings', () => {
        const state = { dtrSummary: { result: [], pagination: {} }, settings, dtrConflict: { result: [] } };
        expect(wiringFor('DtrSummaryNew').mapStateToProps(state))
            .toEqual({ dtrSummary: state.dtrSummary, settings });
    });

    test('DtrSummaryNew exposes one fetch and three distinct export creators', () => {
        const params = { valid_from: '2026-08-01', valid_to: '2026-08-15', department_id: 5 };
        expect(dispatchedBy('DtrSummaryNew', 'fetchNewDtrSummary', [params]))
            .toEqual({ __action: 'fetchNewDtrSummary', args: [params] });
        expect(dispatchedBy('DtrSummaryNew', 'exportDtrSummary', [params]))
            .toEqual({ __action: 'exportDtrSummary', args: [params] });
        expect(dispatchedBy('DtrSummaryNew', 'exportNewDtrSummary', [params]))
            .toEqual({ __action: 'exportNewDtrSummary', args: [params] });
        expect(dispatchedBy('DtrSummaryNew', 'exportNewDtrSummary1', [params]))
            .toEqual({ __action: 'exportNewDtrSummary1', args: [params] });
    });

    /**
     * FE-CONNECT-1 — the conflict screen's prop is named dtrSummary but is fed state.dtrConflict.
     * Asserted as it behaves today; a rename would fail here and this becomes the guard.
     */
    test('FE-CONNECT-1 DtrConflictReport feeds state.dtrConflict into a prop named dtrSummary', () => {
        const state = {
            dtrSummary: { result: ['summary-row'] },
            dtrConflict: { result: ['conflict-row'] },
            settings,
        };
        const mapped = wiringFor('DtrConflictReport').mapStateToProps(state);
        expect(mapped).toEqual({ dtrSummary: state.dtrConflict, settings });
        expect(mapped.dtrSummary.result).toEqual(['conflict-row']);
        expect(mapped.dtrSummary).not.toBe(state.dtrSummary);
    });

    test('DtrConflictReport dispatches the conflict fetch and the shared export creator', () => {
        const params = { valid_from: '2026-08-01', valid_to: '2026-08-15' };
        expect(dispatchedBy('DtrConflictReport', 'fetchDtrConflict', [params]))
            .toEqual({ __action: 'fetchDtrConflict', args: [params] });
        expect(dispatchedBy('DtrConflictReport', 'exportNewDtrSummary1', [params]))
            .toEqual({ __action: 'exportNewDtrSummary1', args: [params] });
    });

    test('DtrLogs reads its own slice and dispatches the log fetch and export', () => {
        const state = { dtrLogs: { instance: { pagination: {} } }, settings };
        expect(wiringFor('DtrLogs').mapStateToProps(state))
            .toEqual({ dtrLogs: state.dtrLogs, settings });

        const params = { department_id: 5, valid_from: '2026-08-01' };
        expect(dispatchedBy('DtrLogs', 'fetchDtrLogs', [params]))
            .toEqual({ __action: 'fetchDtrLogs', args: [params] });
        expect(dispatchedBy('DtrLogs', 'exportDtrLogs', [params]))
            .toEqual({ __action: 'exportDtrLogs', args: [params] });
    });

    test('DtrMultiLogsSummary reads its own slice and dispatches its fetch and export', () => {
        const state = { dtrMultiLogsSummary: { result: [] }, settings };
        expect(wiringFor('DtrMultiLogsSummary').mapStateToProps(state))
            .toEqual({ dtrMultiLogsSummary: state.dtrMultiLogsSummary, settings });

        const params = { department_id: 5 };
        expect(dispatchedBy('DtrMultiLogsSummary', 'fetchDtrMultiLogsSummary', [params]))
            .toEqual({ __action: 'fetchDtrMultiLogsSummary', args: [params] });
        expect(dispatchedBy('DtrMultiLogsSummary', 'exportDtrMultiLogsSummary', [params]))
            .toEqual({ __action: 'exportDtrMultiLogsSummary', args: [params] });
    });
});

/* ============================================================== MyTeamSchedule */

describe('MyTeamSchedule — My Team -> Team Schedule', () => {
    test('the schedule slice is renamed to `team` on the way in', () => {
        const state = {
            user: { id: 42, departments_handled: [] },
            myTeamSchedule: { filters: {}, team_list: [], day: [] },
            myTeamList: { sub_department: [] },
        };
        expect(wiringFor('MyTeamSchedule').mapStateToProps(state)).toEqual({
            user: state.user,
            team: state.myTeamSchedule,
            myTeamList: state.myTeamList,
        });
    });

    test('the schedule fetch takes a single params object while the two drilldowns take user + department', () => {
        const params = { start_date: '2026-08-18', end_date: '2026-08-18', department_id: 5 };
        expect(dispatchedBy('MyTeamSchedule', 'fetchTeamSchedule', [params]))
            .toEqual({ __action: 'fetchTeamSchedule', args: [params] });
        expect(dispatchedBy('MyTeamSchedule', 'fetchTeamUnderDepartment', [42, '5']))
            .toEqual({ __action: 'fetchTeamUnderDepartment', args: [42, '5'] });
        expect(dispatchedBy('MyTeamSchedule', 'fetchSubDepartmentUnderDepartment', [42, '5']))
            .toEqual({ __action: 'fetchSubDepartmentUnderDepartment', args: [42, '5'] });
    });
});

/* =================================================== attendance summary screens */

describe('Team and HR attendance summary — Reports -> (HR) Team Attendance Summary', () => {
    const state = {
        user: { id: 7, departments_handled: [{ id: 1, department_name: 'IT' }] },
        report: { team_attendance_summary: { total_headcount: 120 }, selected_summary: 'attendance' },
        myTeamList: { team_list: [] },
        myDepartmentsTeamsList: { team_list: [{ Id: 5, Name: 'Alpha' }] },
    };

    test('both screens read the identical four state slices', () => {
        const expected = {
            user: state.user,
            report: state.report,
            myTeamList: state.myTeamList,
            myDepartmentsTeamsList: state.myDepartmentsTeamsList,
        };
        expect(wiringFor('TeamAttendanceSummary').mapStateToProps(state)).toEqual(expected);
        expect(wiringFor('HRTeamAttendanceSummary').mapStateToProps(state)).toEqual(expected);
    });

    test('the team screen exposes three dispatch props; the HR screen adds the department drilldown', () => {
        expect(Object.keys(wiringFor('TeamAttendanceSummary').mapDispatchToProps(jest.fn())).sort())
            .toEqual(['exportAttendanceSummary', 'fetchDepartmentsTeams', 'getTeamAttendanceSummary']);
        expect(Object.keys(wiringFor('HRTeamAttendanceSummary').mapDispatchToProps(jest.fn())).sort())
            .toEqual([
                'exportAttendanceSummary', 'fetchDepartmentsTeams',
                'fetchTeamUnderDepartment', 'getTeamAttendanceSummary',
            ]);
    });

    test('the summary fetch and the export both carry start date, end date and filters in that order', () => {
        const from = '2026-08-12';
        const to = '2026-08-18';
        const filters = { name: 'ann', scope_type: 'day', selectedDepartments: [1] };

        expect(dispatchedBy('TeamAttendanceSummary', 'getTeamAttendanceSummary', [from, to, filters]))
            .toEqual({ __action: 'getTeamAttendanceSummary', args: [from, to, filters] });
        expect(dispatchedBy('TeamAttendanceSummary', 'exportAttendanceSummary', [from, to, filters]))
            .toEqual({ __action: 'exportAttendanceSummary', args: [from, to, filters] });
        expect(dispatchedBy('TeamAttendanceSummary', 'fetchDepartmentsTeams', [7, { departments: [1] }]))
            .toEqual({ __action: 'fetchDepartmentsTeams', args: [7, { departments: [1] }] });

        expect(dispatchedBy('HRTeamAttendanceSummary', 'getTeamAttendanceSummary', [from, to, filters]))
            .toEqual({ __action: 'getTeamAttendanceSummary', args: [from, to, filters] });
        expect(dispatchedBy('HRTeamAttendanceSummary', 'exportAttendanceSummary', [from, to, filters]))
            .toEqual({ __action: 'exportAttendanceSummary', args: [from, to, filters] });
        expect(dispatchedBy('HRTeamAttendanceSummary', 'fetchDepartmentsTeams', [7, { departments: [1] }]))
            .toEqual({ __action: 'fetchDepartmentsTeams', args: [7, { departments: [1] }] });
        expect(dispatchedBy('HRTeamAttendanceSummary', 'fetchTeamUnderDepartment', [7, 1]))
            .toEqual({ __action: 'fetchTeamUnderDepartment', args: [7, 1] });
    });
});

describe('Attendance summary panels — the tiles inside both report screens', () => {
    test('both panels take nothing from redux state — every figure arrives as a prop from the parent', () => {
        const noisyState = { report: { team_attendance_summary: { total_headcount: 120 } }, user: { id: 1 } };
        expect(wiringFor('TeamAttendanceSummaryPanel').mapStateToProps(noisyState)).toEqual({});
        expect(wiringFor('HRTeamAttendanceSummaryPanel').mapStateToProps(noisyState)).toEqual({});
    });

    test('both panels expose exactly one dispatch prop — the tile selection', () => {
        expect(Object.keys(wiringFor('TeamAttendanceSummaryPanel').mapDispatchToProps(jest.fn())))
            .toEqual(['setSelectedAttendanceSummary']);
        expect(Object.keys(wiringFor('HRTeamAttendanceSummaryPanel').mapDispatchToProps(jest.fn())))
            .toEqual(['setSelectedAttendanceSummary']);
    });

    test('clicking a tile dispatches that metric key from either panel', () => {
        expect(dispatchedBy('TeamAttendanceSummaryPanel', 'setSelectedAttendanceSummary', ['unplanned_leaves']))
            .toEqual({ __action: 'setSelectedAttendanceSummary', args: ['unplanned_leaves'] });
        expect(dispatchedBy('HRTeamAttendanceSummaryPanel', 'setSelectedAttendanceSummary', ['total_overtime']))
            .toEqual({ __action: 'setSelectedAttendanceSummary', args: ['total_overtime'] });
    });
});
