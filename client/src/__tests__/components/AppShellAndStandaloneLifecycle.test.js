/**
 * AppShellAndStandaloneLifecycle.test.js
 *
 * SOURCE FILES UNDER TEST
 *   src/App.js                                        — the application shell
 *   src/config/ProtectedRoutes.js                     — the auth gate every page passes through
 *   src/container/DPAFormIndia/DPAFormIndia.js        — Data Privacy webinar acknowledgement (India)
 *   src/container/RequestEmailApproval/RequestEmailApproval.js — approve/reject-from-email landing page
 *
 * MENU PATH
 *   App.js                 -> (no menu) application root, mounted by src/index.js
 *   ProtectedRoutes.js     -> (no menu) wraps every entry in config/RouteList.js DefaultContainer
 *   DPAFormIndia.js        -> Dashboard -> Data Privacy Webinar (global.links.dpa, India tenants only)
 *   RequestEmailApproval.js-> (no menu) standalone landing page opened from an approval e-mail link
 *                             /request-approval/:hashCode/:status
 *
 * CURRENT MEASURED COVERAGE (before this suite)
 *   App.js                     0% statements
 *   config/ProtectedRoutes.js  0% statements
 *   container/DPAFormIndia     0% statements
 *   container/RequestEmailApproval 0% statements
 *   78 uncovered statements across the four files — never executed by any existing test.
 *
 * FINDINGS CHARACTERISED BY THIS SUITE (each test carries a _FINDING_<CODE> suffix)
 *   _FINDING_PR_CHILDREN_CLONE_OVERRIDE — ProtectedRoutes.js:42-44 clones each child with
 *       `{ params: ..., ...props }`. `props` still carries ProtectedRoute's OWN `children`, and
 *       React.cloneElement lets a `children` key in the config object overwrite the element's own
 *       children. Any protected page that renders `this.props.children` therefore renders a second
 *       copy of itself, and that inner copy receives none of the injected route params.
 *       Live consequence: the DPA route (RouteList.js:131-141) wraps its page in a fragment, so
 *       `params` lands on the fragment (which discards it) and DPAFormIndia / DPAForm are rendered
 *       from the un-cloned original — they receive no route params and none of the gate's props.
 *   _FINDING_APP_DISPATCH_DURING_RENDER — App.js:60-63 calls `this.props.fetchUser()` from inside
 *       render(), not from a lifecycle hook. Every re-render of the shell fires another fetchUser
 *       dispatch; the request count grows with render count rather than with navigation.
 *   _FINDING_APP_FETCHSTATUSNUMBERS_DEAD — App.js:81-94 builds a fully-parameterised
 *       fetchStatusNumbers dispatcher in mapDispatchToProps whose only call site (line 62) is
 *       commented out, so the prop is never invoked.
 *   _FINDING_DPA_INDIA_GATE_INERT — DPAFormIndia.js:14/22/30/37: `showSubmitForm` is initialised to
 *       true, ReactPlayer is imported but never rendered, and neither toggleSubmitForm nor
 *       toggleConfirmButton has a caller anywhere in src/. The "watch the presentation first" gate
 *       described in the comment on line 108 does not exist — the confirmation checkbox is live the
 *       instant the page mounts.
 *   _FINDING_REA_LOGIN_SCHEMA_DEAD — RequestEmailApproval.js:88-99 declares a username/password Yup
 *       schema (and imports Formik, logIn, showAlert, Spring, InputGroup, FormControl) for a page
 *       that renders no form control at all.
 *
 * DETERMINISM
 *   No timers, no polling, no FileReader, no dependency on the current date. Formik/Yup validation
 *   is drained with a fixed number of microtask flushes inside act().
 *
 * ADDITIVE ONLY — no existing test file and no application source was modified.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { MemoryRouter, Route, Switch } from 'react-router-dom';

/* ------------------------------------------------------------------ *
 * Module mocks
 * ------------------------------------------------------------------ */

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
}));

jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader:  ({ children }) => <div>{children}</div>,
    Content:          ({ title, children }) => <div data-testid="content" data-title={title}>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
    Row:              ({ children }) => <div>{children}</div>,
    Col:              ({ children }) => <div>{children}</div>,
}));

jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div data-testid="wrapper">{children}</div>);

jest.mock('react-bootstrap', () => {
    const R = require('react');

    const Form = ({ children }) => R.createElement('div', null, children);
    Form.Control = { Feedback: ({ children }) => R.createElement('div', { 'data-testid': 'feedback' }, children) };

    const Card = ({ children }) => R.createElement('div', { 'data-testid': 'card' }, children);
    Card.Body = ({ children }) => R.createElement('div', null, children);

    const InputGroup = ({ children }) => R.createElement('div', null, children);

    return {
        Form,
        Card,
        InputGroup,
        FormControl: (props) => R.createElement('input', { readOnly: true, ...props }),
        Container: ({ children }) => R.createElement('div', null, children),
        Row:       ({ children }) => R.createElement('div', null, children),
        Col:       ({ children }) => R.createElement('div', null, children),
        Image:     (props) => R.createElement('img', { alt: '', src: props.src }),
        Button:    ({ children, onClick, type, className }) =>
            R.createElement('button', { type, onClick, className }, children),
    };
});

jest.mock('react-spring/renderprops', () => ({ Spring: () => null }));

jest.mock('react-google-slides', () => ({
    __esModule: true,
    default: (props) => (
        <div
            data-testid="google-slides"
            data-slides-link={props.slidesLink}
            data-position={String(props.position)}
        />
    ),
}));

jest.mock('react-player/lazy', () => ({
    __esModule: true,
    default: () => <div data-testid="react-player" />,
}));

// --- App.js children ------------------------------------------------
jest.mock('../../components/Template/AlertContainer', () => () => <div data-testid="alert-container" />);
jest.mock('../../components/Template/LoaderContainer', () => () => <div data-testid="loader-container" />);
jest.mock('../../components/Template/ModalLoginContainer', () => () => <div data-testid="modal-login-container" />);
jest.mock('../../config/RouteList', () => () => <div data-testid="route-list" />);

// --- ProtectedRoutes child ------------------------------------------
jest.mock('../../components/ChangePasswordForm', () => (props) => (
    <div data-testid="change-password-form" data-force={String(props.forceChangePassword)} />
));

// --- action creators (keep axios/API out of the tree) ----------------
jest.mock('../../store/actions/userActions', () => ({
    fetchUser: () => ({ type: 'FETCH_USER' }),
    logIn: () => ({ type: 'LOG_IN' }),
}));
jest.mock('../../store/actions/filters/requestListActions', () => ({
    fetchStatusNumbers: () => ({ type: 'FETCH_STATUS_NUMBERS' }),
}));
jest.mock('../../store/actions/approval/requestApprovalActions', () => ({
    requestApprovalChangeStatus: () => ({ type: 'REQUEST_APPROVAL_CHANGE_STATUS' }),
}));
jest.mock('../../store/actions/profile/profileActions', () => ({
    tickDpa: () => ({ type: 'TICK_DPA' }),
}));
jest.mock('../../store/actions/settings/alertActions', () => ({
    showAlert: () => ({ type: 'SHOW_ALERT' }),
}));

/* ------------------------------------------------------------------ *
 * Globals the components read off `global.links`
 * ------------------------------------------------------------------ */

const LINKS = { login: '/login', dashboard: '/dashboard', dpa: '/dpa' };
global.links = new Proxy(LINKS, { get: (t, k) => (k in t ? t[k] : '/x/') });

/* ------------------------------------------------------------------ *
 * Components under test (required AFTER the mocks above)
 * ------------------------------------------------------------------ */

const App                  = require('../../App').default;
const ProtectedRoute       = require('../../config/ProtectedRoutes').default;
const RequestEmailApproval = require('../../container/RequestEmailApproval/RequestEmailApproval').default;
const DPAFormIndia         = require('../../container/DPAFormIndia/DPAFormIndia').default;

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

// Drain Formik/Yup promise chains deterministically (microtasks only, no timers).
const flush = async () => {
    for (let i = 0; i < 6; i++) {
        // eslint-disable-next-line no-await-in-loop
        await act(async () => { await Promise.resolve(); });
    }
};

beforeEach(() => {
    window.localStorage.clear();
});

/* ================================================================== *
 * 1. App.js — the shell
 * ================================================================== */

describe('App shell', () => {
    const GA_LINK = 'https://www.googletagmanager.com/gtag/js?id=UA-TEST';
    const GA_ID   = 'UA-TEST-1';

    let originalLink;
    let originalId;

    beforeEach(() => {
        originalLink = process.env.REACT_APP_GOOGLE_ANALYTICS_LINK;
        originalId   = process.env.REACT_APP_GOOGLE_ANALYTICS_ID;
        delete process.env.REACT_APP_GOOGLE_ANALYTICS_LINK;
        delete process.env.REACT_APP_GOOGLE_ANALYTICS_ID;
        delete window.dataLayer;
        Array.prototype.slice
            .call(document.body.querySelectorAll('script'))
            .forEach((s) => s.parentNode.removeChild(s));
    });

    afterEach(() => {
        if (originalLink === undefined) delete process.env.REACT_APP_GOOGLE_ANALYTICS_LINK;
        else process.env.REACT_APP_GOOGLE_ANALYTICS_LINK = originalLink;
        if (originalId === undefined) delete process.env.REACT_APP_GOOGLE_ANALYTICS_ID;
        else process.env.REACT_APP_GOOGLE_ANALYTICS_ID = originalId;
        delete window.dataLayer;
        Array.prototype.slice
            .call(document.body.querySelectorAll('script'))
            .forEach((s) => s.parentNode.removeChild(s));
    });

    const renderApp = (props = {}) =>
        render(<App fetchUser={jest.fn()} fetchStatusNumbers={jest.fn()} {...props} />);

    it('mounts the four shell regions — loader, alert, login modal and the route list — inside div.App', () => {
        const { container, getByTestId } = renderApp();

        const shell = container.querySelector('div.App');
        expect(shell).not.toBeNull();
        expect(getByTestId('loader-container')).toBeInTheDocument();
        expect(getByTestId('alert-container')).toBeInTheDocument();
        expect(getByTestId('modal-login-container')).toBeInTheDocument();
        expect(shell.contains(getByTestId('route-list'))).toBe(true);
    });

    it('fetches the signed-in user when an access_token is present in localStorage', () => {
        window.localStorage.setItem('access_token', 'token-abc');
        const fetchUser = jest.fn();

        renderApp({ fetchUser });

        expect(fetchUser).toHaveBeenCalledTimes(1);
        expect(fetchUser).toHaveBeenCalledWith();
    });

    it('does not fetch the user when there is no access_token in localStorage', () => {
        const fetchUser = jest.fn();

        renderApp({ fetchUser });

        expect(fetchUser).not.toHaveBeenCalled();
    });

    it('re-dispatches fetchUser on every re-render because the call sits in render() _FINDING_APP_DISPATCH_DURING_RENDER', () => {
        window.localStorage.setItem('access_token', 'token-abc');
        const fetchUser = jest.fn();

        const { rerender } = renderApp({ fetchUser });
        expect(fetchUser).toHaveBeenCalledTimes(1);

        rerender(<App fetchUser={fetchUser} fetchStatusNumbers={jest.fn()} />);
        rerender(<App fetchUser={fetchUser} fetchStatusNumbers={jest.fn()} />);

        // A lifecycle-hosted fetch would still be 1. Render-hosted, it tracks render count.
        expect(fetchUser).toHaveBeenCalledTimes(3);
    });

    it('never invokes the fetchStatusNumbers dispatcher it wires up _FINDING_APP_FETCHSTATUSNUMBERS_DEAD', () => {
        window.localStorage.setItem('access_token', 'token-abc');
        const fetchStatusNumbers = jest.fn();

        const { rerender } = renderApp({ fetchStatusNumbers });
        rerender(<App fetchUser={jest.fn()} fetchStatusNumbers={fetchStatusNumbers} />);

        expect(fetchStatusNumbers).not.toHaveBeenCalled();
    });

    it('injects the Google Analytics tag and seeds the dataLayer when both GA env vars are set', () => {
        process.env.REACT_APP_GOOGLE_ANALYTICS_LINK = GA_LINK;
        process.env.REACT_APP_GOOGLE_ANALYTICS_ID   = GA_ID;

        renderApp();

        const scripts = Array.prototype.slice.call(document.body.querySelectorAll('script'));
        const gaScript = scripts.find((s) => s.src === GA_LINK);
        expect(gaScript).toBeDefined();
        expect(gaScript.async).toBe(true);

        expect(window.dataLayer).toHaveLength(2);
        expect(window.dataLayer[0][0]).toBe('js');
        expect(window.dataLayer[0][1] instanceof Date).toBe(true);
        expect(window.dataLayer[1][0]).toBe('config');
        expect(window.dataLayer[1][1]).toBe(GA_ID);
    });

    it('skips analytics entirely when the GA link is configured but the GA id is missing', () => {
        process.env.REACT_APP_GOOGLE_ANALYTICS_LINK = GA_LINK;

        renderApp();

        expect(document.body.querySelectorAll('script')).toHaveLength(0);
        expect(window.dataLayer).toBeUndefined();
    });

    it('skips analytics entirely when neither GA env var is configured', () => {
        renderApp();

        expect(document.body.querySelectorAll('script')).toHaveLength(0);
        expect(window.dataLayer).toBeUndefined();
    });

    it('replaces every function member of console with a silent no-op in a production build', () => {
        const realConsole = global.console;
        const originalLog = jest.fn();
        const fake = {
            log: originalLog,
            warn: jest.fn(),
            error: jest.fn(),
            info: jest.fn(),
            notAFunction: 42,
        };
        const prevEnv = process.env.NODE_ENV;

        let suppressedLog;
        try {
            global.console = fake;
            process.env.NODE_ENV = 'production';
            renderApp();
            suppressedLog = fake.log;
        } finally {
            global.console = realConsole;
            process.env.NODE_ENV = prevEnv;
        }

        expect(suppressedLog).not.toBe(originalLog);
        expect(suppressedLog('anything', 1, 2)).toBeUndefined();
        expect(originalLog).not.toHaveBeenCalled();
        // The `typeof console[c] === 'function'` guard leaves non-function members alone.
        expect(fake.notAFunction).toBe(42);
    });

    it('leaves console untouched outside a production build', () => {
        const realConsole = global.console;
        const originalLog = jest.fn();
        const fake = { log: originalLog, warn: jest.fn(), error: jest.fn(), notAFunction: 42 };
        const prevEnv = process.env.NODE_ENV;

        let afterLog;
        try {
            global.console = fake;
            process.env.NODE_ENV = 'development';
            renderApp();
            afterLog = fake.log;
        } finally {
            global.console = realConsole;
            process.env.NODE_ENV = prevEnv;
        }

        expect(afterLog).toBe(originalLog);
    });
});

/* ================================================================== *
 * 2. config/ProtectedRoutes.js — the auth gate
 * ================================================================== */

describe('ProtectedRoute auth gate', () => {
    class Probe extends React.Component {
        render() {
            const { params, user, location, level, children } = this.props;
            return (
                <div
                    data-testid="probe"
                    data-param-id={String(params && params.id)}
                    data-user-id={String(user && user.id)}
                    data-pathname={String(location && location.pathname)}
                    data-level={Array.isArray(level) ? level.join(',') : 'none'}
                    data-children-count={String(React.Children.count(children))}
                />
            );
        }
    }

    const Nester = (props) => <div data-testid="nester">{props.children}</div>;

    // RouteList mounts every ProtectedRoute inside a <Switch>, so once the gate redirects to
    // /login the outer Switch stops rendering it. Standalone, ProtectedRoute's inner <Route/>
    // has no path and would match /login too, so the harness feeds the (production-unused)
    // routeProps escape hatch on line 20 with the path being guarded. That reproduces the
    // production containment without a Switch, and lets each test own `computedMatch`/`location`.
    const renderGate = ({
        user,
        page = { isReloading: false },
        children = <Probe />,
        computedMatch = { params: {} },
        entry = '/protected',
        extra = {},
    }) =>
        render(
            <MemoryRouter initialEntries={[entry]}>
                <div>
                    <ProtectedRoute
                        routeProps={{ path: entry }}
                        user={user}
                        page={page}
                        computedMatch={computedMatch}
                        {...extra}
                    >
                        {children}
                    </ProtectedRoute>
                    <Route
                        path="/login"
                        render={({ location }) => (
                            <div data-testid="login-page" data-search={location.search}>LOGIN</div>
                        )}
                    />
                </div>
            </MemoryRouter>
        );

    it('renders the guarded page when the user record carries a valid id', () => {
        const { getByTestId, queryByTestId } = renderGate({ user: { id: 77 } });

        expect(getByTestId('probe')).toBeInTheDocument();
        expect(queryByTestId('login-page')).toBeNull();
        expect(queryByTestId('change-password-form')).toBeNull();
    });

    it('injects the matched route params and the connected user onto the guarded page', () => {
        const { getByTestId } = renderGate({
            user: { id: 77 },
            computedMatch: { params: { id: '4242' } },
        });

        expect(getByTestId('probe')).toHaveAttribute('data-param-id', '4242');
        expect(getByTestId('probe')).toHaveAttribute('data-user-id', '77');
    });

    it('passes the router location through HandleRoute down to the guarded page', () => {
        const { getByTestId } = renderGate({ user: { id: 77 }, entry: '/my-team/requests' });

        expect(getByTestId('probe')).toHaveAttribute('data-pathname', '/my-team/requests');
    });

    it('redirects an anonymous visitor to the login page carrying the attempted path as ?redirect', () => {
        const { getByTestId, queryByTestId } = renderGate({
            user: { id: null },
            entry: '/my-team/requests',
        });

        expect(queryByTestId('probe')).toBeNull();
        expect(getByTestId('login-page')).toHaveAttribute('data-search', '?redirect=/my-team/requests');
    });

    it('drops the ?redirect query string when the user state asks for clean login parameters', () => {
        const { getByTestId } = renderGate({
            user: { id: null, clearLoginParameters: true },
            entry: '/my-team/requests',
        });

        expect(getByTestId('login-page')).toHaveAttribute('data-search', '');
    });

    it('redirects with an empty ?redirect value when the location carries no pathname', () => {
        const { getByTestId } = renderGate({
            user: { id: null },
            extra: { location: {} },
        });

        expect(getByTestId('login-page')).toHaveAttribute('data-search', '?redirect=');
    });

    it('treats a numeric-zero user id as unauthenticated and redirects to login', () => {
        const { queryByTestId, getByTestId } = renderGate({ user: { id: 0 } });

        expect(queryByTestId('probe')).toBeNull();
        expect(getByTestId('login-page')).toBeInTheDocument();
    });

    it('treats an empty-string user id as unauthenticated and redirects to login', () => {
        const { queryByTestId, getByTestId } = renderGate({ user: { id: '' } });

        expect(queryByTestId('probe')).toBeNull();
        expect(getByTestId('login-page')).toBeInTheDocument();
    });

    it('holds the redirect back while the page state reports it is still reloading', () => {
        const { queryByTestId } = renderGate({
            user: { id: null },
            page: { isReloading: true },
        });

        expect(queryByTestId('login-page')).toBeNull();
        expect(queryByTestId('probe')).toBeNull();
    });

    it('redirects when isReloading is absent from page state entirely', () => {
        const { getByTestId } = renderGate({ user: { id: null }, page: {} });

        expect(getByTestId('login-page')).toBeInTheDocument();
    });

    it('forces the change-password form ahead of the requested page when force_change_password is set', () => {
        const { getByTestId, queryByTestId } = renderGate({
            user: { id: 77, force_change_password: 1 },
        });

        expect(getByTestId('change-password-form')).toHaveAttribute('data-force', 'true');
        expect(queryByTestId('probe')).toBeNull();
    });

    it('does not force the change-password form when force_change_password is numeric zero', () => {
        const { getByTestId, queryByTestId } = renderGate({
            user: { id: 77, force_change_password: 0 },
        });

        expect(queryByTestId('change-password-form')).toBeNull();
        expect(getByTestId('probe')).toBeInTheDocument();
    });

    it('clones every child of a route, not just the first one', () => {
        const { getAllByTestId } = renderGate({
            user: { id: 77 },
            computedMatch: { params: { id: '9' } },
            children: [<Probe key="a" />, <Probe key="b" />],
        });

        const probes = getAllByTestId('probe');
        expect(probes).toHaveLength(2);
        probes.forEach((p) => expect(p).toHaveAttribute('data-param-id', '9'));
    });

    // The two tests below use the exact wiring of config/RouteList.js: the gate sits inside a
    // <Switch>, which is what supplies computedMatch in production.
    const renderInSwitch = ({ user, entry }) =>
        render(
            <MemoryRouter initialEntries={[entry]}>
                <Switch>
                    <ProtectedRoute exact path="/profile/:id" user={user} page={{ isReloading: false }}>
                        <Probe level={['Employee', 'HR']} />
                    </ProtectedRoute>
                    <Route
                        path="/login"
                        render={({ location }) => (
                            <div data-testid="login-page" data-search={location.search}>LOGIN</div>
                        )}
                    />
                </Switch>
            </MemoryRouter>
        );

    it('takes the route params straight from the Switch that mounts it in RouteList', () => {
        const { getByTestId } = renderInSwitch({ user: { id: 77 }, entry: '/profile/8899' });

        expect(getByTestId('probe')).toHaveAttribute('data-param-id', '8899');
        expect(getByTestId('probe')).toHaveAttribute('data-level', 'Employee,HR');
    });

    it('sends an anonymous visitor of a Switch-mounted page to login with the profile path preserved', () => {
        const { getByTestId, queryByTestId } = renderInSwitch({ user: { id: null }, entry: '/profile/8899' });

        expect(queryByTestId('probe')).toBeNull();
        expect(getByTestId('login-page')).toHaveAttribute('data-search', '?redirect=/profile/8899');
    });

    it('overwrites a guarded page own children with the route children, mounting the page twice _FINDING_PR_CHILDREN_CLONE_OVERRIDE', () => {
        const { getAllByTestId, getByTestId } = renderGate({
            user: { id: 77 },
            children: (
                <Nester>
                    <span data-testid="inner">inner</span>
                </Nester>
            ),
        });

        // Correct behaviour would be a single Nester wrapping the span. The `...props` spread
        // hands cloneElement a `children` key, which replaces Nester's own children with the
        // route's children — i.e. with Nester itself.
        expect(getAllByTestId('nester')).toHaveLength(2);
        expect(getByTestId('inner')).toBeInTheDocument();
    });

    it('never reaches a page wrapped in a fragment with the route params, as the DPA route wraps it _FINDING_PR_CHILDREN_CLONE_OVERRIDE', () => {
        // RouteList.js:131-141 renders <ProtectedRoute path={links.dpa}><><DPAFormIndia/></></ProtectedRoute>.
        // React.Children.map sees ONE child (the fragment); cloneElement puts `params` on the
        // fragment, which drops it, and replaces the fragment's children with the route's children.
        const realError = console.error;
        console.error = () => {}; // React warns that a fragment may only take key/children
        try {
            const { getByTestId } = renderGate({
                user: { id: 77 },
                computedMatch: { params: { id: '4242' } },
                children: (
                    <React.Fragment>
                        <Probe />
                    </React.Fragment>
                ),
            });

            expect(getByTestId('probe')).toHaveAttribute('data-param-id', 'undefined');
            expect(getByTestId('probe')).toHaveAttribute('data-user-id', 'undefined');
        } finally {
            console.error = realError;
        }
    });

    it('hands the guarded page a children prop it was never given in RouteList _FINDING_PR_CHILDREN_CLONE_OVERRIDE', () => {
        const { getByTestId } = renderGate({
            user: { id: 77 },
            children: <Probe level={['Employee']} />,
        });

        // <Probe /> is declared childless in RouteList, yet arrives with one child: itself.
        expect(getByTestId('probe')).toHaveAttribute('data-children-count', '1');
        expect(getByTestId('probe')).toHaveAttribute('data-level', 'Employee');
    });
});

/* ================================================================== *
 * 3. RequestEmailApproval — approve/reject straight from the e-mail
 * ================================================================== */

describe('RequestEmailApproval landing page', () => {
    const LOADING_STATE = { instance: null, isInstanceValid: null };

    const approvedInstance = {
        is_changed: true,
        request: {
            request_type: 'alter_log_punche',
            status: 'approved',
            user: { full_name: 'Jane Doe' },
        },
    };

    const view = ({ requestApproval, user = { id: 5 }, params = { hashCode: 'h4sh', status: 'approved' } }) => {
        const changeStatus = jest.fn();
        const tree = (state) => (
            <MemoryRouter>
                <RequestEmailApproval
                    match={{ params }}
                    requestApproval={state}
                    user={user}
                    requestApprovalChangeStatus={changeStatus}
                />
            </MemoryRouter>
        );
        const utils = render(tree(LOADING_STATE));
        if (requestApproval) utils.rerender(tree(requestApproval));
        return { ...utils, changeStatus };
    };

    it('asks the API to apply the decision using the hash code and status taken from the URL', () => {
        const { changeStatus } = view({
            requestApproval: null,
            params: { hashCode: 'abc123', status: 'rejected' },
        });

        expect(changeStatus).toHaveBeenCalledTimes(1);
        expect(changeStatus).toHaveBeenCalledWith('abc123', 'rejected');
    });

    it('makes no API call when the URL carries a status but no hash code', () => {
        const { changeStatus } = view({
            requestApproval: null,
            params: { hashCode: undefined, status: 'approved' },
        });

        expect(changeStatus).not.toHaveBeenCalled();
    });

    it('makes no API call when the URL carries a hash code but an empty status', () => {
        const { changeStatus } = view({
            requestApproval: null,
            params: { hashCode: 'abc123', status: '' },
        });

        expect(changeStatus).not.toHaveBeenCalled();
    });

    it('makes no API call when the hash code is the string zero, which the Validator rejects', () => {
        const { changeStatus } = view({
            requestApproval: null,
            params: { hashCode: '0', status: 'approved' },
        });

        expect(changeStatus).not.toHaveBeenCalled();
    });

    it('shows the four-bar skeleton and no verdict text until the API answers', () => {
        const { container, queryByText } = view({ requestApproval: null });

        expect(container.querySelectorAll('.linear-background')).toHaveLength(4);
        expect(container.querySelector('#requestEmailApproval')).toBeNull();
        expect(queryByText(/link you are accessing/i)).toBeNull();
    });

    it('keeps showing the skeleton when new props arrive without changing the instance validity', () => {
        const changeStatus = jest.fn();
        const tree = (state) => (
            <MemoryRouter>
                <RequestEmailApproval
                    match={{ params: { hashCode: 'h', status: 'approved' } }}
                    requestApproval={state}
                    user={{ id: 5 }}
                    requestApprovalChangeStatus={changeStatus}
                />
            </MemoryRouter>
        );
        const { container, rerender } = render(tree(LOADING_STATE));

        // instance changed, isInstanceValid did not — the guard must not lift the loader
        rerender(tree({ instance: approvedInstance, isInstanceValid: null }));

        expect(container.querySelectorAll('.linear-background')).toHaveLength(4);
        expect(container.querySelector('#requestEmailApproval')).toBeNull();
    });

    it('announces a freshly applied decision with the humanised request type, requester and upper-cased status', () => {
        const { container, getByText } = view({
            requestApproval: { instance: approvedInstance, isInstanceValid: true },
        });

        expect(container.querySelector('#requestEmailApproval')).not.toBeNull();
        expect(getByText('Alter Log Punch')).toBeInTheDocument();
        expect(getByText('Jane Doe')).toBeInTheDocument();
        expect(container.textContent).toContain('is now');
        expect(container.textContent).not.toContain('has been already');

        const badge = container.querySelector('.approved_status');
        expect(badge).not.toBeNull();
        expect(badge.textContent.trim()).toBe('APPROVED');
    });

    it('tells the approver the request was already actioned when the decision changed nothing', () => {
        const { container } = view({
            requestApproval: {
                instance: {
                    ...approvedInstance,
                    is_changed: false,
                    request: { ...approvedInstance.request, status: 'rejected' },
                },
                isInstanceValid: true,
            },
        });

        expect(container.textContent).toContain('has been already');
        expect(container.textContent).not.toContain('is now');
        expect(container.querySelector('.rejected_status').textContent.trim()).toBe('REJECTED');
    });

    it('flags a tampered or expired link as invalid instead of naming a request', () => {
        const { container, getByText, queryByText } = view({
            requestApproval: { instance: null, isInstanceValid: false },
        });

        expect(getByText('invalid')).toHaveStyle('color: red');
        expect(container.textContent).toContain('The link you are accessing is');
        expect(queryByText('Jane Doe')).toBeNull();
    });

    it('offers a Back to Dashboard button when the approver already has a session', () => {
        window.localStorage.setItem('access_token', 'token-abc');

        const { getByText } = view({
            requestApproval: { instance: approvedInstance, isInstanceValid: true },
            user: { id: 5 },
        });

        const link = getByText('Back to Dashboard');
        expect(link).toHaveAttribute('href', '/dashboard');
        expect(link).toHaveClass('back-to-dashboard-btn');
    });

    it('tells a signed-out approver to close the tab rather than linking into the app', () => {
        const { getByText, queryByText } = view({
            requestApproval: { instance: approvedInstance, isInstanceValid: true },
            user: { id: 5 },
        });

        expect(getByText('You can now close this tab.')).toBeInTheDocument();
        expect(queryByText('Back to Dashboard')).toBeNull();
    });

    it('tells the approver to close the tab when a token exists but no user is loaded yet', () => {
        window.localStorage.setItem('access_token', 'token-abc');

        const { getByText, queryByText } = view({
            requestApproval: { instance: approvedInstance, isInstanceValid: true },
            user: { id: null },
        });

        expect(getByText('You can now close this tab.')).toBeInTheDocument();
        expect(queryByText('Back to Dashboard')).toBeNull();
    });

    it('renders the Eastvantage footer image on both the valid and the invalid verdict', () => {
        const valid = view({ requestApproval: { instance: approvedInstance, isInstanceValid: true } });
        expect(valid.container.querySelector('.powered_by img')).not.toBeNull();

        const invalid = view({ requestApproval: { instance: null, isInstanceValid: false } });
        expect(invalid.container.querySelector('.powered_by img')).not.toBeNull();
    });

    it('renders no form control at all despite shipping a username/password schema _FINDING_REA_LOGIN_SCHEMA_DEAD', () => {
        const { container } = view({
            requestApproval: { instance: approvedInstance, isInstanceValid: true },
        });

        expect(container.querySelectorAll('input')).toHaveLength(0);
        expect(container.querySelectorAll('form')).toHaveLength(0);
        expect(container.querySelectorAll('button')).toHaveLength(0);
    });
});

/* ================================================================== *
 * 4. DPAFormIndia — Data Privacy webinar acknowledgement
 * ================================================================== */

describe('DPAFormIndia acknowledgement page', () => {
    const NEW_SLIDES_LINK =
        'https://docs.google.com/presentation/d/1RkTgDxzDup7muLYdigHDVJhPOYEobyAf/edit?usp=sharing&ouid=110230619843845605120&rtpof=true&sd=true';

    const view = ({ user = { id: 4242, dpa_ticked_at: null }, ref = null } = {}) => {
        const tickDpa = jest.fn();
        const showAlert = jest.fn();
        const utils = render(
            <DPAFormIndia ref={ref} user={user} tickDpa={tickDpa} showAlert={showAlert} />
        );
        return { ...utils, tickDpa, showAlert };
    };

    it('titles the page as the India data-privacy webinar and embeds the current slide deck', () => {
        const { getByTestId } = view();

        expect(getByTestId('content')).toHaveAttribute('data-title', 'Webinar: Data Privacy For India');
        expect(getByTestId('google-slides')).toHaveAttribute('data-slides-link', NEW_SLIDES_LINK);
        expect(getByTestId('google-slides')).toHaveAttribute('data-position', '1');
    });

    it('offers an unticked confirmation checkbox and a submit button to an employee who has not acknowledged yet', () => {
        const { container, getByText } = view({ user: { id: 4242, dpa_ticked_at: null } });

        const checkbox = container.querySelector('input[name="confirm"]');
        expect(checkbox).not.toBeNull();
        expect(checkbox.type).toBe('checkbox');
        expect(checkbox.checked).toBe(false);
        expect(getByText(/Submit/).closest('button')).toHaveAttribute('type', 'submit');
    });

    it('replaces the form with a dated thank-you once the employee has already acknowledged', () => {
        const { container } = view({ user: { id: 4242, dpa_ticked_at: '2021-03-15 09:00:00' } });

        expect(container.textContent).toContain('Thank you for your participation!');
        expect(container.querySelector('strong').textContent).toBe('2021-03-15 09:00:00');
        expect(container.querySelector('input[name="confirm"]')).toBeNull();
        expect(container.querySelector('button')).toBeNull();
    });

    it('blocks the submission and explains why when the checkbox was never ticked', async () => {
        const { container, tickDpa } = view();

        await act(async () => { fireEvent.submit(container.querySelector('form')); });
        await flush();

        expect(tickDpa).not.toHaveBeenCalled();
        expect(container.textContent).toContain('Please tick the checkbox to confirm the submission.');
    });

    it('records the acknowledgement against the signed-in employee once the checkbox is ticked', async () => {
        const { container, tickDpa } = view({ user: { id: 4242, dpa_ticked_at: null } });

        const checkbox = container.querySelector('input[name="confirm"]');
        await act(async () => { fireEvent.click(checkbox); });
        await flush();
        expect(container.querySelector('input[name="confirm"]').checked).toBe(true);

        await act(async () => { fireEvent.submit(container.querySelector('form')); });
        await flush();

        expect(tickDpa).toHaveBeenCalledTimes(1);
        expect(tickDpa).toHaveBeenCalledWith(4242);
        expect(container.textContent).not.toContain('Please tick the checkbox to confirm the submission.');
    });

    it('clears the validation message when the employee ticks the box after a rejected submission', async () => {
        const { container, tickDpa } = view();

        await act(async () => { fireEvent.submit(container.querySelector('form')); });
        await flush();
        expect(container.textContent).toContain('Please tick the checkbox to confirm the submission.');

        await act(async () => { fireEvent.click(container.querySelector('input[name="confirm"]')); });
        await flush();

        expect(container.textContent).not.toContain('Please tick the checkbox to confirm the submission.');
        expect(tickDpa).not.toHaveBeenCalled();
    });

    it('submits the acknowledgement for the exact employee id it was handed, not a hard-coded one', () => {
        const ref = React.createRef();
        const { tickDpa } = view({ user: { id: 991, dpa_ticked_at: null }, ref });

        act(() => { ref.current.onSubmitHandler({ confirm: true }); });

        expect(tickDpa).toHaveBeenCalledWith(991);
    });

    it('ignores a submission payload whose confirm flag is false', () => {
        const ref = React.createRef();
        const { tickDpa } = view({ ref });

        act(() => { ref.current.onSubmitHandler({ confirm: false }); });

        expect(tickDpa).not.toHaveBeenCalled();
    });

    it('hides the whole acknowledgement block while the submit form is toggled off, keeping the deck visible', () => {
        const ref = React.createRef();
        const { container, getByTestId } = view({ ref });

        act(() => { ref.current.toggleSubmitForm(false); });

        expect(container.querySelector('input[name="confirm"]')).toBeNull();
        expect(container.querySelector('button')).toBeNull();
        expect(getByTestId('google-slides')).toBeInTheDocument();
        expect(container.textContent).toContain('All employees of India are required');
    });

    it('brings the acknowledgement block back when the submit form is toggled on again', () => {
        const ref = React.createRef();
        const { container } = view({ ref });

        act(() => { ref.current.toggleSubmitForm(false); });
        act(() => { ref.current.toggleSubmitForm(true); });

        expect(container.querySelector('input[name="confirm"]')).not.toBeNull();
    });

    it('keeps the thank-you note for an already-acknowledged employee even with the submit form toggled off', () => {
        const ref = React.createRef();
        const { container } = view({ user: { id: 4242, dpa_ticked_at: '2020-01-02 03:04:05' }, ref });

        act(() => { ref.current.toggleSubmitForm(false); });

        expect(container.textContent).toContain('Thank you for your participation!');
        expect(container.textContent).toContain('2020-01-02 03:04:05');
    });

    it('exposes the confirmation checkbox with no completion gate in front of it _FINDING_DPA_INDIA_GATE_INERT', () => {
        const ref = React.createRef();
        const { container, queryByTestId } = view({ ref });

        // showSubmitForm starts true, the imported ReactPlayer is never rendered, and neither
        // toggleSubmitForm nor toggleConfirmButton has a caller anywhere in src/.
        expect(ref.current.state.showSubmitForm).toBe(true);
        expect(queryByTestId('react-player')).toBeNull();
        expect(container.querySelector('input[name="confirm"]')).not.toBeNull();

        // toggleConfirmButton flips component state that the checkbox does not read back,
        // because Formik owns the value and was initialised once at mount.
        act(() => { ref.current.toggleConfirmButton(); });
        expect(ref.current.state.confirm).toBe(true);
        expect(container.querySelector('input[name="confirm"]').checked).toBe(false);
    });
});
