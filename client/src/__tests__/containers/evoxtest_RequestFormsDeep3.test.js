/**
 * evoxtest_RequestFormsDeep3.test.js
 * Sources under test:
 *   src/container/Request/COE/COE.js               Menu: Requests -> Certificate of Employment
 *   src/container/Request/COEHR/COEHR.js           Menu: Requests -> COE (HR, on behalf of an employee)
 *   src/container/Request/Overtime/Overtime.js     Menu: Requests -> Overtime
 *
 * Wave-6 residue: COE 2 fns / 7 branch arms, COEHR 5 fns / 4 branch arms, Overtime 2 fns /
 * 9 branch arms. (Overtime's other uncovered function, NoScheduleInfo at line 357, is dead:
 * its only reference is inside a commented-out block at line 215.)
 *
 * FINDING OT-VALIDITY-NULL — submitting an overtime request while the payroll validity endpoint
 * answers anything other than a 200-with-content throws instead of telling the user; see the
 * comment above that test. The identical code sits in AlterLog.onSubmitHandler.
 *
 * ADDITIVE ONLY — no existing test, mock or app file is touched.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: (mapStateToProps, mapDispatchToProps) => (Component) => {
        Component.__mapStateToProps = mapStateToProps;
        Component.__mapDispatchToProps = mapDispatchToProps;
        return Component;
    },
}));

jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader:  ({ children }) => <div>{children}</div>,
    Content:          ({ children, title }) => <div><h2>{title}</h2>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
    Row:              ({ children }) => <div>{children}</div>,
    Col:              ({ children }) => <div>{children}</div>,
}));
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/RequestComponent/RequestButtons/RequestButtons', () => () => <div data-testid="request-buttons" />);
jest.mock('../../components/RequestComponent/RequestButtons/RequestSubtitle', () => () => <div />);
jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading" />);
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate: ({ name }) => <input type="date" name={name} />,
    InputTime: ({ name }) => <input type="time" name={name} />,
}));
jest.mock('react-select', () => () => <select data-testid="react-select" />);
jest.mock('../../services/Authenticator', () => ({
    scanLevel: jest.fn(() => true), scanFeature: jest.fn(() => true), check: jest.fn(() => true),
}));
jest.mock('../../services/API', () => ({ call: jest.fn() }));
jest.mock('../../store/actions/requests/coeActions', () => ({
    addCOE:   jest.fn((d) => ({ type: 'COE_ADD', d })),
    fetchCOE: jest.fn(() => ({ type: 'COE_FETCH' })),
}));
jest.mock('../../store/actions/requests/overtimeActions', () => ({
    fetchOvertime:         jest.fn((id) => ({ type: 'OT_FETCH', id })),
    addOvertime:           jest.fn((d) => ({ type: 'OT_ADD', d })),
    updateOvertime:        jest.fn((id, d) => ({ type: 'OT_UPDATE', id, d })),
    updateOvertimeStatus:  jest.fn((id, d, s) => ({ type: 'OT_STATUS', id, d, s })),
    resetOvertimeInstance: jest.fn(() => ({ type: 'OT_RESET' })),
    clearOvertimeInstance: jest.fn(() => ({ type: 'OT_CLEAR' })),
}));
jest.mock('../../store/actions/redirectActions', () => ({
    setRedirect: jest.fn((l) => ({ type: 'REDIRECT', l })),
}));

const COE = require('../../container/Request/COE/COE').default;
const COEHR = require('../../container/Request/COEHR/COEHR').default;
const Overtime = require('../../container/Request/Overtime/Overtime').default;
const coeActions = require('../../store/actions/requests/coeActions');
const overtimeActions = require('../../store/actions/requests/overtimeActions');
const redirectActions = require('../../store/actions/redirectActions');
const API = require('../../services/API');

const COE_PURPOSES = [
    { purpose: 'Bank loan' },       // 0
    { purpose: 'Visa' },            // 1
    { purpose: 'Embassy' },         // 2
    { purpose: 'Personal' },        // 3
    { purpose: 'Credit card' },     // 4
    { purpose: 'Government' },      // 5
    { purpose: 'Travel abroad' },   // 6 — asks where to
    { purpose: 'School' },          // 7
    { purpose: 'Rental' },          // 8
    { purpose: 'Insurance' },       // 9
    { purpose: 'Travel local' },    // 10 — asks where to
];

const wrap = (element) => render(<MemoryRouter>{element}</MemoryRouter>);
const flush = async () => { await act(async () => { await Promise.resolve(); }); };

beforeEach(() => jest.clearAllMocks());

describe('Certificate of Employment (employee)', () => {
    const renderCOE = (props = {}) => {
        const ref = React.createRef();
        const actions = { addCOE: jest.fn(), fetchCOE: jest.fn(), setRedirect: jest.fn() };
        const utils = wrap(
            <COE ref={ref} constant={{ COE_PURPOSES }} instance={{}} user={{ id: 42 }} {...actions} {...props} />
        );
        return { ...utils, ref, actions };
    };

    test('opening the page loads the purpose list and offers every purpose', () => {
        const { actions, container } = renderCOE();

        expect(actions.fetchCOE).toHaveBeenCalledTimes(1);
        const options = container.querySelector('select[name="purpose_index"]').querySelectorAll('option');
        expect(options.length).toBe(COE_PURPOSES.length + 1); // + the blank first entry
        expect(options[7].textContent).toBe('Travel abroad');
    });

    test('a travel purpose asks where to; any other purpose clears and hides that question', () => {
        const { container } = renderCOE();
        const purpose = container.querySelector('select[name="purpose_index"]');

        expect(container.querySelector('input[name="purpose_note"]')).toBeNull();

        fireEvent.change(purpose, { target: { value: '6' } });
        const note = container.querySelector('input[name="purpose_note"]');
        expect(note).not.toBeNull();
        fireEvent.change(note, { target: { value: 'Singapore' } });
        expect(container.querySelector('input[name="purpose_note"]').value).toBe('Singapore');

        fireEvent.change(purpose, { target: { value: '3' } });
        expect(container.querySelector('input[name="purpose_note"]')).toBeNull();

        // and it comes back empty, not carrying the previous answer
        fireEvent.change(purpose, { target: { value: '10' } });
        expect(container.querySelector('input[name="purpose_note"]').value).toBe('');
    });

    test('the form pre-fills from whatever the page was handed', () => {
        const { container } = renderCOE({ purpose_index: '6', purpose_note: 'Japan', show_compensation: '1' });

        expect(container.querySelector('select[name="purpose_index"]').value).toBe('6');
        expect(container.querySelector('input[name="purpose_note"]').value).toBe('Japan');
        expect(container.querySelector('select[name="show_compensation"]').value).toBe('1');
    });

    test('an empty purpose list still renders the picker', () => {
        const { container } = renderCOE({ constant: {} });
        expect(container.querySelector('select[name="purpose_index"]').querySelectorAll('option').length).toBe(1);
    });

    test('submitting posts the answers and the session id, and skips the empty action field', () => {
        const { ref, actions } = renderCOE();
        localStorage.setItem('session_id', 'sess-123');

        ref.current.onSubmitHandler({ action: null, purpose_index: '6', purpose_note: 'Japan', show_compensation: '1' });

        const fd = actions.addCOE.mock.calls[0][0];
        expect(fd.get('purpose_index')).toBe('6');
        expect(fd.get('purpose_note')).toBe('Japan');
        expect(fd.get('show_compensation')).toBe('1');
        expect(fd.get('session_id')).toBe('sess-123');
        expect(fd.get('action')).toBeNull();
    });

    test('setAction records which approval button was pressed', () => {
        const { ref } = renderCOE();

        act(() => { ref.current.setAction('approve'); });
        expect(ref.current.state.action).toBe('approve');
    });

    test('store wiring reads the coe slice and exposes the post', () => {
        expect(COE.__mapStateToProps({ constant: { A: 1 }, coe: { instance: { id: 3 } }, user: { id: 42 } }))
            .toEqual({ constant: { A: 1 }, instance: { id: 3 }, purpose_index: null, user: { id: 42 } });

        const dispatch = jest.fn();
        const p = COE.__mapDispatchToProps(dispatch);
        p.addCOE('form');
        p.fetchCOE();
        p.setRedirect('/x');

        expect(coeActions.addCOE).toHaveBeenCalledWith('form');
        expect(redirectActions.setRedirect).toHaveBeenCalledWith('/x');
        expect(dispatch.mock.calls.map((c) => c[0].type)).toEqual(['COE_ADD', 'COE_FETCH', 'REDIRECT']);
    });
});

describe('Certificate of Employment (HR, on behalf of an employee)', () => {
    const renderCOEHR = (props = {}) => {
        const ref = React.createRef();
        const actions = { addCOE: jest.fn(), fetchCOE: jest.fn(), setRedirect: jest.fn(), dispatch: jest.fn() };
        const utils = wrap(
            <COEHR ref={ref} constant={{ COE_PURPOSES }} instance={{}} user={{ id: 42 }} {...actions} {...props} />
        );
        return { ...utils, ref, actions };
    };

    test('the HR form adds an employee search on top of the employee form', () => {
        const { container, actions } = renderCOEHR();

        expect(actions.fetchCOE).toHaveBeenCalledTimes(1);
        expect(container.querySelector('input[name="employee_name"]')).not.toBeNull();
        expect(container.querySelector('input[name="employee_id"]').type).toBe('hidden');
    });

    test('the form pre-fills from whatever the page was handed', () => {
        const { container } = renderCOEHR({ purpose_index: '10', purpose_note: 'Cebu', show_compensation: '0' });

        expect(container.querySelector('select[name="purpose_index"]').value).toBe('10');
        expect(container.querySelector('input[name="purpose_note"]').value).toBe('Cebu');
        expect(container.querySelector('select[name="show_compensation"]').value).toBe('0');
    });

    test('an empty purpose list still renders the picker', () => {
        const { container } = renderCOEHR({ constant: {} });
        expect(container.querySelector('select[name="purpose_index"]').querySelectorAll('option').length).toBe(1);
    });

    test('picking a suggested employee fills the hidden id and closes the dropdown', () => {
        const { ref, container } = renderCOEHR();
        act(() => {
            ref.current.setState({ employeeSuggestions: [{ id: 55, name: 'Juan Dela Cruz' }, { id: 56, name: 'Juana Cruz' }] });
        });

        const suggestions = container.querySelectorAll('.suggestions-dropdown li');
        expect(suggestions.length).toBe(2);
        fireEvent.click(suggestions[0]);

        expect(container.querySelector('input[name="employee_id"]').value).toBe('55');
        expect(container.querySelector('input[name="employee_name"]').value).toBe('Juan Dela Cruz');
        expect(container.querySelectorAll('.suggestions-dropdown li').length).toBe(0);
    });

    test('the employee search waits a second, ignores 1-character keywords, and asks the API for the rest', async () => {
        jest.useFakeTimers();
        const { ref } = renderCOEHR();
        API.call.mockResolvedValue({ data: [{ id: 55, name: 'Juan Dela Cruz' }] });

        ref.current.searchEmployees('J');
        jest.advanceTimersByTime(1000);
        await flush();
        expect(API.call).not.toHaveBeenCalled();
        expect(ref.current.state.employeeSuggestions).toEqual([]);

        ref.current.searchEmployees('Juan');
        expect(API.call).not.toHaveBeenCalled();       // still inside the debounce window
        jest.advanceTimersByTime(1000);
        await flush();

        expect(API.call).toHaveBeenCalledWith({ method: 'get', url: '/request/coe/user/', params: { keyword: 'Juan' } });
        expect(ref.current.state.employeeSuggestions).toEqual([{ id: 55, name: 'Juan Dela Cruz' }]);
        expect(ref.current.state.loadingEmployees).toBe(false);
        jest.useRealTimers();
    });

    test('a failed employee search clears the suggestions and reports the error', async () => {
        jest.useFakeTimers();
        const { ref, actions } = renderCOEHR();
        API.call.mockRejectedValue(new Error('boom'));

        act(() => { ref.current.setState({ employeeSuggestions: [{ id: 1, name: 'stale' }] }); });
        ref.current.searchEmployees('Juan');
        jest.advanceTimersByTime(1000);
        await flush();

        expect(actions.dispatch).toHaveBeenCalledTimes(1);
        expect(ref.current.state.employeeSuggestions).toEqual([]);
        expect(ref.current.state.loadingEmployees).toBe(false);
        jest.useRealTimers();
    });

    test('store wiring reads the coe slice and exposes the post', () => {
        expect(COEHR.__mapStateToProps({ constant: { A: 1 }, coe: { instance: { id: 3 } }, user: { id: 42 } }))
            .toEqual({ constant: { A: 1 }, instance: { id: 3 }, purpose_index: null, user: { id: 42 } });

        const dispatch = jest.fn();
        const p = COEHR.__mapDispatchToProps(dispatch);
        p.addCOE('form');
        p.fetchCOE();
        p.setRedirect('/x');

        expect(coeActions.addCOE).toHaveBeenCalledWith('form');
        expect(dispatch.mock.calls.map((c) => c[0].type)).toEqual(['COE_ADD', 'COE_FETCH', 'REDIRECT']);
    });
});

describe('Overtime request', () => {
    const renderOT = (props = {}) => {
        const ref = React.createRef();
        const actions = {
            fetchOvertime: jest.fn(), addOvertime: jest.fn(), updateOvertime: jest.fn(),
            updateOvertimeStatus: jest.fn(), setRedirect: jest.fn(), resetOvertimeInstance: jest.fn(),
            clearOvertimeInstance: jest.fn(), dispatch: jest.fn(),
        };
        const utils = wrap(
            <Overtime
                ref={ref}
                constant={{ OVERTIME_TYPE: { 1: 'pre_shift', 2: 'post_shift' } }}
                instance={{}} isInstanceLoaded={false} user={{ id: 42 }}
                settings={{ current_payroll_cutoff: { start_date: '2026-07-16', end_date: '2026-08-15' } }}
                params={{}}
                {...actions}
                {...props}
            />
        );
        return { ...utils, ref, actions };
    };

    const validity = (content) => API.call.mockResolvedValue({ status: 200, data: { content } });

    const otValues = {
        action: null, method: 'store', date: new Date(2026, 6, 20),
        amount: new Date(2026, 6, 20, 2, 0), type: 'pre_shift', employee_note: 'project deadline',
    };

    test('a request inside the current cut-off is submitted as a regular request', async () => {
        validity({ Result: '1', StartDate: '2026-07-16', EndDate: '2026-08-15' });
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { ref, actions } = renderOT();

        await ref.current.onSubmitHandler({ ...otValues });

        expect(actions.addOvertime).toHaveBeenCalledTimes(1);
        const fd = actions.addOvertime.mock.calls[0][0];
        expect(fd.get('request_mode')).toBe('regular');
        expect(fd.get('date')).toBe('2026-07-20');
        expect(fd.get('amount')).toBe('02:00');
        confirmSpy.mockRestore();
    });

    test('a request past the cut-off warns that it becomes a dispute before submitting', async () => {
        validity({ Result: '2' });
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { ref, actions } = renderOT();

        await ref.current.onSubmitHandler({ ...otValues });

        expect(confirmSpy.mock.calls[0][0]).toContain('recorded as a dispute');
        expect(actions.addOvertime.mock.calls[0][0].get('request_mode')).toBe('dispute');
        confirmSpy.mockRestore();
    });

    test('a request is refused outright while the DTR is still being generated', async () => {
        validity({ Result: '0' });
        const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { ref, actions } = renderOT();

        await ref.current.onSubmitHandler({ ...otValues });

        expect(alertSpy.mock.calls[0][0]).toContain('Please wait until DTR generation is complete');
        expect(actions.addOvertime).not.toHaveBeenCalled();
        expect(confirmSpy).not.toHaveBeenCalled();
        alertSpy.mockRestore();
        confirmSpy.mockRestore();
    });

    test('an edit of an existing request is sent as a PUT', async () => {
        validity({ Result: '1', StartDate: '2026-07-16', EndDate: '2026-08-15' });
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { ref, actions } = renderOT({ params: { id: '9' } });

        await ref.current.onSubmitHandler({ ...otValues, method: 'update', id: 9 });

        expect(actions.updateOvertime).toHaveBeenCalledTimes(1);
        expect(actions.updateOvertime.mock.calls[0][1].get('_method')).toBe('PUT');
        confirmSpy.mockRestore();
    });

    /**
     * FINDING OT-VALIDITY-NULL — checkRequestValidity returns null whenever the payroll
     * validity endpoint answers with a non-200, or a 200 with no `content`. The caller then
     * reads `requestValidity.Result` off that null and throws a TypeError, so the click does
     * nothing and the user gets no message. Plain JS, nothing to do with jsdom; the same code
     * is in AlterLog.onSubmitHandler. Fix: treat a null answer as "not allowed" and alert.
     * When that lands this test fails — flip it to expect the alert.
     */
    test('FINDING_OT-VALIDITY-NULL: an empty answer from the validity check throws instead of warning', async () => {
        API.call.mockResolvedValue({ status: 500, data: {} });
        const { ref, actions } = renderOT();

        await expect(ref.current.onSubmitHandler({ ...otValues })).rejects.toThrow(TypeError);
        expect(actions.addOvertime).not.toHaveBeenCalled();
    });

    test('a validity check that fails outright is reported and stops the submission', async () => {
        API.call.mockRejectedValue(new Error('network down'));
        const { ref, actions } = renderOT();

        await expect(ref.current.onSubmitHandler({ ...otValues })).rejects.toThrow('network down');
        expect(actions.dispatch).toHaveBeenCalledTimes(1);
        expect(actions.addOvertime).not.toHaveBeenCalled();
    });

    test('approving asks for confirmation and sends the status with the cut-off window', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { ref, actions } = renderOT();

        await ref.current.onSubmitHandler({ ...otValues, action: 'approve', id: 9 });

        const [id, fd, status, userId, from, to] = actions.updateOvertimeStatus.mock.calls[0];
        expect(id).toBe(9);
        expect(fd.get('_method')).toBe('PUT');
        expect(status).toBe('approve');
        expect(userId).toBe(42);
        expect(from).toBe('2026-07-16');
        expect(to).toBe('2026-08-15');
        confirmSpy.mockRestore();
    });

    test('declining the confirmation on an approval leaves the request untouched', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
        const { ref, actions } = renderOT();

        await ref.current.onSubmitHandler({ ...otValues, action: 'cancel', id: 9 });

        expect(actions.updateOvertimeStatus).not.toHaveBeenCalled();
        confirmSpy.mockRestore();
    });

    test('setAction records which approval button was pressed', () => {
        const { ref } = renderOT();

        act(() => { ref.current.setAction('decline'); });
        expect(ref.current.state.action).toBe('decline');

        act(() => { ref.current.setAction('approve'); });
        expect(ref.current.state.action).toBe('approve');
    });

    test('moving between two requests reloads the second one; leaving the form clears it', () => {
        const { ref, actions } = renderOT({ params: { id: '9' } });
        actions.clearOvertimeInstance.mockClear();
        actions.fetchOvertime.mockClear();

        ref.current.componentDidUpdate({ params: { id: '8' } });
        expect(actions.clearOvertimeInstance).toHaveBeenCalledTimes(1);
        expect(actions.fetchOvertime).toHaveBeenCalledWith('9');

        const fresh = renderOT({ params: {} });
        fresh.actions.clearOvertimeInstance.mockClear();
        fresh.actions.fetchOvertime.mockClear();

        fresh.ref.current.componentDidUpdate({ params: { id: '8' } });
        expect(fresh.actions.clearOvertimeInstance).toHaveBeenCalledTimes(1);
        expect(fresh.actions.fetchOvertime).not.toHaveBeenCalled();
    });

    test('an existing request is not shown until it has loaded', () => {
        // queries are scoped to each render's own container: both live in the same document
        const loading = renderOT({ params: { id: '9' } });
        expect(loading.container.querySelector('[data-testid="page-loading"]')).not.toBeNull();

        const loaded = renderOT({ params: { id: '9' }, isInstanceLoaded: true, instance: { id: 9, amount: '02:00' } });
        expect(loaded.container.querySelector('[data-testid="page-loading"]')).toBeNull();
        expect(loaded.container.textContent).toContain('Overtime');
    });

    test('store wiring reads the overtime slice and exposes every request action', () => {
        expect(Overtime.__mapStateToProps({
            constant: { A: 1 }, overtime: { instance: { id: 3 }, isInstanceLoaded: true },
            user: { id: 42 }, settings: { s: 1 },
        })).toEqual({
            constant: { A: 1 }, instance: { id: 3 }, isInstanceLoaded: true, user: { id: 42 }, settings: { s: 1 },
        });

        const dispatch = jest.fn();
        const p = Overtime.__mapDispatchToProps(dispatch);
        expect(p.dispatch).toBe(dispatch);

        p.fetchOvertime(9);
        p.addOvertime('form');
        p.updateOvertime(9, 'form');
        p.updateOvertimeStatus(9, 'form', 'approve', 42, 'a', 'b');
        p.setRedirect('/x');
        p.resetOvertimeInstance();
        p.clearOvertimeInstance();

        expect(overtimeActions.updateOvertimeStatus).toHaveBeenCalledWith(9, 'form', 'approve', 42, 'a', 'b');
        expect(dispatch.mock.calls.map((c) => c[0].type)).toEqual([
            'OT_FETCH', 'OT_ADD', 'OT_UPDATE', 'OT_STATUS', 'REDIRECT', 'OT_RESET', 'OT_CLEAR',
        ]);
    });
});
