/**
 * evoxtest_AlterLogPunchDeep3.test.js
 * Source under test: src/container/Request/AlterLogPunch/AlterLogPunch.js
 * Menu: Requests -> MultiPunch Alteration (route alter_log_punch/:id?)
 *
 * Wave-6 residue after evoxtest_AlterLogPunchDeep2: 15 uncovered functions / 20 uncovered
 * branch arms. This suite drives the three render-callback handlers that Deep2 reached only
 * through the instance ref (the date picker's onChange, the "remove last row" button and the
 * per-row "remove this row" button), the two submit arms Deep2 left open (an unknown method,
 * and a declined confirmation on an approve/decline/cancel), the all-undefined fallbacks in
 * componentWillReceiveProps, and mapStateToProps / mapDispatchToProps.
 *
 * ADDITIVE ONLY — no existing test, mock or app file is touched.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

// connect() is neutralised, but both map functions are stashed on the component so the
// store-wiring can be asserted directly (they are otherwise unreachable from a test).
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
    InputDateTime: ({ name }) => <input type="datetime-local" name={name} />,
    InputDateTimeIndex: ({ name, indexid }) => <input type="datetime-local" name={name} data-index={indexid} />,
}));
// Exposes the real onChange so the picker's handler (showOriginalHandler + setFieldValue) runs.
jest.mock('react-datepicker', () => ({ onChange, readOnly }) => (
    <input
        data-testid="alp-date-picker"
        data-readonly={String(readOnly)}
        onChange={(e) => onChange(new Date(e.target.value))}
    />
));
jest.mock('react-select', () => () => <select data-testid="react-select" />);
jest.mock('../../services/DateFormatter', () => ({
    convert_date: jest.fn((d) => d),
    add_day_to_datetime: jest.fn((d) => d),
}));
jest.mock('../../services/Authenticator', () => ({
    scanLevel: jest.fn(() => true), scanFeature: jest.fn(() => true), check: jest.fn(() => true),
}));
jest.mock('../../store/actions/requests/alterPunchLogActions', () => ({
    fetchAlterLogPunch:         jest.fn((id) => ({ type: 'ALP_FETCH', id })),
    addAlterLogPunch:           jest.fn((d) => ({ type: 'ALP_ADD', d })),
    updateAlterLogPunch:        jest.fn((id, d) => ({ type: 'ALP_UPDATE', id, d })),
    updateAlterLogPunchStatus:  jest.fn((id, d, s) => ({ type: 'ALP_STATUS', id, d, s })),
    resetAlterLogPunchInstance: jest.fn(() => ({ type: 'ALP_RESET' })),
    clearAlterLogPunchInstance: jest.fn(() => ({ type: 'ALP_CLEAR' })),
}));
jest.mock('../../store/actions/dashboard/dashboardActions', () => ({
    getRecentPunches2:    jest.fn((id, f, t) => ({ type: 'PUNCHES', id, f, t })),
    clearRecentPunches2:  jest.fn(() => ({ type: 'PUNCHES_CLEAR' })),
    getMyDtrNotifications: jest.fn(() => ({ type: 'DTR_NOTIF' })),
}));
jest.mock('../../store/actions/redirectActions', () => ({
    setRedirect: jest.fn((l) => ({ type: 'REDIRECT', l })),
}));

const AlterLogPunch = require('../../container/Request/AlterLogPunch/AlterLogPunch').default;
const alterPunchLogActions = require('../../store/actions/requests/alterPunchLogActions');
const dashboardActions = require('../../store/actions/dashboard/dashboardActions');
const redirectActions = require('../../store/actions/redirectActions');

function makeActions() {
    return {
        fetchAlterLogPunch: jest.fn(), addAlterLogPunch: jest.fn(),
        getRecentPunches2: jest.fn(), updateAlterLogPunch: jest.fn(),
        updateAlterLogPunchStatus: jest.fn(), setRedirect: jest.fn(),
        resetAlterLogPunchInstance: jest.fn(), clearAlterLogPunchInstance: jest.fn(),
        getMyDtrNotifications: jest.fn(() => Promise.resolve()), clearRecentPunches2: jest.fn(),
    };
}

const baseProps = {
    constant: {},
    user: { id: 42 },
    instance: {},
    isInstanceLoaded: false,
    settings: { current_payroll_cutoff: { start_date: '2026-07-16', end_date: '2026-08-15' } },
    dtr: { single_punch_list: [] },
    params: {},
    location: {},
};

function renderALP(props = {}, actions = makeActions()) {
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter>
            <AlterLogPunch ref={ref} {...baseProps} {...actions} {...props} />
        </MemoryRouter>
    );
    return { ...utils, ref, actions, props: { ...baseProps, ...actions, ...props } };
}

function rerenderALP(utils, nextProps) {
    utils.rerender(
        <MemoryRouter>
            <AlterLogPunch ref={utils.ref} {...utils.props} {...nextProps} />
        </MemoryRouter>
    );
}

beforeEach(() => jest.clearAllMocks());

describe('AlterLogPunch — the form controls a requester actually clicks', () => {
    test('picking a date on the calendar loads that day\'s existing punches', () => {
        const { getByTestId, actions, ref } = renderALP({ location: { date: '2026-07-20' } });

        fireEvent.change(getByTestId('alp-date-picker'), { target: { value: '2026-07-22' } });

        expect(actions.getRecentPunches2).toHaveBeenCalledWith(42, '2026-07-22', '2026-07-22');
        expect(ref.current.state.date).toEqual(new Date('2026-07-22'));
    });

    test('the "remove last row" button is dead until a row exists, then drops exactly one row', () => {
        const { container, ref } = renderALP({ location: { date: '2026-07-20' } });
        const addButton = container.querySelectorAll('button')[0];
        const removeLastButton = container.querySelectorAll('button')[1];

        expect(removeLastButton.disabled).toBe(true);

        fireEvent.click(addButton);
        fireEvent.click(addButton);
        expect(ref.current.state.new_punch.length).toBe(2);

        expect(container.querySelectorAll('button')[1].disabled).toBe(false);
        fireEvent.click(container.querySelectorAll('button')[1]);
        expect(ref.current.state.new_punch.length).toBe(1);
        expect(ref.current.state.records.length).toBe(1);
    });

    test('the per-row X button removes that row and leaves the others', () => {
        const { container, ref } = renderALP({ location: { date: '2026-07-20' } });
        const addButton = container.querySelectorAll('button')[0];

        fireEvent.click(addButton);
        fireEvent.click(addButton);
        fireEvent.click(addButton);
        expect(ref.current.state.records.length).toBe(3);

        // buttons: [0] add, [1] remove-last, then one X per row
        ref.current.setState({ new_punch: [{ tag: 'a' }, { tag: 'b' }, { tag: 'c' }] });
        fireEvent.click(container.querySelectorAll('button')[3]); // the 2nd row's X

        expect(ref.current.state.new_punch).toEqual([{ tag: 'a' }, { tag: 'c' }]);
        expect(ref.current.state.records.length).toBe(2);
    });

    test('an instance under approval renders the punch list read-only', () => {
        const { getByTestId } = renderALP({
            params: { id: '9' },
            isInstanceLoaded: true,
            instance: {
                id: 9, is_under_supervisee: true, offset_difference: -480,
                old_punch: [{ date: '2026-07-20', time_in: '09:00', time_out: '18:00', hours: 9, project_name: 'EVOX' }],
                new_punch: [],
            },
        });
        expect(getByTestId('alp-date-picker').getAttribute('data-readonly')).toBe('true');
    });
});

describe('AlterLogPunch — submit arms Deep2 left open', () => {
    const values = {
        action: null, method: 'store', date: new Date(2026, 6, 20),
        employee_note: 'forgot punches', new_punch: [],
    };

    test('a method the form does not know about submits nothing', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { ref, actions } = renderALP();

        await ref.current.onSubmitHandler({ ...values, method: 'approval' });

        expect(actions.addAlterLogPunch).not.toHaveBeenCalled();
        expect(actions.updateAlterLogPunch).not.toHaveBeenCalled();
        expect(actions.updateAlterLogPunchStatus).not.toHaveBeenCalled();
        confirmSpy.mockRestore();
    });

    test('declining the confirmation on an approval leaves the request untouched', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
        const { ref, actions } = renderALP();

        await ref.current.onSubmitHandler({ ...values, action: 'approve', id: 77 });

        expect(actions.updateAlterLogPunchStatus).not.toHaveBeenCalled();
        expect(actions.getMyDtrNotifications).not.toHaveBeenCalled();
        confirmSpy.mockRestore();
    });

    test('a null field is skipped entirely rather than posted as "null"', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { ref, actions } = renderALP();

        await ref.current.onSubmitHandler({ ...values, employee_note: null, approver_note: 'ok' });

        const fd = actions.addAlterLogPunch.mock.calls[0][0];
        expect(fd.get('employee_note')).toBeNull();
        expect(fd.get('approver_note')).toBe('ok');
        confirmSpy.mockRestore();
    });
});

describe('AlterLogPunch — incoming props with nothing to fall back on', () => {
    test('an instance punch with no times and no route state produces null times', () => {
        const utils = renderALP();
        rerenderALP(utils, {
            isInstanceLoaded: true,
            instance: { request_type: 'alter_log_punch', new_punch: [{}] },
            location: {},
        });

        expect(utils.ref.current.state.new_punch).toEqual([
            { start_time: null, end_time: null, project_name: null, remarks: null },
        ]);
    });

    test('a raw punch row with no times and no route state produces null times', () => {
        const utils = renderALP();
        rerenderALP(utils, { dtr: { single_punch_list: [{}] }, location: {} });

        expect(utils.ref.current.state.new_punch).toEqual([
            { start_time: null, end_time: null, project_name: null, remarks: null },
        ]);
        expect(utils.ref.current.state.records.length).toBe(1);
    });

    test('an instance of another request type is ignored', () => {
        const utils = renderALP();
        utils.ref.current.setState({ new_punch: [{ keep: true }], records: [{ keep: true }] });

        rerenderALP(utils, { isInstanceLoaded: true, instance: { request_type: 'alter_log' } });

        expect(utils.ref.current.state.new_punch).toEqual([{ keep: true }]);
    });
});

describe('AlterLogPunch — store wiring', () => {
    test('mapStateToProps reads the alterLogPunch slice, the user, settings and dtr', () => {
        const state = {
            constant: { A: 1 },
            alterLogPunch: { instance: { id: 5 }, isInstanceLoaded: true },
            user: { id: 42 },
            settings: { current_payroll_cutoff: { start_date: '2026-07-16' } },
            dtr: { single_punch_list: [{ id: 1 }] },
        };

        expect(AlterLogPunch.__mapStateToProps(state)).toEqual({
            constant: { A: 1 },
            instance: { id: 5 },
            isInstanceLoaded: true,
            user: { id: 42 },
            settings: { current_payroll_cutoff: { start_date: '2026-07-16' } },
            dtr: { single_punch_list: [{ id: 1 }] },
        });
    });

    test('every mapDispatchToProps handler dispatches its own action creator', () => {
        const dispatch = jest.fn();
        const p = AlterLogPunch.__mapDispatchToProps(dispatch);

        p.fetchAlterLogPunch(7);
        p.addAlterLogPunch('form');
        p.getRecentPunches2(42, '2026-07-20', '2026-07-21');
        p.updateAlterLogPunch(7, 'form');
        p.updateAlterLogPunchStatus(7, 'form', 'approve', 42, 'a', 'b');
        p.setRedirect('/x');
        p.resetAlterLogPunchInstance();
        p.clearAlterLogPunchInstance();
        p.getMyDtrNotifications();
        p.clearRecentPunches2();

        expect(alterPunchLogActions.fetchAlterLogPunch).toHaveBeenCalledWith(7);
        expect(alterPunchLogActions.updateAlterLogPunchStatus).toHaveBeenCalledWith(7, 'form', 'approve', 42, 'a', 'b');
        expect(dashboardActions.getRecentPunches2).toHaveBeenCalledWith(42, '2026-07-20', '2026-07-21');
        expect(redirectActions.setRedirect).toHaveBeenCalledWith('/x');
        expect(dispatch).toHaveBeenCalledTimes(10);
        expect(dispatch.mock.calls.map((c) => c[0].type)).toEqual([
            'ALP_FETCH', 'ALP_ADD', 'PUNCHES', 'ALP_UPDATE', 'ALP_STATUS',
            'REDIRECT', 'ALP_RESET', 'ALP_CLEAR', 'DTR_NOTIF', 'PUNCHES_CLEAR',
        ]);
    });
});
