// DRAFT — generated 2026-07-08, needs verification
/**
 * Template/DropDownMenu — user avatar dropdown (My Profile / Log Out).
 * Class component connected to redux; connect is stripped so props are passed
 * directly. Validator is mocked; global.links is loaded for the profile link.
 * Source: src/components/Template/DropDownMenu/DropDownMenu.js
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import '../../config/GlobalVariables';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => jest.fn(),
}));

jest.mock('../../services/Validator', () => ({
    __esModule: true,
    default: { isValid: jest.fn(() => false) },
}));

jest.mock('jquery', () => jest.fn(() => ({})), { virtual: true });

import DropDownMenu from '../../components/Template/DropDownMenu/DropDownMenu';

const defaultProps = {
    user: { id: 7, first_name: 'Jane', last_name: 'Doe' },
    settings: { profile_picture: null },
    logOut: jest.fn(),
};

function renderComponent(props = {}) {
    return render(
        <MemoryRouter>
            <DropDownMenu {...defaultProps} {...props} />
        </MemoryRouter>
    );
}

describe('DropDownMenu component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    test('renders My Profile link', () => {
        const { getByText } = renderComponent();
        expect(getByText(/My Profile/i)).toBeInTheDocument();
    });

    test('renders Log Out action', () => {
        const { getByText } = renderComponent();
        expect(getByText(/Log Out/i)).toBeInTheDocument();
    });

    test('renders the default avatar image', () => {
        const { container } = renderComponent();
        const img = container.querySelector('img.image-smaller');
        expect(img).toBeInTheDocument();
        expect(img.getAttribute('src')).toContain('default-user-image');
    });

    test('calls logOut when Log Out is clicked', () => {
        const logOut = jest.fn();
        const { getByText } = renderComponent({ logOut });
        fireEvent.click(getByText(/Log Out/i));
        expect(logOut).toHaveBeenCalled();
    });

    test('does not crash when name fields are null (Loading state)', () => {
        expect(() => renderComponent({
            user: { id: 7, first_name: null, last_name: null },
        })).not.toThrow();
    });
});
