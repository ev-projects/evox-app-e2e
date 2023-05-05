
import React from "react";
import { Button } from 'react-bootstrap';
import { connect } from 'react-redux';
import { setRedirect } from '../../../store/actions/redirectActions';
import "./BackButton.css";

// Component for the Back Button 
const BackButton = (props) => { 

    return <Button style={ props.style? props.style : null} type="button" className="back-button btn btn-secondary" onClick={() => props.history.goBack() } ><i className="fa fa-arrow-circle-left" /> Back</Button>;
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