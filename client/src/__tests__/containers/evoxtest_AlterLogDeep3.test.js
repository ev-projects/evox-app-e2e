/**
 * evoxtest_AlterLogDeep3.test.js
 * Source under test: src/container/Request/AlterLog/AlterLog.js
 * Menu: Requests -> Log Alteration (route alter_log/:id?)
 *
 * Wave-6 residue after evoxtest_AlterLogDeep2: 10 uncovered functions (the whole store
 * wiring) / 16 uncovered branch arms (the pre-fill fallback chain for the four time fields
 * and their supervisor-perspective twins, plus the owner offset).
 *
 * The pre-fill chain is a genuine rule: a saved request wins over the row the user clicked
 * on the DTR page, that row wins over the bare date, and with none of them the field is
 * blank. Both ends of every link are asserted here.
 *
 * ADDITIVE ONLY — no existing test, mock or app file is touched.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: (mapStateToProps, mapDispatchToProps) => (Component) => {
        Component.__mapStateToProps = mapStateToProps;
        Component.__mapDispatchToProps = mapDispatchToProps;
        return Component;
    },
}));

jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader:  ({ children }) => <div>{children}</div>,
    Content:          ({ children }) => <div>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
    Row:              ({ children }) => <div>{children}</div>,
    Col:              ({ children }) => <div>{children}</div>,
}));
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/RequestComponent/RequestButtons/RequestButtons', () => () => <div data-testid="request-buttons" />);
jest.mock('../../components/RequestComponent/RequestButtons/RequestSubtitle', () => () => <div />);
jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading" />);
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate: ({ name }) => <input type="date" name={name} />,
    InputTime: ({ name }) => <input type="time" name={name} />,
    InputDateTime: ({ name, value, offset_data }) => (
        <input
            data-testid={`field-${name}`}
            data-offset={String(offset_data)}
            data-value={value === null ? 'null' : (value instanceof Date ? value.toISOString() : String(value))}
            readOnly
        />
    ),
}));
jest.mock('react-select', () => () => <select />);
jest.mock('../../services/DateFormatter', () => ({
    add_day_to_datetime: jest.fn((d) => d),
    // stands in for "the shift's default hour on that day"
    get_specific_datetime: jest.fn(() => new Date(Date.UTC(2026, 6, 20, 1, 0, 0))),
}));
jest.mock('../../services/Authenticator', () => ({
    scanLevel: jest.fn(() => true), scanFeature: jest.fn(() => true), check: jest.fn(() => true),
}));
jest.mock('../../services/API', () => ({ call: jest.fn(() => Promise.resolve({ status: 200, data: {} })) }));
jest.mock('../../store/actions/requests/alterLogActions', () => ({
    fetchAlterLog:         jest.fn((id) => ({ type: 'AL_FETCH', id })),
    addAlterLog:           jest.fn((d) => ({ type: 'AL_ADD', d })),
    updateAlterLog:        jest.fn((id, d) => ({ type: 'AL_UPDATE', id, d })),
    updateAlterLogStatus:  jest.fn((id, d, s) => ({ type: 'AL_STATUS', id, d, s })),
    resetAlterLogInstance: jest.fn(() => ({ type: 'AL_RESET' })),
    clearAlterLogInstance: jest.fn(() => ({ type: 'AL_CLEAR' })),
}));
jest.mock('../../store/actions/dashboard/dashboardActions', () => ({
    getMyDtrNotifications: jest.fn(() => ({ type: 'DTR_NOTIF' })),
}));
jest.mock('../../store/actions/redirectActions', () => ({
    setRedirect: jest.fn((l) => ({ type: 'REDIRECT', l })),
}));

const AlterLog = require('../../container/Request/AlterLog/AlterLog').default;
const alterLogActions = require('../../store/actions/requests/alterLogActions');
const dashboardActions = require('../../store/actions/dashboard/dashboardActions');
const redirectActions = require('../../store/actions/redirectActions');
const DateFormatter = require('../../services/DateFormatter');

function makeActions() {
    return {
        fetchAlterLog: jest.fn(), addAlterLog: jest.fn(), updateAlterLog: jest.fn(),
        updateAlterLogStatus: jest.fn(), setRedirect: jest.fn(), resetAlterLogInstance: jest.fn(),
        clearAlterLogInstance: jest.fn(), getMyDtrNotifications: jest.fn(() => Promise.resolve()),
        dispatch: jest.fn(),
    };
}

const baseProps = {
    constant: {},
    user: { id: 42, user_offset_seconds: 0, pov_timezone: '08:00' },
    instance: {},
    isInstanceLoaded: false,
    settings: { current_payroll_cutoff: { start_date: '2026-07-16', end_date: '2026-08-15' } },
    params: {},
    location: {},
};

function renderAL(props = {}, actions = makeActions()) {
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter>
            <AlterLog ref={ref} {...baseProps} {...actions} {...props} />
        </MemoryRouter>
    );
    return { ...utils, ref, actions };
}

// scoped to the render's own container: several renders can share the document in one test
const fieldOf = (utils, name) => utils.container.querySelector(`[data-testid="field-${name}"]`);
const valueOf = (utils, name) => fieldOf(utils, name).getAttribute('data-value');

beforeEach(() => jest.clearAllMocks());

describe('AlterLog — how the form pre-fills the four time fields', () => {
    test('the DTR row the user clicked supplies both current times and seeds both new times', () => {
        const utils = renderAL({
            location: {
                date: '2026-07-20',
                current_time_in: '2026-07-20 09:00:00',
                current_time_out: '2026-07-20 18:00:00',
            },
        });

        expect(valueOf(utils, 'current_time_in')).toBe(new Date('2026-07-20 09:00:00').toISOString());
        expect(valueOf(utils, 'current_time_out')).toBe(new Date('2026-07-20 18:00:00').toISOString());
        // new_* start as a copy of the current punches so the user only edits what changed
        expect(valueOf(utils, 'new_time_in')).toBe(new Date('2026-07-20 09:00:00').toISOString());
        expect(valueOf(utils, 'new_time_out')).toBe(new Date('2026-07-20 18:00:00').toISOString());
    });

    test('a date with no punches leaves the current times blank and seeds the new times from the shift', () => {
        const utils = renderAL({ location: { date: '2026-07-20' } });

        expect(valueOf(utils, 'current_time_in')).toBe('null');
        expect(valueOf(utils, 'current_time_out')).toBe('null');
        expect(valueOf(utils, 'new_time_in')).toBe(new Date(Date.UTC(2026, 6, 20, 1, 0, 0)).toISOString());
        expect(valueOf(utils, 'new_time_out')).toBe(new Date(Date.UTC(2026, 6, 20, 1, 0, 0)).toISOString());
        expect(DateFormatter.get_specific_datetime).toHaveBeenCalled();
    });

    test('with neither a saved request nor route state the form is not shown at all', () => {
        const utils = renderAL({ location: {} });
        utils.getByTestId('page-loading');
    });

    test('a saved request overrides the route state on every field and carries its offset', () => {
        const utils = renderAL({
            params: { id: '9' },
            isInstanceLoaded: true,
            instance: {
                id: 9, date: '2026-07-20', user_id: 42, offset_difference: -480,
                current_time_in: '2026-07-20 08:00:00', current_time_out: '2026-07-20 17:00:00',
                new_time_in: '2026-07-20 08:30:00', new_time_out: '2026-07-20 17:30:00',
                employee_note: 'traffic',
            },
            location: {
                date: '2026-07-21',
                current_time_in: '2026-07-21 23:00:00', current_time_out: '2026-07-21 23:30:00',
            },
        });

        expect(valueOf(utils, 'current_time_in')).toBe(new Date('2026-07-20 08:00:00').toISOString());
        expect(valueOf(utils, 'new_time_in')).toBe(new Date('2026-07-20 08:30:00').toISOString());
        expect(valueOf(utils, 'new_time_out')).toBe(new Date('2026-07-20 17:30:00').toISOString());
        expect(fieldOf(utils, 'new_time_in').getAttribute('data-offset')).toBe('-480');
    });
});

describe('AlterLog — the supervisor perspective block', () => {
    test('an approval shows the employee-perspective times taken from the saved request', () => {
        const utils = renderAL({
            params: { id: '9' },
            isInstanceLoaded: true,
            instance: {
                id: 9, is_under_supervisee: true, date: '2026-07-20', pov_timezone: '05:00',
                pov_current_time_in: '2026-07-20 06:00:00', pov_current_time_out: '2026-07-20 15:00:00',
                pov_new_time_in: '2026-07-20 06:30:00', pov_new_time_out: '2026-07-20 15:30:00',
            },
        });

        expect(valueOf(utils, 'pov_current_time_in')).toBe(new Date('2026-07-20 06:00:00').toISOString());
        expect(valueOf(utils, 'pov_new_time_out')).toBe(new Date('2026-07-20 15:30:00').toISOString());
        utils.getByText('-05:00');
    });

    test('an approval with no perspective data on the request falls back to the route state, then to the shift', () => {
        const fromRoute = renderAL({
            params: { id: '9' },
            isInstanceLoaded: true,
            instance: { id: 9, is_under_supervisee: true, date: '2026-07-20' },
            location: {
                date: '2026-07-20',
                pov_current_time_in: '2026-07-20 06:00:00',
                pov_current_time_out: '2026-07-20 15:00:00',
            },
        });
        expect(valueOf(fromRoute, 'pov_current_time_in')).toBe(new Date('2026-07-20 06:00:00').toISOString());
        expect(valueOf(fromRoute, 'pov_new_time_in')).toBe(new Date('2026-07-20 06:00:00').toISOString());

        const fromShift = renderAL({
            params: { id: '9' },
            isInstanceLoaded: true,
            instance: { id: 9, is_under_supervisee: true, date: '2026-07-20' },
            location: { date: '2026-07-20' },
        });
        expect(valueOf(fromShift, 'pov_current_time_in')).toBe('null');
        expect(valueOf(fromShift, 'pov_new_time_in')).toBe(new Date(Date.UTC(2026, 6, 20, 1, 0, 0)).toISOString());

        const fromNothing = renderAL({
            params: { id: '9' },
            isInstanceLoaded: true,
            instance: { id: 9, is_under_supervisee: true, date: '2026-07-20' },
            location: {},
        });
        expect(valueOf(fromNothing, 'pov_new_time_in')).toBe('null');
        expect(valueOf(fromNothing, 'pov_new_time_out')).toBe('null');
    });
});

describe('AlterLog — store wiring', () => {
    test('mapStateToProps reads the alterLog slice, the user and settings', () => {
        const state = {
            constant: { A: 1 },
            alterLog: { instance: { id: 3 }, isInstanceLoaded: true },
            user: { id: 42 },
            settings: { current_payroll_cutoff: { start_date: '2026-07-16' } },
        };

        expect(AlterLog.__mapStateToProps(state)).toEqual({
            constant: { A: 1 },
            instance: { id: 3 },
            isInstanceLoaded: true,
            user: { id: 42 },
            settings: { current_payroll_cutoff: { start_date: '2026-07-16' } },
        });
    });

    test('every mapDispatchToProps handler dispatches its own action creator', () => {
        const dispatch = jest.fn();
        const p = AlterLog.__mapDispatchToProps(dispatch);

        expect(p.dispatch).toBe(dispatch);

        p.fetchAlterLog(7);
        p.addAlterLog('form');
        p.updateAlterLog(7, 'form');
        p.updateAlterLogStatus(7, 'form', 'decline', 42, 'a', 'b');
        p.setRedirect('/x');
        p.resetAlterLogInstance();
        p.clearAlterLogInstance();
        p.getMyDtrNotifications();

        expect(alterLogActions.fetchAlterLog).toHaveBeenCalledWith(7);
        expect(alterLogActions.updateAlterLogStatus).toHaveBeenCalledWith(7, 'form', 'decline', 42, 'a', 'b');
        expect(dashboardActions.getMyDtrNotifications).toHaveBeenCalled();
        expect(redirectActions.setRedirect).toHaveBeenCalledWith('/x');
        expect(dispatch.mock.calls.map((c) => c[0].type)).toEqual([
            'AL_FETCH', 'AL_ADD', 'AL_UPDATE', 'AL_STATUS', 'REDIRECT', 'AL_RESET', 'AL_CLEAR', 'DTR_NOTIF',
        ]);
    });
});
