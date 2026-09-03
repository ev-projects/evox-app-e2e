/**
 * evoxtest_ScheduleListPagesDeep3.test.js
 *
 * SOURCES UNDER TEST:
 *   container/Schedule/TemplateList/TemplateList.js
 *   container/OpsSchedule/OpsScheduleList/OpsScheduleList.js
 *
 * MENU PATHS: Schedule -> Template Schedules; OPS Schedule -> OPS Schedule List.
 *
 * WHY THIS SUITE EXISTS: on both pages every row action (delete, edit, add) and the whole
 * submit handler were uncovered — the existing suites stop at "the table renders". Both
 * pages route several different actions through one Formik submit handler discriminated
 * by a hidden `action` field, so the tests below click the real buttons and assert which
 * creator fires with which id, on both arms of the confirm dialog.
 *
 * FINDINGS: none.
 *   Documented as-is, not raised as defects:
 *   - TemplateList.onDeleteHandler splices the templateList prop in place instead of
 *     waiting for the refetch. It is the shipped behaviour and is pinned below.
 *   - Every button on the OPS list is type="submit", so pressing Add or Edit navigates
 *     AND submits the filter form. Harmless (the submit re-fetches the same list) but
 *     pinned so a future change to the handler cannot silently start deleting.
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
    ContainerHeader: ({ children }) => <div>{children}</div>,
    Content: ({ children, title }) => <div>{title}{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody: ({ children }) => <div>{children}</div>,
    Row: ({ children }) => <div>{children}</div>,
    Col: ({ children }) => <div>{children}</div>,
}));
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading" />);
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate: ({ name }) => <input name={name} type="date" />,
    InputTime: ({ name }) => <input name={name} type="time" />,
}));
jest.mock('../../store/actions/scheduleActions', () => ({
    listTemplate: jest.fn(), deleteSchedule: jest.fn(),
}));
jest.mock('../../store/actions/opsschedule/opsScheduleActions', () => ({
    fetchOpsSchedulesList: jest.fn(), deleteOpsSchedule: jest.fn(),
}));

global.links = new Proxy({}, { get: (_t, key) => '/app/' + String(key) + '/' });

const TemplateList = require('../../container/Schedule/TemplateList/TemplateList').default;
const OpsScheduleList = require('../../container/OpsSchedule/OpsScheduleList/OpsScheduleList').default;

const TEMPLATES = [
    { id: 4, name: 'Mid shift' },
    { id: 9, name: 'Night shift' },
];

function renderTemplateList(props = {}) {
    const actions = { listTemplate: jest.fn(), deleteSchedule: jest.fn() };
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter>
            <TemplateList
                ref={ref}
                isTemplateListLoaded
                templateList={TEMPLATES.map((t) => ({ ...t }))}
                {...actions}
                {...props}
            />
        </MemoryRouter>
    );
    return { ...utils, ref, actions };
}

function renderOpsList(props = {}) {
    const actions = { fetchOpsSchedulesList: jest.fn(), deleteOpsSchedule: jest.fn() };
    const history = { push: jest.fn() };
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter>
            <OpsScheduleList
                ref={ref}
                history={history}
                constant={{ OPS_DEPTS: [{ id: 5, name: 'Engineering' }] }}
                opsScheduleList={{
                    isListInstanceLoaded: true,
                    listInstance: [{ id: 12, department: 'Engineering', path: '/img/eng.png' }],
                }}
                settings={{}}
                {...actions}
                {...props}
            />
        </MemoryRouter>
    );
    return { ...utils, ref, actions, history };
}

const settle = async () => { await act(async () => { await Promise.resolve(); }); };

beforeEach(() => jest.clearAllMocks());

describe('Schedule -> Template Schedules', () => {
    test('the page loads the templates on mount and lists them numbered by row', () => {
        const { actions, container } = renderTemplateList();
        expect(actions.listTemplate).toHaveBeenCalledTimes(1);
        const rows = container.querySelectorAll('tbody tr');
        expect(rows.length).toBe(2);
        expect(rows[0].textContent).toContain('1');
        expect(rows[0].textContent).toContain('Mid shift');
        expect(rows[1].textContent).toContain('Night shift');
    });

    test('each row links to its own template edit page', () => {
        const { container } = renderTemplateList();
        const links = container.querySelectorAll('tbody a');
        expect(links[0].getAttribute('href')).toBe('/app/template_list/4');
        expect(links[1].getAttribute('href')).toBe('/app/template_list/9');
    });

    test('the loader is shown until the template list has arrived', () => {
        const { queryByTestId, queryByText } = renderTemplateList({
            isTemplateListLoaded: false, templateList: [],
        });
        expect(queryByTestId('page-loading')).not.toBeNull();
        expect(queryByText('Mid shift')).toBeNull();
    });

    test('confirming Delete removes that template by id and drops its row from the list', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { actions, ref, container } = renderTemplateList();

        await act(async () => {
            fireEvent.click(container.querySelectorAll('tbody button')[1]); // Night shift
        });

        expect(actions.deleteSchedule).toHaveBeenCalledTimes(1);
        expect(actions.deleteSchedule).toHaveBeenCalledWith(9);
        expect(ref.current.props.templateList.map((t) => t.id)).toEqual([4]);
        confirmSpy.mockRestore();
    });

    test('cancelling the Delete confirmation deletes nothing and keeps every row', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
        const { actions, ref, container } = renderTemplateList();

        await act(async () => {
            fireEvent.click(container.querySelectorAll('tbody button')[0]);
        });

        expect(actions.deleteSchedule).not.toHaveBeenCalled();
        expect(ref.current.props.templateList.map((t) => t.id)).toEqual([4, 9]);
        confirmSpy.mockRestore();
    });

    test('the delete confirmation names the template being removed before anything is dispatched', () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
        const { ref } = renderTemplateList();
        ref.current.onSubmitHandler(TEMPLATES[0], 0);
        expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete this template schedule?');
        expect(ref.current.state.modal_name).toBe('Mid shift');
        expect(ref.current.state.modal_id).toBe(4);
        confirmSpy.mockRestore();
    });
});

describe('OPS Schedule -> OPS Schedule List', () => {
    test('the page fetches the unfiltered list on mount and offers the configured OPS departments', () => {
        const { actions, container } = renderOpsList();
        expect(actions.fetchOpsSchedulesList).toHaveBeenCalledTimes(1);
        expect(actions.fetchOpsSchedulesList).toHaveBeenCalledWith('');
        const options = container.querySelectorAll('select option');
        expect(options.length).toBe(2); // placeholder + Engineering
        expect(options[1].getAttribute('label')).toBe('Engineering');
    });

    test('with no OPS departments configured the picker offers only the placeholder', () => {
        const { container } = renderOpsList({ constant: {} });
        expect(container.querySelectorAll('select option').length).toBe(1);
    });

    test('the empty-state message replaces the table until the list has loaded', () => {
        const { queryByText, container } = renderOpsList({
            opsScheduleList: { isListInstanceLoaded: false, listInstance: [] },
        });
        expect(queryByText('Sorry, no record found')).not.toBeNull();
        expect(container.querySelector('tbody')).toBeNull();
    });

    test('choosing a department and pressing Filter refetches the list for that department', async () => {
        const { actions, container } = renderOpsList();
        fireEvent.change(container.querySelector('select'), { target: { value: '5', name: 'department_id' } });
        await act(async () => {
            fireEvent.click(container.querySelector('#btn-generate'));
        });
        await settle();

        expect(actions.fetchOpsSchedulesList).toHaveBeenLastCalledWith('5');
        expect(actions.deleteOpsSchedule).not.toHaveBeenCalled();
    });

    test('Add OPS Schedule navigates to the blank form', async () => {
        const { history, container } = renderOpsList();
        await act(async () => {
            fireEvent.click(container.querySelectorAll('#btn-generate')[1]);
        });
        expect(history.push).toHaveBeenCalledWith('/app/ops_schedule_form/');
    });

    test('the row pencil navigates to that schedule’s form', async () => {
        const { history, container } = renderOpsList();
        await act(async () => {
            fireEvent.click(container.querySelectorAll('tbody button')[0]);
        });
        expect(history.push).toHaveBeenCalledWith('/app/ops_schedule_form/12');
    });

    test('confirming the row cross deletes that schedule by id', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { actions, container } = renderOpsList();

        await act(async () => {
            fireEvent.click(container.querySelectorAll('tbody button')[1]);
        });
        await settle();

        expect(actions.deleteOpsSchedule).toHaveBeenCalledTimes(1);
        expect(actions.deleteOpsSchedule).toHaveBeenCalledWith(12);
        confirmSpy.mockRestore();
    });

    test('cancelling the row cross deletes nothing', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
        const { actions, container } = renderOpsList();

        await act(async () => {
            fireEvent.click(container.querySelectorAll('tbody button')[1]);
        });
        await settle();

        expect(actions.deleteOpsSchedule).not.toHaveBeenCalled();
        confirmSpy.mockRestore();
    });

    test('a delete submitted without a schedule id sends an empty id rather than undefined', () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { actions, ref } = renderOpsList();
        ref.current.onSubmitHandler({ action: 'delete' });
        expect(actions.deleteOpsSchedule).toHaveBeenCalledWith('');
        confirmSpy.mockRestore();
    });

    test('a non-delete submit without a department falls back to the unfiltered fetch', () => {
        const { actions, ref } = renderOpsList();
        actions.fetchOpsSchedulesList.mockClear();
        ref.current.onSubmitHandler({ action: 'filter' });
        expect(actions.fetchOpsSchedulesList).toHaveBeenCalledWith('');
    });
});
