/**
 * EVOX — Jest: session, asset and survey thunks
 *
 * Source under test:
 *   src/store/actions/userActions.js
 *
 * Menu paths: Login / Modal re-login, My Profile -> My Assets, and the NHO, EVA, Code of
 *             Conduct, EVA registration and Happiness surveys that pop up on the Dashboard.
 *
 * Coverage before this file: 1 uncovered function / 6 uncovered branch arms.
 *
 * Rules asserted here (both arms of every conditional):
 *   - A login that comes back with an access token hides the re-login modal; one without a
 *     token leaves the modal up.
 *   - The Microsoft login rejection path raises a second, 401-shaped alert only for HTTP 403,
 *     which is what re-opens the login modal.
 *   - Every survey submission acts only on HTTP 200: it closes the modal, confirms for five
 *     seconds and clears the cached survey. Any other status leaves the modal open.
 *   - After an NHO survey the Glassdoor review page is opened six seconds later, not sooner.
 *   - Every thunk routes failures through Formatter.alert_error.
 *
 * Determinism: the Glassdoor hand-off is driven with jest fake timers, never a real wait.
 */

jest.mock('axios', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mock('react-promise-tracker', () => ({
    trackPromise: (promise) => promise,
}));

jest.mock('../../../../services/API', () => ({
    __esModule: true,
    default: { call: jest.fn(), export: jest.fn() },
}));

jest.mock('../../../../services/Formatter', () => ({
    __esModule: true,
    default: {
        alert_success: jest.fn((result, timeOut) => ({ type: 'SHOW_ALERT', __arm: 'success', result, timeOut })),
        alert_error: jest.fn((error, timeOut) => ({ type: 'SHOW_ALERT', __arm: 'error', error, timeOut })),
    },
}));

import axios from 'axios';
import API from '../../../../services/API';
import Formatter from '../../../../services/Formatter';
import {
    logIn,
    authenticateClient,
    authenticateMSClient,
    logOut,
    fetchUser,
    getUserInfo,
    forgotPasswordRequest,
    getAllAssets,
    getUserAsset,
    getUserAssets,
    addUserAsset,
    updateUserAsset,
    getNhoSurvey,
    addNhoSurvey,
    getEvaSurvey,
    addEvaSurvey,
    getUserCoc,
    acknowledgeCOC,
    getEvaReg,
    submitEvaReg,
    getHappinessSurvey,
    addHappinessSurvey,
} from '../../../../store/actions/userActions';

global.links = new Proxy({}, { get: (target, name) => '/x/' + String(name) });

const flush = () => new Promise((resolve) => setImmediate(resolve));
const failure = { status: 500, statusText: 'Server Error', data: {} };

let dispatch;
let getState;
let realLocation;

beforeAll(() => {
    // jsdom 11 refuses real navigation; swap the location object so logOut and the MS login can
    // run their success arms. This is an environment shim, not a defect workaround.
    realLocation = window.location;
    try {
        delete window.location;
        window.location = { href: '', reload: jest.fn(), assign: jest.fn() };
    } catch (e) {
        // Older jsdom builds keep window.location non-configurable; the assertions below that
        // do not touch navigation still hold.
    }
});

afterAll(() => {
    try {
        window.location = realLocation;
    } catch (e) {
        /* nothing to restore */
    }
});

beforeEach(() => {
    jest.clearAllMocks();
    API.call.mockReset();
    axios.mockReset();
    localStorage.clear();
    document.body.innerHTML = '';
    dispatch = jest.fn();
    getState = jest.fn(() => ({}));
    if (window.location && window.location.reload && window.location.reload.mockClear) {
        window.location.reload.mockClear();
    }
});

const loginPayload = (accessToken) => ({
    data: {
        content: {
            access_token: accessToken,
            session_id: 'sess-42',
            payload: { menu: [] },
            user: { id: 7 },
            constant: { app: 'EVOX' },
            settings: { theme: 'light' },
        },
    },
});

describe('userActions — signing in', () => {
    test('a login that returns an access token stores it and hides the re-login modal', async () => {
        axios.mockResolvedValueOnce(loginPayload('tok-123'));

        logIn({ email: 'ana@example.com', password: 'secret' })(dispatch, getState);

        expect(dispatch).toHaveBeenNthCalledWith(1, { type: 'REQUEST_START' });
        await flush();

        expect(axios).toHaveBeenCalledWith(
            expect.objectContaining({
                method: 'post',
                data: { email: 'ana@example.com', password: 'secret' },
            }),
        );
        expect(localStorage.getItem('access_token')).toBe('tok-123');
        expect(localStorage.getItem('session_id')).toBe('sess-42');
        expect(dispatch.mock.calls.map((c) => c[0].type)).toEqual([
            'REQUEST_START',
            'LOGIN_SUCCESS',
            'HIDE_MODAL_LOGIN',
            'RENDER_CONSTANT',
            'RENDER_SETTINGS',
        ]);
    });

    test('a login answered without an access token leaves the re-login modal up', async () => {
        axios.mockResolvedValueOnce(loginPayload(undefined));

        logIn({ email: 'ana@example.com', password: 'secret' })(dispatch, getState);
        await flush();

        expect(dispatch.mock.calls.map((c) => c[0].type)).toEqual([
            'REQUEST_START',
            'LOGIN_SUCCESS',
            'RENDER_CONSTANT',
            'RENDER_SETTINGS',
        ]);
    });

    test('a rejected login alerts with the HTTP response body', async () => {
        axios.mockRejectedValueOnce({ response: { status: 401, statusText: 'Unauthorized' } });

        logIn({ email: 'ana@example.com', password: 'wrong' })(dispatch, getState);
        await flush();

        expect(Formatter.alert_error).toHaveBeenCalledWith({ status: 401, statusText: 'Unauthorized' });
        expect(dispatch).toHaveBeenLastCalledWith(Formatter.alert_error.mock.results[0].value);
    });

    test('a client token sign-in stores the token and seeds the user, constants and settings', async () => {
        axios.mockResolvedValueOnce(loginPayload('tok-abc'));

        authenticateClient('tok-abc')(dispatch, getState);
        await flush();

        expect(axios).toHaveBeenCalledWith(
            expect.objectContaining({
                method: 'get',
                headers: expect.objectContaining({ Authorization: 'Bearer tok-abc' }),
            }),
        );
        expect(localStorage.getItem('access_token')).toBe('tok-abc');
        expect(dispatch.mock.calls.map((c) => c[0].type)).toEqual([
            'REQUEST_START',
            'LOGIN_SUCCESS',
            'RENDER_CONSTANT',
            'RENDER_SETTINGS',
        ]);
    });

    test('a rejected client token sign-in is swallowed after the request marker', async () => {
        axios.mockRejectedValueOnce({ response: { status: 401 } });

        authenticateClient('bad-token')(dispatch, getState);
        await flush();

        expect(dispatch).toHaveBeenCalledTimes(1);
        expect(dispatch).toHaveBeenCalledWith({ type: 'REQUEST_START' });
        expect(Formatter.alert_error).not.toHaveBeenCalled();
    });

    test('a Microsoft sign-in rejected with 403 raises a second alert that re-opens the login', async () => {
        axios.mockRejectedValueOnce({ response: { status: 403, statusText: 'Forbidden' } });

        authenticateMSClient('ms-code')(dispatch, getState);
        await flush();

        expect(Formatter.alert_error).toHaveBeenNthCalledWith(1, { status: 403, statusText: 'Forbidden' }, 3000);
        expect(Formatter.alert_error).toHaveBeenNthCalledWith(2, { status: 401 });
        expect(dispatch).toHaveBeenCalledTimes(3);
    });

    test('a Microsoft sign-in rejected with any other status raises only one alert', async () => {
        axios.mockRejectedValueOnce({ response: { status: 500, statusText: 'Server Error' } });

        authenticateMSClient('ms-code')(dispatch, getState);
        await flush();

        expect(Formatter.alert_error).toHaveBeenCalledTimes(1);
        expect(dispatch).toHaveBeenCalledTimes(2);
    });

    test('a Microsoft sign-in rejected with no response at all raises only one alert', async () => {
        axios.mockRejectedValueOnce({ message: 'Network Error' });

        authenticateMSClient('ms-code')(dispatch, getState);
        await flush();

        expect(Formatter.alert_error).toHaveBeenCalledTimes(1);
        expect(Formatter.alert_error).toHaveBeenCalledWith(undefined, 3000);
    });

    test('a forgotten-password request confirms for five seconds and sends the user back to login', async () => {
        const result = { data: { message: 'Reset link sent' } };
        axios.mockResolvedValueOnce(result);

        forgotPasswordRequest('ana@example.com')(dispatch, getState);
        await flush();

        expect(axios).toHaveBeenCalledWith(
            expect.objectContaining({ method: 'post', data: { email: 'ana@example.com' } }),
        );
        expect(Formatter.alert_success).toHaveBeenCalledWith(result, 5000);
        expect(dispatch).toHaveBeenLastCalledWith({ type: 'SET_REDIRECT', link: global.links.login });
    });

    test('a rejected forgotten-password request alerts and redirects nowhere', async () => {
        axios.mockRejectedValueOnce({ response: { status: 404, statusText: 'Not Found' } });

        forgotPasswordRequest('nobody@example.com')(dispatch, getState);
        await flush();

        expect(dispatch.mock.calls.map((c) => c[0].type)).toEqual(['REQUEST_START', 'SHOW_ALERT']);
    });
});

describe('userActions — session housekeeping', () => {
    test('logging out clears the stored token and session and empties the DTR widget', async () => {
        localStorage.setItem('access_token', 'tok-123');
        localStorage.setItem('session_id', 'sess-42');
        sessionStorage.setItem('hasSeenReferralModal', 'true');
        API.call.mockResolvedValueOnce({ data: { message: 'Logged out' } });

        logOut()(dispatch, getState);
        await flush();

        expect(API.call).toHaveBeenCalledWith({
            method: 'post',
            url: '/auth/logout',
            data: { session_id: 'sess-42' },
        });
        expect(localStorage.getItem('access_token')).toBeNull();
        expect(localStorage.getItem('session_id')).toBeNull();
        expect(sessionStorage.getItem('hasSeenReferralModal')).toBeNull();
        expect(dispatch.mock.calls.map((c) => c[0].type)).toEqual([
            'CLEAR_RECENT_DTR_INSTANCE',
            'LOGOUT_SUCCESS',
            'SHOW_ALERT',
        ]);
    });

    test('a failed logout alerts and keeps the stored token', async () => {
        localStorage.setItem('access_token', 'tok-123');
        API.call.mockRejectedValueOnce(failure);

        logOut()(dispatch, getState);
        await flush();

        expect(localStorage.getItem('access_token')).toBe('tok-123');
        expect(dispatch).toHaveBeenCalledTimes(1);
        expect(dispatch).toHaveBeenCalledWith(Formatter.alert_error.mock.results[0].value);
    });

    test('refetching the session republishes the user, constants and settings between reload markers', async () => {
        API.call.mockResolvedValueOnce(loginPayload('tok-123'));

        fetchUser()(dispatch, getState);
        await flush();

        expect(API.call).toHaveBeenCalledWith({ method: 'post', url: '/auth/payload' });
        expect(dispatch.mock.calls.map((c) => c[0].type)).toEqual([
            'RELOAD_START',
            'FETCH_USER_SUCCESS',
            'RENDER_CONSTANT',
            'RENDER_SETTINGS',
            'RELOAD_END',
        ]);
    });

    test('a failed session refetch alerts and never ends the reload', async () => {
        API.call.mockRejectedValueOnce(failure);

        fetchUser()(dispatch, getState);
        await flush();

        expect(dispatch.mock.calls.map((c) => c[0].type)).toEqual(['RELOAD_START', 'SHOW_ALERT']);
    });

    test('the user info read publishes the name and department, and a failure alerts', async () => {
        API.call.mockResolvedValueOnce({ data: { content: { name: 'Ana', department: 'Finance' } } });
        getUserInfo(7)(dispatch, getState);
        await flush();
        expect(API.call).toHaveBeenCalledWith({ method: 'get', url: '/user/7/info' });
        expect(dispatch.mock.calls.map((c) => c[0].type)).toEqual(['FETCH_USER_INFO', 'RELOAD_END']);

        API.call.mockRejectedValueOnce({ response: { status: 404 } });
        getUserInfo(7)(dispatch, getState);
        await flush();
        expect(Formatter.alert_error).toHaveBeenCalledWith({ status: 404 });
    });
});

describe('userActions — asset screens', () => {
    test('the admin asset report stores the rows together with the filters used', async () => {
        API.call.mockResolvedValueOnce({ data: [{ id: 1 }] });

        getAllAssets({ department_id: 4 })(dispatch, getState);
        await flush();

        expect(API.call).toHaveBeenCalledWith({
            method: 'get',
            url: '/user/getallassets',
            params: { department_id: 4 },
        });
        expect(dispatch).toHaveBeenCalledWith({
            type: 'FETCH_ALL_ASSETS',
            data: [{ id: 1 }],
            is_all_asset_loaded: true,
            filters: { department_id: 4 },
        });
    });

    test('one asset and the asset list each raise the loaded flag', async () => {
        API.call.mockResolvedValueOnce({ data: { content: { id: 3 } } });
        getUserAsset(3)(dispatch, getState);
        await flush();
        expect(API.call).toHaveBeenLastCalledWith({ method: 'get', url: '/user/getasset/3' });
        expect(dispatch).toHaveBeenLastCalledWith({
            type: 'FETCH_USER_ASSET',
            data: { id: 3 },
            is_asset_loaded: true,
        });

        API.call.mockResolvedValueOnce({ data: { content: [{ id: 3 }] } });
        getUserAssets()(dispatch, getState);
        await flush();
        expect(dispatch).toHaveBeenLastCalledWith({
            type: 'FETCH_USER_ASSETS',
            data: [{ id: 3 }],
            is_asset_loaded: true,
        });
    });

    test('adding and updating an asset invalidate the cached list before confirming', async () => {
        const result = { data: { message: 'Asset saved' } };
        API.call.mockResolvedValueOnce(result);
        addUserAsset({ name: 'Laptop' })(dispatch, getState);
        await flush();
        expect(API.call).toHaveBeenLastCalledWith({
            method: 'post',
            url: '/user/addasset',
            data: { name: 'Laptop' },
        });
        expect(dispatch.mock.calls.map((c) => c[0].type)).toEqual(['CLEAR_USER_ASSET_LOAD', 'SHOW_ALERT']);
        expect(Formatter.alert_success).toHaveBeenCalledWith(result, 3000);

        API.call.mockResolvedValueOnce(result);
        updateUserAsset({ id: 3, name: 'Laptop 2' })(dispatch, getState);
        await flush();
        expect(API.call).toHaveBeenLastCalledWith({
            method: 'post',
            url: '/user/updateasset',
            data: { id: 3, name: 'Laptop 2' },
        });
    });

    test('every asset thunk surfaces an alert when it fails', async () => {
        const calls = [
            getAllAssets({}),
            getUserAsset(3),
            getUserAssets(),
            addUserAsset({}),
            updateUserAsset({}),
        ];

        for (const call of calls) {
            API.call.mockRejectedValueOnce(failure);
            call(dispatch, getState);
            await flush();
        }

        expect(dispatch).toHaveBeenCalledTimes(calls.length);
        dispatch.mock.calls.forEach(([action]) => expect(action.__arm).toBe('error'));
    });
});

describe('userActions — survey reads', () => {
    test('each survey read publishes its slice and ends the reload', async () => {
        const reads = [
            [getNhoSurvey, '/nho_survey/', 'FETCH_USER_NHO'],
            [getEvaSurvey, '/eva_survey/', 'FETCH_USER_EVA'],
            [getUserCoc, '/user_coc/', 'FETCH_USER_COC'],
            [getEvaReg, '/eva_registration/', 'FETCH_USER_EVA_REG'],
            [getHappinessSurvey, '/happiness_survey/', 'FETCH_USER_HAPPINESS_SURVEY'],
        ];

        for (const [thunk, url, type] of reads) {
            dispatch.mockClear();
            API.call.mockResolvedValueOnce({ data: { content: { questions: [] } } });
            thunk()(dispatch, getState);
            await flush();

            expect(API.call).toHaveBeenLastCalledWith({ method: 'get', url });
            expect(dispatch.mock.calls.map((c) => c[0].type)).toEqual([type, 'RELOAD_END']);
        }
    });

    test('each survey read alerts for three seconds when it fails', async () => {
        const reads = [getNhoSurvey, getEvaSurvey, getUserCoc, getEvaReg, getHappinessSurvey];

        for (const thunk of reads) {
            API.call.mockRejectedValueOnce(failure);
            thunk()(dispatch, getState);
            await flush();
        }

        expect(Formatter.alert_error).toHaveBeenCalledTimes(reads.length);
        Formatter.alert_error.mock.calls.forEach((call) => expect(call).toEqual([failure, 3000]));
    });
});

describe('userActions — survey submissions', () => {
    const closeButtons = () => {
        const clicks = [];
        ['close', 'close'].forEach(() => {
            const btn = document.createElement('button');
            btn.className = 'close';
            btn.addEventListener('click', () => clicks.push(btn));
            document.body.appendChild(btn);
        });
        return clicks;
    };

    test('an accepted EVA submission closes the modal, confirms and clears the cached survey', async () => {
        const clicks = closeButtons();
        const result = { status: 200, data: { message: 'Thank you' } };
        API.call.mockResolvedValueOnce(result);

        addEvaSurvey({ answers: [1, 2] })(dispatch, getState);
        await flush();

        expect(API.call).toHaveBeenCalledWith({
            method: 'post',
            url: '/eva_survey/',
            data: { answers: [1, 2] },
        });
        expect(clicks).toHaveLength(2);
        expect(Formatter.alert_success).toHaveBeenCalledWith(result, 5000);
        expect(dispatch).toHaveBeenLastCalledWith({
            type: 'CLEAR_USER_EVA',
            is_eva_loaded: false,
        });
    });

    test('an EVA submission answered with any other status leaves the modal open', async () => {
        const clicks = closeButtons();
        API.call.mockResolvedValueOnce({ status: 202, data: {} });

        addEvaSurvey({ answers: [] })(dispatch, getState);
        await flush();

        expect(clicks).toHaveLength(0);
        expect(dispatch).not.toHaveBeenCalled();
    });

    test('acknowledging the code of conduct clears the cached copy only on HTTP 200', async () => {
        const clicks = closeButtons();
        API.call.mockResolvedValueOnce({ status: 200, data: { message: 'Acknowledged' } });
        acknowledgeCOC()(dispatch, getState);
        await flush();
        expect(API.call).toHaveBeenCalledWith({ method: 'post', url: '/acknowledge_coc/' });
        expect(clicks).toHaveLength(2);
        expect(dispatch).toHaveBeenLastCalledWith({ type: 'CLEAR_USER_COC', is_coc_loaded: false });

        dispatch.mockClear();
        API.call.mockResolvedValueOnce({ status: 500, data: {} });
        acknowledgeCOC()(dispatch, getState);
        await flush();
        expect(dispatch).not.toHaveBeenCalled();
    });

    test('the EVA registration clears its cached copy only on HTTP 200', async () => {
        closeButtons();
        API.call.mockResolvedValueOnce({ status: 200, data: { message: 'Registered' } });
        submitEvaReg()(dispatch, getState);
        await flush();
        expect(API.call).toHaveBeenCalledWith({ method: 'post', url: '/eva_registration/' });
        expect(dispatch).toHaveBeenLastCalledWith({
            type: 'CLEAR_USER_EVA_REG',
            is_eva_reg_loaded: false,
        });

        dispatch.mockClear();
        API.call.mockResolvedValueOnce({ status: 204, data: {} });
        submitEvaReg()(dispatch, getState);
        await flush();
        expect(dispatch).not.toHaveBeenCalled();
    });

    test('the happiness survey clears its cached copy only on HTTP 200', async () => {
        closeButtons();
        API.call.mockResolvedValueOnce({ status: 200, data: { message: 'Thank you' } });
        addHappinessSurvey({ score: 5 })(dispatch, getState);
        await flush();
        expect(API.call).toHaveBeenCalledWith({
            method: 'post',
            url: '/happiness_survey/',
            data: { score: 5 },
        });
        expect(dispatch).toHaveBeenLastCalledWith({
            type: 'CLEAR_USER_HAPPINESS_SURVEY',
            is_happiness_survey_loaded: false,
        });

        dispatch.mockClear();
        API.call.mockResolvedValueOnce({ status: 400, data: {} });
        addHappinessSurvey({ score: 5 })(dispatch, getState);
        await flush();
        expect(dispatch).not.toHaveBeenCalled();
    });

    test('every survey submission alerts for three seconds when it fails', async () => {
        const submissions = [
            addNhoSurvey({}),
            addEvaSurvey({}),
            acknowledgeCOC(),
            submitEvaReg(),
            addHappinessSurvey({}),
        ];

        for (const submission of submissions) {
            API.call.mockRejectedValueOnce(failure);
            submission(dispatch, getState);
            await flush();
        }

        expect(Formatter.alert_error).toHaveBeenCalledTimes(submissions.length);
        Formatter.alert_error.mock.calls.forEach((call) => expect(call).toEqual([failure, 3000]));
    });
});

describe('userActions — the NHO survey hands off to Glassdoor', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('an accepted NHO survey opens the Glassdoor review page six seconds later, not sooner', async () => {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'close';
        const closeClicked = jest.fn();
        closeBtn.addEventListener('click', closeClicked);
        document.body.appendChild(closeBtn);

        const openedLinks = [];
        const realCreate = document.createElement.bind(document);
        jest.spyOn(document, 'createElement').mockImplementation((tag) => {
            const el = realCreate(tag);
            if (tag === 'a') {
                el.click = jest.fn(() => openedLinks.push(el.href));
            }
            return el;
        });

        API.call.mockResolvedValueOnce({ status: 200, data: { message: 'Thank you' } });

        addNhoSurvey({ answers: [1] })(dispatch, getState);
        await Promise.resolve();
        await Promise.resolve();

        expect(closeClicked).toHaveBeenCalledTimes(1);
        expect(dispatch).toHaveBeenLastCalledWith({ type: 'CLEAR_USER_NHO', is_nho_loaded: false });

        jest.advanceTimersByTime(5999);
        expect(openedLinks).toHaveLength(0);

        jest.advanceTimersByTime(1);
        expect(openedLinks).toEqual([
            'https://www.glassdoor.com/surveys/interviews/create?i=1084085&c=PAGE_INFOSITE_TOP',
        ]);
        expect(document.body.querySelectorAll('a')).toHaveLength(0);

        document.createElement.mockRestore();
    });

    test('an NHO survey answered with any other status neither closes the modal nor opens Glassdoor', async () => {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'close';
        const closeClicked = jest.fn();
        closeBtn.addEventListener('click', closeClicked);
        document.body.appendChild(closeBtn);

        API.call.mockResolvedValueOnce({ status: 422, data: {} });

        addNhoSurvey({ answers: [] })(dispatch, getState);
        await Promise.resolve();
        await Promise.resolve();

        expect(closeClicked).not.toHaveBeenCalled();
        expect(dispatch).not.toHaveBeenCalled();

        jest.advanceTimersByTime(10000);
        expect(document.body.querySelectorAll('a')).toHaveLength(0);
    });
});
