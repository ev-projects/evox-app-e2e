// evoxtest_IntegrationsApiThunks.test.js
//
// SOURCE FILES UNDER TEST
//   src/components/PoliciesDocument/PoliciesDocumentApi.js   (10 uncovered fns / 1 branch)
//   src/components/PayrollDispute/Disouteapi.js              ( 8 uncovered fns / 0 branch)
//   src/components/DateReport/PayrollReportApi.js            ( 6 uncovered fns / 0 branch)
//
// MENU PATHS
//   Policies    : Company -> Policies (download / viewer / upload screens)
//   Dispute     : Payroll -> Payroll Dispute
//   PayrollRpt  : Reports -> Payroll Report (PH) / Payroll Report (Morocco)
//
// WHY THESE WERE UNCOVERED
//   Every existing suite for these screens mocks the whole api module out
//   (jest.mock('.../PoliciesDocumentApi')), so the action creators are called but the
//   thunk bodies they RETURN are never dispatched. Nothing exercised the inner
//   `async (dispatch, getState)` closures, the URL each one builds, the action type it
//   dispatches, or the .catch arm. These tests dispatch the thunk directly against a
//   mocked API boundary, which is the only place those closures can run.
//
// ADD-ONLY: does not touch PoliciesDocumentLifecycle / PayrollDisputeLifecycle /
// ReportsParameterLifecycle — those cover the components, this covers the api modules.
//
// FINDINGS: none. (Both spellings `fecthUserContry` and `Disouteapi` are typos carried by
// the app itself; they are correct as written here and must not be "fixed" in the tests.)

jest.mock('../../services/API', () => ({ call: jest.fn() }));
jest.mock('../../services/Formatter', () => ({
  alert_error: jest.fn((e) => ({ type: 'SHOW_ALERT_ERROR', error: e })),
}));

import API from '../../services/API';
import Formatter from '../../services/Formatter';

import {
  fecthUserContry as fetchPolicyUserCountry,
  fecthUserDepartment,
  fetchPolicyDocument,
} from '../../components/PoliciesDocument/PoliciesDocumentApi';

import {
  fecthdepartment,
  fecthdispute,
} from '../../components/PayrollDispute/Disouteapi';

import {
  fecthUserContry as fetchReportUserCountry,
  fecthMoroccoPayrollParams,
} from '../../components/DateReport/PayrollReportApi';

// Every thunk in these three modules has the same shape:
//   API.call({...}).then(dispatch(action)).catch(dispatch(alert_error(e)))
// so one harness drives both arms of all seven.
let dispatch;
const getState = () => ({});

const resolveWith = (data) => API.call.mockImplementation(() => Promise.resolve({ data }));
const rejectWith = (error) => API.call.mockImplementation(() => Promise.reject(error));

const requestConfig = () => API.call.mock.calls[0][0];

beforeEach(() => {
  jest.clearAllMocks();
  dispatch = jest.fn();
});

describe('PoliciesDocumentApi.fecthUserContry — country endpoint depends on the id argument', () => {
  test('id 0 (own country) requests /user/getusercountry and dispatches FETCH_MY_COUNTRY with the payload', async () => {
    resolveWith([{ id: 1, name: 'Philippines' }]);
    await fetchPolicyUserCountry(0)(dispatch, getState);

    expect(requestConfig()).toEqual({ method: 'get', url: '/user/getusercountry' });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'FETCH_MY_COUNTRY',
      data: [{ id: 1, name: 'Philippines' }],
    });
    expect(Formatter.alert_error).not.toHaveBeenCalled();
  });

  test('any non-zero id (all countries) requests /user/getcountry instead', async () => {
    resolveWith([{ id: 1 }, { id: 2 }]);
    await fetchPolicyUserCountry(1)(dispatch, getState);

    expect(requestConfig().url).toBe('/user/getcountry');
    expect(dispatch).toHaveBeenCalledWith({ type: 'FETCH_MY_COUNTRY', data: [{ id: 1 }, { id: 2 }] });
  });

  test('the id check is strict — the string "0" takes the all-countries arm, not the own-country arm', async () => {
    resolveWith([]);
    await fetchPolicyUserCountry('0')(dispatch, getState);

    expect(requestConfig().url).toBe('/user/getcountry');
  });

  test('a failed country call dispatches alert_error carrying the rejection and never dispatches FETCH_MY_COUNTRY', async () => {
    const failure = new Error('HTTP 500');
    rejectWith(failure);
    await fetchPolicyUserCountry(0)(dispatch, getState);

    expect(Formatter.alert_error).toHaveBeenCalledWith(failure);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SHOW_ALERT_ERROR', error: failure });
    expect(dispatch.mock.calls.some((c) => c[0].type === 'FETCH_MY_COUNTRY')).toBe(false);
  });
});

describe('PoliciesDocumentApi.fecthUserDepartment — department list is scoped by type, country and user', () => {
  test('all three arguments are interpolated into the query string in order', async () => {
    resolveWith([{ id: 7, name: 'Engineering' }]);
    await fecthUserDepartment('GLOBAL', 3, 42)(dispatch, getState);

    expect(requestConfig().url).toBe('/get_user_departments?GlobalType=GLOBAL&CountryId=3&UserId=42');
    expect(dispatch).toHaveBeenCalledWith({
      type: 'FETCH_MY_DEPT',
      data: [{ id: 7, name: 'Engineering' }],
    });
  });

  test('undefined arguments are still interpolated verbatim rather than dropped', async () => {
    resolveWith([]);
    await fecthUserDepartment(undefined, undefined, undefined)(dispatch, getState);

    expect(requestConfig().url).toBe(
      '/get_user_departments?GlobalType=undefined&CountryId=undefined&UserId=undefined'
    );
  });

  test('a failed department call dispatches alert_error and no FETCH_MY_DEPT', async () => {
    const failure = { status: 403 };
    rejectWith(failure);
    await fecthUserDepartment('LOCAL', 1, 1)(dispatch, getState);

    expect(dispatch).toHaveBeenCalledWith({ type: 'SHOW_ALERT_ERROR', error: failure });
    expect(dispatch.mock.calls.some((c) => c[0].type === 'FETCH_MY_DEPT')).toBe(false);
  });
});

describe('PoliciesDocumentApi.fetchPolicyDocument — download unwraps the first row', () => {
  test('the document id becomes the /download_policy path segment and only row 0 is dispatched', async () => {
    resolveWith([{ id: 11, file: 'handbook.pdf' }, { id: 12, file: 'ignored.pdf' }]);
    await fetchPolicyDocument(11)(dispatch, getState);

    expect(requestConfig()).toEqual({ method: 'get', url: '/download_policy/11' });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'FETCH_MY_POLICY_DOC',
      data: { id: 11, file: 'handbook.pdf' },
    });
  });

  test('an empty result set dispatches undefined rather than failing — the [0] read is unguarded', async () => {
    resolveWith([]);
    await fetchPolicyDocument(99)(dispatch, getState);

    expect(dispatch).toHaveBeenCalledWith({ type: 'FETCH_MY_POLICY_DOC', data: undefined });
    expect(Formatter.alert_error).not.toHaveBeenCalled();
  });

  test('a failed download dispatches alert_error and no FETCH_MY_POLICY_DOC', async () => {
    const failure = new Error('HTTP 404');
    rejectWith(failure);
    await fetchPolicyDocument(11)(dispatch, getState);

    expect(dispatch).toHaveBeenCalledWith({ type: 'SHOW_ALERT_ERROR', error: failure });
    expect(dispatch.mock.calls.some((c) => c[0].type === 'FETCH_MY_POLICY_DOC')).toBe(false);
  });
});

describe('Disouteapi.fecthdepartment — payroll dispute department dropdown', () => {
  test('reads /department/get_department_all and dispatches the response CONTENT, not the envelope', async () => {
    resolveWith({ content: [{ id: 2, name: 'Payroll' }], message: 'ok' });
    await fecthdepartment()(dispatch, getState);

    expect(requestConfig()).toEqual({ method: 'get', url: '/department/get_department_all' });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'FETCH_MY_DEPT',
      data: [{ id: 2, name: 'Payroll' }],
    });
  });

  test('a failed department call dispatches alert_error and no FETCH_MY_DEPT', async () => {
    const failure = new Error('HTTP 500');
    rejectWith(failure);
    await fecthdepartment()(dispatch, getState);

    expect(dispatch).toHaveBeenCalledWith({ type: 'SHOW_ALERT_ERROR', error: failure });
    expect(dispatch.mock.calls.some((c) => c[0].type === 'FETCH_MY_DEPT')).toBe(false);
  });
});

describe('Disouteapi.fecthdispute — dispute list is filtered by the params object', () => {
  test('the caller params travel as query params and the content array becomes FETCH_DISPUTE_LIST', async () => {
    resolveWith({ content: [{ id: 5, status: 'Pending' }] });
    const params = { date_from: '2026-01-01', date_to: '2026-01-31', department_id: 2 };
    await fecthdispute(params)(dispatch, getState);

    expect(requestConfig()).toEqual({ method: 'get', url: '/getdispute', params });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'FETCH_DISPUTE_LIST',
      data: [{ id: 5, status: 'Pending' }],
    });
  });

  test('an empty dispute list still dispatches FETCH_DISPUTE_LIST with the empty array', async () => {
    resolveWith({ content: [] });
    await fecthdispute({})(dispatch, getState);

    expect(dispatch).toHaveBeenCalledWith({ type: 'FETCH_DISPUTE_LIST', data: [] });
  });

  test('a failed dispute call dispatches alert_error and no FETCH_DISPUTE_LIST', async () => {
    const failure = new Error('HTTP 422');
    rejectWith(failure);
    await fecthdispute({ department_id: 2 })(dispatch, getState);

    expect(dispatch).toHaveBeenCalledWith({ type: 'SHOW_ALERT_ERROR', error: failure });
    expect(dispatch.mock.calls.some((c) => c[0].type === 'FETCH_DISPUTE_LIST')).toBe(false);
  });
});

describe('PayrollReportApi — report parameter loaders', () => {
  test('fecthUserContry reads /user/getusercountry and dispatches FETCH_MY_COUNTRY', async () => {
    resolveWith([{ id: 1, name: 'Philippines' }]);
    await fetchReportUserCountry(jest.fn())(dispatch, getState);

    expect(requestConfig()).toEqual({ method: 'get', url: '/user/getusercountry' });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'FETCH_MY_COUNTRY',
      data: [{ id: 1, name: 'Philippines' }],
    });
  });

  test('fecthUserContry ignores the setCountry argument entirely — it never calls it', async () => {
    const setCountry = jest.fn();
    resolveWith([{ id: 1 }]);
    await fetchReportUserCountry(setCountry)(dispatch, getState);

    expect(setCountry).not.toHaveBeenCalled();
  });

  test('a failed country call dispatches alert_error and no FETCH_MY_COUNTRY', async () => {
    const failure = new Error('HTTP 503');
    rejectWith(failure);
    await fetchReportUserCountry(jest.fn())(dispatch, getState);

    expect(dispatch).toHaveBeenCalledWith({ type: 'SHOW_ALERT_ERROR', error: failure });
    expect(dispatch.mock.calls.some((c) => c[0].type === 'FETCH_MY_COUNTRY')).toBe(false);
  });

  test('fecthMoroccoPayrollParams reads /report/get_morocco_payroll_params and dispatches FETCH_MOROCCO_PAYROLL_PARAMS', async () => {
    resolveWith([{ id: 4, cutoff: '2026-01' }]);
    await fecthMoroccoPayrollParams()(dispatch, getState);

    expect(requestConfig()).toEqual({ method: 'get', url: '/report/get_morocco_payroll_params' });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'FETCH_MOROCCO_PAYROLL_PARAMS',
      data: [{ id: 4, cutoff: '2026-01' }],
    });
  });

  test('a failed Morocco params call dispatches alert_error and no FETCH_MOROCCO_PAYROLL_PARAMS', async () => {
    const failure = new Error('HTTP 500');
    rejectWith(failure);
    await fecthMoroccoPayrollParams()(dispatch, getState);

    expect(dispatch).toHaveBeenCalledWith({ type: 'SHOW_ALERT_ERROR', error: failure });
    expect(dispatch.mock.calls.some((c) => c[0].type === 'FETCH_MOROCCO_PAYROLL_PARAMS')).toBe(false);
  });
});
