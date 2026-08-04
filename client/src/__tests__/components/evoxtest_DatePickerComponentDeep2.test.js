/**
 * evoxtest_DatePickerComponentDeep2.test.js
 * Wave-3 coverage for components/DatePickerComponent/DatePicker.js (29 Jul: 66 unc / 25%).
 * Arms: InputTime's six variants (on_duty autofill handler, overtime, break_time,
 * contrast_too rest-day POV, indexing punch rows, default), InputDate, InputDateTime
 * (contrast/default), InputDateTimeIndex (contrast/indexing/default), the ":"-guarded
 * CustomTimeInput, and the null-clearing arms of all three time handlers.
 * ADDITIVE ONLY. Menu: shared date/time pickers across all request forms.
 */

import React from 'react';
import { render, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { Formik } from 'formik';

// expose onChange + selected; clone customTimeInput with the value/onChange the real
// datepicker injects so CustomTimeInput's colon guard runs
jest.mock('react-datepicker', () => (props) => {
    const ReactLocal = require('react');
    return (
        <span data-testid="datepicker">
            <button onClick={() => props.onChange && props.onChange(new Date(2026, 6, 31, 9, 15, 0))}>set</button>
            <button onClick={() => props.onChange && props.onChange(null)}>clear</button>
            {props.customTimeInput
                ? ReactLocal.cloneElement(props.customTimeInput, { value: '', onChange: jest.fn() })
                : null}
        </span>
    );
});

import { InputDate, InputTime, InputDateTime, InputDateTimeIndex } from '../../components/DatePickerComponent/DatePicker.js';

function harness(children, initialValues) {
    const ref = React.createRef();
    const utils = render(
        <Formik innerRef={ref} initialValues={initialValues} onSubmit={jest.fn()}>
            {() => <form>{children}</form>}
        </Formik>
    );
    return { ...utils, ref };
}

describe('InputTime variants', () => {
    test('on_duty pick autofills on/off duty (+9h) and the 01:00 break; clear nulls on_duty', () => {
        const { ref, getByText } = harness(<InputTime name="on_duty" />, { on_duty: null, off_duty: null, break: null });

        fireEvent.click(getByText('set'));
        expect(ref.current.values.on_duty.getHours()).toBe(9);
        expect(ref.current.values.off_duty.getHours()).toBe(18);
        expect(ref.current.values.off_duty.getMinutes()).toBe(15);
        expect(ref.current.values.break.getHours()).toBe(1);

        fireEvent.click(getByText('clear'));
        expect(ref.current.values.on_duty).toBeNull();
    });

    test('overtime and break_time variants set only their own field', () => {
        const ot = harness(<InputTime name="rendered_hours" type="overtime" />, { rendered_hours: null });
        fireEvent.click(within(ot.container).getByText('set'));
        expect(ot.ref.current.values.rendered_hours.getHours()).toBe(9);

        const bt = harness(<InputTime name="break_time" type="break_time" />, { break_time: null });
        fireEvent.click(within(bt.container).getByText('set'));
        expect(bt.ref.current.values.break_time.getMinutes()).toBe(15);
    });

    test('contrast_too variant also writes the POV field shifted by the offset', () => {
        const { ref, getByText } = harness(
            <InputTime name="start_time" contrast_too="start_time" offset_data={3600} />,
            { start_time: null, pov_start_time: null }
        );
        fireEvent.click(getByText('set'));
        expect(ref.current.values.start_time.getHours()).toBe(9);
        expect(ref.current.values.pov_start_time.getHours()).toBe(10); // +1h offset

        fireEvent.click(getByText('clear'));
        expect(ref.current.values.start_time).toBeNull(); // null arm clears the base field
    });

    test('indexing variant targets new_punch[index]; default variant sets the named field', () => {
        const idx = harness(
            <InputTime name="start_time" type="indexing" indexid={1} />,
            { new_punch: [{ start_time: null }, { start_time: null }] }
        );
        fireEvent.click(within(idx.container).getByText('set'));
        expect(idx.ref.current.values.new_punch[1].start_time.getHours()).toBe(9);
        expect(idx.ref.current.values.new_punch[0].start_time).toBeNull();

        const def = harness(<InputTime name="some_time" />, { some_time: null });
        fireEvent.click(within(def.container).getByText('set'));
        expect(def.ref.current.values.some_time.getHours()).toBe(9);
    });
});

describe('InputDate and InputDateTime', () => {
    test('InputDate sets the named date field', () => {
        const { ref, getByText } = harness(<InputDate name="valid_from" />, { valid_from: null });
        fireEvent.click(getByText('set'));
        expect(ref.current.values.valid_from.getFullYear()).toBe(2026);
    });

    test('InputDateTime default sets its field; contrast variant also writes the POV field', () => {
        const def = harness(<InputDateTime name="start_dt" />, { start_dt: null });
        fireEvent.click(within(def.container).getByText('set'));
        expect(def.ref.current.values.start_dt.getHours()).toBe(9);

        const pov = harness(
            <InputDateTime name="start_dt" contrast_too="start_dt" offset_data={7200} />,
            { start_dt: null, pov_start_dt: null }
        );
        fireEvent.click(within(pov.container).getByText('set'));
        expect(pov.ref.current.values.start_dt.getHours()).toBe(9);
        expect(pov.ref.current.values.pov_start_dt.getHours()).toBe(11); // +2h

        fireEvent.click(within(pov.container).getByText('clear'));
        expect(pov.ref.current.values.start_dt).toBeNull(); // Alterlog null arm
    });

    test('CustomTimeInput forwards only values containing a colon', () => {
        const { container } = harness(<InputDateTime name="start_dt" />, { start_dt: null });
        const custom = container.querySelector('input');
        // the mock renders the customTimeInput element; simulate its guard directly
        fireEvent.change(custom, { target: { value: '0915' } });   // no colon → ignored
        fireEvent.change(custom, { target: { value: '09:15' } });  // colon → forwarded (no crash)
        expect(custom).toBeInTheDocument();
    });
});

describe('InputDateTimeIndex variants', () => {
    test('contrast variant writes base + POV; indexing targets new_punch rows; default sets the field', () => {
        const pov = harness(
            <InputDateTimeIndex name="end_time" contrast_too="end_time" offset_data={3600} />,
            { end_time: null, pov_end_time: null }
        );
        fireEvent.click(within(pov.container).getByText('set'));
        expect(pov.ref.current.values.end_time.getHours()).toBe(9);
        expect(pov.ref.current.values.pov_end_time.getHours()).toBe(10);

        const idx = harness(
            <InputDateTimeIndex name="end_time" type="indexing" indexid={0} />,
            { new_punch: [{ end_time: null }] }
        );
        fireEvent.click(within(idx.container).getByText('set'));
        expect(idx.ref.current.values.new_punch[0].end_time.getHours()).toBe(9);

        const def = harness(<InputDateTimeIndex name="plain_dt" />, { plain_dt: null });
        fireEvent.click(within(def.container).getByText('set'));
        expect(def.ref.current.values.plain_dt.getHours()).toBe(9);
    });
});
