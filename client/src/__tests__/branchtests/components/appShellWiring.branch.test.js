/**
 * EVOX — Jest: the app shell, the route guard and the store wiring behind the shell components
 *
 * Sources under test:
 *   src/App.js
 *   src/config/ProtectedRoutes.js
 *   src/components/Template/ModalLoginContainer/ModalLoginContainer.js
 *   the connect() wiring of Template/AlertContainer, Template/BackButton,
 *   Template/DropDownMenu and Template/Wrapper
 *
 * Menu path: global — App is the shell every screen renders inside, ProtectedRoute guards every
 *            /app/* route, and the login modal is what appears when a session expires mid-work.
 *
 * Coverage before this file: App 3 uncovered functions / 1 branch arm, ProtectedRoutes 1
 *   function, ModalLoginContainer 4 functions, plus the connect() closures counted as uncovered
 *   functions in AlertContainer (3), BackButton (1), DropDownMenu (2) and Wrapper (1).
 *
 * Rules asserted here (both arms of every conditional):
 *   - App refetches the signed-in user on every render when the browser holds an access token,
 *     and does not when it does not.
 *   - ProtectedRoute shows the page only to an identified user; a user who must change their
 *     password sees only that form; an unidentified user is sent to Login carrying the page
 *     they were after, unless the session was deliberately cleared, and is not redirected at
 *     all while the page is still loading.
 *   - The login modal stays out of the way on the login screen itself.
 *   - Each connected component reads the store slices it declares and its dispatchers raise the
 *     documented actions.
 *
 * Note: App's production-only console suppression (App.js line 45) is deliberately not exercised
 * — it permanently replaces every console method in the running process, which would silence the
 * test reporter itself.
 */

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

global.__connected = [];
global.__location = { pathname: '/app/Dtr' };

jest.mock('react-redux', () => {
    const actual = jest.requireActual('react-redux');
    return {
        ...actual,
        // Capture what each component asked the store for instead of wiring a real Provider.
        connect: (mapStateToProps, mapDispatchToProps) => (Component) => {
            global.__connected.push({ mapStateToProps, mapDispatchToProps });
            return Component;
        },
    };
});

jest.mock('react-router-dom', () => ({
    // react-router v5 wraps the render-prop result in a context Provider, where undefined is a
    // legal child that renders nothing; mirror that instead of returning undefined from a component.
    Route: ({ render: renderProp, children }) => {
        const out = renderProp ? renderProp({}) : children;
        return out === undefined ? null : out;
    },
    Redirect: ({ to }) => (
        <div data-testid="redirect">{typeof to === 'object' && to !== null ? JSON.stringify(to) : String(to)}</div>
    ),
    Link: ({ to, children }) => <a href={String(to)}>{children}</a>,
    useLocation: () => global.__location,
    useHistory: () => ({ push: jest.fn(), goBack: jest.fn() }),
    withRouter: (Component) => Component,
}));

jest.mock('../../../store/actions/userActions', () => ({
    fetchUser: jest.fn(() => ({ type: 'THUNK_FETCH_USER' })),
    logOut: jest.fn(() => ({ type: 'THUNK_LOG_OUT' })),
}));

jest.mock('../../../store/actions/filters/requestListActions', () => ({
    fetchStatusNumbers: jest.fn((params) => ({ type: 'THUNK_FETCH_STATUS_NUMBERS', params })),
}));

jest.mock('../../../store/actions/redirectActions', () => ({
    setRedirect: jest.fn((link) => ({ type: 'THUNK_SET_REDIRECT', link })),
    clearRedirect: jest.fn(() => ({ type: 'THUNK_CLEAR_REDIRECT' })),
}));

jest.mock('../../../components/Template/AlertContainer', () => () => <div data-testid="alert-container" />);
jest.mock('../../../components/Template/LoaderContainer', () => () => <div data-testid="loader-container" />);
jest.mock('../../../components/Template/ModalLoginContainer', () => () => <div data-testid="modal-login-container" />);
jest.mock('../../../config/RouteList', () => () => <div data-testid="route-list" />);
jest.mock('../../../components/ChangePasswordForm', () => (props) => (
    <div data-testid="change-password" data-forced={String(props.forceChangePassword)} />
));
jest.mock('../../../container/ModalLogin/ModalLogin', () => () => <div data-testid="modal-login" />);
jest.mock('../../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader: ({ children }) => <div>{children}</div>,
    Content: ({ children }) => <div>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody: ({ children }) => <div>{children}</div>,
    Row: ({ children }) => <div>{children}</div>,
    Col: ({ children }) => <div>{children}</div>,
}));

global.links = new Proxy({}, { get: (target, name) => '/x/' + String(name) });

const userActions = require('../../../store/actions/userActions');
const requestListActions = require('../../../store/actions/filters/requestListActions');
const redirectActions = require('../../../store/actions/redirectActions');

// Each require() below ends with the module's own connect() call, so the last captured entry
// belongs to that module.
const lastWiring = () => global.__connected[global.__connected.length - 1];

const App = require('../../../App').default;
const appWiring = lastWiring();

const ProtectedRoute = require('../../../config/ProtectedRoutes').default;
const protectedRouteWiring = lastWiring();

const ModalLoginContainer = require('../../../components/Template/ModalLoginContainer/ModalLoginContainer').default;
const modalLoginWiring = lastWiring();

require('../../../components/Template/AlertContainer/AlertContainer');
const alertWiring = lastWiring();

require('../../../components/Template/BackButton/BackButton');
const backButtonWiring = lastWiring();

require('../../../components/Template/DropDownMenu/DropDownMenu');
const dropDownWiring = lastWiring();

require('../../../components/Template/Wrapper/Wrapper');
const wrapperWiring = lastWiring();

const storeState = {
    user: { id: 7, first_name: 'Ana' },
    page: { isReloading: false },
    alert: { onShow: true, header: 'Saved' },
    settings: { profile_picture: 'BASE64' },
    dtr: { instance: {} },
    redirect: { run: false, link: null },
    modalLogin: { onShow: true },
};

beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    global.__location = { pathname: '/app/Dtr' };
});

describe('App — the shell', () => {
    test('the shell renders the loader, the alert banner, the login modal and the routes', () => {
        const { getByTestId } = render(<App fetchUser={jest.fn()} fetchStatusNumbers={jest.fn()} />);

        expect(getByTestId('loader-container')).toBeInTheDocument();
        expect(getByTestId('alert-container')).toBeInTheDocument();
        expect(getByTestId('modal-login-container')).toBeInTheDocument();
        expect(getByTestId('route-list')).toBeInTheDocument();
    });

    test('a browser holding an access token refetches the signed-in user', () => {
        localStorage.setItem('access_token', 'tok-123');
        const fetchUser = jest.fn();

        render(<App fetchUser={fetchUser} fetchStatusNumbers={jest.fn()} />);

        expect(fetchUser).toHaveBeenCalledTimes(1);
    });

    test('a browser with no access token refetches nothing', () => {
        const fetchUser = jest.fn();

        render(<App fetchUser={fetchUser} fetchStatusNumbers={jest.fn()} />);

        expect(fetchUser).not.toHaveBeenCalled();
    });

    test('the shell dispatcher for the user refetch raises the fetchUser thunk', () => {
        const dispatch = jest.fn();

        const props = appWiring.mapDispatchToProps(dispatch);
        props.fetchUser();

        expect(userActions.fetchUser).toHaveBeenCalledTimes(1);
        expect(dispatch).toHaveBeenCalledWith({ type: 'THUNK_FETCH_USER' });
    });

    test('the shell dispatcher for the pending counters asks for the team requests of page one', () => {
        const dispatch = jest.fn();

        const props = appWiring.mapDispatchToProps(dispatch);
        props.fetchStatusNumbers();

        expect(requestListActions.fetchStatusNumbers).toHaveBeenCalledWith({
            status: 'pending',
            valid_from: null,
            valid_to: null,
            department_id: null,
            name: null,
            page: 1,
            checkedList: [],
            isAll: false,
            action: null,
            request_type: 'all',
            bulk_action: null,
            url: 'my_team_requests',
        });
        expect(dispatch).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'THUNK_FETCH_STATUS_NUMBERS' }),
        );
    });

    test('the shell subscribes to no store slice of its own', () => {
        expect(appWiring.mapStateToProps).toBeNull();
    });
});

describe('ProtectedRoute — the route guard', () => {
    const guarded = (overrides) => render(
        <ProtectedRoute
            user={{ id: 7 }}
            page={{ isReloading: false }}
            location={{ pathname: '/app/MyTeam' }}
            computedMatch={{ params: { id: '7' } }}
            {...overrides}
        >
            <div data-testid="page">Team list</div>
        </ProtectedRoute>,
    );

    test('an identified user sees the guarded page', () => {
        const { getAllByTestId } = guarded();

        // cloneElement re-passes props.children, so a plain div fixture nests a copy of itself.
        expect(getAllByTestId('page')[0]).toBeInTheDocument();
    });

    test('a user who must change their password sees only the change-password form', () => {
        const { getByTestId, queryByTestId } = guarded({ user: { id: 7, force_change_password: true } });

        expect(getByTestId('change-password')).toHaveAttribute('data-forced', 'true');
        expect(queryByTestId('page')).toBeNull();
    });

    test('a user whose forced-change flag has been lowered sees the page again', () => {
        const { getAllByTestId, queryByTestId } = guarded({ user: { id: 7, force_change_password: false } });

        expect(getAllByTestId('page')[0]).toBeInTheDocument();
        expect(queryByTestId('change-password')).toBeNull();
    });

    test('an unidentified user is sent to Login carrying the page they were after', () => {
        const { getByTestId } = guarded({ user: {} });

        const target = JSON.parse(getByTestId('redirect').textContent);
        expect(target.pathname).toBe('/x/login');
        expect(target.search).toBe('?redirect=/app/MyTeam');
    });

    test('a deliberately cleared session is sent to Login with no return address', () => {
        const { getByTestId } = guarded({ user: { clearLoginParameters: true } });

        const target = JSON.parse(getByTestId('redirect').textContent);
        expect(target.pathname).toBe('/x/login');
        expect(target.search).toBeUndefined();
    });

    test('an unidentified user on a location with no path is sent to Login with an empty return address', () => {
        const { getByTestId } = guarded({ user: {}, location: {} });

        const target = JSON.parse(getByTestId('redirect').textContent);
        expect(target.search).toBe('?redirect=');
    });

    test('a page still loading is not redirected anywhere yet', () => {
        const { queryByTestId } = guarded({ user: {}, page: { isReloading: true } });

        expect(queryByTestId('redirect')).toBeNull();
        expect(queryByTestId('page')).toBeNull();
    });

    test('the guard reads the user and the page-loading slices', () => {
        expect(protectedRouteWiring.mapStateToProps(storeState)).toEqual({
            user: storeState.user,
            page: storeState.page,
        });
    });
});

describe('ModalLoginContainer — the session-expired modal', () => {
    test('an expired session inside the app shows the login modal', () => {
        global.__location = { pathname: '/app/Dtr' };

        const { getByTestId, getByText } = render(<ModalLoginContainer modalLogin={{ onShow: true }} />);

        expect(getByText('Login to Continue')).toBeInTheDocument();
        expect(getByTestId('modal-login')).toBeInTheDocument();
    });

    test('the modal stays hidden while it is not flagged to show', () => {
        global.__location = { pathname: '/app/Dtr' };

        const { queryByText } = render(<ModalLoginContainer modalLogin={{ onShow: false }} />);

        expect(queryByText('Login to Continue')).toBeNull();
    });

    test('the modal never appears on the login screen itself', () => {
        global.__location = { pathname: '/login' };

        const { container } = render(<ModalLoginContainer modalLogin={{ onShow: true }} />);

        expect(container.textContent).toBe('');
    });

    test('the modal never appears on the site root', () => {
        global.__location = { pathname: '/' };

        const { container } = render(<ModalLoginContainer modalLogin={{ onShow: true }} />);

        expect(container.textContent).toBe('');
    });

    test('the modal reads the modalLogin slice and can be opened or closed', () => {
        const dispatch = jest.fn();

        expect(modalLoginWiring.mapStateToProps(storeState)).toEqual({ modalLogin: storeState.modalLogin });

        const props = modalLoginWiring.mapDispatchToProps(dispatch);
        props.showModalLogin();
        props.hideModalLogin();

        expect(dispatch).toHaveBeenNthCalledWith(1, { type: 'SHOW_MODAL_LOGIN' });
        expect(dispatch).toHaveBeenNthCalledWith(2, { type: 'HIDE_MODAL_LOGIN' });
    });
});

describe('store wiring of the shell components', () => {
    test('the alert banner reads the alert slice and can hide itself or toggle its timeout', () => {
        const dispatch = jest.fn();

        expect(alertWiring.mapStateToProps(storeState)).toEqual({ alert: storeState.alert });

        const props = alertWiring.mapDispatchToProps(dispatch);
        props.hideAlert();
        props.toggleTimeOut();

        expect(dispatch).toHaveBeenNthCalledWith(1, { type: 'HIDE_ALERT' });
        expect(dispatch).toHaveBeenNthCalledWith(2, { type: 'TOGGLE_TIMEOUT' });
    });

    test('the back button reads the DTR and settings slices and can set a redirect', () => {
        const dispatch = jest.fn();

        expect(backButtonWiring.mapStateToProps(storeState)).toEqual({
            dtr: storeState.dtr,
            settings: storeState.settings,
        });

        backButtonWiring.mapDispatchToProps(dispatch).setRedirect('/app/Dashboard');

        expect(redirectActions.setRedirect).toHaveBeenCalledWith('/app/Dashboard');
        expect(dispatch).toHaveBeenCalledWith({ type: 'THUNK_SET_REDIRECT', link: '/app/Dashboard' });
    });

    test('the avatar menu reads the user and settings slices and can sign the user out', () => {
        const dispatch = jest.fn();

        expect(dropDownWiring.mapStateToProps(storeState)).toEqual({
            user: storeState.user,
            settings: storeState.settings,
        });

        dropDownWiring.mapDispatchToProps(dispatch).logOut();

        expect(userActions.logOut).toHaveBeenCalledTimes(1);
        expect(dispatch).toHaveBeenCalledWith({ type: 'THUNK_LOG_OUT' });
    });

    test('the page wrapper reads the redirect slice and can clear a followed redirect', () => {
        const dispatch = jest.fn();

        expect(wrapperWiring.mapStateToProps(storeState)).toEqual({ redirect: storeState.redirect });

        wrapperWiring.mapDispatchToProps(dispatch).clearRedirect();

        expect(redirectActions.clearRedirect).toHaveBeenCalledTimes(1);
        expect(dispatch).toHaveBeenCalledWith({ type: 'THUNK_CLEAR_REDIRECT' });
    });
});
