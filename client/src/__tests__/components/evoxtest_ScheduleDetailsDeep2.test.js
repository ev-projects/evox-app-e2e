/**
 * evoxtest_ScheduleDetailsDeep2.test.js
 * Wave-2 coverage for components/Schedule/ScheduleDetails.js (29 Jul: 111 unc / 22.4%).
 * The file is a library of Formik-bound schedule sub-forms + exported time handlers.
 * Arms: onSelectTimeHandlerStd/Flexi (date + null), policy checkbox toggles 1↔0,
 * assign-to-all submits, WorkDays add/remove (FieldArray sync), standard + flexible
 * forms' auto-fill (+9h off-duty, 01:00 break), and the timezone variants' POV
 * offset math (std, flex and per-field arms). ADDITIVE ONLY.
 * Menu: Schedule → Template create/edit (embedded sub-forms).
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { Formik } from 'formik';

// DatePicker mock: expose onChange via set/clear buttons, label by timeCaption+index order
jest.mock('react-datepicker', () => (props) => (
    <span data-testid="datepicker">
        <button onClick={() => props.onChange && props.onChange(new Date(2026, 6, 30, 9, 0, 0))}>set</button>
        <button onClick={() => props.onChange && props.onChange(null)}>clear</button>
    </span>
));

jest.mock('../../services/Authenticator', () => ({
    scanFeature: jest.fn(() => true),
    scanLevel: jest.fn(() => true),
}));

import {
    Scheduledetails,
    ScheduledetailsWithTimezone,
    onSelectTimeHandlerStd,
    onSelectTimeHandlerFlexi,
    FlexibleSchedDetailsFormWithTimezone,
    StandardSchedDetailsForm,
    StandardSchedDetailsFormWithTimezone,
    FlexibleSchedDetailsForm,
    ScheduleHolidayPolicy,
    SchedulePolicy,
    WorkDays,
} from '../../components/Schedule/ScheduleDetails';

const detailRow = () => ({ break_time: null, start_time: null, end_time: null, start_flexy_time: null, end_flexy_time: null });

function initialValues() {
    return {
        action: '',
        schedule_policies: {
            allow_special_holiday: '1', allow_legal_holiday: '0',
            allow_undertime: '1', allow_late: '0', allow_night_diff: '1',
        },
        work_days: ['mon'],
        wd: { mon: { index: 0 } },
        cst_schedule_details: [detailRow()],
        std_schedule_details: [detailRow()],
        flx_schedule_details: [detailRow()],
        pov_schedule_details: [{}],
    };
}

function renderInFormik(children, onSubmit = jest.fn()) {
    const ref = React.createRef();
    const utils = render(
        <Formik innerRef={ref} initialValues={initialValues()} onSubmit={onSubmit}>
            {() => <form>{children}</form>}
        </Formik>
    );
    return { ...utils, ref, onSubmit };
}

describe('time handler units', () => {
    test('onSelectTimeHandlerStd autofills on/off duty (+9h), flexy sync and 01:00 break', () => {
        const setFieldValue = jest.fn();
        onSelectTimeHandlerStd(new Date(2026, 6, 30, 9, 30), 0, setFieldValue, 'std_');

        const calls = Object.fromEntries(setFieldValue.mock.calls.map((c) => [c[0], c[1]]));
        expect(calls['std_schedule_details[0].start_time'].getHours()).toBe(9);
        expect(calls['std_schedule_details[0].end_time'].getHours()).toBe(18); // +9h
        expect(calls['std_schedule_details[0].end_time'].getMinutes()).toBe(30);
        expect(calls['std_schedule_details[0].break_time'].getHours()).toBe(1);
        expect(calls['std_schedule_details[0].start_flexy_time'].getHours()).toBe(9);
    });

    test('onSelectTimeHandlerStd null clears only start_time', () => {
        const setFieldValue = jest.fn();
        onSelectTimeHandlerStd(null, 2, setFieldValue, 'cst_');
        expect(setFieldValue).toHaveBeenCalledTimes(1);
        expect(setFieldValue).toHaveBeenCalledWith('cst_schedule_details[2].start_time', null);
    });

    test('onSelectTimeHandlerFlexi sets flexy start and +9h flexy end; null arm clears', () => {
        const setFieldValue = jest.fn();
        onSelectTimeHandlerFlexi(new Date(2026, 6, 30, 10, 0), 0, setFieldValue, 'flx_');
        const calls = Object.fromEntries(setFieldValue.mock.calls.map((c) => [c[0], c[1]]));
        // paths written without the dot — lodash toPath still resolves them identically
        expect(calls['flx_schedule_details[0]start_flexy_time'].getHours()).toBe(10);
        expect(calls['flx_schedule_details[0]end_flexy_time'].getHours()).toBe(19);

        setFieldValue.mockClear();
        onSelectTimeHandlerFlexi(null, 0, setFieldValue, 'flx_');
        expect(setFieldValue).toHaveBeenCalledWith('flx_schedule_details[0].start_flexy_time', null);
    });
});

describe('policy checkboxes and assign buttons', () => {
    test('SchedulePolicy toggles undertime/late/night-diff between 1 and 0', () => {
        const { ref, getByLabelText } = renderInFormik(<SchedulePolicy isDisabled={false} showAssignButton={false} />);

        fireEvent.click(getByLabelText(/Undertime/));
        expect(ref.current.values.schedule_policies.allow_undertime).toBe(0); // was '1'
        fireEvent.click(getByLabelText(/Tardiness/));
        expect(ref.current.values.schedule_policies.allow_late).toBe(1); // was '0'
        fireEvent.click(getByLabelText(/Night Differential/));
        expect(ref.current.values.schedule_policies.allow_night_diff).toBe(0);
    });

    test('SchedulePolicy assign button sets the action and submits', async () => {
        const onSubmit = jest.fn();
        const { getByText } = renderInFormik(<SchedulePolicy isDisabled={false} showAssignButton={true} />, onSubmit);
        fireEvent.click(getByText(/Assign to all employees/));
        await new Promise((r) => setTimeout(r, 0)); // Formik handleSubmit validates async
        expect(onSubmit).toHaveBeenCalled();
        expect(onSubmit.mock.calls[0][0].action).toBe('assign_schedule_policy');
    });

    test('ScheduleHolidayPolicy toggles special/legal holiday and submits assign action', async () => {
        const onSubmit = jest.fn();
        const { ref, getByLabelText, getByText } = renderInFormik(
            <ScheduleHolidayPolicy isDisabled={false} showAssignButton={true} />, onSubmit
        );

        fireEvent.click(getByLabelText(/Special Holiday/));
        expect(ref.current.values.schedule_policies.allow_special_holiday).toBe(0);
        fireEvent.click(getByLabelText(/Legal Holiday/));
        expect(ref.current.values.schedule_policies.allow_legal_holiday).toBe(1);

        fireEvent.click(getByText(/Assign to all employees/));
        await new Promise((r) => setTimeout(r, 0));
        expect(onSubmit.mock.calls[0][0].action).toBe('assign_schedule_holiday_policy');
    });
});

describe('WorkDays FieldArray sync', () => {
    test('checking a day adds it and pushes an empty detail row; unchecking removes both', () => {
        const { ref, getByLabelText } = renderInFormik(<WorkDays isDisabled={false} />);

        fireEvent.click(getByLabelText(/Tuesday/));
        expect(ref.current.values.work_days).toEqual(['mon', 'tue']);
        expect(ref.current.values.cst_schedule_details.length).toBe(2);
        expect(ref.current.values.wd.tue.index).toBe(1);

        fireEvent.click(getByLabelText(/Monday/)); // remove via wd.mon.index
        expect(ref.current.values.work_days).toEqual(['tue']);
        expect(ref.current.values.cst_schedule_details.length).toBe(1);
    });
});

describe('schedule detail forms', () => {
    test('StandardSchedDetailsForm On-Duty pick autofills the std row', () => {
        const { ref, getAllByText } = renderInFormik(<StandardSchedDetailsForm />);
        fireEvent.click(getAllByText('set')[0]); // first DatePicker = On Duty
        const row = ref.current.values.std_schedule_details[0];
        expect(row.start_time.getHours()).toBe(9);
        expect(row.end_time.getHours()).toBe(18);
        expect(row.break_time.getHours()).toBe(1);
    });

    test('FlexibleSchedDetailsForm covers std pick, flexi pick and direct field sets', () => {
        const { ref, getAllByText } = renderInFormik(<FlexibleSchedDetailsForm />);
        const sets = getAllByText('set'); // OnDuty, OffDuty, FlexiStart, FlexiEnd, Break

        fireEvent.click(sets[0]); // On Duty → autofill
        expect(ref.current.values.flx_schedule_details[0].start_time.getHours()).toBe(9);
        fireEvent.click(sets[1]); // Off Duty direct set
        fireEvent.click(sets[2]); // Flexi Start → flexi handler
        expect(ref.current.values.flx_schedule_details[0].start_flexy_time.getHours()).toBe(9);
        fireEvent.click(sets[3]); // Flexi End direct
        fireEvent.click(sets[4]); // Break direct
        expect(ref.current.values.flx_schedule_details[0].break_time).not.toBeNull();
    });

    test('Scheduledetails (custom day row) picks all five fields', () => {
        const { ref, getAllByText, getByText } = renderInFormik(<Scheduledetails day="mon" index={0} />);
        getByText('Monday :');
        const sets = getAllByText('set');
        sets.forEach((btn) => fireEvent.click(btn));
        const row = ref.current.values.cst_schedule_details[0];
        expect(row.start_time.getHours()).toBe(9);
        expect(row.end_time).not.toBeNull();
        expect(row.break_time).not.toBeNull();
    });
});

describe('timezone (POV) variants', () => {
    const HOUR = 3600; // offset_data is in seconds

    test('StandardSchedDetailsFormWithTimezone syncs POV fields with the offset', () => {
        const { ref, getAllByText, getByText } = renderInFormik(
            <StandardSchedDetailsFormWithTimezone offset_data={2 * HOUR} open_contrast={true} pov_timezone_info="IST" />
        );
        getByText(/On Duty - IST/);
        fireEvent.click(getAllByText('set')[0]); // On Duty

        expect(ref.current.values.std_schedule_details[0].start_time.getHours()).toBe(9);
        expect(ref.current.values.pov_schedule_details[0].start_time.getHours()).toBe(11); // +2h offset
        expect(ref.current.values.pov_schedule_details[0].end_time.getHours()).toBe(20);   // +2h +9h
    });

    test('FlexibleSchedDetailsFormWithTimezone flexi pick uses the is_flex POV arm', () => {
        const { ref, getAllByText } = renderInFormik(
            <FlexibleSchedDetailsFormWithTimezone offset_data={HOUR} open_contrast={true} pov_timezone_info="SGT" isDisabled={false} />
        );
        const sets = getAllByText('set');
        fireEvent.click(sets[2]); // Flexi Start → is_flex=true arm
        expect(ref.current.values.pov_schedule_details[0].start_flexy_time.getHours()).toBe(10); // 9 + 1h offset
        expect(ref.current.values.pov_schedule_details[0].end_flexy_time.getHours()).toBe(19);   // +9h
    });

    test('ScheduledetailsWithTimezone end-time pick syncs the POV end_time field', () => {
        const { ref, getAllByText } = renderInFormik(
            <ScheduledetailsWithTimezone day="tue" index={0} offset_data={HOUR} open_contrast={true} show_pov={true} pov_timezone_info="SGT" />
        );
        const sets = getAllByText('set'); // OnDuty, OffDuty, FlexiStart, FlexiEnd, Break (+POV readOnly ones have no onChange)
        fireEvent.click(sets[1]); // Off Duty → onSelectTimeHandlerSchedule('end_time')
        expect(ref.current.values.cst_schedule_details[0].end_time.getHours()).toBe(9);
        expect(ref.current.values.pov_schedule_details[0].end_time.getHours()).toBe(10); // +1h offset
    });
});
