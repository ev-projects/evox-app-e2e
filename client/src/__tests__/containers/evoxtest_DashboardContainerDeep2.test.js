/**
 * evoxtest_DashboardContainerDeep2.test.js
 * Wave-2 coverage for container/Dashboard/Dashboard.js (29 Jul: 105 unc / 39%).
 * Arms: componentDidMount modal gating (NHO window + no-close 2nd week, ITAM 15-day,
 * Client exclusion, EVA, COC mode 1/2, EVA-reg, Happiness, Referral banner),
 * onSubmitHandler branches (add_equipment DOM flow, itam+confirm, eva, coc, happiness,
 * default NHO with date formatting), onHide, handleJoyrideCallback (finished/close/
 * index 9), openPopup (blocked + focused). State asserted via instance ref.
 * ADDITIVE ONLY. Menu: Dashboard (route: dashboard).
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
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
jest.mock('../../components/RequestComponent/RequestButtons/RequestButtons', () => () => <div data-testid="request-buttons" />);
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
        __esModule: true,
        default: Joyride,
        ACTIONS: { CLOSE: 'close' },
        EVENTS: { STEP_AFTER: 'step:after', TARGET_NOT_FOUND: 'error:target_not_found' },
        STATUS: { FINISHED: 'finished', SKIPPED: 'skipped' },
        CLOSE: 'close',
    };
});
jest.mock('../../services/Authenticator', () => ({
    scanLevel: jest.fn(() => true),
    scanFeature: jest.fn(() => true),
    check: jest.fn(() => true),
}));
jest.mock('../../store/actions/userActions', () => ({
    getNhoSurvey: jest.fn(), addNhoSurvey: jest.fn(), addEvaSurvey: jest.fn(), getEvaSurvey: jest.fn(),
    getUserCoc: jest.fn(), acknowledgeCOC: jest.fn(), getEvaReg: jest.fn(), submitEvaReg: jest.fn(),
    getHappinessSurvey: jest.fn(), addHappinessSurvey: jest.fn(), getUserAssets: jest.fn(), addUserAsset: jest.fn(),
}));

const Dashboard = require('../../container/Dashboard/Dashboard').default;

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

// baseline user: NO modal fires
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

beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
});

describe('Dashboard — componentDidMount modal gating', () => {
    test('baseline user opens no modals and renders EmployeeDashboard', () => {
        const { ref, getByTestId } = renderDashboard();
        getByTestId('employee-dashboard');
        const s = ref.current.state;
        expect(s.showModal).toBe(false);
        expect(s.showItamModal).toBe(false);
        expect(s.showEvaModal).toBe(false);
        expect(s.showCocModal).toBe(false);
        expect(s.showEvaRegModal).toBe(false);
        expect(s.showHappinessSurveyModal).toBe(false);
        expect(s.showReferralBannerModal).toBe(false);
    });

    test('new hire in week 1 gets a closable NHO modal; NHO survey fetched when unloaded', () => {
        const { ref, actions } = renderDashboard({
            is_user_nho_valid: '0', is_nho_loaded: false, user_nho_survey: {}, date_hired: daysAgo(3),
        });
        expect(actions.getNhoSurvey).toHaveBeenCalled();
        expect(ref.current.state.showModal).toBe(true);
        expect(ref.current.state.allowModalClose).toBe(true);
    });

    test('new hire in week 2 cannot close the NHO modal', () => {
        const { ref } = renderDashboard({
            is_user_nho_valid: '0', user_nho_survey: {}, date_hired: daysAgo(10),
        });
        expect(ref.current.state.showModal).toBe(true);
        expect(ref.current.state.allowModalClose).toBe(false);
    });

    test('15+ days without assets triggers ITAM modal; Client level is exempt', () => {
        const a = renderDashboard({ date_hired: daysAgo(20), user_assets: {}, is_asset_loaded: false });
        expect(a.actions.getUserAssets).toHaveBeenCalled();
        expect(a.ref.current.state.showItamModal).toBe(true);

        const b = renderDashboard({ date_hired: daysAgo(20), user_assets: {}, lvl_name: 'Client' });
        expect(b.ref.current.state.showItamModal).toBe(false);
    });

    test('pending EVA survey opens the EVA modal', () => {
        const { ref, actions } = renderDashboard({ is_eva_loaded: false, user_eva: { q1: null } });
        expect(actions.getEvaSurvey).toHaveBeenCalled();
        expect(ref.current.state.showEvaModal).toBe(true);
    });

    test('no COC record with 2+ forms opens COC mode 1', () => {
        const { ref } = renderDashboard({ user_coc: null }, { coc_forms: [1, 2] });
        expect(ref.current.state.showCocModal).toBe(true);
        expect(ref.current.state.coc_mode).toBe(1);
    });

    test('acknowledged-but-incomplete COC after 2 days opens COC mode 2', () => {
        const { ref } = renderDashboard(
            { user_coc: { is_acknowledged: 1, is_completed: 0, acknowledged_at: daysAgo(3) } },
            { coc_forms: [1, 2] }
        );
        expect(ref.current.state.showCocModal).toBe(true);
        expect(ref.current.state.coc_mode).toBe(2);
    });

    test('missing EVA registration and pending happiness survey open their modals', () => {
        const { ref } = renderDashboard(
            { user_eva_reg: null, user_happiness_survey: null, is_happiness_survey_loaded: false },
            { popup_flags: { happiness_survey: true } }
        );
        expect(ref.current.state.showEvaRegModal).toBe(true);
        expect(ref.current.state.showHappinessSurveyModal).toBe(true);
    });

    test('PH user with referral flag sees the banner once; onHide stamps sessionStorage', () => {
        const { ref } = renderDashboard({ country: 'Philippines' }, { popup_flags: { referral_banner: true } });
        expect(ref.current.state.showReferralBannerModal).toBe(true);

        ref.current.onHide();
        expect(sessionStorage.getItem('hasSeenReferralModal')).toBe('true');
        expect(ref.current.state.showReferralBannerModal).toBe(false);
        expect(ref.current.state.showModal).toBe(false);
    });
});

describe('Dashboard — onSubmitHandler branches', () => {
    test('eva/coc/happiness/default actions dispatch the matching thunks', () => {
        const { ref, actions } = renderDashboard();

        ref.current.onSubmitHandler({ action: 'eva', overall_satisfaction: 5 });
        expect(actions.addEvaSurvey).toHaveBeenCalledTimes(1);
        expect(actions.addEvaSurvey.mock.calls[0][0].get('overall_satisfaction')).toBe('5');

        ref.current.onSubmitHandler({ action: 'coc' });
        expect(actions.acknowledgeCOC).toHaveBeenCalledTimes(1);

        ref.current.onSubmitHandler({ action: 'happiness', salary_on_time: 4 });
        expect(actions.addHappinessSurvey).toHaveBeenCalledTimes(1);

        ref.current.onSubmitHandler({ nho_date: '2026-07-01', onboarding_exp_rating: 5 });
        expect(actions.addNhoSurvey).toHaveBeenCalledTimes(1);
        expect(actions.addNhoSurvey.mock.calls[0][0].get('nho_date')).toBe('2026-07-01'); // moment format arm
    });

    test('itam action asks for confirmation — accept submits assets, decline does not', () => {
        const { ref, actions } = renderDashboard();
        const confirmSpy = jest.spyOn(window, 'confirm');

        confirmSpy.mockReturnValueOnce(true);
        ref.current.setState({ equipment_list: [{ equipment_type: 'Laptop' }] });
        ref.current.onSubmitHandler({ action: 'itam' });
        expect(actions.addUserAsset).toHaveBeenCalledWith([{ equipment_type: 'Laptop' }]);

        confirmSpy.mockReturnValueOnce(false);
        ref.current.onSubmitHandler({ action: 'itam' });
        expect(actions.addUserAsset).toHaveBeenCalledTimes(1); // unchanged
        confirmSpy.mockRestore();
    });

    test('add_equipment appends to the list and the ITAM table renders all display arms', () => {
        // ITAM modal must be open so the getElementById reset targets exist; the
        // add_equipment_type input additionally requires showAddEquipment (Others chosen)
        const { ref, getByText, getAllByText } = renderDashboard({ date_hired: daysAgo(20), user_assets: {} });
        expect(ref.current.state.showItamModal).toBe(true);
        ref.current.setState({ showAddEquipment: true });

        ref.current.onSubmitHandler({
            action: 'add_equipment', personal_equipment: '1', equipment_type: 'Others',
            serial_no: 'SN-1', asset_tag: null, add_equipment_type: 'Docking Station',
        });
        ref.current.onSubmitHandler({
            action: 'add_equipment', personal_equipment: '2', equipment_type: 'Laptop',
            serial_no: null, asset_tag: 'TAG-9', add_equipment_type: '',
        });

        expect(ref.current.state.equipment_list.length).toBe(2);
        getByText('Others: Docking Station'); // Others arm
        // 'Laptop'/'Yes'/'No' also exist as <option> labels in the selects → count them
        expect(getAllByText('Laptop').length).toBeGreaterThanOrEqual(2); // option + table cell
        expect(getAllByText('Yes').length).toBeGreaterThanOrEqual(2);    // personal_equipment 1
        expect(getAllByText('No').length).toBeGreaterThanOrEqual(2);     // personal_equipment 2
        getByText('TAG-9');
    });

    test('FINDING DASH-ITAM-1: Add Equipment without "Others" selected throws on the missing input', () => {
        // onSubmitHandler unconditionally clears #add_equipment_type, which only renders
        // when equipment_type === 'Others' (showAddEquipment). For every other type the
        // click adds the row and then throws TypeError (null.value) — an uncaught error
        // in the click handler on prod. Fix: null-check before clearing (or reset via
        // Formik instead of getElementById). Flip when fixed.
        const { ref } = renderDashboard({ date_hired: daysAgo(20), user_assets: {} });
        expect(() => ref.current.onSubmitHandler({
            action: 'add_equipment', personal_equipment: '1', equipment_type: 'Laptop',
            serial_no: 'SN-2', asset_tag: 'TAG-2', add_equipment_type: '',
        })).toThrow(TypeError);
        expect(ref.current.state.equipment_list.length).toBe(1); // row added before the throw
    });
});

describe('Dashboard — joyride and popup', () => {
    test('joyride finished/close/step-9 all stop the tour and dispatch WORK_TOUR off', () => {
        const { ref, actions } = renderDashboard();

        ref.current.handleJoyrideCallback({ action: 'next', index: 2, status: 'finished', type: 'tour:end' });
        expect(ref.current.state.run).toBe(false);
        expect(actions.dispatch).toHaveBeenCalledWith({ type: 'WORK_TOUR', worktour: false });

        actions.dispatch.mockClear();
        ref.current.handleJoyrideCallback({ action: 'close', index: 3, status: 'running', type: 'step:after' });
        expect(actions.dispatch).toHaveBeenCalledWith({ type: 'WORK_TOUR', worktour: false });

        ref.current.setState({ run: true });
        ref.current.handleJoyrideCallback({ action: 'next', index: 9, status: 'running', type: 'step:after' });
        expect(ref.current.state.run).toBe(false);
    });

    test('openPopup submits the EVA registration and handles blocked + focused popups', () => {
        const { ref, actions } = renderDashboard();
        const openSpy = jest.spyOn(window, 'open');
        const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

        openSpy.mockReturnValueOnce(null); // blocked
        expect(ref.current.openPopup('http://x')).toBe(false);
        expect(actions.submitEvaReg).toHaveBeenCalledTimes(1);
        expect(alertSpy).toHaveBeenCalled();

        const focus = jest.fn();
        openSpy.mockReturnValueOnce({ closed: false, focus });
        expect(ref.current.openPopup('http://x')).toBe(true);
        expect(focus).toHaveBeenCalled();

        openSpy.mockRestore();
        alertSpy.mockRestore();
    });
});
