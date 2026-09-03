/**
 * EVOX — Jest: User reducer (the logged-in user slice)
 *
 * Source under test:
 *   src/store/reducers/user/userReducers.js
 *
 * Menu path: global — seeded at Login, refreshed by every page through fetchUser, and read by
 *            Authenticator for every role/permission gate in the app.
 *
 * Coverage before this file: 4 uncovered functions / 12 uncovered branch arms.
 *
 * Rules asserted here (both arms of every conditional):
 *   - LOGIN_SUCCESS and FETCH_USER_SUCCESS mirror the server clock into localStorage so the
 *     puncher can render server time; LOGOUT_SUCCESS clears those keys.
 *   - UPDATE_USER only merges when the updated user IS the logged-in user.
 *   - The asset / EVA / COC / happiness-survey slices each set both their payload and their
 *     "loaded" flag, and their CLEAR_* twin resets the flag without dropping the payload.
 *   - An unrelated action returns the state untouched.
 *
 * FINDING USR-DUP-CASE-1 is characterized at the bottom of this file.
 */

jest.mock('moment', () => {
    // Fixed instant so the TICK_DPA assertion can never depend on the day the suite runs.
    const fixed = () => ({ format: (fmt) => (fmt === 'YYYY-MM-DD HH:mm:ss' ? '2026-08-18 09:30:00' : fmt) });
    return fixed;
});

import userReducer from '../../../../store/reducers/user/userReducers';

const initState = { error_message: '' };

const loggedUser = {
    id: 7,
    emp_num: 'EV0007',
    first_name: 'Ana',
    user_server_timestamp: '2026-08-18 09:00:00',
    user_server_timestamp_mils: 1786000000000,
    user_offset_seconds: 28800,
};

describe('userReducer — login and logout', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    test('LOGIN_SUCCESS stores the user and mirrors the server clock into localStorage', () => {
        const result = userReducer(initState, {
            type: 'LOGIN_SUCCESS',
            user: loggedUser,
            payload: { menu: ['dashboard'] },
        });

        expect(result.id).toBe(7);
        expect(result.payload).toEqual({ menu: ['dashboard'] });
        expect(localStorage.getItem('user_server_timestamp')).toBe('2026-08-18 09:00:00');
        expect(localStorage.getItem('user_server_timestamp_mils')).toBe('1786000000000');
        expect(localStorage.getItem('user_local_offset_mils')).toBe(String(28800 * 1000));
        expect(localStorage.getItem('user_local_timestamp_mils')).toBe('1786000000000');
    });

    test('LOGOUT_SUCCESS empties the user slice and clears the mirrored clock', () => {
        userReducer(initState, { type: 'LOGIN_SUCCESS', user: loggedUser, payload: {} });
        localStorage.setItem('browser_timestamp_mils', '123');

        const result = userReducer({ ...loggedUser }, { type: 'LOGOUT_SUCCESS' });

        expect(result).toEqual({ error_message: '', clearLoginParameters: true });
        expect(localStorage.getItem('user_server_timestamp')).toBeNull();
        expect(localStorage.getItem('user_server_timestamp_mils')).toBeNull();
        expect(localStorage.getItem('browser_timestamp_mils')).toBeNull();
    });

    test('LOGOUT_FAILED replaces the slice with the error payload', () => {
        const result = userReducer({ ...loggedUser }, {
            type: 'LOGOUT_FAILED',
            error: { status: 500, message: 'Logout failed' },
        });

        expect(result).toEqual({ status: 500, message: 'Logout failed' });
        expect(result.id).toBeUndefined();
    });

    test('FETCH_USER_SUCCESS refreshes the user and re-mirrors the server clock', () => {
        const result = userReducer({ ...loggedUser, first_name: 'Stale' }, {
            type: 'FETCH_USER_SUCCESS',
            user: { ...loggedUser, first_name: 'Ana Marie' },
            payload: { menu: [] },
        });

        expect(result.first_name).toBe('Ana Marie');
        expect(localStorage.getItem('user_local_offset_mils')).toBe(String(28800 * 1000));
    });

    test('FETCH_USER_FAILED replaces the slice with the error payload', () => {
        const result = userReducer({ ...loggedUser }, {
            type: 'FETCH_USER_FAILED',
            error: { status: 401, statusText: 'Unauthorized' },
        });

        expect(result).toEqual({ status: 401, statusText: 'Unauthorized' });
    });
});

describe('userReducer — password and DPA flags', () => {
    test('TOGGLE_FORCE_CHANGE_PASSWORD lowers the forced-change flag and keeps the rest of the user', () => {
        const result = userReducer({ ...loggedUser, force_change_password: true }, {
            type: 'TOGGLE_FORCE_CHANGE_PASSWORD',
        });

        expect(result.force_change_password).toBe(false);
        expect(result.emp_num).toBe('EV0007');
    });

    test('TICK_DPA stamps the acceptance time in Y-m-d H:i:s', () => {
        const result = userReducer({ ...loggedUser }, { type: 'TICK_DPA' });

        expect(result.dpa_ticked_at).toBe('2026-08-18 09:30:00');
        expect(result.id).toBe(7);
    });
});

describe('userReducer — UPDATE_USER identity gate', () => {
    test('an update for the logged-in user is merged into the slice', () => {
        const result = userReducer({ ...loggedUser }, {
            type: 'UPDATE_USER',
            user: { id: 7, first_name: 'Ana Marie', level: { Name: 'Supervisor' } },
        });

        expect(result.first_name).toBe('Ana Marie');
        expect(result.level).toEqual({ Name: 'Supervisor' });
        expect(result.emp_num).toBe('EV0007');
    });

    test('an update for a different user leaves the logged-in user untouched', () => {
        const state = { ...loggedUser };

        const result = userReducer(state, {
            type: 'UPDATE_USER',
            user: { id: 99, first_name: 'Somebody Else' },
        });

        expect(result.first_name).toBe('Ana');
        expect(result).toEqual(state);
        expect(result).not.toBe(state);
    });

    test('an update with no user payload at all leaves the logged-in user untouched', () => {
        const result = userReducer({ ...loggedUser }, { type: 'UPDATE_USER' });

        expect(result.first_name).toBe('Ana');
    });
});

describe('userReducer — asset, EVA, COC and survey slices', () => {
    test('FETCH_USER_ASSET stores one asset and raises the loaded flag', () => {
        const result = userReducer({ ...loggedUser }, {
            type: 'FETCH_USER_ASSET',
            data: { id: 3, name: 'Laptop' },
            is_asset_loaded: true,
        });

        expect(result.user_asset).toEqual({ id: 3, name: 'Laptop' });
        expect(result.is_asset_loaded).toBe(true);
    });

    test('FETCH_USER_ASSETS stores the asset list and raises the loaded flag', () => {
        const result = userReducer({ ...loggedUser }, {
            type: 'FETCH_USER_ASSETS',
            data: [{ id: 3 }, { id: 4 }],
            is_asset_loaded: true,
        });

        expect(result.user_assets).toHaveLength(2);
        expect(result.is_asset_loaded).toBe(true);
    });

    test('CLEAR_USER_ASSET_LOAD lowers the loaded flag but keeps the fetched assets', () => {
        const loaded = userReducer({ ...loggedUser }, {
            type: 'FETCH_USER_ASSETS',
            data: [{ id: 3 }],
            is_asset_loaded: true,
        });

        const result = userReducer(loaded, {
            type: 'CLEAR_USER_ASSET_LOAD',
            is_asset_loaded: false,
        });

        expect(result.is_asset_loaded).toBe(false);
        expect(result.user_assets).toEqual([{ id: 3 }]);
    });

    test('FETCH_ALL_ASSETS stores the admin asset report together with the filters used', () => {
        const result = userReducer({ ...loggedUser }, {
            type: 'FETCH_ALL_ASSETS',
            data: [{ id: 1 }],
            is_all_asset_loaded: true,
            filters: { department_id: 4 },
        });

        expect(result.all_assets).toEqual([{ id: 1 }]);
        expect(result.is_all_asset_loaded).toBe(true);
        expect(result.asset_reports_filter).toEqual({ department_id: 4 });
    });

    test('FETCH_USER_EVA and CLEAR_USER_EVA raise then lower the EVA loaded flag', () => {
        const loaded = userReducer({ ...loggedUser }, {
            type: 'FETCH_USER_EVA',
            data: { questions: [] },
            is_eva_loaded: true,
        });
        expect(loaded.user_eva).toEqual({ questions: [] });
        expect(loaded.is_eva_loaded).toBe(true);

        const cleared = userReducer(loaded, { type: 'CLEAR_USER_EVA', is_eva_loaded: false });
        expect(cleared.is_eva_loaded).toBe(false);
        expect(cleared.user_eva).toEqual({ questions: [] });
    });

    test('FETCH_USER_COC and CLEAR_USER_COC raise then lower the code-of-conduct flag', () => {
        const loaded = userReducer({ ...loggedUser }, {
            type: 'FETCH_USER_COC',
            data: { acknowledged: false },
            is_coc_loaded: true,
        });
        expect(loaded.user_coc).toEqual({ acknowledged: false });

        const cleared = userReducer(loaded, { type: 'CLEAR_USER_COC', is_coc_loaded: false });
        expect(cleared.is_coc_loaded).toBe(false);
    });

    test('FETCH_USER_EVA_REG and CLEAR_USER_EVA_REG raise then lower the registration flag', () => {
        const loaded = userReducer({ ...loggedUser }, {
            type: 'FETCH_USER_EVA_REG',
            data: { registered: false },
            is_eva_reg_loaded: true,
        });
        expect(loaded.user_eva_reg).toEqual({ registered: false });

        const cleared = userReducer(loaded, {
            type: 'CLEAR_USER_EVA_REG',
            is_eva_reg_loaded: false,
        });
        expect(cleared.is_eva_reg_loaded).toBe(false);
    });

    test('FETCH_USER_HAPPINESS_SURVEY and its CLEAR twin raise then lower the survey flag', () => {
        const loaded = userReducer({ ...loggedUser }, {
            type: 'FETCH_USER_HAPPINESS_SURVEY',
            data: { questions: [{ id: 1 }] },
            is_happiness_survey_loaded: true,
        });
        expect(loaded.user_happiness_survey).toEqual({ questions: [{ id: 1 }] });

        const cleared = userReducer(loaded, {
            type: 'CLEAR_USER_HAPPINESS_SURVEY',
            is_happiness_survey_loaded: false,
        });
        expect(cleared.is_happiness_survey_loaded).toBe(false);
    });

    test('an unrelated action returns the same state instance', () => {
        const state = { ...loggedUser };

        expect(userReducer(state, { type: 'FETCH_DTR_SUMMARY_SUCCESS' })).toBe(state);
    });

    test('the reducer seeds the empty user slice when called with no state', () => {
        expect(userReducer(undefined, { type: '@@INIT' })).toEqual(initState);
    });
});

/**
 * FINDING USR-DUP-CASE-1 — the second `case "UPDATE_USER"` block is unreachable dead code.
 *
 * src/store/reducers/user/userReducers.js declares `case "UPDATE_USER"` twice: at line 84
 * (merge the updated user when it is me) and again at line 94 (keep `departments_handled`
 * in sync when I am added to / removed from a department's handler list). A JavaScript
 * switch dispatches to the FIRST matching case, so the second block never executes.
 *
 * The consequence in production (corrected by audit 2026-08-19): the dead second block is not
 * what breaks the handler flow — no UPDATE_USER dispatch carries a `department` payload. The
 * handler screen dispatches UPDATE_USER_DEPARTMENT_HANDLED (assignDepartmentHandlersActions.js:23),
 * which NO reducer anywhere handles, so the signed-in user's `departments_handled` never refreshes
 * and they must re-login to see the change. The only real UPDATE_USER dispatch is
 * assignRoleActions.js:85 with a `user` payload. `case "FETCH_ALL_ASSETS"` is likewise duplicated
 * at lines 150 and 159, though there the two bodies are identical so nothing is lost.
 *
 * This is language semantics, not a jsdom artefact. When the duplicate is renamed/merged,
 * this test fails — that is the signal to assert the department is actually appended.
 */
test('_FINDING_USR_DUP_CASE_1 an UPDATE_USER carrying a department payload never touches departments_handled', () => {
    const state = {
        ...loggedUser,
        departments_handled: [{ id: 1, department_name: 'Finance' }],
    };

    const result = userReducer(state, {
        type: 'UPDATE_USER',
        department: {
            id: 2,
            department_name: 'Operations',
            department_handlers: [{ emp_num: 'EV0007' }],
        },
    });

    expect(result.departments_handled).toEqual([{ id: 1, department_name: 'Finance' }]);
});
