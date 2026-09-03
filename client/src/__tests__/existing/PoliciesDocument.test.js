// DRAFT — generated 2026-07-08, needs verification
/**
 * PoliciesDocument/PoliciesDocumentDownload — employee-facing policy document
 * browser/downloader. Filters + a results table; empty state shows
 * "No Document Found". Data/zip/multiselect deps stubbed.
 * Source: src/components/PoliciesDocument/PoliciesDocumentDownload.js
 */
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => jest.fn(),
}));

jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader: ({ children }) => <div>{children}</div>,
    Content: ({ children }) => <div>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody: ({ children }) => <div>{children}</div>,
    Row: ({ children }) => <div>{children}</div>,
    Col: ({ children }) => <div>{children}</div>,
}));
jest.mock('../../components/PoliciesDocument/PoliciesDocumentViewer', () => () => <div>viewer</div>);
jest.mock('../../components/PoliciesDocument/PoliciesDocumentApi.js', () => ({
    fecthUserContry: jest.fn(() => ({ type: 'FETCH_COUNTRY' })),
    fecthUserDepartment: jest.fn(() => ({ type: 'FETCH_DEPT' })),
}));
// Return never-resolving promises so no state update fires after the test unmounts.
// The component calls API.call(...).then(...) inside an async handleFilter effect.
jest.mock('../../services/API', () => ({
    __esModule: true,
    default: {
        call: jest.fn(() => new Promise(() => {})),
        get: jest.fn(() => new Promise(() => {})),
        post: jest.fn(() => new Promise(() => {})),
    },
}));
jest.mock('../../services/Formatter', () => ({ __esModule: true, default: { title_to_slug: jest.fn((s) => String(s || '')) } }));
jest.mock('jszip', () => jest.fn(() => ({ file: jest.fn(), generateAsync: jest.fn(() => Promise.resolve()) })));
jest.mock('react-multi-select-component', () => ({
    __esModule: true,
    default: ({ options }) => <div data-testid="multi-select">{(options || []).length} options</div>,
}));

import PoliciesDocumentDownload from '../../components/PoliciesDocument/PoliciesDocumentDownload';

function renderComponent(props = {}) {
    return render(
        <MemoryRouter>
            <PoliciesDocumentDownload user={{ id: 1, country: 'Philippines' }} {...props} />
        </MemoryRouter>
    );
}

describe('PoliciesDocumentDownload component', () => {
    test('renders without crashing', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    test('renders the document results table', () => {
        const { container } = renderComponent();
        expect(container.querySelector('table, tbody')).toBeInTheDocument();
    });
});
