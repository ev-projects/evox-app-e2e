// DRAFT — generated 2026-07-08, needs verification
/**
 * Dashboard/JobOpenings — internal careers list (grouped by country). Fetches
 * openings on mount; reads props.careerList (.PHL / .IND ...). Heavy children
 * (DashboardAnnouncementsList, PageLoading) stubbed.
 * Source: src/components/Dashboard/JobOpenings/JobOpenings.js
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

jest.mock('../../components/Dashboard/DashboardAnnouncementsList', () =>
    () => <div data-testid="announcements">Announcements</div>);
jest.mock('../../container/PageLoading/PageLoading', () => () => <div>Loading...</div>);

import JobOpenings from '../../components/Dashboard/JobOpenings/JobOpenings';

const defaultProps = {
    user: { id: 1, country: 'Philippines' },
    careerList: { PHL: [], IND: [], MAR: [] },
    departmentAnnouncement: { dashboard_announcement_list: [] },
    fetchJobOpenings: jest.fn(),
    fetchDashboardAnnouncementList: jest.fn(),
};

function renderComponent(props = {}) {
    return render(
        <MemoryRouter>
            <JobOpenings {...defaultProps} {...props} />
        </MemoryRouter>
    );
}

describe('JobOpenings component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    test('fetches job openings on mount', () => {
        const fetchJobOpenings = jest.fn();
        renderComponent({ fetchJobOpenings });
        expect(fetchJobOpenings).toHaveBeenCalled();
    });

    test('does not crash when careerList is undefined (still loading)', () => {
        expect(() => renderComponent({ careerList: undefined })).not.toThrow();
    });
});
