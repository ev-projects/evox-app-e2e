// Generic React Imports
import React, { Component } from "react";
import { connect } from 'react-redux';
import { Redirect } from 'react-router-dom';


// Import the LoaderContainer Component.
import LoaderContainer from "./components/Template/LoaderContainer";

// This handles all the Routings all through out the application.
import RouteList from "./config/RouteList";

// Import fetchUser from userActions
import { fetchUser } from './store/actions/userActions'

class App extends Component {


  render(){

    // If there's an Existing Access Token, fetch the Users and render it on Redux.
    if( localStorage.getItem("access_token") != null ) {
      this.props.fetchUser();
    }

    return (
      <div className="App">
        <RouteList />
        <LoaderContainer />
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