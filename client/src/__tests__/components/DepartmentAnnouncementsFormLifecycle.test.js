/**
 * DepartmentAnnouncementsFormLifecycle.test.js
 *
 * SOURCE UNDER TEST
 *   container/DepartmentAnnouncements/DepartmentAnnouncementsForm/DepartmentAnnouncementsForm.js
 *   (includes the file-local PreviewAnnouncment modal and the file-local Yup validationSchema)
 *
 * MENU PATH
 *   Announcements -> Manage my Departments Announcements -> Create Announcement   (method "store")
 *   Announcements -> Manage my Departments Announcements -> Edit                  (method "update")
 *   route: links.department_announcement_form (+ '/:id?')
 *
 * COVERAGE (measured 2026-08-05, this suite alone, with
 *   --collectCoverageFrom=src/container/DepartmentAnnouncements/DepartmentAnnouncementsForm/DepartmentAnnouncementsForm.js)
 *   76.79% lines / 88.33% branches / 70.59% functions of the target file.
 *   The "119 uncovered lines / 29.2%" figure that an earlier draft of this header quoted came from
 *   the 29-Jul master report and is NOT re-measured here; only the number above was measured.
 *
 * WHAT THIS SUITE DOES NOT REACH
 *   - mapStateToProps / mapDispatchToProps (lines 901-921): react-redux connect is identity-mocked,
 *     so store wiring - and any drift between the reducer shape and these props - is invisible here.
 *     That belongs to a container/store test, not to this form-behaviour suite.
 *   - the constructor's joyride/localStorage pre_run branch (lines 76-88) and handleJoyrideCallback
 *     (lines 313-363): covered by __tests__/containers/evoxtest_DeptAnnouncementsFormDeep2.test.js.
 *
 * WHAT THIS SUITE DRIVES (through the real Formik + real Yup + real react-bootstrap form,
 * not through the instance methods, except where a state arm is otherwise unreachable):
 *   - render gate (store renders immediately, update waits for isInstanceLoaded)
 *   - initialValues derivation from props.instance incl. the set_all/set_exclude/set_selected
 *     radio matrix and the set_country_all + country_id pair
 *   - audience targeting: department multiselect, "all / all-except / only-selected" radios,
 *     global vs single-country
 *   - required fields and length limits (title, headline), the URL format rule for link
 *   - attachment handling: pick / empty pick / remove, the update-vs-create flag arms and
 *     which of the three thumbnail preview branches renders
 *   - "Viewed as Content Page" vs "Redirect as Link" tabs and the on_link flag they post
 *   - the Preview modal (open, image arms, content HTML, close)
 *   - submit: FormData contents for store and update, confirm accepted and cancelled,
 *     unknown/absent method
 *
 * FINDINGS (asserted as TODAY's behaviour, named *_FINDING_<code>; none of them are fixed here)
 *   DAF-DATEWIN-1  There is NO date-window validation. The schema reads
 *                  release_date.max(Yup.ref('release_date')) and expiry_date.min(Yup.ref('expiry_date')),
 *                  i.e. every date is compared against ITSELF, so an expiry date years before the
 *                  release date submits cleanly. The refs were meant to point at each other.
 *   DAF-CONTENT-1  onSubmitHandler always overwrites values.content with this.state.content, which is
 *                  null until the TinyMCE editor fires a change. Posting an untouched form sends the
 *                  literal STRING "null" as the announcement body - and on EDIT that silently wipes
 *                  the stored content of any announcement the author did not retype.
 *   DAF-ONLINK-1   on_link is posted from component state, which the constructor hard-codes to false
 *                  and only the tab onSelect handler ever changes. Editing an existing LINK
 *                  announcement and saving without clicking the tab posts on_link=false, converting
 *                  it into an (empty) content page.
 *   DAF-RADIO-1    The audience radios are derived from a set_exclude/set_all pair. A row with
 *                  set_all=1 AND set_exclude=1 leaves all three radios unchecked, and a brand-new
 *                  announcement also opens with no audience option selected while still being
 *                  submittable.
 *   DAF-DEPT-1     Choosing "all departments except" / "only selected departments" and picking no
 *                  department at all is accepted: selectedDepartments is posted as an empty string.
 *   DAF-DELFLAG-1  inputFileWasDeleted is a stringly-typed flag ("false"/"true") and the create path
 *                  hard-codes it to "false" - only the update path ever forwards a removal.
 *   DAF-COUNTRY-1  The country <select> reads `this.state.country_id`, which no handler in the file
 *                  ever writes - a permanently dead branch. It also posts country_id even when
 *                  "Set to Global" is ticked.
 *   DAF-LOGDATE-1  onSubmitHandler formats a log_date field and the form renders a hidden input for
 *                  it, but log_date is not in initialValues and no control writes it.
 *
 * ADDITIVE ONLY. No existing test or app file was modified. Does not repeat
 * __tests__/containers/evoxtest_DeptAnnouncementsFormDeep2.test.js (mount/joyride/direct-method
 * arms); this suite is form-driven and covers validation, targeting, attachments, tabs and preview.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

/* ------------------------------------------------------------------ mocks */

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => jest.fn(),
}));

jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader:  ({ children }) => <div>{children}</div>,
    Content:          ({ children, title, subtitle }) =>
        <div data-testid="content" data-title={title}>{subtitle}{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
    Row:              ({ children }) => <div>{children}</div>,
    Col:              ({ children }) => <div>{children}</div>,
}));

jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/Template/BackButton', () => () => <div data-testid="back-button" />);
jest.mock('../../components/RequestComponent/RequestButtons/RequestSubtitle',
    () => ({ method }) => <div data-testid="subtitle">{method}</div>);
jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading" />);

// InputDate is a Formik <Field> wrapper around react-datepicker (DatePicker.js:171-192). The real
// one IGNORES the `value` prop the form passes it: it reads the current date off the Formik bag
// (selected={eval('field.value.' + props.name)}) and writes back through form.setFieldValue(name, date).
// This stand-in keeps exactly that contract with a plain text input, so the date rules and the
// initialValues derivation stay under test:
//   - data-value exposes what the real datepicker would show as `selected`, as a UTC ISO day
//   - the same <ErrorMessage name={name}/> the real one mounts (DatePicker.js:188-190) is mounted
//     here, wrapped in its own testid so an assertion can name the field it belongs to. The message
//     TEXT still comes from the app's Yup schema - only the mount point is the stand-in's.
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => {
    const R = require('react');
    const { Field, ErrorMessage } = require('formik');
    return {
        InputDate: ({ name }) => R.createElement(Field, null, ({ form }) => {
            const selected = form.values[name];
            return R.createElement('div', null,
                R.createElement('input', {
                    'data-testid': 'date-' + name,
                    'data-value': selected instanceof Date && !isNaN(selected)
                        ? selected.toISOString().slice(0, 10) : '',
                    type: 'text',
                    onChange: (e) => form.setFieldValue(
                        name, e.target.value ? new Date(e.target.value + 'T00:00:00') : null),
                }),
                R.createElement('div', { 'data-testid': 'date-error-' + name },
                    R.createElement(ErrorMessage, { component: 'div', name, className: 'input-feedback' })));
        }),
        InputTime: ({ name }) => R.createElement('input', { 'data-testid': 'time-' + name }),
    };
});

jest.mock('../../services/DateFormatter', () => ({ convert_date: jest.fn((d) => d) }));
jest.mock('../../services/Authenticator', () => ({
    scanLevel: jest.fn(() => true), scanFeature: jest.fn(() => true), check: jest.fn(() => true),
}));
jest.mock('../../services/API', () => ({ call: jest.fn() }));

jest.mock('react-multi-select-component', () => {
    const R = require('react');
    return ({ options, value, onChange, disabled, labelledBy }) => R.createElement('div', {
        'data-testid': 'multiselect',
        'data-disabled': String(!!disabled),
        'data-options': JSON.stringify(options || []),
        'data-value': JSON.stringify(value || []),
    },
        R.createElement('button', {
            type: 'button', 'data-testid': 'pick-one-dept',
            onClick: () => onChange([{ label: 'Engineering', value: 5 }]),
        }, labelledBy),
        R.createElement('button', {
            type: 'button', 'data-testid': 'pick-two-depts',
            onClick: () => onChange([{ label: 'Engineering', value: 5 }, { label: 'Finance', value: 9 }]),
        }, 'two'));
});

jest.mock('@tinymce/tinymce-react', () => {
    const R = require('react');
    return {
        Editor: ({ initialValue, onEditorChange, textareaName }) => R.createElement('textarea', {
            'data-testid': 'editor',
            'data-initial': initialValue,
            name: textareaName,
            defaultValue: initialValue,
            onChange: (e) => onEditorChange(e.target.value),
        }),
    };
});

jest.mock('react-joyride', () => {
    const R = require('react');
    return {
        __esModule: true,
        default: () => R.createElement('div', { 'data-testid': 'joyride' }),
        ACTIONS: { CLOSE: 'close' },
        EVENTS:  { STEP_AFTER: 'step:after', TARGET_NOT_FOUND: 'error:target_not_found' },
        STATUS:  { FINISHED: 'finished', SKIPPED: 'skipped' },
    };
});

jest.mock('../../store/actions/announcement/departmentAnnouncementActions', () => ({
    createDepartmentAnnouncement:        jest.fn(),
    fetchDepartmentAnnouncementStrict:   jest.fn(),
    updateDepartmentAnnouncement:        jest.fn(),
    clearDepartmentAnnouncementInstance: jest.fn(),
}));
jest.mock('../../store/actions/lookup/lookupListActions', () => ({ fetchDepartmentList: jest.fn() }));
jest.mock('../../store/actions/redirectActions', () => ({ setRedirect: jest.fn() }));

global.links = new Proxy({}, { get: () => '/x/' });

const DepartmentAnnouncementsForm =
    require('../../container/DepartmentAnnouncements/DepartmentAnnouncementsForm/DepartmentAnnouncementsForm').default;

/* ------------------------------------------------------------------ harness */

const DEPARTMENTS = [
    { id: 5, department_name: 'Engineering' },
    { id: 9, department_name: 'Finance' },
];
const COUNTRIES = [
    { country_id: 1, country_name: 'Philippines' },
    { country_id: 2, country_name: 'India' },
];

function makeActions() {
    return {
        createDepartmentAnnouncement:        jest.fn(),
        updateDepartmentAnnouncement:        jest.fn(),
        fetchDepartmentAnnouncementStrict:   jest.fn(),
        clearDepartmentAnnouncementInstance: jest.fn(),
        fetchDepartmentList:                 jest.fn(),
        setRedirect:                         jest.fn(),
        dispatch:                            jest.fn(),
    };
}

const baseProps = {
    user:     { id: 1, departments_handled: [] },
    settings: { countries: COUNTRIES },
    department: DEPARTMENTS,
    instance: {},
    isInstanceLoaded: false,
    params: {},
    location: {},
    history: { push: jest.fn(), goBack: jest.fn() },
};

function renderForm(overrides = {}) {
    const actions = makeActions();
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter>
            <DepartmentAnnouncementsForm ref={ref} {...baseProps} {...actions} {...overrides} />
        </MemoryRouter>
    );
    return { ...utils, ref, actions };
}

/** An announcement already stored, opened for edit. */
function editing(extra = {}) {
    return {
        params: { id: '7' },
        isInstanceLoaded: true,
        instance: {
            id: 7,
            title: 'Quarterly town hall',
            headline: 'Everyone welcome',
            release_date: '2026-07-01',
            expiry_date: '2026-07-31',
            content: '<p>stored body</p>',
            link: null,
            category: 'Department',
            thumbnail: null,
            on_link: 0,
            set_all: 1,
            set_exclude: 0,
            set_country_all: 1,
            country_id: null,
            ...extra,
        },
    };
}

/** Deterministic promise-microtask flush - no timers anywhere in this suite. */
async function flush() {
    await act(async () => {
        for (let i = 0; i < 6; i += 1) await Promise.resolve();
    });
}

/* Every query is scoped to its OWN container: several tests render two forms side by side
 * (create vs update, valid vs invalid) and a document-wide query would match both. */
function tid(utils, testid) {
    return utils.container.querySelector('[data-testid="' + testid + '"]');
}

function navTab(utils, label) {
    return Array.from(utils.container.querySelectorAll('.nav-link'))
        .find((a) => a.textContent.trim() === label);
}

function activeTabLabel(utils) {
    return utils.container.querySelector('.nav-link.active').textContent.trim();
}

function typeText(utils, selector, value) {
    fireEvent.change(utils.container.querySelector(selector), { target: { value } });
}

function setDate(utils, field, isoOrEmpty) {
    fireEvent.change(tid(utils, 'date-' + field), { target: { value: isoOrEmpty } });
}

/** Fill the three fields the schema actually requires. */
function fillRequired(utils, { title = 'Quarterly town hall', release = '2026-08-01', expiry = '2026-08-15' } = {}) {
    typeText(utils, 'input.title', title);
    setDate(utils, 'release_date', release);
    setDate(utils, 'expiry_date', expiry);
}

async function submitForm(utils) {
    await act(async () => {
        fireEvent.submit(utils.container.querySelector('form'));
        for (let i = 0; i < 6; i += 1) await Promise.resolve();
    });
}

function radios(utils) {
    return utils.container.querySelectorAll('input[type="radio"]');
}

let confirmSpy;
let logSpy;
beforeAll(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    global.URL.createObjectURL = jest.fn(() => 'blob:local-preview');
    global.URL.revokeObjectURL = jest.fn();
});
afterAll(() => { logSpy.mockRestore(); });

beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(() => { confirmSpy.mockRestore(); });

/* ================================================================== PHASE 1
 * Opening the form: which mode, what the gate shows, what the fields start as.
 * ========================================================================= */
describe('DepartmentAnnouncementsForm - opening the form', () => {

    test('a form opened with no :id runs in create mode and starts with empty title and headline', () => {
        const utils = renderForm();
        expect(tid(utils, 'subtitle')).toHaveTextContent('store');
        expect(utils.container.querySelector('input.title').value).toBe('');
        expect(utils.container.querySelector('input.headline').value).toBe('');
        expect(tid(utils, 'content')).toHaveAttribute('data-title', 'Announcement Form');
    });

    test('a form opened with an :id runs in update mode and is held behind the loading gate until the announcement arrives', () => {
        const loading = renderForm({ params: { id: '7' }, isInstanceLoaded: false });
        expect(tid(loading, 'page-loading')).toBeInTheDocument();
        expect(loading.container.querySelector('form')).toBeNull();
        expect(tid(loading, 'subtitle')).toBeNull();

        const loaded = renderForm(editing());
        expect(tid(loaded, 'subtitle')).toHaveTextContent('update');
        expect(loaded.container.querySelector('form')).not.toBeNull();
    });

    test('an announcement opened for edit prefills title, headline and the stored body into the editor', () => {
        const utils = renderForm(editing());
        expect(utils.container.querySelector('input.title').value).toBe('Quarterly town hall');
        expect(utils.container.querySelector('input.headline').value).toBe('Everyone welcome');
        expect(tid(utils, 'editor')).toHaveAttribute('data-initial', '<p>stored body</p>');
    });

    test('an announcement opened for edit shows its stored release and expiry dates, and a new one shows none', () => {
        // initialValues turns the stored strings into Dates (lines 376-377) and the datepicker shows
        // them through the Formik bag, which is what data-value mirrors here.
        const utils = renderForm(editing());
        expect(tid(utils, 'date-release_date')).toHaveAttribute('data-value', '2026-07-01');
        expect(tid(utils, 'date-expiry_date')).toHaveAttribute('data-value', '2026-07-31');

        const fresh = renderForm();
        expect(tid(fresh, 'date-release_date')).toHaveAttribute('data-value', '');
        expect(tid(fresh, 'date-expiry_date')).toHaveAttribute('data-value', '');
    });

    test('create mode ignores an announcement left over in the store - the fields stay empty', () => {
        // method is derived from params.id only, so a stale instance must not leak into a new form
        const utils = renderForm({ params: {}, isInstanceLoaded: true, instance: editing().instance });
        expect(utils.container.querySelector('input.title').value).toBe('');
        expect(tid(utils, 'editor')).toHaveAttribute('data-initial', '');
    });

    test('opening the form loads the department lookup and clears the cached announcement, and only an edit fetches one', () => {
        const create = renderForm();
        expect(create.actions.fetchDepartmentList).toHaveBeenCalledTimes(1);
        expect(create.actions.clearDepartmentAnnouncementInstance).toHaveBeenCalledTimes(1);
        expect(create.actions.fetchDepartmentAnnouncementStrict).not.toHaveBeenCalled();

        const edit = renderForm({ params: { id: '7' } });
        expect(edit.actions.fetchDepartmentAnnouncementStrict).toHaveBeenCalledWith('7');
    });

    test('the hidden log-date input is empty because no control on this form writes log_date _FINDING_DAF-LOGDATE-1', () => {
        // onSubmitHandler has a "log_date" branch that moment-formats the value, and the form renders
        // <input type="hidden" name="date" value={values.log_date} />, but log_date is absent from
        // initialValues and no field sets it - the branch is unreachable from the UI.
        const utils = renderForm();
        const hidden = utils.container.querySelector('input[name="date"]');
        expect(hidden).not.toBeNull();
        expect(hidden.value).toBe('');
    });
});

/* ================================================================== PHASE 2
 * Audience targeting: the three radios, the department multiselect, the country pair.
 * ========================================================================= */
describe('DepartmentAnnouncementsForm - audience targeting', () => {

    test('the three audience options are offered in the order all / all-except / only-selected', () => {
        const utils = renderForm();
        const labels = Array.from(utils.container.querySelectorAll('label'))
            .map((l) => l.textContent.trim()).filter((t) => t.indexOf('epartment') > -1);
        expect(labels[0]).toContain('All Departments');
        expect(labels[1]).toContain('All departments except');
        expect(labels[2]).toContain('Only selected departments');
        expect(radios(utils)).toHaveLength(3);
    });

    test('an announcement stored as set_all=1 / set_exclude=0 opens with "All Departments" selected and the picker disabled', () => {
        const utils = renderForm(editing({ set_all: 1, set_exclude: 0 }));
        const [all, except, only] = radios(utils);
        expect(all.checked).toBe(true);
        expect(except.checked).toBe(false);
        expect(only.checked).toBe(false);
        expect(tid(utils, 'multiselect')).toHaveAttribute('data-disabled', 'true');
        expect(utils.container.textContent).toContain('By Selected Departments:(disabled)');
    });

    test('an announcement stored as set_all=0 / set_exclude=1 opens with "All departments except" selected and the picker enabled', () => {
        const utils = renderForm(editing({ set_all: 0, set_exclude: 1 }));
        const [all, except, only] = radios(utils);
        expect(all.checked).toBe(false);
        expect(except.checked).toBe(true);
        expect(only.checked).toBe(false);
        expect(tid(utils, 'multiselect')).toHaveAttribute('data-disabled', 'false');
    });

    test('an announcement stored as set_all=0 / set_exclude=0 opens with "Only selected departments" selected', () => {
        const utils = renderForm(editing({ set_all: 0, set_exclude: 0 }));
        const [all, except, only] = radios(utils);
        expect(all.checked).toBe(false);
        expect(except.checked).toBe(false);
        expect(only.checked).toBe(true);
    });

    test('a contradictory row (set_all=1 and set_exclude=1) and a brand-new form both open with no audience selected _FINDING_DAF-RADIO-1', () => {
        // Each radio is derived from a DIFFERENT combination of the same two columns instead of one
        // enum, so an impossible pair renders as "nothing chosen" with no warning - and a new
        // announcement opens the same way, yet the form still submits.
        const contradictory = renderForm(editing({ set_all: 1, set_exclude: 1 }));
        expect(radios(contradictory)).toHaveLength(3);      // guard: "none checked" must not mean "none rendered"
        Array.from(radios(contradictory)).forEach((r) => expect(r.checked).toBe(false));

        const fresh = renderForm();
        expect(radios(fresh)).toHaveLength(3);
        Array.from(radios(fresh)).forEach((r) => expect(r.checked).toBe(false));
    });

    test('the department picker offers one option per handled department, labelled by name and valued by id', () => {
        const utils = renderForm();
        expect(JSON.parse(tid(utils, 'multiselect').getAttribute('data-options'))).toEqual([
            { label: 'Engineering', value: 5 },
            { label: 'Finance', value: 9 },
        ]);
    });

    test('an empty department lookup leaves the picker with no options at all', () => {
        const utils = renderForm({ department: [] });
        expect(JSON.parse(tid(utils, 'multiselect').getAttribute('data-options'))).toEqual([]);
    });

    test('picking departments stores them on the component and shows them as the picker value', () => {
        const utils = renderForm();
        fireEvent.click(tid(utils, 'pick-two-depts'));
        expect(utils.ref.current.state.selectedDepartments).toEqual([
            { label: 'Engineering', value: 5 },
            { label: 'Finance', value: 9 },
        ]);
        // the picker's value prop is fed back from component state (line 564), so the round trip is
        // asserted item for item rather than by length alone
        expect(JSON.parse(tid(utils, 'multiselect').getAttribute('data-value'))).toEqual([
            { label: 'Engineering', value: 5 },
            { label: 'Finance', value: 9 },
        ]);
    });

    test('"Set to Global" is ticked by default on a new announcement and disables the country dropdown', () => {
        const utils = renderForm();
        const globalBox = utils.container.querySelector('input[type="checkbox"]');
        expect(globalBox.checked).toBe(true);
        expect(utils.container.querySelector('select[name="country_id"]').disabled).toBe(true);
    });

    test('un-ticking "Set to Global" enables the country dropdown and ticking it again disables it', () => {
        const utils = renderForm();
        const globalBox = utils.container.querySelector('input[type="checkbox"]');
        const select = utils.container.querySelector('select[name="country_id"]');

        fireEvent.click(globalBox);
        expect(globalBox.checked).toBe(false);
        expect(select.disabled).toBe(false);

        fireEvent.click(globalBox);
        expect(globalBox.checked).toBe(true);
        expect(select.disabled).toBe(true);
    });

    test('the country dropdown lists every configured country behind a "Select Country" placeholder', () => {
        const utils = renderForm();
        const options = utils.container.querySelectorAll('select[name="country_id"] option');
        expect(options).toHaveLength(3);
        expect(options[0].getAttribute('label')).toBe('Select Country');
        expect(options[1].value).toBe('1');
        expect(options[1].getAttribute('label')).toBe('Philippines');
        expect(options[2].getAttribute('label')).toBe('India');
    });

    test('with no countries configured the dropdown offers only the placeholder', () => {
        const utils = renderForm({ settings: {} });
        expect(utils.container.querySelectorAll('select[name="country_id"] option')).toHaveLength(1);
    });

    test('an announcement stored against a single country opens with global un-ticked and that country selected', () => {
        const utils = renderForm(editing({ set_country_all: 0, country_id: 2 }));
        expect(utils.container.querySelector('input[type="checkbox"]').checked).toBe(false);
        const select = utils.container.querySelector('select[name="country_id"]');
        expect(select.disabled).toBe(false);
        expect(select.value).toBe('2');
    });

    test('no handler ever writes state.country_id, so the dropdown always falls back to the Formik value _FINDING_DAF-COUNTRY-1', () => {
        // value={this.state.country_id != null ? this.state.country_id : values.country_id}
        // No handler in the file ever writes state.country_id - the select's onChange writes the
        // Formik field. The state branch is dead code; the last two lines below reach it by setting
        // state directly, which no user path can do - they exist to show the branch is live code
        // that is simply never fed, not to claim a user can trigger it.
        const utils = renderForm(editing({ set_country_all: 0, country_id: 1 }));
        const select = utils.container.querySelector('select[name="country_id"]');
        fireEvent.change(select, { target: { value: '2' } });
        expect(select.value).toBe('2');
        expect(utils.ref.current.state.country_id).toBeUndefined();

        act(() => { utils.ref.current.setState({ country_id: 1 }); });
        expect(select.value).toBe('1'); // only reachable by setting state directly
    });
});

/* ================================================================== PHASE 3
 * Validation - required fields, lengths, url format, and the missing date window.
 * ========================================================================= */
describe('DepartmentAnnouncementsForm - validation rules', () => {

    test('submitting with no title at all is rejected and the message appears under the title field', async () => {
        const utils = renderForm();
        setDate(utils, 'release_date', '2026-08-01');
        setDate(utils, 'expiry_date', '2026-08-15');
        await submitForm(utils);
        expect(utils.actions.createDepartmentAnnouncement).not.toHaveBeenCalled();
        // app-rendered feedback: <Form.Control.Feedback type="invalid"> beside the title control
        const titleFeedback = utils.container.querySelector('input.title')
            .closest('.input-group').querySelector('.invalid-feedback');
        expect(titleFeedback.textContent).toContain('This field is required');
    });

    test('submitting with no release or expiry date is rejected and both date fields report it', async () => {
        const utils = renderForm();
        typeText(utils, 'input.title', 'Town hall');
        await submitForm(utils);
        expect(utils.actions.createDepartmentAnnouncement).not.toHaveBeenCalled();
        // The message text is the app schema's ("This field is required" on release_date/expiry_date);
        // the node it renders into is the InputDate stand-in's copy of DatePicker.js:188-190. The
        // load-bearing half is the action creator never being called.
        expect(tid(utils, 'date-error-release_date').textContent).toContain('This field is required');
        expect(tid(utils, 'date-error-expiry_date').textContent).toContain('This field is required');
        expect(tid(utils, 'date-error-release_date').querySelector('.input-feedback')).not.toBeNull();
    });

    test('a title longer than 100 characters is rejected with the max-length message', async () => {
        const utils = renderForm();
        fillRequired(utils, { title: 'x'.repeat(101) });
        await submitForm(utils);
        expect(utils.actions.createDepartmentAnnouncement).not.toHaveBeenCalled();
        expect(utils.container.textContent).toContain('Max Title Length reached');
    });

    test('a headline longer than 100 characters is rejected while an empty headline is accepted', async () => {
        const tooLong = renderForm();
        fillRequired(tooLong);
        typeText(tooLong, 'input.headline', 'h'.repeat(101));
        await submitForm(tooLong);
        expect(tooLong.actions.createDepartmentAnnouncement).not.toHaveBeenCalled();
        expect(tooLong.container.textContent).toContain('Max Headline Length reached');

        const optional = renderForm();
        fillRequired(optional);
        await submitForm(optional);
        expect(optional.actions.createDepartmentAnnouncement).toHaveBeenCalledTimes(1);
    });

    test('a redirect link that is not a url is rejected, and a well-formed url is accepted', async () => {
        const bad = renderForm();
        fillRequired(bad);
        typeText(bad, 'input.link', 'not a url at all');
        await submitForm(bad);
        expect(bad.actions.createDepartmentAnnouncement).not.toHaveBeenCalled();
        expect(bad.container.textContent).toContain('Enter correct url!');

        const good = renderForm();
        fillRequired(good);
        typeText(good, 'input.link', 'https://intranet.example.com/news');
        await submitForm(good);
        expect(good.actions.createDepartmentAnnouncement).toHaveBeenCalledTimes(1);
        expect(good.actions.createDepartmentAnnouncement.mock.calls[0][0].get('link'))
            .toBe('https://intranet.example.com/news');
    });

    test('an expiry date years before the release date is accepted and submitted _FINDING_DAF-DATEWIN-1', async () => {
        // validationSchema compares each date against ITSELF:
        //   release_date: ... .max(Yup.ref('release_date'), 'Please select a Valid From date.')
        //   expiry_date : ... .min(Yup.ref('expiry_date'),  'Please select a Valid To date.')
        // so the announcement window is never checked. The refs were meant to cross over.
        const utils = renderForm();
        fillRequired(utils, { release: '2026-08-20', expiry: '2020-01-05' });
        await submitForm(utils);

        expect(utils.actions.createDepartmentAnnouncement).toHaveBeenCalledTimes(1);
        const fd = utils.actions.createDepartmentAnnouncement.mock.calls[0][0];
        expect(fd.get('release_date')).toBe('2026-08-20');
        expect(fd.get('expiry_date')).toBe('2020-01-05');
        expect(utils.container.textContent).not.toContain('Please select a Valid To date.');
    });
});

/* ================================================================== PHASE 4
 * Attachment handling.
 * ========================================================================= */
describe('DepartmentAnnouncementsForm - thumbnail handling', () => {
    const pngFile = () => new File(['binary'], 'banner.png', { type: 'image/png' });

    function chooseFile(utils, file) {
        const input = utils.container.querySelector('#img-to-upload');
        fireEvent.change(input, { target: { files: file ? [file] : [] } });
        return input;
    }

    test('choosing an image keeps the file and shows the generated object url as the preview', () => {
        const utils = renderForm();
        chooseFile(utils, pngFile());
        expect(utils.ref.current.state.thumbnail.name).toBe('banner.png');
        expect(utils.ref.current.state.imgPrevInputFile).toBe('blob:local-preview');
        expect(utils.container.querySelector('.thumbnail-image img').getAttribute('src'))
            .toBe('blob:local-preview');
    });

    test('a file dialog cancelled with no file selected leaves the previous thumbnail untouched', () => {
        const utils = renderForm();
        chooseFile(utils, pngFile());
        chooseFile(utils, null);
        expect(utils.ref.current.state.thumbnail.name).toBe('banner.png');
        expect(utils.ref.current.state.imgPrevInputFile).toBe('blob:local-preview');
    });

    test('choosing an image while editing flags the attachment as replaced, but creating does not', () => {
        const edit = renderForm(editing());
        chooseFile(edit, pngFile());
        expect(edit.ref.current.state.inputFileWasUpdated).toBe(true);
        expect(edit.ref.current.state.inputFileWasDeleted).toBe(false);

        const create = renderForm();
        chooseFile(create, pngFile());
        expect(create.ref.current.state.inputFileWasUpdated).toBe(false);
    });

    test('Remove clears the chosen file, drops the preview and flags the attachment as deleted', () => {
        const utils = renderForm();
        chooseFile(utils, pngFile());
        fireEvent.click(utils.container.querySelector('.btn-secondary'));
        expect(utils.ref.current.state.thumbnail).toBeNull();
        expect(utils.ref.current.state.imgPrevInputFile).toBeNull();
        expect(utils.ref.current.state.inputFileWasDeleted).toBe(true);
        expect(utils.container.textContent).toContain('UPLOAD AN IMAGE');
    });

    test('editing an announcement that already has an image shows the stored image until it is removed', () => {
        const utils = renderForm(editing({ thumbnail: '/thumbnail/stored.jpg' }));
        expect(utils.container.querySelector('.thumbnail-image img').getAttribute('src'))
            .toBe('/thumbnail/stored.jpg');

        fireEvent.click(utils.container.querySelector('.btn-secondary'));
        expect(utils.container.querySelector('.thumbnail-image img')).toBeNull();
        expect(utils.container.textContent).toContain('UPLOAD AN IMAGE');
    });

    test('a new announcement with no image shows the upload placeholder instead of an image', () => {
        const utils = renderForm();
        expect(utils.container.querySelector('.thumbnail-image img')).toBeNull();
        expect(utils.container.textContent).toContain('UPLOAD AN IMAGE');
    });

    test('a chosen image is attached to the create submission, and a form with no image sends none', async () => {
        const withImage = renderForm();
        fillRequired(withImage);
        chooseFile(withImage, pngFile());
        await submitForm(withImage);
        const withFd = withImage.actions.createDepartmentAnnouncement.mock.calls[0][0];
        expect(withFd.get('thumbnail').name).toBe('banner.png');
        expect(withImage.ref.current.state.thumbnail).toBeNull();               // reset after send
        expect(withImage.ref.current.state.imgPrevInputFile).toBe('/thumbnail/defthumb.jpg');

        const without = renderForm();
        fillRequired(without);
        await submitForm(without);
        expect(without.actions.createDepartmentAnnouncement.mock.calls[0][0].get('thumbnail')).toBeNull();
    });

    test('removing the image while editing posts the delete flag, while creating always posts "false" _FINDING_DAF-DELFLAG-1', async () => {
        // formData.set('inputFileWasDeleted', false) stringifies to "false" on every submission and
        // is only re-set to "true" inside the update branch; the create branch can never report a
        // removal, and consumers must compare against the STRINGS "true"/"false".
        const edit = renderForm(editing({ thumbnail: '/thumbnail/stored.jpg' }));
        fillRequired(edit);
        fireEvent.click(edit.container.querySelector('.btn-secondary'));
        await submitForm(edit);
        expect(edit.actions.updateDepartmentAnnouncement.mock.calls[0][1].get('inputFileWasDeleted')).toBe('true');

        const create = renderForm();
        fillRequired(create);
        fireEvent.click(create.container.querySelector('.btn-secondary'));
        await submitForm(create);
        expect(create.actions.createDepartmentAnnouncement.mock.calls[0][0].get('inputFileWasDeleted')).toBe('false');
    });

    test('editing without touching the image sends no thumbnail, so the stored one is kept', async () => {
        const utils = renderForm(editing({ thumbnail: '/thumbnail/stored.jpg' }));
        fillRequired(utils);
        await submitForm(utils);
        const fd = utils.actions.updateDepartmentAnnouncement.mock.calls[0][1];
        expect(fd.get('thumbnail')).toBeNull();
        expect(fd.get('inputFileWasDeleted')).toBe('false');
    });
});

/* ================================================================== PHASE 5
 * Content page vs external link.
 * ========================================================================= */
describe('DepartmentAnnouncementsForm - content page versus redirect link', () => {

    test('a new announcement opens on the content tab and posts on_link=false', async () => {
        const utils = renderForm();
        expect(activeTabLabel(utils))
            .toBe('Viewed as Content Page');

        fillRequired(utils);
        await submitForm(utils);
        expect(utils.actions.createDepartmentAnnouncement.mock.calls[0][0].get('on_link')).toBe('false');
    });

    test('switching to the redirect tab posts on_link=true together with the external url', async () => {
        const utils = renderForm();
        fireEvent.click(navTab(utils, 'Redirect as Link'));
        expect(utils.ref.current.state.on_link).toBe(true);

        fillRequired(utils);
        typeText(utils, 'input.link', 'https://example.com/careers');
        await submitForm(utils);
        const fd = utils.actions.createDepartmentAnnouncement.mock.calls[0][0];
        expect(fd.get('on_link')).toBe('true');
        expect(fd.get('link')).toBe('https://example.com/careers');
    });

    test('switching back to the content tab returns on_link to false', () => {
        const utils = renderForm();
        fireEvent.click(navTab(utils, 'Redirect as Link'));
        fireEvent.click(navTab(utils, 'Viewed as Content Page'));
        expect(utils.ref.current.state.on_link).toBe(false);
    });

    test('an announcement stored as a link opens on the redirect tab with its url', () => {
        const utils = renderForm(editing({ on_link: 1, link: 'https://example.com/policy' }));
        expect(activeTabLabel(utils)).toBe('Redirect as Link');
        expect(utils.container.querySelector('input.link').value).toBe('https://example.com/policy');
    });

    test('saving a stored link announcement without touching the tabs converts it to a content page _FINDING_DAF-ONLINK-1', async () => {
        // on_link is posted from component state, which the constructor hard-codes to false and only
        // the Tabs onSelect handler updates. The tab shown is derived from props.instance instead, so
        // the visible state ("Redirect as Link") and the submitted state disagree.
        const utils = renderForm(editing({ on_link: 1, link: 'https://example.com/policy' }));
        expect(activeTabLabel(utils)).toBe('Redirect as Link');
        expect(utils.ref.current.state.on_link).toBe(false);

        fillRequired(utils);
        await submitForm(utils);
        expect(utils.actions.updateDepartmentAnnouncement.mock.calls[0][1].get('on_link')).toBe('false');
    });

    test('typing in the editor is what supplies the announcement body', async () => {
        const utils = renderForm();
        fillRequired(utils);
        fireEvent.change(tid(utils, 'editor'), { target: { value: '<p>Everyone is invited</p>' } });
        expect(utils.ref.current.state.content).toBe('<p>Everyone is invited</p>');

        await submitForm(utils);
        expect(utils.actions.createDepartmentAnnouncement.mock.calls[0][0].get('content'))
            .toBe('<p>Everyone is invited</p>');
    });

    test('submitting without typing in the editor posts the string "null" as the body, wiping a stored one _FINDING_DAF-CONTENT-1', async () => {
        // onSubmitHandler starts with values['content'] = this.state.content, discarding the Formik
        // value seeded from the announcement. state.content is null until the editor fires a change,
        // and FormData stringifies null - so the body is saved as the four characters n-u-l-l.
        const create = renderForm();
        fillRequired(create);
        await submitForm(create);
        expect(create.actions.createDepartmentAnnouncement.mock.calls[0][0].get('content')).toBe('null');

        const edit = renderForm(editing());                    // instance.content = '<p>stored body</p>'
        fillRequired(edit);
        await submitForm(edit);
        expect(edit.actions.updateDepartmentAnnouncement.mock.calls[0][1].get('content')).toBe('null');
    });
});

/* ================================================================== PHASE 6
 * Submitting - what actually reaches the action creators.
 * ========================================================================= */
describe('DepartmentAnnouncementsForm - submitting', () => {

    test('a confirmed create posts the whole announcement: dates formatted, category fixed to Department', async () => {
        const utils = renderForm();
        fillRequired(utils, { title: 'Quarterly town hall', release: '2026-08-01', expiry: '2026-08-15' });
        typeText(utils, 'input.headline', 'Everyone welcome');
        fireEvent.change(tid(utils, 'editor'), { target: { value: '<p>Body</p>' } });
        await submitForm(utils);

        expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to submit this Announcement?');
        expect(utils.actions.createDepartmentAnnouncement).toHaveBeenCalledTimes(1);
        expect(utils.actions.updateDepartmentAnnouncement).not.toHaveBeenCalled();

        const fd = utils.actions.createDepartmentAnnouncement.mock.calls[0][0];
        expect(fd.get('method')).toBe('store');
        expect(fd.get('title')).toBe('Quarterly town hall');
        expect(fd.get('headline')).toBe('Everyone welcome');
        expect(fd.get('release_date')).toBe('2026-08-01');
        expect(fd.get('expiry_date')).toBe('2026-08-15');
        expect(fd.get('category')).toBe('Department');
        expect(fd.get('content')).toBe('<p>Body</p>');
    });

    test('declining the create confirmation sends nothing and keeps the chosen image', async () => {
        confirmSpy.mockReturnValue(false);
        const utils = renderForm();
        fillRequired(utils);
        fireEvent.change(utils.container.querySelector('#img-to-upload'),
            { target: { files: [new File(['b'], 'keep.png', { type: 'image/png' })] } });
        await submitForm(utils);

        expect(confirmSpy).toHaveBeenCalled();
        expect(utils.actions.createDepartmentAnnouncement).not.toHaveBeenCalled();
        expect(utils.ref.current.state.thumbnail.name).toBe('keep.png');
    });

    test('a confirmed edit routes to the update action with the announcement id as its first argument', async () => {
        const utils = renderForm(editing());
        fillRequired(utils, { title: 'Renamed town hall' });
        await submitForm(utils);

        expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to update this Announcement?');
        expect(utils.actions.createDepartmentAnnouncement).not.toHaveBeenCalled();
        expect(utils.actions.updateDepartmentAnnouncement).toHaveBeenCalledTimes(1);
        const [id, fd] = utils.actions.updateDepartmentAnnouncement.mock.calls[0];
        expect(id).toBe(7);
        expect(fd.get('id')).toBe('7');
        expect(fd.get('method')).toBe('update');
        expect(fd.get('title')).toBe('Renamed town hall');
    });

    test('declining the update confirmation sends nothing', async () => {
        confirmSpy.mockReturnValue(false);
        const utils = renderForm(editing());
        fillRequired(utils);
        await submitForm(utils);
        expect(utils.actions.updateDepartmentAnnouncement).not.toHaveBeenCalled();
    });

    test('an edit opened from the admin list carries that origin back so the save returns there', async () => {
        const fromAdmin = renderForm({ ...editing(), location: { originPath: 'AdminAnnouncementList' } });
        fillRequired(fromAdmin);
        await submitForm(fromAdmin);
        expect(fromAdmin.actions.updateDepartmentAnnouncement.mock.calls[0][1].get('previousPath'))
            .toBe('AdminAnnouncementList');

        const fromOwnList = renderForm(editing());
        fillRequired(fromOwnList);
        await submitForm(fromOwnList);
        expect(fromOwnList.actions.updateDepartmentAnnouncement.mock.calls[0][1].get('previousPath')).toBeNull();
    });

    test('choosing "All Departments" posts set_all=1 and omits the department list entirely', async () => {
        const utils = renderForm();
        fillRequired(utils);
        fireEvent.click(radios(utils)[0]);
        await submitForm(utils);

        const fd = utils.actions.createDepartmentAnnouncement.mock.calls[0][0];
        expect(fd.get('set_all')).toBe('1');
        expect(fd.get('set_exclude')).toBe('0');
        expect(fd.get('set_selected')).toBe('0');
        expect(fd.get('selectedDepartments')).toBeNull();
    });

    test('choosing "All departments except" with two departments posts the exclusion list', async () => {
        const utils = renderForm();
        fillRequired(utils);
        fireEvent.click(radios(utils)[1]);
        fireEvent.click(tid(utils, 'pick-two-depts'));
        await submitForm(utils);

        const fd = utils.actions.createDepartmentAnnouncement.mock.calls[0][0];
        expect(fd.get('set_all')).toBe('0');
        expect(fd.get('set_exclude')).toBe('1');
        expect(fd.get('set_selected')).toBe('0');
        expect(fd.get('selectedDepartments')).toBe('5,9');
    });

    test('choosing "Only selected departments" with one department posts just that department', async () => {
        const utils = renderForm();
        fillRequired(utils);
        fireEvent.click(radios(utils)[2]);
        fireEvent.click(tid(utils, 'pick-one-dept'));
        await submitForm(utils);

        const fd = utils.actions.createDepartmentAnnouncement.mock.calls[0][0];
        expect(fd.get('set_selected')).toBe('1');
        expect(fd.get('set_exclude')).toBe('0');
        expect(fd.get('selectedDepartments')).toBe('5');
    });

    test('a targeted announcement with no department chosen is accepted and posts an empty list _FINDING_DAF-DEPT-1', async () => {
        // Nothing guards the picker: "only selected departments" with an empty selection posts
        // selectedDepartments="" and the announcement is created with no audience.
        const utils = renderForm();
        fillRequired(utils);
        fireEvent.click(radios(utils)[2]);
        await submitForm(utils);

        const fd = utils.actions.createDepartmentAnnouncement.mock.calls[0][0];
        expect(fd.get('set_selected')).toBe('1');
        expect(fd.get('selectedDepartments')).toBe('');
    });

    test('a global announcement posts set_country_all=1, and a single-country one posts 0 with the country', async () => {
        const globalOne = renderForm();
        fillRequired(globalOne);
        await submitForm(globalOne);
        expect(globalOne.actions.createDepartmentAnnouncement.mock.calls[0][0].get('set_country_all')).toBe('1');

        const single = renderForm();
        fillRequired(single);
        fireEvent.click(single.container.querySelector('input[type="checkbox"]'));
        fireEvent.change(single.container.querySelector('select[name="country_id"]'), { target: { value: '2' } });
        await submitForm(single);
        const fd = single.actions.createDepartmentAnnouncement.mock.calls[0][0];
        expect(fd.get('set_country_all')).toBe('0');
        expect(fd.get('country_id')).toBe('2');
    });

    test('fields left empty are omitted from the payload rather than posted as empty values', async () => {
        const utils = renderForm();
        fillRequired(utils);
        await submitForm(utils);
        const fd = utils.actions.createDepartmentAnnouncement.mock.calls[0][0];
        // The exact key set, so that "absent" is proved by the payload's own contents rather than by
        // a .get() that would also return null for a mistyped key name.
        expect(Array.from(fd.keys()).sort()).toEqual([
            'category', 'content', 'expiry_date', 'headline', 'inputFileWasDeleted', 'method',
            'on_link', 'release_date', 'selectedDepartments', 'set_all', 'set_country_all',
            'set_exclude', 'set_selected', 'title',
        ]);
        expect(fd.get('link')).toBeNull();          // null link is skipped by the null guard
        expect(fd.get('country_id')).toBeNull();
        expect(fd.get('action')).toBeNull();
        expect(fd.get('headline')).toBe('');        // an empty string IS posted
    });

    test('the Submit button is what sends the form; the Preview button never sends it', async () => {
        const utils = renderForm();
        fillRequired(utils);

        await act(async () => {
            fireEvent.click(utils.container.querySelector('.btn-primary-3'));   // Preview Page
            for (let i = 0; i < 6; i += 1) await Promise.resolve();
        });
        expect(utils.actions.createDepartmentAnnouncement).not.toHaveBeenCalled();

        await act(async () => {
            fireEvent.click(utils.container.querySelector('.btn-primary-2'));   // Submit
            for (let i = 0; i < 6; i += 1) await Promise.resolve();
        });
        expect(utils.actions.createDepartmentAnnouncement).toHaveBeenCalled();
        expect(utils.actions.createDepartmentAnnouncement.mock.calls[0][0].get('title'))
            .toBe('Quarterly town hall');
    });

    test('onSubmitHandler called directly with an unrecognised or missing method reaches neither action creator', () => {
        // No control on the form can produce these values (method is a hidden input fixed to
        // store/update), so this arm is only reachable through the instance method.
        const utils = renderForm();
        act(() => { utils.ref.current.onSubmitHandler({ method: 'approve', title: 'X' }); });
        act(() => { utils.ref.current.onSubmitHandler({ title: 'X' }); });
        expect(utils.actions.createDepartmentAnnouncement).not.toHaveBeenCalled();
        expect(utils.actions.updateDepartmentAnnouncement).not.toHaveBeenCalled();
        expect(confirmSpy).not.toHaveBeenCalled();
    });
});

/* ================================================================== PHASE 7
 * The preview modal.
 * ========================================================================= */
describe('DepartmentAnnouncementsForm - preview modal', () => {

    function openPreview(utils) {
        fireEvent.click(utils.container.querySelector('.btn-primary-3'));
    }

    test('Preview shows the typed title, the release date and the Department tag without submitting', () => {
        const utils = renderForm();
        fillRequired(utils, { title: 'Quarterly town hall', release: '2026-08-01' });
        openPreview(utils);

        const modal = utils.container.querySelector('.modal-preview-announcement');
        expect(modal).not.toBeNull();
        expect(modal.querySelector('.page-content-title').textContent).toBe('Quarterly town hall');
        expect(modal.querySelector('.page-content-info').textContent).toContain('Posted: 2026-08-01');
        expect(modal.textContent).toContain('Department');
        expect(utils.actions.createDepartmentAnnouncement).not.toHaveBeenCalled();
    });

    test('Preview renders the typed body as real html, not as escaped text', () => {
        const utils = renderForm();
        fillRequired(utils);
        fireEvent.change(tid(utils, 'editor'), { target: { value: '<b class="shout">Read me</b>' } });
        openPreview(utils);
        const body = utils.container.querySelector('.page-content');
        expect(body.querySelector('b.shout')).not.toBeNull();
        expect(body.textContent).toBe('Read me');
    });

    test('Preview of an untouched edit falls back to the stored body', () => {
        const utils = renderForm(editing());
        openPreview(utils);
        expect(utils.container.querySelector('.page-content').textContent).toBe('stored body');
    });

    test('Preview omits the image when no image has been chosen, and shows it once one is', () => {
        const utils = renderForm();
        fillRequired(utils);
        openPreview(utils);
        expect(utils.container.querySelector('.page-img')).toBeNull();

        fireEvent.click(utils.container.querySelector('.close'));
        fireEvent.change(utils.container.querySelector('#img-to-upload'),
            { target: { files: [new File(['b'], 'banner.png', { type: 'image/png' })] } });
        openPreview(utils);
        expect(utils.container.querySelector('.page-img').getAttribute('src')).toBe('blob:local-preview');
    });

    test('Preview of an edit with a stored image shows that stored image', () => {
        const utils = renderForm(editing({ thumbnail: '/thumbnail/stored.jpg' }));
        openPreview(utils);
        expect(utils.container.querySelector('.page-img').getAttribute('src')).toBe('/thumbnail/stored.jpg');
    });

    test('closing the preview removes the modal and leaves the form filled in', () => {
        const utils = renderForm();
        fillRequired(utils, { title: 'Still here' });
        openPreview(utils);
        expect(utils.container.querySelector('.modal-preview-announcement')).not.toBeNull();

        fireEvent.click(utils.container.querySelector('.close'));
        expect(utils.container.querySelector('.modal-preview-announcement')).toBeNull();
        expect(utils.container.querySelector('input.title').value).toBe('Still here');
    });
});
