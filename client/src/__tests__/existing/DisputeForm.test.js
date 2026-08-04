// DRAFT — generated 2026-07-08, needs verification
/**
 * PayrollDispute/DisputeForm — create/edit a payroll dispute. Without a
 * params.id it renders the "Create Dispute" form and fetches the user's dispute
 * context on mount. Data-layer and heavy deps stubbed; API returns
 * never-resolving promises so no post-unmount state updates fire.
 * Source: src/components/PayrollDispute/DisputeForm.js
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

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useParams: () => ({}),
    useHistory: () => ({ push: jest.fn() }),
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

jest.mock('../../services/API', () => ({
    __esModule: true,
    default: {
        call: jest.fn(() => new Promise(() => {})),
        get: jest.fn(() => new Promise(() => {})),
        post: jest.fn(() => new Promise(() => {})),
    },
}));
jest.mock('axios', () => ({ __esModule: true, default: { get: jest.fn(() => new Promise(() => {})), post: jest.fn(() => new Promise(() => {})) } }));
jest.mock('../../services/Authenticator', () => ({
    __esModule: true,
    default: { scanLevel: jest.fn(() => true), scanLevel_Feature: jest.fn(() => true) },
}));
jest.mock('../../services/Formatter', () => ({
    __esModule: true,
    default: {
        title_to_slug: jest.fn((s) => String(s || '')),
        alert_error: jest.fn(() => ({ type: 'ERR' })),
        alert_error_message: jest.fn(() => ({ type: 'ERR_MSG' })),
    },
}));

import DisputeForm from '../../components/PayrollDispute/DisputeForm';

function renderComponent(props = {}) {
    return render(
        <MemoryRouter>
            <DisputeForm
                params={{}}
                userLists={[]}
                user={{ id: 1, full_name: 'Jane Doe' }}
                payroll={null}
                dispute_record={{}}
                {...props}
            />
        </MemoryRouter>
    );
}

describe('DisputeForm component', () => {
    test('renders without crashing in create mode', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    test('renders the Create Dispute heading when there is no dispute id', () => {
        const { getByText } = renderComponent();
        expect(getByText(/Create Dispute/i)).toBeInTheDocument();
    });

    test('renders the dispute form', () => {
        const { container } = renderComponent();
        expect(container.querySelector('form')).toBeInTheDocument();
    });
});
