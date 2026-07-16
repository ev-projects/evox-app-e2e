// evoxtest_SmallWins_frontend.test.js
// Batch of smaller remaining coverage gaps: LoaderContainer, EVLearning (near-total
// misses, never rendered by any existing test), OpsSchedule and DtrMultiLogsSummary
// (componentDidMount/componentWillMount auto-fetch chains), same ref-based pattern.

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  connect: () => (Component) => Component,
}));
jest.mock('../../components/Template/Wrapper/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/Template/Wrapper/index.js', () => ({ children }) => <div>{children}</div>);
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
jest.mock('react-promise-tracker', () => ({
  usePromiseTracker: () => ({ promiseInProgress: true }),
}));

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoaderContainer from '../../components/Template/LoaderContainer/LoaderContainer';
import EVLearning from '../../container/EVLearning/EVLearning';
import OpsSchedule from '../../container/OpsSchedule/OpsSchedule';
import DtrMultiLogsSummary from '../../container/MyTeam/DtrMultiLogsSummary/DtrMultiLogsSummary';

function renderWithRef(Component, props) {
  const ref = React.createRef();
  const utils = render(
    <MemoryRouter>
      <Component ref={ref} {...props} />
    </MemoryRouter>
  );
  return { ref, ...utils };
}

beforeAll(() => {
  global.links = global.links || {};
  global.links.ev_learning_secure_coding = '/ev-learning/secure-coding';
});

beforeEach(() => {
  jest.clearAllMocks();
});

test('LoaderContainer renders the overlay when a promise is in progress', () => {
  const { container } = render(<MemoryRouter><LoaderContainer /></MemoryRouter>);
  expect(container.textContent).toMatch(/Loading/);
});

test('EVLearning renders its static guidelines content', () => {
  const { container } = render(<MemoryRouter><EVLearning /></MemoryRouter>);
  expect(container.textContent).toMatch(/Guidelines/);
});

describe('OpsSchedule — componentWillMount fetch + render branches', () => {
  const defaultProps = {
    fetchOpsSchedules: jest.fn(),
    constant: {},
    opsSchedules: {},
  };

  test('componentWillMount fetches ops schedules', () => {
    renderWithRef(OpsSchedule, defaultProps);
    expect(defaultProps.fetchOpsSchedules).toHaveBeenCalled();
  });

  test('renders with a populated schedule list', () => {
    const { container } = render(
      <MemoryRouter>
        <OpsSchedule {...defaultProps} opsSchedules={{
          listInstance: [
            [{ department_name: 'Engineering', schedules: [] }],
            [{ department_name: 'HR', schedules: [] }],
          ],
        }} />
      </MemoryRouter>
    );
    expect(container.textContent).toMatch(/EV Support Team Schedule/);
  });
});

describe('DtrMultiLogsSummary — componentDidMount auto-fetch', () => {
  const settings = { current_payroll_cutoff: { start_date: '2026-03-01', end_date: '2026-03-31' } };
  const defaultProps = {
    fetchDtrMultiLogsSummary: jest.fn(),
    exportDtrMultiLogsSummary: jest.fn(),
    dtrMultiLogsSummary: { isListLoaded: false, dtrItems: [] },
    settings,
  };

  test('componentDidMount with departments_handled triggers onSubmitHandler and fetchDtrMultiLogsSummary', () => {
    renderWithRef(DtrMultiLogsSummary, {
      ...defaultProps,
      user: { id: 1, departments_handled: [{ id: 5, department_name: 'Engineering' }] },
    });
    expect(defaultProps.fetchDtrMultiLogsSummary).toHaveBeenCalled();
  });

  test('componentDidMount with no departments_handled does not auto-fetch', () => {
    renderWithRef(DtrMultiLogsSummary, { ...defaultProps, user: { id: 1, departments_handled: [] } });
    expect(defaultProps.fetchDtrMultiLogsSummary).not.toHaveBeenCalled();
  });
});
