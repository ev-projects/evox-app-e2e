// DRAFT — generated 2026-07-08, needs verification
/**
 * JobReferal/Referjobs — the "Job Referral" application page. On mount it
 * fetches job details; the referral-mechanism explainer and API layer are
 * stubbed.
 * Source: src/components/JobReferal/Referjobs.js
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

jest.mock('../../services/APICALL.js', () => ({ __esModule: true, default: jest.fn(() => Promise.resolve({ data: {} })) }));
jest.mock('axios', () => ({ __esModule: true, default: { get: jest.fn(() => Promise.resolve({ data: {} })), post: jest.fn(() => Promise.resolve({ data: {} })) } }));
jest.mock('../../components/JobReferal/JobReferalapi.js', () => ({
    ApplyReferaljob: jest.fn(() => ({ type: 'APPLY' })),
    FecthJobdetails: jest.fn(() => ({ type: 'FETCH_JOB' })),
}));
jest.mock('../../components/JobReferal/Referalmachanisam.js', () =>
    () => <div data-testid="referral-mechanism">Referal mechanism</div>);

import Referjobs from '../../components/JobReferal/Referjobs';

function renderComponent(props = {}) {
    return render(
        <MemoryRouter>
            <Referjobs user={{ id: 1, full_name: 'Jane Doe' }} {...props} />
        </MemoryRouter>
    );
}

describe('Referjobs (JobReferal) component', () => {
    test('renders without crashing', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    test('renders the Job Referral heading', () => {
        const { getByText } = renderComponent();
        expect(getByText(/Job Referral/i)).toBeInTheDocument();
    });

    test('embeds the referral mechanism explainer', () => {
        const { getByTestId } = renderComponent();
        expect(getByTestId('referral-mechanism')).toBeInTheDocument();
    });
});
