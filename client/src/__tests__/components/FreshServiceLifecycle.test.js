/**
 * FreshServiceLifecycle.test.js
 *
 * SOURCE FILES UNDER TEST
 *   1. src/components/FreshService/FreshServiceTickets.js
 *      Menu: EV Assist -> My Tickets            (list + filters + pagination + ticket detail/reply)
 *      29-Jul coverage: 23.7%  (largest single uncovered file in the client)
 *   2. src/components/FreshService/FreshServiceForm.js
 *      Menu: EV Assist -> Raise a Ticket        (create-ticket form + validation + attachments + CC)
 *      29-Jul coverage: 29.1%
 *   Together ~330 uncovered lines on the 29-Jul run.
 *
 * Neither file exports its inner pages (TicketListPage / Pagination / TicketDetailsPage /
 * CreateTicketPage / validateTicketData), so everything below is driven through the connected
 * default export with `connect` stubbed to a pass-through - exactly how the real screen behaves.
 *
 * FINDINGS (each is CHARACTERISED - the test asserts what the code does TODAY, it does not
 * endorse it, and no application source was modified):
 *
 *   FST-PAGE-STALE  FreshServiceTickets.js:879  `onPageChange = useCallback(fn, [])` captures the
 *                   FIRST `loadTickets`, i.e. the one closed over `filters.workspaceId === ''`.
 *                   Clicking "Next" therefore takes the no-workspace branch and WIPES the ticket
 *                   list instead of fetching page 2. Pagination is functionally dead.
 *
 *   FST-ERRMSG      FreshServiceTickets.js:849  the catch does `setTicketsError(e.message)`, but
 *                   API.check_error/format resolves every rejection to {status,statusText,data,
 *                   headers}, which has no `.message`. ticketsError is therefore always undefined,
 *                   the `error && <banner>` gate never opens, and a hard 500 is displayed to the
 *                   user as an ordinary "No tickets found" empty state. The error banner on line
 *                   279 is unreachable in production.
 *
 *   FST-REPLYATT    FreshServiceTickets.js:531  handleReplySubmit's `.finally` clears attachments,
 *                   attachmentsValues and removedAttachments on FAILURE as well as on success, so a
 *                   failed reply silently discards files the user already uploaded to the server.
 *
 *   FST-REPLYOBJ    FreshServiceTickets.js:506  the success path calls setAttachments({...}) with an
 *                   OBJECT, not an array; only the later `.finally([])` stops `attachments.length`
 *                   from being undefined.  (asserted indirectly via FST-REPLYATT)
 *
 *   FSF-PLACEHOLDER FreshServiceForm.js:346  the department <select> stores the OPTION TEXT as
 *                   `selectedWorkspace`. Re-selecting the placeholder row stores the literal string
 *                   "Select Department", which is truthy, so `!data.selectedWorkspace` never fires -
 *                   the form submits with workspace_id: '' and a subject prefixed
 *                   "[Select Department] | | - ".
 *
 *   FSF-DEADCAT     FreshServiceForm.js:13/110  `WORKSPACE_CATEGORIES` is initialised to {} and
 *                   never assigned, so every category/sub-category validation branch in
 *                   validateTicketData (lines 110-130) is unreachable dead code: a ticket can always
 *                   be submitted with no category chosen.
 *
 *   FSF-RESET       FreshServiceForm.js:235  changing department resets the category NAME
 *                   (`selectedSubCategory`) but not `selectedSubCategoryId`, so the Category dropdown
 *                   can still show a highlighted selection that is absent from the subject prefix.
 *
 *   FSF-CCEMPTY     FreshServiceForm.js:459  a CC suggestion without an `<email>` part yields
 *                   `email_add = ''`, which is not de-duplicated against the empty list, so clicking
 *                   it adds a BLANK cc tag that is then sent in cc_emails.
 *
 * ADDITIVE ONLY - no existing test touched, no application code changed.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

/* ------------------------------------------------------------------ redux pass-through */

const mockDispatch = jest.fn((a) => a);
jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => mockDispatch,
}));

/* ------------------------------------------------------------------ layout stubs */

jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader: ({ children }) => <div>{children}</div>,
    Content: ({ children }) => <div>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody: ({ children }) => <div>{children}</div>,
    Row: ({ children }) => <div>{children}</div>,
    Col: ({ children }) => <div>{children}</div>,
}));
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);

/* ------------------------------------------------------------------ TinyMCE stub
 * Rendered as a plain <textarea>. It reproduces the two contract points the screens rely on:
 *   - onEditorChange(newContent, editor) on every keystroke
 *   - onInit(evt, editor) once on mount  (CreateTicketPage uses it to inject the signature)
 */
jest.mock('@tinymce/tinymce-react', () => {
    const R = require('react');
    return {
        Editor: (props) => {
            const initRef = R.useRef(false);
            R.useEffect(() => {
                if (initRef.current) return;
                initRef.current = true;
                if (props.onInit) props.onInit({}, { setContent: jest.fn() });
            }, []);
            return R.createElement('textarea', {
                'data-testid': 'tinymce',
                value: props.value || '',
                onChange: (e) => props.onEditorChange && props.onEditorChange(e.target.value, {}),
            });
        },
    };
});

/* ------------------------------------------------------------------ service stubs */

jest.mock('../../services/API', () => ({ call: jest.fn() }));
jest.mock('../../services/Formatter', () => ({
    alert_error: jest.fn((e) => ({ type: 'SHOW_ALERT', error: e })),
}));
jest.mock('../../store/actions/freshservice/freshServiceActions', () => ({
    fetchWorkSpaces: jest.fn(() => ({ type: 'FETCH_WORKSPACES_THUNK' })),
}));

const API = require('../../services/API');
const Formatter = require('../../services/Formatter');
const { fetchWorkSpaces } = require('../../store/actions/freshservice/freshServiceActions');

// Real Helper on purpose - formatBytes output is part of what we assert.
const { formatBytes } = require('../../services/Helper');

const FreshServiceTickets = require('../../components/FreshService/FreshServiceTickets').default;
const FreshServiceForm = require('../../components/FreshService/FreshServiceForm').default;

/* ------------------------------------------------------------------ fixtures + helpers */

global.links = new Proxy({}, { get: () => '/x/' });

const USER = {
    id: 7,
    email: 'vishnu.p@eastvantage.com',
    first_name: 'Vishnu',
    last_name: 'Prakash',
    department_main: 'Delivery',
    emp_num: 'EV-1234',
    country: 'India',
};

const WORKSPACES = [
    { Id: '2', Name: 'IT Support' },
    { Id: '5', Name: 'HR Services' },
];

// props.categories is keyed by workspace id; props.sub_categories by category id.
// Note '10' deliberately exists under BOTH departments - that is what makes FSF-RESET visible.
const CATEGORIES = {
    '2': [{ Id: '10', CategoryName: 'Hardware' }, { Id: '11', CategoryName: 'Software' }],
    '5': [{ Id: '10', CategoryName: 'Payroll' }],
};
const SUB_CATEGORIES = {
    '10': [{ Id: '100', SubCategoryName: 'Printer' }, { Id: '101', SubCategoryName: 'Laptop' }],
    '11': [],
};

const ticket = (over = {}) => ({
    id: 101,
    subject: 'Printer jammed',
    status: 2,
    priority: 2,
    created_at: '2026-07-01T10:00:00.000Z',
    email: 'vishnu.p@eastvantage.com',
    requester_id: 55,
    workspace_id: 2,
    ...over,
});

const ok = (content) => () => Promise.resolve({ data: { content } });
const fail = (err) => () => Promise.reject(err);

/**
 * Routes API.call by url. Every handler is a function of the axios-ish config, so a test can both
 * decide the response AND inspect the exact request the screen built.
 */
function routeApi(handlers = {}) {
    API.call.mockImplementation((cfg) => {
        const url = cfg.url || '';
        if (url.includes('my-tickets')) return (handlers.list || ok({ tickets: [], pagination: null }))(cfg);
        if (url.includes('/conversations')) return (handlers.convos || ok({ conversations: [] }))(cfg);
        if (url.includes('/reply')) return (handlers.reply || ok({}))(cfg);
        if (url.includes('/attachments')) return (handlers.attach || ok({ files: ['uploads/x'] }))(cfg);
        if (url.includes('suggestions')) return (handlers.suggest || (() => Promise.resolve({ data: [] })))(cfg);
        if (url === '/freshservice/tickets') return (handlers.create || ok({ id: 999 }))(cfg);
        if (/^\/freshservice\/tickets\/\d+$/.test(url)) return (handlers.detail || ok(ticket()))(cfg);
        return Promise.resolve({ data: { content: {} } });
    });
}

const flush = async () => {
    await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
    });
};

const callsTo = (fragment) =>
    API.call.mock.calls.map((c) => c[0]).filter((c) => (c.url || '').includes(fragment));

// '/freshservice/tickets' is a prefix of the attachment-upload url, so create-ticket assertions
// have to match the url exactly.
const createCalls = () =>
    API.call.mock.calls.map((c) => c[0]).filter((c) => c.url === '/freshservice/tickets');

const renderTickets = (over = {}) =>
    render(<FreshServiceTickets user={USER} workspaces={WORKSPACES} workspacesLoaded={true} {...over} />);

const renderForm = (over = {}) =>
    render(
        <FreshServiceForm
            user={USER}
            workspaces={WORKSPACES}
            categories={CATEGORIES}
            sub_categories={SUB_CATEGORIES}
            workspacesLoaded={true}
            {...over}
        />
    );

// the two filter dropdowns on the list screen, in DOM order
const filterSelects = (c) => c.querySelectorAll('.filters-fs select.form-select');

// find a .form-group by any of its labels, then dig out the control
const group = (c, labelText) =>
    Array.from(c.querySelectorAll('.form-group')).find((gr) =>
        Array.from(gr.querySelectorAll('label.form-label')).some((l) => l.textContent === labelText)
    );

const errorTexts = (c) => Array.from(c.querySelectorAll('.error-message')).map((e) => e.textContent);

const setFiles = (input, files) => {
    Object.defineProperty(input, 'files', { value: files, configurable: true });
    fireEvent.change(input);
};

const PDF = () => new File(['pdf-bytes'], 'invoice.pdf', { type: 'application/pdf' });

beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    window.scrollTo = jest.fn();
    routeApi();
});

afterEach(() => {
    jest.useRealTimers();
});

/* =================================================================================
 * PART 1 - FreshServiceTickets: mount gate + ticket load
 * ================================================================================= */

describe('EV Assist -> My Tickets : mount gate and ticket load', () => {

    it('shows the workspace-categories loader and no ticket table until workspaces have loaded', () => {
        const { container, getByText } = renderTickets({ workspacesLoaded: false });

        expect(getByText('Loading workspace categories...')).toBeInTheDocument();
        expect(container.querySelector('.filters-fs')).toBeNull();
        expect(container.querySelector('.professional-table')).toBeNull();
    });

    it('dispatches fetchWorkSpaces exactly once on mount', () => {
        renderTickets();

        expect(fetchWorkSpaces).toHaveBeenCalledTimes(1);
        expect(mockDispatch).toHaveBeenCalledWith({ type: 'FETCH_WORKSPACES_THUNK' });
    });

    it('does not call the tickets endpoint while no EV Department is chosen, and shows the empty state', () => {
        const { container, getByText } = renderTickets();

        expect(callsTo('my-tickets')).toHaveLength(0);
        expect(getByText('No tickets found')).toBeInTheDocument();
        expect(getByText('0 tickets')).toBeInTheDocument();
    });

    it('lists every workspace from props as an EV Department option, behind a placeholder', () => {
        const { container } = renderTickets();
        const opts = Array.from(filterSelects(container)[0].querySelectorAll('option'));

        expect(opts.map((o) => o.textContent)).toEqual(['Please select department', 'IT Support', 'HR Services']);
        expect(opts.map((o) => o.value)).toEqual(['', '2', '5']);
    });

    it('choosing an EV Department issues one GET with status, page, limit, userEmail and workspaceId', async () => {
        const { container } = renderTickets();

        fireEvent.change(filterSelects(container)[0], { target: { value: '2' } });
        await flush();

        const reqs = callsTo('my-tickets');
        expect(reqs).toHaveLength(1);
        expect(reqs[0].method).toBe('get');
        expect(reqs[0].url).toBe(
            '/freshservice/tickets/my-tickets?status=all&page=1&limit=100&userEmail=vishnu.p%40eastvantage.com&workspaceId=2'
        );
    });

    it('renders one row per returned ticket plus the count and the header badge', async () => {
        routeApi({
            list: ok({
                tickets: [ticket({ id: 101 }), ticket({ id: 102, subject: 'VPN down' })],
                pagination: null,
            }),
        });
        const { container, getByText } = renderTickets();

        fireEvent.change(filterSelects(container)[0], { target: { value: '2' } });
        await flush();

        expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
        expect(getByText('2 tickets')).toBeInTheDocument();
        expect(container.querySelector('.notification-badge').textContent).toBe('2');
    });

    it('changing the Status filter refetches with the new status and keeps the workspace', async () => {
        const { container } = renderTickets();

        fireEvent.change(filterSelects(container)[0], { target: { value: '2' } });
        await flush();
        fireEvent.change(filterSelects(container)[1], { target: { value: 'resolved' } });
        await flush();

        const reqs = callsTo('my-tickets');
        expect(reqs).toHaveLength(2);
        expect(reqs[1].url).toContain('status=resolved');
        expect(reqs[1].url).toContain('workspaceId=2');
    });

    it('clearing the EV Department empties the table locally without hitting the API again', async () => {
        routeApi({ list: ok({ tickets: [ticket()], pagination: null }) });
        const { container, getByText } = renderTickets();

        fireEvent.change(filterSelects(container)[0], { target: { value: '2' } });
        await flush();
        expect(container.querySelectorAll('tbody tr')).toHaveLength(1);

        fireEvent.change(filterSelects(container)[0], { target: { value: '' } });
        await flush();

        expect(callsTo('my-tickets')).toHaveLength(1);
        expect(getByText('No tickets found')).toBeInTheDocument();
    });

    it('shows the spinner row while the tickets request is still in flight', async () => {
        let resolveIt;
        routeApi({ list: () => new Promise((res) => { resolveIt = res; }) });
        const { container, getByText } = renderTickets();

        fireEvent.change(filterSelects(container)[0], { target: { value: '2' } });

        expect(getByText('Loading tickets...')).toBeInTheDocument();
        expect(container.querySelector('.filters-fs')).toBeNull();

        await act(async () => { resolveIt({ data: { content: { tickets: [], pagination: null } } }); });
        expect(container.querySelector('.filters-fs')).not.toBeNull();
    });

    it('a rejected load renders the error banner and dispatches the alert action', async () => {
        const boom = new Error('Network down');
        routeApi({ list: fail(boom) });
        const { container, getByText } = renderTickets();

        fireEvent.change(filterSelects(container)[0], { target: { value: '2' } });
        await flush();

        expect(getByText('❌ Failed to load tickets: Network down')).toBeInTheDocument();
        expect(Formatter.alert_error).toHaveBeenCalledWith(boom);
        expect(mockDispatch).toHaveBeenCalledWith({ type: 'SHOW_ALERT', error: boom });
    });

    // FINDING FST-ERRMSG - API.check_error turns EVERY axios rejection into the formatted envelope
    // {status,statusText,data,headers}. That object has no `.message`, so `setTicketsError(e.message)`
    // stores undefined and the `error && <banner>` gate short-circuits. The user sees a perfectly
    // normal "No tickets found" empty state on a hard 500 - the failure is completely invisible on
    // screen, and the only trace is the redux alert. The `new Error(...)` arm above is the only way
    // the banner can ever appear, and API never produces one.
    it('a real API-shaped rejection shows no error banner at all, only the empty state _FINDING_FST-ERRMSG', async () => {
        const envelope = { status: 500, statusText: 'Internal Server Error', data: {}, headers: {} };
        routeApi({ list: fail(envelope) });
        const { getByText, container } = renderTickets();

        fireEvent.change(filterSelects(container)[0], { target: { value: '2' } });
        await flush();

        expect(container.querySelector('.error-message')).toBeNull();
        expect(getByText('No tickets found')).toBeInTheDocument();
        expect(Formatter.alert_error).toHaveBeenCalledWith(envelope);
    });
});

/* =================================================================================
 * PART 2 - FreshServiceTickets: row rendering rules
 * ================================================================================= */

describe('EV Assist -> My Tickets : row rendering rules', () => {

    const withTickets = async (tickets, pagination = null) => {
        routeApi({ list: ok({ tickets, pagination }) });
        const utils = renderTickets();
        fireEvent.change(filterSelects(utils.container)[0], { target: { value: '2' } });
        await flush();
        return utils;
    };

    it('maps every status code to its badge label and class, defaulting unknown codes to Open', async () => {
        const { container } = await withTickets([
            ticket({ id: 12, status: 2 }), ticket({ id: 13, status: 3 }),
            ticket({ id: 14, status: 4 }), ticket({ id: 15, status: 5 }),
            ticket({ id: 16, status: 99 }),
        ]);

        const badges = Array.from(container.querySelectorAll('.status-badge'));
        expect(badges.map((b) => b.textContent)).toEqual(['Open', 'Pending', 'Resolved', 'Closed', 'Open']);
        expect(badges.map((b) => b.className)).toEqual([
            'status-badge status-open', 'status-badge status-pending', 'status-badge status-resolved',
            'status-badge status-closed', 'status-badge status-open',
        ]);
    });

    it('maps every priority code to its badge label and class, defaulting unknown codes to Medium', async () => {
        const { container } = await withTickets([
            ticket({ id: 12, priority: 1 }), ticket({ id: 13, priority: 2 }),
            ticket({ id: 14, priority: 3 }), ticket({ id: 15, priority: 4 }),
            ticket({ id: 16, priority: 0 }),
        ]);

        const badges = Array.from(container.querySelectorAll('.priority-badge'));
        expect(badges.map((b) => b.textContent)).toEqual(['Low', 'Medium', 'High', 'Urgent', 'Medium']);
        expect(badges.map((b) => b.className)).toEqual([
            'priority-badge priority-low', 'priority-badge priority-medium', 'priority-badge priority-high',
            'priority-badge priority-urgent', 'priority-badge priority-medium',
        ]);
    });

    // The State column is derived from `id % 4` (the source itself calls it a mock), so the state a
    // user sees has nothing to do with SLA - it is a function of the ticket number.
    it('derives the State column from the ticket id modulo 4, not from any SLA field _FINDING_FST-STATE', async () => {
        const { container } = await withTickets([
            ticket({ id: 40 }), ticket({ id: 41 }), ticket({ id: 42 }), ticket({ id: 43 }),
        ]);

        const states = Array.from(container.querySelectorAll('.state-badge'));
        expect(states.map((s) => s.textContent)).toEqual(['New', 'Requester Respond', 'Response Due', 'Overdue']);
        expect(states.map((s) => s.className)).toEqual([
            'state-badge state-new', 'state-badge state-requester-respond',
            'state-badge state-response-due', 'state-badge state-overdue',
        ]);
    });

    it('renders Invalid Date for a missing or unparsable created_at, and a real date otherwise', async () => {
        const { container } = await withTickets([
            ticket({ id: 12, created_at: null }),
            ticket({ id: 13, created_at: 'not-a-date' }),
            ticket({ id: 14, created_at: '2026-07-01T10:00:00.000Z' }),
        ]);

        const cells = Array.from(container.querySelectorAll('tbody tr')).map((r) => r.children[1].textContent);
        expect(cells[0]).toBe('Invalid Date');
        expect(cells[1]).toBe('Invalid Date');
        expect(cells[2]).not.toBe('Invalid Date');
        expect(cells[2]).toContain('2026');
    });

    it('strips angle brackets out of the subject and falls back to No subject when it is blank', async () => {
        const { container } = await withTickets([
            ticket({ id: 12, subject: '  <b>Printer</b> jammed  ' }),
            ticket({ id: 13, subject: '' }),
        ]);

        const subs = Array.from(container.querySelectorAll('.ticket-subject')).map((s) => s.textContent);
        expect(subs[0]).toBe('#12 bPrinter/b jammed');
        expect(subs[1]).toBe('#13 No subject');
    });
});

/* =================================================================================
 * PART 3 - FreshServiceTickets: pagination
 * ================================================================================= */

describe('EV Assist -> My Tickets : pagination', () => {

    const withPagination = async (pagination) => {
        routeApi({ list: ok({ tickets: [ticket()], pagination }) });
        const utils = renderTickets();
        fireEvent.change(filterSelects(utils.container)[0], { target: { value: '2' } });
        await flush();
        return utils;
    };

    it('renders no pagination controls when there is a single page', async () => {
        const { container } = await withPagination({ currentPage: 1, totalPages: 1, hasPrevious: false, hasNext: false });
        expect(container.querySelector('.pagination-controls')).toBeNull();
    });

    it('renders no pagination controls when the API returns no pagination object at all', async () => {
        const { container } = await withPagination(null);
        expect(container.querySelector('.pagination-controls')).toBeNull();
    });

    it('disables Previous on the first page of a multi-page result and shows the page counter', async () => {
        const { container, getByText } = await withPagination({ currentPage: 1, totalPages: 3, hasPrevious: false, hasNext: true });
        const [prev, next] = container.querySelectorAll('.pagination-controls button');

        expect(getByText('Page 1 of 3')).toBeInTheDocument();
        expect(prev.disabled).toBe(true);
        expect(next.disabled).toBe(false);
    });

    it('enables both arrows in the middle of a multi-page result and disables Next on the last page', async () => {
        const mid = await withPagination({ currentPage: 2, totalPages: 3, hasPrevious: true, hasNext: true });
        const [p1, n1] = mid.container.querySelectorAll('.pagination-controls button');
        expect(p1.disabled).toBe(false);
        expect(n1.disabled).toBe(false);
        mid.unmount();

        const last = await withPagination({ currentPage: 3, totalPages: 3, hasPrevious: true, hasNext: false });
        const [p2, n2] = last.container.querySelectorAll('.pagination-controls button');
        expect(p2.disabled).toBe(false);
        expect(n2.disabled).toBe(true);
    });

    // FINDING FST-PAGE-STALE - onPageChange is memoised with an EMPTY dependency array, so it holds
    // the loadTickets closure created on the very first render, when filters.workspaceId was ''.
    // Pressing Next runs that closure's `else` branch: setTickets([]) / setPagination(null).
    // Net effect for the user: page 2 never loads and page 1 is thrown away.
    it('pressing Next wipes the list instead of loading page 2 _FINDING_FST-PAGE-STALE', async () => {
        const { container, getByText } = await withPagination({ currentPage: 1, totalPages: 3, hasPrevious: false, hasNext: true });
        expect(container.querySelectorAll('tbody tr')).toHaveLength(1);

        const next = container.querySelectorAll('.pagination-controls button')[1];
        await act(async () => { fireEvent.click(next); });
        await flush();

        expect(callsTo('my-tickets')).toHaveLength(1);          // no page=2 request was ever sent
        expect(getByText('No tickets found')).toBeInTheDocument(); // and page 1 is gone
        expect(container.querySelector('.pagination-controls')).toBeNull();
    });
});

/* =================================================================================
 * PART 4 - FreshServiceTickets: ticket details + reply
 * ================================================================================= */

describe('EV Assist -> My Tickets : ticket details and reply', () => {

    const openDetails = async (handlers = {}) => {
        routeApi({ list: ok({ tickets: [ticket()], pagination: null }), ...handlers });
        const utils = renderTickets();
        fireEvent.change(filterSelects(utils.container)[0], { target: { value: '2' } });
        await flush();
        await act(async () => { fireEvent.click(utils.container.querySelector('tbody tr')); });
        await flush();
        return utils;
    };

    it('clicking a row opens the detail view and fetches both the ticket and its conversations', async () => {
        const { container, getByText } = await openDetails();

        expect(getByText('Ticket #101')).toBeInTheDocument();
        expect(container.querySelector('.professional-table')).toBeNull();
        expect(callsTo('/freshservice/tickets/101').map((c) => c.url)).toEqual(
            expect.arrayContaining(['/freshservice/tickets/101', '/freshservice/tickets/101/conversations/'])
        );
    });

    it('replaces the row summary with the freshly fetched ticket body and attachments', async () => {
        const { container, getByText } = await openDetails({
            detail: ok(ticket({
                subject: 'Laptop will not boot',
                description: '<p>It died overnight</p>',
                attachments: [{ id: 9, name: 'bootlog.txt', size: 2048, attachment_url: 'http://files/bootlog.txt' }],
            })),
        });

        expect(getByText('Laptop will not boot')).toBeInTheDocument();
        expect(container.innerHTML).toContain('It died overnight');
        const link = container.querySelector('.attachment-item a');
        expect(link.getAttribute('href')).toBe('http://files/bootlog.txt');
        expect(link.textContent).toBe('bootlog.txt' + formatBytes(2048));
        expect(formatBytes(2048)).toBe('2.00 KB');
    });

    it('falls back to the placeholder description when the ticket carries none', async () => {
        const { getByText } = await openDetails({ detail: ok(ticket({ description: '' })) });
        expect(getByText('No description provided')).toBeInTheDocument();
    });

    it('keeps the row data on screen and raises an alert when the detail fetch fails', async () => {
        const boom = { status: 404, statusText: 'Not Found', data: {} };
        const { getByText } = await openDetails({ detail: fail(boom) });

        expect(getByText('Ticket #101')).toBeInTheDocument();
        expect(getByText('Printer jammed')).toBeInTheDocument();
        expect(Formatter.alert_error).toHaveBeenCalledWith(boom);
    });

    it('shows the empty-conversation state when the thread is empty', async () => {
        const { getByText } = await openDetails({ convos: ok({ conversations: [] }) });
        expect(getByText('No conversations yet.')).toBeInTheDocument();
    });

    it('renders each conversation with its CC list and sized attachments', async () => {
        const { container } = await openDetails({
            convos: ok({
                conversations: [{
                    id: 1,
                    created_at: '2026-07-02T09:00:00.000Z',
                    body: '<p>We are on it</p>',
                    cc_emails: ['gary.a@eastvantage.com', 'glenn.m@eastvantage.com'],
                    attachments: [{ id: 3, name: 'screenshot.png', size: 500, attachment_url: 'http://files/s.png' }],
                }],
            }),
        });

        const item = container.querySelector('.conversation-item');
        expect(item.querySelector('.conversation-date').textContent)
            .toContain('| CC: gary.a@eastvantage.com, glenn.m@eastvantage.com');
        expect(item.querySelector('.conversation-body').innerHTML).toBe('<p>We are on it</p>');
        expect(item.querySelector('.attachment-item a').textContent).toBe('screenshot.png' + formatBytes(500));
        expect(formatBytes(500)).toBe('500.0 Bytes');
    });

    it('omits the CC segment when a conversation has no cc_emails and shows the no-content fallback', async () => {
        const { container, getByText } = await openDetails({
            convos: ok({ conversations: [{ id: 1, created_at: '2026-07-02T09:00:00.000Z', cc_emails: [] }] }),
        });

        expect(container.querySelector('.conversation-date').textContent).not.toContain('CC:');
        expect(getByText('No content')).toBeInTheDocument();
    });

    it('keeps Add Reply disabled until the editor holds non-whitespace text', async () => {
        const { container } = await openDetails();
        const btn = container.querySelector('button.btn-fs');
        const editor = container.querySelector('[data-testid="tinymce"]');

        expect(btn.disabled).toBe(true);
        fireEvent.change(editor, { target: { value: '   ' } });
        expect(container.querySelector('button.btn-fs').disabled).toBe(true);

        fireEvent.change(editor, { target: { value: 'Any update?' } });
        expect(container.querySelector('button.btn-fs').disabled).toBe(false);
    });

    it('posts the reply with the body, the requester id and empty attachment lists', async () => {
        const { container } = await openDetails();
        fireEvent.change(container.querySelector('[data-testid="tinymce"]'), { target: { value: '<p>Any update?</p>' } });

        await act(async () => { fireEvent.submit(container.querySelector('form')); });
        await flush();

        expect(callsTo('/reply')).toEqual([{
            method: 'post',
            url: '/freshservice/tickets/101/reply',
            data: {
                body: '<p>Any update?</p>',
                attachments: [],
                removed_attachments: [],
                requester_id: 55,
                cc_emails: [],
            },
        }]);
    });

    it('clears the editor and reloads the thread after a successful reply', async () => {
        let convoCall = 0;
        const { container, getByText } = await openDetails({
            convos: () => {
                convoCall += 1;
                return Promise.resolve({
                    data: {
                        content: {
                            conversations: convoCall === 1
                                ? []
                                : [{ id: 7, created_at: '2026-07-03T09:00:00.000Z', body: '<p>Any update?</p>' }],
                        },
                    },
                });
            },
        });

        fireEvent.change(container.querySelector('[data-testid="tinymce"]'), { target: { value: '<p>Any update?</p>' } });
        await act(async () => { fireEvent.submit(container.querySelector('form')); });
        await flush();

        expect(convoCall).toBe(2);
        expect(container.querySelectorAll('.conversation-item')).toHaveLength(1);
        expect(container.querySelector('[data-testid="tinymce"]').value).toBe('');
    });

    it('keeps the typed reply and raises an alert when the reply POST fails', async () => {
        const boom = { status: 422, statusText: 'Unprocessable', data: {} };
        const { container } = await openDetails({ reply: fail(boom) });

        fireEvent.change(container.querySelector('[data-testid="tinymce"]'), { target: { value: '<p>Any update?</p>' } });
        await act(async () => { fireEvent.submit(container.querySelector('form')); });
        await flush();

        expect(Formatter.alert_error).toHaveBeenCalledWith(boom);
        expect(container.querySelector('[data-testid="tinymce"]').value).toBe('<p>Any update?</p>');
        expect(callsTo('/conversations')).toHaveLength(1); // no reload after a failed reply
    });

    it('submitting a whitespace-only reply is rejected before any request is made', async () => {
        const { container } = await openDetails();
        fireEvent.change(container.querySelector('[data-testid="tinymce"]'), { target: { value: '    ' } });

        await act(async () => { fireEvent.submit(container.querySelector('form')); });
        await flush();

        expect(callsTo('/reply')).toHaveLength(0);
    });

    it('uploading a reply attachment posts ticket_id, workspace_id and the file, then lists it', async () => {
        const { container } = await openDetails({ attach: ok({ files: ['uploads/invoice.pdf'] }) });

        setFiles(container.querySelector('input[type="file"]'), [PDF()]);
        await flush();

        const req = callsTo('/freshservice/tickets/attachments/')[0];
        expect(req.method).toBe('post');
        expect(req.data.get('ticket_id')).toBe('101');
        expect(req.data.get('workspace_id')).toBe('2');
        expect(req.data.get('attachment').name).toBe('invoice.pdf');
        expect(container.querySelector('.attachments-list-fs li').textContent).toContain('invoice.pdf');
    });

    it('a failed attachment upload alerts and adds nothing to the list', async () => {
        const boom = { status: 413, statusText: 'Payload Too Large', data: {} };
        const { container } = await openDetails({ attach: fail(boom) });

        setFiles(container.querySelector('input[type="file"]'), [PDF()]);
        await flush();

        expect(Formatter.alert_error).toHaveBeenCalledWith(boom);
        expect(container.querySelector('.attachments-list-fs')).toBeNull();
    });

    it('an uploaded attachment travels in the reply payload, and removing it moves it to removed_attachments', async () => {
        const { container } = await openDetails({ attach: ok({ files: ['uploads/invoice.pdf'] }) });

        setFiles(container.querySelector('input[type="file"]'), [PDF()]);
        await flush();

        fireEvent.change(container.querySelector('[data-testid="tinymce"]'), { target: { value: 'first' } });
        await act(async () => { fireEvent.submit(container.querySelector('form')); });
        await flush();
        expect(callsTo('/reply')[0].data.attachments).toEqual(['uploads/invoice.pdf']);

        // upload again, then hit the per-file remove control
        setFiles(container.querySelector('input[type="file"]'), [PDF()]);
        await flush();
        fireEvent.click(container.querySelector('.attachment-remove-btn-fs'));

        expect(container.querySelector('.attachments-list-fs')).toBeNull();
        fireEvent.change(container.querySelector('[data-testid="tinymce"]'), { target: { value: 'second' } });
        await act(async () => { fireEvent.submit(container.querySelector('form')); });
        await flush();

        const second = callsTo('/reply')[1];
        expect(second.data.attachments).toEqual([]);
        expect(second.data.removed_attachments).toEqual(['uploads/invoice.pdf']);
    });

    // FINDING FST-REPLYATT - handleReplySubmit's `.finally` unconditionally resets attachments,
    // attachmentsValues and removedAttachments. On the failure path the user is told the reply
    // failed, is invited to retry, but every file they already uploaded has been dropped from the
    // form - a retry silently sends the reply with no attachments at all.
    it('a failed reply silently discards the already-uploaded attachments _FINDING_FST-REPLYATT', async () => {
        let failNext = true;
        const { container } = await openDetails({
            attach: ok({ files: ['uploads/invoice.pdf'] }),
            reply: () => {
                if (failNext) { failNext = false; return Promise.reject({ status: 500, statusText: 'Err', data: {} }); }
                return Promise.resolve({ data: { content: {} } });
            },
        });

        setFiles(container.querySelector('input[type="file"]'), [PDF()]);
        await flush();
        expect(container.querySelector('.attachments-list-fs li')).not.toBeNull();

        fireEvent.change(container.querySelector('[data-testid="tinymce"]'), { target: { value: 'please help' } });
        await act(async () => { fireEvent.submit(container.querySelector('form')); });
        await flush();

        expect(container.querySelector('.attachments-list-fs')).toBeNull(); // file list gone after the failure

        // the retry therefore goes out with an empty attachment list
        await act(async () => { fireEvent.submit(container.querySelector('form')); });
        await flush();
        expect(callsTo('/reply')[1].data.attachments).toEqual([]);
    });

    it('Back to My Tickets returns to the list view', async () => {
        const { container, getByText } = await openDetails();
        expect(container.querySelectorAll('.back-button')).toHaveLength(2);

        await act(async () => { fireEvent.click(container.querySelectorAll('.back-button')[0]); });
        await flush();

        expect(container.querySelector('.professional-table')).not.toBeNull();
        expect(getByText('My Tickets')).toBeInTheDocument();
    });
});

/* =================================================================================
 * PART 5 - FreshServiceForm: render gates and defaults
 * ================================================================================= */

describe('EV Assist -> Raise a Ticket : render gates and defaults', () => {

    it('shows the workspace loader and no form until workspaces have loaded', () => {
        const { container, getByText } = renderForm({ workspacesLoaded: false });

        expect(getByText('Loading workspace categories...')).toBeInTheDocument();
        expect(container.querySelector('form')).toBeNull();
    });

    it('renders nothing at all when workspaces loaded but the list came back empty', () => {
        const { container, queryByText } = renderForm({ workspaces: [] });

        expect(container.querySelector('form')).toBeNull();
        expect(queryByText('Create New Ticket')).toBeNull();
        expect(queryByText('Loading workspace categories...')).toBeNull();
    });

    it('dispatches fetchWorkSpaces on mount', () => {
        renderForm();
        expect(mockDispatch).toHaveBeenCalledWith({ type: 'FETCH_WORKSPACES_THUNK' });
    });

    it('pre-fills the description with the signed-in user signature on editor init', () => {
        const { container } = renderForm();
        const body = container.querySelector('[data-testid="tinymce"]').value;

        expect(body).toContain('Vishnu Prakash');
        expect(body).toContain('Delivery');
        expect(body).toContain('Employee ID: EV-1234');
        expect(body).toContain('Country: India');
    });

    it('opens with Medium priority, an empty subject preview and no attachment control', () => {
        const { container, getByText } = renderForm();

        expect(group(container, 'Priority *').querySelector('select').value).toBe('2');
        expect(getByText('Please select categories above...')).toBeInTheDocument();
        expect(container.querySelector('input[type="file"]')).toBeNull();
        expect(container.querySelector('button.btn-fs').textContent).toBe('Create a Ticket');
    });
});

/* =================================================================================
 * PART 6 - FreshServiceForm: cascading category selects and the subject prefix
 * ================================================================================= */

describe('EV Assist -> Raise a Ticket : cascading selects and subject prefix', () => {

    const pick = (container, label, value) =>
        fireEvent.change(group(container, label).querySelector('select'), { target: { value } });

    it('choosing a department stamps the department-only prefix onto the subject preview', () => {
        const { container } = renderForm();
        pick(container, 'EV Department *', '2');

        expect(container.querySelector('.subject-preview').textContent).toBe('[IT Support] | | - ');
    });

    it('the Category select only appears once a department with categories is chosen', () => {
        const { container } = renderForm();
        expect(group(container, 'Category *')).toBeUndefined();

        pick(container, 'EV Department *', '2');
        const opts = Array.from(group(container, 'Category *').querySelectorAll('option'));
        expect(opts.map((o) => o.textContent)).toEqual(['Select Category', 'Hardware', 'Software']);
    });

    it('the Sub-category select only appears for a category that actually has sub-categories', () => {
        const { container } = renderForm();
        pick(container, 'EV Department *', '2');
        pick(container, 'Category *', '11');          // Software -> SUB_CATEGORIES['11'] is []
        expect(group(container, 'Sub-category')).toBeUndefined();

        pick(container, 'Category *', '10');          // Hardware -> Printer / Laptop
        const opts = Array.from(group(container, 'Sub-category').querySelectorAll('option'));
        expect(opts.map((o) => o.textContent)).toEqual(['Select Sub-category', 'Printer', 'Laptop']);
    });

    it('the full department + category + sub-category chain builds the bracketed subject prefix', () => {
        const { container } = renderForm();
        pick(container, 'EV Department *', '2');
        pick(container, 'Category *', '10');
        expect(container.querySelector('.subject-preview').textContent).toBe('[IT Support] | [Hardware] | - ');

        pick(container, 'Sub-category', '100');
        expect(container.querySelector('.subject-preview').textContent).toBe('[IT Support] | [Hardware] | [Printer] | - ');

        fireEvent.change(group(container, 'Your Subject *').querySelector('input'), { target: { value: 'Toner low' } });
        expect(container.querySelector('.subject-preview').textContent).toBe('[IT Support] | [Hardware] | [Printer] | - Toner low');
    });

    // FINDING FSF-RESET - updateField clears the category NAME on a department change but leaves
    // selectedSubCategoryId untouched. When the incoming department happens to reuse the same
    // category id (here '10' is Hardware under IT Support and Payroll under HR Services) the
    // dropdown keeps showing a highlighted selection while the subject prefix has silently lost it.
    it('switching department leaves a stale category id selected in the dropdown _FINDING_FSF-RESET', () => {
        const { container } = renderForm();
        pick(container, 'EV Department *', '2');
        pick(container, 'Category *', '10');
        expect(container.querySelector('.subject-preview').textContent).toBe('[IT Support] | [Hardware] | - ');

        pick(container, 'EV Department *', '5');

        expect(group(container, 'Category *').querySelector('select').value).toBe('10'); // still "chosen"
        expect(container.querySelector('.subject-preview').textContent).toBe('[HR Services] | | - '); // but dropped
    });
});

/* =================================================================================
 * PART 7 - FreshServiceForm: validation
 * ================================================================================= */

describe('EV Assist -> Raise a Ticket : validation', () => {

    const submit = async (container) => {
        await act(async () => { fireEvent.submit(container.querySelector('form')); });
        await flush();
    };
    const typeSubject = (container, v) =>
        fireEvent.change(group(container, 'Your Subject *').querySelector('input'), { target: { value: v } });
    const typeBody = (container, v) =>
        fireEvent.change(container.querySelector('[data-testid="tinymce"]'), { target: { value: v } });

    it('an untouched form is rejected for both subject and department, with no request sent', async () => {
        const { container } = renderForm();
        await submit(container);

        expect(errorTexts(container)).toEqual(
            expect.arrayContaining(['⚠️ Subject must be at least 5 characters', '⚠️ Workspace must be selected'])
        );
        expect(createCalls()).toHaveLength(0);
    });

    it('a subject shorter than five characters is rejected, five or more is accepted', async () => {
        const { container } = renderForm();
        typeSubject(container, 'VPN');
        await submit(container);
        expect(errorTexts(container)).toContain('⚠️ Subject must be at least 5 characters');

        typeSubject(container, 'VPN is down');
        await submit(container);
        expect(errorTexts(container)).not.toContain('⚠️ Subject must be at least 5 characters');
    });

    it('the length check ignores the category prefix and measures only what the user typed', async () => {
        const { container } = renderForm();
        fireEvent.change(group(container, 'EV Department *').querySelector('select'), { target: { value: '2' } });
        typeSubject(container, 'ok');   // subject is long thanks to "[IT Support] | | - ", userSubject is not

        await submit(container);

        expect(container.querySelector('.subject-preview').textContent).toBe('[IT Support] | | - ok');
        expect(errorTexts(container)).toContain('⚠️ Subject must be at least 5 characters');
    });

    it('an emptied description is rejected as required and a short one by the ten-character rule', async () => {
        const { container } = renderForm();
        typeSubject(container, 'VPN is down');

        typeBody(container, '');
        await submit(container);
        expect(errorTexts(container)).toContain('⚠️ Description is required');

        typeBody(container, 'too short');   // 9 chars
        await submit(container);
        expect(errorTexts(container)).toContain('⚠️ Description must be at least 10 characters');

        typeBody(container, 'this description is definitely long enough');
        await submit(container);
        expect(errorTexts(container)).not.toContain('⚠️ Description is required');
        expect(errorTexts(container)).not.toContain('⚠️ Description must be at least 10 characters');
    });

    it('editing the field that failed clears its error message immediately', async () => {
        const { container } = renderForm();
        await submit(container);
        expect(errorTexts(container)).toContain('⚠️ Subject must be at least 5 characters');

        typeSubject(container, 'VPN is down');
        expect(errorTexts(container)).not.toContain('⚠️ Subject must be at least 5 characters');
    });

    it('priority is written back to state as a number, not the select string', async () => {
        const { container } = renderForm();
        fireEvent.change(group(container, 'EV Department *').querySelector('select'), { target: { value: '2' } });
        typeSubject(container, 'VPN is down');
        fireEvent.change(group(container, 'Priority *').querySelector('select'), { target: { value: '4' } });

        await submit(container);

        expect(createCalls()[0].data.priority).toBe(4);
    });

    // FINDING FSF-DEADCAT - WORKSPACE_CATEGORIES is declared as {} and never populated, so the
    // whole category / sub-category validation block (FreshServiceForm.js lines 110-130) can never
    // run. A ticket submits happily with no category and no sub-category chosen even though both
    // labels are marked required with an asterisk.
    it('a ticket with no category chosen is accepted even though Category is marked required _FINDING_FSF-DEADCAT', async () => {
        const { container } = renderForm();
        fireEvent.change(group(container, 'EV Department *').querySelector('select'), { target: { value: '2' } });
        typeSubject(container, 'VPN is down');

        await submit(container);

        expect(errorTexts(container)).not.toContain('⚠️ Category must be selected');
        expect(errorTexts(container)).not.toContain('⚠️ Sub-category must be selected');
        expect(createCalls()).toHaveLength(1);
        expect(createCalls()[0].data.subject).toBe('[IT Support] | | - VPN is down');
    });

    // FINDING FSF-PLACEHOLDER - the handler stores the option TEXT. Selecting the placeholder row
    // stores "Select Department", which is a truthy string, so the `!data.selectedWorkspace` guard
    // never trips. The ticket is created with workspace_id: '' and a nonsense subject prefix.
    it('re-selecting the department placeholder defeats the required check _FINDING_FSF-PLACEHOLDER', async () => {
        const { container } = renderForm();
        const dept = group(container, 'EV Department *').querySelector('select');

        fireEvent.change(dept, { target: { value: '2' } });
        fireEvent.change(dept, { target: { value: '' } });
        fireEvent.change(group(container, 'Your Subject *').querySelector('input'), { target: { value: 'VPN is down' } });

        await submit(container);

        expect(errorTexts(container)).not.toContain('⚠️ Workspace must be selected');
        const sent = createCalls()[0].data;
        expect(sent.workspace_id).toBe('');
        expect(sent.subject).toBe('[Select Department] | | - VPN is down');
    });
});

/* =================================================================================
 * PART 8 - FreshServiceForm: submit, attachments, CC
 * ================================================================================= */

describe('EV Assist -> Raise a Ticket : submit, attachments and CC', () => {

    const fillValid = (container) => {
        fireEvent.change(group(container, 'EV Department *').querySelector('select'), { target: { value: '2' } });
        fireEvent.change(group(container, 'Your Subject *').querySelector('input'), { target: { value: 'Printer is broken' } });
        fireEvent.change(container.querySelector('[data-testid="tinymce"]'), {
            target: { value: '<p>My printer stopped working today</p>' },
        });
    };
    const submit = async (container) => {
        await act(async () => { fireEvent.submit(container.querySelector('form')); });
        await flush();
    };

    it('a valid form posts the exact ticket payload with status 2 and the workspace id', async () => {
        const { container } = renderForm();
        fillValid(container);
        await submit(container);

        expect(createCalls()).toEqual([{
            method: 'post',
            url: '/freshservice/tickets',
            data: {
                subject: '[IT Support] | | - Printer is broken',
                description: '<p>My printer stopped working today</p>',
                priority: 2,
                status: 2,
                workspace_id: '2',
                attachments: [],
                removed_attachments: [],
                cc_emails: [],
            },
        }]);
    });

    it('a successful submit shows the confirmation, scrolls up, resets the form and hides the banner after 3s', async () => {
        const { container, getByText, queryByText } = renderForm();
        fillValid(container);
        await submit(container);

        expect(getByText('✅ Thanks! EV Assist has logged your request. Our team will be in touch shortly.')).toBeInTheDocument();
        expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
        expect(group(container, 'Your Subject *').querySelector('input').value).toBe('');
        expect(getByText('Please select categories above...')).toBeInTheDocument();
        expect(container.querySelector('[data-testid="tinymce"]').value).toContain('Employee ID: EV-1234');

        act(() => { jest.advanceTimersByTime(3000); });
        expect(queryByText('✅ Thanks! EV Assist has logged your request. Our team will be in touch shortly.')).toBeNull();
    });

    it('a failed submit alerts, shows no confirmation and leaves the typed values in place', async () => {
        const boom = { status: 500, statusText: 'Internal Server Error', data: {} };
        routeApi({ create: fail(boom) });
        const { container, queryByText } = renderForm();
        fillValid(container);
        await submit(container);

        expect(Formatter.alert_error).toHaveBeenCalledWith(boom);
        expect(queryByText('✅ Thanks! EV Assist has logged your request. Our team will be in touch shortly.')).toBeNull();
        expect(group(container, 'Your Subject *').querySelector('input').value).toBe('Printer is broken');
        expect(container.querySelector('button.btn-fs').textContent).toBe('Create a Ticket');
    });

    it('the submit button reads Creating... and is disabled while the request is in flight', async () => {
        let resolveIt;
        routeApi({ create: () => new Promise((res) => { resolveIt = res; }) });
        const { container } = renderForm();
        fillValid(container);

        await act(async () => { fireEvent.submit(container.querySelector('form')); });
        expect(container.querySelector('button.btn-fs').textContent).toBe('Creating...');
        expect(container.querySelector('button.btn-fs').disabled).toBe(true);

        await act(async () => { resolveIt({ data: { content: {} } }); });
        expect(container.querySelector('button.btn-fs').textContent).toBe('Create a Ticket');
    });

    it('the attachment control is hidden until a department is chosen', () => {
        const { container } = renderForm();
        expect(container.querySelector('input[type="file"]')).toBeNull();

        fireEvent.change(group(container, 'EV Department *').querySelector('select'), { target: { value: '2' } });
        expect(container.querySelector('input[type="file"]')).not.toBeNull();
    });

    it('an uploaded file posts the workspace id plus the file and is carried into the ticket payload', async () => {
        routeApi({ attach: ok({ files: ['uploads/invoice.pdf'] }) });
        const { container } = renderForm();
        fillValid(container);

        setFiles(container.querySelector('input[type="file"]'), [PDF()]);
        await flush();

        const up = callsTo('/freshservice/tickets/attachments/')[0];
        expect(up.data.get('workspace_id')).toBe('2');
        expect(up.data.get('attachment').name).toBe('invoice.pdf');
        expect(container.querySelector('.attachments-list-fs li').textContent).toContain('invoice.pdf');

        await submit(container);
        expect(createCalls()[0].data.attachments).toEqual(['uploads/invoice.pdf']);
    });

    it('a failed upload alerts and leaves the attachment list empty', async () => {
        const boom = { status: 415, statusText: 'Unsupported Media Type', data: {} };
        routeApi({ attach: fail(boom) });
        const { container } = renderForm();
        fillValid(container);

        setFiles(container.querySelector('input[type="file"]'), [PDF()]);
        await flush();

        expect(Formatter.alert_error).toHaveBeenCalledWith(boom);
        expect(container.querySelector('.attachments-list-fs')).toBeNull();
    });

    it('removing an uploaded file moves it from attachments into removed_attachments', async () => {
        routeApi({ attach: ok({ files: ['uploads/invoice.pdf'] }) });
        const { container } = renderForm();
        fillValid(container);

        setFiles(container.querySelector('input[type="file"]'), [PDF()]);
        await flush();
        fireEvent.click(container.querySelector('.attachment-remove-btn-fs'));
        expect(container.querySelector('.attachments-list-fs')).toBeNull();

        await submit(container);
        const sent = createCalls()[0].data;
        expect(sent.attachments).toEqual([]);
        expect(sent.removed_attachments).toEqual(['uploads/invoice.pdf']);
    });

    it('a CC term shorter than two characters never reaches the suggestions endpoint', async () => {
        const { container } = renderForm();
        fireEvent.change(group(container, 'CC Emails (Optional)').querySelector('input'), { target: { value: 'v' } });

        await act(async () => { jest.advanceTimersByTime(1500); });
        expect(callsTo('suggestions')).toHaveLength(0);
    });

    it('a two-character CC term queries the suggestions endpoint after the one-second debounce', async () => {
        routeApi({ suggest: () => Promise.resolve({ data: ['Vishnu P <vishnu.p@eastvantage.com>', 'Vince <vince@eastvantage.com>'] }) });
        const { container } = renderForm();
        fireEvent.change(group(container, 'CC Emails (Optional)').querySelector('input'), { target: { value: 'vi' } });

        await act(async () => { jest.advanceTimersByTime(999); });
        expect(callsTo('suggestions')).toHaveLength(0);

        await act(async () => { jest.advanceTimersByTime(1); });
        await flush();

        expect(callsTo('suggestions')).toEqual([{
            method: 'get',
            url: '/freshservice/users/suggestions',
            params: { keyword: 'vi' },
        }]);
        expect(container.querySelectorAll('.cc-suggestion-item')).toHaveLength(2);
    });

    it('only the last comma-separated CC term is used as the search keyword', async () => {
        const { container } = renderForm();
        fireEvent.change(group(container, 'CC Emails (Optional)').querySelector('input'), {
            target: { value: 'gary.a@eastvantage.com,  glen' },
        });

        await act(async () => { jest.advanceTimersByTime(1000); });
        await flush();

        expect(callsTo('suggestions')[0].params).toEqual({ keyword: 'glen' });
    });

    it('picking a suggestion extracts the bracketed address, tags it, and sends it on submit', async () => {
        routeApi({ suggest: () => Promise.resolve({ data: ['Vishnu P <vishnu.p@eastvantage.com>'] }) });
        const { container } = renderForm();
        fillValid(container);
        fireEvent.change(group(container, 'CC Emails (Optional)').querySelector('input'), { target: { value: 'vi' } });

        await act(async () => { jest.advanceTimersByTime(1000); });
        await flush();
        await act(async () => { fireEvent.click(container.querySelector('.cc-suggestion-item')); });
        await flush();

        expect(Array.from(container.querySelectorAll('.cc-tag')).map((t) => t.textContent))
            .toEqual(['vishnu.p@eastvantage.com❌']);
        expect(container.querySelectorAll('.cc-suggestion-item')).toHaveLength(0);
        expect(group(container, 'CC Emails (Optional)').querySelector('input').value).toBe('');

        await submit(container);
        expect(createCalls()[0].data.cc_emails).toEqual(['vishnu.p@eastvantage.com']);
    });

    it('the same address cannot be added twice from the suggestion list', async () => {
        routeApi({ suggest: () => Promise.resolve({ data: ['Vishnu P <vishnu.p@eastvantage.com>'] }) });
        const { container } = renderForm();

        const cc = () => group(container, 'CC Emails (Optional)').querySelector('input');
        fireEvent.change(cc(), { target: { value: 'vi' } });
        await act(async () => { jest.advanceTimersByTime(1000); });
        await flush();
        await act(async () => { fireEvent.click(container.querySelector('.cc-suggestion-item')); });
        await flush();

        fireEvent.change(cc(), { target: { value: 'vi' } });
        await act(async () => { jest.advanceTimersByTime(1000); });
        await flush();
        await act(async () => { fireEvent.click(container.querySelector('.cc-suggestion-item')); });
        await flush();

        expect(container.querySelectorAll('.cc-tag')).toHaveLength(1);
    });

    it('removing a CC tag drops it from the submitted cc_emails list', async () => {
        routeApi({ suggest: () => Promise.resolve({ data: ['Vishnu P <vishnu.p@eastvantage.com>'] }) });
        const { container } = renderForm();
        fillValid(container);

        fireEvent.change(group(container, 'CC Emails (Optional)').querySelector('input'), { target: { value: 'vi' } });
        await act(async () => { jest.advanceTimersByTime(1000); });
        await flush();
        await act(async () => { fireEvent.click(container.querySelector('.cc-suggestion-item')); });
        await flush();
        expect(container.querySelectorAll('.cc-tag')).toHaveLength(1);

        fireEvent.click(container.querySelector('.cc-tag-remove'));
        expect(container.querySelectorAll('.cc-tag')).toHaveLength(0);

        await submit(container);
        expect(createCalls()[0].data.cc_emails).toEqual([]);
    });

    // FINDING FSF-CCEMPTY - the address is pulled out with /<([^>]+)>/ and defaulted to ''. A
    // suggestion that FreshService returns as a bare name (no angle brackets) therefore adds an
    // EMPTY cc tag, which is then posted inside cc_emails and will be rejected downstream.
    it('a suggestion without an angle-bracketed address adds a blank CC entry _FINDING_FSF-CCEMPTY', async () => {
        routeApi({ suggest: () => Promise.resolve({ data: ['Helpdesk Bot'] }) });
        const { container } = renderForm();
        fillValid(container);

        fireEvent.change(group(container, 'CC Emails (Optional)').querySelector('input'), { target: { value: 'he' } });
        await act(async () => { jest.advanceTimersByTime(1000); });
        await flush();
        await act(async () => { fireEvent.click(container.querySelector('.cc-suggestion-item')); });
        await flush();

        expect(container.querySelectorAll('.cc-tag')).toHaveLength(1);
        expect(container.querySelector('.cc-tag').textContent).toBe('❌');

        await submit(container);
        expect(createCalls()[0].data.cc_emails).toEqual(['']);
    });
});
