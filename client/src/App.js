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

class App extends Component {

  componentDidMount () {

    // Analyze the site only if there's a valid Google Analytics Link and ID
    if( Validator.isValid( process?.env?.REACT_APP_GOOGLE_ANALYTICS_LINK ) && Validator.isValid( process?.env?.REACT_APP_GOOGLE_ANALYTICS_ID ) ){
      
      // Append Google Analytics Script
      const script = document.createElement("script");
      script.src = process.env.REACT_APP_GOOGLE_ANALYTICS_LINK;
      script.async = true;
      document.body.appendChild(script);

      // Append data on dataLayer
      window.dataLayer = window.dataLayer || [];
      function gtag(){window.dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', process.env.REACT_APP_GOOGLE_ANALYTICS_ID);
    }
  }
  
  render(){

    // If there's an Existing Access Token, fetch the Users and render it on Redux.
    if( localStorage.getItem("access_token") != null ) {
      this.props.fetchUser();
    }

    return (
      <div className="App">
        <LoaderContainer />
        <AlertContainer />
        <RouteList />
      </div>
    );
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    fetchUser:  () => {
       dispatch( fetchUser() )
    }
  }
}
export default connect(null, mapDispatchToProps)(App);