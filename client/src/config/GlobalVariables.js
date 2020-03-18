/**
 *  This serves as the container of the Global Variables that would be used all through out the app.
 *  All the static data that are not too often to change should be stored here.
 */

global.login_url = "/login";
global.dashboard_url = "/app/Dashboard";
global.template_list_url = "/app/schedule/template/";
global.template_add = "/app/schedule/";
global.daily_time_record_view = "/app/dtr/";


global.invalid_token_response = [
    'token_expired',
    'token_invalid',
    'token_absent'
];

/**
 *  Input all additional Global Variables above.
 */
