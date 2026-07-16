// DRAFT — generated 2026-07-08, needs verification
/**
 * Dashboard/EmployeeDashboard — the employee landing view. In its current form
 * it renders the DashboardTabs announcement panel (heavy child, stubbed here).
 * Source: src/components/Dashboard/EmployeeDashboard/EmployeeDashboard.js
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

jest.mock('../../components/Dashboard/DashboardTabs', () =>
    () => <div data-testid="dashboard-tabs">DashboardTabs</div>);

import EmployeeDashboard from '../../components/Dashboard/EmployeeDashboard/EmployeeDashboard';

const defaultProps = {
    user: { id: 1, full_name: 'Jane Doe', payload: null },
    settings: { current_payroll_cutoff: null },
    dashboard: { my_dtr_notifications: [] },
    departmentAnnouncement: {},
};

function renderComponent(props = {}) {
    return render(
        <MemoryRouter>
            <EmployeeDashboard {...defaultProps} {...props} />
        </MemoryRouter>
    );
}

describe('EmployeeDashboard component', () => {
    test('renders without crashing', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    test('renders the DashboardTabs announcement panel', () => {
        const { getByTestId } = renderComponent();
        expect(getByTestId('dashboard-tabs')).toBeInTheDocument();
    });

    test('does not crash when the user has a payload', () => {
        expect(() => renderComponent({
            user: { ...defaultProps.user, payload: { foo: 'bar' } },
        })).not.toThrow();
    });
});
