/**
 * evoxtest_PoliciesDownloadDeep2.test.js
 * Wave-1 interaction coverage for components/PoliciesDocument/PoliciesDocumentDownload.js
 * (29 Jul baseline: 84 uncovered lines). Live arms: mount fetch (success + failure),
 * grouped accordion render, ALL FileExtension icon switch arms, empty state, and the
 * viewer open/close cycle (CLEAR_MY_POLICY_DOC dispatch).
 *
 * DEAD-CODE note (for the dead-code list): handleChange, handleChange1, handleChange2,
 * handleDownloadAll and downloadBase64File (~90 lines incl. the JSZip flow) are not
 * referenced by any rendered element — the whole filter/download-all UI is commented
 * out in the JSX. Those lines are unreachable from the UI.
 * ADDITIVE ONLY. Menu: Policies → Download (route: policies_download).
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => mockDispatch,
}));

jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader:  ({ children }) => <div>{children}</div>,
    Content:          ({ children }) => <div>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
    Row:              ({ children }) => <div>{children}</div>,
    Col:              ({ children }) => <div>{children}</div>,
}));

jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('react-multi-select-component', () => () => <div data-testid="multiselect" />);
jest.mock('jszip', () => jest.fn());

jest.mock('../../components/PoliciesDocument/PoliciesDocumentViewer', () => (props) => (
    <div data-testid="policies-viewer">
        viewer-open-index-{String(props.index)}-id-{String(props.id)}
        <button data-testid="viewer-close" onClick={props.closeModal}>close</button>
    </div>
));
jest.mock('../../components/PoliciesDocument/PoliciesDocumentModal', () => () => <div />);

jest.mock('react-bootstrap', () => {
    const React = require('react');
    const Accordion = ({ children }) => <div>{children}</div>;
    Accordion.Toggle = ({ children }) => <div>{children}</div>;
    Accordion.Collapse = ({ children }) => <div>{children}</div>;
    const Card = ({ children }) => <div>{children}</div>;
    Card.Body = ({ children }) => <div>{children}</div>;
    return {
        Table:  ({ children }) => <table>{children}</table>,
        Accordion,
        Card,
        Button: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
    };
});

jest.mock('../../services/API', () => ({ call: jest.fn() }));
jest.mock('../../services/Formatter', () => ({
    alert_error: jest.fn(() => ({ type: 'STUB_ALERT_ERROR' })),
    array_to_getvalue: jest.fn((l) => l),
}));
jest.mock('../../components/PoliciesDocument/PoliciesDocumentApi.js', () => ({
    fecthUserContry:     jest.fn((...a) => ({ type: 'STUB_FETCH_COUNTRY', a })),
    fecthUserDepartment: jest.fn((...a) => ({ type: 'STUB_FETCH_DEPARTMENT', a })),
}));

import API from '../../services/API';
import Formatter from '../../services/Formatter';

const PoliciesDocumentDownload = require('../../components/PoliciesDocument/PoliciesDocumentDownload').default;

// grouped docs: one item per FileExtension switch arm (+ default) across two groups
const groupedDocs = {
    'HR Policies': [
        { Id: 1, Title: 'Handbook',   FileExtension: 'pdf',  countryname: 'Global',      FileData: 'data:1', FileName: 'handbook.pdf' },
        { Id: 2, Title: 'Org Chart',  FileExtension: 'xlsx', countryname: 'Philippines', FileData: 'data:2', FileName: 'org.xlsx' },
        { Id: 3, Title: 'Leave CSV',  FileExtension: 'csv',  countryname: 'India',       FileData: 'data:3', FileName: 'leave.csv' },
        { Id: 4, Title: 'Memo',       FileExtension: 'docx', countryname: 'Global',      FileData: 'data:4', FileName: 'memo.docx' },
    ],
    'IT Policies': [
        { Id: 5, Title: 'Badge PNG',  FileExtension: 'png',  countryname: 'Global', FileData: 'data:5', FileName: 'badge.png' },
        { Id: 6, Title: 'Selfie JPG', FileExtension: 'jpg',  countryname: 'Global', FileData: 'data:6', FileName: 's.jpg' },
        { Id: 7, Title: 'Scan JPEG',  FileExtension: 'jpeg', countryname: 'Global', FileData: 'data:7', FileName: 'scan.jpeg' },
        { Id: 8, Title: 'Unknown',    FileExtension: 'zip',  countryname: 'Global', FileData: 'data:8', FileName: 'x.zip' },
    ],
};

const baseProps = {
    user: { id: 1, country_id: 4 },
    usercountry: {},
    userdepartment: [{ Id: 33, DepartmentName: 'Engineering' }],
    policiesdocument: groupedDocs,
};

function renderDownload(props = {}) {
    return render(
        <MemoryRouter>
            <PoliciesDocumentDownload {...baseProps} {...props} />
        </MemoryRouter>
    );
}

beforeEach(() => {
    jest.clearAllMocks();
    API.call.mockImplementation(() => Promise.resolve({ data: { docs: [] } }));
});

describe('PoliciesDocumentDownload — mount fetch', () => {
    test('mount GETs /show with the default filter and dispatches the doc list', async () => {
        const utils = renderDownload();
        await utils.findByText('Handbook');

        expect(API.call).toHaveBeenCalledTimes(1);
        const req = API.call.mock.calls[0][0];
        expect(req.url).toBe('/show');
        expect(req.params.GlobalType).toBe(1);
        expect(req.params.CountryId).toBe(4); // user.country_id
        expect(mockDispatch).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'FETCH_MY_POLICIES_DOC' })
        );
    });

    test('fetch failure dispatches alert_error', async () => {
        API.call.mockImplementation(() => Promise.reject(new Error('HTTP 500')));
        const utils = renderDownload();
        await utils.findByText('Handbook'); // static render unaffected
        expect(Formatter.alert_error).toHaveBeenCalled();
    });
});

describe('PoliciesDocumentDownload — grouped list render', () => {
    test('group headers, rows, country column and every extension icon arm render', () => {
        const { getByText, container } = renderDownload();

        getByText('HR Policies');
        getByText('IT Policies');
        getByText('Handbook');
        getByText('Philippines');

        const icons = Array.from(container.querySelectorAll('img.back-img')).map((i) => i.getAttribute('src'));
        expect(icons.filter((s) => s === '/images/pdf.png').length).toBe(1);
        expect(icons.filter((s) => s === '/images/excel.png').length).toBe(2); // csv + xlsx
        expect(icons.filter((s) => s === '/images/doc.png').length).toBe(1);
        expect(icons.filter((s) => s === '/images/img.png').length).toBe(3);   // png+jpg+jpeg
        expect(icons.filter((s) => s === '').length).toBe(1);                  // default arm (zip)
    });

    test('empty document set renders the No Document Found arm', () => {
        const { getByText } = renderDownload({ policiesdocument: {} });
        getByText('No Document Found');
    });
});

describe('PoliciesDocumentDownload — viewer open/close', () => {
    test('eye button opens the viewer at that index/id; close dispatches CLEAR_MY_POLICY_DOC', () => {
        const { container, getByTestId, queryByTestId } = renderDownload();

        expect(queryByTestId('policies-viewer')).toBeNull();
        fireEvent.click(container.querySelectorAll('.download-btn')[1]); // Org Chart (index 1, Id 2)

        getByTestId('policies-viewer');
        expect(getByTestId('policies-viewer').textContent).toContain('index-1-id-2');

        fireEvent.click(getByTestId('viewer-close'));
        expect(queryByTestId('policies-viewer')).toBeNull();
        expect(mockDispatch).toHaveBeenCalledWith({ type: 'CLEAR_MY_POLICY_DOC' });
    });
});
