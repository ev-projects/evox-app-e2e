/**
 * evoxtest_AdminSyncSubmitDeep3.test.js
 *
 * SOURCES UNDER TEST:
 *   container/Admin/SyncBhrLeaves/SyncBhrLeaves.js
 *   container/Admin/SyncBiometrics/SyncBiometrics.js
 *   container/Admin/SyncUTCAdjustment/SyncUTCAdjustment.js
 *   container/Admin/SyncUserUpdates/SyncUserUpdates.js
 *
 * MENU PATHS: Admin -> Sync BHR Leaves | Sync Biometrics | Sync UTC Adjustment |
 *             Sync User Updates.
 *
 * WHY THIS SUITE EXISTS: the pre-existing AdminSync suites stub Formik with a fake whose
 * handleSubmit is a bare jest.fn(), so no sync page's onSubmitHandler has ever run and
 * the date-serialisation rules that differ between the four pages were unasserted. Here
 * Formik is REAL: the submit button is clicked and the payload the container hands to its
 * sync creator is asserted field by field. The constructor's three-way date defaulting
 * (explicit filters -> current payroll cutoff -> null) is covered on both populated and
 * empty inputs.
 *
 * All dates are supplied as local-time strings ("2026-06-01T00:00:00", no Z) so the
 * expected output is identical in every timezone; nothing here depends on today's date.
 *
 * FINDINGS: none. The differing date formats across the four pages (plain date, date +
 * " 00:00:00", and raw Date objects) are the shipped behaviour of four separate backend
 * endpoints and are pinned below as-is.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
}));

jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader: ({ children }) => <div>{children}</div>,
    Content: ({ children, title, subtitle }) => <div>{title}{subtitle}{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody: ({ children }) => <div>{children}</div>,
    Row: ({ children }) => <div>{children}</div>,
    Col: ({ children }) => <div>{children}</div>,
}));
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/Template/BackButton', () => () => <span data-testid="back-button" />);
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate: ({ name }) => <input name={name} type="date" data-testid={'date-' + name} />,
    InputTime: ({ name }) => <input name={name} type="time" />,
    InputDateTime: ({ name }) => <input name={name} type="datetime-local" />,
}));
jest.mock('../../store/actions/admin/syncActions', () => ({
    syncBhrLeaves: jest.fn(), syncBiometrics: jest.fn(),
    syncUTCAdjusetment: jest.fn(), syncBhrUsers: jest.fn(),
}));

const SyncBhrLeaves = require('../../container/Admin/SyncBhrLeaves/SyncBhrLeaves').default;
const SyncBiometrics = require('../../container/Admin/SyncBiometrics/SyncBiometrics').default;
const SyncUTCAdjustment = require('../../container/Admin/SyncUTCAdjustment/SyncUTCAdjustment').default;
const SyncUserUpdates = require('../../container/Admin/SyncUserUpdates/SyncUserUpdates').default;

const CUTOFF = {
    current_payroll_cutoff: { start_date: '2026-06-01T00:00:00', end_date: '2026-06-15T00:00:00' },
};

function renderSync(Component, props = {}) {
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter>
            <Component ref={ref} sync={{}} settings={CUTOFF} {...props} />
        </MemoryRouter>
    );
    return { ...utils, ref };
}

/** Real Formik submit: click the page's own Submit button and let validation settle. */
async function submitForm(container) {
    const button = container.querySelector('button[type="submit"]');
    await act(async () => {
        fireEvent.click(button);
        await Promise.resolve();
    });
    await act(async () => { await Promise.resolve(); });
}

beforeEach(() => jest.clearAllMocks());

describe('Admin -> Sync pages: the date range the form opens on', () => {
    test.each([
        ['Sync BHR Leaves', SyncBhrLeaves],
        ['Sync Biometrics', SyncBiometrics],
        ['Sync UTC Adjustment', SyncUTCAdjustment],
    ])('%s defaults both ends of the range to the current payroll cutoff', (_n, Component) => {
        const { ref } = renderSync(Component);
        expect(ref.current.state.filters.valid_from).toEqual(new Date('2026-06-01T00:00:00'));
        expect(ref.current.state.filters.valid_to).toEqual(new Date('2026-06-15T00:00:00'));
    });

    test.each([
        ['Sync BHR Leaves', SyncBhrLeaves],
        ['Sync Biometrics', SyncBiometrics],
        ['Sync UTC Adjustment', SyncUTCAdjustment],
    ])('%s prefers an explicit filters prop over the payroll cutoff', (_n, Component) => {
        const { ref } = renderSync(Component, {
            filters: { valid_from: '2026-07-04T00:00:00', valid_to: '2026-07-18T00:00:00' },
        });
        expect(ref.current.state.filters.valid_from).toEqual(new Date('2026-07-04T00:00:00'));
        expect(ref.current.state.filters.valid_to).toEqual(new Date('2026-07-18T00:00:00'));
    });

    test.each([
        ['Sync BHR Leaves', SyncBhrLeaves],
        ['Sync Biometrics', SyncBiometrics],
        ['Sync UTC Adjustment', SyncUTCAdjustment],
    ])('%s leaves both ends null when there is neither a filters prop nor a cutoff', (_n, Component) => {
        const { ref } = renderSync(Component, { settings: {} });
        expect(ref.current.state.filters.valid_from).toBeNull();
        expect(ref.current.state.filters.valid_to).toBeNull();
    });

    test('Sync User Updates opens on a single "changes from" date, with no end date at all', () => {
        const { ref } = renderSync(SyncUserUpdates);
        expect(ref.current.state.filters.valid_from).toEqual(new Date('2026-06-01T00:00:00'));
        expect(Object.keys(ref.current.state.filters)).toEqual(['valid_from']);
    });

    test('Sync User Updates leaves the changes-from date null when no cutoff is configured', () => {
        const { ref } = renderSync(SyncUserUpdates, { settings: {} });
        expect(ref.current.state.filters.valid_from).toBeNull();
    });
});

describe('Admin -> Sync BHR Leaves: submitting the range', () => {
    test('submitting sends both dates as plain YYYY-MM-DD', async () => {
        const syncBhrLeaves = jest.fn();
        const { container } = renderSync(SyncBhrLeaves, { syncBhrLeaves });
        await submitForm(container);
        expect(syncBhrLeaves).toHaveBeenCalledTimes(1);
        expect(syncBhrLeaves).toHaveBeenCalledWith({
            valid_from: '2026-06-01', valid_to: '2026-06-15',
        });
    });

    test('a null field is dropped from the payload while a non-date field passes through untouched', () => {
        const syncBhrLeaves = jest.fn();
        const { ref } = renderSync(SyncBhrLeaves, { syncBhrLeaves });
        ref.current.onSubmitHandler({
            valid_from: new Date('2026-06-01T00:00:00'),
            valid_to: null,
            department_id: 5,
        });
        expect(syncBhrLeaves).toHaveBeenCalledWith({ valid_from: '2026-06-01', department_id: 5 });
    });

    test('the results table appears only once the sync has returned leaves', () => {
        const { queryByRole, rerender } = renderSync(SyncBhrLeaves, { sync: { leaves: [] } });
        expect(queryByRole('table')).toBeNull();
        rerender(
            <MemoryRouter>
                <SyncBhrLeaves
                    sync={{ leaves: [{ date: '2026-06-02', employee_no: '20001', employee_name: 'Juan dela Cruz', leave_type: 'Vacation Leave', status: 'approved' }] }}
                    settings={CUTOFF}
                />
            </MemoryRouter>
        );
        const table = queryByRole('table');
        expect(table).not.toBeNull();
        expect(table.textContent).toContain('Juan dela Cruz');
        expect(table.textContent).toContain('Vacation Leave');
    });
});

describe('Admin -> Sync Biometrics: submitting the range', () => {
    // Biometrics is the one page that appends a time component: the punch table is
    // queried on a datetime column, so a bare date would exclude the first day.
    test('submitting sends both dates suffixed with 00:00:00', async () => {
        const syncBiometrics = jest.fn();
        const { container } = renderSync(SyncBiometrics, { syncBiometrics });
        await submitForm(container);
        expect(syncBiometrics).toHaveBeenCalledWith({
            valid_from: '2026-06-01 00:00:00', valid_to: '2026-06-15 00:00:00',
        });
    });

    test('a null end date is dropped rather than sent as "Invalid date 00:00:00"', () => {
        const syncBiometrics = jest.fn();
        const { ref } = renderSync(SyncBiometrics, { syncBiometrics });
        ref.current.onSubmitHandler({ valid_from: new Date('2026-06-01T00:00:00'), valid_to: null });
        expect(syncBiometrics).toHaveBeenCalledWith({ valid_from: '2026-06-01 00:00:00' });
    });

    test('the results table appears only once the sync has returned punches', () => {
        const { queryByRole, rerender } = renderSync(SyncBiometrics, { sync: { biometrics: [] } });
        expect(queryByRole('table')).toBeNull();
        rerender(
            <MemoryRouter>
                <SyncBiometrics
                    sync={{ biometrics: [{ date: '2026-06-02', time_in: '08:00', time_out: '17:00', user: { full_name: 'Juan dela Cruz', emp_num: '20001' } }] }}
                    settings={CUTOFF}
                />
            </MemoryRouter>
        );
        const table = queryByRole('table');
        expect(table).not.toBeNull();
        expect(table.textContent).toContain('Juan dela Cruz - 20001');
    });
});

describe('Admin -> Sync UTC Adjustment: submitting', () => {
    // This page's date cases are commented out in the source, so every value falls to the
    // default arm and is forwarded unconverted.
    test('values are forwarded unconverted, dates included', () => {
        const syncUTCAdjusetment = jest.fn();
        const from = new Date('2026-06-01T00:00:00');
        const { ref } = renderSync(SyncUTCAdjustment, { syncUTCAdjusetment });
        ref.current.onSubmitHandler({ valid_from: from, valid_to: null, note: 'manual run' });
        expect(syncUTCAdjusetment).toHaveBeenCalledWith({ valid_from: from, note: 'manual run' });
    });

    test('clicking Check Adjustment submits the cutoff range as Date objects', async () => {
        const syncUTCAdjusetment = jest.fn();
        const { container } = renderSync(SyncUTCAdjustment, { syncUTCAdjusetment });
        await submitForm(container);
        expect(syncUTCAdjusetment).toHaveBeenCalledTimes(1);
        const payload = syncUTCAdjusetment.mock.calls[0][0];
        expect(payload.valid_from).toEqual(new Date('2026-06-01T00:00:00'));
        expect(payload.valid_to).toEqual(new Date('2026-06-15T00:00:00'));
    });
});

describe('Admin -> Sync User Updates: submitting', () => {
    test('submitting sends the changes-from date as plain YYYY-MM-DD', async () => {
        const syncBhrUsers = jest.fn();
        const { container } = renderSync(SyncUserUpdates, { syncBhrUsers });
        await submitForm(container);
        expect(syncBhrUsers).toHaveBeenCalledWith({ valid_from: '2026-06-01' });
    });

    // Only "valid_from" has a case arm here; anything else, including a date, drops to
    // the default arm and is forwarded as-is.
    test('any field other than valid_from is forwarded unconverted', () => {
        const syncBhrUsers = jest.fn();
        const to = new Date('2026-06-15T00:00:00');
        const { ref } = renderSync(SyncUserUpdates, { syncBhrUsers });
        ref.current.onSubmitHandler({
            valid_from: new Date('2026-06-01T00:00:00'), valid_to: to, emp_num: null,
        });
        expect(syncBhrUsers).toHaveBeenCalledWith({ valid_from: '2026-06-01', valid_to: to });
    });

    test('the results table appears only once the sync has returned user changes', () => {
        const { queryByRole, rerender } = renderSync(SyncUserUpdates, { sync: { users: [] } });
        expect(queryByRole('table')).toBeNull();
        rerender(
            <MemoryRouter>
                <SyncUserUpdates
                    sync={{ users: [{ emp_num: '20001', name: 'Juan dela Cruz', action: 'Update' }] }}
                    settings={CUTOFF}
                />
            </MemoryRouter>
        );
        const table = queryByRole('table');
        expect(table).not.toBeNull();
        expect(table.textContent).toContain('Update');
    });
});
