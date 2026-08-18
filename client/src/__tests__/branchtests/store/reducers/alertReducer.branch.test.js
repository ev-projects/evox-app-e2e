/**
 * EVOX — Jest: Alert reducer (the toast/banner shown on every screen)
 *
 * Source under test:
 *   src/store/reducers/settings/alertReducers.js
 *
 * Menu path: global — every page dispatches SHOW_ALERT through Formatter.alert_success /
 *            Formatter.alert_error, and the Template AlertContainer renders this slice.
 *
 * Coverage before this file: 100% statements / 27.7% branches (13 uncovered branch arms).
 *
 * Rules asserted here (both arms of every conditional):
 *   - An action carrying `error` renders the danger variant; without it, the success variant.
 *   - The banner text is taken from the API error message, falling back to `content` and then
 *     to the HTTP statusText.
 *   - A caller-supplied header overrides the default heading on both variants.
 *   - Success alerts default to a 4500ms auto-hide, error alerts to no auto-hide.
 *   - HIDE_ALERT restores the pristine state, TOGGLE_TIMEOUT flips the auto-hide flag only,
 *     and an unrelated action returns the state untouched.
 *
 * FINDING ALR-TIMEOUT-1 is characterized at the bottom of this file.
 */

import alertReducer from '../../../../store/reducers/settings/alertReducers';

const initState = {
    onShow: false,
    error: {},
    variant: '',
    header: '',
    body: '',
    isTimeOutActive: false,
    timeOut: 0,
    errorMessage: '',
};

describe('alertReducer — SHOW_ALERT error variant', () => {
    test('an API error with a message body renders that message under the default heading', () => {
        const result = alertReducer(initState, {
            type: 'SHOW_ALERT',
            error: { data: { error: { message: 'Employee number already exists' } } },
            timeOut: 3000,
        });

        expect(result).toEqual({
            onShow: true,
            variant: 'danger',
            header: 'An error has occured:',
            body: 'Employee number already exists',
            timeOut: 3000,
            isTimeOutActive: true,
        });
    });

    test('a caller-supplied header replaces the default error heading', () => {
        const result = alertReducer(initState, {
            type: 'SHOW_ALERT',
            header: 'Payroll cut-off locked',
            error: { data: { error: { message: 'Locked' } } },
        });

        expect(result.header).toBe('Payroll cut-off locked');
        expect(result.variant).toBe('danger');
    });

    test('an error with no message falls back to the content field', () => {
        const result = alertReducer(initState, {
            type: 'SHOW_ALERT',
            error: { content: 'Token expired', statusText: 'Unauthorized' },
        });

        expect(result.body).toBe('Token expired');
    });

    test('an error with neither message nor content falls back to the HTTP statusText', () => {
        const result = alertReducer(initState, {
            type: 'SHOW_ALERT',
            error: { status: 500, statusText: 'Internal Server Error', data: {} },
        });

        expect(result.body).toBe('Internal Server Error');
    });

    test('an explicit zero timeout keeps the error banner pinned open', () => {
        const result = alertReducer(initState, {
            type: 'SHOW_ALERT',
            error: { statusText: 'Bad Request' },
            timeOut: 0,
        });

        expect(result.timeOut).toBe(0);
        expect(result.isTimeOutActive).toBe(false);
    });
});

describe('alertReducer — SHOW_ALERT success variant', () => {
    test('a success alert with a header and body renders the success variant', () => {
        const result = alertReducer(initState, {
            type: 'SHOW_ALERT',
            header: 'Request approved',
            body: 'The overtime request was approved.',
            timeOut: 3000,
        });

        expect(result).toEqual({
            onShow: true,
            variant: 'success',
            header: 'Request approved',
            body: 'The overtime request was approved.',
            timeOut: 3000,
            isTimeOutActive: true,
        });
    });

    test('a success alert with no header or body renders empty text and the 4500ms default', () => {
        const result = alertReducer(initState, { type: 'SHOW_ALERT' });

        expect(result.header).toBe('');
        expect(result.body).toBe('');
        expect(result.timeOut).toBe(4500);
        expect(result.isTimeOutActive).toBe(true);
    });

    test('an explicit zero timeout on a success alert disables the auto-hide', () => {
        const result = alertReducer(initState, {
            type: 'SHOW_ALERT',
            header: 'Saved',
            timeOut: 0,
        });

        expect(result.timeOut).toBe(4500);
        expect(result.isTimeOutActive).toBe(false);
    });
});

describe('alertReducer — SHOW_ALERT_MESSAGE', () => {
    test('a plain error message is rendered as a danger banner with the default heading', () => {
        const result = alertReducer(initState, {
            type: 'SHOW_ALERT_MESSAGE',
            errorMessage: 'No User Found...',
            timeOut: 2000,
        });

        expect(result).toEqual({
            onShow: true,
            variant: 'danger',
            header: 'An error has occured:',
            body: 'No User Found...',
            timeOut: 2000,
            isTimeOutActive: true,
        });
    });

    test('a missing message renders an empty body and no auto-hide when the timeout is zero', () => {
        const result = alertReducer(initState, { type: 'SHOW_ALERT_MESSAGE', timeOut: 0 });

        expect(result.body).toBe('');
        expect(result.timeOut).toBe(0);
        expect(result.isTimeOutActive).toBe(false);
    });
});

describe('alertReducer — lifecycle actions', () => {
    test('HIDE_ALERT restores the pristine alert state', () => {
        const shown = alertReducer(initState, { type: 'SHOW_ALERT', header: 'Saved' });

        expect(alertReducer(shown, { type: 'HIDE_ALERT' })).toEqual(initState);
    });

    test('TOGGLE_TIMEOUT flips the auto-hide flag and returns a new object', () => {
        const state = { ...initState, onShow: true, isTimeOutActive: true, header: 'Saved' };

        const toggled = alertReducer(state, { type: 'TOGGLE_TIMEOUT' });

        expect(toggled.isTimeOutActive).toBe(false);
        expect(toggled.header).toBe('Saved');
        expect(toggled).not.toBe(state);
        expect(state.isTimeOutActive).toBe(true);
        expect(alertReducer(toggled, { type: 'TOGGLE_TIMEOUT' }).isTimeOutActive).toBe(true);
    });

    test('an unrelated action returns the same state instance', () => {
        const state = { ...initState, onShow: true };

        expect(alertReducer(state, { type: 'FETCH_PROFILE' })).toBe(state);
    });

    test('the reducer seeds the pristine state when called with no state', () => {
        expect(alertReducer(undefined, { type: '@@INIT' })).toEqual(initState);
    });
});

/**
 * FINDING ALR-TIMEOUT-1 (dead state, no user impact today) — `isTimeOutActive` is written
 * incoherently and read by nobody.
 *
 * The flag is computed as `action.timeOut != 0`, which is TRUE when `timeOut` is undefined
 * (undefined != 0) even though the error arm then defaults `timeOut` itself to 0. So an
 * error alert raised without an explicit timeout is recorded as "auto-hiding after 0ms".
 *
 * It changes nothing today because no consumer reads the flag: AlertContainer decides whether
 * to auto-hide from `alert.timeOut != 0` alone, and the `toggleTimeOut` dispatcher it maps into
 * props is never called. The flag and the TOGGLE_TIMEOUT case are dead state, which is exactly
 * why this is filed as a cleanup item rather than a bug. Recorded so that anyone who later
 * wires a component to `isTimeOutActive` knows the value is not trustworthy.
 *
 * The coercion is plain JavaScript, not a test-environment artefact.
 */
test('_FINDING_ALR_TIMEOUT_1 an error alert with no timeout is flagged auto-hiding with a 0ms lifetime', () => {
    const result = alertReducer(initState, {
        type: 'SHOW_ALERT',
        error: { statusText: 'Bad Request' },
    });

    expect(result.timeOut).toBe(0);
    expect(result.isTimeOutActive).toBe(true);
});
