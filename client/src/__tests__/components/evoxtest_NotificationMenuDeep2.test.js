/**
 * evoxtest_NotificationMenuDeep2.test.js
 * Wave-5 coverage for components/Template/NotificationMenu/NotificationMenu.js
 * (fresh: 54 unc / 49.1%). Arms: convertDate valid/empty, formatDate, mergeNotifications'
 * five tag arms + photo map + DTR/celebration typing, initializeNotificationState
 * priority chain (approval > announcement > celebration > DTR fallback), tab select,
 * dropdown toggle/link-close, componentDidMount fetch + no-user arm, componentDidUpdate's
 * three change detectors. Driven via instance ref. ADDITIVE ONLY.
 * Menu: top navigation bell (all authenticated pages).
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
}));
jest.mock('../../store/actions/dashboard/dashboardActions', () => ({ getMyNotifications: jest.fn() }));
jest.mock('react-bootstrap', () => {
    const React = require('react');
    const passthrough = ({ children }) => <div>{children}</div>;
    const Dropdown = ({ children }) => <div>{children}</div>;
    Dropdown.Toggle = passthrough; Dropdown.Menu = passthrough; Dropdown.Item = passthrough;
    return {
        Dropdown,
        Tabs: ({ children }) => <div>{children}</div>,
        Tab: ({ children }) => <div>{children}</div>,
        Button: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
    };
});

global.links = new Proxy({}, { get: (t, k) => `/link/${String(k)}/` });

const NotificationMenu = require('../../components/Template/NotificationMenu/NotificationMenu').default;

const center = {
    requestsForApproval: [{ id: 1, title: 'OT approval', timestamp: 't1', userId: 11, requestType: 'overtime' }],
    requestStatus: [{ id: 2, actionStatus: 'Approved', timestamp: 't2', approverId: 22 }],
    announcements: [{ id: 3, title: 'Town hall', description: 'd', timestamp: 't3', announcementId: 33 }],
    celebrations: [{ id: 4, eventType: 'Birthday', eventDate: 't4', celebrationID: 44 }],
    missedDtr: [{ id: 5, requestID: 'r5', title: 'Missed DTR', timestamp: 't5', dtrDate: '2026-07-20', timeIn: '07/20/2026 09:00:00', timeOut: '07/20/2026 18:00:00' }],
    profilePhotos: [{ userId: 11, userPhoto: JSON.stringify({ UserPhoto: 'photo11.png' }) }],
};

const baseProps = {
    user: { id: 42 },
    notificationCenter: center,
    alldata: 5, approval: 1, announcement: 1, celebration: 1, missingdtr: 1,
};

function renderNM(props = {}) {
    const ref = React.createRef();
    const getMyNotifications = jest.fn();
    const utils = render(
        <MemoryRouter>
            <NotificationMenu ref={ref} {...baseProps} getMyNotifications={getMyNotifications} {...props} />
        </MemoryRouter>
    );
    return { ...utils, ref, getMyNotifications, props: { ...baseProps, getMyNotifications, ...props } };
}

function rerenderNM(utils, nextProps) {
    utils.rerender(
        <MemoryRouter>
            <NotificationMenu ref={utils.ref} {...utils.props} {...nextProps} />
        </MemoryRouter>
    );
}

beforeEach(() => jest.clearAllMocks());

describe('NotificationMenu — date helpers', () => {
    test('convertDate handles US-style strings and the empty arm; formatDate reformats timestamps', () => {
        const { ref } = renderNM();
        expect(ref.current.convertDate('07/20/2026 09:00:00')).toBe('2026-07-20');
        expect(ref.current.convertDate(null)).toBe('');
        expect(ref.current.formatDate('07/20/2026 09:05:00')).toBe('2026-07-20 09:05:00');
    });
});

describe('NotificationMenu — mergeNotifications tag arms', () => {
    test("'all' merges every bucket with correct typing and the photo map", () => {
        const { ref } = renderNM();
        ref.current.mergeNotifications('all', center);
        const list = ref.current.state.notificaion_list;

        expect(list.length).toBe(5);
        expect(list.find((n) => n.id === 1).type).toBe('request');
        expect(list.find((n) => n.id === 4).type).toBe('celebration');
        expect(list.find((n) => n.id === 4).celebrations).toBe("It's ");
        expect(list.find((n) => n.id === 5).type).toBe('DTR');           // requestID forces DTR type
        expect(list.find((n) => n.id === 5).timeIn).toBe('2026-07-20 09:00:00');
        expect(ref.current.state.photo_list[11]).toBe('photo11.png');
    });

    test('single-bucket tags merge only their bucket', () => {
        const { ref } = renderNM();
        const cases = [
            ['DTR', 1], ['announcements', 1], ['birthday', 1], ['request', 2],
        ];
        for (const [tag, count] of cases) {
            ref.current.mergeNotifications(tag, center);
            expect(ref.current.state.notificaion_list.length).toBe(count);
        }
    });
});

describe('NotificationMenu — priority initialization and interactions', () => {
    test('mount fetches notifications and lands on the request tab (approval > 0)', () => {
        const { ref, getMyNotifications } = renderNM();
        expect(getMyNotifications).toHaveBeenCalledWith(42);
        expect(ref.current.state.selectedTag).toBe('request');
    });

    test('priority chain falls through: announcements → birthday → DTR', () => {
        const a = renderNM({ approval: 0 });
        expect(a.ref.current.state.selectedTag).toBe('announcements');

        const b = renderNM({ approval: 0, announcement: 0 });
        expect(b.ref.current.state.selectedTag).toBe('birthday');

        const c = renderNM({ approval: 0, announcement: 0, celebration: 0 });
        expect(c.ref.current.state.selectedTag).toBe('DTR');
    });

    test('no user id → no fetch (guard arm)', () => {
        const { getMyNotifications } = renderNM({ user: {} });
        expect(getMyNotifications).not.toHaveBeenCalled();
    });

    test('tab select repopulates; dropdown toggles; link click closes it', () => {
        const { ref } = renderNM();
        ref.current.handleTabSelect1('birthday');
        expect(ref.current.state.selectedTag).toBe('birthday');

        ref.current.handleTabSelect('announcements');
        expect(ref.current.state.selectedTag).toBe('announcements');
        expect(ref.current.state.notificaion_list.length).toBe(1);

        ref.current.toggleDropdown(true);
        expect(ref.current.state.dropdownOpen).toBe(true);
        ref.current.handleLinkClick();
        expect(ref.current.state.dropdownOpen).toBe(false);
    });

    test('componentDidUpdate detectors: new center re-merges, count change re-initializes, user change refetches', () => {
        const utils = renderNM();
        utils.getMyNotifications.mockClear();

        const newCenter = { ...center, announcements: [...center.announcements, { id: 6, title: 'Second', timestamp: 't6' }] };
        rerenderNM(utils, { notificationCenter: newCenter });
        expect(utils.ref.current.state.notificaion_list.length).toBeGreaterThan(0);

        rerenderNM(utils, { approval: 0 }); // count change → re-init to announcements
        expect(utils.ref.current.state.selectedTag).toBe('announcements');

        rerenderNM(utils, { user: { id: 77 } });
        expect(utils.props.getMyNotifications).toHaveBeenCalledWith(77);
    });

    test('bell renders only when alldata > 0', () => {
        const withBell = renderNM();
        expect(withBell.container.querySelector('li')).not.toBeNull();
        const without = renderNM({ alldata: 0 });
        expect(without.container.textContent).toBe('');
    });
});
