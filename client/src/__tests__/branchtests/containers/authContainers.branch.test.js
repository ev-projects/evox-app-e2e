/**
 * EVOX — Jest: the sign-in screens
 *
 * Sources under test:
 *   src/container/Login/Login.js
 *   src/container/ModalLogin/ModalLogin.js
 *   src/container/AuthenticateClient/AuthenticateClient.js
 *   src/container/ForgotPasswordRequest/ForgotPasswordRequest.js
 *
 * Menu path: Login page, the session-expired re-login modal, the SSO landing page
 *            (/authenticate-client) and Login -> Forgot Password.
 *
 * Coverage before this file: ModalLogin 5 uncovered functions / 6 branch arms, Login 5 / 2,
 *   ForgotPasswordRequest 6 / 0, AuthenticateClient 5 / 3.
 *
 * Rules asserted here (both arms of every conditional):
 *   - The SSO landing page authenticates with a `token` parameter, falls back to the Microsoft
 *     `code` parameter, and does nothing at all when the browser already holds a session.
 *   - A visitor sent to Login from a protected page is told to sign in first; one arriving with
 *     a Microsoft code is authenticated instead.
 *   - An already-signed-in visitor is bounced to the dashboard, or to the page they were
 *     originally after when the URL carries one.
 *   - Submitting either login form hands the typed credentials to the login action; submitting
 *     it empty does not.
 *   - Forgot Password sends the typed address, and follows a pending redirect instead of
 *     rendering the form.
 *
 * FINDING LOGIN-NULLREDIRECT-1 is characterized at the bottom.
 */

import React from 'react';
import { render, fireEvent, wait as waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => jest.fn(),
}));

// react-spring/renderprops drives requestAnimationFrame, which jsdom does not run; render the
// children immediately instead (the house pattern used by existing Auth tests).
jest.mock('react-spring/renderprops', () => ({
    Spring: ({ children }) => children({ opacity: 1 }),
}));

jest.mock('react-router-dom', () => ({
    Link: ({ to, children, ...rest }) => <a href={String(to)} {...rest}>{children}</a>,
    Redirect: ({ to }) => (
        <div data-testid="redirect">{typeof to === 'object' && to !== null ? JSON.stringify(to) : String(to)}</div>
    ),
    Route: ({ render: renderProp, children }) => (renderProp ? renderProp({}) : children || null),
    withRouter: (Component) => Component,
}));

jest.mock('../../../components/Template/BackButton', () => () => <button type="button">Back</button>);
jest.mock('../../../container/PageLoading', () => () => <div data-testid="page-loading" />);

global.links = new Proxy({}, { get: (target, name) => '/x/' + String(name) });

const Login = require('../../../container/Login/Login').default;
const ModalLogin = require('../../../container/ModalLogin/ModalLogin').default;
const AuthenticateClient = require('../../../container/AuthenticateClient/AuthenticateClient').default;
const ForgotPasswordRequest = require('../../../container/ForgotPasswordRequest/ForgotPasswordRequest').default;

beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
});

describe('AuthenticateClient — the SSO landing page', () => {
    const props = (overrides) => ({
        user: {},
        location: { search: '' },
        authenticateClient: jest.fn(),
        authenticateMSClient: jest.fn(),
        showAlert: jest.fn(),
        ...overrides,
    });

    test('a landing URL carrying a token authenticates with that token', () => {
        const p = props({ location: { search: '?token=abc123' } });

        render(<AuthenticateClient {...p} />);

        expect(p.authenticateClient).toHaveBeenCalledWith('abc123');
        expect(p.authenticateMSClient).not.toHaveBeenCalled();
    });

    test('a landing URL carrying only a Microsoft code authenticates with that code', () => {
        const p = props({ location: { search: '?code=ms-code-1' } });

        render(<AuthenticateClient {...p} />);

        expect(p.authenticateMSClient).toHaveBeenCalledWith('ms-code-1');
        expect(p.authenticateClient).not.toHaveBeenCalled();
    });

    test('a token wins when the URL carries both a token and a code', () => {
        const p = props({ location: { search: '?token=abc123&code=ms-code-1' } });

        render(<AuthenticateClient {...p} />);

        expect(p.authenticateClient).toHaveBeenCalledWith('abc123');
        expect(p.authenticateMSClient).not.toHaveBeenCalled();
    });

    test('a landing URL with neither parameter authenticates nothing and waits', () => {
        const p = props({ location: { search: '?other=1' } });

        const { getByText } = render(<AuthenticateClient {...p} />);

        expect(p.authenticateClient).not.toHaveBeenCalled();
        expect(p.authenticateMSClient).not.toHaveBeenCalled();
        expect(getByText('Authenticating, please wait...')).toBeInTheDocument();
    });

    test('a browser that already holds an access token re-authenticates nothing', () => {
        localStorage.setItem('access_token', 'tok-123');
        const p = props({ location: { search: '?token=abc123' }, user: { id: 7 } });

        render(<AuthenticateClient {...p} />);

        expect(p.authenticateClient).not.toHaveBeenCalled();
    });

    test('an already-signed-in visitor is sent to the page recorded in the URL', () => {
        localStorage.setItem('access_token', 'tok-123');
        const p = props({ location: { search: '?redirect=/app/MyTeam' }, user: { id: 7 } });

        const { getByTestId } = render(<AuthenticateClient {...p} />);

        expect(getByTestId('redirect')).toHaveTextContent('/app/MyTeam');
    });

    test('an already-signed-in visitor with a plain URL is sent to the dashboard', () => {
        localStorage.setItem('access_token', 'tok-123');
        const p = props({ location: { search: '' }, user: { id: 7 } });

        const { getByTestId } = render(<AuthenticateClient {...p} />);

        expect(getByTestId('redirect')).toHaveTextContent('/x/dashboard');
    });

    test('a token with no user loaded yet keeps showing the waiting screen', () => {
        localStorage.setItem('access_token', 'tok-123');
        const p = props({ location: { search: '' }, user: {} });

        const { getByText, queryByTestId } = render(<AuthenticateClient {...p} />);

        expect(queryByTestId('redirect')).toBeNull();
        expect(getByText('Authenticating, please wait...')).toBeInTheDocument();
    });
});

describe('Login — arriving at the sign-in page', () => {
    const props = (overrides) => ({
        user: {},
        location: { search: '' },
        logIn: jest.fn(),
        authenticateMSClient: jest.fn(),
        showAlert: jest.fn(),
        ...overrides,
    });

    test('a visitor bounced off a protected page is told to sign in first', () => {
        const p = props({ location: { search: '?redirect=/app/MyTeam' } });

        render(<Login {...p} />);

        expect(p.showAlert).toHaveBeenCalledWith('Please login to access the link.', 3000);
        expect(p.authenticateMSClient).not.toHaveBeenCalled();
    });

    test('a visitor arriving with a Microsoft code is authenticated and not nagged', () => {
        const p = props({ location: { search: '?code=ms-code-1' } });

        render(<Login {...p} />);

        expect(p.authenticateMSClient).toHaveBeenCalledWith('ms-code-1');
        expect(p.showAlert).not.toHaveBeenCalled();
    });

    test('a visitor arriving with a plain URL is neither nagged nor authenticated', () => {
        const p = props({ location: { search: '' } });

        render(<Login {...p} />);

        expect(p.showAlert).not.toHaveBeenCalled();
        expect(p.authenticateMSClient).not.toHaveBeenCalled();
    });

    test('an already-signed-in visitor is sent straight to the dashboard', () => {
        localStorage.setItem('access_token', 'tok-123');
        const p = props({ user: { id: 7 }, location: { search: '' } });

        const { getByTestId } = render(<Login {...p} />);

        expect(getByTestId('redirect')).toHaveTextContent('/x/dashboard');
    });

    test('an already-signed-in visitor is returned to the page they were after', () => {
        localStorage.setItem('access_token', 'tok-123');
        const p = props({ user: { id: 7 }, location: { search: '?redirect=/app/Requests' } });

        const { getByTestId } = render(<Login {...p} />);

        expect(getByTestId('redirect')).toHaveTextContent('/app/Requests');
    });

    test('a token with no user loaded yet still shows the sign-in form', () => {
        localStorage.setItem('access_token', 'tok-123');
        const p = props({ user: {}, location: { search: '' } });

        const { container, queryByTestId } = render(<Login {...p} />);

        expect(queryByTestId('redirect')).toBeNull();
        expect(container.querySelector('input[name="username"]')).toBeInTheDocument();
    });

    test('signing in with a username and password hands both to the login action', async () => {
        const p = props();
        const { container } = render(<Login {...p} />);

        fireEvent.change(container.querySelector('input[name="username"]'), {
            target: { value: 'ana@example.com' },
        });
        fireEvent.change(container.querySelector('input[name="password"]'), {
            target: { value: 'secret123' },
        });
        fireEvent.submit(container.querySelector('form'));

        await waitFor(() => expect(p.logIn).toHaveBeenCalledTimes(1));
        expect(p.logIn).toHaveBeenCalledWith({ username: 'ana@example.com', password: 'secret123' });
    });

    test('submitting the sign-in form empty does not attempt a login', async () => {
        const p = props();
        const { container } = render(<Login {...p} />);

        fireEvent.submit(container.querySelector('form'));

        await waitFor(() => expect(container.querySelector('form')).toBeInTheDocument());
        expect(p.logIn).not.toHaveBeenCalled();
    });

    test('a password shorter than three characters is rejected before any login attempt', async () => {
        const p = props();
        const { container } = render(<Login {...p} />);

        fireEvent.change(container.querySelector('input[name="username"]'), {
            target: { value: 'ana@example.com' },
        });
        fireEvent.change(container.querySelector('input[name="password"]'), {
            target: { value: 'ab' },
        });
        fireEvent.submit(container.querySelector('form'));

        await waitFor(() => expect(container.querySelector('form')).toBeInTheDocument());
        expect(p.logIn).not.toHaveBeenCalled();
    });
});

describe('ModalLogin — the session-expired re-login modal', () => {
    test('re-signing in from the modal hands the typed credentials to the login action', async () => {
        const logIn = jest.fn();
        const { container } = render(<ModalLogin user={{}} logIn={logIn} showAlert={jest.fn()} />);

        fireEvent.change(container.querySelector('input[name="username"]'), {
            target: { value: 'ana@example.com' },
        });
        fireEvent.change(container.querySelector('input[name="password"]'), {
            target: { value: 'secret123' },
        });
        fireEvent.submit(container.querySelector('form'));

        await waitFor(() => expect(logIn).toHaveBeenCalledTimes(1));
        expect(logIn).toHaveBeenCalledWith({ username: 'ana@example.com', password: 'secret123' });
    });

    test('submitting the modal empty does not attempt a login', async () => {
        const logIn = jest.fn();
        const { container } = render(<ModalLogin user={{}} logIn={logIn} showAlert={jest.fn()} />);

        fireEvent.submit(container.querySelector('form'));

        await waitFor(() => expect(container.querySelector('form')).toBeInTheDocument());
        expect(logIn).not.toHaveBeenCalled();
    });

    test('the modal offers the forgot-password link and the Eastvantage email sign-in', () => {
        const { getByText, container } = render(
            <ModalLogin user={{}} logIn={jest.fn()} showAlert={jest.fn()} />,
        );

        expect(getByText('Forgot Password?').getAttribute('href')).toBe('/x/recover_password');
        expect(container.textContent).toContain('Log In with Eastvantage Email');
    });
});

describe('ForgotPasswordRequest', () => {
    const props = (overrides) => ({
        redirect: { run: false, link: null },
        forgotPasswordRequest: jest.fn(),
        clearRedirect: jest.fn(),
        ...overrides,
    });

    test('asking for a reset link sends the typed address', async () => {
        const p = props();
        const { container } = render(<ForgotPasswordRequest {...p} />);

        fireEvent.change(container.querySelector('input[name="email"]'), {
            target: { value: 'ana@example.com' },
        });
        fireEvent.submit(container.querySelector('form'));

        await waitFor(() => expect(p.forgotPasswordRequest).toHaveBeenCalledTimes(1));
        expect(p.forgotPasswordRequest).toHaveBeenCalledWith('ana@example.com');
    });

    test('submitting with no address at all sends nothing', async () => {
        const p = props();
        const { container } = render(<ForgotPasswordRequest {...p} />);

        fireEvent.submit(container.querySelector('form'));

        await waitFor(() => expect(container.querySelector('form')).toBeInTheDocument());
        expect(p.forgotPasswordRequest).not.toHaveBeenCalled();
    });

    test('a pending redirect is followed and cleared instead of showing the form', () => {
        const p = props({ redirect: { run: true, link: '/x/login' } });

        const { getByTestId, container } = render(<ForgotPasswordRequest {...p} />);

        expect(p.clearRedirect).toHaveBeenCalledTimes(1);
        expect(getByTestId('redirect')).toHaveTextContent('/x/login');
        expect(container.querySelector('form')).toBeNull();
    });

    test('a redirect flagged to run with no link still shows the form', () => {
        const p = props({ redirect: { run: true, link: null } });

        const { container, queryByTestId } = render(<ForgotPasswordRequest {...p} />);

        expect(queryByTestId('redirect')).toBeNull();
        expect(container.querySelector('form')).toBeInTheDocument();
        expect(p.clearRedirect).not.toHaveBeenCalled();
    });
});

/**
 * FINDING LOGIN-NULLREDIRECT-1 — signing in from a URL that carries any query string other
 * than `redirect` sends the user to a null location.
 *
 * src/container/Login/Login.js line 42 seeds `redirect_link` with the dashboard, then line 43
 * overwrites it whenever `location.search` is non-empty — with whatever `?redirect=` holds,
 * which is null when the query string carries something else. The Microsoft sign-in callback
 * lands on exactly such a URL (`/login?code=...`), so once the session is established the
 * page renders `<Redirect to={null} />` instead of `<Redirect to="/app/Dashboard" />`.
 * src/container/AuthenticateClient/AuthenticateClient.js line 35 has the identical shape.
 *
 * The fix is to fall back to the dashboard when the parameter is absent rather than when the
 * whole query string is. This is control flow, not a jsdom artefact — the guard behaves the
 * same in Chrome; only what react-router does with a null target is environment-specific,
 * which is why this test asserts the computed target rather than the resulting navigation.
 */
test('_FINDING_LOGIN_NULLREDIRECT_1 a signed-in visitor arriving with a Microsoft code is redirected to null, not the dashboard', () => {
    localStorage.setItem('access_token', 'tok-123');

    const { getByTestId } = render(
        <Login
            user={{ id: 7 }}
            location={{ search: '?code=ms-code-1' }}
            logIn={jest.fn()}
            authenticateMSClient={jest.fn()}
            showAlert={jest.fn()}
        />,
    );

    expect(getByTestId('redirect')).toHaveTextContent('null');
});
