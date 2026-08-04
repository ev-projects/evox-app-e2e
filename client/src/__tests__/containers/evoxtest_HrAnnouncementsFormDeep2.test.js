/**
 * evoxtest_HrAnnouncementsFormDeep2.test.js
 * Wave-5 coverage for container/Hr/HrAnnouncementsForm/HrAnnouncementsForm.js
 * (fresh: 50 unc / 28.6%). Simpler sibling of the department announcements form:
 * category is hardcoded 'HR'. Arms: mount clear + strict-fetch with id, editor change,
 * store/update submit incl. date formatting, thumbnail set/skip (inputFileWasUpdated),
 * confirm declined, create vs update render gating. Driven via instance ref.
 * ADDITIVE ONLY. Menu: HR → Post Announcements (route: post_hr_announcements+':id?').
 */

import React from 'react';
import { render } from '@testing-library/react';
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
jest.mock('../../components/RequestComponent/RequestButtons/RequestButtons', () => () => <div />);
jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading" />);
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate: ({ name }) => <input type="date" name={name} />,
    InputTime: ({ name }) => <input type="time" name={name} />,
}));
jest.mock('../../services/DateFormatter', () => ({
    convert_date: jest.fn((d) => d), add_day_to_datetime: jest.fn((d) => d),
    get_specific_datetime: jest.fn(() => new Date(2026, 6, 20, 1, 0, 59)),
}));
jest.mock('@tinymce/tinymce-react', () => ({
    Editor: (props) => (
        <textarea data-testid="tinymce-editor" value={props.value || ''}
            onChange={(e) => props.onEditorChange && props.onEditorChange(e.target.value)} />
    ),
}));
jest.mock('../../services/Authenticator', () => ({
    scanLevel: jest.fn(() => true), scanFeature: jest.fn(() => true),
}));
jest.mock('../../store/actions/announcement/hrAnnouncementActions', () => ({
    createHrAnnouncement: jest.fn(), updateHrAnnouncement: jest.fn(),
    fetchHrAnnouncement: jest.fn(), fetchHrAnnouncementStrict: jest.fn(),
    fetchHrAnnouncementList: jest.fn(), fetchDashboardAnnouncementList: jest.fn(),
    fetchHrHandleAnnouncementList: jest.fn(), deleteHrAnnouncement: jest.fn(),
    clearHrAnnouncementInstance: jest.fn(),
}));
jest.mock('../../store/actions/redirectActions', () => ({ setRedirect: jest.fn() }));

const HrAnnouncementsForm = require('../../container/Hr/HrAnnouncementsForm/HrAnnouncementsForm').default;

function makeActions() {
    return {
        createHrAnnouncement: jest.fn(), updateHrAnnouncement: jest.fn(),
        fetchHrAnnouncementStrict: jest.fn(), clearHrAnnouncementInstance: jest.fn(),
        setRedirect: jest.fn(), dispatch: jest.fn(),
    };
}

const baseProps = {
    user: { id: 1 },
    instance: {},
    isInstanceLoaded: false,
    params: {},
    settings: {},
};

function renderHAF(props = {}, actions = makeActions()) {
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter>
            <HrAnnouncementsForm ref={ref} {...baseProps} {...actions} {...props} />
        </MemoryRouter>
    );
    return { ...utils, ref, actions };
}

const storeValues = () => ({
    method: 'store', title: 'HR townhall', headline: 'HL',
    release_date: new Date(2026, 7, 1), expiry_date: new Date(2026, 7, 15),
});

beforeEach(() => jest.clearAllMocks());

describe('HrAnnouncementsForm', () => {
    test('mount clears the instance; fetches strict only with an id', () => {
        const a = renderHAF();
        expect(a.actions.clearHrAnnouncementInstance).toHaveBeenCalledTimes(1);
        expect(a.actions.fetchHrAnnouncementStrict).not.toHaveBeenCalled();

        const b = renderHAF({ params: { id: '7' } });
        expect(b.actions.fetchHrAnnouncementStrict).toHaveBeenCalledWith('7');
    });

    test('editor change stores content; store submit builds FormData with HR category + dates', () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { ref, actions } = renderHAF();

        ref.current.handleEditorChange('<p>Body</p>');
        ref.current.setState({ thumbnail: new File(['x'], 't.png') });
        ref.current.onSubmitHandler(storeValues());

        const fd = actions.createHrAnnouncement.mock.calls[0][0];
        expect(fd.get('category')).toBe('HR');
        expect(fd.get('release_date')).toBe('2026-08-01');
        expect(fd.get('expiry_date')).toBe('2026-08-15');
        expect(fd.get('content')).toBe('<p>Body</p>');
        expect(fd.get('thumbnail')).not.toBeNull();
        expect(ref.current.state.thumbnail).toBeNull(); // reset arm
        confirmSpy.mockRestore();
    });

    test('store confirm declined dispatches nothing', () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
        const { ref, actions } = renderHAF();
        ref.current.onSubmitHandler(storeValues());
        expect(actions.createHrAnnouncement).not.toHaveBeenCalled();
        confirmSpy.mockRestore();
    });

    test('update submit PUTs via updateHrAnnouncement; thumbnail only when inputFileWasUpdated', () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { ref, actions } = renderHAF({ params: { id: '7' }, isInstanceLoaded: true, instance: { id: 7, title: 'Old' } });

        // thumbnail present but NOT flagged as updated → excluded from the payload
        ref.current.setState({ thumbnail: new File(['x'], 't.png'), inputFileWasUpdated: false });
        ref.current.onSubmitHandler({ ...storeValues(), method: 'update', id: 7 });
        let [id, fd] = actions.updateHrAnnouncement.mock.calls[0];
        expect(id).toBe(7);
        expect(fd.get('thumbnail')).toBeNull();

        // flagged as updated → included
        ref.current.setState({ thumbnail: new File(['y'], 't2.png'), inputFileWasUpdated: true });
        ref.current.onSubmitHandler({ ...storeValues(), method: 'update', id: 7 });
        [id, fd] = actions.updateHrAnnouncement.mock.calls[1];
        expect(fd.get('thumbnail')).not.toBeNull();
        confirmSpy.mockRestore();
    });
});
