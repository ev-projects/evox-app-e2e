// DRAFT — generated 2026-07-08, needs verification
/**
 * Summary/SummaryDashbord — the handler "summary" panel: today/tomorrow leaves
 * and pending request counters, read from the dashboard slice. Child widgets
 * (Holiday, BirthdayAnniversary, PageLoading) are stubbed.
 * Source: src/components/Summary/SummaryDashbord.js
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

jest.mock('../../components/Dashboard/BirthdayAnniversary/BirthdayAnniversary.js', () =>
    () => <div data-testid="birthday">BirthdayAnniversary</div>);
jest.mock('../../components/Dashboard/Holiday/Holiday.js', () =>
    () => <div data-testid="holiday">Holiday</div>);
jest.mock('../../container/PageLoading/PageLoading.js', () => () => <div>Loading...</div>);
jest.mock('../../container/PageLoadingCard.js/PageLoadingCard.js', () => () => <div>LoadingCard...</div>);

import { SummaryDashbord } from '../../components/Summary/SummaryDashbord';

const emptyDashboard = {
    todayleaves: [],
    tommorowleaves: [],
    dashboardholiday: [],
    alterrequest: [],
    changeschedulerequest: [],
    overtimerequest: [],
    restdayrequest: [],
    myalterrequest: [],
    mychangeschedulerequest: [],
    myovertimerequest: [],
    myrestdayrequest: [],
};

function renderComponent(props = {}) {
    return render(
        <MemoryRouter>
            <SummaryDashbord
                dashboard={emptyDashboard}
                user={{ id: 1 }}
                getDashboardOverall={jest.fn()}
                {...props}
            />
        </MemoryRouter>
    );
}

describe('SummaryDashbord component', () => {
    test('renders without crashing with empty data', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    test('renders the Today leaves tab', () => {
        const { getAllByText } = renderComponent();
        expect(getAllByText(/Today \(0\)/i).length).toBeGreaterThan(0);
    });

    test('renders the Tomorrow leaves tab', () => {
        const { getAllByText } = renderComponent();
        expect(getAllByText(/Tommorow \(0\)/i).length).toBeGreaterThan(0);
    });

    test('reflects populated leave counts in the tab labels', () => {
        const { getAllByText } = renderComponent({
            dashboard: {
                ...emptyDashboard,
                todayleaves: [{ id: 1 }, { id: 2 }],
            },
        });
        expect(getAllByText(/Today \(2\)/i).length).toBeGreaterThan(0);
    });
});
