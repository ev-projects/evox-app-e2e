/**
 * evoxtest_ScheduleAssignDeep2.test.js
 * Wave-3 coverage for container/Schedule/ScheduleAssign/ScheduleAssign.js
 * (29 Jul: 85 unc / 20.6%). Arms: componentWillMount fetch trio, setSchedule's
 * standard/flexible/customize branches each with POV-present and POV-absent
 * (owner-offset fallback) sub-arms, policy numeric parsing, onSubmitHandler
 * formatting + dispatch, loadTemplateSched, and componentWillReceiveProps'
 * default-schedule / template-list / template-data change detectors.
 * ADDITIVE ONLY. Menu: Schedule → Assign to employee (route: schedule_assign_user+':user_id').
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
}));
jest.mock('../../components/Template/Wrapper/index.js', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/Template/BackButton/index.js', () => () => <div />);
jest.mock('../../components/RequestComponent/RequestButtons/RequestSubtitle', () => () => <div />);
jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading" />);
jest.mock('react-datepicker', () => (props) => <input type="date" onChange={() => props.onChange && props.onChange(new Date())} />);
jest.mock('../../components/Schedule/ScheduleDetails.js', () => ({
    Scheduledetails: () => <div />, ScheduledetailsWithTimezone: () => <div />,
    onSelectTimeHandlerStd: jest.fn(), onSelectTimeHandlerFlexi: jest.fn(),
    FlexibleSchedDetailsFormWithTimezone: () => <div />, SchedulePolicy: () => <div />,
    StandardSchedDetailsFormWithTimezone: () => <div />, WorkDays: () => <div />,
    StandardSchedDetailsForm: () => <div />, FlexibleSchedDetailsForm: () => <div />,
    ScheduleHolidayPolicy: () => <div />,
}));
jest.mock('../../services/Formatter', () => ({
    format_schedule_details: jest.fn(() => ({ all: { start_time: '09:00' } })),
    array_to_multiselect_array: jest.fn(() => []),
}));
jest.mock('../../store/actions/scheduleActions', () => ({
    scheduleAssign: jest.fn(), getDefaultSchedule: jest.fn(), listTemplate: jest.fn(), getTemplateSchedule: jest.fn(),
}));
jest.mock('../../store/actions/userActions', () => ({ getUserInfo: jest.fn() }));

import Formatter from '../../services/Formatter';

const ScheduleAssign = require('../../container/Schedule/ScheduleAssign/ScheduleAssign').default;

function makeActions() {
    return {
        scheduleAssign: jest.fn(), getDefaultSchedule: jest.fn(),
        listTemplate: jest.fn(), getTemplateSchedule: jest.fn(), getUserInfo: jest.fn(),
    };
}

const baseProps = {
    user: { id: 1, user_offset_seconds: 0 },
    user_info: { user_offset_seconds: 3600 },
    params: { user_id: '9' },
    default_schedule: null,
    page_reloaded: false,
    template_list: [],
    template_data: null,
    instance: {},
};

function renderAssign(props = {}, actions = makeActions()) {
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter>
            <ScheduleAssign ref={ref} {...baseProps} {...actions} {...props} />
        </MemoryRouter>
    );
    return { ...utils, ref, actions, props: { ...baseProps, ...actions, ...props } };
}

function rerenderAssign(utils, nextProps) {
    utils.rerender(
        <MemoryRouter>
            <ScheduleAssign ref={utils.ref} {...utils.props} {...nextProps} />
        </MemoryRouter>
    );
}

const stdDetails = { all: { start_time: '09:00:00', end_time: '18:00:00', break_time: '01:00:00' } };
const flexDetails = { all: { start_time: '09:00:00', end_time: '18:00:00', start_flexy_time: '10:00:00', end_flexy_time: '19:00:00', break_time: '01:00:00' } };
const policies = { allow_late: '1', allow_undertime: '0', allow_night_diff: '1', allow_special_holiday: 'x', allow_legal_holiday: null };

beforeEach(() => jest.clearAllMocks());

describe('ScheduleAssign — mount and dispatch plumbing', () => {
    test('componentWillMount fetches user info, templates and the default schedule', () => {
        const { actions } = renderAssign();
        expect(actions.getUserInfo).toHaveBeenCalledWith('9');
        expect(actions.listTemplate).toHaveBeenCalled();
        expect(actions.getDefaultSchedule).toHaveBeenCalledWith('user', '9');
    });

    test('loadTemplateSched requests the template schedule as Default', () => {
        const { ref, actions } = renderAssign();
        ref.current.loadTemplateSched(42);
        expect(actions.getTemplateSchedule).toHaveBeenCalledWith(42, 'Default');
    });

    test('onSubmitHandler formats details + validity range and dispatches scheduleAssign', () => {
        const { ref, actions } = renderAssign();
        const values = { from: new Date(2026, 7, 1), to: new Date(2026, 7, 31), schedule_type: 'standard' };
        ref.current.onSubmitHandler(values);

        expect(Formatter.format_schedule_details).toHaveBeenCalledWith(values);
        expect(actions.scheduleAssign).toHaveBeenCalledTimes(1);
        const sent = actions.scheduleAssign.mock.calls[0][0];
        expect(sent.valid_from).toBe('2026-08-01');
        expect(sent.valid_to).toBe('2026-08-31');
        expect(sent.schedule_details).toEqual({ all: { start_time: '09:00' } });
    });
});

describe('ScheduleAssign — setSchedule branches', () => {
    test('standard type with POV details maps both time sets; policies parse with 0-fallbacks', () => {
        const { ref } = renderAssign();
        ref.current.setSchedule({
            creation_type: 'default', valid_from: '2026-08-01',
            work_days: ['mon', 'tue'], schedule_type: 'standard',
            schedule_details: stdDetails, schedule_policies: policies,
            pov_schedule_details: { all: { start_time: '11:00:00', end_time: '20:00:00' } },
        });

        const s = ref.current.state;
        expect(s.isInitialDataLoaded).toBe(true);
        expect(s.std_schedule_details[0].start_time.getHours()).toBe(9);
        expect(s.pov_schedule_details[0].start_time.getHours()).toBe(11);
        expect(s.schedule_policies).toEqual({
            allow_late: 1, allow_undertime: 0, allow_night_diff: 1,
            allow_special_holiday: 0, allow_legal_holiday: 0, // non-numeric → 0 fallback
        });
        expect(s.work_day).toEqual(['mon', 'tue']);
        expect(s.creation_type).toBe('default');
    });

    test('standard type without POV falls back to owner-offset shifted times', () => {
        const { ref } = renderAssign();
        ref.current.setState({ owner_offset: 3600 });
        ref.current.setSchedule({
            schedule_type: 'standard', schedule_details: stdDetails,
            schedule_policies: policies, pov_schedule_details: null,
        });
        // fallback stores epoch ms of start+offset (setSeconds return value)
        const povStart = ref.current.state.pov_schedule_details[0].start_time;
        expect(new Date(povStart).getHours()).toBe(10); // 09:00 + 1h offset
    });

    test('flexible type maps flexy fields; POV-absent arm shifts by owner offset', () => {
        const { ref } = renderAssign();
        ref.current.setState({ owner_offset: 3600 });
        ref.current.setSchedule({
            schedule_type: 'flexible', schedule_details: flexDetails,
            schedule_policies: policies, pov_schedule_details: null,
        });

        const s = ref.current.state;
        expect(s.flx_schedule_details[0].start_flexy_time.getHours()).toBe(10);
        expect(new Date(s.pov_schedule_details[0].end_flexy_time).getHours()).toBe(20); // 19 + 1h
    });

    test('customize type builds per-day rows; instance POV populates matching rows', () => {
        const dayDetails = {
            mon: { start_time: '08:00:00', end_time: '17:00:00', start_flexy_time: '09:00:00', end_flexy_time: '18:00:00', break_time: '01:00:00' },
            tue: { start_time: '10:00:00', end_time: '19:00:00', start_flexy_time: '11:00:00', end_flexy_time: '20:00:00', break_time: '01:00:00' },
        };
        const { ref } = renderAssign({
            instance: { schedule: { pov_schedule_details: {
                mon: { start_time: '09:00:00', end_time: '18:00:00', start_flexy_time: '10:00:00', end_flexy_time: '19:00:00' },
                tue: { start_time: '11:00:00', end_time: '20:00:00', start_flexy_time: '12:00:00', end_flexy_time: '21:00:00' },
            } } },
        });
        ref.current.setSchedule({
            schedule_type: 'customize', schedule_details: dayDetails, schedule_policies: policies,
        });

        const s = ref.current.state;
        expect(s.cst_schedule_details.length).toBe(2);
        expect(s.cst_schedule_details[0].start_time.getHours()).toBe(8);
        expect(s.cst_schedule_details[1].start_time.getHours()).toBe(10);
        expect(s.pov_schedule_details[0].start_time.getHours()).toBe(9);
        expect(s.pov_schedule_details[1].start_time.getHours()).toBe(11);
    });

    test('customize without instance POV but with owner offset uses the shifted fallback', () => {
        const dayDetails = { mon: { start_time: '08:00:00', end_time: '17:00:00', start_flexy_time: '09:00:00', end_flexy_time: '18:00:00', break_time: '01:00:00' } };
        const { ref } = renderAssign();
        ref.current.setState({ owner_offset: 7200 });
        ref.current.setSchedule({ schedule_type: 'customize', schedule_details: dayDetails, schedule_policies: policies });

        const pov = ref.current.state.pov_schedule_details[0];
        expect(new Date(pov.start_time).getHours()).toBe(10); // 08:00 + 2h
    });
});

describe('ScheduleAssign — componentWillReceiveProps change detectors', () => {
    test('default_schedule change with page_reloaded triggers setSchedule', () => {
        const utils = renderAssign();
        rerenderAssign(utils, {
            page_reloaded: true,
            default_schedule: { schedule_type: 'standard', schedule_details: stdDetails, schedule_policies: policies, pov_schedule_details: null },
        });
        expect(utils.ref.current.state.isInitialDataLoaded).toBe(true);
        expect(utils.ref.current.state.std_schedule_details.length).toBe(1);
    });

    test('template_list change stores the list and computes the owner offset', () => {
        const utils = renderAssign();
        rerenderAssign(utils, { template_list: [{ id: 1, name: 'Night shift' }] });
        expect(utils.ref.current.state.templateList).toEqual([{ id: 1, name: 'Night shift' }]);
        expect(utils.ref.current.state.owner_offset).toBe(3600); // viewed 3600 - viewer 0
    });

    test('template_data change re-runs setSchedule with creation_type template', () => {
        const utils = renderAssign();
        rerenderAssign(utils, {
            template_data: {
                work_days: ['wed'], schedule_policies: policies,
                schedule_details: flexDetails, schedule_type: 'flexible',
            },
        });
        expect(utils.ref.current.state.creation_type).toBe('template');
        expect(utils.ref.current.state.work_day).toEqual(['wed']);
        expect(utils.ref.current.state.flx_schedule_details.length).toBe(1);
    });
});
