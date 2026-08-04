/**
 * evoxtest_UploadedDocumentListDeep2.test.js
 * Wave-1 interaction coverage for components/PoliciesDocument/UploadedDocumentList.js
 * (part of the 215-unc PoliciesDocument cluster). Arms: mount /showlist fetch
 * (success + failure), extension icon switch, Status badge arms, activate/deactivate
 * toggle (both directions incl. failure), empty state.
 * ADDITIVE ONLY. Menu: Policies → Manage Accessibility (route: policies_document_list).
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
jest.mock('jszip', () => jest.fn());
jest.mock('../../components/PoliciesDocument/PoliciesDocumentViewer', () => () => <div />);

jest.mock('react-bootstrap', () => ({
    Table: ({ children }) => <table>{children}</table>,
    Badge: ({ children }) => <span>{children}</span>,
}));

jest.mock('../../services/API', () => ({ call: jest.fn() }));
jest.mock('../../services/Formatter', () => ({
    alert_error: jest.fn(() => ({ type: 'STUB_ALERT_ERROR' })),
}));
jest.mock('../../components/PoliciesDocument/PoliciesDocumentApi.js', () => ({
    fecthUserDepartment: jest.fn((...a) => ({ type: 'STUB_FETCH_DEPARTMENT', a })),
}));

import API from '../../services/API';
import Formatter from '../../services/Formatter';

const UploadedDocumentList = require('../../components/PoliciesDocument/UploadedDocumentList').default;

const docs = [
    { Id: 1, Title: 'Handbook', FileExtension: 'pdf',  countryname: 'Global', Name: 'Engineering', IsActive: '1' },
    { Id: 2, Title: 'Old Memo', FileExtension: 'docx', countryname: 'India',  Name: 'HR',          IsActive: '0' },
    { Id: 3, Title: 'Weird',    FileExtension: 'zip',  countryname: 'Global', Name: 'IT',          IsActive: '1' },
];

const baseProps = {
    user: { id: 1, country_id: 4 },
    usercountry: {},
    userdepartment: [],
    policiesdocument: docs,
};

function renderList(props = {}) {
    return render(
        <MemoryRouter>
            <UploadedDocumentList {...baseProps} {...props} />
        </MemoryRouter>
    );
}

beforeEach(() => {
    jest.clearAllMocks();
    API.call.mockImplementation(() => Promise.resolve({ data: { docs: [] } }));
});

describe('UploadedDocumentList — mount fetch and render', () => {
    test('mount GETs /showlist with the default filter and dispatches the list', async () => {
        const utils = renderList();
        await utils.findByText('Handbook');

        const req = API.call.mock.calls[0][0];
        expect(req.url).toBe('/showlist');
        expect(req.method).toBe('get');
        expect(req.params.CountryId).toBe(4);
        expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'FETCH_MY_POLICIES_DOC' }));
    });

    test('mount fetch failure dispatches alert_error', async () => {
        API.call.mockImplementation(() => Promise.reject(new Error('HTTP 500')));
        const utils = renderList();
        await utils.findByText('Handbook');
        expect(Formatter.alert_error).toHaveBeenCalled();
    });

    test('rows render status badges, action labels and icon arms incl. default', () => {
        const { getByText, getAllByText, container } = renderList();

        expect(getAllByText('Active').length).toBe(2);
        getByText('Inactive');
        expect(getAllByText('Click to deactivate').length).toBe(2); // IsActive '1'
        getByText('Click to activate');                              // IsActive '0'

        const icons = Array.from(container.querySelectorAll('img.back-img')).map((i) => i.getAttribute('src'));
        expect(icons).toContain('/images/pdf.png');
        expect(icons).toContain('/images/doc.png');
        expect(icons).toContain(''); // default arm
    });

    test('empty list renders No Document Found', () => {
        const { getByText } = renderList({ policiesdocument: [] });
        getByText('No Document Found');
    });
});

describe('UploadedDocumentList — status toggle', () => {
    test('deactivating an active doc PUTs status 0 and refreshes the list', async () => {
        const utils = renderList();
        fireEvent.click(utils.getAllByText('Click to deactivate')[0]); // doc Id 1, IsActive '1'

        await utils.findByText('Handbook');
        const put = API.call.mock.calls.find((c) => (c[0].url || '').startsWith('/updatestatus/'));
        expect(put[0].url).toBe('/updatestatus/1/0');
        expect(put[0].method).toBe('put');
    });

    test('activating an inactive doc PUTs status 1', async () => {
        const utils = renderList();
        fireEvent.click(utils.getByText('Click to activate')); // doc Id 2, IsActive '0'

        await utils.findByText('Handbook');
        const put = API.call.mock.calls.find((c) => (c[0].url || '').startsWith('/updatestatus/'));
        expect(put[0].url).toBe('/updatestatus/2/1');
    });

    test('status update failure dispatches alert_error', async () => {
        const utils = renderList();
        API.call.mockImplementation((req) =>
            (req.url || '').startsWith('/updatestatus/') ? Promise.reject(new Error('HTTP 500')) : Promise.resolve({ data: {} })
        );
        fireEvent.click(utils.getByText('Click to activate'));
        await utils.findByText('Handbook');
        expect(Formatter.alert_error).toHaveBeenCalled();
    });
});
