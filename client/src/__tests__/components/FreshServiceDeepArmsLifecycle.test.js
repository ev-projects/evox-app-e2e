/**
 * FreshServiceDeepArmsLifecycle.test.js
 *
 * SOURCE FILES UNDER TEST
 *   1. src/components/FreshService/FreshServiceTickets.js
 *      Menu: EV Assist -> My Tickets       (route: global.links.fresh_service_tickets, RouteList.js:550)
 *   2. src/components/FreshService/FreshServiceForm.js
 *      Menu: EV Assist -> Raise a Ticket   (route: global.links.fresh_service_create, RouteList.js:547)
 *
 *   Both screens sit behind live ProtectedRoutes. That makes the SCREENS reachable; it does not make
 *   every branch inside them reachable, and no coverage percentage is claimed here on that basis.
 *   The statement gain over the two existing suites is small on purpose: most of what is still
 *   uncovered in these two files sits in blocks with no call site (inventory below). The value of
 *   this suite is the branch arms it drives and the fourteen findings it characterises.
 *
 * HOW REACHABLE EACH FINDING IS - read this before treating one as a Chrome reproduction
 *   A. Driven end to end from the UI here, with only documented server payloads in between; these
 *      are ordinary user journeys:
 *        FST-RAWHTML, FST-EMPTYRICH, FST-UNMOUNTSET, FSF-EMPTYRICH, FSF-ATTACHDEPT, FSF-BANNERTIMER,
 *        FSF-SIGUNDEF, FSF-CCLOSTTERM, FSF-CCSTALE, FSF-UNMOUNTSET.
 *   B. Require the upstream FreshService middleware to answer HTTP 200 with a body missing a key
 *      EVOX reads - NOT reproduced in Chrome, and nothing in EVOX itself can manufacture them:
 *        FST-BLANKTICKET (content with no `id`), FST-EMPTYFILES (`files: []`),
 *        FST-GHOSTFILE / FSF-GHOSTFILE (content with no `files` key).
 *      FreshServiceController::getTicket (line 178) and ::saveAttachment (line 343) hand
 *      `$res->content` to success_response unvalidated, and convert every non-200 into a 400 that
 *      the front end rejects - so these arms are integration-hardening gaps against a partner
 *      service, not user-facing bugs today. The fix is a guard on the read; do not go looking for a
 *      user journey that triggers them.
 *
 * RELATIONSHIP TO THE TWO EXISTING SUITES
 *   FreshServiceLifecycle.test.js  - happy paths, badges, single-page pagination, create payload,
 *                                   CC debounce + suggestion picking, the 5-char subject rule.
 *   FreshServiceDeepLifecycle.test.js - missing payload keys, the id guards, field precedence,
 *                                   length rules, category placeholder arms, CC failure arms.
 *   This suite drives arms neither of them reaches:
 *     - the detail page following the id the SERVER returns rather than the row that was clicked
 *     - values only the API can produce (numeric subject, epoch created_at, raw HTML in the
 *       description / a conversation body, an attachment response with no usable file)
 *     - unmounting mid-upload, on both screens
 *     - whitespace-only subjects, attachments surviving a department swap
 *     - the success-banner timer, the signature built from an incomplete profile
 *     - CC text lost on pick, and suggestions left stranded on an abandoned term
 *   Two tests below deliberately re-use an assertion an existing suite already makes, as the anchor
 *   for something new, and say so at the test:
 *     - 'shows the current page's row count beside a nine-page pager' repeats the count assertions of
 *       FreshServiceLifecycle.test.js:305 (which has no pagination) in order to contrast them with a
 *       multi-page pager.
 *     - 'clears only the edited field's error' repeats FreshServiceLifecycle.test.js:991 for the
 *       cleared field, and adds the half that suite does not assert: the OTHER errors survive.
 *
 * WHAT IS DELIBERATELY *NOT* TESTED (unreachable - a test here would raise a number and protect
 * nobody, so it is recorded instead):
 *   - `apiCall` (Tickets:33, Form:16), `getUserAvatarClass` (Tickets:65, Form:48),
 *     `getUserInitials` (Tickets:76, Form:59), `SafeTextRenderer` (Tickets:88) and
 *     `buildSubjectPrefix` (Tickets:94) have NO call site in the shipped file - where a reference
 *     exists at all it is inside commented-out JSX. ~60 uncovered statements.
 *   - TicketDetailsPage's CC block (Tickets:444-482, 457-479 in particular). `setCcInput` appears
 *     only inside the commented-out CC markup (Tickets:665/678), so `ccInput` is permanently '' and
 *     the debounced lookup can never start.
 *   - `skipSearchRef.current` (Tickets:445-447, Form:190-192) is initialised false and never set
 *     true anywhere in either file.
 *   - The `WORKSPACE_CATEGORIES` validation block (Form:110-130) - see the already-filed
 *     FSF-DEADCAT; the constant is `{}` and never assigned.
 *   - `errors.selectedSubCategory` / `selectedItemCategory` / `ccEmails` / `attachments` / `submit`
 *     render gates (Form:380/401/471/555/598) - the only writer of those keys is the dead block above.
 *   - `onPageChange`'s `page = null` default (Tickets:879) - Pagination always passes a number.
 *   - `currentView === 'details' && !selectedTicket` (Tickets:915) - both are set together.
 *   - `states[ticket.id % 4]` with a non-numeric id (Tickets:200). FreshService ticket ids are
 *     integers and getMyTickets passes the upstream id straight through; a numeric string still
 *     works ('101' % 4 === 1). The real defect in that line - that State is a function of the ticket
 *     NUMBER, not of any SLA field - is already filed as FST-STATE and tested in
 *     FreshServiceLifecycle.test.js:444.
 *
 * FINDINGS (characterised - every test asserts what the code does TODAY; no application source was
 * modified. None depends on a jsdom quirk; see the reachability grouping above for which of them a
 * user can actually hit):
 *
 *   FST-BLANKTICKET   Tickets.js:399  the detail GET's result REPLACES the whole ticket object. A
 *                     response whose `content` carries no id blanks the header to "Ticket #undefined",
 *                     wipes the subject the user clicked, and - because both effects are keyed on
 *                     `ticket.id` - strands the previously loaded thread under a ticket that no
 *                     longer identifies itself.                                        [group B]
 *
 *   FST-RAWHTML       Tickets.js:563/614  the ticket description and every conversation body are
 *                     written with dangerouslySetInnerHTML and no sanitiser, while the subject on the
 *                     same screen IS run through sanitizeInput. Markup that FreshService stores is
 *                     therefore live DOM in EVOX.                                      [group A]
 *
 *   FST-EMPTYFILES    Tickets.js:747  the upload handler reads `result.data.content.files[0]` with no
 *                     guard. A response of `{files: []}` pushes `undefined` into attachmentsValues,
 *                     the file still appears in the list, and the reply posts `attachments: [null]`.
 *                                                                                       [group B]
 *
 *   FST-GHOSTFILE     Tickets.js:746-747  the same read, one failure mode worse: `setAttachments`
 *                     runs BEFORE `result.data.content.files[0]`, so a response with no `files` key
 *                     throws only after the list has been updated. The throw lands in the handler's
 *                     own `.catch` as a generic alert, leaving a file visibly "attached" that has no
 *                     recorded id - the reply is then posted with attachments: [].     [group B]
 *
 *   FSF-GHOSTFILE     Form.js:541-542  identical ordering bug on the create screen: the file is
 *                     listed, the error is alerted, and the ticket is created with attachments: [].
 *                                                                                       [group B]
 *
 *   FST-EMPTYRICH     Tickets.js:486/786  the "is there a reply?" guard is `reply.trim()`, applied to
 *                     the editor's HTML rather than to its text. TinyMCE 6 does return '' for a
 *                     genuinely empty editor, so the trigger is not "empty": a user who types a
 *                     single space (or leaves one behind) gets `<p>&nbsp;</p>` - 14 characters that
 *                     survive .trim() - so Add Reply enables and a visually blank message is posted
 *                     to the requester.                                                [group A]
 *
 *   FST-UNMOUNTSET    Tickets.js:745-757  the attachment upload's `.then`/`.finally` call setState on
 *                     TicketDetailsPage with no mounted-check and no abort. Clicking "Back to My
 *                     Tickets" while a file is still uploading unmounts that page and React logs
 *                     "Can't perform a React state update on an unmounted component ... memory
 *                     leak". The `if (fileInputRef.current)` guard on line 754 only protects the DOM
 *                     write - react-dom detaches that ref on unmount - it does nothing for the two
 *                     setState calls that precede it.                                  [group A]
 *
 *   FSF-UNMOUNTSET    Form.js:540-552  the same unguarded post-unmount setState on CreateTicketPage:
 *                     navigating away from Raise a Ticket mid-upload logs the same React warning.
 *                                                                                       [group A]
 *
 *   FSF-ATTACHDEPT    Form.js:235-243  changing the EV Department resets the category fields but not
 *                     the attachments. A file uploaded against workspace 2 is posted on a ticket
 *                     created in workspace 5, where that attachment id does not belong. [group A]
 *
 *   FSF-BANNERTIMER   Form.js:301  each successful create schedules its own bare
 *                     `setTimeout(..., 3000)` and none is ever cleared, so the FIRST timer can hide
 *                     the SECOND confirmation early. SEVERITY IS LOW: handleSubmit resets the whole
 *                     form on success, so a second create inside three seconds means re-picking the
 *                     department and retyping a >=5-character subject in that window. Treat this as
 *                     an uncleared-timer defect (it also fires after unmount), not as a confirmation
 *                     users are losing today.                                          [group A]
 *
 *   FSF-SIGUNDEF      Form.js:142-149  the default signature is a template literal over
 *                     props.user with no fallbacks, so a profile missing department_main / country
 *                     prints the literal words "null" and "undefined" - and that text is submitted
 *                     as the ticket description.                                       [group A]
 *
 *   FSF-CCLOSTTERM    Form.js:463  picking a suggestion calls setCcInput(''), which clears the WHOLE
 *                     box. Anything the user typed before the term they picked - typically a
 *                     hand-typed address in front of a comma - is discarded without a tag.
 *                                                                                       [group A]
 *
 *   FSF-CCSTALE       Form.js:206  when the last comma-separated term is shorter than two characters
 *                     the debounce callback `return`s without clearing ccSuggestions, so the previous
 *                     term's suggestions stay on screen and remain clickable.          [group A]
 *
 *   FSF-EMPTYRICH     Form.js:96  the description minimum is a raw `.trim().length < 10` on the HTML.
 *                     Same trigger as FST-EMPTYRICH: one typed space serialises to `<p>&nbsp;</p>`,
 *                     14 characters, which satisfies "at least 10 characters", and a
 *                     description-less ticket is filed.                                [group A]
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

const WORKSPACES = [
    { Id: '2', Name: 'IT Support' },
    { Id: '5', Name: 'HR Services' },
];

// '103' carries a whitespace-only SubCategoryName - the arm that proves a blank name is dropped
// from the subject prefix rather than bracketed.
const CATEGORIES = {
    '2': [{ Id: '10', CategoryName: 'Hardware' }, { Id: '11', CategoryName: 'Software' }],
    '5': [{ Id: '20', CategoryName: 'Payroll' }],
};
const SUB_CATEGORIES = {
    '10': [{ Id: '100', SubCategoryName: 'Printer' }, { Id: '103', SubCategoryName: '   ' }],
    '11': [],
    '20': [],
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

// CC suggestion strings exactly as FreshServiceController::getUserSuggestions builds them -
// sprintf('%s %s <%s> - %s', first_name, last_name, email, job_title) - trailing job title included.
// The screens extract the address with /<([^>]+)>/, so the suffix is inert, but the fixture is the
// real payload rather than a shortened one.
const SUGGESTION = 'Vishnu P <vishnu.p@eastvantage.com> - Project Lead';
const SUGGESTIONS = [SUGGESTION, 'Vince M <vince@eastvantage.com> - Service Desk Analyst'];

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

const fillValid = (container) => {
    pick(container, 'EV Department *', '2');
    typeSubject(container, 'Printer is broken');
    typeBody(container, '<p>My printer stopped working today</p>');
};

// Load the list for department 2, then open the row at `index`.
const openRow = async (handlers = {}, tickets = [ticket()], index = 0) => {
    routeApi({ list: ok({ tickets, pagination: null }), ...handlers });
    const utils = renderTickets();
    fireEvent.change(filterSelects(utils.container)[0], { target: { value: '2' } });
    await flush();
    await act(async () => { fireEvent.click(utils.container.querySelectorAll('tbody tr')[index]); });
    await flush();
    return utils;
};

// Load the list for department 2 only.
const openList = async (handlers = {}, tickets = [ticket()], pagination = null) => {
    routeApi({ list: ok({ tickets, pagination }), ...handlers });
    const utils = renderTickets();
    fireEvent.change(filterSelects(utils.container)[0], { target: { value: '2' } });
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
 * PART 1 - My Tickets : the detail page follows the id the SERVER returns
 * ================================================================================= */

describe('EV Assist -> My Tickets : whose ticket the detail page is actually showing', () => {

    it('re-fetches against the id the server returns when it differs from the row that was clicked', async () => {
        const { getByText, queryByText } = await openRow({
            detail: ok(ticket({ id: 202, subject: 'Merged into 202' })),
        });

        expect(allUrls().filter((u) => /^\/freshservice\/tickets\/\d+$/.test(u)))
            .toEqual(['/freshservice/tickets/101', '/freshservice/tickets/202']);
        expect(allUrls().filter((u) => /conversations/.test(u)))
            .toEqual(['/freshservice/tickets/101/conversations/', '/freshservice/tickets/202/conversations/']);
        expect(getByText('Ticket #202')).toBeInTheDocument();
        expect(getByText('Merged into 202')).toBeInTheDocument();
        expect(queryByText('Printer jammed')).toBeNull();
    });

    it('settles after one redirect rather than looping, because the second response repeats the id', async () => {
        await openRow({ detail: ok(ticket({ id: 202 })) });

        expect(callsTo('/freshservice/tickets/202')).toHaveLength(2); // the ticket and its thread, once each
        expect(allUrls().filter((u) => /^\/freshservice\/tickets\/\d+$/.test(u))).toHaveLength(2);
    });

    it('addresses the reply to the refreshed ticket id and requester, not to the row that was clicked', async () => {
        const { container } = await openRow({
            detail: ok(ticket({ id: 202, requester_id: 77 })),
        });

        typeBody(container, '<p>Any update?</p>');
        await act(async () => { fireEvent.submit(container.querySelector('form')); });
        await flush();

        const sent = callsTo('/reply');
        expect(sent).toHaveLength(1);
        expect(sent[0].url).toBe('/freshservice/tickets/202/reply');
        expect(sent[0].data.requester_id).toBe(77);
        // and the post-reply thread reload follows the same id
        expect(allUrls().filter((u) => /conversations/.test(u)).pop())
            .toBe('/freshservice/tickets/202/conversations/');
    });

    // FINDING FST-BLANKTICKET [group B - see the header] - setTicket(result.data.content) swaps the
    // WHOLE object, so a thin response erases the row data the user clicked. Both detail effects are
    // keyed on ticket.id, so once the id is gone they bail: the thread that was already fetched for
    // 101 stays on screen under a header that reads "Ticket #undefined" with no subject and no
    // description. Reaching this needs the upstream FreshService middleware to answer 200 with an
    // id-less body; FreshServiceController::getTicket forwards $res->content unvalidated and turns
    // every non-200 into a 400, so nothing in EVOX can produce it. Not a Chrome reproduction - an
    // unguarded read that should be defended.
    it('blanks the header and strands the loaded thread when the detail response carries no id _FINDING_FST-BLANKTICKET', async () => {
        const { container, getByText, queryByText } = await openRow({
            detail: ok({}),
            convos: ok({ conversations: [{ id: 1, created_at: '2026-07-02T09:00:00.000Z', body: '<p>Original message</p>' }] }),
        });

        expect(getByText('Ticket #undefined')).toBeInTheDocument();
        expect(queryByText('Printer jammed')).toBeNull();
        expect(getByText('No description provided')).toBeInTheDocument();
        expect(container.querySelectorAll('.conversation-item')).toHaveLength(1);
        expect(container.querySelector('.conversation-body').innerHTML).toBe('<p>Original message</p>');
        expect(allUrls()).toEqual([
            '/freshservice/tickets/my-tickets?status=all&page=1&limit=100&userEmail=vishnu.p%40eastvantage.com&workspaceId=2',
            '/freshservice/tickets/101',
            '/freshservice/tickets/101/conversations/',
        ]);
    });

    it('opens the row that was clicked when the table holds several tickets, and fetches only that id', async () => {
        const { getByText } = await openRow(
            { detail: ok(ticket({ id: 102, subject: 'VPN down' })) },
            [ticket({ id: 101 }), ticket({ id: 102, subject: 'VPN down' })],
            1
        );

        expect(getByText('Ticket #102')).toBeInTheDocument();
        expect(callsTo('/freshservice/tickets/101')).toHaveLength(0);
        expect(callsTo('/freshservice/tickets/102').map((c) => c.url).sort())
            .toEqual(['/freshservice/tickets/102', '/freshservice/tickets/102/conversations/']);
    });

    it('loads the second ticket\'s own thread after going back and opening a different row', async () => {
        routeApi({
            list: ok({ tickets: [ticket({ id: 101 }), ticket({ id: 102, subject: 'VPN down' })], pagination: null }),
            detail: (cfg) => Promise.resolve({ data: { content: ticket({ id: Number(cfg.url.split('/').pop()) }) } }),
            convos: (cfg) => Promise.resolve({
                data: {
                    content: {
                        conversations: [{
                            id: 1,
                            created_at: '2026-07-02T09:00:00.000Z',
                            body: '<p>thread for ' + cfg.url.split('/')[3] + '</p>',
                        }],
                    },
                },
            }),
        });
        const { container } = renderTickets();
        fireEvent.change(filterSelects(container)[0], { target: { value: '2' } });
        await flush();

        await act(async () => { fireEvent.click(container.querySelectorAll('tbody tr')[0]); });
        await flush();
        expect(container.querySelector('.conversation-body').innerHTML).toBe('<p>thread for 101</p>');

        await act(async () => { fireEvent.click(container.querySelectorAll('.back-button')[0]); });
        await flush();
        await act(async () => { fireEvent.click(container.querySelectorAll('tbody tr')[1]); });
        await flush();

        expect(container.querySelector('.conversation-body').innerHTML).toBe('<p>thread for 102</p>');
        expect(callsTo('/102/conversations/')).toHaveLength(1);
    });
});

/* =================================================================================
 * PART 2 - My Tickets : payload shapes only the API can produce
 * ================================================================================= */

describe('EV Assist -> My Tickets : payload shapes only the API can produce', () => {

    it('passes a non-string subject through sanitizeInput untouched instead of stripping it', async () => {
        const { container } = await openList({}, [ticket({ id: 12, subject: 12345 })]);

        expect(container.querySelector('.ticket-subject').textContent).toBe('#12 12345');
    });

    // Deliberately offset-independent: the two rows are formatted by the same code path in the same
    // zone and compared to each other, and the only literal asserted is the year of a fixed instant
    // that is 2025 at every UTC offset. Nothing here reads the wall clock or today's date.
    it('formats an epoch-number created_at exactly as it formats the equivalent ISO string', async () => {
        const ISO = '2025-07-01T02:00:00.000Z';
        const { container } = await openList({}, [
            ticket({ id: 12, created_at: new Date(ISO).getTime() }),
            ticket({ id: 13, created_at: ISO }),
        ]);

        const cells = Array.from(container.querySelectorAll('tbody tr')).map((r) => r.children[1].textContent);
        expect(cells[0]).not.toBe('Invalid Date');
        expect(cells[0]).toBe(cells[1]);
        expect(cells[0]).toContain('2025');
    });

    // The '2 tickets' / badge '2' pair is asserted in FreshServiceLifecycle.test.js:305 as well, on a
    // fixture with NO pagination. It is repeated here on purpose: with a nine-page pager on screen it
    // is the assertion that shows the header count tracks the rows this page returned and never the
    // paginated total, so a user on page 1 of 9 is told "2 tickets".
    it('shows the current page\'s row count beside a nine-page pager, never the paginated total', async () => {
        const { container, getByText } = await openList(
            {},
            [ticket({ id: 101 }), ticket({ id: 102 })],
            { currentPage: 1, totalPages: 9, hasPrevious: false, hasNext: true }
        );

        expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
        expect(getByText('2 tickets')).toBeInTheDocument();
        expect(container.querySelector('.notification-badge').textContent).toBe('2');
        expect(getByText('Page 1 of 9')).toBeInTheDocument();
        expect(container.querySelectorAll('.pagination-controls button')).toHaveLength(2);
    });

    it('hides the pager for a zero-page result and shows it for a two-page one', async () => {
        const none = await openList({}, [ticket()], { currentPage: 1, totalPages: 0, hasPrevious: false, hasNext: false });
        expect(none.container.querySelector('.pagination-controls')).toBeNull();
        none.unmount();

        jest.clearAllMocks();
        const two = await openList({}, [ticket()], { currentPage: 1, totalPages: 2, hasPrevious: false, hasNext: true });
        expect(two.container.querySelectorAll('.pagination-controls button')).toHaveLength(2);
        expect(two.getByText('Page 1 of 2')).toBeInTheDocument();
    });

    // MECHANISM, so nobody fixes the wrong thing: loadTickets does not consult props.workspaces at
    // all. It skips the API purely because `filters.workspaceId` is still '' (Tickets.js:835), which
    // is why FreshServiceLifecycle.test.js:275 already sees no query with a FULL workspace list. What
    // is specific to an empty list is the arm below it: the department select renders the
    // placeholder and nothing else, so there is no option a user could pick to set workspaceId - the
    // screen is permanently stuck on its empty state.
    it('renders the department select with only its placeholder when the workspace list came back empty', async () => {
        routeApi();
        const { container, getByText } = renderTickets({ workspaces: [] });

        const opts = Array.from(filterSelects(container)[0].querySelectorAll('option'));
        expect(opts.map((o) => o.textContent)).toEqual(['Please select department']);
        expect(opts.map((o) => o.value)).toEqual(['']);
        expect(callsTo('my-tickets')).toHaveLength(0);
        expect(getByText('No tickets found')).toBeInTheDocument();
    });

    // FINDING FST-RAWHTML - the subject on the very same screen is run through sanitizeInput, but the
    // description and every conversation body go straight into dangerouslySetInnerHTML. Whatever
    // markup FreshService has stored becomes live DOM in EVOX.
    it('injects the ticket description as live markup while sanitising the subject _FINDING_FST-RAWHTML', async () => {
        const { container } = await openRow({
            detail: ok(ticket({
                subject: '<b>Printer</b> jammed',
                description: '<img src="x" data-probe="desc"><b>bold body</b>',
            })),
        });

        // the subject lost its tags on the way in ...
        expect(container.querySelector('.card-title-fs').textContent).toBe('Ticket #101');
        // ... but the description became real elements
        expect(container.querySelector('img[data-probe="desc"]')).not.toBeNull();
        expect(container.querySelector('.card-content-fs b').textContent).toBe('bold body');
    });

    it('injects a conversation body as live markup too', async () => {
        const { container } = await openRow({
            convos: ok({
                conversations: [{
                    id: 1,
                    created_at: '2026-07-02T09:00:00.000Z',
                    body: '<img src="y" data-probe="conv"><i>italic reply</i>',
                }],
            }),
        });

        expect(container.querySelector('.conversation-body img[data-probe="conv"]')).not.toBeNull();
        expect(container.querySelector('.conversation-body i').textContent).toBe('italic reply');
    });

    it('treats an empty bodyText as absent and falls through to body, then to the no-content label', async () => {
        const { container } = await openRow({
            convos: ok({
                conversations: [
                    { id: 1, created_at: '2026-07-02T09:00:00.000Z', bodyText: '', body: '<p>from body</p>' },
                    { id: 2, created_at: '2026-07-02T10:00:00.000Z', bodyText: '', body: '' },
                ],
            }),
        });

        const bodies = Array.from(container.querySelectorAll('.conversation-body')).map((b) => b.innerHTML);
        expect(bodies).toEqual(['<p>from body</p>', 'No content']);
    });
});

/* =================================================================================
 * PART 3 - My Tickets : reply-attachment upload arms
 * ================================================================================= */

describe('EV Assist -> My Tickets : reply attachment upload arms', () => {

    // FINDING FST-GHOSTFILE [group B - needs a 200 from the FreshService middleware whose body has no
    // `files` key; ::saveAttachment forwards $res->content unvalidated. Not a Chrome reproduction.]
    // The success handler calls setAttachments(...) BEFORE it reads
    // `result.data.content.files[0]`. When the response omits `files` that read throws, the throw is
    // swallowed by the handler's own `.catch` as an ordinary error alert - but the first setState
    // already landed. The user is left looking at a file listed as attached whose server-side id was
    // never recorded, so the reply goes out with attachments: [] and the file is simply not there.
    it('lists a file whose upload actually failed mid-handler and then replies without it _FINDING_FST-GHOSTFILE', async () => {
        const { container } = await openRow({ attach: ok({}) });

        setFiles(container.querySelector('input[type="file"]'), [file('invoice.pdf')]);
        await flush();

        expect(callsTo('/freshservice/tickets/attachments/')).toHaveLength(1);
        expect(Formatter.alert_error).toHaveBeenCalledWith(expect.any(TypeError));
        expect(container.querySelector('button.btn-fs').textContent).toBe('Add Reply'); // loading released
        // the file is on screen ...
        expect(container.querySelector('.attachments-list-fs li').textContent).toBe('invoice.pdf❌');

        typeBody(container, 'see attached');
        await act(async () => { fireEvent.submit(container.querySelector('form')); });
        await flush();

        // ... but nothing was attached to the reply
        expect(callsTo('/reply')[0].data.attachments).toEqual([]);
    });

    // FINDING FST-EMPTYFILES [group B - same provenance as FST-GHOSTFILE: a 200 carrying files: [].
    // Not a Chrome reproduction.]
    // `result.data.content.files[0]` is read with no guard. When the upload
    // endpoint accepts the request but returns an empty files array the user still sees the file
    // listed as attached, while the value carried into the reply is undefined - so the reply is
    // posted with attachments: [null] and the file is silently missing from the ticket.
    it('lists a file the server never returned an id for and posts a null attachment _FINDING_FST-EMPTYFILES', async () => {
        const { container } = await openRow({ attach: ok({ files: [] }) });

        setFiles(container.querySelector('input[type="file"]'), [file('invoice.pdf')]);
        await flush();

        expect(Formatter.alert_error).not.toHaveBeenCalled();
        expect(container.querySelector('.attachments-list-fs li').textContent).toBe('invoice.pdf❌');

        typeBody(container, 'see attached');
        await act(async () => { fireEvent.submit(container.querySelector('form')); });
        await flush();

        expect(callsTo('/reply')[0].data.attachments).toEqual([undefined]);
    });

    // FINDING FST-UNMOUNTSET - clicking "Back to My Tickets" while a file is still uploading unmounts
    // TicketDetailsPage, but the upload promise is neither aborted nor guarded: its `.then` runs
    // setAttachments/setAttachmentsValues and its `.finally` runs setLoading on a component that no
    // longer exists, and React logs the memory-leak warning. Note the mechanism precisely - the
    // `if (fileInputRef.current)` guard on Tickets.js:754 is NOT what protects this: react-dom
    // detaches that ref during unmount, so the guard only stops the DOM write on line 755. The three
    // setState calls around it have no equivalent guard. Fixing this means a mounted ref (or an
    // AbortController), not a second null-check on the input.
    it('writes upload state into the ticket page after Back has unmounted it _FINDING_FST-UNMOUNTSET', async () => {
        const reactWarnings = jest.spyOn(console, 'error').mockImplementation(() => {});
        try {
            let resolveUpload;
            const { container } = await openRow({ attach: () => new Promise((res) => { resolveUpload = res; }) });

            setFiles(container.querySelector('input[type="file"]'), [file('invoice.pdf')]);
            const upload = callsTo('/freshservice/tickets/attachments/')[0];
            expect(upload.data.get('ticket_id')).toBe('101');

            await act(async () => { fireEvent.click(container.querySelectorAll('.back-button')[0]); });
            await flush();
            expect(container.querySelector('.professional-table')).not.toBeNull();
            expect(reactWarnings).not.toHaveBeenCalled(); // nothing wrong yet - the upload is still open

            await act(async () => { resolveUpload({ data: { content: { files: ['uploads/invoice.pdf'] } } }); });
            await flush();

            const leak = reactWarnings.mock.calls
                .map((c) => c.map(String).join(' '))
                .filter((m) => m.includes('state update on an unmounted component'));
            expect(leak).not.toHaveLength(0);
            expect(leak[0]).toContain('TicketDetailsPage');

            // the user is told nothing: no alert, and the file never appears anywhere
            expect(Formatter.alert_error).not.toHaveBeenCalled();
            expect(container.querySelector('.attachments-list-fs')).toBeNull();
        } finally {
            reactWarnings.mockRestore();
        }
    });

    // FINDING FST-EMPTYRICH - `reply.trim()` is applied to the editor's HTML, not to its text.
    // TinyMCE 6 does return '' for a genuinely empty editor (the bogus <br> is stripped on
    // serialise), so the trigger is not an untouched editor: it is a user who types or leaves a
    // single space, which TinyMCE serialises to "<p>&nbsp;</p>". That is 14 characters, non-blank
    // after .trim(), so the guard passes and a visually blank message is sent to the requester.
    it('accepts a paragraph holding only a space as a real reply and posts it _FINDING_FST-EMPTYRICH', async () => {
        const { container } = await openRow();

        typeBody(container, '<p>&nbsp;</p>');
        expect(container.querySelector('button.btn-fs').disabled).toBe(false);

        await act(async () => { fireEvent.submit(container.querySelector('form')); });
        await flush();

        expect(callsTo('/reply')).toHaveLength(1);
        expect(callsTo('/reply')[0].data.body).toBe('<p>&nbsp;</p>');
    });
});

/* =================================================================================
 * PART 4 - Raise a Ticket : per-field error clearing and whitespace subjects
 * ================================================================================= */

describe('EV Assist -> Raise a Ticket : error clearing is per field', () => {

    // The "typing in the failed field clears its own error" half is already asserted by
    // FreshServiceLifecycle.test.js:991. It is repeated here as the setup for the half that suite
    // does not cover: updateField deletes ONLY errors[field], so every other error must still be on
    // screen afterwards - asserted by exact array equality, not by a .not.toContain.
    it('clears only the edited field\'s error and leaves the other failures on screen', async () => {
        const { container } = renderForm();
        await submitForm(container);
        expect(errorTexts(container)).toEqual([
            '⚠️ Workspace must be selected',
            '⚠️ Subject must be at least 5 characters',
        ]);

        typeSubject(container, 'Printer is broken');

        expect(errorTexts(container)).toEqual(['⚠️ Workspace must be selected']);
        expect(createCalls()).toHaveLength(0);
    });

    it('clears the department error the moment a department is chosen, without another submit', async () => {
        const { container } = renderForm();
        await submitForm(container);
        expect(errorTexts(container)).toContain('⚠️ Workspace must be selected');

        pick(container, 'EV Department *', '2');

        expect(errorTexts(container)).toEqual(['⚠️ Subject must be at least 5 characters']);
    });

    it('ignores padding when measuring the subject, and trims only the ends of what it posts', async () => {
        const { container } = renderForm();
        pick(container, 'EV Department *', '2');

        typeSubject(container, '     ');
        await submitForm(container);
        expect(errorTexts(container)).toContain('⚠️ Subject must be at least 5 characters');
        expect(createCalls()).toHaveLength(0);

        typeSubject(container, '  ab  ');
        await submitForm(container);
        expect(errorTexts(container)).toContain('⚠️ Subject must be at least 5 characters');
        expect(createCalls()).toHaveLength(0);

        typeSubject(container, '  abcde  ');
        expect(container.querySelector('.subject-preview').textContent).toBe('[IT Support] | | -   abcde  ');
        await submitForm(container);

        expect(errorTexts(container)).toHaveLength(0);
        expect(createCalls()).toHaveLength(1);
        // sanitizeInput trims the assembled subject, so the trailing padding the preview showed is
        // gone, while the padding between the category prefix and the typed text survives.
        expect(createCalls()[0].data.subject).toBe('[IT Support] | | -   abcde');
    });

    // FINDING FSF-EMPTYRICH - the description rule measures the raw HTML. Same trigger as
    // FST-EMPTYRICH: TinyMCE 6 returns '' for an untouched editor, but one typed space serialises to
    // "<p>&nbsp;</p>" - 14 characters - so a ticket whose description reads as blank to a human
    // clears the "at least 10 characters" gate and is filed.
    it('accepts a paragraph holding only a space as a ten-character description _FINDING_FSF-EMPTYRICH', async () => {
        const { container } = renderForm();
        pick(container, 'EV Department *', '2');
        typeSubject(container, 'Printer is broken');
        typeBody(container, '<p>&nbsp;</p>');

        await submitForm(container);

        expect(errorTexts(container)).toHaveLength(0);
        expect(createCalls()).toHaveLength(1);
        expect(createCalls()[0].data.description).toBe('<p>&nbsp;</p>');
    });

    it('drops a whitespace-only sub-category name from the subject prefix while keeping it selected', async () => {
        const { container } = renderForm();
        pick(container, 'EV Department *', '2');
        pick(container, 'Category *', '10');
        pick(container, 'Sub-category', '103');   // SubCategoryName is '   '

        expect(group(container, 'Sub-category').querySelector('select').value).toBe('103');
        expect(container.querySelector('.subject-preview').textContent).toBe('[IT Support] | [Hardware] | - ');

        typeSubject(container, 'Cable is frayed');
        await submitForm(container);
        expect(createCalls()[0].data.subject).toBe('[IT Support] | [Hardware] | - Cable is frayed');
    });
});

/* =================================================================================
 * PART 5 - Raise a Ticket : attachment arms
 * ================================================================================= */

describe('EV Assist -> Raise a Ticket : attachment arms', () => {

    // FINDING FSF-ATTACHDEPT - updateField resets the two category fields when the department
    // changes but never touches attachments/attachmentsValues. The upload was authorised against
    // workspace 2; the ticket is created in workspace 5 carrying that same attachment id.
    it('keeps a file uploaded under the old department and files it under the new one _FINDING_FSF-ATTACHDEPT', async () => {
        routeApi({ attach: ok({ files: ['uploads/ws2/invoice.pdf'] }) });
        const { container } = renderForm();

        pick(container, 'EV Department *', '2');
        setFiles(container.querySelector('input[type="file"]'), [file('invoice.pdf')]);
        await flush();
        expect(callsTo('/freshservice/tickets/attachments/')[0].data.get('workspace_id')).toBe('2');

        pick(container, 'EV Department *', '5');
        expect(container.querySelector('.attachments-list-fs li').textContent).toBe('invoice.pdf❌');

        typeSubject(container, 'Payslip is wrong');
        await submitForm(container);

        const sent = createCalls()[0].data;
        expect(sent.workspace_id).toBe('5');
        expect(sent.subject).toBe('[HR Services] | | - Payslip is wrong');
        expect(sent.attachments).toEqual(['uploads/ws2/invoice.pdf']);
    });

    // FINDING FSF-GHOSTFILE [group B - a 200 whose body has no `files` key. Not a Chrome
    // reproduction.] Same shape as FST-GHOSTFILE on the tickets screen: the handler updates
    // `attachments` before it reads `result.data.content.files[0]`, so a response without a `files`
    // key throws after the list has already been updated. The form shows an attached file and then
    // creates the ticket with attachments: [].
    it('lists a file whose upload actually failed mid-handler and then creates the ticket without it _FINDING_FSF-GHOSTFILE', async () => {
        routeApi({ attach: ok({}) });
        const { container } = renderForm();
        fillValid(container);

        setFiles(container.querySelector('input[type="file"]'), [file('invoice.pdf')]);
        await flush();

        expect(Formatter.alert_error).toHaveBeenCalledWith(expect.any(TypeError));
        expect(container.querySelector('button.btn-fs').disabled).toBe(false);
        expect(container.querySelector('.attachments-list-fs li').textContent).toBe('invoice.pdf❌');

        await submitForm(container);
        expect(createCalls()[0].data.attachments).toEqual([]);
    });

    // FINDING FSF-UNMOUNTSET - the create screen has the same unguarded post-unmount setState as
    // FST-UNMOUNTSET: navigating away from Raise a Ticket while a file is uploading leaves the
    // upload's `.then` calling updateField and its `.finally` calling setLoading on an unmounted
    // CreateTicketPage. `if (fileInputRef.current)` (Form.js:549) covers only the DOM write.
    it('writes upload state into the create form after the user has navigated away _FINDING_FSF-UNMOUNTSET', async () => {
        const reactWarnings = jest.spyOn(console, 'error').mockImplementation(() => {});
        try {
            let resolveUpload;
            routeApi({ attach: () => new Promise((res) => { resolveUpload = res; }) });
            const { container, unmount } = renderForm();
            fillValid(container);

            setFiles(container.querySelector('input[type="file"]'), [file('invoice.pdf')]);
            expect(callsTo('/freshservice/tickets/attachments/')).toHaveLength(1);
            expect(reactWarnings).not.toHaveBeenCalled();

            unmount();
            await act(async () => { resolveUpload({ data: { content: { files: ['uploads/invoice.pdf'] } } }); });
            await flush();

            const leak = reactWarnings.mock.calls
                .map((c) => c.map(String).join(' '))
                .filter((m) => m.includes('state update on an unmounted component'));
            expect(leak).not.toHaveLength(0);
            expect(leak[0]).toContain('CreateTicketPage');
            expect(Formatter.alert_error).not.toHaveBeenCalled();
        } finally {
            reactWarnings.mockRestore();
        }
    });

    it('shows the attachment control only once a department is chosen and keeps it after a category change', () => {
        const { container } = renderForm();
        expect(container.querySelector('input[type="file"]')).toBeNull();

        pick(container, 'EV Department *', '2');
        expect(container.querySelector('input[type="file"]')).not.toBeNull();

        pick(container, 'Category *', '10');
        expect(container.querySelector('input[type="file"]')).not.toBeNull();
    });
});

/* =================================================================================
 * PART 6 - Raise a Ticket : the success banner and the signature
 * ================================================================================= */

describe('EV Assist -> Raise a Ticket : confirmation banner and signature', () => {

    const BANNER = '✅ Thanks! EV Assist has logged your request. Our team will be in touch shortly.';

    // FINDING FSF-BANNERTIMER - each create schedules a bare setTimeout(..., 3000) and nothing ever
    // clears the previous one, so the FIRST timer fires two seconds into the second confirmation and
    // the acknowledgement for ticket two vanishes early while its own timer is still pending.
    // SEVERITY, honestly: low. handleSubmit resets the entire form on success, so reaching a second
    // create inside three seconds means re-picking the department and retyping a >=5-character
    // subject in that window - the sequence below is a machine's, not a human's. What is worth
    // fixing is the uncleared timer itself (it also fires after unmount), not a lost banner users
    // are hitting today. The test pins the clock with fake timers; it does not read the wall clock.
    it('lets the first ticket\'s timer hide the second ticket\'s confirmation early _FINDING_FSF-BANNERTIMER', async () => {
        const { container, getByText, queryByText } = renderForm();

        fillValid(container);
        await submitForm(container);
        expect(getByText(BANNER)).toBeInTheDocument();

        await act(async () => { jest.advanceTimersByTime(1000); });
        expect(queryByText(BANNER)).not.toBeNull();

        fillValid(container);
        await submitForm(container);
        expect(createCalls()).toHaveLength(2);
        expect(queryByText(BANNER)).not.toBeNull();

        // only 2s after the SECOND success - but 3s after the first
        await act(async () => { jest.advanceTimersByTime(2000); });
        expect(queryByText(BANNER)).toBeNull();

        // the second ticket's own timer still fires later, with nothing left to hide
        await act(async () => { jest.advanceTimersByTime(1000); });
        expect(queryByText(BANNER)).toBeNull();
    });

    // FINDING FSF-SIGUNDEF - defaultSignature interpolates props.user with no fallbacks. A profile
    // with a null department or an absent country prints those words literally, and because onInit
    // copies the signature into formData.description it is POSTED as the ticket description.
    it('prints null and undefined into the signature it submits for an incomplete profile _FINDING_FSF-SIGUNDEF', async () => {
        const { container } = renderForm({
            user: { ...USER, department_main: null, country: undefined, emp_num: '' },
        });

        const body = container.querySelector('[data-testid="tinymce"]').value;
        expect(body).toContain('>null<');
        expect(body).toContain('Country: undefined');
        expect(body).toContain('Employee ID: </span>');

        pick(container, 'EV Department *', '2');
        typeSubject(container, 'Printer is broken');
        await submitForm(container);

        expect(createCalls()[0].data.description).toContain('Country: undefined');
    });

    it('restores the signature into the editor and drops the CC tags after a success', async () => {
        routeApi({ suggest: () => Promise.resolve({ data: [SUGGESTION] }) });
        const { container } = renderForm();
        fillValid(container);

        typeCc(container, 'vi');
        await act(async () => { jest.advanceTimersByTime(1000); });
        await flush();
        await act(async () => { fireEvent.click(container.querySelector('.cc-suggestion-item')); });
        await flush();

        await submitForm(container);
        expect(createCalls()[0].data.cc_emails).toEqual(['vishnu.p@eastvantage.com']);
        expect(createCalls()[0].data.description).toBe('<p>My printer stopped working today</p>');

        // handleSubmit's reset puts defaultSignature back into formData.description, so the editor is
        // NOT blank for the next ticket - it is pre-loaded with the signature again, and the CC tags
        // the first ticket carried are gone.
        const editorAfter = container.querySelector('[data-testid="tinymce"]').value;
        expect(editorAfter).toContain('Best Regards,');
        expect(editorAfter).toContain('Employee ID: EV-1234');
        expect(container.querySelectorAll('.cc-tag')).toHaveLength(0);

        // typing over the restored signature, the second ticket ships with neither of the first's
        fillValid(container);
        await submitForm(container);

        expect(createCalls()).toHaveLength(2);
        expect(createCalls()[1].data.cc_emails).toEqual([]);
        expect(createCalls()[1].data.description).toBe('<p>My printer stopped working today</p>');
    });
});

/* =================================================================================
 * PART 7 - Raise a Ticket : CC box arms the other suites do not reach
 * ================================================================================= */

describe('EV Assist -> Raise a Ticket : CC box arms', () => {

    it('never looks anything up for a CC box holding only spaces', async () => {
        routeApi({ suggest: () => Promise.resolve({ data: SUGGESTIONS }) });
        const { container } = renderForm();

        typeCc(container, '   ');
        await act(async () => { jest.advanceTimersByTime(3000); });
        await flush();

        expect(callsTo('suggestions')).toHaveLength(0);
        expect(container.querySelectorAll('.cc-suggestion-item')).toHaveLength(0);
    });

    // FINDING FSF-CCLOSTTERM - the click handler calls setCcInput(''), wiping the entire box rather
    // than just the term that was matched. A user who typed an address by hand, added a comma and
    // then picked a suggestion loses the hand-typed address completely: it was never a tag.
    it('discards everything typed before the picked term instead of only that term _FINDING_FSF-CCLOSTTERM', async () => {
        routeApi({ suggest: () => Promise.resolve({ data: [SUGGESTION] }) });
        const { container } = renderForm();
        fillValid(container);

        typeCc(container, 'gary.a@eastvantage.com, vi');
        await act(async () => { jest.advanceTimersByTime(1000); });
        await flush();
        expect(callsTo('suggestions')[0].params).toEqual({ keyword: 'vi' });

        await act(async () => { fireEvent.click(container.querySelector('.cc-suggestion-item')); });
        await flush();

        expect(Array.from(container.querySelectorAll('.cc-tag')).map((t) => t.textContent))
            .toEqual(['vishnu.p@eastvantage.com❌']);
        expect(group(container, 'CC Emails (Optional)').querySelector('input').value).toBe('');

        await submitForm(container);
        expect(createCalls()[0].data.cc_emails).toEqual(['vishnu.p@eastvantage.com']);
    });

    // FINDING FSF-CCSTALE - when the last comma-separated term is shorter than two characters the
    // debounce callback returns WITHOUT clearing ccSuggestions, so the previous term's results stay
    // on screen and stay clickable even though the box now reads something else entirely.
    it('leaves the previous term\'s suggestions on screen once the term is abandoned _FINDING_FSF-CCSTALE', async () => {
        routeApi({ suggest: () => Promise.resolve({ data: SUGGESTIONS }) });
        const { container } = renderForm();

        typeCc(container, 'vi');
        await act(async () => { jest.advanceTimersByTime(1000); });
        await flush();
        expect(container.querySelectorAll('.cc-suggestion-item')).toHaveLength(2);

        typeCc(container, 'vi, x');           // last term 'x' is one character
        await act(async () => { jest.advanceTimersByTime(1000); });
        await flush();

        expect(callsTo('suggestions')).toHaveLength(1);                            // no second lookup
        expect(container.querySelectorAll('.cc-suggestion-item')).toHaveLength(2); // but the old list stands
        expect(group(container, 'CC Emails (Optional)').querySelector('input').value).toBe('vi, x');

        await act(async () => { fireEvent.click(container.querySelectorAll('.cc-suggestion-item')[1]); });
        await flush();

        expect(Array.from(container.querySelectorAll('.cc-tag')).map((t) => t.textContent))
            .toEqual(['vince@eastvantage.com❌']);
    });

    it('keeps the CC tags when the department changes, so they travel with the retargeted ticket', async () => {
        routeApi({ suggest: () => Promise.resolve({ data: [SUGGESTION] }) });
        const { container } = renderForm();
        pick(container, 'EV Department *', '2');

        typeCc(container, 'vi');
        await act(async () => { jest.advanceTimersByTime(1000); });
        await flush();
        await act(async () => { fireEvent.click(container.querySelector('.cc-suggestion-item')); });
        await flush();

        pick(container, 'EV Department *', '5');
        expect(container.querySelectorAll('.cc-tag')).toHaveLength(1);

        typeSubject(container, 'Payslip is wrong');
        await submitForm(container);

        expect(createCalls()[0].data.workspace_id).toBe('5');
        expect(createCalls()[0].data.cc_emails).toEqual(['vishnu.p@eastvantage.com']);
    });
});
