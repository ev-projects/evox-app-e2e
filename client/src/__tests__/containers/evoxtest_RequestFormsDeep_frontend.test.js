// evoxtest_RequestFormsDeep_frontend.test.js
// RestDayWork.js and Overtime.js still show a large statement/branch coverage gap vs
// Jul 10 even after connect-wiring recovery, because neither onSubmitHandler nor
// checkRequestValidity nor the onApproval JSX branches are exercised by the existing
// dedicated test suites. Rather than fighting Formik + mocked date/time pickers through
// full DOM form-fill-and-submit (fragile, since InputDate/InputTime are stubbed), this
// gets a ref to the raw class instance (connect mocked as identity, same pattern as the
// existing *.test.js files for these components) and calls the handler methods directly
// — a standard white-box technique for class-component business logic.

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  connect: () => (Component) => Component,
}));
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
  InputDate: ({ name }) => <input name={name} type="date" />,
  InputTime: ({ name }) => <input name={name} type="time" />,
  InputDateTime: ({ name }) => <input name={name} type="datetime-local" />,
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
jest.mock('../../services/API', () => ({ call: jest.fn() }));

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import API from '../../services/API';
import RestDayWork from '../../container/Request/RestDayWork/RestDayWork';
import Overtime from '../../container/Request/Overtime/Overtime';

const baseSettings = { current_payroll_cutoff: { start_date: '2026-03-01', end_date: '2026-03-31' } };
const baseUser = { id: 1, full_name: 'Test Employee', pov_timezone: 'Asia/Manila' };

function renderWithRef(Component, props) {
  const ref = React.createRef();
  render(
    <MemoryRouter>
      <Component ref={ref} {...props} />
    </MemoryRouter>
  );
  return ref;
}

beforeEach(() => {
  jest.clearAllMocks();
  window.confirm = jest.fn(() => true);
  window.alert = jest.fn();
  localStorage.setItem('session_id', 'test-session');
});

describe('RestDayWork — approval mode render + handler branches', () => {
  const defaultProps = {
    fetchRestDayWork: jest.fn(),
    addRestDayWork: jest.fn(),
    updateRestDayWork: jest.fn(),
    updateRestDayWorkStatus: jest.fn(),
    resetRestDayWorkInstance: jest.fn(),
    clearRestDayWorkInstance: jest.fn(),
    setRedirect: jest.fn(),
    dispatch: jest.fn(),
    user: baseUser,
    instance: {},
    isInstanceLoaded: false,
    settings: baseSettings,
    constant: {},
    history: { push: jest.fn() },
    match: { params: {} },
    params: {},
    location: { search: '' },
  };

  test('renders in approval mode (is_under_supervisee) showing both perspective timezone sections', () => {
    const { container } = render(
      <MemoryRouter>
        <RestDayWork {...defaultProps}
          params={{ id: '42' }}
          isInstanceLoaded={true}
          instance={{
            id: 42, user_id: 2, date: '2026-03-10',
            start_time: '08:00', end_time: '17:00', break_time: '01:00',
            pov_start_time: '08:00', pov_end_time: '17:00', pov_timezone: 'Manila',
            employee_note: 'note', approver_note: '', is_under_supervisee: true,
          }}
        />
      </MemoryRouter>
    );
    expect(container.textContent).toMatch(/Supervisor Perspective Timezone/);
    expect(container.textContent).toMatch(/Employee Perspective Timezone/);
    expect(container.textContent).toMatch(/Employee's Note/);
  });

  test('checkRequestValidity: valid regular-period result', async () => {
    API.call.mockResolvedValueOnce({ status: 200, data: { content: { Result: '1', StartDate: '2026-03-01', EndDate: '2026-03-31' } } });
    const ref = renderWithRef(RestDayWork, defaultProps);
    const result = await ref.current.checkRequestValidity('2026-03-10');
    expect(result.Result).toBe('1');
  });

  test('checkRequestValidity: dispute-period result', async () => {
    API.call.mockResolvedValueOnce({ status: 200, data: { content: { Result: '2' } } });
    const ref = renderWithRef(RestDayWork, defaultProps);
    const result = await ref.current.checkRequestValidity('2026-01-01');
    expect(result.Result).toBe('2');
  });

  test('checkRequestValidity: not-allowed result (Result 0)', async () => {
    API.call.mockResolvedValueOnce({ status: 200, data: { content: { Result: '0' } } });
    const ref = renderWithRef(RestDayWork, defaultProps);
    const result = await ref.current.checkRequestValidity('2026-03-10');
    expect(result.Result).toBe('0');
  });

  test('checkRequestValidity: API rejection dispatches an alert and rethrows', async () => {
    API.call.mockRejectedValueOnce({ status: 500, message: 'boom' });
    const ref = renderWithRef(RestDayWork, defaultProps);
    await expect(ref.current.checkRequestValidity('2026-03-10')).rejects.toBeDefined();
    expect(defaultProps.dispatch).toHaveBeenCalled();
  });

  test('onSubmitHandler: store mode, regular period, confirmed -> addRestDayWork called', async () => {
    API.call.mockResolvedValueOnce({ status: 200, data: { content: { Result: '1', StartDate: '2026-03-01', EndDate: '2026-03-31' } } });
    const ref = renderWithRef(RestDayWork, defaultProps);
    await ref.current.onSubmitHandler({
      action: null, method: 'store', id: null,
      date: new Date('2026-03-10'), start_time: new Date('2026-03-10T08:00:00'),
      end_time: new Date('2026-03-10T17:00:00'), break_time: new Date('2026-03-10T01:00:00'),
      employee_note: 'note',
    });
    expect(defaultProps.addRestDayWork).toHaveBeenCalled();
  });

  test('onSubmitHandler: update mode, confirmed -> updateRestDayWork called', async () => {
    API.call.mockResolvedValueOnce({ status: 200, data: { content: { Result: '1', StartDate: '2026-03-01', EndDate: '2026-03-31' } } });
    const ref = renderWithRef(RestDayWork, defaultProps);
    await ref.current.onSubmitHandler({
      action: null, method: 'update', id: 42,
      date: new Date('2026-03-10'), start_time: new Date('2026-03-10T08:00:00'),
      end_time: new Date('2026-03-10T17:00:00'), break_time: new Date('2026-03-10T01:00:00'),
      employee_note: 'note',
    });
    expect(defaultProps.updateRestDayWork).toHaveBeenCalledWith(42, expect.anything());
  });

  test('onSubmitHandler: not-allowed period shows alert and does not submit', async () => {
    API.call.mockResolvedValueOnce({ status: 200, data: { content: { Result: '0' } } });
    const ref = renderWithRef(RestDayWork, defaultProps);
    await ref.current.onSubmitHandler({
      action: null, method: 'store', id: null,
      date: new Date('2026-03-10'), start_time: new Date('2026-03-10T08:00:00'),
      end_time: new Date('2026-03-10T17:00:00'), break_time: new Date('2026-03-10T01:00:00'),
    });
    expect(window.alert).toHaveBeenCalled();
    expect(defaultProps.addRestDayWork).not.toHaveBeenCalled();
  });

  test('onSubmitHandler: user declines the confirm dialog -> no submit', async () => {
    window.confirm = jest.fn(() => false);
    API.call.mockResolvedValueOnce({ status: 200, data: { content: { Result: '1', StartDate: '2026-03-01', EndDate: '2026-03-31' } } });
    const ref = renderWithRef(RestDayWork, defaultProps);
    await ref.current.onSubmitHandler({
      action: null, method: 'store', id: null,
      date: new Date('2026-03-10'), start_time: new Date('2026-03-10T08:00:00'),
      end_time: new Date('2026-03-10T17:00:00'), break_time: new Date('2026-03-10T01:00:00'),
    });
    expect(defaultProps.addRestDayWork).not.toHaveBeenCalled();
  });

  test.each(['approve', 'decline', 'cancel'])('onSubmitHandler: %s action calls updateRestDayWorkStatus', async (action) => {
    const ref = renderWithRef(RestDayWork, defaultProps);
    await ref.current.onSubmitHandler({ action, id: 42 });
    expect(defaultProps.updateRestDayWorkStatus).toHaveBeenCalledWith(
      42, expect.anything(), action, baseUser.id, '2026-03-01', '2026-03-31'
    );
  });
});

describe('Overtime — approval mode render + handler branches', () => {
  const defaultProps = {
    fetchOvertime: jest.fn(), addOvertime: jest.fn(), updateOvertime: jest.fn(),
    updateOvertimeStatus: jest.fn(), clearOvertimeInstance: jest.fn(), resetOvertimeInstance: jest.fn(),
    dispatch: jest.fn(), history: { push: jest.fn() }, match: { params: {} }, params: {},
    location: { search: '' }, user: baseUser, instance: {}, isInstanceLoaded: false,
    constant: { OVERTIME_TYPE: { pre_overtime: 'pre_overtime', post_overtime: 'post_overtime' } },
    settings: baseSettings,
  };

  test('checkRequestValidity: valid regular-period result', async () => {
    API.call.mockResolvedValueOnce({ status: 200, data: { content: { Result: '1', StartDate: '2026-03-01', EndDate: '2026-03-31' } } });
    const ref = renderWithRef(Overtime, defaultProps);
    const result = await ref.current.checkRequestValidity('2026-03-10');
    expect(result.Result).toBe('1');
  });

  test('onSubmitHandler: store mode, confirmed -> addOvertime called', async () => {
    API.call.mockResolvedValueOnce({ status: 200, data: { content: { Result: '1', StartDate: '2026-03-01', EndDate: '2026-03-31' } } });
    const ref = renderWithRef(Overtime, defaultProps);
    await ref.current.onSubmitHandler({
      action: null, method: 'store', id: null, type: 'pre_overtime',
      date: new Date('2026-03-10'), amount: new Date('2026-03-10T01:30:00'),
      employee_note: 'ot note',
    });
    expect(defaultProps.addOvertime).toHaveBeenCalled();
  });

  test.each(['approve', 'decline', 'cancel'])('onSubmitHandler: %s action calls updateOvertimeStatus', async (action) => {
    const ref = renderWithRef(Overtime, defaultProps);
    await ref.current.onSubmitHandler({ action, id: 7 });
    expect(defaultProps.updateOvertimeStatus).toHaveBeenCalled();
  });
});
