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

import axios from "axios";

// abort duplicate request
const pending = {}
const CancelToken = axios.CancelToken
const removePending = (config, f) => {
  if (config) {
    // make sure the url is same for both request and response
    const url = config.url.replace(config.baseURL, '/')
    // stringify whole RESTful request with URL params
    const flagUrl = url + '&' 
                    + config.method + '&' 
                    + JSON.stringify(config.params)
    if (flagUrl in pending) {
      if (f) {
        f() // abort the request
      } else {
        delete pending[flagUrl]
      }
    } else {
      if (f) {
        pending[flagUrl] = f // store the cancel function
      }
    }
  }
}
// axios interceptors
axios.interceptors.request.use(config => {
  // you can apply cancel token to all or specific requests
  // e.g. except config.method == 'options'
  config.cancelToken = new CancelToken((c) => {
    removePending(config, c)
  })
  return config
}, error => {
  Promise.reject(error)
});

axios.interceptors.response.use(
  response => {
    removePending(response.config)
    return response
  },
  error => {
    removePending(error.config)
    
    if (!axios.isCancel(error)) {
      return Promise.reject(error)
    } else {
      // return empty object for aborted request
      return Promise.resolve({
        status: 200,
        statusText: "OK",
        data: { data:[]}
      })
    }
  }
);

ReactDOM.render(
  <BrowserRouter>
    <Provider store={store}>
      <App />
    </Provider>
  </BrowserRouter>,
  document.getElementById("root")
);
