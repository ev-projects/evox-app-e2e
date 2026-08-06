/**
 * NeoDetailsLifecycle.test.js
 * Full page-lifecycle coverage for components/NeoReport/NeoDetails.js
 * Menu: NEO Report -> Submissions -> (open a submission) -> NEO Submission Details
 *
 * The screen is the HR reviewer's desk for a new-employee onboarding pack: every field
 * the new hire submitted is listed, HR marks each one Approved or Resubmit, writes a
 * note, and Saves - which either approves the whole pack or bounces the marked fields
 * back to the employee. The screen is walked exactly the way HR uses it:
 *
 *   PHASE 1  MOUNT/LOAD    useEffect(..., []) dispatches the submission fetch for the
 *                          employee guid; what the page looks like BEFORE the pack lands
 *   PHASE 2  DATA ARRIVES  props.submission_data -> useEffect -> local state -> rows,
 *                          note box and Save appear; the empty-pack arm keeps them hidden;
 *                          every per-row display arm (value, file, Not Provided, dates,
 *                          Approved label, Master-Data lock)
 *   PHASE 3  USER ACTIONS  Approve / Resubmit marking and the dimming it applies, typing
 *                          in the HR note, Back, opening a file, closing the viewer,
 *                          the rejected-file arm
 *   PHASE 4  SUBMIT        Save with rows still unmarked, Save with no note, the approval
 *                          path and the resubmission path (confirm accepted AND cancelled),
 *                          non-200 answers and rejected requests
 *
 * Characterisation tests (they assert TODAY's behaviour, they do not endorse it):
 *   NEO-DUP-1   the Approve / Resubmit buttons stay clickable after being used (they are
 *               only dimmed), and a second Resubmit click on the SAME row appends a second
 *               copy of that field name, so the employee is asked to resubmit it twice.
 *   NEO-NOTE-1  the required-note check is `if (!hrNote)`, so a note of nothing but spaces
 *               satisfies it and is sent to the server as the approval/resubmission reason.
 *   NEO-STATUS-1 a non-200 answer from the approval endpoint is silently ignored: no error
 *               alert, no redirect, the Save button just appears to do nothing.
 *
 * ADDITIVE ONLY - no existing test touched (evoxtest_NeoDetailsDeep2.test.js still stands).
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

const mockDispatch = jest.fn((a) => a);
jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => mockDispatch,
}));

jest.mock('../../components/GridComponent/AdminLte', () => ({
    ContainerBody:    ({ children }) => <div>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    Content:          ({ children }) => <div>{children}</div>,
}));
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('react-file-viewer', () => () => <div data-testid="file-viewer" />);

jest.mock('react-bootstrap', () => {
    const R = require('react');
    return {
        Table:     ({ children }) => R.createElement('table', null, children),
        Container: ({ children }) => R.createElement('div', null, children),
        Button: ({ children, onClick, type, style, className }) =>
            R.createElement('button', { type, onClick, style, className }, children),
    };
});

jest.mock('react-bootstrap/Modal', () => {
    const R = require('react');
    const Modal = ({ children, show, onHide }) => (show
        ? R.createElement('div', { 'data-testid': 'viewer-modal' },
            R.createElement('button', { 'data-testid': 'viewer-close', onClick: onHide }, 'x'),
            children)
        : null);
    Modal.Header = ({ children }) => R.createElement('div', null, children);
    Modal.Title  = ({ children }) => R.createElement('div', null, children);
    Modal.Body   = ({ children }) => R.createElement('div', null, children);
    return Modal;
});

jest.mock('../../services/API', () => ({ call: jest.fn() }));
jest.mock('../../services/Formatter', () => ({
    alert_success: jest.fn(() => ({ type: 'STUB_ALERT_SUCCESS' })),
    alert_error:   jest.fn(() => ({ type: 'STUB_ALERT_ERROR' })),
}));
jest.mock('../../store/actions/neo/neoActions', () => ({
    fetchNeoSubmissionData: jest.fn((guid) => ({ type: 'STUB_FETCH_NEO', guid })),
}));

import API from '../../services/API';
import Formatter from '../../services/Formatter';
import { fetchNeoSubmissionData } from '../../store/actions/neo/neoActions';

global.links = new Proxy({}, { get: () => '/x/' });
window.URL.createObjectURL = jest.fn(() => 'blob:mock-url');

const NeoDetails = require('../../components/NeoReport/NeoDetails').default;

/* ------------------------------------------------------------------ fixtures */

const FILE_GUID = '123e4567-e89b-12d3-a456-426614174000';

// The pack as the .NET endpoint returns it. The guid row carries NO isApproved /
// isDisabled flags - that is why the strict `=== false` validation skips it.
const PACK = () => ([
    { fieldName: 'guid',             fieldValue: 'e-777-raw' },
    { fieldName: 'firstName',        fieldValue: 'Juan',      submittedAt: '2026-07-01', isApproved: false, isDisabled: false },
    { fieldName: 'validId',          fieldValue: FILE_GUID,   submittedAt: '2026-07-02', isApproved: false, isDisabled: false },
    { fieldName: 'emergencyContact', fieldValue: '{}',        submittedAt: null,         isApproved: false, isDisabled: false },
    { fieldName: 'emailAddress',     fieldValue: 'j@x.com',   submittedAt: '2026-07-03', isApproved: true,  isDisabled: false },
    { fieldName: 'tinNumber',        fieldValue: '123-456',   submittedAt: '2026-07-04', isApproved: false, isDisabled: true },
]);

// A pack HR has nothing left to do on: everything is approved or locked by master data.
const SETTLED_PACK = () => ([
    { fieldName: 'guid',         fieldValue: 'e-777-raw' },
    { fieldName: 'emailAddress', fieldValue: 'j@x.com', submittedAt: '2026-07-03', isApproved: true,  isDisabled: false },
    { fieldName: 'tinNumber',    fieldValue: '123-456', submittedAt: '2026-07-04', isApproved: false, isDisabled: true },
]);

const baseProps = (over = {}) => ({
    user:            { full_name: 'HR Person', country: 'Philippines' },
    bhr_num:         42734,
    submission_data: PACK(),
    params:          { guid: 'g-777' },
    history:         { goBack: jest.fn() },
    ...over,
});

const renderScreen = (props) => render(<NeoDetails {...props} />);

const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

/* ------------------------------------------------------------------ helpers */

// Every visible row of the pack, keyed by the label the screen prints in column 1.
const rowFor = (container, label) =>
    Array.from(container.querySelectorAll('tbody tr'))
        .find((tr) => tr.querySelector('td').textContent === label);

const rowBtn = (tr, text) =>
    Array.from(tr.querySelectorAll('button')).find((b) => b.textContent.trim() === text);

const btn = (container, text) =>
    Array.from(container.querySelectorAll('button')).find((b) => b.textContent.trim() === text);

const noteBox = (container) => container.querySelector('textarea[name="hr_note"]');

const typeNote = (container, value) =>
    fireEvent.change(noteBox(container), { target: { name: 'hr_note', value } });

// Mark the three actionable rows so the "everything is labelled" gate opens.
const markEveryRow = (container, action = 'Approve') => {
    ['FIRST NAME', 'VALID ID', 'EMERGENCY CONTACT'].forEach((label) => {
        fireEvent.click(rowBtn(rowFor(container, label), action));
    });
};

const lastApiCall = () => API.call.mock.calls[API.call.mock.calls.length - 1][0];

const redirects = () =>
    mockDispatch.mock.calls.filter(([a]) => a && a.type === 'SET_REDIRECT');

beforeEach(() => {
    jest.clearAllMocks();
    API.call.mockImplementation(() => Promise.resolve({ status: 200, data: {} }));
});

describe('NEO Submission Details - page lifecycle', () => {

    /* ============================================================ PHASE 1 - MOUNT */

    test('opening_a_submission_asks_the_dotnet_service_for_that_employees_pack_using_the_guid_from_the_route', async () => {
        const props = baseProps();
        renderScreen(props);
        await flush();

        expect(fetchNeoSubmissionData).toHaveBeenCalledTimes(1);
        expect(fetchNeoSubmissionData).toHaveBeenCalledWith('g-777');
        expect(mockDispatch).toHaveBeenCalledWith({ type: 'STUB_FETCH_NEO', guid: 'g-777' });
    });

    test('before_the_pack_arrives_the_reviewer_sees_the_title_and_the_empty_table_but_no_rows_note_box_or_save_button', async () => {
        const { container, getByText, queryByText } = renderScreen(baseProps({ submission_data: undefined }));
        await flush();

        getByText('NEO Submission Details');
        getByText(/review all submitted data and mark any fields/i);
        getByText('Field Required');
        getByText('Data Submitted');
        getByText('Submission Date');

        expect(container.querySelectorAll('tbody tr').length).toBe(0);
        expect(noteBox(container)).toBeNull();
        expect(queryByText(/Save/)).toBeNull();
        expect(queryByText(/Back/)).toBeNull();
    });

    test('the_pack_is_fetched_only_once_no_matter_how_many_times_the_screen_rerenders', async () => {
        const props = baseProps();
        const { rerender } = renderScreen(props);
        await flush();

        rerender(<NeoDetails {...props} />);
        rerender(<NeoDetails {...props} bhr_num={99} />);
        await flush();

        expect(fetchNeoSubmissionData).toHaveBeenCalledTimes(1);
    });

    /* ====================================================== PHASE 2 - DATA ARRIVES */

    test('when_the_pack_lands_after_mount_the_rows_the_note_box_and_the_save_button_all_appear', async () => {
        const props = baseProps({ submission_data: undefined });
        const { container, rerender, getByText } = renderScreen(props);
        await flush();
        expect(container.querySelectorAll('tbody tr').length).toBe(0);

        rerender(<NeoDetails {...props} submission_data={PACK()} />);
        await flush();

        // 6 rows in the pack, the guid row renders as null -> 5 visible
        expect(container.querySelectorAll('tbody tr').length).toBe(5);
        expect(noteBox(container)).toBeInTheDocument();
        expect(getByText(/Save/)).toBeInTheDocument();
        expect(getByText(/Back/)).toBeInTheDocument();
    });

    test('the_internal_guid_row_is_never_shown_to_the_reviewer', async () => {
        const { container, queryByText } = renderScreen(baseProps());
        await flush();

        expect(queryByText('GUID')).toBeNull();
        expect(queryByText('e-777-raw')).toBeNull();
        expect(rowFor(container, 'GUID')).toBeUndefined();
    });

    test('each_row_renders_its_field_label_as_spaced_capitals_with_the_submitted_value_and_the_formatted_submission_date', async () => {
        const { container } = renderScreen(baseProps());
        await flush();

        const first = rowFor(container, 'FIRST NAME');
        expect(first.querySelectorAll('td')[1].textContent).toBe('Juan');
        expect(first.querySelectorAll('td')[2].textContent).toBe('Jul 01, 2026');

        // a stored file guid is not printed - it becomes a View File button
        const id = rowFor(container, 'VALID ID');
        expect(id.querySelectorAll('td')[1].textContent).not.toContain(FILE_GUID);
        expect(rowBtn(id, 'View File')).toBeTruthy();
    });

    test('a_field_the_employee_left_blank_shows_not_provided_and_a_missing_date_leaves_the_date_cell_empty', async () => {
        const { container } = renderScreen(baseProps());
        await flush();

        const empty = rowFor(container, 'EMERGENCY CONTACT');
        expect(empty.querySelectorAll('td')[1].textContent).toBe('Not Provided');
        expect(empty.querySelector('.tba-label')).toBeTruthy();
        expect(empty.querySelectorAll('td')[2].textContent).toBe('');
        // it is still actionable - HR must approve or bounce it like any other field
        expect(rowBtn(empty, 'Approve')).toBeTruthy();
        expect(rowBtn(empty, 'Resubmit')).toBeTruthy();
    });

    test('rows_already_approved_or_locked_by_master_data_show_a_status_label_instead_of_action_buttons', async () => {
        const { container } = renderScreen(baseProps());
        await flush();

        const approved = rowFor(container, 'EMAIL ADDRESS');
        expect(approved.querySelector('.approved-label').textContent).toBe('Approved');
        expect(approved.querySelectorAll('button').length).toBe(0);

        const locked = rowFor(container, 'TIN NUMBER');
        expect(locked.querySelector('.approved-label').textContent).toBe('Master Data already updated');
        expect(locked.querySelectorAll('button').length).toBe(0);
    });

    test('an_empty_pack_still_draws_the_table_but_hides_the_note_box_and_the_save_button', async () => {
        const { container, getByText, queryByText } = renderScreen(baseProps({ submission_data: [] }));
        await flush();

        getByText('Field Required');
        expect(container.querySelectorAll('tbody tr').length).toBe(0);
        expect(noteBox(container)).toBeNull();
        expect(queryByText(/Save/)).toBeNull();
    });

    /* ===================================================== PHASE 3 - USER ACTIONS */

    test('approving_a_row_dims_that_rows_resubmit_button_and_leaves_every_other_row_alone', async () => {
        const { container } = renderScreen(baseProps());
        await flush();

        const first = rowFor(container, 'FIRST NAME');
        expect(rowBtn(first, 'Resubmit').style.opacity).toBe('');

        fireEvent.click(rowBtn(first, 'Approve'));
        await flush();

        const firstAfter = rowFor(container, 'FIRST NAME');
        expect(rowBtn(firstAfter, 'Resubmit').style.opacity).toBe('0.5');
        expect(rowBtn(firstAfter, 'Approve').style.opacity).toBe('');
        // untouched row keeps both buttons at full strength
        const other = rowFor(container, 'VALID ID');
        expect(rowBtn(other, 'Resubmit').style.opacity).toBe('');
        expect(rowBtn(other, 'Approve').style.opacity).toBe('');
    });

    test('marking_a_row_for_resubmission_dims_that_rows_approve_button', async () => {
        const { container } = renderScreen(baseProps());
        await flush();

        fireEvent.click(rowBtn(rowFor(container, 'VALID ID'), 'Resubmit'));
        await flush();

        const row = rowFor(container, 'VALID ID');
        expect(rowBtn(row, 'Approve').style.opacity).toBe('0.5');
        expect(rowBtn(row, 'Resubmit').style.opacity).toBe('');
    });

    test('changing_the_mark_on_a_row_from_resubmit_to_approve_swaps_which_button_is_dimmed', async () => {
        const { container } = renderScreen(baseProps());
        await flush();

        fireEvent.click(rowBtn(rowFor(container, 'FIRST NAME'), 'Resubmit'));
        await flush();
        expect(rowBtn(rowFor(container, 'FIRST NAME'), 'Approve').style.opacity).toBe('0.5');

        fireEvent.click(rowBtn(rowFor(container, 'FIRST NAME'), 'Approve'));
        await flush();
        expect(rowBtn(rowFor(container, 'FIRST NAME'), 'Approve').style.opacity).toBe('');
        expect(rowBtn(rowFor(container, 'FIRST NAME'), 'Resubmit').style.opacity).toBe('0.5');
    });

    test('typing_in_the_hr_note_clears_the_required_field_error_that_a_previous_save_raised', async () => {
        const { container, getByText, queryByText } = renderScreen(baseProps());
        await flush();

        markEveryRow(container);
        fireEvent.click(btn(container, 'Save'));
        await flush();
        getByText('This field is required');

        typeNote(container, 'Checked against the ID');
        await flush();
        expect(queryByText('This field is required')).toBeNull();
    });

    test('pressing_back_returns_to_the_previous_screen_without_sending_anything_to_the_server', async () => {
        const props = baseProps();
        const { container } = renderScreen(props);
        await flush();

        fireEvent.click(btn(container, 'Back'));
        await flush();

        expect(props.history.goBack).toHaveBeenCalledTimes(1);
        expect(API.call).not.toHaveBeenCalled();
    });

    test('viewing_an_uploaded_image_asks_for_it_under_the_employees_bhr_number_and_opens_it_in_the_viewer', async () => {
        API.call.mockImplementation(() => Promise.resolve({
            status: 200,
            data: { content: { success: true, data: { fileContent: btoa('img-bytes'), mimeType: 'image/png' } } },
        }));
        const { container, getByTestId } = renderScreen(baseProps());
        await flush();

        fireEvent.click(rowBtn(rowFor(container, 'VALID ID'), 'View File'));
        await flush();

        expect(lastApiCall()).toEqual({ method: 'get', url: '/get_neo_file/42734/' + FILE_GUID });
        expect(getByTestId('viewer-modal')).toBeInTheDocument();
        // the file blob plus the centred-image HTML wrapper
        expect(window.URL.createObjectURL).toHaveBeenCalledTimes(2);
    });

    test('viewing_a_non_image_upload_skips_the_html_wrapper_and_shows_the_file_blob_straight_away', async () => {
        API.call.mockImplementation(() => Promise.resolve({
            status: 200,
            data: { content: { success: true, data: { fileContent: btoa('pdf-bytes'), mimeType: 'application/pdf' } } },
        }));
        const { container, getByTestId } = renderScreen(baseProps());
        await flush();

        fireEvent.click(rowBtn(rowFor(container, 'VALID ID'), 'View File'));
        await flush();

        expect(getByTestId('viewer-modal')).toBeInTheDocument();
        expect(window.URL.createObjectURL).toHaveBeenCalledTimes(1);
        expect(container.querySelector('iframe').getAttribute('src')).toBe('blob:mock-url');
    });

    test('a_file_the_server_answers_with_a_non_200_status_never_opens_the_viewer', async () => {
        API.call.mockImplementation(() => Promise.resolve({ status: 500, data: {} }));
        const { container, queryByTestId } = renderScreen(baseProps());
        await flush();

        fireEvent.click(rowBtn(rowFor(container, 'VALID ID'), 'View File'));
        await flush();

        expect(queryByTestId('viewer-modal')).toBeNull();
        expect(Formatter.alert_error).not.toHaveBeenCalled();
    });

    test('a_file_request_that_fails_outright_raises_the_error_alert_and_leaves_the_viewer_closed', async () => {
        API.call.mockImplementation(() => Promise.reject(new Error('HTTP 500')));
        const { container, queryByTestId } = renderScreen(baseProps());
        await flush();

        fireEvent.click(rowBtn(rowFor(container, 'VALID ID'), 'View File'));
        await flush();

        expect(Formatter.alert_error).toHaveBeenCalledWith(expect.any(Error));
        expect(mockDispatch).toHaveBeenCalledWith({ type: 'STUB_ALERT_ERROR' });
        expect(queryByTestId('viewer-modal')).toBeNull();
    });

    test('closing_the_file_viewer_hides_the_modal_and_the_next_file_opens_from_scratch', async () => {
        API.call.mockImplementation(() => Promise.resolve({
            status: 200,
            data: { content: { success: true, data: { fileContent: btoa('pdf'), mimeType: 'application/pdf' } } },
        }));
        const { container, getByTestId, queryByTestId } = renderScreen(baseProps());
        await flush();

        fireEvent.click(rowBtn(rowFor(container, 'VALID ID'), 'View File'));
        await flush();
        getByTestId('viewer-modal');

        fireEvent.click(getByTestId('viewer-close'));
        await flush();
        expect(queryByTestId('viewer-modal')).toBeNull();

        fireEvent.click(rowBtn(rowFor(container, 'VALID ID'), 'View File'));
        await flush();
        expect(getByTestId('viewer-modal')).toBeInTheDocument();
    });

    /* ========================================================== PHASE 4 - SUBMIT */

    test('saving_while_some_rows_are_still_unmarked_alerts_the_reviewer_and_never_calls_the_api', async () => {
        const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { container } = renderScreen(baseProps());
        await flush();

        // only two of the three actionable rows are marked
        fireEvent.click(rowBtn(rowFor(container, 'FIRST NAME'), 'Approve'));
        fireEvent.click(rowBtn(rowFor(container, 'VALID ID'), 'Approve'));
        typeNote(container, 'looks fine');
        await flush();

        fireEvent.click(btn(container, 'Save'));
        await flush();

        expect(alertSpy).toHaveBeenCalledWith(
            'Please make sure that all items are labeled as either Approved or Resubmitted.');
        expect(API.call).not.toHaveBeenCalled();
        expect(confirmSpy).not.toHaveBeenCalled();
        alertSpy.mockRestore();
        confirmSpy.mockRestore();
    });

    test('saving_without_a_note_shows_the_required_error_and_never_calls_the_api', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { container, getByText } = renderScreen(baseProps());
        await flush();

        markEveryRow(container);
        fireEvent.click(btn(container, 'Save'));
        await flush();

        getByText('This field is required');
        expect(API.call).not.toHaveBeenCalled();
        expect(confirmSpy).not.toHaveBeenCalled();
        confirmSpy.mockRestore();
    });

    test('approving_every_row_asks_for_confirmation_then_posts_the_approval_and_sends_the_reviewer_back_to_the_submissions_list', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { container } = renderScreen(baseProps());
        await flush();

        markEveryRow(container);
        typeNote(container, 'All documents verified');
        await flush();

        fireEvent.click(btn(container, 'Save'));
        await flush();

        expect(confirmSpy).toHaveBeenCalledWith(
            'Do you confirm that all data submitted by the employee is accurate and that you would like to proceed with the approval process?');
        expect(API.call).toHaveBeenCalledTimes(1);
        expect(lastApiCall()).toEqual({
            method: 'post',
            url: '/approve_submissions/',
            params: {
                guid: 'g-777',
                approvedBy: 'HR Person',
                department: 'Human Resources',
                notes: 'All documents verified',
                country: 'Philippines',
            },
        });
        expect(Formatter.alert_success).toHaveBeenCalled();
        expect(redirects().length).toBe(1);
        confirmSpy.mockRestore();
    });

    test('a_pack_where_nothing_is_left_to_review_saves_the_approval_without_asking_for_row_actions', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
        const { container } = renderScreen(baseProps({ submission_data: SETTLED_PACK() }));
        await flush();

        typeNote(container, 'Nothing outstanding');
        fireEvent.click(btn(container, 'Save'));
        await flush();

        expect(alertSpy).not.toHaveBeenCalled();
        expect(lastApiCall().url).toBe('/approve_submissions/');
        confirmSpy.mockRestore();
        alertSpy.mockRestore();
    });

    test('cancelling_the_approval_confirmation_sends_nothing_and_stays_on_the_page', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
        const { container } = renderScreen(baseProps());
        await flush();

        markEveryRow(container);
        typeNote(container, 'All good');
        await flush();
        fireEvent.click(btn(container, 'Save'));
        await flush();

        expect(confirmSpy).toHaveBeenCalledTimes(1);
        expect(API.call).not.toHaveBeenCalled();
        expect(redirects().length).toBe(0);
        confirmSpy.mockRestore();
    });

    test('marking_one_row_for_resubmission_posts_only_that_field_back_to_the_employee_with_the_reviewers_reason', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { container } = renderScreen(baseProps());
        await flush();

        fireEvent.click(rowBtn(rowFor(container, 'VALID ID'), 'Resubmit'));
        fireEvent.click(rowBtn(rowFor(container, 'FIRST NAME'), 'Approve'));
        fireEvent.click(rowBtn(rowFor(container, 'EMERGENCY CONTACT'), 'Approve'));
        typeNote(container, 'The ID photo is unreadable');
        await flush();

        fireEvent.click(btn(container, 'Save'));
        await flush();

        expect(confirmSpy).toHaveBeenCalledWith(
            'Please confirm that all items labeled as Resubmit will be sent back to the employee for resubmission.');
        expect(lastApiCall()).toEqual({
            method: 'post',
            url: '/request_for_resubmission/',
            params: {
                userGuid: 'g-777',
                fieldsToResubmit: { 0: 'validId' },
                reason: 'The ID photo is unreadable',
                requestedBy: 'HR Person',
                country: 'Philippines',
            },
        });
        expect(redirects().length).toBe(1);
        confirmSpy.mockRestore();
    });

    test('cancelling_the_resubmission_confirmation_sends_nothing_and_keeps_the_marks_on_screen', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
        const { container } = renderScreen(baseProps());
        await flush();

        markEveryRow(container, 'Resubmit');
        typeNote(container, 'Everything needs redoing');
        await flush();
        fireEvent.click(btn(container, 'Save'));
        await flush();

        expect(confirmSpy).toHaveBeenCalledTimes(1);
        expect(API.call).not.toHaveBeenCalled();
        expect(redirects().length).toBe(0);
        // the marks survive the cancelled dialog
        expect(rowBtn(rowFor(container, 'FIRST NAME'), 'Approve').style.opacity).toBe('0.5');
        confirmSpy.mockRestore();
    });

    test('an_approval_the_server_answers_with_a_non_200_status_is_swallowed_with_no_message_and_no_redirect_FINDING_NEO_STATUS_1', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        API.call.mockImplementation(() => Promise.resolve({ status: 422, data: {} }));
        const { container } = renderScreen(baseProps());
        await flush();

        markEveryRow(container);
        typeNote(container, 'All good');
        await flush();
        fireEvent.click(btn(container, 'Save'));
        await flush();

        // FINDING NEO-STATUS-1 (characterised, not endorsed): the .then() only handles
        // status === 200. Any other status falls through with no success alert, no error
        // alert and no redirect - the reviewer clicks Save and nothing at all happens.
        expect(API.call).toHaveBeenCalledTimes(1);
        expect(Formatter.alert_success).not.toHaveBeenCalled();
        expect(Formatter.alert_error).not.toHaveBeenCalled();
        expect(redirects().length).toBe(0);
        confirmSpy.mockRestore();
    });

    test('an_approval_request_that_fails_raises_the_error_alert_and_does_not_redirect', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        API.call.mockImplementation(() => Promise.reject(new Error('network down')));
        const { container } = renderScreen(baseProps());
        await flush();

        markEveryRow(container);
        typeNote(container, 'All good');
        await flush();
        fireEvent.click(btn(container, 'Save'));
        await flush();

        expect(Formatter.alert_error).toHaveBeenCalledWith(expect.any(Error));
        expect(mockDispatch).toHaveBeenCalledWith({ type: 'STUB_ALERT_ERROR' });
        expect(redirects().length).toBe(0);
        confirmSpy.mockRestore();
    });

    test('a_resubmission_request_that_fails_raises_the_error_alert_and_does_not_redirect', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        API.call.mockImplementation(() => Promise.reject(new Error('network down')));
        const { container } = renderScreen(baseProps());
        await flush();

        markEveryRow(container, 'Resubmit');
        typeNote(container, 'Redo everything');
        await flush();
        fireEvent.click(btn(container, 'Save'));
        await flush();

        expect(lastApiCall().url).toBe('/request_for_resubmission/');
        expect(Formatter.alert_error).toHaveBeenCalledWith(expect.any(Error));
        expect(redirects().length).toBe(0);
        confirmSpy.mockRestore();
    });

    test('marking_every_row_for_resubmission_sends_all_of_them_back_in_the_order_they_were_marked', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { container } = renderScreen(baseProps());
        await flush();

        markEveryRow(container, 'Resubmit');
        typeNote(container, 'Pack is incomplete');
        await flush();
        fireEvent.click(btn(container, 'Save'));
        await flush();

        expect(lastApiCall().params.fieldsToResubmit)
            .toEqual({ 0: 'firstName', 1: 'validId', 2: 'emergencyContact' });
        confirmSpy.mockRestore();
    });

    test('changing_a_row_from_resubmit_back_to_approve_drops_it_from_the_resubmission_list_and_closes_the_gap', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { container } = renderScreen(baseProps());
        await flush();

        markEveryRow(container, 'Resubmit');            // {0:firstName, 1:validId, 2:emergencyContact}
        fireEvent.click(rowBtn(rowFor(container, 'FIRST NAME'), 'Approve'));
        typeNote(container, 'Only the ID and contact');
        await flush();
        fireEvent.click(btn(container, 'Save'));
        await flush();

        expect(lastApiCall().params.fieldsToResubmit)
            .toEqual({ 0: 'validId', 1: 'emergencyContact' });
        confirmSpy.mockRestore();
    });

    test('clicking_resubmit_twice_on_the_same_row_asks_the_employee_to_resubmit_that_field_twice_FINDING_NEO_DUP_1', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { container } = renderScreen(baseProps());
        await flush();

        fireEvent.click(rowBtn(rowFor(container, 'VALID ID'), 'Resubmit'));
        await flush();
        // the button is only DIMMED, never disabled (pointerEvents: 'auto'), so a second
        // click lands and appends a duplicate entry
        fireEvent.click(rowBtn(rowFor(container, 'VALID ID'), 'Resubmit'));
        fireEvent.click(rowBtn(rowFor(container, 'FIRST NAME'), 'Approve'));
        fireEvent.click(rowBtn(rowFor(container, 'EMERGENCY CONTACT'), 'Approve'));
        typeNote(container, 'ID unreadable');
        await flush();
        fireEvent.click(btn(container, 'Save'));
        await flush();

        // FINDING NEO-DUP-1 (characterised, not endorsed): handleHrActions keys the new
        // entry on Object.keys(prev).length without checking whether the field is already
        // marked, so the same field is queued twice for resubmission.
        expect(lastApiCall().params.fieldsToResubmit)
            .toEqual({ 0: 'validId', 1: 'validId' });
        confirmSpy.mockRestore();
    });

    test('a_note_made_of_nothing_but_spaces_passes_the_required_check_and_is_sent_as_the_reason_FINDING_NEO_NOTE_1', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { container, queryByText } = renderScreen(baseProps());
        await flush();

        markEveryRow(container);
        typeNote(container, '     ');
        await flush();
        fireEvent.click(btn(container, 'Save'));
        await flush();

        // FINDING NEO-NOTE-1 (characterised, not endorsed): the guard is `if (!hrNote)`,
        // which only rejects the empty string. A whitespace-only note is accepted and
        // stored as the HR justification for approving an onboarding pack.
        expect(queryByText('This field is required')).toBeNull();
        expect(lastApiCall().params.notes).toBe('     ');
        confirmSpy.mockRestore();
    });
});
