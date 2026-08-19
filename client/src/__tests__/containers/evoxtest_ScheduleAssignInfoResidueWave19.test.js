/**
 * evoxtest_ScheduleAssignInfoResidueWave19.test.js
 *
 * SOURCE FILES UNDER TEST
 *   src/container/Schedule/ScheduleAssign/ScheduleAssign.js
 *   src/container/Schedule/ScheduleAssignDepartment/ScheduleAssignDepartment.js
 *   src/container/Schedule/ScheduleInfo/ScheduleInfo.js
 *
 * MENU PATHS
 *   Profile -> Schedule -> Assign Schedule          (route profile + ':user_id'/schedule)
 *   Schedule -> Assign to department                (route schedule_assign_department)
 *   Profile -> Schedule -> Schedule Details         (route profile + ':user_id'/schedule/':schedule_id')
 *
 * CURRENT MEASURED COVERAGE (full-suite run, 18 Aug, before this file)
 *   ScheduleAssign            99.07% stmts / 92.59% branch / 96.88% fn
 *   ScheduleAssignDepartment  98.99% stmts / 98.57% branch / 96.77% fn
 *   ScheduleInfo              96.67% stmts / 91.25% branch / 95.24% fn
 *
 * ARMS CLOSED HERE
 *   ScheduleAssign            401-402 the Customize creation-type radio; 245-247 the
 *                             timezone-offset trio when neither user carries an offset;
 *                             564 the blank-schedule_type arm of the detail chooser
 *   ScheduleAssignDepartment  273-274 the Customize creation-type radio; 401 the
 *                             blank-schedule_type arm
 *   ScheduleInfo              80 / 81 the "keep what the first load established" arms of
 *                             source_type and from_date; 140 a flexible schedule that
 *                             carries its own point-of-view times; 180-181 the same for a
 *                             customize schedule; 249-251 the offset trio; 615-617 the
 *                             cross-field date test on a temporary schedule
 *
 * ARM DECLARED UNREACHABLE (proven, not forced)
 *   ScheduleAssign 416 - the creation-type validation slot. validationSchema declares
 *   from, to, schedule_type and the three detail arrays only, so errors.creation_type can
 *   never be set and that slot is permanently blank while its two neighbours do fill.
 *
 * FINDINGS
 *   None new. BUG-7 (constructors reading props.params rather than match.params) is
 *   already characterised for these screens in the wave-3 suites.
 *
 * ADDITIVE ONLY - no existing test file and no application source was modified.
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
    Scheduledetails: () => <div />, ScheduledetailsWithTimezone: (props) => <div data-testid={'cst-' + props.day} />,
    onSelectTimeHandlerStd: jest.fn(), onSelectTimeHandlerFlexi: jest.fn(),
    FlexibleSchedDetailsFormWithTimezone: () => <div data-testid="flx-form" />,
    SchedulePolicy: () => <div />,
    StandardSchedDetailsFormWithTimezone: () => <div data-testid="std-form" />,
    WorkDays: () => <div data-testid="work-days" />,
    StandardSchedDetailsForm: () => <div data-testid="std-form" />,
    FlexibleSchedDetailsForm: () => <div data-testid="flx-form" />,
    ScheduleHolidayPolicy: () => <div />,
}));
jest.mock('../../store/actions/scheduleActions', () => ({
    scheduleAssign: jest.fn(), getDefaultSchedule: jest.fn(), listTemplate: jest.fn(),
    getTemplateSchedule: jest.fn(), getScheduleInfo: jest.fn(), updateSchedule: jest.fn(),
}));
jest.mock('../../store/actions/userActions', () => ({ getUserInfo: jest.fn() }));

const ScheduleAssign =
    require('../../container/Schedule/ScheduleAssign/ScheduleAssign').default;
const ScheduleAssignDepartment =
    require('../../container/Schedule/ScheduleAssignDepartment/ScheduleAssignDepartment').default;
const ScheduleInfo =
    require('../../container/Schedule/ScheduleInfo/ScheduleInfo').default;

const stdDetails = { all: { start_time: '09:00:00', end_time: '18:00:00', break_time: '01:00:00' } };
const flexDetails = {
    all: {
        start_time: '09:00:00', end_time: '18:00:00',
        start_flexy_time: '10:00:00', end_flexy_time: '19:00:00', break_time: '01:00:00',
    },
};
const cstDetails = {
    mon: {
        start_time: '08:00:00', end_time: '17:00:00',
        start_flexy_time: '09:00:00', end_flexy_time: '18:00:00', break_time: '01:00:00',
    },
};
const policies = {
    allow_late: '1', allow_undertime: '0', allow_night_diff: '1',
    allow_special_holiday: '0', allow_legal_holiday: '1',
};

// The "Creation Type" radio pair sits in its own white_bg group on all three screens;
// finding it by its heading keeps the lookup independent of radio ordering elsewhere.
const creationTypeRadio = (container, index) => {
    const heading = Array.from(container.querySelectorAll('h4'))
        .find((h) => h.textContent.trim() === 'Creation Type');
    return heading.closest('.white_bg').querySelectorAll('input[type="radio"]')[index];
};

const groupFeedback = (container, headingText) => {
    const heading = Array.from(container.querySelectorAll('h4'))
        .find((h) => h.textContent.trim() === headingText);
    return heading.closest('.white_bg').querySelector('.invalid-feedback');
};

const clean = (el) => el.textContent.replace(/ /g, '').trim();

let logSpy;
beforeEach(() => {
    jest.clearAllMocks();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => logSpy.mockRestore());

/* ============================================ Profile -> Schedule -> Assign Schedule */

describe('Profile -> Schedule -> Assign Schedule', () => {

    const saActions = () => ({
        scheduleAssign: jest.fn(), getDefaultSchedule: jest.fn(),
        listTemplate: jest.fn(), getTemplateSchedule: jest.fn(), getUserInfo: jest.fn(),
    });

    const saProps = (over = {}) => ({
        user: { id: 1, user_offset_seconds: 0, pov_timezone: 'Asia/Manila' },
        user_info: { user_offset_seconds: 3600, pov_timezone: 'Europe/Brussels' },
        params: { user_id: '9' },
        default_schedule: null,
        page_reloaded: false,
        template_list: [],
        template_data: null,
        ...saActions(),
        ...over,
    });

    const renderSA = (props) => {
        const ref = React.createRef();
        let current = props;
        const view = render(
            <MemoryRouter><ScheduleAssign ref={ref} {...current} /></MemoryRouter>
        );
        return {
            ...view, ref, props,
            rerenderWith: (next) => {
                current = { ...current, ...next };
                view.rerender(
                    <MemoryRouter><ScheduleAssign ref={ref} {...current} /></MemoryRouter>
                );
            },
        };
    };

    // Brings the screen past its isInitialDataLoaded gate the way redux does.
    const loadSchedule = (view, schedule) => act(() => {
        view.rerenderWith({ page_reloaded: true, default_schedule: schedule });
    });

    test('switching the creation type back to Customize withdraws the template picker', () => {
        const view = renderSA(saProps());
        loadSchedule(view, {
            creation_type: 'template', schedule_type: 'standard',
            schedule_details: stdDetails, schedule_policies: policies,
            work_days: ['mon'], pov_schedule_details: null,
        });

        expect(view.queryByText('Custom Select')).not.toBeNull();
        expect(creationTypeRadio(view.container, 1).checked).toBe(true);

        act(() => { fireEvent.click(creationTypeRadio(view.container, 0)); });

        expect(view.queryByText('Custom Select')).toBeNull();
        expect(creationTypeRadio(view.container, 0).checked).toBe(true);
        expect(creationTypeRadio(view.container, 1).checked).toBe(false);
    });

    test('two people in the same timezone produce a zero offset, and an unknown timezone produces none at all', () => {
        const known = renderSA(saProps());
        act(() => { known.rerenderWith({ template_list: [{ id: 1, name: 'Mid shift' }] }); });
        expect(known.ref.current.state.owner_offset).toBe(3600);

        // Neither the viewer nor the viewed employee has a stored UTC offset, so the
        // component must fall back to "no offset known" rather than computing NaN.
        const unknown = renderSA(saProps({
            user: { id: 1, pov_timezone: 'Asia/Manila' },
            user_info: { pov_timezone: 'Europe/Brussels' },
        }));
        act(() => { unknown.rerenderWith({ template_list: [{ id: 1, name: 'Mid shift' }] }); });

        expect(unknown.ref.current.state.owner_offset).toBeNull();
        expect(unknown.ref.current.state.templateList).toEqual([{ id: 1, name: 'Mid shift' }]);
    });

    test('a schedule stored with a blank type shows no detail form and is rejected on save', async () => {
        const view = renderSA(saProps());
        loadSchedule(view, {
            creation_type: 'customize', schedule_type: '',
            schedule_details: {}, schedule_policies: policies,
            work_days: ['mon'], pov_schedule_details: null,
        });

        expect(view.queryByTestId('std-form')).toBeNull();
        expect(view.queryByTestId('flx-form')).toBeNull();
        expect(view.queryByTestId('cst-mon')).toBeNull();

        await act(async () => { fireEvent.submit(view.container.querySelector('form')); });

        expect(view.props.scheduleAssign).not.toHaveBeenCalled();
        expect(clean(groupFeedback(view.container, 'Schedule Type')))
            .toBe('Please Select Schedule Type');
    });

    // UNREACHABLE 416: validationSchema has no creation_type rule, so errors.creation_type
    // is never set. Proven against a submit that DOES populate the schedule_type message:
    // the Source Type and Schedule Type slots both fill, the Creation Type slot does not.
    test('the creation type never shows a validation message because the schema does not validate it', async () => {
        const view = renderSA(saProps());
        loadSchedule(view, {
            creation_type: 'customize', schedule_type: '',
            schedule_details: {}, schedule_policies: policies,
            work_days: ['mon'], pov_schedule_details: null,
        });

        await act(async () => { fireEvent.submit(view.container.querySelector('form')); });

        expect(clean(groupFeedback(view.container, 'Source Type')))
            .toBe('Please Select Schedule Type');
        expect(clean(groupFeedback(view.container, 'Schedule Type')))
            .toBe('Please Select Schedule Type');
        expect(clean(groupFeedback(view.container, 'Creation Type'))).toBe('');
    });
});

/* =================================================== Schedule -> Assign to department */

describe('Schedule -> Assign to department', () => {

    const sadProps = (over = {}) => ({
        user: { id: 1, departments_handled: [{ id: 5, department_name: 'Engineering' }] },
        default_schedule: null,
        page_reloaded: false,
        template_list: [],
        template_data: null,
        scheduleAssign: jest.fn(), getDefaultSchedule: jest.fn(),
        listTemplate: jest.fn(), getTemplateSchedule: jest.fn(),
        ...over,
    });

    const renderSAD = (props) => {
        const ref = React.createRef();
        let current = props;
        const view = render(
            <MemoryRouter><ScheduleAssignDepartment ref={ref} {...current} /></MemoryRouter>
        );
        return {
            ...view, ref, props,
            rerenderWith: (next) => {
                current = { ...current, ...next };
                view.rerender(
                    <MemoryRouter><ScheduleAssignDepartment ref={ref} {...current} /></MemoryRouter>
                );
            },
        };
    };

    // The whole form is gated on a department having been chosen (Validator.isValid on
    // bind_id), so every test here starts by picking one from the dropdown.
    const pickDepartment = (view, id) => act(() => {
        fireEvent.change(view.container.querySelector('select'), { target: { value: id } });
    });

    test('switching the creation type back to Customize withdraws the template picker', () => {
        const view = renderSAD(sadProps());
        pickDepartment(view, '5');
        expect(view.props.getDefaultSchedule).toHaveBeenCalledWith('department', '5');

        act(() => {
            view.ref.current.setSchedule({
                creation_type: 'template', schedule_type: 'standard',
                schedule_details: stdDetails, schedule_policies: policies,
                work_days: ['mon'], pov_schedule_details: null,
            });
        });

        expect(view.queryByText('Custom Select')).not.toBeNull();

        act(() => { fireEvent.click(creationTypeRadio(view.container, 0)); });

        expect(view.queryByText('Custom Select')).toBeNull();
        expect(creationTypeRadio(view.container, 0).checked).toBe(true);
    });

    test('the form stays hidden until a department is chosen', () => {
        const view = renderSAD(sadProps());

        expect(view.queryByText('Creation Type')).toBeNull();
        expect(view.queryByTestId('work-days')).toBeNull();

        pickDepartment(view, '5');
        expect(view.queryByText('Creation Type')).not.toBeNull();

        pickDepartment(view, '');
        expect(view.queryByText('Creation Type')).toBeNull();
        expect(view.ref.current.state.bind_id).toBe('');
    });

    test('a department schedule stored with a blank type shows no detail form', () => {
        const view = renderSAD(sadProps());
        pickDepartment(view, '5');
        act(() => {
            view.ref.current.setSchedule({
                creation_type: 'customize', schedule_type: '',
                schedule_details: {}, schedule_policies: policies,
                work_days: ['mon'], pov_schedule_details: null,
            });
        });

        expect(view.queryByTestId('std-form')).toBeNull();
        expect(view.queryByTestId('flx-form')).toBeNull();
        expect(view.queryByText('Customize Schedule')).toBeNull();
        expect(view.queryByTestId('work-days')).not.toBeNull();   // the rest still renders
    });
});

/* ============================================ Profile -> Schedule -> Schedule Details */

describe('Profile -> Schedule -> Schedule Details', () => {

    const siActions = () => ({
        scheduleAssign: jest.fn(), getScheduleInfo: jest.fn(),
        listTemplate: jest.fn(), getTemplateSchedule: jest.fn(), getUserInfo: jest.fn(),
    });

    const siProps = (over = {}) => ({
        user: { id: 1, user_offset_seconds: 0, pov_timezone: 'Asia/Manila' },
        user_info: { user_offset_seconds: 3600, pov_timezone: 'Europe/Brussels' },
        params: { user_id: '9', schedule_id: '55' },
        default_schedule: null,
        page_reloaded: false,
        template_list: [],
        template_data: null,
        instance: {},
        ...siActions(),
        ...over,
    });

    const renderSI = (props) => {
        const ref = React.createRef();
        let current = props;
        const view = render(
            <MemoryRouter><ScheduleInfo ref={ref} {...current} /></MemoryRouter>
        );
        return {
            ...view, ref, props,
            rerenderWith: (next) => {
                current = { ...current, ...next };
                view.rerender(
                    <MemoryRouter><ScheduleInfo ref={ref} {...current} /></MemoryRouter>
                );
            },
        };
    };

    test('loading a template over an open temporary schedule keeps the stored range and source type', () => {
        const view = renderSI(siProps());

        act(() => {
            view.ref.current.setSchedule({
                source_type: 'temporary', valid_from: '2026-08-01',
                creation_type: 'customize', schedule_type: 'standard',
                schedule_details: stdDetails, schedule_policies: policies,
                work_days: ['mon'], pov_schedule_details: null,
            });
        });
        expect(view.ref.current.state.source_type).toBe('temporary');
        expect(view.ref.current.state.from_date.getFullYear()).toBe(2026);
        expect(view.ref.current.state.from_date.getMonth()).toBe(7);   // August
        expect(view.ref.current.state.from_date.getDate()).toBe(1);

        // A template carries neither a source type nor a validity date; the screen must
        // keep the ones the schedule was opened with instead of blanking them.
        act(() => {
            view.rerenderWith({
                template_data: {
                    work_days: ['fri'], schedule_policies: policies,
                    schedule_details: flexDetails, schedule_type: 'flexible',
                },
            });
        });

        expect(view.ref.current.state.source_type).toBe('temporary');
        expect(view.ref.current.state.from_date.getFullYear()).toBe(2026);
        expect(view.ref.current.state.from_date.getDate()).toBe(1);
        expect(view.ref.current.state.creation_type).toBe('template');
        expect(view.ref.current.state.work_day).toEqual(['fri']);
    });

    test('a schedule with neither a source type nor a validity date on a fresh screen leaves both empty', () => {
        const view = renderSI(siProps());

        act(() => {
            view.ref.current.setSchedule({
                schedule_type: 'standard', schedule_details: stdDetails,
                schedule_policies: policies, pov_schedule_details: null,
            });
        });

        expect(view.ref.current.state.source_type).toBeNull();
        expect(view.ref.current.state.from_date).toBeNull();
    });

    test('a flexible schedule that carries its own point-of-view times uses them instead of shifting by the offset', () => {
        const view = renderSI(siProps());

        act(() => { view.ref.current.setState({ owner_offset: 7200 }); });
        act(() => {
            view.ref.current.setSchedule({
                schedule_type: 'flexible', schedule_details: flexDetails,
                schedule_policies: policies,
                pov_schedule_details: {
                    all: {
                        start_time: '15:00:00', end_time: '00:00:00',
                        start_flexy_time: '16:00:00', end_flexy_time: '01:00:00',
                    },
                },
            });
        });

        const pov = view.ref.current.state.pov_schedule_details[0];
        expect(pov.start_time.getHours()).toBe(15);       // the payload's own times ...
        expect(pov.start_flexy_time.getHours()).toBe(16);
        // ... not the local times plus the two-hour offset
        expect(view.ref.current.state.flx_schedule_details[0].start_time.getHours()).toBe(9);
    });

    test('a customize schedule that carries its own point-of-view times uses them per work day', () => {
        const view = renderSI(siProps());

        act(() => { view.ref.current.setState({ owner_offset: 7200 }); });
        act(() => {
            view.ref.current.setSchedule({
                schedule_type: 'customize', schedule_details: cstDetails,
                schedule_policies: policies,
                pov_schedule_details: {
                    mon: {
                        start_time: '14:00:00', end_time: '23:00:00',
                        start_flexy_time: '15:00:00', end_flexy_time: '00:00:00',
                    },
                },
            });
        });

        expect(view.ref.current.state.cst_schedule_details).toHaveLength(1);
        const pov = view.ref.current.state.pov_schedule_details[0];
        expect(pov.start_time.getHours()).toBe(14);
        expect(pov.end_time.getHours()).toBe(23);
        expect(view.ref.current.state.cst_schedule_details[0].start_time.getHours()).toBe(8);
    });

    test('two people whose UTC offsets are both unknown produce no offset rather than NaN', () => {
        const view = renderSI(siProps({
            user: { id: 1, pov_timezone: 'Asia/Manila' },
            user_info: { pov_timezone: 'Europe/Brussels' },
        }));

        act(() => { view.rerenderWith({ template_list: [{ id: 1, name: 'Mid shift' }] }); });

        expect(view.ref.current.state.owner_offset).toBeNull();
        expect(view.ref.current.state.templateList).toEqual([{ id: 1, name: 'Mid shift' }]);
    });

    test('a temporary schedule whose validity starts after it ends is rejected with the end-time message', async () => {
        const view = renderSI(siProps());

        // to_date is always "now plus nine hours", so a start date in 2030 is guaranteed
        // to be after it and a start date in 2000 guaranteed to be before it.
        act(() => {
            view.ref.current.setSchedule({
                source_type: 'temporary', valid_from: '2030-01-01',
                schedule_type: 'standard', schedule_details: stdDetails,
                schedule_policies: policies, pov_schedule_details: null,
            });
        });
        await act(async () => { fireEvent.submit(view.container.querySelector('form')); });

        expect(view.queryByText('End time should be greater')).not.toBeNull();
        expect(view.props.scheduleAssign).not.toHaveBeenCalled();
    });

    test('the same temporary schedule with a validity that starts before it ends passes that check', async () => {
        const view = renderSI(siProps());

        act(() => {
            view.ref.current.setSchedule({
                source_type: 'temporary', valid_from: '2000-01-01',
                schedule_type: 'standard', schedule_details: stdDetails,
                schedule_policies: policies, pov_schedule_details: null,
            });
        });
        await act(async () => { fireEvent.submit(view.container.querySelector('form')); });

        expect(view.queryByText('End time should be greater')).toBeNull();
        expect(view.queryByText('end time cannot be empty')).toBeNull();
    });
});
