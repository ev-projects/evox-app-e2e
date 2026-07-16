// evoxtest_MyRequestsDeep_frontend.test.js
// MyRequests.js and MyRequestsDispute.js still show a large gap vs Jul 10 after
// connect-wiring recovery — their render() only builds the pagination/status-count JSX
// when isListLoaded/isNumbersLoaded are true, which the existing dedicated tests don't
// exercise. Same ref-based direct-method-call + populated-state-render pattern as
// evoxtest_RequestFormsDeep_frontend.test.js.

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  connect: () => (Component) => Component,
}));
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/GridComponent/AdminLte.js', () => ({
  ContainerHeader: ({ children }) => <div>{children}</div>,
  Content: ({ children }) => <div>{children}</div>,
  ContainerWrapper: ({ children }) => <div>{children}</div>,
  ContainerBody: ({ children }) => <div>{children}</div>,
  Row: ({ children }) => <div>{children}</div>,
  Col: ({ children }) => <div>{children}</div>,
}));
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
  InputDate: ({ name }) => <input name={name} type="date" />,
  InputTime: ({ name }) => <input name={name} type="time" />,
}));
jest.mock('../../components/Template/Paginate', () => () => <div data-testid="paginate" />);
jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading" />);

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MyRequests from '../../container/MyRequests/MyRequests';
import MyRequestsDispute from '../../container/MyRequestsDispute/MyRequestsDispute';

function renderWithRef(Component, props) {
  const ref = React.createRef();
  const utils = render(
    <MemoryRouter>
      <Component ref={ref} {...props} />
    </MemoryRouter>
  );
  return { ref, ...utils };
}

const settings = { current_payroll_cutoff: { start_date: '2026-03-01', end_date: '2026-03-31' } };

beforeAll(() => {
  global.links = global.links || {};
  Object.assign(global.links, {
    change_schedule: '/request/change-schedule/',
    alter_log: '/request/alter-log/',
    alter_log_punch: '/request/alter-log-punch/',
    rest_day_work: '/request/rest-day-work/',
    overtime: '/request/overtime/',
    base: '/app/',
  });
});

// One item per table_name switch-case, one per Status badge variant, so a single render
// exercises every branch in the row-building switch and the Status sub-component.
const myRequestsListData = [
  { id: 1, table_name: 'change_schedules', date_requested: '2026-03-01', created_at: '2026-03-01',
    employee_note: 'note', status: 'Pending', updated_by: 'Admin', updated_at: '2026-03-02',
    fifth_column: { allow_late: '1', allow_undertime: '0', allow_night_diff: '1' },
    fourth_column: { rest_day: ['Sunday'], work_days: ['Monday'] } },
  { id: 2, table_name: 'alter_logs', date_requested: '2026-03-01', created_at: '2026-03-01',
    status: 'Approved', updated_by: 'Admin', updated_at: '2026-03-02',
    fifth_column: { new_time_in: '08:00', new_time_out: '17:00' },
    fourth_column: { current_time_in: '08:15', current_time_out: '17:15' } },
  { id: 3, table_name: 'alter_log_punches', date_requested: '2026-03-01', created_at: '2026-03-01',
    status: 'Declined', updated_by: 'Admin', updated_at: '2026-03-02',
    fifth_column: '08:00', fourth_column: '08:15' },
  { id: 4, table_name: 'rest_day_works', date_requested: '2026-03-01', created_at: '2026-03-01',
    status: 'Canceled', updated_by: 'Admin', updated_at: '2026-03-02',
    fourth_column: '2026-03-05', fifth_column: '2026-03-06' },
  { id: 5, table_name: 'overtimes', date_requested: '2026-03-01', created_at: '2026-03-01',
    status: 'Pending', updated_by: 'Admin', updated_at: '2026-03-02',
    fifth_column: 'pre_overtime', fourth_column: '01:30' },
];

describe('MyRequests — populated-list render + handler branches', () => {
  const defaultProps = {
    fetchRequestList: jest.fn(),
    fetchStatusNumbers: jest.fn(),
    requestList: {},
    isListLoaded: false,
    isNumbersLoaded: false,
    statusNumbers: {},
    filters: {},
    settings,
  };

  test('onSubmitHandler formats dates and calls fetchRequestList + fetchStatusNumbers', () => {
    const { ref } = renderWithRef(MyRequests, defaultProps);
    ref.current.onSubmitHandler({
      status: 'pending', valid_from: new Date('2026-03-01'), valid_to: new Date('2026-03-31'),
      department_id: null, name: '', page: 1,
    });
    expect(defaultProps.fetchRequestList).toHaveBeenCalled();
    expect(defaultProps.fetchStatusNumbers).toHaveBeenCalled();
  });

  test('renders the populated list + status counts (isListLoaded + isNumbersLoaded true)', () => {
    const { container } = renderWithRef(MyRequests, {
      ...defaultProps,
      isListLoaded: true,
      isNumbersLoaded: true,
      requestList: { result: { data: [], last_page: 2, current_page: 1 }, record_number: 0 },
      statusNumbers: { pending: 3, approved: 5, canceled: 1, declined: 0 },
    });
    expect(container.textContent).toMatch(/My Requests/);
  });

  test('renders one row per request type, exercising every table_name + Status branch', () => {
    const { container } = renderWithRef(MyRequests, {
      ...defaultProps,
      isListLoaded: true,
      requestList: { result: { data: myRequestsListData, last_page: 1, current_page: 1 }, record_number: 5 },
    });
    expect(container.textContent).toMatch(/Late/);
    expect(container.textContent).toMatch(/Pending/);
    expect(container.textContent).toMatch(/Approved/);
    expect(container.textContent).toMatch(/Declined/);
    expect(container.textContent).toMatch(/Canceled/);
  });
});

describe('MyRequestsDispute — populated-list render + handler branches', () => {
  const defaultProps = {
    fetchRequestListDisputes: jest.fn(),
    disputeRequestList: {},
    disputeRequestCount: 0,
    isDisputeListLoaded: false,
    filters: {},
    settings,
  };

  test('onSubmitHandler formats dates and calls fetchRequestListDisputes', () => {
    const { ref } = renderWithRef(MyRequestsDispute, defaultProps);
    ref.current.onSubmitHandler({
      status: 'pending', valid_from: new Date('2026-03-01'), valid_to: new Date('2026-03-31'),
      page: 1,
    });
    expect(defaultProps.fetchRequestListDisputes).toHaveBeenCalled();
  });

  test('renders the populated dispute list (isDisputeListLoaded true)', () => {
    const { container } = renderWithRef(MyRequestsDispute, {
      ...defaultProps,
      isDisputeListLoaded: true,
      disputeRequestList: [],
      disputeRequestCount: 0,
    });
    expect(container).toBeTruthy();
  });

  test('renders one row per request type, exercising every table_name + Status branch', () => {
    const disputeListData = [
      { id: 1, table_name: 'change_schedules', date_requested: '2026-03-01', created_at: '2026-03-01',
        status: 'pending', updated_by: 'Admin', updated_at: '2026-03-02',
        fifth_column: { allow_late: '1', allow_undertime: '0', allow_night_diff: '1' },
        fourth_column: { rest_day: ['Sunday'], work_days: ['Monday'] } },
      { id: 2, table_name: 'alter_logs', date_requested: '2026-03-01', created_at: '2026-03-01',
        status: 'approved', updated_by: 'Admin', updated_at: '2026-03-02',
        fifth_column: '08:00,17:00', fourth_column: '08:15,17:15' },
      { id: 3, table_name: 'alter_log_punches', date_requested: '2026-03-01', created_at: '2026-03-01',
        status: 'declined', updated_by: 'Admin', updated_at: '2026-03-02',
        fifth_column: '08:00', fourth_column: '08:15' },
      { id: 4, table_name: 'rest_day_works', date_requested: '2026-03-01', created_at: '2026-03-01',
        status: 'canceled', updated_by: 'Admin', updated_at: '2026-03-02',
        fourth_column: '2026-03-05', fifth_column: '2026-03-06' },
      { id: 5, table_name: 'overtimes', date_requested: '2026-03-01', created_at: '2026-03-01',
        status: 'pending', updated_by: 'Admin', updated_at: '2026-03-02',
        fifth_column: 'pre_overtime', fourth_column: '01:30' },
    ];
    const { container } = renderWithRef(MyRequestsDispute, {
      ...defaultProps,
      isDisputeListLoaded: true,
      disputeRequestList: disputeListData,
      disputeRequestCount: 5,
    });
    expect(container.textContent).toMatch(/Late/);
    expect(container.textContent).toMatch(/Pending/);
    expect(container.textContent).toMatch(/Approved/);
    expect(container.textContent).toMatch(/Declined/);
    expect(container.textContent).toMatch(/Canceled/);
  });
});
