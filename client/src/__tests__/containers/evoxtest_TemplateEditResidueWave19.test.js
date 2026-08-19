/**
 * evoxtest_TemplateEditResidueWave19.test.js
 *
 * SOURCE FILE UNDER TEST
 *   src/container/Schedule/TemplateEdit/TemplateEdit.js
 *
 * MENU PATH
 *   Schedule -> Template List -> Edit   (route template_list + ':templateid')
 *
 * CURRENT MEASURED COVERAGE (full-suite run, 18 Aug, before this file)
 *   94.64% stmts / 85.29% branch / 93.33% fn - one uncovered function (the Standard
 *   radio, 143) and five branch arms.
 *
 * ARMS CLOSED HERE
 *   143-146  the Standard radio's onChange (the Flexible and Customize twins were already
 *            taken; this one was not)
 *   57       a stored template whose schedule_type matches none of standard / flexible /
 *            customize, so none of the three detail builders runs
 *   185      the Schedule Type validation message, both operands
 *   202      the `schedule_type === ''` arm of the detail-form chooser
 *   230      the trailing arm of the same chooser, for a type that is neither blank nor
 *            one of the three known values
 *
 * FINDINGS
 *   None new. BUG-7 (the constructor reading props.params rather than match.params) is
 *   already characterised in evoxtest_TemplateEditDeep2 and is not repeated here.
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
jest.mock('../../components/Template/BackButton', () => () => <div />);
jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading" />);
jest.mock('react-datepicker', () => () => <input type="date" />);
jest.mock('../../components/Schedule/ScheduleDetails.js', () => ({
    Scheduledetails: (props) => <div data-testid={'cst-day-' + props.day} />,
    ScheduledetailsWithTimezone: () => <div />,
    onSelectTimeHandlerStd: jest.fn(), onSelectTimeHandlerFlexi: jest.fn(),
    FlexibleSchedDetailsFormWithTimezone: () => <div />,
    SchedulePolicy: () => <div data-testid="schedule-policy" />,
    StandardSchedDetailsFormWithTimezone: () => <div />,
    WorkDays: () => <div data-testid="work-days" />,
    StandardSchedDetailsForm: () => <div data-testid="std-form" />,
    FlexibleSchedDetailsForm: () => <div data-testid="flx-form" />,
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

const flexTemplate = (over = {}) => ({
    isScheduleLoaded: true,
    name: 'Night shift',
    schedule_type: 'flexible',
    work_days: ['mon', 'tue'],
    schedule_policies: { allow_late: '1', allow_undertime: '0' },
    schedule_details: {
        all: {
            start_time: '21:00:00', end_time: '06:00:00',
            start_flexy_time: '22:00:00', end_flexy_time: '07:00:00', break_time: '01:00:00',
        },
    },
    ...over,
});

function renderTE(template) {
    const actions = { updateSchedule: jest.fn(), getTemplateSchedule: jest.fn() };
    const ref = React.createRef();
    const view = render(
        <MemoryRouter>
            <TemplateEdit ref={ref} user={{ id: 1 }} params={{ templateid: '5' }}
                template={template} {...actions} />
        </MemoryRouter>
    );
    return { ...view, ref, actions };
}

// The three schedule-type radios are the only radios on the page, in source order.
const typeRadio = (container, index) => container.querySelectorAll('input[type="radio"]')[index];

beforeEach(() => jest.clearAllMocks());

describe('Schedule -> Template List -> Edit: switching the schedule type', () => {

    test('switching a flexible template to Standard swaps in the standard detail form', () => {
        const { container, queryByTestId } = renderTE(flexTemplate());

        expect(queryByTestId('flx-form')).not.toBeNull();
        expect(queryByTestId('std-form')).toBeNull();

        act(() => { fireEvent.click(typeRadio(container, 0)); });

        expect(queryByTestId('std-form')).not.toBeNull();
        expect(queryByTestId('flx-form')).toBeNull();
        expect(typeRadio(container, 0).checked).toBe(true);
        expect(typeRadio(container, 1).checked).toBe(false);
    });

    test('switching to Customize swaps in one day block per work day the template carries', () => {
        const { container, queryByTestId } = renderTE(flexTemplate());

        act(() => { fireEvent.click(typeRadio(container, 2)); });

        expect(queryByTestId('cst-day-mon')).not.toBeNull();
        expect(queryByTestId('cst-day-tue')).not.toBeNull();
        expect(queryByTestId('cst-day-wed')).toBeNull();   // not a work day of this template
        expect(queryByTestId('flx-form')).toBeNull();
    });
});

describe('Schedule -> Template List -> Edit: a template stored without a usable schedule type', () => {

    test('a template whose type is blank opens with no detail form and no day blocks', () => {
        const { queryByTestId, queryByText } = renderTE(
            flexTemplate({ schedule_type: '', schedule_details: {} })
        );

        expect(queryByTestId('std-form')).toBeNull();
        expect(queryByTestId('flx-form')).toBeNull();
        expect(queryByTestId('cst-day-mon')).toBeNull();
        expect(queryByText('Standard Form')).toBeNull();
        expect(queryByText('Flexible Form')).toBeNull();
        expect(queryByText('Customize Schedule')).toBeNull();
        // the rest of the form is still editable
        expect(queryByText('Schedule Template')).not.toBeNull();
    });

    test('a template whose type is null behaves the same way and none of the three builders runs', () => {
        const { queryByTestId, container } = renderTE(
            flexTemplate({ schedule_type: null, schedule_details: {} })
        );

        expect(queryByTestId('std-form')).toBeNull();
        expect(queryByTestId('flx-form')).toBeNull();
        expect(queryByTestId('cst-day-mon')).toBeNull();
        // no type is pre-selected, so the admin must pick one before saving
        Array.from(container.querySelectorAll('input[type="radio"]'))
            .forEach((radio) => expect(radio.checked).toBe(false));
    });

    test('saving a template with no schedule type is rejected with the schedule-type message', async () => {
        const { container, actions, findAllByText } = renderTE(
            flexTemplate({ schedule_type: '', schedule_details: {} })
        );

        await act(async () => { fireEvent.submit(container.querySelector('form')); });

        expect(await findAllByText(/Please Select Schedule Type/)).not.toHaveLength(0);
        expect(actions.updateSchedule).not.toHaveBeenCalled();
    });

    test('picking a type clears that message but the save is still blocked until the shift times are filled', async () => {
        const { container, actions, queryByText } = renderTE(
            flexTemplate({ schedule_type: '', schedule_details: {} })
        );

        await act(async () => { fireEvent.submit(container.querySelector('form')); });
        expect(queryByText(/Please Select Schedule Type/)).not.toBeNull();

        // Standard inserts one blank row, so the schedule_type rule now passes while the
        // start / end / break rules on that row do not.
        await act(async () => { fireEvent.click(typeRadio(container, 0)); });

        expect(queryByText(/Please Select Schedule Type/)).toBeNull();
        await act(async () => { fireEvent.submit(container.querySelector('form')); });
        expect(actions.updateSchedule).not.toHaveBeenCalled();
    });

    test('a fully populated standard template saves through updateSchedule with the template id second', async () => {
        const { container, actions } = renderTE(flexTemplate({
            schedule_type: 'standard',
            schedule_details: { all: { start_time: '09:00:00', end_time: '18:00:00', break_time: '01:00:00' } },
        }));

        await act(async () => { fireEvent.submit(container.querySelector('form')); });

        expect(actions.updateSchedule).toHaveBeenCalledTimes(1);
        const [payload, templateId] = actions.updateSchedule.mock.calls[0];
        expect(templateId).toBe('5');
        expect(payload.schedule_type).toBe('standard');
        expect(payload.name).toBe('Night shift');
        expect(payload.source_type).toBe('template');
    });
});
