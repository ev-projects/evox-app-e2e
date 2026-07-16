// evoxtest_ChangeScheduleDeep_frontend.test.js
// Same ref-based direct-handler-call pattern as the other evoxtest_*Deep files, targeting
// ChangeSchedule.js's onSubmitHandler (store/update/approve/decline/cancel branches) which
// none of the existing dedicated tests exercise.

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  connect: () => (Component) => Component,
}));
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
  InputDate: ({ name }) => <input name={name} type="date" />,
  InputTime: ({ name }) => <input name={name} type="time" />,
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
jest.mock('../../components/RequestComponent/RequestButtons/RequestButtons', () => () => <div />);
jest.mock('../../components/RequestComponent/RequestButtons/RequestSubtitle', () => () => <div />);
jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading" />);

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ChangeSchedule from '../../container/Request/ChangeSchedule/ChangeSchedule';

function renderWithRef(props) {
  const ref = React.createRef();
  render(
    <MemoryRouter>
      <ChangeSchedule ref={ref} {...props} />
    </MemoryRouter>
  );
  return ref;
}

const baseSettings = { current_payroll_cutoff: { start_date: '2026-03-01', end_date: '2026-03-31' } };
const baseUser = { id: 1, full_name: 'Test Employee', user_offset_seconds: 0 };

const defaultProps = {
  fetchChangeSchedule: jest.fn(),
  addChangeSchedule: jest.fn(),
  updateChangeSchedule: jest.fn(),
  updateChangeScheduleStatus: jest.fn(),
  resetChangeScheduleInstance: jest.fn(),
  clearChangeScheduleInstance: jest.fn(),
  setRedirect: jest.fn(),
  dispatch: jest.fn(),
  user: baseUser,
  instance: {},
  isInstanceLoaded: false,
  constant: {
    SCHEDULE_TYPE: { STANDARD: 'standard', FLEXIBLE: 'flexible', CUSTOMIZE: 'customize' },
    SCHEDULE_POLICIES: [],
    SCHEDULE_HOLIDAY_POLICIES: [],
  },
  settings: baseSettings,
  history: { push: jest.fn() },
  match: { params: {} },
  params: {},
  location: { search: '' },
};

// A standard (non-customize) schedule sidesteps the cst_schedule_details night-diff/
// before-flex alert loop entirely, so schedule_policies.allow_night_diff just needs to be
// non-zero for the (!nsdAlertCall || ...) submit gate to pass.
const standardValues = (overrides = {}) => ({
  action: null, method: 'store', id: null,
  schedule_type: 'standard',
  std_schedule_details: [{
    start_time: new Date('2026-03-10T08:00:00'),
    end_time: new Date('2026-03-10T17:00:00'),
    break_time: new Date('2026-03-10T01:00:00'),
  }],
  schedule_policies: { allow_night_diff: 1, allow_undertime: 0, allow_late: 0 },
  valid_from: new Date('2026-03-10'),
  valid_to: new Date('2026-03-10'),
  work_days: ['monday'],
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  window.confirm = jest.fn(() => true);
  localStorage.setItem('session_id', 'test-session');
});

describe('ChangeSchedule — handler branches', () => {
  test('onSubmitHandler: store mode, confirmed -> addChangeSchedule called', () => {
    const ref = renderWithRef(defaultProps);
    ref.current.onSubmitHandler(standardValues());
    expect(defaultProps.addChangeSchedule).toHaveBeenCalled();
  });

  test('onSubmitHandler: update mode, confirmed -> updateChangeSchedule called', () => {
    const ref = renderWithRef(defaultProps);
    ref.current.onSubmitHandler(standardValues({ method: 'update', id: 9 }));
    expect(defaultProps.updateChangeSchedule).toHaveBeenCalledWith(9, expect.anything());
  });

  test('onSubmitHandler: user declines confirm -> no submit', () => {
    window.confirm = jest.fn(() => false);
    const ref = renderWithRef(defaultProps);
    ref.current.onSubmitHandler(standardValues());
    expect(defaultProps.addChangeSchedule).not.toHaveBeenCalled();
  });

  test.each(['approve', 'decline', 'cancel'])('onSubmitHandler: %s action calls updateChangeScheduleStatus', (action) => {
    const ref = renderWithRef(defaultProps);
    ref.current.onSubmitHandler(standardValues({ action, id: 9 }));
    expect(defaultProps.updateChangeScheduleStatus).toHaveBeenCalledWith(
      9, expect.anything(), action, baseUser.id, '2026-03-01', '2026-03-31'
    );
  });

  test('renders in approval mode (is_under_supervisee)', () => {
    const { container } = render(
      <MemoryRouter>
        <ChangeSchedule {...defaultProps}
          params={{ id: '9' }}
          isInstanceLoaded={true}
          instance={{
            id: 9, user_id: 2, schedule_type: 'standard',
            is_under_supervisee: true, status: 'pending',
            schedule_details: { all: { start_time: '08:00', end_time: '17:00', break_time: '01:00' } },
          }}
        />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });
});
