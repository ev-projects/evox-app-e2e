

// Declare all Reducers below....
import userReducer from './userReducers';
import pageReducer from "./pageReducers";
import alertReducer from "./alertReducers";
import scheduleReducer from "./scheduleReducers";
import constantReducers from "./constantReducers";

import overtimeReducers from "./overtimeReducers";
import alterLogReducers from "./alterLogReducers";

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
    overtime : overtimeReducers,
});

export default rootReducer;