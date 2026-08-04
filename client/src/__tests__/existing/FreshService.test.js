// DRAFT — generated 2026-06-16, needs verification
/**
 * EVOX FreshService / EV Assist — Jest Component Tests
 *
 * Covers two components:
 *   FreshServiceForm    — Create Ticket page (src/components/FreshService/FreshServiceForm.js)
 *   FreshServiceTickets — My Tickets list + detail (src/components/FreshService/FreshServiceTickets.js)
 *
 * Both components are class-less functional components connected via react-redux connect().
 * connect() is mocked so the raw component receives props directly.
 *
 * Key Redux state consumed:
 *   state.freshService.workspaces        — array of { Id, Name }
 *   state.freshService.categories        — keyed by workspace ID
 *   state.freshService.sub_categories    — keyed by category ID
 *   state.freshService.isInstanceLoaded  — boolean; false = loading spinner
 *   state.user                           — user object
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

// ─── Core mocks ──────────────────────────────────────────────────────────────

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect:     () => (Component) => Component,
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

// TinyMCE Editor is a heavy external dependency — mock with a simple textarea
jest.mock('@tinymce/tinymce-react', () => ({
    Editor: ({ textareaName, onEditorChange }) => (
        <textarea
            name={textareaName || 'content'}
            onChange={(e) => onEditorChange && onEditorChange(e.target.value)}
            data-testid="tinymce-editor"
        />
    ),
}));

// API service used by both components for Curl calls
jest.mock('../../services/API', () => ({
    call: jest.fn(() => Promise.resolve({ data: [] })),
}));

// Formatter used for alert_error dispatch helper
jest.mock('../../services/Formatter', () => ({
    alert_error: jest.fn(() => ({ type: 'ALERT_ERROR' })),
}));

// fetchWorkSpaces Redux thunk — called on mount by both components
jest.mock('../../store/actions/freshservice/freshServiceActions', () => ({
    fetchWorkSpaces: jest.fn(() => ({ type: 'FETCH_WORKSPACES_REQUEST' })),
}));

// Helper used by FreshServiceForm for image uploads
jest.mock('../../services/Helper', () => ({
    handleImageUpload: jest.fn(),
}));

// ─── Component imports ────────────────────────────────────────────────────────

let FreshServiceForm;
try {
    const m = require('../../components/FreshService/FreshServiceForm');
    FreshServiceForm = m.FreshServiceForm || m.default;
} catch (e) {
    FreshServiceForm = require('../../components/FreshService/FreshServiceForm').default;
}

let FreshServiceTickets;
try {
    const m = require('../../components/FreshService/FreshServiceTickets');
    FreshServiceTickets = m.FreshServiceTickets || m.default;
} catch (e) {
    FreshServiceTickets = require('../../components/FreshService/FreshServiceTickets').default;
}

// ─── Shared default props ─────────────────────────────────────────────────────

const baseUser = {
    id:              1,
    full_name:       'Test Employee',
    first_name:      'Test',
    last_name:       'Employee',
    email:           'test.employee@eastvantage.com',
    department_main: 'Engineering',
    emp_num:         'EV-001',
    country:         'Philippines',
    pov_timezone:    'Asia/Manila',
};

const defaultFormProps = {
    user:            baseUser,
    dispatch:        jest.fn(),
    history:         { push: jest.fn() },
    match:           { params: {} },
    location:        { search: '' },
    // freshService Redux slice props (from mapStateToProps)
    workspaces:      [],
    categories:      {},
    sub_categories:  {},
    workspacesLoaded: false,
    settings:        {},
};

const defaultTicketsProps = {
    user:            baseUser,
    dispatch:        jest.fn(),
    history:         { push: jest.fn() },
    match:           { params: {} },
    location:        { search: '' },
    // freshService Redux slice props
    workspaces:      [],
    workspacesLoaded: false,
    settings:        {},
};

// ─── Render helpers ───────────────────────────────────────────────────────────

function renderForm(props = {}) {
    return render(
        <MemoryRouter>
            <FreshServiceForm {...defaultFormProps} {...props} />
        </MemoryRouter>
    );
}

function renderTickets(props = {}) {
    return render(
        <MemoryRouter>
            <FreshServiceTickets {...defaultTicketsProps} {...props} />
        </MemoryRouter>
    );
}

// =============================================================================
// FreshServiceForm — Create Ticket
// =============================================================================

describe('FreshServiceForm (Create Ticket)', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderForm()).not.toThrow();
    });

    test('shows loading spinner when workspacesLoaded is false', () => {
        const { getByText } = renderForm({ workspacesLoaded: false });
        expect(getByText(/Loading workspace categories/i)).toBeInTheDocument();
    });

    test('does not render create form when workspacesLoaded is false', () => {
        const { queryByText } = renderForm({ workspacesLoaded: false });
        // "Brief description" placeholder only appears in the Create Ticket form
        expect(queryByText(/Brief description/i)).not.toBeInTheDocument();
    });

    test('renders create ticket form when workspacesLoaded is true and workspaces exist', () => {
        const { queryByText } = renderForm({
            workspacesLoaded: true,
            workspaces: [{ Id: 1, Name: 'IT Support' }],
        });
        // Spinner should NOT be visible once loaded
        expect(queryByText(/Loading workspace categories/i)).not.toBeInTheDocument();
    });

    test('does not crash when workspaces array is empty and loaded', () => {
        expect(() => renderForm({ workspacesLoaded: true, workspaces: [] })).not.toThrow();
    });

    test('does not crash during loading state', () => {
        expect(() => renderForm({ workspacesLoaded: false })).not.toThrow();
    });

    test('does not crash with populated workspaces list', () => {
        expect(() => renderForm({
            workspacesLoaded: true,
            workspaces: [
                { Id: 1, Name: 'IT Support' },
                { Id: 2, Name: 'HR' },
                { Id: 3, Name: 'Finance' },
            ],
            categories:     { 1: [{ Id: 10, CategoryName: 'Software' }] },
            sub_categories: { 10: [{ Id: 100, SubCategoryName: 'Laptop Issue' }] },
        })).not.toThrow();
    });

    test('does not crash with empty props override', () => {
        expect(() => renderForm({ workspaces: [] })).not.toThrow();
    });
});

// =============================================================================
// FreshServiceTickets — My Tickets List
// =============================================================================

describe('FreshServiceTickets (My Tickets List)', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderTickets()).not.toThrow();
    });

    test('shows loading spinner when workspacesLoaded is false', () => {
        const { getByText } = renderTickets({ workspacesLoaded: false });
        expect(getByText(/Loading workspace categories/i)).toBeInTheDocument();
    });

    test('does not show spinner when workspacesLoaded is true', () => {
        const { queryByText } = renderTickets({ workspacesLoaded: true, workspaces: [] });
        expect(queryByText(/Loading workspace categories/i)).not.toBeInTheDocument();
    });

    test('renders EV Department filter when workspacesLoaded is true', () => {
        const { container } = renderTickets({
            workspacesLoaded: true,
            workspaces: [{ Id: 1, Name: 'IT Support' }],
        });
        // .form-select is the department filter dropdown
        const selects = container.querySelectorAll('.form-select');
        expect(selects.length).toBeGreaterThanOrEqual(1);
    });

    test('renders Status filter dropdown when workspacesLoaded is true', () => {
        const { container } = renderTickets({
            workspacesLoaded: true,
            workspaces: [{ Id: 1, Name: 'IT Support' }],
        });
        const selects = container.querySelectorAll('.form-select');
        // Expect at least two: department + status
        expect(selects.length).toBeGreaterThanOrEqual(2);
    });

    test('does not crash during loading state', () => {
        expect(() => renderTickets({ workspacesLoaded: false })).not.toThrow();
    });

    test('does not crash with empty workspaces and loaded=true', () => {
        expect(() => renderTickets({ workspacesLoaded: true, workspaces: [] })).not.toThrow();
    });

    test('does not crash with populated workspaces', () => {
        expect(() => renderTickets({
            workspacesLoaded: true,
            workspaces: [
                { Id: 1, Name: 'IT Support' },
                { Id: 2, Name: 'HR' },
            ],
        })).not.toThrow();
    });

    test('professional-table is not rendered when no workspace is selected (empty ticket list)', () => {
        const { container } = renderTickets({
            workspacesLoaded: true,
            workspaces: [{ Id: 1, Name: 'IT Support' }],
        });
        // No workspace selected → no API call → no table
        const table = container.querySelector('.professional-table');
        expect(table).toBeNull();
    });
});
