// Generic React Imports
import React, { Component } from "react";
import { connect } from 'react-redux';

// Import the AlertContainer Component
import AlertContainer from "./components/Template/AlertContainer";

// Import the LoaderContainer Component.
import LoaderContainer from "./components/Template/LoaderContainer";

// This handles all the Routings all through out the application.
import RouteList from "./config/RouteList";
import Validator from "./services/Validator";

// Import fetchUser from userActions
import { fetchUser } from './store/actions/userActions'
import { fetchStatusNumbers } from './store/actions/filters/requestListActions';

//Import ModalLoginContainer Component
import ModalLoginContainer from "./components/Template/ModalLoginContainer";

class App extends Component {

  componentDidMount() {

    // Analyze the site only if there's a valid Google Analytics Link and ID
    if (Validator.isValid(process?.env?.REACT_APP_GOOGLE_ANALYTICS_LINK) && Validator.isValid(process?.env?.REACT_APP_GOOGLE_ANALYTICS_ID)) {

      // Append Google Analytics Script
      const script = document.createElement("script");
      script.src = process.env.REACT_APP_GOOGLE_ANALYTICS_LINK;
      script.async = true;
      document.body.appendChild(script);

      // Append data on dataLayer
      window.dataLayer = window.dataLayer || [];
      function gtag() { window.dataLayer.push(arguments); }
      gtag('js', new Date());
      gtag('config', process.env.REACT_APP_GOOGLE_ANALYTICS_ID);
    }
  }

  render() {

    if (process.env.NODE_ENV === "production") {
      if (window.console && console) {
        for (let c in console) {
          if (typeof console[c] === 'function') {
            const cx = console[c]
            console[c] = function () {
                //do nothing
                //cx.apply(this, ["Logger supressed"])
            }
          }
        }
      }
    }

    // If there's an Existing Access Token, fetch the Users and render it on Redux.
    if (localStorage.getItem("access_token") != null) {
      this.props.fetchUser();
      // this.props.fetchStatusNumbers();
    }

    return (
      <div className="App">
        <LoaderContainer />
        <AlertContainer />
        <ModalLoginContainer />
        <RouteList />
      </div>
    );
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    fetchUser: () => {
      dispatch(fetchUser())
    },
    fetchStatusNumbers: () => dispatch(fetchStatusNumbers({
      status: "pending",
      valid_from: null,
      valid_to: null,
      department_id: null,
      name: null,
      page: 1,
      checkedList: [],
      isAll: false,
      action: null,
      request_type: 'all',
      bulk_action: null,
      url: 'my_team_requests'
    })),
  }
}
export default connect(null, mapDispatchToProps)(App);