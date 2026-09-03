/**
 * evoxtest_DashboardDeep3.test.js
 * Source under test: src/container/Dashboard/Dashboard.js
 * Menu: Dashboard (route: dashboard)
 *
 * Wave-6 residue after evoxtest_DashboardContainerDeep2: 14 uncovered functions / 4 uncovered
 * branch arms. Deep2 drove onSubmitHandler and the modal gating through the instance ref; the
 * functions left over are the buttons and links *inside* the five pop-up modals (ITAM Confirm,
 * EVA Submit, Code-of-Conduct agree, the two EVA-registration links, Happiness Submit) plus
 * eight of the store dispatch handlers. This suite clicks them for real.
 *
 * ADDITIVE ONLY — no existing test, mock or app file is touched.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: (mapStateToProps, mapDispatchToProps) => (Component) => {
        Component.__mapStateToProps = mapStateToProps;
        Component.__mapDispatchToProps = mapDispatchToProps;
        return Component;
    },
    useDispatch: () => jest.fn(),
}));

jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader:  ({ children }) => <div>{children}</div>,
    Content:          ({ children }) => <div>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
    Row:              ({ children }) => <div>{children}</div>,
    Col:              ({ children }) => <div>{children}</div>,
}));
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/Dashboard/EmployeeDashboard', () => () => <div data-testid="employee-dashboard" />);
jest.mock('../../components/Dashboard/HandlerDashboard', () => () => <div />);
jest.mock('../../components/Summary/SummaryDashbord', () => () => <div />);
jest.mock('../../components/RequestComponent/RequestButtons/RequestSubtitle', () => () => <div />);
jest.mock('../../components/RequestComponent/RequestButtons/RequestButtons', () => () => <div />);
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate: () => <input type="date" />,
    InputTime: () => <input type="time" />,
}));
jest.mock('react-player/lazy', () => () => null);
jest.mock('styled-components', () => ({
    ThemeConsumer: ({ children }) => <div>{typeof children === 'function' ? children({}) : children}</div>,
}));
jest.mock('react-joyride', () => {
    const Joyride = () => null;
    return {
        __esModule: true, default: Joyride,
        ACTIONS: { CLOSE: 'close' },
        EVENTS: { STEP_AFTER: 'step:after', TARGET_NOT_FOUND: 'error:target_not_found' },
        STATUS: { FINISHED: 'finished', SKIPPED: 'skipped' },
        CLOSE: 'close',
    };
});
jest.mock('../../services/Authenticator', () => ({
    scanLevel: jest.fn(() => true), scanFeature: jest.fn(() => true), check: jest.fn(() => true),
}));
jest.mock('../../store/actions/userActions', () => ({
    getNhoSurvey:       jest.fn(() => ({ type: 'NHO_GET' })),
    addNhoSurvey:       jest.fn((d) => ({ type: 'NHO_ADD', d })),
    addEvaSurvey:       jest.fn((d) => ({ type: 'EVA_ADD', d })),
    getEvaSurvey:       jest.fn(() => ({ type: 'EVA_GET' })),
    getUserCoc:         jest.fn(() => ({ type: 'COC_GET' })),
    acknowledgeCOC:     jest.fn(() => ({ type: 'COC_ACK' })),
    getEvaReg:          jest.fn(() => ({ type: 'EVAREG_GET' })),
    submitEvaReg:       jest.fn(() => ({ type: 'EVAREG_SUBMIT' })),
    getHappinessSurvey: jest.fn(() => ({ type: 'HAPPY_GET' })),
    addHappinessSurvey: jest.fn((d) => ({ type: 'HAPPY_ADD', d })),
    getUserAssets:      jest.fn(() => ({ type: 'ASSETS_GET' })),
    addUserAsset:       jest.fn((d) => ({ type: 'ASSETS_ADD', d })),
}));

const Dashboard = require('../../container/Dashboard/Dashboard').default;
const userActions = require('../../store/actions/userActions');

const TEAMS_EVENT_URL =
    'https://events.teams.microsoft.com/event/ed4c4f6b-61d0-4782-88ad-b6b42d2e44cd@ac1e81b8-89df-4ff5-9a1b-a0d231273335';

const daysAgo = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().substring(0, 10);
};

function makeActions() {
    return {
        getNhoSurvey: jest.fn(), addNhoSurvey: jest.fn(), addEvaSurvey: jest.fn(), getEvaSurvey: jest.fn(),
        getUserCoc: jest.fn(), acknowledgeCOC: jest.fn(), getEvaReg: jest.fn(), submitEvaReg: jest.fn(),
        getHappinessSurvey: jest.fn(), addHappinessSurvey: jest.fn(),
        getUserAssets: jest.fn(), addUserAsset: jest.fn(), dispatch: jest.fn(),
    };
}

// baseline user: no modal fires
function baseUser(overrides = {}) {
    return {
        id: 1, first_name: 'Test', last_name: 'User', emp_num: '1001', email: 't@ev.com',
        lvl_name: 'Employee', country: 'India',
        date_hired: daysAgo(0),
        is_user_nho_valid: '1', is_nho_loaded: true, user_nho_survey: { done: 1 },
        is_asset_loaded: true, user_assets: { a: 1 },
        is_eva_loaded: true, user_eva: {},
        is_coc_loaded: true, user_coc: { is_acknowledged: 0 },
        user_eva_reg: { done: 1 },
        is_happiness_survey_loaded: true, user_happiness_survey: { done: 1 },
        ...overrides,
    };
}

function renderDashboard(userOverrides = {}, settingsOverrides = {}, actions = makeActions()) {
    const ref = React.createRef();
    const props = {
        user: baseUser(userOverrides),
        settings: { popup_flags: {}, coc_forms: [], hr_list: [{ id: 9, empname: 'HR Person' }], ...settingsOverrides },
        dashboard: {},
        ...actions,
    };
    const utils = render(
        <MemoryRouter>
            <Dashboard ref={ref} {...props} />
        </MemoryRouter>
    );
    return { ...utils, ref, actions };
}

const flush = async () => { await act(async () => { await Promise.resolve(); }); };
const setValue = (id, value) => fireEvent.change(document.getElementById(id), { target: { value } });
const clickText = (utils, text) => fireEvent.click(utils.getByText(text));

beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
});

describe('Dashboard — the IT asset modal', () => {
    const itamUser = { date_hired: daysAgo(20), user_assets: {} };

    test('Confirm refuses to post the asset list while the equipment fields are blank', async () => {
        const utils = renderDashboard(itamUser);
        utils.ref.current.setState({ equipment_list: [{ personal_equipment: '1', equipment_type: 'Laptop' }] });
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);

        clickText(utils, 'Confirm');
        await flush();

        expect(utils.getAllByText('This field is required').length).toBeGreaterThan(0);
        expect(utils.actions.addUserAsset).not.toHaveBeenCalled();
        confirmSpy.mockRestore();
    });

    test('Confirm asks for the data-accuracy confirmation, then posts the collected list', async () => {
        const utils = renderDashboard(itamUser);
        utils.ref.current.setState({
            equipment_list: [{ personal_equipment: '1', equipment_type: 'Laptop', serial_no: 'SN-1', asset_tag: 'TAG-1' }],
        });
        setValue('personal_equipment', '1');
        setValue('equipment_type', 'Laptop');
        setValue('serial_no', 'SN-1');
        setValue('asset_tag', 'TAG-1');

        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        clickText(utils, 'Confirm');
        await flush();

        expect(confirmSpy).toHaveBeenCalled();
        expect(utils.actions.addUserAsset).toHaveBeenCalledWith([
            { personal_equipment: '1', equipment_type: 'Laptop', serial_no: 'SN-1', asset_tag: 'TAG-1' },
        ]);
        confirmSpy.mockRestore();
    });

    test('a row whose personal-equipment answer is neither Yes nor No shows an empty cell', () => {
        const utils = renderDashboard(itamUser);
        utils.ref.current.setState({
            equipment_list: [{ personal_equipment: '9', equipment_type: 'Monitor', serial_no: 'SN-9', asset_tag: 'TAG-9' }],
        });

        const row = utils.getByText('SN-9').closest('tr');
        expect(row.children[0].textContent).toBe('');      // personal equipment: neither 1 nor 2
        expect(row.children[1].textContent).toBe('Monitor');
    });
});

describe('Dashboard — the EVA and Happiness surveys', () => {
    test('the EVA survey cannot be submitted with the questions unanswered', async () => {
        const utils = renderDashboard({ is_eva_loaded: false, user_eva: { q1: null } });
        expect(utils.ref.current.state.showEvaModal).toBe(true);

        clickText(utils, 'Submit');
        await flush();

        expect(utils.getAllByText('This field is required').length).toBeGreaterThan(0);
        expect(utils.actions.addEvaSurvey).not.toHaveBeenCalled();
    });

    test('the Happiness survey cannot be submitted with the questions unanswered', async () => {
        const utils = renderDashboard(
            { user_happiness_survey: null, is_happiness_survey_loaded: false },
            { popup_flags: { happiness_survey: true } }
        );
        expect(utils.ref.current.state.showHappinessSurveyModal).toBe(true);

        clickText(utils, 'Submit');
        await flush();

        expect(utils.getAllByText('This field is required').length).toBeGreaterThan(0);
        expect(utils.actions.addHappinessSurvey).not.toHaveBeenCalled();
    });
});

describe('Dashboard — the Code of Conduct modal', () => {
    const cocSettings = { coc_forms: [{ content: '<p>Form One</p>' }, { content: '<p>Form Two</p>' }] };

    test('"I Agree" stays disabled until the mandatory box is ticked, then records the acknowledgement', async () => {
        const utils = renderDashboard({ user_coc: null }, cocSettings);
        expect(utils.ref.current.state.coc_mode).toBe(1);

        const agree = utils.getByText('I Agree').closest('button');
        expect(agree.disabled).toBe(true);

        fireEvent.click(document.getElementById('mandatoryCheckbox'));
        expect(utils.ref.current.state.isCocChecked).toBe(true);
        expect(utils.getByText('I Agree').closest('button').disabled).toBe(false);

        fireEvent.click(utils.getByText('I Agree').closest('button'));
        await flush();

        expect(utils.actions.acknowledgeCOC).toHaveBeenCalledTimes(1);
    });

    test('the second-stage form confirms without a tick box', async () => {
        const utils = renderDashboard(
            { user_coc: { is_acknowledged: 1, is_completed: 0, acknowledged_at: daysAgo(3) } },
            cocSettings
        );
        expect(utils.ref.current.state.coc_mode).toBe(2);
        expect(document.getElementById('mandatoryCheckbox')).toBeNull();

        fireEvent.click(utils.getByText('I Confirm').closest('button'));
        await flush();

        expect(utils.actions.acknowledgeCOC).toHaveBeenCalledTimes(1);
    });

    test('an acknowledgement that is already complete, or still within its 2-day grace, opens nothing', () => {
        const done = renderDashboard(
            { user_coc: { is_acknowledged: 1, is_completed: 1, acknowledged_at: daysAgo(3) } },
            cocSettings
        );
        expect(done.ref.current.state.showCocModal).toBe(false);

        const fresh = renderDashboard(
            { user_coc: { is_acknowledged: 1, is_completed: 0, acknowledged_at: daysAgo(0) } },
            cocSettings
        );
        expect(fresh.ref.current.state.showCocModal).toBe(false);
    });

    test('an empty acknowledgement record is treated as neither missing nor present', () => {
        const utils = renderDashboard({ user_coc: {} }, cocSettings);
        expect(utils.ref.current.state.showCocModal).toBe(false);
        expect(utils.ref.current.state.coc_mode).toBe('');
    });
});

describe('Dashboard — the EVA registration modal', () => {
    test('both registration links open the Teams event and record the registration', () => {
        const utils = renderDashboard({ user_eva_reg: null });
        expect(utils.ref.current.state.showEvaRegModal).toBe(true);

        const openSpy = jest.spyOn(window, 'open').mockReturnValue({ closed: false, focus: jest.fn() });

        fireEvent.click(utils.getByAltText('EVA 2025 Theme').closest('a'));
        expect(openSpy).toHaveBeenCalledTimes(1);
        expect(openSpy.mock.calls[0][0]).toBe(TEAMS_EVENT_URL);

        fireEvent.click(utils.getByText('REGISTRATION LINK').closest('a'));
        expect(openSpy).toHaveBeenCalledTimes(2);
        expect(openSpy.mock.calls[1][0]).toBe(TEAMS_EVENT_URL);

        expect(utils.actions.submitEvaReg).toHaveBeenCalledTimes(2);
        openSpy.mockRestore();
    });
});

describe('Dashboard — store wiring', () => {
    test('mapStateToProps exposes the user, dashboard and settings slices', () => {
        const state = { user: { id: 1 }, dashboard: { worktour: true }, settings: { popup_flags: {} }, other: 1 };
        expect(Dashboard.__mapStateToProps(state)).toEqual({
            user: { id: 1 }, dashboard: { worktour: true }, settings: { popup_flags: {} },
        });
    });

    test('every mapDispatchToProps handler dispatches its own action creator', () => {
        const dispatch = jest.fn();
        const p = Dashboard.__mapDispatchToProps(dispatch);

        p.addNhoSurvey('nho');
        p.getNhoSurvey();
        p.addUserAsset(['asset']);
        p.getUserAssets();
        p.addEvaSurvey('eva');
        p.getEvaSurvey();
        p.getUserCoc();
        p.acknowledgeCOC();
        p.getEvaReg();
        p.submitEvaReg();
        p.getHappinessSurvey();
        p.addHappinessSurvey('happy');

        expect(userActions.addNhoSurvey).toHaveBeenCalledWith('nho');
        expect(userActions.addUserAsset).toHaveBeenCalledWith(['asset']);
        expect(userActions.addEvaSurvey).toHaveBeenCalledWith('eva');
        expect(userActions.addHappinessSurvey).toHaveBeenCalledWith('happy');
        expect(dispatch.mock.calls.map((c) => c[0].type)).toEqual([
            'NHO_ADD', 'NHO_GET', 'ASSETS_ADD', 'ASSETS_GET', 'EVA_ADD', 'EVA_GET',
            'COC_GET', 'COC_ACK', 'EVAREG_GET', 'EVAREG_SUBMIT', 'HAPPY_GET', 'HAPPY_ADD',
        ]);
    });
});
