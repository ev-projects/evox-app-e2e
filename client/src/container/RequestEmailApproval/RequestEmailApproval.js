import React, { Component } from "react";
import { connect } from 'react-redux';
import { logIn } from '../../store/actions/userActions'
import { showAlert } from '../../store/actions/settings/alertActions'
import { Link } from "react-router-dom";
import Validator from "../../services/Validator";
import { Form,Button,Container,Col,Card,InputGroup,FormControl,Image } from 'react-bootstrap';
import { Spring } from 'react-spring/renderprops';
import { Formik } from 'formik';
import * as yup from "yup";

import styles from "./RequestEmailApproval.css";

import { requestApprovalChangeStatus } from '../../store/actions/approval/requestApprovalActions';
import PageLoading from "../PageLoading";
import Formatter from "../../services/Formatter";

class RequestEmailApproval extends Component {

  
  constructor(props){
    super(props);
    this.state ={
      isLoading : true
    }; 
  }

  componentDidMount() {
    // If the HashCode and Status is in the URL parameter, proceed on calling the Request Approval Change Status
    if ( Validator.isValid( this.props.match.params.hashCode ) && Validator.isValid( this.props.match.params.status ) ) {
        this.props.requestApprovalChangeStatus( this.props.match.params.hashCode, this.props.match.params.status );
    }
  }

  componentWillReceiveProps = async(nextProps) => {
    if( nextProps.requestApproval?.isInstanceValid != this.props.requestApproval?.isInstanceValid) {
        this.setState({
          isLoading : false
        })
    }
  }

  render = () => {  

    const { instance, isInstanceValid } = this.props.requestApproval;
    const { user } = this.props;

    return ( this.state.isLoading ? <PageLoading/> :
        <div id="requestEmailApproval">
          <Container className="min-vh-80 d-flex justify-content-center">
              <Col md={5}>
                  <Card>
                      <Card.Body>
                      <p>
                          { isInstanceValid ? 
                              <span>
                                The <b>{Formatter.slug_to_title( instance.request.request_type )}</b> request of <b>{instance.request.user.full_name}</b> { instance.is_changed ? " is now" : " has been already" } 
                                <b className={instance.request.status+"_status"}> { instance.request.status.toUpperCase() } </b>
                              </span>
                              :
                              <b>The link you are accessing is <span style={{color:"red"}}>invalid</span>.</b>
                          }
                          <br/>
                          <br/>
                          { ( Validator.isValid( localStorage.getItem("access_token") ) && Validator.isValid(user.id) ) ?
                            <Link className="btn btn-primary back-to-dashboard-btn" to={global.links.dashboard}>
                              Back to Dashboard
                            </Link>
                            :
                            <span>You can now close this tab.</span>
                          }
                          
                        </p>
                      </Card.Body>
                  </Card>
                  <div className="powered_by">Powered by &nbsp;
                    <Image src={process.env.PUBLIC_URL +"/images/eastvantage_logo.png"} fluid />
                  </div>
              </Col>
          </Container>
        </div>
  );
  }
}


// Object for Data Validation
const validationSchema = yup.object().shape({
  username: yup
    .string()
    .min(3)
    .max(255)
    .required(),
  password: yup
    .string()
    .min(3)
    .max(255)
    .required()
});


const mapStateToProps = (state) => {
  return {
    requestApproval : state.requestApproval,
    user : state.user
  }
}
const mapDispatchToProps = (dispatch) => {
    return {
      requestApprovalChangeStatus: ( hashCode, status ) => dispatch( requestApprovalChangeStatus( hashCode, status ) ),
    }
}
export default connect(mapStateToProps, mapDispatchToProps)(RequestEmailApproval);
