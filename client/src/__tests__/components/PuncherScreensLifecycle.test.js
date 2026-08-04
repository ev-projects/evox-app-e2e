/**
 * PuncherScreensLifecycle.test.js
 *
 * SOURCE FILES UNDER TEST
 *   components/Dashboard/PunchComponents/MultiQuickpunch/MultiQuickpunch.js
 *       Menu: Dashboard -> Quick Punch  (multi-login / project-punch users)
 *   container/DailyTimeRecordPuncher/DailyTimeRecordPuncher.js
 *       Menu: DTR -> Punch History      (route dtr_punchlist + ':id')
 *
 * 29-JUL COVERAGE BASELINE
 *   MultiQuickpunch.js          76 uncovered lines / 38.7% covered
 *   DailyTimeRecordPuncher.js   47 uncovered lines / 32.9% covered
 *   ---------------------------------------------------------------
 *   packet total               123 uncovered lines
 *
 * WHAT THIS SUITE PINS DOWN
 *   Quick Punch is a state machine. The last punch row (`recent_punch[last].recent_log`)
 *   decides WHICH of the four buttons exist and which of them are enabled. That matrix is
 *   the business rule and it is asserted explicitly, one test per machine state, plus the
 *   day-lock (`disable_day`), the rest-day-work exception, and the early-morning
 *   "punch for yesterday" mode (`use_previous`).
 *   Punch History is a cascade: filters -> year -> month -> cut-off -> punch list. Every
 *   render gate is exercised on both arms, and the payload of every dispatch is asserted.
 *
 * FINDINGS (characterised - these tests assert what the code does TODAY, they do not
 *           endorse it and they do not fix it)
 *   MQP_PAUSEMODAL   'pause' is routed to the remarks/project modal exactly like 'out',
 *                    so pausing a shift demands a project + remark before it is recorded,
 *                    while 'in'/'continue' punch straight through with none.
 *   MQP_WARNSTICKY   modal_warn is set to true on a rejected modal submit and is never
 *                    cleared - not on a later successful submit, not on close - so the red
 *                    "project and remark missing." line stays on screen for every later punch.
 *   MQP_REMARKSTICKY remarks/project_name survive a successful submit. The modal's own
 *                    inputs are uncontrolled and come back blank, so the next punch-out
 *                    silently re-sends the PREVIOUS punch's project and remark.
 *   MQP_PREVDAYLOCK  in early-morning "select date" mode the Clock In button drops the
 *                    disable_day term (disabled={!isLogIn} instead of {!isLogIn||disable_day}),
 *                    so a day that is already locked can be re-opened between 00:00 and 05:00.
 *   MQP_OPTIONCLICK  the two <option> elements carry onClick handlers that set the Formik
 *                    'date' field. option onClick never fires; only the <select> onChange
 *                    does the work, so the handlers are dead code.
 *   MQP_STATEMUT     addSeconds mutates the Date object that is currently in state and hands
 *                    the same reference back to setState - a direct state mutation.
 *   DTRP_MONTHSORT   month keys are ordered with Object.keys().sort(), a lexicographic sort,
 *                    so October/November/December sort BEFORE July/August/September.
 *   DTRP_CUTOFFKEY   the cut-off dropdown emits data[key].id as its value but the change
 *                    handler looks the cut-off back up as data[value]. That only works while
 *                    the map happens to be keyed by id; any other key throws a TypeError.
 *   DTRP_TIMELOG     `punch?.time_log.map` guards the punch but hard-dereferences time_log,
 *                    so one punch row with no time_log blanks the whole Punch History page.
 *   DTRP_OWNERPOV    the same for the Toggle Outlook view - `log.owner_POV.time_in` is a hard
 *                    dereference, so toggling on a log with no owner_POV blanks the page.
 *   DTRP_EVAL        the DTR summary builds its holiday columns with eval() on the column key,
 *                    so a column key that is not a bare JS identifier throws during render.
 *   DTRP_DEADSTATE   the constructor's isDtrSummaryLoaded flag is never read; render gates on
 *                    props.dtr.isDtrSummaryLoaded instead.
 *
 * ADDITIVE ONLY - no existing test file is modified, no application source is changed.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

/* ------------------------------------------------------------------ plumbing */

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
}));

jest.mock('../../services/API', () => ({ call: jest.fn() }));

jest.mock('../../services/Authenticator', () => ({
    __esModule: true,
    default: {
        scanFeature: jest.fn(() => true),
        scanLevel: jest.fn(() => true),
        check: jest.fn(() => true),
    },
}));

jest.mock('../../components/GridComponent/AdminLte.js', () => {
    const R = require('react');
    return {
        ContainerHeader:  ({ children }) => R.createElement('div', null, children),
        ContainerWrapper: ({ children }) => R.createElement('div', null, children),
        ContainerBody:    ({ children }) => R.createElement('div', null, children),
        Content: ({ children, title, subtitle }) => R.createElement('div', null,
            R.createElement('h3', { 'data-testid': 'content-title' }, title),
            R.createElement('div', { 'data-testid': 'content-subtitle' }, subtitle),
            children),
        Row: ({ children }) => R.createElement('div', null, children),
        Col: ({ children }) => R.createElement('div', null, children),
    };
});

jest.mock('../../components/Template/Wrapper', () => {
    const R = require('react');
    return ({ children }) => R.createElement('div', null, children);
});
jest.mock('../../components/Template/BackButton', () => {
    const R = require('react');
    return () => R.createElement('div', { 'data-testid': 'back-button' });
});

jest.mock('react-datepicker', () => {
    const R = require('react');
    return () => R.createElement('div', { 'data-testid': 'datepicker' });
});

// react-select is re-published as a real <select> so the option list the container built can
// be read straight off the DOM and the onChange contract can be driven for real.
jest.mock('react-select', () => {
    const R = require('react');
    return (props) => {
        const opts = props.options || [];
        const current = props.value && props.value.value !== undefined
            ? String(props.value.value) : '';
        return R.createElement('select', {
            'data-testid': 'select-' + props.name,
            name: props.name,
            className: props.className,
            value: current,
            onChange: (e) => props.onChange(
                e.target.value === ''
                    ? null
                    : opts.find((o) => String(o.value) === e.target.value)),
        }, [R.createElement('option', { key: '__ph', value: '' }, props.placeholder)]
            .concat(opts.map((o) => R.createElement(
                'option', { key: String(o.value), value: String(o.value) }, o.label))));
    };
});

// One react-bootstrap stub serving both screens: Quick Punch needs Button/Modal/Form,
// Punch History needs Table/Toast/Button.
jest.mock('react-bootstrap', () => {
    const R = require('react');
    const div = ({ children }) => R.createElement('div', null, children);
    // Row/Col/Container must forward className - the punch clock face (.date/.time) and the
    // DTR summary panels (.SummaryBlock/.nsd/.ot/.otnd) are addressed by those classes.
    const divc = ({ children, className }) => R.createElement('div', { className }, children);

    const Modal = ({ children, show }) =>
        show ? R.createElement('div', { 'data-testid': 'modal' }, children) : null;
    Modal.Header = div; Modal.Body = div; Modal.Footer = div; Modal.Title = div;

    const Form = ({ children }) => R.createElement('form', null, children);
    Form.Group = div; Form.Label = ({ children }) => R.createElement('label', null, children);
    Form.Control = ({ children, onChange, as }) => (as === 'textarea'
        ? R.createElement('textarea', { onChange, 'data-testid': 'modal-remarks' })
        : R.createElement('select', { onChange, 'data-testid': 'modal-project' }, children));

    const Toast = ({ children }) => R.createElement('div', { className: 'toast' }, children);
    Toast.Header = ({ children }) => R.createElement('div', { className: 'toast-header' }, children);
    Toast.Body = ({ children }) => R.createElement('div', { className: 'toast-body' }, children);

    const Dropdown = div;
    Dropdown.Toggle = div; Dropdown.Menu = div; Dropdown.Item = div;

    return {
        Container: divc, Row: divc, Col: divc, Card: divc, Group: div, Label: div,
        Table: ({ children, className }) => R.createElement('table', { className }, children),
        Image: () => R.createElement('img', { alt: '' }),
        Spinner: () => R.createElement('div', { 'data-testid': 'spinner' }),
        Badge: ({ children }) => R.createElement('span', null, children),
        Button: ({ children, onClick, type, disabled, className }) =>
            R.createElement('button',
                { onClick, type: type || 'button', disabled: !!disabled, className }, children),
        InputGroup: div,
        FormControl: (p) => R.createElement('input', p),
        FormSelect: (p) => R.createElement('select', p),
        Control: (p) => R.createElement('input', p),
        Modal, ModalHeader: div, ModalBody: div, ModalFooter: div,
        Form, Toast, Dropdown,
    };
});

jest.mock('../../store/actions/dtr/quickpunchActions', () => ({ biometrixLogMulti: jest.fn() }));
jest.mock('../../store/actions/dtr/dtrActions', () => ({
    viewEmployeePunch: jest.fn(), getFilterForDtr: jest.fn(), getUserDtrSummary: jest.fn(),
    setSelectedPayrollCutoff: jest.fn(), viewEmployeeDtr: jest.fn(),
}));
jest.mock('../../store/actions/userActions', () => ({ fetchUser: jest.fn() }));
jest.mock('../../store/actions/redirectActions', () => ({ setRedirect: jest.fn() }));

// DEAD IMPORT inside DailyTimeRecordPuncher: `import { s } from '@fullcalendar/core/internal-common'`
// (`s` is never used - an IDE auto-import). It is ESM that Jest cannot parse, so it is stubbed.
jest.mock('@fullcalendar/core/internal-common', () => ({ s: {} }), { virtual: true });

global.links = new Proxy({}, { get: () => '/x/' });

const MultiQuickpunch =
    require('../../components/Dashboard/PunchComponents/MultiQuickpunch/MultiQuickpunch').default;
const DailyTimeRecordPuncher =
    require('../../container/DailyTimeRecordPuncher/DailyTimeRecordPuncher').default;

/* ------------------------------------------------------------------- helpers */

const flush = async () => { await act(async () => { await Promise.resolve(); }); };

const allButtons = (c) => Array.from(c.querySelectorAll('button'));
const btn = (c, label) => allButtons(c).find((b) => b.textContent.indexOf(label) !== -1);

/* ============================================================================
 *  SCREEN 1 - Dashboard -> Quick Punch   (MultiQuickpunch)
 * ========================================================================== */

const MIDDAY = () => new Date(2026, 6, 20, 12, 0, 0);      // Mon 20 Jul 2026, 12:00 local
const EARLY  = () => new Date(2026, 6, 20, 4, 0, 0);       // Mon 20 Jul 2026, 04:00 local

function renderPunch(over = {}) {
    const {
        recent_punch = [],
        isRecentPunchLoaded = true,
        time = MIDDAY(),
        user = { id: 42, user_server_timestamp_mils: null },
    } = over;

    const ref = React.createRef();
    const biometrixLogMulti = jest.fn();
    const utils = render(
        <MultiQuickpunch
            ref={ref}
            user={user}
            constant={{}}
            dashboard={{ recent_punch, isRecentPunchLoaded }}
            biometrixLogMulti={biometrixLogMulti}
        />
    );
    // state.time drives every date comparison in render; pin it instead of the wall clock.
    act(() => { ref.current.setState({ time }); });
    return { ...utils, ref, biometrixLogMulti };
}

/** The punch-button matrix, read straight off the rendered DOM. */
function matrix(container) {
    const read = (label) => {
        const b = btn(container, label);
        return b ? { shown: true, disabled: b.disabled } : { shown: false, disabled: null };
    };
    return {
        clockIn: read('Clock In'),
        clockOut: read('Clock Out'),
        pause: read('Pause'),
        cont: read('Continue'),
        dateSelect: container.querySelector('.select-date-multi select'),
    };
}

const logRow = (over = {}) => ({
    recent_log: 'Log_out',
    completed_today: false,
    date: '2026-07-20',
    time_in: '08:00:00',
    time_out: '17:00:00',
    date_time_in: '2026-07-20 08:00:00',
    date_time_out: '2026-07-20 17:00:00',
    log_in_type: 'regular',
    ...over,
});

describe('Quick Punch - which buttons exist and which are enabled for the current punch state', () => {
    beforeEach(() => { jest.useFakeTimers(); });
    afterEach(() => { jest.useRealTimers(); jest.clearAllMocks(); });

    test('while the recent punch list is still loading no punch button is offered at all', () => {
        const { container } = renderPunch({ isRecentPunchLoaded: false });
        const m = matrix(container);

        expect(m.clockIn.shown).toBe(false);
        expect(m.clockOut.shown).toBe(false);
        expect(m.pause.shown).toBe(false);
        expect(m.cont.shown).toBe(false);
        // the clock face is still painted even though nothing is actionable
        expect(container.querySelector('.quickpunch h3').textContent).toBe('QUICK PUNCH');
    });

    test('an employee with no punch at all today may only Clock In', () => {
        const { container } = renderPunch({ recent_punch: [] });
        const m = matrix(container);

        expect(m.clockIn).toEqual({ shown: true, disabled: false });
        expect(m.clockOut).toEqual({ shown: true, disabled: true });
        expect(m.pause.shown).toBe(false);
        expect(m.cont.shown).toBe(false);
        expect(m.dateSelect).toBeNull();
    });

    test('after Log_in the employee may Clock Out or Pause but may not Clock In again', () => {
        const { container } = renderPunch({ recent_punch: [logRow({ recent_log: 'Log_in' })] });
        const m = matrix(container);

        expect(m.clockIn).toEqual({ shown: true, disabled: true });
        expect(m.clockOut).toEqual({ shown: true, disabled: false });
        expect(m.pause).toEqual({ shown: true, disabled: false });
        expect(m.cont.shown).toBe(false);
    });

    test('after a Pause the ONLY offer is Continue - Clock Out is locked until the break ends', () => {
        const { container } = renderPunch({ recent_punch: [logRow({ recent_log: 'Pause' })] });
        const m = matrix(container);

        expect(m.cont).toEqual({ shown: true, disabled: false });
        expect(m.pause.shown).toBe(false);
        expect(m.clockOut).toEqual({ shown: true, disabled: true });
        expect(m.clockIn).toEqual({ shown: true, disabled: true });
    });

    test('after Continue the employee is back on the clock - Clock Out and Pause are live again', () => {
        const { container } = renderPunch({ recent_punch: [logRow({ recent_log: 'Continue' })] });
        const m = matrix(container);

        expect(m.pause).toEqual({ shown: true, disabled: false });
        expect(m.cont.shown).toBe(false);
        expect(m.clockOut).toEqual({ shown: true, disabled: false });
        expect(m.clockIn).toEqual({ shown: true, disabled: true });
    });

    test('after Log_out on an unfinished day the employee may Clock In again and nothing else', () => {
        const { container } = renderPunch({
            recent_punch: [logRow({ recent_log: 'Log_out', completed_today: false })],
        });
        const m = matrix(container);

        expect(m.clockIn).toEqual({ shown: true, disabled: false });
        expect(m.clockOut).toEqual({ shown: true, disabled: true });
        expect(m.pause.shown).toBe(false);
        expect(m.cont.shown).toBe(false);
    });

    test('only the LAST row of the recent punch list decides the state, earlier rows are ignored', () => {
        const { container } = renderPunch({
            recent_punch: [
                logRow({ recent_log: 'Log_in' }),
                logRow({ recent_log: 'Pause' }),
                logRow({ recent_log: 'Continue' }),
            ],
        });
        const m = matrix(container);

        // the tail is "Continue" -> on the clock
        expect(m.pause.shown).toBe(true);
        expect(m.cont.shown).toBe(false);
        expect(m.clockOut.disabled).toBe(false);
    });

    test('a day that has already been completed locks Clock In even though the last log is a Log_out', () => {
        const { container } = renderPunch({
            recent_punch: [logRow({
                recent_log: 'Log_out', completed_today: true,
                date: '2026-07-20', date_time_out: '2026-07-20 17:00:00',
            })],
        });
        const m = matrix(container);

        expect(m.clockIn).toEqual({ shown: true, disabled: true });
        expect(m.clockOut).toEqual({ shown: true, disabled: true });
        expect(m.pause.shown).toBe(false);
    });

    test('a completed day whose last clock out belongs to an EARLIER date does not lock today', () => {
        const { container } = renderPunch({
            time: new Date(2026, 6, 20, 12, 0, 0),
            recent_punch: [logRow({
                recent_log: 'Log_out', completed_today: true,
                date: '2026-07-19', date_time_out: '2026-07-19 17:00:00',
            })],
        });

        expect(matrix(container).clockIn).toEqual({ shown: true, disabled: false });
    });

    test('a completed REST DAY shift re-opens Clock In once an hour has passed since clocking out', () => {
        const { container } = renderPunch({
            time: new Date(2026, 6, 20, 20, 0, 0),   // 3h after the 17:00 clock out
            recent_punch: [logRow({
                recent_log: 'Log_out', completed_today: true, log_in_type: 'rest_day_work',
                date: '2026-07-20',
                date_time_in: '2026-07-20 08:00:00', date_time_out: '2026-07-20 17:00:00',
            })],
        });

        expect(matrix(container).clockIn).toEqual({ shown: true, disabled: false });
    });

    test('a completed REST DAY shift is still locked inside the one hour grace after clocking out', () => {
        const { container } = renderPunch({
            time: new Date(2026, 6, 20, 17, 30, 0),  // inside date_time_out + 1h
            recent_punch: [logRow({
                recent_log: 'Log_out', completed_today: true, log_in_type: 'rest_day_work',
                date: '2026-07-20',
                date_time_in: '2026-07-20 08:00:00', date_time_out: '2026-07-20 17:00:00',
            })],
        });

        expect(matrix(container).clockIn).toEqual({ shown: true, disabled: true });
    });

    test('a rest day shift locks Clock In for the first hour after the clock IN even on an unfinished day', () => {
        const { container } = renderPunch({
            time: new Date(2026, 6, 20, 8, 30, 0),   // inside date_time_in + 1h
            recent_punch: [logRow({
                recent_log: 'Log_out', completed_today: false, log_in_type: 'rest_day_work',
                date: '2026-07-20',
                date_time_in: '2026-07-20 08:00:00', date_time_out: '2026-07-20 08:20:00',
            })],
        });

        expect(matrix(container).clockIn).toEqual({ shown: true, disabled: true });
    });
});

describe('Quick Punch - the early-morning "punch for yesterday" mode', () => {
    beforeEach(() => { jest.useFakeTimers(); });
    afterEach(() => { jest.useRealTimers(); jest.clearAllMocks(); });

    test('a first-ever punch made between midnight and 03:00 offers the today/yesterday date picker', () => {
        const { container } = renderPunch({ recent_punch: [], time: new Date(2026, 6, 20, 1, 0, 0) });
        const m = matrix(container);

        expect(m.dateSelect).not.toBeNull();
        const opts = Array.from(m.dateSelect.querySelectorAll('option'));
        expect(opts.length).toBe(2);
        expect(opts[0].value).toBe('today');
        expect(opts[1].value).toBe('yesterday');
        expect(opts[1].disabled).toBe(false);
        expect(m.clockIn).toEqual({ shown: true, disabled: false });
    });

    test('the same first-ever punch made after 03:00 gets the plain Clock In with no date picker', () => {
        const { container } = renderPunch({ recent_punch: [], time: new Date(2026, 6, 20, 3, 30, 0) });

        expect(matrix(container).dateSelect).toBeNull();
        expect(matrix(container).clockIn).toEqual({ shown: true, disabled: false });
    });

    test('clocking in before 05:00 after a clock out dated to a previous day offers the date picker', () => {
        const { container } = renderPunch({
            time: EARLY(),
            recent_punch: [logRow({
                recent_log: 'Log_out', date: '2026-07-19',
                date_time_out: '2026-07-19 23:00:00',
            })],
        });

        expect(matrix(container).dateSelect).not.toBeNull();
    });

    test('the date picker is withdrawn when the previous shift was already closed after midnight today', () => {
        const { container } = renderPunch({
            time: EARLY(),
            recent_punch: [logRow({
                recent_log: 'Log_out', date: '2026-07-19',
                date_time_out: '2026-07-20 02:00:00',   // closed in the 00:00-03:00 window
            })],
        });

        expect(matrix(container).dateSelect).toBeNull();
        expect(matrix(container).clockIn).toEqual({ shown: true, disabled: false });
    });

    test('the date picker is withdrawn once the morning window has passed even on a previous-day clock out', () => {
        const { container } = renderPunch({
            time: new Date(2026, 6, 20, 6, 0, 0),      // past 05:00
            recent_punch: [logRow({
                recent_log: 'Log_out', date: '2026-07-19',
                date_time_out: '2026-07-19 23:00:00',
            })],
        });

        expect(matrix(container).dateSelect).toBeNull();
    });

    test('yesterday is greyed out of the date picker when yesterday has already been completed', () => {
        const { container } = renderPunch({
            time: EARLY(),
            recent_punch: [logRow({
                recent_log: 'Log_out', completed_today: true, date: '2026-07-19',
                date_time_out: '2026-07-19 23:00:00',
            })],
        });
        const m = matrix(container);

        expect(m.dateSelect).not.toBeNull();
        const opts = Array.from(m.dateSelect.querySelectorAll('option'));
        expect(opts[0].disabled).toBe(false);          // today stays open
        expect(opts[1].disabled).toBe(true);           // yesterday is closed
    });

    // FINDING MQP_PREVDAYLOCK - characterised, not endorsed.
    // Line 298 renders `disabled={!isLogIn || disable_day}` but line 312, the SAME Clock In
    // button in the use_previous branch, renders `disabled={!isLogIn}`. The completed-day lock
    // is therefore dropped for the whole 00:00-05:00 window: the punch below has
    // completed_today = true AND a clock out dated today, which locks Clock In at midday, yet
    // the button comes back enabled at 04:00.
    test('the completed day lock is silently dropped inside the early morning window_FINDING_MQP_PREVDAYLOCK', () => {
        const punch = [logRow({
            recent_log: 'Log_out', completed_today: true, date: '2026-07-19',
            date_time_in: '2026-07-19 08:00:00', date_time_out: '2026-07-19 23:00:00',
        })];

        const early = renderPunch({ time: EARLY(), recent_punch: punch });
        expect(matrix(early.container).dateSelect).not.toBeNull();
        expect(matrix(early.container).clockIn.disabled).toBe(false);
        early.unmount();

        // the very same punch row at midday: no date picker, and the lock is honoured
        const noon = renderPunch({
            time: MIDDAY(),
            recent_punch: [logRow({
                recent_log: 'Log_out', completed_today: true, date: '2026-07-20',
                date_time_in: '2026-07-20 08:00:00', date_time_out: '2026-07-20 17:00:00',
            })],
        });
        expect(matrix(noon.container).dateSelect).toBeNull();
        expect(matrix(noon.container).clockIn.disabled).toBe(true);
    });

    // FINDING MQP_OPTIONCLICK - characterised. Both <option> elements carry
    // onClick={() => setFieldValue('date', ...)}. A click on an <option> never dispatches to
    // that handler in any browser; the only thing that moves the field is the <select>'s
    // onChange. The handlers are dead weight, and the assertion below shows the field is
    // moved by the change event alone.
    test('the date field is moved by the select change event and never by the option handlers_FINDING_MQP_OPTIONCLICK', async () => {
        // in this mode on_date is true, so the punch goes through the "are you sure" prompt
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { container, biometrixLogMulti } = renderPunch({
            recent_punch: [], time: new Date(2026, 6, 20, 1, 0, 0),
        });
        const select = matrix(container).dateSelect;
        const yesterday = select.querySelectorAll('option')[1];

        // clicking the option itself changes nothing
        await act(async () => { fireEvent.click(yesterday); });
        expect(select.value).toBe('today');

        await act(async () => { fireEvent.change(select, { target: { value: 'yesterday' } }); });
        await act(async () => { fireEvent.click(btn(container, 'Clock In')); });
        await flush();
        await flush();

        expect(confirmSpy).toHaveBeenCalledTimes(1);
        expect(biometrixLogMulti).toHaveBeenCalledTimes(1);
        expect(biometrixLogMulti.mock.calls[0][0].get('date')).toBe('yesterday');
        expect(biometrixLogMulti.mock.calls[0][0].get('on_date')).toBe('true');
        confirmSpy.mockRestore();
    });
});

describe('Quick Punch - what each button actually submits', () => {
    beforeEach(() => { jest.useFakeTimers(); });
    afterEach(() => { jest.useRealTimers(); jest.clearAllMocks(); });

    test('pressing Clock In posts quickpunch=in for today against the logged in user', async () => {
        const { container, biometrixLogMulti } = renderPunch({ recent_punch: [] });

        await act(async () => { fireEvent.click(btn(container, 'Clock In')); });
        await flush();
        await flush();

        expect(biometrixLogMulti).toHaveBeenCalledTimes(1);
        const [form, userId] = biometrixLogMulti.mock.calls[0];
        expect(form.get('quickpunch')).toBe('in');
        expect(form.get('date')).toBe('today');
        expect(form.get('on_date')).toBe('false');
        expect(userId).toBe(42);
    });

    test('pressing Continue after a Pause posts quickpunch=continue with no remarks dialogue', async () => {
        const { container, biometrixLogMulti, ref } = renderPunch({
            recent_punch: [logRow({ recent_log: 'Pause' })],
        });

        await act(async () => { fireEvent.click(btn(container, 'Continue')); });
        await flush();
        await flush();

        expect(biometrixLogMulti).toHaveBeenCalledTimes(1);
        expect(biometrixLogMulti.mock.calls[0][0].get('quickpunch')).toBe('continue');
        expect(ref.current.state.showModal).toBe(false);
    });

    test('pressing Clock Out posts nothing until the project and remark have been supplied', async () => {
        const { container, biometrixLogMulti, ref } = renderPunch({
            recent_punch: [logRow({ recent_log: 'Log_in' })],
        });

        await act(async () => { fireEvent.click(btn(container, 'Clock Out')); });
        await flush();
        await flush();

        expect(biometrixLogMulti).not.toHaveBeenCalled();
        expect(ref.current.state.showModal).toBe(true);
        expect(ref.current.state.temp_values_formdata.quickpunch).toBe('out');

        act(() => { fireEvent.change(container.querySelector('[data-testid="modal-project"]'), { target: { value: 'EVOX' } }); });
        act(() => { fireEvent.change(container.querySelector('[data-testid="modal-remarks"]'), { target: { value: 'end of shift' } }); });
        act(() => { fireEvent.click(btn(container, 'Submit')); });

        expect(biometrixLogMulti).toHaveBeenCalledTimes(1);
        const form = biometrixLogMulti.mock.calls[0][0];
        expect(form.get('quickpunch')).toBe('out');
        expect(form.get('project_name')).toBe('EVOX');
        expect(form.get('remarks')).toBe('end of shift');
        expect(ref.current.state.showModal).toBe(false);
    });

    // FINDING MQP_PAUSEMODAL - characterised, not endorsed. onSubmitHandler only short-circuits
    // for "in" and "continue"; every other value falls into the else arm, so PAUSING a shift is
    // put behind the same mandatory project + remark dialogue as clocking out, while resuming
    // from that pause needs neither.
    test('pausing a shift is put behind the same mandatory project and remark dialogue as clocking out_FINDING_MQP_PAUSEMODAL', async () => {
        const { container, biometrixLogMulti, ref } = renderPunch({
            recent_punch: [logRow({ recent_log: 'Log_in' })],
        });

        await act(async () => { fireEvent.click(btn(container, 'Pause')); });
        await flush();
        await flush();

        expect(biometrixLogMulti).not.toHaveBeenCalled();
        expect(ref.current.state.showModal).toBe(true);
        expect(ref.current.state.temp_values_formdata.quickpunch).toBe('pause');
        expect(container.querySelector('[data-testid="modal"]')).not.toBeNull();
    });

    test('submitting the dialogue with a project but no remark is refused and keeps it open', () => {
        const { container, biometrixLogMulti, ref } = renderPunch({
            recent_punch: [logRow({ recent_log: 'Log_in' })],
        });
        act(() => { ref.current.onSubmitHandler({ quickpunch: 'out', on_date: false }); });

        act(() => { ref.current.handleProjectNameChange('EVOX'); });
        act(() => { fireEvent.click(btn(container, 'Submit')); });

        expect(biometrixLogMulti).not.toHaveBeenCalled();
        expect(ref.current.state.modal_warn).toBe(true);
        expect(ref.current.state.showModal).toBe(true);
        expect(container.textContent).toContain('project and remark missing.');
    });

    test('submitting the dialogue with a remark but no project is refused the same way', () => {
        const { container, biometrixLogMulti, ref } = renderPunch({
            recent_punch: [logRow({ recent_log: 'Log_in' })],
        });
        act(() => { ref.current.onSubmitHandler({ quickpunch: 'out', on_date: false }); });

        act(() => { ref.current.handleRemarkChange('done'); });
        act(() => { fireEvent.click(btn(container, 'Submit')); });

        expect(biometrixLogMulti).not.toHaveBeenCalled();
        expect(ref.current.state.modal_warn).toBe(true);
        expect(ref.current.state.showModal).toBe(true);
    });

    test('cancelling the dialogue closes it and posts nothing', () => {
        const { container, biometrixLogMulti, ref } = renderPunch({
            recent_punch: [logRow({ recent_log: 'Log_in' })],
        });
        act(() => { ref.current.onSubmitHandler({ quickpunch: 'out', on_date: false }); });
        expect(container.querySelector('[data-testid="modal"]')).not.toBeNull();

        act(() => { fireEvent.click(btn(container, 'Cancel')); });

        expect(ref.current.state.showModal).toBe(false);
        expect(container.querySelector('[data-testid="modal"]')).toBeNull();
        expect(biometrixLogMulti).not.toHaveBeenCalled();
    });

    test('a punch aimed at a previous date asks the user to confirm before it is posted', () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { ref, biometrixLogMulti } = renderPunch({ recent_punch: [] });

        act(() => { ref.current.onSubmitHandler({ quickpunch: 'in', on_date: true, date: 'yesterday' }); });

        expect(confirmSpy).toHaveBeenCalledTimes(1);
        expect(biometrixLogMulti).toHaveBeenCalledTimes(1);
        expect(biometrixLogMulti.mock.calls[0][0].get('date')).toBe('yesterday');
        confirmSpy.mockRestore();
    });

    test('declining that confirmation posts nothing', () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
        const { ref, biometrixLogMulti } = renderPunch({ recent_punch: [] });

        act(() => { ref.current.onSubmitHandler({ quickpunch: 'in', on_date: true }); });

        expect(confirmSpy).toHaveBeenCalledTimes(1);
        expect(biometrixLogMulti).not.toHaveBeenCalled();
        confirmSpy.mockRestore();
    });

    test('a clock out aimed at a previous date asks for confirmation after the dialogue is filled in', () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
        const { container, ref, biometrixLogMulti } = renderPunch({
            recent_punch: [logRow({ recent_log: 'Log_in' })],
        });
        act(() => { ref.current.onSubmitHandler({ quickpunch: 'out', on_date: true }); });
        act(() => { ref.current.handleProjectNameChange('LMS'); });
        act(() => { ref.current.handleRemarkChange('late'); });

        act(() => { fireEvent.click(btn(container, 'Submit')); });

        expect(confirmSpy).toHaveBeenCalledTimes(1);
        expect(biometrixLogMulti).not.toHaveBeenCalled();
        // the dialogue is closed regardless of the answer
        expect(ref.current.state.showModal).toBe(false);
        confirmSpy.mockRestore();
    });

    test('null values are dropped from the posted form while the rest are serialised', () => {
        const { ref, biometrixLogMulti } = renderPunch({ recent_punch: [] });

        act(() => {
            ref.current.onSubmitHandler({
                quickpunch: 'in', on_date: false, date: 'today',
                project_name: null, remarks: 'kept',
            });
        });

        const form = biometrixLogMulti.mock.calls[0][0];
        expect(form.has('project_name')).toBe(false);
        expect(form.get('remarks')).toBe('kept');
        expect(form.get('quickpunch')).toBe('in');
    });

    // FINDING MQP_WARNSTICKY - characterised, not endorsed. modal_warn is only ever set to
    // true. Neither the successful branch of handleModalSubmit nor handleModalClose clears it,
    // so once a user has forgotten a field the red warning is burned into every later dialogue.
    test('the missing field warning is never cleared once it has been raised_FINDING_MQP_WARNSTICKY', () => {
        const { container, ref, biometrixLogMulti } = renderPunch({
            recent_punch: [logRow({ recent_log: 'Log_in' })],
        });

        act(() => { ref.current.onSubmitHandler({ quickpunch: 'out', on_date: false }); });
        act(() => { fireEvent.click(btn(container, 'Submit')); });     // rejected -> warn on
        expect(ref.current.state.modal_warn).toBe(true);

        act(() => { ref.current.handleProjectNameChange('EVOX'); });
        act(() => { ref.current.handleRemarkChange('ok now'); });
        act(() => { fireEvent.click(btn(container, 'Submit')); });     // accepted
        expect(biometrixLogMulti).toHaveBeenCalledTimes(1);

        expect(ref.current.state.modal_warn).toBe(true);               // still on
        act(() => { ref.current.onSubmitHandler({ quickpunch: 'out', on_date: false }); });
        expect(container.textContent).toContain('project and remark missing.');
    });

    // FINDING MQP_REMARKSTICKY - characterised, not endorsed. remarks and project_name live on
    // the component and are never reset after a successful submit, while the dialogue's own
    // <select>/<textarea> are uncontrolled and therefore come back BLANK. The next clock out
    // shows two empty boxes and silently re-posts the previous punch's project and remark.
    test('the next clock out silently reuses the previous punch project and remark_FINDING_MQP_REMARKSTICKY', () => {
        const { container, ref, biometrixLogMulti } = renderPunch({
            recent_punch: [logRow({ recent_log: 'Log_in' })],
        });

        act(() => { ref.current.onSubmitHandler({ quickpunch: 'out', on_date: false }); });
        act(() => { ref.current.handleProjectNameChange('ODOO'); });
        act(() => { ref.current.handleRemarkChange('first shift'); });
        act(() => { fireEvent.click(btn(container, 'Submit')); });
        expect(biometrixLogMulti).toHaveBeenCalledTimes(1);

        // second clock out, user touches nothing
        act(() => { ref.current.onSubmitHandler({ quickpunch: 'out', on_date: false }); });
        expect(container.querySelector('[data-testid="modal-remarks"]').value).toBe('');
        act(() => { fireEvent.click(btn(container, 'Submit')); });

        expect(biometrixLogMulti).toHaveBeenCalledTimes(2);
        const second = biometrixLogMulti.mock.calls[1][0];
        expect(second.get('project_name')).toBe('ODOO');
        expect(second.get('remarks')).toBe('first shift');
    });
});

describe('Quick Punch - the running clock', () => {
    beforeEach(() => { jest.useFakeTimers(); });
    afterEach(() => { jest.useRealTimers(); jest.clearAllMocks(); });

    test('the clock face prints the pinned state time down to the second', () => {
        const { container } = renderPunch({ time: new Date(2026, 6, 20, 9, 5, 7) });

        expect(container.querySelector('.date').textContent).toBe('Monday, July 20th');
        const cells = Array.from(container.querySelectorAll('.time > div'))
            .map((d) => d.textContent);
        expect(cells).toEqual(['09', '05', '07']);
    });

    test('a user with no server timestamp falls back to browser time and never marks the offset loaded', () => {
        const { ref } = renderPunch({ user: { id: 42, user_server_timestamp_mils: null } });

        act(() => { jest.advanceTimersByTime(1100); });

        expect(ref.current.state.offsetHasLoaded).toBe(false);
    });

    test('a user with a server timestamp syncs to it on the first tick then ticks forward locally', () => {
        const { ref } = renderPunch({ user: { id: 42, user_server_timestamp_mils: Date.now() } });

        act(() => { jest.advanceTimersByTime(1100); });
        expect(ref.current.state.offsetHasLoaded).toBe(true);
        const first = ref.current.state.time.getTime();

        act(() => { jest.advanceTimersByTime(1100); });
        const second = ref.current.state.time.getTime();
        expect(second).toBeGreaterThan(first);
        expect((second - first) % 1000).toBe(0);   // whole seconds only, never a partial drift
    });

    test('leaving the dashboard clears the self-rescheduling clock timer', () => {
        const clearSpy = jest.spyOn(window, 'clearTimeout');
        const { unmount } = renderPunch();

        unmount();

        expect(clearSpy).toHaveBeenCalled();
        clearSpy.mockRestore();
    });

    // FINDING MQP_STATEMUT - characterised, not endorsed. addSeconds calls setSeconds on the
    // Date it is handed and returns THAT SAME object. render passes this.state.time straight
    // in, so every tick mutates the object already sitting in state and then setState is given
    // back the identical reference.
    test('the clock tick mutates the Date already held in state instead of replacing it_FINDING_MQP_STATEMUT', () => {
        const { ref } = renderPunch();
        const held = ref.current.state.time;
        const before = held.getTime();

        const returned = ref.current.addSeconds(held, 1);

        expect(returned).toBe(held);                       // same object handed back
        expect(held.getTime()).toBe(before + 1000);        // the object in state moved
    });
});

/* ============================================================================
 *  SCREEN 2 - DTR -> Punch History   (DailyTimeRecordPuncher)
 * ========================================================================== */

const JUL = {
    id: 9, name: 'JUL 16 - AUG 15', year: 2026, month: '7', month_label: 'July',
    start_date: '2026-07-16', end_date: '2026-08-15',
};
const JUL_B = {
    id: 11, name: 'JUL 01 - JUL 15', year: 2026, month: '7', month_label: 'July',
    start_date: '2026-07-01', end_date: '2026-07-15',
};

const FILTER = {
    2025: { 12: { label: 'December', data: { 3: { id: 3, name: 'DEC 16 - JAN 15', start_date: '2025-12-16', end_date: '2026-01-15' } } } },
    2026: {
        10: { label: 'October', data: { 21: { id: 21, name: 'OCT 16 - NOV 15', start_date: '2026-10-16', end_date: '2026-11-15' } } },
        7:  { label: 'July',    data: { 9: JUL, 11: JUL_B } },
        8:  { label: 'August',  data: { 13: { id: 13, name: 'AUG 16 - SEP 15', start_date: '2026-08-16', end_date: '2026-09-15' } } },
    },
};

const PUNCH_ROWS = [
    {
        date: '2026-07-16',
        time_log: [{
            time_in: '08:01', time_out: '17:02',
            owner_POV: { time_in: '02:01', time_out: '11:02' },
            log_in_type: 'regular', log_out_type: 'regular',
            project_name: 'EVOX', remarks: 'sprint work',
        }],
        payroll_items: {
            rendered_hours: '8.00', night_diff: '0.00',
            overtime: '1.00', overtime_night_diff: '0.00',
        },
    },
    {
        date: '2026-07-17',
        time_log: [
            {
                time_in: '08:00', time_out: '12:00',
                owner_POV: { time_in: '02:00', time_out: '06:00' },
                log_in_type: 'regular', log_out_type: 'pause',
                project_name: 'ODOO', remarks: 'morning',
            },
            {
                time_in: '13:00', time_out: '18:30',
                owner_POV: { time_in: '07:00', time_out: '12:30' },
                log_in_type: 'continue', log_out_type: 'regular',
                project_name: 'ODOO', remarks: 'afternoon',
            },
        ],
        payroll_items: {
            rendered_hours: '9.50', night_diff: '0.50',
            overtime: '1.50', overtime_night_diff: '0.25',
        },
    },
];

const SUMMARY = {
    data: {
        reg: { night_diff: '1.00', overtime: '2.00', overtime_night_diff: '0.50' },
        rd: { rendered_hours: '4.00', night_diff: '0.00', overtime: '0.00', overtime_night_diff: '0.00' },
    },
    column: { rd: 1 },
    column_names: { rd: 'Rest Day' },
};

function dtrActions() {
    return {
        getFilterForDtr: jest.fn(),
        viewEmployeePunch: jest.fn(() => Promise.resolve()),
        getUserDtrSummary: jest.fn(() => Promise.resolve()),
        setSelectedPayrollCutoff: jest.fn(() => Promise.resolve()),
        viewEmployeeDtr: jest.fn(),
        setRedirect: jest.fn(),
        fetchUser: jest.fn(),
    };
}

function dtrState(over = {}) {
    return {
        filter: FILTER,
        selectedPayrollCutoff: {},
        punch_list: PUNCH_ROWS,
        isFilterLoaded: true,
        isListPunchLoaded: true,
        isDtrSummaryLoaded: true,
        dtrSummary: SUMMARY,
        employeeInfo: { full_name: 'Ana Cruz', department: 'Engineering', timezone: 'Asia/Manila' },
        ...over,
    };
}

function renderPuncher(over = {}, actions = dtrActions()) {
    const { dtr: dtrOver, ...rest } = over;
    const props = {
        user: { id: 42 },
        params: { id: '42' },
        location: {},
        settings: { current_payroll_cutoff: JUL },
        ...rest,
        dtr: dtrState(dtrOver || {}),
    };
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter>
            <DailyTimeRecordPuncher ref={ref} {...props} {...actions} />
        </MemoryRouter>
    );
    return { ...utils, ref, actions, props };
}

/** Walk the year -> month -> cut-off cascade the way a user would. */
async function chooseCutoff(container, { year = '2026', month = '7', cutoff = '9' } = {}) {
    await act(async () => {
        fireEvent.change(container.querySelector('[data-testid="select-year"]'),
            { target: { value: year } });
    });
    await act(async () => {
        fireEvent.change(container.querySelector('[data-testid="select-month"]'),
            { target: { value: month } });
    });
    await act(async () => {
        fireEvent.change(container.querySelector('[data-testid="select-payroll_cutoff"]'),
            { target: { value: cutoff } });
    });
    await flush();
}

const optionsOf = (el) => Array.from(el.querySelectorAll('option'))
    .slice(1)
    .map((o) => ({ value: o.value, label: o.textContent }));

describe('Punch History - opening the screen', () => {
    afterEach(() => jest.clearAllMocks());

    test('opening the screen asks only for the cut-off filters of the employee in the route', () => {
        const { actions } = renderPuncher({ params: { id: '77' } });

        expect(actions.getFilterForDtr).toHaveBeenCalledTimes(1);
        expect(actions.getFilterForDtr).toHaveBeenCalledWith('77');
        expect(actions.viewEmployeePunch).not.toHaveBeenCalled();
        expect(actions.getUserDtrSummary).not.toHaveBeenCalled();
    });

    test('while the filters are still loading no dropdown and no punch table is rendered', () => {
        const { container } = renderPuncher({
            dtr: { isFilterLoaded: false, isListPunchLoaded: false },
        });

        expect(container.querySelector('[data-testid="select-year"]')).toBeNull();
        expect(container.querySelector('table.dtr-table')).toBeNull();
        expect(container.querySelector('[data-testid="content-title"]').textContent)
            .toBe('Punch History');
        expect(container.querySelector('[data-testid="back-button"]')).not.toBeNull();
    });

    test('once the filters arrive only the year dropdown is offered until a year is picked', () => {
        const { container } = renderPuncher();

        expect(container.querySelector('[data-testid="select-year"]')).not.toBeNull();
        expect(container.querySelector('[data-testid="select-month"]')).toBeNull();
        expect(container.querySelector('[data-testid="select-payroll_cutoff"]')).toBeNull();
        expect(container.querySelector('table.dtr-table')).toBeNull();
    });

    test('the year dropdown is built from the cut-off map that came back from the server', () => {
        const { container } = renderPuncher();

        expect(optionsOf(container.querySelector('[data-testid="select-year"]')))
            .toEqual([{ value: '2025', label: '2025' }, { value: '2026', label: '2026' }]);
    });

    test('an employee with no payroll cut-offs at all gets an empty year dropdown and no table', () => {
        const { container } = renderPuncher({ dtr: { filter: {} } });

        const year = container.querySelector('[data-testid="select-year"]');
        expect(year).not.toBeNull();
        expect(optionsOf(year)).toEqual([]);
        expect(container.querySelector('[data-testid="select-month"]')).toBeNull();
        expect(container.querySelector('table.dtr-table')).toBeNull();
    });

    test('viewing your own punch history shows no employee subtitle, viewing someone else does', () => {
        // params.id is the string '42', user.id the number 42 - the loose compare treats
        // them as the same person, so the screen is in "store" (own record) mode.
        const own = renderPuncher();
        expect(own.container.querySelector('[data-testid="content-subtitle"]').textContent).toBe('');
        own.unmount();

        const other = renderPuncher({ params: { id: '77' } });
        const subtitle = other.container.querySelector('[data-testid="content-subtitle"]').textContent;
        expect(subtitle).toContain('Ana Cruz');
        expect(subtitle).toContain('Engineering');
    });
});

describe('Punch History - the year / month / cut-off cascade', () => {
    afterEach(() => jest.clearAllMocks());

    test('picking a year reveals the month dropdown built from that year of the filter map', async () => {
        const { container } = renderPuncher();

        await act(async () => {
            fireEvent.change(container.querySelector('[data-testid="select-year"]'),
                { target: { value: '2025' } });
        });

        const month = container.querySelector('[data-testid="select-month"]');
        expect(month).not.toBeNull();
        expect(optionsOf(month)).toEqual([{ value: '12', label: 'December' }]);
        expect(container.querySelector('[data-testid="select-payroll_cutoff"]')).toBeNull();
    });

    // FINDING DTRP_MONTHSORT - characterised, not endorsed. The month list is produced with
    // Object.keys(filter[year]).sort(), which is a STRING sort, so '10' orders before '7'.
    // Any employee with an October/November/December cut-off sees the months out of order.
    test('the month dropdown is ordered as text so October lands above July_FINDING_DTRP_MONTHSORT', async () => {
        const { container } = renderPuncher();

        await act(async () => {
            fireEvent.change(container.querySelector('[data-testid="select-year"]'),
                { target: { value: '2026' } });
        });

        expect(optionsOf(container.querySelector('[data-testid="select-month"]')))
            .toEqual([
                { value: '10', label: 'October' },
                { value: '7', label: 'July' },
                { value: '8', label: 'August' },
            ]);
    });

    test('picking a month reveals the cut-off dropdown listing every cut-off of that month', async () => {
        const { container } = renderPuncher();

        await act(async () => {
            fireEvent.change(container.querySelector('[data-testid="select-year"]'),
                { target: { value: '2026' } });
        });
        await act(async () => {
            fireEvent.change(container.querySelector('[data-testid="select-month"]'),
                { target: { value: '7' } });
        });

        // Same lexicographic Object.keys().sort() as the month list (see DTRP_MONTHSORT), so
        // the SECOND-half cut-off keyed 11 is listed above the first-half cut-off keyed 9 -
        // the cut-offs are not offered in chronological order.
        expect(optionsOf(container.querySelector('[data-testid="select-payroll_cutoff"]')))
            .toEqual([
                { value: '11', label: 'JUL 01 - JUL 15' },
                { value: '9', label: 'JUL 16 - AUG 15' },
            ]);
    });

    test('picking a cut-off fetches the punches and the summary for exactly that date range', async () => {
        const { container, actions, ref } = renderPuncher();

        await chooseCutoff(container, { cutoff: '11' });

        expect(actions.viewEmployeePunch).toHaveBeenCalledTimes(1);
        expect(actions.viewEmployeePunch).toHaveBeenCalledWith('42', '2026-07-01', '2026-07-15');
        expect(actions.getUserDtrSummary).toHaveBeenCalledTimes(1);
        expect(actions.getUserDtrSummary).toHaveBeenCalledWith('42', '2026-07-01', '2026-07-15');
        expect(actions.setSelectedPayrollCutoff).toHaveBeenCalledWith(JUL_B);
        expect(ref.current.state.payrollCutoff_start).toBe('2026-07-01');
        expect(ref.current.state.payrollCutoff_end).toBe('2026-07-15');
    });

    test('changing the year afterwards wipes the month and cut-off so the table disappears again', async () => {
        const { container, ref } = renderPuncher();
        await chooseCutoff(container);
        expect(container.querySelector('table.dtr-table')).not.toBeNull();

        await act(async () => {
            fireEvent.change(container.querySelector('[data-testid="select-year"]'),
                { target: { value: '2025' } });
        });

        expect(ref.current.state.selectedMonth).toEqual({});
        expect(ref.current.state.selectedPayrollCutoff).toEqual({});
        expect(container.querySelector('[data-testid="select-payroll_cutoff"]')).toBeNull();
        expect(container.querySelector('table.dtr-table')).toBeNull();
    });

    test('changing the month afterwards wipes the cut-off but leaves the year standing', async () => {
        const { container, ref } = renderPuncher();
        await chooseCutoff(container);

        await act(async () => {
            fireEvent.change(container.querySelector('[data-testid="select-month"]'),
                { target: { value: '8' } });
        });

        expect(ref.current.state.selectedYear.value).toBe('2026');
        expect(ref.current.state.selectedMonth.value).toBe('8');
        expect(ref.current.state.selectedPayrollCutoff).toEqual({});
        expect(container.querySelector('table.dtr-table')).toBeNull();
    });

    test('clearing the year dropdown nulls the selection and takes the month dropdown away', async () => {
        const { container, ref } = renderPuncher();
        await chooseCutoff(container);

        await act(async () => {
            fireEvent.change(container.querySelector('[data-testid="select-year"]'),
                { target: { value: '' } });
        });

        expect(ref.current.state.selectedYear).toBeNull();
        expect(container.querySelector('[data-testid="select-month"]')).toBeNull();
    });

    test('clearing the cut-off dropdown nulls the selection and fetches nothing', async () => {
        const { container, ref, actions } = renderPuncher();
        await chooseCutoff(container);
        actions.viewEmployeePunch.mockClear();
        actions.getUserDtrSummary.mockClear();

        await act(async () => {
            fireEvent.change(container.querySelector('[data-testid="select-payroll_cutoff"]'),
                { target: { value: '' } });
        });

        expect(ref.current.state.selectedPayrollCutoff).toBeNull();
        expect(actions.viewEmployeePunch).not.toHaveBeenCalled();
        expect(actions.getUserDtrSummary).not.toHaveBeenCalled();
        expect(container.querySelector('table.dtr-table')).toBeNull();
    });

    // FINDING DTRP_CUTOFFKEY - characterised, not endorsed. The dropdown emits
    // data[key].id as its option value, but handleSelectPayrollCutoff resolves the choice as
    // filter[year][month].data[selected.value] - i.e. it looks the cut-off up by ID in a map
    // that the API is free to key any way it likes. The moment the key is not the id, the
    // lookup returns undefined and reading .start_date throws, blanking the screen.
    test('choosing a cut-off from a map that is not keyed by id throws instead of loading_FINDING_DTRP_CUTOFFKEY', async () => {
        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const { container, ref, actions } = renderPuncher({
            dtr: {
                filter: { 2026: { 7: { label: 'July', data: { row_a: JUL } } } },
                isListPunchLoaded: false,
            },
        });

        await act(async () => {
            fireEvent.change(container.querySelector('[data-testid="select-year"]'),
                { target: { value: '2026' } });
        });
        await act(async () => {
            fireEvent.change(container.querySelector('[data-testid="select-month"]'),
                { target: { value: '7' } });
        });
        // the option's value is the id 9, but data is keyed "row_a"
        expect(optionsOf(container.querySelector('[data-testid="select-payroll_cutoff"]')))
            .toEqual([{ value: '9', label: 'JUL 16 - AUG 15' }]);

        expect(() => ref.current.handleSelectPayrollCutoff({ label: 'JUL 16 - AUG 15', value: 9 }))
            .toThrow(TypeError);
        expect(actions.viewEmployeePunch).not.toHaveBeenCalled();
        spy.mockRestore();
    });

    test('the stored cut-off is rehydrated on a prop update and drives a fresh fetch', async () => {
        const actions = dtrActions();
        const ref = React.createRef();
        const base = {
            user: { id: 42 }, params: { id: '42' }, location: {},
            settings: { current_payroll_cutoff: JUL },
            dtr: dtrState({ selectedPayrollCutoff: JUL_B }),
        };
        const utils = render(
            <MemoryRouter><DailyTimeRecordPuncher ref={ref} {...base} {...actions} /></MemoryRouter>
        );
        expect(actions.viewEmployeePunch).not.toHaveBeenCalled();

        await act(async () => {
            utils.rerender(
                <MemoryRouter>
                    <DailyTimeRecordPuncher
                        ref={ref} {...base} {...actions}
                        settings={{ current_payroll_cutoff: { ...JUL } }} />
                </MemoryRouter>
            );
        });
        await flush();

        expect(ref.current.state.selectedPayrollCutoff).toEqual({ label: 'JUL 01 - JUL 15', value: 11 });
        expect(ref.current.state.isCurrentPayrollCutoffLoaded).toBe(true);
        expect(actions.viewEmployeePunch).toHaveBeenCalledWith('42', '2026-07-01', '2026-07-15');
    });

    test('a forced reset ignores the stored cut-off and rehydrates the current payroll cut-off', async () => {
        const actions = dtrActions();
        const ref = React.createRef();
        const base = {
            user: { id: 42 }, params: { id: '42' },
            location: { resetInitialState: true },
            settings: { current_payroll_cutoff: JUL },
            dtr: dtrState({ selectedPayrollCutoff: JUL_B }),
        };
        const utils = render(
            <MemoryRouter><DailyTimeRecordPuncher ref={ref} {...base} {...actions} /></MemoryRouter>
        );

        await act(async () => {
            utils.rerender(
                <MemoryRouter>
                    <DailyTimeRecordPuncher
                        ref={ref} {...base} {...actions}
                        settings={{ current_payroll_cutoff: { ...JUL } }} />
                </MemoryRouter>
            );
        });
        await flush();

        expect(ref.current.state.selectedPayrollCutoff).toEqual({ label: 'JUL 16 - AUG 15', value: 9 });
        expect(actions.viewEmployeePunch).toHaveBeenCalledWith('42', '2026-07-16', '2026-08-15');
    });
});

describe('Punch History - the punch table', () => {
    afterEach(() => jest.clearAllMocks());

    test('a chosen cut-off with punches renders one row per day and one bullet per time log', async () => {
        const { container } = renderPuncher();
        await chooseCutoff(container);

        const table = container.querySelector('table.dtr-table');
        expect(table).not.toBeNull();
        expect(table.querySelectorAll('thead th').length).toBe(9);

        const rows = table.querySelectorAll('tbody tr.punch-row');
        expect(rows.length).toBe(2);

        // day one: one log
        expect(rows[0].querySelector('.punch-date').textContent).toContain('Jul');
        expect(rows[0].querySelector('.punch-date').textContent).toContain('16');
        expect(rows[0].querySelectorAll('.punch-log')[0].querySelectorAll('li').length).toBe(1);
        expect(rows[0].querySelectorAll('.punch-log')[0].textContent).toBe('08:01');
        expect(rows[0].querySelectorAll('.punch-log')[1].textContent).toBe('17:02');
        expect(rows[0].querySelector('.punch-status').textContent).toBe('regular|regular');

        // day two: a paused shift -> two logs in every log column
        expect(rows[1].querySelectorAll('.punch-log')[0].querySelectorAll('li').length).toBe(2);
        expect(rows[1].querySelectorAll('.punch-log')[0].textContent).toBe('08:0013:00');
        expect(rows[1].querySelector('.punch-status').textContent)
            .toBe('regular|pausecontinue|regular');
    });

    test('the payroll buckets of each day are printed in their own columns', async () => {
        const { container } = renderPuncher();
        await chooseCutoff(container);

        const items = Array.from(
            container.querySelectorAll('tbody tr.punch-row')[1].querySelectorAll('.punch-item'))
            .map((td) => td.textContent);
        expect(items[0]).toBe('9.50 ');   // rendered hours (the cell carries a trailing space)
        expect(items[1]).toBe('0.50');    // NSD
        expect(items[2]).toBe('1.50');    // OT
        expect(items[3]).toBe('0.25');    // OTND
        expect(items[4]).toBe('ODOO -morningODOO -afternoon');   // projects and remarks
    });

    test('a day whose payroll items are missing still renders its row with blank buckets', async () => {
        const { container } = renderPuncher({
            dtr: {
                punch_list: [{
                    date: '2026-07-18',
                    time_log: [{ time_in: '09:00', time_out: '18:00', log_in_type: 'regular', log_out_type: 'regular', project_name: 'LMS', remarks: 'x' }],
                }],
            },
        });
        await chooseCutoff(container);

        const row = container.querySelector('tbody tr.punch-row');
        expect(row).not.toBeNull();
        const items = Array.from(row.querySelectorAll('.punch-item')).map((td) => td.textContent);
        expect(items.slice(0, 4)).toEqual([' ', '', '', '']);
    });

    test('a cut-off that returned no punches still renders the table with an empty body', async () => {
        const { container } = renderPuncher({ dtr: { punch_list: [] } });
        await chooseCutoff(container);

        const table = container.querySelector('table.dtr-table');
        expect(table).not.toBeNull();
        expect(table.querySelectorAll('thead th').length).toBe(9);
        expect(table.querySelectorAll('tbody tr').length).toBe(0);
    });

    test('the punch list is withheld while the punch fetch is still in flight', async () => {
        const { container } = renderPuncher({ dtr: { isListPunchLoaded: false } });
        await chooseCutoff(container);

        expect(container.querySelector('table.dtr-table')).toBeNull();
        expect(container.querySelector('[data-testid="select-payroll_cutoff"]')).not.toBeNull();
    });

    test('the chosen cut-off date range is printed above the table once it is known', async () => {
        const { container } = renderPuncher();
        expect(container.querySelector('.cutoff-text-border')).toBeNull();

        await chooseCutoff(container);

        const texts = Array.from(container.querySelectorAll('.cutoff-text')).map((s) => s.textContent);
        expect(texts).toEqual(['2026-07-16', '2026-08-15']);
    });

    // FINDING DTRP_TIMELOG - characterised, not endorsed. Every log column is written as
    // `punch?.time_log.map(...)`. The optional chain protects the punch object only; time_log
    // is still a hard dereference. One malformed day in the payload throws during render and
    // the user gets a blank Punch History instead of the other days.
    test('a single day with no time log blanks the whole punch history_FINDING_DTRP_TIMELOG', async () => {
        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

        // safe arm: the SAME malformed day never reaches render while the punch fetch is
        // still in flight, so nothing is drawn and nothing throws
        const pending = renderPuncher({
            dtr: {
                isListPunchLoaded: false,
                punch_list: [PUNCH_ROWS[0], { date: '2026-07-18', payroll_items: {} }],
            },
        });
        await chooseCutoff(pending.container);
        expect(pending.container.querySelector('table.dtr-table')).toBeNull();
        pending.unmount();

        // broken arm: once the list is marked loaded, the one day with no time_log takes the
        // whole page down instead of the other, well-formed days rendering
        const loaded = renderPuncher({
            dtr: { punch_list: [PUNCH_ROWS[0], { date: '2026-07-18', payroll_items: {} }] },
        });
        await expect(chooseCutoff(loaded.container)).rejects.toThrow(TypeError);
        spy.mockRestore();
    });
});

describe('Punch History - the Toggle Outlook view of another employee', () => {
    afterEach(() => jest.clearAllMocks());

    test('the toggle is not offered while you are looking at your own punch history', async () => {
        const { container } = renderPuncher();
        await chooseCutoff(container);

        expect(container.querySelector('.toggle-outlook-dtr')).toBeNull();
        const headers = Array.from(container.querySelectorAll('thead th')).map((t) => t.textContent);
        expect(headers[1]).toBe('Clock In  ');
        expect(headers[2]).toBe('Clock Out  ');
    });

    test('viewing someone else offers the toggle and starts on your own timezone view', async () => {
        const { container, ref } = renderPuncher({ params: { id: '77' } });
        await chooseCutoff(container);

        expect(container.querySelector('.toggle-outlook-dtr')).not.toBeNull();
        expect(ref.current.state.toggle_pov).toBe(false);
        const headers = Array.from(container.querySelectorAll('thead th')).map((t) => t.textContent);
        expect(headers[1]).toBe('Clock In  ');
        expect(container.querySelectorAll('tbody tr.punch-row')[0]
            .querySelectorAll('.punch-log')[0].textContent).toBe('08:01');
    });

    test('pressing the toggle switches every punch to the employee timezone and labels the columns', async () => {
        const { container, ref } = renderPuncher({ params: { id: '77' } });
        await chooseCutoff(container);

        await act(async () => { fireEvent.click(container.querySelector('.toggle-outlook-dtr')); });

        expect(ref.current.state.toggle_pov).toBe(true);
        const headers = Array.from(container.querySelectorAll('thead th')).map((t) => t.textContent);
        expect(headers[1]).toBe('Clock In   ( Asia/Manila )');
        expect(headers[2]).toBe('Clock Out   ( Asia/Manila )');

        const rows = container.querySelectorAll('tbody tr.punch-row');
        expect(rows[0].querySelectorAll('.punch-log')[0].textContent).toBe('02:01');
        expect(rows[0].querySelectorAll('.punch-log')[1].textContent).toBe('11:02');
        expect(rows[1].querySelectorAll('.punch-log')[0].textContent).toBe('02:0007:00');
    });

    test('pressing the toggle a second time returns to your own timezone view', async () => {
        const { container, ref } = renderPuncher({ params: { id: '77' } });
        await chooseCutoff(container);

        await act(async () => { fireEvent.click(container.querySelector('.toggle-outlook-dtr')); });
        await act(async () => { fireEvent.click(container.querySelector('.toggle-outlook-dtr')); });

        expect(ref.current.state.toggle_pov).toBe(false);
        expect(container.querySelectorAll('tbody tr.punch-row')[0]
            .querySelectorAll('.punch-log')[0].textContent).toBe('08:01');
    });

    // FINDING DTRP_OWNERPOV - characterised, not endorsed. The toggled view reads
    // log.owner_POV.time_in with no guard at all, so a single log line that the API returned
    // without an owner_POV block takes the entire page down the moment the toggle is pressed.
    test('toggling on a log with no owner timezone block blanks the page_FINDING_DTRP_OWNERPOV', async () => {
        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const { container, ref } = renderPuncher({
            params: { id: '77' },
            dtr: {
                punch_list: [{
                    date: '2026-07-16',
                    time_log: [{ time_in: '08:01', time_out: '17:02', log_in_type: 'regular', log_out_type: 'regular', project_name: 'EVOX', remarks: 'x' }],
                    payroll_items: {},
                }],
            },
        });
        await chooseCutoff(container);
        expect(container.querySelector('table.dtr-table')).not.toBeNull();

        expect(() => { ref.current.setState({ toggle_pov: true }); }).toThrow(TypeError);
        spy.mockRestore();
    });
});

describe('Punch History - the DTR summary block', () => {
    afterEach(() => jest.clearAllMocks());

    test('the summary prints the regular night differential, overtime and OT night differential', async () => {
        const { container } = renderPuncher();
        await chooseCutoff(container);

        const block = container.querySelector('.SummaryBlock');
        expect(block).not.toBeNull();
        expect(block.querySelector('.nsd .toast-body').textContent).toBe('1.00');
        expect(block.querySelector('.ot .toast-body').textContent).toBe('2.00');
        expect(block.querySelector('.otnd .toast-body').textContent).toBe('0.50');
    });

    test('one extra day-type panel is added for every column the summary reported', async () => {
        const { container } = renderPuncher();
        await chooseCutoff(container);

        const holidays = container.querySelectorAll('.SummaryBlock .holidays');
        expect(holidays.length).toBe(1);
        expect(holidays[0].textContent).toContain('Rest Day');
        const bodies = Array.from(holidays[0].querySelectorAll('.toast-body'))
            .map((b) => b.textContent.trim());
        expect(bodies).toEqual(['4.00', '0.00', '0.00', '0.00']);   // DAY, ND, OT, OTND
    });

    test('a day-type with no figures at all falls back to zeroes rather than blanks', async () => {
        const { container } = renderPuncher({
            dtr: {
                dtrSummary: {
                    data: { reg: { night_diff: '0.00', overtime: '0.00', overtime_night_diff: '0.00' } },
                    column: { rd: 1 },
                    column_names: { rd: 'Rest Day' },
                },
            },
        });
        await chooseCutoff(container);

        const bodies = Array.from(
            container.querySelectorAll('.SummaryBlock .holidays .toast-body'))
            .map((b) => b.textContent.trim());
        expect(bodies).toEqual(['0', '0', '0', '0']);
    });

    test('a summary with no extra columns renders the three regular panels and nothing more', async () => {
        const { container } = renderPuncher({
            dtr: {
                dtrSummary: {
                    data: { reg: { night_diff: '3.00', overtime: '0.00', overtime_night_diff: '0.00' } },
                    column: {}, column_names: {},
                },
            },
        });
        await chooseCutoff(container);

        expect(container.querySelectorAll('.SummaryBlock .holidays').length).toBe(0);
        expect(container.querySelector('.SummaryBlock .nsd .toast-body').textContent).toBe('3.00');
        expect(container.querySelector('table.dtr-table')).not.toBeNull();
    });

    test('the summary is held back while it is still being computed but the punch table is not', async () => {
        const { container } = renderPuncher({ dtr: { isDtrSummaryLoaded: false } });
        await chooseCutoff(container);

        expect(container.querySelector('.SummaryBlock')).toBeNull();
        expect(container.querySelector('table.dtr-table')).not.toBeNull();
    });

    // FINDING DTRP_EVAL - characterised, not endorsed. DtrSummaryBlock resolves each extra
    // column with eval('props.computations.column_names?.' + dtr_type). Any column key the
    // payroll configuration uses that is not a bare JavaScript identifier - a hyphen is enough -
    // is evaluated as an EXPRESSION and throws, taking the whole DTR screen with it. It is also
    // a live eval of server-supplied text inside render.
    test('a payroll column key that is not a bare identifier is executed as code and throws_FINDING_DTRP_EVAL', async () => {
        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const bad = renderPuncher({
            dtr: {
                isListPunchLoaded: true,
                dtrSummary: {
                    data: { reg: { night_diff: '0', overtime: '0', overtime_night_diff: '0' } },
                    column: { 'rest-day': 1 },
                    column_names: { 'rest-day': 'Rest Day' },
                },
            },
        });

        await expect(chooseCutoff(bad.container)).rejects.toThrow(ReferenceError);
        spy.mockRestore();
    });

    // FINDING DTRP_DEADSTATE - characterised. The constructor seeds isDtrSummaryLoaded: true on
    // component state, but render gates the summary on this.props.dtr.isDtrSummaryLoaded. The
    // state flag is dead: flipping it changes nothing on screen.
    test('the constructor summary loaded flag is dead and does not gate anything_FINDING_DTRP_DEADSTATE', async () => {
        const { container, ref } = renderPuncher();
        await chooseCutoff(container);
        expect(ref.current.state.isDtrSummaryLoaded).toBe(true);

        await act(async () => { ref.current.setState({ isDtrSummaryLoaded: false }); });

        expect(container.querySelector('.SummaryBlock')).not.toBeNull();
    });
});
