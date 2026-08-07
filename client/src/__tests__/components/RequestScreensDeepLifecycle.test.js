/**
 * RequestScreensDeepLifecycle.test.js
 *
 * SOURCE FILES UNDER TEST
 *   src/container/Request/Overtime/Overtime.js
 *   src/container/Request/RestDayWork/RestDayWork.js
 *   src/container/Request/ChangeSchedule/ChangeSchedule.js
 *
 * MENU PATH
 *   Request -> Overtime          (config/RouteList.js, global.links.overtime + ":id?")
 *   Request -> Rest Day Work     (config/RouteList.js, global.links.rest_day_work + ":id?")
 *   Request -> Change Schedule   (config/RouteList.js, global.links.change_schedule + ":id?")
 *   All three are live ProtectedRoutes. That makes the SCREENS reachable; it does not by itself
 *   make every branch inside them reachable, so each test below stands on its own reachability
 *   argument (which state a route, a UI action or a server response can actually produce).
 *
 * HOW THE SUBMIT TESTS DRIVE THE SCREEN
 *   Submit tests call `ref.current.onSubmitHandler(values)` directly with hand-built values. That
 *   is the container's own entry point, but it BYPASSES Formik, so the Yup validationSchema of each
 *   screen (e.g. ChangeSchedule.js break_time max rule) is NOT exercised here. Read every submit
 *   assertion as a statement about the handler, not about what Formik would have let through.
 *
 * COVERAGE (statements, these three files only)
 *   Measured before this suite existed: Overtime 67.86% | RestDayWork 78.05% | ChangeSchedule
 *   84.55%. The "after" figures previously claimed here were not re-measured after tests were
 *   removed in the reachability pass below, so they are deliberately not quoted. Run
 *   `--coverage --collectCoverageFrom` over the three container files for a current number.
 *   Known permanently-uncovered branches: the `errors.<note> && touched.<note>` arms
 *   (Overtime 277/294/303, RestDayWork 324/341, ChangeSchedule 440/457) — neither employee_note nor
 *   approver_note carries a .required() rule in any of the three Yup schemas, so errors for them
 *   can never be produced.
 *
 * NOT TESTED, ON PURPOSE (unreachable)
 *   Overtime.setAction()      — calls this.setState() but the class has no state and nothing in the
 *                               tree (RequestButtons included) ever calls it.
 *   Overtime.NoScheduleInfo() — the only call site is commented out in render().
 *   CS-TRIG-1 (null first/last name on a change-schedule request) is a DATABASE-level trigger
 *   failure; it cannot be observed from the client and is deliberately out of scope here.
 *
 * DELIBERATELY NOT CHARACTERISED — verified against the backend, cannot occur. Do not re-add
 * tests for these; they were removed once already because they encode bugs that do not exist.
 *   request-validity Result "0"  — the live SP EV_SP_Validate_Request_Payroll_Period
 *       (knowledge/database-sp-all.sql:10798) only ever SELECTs 1 or 2. Result 0 exists solely in
 *       EV_SP_Validate_Request_Payroll_Period_Test, which no controller calls. So the
 *       "DTR generation is running" alert arm (Overtime.js:78-81, RestDayWork.js:83-86) is dead.
 *   Result "1" with a date OUTSIDE the returned window — the same SP sets StartDate/EndDate from a
 *       row matched by `IP_Date between PayrollStartDate and PayrollEndDate`, and returns 1 only
 *       when that row was found. Result 1 therefore IMPLIES the date is inside the window, so the
 *       "blank confirm() + untagged request" fall-through can never be reached.
 *   checkRequestValidity() returning null — success_response (api_response_helper.php:14) always
 *       emits HTTP 200 with a `content` key, and requestValidityChecker
 *       (RequestController.php:597) always fills it with the SP row. axios resolves only on 2xx,
 *       so neither the `status !== 200` guard nor the missing-content guard can fire on the resolve
 *       path; a failure becomes a rejection, which IS covered ("a rejected call dispatches...").
 *   ChangeSchedule time_diff = NaN — needs the logged-in user's own record to lack
 *       user_offset_seconds. UserProfileResource.php:65 sets it unconditionally and
 *       userReducers LOGIN_SUCCESS / FETCH_USER_SUCCESS spread that payload verbatim, so
 *       this.props.user.user_offset_seconds is always a number.
 */

/* ------------------------------------------------------------------ mocks */

jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  return {
    ...actual,
    // identity connect, but keep hold of the two map functions so the redux wiring
    // contract of each container can be asserted directly.
    connect: (mapStateToProps, mapDispatchToProps) => (Component) => {
      Component.__mapStateToProps = mapStateToProps;
      Component.__mapDispatchToProps = mapDispatchToProps;
      return Component;
    },
  };
});

jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
  InputDate: (p) => (
    <input
      data-testid={'date-' + p.name}
      name={p.name}
      type="date"
      readOnly={!!p.readOnly}
      data-readonly={String(!!p.readOnly)}
    />
  ),
  InputTime: (p) => (
    <input
      data-testid={'time-' + p.name}
      name={p.name}
      type="time"
      data-kind={p.type === undefined ? '' : String(p.type)}
      data-contrast={p.contrast_too === undefined ? '' : String(p.contrast_too)}
      data-offset={p.offset_data === undefined || p.offset_data === null ? '' : String(p.offset_data)}
      data-disabled={String(!!p.isDisabled)}
    />
  ),
  InputDateTime: (p) => <input data-testid={'datetime-' + p.name} name={p.name} type="datetime-local" />,
}));

jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);

jest.mock('../../components/GridComponent/AdminLte.js', () => ({
  ContainerHeader: ({ children }) => <div>{children}</div>,
  Content: ({ children, title, subtitle }) => (
    <div>
      <h1>{title}</h1>
      {subtitle}
      {children}
    </div>
  ),
  ContainerWrapper: ({ children }) => <div>{children}</div>,
  ContainerBody: ({ children }) => <div>{children}</div>,
  Row: ({ children }) => <div>{children}</div>,
  Col: ({ children }) => <div>{children}</div>,
}));

// RequestButtons receives {...this}; surfacing `method` + instance status lets the render gate
// (store / update / approval) be asserted as a rule rather than a snapshot.
jest.mock('../../components/RequestComponent/RequestButtons/RequestButtons', () => (context) => (
  <div
    data-testid="request-buttons"
    data-method={String(context.method)}
    data-status={String((context.props && context.props.instance && context.props.instance.status) || '')}
  />
));

jest.mock('../../components/RequestComponent/RequestButtons/RequestSubtitle', () => (p) => (
  <div data-testid="request-subtitle" data-method={String(p.method)}>
    {(p.user && p.user.full_name) || ''}
  </div>
));

jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading" />);

// ScheduleDetails is a heavy real-DatePicker tree. SchedulePolicy is rendered unconditionally by
// ChangeSchedule, so it doubles as a probe that dumps the Formik initialValues the container built.
jest.mock('../../components/Schedule/ScheduleDetails.js', () => {
  const R = require('react');
  const formik = require('formik');
  const ValuesProbe = () => {
    const { values } = formik.useFormikContext();
    return R.createElement(
      'span',
      { 'data-testid': 'formik-values' },
      JSON.stringify({
        name: values.name,
        bind_id: values.bind_id,
        bind_to: values.bind_to,
        source_type: values.source_type,
        schedule_type: values.schedule_type,
        method: values.method,
        work_days: values.work_days,
        sorted_week_days: values.sorted_week_days,
        schedule_policies: values.schedule_policies,
        cst_len: (values.cst_schedule_details || []).length,
        pov_len: (values.pov_schedule_details || []).length,
        cst_first: (values.cst_schedule_details || [])[0]
          ? {
              start: new Date(values.cst_schedule_details[0].start_time).getHours(),
              end: new Date(values.cst_schedule_details[0].end_time).getHours(),
            }
          : null,
        pov_first: (values.pov_schedule_details || [])[0]
          ? { start: new Date(values.pov_schedule_details[0].start_time).getHours() }
          : null,
      })
    );
  };
  return {
    Scheduledetails: () => R.createElement('div'),
    ScheduledetailsWithTimezone: (p) =>
      R.createElement('div', {
        'data-testid': 'sched-day',
        'data-day': String(p.day),
        'data-index': String(p.index),
        'data-approval': String(p.on_approval),
        'data-contrast': String(p.open_contrast),
        'data-pov': String(p.pov_timezone_info),
        'data-offset': String(p.offset_data),
      }),
    onSelectTimeHandlerStd: () => {},
    onSelectTimeHandlerFlexi: () => {},
    SchedulePolicy: ValuesProbe,
    WorkDays: () => R.createElement('div'),
    StandardSchedDetailsForm: () => R.createElement('div'),
    FlexibleSchedDetailsForm: () => R.createElement('div'),
    ScheduleHolidayPolicy: () => R.createElement('div'),
  };
});

jest.mock('../../services/API', () => ({ call: jest.fn() }));

// Action creators return plain identifiable objects so mapDispatchToProps can be asserted by value.
jest.mock('../../store/actions/requests/overtimeActions', () => ({
  fetchOvertime: (id) => ({ type: 'OT_FETCH', id }),
  addOvertime: (d) => ({ type: 'OT_ADD', d }),
  updateOvertime: (id, d) => ({ type: 'OT_UPDATE', id, d }),
  updateOvertimeStatus: (id, d, s, u, f, t) => ({ type: 'OT_STATUS', id, s, u, f, t }),
  resetOvertimeInstance: () => ({ type: 'OT_RESET' }),
  clearOvertimeInstance: () => ({ type: 'OT_CLEAR' }),
}));
jest.mock('../../store/actions/requests/restDayWorkActions', () => ({
  fetchRestDayWork: (id) => ({ type: 'RDW_FETCH', id }),
  addRestDayWork: (d) => ({ type: 'RDW_ADD', d }),
  updateRestDayWork: (id, d) => ({ type: 'RDW_UPDATE', id, d }),
  updateRestDayWorkStatus: (id, d, s, u, f, t) => ({ type: 'RDW_STATUS', id, s, u, f, t }),
  resetRestDayWorkInstance: () => ({ type: 'RDW_RESET' }),
  clearRestDayWorkInstance: () => ({ type: 'RDW_CLEAR' }),
}));
jest.mock('../../store/actions/requests/changeScheduleActions', () => ({
  fetchChangeSchedule: (id) => ({ type: 'CS_FETCH', id }),
  addChangeSchedule: (d) => ({ type: 'CS_ADD', d }),
  updateChangeSchedule: (id, d) => ({ type: 'CS_UPDATE', id, d }),
  updateChangeScheduleStatus: (id, d, s, u, f, t) => ({ type: 'CS_STATUS', id, s, u, f, t }),
  resetChangeScheduleInstance: () => ({ type: 'CS_RESET' }),
  clearChangeScheduleInstance: () => ({ type: 'CS_CLEAR' }),
}));
jest.mock('../../store/actions/redirectActions', () => ({
  setRedirect: (link) => ({ type: 'SET_REDIRECT', link }),
}));

/* ---------------------------------------------------------------- imports */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import API from '../../services/API';

const Overtime = require('../../container/Request/Overtime/Overtime').default;
const RestDayWork = require('../../container/Request/RestDayWork/RestDayWork').default;
const ChangeSchedule = require('../../container/Request/ChangeSchedule/ChangeSchedule').default;

global.links = new Proxy({}, { get: () => '/x/' });

/* ---------------------------------------------------------------- helpers */

const CUTOFF = { current_payroll_cutoff: { start_date: '2026-03-01', end_date: '2026-03-31' } };
const USER = { id: 1, full_name: 'Employee One', pov_timezone: 'Asia/Manila', user_offset_seconds: 0 };

const D = (s) => new Date(s); // no trailing Z -> local (TZ pinned to Asia/Manila)

const validity = (content) => ({ status: 200, data: { content } });
const IN_PERIOD = { Result: '1', StartDate: '2026-03-01', EndDate: '2026-03-31' };
const DISPUTE = { Result: '2', StartDate: '2026-03-01', EndDate: '2026-03-31' };
// There is deliberately no Result '0' fixture — the live SP never returns it. See the file header.

let confirmSpy;
let alertSpy;
let logSpy;

beforeEach(() => {
  jest.clearAllMocks();
  confirmSpy = jest.fn(() => true);
  alertSpy = jest.fn();
  window.confirm = confirmSpy;
  window.alert = alertSpy;
  // componentDidUpdate/onSubmitHandler console.log noise: silence + reset per test so no
  // accumulator leaks between tests.
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  localStorage.setItem('session_id', 'sess-abc');
});

afterEach(() => {
  logSpy.mockRestore();
});

function mount(Component, props) {
  const ref = React.createRef();
  const utils = render(
    <MemoryRouter>
      <Component ref={ref} {...props} />
    </MemoryRouter>
  );
  return { ref, ...utils };
}

function remount(utils, Component, props, ref) {
  utils.rerender(
    <MemoryRouter>
      <Component ref={ref} {...props} />
    </MemoryRouter>
  );
}

const fdToObject = (fd) => {
  const out = {};
  for (const [k, v] of fd.entries()) out[k] = v;
  return out;
};

/* ================================================================ OVERTIME */

const otProps = (over = {}) => ({
  fetchOvertime: jest.fn(),
  addOvertime: jest.fn(),
  updateOvertime: jest.fn(),
  updateOvertimeStatus: jest.fn(),
  resetOvertimeInstance: jest.fn(),
  clearOvertimeInstance: jest.fn(),
  setRedirect: jest.fn(),
  dispatch: jest.fn(),
  user: USER,
  instance: {},
  isInstanceLoaded: false,
  constant: {},
  settings: CUTOFF,
  params: {},
  match: { params: {} },
  history: { push: jest.fn() },
  location: { search: '' },
  ...over,
});

const otValues = (over = {}) => ({
  action: null,
  method: 'store',
  isManager: undefined,
  id: null,
  date: D('2026-03-10T00:00:00'),
  user_id: '1',
  amount: D('2026-03-10T01:30:00'),
  type: 'pre_overtime',
  employee_note: 'need to finish the release',
  approver_note: null,
  ...over,
});

describe('Request -> Overtime :: render gates', () => {
  test('with no :id in the route the form opens immediately in store mode', () => {
    const { queryByTestId, getByTestId } = mount(Overtime, otProps());
    expect(queryByTestId('page-loading')).toBeNull();
    expect(getByTestId('request-buttons').getAttribute('data-method')).toBe('store');
    expect(getByTestId('request-subtitle').getAttribute('data-method')).toBe('store');
  });

  test('with an :id but the instance not yet loaded the form is withheld and PageLoading shows', () => {
    const { queryByTestId } = mount(Overtime, otProps({ params: { id: '7' } }));
    expect(queryByTestId('page-loading')).not.toBeNull();
    expect(queryByTestId('request-buttons')).toBeNull();
  });

  test('with an :id and the instance loaded the form opens in update mode', () => {
    const { getByTestId, queryByTestId } = mount(
      Overtime,
      otProps({
        params: { id: '7' },
        isInstanceLoaded: true,
        instance: { id: 7, user_id: 1, date: '2026-03-10', amount: '01:30', type: 'pre_overtime', status: 'pending' },
      })
    );
    expect(queryByTestId('page-loading')).toBeNull();
    expect(getByTestId('request-buttons').getAttribute('data-method')).toBe('update');
    expect(getByTestId('request-buttons').getAttribute('data-status')).toBe('pending');
  });

  test('is_under_supervisee flips the very same loaded instance from update mode to approval mode', () => {
    const instance = { id: 7, user_id: 2, date: '2026-03-10', amount: '01:30', type: 'pre_overtime', status: 'pending' };
    const a = mount(Overtime, otProps({ params: { id: '7' }, isInstanceLoaded: true, instance }));
    expect(a.getByTestId('request-buttons').getAttribute('data-method')).toBe('update');
    a.unmount();

    const b = mount(
      Overtime,
      otProps({ params: { id: '7' }, isInstanceLoaded: true, instance: { ...instance, is_under_supervisee: true } })
    );
    expect(b.getByTestId('request-buttons').getAttribute('data-method')).toBe('approval');
  });

  test('the date field is editable for the employee but read-only for the approver', () => {
    const { getByTestId, unmount } = mount(Overtime, otProps());
    expect(getByTestId('date-date').getAttribute('data-readonly')).toBe('false');
    unmount();

    const approver = mount(
      Overtime,
      otProps({
        params: { id: '7' },
        isInstanceLoaded: true,
        instance: { id: 7, user_id: 2, date: '2026-03-10', amount: '01:30', is_under_supervisee: true, status: 'pending' },
      })
    );
    expect(approver.getByTestId('date-date').getAttribute('data-readonly')).toBe('true');
  });

  test('the type dropdown lists one title-cased option per OVERTIME_TYPE constant', () => {
    const { container } = mount(
      Overtime,
      otProps({ constant: { OVERTIME_TYPE: { PRE: 'pre_overtime', POST: 'post_overtime' } } })
    );
    const options = Array.from(container.querySelectorAll('select[name="type"] option'));
    expect(options.map((o) => o.textContent)).toEqual(['', 'Pre Overtime', 'Post Overtime']);
    expect(options.slice(1).map((o) => o.value)).toEqual(['pre_overtime', 'post_overtime']);
  });

  test('when OVERTIME_TYPE has not loaded the dropdown holds only the blank placeholder', () => {
    const { container } = mount(Overtime, otProps({ constant: {} }));
    const options = Array.from(container.querySelectorAll('select[name="type"] option'));
    expect(options).toHaveLength(1);
    expect(options[0].textContent).toBe('');
  });

  test('store mode labels the note "Enter Note" and hides the supervisor-note block entirely', () => {
    const { container } = mount(Overtime, otProps());
    expect(container.textContent).toContain('Enter Note:');
    expect(container.textContent).not.toContain('Supervisor Note:');
    expect(container.querySelector('textarea[name="employee_note"]')).not.toBeNull();
    expect(container.querySelector('textarea[name="approver_note"]')).toBeNull();
  });

  test('update mode shows the supervisor note read-only — the employee cannot type in it', () => {
    const { container } = mount(
      Overtime,
      otProps({
        params: { id: '7' },
        isInstanceLoaded: true,
        instance: {
          id: 7, user_id: 1, date: '2026-03-10', amount: '01:30', type: 'pre_overtime',
          status: 'pending', employee_note: 'mine', approver_note: 'approved by supervisor',
        },
      })
    );
    expect(container.textContent).toContain('Supervisor Note:');
    expect(container.textContent).toContain('approved by supervisor');
    expect(container.querySelector('textarea[name="approver_note"]')).toBeNull();
    expect(container.querySelector('textarea[name="employee_note"]')).not.toBeNull();
  });

  test('approval mode inverts it: employee note becomes read-only text and the approver gets the textarea', () => {
    const { container } = mount(
      Overtime,
      otProps({
        params: { id: '7' },
        isInstanceLoaded: true,
        instance: {
          id: 7, user_id: 2, date: '2026-03-10', amount: '01:30', type: 'pre_overtime',
          status: 'pending', employee_note: 'please approve', is_under_supervisee: true,
        },
      })
    );
    expect(container.textContent).toContain('Employee Note:');
    expect(container.textContent).toContain('please approve');
    expect(container.querySelector('textarea[name="employee_note"]')).toBeNull();
    const approver = container.querySelector('textarea[name="approver_note"]');
    expect(approver).not.toBeNull();
    // approver_note is absent on the instance -> null -> the ?? '' guard keeps it a controlled field
    expect(approver.value).toBe('');
  });
});

describe('Request -> Overtime :: mount and route-param lifecycle', () => {
  test('opening the blank form clears the previous instance and fetches nothing', () => {
    const props = otProps();
    mount(Overtime, props);
    expect(props.clearOvertimeInstance).toHaveBeenCalledTimes(1);
    expect(props.fetchOvertime).not.toHaveBeenCalled();
  });

  test('opening with an :id clears the previous instance then fetches that id', () => {
    const props = otProps({ params: { id: '7' } });
    mount(Overtime, props);
    expect(props.clearOvertimeInstance).toHaveBeenCalledTimes(1);
    expect(props.fetchOvertime).toHaveBeenCalledWith('7');
  });

  test('navigating from one overtime record to another re-clears and re-fetches the new id', () => {
    const props = otProps({ params: { id: '7' } });
    const utils = mount(Overtime, props);
    remount(utils, Overtime, { ...props, params: { id: '9' } }, utils.ref);
    expect(props.clearOvertimeInstance).toHaveBeenCalledTimes(2);
    expect(props.fetchOvertime).toHaveBeenNthCalledWith(1, '7');
    expect(props.fetchOvertime).toHaveBeenNthCalledWith(2, '9');
  });

  test('navigating from a record back to the blank form clears but does not fetch again', () => {
    const props = otProps({ params: { id: '7' } });
    const utils = mount(Overtime, props);
    remount(utils, Overtime, { ...props, params: {} }, utils.ref);
    expect(props.clearOvertimeInstance).toHaveBeenCalledTimes(2);
    expect(props.fetchOvertime).toHaveBeenCalledTimes(1);
  });

  test('a re-render that leaves the id untouched triggers neither a clear nor a fetch', () => {
    const props = otProps({ params: { id: '7' } });
    const utils = mount(Overtime, props);
    remount(utils, Overtime, { ...props, params: { id: '7' }, isInstanceLoaded: false }, utils.ref);
    expect(props.clearOvertimeInstance).toHaveBeenCalledTimes(1);
    expect(props.fetchOvertime).toHaveBeenCalledTimes(1);
  });
});

describe('Request -> Overtime :: checkRequestValidity', () => {
  test('a 200 with content returns the payroll window and asks the API for that exact date', async () => {
    API.call.mockResolvedValueOnce(validity(IN_PERIOD));
    const { ref } = mount(Overtime, otProps());
    const result = await ref.current.checkRequestValidity('2026-03-10');
    expect(result).toEqual(IN_PERIOD);
    expect(API.call).toHaveBeenCalledWith({
      method: 'get',
      url: '/request/request-validity-check/',
      params: { date: '2026-03-10' },
    });
  });

  // The `status !== 200` and missing-`content` fall-throughs of checkRequestValidity are NOT
  // tested: see "DELIBERATELY NOT CHARACTERISED" in the file header. Neither can be produced by
  // the endpoint, and axios only resolves on 2xx.
  test('a rejected call dispatches the error alert and rethrows to the caller', async () => {
    const props = otProps();
    API.call.mockRejectedValueOnce({ status: 500, message: 'boom' });
    const { ref } = mount(Overtime, props);
    await expect(ref.current.checkRequestValidity('2026-03-10')).rejects.toEqual({ status: 500, message: 'boom' });
    expect(props.dispatch).toHaveBeenCalledTimes(1);
    expect(props.dispatch.mock.calls[0][0].type).toBe('SHOW_ALERT');
  });
});

describe('Request -> Overtime :: submit payload and validation arms', () => {
  test('a store inside the current cut-off is tagged regular and posts formatted date/amount plus the session id', async () => {
    const props = otProps();
    API.call.mockResolvedValueOnce(validity(IN_PERIOD));
    const { ref } = mount(Overtime, props);
    await ref.current.onSubmitHandler(otValues());

    expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to submit/update this request?');
    expect(props.addOvertime).toHaveBeenCalledTimes(1);
    const body = fdToObject(props.addOvertime.mock.calls[0][0]);
    expect(body.date).toBe('2026-03-10');
    expect(body.amount).toBe('01:30');
    expect(body.type).toBe('pre_overtime');
    expect(body.method).toBe('store');
    expect(body.request_mode).toBe('regular');
    expect(body.session_id).toBe('sess-abc');
    // null-valued fields are dropped from the payload entirely
    expect(body.action).toBeUndefined();
    expect(body.id).toBeUndefined();
    expect(body.approver_note).toBeUndefined();
  });

  test('a store outside the cut-off (Result 2) is tagged dispute and warns the employee first', async () => {
    const props = otProps();
    API.call.mockResolvedValueOnce(validity(DISPUTE));
    const { ref } = mount(Overtime, props);
    await ref.current.onSubmitHandler(otValues({ date: D('2026-01-05T00:00:00') }));

    expect(confirmSpy.mock.calls[0][0]).toContain('exceeds the current payroll cut-off period');
    expect(confirmSpy.mock.calls[0][0]).toContain('recorded as a dispute');
    const body = fdToObject(props.addOvertime.mock.calls[0][0]);
    expect(body.request_mode).toBe('dispute');
    expect(body.date).toBe('2026-01-05');
  });

  test('declining the confirm dialog abandons the store', async () => {
    const props = otProps();
    window.confirm = jest.fn(() => false);
    API.call.mockResolvedValueOnce(validity(IN_PERIOD));
    const { ref } = mount(Overtime, props);
    await ref.current.onSubmitHandler(otValues());
    expect(props.addOvertime).not.toHaveBeenCalled();
    expect(props.updateOvertime).not.toHaveBeenCalled();
  });

  test('an update posts through updateOvertime with the id and a PUT method override', async () => {
    const props = otProps();
    API.call.mockResolvedValueOnce(validity(IN_PERIOD));
    const { ref } = mount(Overtime, props);
    await ref.current.onSubmitHandler(otValues({ method: 'update', id: 7 }));

    expect(props.addOvertime).not.toHaveBeenCalled();
    expect(props.updateOvertime).toHaveBeenCalledTimes(1);
    expect(props.updateOvertime.mock.calls[0][0]).toBe(7);
    const body = fdToObject(props.updateOvertime.mock.calls[0][1]);
    expect(body._method).toBe('PUT');
    expect(body.id).toBe('7');
    expect(body.request_mode).toBe('regular');
  });

  test('an approval-mode form submitted with a null action confirms but dispatches nothing', async () => {
    const props = otProps();
    API.call.mockResolvedValueOnce(validity(IN_PERIOD));
    const { ref } = mount(Overtime, props);
    await ref.current.onSubmitHandler(otValues({ method: 'approval', id: 7 }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(props.addOvertime).not.toHaveBeenCalled();
    expect(props.updateOvertime).not.toHaveBeenCalled();
    expect(props.updateOvertimeStatus).not.toHaveBeenCalled();
  });

  test.each(['approve', 'decline', 'cancel'])(
    'the %s action skips the validity check and posts the status with the current payroll cut-off',
    async (action) => {
      const props = otProps();
      const { ref } = mount(Overtime, props);
      await ref.current.onSubmitHandler(otValues({ action, id: 7, method: 'approval' }));

      expect(API.call).not.toHaveBeenCalled();
      expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to ' + action + ' this request?');
      expect(props.updateOvertimeStatus).toHaveBeenCalledTimes(1);
      const [id, body, status, userId, from, to] = props.updateOvertimeStatus.mock.calls[0];
      expect(id).toBe(7);
      expect(status).toBe(action);
      expect(userId).toBe(1);
      expect(from).toBe('2026-03-01');
      expect(to).toBe('2026-03-31');
      expect(fdToObject(body)._method).toBe('PUT');
    }
  );

  test('declining the confirm on an approve leaves the request untouched', async () => {
    const props = otProps();
    window.confirm = jest.fn(() => false);
    const { ref } = mount(Overtime, props);
    await ref.current.onSubmitHandler(otValues({ action: 'approve', id: 7, method: 'approval' }));
    expect(props.updateOvertimeStatus).not.toHaveBeenCalled();
  });
});

/* ============================================================ REST DAY WORK */

const rdwProps = (over = {}) => ({
  fetchRestDayWork: jest.fn(),
  addRestDayWork: jest.fn(),
  updateRestDayWork: jest.fn(),
  updateRestDayWorkStatus: jest.fn(),
  resetRestDayWorkInstance: jest.fn(),
  clearRestDayWorkInstance: jest.fn(),
  setRedirect: jest.fn(),
  dispatch: jest.fn(),
  user: USER,
  instance: {},
  isInstanceLoaded: false,
  constant: {},
  settings: CUTOFF,
  params: {},
  match: { params: {} },
  history: { push: jest.fn() },
  location: { search: '' },
  ...over,
});

const rdwValues = (over = {}) => ({
  action: null,
  method: 'store',
  id: null,
  date: D('2026-03-14T00:00:00'),
  user_id: '1',
  start_time: D('2026-03-14T08:00:00'),
  end_time: D('2026-03-14T17:30:00'),
  break_time: D('2026-03-14T01:00:00'),
  employee_note: 'covering the weekend deploy',
  approver_note: null,
  ...over,
});

describe('Request -> Rest Day Work :: render gates', () => {
  test('the blank form opens in store mode with only the employee note and no timezone panels', () => {
    const { container, getByTestId, queryByTestId } = mount(RestDayWork, rdwProps());
    expect(queryByTestId('page-loading')).toBeNull();
    expect(getByTestId('request-buttons').getAttribute('data-method')).toBe('store');
    expect(container.querySelector('textarea[name="employee_note"]')).not.toBeNull();
    expect(container.querySelector('textarea[name="approver_note"]')).toBeNull();
    expect(container.textContent).not.toContain('Supervisor Perspective Timezone');
    expect(container.querySelector('input[name="status"]')).toBeNull();
  });

  test('an :id with the instance still loading withholds the form', () => {
    const { queryByTestId } = mount(RestDayWork, rdwProps({ params: { id: '5' } }));
    expect(queryByTestId('page-loading')).not.toBeNull();
    expect(queryByTestId('request-buttons')).toBeNull();
  });

  test('approval mode shows both perspective timezones, the read-only employee note and a hidden status field', () => {
    const { container } = mount(
      RestDayWork,
      rdwProps({
        params: { id: '5' },
        isInstanceLoaded: true,
        instance: {
          id: 5, user_id: 2, date: '2026-03-14', start_time: '08:00', end_time: '17:30', break_time: '01:00',
          pov_start_time: '11:00', pov_end_time: '20:30', pov_timezone: '05:00',
          employee_note: 'weekend cover', is_under_supervisee: true, status: 'pending',
        },
      })
    );
    expect(container.textContent).toContain('Supervisor Perspective Timezone');
    expect(container.textContent).toContain('Employee Perspective Timezone');
    expect(container.textContent).toContain("Employee's Note:");
    expect(container.textContent).toContain('weekend cover');
    expect(container.querySelector('textarea[name="employee_note"]')).toBeNull();
    expect(container.querySelector('textarea[name="approver_note"]')).not.toBeNull();
    expect(container.querySelector('input[name="status"]')).not.toBeNull();
    // the employee-perspective duty times are shown but locked
    const povStart = container.querySelector('[data-testid="time-pov_start_time"]');
    expect(povStart.getAttribute('data-disabled')).toBe('true');
  });

  test('an approval on a request filed without a note still renders the Employee\'s Note line, empty', () => {
    const { container } = mount(
      RestDayWork,
      rdwProps({
        params: { id: '5' },
        isInstanceLoaded: true,
        instance: {
          id: 5, user_id: 2, date: '2026-03-14', start_time: '08:00', end_time: '17:30', break_time: '01:00',
          is_under_supervisee: true, status: 'pending',
        },
      })
    );
    // The Employee's Note block is rendered but empty. Asserting the block's own text (rather than
    // "the page does not contain the word null") is what makes this fail if the block disappears.
    // Mechanism note: RestDayWork.js:335 writes {values.employee_note ?? ''}, but that guard is not
    // what keeps "null" off the screen — JSX renders a null child as nothing either way.
    const noteBlock = Array.from(container.querySelectorAll('.form-group')).find((d) =>
      d.textContent.startsWith("Employee's Note:")
    );
    expect(noteBlock).not.toBeUndefined();
    expect(noteBlock.textContent.trim()).toBe("Employee's Note:");

    // RestDayWork.js:339 passes value={values.approver_note} with NO ?? '' guard (Overtime.js:292
    // has one). The empty string below is react-dom coercing the null value on a controlled
    // textarea — and react-dom logs "value prop on textarea should not be null" while doing it.
    // The '' is therefore evidence of the missing guard, not of a guard working.
    expect(container.querySelector('textarea[name="approver_note"]').value).toBe('');
  });

  test("the instance's offset_difference is handed to the on/off duty pickers, and is blank when absent", () => {
    const loaded = {
      id: 5, user_id: 2, date: '2026-03-14', start_time: '08:00', end_time: '17:30', break_time: '01:00',
      status: 'pending',
    };
    const withOffset = mount(
      RestDayWork,
      rdwProps({ params: { id: '5' }, isInstanceLoaded: true, instance: { ...loaded, offset_difference: -18000 } })
    );
    expect(withOffset.getByTestId('time-start_time').getAttribute('data-offset')).toBe('-18000');
    expect(withOffset.getByTestId('time-end_time').getAttribute('data-offset')).toBe('-18000');
    withOffset.unmount();

    const without = mount(RestDayWork, rdwProps({ params: { id: '5' }, isInstanceLoaded: true, instance: loaded }));
    expect(without.getByTestId('time-start_time').getAttribute('data-offset')).toBe('');
  });
});

describe('Request -> Rest Day Work :: mount and route-param lifecycle', () => {
  test('the blank form clears the previous instance and fetches nothing', () => {
    const props = rdwProps();
    mount(RestDayWork, props);
    expect(props.clearRestDayWorkInstance).toHaveBeenCalledTimes(1);
    expect(props.fetchRestDayWork).not.toHaveBeenCalled();
  });

  test('navigating between two rest-day-work records re-clears and fetches the new id', () => {
    const props = rdwProps({ params: { id: '5' } });
    const utils = mount(RestDayWork, props);
    expect(props.fetchRestDayWork).toHaveBeenCalledWith('5');
    remount(utils, RestDayWork, { ...props, params: { id: '6' } }, utils.ref);
    expect(props.clearRestDayWorkInstance).toHaveBeenCalledTimes(2);
    expect(props.fetchRestDayWork).toHaveBeenNthCalledWith(2, '6');
  });

  test('navigating back to the blank form clears without fetching again', () => {
    const props = rdwProps({ params: { id: '5' } });
    const utils = mount(RestDayWork, props);
    remount(utils, RestDayWork, { ...props, params: {} }, utils.ref);
    expect(props.clearRestDayWorkInstance).toHaveBeenCalledTimes(2);
    expect(props.fetchRestDayWork).toHaveBeenCalledTimes(1);
  });
});

describe('Request -> Rest Day Work :: submit payload and validation arms', () => {
  test('a store inside the cut-off posts date as Y-m-d and all three times as HH:mm, tagged regular', async () => {
    const props = rdwProps();
    API.call.mockResolvedValueOnce(validity(IN_PERIOD));
    const { ref } = mount(RestDayWork, props);
    await ref.current.onSubmitHandler(rdwValues());

    const body = fdToObject(props.addRestDayWork.mock.calls[0][0]);
    expect(body.date).toBe('2026-03-14');
    expect(body.start_time).toBe('08:00');
    expect(body.end_time).toBe('17:30');
    expect(body.break_time).toBe('01:00');
    expect(body.request_mode).toBe('regular');
    expect(body.session_id).toBe('sess-abc');
    expect(body.employee_note).toBe('covering the weekend deploy');
    expect(body.approver_note).toBeUndefined();
  });

  test('a store outside the cut-off (Result 2) is tagged dispute after the long warning', async () => {
    const props = rdwProps();
    API.call.mockResolvedValueOnce(validity(DISPUTE));
    const { ref } = mount(RestDayWork, props);
    await ref.current.onSubmitHandler(rdwValues({ date: D('2026-01-11T00:00:00') }));

    expect(confirmSpy.mock.calls[0][0]).toContain('will be recorded as a dispute');
    expect(fdToObject(props.addRestDayWork.mock.calls[0][0]).request_mode).toBe('dispute');
  });

  test('an update posts through updateRestDayWork with a PUT override', async () => {
    const props = rdwProps();
    API.call.mockResolvedValueOnce(validity(IN_PERIOD));
    const { ref } = mount(RestDayWork, props);
    await ref.current.onSubmitHandler(rdwValues({ method: 'update', id: 5 }));
    expect(props.updateRestDayWork.mock.calls[0][0]).toBe(5);
    expect(fdToObject(props.updateRestDayWork.mock.calls[0][1])._method).toBe('PUT');
  });

  test('a confirmed submit whose method is neither store nor update dispatches nothing', async () => {
    const props = rdwProps();
    API.call.mockResolvedValueOnce(validity(IN_PERIOD));
    const { ref } = mount(RestDayWork, props);
    await ref.current.onSubmitHandler(rdwValues({ method: 'approval', id: 5 }));
    expect(confirmSpy).toHaveBeenCalled();
    expect(props.addRestDayWork).not.toHaveBeenCalled();
    expect(props.updateRestDayWork).not.toHaveBeenCalled();
  });

  test('a rejected validity call dispatches the alert and rethrows', async () => {
    const props = rdwProps();
    API.call.mockRejectedValueOnce({ status: 500 });
    const { ref } = mount(RestDayWork, props);
    await expect(ref.current.checkRequestValidity('2026-03-14')).rejects.toEqual({ status: 500 });
    expect(props.dispatch).toHaveBeenCalledTimes(1);
  });

  test.each(['approve', 'decline', 'cancel'])(
    'the %s action posts the status with the payroll cut-off and no validity check',
    async (action) => {
      const props = rdwProps();
      const { ref } = mount(RestDayWork, props);
      await ref.current.onSubmitHandler(rdwValues({ action, id: 5, method: 'approval' }));
      expect(API.call).not.toHaveBeenCalled();
      const [id, body, status, userId, from, to] = props.updateRestDayWorkStatus.mock.calls[0];
      expect([id, status, userId, from, to]).toEqual([5, action, 1, '2026-03-01', '2026-03-31']);
      expect(fdToObject(body)._method).toBe('PUT');
    }
  );

  test('declining the confirm on a cancel leaves the request untouched', async () => {
    const props = rdwProps();
    window.confirm = jest.fn(() => false);
    const { ref } = mount(RestDayWork, props);
    await ref.current.onSubmitHandler(rdwValues({ action: 'cancel', id: 5, method: 'approval' }));
    expect(props.updateRestDayWorkStatus).not.toHaveBeenCalled();
  });
});

/* ========================================================= CHANGE SCHEDULE */

const csProps = (over = {}) => ({
  fetchChangeSchedule: jest.fn(),
  addChangeSchedule: jest.fn(),
  updateChangeSchedule: jest.fn(),
  updateChangeScheduleStatus: jest.fn(),
  resetChangeScheduleInstance: jest.fn(),
  clearChangeScheduleInstance: jest.fn(),
  setRedirect: jest.fn(),
  dispatch: jest.fn(),
  user: USER,
  instance: {},
  isInstanceLoaded: false,
  constant: { SCHEDULE_POLICIES: [], SCHEDULE_HOLIDAY_POLICIES: [] },
  settings: CUTOFF,
  params: {},
  match: { params: {} },
  history: { push: jest.fn() },
  location: { search: '' },
  ...over,
});

const probe = (utils) => JSON.parse(utils.getByTestId('formik-values').textContent);

// A customised day. Hours are chosen per test to hit the night-diff / before-flex guards.
const day = (start, end, flexStart, flexEnd) => ({
  start_time: D('2026-03-16T' + start + ':00'),
  end_time: D('2026-03-16T' + end + ':00'),
  start_flexy_time: D('2026-03-16T' + flexStart + ':00'),
  end_flexy_time: D('2026-03-16T' + flexEnd + ':00'),
  break_time: D('2026-03-16T01:00:00'),
});

const csValues = (over = {}) => ({
  action: null,
  method: 'store',
  id: null,
  valid_from: D('2026-03-16T00:00:00'),
  valid_to: D('2026-03-20T00:00:00'),
  employee_note: 'shifting to a later start',
  approver_note: null,
  name: '[CHANGE SCHEDULE REQUEST] - Employee One',
  schedule_type: 'customize',
  work_days: ['mon'],
  cst_schedule_details: [day('09:00', '18:00', '10:00', '19:00')],
  schedule_policies: { allow_late: 0, allow_undertime: 0, allow_night_diff: 0, allow_special_holiday: 1, allow_legal_holiday: 1 },
  bind_to: 'user',
  bind_id: '1',
  source_type: 'change_schedule',
  ...over,
});

const LOADED_SCHEDULE = {
  id: 12,
  user_id: 2,
  status: 'pending',
  valid_from: '2026-03-16',
  valid_to: '2026-03-20',
  schedule: {
    name: 'Custom Night Shift',
    work_days: ['mon', 'wed'],
    schedule_details: {
      mon: { start_time: '09:00:00', end_time: '18:00:00', start_flexy_time: '10:00:00', end_flexy_time: '19:00:00', break_time: '01:00:00' },
      wed: { start_time: '09:00:00', end_time: '18:00:00', start_flexy_time: '10:00:00', end_flexy_time: '19:00:00', break_time: '01:00:00' },
    },
    pov_schedule_details: {
      mon: { start_time: '04:00:00', end_time: '13:00:00', start_flexy_time: '05:00:00', end_flexy_time: '14:00:00', break_time: '01:00:00' },
      wed: { start_time: '04:00:00', end_time: '13:00:00', start_flexy_time: '05:00:00', end_flexy_time: '14:00:00', break_time: '01:00:00' },
    },
    schedule_policies: { allow_late: 15, allow_undertime: 30, allow_night_diff: 1, allow_special_holiday: 0, allow_legal_holiday: 0 },
  },
  user: { full_name: 'Employee Two', pov_timezone: 'Asia/Kolkata', user_offset_seconds: -18000 },
  offset_difference: -18000,
};

describe('Request -> Change Schedule :: initial values built from the instance', () => {
  test('a brand-new request defaults every payroll policy and names itself after the requester', () => {
    const utils = mount(ChangeSchedule, csProps());
    const v = probe(utils);
    expect(v.method).toBe('store');
    expect(v.name).toBe('[CHANGE SCHEDULE REQUEST] - Employee One');
    expect(v.bind_id).toBe('1');
    expect(v.bind_to).toBe('user');
    expect(v.source_type).toBe('change_schedule');
    expect(v.schedule_type).toBe('customize');
    expect(v.work_days).toEqual([]);
    expect(v.cst_len).toBe(0);
    expect(v.pov_len).toBe(0);
    expect(v.schedule_policies).toEqual({
      allow_late: 0,
      allow_undertime: 0,
      allow_night_diff: 0,
      allow_special_holiday: 1,
      allow_legal_holiday: 1,
    });
  });

  test('a loaded instance seeds the policies, the schedule name, the bind id and both detail arrays', () => {
    const utils = mount(
      ChangeSchedule,
      csProps({ params: { id: '12' }, isInstanceLoaded: true, instance: LOADED_SCHEDULE })
    );
    const v = probe(utils);
    expect(v.name).toBe('Custom Night Shift');
    expect(v.bind_id).toBe('2');
    expect(v.work_days).toEqual(['mon', 'wed']);
    expect(v.schedule_policies).toEqual({
      allow_late: 15,
      allow_undertime: 30,
      allow_night_diff: 1,
      allow_special_holiday: 0,
      allow_legal_holiday: 0,
    });
    // one entry per key of schedule_details / pov_schedule_details, parsed onto the 2020-01-01 anchor
    expect(v.cst_len).toBe(2);
    expect(v.pov_len).toBe(2);
    expect(v.cst_first).toEqual({ start: 9, end: 18 });
    expect(v.pov_first).toEqual({ start: 4 });
  });

  test('only the days listed in work_days get a schedule row, in sorted_week_days order', () => {
    const utils = mount(
      ChangeSchedule,
      csProps({ params: { id: '12' }, isInstanceLoaded: true, instance: LOADED_SCHEDULE })
    );
    const rows = utils.getAllByTestId('sched-day');
    expect(rows.map((r) => r.getAttribute('data-day'))).toEqual(['mon', 'wed']);
    expect(rows.map((r) => r.getAttribute('data-index'))).toEqual(['0', '1']);
    expect(rows[0].getAttribute('data-offset')).toBe('-18000');
  });

  test('with no work days selected no schedule rows are rendered at all', () => {
    const utils = mount(ChangeSchedule, csProps());
    expect(utils.queryAllByTestId('sched-day')).toHaveLength(0);
  });
});

describe('Request -> Change Schedule :: render gates', () => {
  test('an :id with the instance still loading withholds the form', () => {
    const { queryByTestId } = mount(ChangeSchedule, csProps({ params: { id: '12' } }));
    expect(queryByTestId('page-loading')).not.toBeNull();
    expect(queryByTestId('request-buttons')).toBeNull();
  });

  test('store mode shows the employee note and hides the approver note and the timezone outlook', () => {
    const { container, getByTestId } = mount(ChangeSchedule, csProps());
    expect(getByTestId('request-buttons').getAttribute('data-method')).toBe('store');
    expect(container.querySelector('textarea[name="employee_note"]')).not.toBeNull();
    expect(container.querySelector('textarea[name="approver_note"]')).toBeNull();
    expect(container.textContent).not.toContain('Toggle Outlook');
  });

  test('approval mode swaps in the approver note, the two timezones and the outlook toggle', () => {
    const { container, getByTestId, getAllByTestId } = mount(
      ChangeSchedule,
      csProps({
        params: { id: '12' },
        isInstanceLoaded: true,
        instance: { ...LOADED_SCHEDULE, is_under_supervisee: true, employee_note: 'later start please' },
      })
    );
    expect(getByTestId('request-buttons').getAttribute('data-method')).toBe('approval');
    expect(container.textContent).toContain('Toggle Outlook');
    expect(container.textContent).toContain('Asia/Manila'); // approver's own pov_timezone
    expect(container.textContent).toContain('Asia/Kolkata'); // requester's pov_timezone
    expect(container.textContent).toContain("Employee's Note:");
    expect(container.textContent).toContain('later start please');
    expect(container.querySelector('textarea[name="employee_note"]')).toBeNull();
    expect(container.querySelector('textarea[name="approver_note"]')).not.toBeNull();
    expect(container.querySelector('input[name="status"]')).not.toBeNull();
    expect(getAllByTestId('sched-day')[0].getAttribute('data-approval')).toBe('true');
  });

  test('Toggle Outlook flips the open_contrast flag passed down to every schedule row', () => {
    const utils = mount(
      ChangeSchedule,
      csProps({ params: { id: '12' }, isInstanceLoaded: true, instance: { ...LOADED_SCHEDULE, is_under_supervisee: true } })
    );
    expect(utils.getAllByTestId('sched-day')[0].getAttribute('data-contrast')).toBe('true');
    fireEvent.click(utils.getByText(/Toggle Outlook/));
    expect(utils.getAllByTestId('sched-day')[0].getAttribute('data-contrast')).toBe('false');
    fireEvent.click(utils.getByText(/Toggle Outlook/));
    expect(utils.getAllByTestId('sched-day')[0].getAttribute('data-contrast')).toBe('true');
  });
});

describe('Request -> Change Schedule :: night-differential and flex guards', () => {
  // Names in this block describe onSubmitHandler, which is called directly — Formik/Yup are not in
  // the path (see "HOW THE SUBMIT TESTS DRIVE THE SCREEN" in the file header).
  test('a plain daytime schedule with night-diff off clears both guards and reaches addChangeSchedule', () => {
    const props = csProps();
    const utils = mount(ChangeSchedule, props);
    utils.ref.current.onSubmitHandler(csValues());

    expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to submit/update this request?');
    expect(props.addChangeSchedule).toHaveBeenCalledTimes(1);
    const body = props.addChangeSchedule.mock.calls[0][0];
    expect(body.valid_from).toBe('2026-03-16');
    expect(body.valid_to).toBe('2026-03-20');
    expect(body.session_id).toBe('sess-abc');
    expect(body.schedule_details).toEqual({
      mon: { start_time: '09:00', end_time: '18:00', start_flexy_time: '10:00', end_flexy_time: '19:00', break_time: '01:00' },
    });
    expect(utils.queryByText('Night Shift Applicable')).toBeNull();
  });

  test('an off-duty past 22:00 with night-diff switched off is refused and the Night Shift modal explains why', () => {
    const props = csProps();
    const utils = mount(ChangeSchedule, props);
    utils.ref.current.onSubmitHandler(
      csValues({ cst_schedule_details: [day('14:00', '23:00', '15:00', '23:30')] })
    );

    expect(props.addChangeSchedule).not.toHaveBeenCalled();
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(utils.getByText('Night Shift Applicable')).toBeTruthy();
    expect(utils.container.textContent).toContain('or before 6 AM');
  });

  test('every customised day is checked, not just the first — a clean Monday does not excuse a 23:00 Tuesday', () => {
    const props = csProps();
    const utils = mount(ChangeSchedule, props);
    utils.ref.current.onSubmitHandler(
      csValues({
        work_days: ['mon', 'tue'],
        cst_schedule_details: [day('09:00', '18:00', '10:00', '19:00'), day('14:00', '23:00', '15:00', '23:30')],
      })
    );
    expect(props.addChangeSchedule).not.toHaveBeenCalled();
    expect(utils.getByText('Night Shift Applicable')).toBeTruthy();
  });

  test('two clean customised days both reach the payload, keyed by work day', () => {
    const props = csProps();
    const utils = mount(ChangeSchedule, props);
    utils.ref.current.onSubmitHandler(
      csValues({
        work_days: ['mon', 'tue'],
        cst_schedule_details: [day('09:00', '18:00', '10:00', '19:00'), day('08:00', '17:00', '09:00', '18:00')],
      })
    );
    const details = props.addChangeSchedule.mock.calls[0][0].schedule_details;
    expect(Object.keys(details)).toEqual(['mon', 'tue']);
    expect(details.tue.start_time).toBe('08:00');
    expect(details.tue.end_time).toBe('17:00');
  });

  test('the same late schedule is accepted once night-diff is switched on', () => {
    const props = csProps();
    const utils = mount(ChangeSchedule, props);
    utils.ref.current.onSubmitHandler(
      csValues({
        cst_schedule_details: [day('14:00', '23:00', '15:00', '23:30')],
        schedule_policies: { allow_late: 0, allow_undertime: 0, allow_night_diff: 1, allow_special_holiday: 1, allow_legal_holiday: 1 },
      })
    );
    expect(props.addChangeSchedule).toHaveBeenCalledTimes(1);
    expect(utils.queryByText('Night Shift Applicable')).toBeNull();
  });

  test('an on-duty before 06:00 also trips the night-differential guard', () => {
    const props = csProps();
    const utils = mount(ChangeSchedule, props);
    utils.ref.current.onSubmitHandler(
      csValues({ cst_schedule_details: [day('05:00', '14:00', '05:30', '15:00')] })
    );
    expect(props.addChangeSchedule).not.toHaveBeenCalled();
    expect(utils.getByText('Night Shift Applicable')).toBeTruthy();
  });

  test('a flex start earlier than the on-duty time is refused and the Incorrect Flex Time modal explains why', () => {
    const props = csProps();
    const utils = mount(ChangeSchedule, props);
    utils.ref.current.onSubmitHandler(
      csValues({ cst_schedule_details: [day('09:00', '18:00', '08:00', '19:00')] })
    );
    expect(props.addChangeSchedule).not.toHaveBeenCalled();
    expect(utils.getByText('Incorrect Flex Time')).toBeTruthy();
    expect(utils.queryByText('Night Shift Applicable')).toBeNull();
  });

  test('the Night Shift modal closes again when the employee dismisses it', () => {
    const utils = mount(ChangeSchedule, csProps());
    utils.ref.current.onSubmitHandler(
      csValues({ cst_schedule_details: [day('14:00', '23:00', '15:00', '23:30')] })
    );
    expect(utils.getByText('Night Shift Applicable')).toBeTruthy();
    fireEvent.click(utils.container.querySelector('.modal-header .close'));
    expect(utils.queryByText('Night Shift Applicable')).toBeNull();
  });

  test('the Incorrect Flex Time modal closes again when the employee dismisses it', () => {
    const utils = mount(ChangeSchedule, csProps());
    utils.ref.current.onSubmitHandler(
      csValues({ cst_schedule_details: [day('09:00', '18:00', '08:00', '19:00')] })
    );
    expect(utils.getByText('Incorrect Flex Time')).toBeTruthy();
    fireEvent.click(utils.container.querySelector('.modal-header .close'));
    expect(utils.queryByText('Incorrect Flex Time')).toBeNull();
  });

  test('an approver reviewing the request skips the night-diff guard entirely and can still approve it', () => {
    const props = csProps({
      params: { id: '12' },
      isInstanceLoaded: true,
      instance: { ...LOADED_SCHEDULE, is_under_supervisee: true },
    });
    const utils = mount(ChangeSchedule, props);
    utils.ref.current.onSubmitHandler(
      csValues({
        action: 'approve',
        id: 12,
        method: 'approval',
        cst_schedule_details: [day('14:00', '23:00', '15:00', '23:30')],
      })
    );
    expect(utils.queryByText('Night Shift Applicable')).toBeNull();
    const [id, body, status, userId, from, to] = props.updateChangeScheduleStatus.mock.calls[0];
    expect([id, status, userId, from, to]).toEqual([12, 'approve', 1, '2026-03-01', '2026-03-31']);
    expect(body._method).toBe('PUT');
  });

  // ChangeSchedule.js:80-81 shifts every time by (requester_offset - viewer_offset) before running
  // the guards. That subtraction is only non-zero when the loaded instance belongs to SOMEONE ELSE
  // and the screen is NOT in approval mode. Reaching it needs all of:
  //   * a loaded instance -> :id in the route (store mode always clears instance to {} in
  //     componentWillMount, so instance.user is undefined there and time_diff stays 0);
  //   * the fetch to succeed for a foreign user -> ChangeScheduleRepository::find() calls
  //     get_authenticated_user(), which passes when the requester is in the viewer's
  //     users_handled() list (User.php:731 — for HR / Payroll / Client / SubDepartment Head that
  //     is the whole EH_SP_Employee_List, not just direct reports);
  //   * is_under_supervisee() to be FALSE so the guard block still runs — user_helper.php:88 only
  //     returns true for level_type Admin / DivisionHead / Department Head, or for the requester's
  //     DIRECT supervisor. An HR or Payroll viewer is neither, so ChangeScheduleResource.php:45
  //     ships is_under_supervisee=false and the screen opens in 'update' mode.
  // So: HR opens an Indian employee's change-schedule request. -5h vs their own +0.
  test("the guard is evaluated with the requester's offset applied: a -5h shift turns the same 23:00 finish into 18:00 and clears it", () => {
    const props = csProps({
      params: { id: '12' },
      isInstanceLoaded: true,
      // no is_under_supervisee -> onApproval false -> the guards below still run
      instance: { ...LOADED_SCHEDULE, user: { ...LOADED_SCHEDULE.user, user_offset_seconds: -18000 } },
      user: { ...USER, user_offset_seconds: 0 },
    });
    const utils = mount(ChangeSchedule, props);
    expect(utils.getByTestId('request-buttons').getAttribute('data-method')).toBe('update');

    utils.ref.current.onSubmitHandler(
      csValues({ method: 'update', id: 12, cst_schedule_details: [day('14:00', '23:00', '15:00', '23:30')] })
    );
    // identical times were refused in the zero-offset test above; shifted back 5h they are fine
    expect(utils.queryByText('Night Shift Applicable')).toBeNull();
    expect(props.updateChangeSchedule).toHaveBeenCalledTimes(1);
  });
});

describe('Request -> Change Schedule :: submit routing', () => {
  test('an update posts through updateChangeSchedule with the id and a PUT override', () => {
    const props = csProps();
    const utils = mount(ChangeSchedule, props);
    utils.ref.current.onSubmitHandler(csValues({ method: 'update', id: 12 }));
    expect(props.addChangeSchedule).not.toHaveBeenCalled();
    expect(props.updateChangeSchedule.mock.calls[0][0]).toBe(12);
    expect(props.updateChangeSchedule.mock.calls[0][1]._method).toBe('PUT');
  });

  test('a confirmed submit whose method is neither store nor update dispatches nothing', () => {
    const props = csProps();
    const utils = mount(ChangeSchedule, props);
    utils.ref.current.onSubmitHandler(csValues({ method: 'approval', id: 12 }));
    expect(confirmSpy).toHaveBeenCalled();
    expect(props.addChangeSchedule).not.toHaveBeenCalled();
    expect(props.updateChangeSchedule).not.toHaveBeenCalled();
  });

  test('declining the confirm on a decline leaves the request untouched', () => {
    const props = csProps();
    window.confirm = jest.fn(() => false);
    const utils = mount(ChangeSchedule, props);
    utils.ref.current.onSubmitHandler(csValues({ action: 'decline', id: 12, method: 'approval' }));
    expect(props.updateChangeScheduleStatus).not.toHaveBeenCalled();
  });

  test('navigating between two change-schedule records re-clears and fetches the new id', () => {
    const props = csProps({ params: { id: '12' } });
    const utils = mount(ChangeSchedule, props);
    expect(props.fetchChangeSchedule).toHaveBeenCalledWith('12');
    remount(utils, ChangeSchedule, { ...props, params: { id: '13' } }, utils.ref);
    expect(props.clearChangeScheduleInstance).toHaveBeenCalledTimes(2);
    expect(props.fetchChangeSchedule).toHaveBeenNthCalledWith(2, '13');
    remount(utils, ChangeSchedule, { ...props, params: {} }, utils.ref);
    expect(props.clearChangeScheduleInstance).toHaveBeenCalledTimes(3);
    expect(props.fetchChangeSchedule).toHaveBeenCalledTimes(2);
  });
});

/* ============================================================ REDUX WIRING */

describe('Request screens :: redux wiring contract', () => {
  test('Overtime selects its own slice and dispatches the overtime action creators', () => {
    const state = {
      constant: { OVERTIME_TYPE: {} },
      overtime: { instance: { id: 7 }, isInstanceLoaded: true },
      restDayWork: { instance: { id: 99 } },
      user: { id: 1 },
      settings: CUTOFF,
    };
    expect(Overtime.__mapStateToProps(state)).toEqual({
      constant: state.constant,
      instance: { id: 7 },
      isInstanceLoaded: true,
      user: { id: 1 },
      settings: CUTOFF,
    });

    const dispatch = jest.fn();
    const p = Overtime.__mapDispatchToProps(dispatch);
    p.fetchOvertime(7);
    p.addOvertime('fd');
    p.updateOvertime(7, 'fd');
    p.updateOvertimeStatus(7, 'fd', 'approve', 1, 'a', 'b');
    p.resetOvertimeInstance();
    p.clearOvertimeInstance();
    p.setRedirect('/x/');
    expect(dispatch.mock.calls.map((c) => c[0].type)).toEqual([
      'OT_FETCH', 'OT_ADD', 'OT_UPDATE', 'OT_STATUS', 'OT_RESET', 'OT_CLEAR', 'SET_REDIRECT',
    ]);
    expect(dispatch.mock.calls[3][0]).toMatchObject({ id: 7, s: 'approve', u: 1, f: 'a', t: 'b' });
    // Overtime.js:346 re-exports the raw store dispatch; checkRequestValidity's error path needs it.
    expect(p.dispatch).toBe(dispatch);
  });

  test('RestDayWork selects its own slice and dispatches the rest-day-work action creators', () => {
    const state = {
      constant: {},
      overtime: { instance: { id: 7 } },
      restDayWork: { instance: { id: 5 }, isInstanceLoaded: false },
      user: { id: 1 },
      settings: CUTOFF,
    };
    expect(RestDayWork.__mapStateToProps(state)).toEqual({
      constant: {},
      instance: { id: 5 },
      isInstanceLoaded: false,
      user: { id: 1 },
      settings: CUTOFF,
    });

    const dispatch = jest.fn();
    const p = RestDayWork.__mapDispatchToProps(dispatch);
    p.fetchRestDayWork(5);
    p.addRestDayWork('fd');
    p.updateRestDayWork(5, 'fd');
    p.updateRestDayWorkStatus(5, 'fd', 'cancel', 1, 'a', 'b');
    p.resetRestDayWorkInstance();
    p.clearRestDayWorkInstance();
    p.setRedirect('/x/');
    expect(dispatch.mock.calls.map((c) => c[0].type)).toEqual([
      'RDW_FETCH', 'RDW_ADD', 'RDW_UPDATE', 'RDW_STATUS', 'RDW_RESET', 'RDW_CLEAR', 'SET_REDIRECT',
    ]);
    expect(dispatch.mock.calls[0][0].id).toBe(5);
  });

  test('ChangeSchedule dispatches its own action creators but, unlike the other two, exposes no raw dispatch', () => {
    const state = {
      constant: {},
      changeSchedule: { instance: { id: 12 }, isInstanceLoaded: true },
      user: { id: 1 },
      settings: CUTOFF,
    };
    expect(ChangeSchedule.__mapStateToProps(state)).toEqual({
      constant: {},
      instance: { id: 12 },
      isInstanceLoaded: true,
      user: { id: 1 },
      settings: CUTOFF,
    });

    const dispatch = jest.fn();
    const p = ChangeSchedule.__mapDispatchToProps(dispatch);
    p.fetchChangeSchedule(12);
    p.addChangeSchedule({});
    p.updateChangeSchedule(12, {});
    p.updateChangeScheduleStatus(12, {}, 'approve', 1, 'a', 'b');
    p.resetChangeScheduleInstance();
    p.clearChangeScheduleInstance();
    p.setRedirect('/x/');
    expect(dispatch.mock.calls.map((c) => c[0].type)).toEqual([
      'CS_FETCH', 'CS_ADD', 'CS_UPDATE', 'CS_STATUS', 'CS_RESET', 'CS_CLEAR', 'SET_REDIRECT',
    ]);
    expect(p.dispatch).toBeUndefined();
  });
});
