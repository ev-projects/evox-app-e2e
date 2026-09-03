/**
 * EVOX — Jest: quick punch thunks
 *
 * Source under test:
 *   src/store/actions/dtr/quickpunchActions.js
 *
 * Menu path: top navigation clock (Quick Punch) and Dashboard -> Multiple Quick Punch
 *
 * Coverage before this file: 2 uncovered functions (the nested DTR/punch refresh handlers).
 *
 * Rules asserted here (both arms of every conditional):
 *   - A single punch posts the punch, re-opens the nav clock, then refetches the DTR window
 *     that runs from yesterday to today measured two hours ahead of the user's clock (the
 *     offset EVOX uses so a night shift still lands on the right day).
 *   - A multi punch refetches the plain yesterday-to-today punch window instead.
 *   - Both the outer post and the inner refetch have their own failure arm.
 *
 * Determinism: moment is pinned to 2026-08-18T10:00:00 so the generated URLs can never
 * depend on the day the suite runs.
 */

jest.mock('moment', () => {
    const actual = jest.requireActual('moment');
    const pinned = (...args) => (args.length ? actual(...args) : actual('2026-08-18T10:00:00'));
    Object.assign(pinned, actual);
    return pinned;
});

jest.mock('jquery', () => {
    const clicked = [];
    const jq = jest.fn((selector) => ({
        click: jest.fn(() => clicked.push(selector)),
    }));
    jq.__clicked = clicked;
    return jq;
});

jest.mock('../../../../services/API', () => ({
    __esModule: true,
    default: { call: jest.fn(), export: jest.fn() },
}));

jest.mock('../../../../services/Formatter', () => ({
    __esModule: true,
    default: {
        alert_success: jest.fn((result, timeOut) => ({ type: 'SHOW_ALERT', __arm: 'success', result, timeOut })),
        alert_error: jest.fn((error) => ({ type: 'SHOW_ALERT', __arm: 'error', error })),
    },
}));

import $ from 'jquery';
import API from '../../../../services/API';
import Formatter from '../../../../services/Formatter';
import { biometrixLog, biometrixLogMulti } from '../../../../store/actions/dtr/quickpunchActions';

const flush = () => new Promise((resolve) => setImmediate(resolve));
const failure = { status: 500, statusText: 'Server Error', data: {} };

let dispatch;
let getState;

beforeEach(() => {
    jest.clearAllMocks();
    API.call.mockReset();
    $.__clicked.length = 0;
    dispatch = jest.fn();
    getState = jest.fn(() => ({}));
});

describe('biometrixLog — the nav clock quick punch', () => {
    test('a successful punch re-opens the clock and refetches yesterday-to-today shifted two hours ahead', async () => {
        API.call
            .mockResolvedValueOnce({ data: { message: 'Punched in' } })
            .mockResolvedValueOnce({ data: { content: { dtr_records: [{ id: 1 }] } } });

        biometrixLog({ punch_type: 'in' }, 7)(dispatch, getState);
        await flush();

        expect(API.call).toHaveBeenNthCalledWith(1, {
            method: 'post',
            url: '/dtr/quickpunch/',
            data: { punch_type: 'in' },
        });
        expect($.__clicked).toEqual(['.nav-clock.dropdown-toggle.btn.btn-primary']);
        expect(API.call).toHaveBeenNthCalledWith(2, {
            method: 'get',
            url: '/dtr/7/2026-08-17/2026-08-18',
        });
        expect(dispatch).toHaveBeenCalledWith({
            type: 'FETCH_RECENT_DTR',
            recent_dtr: [{ id: 1 }],
        });
        expect(Formatter.alert_success).toHaveBeenCalledWith({ data: { message: 'Punched in' } });
    });

    test('a punch whose refetch fails still confirms the punch but shows the refetch error', async () => {
        API.call
            .mockResolvedValueOnce({ data: { message: 'Punched in' } })
            .mockRejectedValueOnce(failure);

        biometrixLog({ punch_type: 'in' }, 7)(dispatch, getState);
        await flush();

        expect(Formatter.alert_success).toHaveBeenCalledTimes(1);
        expect(Formatter.alert_error).toHaveBeenCalledWith(failure);
        expect(dispatch).not.toHaveBeenCalledWith(
            expect.objectContaining({ type: 'FETCH_RECENT_DTR' }),
        );
    });

    test('a rejected punch alerts, refetches nothing and never touches the clock', async () => {
        API.call.mockRejectedValueOnce(failure);

        biometrixLog({ punch_type: 'in' }, 7)(dispatch, getState);
        await flush();

        expect(API.call).toHaveBeenCalledTimes(1);
        expect($.__clicked).toEqual([]);
        expect(Formatter.alert_success).not.toHaveBeenCalled();
        expect(dispatch).toHaveBeenCalledWith(Formatter.alert_error.mock.results[0].value);
    });
});

describe('biometrixLogMulti — the multiple quick punch screen', () => {
    test('a successful multi punch refetches the plain yesterday-to-today punch window', async () => {
        API.call
            .mockResolvedValueOnce({ data: { message: 'Punched' } })
            .mockResolvedValueOnce({ data: { punches: [{ id: 2 }] } });

        biometrixLogMulti({ users: [7, 8] }, 7)(dispatch, getState);
        await flush();

        expect(API.call).toHaveBeenNthCalledWith(1, {
            method: 'post',
            url: '/dtr/quickpunch_multi/',
            data: { users: [7, 8] },
        });
        expect(API.call).toHaveBeenNthCalledWith(2, {
            method: 'get',
            url: '/dtr/punch/7/2026-08-17/2026-08-18',
        });
        expect(dispatch).toHaveBeenCalledWith({
            type: 'FETCH_RECENT_PUNCH',
            data: { punches: [{ id: 2 }] },
        });
    });

    test('a multi punch does not raise a success alert of its own', async () => {
        API.call
            .mockResolvedValueOnce({ data: { message: 'Punched' } })
            .mockResolvedValueOnce({ data: { punches: [] } });

        biometrixLogMulti({ users: [7] }, 7)(dispatch, getState);
        await flush();

        expect(Formatter.alert_success).not.toHaveBeenCalled();
    });

    test('a multi punch whose refetch fails surfaces the refetch error', async () => {
        API.call
            .mockResolvedValueOnce({ data: { message: 'Punched' } })
            .mockRejectedValueOnce({ ...failure, data: { error: 'boom' } });

        biometrixLogMulti({ users: [7] }, 7)(dispatch, getState);
        await flush();

        expect(Formatter.alert_error).toHaveBeenCalledTimes(1);
        expect(dispatch).not.toHaveBeenCalledWith(
            expect.objectContaining({ type: 'FETCH_RECENT_PUNCH' }),
        );
    });

    test('a rejected multi punch alerts and refetches nothing', async () => {
        API.call.mockRejectedValueOnce(failure);

        biometrixLogMulti({ users: [7] }, 7)(dispatch, getState);
        await flush();

        expect(API.call).toHaveBeenCalledTimes(1);
        expect(dispatch).toHaveBeenCalledWith(Formatter.alert_error.mock.results[0].value);
    });
});
