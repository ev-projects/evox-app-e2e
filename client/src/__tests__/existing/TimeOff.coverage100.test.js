// DRAFT — generated 2026-07-09, needs verification
/**
 * Profile → TimeOff tab. Functional component, connect()-wrapped default export;
 * also exports LeaveIcon and LeaveStatus presentational helpers from the same file.
 * Renders null unless Validator.isValid(profile) is true; otherwise renders LeaveCredits,
 * a ReportNavigator, and either a leave list or an empty-state message.
 * Source: src/container/Profile/TimeOff/TimeOff.js
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

jest.mock('../../container/Profile/LeaveCredits', () => () => <div data-testid="leave-credits" />);
jest.mock('../../components/Template/ReportNavigator', () => () => <div data-testid="report-navigator" />);

import TimeOff, { LeaveIcon, LeaveStatus } from '../../container/Profile/TimeOff/TimeOff';

const defaultProps = {
    profile: {
        details: { id: 1 },
        leave_credits: [],
        leaves_list: [],
    },
    user: { id: 1 },
    start_date: '2026-07-01',
    end_date: '2026-07-31',
    fetchTimeOff: jest.fn(),
};

function renderComponent(props = {}) {
    return render(
        <MemoryRouter>
            <TimeOff {...defaultProps} {...props} />
        </MemoryRouter>
    );
}

describe('TimeOff component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing (empty leaves list)', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    test('renders LeaveCredits', () => {
        const { getByTestId } = renderComponent();
        expect(getByTestId('leave-credits')).toBeInTheDocument();
    });

    test('renders ReportNavigator', () => {
        const { getByTestId } = renderComponent();
        expect(getByTestId('report-navigator')).toBeInTheDocument();
    });

    test('renders the no-leaves message when leaves_list is empty', () => {
        const { getByText } = renderComponent();
        expect(getByText(/You don't have any leaves within this date range/i)).toBeInTheDocument();
    });

    test('renders a leave row when leaves_list has entries', () => {
        const { getByText } = renderComponent({
            profile: {
                ...defaultProps.profile,
                leaves_list: [
                    { date: '2026-07-05', status: 'approved', amount: '1.0', type: 'Vacation Leave', employee_note: 'Family trip' },
                ],
            },
        });
        expect(getByText(/Vacation Leave/i)).toBeInTheDocument();
        expect(getByText(/Family trip/i)).toBeInTheDocument();
    });

    test('renders a row per entry for multiple leaves', () => {
        const { getAllByText } = renderComponent({
            profile: {
                ...defaultProps.profile,
                leaves_list: [
                    { date: '2026-07-05', status: 'approved', amount: '1.0', type: 'Vacation Leave', employee_note: 'note1' },
                    { date: '2026-07-10', status: 'requested', amount: '0.5', type: 'Sick Leave', employee_note: 'note2' },
                ],
            },
        });
        expect(getAllByText(/note1|note2/i).length).toBeGreaterThan(0);
    });

    test('renders null when profile is invalid (null)', () => {
        const { container } = renderComponent({ profile: null });
        expect(container.querySelector('.leave-row, .no-leaves-row')).not.toBeInTheDocument();
    });

    test('does not crash when profile is invalid (undefined)', () => {
        expect(() => renderComponent({ profile: undefined })).not.toThrow();
    });

    test('does not crash when profile is invalid (empty string)', () => {
        expect(() => renderComponent({ profile: '' })).not.toThrow();
    });
});

describe('LeaveIcon component', () => {
    function renderIcon(type) {
        return render(<LeaveIcon type={type} />);
    }

    test('renders plane icon for vacation leave', () => {
        const { container } = renderIcon('Vacation Leave');
        expect(container.querySelector('.fa-plane')).toBeInTheDocument();
    });

    test('renders medkit icon for sick leave', () => {
        const { container } = renderIcon('Sick Leave');
        expect(container.querySelector('.fa-medkit')).toBeInTheDocument();
    });

    test('renders child icon for maternity leave', () => {
        const { container } = renderIcon('Maternity Leave');
        expect(container.querySelector('.fa-child')).toBeInTheDocument();
    });

    test('renders child icon for paternity leave', () => {
        const { container } = renderIcon('Paternity Leave');
        expect(container.querySelector('.fa-child')).toBeInTheDocument();
    });

    test('renders birthday-cake icon for birthday leave', () => {
        const { container } = renderIcon('Birthday Leave');
        expect(container.querySelector('.fa-birthday-cake')).toBeInTheDocument();
    });

    test('renders default user icon for an unrecognized type', () => {
        const { container } = renderIcon('Some Unknown Leave Type');
        expect(container.querySelector('.fa-user')).toBeInTheDocument();
    });
});

describe('LeaveStatus component', () => {
    function renderStatus(status) {
        return render(<LeaveStatus status={status} />);
    }

    test('renders hourglass icon for requested', () => {
        const { container } = renderStatus('requested');
        expect(container.querySelector('.fa-hourglass')).toBeInTheDocument();
    });

    test('renders check-circle icon for approved', () => {
        const { container } = renderStatus('approved');
        expect(container.querySelector('.fa-check-circle')).toBeInTheDocument();
    });

    test('renders times-circle icon for denied', () => {
        const { container } = renderStatus('denied');
        expect(container.querySelector('.fa-times-circle')).toBeInTheDocument();
    });

    test('renders ban icon for canceled', () => {
        const { container } = renderStatus('canceled');
        expect(container.querySelector('.fa-ban')).toBeInTheDocument();
    });
});
