import React, { Component, useState } from "react";
import { connect } from 'react-redux';
import moment from 'moment';
import { Form,Button,InputGroup,FormControl  } from 'react-bootstrap';
import MultiSelect from "react-multi-select-component";

import "./AssignSubDepartment.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody,Row,Col } from '../../../components/GridComponent/AdminLte.js';

/** Form Manipulation */
import { Formik, ErrorMessage, getIn  } from 'formik';
import * as Yup from 'yup';

import PageLoading from "../../PageLoading/index.js";

import DateFormatter from "../../../services/DateFormatter.js";

import { fetchUserList, fetchDepartmentList, fetchAllSubDepartment, fetchSubDepartmentHandledList, assignSubDepartment } from '../../../store/actions/lookup/lookupListActions.js';
import { assignEmployeeSupervisorsActions } from '../../../store/actions/admin/assignEmployeeSupervisorsActions.js'

import Wrapper from "../../../components/Template/Wrapper/index.js";
import Validator from "../../../services/Validator.js";


class AssignSubDepartment extends Component {
  
  constructor(props) {
    super(props);

    this.initialState = {

      reloadingSupervisorList: false,

      showDepartmentList: false,
      

      departmentList : [],
      employeeList : [],
      sp_action : "",

      selectedSupervisor : null,
      selectedSubDepartment : "",
      selectedValues: []
    }

    this.state = this.initialState;

    this.handleSelectSupervisor = this.handleSelectSupervisor.bind(this);
    this.handleSelectDepartment = this.handleSelectDepartment.bind(this);
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
    console.log(formData,this.state);

    // If action is NULL, it means it's either store/update
    if (window.confirm("Are you sure you want to assign these Employees on the selected Supervisor?")) {

        
        await this.props.assignSubDepartment( values.supervisor_id, formData );

        // await this.setState({
        //   reloadingSupervisorList: false,
        //   selectedSupervisor: values.supervisor_id
        // });
    }
  }


  // Function for handling the onChange of Supervisor Dropdown
  handleSelectSupervisor = (event) =>{
    const value = event.target.value;

    // Set the Department Handlers as Selected Value
    this.setState({
        selectedSupervisor : value,
        departmentList     : JSON.parse(event.target.options[event.target.selectedIndex].getAttribute('departments_handled')),
    });
    // console.log(value);
    this.props.fetchSubDepartmentHandledList(value)
    // Here lies 2 hours of debugging
    // Take note on SelectedSubDepartment if you will manually deselect it, set it to "" (string) instead of null. 
    if( Validator.isValid(value)  )  {
      this.setState({
        showDepartmentList : true,
        selectedSubDepartment : "",
      sp_action: "",
        selectedValues : [],
      });
    } else {
      this.setState({
        showDepartmentList : false,
        selectedSubDepartment : "",
       sp_action: "",

        selectedValues : [],
      });
    }

  }

 // Function for handling the onChange of Department Dropdown
 handleSelectDepartment = async(event) =>{

  const value = event.target.value

  // Fetch the Department Users List
  

  // Set the Department Handlers as Selected Value
  this.setState({
      selectedSubDepartment : value
  });
  let cond_in_helper = this.props.sub_departments_handled.some(
                (item_array)=>{ return item_array.id ===  value}
                )

  this.setState({
      sp_action : cond_in_helper ? "disable": "enable" 
  });


  


 }

 componentWillReceiveProps = async(nextProps) => {


  if( nextProps.department_users != this.props.department_users ) {


    if( Validator.isValid( this.state.selectedSubDepartment )  )  {

      let selected_values = [];
    

      this.setState({
        selectedSubDepartment : this.state.selectedSubDepartment,
     

        selectedValues : selected_values,
      });
  
    } else {
  
      this.setState({
        selectedSubDepartment : "",

        selectedValues : [],
      });
  
    }

  }

}
  // Function for handling the onChange of Selected Supervisor
  setSelectedValues = ( values ) => {
    this.setState({
        selectedValues: values
    });
  }

  componentWillMount = async() => {
    await this.props.fetchUserList('supervisor', {page : 'all'});
    await this.props.fetchDepartmentList();
    await this.props.fetchAllSubDepartment()

  }

  render = () => {  

    // Declares the Initial Values of the Form base.
    const initialValues = {
        supervisor_id : this.state.selectedSupervisor != undefined ? this.state.selectedSupervisor : null,
        department_id : this.state.selectedSubDepartment != undefined ? this.state.selectedSubDepartment : null,
        sp_action : this.state.sp_action != undefined ? this.state.sp_action : null,
    };
    let cond = false;

    if(this.state.selectedSubDepartment != undefined && this.state.selectedSubDepartment != "" && this.props.sub_departments_list!==undefined){

      // let checkId = obj => obj.id  ===  this.state.selectedSubDepartment
      cond = this.props.sub_departments_handled.filter(e => e.id === this.state.selectedSubDepartment).length > 0
      
    }

    // Show the form if the Department and Supervisor list has already loaded.
    return ( this.props.supervisor != undefined ? 
        <Wrapper {...this.props} >
              <ContainerWrapper>
                  <ContainerBody>
                      <Content col="9" title="Team Head Allocation" >
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
                                      { ( this.props.sub_departments_handled != undefined  &&this.props.sub_departments_handled.length > 0) ? 
                                        <div className="form-group"  style={{'width': '100%', 'paddingLeft': '12.5px'}}>
                                            <label>Sub Departments Handled:</label>
                                            <ul>
                                            {  this.props.sub_departments_handled.map((value, index) => {

                                              if(this.state.selectedSubDepartment != undefined && this.state.selectedSubDepartment != "" && this.state.selectedSubDepartment == value.id ){
                                                      return <li>
                                                                <b>{value.Name}</b>
                                                                
                                                            </li>;
                                              }
                                              return <li>
                                                        {value.Name}
                                                        
                                                    </li>;
                                          }) 
                                          
                                        }
                                        </ul>
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


                              </Col>  
                              <Col size="1">
                              </Col>  
                                  <Col size="5">
                                {/* { 
                                   this.state.showDepartmentList ?
                                    <Row>   
                                      <Button type="submit" style={{'width': '80%'}} className="btn btn-primary"><i class="fa fa-tag" /> Assign</Button>
                                    </Row> 
                                    :
                                    null 
                                } */}
                                { /** Show the Selected Employees List if the Selected Values has data. */
                                  this.state.showDepartmentList ?
                                    <Row>   
                                      <div className="form-group" style={{'width': '100%', 'paddingTop': '10px'}}>
                                        <label>Sub Department:</label>
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
                                            {  this.props.sub_departments_list.length != 0 ? 
                                              this.props.sub_departments_list.map((value, index) => {

                                                    let departments_handled = [];

                                                    return <option 
                                                            value={value.id} 
                                                            >
                                                              {value.Name}
                                                            </option>;
                                                })
                                                :
                                                null
                                            }
                                        </select>
                                      </div>
                                    </Row> 
                                    :
                                    null 
                                  }
                                  {
                                     this.state.showDepartmentList && 
                                     
                                     this.state.selectedSubDepartment != undefined && this.state.selectedSubDepartment != ""  ?
                                    <Row> 

                                            {  this.props.sub_departments_list.length != 0 && 
                                            this.state.selectedSubDepartment != undefined && this.state.selectedSubDepartment != "" ? 
                                              <>
                                              {
                                                 cond?<>
                                                      <label>Supervisor Handles Selected Sub Department.</label>
                                                      <Button type="submit" style={{'width': '80%'}} className="btn btn-secondary"><i class="fa fa-tag" 
                                                      /> Remove Sub Department</Button>
                                                    
                                                    </>:
                                                    
                                                    <>
                                                      <label>Supervisor does Not Have the Selected Sub Department</label>
                                                      <Button type="submit" style={{'width': '80%'}} className="btn btn-primary"><i class="fa fa-tag" 
                                                      /> Assign Sub Department</Button>
                                                    </>
                                                }
                                              </>
                                            
                                                :
                                                <p>not Exist</p>
                                            }
                                      

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
    department_users       : state.lookup.department_users,
    myTeamList              : state.myTeamList,
    sub_departments_handled : state.lookup.sub_departments_handled,
    sub_departments_list    : state.lookup.sub_departments_list

  }
}
const mapDispatchToProps = (dispatch) => {
    return {
      fetchUserList                     : ( role, params ) => dispatch( fetchUserList( role, params ) ),
      fetchDepartmentList               : () => dispatch( fetchDepartmentList() ),
      fetchAllSubDepartment               : () => dispatch( fetchAllSubDepartment() ),
      assignSubDepartment  : ( user_id, post_data ) => dispatch( assignSubDepartment( user_id, post_data ) ),
      fetchSubDepartmentHandledList  : ( user_id ) => dispatch( fetchSubDepartmentHandledList( user_id ) ),
    }
}
export default connect(mapStateToProps, mapDispatchToProps)(AssignSubDepartment);








