import React, { Component } from "react";
import "./JobInformation.css";
import { Container,Row,Col,Table,Image, Spinner,Button,Form,InputGroup,FormControl   } from 'react-bootstrap';
import { connect } from 'react-redux';
import { useFormikContext } from 'formik';
import { fetchJobInformation ,changePassword } from '../../../store/actions/profile/profileActions' ;

import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../../components/GridComponent/AdminLte.js';
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import * as Yup from 'yup';
import Wrapper from "../../../components/Template/Wrapper";
import BackButton from "../../../components/Template/BackButton";
import Validator from "../../../services/Validator";
import Authenticator from "../../../services/Authenticator";
import { Link } from "react-router-dom"; 

const JobInformation = ( props ) => {

    const { profile, user } = props;

    return ( 
        Validator.isValid( profile ) ?
        <Row>            
            <div className="col-lg-12" >
            { profile.employment_status != null ?
                <React.Fragment>                  
                    <div className="content-table">
                        <h4>Employment Status </h4> 
                        <Table striped bordered hover>
                            <thead>
                                <tr>
                                <th>Effective Date</th>
                                <th>Employment Status</th>
                                <th>Comment</th>
                                </tr>
                            </thead>
                            <tbody>
                                {profile.employment_status.slice().reverse().map(function (data, i) {
                                    return  (<tr>
                                    <td>{data.date}</td>
                                    <td>{data.emp_status}</td>
                                    <td>{data.comment}</td>
                                    </tr>)
                                }) 
                            }
                                
                            </tbody>
                        </Table>
                    </div>
                </React.Fragment>
            :
                null
            } 
            { profile.job_information != null ? 
                <React.Fragment>
                    <div className="content-table">
                        <br />
                        <h4> Job Information </h4> 
                        <Table striped bordered hover>
                            <thead>
                                <tr>
                                <th>Effective Date</th>
                                <th>Location Status</th>
                                <th>Department</th>
                                <th>Job Title</th>
                                <th>Reports To</th>
                                </tr>
                            </thead>
                            <tbody>
                            { Authenticator.checkRole('client') && props.id != user.id ? 
                            <React.Fragment>
                            {profile.job_information.slice().reverse().map(function (data, i) {
                                if(user.department==data.department){
                                    return  (<tr>
                                        <td>{data.date}</td>
                                        <td>{data.location}</td>
                                        <td>{data.department}</td>
                                        <td>{data.jobTitle}</td>
                                        <td>{data.reportsTo}</td>
                                        </tr>)
                                }
                                }) 
                            }
                            </React.Fragment>
                            :<React.Fragment>
                            {profile.job_information.slice().reverse().map(function (data, i) {
                                return  (<tr>
                                    <td>{data.date}</td>
                                    <td>{data.location}</td>
                                    <td>{data.department}</td>
                                    <td>{data.jobTitle}</td>
                                    <td>{data.reportsTo}</td>
                                    </tr>)
                            }) 
                        }
                        </React.Fragment>
                        }
                            </tbody>
                        </Table>
                    </div>
                </React.Fragment>
            :
                null
            } 
            </div>
        </Row>
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

export default connect(mapStateToProps, null)(JobInformation);