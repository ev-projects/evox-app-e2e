/**
 * evoxtest_AlterLogDeep2.test.js
 * Wave-5 coverage for container/Request/AlterLog/AlterLog.js (fresh gap: 63 unc / 27.6%).
 * Arms: componentWillMount clear+fetch, componentDidUpdate id-change/id-cleared arms,
 * checkRequestValidity success/null/error, onSubmitHandler's validity gate
 * (Result 0 → blocked alert, 1 → regular confirm, 2 → dispute confirm), store vs
 * update dispatch, declined confirm, approve/decline/cancel status arms with the
 * payroll-cutoff plumbing. ADDITIVE ONLY.
 * Menu: Requests → Time Alteration (route: alter_log+':id?').
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

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
}));
jest.mock('react-select', () => () => <select data-testid="react-select" />);
jest.mock('../../services/DateFormatter', () => ({
    convert_date: jest.fn((d) => d),
    add_day_to_datetime: jest.fn((d) => d),
}));
jest.mock('../../services/Authenticator', () => ({
    scanLevel: jest.fn(() => true), scanFeature: jest.fn(() => true), check: jest.fn(() => true),
}));
jest.mock('../../services/API', () => ({ call: jest.fn() }));
jest.mock('../../services/Formatter', () => ({
    alert_error: jest.fn(() => ({ type: 'STUB_ALERT_ERROR' })),
    alert_success: jest.fn(() => ({ type: 'STUB_ALERT_SUCCESS' })),
    slug_to_title: jest.fn((s) => s),
}));
jest.mock('../../store/actions/request/alterLogActions', () => ({
    fetchAlterLog: jest.fn(), addAlterLog: jest.fn(), updateAlterLog: jest.fn(),
    updateAlterLogStatus: jest.fn(), resetAlterLogInstance: jest.fn(), clearAlterLogInstance: jest.fn(),
}), { virtual: true });
jest.mock('../../store/actions/redirectActions', () => ({ setRedirect: jest.fn() }));
jest.mock('../../store/actions/dashboard/dashboardActions', () => ({
    getMyDtrNotifications: jest.fn(), getRecentPunches2: jest.fn(), clearRecentPunches2: jest.fn(),
}));

import API from '../../services/API';
import Formatter from '../../services/Formatter';

const AlterLog = require('../../container/Request/AlterLog/AlterLog').default;

function makeActions() {
    return {
        dispatch: jest.fn(),
        fetchAlterLog: jest.fn(), addAlterLog: jest.fn(), updateAlterLog: jest.fn(),
        updateAlterLogStatus: jest.fn(), clearAlterLogInstance: jest.fn(),
        resetAlterLogInstance: jest.fn(), setRedirect: jest.fn(),
        getMyDtrNotifications: jest.fn(() => Promise.resolve()),
    };
}

const baseProps = {
    constant: {},
    user: { id: 42 },
    instance: {},
    isInstanceLoaded: false,
    settings: { current_payroll_cutoff: { start_date: '2026-07-16', end_date: '2026-08-15' } },
    params: {},
    location: {},
    onApproval: false,
};

function renderAL(props = {}, actions = makeActions()) {
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter>
            <AlterLog ref={ref} {...baseProps} {...actions} {...props} />
        </MemoryRouter>
    );
    return { ...utils, ref, actions, props: { ...baseProps, ...actions, ...props } };
}

function rerenderAL(utils, nextProps) {
    utils.rerender(
        <MemoryRouter>
            <AlterLog ref={utils.ref} {...utils.props} {...nextProps} />
        </MemoryRouter>
    );
}

const storeValues = () => ({
    action: null, method: 'store', date: new Date(2026, 6, 20),
    current_time_in: new Date(2026, 6, 20, 8, 0), current_time_out: new Date(2026, 6, 20, 17, 0),
    new_time_in: new Date(2026, 6, 20, 9, 0), new_time_out: new Date(2026, 6, 20, 18, 0),
    employee_note: 'forgot to log',
});

function validity(result, extra = {}) {
    API.call.mockImplementation(() => Promise.resolve({
        status: 200,
        data: { content: { Result: result, StartDate: '2026-07-16', EndDate: '2026-08-15', ...extra } },
    }));
}

beforeEach(() => jest.clearAllMocks());

describe('AlterLog — lifecycle arms', () => {
    test('mount clears the instance and fetches only when an id param exists', () => {
        const a = renderAL();
        expect(a.actions.clearAlterLogInstance).toHaveBeenCalledTimes(1);
        expect(a.actions.fetchAlterLog).not.toHaveBeenCalled();

        const b = renderAL({ params: { id: '9' } });
        expect(b.actions.fetchAlterLog).toHaveBeenCalledWith('9');
    });

    test('id appearing / disappearing across updates re-clears and re-fetches', () => {
        const utils = renderAL();
        utils.actions.clearAlterLogInstance.mockClear();

        rerenderAL(utils, { params: { id: '5' } }); // id appears
        expect(utils.props.clearAlterLogInstance).toHaveBeenCalledTimes(1);
        expect(utils.props.fetchAlterLog).toHaveBeenCalledWith('5');

        utils.props.clearAlterLogInstance.mockClear();
        rerenderAL(utils, { params: {} }); // id cleared
        expect(utils.props.clearAlterLogInstance).toHaveBeenCalledTimes(1);
    });
});

describe('AlterLog — checkRequestValidity', () => {
    test('returns the payload on 200, null on missing content, alerts+throws on failure', async () => {
        const { ref } = renderAL();
        validity('1');
        await expect(ref.current.checkRequestValidity('2026-07-20')).resolves.toMatchObject({ Result: '1' });

        API.call.mockImplementation(() => Promise.resolve({ status: 200, data: {} }));
        await expect(ref.current.checkRequestValidity('2026-07-20')).resolves.toBeNull();

        API.call.mockImplementation(() => Promise.reject(new Error('HTTP 500')));
        await expect(ref.current.checkRequestValidity('2026-07-20')).rejects.toThrow();
        expect(Formatter.alert_error).toHaveBeenCalled();
    });
});

describe('AlterLog — onSubmitHandler validity gate and dispatch arms', () => {
    test('Result 0 blocks with the DTR-generation alert and dispatches nothing', async () => {
        const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
        const { ref, actions } = renderAL();
        validity('0');
        await ref.current.onSubmitHandler(storeValues());

        expect(alertSpy).toHaveBeenCalledWith(expect.stringMatching(/DTR generation/));
        expect(actions.addAlterLog).not.toHaveBeenCalled();
        alertSpy.mockRestore();
    });

    test('Result 1 inside the cutoff stores as a REGULAR request with formatted times', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { ref, actions } = renderAL();
        validity('1');
        await ref.current.onSubmitHandler(storeValues());

        expect(confirmSpy.mock.calls[0][0]).toMatch(/submit\/update this request/);
        const fd = actions.addAlterLog.mock.calls[0][0];
        expect(fd.get('request_mode')).toBe('regular');
        expect(fd.get('date')).toBe('2026-07-20');
        expect(fd.get('new_time_in')).toBe('2026-07-20 09:00:00');
        expect(actions.getMyDtrNotifications).toHaveBeenCalledWith(42);
        confirmSpy.mockRestore();
    });

    test('Result 2 stores as a DISPUTE with the cut-off warning; update arm PUTs', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { ref, actions } = renderAL();
        validity('2');
        await ref.current.onSubmitHandler(storeValues());
        expect(confirmSpy.mock.calls[0][0]).toMatch(/recorded as a dispute/);
        expect(actions.addAlterLog.mock.calls[0][0].get('request_mode')).toBe('dispute');

        await ref.current.onSubmitHandler({ ...storeValues(), method: 'update', id: 7 });
        const [id, fd] = actions.updateAlterLog.mock.calls[0];
        expect(id).toBe(7);
        expect(fd.get('_method')).toBe('PUT');
        confirmSpy.mockRestore();
    });

    test('declined confirm dispatches nothing', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
        const { ref, actions } = renderAL();
        validity('1');
        await ref.current.onSubmitHandler(storeValues());
        expect(actions.addAlterLog).not.toHaveBeenCalled();
        confirmSpy.mockRestore();
    });

    test('approve/decline/cancel PUT the status with the payroll-cutoff window', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { ref, actions } = renderAL();

        for (const action of ['approve', 'decline', 'cancel']) {
            await ref.current.onSubmitHandler({ ...storeValues(), action, id: 77 });
        }
        expect(actions.updateAlterLogStatus).toHaveBeenCalledTimes(3);
        const [id, fd, status, userId, from, to] = actions.updateAlterLogStatus.mock.calls[0];
        expect([id, status, userId, from, to]).toEqual([77, 'approve', 42, '2026-07-16', '2026-08-15']);
        expect(fd.get('_method')).toBe('PUT');
        expect(actions.getMyDtrNotifications).toHaveBeenCalledTimes(3);
        confirmSpy.mockRestore();
    });
});
