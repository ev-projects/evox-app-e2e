// DRAFT — generated 2026-07-08, needs verification
/**
 * Dashboard/BirthdayAnniversary — celebrations list. Reads
 * `dashboard.birthday_and_anniv`; calls getDashboardOverall(2) on mount.
 * Source: src/components/Dashboard/BirthdayAnniversary/BirthdayAnniversary.js
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

import BirthdayAnniversary from '../../components/Dashboard/BirthdayAnniversary/BirthdayAnniversary';

const celebrations = [
    { id: 1, name: 'Alice', type: 'birthday', event_date: '2026-07-10' },
];

function renderComponent(props = {}) {
    return render(
        <BirthdayAnniversary
            user={{ id: 1 }}
            dashboard={{ birthday_and_anniv: celebrations }}
            getDashboardOverall={jest.fn()}
            getBirthdayAnniv={jest.fn()}
            {...props}
        />
    );
}

describe('BirthdayAnniversary component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    test('requests the dashboard overall celebrations on mount', () => {
        const getDashboardOverall = jest.fn();
        renderComponent({ getDashboardOverall });
        expect(getDashboardOverall).toHaveBeenCalledWith(2);
    });

    test('does not crash when there are no celebrations', () => {
        expect(() => renderComponent({ dashboard: { birthday_and_anniv: [] } })).not.toThrow();
    });
});
