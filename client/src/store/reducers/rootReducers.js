

// Declare all Reducers below....
import userReducer from './userReducers';
import pageReducer from "./pageReducers";
import alertReducer from "./alertReducers";

// Combiner of Reducers.
import { combineReducers } from 'redux';

const rootReducer = combineReducers({
    page : pageReducer,
    user : userReducer,
    alert: alertReducer
});

export default rootReducer;