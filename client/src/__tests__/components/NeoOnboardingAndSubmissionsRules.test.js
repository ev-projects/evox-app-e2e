// NeoOnboardingAndSubmissionsRules.test.js
//
// SOURCE FILES UNDER TEST
//   src/components/NeoReport/NeoOnboarding.js   (4 uncovered fns / 9 uncovered branch arms)
//   src/components/NeoReport/NeoSubmissions.js  (2 uncovered fns / 7 uncovered branch arms)
//
// MENU PATH
//   NEO Report -> Onboarding List   (route: /app/neo/onboarding/)
//   NEO Report -> Submission Report (route: /app/neo/submissions/)
//
// WHY THESE WERE UNCOVERED
//   The existing NeoOnboarding.test.js / NeoOnboarding.container.test.js are smoke tests
//   ("renders without crashing", "does not crash with loaded onboarding data"): they mount
//   the screens but never click Send Link, never check what is dispatched, and never assert
//   a rendered cell. So handleSendLink, the row-mapping callback, the button's onClick and
//   every display ternary inside a row stayed uncovered even though the file "had tests".
//
// This suite states the rules instead: what the mount fetch asks for, which rows appear for
// an empty / not-yet-loaded / populated roster, what a Send Link click sends and in what
// order, and when that button is locked.
//
// The real global.links table is loaded so the "view submission" target asserted here is
// the route the app actually ships. Dates use date-only fixtures, which moment parses as
// local midnight — the formatted output is therefore identical under any TZ, including the
// CI-pinned Asia/Manila.
//
// FINDINGS: none.

require('../../config/GlobalVariables');

const mockDispatch = jest.fn((action) => action);
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  connect: () => (Component) => Component,
  useDispatch: () => mockDispatch,
}));
jest.mock('../../components/GridComponent/AdminLte', () => ({
  ContainerBody: ({ children }) => <div>{children}</div>,
  ContainerWrapper: ({ children }) => <div>{children}</div>,
  Content: ({ children }) => <div>{children}</div>,
}));
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../store/actions/neo/neoActions', () => ({
  fetchNeoOnboardingUsers: jest.fn((country) => ({ type: 'STUB_FETCH_ONBOARDING', country })),
  sendNeoOnboardingLink: jest.fn((guid, userId, country) => ({
    type: 'STUB_SEND_LINK', guid, userId, country,
  })),
  fetchNeoSubmissionUsers: jest.fn((country) => ({ type: 'STUB_FETCH_SUBMISSIONS', country })),
  fetchNeoSubmissionData: jest.fn((guid) => ({ type: 'STUB_FETCH_SUBMISSION_DATA', guid })),
}));

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { MemoryRouter } from 'react-router-dom';

import {
  fetchNeoOnboardingUsers,
  sendNeoOnboardingLink,
  fetchNeoSubmissionUsers,
} from '../../store/actions/neo/neoActions';

const NeoOnboarding = require('../../components/NeoReport/NeoOnboarding').default;
const NeoSubmissions = require('../../components/NeoReport/NeoSubmissions').default;

const hrUser = { id: 88, full_name: 'HR Reviewer', country: 'Philippines' };

const onboardingRows = [
  {
    userGuid: 'guid-new', bhrNumber: 'BHR-001', firstName: 'Ana', middleName: 'S',
    lastName: 'Cruz', email: 'ana.cruz@eastvantage.com', department: 'Engineering',
    dateHired: '2026-07-01', initiatedBy: null, lastInitiatedBy: null, lastInitiatedAt: null,
  },
  {
    userGuid: 'guid-sent', bhrNumber: 'BHR-002', firstName: 'Ben', middleName: '',
    lastName: 'Reyes', email: 'ben.reyes@eastvantage.com', department: 'Finance',
    dateHired: '2026-06-15', initiatedBy: 'HR Reviewer',
    lastInitiatedBy: 'HR Reviewer', lastInitiatedAt: '2026-06-20',
  },
];

const submissionRows = [
  {
    userGuid: 'guid-sub', bhrNumber: 'BHR-003', userName: 'Ana Cruz',
    email: 'ana.cruz@eastvantage.com', daysPending: 4,
    firstSubmittedAt: '2026-07-02', latestSubmittedAt: '2026-07-05',
    pendingFields: 2, resubmissionFields: 1, uploadedFiles: 3, status: 'For Review',
  },
  {
    userGuid: 'guid-nodate', bhrNumber: 'BHR-004', userName: 'Ben Reyes',
    email: 'ben.reyes@eastvantage.com', daysPending: 0,
    firstSubmittedAt: null, latestSubmittedAt: null,
    pendingFields: 0, resubmissionFields: 0, uploadedFiles: 0, status: 'Completed',
  },
];

const renderOnboarding = (props = {}) => render(
  <MemoryRouter><NeoOnboarding user={hrUser} {...props} /></MemoryRouter>
);
const renderSubmissions = (props = {}) => render(
  <MemoryRouter><NeoSubmissions user={hrUser} {...props} /></MemoryRouter>
);

const bodyRows = (container) => container.querySelectorAll('tbody tr');
const cells = (row) => Array.from(row.querySelectorAll('td')).map((td) => td.textContent);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('NEO Report -> Onboarding List', () => {
  test('opening the list asks for the onboarding roster of the reviewer own country', () => {
    renderOnboarding({ onboarding: onboardingRows });

    expect(fetchNeoOnboardingUsers).toHaveBeenCalledWith('Philippines');
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'STUB_FETCH_ONBOARDING', country: 'Philippines' });
  });

  test('the roster is fetched once, not on every rerender', () => {
    const { rerender } = renderOnboarding({ onboarding: onboardingRows });
    rerender(<MemoryRouter><NeoOnboarding user={hrUser} onboarding={[]} /></MemoryRouter>);

    expect(fetchNeoOnboardingUsers).toHaveBeenCalledTimes(1);
  });

  test('an empty roster shows "No results found" and draws no table at all', () => {
    const { container, getByText } = renderOnboarding({ onboarding: [] });

    expect(getByText('No results found')).toBeInTheDocument();
    expect(container.querySelectorAll('table').length).toBe(0);
  });

  test('before the roster arrives the table shell is drawn with its headers but no rows', () => {
    const { container, queryByText } = renderOnboarding({ onboarding: undefined });

    expect(queryByText('No results found')).toBeNull();
    expect(container.querySelectorAll('table').length).toBe(1);
    expect(container.querySelector('thead').textContent).toContain('BHR No');
    expect(bodyRows(container).length).toBe(0);
  });

  test('each new hire becomes one row carrying the full name, department and formatted hire date', () => {
    const { container } = renderOnboarding({ onboarding: onboardingRows });
    const rows = bodyRows(container);

    expect(rows.length).toBe(2);
    expect(cells(rows[0])).toEqual([
      'BHR-001', 'Ana S Cruz', 'ana.cruz@eastvantage.com', 'Engineering',
      // NeoOnboarding.js:62 renders &nbsp; before the label
      'Jul 01, 2026', '', '', ' Send Link',
    ]);
  });

  test('a hire with no initiation yet leaves the initiation date cell empty while an initiated one shows it', () => {
    const { container } = renderOnboarding({ onboarding: onboardingRows });
    const rows = bodyRows(container);

    expect(cells(rows[0])[6]).toBe('');              // lastInitiatedAt null
    expect(cells(rows[1])[6]).toBe('Jun 20, 2026');  // lastInitiatedAt set
    expect(cells(rows[1])[5]).toBe('HR Reviewer');   // initiatedBy
  });

  test('a hire with no hire date on record leaves that cell empty rather than printing "Invalid date"', () => {
    const { container } = renderOnboarding({
      onboarding: [{ ...onboardingRows[0], dateHired: null }],
    });

    expect(cells(bodyRows(container)[0])[4]).toBe('');
  });

  test('Send Link sends the invitation for that hire and then refreshes the roster', async () => {
    const { getAllByText } = renderOnboarding({ onboarding: onboardingRows });
    jest.clearAllMocks();

    await act(async () => {
      fireEvent.click(getAllByText(/Send Link/)[0].closest('button'));
    });

    expect(sendNeoOnboardingLink).toHaveBeenCalledWith('guid-new', 88, 'Philippines');
    expect(fetchNeoOnboardingUsers).toHaveBeenCalledWith('Philippines');
    // the refresh must come after the send, otherwise the row keeps its stale state
    expect(mockDispatch.mock.calls.map((c) => c[0].type)).toEqual([
      'STUB_SEND_LINK', 'STUB_FETCH_ONBOARDING',
    ]);
  });

  test('the Send Link button is locked only once the hire has both an initiator and an initiation date', () => {
    const { container } = renderOnboarding({ onboarding: onboardingRows });
    const buttons = container.querySelectorAll('tbody button');

    expect(buttons[0]).not.toBeDisabled(); // never initiated
    expect(buttons[1]).toBeDisabled();     // initiated by HR Reviewer on Jun 20
  });

  test('a hire initiated by somebody but with no recorded date is still sendable', () => {
    const { container } = renderOnboarding({
      onboarding: [{ ...onboardingRows[1], lastInitiatedAt: null }],
    });

    expect(container.querySelector('tbody button')).not.toBeDisabled();
  });
});

describe('NEO Report -> Submission Report', () => {
  test('opening the report asks for the submissions of the reviewer own country', () => {
    renderSubmissions({ submissions: submissionRows });

    expect(fetchNeoSubmissionUsers).toHaveBeenCalledWith('Philippines');
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'STUB_FETCH_SUBMISSIONS', country: 'Philippines' });
  });

  test('an empty report shows "No results found" and draws no table', () => {
    const { container, getByText } = renderSubmissions({ submissions: [] });

    expect(getByText('No results found')).toBeInTheDocument();
    expect(container.querySelectorAll('table').length).toBe(0);
  });

  test('before the submissions arrive the table shell is drawn with its headers but no rows', () => {
    const { container, queryByText } = renderSubmissions({ submissions: undefined });

    expect(queryByText('No results found')).toBeNull();
    expect(container.querySelector('thead').textContent).toContain('Days Pending');
    expect(bodyRows(container).length).toBe(0);
  });

  test('each submission becomes one row with its counts, status and formatted submission dates', () => {
    const { container } = renderSubmissions({ submissions: submissionRows });
    const rows = bodyRows(container);

    expect(rows.length).toBe(2);
    expect(cells(rows[0]).slice(0, 10)).toEqual([
      'BHR-003', 'Ana Cruz', 'ana.cruz@eastvantage.com', '4',
      'Jul 02, 2026', 'Jul 05, 2026', '2', '1', '3', 'For Review',
    ]);
  });

  test('a submission with no dates recorded leaves both date cells empty', () => {
    const { container } = renderSubmissions({ submissions: submissionRows });
    const secondRow = cells(bodyRows(container)[1]);

    expect(secondRow[4]).toBe('');
    expect(secondRow[5]).toBe('');
    expect(secondRow[9]).toBe('Completed');
  });

  test('the view action links to that employee submission details page by guid', () => {
    const { container } = renderSubmissions({ submissions: submissionRows });
    const links = container.querySelectorAll('tbody a');

    expect(links[0].getAttribute('href')).toBe('/app/neo/submissions/guid-sub');
    expect(links[1].getAttribute('href')).toBe('/app/neo/submissions/guid-nodate');
    expect(links[0].getAttribute('title')).toBe('View NEO Submissions');
  });
});
