// Generic React Imports
import React from "react";
import ReactDOM from "react-dom";
import { BrowserRouter } from "react-router-dom";
import { Provider } from 'react-redux';

// Import the App Component itself.
import App from "./App";

// Import all the CSS required.
import "bootstrap/dist/css/bootstrap.min.css";
import "react-loader-spinner/dist/loader/css/react-spinner-loader.css"

// Imports the Constant Variables that will be used all through out the application.
import "./config/GlobalVariables";

// Imports the store component
import store from './store'



ReactDOM.render(
  <BrowserRouter>
    <Provider store={store}>
      <App />
    </Provider>
  </BrowserRouter>,
  document.getElementById("root")
);
