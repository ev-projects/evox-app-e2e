/**
 * evoxtest_ChangeScheduleDeep2.test.js
 * Wave-5 coverage for container/Request/ChangeSchedule/ChangeSchedule.js
 * (fresh: 56 unc / 54.5%). Arms: the NSD guard trio (overnight span, pre-6am start,
 * post-22:00 end) gated by allow_night_diff, the before-flex guard (start after flexi
 * start / more than 12h before), both warning modals + hide handlers, store/update
 * dispatch with session_id + formatted dates, approve/decline/cancel with the cutoff
 * window, declined confirm, and the id-change lifecycle arms. Driven via instance ref.
 * ADDITIVE ONLY. Menu: Requests → Change Schedule (route: change_schedule+':id?').
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
}));
jest.mock('../../components/Schedule/ScheduleDetails.js', () => ({
    Scheduledetails: () => <div />, ScheduledetailsWithTimezone: () => <div />,
    onSelectTimeHandlerStd: jest.fn(), onSelectTimeHandlerFlexi: jest.fn(),
    SchedulePolicy: () => <div />, WorkDays: () => <div />,
    StandardSchedDetailsForm: () => <div />, FlexibleSchedDetailsForm: () => <div />,
    ScheduleHolidayPolicy: () => <div />,
}));
jest.mock('react-select', () => () => <select data-testid="react-select" />);
jest.mock('../../services/DateFormatter', () => ({
    convert_date: jest.fn((d) => d), add_day_to_datetime: jest.fn((d) => d),
    get_specific_datetime: jest.fn(() => new Date(2026, 6, 20, 1, 0, 59)), // module-level Yup schema uses it
}));
jest.mock('../../services/Authenticator', () => ({
    scanLevel: jest.fn(() => true), scanFeature: jest.fn(() => true), check: jest.fn(() => true),
}));
jest.mock('../../services/Formatter', () => ({
    format_schedule_details: jest.fn(() => ({ all: { start_time: '09:00' } })),
    alert_error: jest.fn(() => ({ type: 'STUB_ALERT_ERROR' })),
    slug_to_title: jest.fn((s) => s),
}));
jest.mock('../../store/actions/request/changeScheduleActions', () => ({
    fetchChangeSchedule: jest.fn(), addChangeSchedule: jest.fn(), updateChangeSchedule: jest.fn(),
    updateChangeScheduleStatus: jest.fn(), clearChangeScheduleInstance: jest.fn(), resetChangeScheduleInstance: jest.fn(),
}), { virtual: true });
jest.mock('../../store/actions/redirectActions', () => ({ setRedirect: jest.fn() }));

const ChangeSchedule = require('../../container/Request/ChangeSchedule/ChangeSchedule').default;

function makeActions() {
    return {
        dispatch: jest.fn(),
        fetchChangeSchedule: jest.fn(), addChangeSchedule: jest.fn(), updateChangeSchedule: jest.fn(),
        updateChangeScheduleStatus: jest.fn(), clearChangeScheduleInstance: jest.fn(),
        resetChangeScheduleInstance: jest.fn(), setRedirect: jest.fn(),
    };
}

const baseProps = {
    constant: {},
    user: { id: 42, user_offset_seconds: 0 },
    instance: {},
    isInstanceLoaded: false,
    settings: { current_payroll_cutoff: { start_date: '2026-07-16', end_date: '2026-08-15' } },
    params: {},
    location: {},
    onApproval: false,
};

function renderCS(props = {}, actions = makeActions()) {
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter>
            <ChangeSchedule ref={ref} {...baseProps} {...actions} {...props} />
        </MemoryRouter>
    );
    return { ...utils, ref, actions, props: { ...baseProps, ...actions, ...props } };
}

function rerenderCS(utils, nextProps) {
    utils.rerender(
        <MemoryRouter>
            <ChangeSchedule ref={utils.ref} {...utils.props} {...nextProps} />
        </MemoryRouter>
    );
}

// day schedule 09-18 with flexi 09-18: passes every guard
const t = (h, m = 0) => new Date(2026, 6, 20, h, m, 0);
function values(overrides = {}, detailOverrides = {}) {
    return {
        action: null, method: 'store',
        valid_from: new Date(2026, 7, 1), valid_to: new Date(2026, 7, 15),
        schedule_policies: { allow_night_diff: 0, ...(overrides.schedule_policies || {}) },
        cst_schedule_details: {
            0: {
                start_time: t(9), end_time: t(18),
                start_flexy_time: t(9), end_flexy_time: t(18),
                break_time: t(1), ...detailOverrides,
            },
        },
        ...overrides,
    };
}

beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('session_id', 'sess-9');
});

describe('ChangeSchedule — lifecycle and modal handlers', () => {
    test('mount clears the instance and fetches only with an id; id-change arms re-clear', () => {
        const a = renderCS();
        expect(a.actions.clearChangeScheduleInstance).toHaveBeenCalledTimes(1);
        expect(a.actions.fetchChangeSchedule).not.toHaveBeenCalled();

        rerenderCS(a, { params: { id: '5' } });
        expect(a.props.fetchChangeSchedule).toHaveBeenCalledWith('5');
        rerenderCS(a, { params: {} });
        expect(a.props.clearChangeScheduleInstance.mock.calls.length).toBeGreaterThanOrEqual(3);
    });

    test('show/hide handlers drive both warning modals', () => {
        const { ref } = renderCS();
        ref.current.handleShow();
        expect(ref.current.state.isShowModelNsd).toBe(true);
        ref.current.handleOnhide();
        expect(ref.current.state.isShowModelNsd).toBe(false);
        ref.current.handleShow2();
        expect(ref.current.state.isShowModelBeforeFlex).toBe(true);
        ref.current.handleOnhide2();
        expect(ref.current.state.isShowModelBeforeFlex).toBe(false);
    });
});

describe('ChangeSchedule — clean submission arms', () => {
    test('day schedule stores with session id, formatted validity and formatted details', () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { ref, actions } = renderCS();
        ref.current.onSubmitHandler(values());

        expect(actions.addChangeSchedule).toHaveBeenCalledTimes(1);
        const fd = actions.addChangeSchedule.mock.calls[0][0];
        expect(fd.session_id).toBe('sess-9');
        expect(fd.valid_from).toBe('2026-08-01');
        expect(fd.schedule_details).toEqual({ all: { start_time: '09:00' } });
        confirmSpy.mockRestore();
    });

    test('update PUTs with the id; declined confirm dispatches nothing', () => {
        const confirmSpy = jest.spyOn(window, 'confirm');
        const { ref, actions } = renderCS();

        confirmSpy.mockReturnValueOnce(true);
        ref.current.onSubmitHandler(values({ method: 'update', id: 7 }));
        const [id, fd] = actions.updateChangeSchedule.mock.calls[0];
        expect(id).toBe(7);
        expect(fd._method).toBe('PUT');

        confirmSpy.mockReturnValueOnce(false);
        ref.current.onSubmitHandler(values());
        expect(actions.addChangeSchedule).not.toHaveBeenCalled();
        confirmSpy.mockRestore();
    });

    test('approve/decline/cancel send the status with the payroll-cutoff window', () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { ref, actions } = renderCS();
        for (const action of ['approve', 'decline', 'cancel']) {
            ref.current.onSubmitHandler(values({ action, id: 77 }));
        }
        expect(actions.updateChangeScheduleStatus).toHaveBeenCalledTimes(3);
        const [id, fd, status, userId, from, to] = actions.updateChangeScheduleStatus.mock.calls[0];
        expect([id, status, userId, from, to]).toEqual([77, 'approve', 42, '2026-07-16', '2026-08-15']);
        expect(fd._method).toBe('PUT');
        confirmSpy.mockRestore();
    });
});

describe('ChangeSchedule — NSD and before-flex guards', () => {
    test('overnight, pre-6am and post-22:00 arms each open the NSD modal when the policy disallows', () => {
        const { ref, actions } = renderCS();
        const nsdCases = [
            { start_time: t(22), end_time: t(6), start_flexy_time: t(22), end_flexy_time: t(6) }, // overnight
            { start_time: t(4), start_flexy_time: t(4) },                                          // pre-6am
            { end_time: t(23), end_flexy_time: t(23) },                                            // post-22:00
        ];
        for (const d of nsdCases) {
            ref.current.setState({ isShowModelNsd: false });
            ref.current.onSubmitHandler(values({}, d));
            expect(ref.current.state.isShowModelNsd).toBe(true);
        }
        expect(actions.addChangeSchedule).not.toHaveBeenCalled();
    });

    test('the same night shift passes when allow_night_diff is 1', () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { ref, actions } = renderCS();
        ref.current.onSubmitHandler(values(
            { schedule_policies: { allow_night_diff: 1 } },
            { start_time: t(22), end_time: t(6), start_flexy_time: t(22), end_flexy_time: t(6) }
        ));
        // NSD flagged but the policy allows it — beforeFlex not triggered → dispatch proceeds
        expect(actions.addChangeSchedule).toHaveBeenCalledTimes(1);
        expect(ref.current.state.isShowModelNsd).toBe(false);
        confirmSpy.mockRestore();
    });

    test('start after flexi-start (and >12h before) opens the before-flex modal and blocks even with NSD allowed', () => {
        const { ref, actions } = renderCS();
        ref.current.onSubmitHandler(values(
            { schedule_policies: { allow_night_diff: 1 } },
            { start_time: t(10), start_flexy_time: t(9) } // start 10:00 AFTER flexi 09:00
        ));
        expect(ref.current.state.isShowModelBeforeFlex).toBe(true);
        expect(actions.addChangeSchedule).not.toHaveBeenCalled();

        ref.current.setState({ isShowModelBeforeFlex: false });
        ref.current.onSubmitHandler(values(
            { schedule_policies: { allow_night_diff: 1 } },
            { start_time: t(6), start_flexy_time: t(19), end_flexy_time: t(21) } // >12h before flexi
        ));
        expect(ref.current.state.isShowModelBeforeFlex).toBe(true);
    });
});
