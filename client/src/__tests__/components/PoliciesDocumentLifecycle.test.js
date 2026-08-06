/**
 * PoliciesDocumentLifecycle.test.js
 *
 * SOURCE FILES UNDER TEST
 *   src/components/PoliciesDocument/PoliciesDocumentModal.js
 *   src/components/PoliciesDocument/PoliciesDocumentDownload.js
 *
 * MENU PATH
 *   Dashboard -> Policies Document -> Download Documents      (PoliciesDocumentDownload page)
 *   Dashboard -> Policies Document -> "Download Documents" modal (PoliciesDocumentModal)
 *
 * 29-JUL COVERAGE BASELINE
 *   PoliciesDocumentModal.js .... 3.9%  (49 uncovered lines - effectively untested)
 *   PoliciesDocumentDownload.js . 0%    (50 uncovered lines - never mounted by any suite)
 *   Combined packet baseline: 99 uncovered lines.
 *
 * WHAT IS EXERCISED HERE
 *   Modal:    closed-gate, Modal show/onHide wiring, row numbering, per-extension icon
 *             switch, single-file base64 anchor, viewer index handoff, empty/undefined
 *             list arms, and the Download-All JSZip flow incl. its FAILURE arm.
 *   Download: mount fetch (GET /show + exact params), success vs failure dispatch,
 *             accordion group rendering, per-group row rendering, icon switch,
 *             empty/undefined arms, viewer open gate, viewer close + CLEAR dispatch.
 *
 * FINDINGS DISCOVERED (each characterised, not fixed - suffix _FINDING_<CODE>)
 *   PDM-IDX-BOOL   Modal viewer index state is seeded with boolean `false`, not 0/null,
 *                  so the viewer receives index=false before any row is clicked.
 *   PDM-NULL-HREF  downloadBase64File builds the <a> with no guard on FileData; a null
 *                  FileData still produces a clickable anchor with href="null".
 *   PDM-ZIP-RACE   handleDownloadAll waits a hard-coded 1000ms instead of Promise.all,
 *                  so a slow fetch produces a silently EMPTY zip download.
 *   PDM-ZIP-FAIL   A failed fetch is only console.error'd; the zip is still generated and
 *                  downloaded, so the user gets a partial/empty archive with no warning.
 *   PDM-NO-KEY     The Modal's document rows are mapped without a React `key`.
 *   PDD-ID-ZERO    Download page gates the viewer on `isId &&`; a document whose Id is 0
 *                  can never be opened - the eye button silently does nothing.
 *   PDD-IDX-LOCAL  The index handed to the viewer is the index WITHIN a group, so row 1 of
 *                  group 2 and row 1 of group 1 both hand over index 0.
 *   PDD-OBJ-SHAPE  The viewer is handed the grouped OBJECT as `policiesdocument`, but the
 *                  viewer does `policiesdocument.length` -> undefined.
 *   PDD-DEAD-UI    handleChange/handleChange1/handleChange2/handleDownloadAll/
 *                  downloadBase64File and the MultiSelect import are dead code - no
 *                  country select, no department picker and no ZIP button is ever rendered.
 *   PDD-USER-NPE   `user.country_id` is dereferenced in the useState initialiser with no
 *                  guard; mounting before the user slice is hydrated throws.
 *   PD-DOM-CLASS   Both files emit raw `class=` instead of `className=` on buttons/icons;
 *                  React 16 warns on every render, React 19 will break it outright.
 *
 * ADDITIVE ONLY - no app source and no pre-existing test file was modified.
 */

import React from 'react';
import { render, fireEvent, within, act } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

// ---------------------------------------------------------------- mocks

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => mockDispatch,
}));

global.links = new Proxy({}, { get: () => '/x/' });

const mockModalProps = [];
jest.mock('react-bootstrap/Modal', () => {
    const React = require('react');
    const Modal = (props) => {
        mockModalProps.push(props);
        return props.show ? <div data-testid="modal">{props.children}</div> : null;
    };
    Modal.Header = ({ children }) => <div>{children}</div>;
    Modal.Title = ({ children }) => <div>{children}</div>;
    Modal.Body = ({ children }) => <div>{children}</div>;
    return Modal;
});

jest.mock('react-bootstrap', () => {
    const React = require('react');
    const pass = ({ children }) => <div>{children}</div>;
    const Accordion = ({ children }) => <div data-testid="accordion">{children}</div>;
    Accordion.Toggle = ({ children, eventKey }) => (
        <button type="button" data-testid="acc-toggle" data-eventkey={String(eventKey)}>{children}</button>
    );
    Accordion.Collapse = ({ children, eventKey }) => (
        <div data-testid="acc-collapse" data-eventkey={String(eventKey)}>{children}</div>
    );
    const Card = ({ children }) => <div data-testid="acc-card">{children}</div>;
    Card.Body = ({ children }) => <div>{children}</div>;
    return {
        Row: pass, Form: pass, Button: pass, Col: pass, Collapse: pass,
        Container: pass, Overlay: pass, Popover: pass,
        Table: ({ children }) => <table>{children}</table>,
        Accordion, Card,
    };
});

jest.mock('../../components/GridComponent/AdminLte.js', () => {
    const React = require('react');
    const pass = ({ children }) => <div>{children}</div>;
    return {
        ContainerHeader: pass, Content: pass, ContainerWrapper: pass,
        ContainerBody: pass, Row: pass, Col: pass,
    };
});
jest.mock('../../components/Template/Wrapper', () => {
    const React = require('react');
    return ({ children }) => <div data-testid="wrapper">{children}</div>;
});

jest.mock('react-multi-select-component', () => {
    const React = require('react');
    return { __esModule: true, default: () => <div data-testid="multiselect" /> };
});

const mockZip = { file: jest.fn(), generateAsync: jest.fn(() => Promise.resolve('ZIPBLOB')) };
jest.mock('jszip', () => jest.fn(() => mockZip));

jest.mock('../../services/API', () => ({ call: jest.fn() }));
jest.mock('../../services/Formatter', () => ({
    alert_error: jest.fn((e) => ({ type: 'STUB_ALERT_ERROR', e })),
    alert_success: jest.fn(() => ({ type: 'STUB_ALERT_SUCCESS' })),
    array_to_getvalue: jest.fn(() => []),
}));
jest.mock('../../components/PoliciesDocument/PoliciesDocumentApi.js', () => ({
    fecthUserContry: jest.fn((id) => ({ type: 'STUB_FETCH_COUNTRY', id })),
    fecthUserDepartment: jest.fn((g, c, u) => ({ type: 'STUB_FETCH_DEPT', g, c, u })),
    fetchPolicyDocument: jest.fn((id) => ({ type: 'STUB_FETCH_POLICY_DOC', id })),
}));

const mockViewerProps = [];
jest.mock('../../components/PoliciesDocument/PoliciesDocumentViewer', () => {
    const React = require('react');
    return (props) => {
        mockViewerProps.push(props);
        return (
            <div
                data-testid="viewer"
                data-open={String(props.isOpen)}
                data-index={String(props.index)}
                data-id={String(props.id)}
            />
        );
    };
});

const API = require('../../services/API').default || require('../../services/API');
const Formatter = require('../../services/Formatter').default || require('../../services/Formatter');
const PoliciesDocumentModal =
    require('../../components/PoliciesDocument/PoliciesDocumentModal').default;
const PoliciesDocumentDownload =
    require('../../components/PoliciesDocument/PoliciesDocumentDownload').default;

// ------------------------------------------------------------- fixtures

const ICON_EXTS = ['csv', 'xlsx', 'docx', 'pdf', 'png', 'jpg', 'jpeg', 'zip'];
const EXPECTED_ICONS = [
    '/images/excel.png', '/images/excel.png', '/images/doc.png', '/images/pdf.png',
    '/images/img.png', '/images/img.png', '/images/img.png', '',
];

const files = ICON_EXTS.map((ext, i) => ({
    FileName: `doc${i}.${ext}`,
    FileExtension: ext,
    FileData: `data:application/x;base64,QQ==${i}`,
}));

const groupedDocs = {
    'HR Policies': [
        { Id: 11, Title: 'Code of Conduct', countryname: 'Philippines', FileExtension: 'pdf' },
        { Id: 12, Title: 'Leave Policy', countryname: 'India', FileExtension: 'docx' },
    ],
    'IT Policies': [
        { Id: 21, Title: 'Acceptable Use', countryname: 'Global', FileExtension: 'xlsx' },
    ],
};

const USER = { country_id: 7, id: 1 };

// Collected across the whole file so React's once-per-warning de-duplication
// cannot hide a warning behind whichever test happens to render first.
const consoleErrors = [];

function trackAnchorClicks() {
    const clicks = [];
    const origCreate = document.createElement.bind(document);
    const spy = jest.spyOn(document, 'createElement').mockImplementation((tag) => {
        const el = origCreate(tag);
        if (tag === 'a') {
            el.click = () => clicks.push({
                href: el.href,
                rawHref: el.getAttribute('href'),
                download: el.download,
            });
        }
        return el;
    });
    return { clicks, spy };
}

async function flush(times = 8) {
    for (let i = 0; i < times; i++) await Promise.resolve();
}

function renderModal(props = {}) {
    return render(
        <PoliciesDocumentModal
            isOpen
            closeModal={jest.fn()}
            policiesdocument={files}
            {...props}
        />
    );
}

async function renderDownload(props = {}) {
    let utils;
    await act(async () => {
        utils = render(
            <PoliciesDocumentDownload
                user={USER}
                policiesdocument={groupedDocs}
                usercountry={[]}
                userdepartment={[]}
                {...props}
            />
        );
    });
    return utils;
}

beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation((...args) => {
        consoleErrors.push(args.map((a) => String(a)).join(' '));
    });
});
afterAll(() => {
    // eslint-disable-next-line no-console
    if (console.error.mockRestore) console.error.mockRestore();
});

beforeEach(() => {
    jest.clearAllMocks();
    mockModalProps.length = 0;
    mockViewerProps.length = 0;
    global.fetch = jest.fn(() => Promise.resolve({ blob: () => Promise.resolve('FILEBLOB') }));
    window.URL.createObjectURL = jest.fn(() => 'blob:policies-zip');
    API.call.mockResolvedValue({ data: groupedDocs });
});

// =====================================================================
describe('PoliciesDocumentModal - Download Documents modal', () => {

    test('the modal is fully suppressed while isOpen is false, so no document rows leak into the DOM', () => {
        const { container, queryByTestId } = renderModal({ isOpen: false });
        expect(container.firstChild).toBeNull();
        expect(queryByTestId('viewer')).toBeNull();
        expect(mockModalProps.length).toBe(0);
    });

    test('an open modal shows the Download Documents title and passes show=true down to the bootstrap Modal', () => {
        const { getByText, getByTestId } = renderModal();
        getByTestId('modal');
        getByText('Download Documents');
        expect(mockModalProps[0].show).toBe(true);
        expect(mockModalProps[0].size).toBe('xl');
    });

    test('the modal dismiss handler is wired to the closeModal prop the parent supplied', () => {
        const closeModal = jest.fn();
        renderModal({ closeModal });
        expect(mockModalProps[0].onHide).toBe(closeModal);
        mockModalProps[0].onHide();
        expect(closeModal).toHaveBeenCalledTimes(1);
    });

    test('every supplied document produces exactly one row, numbered from 1 rather than from 0', () => {
        const { container } = renderModal();
        const rows = container.querySelectorAll('tbody tr');
        expect(rows.length).toBe(files.length);
        const numbers = [...rows].map((r) => r.querySelectorAll('td')[0].textContent);
        expect(numbers).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
    });

    test('each file name is rendered beside the icon that its extension maps to', () => {
        const { container, getByText } = renderModal();
        files.forEach((f) => getByText(new RegExp(f.FileName)));
        const icons = [...container.querySelectorAll('td.tdcontent img')].map((i) => i.getAttribute('src'));
        expect(icons).toEqual(EXPECTED_ICONS);
    });

    test('an extension outside the known set falls through to the default arm and renders an empty icon src', () => {
        const { container } = renderModal({
            policiesdocument: [{ FileName: 'weird.bin', FileExtension: 'bin', FileData: 'data:x;base64,QQ==' }],
        });
        const rows = container.querySelectorAll('tbody tr');
        expect(rows.length).toBe(1);
        expect(rows[0].querySelector('td.tdcontent img').getAttribute('src')).toBe('');
    });

    test('the per-row download button builds a named anchor carrying that row base64 payload', () => {
        const { clicks, spy } = trackAnchorClicks();
        const { container } = renderModal();
        const thirdRow = container.querySelectorAll('tbody tr')[2];
        fireEvent.click(within(thirdRow).getAllByRole('button')[0]);
        expect(clicks.length).toBe(1);
        expect(clicks[0].download).toBe('doc2.docx');
        expect(clicks[0].rawHref).toBe(files[2].FileData);
        spy.mockRestore();
    });

    test('downloading a different row uses that row own name and payload, not the first row', () => {
        const { clicks, spy } = trackAnchorClicks();
        const { container } = renderModal();
        const rows = container.querySelectorAll('tbody tr');
        fireEvent.click(within(rows[0]).getAllByRole('button')[0]);
        fireEvent.click(within(rows[6]).getAllByRole('button')[0]);
        expect(clicks.map((c) => c.download)).toEqual(['doc0.csv', 'doc6.jpeg']);
        expect(clicks[1].rawHref).toBe(files[6].FileData);
        spy.mockRestore();
    });

    // FINDING PDM-NULL-HREF: downloadBase64File never validates FileData. When the API
    // returns a row with no payload the component still fabricates and clicks an anchor,
    // producing a browser download of the literal string "null" instead of surfacing an
    // error to the user. The guard belongs at the top of downloadBase64File.
    test('a row whose payload is null still fires a download anchor with href "null" _FINDING_PDM-NULL-HREF', () => {
        const { clicks, spy } = trackAnchorClicks();
        const { container } = renderModal({
            policiesdocument: [{ FileName: 'broken.pdf', FileExtension: 'pdf', FileData: null }],
        });
        fireEvent.click(within(container.querySelectorAll('tbody tr')[0]).getAllByRole('button')[0]);
        expect(clicks.length).toBe(1);
        expect(clicks[0].rawHref).toBe('null');
        expect(clicks[0].download).toBe('broken.pdf');
        spy.mockRestore();
    });

    test('an empty document list swaps the rows for the No Document Found placeholder and hides the ZIP button', () => {
        const { getByText, queryByText, container } = renderModal({ policiesdocument: [] });
        getByText(/No Document Found/);
        expect(container.querySelector('td.notfound').getAttribute('colspan')).toBe('3');
        expect(container.querySelector('td.notfound img').getAttribute('src')).toBe('/images/nodata.png');
        expect(queryByText(/Download All as ZIP/)).toBeNull();
    });

    test('an undefined document list takes the same not-found arm instead of throwing', () => {
        const { getByText, queryByText } = renderModal({ policiesdocument: undefined });
        getByText(/No Document Found/);
        expect(queryByText(/Download All as ZIP/)).toBeNull();
    });

    test('a populated document list is the only case that offers the Download All as ZIP action', () => {
        const { getByText } = renderModal();
        expect(getByText(/Download All as ZIP/)).toBeTruthy();
    });

    // FINDING PDM-IDX-BOOL: useState(false) seeds the viewer index with a boolean. Before
    // any eye click the child viewer is handed index=false, which it feeds straight into
    // setCurIndex. It should be 0 (or null) so downstream arithmetic is well defined.
    test('before any row is previewed the viewer is mounted closed and handed a boolean index _FINDING_PDM-IDX-BOOL', () => {
        const { getByTestId } = renderModal();
        expect(getByTestId('viewer').getAttribute('data-open')).toBe('false');
        expect(getByTestId('viewer').getAttribute('data-index')).toBe('false');
        expect(mockViewerProps[0].policiesdocument).toBe(files);
    });

    test('the eye button opens the viewer at the clicked row and re-targets it when another row is previewed', () => {
        const { container, getByTestId } = renderModal();
        const rows = container.querySelectorAll('tbody tr');
        fireEvent.click(within(rows[4]).getAllByRole('button')[1]);
        expect(getByTestId('viewer').getAttribute('data-open')).toBe('true');
        expect(getByTestId('viewer').getAttribute('data-index')).toBe('4');
        fireEvent.click(within(rows[1]).getAllByRole('button')[1]);
        expect(getByTestId('viewer').getAttribute('data-index')).toBe('1');
        expect(getByTestId('viewer').getAttribute('data-open')).toBe('true');
    });

    test('closing the viewer from its own close handler returns the modal to the list without touching the outer modal', () => {
        const closeModal = jest.fn();
        const { container, getByTestId } = renderModal({ closeModal });
        fireEvent.click(within(container.querySelectorAll('tbody tr')[0]).getAllByRole('button')[1]);
        expect(getByTestId('viewer').getAttribute('data-open')).toBe('true');
        const viewerClose = mockViewerProps[mockViewerProps.length - 1].closeModal;
        act(() => { viewerClose(); });
        expect(getByTestId('viewer').getAttribute('data-open')).toBe('false');
        expect(closeModal).not.toHaveBeenCalled();
    });

    test('Download All fetches every payload, zips it under its file name and downloads PoliciesDocuments.zip', async () => {
        jest.useFakeTimers();
        const { clicks, spy } = trackAnchorClicks();
        const { getByText } = renderModal();
        fireEvent.click(getByText(/Download All as ZIP/));

        await flush();
        expect(global.fetch).toHaveBeenCalledTimes(files.length);
        expect(global.fetch).toHaveBeenCalledWith(files[0].FileData);
        expect(mockZip.file).toHaveBeenCalledTimes(files.length);
        expect(mockZip.file).toHaveBeenCalledWith('doc0.csv', 'FILEBLOB');

        jest.advanceTimersByTime(1000);
        await flush();
        expect(mockZip.generateAsync).toHaveBeenCalledWith({ type: 'blob' });
        expect(clicks[0].download).toBe('PoliciesDocuments.zip');
        expect(clicks[0].href).toContain('blob:policies-zip');
        spy.mockRestore();
        jest.useRealTimers();
    });

    // FINDING PDM-ZIP-RACE: the archive is generated on a hard-coded 1000ms setTimeout
    // instead of Promise.all over the fetches. If the network has not settled inside that
    // window the user silently receives an EMPTY archive - no file was added, yet the
    // download still fires and reports success.
    test('when the fetches have not settled within the 1s window the archive downloads empty _FINDING_PDM-ZIP-RACE', async () => {
        jest.useFakeTimers();
        global.fetch = jest.fn(() => new Promise(() => {})); // never settles
        const { clicks, spy } = trackAnchorClicks();
        const { getByText } = renderModal();
        fireEvent.click(getByText(/Download All as ZIP/));

        jest.advanceTimersByTime(1000);
        await flush();
        expect(mockZip.file).not.toHaveBeenCalled();
        expect(mockZip.generateAsync).toHaveBeenCalledWith({ type: 'blob' });
        expect(clicks[0].download).toBe('PoliciesDocuments.zip');
        spy.mockRestore();
        jest.useRealTimers();
    });

    // FINDING PDM-ZIP-FAIL: a rejected fetch is swallowed by console.error. The zip is
    // still built and handed to the user, so a partial archive is indistinguishable from
    // a complete one. There is no user-facing error path at all.
    test('a failed payload fetch is only logged and the partial archive is still delivered _FINDING_PDM-ZIP-FAIL', async () => {
        jest.useFakeTimers();
        global.fetch = jest.fn((url) =>
            url === files[0].FileData
                ? Promise.reject(new Error('network down'))
                : Promise.resolve({ blob: () => Promise.resolve('FILEBLOB') })
        );
        const { clicks, spy } = trackAnchorClicks();
        const { getByText } = renderModal();
        fireEvent.click(getByText(/Download All as ZIP/));

        await flush();
        expect(mockZip.file).toHaveBeenCalledTimes(files.length - 1);
        expect(mockZip.file).not.toHaveBeenCalledWith('doc0.csv', expect.anything());
        expect(consoleErrors.some((m) => /Error fetching file/.test(m))).toBe(true);

        jest.advanceTimersByTime(1000);
        await flush();
        expect(mockZip.generateAsync).toHaveBeenCalledWith({ type: 'blob' });
        expect(clicks[0].download).toBe('PoliciesDocuments.zip');
        spy.mockRestore();
        jest.useRealTimers();
    });
});

// =====================================================================
describe('PoliciesDocumentDownload - Download Policies Document page', () => {

    test('mounting the page fetches the document list once with the logged-in user country as the filter', async () => {
        await renderDownload();
        expect(API.call).toHaveBeenCalledTimes(1);
        expect(API.call).toHaveBeenCalledWith({
            method: 'get',
            url: '/show',
            params: {
                GlobalType: 1,
                CountryId: 7,
                DepartmentId: [],
                selectedDepartments: 'All',
            },
        });
    });

    test('a successful fetch publishes the payload to the store under FETCH_MY_POLICIES_DOC', async () => {
        API.call.mockResolvedValue({ data: groupedDocs });
        await renderDownload();
        expect(mockDispatch).toHaveBeenCalledWith({
            type: 'FETCH_MY_POLICIES_DOC',
            data: groupedDocs,
        });
    });

    test('a rejected fetch dispatches the formatted alert instead of the document payload', async () => {
        const boom = { status: 500, statusText: 'Server Error' };
        API.call.mockRejectedValue(boom);
        await renderDownload();
        expect(Formatter.alert_error).toHaveBeenCalledWith(boom);
        expect(mockDispatch).toHaveBeenCalledWith({ type: 'STUB_ALERT_ERROR', e: boom });
        expect(mockDispatch).not.toHaveBeenCalledWith(
            expect.objectContaining({ type: 'FETCH_MY_POLICIES_DOC' })
        );
    });

    test('the list is fetched only on mount - re-rendering with new documents does not refetch', async () => {
        let utils;
        await act(async () => {
            utils = render(<PoliciesDocumentDownload user={USER} policiesdocument={groupedDocs} />);
        });
        expect(API.call).toHaveBeenCalledTimes(1);
        await act(async () => {
            utils.rerender(<PoliciesDocumentDownload user={USER} policiesdocument={{ 'New Group': [] }} />);
        });
        expect(API.call).toHaveBeenCalledTimes(1);
    });

    test('each group in the payload becomes one accordion card titled with its group key', async () => {
        const { getAllByTestId, getByText } = await renderDownload();
        expect(getAllByTestId('acc-card').length).toBe(2);
        getByText(/HR Policies/);
        getByText(/IT Policies/);
    });

    test('accordion event keys are one-based so the first group is key 1, not key 0', async () => {
        const { getAllByTestId } = await renderDownload();
        expect(getAllByTestId('acc-toggle').map((t) => t.getAttribute('data-eventkey'))).toEqual(['1', '2']);
        expect(getAllByTestId('acc-collapse').map((t) => t.getAttribute('data-eventkey'))).toEqual(['1', '2']);
    });

    test('a group renders one row per document with a one-based Sno, the title and the country name', async () => {
        const { container } = await renderDownload();
        const tables = container.querySelectorAll('table.table');
        expect(tables.length).toBe(2);
        const hrRows = tables[0].querySelectorAll('tbody tr');
        expect(hrRows.length).toBe(2);
        expect([...hrRows].map((r) => r.querySelector('th').textContent)).toEqual(['1', '2']);
        expect(hrRows[0].querySelectorAll('td')[0].textContent).toContain('Code of Conduct');
        expect(hrRows[0].querySelectorAll('td')[1].textContent).toBe('Philippines');
        expect(hrRows[1].querySelectorAll('td')[1].textContent).toBe('India');
        expect(tables[1].querySelectorAll('tbody tr').length).toBe(1);
    });

    test('the Sno / Title / Geo / Action header is emitted once per group table', async () => {
        const { getAllByText } = await renderDownload();
        expect(getAllByText('Sno').length).toBe(2);
        expect(getAllByText('Title').length).toBe(2);
        expect(getAllByText('Geo').length).toBe(2);
        expect(getAllByText('Action').length).toBe(2);
    });

    test('every file extension arm resolves to its icon and unknown extensions resolve to none', async () => {
        const oneGroup = {
            'All Types': ICON_EXTS.map((ext, i) => ({
                Id: i + 1, Title: `t${i}`, countryname: 'PH', FileExtension: ext,
            })),
        };
        const { container } = await renderDownload({ policiesdocument: oneGroup });
        const icons = [...container.querySelectorAll('td.tdcontent img')].map((i) => i.getAttribute('src'));
        expect(icons).toEqual(EXPECTED_ICONS);
    });

    test('an empty payload object renders the No Document Found placeholder and no accordion cards', async () => {
        const { getByText, queryAllByTestId } = await renderDownload({ policiesdocument: {} });
        getByText(/No Document Found/);
        expect(queryAllByTestId('acc-card').length).toBe(0);
    });

    test('an undefined payload takes the same not-found arm rather than throwing on Object.values', async () => {
        const { getByText, queryAllByTestId } = await renderDownload({ policiesdocument: undefined });
        getByText(/No Document Found/);
        expect(queryAllByTestId('acc-card').length).toBe(0);
    });

    test('a group that came back with zero documents still renders its header but no rows', async () => {
        const { container, getByText } = await renderDownload({ policiesdocument: { 'Empty Group': [] } });
        getByText(/Empty Group/);
        expect(container.querySelectorAll('table.table tbody tr').length).toBe(0);
    });

    test('an array-shaped payload is still grouped, falling back to numeric index headers', async () => {
        const arrayShaped = [
            [{ Id: 1, Title: 'Doc A', countryname: 'PH', FileExtension: 'pdf' }],
        ];
        const { getAllByTestId, getByText } = await renderDownload({ policiesdocument: arrayShaped });
        expect(getAllByTestId('acc-card').length).toBe(1);
        getByText(/Doc A/);
        expect(getAllByTestId('acc-toggle')[0].textContent).toContain('0');
    });

    test('the viewer stays unmounted until a document is actually previewed', async () => {
        const { queryByTestId } = await renderDownload();
        expect(queryByTestId('viewer')).toBeNull();
    });

    test('previewing a document mounts the viewer opened on that document id', async () => {
        const { container, getByTestId } = await renderDownload();
        const eyes = container.querySelectorAll('button.download-btn');
        expect(eyes.length).toBe(3);
        act(() => { fireEvent.click(eyes[1]); });
        const viewer = getByTestId('viewer');
        expect(viewer.getAttribute('data-open')).toBe('true');
        expect(viewer.getAttribute('data-id')).toBe('12');
        expect(viewer.getAttribute('data-index')).toBe('1');
    });

    test('closing the viewer unmounts it and clears the cached policy document from the store', async () => {
        const { container, getByTestId, queryByTestId } = await renderDownload();
        act(() => { fireEvent.click(container.querySelectorAll('button.download-btn')[0]); });
        getByTestId('viewer');
        const close = mockViewerProps[mockViewerProps.length - 1].closeModal;
        act(() => { close(); });
        expect(queryByTestId('viewer')).toBeNull();
        expect(mockDispatch).toHaveBeenCalledWith({ type: 'CLEAR_MY_POLICY_DOC' });
    });

    // FINDING PDD-ID-ZERO: the viewer is gated on `isId && policiesdocument`. isId holds the
    // document Id, so a legitimate document with Id === 0 leaves the guard falsy and the eye
    // button is a dead click - no modal, no error, no feedback. The guard should test
    // `isId !== false` (or use null as the sentinel).
    test('a document whose id is 0 can never be previewed - the eye button does nothing _FINDING_PDD-ID-ZERO', async () => {
        const { container, queryByTestId } = await renderDownload({
            policiesdocument: { 'Zero Group': [{ Id: 0, Title: 'Zero Doc', countryname: 'PH', FileExtension: 'pdf' }] },
        });
        act(() => { fireEvent.click(container.querySelectorAll('button.download-btn')[0]); });
        expect(queryByTestId('viewer')).toBeNull();
    });

    // FINDING PDD-IDX-LOCAL: handleviewer(index, item.Id) forwards the index WITHIN the
    // group. Row 1 of "IT Policies" therefore hands the viewer index 0 - identical to row 1
    // of "HR Policies" - so any viewer paging built on that index addresses the wrong group.
    test('the first row of the second group hands over index 0, colliding with the first group _FINDING_PDD-IDX-LOCAL', async () => {
        const { container, getByTestId } = await renderDownload();
        const eyes = container.querySelectorAll('button.download-btn');
        act(() => { fireEvent.click(eyes[2]); }); // IT Policies row 1, Id 21
        const viewer = getByTestId('viewer');
        expect(viewer.getAttribute('data-id')).toBe('21');
        expect(viewer.getAttribute('data-index')).toBe('0');
    });

    // FINDING PDD-OBJ-SHAPE: the page hands its grouped OBJECT straight to the viewer as
    // `policiesdocument`, but PoliciesDocumentViewer does `setTotalCount(policiesdocument.length)`
    // on mount - undefined for an object. The viewer's paging counter is dead on arrival.
    test('the viewer is handed the grouped object, whose length is undefined _FINDING_PDD-OBJ-SHAPE', async () => {
        const { container } = await renderDownload();
        act(() => { fireEvent.click(container.querySelectorAll('button.download-btn')[0]); });
        const passed = mockViewerProps[mockViewerProps.length - 1].policiesdocument;
        expect(passed).toBe(groupedDocs);
        expect(Array.isArray(passed)).toBe(false);
        expect(passed.length).toBeUndefined();
    });

    // FINDING PDD-DEAD-UI: handleChange, handleChange1, handleChange2, handleDownloadAll and
    // downloadBase64File are all defined and the MultiSelect / JSZip / country-department
    // API imports are all pulled in, yet the render tree contains no country select, no
    // department picker and no ZIP button. ~90 lines of unreachable code and three unused
    // heavy imports ship to the browser.
    test('no country select and no department picker is rendered despite the handlers existing _FINDING_PDD-DEAD-UI', async () => {
        const { container, queryByTestId } = await renderDownload();
        expect(container.querySelectorAll('select').length).toBe(0);
        expect(container.querySelectorAll('input[type="radio"]').length).toBe(0);
        expect(queryByTestId('multiselect')).toBeNull();
        const { fecthUserDepartment, fecthUserContry } =
            require('../../components/PoliciesDocument/PoliciesDocumentApi.js');
        expect(fecthUserDepartment).not.toHaveBeenCalled();
        expect(fecthUserContry).not.toHaveBeenCalled();
    });

    test('no Download All as ZIP action is reachable on this page although handleDownloadAll exists _FINDING_PDD-DEAD-UI', async () => {
        const { queryByText } = await renderDownload();
        expect(queryByText(/Download All as ZIP/)).toBeNull();
        expect(mockZip.generateAsync).not.toHaveBeenCalled();
    });

    // FINDING PDD-USER-NPE: `CountryId: user.country_id` is evaluated inside the useState
    // initialiser, before any guard. Mounting the route while the user slice is still empty
    // (deep link, hard refresh, expired session rehydrate) throws and blanks the page
    // instead of degrading to the global filter.
    test('mounting before the user slice is hydrated throws on user.country_id _FINDING_PDD-USER-NPE', () => {
        expect(() =>
            render(<PoliciesDocumentDownload user={undefined} policiesdocument={groupedDocs} />)
        ).toThrow(TypeError);
        expect(API.call).not.toHaveBeenCalled();
    });

    test('a user with no country still filters, sending the undefined country through unguarded', async () => {
        await renderDownload({ user: {} });
        expect(API.call).toHaveBeenCalledWith(expect.objectContaining({
            url: '/show',
            params: expect.objectContaining({ GlobalType: 1, CountryId: undefined }),
        }));
    });
});

// =====================================================================
// These two assert warnings collected across every render above, so they must
// stay last in the file - React de-duplicates each warning after its first emit.
describe('PoliciesDocument - React correctness warnings emitted by this feature', () => {

    // FINDING PDM-NO-KEY: PoliciesDocumentModal maps its document rows to <tr> with no key
    // prop. React falls back to index reconciliation, so re-ordering or filtering the list
    // reuses the wrong row state. PoliciesDocumentDownload does key its rows - only the
    // modal is affected.
    test('the modal document rows are mapped without a React key _FINDING_PDM-NO-KEY', () => {
        expect(consoleErrors.some((m) => /unique "key" prop/.test(m))).toBe(true);
    });

    // FINDING PD-DOM-CLASS: both files emit raw HTML `class=` (and the stray `tableheader`
    // prop) on buttons and <i> icons instead of `className=`. React 16 still forwards the
    // attribute but flags it as an invalid DOM property on every render; the pattern breaks
    // outright under React 19's stricter prop handling, which the planned upgrade will hit.
    test('both files emit raw class= attributes that React flags as invalid DOM properties _FINDING_PD-DOM-CLASS', () => {
        // React formats this one with %s placeholders, so match the format + its arguments.
        const hit = consoleErrors.find(
            (m) => /Invalid DOM property/.test(m) && /\bclass className\b/.test(m)
        );
        expect(hit).toBeTruthy();
        expect(hit).toMatch(/PoliciesDocument/);
    });
});
