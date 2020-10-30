

// Declare all Reducers below....
import userReducer from './user/userReducers';
import pageReducer from "./settings/pageReducers";
import alertReducer from "./settings/alertReducers";
import scheduleReducer from "./schedule/scheduleReducers";

import constantReducers from "./settings/constantReducers";
import settingsReducers from "./settings/settingsReducers";

import alterLogReducers from "./requests/alterLogReducers";
import changeScheduleReducers from "./requests/changeScheduleReducers";
import overtimeReducers from "./requests/overtimeReducers";
import restDayWorkReducers from "./requests/restDayWorkReducers"
import redirectReducers from "./settings/redirectReducers";

import requestListReducers from "./requests/requestListReducers";
import payrollCutoffReducers from "./admin/payrollCutoffReducers"

import lookupListReducers from "./lookup/lookupListReducers"

import dtrReducer from "./dtr/dtrReducers";

import dtrSummaryReducers from "./dtr/dtrSummaryReducers";
// Combiner of Reducers.
import { combineReducers } from 'redux';

const rootReducer = combineReducers({
    
    page : pageReducer,
    user : userReducer,
    alert: alertReducer,
    dtr: dtrReducer,
    schedule: scheduleReducer,
    constant : constantReducers,
    settings : settingsReducers,

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