// DRAFT — generated 2026-07-08, needs verification
/**
 * Dashboard/HandlerDashboard — the manager/client landing view. Renders a
 * Formik-wrapped department filter plus team widgets (all stubbed). Reads
 * report.team_attendance_summary and user.departments_handled.
 * Source: src/components/Dashboard/HandlerDashboard/HandlerDashboard.js
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

jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader: ({ children }) => <div>{children}</div>,
    Content: ({ children }) => <div>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody: ({ children }) => <div>{children}</div>,
}));

jest.mock('../../components/Dashboard/TeamAttendance', () =>
    () => <div data-testid="team-attendance">TeamAttendance</div>);
jest.mock('../../components/Dashboard/BirthdayAnniversary', () =>
    () => <div data-testid="birthday">BirthdayAnniversary</div>);
jest.mock('../../components/Dashboard/Holiday', () =>
    () => <div data-testid="holiday">Holiday</div>);
jest.mock('../../components/Report/TeamAttendanceSummaryPanel', () =>
    () => <div data-testid="summary-panel">TeamAttendanceSummaryPanel</div>);

jest.mock('../../services/Authenticator', () => ({
    __esModule: true,
    default: { scanLevel: jest.fn(() => true), scanLevel_Feature: jest.fn(() => true) },
}));

jest.mock('../../services/Validator', () => ({
    __esModule: true,
    default: { isValid: jest.fn(() => true) },
}));

import HandlerDashboard from '../../components/Dashboard/HandlerDashboard/HandlerDashboard';

const defaultProps = {
    user: {
        id: 1,
        full_name: 'Manager One',
        departments_handled: [{ id: 1, department_name: 'Engineering' }],
    },
    report: { team_attendance_summary: [] },
    data: {},
    getTeamAttendanceStatus: jest.fn(),
    getBirthdayAnniv: jest.fn(),
    getTeamAttendanceSummary: jest.fn(),
};

function renderComponent(props = {}) {
    return render(
        <MemoryRouter>
            <HandlerDashboard {...defaultProps} {...props} />
        </MemoryRouter>
    );
}

describe('HandlerDashboard component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    test('fetches the team attendance summary on mount for a Client', () => {
        const getTeamAttendanceSummary = jest.fn();
        renderComponent({ getTeamAttendanceSummary });
        expect(getTeamAttendanceSummary).toHaveBeenCalled();
    });

    test('shows the department selector when more than one department is handled', () => {
        const { container } = renderComponent({
            user: {
                ...defaultProps.user,
                departments_handled: [
                    { id: 1, department_name: 'Engineering' },
                    { id: 2, department_name: 'Support' },
                ],
            },
        });
        expect(container.querySelector('select[name="department_id"]')).toBeInTheDocument();
    });

    test('does not crash with a single handled department', () => {
        expect(() => renderComponent()).not.toThrow();
    });
});
