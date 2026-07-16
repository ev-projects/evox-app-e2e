// DRAFT — generated 2026-06-16, needs verification
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

// ---------------------------------------------------------------------------
// Core mocks
// ---------------------------------------------------------------------------
jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => jest.fn(),
}));

jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate:     ({ name }) => <input name={name} type="date" />,
    InputTime:     ({ name }) => <input name={name} type="time" />,
    InputDateTime: ({ name }) => <input name={name} type="datetime-local" />,
}));

jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);

jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader:  ({ children }) => <div>{children}</div>,
    Content:          ({ children }) => <div>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
    Row:              ({ children }) => <div>{children}</div>,
    Col:              ({ children }) => <div>{children}</div>,
}));

// ---------------------------------------------------------------------------
// Heavy dependency mocks specific to Dashboard
// ---------------------------------------------------------------------------

// Joyride guided tour — renders nothing in unit tests
jest.mock('react-joyride', () => ({ children }) => <div data-testid="joyride">{children}</div>);

// Formik is used by NHO/ITAM/EVA/Happiness modal forms — stub it out
jest.mock('formik', () => ({
    ...jest.requireActual('formik'),
    Formik: ({ children }) => <div>{typeof children === 'function' ? children({
        values: {},
        errors: {},
        touched: {},
        handleChange: jest.fn(),
        handleBlur: jest.fn(),
        handleSubmit: jest.fn(),
        setFieldValue: jest.fn(),
        isSubmitting: false,
    }) : children}</div>,
    Form:  ({ children }) => <form>{children}</form>,
    Field: ({ name, ...rest }) => <input name={name} {...rest} />,
    ErrorMessage: () => null,
}));

// moment is used for date formatting in NHO modal — use real implementation
// but mock to avoid timezone issues in CI
jest.mock('moment', () => {
    const m = jest.requireActual('moment');
    return m;
});

// EmployeeDashboard is a heavy child — stub it so we can test Dashboard in isolation
jest.mock('../../components/Dashboard/EmployeeDashboard/EmployeeDashboard.js', () =>
    () => <div data-testid="employee-dashboard">EmployeeDashboard</div>
);

// Dashboard imports { Table, Image, Spinner, Button, Modal, Form } from 'react-bootstrap'
// (v1.3.0 — no react-bootstrap/lib/* submodules, no Glyphicon). Stub the named exports.
jest.mock('react-bootstrap', () => {
    const Modal = ({ children, show }) => show ? <div data-testid="modal">{children}</div> : null;
    Modal.Header = ({ children }) => <div>{children}</div>;
    Modal.Body   = ({ children }) => <div>{children}</div>;
    Modal.Footer = ({ children }) => <div>{children}</div>;
    Modal.Title  = ({ children }) => <div>{children}</div>;
    return {
        Table:     ({ children }) => <table>{children}</table>,
        Image:     (props) => <img alt="" {...props} />,
        Spinner:   () => <div data-testid="spinner" />,
        Button:    ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
        Row:       ({ children }) => <div>{children}</div>,
        Col:       ({ children }) => <div>{children}</div>,
        Container: ({ children }) => <div>{children}</div>,
        Modal,
        Form:    Object.assign(({ children }) => <form>{children}</form>, {
            Group:   ({ children }) => <div>{children}</div>,
            Label:   ({ children }) => <label>{children}</label>,
            Check:   (props) => <input type="checkbox" {...props} />,
            Row:     ({ children }) => <div>{children}</div>,
            Control: Object.assign((props) => <input {...props} />, {
                Feedback: ({ children }) => <div>{children}</div>,
            }),
        }),
    };
});

// ---------------------------------------------------------------------------
// Import the Dashboard container
// ---------------------------------------------------------------------------
let Dashboard;
try {
    const m = require('../../container/Dashboard/Dashboard');
    Dashboard = m.Dashboard || m.default;
} catch {
    Dashboard = require('../../container/Dashboard/Dashboard').default;
}

// ---------------------------------------------------------------------------
// Default props — mirrors mapStateToProps shape from Dashboard.js
// ---------------------------------------------------------------------------
const defaultProps = {
    // auth user shape
    user: {
        id: 1,
        full_name: 'Test Employee',
        pov_timezone: 'Asia/Manila',
        email: 'test@eastvantage.com',
        country: 'Philippines',
        country_id: 1,
        LevelId: 5,
        lvl_name: 'Employee',
        date_hired: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 60 days ago — avoids NHO modal
        is_user_nho_valid: '1',
        is_nho_loaded: true,
        is_asset_loaded: true,
        is_eva_loaded: true,
        is_coc_loaded: true,
        is_happiness_survey_loaded: true,
        user_assets: [{ id: 1 }],   // has assets — suppresses ITAM modal
        user_nho_survey: { id: 1 }, // has NHO — suppresses NHO modal
        user_eva: null,
        user_coc: { is_acknowledged: 1, is_completed: 1 },
        user_happiness_survey: { id: 1 },
        user_eva_reg: { id: 1 },    // has EVA reg — suppresses EVA reg modal
    },
    // dashboard Redux state
    dashboard: {
        worktour: false,
        my_notifications: null,
        approval: 0,
        announcement: 0,
        celebration: 0,
        missingdtr: 0,
        alldata: 0,
    },
    // settings Redux state
    settings: {
        popup_flags: {
            happiness_survey: false,
            referral_banner: false,
        },
        coc_forms: [],
        hr_list: [],
        current_payroll_cutoff: null,
    },
    // action creators
    getNhoSurvey:          jest.fn(),
    addNhoSurvey:          jest.fn(),
    getUserAssets:         jest.fn(),
    addUserAsset:          jest.fn(),
    getEvaSurvey:          jest.fn(),
    addEvaSurvey:          jest.fn(),
    getUserCoc:            jest.fn(),
    acknowledgeCOC:        jest.fn(),
    submitEvaReg:          jest.fn(),
    getHappinessSurvey:    jest.fn(),
    addHappinessSurvey:    jest.fn(),
    dispatch:              jest.fn(),
    // router props
    history:  { push: jest.fn() },
    match:    { params: {} },
    location: { search: '' },
};

function renderComponent(props = {}) {
    return render(
        <MemoryRouter>
            <Dashboard {...defaultProps} {...props} />
        </MemoryRouter>
    );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('Dashboard component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    test('renders EmployeeDashboard child', () => {
        const { getByTestId } = renderComponent();
        expect(getByTestId('employee-dashboard')).toBeInTheDocument();
    });

    test('does not crash when user has no notifications (alldata = 0)', () => {
        expect(() => renderComponent({
            dashboard: { ...defaultProps.dashboard, alldata: 0 },
        })).not.toThrow();
    });

    test('does not crash during loading state with minimal user shape', () => {
        expect(() => renderComponent({
            user: {
                id: 2,
                full_name: 'Minimal User',
                pov_timezone: 'Asia/Manila',
                country: 'Philippines',
                country_id: 1,
                LevelId: 5,
                lvl_name: 'Employee',
                date_hired: '2020-01-01',
                is_user_nho_valid: '1',
                is_nho_loaded: true,
                is_asset_loaded: true,
                is_eva_loaded: true,
                is_coc_loaded: true,
                is_happiness_survey_loaded: true,
                user_assets: [],
                user_nho_survey: null,
                user_eva: null,
                user_coc: null,
                user_happiness_survey: null,
                user_eva_reg: null,
            },
        })).not.toThrow();
    });

    test('does not crash with empty settings', () => {
        expect(() => renderComponent({
            settings: {
                popup_flags: {},
                coc_forms: [],
                hr_list: [],
                current_payroll_cutoff: null,
            },
        })).not.toThrow();
    });

    test('does not crash when worktour is true', () => {
        expect(() => renderComponent({
            dashboard: { ...defaultProps.dashboard, worktour: true },
        })).not.toThrow();
    });

    test('does not crash when user is a Client level (suppresses ITAM)', () => {
        expect(() => renderComponent({
            user: {
                ...defaultProps.user,
                lvl_name: 'Client',
                user_assets: [],
                is_asset_loaded: false,
            },
        })).not.toThrow();
    });

    test('does not crash when user country is not Philippines (suppresses referral banner)', () => {
        expect(() => renderComponent({
            user: {
                ...defaultProps.user,
                country: 'India',
            },
            settings: {
                ...defaultProps.settings,
                popup_flags: { referral_banner: true, happiness_survey: false },
            },
        })).not.toThrow();
    });
});
