// Generic React Imports
import React from "react";
import ReactDOM from "react-dom";
import { BrowserRouter } from "react-router-dom";
import { createStore, applyMiddleware } from 'redux';
import rootReducer from './store/reducers/rootReducers';
import { Provider } from 'react-redux';
import thunk from 'redux-thunk';

// Import the App Component itself.
import App from "./App";

// Import all the CSS required.
import "bootstrap/dist/css/bootstrap.min.css";
import "react-loader-spinner/dist/loader/css/react-spinner-loader.css"

// Imports the Constant Variables that will be used all through out the application.
import "./config/GlobalVariables";


const store = createStore(rootReducer, applyMiddleware( thunk ));

ReactDOM.render(
  <BrowserRouter>
    <Provider store={store}>
      <App />
    </Provider>
  </BrowserRouter>,
  document.getElementById("root")
);
