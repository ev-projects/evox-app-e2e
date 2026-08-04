// DRAFT — generated 2026-07-08, needs verification
/**
 * Template/Header — top navbar shell. Renders the pushmenu toggle plus three
 * connected children (NavQuickPunch, NotificationMenu, DropDownMenu) that are
 * stubbed here so Header can be tested in isolation.
 * Source: src/components/Template/Header/Header.js
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

jest.mock('../../components/Template/DropDownMenu/DropDownMenu', () =>
    () => <div data-testid="dropdown-menu">DropDownMenu</div>);
jest.mock('../../components/Template/NavQuickPunch/NavQuickPunch', () =>
    () => <div data-testid="nav-quick-punch">NavQuickPunch</div>);
jest.mock('../../components/Template/NotificationMenu/NotificationMenu', () =>
    () => <div data-testid="notification-menu">NotificationMenu</div>);

import Header from '../../components/Template/Header/Header';

function renderComponent() {
    return render(<MemoryRouter><Header /></MemoryRouter>);
}

describe('Header component', () => {
    test('renders without crashing', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    test('renders the main-header navbar', () => {
        const { container } = renderComponent();
        expect(container.querySelector('nav.main-header')).toBeInTheDocument();
    });

    test('renders the pushmenu toggle', () => {
        const { container } = renderComponent();
        expect(container.querySelector('[data-widget="pushmenu"]')).toBeInTheDocument();
    });

    test('renders all three navbar children', () => {
        const { getByTestId } = renderComponent();
        expect(getByTestId('nav-quick-punch')).toBeInTheDocument();
        expect(getByTestId('notification-menu')).toBeInTheDocument();
        expect(getByTestId('dropdown-menu')).toBeInTheDocument();
    });
});
