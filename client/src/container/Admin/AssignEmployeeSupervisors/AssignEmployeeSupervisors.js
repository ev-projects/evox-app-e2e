import React, { Component, useState } from "react";
import { connect } from 'react-redux';
import moment from 'moment';
import { Form,Button,InputGroup,FormControl  } from 'react-bootstrap';
import MultiSelect from "react-multi-select-component";

import "./AssignEmployeeSupervisors.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody,Row,Col } from '../../../components/GridComponent/AdminLte.js';

/** Form Manipulation */
import { Formik, ErrorMessage, getIn  } from 'formik';
import * as Yup from 'yup';

import PageLoading from "../../PageLoading";

import DateFormatter from "../../../services/DateFormatter";

import { fetchUserList, fetchDepartmentList } from '../../../store/actions/lookup/lookupListActions';
import { assignEmployeeSupervisorsActions } from '../../../store/actions/admin/assignEmployeeSupervisorsActions'

import Wrapper from "../../../components/Template/Wrapper";
import Validator from "../../../services/Validator";


class AssignEmployeeSupervisors extends Component {
  
  constructor(props) {
    super(props);

    this.initialState = {

      reloadingSupervisorList: false,

      showDepartmentList: false,
      showEmployeeList: false,

      departmentList : [],
      employeeList : [],

      selectedSupervisor : null,
      selectedDepartment : null,
      selectedValues: []
    }

    this.state = this.initialState;  
  }
  
  // Set the onSubmitHandler for submissions and check inside the function whether it's for Store/Update/Approve/Cancel/Decline
  onSubmitHandler = async (values) => {
    
    console.log(values);
    // Setting of Form Data to be passed in the submission
    var formData ={};

    for (var key in values) {
    
        if( values[key] != null ) {
            switch( key ) {
                case "user_id":
                    let user_id = [];
                    for (var i = 0; i < values[key].length; i++) {
                      user_id.push(values[key][i]['value']);
                    }
                    formData[key] = user_id;
                    break;
                default:
                    formData[key] = values[key];
                    break;
            }
        }
    }

    // If action is NULL, it means it's either store/update
    if (window.confirm("Are you sure you want to assign these Employees on the selected Supervisor?")) {

        this.setState({
          reloadingSupervisorList: true
        });

        await this.props.assignEmployeeSupervisorsActions( values.supervisor_id, formData );

        await this.setState({
          reloadingSupervisorList: false,
          selectedSupervisor: values.supervisor_id
        });
    }
  }


  // Function for handling the onChange of Supervisor Dropdown
  handleSelectSupervisor = (event) =>{

    // Set the Department Handlers as Selected Value
    this.setState({
        selectedSupervisor : event.target.value,
        departmentList     : JSON.parse(event.target.options[event.target.selectedIndex].getAttribute('departments_handled'))
    });

    if( Validator.isValid(event.target.value)  )  {
      this.setState({
        showDepartmentList : true,
        selectedDepartment : null,
        showEmployeeList : false,
        employeeList : [],
        selectedValues : [],
      });
    } else {
      this.setState({
        showDepartmentList : false,
        selectedDepartment : null,
        showEmployeeList : false,
        employeeList : [],
        selectedValues : [],
      });
    }

  }


 // Function for handling the onChange of Department Dropdown
 handleSelectDepartment = (event) =>{

  const value = event.target.value

  if( Validator.isValid( value )  )  {

    // This list will render the final list of employees base on the Department
    let employee_list = [];

    // This list will be the cross-matched existing Supervisory of the user
    let selected_values = [];

    // If the Department Users has values  base on the selected Department, proceed
    if( this.props.department != undefined  && this.props.department.some(department => department.id == value) ) {

      const department_index = this.props.department.findIndex(department => department.id == value)

      // Iterate the selected Department Users to formulate the final employee list.
      for (var i = 0; i < this.props.department[department_index].users.length; i++) {

        var employee = {
          label  : this.props.department[department_index].users[i].full_name,
          value  : this.props.department[department_index].users[i].id
        };

        // Don't include the selected Supervisor on the Employee List.
        // if( this.state.selectedSupervisor != employee.value ) {
        
        employee_list.push(employee)

        // Gets the index of the Supervisor from the list.
        const supervisor_index = this.props.supervisor.findIndex(supervisor => supervisor.id == this.state.selectedSupervisor);
        
        // Cross-check if the current employee in the iteration is within the existing supervisee. If so, set it as an existing selected values.
        if( this.props.supervisor[supervisor_index] != undefined &&
            this.props.supervisor[supervisor_index].supervisee.some(supervisee => supervisee.id == employee.value) ){

            selected_values.push(employee)
        }
        // }

      }
    } 

    this.setState({
      selectedDepartment : value,
      showEmployeeList : true,
      employeeList : employee_list,
      selectedValues : selected_values,
    });

  } else {

    this.setState({
      selectedDepartment : null,
      showEmployeeList : false,
      employeeList : [],
      selectedValues : [],
    });

  }

 }
  

  // Function for handling the onChange of Selected Supervisor
  setSelectedValues = ( values ) => {
    this.setState({
        selectedValues: values
    });
  }

  componentWillMount = async() => {

    await this.props.fetchUserList('supervisor');
    await this.props.fetchDepartmentList();

  }

  render = () => {  

    // Declares the Initial Values of the Form base.
    const initialValues = {
        supervisor_id : this.state.selectedSupervisor != undefined ? this.state.selectedSupervisor : null,
        department_id : this.state.selectedDepartment != undefined ? this.state.selectedDepartment : null,
        user_id : this.state.selectedValues != undefined ? this.state.selectedValues : null
    };

    // Show the form if the Department and Supervisor list has already loaded.
    return ( this.props.supervisor != undefined ? 
        <Wrapper previousPath={this.props.location.previousPath} role={'admin'} permission={'full_access'}>
              <ContainerWrapper>
                  <ContainerBody>
                      <Content col="6" title="Assign Employee Supervisors" >
                      {/* { this.state.renderForm ? */}
                        <Formik 
                          enableReinitialize="true"
                          onSubmit={this.onSubmitHandler}
                          initialValues={initialValues}
                        >
                        {
                        ({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
                            <form onSubmit={handleSubmit}> 
                            <Row> 
                              <Col size="6">
                                <Row>   
                                    <div className="form-group" style={{'width': '100%', 'paddingLeft': '12.5px'}}>
                                        <label>Supervisors:</label>
                                        <select
                                            name="supervisor_id"
                                            className="form-control"
                                            value={values.supervisor_id}
                                            onChange={(e) => {
                                              this.handleSelectSupervisor(e);
                                            }}
                                            style={{ display: 'block' }}
                                        >
                                            <option value="" label="" />

                                            {/* Manually generate the Option element w/ extra attributes (Pass the Department Handlers as stringified JSON) */}
                                            { !this.state.reloadingSupervisorList ? 
                                              this.props.supervisor.map((value, index) => {

                                                    let departments_handled = [];

                                                    if( value.departments_handled != undefined ) {
                                                        for (var i = 0; i < value.departments_handled.length; i++) {
                                                          departments_handled.push({
                                                            department_name   : value.departments_handled[i].department_name,
                                                            id                : value.departments_handled[i].id
                                                          })
                                                        }
                                                    }
                                                    return <option 
                                                            value={value.id} 
                                                            departments_handled={JSON.stringify( departments_handled )}
                                                            >
                                                              {value.full_name}
                                                            </option>;
                                                })
                                                :
                                                null
                                            }
                                        </select>
                                        <ErrorMessage component="div" name="supervisor" className="input-feedback" />
                                    </div>
                                </Row>

                                { /** Show the Supervisor List depending on the showDepartmentList State */
                                  this.state.showDepartmentList ?
                                  <Row>  
                                      {/** Shows the dropdown if there is existing Departments Handled by the Supervisor */}
                                      { this.state.departmentList.length > 0 ? 
                                        <div className="form-group"  style={{'width': '100%', 'paddingLeft': '12.5px'}}>
                                            <label>Departments Handled:</label>
                                            <select
                                                name="department_id"
                                                className="form-control"
                                                value={this.state.selectedDepartment}
                                                onChange={(e) => {
                                                  this.handleSelectDepartment(e);
                                                }}
                                                style={{ display: 'block' }}
                                            >
                                            <option value="" label="" />
                                            {/* Manually generate the Option element w/ extra attributes (Pass the Department Handlers as stringified JSON) */}
                                            { 
                                              this.state.departmentList.map((value, index) => {
                                                    return <option 
                                                            value={value.id} 
                                                            >
                                                              {value.department_name}
                                                            </option>;
                                                })
                                            }
                                            </select>
                                            <ErrorMessage component="div" name="gender" className="input-feedback" />
                                          </div>
                                          :
                                          <div className="form-group"  style={{'width': '100%', 'paddingLeft': '12.5px'}}>
                                            <label>No Departments handled.</label>
                                          </div>
                                        }
                                  </Row>
                                  :
                                  null
                                } 
                                { /** Show the Supervisor List depending on the showDepartmentList State */
                                  this.state.showEmployeeList ?
                                  <Row>  
                                    <div className="form-group"  style={{'width': '100%', 'paddingLeft': '12.5px'}}>
                                        <label>Employees List:</label>
                                        <MultiSelect
                                          name="user_id[]"
                                          options={this.state.employeeList}
                                          value={this.state.selectedValues}
                                          onChange={this.setSelectedValues}
                                          labelledBy={"Select Supervisor(s)"}
                                        />
                                        <ErrorMessage component="div" name="gender" className="input-feedback" />
                                    </div>
                                  </Row>
                                  :
                                  null
                                } 
                              </Col>  
                              <Col size="1">
                              </Col>  
                                  <Col size="5">
                                { /** Show the Assign Button if there is a data on Selected Department. */
                                  Validator.isValid( this.state.selectedDepartment ) ?
                                    <Row>   
                                      <Button type="submit" style={{'width': '80%'}} className="btn btn-primary">Assign</Button>
                                    </Row> 
                                    :
                                    null 
                                }
                                { /** Show the Selected Employees List if the Selected Values has data. */
                                  Validator.isValid( this.state.selectedValues ) && this.state.selectedValues.length != 0 ?
                                    <Row>   
                                      <div className="form-group" style={{'width': '100%', 'paddingTop': '10px'}}>
                                        <label>Selected Employees(s):</label>
                                        <ul>
                                        {  this.state.selectedValues.map((value, index) => {
                                              return <li>
                                                        {value.label}
                                                    </li>;
                                          }) 
                                        }

                                        </ul>
                                      </div>
                                    </Row> 
                                    :
                                    null 
                                  }
                                  </Col>  
                            </Row> 
                            </form>
                        )}
                        </Formik>
                         {/* :
                         null  
                       } */}
                      </Content>
                </ContainerBody>
            </ContainerWrapper>
      </Wrapper>
      : 
      <PageLoading /> );
  }
}

const mapStateToProps = (state) => {
  return {
    department             : state.lookup.department,
    supervisor             : state.lookup.supervisor,
    department_users       : state.lookup.department_users
  }
}
const mapDispatchToProps = (dispatch) => {
    return {
      fetchUserList             : ( role ) => dispatch( fetchUserList( role ) ),
      fetchDepartmentList       : () => dispatch( fetchDepartmentList() ),
      assignEmployeeSupervisorsActions  : ( user_id, post_data ) => dispatch( assignEmployeeSupervisorsActions( user_id, post_data ) ),
    }
}
export default connect(mapStateToProps, mapDispatchToProps)(AssignEmployeeSupervisors);








