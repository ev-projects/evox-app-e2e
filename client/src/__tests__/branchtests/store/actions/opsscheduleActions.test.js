/**
 * EVOX Frontend Jest — OpsSchedule Redux Action Creators
 *
 * COPY TO (client tree):  client/src/__tests__/branchtests/store/actions/opsscheduleActions.test.js
 *
 * Covers the thunk action creators in src/store/actions/opsschedule/opsScheduleActions.js.
 * These are redux-thunk creators that hit the custom API service and dispatch
 * Formatter-built alert / redirect actions. API + Formatter are jest.mock'd so
 * NO real HTTP fires. The sibling action modules pulled in by opsScheduleActions
 * (redirect / requestList / dashboard actions) transitively import the SAME API
 * service, so mocking it here keeps the whole graph HTTP-free.
 *
 * Import paths are relative to the copy-to location above.
 */

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
    addOpsSchedule,
    fetchOpsSchedulesList,
    fetchOpsSchedules,
    fetchOpsSchedule,
    updateOpsSchedule,
    deleteOpsSchedule,
    clearOpsScheduleInstance,
    resetOpsScheduleInstance,
} from '../../../../store/actions/opsschedule/opsScheduleActions';

const flush = () => new Promise((resolve) => setImmediate(resolve));

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

describe('opsschedule/addOpsSchedule', () => {
    it('dispatches alert_success + SET_REDIRECT to ops_schedule on success', async () => {
        API.call.mockResolvedValue(okResult({}));
        const dispatch = await run(addOpsSchedule({ name: 'x' }));
        expect(API.call).toHaveBeenCalledWith(expect.objectContaining({ method: 'post', url: '/opsschedule' }));
        const redirect = dispatch.mock.calls.find((c) => c[0].type === 'SET_REDIRECT');
        expect(redirect[0].link).toBe('/opsschedule');
        expect(typesOf(dispatch)).toContain('SHOW_ALERT');
    });
    it('dispatches alert_error on failure', async () => {
        API.call.mockRejectedValue(new Error('boom'));
        const dispatch = await run(addOpsSchedule({}));
        expect(Formatter.alert_error).toHaveBeenCalled();
        expect(typesOf(dispatch)).toContain('SHOW_ALERT_ERROR');
    });
});

describe('opsschedule/fetchOpsSchedulesList', () => {
    it('dispatches FETCH_OPSSCHEDULES_SUCCESS on success', async () => {
        API.call.mockResolvedValue(okResult([{ id: 1 }]));
        const dispatch = await run(fetchOpsSchedulesList(9));
        expect(API.call).toHaveBeenCalledWith(expect.objectContaining({ url: '/opsschedule/list/9' }));
        expect(typesOf(dispatch)).toContain('FETCH_OPSSCHEDULES_SUCCESS');
    });
    it('dispatches alert_error on failure', async () => {
        API.call.mockRejectedValue(new Error('boom'));
        const dispatch = await run(fetchOpsSchedulesList(9));
        expect(typesOf(dispatch)).toContain('SHOW_ALERT_ERROR');
    });
});

describe('opsschedule/fetchOpsSchedules', () => {
    it('dispatches FETCH_OPSSCHEDULES_SUCCESS on success', async () => {
        API.call.mockResolvedValue(okResult([{ id: 1 }]));
        const dispatch = await run(fetchOpsSchedules());
        expect(API.call).toHaveBeenCalledWith(expect.objectContaining({ method: 'get', url: '/opsschedule' }));
        expect(typesOf(dispatch)).toContain('FETCH_OPSSCHEDULES_SUCCESS');
    });
    it('dispatches alert_error on failure', async () => {
        API.call.mockRejectedValue(new Error('boom'));
        const dispatch = await run(fetchOpsSchedules());
        expect(typesOf(dispatch)).toContain('SHOW_ALERT_ERROR');
    });
});

describe('opsschedule/fetchOpsSchedule', () => {
    it('dispatches FETCH_OPSSCHEDULE_SUCCESS on success', async () => {
        API.call.mockResolvedValue(okResult({ id: 7 }));
        const dispatch = await run(fetchOpsSchedule(7));
        expect(API.call).toHaveBeenCalledWith(expect.objectContaining({ url: '/opsschedule/show/7' }));
        expect(typesOf(dispatch)).toContain('FETCH_OPSSCHEDULE_SUCCESS');
    });
    it('dispatches alert_error on failure', async () => {
        API.call.mockRejectedValue(new Error('boom'));
        const dispatch = await run(fetchOpsSchedule(7));
        expect(typesOf(dispatch)).toContain('SHOW_ALERT_ERROR');
    });
});

describe('opsschedule/updateOpsSchedule', () => {
    it('dispatches alert_success + SET_REDIRECT on success', async () => {
        API.call.mockResolvedValue(okResult({}));
        const dispatch = await run(updateOpsSchedule(7, { name: 'y' }));
        expect(API.call).toHaveBeenCalledWith(expect.objectContaining({ method: 'post', url: '/opsschedule/7' }));
        const types = typesOf(dispatch);
        expect(types).toContain('SHOW_ALERT');
        expect(types).toContain('SET_REDIRECT');
    });
    it('dispatches alert_error on failure', async () => {
        API.call.mockRejectedValue(new Error('boom'));
        const dispatch = await run(updateOpsSchedule(7, {}));
        expect(typesOf(dispatch)).toContain('SHOW_ALERT_ERROR');
    });
});

describe('opsschedule/deleteOpsSchedule', () => {
    it('dispatches alert_success + SET_REDIRECT on success', async () => {
        API.call.mockResolvedValue(okResult({}));
        const dispatch = await run(deleteOpsSchedule(7));
        expect(API.call).toHaveBeenCalledWith(expect.objectContaining({ method: 'delete', url: '/opsschedule/7' }));
        const types = typesOf(dispatch);
        expect(types).toContain('SHOW_ALERT');
        expect(types).toContain('SET_REDIRECT');
    });
    it('dispatches alert_error on failure', async () => {
        API.call.mockRejectedValue(new Error('boom'));
        const dispatch = await run(deleteOpsSchedule(7));
        expect(typesOf(dispatch)).toContain('SHOW_ALERT_ERROR');
    });
});

describe('opsschedule/instance clearers (no API)', () => {
    it('clearOpsScheduleInstance dispatches CLEAR_OPSSCHEDULE_INSTANCE', async () => {
        const dispatch = await run(clearOpsScheduleInstance());
        expect(typesOf(dispatch)).toContain('CLEAR_OPSSCHEDULE_INSTANCE');
        expect(API.call).not.toHaveBeenCalled();
    });
    it('resetOpsScheduleInstance dispatches RESET_OPSSCHEDULE_INSTANCE', async () => {
        const dispatch = await run(resetOpsScheduleInstance());
        expect(typesOf(dispatch)).toContain('RESET_OPSSCHEDULE_INSTANCE');
        expect(API.call).not.toHaveBeenCalled();
    });
});
