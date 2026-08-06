/**
 * ScheduleInfoAndOpsFormLifecycle.test.js
 *
 * SOURCE FILES UNDER TEST
 *   container/Schedule/ScheduleInfo/ScheduleInfo.js
 *       Menu: Employee -> Schedule -> Schedule Details   (read-only detail view of one
 *       assigned schedule; route /schedule/info/:user_id/:schedule_id)
 *   container/OpsSchedule/OpsScheduleForm/OpsScheduleForm.js
 *       Menu: Admin -> Operations Schedule -> Add / Edit
 *
 * COVERAGE BASELINE - MEASURED, not estimated.
 *   29-Jul run, read from
 *   Latest-Test-30-07-2026/Coverage_Report_29072026/Coverage_Report/Frontend/lcov.info:
 *       ScheduleInfo.js      LH 0  / LF 90   (entirely uncovered)
 *       OpsScheduleForm.js   LH 20 / LF 56   (35.7% covered - NOT uncovered)
 *   126 uncovered lines combined, not 103, and only one of the two files was at zero.
 *   This suite alone, measured 2026-08-05 with
 *   `react-scripts test --coverage --collectCoverageFrom` limited to these two files:
 *       ScheduleInfo.js      87.78% stmts / 85% branch
 *       OpsScheduleForm.js   87.50% stmts / 96% branch
 *   Nothing here modifies an existing test or app source.
 *
 * REACHABILITY WARNING - 7 of the tests below drive code that NO user can reach today.
 *   Six enter the ops "Fill Form" branch only via ref.current.handleSelectActionType (the
 *   radio pair that would call it is commented out - FINDING OPS-TYPEDEAD-6); one calls
 *   ref.current.loadTemplateSched directly (FINDING SI-TPLDEAD-5). Every one of them is
 *   named with a _DEADCODE_ or _FINDING_ marker so the headline test count is not read as
 *   7 more user journeys than it really is. They are kept deliberately: they pin the
 *   contract of that code for whoever re-enables the radios.
 *
 * WHAT IS COVERED
 *   ScheduleInfo   mount dispatches, the isInitialDataLoaded render gate, setSchedule's
 *                  standard / flexible / customize arms, the policy-parsing defaults, the
 *                  point-of-view (POV) timezone arms, every schedule_type render branch,
 *                  the Toggle Outlook state flip, and submit (valid + rejected).
 *   OpsScheduleForm  store vs update gate, department dropdown from server constants,
 *                  the image branch vs the form branch, file selection, and submit through
 *                  the real RequestButtons (add / update / cancel, valid + rejected).
 *
 * FINDINGS CHARACTERISED HERE (these tests assert TODAY's behaviour, they do not endorse it)
 *   SI-TODATE-1   ScheduleInfo.setSchedule ignores the schedule's stored valid_to and always
 *                 sets "Date To" to now + 9 hours, so a temporary schedule's real end date is
 *                 never shown and a submit stamps valid_to with that synthetic date.
 *   SI-POVNUM-2   When the viewed employee has no stored pov_schedule_details, the fallback
 *                 uses Date.prototype.setSeconds, whose RETURN value is a millisecond number,
 *                 not a Date. pov_schedule_details is therefore populated with raw numbers.
 *   SI-SRCDUP-3   The Formik initialValues object declares `source_type` twice (a literal
 *                 'default' then this.state.source_type). The second key wins, so the literal
 *                 default is dead and a schedule with no stored source type leaves all three
 *                 Source Type radios unchecked.
 *   SI-OFFSET-4   componentWillReceiveProps computes owner_offset from this.props (the OLD
 *                 props) instead of nextProps, so the offset persisted into state is one
 *                 render stale relative to the offset the render pass actually uses.
 *   SI-TPLDEAD-5  loadTemplateSched() is never wired to any control on this read-only screen;
 *                 it is reachable only programmatically.
 *   OPS-TYPEDEAD-6 OpsScheduleForm opens with state.type = 'image' and the radio pair that
 *                 would call handleSelectActionType is commented out, so the entire "Fill
 *                 Form" branch (name / position / email / work days / times / timezone) and
 *                 its validation rules are unreachable from the UI.
 *   OPS-THUMB-7   The already-saved thumbnail branch (OpsScheduleForm.js:313) is PERMANENTLY
 *                 DEAD, not merely hard to reach. The gate ANDs three clauses; two of them
 *                 can never hold at the same time:
 *                   (a) state.inputFileWasDeleted == false - undefined until a file is picked;
 *                   (b) state.imgPrevInputFile == '/thumbnail/defthumb.jpg' - imgPrevInputFile
 *                       is ONLY ever assigned URL.createObjectURL(...) at line 305, which
 *                       returns a blob: URL, so it can never equal that path literal.
 *                 Clause (a) only becomes false-y-satisfying by picking a file, and picking a
 *                 file is exactly what makes clause (b) a blob: URL. Editing a record that has
 *                 a saved image therefore shows "UPLOAD AN IMAGE" before a file is picked and
 *                 the NEW blob preview after - the stored image never renders on any path.
 *   OPS-IMGUNDEF-8 Submitting the image branch without choosing a file posts the literal
 *                 string "undefined" as the `image` field rather than omitting it.
 *   SI-NULLTYPE-9 ScheduleInfo's schedule_type rule is not .nullable(), so a schedule stored
 *                 with a null type fails Yup's TYPE CAST before .required() runs. The authored
 *                 message "Please Select Schedule Type" is unreachable for the null case and
 *                 the reviewer sees Yup's internal "must be a `string` type" text instead.
 *   OPS-NOFEED-10 OpsScheduleForm's validationSchema makes start_time and end_time required
 *                 on the form branch, but neither field has an <ErrorMessage> next to it
 *                 (OpsScheduleForm.js:266-278 render only the label and the InputTime). Every
 *                 other required field on that branch has one. Submitting with both times
 *                 empty is therefore silently refused: exactly 4 "This field is required"
 *                 messages appear (name, position, email, timezone) for 6 failing rules, and
 *                 the user is given no clue which two remaining fields blocked the save.
 *
 * ADDITIVE ONLY - no existing test file and no application source was touched.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import moment from 'moment';

/* ------------------------------------------------------------------ plumbing */

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
}));

jest.mock('../../services/API', () => ({ __esModule: true, default: { call: jest.fn() } }));

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

/* RequestSubtitle is stubbed so the store/approval decision the screen makes is observable. */
jest.mock('../../components/RequestComponent/RequestButtons/RequestSubtitle', () => {
    const R = require('react');
    return ({ method, user }) => R.createElement('div', {
        'data-testid': 'request-subtitle',
        'data-method': String(method),
        'data-user': user === undefined ? 'undefined' : JSON.stringify(user),
    });
});

/* react-datepicker is only used read-only on ScheduleInfo, but it must not paint a calendar. */
jest.mock('react-datepicker', () => {
    const R = require('react');
    const m = require('moment');
    return ({ selected, onChange, disabled }) => R.createElement('input', {
        'data-testid': 'datepicker',
        readOnly: true,
        disabled: !!disabled,
        value: selected ? m(selected).format('YYYY-MM-DD') : '',
        onChange: () => onChange && onChange(null),
    });
});

jest.mock('react-bootstrap', () => {
    const R = require('react');
    const box = (Tag) => ({ children }) => R.createElement(Tag, null, children);

    const FormControl = ({ as, name, value, onChange, placeholder, type, disabled, className, children }) =>
        as === 'select'
            ? R.createElement('select', { name, value, onChange, disabled, className }, children)
            : R.createElement('input', {
                name, onChange, placeholder, disabled, className,
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

/* The heavy schedule sub-forms become inert probes that publish the props the parent chose. */
jest.mock('../../components/Schedule/ScheduleDetails.js', () => {
    const R = require('react');
    const probe = (id) => (props) => R.createElement('div', {
        'data-testid': id,
        'data-day': props.day === undefined ? '' : props.day,
        'data-index': props.index === undefined ? '' : String(props.index),
        'data-offset': String(props.offset_data),
        'data-contrast': String(props.open_contrast),
        'data-pov-tz': String(props.pov_timezone_info),
        'data-disabled': String(props.isDisabled),
    });
    return {
        Scheduledetails:                      probe('sched-details'),
        ScheduledetailsWithTimezone:          probe('sched-details-tz'),
        onSelectTimeHandlerStd:               jest.fn(),
        onSelectTimeHandlerFlexi:             jest.fn(),
        FlexibleSchedDetailsFormWithTimezone: probe('flex-form-tz'),
        StandardSchedDetailsFormWithTimezone: probe('std-form-tz'),
        StandardSchedDetailsForm:             probe('std-form'),
        FlexibleSchedDetailsForm:             probe('flex-form'),
        SchedulePolicy:                       probe('schedule-policy'),
        ScheduleHolidayPolicy:                probe('holiday-policy'),
        WorkDays:                             probe('work-days'),
    };
});

/* The ops form's time pickers keep the real contract (setFieldValue(name, Date)). */
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => {
    const R = require('react');
    const { useFormikContext } = require('formik');
    const m = require('moment');
    const TimeBox = ({ name, value }) => {
        const { setFieldValue } = useFormikContext();
        return R.createElement('input', {
            'data-testid': 'time-' + name,
            value: value ? m(value).format('HH:mm') : '',
            onChange: (e) => setFieldValue(
                name, e.target.value ? new Date('2020-01-01 ' + e.target.value + ':00') : null),
        });
    };
    return { InputTime: TimeBox, InputDate: TimeBox, InputDateTime: TimeBox, InputDateTimeIndex: TimeBox };
});

jest.mock('../../store/actions/scheduleActions', () => ({
    scheduleAssign:      jest.fn(),
    getScheduleInfo:     jest.fn(),
    listTemplate:        jest.fn(),
    getTemplateSchedule: jest.fn(),
}));
jest.mock('../../store/actions/userActions', () => ({ getUserInfo: jest.fn() }));
jest.mock('../../store/actions/redirectActions', () => ({ setRedirect: jest.fn() }));
jest.mock('../../store/actions/opsschedule/opsScheduleActions', () => ({
    fetchOpsSchedule:         jest.fn(),
    addOpsSchedule:           jest.fn(),
    updateOpsSchedule:        jest.fn(),
    clearOpsScheduleInstance: jest.fn(),
}));

global.links = new Proxy({}, { get: () => '/x/' });
global.URL.createObjectURL = jest.fn(() => 'blob:preview-url');

const ScheduleInfo =
    require('../../container/Schedule/ScheduleInfo/ScheduleInfo').default;
const OpsScheduleForm =
    require('../../container/OpsSchedule/OpsScheduleForm/OpsScheduleForm').default;

/* ------------------------------------------------------------------- helpers */

/** settle Formik's promise-based validate/submit pipeline (pure microtasks, no timers) */
const flush = async (times = 4) => {
    for (let i = 0; i < times; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await act(async () => { await Promise.resolve(); });
    }
};

const formOf = (container) => container.querySelector('form');

/** the radio inside the label whose visible text is exactly `text` (nth match, 0-based) */
const radio = (container, text, nth = 0) => {
    const hits = Array.from(container.querySelectorAll('label'))
        .filter((l) => l.textContent.replace(/\s|&nbsp;/g, '').trim() === text)
        .map((l) => l.querySelector('input[type="radio"]'))
        .filter(Boolean);
    return hits[nth];
};

/** the <button> whose visible text contains `label` */
const btn = (container, label) =>
    Array.from(container.querySelectorAll('button'))
        .find((b) => b.textContent.indexOf(label) !== -1);

/** turn the FormData handed to an action creator into a plain object */
const fdToObject = (formData) => {
    const out = {};
    const it = formData.entries();
    let step = it.next();
    while (!step.done) {
        out[step.value[0]] = step.value[1];
        step = it.next();
    }
    return out;
};

const lastCall = (mockFn) => mockFn.mock.calls[mockFn.mock.calls.length - 1];

/* ========================================================================== */
/*  SCHEDULE INFO                                                             */
/* ========================================================================== */

const NO_TEMPLATES = [];
const ONE_TEMPLATE = [{ id: 9, name: 'Night Shift' }];

const infoProps = (over = {}) => ({
    params: { user_id: 42, schedule_id: 7 },
    user: { id: 42, user_offset_seconds: 0, pov_timezone: 'Asia/Manila' },
    user_info: { user_offset_seconds: 0, pov_timezone: 'Asia/Singapore' },
    page_reloaded: false,
    template_list: NO_TEMPLATES,
    default_schedule: null,
    getUserInfo: jest.fn(),
    getScheduleInfo: jest.fn(),
    scheduleAssign: jest.fn(),
    listTemplate: jest.fn(),
    getTemplateSchedule: jest.fn(),
    ...over,
});

/**
 * The stored end date used by every ScheduleInfo fixture.
 *
 * It is deliberately a date in the PAST. FINDING SI-TODATE-1 is proven by showing that the
 * screen's "Date To" is NOT this value, and `to_date` is always `new Date()` + 9 hours - i.e.
 * always in the future. A past constant makes that inequality true on every possible run date.
 * An earlier revision used '2026-08-31' here, which would have made the SI-TODATE-1 assertions
 * fail for real on 2026-08-30 after ~15:00 local and all day 2026-08-31, when now + 9h formats
 * to exactly that string. Do not replace this with a near-future date.
 */
const STORED_VALID_TO = '2020-01-15';

const standardSchedule = (over = {}) => ({
    creation_type: 'customize',
    source_type: 'default',
    valid_from: '2026-08-01 00:00:00',
    valid_to: STORED_VALID_TO,
    work_days: ['mon', 'tue'],
    schedule_policies: {
        allow_late: '5', allow_undertime: '10', allow_night_diff: '1',
        allow_special_holiday: '1', allow_legal_holiday: '1',
    },
    schedule_type: 'standard',
    schedule_details: { all: { start_time: '09:00:00', end_time: '18:00:00', break_time: '01:00:00' } },
    pov_schedule_details: null,
    ...over,
});

const flexibleSchedule = (over = {}) => ({
    creation_type: 'template',
    source_type: 'default',
    valid_from: '2026-08-01 00:00:00',
    work_days: ['mon'],
    schedule_policies: {},
    schedule_type: 'flexible',
    schedule_details: {
        all: {
            start_time: '09:00:00', end_time: '18:00:00',
            start_flexy_time: '07:00:00', end_flexy_time: '11:00:00',
            break_time: '01:00:00',
        },
    },
    pov_schedule_details: null,
    ...over,
});

const dayBlock = (start) => ({
    start_time: start, end_time: '17:00:00',
    start_flexy_time: '07:00:00', end_flexy_time: '10:00:00',
    break_time: '01:00:00',
});

const customizeSchedule = (over = {}) => ({
    creation_type: 'customize',
    source_type: 'default',
    valid_from: '2026-08-01 00:00:00',
    work_days: ['fri', 'mon'],
    schedule_policies: {},
    schedule_type: 'customize',
    schedule_details: { fri: dayBlock('08:00:00'), mon: dayBlock('09:00:00') },
    ...over,
});

/** mount, then push the screen past its loading gate with `schedule` */
const openInfo = async (props, schedule, extra = {}) => {
    const ref = React.createRef();
    const view = render(<ScheduleInfo {...props} ref={ref} />);
    await act(async () => {
        view.rerender(<ScheduleInfo {...props} ref={ref} {...extra}
            default_schedule={schedule} page_reloaded />);
    });
    await flush();
    return { ...view, ref };
};

describe('Schedule Details - PHASE 1: opening the screen and the load gate', () => {

    afterEach(() => jest.clearAllMocks());

    test('opening_a_schedule_asks_the_server_for_the_viewed_employees_profile_and_for_that_one_schedule_bound_to_the_user', () => {
        const props = infoProps();
        render(<ScheduleInfo {...props} />);

        expect(props.getUserInfo).toHaveBeenCalledTimes(1);
        expect(props.getUserInfo).toHaveBeenCalledWith(42);

        // the binding is hard-coded to 'user' in initialState, and the route's schedule id is passed through
        expect(props.getScheduleInfo).toHaveBeenCalledTimes(1);
        expect(props.getScheduleInfo).toHaveBeenCalledWith('user', 42, 7);
    });

    test('before_any_schedule_has_been_set_the_screen_shows_only_the_loading_placeholder_and_no_detail_form', () => {
        const props = infoProps();
        const { queryByTestId, container } = render(<ScheduleInfo {...props} />);

        expect(queryByTestId('page-loading')).toBeInTheDocument();
        expect(formOf(container)).toBeNull();
        expect(container.textContent).not.toContain('Schedule Details');
    });

    test('a_schedule_that_arrives_while_the_page_reloaded_flag_is_still_false_is_ignored_and_the_screen_keeps_loading', async () => {
        const props = infoProps();
        const ref = React.createRef();
        const view = render(<ScheduleInfo {...props} ref={ref} />);

        await act(async () => {
            view.rerender(<ScheduleInfo {...props} ref={ref}
                default_schedule={standardSchedule()} page_reloaded={false} />);
        });
        await flush();

        expect(ref.current.state.isInitialDataLoaded).toBe(false);
        expect(view.queryByTestId('page-loading')).toBeInTheDocument();
        expect(formOf(view.container)).toBeNull();
    });

    test('the_same_schedule_arriving_with_the_page_reloaded_flag_true_opens_the_read_only_detail_form', async () => {
        const props = infoProps();
        const { ref, container, queryByTestId } = await openInfo(props, standardSchedule());

        expect(ref.current.state.isInitialDataLoaded).toBe(true);
        expect(queryByTestId('page-loading')).toBeNull();
        expect(formOf(container)).not.toBeNull();
        expect(container.textContent).toContain('Schedule Details');
    });

    test('re_rendering_with_the_identical_schedule_object_does_not_reload_the_screen_a_second_time', async () => {
        const props = infoProps();
        const schedule = standardSchedule();
        const ref = React.createRef();
        const view = render(<ScheduleInfo {...props} ref={ref} />);

        await act(async () => {
            view.rerender(<ScheduleInfo {...props} ref={ref} default_schedule={schedule} page_reloaded />);
        });
        await flush();
        const firstToDate = ref.current.state.to_date;

        await act(async () => {
            view.rerender(<ScheduleInfo {...props} ref={ref} default_schedule={schedule} page_reloaded />);
        });
        await flush();

        // setSchedule rebuilds to_date from the clock, so an unchanged identity is proven by identity
        expect(ref.current.state.to_date).toBe(firstToDate);
        expect(ref.current.state.isInitialDataLoaded).toBe(true);
    });
});

describe('Schedule Details - PHASE 2: turning the saved schedule into screen state', () => {

    afterEach(() => jest.clearAllMocks());

    test('a_saved_standard_schedule_is_parsed_into_one_row_of_shift_start_end_and_break_times', async () => {
        const { ref } = await openInfo(infoProps(), standardSchedule());
        const row = ref.current.state.std_schedule_details[0];

        expect(ref.current.state.std_schedule_details).toHaveLength(1);
        expect(row.start_time.getHours()).toBe(9);
        expect(row.start_time.getMinutes()).toBe(0);
        expect(row.end_time.getHours()).toBe(18);
        expect(row.break_time.getHours()).toBe(1);
        // the flexible and customize buckets stay empty for a standard schedule
        expect(ref.current.state.flx_schedule_details).toEqual([]);
        expect(ref.current.state.cst_schedule_details).toEqual([]);
    });

    test('a_saved_flexible_schedule_also_captures_the_earliest_and_latest_permitted_clock_in_times', async () => {
        const { ref } = await openInfo(infoProps(), flexibleSchedule());
        const row = ref.current.state.flx_schedule_details[0];

        expect(ref.current.state.flx_schedule_details).toHaveLength(1);
        expect(row.start_time.getHours()).toBe(9);
        expect(row.end_time.getHours()).toBe(18);
        expect(row.start_flexy_time.getHours()).toBe(7);
        expect(row.end_flexy_time.getHours()).toBe(11);
        expect(row.break_time.getHours()).toBe(1);
        expect(ref.current.state.std_schedule_details).toEqual([]);
    });

    test('a_saved_customized_schedule_builds_one_detail_row_per_stored_weekday_in_the_order_the_server_sent_them', async () => {
        const { ref } = await openInfo(infoProps(), customizeSchedule());
        const rows = ref.current.state.cst_schedule_details;

        expect(rows).toHaveLength(2);
        // schedule_details was keyed fri then mon, and the rows follow that key order
        expect(rows[0].start_time.getHours()).toBe(8);
        expect(rows[1].start_time.getHours()).toBe(9);
        expect(rows[0].end_time.getHours()).toBe(17);
        expect(rows[0].start_flexy_time.getHours()).toBe(7);
        expect(rows[0].end_flexy_time.getHours()).toBe(10);
        expect(ref.current.state.work_day).toEqual(['fri', 'mon']);
    });

    test('numeric_policy_allowances_are_stored_as_integers_rather_than_the_strings_the_api_returns', async () => {
        const { ref } = await openInfo(infoProps(), standardSchedule());

        expect(ref.current.state.schedule_policies).toEqual({
            allow_late: 5,
            allow_undertime: 10,
            allow_night_diff: 1,
            allow_special_holiday: 1,
            allow_legal_holiday: 1,
        });
    });

    test('policy_allowances_that_are_missing_or_non_numeric_fall_back_to_zero_instead_of_NaN', async () => {
        const { ref } = await openInfo(infoProps(), standardSchedule({
            schedule_policies: { allow_late: 'not-a-number', allow_undertime: null },
        }));

        expect(ref.current.state.schedule_policies).toEqual({
            allow_late: 0,
            allow_undertime: 0,
            allow_night_diff: 0,
            allow_special_holiday: 0,
            allow_legal_holiday: 0,
        });
    });

    test('a_schedule_with_no_creation_type_is_treated_as_a_hand_built_customized_assignment', async () => {
        const { ref } = await openInfo(infoProps(), standardSchedule({ creation_type: null }));
        expect(ref.current.state.creation_type).toBe('customize');
    });

    test('a_schedule_that_declares_its_creation_type_keeps_that_value', async () => {
        const { ref } = await openInfo(infoProps(), standardSchedule({ creation_type: 'template' }));
        expect(ref.current.state.creation_type).toBe('template');
    });

    test('the_schedules_start_date_becomes_the_date_from_shown_on_screen', async () => {
        const { ref, container } = await openInfo(infoProps(), standardSchedule());
        const from = ref.current.state.from_date;

        expect(from instanceof Date).toBe(true);
        expect(from.getFullYear()).toBe(2026);
        expect(from.getMonth()).toBe(7); // August
        expect(from.getDate()).toBe(1);
        // asserted against the literal the fixture stored, NOT against moment(from) - comparing
        // the picker's value to a re-format of the same Date only re-states the datepicker mock.
        expect(container.querySelectorAll('[data-testid="datepicker"]')[0].value).toBe('2026-08-01');
    });

    /**
     * FINDING SI-TODATE-1
     * setSchedule never reads schedule.valid_to. It builds `to_date` as `new Date()` advanced by
     * nine hours, so the "Date To" a reviewer sees for a temporary schedule is a synthetic
     * timestamp derived from the clock, and the schedule's real 2026-08-31 end date is dropped.
     */
    test('the_date_to_is_always_nine_hours_from_now_and_never_the_schedules_stored_end_date_FINDING_SI_TODATE_1', async () => {
        const before = Date.now();
        const { ref } = await openInfo(infoProps(), standardSchedule({ valid_to: STORED_VALID_TO }));
        const after = Date.now();
        const to = ref.current.state.to_date.getTime();

        const NINE_HOURS = 9 * 60 * 60 * 1000;
        expect(to).toBeGreaterThanOrEqual(before + NINE_HOURS);
        expect(to).toBeLessThanOrEqual(after + NINE_HOURS);
        // and it is emphatically not the stored end date. STORED_VALID_TO is a past date, so
        // this comparison is true on every calendar day - see the note on the constant.
        expect(moment(ref.current.state.to_date).format('YYYY-MM-DD')).not.toBe(STORED_VALID_TO);
    });

    test('a_stored_point_of_view_schedule_for_the_viewed_employee_is_kept_verbatim_as_real_dates', async () => {
        const { ref } = await openInfo(infoProps(), standardSchedule({
            pov_schedule_details: { all: { start_time: '17:00:00', end_time: '02:00:00' } },
        }));
        const pov = ref.current.state.pov_schedule_details[0];

        expect(pov.start_time instanceof Date).toBe(true);
        expect(pov.start_time.getHours()).toBe(17);
        expect(pov.end_time.getHours()).toBe(2);
        // the employee's own times are untouched by the point-of-view conversion
        expect(ref.current.state.std_schedule_details[0].start_time.getHours()).toBe(9);
    });

    /**
     * FINDING SI-POVNUM-2
     * The no-stored-POV fallback is `date.setSeconds(date.getSeconds() + offset)`. setSeconds
     * RETURNS a millisecond number, so pov_schedule_details ends up holding numbers where the
     * stored-POV arm holds Date objects - two different shapes out of the same field.
     */
    test('with_no_stored_point_of_view_schedule_the_shifted_times_land_in_state_as_raw_millisecond_numbers_FINDING_SI_POVNUM_2', async () => {
        const props = infoProps({ user_info: { user_offset_seconds: 28800, pov_timezone: 'Asia/Singapore' } });
        const schedule = standardSchedule({ pov_schedule_details: null });

        const ref = React.createRef();
        const view = render(<ScheduleInfo {...props} ref={ref} />);
        // a template list arriving first is what seeds owner_offset (28800 - 0)
        await act(async () => {
            view.rerender(<ScheduleInfo {...props} ref={ref} template_list={ONE_TEMPLATE} />);
        });
        await flush();
        expect(ref.current.state.owner_offset).toBe(28800);

        await act(async () => {
            view.rerender(<ScheduleInfo {...props} ref={ref} template_list={ONE_TEMPLATE}
                default_schedule={schedule} page_reloaded />);
        });
        await flush();

        const pov = ref.current.state.pov_schedule_details[0];
        expect(typeof pov.start_time).toBe('number');
        expect(typeof pov.end_time).toBe('number');
        expect(pov.start_time).toBe(new Date('2020-01-01 09:00:00').getTime() + 28800 * 1000);
        expect(pov.end_time).toBe(new Date('2020-01-01 18:00:00').getTime() + 28800 * 1000);
        // break_time is deliberately not carried over into the point-of-view row
        expect(pov.break_time).toBeUndefined();
    });

    test('a_customized_schedule_for_an_employee_in_the_same_timezone_produces_no_point_of_view_rows_at_all', async () => {
        const { ref } = await openInfo(infoProps(), customizeSchedule({ pov_schedule_details: undefined }));

        // owner_offset is still 0, so neither the stored arm nor the shifted arm fires
        expect(ref.current.state.owner_offset).toBe(0);
        expect(ref.current.state.pov_schedule_details).toEqual([]);
        expect(ref.current.state.cst_schedule_details).toHaveLength(2);
    });

    /**
     * FINDING SI-OFFSET-4
     * componentWillReceiveProps reads this.props.user_info (the OLD props) when it computes
     * owner_offset, so when the viewed employee's timezone offset arrives in the SAME update as
     * a new template list, the value persisted into state is the previous offset while the
     * render pass on that very same update already uses the new one.
     */
    test('the_offset_persisted_into_state_lags_one_update_behind_the_offset_the_screen_renders_with_FINDING_SI_OFFSET_4', async () => {
        // the screen opens while the viewed employee is reported as sharing the viewer's timezone
        const props = infoProps();
        const shifted = { ...props, user_info: { user_offset_seconds: 28800, pov_timezone: 'Asia/Singapore' } };

        const ref = React.createRef();
        const view = render(<ScheduleInfo {...props} ref={ref} />);
        expect(ref.current.state.owner_offset).toBe(0);

        // the real offset and a fresh template list land in the SAME update
        await act(async () => {
            view.rerender(<ScheduleInfo {...shifted} ref={ref} template_list={ONE_TEMPLATE}
                default_schedule={standardSchedule()} page_reloaded />);
        });
        await flush();

        // stale: computed from the pre-update user_info, which reported no offset
        expect(ref.current.state.owner_offset).toBe(0);
        // but the detail form on that very same pass was handed the fresh 8-hour offset
        expect(view.getByTestId('std-form-tz').getAttribute('data-offset')).toBe('28800');
    });

    test('a_template_list_arriving_from_the_server_is_stored_on_the_screen_for_later_use', async () => {
        const props = infoProps();
        const ref = React.createRef();
        const view = render(<ScheduleInfo {...props} ref={ref} />);

        expect(ref.current.state.templateList).toEqual([]);

        await act(async () => {
            view.rerender(<ScheduleInfo {...props} ref={ref} template_list={ONE_TEMPLATE} />);
        });
        await flush();

        expect(ref.current.state.templateList).toEqual([{ id: 9, name: 'Night Shift' }]);
    });

    test('a_template_payload_arriving_rebuilds_the_screen_as_a_template_created_schedule', async () => {
        const props = infoProps();
        const ref = React.createRef();
        const view = render(<ScheduleInfo {...props} ref={ref} />);

        await act(async () => {
            view.rerender(<ScheduleInfo {...props} ref={ref} template_data={{
                work_days: ['mon'],
                schedule_policies: { allow_late: '15' },
                schedule_details: { all: { start_time: '10:00:00', end_time: '19:00:00', break_time: '01:00:00' } },
                schedule_type: 'standard',
            }} />);
        });
        await flush();

        expect(ref.current.state.creation_type).toBe('template');
        expect(ref.current.state.schedule_type).toBe('standard');
        expect(ref.current.state.work_day).toEqual(['mon']);
        expect(ref.current.state.schedule_policies.allow_late).toBe(15);
        expect(ref.current.state.std_schedule_details[0].start_time.getHours()).toBe(10);
        // a template carries no validity window, so the start date is left unset
        expect(ref.current.state.from_date).toBeNull();
    });

    /**
     * FINDING SI-TPLDEAD-5
     * loadTemplateSched is defined on this read-only screen but no control renders an onChange
     * that reaches it, so the only way to exercise it is programmatically. Its contract is still
     * worth pinning: it always requests the 'Default' variant of the chosen template.
     */
    test('requesting_a_template_always_asks_for_its_default_variant_FINDING_SI_TPLDEAD_5', async () => {
        const props = infoProps();
        const { ref, container } = await openInfo(props, standardSchedule());

        // nothing on the rendered screen can trigger it
        expect(container.querySelector('select')).toBeNull();

        act(() => { ref.current.loadTemplateSched(9); });

        expect(props.getTemplateSchedule).toHaveBeenCalledTimes(1);
        expect(props.getTemplateSchedule).toHaveBeenCalledWith(9, 'Default');
    });
});

describe('Schedule Details - PHASE 3: which parts of the detail form are drawn', () => {

    afterEach(() => jest.clearAllMocks());

    test('a_standard_schedule_draws_the_standard_detail_form_and_neither_of_the_other_two', async () => {
        const { container, queryByTestId } = await openInfo(infoProps(), standardSchedule());

        expect(queryByTestId('std-form-tz')).toBeInTheDocument();
        expect(queryByTestId('flex-form-tz')).toBeNull();
        expect(queryByTestId('sched-details-tz')).toBeNull();
        expect(container.textContent).toContain('Standard Schedule');
        expect(container.textContent).not.toContain('Flexible Schedule');
    });

    test('a_flexible_schedule_draws_the_flexible_detail_form_in_a_read_only_state', async () => {
        const { container, queryByTestId, getByTestId } = await openInfo(infoProps(), flexibleSchedule());

        expect(queryByTestId('flex-form-tz')).toBeInTheDocument();
        expect(queryByTestId('std-form-tz')).toBeNull();
        expect(container.textContent).toContain('Flexible Schedule');
        // this screen is a viewer, so the flexible form is explicitly disabled
        expect(getByTestId('flex-form-tz').getAttribute('data-disabled')).toBe('true');
    });

    test('a_customized_schedule_draws_one_row_per_working_day_ordered_monday_first_regardless_of_how_the_days_were_stored', async () => {
        const { container, getAllByTestId } = await openInfo(infoProps(), customizeSchedule());
        const rows = getAllByTestId('sched-details-tz');

        expect(container.textContent).toContain('Customize Schedule');
        expect(rows).toHaveLength(2);
        // work_days came back as ['fri','mon'] but the screen lays them out in weekday order
        expect(rows.map((r) => r.getAttribute('data-day'))).toEqual(['mon', 'fri']);
        // each row still points at its own position inside the stored work_days array
        expect(rows.map((r) => r.getAttribute('data-index'))).toEqual(['1', '0']);
    });

    test('a_customized_schedule_with_no_working_days_draws_the_heading_but_not_a_single_day_row', async () => {
        const { container, queryAllByTestId } = await openInfo(infoProps(),
            customizeSchedule({ work_days: [], schedule_details: {} }));

        expect(container.textContent).toContain('Customize Schedule');
        expect(queryAllByTestId('sched-details-tz')).toHaveLength(0);
    });

    test('a_schedule_whose_type_the_screen_does_not_recognise_draws_none_of_the_three_detail_forms_but_still_shows_the_policies', async () => {
        const { queryByTestId, container } = await openInfo(infoProps(),
            standardSchedule({ schedule_type: null }));

        expect(queryByTestId('std-form-tz')).toBeNull();
        expect(queryByTestId('flex-form-tz')).toBeNull();
        expect(queryByTestId('sched-details-tz')).toBeNull();
        // the shared sections above the type-specific block are unaffected
        expect(queryByTestId('schedule-policy')).toBeInTheDocument();
        expect(queryByTestId('holiday-policy')).toBeInTheDocument();
        expect(queryByTestId('work-days')).toBeInTheDocument();
        expect(container.textContent).toContain('Schedule Type');
    });

    test('a_temporary_schedule_shows_both_ends_of_its_validity_window_while_a_default_schedule_shows_only_the_start', async () => {
        const temp = await openInfo(infoProps(), standardSchedule({ source_type: 'temporary' }));
        expect(temp.container.textContent).toContain('Date From :');
        expect(temp.container.textContent).toContain('Date To :');
        expect(temp.container.querySelectorAll('[data-testid="datepicker"]')).toHaveLength(2);
        expect(radio(temp.container, 'Temporary').checked).toBe(true);
        temp.unmount();

        const def = await openInfo(infoProps(), standardSchedule({ source_type: 'default' }));
        expect(def.container.textContent).toContain('Date From :');
        expect(def.container.textContent).not.toContain('Date To :');
        expect(def.container.querySelectorAll('[data-testid="datepicker"]')).toHaveLength(1);
        expect(radio(def.container, 'Default').checked).toBe(true);
        expect(radio(def.container, 'Temporary').checked).toBe(false);
    });

    test('a_change_schedule_request_marks_only_the_change_schedule_source_and_every_source_radio_is_locked', async () => {
        const { container } = await openInfo(infoProps(), standardSchedule({ source_type: 'change_schedule' }));

        expect(radio(container, 'ChangeSchedule').checked).toBe(true);
        expect(radio(container, 'Default').checked).toBe(false);
        expect(radio(container, 'Temporary').checked).toBe(false);
        ['Default', 'Temporary', 'ChangeSchedule'].forEach((label) => {
            expect(radio(container, label).disabled).toBe(true);
        });
    });

    /**
     * FINDING SI-SRCDUP-3
     * initialValues sets `source_type: 'default'` and then, four lines later, sets
     * `source_type: this.state.source_type` again. The second key wins, so the declared default
     * is dead code and a schedule with no stored source type renders with NOTHING selected.
     */
    test('a_schedule_with_no_stored_source_type_leaves_every_source_radio_unchecked_despite_the_declared_default_FINDING_SI_SRCDUP_3', async () => {
        const { ref, container } = await openInfo(infoProps(), standardSchedule({ source_type: null }));

        expect(ref.current.state.source_type).toBeNull();
        expect(radio(container, 'Default').checked).toBe(false);
        expect(radio(container, 'Temporary').checked).toBe(false);
        expect(radio(container, 'ChangeSchedule').checked).toBe(false);
    });

    test('the_schedule_type_radios_report_the_saved_type_and_are_all_locked_against_editing', async () => {
        const { container } = await openInfo(infoProps(), flexibleSchedule());

        expect(radio(container, 'Flexible').checked).toBe(true);
        expect(radio(container, 'Standard').checked).toBe(false);
        expect(radio(container, 'Customize').checked).toBe(false);
        ['Standard', 'Flexible', 'Customize'].forEach((label) => {
            expect(radio(container, label).disabled).toBe(true);
        });
    });

    test('toggling_outlook_flips_the_contrast_flag_and_hands_the_new_value_straight_to_the_detail_form', async () => {
        const { container, getByTestId } = await openInfo(infoProps(), standardSchedule());

        expect(getByTestId('std-form-tz').getAttribute('data-contrast')).toBe('true');

        await act(async () => { fireEvent.click(btn(container, 'Toggle Outlook')); });
        await flush();
        expect(getByTestId('std-form-tz').getAttribute('data-contrast')).toBe('false');

        await act(async () => { fireEvent.click(btn(container, 'Toggle Outlook')); });
        await flush();
        expect(getByTestId('std-form-tz').getAttribute('data-contrast')).toBe('true');
    });

    test('the_timezone_banner_reads_from_the_viewers_timezone_across_to_the_viewed_employees_timezone', async () => {
        const props = infoProps({
            user: { id: 42, user_offset_seconds: 0, pov_timezone: 'Asia/Manila' },
            user_info: { user_offset_seconds: 28800, pov_timezone: 'Europe/Sofia' },
        });
        const { container, getByTestId } = await openInfo(props, standardSchedule());

        const banner = container.querySelector('.header_pov');
        expect(banner.textContent).toContain('Asia/Manila');
        expect(banner.textContent).toContain('Europe/Sofia');
        // and the same difference is what the detail form is told to shift by
        expect(getByTestId('std-form-tz').getAttribute('data-offset')).toBe('28800');
        expect(getByTestId('std-form-tz').getAttribute('data-pov-tz')).toBe('Europe/Sofia');
    });

    test('viewing_your_own_schedule_labels_the_page_as_your_own_submission_while_viewing_someone_elses_labels_it_an_approval', async () => {
        const mine = await openInfo(infoProps({ params: { user_id: 42, schedule_id: 7 } }), standardSchedule());
        expect(mine.getByTestId('request-subtitle').getAttribute('data-method')).toBe('store');
        mine.unmount();

        const theirs = await openInfo(
            infoProps({ user: { id: 99, user_offset_seconds: 0, pov_timezone: 'Asia/Manila' } }),
            standardSchedule());
        expect(theirs.getByTestId('request-subtitle').getAttribute('data-method')).toBe('approval');
        // the subtitle is fed the VIEWED employee, not the logged-in viewer
        expect(theirs.getByTestId('request-subtitle').getAttribute('data-user'))
            .toContain('Asia/Singapore');
    });

    test('a_route_that_delivers_the_user_id_as_text_still_counts_as_viewing_your_own_schedule', async () => {
        const props = infoProps({ params: { user_id: '42', schedule_id: 7 } });
        const { getByTestId } = await openInfo(props, standardSchedule());

        // the comparison is loose, so '42' and 42 are the same person here
        expect(getByTestId('request-subtitle').getAttribute('data-method')).toBe('store');
    });
});

describe('Schedule Details - PHASE 4: submitting the schedule back to the server', () => {

    afterEach(() => jest.clearAllMocks());

    /*
     * The next three tests call ref.current.onSubmitHandler(values) directly with hand-built
     * values. That deliberately bypasses Formik and the validation schema - it pins the shape
     * of the payload the handler builds, nothing more. The full UI path (real fireEvent.submit
     * through Formik) is covered by the two tests that follow them.
     */
    test('the_submit_handler_given_a_standard_schedule_flattens_the_single_shift_into_hour_and_minute_strings_under_the_all_key', async () => {
        const props = infoProps();
        const { ref } = await openInfo(props, standardSchedule());

        const values = {
            schedule_type: 'standard',
            std_schedule_details: [{
                start_time: new Date('2020-01-01 09:30:00'),
                end_time: new Date('2020-01-01 18:45:00'),
                break_time: new Date('2020-01-01 01:00:00'),
            }],
            from: new Date(2026, 7, 1),
            to: new Date(2026, 7, 31),
        };
        act(() => { ref.current.onSubmitHandler(values); });

        expect(props.scheduleAssign).toHaveBeenCalledTimes(1);
        const posted = props.scheduleAssign.mock.calls[0][0];
        expect(posted.schedule_details).toEqual({
            all: { start_time: '09:30', end_time: '18:45', break_time: '01:00' },
        });
        expect(posted.valid_from).toBe('2026-08-01');
        expect(posted.valid_to).toBe('2026-08-31');
    });

    test('the_submit_handler_given_a_customized_schedule_posts_one_entry_keyed_by_each_working_day', async () => {
        const props = infoProps();
        const { ref } = await openInfo(props, customizeSchedule());

        const detail = (h) => ({
            start_time: new Date('2020-01-01 0' + h + ':00:00'),
            end_time: new Date('2020-01-01 17:00:00'),
            start_flexy_time: new Date('2020-01-01 07:00:00'),
            end_flexy_time: new Date('2020-01-01 10:00:00'),
            break_time: new Date('2020-01-01 01:00:00'),
        });
        const values = {
            schedule_type: 'customize',
            work_days: ['fri', 'mon'],
            cst_schedule_details: [detail(8), detail(9)],
            from: new Date(2026, 7, 1),
            to: new Date(2026, 7, 1),
        };
        act(() => { ref.current.onSubmitHandler(values); });

        const posted = props.scheduleAssign.mock.calls[0][0];
        expect(Object.keys(posted.schedule_details)).toEqual(['fri', 'mon']);
        expect(posted.schedule_details.fri.start_time).toBe('08:00');
        expect(posted.schedule_details.mon.start_time).toBe('09:00');
        expect(posted.schedule_details.mon.end_flexy_time).toBe('10:00');
    });

    test('the_submit_handler_given_a_flexible_schedule_posts_the_flexible_window_alongside_the_shift', async () => {
        const props = infoProps();
        const { ref } = await openInfo(props, flexibleSchedule());

        const values = {
            schedule_type: 'flexible',
            flx_schedule_details: [{
                start_time: new Date('2020-01-01 09:00:00'),
                end_time: new Date('2020-01-01 18:00:00'),
                start_flexy_time: new Date('2020-01-01 07:15:00'),
                end_flexy_time: new Date('2020-01-01 11:30:00'),
                break_time: new Date('2020-01-01 01:00:00'),
            }],
            from: new Date(2026, 7, 1),
            to: new Date(2026, 7, 1),
        };
        act(() => { ref.current.onSubmitHandler(values); });

        expect(props.scheduleAssign.mock.calls[0][0].schedule_details).toEqual({
            all: {
                start_time: '09:00', end_time: '18:00',
                start_flexy_time: '07:15', end_flexy_time: '11:30',
                break_time: '01:00',
            },
        });
    });

    test('submitting_the_open_detail_form_sends_the_loaded_schedule_and_stamps_the_synthetic_end_date_FINDING_SI_TODATE_1', async () => {
        const props = infoProps();
        const { container, ref } = await openInfo(props, standardSchedule());
        const expectedTo = moment(ref.current.state.to_date).format('YYYY-MM-DD');

        await act(async () => { fireEvent.submit(formOf(container)); });
        await flush();

        expect(props.scheduleAssign).toHaveBeenCalled();
        const posted = lastCall(props.scheduleAssign)[0];
        expect(posted.bind_to).toBe('user');
        expect(posted.bind_id).toBe(42);
        expect(posted.schedule_type).toBe('standard');
        expect(posted.work_days).toEqual(['mon', 'tue']);
        expect(posted.schedule_details).toEqual({
            all: { start_time: '09:00', end_time: '18:00', break_time: '01:00' },
        });
        expect(posted.valid_from).toBe('2026-08-01');
        // the end date posted is the clock-derived one, not the schedule's stored valid_to
        expect(posted.valid_to).toBe(expectedTo);
        expect(posted.valid_to).not.toBe(STORED_VALID_TO);
    });

    /**
     * FINDING SI-NULLTYPE-9
     * The rejection itself is correct - nothing is posted - but the schedule_type rule is
     * `Yup.string().min(3).max(255).required('Please Select Schedule Type')` with no
     * .nullable(). A null value therefore fails the TYPE CAST before .required() is ever
     * reached, so the authored message never fires and the reviewer is shown Yup's internal
     * text ("schedule_type must be a `string` type...") twice on the page instead.
     */
    test('submitting_a_schedule_that_has_no_type_is_rejected_but_leaks_a_raw_validator_message_instead_of_the_authored_one_FINDING_SI_NULLTYPE_9', async () => {
        const props = infoProps();
        const { container } = await openInfo(props, standardSchedule({ schedule_type: null }));

        await act(async () => { fireEvent.submit(formOf(container)); });
        await flush();

        // the guard holds: a typeless schedule is never sent to the server
        expect(props.scheduleAssign).not.toHaveBeenCalled();
        // but the message the author wrote for exactly this case is unreachable
        expect(container.textContent).not.toContain('Please Select Schedule Type');
        expect(container.textContent).toContain('schedule_type must be a `string` type');
    });

    test('a_schedule_whose_type_is_an_empty_string_is_refused_with_the_authored_message_because_an_empty_string_still_casts_to_a_string', async () => {
        const props = infoProps();
        const { container } = await openInfo(props, standardSchedule({ schedule_type: '' }));

        await act(async () => { fireEvent.submit(formOf(container)); });
        await flush();

        expect(props.scheduleAssign).not.toHaveBeenCalled();
        // an empty string is a valid string, so this time the authored message does surface
        expect(container.textContent).toContain('Please Select Schedule Type');
    });
});

/* ========================================================================== */
/*  OPERATIONS SCHEDULE FORM                                                  */
/* ========================================================================== */

const OPS_DEPTS = [
    { id: 3, name: 'Service Desk' },
    { id: 4, name: 'Network Operations' },
];

const opsProps = (over = {}) => ({
    params: {},
    constant: { OPS_DEPTS },
    instance: {},
    isInstanceLoaded: false,
    user: { id: 1 },
    settings: {},
    fetchOpsSchedule: jest.fn(),
    addOpsSchedule: jest.fn(),
    updateOpsSchedule: jest.fn(),
    setRedirect: jest.fn(),
    clearOpsScheduleInstance: jest.fn(),
    ...over,
});

const savedOpsSchedule = (over = {}) => ({
    id: 12,
    department_id: 4,
    name: 'Ana Cruz',
    position: 'Team Lead',
    email: 'ana@example.com',
    domain: 'apac',
    scope: 'tickets,calls',
    start_time: '09:00:00',
    end_time: '18:00:00',
    timezone: 'IST',
    mon: true, tue: true, wed: false, thu: false, fri: false, sat: false, sun: false,
    status: 'pending',
    thumbnail: null,
    user: { full_name: 'Ana Cruz', department: 'Ops' },
    ...over,
});

const openOps = async (props) => {
    const ref = React.createRef();
    const view = render(<OpsScheduleForm {...props} ref={ref} />);
    await flush();
    return { ...view, ref };
};

const setFile = (input, file) => {
    Object.defineProperty(input, 'files', { value: file ? [file] : [], configurable: true });
    fireEvent.change(input);
};

describe('Operations Schedule Form - PHASE 1: opening the add and the edit screen', () => {

    afterEach(() => jest.clearAllMocks());

    test('opening_the_add_screen_clears_any_leftover_record_and_asks_the_server_for_nothing', async () => {
        const props = opsProps();
        await openOps(props);

        expect(props.clearOpsScheduleInstance).toHaveBeenCalledTimes(1);
        expect(props.fetchOpsSchedule).not.toHaveBeenCalled();
    });

    test('opening_the_edit_screen_clears_the_previous_record_first_and_then_loads_the_one_named_in_the_route', async () => {
        const props = opsProps({ params: { id: 12 }, isInstanceLoaded: true, instance: savedOpsSchedule() });
        await openOps(props);

        expect(props.clearOpsScheduleInstance).toHaveBeenCalledTimes(1);
        expect(props.fetchOpsSchedule).toHaveBeenCalledTimes(1);
        expect(props.fetchOpsSchedule).toHaveBeenCalledWith(12);
    });

    test('the_add_screen_draws_its_form_immediately_because_there_is_nothing_to_wait_for', async () => {
        const { container, queryByTestId } = await openOps(opsProps());

        expect(queryByTestId('page-loading')).toBeNull();
        expect(formOf(container)).not.toBeNull();
        expect(container.textContent).toContain('Operations Schedule Form');
    });

    test('the_edit_screen_holds_on_the_loading_placeholder_until_the_record_has_actually_arrived', async () => {
        const notLoaded = await openOps(opsProps({ params: { id: 12 }, isInstanceLoaded: false }));
        expect(notLoaded.queryByTestId('page-loading')).toBeInTheDocument();
        expect(formOf(notLoaded.container)).toBeNull();
        notLoaded.unmount();

        const loaded = await openOps(opsProps({
            params: { id: 12 }, isInstanceLoaded: true, instance: savedOpsSchedule(),
        }));
        expect(loaded.queryByTestId('page-loading')).toBeNull();
        expect(formOf(loaded.container)).not.toBeNull();
    });

    test('the_add_screen_offers_a_submit_button_while_a_pending_record_offers_update_and_cancel', async () => {
        const add = await openOps(opsProps());
        // toBeInstanceOf, not toBeDefined: btn() returns undefined on a miss, so this also
        // proves the match really is a rendered <button> and not some other tag.
        expect(btn(add.container, 'Submit')).toBeInstanceOf(HTMLButtonElement);
        expect(btn(add.container, 'Update')).toBeUndefined();
        add.unmount();

        const edit = await openOps(opsProps({
            params: { id: 12 }, isInstanceLoaded: true, instance: savedOpsSchedule({ status: 'pending' }),
        }));
        expect(btn(edit.container, 'Update')).toBeInstanceOf(HTMLButtonElement);
        expect(btn(edit.container, 'Cancel')).toBeInstanceOf(HTMLButtonElement);
        expect(btn(edit.container, 'Submit')).toBeUndefined();
    });

    test('an_already_approved_record_offers_only_the_update_and_reopen_action_and_no_cancel', async () => {
        const { container } = await openOps(opsProps({
            params: { id: 12 }, isInstanceLoaded: true, instance: savedOpsSchedule({ status: 'approved' }),
        }));

        expect(btn(container, 'Update and Reopen')).toBeInstanceOf(HTMLButtonElement);
        expect(btn(container, 'Cancel')).toBeUndefined();
    });
});

describe('Operations Schedule Form - PHASE 2: the department picker and the saved values', () => {

    afterEach(() => jest.clearAllMocks());

    test('the_department_dropdown_lists_every_operations_department_the_server_published_behind_a_blank_choice', async () => {
        const { container } = await openOps(opsProps());
        const options = Array.from(container.querySelector('select[name="department"]').querySelectorAll('option'));

        expect(options.map((o) => o.textContent)).toEqual(['', 'Service Desk', 'Network Operations']);
        expect(options.map((o) => o.value)).toEqual(['', '3', '4']);
    });

    test('when_the_server_published_no_operations_departments_the_dropdown_offers_only_the_blank_choice', async () => {
        const { container } = await openOps(opsProps({ constant: {} }));
        const options = Array.from(container.querySelector('select[name="department"]').querySelectorAll('option'));

        expect(options).toHaveLength(1);
        expect(options[0].textContent).toBe('');
    });

    test('the_add_screen_starts_with_no_department_chosen_while_the_edit_screen_preselects_the_saved_one', async () => {
        const add = await openOps(opsProps());
        expect(add.container.querySelector('select[name="department"]').value).toBe('');
        add.unmount();

        const edit = await openOps(opsProps({
            params: { id: 12 }, isInstanceLoaded: true, instance: savedOpsSchedule(),
        }));
        expect(edit.container.querySelector('select[name="department"]').value).toBe('4');
        // and the hidden record id travels with the form
        expect(edit.container.querySelector('input[name="id"]').value).toBe('12');
    });

    test('the_hidden_method_field_says_store_on_the_add_screen_and_update_once_a_record_id_is_in_the_route', async () => {
        const add = await openOps(opsProps());
        expect(add.container.querySelector('input[name="method"]').value).toBe('store');
        expect(add.getByTestId('request-subtitle').getAttribute('data-method')).toBe('store');
        add.unmount();

        const edit = await openOps(opsProps({
            params: { id: 12 }, isInstanceLoaded: true, instance: savedOpsSchedule(),
        }));
        expect(edit.container.querySelector('input[name="method"]').value).toBe('update');
        expect(edit.getByTestId('request-subtitle').getAttribute('data-method')).toBe('update');
    });
});

describe('Operations Schedule Form - PHASE 3: the image branch and the unreachable form branch', () => {

    afterEach(() => jest.clearAllMocks());

    /**
     * FINDING OPS-TYPEDEAD-6
     * The form always opens on the image branch (state.type = 'image') and the radio pair that
     * would call handleSelectActionType is commented out in the source, so no user can ever
     * reach the "Fill Form" branch or the validation rules that guard it.
     */
    test('the_screen_always_opens_on_the_image_branch_and_exposes_no_control_to_switch_to_the_form_branch_FINDING_OPS_TYPEDEAD_6', async () => {
        const { container, ref } = await openOps(opsProps());

        expect(ref.current.state.type).toBe('image');
        expect(container.querySelector('input[type="file"]')).not.toBeNull();
        expect(container.querySelector('#form-fill-area')).toBeNull();
        expect(container.querySelector('input[name="name"]')).toBeNull();
        // no radio anywhere on the page can flip the branch
        expect(container.querySelectorAll('input[type="radio"]')).toHaveLength(0);
        expect(container.querySelector('input[name="type"]').value).toBe('image');
    });

    test('switching_the_branch_programmatically_swaps_the_file_upload_for_the_full_detail_form_and_clears_the_chosen_department_DEADCODE_OPS_TYPEDEAD_6', async () => {
        const { container, ref } = await openOps(opsProps());

        await act(async () => { ref.current.handleSelectActionType({ target: { value: 'form' } }); });
        await flush();

        expect(ref.current.state.type).toBe('form');
        expect(ref.current.state.department_id).toBe('');
        expect(container.querySelector('#form-fill-area')).not.toBeNull();
        expect(container.querySelector('input[type="file"]')).toBeNull();
        ['name', 'position', 'email', 'domain', 'scope'].forEach((f) => {
            expect(container.querySelector('input[name="' + f + '"]')).not.toBeNull();
        });
        expect(container.querySelector('select[name="timezone"]')).not.toBeNull();
    });

    test('the_form_branch_offers_a_checkbox_for_every_day_of_the_week_all_unchecked_on_a_new_entry_DEADCODE_OPS_TYPEDEAD_6', async () => {
        const { container, ref } = await openOps(opsProps());
        await act(async () => { ref.current.handleSelectActionType({ target: { value: 'form' } }); });
        await flush();

        const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
        days.forEach((d) => {
            const box = container.querySelector('input[name="' + d + '"]');
            expect(box).not.toBeNull();
            expect(box.checked).toBe(false);
        });
        expect(container.querySelector('select[name="timezone"]').value).toBe('');
    });

    test('the_timezone_dropdown_offers_exactly_the_three_supported_operations_timezones_DEADCODE_OPS_TYPEDEAD_6', async () => {
        const { container, ref } = await openOps(opsProps());
        await act(async () => { ref.current.handleSelectActionType({ target: { value: 'form' } }); });
        await flush();

        const options = Array.from(container.querySelector('select[name="timezone"]').querySelectorAll('option'));
        expect(options.map((o) => o.value)).toEqual(['', 'PST', 'IST', 'EET']);
    });

    test('choosing_an_image_stores_the_file_and_shows_a_preview_in_place_of_the_upload_prompt', async () => {
        const { container, ref } = await openOps(opsProps());
        expect(container.textContent).toContain('UPLOAD AN IMAGE');

        const file = new File(['x'], 'roster.png', { type: 'image/png' });
        await act(async () => { setFile(container.querySelector('input[type="file"]'), file); });
        await flush();

        expect(ref.current.state.thumbnail).toBe(file);
        expect(ref.current.state.imgPrevInputFile).toBe('blob:preview-url');
        expect(container.textContent).not.toContain('UPLOAD AN IMAGE');
        expect(container.querySelector('.thumbnail-image img').getAttribute('src')).toBe('blob:preview-url');
    });

    test('dismissing_the_file_dialog_without_choosing_anything_leaves_the_previously_chosen_image_in_place', async () => {
        const { container, ref } = await openOps(opsProps());
        const file = new File(['x'], 'roster.png', { type: 'image/png' });
        await act(async () => { setFile(container.querySelector('input[type="file"]'), file); });
        await flush();

        await act(async () => { setFile(container.querySelector('input[type="file"]'), null); });
        await flush();

        expect(ref.current.state.thumbnail).toBe(file);
        expect(ref.current.state.imgPrevInputFile).toBe('blob:preview-url');
    });

    test('replacing_the_image_while_editing_an_existing_record_marks_the_upload_as_changed_and_not_deleted', async () => {
        const { container, ref } = await openOps(opsProps({
            params: { id: 12 }, isInstanceLoaded: true, instance: savedOpsSchedule(),
        }));

        expect(ref.current.state.inputFileWasUpdated).toBeUndefined();

        const file = new File(['y'], 'new-roster.png', { type: 'image/png' });
        await act(async () => { setFile(container.querySelector('input[type="file"]'), file); });
        await flush();

        expect(ref.current.state.inputFileWasUpdated).toBe(true);
        expect(ref.current.state.inputFileWasDeleted).toBe(false);
    });

    test('choosing_an_image_on_the_add_screen_does_not_raise_the_edit_only_changed_and_deleted_flags', async () => {
        const { container, ref } = await openOps(opsProps());
        const file = new File(['x'], 'roster.png', { type: 'image/png' });
        await act(async () => { setFile(container.querySelector('input[type="file"]'), file); });
        await flush();

        expect(ref.current.state.inputFileWasUpdated).toBeUndefined();
        expect(ref.current.state.inputFileWasDeleted).toBeUndefined();
    });

    /**
     * FINDING OPS-THUMB-7 - worse than "hard to reach": the saved-thumbnail <img> is DEAD CODE.
     *
     * OpsScheduleForm.js:313 ANDs three clauses:
     *     instance.thumbnail != null
     *  && state.inputFileWasDeleted == false
     *  && state.imgPrevInputFile == '/thumbnail/defthumb.jpg'
     *
     * inputFileWasDeleted is undefined until a file is picked, so clause 2 is false on open.
     * Picking a file is the ONLY thing that sets it to false - and the same handler sets
     * imgPrevInputFile to URL.createObjectURL(...), a blob: URL, which is the only value that
     * field is ever assigned anywhere in the file. So clause 3 can never be true either.
     *
     * The two halves of this test pin both legs, which is what makes the branch provably dead
     * rather than merely unhit: before a file is picked clause 2 blocks it, after a file is
     * picked clause 3 blocks it. The stored image has no code path to the screen at all.
     */
    test('editing_a_record_that_already_has_an_image_never_renders_that_image_on_either_leg_of_the_gate_FINDING_OPS_THUMB_7', async () => {
        const { container, ref } = await openOps(opsProps({
            params: { id: 12 },
            isInstanceLoaded: true,
            instance: savedOpsSchedule({ thumbnail: '/thumbnail/roster.png' }),
        }));

        // leg 1 - nothing picked yet: inputFileWasDeleted is undefined, so clause 2 fails
        expect(ref.current.state.inputFileWasDeleted).toBeUndefined();
        expect(container.textContent).toContain('UPLOAD AN IMAGE');
        expect(container.querySelector('.thumbnail-image img')).toBeNull();

        // leg 2 - pick a file, which is the ONLY way to satisfy clause 2...
        const file = new File(['y'], 'new-roster.png', { type: 'image/png' });
        await act(async () => { setFile(container.querySelector('input[type="file"]'), file); });
        await flush();

        expect(ref.current.state.inputFileWasDeleted).toBe(false);   // clause 2 now satisfied
        // ...but the same handler forced imgPrevInputFile to a blob: URL, so clause 3 fails
        expect(ref.current.state.imgPrevInputFile).toBe('blob:preview-url');
        expect(ref.current.state.imgPrevInputFile).not.toBe('/thumbnail/defthumb.jpg');
        // the rendered image is the new preview, never the record's stored /thumbnail/roster.png
        const img = container.querySelector('.thumbnail-image img');
        expect(img.getAttribute('src')).toBe('blob:preview-url');
        expect(img.getAttribute('src')).not.toBe('/thumbnail/roster.png');
    });
});

describe('Operations Schedule Form - PHASE 4: saving the operations schedule', () => {

    afterEach(() => jest.clearAllMocks());

    test('saving_a_new_entry_without_choosing_a_department_is_rejected_and_nothing_is_posted', async () => {
        const props = opsProps();
        const { container } = await openOps(props);

        await act(async () => { fireEvent.submit(formOf(container)); });
        await flush();

        expect(props.addOpsSchedule).not.toHaveBeenCalled();
        expect(props.updateOpsSchedule).not.toHaveBeenCalled();
        expect(container.textContent).toContain('This field is required');
    });

    test('saving_a_new_entry_with_a_department_posts_it_as_a_store_of_the_image_kind', async () => {
        const props = opsProps();
        const { container } = await openOps(props);

        await act(async () => {
            fireEvent.change(container.querySelector('select[name="department"]'), { target: { value: '3' } });
        });
        await flush();
        await act(async () => { fireEvent.submit(formOf(container)); });
        await flush();

        expect(props.addOpsSchedule).toHaveBeenCalled();
        expect(props.updateOpsSchedule).not.toHaveBeenCalled();
        const posted = fdToObject(lastCall(props.addOpsSchedule)[0]);
        expect(posted.department).toBe('3');
        expect(posted.method).toBe('store');
        expect(posted.type).toBe('image');
        // untouched nullable fields are dropped rather than posted empty
        expect(posted.name).toBeUndefined();
        expect(posted.id).toBeUndefined();
    });

    /**
     * FINDING OPS-IMGUNDEF-8
     * onSubmitHandler unconditionally does formData.set('image', this.state.thumbnail) on the
     * image branch. With no file chosen, state.thumbnail is undefined and FormData stringifies
     * it, so the server receives the four-letter word "undefined" as the image.
     */
    test('saving_the_image_branch_with_no_file_chosen_posts_the_literal_text_undefined_as_the_image_FINDING_OPS_IMGUNDEF_8', async () => {
        const props = opsProps();
        const { container } = await openOps(props);

        await act(async () => {
            fireEvent.change(container.querySelector('select[name="department"]'), { target: { value: '3' } });
        });
        await flush();
        await act(async () => { fireEvent.submit(formOf(container)); });
        await flush();

        const posted = fdToObject(lastCall(props.addOpsSchedule)[0]);
        expect(posted.image).toBe('undefined');
    });

    test('saving_after_choosing_an_image_posts_that_actual_file_under_the_image_field', async () => {
        const props = opsProps();
        const { container } = await openOps(props);
        const file = new File(['x'], 'roster.png', { type: 'image/png' });

        await act(async () => { setFile(container.querySelector('input[type="file"]'), file); });
        await act(async () => {
            fireEvent.change(container.querySelector('select[name="department"]'), { target: { value: '4' } });
        });
        await flush();
        await act(async () => { fireEvent.submit(formOf(container)); });
        await flush();

        const formData = lastCall(props.addOpsSchedule)[0];
        expect(formData.get('image').name).toBe('roster.png');
        expect(fdToObject(formData).department).toBe('4');
    });

    test('updating_an_existing_record_targets_that_record_by_id_and_tunnels_a_put_through_the_post_body', async () => {
        const props = opsProps({
            params: { id: 12 }, isInstanceLoaded: true, instance: savedOpsSchedule(),
        });
        const { container } = await openOps(props);

        await act(async () => { fireEvent.click(btn(container, 'Update')); });
        await flush();

        expect(props.updateOpsSchedule).toHaveBeenCalled();
        expect(props.addOpsSchedule).not.toHaveBeenCalled();
        const call = lastCall(props.updateOpsSchedule);
        expect(call[0]).toBe(12);
        const posted = fdToObject(call[1]);
        expect(posted._method).toBe('PUT');
        expect(posted.method).toBe('update');
        expect(posted.id).toBe('12');
        expect(posted.department).toBe('4');
    });

    test('cancelling_an_existing_record_posts_the_cancel_action_through_the_same_update_endpoint', async () => {
        const props = opsProps({
            params: { id: 12 }, isInstanceLoaded: true, instance: savedOpsSchedule({ status: 'pending' }),
        });
        const { container } = await openOps(props);

        await act(async () => { fireEvent.click(btn(container, 'Cancel')); });
        await flush();

        expect(props.updateOpsSchedule).toHaveBeenCalled();
        const call = lastCall(props.updateOpsSchedule);
        expect(call[0]).toBe(12);
        const posted = fdToObject(call[1]);
        expect(posted.action).toBe('cancel');
        expect(posted._method).toBe('PUT');
    });

    test('the_update_button_clears_any_previously_set_action_so_a_plain_save_is_not_mistaken_for_a_cancel', async () => {
        const props = opsProps({
            params: { id: 12 }, isInstanceLoaded: true, instance: savedOpsSchedule({ status: 'pending' }),
        });
        const { container } = await openOps(props);

        await act(async () => { fireEvent.click(btn(container, 'Cancel')); });
        await flush();
        expect(fdToObject(lastCall(props.updateOpsSchedule)[1]).action).toBe('cancel');

        await act(async () => { fireEvent.click(btn(container, 'Update')); });
        await flush();
        // action was reset to null, and null values are omitted from the body entirely
        expect(fdToObject(lastCall(props.updateOpsSchedule)[1]).action).toBeUndefined();
    });

    /**
     * FINDING OPS-NOFEED-10
     * Six rules fire here (name, position, email, start_time, end_time, timezone) but only FOUR
     * messages reach the page. start_time and end_time are rendered at OpsScheduleForm.js:266-278
     * with a label and an <InputTime> and no <ErrorMessage> at all, unlike every other required
     * field on this branch. The save is refused with no indication that the times are the problem.
     *
     * The count below is exact on purpose. The original >= 3 could not distinguish "four
     * messages, two fields silently blocking the save" from "all six reported correctly", which
     * is precisely the gap this test exists to record. When someone adds the two missing
     * <ErrorMessage> components, this assertion must be changed to 6 and the finding closed.
     */
    test('saving_the_form_branch_with_empty_times_is_refused_but_only_four_of_the_six_failing_fields_say_so_FINDING_OPS_NOFEED_10_DEADCODE_OPS_TYPEDEAD_6', async () => {
        const props = opsProps();
        const { container, ref } = await openOps(props);

        await act(async () => { ref.current.handleSelectActionType({ target: { value: 'form' } }); });
        await flush();
        await act(async () => {
            fireEvent.change(container.querySelector('select[name="department"]'), { target: { value: '3' } });
        });
        await flush();
        await act(async () => { fireEvent.submit(formOf(container)); });
        await flush();

        expect(props.addOpsSchedule).not.toHaveBeenCalled();

        // department was supplied, so the four visible complaints are name / position / email / timezone
        const complaints = container.textContent.split('This field is required').length - 1;
        expect(complaints).toBe(4);

        // the two time inputs did block the save, and neither of them is mentioned anywhere
        expect(container.querySelector('[data-testid="time-start_time"]').value).toBe('');
        expect(container.querySelector('[data-testid="time-end_time"]').value).toBe('');
        expect(container.querySelector('input[name="name"]').value).toBe('');
        expect(container.querySelector('select[name="timezone"]').value).toBe('');
    });

    test('saving_a_complete_form_branch_entry_posts_every_contact_field_the_shift_window_and_the_working_days_DEADCODE_OPS_TYPEDEAD_6', async () => {
        const props = opsProps();
        const { container, ref } = await openOps(props);

        await act(async () => { ref.current.handleSelectActionType({ target: { value: 'form' } }); });
        await flush();

        const type = (sel, value) => fireEvent.change(container.querySelector(sel), { target: { value } });
        await act(async () => {
            fireEvent.change(container.querySelector('select[name="department"]'), { target: { value: '3' } });
            type('input[name="name"]', 'Ana Cruz');
            type('input[name="position"]', 'Team Lead');
            type('input[name="email"]', 'ana@example.com');
            type('input[name="domain"]', 'apac');
            type('input[name="scope"]', 'tickets,calls');
            fireEvent.click(container.querySelector('input[name="mon"]'));
            fireEvent.click(container.querySelector('input[name="wed"]'));
            fireEvent.change(container.querySelector('[data-testid="time-start_time"]'), { target: { value: '09:00' } });
            fireEvent.change(container.querySelector('[data-testid="time-end_time"]'), { target: { value: '18:00' } });
            fireEvent.change(container.querySelector('select[name="timezone"]'), { target: { value: 'IST' } });
        });
        await flush();

        await act(async () => { fireEvent.submit(formOf(container)); });
        await flush();

        expect(props.addOpsSchedule).toHaveBeenCalled();
        const posted = fdToObject(lastCall(props.addOpsSchedule)[0]);
        expect(posted.name).toBe('Ana Cruz');
        expect(posted.position).toBe('Team Lead');
        expect(posted.email).toBe('ana@example.com');
        expect(posted.domain).toBe('apac');
        expect(posted.scope).toBe('tickets,calls');
        expect(posted.timezone).toBe('IST');
        expect(posted.type).toBe('form');
        // the two ticked days go up as true, the five untouched ones as false
        expect(posted.mon).toBe('true');
        expect(posted.wed).toBe('true');
        expect(posted.tue).toBe('false');
        expect(posted.sun).toBe('false');
        // the form branch never attaches an image
        expect(posted.image).toBeUndefined();
    });

    /*
     * What this proves is NOT that '09:00' becomes 9 o'clock - the DatePicker mock does that
     * conversion itself, so asserting only the hour would be a restatement of the mock. What
     * belongs to the application is onSubmitHandler's `formData.set(key, values[key])`: a Date
     * held in Formik state has to survive FormData's stringification as something the server can
     * still parse. A null or dropped field would arrive as '', 'null' or be absent instead.
     */
    test('the_submitted_shift_window_survives_form_data_stringification_as_two_parsable_date_strings_DEADCODE_OPS_TYPEDEAD_6', async () => {
        const props = opsProps();
        const { container, ref } = await openOps(props);

        await act(async () => { ref.current.handleSelectActionType({ target: { value: 'form' } }); });
        await flush();
        await act(async () => {
            fireEvent.change(container.querySelector('select[name="department"]'), { target: { value: '3' } });
            fireEvent.change(container.querySelector('input[name="name"]'), { target: { value: 'Ana' } });
            fireEvent.change(container.querySelector('input[name="position"]'), { target: { value: 'Lead' } });
            fireEvent.change(container.querySelector('input[name="email"]'), { target: { value: 'a@b.c' } });
            fireEvent.change(container.querySelector('[data-testid="time-start_time"]'), { target: { value: '09:00' } });
            fireEvent.change(container.querySelector('[data-testid="time-end_time"]'), { target: { value: '18:00' } });
            fireEvent.change(container.querySelector('select[name="timezone"]'), { target: { value: 'PST' } });
        });
        await flush();
        await act(async () => { fireEvent.submit(formOf(container)); });
        await flush();

        const posted = fdToObject(lastCall(props.addOpsSchedule)[0]);

        // present, stringified, and not one of the ways a lost value shows up in FormData
        expect(typeof posted.start_time).toBe('string');
        expect(typeof posted.end_time).toBe('string');
        [posted.start_time, posted.end_time].forEach((v) => {
            expect(v).not.toBe('');
            expect(v).not.toBe('null');
            expect(v).not.toBe('undefined');
            expect(Number.isNaN(new Date(v).getTime())).toBe(false);
        });

        expect(new Date(posted.start_time).getHours()).toBe(9);
        expect(new Date(posted.end_time).getHours()).toBe(18);
        // and the two are distinct values, not the same Date posted twice
        expect(posted.start_time).not.toBe(posted.end_time);
        expect(posted.timezone).toBe('PST');
    });
});
