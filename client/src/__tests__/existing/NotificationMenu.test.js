// DRAFT — generated 2026-07-08, needs verification
/**
 * Template/NotificationMenu — the bell dropdown in the header. Class component;
 * componentDidMount calls getMyNotifications(user.id). The bell only expands
 * into a Dropdown when alldata > 0, otherwise it renders a plain icon.
 * Source: src/components/Template/NotificationMenu/NotificationMenu.js
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

jest.mock('react-bootstrap', () => ({
    Dropdown: Object.assign(
        ({ children }) => <div className="dropdown">{children}</div>,
        {
            Toggle: ({ children }) => <button>{children}</button>,
            Menu: ({ children }) => <div className="dropdown-menu">{children}</div>,
        }
    ),
    Tabs: ({ children }) => <div className="tabs">{children}</div>,
    Tab: ({ children }) => <div className="tab">{children}</div>,
    Button: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
}));

import NotificationMenu from '../../components/Template/NotificationMenu/NotificationMenu';

const emptyCenter = {
    requestsForApproval: [],
    requestStatus: [],
    announcements: [],
    celebrations: [],
    missedDtr: [],
    profilePhotos: [],
};

const defaultProps = {
    user: { id: 4, first_name: 'Jane', last_name: 'Doe' },
    notificationCenter: emptyCenter,
    approval: 0,
    announcement: 0,
    celebration: 0,
    missingdtr: 0,
    alldata: 0,
    settings: {},
    getMyNotifications: jest.fn(),
};

function renderComponent(props = {}) {
    return render(
        <MemoryRouter>
            <NotificationMenu {...defaultProps} {...props} />
        </MemoryRouter>
    );
}

describe('NotificationMenu component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing (no notifications)', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    test('renders the nav-item wrapper (no bell when there are no notifications)', () => {
        const { container } = renderComponent();
        expect(container.querySelector('li.nav-item')).toBeInTheDocument();
    });

    test('renders the bell icon when notifications exist', () => {
        const { container } = renderComponent({ alldata: 3, approval: 3 });
        expect(container.querySelector('.fa-bell-o, .fa-bell')).toBeInTheDocument();
    });

    test('fetches notifications on mount', () => {
        const getMyNotifications = jest.fn();
        renderComponent({ getMyNotifications });
        expect(getMyNotifications).toHaveBeenCalledWith(4);
    });

    test('does not fetch when user has no id', () => {
        const getMyNotifications = jest.fn();
        render(
            <MemoryRouter>
                <NotificationMenu {...defaultProps} user={{}} getMyNotifications={getMyNotifications} />
            </MemoryRouter>
        );
        expect(getMyNotifications).not.toHaveBeenCalled();
    });

    test('expands into a dropdown when alldata > 0', () => {
        const { container } = renderComponent({ alldata: 3, approval: 3 });
        expect(container.querySelector('.dropdown')).toBeInTheDocument();
    });
});
