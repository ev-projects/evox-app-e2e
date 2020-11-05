
import React from "react";
import { Button } from 'react-bootstrap';
import { connect } from 'react-redux';
import { setRedirect } from '../../../store/actions/redirectActions';
import "./BackButton.css";

// Component for the Back Button 
const BackButton = (props) => { 
    
    return ( props.location.previousPath != undefined ? 
        <Button type="button" className="btn btn-secondary" onClick={() => props.setRedirect( props.location.previousPath )} >Back</Button>
        :
        null
      );
}

const mapStateToProps = (state) => {
    return {
        dtr : state.dtr,
        settings: state.settings
    }
}
const mapDispatchToProps = (dispatch) => {
    return {
        setRedirect           : ( link ) => dispatch( setRedirect( link ) )
    }
}
export default connect(mapStateToProps, mapDispatchToProps)(BackButton);