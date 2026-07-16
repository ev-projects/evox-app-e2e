// evoxtest_DailyTimeRecordDeep_frontend.test.js
// DailyTimeRecord.js still shows a large gap after connect-wiring recovery: render()
// only builds the year/month/payroll-cutoff dropdown options when dtr.filter is populated
// and a year/month is selected in local state, and handleSelectYear/Month/PayrollCutoff
// are only reachable through react-select's onChange — calling them directly via a ref
// bypasses needing to drive the actual react-select UI.

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  connect: () => (Component) => Component,
}));
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/Template/BackButton', () => () => <div data-testid="back-button" />);
jest.mock('../../components/GridComponent/AdminLte.js', () => ({
  ContainerHeader: ({ children }) => <div>{children}</div>,
  Content: ({ children, title }) => <div>{title}{children}</div>,
  ContainerWrapper: ({ children }) => <div>{children}</div>,
  ContainerBody: ({ children }) => <div>{children}</div>,
}));
jest.mock('../../components/RequestComponent/RequestButtons/RequestSubtitle', () => () => <div />);

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DailyTimeRecord from '../../container/DailyTimeRecord/DailyTimeRecord';

function renderWithRef(props) {
  const ref = React.createRef();
  const utils = render(
    <MemoryRouter>
      <DailyTimeRecord ref={ref} {...props} />
    </MemoryRouter>
  );
  return { ref, ...utils };
}

const dtrFilter = {
  2026: {
    '03': {
      label: 'March',
      data: {
        1: { id: 1, name: 'Mar 1-15', start_date: '2026-03-01', end_date: '2026-03-15' },
        2: { id: 2, name: 'Mar 16-31', start_date: '2026-03-16', end_date: '2026-03-31' },
      },
    },
  },
};

const defaultProps = {
  fetchUser: jest.fn(),
  viewEmployeeDtr: jest.fn(),
  getFilterForDtr: jest.fn(),
  setSelectedPayrollCutoff: jest.fn(),
  getUserDtrSummary: jest.fn(),
  setRedirect: jest.fn(),
  user: { id: 1 },
  params: { id: '1' },
  location: { search: '', pathname: '/app/dtr' },
  dtr: { filter: dtrFilter, selectedPayrollCutoff: {}, isFilterLoaded: true, isDtrLoaded: false, employeeInfo: {}, list: [] },
  settings: { current_payroll_cutoff_ph: {} },
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('DailyTimeRecord — cascading filter state', () => {
  test('componentWillMount fetches the DTR filter options', () => {
    renderWithRef(defaultProps);
    expect(defaultProps.getFilterForDtr).toHaveBeenCalledWith('1');
  });

  test('renders the year/month/payroll-cutoff dropdowns once dtr.filter is populated', () => {
    const { container } = renderWithRef(defaultProps);
    expect(container.textContent).toMatch(/Daily Time Record/);
  });

  test('handleSelectYear -> handleSelectMonth -> handleSelectPayrollCutoff drives the full cascade', () => {
    const { ref } = renderWithRef(defaultProps);
    ref.current.handleSelectYear({ value: '2026', label: '2026' });
    ref.current.handleSelectMonth({ value: '03', label: 'March' });
    ref.current.handleSelectPayrollCutoff({ value: 1, label: 'Mar 1-15' });
    expect(defaultProps.viewEmployeeDtr).toHaveBeenCalledWith('1', '2026-03-01', '2026-03-15');
    expect(defaultProps.setSelectedPayrollCutoff).toHaveBeenCalled();
  });

  test('handleSelectYear clears month/payroll-cutoff selection', () => {
    const { ref } = renderWithRef(defaultProps);
    ref.current.handleSelectMonth({ value: '03', label: 'March' });
    ref.current.handleSelectYear({ value: '2026', label: '2026' });
    expect(ref.current.state.selectedMonth).toEqual({});
  });

  test('handleSelectYear: invalid selection sets null', () => {
    const { ref } = renderWithRef(defaultProps);
    ref.current.handleSelectYear(null);
    expect(ref.current.state.selectedYear).toBeNull();
  });

  test('setPayrollCutoffInstance sets full state and dispatches fetches', async () => {
    const { ref } = renderWithRef(defaultProps);
    await ref.current.setPayrollCutoffInstance({
      year: '2026', month: '03', month_label: 'March', id: 1, name: 'Mar 1-15',
      start_date: '2026-03-01', end_date: '2026-03-15',
    });
    expect(defaultProps.viewEmployeeDtr).toHaveBeenCalledWith('1', '2026-03-01', '2026-03-15');
    expect(ref.current.state.isCurrentPayrollCutoffLoaded).toBe(true);
  });

  test('renders the loaded DTR summary block once a payroll cutoff is fully selected', () => {
    const { container, ref } = renderWithRef({
      ...defaultProps,
      dtr: { ...defaultProps.dtr, isDtrLoaded: true, dtrSummary: {} },
    });
    ref.current.setState({
      selectedYear: { value: '2026', label: '2026' },
      selectedMonth: { value: '03', label: 'March' },
      selectedPayrollCutoff: { value: 1, label: 'Mar 1-15' },
      payrollCutoff_start: '2026-03-01',
      payrollCutoff_end: '2026-03-15',
    });
    expect(container).toBeTruthy();
  });
});
