import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { render, screen } from '@testing-library/react';
import { Provider, useSelector } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import moment from 'moment';

import MultiQuickpunch from '../../components/Dashboard/PunchComponents/MultiQuickpunch/MultiQuickpunch';

const initialState = {
  dashboard: {
    recent_punch: [],
    isRecentPunchLoaded: true,
  },
  redirect: {
    link: null,
  },
};

const pauseState = {
  ...initialState,
  dashboard: {
    ...initialState.dashboard,
    recent_punch: [
      {
        recent_log: "",
        completed_today: false,
      },
    ],
    isRecentPunchLoaded: true,
  },
};

const continueState = {
  ...initialState,
  dashboard: {
    ...initialState.dashboard,
    recent_punch: [
      {
        recent_log: "Pause",
        completed_today: false,
      },
    ],
    isRecentPunchLoaded: true,
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
        <MultiQuickpunch 
          user={{
            id: "12345",
            first_name: "John",
            last_name: "Doe",
          }}
          params={{ id: '1593' }}
          location={{}}
          history={{ push: jest.fn() }}
        />
      </Provider>
    );
  }

  test("Loads the Multi Quick Punch without crashing", () => {
    expect(() => {
      renderComponent();
    }).not.toThrow();
  });

  test("Renders Multi Quick Punch elements", () => {
    renderComponent();

    expect(screen.getByText(/Quick Punch/i)).toBeInTheDocument();

    const expectedDate = moment().format('dddd, MMMM Do');
    expect(screen.getByText(expectedDate)).toBeInTheDocument();

    expect(screen.getByText(/Clock In/i)).toBeInTheDocument();
    expect(screen.getByText(/Clock Out/i)).toBeInTheDocument();
  });

  test('Renders Pause button', () => {
    const reducer = (state = pauseState) => state;
    const store = createStore(reducer, applyMiddleware(thunk));

    render(
      <Provider store={store}>
        <MultiQuickpunch
          user={{
            id: "12345",
            first_name: "John",
            last_name: "Doe",
          }}
        />
      </Provider>
    );
    
    expect(screen.getByText(/Pause/i)).toBeInTheDocument();

    const clockInButton = screen.getByRole('button', { name: /clock in/i, });
    expect(clockInButton).toBeDisabled();
  });

  test('Renders Continue button', () => {
    const reducer = (state = continueState) => state;
    const store = createStore(reducer, applyMiddleware(thunk));

    render(
      <Provider store={store}>
        <MultiQuickpunch
          user={{
            id: "12345",
            first_name: "John",
            last_name: "Doe",
          }}
        />
      </Provider>
    );
    
    expect(screen.getByText(/Continue/i)).toBeInTheDocument();

    const clockInButton = screen.getByRole('button', { name: /clock in/i, });
    expect(clockInButton).toBeDisabled();
  });
});