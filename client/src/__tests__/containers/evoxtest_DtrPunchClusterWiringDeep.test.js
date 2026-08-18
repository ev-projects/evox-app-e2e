// evoxtest_DtrPunchClusterWiringDeep.test.js
//
// SOURCE FILES UNDER TEST
//   src/container/DtrPunch/DtrPunch.js                                  (7 uncovered fns / 3 br)
//   src/container/DailyTimeRecordIndiaMorocco/DailyTimeRecordIndiaMorocco.js (7 fns / 5 br)
//   src/container/DailyTimeRecordPuncher/DailyTimeRecordPuncher.js      (6 fns / 4 br)
//   src/container/DailyTimeRecord/DailyTimeRecord.js                    (0 fns / 3 br)
//
// MENU PATHS
//   DTR -> Multi Clock in            (route: dtr_punch_history)
//   DTR (India / Morocco)            (route: dtr_in_mar + ':id')
//   DTR -> Punch list                (route: dtr_punchlist + ':id')
//   DTR (Philippines)                (route: dtr + ':id')
//
// WHY THESE WERE UNCOVERED
//   Two separate gaps. (a) Every existing DTR suite mocks connect() to an identity
//   passthrough, so all four containers' mapStateToProps/mapDispatchToProps closures and
//   the six-or-seven dispatch-prop arrows inside them never execute — that is the whole
//   of the "7 fns" figure for DtrPunch and the bulk of the other two. (b) The three
//   cascading-filter screens share a handler triple (year -> month -> payroll cutoff)
//   whose *invalid selection* arm was never driven; the existing suites only ever hand
//   the handlers a real option object.
//
// ADD-ONLY: sits alongside evoxtest_DailyTimeRecordPuncherDeep2,
// evoxtest_DailyTimeRecordIndiaMoroccoDeep2 and evoxtest_DailyTimeRecordDeep_frontend,
// which cover the happy-path cascade and the render arms.
//
// FINDINGS
//   DTRP-DEAD-1  DtrPunch.render() builds yearOptions / monthOptions /
//                payrollCutoffOptions from this.props.dtr.filter and this.state
//                .selectedYear/.selectedMonth, but the screen renders no Select at all
//                (only MultiQuickpunch + RecentPunch) and the component defines no
//                handleSelect* setters, so selectedYear and selectedMonth can never leave
//                their initial {}. The nested `Validator.isValid(selectedYear?.value)` /
//                `selectedMonth?.value` true-arms (DtrPunch.js:92 and :105) and every
//                option array are unreachable in production. Characterized below.
//   DTRP-DEAD-2  DtrPunch.componentWillMount and componentWillReceiveProps are both
//                entirely commented out — the body is empty. Characterized below.

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  // Identity connect that also hands both map functions back, so the wiring closures can
  // be exercised while the components still render as plain classes.
  connect: (mapStateToProps, mapDispatchToProps) => (Component) => {
    Component.__mapStateToProps = mapStateToProps;
    Component.__mapDispatchToProps = mapDispatchToProps;
    return Component;
  },
}));
jest.mock('../../components/GridComponent/AdminLte.js', () => ({
  ContainerHeader: ({ children }) => <div>{children}</div>,
  Content: ({ children }) => <div>{children}</div>,
  ContainerWrapper: ({ children }) => <div>{children}</div>,
  ContainerBody: ({ children }) => <div>{children}</div>,
  Row: ({ children }) => <div>{children}</div>,
  Col: ({ children }) => <div>{children}</div>,
}));
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/Template/BackButton', () => () => <div />);
jest.mock('../../components/RequestComponent/RequestButtons/RequestSubtitle', () => () => <div />);
jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading" />);
jest.mock('react-select', () => () => <select data-testid="react-select" />);
jest.mock('../../components/Dashboard/PunchComponents/MultiQuickpunch', () => () => (
  <div data-testid="multi-quickpunch" />
));
jest.mock('../../components/Dashboard/PunchComponents/RecentPunch', () => () => (
  <div data-testid="recent-punch" />
));
jest.mock('../../services/DtrFormatter', () => ({
  displaySchedule: jest.fn(() => 'sched'), displayLog: jest.fn(() => 'log'),
  displayDate: jest.fn(() => 'date'), displayHoliday: jest.fn(() => null),
  displayTotalHours: jest.fn(() => '8'),
}));
jest.mock('../../services/Authenticator', () => ({
  scanLevel: jest.fn(() => true), scanFeature: jest.fn(() => true), check: jest.fn(() => true),
}));
// Stubbed so each dispatch prop can be checked for the exact action it hands to dispatch.
jest.mock('../../store/actions/dtr/dtrActions', () => ({
  viewEmployeeDtr: (...a) => ({ type: 'STUB_VIEW_EMPLOYEE_DTR', a }),
  viewEmployeePunch: (...a) => ({ type: 'STUB_VIEW_EMPLOYEE_PUNCH', a }),
  getUserDtrSummary: (...a) => ({ type: 'STUB_GET_USER_DTR_SUMMARY', a }),
  getFilterForDtr: (...a) => ({ type: 'STUB_GET_FILTER_FOR_DTR', a }),
  setSelectedPayrollCutoff: (...a) => ({ type: 'STUB_SET_SELECTED_CUTOFF', a }),
}), { virtual: true });
jest.mock('../../store/actions/userActions', () => ({
  fetchUser: (...a) => ({ type: 'STUB_FETCH_USER', a }),
}));
jest.mock('../../store/actions/redirectActions', () => ({
  setRedirect: (...a) => ({ type: 'STUB_SET_REDIRECT', a }),
}));
// DEAD IMPORT in DailyTimeRecordPuncher: `import { s } from '@fullcalendar/core/internal-common'`
// (`s` is never used) — ESM that Jest cannot parse; stubbed so the module loads.
jest.mock('@fullcalendar/core/internal-common', () => ({ s: {} }), { virtual: true });

global.links = new Proxy({}, { get: (t, k) => `/link/${String(k)}/` });

const DtrPunch = require('../../container/DtrPunch/DtrPunch').default;
const DailyTimeRecord = require('../../container/DailyTimeRecord/DailyTimeRecord').default;
const DailyTimeRecordIndiaMorocco =
  require('../../container/DailyTimeRecordIndiaMorocco/DailyTimeRecordIndiaMorocco').default;
const DailyTimeRecordPuncher =
  require('../../container/DailyTimeRecordPuncher/DailyTimeRecordPuncher').default;

const cutoff = {
  id: 9, name: 'JUL 16 - AUG 15', year: 2026, month: 7, month_label: 'July',
  start_date: '2026-07-16', end_date: '2026-08-15',
};

function makeActions() {
  return {
    viewEmployeeDtr: jest.fn(() => Promise.resolve()),
    viewEmployeePunch: jest.fn(() => Promise.resolve()),
    getUserDtrSummary: jest.fn(() => Promise.resolve()),
    getFilterForDtr: jest.fn(),
    setSelectedPayrollCutoff: jest.fn(() => Promise.resolve()),
    fetchUser: jest.fn(),
    setRedirect: jest.fn(),
  };
}

const baseProps = {
  user: { id: 42 },
  params: { id: '42' },
  location: {},
  settings: { current_payroll_cutoff: cutoff, current_payroll_cutoff_ph: cutoff },
  dtr: {
    filter: { 2026: { 7: { label: 'July', data: { 9: cutoff } } } },
    selectedPayrollCutoff: {},
    list: [], dtr_list: [], punch_list: [], dtr_summary: {},
    isFilterLoaded: true, isDtrLoaded: false,
    employeeInfo: { timezone: 'Asia/Manila' },
  },
};

function mount(Component, props = {}) {
  const ref = React.createRef();
  const actions = makeActions();
  const utils = render(
    <MemoryRouter>
      <Component ref={ref} {...baseProps} {...actions} {...props} />
    </MemoryRouter>
  );
  return { ...utils, ref, actions };
}

const state = {
  dtr: { filter: { 2026: {} }, selectedPayrollCutoff: { id: 9 }, list: [] },
  settings: { current_payroll_cutoff: cutoff },
  user: { id: 42 },
};

let dispatch;
beforeEach(() => {
  jest.clearAllMocks();
  dispatch = jest.fn();
});

describe('DTR containers — which store slices reach the screen', () => {
  test('all three punch/DTR containers map exactly the dtr and settings slices — never the user', () => {
    [DtrPunch, DailyTimeRecordIndiaMorocco, DailyTimeRecordPuncher].forEach((Container) => {
      const props = Container.__mapStateToProps(state);
      expect(props).toEqual({ dtr: state.dtr, settings: state.settings });
      // The screens read this.props.user.id in render, so the user has to arrive as a
      // JSX prop from the route — the mapping deliberately does not supply it.
      expect(props.user).toBeUndefined();
    });
  });
});

describe('DtrPunch — Multi Clock in wiring', () => {
  test('every dispatch prop forwards its arguments to the matching dtr action', () => {
    const props = DtrPunch.__mapDispatchToProps(dispatch);

    props.fetchUser();
    props.viewEmployeeDtr(42, '2026-07-16', '2026-08-15');
    props.getUserDtrSummary(42, '2026-07-16', '2026-08-15', true);
    props.getFilterForDtr(42);
    props.setSelectedPayrollCutoff(cutoff);
    props.setRedirect('/app/Dtr/42');

    expect(dispatch.mock.calls.map((c) => c[0])).toEqual([
      { type: 'STUB_FETCH_USER', a: [] },
      { type: 'STUB_VIEW_EMPLOYEE_DTR', a: [42, '2026-07-16', '2026-08-15'] },
      { type: 'STUB_GET_USER_DTR_SUMMARY', a: [42, '2026-07-16', '2026-08-15', true] },
      { type: 'STUB_GET_FILTER_FOR_DTR', a: [42] },
      { type: 'STUB_SET_SELECTED_CUTOFF', a: [cutoff] },
      { type: 'STUB_SET_REDIRECT', a: ['/app/Dtr/42'] },
    ]);
  });

  test('the screen renders the multi-punch widget and the recent punch list', () => {
    const { getByTestId } = mount(DtrPunch);

    expect(getByTestId('multi-quickpunch')).toBeInTheDocument();
    expect(getByTestId('recent-punch')).toBeInTheDocument();
  });

  // FINDING DTRP-DEAD-1 / DTRP-DEAD-2: DtrPunch keeps the whole year/month/cutoff filter
  // apparatus of its sibling DTR screens — the option arrays, the nested isValid guards,
  // and the initial selection state — but renders no Select and defines no setter, and
  // both lifecycle hooks have had their bodies commented out. Nothing on this screen can
  // ever move selectedYear/selectedMonth off {} or trigger a filter fetch. Asserting
  // today's behaviour; when the filters are wired up this test fails and should be
  // replaced by real cascade assertions.
  test('_FINDING_DTRP-DEAD-1 no filter select is rendered and the selection state can never change', () => {
    const { container, ref } = mount(DtrPunch);

    expect(container.querySelectorAll('[data-testid="react-select"]').length).toBe(0);
    expect(ref.current.handleSelectYear).toBeUndefined();
    expect(ref.current.handleSelectMonth).toBeUndefined();
    expect(ref.current.handleSelectPayrollCutoff).toBeUndefined();
    expect(ref.current.state.selectedYear).toEqual({});
    expect(ref.current.state.selectedMonth).toEqual({});
    expect(ref.current.state.selectedPayrollCutoff).toEqual({});
  });

  test('_FINDING_DTRP-DEAD-2 mounting fetches nothing — componentWillMount has been emptied', () => {
    const { actions } = mount(DtrPunch);

    expect(actions.getFilterForDtr).not.toHaveBeenCalled();
    expect(actions.viewEmployeeDtr).not.toHaveBeenCalled();
    expect(actions.getUserDtrSummary).not.toHaveBeenCalled();
  });
});

describe('DailyTimeRecordIndiaMorocco — wiring', () => {
  test('its dispatch props cover the DTR view flow but deliberately omit the punch list', () => {
    const props = DailyTimeRecordIndiaMorocco.__mapDispatchToProps(dispatch);

    expect(Object.keys(props).sort()).toEqual([
      'fetchUser', 'getFilterForDtr', 'setRedirect', 'setSelectedPayrollCutoff', 'viewEmployeeDtr',
    ]);
    expect(props.viewEmployeePunch).toBeUndefined();
    expect(props.getUserDtrSummary).toBeUndefined(); // commented out in the source
  });

  test('each dispatch prop forwards its arguments to the matching action', () => {
    const props = DailyTimeRecordIndiaMorocco.__mapDispatchToProps(dispatch);

    props.fetchUser();
    props.viewEmployeeDtr(42, '2026-07-16', '2026-08-15');
    props.getFilterForDtr(42);
    props.setSelectedPayrollCutoff(cutoff);
    props.setRedirect('/app/DtrInMar/42');

    expect(dispatch.mock.calls.map((c) => c[0])).toEqual([
      { type: 'STUB_FETCH_USER', a: [] },
      { type: 'STUB_VIEW_EMPLOYEE_DTR', a: [42, '2026-07-16', '2026-08-15'] },
      { type: 'STUB_GET_FILTER_FOR_DTR', a: [42] },
      { type: 'STUB_SET_SELECTED_CUTOFF', a: [cutoff] },
      { type: 'STUB_SET_REDIRECT', a: ['/app/DtrInMar/42'] },
    ]);
  });
});

describe('DailyTimeRecordPuncher — wiring', () => {
  test('it is the only one of the three that wires viewEmployeePunch', () => {
    const props = DailyTimeRecordPuncher.__mapDispatchToProps(dispatch);

    expect(Object.keys(props).sort()).toEqual([
      'fetchUser', 'getFilterForDtr', 'getUserDtrSummary', 'setRedirect',
      'setSelectedPayrollCutoff', 'viewEmployeeDtr', 'viewEmployeePunch',
    ]);
  });

  test('each dispatch prop forwards its arguments to the matching action', () => {
    const props = DailyTimeRecordPuncher.__mapDispatchToProps(dispatch);

    props.fetchUser();
    props.viewEmployeeDtr(42, '2026-07-16', '2026-08-15');
    props.viewEmployeePunch(42, '2026-07-16', '2026-08-15');
    props.getUserDtrSummary(42, '2026-07-16', '2026-08-15', false);
    props.getFilterForDtr(42);
    props.setSelectedPayrollCutoff(cutoff);
    props.setRedirect('/app/DtrPunchList/42');

    expect(dispatch.mock.calls.map((c) => c[0])).toEqual([
      { type: 'STUB_FETCH_USER', a: [] },
      { type: 'STUB_VIEW_EMPLOYEE_DTR', a: [42, '2026-07-16', '2026-08-15'] },
      { type: 'STUB_VIEW_EMPLOYEE_PUNCH', a: [42, '2026-07-16', '2026-08-15'] },
      { type: 'STUB_GET_USER_DTR_SUMMARY', a: [42, '2026-07-16', '2026-08-15', false] },
      { type: 'STUB_GET_FILTER_FOR_DTR', a: [42] },
      { type: 'STUB_SET_SELECTED_CUTOFF', a: [cutoff] },
      { type: 'STUB_SET_REDIRECT', a: ['/app/DtrPunchList/42'] },
    ]);
  });
});

// The three cascading-filter screens share the same handler triple. The existing suites
// only feed them a real option object; these drive the other arm of each guard — the
// selection the handler judges invalid — which must blank the field rather than store it,
// and must still clear everything downstream of it.
describe.each([
  ['DailyTimeRecord (Philippines)', () => DailyTimeRecord],
  ['DailyTimeRecordIndiaMorocco', () => DailyTimeRecordIndiaMorocco],
  ['DailyTimeRecordPuncher', () => DailyTimeRecordPuncher],
])('%s — invalid filter selections', (name, get) => {
  test('an invalid month selection is stored as null and still clears the payroll cutoff', () => {
    const { ref } = mount(get());
    ref.current.setState({
      selectedYear: { label: '2026', value: 2026 },
      selectedMonth: { label: 'July', value: 7 },
      selectedPayrollCutoff: { label: 'JUL 16 - AUG 15', value: 9 },
    });

    ref.current.handleSelectMonth(null);

    expect(ref.current.state.selectedMonth).toBeNull();
    expect(ref.current.state.selectedPayrollCutoff).toEqual({});
    expect(ref.current.state.selectedYear).toEqual({ label: '2026', value: 2026 });
  });

  test('an invalid year selection is stored as null and clears both the month and the cutoff', () => {
    const { ref } = mount(get());
    ref.current.setState({
      selectedYear: { label: '2026', value: 2026 },
      selectedMonth: { label: 'July', value: 7 },
      selectedPayrollCutoff: { label: 'JUL 16 - AUG 15', value: 9 },
    });

    ref.current.handleSelectYear(null);

    expect(ref.current.state.selectedYear).toBeNull();
    expect(ref.current.state.selectedMonth).toEqual({});
    expect(ref.current.state.selectedPayrollCutoff).toEqual({});
  });

  test('an invalid cutoff selection is stored as null and fetches nothing', () => {
    const { ref, actions } = mount(get());
    ref.current.setState({
      selectedYear: { label: '2026', value: 2026 },
      selectedMonth: { label: 'July', value: 7 },
    });
    jest.clearAllMocks();

    ref.current.handleSelectPayrollCutoff(null);

    expect(ref.current.state.selectedPayrollCutoff).toBeNull();
    expect(actions.viewEmployeeDtr).not.toHaveBeenCalled();
    expect(actions.viewEmployeePunch).not.toHaveBeenCalled();
    expect(actions.setSelectedPayrollCutoff).not.toHaveBeenCalled();
  });

  test('a cutoff chosen before a year has been picked fetches nothing', () => {
    const { ref, actions } = mount(get());
    ref.current.setState({ selectedYear: null, selectedMonth: null });
    jest.clearAllMocks();

    ref.current.handleSelectPayrollCutoff({ label: 'JUL 16 - AUG 15', value: 9 });

    expect(ref.current.state.selectedPayrollCutoff).toEqual({ label: 'JUL 16 - AUG 15', value: 9 });
    expect(actions.viewEmployeeDtr).not.toHaveBeenCalled();
    expect(actions.viewEmployeePunch).not.toHaveBeenCalled();
    expect(actions.setSelectedPayrollCutoff).not.toHaveBeenCalled();
  });
});
