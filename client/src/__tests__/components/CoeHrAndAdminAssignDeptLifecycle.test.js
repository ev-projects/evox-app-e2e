/**
 * CoeHrAndAdminAssignDeptLifecycle.test.js
 *
 * SOURCES UNDER TEST
 *   1. container/Request/COEHR/COEHR.js
 *      Menu: Requests -> Certificate of Employment   (Content title "Certificate of Employment")
 *   2. container/Admin/AssignDepartmentHandlers/AssignDepartmentHandlers.js
 *      Menu: Admin -> Assign Department Handlers     (Content title "Assign Department Handlers")
 *   3. container/MyTeam/DPAList/DPAList.js
 *      Menu: My Team -> DPA List                     (page title "DPA List")
 *
 * WHAT THIS SUITE TARGETS
 *   COEHR                     the debounced employee search + the purpose branches
 *   AssignDepartmentHandlers  department pick -> handler pre-selection -> assign
 *   DPAList                   filter / export-filtered / export-all payload arms
 *   Measured WITH this suite in place, 05-Aug-2026, with --collectCoverageFrom limited to these
 *   three files:
 *       COEHR.js                    91.38% stmts   (uncovered: 269, 277-280)
 *       AssignDepartmentHandlers.js 90.16% stmts   (uncovered: 314, 322-326)
 *       DPAList.js                  94.20% stmts   (uncovered: 285, 292-294)
 *   The pre-suite baseline for these three files was NOT re-measured, so no "lines closed" figure is
 *   claimed here. Every one of those residual lines is inside mapStateToProps / mapDispatchToProps,
 *   which cannot execute while `connect` is mocked to identity (below) - i.e. the store wiring of
 *   all three screens is unverified by this suite by construction.
 *   Everything below drives the REAL <select>/<input>/<button> DOM wherever the DOM is
 *   deterministic, and the instance methods via a ref where the branch is only reachable from a
 *   value the DOM cannot produce. ADDITIVE ONLY - no app source and no existing test file was
 *   touched.
 *
 * THE SIBLING BUG WE WERE ASKED TO LOOK FOR (_FINDING_ASD_STRICTID on AssignSubDepartment: a numeric
 * lookup id compared with === against the string a DOM <select> emits, killing the remove branch)
 *   AssignDepartmentHandlers  NOT PRESENT in the fatal form. The value the <select> emits
 *       (state.selectedDepartment, a string) is only ever fed to Validator.isValid() and passed
 *       through as department_id; it is never === compared with a numeric lookup id. The screen does
 *       contain the same strict-equality *shape* in componentWillReceiveProps
 *       (`supervisor.id === department_handler.id`) but both operands come from lookup props, so it
 *       works today - see _FINDING_ADH_CROSSTYPEID for the latent half, tested on both arms.
 *   DPAList                   PRESENT, in the Status badge. See _FINDING_DPA_STATUSSTRICT below.
 *
 * FINDINGS CHARACTERISED HERE (asserted as current behaviour, NOT fixed)
 *   _FINDING_COE_NODISPATCH   - COEHR.searchEmployees' catch arm calls `this.props.dispatch(...)`,
 *       but COEHR supplies a mapDispatchToProps, so react-redux never injects a `dispatch` prop.
 *       A failed employee lookup therefore throws inside its own error handler: the alert is never
 *       raised and the two setState calls after it never run, so loadingEmployees stays stuck true
 *       and a stale suggestion list stays on screen.
 *   _FINDING_COE_DEBOUNCELEAK - the 1s debounce timer is never cleared on unmount (there is no
 *       componentWillUnmount), so navigating away mid-search still fires the HTTP call and then
 *       setState on a dead component.
 *   _FINDING_COE_PURPOSEINDEX - the purpose <option value> is the ARRAY INDEX of COE_PURPOSES, not
 *       the purpose's own id, and the "Travel To" reveal is hard-coded to indices 6 and 10. The
 *       submitted payload carries a positional index, so re-ordering or inserting a purpose row
 *       silently re-points every historical request and moves the Travel To field to another purpose.
 *   _FINDING_ADH_MERGEDUSERS  - onSubmitHandler folds supervisor_user_id AND client_user_id into a
 *       single flat `user_id` array, so the backend cannot tell a supervisor from a client, and a
 *       person who is both is posted twice.
 *   _FINDING_ADH_ZEROID       - Validator.isValid() reports numeric zero as invalid, so a department
 *       whose primary key is 0 can be picked but its handler panel never opens.
 *   _FINDING_ADH_NOCLIENTGUARD- the render gate only waits for `department` and `supervisor`, but
 *       componentWillReceiveProps dereferences `nextProps.client.findIndex`. componentWillMount
 *       `await`s three thunks that never return their promise, so all three lookups are in flight at
 *       once and supervisor/department can land before client. Handlers arriving in that window hit
 *       the TypeError. It is thrown from the synchronous head of the lifecycle, so declaring the
 *       method `async` does not contain it: it escapes into React's render pass and the whole screen
 *       unmounts. Asserted against the lifecycle directly - see the note on that test for why the
 *       React-driven form is not assertable here.
 *   _FINDING_ADH_CROSSTYPEID  - the pre-selection cross-match uses ===, so if the handlers lookup
 *       and the supervisor/client lookups ever disagree on id type the panel silently comes up empty
 *       instead of pre-ticking the existing handlers.
 *   _FINDING_DPA_ZEROFILTER   - onSubmitHandler drops any value that is loosely equal to "", which
 *       in JavaScript includes the number 0 and the boolean false. A numeric is_active of 0
 *       (Inactive) is therefore stripped from the request instead of being sent.
 *   _FINDING_DPA_INACTIVEDEFAULT - the constructor restores is_active with a truthiness test, so a
 *       remembered Inactive filter of 0 is flipped back to Active (1) when the page remounts.
 *   _FINDING_DPA_EXPORTALLKEEPSSTATUS - "Export All" strips department_id and name but keeps
 *       is_active / submitted_dpa / page, so it is not an export of all rows.
 *   _FINDING_DPA_STATUSSTRICT - the Status badge switches on `case 1:` / `case 0:` with no default
 *       arm. The switch is strict, so an is_active that arrives as the string "1" (or null) renders
 *       a completely blank status cell rather than a badge.
 *   _FINDING_DPA_DEPTUNDEF    - the department filter maps props.user.departments_handled with no
 *       guard, so any user whose profile has no departments_handled key crashes the whole page.
 *
 * CHARACTERISED BUT **NOT** CLAIMED AS PRODUCTION DEFECTS - do not raise tickets for these
 *   ADH same-reference guard   componentWillReceiveProps is gated on `nextProps.department_handlers
 *       != this.props.department_handlers`, i.e. a reference comparison. If the identical array
 *       instance is ever re-supplied the panel keeps the PREVIOUS department's handlers while the
 *       department dropdown shows the new one - and Assign then posts the stale handler set. That is
 *       asserted below because it is the guard's real behaviour, but it is a LATENT hazard, not a
 *       live bug: lookupListReducers.js assigns `department_handlers: action.list` straight from a
 *       fresh HTTP response on every FETCH_DEPARTMENT_HANDLERS_LIST_SUCCESS, so the store cannot
 *       hand back the same instance today. The test name and comment say so.
 *   DPAList name filter type   the box is declared type="textfield" (DPAList.js:195), which is not a
 *       valid HTML input type. This is invalid markup only: every browser coerces an unknown type to
 *       "text" and the filter works normally. jsdom 11 does NOT do that coercion, which is a jsdom
 *       limitation and NOT an application defect - no test here characterises it as one. The
 *       filter's payload behaviour is covered through onSubmitHandler.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
}));

jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader:  ({ children }) => <div>{children}</div>,
    Content:          ({ children, title, subtitle }) => (
        <div><h1>{title}</h1><div data-testid="content-subtitle">{subtitle}</div>{children}</div>
    ),
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
    Row:              ({ children }) => <div>{children}</div>,
    Col:              ({ children }) => <div>{children}</div>,
}));
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading" />);
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate: () => <div data-testid="input-date" />,
    InputTime: () => <div data-testid="input-time" />,
}));

// MultiSelect stub that exposes its options / current value and lets a test drive onChange.
jest.mock('react-multi-select-component', () => ({
    __esModule: true,
    default: ({ options, value, onChange, labelledBy }) => (
        <div data-testid={`ms-${labelledBy}`}>
            <span data-testid={`ms-options-${labelledBy}`}>{(options || []).map((o) => o.label).join('|')}</span>
            <span data-testid={`ms-selected-${labelledBy}`}>{(value || []).map((o) => o.label).join('|')}</span>
            <button type="button" data-testid={`ms-all-${labelledBy}`} onClick={() => onChange(options)}>all</button>
            <button type="button" data-testid={`ms-clear-${labelledBy}`} onClick={() => onChange([])}>clear</button>
        </div>
    ),
}));

jest.mock('../../services/API', () => ({ __esModule: true, default: { call: jest.fn(), export: jest.fn() } }));

jest.mock('../../store/actions/requests/coeActions', () => ({
    addCOE: jest.fn(),
    fetchCOE: jest.fn(),
}));
jest.mock('../../store/actions/redirectActions', () => ({
    setRedirect: jest.fn(),
    clearRedirect: jest.fn(),
}));
jest.mock('../../store/actions/lookup/lookupListActions', () => ({
    fetchUserList: jest.fn(),
    fetchDepartmentList: jest.fn(),
    fetchDepartmentHandlersList: jest.fn(),
}));
jest.mock('../../store/actions/admin/assignDepartmentHandlersActions', () => ({
    assignDepartmentHandlers: jest.fn(),
}));
jest.mock('../../store/actions/filters/dpaActions', () => ({
    fetchDpaList: jest.fn(),
    exportDpaList: jest.fn(),
}));

global.links = new Proxy({}, { get: () => '/x/' });

const API = require('../../services/API').default;
const COEHR = require('../../container/Request/COEHR/COEHR').default;
const AssignDepartmentHandlers =
    require('../../container/Admin/AssignDepartmentHandlers/AssignDepartmentHandlers').default;
const DPAList = require('../../container/MyTeam/DPAList/DPAList').default;

const flush = () => act(() => Promise.resolve());

// _FINDING_COE_NODISPATCH deliberately lets an error escape an async debounce callback that nobody
// awaits. Node only prints the "unhandled rejection" banner when there is no listener, so we keep a
// silent one registered for the whole file; it never changes an assertion.
const swallowed = [];
const swallow = (e) => swallowed.push(e);
beforeAll(() => { process.on('unhandledRejection', swallow); });
afterAll(() => { process.removeListener('unhandledRejection', swallow); });

/* ================================================================================================
 *  COEHR - Requests -> Certificate of Employment
 * ============================================================================================== */

const COE_PURPOSES = [
    { purpose: 'Bank Loan' },        // 0
    { purpose: 'Visa Application' }, // 1
    { purpose: 'Embassy' },          // 2
    { purpose: 'Credit Card' },      // 3
    { purpose: 'School' },           // 4
    { purpose: 'Insurance' },        // 5
    { purpose: 'Travel Abroad' },    // 6  <- reveals "Travel To"
    { purpose: 'Housing' },          // 7
    { purpose: 'Government' },       // 8
    { purpose: 'Personal' },         // 9
    { purpose: 'Business Trip' },    // 10 <- reveals "Travel To"
];

function coeProps(over = {}) {
    return {
        constant: { COE_PURPOSES },
        instance: { user: { full_name: 'Alice A', department: 'Engineering' }, status: 'pending' },
        user: { full_name: 'Alice A' },
        history: { goBack: jest.fn(), push: jest.fn() },
        addCOE: jest.fn(),
        fetchCOE: jest.fn(),
        setRedirect: jest.fn(),
        ...over,
    };
}

function renderCOE(over = {}) {
    const props = coeProps(over);
    const ref = React.createRef();
    const utils = render(<COEHR {...props} ref={ref} />);
    return { ...utils, ref, props };
}

// Determinism: every COEHR test installs a whole implementation rather than queueing "...Once"
// values, so nothing an earlier test queued can survive into a later one.
const stubSearch = (impl) => { API.call.mockReset(); API.call.mockImplementation(impl); };
const searchReturns = (rows) => stubSearch(() => Promise.resolve({ data: rows }));

const nameInput = (c) => c.querySelector('input[name="employee_name"]');
const idInput = (c) => c.querySelector('input[name="employee_id"]');
const purposeSelect = (c) => c.querySelector('select[name="purpose_index"]');
const compSelect = (c) => c.querySelector('select[name="show_compensation"]');
const noteInput = (c) => c.querySelector('input[name="purpose_note"]');
const submitBtn = (c) =>
    Array.from(c.querySelectorAll('button[type="submit"]')).find((b) => /Submit/.test(b.textContent));

describe('Certificate of Employment (HR) - page load and purpose list', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        searchReturns([]);
        localStorage.setItem('session_id', 'sess-abc');
    });
    afterEach(() => {
        jest.clearAllTimers();
        jest.useRealTimers();
        localStorage.removeItem('session_id');
    });

    test('mounting asks the store for the requesters existing COE record exactly once', () => {
        const { props, getByText } = renderCOE();

        expect(props.fetchCOE).toHaveBeenCalledTimes(1);
        expect(props.fetchCOE).toHaveBeenCalledWith();
        expect(getByText('Certificate of Employment')).toBeInTheDocument();
    });

    test('the store method is store, so the approval name/department subtitle is suppressed', () => {
        const { getByTestId } = renderCOE();

        expect(getByTestId('content-subtitle').innerHTML).toBe('');
    });

    // FINDING _FINDING_COE_PURPOSEINDEX - the option value is the position in COE_PURPOSES, not the
    // purpose's own identifier, so the payload is positional.
    test('every configured purpose becomes an option keyed by its array position _FINDING_COE_PURPOSEINDEX', () => {
        const { container } = renderCOE();

        const options = Array.from(purposeSelect(container).querySelectorAll('option'));
        expect(options).toHaveLength(12);                       // 11 purposes + the blank one
        expect(options[0].value).toBe('');
        expect(options.slice(1).map((o) => o.value))
            .toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
        expect(options[1].textContent).toBe('Bank Loan');
        expect(options[7].textContent).toBe('Travel Abroad');   // position 6
    });

    test('an unloaded COE_PURPOSES constant leaves the purpose dropdown with only the blank option', () => {
        const { container } = renderCOE({ constant: {} });

        expect(purposeSelect(container).querySelectorAll('option')).toHaveLength(1);
    });

    test('the with-salary dropdown offers exactly No=0 and Yes=1 behind a blank option', () => {
        const { container } = renderCOE();

        const options = Array.from(compSelect(container).querySelectorAll('option'));
        expect(options.map((o) => o.value)).toEqual(['', '0', '1']);
        expect(options.map((o) => o.textContent)).toEqual(['', 'No', 'Yes']);
    });

    test('the special-allowance notice points at the happiness mailbox', () => {
        const { container } = renderCOE();

        const link = container.querySelector('a[href^="mailto:"]');
        expect(link).toHaveAttribute('href', 'mailto:happiness@eastvantage.com');
        expect(link.textContent).toBe('happiness@eastvantage.com');
    });
});

describe('Certificate of Employment (HR) - the Travel To conditional', () => {
    beforeEach(() => { jest.clearAllMocks(); jest.useFakeTimers(); searchReturns([]); });
    afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

    test('no Travel To field is offered until a travel purpose is chosen', () => {
        const { container } = renderCOE();

        expect(noteInput(container)).toBeNull();
    });

    test('purpose 6 reveals the Travel To field', async () => {
        const { container } = renderCOE();
        await act(async () => { fireEvent.change(purposeSelect(container), { target: { value: '6' } }); });

        expect(noteInput(container)).not.toBeNull();
    });

    test('purpose 10 reveals the Travel To field as well', async () => {
        const { container } = renderCOE();
        await act(async () => { fireEvent.change(purposeSelect(container), { target: { value: '10' } }); });

        expect(noteInput(container)).not.toBeNull();
    });

    test('a non-travel purpose keeps the Travel To field hidden', async () => {
        const { container } = renderCOE();
        await act(async () => { fireEvent.change(purposeSelect(container), { target: { value: '7' } }); });

        expect(noteInput(container)).toBeNull();
    });

    test('switching from a travel purpose to a non-travel one wipes the typed destination', async () => {
        const { container } = renderCOE();
        await act(async () => { fireEvent.change(purposeSelect(container), { target: { value: '6' } }); });
        await act(async () => { fireEvent.change(noteInput(container), { target: { value: 'Singapore' } }); });
        expect(noteInput(container).value).toBe('Singapore');

        await act(async () => { fireEvent.change(purposeSelect(container), { target: { value: '3' } }); });
        expect(noteInput(container)).toBeNull();

        // and coming back shows it empty, not repopulated with the discarded destination
        await act(async () => { fireEvent.change(purposeSelect(container), { target: { value: '6' } }); });
        expect(noteInput(container).value).toBe('');
    });

    test('moving between the two travel purposes preserves the typed destination', async () => {
        const { container } = renderCOE();
        await act(async () => { fireEvent.change(purposeSelect(container), { target: { value: '6' } }); });
        await act(async () => { fireEvent.change(noteInput(container), { target: { value: 'Tokyo' } }); });

        await act(async () => { fireEvent.change(purposeSelect(container), { target: { value: '10' } }); });

        expect(noteInput(container)).not.toBeNull();
        expect(noteInput(container).value).toBe('Tokyo');
    });

    test('clearing the purpose back to blank hides the destination field again', async () => {
        const { container } = renderCOE();
        await act(async () => { fireEvent.change(purposeSelect(container), { target: { value: '6' } }); });
        expect(noteInput(container)).not.toBeNull();

        await act(async () => { fireEvent.change(purposeSelect(container), { target: { value: '' } }); });
        expect(noteInput(container)).toBeNull();
    });
});

describe('Certificate of Employment (HR) - debounced employee search', () => {
    beforeEach(() => { jest.clearAllMocks(); jest.useFakeTimers(); searchReturns([]); });
    afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

    test('a keyword of two characters or more is sent to the COE user lookup after one second', async () => {
        searchReturns([{ id: 42, name: 'Gary Aure' }]);
        const { ref } = renderCOE();

        act(() => { ref.current.searchEmployees('ga'); });
        act(() => { jest.advanceTimersByTime(999); });
        expect(API.call).not.toHaveBeenCalled();

        act(() => { jest.advanceTimersByTime(1); });
        expect(API.call).toHaveBeenCalledTimes(1);
        expect(API.call).toHaveBeenCalledWith({
            method: 'get',
            url: '/request/coe/user/',
            params: { keyword: 'ga' },
        });

        await flush();
        expect(ref.current.state.employeeSuggestions).toEqual([{ id: 42, name: 'Gary Aure' }]);
        expect(ref.current.state.loadingEmployees).toBe(false);
    });

    test('a one-character keyword never reaches the server and empties the suggestion list', async () => {
        searchReturns([{ id: 42, name: 'Gary Aure' }]);
        const { ref } = renderCOE();

        act(() => { ref.current.searchEmployees('ga'); });
        act(() => { jest.advanceTimersByTime(1000); });
        await flush();
        expect(ref.current.state.employeeSuggestions).toHaveLength(1);

        act(() => { ref.current.searchEmployees('g'); });
        act(() => { jest.advanceTimersByTime(1000); });
        await flush();

        expect(API.call).toHaveBeenCalledTimes(1);              // still only the 'ga' call
        expect(ref.current.state.employeeSuggestions).toEqual([]);
    });

    test('an emptied search box never reaches the server and empties the suggestion list', async () => {
        searchReturns([{ id: 42, name: 'Gary Aure' }]);
        const { ref } = renderCOE();

        // seed a real, populated suggestion list first - otherwise "the list is empty" would be
        // satisfied by the constructor's initial state and would pass even if the branch never ran.
        act(() => { ref.current.searchEmployees('ga'); });
        act(() => { jest.advanceTimersByTime(1000); });
        await flush();
        expect(ref.current.state.employeeSuggestions).toHaveLength(1);

        act(() => { ref.current.searchEmployees(''); });
        act(() => { jest.advanceTimersByTime(1000); });
        await flush();

        expect(API.call).toHaveBeenCalledTimes(1);              // still only the 'ga' call
        expect(ref.current.state.employeeSuggestions).toEqual([]);
    });

    test('typing quickly collapses to a single lookup carrying only the final keyword', async () => {
        searchReturns([]);
        const { ref } = renderCOE();

        act(() => { ref.current.searchEmployees('g'); });
        act(() => { jest.advanceTimersByTime(300); });
        act(() => { ref.current.searchEmployees('ga'); });
        act(() => { jest.advanceTimersByTime(300); });
        act(() => { ref.current.searchEmployees('gar'); });
        act(() => { jest.advanceTimersByTime(1000); });
        await flush();

        expect(API.call).toHaveBeenCalledTimes(1);
        expect(API.call.mock.calls[0][0].params).toEqual({ keyword: 'gar' });
    });

    test('the loading flag is raised while the lookup is in flight and lowered when it resolves', async () => {
        let resolveCall;
        stubSearch(() => new Promise((res) => { resolveCall = res; }));
        const { ref } = renderCOE();

        act(() => { ref.current.searchEmployees('gar'); });
        act(() => { jest.advanceTimersByTime(1000); });
        expect(ref.current.state.loadingEmployees).toBe(true);

        await act(async () => { resolveCall({ data: [{ id: 1, name: 'Gary Aure' }] }); });
        expect(ref.current.state.loadingEmployees).toBe(false);
        expect(ref.current.state.employeeSuggestions).toHaveLength(1);
    });

    // FINDING _FINDING_COE_NODISPATCH - the catch arm calls this.props.dispatch, a prop react-redux
    // never injects because COEHR declares a mapDispatchToProps. The alert is therefore never shown
    // and the two setState calls that follow it never execute: the spinner stays up forever and the
    // previous (now wrong) suggestion list stays on screen.
    test('a failed employee lookup leaves the spinner stuck and the stale list on screen _FINDING_COE_NODISPATCH', async () => {
        // The debounce body is an async callback handed to setTimeout, so the TypeError it throws
        // has nowhere to go. We wrap setTimeout for the duration of this test purely to take hold
        // of that discarded promise and read the error out of it - nothing about the component or
        // its timing changes.
        const thrown = [];
        // NB: jest.spyOn cannot be used here - under fake timers global.setTimeout is already a jest
        // mock, so spyOn hands back that same function and the wrapper recurses into itself.
        // `previousSetTimeout` is therefore jest's FAKE timer function, not the pristine real one;
        // the finally block puts that same fake back, and the describe-level afterEach restores the
        // real timers. Nothing outside this test observes the swap.
        const previousSetTimeout = global.setTimeout;
        global.setTimeout = (fn, ms) => previousSetTimeout(() => {
            const returned = fn();
            if (returned && typeof returned.catch === 'function') { returned.catch((e) => thrown.push(e)); }
        }, ms);

        try {
            stubSearch(({ params }) => (params.keyword === 'gary'
                ? Promise.reject({ status: 500, statusText: 'Server Error' })
                : Promise.resolve({ data: [{ id: 42, name: 'Gary Aure' }] })));
            const { ref } = renderCOE();

            act(() => { ref.current.searchEmployees('gar'); });
            act(() => { jest.advanceTimersByTime(1000); });
            await flush();
            expect(ref.current.state.employeeSuggestions).toHaveLength(1);

            act(() => { ref.current.searchEmployees('gary'); });
            act(() => { jest.advanceTimersByTime(1000); });
            await flush();
            await flush();

            expect(thrown).toHaveLength(1);
            expect(thrown[0]).toBeInstanceOf(TypeError);
            expect(thrown[0].message).toMatch(/dispatch is not a function/);
            expect(ref.current.state.loadingEmployees).toBe(true);   // never reset
            expect(ref.current.state.employeeSuggestions).toEqual([{ id: 42, name: 'Gary Aure' }]);
        } finally {
            global.setTimeout = previousSetTimeout;
        }
    });

    // COUNTERFACTUAL, not a production path: COEHR.js:276-282 declares a mapDispatchToProps, so
    // react-redux never injects `dispatch` and the branch below is unreachable in the running app.
    // It is kept because it pins down what the catch arm was MEANT to do, which is the acceptance
    // criterion for whoever fixes _FINDING_COE_NODISPATCH: once dispatch reaches the component (or
    // the call is rewritten to a mapped action) this is the behaviour the fix must produce.
    test('COUNTERFACTUAL - hand-injecting dispatch shows what the catch arm was meant to do', async () => {
        const dispatch = jest.fn();
        stubSearch(() => Promise.reject({ status: 500, statusText: 'Server Error' }));
        const { ref } = renderCOE({ dispatch });

        act(() => { ref.current.searchEmployees('gary'); });
        act(() => { jest.advanceTimersByTime(1000); });
        await flush();
        await flush();

        expect(dispatch).toHaveBeenCalledTimes(1);
        expect(dispatch).toHaveBeenCalledWith({
            type: 'SHOW_ALERT',
            error: { status: 500, statusText: 'Server Error' },
            timeOut: 0,
        });
        expect(ref.current.state.employeeSuggestions).toEqual([]);
        expect(ref.current.state.loadingEmployees).toBe(false);
    });

    // FINDING _FINDING_COE_DEBOUNCELEAK - no componentWillUnmount clears debounceTimeout, so leaving
    // the page inside the debounce window still issues the request and then setStates a dead tree.
    test('navigating away mid-search still fires the pending lookup _FINDING_COE_DEBOUNCELEAK', async () => {
        searchReturns([]);
        const { ref, unmount } = renderCOE();

        act(() => { ref.current.searchEmployees('gary'); });
        unmount();
        expect(API.call).not.toHaveBeenCalled();

        act(() => { jest.advanceTimersByTime(1000); });

        expect(API.call).toHaveBeenCalledTimes(1);
        expect(API.call.mock.calls[0][0].url).toBe('/request/coe/user/');
        await flush();
    });
});

describe('Certificate of Employment (HR) - picking an employee from the suggestions', () => {
    beforeEach(() => { jest.clearAllMocks(); jest.useFakeTimers(); searchReturns([]); });
    afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

    const typeName = async (container, value) => {
        await act(async () => { fireEvent.change(nameInput(container), { target: { value } }); });
    };

    test('no dropdown is rendered while there are no suggestions', async () => {
        searchReturns([]);
        const { container } = renderCOE();
        await typeName(container, 'zz');
        act(() => { jest.advanceTimersByTime(1000); });
        await flush();

        expect(container.querySelector('ul.suggestions-dropdown')).toBeNull();
    });

    test('the returned employees are listed and clicking one fills both the name and the hidden id', async () => {
        searchReturns([{ id: 42, name: 'Gary Aure' }, { id: 43, name: 'Garry Beltran' }]);
        const { container } = renderCOE();
        await typeName(container, 'gar');
        act(() => { jest.advanceTimersByTime(1000); });
        await flush();

        const items = Array.from(container.querySelectorAll('ul.suggestions-dropdown li'));
        expect(items.map((li) => li.textContent)).toEqual(['Gary Aure', 'Garry Beltran']);

        await act(async () => { fireEvent.click(items[0]); });

        expect(nameInput(container).value).toBe('Gary Aure');
        expect(idInput(container).value).toBe('42');
        expect(container.querySelector('ul.suggestions-dropdown')).toBeNull();
    });

    test('typing again after a pick discards the chosen employee id so a stale id cannot be posted', async () => {
        searchReturns([{ id: 42, name: 'Gary Aure' }]);
        const { container } = renderCOE();
        await typeName(container, 'gar');
        act(() => { jest.advanceTimersByTime(1000); });
        await flush();
        await act(async () => { fireEvent.click(container.querySelector('ul.suggestions-dropdown li')); });
        expect(idInput(container).value).toBe('42');

        await typeName(container, 'Gary Aur');

        expect(idInput(container).value).toBe('');
        expect(nameInput(container).value).toBe('Gary Aur');
        act(() => { jest.advanceTimersByTime(1000); });
        await flush();
    });
});

describe('Certificate of Employment (HR) - validation and submission', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        searchReturns([]);
        localStorage.setItem('session_id', 'sess-abc');
    });
    afterEach(() => {
        jest.clearAllTimers();
        jest.useRealTimers();
        localStorage.removeItem('session_id');
    });

    const submit = async (container) => {
        await act(async () => { fireEvent.click(submitBtn(container)); });
        await flush();
        await flush();
    };

    test('submitting a blank form posts nothing and reports every missing field', async () => {
        const { container, props, getByText } = renderCOE();

        await submit(container);

        expect(props.addCOE).not.toHaveBeenCalled();
        // exactly three: employee_name, purpose_index, show_compensation. employee_id's rule is
        // conditional on a non-blank employee_name, so it stays silent on a blank form.
        const messages = Array.from(container.querySelectorAll('.input-feedback')).map((d) => d.textContent);
        expect(messages).toEqual(['Employee name is required', 'This field is required', 'This field is required']);
        expect(getByText('Employee name is required')).toBeInTheDocument();
    });

    test('a typed name with no suggestion picked is rejected as an unresolved employee', async () => {
        searchReturns([]);
        const { container, props, getByText } = renderCOE();

        await act(async () => { fireEvent.change(nameInput(container), { target: { value: 'Gary Aure' } }); });
        await act(async () => { fireEvent.change(purposeSelect(container), { target: { value: '3' } }); });
        await act(async () => { fireEvent.change(compSelect(container), { target: { value: '1' } }); });
        await submit(container);

        expect(props.addCOE).not.toHaveBeenCalled();
        expect(getByText('Please select an employee from the suggestions')).toBeInTheDocument();
        act(() => { jest.advanceTimersByTime(1000); });
        await flush();
    });

    test('a fully resolved request is posted as multipart form data carrying the session id', async () => {
        searchReturns([{ id: 42, name: 'Gary Aure' }]);
        const { container, props } = renderCOE();

        await act(async () => { fireEvent.change(nameInput(container), { target: { value: 'gar' } }); });
        act(() => { jest.advanceTimersByTime(1000); });
        await flush();
        await act(async () => { fireEvent.click(container.querySelector('ul.suggestions-dropdown li')); });
        await act(async () => { fireEvent.change(purposeSelect(container), { target: { value: '3' } }); });
        await act(async () => { fireEvent.change(compSelect(container), { target: { value: '1' } }); });

        await submit(container);

        expect(props.addCOE).toHaveBeenCalledTimes(1);
        const posted = props.addCOE.mock.calls[0][0];
        expect(posted).toBeInstanceOf(FormData);
        expect(posted.get('employee_id')).toBe('42');
        expect(posted.get('employee_name')).toBe('Gary Aure');
        expect(posted.get('purpose_index')).toBe('3');
        expect(posted.get('show_compensation')).toBe('1');
        expect(posted.get('session_id')).toBe('sess-abc');
    });

    test('a travel request carries the destination alongside the purpose index', async () => {
        searchReturns([{ id: 42, name: 'Gary Aure' }]);
        const { container, props } = renderCOE();

        await act(async () => { fireEvent.change(nameInput(container), { target: { value: 'gar' } }); });
        act(() => { jest.advanceTimersByTime(1000); });
        await flush();
        await act(async () => { fireEvent.click(container.querySelector('ul.suggestions-dropdown li')); });
        await act(async () => { fireEvent.change(purposeSelect(container), { target: { value: '6' } }); });
        await act(async () => { fireEvent.change(noteInput(container), { target: { value: 'Singapore' } }); });
        await act(async () => { fireEvent.change(compSelect(container), { target: { value: '0' } }); });

        await submit(container);

        const posted = props.addCOE.mock.calls[0][0];
        expect(posted.get('purpose_index')).toBe('6');
        expect(posted.get('purpose_note')).toBe('Singapore');
        expect(posted.get('show_compensation')).toBe('0');
    });

    test('null form fields are omitted from the payload entirely', async () => {
        const { ref, props } = renderCOE();

        act(() => {
            ref.current.onSubmitHandler({
                action: null,
                purpose_index: '3',
                purpose_note: null,
                show_compensation: '1',
                employee_name: 'Gary Aure',
                employee_id: 42,
            });
        });

        const posted = props.addCOE.mock.calls[0][0];
        expect(posted.has('action')).toBe(false);
        expect(posted.has('purpose_note')).toBe(false);
        expect(posted.get('employee_id')).toBe('42');
    });

    test('a missing session id is still forwarded, as the literal string null', async () => {
        localStorage.removeItem('session_id');
        const { ref, props } = renderCOE();

        act(() => { ref.current.onSubmitHandler({ purpose_index: '3' }); });

        expect(props.addCOE.mock.calls[0][0].get('session_id')).toBe('null');
    });

    test('setAction records the approval action on state without posting anything', () => {
        const { ref, props } = renderCOE();

        act(() => { ref.current.setAction('approve'); });

        expect(ref.current.state.action).toBe('approve');
        expect(props.addCOE).not.toHaveBeenCalled();
    });
});

/* ================================================================================================
 *  AssignDepartmentHandlers - Admin -> Assign Department Handlers
 * ============================================================================================== */

const ADH_SUPERVISORS = [
    { id: 11, full_name: 'Gary Aure' },
    { id: 12, full_name: 'Glenn Macasarte' },
];
const ADH_CLIENTS = [
    { id: 21, full_name: 'Acme Client' },
    { id: 22, full_name: 'Globex Client' },
];
const ADH_DEPARTMENTS = [
    { id: 5, department_name: 'Engineering' },
    { id: 6, department_name: 'Support' },
];

function adhProps(over = {}) {
    return {
        department: ADH_DEPARTMENTS,
        department_handlers: [],
        supervisor: ADH_SUPERVISORS,
        client: ADH_CLIENTS,
        fetchUserList: jest.fn(() => Promise.resolve()),
        fetchDepartmentList: jest.fn(() => Promise.resolve()),
        fetchDepartmentHandlersList: jest.fn(() => Promise.resolve()),
        assignDepartmentHandlers: jest.fn(() => Promise.resolve()),
        ...over,
    };
}

function renderADH(over = {}) {
    const props = adhProps(over);
    const ref = React.createRef();
    const utils = render(<AssignDepartmentHandlers {...props} ref={ref} />);
    const rerenderWith = (next) =>
        utils.rerender(<AssignDepartmentHandlers {...props} {...next} ref={ref} />);
    return { ...utils, ref, props, rerenderWith };
}

const adhDeptSelect = (c) => c.querySelector('select[name="department_id"]');
const pickDept = async (container, value) => {
    await act(async () => { fireEvent.change(adhDeptSelect(container), { target: { value } }); });
};

let adhConfirm;
describe('Assign Department Handlers - page load', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        adhConfirm = jest.spyOn(window, 'confirm').mockImplementation(() => true);
    });
    afterEach(() => { adhConfirm.mockRestore(); });

    test('the form is withheld behind PageLoading until the department lookup has arrived', () => {
        const { container, getByTestId } = renderADH({ department: undefined });

        expect(getByTestId('page-loading')).toBeInTheDocument();
        expect(adhDeptSelect(container)).toBeNull();
    });

    test('the form is withheld behind PageLoading until the supervisor lookup has arrived', () => {
        const { container, getByTestId } = renderADH({ supervisor: undefined });

        expect(getByTestId('page-loading')).toBeInTheDocument();
        expect(adhDeptSelect(container)).toBeNull();
    });

    test('mounting fetches the supervisor roster, the client roster and the department list', async () => {
        const { props, getByText } = renderADH();
        await flush();

        expect(props.fetchUserList).toHaveBeenCalledTimes(2);
        expect(props.fetchUserList).toHaveBeenNthCalledWith(1, 'supervisor', { page: 'all' });
        expect(props.fetchUserList).toHaveBeenNthCalledWith(2, 'client', { page: 'all' });
        expect(props.fetchDepartmentList).toHaveBeenCalledTimes(1);
        expect(props.fetchDepartmentHandlersList).not.toHaveBeenCalled();
        expect(getByText('Assign Department Handlers')).toBeInTheDocument();
    });

    test('every department becomes an option behind the blank de-select option', async () => {
        const { container } = renderADH();
        await flush();

        const options = Array.from(adhDeptSelect(container).querySelectorAll('option'));
        expect(options.map((o) => o.value)).toEqual(['', '5', '6']);
        expect(options.map((o) => o.textContent)).toEqual(['', 'Engineering', 'Support']);
    });

    test('neither handler multiselect nor the Assign button exists before a department is chosen', async () => {
        const { container, queryByTestId } = renderADH();
        await flush();

        expect(queryByTestId('ms-Select Supervisor(s)')).toBeNull();
        expect(queryByTestId('ms-Select Client(s)')).toBeNull();
        expect(container.querySelector('button[type="submit"]')).toBeNull();
    });
});

describe('Assign Department Handlers - choosing a department', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        adhConfirm = jest.spyOn(window, 'confirm').mockImplementation(() => true);
    });
    afterEach(() => { adhConfirm.mockRestore(); });

    test('choosing a department looks up that departments existing handlers and records the choice', async () => {
        const { container, ref, props } = renderADH();
        await flush();

        await pickDept(container, '5');

        expect(props.fetchDepartmentHandlersList).toHaveBeenCalledTimes(1);
        expect(props.fetchDepartmentHandlersList).toHaveBeenCalledWith('5');
        expect(ref.current.state.selectedDepartment).toBe('5');
    });

    test('arriving handlers are split into the supervisor and client multiselects and pre-ticked', async () => {
        const { container, ref, rerenderWith, getByTestId } = renderADH();
        await flush();
        await pickDept(container, '5');

        await act(async () => {
            rerenderWith({ department_handlers: [{ id: 11, full_name: 'Gary Aure' }, { id: 21, full_name: 'Acme Client' }] });
        });
        await flush();

        expect(ref.current.state.showList).toBe(true);
        expect(ref.current.state.selectedSupervisors).toEqual([{ label: 'Gary Aure', value: 11 }]);
        expect(ref.current.state.selectedClients).toEqual([{ label: 'Acme Client', value: 21 }]);
        expect(getByTestId('ms-options-Select Supervisor(s)')).toHaveTextContent('Gary Aure|Glenn Macasarte');
        expect(getByTestId('ms-options-Select Client(s)')).toHaveTextContent('Acme Client|Globex Client');
        expect(getByTestId('ms-selected-Select Supervisor(s)')).toHaveTextContent('Gary Aure');
        expect(getByTestId('ms-selected-Select Client(s)')).toHaveTextContent('Acme Client');
    });

    test('a department with pre-ticked supervisors shows the Assign button and the read-back panels', async () => {
        const { container, rerenderWith, getByText } = renderADH();
        await flush();
        await pickDept(container, '5');
        await act(async () => {
            rerenderWith({ department_handlers: [{ id: 11, full_name: 'Gary Aure' }, { id: 21, full_name: 'Acme Client' }] });
        });
        await flush();

        expect(container.querySelector('button[type="submit"]').textContent).toContain('Assign');
        expect(getByText('Selected Supervisor(s):')).toBeInTheDocument();
        expect(getByText('Selected Client(s):')).toBeInTheDocument();
        expect(Array.from(container.querySelectorAll('li')).map((li) => li.textContent))
            .toEqual(['Gary Aure', 'Acme Client']);
    });

    test('a department with no existing handlers opens the panel with both multiselects empty', async () => {
        const { container, ref, rerenderWith, getByTestId } = renderADH();
        await flush();
        await pickDept(container, '5');

        await act(async () => { rerenderWith({ department_handlers: [] }); });
        await flush();

        expect(ref.current.state.showList).toBe(true);
        expect(ref.current.state.selectedSupervisors).toEqual([]);
        expect(ref.current.state.selectedClients).toEqual([]);
        expect(getByTestId('ms-selected-Select Supervisor(s)')).toHaveTextContent('');
        expect(container.querySelector('button[type="submit"]')).toBeNull();   // nothing selected yet
    });

    test('handlers arriving while no department is chosen keep the panel closed', async () => {
        const { ref, rerenderWith, queryByTestId } = renderADH();
        await flush();

        await act(async () => { rerenderWith({ department_handlers: [{ id: 11, full_name: 'Gary Aure' }] }); });
        await flush();

        expect(ref.current.state.showList).toBe(false);
        expect(ref.current.state.selectedSupervisors).toEqual([]);
        expect(queryByTestId('ms-Select Supervisor(s)')).toBeNull();
    });

    test('clearing the department back to blank closes the panel on the next handler update', async () => {
        const { container, ref, rerenderWith, queryByTestId } = renderADH();
        await flush();
        await pickDept(container, '5');
        await act(async () => { rerenderWith({ department_handlers: [{ id: 11, full_name: 'Gary Aure' }] }); });
        await flush();
        expect(ref.current.state.showList).toBe(true);

        await pickDept(container, '');
        await act(async () => { rerenderWith({ department_handlers: [] }); });
        await flush();

        expect(ref.current.state.selectedDepartment).toBe('');
        expect(ref.current.state.showList).toBe(false);
        expect(queryByTestId('ms-Select Supervisor(s)')).toBeNull();
    });

    // FINDING _FINDING_ADH_ZEROID - Validator.isValid() classifies numeric zero as "not valid", so a
    // department row whose primary key is 0 is selectable but its handler panel never opens.
    test('a department whose id is 0 is treated as no selection at all _FINDING_ADH_ZEROID', async () => {
        const { container, ref, rerenderWith, queryByTestId } = renderADH({
            department: [{ id: 0, department_name: 'Unassigned' }],
        });
        await flush();
        await pickDept(container, '0');

        expect(ref.current.state.selectedDepartment).toBe('0');
        await act(async () => { rerenderWith({ department_handlers: [{ id: 11, full_name: 'Gary Aure' }] }); });
        await flush();

        expect(ref.current.state.showList).toBe(false);
        expect(queryByTestId('ms-Select Supervisor(s)')).toBeNull();
    });

    // LATENT, NOT A LIVE BUG (see the header): the lifecycle guard is `nextProps.department_handlers
    // != this.props.department_handlers`, a reference comparison. If the identical array instance is
    // ever re-supplied the panel keeps the PREVIOUS department's handlers while the dropdown shows
    // the new department. lookupListReducers.js always assigns a fresh array off the HTTP response,
    // so the store cannot produce that today - this pins the guard's behaviour, nothing more.
    test('re-supplying the identical handler array leaves department 5s panel showing under department 6', async () => {
        const deptFiveHandlers = [{ id: 11, full_name: 'Gary Aure' }];
        const { container, ref, rerenderWith } = renderADH();
        await flush();

        // department 5: a genuinely new array arrives, so the panel opens and pre-ticks Gary.
        await pickDept(container, '5');
        await act(async () => { rerenderWith({ department_handlers: deptFiveHandlers }); });
        await flush();
        expect(ref.current.state.showList).toBe(true);
        expect(ref.current.state.selectedSupervisors).toEqual([{ label: 'Gary Aure', value: 11 }]);

        // department 6: the SAME array instance comes back, so the guard short-circuits and the
        // panel is never rebuilt for the new department.
        await pickDept(container, '6');
        await act(async () => { rerenderWith({ department_handlers: deptFiveHandlers }); });
        await flush();

        expect(ref.current.state.selectedDepartment).toBe('6');
        expect(ref.current.state.showList).toBe(true);
        expect(ref.current.state.selectedSupervisors).toEqual([{ label: 'Gary Aure', value: 11 }]);
    });

    // FINDING _FINDING_ADH_CROSSTYPEID - the cross-match is ===, so ids that differ only in type
    // silently produce an empty pre-selection instead of ticking the existing handler.
    test('numeric handler ids match the numeric roster ids and pre-tick correctly', async () => {
        const { container, ref, rerenderWith } = renderADH();
        await flush();
        await pickDept(container, '5');
        await act(async () => { rerenderWith({ department_handlers: [{ id: 11, full_name: 'Gary Aure' }] }); });
        await flush();

        expect(ref.current.state.selectedSupervisors).toEqual([{ label: 'Gary Aure', value: 11 }]);
    });

    test('handler ids arriving as strings silently pre-tick nobody _FINDING_ADH_CROSSTYPEID', async () => {
        const { container, ref, rerenderWith, getByTestId } = renderADH();
        await flush();
        await pickDept(container, '5');

        await act(async () => {
            rerenderWith({ department_handlers: [{ id: '11', full_name: 'Gary Aure' }, { id: '21', full_name: 'Acme Client' }] });
        });
        await flush();

        expect(ref.current.state.showList).toBe(true);
        expect(ref.current.state.selectedSupervisors).toEqual([]);   // '11' !== 11
        expect(ref.current.state.selectedClients).toEqual([]);
        expect(getByTestId('ms-selected-Select Supervisor(s)')).toHaveTextContent('');
    });

    // FINDING _FINDING_ADH_NOCLIENTGUARD - the render gate waits only for department + supervisor,
    // but componentWillReceiveProps dereferences nextProps.client.findIndex. componentWillMount
    // awaits three thunks that never return their promises, so all three lookups race and the
    // supervisor + department rosters can land while `client` is still undefined; the form is on
    // screen and usable in that window.
    // Driving this through a React re-render instead was tried and rejected: React delivers the
    // render-pass error out of band on a later tick, so the failure lands on whichever test happens
    // to be running and the suite goes flaky. Verified manually that a re-render does reach
    // callComponentWillReceiveProps -> beginWork and unmounts the tree; asserted here at the
    // lifecycle level, which is deterministic and names the exact line.
    test('handlers arriving before the client roster blow up inside the lifecycle _FINDING_ADH_NOCLIENTGUARD', async () => {
        const { container, ref, props } = renderADH({ client: undefined });
        await flush();
        await pickDept(container, '5');
        expect(ref.current.state.selectedDepartment).toBe('5');

        // Driven straight at the lifecycle so the assertion can name the line that blew up.
        let err = null;
        try {
            await ref.current.componentWillReceiveProps({
                ...props, client: undefined, department_handlers: [{ id: 11, full_name: 'Gary Aure' }],
            });
        } catch (e) { err = e; }

        expect(err).toBeInstanceOf(TypeError);
        expect(err.message).toMatch(/findIndex/);
        expect(ref.current.state.showList).toBe(false);   // panel never opened
    });

    test('the same lifecycle survives once the client roster has arrived', async () => {
        const { container, ref, props } = renderADH();
        await flush();
        await pickDept(container, '5');

        await ref.current.componentWillReceiveProps({
            ...props, department_handlers: [{ id: 11, full_name: 'Gary Aure' }],
        });

        expect(ref.current.state.showList).toBe(true);
        expect(ref.current.state.selectedSupervisors).toEqual([{ label: 'Gary Aure', value: 11 }]);
    });

    test('while the department list is reloading the dropdown collapses to the blank option only', async () => {
        const { container, ref } = renderADH();
        await flush();

        act(() => { ref.current.setState({ reloadingDepartmentList: true }); });

        expect(adhDeptSelect(container).querySelectorAll('option')).toHaveLength(1);
    });
});

describe('Assign Department Handlers - editing the selection', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        adhConfirm = jest.spyOn(window, 'confirm').mockImplementation(() => true);
    });
    afterEach(() => { adhConfirm.mockRestore(); });

    const openPanel = async () => {
        const utils = renderADH();
        await flush();
        await pickDept(utils.container, '5');
        await act(async () => {
            utils.rerenderWith({ department_handlers: [{ id: 11, full_name: 'Gary Aure' }] });
        });
        await flush();
        return utils;
    };

    test('ticking every supervisor updates both the state and the read-back list', async () => {
        const { container, ref, getByTestId } = await openPanel();

        await act(async () => { fireEvent.click(getByTestId('ms-all-Select Supervisor(s)')); });

        expect(ref.current.state.selectedSupervisors).toEqual([
            { label: 'Gary Aure', value: 11 }, { label: 'Glenn Macasarte', value: 12 },
        ]);
        expect(Array.from(container.querySelectorAll('li')).map((li) => li.textContent))
            .toEqual(['Gary Aure', 'Glenn Macasarte']);
    });

    test('clearing every supervisor withdraws the Assign button', async () => {
        const { container, ref, getByTestId, queryByText } = await openPanel();
        expect(container.querySelector('button[type="submit"]')).not.toBeNull();

        await act(async () => { fireEvent.click(getByTestId('ms-clear-Select Supervisor(s)')); });

        expect(ref.current.state.selectedSupervisors).toEqual([]);
        expect(container.querySelector('button[type="submit"]')).toBeNull();
        expect(queryByText('Selected Supervisor(s):')).toBeNull();
    });

    test('the client read-back panel only appears once at least one client is ticked', async () => {
        const { ref, getByTestId, queryByText } = await openPanel();
        expect(queryByText('Selected Client(s):')).toBeNull();

        await act(async () => { fireEvent.click(getByTestId('ms-all-Select Client(s)')); });

        expect(ref.current.state.selectedClients).toEqual([
            { label: 'Acme Client', value: 21 }, { label: 'Globex Client', value: 22 },
        ]);
        expect(queryByText('Selected Client(s):')).toBeInTheDocument();

        await act(async () => { fireEvent.click(getByTestId('ms-clear-Select Client(s)')); });
        expect(queryByText('Selected Client(s):')).toBeNull();
    });
});

describe('Assign Department Handlers - submitting the assignment', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        adhConfirm = jest.spyOn(window, 'confirm').mockImplementation(() => true);
    });
    afterEach(() => { adhConfirm.mockRestore(); });

    test('the assignment is confirmed with the admin before anything is posted', async () => {
        const { ref, props } = renderADH();
        await flush();

        await act(async () => {
            await ref.current.onSubmitHandler({
                department_id: '5',
                supervisor_user_id: [{ label: 'Gary Aure', value: 11 }],
                client_user_id: [],
            });
        });

        expect(adhConfirm).toHaveBeenCalledWith(
            'Are you sure you want to assign these Supervisors & Clients on the selected Department?');
        expect(props.assignDepartmentHandlers).toHaveBeenCalledTimes(1);
        // the actual ordering claim in the test name, not just "both happened"
        expect(adhConfirm.mock.invocationCallOrder[0])
            .toBeLessThan(props.assignDepartmentHandlers.mock.invocationCallOrder[0]);
    });

    test('declining the confirmation posts nothing and leaves the chosen department untouched', async () => {
        adhConfirm.mockReturnValue(false);
        const { container, ref, props } = renderADH();
        await flush();
        await pickDept(container, '5');

        await act(async () => {
            await ref.current.onSubmitHandler({
                department_id: '6',
                supervisor_user_id: [{ label: 'Gary Aure', value: 11 }],
                client_user_id: [],
            });
        });

        expect(props.assignDepartmentHandlers).not.toHaveBeenCalled();
        expect(ref.current.state.reloadingDepartmentList).toBe(false);
        expect(ref.current.state.selectedDepartment).toBe('5');
    });

    // FINDING _FINDING_ADH_MERGEDUSERS - both roles collapse into one flat user_id list, in
    // supervisors-then-clients order, with no role marker at all.
    test('supervisors and clients collapse into one flat user_id list _FINDING_ADH_MERGEDUSERS', async () => {
        const { ref, props } = renderADH();
        await flush();

        await act(async () => {
            await ref.current.onSubmitHandler({
                department_id: '5',
                supervisor_user_id: [{ label: 'Gary Aure', value: 11 }, { label: 'Glenn Macasarte', value: 12 }],
                client_user_id: [{ label: 'Acme Client', value: 21 }],
            });
        });

        expect(props.assignDepartmentHandlers).toHaveBeenCalledWith(
            '5', { department_id: '5', user_id: [11, 12, 21] });
        const payload = props.assignDepartmentHandlers.mock.calls[0][1];
        expect('supervisor_user_id' in payload).toBe(false);
        expect('client_user_id' in payload).toBe(false);
    });

    test('a person who is both a supervisor and a client is posted twice _FINDING_ADH_MERGEDUSERS', async () => {
        const { ref, props } = renderADH();
        await flush();

        await act(async () => {
            await ref.current.onSubmitHandler({
                department_id: '5',
                supervisor_user_id: [{ label: 'Gary Aure', value: 11 }],
                client_user_id: [{ label: 'Gary Aure', value: 11 }],
            });
        });

        expect(props.assignDepartmentHandlers.mock.calls[0][1].user_id).toEqual([11, 11]);
    });

    test('a client-only assignment still posts a user_id list, built from the clients alone', async () => {
        const { ref, props } = renderADH();
        await flush();

        await act(async () => {
            await ref.current.onSubmitHandler({
                department_id: '5',
                supervisor_user_id: null,
                client_user_id: [{ label: 'Acme Client', value: 21 }],
            });
        });

        expect(props.assignDepartmentHandlers).toHaveBeenCalledWith(
            '5', { department_id: '5', user_id: [21] });
    });

    test('clearing both roles posts an empty user_id list rather than dropping the key', async () => {
        const { ref, props } = renderADH();
        await flush();

        await act(async () => {
            await ref.current.onSubmitHandler({
                department_id: '5', supervisor_user_id: [], client_user_id: [],
            });
        });

        const payload = props.assignDepartmentHandlers.mock.calls[0][1];
        expect(payload.user_id).toEqual([]);
        expect('user_id' in payload).toBe(true);
    });

    test('null form fields are stripped from the payload entirely', async () => {
        const { ref, props } = renderADH();
        await flush();

        await act(async () => {
            await ref.current.onSubmitHandler({
                department_id: null, supervisor_user_id: null, client_user_id: null,
            });
        });

        expect(props.assignDepartmentHandlers).toHaveBeenCalledWith(null, {});
    });

    test('a completed assignment clears the reloading flag and pins the department it was made for', async () => {
        const { ref, props } = renderADH();
        await flush();

        await act(async () => {
            await ref.current.onSubmitHandler({
                department_id: '6', supervisor_user_id: [{ label: 'Gary Aure', value: 11 }], client_user_id: [],
            });
        });

        expect(props.assignDepartmentHandlers).toHaveBeenCalledTimes(1);
        expect(ref.current.state.reloadingDepartmentList).toBe(false);
        expect(ref.current.state.selectedDepartment).toBe('6');
    });

    test('a rejected assignment leaves the reloading flag stuck true and the department unpinned', async () => {
        const { ref } = renderADH({
            assignDepartmentHandlers: jest.fn(() => Promise.reject(new Error('500'))),
        });
        await flush();

        let caught = null;
        await act(async () => {
            try {
                await ref.current.onSubmitHandler({
                    department_id: '5', supervisor_user_id: [{ label: 'Gary Aure', value: 11 }], client_user_id: [],
                });
            } catch (e) { caught = e; }
        });

        expect(caught).toBeInstanceOf(Error);
        expect(ref.current.state.reloadingDepartmentList).toBe(true);
        expect(ref.current.state.selectedDepartment).toBeNull();
    });

    test('clicking Assign in the rendered form posts the department and its pre-ticked handlers', async () => {
        const { container, rerenderWith, props } = renderADH();
        await flush();
        await pickDept(container, '5');
        await act(async () => {
            rerenderWith({ department_handlers: [{ id: 11, full_name: 'Gary Aure' }, { id: 21, full_name: 'Acme Client' }] });
        });
        await flush();

        await act(async () => { fireEvent.click(container.querySelector('button[type="submit"]')); });
        await flush();
        await flush();

        expect(props.assignDepartmentHandlers).toHaveBeenCalledTimes(1);
        const [departmentId, payload] = props.assignDepartmentHandlers.mock.calls[0];
        expect(departmentId).toBe('5');
        expect(payload.department_id).toBe('5');
        expect(payload.user_id).toEqual([11, 21]);
    });
});

/* ================================================================================================
 *  DPAList - My Team -> DPA List
 * ============================================================================================== */

const DPA_ROWS = [
    { emp_num: 'E-001', full_name: 'Alice A', department: 'Engineering', dpa_ticked_at: '2026-07-01', is_active: 1 },
    { emp_num: 'E-002', full_name: 'Bob B', department: 'Support', dpa_ticked_at: null, is_active: 0 },
];
const DPA_LIST = { data: DPA_ROWS, pagination: { count: 2, total: 40, current_page: 1, last_page: 4 } };

function dpaProps(over = {}) {
    return {
        user: {
            full_name: 'Vishnu P',
            departments_handled: [
                { id: 5, department_name: 'Engineering' },
                { id: 6, department_name: 'Support' },
            ],
        },
        dpaList: { list: null, filters: {} },
        fetchDpaList: jest.fn(),
        exportDpaList: jest.fn(),
        history: { goBack: jest.fn(), push: jest.fn() },
        ...over,
    };
}

function renderDPA(over = {}) {
    const props = dpaProps(over);
    const ref = React.createRef();
    const utils = render(<DPAList {...props} ref={ref} />);
    return { ...utils, ref, props };
}

const activeSelect = (c) => c.querySelector('select[name="is_active"]');
const submittedSelect = (c) => c.querySelector('select[name="submitted_dpa"]');
const dpaDeptSelect = (c) => c.querySelector('select[name="department_id"]');
const nameFilter = (c) => c.querySelector('input[name="name"]');
const filterBtn = (c) =>
    Array.from(c.querySelectorAll('button[type="submit"]')).find((b) => /Filter/.test(b.textContent));

describe('DPA List - page load and filter bar', () => {
    beforeEach(() => { jest.clearAllMocks(); });

    test('an unloaded list triggers the initial fetch with the default Active filter', () => {
        const { props, getByText } = renderDPA();

        expect(props.fetchDpaList).toHaveBeenCalledTimes(1);
        expect(props.fetchDpaList).toHaveBeenCalledWith({
            is_active: 1, submitted_dpa: undefined, department_id: undefined, page: undefined,
        });
        expect(getByText('DPA List')).toBeInTheDocument();
    });

    test('an already loaded list is reused instead of being fetched again', () => {
        const { props } = renderDPA({ dpaList: { list: DPA_LIST, filters: {} } });

        expect(props.fetchDpaList).not.toHaveBeenCalled();
    });

    test('remembered filters are restored into the filter bar on remount', () => {
        const { container } = renderDPA({
            dpaList: { list: DPA_LIST, filters: { is_active: '0', submitted_dpa: '1', department_id: '6', page: 3 } },
        });

        expect(activeSelect(container).value).toBe('0');
        expect(submittedSelect(container).value).toBe('1');
        expect(dpaDeptSelect(container).value).toBe('6');
    });

    // FINDING _FINDING_DPA_INACTIVEDEFAULT - the restore is a truthiness test, so a remembered
    // is_active of numeric 0 (Inactive) silently comes back as 1 (Active).
    test('a remembered numeric Inactive filter is flipped back to Active _FINDING_DPA_INACTIVEDEFAULT', () => {
        const { container, ref } = renderDPA({
            dpaList: { list: DPA_LIST, filters: { is_active: 0 } },
        });

        expect(ref.current.state.filters.is_active).toBe(1);
        expect(activeSelect(container).value).toBe('1');
    });

    test('the employee-status filter offers Active and Inactive behind an instruction option', () => {
        const { container } = renderDPA({ dpaList: { list: DPA_LIST, filters: {} } });

        const options = Array.from(activeSelect(container).querySelectorAll('option'));
        expect(options.map((o) => o.label)).toEqual(['Select Employee Status', 'Active', 'Inactive']);
        expect(options.map((o) => o.value)).toEqual(['', '1', '0']);
    });

    test('the DPA-status filter offers Yes and No behind an instruction option', () => {
        const { container } = renderDPA({ dpaList: { list: DPA_LIST, filters: {} } });

        const options = Array.from(submittedSelect(container).querySelectorAll('option'));
        expect(options.map((o) => o.label)).toEqual(['Select DPA status', 'Yes', 'No']);
        expect(options.map((o) => o.value)).toEqual(['', '1', '0']);
    });

    test('the department filter is limited to the departments this user actually handles', () => {
        const { container } = renderDPA({ dpaList: { list: DPA_LIST, filters: {} } });

        const options = Array.from(dpaDeptSelect(container).querySelectorAll('option'));
        expect(options.map((o) => o.label)).toEqual(['Select Department', 'Engineering', 'Support']);
        expect(options.map((o) => o.value)).toEqual(['', '5', '6']);
    });

    test('a user handling no departments gets only the instruction option', () => {
        const { container } = renderDPA({
            user: { departments_handled: [] },
            dpaList: { list: DPA_LIST, filters: {} },
        });

        expect(dpaDeptSelect(container).querySelectorAll('option')).toHaveLength(1);
    });

    // FINDING _FINDING_DPA_DEPTUNDEF - departments_handled is mapped with no guard, so a profile
    // without the key takes the whole page down instead of degrading to an empty dropdown.
    test('a user profile with no departments_handled key crashes the page _FINDING_DPA_DEPTUNDEF', () => {
        let err = null;
        try {
            renderDPA({ user: { full_name: 'No Dept' }, dpaList: { list: DPA_LIST, filters: {} } });
        } catch (e) { err = e; }

        expect(err).toBeInstanceOf(TypeError);
        expect(err.message).toMatch(/map/);   // departments_handled is undefined
    });
});

describe('DPA List - the results table', () => {
    beforeEach(() => { jest.clearAllMocks(); });

    test('an unloaded list shows the no-records message and no table at all', () => {
        const { container, getByText } = renderDPA();

        expect(getByText('Sorry, no record found')).toBeInTheDocument();
        expect(container.querySelector('table')).toBeNull();
    });

    test('an empty result page shows the no-records message and no table', () => {
        const { container, getByText } = renderDPA({
            dpaList: { list: { data: [], pagination: { count: 0, total: 0, current_page: 1, last_page: 1 } }, filters: {} },
        });

        expect(getByText('Sorry, no record found')).toBeInTheDocument();
        expect(container.querySelector('table')).toBeNull();
    });

    test('a populated page renders one row per employee under the five column headings', () => {
        const { container } = renderDPA({ dpaList: { list: DPA_LIST, filters: {} } });

        expect(Array.from(container.querySelectorAll('thead th')).map((th) => th.textContent))
            .toEqual(['Emp #', 'Name', 'Department', 'Date Submitted', 'Status']);
        const rows = container.querySelectorAll('tbody tr');
        expect(rows).toHaveLength(2);
        expect(Array.from(rows[0].querySelectorAll('td')).map((td) => td.textContent.trim()))
            .toEqual(['E-001', 'Alice A', 'Engineering', '2026-07-01', 'Active']);
    });

    test('the record counter reports the page count against the grand total', () => {
        const { getByText } = renderDPA({ dpaList: { list: DPA_LIST, filters: {} } });

        expect(getByText(/total:/).textContent).toContain('2');
        expect(getByText(/total:/).textContent).toContain('40');
    });

    test('an active employee gets a green Active badge and an inactive one a red Inactive badge', () => {
        const { container } = renderDPA({ dpaList: { list: DPA_LIST, filters: {} } });

        const badges = container.querySelectorAll('.emp-status .badge');
        expect(badges).toHaveLength(2);
        expect(badges[0].textContent).toBe('Active');
        expect(badges[0].className).toContain('badge-success');
        expect(badges[1].textContent).toBe('Inactive');
        expect(badges[1].className).toContain('badge-danger');
    });

    // FINDING _FINDING_DPA_STATUSSTRICT - this is the sibling of the AssignSubDepartment
    // _FINDING_ASD_STRICTID bug: a switch is a strict comparison and the Status arm has no default,
    // so an is_active that arrives as the string "1" (or null) renders a completely blank cell.
    test('a status that arrives as a string renders no badge at all _FINDING_DPA_STATUSSTRICT', () => {
        const { container } = renderDPA({
            dpaList: {
                list: {
                    data: [{ emp_num: 'E-003', full_name: 'Carol C', department: 'Engineering', dpa_ticked_at: null, is_active: '1' }],
                    pagination: { count: 1, total: 1, current_page: 1, last_page: 1 },
                },
                filters: {},
            },
        });

        expect(container.querySelectorAll('tbody tr')).toHaveLength(1);
        expect(container.querySelectorAll('.emp-status .badge')).toHaveLength(0);
        expect(container.querySelector('.emp-status').textContent.trim()).toBe('');
    });

    test('a null status also renders a blank cell rather than defaulting to Inactive _FINDING_DPA_STATUSSTRICT', () => {
        const { container } = renderDPA({
            dpaList: {
                list: {
                    data: [{ emp_num: 'E-004', full_name: 'Dan D', department: 'Support', dpa_ticked_at: null, is_active: null }],
                    pagination: { count: 1, total: 1, current_page: 1, last_page: 1 },
                },
                filters: {},
            },
        });

        expect(container.querySelectorAll('.emp-status .badge')).toHaveLength(0);
    });

    test('the paginator offers forward navigation on page one and no back navigation', () => {
        const { container } = renderDPA({ dpaList: { list: DPA_LIST, filters: {} } });

        const labels = Array.from(container.querySelectorAll('.pagination_btn')).map((b) => b.textContent.trim());
        expect(labels).toEqual(['1', '2', '3', '4', 'Next', 'Last']);
    });

    test('the paginator offers back navigation once past the first page', () => {
        const { container } = renderDPA({
            dpaList: {
                list: { data: DPA_ROWS, pagination: { count: 2, total: 40, current_page: 3, last_page: 4 } },
                filters: {},
            },
        });

        const labels = Array.from(container.querySelectorAll('.pagination_btn')).map((b) => b.textContent.trim());
        expect(labels[0]).toBe('First');
        expect(labels[1]).toBe('Prev');
        expect(labels).toContain('Next');
        expect(labels).toContain('Last');
    });
});

describe('DPA List - filter and export payloads', () => {
    beforeEach(() => { jest.clearAllMocks(); });

    test('a plain filter goes to the list endpoint with every populated criterion', () => {
        const { ref, props } = renderDPA({ dpaList: { list: DPA_LIST, filters: {} } });

        act(() => {
            ref.current.onSubmitHandler({
                is_active: '1', submitted_dpa: '0', department_id: '5', name: 'ali', page: 1, export: false,
            });
        });

        expect(props.exportDpaList).not.toHaveBeenCalled();
        expect(props.fetchDpaList).toHaveBeenCalledTimes(1);
        expect(props.fetchDpaList).toHaveBeenCalledWith({
            is_active: '1', submitted_dpa: '0', department_id: '5', name: 'ali', page: 1,
        });
    });

    test('blank and null criteria are stripped from the list request', () => {
        const { ref, props } = renderDPA({ dpaList: { list: DPA_LIST, filters: {} } });

        act(() => {
            ref.current.onSubmitHandler({
                is_active: '1', submitted_dpa: null, department_id: '', name: '', page: 1, export: false,
            });
        });

        expect(props.fetchDpaList).toHaveBeenCalledWith({ is_active: '1', page: 1 });
    });

    // FINDING _FINDING_DPA_ZEROFILTER - the emptiness test is `!= ""`, which JavaScript evaluates as
    // false for the number 0, so a numeric Inactive filter is dropped instead of being sent.
    test('a numeric zero criterion is silently dropped from the request _FINDING_DPA_ZEROFILTER', () => {
        const { ref, props } = renderDPA({ dpaList: { list: DPA_LIST, filters: {} } });

        act(() => { ref.current.onSubmitHandler({ is_active: 0, submitted_dpa: 0, page: 1 }); });

        expect(props.fetchDpaList).toHaveBeenCalledWith({ page: 1 });
    });

    test('the same criterion sent as the string zero survives, so the DOM path still works', () => {
        const { ref, props } = renderDPA({ dpaList: { list: DPA_LIST, filters: {} } });

        act(() => { ref.current.onSubmitHandler({ is_active: '0', submitted_dpa: '0', page: 1 }); });

        expect(props.fetchDpaList).toHaveBeenCalledWith({ is_active: '0', submitted_dpa: '0', page: 1 });
    });

    test('exporting the filtered view goes to the export endpoint carrying every criterion', () => {
        const { ref, props } = renderDPA({ dpaList: { list: DPA_LIST, filters: {} } });

        act(() => {
            ref.current.onSubmitHandler({
                is_active: '1', submitted_dpa: '0', department_id: '5', name: 'ali', page: 2, export: 'filtered',
            });
        });

        expect(props.fetchDpaList).not.toHaveBeenCalled();
        expect(props.exportDpaList).toHaveBeenCalledTimes(1);
        expect(props.exportDpaList).toHaveBeenCalledWith({
            export: 'filtered', is_active: '1', submitted_dpa: '0', department_id: '5', name: 'ali', page: 2,
        });
    });

    // FINDING _FINDING_DPA_EXPORTALLKEEPSSTATUS - "Export All" only drops department_id and name;
    // is_active / submitted_dpa / page ride along, so it is not an export of all rows.
    test('exporting all drops the department and name but keeps the status filters _FINDING_DPA_EXPORTALLKEEPSSTATUS', () => {
        const { ref, props } = renderDPA({ dpaList: { list: DPA_LIST, filters: {} } });

        act(() => {
            ref.current.onSubmitHandler({
                is_active: '1', submitted_dpa: '0', department_id: '5', name: 'ali', page: 2, export: 'all',
            });
        });

        expect(props.fetchDpaList).not.toHaveBeenCalled();
        expect(props.exportDpaList).toHaveBeenCalledWith({
            export: 'all', is_active: '1', submitted_dpa: '0', page: 2,
        });
        const payload = props.exportDpaList.mock.calls[0][0];
        expect('department_id' in payload).toBe(false);
        expect('name' in payload).toBe(false);
    });

    test('an unrecognised export value falls through to the ordinary list request', () => {
        const { ref, props } = renderDPA({ dpaList: { list: DPA_LIST, filters: {} } });

        act(() => { ref.current.onSubmitHandler({ is_active: '1', export: 'csv' }); });

        expect(props.exportDpaList).not.toHaveBeenCalled();
        expect(props.fetchDpaList).toHaveBeenCalledWith({ is_active: '1', export: 'csv' });
    });

    test('changing the status and department dropdowns then pressing Filter re-queries from page one', async () => {
        const { container, props } = renderDPA({ dpaList: { list: DPA_LIST, filters: {} } });

        await act(async () => { fireEvent.change(activeSelect(container), { target: { value: '0' } }); });
        await act(async () => { fireEvent.change(dpaDeptSelect(container), { target: { value: '6' } }); });
        await act(async () => { fireEvent.click(filterBtn(container)); });
        await flush();
        await flush();

        expect(props.exportDpaList).not.toHaveBeenCalled();
        expect(props.fetchDpaList).toHaveBeenCalledTimes(1);
        expect(props.fetchDpaList).toHaveBeenCalledWith({
            is_active: '0', department_id: '6', page: 1,
        });
    });

    test('clearing the DPA-status dropdown back to the instruction option drops it from the query', async () => {
        const { container, props } = renderDPA({
            dpaList: { list: DPA_LIST, filters: { is_active: '1', submitted_dpa: '1' } },
        });

        await act(async () => { fireEvent.change(submittedSelect(container), { target: { value: '' } }); });
        await act(async () => { fireEvent.click(filterBtn(container)); });
        await flush();
        await flush();

        expect(props.fetchDpaList).toHaveBeenCalledWith({ is_active: '1', page: 1 });
    });

    // NOTE for whoever picks this up: there is deliberately no DOM-level test of the employee-name
    // box. Because jsdom 11 does not coerce its type="textfield" attribute down to "text", React's
    // isTextInputElement rejects the node and fireEvent.change never reaches Formik IN JSDOM ONLY.
    // Real browsers do coerce it and the filter works, so this is a test-harness limit, not a bug -
    // there is nothing here for a developer to fix. `name` is covered through onSubmitHandler above.
    test('the Filter button clears any previous export flag so a filter never exports', async () => {
        const { container, ref, props } = renderDPA({ dpaList: { list: DPA_LIST, filters: {} } });

        await act(async () => { fireEvent.click(filterBtn(container)); });
        await flush();
        await flush();

        expect(props.exportDpaList).not.toHaveBeenCalled();
        const payload = props.fetchDpaList.mock.calls[0][0];
        expect('export' in payload).toBe(false);
        expect(payload.page).toBe(1);
        expect(ref.current.state.filters.is_active).toBe(1);
    });

    test('opening the export menu offers both an Export and an Export All action', () => {
        const { container, getByText } = renderDPA({ dpaList: { list: DPA_LIST, filters: {} } });

        const dropdown = container.querySelector('.export-drop-down');
        expect(dropdown).not.toBeNull();
        expect(dropdown.querySelectorAll('.dropdown-menu button')).toHaveLength(0);   // closed

        fireEvent.click(getByText(/Export$/));

        expect(Array.from(dropdown.querySelectorAll('.dropdown-menu button')).map((b) => b.textContent))
            .toEqual(['Export', 'Export All']);
    });

    test('picking Export from the opened menu posts the export-filtered payload', async () => {
        const { container, getByText, props } = renderDPA({
            dpaList: { list: DPA_LIST, filters: { is_active: '1', submitted_dpa: '0' } },
        });

        fireEvent.click(getByText(/Export$/));
        const exportFiltered = Array.from(container.querySelectorAll('.dropdown-menu button'))
            .find((b) => b.textContent === 'Export');

        await act(async () => { fireEvent.click(exportFiltered); });
        await flush();
        await flush();

        expect(props.fetchDpaList).not.toHaveBeenCalled();
        expect(props.exportDpaList).toHaveBeenCalledTimes(1);
        expect(props.exportDpaList).toHaveBeenCalledWith({
            export: 'filtered', is_active: '1', submitted_dpa: '0',
        });
    });

    test('picking Export All from the opened menu posts the export-all payload', async () => {
        const { container, getByText, props } = renderDPA({ dpaList: { list: DPA_LIST, filters: {} } });

        fireEvent.click(getByText(/Export$/));
        const exportAll = Array.from(container.querySelectorAll('.dropdown-menu button'))
            .find((b) => b.textContent === 'Export All');

        await act(async () => { fireEvent.click(exportAll); });
        await flush();
        await flush();

        expect(props.fetchDpaList).not.toHaveBeenCalled();
        expect(props.exportDpaList).toHaveBeenCalledTimes(1);
        expect(props.exportDpaList).toHaveBeenCalledWith({ export: 'all', is_active: 1 });
    });
});
