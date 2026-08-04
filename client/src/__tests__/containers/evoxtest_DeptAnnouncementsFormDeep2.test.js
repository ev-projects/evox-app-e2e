/**
 * evoxtest_DeptAnnouncementsFormDeep2.test.js
 * Wave-3 coverage for container/DepartmentAnnouncements/DepartmentAnnouncementsForm/
 * DepartmentAnnouncementsForm.js (29 Jul: 119 unc / 29.2%; 929 lines).
 * Arms: componentWillMount fetch/clear/strict-fetch, joyride pre_run localStorage gate,
 * create vs update render gating (isInstanceLoaded), onSubmitHandler store/update incl.
 * confirm-declined, date formatting, set_all/set_exclude/set_selected flags, thumbnail
 * arms, originPath arm; content/link tab toggle, editor change, dept/country setters,
 * preview show/hide, joyride callback (finished/close/step-5/skipped persistence).
 * ADDITIVE ONLY. Menu: Announcements → Create/Edit (route: department_announcement_form+':id?').
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
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
jest.mock('react-multi-select-component', () => (props) => (
    <div data-testid="multiselect">{props.labelledBy}</div>
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
        __esModule: true,
        default: Joyride,
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

function makeActions() {
    return {
        createDepartmentAnnouncement: jest.fn(),
        fetchDepartmentAnnouncementStrict: jest.fn(),
        updateDepartmentAnnouncement: jest.fn(),
        clearDepartmentAnnouncementInstance: jest.fn(),
        fetchDepartmentList: jest.fn(),
        dispatch: jest.fn(),
    };
}

const baseProps = {
    user: { id: 1, departments_handled: [] },
    settings: { countries: [{ country_id: 1, country_name: 'Philippines' }] },
    department: [{ id: 5, department_name: 'Engineering' }],
    instance: {},
    isInstanceLoaded: false,
    params: {},
    location: {},
    history: { push: jest.fn(), goBack: jest.fn() },
};

function renderForm(props = {}, actions = makeActions()) {
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter>
            <DepartmentAnnouncementsForm ref={ref} {...baseProps} {...actions} {...props} />
        </MemoryRouter>
    );
    return { ...utils, ref, actions };
}

beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
});

describe('DeptAnnouncementsForm — mount and mode gating', () => {
    test('create mode fetches departments, clears the instance and renders the form', () => {
        const { actions, getByText } = renderForm();
        expect(actions.fetchDepartmentList).toHaveBeenCalled();
        expect(actions.clearDepartmentAnnouncementInstance).toHaveBeenCalled();
        expect(actions.fetchDepartmentAnnouncementStrict).not.toHaveBeenCalled();
        getByText('Title:');
    });

    test('update mode additionally fetches the strict announcement; render waits for isInstanceLoaded', () => {
        const a = renderForm({ params: { id: '7' }, isInstanceLoaded: false });
        expect(a.actions.fetchDepartmentAnnouncementStrict).toHaveBeenCalledWith('7');
        expect(a.queryByText('Title:')).toBeNull(); // gated until instance loads

        const b = renderForm({
            params: { id: '7' }, isInstanceLoaded: true,
            instance: { id: 7, title: 'Old title', release_date: '2026-07-01', expiry_date: '2026-08-01', set_all: 1, set_exclude: 0, on_link: 0 },
        });
        b.getByText('Title:');
    });

    test('joyride pre_run: unexpired completed tour in localStorage disables the run', () => {
        const future = new Date();
        future.setMonth(future.getMonth() + 3);
        localStorage.setItem('joyride-local-announcement-form',
            JSON.stringify({ local_expiration: future.toISOString().substring(0, 10), step: 5 }));
        const withStore = renderForm();
        expect(withStore.ref.current.state.run).toBe(false);

        localStorage.clear();
        const fresh = renderForm();
        expect(fresh.ref.current.state.run).toBe(true);
    });
});

describe('DeptAnnouncementsForm — onSubmitHandler store/update arms', () => {
    const storeValues = {
        method: 'store', action: null, id: null,
        title: 'Town hall', headline: 'HL',
        release_date: new Date(2026, 7, 1), expiry_date: new Date(2026, 7, 15),
        set_all: true, set_exclude: false, set_selected: false,
        set_country_all: true, link: null, category: null, selectedDepartments: [],
    };

    test('store + confirm builds the FormData (dates formatted, flags 1/0) and creates', () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { ref, actions } = renderForm();
        ref.current.setState({ content: '<p>Body</p>', thumbnail: new File(['x'], 't.png') });

        ref.current.onSubmitHandler({ ...storeValues });

        expect(actions.createDepartmentAnnouncement).toHaveBeenCalledTimes(1);
        const fd = actions.createDepartmentAnnouncement.mock.calls[0][0];
        expect(fd.get('release_date')).toBe('2026-08-01');
        expect(fd.get('expiry_date')).toBe('2026-08-15');
        expect(fd.get('set_all')).toBe('1');
        expect(fd.get('set_exclude')).toBe('0');
        expect(fd.get('category')).toBe('Department');
        expect(fd.get('content')).toBe('<p>Body</p>');
        expect(fd.get('thumbnail')).not.toBeNull();
        expect(ref.current.state.thumbnail).toBeNull(); // reset arm
        confirmSpy.mockRestore();
    });

    test('store + confirm declined dispatches nothing', () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
        const { ref, actions } = renderForm();
        ref.current.onSubmitHandler({ ...storeValues });
        expect(actions.createDepartmentAnnouncement).not.toHaveBeenCalled();
        confirmSpy.mockRestore();
    });

    test('store with set_all=false includes the selected departments', () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { ref, actions } = renderForm();
        ref.current.setState({ selectedDepartments: [{ label: 'Engineering', value: 5 }] });
        ref.current.onSubmitHandler({ ...storeValues, set_all: false, set_selected: true });

        const fd = actions.createDepartmentAnnouncement.mock.calls[0][0];
        expect(fd.get('set_all')).toBe('0');
        expect(fd.get('set_selected')).toBe('1');
        expect(fd.get('selectedDepartments')).toBe('5');
        confirmSpy.mockRestore();
    });

    test('update + confirm PUTs via updateDepartmentAnnouncement with originPath and deleted-thumbnail arms', () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { ref, actions } = renderForm({
            params: { id: '7' }, isInstanceLoaded: true,
            instance: { id: 7, title: 'Old', set_all: 1, set_exclude: 0 },
            location: { originPath: 'AdminAnnouncementList' },
        });
        ref.current.setState({ thumbnail: null, inputFileWasDeleted: true });

        ref.current.onSubmitHandler({ ...storeValues, method: 'update', id: 7 });

        expect(actions.updateDepartmentAnnouncement).toHaveBeenCalledTimes(1);
        const [id, fd] = actions.updateDepartmentAnnouncement.mock.calls[0];
        expect(id).toBe(7);
        expect(fd.get('previousPath')).toBe('AdminAnnouncementList');
        expect(fd.get('inputFileWasDeleted')).toBe('true');
        confirmSpy.mockRestore();
    });
});

describe('DeptAnnouncementsForm — helpers and joyride callback', () => {
    test('editor change, link/content toggle, dept/country setters and preview show/hide', () => {
        const { ref } = renderForm();

        ref.current.handleEditorChange('<p>new</p>');
        expect(ref.current.state.content).toBe('<p>new</p>');

        ref.current.handleOnLInk('by-link');
        expect(ref.current.state.on_link).toBe(true);
        ref.current.handleOnLInk('by-content');
        expect(ref.current.state.on_link).toBe(false);

        ref.current.setSelectedDepartments([{ label: 'Eng', value: 5 }]);
        expect(ref.current.state.selectedDepartments).toEqual([{ label: 'Eng', value: 5 }]);
        ref.current.setSelectedCountry([{ label: 'PH', value: 1 }]);
        expect(ref.current.state.selectedCountries).toEqual([{ label: 'PH', value: 1 }]);

        ref.current.handleOnShow({ title: 'Preview me' });
        expect(ref.current.state.previewSample).toBe(true);
        expect(ref.current.state.previewSampleValues).toEqual({ title: 'Preview me' });
        ref.current.handleOnhide();
        expect(ref.current.state.previewSample).toBe(false);
    });

    test('joyride finished/close stop the tour; step 5 and skipped persist to localStorage', () => {
        const { ref, actions } = renderForm();

        ref.current.handleJoyrideCallback({ action: 'next', index: 2, status: 'finished', type: 'tour:end' });
        expect(ref.current.state.run).toBe(false);
        expect(actions.dispatch).toHaveBeenCalledWith({ type: 'WORK_TOUR', worktour: false });

        ref.current.handleJoyrideCallback({ action: 'close', index: 1, status: 'running', type: 'step:after' });
        expect(actions.dispatch).toHaveBeenCalledTimes(2);

        ref.current.handleJoyrideCallback({ action: 'next', index: 5, status: 'running', type: 'step:after' });
        const stored = JSON.parse(localStorage.getItem('joyride-local-announcement-form'));
        expect(stored.step).toBe(5);

        localStorage.clear();
        ref.current.handleJoyrideCallback({ action: 'skip', index: 2, status: 'skipped', type: 'tour:end' });
        const skipped = JSON.parse(localStorage.getItem('joyride-local-announcement-form'));
        expect(skipped.step).toBe(5); // skipped also completes the tour persistently
    });
});
