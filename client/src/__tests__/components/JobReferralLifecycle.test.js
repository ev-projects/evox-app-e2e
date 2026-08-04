/**
 * JobReferralLifecycle.test.js
 *
 * SOURCE UNDER TEST : src/components/JobReferal/Referjobs.js
 *                     (+ its data layer src/components/JobReferal/JobReferalapi.js,
 *                      exercised for real via jest.requireActual in the last describe)
 * MENU PATH         : Job Referral -> Refer a Job  (the "Job Referral" form page)
 * 29-JUL COVERAGE   : 102 uncovered lines / 30.1% covered on Referjobs.js
 *
 * FINDINGS characterised in this suite (behaviour asserted AS-IS, nothing fixed):
 *   FINDING_DEADLOAD   - `isLoading` is never set to true, so the "loading" <option>
 *                        branch in the job select is unreachable dead code; the select
 *                        renders silently empty while the fetch is in flight.
 *   FINDING_DEADREFERR - the "Please Select Your Referal Name" validator is gated on
 *                        submitiondata.Refer, a field hardcoded to "1" that no control
 *                        ever writes, so the job-select validator can never render.
 *   FINDING_NOJOB      - the actual job id lives in a separate `jobid` state that is
 *                        never validated: choosing "- Select Job -" submits the literal
 *                        string "_none" as the job id.
 *   FINDING_JOBSTICKY  - a successful submit resets every personal field but NOT the
 *                        chosen job id, so the component keeps a stale job selection.
 *   FINDING_CASE       - the resume extension whitelist is case sensitive; a file named
 *                        "CV.PDF" is rejected as an invalid type.
 *   FINDING_STALEFILE  - rejecting a second upload (bad type / oversized) does not clear
 *                        the previously accepted base64 resume, so the form still submits
 *                        the earlier file.
 *   FINDING_ERRHIDE    - the upload error message is rendered behind `valfile == false`,
 *                        so pressing Apply replaces the specific reason ("Please Select
 *                        PDF,doc,...") with the generic "Please Upload Resume".
 *   FINDING_PHONEREQ   - the mobile number label carries no required marker but submit
 *                        enforces it.
 *   FINDING_DUPSTR     - duplicate-referral detection in ApplyReferaljob is an exact
 *                        string compare on the backend copy; any wording change turns a
 *                        friendly "already applied" notice into a red error alert.
 *
 * ADDITIVE ONLY - no app source and no existing test file was modified.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

// ---------------------------------------------------------------------------
// house mocks
// ---------------------------------------------------------------------------
const mockDispatch = jest.fn((a) => a);

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => mockDispatch,
}));

jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader: ({ children }) => <div>{children}</div>,
    Content: ({ children }) => <div>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody: ({ children }) => <div>{children}</div>,
    Row: ({ children }) => <div>{children}</div>,
    Col: ({ children }) => <div>{children}</div>,
}));

jest.mock('../../components/JobReferal/Referalmachanisam.js', () => () => (
    <div data-testid="referral-mechanics" />
));

jest.mock('../../services/APICALL.js', () => ({ call: jest.fn() }));
jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn(), default: jest.fn() }));

// react-bootstrap: Form.Check must forward its ref to a real DOM node because
// handleSubmit calls textInput5.focus() when the terms box is unticked.
jest.mock('react-bootstrap', () => {
    const R = require('react');
    const Form = ({ children }) => <div>{children}</div>;
    Form.Group = ({ children }) => <div>{children}</div>;
    Form.Check = R.forwardRef(({ label, onChange, checked, value }, ref) => (
        <div ref={ref} tabIndex="-1" data-testid="terms-wrapper">
            <input
                type="checkbox"
                data-testid="terms"
                value={value}
                checked={!!checked}
                onChange={onChange}
            />
            <span>{label}</span>
        </div>
    ));
    const Accordion = ({ children }) => <div>{children}</div>;
    Accordion.Toggle = ({ children }) => <div>{children}</div>;
    Accordion.Collapse = ({ children }) => <div>{children}</div>;
    const Card = ({ children }) => <div>{children}</div>;
    Card.Header = ({ children }) => <div>{children}</div>;
    Card.Body = ({ children }) => <div>{children}</div>;
    return {
        Form,
        Card,
        Accordion,
        Button: ({ children, onClick, type }) => (
            <button type={type} onClick={onClick}>{children}</button>
        ),
    };
});

// job fixture is swapped per test; read lazily inside the mock implementation
const mockJobFixture = { list: [] };

jest.mock('../../components/JobReferal/JobReferalapi.js', () => ({
    FecthJobdetails: jest.fn((setJobdetails) => {
        setJobdetails(mockJobFixture.list);
        return { type: 'STUB_FETCH_JOBS' };
    }),
    ApplyReferaljob: jest.fn((...args) => ({ type: 'STUB_APPLY', args })),
}));

global.links = new Proxy({}, { get: () => '/x/' });

const { ApplyReferaljob, FecthJobdetails } = require('../../components/JobReferal/JobReferalapi.js');
const APICALL = require('../../services/APICALL.js');
const Referjobs = require('../../components/JobReferal/Referjobs').default;

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
const JOBS = [
    { jobid: 7, jobCategory: 'QA Engineer' },
    { jobid: 8, jobCategory: 'PHP Developer' },
    { jobid: 9, jobCategory: 'Customer Service Associate' },
];

const RESUME_TEXT = 'cv-content';
const RESUME_B64 = global.btoa(RESUME_TEXT);

/**
 * DETERMINISTIC FileReader — this fixes a real flake, do not remove it.
 *
 * Referjobs.convertToBase64() wraps FileReader in a Promise and the caller awaits it, so every
 * assertion about the submitted resume depends on that load event having fired. jsdom dispatches
 * it on a timer, which means a single macrotask flush is enough only when the machine is idle.
 * Under a parallel Jest run this suite failed roughly one run in three — always the same ten
 * tests in the "successful submit" block, because the resume had not landed in state yet.
 *
 * Swapping in a reader that resolves on a microtask removes the scheduling variance. The
 * component's own onload handler still runs and still produces the data-url it produces in the
 * browser, so nothing about what is being tested changes — only when it settles.
 */
class DeterministicFileReader {
    readAsDataURL(file) {
        this.result = 'data:' + (file.type || '') + ';base64,' + global.btoa(RESUME_TEXT);
        Promise.resolve().then(() => {
            if (this.onload) this.onload({ target: this });
        });
    }
}
global.FileReader = DeterministicFileReader;

const baseProps = { user: { id: 1, emp_num: '1001', name: 'Vishnu' } };

function renderReferjobs(props = {}) {
    return render(
        <MemoryRouter>
            <Referjobs {...baseProps} {...props} />
        </MemoryRouter>
    );
}

const flush = async () => {
    await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
    });
};

function makeFile(name, type, sizeKB) {
    const f = new File([RESUME_TEXT], name, { type });
    if (sizeKB !== undefined) Object.defineProperty(f, 'size', { value: sizeKB * 1024 });
    return f;
}

const fileInputOf = (utils) => utils.container.querySelector('input[type="file"]');
const phoneInputOf = (utils) => utils.getAllByPlaceholderText("Referral's Mobile Number")[0];

async function uploadResume(utils, file) {
    fireEvent.change(fileInputOf(utils), { target: { files: [file] } });
    await flush();
}

/** fills every field the submit guard requires, minus the resume + terms. */
function fillRequiredText(utils) {
    fireEvent.change(utils.getByPlaceholderText('Referal Name'), { target: { value: 'Juan' } });
    fireEvent.change(utils.getByPlaceholderText('Last Name'), { target: { value: 'Reyes' } });
    fireEvent.change(utils.getByPlaceholderText("Referral's Email"), { target: { value: 'juan.reyes@ev.com' } });
    fireEvent.change(phoneInputOf(utils), { target: { value: '09171234567' } });
}

async function fillCompleteForm(utils, { job = '7' } = {}) {
    fillRequiredText(utils);
    fireEvent.change(utils.getByPlaceholderText('Middle Name'), { target: { value: 'Santos' } });
    fireEvent.change(utils.getByPlaceholderText('Nick Name'), { target: { value: 'JR' } });
    fireEvent.change(utils.getByPlaceholderText('Address'), { target: { value: '12 Ayala Ave' } });
    fireEvent.change(utils.getByPlaceholderText('City'), { target: { value: 'Makati' } });
    await uploadResume(utils, makeFile('cv.pdf', 'application/pdf'));
    if (job !== null) {
        fireEvent.change(utils.container.querySelector('select'), { target: { value: job } });
    }
    fireEvent.click(utils.getByTestId('terms'));
}

const clickApply = async (utils) => {
    fireEvent.click(utils.getByText(/Apply/));
    await flush();
};

beforeEach(() => {
    jest.clearAllMocks();
    mockJobFixture.list = JOBS;
});

// ---------------------------------------------------------------------------
describe('Job Referral -> job list load', () => {
    test('mounting the page fetches the posted-job list exactly once and hands it a setter', () => {
        renderReferjobs();
        expect(FecthJobdetails).toHaveBeenCalledTimes(1);
        expect(typeof FecthJobdetails.mock.calls[0][0]).toBe('function');
    });

    test('the fetch action produced on mount is the object handed to dispatch', () => {
        renderReferjobs();
        expect(mockDispatch).toHaveBeenCalledWith({ type: 'STUB_FETCH_JOBS' });
    });

    test('a populated job list renders one option per posted job, keyed on the job id', () => {
        const utils = renderReferjobs();
        const options = Array.from(utils.container.querySelectorAll('select option'));
        expect(options.map((o) => o.value)).toEqual(['_none', '7', '8', '9']);
        expect(options.map((o) => o.textContent)).toEqual([
            '- Select Job -', 'QA Engineer', 'PHP Developer', 'Customer Service Associate',
        ]);
    });

    test('an empty job list leaves only the placeholder option in the select', () => {
        mockJobFixture.list = [];
        const utils = renderReferjobs();
        const options = utils.container.querySelectorAll('select option');
        expect(options).toHaveLength(1);
        expect(options[0].value).toBe('_none');
    });

    // FINDING_DEADLOAD: setIsLoading is declared but never called, so `isLoading` is
    // permanently false and the <option value=""></option> loading branch is dead code.
    // The user gets no in-flight feedback at all - the select just looks empty.
    test('the loading option never renders because isLoading is never toggled_FINDING_DEADLOAD', () => {
        const utils = renderReferjobs();
        const blank = Array.from(utils.container.querySelectorAll('select option'))
            .filter((o) => o.value === '' && o.textContent === '');
        expect(blank).toHaveLength(0);
        expect(utils.container.querySelectorAll('select option')).toHaveLength(JOBS.length + 1);
    });
});

// ---------------------------------------------------------------------------
describe('Job Referral -> form field entry', () => {
    test('the referral name typed by the user is held in form state', () => {
        const utils = renderReferjobs();
        const input = utils.getByPlaceholderText('Referal Name');
        fireEvent.change(input, { target: { value: 'Juan' } });
        expect(input.value).toBe('Juan');
    });

    test('the optional middle name, nick name, address and city are all retained', () => {
        const utils = renderReferjobs();
        const pairs = [['Middle Name', 'Santos'], ['Nick Name', 'JR'], ['Address', '12 Ayala Ave'], ['City', 'Makati']];
        pairs.forEach(([placeholder, value]) => {
            const el = utils.getByPlaceholderText(placeholder);
            fireEvent.change(el, { target: { value } });
            expect(el.value).toBe(value);
        });
    });

    test('a mobile number shorter than 14 characters is accepted', () => {
        const utils = renderReferjobs();
        const phone = phoneInputOf(utils);
        fireEvent.change(phone, { target: { value: '1234567890123' } }); // 13 chars
        expect(phone.value).toBe('1234567890123');
    });

    test('the 14th character of a mobile number is rejected and the field keeps its old value', () => {
        const utils = renderReferjobs();
        const phone = phoneInputOf(utils);
        fireEvent.change(phone, { target: { value: '1234567890123' } });
        fireEvent.change(phone, { target: { value: '12345678901234' } }); // 14 chars - guarded
        expect(phone.value).toBe('1234567890123');
    });

    test('picking a job from the select clears any pending job validation flag', () => {
        const utils = renderReferjobs();
        const select = utils.container.querySelector('select');
        fireEvent.change(select, { target: { value: '8' } });
        expect(select.value).toBe('8');
        expect(utils.queryByText(/Please Select Your Referal Name/)).toBeNull();
    });
});

// ---------------------------------------------------------------------------
describe('Job Referral -> required field validation', () => {
    test('submitting an empty form raises every required-field message at once', async () => {
        const utils = renderReferjobs();
        await clickApply(utils);
        utils.getByText(/Please Enter ReferalName/);
        utils.getByText(/Please Enter LastName/);
        utils.getByText(/Please Enter EmailID/);
        utils.getByText(/Please Enter MobileNumber/);
        utils.getByText(/Please Upload Resume/);
        utils.getByText(/Please select the terms/);
    });

    test('submitting an empty form never reaches the apply action', async () => {
        const utils = renderReferjobs();
        await clickApply(utils);
        expect(ApplyReferaljob).not.toHaveBeenCalled();
        expect(mockDispatch).toHaveBeenCalledTimes(1); // only the mount fetch
    });

    test('typing a referral name clears its own error message immediately', async () => {
        const utils = renderReferjobs();
        await clickApply(utils);
        utils.getByText(/Please Enter ReferalName/);
        fireEvent.change(utils.getByPlaceholderText('Referal Name'), { target: { value: 'Juan' } });
        expect(utils.queryByText(/Please Enter ReferalName/)).toBeNull();
        utils.getByText(/Please Enter LastName/); // the other errors survive
    });

    test('typing a last name clears only the last-name error', async () => {
        const utils = renderReferjobs();
        await clickApply(utils);
        fireEvent.change(utils.getByPlaceholderText('Last Name'), { target: { value: 'Reyes' } });
        expect(utils.queryByText(/Please Enter LastName/)).toBeNull();
        utils.getByText(/Please Enter EmailID/);
    });

    test('typing an email clears the email error even before the format is checked again', async () => {
        const utils = renderReferjobs();
        await clickApply(utils);
        fireEvent.change(utils.getByPlaceholderText("Referral's Email"), { target: { value: 'x' } });
        expect(utils.queryByText(/Please Enter EmailID/)).toBeNull();
    });

    test('typing a mobile number clears the mobile-number error', async () => {
        const utils = renderReferjobs();
        await clickApply(utils);
        fireEvent.change(phoneInputOf(utils), { target: { value: '09171234567' } });
        expect(utils.queryByText(/Please Enter MobileNumber/)).toBeNull();
    });

    test('an email without an @ and a dot is rejected on submit', async () => {
        const utils = renderReferjobs();
        fillRequiredText(utils);
        fireEvent.change(utils.getByPlaceholderText("Referral's Email"), { target: { value: 'juan.reyes' } });
        await uploadResume(utils, makeFile('cv.pdf', 'application/pdf'));
        fireEvent.click(utils.getByTestId('terms'));
        await clickApply(utils);
        utils.getByText(/Please Enter EmailID/);
        expect(ApplyReferaljob).not.toHaveBeenCalled();
    });

    test('a well formed email raises no email error when other fields are missing', async () => {
        const utils = renderReferjobs();
        fireEvent.change(utils.getByPlaceholderText("Referral's Email"), { target: { value: 'juan@ev.com' } });
        await clickApply(utils);
        expect(utils.queryByText(/Please Enter EmailID/)).toBeNull();
        utils.getByText(/Please Enter ReferalName/);
    });

    test('an otherwise complete form is blocked while the referral mechanics box is unticked', async () => {
        const utils = renderReferjobs();
        await fillCompleteForm(utils);
        fireEvent.click(utils.getByTestId('terms')); // untick again
        await clickApply(utils);
        utils.getByText(/Please select the terms/);
        expect(ApplyReferaljob).not.toHaveBeenCalled();
    });

    test('ticking the referral mechanics box clears the terms error', async () => {
        const utils = renderReferjobs();
        await clickApply(utils);
        utils.getByText(/Please select the terms/);
        fireEvent.click(utils.getByTestId('terms'));
        expect(utils.queryByText(/Please select the terms/)).toBeNull();
        expect(utils.getByTestId('terms').checked).toBe(true);
    });

    test('ticking then unticking the box restores the unaccepted state', async () => {
        const utils = renderReferjobs();
        const box = utils.getByTestId('terms');
        fireEvent.click(box);
        fireEvent.click(box);
        expect(box.checked).toBe(false);
        await clickApply(utils);
        utils.getByText(/Please select the terms/);
    });

    // FINDING_DEADREFERR: the job-select error span is gated on submitiondata.Refer,
    // which is initialised to "1" and is never written by any control. handleSubmit's
    // `if (submitiondata.Refer == "")` therefore can never be true, so this validator
    // is unreachable - and its copy ("Please Select Your Referal Name") is wrong for a
    // job dropdown anyway.
    test('the job-select validator can never fire because Refer is hardcoded_FINDING_DEADREFERR', async () => {
        const utils = renderReferjobs();
        await clickApply(utils); // nothing chosen in the job select at all
        expect(utils.queryByText(/Please Select Your Referal Name/)).toBeNull();
    });

    // FINDING_PHONEREQ: every other mandatory field paints a red asterisk in its label;
    // the mobile number does not, yet submit hard-blocks on it.
    test('the mobile number is enforced although its label shows no required marker_FINDING_PHONEREQ', async () => {
        const utils = renderReferjobs();
        const label = utils.getByText(/Referral's Mobile Number \(Along With Code\)/);
        expect(label.querySelector('span')).toBeNull();
        await clickApply(utils);
        utils.getByText(/Please Enter MobileNumber/);
    });
});

// ---------------------------------------------------------------------------
describe('Job Referral -> resume upload', () => {
    test('a pdf resume is accepted and raises no upload error', async () => {
        const utils = renderReferjobs();
        await uploadResume(utils, makeFile('cv.pdf', 'application/pdf'));
        expect(utils.queryByText(/File size is Grater than 5MB/)).toBeNull();
        expect(utils.queryByText(/Please Select PDF/)).toBeNull();
    });

    test.each([
        ['scan.png', 'image/png'],
        ['scan.jpeg', 'image/jpeg'],
        ['cv.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        ['cv.odt', 'application/vnd.oasis.opendocument.text'],
    ])('the whitelisted resume type %s is accepted', async (name, type) => {
        const utils = renderReferjobs();
        await uploadResume(utils, makeFile(name, type));
        expect(utils.queryByText(/Please Select PDF/)).toBeNull();
    });

    test('an executable is rejected with the allowed-types message', async () => {
        const utils = renderReferjobs();
        await uploadResume(utils, makeFile('virus.exe', 'application/x-msdownload'));
        utils.getByText('Please Select PDF,doc,docx,jpg,png,jpeg File');
    });

    test('a plain text resume is rejected with the allowed-types message', async () => {
        const utils = renderReferjobs();
        await uploadResume(utils, makeFile('cv.txt', 'text/plain'));
        utils.getByText('Please Select PDF,doc,docx,jpg,png,jpeg File');
    });

    test('a file larger than 5MB is rejected with the size message', async () => {
        const utils = renderReferjobs();
        await uploadResume(utils, makeFile('cv.pdf', 'application/pdf', 6 * 1024));
        utils.getByText('File size is Grater than 5MB');
    });

    test('a file of exactly 5120KB sits on the allowed side of the size limit', async () => {
        const utils = renderReferjobs();
        await uploadResume(utils, makeFile('cv.pdf', 'application/pdf', 5120));
        expect(utils.queryByText(/File size is Grater than 5MB/)).toBeNull();
    });

    // FINDING_CASE: the extension test compares the raw popped extension against
    // lower-case literals, so anything a phone or scanner names "CV.PDF" is bounced.
    test('an uppercase extension is rejected by the case-sensitive whitelist_FINDING_CASE', async () => {
        const utils = renderReferjobs();
        await uploadResume(utils, makeFile('CV.PDF', 'application/pdf'));
        utils.getByText('Please Select PDF,doc,docx,jpg,png,jpeg File');
    });

    // FINDING_STALEFILE: the reject branches return early without clearing
    // submitiondata.myFile, so the first (accepted) resume is still submitted while the
    // user is looking at an error telling them their upload failed.
    test('a rejected second upload still submits the first resume_FINDING_STALEFILE', async () => {
        const utils = renderReferjobs();
        fillRequiredText(utils);
        await uploadResume(utils, makeFile('cv.pdf', 'application/pdf'));
        await uploadResume(utils, makeFile('virus.exe', 'application/x-msdownload'));
        utils.getByText('Please Select PDF,doc,docx,jpg,png,jpeg File');

        fireEvent.change(utils.container.querySelector('select'), { target: { value: '7' } });
        fireEvent.click(utils.getByTestId('terms'));
        await clickApply(utils);

        expect(ApplyReferaljob).toHaveBeenCalledTimes(1);
        expect(ApplyReferaljob.mock.calls[0][9]).toBe(RESUME_B64);
    });

    // FINDING_ERRHIDE: `{isSuccess && valfile == false && ...}` means the moment submit
    // sets valfile the precise upload reason is swapped for the generic prompt.
    test('pressing Apply hides the upload reason behind the generic prompt_FINDING_ERRHIDE', async () => {
        const utils = renderReferjobs();
        await uploadResume(utils, makeFile('virus.exe', 'application/x-msdownload'));
        utils.getByText('Please Select PDF,doc,docx,jpg,png,jpeg File');
        await clickApply(utils);
        expect(utils.queryByText('Please Select PDF,doc,docx,jpg,png,jpeg File')).toBeNull();
        utils.getByText(/Please Upload Resume/);
    });
});

// ---------------------------------------------------------------------------
describe('Job Referral -> successful submit', () => {
    test('a complete form dispatches the apply action exactly once', async () => {
        const utils = renderReferjobs();
        await fillCompleteForm(utils);
        await clickApply(utils);
        expect(ApplyReferaljob).toHaveBeenCalledTimes(1);
        expect(mockDispatch).toHaveBeenCalledWith({ type: 'STUB_APPLY', args: expect.any(Array) });
    });

    test('every field is passed to the apply action in the exact positional order the API layer expects', async () => {
        const utils = renderReferjobs();
        await fillCompleteForm(utils);
        await clickApply(utils);
        expect(ApplyReferaljob.mock.calls[0]).toEqual([
            '7',                  // jobid  (string, straight off the select)
            'Juan',               // fName
            'Santos',             // Mname
            'Reyes',              // lName
            'JR',                 // Nname
            'juan.reyes@ev.com',  // email
            '09171234567',        // MobileNumber
            '12 Ayala Ave',       // Address
            'Makati',             // City
            RESUME_B64,           // resume, data-url prefix stripped
            '1001',               // referrer emp_num from the logged-in user
        ]);
    });

    test('the referring employee number comes from the logged-in user prop', async () => {
        const utils = renderReferjobs({ user: { emp_num: 'EV-9999' } });
        await fillCompleteForm(utils);
        await clickApply(utils);
        expect(ApplyReferaljob.mock.calls[0][10]).toBe('EV-9999');
    });

    test('the resume travels as raw base64 with the data-url prefix removed', async () => {
        const utils = renderReferjobs();
        await fillCompleteForm(utils);
        await clickApply(utils);
        const sent = ApplyReferaljob.mock.calls[0][9];
        expect(sent).toBe(RESUME_B64);
        expect(sent.startsWith('data:')).toBe(false);
    });

    test('a successful submit clears every personal field on the form', async () => {
        const utils = renderReferjobs();
        await fillCompleteForm(utils);
        await clickApply(utils);
        ['Referal Name', 'Last Name', 'Middle Name', 'Nick Name', "Referral's Email", 'Address', 'City']
            .forEach((p) => expect(utils.getByPlaceholderText(p).value).toBe(''));
        expect(phoneInputOf(utils).value).toBe('');
    });

    test('a successful submit unticks the referral mechanics box and clears the file input', async () => {
        const utils = renderReferjobs();
        await fillCompleteForm(utils);
        expect(utils.getByTestId('terms').checked).toBe(true);
        await clickApply(utils);
        expect(utils.getByTestId('terms').checked).toBe(false);
        expect(fileInputOf(utils).value).toBe('');
    });

    test('re-pressing Apply after a success is blocked because the resume was cleared', async () => {
        const utils = renderReferjobs();
        await fillCompleteForm(utils);
        await clickApply(utils);
        expect(ApplyReferaljob).toHaveBeenCalledTimes(1);
        await clickApply(utils);
        expect(ApplyReferaljob).toHaveBeenCalledTimes(1);
        utils.getByText(/Please Upload Resume/);
    });

    // FINDING_JOBSTICKY: the reset object rebuilds every name/contact field but leaves
    // the separate `jobid` state untouched, so the previous job stays armed.
    test('the chosen job survives a successful submit_FINDING_JOBSTICKY', async () => {
        const utils = renderReferjobs();
        await fillCompleteForm(utils, { job: '8' });
        await clickApply(utils);
        expect(ApplyReferaljob.mock.calls[0][0]).toBe('8');
        expect(utils.container.querySelector('select').value).toBe('8');
    });

    // FINDING_NOJOB: handleSubmit validates submitiondata.Refer (hardcoded "1") instead
    // of the jobid state, so the placeholder option is submitted verbatim and the
    // backend receives a referral against job "_none".
    test('choosing the placeholder option submits the literal "_none" as the job id_FINDING_NOJOB', async () => {
        const utils = renderReferjobs();
        await fillCompleteForm(utils, { job: '_none' });
        await clickApply(utils);
        expect(ApplyReferaljob).toHaveBeenCalledTimes(1);
        expect(ApplyReferaljob.mock.calls[0][0]).toBe('_none');
    });
});

// ---------------------------------------------------------------------------
// The data layer, exercised for real (the component-facing mock above is bypassed
// with requireActual) against a mocked APICALL.
// ---------------------------------------------------------------------------
describe('Job Referral -> data layer thunks', () => {
    const realApi = jest.requireActual('../../components/JobReferal/JobReferalapi.js');
    let dispatched;
    const fakeDispatch = jest.fn((a) => { dispatched.push(a); return a; });
    const getState = () => ({});

    beforeEach(() => {
        dispatched = [];
        fakeDispatch.mockClear();
        APICALL.call.mockReset();
    });

    test('the job fetch asks for every category, location, keyword and contract type', async () => {
        APICALL.call.mockResolvedValue({ status: 200, data: JOBS });
        await realApi.FecthJobdetails(jest.fn())(fakeDispatch, getState);
        expect(APICALL.call).toHaveBeenCalledWith({
            method: 'get',
            url: '/PostedJobs?Category=ALL&Location=ALL&KeyWord=ALL&ContractType=ALL',
        });
    });

    test('a successful job fetch pushes the payload into component state', async () => {
        const setter = jest.fn();
        APICALL.call.mockResolvedValue({ status: 200, data: JOBS });
        await realApi.FecthJobdetails(setter)(fakeDispatch, getState);
        expect(setter).toHaveBeenCalledWith(JOBS);
    });

    test('a successful job fetch also arms the dashboard redirect', async () => {
        APICALL.call.mockResolvedValue({ status: 200, data: [] });
        await realApi.FecthJobdetails(jest.fn())(fakeDispatch, getState);
        expect(dispatched[0]).toEqual({ type: 'SET_REDIRECT', link: '/x/' });
    });

    test('a failed job fetch raises an alert and never touches component state', async () => {
        const setter = jest.fn();
        APICALL.call.mockRejectedValue({ status: 500, data: 'boom' });
        await realApi.FecthJobdetails(setter)(fakeDispatch, getState);
        expect(setter).not.toHaveBeenCalled();
        expect(dispatched[0]).toEqual({ type: 'SHOW_ALERT', error: { status: 500, data: 'boom' }, timeOut: 0 });
    });

    test('applying maps the form arguments onto the PostCandidate payload', async () => {
        APICALL.call.mockResolvedValue({ status: 200, data: 'Thank you for your referral' });
        await realApi.ApplyReferaljob(
            7, 'Juan', 'Santos', 'Reyes', 'JR', 'juan@ev.com', '09171234567',
            '12 Ayala Ave', 'Makati', RESUME_B64, '1001'
        )(fakeDispatch, getState);

        expect(APICALL.call).toHaveBeenCalledWith({
            method: 'post',
            url: '/PostCandidate',
            data: {
                Jobid: 7,
                FirstName: 'Juan',
                MiddleName: 'Santos',
                LastName: 'Reyes',
                NickName: 'JR',
                Email: 'juan@ev.com',
                MobileNo: '09171234567',
                Address: '12 Ayala Ave',
                City: 'Makati',
                HowDoHear: 'Null',
                Acknowledge: '1',
                Resume: RESUME_B64,
                ReferedBy: '1001',
            },
        });
    });

    test('the acknowledgement flag is hardcoded and never reflects the ticked checkbox', async () => {
        APICALL.call.mockResolvedValue({ status: 200, data: 'ok' });
        await realApi.ApplyReferaljob(1, 'a', '', 'b', '', 'a@b.co', '1', '', '', 'x', '9')(fakeDispatch, getState);
        expect(APICALL.call.mock.calls[0][0].data.Acknowledge).toBe('1');
        expect(APICALL.call.mock.calls[0][0].data.HowDoHear).toBe('Null');
    });

    test('a successful referral shows the server message as a 3 second success alert', async () => {
        APICALL.call.mockResolvedValue({ status: 200, data: 'Thank you for your referral' });
        await realApi.ApplyReferaljob(7, 'Juan', '', 'Reyes', '', 'a@b.co', '1', '', '', 'x', '9')(fakeDispatch, getState);
        expect(dispatched[0]).toEqual({
            type: 'SHOW_ALERT',
            header: 'Thank you for your referral',
            timeOut: 3000,
        });
    });

    test('a duplicate referral is surfaced as a friendly success alert, not an error', async () => {
        APICALL.call.mockRejectedValue({
            status: '400',
            data: 'Seems you have applied for this job , Our team will contact you.',
        });
        await realApi.ApplyReferaljob(7, 'Juan', '', 'Reyes', '', 'a@b.co', '1', '', '', 'x', '9')(fakeDispatch, getState);
        expect(dispatched[0]).toEqual({
            type: 'SHOW_ALERT',
            header: 'Seems you have applied for this job , Our team will contact you.',
            timeOut: 3000,
        });
        expect(dispatched[0].error).toBeUndefined();
    });

    test('a 400 carrying any other message falls through to the error alert', async () => {
        APICALL.call.mockRejectedValue({ status: '400', data: 'Resume too large' });
        await realApi.ApplyReferaljob(7, 'Juan', '', 'Reyes', '', 'a@b.co', '1', '', '', 'x', '9')(fakeDispatch, getState);
        expect(dispatched[0].type).toBe('SHOW_ALERT');
        expect(dispatched[0].error).toEqual({ status: '400', data: 'Resume too large' });
    });

    test('an expired session on apply opens the login modal instead of an alert', async () => {
        APICALL.call.mockRejectedValue({ status: 401, data: 'Unauthorized' });
        await realApi.ApplyReferaljob(7, 'Juan', '', 'Reyes', '', 'a@b.co', '1', '', '', 'x', '9')(fakeDispatch, getState);
        expect(dispatched[0]).toEqual({ type: 'SHOW_MODAL_LOGIN' });
    });

    test('an undefined rejection is swallowed by the inner catch and dispatched as a no-op', async () => {
        APICALL.call.mockRejectedValue(undefined);
        await realApi.ApplyReferaljob(7, 'Juan', '', 'Reyes', '', 'a@b.co', '1', '', '', 'x', '9')(fakeDispatch, getState);
        expect(dispatched[0]).toEqual({
            type: 'DO_NOTHING',
            error: 'DUPLICATE_REQUEST_INTERCEPTED',
            timeOut: 0,
        });
    });

    // FINDING_DUPSTR: duplicate detection is `e.data === "<exact backend copy>"`. One
    // extra space, a fixed typo or a translated message and the user sees a red error
    // for what is really a benign "already referred" outcome.
    test('a reworded duplicate message degrades into a red error alert_FINDING_DUPSTR', async () => {
        APICALL.call.mockRejectedValue({
            status: '400',
            data: 'Seems you have applied for this job, our team will contact you.',
        });
        await realApi.ApplyReferaljob(7, 'Juan', '', 'Reyes', '', 'a@b.co', '1', '', '', 'x', '9')(fakeDispatch, getState);
        expect(dispatched[0].header).toBeUndefined();
        expect(dispatched[0].error).toEqual({
            status: '400',
            data: 'Seems you have applied for this job, our team will contact you.',
        });
    });
});
