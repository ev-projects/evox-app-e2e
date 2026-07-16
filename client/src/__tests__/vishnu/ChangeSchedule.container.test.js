// DRAFT — generated 2026-06-16, needs verification
/**
 * EVOX Change Schedule Container Tests
 * Source: evox-app/client/src/container/Request/ChangeSchedule/ChangeSchedule.js
 * Route:  /app/request/ChangeSchedule/:id?
 *
 * Business case: Employee requests a temporary custom schedule for a date range
 * (different shift times, work days, policies). Approver can approve / decline.
 *
 * Redux state slice: state.changeSchedule
 *   - instance:         Object  — loaded ChangeSchedule record with nested schedule + user
 *   - isInstanceLoaded: Boolean — guards render; prevents form flash on load
 *
 * Key Redux props consumed by this component:
 *   instance, isInstanceLoaded, user, constant, settings.current_payroll_cutoff
 *
 * Known bugs surfaced in this module:
 *   B-008: eval() used for dynamic property access in render (XSS/perf risk)
 *   B-009: componentWillMount is deprecated (will break on React 18 upgrade)
 *   B-010: No error state for 404 — component stays on PageLoading indefinitely
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

// ─── Core mocks ──────────────────────────────────────────────────────────────

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => jest.fn(),
    useSelector: (selector) => selector({}),
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

// ─── Module-specific mocks ────────────────────────────────────────────────────

jest.mock('../../components/RequestComponent/RequestButtons/RequestButtons', () => () => <div data-testid="request-buttons" />);
jest.mock('../../components/RequestComponent/RequestButtons/RequestSubtitle', () => () => <div data-testid="request-subtitle" />);

// ScheduleHolidayPolicy, SchedulePolicy, WorkDays, ScheduledetailsWithTimezone —
// these are complex schedule sub-components; stub them to avoid deep dependency chains.
jest.mock('../../components/ScheduleComponent/ScheduleHolidayPolicy', () => () => <div data-testid="schedule-holiday-policy" />, { virtual: true });
jest.mock('../../components/ScheduleComponent/SchedulePolicy', () => () => <div data-testid="schedule-policy" />, { virtual: true });
jest.mock('../../components/ScheduleComponent/WorkDays', () => () => <div data-testid="work-days" />, { virtual: true });
jest.mock('../../components/ScheduleComponent/ScheduledetailsWithTimezone', () => () => <div data-testid="schedule-details" />, { virtual: true });

// Modal stubs — NightShiftModal and BeforeFlex are inline modals in the Content block
jest.mock('../../components/RequestComponent/Modals/NightShiftModal', () => () => <div data-testid="night-shift-modal" />, { virtual: true });
jest.mock('../../components/RequestComponent/Modals/BeforeFlex', () => () => <div data-testid="before-flex-modal" />, { virtual: true });

// PageLoading — rendered when isInstanceLoaded is false and an ID is present
jest.mock('../../components/Template/PageLoading', () => () => <div data-testid="page-loading">Loading...</div>, { virtual: true });

// ─── Component import ─────────────────────────────────────────────────────────

let ChangeScheduleComponent;
try {
    const m = require('../../container/Request/ChangeSchedule/ChangeSchedule');
    ChangeScheduleComponent = m.ChangeSchedule || m.default;
} catch {
    ChangeScheduleComponent = require('../../container/Request/ChangeSchedule/ChangeSchedule').default;
}

// ─── Default props ────────────────────────────────────────────────────────────

const mockClearChangeScheduleInstance = jest.fn();
const mockFetchChangeSchedule         = jest.fn();
const mockAddChangeSchedule           = jest.fn();
const mockUpdateChangeSchedule        = jest.fn();
const mockUpdateChangeScheduleStatus  = jest.fn();
const mockResetChangeScheduleInstance = jest.fn();

const defaultProps = {
    // user slice — pov_timezone used for timezone offset display in approval mode
    user: {
        id:           1,
        full_name:    'Test Employee',
        pov_timezone: 'Asia/Manila',
    },

    // changeSchedule slice props (state.changeSchedule)
    instance:          {},
    isInstanceLoaded:  false,

    // constant slice — SCHEDULE_POLICIES / SCHEDULE_HOLIDAY_POLICIES used for policy toggles
    constant: {
        SCHEDULE_TYPE: {
            STANDARD:  'standard',
            FLEXIBLE:  'flexible',
            CUSTOMIZE: 'customize',
        },
        SCHEDULE_POLICIES: [
            'allow_late',
            'allow_undertime',
            'allow_night_diff',
        ],
        SCHEDULE_HOLIDAY_POLICIES: [
            'allow_special_holiday',
            'allow_legal_holiday',
        ],
    },

    // settings slice — current payroll cutoff for date validation context
    settings: {
        current_payroll_cutoff: {
            start_date: null,
            end_date:   null,
        },
    },

    // React Router props
    params:   {},
    location: { search: '' },
    history:  { push: jest.fn() },
    match:    { params: {} },

    // Dispatch and action creators
    dispatch:                      jest.fn(),
    addChangeSchedule:             mockAddChangeSchedule,
    updateChangeSchedule:          mockUpdateChangeSchedule,
    updateChangeScheduleStatus:    mockUpdateChangeScheduleStatus,
    fetchChangeSchedule:           mockFetchChangeSchedule,
    clearChangeScheduleInstance:   mockClearChangeScheduleInstance,
    resetChangeScheduleInstance:   mockResetChangeScheduleInstance,
    setRedirect:                   jest.fn(),
};

// ─── Render helper ────────────────────────────────────────────────────────────

function renderChangeSchedule(props = {}) {
    return render(
        <MemoryRouter>
            <ChangeScheduleComponent {...defaultProps} {...props} />
        </MemoryRouter>
    );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ChangeSchedule request form', () => {
    beforeEach(() => jest.clearAllMocks());

    // Basic smoke
    test('renders without crashing', () => {
        expect(() => renderChangeSchedule()).not.toThrow();
    });

    // Mount lifecycle
    test('calls clearChangeScheduleInstance on mount', () => {
        renderChangeSchedule();
        expect(mockClearChangeScheduleInstance).toHaveBeenCalled();
    });

    test('does not call fetchChangeSchedule on mount when no ID is provided (create mode)', () => {
        renderChangeSchedule({ match: { params: {} } });
        expect(mockFetchChangeSchedule).not.toHaveBeenCalled();
    });

    test('calls fetchChangeSchedule on mount when ID is provided (update/approval mode)', () => {
        renderChangeSchedule({ match: { params: { id: '42' } }, params: { id: '42' } });
        expect(mockFetchChangeSchedule).toHaveBeenCalledWith('42');
    });

    // Create mode — form renders immediately (no isInstanceLoaded gate when no ID)
    test('renders Valid From label in create mode', () => {
        const { getByText } = renderChangeSchedule();
        expect(getByText(/Valid From/i)).toBeInTheDocument();
    });

    test('renders Valid To label in create mode', () => {
        const { getByText } = renderChangeSchedule();
        expect(getByText(/Valid To/i)).toBeInTheDocument();
    });

    test('renders Note label in create mode', () => {
        const { getByText } = renderChangeSchedule();
        expect(getByText(/Note/i)).toBeInTheDocument();
    });

    test('renders valid_from date input', () => {
        const { container } = renderChangeSchedule();
        const input = container.querySelector('input[name="valid_from"]');
        expect(input).toBeInTheDocument();
    });

    test('renders valid_to date input', () => {
        const { container } = renderChangeSchedule();
        const input = container.querySelector('input[name="valid_to"]');
        expect(input).toBeInTheDocument();
    });

    // Loading / empty state guards
    test('does not crash when instance is empty object', () => {
        expect(() => renderChangeSchedule({ instance: {} })).not.toThrow();
    });

    test('does not crash with isInstanceLoaded false and an ID present', () => {
        // When ID present but not yet loaded, component should show PageLoading (not crash)
        expect(() =>
            renderChangeSchedule({
                match:             { params: { id: '99' } },
                isInstanceLoaded:  false,
            })
        ).not.toThrow();
    });

    test('does not crash with isInstanceLoaded true and a populated instance', () => {
        expect(() =>
            renderChangeSchedule({
                match:             { params: { id: '1' } },
                isInstanceLoaded:  true,
                instance: {
                    id:            1,
                    user_id:       1,
                    valid_from:    '2026-07-01',
                    valid_to:      '2026-07-07',
                    status:        'pending',
                    employee_note: 'Test note',
                    approver_note: null,
                    is_under_supervisee: false,
                    offset_difference:   0,
                    schedule: {
                        id:               10,
                        schedule_type:    'customize',
                        schedule_details: {},
                        schedule_policies: [],
                    },
                    user: {
                        id:        1,
                        full_name: 'Test Employee',
                    },
                },
            })
        ).not.toThrow();
    });

    // Approval mode props
    test('does not crash in approval mode (is_under_supervisee true)', () => {
        expect(() =>
            renderChangeSchedule({
                match:             { params: { id: '5' } },
                isInstanceLoaded:  true,
                instance: {
                    id:                  5,
                    user_id:             2,
                    valid_from:          '2026-07-01',
                    valid_to:            '2026-07-07',
                    status:              'pending',
                    employee_note:       'Please approve',
                    approver_note:       null,
                    is_under_supervisee: true,
                    offset_difference:   0,
                    schedule: {
                        id:               20,
                        schedule_type:    'customize',
                        schedule_details: {},
                        schedule_policies: [],
                    },
                    user: {
                        id:        2,
                        full_name: 'Another Employee',
                    },
                },
            })
        ).not.toThrow();
    });

    // Null / undefined-tolerant
    test('does not crash when settings.current_payroll_cutoff is null', () => {
        expect(() =>
            renderChangeSchedule({
                settings: { current_payroll_cutoff: null },
            })
        ).not.toThrow();
    });

    test('does not crash when constant is empty', () => {
        expect(() =>
            renderChangeSchedule({ constant: {} })
        ).not.toThrow();
    });
});
