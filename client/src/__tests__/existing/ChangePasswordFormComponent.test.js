// DRAFT — generated 2026-07-08, needs verification
/**
 * ChangePasswordFormComponent — class-based variant of the change password form
 * (embedded in the profile modal flow). Reads profile.closeAllForm.
 * Source: src/components/ChangePasswordFormComponent/ChangePasswordFormComponent.js
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
    Content: ({ children, title }) => <div><h1>{title}</h1>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody: ({ children }) => <div>{children}</div>,
}));

import ChangePasswordFormComponent from '../../components/ChangePasswordFormComponent/ChangePasswordFormComponent';

function renderComponent(props = {}) {
    return render(
        <ChangePasswordFormComponent
            user={{ id: 1 }}
            profile={{ closeAllForm: false }}
            changePassword={jest.fn()}
            fetchProfile={jest.fn()}
            setShowChangePasswordForm={jest.fn()}
            {...props}
        />
    );
}

describe('ChangePasswordFormComponent component', () => {
    test('renders without crashing', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    test('renders the Change Password title', () => {
        const { getByText } = renderComponent();
        expect(getByText(/Change Password/i)).toBeInTheDocument();
    });

    test('renders the Current Password label', () => {
        const { getByText } = renderComponent();
        expect(getByText(/Current Password/i)).toBeInTheDocument();
    });
});
