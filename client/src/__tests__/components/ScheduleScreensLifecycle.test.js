/**
 * ScheduleScreensLifecycle.test.js
 *
 * PAGE-LIFECYCLE coverage for the three schedule/cut-off maintenance screens:
 *
 *   Menu: Employee -> Assign Schedule          container/Schedule/ScheduleAssign/ScheduleAssign.js
 *   Menu: Schedule -> Template -> Create       container/Schedule/TemplateCreate/TemplateCreate.js
 *   Menu: Admin -> Payroll Cut-Off -> Add/Edit container/Admin/PayrollCutoff/PayrollCutoffForm.js
 *
 * PHASE 1  MOUNT/LOAD    what is dispatched on open, what renders before data arrives
 * PHASE 2  DATA ARRIVES  new props -> state/initialValues rebuild -> what now renders
 *                        (including the empty-data arm)
 * PHASE 3  USER ACTIONS  every radio/dropdown/parameter control on the three forms
 * PHASE 4  SUBMIT        save with a VALID payload and with an INVALID one, confirm dialog
 *                        accepted AND cancelled, plus the API-failure arm
 *
 * Findings characterised here (they assert TODAY's behaviour, they do not endorse it):
 *   PCF-DATE-1  the payroll cut-off form declares start_date/end_date as required but the
 *               Yup .max/.min bounds are self-referential (Yup.ref of the same field), so
 *               an End Date BEFORE the Start Date passes validation and is posted.
 *
 * Also observed while running (not asserted, no test hook exists for it): the Assign
 * Schedule template dropdown builds its <option> list with no React key (ScheduleAssign.js
 * line 423), which React warns about on every render of the template picker.
 *
 * ADDITIVE ONLY - no existing test is modified.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import moment from 'moment';

/* ------------------------------------------------------------------ plumbing */

const mockDispatch = jest.fn((a) => a);
jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => mockDispatch,
}));

jest.mock('../../services/API', () => ({ call: jest.fn() }));

jest.mock('../../services/Authenticator', () => ({
    __esModule: true,
    default: {
        scanFeature: jest.fn(() => true),
        scanLevel: jest.fn(() => true),
        checkPermission: jest.fn(() => true),
    },
}));

jest.mock('../../components/GridComponent/AdminLte.js', () => {
    const R = require('react');
    return {
        ContainerHeader:  ({ children }) => R.createElement('div', null, children),
        Content:          ({ children, title, subtitle }) =>
            R.createElement('div', null,
                R.createElement('h3', null, title),
                R.createElement('div', { 'data-testid': 'content-subtitle' }, subtitle),
                children),
        ContainerWrapper: ({ children }) => R.createElement('div', null, children),
        ContainerBody:    ({ children }) => R.createElement('div', null, children),
        Row:              ({ children }) => R.createElement('div', null, children),
        Col:              ({ children }) => R.createElement('div', null, children),
    };
});

jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/Template/BackButton', () => () => <button type="button">Back</button>);
jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading" />);
jest.mock('../../components/RequestComponent/RequestButtons/RequestSubtitle',
    () => () => <div data-testid="request-subtitle" />);
jest.mock('../../components/RequestComponent/RequestButtons/RequestButtons',
    () => () => <div data-testid="request-buttons" />);
jest.mock('react-data-table-component', () => () => <div data-testid="data-table" />);
jest.mock('react-multi-select-component', () => () => <div data-testid="multi-select" />);

/* One shared date-picker stub for BOTH the raw <DatePicker> usages on Assign Schedule and
   the <InputDate> wrapper used by the payroll cut-off form. It stays a real <input> so the
   test can drive it, and it keeps the real onChange contract (a Date, or null when blank). */
jest.mock('react-datepicker', () => {
    const R = require('react');
    const m = require('moment');
    return ({ selected, onChange, readOnly }) => R.createElement('input', {
        'data-testid': 'datepicker',
        readOnly: !!readOnly,
        value: selected ? m(selected).format('YYYY-MM-DD') : '',
        onChange: (e) => onChange && onChange(
            e.target.value ? new Date(e.target.value + 'T00:00:00') : null),
    });
});

jest.mock('react-bootstrap', () => {
    const R = require('react');
    const box = (Tag) => ({ children }) => R.createElement(Tag, null, children);

    const FormControl = ({ children, as, name, value, onChange, placeholder, type, disabled }) =>
        as === 'select'
            ? R.createElement('select', { name, value, onChange, disabled }, children)
            : R.createElement('input', {
                name, onChange, placeholder, disabled,
                type: type || 'text',
                value: value === null || value === undefined ? '' : value,
            });
    FormControl.Feedback = ({ children }) => R.createElement('div', null, children);

    const Form = ({ children }) => R.createElement('div', null, children);
    Form.Group   = box('div');
    Form.Row     = box('div');
    Form.Label   = box('label');
    Form.Control = FormControl;

    return {
        Form,
        FormControl,
        Container:  box('div'),
        Row:        box('div'),
        Col:        box('div'),
        Card:       box('div'),
        Table:      box('table'),
        InputGroup: box('div'),
        Collapse:   box('div'),
        Tab:        () => null,
        Tabs:       box('div'),
        Image:      () => R.createElement('img', { alt: '' }),
        Spinner:    () => R.createElement('div', null),
        Button: ({ children, onClick, type, className }) =>
            R.createElement('button', { type: type || 'button', onClick, className }, children),
    };
});

/* The heavy schedule sub-forms are stubbed so what is being measured is the PARENT screen's
   lifecycle: which detail form the chosen schedule type swaps in, not how it paints times. */
jest.mock('../../components/Schedule/ScheduleDetails.js', () => ({
    Scheduledetails:                      () => <div data-testid="sched-details" />,
    ScheduledetailsWithTimezone:          () => <div data-testid="sched-details-tz" />,
    onSelectTimeHandlerStd:               jest.fn(),
    onSelectTimeHandlerFlexi:             jest.fn(),
    FlexibleSchedDetailsFormWithTimezone: () => <div data-testid="flex-form-tz" />,
    StandardSchedDetailsFormWithTimezone: () => <div data-testid="std-form-tz" />,
    StandardSchedDetailsForm:             () => <div data-testid="std-form" />,
    FlexibleSchedDetailsForm:             () => <div data-testid="flex-form" />,
    SchedulePolicy:                       () => <div data-testid="schedule-policy" />,
    ScheduleHolidayPolicy:                () => <div data-testid="holiday-policy" />,
    WorkDays:                             () => <div data-testid="work-days" />,
}));

jest.mock('../../store/actions/scheduleActions', () => ({
    scheduleAssign:      jest.fn(),
    getDefaultSchedule:  jest.fn(),
    listTemplate:        jest.fn(),
    getTemplateSchedule: jest.fn(),
    addTemplateSchedule: jest.fn(),
}));
jest.mock('../../store/actions/userActions', () => ({ getUserInfo: jest.fn() }));
jest.mock('../../store/actions/admin/payrollCutoffActions', () => ({
    addPayrollCutoff:               jest.fn(),
    updatePayrollCutoff:            jest.fn(),
    fetchPayrollCutoffList:         jest.fn(),
    clearPayrollCutoffListInstance: jest.fn(),
}));
jest.mock('../../store/actions/redirectActions', () => ({ setRedirect: jest.fn() }));

global.links = new Proxy({}, { get: () => '/x/' });

const ScheduleAssign =
    require('../../container/Schedule/ScheduleAssign/ScheduleAssign').default;
const TemplateCreate =
    require('../../container/Schedule/TemplateCreate/TemplateCreate').default;
const PayrollCutoffForm =
    require('../../container/Admin/PayrollCutoff/PayrollCutoffForm').default;

/* ------------------------------------------------------------------- helpers */

const flush = () => act(async () => { await Promise.resolve(); });

/** the radio inside the label whose visible text is exactly `text` (nth match, 0-based) */
const radio = (container, text, nth = 0) => {
    const hits = Array.from(container.querySelectorAll('label'))
        .filter((l) => l.textContent.replace(/ /g, '').trim() === text)
        .map((l) => l.querySelector('input[type="radio"]'))
        .filter(Boolean);
    return hits[nth];
};

/** the <button> whose visible text contains `label` */
const btn = (container, label) =>
    Array.from(container.querySelectorAll('button'))
        .find((b) => b.textContent.indexOf(label) !== -1);

/** type through the native setter so React's value tracker still fires onChange */
const typeInto = (el, value) => {
    const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, value);
    fireEvent.change(el);
};

const pickDate = (el, iso) => typeInto(el, iso);

/* ========================================================================== */
/*  ASSIGN SCHEDULE                                                           */
/* ========================================================================== */

const assignProps = (over = {}) => ({
    params: { user_id: 42 },
    user: { id: 42, user_offset_seconds: 0, pov_timezone: 'Asia/Manila' },
    user_info: { user_offset_seconds: 0, pov_timezone: 'Asia/Singapore' },
    page_reloaded: false,
    template_list: [],
    default_schedule: null,
    template_data: null,
    listTemplate: jest.fn(),
    getUserInfo: jest.fn(),
    scheduleAssign: jest.fn(),
    getDefaultSchedule: jest.fn(),
    getTemplateSchedule: jest.fn(),
    ...over,
});

const savedStandard = (over = {}) => ({
    creation_type: 'customize',
    valid_from: '2026-08-01',
    work_days: ['mon', 'tue'],
    schedule_policies: {
        allow_late: '5', allow_undertime: '0', allow_night_diff: '1',
        allow_special_holiday: '1', allow_legal_holiday: '1',
    },
    schedule_type: 'standard',
    schedule_details: { all: { start_time: '09:00:00', end_time: '18:00:00', break_time: '01:00:00' } },
    pov_schedule_details: null,
    ...over,
});

/** mount the screen and push it past the loading gate with a saved standard schedule */
const openAssign = async (props, extraProps = {}) => {
    const ref = React.createRef();
    const view = render(<ScheduleAssign {...props} ref={ref} />);
    await act(async () => {
        view.rerender(<ScheduleAssign {...props} ref={ref}
            {...extraProps} default_schedule={savedStandard()} page_reloaded={true} />);
    });
    return { ...view, ref };
};

describe('Assign Schedule - PHASE 3: choosing the parameters of the assignment', () => {

    afterEach(() => jest.clearAllMocks());

    test('switching_the_source_type_to_temporary_reveals_the_date_to_picker_and_switching_back_to_default_hides_it_again', async () => {
        const props = assignProps();
        const { container } = await openAssign(props);

        // PHASE 2 arm: a "default" assignment is open-ended, so only Date From is asked for
        expect(container.querySelectorAll('[data-testid="datepicker"]').length).toBe(1);
        expect(container.textContent).toContain('Date From :');
        expect(container.textContent).not.toContain('Date To :');

        await act(async () => { fireEvent.click(radio(container, 'Temporary')); });
        await flush();

        expect(container.querySelectorAll('[data-testid="datepicker"]').length).toBe(2);
        expect(container.textContent).toContain('Date To :');

        await act(async () => { fireEvent.click(radio(container, 'Default')); });
        await flush();

        expect(container.querySelectorAll('[data-testid="datepicker"]').length).toBe(1);
        expect(container.textContent).not.toContain('Date To :');
        // toggling the scope is a pure form change - nothing is sent to the server
        expect(props.scheduleAssign).not.toHaveBeenCalled();
        expect(props.getTemplateSchedule).not.toHaveBeenCalled();
    });

    test('switching_the_creation_type_to_template_lists_every_loaded_template_and_picking_one_fetches_that_templates_schedule', async () => {
        const props = assignProps();
        const templates = [{ id: 3, name: 'Night Shift' }, { id: 4, name: 'Morning Shift' }];
        const { container, ref } = await openAssign(props, { template_list: templates });

        // the saved schedule was built by hand, so the screen opens on "Customize"
        expect(ref.current.state.creation_type).toBe('customize');
        expect(container.querySelector('select')).toBeNull();

        await act(async () => { fireEvent.click(radio(container, 'Template')); });
        await flush();

        const select = container.querySelector('select');
        expect(select).not.toBeNull();
        const options = Array.from(select.querySelectorAll('option'));
        expect(options.map((o) => o.textContent))
            .toEqual(['Please Select Template', 'Night Shift', 'Morning Shift']);

        await act(async () => { fireEvent.change(select, { target: { value: '4' } }); });
        await flush();

        expect(props.getTemplateSchedule).toHaveBeenCalledTimes(1);
        expect(props.getTemplateSchedule).toHaveBeenCalledWith('4', 'Default');
    });

    test('choosing_a_different_schedule_type_swaps_in_that_types_detail_form_and_customize_renders_one_row_per_working_day', async () => {
        const props = assignProps();
        const { container, queryByTestId, getAllByTestId, ref } = await openAssign(props);

        // PHASE 2 arm: the saved schedule is standard
        expect(queryByTestId('std-form-tz')).toBeInTheDocument();
        expect(queryByTestId('flex-form-tz')).toBeNull();

        await act(async () => { fireEvent.click(radio(container, 'Flexible')); });
        await flush();
        expect(queryByTestId('flex-form-tz')).toBeInTheDocument();
        expect(queryByTestId('std-form-tz')).toBeNull();
        expect(container.textContent).toContain('Flexible Schedule');

        // "Customize" is the SECOND label with that text (the first one is the creation type)
        await act(async () => { fireEvent.click(radio(container, 'Customize', 1)); });
        await flush();
        expect(container.textContent).toContain('Customize Schedule');
        // work_days came back as mon + tue, so exactly two day rows are laid out
        expect(getAllByTestId('sched-details-tz').length).toBe(2);
        expect(ref.current.state.work_day).toEqual(['mon', 'tue']);

        await act(async () => { fireEvent.click(radio(container, 'Standard')); });
        await flush();
        expect(queryByTestId('std-form-tz')).toBeInTheDocument();

        expect(props.scheduleAssign).not.toHaveBeenCalled();
    });
});

describe('Assign Schedule - PHASE 4: saving a temporary assignment', () => {

    afterEach(() => jest.clearAllMocks());

    test('saving_a_temporary_assignment_that_ends_before_it_starts_shows_the_end_date_error_and_never_calls_the_api_while_a_later_end_date_clears_it', async () => {
        const props = assignProps();
        const { container } = await openAssign(props);

        await act(async () => { fireEvent.click(radio(container, 'Temporary')); });
        await flush();

        const dates = () => container.querySelectorAll('[data-testid="datepicker"]');
        await act(async () => { pickDate(dates()[0], '2026-08-10'); });
        await flush();
        await act(async () => { pickDate(dates()[1], '2026-07-01'); });
        await flush();

        expect(dates()[0].value).toBe('2026-08-10');
        expect(dates()[1].value).toBe('2026-07-01');

        await act(async () => { fireEvent.submit(container.querySelector('form')); });
        await flush();

        // INVALID arm - the date range rule fires and the assignment is not sent
        expect(container.textContent).toContain('End time should be greater');
        expect(props.scheduleAssign).not.toHaveBeenCalled();

        // VALID arm - move the end date past the start date and the message goes away
        await act(async () => { pickDate(dates()[1], '2026-08-31'); });
        await flush();
        await act(async () => { fireEvent.submit(container.querySelector('form')); });
        await flush();

        expect(container.textContent).not.toContain('End time should be greater');
    });
});

/* ========================================================================== */
/*  TEMPLATE CREATE                                                           */
/* ========================================================================== */

const templateProps = (over = {}) => ({
    user: { id: 42 },
    addTemplateSchedule: jest.fn(),
    ...over,
});

describe('Schedule Template - Create', () => {

    afterEach(() => jest.clearAllMocks());

    /* ---------------------------------------------------------- PHASE 1 MOUNT */

    test('opening_the_new_template_screen_renders_an_empty_name_with_no_schedule_detail_form_and_asks_the_server_for_nothing', () => {
        const props = templateProps();
        const { container, queryByTestId } = render(<TemplateCreate {...props} />);

        expect(container.textContent).toContain('Schedule Template');
        expect(container.querySelector('input[name="name"]').value).toBe('');

        // no schedule type chosen yet -> none of the three detail forms is mounted
        expect(queryByTestId('std-form')).toBeNull();
        expect(queryByTestId('flex-form')).toBeNull();
        expect(queryByTestId('sched-details')).toBeNull();

        // the always-on policy blocks are there from the first paint
        expect(queryByTestId('holiday-policy')).toBeInTheDocument();
        expect(queryByTestId('schedule-policy')).toBeInTheDocument();
        expect(queryByTestId('work-days')).toBeInTheDocument();

        expect(props.addTemplateSchedule).not.toHaveBeenCalled();
    });

    /* --------------------------------------------------- PHASE 3 USER ACTIONS */

    test('picking_each_schedule_type_swaps_in_that_types_detail_form_and_customize_with_no_working_days_selected_renders_an_empty_day_list', async () => {
        const props = templateProps();
        const { container, queryByTestId, queryAllByTestId } = render(<TemplateCreate {...props} />);

        await act(async () => { fireEvent.click(radio(container, 'Standard')); });
        await flush();
        expect(container.textContent).toContain('Standard Form');
        expect(queryByTestId('std-form')).toBeInTheDocument();

        await act(async () => { fireEvent.click(radio(container, 'Flexible')); });
        await flush();
        expect(container.textContent).toContain('Flexible Form');
        expect(queryByTestId('flex-form')).toBeInTheDocument();
        expect(queryByTestId('std-form')).toBeNull();

        // EMPTY-data arm: no working day ticked, so the customise block has a heading and
        // nothing under it - the template can still be submitted in that state.
        await act(async () => { fireEvent.click(radio(container, 'Customize')); });
        await flush();
        expect(container.textContent).toContain('Customize Schedule');
        expect(queryAllByTestId('sched-details').length).toBe(0);

        expect(props.addTemplateSchedule).not.toHaveBeenCalled();
    });

    test('typing_a_template_name_keeps_it_in_the_form_state', async () => {
        const props = templateProps();
        const { container } = render(<TemplateCreate {...props} />);

        await act(async () => { typeInto(container.querySelector('input[name="name"]'), 'Night Shift'); });
        await flush();

        expect(container.querySelector('input[name="name"]').value).toBe('Night Shift');
    });

    /* -------------------------------------------------------- PHASE 4 SUBMIT */

    test('submitting_a_template_with_no_name_and_no_schedule_type_shows_both_errors_and_never_calls_the_api', async () => {
        const props = templateProps();
        const { container } = render(<TemplateCreate {...props} />);

        await act(async () => { fireEvent.submit(container.querySelector('form')); });
        await flush();

        expect(props.addTemplateSchedule).not.toHaveBeenCalled();
        expect(container.textContent).toContain('This field is required');
        expect(container.textContent).toContain('Please Select Schedule Type');
    });

    test('submitting_a_named_standard_template_sends_the_name_the_policies_and_the_flattened_schedule_details', async () => {
        const props = templateProps();
        const ref = React.createRef();
        render(<TemplateCreate {...props} ref={ref} />);

        await act(async () => {
            ref.current.onSubmitHandler({
                name: 'Night Shift',
                source_type: 'template',
                schedule_type: 'standard',
                work_days: ['mon', 'tue', 'wed'],
                schedule_policies: {
                    allow_undertime: 0, allow_late: 1, allow_night_diff: 1,
                    allow_special_holiday: 1, allow_legal_holiday: 1,
                },
                std_schedule_details: [{
                    start_time: new Date('2020-01-01 22:00:00'),
                    end_time:   new Date('2020-01-01 07:00:00'),
                    break_time: new Date('2020-01-01 01:00:00'),
                }],
                flx_schedule_details: [],
                cst_schedule_details: [],
            });
        });

        expect(props.addTemplateSchedule).toHaveBeenCalledTimes(1);
        const sent = props.addTemplateSchedule.mock.calls[0][0];
        expect(sent.name).toBe('Night Shift');
        expect(sent.source_type).toBe('template');
        expect(sent.schedule_details).toEqual({
            all: { start_time: '22:00', end_time: '07:00', break_time: '01:00' },
        });
        expect(sent.work_days).toEqual(['mon', 'tue', 'wed']);
        expect(sent.schedule_policies.allow_night_diff).toBe(1);
    });

    test('submitting_a_customised_template_sends_one_schedule_entry_per_working_day', async () => {
        const props = templateProps();
        const ref = React.createRef();
        render(<TemplateCreate {...props} ref={ref} />);

        const day = (h) => ({
            start_time:       new Date('2020-01-01 ' + h + ':00:00'),
            end_time:         new Date('2020-01-01 ' + (h + 8) + ':00:00'),
            start_flexy_time: new Date('2020-01-01 ' + (h - 1) + ':00:00'),
            end_flexy_time:   new Date('2020-01-01 ' + (h + 9) + ':00:00'),
            break_time:       new Date('2020-01-01 01:00:00'),
        });

        await act(async () => {
            ref.current.onSubmitHandler({
                name: 'Split Week',
                schedule_type: 'customize',
                work_days: ['mon', 'wed'],
                cst_schedule_details: [day(8), day(10)],
            });
        });

        const sent = props.addTemplateSchedule.mock.calls[0][0];
        expect(Object.keys(sent.schedule_details)).toEqual(['mon', 'wed']);
        expect(sent.schedule_details.mon.start_time).toBe('08:00');
        expect(sent.schedule_details.wed.start_time).toBe('10:00');
        expect(sent.schedule_details.wed.end_time).toBe('18:00');
    });
});

/* ========================================================================== */
/*  PAYROLL CUT-OFF FORM                                                      */
/* ========================================================================== */

const cutoffProps = (over = {}) => ({
    constant: {},
    isInstanceLoaded: true,
    isListInstanceLoaded: true,
    instance: {},
    listInstance: [],
    hideForm: jest.fn(),
    addPayrollCutoff: jest.fn(() => Promise.resolve()),
    updatePayrollCutoff: jest.fn(() => Promise.resolve()),
    fetchPayrollCutoffList: jest.fn(() => Promise.resolve()),
    clearPayrollCutoffListInstance: jest.fn(() => Promise.resolve()),
    ...over,
});

const EXISTING_CUTOFF = { id: 88, name: 'August 1st Half', start_date: '2026-08-01', end_date: '2026-08-15' };

describe('Payroll Cut-Off form', () => {

    let confirmSpy;

    beforeEach(() => { confirmSpy = jest.spyOn(window, 'confirm').mockImplementation(() => true); });
    afterEach(() => { confirmSpy.mockRestore(); jest.clearAllMocks(); });

    /* ---------------------------------------------------------- PHASE 1 MOUNT */

    test('opening_the_form_with_no_row_selected_shows_the_add_title_with_an_empty_name_and_both_dates_blank', () => {
        const props = cutoffProps();
        const { container, getByText } = render(<PayrollCutoffForm {...props} />);

        expect(getByText('Add Payroll Cut-Off')).toBeInTheDocument();
        expect(container.querySelector('input[name="name"]').value).toBe('');
        expect(container.querySelector('input[name="id"]').value).toBe('');

        const dates = container.querySelectorAll('[data-testid="datepicker"]');
        expect(dates.length).toBe(2);
        expect(dates[0].value).toBe('');
        expect(dates[1].value).toBe('');

        expect(props.addPayrollCutoff).not.toHaveBeenCalled();
        expect(props.fetchPayrollCutoffList).not.toHaveBeenCalled();
    });

    /* --------------------------------------------------- PHASE 2 DATA ARRIVES */

    test('an_existing_cut_off_arriving_from_the_list_flips_the_form_into_edit_mode_and_prefills_the_name_and_both_dates', async () => {
        const props = cutoffProps();
        const { container, rerender, getByText } = render(<PayrollCutoffForm {...props} />);

        await act(async () => {
            rerender(<PayrollCutoffForm {...props} instance={EXISTING_CUTOFF} />);
        });

        expect(getByText('Edit Payroll Cut-Off')).toBeInTheDocument();
        expect(container.querySelector('input[name="name"]').value).toBe('August 1st Half');
        expect(container.querySelector('input[name="id"]').value).toBe('88');

        const dates = container.querySelectorAll('[data-testid="datepicker"]');
        expect(dates[0].value).toBe('2026-08-01');
        expect(dates[1].value).toBe('2026-08-15');
    });

    test('clearing_the_selected_row_takes_the_form_back_to_add_mode_with_empty_fields', async () => {
        const props = cutoffProps({ instance: EXISTING_CUTOFF });
        const { container, rerender, getByText } = render(<PayrollCutoffForm {...props} />);
        expect(getByText('Edit Payroll Cut-Off')).toBeInTheDocument();

        await act(async () => { rerender(<PayrollCutoffForm {...props} instance={{}} />); });

        expect(getByText('Add Payroll Cut-Off')).toBeInTheDocument();
        expect(container.querySelector('input[name="name"]').value).toBe('');
        expect(container.querySelectorAll('[data-testid="datepicker"]')[0].value).toBe('');
    });

    /* --------------------------------------------------- PHASE 3 USER ACTIONS */

    test('pressing_cancel_closes_the_form_without_asking_for_confirmation_or_posting_anything', async () => {
        const props = cutoffProps();
        const { container } = render(<PayrollCutoffForm {...props} />);

        await act(async () => { fireEvent.click(btn(container, 'Cancel')); });
        await flush();

        expect(props.hideForm).toHaveBeenCalledTimes(1);
        expect(confirmSpy).not.toHaveBeenCalled();
        expect(props.addPayrollCutoff).not.toHaveBeenCalled();
        expect(props.updatePayrollCutoff).not.toHaveBeenCalled();
    });

    test('typing_a_name_and_picking_both_dates_updates_the_form_without_touching_the_server', async () => {
        const props = cutoffProps();
        const { container } = render(<PayrollCutoffForm {...props} />);

        await act(async () => { typeInto(container.querySelector('input[name="name"]'), 'September 2nd Half'); });
        await flush();
        const dates = () => container.querySelectorAll('[data-testid="datepicker"]');
        await act(async () => { pickDate(dates()[0], '2026-09-16'); });
        await flush();
        await act(async () => { pickDate(dates()[1], '2026-09-30'); });
        await flush();

        expect(container.querySelector('input[name="name"]').value).toBe('September 2nd Half');
        expect(dates()[0].value).toBe('2026-09-16');
        expect(dates()[1].value).toBe('2026-09-30');
        expect(props.addPayrollCutoff).not.toHaveBeenCalled();
    });

    /* -------------------------------------------------------- PHASE 4 SUBMIT */

    test('submitting_without_any_dates_blocks_the_save_shows_the_required_message_and_never_asks_for_confirmation', async () => {
        const props = cutoffProps();
        const { container } = render(<PayrollCutoffForm {...props} />);

        await act(async () => { typeInto(container.querySelector('input[name="name"]'), 'No dates'); });
        await flush();
        await act(async () => { fireEvent.submit(container.querySelector('form')); });
        await flush();

        expect(confirmSpy).not.toHaveBeenCalled();
        expect(props.addPayrollCutoff).not.toHaveBeenCalled();
        expect(props.hideForm).not.toHaveBeenCalled();
        expect(container.textContent).toContain('This field is required');
    });

    test('confirming_a_new_cut_off_posts_the_name_and_the_formatted_dates_then_closes_the_form_and_reloads_the_list', async () => {
        jest.useFakeTimers();
        const props = cutoffProps();
        const { container } = render(<PayrollCutoffForm {...props} />);

        await act(async () => { typeInto(container.querySelector('input[name="name"]'), 'September 1st Half'); });
        await flush();
        const dates = () => container.querySelectorAll('[data-testid="datepicker"]');
        await act(async () => { pickDate(dates()[0], '2026-09-01'); });
        await flush();
        await act(async () => { pickDate(dates()[1], '2026-09-15'); });
        await flush();

        await act(async () => { fireEvent.submit(container.querySelector('form')); });
        await flush();
        await flush();

        expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to submit/update this form?');
        expect(props.addPayrollCutoff).toHaveBeenCalledTimes(1);
        expect(props.updatePayrollCutoff).not.toHaveBeenCalled();

        const sent = props.addPayrollCutoff.mock.calls[0][0];
        expect(sent.get('method')).toBe('store');
        expect(sent.get('name')).toBe('September 1st Half');
        expect(sent.get('start_date')).toBe('2026-09-01');
        expect(sent.get('end_date')).toBe('2026-09-15');
        expect(sent.get('_method')).toBeNull();          // no PUT override on a create
        expect(sent.get('id')).toBeNull();               // null id is skipped entirely

        expect(props.hideForm).toHaveBeenCalledTimes(1);

        // the list is only refreshed after the 100ms settle timer
        expect(props.fetchPayrollCutoffList).not.toHaveBeenCalled();
        await act(async () => { jest.advanceTimersByTime(200); });
        await flush();
        expect(props.fetchPayrollCutoffList).toHaveBeenCalledTimes(1);
        jest.useRealTimers();
    });

    test('confirming_an_edited_cut_off_sends_a_put_override_with_the_row_id_to_the_update_endpoint', async () => {
        jest.useFakeTimers();
        const props = cutoffProps({ instance: EXISTING_CUTOFF });
        const { container } = render(<PayrollCutoffForm {...props} />);

        await act(async () => { typeInto(container.querySelector('input[name="name"]'), 'August 1st Half (revised)'); });
        await flush();
        await act(async () => { fireEvent.submit(container.querySelector('form')); });
        await flush();
        await flush();

        expect(props.updatePayrollCutoff).toHaveBeenCalledTimes(1);
        expect(props.addPayrollCutoff).not.toHaveBeenCalled();

        const [id, sent] = props.updatePayrollCutoff.mock.calls[0];
        expect(id).toBe(88);
        expect(sent.get('method')).toBe('update');
        expect(sent.get('id')).toBe('88');
        expect(sent.get('name')).toBe('August 1st Half (revised)');
        expect(sent.get('start_date')).toBe('2026-08-01');
        expect(sent.get('end_date')).toBe('2026-08-15');
        expect(sent.get('_method')).toBe('PUT');

        await act(async () => { jest.advanceTimersByTime(200); });
        await flush();
        expect(props.fetchPayrollCutoffList).toHaveBeenCalledTimes(1);
        jest.useRealTimers();
    });

    test('cancelling_the_confirmation_dialog_leaves_the_form_open_and_posts_nothing', async () => {
        confirmSpy.mockImplementation(() => false);
        const props = cutoffProps();
        const { container } = render(<PayrollCutoffForm {...props} />);

        const dates = () => container.querySelectorAll('[data-testid="datepicker"]');
        await act(async () => { pickDate(dates()[0], '2026-09-01'); });
        await flush();
        await act(async () => { pickDate(dates()[1], '2026-09-15'); });
        await flush();
        await act(async () => { fireEvent.submit(container.querySelector('form')); });
        await flush();

        expect(confirmSpy).toHaveBeenCalledTimes(1);
        expect(props.addPayrollCutoff).not.toHaveBeenCalled();
        expect(props.hideForm).not.toHaveBeenCalled();
        expect(props.fetchPayrollCutoffList).not.toHaveBeenCalled();
    });

    test('a_cut_off_whose_end_date_is_before_its_start_date_is_still_accepted_and_posted_FINDING_PCF_DATE_1', async () => {
        jest.useFakeTimers();
        const props = cutoffProps();
        const { container } = render(<PayrollCutoffForm {...props} />);

        const dates = () => container.querySelectorAll('[data-testid="datepicker"]');
        await act(async () => { pickDate(dates()[0], '2026-09-30'); });
        await flush();
        await act(async () => { pickDate(dates()[1], '2026-09-01'); });
        await flush();
        await act(async () => { fireEvent.submit(container.querySelector('form')); });
        await flush();
        await flush();

        // FINDING PCF-DATE-1 (characterised, not endorsed): the schema reads
        //   start_date: ...max( Yup.ref('start_date'), 'Please select a valid Start Date.')
        //   end_date:   ...min( Yup.ref('end_date'),   'Please select a valid End Date.')
        // Each bound points at ITS OWN field, so both comparisons are trivially true and the
        // cross-field check the messages promise never runs. A cut-off that ends a month
        // before it starts is saved without a word of warning.
        expect(container.textContent).not.toContain('Please select a valid Start Date.');
        expect(container.textContent).not.toContain('Please select a valid End Date.');
        expect(props.addPayrollCutoff).toHaveBeenCalledTimes(1);
        const sent = props.addPayrollCutoff.mock.calls[0][0];
        expect(sent.get('start_date')).toBe('2026-09-30');
        expect(sent.get('end_date')).toBe('2026-09-01');
        jest.useRealTimers();
    });

    test('when_the_save_endpoint_rejects_the_error_is_not_swallowed_and_the_form_is_never_closed', async () => {
        const props = cutoffProps({
            addPayrollCutoff: jest.fn(() => Promise.reject(new Error('500 from server'))),
        });
        const ref = React.createRef();
        render(<PayrollCutoffForm {...props} ref={ref} />);

        let caught = null;
        await act(async () => {
            try {
                await ref.current.onSubmitHandler({
                    method: 'store', id: null, name: 'Boom',
                    start_date: new Date('2026-09-01T00:00:00'),
                    end_date: new Date('2026-09-15T00:00:00'),
                });
            } catch (e) { caught = e; }
        });

        expect(props.addPayrollCutoff).toHaveBeenCalledTimes(1);
        expect(caught).toBeInstanceOf(Error);
        expect(props.hideForm).not.toHaveBeenCalled();
        expect(props.fetchPayrollCutoffList).not.toHaveBeenCalled();
    });
});
