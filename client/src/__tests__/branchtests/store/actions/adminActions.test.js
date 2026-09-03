/**
 * EVOX Frontend Jest — Admin Redux Action Creators
 *
 * COPY TO (client tree):  client/src/__tests__/branchtests/store/actions/adminActions.test.js
 *
 * Covers the thunk action creators under src/store/actions/admin/*.
 * All are redux-thunk creators that call the custom API service and dispatch
 * Formatter-built alert actions. API + Formatter are jest.mock'd so NO real
 * HTTP fires. Each API-backed creator is exercised for BOTH the .then success
 * path and the .catch error path.
 *
 * Import paths are written relative to the copy-to location above so they
 * resolve the same singleton modules the source files import.
 */

// --- Mock the custom services (same resolved modules the sources import) ---
jest.mock('../../../../services/API', () => ({
    __esModule: true,
    default: { call: jest.fn() },
}));
jest.mock('../../../../services/Formatter', () => ({
    __esModule: true,
    default: {
        alert_success:       jest.fn(() => ({ type: 'SHOW_ALERT' })),
        alert_error:         jest.fn(() => ({ type: 'SHOW_ALERT_ERROR' })),
        alert_error_message: jest.fn(() => ({ type: 'SHOW_ALERT_MESSAGE' })),
    },
}));

import API from '../../../../services/API';
import Formatter from '../../../../services/Formatter';

import {
    fetchUserFeatures,
    fetchUser,
    fetchUserDispute,
    assignLevelFeatures,
} from '../../../../store/actions/admin/assignRoleActions';
import { assignDepartmentHandlers } from '../../../../store/actions/admin/assignDepartmentHandlersActions';
import { assignEmployeeSupervisorsActions } from '../../../../store/actions/admin/assignEmployeeSupervisorsActions';
// CLIENT MODULE REMOVED 2026-08-10: assignEmployeesClientActions deleted — import removed to avoid MODULE_NOT_FOUND crash
// changeLogsActions removed 2026-08-13 — Changelogs module retired
import {
    fetchDepartmentList,
    deleteDepartment,
    updateDepartmentScheduleStatus,
} from '../../../../store/actions/admin/departmentListActions';
import { generateDtrDate } from '../../../../store/actions/admin/generateDtrDateActions';
import {
    addPayrollCutoff,
    updatePayrollCutoff,
    deletePayrollCutoff,
    fetchPayrollCutoff,
    fetchPayrollCutoffList,
    clearPayrollCutoffInstance,
    clearPayrollCutoffListInstance,
} from '../../../../store/actions/admin/payrollCutoffActions';
import { registerUser } from '../../../../store/actions/admin/registerUserActions';
import {
    syncBhrLeaves,
    syncUTCAdjusetment,
    syncBhrUsers,
    syncBiometrics,
} from '../../../../store/actions/admin/syncActions';

// Flush the microtask/macrotask queue so the API promise chain settles.
const flush = () => new Promise((resolve) => setImmediate(resolve));

// Invoke a thunk with a fake dispatch/getState and wait for async dispatches.
const run = async (thunk) => {
    const dispatch = jest.fn();
    const getState = jest.fn(() => ({}));
    await thunk(dispatch, getState);
    await flush();
    return dispatch;
};

const okResult = (content = { id: 1 }) => ({
    status: 200,
    data: { content, message: 'ok' },
});

const typesOf = (dispatch) =>
    dispatch.mock.calls.map((c) => (c[0] && c[0].type) || undefined);

beforeAll(() => {
    global.links = { dashboard: '/dashboard', ops_schedule: '/opsschedule', login: '/login' };
});

beforeEach(() => {
    jest.clearAllMocks();
});

describe('admin/assignRoleActions', () => {
    describe('fetchUserFeatures', () => {
        it('dispatches FETCH_USER_FEATURES on success', async () => {
            API.call.mockResolvedValue(okResult({ level: 3, features: ['a'] }));
            const dispatch = await run(fetchUserFeatures(9));
            expect(API.call).toHaveBeenCalledWith(expect.objectContaining({ url: '/user/9/features' }));
            expect(typesOf(dispatch)).toContain('FETCH_USER_FEATURES');
        });
        it('dispatches alert_error on failure', async () => {
            API.call.mockRejectedValue(new Error('boom'));
            const dispatch = await run(fetchUserFeatures(9));
            expect(typesOf(dispatch)).toContain('SHOW_ALERT_ERROR');
        });
    });

    describe('fetchUser', () => {
        it('dispatches FETCH_USER on success', async () => {
            API.call.mockResolvedValue(okResult([{ id: 1 }]));
            const dispatch = await run(fetchUser('john'));
            expect(API.call).toHaveBeenCalledWith(expect.objectContaining({ url: '/user/search-user/john' }));
            expect(typesOf(dispatch)).toContain('FETCH_USER');
        });
        it('dispatches alert_error on failure', async () => {
            API.call.mockRejectedValue(new Error('boom'));
            const dispatch = await run(fetchUser('john'));
            expect(typesOf(dispatch)).toContain('SHOW_ALERT_ERROR');
        });
    });

    describe('fetchUserDispute', () => {
        it('dispatches only FETCH_DEP_USER_LIST when data has length', async () => {
            API.call.mockResolvedValue({ status: 200, data: [{ id: 1 }, { id: 2 }] });
            const dispatch = await run(fetchUserDispute());
            const types = typesOf(dispatch);
            expect(types).toContain('FETCH_DEP_USER_LIST');
            expect(types).not.toContain('SHOW_ALERT_MESSAGE');
        });
        it('dispatches "No User Found" message when data has no length', async () => {
            API.call.mockResolvedValue({ status: 200, data: { content: {} } });
            const dispatch = await run(fetchUserDispute());
            const types = typesOf(dispatch);
            expect(Formatter.alert_error_message).toHaveBeenCalledWith('No User Found...');
            expect(types).toContain('SHOW_ALERT_MESSAGE');
            expect(types).toContain('FETCH_DEP_USER_LIST');
        });
        it('dispatches alert_error on failure', async () => {
            API.call.mockRejectedValue(new Error('boom'));
            const dispatch = await run(fetchUserDispute());
            expect(typesOf(dispatch)).toContain('SHOW_ALERT_ERROR');
        });
    });

    describe('assignLevelFeatures', () => {
        it('dispatches UPDATE_USER on success', async () => {
            API.call.mockResolvedValue(okResult({ id: 2 }));
            const dispatch = await run(assignLevelFeatures(8, { level: 2 }));
            expect(API.call).toHaveBeenCalledWith(expect.objectContaining({ url: '/user/8/assign_level_features/' }));
            const types = typesOf(dispatch);
            expect(types).toContain('SHOW_ALERT');
            expect(types).toContain('UPDATE_USER');
        });
        it('dispatches alert_error on failure', async () => {
            API.call.mockRejectedValue(new Error('boom'));
            const dispatch = await run(assignLevelFeatures(8, {}));
            expect(typesOf(dispatch)).toContain('SHOW_ALERT_ERROR');
        });
    });
});

describe('admin/assignDepartmentHandlers', () => {
    it('dispatches UPDATE_USER_DEPARTMENT_HANDLED on success', async () => {
        API.call.mockResolvedValue(okResult({ id: 3 }));
        const dispatch = await run(assignDepartmentHandlers(3, { handlers: [1] }));
        expect(API.call).toHaveBeenCalledWith(expect.objectContaining({ url: '/department/assign_handlers/3' }));
        const types = typesOf(dispatch);
        expect(types).toContain('SHOW_ALERT');
        expect(types).toContain('UPDATE_USER_DEPARTMENT_HANDLED');
    });
    it('dispatches alert_error on failure', async () => {
        API.call.mockRejectedValue(new Error('boom'));
        const dispatch = await run(assignDepartmentHandlers(3, {}));
        expect(typesOf(dispatch)).toContain('SHOW_ALERT_ERROR');
    });
});

describe('admin/assignEmployeeSupervisorsActions', () => {
    it('dispatches UPDATE_USER_LIST with supervisor role on success', async () => {
        API.call.mockResolvedValue(okResult({ id: 4 }));
        const dispatch = await run(assignEmployeeSupervisorsActions(4, { employees: [] }));
        expect(API.call).toHaveBeenCalledWith(expect.objectContaining({ url: '/user/4/assign_employees/' }));
        expect(typesOf(dispatch)).toContain('UPDATE_USER_LIST');
    });
    it('dispatches alert_error on failure', async () => {
        API.call.mockRejectedValue(new Error('boom'));
        const dispatch = await run(assignEmployeeSupervisorsActions(4, {}));
        expect(typesOf(dispatch)).toContain('SHOW_ALERT_ERROR');
    });
});

describe.skip('admin/assignEmployeesClient — CLIENT MODULE REMOVED 2026-08-10', () => {
    it('dispatches UPDATE_USER_DEPARTMENT_HANDLED on success', async () => {
        API.call.mockResolvedValue(okResult({ id: 5 }));
        const dispatch = await run(assignEmployeesClient({ client_id: 1 }));
        expect(API.call).toHaveBeenCalledWith(expect.objectContaining({ url: '/client/assign/' }));
        expect(typesOf(dispatch)).toContain('UPDATE_USER_DEPARTMENT_HANDLED');
    });
    it('dispatches alert_error on failure', async () => {
        API.call.mockRejectedValue(new Error('boom'));
        const dispatch = await run(assignEmployeesClient({}));
        expect(typesOf(dispatch)).toContain('SHOW_ALERT_ERROR');
    });
});

describe.skip('admin/addChangeLogs (retired — Changelogs module removed 2026-08-13)', () => {
    // changeLogsActions.js deleted; /changelogs API routes removed.
});

describe('admin/departmentListActions', () => {
    describe('fetchDepartmentList', () => {
        it('dispatches FETCH_DEPARTMENT_LIST_LOAD_SUCCESS on success', async () => {
            API.call.mockResolvedValue(okResult([{ id: 1 }]));
            const dispatch = await run(fetchDepartmentList());
            expect(API.call).toHaveBeenCalledWith(expect.objectContaining({ url: '/department/all' }));
            expect(typesOf(dispatch)).toContain('FETCH_DEPARTMENT_LIST_LOAD_SUCCESS');
        });
        it('dispatches alert_error on failure', async () => {
            API.call.mockRejectedValue(new Error('boom'));
            const dispatch = await run(fetchDepartmentList());
            expect(typesOf(dispatch)).toContain('SHOW_ALERT_ERROR');
        });
    });
    describe('deleteDepartment', () => {
        it('dispatches alert_success on success', async () => {
            API.call.mockResolvedValue(okResult({}));
            const dispatch = await run(deleteDepartment(12));
            expect(API.call).toHaveBeenCalledWith(expect.objectContaining({ method: 'delete', url: '/department/12/' }));
            expect(typesOf(dispatch)).toContain('SHOW_ALERT');
        });
        it('dispatches alert_error on failure', async () => {
            API.call.mockRejectedValue(new Error('boom'));
            const dispatch = await run(deleteDepartment(12));
            expect(typesOf(dispatch)).toContain('SHOW_ALERT_ERROR');
        });
    });
    describe('updateDepartmentScheduleStatus', () => {
        it('dispatches alert_success + FETCH_DEPARTMENT_LIST_LOAD_SUCCESS on success', async () => {
            API.call.mockResolvedValue(okResult([{ id: 1 }]));
            const dispatch = await run(updateDepartmentScheduleStatus(12, { active: true }));
            expect(API.call).toHaveBeenCalledWith(expect.objectContaining({ url: '/department/12/switch_active_schedule' }));
            const types = typesOf(dispatch);
            expect(types).toContain('SHOW_ALERT');
            expect(types).toContain('FETCH_DEPARTMENT_LIST_LOAD_SUCCESS');
        });
        it('dispatches alert_error on failure', async () => {
            API.call.mockRejectedValue(new Error('boom'));
            const dispatch = await run(updateDepartmentScheduleStatus(12, {}));
            expect(typesOf(dispatch)).toContain('SHOW_ALERT_ERROR');
        });
    });
});

describe('admin/generateDtrDate', () => {
    it('dispatches alert_success on success', async () => {
        API.call.mockResolvedValue(okResult({}));
        const dispatch = await run(generateDtrDate({ date: '2026-01-01' }));
        expect(API.call).toHaveBeenCalledWith(expect.objectContaining({ method: 'post', url: '/generate/dtr/' }));
        expect(typesOf(dispatch)).toContain('SHOW_ALERT');
    });
    it('dispatches alert_error on failure', async () => {
        API.call.mockRejectedValue(new Error('boom'));
        const dispatch = await run(generateDtrDate({}));
        expect(typesOf(dispatch)).toContain('SHOW_ALERT_ERROR');
    });
});

// admin/jobOpeningActions removed (EVOX-721, Careers Dead Code Removal) —
// store/actions/admin/jobOpeningActions.js no longer exists.

describe('admin/payrollCutoffActions', () => {
    describe('addPayrollCutoff', () => {
        it('dispatches alert_success on success', async () => {
            API.call.mockResolvedValue(okResult({}));
            const dispatch = await run(addPayrollCutoff({ start: '1' }));
            expect(API.call).toHaveBeenCalledWith(expect.objectContaining({ url: '/payroll/cutoff/' }));
            expect(typesOf(dispatch)).toContain('SHOW_ALERT');
        });
        it('dispatches alert_error on failure', async () => {
            API.call.mockRejectedValue(new Error('boom'));
            const dispatch = await run(addPayrollCutoff({}));
            expect(typesOf(dispatch)).toContain('SHOW_ALERT_ERROR');
        });
    });
    describe('updatePayrollCutoff', () => {
        it('dispatches alert_success on success', async () => {
            API.call.mockResolvedValue(okResult({}));
            const dispatch = await run(updatePayrollCutoff(4, {}));
            expect(API.call).toHaveBeenCalledWith(expect.objectContaining({ url: '/payroll/cutoff/4' }));
            expect(typesOf(dispatch)).toContain('SHOW_ALERT');
        });
        it('dispatches alert_error on failure', async () => {
            API.call.mockRejectedValue(new Error('boom'));
            const dispatch = await run(updatePayrollCutoff(4, {}));
            expect(typesOf(dispatch)).toContain('SHOW_ALERT_ERROR');
        });
    });
    describe('deletePayrollCutoff', () => {
        it('dispatches alert_success on success', async () => {
            API.call.mockResolvedValue(okResult({}));
            const dispatch = await run(deletePayrollCutoff(4));
            expect(API.call).toHaveBeenCalledWith(expect.objectContaining({ method: 'delete', url: '/payroll/cutoff/4' }));
            expect(typesOf(dispatch)).toContain('SHOW_ALERT');
        });
        it('dispatches alert_error on failure', async () => {
            API.call.mockRejectedValue(new Error('boom'));
            const dispatch = await run(deletePayrollCutoff(4));
            expect(typesOf(dispatch)).toContain('SHOW_ALERT_ERROR');
        });
    });
    describe('fetchPayrollCutoff', () => {
        it('dispatches FETCH_PAYROLL_CUTOFF_SUCCESS on success', async () => {
            API.call.mockResolvedValue(okResult({ id: 4 }));
            const dispatch = await run(fetchPayrollCutoff(4));
            expect(typesOf(dispatch)).toContain('FETCH_PAYROLL_CUTOFF_SUCCESS');
        });
        it('dispatches alert_error on failure', async () => {
            API.call.mockRejectedValue(new Error('boom'));
            const dispatch = await run(fetchPayrollCutoff(4));
            expect(typesOf(dispatch)).toContain('SHOW_ALERT_ERROR');
        });
    });
    describe('fetchPayrollCutoffList', () => {
        it('dispatches FETCH_PAYROLL_CUTOFF_LIST_SUCCESS on success', async () => {
            API.call.mockResolvedValue(okResult([{ id: 4 }]));
            const dispatch = await run(fetchPayrollCutoffList());
            expect(API.call).toHaveBeenCalledWith(expect.objectContaining({ url: '/payroll/cutoff/all' }));
            expect(typesOf(dispatch)).toContain('FETCH_PAYROLL_CUTOFF_LIST_SUCCESS');
        });
        it('dispatches alert_error on failure', async () => {
            API.call.mockRejectedValue(new Error('boom'));
            const dispatch = await run(fetchPayrollCutoffList());
            expect(typesOf(dispatch)).toContain('SHOW_ALERT_ERROR');
        });
    });
    it('clearPayrollCutoffInstance dispatches CLEAR_PAYROLL_CUTOFF_INSTANCE', async () => {
        const dispatch = await run(clearPayrollCutoffInstance());
        expect(typesOf(dispatch)).toContain('CLEAR_PAYROLL_CUTOFF_INSTANCE');
        expect(API.call).not.toHaveBeenCalled();
    });
    it('clearPayrollCutoffListInstance dispatches CLEAR_PAYROLL_CUTOFF_LIST_INSTANCE', async () => {
        const dispatch = await run(clearPayrollCutoffListInstance());
        expect(typesOf(dispatch)).toContain('CLEAR_PAYROLL_CUTOFF_LIST_INSTANCE');
    });
});

describe('admin/registerUser', () => {
    it('dispatches alert_success + REGISTER_USER_SUCCESSFUL on success', async () => {
        API.call.mockResolvedValue(okResult({}));
        const dispatch = await run(registerUser({ name: 'x' }));
        expect(API.call).toHaveBeenCalledWith(expect.objectContaining({ url: '/user/register' }));
        const types = typesOf(dispatch);
        expect(types).toContain('SHOW_ALERT');
        expect(types).toContain('REGISTER_USER_SUCCESSFUL');
    });
    it('dispatches alert_error on failure', async () => {
        API.call.mockRejectedValue(new Error('boom'));
        const dispatch = await run(registerUser({}));
        expect(typesOf(dispatch)).toContain('SHOW_ALERT_ERROR');
    });
});

describe('admin/syncActions', () => {
    describe('syncBhrLeaves', () => {
        it('dispatches SYNC_BHR_LEAVES on success', async () => {
            API.call.mockResolvedValue(okResult([1, 2]));
            const dispatch = await run(syncBhrLeaves({ valid_from: '2026-01-01', valid_to: '2026-01-31' }));
            expect(API.call).toHaveBeenCalledWith(expect.objectContaining({
                url: '/cron/sync_leaves/2026-01-01/2026-01-31',
            }));
            expect(typesOf(dispatch)).toContain('SYNC_BHR_LEAVES');
        });
        it('dispatches alert_error on failure', async () => {
            API.call.mockRejectedValue(new Error('boom'));
            const dispatch = await run(syncBhrLeaves({ valid_from: 'a', valid_to: 'b' }));
            expect(typesOf(dispatch)).toContain('SHOW_ALERT_ERROR');
        });
    });
    describe('syncUTCAdjusetment', () => {
        it('dispatches alert_success on success', async () => {
            API.call.mockResolvedValue(okResult({}));
            const dispatch = await run(syncUTCAdjusetment({}));
            expect(API.call).toHaveBeenCalledWith(expect.objectContaining({ url: '/utc/sync_adjustment/' }));
            expect(typesOf(dispatch)).toContain('SHOW_ALERT');
        });
        it('dispatches alert_error on failure', async () => {
            API.call.mockRejectedValue(new Error('boom'));
            const dispatch = await run(syncUTCAdjusetment({}));
            expect(typesOf(dispatch)).toContain('SHOW_ALERT_ERROR');
        });
    });
    describe('syncBhrUsers', () => {
        it('dispatches SYNC_USER_UPDATES on success', async () => {
            API.call.mockResolvedValue(okResult([1]));
            const dispatch = await run(syncBhrUsers({ valid_from: '2026-01-01' }));
            expect(API.call).toHaveBeenCalledWith(expect.objectContaining({
                url: '/cron/sync_users/2026-01-01T00:00:00-00:00',
            }));
            expect(typesOf(dispatch)).toContain('SYNC_USER_UPDATES');
        });
        it('dispatches alert_error on failure', async () => {
            API.call.mockRejectedValue(new Error('boom'));
            const dispatch = await run(syncBhrUsers({ valid_from: 'a' }));
            expect(typesOf(dispatch)).toContain('SHOW_ALERT_ERROR');
        });
    });
    describe('syncBiometrics', () => {
        it('dispatches SYNC_BIOMETRICS on success', async () => {
            API.call.mockResolvedValue(okResult([1]));
            const dispatch = await run(syncBiometrics({ valid_from: 'a', valid_to: 'b' }));
            expect(API.call).toHaveBeenCalledWith(expect.objectContaining({
                url: '/cron/sync_realtime_biometrics/a/b',
            }));
            expect(typesOf(dispatch)).toContain('SYNC_BIOMETRICS');
        });
        it('dispatches alert_error on failure', async () => {
            API.call.mockRejectedValue(new Error('boom'));
            const dispatch = await run(syncBiometrics({ valid_from: 'a', valid_to: 'b' }));
            expect(typesOf(dispatch)).toContain('SHOW_ALERT_ERROR');
        });
    });
});
