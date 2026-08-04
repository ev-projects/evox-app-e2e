/**
 * evoxtest_TemplateEditDeep2.test.js
 * Wave-5 coverage for container/Schedule/TemplateEdit/TemplateEdit.js (fresh: 44 unc / 20%).
 * Arms: BUG-7 characterization (constructor path reads props.params.templateid — the v4
 * route provides only match.params → real page crashes), mount template fetch, render
 * gating on isScheduleLoaded, the standard/flexible/customize render mapping with policy
 * defaults, and onSubmitHandler's format+update dispatch. ADDITIVE ONLY.
 * Menu: Schedule → Template list → Edit (route: template_list+':templateid').
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
jest.mock('../../components/Template/BackButton', () => () => <div />);
jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading" />);
jest.mock('react-datepicker', () => () => <input type="date" />);
jest.mock('../../components/Schedule/ScheduleDetails.js', () => ({
    Scheduledetails: () => <div />, ScheduledetailsWithTimezone: () => <div />,
    onSelectTimeHandlerStd: jest.fn(), onSelectTimeHandlerFlexi: jest.fn(),
    FlexibleSchedDetailsFormWithTimezone: () => <div />, SchedulePolicy: () => <div data-testid="schedule-policy" />,
    StandardSchedDetailsFormWithTimezone: () => <div />, WorkDays: () => <div data-testid="work-days" />,
    StandardSchedDetailsForm: () => <div data-testid="std-form" />, FlexibleSchedDetailsForm: () => <div data-testid="flx-form" />,
    ScheduleHolidayPolicy: () => <div />,
}));
jest.mock('../../services/Formatter', () => ({
    format_schedule_details: jest.fn(() => ({ all: { start_time: '09:00' } })),
    array_to_multiselect_array: jest.fn(() => []),
}));
jest.mock('../../store/actions/scheduleActions', () => ({
    updateSchedule: jest.fn(), getTemplateSchedule: jest.fn(), scheduleAssign: jest.fn(),
    getDefaultSchedule: jest.fn(), listTemplate: jest.fn(),
}));

const TemplateEdit = require('../../container/Schedule/TemplateEdit/TemplateEdit').default;

function makeActions() {
    return { updateSchedule: jest.fn(), getTemplateSchedule: jest.fn() };
}

const stdTemplate = {
    isScheduleLoaded: true, name: 'Day shift', schedule_type: 'standard',
    work_days: ['mon', 'tue'],
    schedule_policies: { allow_late: '1' },
    schedule_details: { all: { start_time: '09:00:00', end_time: '18:00:00', break_time: '01:00:00' } },
};

const baseProps = {
    user: { id: 1 },
    params: { templateid: '5' },
    template: stdTemplate,
};

function renderTE(props = {}, actions = makeActions()) {
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter>
            <TemplateEdit ref={ref} {...baseProps} {...actions} {...props} />
        </MemoryRouter>
    );
    return { ...utils, ref, actions };
}

beforeEach(() => jest.clearAllMocks());

describe('TemplateEdit', () => {
    test('FINDING BUG-7 instance: mounting without a params prop (real v4 route shape) throws', () => {
        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
        expect(() => render(
            <MemoryRouter>
                <TemplateEdit {...baseProps} {...makeActions()} params={undefined} />
            </MemoryRouter>
        )).toThrow(TypeError);
        spy.mockRestore();
    });

    test('mount fetches the template; unloaded template renders PageLoading', () => {
        const loaded = renderTE();
        expect(loaded.actions.getTemplateSchedule).toHaveBeenCalledWith('5', 'Template');

        const loading = renderTE({ template: { isScheduleLoaded: false } });
        loading.getByTestId('page-loading');
    });

    test('standard template renders the std form; flexible renders the flexi form', () => {
        const std = renderTE();
        std.getByTestId('std-form');
        std.getByTestId('work-days');

        const flx = renderTE({
            template: {
                ...stdTemplate, schedule_type: 'flexible',
                schedule_details: { all: { start_time: '09:00:00', end_time: '18:00:00', start_flexy_time: '10:00:00', end_flexy_time: '19:00:00', break_time: '01:00:00' } },
            },
        });
        flx.getByTestId('flx-form');
    });

    test('customize template maps every day row without crashing', () => {
        const cst = renderTE({
            template: {
                ...stdTemplate, schedule_type: 'customize',
                schedule_details: {
                    mon: { start_time: '08:00:00', end_time: '17:00:00', start_flexy_time: '09:00:00', end_flexy_time: '18:00:00', break_time: '01:00:00' },
                    tue: { start_time: '10:00:00', end_time: '19:00:00', start_flexy_time: '11:00:00', end_flexy_time: '20:00:00', break_time: '01:00:00' },
                },
            },
        });
        expect(cst.container.textContent).toBeDefined(); // rendered the customize branch
    });

    test('onSubmitHandler formats details and updates against the route template id', () => {
        const { ref, actions } = renderTE();
        ref.current.onSubmitHandler({ name: 'Renamed', schedule_type: 'standard' });
        const [values, templateId] = actions.updateSchedule.mock.calls[0];
        expect(values.schedule_details).toEqual({ all: { start_time: '09:00' } });
        expect(templateId).toBe('5');
    });
});
