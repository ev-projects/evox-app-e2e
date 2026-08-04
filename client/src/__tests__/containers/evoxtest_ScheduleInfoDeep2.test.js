/**
 * evoxtest_ScheduleInfoDeep2.test.js
 * Wave-3 coverage for container/Schedule/ScheduleInfo/ScheduleInfo.js
 * (29 Jul: 67 unc / 25.6%). Near-clone of ScheduleAssign: setSchedule
 * standard/flexible/customize arms with POV/owner-offset fallbacks, mount fetches
 * (getScheduleInfo with schedule_id), onSubmitHandler, cWRP detectors — plus the
 * BUG-7 characterization: the constructor reads v3-style `this.props.params.user_id`,
 * so mounting from the real v4 route (no params prop) THROWS.
 * ADDITIVE ONLY. Menu: Profile → Schedule → Info (route: profile+':user_id'/schedule/':schedule_id').
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
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/Template/BackButton/index.js', () => () => <div />);
jest.mock('../../components/Template/BackButton', () => () => <div />);
jest.mock('../../components/RequestComponent/RequestButtons/RequestSubtitle', () => () => <div />);
jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading" />);
jest.mock('react-datepicker', () => () => <input type="date" />);
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
    scheduleAssign: jest.fn(), getDefaultSchedule: jest.fn(), listTemplate: jest.fn(),
    getTemplateSchedule: jest.fn(), getScheduleInfo: jest.fn(),
}));
jest.mock('../../store/actions/userActions', () => ({ getUserInfo: jest.fn() }));

import Formatter from '../../services/Formatter';

const ScheduleInfo = require('../../container/Schedule/ScheduleInfo/ScheduleInfo').default;

function makeActions() {
    return {
        scheduleAssign: jest.fn(), getScheduleInfo: jest.fn(),
        listTemplate: jest.fn(), getTemplateSchedule: jest.fn(), getUserInfo: jest.fn(),
    };
}

const baseProps = {
    user: { id: 1, user_offset_seconds: 0 },
    user_info: { user_offset_seconds: 3600 },
    params: { user_id: '9', schedule_id: '55' },
    default_schedule: null,
    page_reloaded: false,
    template_list: [],
    template_data: null,
    instance: {},
};

function renderInfo(props = {}, actions = makeActions()) {
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter>
            <ScheduleInfo ref={ref} {...baseProps} {...actions} {...props} />
        </MemoryRouter>
    );
    return { ...utils, ref, actions, props: { ...baseProps, ...actions, ...props } };
}

const stdDetails = { all: { start_time: '09:00:00', end_time: '18:00:00', break_time: '01:00:00' } };
const flexDetails = { all: { start_time: '09:00:00', end_time: '18:00:00', start_flexy_time: '10:00:00', end_flexy_time: '19:00:00', break_time: '01:00:00' } };
const policies = { allow_late: '1', allow_undertime: '0', allow_night_diff: '1', allow_special_holiday: '0', allow_legal_holiday: '1' };

beforeEach(() => jest.clearAllMocks());

describe('ScheduleInfo — BUG-7 characterization', () => {
    test('FINDING BUG-7 instance: mounting without a params prop (the real v4 route shape) throws', () => {
        // The constructor reads `this.props.params.user_id`; the v4 route provides only
        // `match.params`, so the real page crashes on mount. Fix: read match.params.
        // Flip to a passing render when fixed.
        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
        expect(() => render(
            <MemoryRouter>
                <ScheduleInfo {...baseProps} {...makeActions()} params={undefined} />
            </MemoryRouter>
        )).toThrow(TypeError);
        spy.mockRestore();
    });
});

describe('ScheduleInfo — mount and submit', () => {
    test('mount fetches user info and the schedule info by user + schedule id', () => {
        const { actions } = renderInfo();
        expect(actions.getUserInfo).toHaveBeenCalledWith('9');
        expect(actions.getScheduleInfo).toHaveBeenCalledWith('user', '9', '55');
    });

    test('onSubmitHandler formats and dispatches scheduleAssign; loadTemplateSched fetches Default', () => {
        const { ref, actions } = renderInfo();
        ref.current.onSubmitHandler({ from: new Date(2026, 7, 1), to: new Date(2026, 7, 31) });
        expect(actions.scheduleAssign.mock.calls[0][0].valid_from).toBe('2026-08-01');

        ref.current.loadTemplateSched(3);
        expect(actions.getTemplateSchedule).toHaveBeenCalledWith(3, 'Default');
    });
});

describe('ScheduleInfo — setSchedule arms', () => {
    test('standard with POV; flexible and customize with owner-offset fallbacks', () => {
        const { ref } = renderInfo();

        ref.current.setSchedule({
            schedule_type: 'standard', schedule_details: stdDetails, schedule_policies: policies,
            pov_schedule_details: { all: { start_time: '11:00:00', end_time: '20:00:00' } },
        });
        expect(ref.current.state.std_schedule_details[0].start_time.getHours()).toBe(9);
        expect(ref.current.state.pov_schedule_details[0].start_time.getHours()).toBe(11);

        ref.current.setState({ owner_offset: 3600 });
        ref.current.setSchedule({
            schedule_type: 'flexible', schedule_details: flexDetails, schedule_policies: policies,
            pov_schedule_details: null,
        });
        expect(ref.current.state.flx_schedule_details[0].start_flexy_time.getHours()).toBe(10);
        expect(new Date(ref.current.state.pov_schedule_details[0].end_flexy_time).getHours()).toBe(20);

        ref.current.setState({ owner_offset: 7200 });
        ref.current.setSchedule({
            schedule_type: 'customize', schedule_policies: policies,
            schedule_details: { mon: { start_time: '08:00:00', end_time: '17:00:00', start_flexy_time: '09:00:00', end_flexy_time: '18:00:00', break_time: '01:00:00' } },
        });
        expect(ref.current.state.cst_schedule_details.length).toBe(1);
        expect(new Date(ref.current.state.pov_schedule_details[0].start_time).getHours()).toBe(10);
    });
});

describe('ScheduleInfo — componentWillReceiveProps detectors', () => {
    function rerenderInfo(utils, nextProps) {
        utils.rerender(
            <MemoryRouter>
                <ScheduleInfo ref={utils.ref} {...utils.props} {...nextProps} />
            </MemoryRouter>
        );
    }

    test('default_schedule + page_reloaded, template_list offset, and template_data arms', () => {
        const utils = renderInfo();

        rerenderInfo(utils, {
            page_reloaded: true,
            default_schedule: { schedule_type: 'standard', schedule_details: stdDetails, schedule_policies: policies, pov_schedule_details: null },
        });
        expect(utils.ref.current.state.std_schedule_details.length).toBe(1);

        rerenderInfo(utils, { template_list: [{ id: 1, name: 'Shift' }] });
        expect(utils.ref.current.state.templateList).toEqual([{ id: 1, name: 'Shift' }]);
        expect(utils.ref.current.state.owner_offset).toBe(3600);

        rerenderInfo(utils, {
            template_data: { work_days: ['fri'], schedule_policies: policies, schedule_details: flexDetails, schedule_type: 'flexible' },
        });
        expect(utils.ref.current.state.creation_type).toBe('template');
        expect(utils.ref.current.state.work_day).toEqual(['fri']);
    });
});
