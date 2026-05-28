import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { render, screen } from '@testing-library/react';
import { Provider, useSelector } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';

import DtrSummary from '../../container/MyTeam/DtrSummaryNew/DtrSummaryNew';

jest.mock('../../services/Authenticator', () => ({
  scanFeature: jest.fn((key) => key === 'export_dtr_summary'),
}));

const initialState = {
  settings: {
    current_payroll_cutoff: {
      start_date: "2026-03-16",
      end_date: "2026-04-15",
    },
  },
  dtrSummary: {
    isListLoaded: true,
    dtrItems: [
      {
        Employee_Number: "12345",
        Employee_Name: "John Doe",
        Department: "Main Department", 
      }
    ],
  },
  redirect: {
    link: null,
  },
};

describe('DTR Summary Report', () => {
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
        <DtrSummary 
          user={{
            id: "12345",
            first_name: "John",
            last_name: "Doe",
            departments_handled: [
              { id: "123", department_name: "Test Department 1" },
            ],
          }}
          location={{}}
          history={{ push: jest.fn() }}
          match={{ params: {} }}
        />
      </Provider>
    );
  }

  test("Loads the DTR Summary Report page without crashing", () => {
    expect(() => {
      renderComponent();
    }).not.toThrow();
  });

  test("Shows DTR Summary Report when user is eligible", () => {
    renderComponent();

    expect(screen.getByText(/DTR SUMMARY/i)).toBeInTheDocument();

    expect(screen.getByText(/Date Range:/i)).toBeInTheDocument();

    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThanOrEqual(2);

    expect(screen.getByRole('button', { name: /Generate/i })).toBeInTheDocument();

    expect(screen.getByText(/Export/i)).toBeInTheDocument();
  });
});