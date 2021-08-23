import React, { Component, useState } from "react";
import { connect } from 'react-redux';
import moment from 'moment';
import { Form, Button, InputGroup, FormControl } from 'react-bootstrap';
import MultiSelect from "react-multi-select-component";

import "./AssignEmployeesClient.css";
import { ContainerHeader, Content, ContainerWrapper, ContainerBody, Row, Col } from '../../../components/GridComponent/AdminLte.js';

/** Form Manipulation */
import { Formik, ErrorMessage, getIn } from 'formik';
import * as Yup from 'yup';

import PageLoading from "../../PageLoading";

import DateFormatter from "../../../services/DateFormatter";

import { fetchUserList, fetchDepartmentList, fetchDepartmentUsersList,fetchEmployeesClientUserLists } from '../../../store/actions/lookup/lookupListActions';
import { assignDepartmentHandlers } from '../../../store/actions/admin/assignDepartmentHandlersActions'
import { assignEmployeesClient } from '../../../store/actions/admin/assignEmployeesClientActions'

import { setRedirect } from '../../../store/actions/redirectActions';

import Wrapper from "../../../components/Template/Wrapper";
import Validator from "../../../services/Validator";
import Formatter from "../../../services/Formatter";


class AssignEmployeesClient extends Component {

  constructor(props) {
    super(props);

    this.initialState = {
      reloadingDepartmentList: false,
      showList: false,
      selectedDepartment: null,
      selectedEmployee: [],
      selectedClient: null,
      employee_list:[]
    }

    this.state = this.initialState;
  }

  // Set the onSubmitHandler for submissions and check inside the function whether it's for Store/Update/Approve/Cancel/Decline
  onSubmitHandler = async (values) => {

    console.log(values);
    // Setting of Form Data to be passed in the submission
    var formData = {};

    // for (var key in values) {

    //   if (values[key] != null) {
    //     switch (key) {
    //       case "client_id":
    //       case "department_id":
    //       case "employee_user_id":
    //         let user_id = (formData['user_id'] != undefined) ? formData['user_id'] : [];
    //         for (var i = 0; i < values[key].length; i++) {
    //           user_id.push(values[key][i]['value']);
    //         }
    //         formData['user_id'] = user_id;
    //         break;
    //       default:
    //         formData[key] = values[key];
    //         break;
    //     }
    //   }
    // }
    // console.log(formData);

    // If action is NULL, it means it's either store/update
    if (window.confirm("Are you sure you want to assign these Supervisors & Clients on the selected Department?")) {

      this.setState({
        reloadingDepartmentList: true
      });

      await this.props.assignEmployeesClient(values);

      await this.setState({
        reloadingDepartmentList: false,
        selectedDepartment: values.department_id
      });
    }
  }


  // Function for handling the onChange of Department Dropdown
  handleSelectDepartment = async (event) => {

    let department_id = event.target.value;
    if(this.state.selectedClient != null){
      await this.props.fetchEmployeesClientUserLists(this.state.selectedClient,department_id)
    }
    // Fetch the Department Handlers List
    await this.props.fetchDepartmentUsersList(department_id)
    // Set the Department Handlers as Selected Value
    this.setState({
      selectedDepartment: department_id
    });

  }

  // Function for handling the onChange of Selected Supervisor
  setSelectedEmployee = (values) => {
    console.log(values);
    this.setState({
      selectedEmployee: values
    });
  }

  // Function for handling the onChange of Selected Clients
  setSelectedClients = async (event) => {

    // 
    

    let client_id = event.target.value;
    if(this.state.selectedDepartment != null){
      await this.props.fetchEmployeesClientUserLists(client_id,this.state.selectedDepartment)
    }
    
    this.setState({
      selectedClient: client_id
    });
  }

  componentWillReceiveProps = async (nextProps) => {
    // console.log(nextProps)
    // If the Department Handlers is updated, set the State for the selectedEmployee in the Department Handlers


    if (nextProps.employees_client_users != this.props.employees_client_users) {
      
      this.setState({
        selectedEmployee: Formatter.array_to_multiselect_array(nextProps.employees_client_users, 'full_name', 'id'),
        // selectedEmployee:[],
        showList: true
      });
    }


    if (nextProps.department_users != this.props.department_users) {
      if (Validator.isValid(this.state.selectedDepartment)) {
        // Filter the selected supervisors from the department handlers 
        // let selected_supervisors = nextProps.department_users.filter(function (department_handler) {
        //   return nextProps.supervisor.findIndex((supervisor) => supervisor.id === department_handler.id) === -1 ? false : true
        // });

        // Filter the selected client from the department handlers 
        let list_of_employees = nextProps.department_users.filter(function (department_user) {
          return nextProps.employee.findIndex((employee) => employee.id === department_user.id) === -1 ? false : true
        });
        // Set the Department Handlers as Selected Value
        this.setState({
          employee_list: list_of_employees,
          // selectedEmployee: Formatter.array_to_multiselect_array(list_of_employees, 'full_name', 'id'),
          // selectedClient: Formatter.array_to_multiselect_array(selected_clients, 'full_name', 'id'),
        });

      } else {

        this.setState({
          showList: false
        });

      }
    }

  }

  componentWillMount = async () => {

    await this.props.fetchUserList('employee', { page: 'all' });
    await this.props.fetchUserList('client', { page: 'all' });
    await this.props.fetchDepartmentList();

  }

  render = () => {
    // Iterates the Option to be shown for the Supervisor List
    let employee_list = Formatter.array_to_multiselect_array(this.state.employee_list, 'full_name', 'id');

    // Iterates the Option to be shown for the Client List
    // let client_list = Formatter.array_to_multiselect_array(this.props?.client, 'full_name', 'id');

    // Declares the Initial Values of the Form base.
    const initialValues = {
      department_id: this.state.selectedDepartment != undefined ? this.state.selectedDepartment : null,
      employee_user_id: this.state.selectedEmployee != undefined ? this.state.selectedEmployee : null,
      client_id: this.state.selectedClient != undefined ? this.state.selectedClient : null
    };

    // Show the form if the Department and Supervisor list has already loaded.
    return (this.props.department != undefined && this.props.employee != undefined ?
      <Wrapper {...this.props} >
        <ContainerWrapper>
          <ContainerBody>
            <Content col="6" title="Assign Employee's Client" >
              {/* { this.state.renderForm ? */}
              <Formik
                enableReinitialize="true"
                onSubmit={this.onSubmitHandler}
                initialValues={initialValues}
              >
                {
                  ({ values, errors, setFieldValue, field, touched, handleSubmit, handleReset, handleChange }) => (
                    <form onSubmit={handleSubmit}>
                      <Row>
                        <Col size="6">
                          <Row>
                            <div className="form-group" style={{ 'width': '100%', 'paddingLeft': '12.5px' }}>
                              <label>Client List:</label>

                              <select
                                name="client_id"
                                className="form-control"
                                value={values.client_id}
                                onChange={(e) => {
                                  this.setSelectedClients(e);
                                }}
                                style={{ display: 'block' }}
                              >
                                <option value="" disabled selected>Select Client</option>

                                {/* Manually generate the Option element w/ extra attributes (Pass the client Handlers as stringified JSON) */}
                                {this.props.client?.map((value, index) => {

                                    return <option
                                      value={value.id}
                                    >
                                      {value.full_name}
                                    </option>;
                                  })
                                }
                              </select>
                              <ErrorMessage component="div" name="client" className="input-feedback" />
                            </div>
                          </Row>
                          <Row>
                            <div className="form-group" style={{ 'width': '100%', 'paddingLeft': '12.5px' }}>
                              <label>Departments:</label>
                              <select
                                name="department_id"
                                className="form-control"
                                value={values.department_id}
                                onChange={(e) => {
                                  this.handleSelectDepartment(e);
                                }}
                                style={{ display: 'block' }}
                              >
                                <option value="" disabled selected>Select Department</option>

                                {/* Manually generate the Option element w/ extra attributes (Pass the Department Handlers as stringified JSON) */}
                                {!this.state.reloadingDepartmentList ?
                                  this.props.department.map((value, index) => {

                                    return <option
                                      value={value.id}
                                    >
                                      {value.department_name}
                                    </option>;
                                  })
                                  :
                                  null
                                }
                              </select>
                              <ErrorMessage component="div" name="department" className="input-feedback" />
                            </div>
                          </Row>

                          { /** Show the Supervisor List depending on the showSupervisorList State */
                            <React.Fragment>
                              <Row>
                                <div className="form-group" style={{ 'width': '100%', 'paddingLeft': '12.5px' }}>
                                  <label>Employee List:</label>
                                  <MultiSelect
                                    name="employee_user_id[]"
                                    options={employee_list}
                                    value={this.state.selectedEmployee}
                                    onChange={this.setSelectedEmployee}
                                    labelledBy={"Select Employee(s)"}
                                  />
                                  <ErrorMessage component="div" name="employee" className="input-feedback" />
                                </div>
                              </Row>

                            </React.Fragment>
                          }
                        </Col>
                        <Col size="1">
                        </Col>
                        { /** Show the Assign Button and Selected Supervisor List if the Selected Values has data. */
                          Validator.isValid(this.state.selectedEmployee) && this.state.selectedEmployee.length != 0 ?
                            <Col size="5">
                              <Row>
                                <Button type="submit" style={{ 'width': '80%' }} className="btn btn-primary"><i class="fa fa-tag" /> Assign</Button>
                              </Row>
                              <Row>
                                <div className="form-group" style={{ 'width': '100%', 'paddingTop': '10px' }}>
                                  <label>Selected Employee(s):</label>
                                  <ul>
                                    {this.state.selectedEmployee.map((value, index) => {
                                      return <li>
                                        {value.label}
                                      </li>;
                                    })
                                    }

                                  </ul>
                                </div>
                              </Row>
                              {/* {this.state.selectedClient.length > 0 ?
                                <Row>
                                  <div className="form-group" style={{ 'width': '100%', 'paddingTop': '10px' }}>
                                    <label>Selected Client(s):</label>
                                    <ul>
                                      {this.state.selectedClient.map((value, index) => {
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
                              } */}
                            </Col>
                            :
                            null
                        }
                      </Row>
                    </form>
                  )}
              </Formik>
            </Content>
          </ContainerBody>
        </ContainerWrapper>
      </Wrapper>
      :
      <PageLoading />);
  }
}

const mapStateToProps = (state) => {
  return {
    department: state.lookup.department,
    department_users: state.lookup.department_users,
    employee: state.lookup.employee,
    client: state.lookup.client,
    employees_client_users: state.lookup.employees_client_users
  }
}
const mapDispatchToProps = (dispatch) => {
  return {
    fetchUserList: (role, params) => dispatch(fetchUserList(role, params)),
    fetchDepartmentList: () => dispatch(fetchDepartmentList()),
    fetchDepartmentUsersList: (id) => dispatch(fetchDepartmentUsersList(id)),
    assignEmployeesClient: ( post_data) => dispatch(assignEmployeesClient( post_data)),
    fetchEmployeesClientUserLists: ( client_id,department_id) => dispatch(fetchEmployeesClientUserLists( client_id,department_id)),
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(AssignEmployeesClient);








