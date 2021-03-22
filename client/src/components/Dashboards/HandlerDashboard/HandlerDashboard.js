import React, { Component } from "react";
import "./HandlerDashboard.css";
import { Container,Row,Col,Table,Image, Spinner,Button  } from 'react-bootstrap';
import { Link } from "react-router-dom";
import { connect } from 'react-redux';
import { fetchUser } from '../../../store/actions/userActions' ;

import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../GridComponent/AdminLte.js';
import Wrapper from "../../Template/Wrapper";
import ReactPlayer from 'react-player/lazy';
import * as yup from "yup";
import QuickPunch from "../../../container/QuickPunch";

const HandlerDashboard = ( props ) => {

    
    
    const { user } = props;
    const payload = user.payload ? JSON.stringify(user.payload): "No Payload Yet!";

    return (<div style={{'flex': '1 1 auto', 'padding': '1.25rem'}}>
              <Row>
                <div className="col-lg-8 col-md-7 col-sm-12">
                  <Row>                                    
                    <div className="form-group">
                        <select
                            name="department_id"
                            className="form-control"
                            style={{ display: 'block' }}
                        >
                        <option value="" label="Select Account" />
                        { user?.departments_handled.length > 0 ? 
                            user.departments_handled.map((value, index) => {
                                return <option value={value.id} >{value.department_name}</option>;
                            })
                          :
                          null
                        }
                        </select>
                    </div>
                  </Row>
                </div>
              </Row>
            </div>
        );
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
export default connect(mapStateToProps, mapDispatchToProps)(HandlerDashboard);
