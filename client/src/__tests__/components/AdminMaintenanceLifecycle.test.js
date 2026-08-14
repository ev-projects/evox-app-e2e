/**
 * AdminMaintenanceLifecycle.test.js
 *
 * SOURCE FILES UNDER TEST
 *   1. container/Admin/ChangeLogs/ChangeLogs.js
 *        Menu:  Admin -> EVOX Updates            (Sidebar.js:1098)
 *        Route: global.links.manage_change_logs -> /app/admin/ManageChangeLogs/
 *               (config/RouteList.js:479-483, level Admin, role admin)
 *   2. container/Admin/DepartmentList/DepartmentList.js
 *        Menu:  Admin -> Department List         (Sidebar.js:1109)
 *        Route: global.links.department_list -> /app/admin/DepartmentList/
 *               (config/RouteList.js:485-489, permission access_department_list)
 *   3. container/Admin/JobOpeningsUpdate/JobOpeningsUpdate.js
 *        Menu:  Admin -> Careers                 (Sidebar.js:1055)
 *        Route: global.links.admin_import_careers -> /app/admin/CareersImport/
 *               (config/RouteList.js:518-522, permission full_access)
 *
 * CURRENT MEASURED COVERAGE (the baseline this suite was commissioned against, as supplied
 * in the packet - 61 uncovered statements across the three files):
 *        ChangeLogs.js          38.46% statements
 *        DepartmentList.js      42.42% statements
 *        JobOpeningsUpdate.js   45.45% statements
 *
 * AFTER THIS SUITE. Measured 2026-08-05, this suite alone:
 *   CI=true npx react-scripts test --watchAll=false
 *     --testPathPattern=AdminMaintenanceLifecycle --coverage
 *     --collectCoverageFrom=src/container/Admin/ChangeLogs/ChangeLogs.js
 *     --collectCoverageFrom=src/container/Admin/DepartmentList/DepartmentList.js
 *     --collectCoverageFrom=src/container/Admin/JobOpeningsUpdate/JobOpeningsUpdate.js
 *        ChangeLogs.js          94.87% stmts / 83.87% branch / 94.74% lines
 *        DepartmentList.js       100%  stmts /  100%  branch /  100%  lines
 *        JobOpeningsUpdate.js    100%  stmts / 94.44% branch /  100%  lines
 *   Everything still uncovered is unreachable by construction, and is itself a finding:
 *     ChangeLogs.js:68  - the `default: break` of the inner switch on values.method, which can
 *                         only ever see "store" (see CL_DEADGATE).
 *     ChangeLogs.js:202 - `return <PageLoading/>`, guarded by an always-true condition
 *                         (see CL_DEADGATE).
 *     JobOpeningsUpdate.js:129 - the false arm of `type != null && type === "csv"`. `type` is
 *                         seeded to 'csv' in the constructor and never written again, so the
 *                         csv chooser cannot be hidden and the <></> fallback is dead.
 *
 * WHAT IS WALKED
 *   PHASE 1  CHANGE LOG   render gate, category options, every arm of the Yup schema,
 *                         the confirm guard, and exactly what lands in the FormData.
 *   PHASE 2  DEPARTMENTS  mount fetch, load gate, row rendering, the multi-login toggle
 *                         payload, and the soft-delete confirm guard (both arms).
 *   PHASE 3  CAREERS      csv chooser, MIME gate, Papa.parse options, header-row drop,
 *                         preview table, and the import payload (both arms).
 *   PHASE 4  WIRING       mapStateToProps / mapDispatchToProps for all three containers,
 *                         captured off `connect` rather than executed through a real store.
 *
 * FINDINGS (characterised, NOT fixed - each test below asserts today's behaviour and is
 * named with a _FINDING_<CODE> suffix):
 *   CL_DESCDROP   ChangeLogs.js:42 overwrites values['description'] with this.state.description,
 *                 which stays null until the TinyMCE onEditorChange fires. The loop at line 48
 *                 skips null values, so pressing Submit without typing in the editor posts a
 *                 change log with NO description key at all - and it does so even when the
 *                 form was prefilled with a description. The description field is not in the
 *                 Yup schema (line 210 is commented out), so nothing stops the empty save.
 *   CL_DEADGATE   ChangeLogs.js:81 hardcodes `const method = 'store'`, so the render gate at
 *                 line 97 (`method == 'store' || ...`) is always true and the
 *                 `return <PageLoading/>` at line 202 is unreachable dead code. The
 *                 isInstanceLoaded prop is read but can never change what paints.
 *   CL_RESTDAYSLICE
 *                 ChangeLogs mapStateToProps (lines 217-218) sources `instance` and
 *                 `isInstanceLoaded` from state.restDayWork - the Rest Day Work redux slice -
 *                 not from any change-log slice. The EVOX Updates screen is therefore wired to
 *                 an unrelated feature's store branch; any key that slice grows which collides
 *                 with title/category/description/log_date prefills this form (lines 87-90).
 *   DL_SPLICE     DepartmentList.js:30 removes the row by mutating the redux array in place
 *                 (`this.props.departmentList.Deplist.splice(index, 1)`) instead of letting the
 *                 reducer produce new state. The same array object is kept, and the only reason
 *                 the table repaints is the unrelated toggleModal() setState on the next line.
 *   DL_MODALSTUCK DepartmentList.js:31 and :44 call toggleModal() after delete / after the
 *                 multi-login toggle, flipping modal_bool to true. There is no <Modal> in this
 *                 component's render at all, so the flag is left stuck on with nothing to show,
 *                 and a second delete flips it back off - the repaint is a side effect.
 *   DL_REFRESHRACE
 *                 DepartmentList.js:41-43 dispatches updateDepartmentScheduleStatus and then
 *                 immediately dispatches fetchDepartmentList in the same synchronous block,
 *                 without awaiting the update. The GET /department/all is issued before the
 *                 POST .../switch_active_schedule has resolved, so the refresh routinely
 *                 returns the pre-toggle status. (The action creator already dispatches the
 *                 refreshed list itself on success - departmentListActions.js:57-60 - so this
 *                 extra fetch is both racy and redundant.)
 *   DL_CHECKEDSTR DepartmentList.js:88 passes the STRING "checked" / "" to Form.Check's boolean
 *                 `checked` prop, and wires the handler to onClick with no onChange, so the
 *                 switch is a React-controlled input with no change handler.
 *   DL_LOGSPILL   DepartmentList.js:60 console.log's the entire department list object on every
 *                 render - shipped debug output that leaks the full department table into the
 *                 browser console of any admin who opens the screen.
 *   JOU_SEMICOLON JobOpeningsUpdate.js:178 closes with `</Formik>;` INSIDE the <Wrapper> JSX.
 *                 The `;` is not syntax there, it is a JSX text child, so a stray semicolon is
 *                 painted on the Job Openings Import page under the form.
 *   JOU_ACCEPT    JobOpeningsUpdate.js:134 sets accept="csv/*" on the file input. That is not a
 *                 valid MIME pattern (the type is "text", not "csv"), so the browser's file
 *                 picker filter matches nothing and the user has to switch it to "All Files"
 *                 before any csv is selectable.
 *   JOU_MIME      JobOpeningsUpdate.js:37 and :74 both gate on an exact
 *                 `type !== "text/csv"`. Chrome on Windows reports a .csv as
 *                 "application/vnd.ms-excel" whenever Excel owns the extension, so a perfectly
 *                 valid csv is rejected with "Please provide the correct file format."
 *   JOU_NOSCHEMA  JobOpeningsUpdate's Formik (line 116) has no validationSchema and no
 *                 field-level validate, so `errors` is permanently empty and the
 *                 <ErrorMessage name="file"/> slot at line 139 can never render anything. The
 *                 error/message keys seeded into initialValues (lines 110-111) are likewise
 *                 never read back out of `values`. All user-visible validation runs off
 *                 component state instead.
 *
 * DELIBERATELY NOT ASSERTED
 *   - The missing `key` prop on DepartmentList.js:81's <tr>. React de-duplicates that warning
 *     per owner, so an assertion on it would pass or fail depending on which test in this file
 *     ran first. It is a real source defect; it is simply not safely testable here.
 *   - `<i class="fa fa-trash">` (DepartmentList.js:104) and `<div class="invalid-feedback">`
 *     (JobOpeningsUpdate.js:136). React 16 warns about `class` but still emits the attribute,
 *     so there is no user-visible failure to characterise.
 *   - ChangeLogs.js:87 does `new Date(instance.log_date)` on a "YYYY-MM-DD" string, which
 *     parses as UTC midnight and therefore displays as the previous day west of Greenwich.
 *     Noted, but latent: nothing in the app ever puts a log_date on the restDayWork slice this
 *     screen reads, so no user reaches it. The prefill tests below assert the UTC instant, not
 *     a rendered local day, so they are timezone independent.
 *   - mapStateToProps / mapDispatchToProps are captured off the stubbed `connect` and called
 *     directly. No real store is constructed, so thunk bodies are not executed here.
 *
 * DETERMINISM
 *   No test reads the wall clock. Every date is built from explicit local components or
 *   asserted as a UTC instant. papaparse is stubbed so its FileReader never runs - the
 *   `complete` callback is invoked by the test, synchronously, inside act(). There are no
 *   timers, no polling and no debounce anywhere in these three files.
 *
 * ADDITIVE ONLY - no existing test file and no application source was modified.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

/* ------------------------------------------------------------------ mocks */

// connect is stubbed to identity so the containers can be driven with plain props, but the
// two map functions are stashed on the component so PHASE 4 can exercise them directly.
jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: (msp, mdp) => (Component) => {
        Component.__msp = msp;
        Component.__mdp = mdp;
        return Component;
    },
    useDispatch: () => jest.fn(),
}));

jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader:  ({ children }) => <div>{children}</div>,
    Content:          ({ children, title, subtitle, col }) =>
        <div data-testid="content" data-title={title} data-col={col}>{subtitle}{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
    Row:              ({ children }) => <div>{children}</div>,
    Col:              ({ children }) => <div>{children}</div>,
}));

jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div data-testid="wrapper">{children}</div>);
jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading" />);
jest.mock('../../components/Template/BackButton', () => () => <div data-testid="back-button" />);
jest.mock('react-datepicker', () => () => <input data-testid="raw-datepicker" />);
jest.mock('../../services/Authenticator', () => ({
    __esModule: true,
    default: { scanLevel: () => true, scanLevel_Feature: () => true, check: () => true },
}));

// The real InputDate (DatePicker.js:172-193) renders a nameless <Field> and reads the formik
// value via eval('field.value.' + props.name) - it IGNORES the `value` prop the call site
// passes. This mock reads the same formik value so the data path matches, exposes a plain text
// input so a date can be typed deterministically (local midnight => moment().format is
// timezone independent), publishes the raw UTC instant for prefill assertions, and keeps the
// real component's <ErrorMessage> so date validation messages surface exactly as in the app.
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => {
    const R = require('react');
    const { useFormikContext, ErrorMessage } = require('formik');

    const show = (v) => {
        if (v === null || v === undefined) return '';
        if (v instanceof Date) {
            const p = (n) => (n < 10 ? '0' + n : '' + n);
            return v.getFullYear() + '-' + p(v.getMonth() + 1) + '-' + p(v.getDate());
        }
        return String(v);
    };

    const InputDate = ({ name }) => {
        const { values, setFieldValue } = useFormikContext();
        const value = values[name];
        return R.createElement('div', null,
            R.createElement('input', {
                'data-testid': 'inputdate-' + name,
                'data-iso': value instanceof Date ? value.toISOString() : '',
                name,
                value: show(value),
                onChange: (e) => {
                    const raw = e.target.value;
                    if (!raw) { setFieldValue(name, null); return; }
                    const parts = raw.split('-').map(Number);
                    setFieldValue(name, new Date(parts[0], parts[1] - 1, parts[2]));
                },
            }),
            R.createElement(ErrorMessage, { component: 'div', name, className: 'input-feedback' }));
    };
    return { InputDate, InputTime: InputDate };
});

// TinyMCE: a textarea that forwards its value to onEditorChange exactly as the real editor
// does. No CDN script, no timers.
jest.mock('@tinymce/tinymce-react', () => {
    const R = require('react');
    return {
        Editor: ({ textareaName, initialValue, onEditorChange }) =>
            R.createElement('textarea', {
                'data-testid': 'editor-' + textareaName,
                defaultValue: initialValue,
                onChange: (e) => onEditorChange(e.target.value),
            }),
    };
});

jest.mock('react-bootstrap', () => {
    const R = require('react');
    const pass = ({ children }) => R.createElement('div', null, children);
    const Feedback = ({ children }) => R.createElement('div', null, children);

    const Control = ({ type, name, onChange, value, className, placeholder }) => {
        if (type === 'file') {
            return R.createElement('input',
                { type: 'file', name, onChange, 'data-testid': 'file-' + name });
        }
        return R.createElement('input', {
            type: type || 'text', name, className, placeholder, onChange,
            value: value === null || value === undefined ? '' : value,
            'data-testid': 'input-' + name,
        });
    };
    Control.Feedback = Feedback;

    const Form = pass;
    Form.Control = Control;

    return {
        Form,
        FormControl: Control,
        InputGroup: pass,
        Modal: pass, Container: pass, Row: pass, Col: pass,
        Table: ({ children }) => R.createElement('table', null, children),
        // the real react-bootstrap Button renders `btn btn-<variant>` plus whatever className it
        // is handed; the mock reproduces that so selectors match the DOM the app ships.
        Button: ({ children, onClick, type, variant, className, style }) =>
            R.createElement('button', {
                type: type || 'button',
                onClick,
                className: ['btn', variant ? 'btn-' + variant : '', className || ''].filter(Boolean).join(' '),
                style,
            }, children),
    };
});

// DepartmentList imports Form and Dropdown from their deep paths, which jest.mock('react-bootstrap')
// above does NOT intercept - they are separate modules.
jest.mock('react-bootstrap/Form', () => {
    const R = require('react');
    const Form = ({ children }) => R.createElement('div', null, children);
    // Form.Check is rendered by DepartmentList.js:87-93. The mock publishes the RAW `checked`
    // prop it was handed (JSON encoded) so DL_CHECKEDSTR can prove a string arrives where a
    // boolean belongs, and records whether an onChange was supplied at all.
    Form.Check = (props) => R.createElement('input', {
        type: 'checkbox',
        'data-testid': 'multilogin-' + props.id,
        'data-checked-prop': JSON.stringify(props.checked === undefined ? null : props.checked),
        'data-switch-type': props.type,
        'data-has-onchange': props.onChange ? 'yes' : 'no',
        checked: Boolean(props.checked),
        onClick: props.onClick,
        onChange: () => {},
    });
    const Feedback = ({ children }) => R.createElement('div', null, children);
    const Control = ({ children }) => R.createElement('div', null, children);
    Control.Feedback = Feedback;
    Form.Control = Control;
    return { __esModule: true, default: Form };
});

// The real Dropdown.Menu only mounts its children once the toggle is open. This mock renders
// them unconditionally so the Soft Delete button is directly clickable; the onClick under test
// is identical either way.
jest.mock('react-bootstrap/Dropdown', () => {
    const R = require('react');
    const Dropdown = ({ children }) => R.createElement('div', { 'data-testid': 'dropdown' }, children);
    Dropdown.Toggle = ({ children }) => R.createElement('button', { type: 'button' }, children);
    Dropdown.Menu = ({ children }) => R.createElement('div', null, children);
    Dropdown.Item = ({ children }) => R.createElement('div', null, children);
    return { __esModule: true, default: Dropdown };
});

// papaparse is stubbed so the FileReader it would otherwise open never runs. Tests invoke the
// `complete` callback themselves, synchronously.
jest.mock('papaparse', () => {
    const parse = jest.fn();
    return { __esModule: true, default: { parse }, parse };
});

// Action creators return identifiable plain objects so PHASE 4 can prove which creator each
// mapDispatchToProps key routes to, and with which arguments.
jest.mock('../../store/actions/admin/changeLogsActions', () => ({
    addChangeLogs: jest.fn((d) => ({ type: 'THUNK_ADD_CHANGELOG', data: d })),
}));
jest.mock('../../store/actions/redirectActions', () => ({
    setRedirect:   jest.fn((l) => ({ type: 'THUNK_SET_REDIRECT', link: l })),
    clearRedirect: jest.fn(() => ({ type: 'THUNK_CLEAR_REDIRECT' })),
}));
jest.mock('../../store/actions/admin/departmentListActions', () => ({
    fetchDepartmentList:            jest.fn(() => ({ type: 'THUNK_FETCH_DEPARTMENTS' })),
    deleteDepartment:               jest.fn((id) => ({ type: 'THUNK_DELETE_DEPARTMENT', id })),
    updateDepartmentScheduleStatus: jest.fn((id, d) => ({ type: 'THUNK_UPDATE_DEPT_SCHED', id, data: d })),
}));
jest.mock('../../store/actions/admin/jobOpeningActions.js', () => ({
    importJobOpening:  jest.fn((d) => ({ type: 'THUNK_IMPORT_JOBS', data: d })),
    fetchJobOpenings:  jest.fn(() => ({ type: 'THUNK_FETCH_JOBS' })),
}));

global.links = new Proxy({}, { get: (t, k) => '/x/' + String(k) + '/' });

/* ------------------------------------------------- components under test */

// ChangeLogs and changeLogsActions removed 2026-08-13 — Changelogs module retired
let ChangeLogs = null;
try { ChangeLogs = require('../../container/Admin/ChangeLogs/ChangeLogs.js').default; } catch (_) {}
const DepartmentList    = require('../../container/Admin/DepartmentList/DepartmentList.js').default;
const JobOpeningsUpdate = require('../../container/Admin/JobOpeningsUpdate/JobOpeningsUpdate.js').default;

let changeLogsActions = {};
try { changeLogsActions = require('../../store/actions/admin/changeLogsActions'); } catch (_) {}
const redirectActions       = require('../../store/actions/redirectActions');
const departmentListActions = require('../../store/actions/admin/departmentListActions');
const jobOpeningActions     = require('../../store/actions/admin/jobOpeningActions.js');
const Papa                  = require('papaparse').default;

/* ----------------------------------------------------------- utilities */

let confirmSpy;
let logSpy;

beforeEach(() => {
    jest.clearAllMocks();
    confirmSpy = jest.spyOn(window, 'confirm').mockImplementation(() => true);
    logSpy     = jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
    confirmSpy.mockRestore();
    logSpy.mockRestore();
});

/** text content of the .form-group whose <label> reads exactly `labelText` */
const groupText = (container, labelText) => {
    const groups = Array.from(container.querySelectorAll('.form-group'));
    const g = groups.find((el) => {
        const l = el.querySelector('label');
        return l && l.textContent === labelText;
    });
    return g ? g.textContent : '__NO_SUCH_GROUP__';
};

const submitTheForm = async (container) => {
    const btn = container.querySelector('button[type="submit"]');
    await act(async () => { fireEvent.click(btn); });
};

/** jsdom exposes input.files as a read-only getter; redefine it so the handler sees a real list */
const chooseFiles = (input, files) => {
    Object.defineProperty(input, 'files', { value: files, configurable: true, writable: false });
    fireEvent.change(input);
};

const csv  = (name) => new File(['a'], name, { type: 'text/csv' });
const notCsv = (name, type) => new File(['a'], name, { type });

const formDataToObject = (fd) => {
    const out = {};
    // jsdom 11's FormData is iterable via forEach
    fd.forEach((v, k) => { out[k] = v; });
    return out;
};

/* ================================================================== */
/* PHASE 1 - ADMIN -> EVOX UPDATES (ChangeLogs)                        */
/* ================================================================== */

const renderChangeLogs = (overrides = {}) => {
    const props = {
        instance:         {},
        isInstanceLoaded: false,
        addChangeLogs:    jest.fn(),
        setRedirect:      jest.fn(),
        constant:         {},
        user:             {},
        ...overrides,
    };
    const utils = render(<ChangeLogs {...props} />);
    return { ...utils, props };
};

/** fills every required field of the EVOX Updates form with a valid value */
const fillChangeLog = (container, { title = 'Payroll fix', category = 'Updates', date = '2026-03-09' } = {}) => {
    fireEvent.change(container.querySelector('[data-testid="input-title"]'), { target: { value: title } });
    fireEvent.change(container.querySelector('select[name="category"]'), { target: { value: category } });
    fireEvent.change(container.querySelector('[data-testid="inputdate-log_date"]'), { target: { value: date } });
};

describe.skip('Admin -> EVOX Updates: posting a change log (retired 2026-08-13 — ChangeLogs removed)', () => {

    it('paints the EVOX Updates form under its own heading rather than a loader', () => {
        const { container, getByText } = renderChangeLogs();
        expect(container.querySelector('[data-testid="page-loading"]')).toBeNull();
        expect(container.querySelector('[data-testid="content"]').getAttribute('data-title')).toBe('EVOX Updates');
        expect(getByText('Title:')).toBeInTheDocument();
        expect(getByText('Category:')).toBeInTheDocument();
        expect(getByText('Description:')).toBeInTheDocument();
    });

    it('offers exactly the three publishable categories plus an unselected blank', () => {
        const { container } = renderChangeLogs();
        const options = Array.from(container.querySelectorAll('select[name="category"] option'))
            .map((o) => o.value);
        expect(options).toEqual(['', 'Announcements', 'Updates', 'Release Notes']);
    });

    it('starts every field blank when the store holds no instance', () => {
        const { container } = renderChangeLogs({ instance: {} });
        expect(container.querySelector('[data-testid="input-title"]').value).toBe('');
        expect(container.querySelector('select[name="category"]').value).toBe('');
        expect(container.querySelector('[data-testid="inputdate-log_date"]').value).toBe('');
        expect(container.querySelector('[data-testid="editor-description"]').value).toBe('');
    });

    it('prefills title, category and description from an instance already in the store', () => {
        const { container } = renderChangeLogs({
            instance: { title: 'Old entry', category: 'Release Notes', description: '<p>legacy</p>' },
        });
        expect(container.querySelector('[data-testid="input-title"]').value).toBe('Old entry');
        expect(container.querySelector('select[name="category"]').value).toBe('Release Notes');
        expect(container.querySelector('[data-testid="editor-description"]').value).toBe('<p>legacy</p>');
    });

    it('converts an instance log_date string into a Date before handing it to the picker', () => {
        const { container } = renderChangeLogs({ instance: { log_date: '2026-03-09' } });
        // asserted as the UTC instant new Date('2026-03-09') produces, so the test does not
        // depend on the machine's timezone
        expect(container.querySelector('[data-testid="inputdate-log_date"]').getAttribute('data-iso'))
            .toBe('2026-03-09T00:00:00.000Z');
    });

    it('rejects a completely empty change log on all three required fields and sends nothing', async () => {
        const { container, props, getAllByText } = renderChangeLogs();
        await submitTheForm(container);
        expect(getAllByText('This field is required')).toHaveLength(3);
        expect(props.addChangeLogs).not.toHaveBeenCalled();
    });

    it('rejects a change log with no title, naming the Title field', async () => {
        const { container, props, getAllByText } = renderChangeLogs();
        fillChangeLog(container, { title: '' });
        await submitTheForm(container);
        expect(groupText(container, 'Title:')).toContain('This field is required');
        expect(getAllByText('This field is required')).toHaveLength(1);
        expect(props.addChangeLogs).not.toHaveBeenCalled();
    });

    it('rejects a change log with no category, naming the Category field', async () => {
        const { container, props, getAllByText } = renderChangeLogs();
        fillChangeLog(container, { category: '' });
        await submitTheForm(container);
        expect(groupText(container, 'Category:')).toContain('This field is required');
        expect(getAllByText('This field is required')).toHaveLength(1);
        expect(props.addChangeLogs).not.toHaveBeenCalled();
    });

    it('rejects a change log with no date, naming the Date field', async () => {
        const { container, props, getAllByText } = renderChangeLogs();
        fillChangeLog(container, { date: '' });
        await submitTheForm(container);
        expect(groupText(container, 'Date:')).toContain('This field is required');
        expect(getAllByText('This field is required')).toHaveLength(1);
        expect(props.addChangeLogs).not.toHaveBeenCalled();
    });

    it('asks for confirmation before publishing and abandons the change log when the admin declines', async () => {
        confirmSpy.mockReturnValue(false);
        const { container, props } = renderChangeLogs();
        fillChangeLog(container);
        await submitTheForm(container);
        expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to submit this change log?');
        expect(props.addChangeLogs).not.toHaveBeenCalled();
    });

    it('posts the change log once the admin confirms, with the log date normalised to YYYY-MM-DD', async () => {
        const { container, props } = renderChangeLogs();
        fillChangeLog(container, { title: 'Payroll fix', category: 'Updates', date: '2026-03-09' });
        fireEvent.change(container.querySelector('[data-testid="editor-description"]'),
            { target: { value: '<p>Cutoff corrected.</p>' } });
        await submitTheForm(container);

        expect(props.addChangeLogs).toHaveBeenCalledTimes(1);
        expect(formDataToObject(props.addChangeLogs.mock.calls[0][0])).toEqual({
            method:      'store',
            title:       'Payroll fix',
            category:    'Updates',
            log_date:    '2026-03-09',
            description: '<p>Cutoff corrected.</p>',
        });
    });

    it('carries only the latest editor content when the description is retyped', async () => {
        const { container, props } = renderChangeLogs();
        fillChangeLog(container);
        const editor = container.querySelector('[data-testid="editor-description"]');
        fireEvent.change(editor, { target: { value: 'first draft' } });
        fireEvent.change(editor, { target: { value: 'second draft' } });
        await submitTheForm(container);
        expect(props.addChangeLogs.mock.calls[0][0].get('description')).toBe('second draft');
    });

    it('omits the untouched action field from the payload instead of posting the string "null"', async () => {
        const { container, props } = renderChangeLogs();
        fillChangeLog(container);
        fireEvent.change(container.querySelector('[data-testid="editor-description"]'), { target: { value: 'x' } });
        await submitTheForm(container);
        const fd = props.addChangeLogs.mock.calls[0][0];
        expect(fd.has('action')).toBe(false);
        expect(fd.get('method')).toBe('store');
    });

    it('_FINDING_CL_DESCDROP drops the description entirely when the editor is never touched', async () => {
        const { container, props } = renderChangeLogs();
        fillChangeLog(container);
        await submitTheForm(container);

        expect(props.addChangeLogs).toHaveBeenCalledTimes(1);
        const fd = props.addChangeLogs.mock.calls[0][0];
        // the change log publishes with a title, category and date but no description at all
        expect(fd.has('description')).toBe(false);
        expect(fd.get('title')).toBe('Payroll fix');
    });

    it('_FINDING_CL_DESCDROP discards a prefilled description too, because state overrides the form value', async () => {
        const { container, props } = renderChangeLogs({
            instance: { title: 'Old entry', category: 'Updates', description: '<p>legacy copy</p>' },
        });
        // the description IS on screen, straight out of the instance...
        expect(container.querySelector('[data-testid="editor-description"]').value).toBe('<p>legacy copy</p>');
        fireEvent.change(container.querySelector('[data-testid="inputdate-log_date"]'), { target: { value: '2026-03-09' } });
        await submitTheForm(container);
        // ...but line 42 replaces it with the null state, and the null is then skipped
        expect(props.addChangeLogs).toHaveBeenCalledTimes(1);
        expect(props.addChangeLogs.mock.calls[0][0].has('description')).toBe(false);
    });

    it('_FINDING_CL_DEADGATE renders the same form whether or not the instance is flagged loaded', () => {
        const notLoaded = renderChangeLogs({ isInstanceLoaded: false });
        const notLoadedHtml = notLoaded.container.innerHTML;
        notLoaded.unmount();

        const loaded = renderChangeLogs({ isInstanceLoaded: true });
        expect(loaded.container.querySelector('[data-testid="page-loading"]')).toBeNull();
        expect(loaded.container.innerHTML).toBe(notLoadedHtml);
    });
});

/* ================================================================== */
/* PHASE 2 - ADMIN -> DEPARTMENT LIST                                  */
/* ================================================================== */

const DEPARTMENTS = () => ([
    { id: 3,  department_name: 'Finance',    schedule_active: true },
    { id: 11, department_name: 'Operations', schedule_active: false },
]);

const renderDepartments = (overrides = {}) => {
    const departmentList = {
        isDepartmentListLoaded: true,
        Deplist: DEPARTMENTS(),
        ...(overrides.departmentList || {}),
    };
    const props = {
        departmentList,
        fetchDepartmentList:            jest.fn(),
        deleteDepartment:               jest.fn(),
        updateDepartmentScheduleStatus: jest.fn(),
    };
    const ref = React.createRef();
    const utils = render(<DepartmentList ref={ref} {...props} />);
    return { ...utils, props, ref, departmentList };
};

const rowCells = (container) =>
    Array.from(container.querySelectorAll('tbody tr')).map((tr) =>
        Array.from(tr.querySelectorAll('td')).slice(0, 3).map((td) => td.textContent));

describe('Admin -> Department List: loading and listing departments', () => {

    it('requests the department list once on mount', () => {
        const { props } = renderDepartments();
        expect(props.fetchDepartmentList).toHaveBeenCalledTimes(1);
        expect(props.fetchDepartmentList).toHaveBeenCalledWith();
    });

    it('shows the page loader and no table until the list has loaded', () => {
        const { container, props } = renderDepartments({
            departmentList: { isDepartmentListLoaded: false, Deplist: [] },
        });
        expect(container.querySelector('[data-testid="page-loading"]')).not.toBeNull();
        expect(container.querySelector('table')).toBeNull();
        // the fetch is still fired from componentWillMount even while the loader shows
        expect(props.fetchDepartmentList).toHaveBeenCalledTimes(1);
    });

    it('lists each department with a 1-based row number, its id and its name', () => {
        const { container } = renderDepartments();
        expect(rowCells(container)).toEqual([
            ['1', '3', 'Finance'],
            ['2', '11', 'Operations'],
        ]);
    });

    it('renders the headed table with no rows when there are no departments', () => {
        const { container, getByText } = renderDepartments({
            departmentList: { isDepartmentListLoaded: true, Deplist: [] },
        });
        expect(container.querySelectorAll('tbody tr')).toHaveLength(0);
        expect(getByText('Department Name')).toBeInTheDocument();
        expect(container.querySelector('[data-testid="content"]').getAttribute('data-title'))
            .toBe('Department List');
    });

    it('labels multi-login ON for a schedule-active department and OFF for an inactive one', () => {
        const { getByText } = renderDepartments();
        expect(getByText('Multi Login:ON')).toBeInTheDocument();
        expect(getByText('Multi Login:OFF')).toBeInTheDocument();
    });

    it('_FINDING_DL_CHECKEDSTR hands Form.Check the string "checked"/"" instead of a boolean, with no onChange', () => {
        const { container } = renderDepartments();
        const on  = container.querySelector('[data-testid="multilogin-3"]');
        const off = container.querySelector('[data-testid="multilogin-11"]');
        expect(on.getAttribute('data-checked-prop')).toBe('"checked"');
        expect(off.getAttribute('data-checked-prop')).toBe('""');
        expect(on.getAttribute('data-switch-type')).toBe('switch');
        expect(on.getAttribute('data-has-onchange')).toBe('no');
    });

    it('_FINDING_DL_LOGSPILL writes the whole department list object to the browser console on render', () => {
        const { props } = renderDepartments();
        expect(logSpy).toHaveBeenCalledTimes(1);
        expect(logSpy).toHaveBeenCalledWith(props.departmentList);
        expect(logSpy.mock.calls[0][0].Deplist).toHaveLength(2);
    });
});

describe('Admin -> Department List: soft-deleting a department', () => {

    const softDelete = (container, rowIndex) => {
        const buttons = Array.from(container.querySelectorAll('button'))
            .filter((b) => b.textContent.includes('Soft Delete'));
        act(() => { fireEvent.click(buttons[rowIndex]); });
    };

    it('asks for confirmation before removing a department', () => {
        const { container } = renderDepartments();
        softDelete(container, 0);
        expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to Remove this Department ?');
    });

    it('soft-deletes by department id, not by row position, once confirmed', () => {
        const { container, props } = renderDepartments();
        softDelete(container, 1);           // second row is Operations, id 11
        expect(props.deleteDepartment).toHaveBeenCalledTimes(1);
        expect(props.deleteDepartment).toHaveBeenCalledWith(11);
    });

    it('leaves the department alone when the confirmation is declined', () => {
        confirmSpy.mockReturnValue(false);
        const { container, props, departmentList } = renderDepartments();
        softDelete(container, 0);
        expect(props.deleteDepartment).not.toHaveBeenCalled();
        expect(departmentList.Deplist).toHaveLength(2);
        expect(rowCells(container)).toHaveLength(2);
    });

    it('_FINDING_DL_SPLICE removes the row by mutating the redux array in place rather than through the reducer', () => {
        const { container, departmentList } = renderDepartments();
        const before = departmentList.Deplist;
        softDelete(container, 0);
        // same array object, one element shorter - state was edited outside any reducer
        expect(departmentList.Deplist).toBe(before);
        expect(departmentList.Deplist.map((d) => d.id)).toEqual([11]);
        expect(rowCells(container)).toEqual([['1', '11', 'Operations']]);
    });

    it('_FINDING_DL_MODALSTUCK leaves modal_bool switched on after a delete although the screen has no modal', () => {
        const { container, ref } = renderDepartments();
        expect(ref.current.state.modal_bool).toBe(false);
        softDelete(container, 0);
        expect(ref.current.state.modal_bool).toBe(true);
        expect(container.querySelector('.modal')).toBeNull();
        // a second delete flips it back off, proving the repaint is a side effect of the toggle
        softDelete(container, 0);
        expect(ref.current.state.modal_bool).toBe(false);
    });
});

describe('Admin -> Department List: switching multi-login for a department', () => {

    const toggle = (container, id) => {
        act(() => { fireEvent.click(container.querySelector('[data-testid="multilogin-' + id + '"]')); });
    };

    it('asks for confirmation before changing a schedule status', () => {
        const { container } = renderDepartments();
        toggle(container, 3);
        expect(confirmSpy).toHaveBeenCalledWith('Update this Department Schedule Status for Multi Login?');
    });

    it('posts the department id and its current status of true for an already-active department', () => {
        const { container, props } = renderDepartments();
        toggle(container, 3);
        expect(props.updateDepartmentScheduleStatus).toHaveBeenCalledTimes(1);
        const [id, fd] = props.updateDepartmentScheduleStatus.mock.calls[0];
        expect(id).toBe(3);
        expect(formDataToObject(fd)).toEqual({ id: '3', current_status: 'true' });
    });

    it('posts a current status of false for an inactive department', () => {
        const { container, props } = renderDepartments();
        toggle(container, 11);
        const [id, fd] = props.updateDepartmentScheduleStatus.mock.calls[0];
        expect(id).toBe(11);
        expect(formDataToObject(fd)).toEqual({ id: '11', current_status: 'false' });
    });

    it('sends nothing at all when the schedule-status confirmation is declined', () => {
        confirmSpy.mockReturnValue(false);
        const { container, props } = renderDepartments();
        toggle(container, 3);
        expect(props.updateDepartmentScheduleStatus).not.toHaveBeenCalled();
        // only the componentWillMount fetch, no refresh
        expect(props.fetchDepartmentList).toHaveBeenCalledTimes(1);
    });

    it('_FINDING_DL_REFRESHRACE re-fetches the list synchronously after firing the update, without awaiting it', () => {
        const { container, props } = renderDepartments();
        toggle(container, 3);
        expect(props.fetchDepartmentList).toHaveBeenCalledTimes(2);   // mount + refresh
        const updateOrder  = props.updateDepartmentScheduleStatus.mock.invocationCallOrder[0];
        const refreshOrder = props.fetchDepartmentList.mock.invocationCallOrder[1];
        // the refresh is issued in the same synchronous tick as the update it is meant to reflect
        expect(refreshOrder).toBe(updateOrder + 1);
    });

    it('_FINDING_DL_MODALSTUCK leaves modal_bool switched on after a multi-login toggle too', () => {
        const { container, ref } = renderDepartments();
        toggle(container, 3);
        expect(ref.current.state.modal_bool).toBe(true);
        expect(container.querySelector('.modal')).toBeNull();
    });
});

/* ================================================================== */
/* PHASE 3 - ADMIN -> CAREERS (JobOpeningsUpdate)                       */
/* ================================================================== */

const renderCareers = () => {
    const props = { importJobOpening: jest.fn(), user: {}, constant: {} };
    const ref = React.createRef();
    const utils = render(<JobOpeningsUpdate ref={ref} {...props} />);
    return { ...utils, props, ref };
};

const fileInput = (container) => container.querySelector('#csv-to-upload');

/** runs the papaparse `complete` callback the component registered, with the given rows */
const finishParse = (rows) => {
    const complete = Papa.parse.mock.calls[Papa.parse.mock.calls.length - 1][1].complete;
    act(() => { complete({ data: rows }); });
};

const JOB_ROWS = [
    ['Position Title', 'EV Careers Link', 'Category', 'Country'],
    ['Data Engineer',  'https://ev/de',   'Tech',     'Philippines'],
    ['Recruiter',      'https://ev/rc',   'HR',       'India'],
];

describe('Admin -> Careers: choosing a csv of job openings', () => {

    it('opens on the csv chooser with no preview table and no error', () => {
        const { container } = renderCareers();
        expect(fileInput(container)).not.toBeNull();
        expect(container.querySelector('table')).toBeNull();
        expect(container.querySelector('[data-testid="content"]').getAttribute('data-title'))
            .toBe('Job Openings Import');
    });

    it('rejects a non-csv file with a format message and parses nothing', () => {
        const { container, ref, getByText } = renderCareers();
        act(() => { chooseFiles(fileInput(container), [notCsv('handbook.pdf', 'application/pdf')]); });
        expect(getByText('Please provide the correct file format.')).toBeInTheDocument();
        expect(Papa.parse).not.toHaveBeenCalled();
        expect(ref.current.state.parsedJobs).toEqual([]);
        expect(ref.current.state.error).toBe(true);
    });

    it('_FINDING_JOU_MIME rejects a real .csv that the browser reports as application/vnd.ms-excel', () => {
        const { container, ref, getByText } = renderCareers();
        // this is exactly what Chrome on Windows reports for a .csv when Excel owns the extension
        act(() => { chooseFiles(fileInput(container), [notCsv('openings.csv', 'application/vnd.ms-excel')]); });
        expect(getByText('Please provide the correct file format.')).toBeInTheDocument();
        expect(Papa.parse).not.toHaveBeenCalled();
        expect(ref.current.state.csv_file).toEqual([]);
    });

    it('_FINDING_JOU_ACCEPT filters the file picker on the invalid MIME pattern "csv/*"', () => {
        const { container } = renderCareers();
        expect(fileInput(container).getAttribute('accept')).toBe('csv/*');
    });

    it('parses an accepted csv headerless and skipping empty lines', () => {
        const { container } = renderCareers();
        const file = csv('openings.csv');
        act(() => { chooseFiles(fileInput(container), [file]); });
        expect(Papa.parse).toHaveBeenCalledTimes(1);
        expect(Papa.parse.mock.calls[0][0]).toBe(file);
        const config = Papa.parse.mock.calls[0][1];
        expect(config.header).toBe(false);
        expect(config.skipEmptyLines).toBe(true);
        expect(typeof config.complete).toBe('function');
    });

    it('drops the csv header row and previews only the job rows', () => {
        const { container, ref } = renderCareers();
        act(() => { chooseFiles(fileInput(container), [csv('openings.csv')]); });
        finishParse(JOB_ROWS);

        expect(ref.current.state.parsedJobs).toEqual([JOB_ROWS[1], JOB_ROWS[2]]);
        const rows = Array.from(container.querySelectorAll('tbody tr'))
            .map((tr) => Array.from(tr.querySelectorAll('td')).map((td) => td.textContent));
        expect(rows).toEqual([
            ['Data Engineer', 'https://ev/de', 'Tech', 'Philippines'],
            ['Recruiter',     'https://ev/rc', 'HR',   'India'],
        ]);
    });

    it('shows no preview table when the csv holds nothing but a header row', () => {
        const { container, ref } = renderCareers();
        act(() => { chooseFiles(fileInput(container), [csv('empty.csv')]); });
        finishParse([JOB_ROWS[0]]);
        expect(ref.current.state.parsedJobs).toEqual([]);
        expect(container.querySelector('table')).toBeNull();
    });

    it('leaves the chosen file and its preview untouched when the picker is cancelled', () => {
        const { container, ref } = renderCareers();
        act(() => { chooseFiles(fileInput(container), [csv('openings.csv')]); });
        finishParse(JOB_ROWS);

        act(() => { chooseFiles(fileInput(container), []) });   // cancelled dialog: no files
        expect(Papa.parse).toHaveBeenCalledTimes(1);
        expect(ref.current.state.parsedJobs).toEqual([JOB_ROWS[1], JOB_ROWS[2]]);
        expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
    });

    it('clears the format error and shows the new preview when a valid csv replaces a rejected one', () => {
        const { container, ref, queryByText } = renderCareers();
        act(() => { chooseFiles(fileInput(container), [notCsv('handbook.pdf', 'application/pdf')]); });
        expect(ref.current.state.error).toBe(true);

        act(() => { chooseFiles(fileInput(container), [csv('openings.csv')]); });
        finishParse(JOB_ROWS);

        expect(ref.current.state.error).toBe(false);
        expect(ref.current.state.message).toBe('');
        expect(queryByText('Please provide the correct file format.')).toBeNull();
        expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
    });
});

describe('Admin -> Careers: importing the job openings', () => {

    it('refuses to import when no file has been chosen and says the field is required', async () => {
        const { container, props, getByText } = renderCareers();
        await submitTheForm(container);
        expect(props.importJobOpening).not.toHaveBeenCalled();
        expect(getByText('This field is required.')).toBeInTheDocument();
    });

    it('refuses to import after a rejected file and repeats the format message', async () => {
        const { container, props, getByText } = renderCareers();
        act(() => { chooseFiles(fileInput(container), [notCsv('handbook.pdf', 'application/pdf')]); });
        await submitTheForm(container);
        expect(props.importJobOpening).not.toHaveBeenCalled();
        expect(getByText('Please provide the correct file format.')).toBeInTheDocument();
    });

    it('imports the parsed rows as JSON, without the csv header row', async () => {
        const { container, props } = renderCareers();
        act(() => { chooseFiles(fileInput(container), [csv('openings.csv')]); });
        finishParse(JOB_ROWS);
        await submitTheForm(container);

        expect(props.importJobOpening).toHaveBeenCalledTimes(1);
        const fd = props.importJobOpening.mock.calls[0][0];
        expect(formDataToObject(fd)).toEqual({
            parsedJobs: JSON.stringify([JOB_ROWS[1], JOB_ROWS[2]]),
        });
        expect(JSON.parse(fd.get('parsedJobs'))).toHaveLength(2);
    });

    it('imports an empty array when the csv carried only a header row', async () => {
        const { container, props } = renderCareers();
        act(() => { chooseFiles(fileInput(container), [csv('openings.csv')]); });
        finishParse([JOB_ROWS[0]]);
        await submitTheForm(container);
        expect(props.importJobOpening.mock.calls[0][0].get('parsedJobs')).toBe('[]');
    });

    it('clears the outstanding error banner once a valid import goes through', async () => {
        const { container, ref, queryByText } = renderCareers();
        await submitTheForm(container);                       // -> "This field is required."
        expect(ref.current.state.error).toBe(true);

        act(() => { chooseFiles(fileInput(container), [csv('openings.csv')]); });
        finishParse(JOB_ROWS);
        await submitTheForm(container);

        expect(ref.current.state.error).toBe(false);
        expect(ref.current.state.message).toBe('');
        expect(queryByText('This field is required.')).toBeNull();
    });

    it('_FINDING_JOU_NOSCHEMA never fills the Formik error slot, because the form has no validation schema', async () => {
        const { container, getByText } = renderCareers();
        await submitTheForm(container);
        // The one message the user sees is the state-driven banner at line 136, which the
        // component wraps in <div class="invalid-feedback">.
        expect(getByText('This field is required.')).toBeInTheDocument();
        const allFeedback = Array.from(container.querySelectorAll('.input-feedback'));
        expect(allFeedback).toHaveLength(1);
        expect(allFeedback[0].parentElement.getAttribute('class')).toBe('invalid-feedback');
        // The <ErrorMessage component="div" name="file" className="input-feedback"/> at line 139
        // sits OUTSIDE that wrapper and contributes nothing, because formik has no schema and so
        // errors.file can never be set - even now, after a submit has run validation.
        expect(allFeedback.filter((el) => !el.closest('.invalid-feedback'))).toHaveLength(0);
    });

    it('_FINDING_JOU_SEMICOLON paints a stray semicolon under the import form', () => {
        const { container } = renderCareers();
        const wrapper = container.querySelector('[data-testid="wrapper"]');
        const last = wrapper.childNodes[wrapper.childNodes.length - 1];
        expect(last.nodeType).toBe(3);            // a Text node, not an element
        expect(last.textContent).toBe(';');
    });
});

/* ================================================================== */
/* PHASE 4 - REDUX WIRING                                              */
/* ================================================================== */

describe('Redux wiring for the three admin maintenance screens', () => {

    it.skip('_FINDING_CL_RESTDAYSLICE sources the EVOX Updates instance from the Rest Day Work slice (retired 2026-08-13)', () => {
        const state = {
            constant:    { x: 1 },
            user:        { id: 9 },
            restDayWork: { instance: { title: 'a rest day record' }, isInstanceLoaded: true },
        };
        const mapped = ChangeLogs.__msp(state);
        expect(mapped.instance).toBe(state.restDayWork.instance);
        expect(mapped.isInstanceLoaded).toBe(true);
        expect(mapped.constant).toBe(state.constant);
        expect(mapped.user).toBe(state.user);
        // there is no changeLogs branch involved at all
        expect(Object.keys(mapped).sort()).toEqual(['constant', 'instance', 'isInstanceLoaded', 'user']);
    });

    it.skip('_FINDING_CL_RESTDAYSLICE lets a Rest Day Work record prefill the EVOX Updates form (retired 2026-08-13)', () => {
        const state = {
            constant: {}, user: {},
            restDayWork: {
                instance: { title: 'Rest day 12 Mar', category: 'Updates' },
                isInstanceLoaded: true,
            },
        };
        const mapped = ChangeLogs.__msp(state);
        const { container } = render(<ChangeLogs {...mapped} addChangeLogs={jest.fn()} setRedirect={jest.fn()} />);
        expect(container.querySelector('[data-testid="input-title"]').value).toBe('Rest day 12 Mar');
        expect(container.querySelector('select[name="category"]').value).toBe('Updates');
    });

    it.skip('routes the change log save to addChangeLogs and the redirect to setRedirect (retired 2026-08-13)', () => {
        const dispatch = jest.fn();
        const bound = ChangeLogs.__mdp(dispatch);
        const fd = new FormData();

        bound.addChangeLogs(fd);
        expect(changeLogsActions.addChangeLogs).toHaveBeenCalledWith(fd);
        expect(dispatch).toHaveBeenLastCalledWith({ type: 'THUNK_ADD_CHANGELOG', data: fd });

        bound.setRedirect('/app/dashboard/');
        expect(redirectActions.setRedirect).toHaveBeenCalledWith('/app/dashboard/');
        expect(dispatch).toHaveBeenLastCalledWith({ type: 'THUNK_SET_REDIRECT', link: '/app/dashboard/' });
        expect(dispatch).toHaveBeenCalledTimes(2);
    });

    it('exposes only the departmentList branch to the Department List screen', () => {
        const state = { departmentList: { isDepartmentListLoaded: true, Deplist: [] }, user: { id: 1 } };
        const mapped = DepartmentList.__msp(state);
        expect(mapped.departmentList).toBe(state.departmentList);
        expect(Object.keys(mapped)).toEqual(['departmentList']);
    });

    it('routes each department action to its creator with the arguments the screen supplies', () => {
        const dispatch = jest.fn();
        const bound = DepartmentList.__mdp(dispatch);
        const fd = new FormData();

        bound.fetchDepartmentList();
        expect(dispatch).toHaveBeenLastCalledWith({ type: 'THUNK_FETCH_DEPARTMENTS' });

        bound.deleteDepartment(11);
        expect(departmentListActions.deleteDepartment).toHaveBeenCalledWith(11);
        expect(dispatch).toHaveBeenLastCalledWith({ type: 'THUNK_DELETE_DEPARTMENT', id: 11 });

        bound.updateDepartmentScheduleStatus(3, fd);
        expect(departmentListActions.updateDepartmentScheduleStatus).toHaveBeenCalledWith(3, fd);
        expect(dispatch).toHaveBeenLastCalledWith({ type: 'THUNK_UPDATE_DEPT_SCHED', id: 3, data: fd });
        expect(dispatch).toHaveBeenCalledTimes(3);
    });

    it('gives the Careers import screen the user and constant branches only', () => {
        const state = { user: { id: 4 }, constant: { c: 1 }, departmentList: {} };
        const mapped = JobOpeningsUpdate.__msp(state);
        expect(mapped.user).toBe(state.user);
        expect(mapped.constant).toBe(state.constant);
        expect(Object.keys(mapped).sort()).toEqual(['constant', 'user']);
    });

    it('routes the careers import to importJobOpening with the form data it was handed', () => {
        const dispatch = jest.fn();
        const fd = new FormData();
        JobOpeningsUpdate.__mdp(dispatch).importJobOpening(fd);
        expect(jobOpeningActions.importJobOpening).toHaveBeenCalledWith(fd);
        expect(dispatch).toHaveBeenCalledTimes(1);
        expect(dispatch).toHaveBeenCalledWith({ type: 'THUNK_IMPORT_JOBS', data: fd });
    });
});
