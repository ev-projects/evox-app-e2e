import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { render, screen } from '@testing-library/react';
import { Provider, useSelector } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import moment from 'moment';

import NavPuncher from '../../components/Template/NavPuncher/NavPuncher';

jest.mock('../../services/Authenticator', () => ({
  __esModule: true,
  default: {
    scanFeature: jest.fn(),
    scanLevel: jest.fn(),
  },
}));

import Authenticator from '../../services/Authenticator';

const initialState = {
  user: {
    timezone: "PST"
  },
  dashboard: {
    recent_dtr: [
      {
        "id": "27393289",
        "user_id": "1593",
        "date": "2026-06-08",
        "time_in": null,
        "time_out": null,
        "start_datetime": "2026-06-08 15:30:00",
        "end_datetime": "2026-06-09 00:30:00",
        "is_rest_day": "0",
        "with_in_time": false,
        "before_time_in_half": false,
        "raw_time": {
            "0": true,
            "1": true,
            "start_datetime": "1780903800",
            "end_datetime": "1780936200"
        }
      },
      {
        "id": "27393290",
        "user_id": "1593",
        "date": "2026-06-09",
        "time_in": null,
        "time_out": null,
        "start_datetime": "2026-06-09 15:30:00",
        "end_datetime": "2026-06-10 00:30:00",
        "is_rest_day": "0",
        "with_in_time": false,
        "before_time_in_half": false,
        "raw_time": {
            "0": true,
            "1": true,
            "start_datetime": "1780990200",
            "end_datetime": "1781022600"
        }
      }
    ],
  },
  redirect: {
    link: null,
  },
};

const clockOutState = {
  ...initialState,
  dashboard: {
    ...initialState.dashboard,
    recent_dtr: [
      initialState.dashboard.recent_dtr[0],
      {
        ...initialState.dashboard.recent_dtr[1],
        time_in: "2026-06-09 15:30:00",
        time_out: null,
      },
    ],
  },
};

describe('Nav Puncher Component', () => {
  beforeEach(() => {
    Authenticator.scanFeature.mockImplementation((key) => {
      if (key === 'multi_login') return false;
      if (key === 'login') return true;
      return false;
    });

    Authenticator.scanLevel.mockReturnValue(false);
  });

  // afterEach(() => {
  //   console.error.mockRestore();
  // });
  
  const reducer = (state = initialState, action) => state;

  const renderComponent = () => {
    const store = createStore(reducer, applyMiddleware(thunk));

    render(
      <Provider store={store}>
        <NavPuncher 
          user={{
            id: "12345",
            first_name: "John",
            last_name: "Doe",
            timezone: "PST"
          }}
          params={{ id: '1593' }}
          location={{}}
          history={{ push: jest.fn() }}
        />
      </Provider>
    );
  }

  test("Loads the Nav Puncher without crashing", () => {
    expect(() => {
      renderComponent();
    }).not.toThrow();
  });

  test("Renders Clock In button", () => {
    renderComponent();

    expect(screen.getByText(/clock in/i)).toBeInTheDocument();
  });

  test('Renders current date', () => {
    renderComponent();

    const expectedDate = moment().format('dddd, Do MMMM');
    expect(screen.getByText(expectedDate)).toBeInTheDocument();
  });

  test('Renders Clock Out button if there is already a clockin', () => {
    const reducer = (state = clockOutState) => state;
    const store = createStore(reducer, applyMiddleware(thunk));

    render(
      <Provider store={store}>
        <NavPuncher
          user={{
            id: "12345",
            first_name: "John",
            last_name: "Doe",
            timezone: "PST"
          }}
          params={{ id: '1593' }}
          location={{}}
          history={{ push: jest.fn() }}
        />
      </Provider>
    );

    expect(screen.getByText(/clock out/i)).toBeInTheDocument();
  });

  test('Renders Rest Day button when today is rest day', () => {
    const restDayState = {
      ...initialState,
      dashboard: {
        ...initialState.dashboard,
        recent_dtr: [
          {
            ...initialState.dashboard.recent_dtr[0],
            is_rest_day: 1,
          },
          {
            ...initialState.dashboard.recent_dtr[1],
            is_rest_day: 1,
          },
        ],
      },
    };

    const reducer = (state = restDayState) => state;
    const store = createStore(reducer, applyMiddleware(thunk));

    render(
      <Provider store={store}>
        <NavPuncher
          user={{
            id: "12345",
            first_name: "John",
            last_name: "Doe",
            timezone: "PST"
          }}
          params={{ id: '1593' }}
          location={{}}
          history={{ push: jest.fn() }}
        />
      </Provider>
    );

    expect(screen.getByText(/rest day/i)).toBeInTheDocument();
  });
});