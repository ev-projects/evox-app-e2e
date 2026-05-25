/**
 * EVOX-36 — Jest P0: Login Component Tests
 * Source: src/container/Login/Login.js
 * Testing library: @testing-library/react v9.5.0 (no screen export — use render destructuring)
 *
 * Generated and deployed by AI (Claude Code) per the approved plan.
 * Plan: "Claude Code generates scaffolding; developers review and validate."
 */

import React from 'react';
import { render, fireEvent, wait } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

// Mock react-spring so Spring renders children immediately without animation delay
jest.mock('react-spring/renderprops', () => ({
    Spring: ({ children }) => children({ opacity: 1 }),
}));

// Mock react-redux connect as passthrough — component gets props directly, no store needed
jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
}));

// Mock global.links used by Login component
global.links = {
    dashboard: '/app/Dashboard',
    recover_password: '/recover-password',
};

// Mock Redux actions
const mockLogIn = jest.fn();
const mockShowAlert = jest.fn();
const mockAuthenticateMSClient = jest.fn();

// Props to inject (bypasses Redux connect — test the class directly)
const defaultProps = {
    user: { id: null, isAuthenticated: false },
    logIn: mockLogIn,
    showAlert: mockShowAlert,
    authenticateMSClient: mockAuthenticateMSClient,
    location: { search: '' },
    history: { push: jest.fn() },
};

// Import the unconnected class if exported, otherwise test via the default export
// with a mock Provider
let LoginComponent;
try {
    // Try to get the named export (unconnected class)
    const module = require('../../container/Login/Login');
    LoginComponent = module.Login || module.default;
} catch (e) {
    LoginComponent = require('../../container/Login/Login').default;
}

function renderLogin(props = {}) {
    return render(
        <MemoryRouter>
            <LoginComponent {...defaultProps} {...props} />
        </MemoryRouter>
    );
}

describe('Login page', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders email/username input with correct placeholder', () => {
        const { getByPlaceholderText } = renderLogin();
        expect(getByPlaceholderText('Email or Username')).toBeInTheDocument();
    });

    test('renders password input', () => {
        const { getByPlaceholderText } = renderLogin();
        expect(getByPlaceholderText('Password')).toBeInTheDocument();
    });

    test('renders Log In submit button', () => {
        const { container } = renderLogin();
        const submitBtn = container.querySelector('button[type="submit"]');
        expect(submitBtn).not.toBeNull();
    });

    test('renders Microsoft login button', () => {
        const { getByText } = renderLogin();
        expect(getByText(/Log In with Eastvantage Email/i)).toBeInTheDocument();
    });

    test('renders Forgot Password link', () => {
        const { getByText } = renderLogin();
        expect(getByText(/Forgot Password/i)).toBeInTheDocument();
    });

    test('renders Privacy Policy link', () => {
        const { getByText } = renderLogin();
        expect(getByText(/Privacy Policy/i)).toBeInTheDocument();
    });

    test('username field accepts input', () => {
        const { getByPlaceholderText } = renderLogin();
        const input = getByPlaceholderText('Email or Username');
        fireEvent.change(input, { target: { value: 'test@eastvantage.com' } });
        expect(input.value).toBe('test@eastvantage.com');
    });

    test('password field accepts input', () => {
        const { getByPlaceholderText } = renderLogin();
        const input = getByPlaceholderText('Password');
        fireEvent.change(input, { target: { value: 'TestEvox2026!' } });
        expect(input.value).toBe('TestEvox2026!');
    });

    test('calls logIn when form submitted with valid credentials', async () => {
        const { getByPlaceholderText, container } = renderLogin();
        fireEvent.change(getByPlaceholderText('Email or Username'), {
            target: { value: 'gobi.singaravel@eastvantage.com' },
        });
        fireEvent.change(getByPlaceholderText('Password'), {
            target: { value: 'TestEvox2026!' },
        });
        const submitBtn = container.querySelector('button[type="submit"]');
        fireEvent.click(submitBtn);

        await wait(() => {
            expect(mockLogIn).toHaveBeenCalledWith(
                expect.objectContaining({ username: 'gobi.singaravel@eastvantage.com' })
            );
        });
    });

    test('does not call logIn when form submitted empty', async () => {
        const { container } = renderLogin();
        const submitBtn = container.querySelector('button[type="submit"]');
        fireEvent.click(submitBtn);
        // Formik validation prevents submission with empty fields
        await wait(() => {
            // logIn should NOT be called if fields are empty
            // (Formik validation blocks submission)
            expect(mockLogIn).not.toHaveBeenCalled();
        }, { timeout: 500 });
    });

    test('renders login form when user is not authenticated', () => {
        // When user has no id, the login form should render (not redirect)
        const { getByPlaceholderText } = renderLogin({
            user: { id: null },
        });
        expect(getByPlaceholderText('Email or Username')).toBeInTheDocument();
    });

    test('renders without crashing when location.search is empty', () => {
        expect(() => renderLogin({ location: { search: '' } })).not.toThrow();
    });
});
