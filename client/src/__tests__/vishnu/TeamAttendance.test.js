// DRAFT — generated 2026-07-08, needs verification
/**
 * Dashboard/TeamAttendance — handler's team attendance snapshot. Reads
 * `dashboard.team_attendance`; fetches on mount via getTeamAttendanceStatus.
 * Source: src/components/Dashboard/TeamAttendance/TeamAttendance.js
 */
import React from 'react';
import { render } from '@testing-library/react';
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

jest.mock('react-datepicker', () => (props) => <input data-testid="datepicker" {...props} />);

jest.mock('../../services/Formatter', () => ({
    __esModule: true,
    default: { title_to_slug: jest.fn((s) => String(s || '').toLowerCase()) },
}));

import TeamAttendance from '../../components/Dashboard/TeamAttendance/TeamAttendance';

function renderComponent(props = {}) {
    return render(
        <TeamAttendance
            user={{ id: 1 }}
            dashboard={{ team_attendance: [] }}
            getTeamAttendanceStatus={jest.fn()}
            {...props}
        />
    );
}

describe('TeamAttendance component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    test('fetches team attendance on mount', () => {
        const getTeamAttendanceStatus = jest.fn();
        renderComponent({ getTeamAttendanceStatus });
        expect(getTeamAttendanceStatus).toHaveBeenCalledWith(1);
    });

    test('shows "No record found" when the team list is empty', () => {
        const { getByText } = renderComponent();
        expect(getByText(/No record found/i)).toBeInTheDocument();
    });
});
