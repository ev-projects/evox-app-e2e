// DRAFT — generated 2026-07-08, needs verification
/**
 * Dashboard/ChangeLogs — release notes / changelog widget with a details modal.
 * Reads `changelog.changelogs` (mapped from state.dashboard); fetches on mount.
 * Source: src/components/Dashboard/ChangeLogs/ChangeLogs.js
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

import ChangeLogs from '../../components/Dashboard/ChangeLogs/ChangeLogs';

const changelogs = [
    { id: 1, title: 'v2 released', category: 'Feature', log_date: '2026-07-01', description: '<p>New dashboard</p>' },
];

function renderComponent(props = {}) {
    return render(
        <ChangeLogs
            user={{ id: 1 }}
            changelog={{ changelogs }}
            getChangeLogs={jest.fn()}
            {...props}
        />
    );
}

describe('ChangeLogs component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    test('fetches changelogs on mount', () => {
        const getChangeLogs = jest.fn();
        renderComponent({ getChangeLogs });
        expect(getChangeLogs).toHaveBeenCalled();
    });

    test('does not crash with an empty changelog list', () => {
        expect(() => renderComponent({ changelog: { changelogs: [] } })).not.toThrow();
    });
});
