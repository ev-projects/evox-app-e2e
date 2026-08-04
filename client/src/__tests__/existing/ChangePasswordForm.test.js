// DRAFT — generated 2026-07-08, needs verification
/**
 * ChangePasswordForm — the change/reset password Formik form. The title flips
 * to "Reset Password" when forceChangePassword is set.
 * Source: src/components/ChangePasswordForm/ChangePasswordForm.js
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

import ChangePasswordForm from '../../components/ChangePasswordForm/ChangePasswordForm';

function renderComponent(props = {}) {
    return render(
        <ChangePasswordForm
            user={{ id: 1 }}
            changePassword={jest.fn()}
            fetchProfile={jest.fn()}
            setShowChangePasswordForm={jest.fn()}
            {...props}
        />
    );
}

describe('ChangePasswordForm component', () => {
    test('renders without crashing', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    test('shows the "Change Password" title by default', () => {
        const { getByText } = renderComponent();
        expect(getByText(/Change Password/i)).toBeInTheDocument();
    });

    test('shows the "Reset Password" title when forceChangePassword is set', () => {
        const { getByText } = renderComponent({ forceChangePassword: true });
        expect(getByText(/Reset Password/i)).toBeInTheDocument();
    });

    test('renders the password form fields', () => {
        const { getByText } = renderComponent();
        expect(getByText(/Current Password/i)).toBeInTheDocument();
    });
});
