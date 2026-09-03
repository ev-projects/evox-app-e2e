/**
 * evoxtest_TemplateCreateResidueWave19.test.js
 *
 * SOURCE FILE UNDER TEST
 *   src/container/Schedule/TemplateCreate/TemplateCreate.js
 *   (rendered with the REAL components/Schedule/ScheduleDetails.js, because the work-day
 *   checkboxes that drive the arms below live in that module)
 *
 * MENU PATH
 *   Schedule -> Template List -> Add Template   (route add_template)
 *
 * CURRENT MEASURED COVERAGE (full-suite run, 18 Aug, before this file)
 *   93.55% stmts / 87.50% branch / 100% fn - two statements (131, 197) and two branch
 *   arms left. Every existing suite picks a schedule type without first ticking a work
 *   day, so the customize day loop never runs a single iteration.
 *
 * ARMS CLOSED HERE
 *   131  the per-work-day row the Customize radio pushes into cst_schedule_details
 *   196  both arms of `work_days.includes(day)` inside the customize renderer
 *   197  the day block it returns
 *
 * ARM DECLARED UNREACHABLE (proven by enumeration, not forced)
 *   203  the trailing `: null` of the detail-form chooser. schedule_type starts as the
 *        empty string and the only writers are the three radios, which write exactly
 *        'standard', 'flexible' and 'customize'. The four preceding arms therefore cover
 *        every value the screen can produce; the test below walks all four.
 *
 * FINDINGS
 *   None.
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
    useDispatch: () => jest.fn(),
}));
jest.mock('axios');
jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader:  ({ children }) => <div>{children}</div>,
    Content:          ({ children }) => <div>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
}));
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('react-datepicker', () => (props) => (
    <input type="text" readOnly value="" onChange={() => props.onChange && props.onChange(null)} />
));
jest.mock('../../store/actions/scheduleActions', () => ({
    addTemplateSchedule: jest.fn(), updateSchedule: jest.fn(), getTemplateSchedule: jest.fn(),
    scheduleAssign: jest.fn(), getDefaultSchedule: jest.fn(), listTemplate: jest.fn(),
}));

const TemplateCreate = require('../../container/Schedule/TemplateCreate/TemplateCreate').default;

function renderTC() {
    const addTemplateSchedule = jest.fn();
    const view = render(
        <MemoryRouter>
            <TemplateCreate user={{ id: 1, full_name: 'Admin' }}
                history={{ push: jest.fn() }} location={{ search: '' }}
                addTemplateSchedule={addTemplateSchedule} />
        </MemoryRouter>
    );
    return { ...view, addTemplateSchedule };
}

// The three schedule-type radios are the only radios on the page, in source order.
const RADIO = { standard: 0, flexible: 1, customize: 2 };
const typeRadio = (container, kind) =>
    container.querySelectorAll('input[type="radio"]')[RADIO[kind]];

// The work-day checkboxes share the page with the holiday and schedule policy tick boxes,
// so they are found by the text of the label that wraps them.
const workDayBox = (container, dayName) =>
    Array.from(container.querySelectorAll('input[type="checkbox"]'))
        .find((box) => box.closest('label').textContent.replace(/ /g, ' ').trim() === dayName);

let logSpy;
beforeEach(() => {
    jest.clearAllMocks();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => logSpy.mockRestore());

describe('Schedule -> Add Template: the customize schedule builder', () => {

    test('a customize template renders one day block per ticked work day and none for the rest', () => {
        const { container, getByText, queryByText } = renderTC();

        act(() => { fireEvent.click(workDayBox(container, 'Monday')); });
        act(() => { fireEvent.click(workDayBox(container, 'Wednesday')); });
        act(() => { fireEvent.click(typeRadio(container, 'customize')); });

        getByText('Customize Schedule');
        getByText('Monday :');
        getByText('Wednesday :');
        expect(queryByText('Tuesday :')).toBeNull();
        expect(queryByText('Sunday :')).toBeNull();
    });

    test('the day blocks follow the work days, so unticking one removes its block', () => {
        const { container, getByText, queryByText } = renderTC();

        act(() => { fireEvent.click(workDayBox(container, 'Monday')); });
        act(() => { fireEvent.click(workDayBox(container, 'Tuesday')); });
        act(() => { fireEvent.click(typeRadio(container, 'customize')); });
        getByText('Monday :');
        getByText('Tuesday :');

        act(() => { fireEvent.click(workDayBox(container, 'Monday')); });

        expect(queryByText('Monday :')).toBeNull();
        expect(workDayBox(container, 'Monday').checked).toBe(false);
        expect(workDayBox(container, 'Tuesday').checked).toBe(true);
    });

    test('picking Customize before any work day is ticked shows the section with no day blocks', () => {
        const { container, getByText, queryByText } = renderTC();

        act(() => { fireEvent.click(typeRadio(container, 'customize')); });

        getByText('Customize Schedule');
        ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            .forEach((day) => expect(queryByText(day + ' :')).toBeNull());
    });
});

describe('Schedule -> Add Template: the detail-form chooser', () => {

    // UNREACHABLE 203: enumerating every value schedule_type can hold on this screen.
    // The initial value is '' and the three radios are its only writers, so the chooser's
    // four arms are exhaustive and the trailing null can never be selected.
    test('the form starts with no detail section and each of the three radios reveals exactly its own', () => {
        const { container, queryByText } = renderTC();

        const sections = () => ['Standard Form', 'Flexible Form', 'Customize Schedule']
            .filter((heading) => queryByText(heading) !== null);

        expect(sections()).toEqual([]);                       // schedule_type === ''

        act(() => { fireEvent.click(typeRadio(container, 'standard')); });
        expect(sections()).toEqual(['Standard Form']);

        act(() => { fireEvent.click(typeRadio(container, 'flexible')); });
        expect(sections()).toEqual(['Flexible Form']);

        act(() => { fireEvent.click(typeRadio(container, 'customize')); });
        expect(sections()).toEqual(['Customize Schedule']);
    });

    test('a template with no name and no schedule type is rejected before anything is posted', async () => {
        const { container, addTemplateSchedule, findByText } = renderTC();

        await act(async () => { fireEvent.submit(container.querySelector('form')); });

        await findByText(/Please Select Schedule Type/);
        expect(addTemplateSchedule).not.toHaveBeenCalled();
    });
});
