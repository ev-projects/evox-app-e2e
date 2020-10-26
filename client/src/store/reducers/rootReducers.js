

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
import payrollCutoffReducers from "./admin/payrollCutoffReducers"

import lookupListReducers from "./lookup/lookupListReducers"

import dtrReducer from "./dtrReducers";

import dtrSummaryReducers from "./dtrSummaryReducers";
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
    dtrSummary: dtrSummaryReducers,

    lookup:   lookupListReducers,

    redirect : redirectReducers
});

export default rootReducer;