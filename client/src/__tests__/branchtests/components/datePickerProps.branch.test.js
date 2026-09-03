/**
 * EVOX — Jest: the shared date/time picker prop defaults
 *
 * Source under test:
 *   src/components/DatePickerComponent/DatePicker.js
 *
 * Menu path: shared control — 31 screens import these inputs (Requests -> Alter Log / Overtime /
 *            Rest Day Work / Change Schedule, Schedule -> Templates, DTR -> Alter Log Punch...).
 *
 * Coverage before this file: 30 uncovered branch arms — every `props.x != undefined ? props.x :
 * false` default on InputDate, InputDateTime and InputDateTimeIndex.
 *
 * Rule asserted here (both arms of each default): a caller-supplied popper placement, time/date
 * display flag, minimum date, maximum date or read-only flag is handed straight to the underlying
 * react-datepicker; when the caller omits it, the picker is given `false` — no placement, no
 * bounds and an editable field — rather than leaving the prop undefined.
 *
 * This complements evoxtest_DatePickerComponentDeep2.test.js, which covers which variant renders;
 * nothing here duplicates it.
 */

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { Formik } from 'formik';

// Records what each rendered picker was configured with. The real react-datepicker is far too
// heavy for a props assertion and would drag in its own popper positioning.
jest.mock('react-datepicker', () => (props) => {
    global.__pickerProps.push(props);
    return <span data-testid="datepicker" />;
});

const {
    InputDate,
    InputDateTime,
    InputDateTimeIndex,
} = require('../../../components/DatePickerComponent/DatePicker.js');

const harness = (children, initialValues) => {
    const ref = React.createRef();
    const utils = render(
        <Formik innerRef={ref} initialValues={initialValues} onSubmit={jest.fn()}>
            {() => <form>{children}</form>}
        </Formik>,
    );
    return { ...utils, ref };
};

const lastPicker = () => global.__pickerProps[global.__pickerProps.length - 1];

const MIN = new Date(2026, 7, 1);
const MAX = new Date(2026, 7, 31);

const allProps = {
    popperPlacement: 'top-end',
    showTimeSelectOnly: true,
    showDateSelectOnly: true,
    minDate: MIN,
    maxDate: MAX,
    readOnly: true,
};

const expectDefaults = (picker) => {
    expect(picker.popperPlacement).toBe(false);
    expect(picker.showTimeSelectOnly).toBe(false);
    expect(picker.showDateSelectOnly).toBe(false);
    expect(picker.minDate).toBe(false);
    expect(picker.maxDate).toBe(false);
    expect(picker.readOnly).toBe(false);
};

const expectCallerValues = (picker) => {
    expect(picker.popperPlacement).toBe('top-end');
    expect(picker.showTimeSelectOnly).toBe(true);
    expect(picker.showDateSelectOnly).toBe(true);
    expect(picker.minDate).toBe(MIN);
    expect(picker.maxDate).toBe(MAX);
    expect(picker.readOnly).toBe(true);
};

beforeEach(() => {
    global.__pickerProps = [];
});

describe('InputDate — the read-only default', () => {
    test('a caller that asks for a read-only date field gets one', () => {
        harness(<InputDate name="valid_from" readOnly />, { valid_from: null });

        expect(lastPicker().readOnly).toBe(true);
    });

    test('a caller that says nothing gets an editable date field', () => {
        harness(<InputDate name="valid_from" />, { valid_from: null });

        expect(lastPicker().readOnly).toBe(false);
    });

    test('an explicit editable date field stays editable', () => {
        harness(<InputDate name="valid_from" readOnly={false} />, { valid_from: null });

        expect(lastPicker().readOnly).toBe(false);
    });
});

describe('InputDateTime — the plain variant', () => {
    test('every configuration the caller supplies reaches the picker', () => {
        harness(<InputDateTime name="start_dt" {...allProps} />, { start_dt: null });

        expectCallerValues(lastPicker());
        expect(lastPicker().dateFormat).toBe('MMMM d, yyyy HH:mm');
    });

    test('an unconfigured picker is bounded by nothing and stays editable', () => {
        harness(<InputDateTime name="start_dt" />, { start_dt: null });

        expectDefaults(lastPicker());
    });

    test('a caller can set only the bounds and leave the rest defaulted', () => {
        harness(<InputDateTime name="start_dt" minDate={MIN} maxDate={MAX} />, { start_dt: null });

        const picker = lastPicker();
        expect(picker.minDate).toBe(MIN);
        expect(picker.maxDate).toBe(MAX);
        expect(picker.popperPlacement).toBe(false);
        expect(picker.readOnly).toBe(false);
    });
});

describe('InputDateTime — the paired (contrast_too) variant', () => {
    test('every configuration the caller supplies reaches the picker', () => {
        harness(
            <InputDateTime name="start_dt" contrast_too="start_dt" offset_data={3600} {...allProps} />,
            { start_dt: null, pov_start_dt: null },
        );

        expectCallerValues(lastPicker());
        expect(lastPicker().dateFormat).toBe('MMMM d, yyyy HH:mm:ss');
    });

    test('an unconfigured paired picker is bounded by nothing and stays editable', () => {
        harness(
            <InputDateTime name="start_dt" contrast_too="start_dt" offset_data={3600} />,
            { start_dt: null, pov_start_dt: null },
        );

        expectDefaults(lastPicker());
    });
});

describe('InputDateTimeIndex — the paired (contrast_too) variant', () => {
    test('every configuration the caller supplies reaches the picker', () => {
        harness(
            <InputDateTimeIndex name="end_time" contrast_too="end_time" offset_data={3600} {...allProps} />,
            { end_time: null, pov_end_time: null },
        );

        expectCallerValues(lastPicker());
    });

    test('an unconfigured paired picker is bounded by nothing and stays editable', () => {
        harness(
            <InputDateTimeIndex name="end_time" contrast_too="end_time" offset_data={3600} />,
            { end_time: null, pov_end_time: null },
        );

        expectDefaults(lastPicker());
    });
});

describe('InputDateTimeIndex — the punch-row (indexing) variant', () => {
    test('every configuration the caller supplies reaches the picker', () => {
        harness(
            <InputDateTimeIndex name="end_time" type="indexing" indexid={0} isDisabled {...allProps} />,
            { new_punch: [{ end_time: null }] },
        );

        expectCallerValues(lastPicker());
        expect(lastPicker().disabled).toBe(true);
    });

    test('an unconfigured punch row is bounded by nothing, editable and enabled', () => {
        harness(
            <InputDateTimeIndex name="end_time" type="indexing" indexid={0} />,
            { new_punch: [{ end_time: null }] },
        );

        const picker = lastPicker();
        expectDefaults(picker);
        expect(picker.disabled).toBeUndefined();
    });
});

describe('InputDateTimeIndex — the plain variant', () => {
    test('every configuration the caller supplies reaches the picker', () => {
        harness(<InputDateTimeIndex name="plain_dt" {...allProps} />, { plain_dt: null });

        expectCallerValues(lastPicker());
    });

    test('an unconfigured picker is bounded by nothing and stays editable', () => {
        harness(<InputDateTimeIndex name="plain_dt" />, { plain_dt: null });

        expectDefaults(lastPicker());
    });
});
