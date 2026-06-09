import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider, useSelector } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import userEvent from '@testing-library/user-event';
import thunk from 'redux-thunk';

import DailyTimeRecord from '../../container/DailyTimeRecord/DailyTimeRecord';

jest.mock('react-select', () => props => (
  <select
    data-testid={props.name}
    value={props.value?.value || ''}
    onChange={e => {
      const selected = props.options.find(
        o => String(o.value) === e.target.value
      );

      props.onChange(selected);
    }}
  >
    <option value="">Select</option>
    {props.options.map(o => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ))}
  </select>
));

const mockDtrList = [
  {
    id: "1",
    user_id: "1593",
    date: "2025-12-16",

    time_in: "2025-12-16 09:00:00",
    time_out: "2025-12-16 18:00:00",

    attendance_status: {
      name: "Present",
      slug: "present",
    },

    payroll_items: {
      late: "00:10",
      undertime: "00:00",
      night_diff: "00:00",
      overtime: "01:00",
      overtime_night_diff: "00:00",
    },

    requests: [],   // IMPORTANT
    holidays: [],   // IMPORTANT
    leaves: [],     // IMPORTANT

    is_rest_day: 0,

    owner_POV: {
      time_in: "2025-12-16 09:00:00",
      time_out: "2025-12-16 18:00:00",
      start_datetime: "2025-12-16 08:00:00",
      end_datetime: "2025-12-16 17:00:00",
      start_flexy_datetime: "2025-12-16 11:00:00",
      end_flexy_datetime: "2025-12-16 20:00:00",
    },
  },
];

const initialState = {
  dtr: {
    isFilterLoaded: true,
    filter: {
      "2026": {
        "01": {
          label: "January",
          data: {
            "90": {
              id: 90,
              name: "January 2026",
              start_date: "2025-12-16",
              end_date: "2026-01-15",
              year: "2026",
              month: "01",
              month_label: "January",
            },
          },
        },
      },
    },
    isDtrLoaded: true,
    isDtrSummaryLoaded: false,
    list: mockDtrList,
    employeeInfo: {},
    dtrSummary: {},
  },
  selectedYear: {},
  selectedMonth : {},
  selectedPayrollCutoff: {},
  isCurrentPayrollCutoffLoaded : false,
  isDtrSummaryLoaded : true,
  payrollCutoff_start: null,
  payrollCutoff_end: null,
  toggle_pov: false,
  redirect: {
    link: null,
  },
};

describe('DTR Page', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });
  
  const reducer = (state = initialState, action) => state;

  const renderComponent = () => {
    const store = createStore(reducer, applyMiddleware(thunk));

    render(
      <Provider store={store}>
        <DailyTimeRecord 
          user={{
            id: "12345",
            first_name: "John",
            last_name: "Doe",
          }}
          params={{ id: '1593' }}
          getFilterForDtr={jest.fn()}
          location={{}}
          history={{ push: jest.fn() }}
        />
      </Provider>
    );
  }

  test("Loads the DTR page without crashing", () => {
    expect(() => {
      renderComponent();
    }).not.toThrow();
  });

  test("Only year dropdown is shown initially", () => {
    renderComponent();

    expect(screen.getByTestId('year')).toBeInTheDocument();
    expect(screen.queryByTestId('month')).not.toBeInTheDocument();
    expect(screen.queryByTestId('payroll_cutoff')).not.toBeInTheDocument();
  });

  test('Shows month dropdown after selecting a year', async () => {
    renderComponent();

    fireEvent.change(screen.getByTestId('year'), {
      target: { value: '2026' },
    });

    expect(screen.getByTestId('month')).toBeInTheDocument();
  });

  test('Shows payroll cutoff dropdown after selecting a month', async () => {
    renderComponent();

    fireEvent.change(screen.getByTestId('year'), {
      target: { value: '2026' },
    });

    fireEvent.change(screen.getByTestId('month'), {
      target: { value: '01' },
    });

    expect(screen.getByTestId('payroll_cutoff')).toBeInTheDocument();
  });

  test('Renders DTR table with key fields', async () => {
    renderComponent();

    // select year
    await userEvent.selectOptions(screen.getByTestId('year'), '2026');

    // select month
    await userEvent.selectOptions(screen.getByTestId('month'), '01');

    // select cutoff
    await userEvent.selectOptions(screen.getByTestId('payroll_cutoff'), '90');

    // wait for table to render
    const dateCell = await screen.findByText('2025-12-16');

    expect(dateCell).toBeInTheDocument();
    expect(screen.getByText(/present/i)).toBeInTheDocument();
    expect(screen.getByText('9:00:00')).toBeInTheDocument();
    expect(screen.getByText('18:00:00')).toBeInTheDocument();
  });
});