import React, { Component, useState } from "react";
import { connect } from 'react-redux';
import moment from 'moment';
import { Form,Button,InputGroup,FormControl  } from 'react-bootstrap';
import MultiSelect from "react-multi-select-component";

import "./AssignDepartmentHandlers.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody,Row,Col } from '../../../components/GridComponent/AdminLte.js';

/** Form Manipulation */
import { Formik, ErrorMessage, getIn  } from 'formik';
import * as Yup from 'yup';

import PageLoading from "../../PageLoading";

import DateFormatter from "../../../services/DateFormatter";

import { fetchUserList, fetchDepartmentList, fetchDepartmentHandlersList } from '../../../store/actions/lookup/lookupListActions';
import { assignDepartmentHandlers } from '../../../store/actions/admin/assignDepartmentHandlersActions'

import { setRedirect } from '../../../store/actions/redirectActions';

import Wrapper from "../../../components/Template/Wrapper";
import Validator from "../../../services/Validator";
import Formatter from "../../../services/Formatter";


class AssignDepartmentHandlers extends Component {
  
  constructor(props) {
    super(props);

    this.initialState = {
      reloadingDepartmentList: false,
      showList: false,
      selectedDepartment : null,
      selectedSupervisors: [],
      selectedClients: []
    }

    this.state = this.initialState;  
  }
  
  // Set the onSubmitHandler for submissions and check inside the function whether it's for Store/Update/Approve/Cancel/Decline
  onSubmitHandler = async (values) => {
    

    // Setting of Form Data to be passed in the submission
    var formData ={};

    for (var key in values) {
    
        if( values[key] != null ) {
            switch( key ) {
                case "supervisor_user_id":
                case "client_user_id":
                    let user_id = ( formData['user_id'] != undefined ) ? formData['user_id']  : [];
                    for (var i = 0; i < values[key].length; i++) {
                      user_id.push(values[key][i]['value']);
                    }
                    formData['user_id'] = user_id;
                    break;
                default:
                    formData[key] = values[key];
                    break;
            }
        }
    }

    // If action is NULL, it means it's either store/update
    if (window.confirm("Are you sure you want to assign these Supervisors & Clients on the selected Department?")) {

        this.setState({
          reloadingDepartmentList: true
        });

        await this.props.assignDepartmentHandlers( values.department_id, formData );

        await this.setState({
          reloadingDepartmentList: false,
          selectedDepartment: values.department_id
        });
    }
  }


  // Function for handling the onChange of Department Dropdown
  handleSelectDepartment = async (event) =>{

    let department_id = event.target.value;

    // Fetch the Department Handlers List
    await this.props.fetchDepartmentHandlersList( department_id )

    // Set the Department Handlers as Selected Value
    this.setState({
        selectedDepartment : department_id
    });

  }

  // Function for handling the onChange of Selected Supervisor
  setSelectedSupervisors = ( values ) => {
    this.setState({
        selectedSupervisors: values
    });
  }

  // Function for handling the onChange of Selected Clients
  setSelectedClients = ( values ) => {
    this.setState({
        selectedClients: values
    });
  }

  componentWillReceiveProps = async(nextProps) => {

    // If the Department Handlers is updated, set the State for the selectedSupervisors in the Department Handlers
    if( nextProps.department_handlers != this.props.department_handlers ) {

      if( Validator.isValid( this.state.selectedDepartment )  )  {

        // Filter the selected supervisors from the department handlers 
        let selected_supervisors = nextProps.department_handlers.filter(function(department_handler) {
            return nextProps.supervisor.findIndex((supervisor) => supervisor.id === department_handler.id) === -1 ? false : true
        });

        // Filter the selected client from the department handlers 
        let selected_clients = nextProps.department_handlers.filter(function(department_handler) {
            return nextProps.client.findIndex((client) => client.id === department_handler.id) === -1 ? false : true
        });
        // Set the Department Handlers as Selected Value
        this.setState({
            selectedSupervisors:  Formatter.array_to_multiselect_array( selected_supervisors, 'full_name', 'id' ),
            selectedClients:  Formatter.array_to_multiselect_array( selected_clients, 'full_name', 'id' ),
            showList : true
        }); 
        
      } else {

          this.setState({
            showList : false
          });

      }
    }

  }
  
  componentWillMount = async() => {

    await this.props.fetchUserList('supervisor', {page : 'all'});
    await this.props.fetchUserList('client', {page : 'all'});
    await this.props.fetchDepartmentList();

  }

  render = () => {  

    // Iterates the Option to be shown for the Supervisor List
    let supervisor_list = Formatter.array_to_multiselect_array( this.props?.supervisor, 'full_name', 'id' );

    // Iterates the Option to be shown for the Client List
    let client_list = Formatter.array_to_multiselect_array( this.props?.client, 'full_name', 'id' );
    
    // Declares the Initial Values of the Form base.
    const initialValues = {
        department_id : this.state.selectedDepartment != undefined ? this.state.selectedDepartment : null,
        supervisor_user_id : this.state.selectedSupervisors != undefined ? this.state.selectedSupervisors : null,
        client_user_id : this.state.selectedClients != undefined ? this.state.selectedClients : null
    };

    // Show the form if the Department and Supervisor list has already loaded.
    return (this.props.department != undefined && this.props.supervisor != undefined ? 
        <Wrapper {...this.props} >
              <ContainerWrapper>
                  <ContainerBody>
                      <Content col="6" title="Assign Department Handlers" >
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
                                            <option value="" label="" />

                                            {/* Manually generate the Option element w/ extra attributes (Pass the Department Handlers as stringified JSON) */}
                                            { !this.state.reloadingDepartmentList ? 
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
                                  this.state.showList ?
                                  <React.Fragment>
                                  <Row>  
                                    <div className="form-group"  style={{'width': '100%', 'paddingLeft': '12.5px'}}>
                                        <label>Supervisor List:</label>
                                        <MultiSelect
                                          name="supervisor_user_id[]"
                                          options={supervisor_list}
                                          value={this.state.selectedSupervisors}
                                          onChange={this.setSelectedSupervisors}
                                          labelledBy={"Select Supervisor(s)"}
                                        />
                                        <ErrorMessage component="div" name="supervisor" className="input-feedback" />
                                    </div>
                                  </Row>
                                  <Row>  
                                    <div className="form-group"  style={{'width': '100%', 'paddingLeft': '12.5px'}}>
                                        <label>Client List:</label>
                                        <MultiSelect
                                          name="client_user_id[]"
                                          options={client_list}
                                          value={this.state.selectedClients}
                                          onChange={this.setSelectedClients}
                                          labelledBy={"Select Client(s)"}
                                        />
                                        <ErrorMessage component="div" name="client" className="input-feedback" />
                                    </div>
                                  </Row>
                                  </React.Fragment>
                                  :
                                  null
                                } 
                              </Col>  
                              <Col size="1">
                              </Col>  
                              { /** Show the Assign Button and Selected Supervisor List if the Selected Values has data. */
                                Validator.isValid( this.state.selectedSupervisors ) && this.state.selectedSupervisors.length != 0 ?
                                  <Col size="5">
                                    <Row>   
                                      <Button type="submit" style={{'width': '80%'}} className="btn btn-primary"><i class="fa fa-tag" /> Assign</Button>
                                    </Row> 
                                    <Row>   
                                      <div className="form-group" style={{'width': '100%', 'paddingTop': '10px'}}>
                                        <label>Selected Supervisor(s):</label>
                                        <ul>
                                        {  this.state.selectedSupervisors.map((value, index) => {
                                              return <li>
                                                        {value.label}
                                                    </li>;
                                          }) 
                                        }

                                        </ul>
                                      </div>
                                    </Row>  
                                    { this.state.selectedClients.length > 0 ? 
                                      <Row>   
                                        <div className="form-group" style={{'width': '100%', 'paddingTop': '10px'}}>
                                          <label>Selected Client(s):</label>
                                          <ul>
                                          {  this.state.selectedClients.map((value, index) => {
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
      <PageLoading /> );
  }
}

const mapStateToProps = (state) => {
  return {
    department             : state.lookup.department,
    department_handlers    : state.lookup.department_handlers,
    supervisor             : state.lookup.supervisor,
    client                 : state.lookup.client,
  }
}
const mapDispatchToProps = (dispatch) => {
    return {
      fetchUserList                     : ( role, params ) => dispatch( fetchUserList( role, params ) ),
      fetchDepartmentList               : () => dispatch( fetchDepartmentList() ),
      fetchDepartmentHandlersList       : ( id ) => dispatch( fetchDepartmentHandlersList( id ) ),
      assignDepartmentHandlers          : ( department_id, post_data ) => dispatch( assignDepartmentHandlers( department_id, post_data ) ),
    }
}
export default connect(mapStateToProps, mapDispatchToProps)(AssignDepartmentHandlers);








