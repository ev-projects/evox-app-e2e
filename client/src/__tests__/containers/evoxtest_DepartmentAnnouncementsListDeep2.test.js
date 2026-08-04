/**
 * evoxtest_DepartmentAnnouncementsListDeep2.test.js
 * Wave-6 coverage for container/DepartmentAnnouncements/DepartmentAnnouncementsList/
 * DepartmentAnnouncementsList.js (fresh: 32 unc / 39.6%). Arms: loading fallback +
 * cWM clear/fetch, loaded card grid (thumbnail null/set, expired/ongoing, headline
 * fallback, on_link http-prefix vs bare-host vs Visit-Page), delete confirm/cancel,
 * joyride callback (step-2 localStorage persist, FINISHED + CLOSE teardown), and the
 * constructor pre_run localStorage gate. Ref-driven. ADDITIVE ONLY.
 * Menu: Announcements → Manage my Departments Announcements.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
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
jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading" />);
jest.mock('react-datepicker', () => () => <input data-testid="datepicker" />);
jest.mock('react-joyride', () => {
    const React = require('react');
    const Joyride = () => <div data-testid="joyride" />;
    return {
        __esModule: true,
        default: Joyride,
        ACTIONS: { CLOSE: 'close' },
        EVENTS: {},
        STATUS: { FINISHED: 'finished', SKIPPED: 'skipped' },
    };
});
jest.mock('../../services/Authenticator', () => ({
    scanLevel: jest.fn(() => true), scanFeature: jest.fn(() => true), check: jest.fn(() => true),
}));
jest.mock('../../services/Formatter', () => ({
    alert_error: jest.fn(), alert_success: jest.fn(),
}));
jest.mock('../../store/actions/announcement/departmentAnnouncementActions', () => ({
    fetchMyHandleAnnouncementList: jest.fn(),
    deleteDepartmentAnnouncement: jest.fn(),
    clearDepartmentAnnouncementListInstance: jest.fn(),
}), { virtual: true });
jest.mock('react-bootstrap', () => {
    const React = require('react');
    const pass = ({ children }) => <div>{children}</div>;
    const Card = ({ children }) => <div data-testid="card">{children}</div>;
    Card.Img = (props) => <img data-testid="card-img" src={props.src} alt="" />;
    Card.Body = pass; Card.Title = pass; Card.Text = pass;
    return {
        Modal: pass, Container: pass, Row: pass, Col: pass, Table: pass, Card,
        Button: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
    };
});

global.links = new Proxy({}, { get: (t, k) => `/link/${String(k)}/` });

const DepartmentAnnouncementsList =
    require('../../container/DepartmentAnnouncements/DepartmentAnnouncementsList/DepartmentAnnouncementsList').default;

const announcements = [
    { id: 1, title: 'Expired w/ https link', headline: 'Head1', thumbnail: 't1.png',
      is_expired: true, on_link: 1, link: 'https://x.example/a' },
    { id: 2, title: 'Ongoing bare-host link', headline: null, thumbnail: null,
      is_expired: false, on_link: 1, link: 'evox.internal/page' },
    { id: 3, title: 'Ongoing visit page', headline: 'Head3', thumbnail: 't3.png',
      is_expired: false, on_link: 0, link: null },
];

function makeActions() {
    return {
        clearDepartmentAnnouncementListInstance: jest.fn(() => Promise.resolve()),
        fetchMyHandleAnnouncementList: jest.fn(() => Promise.resolve()),
        deleteDepartmentAnnouncement: jest.fn(),
        dispatch: jest.fn(),
    };
}

function renderList(props = {}, actions = makeActions()) {
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter>
            <DepartmentAnnouncementsList
                ref={ref}
                departmentAnnouncement={{
                    isDepartmentAnnouncementListLoaded: true,
                    depAnnouncementlist: [...announcements.map((a) => ({ ...a }))],
                }}
                {...actions} {...props}
            />
        </MemoryRouter>
    );
    return { ...utils, ref, actions };
}

beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
});

describe('DepartmentAnnouncementsList', () => {
    test('unloaded list renders PageLoading; cWM clears then fetches the handle list', async () => {
        const { getByTestId, actions } = renderList({
            departmentAnnouncement: { isDepartmentAnnouncementListLoaded: false, depAnnouncementlist: null },
        });
        getByTestId('page-loading');
        expect(actions.clearDepartmentAnnouncementListInstance).toHaveBeenCalled();
        await Promise.resolve(); // async cWM: the fetch fires after the clear's await
        expect(actions.fetchMyHandleAnnouncementList).toHaveBeenCalled();
    });

    test('loaded grid renders every card arm: status, headline fallback, link variants', () => {
        const { getByText, getAllByTestId, container } = renderList();
        getByText('Create Announcement');
        expect(getAllByTestId('card').length).toBe(3);
        getByText('expired');
        expect(getByText('Check it out')).toBeInTheDocument(); // null headline fallback

        const hrefs = [...container.querySelectorAll('a[target="_blank"]')].map((a) => a.getAttribute('href'));
        expect(hrefs).toEqual(['https://x.example/a', 'http://evox.internal/page']); // bare host gets http://
        expect(getByText(/Visit Page/)).toBeInTheDocument(); // on_link=0 arm

        // thumbnail null → unsplash placeholder
        const imgs = getAllByTestId('card-img').map((i) => i.getAttribute('src'));
        expect(imgs[0]).toBe('t1.png');
        expect(imgs[1]).toContain('unsplash');
    });

    test('delete asks for confirmation: OK deletes + splices the list, Cancel does nothing', () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { ref, actions } = renderList();
        const list = ref.current.props.departmentAnnouncement.depAnnouncementlist;

        ref.current.onDeleteHandler(list[1], 1);
        expect(actions.deleteDepartmentAnnouncement).toHaveBeenCalledWith(2);
        expect(list.length).toBe(2);
        expect(ref.current.state.modal_bool).toBe(true); // toggled

        confirmSpy.mockReturnValue(false);
        ref.current.onDeleteHandler(list[0], 0);
        expect(actions.deleteDepartmentAnnouncement).toHaveBeenCalledTimes(1);
        expect(list.length).toBe(2);
        confirmSpy.mockRestore();
    });

    test('joyride callback: step 2 persists the local session; FINISHED and CLOSE tear the tour down', () => {
        const { ref, actions } = renderList();

        ref.current.handleJoyrideCallback({ action: 'next', index: 2, status: 'running', type: 'step' });
        const stored = JSON.parse(localStorage.getItem('joyride-local-announcement-list'));
        expect(stored.step).toBe(2);
        expect(stored.local_expiration).toMatch(/^\d{4}-\d{2}-\d{2}$/);

        ref.current.handleJoyrideCallback({ action: 'next', index: 1, status: 'finished', type: 'end' });
        expect(ref.current.state.run).toBe(false);
        expect(actions.dispatch).toHaveBeenCalledWith({ type: 'WORK_TOUR', worktour: false });

        actions.dispatch.mockClear();
        ref.current.handleJoyrideCallback({ action: 'close', index: 0, status: 'running', type: 'step' });
        expect(actions.dispatch).toHaveBeenCalledWith({ type: 'WORK_TOUR', worktour: false });
    });

    test('constructor pre_run gate: a stored unexpired final-step session disables the tour', () => {
        localStorage.setItem('joyride-local-announcement-list', JSON.stringify({
            local_expiration: '2030-01-01', step: 2,
        }));
        const a = renderList();
        expect(a.ref.current.state.run).toBe(false);

        // expired session → tour runs again
        localStorage.setItem('joyride-local-announcement-list', JSON.stringify({
            local_expiration: '2020-01-01', step: 2,
        }));
        const b = renderList();
        expect(b.ref.current.state.run).toBe(true);
    });
});
