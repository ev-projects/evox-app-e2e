// DRAFT — generated 2026-07-08, needs verification
/**
 * Dashboard/DtrNotifications — missing-DTR reminder list. Reads
 * `dashboard.my_dtr_notifications`.
 * Source: src/components/Dashboard/DtrNotifications/DtrNotifications.js
 */
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import '../../config/GlobalVariables';

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

import DtrNotifications from '../../components/Dashboard/DtrNotifications/DtrNotifications';

function renderComponent(props = {}) {
    return render(
        <MemoryRouter>
            <DtrNotifications
                user={{ id: 1 }}
                dashboard={{ my_dtr_notifications: [] }}
                getMyDtrNotifications={jest.fn()}
                {...props}
            />
        </MemoryRouter>
    );
}

describe('DtrNotifications component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing (no notifications)', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    test('does not crash when a null user is supplied', () => {
        expect(() => renderComponent({ user: null })).not.toThrow();
    });

    test('renders a past-dated notification row', () => {
        const { getByText } = renderComponent({
            user: { id: 1, use_multi: false },
            dashboard: {
                my_dtr_notifications: [
                    {
                        id: 1,
                        date: '2026-01-05',
                        status: 'Missing Time Out',
                        details: 'No time out recorded',
                        time_in: '09:00',
                        time_out: null,
                        requests: [],
                    },
                ],
            },
        });
        expect(getByText('No time out recorded')).toBeInTheDocument();
    });
});
