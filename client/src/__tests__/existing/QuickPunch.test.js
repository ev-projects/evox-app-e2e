// DRAFT — generated 2026-07-08, needs verification
/**
 * Dashboard/QuickPunch — the clock + biometric punch card. componentWillMount
 * starts a 1s clock timer (fake timers used so it never fires in the test).
 * Source: src/components/Dashboard/QuickPunch/QuickPunch.js
 */
import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

jest.useFakeTimers();

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => jest.fn(),
}));

jest.mock('react-datepicker', () => (props) => <input data-testid="datepicker" {...props} />);

import QuickPunch from '../../components/Dashboard/QuickPunch/QuickPunch';

function renderComponent(props = {}) {
    return render(
        <QuickPunch
            user={{ id: 1, first_name: 'Jane' }}
            dashboard={{ recent_dtr: [] }}
            biometrixLog={jest.fn()}
            getRecentDtr={jest.fn()}
            {...props}
        />
    );
}

describe('QuickPunch component', () => {
    afterEach(() => jest.clearAllTimers());

    test('renders without crashing', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    test('renders the QUICK PUNCH heading', () => {
        const { getByText } = renderComponent();
        expect(getByText(/QUICK PUNCH/i)).toBeInTheDocument();
    });

    test('renders the current date row', () => {
        const { container } = renderComponent();
        expect(container.querySelector('.date')).toBeInTheDocument();
    });
});
