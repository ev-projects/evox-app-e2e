/**
 * Dashboard/JobOpenings — as of EVOX-721 (Careers Dead Code Removal) this is a
 * plain static wrapper embedding the external careers site (taptalent.io) via
 * an iframe. It no longer fetches data, takes a careerList prop, or dispatches
 * anything on mount — the internal careers-list implementation (fetchJobOpenings,
 * jobOpeningActions/Reducers, JobOpeningsUpdate) was removed as dead code.
 * Still wrapped in react-redux connect() (with empty mapStateToProps/
 * mapDispatchToProps), so it still needs a store in context — mocked below
 * rather than pulled in a real Provider, since there's nothing state-related
 * left to exercise.
 * Source: src/components/Dashboard/JobOpenings/JobOpenings.js
 */
import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
}));

import JobOpenings from '../../components/Dashboard/JobOpenings/JobOpenings';

describe('JobOpenings component', () => {
    test('renders without crashing', () => {
        expect(() => render(<JobOpenings />)).not.toThrow();
    });

    test('renders the external careers iframe', () => {
        const { container } = render(<JobOpenings />);
        const iframe = container.querySelector('iframe');
        expect(iframe).toBeInTheDocument();
        expect(iframe).toHaveAttribute('src', expect.stringContaining('taptalent.io'));
    });
});
