// DRAFT — generated 2026-07-08, needs verification
/**
 * Template/Sidebar — the main left navigation. Renders a large, permission-
 * gated link tree. Authenticator (level/feature gates) and Validator are
 * mocked; global.links is loaded so the <Link to=...> targets resolve.
 * Source: src/components/Template/Sidebar/Sidebar.js
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

jest.mock('../../services/Authenticator', () => ({
    __esModule: true,
    default: {
        scanLevel_Feature: jest.fn(() => true),
        scanFeature: jest.fn(() => true),
        scanLevel: jest.fn(() => true),
        checkPermission: jest.fn(() => true),
        checkRole: jest.fn(() => true),
    },
}));

jest.mock('../../services/Validator', () => ({
    __esModule: true,
    default: { isValid: jest.fn(() => false) },
}));

import Sidebar from '../../components/Template/Sidebar/Sidebar';

const defaultProps = {
    user: {
        id: 3,
        first_name: 'Jane',
        last_name: 'Doe',
        country: 'Philippines',
        LevelId: 5,
        lvl_name: 'Employee',
    },
    settings: { country: 'Philippines', profile_picture: null },
    selected_summary: null,
    my_team_pending_request: 0,
};

function renderComponent(props = {}) {
    return render(
        <MemoryRouter>
            <Sidebar {...defaultProps} {...props} />
        </MemoryRouter>
    );
}

describe('Sidebar component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    test('renders the main-sidebar aside', () => {
        const { container } = renderComponent();
        expect(container.querySelector('aside.main-sidebar')).toBeInTheDocument();
    });

    test('renders the EVOX brand', () => {
        const { getByText } = renderComponent();
        expect(getByText('OX')).toBeInTheDocument();
    });

    test('renders the Dashboard nav link', () => {
        const { getAllByText } = renderComponent();
        expect(getAllByText(/Dashboard/i).length).toBeGreaterThan(0);
    });

    test('does not crash when feature gates are all denied', () => {
        // eslint-disable-next-line global-require
        const Authenticator = require('../../services/Authenticator').default;
        Authenticator.scanLevel_Feature.mockReturnValue(false);
        Authenticator.scanFeature.mockReturnValue(false);
        Authenticator.scanLevel.mockReturnValue(false);
        expect(() => renderComponent()).not.toThrow();
    });

    test('does not crash for a non-Philippines user', () => {
        expect(() => renderComponent({
            user: { ...defaultProps.user, country: 'India' },
        })).not.toThrow();
    });
});
