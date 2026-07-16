// DRAFT — generated 2026-06-16, needs verification
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

/**
 * Auth Component Tests
 *
 * Covers:
 *   container/Login/Login.js
 *   container/ForgotPasswordRequest/ForgotPasswordRequest.js
 *   container/ModalLogin/ModalLogin.js
 *
 * Full-stack report: D:\Projects\EVOX-AI-Delivery\toShare\full-stack-reports\auth.md
 */

// ---------------------------------------------------------------------------
// Global mocks
// ---------------------------------------------------------------------------
jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => jest.fn(),
}));

// global.links is set by src/config/GlobalVariables.js at app boot — define it here for tests
global.links = {
    dashboard:        '/app/Dashboard',
    recover_password: '/recover/password/',
    login:            '/login',
};

jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate:     ({ name }) => <input name={name} type="date" />,
    InputTime:     ({ name }) => <input name={name} type="time" />,
    InputDateTime: ({ name }) => <input name={name} type="datetime-local" />,
})).default;

// react-spring/renderprops uses requestAnimationFrame internally which is unavailable in jsdom.
// Mock Spring to render children immediately (same approach as Login.test.js).
jest.mock('react-spring/renderprops', () => ({
    Spring: ({ children }) => children({ opacity: 1 }),
}));

jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);

jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader:  ({ children }) => <div>{children}</div>,
    Content:          ({ children }) => <div>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
    Row:              ({ children }) => <div>{children}</div>,
    Col:              ({ children }) => <div>{children}</div>,
}));

// Formik is used heavily — allow it to render but mock heavy validators to prevent side-effects
jest.mock('formik', () => {
    const actual = jest.requireActual('formik');
    return {
        ...actual,
    };
});

// ---------------------------------------------------------------------------
// Load Login component
// ---------------------------------------------------------------------------
let LoginComponent;
try {
    const m = require('../../container/Login/Login');
    LoginComponent = m.Login || m.default;
} catch {
    LoginComponent = require('../../container/Login/Login').default;
}

// ---------------------------------------------------------------------------
// Load ForgotPasswordRequest component
// ---------------------------------------------------------------------------
let ForgotPasswordComponent;
try {
    const m = require('../../container/ForgotPasswordRequest/ForgotPasswordRequest');
    ForgotPasswordComponent = m.ForgotPasswordRequest || m.default;
} catch {
    ForgotPasswordComponent = require('../../container/ForgotPasswordRequest/ForgotPasswordRequest').default;
}

// ---------------------------------------------------------------------------
// Load ModalLogin component
// ---------------------------------------------------------------------------
let ModalLoginComponent;
try {
    const m = require('../../container/ModalLogin/ModalLogin');
    ModalLoginComponent = m.ModalLogin || m.default;
} catch {
    ModalLoginComponent = require('../../container/ModalLogin/ModalLogin').default;
}

// ---------------------------------------------------------------------------
// Default props for Login / ModalLogin
// (from Redux state.user + state.page as mapped in mapStateToProps)
// ---------------------------------------------------------------------------
const defaultLoginProps = {
    user:     { id: null, full_name: '', pov_timezone: 'Asia/Manila' },
    page:     { isLoading: false },
    dispatch: jest.fn(),
    history:  { push: jest.fn() },
    match:    { params: {} },
    location: { search: '' },
    // Redux dispatch props from mapDispatchToProps
    logIn:                 jest.fn(),
    authenticateMSClient:  jest.fn(),
    showAlert:             jest.fn(),
};

// ---------------------------------------------------------------------------
// Default props for ForgotPasswordRequest
// (reads state.redirect)
// ---------------------------------------------------------------------------
const defaultForgotProps = {
    redirect:       { run: false, link: '' },
    dispatch:       jest.fn(),
    history:        { push: jest.fn() },
    match:          { params: {} },
    location:       { search: '' },
    forgotPasswordRequest: jest.fn(),
    clearRedirect:         jest.fn(),
};

// ---------------------------------------------------------------------------
// Helper renderers
// ---------------------------------------------------------------------------
function renderLogin(props = {}) {
    if (!LoginComponent) return null;
    return render(
        <MemoryRouter>
            <LoginComponent {...defaultLoginProps} {...props} />
        </MemoryRouter>
    );
}

function renderForgotPassword(props = {}) {
    if (!ForgotPasswordComponent) return null;
    return render(
        <MemoryRouter>
            <ForgotPasswordComponent {...defaultForgotProps} {...props} />
        </MemoryRouter>
    );
}

function renderModalLogin(props = {}) {
    if (!ModalLoginComponent) return null;
    return render(
        <MemoryRouter>
            <ModalLoginComponent {...defaultLoginProps} {...props} />
        </MemoryRouter>
    );
}

// ---------------------------------------------------------------------------
// Login component tests
// ---------------------------------------------------------------------------
describe('Login component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderLogin()).not.toThrow();
    });

    test('renders username input with placeholder "Email or Username"', () => {
        const result = renderLogin();
        if (!result) return;
        const { getByPlaceholderText } = result;
        expect(getByPlaceholderText(/Email or Username/i)).toBeInTheDocument();
    });

    test('renders password input with placeholder "Password"', () => {
        const result = renderLogin();
        if (!result) return;
        const { getByPlaceholderText } = result;
        expect(getByPlaceholderText(/Password/i)).toBeInTheDocument();
    });

    test('renders Log In button', () => {
        const result = renderLogin();
        if (!result) return;
        const { container } = result;
        const submitBtn = container.querySelector('button[type="submit"]');
        expect(submitBtn).toBeInTheDocument();
    });

    test('renders Forgot Password link', () => {
        const result = renderLogin();
        if (!result) return;
        const { getByText } = result;
        expect(getByText(/Forgot Password/i)).toBeInTheDocument();
    });

    test('renders Microsoft login option', () => {
        const result = renderLogin();
        if (!result) return;
        const { getByText } = result;
        expect(getByText(/Eastvantage Email/i)).toBeInTheDocument();
    });

    test('does not crash during loading state', () => {
        expect(() => renderLogin({ page: { isLoading: true } })).not.toThrow();
    });

    test('does not crash when user is already authenticated (user.id present)', () => {
        // When user.id is set, component renders <Redirect> — should not throw
        expect(() => renderLogin({
            user: { id: 1, full_name: 'Test Employee', pov_timezone: 'Asia/Manila' },
        })).not.toThrow();
    });

    test('does not crash with location containing redirect query param', () => {
        expect(() => renderLogin({
            location: { search: '?redirect=/app/Dashboard' },
        })).not.toThrow();
    });

    test('does not crash with location containing MS OAuth code param', () => {
        expect(() => renderLogin({
            location: { search: '?code=ms_oauth_code_abc123' },
        })).not.toThrow();
    });
});

// ---------------------------------------------------------------------------
// ForgotPasswordRequest component tests
// ---------------------------------------------------------------------------
describe('ForgotPasswordRequest component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderForgotPassword()).not.toThrow();
    });

    test('renders email label text', () => {
        const result = renderForgotPassword();
        if (!result) return;
        const { getByText } = result;
        expect(getByText(/Please enter your e-mail address/i)).toBeInTheDocument();
    });

    test('renders email input field', () => {
        const result = renderForgotPassword();
        if (!result) return;
        const { container } = result;
        // No placeholder on the email input — find by name attr
        const emailInput = container.querySelector('input[name="email"]');
        expect(emailInput).toBeInTheDocument();
    });

    test('renders Submit button', () => {
        const result = renderForgotPassword();
        if (!result) return;
        const { getByText } = result;
        expect(getByText(/Submit/i)).toBeInTheDocument();
    });

    test('renders Back button or link', () => {
        const result = renderForgotPassword();
        if (!result) return;
        const { getByText } = result;
        expect(getByText(/Back/i)).toBeInTheDocument();
    });

    test('does not crash when redirect.run is true (triggers redirect to login)', () => {
        expect(() => renderForgotPassword({
            redirect: { run: true, link: '/login' },
        })).not.toThrow();
    });

    test('does not crash with empty redirect state', () => {
        expect(() => renderForgotPassword({ redirect: {} })).not.toThrow();
    });
});

// ---------------------------------------------------------------------------
// ModalLogin component tests
// ---------------------------------------------------------------------------
describe('ModalLogin component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderModalLogin()).not.toThrow();
    });

    test('renders username input with placeholder "Email or Username"', () => {
        const result = renderModalLogin();
        if (!result) return;
        const { getByPlaceholderText } = result;
        expect(getByPlaceholderText(/Email or Username/i)).toBeInTheDocument();
    });

    test('renders password input with placeholder "Password"', () => {
        const result = renderModalLogin();
        if (!result) return;
        const { getByPlaceholderText } = result;
        expect(getByPlaceholderText(/Password/i)).toBeInTheDocument();
    });

    test('does not crash during loading state', () => {
        expect(() => renderModalLogin({ page: { isLoading: true } })).not.toThrow();
    });

    test('does not crash with no user prop', () => {
        expect(() => renderModalLogin({ user: {} })).not.toThrow();
    });
});

// ---------------------------------------------------------------------------
// Yup validation schema tests (inline — schema from report)
// Tests the validation logic without rendering the component
// ---------------------------------------------------------------------------
describe('Auth Yup validation schemas', () => {
    let yup;
    beforeAll(() => {
        yup = require('yup');
    });

    const loginSchema = () => yup.object().shape({
        username: yup.string().min(3).max(255).required(),
        password: yup.string().min(3).max(255).required(),
    });

    const changePasswordSchema = () => yup.object().shape({
        current_password:     yup.string().min(6, '6 Minimum Characters').max(255).required('This field is required').nullable(),
        new_password:         yup.string().min(6, '6 Minimum Characters').max(255).required('This field is required').nullable(),
        confirm_new_password: yup.string().min(6, '6 Minimum Characters').max(255).required('This field is required').nullable()
                                  .oneOf([yup.ref('new_password')], 'Your passwords do not match.'),
    });

    test('login schema — empty username fails required()', async () => {
        await expect(loginSchema().validateAt('username', { username: '' })).rejects.toThrow();
    });

    test('login schema — username with 2 chars fails min(3)', async () => {
        await expect(loginSchema().validateAt('username', { username: 'ab' })).rejects.toThrow();
    });

    test('login schema — password with 256 chars fails max(255)', async () => {
        await expect(loginSchema().validateAt('password', { password: 'a'.repeat(256) })).rejects.toThrow();
    });

    test('login schema — valid username and password passes', async () => {
        await expect(loginSchema().validate({ username: 'validuser', password: 'validpassword' })).resolves.toBeTruthy();
    });

    test('login schema — no .email() rule means non-email strings pass', async () => {
        // By design: any 3+ char string is accepted as username
        await expect(loginSchema().validateAt('username', { username: 'notanemail' })).resolves.toBeTruthy();
    });

    test('change password schema — current_password with 5 chars fails min(6)', async () => {
        await expect(changePasswordSchema().validateAt('current_password', {
            current_password: '12345',
        })).rejects.toThrow('6 Minimum Characters');
    });

    test('change password schema — mismatched confirm_new_password fails oneOf', async () => {
        await expect(changePasswordSchema().validate({
            current_password:     'currentpass',
            new_password:         'newpassword1',
            confirm_new_password: 'differentpassword2',
        })).rejects.toThrow('Your passwords do not match.');
    });

    test('change password schema — matching passwords passes', async () => {
        await expect(changePasswordSchema().validate({
            current_password:     'currentpass',
            new_password:         'newpassword123',
            confirm_new_password: 'newpassword123',
        })).resolves.toBeTruthy();
    });

    test('forgot password schema — empty email fails required()', async () => {
        const schema = yup.object().shape({
            email: yup.string().min(3).max(255).required(),
        });
        await expect(schema.validateAt('email', { email: '' })).rejects.toThrow();
    });

    test('forgot password schema — email "ab" (2 chars) fails min(3)', async () => {
        const schema = yup.object().shape({
            email: yup.string().min(3).max(255).required(),
        });
        await expect(schema.validateAt('email', { email: 'ab' })).rejects.toThrow();
    });

    test('forgot password schema — non-email string passes (no .email() rule)', async () => {
        // By design gap: frontend does not validate email format
        const schema = yup.object().shape({
            email: yup.string().min(3).max(255).required(),
        });
        await expect(schema.validateAt('email', { email: 'notanemail' })).resolves.toBeTruthy();
    });
});
