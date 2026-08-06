/**
 * ScheduleAssignDeptAndTemplateEditLifecycle.test.js
 *
 * SOURCE FILES UNDER TEST
 *   container/Schedule/ScheduleAssignDepartment/ScheduleAssignDepartment.js
 *   container/Schedule/TemplateEdit/TemplateEdit.js
 *
 * MENU PATH
 *   Schedule -> Department Schedule (Assign Schedule to a whole Department)
 *   Schedule -> Templates -> [row] Edit  (Edit Schedule Template)
 *
 * 29-JUL COVERAGE BASELINE
 *   Read out of Latest-Test-30-07-2026/fe-per-file-gaps-20260729.csv (lines_total /
 *   lines_covered / lines_uncovered / line_pct columns of that run - these are LINE counts,
 *   not statement counts, and they are that run's numbers, not a re-measurement):
 *     ScheduleAssignDepartment.js  96 lines / 29 covered / 67 uncovered -> 30.2 %
 *     TemplateEdit.js              55 lines / 11 covered / 44 uncovered -> 20.0 %
 *   (111 uncovered lines combined - the reason for this packet.)
 *
 * FINDINGS CHARACTERISED HERE (they assert TODAY's behaviour, they do not endorse it)
 *   Every finding below is reached the way a user reaches it - a real submit event or a real
 *   button click through Formik + Yup - except where the note says otherwise.
 *
 *   SAD_CONFIRM_H     ScheduleAssignDepartment.onSubmitHandler seeds the confirmation text with
 *                     the placeholder string "h" and the switch has no default arm. `action` is
 *                     null in initialValues and is only written by the two button onClick
 *                     handlers, so an implicit submit (Enter inside the date field, a screen
 *                     reader's implicit submission) passes validation, asks the user
 *                     "Are you sure you want to h", and posts the payload with action: null.
 *                     Verified end to end: a plain form submit event on a fully valid screen
 *                     reaches the API mock. The two BUTTONS are fine - both are asserted to
 *                     carry their action through, so this is about the implicit path only.
 *   SAD_NULL_SCHED    setSchedule() optional-chains schedule?.creation_type / ?.valid_from /
 *                     ?.work_days but then reads schedule.schedule_policies un-guarded, so a
 *                     null default_schedule arriving while page_reloaded is true crashes the
 *                     screen instead of resetting it. Reached here through the prop change,
 *                     not by calling the method: the reducer stores `result.data.content`
 *                     verbatim, so a department with no default schedule delivers null.
 *   SAD_DEPT_ZERO     the department picker is gated by Validator.isValid(), which returns
 *                     false for any numeric zero. A department whose id is 0 can never be
 *                     selected - it silently behaves like "Select a Department".
 *   SAD_TO_DEAD       the schema makes `to` required only when source_type === 'update', but
 *                     source_type is hard-wired to 'default' in the initial state and is never
 *                     written anywhere on this screen, so that branch is unreachable. Proved
 *                     through Yup, not around it: after a TEMPLATE lands (the one path that
 *                     leaves to_date null) a start date is picked and Update is clicked - the
 *                     schema accepts it and the payload carries valid_to: undefined.
 *   SAD_TYPE_MSG      schedule_type starts as null and its rule is not .nullable(), so Yup fails
 *                     on the type cast before the required rule runs. The friendly "Please Select
 *                     Schedule Type" text is unreachable on a fresh department - the user is shown
 *                     Yup's raw internal cast message instead, printed twice on the page.
 *   SAD_UTC_DAY       valid_from / valid_to are cut with Date.toISOString(), i.e. the UTC
 *                     calendar day, while the picker hands over a LOCAL wall-clock Date. The
 *                     test builds its Dates from local calendar parts and reads the runner's
 *                     own UTC offset, so it states the same thing in any timezone: east of UTC
 *                     (Manila is UTC+8) a midnight pick is posted as the previous day, west of
 *                     UTC a late-evening pick is posted as the next one.
 *   SAD_CST_ORDER     the same positional-array defect as TE_CST_ORDER, on the department
 *                     screen: setSchedule() walks the saved schedule with `for (var key in
 *                     schedule.schedule_details)` (server key order) into a positional array,
 *                     and Formatter re-keys that array by work_days order.
 *   SAD_FMT_UNDEF     Formatter.format_schedule_details has no else arm and all three
 *                     `var schedule_details` declarations are branch-local, so a schedule whose
 *                     type is none of standard/flexible/customize returns undefined. Such a
 *                     schedule still passes the schema (any string of 3..255 chars) and is
 *                     posted with schedule_details: undefined.
 *   TE_NO_REINIT      TemplateEdit's Formik has no enableReinitialize, so a template arriving
 *                     after the first successful render never reaches the form - the user goes
 *                     on editing the previously loaded template's values.
 *   TE_CST_ORDER      TemplateEdit reads a customised template with `for (var key in
 *                     schedule_details)` (server key order) but Formatter re-emits it indexed
 *                     by work_days order. When the two orders differ the times are saved
 *                     against the wrong weekday.
 *   TE_NO_CONFIRM     TemplateEdit updates a template with no window.confirm, unlike every
 *                     other write path on the schedule screens.
 *
 * ADDITIVE ONLY - no existing test file and no application source is modified.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

/* ------------------------------------------------------------------ plumbing */

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
}));

jest.mock('../../services/API', () => ({ call: jest.fn() }));

const mockAuth = { scanLevel_Feature: jest.fn(() => true) };
jest.mock('../../services/Authenticator', () => ({
    __esModule: true,
    default: {
        scanLevel_Feature: (...a) => mockAuth.scanLevel_Feature(...a),
        scanLevel: jest.fn(() => true),
        scanFeature: jest.fn(() => true),
        checkPermission: jest.fn(() => true),
        checkRole: jest.fn(() => true),
    },
}));

jest.mock('../../components/GridComponent/AdminLte.js', () => {
    const R = require('react');
    return {
        ContainerHeader:  ({ children }) => R.createElement('div', null, children),
        Content:          ({ children }) => R.createElement('div', null, children),
        ContainerWrapper: ({ children }) => R.createElement('div', null, children),
        ContainerBody:    ({ children }) => R.createElement('div', null, children),
        Row:              ({ children }) => R.createElement('div', null, children),
        Col:              ({ children }) => R.createElement('div', null, children),
    };
});

jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/Template/BackButton', () => () => <button type="button">Back</button>);
jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading" />);

/* Deterministic date picker: a real <input> carrying the ISO day of the selected Date in UTC.
   UTC (not local) is used on purpose so the rendered value cannot drift with the runner's
   timezone - the SAD_UTC_DAY finding below is about exactly that cut. */
jest.mock('react-datepicker', () => {
    const R = require('react');
    return ({ selected, onChange }) => R.createElement('input', {
        'data-testid': 'datepicker',
        value: selected ? new Date(selected).toISOString().substring(0, 10) : '',
        onChange: (e) => onChange && onChange(
            e.target.value ? new Date(e.target.value + 'T00:00:00.000Z') : null),
    });
});

jest.mock('react-bootstrap', () => {
    const R = require('react');
    const box = (Tag) => ({ children }) => R.createElement(Tag, null, children);

    const FormControl = ({ children, as, name, value, onChange, placeholder, type }) =>
        as === 'select'
            ? R.createElement('select', { name, onChange, defaultValue: '' }, children)
            : R.createElement('input', {
                name, onChange, placeholder,
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
        InputGroup: box('div'),
        Tabs:       box('div'),
        Tab:        () => null,
        Button: ({ children, onClick, type, className }) =>
            R.createElement('button', { type: type || 'button', onClick, className }, children),
    };
});

/* The heavy schedule sub-forms are stubbed so that what is measured is the PARENT screen's
   lifecycle. WorkDays doubles as a probe on the live Formik values, which is how the
   initialValues these two screens compute (policies, detail arrays, day order) are asserted. */
const mockFormik = { values: null };
jest.mock('../../components/Schedule/ScheduleDetails.js', () => {
    const R = require('react');
    const { useFormikContext } = require('formik');
    const Probe = () => {
        mockFormik.values = useFormikContext().values;
        return R.createElement('div', { 'data-testid': 'work-days' });
    };
    return {
        Scheduledetails: ({ day, index }) => R.createElement('div', {
            'data-testid': 'sched-details', 'data-day': day, 'data-index': String(index) }),
        ScheduledetailsWithTimezone:          () => R.createElement('div', { 'data-testid': 'sched-details-tz' }),
        onSelectTimeHandlerStd:               jest.fn(),
        onSelectTimeHandlerFlexi:             jest.fn(),
        StandardSchedDetailsForm:             () => R.createElement('div', { 'data-testid': 'std-form' }),
        StandardSchedDetailsFormWithTimezone: () => R.createElement('div', { 'data-testid': 'std-form-tz' }),
        FlexibleSchedDetailsForm:             () => R.createElement('div', { 'data-testid': 'flex-form' }),
        FlexibleSchedDetailsFormWithTimezone: () => R.createElement('div', { 'data-testid': 'flex-form-tz' }),
        SchedulePolicy: ({ showAssignButton }) => R.createElement('div', {
            'data-testid': 'schedule-policy', 'data-assign': String(showAssignButton) }),
        ScheduleHolidayPolicy: ({ showAssignButton }) => R.createElement('div', {
            'data-testid': 'holiday-policy', 'data-assign': String(showAssignButton) }),
        WorkDays: Probe,
    };
});

jest.mock('../../store/actions/scheduleActions', () => ({
    scheduleAssign:      jest.fn(),
    getDefaultSchedule:  jest.fn(),
    listTemplate:        jest.fn(),
    getTemplateSchedule: jest.fn(),
    updateSchedule:      jest.fn(),
}));

global.links = new Proxy({}, { get: () => '/x/' });

const ScheduleAssignDepartment =
    require('../../container/Schedule/ScheduleAssignDepartment/ScheduleAssignDepartment').default;
const TemplateEdit =
    require('../../container/Schedule/TemplateEdit/TemplateEdit').default;

/* ------------------------------------------------------------------- helpers */

const flush = () => act(async () => { await Promise.resolve(); });

/** the radio inside the label whose visible text is exactly `text` (nth match, 0-based) */
const radio = (container, text, nth = 0) => {
    const hits = Array.from(container.querySelectorAll('label'))
        .filter((l) => l.textContent.replace(/ /g, '').trim() === text)
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

/** local wall-clock HH:mm of a Date - the same cut Formatter.convert_time makes */
const hhmm = (d) => String('00' + d.getHours()).slice(-2) + ':' + String('00' + d.getMinutes()).slice(-2);

/** the LOCAL calendar day of a Date, i.e. the day the user sees in the picker */
const localDay = (d) => d.getFullYear() + '-' +
    String('00' + (d.getMonth() + 1)).slice(-2) + '-' + String('00' + d.getDate()).slice(-2);

/* mockFormik.values is written by the WorkDays probe on every render. It is module-global, it
   survives RTL cleanup, and a stale value from an earlier test would silently satisfy a later
   assertion. Clear it before every test so that reading it can only ever see the render under
   test - if the probe never mounted, the test fails on null instead of passing on history. */
beforeEach(() => { mockFormik.values = null; });

/* ========================================================================== */
/*  SCHEDULE -> DEPARTMENT SCHEDULE  (ScheduleAssignDepartment.js)            */
/* ========================================================================== */

const DEPTS = [
    { id: 4, department_name: 'Engineering' },
    { id: 9, department_name: 'Finance' },
];

const deptProps = (over = {}) => ({
    user: { id: 42, departments_handled: DEPTS },
    page_reloaded: false,
    template_list: [],
    default_schedule: null,
    template_data: null,
    listTemplate: jest.fn(),
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
        allow_special_holiday: '0', allow_legal_holiday: '1',
    },
    schedule_type: 'standard',
    schedule_details: { all: { start_time: '09:00:00', end_time: '18:00:00', break_time: '01:00:00' } },
    ...over,
});

/** mount, pick a department, then let that department's saved schedule arrive */
const openDept = async (props, schedule = savedStandard(), extra = {}) => {
    const ref = React.createRef();
    const view = render(<ScheduleAssignDepartment {...props} ref={ref} />);
    await act(async () => {
        fireEvent.change(view.container.querySelector('select'), { target: { value: '4' } });
    });
    await act(async () => {
        view.rerender(<ScheduleAssignDepartment {...props} ref={ref}
            {...extra} default_schedule={schedule} page_reloaded={true} />);
    });
    return { ...view, ref };
};

describe('Department Schedule - PHASE 1: opening the screen', () => {

    afterEach(() => jest.clearAllMocks());

    test('opening_the_screen_asks_the_server_for_the_template_list_and_shows_nothing_but_the_department_picker_until_a_department_is_chosen', () => {
        const props = deptProps();
        const { container, ref, queryByTestId } = (() => {
            const r = React.createRef();
            const v = render(<ScheduleAssignDepartment {...props} ref={r} />);
            return { ...v, ref: r };
        })();

        expect(props.listTemplate).toHaveBeenCalledTimes(1);
        expect(props.listTemplate).toHaveBeenCalledWith();
        expect(props.getDefaultSchedule).not.toHaveBeenCalled();
        expect(props.getTemplateSchedule).not.toHaveBeenCalled();

        // the bind_id gate is closed, so none of the schedule blocks exist yet
        expect(ref.current.state.bind_id).toBe('');
        expect(ref.current.state.bind_to).toBe('department');
        expect(container.textContent).toContain('Departments Handled');
        expect(container.textContent).not.toContain('Schedule Scope');
        expect(container.textContent).not.toContain('Creation Type');
        expect(queryByTestId('holiday-policy')).toBeNull();
        expect(queryByTestId('work-days')).toBeNull();
        expect(container.querySelectorAll('[data-testid="datepicker"]').length).toBe(0);
    });

    test('the_department_picker_lists_one_option_per_handled_department_on_top_of_the_placeholder', () => {
        const props = deptProps();
        const { container } = render(<ScheduleAssignDepartment {...props} />);

        const options = Array.from(container.querySelector('select').querySelectorAll('option'));
        expect(options.map((o) => o.textContent))
            .toEqual(['Select a Department', 'Engineering', 'Finance']);
        expect(options.map((o) => o.value)).toEqual(['', '4', '9']);
    });

    test('a_user_who_handles_no_department_gets_the_placeholder_option_and_nothing_else', () => {
        const props = deptProps({ user: { id: 42, departments_handled: [] } });
        const { container } = render(<ScheduleAssignDepartment {...props} />);

        const options = Array.from(container.querySelector('select').querySelectorAll('option'));
        expect(options.length).toBe(1);
        expect(options[0].textContent).toBe('Select a Department');
        expect(props.getDefaultSchedule).not.toHaveBeenCalled();
    });
});

describe('Department Schedule - PHASE 2: choosing a department', () => {

    afterEach(() => jest.clearAllMocks());

    test('choosing_a_department_records_it_asks_for_that_departments_default_schedule_and_opens_the_rest_of_the_form', async () => {
        const props = deptProps();
        const ref = React.createRef();
        const { container } = render(<ScheduleAssignDepartment {...props} ref={ref} />);

        await act(async () => {
            fireEvent.change(container.querySelector('select'), { target: { value: '9' } });
        });

        expect(ref.current.state.bind_id).toBe('9');
        expect(props.getDefaultSchedule).toHaveBeenCalledTimes(1);
        expect(props.getDefaultSchedule).toHaveBeenCalledWith('department', '9');

        expect(container.textContent).toContain('Schedule Scope');
        expect(container.textContent).toContain('Creation Type');
        expect(container.textContent).toContain('Holiday Policy');
        expect(container.textContent).toContain('Work Days');
        expect(container.querySelectorAll('[data-testid="datepicker"]').length).toBe(1);
        expect(props.scheduleAssign).not.toHaveBeenCalled();
    });

    test('going_back_to_the_blank_placeholder_clears_the_department_closes_the_form_and_asks_the_server_for_nothing', async () => {
        const props = deptProps();
        const ref = React.createRef();
        const { container } = render(<ScheduleAssignDepartment {...props} ref={ref} />);

        await act(async () => {
            fireEvent.change(container.querySelector('select'), { target: { value: '4' } });
        });
        expect(container.textContent).toContain('Schedule Scope');

        await act(async () => {
            fireEvent.change(container.querySelector('select'), { target: { value: '' } });
        });

        expect(ref.current.state.bind_id).toBe('');
        expect(container.textContent).not.toContain('Schedule Scope');
        // the invalid arm never reaches the API - only the first, valid pick did
        expect(props.getDefaultSchedule).toHaveBeenCalledTimes(1);
    });

    /* FINDING SAD_DEPT_ZERO - Validator.isValid() answers false for any numeric zero
       ("0" included), and loadDepartmentSchedule is gated on it. A department whose primary key
       is 0 therefore behaves exactly like the blank placeholder: nothing is fetched, the form
       never opens, and the user gets no explanation. */
    test('a_department_whose_id_is_zero_can_never_be_selected_and_is_silently_treated_as_no_department_FINDING_SAD_DEPT_ZERO', async () => {
        const props = deptProps({
            user: { id: 42, departments_handled: [{ id: 0, department_name: 'Unassigned' }] },
        });
        const ref = React.createRef();
        const { container } = render(<ScheduleAssignDepartment {...props} ref={ref} />);

        await act(async () => {
            fireEvent.change(container.querySelector('select'), { target: { value: '0' } });
        });

        expect(ref.current.state.bind_id).toBe('');
        expect(props.getDefaultSchedule).not.toHaveBeenCalled();
        expect(container.textContent).not.toContain('Schedule Scope');
    });
});

describe('Department Schedule - PHASE 2: the saved schedule arrives', () => {

    afterEach(() => jest.clearAllMocks());

    test('a_saved_standard_schedule_rebuilds_the_dates_the_work_days_the_parsed_policies_and_swaps_in_the_standard_detail_form', async () => {
        const props = deptProps();
        const { container, ref, queryByTestId } = await openDept(props);

        expect(ref.current.state.creation_type).toBe('customize');
        expect(ref.current.state.schedule_type).toBe('standard');
        expect(ref.current.state.work_day).toEqual(['mon', 'tue']);
        expect(ref.current.state.from_date.toISOString().substring(0, 10)).toBe('2026-08-01');

        // every policy is parsed to an integer, keeping the stored zero rather than the default
        expect(ref.current.state.schedule_policies).toEqual({
            allow_late: 5, allow_undertime: 0, allow_night_diff: 1,
            allow_special_holiday: 0, allow_legal_holiday: 1,
        });

        expect(hhmm(ref.current.state.std_schedule_details[0].start_time)).toBe('09:00');
        expect(hhmm(ref.current.state.std_schedule_details[0].end_time)).toBe('18:00');
        expect(hhmm(ref.current.state.std_schedule_details[0].break_time)).toBe('01:00');
        expect(ref.current.state.flx_schedule_details).toEqual([]);
        expect(ref.current.state.cst_schedule_details).toEqual([]);

        expect(container.textContent).toContain('Standard Schedule');
        expect(queryByTestId('std-form')).toBeInTheDocument();
        expect(queryByTestId('flex-form')).toBeNull();
        expect(queryByTestId('sched-details')).toBeNull();
    });

    test('a_schedule_arriving_with_the_reloaded_flag_off_leaves_the_form_untouched_while_the_same_schedule_with_the_flag_on_rebuilds_it', async () => {
        const props = deptProps();
        const ref = React.createRef();
        const view = render(<ScheduleAssignDepartment {...props} ref={ref} />);
        await act(async () => {
            fireEvent.change(view.container.querySelector('select'), { target: { value: '4' } });
        });

        // OFF arm
        await act(async () => {
            view.rerender(<ScheduleAssignDepartment {...props} ref={ref}
                default_schedule={savedStandard()} page_reloaded={false} />);
        });
        expect(ref.current.state.schedule_type).toBeNull();
        expect(view.container.textContent).not.toContain('Standard Schedule');

        // ON arm - a *different* object so the !== identity check fires again
        await act(async () => {
            view.rerender(<ScheduleAssignDepartment {...props} ref={ref}
                default_schedule={savedStandard()} page_reloaded={true} />);
        });
        expect(ref.current.state.schedule_type).toBe('standard');
        expect(view.container.textContent).toContain('Standard Schedule');
    });

    test('a_saved_schedule_with_no_policies_and_no_start_date_falls_back_to_all_defaults_and_a_blank_date_from', async () => {
        const props = deptProps();
        const before = Date.now();
        const { container, ref } = await openDept(props, {
            creation_type: null,
            valid_from: null,
            work_days: null,
            schedule_policies: {},
            schedule_type: 'standard',
            schedule_details: { all: { start_time: '09:00:00', end_time: '18:00:00', break_time: '01:00:00' } },
        });

        expect(ref.current.state.creation_type).toBe('customize');
        expect(ref.current.state.from_date).toBeNull();
        expect(ref.current.state.work_day).toEqual([]);
        // the empty-policy arm: lateness/undertime/night-diff default OFF, both holidays default ON
        expect(ref.current.state.schedule_policies).toEqual({
            allow_late: 0, allow_undertime: 0, allow_night_diff: 0,
            allow_special_holiday: 1, allow_legal_holiday: 1,
        });

        // Date To is always set to "now + 9 hours" for a non-template schedule
        const nineHours = 9 * 60 * 60 * 1000;
        const drift = ref.current.state.to_date.getTime() - before - nineHours;
        expect(drift).toBeGreaterThanOrEqual(0);
        expect(drift).toBeLessThan(60 * 1000);

        expect(container.querySelector('[data-testid="datepicker"]').value).toBe('');
    });

    test('a_saved_flexible_schedule_builds_the_five_flexible_times_and_swaps_in_the_flexible_detail_form', async () => {
        const props = deptProps();
        const { container, ref, queryByTestId } = await openDept(props, savedStandard({
            schedule_type: 'flexible',
            schedule_details: { all: {
                start_time: '09:00:00', end_time: '18:00:00',
                start_flexy_time: '08:00:00', end_flexy_time: '10:00:00',
                break_time: '01:00:00' } },
        }));

        expect(ref.current.state.std_schedule_details).toEqual([]);
        const row = ref.current.state.flx_schedule_details[0];
        expect(hhmm(row.start_time)).toBe('09:00');
        expect(hhmm(row.end_time)).toBe('18:00');
        expect(hhmm(row.start_flexy_time)).toBe('08:00');
        expect(hhmm(row.end_flexy_time)).toBe('10:00');
        expect(hhmm(row.break_time)).toBe('01:00');

        expect(container.textContent).toContain('Flexible Schedule');
        expect(queryByTestId('flex-form')).toBeInTheDocument();
        expect(queryByTestId('std-form')).toBeNull();
    });

    test('a_saved_customised_schedule_builds_one_row_per_stored_day_and_lays_out_one_day_block_per_working_day', async () => {
        const props = deptProps();
        const { ref, queryAllByTestId, container } = await openDept(props, savedStandard({
            schedule_type: 'customize',
            work_days: ['mon', 'wed'],
            schedule_details: {
                mon: { start_time: '09:00:00', end_time: '18:00:00', start_flexy_time: '08:00:00', end_flexy_time: '10:00:00', break_time: '01:00:00' },
                wed: { start_time: '11:00:00', end_time: '20:00:00', start_flexy_time: '10:00:00', end_flexy_time: '12:00:00', break_time: '01:00:00' },
            },
        }));

        expect(ref.current.state.cst_schedule_details.length).toBe(2);
        expect(hhmm(ref.current.state.cst_schedule_details[0].start_time)).toBe('09:00');
        expect(hhmm(ref.current.state.cst_schedule_details[1].start_time)).toBe('11:00');

        expect(container.textContent).toContain('Customize Schedule');
        const blocks = queryAllByTestId('sched-details');
        expect(blocks.length).toBe(2);
        // the weekday blocks are laid out in calendar order and carry their index into work_days
        expect(blocks.map((b) => b.getAttribute('data-day'))).toEqual(['mon', 'wed']);
        expect(blocks.map((b) => b.getAttribute('data-index'))).toEqual(['0', '1']);
    });

    test('a_saved_schedule_of_an_unknown_type_keeps_the_type_but_renders_none_of_the_three_detail_forms', async () => {
        const props = deptProps();
        const { ref, queryByTestId, container } = await openDept(props,
            savedStandard({ schedule_type: 'rotating' }));

        expect(ref.current.state.schedule_type).toBe('rotating');
        expect(ref.current.state.std_schedule_details).toEqual([]);
        expect(ref.current.state.flx_schedule_details).toEqual([]);
        expect(ref.current.state.cst_schedule_details).toEqual([]);
        expect(queryByTestId('std-form')).toBeNull();
        expect(queryByTestId('flex-form')).toBeNull();
        expect(queryByTestId('sched-details')).toBeNull();
        expect(container.textContent).not.toContain('Standard Schedule');
    });

    /* FINDING SAD_NULL_SCHED - setSchedule() guards schedule?.creation_type, schedule?.valid_from
       and schedule?.work_days with optional chaining, then reads `schedule.schedule_policies`
       with a plain dot on the very next statement. The reducer stores the API body verbatim
       (defaultSchedule: action.schedule, i.e. result.data.content) and sets isScheduleLoaded
       true alongside it, so a department that has no default schedule delivers null with the
       reloaded flag ON - and the rebuild throws instead of clearing the form.
       Driven by the prop change, exactly as componentWillReceiveProps sees it. */
    test('a_department_whose_saved_schedule_comes_back_null_crashes_the_rebuild_instead_of_clearing_the_form_FINDING_SAD_NULL_SCHED', async () => {
        const props = deptProps();
        const view = await openDept(props);
        expect(view.ref.current.state.schedule_type).toBe('standard');

        let caught = null;
        try {
            await act(async () => {
                view.rerender(<ScheduleAssignDepartment {...props} ref={view.ref}
                    default_schedule={null} page_reloaded={true} />);
            });
        } catch (e) { caught = e; }

        expect(caught).toBeInstanceOf(TypeError);
        expect(String(caught.message)).toMatch(/schedule_policies/);
        expect(props.scheduleAssign).not.toHaveBeenCalled();
    });
});

describe('Department Schedule - PHASE 3: creation type and templates', () => {

    afterEach(() => jest.clearAllMocks());

    test('the_template_list_arriving_from_the_server_is_stored_and_only_becomes_visible_once_the_template_creation_type_is_picked', async () => {
        const props = deptProps();
        const templates = [{ id: 3, name: 'Night Shift' }, { id: 7, name: 'Morning Shift' }];
        const { container, ref } = await openDept(props, savedStandard(), { template_list: templates });

        expect(ref.current.state.templateList).toEqual(templates);
        // the schedule was hand-built, so the screen opens on Customize and hides the picker
        expect(ref.current.state.creation_type).toBe('customize');
        expect(container.querySelectorAll('select').length).toBe(1);

        await act(async () => { fireEvent.click(radio(container, 'Template')); });
        await flush();

        const selects = container.querySelectorAll('select');
        expect(selects.length).toBe(2);
        expect(Array.from(selects[1].querySelectorAll('option')).map((o) => o.textContent))
            .toEqual(['Please Select Template', 'Night Shift', 'Morning Shift']);
    });

    test('picking_a_template_fetches_that_template_as_a_default_schedule_while_picking_the_blank_option_fetches_nothing', async () => {
        const props = deptProps();
        const templates = [{ id: 3, name: 'Night Shift' }, { id: 7, name: 'Morning Shift' }];
        const { container } = await openDept(props, savedStandard(), { template_list: templates });

        await act(async () => { fireEvent.click(radio(container, 'Template')); });
        await flush();
        const templateSelect = container.querySelectorAll('select')[1];

        await act(async () => { fireEvent.change(templateSelect, { target: { value: '7' } }); });
        await flush();

        expect(props.getTemplateSchedule).toHaveBeenCalledTimes(1);
        expect(props.getTemplateSchedule).toHaveBeenCalledWith('7', 'Default');

        // invalid arm - the placeholder is rejected by the Validator gate
        await act(async () => { fireEvent.change(templateSelect, { target: { value: '' } }); });
        await flush();
        expect(props.getTemplateSchedule).toHaveBeenCalledTimes(1);
    });

    test('with_no_templates_loaded_the_template_picker_offers_only_the_placeholder_and_nothing_can_be_fetched', async () => {
        const props = deptProps();
        const { container } = await openDept(props, savedStandard(), { template_list: [] });

        await act(async () => { fireEvent.click(radio(container, 'Template')); });
        await flush();

        const templateSelect = container.querySelectorAll('select')[1];
        const options = Array.from(templateSelect.querySelectorAll('option'));
        expect(options.length).toBe(1);
        expect(options[0].textContent).toBe('Please Select Template');
        expect(props.getTemplateSchedule).not.toHaveBeenCalled();
    });

    test('a_template_arriving_from_the_server_switches_the_creation_type_to_template_and_deliberately_leaves_the_date_range_alone', async () => {
        const props = deptProps();
        const ref = React.createRef();
        const view = render(<ScheduleAssignDepartment {...props} ref={ref} />);
        await act(async () => {
            fireEvent.change(view.container.querySelector('select'), { target: { value: '4' } });
        });

        await act(async () => {
            view.rerender(<ScheduleAssignDepartment {...props} ref={ref} template_data={{
                work_days: ['mon', 'tue', 'wed'],
                schedule_policies: { allow_late: '1', allow_undertime: '1', allow_night_diff: '0',
                    allow_special_holiday: '0', allow_legal_holiday: '0' },
                schedule_details: { all: { start_time: '22:00:00', end_time: '07:00:00', break_time: '01:00:00' } },
                schedule_type: 'standard',
            }} />);
        });

        expect(ref.current.state.creation_type).toBe('template');
        expect(ref.current.state.work_day).toEqual(['mon', 'tue', 'wed']);
        expect(ref.current.state.schedule_policies.allow_special_holiday).toBe(0);
        expect(hhmm(ref.current.state.std_schedule_details[0].start_time)).toBe('22:00');
        // the creation_type == 'template' branch skips the from/to rebuild entirely
        expect(ref.current.state.from_date).toBeNull();
        expect(ref.current.state.to_date).toBeNull();
    });

    /* The template_data guard is `nextProps.template_data !== this.props.template_data &&
       Validator.isValid(nextProps.template_data)`. Both halves have to be exercised, so the
       template that is cleared here has to ARRIVE first: rerendering a component whose
       template_data prop is already null with template_data={null} changes no identity, the
       guard short-circuits on the !== and the Validator is never consulted at all. */
    test('a_template_that_is_cleared_back_to_null_is_rejected_by_the_validator_and_leaves_the_loaded_template_in_place', async () => {
        const arrived = {
            work_days: ['mon', 'tue', 'wed'],
            schedule_policies: { allow_late: '1', allow_undertime: '1', allow_night_diff: '0',
                allow_special_holiday: '0', allow_legal_holiday: '0' },
            schedule_details: { all: { start_time: '22:00:00', end_time: '07:00:00', break_time: '01:00:00' } },
            schedule_type: 'standard',
        };
        const props = deptProps();
        const ref = React.createRef();
        const view = render(<ScheduleAssignDepartment {...props} ref={ref} />);
        await act(async () => {
            fireEvent.change(view.container.querySelector('select'), { target: { value: '4' } });
        });

        // a real template lands - the screen is now on 'template' / 'standard'
        await act(async () => {
            view.rerender(<ScheduleAssignDepartment {...props} ref={ref} template_data={arrived} />);
        });
        expect(ref.current.state.creation_type).toBe('template');
        expect(ref.current.state.schedule_type).toBe('standard');

        // now the store clears it. The identity DID change, so the only thing that can stop
        // setSchedule(null) - which would throw, see FINDING_SAD_NULL_SCHED - is the Validator.
        await act(async () => {
            view.rerender(<ScheduleAssignDepartment {...props} ref={ref} template_data={null} />);
        });

        expect(ref.current.state.creation_type).toBe('template');
        expect(ref.current.state.schedule_type).toBe('standard');
        expect(ref.current.state.work_day).toEqual(['mon', 'tue', 'wed']);
        expect(view.container.textContent).toContain('Standard Schedule');
    });
});

describe('Department Schedule - PHASE 3: choosing the schedule type by hand', () => {

    afterEach(() => jest.clearAllMocks());

    test('each_schedule_type_radio_swaps_in_its_own_detail_form_and_customize_lays_out_one_block_per_working_day', async () => {
        const props = deptProps();
        const { container, queryByTestId, queryAllByTestId } = await openDept(props);

        expect(queryByTestId('std-form')).toBeInTheDocument();

        await act(async () => { fireEvent.click(radio(container, 'Flexible')); });
        await flush();
        expect(queryByTestId('flex-form')).toBeInTheDocument();
        expect(queryByTestId('std-form')).toBeNull();
        expect(mockFormik.values.schedule_type).toBe('flexible');
        expect(mockFormik.values.flx_schedule_details).toEqual([
            { break_time: '', start_time: '', end_time: '', start_flexy_time: '', end_flexy_time: '' }]);

        // "Customize" appears twice - the first is the creation type, the second the schedule type
        await act(async () => { fireEvent.click(radio(container, 'Customize', 1)); });
        await flush();
        expect(container.textContent).toContain('Customize Schedule');
        // the saved schedule works mon + tue, so exactly two day blocks are pushed
        expect(queryAllByTestId('sched-details').length).toBe(2);
        expect(mockFormik.values.cst_schedule_details.length).toBe(2);

        await act(async () => { fireEvent.click(radio(container, 'Standard')); });
        await flush();
        expect(queryByTestId('std-form')).toBeInTheDocument();
        expect(mockFormik.values.std_schedule_details).toEqual([
            { break_time: '', start_time: '', end_time: '' }]);

        expect(props.scheduleAssign).not.toHaveBeenCalled();
    });

    test('picking_customize_when_the_department_works_no_days_produces_a_heading_with_no_day_blocks_at_all', async () => {
        const props = deptProps();
        const { container, queryAllByTestId } = await openDept(props,
            savedStandard({ work_days: [] }));

        await act(async () => { fireEvent.click(radio(container, 'Customize', 1)); });
        await flush();

        expect(container.textContent).toContain('Customize Schedule');
        expect(queryAllByTestId('sched-details').length).toBe(0);
        expect(mockFormik.values.cst_schedule_details).toEqual([]);
        expect(props.scheduleAssign).not.toHaveBeenCalled();
    });
});

describe('Department Schedule - PHASE 3: who may assign to everybody', () => {

    afterEach(() => { mockAuth.scanLevel_Feature.mockImplementation(() => true); jest.clearAllMocks(); });

    test('a_department_head_with_the_manage_department_schedules_feature_gets_the_assign_to_all_button_and_the_policy_assign_buttons', async () => {
        mockAuth.scanLevel_Feature.mockImplementation(() => true);
        const props = deptProps();
        const { container, getByTestId } = await openDept(props);

        expect(btn(container, 'Assign to all employees')).toBeDefined();
        expect(getByTestId('holiday-policy').getAttribute('data-assign')).toBe('true');
        expect(getByTestId('schedule-policy').getAttribute('data-assign')).toBe('true');
        expect(mockAuth.scanLevel_Feature).toHaveBeenCalledWith(
            ['SubDepartment Head', 'Department Head', 'DivisionHead', 'Board', 'Admin', 'HR', 'Payroll'],
            'manage_department_schedules');
    });

    test('a_user_without_that_feature_still_gets_update_but_loses_the_assign_to_all_button_and_both_policy_assign_buttons', async () => {
        mockAuth.scanLevel_Feature.mockImplementation(() => false);
        const props = deptProps();
        const { container, getByTestId } = await openDept(props);

        expect(btn(container, 'Assign to all employees')).toBeUndefined();
        expect(btn(container, 'Update')).toBeDefined();
        expect(getByTestId('holiday-policy').getAttribute('data-assign')).toBe('false');
        expect(getByTestId('schedule-policy').getAttribute('data-assign')).toBe('false');
    });
});

describe('Department Schedule - PHASE 4: saving the assignment', () => {

    let confirmSpy;
    beforeEach(() => { confirmSpy = jest.spyOn(window, 'confirm').mockImplementation(() => true); });
    afterEach(() => { confirmSpy.mockRestore(); jest.clearAllMocks(); });

    /* FINDING SAD_TYPE_MSG - schedule_type is initialised to null, but its rule is
       `Yup.string().min(3).max(255).required('Please Select Schedule Type')` with no
       `.nullable()`. Yup therefore fails on the TYPE CAST before it ever reaches the required
       rule, so the friendly message is unreachable on a fresh department and the user is shown
       Yup's raw internal text instead - twice, once under Creation Type and once under Schedule
       Type, because the same errors.schedule_type is printed in both blocks. */
    test('submitting_before_a_schedule_type_has_been_chosen_leaks_yups_raw_cast_error_instead_of_the_friendly_message_and_posts_nothing_FINDING_SAD_TYPE_MSG', async () => {
        const props = deptProps();
        const ref = React.createRef();
        const { container } = render(<ScheduleAssignDepartment {...props} ref={ref} />);
        await act(async () => {
            fireEvent.change(container.querySelector('select'), { target: { value: '4' } });
        });
        expect(ref.current.state.schedule_type).toBeNull();

        await act(async () => { fireEvent.submit(container.querySelector('form')); });
        await flush();

        expect(container.textContent).not.toContain('Please Select Schedule Type');
        expect(container.textContent).toContain('schedule_type must be a `string` type');
        // the same raw message is printed under both the Creation Type and Schedule Type blocks
        expect(container.textContent.match(/schedule_type must be a `string` type/g).length).toBe(2);
        // the missing start date is reported properly, so the guard itself does hold
        expect(container.textContent).toContain('This field is required');
        expect(confirmSpy).not.toHaveBeenCalled();
        expect(props.scheduleAssign).not.toHaveBeenCalled();
    });

    test('choosing_a_schedule_type_and_a_start_date_clears_every_validation_message_that_blocked_the_first_attempt', async () => {
        const props = deptProps();
        const ref = React.createRef();
        const { container } = render(<ScheduleAssignDepartment {...props} ref={ref} />);
        await act(async () => {
            fireEvent.change(container.querySelector('select'), { target: { value: '4' } });
        });
        await act(async () => { fireEvent.submit(container.querySelector('form')); });
        await flush();
        expect(container.textContent).toContain('This field is required');

        // VALID arm - pick Standard, fill the three standard times and a start date
        await act(async () => { fireEvent.click(radio(container, 'Standard')); });
        await flush();
        await act(async () => {
            typeInto(container.querySelector('[data-testid="datepicker"]'), '2026-09-01');
        });
        await flush();

        expect(container.textContent).not.toContain('schedule_type must be a `string` type');
        expect(container.textContent).not.toContain('This field is required');
        expect(props.scheduleAssign).not.toHaveBeenCalled();
    });

    /* Driven through the real Update button, so the whole pipeline is under test: the button's
       setFieldValue('action','update') has to land before handleSubmit reads the values, the
       schema has to ACCEPT the schedule the server sent back, and only then is anything posted.
       (setFieldValue is asynchronous in Formik 2 and is called in the same tick as handleSubmit,
       so the ordering is worth asserting rather than assuming - it holds.) */
    test('clicking_update_posts_the_department_binding_the_start_date_and_the_flattened_standard_times_after_the_user_confirms', async () => {
        const props = deptProps();
        const { container } = await openDept(props);
        expect(mockFormik.values.bind_id).toBe('4');
        expect(mockFormik.values.action).toBeNull();

        await act(async () => { fireEvent.click(btn(container, 'Update')); });
        await flush();
        await flush();

        expect(confirmSpy).toHaveBeenCalledTimes(1);
        expect(confirmSpy).toHaveBeenCalledWith(
            'Are you sure you want to Update Department Schedule');
        expect(props.scheduleAssign).toHaveBeenCalledTimes(1);

        const sent = props.scheduleAssign.mock.calls[0][0];
        expect(sent.action).toBe('update');
        expect(sent.bind_to).toBe('department');
        expect(sent.bind_id).toBe('4');
        expect(sent.schedule_type).toBe('standard');
        expect(sent.valid_from).toBe('2026-08-01');
        expect(sent.schedule_details).toEqual({
            all: { start_time: '09:00', end_time: '18:00', break_time: '01:00' } });
        expect(sent.work_days).toEqual(['mon', 'tue']);
    });

    test('clicking_assign_to_all_employees_warns_that_dtr_records_will_be_rewritten_before_posting_the_assign_action', async () => {
        const props = deptProps();
        const { container } = await openDept(props);

        await act(async () => { fireEvent.click(btn(container, 'Assign to all employees')); });
        await flush();
        await flush();

        expect(confirmSpy).toHaveBeenCalledTimes(1);
        expect(confirmSpy).toHaveBeenCalledWith(
            'Are you sure you want to Assign this Schedule with policies to ALL Employees of ' +
            'this department this will also update their DTR records Please Confirm.');
        expect(props.scheduleAssign).toHaveBeenCalledTimes(1);
        expect(props.scheduleAssign.mock.calls[0][0].action).toBe('assign');
    });

    /* The two policy-only actions are raised from inside SchedulePolicy / ScheduleHolidayPolicy,
       which are stubbed here (this packet measures the PARENT screen), so there is no button on
       the rendered tree to click for them. This one is deliberately handler-level and its name
       claims no more than the warning text it checks. */
    test('each_of_the_two_policy_only_actions_carries_its_own_all_employees_warning_when_the_handler_receives_it', async () => {
        const props = deptProps();
        const { ref } = await openDept(props);
        const base = mockFormik.values;

        await act(async () => {
            ref.current.onSubmitHandler({ ...base, action: 'assign_schedule_holiday_policy' });
        });
        expect(confirmSpy).toHaveBeenLastCalledWith(
            'Are you sure you want to Assign this Holiday policies to ALL Employees of this department.');

        await act(async () => {
            ref.current.onSubmitHandler({ ...base, action: 'assign_schedule_policy' });
        });
        expect(confirmSpy).toHaveBeenLastCalledWith(
            'Are you sure you want to Assign this Schedule policies to ALL Employees of this department.');

        expect(props.scheduleAssign).toHaveBeenCalledTimes(2);
        expect(props.scheduleAssign.mock.calls[0][0].action).toBe('assign_schedule_holiday_policy');
        expect(props.scheduleAssign.mock.calls[1][0].action).toBe('assign_schedule_policy');
    });

    test('declining_the_confirmation_dialog_abandons_the_assignment_without_posting_anything', async () => {
        confirmSpy.mockImplementation(() => false);
        const props = deptProps();
        const { container } = await openDept(props);

        await act(async () => { fireEvent.click(btn(container, 'Assign to all employees')); });
        await flush();
        await flush();

        expect(confirmSpy).toHaveBeenCalledTimes(1);
        expect(props.scheduleAssign).not.toHaveBeenCalled();
    });

    /* FINDING SAD_CONFIRM_H - the switch in onSubmitHandler has no default arm and confirm_msg is
       seeded with the literal placeholder "h". `action` starts as null in initialValues and is
       only written by the two button onClick handlers, so submitting the form any other way
       (Enter inside the date field, a screen reader's implicit submit) shows the user
       "Are you sure you want to h" - and posts the payload with a null action if they say yes.
       This is the implicit-submit path, fired as a real submit event on a screen the schema
       fully accepts: no handler is called by hand, the post below comes out of Formik + Yup. */
    test('an_implicit_submit_that_never_set_an_action_asks_the_user_to_confirm_the_literal_placeholder_h_and_still_posts_FINDING_SAD_CONFIRM_H', async () => {
        const props = deptProps();
        const { container } = await openDept(props);
        expect(mockFormik.values.action).toBeNull();

        await act(async () => { fireEvent.submit(container.querySelector('form')); });
        await flush();
        await flush();

        expect(confirmSpy).toHaveBeenCalledTimes(1);
        expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to h');
        expect(props.scheduleAssign).toHaveBeenCalledTimes(1);
        expect(props.scheduleAssign.mock.calls[0][0].action).toBeNull();
    });

    /* FINDING SAD_TO_DEAD - the schema only requires `to` when source_type === 'update', and
       source_type is initialised to 'default' and never written on this screen, so that branch
       is dead and an open-ended assignment is always accepted.
       The one path that really leaves `to` empty is a TEMPLATE: setSchedule() skips the
       from/to rebuild entirely when creation_type is 'template', so both dates come back null.
       The user then picks a start date and clicks Update - which is exactly what is done here,
       so the "accepted" half is proved BY Yup rather than around it. */
    test('an_assignment_built_from_a_template_has_no_end_date_is_still_accepted_by_the_schema_and_is_posted_with_no_valid_to_FINDING_SAD_TO_DEAD', async () => {
        const props = deptProps();
        const ref = React.createRef();
        const view = render(<ScheduleAssignDepartment {...props} ref={ref} />);
        await act(async () => {
            fireEvent.change(view.container.querySelector('select'), { target: { value: '4' } });
        });
        await act(async () => {
            view.rerender(<ScheduleAssignDepartment {...props} ref={ref} template_data={{
                work_days: ['mon', 'tue'],
                schedule_policies: {},
                schedule_details: { all: { start_time: '09:00:00', end_time: '18:00:00', break_time: '01:00:00' } },
                schedule_type: 'standard',
            }} />);
        });
        // the template branch left BOTH dates empty
        expect(ref.current.state.from_date).toBeNull();
        expect(ref.current.state.to_date).toBeNull();
        expect(mockFormik.values.to).toBeNull();
        expect(mockFormik.values.source_type).toBe('default');

        await act(async () => {
            typeInto(view.container.querySelector('[data-testid="datepicker"]'), '2026-09-01');
        });
        await flush();
        await act(async () => { fireEvent.click(btn(view.container, 'Update')); });
        await flush();
        await flush();

        // Formik only calls onSubmit after the schema resolves clean, so the post below IS the
        // proof that the missing end date was accepted. (The screen renders an ErrorMessage for
        // `from` only, so the absence of the text below says the start date passed - it is not
        // by itself evidence about `to`.)
        expect(view.container.textContent).not.toContain('This field is required');
        expect(props.scheduleAssign).toHaveBeenCalledTimes(1);
        const sent = props.scheduleAssign.mock.calls[0][0];
        expect(sent.action).toBe('update');
        expect(sent.valid_from).toBe('2026-09-01');
        expect(sent.valid_to).toBeUndefined();
    });

    /* FINDING SAD_UTC_DAY - `values.valid_from = values.from.toISOString().substring(0,10)` cuts
       the UTC calendar day, but the picker hands over a Date on the user's LOCAL wall clock. The
       two Dates below are built from local calendar parts, and the runner's own UTC offset is
       read at runtime, so the statement holds in whatever timezone this suite is run in:
         - east of UTC (Manila is UTC+8): a midnight pick is posted as the PREVIOUS day
         - west of UTC: a late-evening pick is posted as the NEXT day
       Only a runner sitting exactly on UTC sees no drift at all, and the assertions say so
       rather than quietly passing. getTimezoneOffset() is minutes BEHIND UTC, so it is
       negative east of Greenwich.
       This is the one submit in this block fed to the handler directly: the picker stub at the
       top of this file is deliberately UTC-based so the rendered value cannot drift with the
       runner, which means it cannot express a local-midnight Date. The cut under test is the
       handler's toISOString(), not the picker's. */
    test('the_start_date_is_posted_as_its_utc_calendar_day_not_the_local_day_the_user_picked_FINDING_SAD_UTC_DAY', async () => {
        const props = deptProps();
        const { ref } = await openDept(props);

        // what the picker hands over when the user clicks "11" - local midnight
        const midnight = new Date(2026, 7, 11, 0, 0, 0, 0);
        // and when they pick the same day on a machine set west of UTC, late in the evening
        const lateEvening = new Date(2026, 7, 11, 23, 0, 0, 0);
        expect(localDay(midnight)).toBe('2026-08-11');
        expect(localDay(lateEvening)).toBe('2026-08-11');

        await act(async () => {
            ref.current.onSubmitHandler({ ...mockFormik.values, from: midnight, to: null, action: 'update' });
        });
        await act(async () => {
            ref.current.onSubmitHandler({ ...mockFormik.values, from: lateEvening, to: null, action: 'update' });
        });

        const postedMidnight = props.scheduleAssign.mock.calls[0][0].valid_from;
        const postedEvening = props.scheduleAssign.mock.calls[1][0].valid_from;
        const offset = midnight.getTimezoneOffset();

        // the day the user picked survives ONLY when the local cut and the UTC cut agree
        expect(postedMidnight === '2026-08-11').toBe(offset >= 0);
        expect(postedEvening === '2026-08-11').toBe(offset <= 0);
        if (offset < 0) {
            // east of UTC, i.e. the whole PH user base: the day on screen is silently lost
            expect(postedMidnight).toBe('2026-08-10');
        } else if (offset > 0) {
            expect(postedEvening).toBe('2026-08-12');
        }
    });

    test('saving_a_customised_department_schedule_whose_stored_days_match_the_work_day_order_sends_one_entry_per_working_day_keyed_by_weekday', async () => {
        const props = deptProps();
        const { container } = await openDept(props, savedStandard({
            schedule_type: 'customize',
            work_days: ['mon', 'wed'],
            // the server serialised the days in work_days order, so the positional array lines up
            schedule_details: {
                mon: { start_time: '09:00:00', end_time: '18:00:00', start_flexy_time: '08:00:00', end_flexy_time: '10:00:00', break_time: '01:00:00' },
                wed: { start_time: '11:00:00', end_time: '20:00:00', start_flexy_time: '10:00:00', end_flexy_time: '12:00:00', break_time: '01:00:00' },
            },
        }));

        await act(async () => { fireEvent.click(btn(container, 'Assign to all employees')); });
        await flush();
        await flush();

        const sent = props.scheduleAssign.mock.calls[0][0];
        expect(Object.keys(sent.schedule_details)).toEqual(['mon', 'wed']);
        expect(sent.schedule_details.mon).toEqual({
            start_time: '09:00', end_time: '18:00',
            start_flexy_time: '08:00', end_flexy_time: '10:00', break_time: '01:00' });
        expect(sent.schedule_details.wed.start_time).toBe('11:00');
        expect(sent.schedule_details.wed.end_time).toBe('20:00');
    });

    /* FINDING SAD_CST_ORDER - the department screen carries the same positional-array defect as
       TE_CST_ORDER: setSchedule() fills cst_schedule_details with
       `for (var key in schedule.schedule_details)`, i.e. the order the server serialised the
       object in, and Formatter.format_schedule_details then re-keys that array by work_days
       order. As soon as the two orders disagree every weekday is saved with another weekday's
       hours, silently, on a plain re-save. The test above uses the matching order on purpose,
       so it does not mask this one. */
    test('a_customised_department_schedule_whose_stored_days_are_in_a_different_order_from_its_work_days_is_saved_against_the_wrong_weekday_FINDING_SAD_CST_ORDER', async () => {
        const props = deptProps();
        const { container, ref } = await openDept(props, savedStandard({
            schedule_type: 'customize',
            work_days: ['mon', 'wed'],
            // the server serialised wed FIRST, mon second
            schedule_details: {
                wed: { start_time: '11:00:00', end_time: '20:00:00', start_flexy_time: '10:00:00', end_flexy_time: '12:00:00', break_time: '01:00:00' },
                mon: { start_time: '09:00:00', end_time: '18:00:00', start_flexy_time: '08:00:00', end_flexy_time: '10:00:00', break_time: '01:00:00' },
            },
        }));

        // row 0 holds WEDNESDAY's hours even though work_days[0] is Monday
        expect(ref.current.state.work_day).toEqual(['mon', 'wed']);
        expect(hhmm(ref.current.state.cst_schedule_details[0].start_time)).toBe('11:00');
        expect(hhmm(ref.current.state.cst_schedule_details[1].start_time)).toBe('09:00');

        await act(async () => { fireEvent.click(btn(container, 'Update')); });
        await flush();
        await flush();

        const sent = props.scheduleAssign.mock.calls[0][0];
        expect(sent.schedule_details.mon.start_time).toBe('11:00'); // was Wednesday's
        expect(sent.schedule_details.mon.end_time).toBe('20:00');
        expect(sent.schedule_details.wed.start_time).toBe('09:00'); // was Monday's
        expect(sent.schedule_details.wed.end_time).toBe('18:00');
    });

    test('saving_a_flexible_department_schedule_flattens_the_five_times_into_a_single_all_entry', async () => {
        const props = deptProps();
        const { container } = await openDept(props, savedStandard({
            schedule_type: 'flexible',
            schedule_details: { all: {
                start_time: '22:00:00', end_time: '07:00:00',
                start_flexy_time: '21:30:00', end_flexy_time: '23:00:00',
                break_time: '01:00:00' } },
        }));

        await act(async () => { fireEvent.click(btn(container, 'Update')); });
        await flush();
        await flush();

        expect(props.scheduleAssign).toHaveBeenCalledTimes(1);
        expect(props.scheduleAssign.mock.calls[0][0].schedule_details).toEqual({
            all: { start_time: '22:00', end_time: '07:00',
                start_flexy_time: '21:30', end_flexy_time: '23:00', break_time: '01:00' } });
    });

    /* FINDING SAD_FMT_UNDEF - Formatter.format_schedule_details branches on standard / flexible /
       customize and has no else arm, and each branch declares its own `var schedule_details`,
       which hoists to one function-scoped binding that is simply never assigned for any other
       type. The schema only asks schedule_type to be a string of 3..255 characters, so a saved
       schedule of some other type (a legacy row, a type added server-side first) validates and
       is posted with schedule_details: undefined - the server is handed a schedule with no
       times at all instead of the save being refused. */
    test('saving_a_schedule_whose_type_is_none_of_the_three_known_ones_posts_it_with_undefined_schedule_details_FINDING_SAD_FMT_UNDEF', async () => {
        const props = deptProps();
        const { container } = await openDept(props, savedStandard({ schedule_type: 'rotating' }));

        await act(async () => { fireEvent.click(btn(container, 'Update')); });
        await flush();
        await flush();

        expect(props.scheduleAssign).toHaveBeenCalledTimes(1);
        const sent = props.scheduleAssign.mock.calls[0][0];
        expect(sent.schedule_type).toBe('rotating');
        expect('schedule_details' in sent).toBe(true);
        expect(sent.schedule_details).toBeUndefined();
    });
});

/* ========================================================================== */
/*  SCHEDULE -> TEMPLATES -> EDIT  (TemplateEdit.js)                          */
/* ========================================================================== */

const loadedTemplate = (over = {}) => ({
    isScheduleLoaded: true,
    name: 'Night Shift',
    schedule_type: 'standard',
    work_days: ['mon', 'tue'],
    schedule_policies: {
        allow_late: '1', allow_undertime: '0', allow_night_diff: '1',
        allow_special_holiday: '0', allow_legal_holiday: '1',
    },
    schedule_details: { all: { start_time: '22:00:00', end_time: '07:00:00', break_time: '01:00:00' } },
    ...over,
});

const editProps = (over = {}) => ({
    params: { templateid: '31' },
    template: { isScheduleLoaded: false },
    updateSchedule: jest.fn(),
    getTemplateSchedule: jest.fn(),
    ...over,
});

describe('Schedule Template - Edit: PHASE 1 opening the screen', () => {

    afterEach(() => jest.clearAllMocks());

    test('opening_the_edit_screen_fetches_that_one_template_and_shows_the_loading_placeholder_until_it_arrives', () => {
        const props = editProps();
        const { queryByTestId, container } = render(<TemplateEdit {...props} />);

        expect(props.getTemplateSchedule).toHaveBeenCalledTimes(1);
        expect(props.getTemplateSchedule).toHaveBeenCalledWith('31', 'Template');

        expect(queryByTestId('page-loading')).toBeInTheDocument();
        expect(container.querySelector('form')).toBeNull();
        expect(queryByTestId('work-days')).toBeNull();
        expect(props.updateSchedule).not.toHaveBeenCalled();
    });

    test('once_the_template_arrives_the_loading_placeholder_is_replaced_by_the_form_prefilled_with_its_name', async () => {
        const props = editProps();
        const { rerender, queryByTestId, container } = render(<TemplateEdit {...props} />);

        await act(async () => {
            rerender(<TemplateEdit {...props} template={loadedTemplate()} />);
        });

        expect(queryByTestId('page-loading')).toBeNull();
        expect(container.querySelector('form')).not.toBeNull();
        expect(container.querySelector('input[name="name"]').value).toBe('Night Shift');
        expect(queryByTestId('holiday-policy')).toBeInTheDocument();
        expect(queryByTestId('schedule-policy')).toBeInTheDocument();
        expect(queryByTestId('work-days')).toBeInTheDocument();
        // opening the editor is read-only - nothing is written back
        expect(props.updateSchedule).not.toHaveBeenCalled();
    });
});

describe('Schedule Template - Edit: PHASE 2 what the loaded template puts in the form', () => {

    afterEach(() => jest.clearAllMocks());

    test('a_standard_template_prefills_the_three_standard_times_and_mounts_only_the_standard_form', async () => {
        const props = editProps({ template: loadedTemplate() });
        const { queryByTestId, container } = render(<TemplateEdit {...props} />);
        await flush();

        expect(container.textContent).toContain('Standard Form');
        expect(queryByTestId('std-form')).toBeInTheDocument();
        expect(queryByTestId('flex-form')).toBeNull();
        expect(queryByTestId('sched-details')).toBeNull();

        expect(mockFormik.values.schedule_type).toBe('standard');
        expect(mockFormik.values.source_type).toBe('template');
        expect(mockFormik.values.work_days).toEqual(['mon', 'tue']);
        expect(mockFormik.values.flx_schedule_details).toEqual([]);
        expect(mockFormik.values.cst_schedule_details).toEqual([]);
        expect(hhmm(mockFormik.values.std_schedule_details[0].start_time)).toBe('22:00');
        expect(hhmm(mockFormik.values.std_schedule_details[0].end_time)).toBe('07:00');
        expect(hhmm(mockFormik.values.std_schedule_details[0].break_time)).toBe('01:00');
    });

    /* Split in two on purpose. mockFormik.values is a single module-global written by whichever
       WorkDays probe rendered last, so mounting both arms inside one test made the second
       assertion depend on the two instances not re-rendering. One mount per test, and the
       global is cleared in beforeEach, so each assertion can only see its own render. */
    test('the_stored_policies_of_a_template_are_parsed_to_integers', async () => {
        const props = editProps({ template: loadedTemplate() });
        render(<TemplateEdit {...props} />);
        await flush();

        expect(mockFormik.values.schedule_policies).toEqual({
            allow_late: 1, allow_undertime: 0, allow_night_diff: 1,
            allow_special_holiday: 0, allow_legal_holiday: 1,
        });
    });

    test('a_template_saved_with_no_policies_at_all_falls_back_to_the_defaults', async () => {
        const props = editProps({ template: loadedTemplate({ schedule_policies: null }) });
        render(<TemplateEdit {...props} />);
        await flush();

        // empty arm: the two holiday allowances default ON, everything else OFF
        expect(mockFormik.values.schedule_policies).toEqual({
            allow_late: 0, allow_undertime: 0, allow_night_diff: 0,
            allow_special_holiday: 1, allow_legal_holiday: 1,
        });
    });

    test('a_flexible_template_prefills_the_five_flexible_times_and_mounts_only_the_flexible_form', async () => {
        const props = editProps({ template: loadedTemplate({
            schedule_type: 'flexible',
            schedule_details: { all: {
                start_time: '09:00:00', end_time: '18:00:00',
                start_flexy_time: '08:00:00', end_flexy_time: '10:00:00',
                break_time: '01:00:00' } },
        }) });
        const { queryByTestId, container } = render(<TemplateEdit {...props} />);
        await flush();

        expect(container.textContent).toContain('Flexible Form');
        expect(queryByTestId('flex-form')).toBeInTheDocument();
        expect(queryByTestId('std-form')).toBeNull();
        expect(mockFormik.values.std_schedule_details).toEqual([]);
        expect(hhmm(mockFormik.values.flx_schedule_details[0].start_flexy_time)).toBe('08:00');
        expect(hhmm(mockFormik.values.flx_schedule_details[0].end_flexy_time)).toBe('10:00');
    });

    test('a_customised_template_lays_out_one_day_block_per_working_day_carrying_its_weekday_and_index', async () => {
        const props = editProps({ template: loadedTemplate({
            schedule_type: 'customize',
            work_days: ['mon', 'wed', 'fri'],
            schedule_details: {
                mon: { start_time: '09:00:00', end_time: '18:00:00', start_flexy_time: '08:00:00', end_flexy_time: '10:00:00', break_time: '01:00:00' },
                wed: { start_time: '10:00:00', end_time: '19:00:00', start_flexy_time: '09:00:00', end_flexy_time: '11:00:00', break_time: '01:00:00' },
                fri: { start_time: '11:00:00', end_time: '20:00:00', start_flexy_time: '10:00:00', end_flexy_time: '12:00:00', break_time: '01:00:00' },
            },
        }) });
        const { queryAllByTestId, container } = render(<TemplateEdit {...props} />);
        await flush();

        expect(container.textContent).toContain('Customize Schedule');
        const blocks = queryAllByTestId('sched-details');
        expect(blocks.map((b) => b.getAttribute('data-day'))).toEqual(['mon', 'wed', 'fri']);
        expect(blocks.map((b) => b.getAttribute('data-index'))).toEqual(['0', '1', '2']);
        expect(mockFormik.values.cst_schedule_details.length).toBe(3);
        expect(hhmm(mockFormik.values.cst_schedule_details[2].start_time)).toBe('11:00');
    });

    test('a_saturday_only_template_lays_out_a_single_day_block_and_leaves_every_other_weekday_out', async () => {
        const props = editProps({ template: loadedTemplate({
            schedule_type: 'customize',
            work_days: ['sat'],
            schedule_details: {
                sat: { start_time: '08:00:00', end_time: '12:00:00', start_flexy_time: '07:00:00', end_flexy_time: '09:00:00', break_time: '00:30:00' },
            },
        }) });
        const { queryAllByTestId } = render(<TemplateEdit {...props} />);
        await flush();

        const blocks = queryAllByTestId('sched-details');
        expect(blocks.length).toBe(1);
        expect(blocks[0].getAttribute('data-day')).toBe('sat');
        expect(blocks[0].getAttribute('data-index')).toBe('0');
    });

    /* FINDING TE_NO_REINIT - the Formik on this screen has no `enableReinitialize`, unlike the one
       on the department screen. Its initialValues are captured on the first render that passes
       the isScheduleLoaded gate, so a second template landing in the store afterwards (the user
       navigates from template 31 to template 32 without the component unmounting) leaves the
       editor showing - and about to save - the first template's data. */
    test('a_second_template_arriving_after_the_form_has_mounted_never_reaches_it_FINDING_TE_NO_REINIT', async () => {
        const props = editProps();
        const { rerender, container } = render(<TemplateEdit {...props} />);

        await act(async () => {
            rerender(<TemplateEdit {...props} template={loadedTemplate()} />);
        });
        expect(container.querySelector('input[name="name"]').value).toBe('Night Shift');

        await act(async () => {
            rerender(<TemplateEdit {...props} template={loadedTemplate({
                name: 'Morning Shift',
                schedule_type: 'flexible',
                schedule_details: { all: {
                    start_time: '09:00:00', end_time: '18:00:00',
                    start_flexy_time: '08:00:00', end_flexy_time: '10:00:00',
                    break_time: '01:00:00' } },
            })} />);
        });

        // the store now holds Morning Shift, the form still holds Night Shift
        expect(container.querySelector('input[name="name"]').value).toBe('Night Shift');
        expect(mockFormik.values.name).toBe('Night Shift');
        expect(mockFormik.values.schedule_type).toBe('standard');
        expect(container.textContent).toContain('Standard Form');
        expect(container.textContent).not.toContain('Flexible Form');
    });
});

describe('Schedule Template - Edit: PHASE 3 editing the template', () => {

    afterEach(() => jest.clearAllMocks());

    test('renaming_the_template_updates_the_field_without_touching_the_server', async () => {
        const props = editProps({ template: loadedTemplate() });
        const { container } = render(<TemplateEdit {...props} />);
        await flush();

        await act(async () => {
            typeInto(container.querySelector('input[name="name"]'), 'Graveyard Shift');
        });
        await flush();

        expect(container.querySelector('input[name="name"]').value).toBe('Graveyard Shift');
        expect(mockFormik.values.name).toBe('Graveyard Shift');
        expect(props.updateSchedule).not.toHaveBeenCalled();
    });

    test('switching_the_template_from_standard_to_customize_clears_the_standard_rows_and_pushes_one_row_per_working_day', async () => {
        const props = editProps({ template: loadedTemplate() });
        const { container, queryByTestId, queryAllByTestId } = render(<TemplateEdit {...props} />);
        await flush();

        await act(async () => { fireEvent.click(radio(container, 'Customize')); });
        await flush();

        expect(queryByTestId('std-form')).toBeNull();
        expect(container.textContent).toContain('Customize Schedule');
        // work_days is mon + tue, so two blank rows are pushed
        expect(mockFormik.values.cst_schedule_details).toEqual([
            { break_time: '', start_time: '', end_time: '', start_flexy_time: '', end_flexy_time: '' },
            { break_time: '', start_time: '', end_time: '', start_flexy_time: '', end_flexy_time: '' },
        ]);
        expect(queryAllByTestId('sched-details').length).toBe(2);

        await act(async () => { fireEvent.click(radio(container, 'Flexible')); });
        await flush();
        expect(queryByTestId('flex-form')).toBeInTheDocument();
        expect(mockFormik.values.schedule_type).toBe('flexible');
        expect(props.updateSchedule).not.toHaveBeenCalled();
    });
});

describe('Schedule Template - Edit: PHASE 4 saving the template', () => {

    let confirmSpy;
    beforeEach(() => { confirmSpy = jest.spyOn(window, 'confirm').mockImplementation(() => true); });
    afterEach(() => { confirmSpy.mockRestore(); jest.clearAllMocks(); });

    test('clearing_the_name_blocks_the_save_shows_the_required_message_and_posts_nothing', async () => {
        const props = editProps({ template: loadedTemplate() });
        const { container } = render(<TemplateEdit {...props} />);
        await flush();

        await act(async () => { typeInto(container.querySelector('input[name="name"]'), ''); });
        await flush();
        await act(async () => { fireEvent.submit(container.querySelector('form')); });
        await flush();

        expect(container.textContent).toContain('This field is required');
        expect(props.updateSchedule).not.toHaveBeenCalled();
    });

    test('pressing_update_on_a_standard_template_posts_the_flattened_times_the_policies_and_the_template_id_from_the_route', async () => {
        const props = editProps({ template: loadedTemplate() });
        const { container } = render(<TemplateEdit {...props} />);
        await flush();

        await act(async () => { fireEvent.click(btn(container, 'Update')); });
        await flush();
        await flush();

        expect(props.updateSchedule).toHaveBeenCalledTimes(1);
        const [sent, id] = props.updateSchedule.mock.calls[0];
        expect(id).toBe('31');
        expect(sent.name).toBe('Night Shift');
        expect(sent.source_type).toBe('template');
        expect(sent.schedule_type).toBe('standard');
        expect(sent.work_days).toEqual(['mon', 'tue']);
        expect(sent.schedule_details).toEqual({
            all: { start_time: '22:00', end_time: '07:00', break_time: '01:00' } });
        expect(sent.schedule_policies).toEqual({
            allow_late: 1, allow_undertime: 0, allow_night_diff: 1,
            allow_special_holiday: 0, allow_legal_holiday: 1 });
    });

    test('saving_a_flexible_template_posts_all_five_flexible_times_under_a_single_all_entry', async () => {
        const props = editProps({ template: loadedTemplate({
            schedule_type: 'flexible',
            schedule_details: { all: {
                start_time: '09:00:00', end_time: '18:00:00',
                start_flexy_time: '08:30:00', end_flexy_time: '10:15:00',
                break_time: '01:00:00' } },
        }) });
        const { container } = render(<TemplateEdit {...props} />);
        await flush();

        await act(async () => { fireEvent.click(btn(container, 'Update')); });
        await flush();
        await flush();

        expect(props.updateSchedule).toHaveBeenCalledTimes(1);
        expect(props.updateSchedule.mock.calls[0][0].schedule_details).toEqual({
            all: { start_time: '09:00', end_time: '18:00',
                start_flexy_time: '08:30', end_flexy_time: '10:15', break_time: '01:00' } });
    });

    test('saving_a_customised_template_whose_stored_days_match_the_work_day_order_round_trips_every_weekday_unchanged', async () => {
        const props = editProps({ template: loadedTemplate({
            schedule_type: 'customize',
            work_days: ['mon', 'wed'],
            schedule_details: {
                mon: { start_time: '09:00:00', end_time: '18:00:00', start_flexy_time: '08:00:00', end_flexy_time: '10:00:00', break_time: '01:00:00' },
                wed: { start_time: '11:00:00', end_time: '20:00:00', start_flexy_time: '10:00:00', end_flexy_time: '12:00:00', break_time: '01:00:00' },
            },
        }) });
        const { container } = render(<TemplateEdit {...props} />);
        await flush();

        await act(async () => { fireEvent.click(btn(container, 'Update')); });
        await flush();
        await flush();

        const sent = props.updateSchedule.mock.calls[0][0];
        expect(Object.keys(sent.schedule_details)).toEqual(['mon', 'wed']);
        expect(sent.schedule_details.mon.start_time).toBe('09:00');
        expect(sent.schedule_details.wed.start_time).toBe('11:00');
    });

    /* FINDING TE_CST_ORDER - the loader walks the stored schedule with `for (var key in
       this.props.template.schedule_details)`, i.e. the order the server serialised the object in,
       and stores the rows in a positional array. Formatter.format_schedule_details then re-keys
       that array by `work_days` order. When the two orders disagree - which they do as soon as
       the API returns the days in anything other than the work_days order - every weekday is
       saved with another weekday's hours, silently, on a plain re-save. */
    test('a_customised_template_whose_stored_days_are_in_a_different_order_from_its_work_days_saves_every_time_against_the_wrong_weekday_FINDING_TE_CST_ORDER', async () => {
        const props = editProps({ template: loadedTemplate({
            schedule_type: 'customize',
            work_days: ['mon', 'wed'],
            // the server serialised wed FIRST, mon second
            schedule_details: {
                wed: { start_time: '11:00:00', end_time: '20:00:00', start_flexy_time: '10:00:00', end_flexy_time: '12:00:00', break_time: '01:00:00' },
                mon: { start_time: '09:00:00', end_time: '18:00:00', start_flexy_time: '08:00:00', end_flexy_time: '10:00:00', break_time: '01:00:00' },
            },
        }) });
        const { container } = render(<TemplateEdit {...props} />);
        await flush();

        // row 0 holds WEDNESDAY's hours even though work_days[0] is Monday
        expect(mockFormik.values.work_days).toEqual(['mon', 'wed']);
        expect(hhmm(mockFormik.values.cst_schedule_details[0].start_time)).toBe('11:00');
        expect(hhmm(mockFormik.values.cst_schedule_details[1].start_time)).toBe('09:00');

        await act(async () => { fireEvent.click(btn(container, 'Update')); });
        await flush();
        await flush();

        expect(props.updateSchedule).toHaveBeenCalledTimes(1);
        const sent = props.updateSchedule.mock.calls[0][0];
        expect(sent.schedule_details.mon.start_time).toBe('11:00'); // was Wednesday's
        expect(sent.schedule_details.mon.end_time).toBe('20:00');
        expect(sent.schedule_details.wed.start_time).toBe('09:00'); // was Monday's
        expect(sent.schedule_details.wed.end_time).toBe('18:00');
    });

    /* FINDING TE_NO_CONFIRM - the department screen guards every write with window.confirm and
       spells out that DTR records will be rewritten. Editing a template, which every schedule
       later cloned from it inherits, posts straight through with no confirmation at all. */
    test('pressing_update_on_a_template_posts_immediately_without_asking_the_user_to_confirm_FINDING_TE_NO_CONFIRM', async () => {
        const props = editProps({ template: loadedTemplate() });
        const { container } = render(<TemplateEdit {...props} />);
        await flush();

        await act(async () => { fireEvent.click(btn(container, 'Update')); });
        await flush();
        await flush();

        expect(confirmSpy).not.toHaveBeenCalled();
        expect(props.updateSchedule).toHaveBeenCalledTimes(1);
    });

    /* The whole edit -> save round trip on one form: the field is retyped, the form is submitted
       by its own button, and it is the EDITED name that reaches the API. */
    test('renaming_a_template_and_then_pressing_update_posts_the_new_name_once', async () => {
        const props = editProps({ template: loadedTemplate() });
        const { container } = render(<TemplateEdit {...props} />);
        await flush();

        await act(async () => {
            typeInto(container.querySelector('input[name="name"]'), 'Graveyard Shift');
        });
        await flush();
        await act(async () => { fireEvent.click(btn(container, 'Update')); });
        await flush();
        await flush();

        expect(props.updateSchedule).toHaveBeenCalledTimes(1);
        const [sent, id] = props.updateSchedule.mock.calls[0];
        expect(id).toBe('31');
        expect(sent.name).toBe('Graveyard Shift');
        expect(sent.schedule_details).toEqual({
            all: { start_time: '22:00', end_time: '07:00', break_time: '01:00' } });
    });
});
