

// Declare all Reducers below....
import userReducer from './userReducers';
import pageReducer from "./pageReducers";
import alertReducer from "./alertReducers";
import scheduleReducer from "./scheduleReducers";

// Combiner of Reducers.
import { combineReducers } from 'redux';

const rootReducer = combineReducers({
    page : pageReducer,
    user : userReducer,
    alert: alertReducer,
    schedule: scheduleReducer
});

export default rootReducer;