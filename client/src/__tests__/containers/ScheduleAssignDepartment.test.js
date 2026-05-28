import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';

import ScheduleAssignDepartment from '../../container/Schedule/ScheduleAssignDepartment/ScheduleAssignDepartment';

jest.mock('../../services/Authenticator', () => ({
  scanLevel_Feature: jest.fn(() => true),
}));

const initialState = {
  schedule: {
    page_reloaded: true,
    template_list: {},
    default_schedule: {},
    template_data: {},
  },
  redirect: {
    link: null,
  },
};

describe('Certificate of Employment Request Form', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  const reducer = (state = initialState, action) => state;

  const renderComponent = () => {
    const store = createStore(reducer, applyMiddleware(thunk));

    return render(
      <Provider store={store}>
        <ScheduleAssignDepartment 
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
  };

  test("Loads the Schedule Assign Department page without crashing", () => {
    expect(() => {
      renderComponent();
    }).not.toThrow();
  });

  test("Loads Schedule Assign Department page successfully and shows the initial element department dropdown", () => {
    renderComponent();

    expect(
      screen.getByText(/DEPARTMENTS HANDLED/i)
    ).toBeInTheDocument();

    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThanOrEqual(1);
  });

  test('Loads Schedule Assign Department page successfully and shows additional form fields after selecting department', async () => {
    renderComponent();

    // Initial dropdown exists
    const departmentSelect = screen.getByRole('combobox');
    expect(departmentSelect).toBeInTheDocument();

    // Simulate selecting department
    fireEvent.change(departmentSelect, {
      target: { value: '123' },
    });

    expect(
      screen.getByText(/Date From :/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/CREATION TYPE/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/HOLIDAY POLICY/i)
    ).toBeInTheDocument();

    expect(
      screen.getByRole('button', { name: /Update/i })
    ).toBeInTheDocument();

    expect(
      screen.getAllByRole('button', {
        name: /Assign to all employees/i,
      })[0]
    ).toBeInTheDocument();
  });

});