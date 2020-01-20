

// Declare all Reducers below....
import userReducer from './userReducers';
import pageReducer from "./pageReducers";

// Combiner of Reducers.
import { combineReducers } from 'redux';

const rootReducer = combineReducers({
    page : pageReducer,
    user : userReducer
});

export default rootReducer;