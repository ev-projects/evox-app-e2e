// evoxtest_DtrDeep_frontend.test.js
// DtrSummary.js and RecentDtr.js — same ref-based direct-handler-call pattern, targeting
// componentDidMount auto-fetch chains and onSubmitHandler branches.

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
}));
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
  InputDate: ({ name }) => <input name={name} type="date" />,
  InputTime: ({ name }) => <input name={name} type="time" />,
}));

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DtrSummary from '../../container/MyTeam/DtrSummary/DtrSummary';
import RecentDtr from '../../components/Dashboard/RecentDtr/RecentDtr';

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

beforeEach(() => {
  jest.clearAllMocks();
});

describe('DtrSummary — componentDidMount auto-fetch + handler branches', () => {
  const defaultProps = {
    fetchDtrSummary: jest.fn(),
    exportDtrSummary: jest.fn(),
    exportNewDtrSummary: jest.fn(),
    dtrSummary: { instance: { column: {} } },
    settings,
  };

  test('componentDidMount with departments_handled triggers onSubmitHandler and fetchDtrSummary', () => {
    renderWithRef(DtrSummary, {
      ...defaultProps,
      user: { id: 1, departments_handled: [{ id: 5, department_name: 'Engineering' }] },
    });
    expect(defaultProps.fetchDtrSummary).toHaveBeenCalled();
  });

  test('componentDidMount with no departments_handled does not auto-fetch', () => {
    renderWithRef(DtrSummary, { ...defaultProps, user: { id: 1, departments_handled: [] } });
    expect(defaultProps.fetchDtrSummary).not.toHaveBeenCalled();
  });

  test('onSubmitHandler paginates using dtrSummary.pagination.has_next_page', () => {
    const { ref } = renderWithRef(DtrSummary, {
      ...defaultProps,
      user: { id: 1, departments_handled: [] },
      dtrSummary: { instance: { column: {} }, pagination: { current_page: 2, has_next_page: true } },
    });
    ref.current.onSubmitHandler({ valid_from: new Date('2026-03-01'), valid_to: new Date('2026-03-31'), department_id: 5 });
    expect(defaultProps.fetchDtrSummary).toHaveBeenCalled();
  });
});

describe('RecentDtr — handler branches', () => {
  const defaultProps = {
    biometrixLog: jest.fn(),
    getRecentDtr: jest.fn(),
    user: { id: 1, full_name: 'Test Employee' },
    dashboard: { recent_dtr: [] },
  };

  test('onSubmitHandler builds form data and calls biometrixLog', () => {
    const { ref } = renderWithRef(RecentDtr, defaultProps);
    ref.current.onSubmitHandler({ biometric_id: '12345' });
    expect(defaultProps.biometrixLog).toHaveBeenCalled();
  });

  test('canClockOut computes hours since clock-in', () => {
    const { ref } = renderWithRef(RecentDtr, defaultProps);
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(ref.current.canClockOut(twoHoursAgo)).toBe(2);
  });

  test('canClockOut returns 0 when there is no clock-in and no comparison time', () => {
    const { ref } = renderWithRef(RecentDtr, defaultProps);
    ref.current.state.compare_to_clock_in = null;
    expect(ref.current.canClockOut(null)).toBe(0);
  });

  test('renders a populated recent_dtr list, including a holiday and a rest-day row', () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const { container } = render(
      <MemoryRouter>
        <RecentDtr {...defaultProps} dashboard={{
          recent_dtr: [
            { date: pastDate, is_rest_day: 0, holidays: [{ type: 'legal', name: 'Test Holiday' }],
              attendance_status: { slug: 'present', name: 'Present' }, time_in: '08:00', start_datetime: null },
            { date: pastDate, is_rest_day: 1, holidays: [],
              attendance_status: { slug: 'rest', name: 'Rest Day' }, time_in: null, start_datetime: null },
          ],
        }} />
      </MemoryRouter>
    );
    expect(container.textContent).toMatch(/Test Holiday/);
  });
});
