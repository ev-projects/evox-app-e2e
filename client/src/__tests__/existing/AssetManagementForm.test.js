// DRAFT — generated 2026-07-08, needs verification
/**
 * AssetManagementForm — the "IT Asset Management" declaration form. Reads the
 * signed-in user's assets; on mount it loads them via getUserAsset(id) or
 * getUserAssets(). Wrapper/AdminLte/RequestButtons stubbed.
 * Source: src/components/AssetManagementForm/AssetManagementForm.js
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

jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader: ({ children }) => <div>{children}</div>,
    Content: ({ children, title }) => <div><h1>{title}</h1>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody: ({ children }) => <div>{children}</div>,
    Row: ({ children }) => <div>{children}</div>,
    Col: ({ children }) => <div>{children}</div>,
}));
jest.mock('../../components/RequestComponent/RequestButtons/RequestButtons', () => () => <div>buttons</div>);
jest.mock('../../components/RequestComponent/RequestButtons/RequestSubtitle', () => () => <div>subtitle</div>);

import AssetManagementForm from '../../components/AssetManagementForm/AssetManagementForm';

const defaultProps = {
    user: {
        id: 1,
        first_name: 'Jane',
        last_name: 'Doe',
        is_asset_loaded: true,
        user_assets: [],
        user_asset: null,
    },
    params: {},
    getUserAsset: jest.fn(),
    getUserAssets: jest.fn(),
    addUserAsset: jest.fn(),
    updateUserAsset: jest.fn(),
    setRedirect: jest.fn(),
    history: { push: jest.fn() },
};

function renderComponent(props = {}) {
    return render(
        <MemoryRouter>
            <AssetManagementForm {...defaultProps} {...props} />
        </MemoryRouter>
    );
}

describe('AssetManagementForm component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    test('renders the IT Asset Management title', () => {
        const { getByText } = renderComponent();
        expect(getByText(/IT Asset Management/i)).toBeInTheDocument();
    });

    test('prefills the employee name from the user', () => {
        const { container } = renderComponent();
        const nameInput = container.querySelector('input[name="employee_name"]');
        expect(nameInput).toBeInTheDocument();
        expect(nameInput.value).toBe('Jane Doe');
    });

    test('loads all assets on mount when not viewing a specific asset', () => {
        const getUserAssets = jest.fn();
        renderComponent({
            user: { ...defaultProps.user, is_asset_loaded: false },
            getUserAssets,
        });
        expect(getUserAssets).toHaveBeenCalled();
    });
});
