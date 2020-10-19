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

import { fetchUserList, fetchDepartmentList } from '../../../store/actions/lookup/lookupListActions';
import { assignDepartmentHandlers } from '../../../store/actions/settings/assignDepartmentHandlersActions'

import { setRedirect } from '../../../store/actions/redirectActions';

import Wrapper from "../../../components/Template/Wrapper";


class AssignDepartmentHandlers extends Component {
  
  constructor(props) {
    super(props);

    this.initialState = {
      reloadingDepartmentList: false,
      showSupervisorList: false,
      selectedDepartment : null,
      selectedValues: []
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
    if (window.confirm("Are you sure you want to assign these Supervisors on the selected Department?")) {

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
  handleSelectDepartment = (event) =>{

    // Set the Department Handlers as Selected Value
    this.setState({
        selectedDepartment : event.target.value,
        selectedValues: JSON.parse(event.target.options[event.target.selectedIndex].getAttribute('department_handlers'))
    });

    
    this.setState({
      showSupervisorList : true
    });
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

    // Iterates the Option to be shown for the Supervisor List
    let supervisor_list = [];
    if( this.props.supervisor != undefined ) {

      for (var i = 0; i < this.props.supervisor.length; i++) {
        supervisor_list.push({
          label  : this.props.supervisor[i].full_name,
          value  : this.props.supervisor[i].id
        })
      }
    }
    
    // Declares the Initial Values of the Form base.
    const initialValues = {
        department_id : this.state.selectedDepartment != undefined ? this.state.selectedDepartment : null,
        user_id : this.state.selectedValues != undefined ? this.state.selectedValues : null
    };

    // Show the form if the Department and Supervisor list has already loaded.
    return (this.props.department != undefined && this.props.supervisor != undefined ? 
        <Wrapper previousPath={this.props.location.previousPath} role={'admin'} permission={'full_access'}>
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

                                                    let department_handlers = [];

                                                    if( value.department_handlers != undefined ) {
                                                        for (var i = 0; i < value.department_handlers.length; i++) {
                                                          department_handlers.push({
                                                            label  : value.department_handlers[i].full_name,
                                                            value  : value.department_handlers[i].id
                                                          })
                                                        }
                                                    }
                                                    return <option 
                                                            value={value.id} 
                                                            department_handlers={JSON.stringify( department_handlers )}
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
                                  this.state.showSupervisorList ?
                                  <Row>  
                                    <div className="form-group"  style={{'width': '100%', 'paddingLeft': '12.5px'}}>
                                        <label>Supervisor List:</label>
                                        <MultiSelect
                                          name="user_id[]"
                                          options={supervisor_list}
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
                              { /** Show the Assign Button and Selected Supervisor List if the Selected Values has data. */
                                this.state.selectedValues.length != 0 ?
                                  <Col size="5">
                                    <Row>   
                                      <Button type="submit" style={{'width': '80%'}} className="btn btn-primary">Assign</Button>
                                    </Row> 
                                    <Row>   
                                      <div className="form-group" style={{'width': '100%', 'paddingTop': '10px'}}>
                                        <label>Selected Supervisor(s):</label>
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
                                  </Col>  
                                  :
                                  null 
                              }
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
    supervisor             : state.lookup.supervisor
  }
}
const mapDispatchToProps = (dispatch) => {
    return {
      fetchUserList             : ( role ) => dispatch( fetchUserList( role ) ),
      fetchDepartmentList       : () => dispatch( fetchDepartmentList() ),
      assignDepartmentHandlers  : ( department_id, post_data ) => dispatch( assignDepartmentHandlers( department_id, post_data ) ),
    }
}
export default connect(mapStateToProps, mapDispatchToProps)(AssignDepartmentHandlers);








