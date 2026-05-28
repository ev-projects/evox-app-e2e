import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { render, screen } from '@testing-library/react';
import { Provider, useSelector } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';

import COE from '../../container/Request/COE/COE';

const initialState = {
  constant: {
    COE_PURPOSES: [
      { "purpose": "Auto/Car Loan Application" },
      { "purpose": "Bank Loan Application" },
      { "purpose": "Housing Loan Application" },
      { "purpose": "Personal Loan Application" },
      { "purpose": "Proof of Employment" },
      { "purpose": "Vaccine" },
      { "purpose": "Visa Application for Personal Travel" },
      { "purpose": "Credit Card Application" },
      { "purpose": "Mobile Plan Application" },
      { "purpose": "Requirement for Continuation of Further Studies" },
      { "purpose": "Requirement for Personal Travel" }
    ],
  },
  coe: {
    instance: {},
  },
  purpose_index: null,
  user: {
    id: "12345",
    first_name: "John",
    last_name: "Doe",
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
        <COE />
      </Provider>
    );
  };

  test("Loads the COE page without crashing", () => {
    expect(() => {
      renderComponent();
    }).not.toThrow();
  });

  test("Shows the certificate of employment form", () => {
    renderComponent();

    expect(
      screen.getByText(/CERTIFICATE OF EMPLOYMENT/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Purpose:/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/With Salary:/i)
    ).toBeInTheDocument();

    const selects = screen.getAllByRole('combobox');

    expect(selects.length).toBeGreaterThanOrEqual(2);

    expect(
      screen.getByRole('button', { name: /Submit/i })
    ).toBeInTheDocument();
  });

});