/**
 * ProfileAndPasswordLifecycle.test.js
 *
 * SOURCE FILES UNDER TEST
 *   src/container/Profile/PersonalInformation/PersonalInformation.js
 *   src/components/ChangePasswordForm/ChangePasswordForm.js
 *   src/components/ChangePasswordFormComponent/ChangePasswordFormComponent.js
 *
 * MENU PATH
 *   Employee list -> Profile -> Personal Information tab   (PersonalInformation.js)
 *   Personal Information -> [Change Password] button       (ChangePasswordFormComponent.js)
 *   any protected route while user.force_change_password   (ChangePasswordForm.js, forced reset)
 *
 * REACHABILITY (re-checked against every render site, not just the imports)
 *   PersonalInformation         - container/Profile/Profile.js:156 renders <PersonalInformation />,
 *                                 and Profile itself is routed at config/RouteList.js:182. LIVE.
 *   ChangePasswordFormComponent - PersonalInformation.js:217, behind the Change Password button,
 *                                 always with size="12" and a setShowChangePasswordForm callback. LIVE.
 *   ChangePasswordForm          - exactly ONE live render site in the whole app:
 *                                 config/ProtectedRoutes.js:35 `<ChangePasswordForm forceChangePassword={true} />`.
 *                                 container/Profile/Profile.js:9 only IMPORTS it; Profile never renders it,
 *                                 so that import does NOT make a second configuration reachable.
 *
 *   CONSEQUENCE - the component is LIVE but several of its branches are NOT. In the running app
 *   `context.forceChangePassword` is always true, `context.size` is never passed and
 *   `context.setShowChangePasswordForm` is never passed. So these arms are dead and are deliberately
 *   NOT exercised below:
 *       line  57  `context.size ? context.size : "8"`   - true arm (no caller passes size)
 *       line  57  title "Change Password" / no subtitle - voluntary arm
 *       line  69  "Current" password label              - voluntary arm
 *       line 104  the Cancel button                     - rendered only when !forceChangePassword
 *   Tests that used to cover those arms were removed rather than kept for the coverage they bought.
 *
 * COVERAGE (statements, --collectCoverageFrom limited to the three files, measured after the audit
 * repairs below - not the pre-repair numbers)
 *   before: PersonalInformation 34.38 | ChangePasswordForm 31.82 | ChangePasswordFormComponent 40.74
 *   after : PersonalInformation 90.63 | ChangePasswordForm 81.82 | ChangePasswordFormComponent 88.89
 *   ChangePasswordForm's remaining uncovered statement is line 105, the Cancel button, left
 *   uncovered on purpose because no caller renders it; its branch percentage (63.16) is held down by
 *   the other three dead arms listed above for the same reason. Everything else still uncovered in
 *   all three files is the mapStateToProps / mapDispatchToProps bodies, which the house
 *   `connect: () => (C) => C` stub bypasses by design.
 *
 * FINDINGS characterised here (asserted as current behaviour, app source NOT modified)
 *   FE_CPWD_NOVALIDATION - ChangePasswordFormComponent passes `validationSchema={this.validationSchema}`
 *                          but `validationSchema` is a module-level const declared AFTER the class and
 *                          never attached to the instance. `this.validationSchema` is undefined, so
 *                          Formik runs with NO validation: mismatched confirmation, 1-character
 *                          passwords and a completely blank form are all accepted and POSTed.
 *   FE_CPWD_NOCONFIRM    - the same component's window.confirm guard is commented out (line 51), so the
 *                          profile-page password change fires with no confirmation step, unlike
 *                          ChangePasswordForm which still asks.
 *   FE_CPWD_STALECLOSE   - componentWillReceiveProps reads this.props.profile.closeAllForm instead of
 *                          nextProps..., so the auto-close lands one props update late.
 *   FE_CPWD_RESETPROP    - ProtectedRoutes renders <ChangePasswordForm forceChangePassword={true} /> with
 *                          no setShowChangePasswordForm prop; ChangePasswordForm calls it unconditionally
 *                          after dispatching, so the forced reset always ends in a TypeError that Formik
 *                          swallows into console.warn. The password IS changed; the UI just errors.
 *
 * WITHDRAWN FINDING
 *   FE_PI_DEADGUARD      - claimed PersonalInformation crashes because profile.details.id is read on
 *                          line 25 above the `Validator.isValid(profile) ? ... : null` guard on line 83.
 *                          The static observation is true (the guard's null arm is unreachable) but it
 *                          is a dead-code note, not a defect: profileReducer's initState is
 *                          `{ details: {}, ... }` and mapStateToProps returns `state.profile`, so the
 *                          `profile: null` the test fed in cannot be produced by the store or by any
 *                          server response. Nothing a user does in Chrome reaches it. Test removed.
 *
 * ADDITIVE ONLY. No existing test or app source is touched.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

/* ------------------------------------------------------------------ plumbing */

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
}));

jest.mock('../../services/API', () => ({ call: jest.fn() }));

global.links = new Proxy({}, { get: () => '/x/' });

jest.mock('../../services/Authenticator', () => ({
    __esModule: true,
    default: {
        scanLevel: jest.fn(() => false),
        scanFeature: jest.fn(() => true),
        checkPermission: jest.fn(() => true),
        checkRole: jest.fn(() => true),
        check: jest.fn(() => true),
    },
}));

/* Content is the only AdminLte piece these three files actually render. Surface the props the
   components compute (col / title / subtitle) so the tests can assert the rules that drive them. */
jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader:  ({ children }) => <div>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
    Content: ({ children, title, subtitle, col }) => (
        <div data-testid="content" data-col={String(col)}>
            <h1>{title}</h1>
            <div data-testid="content-subtitle">{subtitle}</div>
            {children}
        </div>
    ),
}));

jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/Template/BackButton', () => () => <button type="button">Back</button>);

/* react-select is only used for the read-only Status dropdown. This mock does NOT reproduce
   react-select's rendering - it simply echoes back the props PersonalInformation computes
   (the result of `options.filter(o => o.value === profile.details.is_active)` and isDisabled),
   so the assertions below are about the component's own logic, not about react-select. */
jest.mock('react-select', () => ({ value, placeholder, isDisabled }) => (
    <div
        data-testid="status-select"
        data-selected-count={String(value ? value.length : 0)}
        data-disabled={String(isDisabled)}
    >
        {value && value.length ? value[0].label : placeholder}
    </div>
));

const Authenticator = require('../../services/Authenticator').default;

/* require AFTER the jest.mock calls above */
const ChangePasswordForm =
    require('../../components/ChangePasswordForm/ChangePasswordForm').default;
const ChangePasswordFormComponent =
    require('../../components/ChangePasswordFormComponent/ChangePasswordFormComponent').default;
const PersonalInformation =
    require('../../container/Profile/PersonalInformation/PersonalInformation').default;

/* ------------------------------------------------------------------ helpers */

/** Formik validation and submission are promise-based; drain the microtask queue. */
const flush = async () => {
    await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
    });
};

const field = (container, name) => container.querySelector(`input[name="${name}"]`);

const type = (container, name, value) =>
    fireEvent.change(field(container, name), { target: { value, name } });

const submit = async (container) => {
    await act(async () => {
        fireEvent.submit(container.querySelector('form'));
    });
    await flush();
};

const makeProfile = (detailsOver = {}, rootOver = {}) => ({
    details: {
        id: 5,
        first_name: 'Juan',
        last_name: 'Dela Cruz',
        email: 'juan@evox.test',
        mobile_number: '09171234567',
        emp_num: 'EV-0005',
        nickname: 'Johnny',
        birthdate: '1990-03-14',
        is_active: 1,
        ...detailsOver,
    },
    closeAllForm: false,
    ...rootOver,
});

/* jsdom has no Element.prototype.scrollIntoView; every real browser does. Install a stub for the
   duration of a test and put the prototype back exactly as it was afterwards, so this file does not
   permanently mutate a DOM prototype for anything that runs after it. */
const HAD_SCROLL_INTO_VIEW = Object.prototype.hasOwnProperty.call(Element.prototype, 'scrollIntoView');
const ORIGINAL_SCROLL_INTO_VIEW = Element.prototype.scrollIntoView;

const stubScrollIntoView = () => {
    const spy = jest.fn();
    Element.prototype.scrollIntoView = spy;
    return spy;
};

const restoreScrollIntoView = () => {
    if (HAD_SCROLL_INTO_VIEW) {
        Element.prototype.scrollIntoView = ORIGINAL_SCROLL_INTO_VIEW;
    } else {
        delete Element.prototype.scrollIntoView;
    }
};

let confirmSpy;
let warnSpy;
let logSpy;
let errorSpy;

beforeEach(() => {
    jest.clearAllMocks();
    Authenticator.scanLevel.mockReturnValue(false);
    confirmSpy = jest.spyOn(window, 'confirm').mockImplementation(() => true);
    /* React de-duplicates its warnings per component type, so a warning raised by an earlier test
       can otherwise satisfy a later assertion. Fresh accumulators every test. */
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    confirmSpy.mockRestore();
    warnSpy.mockRestore();
    logSpy.mockRestore();
    errorSpy.mockRestore();
});

const warnedAboutSubmitFailure = () =>
    warnSpy.mock.calls.some((call) =>
        /unhandled error was caught from submitForm/i.test(String(call[0])));

/* ================================================================== *
 *  ChangePasswordForm  -  forced reset route + Profile screen
 * ================================================================== */

describe('ChangePasswordForm - the forced reset screen', () => {

    /* Mirrors config/ProtectedRoutes.js:35 exactly: forceChangePassword={true}, no size,
       no setShowChangePasswordForm. The remaining props are what connect() supplies.
       There is no other render site, so there is no other configuration to test. */
    const renderForcedReset = (props = {}) => {
        const changePassword = jest.fn();
        const utils = render(
            <ChangePasswordForm
                forceChangePassword={true}
                user={{ id: 7 }}
                profile={makeProfile()}
                page={{}}
                changePassword={changePassword}
                {...props}
            />
        );
        return { ...utils, changePassword };
    };

    test('the forced reset is titled "Reset Password", says why it is being demanded, and takes the eight-column default', () => {
        const { getByText, getByTestId } = renderForcedReset();
        expect(getByText('Reset Password')).toBeInTheDocument();
        expect(getByTestId('content-subtitle'))
            .toHaveTextContent('This is required before doing any transactions.');
        /* ProtectedRoutes passes no size prop, so the `context.size ? ... : "8"` fallback is the
           only width this screen ever has. */
        expect(getByTestId('content')).toHaveAttribute('data-col', '8');
    });

    test('the first field is labelled "Temporary Password" because the reset follows a forgot-password mail', () => {
        expect(renderForcedReset().getByText('Temporary Password:')).toBeInTheDocument();
    });

    test('the forced reset offers no way out - there is no Cancel button and no other escape control', () => {
        const { queryByText, container } = renderForcedReset();
        expect(queryByText(/Cancel/)).toBeNull();
        /* Update is the only button on the screen; the user cannot dismiss the reset. */
        const buttons = container.querySelectorAll('button');
        expect(buttons).toHaveLength(1);
        expect(buttons[0]).toHaveTextContent('Update');
        expect(buttons[0]).toHaveAttribute('type', 'submit');
    });

    test('every input on the reset screen is a masked password box - nothing is typed in the clear', () => {
        const { container } = renderForcedReset();
        const inputs = Array.from(container.querySelectorAll('input'));
        expect(inputs).toHaveLength(3);
        expect(inputs.map((i) => i.getAttribute('name'))).toEqual([
            'current_password',
            'new_password',
            'confirm_new_password',
        ]);
        inputs.forEach((input) => expect(input).toHaveAttribute('type', 'password'));
    });
});

describe('ChangePasswordForm - submitting the forced reset', () => {

    /* Same props as config/ProtectedRoutes.js:35 - forced, and with no setShowChangePasswordForm,
       which is what makes FE_CPWD_RESETPROP happen on every successful submit. */
    const renderForcedReset = (props = {}) => {
        const changePassword = jest.fn();
        const utils = render(
            <ChangePasswordForm
                forceChangePassword={true}
                user={{ id: 7 }}
                profile={makeProfile()}
                page={{}}
                changePassword={changePassword}
                {...props}
            />
        );
        return { ...utils, changePassword };
    };

    const fillValid = (container, over = {}) => {
        const values = {
            current_password: 'oldpass1',
            new_password: 'newpass1',
            confirm_new_password: 'newpass1',
            ...over,
        };
        Object.keys(values).forEach((name) => type(container, name, values[name]));
        return values;
    };

    test('a confirmed reset posts the three passwords under the logged-in user id, tagged reset_password so the backend can clear the flag', async () => {
        const { container, changePassword } = renderForcedReset();
        fillValid(container);
        await submit(container);

        expect(changePassword).toHaveBeenCalledTimes(1);
        expect(changePassword).toHaveBeenCalledWith(7, {
            current_password: 'oldpass1',
            new_password: 'newpass1',
            confirm_new_password: 'newpass1',
            reset_password: true,
        });
    });

    test('declining the browser confirmation abandons the change and leaves the form on screen', async () => {
        confirmSpy.mockReturnValue(false);
        const { container, changePassword } = renderForcedReset();
        fillValid(container);
        await submit(container);

        expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to change your password?');
        expect(changePassword).not.toHaveBeenCalled();
        expect(container.querySelector('form')).not.toBeNull();
        expect(field(container, 'new_password').value).toBe('newpass1');
    });

    test('a confirmation that does not match the new password is rejected before the confirm dialog', async () => {
        const { container, getByText, changePassword } = renderForcedReset();
        fillValid(container, { confirm_new_password: 'different1' });
        await submit(container);

        expect(getByText('Your passwords do not match.')).toBeInTheDocument();
        expect(confirmSpy).not.toHaveBeenCalled();
        expect(changePassword).not.toHaveBeenCalled();
    });

    test('a new password shorter than six characters is rejected on both the new and the confirmation field', async () => {
        const { container, getAllByText, changePassword } = renderForcedReset();
        fillValid(container, { new_password: 'abc', confirm_new_password: 'abc' });
        await submit(container);

        /* Deterministic: min(6) fails on new_password and on confirm_new_password, and the
           current password is valid, so the schema produces exactly two of these messages. */
        expect(getAllByText('6 Minimum Characters')).toHaveLength(2);
        expect(changePassword).not.toHaveBeenCalled();
    });

    test('the temporary password is mandatory - a blank one blocks the reset', async () => {
        const { container, getByText, changePassword } = renderForcedReset();
        fillValid(container, { current_password: '' });
        await submit(container);

        expect(getByText('This field is required')).toBeInTheDocument();
        expect(changePassword).not.toHaveBeenCalled();
    });

    test('an untouched form reports all three fields as required and sends nothing', async () => {
        const { container, getAllByText, changePassword } = renderForcedReset();
        await submit(container);

        expect(getAllByText('This field is required')).toHaveLength(3);
        expect(confirmSpy).not.toHaveBeenCalled();
        expect(changePassword).not.toHaveBeenCalled();
    });

    test('the Update button submits the form', async () => {
        const { container, getByText, changePassword } = renderForcedReset();
        fillValid(container);
        await act(async () => {
            fireEvent.click(getByText(/Update/));
        });
        await flush();
        expect(changePassword).toHaveBeenCalledTimes(1);
    });

    /* FE_CPWD_RESETPROP - config/ProtectedRoutes.js:35 renders
     *   <ChangePasswordForm forceChangePassword={true} />
     * with no setShowChangePasswordForm prop, but ChangePasswordForm.js:40 calls it
     * unconditionally right after dispatching. The password change IS sent, then the handler
     * throws TypeError, which Formik 2.1.6 catches into console.warn. Same in Chrome.
     * This is the ONLY configuration the app renders, so it happens on every forced reset.
     */
    test('the reset changes the password and then blows up closing a form it was never given_FINDING_FE_CPWD_RESETPROP', async () => {
        const { container, changePassword } = renderForcedReset();
        fillValid(container);
        await submit(container);

        expect(changePassword).toHaveBeenCalledWith(7, expect.objectContaining({ reset_password: true }));
        expect(warnedAboutSubmitFailure()).toBe(true);
    });

    test('a rejected submit never reaches the broken close call, so no error is swallowed', async () => {
        const { container, changePassword } = renderForcedReset();
        fillValid(container, { confirm_new_password: 'different1' });
        await submit(container);

        expect(changePassword).not.toHaveBeenCalled();
        expect(warnedAboutSubmitFailure()).toBe(false);
    });
});

/* ================================================================== *
 *  ChangePasswordFormComponent  -  Profile -> Personal Information
 * ================================================================== */

describe('ChangePasswordFormComponent - the profile page password form', () => {

    const renderForm = (props = {}) => {
        const changePassword = jest.fn();
        const setShowChangePasswordForm = jest.fn();
        const utils = render(
            <ChangePasswordFormComponent
                user={{ id: 42 }}
                profile={makeProfile()}
                page={{}}
                changePassword={changePassword}
                setShowChangePasswordForm={setShowChangePasswordForm}
                {...props}
            />
        );
        return { ...utils, changePassword, setShowChangePasswordForm };
    };

    const fill = (container, over = {}) => {
        const values = {
            current_password: 'oldpass1',
            new_password: 'newpass1',
            confirm_new_password: 'newpass1',
            ...over,
        };
        Object.keys(values).forEach((name) => type(container, name, values[name]));
        return values;
    };

    test('it always renders the Change Password panel across the full twelve columns', () => {
        const { getByText, getByTestId } = renderForm();
        expect(getByText('Change Password')).toBeInTheDocument();
        expect(getByTestId('content')).toHaveAttribute('data-col', '12');
    });

    test('it offers a masked current, new and confirmation password box', () => {
        const { container } = renderForm();
        ['current_password', 'new_password', 'confirm_new_password'].forEach((name) => {
            expect(field(container, name)).toHaveAttribute('type', 'password');
        });
    });

    test('unlike the reset form it always shows a Cancel button, which closes without dispatching', () => {
        const { getByText, changePassword, setShowChangePasswordForm } = renderForm();
        fireEvent.click(getByText(/Cancel/));
        expect(setShowChangePasswordForm).toHaveBeenCalledWith(false);
        expect(changePassword).not.toHaveBeenCalled();
    });

    test('a fully filled form posts all three passwords under the logged-in user id', async () => {
        const { container, changePassword } = renderForm();
        fill(container);
        await submit(container);

        expect(changePassword).toHaveBeenCalledTimes(1);
        expect(changePassword).toHaveBeenCalledWith(42, {
            current_password: 'oldpass1',
            new_password: 'newpass1',
            confirm_new_password: 'newpass1',
        });
    });

    test('fields left blank are stripped out of the payload rather than sent as empty strings', async () => {
        const { container, changePassword } = renderForm();
        fill(container, { confirm_new_password: '' });
        await submit(container);

        expect(changePassword.mock.calls[0][1]).toEqual({
            current_password: 'oldpass1',
            new_password: 'newpass1',
        });
    });

    /* FE_CPWD_NOVALIDATION - `validationSchema={this.validationSchema}` is undefined because the
     * schema is a module-level const declared after the class (line 137) and never assigned to the
     * instance. Formik therefore validates nothing. The identical schema on ChangePasswordForm.js
     * does work, which is why the two forms behave differently. Real in Chrome.
     */
    test('a confirmation that does not match the new password is accepted and posted anyway_FINDING_FE_CPWD_NOVALIDATION', async () => {
        const { container, queryByText, changePassword } = renderForm();
        fill(container, { confirm_new_password: 'totally-different' });
        await submit(container);

        expect(queryByText('Your passwords do not match.')).toBeNull();
        expect(changePassword).toHaveBeenCalledWith(42, {
            current_password: 'oldpass1',
            new_password: 'newpass1',
            confirm_new_password: 'totally-different',
        });
    });

    test('a one-character new password clears the six-character minimum that the schema was meant to enforce_FINDING_FE_CPWD_NOVALIDATION', async () => {
        const { container, queryByText, changePassword } = renderForm();
        fill(container, { new_password: 'a', confirm_new_password: 'a' });
        await submit(container);

        expect(queryByText('6 Minimum Characters')).toBeNull();
        expect(changePassword.mock.calls[0][1].new_password).toBe('a');
    });

    test('an entirely blank form posts an empty payload instead of reporting three required fields_FINDING_FE_CPWD_NOVALIDATION', async () => {
        const { container, queryByText, changePassword } = renderForm();
        await submit(container);

        expect(queryByText('This field is required')).toBeNull();
        expect(changePassword).toHaveBeenCalledWith(42, {});
    });

    test('the current password is not required here even though the unused schema marks it required_FINDING_FE_CPWD_NOVALIDATION', async () => {
        const { container, changePassword } = renderForm();
        fill(container, { current_password: '' });
        await submit(container);

        expect(changePassword.mock.calls[0][1]).not.toHaveProperty('current_password');
        expect(changePassword.mock.calls[0][1].new_password).toBe('newpass1');
    });

    /* FE_CPWD_NOCONFIRM - the window.confirm guard is commented out at line 51, so unlike
     * ChangePasswordForm this form never asks before changing a password. */
    test('no confirmation dialog guards this form - it posts even when the user would have said no_FINDING_FE_CPWD_NOCONFIRM', async () => {
        confirmSpy.mockReturnValue(false);
        const { container, changePassword } = renderForm();
        fill(container);
        await submit(container);

        expect(confirmSpy).not.toHaveBeenCalled();
        expect(changePassword).toHaveBeenCalledTimes(1);
    });

    test('submitting does not close the form by itself - only the store closeAllForm signal does', async () => {
        const { container, setShowChangePasswordForm } = renderForm();
        fill(container);
        await submit(container);
        expect(setShowChangePasswordForm).not.toHaveBeenCalled();
    });

    /* FE_CPWD_STALECLOSE - componentWillReceiveProps inspects this.props (the OLD props) rather than
     * nextProps, so the closeAllForm signal is seen one update late. */
    test('the closeAllForm signal arriving in new props does not close the form on that same update_FINDING_FE_CPWD_STALECLOSE', () => {
        const setShowChangePasswordForm = jest.fn();
        const { rerender } = render(
            <ChangePasswordFormComponent
                user={{ id: 42 }}
                profile={makeProfile({}, { closeAllForm: false })}
                changePassword={jest.fn()}
                setShowChangePasswordForm={setShowChangePasswordForm}
            />
        );

        rerender(
            <ChangePasswordFormComponent
                user={{ id: 42 }}
                profile={makeProfile({}, { closeAllForm: true })}
                changePassword={jest.fn()}
                setShowChangePasswordForm={setShowChangePasswordForm}
            />
        );

        expect(setShowChangePasswordForm).not.toHaveBeenCalled();
    });

    test('it takes a second props update after closeAllForm turns true before the form actually closes_FINDING_FE_CPWD_STALECLOSE', () => {
        const setShowChangePasswordForm = jest.fn();
        const props = (closeAllForm) => ({
            user: { id: 42 },
            profile: makeProfile({}, { closeAllForm }),
            changePassword: jest.fn(),
            setShowChangePasswordForm,
        });

        const { rerender } = render(<ChangePasswordFormComponent {...props(false)} />);
        rerender(<ChangePasswordFormComponent {...props(true)} />);
        expect(setShowChangePasswordForm).not.toHaveBeenCalled();

        rerender(<ChangePasswordFormComponent {...props(true)} />);
        expect(setShowChangePasswordForm).toHaveBeenCalledWith(false);
    });

    test('while closeAllForm stays false no props update ever closes the form', () => {
        const setShowChangePasswordForm = jest.fn();
        const props = () => ({
            user: { id: 42 },
            profile: makeProfile({}, { closeAllForm: false }),
            changePassword: jest.fn(),
            setShowChangePasswordForm,
        });

        const { rerender } = render(<ChangePasswordFormComponent {...props()} />);
        rerender(<ChangePasswordFormComponent {...props()} />);
        rerender(<ChangePasswordFormComponent {...props()} />);

        expect(setShowChangePasswordForm).not.toHaveBeenCalled();
    });
});

/* ================================================================== *
 *  PersonalInformation  -  Employee -> Profile -> Personal Information
 * ================================================================== */

describe('PersonalInformation - who may see and edit what', () => {

    let scrollSpy;

    beforeEach(() => {
        jest.useFakeTimers();
        scrollSpy = stubScrollIntoView();
    });

    afterEach(() => {
        act(() => { jest.runOnlyPendingTimers(); });
        jest.useRealTimers();
        restoreScrollIntoView();
    });

    const renderPage = (props = {}) => {
        const updateUserProfile = jest.fn();
        const changePassword = jest.fn();
        const utils = render(
            <PersonalInformation
                user={{ id: 5 }}
                profile={makeProfile()}
                updateUserProfile={updateUserProfile}
                changePassword={changePassword}
                {...props}
            />
        );
        return { ...utils, updateUserProfile, changePassword };
    };

    /* profileReducer initState is `{ details: {}, ... }`, so this is what the screen looks like
       for the one render that happens before FETCH_PROFILE lands. It must not crash, and because
       `undefined` never equals the logged-in id it degrades to the read-only stranger layout. */
    test('the reducer default profile of an empty details object renders a read-only stranger layout instead of crashing', () => {
        const { getByText, container, queryByText, queryByTestId } = renderPage({
            profile: { details: {}, closeAllForm: false },
            user: { id: 5 },
        });

        expect(getByText('Basic Information')).toBeInTheDocument();
        expect(getByText('Contact Information')).toBeInTheDocument();

        /* No stored values, and nothing is editable. */
        expect(field(container, 'first_name').value).toBe('');
        expect(field(container, 'email').value).toBe('');
        expect(field(container, 'first_name').disabled).toBe(true);

        /* Status label survives but there is no dropdown, because is_active is absent. */
        expect(getByText('Status:')).toBeInTheDocument();
        expect(queryByTestId('status-select')).toBeNull();

        /* The action buttons are keyed off user.id === profile.details.id, which cannot hold here. */
        expect(queryByText(/Save/)).toBeNull();
        expect(queryByText(/Change Password/)).toBeNull();
    });

    test('a client viewing their own profile may edit the editable fields', () => {
        Authenticator.scanLevel.mockReturnValue(true);
        const { container } = renderPage({ user: { id: 5 } });
        expect(field(container, 'first_name').disabled).toBe(false);
        expect(field(container, 'last_name').disabled).toBe(false);
        expect(field(container, 'email').disabled).toBe(false);
    });

    test('a non-client viewing their own profile gets the same fields read-only', () => {
        Authenticator.scanLevel.mockReturnValue(false);
        const { container } = renderPage({ user: { id: 5 } });
        expect(field(container, 'first_name').disabled).toBe(true);
        expect(field(container, 'email').disabled).toBe(true);
    });

    test('a client looking at somebody else profile gets read-only fields', () => {
        Authenticator.scanLevel.mockReturnValue(true);
        const { container } = renderPage({ user: { id: 99 } });
        expect(field(container, 'first_name').disabled).toBe(true);
        expect(field(container, 'last_name').disabled).toBe(true);
    });

    test('status and employee number are hidden from a client reading their own profile', () => {
        Authenticator.scanLevel.mockReturnValue(true);
        const { queryByText, queryByDisplayValue } = renderPage({ user: { id: 5 } });
        expect(queryByText('Status:')).toBeNull();
        expect(queryByText('Employee Number:')).toBeNull();
        expect(queryByDisplayValue('EV-0005')).toBeNull();
    });

    test('status and employee number are shown to a non-client reading their own profile', () => {
        Authenticator.scanLevel.mockReturnValue(false);
        const { getByText, getByDisplayValue } = renderPage({ user: { id: 5 } });
        expect(getByText('Status:')).toBeInTheDocument();
        expect(getByText('Employee Number:')).toBeInTheDocument();
        expect(getByDisplayValue('EV-0005')).toBeInTheDocument();
    });

    test('status and employee number are shown whenever the profile belongs to somebody else', () => {
        Authenticator.scanLevel.mockReturnValue(true);
        const { getByText } = renderPage({ user: { id: 99 } });
        expect(getByText('Status:')).toBeInTheDocument();
        expect(getByText('Employee Number:')).toBeInTheDocument();
    });

    /* react-select is mocked, so these assert the props PersonalInformation.js:104-111 computes -
       the single option selected by `options.filter(o => o.value === is_active)` and isDisabled -
       not react-select's own rendering. Exactly one option must be selected, and the control must
       be disabled: this screen only displays the status, it never sets it. */
    test('an active employee hands the status control exactly the Active option, disabled', () => {
        Authenticator.scanLevel.mockReturnValue(false);
        const { getByTestId } = renderPage({ user: { id: 5 }, profile: makeProfile({ is_active: 1 }) });
        expect(getByTestId('status-select')).toHaveAttribute('data-selected-count', '1');
        expect(getByTestId('status-select')).toHaveAttribute('data-disabled', 'true');
        expect(getByTestId('status-select')).toHaveTextContent('Active');
    });

    test('an inactive employee hands the status control exactly the Inactive option, disabled', () => {
        Authenticator.scanLevel.mockReturnValue(false);
        const { getByTestId } = renderPage({ user: { id: 5 }, profile: makeProfile({ is_active: 0 }) });
        expect(getByTestId('status-select')).toHaveAttribute('data-selected-count', '1');
        expect(getByTestId('status-select')).toHaveAttribute('data-disabled', 'true');
        expect(getByTestId('status-select')).toHaveTextContent('Inactive');
    });

    test('an employee with no status flag keeps the Status label but renders no dropdown at all', () => {
        Authenticator.scanLevel.mockReturnValue(false);
        const { getByText, queryByTestId } = renderPage({
            user: { id: 5 },
            profile: makeProfile({ is_active: null }),
        });
        expect(getByText('Status:')).toBeInTheDocument();
        expect(queryByTestId('status-select')).toBeNull();
    });

    test('nickname and birth date follow the same rule as status - hidden from a client on their own profile', () => {
        Authenticator.scanLevel.mockReturnValue(true);
        const { queryByText } = renderPage({ user: { id: 5 } });
        expect(queryByText('Nickname:')).toBeNull();
        expect(queryByText('Birth Date:')).toBeNull();
    });

    test('nickname and birth date are shown to a non-client and carry the stored values', () => {
        Authenticator.scanLevel.mockReturnValue(false);
        const { getByText, getByDisplayValue } = renderPage({ user: { id: 5 } });
        expect(getByText('Nickname:')).toBeInTheDocument();
        expect(getByText('Birth Date:')).toBeInTheDocument();
        expect(getByDisplayValue('Johnny')).toBeInTheDocument();
        expect(getByDisplayValue('1990-03-14')).toBeInTheDocument();
    });

    test('a client sees their own mobile number but not another employee mobile number', () => {
        Authenticator.scanLevel.mockReturnValue(true);
        const own = renderPage({ user: { id: 5 } });
        expect(own.getByText('Mobile Number:')).toBeInTheDocument();
        own.unmount();

        const other = renderPage({ user: { id: 99 } });
        expect(other.queryByText('Mobile Number:')).toBeNull();
        expect(other.container.querySelector('input[name="mobile_number"]')).toBeNull();
    });

    test('a non-client sees the mobile number on anyone profile', () => {
        Authenticator.scanLevel.mockReturnValue(false);
        const { getByText } = renderPage({ user: { id: 99 } });
        expect(getByText('Mobile Number:')).toBeInTheDocument();
    });

    test('the email address is always on screen regardless of viewer', () => {
        Authenticator.scanLevel.mockReturnValue(true);
        const other = renderPage({ user: { id: 99 } });
        expect(other.getByText('Email Address:')).toBeInTheDocument();
        other.unmount();

        Authenticator.scanLevel.mockReturnValue(false);
        expect(renderPage({ user: { id: 5 } }).getByText('Email Address:')).toBeInTheDocument();
    });

    test('Save is offered only to a client on their own profile', () => {
        Authenticator.scanLevel.mockReturnValue(true);
        const client = renderPage({ user: { id: 5 } });
        expect(client.getByText(/Save/)).toBeInTheDocument();
        client.unmount();

        Authenticator.scanLevel.mockReturnValue(false);
        expect(renderPage({ user: { id: 5 } }).queryByText(/Save/)).toBeNull();
    });

    test('Change Password is offered on your own profile but never on somebody else profile', () => {
        const own = renderPage({ user: { id: 5 } });
        expect(own.getByText(/Change Password/)).toBeInTheDocument();
        own.unmount();

        const other = renderPage({ user: { id: 99 } });
        expect(other.queryByText(/Change Password/)).toBeNull();
        expect(other.queryByText(/Save/)).toBeNull();
    });
});

describe('PersonalInformation - opening the change password panel', () => {

    let scrollSpy;

    beforeEach(() => {
        jest.useFakeTimers();
        scrollSpy = stubScrollIntoView();
    });

    afterEach(() => {
        act(() => { jest.runOnlyPendingTimers(); });
        jest.useRealTimers();
        restoreScrollIntoView();
    });

    const renderPage = (props = {}) => {
        const updateUserProfile = jest.fn();
        const changePassword = jest.fn();
        const utils = render(
            <PersonalInformation
                user={{ id: 5 }}
                profile={makeProfile()}
                updateUserProfile={updateUserProfile}
                changePassword={changePassword}
                {...props}
            />
        );
        return { ...utils, updateUserProfile, changePassword };
    };

    test('the change password panel is not mounted until the button is pressed', () => {
        const { container } = renderPage();
        expect(container.querySelector('#change_password_id')).toBeNull();
        expect(container.querySelector('[data-testid="content"]')).toBeNull();
        expect(container.querySelector('input[name="current_password"]')).toBeNull();
    });

    test('pressing Change Password mounts the panel inside the change_password_id anchor', () => {
        const { container, getByText } = renderPage();
        fireEvent.click(getByText(/Change Password/));

        const anchor = container.querySelector('#change_password_id');
        expect(anchor).not.toBeNull();
        expect(anchor.querySelector('input[name="current_password"]')).not.toBeNull();
        expect(anchor.querySelector('input[name="new_password"]')).not.toBeNull();
        expect(anchor.querySelector('input[name="confirm_new_password"]')).not.toBeNull();
    });

    test('the panel is scrolled into view only after the 150ms delay has elapsed', () => {
        const { getByText } = renderPage();
        fireEvent.click(getByText(/Change Password/));

        act(() => { jest.advanceTimersByTime(149); });
        expect(scrollSpy).not.toHaveBeenCalled();

        act(() => { jest.advanceTimersByTime(1); });
        expect(scrollSpy).toHaveBeenCalledTimes(1);
        expect(scrollSpy).toHaveBeenCalledWith({
            behavior: 'smooth',
            block: 'end',
            inline: 'nearest',
        });
    });

    /* The panel dispatches with `this.props.user.id`. The Change Password button that mounts it only
       renders on your own profile, so user.id and profile.details.id are the same value here by
       construction - this asserts the id that is sent, not which prop it was read from. */
    test('the embedded panel changes the password for the logged-in user', async () => {
        const { container, getByText, changePassword } = renderPage();
        fireEvent.click(getByText(/Change Password/));

        const panel = container.querySelector('#change_password_id');
        fireEvent.change(panel.querySelector('input[name="current_password"]'),
            { target: { value: 'oldpass1', name: 'current_password' } });
        fireEvent.change(panel.querySelector('input[name="new_password"]'),
            { target: { value: 'newpass1', name: 'new_password' } });
        fireEvent.change(panel.querySelector('input[name="confirm_new_password"]'),
            { target: { value: 'newpass1', name: 'confirm_new_password' } });

        await act(async () => {
            fireEvent.submit(panel.querySelector('form'));
        });
        await flush();

        expect(changePassword).toHaveBeenCalledWith(5, {
            current_password: 'oldpass1',
            new_password: 'newpass1',
            confirm_new_password: 'newpass1',
        });
    });

    test('cancelling the embedded panel unmounts it again', () => {
        const { container, getByText, getAllByText } = renderPage();
        fireEvent.click(getByText(/Change Password/));
        expect(container.querySelector('#change_password_id')).not.toBeNull();

        fireEvent.click(getAllByText(/Cancel/)[0]);
        expect(container.querySelector('#change_password_id')).toBeNull();
    });
});
