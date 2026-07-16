// DRAFT — generated 2026-06-16, needs verification
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => jest.fn(),
}));

jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate:     ({ name }) => <input name={name} type="date" />,
    InputTime:     ({ name }) => <input name={name} type="time" />,
    InputDateTime: ({ name }) => <input name={name} type="datetime-local" />,
}));

jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);

jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader:  ({ children }) => <div>{children}</div>,
    Content:          ({ children }) => <div>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
    Row:              ({ children }) => <div>{children}</div>,
    Col:              ({ children }) => <div>{children}</div>,
}));

// Mock ReactFileViewer used in PoliciesDocumentViewer for docx/xlsx/csv rendering
jest.mock('react-file-viewer', () => () => <div data-testid="file-viewer">FileViewer</div>);

// Mock PageLoadingCard used while document is fetching
jest.mock('../../container/PageLoadingCard.js/PageLoadingCard', () => () => <div data-testid="page-loading-card" />);

// Import PoliciesDocumentUpload with try/catch for named vs default export
let PoliciesDocumentUpload;
try {
    const m = require('../../components/PoliciesDocument/PoliciesDocumentUpload');
    PoliciesDocumentUpload = m.PoliciesDocumentUpload || m.default;
} catch {
    PoliciesDocumentUpload = require('../../components/PoliciesDocument/PoliciesDocumentUpload').default;
}

// Import PoliciesDocumentDownload with try/catch
let PoliciesDocumentDownload;
try {
    const m = require('../../components/PoliciesDocument/PoliciesDocumentDownload');
    PoliciesDocumentDownload = m.PoliciesDocumentDownload || m.default;
} catch {
    PoliciesDocumentDownload = require('../../components/PoliciesDocument/PoliciesDocumentDownload').default;
}

// Import UploadedDocumentList (admin manage view) with try/catch
let UploadedDocumentList;
try {
    const m = require('../../components/PoliciesDocument/UploadedDocumentList');
    UploadedDocumentList = m.UploadedDocumentList || m.default;
} catch {
    UploadedDocumentList = require('../../components/PoliciesDocument/UploadedDocumentList').default;
}

// Default props matching Redux state shape from full-stack report
const defaultUploadProps = {
    user: {
        id: 1,
        full_name: 'Test Employee',
        pov_timezone: 'Asia/Manila',
        country_id: 1,
    },
    dispatch: jest.fn(),
    history: { push: jest.fn() },
    match: { params: {} },
    location: { search: '' },
    // state.dashboard.my_country → usercountry
    usercountry: [],
    // state.dashboard.my_department → userdepartment
    userdepartment: [{ Id: 1, DepartmentName: 'Engineering' }],
    // state.settings.countries → countries
    countries: [{ id: 1, name: 'Philippines' }],
};

const defaultDownloadProps = {
    user: {
        id: 1,
        full_name: 'Test Employee',
        pov_timezone: 'Asia/Manila',
        country_id: 1,
    },
    dispatch: jest.fn(),
    history: { push: jest.fn() },
    match: { params: {} },
    location: { search: '' },
    // state.dashboard.my_country → usercountry
    usercountry: [],
    // state.dashboard.my_doc → policiesdocument
    policiesdocument: {},
    // state.dashboard.my_department → userdepartment
    userdepartment: [{ Id: 1, DepartmentName: 'Engineering' }],
};

const defaultAdminProps = {
    user: {
        id: 1,
        full_name: 'Test Employee',
        pov_timezone: 'Asia/Manila',
        country_id: 1,
    },
    dispatch: jest.fn(),
    history: { push: jest.fn() },
    match: { params: {} },
    location: { search: '' },
    // state.dashboard.my_country → usercountry
    usercountry: [],
    // state.dashboard.my_doc → policiesdocument
    policiesdocument: [],
    // state.dashboard.my_department → userdepartment
    userdepartment: [{ Id: 1, DepartmentName: 'Engineering' }],
};

function renderUpload(props = {}) {
    return render(
        <MemoryRouter>
            <PoliciesDocumentUpload {...defaultUploadProps} {...props} />
        </MemoryRouter>
    );
}

function renderDownload(props = {}) {
    return render(
        <MemoryRouter>
            <PoliciesDocumentDownload {...defaultDownloadProps} {...props} />
        </MemoryRouter>
    );
}

function renderAdmin(props = {}) {
    return render(
        <MemoryRouter>
            <UploadedDocumentList {...defaultAdminProps} {...props} />
        </MemoryRouter>
    );
}

// =============================================================================
// PoliciesDocumentUpload — /app/policiesupload
// =============================================================================
describe('PoliciesDocumentUpload component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderUpload()).not.toThrow();
    });

    test('renders title input field', () => {
        const { getByPlaceholderText } = renderUpload();
        // Field: title, placeholder: Title (from field table in report)
        expect(getByPlaceholderText(/Title/i)).toBeInTheDocument();
    });

    test('renders Global radio button label', () => {
        const { getByLabelText } = renderUpload();
        // Label text: "Global" for radio input name="GlobalType"
        expect(getByLabelText(/Global/i)).toBeInTheDocument();
    });

    test('renders Geo radio button label', () => {
        const { getByLabelText } = renderUpload();
        // Label text: "Geo" for radio input name="GlobalType"
        expect(getByLabelText(/Geo/i)).toBeInTheDocument();
    });

    test('renders Upload submit button', () => {
        const { container } = renderUpload();
        // Use querySelector to avoid ambiguity with "Upload Policies Document" heading
        const btn = container.querySelector('button[type="submit"]');
        expect(btn).toBeInTheDocument();
        expect(btn.textContent).toMatch(/Upload/i);
    });

    test('renders file input with id drop-area', () => {
        const { container } = renderUpload();
        // FileData field: id="drop-area" from field table in report
        const fileInput = container.querySelector('#drop-area');
        expect(fileInput).toBeInTheDocument();
    });

    test('does not crash during loading state with empty userdepartment', () => {
        // Edge: userdepartment[0].Id access — guard if empty
        expect(() => renderUpload({ userdepartment: [] })).not.toThrow();
    });

    test('does not crash with empty countries list', () => {
        expect(() => renderUpload({ countries: [] })).not.toThrow();
    });

    test('does not crash with null usercountry', () => {
        expect(() => renderUpload({ usercountry: null })).not.toThrow();
    });

    test('GlobalType radio inputs have name="GlobalType"', () => {
        const { container } = renderUpload();
        const radios = container.querySelectorAll('input[name="GlobalType"]');
        // There should be at least 1 radio (Global); Geo may also be present
        expect(radios.length).toBeGreaterThanOrEqual(1);
    });
});

// =============================================================================
// PoliciesDocumentDownload — /app/policiesdownload
// =============================================================================
describe('PoliciesDocumentDownload component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderDownload()).not.toThrow();
    });

    test('does not crash with empty policiesdocument', () => {
        expect(() => renderDownload({ policiesdocument: {} })).not.toThrow();
    });

    test('does not crash with null policiesdocument', () => {
        expect(() => renderDownload({ policiesdocument: null })).not.toThrow();
    });

    test('does not crash with populated policiesdocument grouped by department', () => {
        // policiesdocument is stored as { "DeptName": [...docs] } after show() API call
        const policiesdocument = {
            Engineering: [
                { Id: 1, Title: 'Leave Policy', FileName: 'leave.pdf', FileExtension: 'pdf', IsGlobal: 1, countryname: 'Global' },
            ],
        };
        expect(() => renderDownload({ policiesdocument })).not.toThrow();
    });

    test('renders without crashing when isLoading implicit state', () => {
        expect(() => renderDownload({ policiesdocument: {} })).not.toThrow();
    });
});

// =============================================================================
// UploadedDocumentList — /app/policiesdocumentlist (admin/manage view)
// =============================================================================
describe('UploadedDocumentList component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderAdmin()).not.toThrow();
    });

    test('does not crash with empty policiesdocument list', () => {
        expect(() => renderAdmin({ policiesdocument: [] })).not.toThrow();
    });

    test('does not crash with null policiesdocument', () => {
        expect(() => renderAdmin({ policiesdocument: null })).not.toThrow();
    });

    test('renders a table structure when documents are present', () => {
        // Flat table with columns: Sno, Title, Geo, Department, Status, Action
        const policiesdocument = [
            { Id: 1, Title: 'Leave Policy', FileName: 'leave.pdf', FileExtension: 'pdf', Name: 'Engineering', IsGlobal: 1, IsActive: '1', countryname: 'Global' },
        ];
        const { container } = renderAdmin({ policiesdocument });
        // Table should be present for the document list
        expect(container.querySelector('table')).toBeInTheDocument();
    });

    test('does not crash with empty props', () => {
        expect(() => renderAdmin({ policiesdocument: [] })).not.toThrow();
    });
});
