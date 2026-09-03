// evoxtest_StaticPagesAndGridDeep.test.js
//
// SOURCE FILES UNDER TEST
//   src/container/ElSecureCoding/ElSecureCoding.js            (6 uncovered fns)
//   src/container/EmailNotFound/EmailNotFound.js              (6 uncovered fns)
//   src/container/PageNotFound/PageNotFound.js                (1 uncovered fn)
//   src/container/PageNotAllowed/PageNotAllowed.js            (1 uncovered fn)
//   src/container/PageLoadingCard.js/PageLoadingCard.js       (1 uncovered fn)
//   src/components/GridComponent/AdminLte.js                  (2 uncovered fns)
//
// MENU PATHS
//   ElSecureCoding : EV Learning -> Secure Coding   (route /app/EVLearning/Secure_Coding)
//   EmailNotFound  : reached after a Google sign-in with an unknown address (/email-not-found)
//   PageNotFound   : catch-all route for any unmatched URL
//   PageNotAllowed : rendered by Wrapper.js when the permission check denies the page
//   PageLoadingCard: skeleton placeholder shown while a page's data loads
//   AdminLte       : shared layout primitives imported by 102 screens
//
// WHY THESE WERE UNCOVERED
//   Nothing in the suite mounts these five terminal pages, and AdminLte's ContainerHeader
//   is mocked away by every component suite that imports it. The connect() closures
//   (mapStateToProps / mapDispatchToProps and the individual dispatch props inside them)
//   are separately uncovered because the identity-connect house mock skips them.
//
// The real global.links table is loaded rather than proxied so the navigation targets
// asserted here are the ones the app actually ships.
//
// FINDINGS
//   SC-DEAD-1  ElSecureCoding declares a validationSchema (yup), a `confirm` state field
//              and both tickDpa / showAlert dispatch props, but render() uses none of
//              them — the screen is a bare slide embed. Characterized below.
//   ALTE-DEAD-1 AdminLte's `Timepicker` is defined but absent from the export list, so no
//              importer can reach it. Not testable, reported only.

require('../../config/GlobalVariables');

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  // Identity connect that ALSO hands the two map functions back to the test, so the
  // wiring closures can be exercised without a live store.
  connect: (mapStateToProps, mapDispatchToProps) => (Component) => {
    Component.__mapStateToProps = mapStateToProps;
    Component.__mapDispatchToProps = mapDispatchToProps;
    return Component;
  },
}));
jest.mock('react-spring/renderprops', () => ({
  // Spring's real implementation drives requestAnimationFrame; render the children
  // render-prop once with the settled style so the assertions are deterministic.
  Spring: ({ children, to }) => children(to || {}),
}));
jest.mock('react-google-slides', () => () => <div data-testid="google-slides" />);
jest.mock('react-player/lazy', () => () => <div data-testid="react-player" />);
jest.mock('../../components/Template/Wrapper', () => ({ children }) => (
  <div data-testid="wrapper">{children}</div>
));
jest.mock('../../store/actions/profile/profileActions', () => ({
  tickDpa: jest.fn((id) => ({ type: 'STUB_TICK_DPA', id })),
}));
jest.mock('../../store/actions/settings/alertActions', () => ({
  showAlert: jest.fn((message, timeout) => ({ type: 'STUB_SHOW_ALERT', message, timeout })),
}));

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { MemoryRouter } from 'react-router-dom';

import { tickDpa } from '../../store/actions/profile/profileActions';
import { showAlert } from '../../store/actions/settings/alertActions';

import ElSecureCoding from '../../container/ElSecureCoding/ElSecureCoding';
import EmailNotFound from '../../container/EmailNotFound/EmailNotFound';
import PageNotFound from '../../container/PageNotFound/PageNotFound';
import PageNotAllowed from '../../container/PageNotAllowed/PageNotAllowed';
import PageLoadingCard from '../../container/PageLoadingCard.js/PageLoadingCard';
import { ContainerHeader, Content, Row, Col } from '../../components/GridComponent/AdminLte';

const renderRouted = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('EV Learning -> Secure Coding', () => {
  test('renders the refresher deck inside the shared page chrome with the course title', () => {
    const { getByTestId, getByText, container } = renderRouted(
      <ElSecureCoding user={{ id: 1, full_name: 'Test Employee' }} />
    );

    expect(getByTestId('wrapper')).toBeInTheDocument();
    expect(getByText('Secure Coding - A Refresher')).toBeInTheDocument();

    const deck = container.querySelector('iframe');
    expect(deck).not.toBeNull();
    expect(deck.getAttribute('src')).toContain('eastvantage-my.sharepoint.com');
    expect(deck.getAttribute('src')).toContain('action=embedview');
    expect(deck.getAttribute('width')).toBe('1280px');
  });

  // FINDING SC-DEAD-1: the page carries the machinery for an acknowledgement form —
  // `confirm` state, a yup validationSchema requiring the tickbox, and tickDpa/showAlert
  // dispatch props — but render() emits only the deck. There is no checkbox, no submit
  // button and no Formik form, so an employee can never acknowledge the refresher and
  // tickDpa can never fire from this screen. Asserting today's behaviour: when the
  // acknowledgement UI is restored this test fails and becomes the regression guard.
  test('_FINDING_SC-DEAD-1 the acknowledgement form is absent — no checkbox, no submit, tickDpa never dispatched', () => {
    const { container } = renderRouted(<ElSecureCoding user={{ id: 1 }} />);

    expect(container.querySelectorAll('input[type="checkbox"]').length).toBe(0);
    expect(container.querySelectorAll('button').length).toBe(0);
    expect(container.querySelectorAll('form').length).toBe(0);
    expect(tickDpa).not.toHaveBeenCalled();
    expect(showAlert).not.toHaveBeenCalled();
  });

  test('mapStateToProps exposes only the logged-in user', () => {
    const props = ElSecureCoding.__mapStateToProps({
      user: { id: 9, full_name: 'Ana Cruz' },
      settings: { theme: 'dark' },
    });

    expect(props).toEqual({ user: { id: 9, full_name: 'Ana Cruz' } });
  });

  test('mapDispatchToProps.tickDpa dispatches the tickDpa action for the given id', () => {
    const dispatch = jest.fn();
    ElSecureCoding.__mapDispatchToProps(dispatch).tickDpa(9);

    expect(tickDpa).toHaveBeenCalledWith(9);
    expect(dispatch).toHaveBeenCalledWith({ type: 'STUB_TICK_DPA', id: 9 });
  });

  test('mapDispatchToProps.showAlert forwards both the message and the timeout', () => {
    const dispatch = jest.fn();
    ElSecureCoding.__mapDispatchToProps(dispatch).showAlert('Saved', 3000);

    expect(showAlert).toHaveBeenCalledWith('Saved', 3000);
    expect(dispatch).toHaveBeenCalledWith({ type: 'STUB_SHOW_ALERT', message: 'Saved', timeout: 3000 });
  });
});

describe('Unknown Google account -> /email-not-found', () => {
  test('explains that the address is not linked to EVOX and offers the real login route', () => {
    const { getByText, container } = renderRouted(<EmailNotFound user={{}} />);

    expect(
      getByText(/Your email address is not linked to an EVOX account/)
    ).toBeInTheDocument();

    const backToLogin = getByText(/Go Back to Login Page/).closest('a');
    expect(backToLogin.getAttribute('href')).toBe('/login');
    expect(global.links.login).toBe('/login');
  });

  test('shows the branding and the policy footer links', () => {
    const { getByText, container } = renderRouted(<EmailNotFound user={{}} />);

    expect(getByText('Privacy Policy').getAttribute('href')).toBe(
      'https://eastvantage.com/privacy-policy'
    );
    expect(getByText('Terms & Condition').getAttribute('href')).toBe(
      'https://eastvantage.com/terms-and-condition'
    );
    expect(container.querySelectorAll('img').length).toBe(2); // EVOX logo + Eastvantage logo
  });

  test('mapStateToProps exposes the user and page slices', () => {
    const props = EmailNotFound.__mapStateToProps({
      user: { id: null },
      page: { title: 'Email not found' },
      settings: {},
    });

    expect(props).toEqual({ user: { id: null }, page: { title: 'Email not found' } });
  });

  test('mapDispatchToProps.showAlert dispatches showAlert with the message and timeout', () => {
    const dispatch = jest.fn();
    EmailNotFound.__mapDispatchToProps(dispatch).showAlert('Try again', 0);

    expect(showAlert).toHaveBeenCalledWith('Try again', 0);
    expect(dispatch).toHaveBeenCalledWith({ type: 'STUB_SHOW_ALERT', message: 'Try again', timeout: 0 });
  });
});

describe('Catch-all and permission-denied pages', () => {
  test('PageNotFound shows the 404 code and links back to the real dashboard route', () => {
    const { getByText, container } = renderRouted(<PageNotFound />);

    expect(getByText(/404/)).toBeInTheDocument();
    expect(getByText(/We can't seem to find the page you're looking for./)).toBeInTheDocument();
    expect(container.querySelector('.page-not-found-box')).not.toBeNull();
    expect(getByText(/Go back to Dashboard/).closest('a').getAttribute('href')).toBe('/app/Dashboard');
  });

  test('PageNotAllowed shows the 403 code and the same dashboard escape hatch', () => {
    const { getByText, container } = renderRouted(<PageNotAllowed />);

    expect(getByText(/403/)).toBeInTheDocument();
    expect(getByText(/You can't access this page!/)).toBeInTheDocument();
    expect(container.querySelector('.page-not-allowed-box')).not.toBeNull();
    expect(getByText(/Go back to Dashboard/).closest('a').getAttribute('href')).toBe('/app/Dashboard');
  });

  test('the two error pages are distinguishable — 404 copy never appears on the 403 page', () => {
    const notFound = renderRouted(<PageNotFound />);
    const notAllowed = renderRouted(<PageNotAllowed />);

    expect(notFound.container.textContent).toContain('404');
    expect(notFound.container.textContent).not.toContain('403');
    expect(notAllowed.container.textContent).toContain('403');
    expect(notAllowed.container.textContent).not.toContain('404');
  });

  test('PageLoadingCard renders three skeleton bars, one of them the header bar', () => {
    const { container } = render(<PageLoadingCard />);

    expect(container.querySelectorAll('.linear-background1').length).toBe(3);
    expect(container.querySelectorAll('.header-loader1').length).toBe(1);
  });
});

describe('AdminLte layout primitives', () => {
  test('ContainerHeader wraps its children in the AdminLTE content-header heading', () => {
    const { container, getByText } = render(<ContainerHeader>My Requests</ContainerHeader>);

    expect(container.querySelector('.content-header')).not.toBeNull();
    expect(container.querySelector('.container-fluid .row .col-sm-6')).not.toBeNull();
    const heading = getByText('My Requests');
    expect(heading.tagName).toBe('H1');
    expect(heading).toHaveClass('m-0', 'text-dark');
  });

  test('Content renders the column width, title and body, and omits the subtitle slot when unset', () => {
    const withSubtitle = render(
      <Content col="8" title="Overtime" subtitle={<span>filters</span>}>
        <p>body</p>
      </Content>
    );
    expect(withSubtitle.container.querySelector('.col-lg-8')).not.toBeNull();
    expect(withSubtitle.getByText('Overtime')).toHaveClass('card-title');
    expect(withSubtitle.getByText('filters')).toBeInTheDocument();
    expect(withSubtitle.getByText('body')).toBeInTheDocument();

    const withoutSubtitle = render(<Content col="12" title="Overtime"><p>body</p></Content>);
    expect(withoutSubtitle.container.querySelector('.col-lg-12')).not.toBeNull();
    expect(withoutSubtitle.container.querySelectorAll('.d-flex span').length).toBe(0);
  });

  test('Row and Col emit the bootstrap grid classes from the size prop', () => {
    const { container, getByText } = render(<Row><Col size="4">cell</Col></Row>);

    expect(container.querySelector('.row')).not.toBeNull();
    expect(getByText('cell')).toHaveClass('col-sm-4');
  });
});
