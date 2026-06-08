import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';

import Dashboard from '../../container/Dashboard/Dashboard';


// ==========================
// MOCK HEAVY COMPONENTS
// ==========================
jest.mock('../../components/Dashboard/EmployeeDashboard', () => () => <div />);
jest.mock('../../components/Dashboard/HandlerDashboard', () => () => <div />);
jest.mock('../../components/Summary/SummaryDashbord', () => () => <div />);

jest.mock('../../components/Template/Wrapper', () => ({ children }) => (
  <div>{children}</div>
));

jest.mock('react-joyride', () => () => <div />);
jest.mock('react-player/lazy', () => () => <div />);

jest.mock(
  '../../components/RequestComponent/RequestButtons/RequestButtons',
  () => () => <button>Submit</button>
);

jest.mock(
  '../../components/RequestComponent/RequestButtons/RequestSubtitle',
  () => () => <div />
);


// ==========================
// MOCK AUTHENTICATOR
// ==========================
jest.mock('../../services/Authenticator', () => ({
  scanLevel: jest.fn(() => false),
  check: jest.fn(() => false),
}));


// ==========================
// MOCK ALL ACTIONS
// ==========================
jest.mock('../../store/actions/userActions', () => ({
  getNhoSurvey: jest.fn(() => ({ type: 'MOCK_GET_NHO_SURVEY' })),
  addNhoSurvey: jest.fn(() => ({ type: 'MOCK_ADD_NHO_SURVEY' })),

  getUserAssets: jest.fn(() => ({ type: 'MOCK_GET_USER_ASSETS' })),
  addUserAsset: jest.fn(() => ({ type: 'MOCK_ADD_USER_ASSET' })),

  getEvaSurvey: jest.fn(() => ({ type: 'MOCK_GET_EVA_SURVEY' })),
  addEvaSurvey: jest.fn(() => ({ type: 'MOCK_ADD_EVA_SURVEY' })),

  getUserCoc: jest.fn(() => ({ type: 'MOCK_GET_USER_COC' })),
  acknowledgeCOC: jest.fn(() => ({ type: 'MOCK_ACK_COC' })),

  getEvaReg: jest.fn(() => ({ type: 'MOCK_GET_EVA_REG' })),
  submitEvaReg: jest.fn(() => ({ type: 'MOCK_SUBMIT_EVA_REG' })),

  getHappinessSurvey: jest.fn(() => ({
    type: 'MOCK_GET_HAPPINESS'
  })),

  addHappinessSurvey: jest.fn(() => ({
    type: 'MOCK_ADD_HAPPINESS'
  })),
}));

describe('Dashboard Modal', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  test('Shows NHO Survey modal when user is eligible', () => {
    const store = createStore(
      () => ({
        user: {
          is_user_nho_valid: "0",
          is_nho_loaded: true,
          date_hired: new Date().toISOString(),
          user_nho_survey: {},
        },
        settings: {
          hr_list: [],
        },
      }),
      applyMiddleware(thunk)
    );

    render(
      <Provider store={store}>
        <Dashboard />
      </Provider>
    );

    expect(
      screen.getByText(/We Love To Hear Your Onboarding Experience/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/submit/i)
    ).toBeInTheDocument();

  });

  test('Does not show NHO Survey modal when already completed', () => {
    const store = createStore(
      () => ({
        user: {
          is_user_nho_valid: "1",
          is_nho_loaded: true,
          date_hired: new Date().toISOString(),
          user_nho_survey: {},
        },
        settings: {
          hr_list: [],
        },
      }),
      applyMiddleware(thunk)
    );

    render(
      <Provider store={store}>
        <Dashboard />
      </Provider>
    );

    expect(
      screen.queryByText(/We Love To Hear Your Onboarding Experience/i)
    ).not.toBeInTheDocument();

    expect(
      screen.queryByText(/submit/i)
    ).not.toBeInTheDocument();
  });

  test("Shows ITAM modal when user is eligible", () => {
    const store = createStore(
      () => ({
        user: {
          date_hired: "2024-01-01",
          lvl_name: "Employee",
          is_asset_loaded: true,
          user_assets: {},
        },
        settings: {
          hr_list: [],
        },
      }),
      applyMiddleware(thunk)
    );

    render(
      <Provider store={store}>
        <Dashboard />
      </Provider>
    );

    expect(
      screen.getByText(/IT Asset Management/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Employee Name/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Equipment Type/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Serial No/i)
    ).toBeInTheDocument();

    // initial empty state
    expect(
      screen.getByText(/No assets added yet/i)
    ).toBeInTheDocument();
  });

  test("Does not show ITAM modal for Client users", () => {
    const store = createStore(
      () => ({
        user: {
          date_hired: "2024-01-01",
          lvl_name: "Client",
          is_asset_loaded: true,
          user_assets: {},
        },
        settings: {
          hr_list: [],
        },
      }),
      applyMiddleware(thunk)
    );

    render(
      <Provider store={store}>
        <Dashboard />
      </Provider>
    );

    expect(
      screen.queryByText(/IT Asset Management/i)
    ).not.toBeInTheDocument();
  });

  test("Shows EVA Survey modal when user is eligible", () => {
    const store = createStore(
      () => ({
        user: {
          is_eva_loaded: true,
          user_eva: {
            user_id: "12345",
            eva_year: "2026",
            eva_quarter: "2",
            is_submitted: "0",
          },
        },
        settings: {
          hr_list: [],
        },
        dashboard: {},
      }),
      applyMiddleware(thunk)
    );

    render(
      <Provider store={store}>
        <Dashboard />
      </Provider>
    );

    expect(
      screen.getByText(/We Love To Hear Your EVA Experience/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/submit/i)
    ).toBeInTheDocument();
  });

  test("Shows Happiness Survey modal when user is eligible", () => {
    const store = createStore(
      () => ({
        user: {
          is_happiness_survey_loaded: true,
          user_happiness_survey: null,
        },
        settings: {
          popup_flags: {
            happiness_survey: true,
          },
        },
      }),
      applyMiddleware(thunk)
    );

    const currentYear = new Date().getFullYear();

    render(
      <Provider store={store}>
        <Dashboard />
      </Provider>
    );

    expect(
      screen.getByText(new RegExp(`Happiness Survey ${currentYear}`, "i"))
    ).toBeInTheDocument();

    expect(
      screen.getByText(/submit/i)
    ).toBeInTheDocument();
  });

  test("Shows RCT Referral Banner modal when user is eligible", () => {
    const store = createStore(
      () => ({
        user: {
          country: "Philippines",
        },
        settings: {
          popup_flags: {
            referral_banner: true,
          },
        },
      }),
      applyMiddleware(thunk)
    );

    render(
      <Provider store={store}>
        <Dashboard />
      </Provider>
    );

    expect(
      screen.getByText(/SPECIAL REFERRAL DRIVE/i)
    ).toBeInTheDocument();
  });

});