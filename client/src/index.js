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

const pending = {}
const CancelToken = axios.CancelToken
const removePending = (config, f) => {
  if (config) {
    const url = config.url.replace(config.baseURL, '/')
    const flagUrl = url + '&' 
                    + config.method + '&' 
                    + JSON.stringify(config.params)
    if (flagUrl in pending) {
      if (f) {
        f() 
      } else {
        delete pending[flagUrl]
      }
    } else {
      if (f) {
        pending[flagUrl] = f 
      }
    }
  }
}
axios.interceptors.request.use(config => {
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
      return Promise.resolve({
        status:0,
        error: {
          message : 'INTERCEPTED_DUPLICATE_REQUEST'
        }
      });
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
