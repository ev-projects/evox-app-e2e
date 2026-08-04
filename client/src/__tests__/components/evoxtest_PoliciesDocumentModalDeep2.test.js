/**
 * evoxtest_PoliciesDocumentModalDeep2.test.js
 * Wave-6 coverage for components/PoliciesDocument/PoliciesDocumentModal.js
 * (fresh: 49 unc / 3.9% — nearly untouched). Arms: closed-modal null return,
 * per-extension icon switch (csv/xlsx/docx/pdf/png/jpg/jpeg/default), single-file
 * base64 download anchor, viewer open with the clicked row index, empty-list
 * "No Document Found" arm, and the Download-All JSZip flow (fetch→zip.file→
 * generateAsync→anchor click after the 1s settle timeout). ADDITIVE ONLY.
 * Menu: Dashboard → Policies → Download Documents modal.
 */

import React from 'react';
import { render, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => jest.fn(),
}));
jest.mock('react-bootstrap/Modal', () => {
    const React = require('react');
    const Modal = ({ show, children }) => (show ? <div data-testid="modal">{children}</div> : null);
    Modal.Header = ({ children }) => <div>{children}</div>;
    Modal.Title  = ({ children }) => <div>{children}</div>;
    Modal.Body   = ({ children }) => <div>{children}</div>;
    return Modal;
});
jest.mock('react-bootstrap', () => {
    const React = require('react');
    const pass = ({ children }) => <div>{children}</div>;
    return {
        Row: pass, Form: pass, Button: pass, Col: pass, Collapse: pass,
        Container: pass, Overlay: pass, Popover: pass,
        Table: ({ children }) => <table>{children}</table>,
    };
});
const mockZip = { file: jest.fn(), generateAsync: jest.fn(() => Promise.resolve('ZIPBLOB')) };
jest.mock('jszip', () => jest.fn(() => mockZip));
jest.mock('../../components/PoliciesDocument/PoliciesDocumentViewer', () => (props) => (
    <div data-testid="viewer" data-open={String(props.isOpen)} data-index={String(props.index)} />
));

const PoliciesDocumentModal =
    require('../../components/PoliciesDocument/PoliciesDocumentModal').default;

// One file per icon-switch arm (csv+xlsx share excel.png, png/jpg/jpeg share img.png)
const files = ['csv', 'xlsx', 'docx', 'pdf', 'png', 'jpg', 'jpeg', 'zip'].map((ext, i) => ({
    FileName: `doc${i}.${ext}`, FileExtension: ext, FileData: `data:application/x;base64,QQ==${i}`,
}));

function trackAnchorClicks() {
    const clicks = [];
    const origCreate = document.createElement.bind(document);
    const spy = jest.spyOn(document, 'createElement').mockImplementation((tag) => {
        const el = origCreate(tag);
        if (tag === 'a') el.click = () => clicks.push({ href: el.href, download: el.download });
        return el;
    });
    return { clicks, spy };
}

beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn(() => Promise.resolve({ blob: () => Promise.resolve('FILEBLOB') }));
    window.URL.createObjectURL = jest.fn(() => 'blob:policies-zip');
});

describe('PoliciesDocumentModal', () => {
    test('closed modal renders nothing', () => {
        const { container } = render(
            <PoliciesDocumentModal isOpen={false} closeModal={jest.fn()} policiesdocument={files} />
        );
        expect(container.firstChild).toBeNull();
    });

    test('renders one row per document across every icon-extension arm', () => {
        const { getByText, container } = render(
            <PoliciesDocumentModal isOpen closeModal={jest.fn()} policiesdocument={files} />
        );
        getByText('Download Documents');
        expect(container.querySelectorAll('tbody tr').length).toBe(files.length);
        files.forEach((f) => getByText(new RegExp(f.FileName)));
        // csv/xlsx → excel icon, docx → doc, pdf → pdf, png/jpg/jpeg → img, unknown → no src
        const icons = [...container.querySelectorAll('td.tdcontent img')].map((i) => i.getAttribute('src'));
        expect(icons).toEqual([
            '/images/excel.png', '/images/excel.png', '/images/doc.png', '/images/pdf.png',
            '/images/img.png', '/images/img.png', '/images/img.png', '',
        ]);
    });

    test('per-row download triggers a named anchor click with the base64 href', () => {
        const { clicks, spy } = trackAnchorClicks();
        const { container } = render(
            <PoliciesDocumentModal isOpen closeModal={jest.fn()} policiesdocument={files} />
        );
        const firstRow = container.querySelectorAll('tbody tr')[0];
        fireEvent.click(within(firstRow).getAllByRole('button')[0]);
        expect(clicks[0].download).toBe('doc0.csv');
        expect(clicks[0].href).toContain('base64');
        spy.mockRestore();
    });

    test('eye button opens the viewer at the clicked row index', () => {
        const { container, getByTestId } = render(
            <PoliciesDocumentModal isOpen closeModal={jest.fn()} policiesdocument={files} />
        );
        expect(getByTestId('viewer').getAttribute('data-open')).toBe('false');
        const thirdRow = container.querySelectorAll('tbody tr')[2];
        fireEvent.click(within(thirdRow).getAllByRole('button')[1]);
        expect(getByTestId('viewer').getAttribute('data-open')).toBe('true');
        expect(getByTestId('viewer').getAttribute('data-index')).toBe('2');
    });

    test('empty list shows the not-found arm and hides Download All', () => {
        const { getByText, queryByText } = render(
            <PoliciesDocumentModal isOpen closeModal={jest.fn()} policiesdocument={[]} />
        );
        getByText(/No Document Found/);
        expect(queryByText(/Download All as ZIP/)).toBeNull();
    });

    test('Download All fetches every file into the zip and downloads it after the settle timeout', async () => {
        jest.useFakeTimers();
        const { clicks, spy } = trackAnchorClicks();
        const { getByText } = render(
            <PoliciesDocumentModal isOpen closeModal={jest.fn()} policiesdocument={files} />
        );
        fireEvent.click(getByText(/Download All as ZIP/));

        // let the fetch→blob chains settle, then fire the 1s zip timeout
        for (let i = 0; i < 8; i++) await Promise.resolve();
        expect(global.fetch).toHaveBeenCalledTimes(files.length);
        expect(mockZip.file).toHaveBeenCalledWith('doc0.csv', 'FILEBLOB');

        jest.advanceTimersByTime(1000);
        for (let i = 0; i < 8; i++) await Promise.resolve();
        expect(mockZip.generateAsync).toHaveBeenCalledWith({ type: 'blob' });
        expect(clicks[0].download).toBe('PoliciesDocuments.zip');
        expect(clicks[0].href).toContain('blob:policies-zip');
        spy.mockRestore();
        jest.useRealTimers();
    });
});
