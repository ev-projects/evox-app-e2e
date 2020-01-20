/**
 *  This serves as the container of the Global Variables that would be used all through out the app.
 *  All the static data that are not too often to change should be stored here.
 */

global.base_url = "http://localhost:3000";
global.api_base_url = "http://127.0.0.1:8000/api";

global.login_url = "/login";
global.dashboard_url = "/app/Dashboard";

global.invalid_token_response = [
    'token_expired',
    'token_invalid',
    'token_absent'
];

/**
 *  Input all additional Global Variables above.
 */
