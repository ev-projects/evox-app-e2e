// evoxtest_FreshServiceTicketsDeep2.test.js
// Wave-1 interaction coverage for components/FreshService/FreshServiceTickets.js
// (29 Jul baseline: 196 uncovered lines / 23.7%). Drives the real component tree
// through the list → filter → table → details → reply/attachment flows with the
// API boundary mocked per-URL, so every switch arm and async branch executes.
//
// ADDITIVE ONLY — extends evoxtest_FreshServiceDeep_frontend.test.js, does not
// replace it. Menu: EV Assist → My Tickets (route: fresh_service_tickets).

jest.mock('@tinymce/tinymce-react', () => ({
  Editor: (props) => {
    if (props.onInit) {
      props.onInit({}, { setContent: () => {} });
    }
    return (
      <textarea
        data-testid="tinymce-editor"
        value={props.value}
        onChange={(e) => props.onEditorChange && props.onEditorChange(e.target.value, {})}
      />
    );
  },
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
import Formatter from '../../services/Formatter';
import FreshServiceTickets from '../../components/FreshService/FreshServiceTickets';

const renderWithStore = (ui) => render(
  <Provider store={store}><MemoryRouter>{ui}</MemoryRouter></Provider>
);

const baseUser = {
  id: 1, first_name: 'Test', last_name: 'Employee', department_main: 'Engineering',
  emp_num: '1001', country: 'Philippines', email: 'test.employee@eastvantage.com',
};

// TicketListPage reads workspace.Id / workspace.Name (capital keys)
const workspaces = [{ Id: 1, Name: 'IT Support' }, { Id: 2, Name: 'HR' }];

function loadWorkspaces() {
  store.dispatch({
    type: 'FETCH_WORKSPACES_SUCCESS',
    workspaces, categories: {}, sub_categories: {}, isLoaded: true,
  });
}

// mergeProps: mapStateToProps.user overwrites the `user` JSX prop (same trap the
// original Deep test documents for workspaces) — seed the real store's user instead.
function loadUser() {
  store.dispatch({ type: 'FETCH_USER_SUCCESS', user: baseUser, payload: {} });
}

// Five tickets spanning every status/priority/state switch arm:
//   status 2/3/4/5/99 → Open/Pending/Resolved/Closed/default(Open)
//   priority 1/2/3/4/99 → Low/Medium/High/Urgent/default(Medium)
//   id % 4 → New / Requester Respond / Response Due / Overdue
//   created_at valid / garbage / null → formatDate all arms
//   subject with <tags> → sanitizeInput strip arm; missing subject → 'No subject' arm
const ticketFixtures = [
  { id: 100, status: 2, priority: 1, subject: 'VPN <script>down</script>', created_at: '2026-07-01T10:00:00Z', email: 'a.b@ev.com' },
  { id: 101, status: 3, priority: 2, created_at: '2026-07-02T10:00:00Z', email: 'c.d@ev.com' },
  { id: 102, status: 4, priority: 3, subject: 'Laptop replacement', created_at: 'not-a-date', email: '' },
  { id: 103, status: 5, priority: 4, subject: 'Access request', created_at: null, email: 'e.f@ev.com' },
  { id: 104, status: 99, priority: 99, subject: 'Unknown status ticket', created_at: '2026-07-03T10:00:00Z', email: 'g.h@ev.com' },
];

const singleTicket = {
  id: 100, subject: 'VPN down', requester_id: 555, workspace_id: 1,
  description: '<p>Cannot connect to VPN</p>',
  attachments: [{ id: 9, name: 'screenshot.png', size: 2048, attachment_url: 'http://x/att/9' }],
};

const conversationFixtures = [
  {
    id: 1, bodyText: 'We are looking into it', created_at: '2026-07-01T11:00:00Z',
    cc_emails: ['cc.person@ev.com'],
    attachments: [{ id: 21, name: 'log.txt', size: 512, attachment_url: 'http://x/att/21' }],
  },
  { id: 2, body: null, createdAt: '2026-07-01T12:00:00Z' }, // → 'No content' arm, no CC suffix
];

// Per-URL API router; tests override individual routes to force error arms.
function routeApi(overrides = {}) {
  API.call.mockImplementation((req) => {
    const url = req.url || '';
    if (url.indexOf('/reply') !== -1) {
      return (overrides.reply || (() => Promise.resolve({ data: {} })))(req);
    }
    if (url.indexOf('/attachments/') !== -1) {
      return (overrides.attachments || (() => Promise.resolve({ data: { content: { files: ['stored-ref-1'] } } })))(req);
    }
    if (url.indexOf('/conversations/') !== -1) {
      return (overrides.conversations || (() => Promise.resolve({ data: { content: { conversations: conversationFixtures } } })))(req);
    }
    if (url.indexOf('my-tickets') !== -1) {
      return (overrides.list || (() => Promise.resolve({
        data: { content: { tickets: ticketFixtures, pagination: { currentPage: 2, totalPages: 3, hasPrevious: true, hasNext: true } } },
      })))(req);
    }
    if (/\/freshservice\/tickets\/\d+$/.test(url)) {
      return (overrides.single || (() => Promise.resolve({ data: { content: singleTicket } })))(req);
    }
    return Promise.resolve({ data: {} });
  });
}

function selectDepartment(container, value) {
  const departmentSelect = container.querySelectorAll('select')[0];
  fireEvent.change(departmentSelect, { target: { value: String(value) } });
}

beforeEach(() => {
  jest.clearAllMocks();
  loadWorkspaces();
  loadUser();
  routeApi();
});

describe('FreshServiceTickets — list view: filters and loading', () => {
  test('no department selected → no ticket fetch, empty state renders', async () => {
    const { findByText } = renderWithStore(<FreshServiceTickets user={baseUser} />);
    await findByText('No tickets found');
    const listCalls = API.call.mock.calls.filter((c) => (c[0].url || '').indexOf('my-tickets') !== -1);
    expect(listCalls.length).toBe(0);
  });

  test('selecting a department fetches tickets with workspaceId + userEmail params', async () => {
    const { container, findByText } = renderWithStore(<FreshServiceTickets user={baseUser} />);
    selectDepartment(container, 1);
    await findByText('Laptop replacement');
    const listCall = API.call.mock.calls.find((c) => (c[0].url || '').indexOf('my-tickets') !== -1);
    expect(listCall[0].url).toContain('workspaceId=1');
    expect(listCall[0].url).toContain('userEmail=test.employee%40eastvantage.com');
  });

  test('status filter change refetches with the chosen status', async () => {
    const { container, findByText } = renderWithStore(<FreshServiceTickets user={baseUser} />);
    selectDepartment(container, 1);
    await findByText('Laptop replacement');
    const statusSelect = container.querySelectorAll('select')[1];
    fireEvent.change(statusSelect, { target: { value: 'resolved' } });
    await findByText('Laptop replacement');
    const urls = API.call.mock.calls.map((c) => c[0].url || '');
    expect(urls.some((u) => u.indexOf('status=resolved') !== -1)).toBe(true);
  });

  test('list fetch failure renders the error message and dispatches alert_error', async () => {
    routeApi({ list: () => Promise.reject(new Error('HTTP 500')) });
    const { container, findByText } = renderWithStore(<FreshServiceTickets user={baseUser} />);
    selectDepartment(container, 1);
    await findByText(/Failed to load tickets/);
    expect(Formatter.alert_error).toHaveBeenCalled();
  });
});

describe('FreshServiceTickets — table badges cover every switch arm', () => {
  test('status, priority and state badges render for all five fixture arms', async () => {
    const { container, findByText, getByText, getAllByText } = renderWithStore(<FreshServiceTickets user={baseUser} />);
    selectDepartment(container, 1);
    await findByText('Laptop replacement');

    // status arms (2,3,4,5 + default) — the status DROPDOWN options also carry these
    // labels, so badges appear as extra occurrences: Open = option + 2 badges (status 2
    // and default 99), the rest = option + 1 badge.
    expect(getAllByText('Open').length).toBeGreaterThanOrEqual(3);
    expect(getAllByText('Pending').length).toBeGreaterThanOrEqual(2);
    expect(getAllByText('Resolved').length).toBeGreaterThanOrEqual(2);
    expect(getAllByText('Closed').length).toBeGreaterThanOrEqual(2);

    // priority arms (1..4 + default) — 'Medium' twice: priority 2 and default 99
    expect(getByText('Low')).toBeInTheDocument();
    expect(getAllByText('Medium').length).toBeGreaterThanOrEqual(2);
    expect(getByText('High')).toBeInTheDocument();
    expect(getByText('Urgent')).toBeInTheDocument();

    // state arms via id % 4 (ids 100 and 104 both map to 'New')
    expect(getAllByText('New').length).toBe(2);
    expect(getByText('Requester Respond')).toBeInTheDocument();
    expect(getByText('Response Due')).toBeInTheDocument();
    expect(getByText('Overdue')).toBeInTheDocument();

    // sanitizeInput stripped the <tags>; missing subject falls back
    expect(container.textContent).toContain('VPN scriptdown/script');
    expect(container.textContent).toContain('No subject');

    // formatDate invalid arms (garbage + null created_at)
    expect(getAllByText('Invalid Date').length).toBeGreaterThanOrEqual(2);

    // count chip
    expect(getByText('5 tickets')).toBeInTheDocument();
  });

  test('FINDING FS-PAG-1: Next/Previous clear the ticket list instead of paging (stale closure)', async () => {
    // FreshServiceTickets.js: `onPageChange = useCallback((page) => loadTickets(page), [])`
    // — EMPTY deps freeze the FIRST loadTickets closure, captured when filters.workspaceId
    // was still '' . That closure takes the else-branch (setTickets([]), setPagination(null)),
    // so clicking Next/Previous on a loaded list WIPES it and never requests the next page.
    // Prod-visible pagination breakage. Fix: deps [loadTickets]. This test characterizes
    // today's behavior and MUST be flipped to assert real paging once the bug is fixed.
    const { container, findByText, getByText, queryByText } = renderWithStore(<FreshServiceTickets user={baseUser} />);
    selectDepartment(container, 1);
    await findByText('Laptop replacement');
    // RTL 9 findBy* only re-checks on DOM mutations — pagination rendered in the same
    // commit as the table, so use the synchronous getByText here.
    getByText(/Page 2 of 3/);

    fireEvent.click(getByText('Next'));
    await findByText('No tickets found');          // list wiped by the stale closure
    expect(queryByText('Laptop replacement')).toBeNull();
    const urls = API.call.mock.calls.map((c) => c[0].url || '');
    expect(urls.some((u) => u.indexOf('page=3') !== -1)).toBe(false); // page fetch never happens
  });

  test('single-page result renders no pagination controls', async () => {
    routeApi({
      list: () => Promise.resolve({
        data: { content: { tickets: ticketFixtures.slice(0, 1), pagination: { currentPage: 1, totalPages: 1, hasPrevious: false, hasNext: false } } },
      }),
    });
    const { container, findByText, queryByText } = renderWithStore(<FreshServiceTickets user={baseUser} />);
    selectDepartment(container, 1);
    await findByText('1 tickets');
    expect(queryByText('Next')).toBeNull();
  });
});

describe('FreshServiceTickets — details view', () => {
  async function openDetails(utils) {
    selectDepartment(utils.container, 1);
    const subjectCell = await utils.findByText(/VPN scriptdown/);
    fireEvent.click(subjectCell.closest('tr'));
    await utils.findByText('Ticket #100');
    return utils;
  }

  test('row click loads the single ticket + conversations (CC line, attachments, No-content arm)', async () => {
    const utils = renderWithStore(<FreshServiceTickets user={baseUser} />);
    await openDetails(utils);

    await utils.findByText('VPN down');                 // refreshed subject from single-ticket GET
    await utils.findByText('We are looking into it');   // conversation body
    expect(utils.container.textContent).toContain('CC: cc.person@ev.com');
    expect(utils.container.textContent).toContain('No content'); // conv without body
    // attachment links contain name + <br> + formatBytes size in one element → regex match
    expect(utils.getByText(/screenshot\.png/)).toBeInTheDocument(); // ticket attachment
    expect(utils.getByText(/log\.txt/)).toBeInTheDocument();        // conversation attachment
  });

  test('conversations fetch failure dispatches alert_error, page still renders', async () => {
    routeApi({ conversations: () => Promise.reject(new Error('HTTP 502')) });
    const utils = renderWithStore(<FreshServiceTickets user={baseUser} />);
    await openDetails(utils);
    await utils.findByText('No conversations yet.');
    expect(Formatter.alert_error).toHaveBeenCalled();
  });

  // 'Add Reply' is both the section heading and the button label → target the submit button
  const submitButton = (utils) => utils.container.querySelector('button[type="submit"]');

  test('typing a reply enables submit; submit POSTs and reloads conversations', async () => {
    const utils = renderWithStore(<FreshServiceTickets user={baseUser} />);
    await openDetails(utils);

    expect(submitButton(utils)).toBeDisabled();

    fireEvent.change(utils.getByTestId('tinymce-editor'), { target: { value: 'Restart fixed it, thanks' } });
    expect(submitButton(utils)).not.toBeDisabled();

    fireEvent.click(submitButton(utils));
    await utils.findByText('We are looking into it');

    const replyCall = API.call.mock.calls.find((c) => (c[0].url || '').indexOf('/reply') !== -1);
    expect(replyCall[0].method).toBe('post');
    expect(replyCall[0].data.body).toBe('Restart fixed it, thanks');
    expect(replyCall[0].data.requester_id).toBe(555);
    const convReloads = API.call.mock.calls.filter((c) => (c[0].url || '').indexOf('/conversations/') !== -1);
    expect(convReloads.length).toBeGreaterThanOrEqual(2); // mount + post-reply reload
  });

  test('reply POST failure dispatches alert_error and re-enables the form', async () => {
    routeApi({ reply: () => Promise.reject(new Error('HTTP 422')) });
    const utils = renderWithStore(<FreshServiceTickets user={baseUser} />);
    await openDetails(utils);

    fireEvent.change(utils.getByTestId('tinymce-editor'), { target: { value: 'will fail' } });
    fireEvent.click(submitButton(utils));
    await utils.findByText('Ticket #100'); // page survives the failure
    expect(Formatter.alert_error).toHaveBeenCalled();
    expect(submitButton(utils).textContent).toBe('Add Reply'); // back from 'Adding Reply...'
  });

  test('attachment upload lists the file, remove button clears it into removed_attachments', async () => {
    const utils = renderWithStore(<FreshServiceTickets user={baseUser} />);
    await openDetails(utils);

    const fileInput = utils.container.querySelector('input[type="file"]');
    const file = new File(['dummy'], 'evidence.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await utils.findByText(/evidence\.png/);
    const uploadCall = API.call.mock.calls.find((c) => (c[0].url || '').indexOf('/attachments/') !== -1);
    expect(uploadCall[0].method).toBe('post');

    fireEvent.click(utils.getByText('❌'));
    expect(utils.queryByText(/evidence\.png/)).toBeNull();

    // removed ref travels with the next reply
    fireEvent.change(utils.getByTestId('tinymce-editor'), { target: { value: 'reply after removal' } });
    fireEvent.click(submitButton(utils));
    await utils.findByText('We are looking into it');
    const replyCall = API.call.mock.calls.find((c) => (c[0].url || '').indexOf('/reply') !== -1);
    expect(replyCall[0].data.removed_attachments).toEqual(['stored-ref-1']);
  });

  test('attachment upload failure dispatches alert_error and adds nothing', async () => {
    routeApi({ attachments: () => Promise.reject(new Error('HTTP 413')) });
    const utils = renderWithStore(<FreshServiceTickets user={baseUser} />);
    await openDetails(utils);

    const fileInput = utils.container.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [new File(['x'], 'too-big.bin')] } });
    await utils.findByText('Ticket #100');
    expect(Formatter.alert_error).toHaveBeenCalled();
    expect(utils.queryByText('too-big.bin')).toBeNull();
  });

  test('back button returns to the ticket list', async () => {
    const utils = renderWithStore(<FreshServiceTickets user={baseUser} />);
    await openDetails(utils);
    fireEvent.click(utils.getAllByText('← Back to My Tickets')[0]);
    await utils.findByText('My Tickets');
    expect(utils.queryByText('Ticket #100')).toBeNull();
  });
});
