import React, { Component } from "react";
import "./Dashboard.css";
import { connect } from 'react-redux'
import { fetchUser } from '../../store/actions/userActions'

class Dashboard extends Component {

    constructor(props){
      super(props)
    }
    
    render(){
      const { user } = this.props;
      const payload = user.payload ? JSON.stringify(user.payload): "No Payload Yet!";

        return (
          <div>
            <h1>Welcome to EVOX!</h1>
            {payload}
            <button onClick={this.props.fetchUser}>Load Users</button>
          </div>
        );
    }
};

const mapStateToProps = (state) => {
  return {
      user : state.user
  }
}
const mapDispatchToProps = (dispatch) => {
  return {
    fetchUser : () => dispatch( fetchUser() )
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(Dashboard);
