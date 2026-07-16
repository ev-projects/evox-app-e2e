// DRAFT — generated 2026-07-08, needs verification
/**
 * AuthenticateClient — client/MS SSO landing. componentWillMount consumes a
 * ?token= or ?code= query param and dispatches the matching auth action; the
 * render shows the login card (Spring animation stubbed) or redirects once
 * authenticated.
 * Source: src/container/AuthenticateClient/AuthenticateClient.js
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

jest.mock('react-spring/renderprops', () => ({
    Spring: ({ children }) => (typeof children === 'function' ? children({}) : children),
}));

import AuthenticateClient from '../../container/AuthenticateClient/AuthenticateClient';

beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
});

function renderComponent(props = {}) {
    return render(
        <MemoryRouter>
            <AuthenticateClient
                user={{}}
                location={{ search: '' }}
                authenticateClient={jest.fn()}
                authenticateMSClient={jest.fn()}
                showAlert={jest.fn()}
                {...props}
            />
        </MemoryRouter>
    );
}

describe('AuthenticateClient container', () => {
    test('renders the login card without crashing when unauthenticated', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    test('dispatches authenticateClient when a ?token= param is present', () => {
        const authenticateClient = jest.fn();
        renderComponent({ location: { search: '?token=abc123' }, authenticateClient });
        expect(authenticateClient).toHaveBeenCalledWith('abc123');
    });

    test('dispatches authenticateMSClient when a ?code= param is present', () => {
        const authenticateMSClient = jest.fn();
        renderComponent({ location: { search: '?code=xyz789' }, authenticateMSClient });
        expect(authenticateMSClient).toHaveBeenCalledWith('xyz789');
    });

    test('does not dispatch when neither token nor code is present', () => {
        const authenticateClient = jest.fn();
        const authenticateMSClient = jest.fn();
        renderComponent({ authenticateClient, authenticateMSClient });
        expect(authenticateClient).not.toHaveBeenCalled();
        expect(authenticateMSClient).not.toHaveBeenCalled();
    });
});
