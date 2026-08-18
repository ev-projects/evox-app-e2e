/**
 * ScheduleDetailsPickersDeep3.test.js
 *
 * SOURCE UNDER TEST: components/Schedule/ScheduleDetails.js
 *   (shared by TemplateCreate, TemplateEdit, ScheduleAssign, ScheduleAssignDepartment,
 *    ScheduleInfo and ChangeSchedule — six containers).
 *
 * MENU PATHS: Schedule -> Create/Edit Template; Schedule -> Assign Schedule (employee and
 *   department); Schedule -> Schedule Info; Requests -> Change Schedule.
 *
 * WHY THIS SUITE EXISTS: every time picker in this file hands its value to an inline
 * onChange, and those handlers carry the derivation rules of the whole schedule form (an
 * On Duty pick back-fills off duty, flexi window and break; the timezone variants mirror
 * the same pick into pov_schedule_details shifted by the viewed employee's offset). The
 * containers that embed this component are all tested through mocked children, so none of
 * those handlers had ever run. react-datepicker is replaced with a stub that records the
 * props of each picker in render order, which is how the individual onChange callbacks
 * are reached; Formik itself is real, so the assertions are made against the form values
 * the app would actually submit.
 *
 * Nothing here depends on today's date: the derived off-duty time is built by the source
 * from `new Date()`, so only its hour and minute are asserted, never its calendar date.
 *
 * FINDINGS: none.
 *   Checked and dismissed: onSelectTimeHandlerFlexi writes to
 *   'cst_schedule_details[0]start_flexy_time' with the dot missing before the key. That
 *   looks like a broken path but lodash's toPath (used by Formik's setIn) parses
 *   'a[0]b' and 'a[0].b' to the same ['a','0','b'], so the value lands correctly. The
 *   test below pins that it does.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { Formik } from 'formik';

// Records the props of every rendered picker, in render order, so each individual
// onChange can be driven. Name is `mock`-prefixed for babel-plugin-jest-hoist.
const mockPickers = [];
jest.mock('react-datepicker', () => ({
    __esModule: true,
    default: (props) => {
        mockPickers.push(props);
        return <input data-testid="datepicker" readOnly value="" onChange={() => {}} />;
    },
}));

const {
    ScheduleHolidayPolicy, SchedulePolicy, WorkDays,
    StandardSchedDetailsForm, StandardSchedDetailsFormWithTimezone,
    FlexibleSchedDetailsForm, FlexibleSchedDetailsFormWithTimezone,
    Scheduledetails, ScheduledetailsWithTimezone,
    onSelectTimeHandlerStd, onSelectTimeHandlerFlexi,
} = require('../../components/Schedule/ScheduleDetails.js');

const ON_DUTY = new Date('2026-06-01T08:30:00');
const OFFSET_SECONDS = 3600; // viewed employee is one hour ahead of the viewer

function emptyDetail() {
    return { start_time: null, end_time: null, start_flexy_time: null, end_flexy_time: null, break_time: null };
}

function baseValues(overrides = {}) {
    return {
        work_days: [],
        wd: {},
        schedule_policies: {
            allow_undertime: '0', allow_late: '0', allow_night_diff: '0',
            allow_special_holiday: '0', allow_legal_holiday: '0',
        },
        std_schedule_details: [emptyDetail()],
        flx_schedule_details: [emptyDetail()],
        cst_schedule_details: [emptyDetail()],
        pov_schedule_details: [emptyDetail()],
        ...overrides,
    };
}

/**
 * Renders one of the schedule sub-forms inside a real Formik. Returns the live Formik bag
 * plus `pickers()`, which yields the pickers produced by the most recent render pass.
 */
function renderInFormik(ui, values = baseValues(), onSubmit = jest.fn()) {
    mockPickers.length = 0;
    let bag = null;
    const utils = render(
        <Formik initialValues={values} onSubmit={onSubmit}>
            {(formik) => { bag = formik; return typeof ui === 'function' ? ui(formik) : ui; }}
        </Formik>
    );
    const perPass = mockPickers.length;
    return {
        ...utils,
        onSubmit,
        get values() { return bag.values; },
        pickers: () => (perPass === 0 ? [] : mockPickers.slice(-perPass)),
    };
}

const change = async (picker, date) => {
    await act(async () => { picker.onChange(date); });
};

describe('Schedule details — standard (single) schedule pickers', () => {
    test('picking On Duty derives off duty nine hours later, mirrors the flexi window and sets a one-hour break', async () => {
        const view = renderInFormik(<StandardSchedDetailsForm />);
        await change(view.pickers()[0], ON_DUTY);

        const row = view.values.std_schedule_details[0];
        expect(row.start_time).toBe(ON_DUTY);
        expect([row.end_time.getHours(), row.end_time.getMinutes()]).toEqual([17, 30]);
        expect(row.start_flexy_time).toBe(ON_DUTY);
        expect([row.end_flexy_time.getHours(), row.end_flexy_time.getMinutes()]).toEqual([17, 30]);
        expect([row.break_time.getHours(), row.break_time.getMinutes()]).toEqual([1, 0]);
    });

    test('clearing On Duty nulls the start time and leaves the other four fields alone', async () => {
        const seeded = baseValues({
            std_schedule_details: [{ ...emptyDetail(), start_time: ON_DUTY, end_time: ON_DUTY, break_time: ON_DUTY }],
        });
        const view = renderInFormik(<StandardSchedDetailsForm />, seeded);
        await change(view.pickers()[0], null);

        const row = view.values.std_schedule_details[0];
        expect(row.start_time).toBeNull();
        expect(row.end_time).toBe(ON_DUTY);
        expect(row.break_time).toBe(ON_DUTY);
    });

    test('the Off Duty and Break pickers each set only their own field', async () => {
        const view = renderInFormik(<StandardSchedDetailsForm />);
        const offDuty = new Date('2026-06-01T18:00:00');
        const breakAt = new Date('2026-06-01T01:00:00');

        await change(view.pickers()[1], offDuty);
        await change(view.pickers()[2], breakAt);

        const row = view.values.std_schedule_details[0];
        expect(row.end_time).toBe(offDuty);
        expect(row.break_time).toBe(breakAt);
        expect(row.start_time).toBeNull();
        expect(row.start_flexy_time).toBeNull();
    });
});

describe('Schedule details — standard schedule shown against a second timezone', () => {
    test('picking On Duty writes the local row and a pov row shifted by the offset', async () => {
        const view = renderInFormik(<StandardSchedDetailsFormWithTimezone offset_data={OFFSET_SECONDS} />);
        await change(view.pickers()[0], ON_DUTY);

        expect(view.values.std_schedule_details[0].start_time).toBe(ON_DUTY);
        const pov = view.values.pov_schedule_details[0];
        expect(pov.start_time).toEqual(new Date(ON_DUTY.getTime() + OFFSET_SECONDS * 1000));
        expect(pov.end_time).toEqual(new Date(ON_DUTY.getTime() + OFFSET_SECONDS * 1000 + 9 * 3600 * 1000));
        expect(pov.start_flexy_time).toEqual(pov.start_time);
        expect([pov.break_time.getHours(), pov.break_time.getMinutes()]).toEqual([1, 0]);
    });

    test('clearing On Duty nulls the pov start time too', async () => {
        const view = renderInFormik(<StandardSchedDetailsFormWithTimezone offset_data={OFFSET_SECONDS} />);
        await change(view.pickers()[0], ON_DUTY);
        await change(view.pickers()[0], null);

        expect(view.values.std_schedule_details[0].start_time).toBeNull();
        expect(view.values.pov_schedule_details[0].start_time).toBeNull();
    });

    test('a zero offset makes the pov row identical to the local pick', async () => {
        const view = renderInFormik(<StandardSchedDetailsFormWithTimezone offset_data={0} />);
        await change(view.pickers()[0], ON_DUTY);
        expect(view.values.pov_schedule_details[0].start_time).toEqual(ON_DUTY);
    });

    test('the Off Duty and Break pickers stay local-only — they do not touch the pov row', async () => {
        const view = renderInFormik(<StandardSchedDetailsFormWithTimezone offset_data={OFFSET_SECONDS} />);
        const offDuty = new Date('2026-06-01T18:00:00');
        const breakAt = new Date('2026-06-01T01:00:00');

        await change(view.pickers()[1], offDuty);
        await change(view.pickers()[2], breakAt);

        expect(view.values.std_schedule_details[0].end_time).toBe(offDuty);
        expect(view.values.std_schedule_details[0].break_time).toBe(breakAt);
        expect(view.values.pov_schedule_details[0].end_time).toBeNull();
    });
});

describe('Schedule details — flexible schedule pickers', () => {
    test('picking On Duty on the flexible form derives the whole flx row', async () => {
        const view = renderInFormik(<FlexibleSchedDetailsForm />);
        await change(view.pickers()[0], ON_DUTY);

        const row = view.values.flx_schedule_details[0];
        expect(row.start_time).toBe(ON_DUTY);
        expect([row.end_time.getHours(), row.end_time.getMinutes()]).toEqual([17, 30]);
        expect([row.break_time.getHours(), row.break_time.getMinutes()]).toEqual([1, 0]);
    });

    test('the Off Duty picker sets only flx end time', async () => {
        const view = renderInFormik(<FlexibleSchedDetailsForm />);
        const offDuty = new Date('2026-06-01T19:00:00');
        await change(view.pickers()[1], offDuty);

        expect(view.values.flx_schedule_details[0].end_time).toBe(offDuty);
        expect(view.values.flx_schedule_details[0].start_time).toBeNull();
    });
});

describe('Schedule details — flexible schedule shown against a second timezone', () => {
    test('picking On Duty writes the flx row and the offset pov row', async () => {
        const view = renderInFormik(<FlexibleSchedDetailsFormWithTimezone offset_data={OFFSET_SECONDS} />);
        await change(view.pickers()[0], ON_DUTY);

        expect(view.values.flx_schedule_details[0].start_time).toBe(ON_DUTY);
        expect(view.values.pov_schedule_details[0].start_time)
            .toEqual(new Date(ON_DUTY.getTime() + OFFSET_SECONDS * 1000));
    });

    test('the Off Duty, Flexi End and Break pickers each set exactly one flx field', async () => {
        const view = renderInFormik(<FlexibleSchedDetailsFormWithTimezone offset_data={OFFSET_SECONDS} />);
        const offDuty = new Date('2026-06-01T19:00:00');
        const flexiEnd = new Date('2026-06-01T20:00:00');
        const breakAt = new Date('2026-06-01T01:00:00');

        await change(view.pickers()[1], offDuty);
        await change(view.pickers()[3], flexiEnd);
        await change(view.pickers()[4], breakAt);

        const row = view.values.flx_schedule_details[0];
        expect(row.end_time).toBe(offDuty);
        expect(row.end_flexy_time).toBe(flexiEnd);
        expect(row.break_time).toBe(breakAt);
        expect(row.start_time).toBeNull();
    });

    // The flexi branch of the timezone handler moves only the flexi window, on the
    // grounds that a flexible schedule's fixed on/off duty is not the employee's concern.
    test('picking Flexi Start shifts only the flexi window in the pov row', async () => {
        const view = renderInFormik(<FlexibleSchedDetailsFormWithTimezone offset_data={OFFSET_SECONDS} />);
        await change(view.pickers()[2], ON_DUTY);

        const pov = view.values.pov_schedule_details[0];
        expect(pov.start_flexy_time).toEqual(new Date(ON_DUTY.getTime() + OFFSET_SECONDS * 1000));
        expect(pov.end_flexy_time)
            .toEqual(new Date(ON_DUTY.getTime() + OFFSET_SECONDS * 1000 + 9 * 3600 * 1000));
        expect(pov.start_time).toBeNull();
        expect(pov.end_time).toBeNull();
    });
});

describe('Schedule details — per-day custom rows', () => {
    test('picking On Duty for a day derives that day row; Off Duty, Flexi End and Break set one field each', async () => {
        const view = renderInFormik(<Scheduledetails day="mon" index={0} />);
        const offDuty = new Date('2026-06-01T18:00:00');
        const flexiEnd = new Date('2026-06-01T20:00:00');
        const breakAt = new Date('2026-06-01T01:00:00');

        await change(view.pickers()[0], ON_DUTY);
        await change(view.pickers()[1], offDuty);
        await change(view.pickers()[3], flexiEnd);
        await change(view.pickers()[4], breakAt);

        const row = view.values.cst_schedule_details[0];
        expect(row.start_time).toBe(ON_DUTY);
        expect(row.end_time).toBe(offDuty);
        expect(row.end_flexy_time).toBe(flexiEnd);
        expect(row.break_time).toBe(breakAt);
    });

    // Pins that the missing '.' in onSelectTimeHandlerFlexi's path is harmless: the value
    // lands on the row, not on a stray top-level key.
    test('picking Flexi Start for a day lands on that day row and creates no stray key', async () => {
        const view = renderInFormik(<Scheduledetails day="mon" index={0} />);
        await change(view.pickers()[2], ON_DUTY);

        expect(view.values.cst_schedule_details[0].start_flexy_time).toBe(ON_DUTY);
        expect([view.values.cst_schedule_details[0].end_flexy_time.getHours(),
            view.values.cst_schedule_details[0].end_flexy_time.getMinutes()]).toEqual([17, 30]);
        expect(Object.keys(view.values)).not.toContain('cst_schedule_details[0]start_flexy_time');
    });

    test('the per-day row with a timezone mirrors On Duty, Off Duty, Flexi Start and Flexi End into the pov row', async () => {
        const view = renderInFormik(
            <ScheduledetailsWithTimezone day="tue" index={0} offset_data={OFFSET_SECONDS} show_pov open_contrast />
        );
        const offDuty = new Date('2026-06-01T18:00:00');
        const flexiEnd = new Date('2026-06-01T20:00:00');

        await change(view.pickers()[0], ON_DUTY);
        await change(view.pickers()[1], offDuty);
        await change(view.pickers()[3], flexiEnd);

        const pov = view.values.pov_schedule_details[0];
        expect(pov.start_time).toEqual(new Date(ON_DUTY.getTime() + OFFSET_SECONDS * 1000));
        expect(pov.end_time).toEqual(new Date(offDuty.getTime() + OFFSET_SECONDS * 1000));
        expect(pov.end_flexy_time).toEqual(new Date(flexiEnd.getTime() + OFFSET_SECONDS * 1000));
    });

    test('the per-day Break picker with a timezone stays local — it has no pov counterpart', async () => {
        const view = renderInFormik(
            <ScheduledetailsWithTimezone day="tue" index={0} offset_data={OFFSET_SECONDS} show_pov open_contrast />
        );
        const breakAt = new Date('2026-06-01T01:00:00');
        await change(view.pickers()[4], breakAt);

        expect(view.values.cst_schedule_details[0].break_time).toBe(breakAt);
        expect(view.values.pov_schedule_details[0].break_time).toBeNull();
    });

    test('clearing Off Duty with a timezone nulls the pov counterpart rather than shifting null', async () => {
        const view = renderInFormik(
            <ScheduledetailsWithTimezone day="tue" index={0} offset_data={OFFSET_SECONDS} show_pov open_contrast />
        );
        await change(view.pickers()[1], new Date('2026-06-01T18:00:00'));
        await change(view.pickers()[1], null);

        expect(view.values.cst_schedule_details[0].end_time).toBeNull();
        expect(view.values.pov_schedule_details[0].end_time).toBeNull();
    });

    test('the pov column is hidden until the row is opened for approval or pov display', () => {
        const hidden = renderInFormik(<ScheduledetailsWithTimezone day="tue" index={0} offset_data={0} />);
        const hiddenCount = hidden.pickers().length;
        const shown = renderInFormik(
            <ScheduledetailsWithTimezone day="tue" index={0} offset_data={0} on_approval open_contrast />
        );
        expect(hiddenCount).toBe(5);
        expect(shown.pickers().length).toBeGreaterThan(hiddenCount);
    });
});

describe('Schedule policies', () => {
    // The comparison is loose (`== "1"`), which is what lets the same component render
    // both the string flags the announcement/schedule API returns and the numeric flags
    // the toggle handlers below write back.
    test('a policy box is ticked for 1 whether it arrives as a string or a number, and never for 0', () => {
        const values = baseValues({
            schedule_policies: {
                allow_undertime: '1', allow_late: '0', allow_night_diff: 1,
                allow_special_holiday: '0', allow_legal_holiday: '0',
            },
        });
        const view = renderInFormik(<SchedulePolicy />, values);
        const boxes = view.container.querySelectorAll('input[type="checkbox"]');
        expect(boxes[0].checked).toBe(true);   // string '1'
        expect(boxes[1].checked).toBe(false);  // string '0'
        expect(boxes[2].checked).toBe(true);   // numeric 1

        const zeroed = renderInFormik(<SchedulePolicy />, baseValues({
            schedule_policies: {
                allow_undertime: 0, allow_late: null, allow_night_diff: '0',
                allow_special_holiday: '0', allow_legal_holiday: '0',
            },
        }));
        const off = zeroed.container.querySelectorAll('input[type="checkbox"]');
        expect([...off].every((b) => b.checked === false)).toBe(true);
    });

    test('each schedule policy box toggles its own flag between 1 and 0', async () => {
        const view = renderInFormik(<SchedulePolicy />);
        const boxes = view.container.querySelectorAll('input[type="checkbox"]');

        await act(async () => { fireEvent.click(boxes[0]); });
        await act(async () => { fireEvent.click(boxes[1]); });
        await act(async () => { fireEvent.click(boxes[2]); });
        expect(view.values.schedule_policies).toMatchObject({
            allow_undertime: 1, allow_late: 1, allow_night_diff: 1,
        });

        const on = view.container.querySelectorAll('input[type="checkbox"]');
        await act(async () => { fireEvent.click(on[0]); });
        expect(view.values.schedule_policies.allow_undertime).toBe(0);
    });

    test('the schedule policy boxes are disabled on a read-only schedule', () => {
        const view = renderInFormik(<SchedulePolicy isDisabled />);
        const boxes = view.container.querySelectorAll('input[type="checkbox"]');
        expect(boxes[0].disabled).toBe(true);
        expect(boxes[2].disabled).toBe(true);
    });

    test('both holiday boxes toggle between 1 and 0', async () => {
        const view = renderInFormik(<ScheduleHolidayPolicy />);
        const boxes = view.container.querySelectorAll('input[type="checkbox"]');

        await act(async () => { fireEvent.click(boxes[0]); });
        await act(async () => { fireEvent.click(boxes[1]); });
        expect(view.values.schedule_policies.allow_special_holiday).toBe(1);
        expect(view.values.schedule_policies.allow_legal_holiday).toBe(1);

        const on = view.container.querySelectorAll('input[type="checkbox"]');
        await act(async () => { fireEvent.click(on[1]); });
        expect(view.values.schedule_policies.allow_legal_holiday).toBe(0);
    });

    test('"Assign to all employees" is offered only when the caller asks for it, and tags the submission with its own action', async () => {
        const withoutButton = renderInFormik(<SchedulePolicy />);
        expect(withoutButton.container.querySelector('button')).toBeNull();

        const onSubmit = jest.fn();
        const view = renderInFormik(<SchedulePolicy showAssignButton />, baseValues(), onSubmit);
        await act(async () => { fireEvent.click(view.container.querySelector('button')); });
        expect(onSubmit).toHaveBeenCalledTimes(1);
        expect(onSubmit.mock.calls[0][0].action).toBe('assign_schedule_policy');
    });

    test('the holiday "Assign to all employees" button tags the submission with the holiday action', async () => {
        const onSubmit = jest.fn();
        const view = renderInFormik(<ScheduleHolidayPolicy showAssignButton />, baseValues(), onSubmit);
        await act(async () => { fireEvent.click(view.container.querySelector('button')); });
        expect(onSubmit.mock.calls[0][0].action).toBe('assign_schedule_holiday_policy');
    });
});

describe('Schedule work days', () => {
    test('all seven days are offered and none is selected on a blank schedule', () => {
        const view = renderInFormik(<WorkDays />);
        const boxes = view.container.querySelectorAll('input[type="checkbox"]');
        expect(boxes.length).toBe(7);
        expect(view.container.textContent).toContain('Monday');
        expect(view.container.textContent).toContain('Sunday');
        expect([...boxes].every((b) => b.checked === false)).toBe(true);
    });

    test('ticking a day adds it to work_days, records its row index and appends a blank detail row', async () => {
        const view = renderInFormik(<WorkDays />);
        const boxes = view.container.querySelectorAll('input[type="checkbox"]');

        await act(async () => { fireEvent.click(boxes[0]); }); // Monday
        await act(async () => { fireEvent.click(view.container.querySelectorAll('input[type="checkbox"]')[2]); }); // Wednesday

        expect(view.values.work_days).toEqual(['mon', 'wed']);
        expect(view.values.wd.mon.index).toBe(0);
        expect(view.values.wd.wed.index).toBe(1);
        expect(view.values.cst_schedule_details.length).toBe(3); // one seeded + two added
    });

    test('unticking a day removes it from work_days and drops its detail row', async () => {
        const seeded = baseValues({
            work_days: ['mon', 'tue'],
            wd: { mon: { index: 0 }, tue: { index: 1 } },
            cst_schedule_details: [
                { ...emptyDetail(), break_time: 'MON_ROW' },
                { ...emptyDetail(), break_time: 'TUE_ROW' },
            ],
        });
        const view = renderInFormik(<WorkDays />, seeded);
        const boxes = view.container.querySelectorAll('input[type="checkbox"]');
        expect(boxes[0].checked).toBe(true);

        await act(async () => { fireEvent.click(boxes[0]); }); // untick Monday

        expect(view.values.work_days).toEqual(['tue']);
        expect(view.values.cst_schedule_details.length).toBe(1);
        expect(view.values.cst_schedule_details[0].break_time).toBe('TUE_ROW');
    });

    test('work days are disabled on a read-only schedule', () => {
        const view = renderInFormik(<WorkDays isDisabled />);
        const boxes = view.container.querySelectorAll('input[type="checkbox"]');
        expect([...boxes].every((b) => b.disabled === true)).toBe(true);
    });
});

describe('Schedule time derivation helpers used directly by the containers', () => {
    test('onSelectTimeHandlerStd writes five fields under the prefix it is given', () => {
        const setFieldValue = jest.fn();
        onSelectTimeHandlerStd(ON_DUTY, 2, setFieldValue, 'cst_');
        const paths = setFieldValue.mock.calls.map((c) => c[0]);
        expect(paths).toEqual([
            'cst_schedule_details[2].start_time',
            'cst_schedule_details[2].end_time',
            'cst_schedule_details[2].start_flexy_time',
            'cst_schedule_details[2].end_flexy_time',
            'cst_schedule_details[2].break_time',
        ]);
        expect(setFieldValue.mock.calls[0][1]).toBe(ON_DUTY);
    });

    test('onSelectTimeHandlerStd with no time clears only the start time', () => {
        const setFieldValue = jest.fn();
        onSelectTimeHandlerStd(null, 0, setFieldValue, 'std_');
        expect(setFieldValue).toHaveBeenCalledTimes(1);
        expect(setFieldValue).toHaveBeenCalledWith('std_schedule_details[0].start_time', null);
    });

    test('onSelectTimeHandlerFlexi writes only the flexi pair, nine hours apart', () => {
        const setFieldValue = jest.fn();
        onSelectTimeHandlerFlexi(ON_DUTY, 1, setFieldValue, 'cst_');
        expect(setFieldValue).toHaveBeenCalledTimes(2);
        expect(setFieldValue.mock.calls[0][1]).toBe(ON_DUTY);
        const derivedEnd = setFieldValue.mock.calls[1][1];
        expect([derivedEnd.getHours(), derivedEnd.getMinutes()]).toEqual([17, 30]);
    });

    test('onSelectTimeHandlerFlexi with no time clears only the flexi start', () => {
        const setFieldValue = jest.fn();
        onSelectTimeHandlerFlexi(null, 0, setFieldValue, 'flx_');
        expect(setFieldValue).toHaveBeenCalledTimes(1);
        expect(setFieldValue).toHaveBeenCalledWith('flx_schedule_details[0].start_flexy_time', null);
    });
});
