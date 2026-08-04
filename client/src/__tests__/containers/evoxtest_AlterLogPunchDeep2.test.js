/**
 * evoxtest_AlterLogPunchDeep2.test.js
 * Wave-3 coverage for container/Request/AlterLogPunch/AlterLogPunch.js
 * (29 Jul: 80 unc / 30.4%). Arms: componentWillMount clear+fetch, punch-row
 * add/remove-last/remove-at-index handlers, showOriginalHandler, onSubmitHandler
 * store (confirm accept/decline) + approve/decline/cancel status arms with the
 * payroll-cutoff plumbing, and componentWillReceiveProps' instance-loaded /
 * single-punch-list / reset arms with location fallbacks.
 * ADDITIVE ONLY. Menu: Requests → MultiPunch Alteration (route: alter_log_punch+':id?').
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import moment from 'moment';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
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
jest.mock('../../components/RequestComponent/RequestButtons/RequestButtons', () => () => <div />);
jest.mock('../../components/RequestComponent/RequestButtons/RequestSubtitle', () => () => <div />);
jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading" />);
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate: ({ name }) => <input type="date" name={name} />,
    InputTime: ({ name }) => <input type="time" name={name} />,
    InputDateTime: ({ name }) => <input type="datetime-local" name={name} />,
    InputDateTimeIndex: ({ name }) => <input type="datetime-local" name={name} />,
}));
jest.mock('react-datepicker', () => () => <input type="date" />);
jest.mock('react-select', () => (props) => <select data-testid="react-select" />);
jest.mock('../../services/DateFormatter', () => ({
    convert_date: jest.fn((d) => d),
    add_day_to_datetime: jest.fn((d) => d),
}));
jest.mock('../../services/Authenticator', () => ({
    scanLevel: jest.fn(() => true), scanFeature: jest.fn(() => true), check: jest.fn(() => true),
}));
jest.mock('../../store/actions/request/alterLogPunchActions', () => ({
    fetchAlterLogPunch: jest.fn(), addAlterLogPunch: jest.fn(), updateAlterLogPunch: jest.fn(),
    updateAlterLogPunchStatus: jest.fn(), resetAlterLogPunchInstance: jest.fn(), clearAlterLogPunchInstance: jest.fn(),
}), { virtual: true });
jest.mock('../../store/actions/dashboard/dashboardActions', () => ({
    getRecentPunches2: jest.fn(), clearRecentPunches2: jest.fn(), getMyDtrNotifications: jest.fn(),
}));
jest.mock('../../store/actions/redirectActions', () => ({ setRedirect: jest.fn() }));

const AlterLogPunch = require('../../container/Request/AlterLogPunch/AlterLogPunch').default;

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
    onApproval: false,
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

describe('AlterLogPunch — mount and punch-row handlers', () => {
    test('mount clears punches + instance; fetches when an id param exists', () => {
        const a = renderALP();
        expect(a.actions.clearRecentPunches2).toHaveBeenCalled();
        expect(a.actions.clearAlterLogPunchInstance).toHaveBeenCalled();
        expect(a.actions.fetchAlterLogPunch).not.toHaveBeenCalled();

        const b = renderALP({ params: { id: '11' } });
        expect(b.actions.fetchAlterLogPunch).toHaveBeenCalledWith('11');
    });

    test('addRecordHandler appends a punch pair; minus handlers remove last / at-index', () => {
        const { ref } = renderALP();
        const base = { date: '2026-07-20', employee_note: 'n', approver_note: 'a', new_punch: [] };

        ref.current.addRecordHandler(base);
        expect(ref.current.state.new_punch.length).toBe(1);
        expect(ref.current.state.records.length).toBe(1);

        ref.current.addRecordHandler({ ...base, new_punch: ref.current.state.new_punch });
        expect(ref.current.state.new_punch.length).toBe(2);

        ref.current.minusRecordHandler({ date: '2026-07-20', employee_note: 'n' });
        expect(ref.current.state.new_punch.length).toBe(1);

        ref.current.setState({ new_punch: [{ i: 0 }, { i: 1 }, { i: 2 }], records: [{}, {}, {}] });
        ref.current.minusSelectedHandler({ date: '2026-07-20', employee_note: 'n' }, 1);
        expect(ref.current.state.new_punch).toEqual([{ i: 0 }, { i: 2 }]);
    });

    test('showOriginalHandler fetches the recent punches for that date', () => {
        const { ref, actions } = renderALP();
        ref.current.showOriginalHandler({ id: 42 }, '2026-07-20');
        expect(actions.getRecentPunches2).toHaveBeenCalledWith(42, '2026-07-20', '2026-07-20');
        expect(ref.current.state.date).toBe('2026-07-20');
    });
});

describe('AlterLogPunch — onSubmitHandler arms', () => {
    const storeValues = {
        action: null, method: 'store', date: new Date(2026, 6, 20),
        employee_note: 'forgot punches',
        new_punch: [{
            start_time: new Date(2026, 6, 20, 9, 0), end_time: new Date(2026, 6, 20, 13, 0),
            project_name: 'EVOX', remarks: 'am shift',
        }],
    };

    test('store + confirm serializes punches and dispatches addAlterLogPunch', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { ref, actions } = renderALP();
        await ref.current.onSubmitHandler({ ...storeValues });

        expect(actions.addAlterLogPunch).toHaveBeenCalledTimes(1);
        const fd = actions.addAlterLogPunch.mock.calls[0][0];
        expect(fd.get('date')).toBe('2026-07-20');
        const punches = JSON.parse(fd.get('new_punch'));
        expect(punches[0].start_time).toBe('2026-07-20 09:00:00');
        expect(punches[0].project_name).toBe('EVOX');
        confirmSpy.mockRestore();
    });

    test('store + confirm declined dispatches nothing', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
        const { ref, actions } = renderALP();
        await ref.current.onSubmitHandler({ ...storeValues });
        expect(actions.addAlterLogPunch).not.toHaveBeenCalled();
        confirmSpy.mockRestore();
    });

    test('approve/decline/cancel PUT the status with the payroll-cutoff window', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { ref, actions } = renderALP();

        for (const action of ['approve', 'decline', 'cancel']) {
            await ref.current.onSubmitHandler({ ...storeValues, action, id: 77 });
        }
        expect(actions.updateAlterLogPunchStatus).toHaveBeenCalledTimes(3);
        const [id, fd, status, userId, from, to] = actions.updateAlterLogPunchStatus.mock.calls[0];
        expect(id).toBe(77);
        expect(fd.get('_method')).toBe('PUT');
        expect(status).toBe('approve');
        expect(userId).toBe(42);
        expect(from).toBe('2026-07-16');
        expect(to).toBe('2026-08-15');
        expect(actions.getMyDtrNotifications).toHaveBeenCalledTimes(3);
        confirmSpy.mockRestore();
    });
});

describe('AlterLogPunch — componentWillReceiveProps arms', () => {
    test('loaded alter_log_punch instance maps punches into state (with Date conversion)', () => {
        const utils = renderALP();
        rerenderALP(utils, {
            isInstanceLoaded: true,
            instance: {
                request_type: 'alter_log_punch',
                new_punch: [
                    { start_time: '2026-07-20 09:00:00', end_time: '2026-07-20 13:00:00', project_name: 'EVOX', remarks: 'am' },
                    { project_name: undefined, remarks: undefined }, // location-fallback arms
                ],
            },
            location: { start_time: '2026-07-20 14:00:00', end_time: '2026-07-20 18:00:00' },
        });

        const s = utils.ref.current.state;
        expect(s.new_punch.length).toBe(2);
        expect(s.new_punch[0].start_time.getHours()).toBe(9);
        expect(s.new_punch[1].start_time.getHours()).toBe(14); // fell back to location
    });

    test('no instance: single_punch_list feeds the rows; empty list resets state', () => {
        const utils = renderALP();
        utils.ref.current.setState({ new_punch: [{ x: 1 }], records: [{ x: 1 }] });

        rerenderALP(utils, {
            dtr: { single_punch_list: [
                { date_time_in: '2026-07-20 08:00:00', date_time_out: '2026-07-20 12:00:00', project_name: 'EVOX', remarks: 'am' },
            ] },
        });
        expect(utils.ref.current.state.new_punch.length).toBe(1);
        expect(utils.ref.current.state.new_punch[0].start_time.getHours()).toBe(8);

        rerenderALP(utils, { dtr: { single_punch_list: [] } });
        expect(utils.ref.current.state.new_punch).toEqual([]);
        expect(utils.ref.current.state.records).toEqual([]);
    });
});
