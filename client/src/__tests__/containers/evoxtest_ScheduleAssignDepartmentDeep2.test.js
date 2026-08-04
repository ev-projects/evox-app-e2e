/**
 * evoxtest_ScheduleAssignDepartmentDeep2.test.js
 * Wave-3 coverage for container/Schedule/ScheduleAssignDepartment/ScheduleAssignDepartment.js
 * (29 Jul: 67 unc / 30.2%). Arms: mount template fetch, onSubmitHandler's four
 * confirm-message arms + declined confirm, department load/clear cascade,
 * setSchedule standard/flexible/customize (+policy defaults: special/legal default
 * to 1 here, unlike ScheduleAssign's 0), template creation_type skips the date reset,
 * and the three cWRP detectors incl. the isValid(template_data) guard.
 * ADDITIVE ONLY. Menu: Schedule → Assign to department (route: schedule_assign_department).
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
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/Template/Wrapper/index.js', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/Template/BackButton', () => () => <div />);
jest.mock('../../components/Template/BackButton/index.js', () => () => <div />);
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
    scheduleAssign: jest.fn(), getDefaultSchedule: jest.fn(), listTemplate: jest.fn(), getTemplateSchedule: jest.fn(),
}));
jest.mock('../../store/actions/userActions', () => ({ getUserInfo: jest.fn() }));

const ScheduleAssignDepartment =
    require('../../container/Schedule/ScheduleAssignDepartment/ScheduleAssignDepartment').default;

function makeActions() {
    return {
        scheduleAssign: jest.fn(), getDefaultSchedule: jest.fn(),
        listTemplate: jest.fn(), getTemplateSchedule: jest.fn(),
    };
}

const baseProps = {
    user: { id: 1, departments_handled: [{ id: 5, department_name: 'Engineering' }] },
    default_schedule: null,
    page_reloaded: false,
    template_list: [],
    template_data: null,
};

function renderSAD(props = {}, actions = makeActions()) {
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter>
            <ScheduleAssignDepartment ref={ref} {...baseProps} {...actions} {...props} />
        </MemoryRouter>
    );
    return { ...utils, ref, actions, props: { ...baseProps, ...actions, ...props } };
}

const stdDetails = { all: { start_time: '09:00:00', end_time: '18:00:00', break_time: '01:00:00' } };
const flexDetails = { all: { start_time: '09:00:00', end_time: '18:00:00', start_flexy_time: '10:00:00', end_flexy_time: '19:00:00', break_time: '01:00:00' } };

beforeEach(() => jest.clearAllMocks());

describe('ScheduleAssignDepartment — mount, submit and department cascade', () => {
    test('mount fetches the template list', () => {
        const { actions } = renderSAD();
        expect(actions.listTemplate).toHaveBeenCalled();
    });

    test('each action arm builds its confirm message; accept dispatches, decline does not', () => {
        const confirmSpy = jest.spyOn(window, 'confirm');
        const { ref, actions } = renderSAD();
        const values = () => ({ from: new Date(2026, 7, 1), to: new Date(2026, 7, 31) });

        const arms = [
            ['update', /Update Department Schedule/],
            ['assign_schedule_holiday_policy', /Holiday policies to ALL Employees/],
            ['assign_schedule_policy', /Schedule policies to ALL Employees/],
            ['assign', /update their DTR records/],
        ];
        for (const [action, msg] of arms) {
            confirmSpy.mockReturnValueOnce(true);
            ref.current.onSubmitHandler({ ...values(), action });
            expect(confirmSpy.mock.calls.slice(-1)[0][0]).toMatch(msg);
        }
        expect(actions.scheduleAssign).toHaveBeenCalledTimes(4);
        // FINDING SAD-TZ-1: valid_from/valid_to use toISOString() (UTC) instead of the
        // local-date format the sibling ScheduleAssign uses (moment .format) — for every
        // user east of UTC a picked date of Aug 1 submits as Jul 31 (off-by-one day).
        // This assertion locks in the buggy UTC value; flip to '2026-08-01' when fixed.
        expect(actions.scheduleAssign.mock.calls[0][0].valid_from).toBe('2026-07-31');

        confirmSpy.mockReturnValueOnce(false);
        ref.current.onSubmitHandler({ ...values(), action: 'update' });
        expect(actions.scheduleAssign).toHaveBeenCalledTimes(4); // declined
        confirmSpy.mockRestore();
    });

    test('loadDepartmentSchedule fetches by department and clears on empty; template load guards invalid ids', () => {
        const { ref, actions } = renderSAD();

        ref.current.loadDepartmentSchedule(5);
        expect(ref.current.state.bind_id).toBe(5);
        expect(actions.getDefaultSchedule).toHaveBeenCalledWith('department', 5);

        ref.current.loadDepartmentSchedule('');
        expect(ref.current.state.bind_id).toBe('');
        expect(actions.getDefaultSchedule).toHaveBeenCalledTimes(1);

        ref.current.loadTemplateSched('');
        expect(actions.getTemplateSchedule).not.toHaveBeenCalled();
        ref.current.loadTemplateSched(9);
        expect(actions.getTemplateSchedule).toHaveBeenCalledWith(9, 'Default');
    });
});

describe('ScheduleAssignDepartment — setSchedule arms', () => {
    test('standard/flexible/customize map times; special/legal holiday default to 1 here', () => {
        const { ref } = renderSAD();

        ref.current.setSchedule({
            schedule_type: 'standard', schedule_details: stdDetails,
            schedule_policies: { allow_late: '1' }, valid_from: '2026-08-01',
        });
        expect(ref.current.state.std_schedule_details[0].start_time.getHours()).toBe(9);
        expect(ref.current.state.schedule_policies.allow_special_holiday).toBe(1); // default 1
        expect(ref.current.state.schedule_policies.allow_late).toBe(1);
        expect(ref.current.state.schedule_policies.allow_undertime).toBe(0);
        expect(ref.current.state.from_date).toEqual(new Date('2026-08-01'));

        ref.current.setSchedule({ schedule_type: 'flexible', schedule_details: flexDetails, schedule_policies: {} });
        expect(ref.current.state.flx_schedule_details[0].end_flexy_time.getHours()).toBe(19);

        ref.current.setSchedule({
            schedule_type: 'customize', schedule_policies: {},
            schedule_details: {
                mon: { start_time: '08:00:00', end_time: '17:00:00', start_flexy_time: '09:00:00', end_flexy_time: '18:00:00', break_time: '01:00:00' },
                tue: { start_time: '10:00:00', end_time: '19:00:00', start_flexy_time: '11:00:00', end_flexy_time: '20:00:00', break_time: '01:00:00' },
            },
        });
        expect(ref.current.state.cst_schedule_details.length).toBe(2);
        expect(ref.current.state.cst_schedule_details[1].start_time.getHours()).toBe(10);
    });

    test('template creation_type keeps the existing date range (skip-reset arm)', () => {
        const { ref } = renderSAD();
        const keep = new Date('2026-08-05');
        ref.current.setState({ from_date: keep });
        ref.current.setSchedule({
            creation_type: 'template', schedule_type: 'standard',
            schedule_details: stdDetails, schedule_policies: {},
        });
        expect(ref.current.state.from_date).toBe(keep); // untouched by template arm
    });
});

describe('ScheduleAssignDepartment — componentWillReceiveProps detectors', () => {
    function rerenderSAD(utils, nextProps) {
        utils.rerender(
            <MemoryRouter>
                <ScheduleAssignDepartment ref={utils.ref} {...utils.props} {...nextProps} />
            </MemoryRouter>
        );
    }

    test('default_schedule, template_list and guarded template_data arms', () => {
        const utils = renderSAD();

        rerenderSAD(utils, {
            page_reloaded: true,
            default_schedule: { schedule_type: 'standard', schedule_details: stdDetails, schedule_policies: {} },
        });
        expect(utils.ref.current.state.std_schedule_details.length).toBe(1);

        rerenderSAD(utils, { template_list: [{ id: 2, name: 'Day' }] });
        expect(utils.ref.current.state.templateList).toEqual([{ id: 2, name: 'Day' }]);

        rerenderSAD(utils, { template_data: null }); // isValid guard → no crash, no change
        rerenderSAD(utils, {
            template_data: { work_days: ['sat'], schedule_policies: {}, schedule_details: flexDetails, schedule_type: 'flexible' },
        });
        expect(utils.ref.current.state.creation_type).toBe('template');
        expect(utils.ref.current.state.work_day).toEqual(['sat']);
    });
});
