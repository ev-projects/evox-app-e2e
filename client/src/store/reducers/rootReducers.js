

// Declare all Reducers below....
import userReducer from './userReducers';
import pageReducer from "./pageReducers";
import alertReducer from "./alertReducers";
import scheduleReducer from "./scheduleReducers";
import constantReducers from "./constantReducers";

import alterLogReducers from "./requests/alterLogReducers";
import changeScheduleReducers from "./requests/changeScheduleReducers";
import overtimeReducers from "./requests/overtimeReducers";
import restDayWorkReducers from "./requests/restDayWorkReducers"
import redirectReducers from "./redirectReducers";

import requestListReducers from "./requestListReducers";
import payrollCutoffReducers from "./settings/payrollCutoffReducers"

import dtrReducer from "./dtrReducers";

// Combiner of Reducers.
import { combineReducers } from 'redux';

const rootReducer = combineReducers({
    page : pageReducer,
    user : userReducer,
    alert: alertReducer,
    dtr: dtrReducer,
    schedule: scheduleReducer,
    constant : constantReducers,

    alterLog : alterLogReducers,
    changeSchedule: changeScheduleReducers,
    overtime : overtimeReducers,
    restDayWork : restDayWorkReducers,

    payrollCutoff: payrollCutoffReducers,
    requestList: requestListReducers,

    redirect : redirectReducers
});

export default rootReducer;