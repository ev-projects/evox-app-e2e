/**
 * evoxtest_PoliciesUploadDeep2.test.js
 * Wave-1 interaction coverage for components/PoliciesDocument/PoliciesDocumentUpload.js
 * (29 Jul baseline: 104 uncovered lines). Arms: file picking (valid / invalid-extension /
 * duplicate filtering), remove-file, Global↔Geo radio (country enable + refetch),
 * country select, title, and every handleUpload validation branch + submit success/failure.
 * ADDITIVE ONLY. Menu: Policies → Upload (route: policies_upload).
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

jest.mock('../../services/API', () => ({ call: jest.fn() }));
jest.mock('../../services/Formatter', () => ({
    alert_success: jest.fn(() => ({ type: 'STUB_ALERT_SUCCESS' })),
    alert_error:   jest.fn(() => ({ type: 'STUB_ALERT_ERROR' })),
}));
jest.mock('../../components/PoliciesDocument/PoliciesDocumentApi.js', () => ({
    fecthUserContry:    jest.fn((...a) => ({ type: 'STUB_FETCH_COUNTRY', a })),
    fecthUserDepartment: jest.fn((...a) => ({ type: 'STUB_FETCH_DEPARTMENT', a })),
}));

import API from '../../services/API';
import Formatter from '../../services/Formatter';
import { fecthUserDepartment } from '../../components/PoliciesDocument/PoliciesDocumentApi.js';

const PoliciesDocumentUpload = require('../../components/PoliciesDocument/PoliciesDocumentUpload').default;

const baseProps = {
    user: { id: 1, department: 'Engineering' },
    usercountry: {},
    userdepartment: [{ Id: 33, DepartmentName: 'Engineering' }],
    countries: [
        { country_id: 1, country_name: 'Philippines' },
        { country_id: 2, country_name: 'India' },
    ],
};

function renderUpload(props = {}) {
    return render(
        <MemoryRouter>
            <PoliciesDocumentUpload {...baseProps} {...props} />
        </MemoryRouter>
    );
}

function pickFiles(container, fileList) {
    fireEvent.change(container.querySelector('input[name="FileData"]'), { target: { files: fileList } });
}

const pdf = (name) => new File(['%PDF dummy content'], name, { type: 'application/pdf' });

beforeEach(() => {
    jest.clearAllMocks();
    API.call.mockImplementation(() => Promise.resolve({ data: { message: 'ok' } }));
});

describe('PoliciesDocumentUpload — file picking', () => {
    test('valid files list with numbering; duplicates filtered; invalid extensions split out', () => {
        const { container, getByText, queryByText } = renderUpload();

        pickFiles(container, [pdf('handbook.pdf'), new File(['x'], 'virus.exe')]);
        getByText('handbook.pdf');
        getByText('Invalid Format List');
        getByText('virus.exe');

        // duplicate (same name+size) is filtered; a new file appends
        pickFiles(container, [pdf('handbook.pdf'), pdf('policy2.pdf')]);
        expect(container.querySelectorAll('.rendertd').length).toBe(2);
        getByText('policy2.pdf');
    });

    test('remove button drops the file from the list', () => {
        const { container, queryByText } = renderUpload();
        pickFiles(container, [pdf('handbook.pdf')]);
        fireEvent.click(container.querySelector('.removebtn'));
        expect(queryByText('handbook.pdf')).toBeNull();
    });
});

describe('PoliciesDocumentUpload — Global/Geo radio and country cascade', () => {
    test('Geo enables the country select; Global disables it and refetches departments', () => {
        const { container } = renderUpload();
        const countrySelect = container.querySelector('select[name="CountryId"]');
        expect(countrySelect.disabled).toBe(true);

        fireEvent.click(container.querySelector('input[value="Geo"]'));
        expect(container.querySelector('select[name="CountryId"]').disabled).toBe(false);

        fireEvent.click(container.querySelector('input[value="Global"]'));
        expect(container.querySelector('select[name="CountryId"]').disabled).toBe(true);
        expect(fecthUserDepartment).toHaveBeenCalledWith(1, 0, 0);
    });

    test('choosing a country clears the country error and fetches its departments', () => {
        const { container } = renderUpload();
        fireEvent.click(container.querySelector('input[value="Geo"]'));
        fireEvent.change(container.querySelector('select[name="CountryId"]'), { target: { value: '2' } });
        expect(fecthUserDepartment).toHaveBeenCalledWith(0, '2', 0);
    });
});

describe('PoliciesDocumentUpload — handleUpload validation arms', () => {
    test('oversized file blocks the upload with the 10MB message', () => {
        const { container, getByText } = renderUpload();
        const big = pdf('big.pdf');
        Object.defineProperty(big, 'size', { value: 11 * 1024 * 1024 });
        pickFiles(container, [big]);

        fireEvent.click(getByText('Upload'));
        getByText('File size too big. Max of 10MB only.');
        expect(API.call).not.toHaveBeenCalled();
    });

    test('no files + Geo without country → both validators render', () => {
        const { container, getByText } = renderUpload();
        fireEvent.click(container.querySelector('input[value="Geo"]'));
        fireEvent.click(getByText('Upload'));
        getByText(/Please choose a valid file/);
        getByText('Please Select Country');
        expect(API.call).not.toHaveBeenCalled();
    });

    test('no files (Global) → file validator only', () => {
        const { getByText, queryByText } = renderUpload();
        fireEvent.click(getByText('Upload'));
        getByText(/Please choose a valid file/);
        expect(queryByText('Please Select Country')).toBeNull();
    });

    test('files but Geo without country → country validator only', () => {
        const { container, getByText, queryByText } = renderUpload();
        pickFiles(container, [pdf('handbook.pdf')]);
        fireEvent.click(container.querySelector('input[value="Geo"]'));
        fireEvent.click(getByText('Upload'));
        getByText('Please Select Country');
        expect(queryByText(/Please choose a valid file/)).toBeNull();
        expect(API.call).not.toHaveBeenCalled();
    });

    test('FINDING POL-UP-1: title-required validation NEVER fires (form.title shadows the input)', () => {
        // handleUpload checks `e.target.title.value === ''` — but on an HTMLFormElement,
        // `.title` resolves to the element's global title ATTRIBUTE (always ''), never the
        // input named "title". ''.value is undefined, undefined === '' is false → the
        // validation arm is unreachable and EMPTY-TITLE UPLOADS GO STRAIGHT THROUGH.
        // Fix: e.target.elements.title.value (or use formData.title state, already tracked).
        // Flip this test to expect the validator + no API call once fixed.
        const { container, getByText, queryByText } = renderUpload();
        pickFiles(container, [pdf('handbook.pdf')]);
        fireEvent.click(getByText('Upload'));

        expect(queryByText(/Please provide a proper title/)).toBeNull(); // validator never renders
        expect(API.call).toHaveBeenCalledTimes(1);                       // upload proceeds
        expect(API.call.mock.calls[0][0].data.get('title')).toBe('');    // empty title sent to backend
    });
});

describe('PoliciesDocumentUpload — submit paths', () => {
    function fillValid(container) {
        pickFiles(container, [pdf('handbook.pdf')]);
        fireEvent.change(container.querySelector('input[name="title"]'), { target: { value: 'Employee Handbook v3' } });
    }

    test('valid Global upload POSTs FormData, alerts success and resets the file list', async () => {
        const utils = renderUpload();
        fillValid(utils.container);
        fireEvent.click(utils.getByText('Upload'));

        await utils.findByText('Upload'); // flush promise chain
        expect(API.call).toHaveBeenCalledTimes(1);
        const req = API.call.mock.calls[0][0];
        expect(req.url).toBe('/uploadfiles');
        expect(req.method).toBe('post');
        expect(req.data.get('GlobalType')).toBe('1');       // Global → 1
        expect(req.data.get('selectedDepartments')).toBe('33');
        expect(req.data.get('title')).toBe('Employee Handbook v3');
        expect(Formatter.alert_success).toHaveBeenCalled();
        expect(utils.queryByText('handbook.pdf')).toBeNull(); // list reset
    });

    test('Geo upload with a country sends GlobalType 0 and the CountryId', async () => {
        const utils = renderUpload();
        fireEvent.click(utils.container.querySelector('input[value="Geo"]'));
        fireEvent.change(utils.container.querySelector('select[name="CountryId"]'), { target: { value: '1' } });
        fillValid(utils.container);
        fireEvent.click(utils.getByText('Upload'));

        await utils.findByText('Upload');
        const req = API.call.mock.calls[0][0];
        expect(req.data.get('GlobalType')).toBe('0');       // Geo → 0
        expect(req.data.get('CountryId')).toBe('1');
    });

    test('upload API failure dispatches alert_error and keeps the list', async () => {
        API.call.mockImplementation(() => Promise.reject(new Error('HTTP 500')));
        const utils = renderUpload();
        fillValid(utils.container);
        fireEvent.click(utils.getByText('Upload'));

        await utils.findByText('handbook.pdf'); // list NOT reset
        expect(Formatter.alert_error).toHaveBeenCalled();
    });
});
