/**
 * AssetAndMiscLifecycle.test.js
 *
 * Full page-lifecycle coverage for three screens that the action inventory
 * (Latest-Test-30-07-2026/ui-action-inventory.csv) still lists with only the generic
 * evoxtest_ConnectWiring_frontend.test.js against them - i.e. every ACTION/SUBMIT row is
 * action-untested:
 *
 *   1. AssetManagementForm   components/AssetManagementForm/AssetManagementForm.js   (4 actions)
 *      Menu: My Profile -> IT Asset Management
 *   2. DtrMultiLogsSummary   container/MyTeam/DtrMultiLogsSummary/DtrMultiLogsSummary.js (4 actions)
 *      Menu: My Team -> DTR Multi-Clock In Summary
 *   3. MyRequestsDispute     container/MyRequestsDispute/MyRequestsDispute.js         (4 actions)
 *      Menu: My Requests -> Dispute
 *
 * Picked because each has 2+ untested actions, none is a Referjobs screen (confirmed dead),
 * and none overlaps the Dashboard / MultiQuickPunch / MyTeamRequests / NavPuncher /
 * ProfileAndSchedule / ReportsParameter packets already in this tree.
 *
 * Every screen is walked phase by phase:
 *   PHASE 1  MOUNT/LOAD    constructor defaults + componentDidMount dispatches, and the
 *                          pre-data render (loading page / empty table)
 *   PHASE 2  DATA ARRIVES  props land -> what renders, plus the EMPTY-data arm
 *   PHASE 3  USER ACTIONS  every control: selects, tabs, status toggles, date filter,
 *                          conditional "Others" field, Back, row-edit
 *   PHASE 4  SUBMIT        valid AND invalid, confirm accepted AND cancelled, the exact
 *                          payload dispatched, and the Add vs Update branch split
 *
 * Characterisation tests (they assert TODAY's behaviour, they do not endorse it):
 *   AMF-CONFIRM-1  cancelling the data-confirmation dialog silently drops the whole form -
 *                  no error, no message, the typed asset is simply never saved.
 *   AMF-UPDATE-1   the Update branch navigates away with window.location.href BEFORE the
 *                  update dispatch can resolve, and it never asks for confirmation even
 *                  though Add does.
 *   AMF-EDIT-1     the per-row edit control is a type="submit" button inside the asset form;
 *                  it only avoids submitting the form because of a manual preventDefault().
 *   DTR-LOG-1      the whole summary payload is console.log'd on every single render.
 *   DTR-ID-1       Generate and Export both render id="btn-generate" - a duplicate DOM id.
 *   MRD-LOAD-1     componentDidMount guards on this.props.isListLoaded, a prop this screen's
 *                  mapStateToProps never supplies (it maps isDisputeListLoaded), so the
 *                  guard is always true and the list is refetched on every mount.
 *   MRD-TZ-1       the mount fetch converts the payroll cutoff with toISOString() while the
 *                  filter submit uses moment().format() - east of UTC (PH is UTC+8) the two
 *                  paths send DIFFERENT dates for the same cutoff.
 *   MRD-PAGE-1     <Paginate pagination={dispute_request_list} /> is handed the row ARRAY,
 *                  not the paginator object, so last_page/current_page are undefined.
 *
 * ADDITIVE ONLY - no existing test touched, no application code changed.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

const mockDispatch = jest.fn((a) => a);
jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => mockDispatch,
}));

/* ------------------------------------------------------------------ layout stubs */

jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader:  ({ children }) => <div>{children}</div>,
    Content:          ({ children, title }) => <div>{title}{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
    Row:              ({ children }) => <div>{children}</div>,
    Col:              ({ children }) => <div>{children}</div>,
}));
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading" />);
jest.mock('../../components/RequestComponent/RequestButtons/RequestButtons', () => () => null);
jest.mock('../../components/RequestComponent/RequestButtons/RequestSubtitle', () => () => null);

// Date pickers: rendered as markers so the real calendar never boots.
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => {
    const R = require('react');
    return {
        InputDate: ({ name }) => R.createElement('div', { 'data-testid': 'date-' + name }),
        InputTime: () => R.createElement('div', null),
    };
});
jest.mock('react-datepicker', () => () => null);

// Paginate stub that records what the screen handed it (see FINDING MRD-PAGE-1).
const mockPaginateProps = [];
jest.mock('../../components/Template/Paginate', () => {
    const R = require('react');
    return (props) => {
        mockPaginateProps.push(props.pagination);
        return R.createElement('div', { 'data-testid': 'paginate' });
    };
});

jest.mock('react-bootstrap', () => {
    const R = require('react');
    const Form = ({ children }) => R.createElement('div', null, children);
    Form.Control = { Feedback: ({ children }) => R.createElement('div', null, children) };
    return {
        Form,
        Container:   ({ children }) => R.createElement('div', null, children),
        Row:         ({ children, className }) => R.createElement('div', { className }, children),
        Col:         ({ children, className }) => R.createElement('div', { className }, children),
        Table:       ({ children }) => R.createElement('table', null, children),
        Badge:       ({ children }) => R.createElement('span', null, children),
        FormControl: (p) => R.createElement('input', p),
        Pagination:  ({ children }) => R.createElement('div', null, children),
        ButtonGroup: ({ children }) => R.createElement('div', null, children),
        Dropdown:    ({ children }) => R.createElement('div', null, children),
        Button: ({ children, onClick, type, className, id }) =>
            R.createElement('button', { type: type || 'button', onClick, className, id }, children),
        ToggleButton: ({ children, onClick, checked }) =>
            R.createElement('button',
                { type: 'button', onClick, 'data-checked': String(!!checked), className: 'toggle-btn' },
                children),
        Tabs: ({ children, onSelect, defaultActiveKey }) =>
            R.createElement('div', { 'data-testid': 'tabs', 'data-active': defaultActiveKey },
                R.Children.toArray(children).map((child) =>
                    R.createElement('button', {
                        key: child.props.eventKey,
                        type: 'button',
                        'data-testid': 'tab-' + child.props.eventKey,
                        onClick: () => onSelect(child.props.eventKey),
                    }, child.props.title))),
        Tab: () => null,
    };
});

/* ------------------------------------------------------------------ service stubs */

jest.mock('../../services/API', () => ({ call: jest.fn() }));
jest.mock('../../services/Authenticator', () => ({
    scanFeature: jest.fn(() => true),
    scanLevel:   jest.fn(() => true),
}));

jest.mock('../../store/actions/userActions', () => ({
    getUserAsset:    jest.fn(), getUserAssets:   jest.fn(),
    addUserAsset:    jest.fn(), updateUserAsset: jest.fn(),
}));
jest.mock('../../store/actions/redirectActions', () => ({ setRedirect: jest.fn() }));
jest.mock('../../store/actions/dtr/dtrSummaryActions.js', () => ({
    fetchDtrMultiLogsSummary:  jest.fn(),
    exportDtrMultiLogsSummary: jest.fn(),
}));
jest.mock('../../store/actions/filters/requestListActions', () => ({
    fetchRequestListDisputes: jest.fn(),
    fetchStatusNumbers:       jest.fn(),
}));

import Authenticator from '../../services/Authenticator';

global.links = new Proxy({}, { get: () => '/x/' });

const AssetManagementForm =
    require('../../components/AssetManagementForm/AssetManagementForm').default;
const DtrMultiLogsSummary =
    require('../../container/MyTeam/DtrMultiLogsSummary/DtrMultiLogsSummary').default;
const MyRequestsDispute =
    require('../../container/MyRequestsDispute/MyRequestsDispute').default;

/* ------------------------------------------------------------------ helpers */

const flush = () => act(async () => { await Promise.resolve(); });

// Formik validates on a promise chain, so a submit needs a couple of microtask turns.
const settle = async () => { await flush(); await flush(); await flush(); };

const btn = (container, label) =>
    Array.from(container.querySelectorAll('button'))
        .find((b) => b.textContent.indexOf(label) !== -1);

// Typing into a text box: assign through the native setter so React's value tracker
// still sees a change and fires onChange.
const typeInto = (el, value) => {
    const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, value);
    fireEvent.change(el);
};

const fdToObject = (fd) => {
    const out = {};
    Array.from(fd.entries()).forEach(([k, v]) => { out[k] = v; });
    return out;
};

/* ================================================================================== */
/* 1. ASSET MANAGEMENT FORM                                                            */
/* ================================================================================== */

describe('IT Asset Management form - page lifecycle', () => {

    const ASSETS = [
        { id: 21, equipment_type: 'Laptop', personal_equipment: 1, serial_no: 'SN-21', asset_tag: 'AT-21' },
        { id: 22, equipment_type: 'Mouse',  personal_equipment: 2, serial_no: null,    asset_tag: null },
        { id: 23, equipment_type: 'Others', personal_equipment: 9, serial_no: 'SN-23', asset_tag: 'AT-23' },
    ];

    const baseProps = (over = {}) => ({
        params: {},
        user: {
            id: 7, first_name: 'Ana', last_name: 'Cruz', emp_num: 'E-007',
            email: 'ana@example.com', is_asset_loaded: false,
            user_assets: ASSETS, user_asset: null,
        },
        history: { goBack: jest.fn() },
        constant: {}, settings: {},
        getUserAsset:    jest.fn(),
        getUserAssets:   jest.fn(),
        addUserAsset:    jest.fn(),
        updateUserAsset: jest.fn(),
        setRedirect:     jest.fn(),
        ...over,
    });

    const renderForm = (props) => render(
        <MemoryRouter><AssetManagementForm {...props} /></MemoryRouter>
    );

    let realLocation;
    beforeAll(() => {
        realLocation = window.location;
        delete window.location;
        window.location = { href: '' };
    });
    afterAll(() => { window.location = realLocation; });

    beforeEach(() => { window.location.href = ''; });
    afterEach(() => jest.clearAllMocks());

    // fill the four required fields so validation can pass
    const fillValidAsset = async (container, { equipment = 'Laptop' } = {}) => {
        await act(async () => {
            fireEvent.change(container.querySelector('select[name="personal_equipment"]'),
                { target: { value: '1' } });
        });
        await act(async () => {
            fireEvent.change(container.querySelector('select[name="equipment_type"]'),
                { target: { value: equipment } });
        });
        await act(async () => { typeInto(container.querySelector('input[name="serial_no"]'), 'SN-1'); });
        await act(async () => { typeInto(container.querySelector('input[name="asset_tag"]'), 'AT-1'); });
        await flush();
    };

    /* ------------------------------------------------------- PHASE 1 - MOUNT/LOAD */

    test('opening_asset_management_without_an_asset_id_asks_the_server_for_the_full_list_of_my_assets', async () => {
        const props = baseProps();
        renderForm(props);
        await flush();

        expect(props.getUserAssets).toHaveBeenCalledTimes(1);
        expect(props.getUserAsset).not.toHaveBeenCalled();
    });

    test('opening_asset_management_for_one_asset_id_asks_the_server_for_only_that_asset', async () => {
        const props = baseProps({ params: { id: '21' } });
        renderForm(props);
        await flush();

        expect(props.getUserAsset).toHaveBeenCalledTimes(1);
        expect(props.getUserAsset).toHaveBeenCalledWith('21');
        expect(props.getUserAssets).not.toHaveBeenCalled();
    });

    test('reopening_the_screen_when_the_assets_are_already_cached_does_not_call_the_server_again', async () => {
        const props = baseProps({ user: { ...baseProps().user, is_asset_loaded: true } });
        renderForm(props);
        await flush();

        expect(props.getUserAssets).not.toHaveBeenCalled();
        expect(props.getUserAsset).not.toHaveBeenCalled();
    });

    test('before_any_asset_is_chosen_the_form_opens_empty_with_an_Add_button_and_the_employee_boxes_locked', async () => {
        const { container } = renderForm(baseProps());
        await flush();

        expect(btn(container, 'Add')).toBeTruthy();
        expect(btn(container, 'Update')).toBeFalsy();

        expect(container.querySelector('input[name="employee_name"]').value).toBe('Ana Cruz');
        expect(container.querySelector('input[name="emp_num"]').value).toBe('E-007');
        expect(container.querySelector('input[name="email"]').value).toBe('ana@example.com');
        ['employee_name', 'emp_num', 'email'].forEach((n) => {
            expect(container.querySelector('input[name="' + n + '"]').disabled).toBe(true);
        });

        expect(container.querySelector('select[name="personal_equipment"]').value).toBe('');
        expect(container.querySelector('select[name="equipment_type"]').value).toBe('');
        expect(container.querySelector('input[name="method"]').value).toBe('store');
    });

    /* ---------------------------------------------------- PHASE 2 - DATA ARRIVES */

    test('when_my_asset_list_arrives_every_asset_becomes_a_row_with_Yes_No_wording_and_N_A_for_the_blanks', async () => {
        const { container, getByText } = renderForm(baseProps());
        await flush();

        const rows = container.querySelectorAll('tbody tr');
        expect(rows.length).toBe(3);

        const cells = (r) => Array.from(rows[r].querySelectorAll('th,td')).map((c) => c.textContent.trim());
        expect(cells(0).slice(0, 5)).toEqual(['1', 'Laptop', 'Yes', 'SN-21', 'AT-21']);
        expect(cells(1).slice(0, 5)).toEqual(['2', 'Mouse', 'No', 'N/A', 'N/A']);
        // personal_equipment 9 is neither 1 nor 2 -> the column is simply left blank
        expect(cells(2).slice(0, 5)).toEqual(['3', 'Others', '', 'SN-23', 'AT-23']);
        expect(getByText('IT Asset Management')).toBeInTheDocument();
    });

    test('an_employee_with_no_assets_yet_sees_the_no_assets_found_message_instead_of_the_table', async () => {
        const props = baseProps({ user: { ...baseProps().user, user_assets: [] } });
        const { container, getByText } = renderForm(props);
        await flush();

        expect(getByText('No assets found')).toBeInTheDocument();
        expect(container.querySelector('table')).toBeNull();
    });

    test('an_undefined_asset_list_also_falls_back_to_the_no_assets_found_message', async () => {
        const props = baseProps({ user: { ...baseProps().user, user_assets: undefined } });
        const { getByText } = renderForm(props);
        await flush();

        expect(getByText('No assets found')).toBeInTheDocument();
    });

    test('opening_one_asset_prefills_every_field_switches_the_button_to_Update_and_hides_the_asset_list', async () => {
        const props = baseProps({
            params: { id: '23' },
            user: {
                ...baseProps().user,
                user_asset: {
                    personal_equipment: '2', equipment_type: 'Monitor',
                    serial_no: 'SN-99', asset_tag: 'AT-99', add_equipment_type: null,
                },
            },
        });
        const { container } = renderForm(props);
        await flush();

        expect(container.querySelector('select[name="personal_equipment"]').value).toBe('2');
        expect(container.querySelector('select[name="equipment_type"]').value).toBe('Monitor');
        expect(container.querySelector('input[name="serial_no"]').value).toBe('SN-99');
        expect(container.querySelector('input[name="asset_tag"]').value).toBe('AT-99');

        expect(btn(container, 'Update')).toBeTruthy();
        expect(btn(container, 'Add')).toBeFalsy();
        expect(container.querySelector('table')).toBeNull();   // list is hidden in edit mode
    });

    /* --------------------------------------------------- PHASE 3 - USER ACTIONS */

    test('choosing_Others_as_the_equipment_type_reveals_the_free_text_box_and_choosing_anything_else_hides_it_again', async () => {
        const { container } = renderForm(baseProps());
        await flush();

        expect(container.querySelector('input[name="add_equipment_type"]')).toBeNull();

        await act(async () => {
            fireEvent.change(container.querySelector('select[name="equipment_type"]'),
                { target: { value: 'Others' } });
        });
        await flush();
        expect(container.querySelector('input[name="add_equipment_type"]')).not.toBeNull();

        await act(async () => {
            fireEvent.change(container.querySelector('select[name="equipment_type"]'),
                { target: { value: 'Headset' } });
        });
        await flush();
        expect(container.querySelector('input[name="add_equipment_type"]')).toBeNull();
    });

    test('the_equipment_type_dropdown_offers_the_nine_supported_equipment_kinds', async () => {
        const { container } = renderForm(baseProps());
        await flush();

        const values = Array.from(container.querySelectorAll('select[name="equipment_type"] option'))
            .map((o) => o.value).filter(Boolean);
        expect(values).toEqual(['Desktop', 'Laptop', 'Keyboard', 'Mouse', 'Monitor',
                                'Headset', 'Webcam', 'Wifi Modem', 'Others']);
    });

    test('the_personal_equipment_dropdown_offers_only_Yes_and_No_and_keeps_what_the_employee_picked', async () => {
        const { container } = renderForm(baseProps());
        await flush();

        const select = container.querySelector('select[name="personal_equipment"]');
        expect(Array.from(select.options).map((o) => o.text)).toEqual(['', 'Yes', 'No']);

        await act(async () => { fireEvent.change(select, { target: { value: '2' } }); });
        await flush();
        expect(container.querySelector('select[name="personal_equipment"]').value).toBe('2');
    });

    test('pressing_Back_returns_to_the_previous_screen_and_never_saves_anything', async () => {
        const props = baseProps();
        const { container } = renderForm(props);
        await flush();
        await fillValidAsset(container);

        await act(async () => { fireEvent.click(btn(container, 'Back')); });
        await settle();

        expect(props.history.goBack).toHaveBeenCalledTimes(1);
        expect(props.addUserAsset).not.toHaveBeenCalled();
        expect(props.updateUserAsset).not.toHaveBeenCalled();
    });

    test('pressing_the_pencil_on_a_row_opens_that_asset_for_editing_without_submitting_the_form_FINDING_AMF_EDIT_1', async () => {
        const props = baseProps();
        const { container } = renderForm(props);
        await flush();

        const rowButtons = Array.from(container.querySelectorAll('tbody button'));
        expect(rowButtons.length).toBe(3);
        // FINDING AMF-EDIT-1 (characterised): the row control is declared type="submit" while
        // sitting inside the asset form. It only avoids firing a save because the handler
        // calls e.preventDefault() first - one edit to that handler turns every pencil click
        // into a form submission.
        expect(rowButtons[0].getAttribute('type')).toBe('submit');

        await act(async () => { fireEvent.click(rowButtons[1]); });
        await settle();

        expect(window.location.href).toBe('/x/22');
        expect(props.addUserAsset).not.toHaveBeenCalled();
        expect(props.updateUserAsset).not.toHaveBeenCalled();
    });

    /* -------------------------------------------------------- PHASE 4 - SUBMIT */

    test('adding_a_complete_asset_and_accepting_the_data_confirmation_sends_every_field_to_the_add_endpoint', async () => {
        const props = baseProps();
        const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { container } = renderForm(props);
        await flush();
        await fillValidAsset(container);

        await act(async () => { fireEvent.click(btn(container, 'Add')); });
        await settle();

        expect(confirm).toHaveBeenCalledTimes(1);
        expect(confirm.mock.calls[0][0]).toMatch(/Data Confirmation Statement/);

        expect(props.addUserAsset).toHaveBeenCalledTimes(1);
        expect(props.updateUserAsset).not.toHaveBeenCalled();

        const sent = fdToObject(props.addUserAsset.mock.calls[0][0]);
        expect(sent).toEqual({
            action: 'Add', method: 'store', personal_equipment: '1',
            equipment_type: 'Laptop', serial_no: 'SN-1', asset_tag: 'AT-1',
        });
        expect(sent.add_equipment_type).toBeUndefined();   // null values are dropped
        confirm.mockRestore();
    });

    test('cancelling_the_data_confirmation_dialog_throws_the_whole_form_away_without_telling_the_employee_FINDING_AMF_CONFIRM_1', async () => {
        const props = baseProps();
        const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
        const { container } = renderForm(props);
        await flush();
        await fillValidAsset(container);

        await act(async () => { fireEvent.click(btn(container, 'Add')); });
        await settle();

        expect(confirm).toHaveBeenCalledTimes(1);
        // FINDING AMF-CONFIRM-1 (characterised): declining the confirmation does nothing at
        // all - no message, no reset, no redirect. The employee is left staring at a filled
        // form that was never saved, with no signal that the Add did not happen.
        expect(props.addUserAsset).not.toHaveBeenCalled();
        expect(window.location.href).toBe('');
        expect(container.querySelector('input[name="serial_no"]').value).toBe('SN-1');
        confirm.mockRestore();
    });

    test('submitting_an_empty_asset_form_shows_this_field_is_required_on_all_four_boxes_and_never_calls_the_api', async () => {
        const props = baseProps();
        const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { container, getAllByText } = renderForm(props);
        await flush();

        await act(async () => { fireEvent.click(btn(container, 'Add')); });
        await settle();

        expect(getAllByText('This field is required').length).toBe(4);
        expect(props.addUserAsset).not.toHaveBeenCalled();
        expect(confirm).not.toHaveBeenCalled();
        confirm.mockRestore();
    });

    test('choosing_Others_but_leaving_the_description_blank_blocks_the_save_with_a_required_message', async () => {
        const props = baseProps();
        const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { container, getAllByText } = renderForm(props);
        await flush();
        await fillValidAsset(container, { equipment: 'Others' });

        await act(async () => { fireEvent.click(btn(container, 'Add')); });
        await settle();

        expect(getAllByText('This field is required').length).toBe(1);
        expect(props.addUserAsset).not.toHaveBeenCalled();
        confirm.mockRestore();
    });

    test('choosing_Others_and_describing_the_equipment_saves_the_description_alongside_the_asset', async () => {
        const props = baseProps();
        const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { container } = renderForm(props);
        await flush();
        await fillValidAsset(container, { equipment: 'Others' });

        await act(async () => {
            typeInto(container.querySelector('input[name="add_equipment_type"]'), 'Docking Station');
        });
        await flush();

        await act(async () => { fireEvent.click(btn(container, 'Add')); });
        await settle();

        expect(props.addUserAsset).toHaveBeenCalledTimes(1);
        const sent = fdToObject(props.addUserAsset.mock.calls[0][0]);
        expect(sent.equipment_type).toBe('Others');
        expect(sent.add_equipment_type).toBe('Docking Station');
        confirm.mockRestore();
    });

    test('updating_an_existing_asset_stamps_the_asset_id_on_the_payload_and_leaves_for_the_asset_list_without_asking_for_confirmation_FINDING_AMF_UPDATE_1', async () => {
        const props = baseProps({
            params: { id: '23' },
            user: {
                ...baseProps().user,
                user_asset: {
                    personal_equipment: '2', equipment_type: 'Monitor',
                    serial_no: 'SN-99', asset_tag: 'AT-99', add_equipment_type: null,
                },
            },
        });
        const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { container } = renderForm(props);
        await flush();

        await act(async () => { fireEvent.click(btn(container, 'Update')); });
        await settle();

        expect(props.updateUserAsset).toHaveBeenCalledTimes(1);
        expect(props.addUserAsset).not.toHaveBeenCalled();

        const sent = fdToObject(props.updateUserAsset.mock.calls[0][0]);
        expect(sent.action).toBe('Update');
        expect(sent.id).toBe('23');
        expect(sent.equipment_type).toBe('Monitor');
        expect(sent.serial_no).toBe('SN-99');

        // FINDING AMF-UPDATE-1 (characterised): Update never shows the data-confirmation
        // statement that Add insists on, and it navigates with window.location.href in the
        // same synchronous tick as the dispatch - a full page load that races the save and
        // discards any error the API might have returned.
        expect(confirm).not.toHaveBeenCalled();
        expect(window.location.href).toBe('/x/');
        confirm.mockRestore();
    });

    test('an_incomplete_asset_cannot_be_updated_either_and_the_screen_stays_where_it_is', async () => {
        const props = baseProps({
            params: { id: '23' },
            user: { ...baseProps().user, user_asset: null },
        });
        const { container } = renderForm(props);
        await flush();

        await act(async () => { fireEvent.click(btn(container, 'Update')); });
        await settle();

        expect(props.updateUserAsset).not.toHaveBeenCalled();
        expect(window.location.href).toBe('');
    });
});

/* ================================================================================== */
/* 2. DTR MULTI-CLOCK IN SUMMARY                                                       */
/* ================================================================================== */

describe('DTR Multi-Clock In Summary - page lifecycle', () => {

    const ITEMS = [
        {
            Employee_Number: 'E-001', Employee_Name: 'Ana Cruz', Department: 'IT',
            Date: '2026-07-02', Total_Hours: '9.00', Rendered_Hr: '8.00',
            Night_Diff: '1.00', Project_Name: 'Alpha',
        },
        {
            Employee_Number: 'E-002', Employee_Name: 'Ben Reyes', Department: 'HR',
            Date: '2026-07-03', Total_Hours: '8.00', Rendered_Hr: '8.00',
            Night_Diff: '0.00', Project_Name: 'Beta',
        },
    ];

    const baseProps = (over = {}) => ({
        user: {
            id: 7,
            departments_handled: [
                { id: 3, department_name: 'Information Technology' },
                { id: 4, department_name: 'Human Resources' },
            ],
        },
        settings: {
            current_payroll_cutoff: {
                start_date: '2026-07-01 00:00:00', end_date: '2026-07-15 00:00:00',
            },
        },
        dtrMultiLogsSummary: { isListLoaded: true, dtrItems: ITEMS },
        fetchDtrMultiLogsSummary:  jest.fn(),
        exportDtrMultiLogsSummary: jest.fn(),
        ...over,
    });

    const renderScreen = (props, ref) => render(
        <MemoryRouter><DtrMultiLogsSummary {...props} ref={ref} /></MemoryRouter>
    );

    let logSpy;
    beforeEach(() => {
        logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        Authenticator.scanFeature.mockImplementation(() => true);
    });
    afterEach(() => { logSpy.mockRestore(); jest.clearAllMocks(); });

    const lastFetch = (props) => {
        const calls = props.fetchDtrMultiLogsSummary.mock.calls;
        return calls[calls.length - 1][0];
    };

    /* ------------------------------------------------------- PHASE 1 - MOUNT/LOAD */

    test('opening_the_summary_auto_runs_the_report_for_my_first_handled_department_over_the_current_payroll_cutoff', async () => {
        const props = baseProps();
        renderScreen(props);
        await flush();

        expect(props.fetchDtrMultiLogsSummary).toHaveBeenCalledTimes(1);
        expect(lastFetch(props)).toEqual({
            valid_from: '2026-07-01', valid_to: '2026-07-15',
            department_id: 3, is_active: 1,
        });
        // the export flag is deliberately never sent on a Generate run
        expect(lastFetch(props).export).toBeUndefined();
        expect(props.exportDtrMultiLogsSummary).not.toHaveBeenCalled();
    });

    test('a_user_who_handles_no_department_gets_no_automatic_report_run_at_all', async () => {
        const props = baseProps({ user: { id: 7, departments_handled: [] } });
        renderScreen(props);
        await flush();

        expect(props.fetchDtrMultiLogsSummary).not.toHaveBeenCalled();
    });

    test('with_no_payroll_cutoff_configured_the_screen_opens_without_running_anything_and_leaves_the_dates_blank', async () => {
        const props = baseProps({ settings: {} });
        const { getByTestId } = renderScreen(props);
        await flush();

        expect(props.fetchDtrMultiLogsSummary).not.toHaveBeenCalled();
        expect(getByTestId('date-valid_from')).toBeInTheDocument();
        expect(getByTestId('date-valid_to')).toBeInTheDocument();
    });

    test('the_department_dropdown_is_built_from_the_departments_I_handle_and_starts_on_the_first_one', async () => {
        const props = baseProps();
        const { container } = renderScreen(props);
        await flush();

        const options = container.querySelectorAll('select[name="department_id"] option');
        expect(options.length).toBe(3);
        expect(options[0].label).toBe('- Department -');
        expect(options[1].label).toBe('Information Technology');
        expect(options[2].label).toBe('Human Resources');
        expect(container.querySelector('select[name="department_id"]').value).toBe('3');
    });

    /* ---------------------------------------------------- PHASE 2 - DATA ARRIVES */

    test('when_the_summary_arrives_every_multi_clock_row_is_rendered_with_its_hours_and_project', async () => {
        const props = baseProps();
        const { container, getByText } = renderScreen(props);
        await flush();

        const rows = container.querySelectorAll('table.dtrSummary tbody tr');
        expect(rows.length).toBe(2);
        expect(Array.from(rows[0].querySelectorAll('td')).map((c) => c.textContent))
            .toEqual(['E-001', 'Ana Cruz', 'IT', '2026-07-02', '9.00', '8.00', '1.00', 'Alpha']);
        expect(getByText('Ben Reyes')).toBeInTheDocument();

        const headers = Array.from(container.querySelectorAll('thead th')).map((h) => h.textContent);
        expect(headers).toEqual(['Employee Number', 'Employee Name', 'Department', 'Date',
                                 'Total Hours', 'Rendered Hours', 'Night Diff Hours', 'Project Name']);
    });

    test('before_any_report_has_been_run_the_screen_shows_the_no_record_message_instead_of_a_table', async () => {
        const props = baseProps({ dtrMultiLogsSummary: { isListLoaded: false, dtrItems: [] } });
        const { container, getByText } = renderScreen(props);
        await flush();

        expect(getByText(/no record found/i)).toBeInTheDocument();
        expect(container.querySelector('table.dtrSummary')).toBeNull();
    });

    test('a_report_that_comes_back_with_zero_rows_still_renders_the_table_headings_and_an_empty_body', async () => {
        const props = baseProps({ dtrMultiLogsSummary: { isListLoaded: true, dtrItems: [] } });
        const { container } = renderScreen(props);
        await flush();

        expect(container.querySelector('table.dtrSummary')).not.toBeNull();
        expect(container.querySelectorAll('table.dtrSummary tbody tr').length).toBe(0);
    });

    test('the_whole_summary_payload_is_written_to_the_browser_console_on_every_render_FINDING_DTR_LOG_1', async () => {
        const props = baseProps();
        renderScreen(props);
        await flush();

        // FINDING DTR-LOG-1 (characterised): render() opens with a bare
        // console.log(this.props.dtrMultiLogsSummary). Employee numbers, names, departments
        // and hours are dumped into the browser console of every user on every re-render.
        expect(logSpy).toHaveBeenCalledWith(props.dtrMultiLogsSummary);
        expect(logSpy.mock.calls.length).toBeGreaterThan(0);
    });

    /* --------------------------------------------------- PHASE 3 - USER ACTIONS */

    test('switching_the_department_and_pressing_Generate_reruns_the_report_for_only_that_department', async () => {
        const props = baseProps();
        const { container } = renderScreen(props);
        await flush();

        await act(async () => {
            fireEvent.change(container.querySelector('select[name="department_id"]'),
                { target: { value: '4' } });
        });
        await flush();

        await act(async () => { fireEvent.click(btn(container, 'Generate')); });
        await settle();

        expect(props.fetchDtrMultiLogsSummary).toHaveBeenCalledTimes(2);   // mount + Generate
        expect(lastFetch(props).department_id).toBe('4');
        expect(lastFetch(props).valid_from).toBe('2026-07-01');
    });

    test('clearing_the_department_back_to_the_placeholder_blocks_Generate_with_a_required_message', async () => {
        const props = baseProps();
        const { container, getByText } = renderScreen(props);
        await flush();
        props.fetchDtrMultiLogsSummary.mockClear();

        await act(async () => {
            fireEvent.change(container.querySelector('select[name="department_id"]'),
                { target: { value: '' } });
        });
        await flush();

        await act(async () => { fireEvent.click(btn(container, 'Generate')); });
        await settle();

        expect(getByText('This field is required')).toBeInTheDocument();
        expect(props.fetchDtrMultiLogsSummary).not.toHaveBeenCalled();
        expect(props.exportDtrMultiLogsSummary).not.toHaveBeenCalled();
    });

    test('a_supervisor_without_the_export_dtr_summary_feature_only_gets_the_Generate_button', async () => {
        Authenticator.scanFeature.mockImplementation(() => false);
        const props = baseProps();
        const { container } = renderScreen(props);
        await flush();

        expect(btn(container, 'Generate')).toBeTruthy();
        expect(btn(container, 'Export')).toBeFalsy();
        expect(Authenticator.scanFeature).toHaveBeenCalledWith('export_dtr_summary');
    });

    test('the_Generate_and_Export_buttons_are_both_published_under_the_same_dom_id_FINDING_DTR_ID_1', async () => {
        const props = baseProps();
        const { container } = renderScreen(props);
        await flush();

        // FINDING DTR-ID-1 (characterised): both buttons hard-code id="btn-generate". Any
        // getElementById / #btn-generate selector - in a test, an analytics script or a
        // stylesheet - reaches the Generate button and silently ignores Export.
        const duplicated = container.querySelectorAll('#btn-generate');
        expect(duplicated.length).toBe(2);
        expect(duplicated[0].textContent).toMatch(/Generate/);
        expect(duplicated[1].textContent).toMatch(/Export/);
    });

    /* -------------------------------------------------------- PHASE 4 - SUBMIT */

    test('pressing_Export_downloads_the_report_for_the_chosen_department_and_never_refreshes_the_on_screen_table', async () => {
        const props = baseProps();
        const { container } = renderScreen(props);
        await flush();
        props.fetchDtrMultiLogsSummary.mockClear();

        await act(async () => { fireEvent.click(btn(container, 'Export')); });
        await settle();

        expect(props.exportDtrMultiLogsSummary).toHaveBeenCalledTimes(1);
        expect(props.exportDtrMultiLogsSummary.mock.calls[0][0]).toEqual({
            valid_from: '2026-07-01', valid_to: '2026-07-15',
            department_id: 3, is_active: 1, export: 'department_new',
        });
        expect(props.fetchDtrMultiLogsSummary).not.toHaveBeenCalled();
    });

    test('the_all_departments_export_drops_the_department_filter_so_the_file_covers_the_whole_division', async () => {
        const props = baseProps();
        const ref = React.createRef();
        renderScreen(props, ref);
        await flush();
        props.fetchDtrMultiLogsSummary.mockClear();

        await act(async () => {
            ref.current.onSubmitHandler({
                valid_from: new Date('2026-07-01 00:00:00'),
                valid_to:   new Date('2026-07-15 00:00:00'),
                department_id: 3, name: 'ana', is_active: 1, export: 'all_new',
            });
        });

        expect(props.exportDtrMultiLogsSummary).toHaveBeenCalledTimes(1);
        const sent = props.exportDtrMultiLogsSummary.mock.calls[0][0];
        expect(sent).toEqual({
            valid_from: '2026-07-01', valid_to: '2026-07-15',
            is_active: 1, export: 'all_new',
        });
        expect(sent.department_id).toBeUndefined();
        expect(sent.name).toBeUndefined();
        expect(props.fetchDtrMultiLogsSummary).not.toHaveBeenCalled();
    });

    test('the_department_export_keeps_the_department_but_still_drops_the_employee_name_search', async () => {
        const props = baseProps();
        const ref = React.createRef();
        renderScreen(props, ref);
        await flush();

        await act(async () => {
            ref.current.onSubmitHandler({
                valid_from: new Date('2026-07-01 00:00:00'),
                valid_to:   new Date('2026-07-15 00:00:00'),
                department_id: 4, name: 'ana', is_active: 1, export: 'department_new',
            });
        });

        const sent = props.exportDtrMultiLogsSummary.mock.calls[0][0];
        expect(sent.department_id).toBe(4);
        expect(sent.name).toBeUndefined();
        expect(sent.export).toBe('department_new');
    });

    test('a_plain_Generate_submit_keeps_the_name_search_and_never_leaks_the_export_flag_to_the_list_endpoint', async () => {
        const props = baseProps();
        const ref = React.createRef();
        renderScreen(props, ref);
        await flush();
        props.fetchDtrMultiLogsSummary.mockClear();

        await act(async () => {
            ref.current.onSubmitHandler({
                valid_from: new Date('2026-06-16 00:00:00'),
                valid_to:   new Date('2026-06-30 00:00:00'),
                department_id: 4, name: 'ana', is_active: 1, export: false,
            });
        });

        expect(props.exportDtrMultiLogsSummary).not.toHaveBeenCalled();
        expect(props.fetchDtrMultiLogsSummary).toHaveBeenCalledTimes(1);
        expect(props.fetchDtrMultiLogsSummary.mock.calls[0][0]).toEqual({
            valid_from: '2026-06-16', valid_to: '2026-06-30',
            department_id: 4, name: 'ana', is_active: 1,
        });
    });
});

/* ================================================================================== */
/* 3. MY DISPUTE REQUESTS                                                              */
/* ================================================================================== */

describe('My Dispute Requests - page lifecycle', () => {

    const ROWS = [
        {
            id: 31, table_name: 'alter_logs', status: 'pending',
            created_at: '2026-07-01', date_requested: '2026-07-02',
            updated_by: 'Sup One', updated_at: '2026-07-03', employee_note: 'wrong log',
            fourth_column: '08:00,17:00', fifth_column: '09:00,18:00',
        },
        {
            id: 32, table_name: 'overtimes', status: 'approved',
            created_at: '2026-07-04', date_requested: '2026-07-05',
            updated_by: 'Sup One', updated_at: '2026-07-06', employee_note: null,
            fourth_column: '2 hours', fifth_column: 'pre_approved',
        },
        {
            id: 33, table_name: 'rest_day_works', status: 'declined',
            created_at: '2026-07-07', date_requested: '2026-07-08',
            updated_by: 'Sup One', updated_at: '2026-07-09', employee_note: null,
            fourth_column: '2026-07-08 08:00', fifth_column: '2026-07-08 17:00',
        },
        {
            id: 34, table_name: 'alter_log_punches', status: 'canceled',
            created_at: '2026-07-10', date_requested: '2026-07-11',
            updated_by: 'Sup One', updated_at: '2026-07-12', employee_note: null,
            fourth_column: '08:00-12:00', fifth_column: '08:00-13:00',
        },
        {
            id: 35, table_name: 'change_schedules', status: 'pending',
            created_at: '2026-07-13', date_requested: '2026-07-14',
            updated_by: 'Sup One', updated_at: '2026-07-15', employee_note: null,
            fourth_column: { rest_day: ['sat', 'sun'], work_days: ['mon', 'tue'] },
            fifth_column: { allow_late: '1', allow_undertime: '0', allow_night_diff: '1' },
        },
    ];

    const baseProps = (over = {}) => ({
        settings: {
            current_payroll_cutoff: {
                start_date: '2026-07-01 00:00:00', end_date: '2026-07-15 00:00:00',
            },
        },
        filters: undefined,
        disputeRequestList: ROWS,
        disputeRequestCount: { pending: 4, approved: 2, cancelled: 1, declined: 3 },
        isDisputeListLoaded: true,
        fetchRequestListDisputes: jest.fn(),
        ...over,
    });

    const renderScreen = (props, ref) => render(
        <MemoryRouter><MyRequestsDispute {...props} ref={ref} /></MemoryRouter>
    );

    const lastFetch = (props) => {
        const calls = props.fetchRequestListDisputes.mock.calls;
        return calls[calls.length - 1][0];
    };

    beforeEach(() => { mockPaginateProps.length = 0; });
    afterEach(() => jest.clearAllMocks());

    /* ------------------------------------------------------- PHASE 1 - MOUNT/LOAD */

    test('opening_my_dispute_requests_asks_the_server_for_pending_disputes_of_every_type_in_the_current_cutoff', async () => {
        const props = baseProps({ isDisputeListLoaded: false });
        const { getByTestId } = renderScreen(props);
        await flush();

        expect(getByTestId('page-loading')).toBeInTheDocument();
        expect(props.fetchRequestListDisputes).toHaveBeenCalledTimes(1);
        expect(lastFetch(props)).toEqual(expect.objectContaining({
            url: 'my_requests_dispute', status: 'pending',
            request_type: 'all', page: 1, action: null, bulk_action: null,
        }));
    });

    test('the_mount_guard_reads_a_prop_this_screen_never_receives_so_the_list_is_refetched_every_single_time_FINDING_MRD_LOAD_1', async () => {
        // mapStateToProps supplies isDisputeListLoaded; componentDidMount checks isListLoaded.
        const props = baseProps({ isDisputeListLoaded: true });
        renderScreen(props);
        await flush();

        // FINDING MRD-LOAD-1 (characterised): even with the list already in the store the
        // screen fires the fetch again, because `!this.props.isListLoaded` can never be
        // false - that prop is not mapped. Every navigation back to this tab is a wasted
        // round trip.
        expect(props.fetchRequestListDisputes).toHaveBeenCalledTimes(1);

        // and passing the prop the guard actually wants does suppress it
        const props2 = baseProps({ isDisputeListLoaded: true, isListLoaded: true });
        renderScreen(props2);
        await flush();
        expect(props2.fetchRequestListDisputes).not.toHaveBeenCalled();
    });

    test('the_mount_fetch_converts_the_cutoff_through_toISOString_which_shifts_the_date_back_a_day_east_of_utc_FINDING_MRD_TZ_1', async () => {
        const props = baseProps({ isDisputeListLoaded: false });
        renderScreen(props);
        await flush();

        const localMidnight = new Date('2026-07-01 00:00:00');
        const asSent = localMidnight.toISOString().substring(0, 10);
        expect(lastFetch(props).valid_from).toBe(asSent);

        // FINDING MRD-TZ-1 (characterised): componentDidMount uses toISOString() while
        // onSubmitHandler uses moment().format("YYYY-MM-DD"). toISOString() is UTC, so for
        // any runner east of UTC - the Philippines is UTC+8 - local midnight lands on the
        // PREVIOUS day and the first page of disputes covers a different range than the one
        // the Filter button asks for.
        const shifted = asSent !== '2026-07-01';
        expect(shifted).toBe(localMidnight.getTimezoneOffset() < 0);
    });

    test('reopening_the_screen_reuses_every_saved_filter_including_the_status_page_and_request_type', async () => {
        const props = baseProps({
            isDisputeListLoaded: false,
            filters: {
                status: 'approved', page: 3, request_type: 'overtime',
                valid_from: '2026-06-01 00:00:00', valid_to: '2026-06-15 00:00:00',
                action: null, bulk_action: null,
            },
        });
        renderScreen(props);
        await flush();

        const sent = lastFetch(props);
        expect(sent.status).toBe('approved');
        expect(sent.page).toBe(3);
        expect(sent.request_type).toBe('overtime');
        expect(sent.valid_from)
            .toBe(new Date('2026-06-01 00:00:00').toISOString().substring(0, 10));
    });

    test('with_no_payroll_cutoff_configured_the_mount_fetch_sends_an_empty_date_range', async () => {
        const props = baseProps({ isDisputeListLoaded: false, settings: {} });
        renderScreen(props);
        await flush();

        expect(lastFetch(props).valid_from).toBeNull();
        expect(lastFetch(props).valid_to).toBeNull();
    });

    /* ---------------------------------------------------- PHASE 2 - DATA ARRIVES */

    test('when_the_disputes_arrive_every_request_type_renders_its_own_before_and_after_detail', async () => {
        const props = baseProps();
        const { container, getByText } = renderScreen(props);
        await flush();

        expect(getByText('My Dispute Requests')).toBeInTheDocument();
        expect(container.querySelectorAll('tbody.request_list tr').length).toBe(5);

        // alter_logs: new in/out then old in/out
        expect(getByText('In: 09:00')).toBeInTheDocument();
        expect(getByText('Out: 18:00')).toBeInTheDocument();
        expect(getByText('In: 08:00')).toBeInTheDocument();
        // overtimes: the fifth column is title-cased word by word
        expect(getByText('Pre Approved')).toBeInTheDocument();
        // rest_day_works
        expect(getByText(/From: 2026-07-08 08:00/)).toBeInTheDocument();
        expect(getByText(/To: 2026-07-08 17:00/)).toBeInTheDocument();
        // alter_log_punches
        expect(getByText(/Timelog: {0,2}08:00-13:00/)).toBeInTheDocument();
        // change_schedules: rest/work days plus the payroll flags that are switched on
        expect(getByText(/Rest Days: sat,sun/)).toBeInTheDocument();
        expect(getByText(/Work Days: mon,tue/)).toBeInTheDocument();
        expect(getByText('Late,')).toBeInTheDocument();
        expect(getByText('Night Differential,')).toBeInTheDocument();

        // the request type is humanised from the table name, singularised
        expect(Array.from(container.querySelectorAll('tbody.request_list tr td:first-child > b'))
            .map((b) => b.textContent))
            .toEqual(['Alter Log', 'Overtime', 'Rest Day Work',
                      'Alter Log Punch', 'Change Schedule']);
        // the note only shows when the employee wrote one
        expect(getByText(/wrong log/)).toBeInTheDocument();
    });

    test('each_dispute_row_shows_its_status_badge_with_the_first_letter_capitalised', async () => {
        const props = baseProps();
        const { container } = renderScreen(props);
        await flush();

        const statuses = Array.from(container.querySelectorAll('td.status'))
            .map((td) => td.textContent.trim());
        expect(statuses).toEqual(['Pending', 'Approved', 'Declined', 'Canceled', 'Pending']);
    });

    test('the_four_status_counters_come_straight_from_the_server_counts', async () => {
        const props = baseProps();
        const { container } = renderScreen(props);
        await flush();

        const toggles = container.querySelectorAll('button.toggle-btn');
        expect(toggles.length).toBe(4);
        expect(toggles[0].textContent).toMatch(/Pending\s*4/);
        expect(toggles[1].textContent).toMatch(/Approved\s*2/);
        expect(toggles[2].textContent).toMatch(/Cancelled\s*1/);
        expect(toggles[3].textContent).toMatch(/Declined\s*3/);
    });

    test('when_the_counts_have_not_arrived_yet_all_four_counters_show_zero', async () => {
        const props = baseProps({ disputeRequestCount: null });
        const { container } = renderScreen(props);
        await flush();

        Array.from(container.querySelectorAll('button.toggle-btn'))
            .forEach((t) => expect(t.textContent).toMatch(/0$/));
    });

    test('an_employee_with_no_disputes_sees_the_no_record_message_and_no_table_or_pager', async () => {
        const props = baseProps({ disputeRequestList: [] });
        const { container, getByText } = renderScreen(props);
        await flush();

        expect(getByText(/Sorry, No Record Found/)).toBeInTheDocument();
        expect(container.querySelector('table')).toBeNull();
        expect(container.querySelector('[data-testid="paginate"]')).toBeNull();
        // the filter bar survives so the range can be widened
        expect(btn(container, 'Filter')).toBeTruthy();
    });

    test('the_pager_is_handed_the_row_array_instead_of_the_paginator_so_it_can_never_know_the_page_count_FINDING_MRD_PAGE_1', async () => {
        const props = baseProps();
        renderScreen(props);
        await flush();

        // FINDING MRD-PAGE-1 (characterised): the markup is
        //   <Paginate pagination={dispute_request_list} />
        // dispute_request_list is state.myDisputeRequestList.instance - the ROW ARRAY. The
        // pager reads pagination.last_page / current_page off an array, so both are
        // undefined and the control can never render a second page.
        expect(mockPaginateProps.length).toBeGreaterThan(0);
        const handed = mockPaginateProps[mockPaginateProps.length - 1];
        expect(Array.isArray(handed)).toBe(true);
        expect(handed.last_page).toBeUndefined();
        expect(handed.current_page).toBeUndefined();
    });

    /* --------------------------------------------------- PHASE 3 - USER ACTIONS */

    test('switching_to_the_overtime_tab_reloads_only_overtime_disputes', async () => {
        const props = baseProps();
        const { getByTestId } = renderScreen(props);
        await flush();
        props.fetchRequestListDisputes.mockClear();

        await act(async () => { fireEvent.click(getByTestId('tab-overtime')); });
        await settle();

        expect(props.fetchRequestListDisputes).toHaveBeenCalledTimes(1);
        expect(lastFetch(props).request_type).toBe('overtime');
        expect(lastFetch(props).status).toBe('pending');
    });

    test('every_request_type_tab_reloads_the_list_for_its_own_type', async () => {
        const props = baseProps();
        const { getByTestId } = renderScreen(props);
        await flush();
        props.fetchRequestListDisputes.mockClear();

        for (const key of ['alteration', 'rest_day_work', 'all']) {
            await act(async () => { fireEvent.click(getByTestId('tab-' + key)); });
            await settle();
            expect(lastFetch(props).request_type).toBe(key);
        }
        expect(props.fetchRequestListDisputes).toHaveBeenCalledTimes(3);
    });

    test('clicking_a_status_button_reloads_that_status_from_page_one', async () => {
        const props = baseProps();
        const { container } = renderScreen(props);
        await flush();
        props.fetchRequestListDisputes.mockClear();

        await act(async () => { fireEvent.click(btn(container, 'Approved')); });
        await settle();

        expect(lastFetch(props).status).toBe('approved');
        expect(lastFetch(props).page).toBe(1);
    });

    test('each_of_the_four_status_buttons_reloads_the_list_with_that_status', async () => {
        const props = baseProps();
        const { container } = renderScreen(props);
        await flush();
        props.fetchRequestListDisputes.mockClear();

        const map = [['Pending', 'pending'], ['Approved', 'approved'],
                     ['Cancelled', 'canceled'], ['Declined', 'declined']];
        for (const [label, value] of map) {
            await act(async () => { fireEvent.click(btn(container, label)); });
            await settle();
            expect(lastFetch(props).status).toBe(value);
        }
        expect(props.fetchRequestListDisputes).toHaveBeenCalledTimes(4);
    });

    test('the_status_button_of_the_active_filter_is_the_only_one_shown_as_selected', async () => {
        const props = baseProps();
        const { container } = renderScreen(props);
        await flush();

        const checked = Array.from(container.querySelectorAll('button.toggle-btn'))
            .map((t) => t.getAttribute('data-checked'));
        expect(checked).toEqual(['true', 'false', 'false', 'false']);
    });

    test('the_date_range_is_driven_by_the_two_shared_date_pickers_and_the_Filter_button_sits_next_to_them', async () => {
        const props = baseProps();
        const { container, getByTestId } = renderScreen(props);
        await flush();

        expect(getByTestId('date-valid_from')).toBeInTheDocument();
        expect(getByTestId('date-valid_to')).toBeInTheDocument();
        expect(btn(container, 'Filter').getAttribute('type')).toBe('submit');
    });

    /* -------------------------------------------------------- PHASE 4 - SUBMIT */

    test('pressing_Filter_reloads_the_disputes_from_page_one_with_the_dates_formatted_for_the_server', async () => {
        const props = baseProps();
        const { container } = renderScreen(props);
        await flush();
        props.fetchRequestListDisputes.mockClear();

        await act(async () => { fireEvent.click(btn(container, 'Filter')); });
        await settle();

        expect(props.fetchRequestListDisputes).toHaveBeenCalledTimes(1);
        const sent = lastFetch(props);
        expect(sent.page).toBe(1);
        expect(sent.url).toBe('my_requests_dispute');
        expect(sent.status).toBe('pending');
        // the Filter path formats with moment, i.e. local time - see FINDING MRD-TZ-1
        expect(sent.valid_from).toBe('2026-07-01');
        expect(sent.valid_to).toBe('2026-07-15');
    });

    test('a_filter_submit_strips_the_empty_and_null_fields_before_they_reach_the_server', async () => {
        const props = baseProps();
        const ref = React.createRef();
        renderScreen(props, ref);
        await flush();
        props.fetchRequestListDisputes.mockClear();

        await act(async () => {
            ref.current.onSubmitHandler({
                url: 'my_requests_dispute', status: 'declined', page: 2,
                request_type: 'all', action: null, bulk_action: '',
                valid_from: new Date('2026-06-16 00:00:00'),
                valid_to:   new Date('2026-06-30 00:00:00'),
            });
        });

        expect(props.fetchRequestListDisputes).toHaveBeenCalledTimes(1);
        expect(lastFetch(props)).toEqual({
            url: 'my_requests_dispute', status: 'declined', page: 2,
            request_type: 'all', valid_from: '2026-06-16', valid_to: '2026-06-30',
        });
        expect(lastFetch(props).action).toBeUndefined();
        expect(lastFetch(props).bulk_action).toBeUndefined();
    });

    test('a_date_range_that_ends_before_it_starts_is_rejected_and_nothing_is_sent_to_the_server', async () => {
        const props = baseProps({
            settings: {
                current_payroll_cutoff: {
                    start_date: '2026-07-15 00:00:00', end_date: '2026-07-01 00:00:00',
                },
            },
        });
        const { container } = renderScreen(props);
        await flush();
        props.fetchRequestListDisputes.mockClear();

        await act(async () => { fireEvent.click(btn(container, 'Filter')); });
        await settle();

        expect(props.fetchRequestListDisputes).not.toHaveBeenCalled();
    });
});
