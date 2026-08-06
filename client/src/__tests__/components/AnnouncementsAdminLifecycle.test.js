/**
 * AnnouncementsAdminLifecycle.test.js
 *
 * SOURCE FILES UNDER TEST
 *   1. container/Hr/HrAnnouncementsForm/HrAnnouncementsForm.js
 *        Menu:  HR -> Manage HR Announcements -> ADD  (and Edit on each row)
 *        Route: global.links.post_hr_announcements + ':id?'  ->  /app/hr/PostHrAnnouncements/:id?
 *               (config/RouteList.js:512-516)
 *   2. container/Hr/PostAnnouncements/PostAnnouncements.js
 *        NO MENU PATH - THIS SCREEN IS NOT REACHABLE. RouteList.js:87 imports it as
 *        PostHrAnnouncements, but no <Route> anywhere renders it; the
 *        /app/hr/PostHrAnnouncements/ path it was written for is now served by
 *        HrAnnouncementsForm (RouteList.js:512). The tests below therefore characterise the
 *        file AS WRITTEN, not a journey a user can take, and the two findings raised against
 *        it (PA_DESC, PA_DEAD) are latent source defects with no live user impact today.
 *   3. container/Admin/AdminAnnouncementsList/AdminAnnouncementsList.js
 *        Menu:  Admin -> Manage All EVOX Announcements
 *        Route: global.links.admin_announcement_list -> /app/admin/AnnouncementList/
 *               (config/RouteList.js:473-477)
 *
 * COVERAGE. This suite is NOT greenfield for these three files - partial coverage already
 * existed before it, in:
 *     __tests__/containers/evoxtest_HrAnnouncementsFormDeep2.test.js  (HrAnnouncementsForm)
 *     __tests__/existing/HrAnnouncements.container.test.js            (HrAnnouncementsForm +
 *                                                                     PostAnnouncements)
 *     __tests__/existing/AdminMisc.container.test.js                  (AdminAnnouncementsList)
 * Measured 2026-08-05, this suite alone, --collectCoverageFrom limited to the three files
 * (CI=true npx react-scripts test --watchAll=false
 *  --testPathPattern=AnnouncementsAdminLifecycle --coverage --collectCoverageFrom=...):
 *     HrAnnouncementsForm.js      87.32% stmts / 94.81% branch / 87.14% lines
 *     PostAnnouncements.js        81.25% stmts / 94.87% branch / 80.85% lines
 *     AdminAnnouncementsList.js   85.25% stmts /   100% branch / 85.00% lines
 * The bulk of what is still uncovered is mapStateToProps/mapDispatchToProps in each file,
 * which cannot run while `connect` is stubbed (see below). No claim is made here about the
 * combined baseline of a full repo run, which includes the overlapping suites above.
 *
 * The three screens are walked as an admin uses them, phase by phase:
 *   PHASE 1 MOUNT/LOAD   componentWillMount clear-then-fetch ordering, the render gate,
 *                        and what paints before the instance arrives.
 *   PHASE 2 FORM STATE   initial values for create vs edit, prefill from the loaded
 *                        instance, the editor, the thumbnail picker + preview.
 *   PHASE 3 VALIDATION   every arm of both Yup schemas, driven through the real Formik form.
 *   PHASE 4 SUBMIT       what is actually put in the FormData and which action creator is
 *                        called with which arguments, confirm ACCEPTED and CANCELLED.
 *   PHASE 5 LIST         admin list render gate, card content, filter submit, sort
 *                        auto-submit, POV lockout, and the delete guard.
 *
 * FINDINGS (characterised, NOT fixed - each test asserts today's behaviour):
 *   HAF_DATEREF   HrAnnouncementsForm validationSchema (lines 321-322) compares each date
 *                 field against ITSELF - `release_date.max(Yup.ref('release_date'))` and
 *                 `expiry_date.min(Yup.ref('expiry_date'))`. The intended rule ("expiry must
 *                 not precede release") is therefore never enforced: an expiry date a year
 *                 BEFORE the release date validates clean and is submitted.
 *   HAF_CAT       HrAnnouncementsForm line 69 does `formData.set('category', "HR")` AFTER the
 *                 value loop, so whatever category the record already had is silently
 *                 rewritten to "HR" on every save, including on update.
 *   HAF_CONTENT   HrAnnouncementsForm line 46 overwrites values.content with this.state.content,
 *                 which is null until the TinyMCE onEditorChange fires. Editing an existing
 *                 announcement and pressing Submit without touching the editor drops the
 *                 content key from the FormData entirely.
 *   PA_DESC       PostAnnouncements line 53 has the identical defect for `description`.
 *                 LATENT - the screen is unrouted (see above), so nobody hits it today.
 *   PA_DEAD       PostAnnouncements line 112 gates on `method == 'store' || method == 'update'`,
 *                 which is always true, so `return <PageLoading/>` (line 215) is unreachable
 *                 dead code and the form paints before the fetched record can arrive. LATENT -
 *                 the screen is unrouted, so there is no edit URL that reaches it today.
 *   AAL_DUPKEY    AdminAnnouncementsList declares `status` twice in the same filter-state
 *                 object literal (lines 35 and 40); the second ('') wins, so the intended
 *                 default status of 1 is never sent to the server.
 *   AAL_DUPHAND   AdminAnnouncementsList declares onSubmitHandler twice (lines 53 and 59); the
 *                 first (props, index) definition is shadowed by the second, so only the
 *                 one-argument fetch version can ever run. SOURCE HYGIENE ONLY, NOT A
 *                 BEHAVIOUR BUG: the shadowed definition's body is entirely commented out
 *                 (lines 54-55), so deleting it changes nothing at runtime. The test pins
 *                 which of the two survives (by its arity), it does not claim a broken screen.
 *   AAL_SPLICE    onDeleteHandler (line 80) mutates the redux list in place with .splice and
 *                 only repaints because the unrelated toggleModal() setState follows it -
 *                 deleting a card leaves modal_bool stuck true with no modal on screen.
 *   AAL_COPY      the delete confirm on an ANNOUNCEMENT asks "Are you sure you want to Remove
 *                 this Department ?" (line 77).
 *   AAL_STOCKURL  the no-thumbnail fallback image (line 143) is TWO complete Unsplash URLs
 *                 concatenated into one string ("...&q=80https://images.unsplash.com/..."),
 *                 so every announcement without a thumbnail requests a malformed URL.
 *   AAL_COUNTRY   the card country lookup (line 156) calls this.props.settings.countries.filter
 *                 with no guard, while ListFilter guards the same value - a country-scoped
 *                 announcement crashes the whole page when settings.countries is undefined.
 *
 * KNOWN, DELIBERATELY NOT COVERED HERE
 *   `connect` is stubbed to identity so the containers can be driven with plain props. That
 *   means mapStateToProps/mapDispatchToProps never execute, and one further real defect is
 *   therefore invisible to this suite: AdminAnnouncementsList.js:386-387 declares
 *   fetchDepartmentAnnouncementList twice in mapDispatchToProps (the no-argument version is
 *   shadowed by the params version). Testing that needs a real store, which is out of scope
 *   for a component suite.
 *
 *   NOT A DEFECT: the announcement-title filter box is declared `type="textfield"`
 *   (ListFilter, line 305). That is invalid markup, but `type` is an enumerated attribute
 *   whose invalid-value default is "text", so every real browser treats the box as a plain
 *   text input and it works normally. jsdom 11 is the outlier - it leaves .type as
 *   "textfield", which keeps React's change plugin from recognising it as a text input.
 *   The one place below that types into this box normalises .type first for that reason.
 *   No test here asserts a user-facing failure from it, because there is none.
 *
 * ADDITIVE ONLY - no existing test file or app source was modified.
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
jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading" />);
jest.mock('../../components/Template/BackButton', () => () => <div data-testid="back-button" />);
jest.mock('../../components/Template/Paginate', () => () => <div data-testid="paginate" />);
jest.mock('react-datepicker', () => () => <input data-testid="raw-datepicker" />);

// InputDate is formik driven in the real component: DatePicker.js:184 renders a nameless
// <Field> and reads `eval('field.value.' + props.name)`, i.e. the formik value for that name,
// and IGNORES the value prop the call sites pass. The mock reads the same formik value (not
// props.value) so the data path matches, and exposes a plain text input so a date can be
// typed deterministically (local midnight, so moment().format('YYYY-MM-DD') is timezone
// independent).
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
        // the real InputDate also renders <ErrorMessage name={props.name}/>; keeping it here
        // means the date validation messages are visible to the tests exactly as in the app
        return R.createElement('div', null,
            R.createElement('input', {
                'data-testid': 'inputdate-' + name,
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

// TinyMCE: a textarea that forwards its value to onEditorChange, exactly as the real
// editor does. No script loading, no timers.
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

jest.mock('react-select', () => {
    const R = require('react');
    return {
        __esModule: true,
        default: ({ name, options, onChange, placeholder }) =>
            R.createElement('div', { 'data-testid': 'rs-' + name },
                R.createElement('span', { 'data-testid': 'rs-options-' + name },
                    (options || []).map((o) => o.label + ':' + o.value).join('|')),
                R.createElement('button', {
                    type: 'button', 'data-testid': 'rs-pick-' + name,
                    onClick: () => onChange((options || [])[0] || null),
                }, placeholder || 'pick'),
                R.createElement('button', {
                    type: 'button', 'data-testid': 'rs-clear-' + name,
                    onClick: () => onChange(null),
                }, 'clear')),
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

    const Card = ({ children, className }) =>
        R.createElement('div', { 'data-testid': 'card', className }, children);
    Card.Img   = ({ src }) => R.createElement('img', { 'data-testid': 'card-img', src, alt: '' });
    Card.Body  = pass;
    Card.Title = ({ children }) => R.createElement('h4', { 'data-testid': 'card-title' }, children);
    Card.Text  = ({ children }) => R.createElement('div', null, children);

    return {
        Form,
        FormControl: Control,
        InputGroup: pass,
        Modal: pass, Container: pass, Row: pass, Col: pass, Table: pass, Card,
        // the real react-bootstrap Button renders `btn btn-<variant>` plus any className it is
        // given; the mock reproduces that so selectors written against it match the DOM the
        // app actually ships rather than a mock-only attribute.
        Button: ({ children, onClick, type, variant, className, style }) =>
            R.createElement('button',
                {
                    type: type || 'button',
                    onClick,
                    className: ['btn', variant ? 'btn-' + variant : '', className || '']
                        .filter(Boolean).join(' '),
                    style,
                },
                children),
    };
});

jest.mock('../../services/API', () => ({ call: jest.fn() }));
jest.mock('../../services/Authenticator', () => ({
    scanLevel: jest.fn(() => true), scanFeature: jest.fn(() => true), check: jest.fn(() => true),
}));

jest.mock('../../store/actions/announcement/hrAnnouncementActions', () => ({
    createHrAnnouncement:        jest.fn(),
    fetchHrAnnouncementStrict:   jest.fn(),
    updateHrAnnouncement:        jest.fn(),
    clearHrAnnouncementInstance: jest.fn(),
}), { virtual: true });

jest.mock('../../store/actions/hr/hrAnnouncementsActions', () => ({
    fetchHrAnnouncement:         jest.fn(),
    addHrAnnouncements:          jest.fn(),
    updateHrAnnouncements:       jest.fn(),
    clearHrAnnouncementInstance: jest.fn(),
}), { virtual: true });

jest.mock('../../store/actions/announcement/departmentAnnouncementActions', () => ({
    fetchDepartmentAnnouncementList:         jest.fn(),
    deleteDepartmentAnnouncement:            jest.fn(),
    clearDepartmentAnnouncementListInstance: jest.fn(),
}), { virtual: true });

jest.mock('../../store/actions/lookup/lookupListActions', () => ({
    fetchDepartmentListWithAnnouncements: jest.fn(),
    fetchUserList:                        jest.fn(),
}), { virtual: true });

jest.mock('../../store/actions/redirectActions', () => ({ setRedirect: jest.fn() }), { virtual: true });

// keyed proxy so two different route names cannot look identical
global.links = new Proxy({}, { get: (t, k) => '/x/' + String(k) + '/' });

const HrAnnouncementsForm =
    require('../../container/Hr/HrAnnouncementsForm/HrAnnouncementsForm').default;
const PostAnnouncements =
    require('../../container/Hr/PostAnnouncements/PostAnnouncements').default;
const AdminAnnouncementsList =
    require('../../container/Admin/AdminAnnouncementsList/AdminAnnouncementsList').default;

/* -------------------------------------------------------------- utilities */

// Formik + Yup are promise based and use NO timers; two macrotask boundaries drain
// every pending microtask chain, so the suite settles identically on every machine.
const macro = () => new Promise((resolve) => {
    if (typeof setImmediate === 'function') setImmediate(resolve); else setTimeout(resolve, 0);
});
const settle = async () => {
    await act(async () => { await macro(); });
    await act(async () => { await macro(); });
};

const fdToObject = (fd) => {
    const out = {};
    Array.from(fd.entries()).forEach(([k, v]) => { out[k] = v; });
    return out;
};

const attachFile = (input, files) => {
    Object.defineProperty(input, 'files', { value: files, configurable: true });
};

let confirmSpy;
let logSpy;

beforeEach(() => {
    jest.clearAllMocks();
    confirmSpy = jest.spyOn(window, 'confirm').mockImplementation(() => true);
    // ListFilter (AdminAnnouncementsList.js:248) logs the whole component state on every
    // render and HrAnnouncementsForm.js:30-31 logs the pathname twice per construction.
    // Silenced so the run output stays readable; nothing here asserts on console.log.
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    global.URL.createObjectURL = jest.fn(() => 'blob:preview-1');
});

afterEach(() => {
    confirmSpy.mockRestore();
    logSpy.mockRestore();
});

/* ================================================================================
 * 1. HR -> Create / Edit HR Announcement   (HrAnnouncementsForm.js)
 * ============================================================================== */

const hrFormActions = () => ({
    clearHrAnnouncementInstance: jest.fn(),
    fetchHrAnnouncementStrict:   jest.fn(),
    createHrAnnouncement:        jest.fn(),
    updateHrAnnouncement:        jest.fn(),
    setRedirect:                 jest.fn(),
});

const renderHrForm = ({
    params = {}, instance = null, isInstanceLoaded = false, actions = hrFormActions(),
} = {}) => {
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter>
            <HrAnnouncementsForm
                ref={ref}
                params={params}
                instance={instance}
                isInstanceLoaded={isInstanceLoaded}
                user={{ id: 7, full_name: 'Ada Lovelace' }}
                constant={{}}
                {...actions}
            />
        </MemoryRouter>
    );
    return { ...utils, ref, actions };
};

const submitHrForm = async (getByText) => {
    await act(async () => { fireEvent.click(getByText(/Submit/)); });
    await settle();
};

describe('HR announcement form - mount and render gate', () => {

    test('opening_the_create_screen_wipes_the_cached_instance_and_never_asks_the_server_for_a_record', async () => {
        const { actions, getByTestId, queryByTestId } = renderHrForm();
        await settle();

        expect(actions.clearHrAnnouncementInstance).toHaveBeenCalledTimes(1);
        expect(actions.fetchHrAnnouncementStrict).not.toHaveBeenCalled();
        expect(queryByTestId('page-loading')).toBeNull();
        expect(getByTestId('content').getAttribute('data-title')).toBe('Announcement Form');
    });

    test('opening_an_edit_url_wipes_the_cache_first_and_then_fetches_that_one_announcement_by_its_route_id', async () => {
        const { actions } = renderHrForm({ params: { id: '42' }, isInstanceLoaded: false });
        await settle();

        expect(actions.fetchHrAnnouncementStrict).toHaveBeenCalledTimes(1);
        expect(actions.fetchHrAnnouncementStrict).toHaveBeenCalledWith('42');
        expect(actions.clearHrAnnouncementInstance.mock.invocationCallOrder[0])
            .toBeLessThan(actions.fetchHrAnnouncementStrict.mock.invocationCallOrder[0]);
    });

    test('an_edit_screen_shows_only_the_loading_page_until_the_announcement_instance_has_finished_loading', async () => {
        const { getByTestId, queryByTestId } = renderHrForm({
            params: { id: '42' }, instance: null, isInstanceLoaded: false,
        });
        await settle();

        expect(getByTestId('page-loading')).toBeInTheDocument();
        expect(queryByTestId('input-title')).toBeNull();
        expect(queryByTestId('editor-content')).toBeNull();
    });

    test('once_the_instance_is_loaded_the_edit_form_opens_prefilled_with_the_stored_title_headline_and_body', async () => {
        const { getByTestId } = renderHrForm({
            params: { id: '42' },
            isInstanceLoaded: true,
            instance: {
                id: 42, title: 'Health plan renewal', headline: 'Act before Friday',
                content: '<p>details</p>', category: 'Updates',
                release_date: '2026-09-01', expiry_date: '2026-09-30', thumbnail: null,
            },
        });
        await settle();

        expect(getByTestId('input-title').value).toBe('Health plan renewal');
        expect(getByTestId('input-headline').value).toBe('Act before Friday');
        expect(getByTestId('editor-content').value).toBe('<p>details</p>');
    });

    test('the_create_form_opens_completely_empty_because_a_loaded_instance_is_only_read_back_in_edit_mode', async () => {
        // instance is present in the store (left over from a previous edit) but method is store
        const { getByTestId } = renderHrForm({
            params: {},
            isInstanceLoaded: true,
            instance: { id: 42, title: 'Health plan renewal', headline: 'Act before Friday' },
        });
        await settle();

        expect(getByTestId('input-title').value).toBe('');
        expect(getByTestId('input-headline').value).toBe('');
        expect(getByTestId('editor-content').value).toBe('');
    });
});

describe('HR announcement form - validation', () => {

    test('submitting_with_no_title_is_rejected_and_nothing_is_sent_to_the_server', async () => {
        const { getByText, getAllByText, actions } = renderHrForm();
        await submitHrForm(getByText);

        expect(actions.createHrAnnouncement).not.toHaveBeenCalled();
        // exactly the three required fields complain: title, release_date, expiry_date
        expect(getAllByText(/This field is required/).length).toBe(3);
    });

    test('a_title_longer_than_one_hundred_characters_is_rejected_with_the_max_length_message', async () => {
        const { getByText, getByTestId, actions } = renderHrForm();
        fireEvent.change(getByTestId('input-title'), { target: { name: 'title', value: 'x'.repeat(101) } });
        await submitHrForm(getByText);

        expect(actions.createHrAnnouncement).not.toHaveBeenCalled();
        expect(getByText(/Max Title Length reached/)).toBeInTheDocument();
    });

    test('a_headline_longer_than_one_hundred_characters_is_rejected_even_though_the_headline_itself_is_optional', async () => {
        const { getByText, getByTestId, actions } = renderHrForm();
        fireEvent.change(getByTestId('input-title'), { target: { name: 'title', value: 'Fine title' } });
        fireEvent.change(getByTestId('input-headline'), { target: { name: 'headline', value: 'y'.repeat(101) } });
        await submitHrForm(getByText);

        expect(actions.createHrAnnouncement).not.toHaveBeenCalled();
        expect(getByText(/Max Headline Length reached/)).toBeInTheDocument();
    });

    test('an_announcement_with_a_title_but_no_release_or_expiry_date_is_rejected_on_both_date_fields', async () => {
        const { getByText, getByTestId, getAllByText, actions } = renderHrForm();
        fireEvent.change(getByTestId('input-title'), { target: { name: 'title', value: 'Fine title' } });
        await submitHrForm(getByText);

        expect(actions.createHrAnnouncement).not.toHaveBeenCalled();
        // one message under release_date, one under expiry_date - the title no longer errors
        expect(getAllByText(/This field is required/).length).toBe(2);
    });

    test('filling_in_only_the_release_date_still_leaves_the_expiry_date_blocking_the_save', async () => {
        const { getByText, getByTestId, getAllByText, actions } = renderHrForm();
        fireEvent.change(getByTestId('input-title'), { target: { name: 'title', value: 'Fine title' } });
        fireEvent.change(getByTestId('inputdate-release_date'), { target: { value: '2026-09-01' } });
        await submitHrForm(getByText);

        expect(actions.createHrAnnouncement).not.toHaveBeenCalled();
        expect(getAllByText(/This field is required/).length).toBe(1);
    });

    // FINDING HAF_DATEREF - the schema compares release_date with Yup.ref('release_date') and
    // expiry_date with Yup.ref('expiry_date'), i.e. each field against ITSELF, so the
    // "expiry after release" rule the messages advertise is never enforced.
    test('an_expiry_date_a_year_before_the_release_date_is_accepted_and_saved_FINDING_HAF_DATEREF', async () => {
        const { getByText, getByTestId, actions } = renderHrForm();
        fireEvent.change(getByTestId('input-title'), { target: { name: 'title', value: 'Backwards dates' } });
        fireEvent.change(getByTestId('inputdate-release_date'), { target: { value: '2026-09-01' } });
        fireEvent.change(getByTestId('inputdate-expiry_date'),  { target: { value: '2025-09-01' } });
        await submitHrForm(getByText);

        expect(actions.createHrAnnouncement).toHaveBeenCalledTimes(1);
        const sent = fdToObject(actions.createHrAnnouncement.mock.calls[0][0]);
        expect(sent.release_date).toBe('2026-09-01');
        expect(sent.expiry_date).toBe('2025-09-01');
        // and no "Please select a Valid To date." was ever shown
        expect(document.body.textContent).not.toMatch(/Please select a Valid/);
    });
});

describe('HR announcement form - submit payload', () => {

    const fillValidHrForm = (getByTestId) => {
        fireEvent.change(getByTestId('input-title'), { target: { name: 'title', value: 'Q4 town hall' } });
        fireEvent.change(getByTestId('input-headline'), { target: { name: 'headline', value: 'Everyone invited' } });
        fireEvent.change(getByTestId('inputdate-release_date'), { target: { value: '2026-09-01' } });
        fireEvent.change(getByTestId('inputdate-expiry_date'),  { target: { value: '2026-09-30' } });
        fireEvent.change(getByTestId('editor-content'), { target: { value: '<p>agenda</p>' } });
    };

    test('a_complete_new_announcement_is_sent_as_form_data_with_both_dates_reduced_to_calendar_days', async () => {
        const { getByTestId, getByText, actions } = renderHrForm();
        fillValidHrForm(getByTestId);
        await submitHrForm(getByText);

        expect(actions.createHrAnnouncement).toHaveBeenCalledTimes(1);
        expect(actions.updateHrAnnouncement).not.toHaveBeenCalled();
        const sent = fdToObject(actions.createHrAnnouncement.mock.calls[0][0]);
        expect(sent.title).toBe('Q4 town hall');
        expect(sent.headline).toBe('Everyone invited');
        expect(sent.release_date).toBe('2026-09-01');
        expect(sent.expiry_date).toBe('2026-09-30');
        expect(sent.content).toBe('<p>agenda</p>');
        expect(sent.method).toBe('store');
    });

    test('empty_optional_fields_are_dropped_from_the_payload_instead_of_being_sent_as_the_word_null', async () => {
        const { getByTestId, getByText, actions } = renderHrForm();
        fireEvent.change(getByTestId('input-title'), { target: { name: 'title', value: 'No headline here' } });
        fireEvent.change(getByTestId('inputdate-release_date'), { target: { value: '2026-09-01' } });
        fireEvent.change(getByTestId('inputdate-expiry_date'),  { target: { value: '2026-09-30' } });
        await submitHrForm(getByText);

        const fd = actions.createHrAnnouncement.mock.calls[0][0];
        expect(fd.has('headline')).toBe(false);   // untouched -> null -> skipped
        expect(fd.has('action')).toBe(false);     // action is always null on this screen
        expect(fd.has('id')).toBe(false);         // no id when creating
    });

    test('answering_no_to_the_are_you_sure_prompt_abandons_the_new_announcement_without_calling_the_server', async () => {
        confirmSpy.mockImplementation(() => false);
        const { getByTestId, getByText, actions } = renderHrForm();
        fillValidHrForm(getByTestId);
        await submitHrForm(getByText);

        expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to submit this Announcement?');
        expect(actions.createHrAnnouncement).not.toHaveBeenCalled();
    });

    test('saving_an_existing_announcement_calls_the_update_action_with_the_record_id_first_and_the_form_data_second', async () => {
        const { getByTestId, getByText, actions } = renderHrForm({
            params: { id: '42' },
            isInstanceLoaded: true,
            instance: { id: 42, title: 'Old title', headline: null, content: '<p>old</p>',
                        category: 'Updates', thumbnail: null },
        });
        fireEvent.change(getByTestId('input-title'), { target: { name: 'title', value: 'New title' } });
        fireEvent.change(getByTestId('inputdate-release_date'), { target: { value: '2026-09-01' } });
        fireEvent.change(getByTestId('inputdate-expiry_date'),  { target: { value: '2026-09-30' } });
        fireEvent.change(getByTestId('editor-content'), { target: { value: '<p>new</p>' } });
        await submitHrForm(getByText);

        expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to update this Announcement?');
        expect(actions.createHrAnnouncement).not.toHaveBeenCalled();
        expect(actions.updateHrAnnouncement).toHaveBeenCalledTimes(1);
        expect(actions.updateHrAnnouncement.mock.calls[0].length).toBe(2);
        expect(actions.updateHrAnnouncement.mock.calls[0][0]).toBe(42);
        const sent = fdToObject(actions.updateHrAnnouncement.mock.calls[0][1]);
        expect(sent.title).toBe('New title');
        expect(sent.method).toBe('update');
        expect(sent.id).toBe('42');
    });

    test('answering_no_to_the_update_prompt_leaves_the_stored_announcement_untouched', async () => {
        confirmSpy.mockImplementation(() => false);
        const { getByTestId, getByText, actions } = renderHrForm({
            params: { id: '42' },
            isInstanceLoaded: true,
            instance: { id: 42, title: 'Old title', headline: null, content: '<p>old</p>', thumbnail: null },
        });
        fireEvent.change(getByTestId('inputdate-release_date'), { target: { value: '2026-09-01' } });
        fireEvent.change(getByTestId('inputdate-expiry_date'),  { target: { value: '2026-09-30' } });
        await submitHrForm(getByText);

        expect(actions.updateHrAnnouncement).not.toHaveBeenCalled();
    });

    // FINDING HAF_CAT - line 69 does formData.set('category', "HR") AFTER the value loop, so the
    // category the record already carries is silently rewritten on every save. Driven through
    // the real EDIT form, which is the only screen that can hold a non-null category:
    // initialValue.category (line 139) is null whenever method is 'store'.
    test('saving_an_existing_announcement_rewrites_its_stored_category_to_hr_FINDING_HAF_CAT', async () => {
        const { getByTestId, getByText, actions } = renderHrForm({
            params: { id: '42' },
            isInstanceLoaded: true,
            instance: { id: 42, title: 'Old title', headline: null, content: '<p>old</p>',
                        category: 'Updates', thumbnail: null },
        });
        fireEvent.change(getByTestId('inputdate-release_date'), { target: { value: '2026-09-01' } });
        fireEvent.change(getByTestId('inputdate-expiry_date'),  { target: { value: '2026-09-30' } });
        await submitHrForm(getByText);

        const sent = fdToObject(actions.updateHrAnnouncement.mock.calls[0][1]);
        // the record was stored as 'Updates'; what goes back to the server is 'HR'
        expect(sent.category).toBe('HR');
    });

    // FINDING HAF_CONTENT - values.content is replaced by this.state.content (null until the
    // editor fires), so an edit that does not touch the body sends no content field at all.
    test('editing_an_announcement_without_touching_the_editor_sends_no_content_field_at_all_FINDING_HAF_CONTENT', async () => {
        const { getByTestId, getByText, actions } = renderHrForm({
            params: { id: '42' },
            isInstanceLoaded: true,
            instance: { id: 42, title: 'Old title', headline: null,
                        content: '<p>the body that is about to be lost</p>', thumbnail: null },
        });
        // the editor shows the stored body ...
        expect(getByTestId('editor-content').value).toBe('<p>the body that is about to be lost</p>');
        fireEvent.change(getByTestId('inputdate-release_date'), { target: { value: '2026-09-01' } });
        fireEvent.change(getByTestId('inputdate-expiry_date'),  { target: { value: '2026-09-30' } });
        await submitHrForm(getByText);

        // ... but it is not part of what is saved
        const fd = actions.updateHrAnnouncement.mock.calls[0][1];
        expect(fd.has('content')).toBe(false);
    });

    test('a_submission_with_an_unrecognised_method_is_silently_discarded_and_neither_action_runs', async () => {
        const { ref, actions } = renderHrForm();
        await settle();

        act(() => { ref.current.onSubmitHandler({ method: 'approve', title: 'x' }); });
        act(() => { ref.current.onSubmitHandler({ method: null, title: 'x' }); });

        expect(actions.createHrAnnouncement).not.toHaveBeenCalled();
        expect(actions.updateHrAnnouncement).not.toHaveBeenCalled();
        expect(confirmSpy).not.toHaveBeenCalled();
    });
});

describe('HR announcement form - thumbnail picker', () => {

    test('choosing_a_thumbnail_stores_the_file_and_swaps_the_preview_image_to_the_chosen_one', async () => {
        const { ref, getByTestId, container } = renderHrForm();
        await settle();

        const file = new File(['png-bytes'], 'banner.png', { type: 'image/png' });
        const input = getByTestId('file-thumbnail');
        attachFile(input, [file]);
        await act(async () => { fireEvent.change(input); });

        expect(ref.current.state.thumbnail).toBe(file);
        expect(ref.current.state.imgPrevInputFile).toBe('blob:preview-1');
        expect(global.URL.createObjectURL).toHaveBeenCalledWith(file);
        expect(container.querySelector('.thumbnail-image img').getAttribute('src'))
            .toBe('blob:preview-1');
    });

    test('cancelling_the_file_dialog_leaves_the_previous_thumbnail_and_the_default_preview_in_place', async () => {
        const { ref, getByTestId } = renderHrForm();
        await settle();

        const input = getByTestId('file-thumbnail');
        attachFile(input, []);
        await act(async () => { fireEvent.change(input); });

        expect(ref.current.state.thumbnail).toBeNull();
        expect(ref.current.state.imgPrevInputFile).toBe('/thumbnail/defthumb.jpg');
        expect(global.URL.createObjectURL).not.toHaveBeenCalled();
    });

    test('before_any_file_is_chosen_an_existing_announcement_still_shows_the_thumbnail_already_on_the_record', async () => {
        const { container } = renderHrForm({
            params: { id: '42' },
            isInstanceLoaded: true,
            instance: { id: 42, title: 'Has a picture', thumbnail: '/uploads/stored-thumb.png' },
        });
        await settle();

        expect(container.querySelector('.thumbnail-image img').getAttribute('src'))
            .toBe('/uploads/stored-thumb.png');
    });

    test('a_new_announcement_sends_the_chosen_thumbnail_while_one_with_no_file_chosen_sends_none', async () => {
        // arm 1 - no file chosen
        const bare = renderHrForm();
        await settle();
        act(() => { bare.ref.current.onSubmitHandler({ method: 'store', title: 'x' }); });
        expect(bare.actions.createHrAnnouncement.mock.calls[0][0].has('thumbnail')).toBe(false);
        bare.unmount();

        // arm 2 - a file chosen
        const withFile = renderHrForm();
        await settle();
        const file = new File(['png'], 'banner.png', { type: 'image/png' });
        attachFile(withFile.getByTestId('file-thumbnail'), [file]);
        await act(async () => { fireEvent.change(withFile.getByTestId('file-thumbnail')); });
        act(() => { withFile.ref.current.onSubmitHandler({ method: 'store', title: 'x' }); });

        expect(withFile.actions.createHrAnnouncement.mock.calls[0][0].get('thumbnail')).toBe(file);
        // and the picker resets itself after a successful create
        expect(withFile.ref.current.state.thumbnail).toBeNull();
        expect(withFile.ref.current.state.imgPrevInputFile).toBe('/thumbnail/defthumb.jpg');
    });

    // NOTE: the mirror arm (a thumbnail in state with inputFileWasUpdated still false, which
    // would exercise the false branch of HrAnnouncementsForm.js:93) was removed - the file
    // picker at lines 230-234 sets both in the same handler on an update screen, so an update
    // screen can never reach that combination and a test that forces it via setState proves
    // nothing about the app.
    test('picking_a_file_on_an_edit_screen_raises_the_updated_flag_and_uploads_that_file_with_the_update', async () => {
        const instance = { id: 42, title: 'Old title', thumbnail: '/uploads/stored-thumb.png' };
        const file = new File(['png'], 'banner.png', { type: 'image/png' });

        const edit = renderHrForm({ params: { id: '42' }, isInstanceLoaded: true, instance });
        await settle();
        attachFile(edit.getByTestId('file-thumbnail'), [file]);
        await act(async () => { fireEvent.change(edit.getByTestId('file-thumbnail')); });

        expect(edit.ref.current.state.inputFileWasUpdated).toBe(true);
        act(() => { edit.ref.current.onSubmitHandler({ method: 'update', id: 42, title: 'x' }); });
        expect(edit.actions.updateHrAnnouncement.mock.calls[0][1].get('thumbnail')).toBe(file);
    });

    test('picking_a_file_on_the_create_screen_never_raises_the_file_was_updated_flag_that_only_edits_use', async () => {
        const { ref, getByTestId } = renderHrForm({ params: {} });
        await settle();

        const file = new File(['png'], 'banner.png', { type: 'image/png' });
        attachFile(getByTestId('file-thumbnail'), [file]);
        await act(async () => { fireEvent.change(getByTestId('file-thumbnail')); });

        expect(ref.current.state.thumbnail).toBe(file);
        expect(ref.current.state.inputFileWasUpdated).toBe(false);
    });
});

/* ================================================================================
 * 2. HR -> Post / Edit Announcement   (PostAnnouncements.js)
 * ============================================================================== */

const postActions = () => ({
    clearHrAnnouncementInstance: jest.fn(),
    fetchHrAnnouncement:         jest.fn(),
    addHrAnnouncements:          jest.fn(),
    updateHrAnnouncements:       jest.fn(),
    setRedirect:                 jest.fn(),
});

const renderPost = ({ params = {}, hrAnnouncement = {}, actions = postActions() } = {}) => {
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter>
            <PostAnnouncements
                ref={ref}
                params={params}
                hrAnnouncement={hrAnnouncement}
                user={{ id: 7, full_name: 'Ada Lovelace' }}
                {...actions}
            />
        </MemoryRouter>
    );
    return { ...utils, ref, actions };
};

describe('HR post announcement screen - mount and prefill', () => {

    test('opening_the_post_screen_clears_the_cached_announcement_and_does_not_fetch_anything', async () => {
        const { actions } = renderPost();
        await settle();

        expect(actions.clearHrAnnouncementInstance).toHaveBeenCalledTimes(1);
        expect(actions.fetchHrAnnouncement).not.toHaveBeenCalled();
    });

    test('opening_an_edit_url_clears_the_cache_before_fetching_the_announcement_named_in_the_route', async () => {
        const { actions } = renderPost({ params: { id: '9' } });
        await settle();

        expect(actions.fetchHrAnnouncement).toHaveBeenCalledWith('9');
        expect(actions.clearHrAnnouncementInstance.mock.invocationCallOrder[0])
            .toBeLessThan(actions.fetchHrAnnouncement.mock.invocationCallOrder[0]);
    });

    // FINDING PA_DEAD - the render gate is `method == 'store' || method == 'update'`, which is
    // always true, so `return <PageLoading/>` (line 215) can never run and the form paints
    // before the fetched record can arrive (HrAnnouncementsForm guards this with
    // isInstanceLoaded). LATENT: this screen has no route, so no user reaches it today.
    test('the_update_branch_paints_an_empty_form_before_the_record_arrives_because_the_loading_gate_is_always_true_FINDING_PA_DEAD', async () => {
        const { getByTestId, queryByTestId } = renderPost({ params: { id: '9' }, hrAnnouncement: {} });
        await settle();

        expect(queryByTestId('page-loading')).toBeNull();
        expect(getByTestId('input-title').value).toBe('');
        expect(getByTestId('editor-description').value).toBe('');
        expect(getByTestId('content').getAttribute('data-title')).toBe('HR Announcement Form');
    });

    test('when_the_record_arrives_the_form_shows_its_stored_title_category_and_description', async () => {
        const { getByTestId, container } = renderPost({
            params: { id: '9' },
            hrAnnouncement: {
                id: 9, title: 'Release 3.2 notes', category: 'Release Notes',
                description: '<p>what changed</p>', log_date: '2026-09-01',
            },
        });
        await settle();

        expect(getByTestId('input-title').value).toBe('Release 3.2 notes');
        expect(getByTestId('editor-description').value).toBe('<p>what changed</p>');
        expect(container.querySelector('select[name="category"]').value).toBe('Release Notes');
    });

    test('the_category_dropdown_offers_exactly_the_three_change_log_categories_plus_a_blank_choice', async () => {
        const { container } = renderPost();
        await settle();

        const options = Array.from(container.querySelectorAll('select[name="category"] option'))
            .map((o) => o.value);
        expect(options).toEqual(['', 'Announcements', 'Updates', 'Release Notes']);
    });

    test('the_back_button_sends_the_user_to_the_manage_hr_announcements_list', async () => {
        const { getByText, actions } = renderPost();
        await settle();

        fireEvent.click(getByText('Back'));
        expect(actions.setRedirect).toHaveBeenCalledWith('/app/hr/ManageHrAnnouncements/');
    });
});

describe('HR post announcement screen - validation and submit', () => {

    const fillPost = (getByTestId, container) => {
        fireEvent.change(getByTestId('input-title'), { target: { name: 'title', value: 'Release 3.2' } });
        fireEvent.change(container.querySelector('select[name="category"]'),
            { target: { name: 'category', value: 'Release Notes' } });
        fireEvent.change(getByTestId('inputdate-log_date'), { target: { value: '2026-09-01' } });
    };

    const submitPost = async (getByText) => {
        await act(async () => { fireEvent.click(getByText(/Submit/)); });
        await settle();
    };

    test('an_empty_change_log_entry_is_rejected_on_all_three_required_fields', async () => {
        const { getByText, getAllByText, actions } = renderPost();
        await submitPost(getByText);

        expect(actions.addHrAnnouncements).not.toHaveBeenCalled();
        expect(getAllByText(/This field is required/).length).toBe(3); // title, category, date
    });

    test('an_entry_with_a_title_but_no_category_is_still_rejected', async () => {
        const { getByText, getByTestId, getAllByText, actions } = renderPost();
        fireEvent.change(getByTestId('input-title'), { target: { name: 'title', value: 'Release 3.2' } });
        fireEvent.change(getByTestId('inputdate-log_date'), { target: { value: '2026-09-01' } });
        await submitPost(getByText);

        expect(actions.addHrAnnouncements).not.toHaveBeenCalled();
        expect(getAllByText(/This field is required/).length).toBe(1);
    });

    test('a_complete_new_entry_is_posted_with_the_date_reduced_to_a_calendar_day_and_the_editor_body', async () => {
        const { getByText, getByTestId, container, actions } = renderPost();
        fillPost(getByTestId, container);
        fireEvent.change(getByTestId('editor-description'), { target: { value: '<p>what changed</p>' } });
        await submitPost(getByText);

        expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to submit this announcement?');
        expect(actions.addHrAnnouncements).toHaveBeenCalledTimes(1);
        const sent = fdToObject(actions.addHrAnnouncements.mock.calls[0][0]);
        expect(sent.title).toBe('Release 3.2');
        expect(sent.category).toBe('Release Notes');
        expect(sent.log_date).toBe('2026-09-01');
        expect(sent.description).toBe('<p>what changed</p>');
        expect(sent.method).toBe('store');
    });

    test('answering_no_to_the_confirmation_posts_nothing_at_all', async () => {
        confirmSpy.mockImplementation(() => false);
        const { getByText, getByTestId, container, actions } = renderPost();
        fillPost(getByTestId, container);
        await submitPost(getByText);

        expect(actions.addHrAnnouncements).not.toHaveBeenCalled();
        expect(actions.updateHrAnnouncements).not.toHaveBeenCalled();
    });

    test('saving_an_existing_entry_calls_update_with_the_id_first_and_the_form_data_second', async () => {
        const { getByText, getByTestId, actions } = renderPost({
            params: { id: '9' },
            hrAnnouncement: { id: 9, title: 'Old', category: 'Updates',
                              description: '<p>old</p>', log_date: '2026-09-01' },
        });
        fireEvent.change(getByTestId('input-title'), { target: { name: 'title', value: 'Newer' } });
        fireEvent.change(getByTestId('inputdate-log_date'), { target: { value: '2026-09-02' } });
        await submitPost(getByText);

        expect(actions.addHrAnnouncements).not.toHaveBeenCalled();
        expect(actions.updateHrAnnouncements).toHaveBeenCalledTimes(1);
        expect(actions.updateHrAnnouncements.mock.calls[0].length).toBe(2);
        expect(actions.updateHrAnnouncements.mock.calls[0][0]).toBe(9);
        const sent = fdToObject(actions.updateHrAnnouncements.mock.calls[0][1]);
        expect(sent.log_date).toBe('2026-09-02');
        expect(sent.method).toBe('update');
    });

    test('a_submission_whose_method_is_neither_store_nor_update_never_even_raises_the_confirmation', async () => {
        const { ref, actions } = renderPost();
        await settle();

        act(() => { ref.current.onSubmitHandler({ method: 'delete', id: 9, title: 'x' }); });

        expect(confirmSpy).not.toHaveBeenCalled();
        expect(actions.addHrAnnouncements).not.toHaveBeenCalled();
        expect(actions.updateHrAnnouncements).not.toHaveBeenCalled();
    });

    // FINDING PA_DESC - description is taken from component state, which is null until the
    // editor fires onEditorChange, so re-saving an untouched entry drops its body.
    test('resaving_an_existing_entry_without_touching_the_editor_drops_its_description_FINDING_PA_DESC', async () => {
        const { getByText, getByTestId, actions } = renderPost({
            params: { id: '9' },
            hrAnnouncement: { id: 9, title: 'Old', category: 'Updates',
                              description: '<p>body about to be lost</p>', log_date: '2026-09-01' },
        });
        expect(getByTestId('editor-description').value).toBe('<p>body about to be lost</p>');
        await submitPost(getByText);

        const fd = actions.updateHrAnnouncements.mock.calls[0][1];
        expect(fd.has('description')).toBe(false);
    });
});

/* ================================================================================
 * 3. Admin -> Manage All EVOX Announcements   (AdminAnnouncementsList.js)
 * ============================================================================== */

const adminActions = () => ({
    fetchDepartmentListWithAnnouncements:    jest.fn(() => Promise.resolve()),
    clearDepartmentAnnouncementListInstance: jest.fn(() => Promise.resolve()),
    fetchDepartmentAnnouncementList:         jest.fn(() => Promise.resolve()),
    fetchUserList:                           jest.fn(() => Promise.resolve()),
    deleteDepartmentAnnouncement:            jest.fn(),
});

const COUNTRIES = [
    { country_id: 1, country_name: 'Philippines' },
    { country_id: 2, country_name: 'India' },
];

const DEPARTMENTS = [
    { id: 3, department_name: 'Engineering' },
    { id: 4, department_name: 'Human Resources' },
];

const EMPLOYEES = [
    { id: 11, full_name: 'Ada Lovelace' },
    { id: 12, full_name: 'Grace Hopper' },
];

const ANNOUNCEMENTS = () => ([
    {   id: 101, title: 'Server maintenance', thumbnail: '/uploads/maint.png',
        is_expired: false, on_link: 0, link: null,
        creator: { full_name: 'Ada Lovelace' }, created_at: '2026-07-01 09:00:00',
        release_date: '2026-07-02', expiry_date: '2026-07-30',
        set_country_all: 1, country_id: null, set_all: 1, selectedDepartments: [] },
    {   id: 102, title: 'Town hall', thumbnail: null,
        is_expired: true, on_link: 1, link: 'forms.example/townhall',
        creator: { full_name: 'Grace Hopper' }, created_at: '2026-07-03 10:00:00',
        release_date: '2026-07-04', expiry_date: '2026-07-10',
        set_country_all: 0, country_id: 2, set_all: 0,
        selectedDepartments: [{ id: 3 }, { id: 4 }] },
    {   id: 103, title: 'Sign the policy', thumbnail: null,
        is_expired: false, on_link: 1, link: 'https://forms.example/policy',
        creator: { full_name: 'Ada Lovelace' }, created_at: '2026-07-05 11:00:00',
        release_date: '2026-07-06', expiry_date: '2026-08-06',
        set_country_all: 0, country_id: 99, set_all: 0, selectedDepartments: [{ id: 3 }] },
]);

const renderAdmin = ({
    list = ANNOUNCEMENTS(), loaded = true, hasList = true,
    countries = COUNTRIES, noCountries = false,
    department = DEPARTMENTS, employee = EMPLOYEES,
    actions = adminActions(),
} = {}) => {
    if (noCountries) countries = undefined;
    const ref = React.createRef();
    const slice = {
        isDepartmentAnnouncementListLoaded: loaded,
        depAnnouncementlist: hasList
            ? { data: list, pagination: { current_page: 1, last_page: 1 } }
            : {},
    };
    const utils = render(
        <MemoryRouter>
            <AdminAnnouncementsList
                ref={ref}
                departmentAnnouncement={slice}
                settings={{ countries }}
                department={department}
                employee={employee}
                {...actions}
            />
        </MemoryRouter>
    );
    return { ...utils, ref, actions, slice };
};

const cardTitles = (getAllByTestId) =>
    getAllByTestId('card-title').map((n) => n.textContent.trim());

const hrefs = (container) =>
    Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'));

describe('Manage All EVOX Announcements - mount and render gate', () => {

    test('opening_the_admin_list_loads_the_department_lookup_then_wipes_the_cache_then_asks_for_the_announcements_and_the_employee_lookup', async () => {
        const { actions } = renderAdmin();
        await settle();

        expect(actions.fetchDepartmentListWithAnnouncements).toHaveBeenCalledTimes(1);
        expect(actions.clearDepartmentAnnouncementListInstance).toHaveBeenCalledTimes(1);
        expect(actions.fetchDepartmentAnnouncementList).toHaveBeenCalledTimes(1);
        expect(actions.fetchUserList).toHaveBeenCalledWith('employee', { page: 'all' });

        const order = (fn) => fn.mock.invocationCallOrder[0];
        expect(order(actions.fetchDepartmentListWithAnnouncements))
            .toBeLessThan(order(actions.clearDepartmentAnnouncementListInstance));
        expect(order(actions.clearDepartmentAnnouncementListInstance))
            .toBeLessThan(order(actions.fetchDepartmentAnnouncementList));
        expect(order(actions.fetchDepartmentAnnouncementList))
            .toBeLessThan(order(actions.fetchUserList));

        // the first, automatic load asks for the unfiltered list
        expect(actions.fetchDepartmentAnnouncementList.mock.calls[0].length).toBe(0);
    });

    test('until_the_announcements_have_loaded_the_admin_sees_the_loading_page_and_no_cards', async () => {
        const { getByTestId, queryAllByTestId } = renderAdmin({ loaded: false });
        await settle();

        expect(getByTestId('page-loading')).toBeInTheDocument();
        expect(queryAllByTestId('card').length).toBe(0);
    });

    test('a_list_flagged_loaded_but_carrying_no_data_array_keeps_showing_the_loading_page_rather_than_crashing', async () => {
        const { getByTestId, queryAllByTestId } = renderAdmin({ loaded: true, hasList: false });
        await settle();

        expect(getByTestId('page-loading')).toBeInTheDocument();
        expect(queryAllByTestId('card').length).toBe(0);
    });

    test('an_admin_whose_search_matched_nothing_gets_the_filter_bar_but_not_a_single_card', async () => {
        const { queryAllByTestId, getByTestId, container } = renderAdmin({ list: [] });
        await settle();

        expect(queryAllByTestId('card').length).toBe(0);
        expect(getByTestId('content').getAttribute('data-title')).toBe('Manage All EVOX Announcements');
        expect(container.querySelector('select[name="department_id"]')).not.toBeNull();
    });
});

describe('Manage All EVOX Announcements - card contents', () => {

    test('every_announcement_in_the_page_gets_its_own_card_stamped_with_its_author_and_creation_time', async () => {
        const { getAllByTestId } = renderAdmin();
        await settle();

        expect(getAllByTestId('card').length).toBe(3);
        expect(cardTitles(getAllByTestId))
            .toEqual(['Server maintenance', 'Town hall', 'Sign the policy']);

        const cards = getAllByTestId('card').map((c) => c.textContent);
        expect(cards[0]).toMatch(/Created by: Ada Lovelace/);
        expect(cards[0]).toMatch(/Created at: 2026-07-01 09:00:00 UTC/);
        expect(cards[0]).toMatch(/Release\/Expiry Date:\s*2026-07-02 \/ 2026-07-30/);
        expect(cards[1]).toMatch(/Created by: Grace Hopper/);
        expect(cards[1]).toMatch(/Release\/Expiry Date:\s*2026-07-04 \/ 2026-07-10/);
    });

    // the badge is driven by the server-sent is_expired flag (line 146), not by comparing
    // expiry_date against the clock - so this assertion is date independent by construction
    test('an_announcement_the_server_flagged_is_expired_is_badged_expired_while_the_rest_are_badged_ongoing', async () => {
        const { getAllByTestId, getByText } = renderAdmin();
        await settle();

        expect(getByText('expired')).toBeInTheDocument();
        const ongoing = getAllByTestId('card').filter((c) => /ongoing/.test(c.textContent));
        expect(ongoing.length).toBe(2);
    });

    test('the_country_line_reads_global_for_an_all_country_post_the_country_name_for_a_scoped_post_and_undefined_when_no_country_was_set', async () => {
        const list = ANNOUNCEMENTS();
        list[2].set_country_all = 0;
        list[2].country_id = null;              // third arm: nothing set at all
        const { getAllByTestId } = renderAdmin({ list });
        await settle();

        const cards = getAllByTestId('card').map((c) => c.textContent);
        expect(cards[0]).toMatch(/Country: Global/);
        expect(cards[1]).toMatch(/Country: India/);
        expect(cards[2]).toMatch(/Country: UNDEFINED/);
    });

    test('a_country_id_that_is_not_in_the_settings_lookup_leaves_the_country_line_blank_instead_of_naming_it', async () => {
        const { getAllByTestId } = renderAdmin();   // announcement 103 has country_id 99
        await settle();

        // the lookup returns nothing, `[0]?.country_name` is undefined, and React renders
        // undefined as nothing at all - so the Country line is empty and runs straight into
        // the Departments line that follows it
        const third = getAllByTestId('card')[2].textContent;
        expect(third).toMatch(/Country:\s*Departments:\s*1 Departments Posted/);
    });

    test('the_departments_line_reads_all_for_a_company_wide_post_and_counts_the_departments_otherwise', async () => {
        const { getAllByTestId } = renderAdmin();
        await settle();

        const cards = getAllByTestId('card').map((c) => c.textContent);
        expect(cards[0]).toMatch(/Departments:\s*ALL/);
        expect(cards[1]).toMatch(/Departments:\s*2 Departments Posted/);
        expect(cards[2]).toMatch(/Departments:\s*1 Departments Posted/);
    });

    // FINDING AAL_STOCKURL - the fallback src at AdminAnnouncementsList.js:143 is the SAME
    // Unsplash URL written out twice, back to back, with nothing between them: the first copy
    // ends "...&q=80" and the second copy starts immediately after it. Every announcement with
    // no thumbnail therefore requests a malformed URL whose last query value is
    // "80https://images.unsplash.com/photo-...". The fix is to keep one copy.
    test('an_announcement_without_a_thumbnail_falls_back_to_a_stock_image_url_that_is_written_out_twice_FINDING_AAL_STOCKURL', async () => {
        const { getAllByTestId } = renderAdmin();
        await settle();

        const STOCK = 'https://images.unsplash.com/photo-1462396240927-52058a6a84ec'
            + '?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8'
            + '&auto=format&fit=crop&w=1073&q=80';

        const srcs = getAllByTestId('card-img').map((i) => i.getAttribute('src'));
        expect(srcs[0]).toBe('/uploads/maint.png');           // its own thumbnail wins
        expect(srcs[1]).toBe(STOCK + STOCK);                  // <- the defect, verbatim
        expect(srcs[2]).toBe(STOCK + STOCK);
        // when this is fixed the two lines above become expect(srcs[1]).toBe(STOCK)
    });

    test('every_card_offers_an_edit_link_into_the_department_announcement_form_for_that_record', async () => {
        const { container } = renderAdmin();
        await settle();

        const editLinks = hrefs(container)
            .filter((h) => h && h.indexOf('/x/department_announcement_form/') === 0);
        expect(editLinks).toEqual([
            '/x/department_announcement_form/101',
            '/x/department_announcement_form/102',
            '/x/department_announcement_form/103',
        ]);
    });

    test('a_link_announcement_opens_its_external_url_and_gains_a_protocol_when_it_was_saved_without_one_while_a_normal_post_opens_the_in_app_page', async () => {
        const { container } = renderAdmin();
        await settle();

        const all = hrefs(container);
        // announcement 101 is not a link announcement -> in-app page
        expect(all).toContain('/x/announcement_page/101');
        // 102 was saved without a protocol -> http:// is prepended
        expect(all).toContain('http://forms.example/townhall');
        // 103 already had https:// -> left alone
        expect(all).toContain('https://forms.example/policy');
        // and a link announcement never also renders the in-app page link
        expect(all).not.toContain('/x/announcement_page/102');
    });

    // FINDING AAL_COUNTRY - the card reads this.props.settings.countries.filter unguarded,
    // although ListFilter guards the very same value with an `!== undefined` check.
    test('a_country_scoped_announcement_takes_the_whole_page_down_when_the_country_settings_are_missing_FINDING_AAL_COUNTRY', async () => {
        const quiet = jest.spyOn(console, 'error').mockImplementation(() => {});
        try {
            // announcement 102 is scoped to a country, so the unguarded lookup runs
            expect(() => renderAdmin({ noCountries: true, list: [ANNOUNCEMENTS()[1]] }))
                .toThrow(/filter/);
        } finally {
            quiet.mockRestore();
        }
    });
});

describe('Manage All EVOX Announcements - filtering and sorting', () => {

    test('filtering_sends_only_the_fields_the_admin_actually_filled_in_and_always_names_the_admin_list_endpoint', async () => {
        const { getByText, container, actions } = renderAdmin();
        await settle();

        fireEvent.change(container.querySelector('select[name="department_id"]'),
            { target: { value: '3' } });
        // The title box is declared type="textfield" (ListFilter, line 305). `type` is an
        // enumerated attribute whose invalid-value default is "text", so every real browser
        // treats this as a plain text input; jsdom 11 does not apply that default, and React's
        // change plugin then refuses to track it. This line applies the normalisation the
        // browser would have done. It is a jsdom shim, NOT a workaround for an app defect.
        const titleBox = container.querySelector('input[name="announcement_title"]');
        titleBox.type = 'text';
        fireEvent.change(titleBox, { target: { name: 'announcement_title', value: 'town' } });
        await act(async () => { fireEvent.click(getByText(/Filter/)); });
        await settle();

        expect(actions.fetchDepartmentAnnouncementList).toHaveBeenCalledTimes(2);
        const sent = actions.fetchDepartmentAnnouncementList.mock.calls[1][0];
        expect(sent.department_id).toBe('3');
        expect(sent.announcement_title).toBe('town');
        expect(sent.url).toBe('admin/AnnouncementList');
        // untouched filters are stripped, not sent as empty strings
        expect(sent).not.toHaveProperty('country_id');
        expect(sent).not.toHaveProperty('team_id');
        expect(sent).not.toHaveProperty('employee');
        expect(sent).not.toHaveProperty('name');
    });

    test('pressing_filter_always_resets_the_paging_back_to_the_first_page', async () => {
        const { getByText, actions } = renderAdmin();
        await settle();

        await act(async () => { fireEvent.click(getByText(/Filter/)); });
        await settle();

        expect(actions.fetchDepartmentAnnouncementList.mock.calls[1][0].page).toBe(1);
    });

    // FINDING AAL_DUPKEY - `status` is declared twice in the same filter-state literal
    // (1 then ''); the empty string wins, so the intended default of 1 is never sent and
    // the blank value is then stripped by the submit handler.
    test('the_intended_default_status_of_one_never_reaches_the_server_because_the_key_is_declared_twice_FINDING_AAL_DUPKEY', async () => {
        const { getByText, ref, actions } = renderAdmin();
        await settle();

        expect(ref.current.state.filters.status).toBe('');
        await act(async () => { fireEvent.click(getByText(/Filter/)); });
        await settle();

        expect(actions.fetchDepartmentAnnouncementList.mock.calls[1][0])
            .not.toHaveProperty('status');
    });

    test('choosing_expired_in_the_status_dropdown_sends_that_status_through', async () => {
        const { getByText, container, actions } = renderAdmin();
        await settle();

        fireEvent.change(container.querySelector('select[name="status"]'),
            { target: { value: 'expired' } });
        await act(async () => { fireEvent.click(getByText(/Filter/)); });
        await settle();

        expect(actions.fetchDepartmentAnnouncementList.mock.calls[1][0].status).toBe('expired');
    });

    test('changing_the_sort_order_refetches_the_list_straight_away_without_pressing_filter', async () => {
        const { container, actions } = renderAdmin();
        await settle();

        fireEvent.change(container.querySelector('select[name="order_by"]'),
            { target: { value: 'announcement_title:asc' } });
        await settle();

        expect(actions.fetchDepartmentAnnouncementList).toHaveBeenCalledTimes(2);
        expect(actions.fetchDepartmentAnnouncementList.mock.calls[1][0].order_by)
            .toBe('announcement_title:asc');
        // sorting must not smuggle a page number in - only Filter resets paging
        expect(actions.fetchDepartmentAnnouncementList.mock.calls[1][0])
            .not.toHaveProperty('page');
    });

    test('the_department_and_country_dropdowns_are_built_from_the_lookup_data_and_a_missing_country_lookup_leaves_the_dropdown_with_only_its_default_choice', async () => {
        const withLookups = renderAdmin();
        await settle();
        expect(Array.from(withLookups.container.querySelectorAll('select[name="department_id"] option'))
            .map((o) => o.label))
            .toEqual(['Select Department(Default - ALL)', 'Engineering', 'Human Resources']);
        expect(Array.from(withLookups.container.querySelectorAll('select[name="country_id"] option'))
            .map((o) => o.label))
            .toEqual(['Select Country(Default - Global)', 'Philippines', 'India']);
        withLookups.unmount();

        // countries missing entirely - only the announcements that need no country lookup
        const noCountries = renderAdmin({
            noCountries: true,
            list: [ANNOUNCEMENTS()[0]],   // set_country_all = 1, no lookup performed
        });
        await settle();
        expect(Array.from(noCountries.container.querySelectorAll('select[name="country_id"] option'))
            .map((o) => o.label))
            .toEqual(['Select Country(Default - Global)']);
    });

    test('picking_an_employee_point_of_view_locks_the_department_and_country_filters_and_clearing_it_unlocks_them_again', async () => {
        const { getByTestId, container, ref } = renderAdmin();
        await settle();

        const dept    = () => container.querySelector('select[name="department_id"]');
        const country = () => container.querySelector('select[name="country_id"]');
        const status  = () => container.querySelector('select[name="status"]');

        expect(dept().disabled).toBe(false);
        expect(country().disabled).toBe(false);

        await act(async () => { fireEvent.click(getByTestId('rs-pick-employee')); });
        expect(ref.current.state.disable_others).toBe(true);
        expect(dept().disabled).toBe(true);
        expect(country().disabled).toBe(true);
        expect(status().disabled).toBe(false);   // status stays usable

        await act(async () => { fireEvent.click(getByTestId('rs-clear-employee')); });
        expect(ref.current.state.disable_others).toBe(false);
        expect(dept().disabled).toBe(false);
        expect(country().disabled).toBe(false);
    });

    test('the_chosen_employee_point_of_view_is_sent_as_that_employees_id_and_clearing_it_sends_no_employee_at_all', async () => {
        const { getByTestId, getByText, actions } = renderAdmin();
        await settle();

        expect(getByTestId('rs-options-employee').textContent)
            .toBe('Ada Lovelace:11|Grace Hopper:12');

        await act(async () => { fireEvent.click(getByTestId('rs-pick-employee')); });
        await act(async () => { fireEvent.click(getByText(/Filter/)); });
        await settle();
        expect(actions.fetchDepartmentAnnouncementList.mock.calls[1][0].employee).toBe(11);

        await act(async () => { fireEvent.click(getByTestId('rs-clear-employee')); });
        await act(async () => { fireEvent.click(getByText(/Filter/)); });
        await settle();
        expect(actions.fetchDepartmentAnnouncementList.mock.calls[2][0])
            .not.toHaveProperty('employee');
    });

    // FINDING AAL_DUPHAND - onSubmitHandler is declared twice on the class (lines 53 and 59).
    // The first, (props, index) version is overwritten by the second, (values) version, so only
    // the one-argument fetch version can ever run. This is dead source, not a broken screen:
    // the shadowed body is entirely commented out (lines 54-55), so deleting the first
    // declaration is behaviour preserving. The arity check below is what actually pins which
    // declaration survived - it fails if the order of the two is ever swapped.
    test('the_first_of_the_two_onSubmitHandler_declarations_is_dead_and_only_the_fetch_version_survives_FINDING_AAL_DUPHAND', async () => {
        const { getByText, ref, actions } = renderAdmin();
        await settle();

        // (props, index) has arity 2, (values) has arity 1
        expect(ref.current.onSubmitHandler.length).toBe(1);

        await act(async () => { fireEvent.click(getByText(/Filter/)); });
        await settle();

        expect(actions.fetchDepartmentAnnouncementList).toHaveBeenCalledTimes(2);
        expect(actions.fetchDepartmentAnnouncementList.mock.calls[1].length).toBe(1);
    });
});

describe('Manage All EVOX Announcements - delete guard', () => {

    // AdminAnnouncementsList.js:213 renders the delete control as <Button variant="danger">,
    // which react-bootstrap turns into class "btn btn-danger" - the same class the mock emits.
    const deleteButtons = (container) =>
        Array.from(container.querySelectorAll('button.btn-danger'));

    test('confirming_the_delete_removes_that_announcement_from_the_grid_and_asks_the_server_to_delete_that_id', async () => {
        const { container, getAllByTestId, actions } = renderAdmin();
        await settle();

        expect(deleteButtons(container).length).toBe(3);
        await act(async () => { fireEvent.click(deleteButtons(container)[1]); });

        expect(actions.deleteDepartmentAnnouncement).toHaveBeenCalledTimes(1);
        expect(actions.deleteDepartmentAnnouncement).toHaveBeenCalledWith(102);
        expect(cardTitles(getAllByTestId)).toEqual(['Server maintenance', 'Sign the policy']);
    });

    test('declining_the_delete_keeps_the_announcement_on_screen_and_sends_nothing_to_the_server', async () => {
        confirmSpy.mockImplementation(() => false);
        const { container, getAllByTestId, actions, ref } = renderAdmin();
        await settle();

        await act(async () => { fireEvent.click(deleteButtons(container)[1]); });

        expect(actions.deleteDepartmentAnnouncement).not.toHaveBeenCalled();
        expect(cardTitles(getAllByTestId))
            .toEqual(['Server maintenance', 'Town hall', 'Sign the policy']);
        expect(ref.current.state.modal_bool).toBe(false);
    });

    // FINDING AAL_COPY - an announcement delete asks about removing a DEPARTMENT.
    test('the_delete_confirmation_asks_about_removing_a_department_instead_of_an_announcement_FINDING_AAL_COPY', async () => {
        const { container } = renderAdmin();
        await settle();

        await act(async () => { fireEvent.click(deleteButtons(container)[0]); });

        expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to Remove this Department ?');
    });

    // FINDING AAL_SPLICE - the handler splices the redux-owned array in place and the grid
    // only repaints because the unrelated toggleModal() setState happens to follow it,
    // which leaves modal_bool stuck true with no modal ever rendered.
    test('deleting_mutates_the_stores_own_array_in_place_and_leaves_the_modal_flag_stuck_open_FINDING_AAL_SPLICE', async () => {
        const { container, ref, slice } = renderAdmin();
        await settle();
        const storeArray = slice.depAnnouncementlist.data;

        await act(async () => { fireEvent.click(deleteButtons(container)[0]); });

        // same array object, one shorter - the redux state was edited from the component
        expect(slice.depAnnouncementlist.data).toBe(storeArray);
        expect(storeArray.length).toBe(2);
        expect(storeArray.map((a) => a.id)).toEqual([102, 103]);
        // the repaint trigger: a modal flag that no modal on this screen consumes
        expect(ref.current.state.modal_bool).toBe(true);
    });

    test('deleting_the_last_remaining_announcement_empties_the_grid_without_error', async () => {
        const { container, queryAllByTestId, actions } = renderAdmin({ list: [ANNOUNCEMENTS()[0]] });
        await settle();

        await act(async () => { fireEvent.click(deleteButtons(container)[0]); });

        expect(actions.deleteDepartmentAnnouncement).toHaveBeenCalledWith(101);
        expect(queryAllByTestId('card').length).toBe(0);
    });

    test('deleting_two_announcements_in_a_row_removes_exactly_those_two_records', async () => {
        const { container, getAllByTestId, actions } = renderAdmin();
        await settle();

        await act(async () => { fireEvent.click(deleteButtons(container)[2]); });
        await act(async () => { fireEvent.click(deleteButtons(container)[0]); });

        expect(actions.deleteDepartmentAnnouncement.mock.calls.map((c) => c[0])).toEqual([103, 101]);
        expect(cardTitles(getAllByTestId)).toEqual(['Town hall']);
    });
});
