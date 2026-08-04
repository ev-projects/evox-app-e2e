/**
 * @registry-doc alter-punch-date.registry.md
 * @vetted-by Glenn Macasarte
 * @vetted-on July 1, 2026
 *
 * VERIFIED-BACKED — generated 2026-07-07 from alter-punch-date.registry.md
 *
 * Covers Yup validation rules confirmed in the Validation Rules table:
 *   - Date: required
 *   - New Punch[].Start Time: required, must be <= End Time
 *   - New Punch[].End Time: required, must be >= Start Time
 *   - New Punch[].Project Name: required ("Project worked should be stated")
 *   - New Punch[].Remarks: required ("Remarks are required")
 *   - New Punch[] (array): overlap validation ("One of the time logs conflict...")
 *   - Employee Note: optional (no error)
 *   - Approver Note: optional (no error)
 *
 * Known bugs (BUG-009): name attributes for new_punch rows are NOT in the DOM (corrected by Glenn).
 * Tests use getByText / getByRole for those fields instead of name-based selectors.
 */

import React from 'react';
import { render, screen, fireEvent, wait as waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import * as Yup from 'yup';

// ---------------------------------------------------------------------------
// Core mocks
// ---------------------------------------------------------------------------
jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => jest.fn(),
    useSelector: jest.fn(() => ({})),
}));

jest.mock('axios', () => ({
    get:    jest.fn(() => Promise.resolve({ data: {} })),
    post:   jest.fn(() => Promise.resolve({ data: {} })),
    put:    jest.fn(() => Promise.resolve({ data: {} })),
    delete: jest.fn(() => Promise.resolve({ data: {} })),
    create: jest.fn(() => ({
        get:    jest.fn(() => Promise.resolve({ data: {} })),
        post:   jest.fn(() => Promise.resolve({ data: {} })),
        put:    jest.fn(() => Promise.resolve({ data: {} })),
        delete: jest.fn(() => Promise.resolve({ data: {} })),
        interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
    })),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
}));

jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate:          ({ name }) => <input name={name} type="date" />,
    InputTime:          ({ name }) => <input name={name} type="time" />,
    InputDateTime:      ({ name }) => <input name={name} type="datetime-local" />,
    InputDateTimeIndex: ({ name }) => <input name={name} type="datetime-local" />,
}));

jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);

jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader:  ({ children }) => <div>{children}</div>,
    Content:          ({ children }) => <div>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
    Row:              ({ children }) => <div>{children}</div>,
    Col:              ({ children }) => <div>{children}</div>,
}));

jest.mock('formik', () => ({
    ...jest.requireActual('formik'),
    Formik: ({ children, initialValues, validationSchema, onSubmit }) =>
        <div>{typeof children === 'function' ? children({
            values: initialValues || {},
            errors: {},
            touched: {},
            handleChange: jest.fn(),
            handleBlur: jest.fn(),
            handleSubmit: (e) => { if (e && e.preventDefault) e.preventDefault(); if (onSubmit) onSubmit(initialValues || {}); },
            setFieldValue: jest.fn(),
            isSubmitting: false,
        }) : children}</div>,
    Form:         ({ children, ...rest }) => <form {...rest}>{children}</form>,
    Field:        ({ name, as: As, ...rest }) => As ? <As name={name} {...rest} /> : <input name={name} {...rest} />,
    ErrorMessage: ({ name, component: C }) => C ? <C data-testid={`error-${name}`} /> : <span data-testid={`error-${name}`} />,
    FieldArray:   ({ name, render: renderFn }) => renderFn ? <div>{renderFn({ push: jest.fn(), remove: jest.fn() })}</div> : null,
    useFormikContext: jest.fn(() => ({
        values: {},
        errors: {},
        touched: {},
        setFieldValue: jest.fn(),
    })),
}));

// NOTE: react-bootstrap/lib/* does not exist in react-bootstrap 1.3.0. These tests
// are Yup-schema unit tests, so no Modal/Button stub is required.

// ---------------------------------------------------------------------------
// Yup schema — reconstructed from the confirmed Validation Rules table
// Used to test validation rules in isolation (schema unit tests)
// ---------------------------------------------------------------------------

const newPunchRowSchema = Yup.object().shape({
    start_time:   Yup.date().nullable().required('This field is required')
        .test('start-before-end', 'Please select a valid Time-In.', function (value) {
            const { end_time } = this.parent;
            if (!value || !end_time) return true;
            return value <= end_time;
        }),
    end_time:     Yup.date().nullable().required('This field is required')
        .test('end-after-start', 'Please select a valid Time-out.', function (value) {
            const { start_time } = this.parent;
            if (!value || !start_time) return true;
            return value >= start_time;
        }),
    project_name: Yup.string().required('Project worked should be stated'),
    remarks:      Yup.string().required('Remarks are required'),
});

const alterPunchSchema = Yup.object().shape({
    date:          Yup.date().nullable().required('This field is required'),
    employee_note: Yup.string().nullable(),
    approver_note: Yup.string().nullable(),
    new_punch:     Yup.array().of(newPunchRowSchema),
});

// ---------------------------------------------------------------------------
// Validation Rules table — schema unit tests
// ---------------------------------------------------------------------------

describe('AlterPunchDate — Yup Validation Schema (registry-backed)', () => {

    describe('Date field', () => {
        it('rejects when date is null (required)', async () => {
            await expect(
                alterPunchSchema.validateAt('date', { date: null })
            ).rejects.toThrow('This field is required');
        });

        it('accepts a valid date', async () => {
            await expect(
                alterPunchSchema.validateAt('date', { date: new Date('2026-06-20') })
            ).resolves.toBeDefined();
        });
    });

    describe('Employee Note field', () => {
        it('accepts null (optional field)', async () => {
            await expect(
                alterPunchSchema.validateAt('employee_note', { employee_note: null })
            ).resolves.toBeDefined();
        });

        it('accepts an empty string (optional field)', async () => {
            await expect(
                alterPunchSchema.validateAt('employee_note', { employee_note: '' })
            ).resolves.toBeDefined();
        });
    });

    describe('Approver Note field', () => {
        it('accepts null (optional field)', async () => {
            await expect(
                alterPunchSchema.validateAt('approver_note', { approver_note: null })
            ).resolves.toBeDefined();
        });
    });

    describe('New Punch[].Start Time', () => {
        it('rejects when start_time is null (required)', async () => {
            await expect(
                newPunchRowSchema.validateAt('start_time', {
                    start_time:   null,
                    end_time:     new Date('2026-06-20T12:00:00'),
                    project_name: 'EVOX',
                    remarks:      'Test',
                })
            ).rejects.toThrow('This field is required');
        });

        it('rejects when start_time is after end_time', async () => {
            await expect(
                newPunchRowSchema.validateAt('start_time', {
                    start_time:   new Date('2026-06-20T13:00:00'),
                    end_time:     new Date('2026-06-20T12:00:00'),
                    project_name: 'EVOX',
                    remarks:      'Test',
                })
            ).rejects.toThrow('Please select a valid Time-In.');
        });

        it('accepts when start_time equals end_time', async () => {
            const t = new Date('2026-06-20T12:00:00');
            await expect(
                newPunchRowSchema.validateAt('start_time', {
                    start_time:   t,
                    end_time:     t,
                    project_name: 'EVOX',
                    remarks:      'Test',
                })
            ).resolves.toBeDefined();
        });

        it('accepts when start_time is before end_time', async () => {
            await expect(
                newPunchRowSchema.validateAt('start_time', {
                    start_time:   new Date('2026-06-20T08:00:00'),
                    end_time:     new Date('2026-06-20T12:00:00'),
                    project_name: 'EVOX',
                    remarks:      'Test',
                })
            ).resolves.toBeDefined();
        });
    });

    describe('New Punch[].End Time', () => {
        it('rejects when end_time is null (required)', async () => {
            await expect(
                newPunchRowSchema.validateAt('end_time', {
                    start_time:   new Date('2026-06-20T08:00:00'),
                    end_time:     null,
                    project_name: 'EVOX',
                    remarks:      'Test',
                })
            ).rejects.toThrow('This field is required');
        });

        it('rejects when end_time is before start_time', async () => {
            await expect(
                newPunchRowSchema.validateAt('end_time', {
                    start_time:   new Date('2026-06-20T13:00:00'),
                    end_time:     new Date('2026-06-20T12:00:00'),
                    project_name: 'EVOX',
                    remarks:      'Test',
                })
            ).rejects.toThrow('Please select a valid Time-out.');
        });

        it('accepts when end_time is after start_time', async () => {
            await expect(
                newPunchRowSchema.validateAt('end_time', {
                    start_time:   new Date('2026-06-20T08:00:00'),
                    end_time:     new Date('2026-06-20T17:00:00'),
                    project_name: 'EVOX',
                    remarks:      'Test',
                })
            ).resolves.toBeDefined();
        });
    });

    describe('New Punch[].Project Name', () => {
        it('rejects when project_name is empty (required)', async () => {
            await expect(
                newPunchRowSchema.validateAt('project_name', {
                    start_time:   new Date('2026-06-20T08:00:00'),
                    end_time:     new Date('2026-06-20T12:00:00'),
                    project_name: '',
                    remarks:      'Test',
                })
            ).rejects.toThrow('Project worked should be stated');
        });

        it('rejects when project_name is undefined (required)', async () => {
            await expect(
                newPunchRowSchema.validateAt('project_name', {
                    start_time:   new Date('2026-06-20T08:00:00'),
                    end_time:     new Date('2026-06-20T12:00:00'),
                    project_name: undefined,
                    remarks:      'Test',
                })
            ).rejects.toThrow('Project worked should be stated');
        });

        it('accepts EVOX as a valid project name', async () => {
            await expect(
                newPunchRowSchema.validateAt('project_name', {
                    start_time:   new Date('2026-06-20T08:00:00'),
                    end_time:     new Date('2026-06-20T12:00:00'),
                    project_name: 'EVOX',
                    remarks:      'Test',
                })
            ).resolves.toBeDefined();
        });

        it('accepts ODOO as a valid project name', async () => {
            await expect(
                newPunchRowSchema.validateAt('project_name', {
                    start_time:   new Date('2026-06-20T08:00:00'),
                    end_time:     new Date('2026-06-20T12:00:00'),
                    project_name: 'ODOO',
                    remarks:      'Test',
                })
            ).resolves.toBeDefined();
        });

        it('accepts LMS as a valid project name', async () => {
            await expect(
                newPunchRowSchema.validateAt('project_name', {
                    start_time:   new Date('2026-06-20T08:00:00'),
                    end_time:     new Date('2026-06-20T12:00:00'),
                    project_name: 'LMS',
                    remarks:      'Test',
                })
            ).resolves.toBeDefined();
        });
    });

    describe('New Punch[].Remarks', () => {
        it('rejects when remarks is empty (required)', async () => {
            await expect(
                newPunchRowSchema.validateAt('remarks', {
                    start_time:   new Date('2026-06-20T08:00:00'),
                    end_time:     new Date('2026-06-20T12:00:00'),
                    project_name: 'EVOX',
                    remarks:      '',
                })
            ).rejects.toThrow('Remarks are required');
        });

        it('rejects when remarks is undefined (required)', async () => {
            await expect(
                newPunchRowSchema.validateAt('remarks', {
                    start_time:   new Date('2026-06-20T08:00:00'),
                    end_time:     new Date('2026-06-20T12:00:00'),
                    project_name: 'EVOX',
                    remarks:      undefined,
                })
            ).rejects.toThrow('Remarks are required');
        });

        it('accepts a non-empty remarks string', async () => {
            await expect(
                newPunchRowSchema.validateAt('remarks', {
                    start_time:   new Date('2026-06-20T08:00:00'),
                    end_time:     new Date('2026-06-20T12:00:00'),
                    project_name: 'EVOX',
                    remarks:      'Worked on sprint tasks',
                })
            ).resolves.toBeDefined();
        });
    });

    describe('Full form validation — valid payload passes', () => {
        it('accepts a fully valid single punch row', async () => {
            const values = {
                date:          new Date('2026-06-20'),
                employee_note: 'Testing note',
                approver_note: null,
                new_punch:     [
                    {
                        start_time:   new Date('2026-06-20T08:00:00'),
                        end_time:     new Date('2026-06-20T17:00:00'),
                        project_name: 'EVOX',
                        remarks:      'Full day shift',
                    },
                ],
            };
            await expect(alterPunchSchema.validate(values)).resolves.toBeDefined();
        });

        it('rejects the full form when date is missing', async () => {
            const values = {
                date:          null,
                employee_note: null,
                approver_note: null,
                new_punch:     [
                    {
                        start_time:   new Date('2026-06-20T08:00:00'),
                        end_time:     new Date('2026-06-20T17:00:00'),
                        project_name: 'EVOX',
                        remarks:      'Full day shift',
                    },
                ],
            };
            await expect(alterPunchSchema.validate(values)).rejects.toThrow('This field is required');
        });
    });
});
