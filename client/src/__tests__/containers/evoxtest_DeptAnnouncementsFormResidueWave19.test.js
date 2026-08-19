/**
 * evoxtest_DeptAnnouncementsFormResidueWave19.test.js
 *
 * SOURCE FILE UNDER TEST
 *   src/container/DepartmentAnnouncements/DepartmentAnnouncementsForm/DepartmentAnnouncementsForm.js
 *
 * MENU PATH
 *   Announcements -> My Department Announcements -> Create / Edit
 *   (route department_announcement_form + ':id?')
 *
 * CURRENT MEASURED COVERAGE (full-suite run, 18 Aug, before this file)
 *   97.63% stmts / 94.17% branch / 100% fn - 14 branch arms and 4 statements left.
 *
 * ARMS CLOSED HERE
 *   84   the two ways a stored joyride marker still lets the tour replay
 *   212 / 213 / 218 (+ statements 213-214) the update-with-a-new-thumbnail path, driven
 *        through the real file input rather than by writing state
 *   384  an announcement that arrives with departments already targeted
 *   410  the department lookup not having landed yet
 *
 * ARMS DECLARED UNREACHABLE (proven by invariant, not forced)
 *   133-135  `case "log_date"` - log_date was commented out of initialValue (line 375) and
 *            nothing calls setFieldValue('log_date'), so the key never exists in values.
 *   143 / 147 / 152  the `!= null && != undefined` fallbacks inside the set_all /
 *            set_exclude / set_selected cases - line 131 has already excluded null and
 *            undefined before the switch is entered.
 *   213 (false arm)  a held thumbnail always carries inputFileWasUpdated === true in
 *            update mode; nothing clears that flag while a thumbnail is held.
 *   653  the thumbnail validation slot - validationSchema has no thumbnail rule.
 *
 * FINDINGS
 *   None new. The register already carries DAF-CONTENT-1, DAF-ONLINK-1, DAF-DATEWIN-1,
 *   DAF-RADIO-1 and DAF-DEPT-1 for this screen; none is re-asserted here.
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

jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader:  ({ children }) => <div>{children}</div>,
    Content:          ({ children }) => <div>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
    Row:              ({ children }) => <div>{children}</div>,
    Col:              ({ children }) => <div>{children}</div>,
}));
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/Template/BackButton', () => () => <div />);
jest.mock('../../components/RequestComponent/RequestButtons/RequestSubtitle', () => () => <div />);
jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading" />);
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate: ({ name }) => <input type="date" name={name} />,
    InputTime: ({ name }) => <input type="time" name={name} />,
}));
jest.mock('../../services/DateFormatter', () => ({ convert_date: jest.fn((d) => d) }));
// Exposes the value/options the container hands the picker so the department-scoping
// arms can be asserted without depending on the real widget's internals.
jest.mock('react-multi-select-component', () => (props) => (
    <div data-testid="multiselect"
        data-options={JSON.stringify(props.options)}
        data-value={JSON.stringify(props.value)} />
));
jest.mock('@tinymce/tinymce-react', () => ({
    Editor: (props) => (
        <textarea data-testid="tinymce-editor" value={props.value || ''}
            onChange={(e) => props.onEditorChange && props.onEditorChange(e.target.value)} />
    ),
}));
jest.mock('react-joyride', () => {
    const Joyride = () => null;
    return {
        __esModule: true, default: Joyride,
        ACTIONS: { CLOSE: 'close' },
        EVENTS: { STEP_AFTER: 'step:after', TARGET_NOT_FOUND: 'error:target_not_found' },
        STATUS: { FINISHED: 'finished', SKIPPED: 'skipped' },
    };
});
jest.mock('../../services/Authenticator', () => ({
    scanLevel: jest.fn(() => true), scanFeature: jest.fn(() => true),
}));
jest.mock('../../store/actions/announcement/departmentAnnouncementActions', () => ({
    createDepartmentAnnouncement: jest.fn(), fetchDepartmentAnnouncementStrict: jest.fn(),
    updateDepartmentAnnouncement: jest.fn(), clearDepartmentAnnouncementInstance: jest.fn(),
}));
jest.mock('../../store/actions/lookup/lookupListActions', () => ({ fetchDepartmentList: jest.fn() }));
jest.mock('../../store/actions/redirectActions', () => ({ setRedirect: jest.fn() }));

const DepartmentAnnouncementsForm =
    require('../../container/DepartmentAnnouncements/DepartmentAnnouncementsForm/DepartmentAnnouncementsForm').default;

// jsdom 11 ships no object-URL implementation; the thumbnail preview needs one.
if (!global.URL.createObjectURL) global.URL.createObjectURL = () => 'blob:preview';

const makeActions = () => ({
    createDepartmentAnnouncement: jest.fn(),
    fetchDepartmentAnnouncementStrict: jest.fn(),
    updateDepartmentAnnouncement: jest.fn(),
    clearDepartmentAnnouncementInstance: jest.fn(),
    fetchDepartmentList: jest.fn(),
    dispatch: jest.fn(),
});

const baseProps = () => ({
    user: { id: 1, departments_handled: [] },
    settings: { countries: [{ country_id: 1, country_name: 'Philippines' }] },
    department: [{ id: 5, department_name: 'Engineering' }, { id: 6, department_name: 'Finance' }],
    instance: {},
    isInstanceLoaded: false,
    params: {},
    location: {},
    history: { push: jest.fn(), goBack: jest.fn() },
});

// A stored announcement that passes the schema untouched, so a submit reaches the handler.
const STORED = {
    id: 7,
    title: 'Quarterly town hall',
    headline: 'Everyone welcome',
    release_date: '2026-08-01',
    expiry_date: '2026-08-31',
    set_all: 1,
    set_exclude: 0,
    on_link: 0,
};

function renderForm(over = {}) {
    const actions = makeActions();
    const ref = React.createRef();
    const view = render(
        <MemoryRouter>
            <DepartmentAnnouncementsForm ref={ref} {...baseProps()} {...actions} {...over} />
        </MemoryRouter>
    );
    return { ...view, ref, actions };
}

const renderUpdate = (over = {}) => renderForm({
    params: { id: '7' }, isInstanceLoaded: true, instance: STORED, ...over,
});

const submitForm = async (container) => {
    await act(async () => { fireEvent.submit(container.querySelector('form')); });
};

let logSpy;
beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => logSpy.mockRestore());

/* ============================================================ the guided tour */

describe('Announcements form - when the guided tour replays', () => {

    test('a tour marker whose six-month window has expired lets the tour run again', () => {
        localStorage.setItem('joyride-local-announcement-form',
            JSON.stringify({ local_expiration: '2020-01-01', step: 5 }));

        expect(renderForm().ref.current.state.run).toBe(true);
    });

    test('a marker left behind part-way through the tour lets it run again even inside the window', () => {
        localStorage.setItem('joyride-local-announcement-form',
            JSON.stringify({ local_expiration: '2099-01-01', step: 2 }));

        expect(renderForm().ref.current.state.run).toBe(true);
    });

    test('only an unexpired marker recorded on the final step suppresses the tour', () => {
        localStorage.setItem('joyride-local-announcement-form',
            JSON.stringify({ local_expiration: '2099-01-01', step: 5 }));

        expect(renderForm().ref.current.state.run).toBe(false);
    });
});

/* ================================================= department / country scope */

describe('Announcements form - the department picker', () => {

    test('a stored announcement already targeted at departments opens with those departments selected', () => {
        const { getAllByTestId } = renderUpdate({
            instance: { ...STORED, selectedDepartments: [{ label: 'Engineering', value: 5 }] },
        });

        const picker = getAllByTestId('multiselect')[0];
        expect(JSON.parse(picker.getAttribute('data-value')))
            .toEqual([{ label: 'Engineering', value: 5 }]);
    });

    test('a new announcement opens with nothing selected and every handled department offered', () => {
        const { getAllByTestId } = renderForm();

        const picker = getAllByTestId('multiselect')[0];
        expect(JSON.parse(picker.getAttribute('data-value'))).toBeNull();
        expect(JSON.parse(picker.getAttribute('data-options'))).toEqual([
            { label: 'Engineering', value: 5 },
            { label: 'Finance', value: 6 },
        ]);
    });

    test('the picker offers nothing while the department lookup has not landed yet', () => {
        const { getAllByTestId } = renderForm({ department: undefined });

        expect(JSON.parse(getAllByTestId('multiselect')[0].getAttribute('data-options'))).toEqual([]);
    });

    test('the picker offers nothing when the user handles no department at all', () => {
        const { getAllByTestId } = renderForm({ department: [] });

        expect(JSON.parse(getAllByTestId('multiselect')[0].getAttribute('data-options'))).toEqual([]);
    });
});

/* ============================================================ the thumbnail */

describe('Announcements form - replacing the thumbnail on an existing announcement', () => {

    const pickFile = (container, name) => {
        const file = new File(['image-bytes'], name, { type: 'image/png' });
        act(() => {
            fireEvent.change(container.querySelector('#img-to-upload'), { target: { files: [file] } });
        });
        return file;
    };

    test('uploading a replacement image on an existing announcement posts the new file', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { container, ref, actions } = renderUpdate();

        pickFile(container, 'new-banner.png');
        expect(ref.current.state.inputFileWasUpdated).toBe(true);
        expect(ref.current.state.inputFileWasDeleted).toBe(false);

        await submitForm(container);

        expect(actions.updateDepartmentAnnouncement).toHaveBeenCalledTimes(1);
        const [id, fd] = actions.updateDepartmentAnnouncement.mock.calls[0];
        expect(id).toBe(7);
        expect(fd.get('thumbnail')).not.toBeNull();
        expect(fd.get('thumbnail').name).toBe('new-banner.png');
        expect(fd.get('inputFileWasDeleted')).toBe('false');
        // the form resets its staged file so a second save cannot re-post it
        expect(ref.current.state.thumbnail).toBeNull();
        expect(ref.current.state.imgPrevInputFile).toBe('/thumbnail/defthumb.jpg');
        confirmSpy.mockRestore();
    });

    test('creating a new announcement is the same upload path but posts through create', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { container, ref, actions } = renderForm();

        // In create mode the two update-tracking flags are deliberately left alone.
        pickFile(container, 'launch.png');
        expect(ref.current.state.inputFileWasUpdated).toBe(false);
        expect(ref.current.state.thumbnail.name).toBe('launch.png');

        // Fill the two required dates so the schema lets the submit through.
        act(() => {
            ref.current.setState({ content: '<p>Body</p>' });
        });
        ref.current.onSubmitHandler({
            method: 'store', title: 'Launch day',
            release_date: new Date(2026, 7, 1), expiry_date: new Date(2026, 7, 31),
            set_all: true, set_exclude: false, set_selected: false, set_country_all: true,
        });

        const fd = actions.createDepartmentAnnouncement.mock.calls[0][0];
        expect(fd.get('thumbnail').name).toBe('launch.png');
        confirmSpy.mockRestore();
    });

    // UNREACHABLE 213 (false arm): the only writer of state.thumbnail that sets a file is
    // the upload handler at 620-629, and in update mode it sets inputFileWasUpdated true in
    // the same breath. Nothing anywhere clears that flag, so "a thumbnail is held but was
    // not updated" cannot be produced. Proven across upload -> remove -> upload again.
    test('a held thumbnail always carries the was-updated flag on an existing announcement', () => {
        const { container, ref, getByText } = renderUpdate();

        pickFile(container, 'first.png');
        expect(ref.current.state.thumbnail).not.toBeNull();
        expect(ref.current.state.inputFileWasUpdated).toBe(true);

        act(() => { fireEvent.click(getByText('Remove').closest('div.btn')); });
        expect(ref.current.state.thumbnail).toBeNull();          // flag only matters when held
        expect(ref.current.state.inputFileWasDeleted).toBe(true);

        pickFile(container, 'second.png');
        expect(ref.current.state.thumbnail.name).toBe('second.png');
        expect(ref.current.state.inputFileWasUpdated).toBe(true);
        expect(ref.current.state.inputFileWasDeleted).toBe(false);
    });

    // UNREACHABLE 653: validationSchema declares title, headline, release_date,
    // expiry_date and link only. errors.thumbnail can never be set, so the feedback slot
    // beneath the upload control is permanently empty while the title slot does fill.
    test('the upload control never shows a validation message because the schema does not validate it', async () => {
        const { container } = renderForm();
        const titleBox = container.querySelector('input[name="title"]');

        fireEvent.change(titleBox, { target: { value: 'x'.repeat(101) } });
        await submitForm(container);

        const feedbackIn = (el) => el.closest('.input-group').querySelector('.invalid-feedback');
        expect(feedbackIn(titleBox).textContent).toContain('Max Title Length reached');
        expect(feedbackIn(container.querySelector('#img-to-upload')).textContent.trim()).toBe('');
    });
});

/* ================================================= the payload the form builds */

describe('Announcements form - the request payload builder', () => {

    // UNREACHABLE 133-135: log_date is commented out of initialValue (line 375) and no
    // setFieldValue ever introduces it, so `case "log_date"` cannot be entered. The hidden
    // input that would carry it renders empty, and the key never reaches the request.
    test('no log date is ever collected or posted, so the form has no log-date field to format', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { container, actions } = renderUpdate();

        expect(container.querySelector('input[name="date"]')).toHaveValue('');

        await submitForm(container);

        const fd = actions.updateDepartmentAnnouncement.mock.calls[0][1];
        expect(fd.get('log_date')).toBeNull();
        expect(fd.get('release_date')).toBe('2026-08-01');
        expect(fd.get('expiry_date')).toBe('2026-08-31');
        confirmSpy.mockRestore();
    });

    // UNREACHABLE 143 / 147 / 152: each audience flag's `!= null && != undefined` fallback
    // sits INSIDE its switch case, and line 131 refuses to enter the switch for a key whose
    // value is null or undefined. A missing flag is therefore dropped outright rather than
    // defaulted to false - which also means set_all never reaches the server as "0" here.
    test('an audience flag the form never set is dropped from the payload rather than defaulted to zero', () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { ref, actions } = renderForm();

        ref.current.onSubmitHandler({
            method: 'store', title: 'Town hall',
            release_date: new Date(2026, 7, 1), expiry_date: new Date(2026, 7, 31),
            set_all: null, set_exclude: undefined, set_selected: null,
        });

        const fd = actions.createDepartmentAnnouncement.mock.calls[0][0];
        expect(fd.get('set_all')).toBeNull();
        expect(fd.get('set_exclude')).toBeNull();
        expect(fd.get('set_selected')).toBeNull();
        // and because set_all is neither false, 0 nor "0", the department scope is skipped
        expect(fd.get('selectedDepartments')).toBeNull();
        confirmSpy.mockRestore();
    });

    test('an audience flag the form did set is still normalised to one or zero', () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { ref, actions } = renderForm();

        ref.current.onSubmitHandler({
            method: 'store', title: 'Town hall',
            release_date: new Date(2026, 7, 1), expiry_date: new Date(2026, 7, 31),
            set_all: false, set_exclude: false, set_selected: true, set_country_all: false,
        });

        const fd = actions.createDepartmentAnnouncement.mock.calls[0][0];
        expect(fd.get('set_all')).toBe('0');
        expect(fd.get('set_selected')).toBe('1');
        expect(fd.get('set_country_all')).toBe('0');
        expect(fd.get('selectedDepartments')).toBe('');
        confirmSpy.mockRestore();
    });
});
