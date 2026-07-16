// DRAFT — generated 2026-06-16, needs verification
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import '@testing-library/jest-dom/extend-expect';

const mockStore = createStore((s = {}) => s);

// ---------------------------------------------------------------------------
// Mock react-redux connect so components render without a real Redux store
// ---------------------------------------------------------------------------
// Stable dispatch spy — these are hooks-based components that dispatch via
// useDispatch() (not the `dispatch` prop), so tests must assert on this shared spy.
// `mock`-prefixed so babel-plugin-jest-hoist permits the reference inside the factory.
const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => mockDispatch,
    useSelector: jest.fn((fn) => {
        try {
            return fn({ user: { id: 1 }, settings: {}, constant: {} });
        } catch (e) {
            return {};
        }
    }),
}));

// ---------------------------------------------------------------------------
// Mock heavy shared UI dependencies
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Import NeoOnboarding (the HR "send link" list page)
// ---------------------------------------------------------------------------
let NeoOnboarding;
try {
    const m = require('../../components/NeoReport/NeoOnboarding');
    NeoOnboarding = m.NeoOnboarding || m.default;
} catch {
    NeoOnboarding = require('../../components/NeoReport/NeoOnboarding').default;
}

// ---------------------------------------------------------------------------
// Import NeoSubmissions (the pending-submissions list page)
// ---------------------------------------------------------------------------
let NeoSubmissions;
try {
    const m = require('../../components/NeoReport/NeoSubmissions');
    NeoSubmissions = m.NeoSubmissions || m.default;
} catch {
    NeoSubmissions = require('../../components/NeoReport/NeoSubmissions').default;
}

// ---------------------------------------------------------------------------
// Import NeoDetails (the per-employee review page)
// ---------------------------------------------------------------------------
let NeoDetails;
try {
    const m = require('../../components/NeoReport/NeoDetails');
    NeoDetails = m.NeoDetails || m.default;
} catch {
    NeoDetails = require('../../components/NeoReport/NeoDetails').default;
}

// ---------------------------------------------------------------------------
// Default props derived from Redux state shape and component prop usage
// ---------------------------------------------------------------------------
const defaultUser = {
    id:           1,
    full_name:    'Test HR User',
    country:      'Philippines',
    pov_timezone: 'Asia/Manila',
};

// NeoOnboarding consumes state.neo.neo_onboarding
const defaultOnboardingProps = {
    user:              defaultUser,
    dispatch:          jest.fn(),
    history:           { push: jest.fn() },
    match:             { params: {} },
    location:          { search: '' },
    neo_onboarding:    [],
    neo_onboarding_loaded: false,
};

// NeoSubmissions consumes state.neo.neo_submissions
const defaultSubmissionsProps = {
    user:                  defaultUser,
    dispatch:              jest.fn(),
    history:               { push: jest.fn() },
    match:                 { params: {} },
    location:              { search: '' },
    neo_submissions:       [],
    neo_submissions_loaded: false,
};

// NeoDetails consumes state.neo.neo_submission_data, state.neo.neo_bhr_num, state.user
const defaultDetailsProps = {
    user:                       defaultUser,
    dispatch:                   jest.fn(),
    history:                    { push: jest.fn() },
    match:                      { params: { guid: '7655cf0e-2103-4456-8396-f67b1444a425' } },
    params:                     { guid: '7655cf0e-2103-4456-8396-f67b1444a425' },
    location:                   { search: '' },
    neo_submission_data:        [],
    neo_submission_data_loaded: false,
    neo_bhr_num:                null,
    bhr_num:                    null,
};

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------
function renderOnboarding(props = {}) {
    return render(
        <MemoryRouter>
            <NeoOnboarding {...defaultOnboardingProps} {...props} />
        </MemoryRouter>
    );
}

function renderSubmissions(props = {}) {
    return render(
        <MemoryRouter>
            <NeoSubmissions {...defaultSubmissionsProps} {...props} />
        </MemoryRouter>
    );
}

function renderDetails(props = {}) {
    return render(
        <Provider store={mockStore}>
            <MemoryRouter>
                <NeoDetails {...defaultDetailsProps} {...props} />
            </MemoryRouter>
        </Provider>
    );
}

// ===========================================================================
// NeoOnboarding — HR "Send Link" list
// ===========================================================================
describe('NeoOnboarding component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderOnboarding()).not.toThrow();
    });

    test('renders with empty neo_onboarding list', () => {
        expect(() => renderOnboarding({ neo_onboarding: [] })).not.toThrow();
    });

    test('does not crash with loaded onboarding data', () => {
        const neo_onboarding = [
            {
                userGuid:        'aaaabbbb-0000-0000-0000-000000000001',
                bhrNo:           'BHR001',
                firstName:       'Juan',
                middleName:      'dela',
                lastName:        'Cruz',
                email:           'juan@example.com',
                department:      'Engineering',
                hireDate:        '2024-01-15',
                lastInitiatedBy: null,
                lastInitiatedAt: null,
            },
        ];
        expect(() => renderOnboarding({ neo_onboarding, neo_onboarding_loaded: true })).not.toThrow();
    });

    test('does not crash when send link button is disabled (both initiatedBy and initiatedAt set)', () => {
        const neo_onboarding = [
            {
                userGuid:        'aaaabbbb-0000-0000-0000-000000000002',
                bhrNo:           'BHR002',
                firstName:       'Maria',
                middleName:      '',
                lastName:        'Santos',
                email:           'maria@example.com',
                department:      'HR',
                hireDate:        '2024-03-01',
                lastInitiatedBy: 1,
                lastInitiatedAt: '2024-03-05T10:00:00Z',
            },
        ];
        expect(() => renderOnboarding({ neo_onboarding, neo_onboarding_loaded: true })).not.toThrow();
    });

    test('does not crash during loading state', () => {
        expect(() => renderOnboarding({ neo_onboarding_loaded: false })).not.toThrow();
    });

    test('dispatches fetchNeoOnboardingUsers on mount', () => {
        const dispatch = jest.fn();
        renderOnboarding({ dispatch });
        // On mount the component calls fetchNeoOnboardingUsers(props.user.country)
        // dispatch should have been called at least once
        expect(mockDispatch).toHaveBeenCalled();
    });
});

// ===========================================================================
// NeoSubmissions — pending submissions list
// ===========================================================================
describe('NeoSubmissions component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderSubmissions()).not.toThrow();
    });

    test('renders with empty submissions list', () => {
        expect(() => renderSubmissions({ neo_submissions: [] })).not.toThrow();
    });

    test('does not crash with loaded submission rows', () => {
        const neo_submissions = [
            {
                userGuid:           'ccccdddd-0000-0000-0000-000000000003',
                bhrNo:              'BHR003',
                firstName:          'Pedro',
                lastName:           'Reyes',
                email:              'pedro@example.com',
                daysPending:        3,
                firstSubmission:    '2024-04-01T08:00:00Z',
                latestSubmission:   '2024-04-03T09:00:00Z',
                pendingFields:      5,
                resubmissionFields: 0,
                uploadedFiles:      2,
                status:             'Pending',
            },
        ];
        expect(() => renderSubmissions({ neo_submissions, neo_submissions_loaded: true })).not.toThrow();
    });

    test('does not crash during loading state', () => {
        expect(() => renderSubmissions({ neo_submissions_loaded: false })).not.toThrow();
    });

    test('dispatches fetchNeoSubmissionUsers on mount', () => {
        const dispatch = jest.fn();
        renderSubmissions({ dispatch });
        expect(mockDispatch).toHaveBeenCalled();
    });
});

// ===========================================================================
// NeoDetails — per-employee field review
// ===========================================================================
describe('NeoDetails component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderDetails()).not.toThrow();
    });

    test('does not crash with empty submission data', () => {
        expect(() => renderDetails({ neo_submission_data: [] })).not.toThrow();
    });

    test('does not crash with loaded submission fields', () => {
        const neo_submission_data = [
            {
                fieldName:      'firstName',
                fieldValue:     'Juan',
                submissionDate: '2024-04-01T08:00:00Z',
                isApproved:     false,
                isDisabled:     false,
            },
            {
                fieldName:      'lastName',
                fieldValue:     'Cruz',
                submissionDate: '2024-04-01T08:00:00Z',
                isApproved:     true,
                isDisabled:     false,
            },
        ];
        expect(() => renderDetails({
            neo_submission_data,
            neo_submission_data_loaded: true,
            bhr_num: 'BHR001',
        })).not.toThrow();
    });

    test('does not crash when a field has a UUID fieldValue (file attachment)', () => {
        const neo_submission_data = [
            {
                fieldName:      'governmentId',
                fieldValue:     '7655cf0e-2103-4456-8396-f67b1444a425',
                submissionDate: '2024-04-02T10:00:00Z',
                isApproved:     false,
                isDisabled:     false,
            },
        ];
        expect(() => renderDetails({
            neo_submission_data,
            neo_submission_data_loaded: true,
            bhr_num: 'BHR001',
        })).not.toThrow();
    });

    test('does not crash when isDisabled fields are present', () => {
        const neo_submission_data = [
            {
                fieldName:      'employeeId',
                fieldValue:     'E-12345',
                submissionDate: '2024-04-01T08:00:00Z',
                isApproved:     false,
                isDisabled:     true,
            },
        ];
        expect(() => renderDetails({
            neo_submission_data,
            neo_submission_data_loaded: true,
        })).not.toThrow();
    });

    test('does not crash with undefined bhr_num (BUG-NEO-06 dead state)', () => {
        // NeoDetails has dead state `bhrNumber` (useState(0)) that is never updated.
        // The component uses props.bhr_num instead. Passing undefined should not crash.
        expect(() => renderDetails({ bhr_num: undefined })).not.toThrow();
    });

    test('does not crash with undefined params guid (BUG-NEO-04)', () => {
        // BUG-NEO-04: component accesses props.params.guid; in React Router v5 params live
        // in props.match.params. If props.params is undefined this causes a TypeError.
        // Passing params: {} exercises the no-guid path.
        expect(() => renderDetails({
            params: {},
            match:  { params: {} },
        })).not.toThrow();
    });

    test('dispatches fetchNeoSubmissionData on mount with guid', () => {
        const dispatch = jest.fn();
        renderDetails({ dispatch });
        expect(mockDispatch).toHaveBeenCalled();
    });
});
