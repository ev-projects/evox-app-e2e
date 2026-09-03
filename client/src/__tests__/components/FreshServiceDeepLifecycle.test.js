/**
 * FreshServiceDeepLifecycle.test.js
 *
 * SOURCE FILES UNDER TEST
 *   1. src/components/FreshService/FreshServiceTickets.js
 *      Menu: EV Assist -> My Tickets        (list + filters + pagination + ticket detail/reply)
 *      CURRENT measured coverage: 78.78% statements  (~49 statements still uncovered)
 *   2. src/components/FreshService/FreshServiceForm.js
 *      Menu: EV Assist -> Raise a Ticket    (create-ticket form + validation + attachments + CC)
 *      CURRENT measured coverage: 80.88% statements  (~49 statements still uncovered)
 *
 * RELATIONSHIP TO THE EXISTING SUITE
 *   FreshServiceLifecycle.test.js already drives the happy paths (mount gates, filter -> load,
 *   status/priority badges, single-page pagination + the stale-closure Next button, detail open,
 *   simple reply, single attachment, department cascade, the 5-char subject rule, the create
 *   payload, the 1s CC debounce and suggestion picking).  NOTHING below repeats those.  This suite
 *   drives only the arms that suite never reaches:
 *     - responses whose payload OMITS a key (`tickets`, `conversations`, `totalPages`)
 *     - the `!ticket.id` / NaN / <=0 guards on the two detail effects
 *     - `conv.createdAt` / `conv.bodyText` taking precedence over `created_at` / `body`
 *     - the shared `loading` flag (reply in flight, upload in flight)
 *     - the conversations reload that fails AFTER a reply succeeded
 *     - multi-file attachment removal by index (both screens)
 *     - subject length rule > 255, description > 4000, sanitizeInput on the submitted subject
 *     - a department with no configured categories, the Category placeholder, the
 *       "(No specific category)" label, the Category -> Sub-category reset
 *     - CC: clearing the box, a failed lookup, debounce collapse, unmount cleanup, trailing comma,
 *       and re-clicking an address that is already tagged
 *     - the list refetch that fires when the user comes back from a ticket
 *     - the priority guard, and re-submitting straight after a successful create
 *
 * FINDINGS (characterised - each test asserts what the code does TODAY; no source was modified.
 * Every one of these reproduces in Chrome, none of them depends on a jsdom quirk):
 *
 *   FST-REPLY-FALSE-FAIL  FreshServiceTickets.js:511-525  handleReplySubmit chains the thread
 *                         reload INSIDE the reply's `.then`. If the POST succeeds but the reload
 *                         GET fails, the inner `.catch` fires alert_error - so the user is shown a
 *                         failure alert for a reply the server already accepted, the editor has
 *                         already been cleared, and the thread still shows the OLD messages. The
 *                         natural reaction is to retype and send the reply a second time.
 *
 *   FSF-CCLOADING         FreshServiceForm.js:222  the CC-suggestion request's `.finally` calls
 *                         setLoading(false) - the very same `loading` flag that disables the
 *                         "Create a Ticket" button while the create POST is in flight. Type a CC
 *                         name and submit within the 1s debounce and the suggestion response
 *                         re-enables the button mid-submit, so the form can be submitted twice and
 *                         two identical tickets are created.
 *
 *   FSF-CATPLACEHOLDER    FreshServiceForm.js:369  the Category <select> stores the option TEXT.
 *                         Choosing the placeholder row back again stores the literal string
 *                         "Select Category", which is truthy, so the subject prefix becomes
 *                         "[IT Support] | [Select Category] | - " and is posted that way.
 *                         (Same root cause as the known FSF-PLACEHOLDER, different control and a
 *                         different visible outcome: here it corrupts the subject rather than
 *                         defeating a required check.)
 *
 *   FSF-NOSPEC            FreshServiceForm.js:398  a sub-category row whose SubCategoryName is
 *                         empty is LABELLED "(No specific category)", and because the handler
 *                         stores option text that placeholder label is what lands in the subject:
 *                         "[IT Support] | [Hardware] | [(No specific category)] | - ".
 *
 *   FSF-RESET2            FreshServiceForm.js:239-241  the second level of the known FSF-RESET:
 *                         changing the Category clears selectedItemCategory (the NAME) but not
 *                         selectedItemCategoryId, so when the incoming category reuses a
 *                         sub-category id the dropdown still shows a highlighted selection that
 *                         has already been dropped from the subject.
 *
 * ADDITIVE ONLY - no existing test file touched, no application code changed.
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
 * Plain <textarea>. Reproduces the two contract points the screens rely on:
 *   - onEditorChange(newContent, editor) on every keystroke
 *   - onInit(evt, editor) once on mount (CreateTicketPage injects the signature there)
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

// '9' Facilities is deliberately ABSENT from CATEGORIES - that is the "department with no
// configured categories" arm. '13' reuses sub-category id '100', which is what makes FSF-RESET2
// visible. '102' has an empty SubCategoryName, which is what makes FSF-NOSPEC visible.
const WORKSPACES = [
    { Id: '2', Name: 'IT Support' },
    { Id: '5', Name: 'HR Services' },
    { Id: '9', Name: 'Facilities' },
];

const CATEGORIES = {
    '2': [
        { Id: '10', CategoryName: 'Hardware' },
        { Id: '11', CategoryName: 'Software' },
        { Id: '13', CategoryName: 'Peripherals' },
    ],
    '5': [{ Id: '10', CategoryName: 'Payroll' }],
};

const SUB_CATEGORIES = {
    '10': [{ Id: '100', SubCategoryName: 'Printer' }, { Id: '102', SubCategoryName: '' }],
    '11': [],
    '13': [{ Id: '100', SubCategoryName: 'Monitor' }],
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

// A rejection shaped the way services/API actually formats one (no `.message`).
const envelope = (status, statusText) => ({ status, statusText, data: {}, headers: {} });

function routeApi(handlers = {}) {
    API.call.mockImplementation((cfg) => {
        const url = cfg.url || '';
        if (url.includes('my-tickets')) return (handlers.list || ok({ tickets: [], pagination: null }))(cfg);
        if (url.includes('/conversations')) return (handlers.convos || ok({ conversations: [] }))(cfg);
        if (url.includes('/reply')) return (handlers.reply || ok({}))(cfg);
        if (url.includes('/attachments')) return (handlers.attach || ok({ files: ['uploads/x'] }))(cfg);
        if (url.includes('suggestions')) return (handlers.suggest || (() => Promise.resolve({ data: [] })))(cfg);
        if (url === '/freshservice/tickets') return (handlers.create || ok({ id: 999 }))(cfg);
        if (/^\/freshservice\/tickets\/[^/]+$/.test(url)) return (handlers.detail || ok(ticket()))(cfg);
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

const allUrls = () => API.call.mock.calls.map((c) => (c[0] || {}).url);
const callsTo = (fragment) =>
    API.call.mock.calls.map((c) => c[0]).filter((c) => (c.url || '').includes(fragment));
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

const filterSelects = (c) => c.querySelectorAll('.filters-fs select.form-select');

const group = (c, labelText) =>
    Array.from(c.querySelectorAll('.form-group')).find((gr) =>
        Array.from(gr.querySelectorAll('label.form-label')).some((l) => l.textContent === labelText)
    );

const errorTexts = (c) => Array.from(c.querySelectorAll('.error-message')).map((e) => e.textContent);

const setFiles = (input, files) => {
    Object.defineProperty(input, 'files', { value: files, configurable: true });
    fireEvent.change(input);
};

const file = (name) => new File(['bytes'], name, { type: 'application/pdf' });

const pick = (container, label, value) =>
    fireEvent.change(group(container, label).querySelector('select'), { target: { value } });

const typeSubject = (container, v) =>
    fireEvent.change(group(container, 'Your Subject *').querySelector('input'), { target: { value: v } });

const typeBody = (container, v) =>
    fireEvent.change(container.querySelector('[data-testid="tinymce"]'), { target: { value: v } });

const typeCc = (container, v) =>
    fireEvent.change(group(container, 'CC Emails (Optional)').querySelector('input'), { target: { value: v } });

const submitForm = async (container) => {
    await act(async () => { fireEvent.submit(container.querySelector('form')); });
    await flush();
};

// department + subject + description that satisfy every live validation rule
const fillValid = (container) => {
    pick(container, 'EV Department *', '2');
    typeSubject(container, 'Printer is broken');
    typeBody(container, '<p>My printer stopped working today</p>');
};

const openDetails = async (handlers = {}, tickets = [ticket()]) => {
    routeApi({ list: ok({ tickets, pagination: null }), ...handlers });
    const utils = renderTickets();
    fireEvent.change(filterSelects(utils.container)[0], { target: { value: '2' } });
    await flush();
    await act(async () => { fireEvent.click(utils.container.querySelector('tbody tr')); });
    await flush();
    return utils;
};

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
 * PART 1 - My Tickets : responses with missing keys
 * ================================================================================= */

describe('EV Assist -> My Tickets : responses that omit payload keys', () => {

    it('treats a response with no tickets key as an empty result rather than crashing the table', async () => {
        routeApi({ list: ok({}) });
        const { container, getByText } = renderTickets();

        fireEvent.change(filterSelects(container)[0], { target: { value: '2' } });
        await flush();

        expect(getByText('No tickets found')).toBeInTheDocument();
        expect(getByText('0 tickets')).toBeInTheDocument();
        expect(container.querySelector('.notification-badge')).toBeNull();
        expect(container.querySelector('.pagination-controls')).toBeNull();
    });

    it('still renders the pager when the pagination block carries no totalPages, printing an undefined page count', async () => {
        routeApi({ list: ok({ tickets: [ticket()], pagination: { currentPage: 1, hasPrevious: false, hasNext: true } }) });
        const { container, getByText } = renderTickets();

        fireEvent.change(filterSelects(container)[0], { target: { value: '2' } });
        await flush();

        expect(getByText('Page 1 of undefined')).toBeInTheDocument();
        const [prev, next] = container.querySelectorAll('.pagination-controls button');
        expect(prev.disabled).toBe(true);
        expect(next.disabled).toBe(false);
    });

    // Same root cause as the already-reported FST-PAGE-STALE (onPageChange is memoised with an empty
    // dependency array), reached through the OTHER pager control: the Previous button is wired to a
    // loadTickets closure that still believes no department is selected.
    it('drops the whole list when Previous is pressed on a later page instead of loading the earlier one', async () => {
        routeApi({ list: ok({ tickets: [ticket()], pagination: { currentPage: 2, totalPages: 3, hasPrevious: true, hasNext: true } }) });
        const { container, getByText } = renderTickets();

        fireEvent.change(filterSelects(container)[0], { target: { value: '2' } });
        await flush();
        expect(container.querySelectorAll('tbody tr')).toHaveLength(1);

        const prev = container.querySelectorAll('.pagination-controls button')[0];
        expect(prev.disabled).toBe(false);
        await act(async () => { fireEvent.click(prev); });
        await flush();

        expect(callsTo('my-tickets')).toHaveLength(1);            // no page=1 request was ever sent
        expect(getByText('No tickets found')).toBeInTheDocument(); // and page 2 was thrown away
        expect(container.querySelector('.pagination-controls')).toBeNull();
    });

    it('shows the empty-thread state when the conversations response omits the conversations key', async () => {
        const { container, getByText } = await openDetails({ convos: ok({}) });

        expect(getByText('No conversations yet.')).toBeInTheDocument();
        expect(container.querySelectorAll('.conversation-item')).toHaveLength(0);
        expect(container.querySelector('.loading')).toBeNull();
    });

    it('passes each Status filter value through to the query string unchanged', async () => {
        const { container } = renderTickets();
        fireEvent.change(filterSelects(container)[0], { target: { value: '2' } });
        await flush();

        for (const status of ['open', 'pending', 'closed']) {
            fireEvent.change(filterSelects(container)[1], { target: { value: status } });
            await flush();
        }

        const urls = callsTo('my-tickets').map((c) => c.url);
        expect(urls).toHaveLength(4);
        expect(urls.slice(1)).toEqual([
            '/freshservice/tickets/my-tickets?status=open&page=1&limit=100&userEmail=vishnu.p%40eastvantage.com&workspaceId=2',
            '/freshservice/tickets/my-tickets?status=pending&page=1&limit=100&userEmail=vishnu.p%40eastvantage.com&workspaceId=2',
            '/freshservice/tickets/my-tickets?status=closed&page=1&limit=100&userEmail=vishnu.p%40eastvantage.com&workspaceId=2',
        ]);
    });

    it('strips a javascript: scheme out of a ticket subject before it reaches the table', async () => {
        routeApi({ list: ok({ tickets: [ticket({ id: 12, subject: 'javascript:alert(1) printer down' })], pagination: null }) });
        const { container } = renderTickets();

        fireEvent.change(filterSelects(container)[0], { target: { value: '2' } });
        await flush();

        expect(container.querySelector('.ticket-subject').textContent).toBe('#12 alert(1) printer down');
    });
});

/* =================================================================================
 * PART 2 - My Tickets : the detail-page id guards
 * ================================================================================= */

describe('EV Assist -> My Tickets : ticket id guards on the detail page', () => {

    it('opens the detail page but loads nothing when the selected ticket carries no id', async () => {
        const { container, getByText } = await openDetails({}, [ticket({ id: '' })]);

        expect(getByText('Ticket #')).toBeInTheDocument();
        expect(allUrls().filter((u) => u !== undefined)).toEqual([
            '/freshservice/tickets/my-tickets?status=all&page=1&limit=100&userEmail=vishnu.p%40eastvantage.com&workspaceId=2',
        ]);
        expect(getByText('No conversations yet.')).toBeInTheDocument();
        expect(container.querySelector('.loading')).toBeNull();
    });

    it('loads neither the ticket nor its thread when the id is not a positive number', async () => {
        const notANumber = await openDetails({}, [ticket({ id: 'abc' })]);
        expect(callsTo('/freshservice/tickets/abc')).toHaveLength(0);
        expect(notANumber.getByText('Ticket #abc')).toBeInTheDocument();
        notANumber.unmount();

        jest.clearAllMocks();
        const negative = await openDetails({}, [ticket({ id: -5 })]);
        expect(callsTo('/freshservice/tickets/-5')).toHaveLength(0);
        expect(negative.getByText('Ticket #-5')).toBeInTheDocument();
    });

    it('fetches both the ticket and its thread for a positive numeric id, proving the guard is the only thing suppressing them', async () => {
        await openDetails();

        expect(callsTo('/freshservice/tickets/101').map((c) => c.url).sort()).toEqual([
            '/freshservice/tickets/101',
            '/freshservice/tickets/101/conversations/',
        ]);
    });
});

/* =================================================================================
 * PART 3 - My Tickets : conversation field precedence
 * ================================================================================= */

describe('EV Assist -> My Tickets : conversation field precedence', () => {

    it('prefers createdAt over created_at and bodyText over body when both are present', async () => {
        const { container } = await openDetails({
            convos: ok({
                conversations: [{
                    id: 1,
                    createdAt: '2026-05-01T08:00:00.000Z',
                    created_at: 'not-a-date',
                    bodyText: '<p>camelCase wins</p>',
                    body: '<p>snake_case loses</p>',
                }],
            }),
        });

        const item = container.querySelector('.conversation-item');
        expect(item.querySelector('.conversation-date').textContent).not.toBe('Invalid Date');
        expect(item.querySelector('.conversation-date').textContent).toContain('2026');
        expect(item.querySelector('.conversation-body').innerHTML).toBe('<p>camelCase wins</p>');
    });

    it('falls back to created_at and body when the camelCase fields are absent, and to Invalid Date when neither parses', async () => {
        const { container } = await openDetails({
            convos: ok({
                conversations: [
                    { id: 1, created_at: '2026-05-01T08:00:00.000Z', body: '<p>snake_case used</p>' },
                    { id: 2, createdAt: 'rubbish', body: '<p>second</p>' },
                ],
            }),
        });

        const items = container.querySelectorAll('.conversation-item');
        expect(items[0].querySelector('.conversation-date').textContent).toContain('2026');
        expect(items[0].querySelector('.conversation-body').innerHTML).toBe('<p>snake_case used</p>');
        expect(items[1].querySelector('.conversation-date').textContent).toBe('Invalid Date');
    });
});

/* =================================================================================
 * PART 4 - My Tickets : the shared loading flag and the reply reload
 * ================================================================================= */

describe('EV Assist -> My Tickets : reply lifecycle', () => {

    it('labels the button Adding Reply... while the POST is in flight and disables it again once the editor is cleared', async () => {
        let resolveReply;
        const { container } = await openDetails({ reply: () => new Promise((res) => { resolveReply = res; }) });

        typeBody(container, '<p>Any update?</p>');
        expect(container.querySelector('button.btn-fs').disabled).toBe(false);

        await act(async () => { fireEvent.submit(container.querySelector('form')); });
        expect(container.querySelector('button.btn-fs').textContent).toBe('Adding Reply...');
        expect(container.querySelector('button.btn-fs').disabled).toBe(true);

        await act(async () => { resolveReply({ data: { content: {} } }); });
        await flush();

        expect(container.querySelector('button.btn-fs').textContent).toBe('Add Reply');
        expect(container.querySelector('[data-testid="tinymce"]').value).toBe('');
        expect(container.querySelector('button.btn-fs').disabled).toBe(true);
    });

    it('blocks the Add Reply button while an attachment upload is still running, then releases it', async () => {
        let resolveUpload;
        const { container } = await openDetails({ attach: () => new Promise((res) => { resolveUpload = res; }) });

        typeBody(container, '<p>see attached</p>');
        expect(container.querySelector('button.btn-fs').disabled).toBe(false);

        setFiles(container.querySelector('input[type="file"]'), [file('invoice.pdf')]);
        expect(container.querySelector('button.btn-fs').textContent).toBe('Adding Reply...');
        expect(container.querySelector('button.btn-fs').disabled).toBe(true);

        await act(async () => { resolveUpload({ data: { content: { files: ['uploads/invoice.pdf'] } } }); });
        await flush();

        expect(container.querySelector('button.btn-fs').textContent).toBe('Add Reply');
        expect(container.querySelector('button.btn-fs').disabled).toBe(false);
    });

    // FINDING FST-REPLY-FALSE-FAIL - the thread reload is chained inside the reply's `.then`, and
    // its own `.catch` raises the standard error alert. A reply the server ACCEPTED is therefore
    // reported to the user as a failure, the editor has already been emptied, and the thread still
    // shows only the old messages - so the user cannot tell the reply landed and will send it again.
    it('reports a successful reply as a failure when the thread reload dies _FINDING_FST-REPLY-FALSE-FAIL', async () => {
        const boom = envelope(503, 'Service Unavailable');
        let convoCall = 0;
        const { container } = await openDetails({
            convos: () => {
                convoCall += 1;
                if (convoCall === 1) {
                    return Promise.resolve({
                        data: { content: { conversations: [{ id: 1, created_at: '2026-07-02T09:00:00.000Z', body: '<p>Original message</p>' }] } },
                    });
                }
                return Promise.reject(boom);
            },
        });

        typeBody(container, '<p>Any update?</p>');
        await act(async () => { fireEvent.submit(container.querySelector('form')); });
        await flush();

        // the reply itself was accepted
        expect(callsTo('/reply')).toHaveLength(1);
        // ...but the user is shown an error and the thread is unchanged
        expect(Formatter.alert_error).toHaveBeenCalledWith(boom);
        expect(mockDispatch).toHaveBeenCalledWith({ type: 'SHOW_ALERT', error: boom });
        expect(container.querySelectorAll('.conversation-item')).toHaveLength(1);
        expect(container.querySelector('.conversation-body').innerHTML).toBe('<p>Original message</p>');
        // ...and their text is gone, so a retype-and-resend produces a duplicate
        expect(container.querySelector('[data-testid="tinymce"]').value).toBe('');
        expect(convoCall).toBe(2);
    });

    it('empties the thread when the post-reply reload comes back without a conversations key', async () => {
        let convoCall = 0;
        const { container, getByText } = await openDetails({
            convos: () => {
                convoCall += 1;
                return Promise.resolve({
                    data: {
                        content: convoCall === 1
                            ? { conversations: [{ id: 1, created_at: '2026-07-02T09:00:00.000Z', body: '<p>Original message</p>' }] }
                            : {},
                    },
                });
            },
        });
        expect(container.querySelectorAll('.conversation-item')).toHaveLength(1);

        typeBody(container, '<p>Any update?</p>');
        await act(async () => { fireEvent.submit(container.querySelector('form')); });
        await flush();

        expect(callsTo('/reply')).toHaveLength(1);
        expect(convoCall).toBe(2);
        expect(container.querySelectorAll('.conversation-item')).toHaveLength(0);
        expect(getByText('No conversations yet.')).toBeInTheDocument();
        expect(Formatter.alert_error).not.toHaveBeenCalled();
    });

    it('reloads the list with the filters still applied when the user comes back from a ticket', async () => {
        routeApi({ list: ok({ tickets: [ticket()], pagination: null }) });
        const { container } = renderTickets();

        fireEvent.change(filterSelects(container)[0], { target: { value: '2' } });
        await flush();
        fireEvent.change(filterSelects(container)[1], { target: { value: 'resolved' } });
        await flush();
        expect(callsTo('my-tickets')).toHaveLength(2);

        await act(async () => { fireEvent.click(container.querySelector('tbody tr')); });
        await flush();
        expect(callsTo('my-tickets')).toHaveLength(2);          // the detail view does not refetch

        await act(async () => { fireEvent.click(container.querySelectorAll('.back-button')[1]); });
        await flush();

        const reqs = callsTo('my-tickets');
        expect(reqs).toHaveLength(3);
        expect(reqs[2].url).toBe(reqs[1].url);
        expect(reqs[2].url).toContain('status=resolved');
        expect(container.querySelectorAll('tbody tr')).toHaveLength(1);
    });

    it('removes the right file when several reply attachments are uploaded and the first one is dropped', async () => {
        let upload = 0;
        const { container } = await openDetails({
            attach: () => {
                upload += 1;
                return Promise.resolve({ data: { content: { files: ['uploads/first-' + upload + '.pdf'] } } });
            },
        });

        setFiles(container.querySelector('input[type="file"]'), [file('alpha.pdf')]);
        await flush();
        setFiles(container.querySelector('input[type="file"]'), [file('beta.pdf')]);
        await flush();

        let items = Array.from(container.querySelectorAll('.attachments-list-fs li'));
        expect(items.map((li) => li.textContent)).toEqual(['alpha.pdf❌', 'beta.pdf❌']);

        fireEvent.click(container.querySelectorAll('.attachment-remove-btn-fs')[0]);
        items = Array.from(container.querySelectorAll('.attachments-list-fs li'));
        expect(items.map((li) => li.textContent)).toEqual(['beta.pdf❌']);

        typeBody(container, 'sending the second file only');
        await act(async () => { fireEvent.submit(container.querySelector('form')); });
        await flush();

        expect(callsTo('/reply')[0].data.attachments).toEqual(['uploads/first-2.pdf']);
        expect(callsTo('/reply')[0].data.removed_attachments).toEqual(['uploads/first-1.pdf']);
    });
});

/* =================================================================================
 * PART 5 - Raise a Ticket : the length rules the existing suite does not reach
 * ================================================================================= */

describe('EV Assist -> Raise a Ticket : subject and description length rules', () => {

    const PREFIX = '[IT Support] | | - ';

    it('accepts a total subject of exactly 255 characters and rejects the 256th', async () => {
        expect(PREFIX).toHaveLength(19);
        const { container } = renderForm();
        pick(container, 'EV Department *', '2');

        typeSubject(container, 'x'.repeat(256 - PREFIX.length));
        expect(container.querySelector('.subject-preview').textContent).toHaveLength(256);
        await submitForm(container);

        expect(errorTexts(container)).toContain('⚠️ Total subject (including categories) must be less than 255 characters');
        expect(createCalls()).toHaveLength(0);

        typeSubject(container, 'x'.repeat(255 - PREFIX.length));
        expect(container.querySelector('.subject-preview').textContent).toHaveLength(255);
        await submitForm(container);

        expect(errorTexts(container)).not.toContain('⚠️ Total subject (including categories) must be less than 255 characters');
        expect(createCalls()).toHaveLength(1);
        expect(createCalls()[0].data.subject).toHaveLength(255);
    });

    it('imposes no upper bound on the description and posts a 5000-character body verbatim', async () => {
        const { container } = renderForm();
        fillValid(container);
        typeBody(container, 'd'.repeat(5000));

        await submitForm(container);

        expect(errorTexts(container)).toHaveLength(0);
        expect(createCalls()).toHaveLength(1);
        expect(createCalls()[0].data.description).toHaveLength(5000);
    });

    it('sanitises the submitted subject but sends the description exactly as typed', async () => {
        const { container } = renderForm();
        pick(container, 'EV Department *', '2');
        typeSubject(container, '<b>VPN</b> javascript:alert down');
        typeBody(container, '<p>Tunnel drops every javascript: five minutes</p>');

        await submitForm(container);

        expect(createCalls()[0].data.subject).toBe('[IT Support] | | - bVPN/b alert down');
        expect(createCalls()[0].data.description).toBe('<p>Tunnel drops every javascript: five minutes</p>');
    });
});

/* =================================================================================
 * PART 6 - Raise a Ticket : category selection arms
 * ================================================================================= */

describe('EV Assist -> Raise a Ticket : category selection arms', () => {

    it('offers no Category control for a department that has no configured categories, and still submits', async () => {
        const { container } = renderForm();
        pick(container, 'EV Department *', '9');   // Facilities is absent from props.categories

        expect(group(container, 'Category *')).toBeUndefined();
        expect(container.querySelector('input[type="file"]')).not.toBeNull();
        expect(container.querySelector('.subject-preview').textContent).toBe('[Facilities] | | - ');

        typeSubject(container, 'Aircon is leaking');
        await submitForm(container);

        expect(createCalls()).toHaveLength(1);
        expect(createCalls()[0].data.subject).toBe('[Facilities] | | - Aircon is leaking');
        expect(createCalls()[0].data.workspace_id).toBe('9');
    });

    // FINDING FSF-CATPLACEHOLDER - the Category handler stores the option TEXT, so returning to the
    // placeholder row writes the literal "Select Category" into selectedSubCategory. It is truthy,
    // so buildSubjectPrefix happily brackets it and the ticket is filed with a subject that reads
    // "[IT Support] | [Select Category] | - ...". The Sub-category control disappears at the same
    // time because it is gated on the *id*, which really was cleared.
    it('re-selecting the Category placeholder writes Select Category into the subject _FINDING_FSF-CATPLACEHOLDER', async () => {
        const { container } = renderForm();
        pick(container, 'EV Department *', '2');
        pick(container, 'Category *', '10');
        expect(container.querySelector('.subject-preview').textContent).toBe('[IT Support] | [Hardware] | - ');
        expect(group(container, 'Sub-category')).toBeDefined();

        pick(container, 'Category *', '');

        expect(group(container, 'Sub-category')).toBeUndefined();
        expect(container.querySelector('.subject-preview').textContent).toBe('[IT Support] | [Select Category] | - ');

        typeSubject(container, 'Mouse not working');
        await submitForm(container);
        expect(createCalls()[0].data.subject).toBe('[IT Support] | [Select Category] | - Mouse not working');
    });

    // FINDING FSF-NOSPEC - a sub-category row with an empty SubCategoryName is displayed as
    // "(No specific category)", and because the change handler stores option TEXT that display-only
    // placeholder becomes the category name in the subject line the agent sees in FreshService.
    it('files the placeholder label as the sub-category when the sub-category name is empty _FINDING_FSF-NOSPEC', async () => {
        const { container } = renderForm();
        pick(container, 'EV Department *', '2');
        pick(container, 'Category *', '10');

        const opts = Array.from(group(container, 'Sub-category').querySelectorAll('option'));
        expect(opts.map((o) => o.textContent)).toEqual(['Select Sub-category', 'Printer', '(No specific category)']);

        pick(container, 'Sub-category', '102');

        expect(container.querySelector('.subject-preview').textContent)
            .toBe('[IT Support] | [Hardware] | [(No specific category)] | - ');

        typeSubject(container, 'Cable is frayed');
        await submitForm(container);
        expect(createCalls()[0].data.subject)
            .toBe('[IT Support] | [Hardware] | [(No specific category)] | - Cable is frayed');
    });

    // FINDING FSF-RESET2 - second level of the known FSF-RESET. updateField clears the sub-category
    // NAME when the Category changes but leaves selectedItemCategoryId alone, so a category that
    // reuses the same sub-category id ('100' is Printer under Hardware and Monitor under
    // Peripherals) keeps a highlighted selection that has already been dropped from the subject.
    it('keeps a stale sub-category selected in the dropdown after the Category changes _FINDING_FSF-RESET2', () => {
        const { container } = renderForm();
        pick(container, 'EV Department *', '2');
        pick(container, 'Category *', '10');
        pick(container, 'Sub-category', '100');
        expect(container.querySelector('.subject-preview').textContent).toBe('[IT Support] | [Hardware] | [Printer] | - ');

        pick(container, 'Category *', '13');

        expect(group(container, 'Sub-category').querySelector('select').value).toBe('100'); // still "chosen"
        expect(container.querySelector('.subject-preview').textContent).toBe('[IT Support] | [Peripherals] | - '); // but dropped
    });
});

/* =================================================================================
 * PART 7 - Raise a Ticket : CC lookup arms
 * ================================================================================= */

describe('EV Assist -> Raise a Ticket : CC lookup arms', () => {

    const SUGGESTIONS = ['Vishnu P <vishnu.p@eastvantage.com>', 'Vince <vince@eastvantage.com>'];

    it('clears the suggestion list the moment the CC box is emptied, without another lookup', async () => {
        routeApi({ suggest: () => Promise.resolve({ data: SUGGESTIONS }) });
        const { container } = renderForm();

        typeCc(container, 'vi');
        await act(async () => { jest.advanceTimersByTime(1000); });
        await flush();
        expect(container.querySelectorAll('.cc-suggestion-item')).toHaveLength(2);

        typeCc(container, '');
        expect(container.querySelectorAll('.cc-suggestion-item')).toHaveLength(0);

        await act(async () => { jest.advanceTimersByTime(2000); });
        await flush();
        expect(callsTo('suggestions')).toHaveLength(1);
    });

    it('raises the standard alert and offers no suggestions when the lookup fails', async () => {
        const boom = envelope(500, 'Internal Server Error');
        routeApi({ suggest: fail(boom) });
        const { container } = renderForm();

        typeCc(container, 'vi');
        await act(async () => { jest.advanceTimersByTime(1000); });
        await flush();

        expect(callsTo('suggestions')).toHaveLength(1);
        expect(Formatter.alert_error).toHaveBeenCalledWith(boom);
        expect(container.querySelectorAll('.cc-suggestion-item')).toHaveLength(0);
        expect(container.querySelectorAll('.cc-tag')).toHaveLength(0);
    });

    it('collapses fast typing into a single lookup for the final keyword', async () => {
        routeApi({ suggest: () => Promise.resolve({ data: SUGGESTIONS }) });
        const { container } = renderForm();

        typeCc(container, 'vi');
        await act(async () => { jest.advanceTimersByTime(500); });
        typeCc(container, 'vis');
        await act(async () => { jest.advanceTimersByTime(500); });
        typeCc(container, 'vish');
        await act(async () => { jest.advanceTimersByTime(999); });
        expect(callsTo('suggestions')).toHaveLength(0);

        await act(async () => { jest.advanceTimersByTime(1); });
        await flush();

        expect(callsTo('suggestions')).toHaveLength(1);
        expect(callsTo('suggestions')[0].params).toEqual({ keyword: 'vish' });
    });

    it('cancels a pending lookup when the screen is left before the debounce elapses', async () => {
        const { container, unmount } = renderForm();

        typeCc(container, 'vi');
        await act(async () => { jest.advanceTimersByTime(500); });
        unmount();

        await act(async () => { jest.advanceTimersByTime(5000); });
        expect(callsTo('suggestions')).toHaveLength(0);
    });

    it('never searches on a trailing comma, but does search the term typed after it', async () => {
        routeApi({ suggest: () => Promise.resolve({ data: SUGGESTIONS }) });
        const { container } = renderForm();

        typeCc(container, 'gary.a@eastvantage.com,');
        await act(async () => { jest.advanceTimersByTime(1000); });
        await flush();
        expect(callsTo('suggestions')).toHaveLength(0);

        typeCc(container, 'gary.a@eastvantage.com,vi');
        await act(async () => { jest.advanceTimersByTime(1000); });
        await flush();

        expect(callsTo('suggestions')).toHaveLength(1);
        expect(callsTo('suggestions')[0].params).toEqual({ keyword: 'vi' });
    });

    it('leaves the suggestion list open and the typed term in place when the clicked address is already tagged', async () => {
        routeApi({ suggest: () => Promise.resolve({ data: ['Vishnu P <vishnu.p@eastvantage.com>'] }) });
        const { container } = renderForm();
        const ccBox = () => group(container, 'CC Emails (Optional)').querySelector('input');

        typeCc(container, 'vi');
        await act(async () => { jest.advanceTimersByTime(1000); });
        await flush();
        await act(async () => { fireEvent.click(container.querySelector('.cc-suggestion-item')); });
        await flush();
        expect(container.querySelectorAll('.cc-tag')).toHaveLength(1);
        expect(container.querySelectorAll('.cc-suggestion-item')).toHaveLength(0);
        expect(ccBox().value).toBe('');

        // second pass: the very same address is offered again and clicked again
        typeCc(container, 'vi');
        await act(async () => { jest.advanceTimersByTime(1000); });
        await flush();
        await act(async () => { fireEvent.click(container.querySelector('.cc-suggestion-item')); });
        await flush();

        expect(container.querySelectorAll('.cc-tag')).toHaveLength(1);       // no duplicate tag
        expect(container.querySelectorAll('.cc-suggestion-item')).toHaveLength(1); // list stays open
        expect(ccBox().value).toBe('vi');                                    // and the term is not cleared
    });

    // FINDING FSF-CCLOADING - `loading` is shared between the CC lookup and the create POST. The
    // lookup's `.finally` sets it to false, so a suggestion response that lands while the create is
    // still in flight re-enables the "Create a Ticket" button. The user, seeing an enabled button
    // and no confirmation, clicks again and files a second identical ticket.
    it('re-enables Create while the POST is still in flight once a CC lookup lands, allowing a duplicate ticket _FINDING_FSF-CCLOADING', async () => {
        let resolveCreate;
        routeApi({
            create: () => new Promise((res) => { resolveCreate = res; }),
            suggest: () => Promise.resolve({ data: SUGGESTIONS }),
        });
        const { container } = renderForm();
        fillValid(container);

        typeCc(container, 'vi');                       // starts the 1s debounce
        await act(async () => { fireEvent.submit(container.querySelector('form')); });

        expect(createCalls()).toHaveLength(1);
        expect(container.querySelector('button.btn-fs').textContent).toBe('Creating...');
        expect(container.querySelector('button.btn-fs').disabled).toBe(true);

        await act(async () => { jest.advanceTimersByTime(1000); });   // the CC lookup resolves
        await flush();

        expect(container.querySelector('button.btn-fs').textContent).toBe('Create a Ticket');
        expect(container.querySelector('button.btn-fs').disabled).toBe(false);

        await act(async () => { fireEvent.submit(container.querySelector('form')); });
        await flush();

        expect(createCalls()).toHaveLength(2);
        expect(createCalls()[1].data).toEqual(createCalls()[0].data);
        expect(resolveCreate).toEqual(expect.any(Function));           // the first POST never resolved
    });
});

/* =================================================================================
 * PART 8 - Raise a Ticket : attachments, priority guard and post-submit state
 * ================================================================================= */

describe('EV Assist -> Raise a Ticket : attachments, priority and post-submit state', () => {

    it('removes the right file when several attachments are uploaded and the first one is dropped', async () => {
        let upload = 0;
        routeApi({
            attach: () => {
                upload += 1;
                return Promise.resolve({ data: { content: { files: ['uploads/file-' + upload + '.pdf'] } } });
            },
        });
        const { container } = renderForm();
        fillValid(container);

        setFiles(container.querySelector('input[type="file"]'), [file('alpha.pdf')]);
        await flush();
        setFiles(container.querySelector('input[type="file"]'), [file('beta.pdf')]);
        await flush();

        expect(Array.from(container.querySelectorAll('.attachments-list-fs li')).map((li) => li.textContent))
            .toEqual(['alpha.pdf❌', 'beta.pdf❌']);

        fireEvent.click(container.querySelectorAll('.attachment-remove-btn-fs')[0]);
        expect(Array.from(container.querySelectorAll('.attachments-list-fs li')).map((li) => li.textContent))
            .toEqual(['beta.pdf❌']);

        await submitForm(container);

        expect(createCalls()[0].data.attachments).toEqual(['uploads/file-2.pdf']);
        expect(createCalls()[0].data.removed_attachments).toEqual(['uploads/file-1.pdf']);
    });

    // NOT A FINDING, recorded so nobody re-opens it: the Priority guard
    // `!data.priority || ![1,2,3,4].includes(data.priority)` (FreshServiceForm.js:102) cannot fire
    // from the UI. A <select> whose value matches no option runs the "ask for a reset" algorithm and
    // selects the FIRST option instead - jsdom and Chrome behave identically here - so priority is
    // always one of 1..4 and errors.priority (which is never rendered anyway) stays unset.
    it('falls back to the first listed priority when an unlisted value is forced, instead of failing validation', async () => {
        const { container } = renderForm();
        fillValid(container);

        fireEvent.change(group(container, 'Priority *').querySelector('select'), { target: { value: '9' } });
        expect(group(container, 'Priority *').querySelector('select').value).toBe('1');

        await submitForm(container);

        expect(errorTexts(container)).toHaveLength(0);
        expect(createCalls()).toHaveLength(1);
        expect(createCalls()[0].data.priority).toBe(1);
    });

    it('empties the form after a successful create, so an immediate second submit is rejected and posts nothing', async () => {
        const { container } = renderForm();
        fillValid(container);
        await submitForm(container);
        expect(createCalls()).toHaveLength(1);

        await submitForm(container);

        expect(createCalls()).toHaveLength(1);
        expect(errorTexts(container)).toEqual(
            expect.arrayContaining(['⚠️ Subject must be at least 5 characters', '⚠️ Workspace must be selected'])
        );
        expect(container.querySelector('input[type="file"]')).toBeNull();
    });
});
