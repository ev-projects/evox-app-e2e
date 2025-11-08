import React, { Component } from "react";
import "./LeaveCredits.css";
import { Container,Row,Col,Table,Image, Spinner,Button,Form,InputGroup,FormControl   } from 'react-bootstrap';
import { connect } from 'react-redux';
import { useFormikContext } from 'formik';
import { fetchTimeOff ,changePassword } from '../../../store/actions/profile/profileActions' ;

import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../../components/GridComponent/AdminLte.js';
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import * as Yup from 'yup';
import Wrapper from "../../../components/Template/Wrapper";
import BackButton from "../../../components/Template/BackButton";
import Validator from "../../../services/Validator";
import Authenticator from "../../../services/Authenticator";
import { Link } from "react-router-dom"; 
import moment from 'moment';
import Formatter from "../../../services/Formatter";
import RestDayWork from "../../Request/RestDayWork";
import { LeaveIcon } from "../TimeOff/TimeOff";

const LeaveCredits = ( props ) => {

    const { profile, user } = props;


   return ( 
        Validator.isValid( profile ) ?
        <React.Fragment>
            { profile.leave_credits?.length > 0 ? 
                <div className="col-lg-12" >
                  <Row className="leave-credits">
                    { profile.leave_credits.map(function (leave_credit, i) {
                      if (leave_credit.balance > 0) {
                        return (
                          <Col key={i} xs={12} className="mb-3">
                            <div className="leave-card">
                              <span className="leave-card-type">{leave_credit.type}</span> <br />
                              <span>
                                <LeaveIcon type={leave_credit.type} />{" "}
                                <span className="leave-card-balance">{leave_credit.balance}</span>
                              </span> <br />
                              <span className="leave-card-note">DAYS AVAILABLE</span>
                            </div>
                          </Col>
                        );
                      }
                    })}
                  </Row>
                </div>
                :
                null
            } 
        </React.Fragment>
        :
        null
    );

};

const mapStateToProps = (state) => {
  return {
      profile : state.profile,
      user : state.user
  }
} 
const mapDispatchToProps = (dispatch) => {

  return {
    fetchTimeOff : ( id, start_date, end_date ) => dispatch( fetchTimeOff( id, start_date, end_date ) )

  }
}
export default connect(mapStateToProps, mapDispatchToProps)(LeaveCredits);
