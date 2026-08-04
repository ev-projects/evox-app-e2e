/**
 * evoxtest_PoliciesViewerDeep2.test.js
 * Wave-1 coverage for components/PoliciesDocument/PoliciesDocumentViewer.js
 * (159 lines, ~6% covered — the modal the Download page opens). Arms: mount fetch of
 * the selected policy doc, closed-guard, loading card, iframe arm (pdf/png/jpg/jpeg),
 * ReactFileViewer arm (docx/xlsx), download button (downloadBase64File DOM flow).
 * DEAD-CODE note: handleDownloadAll (JSZip flow) has no rendered trigger — unreachable.
 * ADDITIVE ONLY.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => mockDispatch,
}));

jest.mock('jszip', () => jest.fn());
jest.mock('react-file-viewer', () => (props) => (
    <div data-testid="react-file-viewer">viewer-{props.fileType}</div>
));
jest.mock('../../container/PageLoadingCard.js/PageLoadingCard.js', () => () => (
    <div data-testid="page-loading-card">loading</div>
));
jest.mock('../../components/PoliciesDocument/PoliciesDocumentApi.js', () => ({
    fetchPolicyDocument: jest.fn((id) => ({ type: 'STUB_FETCH_POLICY_DOC', id })),
}));

jest.mock('react-bootstrap/Modal', () => {
    const React = require('react');
    const Modal = ({ children, show }) => (show ? <div data-testid="modal">{children}</div> : null);
    Modal.Header = ({ children }) => <div>{children}</div>;
    Modal.Title = ({ children }) => <div>{children}</div>;
    Modal.Body = ({ children }) => <div>{children}</div>;
    return Modal;
});
jest.mock('react-bootstrap', () => ({
    Row: ({ children }) => <div>{children}</div>,
    Form: ({ children }) => <div>{children}</div>,
    Button: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
    Col: ({ children }) => <div>{children}</div>,
    Collapse: ({ children }) => <div>{children}</div>,
    Container: ({ children }) => <div>{children}</div>,
    Overlay: ({ children }) => <div>{children}</div>,
    Popover: ({ children }) => <div>{children}</div>,
    Table: ({ children }) => <table>{children}</table>,
}));

import { fetchPolicyDocument } from '../../components/PoliciesDocument/PoliciesDocumentApi.js';

const PoliciesDocumentViewer = require('../../components/PoliciesDocument/PoliciesDocumentViewer').default;

const docs = [{ Id: 1 }, { Id: 2 }];

function renderViewer(props = {}) {
    return render(
        <PoliciesDocumentViewer
            isOpen={true}
            closeModal={jest.fn()}
            policiesdocument={docs}
            index={0}
            id={2}
            {...props}
        />
    );
}

beforeEach(() => jest.clearAllMocks());

describe('PoliciesDocumentViewer', () => {
    test('closed viewer renders nothing (isOpen guard)', () => {
        const { container } = renderViewer({ isOpen: false });
        expect(container.firstChild).toBeNull();
    });

    test('mount dispatches fetchPolicyDocument(id); no doc yet → loading card', () => {
        const { getByTestId, getByText } = renderViewer();
        expect(fetchPolicyDocument).toHaveBeenCalledWith(2);
        getByText('View Documents');
        getByTestId('page-loading-card');
    });

    test('pdf doc renders in the iframe arm', () => {
        const { container, queryByTestId } = renderViewer({
            policydocument: { FileData: 'data:application/pdf;base64,x', FileName: 'a.pdf', FileExtension: 'pdf', FileType: 'pdf' },
        });
        expect(container.querySelector('iframe')).not.toBeNull();
        expect(queryByTestId('page-loading-card')).toBeNull();
    });

    test('image extensions also use the iframe arm', () => {
        const { container } = renderViewer({
            policydocument: { FileData: 'data:image/png;base64,x', FileName: 'a.png', FileExtension: 'png', FileType: 'png' },
        });
        expect(container.querySelector('iframe')).not.toBeNull();
    });

    test('xlsx doc renders through ReactFileViewer with the doc wrapper class', () => {
        const { getByTestId, container } = renderViewer({
            policydocument: { FileData: 'data:x', FileName: 'a.xlsx', FileExtension: 'xlsx', FileType: 'xlsx' },
        });
        expect(getByTestId('react-file-viewer').textContent).toBe('viewer-xlsx');
        expect(container.querySelector('.doc')).not.toBeNull();
    });

    test('docx doc renders through ReactFileViewer without the doc wrapper', () => {
        const { getByTestId, container } = renderViewer({
            policydocument: { FileData: 'data:x', FileName: 'a.docx', FileExtension: 'docx', FileType: 'docx' },
        });
        expect(getByTestId('react-file-viewer').textContent).toBe('viewer-docx');
        expect(container.querySelector('.doc')).toBeNull();
    });

    test('Download button triggers the anchor-click download flow', () => {
        const clicks = [];
        const origCreate = document.createElement.bind(document);
        const spy = jest.spyOn(document, 'createElement').mockImplementation((tag) => {
            const el = origCreate(tag);
            if (tag === 'a') {
                el.click = () => clicks.push({ href: el.href, download: el.download });
            }
            return el;
        });

        const { getByText } = renderViewer({
            policydocument: { FileData: 'data:application/pdf;base64,xyz', FileName: 'handbook.pdf', FileExtension: 'pdf', FileType: 'pdf' },
        });
        fireEvent.click(getByText(/Download/));

        expect(clicks.length).toBe(1);
        expect(clicks[0].download).toBe('handbook.pdf');
        expect(clicks[0].href).toContain('data:application/pdf');
        spy.mockRestore();
    });
});
