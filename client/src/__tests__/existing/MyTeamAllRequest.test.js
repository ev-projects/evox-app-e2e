// WAVE-2 REACHABILITY PASS — authored 2026-07-27, needs first live Jest run
// Target: src/container/MyTeam/MyTeamRequests/MyTeamAllRequest.js (147 stmts, 0% — no test existed)
// Reachability: RouteList.js -> /app/team/MyTeamAllRequests
// KNOWN CRASH RISK (Cat-3 family): constructor reads user.departments_handled_strict.length —
// tests always provide the array.
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => jest.fn(),
    useSelector: jest.fn(),
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
jest.mock('../../components/Template/Paginate', () => () => <div>Paginate</div>);
jest.mock('../../container/PageLoading', () => () => <div>Loading...</div>);
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate:     ({ name }) => <input name={name} type="date" />,
    InputTime:     ({ name }) => <input name={name} type="time" />,
    InputDateTime: ({ name }) => <input name={name} type="datetime-local" />,
}));
jest.mock('../../services/Authenticator', () => ({
    check: jest.fn(() => true),
    scanFeature: jest.fn(() => true),
    scanLevel: jest.fn(() => true),
}));

const MyTeamAllRequest = require('../../container/MyTeam/MyTeamRequests/MyTeamAllRequest').default;

const defaultProps = {
    user: {
        id: 1,
        departments_handled_strict: [],
        departments_handled: [],
    },
    settings: {
        current_payroll_cutoff: { start_date: '2026-07-01', end_date: '2026-07-15' },
    },
    // state.myTeamRequestList slices (connect passthrough -> direct props)
    stored_departments: [],
    instance: {},
    requestList: {},
    isListLoaded: false,
    isNumbersLoaded: false,
    statusNumbers: {},
    filters: null,
    requesttype: '',
    fetchRequestList: jest.fn(),
    fetchStatusNumbers: jest.fn(),
    bulkRequest: jest.fn(() => Promise.resolve()),
};

function renderPage(props = {}) {
    return render(
        <MemoryRouter>
            <MyTeamAllRequest {...defaultProps} {...props} />
        </MemoryRouter>
    );
}

describe('MyTeamAllRequest container', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing while list not loaded (PageLoading state)', () => {
        expect(() => renderPage()).not.toThrow();
    });

    test('fetches the request list on mount', () => {
        renderPage();
        expect(defaultProps.fetchRequestList).toHaveBeenCalled();
    });

    test('renders without crashing with one handled department', () => {
        expect(() =>
            renderPage({
                user: {
                    ...defaultProps.user,
                    departments_handled_strict: [{ id: 7, department_name: 'QA' }],
                },
            })
        ).not.toThrow();
    });

    test('renders without crashing when list is loaded but empty', () => {
        expect(() =>
            renderPage({
                isListLoaded: true,
                requestList: { result: { data: [], department: [], total: 0 } },
            })
        ).not.toThrow();
    });
});
