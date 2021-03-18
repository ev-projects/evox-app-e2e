

// Declare all Reducers below....
import userReducer from './user/userReducers';

import profileReducer from './profile/profileReducer';

import pageReducer from "./settings/pageReducers";
import alertReducer from "./settings/alertReducers";
import scheduleReducer from "./schedule/scheduleReducers";

import constantReducers from "./settings/constantReducers";
import settingsReducers from "./settings/settingsReducers";

import alterLogReducers from "./requests/alterLogReducers";
import changeScheduleReducers from "./requests/changeScheduleReducers";
import overtimeReducers from "./requests/overtimeReducers";
import restDayWorkReducers from "./requests/restDayWorkReducers"

import requestApprovalReducers from "./approvals/requestApprovalReducers";

import redirectReducers from "./settings/redirectReducers";

import payrollCutoffReducers from "./admin/payrollCutoffReducers"

import assignRoleReducers from "./admin/assignRoleReducers" 
import registerUserReducers from "./admin/registerUserReducers"
import syncBhrReducers from "./admin/syncBhrReducers"
import lookupListReducers from "./lookup/lookupListReducers"

import dtrReducer from "./dtr/dtrReducers";

import dtrSummaryReducers from "./dtr/dtrSummaryReducers";
import dtrLogsReducers from "./dtr/dtrLogsReducers";

import myRequestListReducers from "./filters/myRequestListReducers";
import dpaListReducers from "./filters/dpaListReducers";
import myTeamListReducers from "./filters/myTeamListReducers";
import myTeamRequestListReducers from "./filters/myTeamRequestListReducers";

// Combiner of Reducers.
import { combineReducers } from 'redux';

const rootReducer = combineReducers({
    
    page : pageReducer,

    user : userReducer,

    profile : profileReducer,
    
    alert: alertReducer,
    dtr: dtrReducer,
    schedule: scheduleReducer,
    constant : constantReducers,
    settings : settingsReducers,

    alterLog : alterLogReducers,
    changeSchedule: changeScheduleReducers,
    overtime : overtimeReducers,
    restDayWork : restDayWorkReducers,
    requestApproval : requestApprovalReducers,

    payrollCutoff: payrollCutoffReducers,

    assignRole: assignRoleReducers,
    registerUser: registerUserReducers,  
    syncBhrReducers: syncBhrReducers,  
    myRequestList       : myRequestListReducers,
    dpaList             : dpaListReducers,
    myTeamList          : myTeamListReducers,
    myTeamRequestList   : myTeamRequestListReducers,
    

    dtrSummary: dtrSummaryReducers,
    dtrLogs: dtrLogsReducers,

    lookup:   lookupListReducers,

    redirect : redirectReducers
});

export default rootReducer;