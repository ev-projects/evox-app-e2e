// evoxtest_FreshServiceUnreachableArms.test.js
//
// SOURCE FILES UNDER TEST
//   src/components/FreshService/FreshServiceForm.js     (6 uncovered fns / 25 branch arms)
//   src/components/FreshService/FreshServiceTickets.js  (13 uncovered fns / 34 branch arms —
//                                                        the largest single branch gap in the app)
//
// MENU PATH
//   EV Assist -> Raise a Ticket  (FreshServiceForm)
//   EV Assist -> My Tickets      (FreshServiceTickets, list + details/reply)
//
// WHY THESE WERE UNCOVERED — AND WHY THE NUMBER IS SO LARGE
//   Both files were assembled from the same draft and each kept a block of helpers and a
//   CC-autocomplete section that the shipped UI does not use. Reading every uncovered
//   function and branch line in the two files against the render tree:
//
//   FreshServiceForm.js
//     apiCall (13, with its .then 34 / .catch 38), getUserAvatarClass (45),
//     getUserInitials (56, 59) — declared, never referenced anywhere in the module.
//     Their internal guards are branch lines 14, 18, 31, 32, 35, 46, 52, 57.
//     Line 64  sanitizeInput's non-string guard: its only caller passes formData.subject,
//              which is initialised to '' and only ever assigned strings.
//     Line 99  'Priority must be selected': the select offers exactly 1/2/3/4 and its
//              onChange stores parseInt(value), so the guard can never be true.
//     Line 116 `props.workspaces || []`: the parent renders CreateTicketPage only when
//              props.workspaces.length > 0, so the fallback arm is unreachable.
//     Line 165 `if (skipSearchRef.current)`: the ref is created false and the only
//              assignment in the file sets it false again.
//     Lines 355 / 376 / 446 / 573  the Category, Sub-category, CC and submit error slots:
//              validateTicketData only ever writes userSubject, description, priority and
//              selectedWorkspace, so those four keys are never present on `errors`.
//
//   FreshServiceTickets.js
//     apiCall (29, .then 50, .catch 54), getUserAvatarClass (61), getUserInitials (72),
//     SafeTextRenderer (84) and buildSubjectPrefix (90) — the only mention of any of them
//     is inside the commented-out "Requester" table column at lines 321-328.
//     Their guards are branch lines 30, 34, 47, 48, 51, 62, 68, 73, 85, 91, 92, 95.
//     Lines 441 / 446 / 448 / 457  the CC-suggestion debounce effect: setCcInput is called
//              only from the CC input, and that whole block (lines 636-685) is commented
//              out, so ccInput can never leave ''.
//     Line 875 the `page = null` default on onPageChange: Pagination always calls it with
//              currentPage +/- 1.
//     Line 918 the trailing `: null` arm: currentView only becomes 'details' in
//              handleTicketSelect, which sets selectedTicket in the same commit.
//
//   None of this is testable by driving the UI, because no UI reaches it. What IS testable
//   is the *observable consequence* — that the screens never produce the output those
//   blocks exist to produce. That is what this suite pins, so the day someone wires the
//   avatar column or the CC field back up, these tests fail and say so.
//
// ADD-ONLY: complements evoxtest_FreshServiceFormDeep2 and evoxtest_FreshServiceTicketsDeep2,
// which cover the live cascade, validation, upload, reply and pagination paths.
//
// FINDINGS
//   FS-FORM-DEAD-1  Four of the eight error slots the create-ticket form renders can never
//                   be filled; the Category / Sub-category / CC-emails / submit errors are
//                   dead markup.
//   FS-FORM-DEAD-2  'Priority must be selected' is unreachable — the control cannot produce
//                   an invalid priority.
//   FS-FORM-DEAD-3  apiCall / getUserAvatarClass / getUserInitials are unreferenced in
//                   FreshServiceForm.js (dead module-private helpers).
//   FS-TICKETS-DEAD-1 The reply screen's CC-emails autocomplete is commented out, so the
//                   1-second debounce effect and its /freshservice/users/suggestions call
//                   can never run from My Tickets.
//   FS-TICKETS-DEAD-2 apiCall / getUserAvatarClass / getUserInitials / SafeTextRenderer /
//                   buildSubjectPrefix are unreferenced in FreshServiceTickets.js; the
//                   Requester column they served is commented out of the table.

jest.mock('@tinymce/tinymce-react', () => ({
  Editor: (props) => (
    <textarea
      data-testid="tinymce-editor"
      value={props.value}
      onChange={(e) => props.onEditorChange && props.onEditorChange(e.target.value, {})}
    />
  ),
}));
jest.mock('../../store/actions/freshservice/freshServiceActions', () => ({
  fetchWorkSpaces: (...a) => ({ type: 'STUB_FETCH_WORKSPACES', a }),
}));
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/GridComponent/AdminLte', () => ({
  ContainerHeader: ({ children }) => <div>{children}</div>,
  Content: ({ children }) => <div>{children}</div>,
  ContainerWrapper: ({ children }) => <div>{children}</div>,
  ContainerBody: ({ children }) => <div>{children}</div>,
}));
jest.mock('../../services/API', () => ({ call: jest.fn() }));
jest.mock('../../services/Formatter', () => ({
  alert_error: jest.fn(() => ({ type: 'STUB_ALERT_ERROR' })),
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import store from '../../store';
import API from '../../services/API';
import FreshServiceForm from '../../components/FreshService/FreshServiceForm';
import FreshServiceTickets from '../../components/FreshService/FreshServiceTickets';

window.scrollTo = jest.fn();

const renderWithStore = (ui) => render(
  <Provider store={store}><MemoryRouter>{ui}</MemoryRouter></Provider>
);

const baseUser = {
  id: 1, first_name: 'Test', last_name: 'Employee', department_main: 'Engineering',
  emp_num: '1001', country: 'Philippines', email: 'test.employee@eastvantage.com',
};

const workspaces = [{ Id: 1, Name: 'IT Support' }, { Id: 2, Name: 'HR' }];
const categories = { 1: [{ Id: 11, CategoryName: 'Hardware' }] };
const sub_categories = { 11: [{ Id: 111, SubCategoryName: 'Laptop' }] };

function seedStore() {
  store.dispatch({ type: 'FETCH_USER_SUCCESS', user: baseUser, payload: {} });
  store.dispatch({
    type: 'FETCH_WORKSPACES_SUCCESS',
    workspaces, categories, sub_categories, isLoaded: true,
  });
}

const singleTicket = {
  id: 100, subject: 'VPN down', requester_id: 555, workspace_id: 1,
  description: '<p>Cannot connect to VPN</p>', attachments: [],
};

function routeApi(overrides = {}) {
  API.call.mockImplementation((req) => {
    const url = req.url || '';
    if (url.indexOf('/users/suggestions') !== -1) {
      return Promise.resolve({ data: ['Gary Aure <gary.aure@eastvantage.com>'] });
    }
    if (url.indexOf('/reply') !== -1) return Promise.resolve({ data: {} });
    if (url.indexOf('/conversations/') !== -1) {
      return Promise.resolve({ data: { content: { conversations: [] } } });
    }
    if (url.indexOf('my-tickets') !== -1) {
      return Promise.resolve({
        data: { content: { tickets: [{ id: 100, status: 2, priority: 2, subject: 'VPN down', created_at: '2026-07-01T10:00:00Z', email: 'a.b@ev.com' }], pagination: null } },
      });
    }
    if (/\/freshservice\/tickets\/\d+$/.test(url)) {
      return Promise.resolve({ data: { content: singleTicket } });
    }
    if (url === '/freshservice/tickets') {
      return (overrides.create || (() => Promise.resolve({ data: { content: { id: 12345 } } })))(req);
    }
    return Promise.resolve({ data: {} });
  });
}

function selectByLabel(container, labelText) {
  const labels = Array.from(container.querySelectorAll('label.form-label'));
  const label = labels.find((l) => l.textContent === labelText);
  return label ? label.parentElement.querySelector('select') : null;
}

const errorTexts = (container) =>
  Array.from(container.querySelectorAll('.error-message')).map((n) => n.textContent);

const suggestionCalls = () =>
  API.call.mock.calls.filter((c) => (c[0].url || '').indexOf('/users/suggestions') !== -1);

beforeEach(() => {
  jest.clearAllMocks();
  seedStore();
  routeApi();
});

describe('EV Assist -> Raise a Ticket: which validation errors the form can actually raise', () => {
  test('submitting a blank ticket raises exactly the subject, description and department errors', () => {
    const { container } = renderWithStore(<FreshServiceForm user={baseUser} />);
    fireEvent.submit(container.querySelector('form'));

    expect(errorTexts(container).sort()).toEqual([
      '⚠️ Description is required',
      '⚠️ Subject must be at least 5 characters',
      '⚠️ Workspace must be selected',
    ]);
  });

  test('filling the subject and description down to one remaining problem leaves only that error', () => {
    const { container, getByPlaceholderText } = renderWithStore(<FreshServiceForm user={baseUser} />);
    fireEvent.change(getByPlaceholderText('Brief description'), {
      target: { value: 'Cannot reach the VPN gateway' },
    });
    fireEvent.change(container.querySelector('[data-testid="tinymce-editor"]'), {
      target: { value: 'The VPN client times out on connect.' },
    });
    fireEvent.submit(container.querySelector('form'));

    expect(errorTexts(container)).toEqual(['⚠️ Workspace must be selected']);
  });

  // FINDING FS-FORM-DEAD-1: the form renders eight error slots but validateTicketData
  // writes only four keys (userSubject, description, priority, selectedWorkspace). The
  // Category, Sub-category, CC-emails and submit slots are markup that can never appear.
  // Driven here with a department chosen and its category left unselected — the state that
  // would raise "Category must be selected" if the validator knew about it.
  test('_FINDING_FS-FORM-DEAD-1 leaving the Category unselected raises no category error', () => {
    const { container } = renderWithStore(<FreshServiceForm user={baseUser} />);
    fireEvent.change(selectByLabel(container, 'EV Department *'), { target: { value: '1' } });

    // the cascade did reveal the Category select, so the field really is on screen
    expect(selectByLabel(container, 'Category *')).not.toBeNull();

    fireEvent.submit(container.querySelector('form'));

    const errors = errorTexts(container);
    expect(errors.some((t) => t.indexOf('Category') !== -1)).toBe(false);
    expect(errors.some((t) => t.indexOf('CC') !== -1)).toBe(false);
    expect(errors.some((t) => t.indexOf('❌') !== -1)).toBe(false); // the submit slot
    expect(errors.sort()).toEqual([
      '⚠️ Description is required',
      '⚠️ Subject must be at least 5 characters',
    ]);
  });

  // FINDING FS-FORM-DEAD-2: the priority guard `!data.priority || ![1,2,3,4].includes(...)`
  // cannot fire — the select offers only those four values and its onChange stores
  // parseInt(value), so every reachable state is valid.
  test('_FINDING_FS-FORM-DEAD-2 every priority the control offers is accepted and never raises the priority error', () => {
    const { container } = renderWithStore(<FreshServiceForm user={baseUser} />);
    const priority = selectByLabel(container, 'Priority *');

    expect(Array.from(priority.options).map((o) => o.value)).toEqual(['1', '2', '3', '4']);
    expect(Array.from(priority.options).map((o) => o.text)).toEqual(['Low', 'Medium', 'High', 'Urgent']);

    ['1', '2', '3', '4'].forEach((value) => {
      fireEvent.change(priority, { target: { value } });
      fireEvent.submit(container.querySelector('form'));
      expect(errorTexts(container).some((t) => t.indexOf('Priority') !== -1)).toBe(false);
    });
  });

  test('a fully valid ticket posts the chosen priority as an integer, never as the select string', async () => {
    const { container, findByText, getByPlaceholderText } = renderWithStore(<FreshServiceForm user={baseUser} />);
    fireEvent.change(selectByLabel(container, 'EV Department *'), { target: { value: '1' } });
    fireEvent.change(getByPlaceholderText('Brief description'), {
      target: { value: 'Cannot reach the VPN gateway' },
    });
    fireEvent.change(container.querySelector('[data-testid="tinymce-editor"]'), {
      target: { value: 'The VPN client times out on connect.' },
    });
    fireEvent.change(selectByLabel(container, 'Priority *'), { target: { value: '4' } });
    fireEvent.submit(container.querySelector('form'));

    await findByText(/EV Assist has logged your request/);
    const createCall = API.call.mock.calls.find((c) => c[0].url === '/freshservice/tickets');
    expect(createCall[0].data.priority).toBe(4);
    expect(createCall[0].data.status).toBe(2);
  });
});

describe('EV Assist -> Raise a Ticket: the helpers the module never calls', () => {
  // FINDING FS-FORM-DEAD-3: getUserAvatarClass / getUserInitials exist to render a
  // requester avatar; nothing in the form renders one. apiCall duplicates the shared API
  // service and is never called. Pinning the observable consequence.
  test('_FINDING_FS-FORM-DEAD-3 the form draws no requester avatar and issues no direct fetch', () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn();
    const { container } = renderWithStore(<FreshServiceForm user={baseUser} />);

    expect(container.querySelectorAll('.user-avatar').length).toBe(0);
    expect(container.querySelectorAll('[class*="avatar-"]').length).toBe(0);
    expect(global.fetch).not.toHaveBeenCalled(); // apiCall is the only fetch() user

    global.fetch = originalFetch;
  });
});

describe('EV Assist -> My Tickets: the CC autocomplete that is commented out', () => {
  async function openDetails() {
    const utils = renderWithStore(<FreshServiceTickets user={baseUser} />);
    fireEvent.change(utils.container.querySelectorAll('select')[0], { target: { value: '1' } });
    const subjectCell = await utils.findByText(/VPN down/);
    fireEvent.click(subjectCell.closest('tr'));
    await utils.findByText('Ticket #100');
    return utils;
  }

  // FINDING FS-TICKETS-DEAD-1: TicketDetailsPage keeps ccInput/ccSuggestions state, a
  // 1-second debounce effect and a /freshservice/users/suggestions call, but the input that
  // would set ccInput is inside the commented-out CC block. With no way to change ccInput
  // the effect can only ever take its "empty input" arm, so the debounce, the request and
  // the suggestion list are unreachable from this screen. (The same feature IS live on the
  // Raise a Ticket form — see evoxtest_FreshServiceFormDeep2.)
  test('_FINDING_FS-TICKETS-DEAD-1 the reply screen offers no CC field and asks for no suggestions', async () => {
    const utils = await openDetails();

    expect(utils.queryByPlaceholderText('Type to search')).toBeNull();
    expect(utils.container.querySelectorAll('.cc-email-autocomplete').length).toBe(0);
    expect(utils.container.querySelectorAll('.cc-suggestions').length).toBe(0);
    expect(utils.container.querySelectorAll('.cc-tag').length).toBe(0);
    expect(suggestionCalls().length).toBe(0);
  });

  test('a reply therefore always posts an empty cc_emails list', async () => {
    const utils = await openDetails();
    fireEvent.change(utils.getByTestId('tinymce-editor'), { target: { value: 'Restart fixed it' } });
    fireEvent.click(utils.container.querySelector('button[type="submit"]'));

    await utils.findByText('Ticket #100');
    const replyCall = API.call.mock.calls.find((c) => (c[0].url || '').indexOf('/reply') !== -1);
    expect(replyCall[0].data.cc_emails).toEqual([]);
    expect(suggestionCalls().length).toBe(0);
  });

  // FINDING FS-TICKETS-DEAD-2: the ticket table's Requester column — the only consumer of
  // getUserAvatarClass, getUserInitials and SafeTextRenderer — is commented out, and
  // buildSubjectPrefix belongs to the create form, not this screen.
  test('_FINDING_FS-TICKETS-DEAD-2 the ticket table carries no requester column and no avatar', async () => {
    const utils = renderWithStore(<FreshServiceTickets user={baseUser} />);
    fireEvent.change(utils.container.querySelectorAll('select')[0], { target: { value: '1' } });
    await utils.findByText(/VPN down/);

    const headers = Array.from(utils.container.querySelectorAll('thead th')).map((th) => th.textContent);
    expect(headers).toEqual(['Status', 'Created Date', 'Subject', 'State', 'Priority']);
    expect(headers).not.toContain('Requester');
    expect(utils.container.querySelectorAll('.user-avatar').length).toBe(0);
    // the requester e-mail is on the fixture but never rendered
    expect(utils.container.textContent).not.toContain('a.b@ev.com');
  });
});
