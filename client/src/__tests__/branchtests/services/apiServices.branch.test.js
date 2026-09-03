/**
 * EVOX — Jest: the HTTP transport services
 *
 * Sources under test:
 *   src/services/API.js
 *   src/services/APICALL.js
 *
 * Menu path: global — API.call/API.export carry every screen's traffic; APICALL is the
 *            unauthenticated client used by the careers/recruitment integration.
 *
 * Coverage before this file: API 1 uncovered function / 6 uncovered branch arms,
 *   APICALL 2 uncovered functions / 5 uncovered branch arms.
 *
 * Rules asserted here (both arms of every conditional):
 *   - A call with no config or no URL never reaches the network and answers a 400 envelope.
 *   - The bearer token and API key are attached, and caller headers override the defaults.
 *   - The same request fired twice while the first is still in flight is rejected as a
 *     duplicate (status 499) and is accepted again once the first one settles.
 *   - An invalid-token error code drops the stored access token; any other error does not.
 *   - format() fills in defaults for a missing status, statusText, body or headers.
 *
 * FINDING API-NETERR-1 is characterized at the bottom.
 */

jest.mock('axios', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mock('react-promise-tracker', () => ({
    trackPromise: (promise) => promise,
}));

jest.mock('../../../services/HandleHistory', () => ({
    history: { push: jest.fn() },
}));

import axios from 'axios';
import API from '../../../services/API';
import APICALL from '../../../services/APICALL';
import { history } from '../../../services/HandleHistory';

// Mirrors src/config/GlobalVariables.js — the codes that mean "this token is no longer usable".
global.invalid_token_response = ['token_expired', 'token_invalid', 'token_absent'];
global.links = new Proxy({}, { get: (target, name) => '/x/' + String(name) });

let realLocation;

beforeAll(() => {
    // jsdom 11 refuses real navigation; APICALL reloads the page on an invalid token.
    realLocation = window.location;
    try {
        delete window.location;
        window.location = { href: '', reload: jest.fn(), assign: jest.fn() };
    } catch (e) {
        /* older jsdom keeps location non-configurable; the assertions below still hold */
    }
});

afterAll(() => {
    try {
        window.location = realLocation;
    } catch (e) {
        /* nothing to restore */
    }
});

const deferred = () => {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
};

beforeEach(() => {
    jest.clearAllMocks();
    axios.mockReset();
    localStorage.clear();
    API.requests.length = 0;
});

describe('API.call — guard rails', () => {
    test('a call with no config at all answers a 400 envelope without touching the network', async () => {
        const result = await API.call();

        expect(axios).not.toHaveBeenCalled();
        expect(result).toEqual({ status: 400, statusText: 'Bad Request', data: {}, headers: {} });
    });

    test('a call with a config but no URL answers the same 400 envelope', async () => {
        const result = await API.call({ method: 'get' });

        expect(axios).not.toHaveBeenCalled();
        expect(result.status).toBe(400);
    });

    test('a call attaches the bearer token, the API key and the caller headers', async () => {
        localStorage.setItem('access_token', 'tok-123');
        axios.mockResolvedValueOnce({ status: 200, statusText: 'OK', data: { content: [] }, headers: {} });

        await API.call({
            url: '/user/7/profile',
            headers: { 'Content-Type': 'multipart/form-data' },
            params: { page: 2 },
        });

        const sent = axios.mock.calls[0][0];
        expect(sent.method).toBe('get');
        expect(sent.headers.Authorization).toBe('Bearer tok-123');
        expect(sent.headers['Content-Type']).toBe('multipart/form-data');
        expect(sent.params).toEqual({ page: 2 });
        expect(sent.data).toEqual({});
    });

    test('a call with an explicit method and body sends them as given', async () => {
        axios.mockResolvedValueOnce({ status: 200, statusText: 'OK', data: {}, headers: {} });

        await API.call({ url: '/request/coe', method: 'post', data: { purpose: 'Visa' } });

        const sent = axios.mock.calls[0][0];
        expect(sent.method).toBe('post');
        expect(sent.data).toEqual({ purpose: 'Visa' });
    });

    test('a successful call is normalised into status, statusText, data and headers', async () => {
        axios.mockResolvedValueOnce({
            status: 201,
            statusText: 'Created',
            data: { content: { id: 5 } },
            headers: { 'content-disposition': 'attachment' },
        });

        const result = await API.call({ url: '/request/overtime', method: 'post' });

        expect(result).toEqual({
            status: 201,
            statusText: 'Created',
            data: { content: { id: 5 } },
            headers: { 'content-disposition': 'attachment' },
        });
    });

    test('a response missing every field is filled in with the 400 defaults', async () => {
        axios.mockResolvedValueOnce({});

        const result = await API.call({ url: '/report/empty' });

        expect(result).toEqual({ status: 400, statusText: 'Bad Request', data: {}, headers: {} });
    });
});

describe('API.call — duplicate request interception', () => {
    test('the same request fired twice while in flight is rejected as a duplicate', async () => {
        const first = deferred();
        axios.mockReturnValueOnce(first.promise);

        const inFlight = API.call({ url: '/report/dtr_summary', method: 'get' });
        const duplicate = API.call({ url: '/report/dtr_summary', method: 'get' });

        await expect(duplicate).rejects.toEqual({
            status: 499,
            statusText: 'DUPLICATE_REQUEST_INTERCEPTED',
            data: {},
        });
        expect(axios).toHaveBeenCalledTimes(1);

        first.resolve({ status: 200, statusText: 'OK', data: {}, headers: {} });
        await inFlight;
    });

    test('a request with different parameters is not treated as a duplicate', async () => {
        const first = deferred();
        axios.mockReturnValueOnce(first.promise);
        axios.mockResolvedValueOnce({ status: 200, statusText: 'OK', data: {}, headers: {} });

        const inFlight = API.call({ url: '/report/dtr_summary', params: { page: 1 } });
        await API.call({ url: '/report/dtr_summary', params: { page: 2 } });

        expect(axios).toHaveBeenCalledTimes(2);
        first.resolve({ status: 200, statusText: 'OK', data: {}, headers: {} });
        await inFlight;
    });

    test('the same request is accepted again once the first one has settled', async () => {
        axios.mockResolvedValueOnce({ status: 200, statusText: 'OK', data: {}, headers: {} });
        await API.call({ url: '/report/dtr_summary' });
        expect(API.requests).toEqual([]);

        axios.mockResolvedValueOnce({ status: 200, statusText: 'OK', data: {}, headers: {} });
        await API.call({ url: '/report/dtr_summary' });

        expect(axios).toHaveBeenCalledTimes(2);
    });

    test('a failed request is also cleared from the in-flight list', async () => {
        axios.mockRejectedValueOnce({ response: { status: 500, statusText: 'Server Error', data: {} } });

        await expect(API.call({ url: '/report/dtr_summary' })).rejects.toEqual(
            expect.objectContaining({ status: 500 }),
        );
        expect(API.requests).toEqual([]);
    });

    test('requestComplete leaves the list alone when the request is not in it', () => {
        API.requests.push('["/a","get",{},{}]');

        API.requestComplete('not-tracked');

        expect(API.requests).toHaveLength(1);
    });
});

describe('API — error handling', () => {
    test('an expired-token error drops the stored access token and returns the response', async () => {
        localStorage.setItem('access_token', 'tok-123');
        axios.mockRejectedValueOnce({
            response: {
                status: 401,
                statusText: 'Unauthorized',
                data: { error: { content: { code: 'token_expired' } } },
                headers: {},
            },
        });

        await expect(API.call({ url: '/auth/payload', method: 'post' })).rejects.toEqual({
            status: 401,
            statusText: 'Unauthorized',
            data: { error: { content: { code: 'token_expired' } } },
            headers: {},
        });
        expect(localStorage.getItem('access_token')).toBeNull();
    });

    test('an ordinary error keeps the stored access token', async () => {
        localStorage.setItem('access_token', 'tok-123');
        axios.mockRejectedValueOnce({
            response: {
                status: 422,
                statusText: 'Unprocessable',
                data: { error: { content: { code: 'validation_failed' } } },
                headers: {},
            },
        });

        await expect(API.call({ url: '/request/overtime', method: 'post' })).rejects.toEqual(
            expect.objectContaining({ status: 422 }),
        );
        expect(localStorage.getItem('access_token')).toBe('tok-123');
    });

    test('an error with no error body at all is returned as it stands', async () => {
        localStorage.setItem('access_token', 'tok-123');
        axios.mockRejectedValueOnce({
            response: { status: 500, statusText: 'Server Error', data: {}, headers: {} },
        });

        await expect(API.call({ url: '/report/x' })).rejects.toEqual(
            expect.objectContaining({ status: 500, statusText: 'Server Error' }),
        );
        expect(localStorage.getItem('access_token')).toBe('tok-123');
    });
});

describe('API.export — binary downloads', () => {
    test('an export asks for an arraybuffer and declares the blob content type', async () => {
        localStorage.setItem('access_token', 'tok-123');
        axios.mockResolvedValueOnce({ status: 200, statusText: 'OK', data: 'bytes', headers: {} });

        const result = await API.export({ url: '/report/dtr_summary/export', params: { page: 1 } });

        const sent = axios.mock.calls[0][0];
        expect(sent.responseType).toBe('arraybuffer');
        expect(sent.headers['Content-Type']).toBe('blob');
        expect(sent.headers.Authorization).toBe('Bearer tok-123');
        expect(result.data).toBe('bytes');
    });

    test('an export with no URL answers the 400 envelope without touching the network', async () => {
        const result = await API.export({});

        expect(axios).not.toHaveBeenCalled();
        expect(result.status).toBe(400);
    });

    test('an export is never deduplicated — the same export twice reaches the network twice', async () => {
        const first = deferred();
        axios.mockReturnValueOnce(first.promise);
        axios.mockResolvedValueOnce({ status: 200, statusText: 'OK', data: 'bytes', headers: {} });

        const inFlight = API.export({ url: '/report/dtr_summary/export' });
        await API.export({ url: '/report/dtr_summary/export' });

        expect(axios).toHaveBeenCalledTimes(2);
        first.resolve({ status: 200, statusText: 'OK', data: 'bytes', headers: {} });
        await inFlight;
    });

    test('a failed export surfaces the formatted error response', async () => {
        axios.mockRejectedValueOnce({
            response: { status: 404, statusText: 'Not Found', data: {}, headers: {} },
        });

        await expect(API.export({ url: '/report/missing' })).rejects.toEqual(
            expect.objectContaining({ status: 404 }),
        );
    });
});

describe('APICALL — the recruitment client', () => {
    test('a call with no URL answers a 400 envelope without touching the network', async () => {
        const result = await APICALL.call();

        expect(axios).not.toHaveBeenCalled();
        expect(result).toEqual({ status: 400, statusText: 'Bad Request', data: {} });
    });

    test('a call defaults to GET and prefixes the recruitment host', async () => {
        axios.mockResolvedValueOnce({ status: 200, statusText: 'OK', data: { jobs: [] } });

        const result = await APICALL.call({ url: '/jobs' });

        const sent = axios.mock.calls[0][0];
        expect(sent.method).toBe('get');
        expect(sent.url).toBe('https://14.194.61.203/rctcareer/api/jobs');
        expect(sent.data).toEqual({});
        expect(result.data).toEqual({ jobs: [] });
    });

    test('a call with a method and body sends both', async () => {
        axios.mockResolvedValueOnce({ status: 201, statusText: 'Created', data: {} });

        await APICALL.call({ url: '/apply', method: 'post', data: { name: 'Ana' } });

        const sent = axios.mock.calls[0][0];
        expect(sent.method).toBe('post');
        expect(sent.data).toEqual({ name: 'Ana' });
    });

    test('an export with no URL answers the 400 envelope, and with a URL it reaches the host', async () => {
        expect((await APICALL.export({})).status).toBe(400);

        axios.mockResolvedValueOnce({ status: 200, statusText: 'OK', data: 'bytes' });
        await APICALL.export({ url: '/jobs/export', method: 'post', data: { id: 1 } });

        const sent = axios.mock.calls[0][0];
        expect(sent.url).toBe('https://14.194.61.203/rctcareer/api/jobs/export');
        expect(sent.method).toBe('post');
    });

    test('an invalid-token answer sends the visitor back to the login screen', async () => {
        axios.mockRejectedValueOnce({
            response: {
                status: 401,
                statusText: 'Unauthorized',
                data: { error: { content: { code: 'token_invalid' } } },
            },
        });

        await expect(APICALL.call({ url: '/jobs' })).rejects.toEqual(
            expect.objectContaining({ status: 401 }),
        );
        expect(history.push).toHaveBeenCalledWith('/x/login');
    });

    test('any other failure is returned formatted, with no redirect', async () => {
        axios.mockRejectedValueOnce({
            response: { status: 500, statusText: 'Server Error', data: {} },
        });

        await expect(APICALL.export({ url: '/jobs' })).rejects.toEqual(
            expect.objectContaining({ status: 500 }),
        );
        expect(history.push).not.toHaveBeenCalled();
    });
});

/**
 * FINDING API-NETERR-1 — a network failure (no HTTP response at all) escapes as a TypeError
 * instead of a formatted error envelope.
 *
 * src/services/API.js check_error (line 144) reads `e.response.data.error` with no guard. When
 * axios rejects without a response — server unreachable, DNS failure, request cancelled, CORS
 * rejection — `e.response` is undefined and the property read throws. The TypeError replaces
 * the intended `{status: 400, statusText: "Bad Request"}` envelope and is what every calling
 * thunk hands to Formatter.alert_error, which then renders a banner with an undefined body.
 * src/services/APICALL.js line 118 has the identical shape.
 *
 * This is plain property access on undefined, not a jsdom artefact: it behaves the same in
 * Chrome. When check_error is guarded, this test fails — that is the signal to assert the
 * 400 envelope instead.
 */
test('_FINDING_API_NETERR_1 a call that fails with no HTTP response rejects with a TypeError', async () => {
    axios.mockRejectedValueOnce({ message: 'Network Error' });

    await expect(API.call({ url: '/report/dtr_summary' })).rejects.toBeInstanceOf(TypeError);
    expect(API.requests).toEqual([]);
});
