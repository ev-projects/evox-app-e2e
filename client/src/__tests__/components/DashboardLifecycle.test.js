/**
 * DashboardLifecycle.test.js
 * Lifecycle coverage for container/Dashboard/Dashboard.js — the landing page every user sees.
 *
 * PHASE 1 MOUNT/LOAD   componentDidMount decides which of the six data blocks to fetch
 *                      (NHO survey, user assets/ITAM, EVA survey, Code of Conduct,
 *                      EVA registration, Happiness survey) and which pop-ups to open.
 * PHASE 2 DATA ARRIVES the loaded user record drives every modal gate; the equipment list
 *                      block swaps its "No assets added yet" empty state for a table.
 * PHASE 3 USER ACTIONS survey typing, equipment-type dropdown, guided-tour callbacks,
 *                      EVA registration popup, closing pop-ups.
 * PHASE 4 SUBMIT       add-equipment, ITAM confirm (accepted + cancelled), EVA, COC,
 *                      Happiness and NHO submissions, plus the invalid arm where Yup
 *                      validation blocks the call.
 *
 * Every phase carries both the happy path and the empty/guard/failure arm.
 * ADDITIVE ONLY.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
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

jest.mock('react-bootstrap', () => {
    const React2 = require('react');
    const Modal = ({ show, children }) =>
        show ? React2.createElement('div', { className: 'modal' }, children) : null;
    Modal.Header = ({ children }) => React2.createElement('div', null, children);
    Modal.Title  = ({ children }) => React2.createElement('div', null, children);
    Modal.Body   = ({ children }) => React2.createElement('div', null, children);
    Modal.Footer = ({ children }) => React2.createElement('div', null, children);

    const Form = ({ children }) => React2.createElement('div', null, children);
    Form.Control = { Feedback: ({ children }) => React2.createElement('div', null, children) };

    return {
        Modal,
        Form,
        Container: ({ children }) => React2.createElement('div', null, children),
        Row:       ({ children }) => React2.createElement('div', null, children),
        Col:       ({ children }) => React2.createElement('div', null, children),
        Table:     ({ children }) => React2.createElement('div', null, children),
        Image:     () => React2.createElement('img', { alt: '' }),
        Spinner:   () => React2.createElement('div', null),
        Button:    ({ children, onClick, type, disabled }) =>
            React2.createElement('button', { type, onClick, disabled }, children),
    };
});

jest.mock('react-joyride', () => ({
    __esModule: true,
    default: () => <div data-testid="joyride" />,
    ACTIONS: { CLOSE: 'close', PREV: 'prev', NEXT: 'next' },
    EVENTS:  { STEP_AFTER: 'step:after', TARGET_NOT_FOUND: 'error:target_not_found' },
    STATUS:  { FINISHED: 'finished', SKIPPED: 'skipped', RUNNING: 'running' },
    CLOSE:   'close',
}));

jest.mock('react-player/lazy', () => () => <div data-testid="player" />);
jest.mock('../../components/Dashboard/EmployeeDashboard', () => () => <div data-testid="employee-dashboard" />);
jest.mock('../../components/Dashboard/HandlerDashboard', () => () => <div data-testid="handler-dashboard" />);
jest.mock('../../components/Summary/SummaryDashbord', () => () => <div data-testid="summary-dashboard" />);
jest.mock('../../components/RequestComponent/RequestButtons/RequestSubtitle', () => () => <div />);
jest.mock('../../components/RequestComponent/RequestButtons/RequestButtons', () => () => <div />);
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate: () => <div data-testid="input-date" />,
    InputTime: () => <div data-testid="input-time" />,
}));
jest.mock('../../services/Helper', () => ({ getcurrentdate: () => '2026-08-04' }));
jest.mock('../../services/Authenticator', () => ({
    __esModule: true,
    default: { scanLevel: () => false, check: () => false },
}));
jest.mock('../../store/actions/userActions', () => ({
    getNhoSurvey: jest.fn(),
    addNhoSurvey: jest.fn(),
    addEvaSurvey: jest.fn(),
    getEvaSurvey: jest.fn(),
    getUserCoc: jest.fn(),
    acknowledgeCOC: jest.fn(),
    getEvaReg: jest.fn(),
    submitEvaReg: jest.fn(),
    getHappinessSurvey: jest.fn(),
    addHappinessSurvey: jest.fn(),
    getUserAssets: jest.fn(),
    addUserAsset: jest.fn(),
}));

global.links = new Proxy({}, { get: () => '/x/' });

// deterministic, inspectable FormData so we can assert exactly what is posted
class RecordingFormData {
    constructor() { this.fields = {}; }
    append(k, v) { this.fields[k] = v; }
    set(k, v)    { this.fields[k] = v; }
    get(k)       { return this.fields[k]; }
}
global.FormData = RecordingFormData;

// deterministic session storage (the referral banner reads it at construction time)
const sessionBag = {};
Object.defineProperty(window, 'sessionStorage', {
    configurable: true,
    value: {
        getItem: (k) => (k in sessionBag ? sessionBag[k] : null),
        setItem: (k, v) => { sessionBag[k] = String(v); },
        removeItem: (k) => { delete sessionBag[k]; },
        clear: () => { Object.keys(sessionBag).forEach((k) => delete sessionBag[k]); },
    },
});

const Dashboard = require('../../container/Dashboard/Dashboard').default;

const flush = () => act(() => Promise.resolve());

const daysAgo = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
};

/** A fully onboarded employee: everything cached, nothing to pop up. */
const baseUser = (over = {}) => ({
    id: 1,
    first_name: 'Ana',
    last_name: 'Cruz',
    emp_num: 'E-1',
    email: 'ana@example.com',
    country: 'India',
    lvl_name: 'Employee',
    date_hired: daysAgo(20),
    is_user_nho_valid: '1',
    is_nho_loaded: true,
    is_asset_loaded: true,
    is_eva_loaded: true,
    is_coc_loaded: true,
    is_happiness_survey_loaded: true,
    user_nho_survey: { id: 1 },
    user_assets: { 0: { id: 9 } },
    user_eva: {},
    user_coc: { is_acknowledged: 1, is_completed: 1, acknowledged_at: daysAgo(30) },
    user_eva_reg: { id: 1 },
    user_happiness_survey: { id: 1 },
    ...over,
});

const baseProps = (userOver = {}, settingsOver = {}) => ({
    user: baseUser(userOver),
    dashboard: { worktour: false },
    settings: { hr_list: [], popup_flags: {}, coc_forms: [], ...settingsOver },
    dispatch: jest.fn(),
    getNhoSurvey: jest.fn(),
    addNhoSurvey: jest.fn(),
    getUserAssets: jest.fn(),
    addUserAsset: jest.fn(),
    getEvaSurvey: jest.fn(),
    addEvaSurvey: jest.fn(),
    getUserCoc: jest.fn(),
    acknowledgeCOC: jest.fn(),
    getEvaReg: jest.fn(),
    submitEvaReg: jest.fn(),
    getHappinessSurvey: jest.fn(),
    addHappinessSurvey: jest.fn(),
});

const mountDashboard = (props) => {
    const ref = React.createRef();
    const utils = render(<Dashboard {...props} ref={ref} />);
    return { ...utils, ref };
};

describe('Dashboard — page lifecycle', () => {
    beforeEach(() => { window.sessionStorage.clear(); });
    afterEach(() => { jest.clearAllMocks(); jest.restoreAllMocks(); });

    // ------------------------------------------------------------------
    // PHASE 1 — MOUNT / LOAD
    // ------------------------------------------------------------------

    test('opening_the_dashboard_requests_every_block_the_user_has_not_loaded_yet', () => {
        const props = baseProps({
            is_user_nho_valid: '0',
            is_nho_loaded: false,
            is_asset_loaded: false,
            is_eva_loaded: false,
            is_coc_loaded: false,
            is_happiness_survey_loaded: false,
        });

        mountDashboard(props);

        expect(props.getNhoSurvey).toHaveBeenCalledTimes(1);
        expect(props.getUserAssets).toHaveBeenCalledTimes(1);
        expect(props.getEvaSurvey).toHaveBeenCalledTimes(1);
        expect(props.getUserCoc).toHaveBeenCalledTimes(1);
        expect(props.getHappinessSurvey).toHaveBeenCalledTimes(1);
    });

    test('opening_the_dashboard_again_skips_the_blocks_already_held_in_the_store', () => {
        const props = baseProps();

        mountDashboard(props);

        expect(props.getNhoSurvey).not.toHaveBeenCalled();
        expect(props.getUserAssets).not.toHaveBeenCalled();
        expect(props.getEvaSurvey).not.toHaveBeenCalled();
        expect(props.getUserCoc).not.toHaveBeenCalled();
        expect(props.getHappinessSurvey).not.toHaveBeenCalled();
    });

    test('the_employee_dashboard_block_is_always_rendered_before_any_popup_is_decided', () => {
        const { getByTestId } = mountDashboard(baseProps());
        expect(getByTestId('employee-dashboard')).toBeInTheDocument();
    });

    test('a_fully_onboarded_employee_lands_on_a_dashboard_with_no_popups_at_all', () => {
        const { queryByText } = mountDashboard(baseProps());

        expect(queryByText('We Love To Hear Your Onboarding Experience')).toBeNull();
        expect(queryByText('IT Asset Management')).toBeNull();
        expect(queryByText('We Love To Hear Your EVA Experience')).toBeNull();
        expect(queryByText('Code Of Conduct')).toBeNull();
        expect(queryByText('EVA Registration')).toBeNull();
    });

    test('a_new_hire_in_their_first_two_weeks_with_no_survey_is_shown_the_onboarding_survey', () => {
        const props = baseProps({
            is_user_nho_valid: '0',
            date_hired: daysAgo(3),
            user_nho_survey: {},
        });

        const { getByText, ref } = mountDashboard(props);

        expect(getByText('We Love To Hear Your Onboarding Experience')).toBeInTheDocument();
        expect(ref.current.state.showModal).toBe(true);
        expect(ref.current.state.allowModalClose).toBe(true);
    });

    test('a_new_hire_already_in_their_second_week_cannot_dismiss_the_onboarding_survey', () => {
        const props = baseProps({
            is_user_nho_valid: '0',
            date_hired: daysAgo(9),
            user_nho_survey: {},
        });

        const { ref } = mountDashboard(props);

        expect(ref.current.state.showModal).toBe(true);
        expect(ref.current.state.allowModalClose).toBe(false);
    });

    test('a_new_hire_who_already_answered_the_onboarding_survey_never_sees_the_popup', () => {
        const props = baseProps({
            is_user_nho_valid: '0',
            date_hired: daysAgo(3),
            user_nho_survey: { id: 44 },
        });

        const { queryByText, ref } = mountDashboard(props);

        expect(ref.current.state.showModal).toBe(false);
        expect(queryByText('We Love To Hear Your Onboarding Experience')).toBeNull();
    });

    test('an_employee_past_fifteen_days_with_no_declared_assets_is_asked_to_declare_equipment', () => {
        const props = baseProps({ date_hired: daysAgo(20), user_assets: {} });

        const { getByText, ref } = mountDashboard(props);

        expect(ref.current.state.showItamModal).toBe(true);
        expect(getByText('IT Asset Management')).toBeInTheDocument();
    });

    test('an_employee_still_inside_their_first_fifteen_days_is_not_asked_to_declare_equipment', () => {
        const props = baseProps({
            is_user_nho_valid: '1',
            date_hired: daysAgo(5),
            user_assets: {},
        });

        const { ref, queryByText } = mountDashboard(props);

        expect(ref.current.state.showItamModal).toBe(false);
        expect(queryByText('IT Asset Management')).toBeNull();
    });

    test('a_client_account_is_never_asked_to_declare_equipment_even_when_overdue', () => {
        const props = baseProps({
            date_hired: daysAgo(30),
            user_assets: {},
            lvl_name: 'Client',
        });

        const { ref, queryByText } = mountDashboard(props);

        expect(ref.current.state.showItamModal).toBe(false);
        expect(queryByText('IT Asset Management')).toBeNull();
    });

    test('an_employee_who_already_declared_assets_is_not_asked_a_second_time', () => {
        const props = baseProps({ date_hired: daysAgo(30), user_assets: { 0: { id: 3 } } });

        const { ref } = mountDashboard(props);

        expect(ref.current.state.showItamModal).toBe(false);
    });

    test('an_eva_record_waiting_for_the_user_opens_the_eva_feedback_form', () => {
        const props = baseProps({ user_eva: { id: 12, quarter: 'Q3' } });

        const { getByText, ref } = mountDashboard(props);

        expect(ref.current.state.showEvaModal).toBe(true);
        expect(getByText('We Love To Hear Your EVA Experience')).toBeInTheDocument();
    });

    test('no_eva_record_means_no_eva_feedback_form_on_screen', () => {
        const { ref, queryByText } = mountDashboard(baseProps({ user_eva: {} }));

        expect(ref.current.state.showEvaModal).toBe(false);
        expect(queryByText('We Love To Hear Your EVA Experience')).toBeNull();
    });

    test('a_user_with_no_code_of_conduct_record_is_shown_the_acknowledgement_form_first', () => {
        const props = baseProps(
            { user_coc: null },
            { coc_forms: [{ content: '<p>Form one</p>' }, { content: '<p>Form two</p>' }] },
        );

        const { getByText, ref } = mountDashboard(props);

        expect(ref.current.state.showCocModal).toBe(true);
        expect(ref.current.state.coc_mode).toBe(1);
        expect(getByText('Code Of Conduct')).toBeInTheDocument();
    });

    test('two_days_after_acknowledging_the_user_is_shown_the_code_of_conduct_confirmation_form', () => {
        const props = baseProps(
            { user_coc: { is_acknowledged: 1, is_completed: 0, acknowledged_at: daysAgo(3) } },
            { coc_forms: [{ content: '<p>Form one</p>' }, { content: '<p>Form two</p>' }] },
        );

        const { ref } = mountDashboard(props);

        expect(ref.current.state.showCocModal).toBe(true);
        expect(ref.current.state.coc_mode).toBe(2);
    });

    test('a_code_of_conduct_acknowledged_only_today_does_not_reopen_the_form_yet', () => {
        const props = baseProps(
            { user_coc: { is_acknowledged: 1, is_completed: 0, acknowledged_at: daysAgo(0) } },
            { coc_forms: [{ content: '<p>a</p>' }, { content: '<p>b</p>' }] },
        );

        const { ref, queryByText } = mountDashboard(props);

        expect(ref.current.state.showCocModal).toBe(false);
        expect(queryByText('Code Of Conduct')).toBeNull();
    });

    test('the_code_of_conduct_stays_closed_when_fewer_than_two_forms_are_configured', () => {
        const props = baseProps({ user_coc: null }, { coc_forms: [{ content: '<p>only one</p>' }] });

        const { ref, queryByText } = mountDashboard(props);

        expect(ref.current.state.showCocModal).toBe(false);
        expect(queryByText('Code Of Conduct')).toBeNull();
    });

    test('a_user_without_an_eva_registration_is_shown_the_registration_invite', () => {
        const { ref, getByText } = mountDashboard(baseProps({ user_eva_reg: null }));

        expect(ref.current.state.showEvaRegModal).toBe(true);
        expect(getByText('EVA Registration')).toBeInTheDocument();
    });

    test('a_user_who_already_registered_for_eva_is_not_invited_again', () => {
        const { ref, queryByText } = mountDashboard(baseProps({ user_eva_reg: { id: 5 } }));

        expect(ref.current.state.showEvaRegModal).toBe(false);
        expect(queryByText('EVA Registration')).toBeNull();
    });

    test('the_happiness_survey_opens_when_it_is_unanswered_and_the_popup_flag_is_switched_on', () => {
        const props = baseProps(
            { user_happiness_survey: null },
            { popup_flags: { happiness_survey: true } },
        );

        const { ref } = mountDashboard(props);

        expect(ref.current.state.showHappinessSurveyModal).toBe(true);
    });

    test('the_happiness_survey_stays_closed_while_the_popup_flag_is_switched_off', () => {
        const props = baseProps(
            { user_happiness_survey: null },
            { popup_flags: { happiness_survey: false } },
        );

        const { ref } = mountDashboard(props);

        expect(ref.current.state.showHappinessSurveyModal).toBe(false);
    });

    test('the_referral_banner_greets_a_philippines_user_who_has_not_seen_it_this_session', () => {
        const props = baseProps({ country: 'Philippines' }, { popup_flags: { referral_banner: true } });

        const { ref } = mountDashboard(props);

        expect(ref.current.state.showReferralBannerModal).toBe(true);
    });

    test('the_referral_banner_stays_hidden_once_it_has_already_been_seen_this_session', () => {
        window.sessionStorage.setItem('hasSeenReferralModal', 'true');
        const props = baseProps({ country: 'Philippines' }, { popup_flags: { referral_banner: true } });

        const { ref } = mountDashboard(props);

        expect(ref.current.state.showReferralBannerModal).toBe(false);
    });

    test('the_referral_banner_is_not_shown_to_users_outside_the_philippines', () => {
        const props = baseProps({ country: 'India' }, { popup_flags: { referral_banner: true } });

        const { ref } = mountDashboard(props);

        expect(ref.current.state.showReferralBannerModal).toBe(false);
    });

    // ------------------------------------------------------------------
    // PHASE 2 — DATA ARRIVES / RE-RENDER
    // ------------------------------------------------------------------

    test('the_equipment_block_shows_its_empty_message_until_a_first_item_is_added', () => {
        const props = baseProps({ date_hired: daysAgo(20), user_assets: {} });
        const { getByText, queryByText, container, ref } = mountDashboard(props);

        expect(getByText('No assets added yet')).toBeInTheDocument();
        expect(container.querySelector('table tbody')).toBeNull();

        act(() => {
            ref.current.setState({
                equipment_list: [{
                    personal_equipment: '1', equipment_type: 'Laptop',
                    serial_no: 'SN-1', asset_tag: 'AT-1', add_equipment_type: '',
                }],
            });
        });

        expect(queryByText('No assets added yet')).toBeNull();
        const cells = [...container.querySelectorAll('table tbody td')].map((td) => td.textContent);
        expect(cells).toEqual(['Yes', 'Laptop', 'SN-1', 'AT-1']);
    });

    test('an_others_equipment_row_is_listed_with_the_free_text_description_appended', () => {
        const props = baseProps({ date_hired: daysAgo(20), user_assets: {} });
        const { getByText, container, ref } = mountDashboard(props);

        act(() => {
            ref.current.setState({
                equipment_list: [{
                    personal_equipment: '2', equipment_type: 'Others',
                    serial_no: null, asset_tag: null, add_equipment_type: 'Docking Station',
                }],
            });
        });

        // missing serial / asset tag fall back to "N/A" rather than blank cells
        const cells = [...container.querySelectorAll('table tbody td')].map((td) => td.textContent);
        expect(cells).toEqual(['No', 'Others: Docking Station', 'N/A', 'N/A']);
        expect(getByText('Confirm')).toBeInTheDocument();
    });

    test('the_code_of_conduct_form_renders_the_content_configured_for_the_current_mode', () => {
        const props = baseProps(
            { user_coc: null },
            { coc_forms: [{ content: '<p>First acknowledgement text</p>' }, { content: '<p>Second confirmation text</p>' }] },
        );

        const { getByText, ref } = mountDashboard(props);
        expect(getByText('First acknowledgement text')).toBeInTheDocument();

        act(() => { ref.current.setState({ coc_mode: 2 }); });
        expect(getByText('Second confirmation text')).toBeInTheDocument();
    });

    // ------------------------------------------------------------------
    // PHASE 3 — USER ACTIONS
    // ------------------------------------------------------------------

    test('typing_an_answer_into_a_survey_field_is_remembered_on_the_page', () => {
        const { ref } = mountDashboard(baseProps());

        act(() => {
            ref.current.handleChange({ target: { name: 'serial_no', value: 'SN-777' } });
        });

        expect(ref.current.state.serial_no).toBe('SN-777');
    });

    test('choosing_others_as_the_equipment_type_reveals_the_extra_description_field', () => {
        const props = baseProps({ date_hired: daysAgo(20), user_assets: {} });
        mountDashboard(props);

        expect(document.getElementById('add_equipment_type')).toBeNull();

        fireEvent.change(document.getElementById('equipment_type'), { target: { value: 'Others' } });

        expect(document.getElementById('add_equipment_type')).not.toBeNull();
    });

    test('switching_the_equipment_type_back_to_a_standard_item_hides_the_extra_field_again', () => {
        const props = baseProps({ date_hired: daysAgo(20), user_assets: {} });
        mountDashboard(props);

        fireEvent.change(document.getElementById('equipment_type'), { target: { value: 'Others' } });
        expect(document.getElementById('add_equipment_type')).not.toBeNull();

        fireEvent.change(document.getElementById('equipment_type'), { target: { value: 'Laptop' } });
        expect(document.getElementById('add_equipment_type')).toBeNull();
    });

    test('closing_a_popup_hides_every_popup_and_remembers_the_referral_banner_was_seen', () => {
        const props = baseProps({ country: 'Philippines' }, { popup_flags: { referral_banner: true } });
        const { ref } = mountDashboard(props);

        act(() => { ref.current.setState({ showModal: true, showItamModal: true, showEvaModal: true, showCocModal: true }); });
        act(() => { ref.current.onHide(); });

        expect(ref.current.state.showModal).toBe(false);
        expect(ref.current.state.showItamModal).toBe(false);
        expect(ref.current.state.showEvaModal).toBe(false);
        expect(ref.current.state.showCocModal).toBe(false);
        expect(ref.current.state.showReferralBannerModal).toBe(false);
        expect(window.sessionStorage.getItem('hasSeenReferralModal')).toBe('true');
    });

    test('the_i_agree_button_stays_disabled_until_the_code_of_conduct_box_is_ticked', () => {
        const props = baseProps(
            { user_coc: null },
            { coc_forms: [{ content: '<p>a</p>' }, { content: '<p>b</p>' }] },
        );
        const { getByText, container } = mountDashboard(props);

        expect(getByText('I Agree').closest('button')).toBeDisabled();

        const checkbox = container.querySelector('input[type="checkbox"]');
        fireEvent.click(checkbox);

        expect(getByText('I Agree').closest('button')).not.toBeDisabled();
    });

    test('finishing_the_guided_tour_switches_it_off_and_records_that_in_the_store', () => {
        const props = baseProps();
        const { ref } = mountDashboard(props);

        act(() => { ref.current.setState({ run: true }); });
        act(() => { ref.current.handleJoyrideCallback({ action: 'next', index: 2, status: 'finished', type: 'step:after' }); });

        expect(ref.current.state.run).toBe(false);
        expect(props.dispatch).toHaveBeenCalledWith({ type: 'WORK_TOUR', worktour: false });
    });

    test('closing_the_guided_tour_early_also_switches_it_off', () => {
        const props = baseProps();
        const { ref } = mountDashboard(props);

        act(() => { ref.current.setState({ run: true }); });
        act(() => { ref.current.handleJoyrideCallback({ action: 'close', index: 1, status: 'running', type: 'step:after' }); });

        expect(ref.current.state.run).toBe(false);
        expect(props.dispatch).toHaveBeenCalledWith({ type: 'WORK_TOUR', worktour: false });
    });

    test('stepping_through_the_tour_keeps_it_running_and_tracks_the_current_step', () => {
        const props = baseProps();
        const { ref } = mountDashboard(props);

        act(() => { ref.current.setState({ run: true }); });
        act(() => { ref.current.handleJoyrideCallback({ action: 'next', index: 3, status: 'running', type: 'step:after' }); });

        expect(ref.current.state.stepIndex).toBe(3);
        expect(ref.current.state.run).toBe(true);
        expect(props.dispatch).not.toHaveBeenCalled();
    });

    test('reaching_the_last_tour_step_stops_the_tour_without_touching_the_store', () => {
        const props = baseProps();
        const { ref } = mountDashboard(props);

        act(() => { ref.current.setState({ run: true }); });
        act(() => { ref.current.handleJoyrideCallback({ action: 'next', index: 9, status: 'running', type: 'step:after' }); });

        expect(ref.current.state.run).toBe(false);
        expect(props.dispatch).not.toHaveBeenCalled();
    });

    test('opening_the_eva_registration_link_records_the_click_and_focuses_the_new_window', () => {
        const props = baseProps({ user_eva_reg: null });
        const { ref } = mountDashboard(props);

        const focus = jest.fn();
        jest.spyOn(window, 'open').mockReturnValue({ closed: false, focus });

        let result;
        act(() => { result = ref.current.openPopup('https://events.example.com/eva'); });

        expect(props.submitEvaReg).toHaveBeenCalledTimes(1);
        expect(window.open).toHaveBeenCalledWith('https://events.example.com/eva', 'popupWindow', 'width=600,height=400');
        expect(focus).toHaveBeenCalledTimes(1);
        expect(result).toBe(true);
    });

    test('a_blocked_eva_registration_popup_warns_the_user_instead_of_failing_silently', () => {
        const props = baseProps({ user_eva_reg: null });
        const { ref } = mountDashboard(props);

        jest.spyOn(window, 'open').mockReturnValue(null);
        const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

        let result;
        act(() => { result = ref.current.openPopup('https://events.example.com/eva'); });

        expect(props.submitEvaReg).toHaveBeenCalledTimes(1);
        expect(alertSpy).toHaveBeenCalledWith('Popup was blocked by the browser!');
        expect(result).toBe(false);
    });

    // ------------------------------------------------------------------
    // PHASE 4 — SUBMIT
    // ------------------------------------------------------------------

    test('adding_an_others_equipment_appends_it_to_the_list_and_clears_the_input_fields', () => {
        const props = baseProps({ date_hired: daysAgo(20), user_assets: {} });
        const { ref } = mountDashboard(props);

        // the free-text field only exists once "Others" has been chosen
        fireEvent.change(document.getElementById('equipment_type'), { target: { value: 'Others' } });
        document.getElementById('personal_equipment').value = '1';
        document.getElementById('serial_no').value = 'SN-1';
        document.getElementById('asset_tag').value = 'AT-1';
        document.getElementById('add_equipment_type').value = 'Docking Station';

        act(() => {
            ref.current.onSubmitHandler({
                action: 'add_equipment',
                personal_equipment: '1',
                equipment_type: 'Others',
                serial_no: 'SN-1',
                asset_tag: 'AT-1',
                add_equipment_type: 'Docking Station',
            });
        });

        expect(ref.current.state.equipment_list).toEqual([{
            personal_equipment: '1',
            equipment_type: 'Others',
            serial_no: 'SN-1',
            asset_tag: 'AT-1',
            add_equipment_type: 'Docking Station',
        }]);
        expect(document.getElementById('serial_no').value).toBe('');
        expect(document.getElementById('asset_tag').value).toBe('');
        expect(document.getElementById('add_equipment_type').value).toBe('');
        expect(props.addUserAsset).not.toHaveBeenCalled();
    });

    test('adding_a_standard_equipment_crashes_because_it_clears_a_field_that_is_not_on_screen_FINDING_DASH_ITAM_1', () => {
        // FINDING DASH-ITAM-1: onSubmitHandler unconditionally clears #add_equipment_type,
        // but that input only renders while the equipment type is "Others". Adding a
        // Laptop/Desktop/etc. therefore throws before the equipment is ever recorded.
        const props = baseProps({ date_hired: daysAgo(20), user_assets: {} });
        const { ref } = mountDashboard(props);

        fireEvent.change(document.getElementById('equipment_type'), { target: { value: 'Laptop' } });
        expect(document.getElementById('add_equipment_type')).toBeNull();

        expect(() => {
            ref.current.onSubmitHandler({
                action: 'add_equipment',
                personal_equipment: '1',
                equipment_type: 'Laptop',
                serial_no: 'SN-2',
                asset_tag: 'AT-2',
                add_equipment_type: '',
            });
        }).toThrow();

        // the item is still added to state before the crash, but the form is left half-cleared
        expect(ref.current.state.equipment_list).toHaveLength(1);
        expect(document.getElementById('serial_no').value).toBe('');
        expect(props.addUserAsset).not.toHaveBeenCalled();
    });

    test('confirming_the_data_declaration_statement_saves_the_whole_equipment_list', () => {
        const props = baseProps({ date_hired: daysAgo(20), user_assets: {} });
        const { ref } = mountDashboard(props);

        const list = [{ personal_equipment: '1', equipment_type: 'Laptop', serial_no: 'SN-1', asset_tag: 'AT-1', add_equipment_type: '' }];
        act(() => { ref.current.setState({ equipment_list: list }); });

        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        act(() => { ref.current.onSubmitHandler({ action: 'itam' }); });

        expect(confirmSpy).toHaveBeenCalled();
        expect(props.addUserAsset).toHaveBeenCalledWith(list);
        expect(ref.current.state.allowModalClose).toBe(true);
    });

    test('cancelling_the_data_declaration_statement_saves_nothing', () => {
        const props = baseProps({ date_hired: daysAgo(20), user_assets: {} });
        const { ref } = mountDashboard(props);

        act(() => {
            ref.current.setState({ equipment_list: [{ personal_equipment: '1', equipment_type: 'Laptop', serial_no: 'SN-1', asset_tag: 'AT-1' }] });
        });

        jest.spyOn(window, 'confirm').mockReturnValue(false);
        act(() => { ref.current.onSubmitHandler({ action: 'itam' }); });

        expect(props.addUserAsset).not.toHaveBeenCalled();
    });

    test('submitting_the_onboarding_survey_formats_the_hire_date_and_drops_unanswered_fields', () => {
        const props = baseProps({ is_user_nho_valid: '0', date_hired: daysAgo(3), user_nho_survey: {} });
        const { ref } = mountDashboard(props);

        act(() => {
            ref.current.onSubmitHandler({
                nho_date: '2026-01-15',
                onboarding_exp_rating: '5',
                suggestions: 'More coffee',
                nho_overall_feedback: null,
            });
        });

        expect(props.addNhoSurvey).toHaveBeenCalledTimes(1);
        const sent = props.addNhoSurvey.mock.calls[0][0].fields;
        expect(sent.nho_date).toBe('2026-01-15');
        expect(sent.onboarding_exp_rating).toBe('5');
        expect(sent.suggestions).toBe('More coffee');
        expect('nho_overall_feedback' in sent).toBe(false);
    });

    test('submitting_the_eva_survey_sends_the_answers_and_leaves_the_other_surveys_alone', () => {
        const props = baseProps({ user_eva: { id: 2 } });
        const { ref } = mountDashboard(props);

        act(() => {
            ref.current.onSubmitHandler({ action: 'eva', attended_via: 'Online', overall_satisfaction: '4' });
        });

        expect(props.addEvaSurvey).toHaveBeenCalledTimes(1);
        const sent = props.addEvaSurvey.mock.calls[0][0].fields;
        expect(sent.attended_via).toBe('Online');
        expect(sent.overall_satisfaction).toBe('4');
        expect(props.addNhoSurvey).not.toHaveBeenCalled();
        expect(props.addHappinessSurvey).not.toHaveBeenCalled();
    });

    test('agreeing_to_the_code_of_conduct_records_the_acknowledgement_without_posting_a_form', () => {
        const props = baseProps(
            { user_coc: null },
            { coc_forms: [{ content: '<p>a</p>' }, { content: '<p>b</p>' }] },
        );
        const { ref } = mountDashboard(props);

        act(() => { ref.current.onSubmitHandler({ action: 'coc' }); });

        expect(props.acknowledgeCOC).toHaveBeenCalledTimes(1);
        expect(props.addNhoSurvey).not.toHaveBeenCalled();
    });

    test('submitting_the_happiness_survey_sends_every_answered_question', () => {
        const props = baseProps({ user_happiness_survey: null }, { popup_flags: { happiness_survey: true } });
        const { ref } = mountDashboard(props);

        act(() => {
            ref.current.onSubmitHandler({
                action: 'happiness',
                focused_motivated: '5',
                salary_level: '3',
                happiness_suggestion: null,
            });
        });

        expect(props.addHappinessSurvey).toHaveBeenCalledTimes(1);
        const sent = props.addHappinessSurvey.mock.calls[0][0].fields;
        expect(sent.focused_motivated).toBe('5');
        expect(sent.salary_level).toBe('3');
        expect('happiness_suggestion' in sent).toBe(false);
    });

    test('pressing_add_equipment_with_an_empty_form_shows_the_errors_and_never_records_anything', async () => {
        const props = baseProps({ date_hired: daysAgo(20), user_assets: {} });
        const { getByText, getAllByText, ref } = mountDashboard(props);

        await act(async () => { fireEvent.click(getByText('Add Equipment').closest('button')); });
        await flush();

        expect(getAllByText('This field is required').length).toBeGreaterThan(0);
        expect(ref.current.state.equipment_list).toEqual([]);
        expect(props.addUserAsset).not.toHaveBeenCalled();
        expect(getByText('No assets added yet')).toBeInTheDocument();
    });
});
