/**
 * EVOX — Jest: the page shell components
 *
 * Sources under test:
 *   src/components/Template/Wrapper/Wrapper.js
 *   src/components/Template/AlertContainer/AlertContainer.js
 *   src/components/Template/BackButton/BackButton.js
 *   src/components/Template/Paginate/Paginate.js
 *   src/components/Template/LoaderContainer/LoaderContainer.js
 *   src/components/Template/DropDownMenu/DropDownMenu.js
 *
 * Menu path: global — Wrapper guards every routed page, the alert banner, loader, paginator,
 *            back button and avatar menu are on every screen.
 *
 * Coverage before this file: Wrapper 12 uncovered branch arms, AlertContainer 5 uncovered
 *   functions + 1 branch, DropDownMenu 4 functions + 1 branch, BackButton 2 functions,
 *   Paginate 1 function + 1 branch, LoaderContainer 1 branch.
 *
 * Rules asserted here (both arms of every conditional):
 *   - Wrapper asks the level-and-feature gate when the page declares both, the feature-only or
 *     level-only gate when it declares one, and no gate at all when it declares neither; a
 *     refused gate renders the "not allowed" page instead of the page body.
 *   - A pending redirect wins over the page body, and the redirect is cleared as it is followed.
 *   - The alert banner auto-hides only when a non-zero timeout was requested.
 *   - The paginator shows First/Prev only past page 1 and Next/Last only before the last page,
 *     and never more than ten numbered pages.
 *   - The loader is suppressed on the Dashboard even while a request is in flight.
 *
 * Determinism: the alert auto-hide is driven with jest fake timers, never a real wait.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { Formik } from 'formik';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
}));

jest.mock('react-router-dom', () => ({
    Redirect: ({ to }) => <div data-testid="redirect">{String(to)}</div>,
    Link: ({ to, children, ...rest }) => <a href={String(to)} {...rest}>{children}</a>,
    useLocation: () => global.__location,
    useHistory: () => ({ push: jest.fn(), goBack: jest.fn() }),
}));

jest.mock('react-promise-tracker', () => ({
    usePromiseTracker: () => ({ promiseInProgress: global.__promiseInProgress }),
    trackPromise: (promise) => promise,
}));

jest.mock('react-loader-spinner', () => () => <div data-testid="spinner" />);

jest.mock('../../../services/Authenticator', () => ({
    __esModule: true,
    default: {
        scanLevel_Feature: jest.fn(() => true),
        scanFeature: jest.fn(() => true),
        scanLevel: jest.fn(() => true),
    },
}));

jest.mock('../../../container/PageNotAllowed', () => () => <div data-testid="not-allowed">Not allowed</div>);
jest.mock('../../../container/PageNotFound', () => () => <div data-testid="not-found">Not found</div>);

global.links = new Proxy({}, { get: (target, name) => '/x/' + String(name) });

const Authenticator = require('../../../services/Authenticator').default;
const Wrapper = require('../../../components/Template/Wrapper/Wrapper').default;
const AlertContainer = require('../../../components/Template/AlertContainer/AlertContainer').default;
const BackButton = require('../../../components/Template/BackButton/BackButton').default;
const Paginate = require('../../../components/Template/Paginate/Paginate').default;
const LoaderContainer = require('../../../components/Template/LoaderContainer/LoaderContainer').default;
const DropDownMenu = require('../../../components/Template/DropDownMenu/DropDownMenu').default;

const noRedirect = { run: false, link: undefined };

beforeEach(() => {
    jest.clearAllMocks();
    Authenticator.scanLevel_Feature.mockReturnValue(true);
    Authenticator.scanFeature.mockReturnValue(true);
    Authenticator.scanLevel.mockReturnValue(true);
    global.__location = { pathname: '/app/Dtr' };
    global.__promiseInProgress = false;
});

describe('Wrapper — the page access gate', () => {
    test('a page declaring both a level and a feature is checked against both', () => {
        const { getByText } = render(
            <Wrapper level="Supervisor" feature="dtr" redirect={noRedirect} clearRedirect={jest.fn()}>
                <p>Team DTR</p>
            </Wrapper>,
        );

        expect(Authenticator.scanLevel_Feature).toHaveBeenCalledWith('Supervisor', 'dtr');
        expect(Authenticator.scanFeature).not.toHaveBeenCalled();
        expect(Authenticator.scanLevel).not.toHaveBeenCalled();
        expect(getByText('Team DTR')).toBeInTheDocument();
    });

    test('a page declaring only a feature is checked against the feature list alone', () => {
        render(
            <Wrapper feature="dtr" redirect={noRedirect} clearRedirect={jest.fn()}>
                <p>My DTR</p>
            </Wrapper>,
        );

        expect(Authenticator.scanFeature).toHaveBeenCalledWith('dtr');
        expect(Authenticator.scanLevel_Feature).not.toHaveBeenCalled();
    });

    test('a page declaring only a level is checked against the level alone', () => {
        render(
            <Wrapper level="Manager" redirect={noRedirect} clearRedirect={jest.fn()}>
                <p>Reports</p>
            </Wrapper>,
        );

        expect(Authenticator.scanLevel).toHaveBeenCalledWith('Manager');
        expect(Authenticator.scanFeature).not.toHaveBeenCalled();
    });

    test('a page declaring neither is shown to everyone without consulting the gate', () => {
        const { getByText } = render(
            <Wrapper redirect={noRedirect} clearRedirect={jest.fn()}>
                <p>Dashboard</p>
            </Wrapper>,
        );

        expect(Authenticator.scanLevel_Feature).not.toHaveBeenCalled();
        expect(Authenticator.scanFeature).not.toHaveBeenCalled();
        expect(Authenticator.scanLevel).not.toHaveBeenCalled();
        expect(getByText('Dashboard')).toBeInTheDocument();
    });

    test('a refused level-and-feature gate replaces the page with the not-allowed screen', () => {
        Authenticator.scanLevel_Feature.mockReturnValue(false);

        const { queryByText, getByTestId } = render(
            <Wrapper level="Supervisor" feature="dtr" redirect={noRedirect} clearRedirect={jest.fn()}>
                <p>Team DTR</p>
            </Wrapper>,
        );

        expect(queryByText('Team DTR')).toBeNull();
        expect(getByTestId('not-allowed')).toBeInTheDocument();
    });

    test('a refused feature-only gate replaces the page with the not-allowed screen', () => {
        Authenticator.scanFeature.mockReturnValue(false);

        const { queryByText, getByTestId } = render(
            <Wrapper feature="payroll" redirect={noRedirect} clearRedirect={jest.fn()}>
                <p>Payroll</p>
            </Wrapper>,
        );

        expect(queryByText('Payroll')).toBeNull();
        expect(getByTestId('not-allowed')).toBeInTheDocument();
    });

    test('a refused level-only gate replaces the page with the not-allowed screen', () => {
        Authenticator.scanLevel.mockReturnValue(false);

        const { getByTestId } = render(
            <Wrapper level="Admin" redirect={noRedirect} clearRedirect={jest.fn()}>
                <p>Admin</p>
            </Wrapper>,
        );

        expect(getByTestId('not-allowed')).toBeInTheDocument();
    });
});

describe('Wrapper — pending redirects', () => {
    test('a pending redirect follows the stored link and clears it, hiding the page body', () => {
        const clearRedirect = jest.fn();

        const { getByTestId, queryByText } = render(
            <Wrapper redirect={{ run: true, link: '/app/Requests' }} clearRedirect={clearRedirect}>
                <p>Dashboard</p>
            </Wrapper>,
        );

        expect(clearRedirect).toHaveBeenCalledTimes(1);
        expect(getByTestId('redirect')).toHaveTextContent('/app/Requests');
        expect(queryByText('Dashboard')).toBeNull();
    });

    test('the previous path of the current location wins over the stored redirect link', () => {
        const { getByTestId } = render(
            <Wrapper
                location={{ previousPath: '/app/MyTeam' }}
                redirect={{ run: true, link: '/app/Requests' }}
                clearRedirect={jest.fn()}
            >
                <p>Dashboard</p>
            </Wrapper>,
        );

        expect(getByTestId('redirect')).toHaveTextContent('/app/MyTeam');
    });

    test('a redirect flagged to run with no link at all still renders the page', () => {
        const clearRedirect = jest.fn();

        const { getByText, queryByTestId } = render(
            <Wrapper redirect={{ run: true, link: undefined }} clearRedirect={clearRedirect}>
                <p>Dashboard</p>
            </Wrapper>,
        );

        expect(queryByTestId('redirect')).toBeNull();
        expect(getByText('Dashboard')).toBeInTheDocument();
        expect(clearRedirect).not.toHaveBeenCalled();
    });

    test('a stored link that is not flagged to run leaves the page in place', () => {
        const { getByText, queryByTestId } = render(
            <Wrapper redirect={{ run: false, link: '/app/Requests' }} clearRedirect={jest.fn()}>
                <p>Dashboard</p>
            </Wrapper>,
        );

        expect(queryByTestId('redirect')).toBeNull();
        expect(getByText('Dashboard')).toBeInTheDocument();
    });
});

describe('AlertContainer — the global banner', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    const shownAlert = (overrides) => ({
        onShow: true,
        variant: 'success',
        header: 'Saved',
        body: '',
        timeOut: 0,
        ...overrides,
    });

    test('a banner with a timeout hides itself once that time has passed, not before', () => {
        const hideAlert = jest.fn();

        render(<AlertContainer alert={shownAlert({ timeOut: 4500 })} hideAlert={hideAlert} />);

        jest.advanceTimersByTime(4499);
        expect(hideAlert).not.toHaveBeenCalled();

        jest.advanceTimersByTime(1);
        expect(hideAlert).toHaveBeenCalledTimes(1);
    });

    test('a banner pinned open with a zero timeout never hides itself', () => {
        const hideAlert = jest.fn();

        render(<AlertContainer alert={shownAlert({ timeOut: 0 })} hideAlert={hideAlert} />);

        jest.advanceTimersByTime(60000);
        expect(hideAlert).not.toHaveBeenCalled();
    });

    test('a hidden alert schedules nothing even when it carries a timeout', () => {
        const hideAlert = jest.fn();

        render(<AlertContainer alert={shownAlert({ onShow: false, timeOut: 3000 })} hideAlert={hideAlert} />);

        jest.advanceTimersByTime(60000);
        expect(hideAlert).not.toHaveBeenCalled();
    });

    test('a shown banner fades in and a hidden one fades out', () => {
        const shown = render(<AlertContainer alert={shownAlert()} hideAlert={jest.fn()} />);
        expect(shown.container.querySelector('.alert-pop-up')).toHaveClass('fadeIn');

        const hidden = render(
            <AlertContainer alert={shownAlert({ onShow: false })} hideAlert={jest.fn()} />,
        );
        expect(hidden.container.querySelector('.alert-pop-up')).toHaveClass('fadeOut');
    });

    test('a list of validation messages is rendered as one item per message', () => {
        const { container } = render(
            <AlertContainer
                alert={shownAlert({ body: ['Start date is required', 'End date is required'] })}
                hideAlert={jest.fn()}
            />,
        );

        const items = container.querySelectorAll('.alert-body li');
        expect(items).toHaveLength(2);
        expect(items[0]).toHaveTextContent('Start date is required');
        expect(items[1]).toHaveTextContent('End date is required');
    });

    test('a single message is rendered as one item', () => {
        const { container } = render(
            <AlertContainer alert={shownAlert({ body: 'Employee number already exists' })} hideAlert={jest.fn()} />,
        );

        const items = container.querySelectorAll('.alert-body li');
        expect(items).toHaveLength(1);
        expect(items[0]).toHaveTextContent('Employee number already exists');
    });

    test('an empty body renders no list at all and an empty header renders no heading', () => {
        const { container } = render(
            <AlertContainer alert={shownAlert({ header: '', body: '' })} hideAlert={jest.fn()} />,
        );

        expect(container.querySelectorAll('.alert-body ul')).toHaveLength(0);
        expect(container.querySelectorAll('.alert-heading')).toHaveLength(0);
    });

    test('dismissing the banner calls hideAlert', () => {
        const hideAlert = jest.fn();
        const { container } = render(<AlertContainer alert={shownAlert()} hideAlert={hideAlert} />);

        act(() => {
            fireEvent.click(container.querySelector('.close'));
        });

        expect(hideAlert).toHaveBeenCalledTimes(1);
    });
});

describe('BackButton', () => {
    test('clicking back returns to the previous page', () => {
        const goBack = jest.fn();

        const { getByText } = render(<BackButton history={{ goBack }} />);
        fireEvent.click(getByText('Back'));

        expect(goBack).toHaveBeenCalledTimes(1);
    });

    test('a caller-supplied style is applied and an absent one leaves the button unstyled', () => {
        const styled = render(<BackButton history={{ goBack: jest.fn() }} style={{ marginTop: '10px' }} />);
        expect(styled.container.querySelector('button')).toHaveStyle('margin-top: 10px');

        const plain = render(<BackButton history={{ goBack: jest.fn() }} />);
        expect(plain.container.querySelector('button').getAttribute('style')).toBeFalsy();
    });
});

describe('Paginate', () => {
    const paginated = (pagination) => render(
        <Formik initialValues={{ page: 1 }} onSubmit={jest.fn()}>
            {() => <form><Paginate pagination={pagination} /></form>}
        </Formik>,
    );

    test('the first page of many offers Next and Last but no Prev or First', () => {
        const { queryByText, getByText } = paginated({ current_page: 1, last_page: 5, has_next_page: true });

        expect(queryByText('Prev')).toBeNull();
        expect(queryByText('First')).toBeNull();
        expect(getByText('Next')).toBeInTheDocument();
        expect(getByText('Last')).toBeInTheDocument();
        expect(getByText('5')).toBeInTheDocument();
    });

    test('the last page of many offers Prev and First but no Next or Last', () => {
        const { getByText, queryByText } = paginated({ current_page: 5, last_page: 5, has_next_page: false });

        expect(getByText('Prev')).toBeInTheDocument();
        expect(getByText('First')).toBeInTheDocument();
        expect(queryByText('Next')).toBeNull();
        expect(queryByText('Last')).toBeNull();
    });

    test('a middle page offers all four navigation buttons', () => {
        const { getByText } = paginated({ current_page: 3, last_page: 5, has_next_page: true });

        ['First', 'Prev', 'Next', 'Last'].forEach((label) => {
            expect(getByText(label)).toBeInTheDocument();
        });
    });

    test('a single page of results offers no navigation buttons at all', () => {
        const { queryByText, getByText } = paginated({ current_page: 1, last_page: 1, has_next_page: false });

        ['First', 'Prev', 'Next', 'Last'].forEach((label) => {
            expect(queryByText(label)).toBeNull();
        });
        expect(getByText('1')).toBeInTheDocument();
    });

    test('a long report is capped at ten numbered pages per block', () => {
        const { container, queryByText } = paginated({ current_page: 1, last_page: 40, has_next_page: true });

        // 10 numbered pages + Next + Last
        expect(container.querySelectorAll('.page')).toHaveLength(12);
        expect(queryByText('10')).toBeInTheDocument();
        expect(queryByText('11')).toBeNull();
    });

    test('the second block of a long report starts at page eleven', () => {
        const { queryByText } = paginated({ current_page: 11, last_page: 40, has_next_page: true });

        expect(queryByText('10')).toBeNull();
        expect(queryByText('11')).toBeInTheDocument();
        expect(queryByText('20')).toBeInTheDocument();
        expect(queryByText('21')).toBeNull();
    });

    test('with no pagination loaded the control renders nothing to click', () => {
        const { container } = paginated(undefined);

        expect(container.querySelectorAll('.page')).toHaveLength(0);
    });

    test('clicking a page number puts that page into the form', () => {
        const ref = React.createRef();
        const { getByText } = render(
            <Formik innerRef={ref} initialValues={{ page: 1 }} onSubmit={jest.fn()}>
                {() => <form><Paginate pagination={{ current_page: 1, last_page: 5 }} /></form>}
            </Formik>,
        );

        fireEvent.click(getByText('3'));

        expect(ref.current.values.page).toBe(3);
    });

    test('clicking Next moves to the following page and Last jumps to the end', () => {
        const ref = React.createRef();
        const { getByText } = render(
            <Formik innerRef={ref} initialValues={{ page: 2 }} onSubmit={jest.fn()}>
                {() => <form><Paginate pagination={{ current_page: 2, last_page: 5 }} /></form>}
            </Formik>,
        );

        fireEvent.click(getByText('Next'));
        expect(ref.current.values.page).toBe(3);

        fireEvent.click(getByText('Last'));
        expect(ref.current.values.page).toBe(5);

        fireEvent.click(getByText('Prev'));
        expect(ref.current.values.page).toBe(1);

        fireEvent.click(getByText('First'));
        expect(ref.current.values.page).toBe(1);
    });
});

describe('LoaderContainer', () => {
    test('a request in flight on an ordinary page shows the spinner', () => {
        global.__promiseInProgress = true;
        global.__location = { pathname: '/app/Dtr' };

        const { queryByTestId } = render(<LoaderContainer />);

        expect(queryByTestId('spinner')).toBeInTheDocument();
    });

    test('a request in flight on the Dashboard shows no spinner', () => {
        global.__promiseInProgress = true;
        global.__location = { pathname: '/app/Dashboard' };

        const { queryByTestId } = render(<LoaderContainer />);

        expect(queryByTestId('spinner')).toBeNull();
    });

    test('no request in flight shows no spinner', () => {
        global.__promiseInProgress = false;
        global.__location = { pathname: '/app/Dtr' };

        const { queryByTestId } = render(<LoaderContainer />);

        expect(queryByTestId('spinner')).toBeNull();
    });
});

describe('DropDownMenu — the avatar menu', () => {
    test('a loaded user is greeted by name with their uploaded photo', () => {
        const { container } = render(
            <DropDownMenu
                user={{ id: 7, first_name: 'Ana', last_name: 'Cruz' }}
                settings={{ profile_picture: 'BASE64DATA' }}
                logOut={jest.fn()}
            />,
        );

        expect(container.querySelector('img').getAttribute('src')).toBe('data:image/jpg;base64,BASE64DATA');
        expect(container.querySelector('a').getAttribute('href')).toBe('/x/profile7');
    });

    test('a user with no uploaded photo falls back to the default avatar', () => {
        const { container } = render(
            <DropDownMenu user={{ id: 7, first_name: 'Ana', last_name: 'Cruz' }} settings={{}} logOut={jest.fn()} />,
        );

        expect(container.querySelector('img').getAttribute('src')).toBe('/images/default-user-image.png');
    });

    test('a user whose name has not arrived yet still renders the menu', () => {
        const { container, getByText } = render(
            <DropDownMenu user={{ id: 7, first_name: null, last_name: null }} settings={{}} logOut={jest.fn()} />,
        );

        expect(getByText('My Profile')).toBeInTheDocument();
        expect(container.querySelector('img').getAttribute('src')).toBe('/images/default-user-image.png');
    });

    test('choosing Log Out signs the user out', () => {
        const logOut = jest.fn();
        const { getByText } = render(
            <DropDownMenu
                user={{ id: 7, first_name: 'Ana', last_name: 'Cruz' }}
                settings={{}}
                logOut={logOut}
            />,
        );

        fireEvent.click(getByText('Log Out'));

        expect(logOut).toHaveBeenCalledTimes(1);
    });
});
