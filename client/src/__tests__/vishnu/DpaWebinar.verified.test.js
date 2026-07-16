// VERIFIED-BACKED — generated 2026-07-07 from dpa-webinar.registry.md (vetted by Gobi Singaravel on 2026-06-29)
/**
 * @registry-doc dpa-webinar.registry.md
 * @vetted-by    Gobi Singaravel
 * @vetted-on    2026-06-29
 *
 * Validation Rules (from [DEVELOPER VETTING], confirmed staging 2026-07-01):
 *   Field   : confirm (checkbox)
 *   Required: yes
 *   Error   : "Please tick the checkbox to confirm the submission."
 *
 * Form fields confirmed in DOM:
 *   input[name="confirm"] — standard Formik checkbox; name attr preserved in HTML
 *   button[type="submit"] — label "Submit"; class-based selectors unreliable (copy-paste bug)
 */

import React from 'react';
import { render, screen, fireEvent, wait as waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

// ---------------------------------------------------------------------------
// Core mocks
// ---------------------------------------------------------------------------
jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => jest.fn(),
    useSelector: () => ({}),
}));

jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);

jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader:  ({ children }) => <div>{children}</div>,
    Content:          ({ children }) => <div>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
    Row:              ({ children }) => <div>{children}</div>,
    Col:              ({ children }) => <div>{children}</div>,
}));

// ---------------------------------------------------------------------------
// DPA-specific mocks
// ---------------------------------------------------------------------------

// ReactPlayer is lazy-loaded and wraps a <video>; stub it to a simple video stub.
// DPAForm imports the lazy build (`react-player/lazy`), so that is the specifier to mock.
jest.mock('react-player/lazy', () => {
    const MockPlayer = ({ onProgress, onEnded, ...rest }) => (
        <div data-testid="react-player">
            <button
                data-testid="simulate-progress"
                onClick={() => onProgress && onProgress({ playedSeconds: 1395, played: 1 })}
            >
                Simulate 23:15
            </button>
            <button
                data-testid="simulate-ended"
                onClick={() => onEnded && onEnded()}
            >
                Simulate End
            </button>
        </div>
    );
    return MockPlayer;
});

// tickDpa Redux action — stub to resolve immediately
jest.mock('../../store/actions/profile/profileActions', () => ({
    tickDpa: (userId) => ({ type: 'DPA_TICK', payload: userId }),
}));

// axios stub — POST /api/user/{id}/tick_dpa returns 200 with dpa_ticked_at
jest.mock('axios', () => ({
    post: jest.fn().mockResolvedValue({
        data: {
            dpa_ticked_at: '2026-06-29 09:11:12',
            id: 1,
        },
        status: 200,
    }),
    get:    jest.fn().mockResolvedValue({ data: {}, status: 200 }),
    create: jest.fn().mockReturnThis(),
    defaults: { headers: { common: {} } },
}));

// ---------------------------------------------------------------------------
// Import DPAForm component
// ---------------------------------------------------------------------------
let DPAForm;
try {
    const m = require('../../container/DPAForm/DPAForm');
    DPAForm = m.DPAForm || m.default;
} catch {
    DPAForm = require('../../container/DPAForm/DPAForm').default;
}

// ---------------------------------------------------------------------------
// Default props — mirrors DPAForm mapStateToProps
// New user (dpa_ticked_at == null) so the form path is exercised
// ---------------------------------------------------------------------------
const defaultProps = {
    user: {
        id: 1,
        full_name: 'Test Employee',
        dpa_ticked_at: null, // not yet completed — confirmation form will be shown after threshold
    },
    tickDpa: jest.fn(),
    dispatch: jest.fn(),
    history: { push: jest.fn() },
    match:   { params: {} },
};

// Completed user — dpa_ticked_at is set; confirmation form is NOT rendered
const completedUserProps = {
    ...defaultProps,
    user: {
        ...defaultProps.user,
        dpa_ticked_at: '2023-05-12 04:39:58',
    },
};

function renderDPAForm(props = {}) {
    return render(
        <MemoryRouter>
            <DPAForm {...defaultProps} {...props} />
        </MemoryRouter>
    );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('DpaWebinar component', () => {
    beforeEach(() => jest.clearAllMocks());

    // -----------------------------------------------------------------------
    // Render smoke tests
    // -----------------------------------------------------------------------
    describe('Render', () => {
        it('renders without crashing for a new user (dpa_ticked_at == null)', () => {
            expect(() => renderDPAForm()).not.toThrow();
        });

        it('renders without crashing for an already-completed user (dpa_ticked_at set)', () => {
            expect(() => renderDPAForm(completedUserProps)).not.toThrow();
        });

        it('renders the ReactPlayer stub', () => {
            renderDPAForm();
            expect(screen.getByTestId('react-player')).toBeInTheDocument();
        });
    });

    // -----------------------------------------------------------------------
    // Confirmation form — visibility gating
    // The form is hidden until video threshold (1395 s) or end is reached.
    // -----------------------------------------------------------------------
    describe('Confirmation form — video threshold gating', () => {
        it('confirm checkbox is not visible before video threshold is reached', () => {
            renderDPAForm();
            // Before the user watches to 23:15 the checkbox should not be in the DOM
            // or should not be visible (component conditionally renders the form block).
            const checkbox = document.querySelector('input[name="confirm"]');
            if (checkbox) {
                // If it exists in DOM it must be hidden (display:none / visibility:hidden)
                expect(checkbox).not.toBeVisible();
            } else {
                // Not rendered at all — expected for showSubmitForm == false
                expect(checkbox).toBeNull();
            }
        });

        it('confirm checkbox becomes visible after simulated video progress reaches 1395 s', async () => {
            renderDPAForm();
            const progressBtn = screen.getByTestId('simulate-progress');
            fireEvent.click(progressBtn);
            await waitFor(() => {
                const checkbox = document.querySelector('input[name="confirm"]');
                expect(checkbox).not.toBeNull();
            }, { timeout: 3000 });
        });

        it('confirm checkbox becomes visible after simulated video end', async () => {
            renderDPAForm();
            const endBtn = screen.getByTestId('simulate-ended');
            fireEvent.click(endBtn);
            await waitFor(() => {
                const checkbox = document.querySelector('input[name="confirm"]');
                expect(checkbox).not.toBeNull();
            }, { timeout: 3000 });
        });
    });

    // -----------------------------------------------------------------------
    // Validation Rules — Yup required rule on confirm checkbox
    // Confirmed on staging 2026-07-01: error appears inline below the label.
    // Error message: "Please tick the checkbox to confirm the submission."
    // -----------------------------------------------------------------------
    describe('Validation Rules', () => {
        it('shows required error when submit is clicked without ticking the checkbox', async () => {
            renderDPAForm();

            // Simulate video reaching threshold so the form appears
            const progressBtn = screen.getByTestId('simulate-progress');
            fireEvent.click(progressBtn);

            await waitFor(() => {
                expect(document.querySelector('button[type="submit"]')).not.toBeNull();
            }, { timeout: 3000 });

            // Click submit without ticking the checkbox
            const submitBtn = document.querySelector('button[type="submit"]');
            if (submitBtn) {
                fireEvent.click(submitBtn);

                await waitFor(() => {
                    expect(
                        screen.getByText('Please tick the checkbox to confirm the submission.')
                    ).toBeInTheDocument();
                }, { timeout: 3000 });
            }
        });

        it('does NOT show the required error when the checkbox is ticked before submit', async () => {
            renderDPAForm();

            // Simulate video threshold
            fireEvent.click(screen.getByTestId('simulate-progress'));

            await waitFor(() => {
                expect(document.querySelector('input[name="confirm"]')).not.toBeNull();
            }, { timeout: 3000 });

            const checkbox = document.querySelector('input[name="confirm"]');
            const submitBtn = document.querySelector('button[type="submit"]');

            if (checkbox && submitBtn) {
                fireEvent.click(checkbox); // tick the checkbox
                fireEvent.click(submitBtn);

                // After valid submit the Yup error must NOT appear
                await waitFor(() => {
                    const error = screen.queryByText('Please tick the checkbox to confirm the submission.');
                    expect(error).not.toBeInTheDocument();
                }, { timeout: 3000 });
            }
        });

        it('confirm checkbox name attribute is "confirm" (DOM-confirmed by developer)', async () => {
            renderDPAForm();

            // Simulate video threshold to render the form
            fireEvent.click(screen.getByTestId('simulate-progress'));

            await waitFor(() => {
                const checkbox = document.querySelector('input[name="confirm"]');
                expect(checkbox).not.toBeNull();
                if (checkbox) {
                    expect(checkbox.getAttribute('name')).toBe('confirm');
                }
            }, { timeout: 3000 });
        });
    });

    // -----------------------------------------------------------------------
    // Already-completed user — informational mode
    // Confirmed from staging: "Thank you for watching the video!" message shown;
    // confirm checkbox + submit button NOT rendered.
    // -----------------------------------------------------------------------
    describe('Already-completed user (informational mode)', () => {
        it('shows thank-you message for a user with dpa_ticked_at set', () => {
            renderDPAForm(completedUserProps);
            expect(
                screen.getByText(/Thank you for watching the video!/i)
            ).toBeInTheDocument();
        });

        it('does NOT render the confirm checkbox for an already-completed user', () => {
            renderDPAForm(completedUserProps);
            const checkbox = document.querySelector('input[name="confirm"]');
            expect(checkbox).toBeNull();
        });

        it('does NOT render the submit button for an already-completed user', () => {
            renderDPAForm(completedUserProps);
            const submitBtn = document.querySelector('button[type="submit"]');
            expect(submitBtn).toBeNull();
        });
    });
});
