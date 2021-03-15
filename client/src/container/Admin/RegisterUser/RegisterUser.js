import React, { Component, useState, useEffect ,setState } from "react";
import DatePicker from "react-datepicker";
import { Container,Row,Col,Table,Image, Spinner,Button, Form  } from 'react-bootstrap';
import "./RegisterUser.css";
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import moment from 'moment';
import { connect } from 'react-redux';
import * as Yup from 'yup';
import MultiSelect from "react-multi-select-component";

import Wrapper from "../../../components/Template/Wrapper";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../../components/GridComponent/AdminLte.js';

import { fetchDepartmentList, fetchRoleList } from '../../../store/actions/lookup/lookupListActions';
import { registerUser } from '../../../store/actions/admin/registerUserActions';
import Formatter from "../../../services/Formatter";
import Validator from "../../../services/Validator";

class RegisterUser extends Component {

	constructor(props) {
		super(props);
		this.state = { roles : [] , userLists : null ,  userRole : [] , selectedUser : null };
    

    this.initialState = {
      roles                 : [],
      first_name            : null,
      last_name             : null,
      email                 : null,
      departments_handled   : [],
      departmentList        : [],
      roleList              : [],
    }   
    
    this.state = this.initialState; 

    this.handleChange                     = this.handleChange.bind(this);
    this.handleSelectRoles                = this.handleSelectRoles.bind(this);
    this.handleSelectedDepartmentsHandled = this.handleSelectedDepartmentsHandled.bind(this);
  }


	onSubmitHandler = async(values) => {

    // Setting of Form Data to be passed in the submission
    var formData ={
      roles: [],
      departments_handled : []
    };

    for (var key in values) {
    
        if( values[key] != null ) {
            switch( key ) {
              case 'roles':
              case 'departments_handled':
                    for (var bufferKey in values[key]) {
                      formData[key].push(values[key][bufferKey].value)
                    }
                    break;
                default:
                    formData[key] = values[key];
                    break;
            }
        }
    }

    if (window.confirm("Are you sure about the details of the User to be registered?")) {

        await this.props.registerUser( formData );

    }
	}

  handleChange(e) {
    this.setState({ [e.target.name] : e.target.value });
  }

  // Function for handling the onChange of Selected Roles
  handleSelectRoles = ( values) =>{
    this.setState({ 
        roles : values
    });
  }

  
  // Function for handling the onChange of Selected Department
  handleSelectedDepartmentsHandled = ( values ) => {
    this.setState({ 
        departments_handled : values
    });
  }

  componentWillMount = async() => {
    await this.props.fetchDepartmentList();
    await this.props.fetchRoleList();

  }

  componentWillReceiveProps = async(nextProps) => {
    
    // If the Department Props changed ( loaded from API call ), update the State for the departmentList
    if( nextProps.department != this.props.department ) {

      // Iterates the Option to be shown for the Department List
      let department_list = [];
      if( nextProps.department != undefined ) {

        for (var i = 0; i < nextProps.department.length; i++) {
          department_list.push({
            label  : nextProps.department[i].department_name,
            value  : nextProps.department[i].id
          })
        }
      }

      // Set the Department List
      this.setState({
        departmentList : department_list
      });

    }

    // If the Roles Props changed ( loaded from API call ), update the State for the roleList
    if( nextProps.roles != this.props.roles ) {

      // Iterates the Option to be shown for the Department List
      let role_list = [];
      if( nextProps.roles != undefined ) {

        for (var i = 0; i < nextProps.roles.length; i++) {
          if( nextProps.roles[i].name == 'client' ) {
            role_list.push({
              label  : Formatter.slug_to_title(nextProps.roles[i].name),
              value  : nextProps.roles[i].name
            })
          }
        }

        // Set the Role List
        this.setState({
          roleList : role_list
        });
      }
    }

  }

	render = () => {  

  var validationSchema = Yup.object().shape({
      roles:                   Yup.array().min(1, '1 minimum selected Role').required("This field is required"),
      first_name:              Yup.string().min(3, '3 Minimum Characters').max(255, '255 Maximum Characters').required("This field is required").nullable(),         
      last_name:               Yup.string().min(3, '3 Minimum Characters').max(255, '255 Maximum Characters').required("This field is required").nullable(),         
      email:                   Yup.string().min(3, '3 Minimum Characters').max(255, '255 Maximum Characters').required("This field is required").email('Not a valid email address.').nullable(),
      departments_handled:     Yup.array().min(1, '1 minimum selected Department').required("This field is required")

  });


	return(
    <Wrapper previousPath={this.props.location.previousPath} role={'admin'} permission={'full_access'}>
      <Formik 
        enableReinitialize
        onSubmit={this.onSubmitHandler} 
        validationSchema={validationSchema} 
        initialValues={this.state}>
        {
        ({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
          <form onSubmit={handleSubmit}>
              <ContainerWrapper>
                  <ContainerBody>
                      <Content col="6" title="Register User" >
                        <Col>                                 
                          <Row>   
                              <div className="form-group" style={{'width': '100%', 'paddingLeft': '12.5px', 'paddingRight' : '12.5px'}}>
                                  <label>Select Role(s):</label>
                                  <MultiSelect
                                          name="roles[]"
                                          options={this.state.roleList}
                                          value={values.roles}
                                          onChange={this.handleSelectRoles}
                                    />
                                  <Form.Control.Feedback type="invalid">
                                    <ErrorMessage component="div" name="roles" className="input-feedback" />
                                  </Form.Control.Feedback> 
                              </div>
                          </Row>
                          { this.state.roles?.length > 0 ? 
                          <div>
                              <Row>  
                                <Col size="6"> 
                                  <div className="form-group">
                                    <label>First Name:</label>
                                    <input type="text" className="form-control" name="first_name" onChange={(e) => { this.handleChange(e); }} value={values.first_name} />
                                    <Form.Control.Feedback type="invalid">
                                      <ErrorMessage component="div" name="first_name" className="input-feedback" />
                                    </Form.Control.Feedback> 
                                  </div>
                                </Col> 
                                <Col size="6">   
                                  <div className="form-group">
                                    <label>Last Name:</label>
                                    <input type="text" className="form-control" name="last_name" onChange={(e) => { this.handleChange(e); }} value={values.last_name} />
                                    <Form.Control.Feedback type="invalid">
                                      <ErrorMessage component="div" name="last_name" className="input-feedback" />
                                    </Form.Control.Feedback> 
                                  </div>
                                </Col> 
                              </Row> 
                              <Row>  
                                <Col size="6"> 
                                  <div className="form-group">
                                    <label>E-mail Address:</label>
                                    <input type="text" className="form-control" name="email" onChange={(e) => { this.handleChange(e); }} value={values.email} />
                                    <Form.Control.Feedback type="invalid">
                                      <ErrorMessage component="div" name="email" className="input-feedback" />
                                    </Form.Control.Feedback> 
                                  </div>
                                </Col> 
                                { Validator.inObjectArray(this.state.roles, 'value', 'employee') || Validator.inObjectArray(this.state.roles, 'value', 'supervisor')  ? (
                                  <Col size="6"> 
                                    <div className="form-group">
                                        <label>Departments:</label>
                                        <select
                                            name="department_id"
                                            className="form-control"
                                            value={values.department_id}
                                            onChange={(e) => { this.handleChange(e); }}
                                            style={{ display: 'block' }}
                                        >
                                            <option value="" label="" />
                                            {/* Manually generate the Option element w/ extra attributes (Pass the Department Handlers as stringified JSON) */}
                                            { this.props.department?.length > 0 ? 
                                                this.props.department.map((value, index) => {
                                                  return <option 
                                                          value={value.id} 
                                                          >
                                                            { value.department_name }
                                                          </option>;
                                                })
                                              :
                                              null
                                            }
                                        </select>
                                        <Form.Control.Feedback type="invalid">
                                          <ErrorMessage component="div" name="department_id" className="input-feedback" />
                                        </Form.Control.Feedback> 
                                    </div>
                                  </Col> ) 
                                  : null
                                }
                              </Row> 
                              <Row>  
                                { Validator.inObjectArray(this.state.roles, 'value', 'supervisor') || Validator.inObjectArray(this.state.roles, 'value', 'client') ? (
                                  <Col size="6"> 
                                    <div className="form-group">
                                        <label>Departments to handle:</label>
                                        <MultiSelect
                                          name="departments_handled[]"
                                          options={this.state.departmentList}
                                          value={values.departments_handled}
                                          onChange={this.handleSelectedDepartmentsHandled}
                                        />                
                                      <Form.Control.Feedback type="invalid">
                                        <ErrorMessage component="div" name="departments_handled" className="input-feedback" />
                                      </Form.Control.Feedback> 

                                    </div>
                                  </Col> ) 
                                  : null
                                }
                              </Row> 
                              <Row>  
                                <Col size="6"> 
                                  <Button className="display-block" variant="primary" type="submit">
                                    Register
                                  </Button>	
                                </Col>
                              </Row> 
                        </div>
                        : null
                        }
                        </Col>
                      </Content>
                </ContainerBody>
            </ContainerWrapper>
        </form>
	    )}
  	  </Formik>
    </Wrapper>);

  }
}
  
const mapStateToProps = (state) => {
  return {
    department            : state.lookup.department,
		roles             		: state.lookup.roles,
    isSuccessful          : state.registerUser.isSuccessful
  }
}
  
const mapDispatchToProps = (dispatch) => {
  return {
    fetchDepartmentList       : () => dispatch( fetchDepartmentList() ),
		fetchRoleList             : () => dispatch( fetchRoleList() ),
    registerUser              : ( formData ) => dispatch( registerUser( formData ) ),
  } 
}
export default connect(mapStateToProps, mapDispatchToProps)(RegisterUser);
  