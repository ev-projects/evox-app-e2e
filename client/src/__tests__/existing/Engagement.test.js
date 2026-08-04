// DRAFT — generated 2026-07-08, needs verification
/**
 * Dashboard/Engagement — thin card wrapper around BirthdayAnniversary
 * (Celebrations). The heavy connected child is stubbed.
 * Source: src/components/Dashboard/Engagement/Engagement.js
 */
import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => jest.fn(),
}));

jest.mock('../../components/Dashboard/BirthdayAnniversary/BirthdayAnniversary', () =>
    () => <div data-testid="birthday-anniversary">BirthdayAnniversary</div>);

jest.mock('react-bootstrap', () => ({
    Card: ({ children }) => <div className="card">{children}</div>,
}));

import Engagement from '../../components/Dashboard/Engagement/Engagement';

describe('Engagement component', () => {
    test('renders without crashing', () => {
        expect(() => render(<Engagement />)).not.toThrow();
    });

    test('renders the Celebrations heading', () => {
        const { getByText } = render(<Engagement />);
        expect(getByText(/Celebrations/i)).toBeInTheDocument();
    });

    test('embeds the BirthdayAnniversary widget', () => {
        const { getByTestId } = render(<Engagement />);
        expect(getByTestId('birthday-anniversary')).toBeInTheDocument();
    });
});
