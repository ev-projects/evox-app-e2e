/**
 * PoliciesDocumentUploadLifecycle.test.js
 *
 * SOURCE FILES UNDER TEST
 *   src/components/PoliciesDocument/PoliciesDocumentUpload.js
 *   src/components/PoliciesDocument/UploadedDocumentList.js
 *
 * MENU PATH
 *   Dashboard -> Policies Document -> Upload Policies Document      (PoliciesDocumentUpload)
 *   Dashboard -> Policies Document -> Manage Policy Accessibility   (UploadedDocumentList)
 *
 * COVERAGE (measured, not estimated)
 *   Measured by running THIS suite alone with
 *     --collectCoverageFrom=src/components/PoliciesDocument/PoliciesDocumentUpload.js
 *     --collectCoverageFrom=src/components/PoliciesDocument/UploadedDocumentList.js
 *   PoliciesDocumentUpload.js .... 95.19% lines / 95.45% stmts / 93.75% branch / 95.65% funcs
 *   UploadedDocumentList.js ...... 88.33% lines / 85.48% stmts / 100% branch / 68.75% funcs
 *   (UploadedDocumentList's uncovered functions are the dead viewer/download block - see
 *   UDL-NO-DOWNLOAD below; they are unreachable, not merely unexercised.)
 *
 *   NOTE: these two files are NOT untouched by the rest of the tree. They are also mounted by
 *   containers/evoxtest_PoliciesUploadDeep2.test.js, containers/evoxtest_UploadedDocumentListDeep2.test.js
 *   and existing/UploadPolicies.verified.test.js. No cross-suite baseline or delta is claimed here.
 *
 * WHAT IS EXERCISED HERE
 *   Upload: mount fetches (country + department, exact args), Global/Geo radio gating of the
 *           country select, country -> department re-fetch, extension allow-list, duplicate
 *           suppression, invalid-format list, per-row removal, the 10MB size guard incl. its
 *           boundary, every arm of the four-way submit validation cascade, the exact FormData
 *           posted to /uploadfiles, and the success vs failure dispatch + reset.
 *   List:   mount fetch (GET /showlist + exact params), success vs failure dispatch, empty and
 *           undefined arms, header gating, row numbering, the per-extension icon switch, the
 *           Active/Inactive badge switch, and both arms of the status toggle (PUT url + refresh).
 *
 * FINDINGS DISCOVERED (each characterised, not fixed - suffix _FINDING_<CODE>)
 *   PDU-DEPT-NPE      handleUpload does `!userdepartment[0].Id` with no guard. `my_department`
 *                     is absent from dashboardReducers' initState (verified: store/reducers/
 *                     dashboard/dashboardReducers.js), so the prop is `undefined` until the
 *                     FETCH_MY_DEPT action lands. A fully valid submit before that throws
 *                     TypeError - `undefined[0]` when the slice is untouched, `undefined.Id`
 *                     once it is an empty array. handleUpload is `async`, so the throw becomes
 *                     an UNHANDLED REJECTION - the user sees nothing at all and the document is
 *                     silently never uploaded.
 *   PDU-DEPT-SILENT   setValidateDepartment(true) is reachable, but the "Please Select
 *                     Department" label is commented out of the JSX. A department-less user
 *                     presses Upload and gets zero feedback: no error, no request.
 *   PDU-DEPT-FIRST    Only `userdepartment[0].Id` is posted as selectedDepartments. The
 *                     MultiSelect that was meant to choose departments is commented out and the
 *                     `react-multi-select-component` import is dead, so a user in 3 departments
 *                     can only ever publish to the first one the API happens to return.
 *   PDU-COUNTRY-STR   The country <select> writes e.target.value (a STRING) into CountryId, but
 *                     the Geo guard tests `CountryId === 0` (strict, number). Re-selecting the
 *                     "Select Country" placeholder yields "0", which is !== 0, so the guard is
 *                     bypassed and CountryId="0" is posted as a real country.
 *   PDU-COUNTRY-STICKY Switching back to Global does not clear the "Please Select Country"
 *                     error, so the message stays on screen under a now-disabled select.
 *   PDU-TITLE-BLANK   The required-title guard is `e.target.title.value === ''` - an exact
 *                     comparison with no .trim(). A title of pure whitespace ("   ") is
 *                     therefore accepted and posted verbatim, and the document lands in the
 *                     list looking blank.
 *
 *                     NOT A FINDING (recorded so nobody re-raises it): `form.title` looks like
 *                     it should be the tooltip attribute rather than <input name="title">, and
 *                     under this suite's runtime (jsdom 11.12.0) it IS - jsdom 11 implements no
 *                     HTMLFormElement named-property getter at all, so `form.title` is '' and
 *                     `''.value` is undefined. That is a jsdom artifact, NOT a product defect.
 *                     HTMLFormElement is [LegacyOverrideBuiltIns] per the HTML standard, so in
 *                     Chrome/Firefox `form.title` resolves to the named input and the empty-title
 *                     guard fires normally. Do not write a test asserting that a blank title
 *                     uploads - it would be true only in jsdom and false for every real user.
 *   PDU-DOM-NEST      renderFileList emits <tbody>/<tr> directly inside a <ul> - invalid DOM
 *                     nesting, asserted structurally against the rendered tree.
 *   PDU-NO-KEY        The country <option> list is mapped without a React `key`, so the options
 *                     are reconciled by array index instead of by identity.
 *   UDL-STATUS-TYPE   handleupdatestatus compares `status === "1"` (string) while the button
 *                     label uses `IsActive == 0` (loose). When the API returns IsActive as a
 *                     NUMBER, the button reads "Click to deactivate" but PUTs docstatus=1
 *                     (activate) - the toggle is a silent no-op.
 *   UDL-BADGE-TYPE    The Status badge switch also only matches the strings "1"/"0", so a
 *                     numeric IsActive renders an EMPTY status cell - no badge at all.
 *   UDL-NO-DOWNLOAD   downloadBase64File, the JSZip import, PoliciesDocumentViewer and the
 *                     whole modal/viewer state (isindex, isModalOpen, openModal, closeModal,
 *                     handleviewer) are dead code. There is no download control, no re-download
 *                     and no viewer anywhere on this page.
 *   UDL-USER-NPE      `CountryId: user.country_id` is dereferenced in the useState initialiser
 *                     with no guard; mounting before the user slice is hydrated throws.
 *   UDL-FILTER-FROZEN handleFilter is fired once from a []-dep useEffect over the INITIAL
 *                     formData and there is no filter UI, so GlobalType/DepartmentId/
 *                     selectedDepartments can never be anything but their seed values.
 *   UDL-NO-KEY        The document <tr> rows are mapped without a React `key`, so the rows are
 *                     reconciled by array index instead of by document identity.
 *
 * A NOTE ON THE CONSOLE ACCUMULATORS
 *   console.error output is captured but deliberately NOT asserted on. React de-duplicates both
 *   the missing-`key` warning (once per owner component type) and the validateDOMNesting warning
 *   (once per ancestor|child tag pair) for the lifetime of the module registry, i.e. once per
 *   FILE, not once per test. Any `consoleErrors.some(/unique "key" prop/)` assertion is therefore
 *   satisfied by whichever test rendered first, not by the render under test, and would stay
 *   green after the defect was fixed. Both key findings below are proved by reconciliation
 *   behaviour instead. consoleWarns IS asserted on, but only for the component's own
 *   `console.warn` call, which is emitted on every invalid file and is not de-duplicated.
 *
 * ADDITIVE ONLY - no app source and no pre-existing test file was modified.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

// ---------------------------------------------------------------- mocks

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => mockDispatch,
}));

global.links = new Proxy({}, { get: () => '/x/' });

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

jest.mock('react-bootstrap', () => {
    const React = require('react');
    return {
        Table: ({ children }) => <table data-testid="doc-table">{children}</table>,
        Badge: ({ children, variant }) => (
            <span data-testid="badge" data-variant={variant}>{children}</span>
        ),
    };
});

jest.mock('react-multi-select-component', () => {
    const React = require('react');
    return { __esModule: true, default: () => <div data-testid="multiselect" /> };
});

const mockZipCtor = jest.fn(() => ({
    file: jest.fn(),
    generateAsync: jest.fn(() => Promise.resolve('ZIPBLOB')),
}));
jest.mock('jszip', () => mockZipCtor);

jest.mock('../../services/API', () => ({ call: jest.fn() }));
jest.mock('../../services/Formatter', () => ({
    alert_error: jest.fn((e) => ({ type: 'STUB_ALERT_ERROR', e })),
    alert_success: jest.fn((r, t) => ({ type: 'STUB_ALERT_SUCCESS', r, t })),
    array_to_multiselect_array: jest.fn(() => []),
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
        return <div data-testid="viewer" />;
    };
});

const API = require('../../services/API').default || require('../../services/API');
const Formatter =
    require('../../services/Formatter').default || require('../../services/Formatter');
const PoliciesApi = require('../../components/PoliciesDocument/PoliciesDocumentApi.js');
const PoliciesDocumentUpload =
    require('../../components/PoliciesDocument/PoliciesDocumentUpload').default;
const UploadedDocumentList =
    require('../../components/PoliciesDocument/UploadedDocumentList').default;

// ------------------------------------------------------------- fixtures

const MAX = 10 * 1024 * 1024;

const COUNTRIES = [
    { country_id: 5, country_name: 'India' },
    { country_id: 8, country_name: 'Philippines' },
];

const USER = { department: 'HR', country_id: 7, id: 1 };
const DEPTS = [{ Id: 42, DepartmentName: 'HR' }];

const DOCS = [
    {
        Id: 101, Title: 'Code of Conduct', countryname: 'Philippines',
        Name: 'Human Resources', FileExtension: 'pdf', IsActive: '1',
    },
    {
        Id: 102, Title: 'Leave Policy', countryname: 'India',
        Name: 'Human Resources', FileExtension: 'docx', IsActive: '0',
    },
];

// Both are reset in beforeEach, so anything read out of them belongs to the render under test
// and to nothing else. consoleErrors is a capture buffer that keeps React's warnings out of the
// runner output; it is not asserted on (see "A NOTE ON THE CONSOLE ACCUMULATORS" above).
const consoleErrors = [];
const consoleWarns = [];

/**
 * React 16 parks the element's props on the DOM node under `__reactEventHandlers$<id>`. Reaching
 * for the handler this way lets a test invoke an `async` submit handler and OWN the returned
 * promise. That matters for PDU-DEPT-NPE: fired through the DOM the rejection escapes as an
 * unhandled promise rejection (which is precisely the defect), and an escaped rejection would
 * make this suite non-deterministic.
 */
const reactProps = (el) => {
    const key = Object.keys(el).find((k) => k.startsWith('__reactEventHandlers$'));
    if (!key) {
        // React 17 renamed this to `__reactProps$`. Fail loudly and say why, rather than
        // returning undefined and dying inside the test with an unrelated TypeError.
        throw new Error(
            'reactProps: no __reactEventHandlers$ key on the node. This helper depends on a '
            + 'React 16 internal; on React 17+ the key is __reactProps$. Update the prefix here.'
        );
    }
    return el[key];
};

function makeFile(name, size = 2048, type = 'application/octet-stream') {
    const f = new File(['x'], name, { type });
    Object.defineProperty(f, 'size', { value: size, configurable: true });
    return f;
}

// ------------------------------------------------------------- selectors

const formEl = (c) => c.querySelector('form');
const radios = (c) => Array.from(c.querySelectorAll('input[name="GlobalType"]'));
const radioFor = (c, v) => radios(c).find((r) => r.value === v);
const countrySelect = (c) => c.querySelector('select[name="CountryId"]');
const titleInput = (c) => c.querySelector('input[name="title"]');
const fileInput = (c) => c.querySelector('input[name="FileData"]');
const acceptedNames = (c) =>
    Array.from(c.querySelectorAll('ul.list_style tr.rendertd'))
        .map((tr) => tr.children[1].textContent.trim());
const acceptedNumbers = (c) =>
    Array.from(c.querySelectorAll('ul.list_style tr.rendertd'))
        .map((tr) => tr.children[0].textContent.trim());
const removeButtons = (c) => Array.from(c.querySelectorAll('ul.list_style button.removebtn'));
const invalidNames = (c) =>
    Array.from(c.querySelectorAll('ul.invalid li')).map((li) => li.textContent.trim());
const docRows = (c) => Array.from(c.querySelectorAll('tbody tr'));

// -------------------------------------------------------------- harness

const uploadEl = (props = {}) => (
    <PoliciesDocumentUpload
        user={USER}
        usercountry={[]}
        userdepartment={DEPTS}
        countries={COUNTRIES}
        {...props}
    />
);

function renderUpload(props = {}) {
    const utils = render(uploadEl(props));
    // Re-render the SAME mounted instance with changed props, so reconciliation (not a fresh
    // mount) is what the test observes.
    utils.rerenderUpload = (next = {}) => utils.rerender(uploadEl({ ...props, ...next }));
    return utils;
}

const listEl = (props = {}) => (
    <UploadedDocumentList
        user={USER}
        policiesdocument={DOCS}
        userdepartment={DEPTS}
        {...props}
    />
);

async function renderList(props = {}) {
    let utils;
    await act(async () => {
        utils = render(listEl(props));
    });
    utils.rerenderList = async (next = {}) => {
        await act(async () => {
            utils.rerender(listEl({ ...props, ...next }));
        });
    };
    return utils;
}

/** Put N files through the file input in one selection. */
async function selectFiles(container, files) {
    await act(async () => {
        fireEvent.change(fileInput(container), { target: { files } });
    });
}

async function submit(container) {
    await act(async () => {
        fireEvent.submit(formEl(container));
    });
}

/** Fill the form so that every guard passes, leaving only the arm under test to fail. */
async function fillValid(container, { title = 'HR Handbook', files = [makeFile('policy.pdf')] } = {}) {
    await selectFiles(container, files);
    await act(async () => {
        fireEvent.change(titleInput(container), { target: { value: title } });
    });
}

const postedForm = () => {
    const call = API.call.mock.calls.find((c) => c[0] && c[0].method === 'post');
    return call ? call[0].data : null;
};
const putCall = () => {
    const call = API.call.mock.calls.find((c) => c[0] && c[0].method === 'put');
    return call ? call[0] : null;
};

beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation((...a) => {
        consoleErrors.push(a.map((x) => String(x)).join(' '));
    });
    jest.spyOn(console, 'warn').mockImplementation((...a) => {
        consoleWarns.push(a.map((x) => String(x)).join(' '));
    });
    jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterAll(() => {
    jest.restoreAllMocks();
});

beforeEach(() => {
    jest.clearAllMocks();
    consoleErrors.length = 0;
    consoleWarns.length = 0;
    mockViewerProps.length = 0;
    API.call.mockImplementation(() => Promise.resolve({ data: { message: 'Saved' } }));
});

/* ==========================================================================================
 * PoliciesDocumentUpload - Dashboard -> Policies Document -> Upload Policies Document
 * ======================================================================================= */

describe('Upload Policies Document - mount', () => {
    it('asks for the current user country and the global department list on mount', () => {
        renderUpload();
        expect(PoliciesApi.fecthUserContry).toHaveBeenCalledTimes(1);
        expect(PoliciesApi.fecthUserContry).toHaveBeenCalledWith(0);
        expect(PoliciesApi.fecthUserDepartment).toHaveBeenCalledTimes(1);
        expect(PoliciesApi.fecthUserDepartment).toHaveBeenCalledWith(1, 0, 0);
        expect(mockDispatch).toHaveBeenCalledWith({ type: 'STUB_FETCH_COUNTRY', id: 0 });
        expect(mockDispatch).toHaveBeenCalledWith({ type: 'STUB_FETCH_DEPT', g: 1, c: 0, u: 0 });
    });

    it('starts on Global with the country select disabled and no country chosen', () => {
        const { container } = renderUpload();
        expect(radioFor(container, 'Global').checked).toBe(true);
        expect(radioFor(container, 'Geo').checked).toBe(false);
        expect(countrySelect(container).disabled).toBe(true);
        expect(countrySelect(container).value).toBe('0');
    });

    it('mirrors the logged-in department into the hidden department field', () => {
        const { container } = renderUpload();
        const hidden = container.querySelector('input[name="department"]');
        expect(hidden.type).toBe('hidden');
        expect(hidden.value).toBe('HR');
        expect(hidden.disabled).toBe(true);
    });
});

describe('Upload Policies Document - Global vs Geo scope', () => {
    it('choosing Geo unlocks the country select and does not re-fetch departments', () => {
        const { container } = renderUpload();
        PoliciesApi.fecthUserDepartment.mockClear();
        fireEvent.click(radioFor(container, 'Geo'));
        expect(radioFor(container, 'Geo').checked).toBe(true);
        expect(countrySelect(container).disabled).toBe(false);
        expect(PoliciesApi.fecthUserDepartment).not.toHaveBeenCalled();
    });

    it('switching back to Global re-locks the select, resets the country and re-fetches the global departments', () => {
        const { container } = renderUpload();
        fireEvent.click(radioFor(container, 'Geo'));
        fireEvent.change(countrySelect(container), { target: { value: '5' } });
        expect(countrySelect(container).value).toBe('5');

        PoliciesApi.fecthUserDepartment.mockClear();
        fireEvent.click(radioFor(container, 'Global'));

        expect(countrySelect(container).disabled).toBe(true);
        expect(countrySelect(container).value).toBe('0');
        expect(PoliciesApi.fecthUserDepartment).toHaveBeenCalledTimes(1);
        expect(PoliciesApi.fecthUserDepartment).toHaveBeenCalledWith(1, 0, 0);
    });

    it('renders the placeholder plus one option per country supplied', () => {
        const { container } = renderUpload();
        const opts = Array.from(countrySelect(container).querySelectorAll('option'));
        expect(opts.map((o) => o.value)).toEqual(['0', '5', '8']);
        expect(opts[0].label).toBe('Select Country');
        expect(opts[1].textContent).toBe('India');
        expect(opts[2].textContent).toBe('Philippines');
    });

    it('renders only the placeholder when the country list is empty', () => {
        const { container } = renderUpload({ countries: [] });
        expect(countrySelect(container).querySelectorAll('option').length).toBe(1);
    });

    it('picking a country re-fetches the departments scoped to that country id', () => {
        const { container } = renderUpload();
        fireEvent.click(radioFor(container, 'Geo'));
        PoliciesApi.fecthUserDepartment.mockClear();
        fireEvent.change(countrySelect(container), { target: { value: '8' } });

        expect(PoliciesApi.fecthUserDepartment).toHaveBeenCalledTimes(1);
        // The select hands over a STRING, which is what reaches the API layer verbatim.
        expect(PoliciesApi.fecthUserDepartment).toHaveBeenCalledWith(0, '8', 0);
        expect(mockDispatch).toHaveBeenCalledWith({ type: 'STUB_FETCH_DEPT', g: 0, c: '8', u: 0 });
    });

    it('picking a country clears a previously raised "Please Select Country" error', async () => {
        const { container } = renderUpload();
        fireEvent.click(radioFor(container, 'Geo'));
        await fillValid(container);
        await submit(container);
        expect(container.textContent).toContain('Please Select Country');

        fireEvent.change(countrySelect(container), { target: { value: '5' } });
        expect(container.textContent).not.toContain('Please Select Country');
    });
});

describe('Upload Policies Document - file selection guards', () => {
    it('accepts every allowed extension and lists them in selection order', async () => {
        const { container } = renderUpload();
        await selectFiles(container, [
            makeFile('a.jpg'), makeFile('b.jpeg'), makeFile('c.png'),
            makeFile('d.docx'), makeFile('e.pdf'), makeFile('f.xlsx'),
        ]);
        expect(acceptedNames(container)).toEqual(
            ['a.jpg', 'b.jpeg', 'c.png', 'd.docx', 'e.pdf', 'f.xlsx']
        );
        expect(acceptedNumbers(container)).toEqual(['1.', '2.', '3.', '4.', '5.', '6.']);
        expect(invalidNames(container)).toEqual([]);
    });

    it('accepts an allowed extension written in upper case', async () => {
        const { container } = renderUpload();
        await selectFiles(container, [makeFile('HANDBOOK.PDF')]);
        expect(acceptedNames(container)).toEqual(['HANDBOOK.PDF']);
        expect(invalidNames(container)).toEqual([]);
    });

    it('rejects a disallowed extension into the Invalid Format List and warns about it', async () => {
        const { container } = renderUpload();
        await selectFiles(container, [makeFile('notes.txt')]);
        expect(acceptedNames(container)).toEqual([]);
        expect(invalidNames(container)).toEqual(['notes.txt']);
        expect(container.textContent).toContain('Invalid Format List');
        expect(consoleWarns).toContain('File notes.txt is not a valid extension.');
    });

    it('rejects a file that has no extension at all', async () => {
        const { container } = renderUpload();
        await selectFiles(container, [makeFile('README')]);
        expect(acceptedNames(container)).toEqual([]);
        expect(invalidNames(container)).toEqual(['README']);
    });

    it('splits a mixed selection: allowed files are kept, the rest are listed as invalid', async () => {
        const { container } = renderUpload();
        await selectFiles(container, [
            makeFile('ok.pdf'), makeFile('bad.exe'), makeFile('fine.png'), makeFile('worse.zip'),
        ]);
        expect(acceptedNames(container)).toEqual(['ok.pdf', 'fine.png']);
        expect(invalidNames(container)).toEqual(['bad.exe', 'worse.zip']);
    });

    it('hides the Invalid Format List entirely when nothing was rejected', async () => {
        const { container } = renderUpload();
        await selectFiles(container, [makeFile('ok.pdf')]);
        expect(container.textContent).not.toContain('Invalid Format List');
    });

    it('drops a re-selected file with the same name and size as one already staged', async () => {
        const { container } = renderUpload();
        await selectFiles(container, [makeFile('policy.pdf', 5000)]);
        await selectFiles(container, [makeFile('policy.pdf', 5000)]);
        expect(acceptedNames(container)).toEqual(['policy.pdf']);
    });

    it('keeps a same-named file whose size differs, because the dedupe key is name+size', async () => {
        const { container } = renderUpload();
        await selectFiles(container, [makeFile('policy.pdf', 5000)]);
        await selectFiles(container, [makeFile('policy.pdf', 6000)]);
        expect(acceptedNames(container)).toEqual(['policy.pdf', 'policy.pdf']);
    });

    it('clears the previous invalid list when a fresh selection is made', async () => {
        const { container } = renderUpload();
        await selectFiles(container, [makeFile('bad.exe')]);
        expect(invalidNames(container)).toEqual(['bad.exe']);
        await selectFiles(container, [makeFile('ok.pdf')]);
        expect(invalidNames(container)).toEqual([]);
        expect(acceptedNames(container)).toEqual(['ok.pdf']);
    });

    it('removing a staged file drops only that row and renumbers the survivors', async () => {
        const { container } = renderUpload();
        await selectFiles(container, [makeFile('a.pdf'), makeFile('b.pdf'), makeFile('c.pdf')]);
        await act(async () => { fireEvent.click(removeButtons(container)[1]); });
        expect(acceptedNames(container)).toEqual(['a.pdf', 'c.pdf']);
        expect(acceptedNumbers(container)).toEqual(['1.', '2.']);
    });

    it('removing the last staged file empties the list', async () => {
        const { container } = renderUpload();
        await selectFiles(container, [makeFile('only.pdf')]);
        await act(async () => { fireEvent.click(removeButtons(container)[0]); });
        expect(acceptedNames(container)).toEqual([]);
        expect(removeButtons(container).length).toBe(0);
    });

    it('choosing a file clears a previously raised "please choose a valid file" error', async () => {
        const { container } = renderUpload();
        await submit(container);
        expect(container.textContent).toContain('Please choose a valid file');
        await selectFiles(container, [makeFile('ok.pdf')]);
        expect(container.textContent).not.toContain('Please choose a valid file');
    });
});

describe('Upload Policies Document - submit validation cascade', () => {
    it('submitting with nothing staged raises the file error and issues no request', async () => {
        const { container } = renderUpload();
        await submit(container);
        expect(container.textContent).toContain(
            'Please choose a valid file (pdf, doc, jpg, jpeg, png, xlsx)'
        );
        expect(container.textContent).not.toContain('Please Select Country');
        expect(API.call).not.toHaveBeenCalled();
    });

    it('submitting with nothing staged in Geo scope raises BOTH the file and the country error', async () => {
        const { container } = renderUpload();
        fireEvent.click(radioFor(container, 'Geo'));
        await submit(container);
        expect(container.textContent).toContain('Please choose a valid file');
        expect(container.textContent).toContain('Please Select Country');
        expect(API.call).not.toHaveBeenCalled();
    });

    it('submitting a Geo document without a country raises only the country error', async () => {
        const { container } = renderUpload();
        fireEvent.click(radioFor(container, 'Geo'));
        await fillValid(container);
        await submit(container);
        expect(container.textContent).toContain('Please Select Country');
        expect(container.textContent).not.toContain('Please choose a valid file');
        expect(API.call).not.toHaveBeenCalled();
    });

    it('an oversized file short-circuits the cascade before the file and country guards run', async () => {
        const { container } = renderUpload();
        fireEvent.click(radioFor(container, 'Geo'));   // Geo with no country chosen
        await selectFiles(container, [makeFile('huge.pdf', MAX + 1)]);
        await submit(container);
        expect(container.textContent).toContain('File size too big. Max of 10MB only.');
        // The Geo/country guard would otherwise have fired - the size guard returned first.
        expect(container.textContent).not.toContain('Please Select Country');
        expect(API.call).not.toHaveBeenCalled();
    });

    it('a file of exactly 10MB is on the allowed side of the size boundary and uploads', async () => {
        const { container } = renderUpload();
        await fillValid(container, { files: [makeFile('exactly10mb.pdf', MAX)] });
        await submit(container);
        expect(container.textContent).not.toContain('File size too big');
        expect(API.call).toHaveBeenCalledTimes(1);
    });

    it('one oversized file in a batch blocks the whole batch', async () => {
        const { container } = renderUpload();
        await fillValid(container, {
            files: [makeFile('small.pdf', 100), makeFile('huge.pdf', MAX + 1)],
        });
        await submit(container);
        expect(container.textContent).toContain('File size too big. Max of 10MB only.');
        expect(API.call).not.toHaveBeenCalled();
    });

    it('removing the oversized file clears the size message', async () => {
        const { container } = renderUpload();
        await selectFiles(container, [makeFile('huge.pdf', MAX + 1)]);
        await submit(container);
        expect(container.textContent).toContain('File size too big');
        await act(async () => { fireEvent.click(removeButtons(container)[0]); });
        expect(container.textContent).not.toContain('File size too big');
    });
});

describe('Upload Policies Document - successful post', () => {
    it('posts a multipart body to /uploadfiles carrying every staged file and the metadata', async () => {
        const { container } = renderUpload();
        await fillValid(container, {
            title: 'Employee Handbook',
            files: [makeFile('a.pdf'), makeFile('b.png')],
        });
        await submit(container);

        expect(API.call).toHaveBeenCalledTimes(1);
        const cfg = API.call.mock.calls[0][0];
        expect(cfg.method).toBe('post');
        expect(cfg.url).toBe('/uploadfiles');

        const fd = cfg.data;
        expect(fd).toBeInstanceOf(FormData);
        expect(fd.getAll('FileData[]').map((f) => f.name)).toEqual(['a.pdf', 'b.png']);
        expect(fd.get('GlobalType')).toBe('1');       // Global scope encodes as 1
        expect(fd.get('CountryId')).toBe('0');
        expect(fd.get('selectedDepartments')).toBe('42');
        expect(fd.get('title')).toBe('Employee Handbook');
    });

    it('a Geo document encodes GlobalType as 0 and carries the chosen country', async () => {
        const { container } = renderUpload();
        fireEvent.click(radioFor(container, 'Geo'));
        fireEvent.change(countrySelect(container), { target: { value: '5' } });
        await fillValid(container, { title: 'India Leave Policy' });
        await submit(container);

        const fd = postedForm();
        expect(fd.get('GlobalType')).toBe('0');
        expect(fd.get('CountryId')).toBe('5');
        expect(fd.get('title')).toBe('India Leave Policy');
    });

    it('a successful post raises a 3 second success alert and empties the staged file list', async () => {
        const { container } = renderUpload();
        const result = { data: { message: 'Saved' } };
        API.call.mockImplementation(() => Promise.resolve(result));
        await fillValid(container, { title: 'Doc' });
        await submit(container);

        expect(Formatter.alert_success).toHaveBeenCalledTimes(1);
        expect(Formatter.alert_success).toHaveBeenCalledWith(result, 3000);
        expect(mockDispatch).toHaveBeenCalledWith(
            { type: 'STUB_ALERT_SUCCESS', r: result, t: 3000 }
        );
        expect(acceptedNames(container)).toEqual([]);
        expect(titleInput(container).value).toBe('');
    });

    it('a successful post resets the scope back to Global and re-disables the country select', async () => {
        const { container } = renderUpload();
        fireEvent.click(radioFor(container, 'Geo'));
        fireEvent.change(countrySelect(container), { target: { value: '5' } });
        await fillValid(container, { title: 'Doc' });
        await submit(container);

        expect(radioFor(container, 'Global').checked).toBe(true);
        expect(radioFor(container, 'Geo').checked).toBe(false);
        expect(countrySelect(container).disabled).toBe(true);
        expect(countrySelect(container).value).toBe('0');
    });

    it('a failed post raises an error alert and leaves the staged files in place for a retry', async () => {
        const { container } = renderUpload();
        const boom = { status: 500, message: 'server exploded' };
        API.call.mockImplementation(() => Promise.reject(boom));
        await fillValid(container, { title: 'Doc', files: [makeFile('keepme.pdf')] });
        await submit(container);

        expect(Formatter.alert_error).toHaveBeenCalledTimes(1);
        expect(Formatter.alert_error).toHaveBeenCalledWith(boom);
        expect(mockDispatch).toHaveBeenCalledWith({ type: 'STUB_ALERT_ERROR', e: boom });
        expect(Formatter.alert_success).not.toHaveBeenCalled();
        expect(acceptedNames(container)).toEqual(['keepme.pdf']);
        expect(titleInput(container).value).toBe('Doc');
    });
});

describe('Upload Policies Document - FINDINGS', () => {
    // FINDING PDU-DEPT-NPE
    // `!userdepartment[0].Id` has no guard. Reachability, verified rather than assumed:
    // store/reducers/dashboard/dashboardReducers.js declares no `my_department` key in its
    // initState, and mapStateToProps maps `state.dashboard.my_department` straight into the
    // prop - so `userdepartment` is literally `undefined` on first render and only becomes an
    // array when the FETCH_MY_DEPT action lands. A user who submits a perfectly valid form
    // before that round-trip completes hits `undefined[0]`; once the slice exists but is empty
    // they hit `undefined.Id`. Both are TypeErrors, and both are covered below.
    // Because handleUpload is `async`, the TypeError becomes an unhandled promise rejection:
    // React never sees it, no error boundary fires, no alert is dispatched and no request is
    // made. The Upload button simply does nothing, forever.
    it.each([
        ['an unhydrated department slice (undefined - the reducer initial state)', undefined],
        ['an empty department slice ([] - fetched, but the user has no department)', []],
    ])('_FINDING_PDU_DEPT_NPE %s makes a valid submit die silently', async (_label, dept) => {
        const { container } = renderUpload({ userdepartment: dept });
        await fillValid(container, { title: 'Doc' });

        // Submit is invoked directly so this test OWNS the promise handleUpload returns. In the
        // browser React discards it, so this TypeError escapes as an unhandled rejection.
        const form = formEl(container);
        const evt = { preventDefault: jest.fn(), target: form };
        await expect(reactProps(form).onSubmit(evt)).rejects.toThrow(TypeError);
        expect(evt.preventDefault).toHaveBeenCalledTimes(1);

        expect(API.call).not.toHaveBeenCalled();
        expect(Formatter.alert_error).not.toHaveBeenCalled();
        expect(Formatter.alert_success).not.toHaveBeenCalled();
        // Nothing at all is shown to the user - the Upload button simply does nothing.
        expect(container.textContent).not.toContain('Please choose a valid file');
        expect(container.textContent).not.toContain('Please Select Country');
        expect(container.textContent).not.toContain('Please provide a proper title');
        expect(container.textContent).not.toContain('File size too big');
        expect(acceptedNames(container)).toEqual(['policy.pdf']);
    });

    // FINDING PDU-DEPT-SILENT
    // A department row that exists but carries no Id reaches setValidateDepartment(true) - but
    // the "Please Select Department" label is commented out of the JSX, so the state change is
    // invisible. The form rejects the submit with zero feedback.
    //
    // The `Id` is the ONLY difference between the two halves of this test. The control half
    // proves the form is alive and that this exact input posts; the finding half then proves
    // that removing the Id turns the submit into a silent dead end. Without the control, "no
    // request and no message" would also be satisfied by a crashed or no-op component.
    it('_FINDING_PDU_DEPT_SILENT a department row without an Id blocks the upload with no message', async () => {
        // CONTROL: identical form, department row WITH an Id -> posts.
        const control = renderUpload({ userdepartment: [{ Id: 7, DepartmentName: 'Orphan' }] });
        await fillValid(control.container, { title: 'Doc' });
        await submit(control.container);
        expect(API.call).toHaveBeenCalledTimes(1);
        control.unmount();

        API.call.mockClear();

        // FINDING: same form, the Id removed -> the submit dies with no request and no message.
        const { container } = renderUpload({ userdepartment: [{ DepartmentName: 'Orphan' }] });
        await fillValid(container, { title: 'Doc' });
        await submit(container);

        expect(API.call).not.toHaveBeenCalled();
        // The component is alive and the submit really did run: the file is still staged, the
        // form and its Upload button are still on screen.
        expect(acceptedNames(container)).toEqual(['policy.pdf']);
        expect(formEl(container)).not.toBeNull();
        expect(container.querySelector('button[type="submit"]').textContent).toBe('Upload');
        // ...and not one of the four validation labels the component knows how to render is
        // shown - including the "Please Select Department" one, which is commented out of JSX.
        expect(container.textContent).not.toContain('Please Select Department');
        expect(container.textContent).not.toContain('Please choose a valid file');
        expect(container.textContent).not.toContain('Please Select Country');
        expect(container.textContent).not.toContain('Please provide a proper title');
        expect(container.textContent).not.toContain('File size too big');
    });

    // FINDING PDU-DEPT-FIRST
    // Only userdepartment[0].Id is ever posted. The MultiSelect that was meant to let the user
    // pick departments is commented out, so a user in three departments can only publish to
    // whichever one the API happens to return first.
    it('_FINDING_PDU_DEPT_FIRST only the first department is ever published to', async () => {
        const { container } = renderUpload({
            userdepartment: [
                { Id: 42, DepartmentName: 'HR' },
                { Id: 43, DepartmentName: 'IT' },
                { Id: 44, DepartmentName: 'Finance' },
            ],
        });
        await fillValid(container, { title: 'Doc' });
        await submit(container);

        expect(postedForm().getAll('selectedDepartments')).toEqual(['42']);
        // No department picker is rendered at all.
        expect(container.querySelector('[data-testid="multiselect"]')).toBeNull();
    });

    // FINDING PDU-COUNTRY-STR
    // handleChange stores the select's STRING value in CountryId, but the Geo guard compares
    // `CountryId === 0` (strict, number). Re-selecting the "Select Country" placeholder stores
    // "0", which is !== 0, so the guard is bypassed and the placeholder is posted as a country.
    it('_FINDING_PDU_COUNTRY_STR re-selecting the placeholder posts CountryId "0" past the guard', async () => {
        const { container } = renderUpload();
        fireEvent.click(radioFor(container, 'Geo'));
        fireEvent.change(countrySelect(container), { target: { value: '5' } });
        fireEvent.change(countrySelect(container), { target: { value: '0' } });
        await fillValid(container, { title: 'Doc' });
        await submit(container);

        expect(container.textContent).not.toContain('Please Select Country');
        expect(API.call).toHaveBeenCalledTimes(1);
        expect(postedForm().get('CountryId')).toBe('0');
        expect(postedForm().get('GlobalType')).toBe('0');
    });

    // FINDING PDU-COUNTRY-STICKY
    // The GlobalType branch of handleChange never calls setValidateCountry(false), so the red
    // "Please Select Country" error survives a switch back to Global and sits under a select
    // the user is no longer allowed to touch.
    it('_FINDING_PDU_COUNTRY_STICKY the country error survives switching back to Global', async () => {
        const { container } = renderUpload();
        fireEvent.click(radioFor(container, 'Geo'));
        await fillValid(container);
        await submit(container);
        expect(container.textContent).toContain('Please Select Country');

        fireEvent.click(radioFor(container, 'Global'));
        expect(countrySelect(container).disabled).toBe(true);
        expect(container.textContent).toContain('Please Select Country');
    });

    // FINDING PDU-TITLE-BLANK
    // The required-title guard is an exact `=== ''` comparison with no .trim(), so a title of
    // pure whitespace clears it and is stored verbatim - the document lands in the list looking
    // blank. This assertion is runtime-independent: in a real browser `form.title` resolves to
    // <input name="title"> (HTMLFormElement is [LegacyOverrideBuiltIns]) and '   ' !== '' lets
    // the submit through; under jsdom 11 the guard is inert for an unrelated reason. Either way
    // the whitespace title is posted, which is the defect. The fix is .trim(), not a new guard.
    //
    // Deliberately NOT tested here: the empty-title case. Under jsdom 11 an empty title also
    // uploads, but only because jsdom 11 has no HTMLFormElement named-property getter - a real
    // browser raises "Please provide a proper title for this document." as intended. See the
    // "NOT A FINDING" note in the file header.
    it('_FINDING_PDU_TITLE_BLANK a whitespace-only title is posted verbatim', async () => {
        const { container } = renderUpload();
        await fillValid(container, { title: '   ' });
        await submit(container);
        expect(API.call).toHaveBeenCalledTimes(1);
        expect(postedForm().get('title')).toBe('   ');
    });

    // FINDING PDU-DOM-NEST
    // renderFileList emits <tbody><tr> straight into a <ul>. Asserted against the rendered tree
    // rather than against React's validateDOMNesting warning, because that warning is emitted
    // once per ancestor|child tag pair for the whole file and so cannot be attributed to this
    // render. One <tbody> per staged file, each a direct child of the <ul>.
    it('_FINDING_PDU_DOM_NEST staged files are rendered as table rows inside a <ul>', async () => {
        const { container } = renderUpload();
        await selectFiles(container, [makeFile('a.pdf'), makeFile('b.pdf')]);
        const ul = container.querySelector('ul.list_style');
        expect(ul.tagName).toBe('UL');
        expect(Array.from(ul.children).map((c) => c.tagName)).toEqual(['TBODY', 'TBODY']);
        // Each <tbody> child of the <ul> holds exactly the one file row.
        expect(
            Array.from(ul.children).map((tb) =>
                Array.from(tb.children).map((tr) => `${tr.tagName}.${tr.className}`))
        ).toEqual([['TR.rendertd'], ['TR.rendertd']]);
        expect(acceptedNames(container)).toEqual(['a.pdf', 'b.pdf']);
        // No <li> anywhere - the list markup the <ul> exists for is entirely unused.
        expect(ul.querySelectorAll('li').length).toBe(0);
    });

    // FINDING PDU-NO-KEY
    // The country <option> list is mapped with no `key`, so React reconciles the options by
    // array index. Proved by behaviour, not by the console: prepend a country and, if the
    // options were keyed, React would insert a NEW DOM node at the front and slide the existing
    // "India" node down to index 2. Unkeyed, it instead keeps the node in place and overwrites
    // its text - the same DOM object now says "Japan". That node-identity check is deterministic
    // and cannot be satisfied by an earlier test, which the console assertion it replaces could.
    it('_FINDING_PDU_NO_KEY the country options are reconciled by index, not by key', () => {
        const { container, rerenderUpload } = renderUpload();
        const optionsOf = () =>
            Array.from(countrySelect(container).querySelectorAll('option'));

        const before = optionsOf();
        expect(before.map((o) => o.textContent)).toEqual(['', 'India', 'Philippines']);
        const indiaNode = before[1];

        rerenderUpload({
            countries: [{ country_id: 9, country_name: 'Japan' }, ...COUNTRIES],
        });

        const after = optionsOf();
        expect(after.map((o) => o.textContent)).toEqual(['', 'Japan', 'India', 'Philippines']);
        // Index-based reuse: the very same element object now carries a different country.
        expect(after[1]).toBe(indiaNode);
        expect(indiaNode.textContent).toBe('Japan');
        // With a key, India would have survived as its own node at index 2.
        expect(after[2]).not.toBe(indiaNode);
    });
});

/* ==========================================================================================
 * UploadedDocumentList - Dashboard -> Policies Document -> Manage Policy Accessibility
 * ======================================================================================= */

describe('Manage Policy Accessibility - mount fetch', () => {
    it('requests the document list once on mount with the seeded filter params', async () => {
        await renderList();
        expect(API.call).toHaveBeenCalledTimes(1);
        expect(API.call).toHaveBeenCalledWith({
            method: 'get',
            url: '/showlist',
            params: {
                GlobalType: 1,
                CountryId: 7,
                DepartmentId: [],
                selectedDepartments: 'All',
            },
        });
    });

    it('publishes the fetched rows into the policies-document slice', async () => {
        const rows = [{ Id: 1, Title: 'Fetched' }];
        API.call.mockImplementation(() => Promise.resolve({ data: rows }));
        await renderList();
        expect(mockDispatch).toHaveBeenCalledWith({
            type: 'FETCH_MY_POLICIES_DOC',
            data: rows,
        });
    });

    it('a failed mount fetch raises an error alert instead of publishing rows', async () => {
        const boom = { status: 500 };
        API.call.mockImplementation(() => Promise.reject(boom));
        await renderList();
        expect(Formatter.alert_error).toHaveBeenCalledWith(boom);
        expect(mockDispatch).toHaveBeenCalledWith({ type: 'STUB_ALERT_ERROR', e: boom });
        expect(mockDispatch).not.toHaveBeenCalledWith(
            expect.objectContaining({ type: 'FETCH_MY_POLICIES_DOC' })
        );
    });
});

describe('Manage Policy Accessibility - list rendering', () => {
    it('renders the column headers and one numbered row per document', async () => {
        const { container } = await renderList();
        const heads = Array.from(container.querySelectorAll('thead th')).map((t) => t.textContent);
        expect(heads).toEqual(['Sno', 'Title', 'Geo', 'Department', 'Status', 'Action']);

        const rows = docRows(container);
        expect(rows.length).toBe(2);
        expect(rows[0].children[0].textContent).toBe('1');
        expect(rows[1].children[0].textContent).toBe('2');
    });

    it('renders the title, geo and department of each document', async () => {
        const { container } = await renderList();
        const rows = docRows(container);
        expect(rows[0].children[1].textContent).toContain('Code of Conduct');
        expect(rows[0].children[2].textContent).toBe('Philippines');
        expect(rows[0].children[3].textContent.trim()).toBe('Human Resources');
        expect(rows[1].children[1].textContent).toContain('Leave Policy');
        expect(rows[1].children[2].textContent).toBe('India');
    });

    it('shows the empty-state row and suppresses the header when there are no documents', async () => {
        const { container } = await renderList({ policiesdocument: [] });
        expect(container.querySelector('thead')).toBeNull();
        const empty = container.querySelector('td.notfound');
        expect(empty).not.toBeNull();
        expect(empty.textContent).toContain('No Document Found');
        expect(empty.getAttribute('colspan')).toBe('3');
        expect(empty.querySelector('img').getAttribute('src')).toBe('/images/nodata.png');
    });

    it('shows the same empty state when the slice has not been populated yet', async () => {
        const { container } = await renderList({ policiesdocument: undefined });
        expect(container.querySelector('thead')).toBeNull();
        expect(container.querySelector('td.notfound').textContent).toContain('No Document Found');
    });

    it.each([
        ['csv', '/images/excel.png'],
        ['xlsx', '/images/excel.png'],
        ['docx', '/images/doc.png'],
        ['pdf', '/images/pdf.png'],
        ['png', '/images/img.png'],
        ['jpg', '/images/img.png'],
        ['jpeg', '/images/img.png'],
    ])('maps a .%s document to the %s icon', async (ext, icon) => {
        const { container } = await renderList({
            policiesdocument: [{ ...DOCS[0], FileExtension: ext }],
        });
        expect(
            docRows(container)[0].querySelector('td.tdcontent img').getAttribute('src')
        ).toBe(icon);
    });

    it('falls back to an empty icon source for an unrecognised extension', async () => {
        const { container } = await renderList({
            policiesdocument: [{ ...DOCS[0], FileExtension: 'msg' }],
        });
        expect(
            docRows(container)[0].querySelector('td.tdcontent img').getAttribute('src')
        ).toBe('');
    });

    it('shows a success badge and a deactivate button for an active document', async () => {
        const { container } = await renderList({ policiesdocument: [DOCS[0]] });
        const row = docRows(container)[0];
        const badge = row.querySelector('[data-testid="badge"]');
        expect(badge.textContent).toBe('Active');
        expect(badge.getAttribute('data-variant')).toBe('success');
        expect(row.querySelector('button').textContent).toBe('Click to deactivate');
    });

    it('shows a danger badge and an activate button for an inactive document', async () => {
        const { container } = await renderList({ policiesdocument: [DOCS[1]] });
        const row = docRows(container)[0];
        const badge = row.querySelector('[data-testid="badge"]');
        expect(badge.textContent).toBe('Inactive');
        expect(badge.getAttribute('data-variant')).toBe('danger');
        expect(row.querySelector('button').textContent).toBe('Click to activate');
    });
});

describe('Manage Policy Accessibility - status toggle', () => {
    it('deactivating an active document PUTs status 0 for that document id', async () => {
        const { container } = await renderList({ policiesdocument: [DOCS[0]] });
        API.call.mockClear();
        await act(async () => {
            fireEvent.click(docRows(container)[0].querySelector('button'));
        });
        expect(putCall()).toEqual({ method: 'put', url: '/updatestatus/101/0' });
    });

    it('activating an inactive document PUTs status 1 for that document id', async () => {
        const { container } = await renderList({ policiesdocument: [DOCS[1]] });
        API.call.mockClear();
        await act(async () => {
            fireEvent.click(docRows(container)[0].querySelector('button'));
        });
        expect(putCall()).toEqual({ method: 'put', url: '/updatestatus/102/1' });
    });

    it('a successful toggle republishes the refreshed list into the slice', async () => {
        const { container } = await renderList({ policiesdocument: [DOCS[0]] });
        const refreshed = [{ ...DOCS[0], IsActive: '0' }];
        API.call.mockImplementation(() => Promise.resolve({ data: refreshed }));
        mockDispatch.mockClear();
        await act(async () => {
            fireEvent.click(docRows(container)[0].querySelector('button'));
        });
        expect(mockDispatch).toHaveBeenCalledWith({
            type: 'FETCH_MY_POLICIES_DOC',
            data: refreshed,
        });
    });

    it('a failed toggle raises an error alert and leaves the rendered row untouched', async () => {
        const { container } = await renderList({ policiesdocument: [DOCS[0]] });
        const boom = { status: 422 };
        API.call.mockImplementation(() => Promise.reject(boom));
        mockDispatch.mockClear();
        Formatter.alert_error.mockClear();
        await act(async () => {
            fireEvent.click(docRows(container)[0].querySelector('button'));
        });
        expect(Formatter.alert_error).toHaveBeenCalledWith(boom);
        expect(mockDispatch).not.toHaveBeenCalledWith(
            expect.objectContaining({ type: 'FETCH_MY_POLICIES_DOC' })
        );
        expect(docRows(container)[0].querySelector('button').textContent)
            .toBe('Click to deactivate');
    });
});

describe('Manage Policy Accessibility - FINDINGS', () => {
    // FINDING UDL-STATUS-TYPE
    // handleupdatestatus branches on `status === "1"` (strict string) while the button label
    // branches on `IsActive == 0` (loose). Feed it the numeric IsActive the API actually returns
    // and the two disagree: the button offers to DEACTIVATE, but the request sent is
    // /updatestatus/<id>/1 - activate. Toggling an active document is a silent no-op.
    it('_FINDING_UDL_STATUS_TYPE a numeric IsActive makes the deactivate button re-activate instead', async () => {
        const { container } = await renderList({
            policiesdocument: [{ ...DOCS[0], IsActive: 1 }],
        });
        const button = docRows(container)[0].querySelector('button');
        expect(button.textContent).toBe('Click to deactivate');

        API.call.mockClear();
        await act(async () => { fireEvent.click(button); });
        // Would have to be /0 to actually deactivate.
        expect(putCall()).toEqual({ method: 'put', url: '/updatestatus/101/1' });
    });

    // FINDING UDL-BADGE-TYPE
    // The Status badge switch only matches the strings "1"/"0". A numeric IsActive - or any
    // other value - falls through the switch and the component returns an empty array, so the
    // status cell renders completely blank.
    it('_FINDING_UDL_BADGE_TYPE a numeric IsActive renders an empty status cell', async () => {
        const { container } = await renderList({
            policiesdocument: [{ ...DOCS[0], IsActive: 1 }],
        });
        const cell = docRows(container)[0].querySelector('td.emp-status');
        expect(cell.querySelector('[data-testid="badge"]')).toBeNull();
        expect(cell.textContent.trim()).toBe('');
    });

    it('_FINDING_UDL_BADGE_TYPE an unknown status string also renders an empty status cell', async () => {
        const { container } = await renderList({
            policiesdocument: [{ ...DOCS[0], IsActive: 'pending' }],
        });
        const cell = docRows(container)[0].querySelector('td.emp-status');
        expect(cell.querySelector('[data-testid="badge"]')).toBeNull();
        expect(cell.textContent.trim()).toBe('');
    });

    // FINDING UDL-NO-DOWNLOAD
    // downloadBase64File (the same unguarded `link.href = base64String` anchor as PDM-NULL-HREF),
    // the JSZip import (the PDM-ZIP-RACE machinery), PoliciesDocumentViewer and the entire
    // modal/viewer state are all dead. Nothing on this page can open, download or re-download a
    // document - the only action is the status toggle.
    it('_FINDING_UDL_NO_DOWNLOAD the page renders no viewer, no download control and never builds a zip', async () => {
        const { container, queryByTestId } = await renderList();
        expect(queryByTestId('viewer')).toBeNull();
        expect(mockViewerProps.length).toBe(0);
        expect(mockZipCtor).not.toHaveBeenCalled();
        // Scoped to the document table - the component's OWN markup. A container-wide anchor
        // count would only restate the layout mocks, which are bare pass-through divs.
        const table = container.querySelector('[data-testid="doc-table"]');
        expect(table.querySelectorAll('a').length).toBe(0);
        // The Action column of every row holds the status toggle and nothing else.
        docRows(container).forEach((row) => {
            const action = row.children[5];
            expect(action.children.length).toBe(1);
            expect(action.children[0].tagName).toBe('BUTTON');
        });

        const buttons = Array.from(container.querySelectorAll('button'));
        expect(buttons.length).toBe(2);
        expect(buttons.every((b) => /^Click to (activate|deactivate)$/.test(b.textContent)))
            .toBe(true);
    });

    // FINDING UDL-USER-NPE
    // `CountryId: user.country_id` is dereferenced straight in the useState initialiser. Mount
    // the page one render before the user slice is hydrated and the whole screen throws.
    it('_FINDING_UDL_USER_NPE mounting before the user slice is hydrated throws', () => {
        expect(() =>
            render(<UploadedDocumentList user={undefined} policiesdocument={DOCS} userdepartment={[]} />)
        ).toThrow(TypeError);
        expect(API.call).not.toHaveBeenCalled();
    });

    // FINDING UDL-FILTER-FROZEN
    // handleFilter is invoked once from a []-dependency useEffect, closing over the initial
    // formData, and no filter control is rendered. GlobalType is therefore permanently 1 and
    // selectedDepartments permanently "All": the "Manage Policy Accessibility" screen can never
    // be narrowed, and it never refetches on prop change either.
    it('_FINDING_UDL_FILTER_FROZEN no filter control is rendered and the list never refetches', async () => {
        const { container, rerender } = await renderList();
        expect(container.querySelectorAll('select').length).toBe(0);
        expect(container.querySelectorAll('input').length).toBe(0);
        expect(API.call).toHaveBeenCalledTimes(1);

        await act(async () => {
            rerender(
                <UploadedDocumentList
                    user={{ ...USER, country_id: 99 }}
                    policiesdocument={DOCS}
                    userdepartment={DEPTS}
                />
            );
        });
        expect(API.call).toHaveBeenCalledTimes(1);
        expect(API.call.mock.calls[0][0].params.CountryId).toBe(7);
    });

    // FINDING UDL-NO-KEY
    // policiesdocument.map emits <tr> with no `key`, so rows are reconciled by array index
    // rather than by document. Proved by node identity: prepend a document and the DOM row that
    // was "Code of Conduct" is REUSED to display the new first document instead of sliding down
    // to position 2. Any per-row DOM state (scroll position, focus, an in-flight toggle) follows
    // the slot, not the document. Asserted this way rather than via React's missing-key console
    // warning, which fires once per component type per file and so proves nothing about the
    // render under test.
    it('_FINDING_UDL_NO_KEY the document rows are reconciled by index, not by key', async () => {
        const { container, rerenderList } = await renderList();

        const before = docRows(container);
        expect(before.map((r) => r.children[1].textContent)).toEqual(
            ['Code of Conduct', 'Leave Policy']
        );
        const firstRowNode = before[0];

        const NEW_DOC = { ...DOCS[0], Id: 100, Title: 'Travel Policy' };
        await rerenderList({ policiesdocument: [NEW_DOC, ...DOCS] });

        const after = docRows(container);
        expect(after.map((r) => r.children[1].textContent)).toEqual(
            ['Travel Policy', 'Code of Conduct', 'Leave Policy']
        );
        // Index-based reuse: the same <tr> object now represents a different document.
        expect(after[0]).toBe(firstRowNode);
        expect(firstRowNode.children[1].textContent).toBe('Travel Policy');
        // With a key, "Code of Conduct" would have kept its own node and moved to index 1.
        expect(after[1]).not.toBe(firstRowNode);
    });
});
