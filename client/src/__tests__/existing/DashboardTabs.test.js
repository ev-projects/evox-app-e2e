// DRAFT — generated 2026-07-08, needs verification
/**
 * Dashboard/DashboardTabs — the tabbed panel (Summary / Engagement /
 * Announcements / Jobs / Policies / Updates). Each tab body is a heavy child,
 * all stubbed. Visibility is gated by Authenticator.scanLevel (mocked true).
 * Source: src/components/Dashboard/DashboardTabs/DashboardTabs.js
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

jest.mock('../../components/Summary/SummaryDashbord', () => ({
    __esModule: true,
    SummaryDashbord: () => <div data-testid="summary">SummaryDashbord</div>,
    default: () => <div data-testid="summary">SummaryDashbord</div>,
}));
jest.mock('../../components/Dashboard/Engagement/Engagement', () =>
    () => <div data-testid="engagement">Engagement</div>);
jest.mock('../../components/Dashboard/DashboardAnnouncementsList', () =>
    () => <div data-testid="announcements">Announcements</div>);
jest.mock('../../components/Dashboard/JobOpenings', () =>
    () => <div data-testid="jobs">JobOpenings</div>);
jest.mock('../../components/Dashboard/ChangeLogs', () =>
    () => <div data-testid="updates">ChangeLogs</div>);
jest.mock('../../components/PoliciesDocument/PoliciesDocumentDownload', () =>
    () => <div data-testid="policies">Policies</div>);

jest.mock('../../services/Authenticator', () => ({
    __esModule: true,
    default: { scanLevel: jest.fn(() => true), scanLevel_Feature: jest.fn(() => true) },
}));

import DashboardTabs from '../../components/Dashboard/DashboardTabs/DashboardTabs';

const defaultProps = {
    user: { id: 1, full_name: 'Jane Doe', departments_handled: [] },
    departmentAnnouncement: { dashboard_announcement_list: [] },
    fetchDashboardAnnouncementList: jest.fn(),
};

function renderComponent(props = {}) {
    return render(
        <MemoryRouter>
            <DashboardTabs {...defaultProps} {...props} />
        </MemoryRouter>
    );
}

describe('DashboardTabs component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    test('shows the summary panel for a privileged handler (summary_shown on mount)', () => {
        const { getByTestId } = renderComponent();
        expect(getByTestId('summary')).toBeInTheDocument();
    });

    test('does not crash when the user is a plain employee (gates denied)', () => {
        // eslint-disable-next-line global-require
        const Authenticator = require('../../services/Authenticator').default;
        Authenticator.scanLevel.mockReturnValue(false);
        expect(() => renderComponent()).not.toThrow();
    });
});
