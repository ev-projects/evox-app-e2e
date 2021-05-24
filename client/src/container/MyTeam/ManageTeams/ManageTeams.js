import React, { Component, useState } from "react";
import { connect } from 'react-redux';
import moment from 'moment';
import { Form,Button,InputGroup,FormControl  } from 'react-bootstrap';
import MultiSelect from "react-multi-select-component";

import "./ManageTeams.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody,Row,Col } from '../../../components/GridComponent/AdminLte.js';

/** Form Manipulation */
import { Formik, FieldArray, ErrorMessage, getIn  } from 'formik';
import * as Yup from 'yup';

import PageLoading from "../../PageLoading";

import DateFormatter from "../../../services/DateFormatter";

import { fetchUserList, fetchTeamsHandledList, fetchDepartmentUsersList, fetchTeam } from '../../../store/actions/lookup/lookupListActions';
import { createTeam, updateTeam, deleteTeam } from '../../../store/actions/team/teamActions'

import { setRedirect } from '../../../store/actions/redirectActions';

import Wrapper from "../../../components/Template/Wrapper";
import Validator from "../../../services/Validator";
import Formatter from "../../../services/Formatter";


class ManageTeams extends Component {
  
  constructor(props){
    super(props)

    this.initialState = {
        selectedActionType          : null,
        selectedTeam                : null,
        selectedDepartment          : null,

        teamLeadersList             : [],
        selectedTeamLeaders         : [],
        teamUserList                : [],
        selectedTeamUsers           : [],
    }

    this.state = this.initialState;  

    this.handleChange             = this.handleChange.bind(this);
    this.handleSelectActionType   = this.handleSelectActionType.bind(this);
    this.handleSelectTeam         = this.handleSelectTeam.bind(this);
  }
  
  // Set the onSubmitHandler for submissions and check inside the function whether it's for Store/Update/Approve/Cancel/Decline
  onSubmitHandler = async (values) => {

    console.log(values);
    // Setting of Form Data to be passed in the submission
    var formData ={};

    for (var key in values) {
    
        if( values[key] != null ) {
            switch( key ) {
                case "team_handlers":
                case "team_users":
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
    if (window.confirm("Are you sure you want to create/update this Team?")) {
        switch( values.action_type  ) {
          case "store":
              await this.props.createTeam( formData );
              break;
      
          case "update":
              formData['_method'] = 'PUT';
              await this.props.updateTeam( values.team_id, formData );
              break;

          default:
              break;

        }

        await this.props.fetchTeamsHandledList( this.props.user?.id );
    }
  }

  // Set the onSubmitHandler for submissions and check inside the function whether it's for Store/Update/Approve/Cancel/Decline
  deleteTeam = async () => {
    
    if (window.confirm("Are you sure you want to delete this Team?")) {
        await this.props.deleteTeam( this.state.selectedTeam );
        await this.props.fetchTeamsHandledList( this.props.user?.id );
        // Set the Action Type as Selected Value
        this.setState({
          selectedActionType          : this.state.selectedActionType,
          selectedTeam                : null,
          selectedDepartment          : null,
          selectedTeamLeaders         : [],
          selectedTeamUsers           : [],
        });
    }
  }


  // Function for handling the onChange of Action Type Radio Button
  handleSelectActionType = async (event) =>{

    let action_type = event.target.value;
    
    // Set the Action Type as Selected Value
    this.setState({
      selectedActionType : action_type
    });

  }




  handleSelectTeam = async ( event ) => {

    let team_id = event.target.value;

    if( Validator.isValid( team_id )) {

      await this.props.fetchTeam( team_id );

      //Set the Team ID as Selected Value
      this.setState({
        selectedTeam : team_id,
      });
    }

  }


  handleChange(e) {
    this.setState({ [e.target.name] : e.target.value });
  }


  // Function for handling the onChange of Department Dropdown
  setSelectedDepartment = async(values) =>{

    // Fetch the Department Users List
    await this.props.fetchDepartmentUsersList( values );
  
    // Set the Department Handlers as Selected Value
    this.setState({
      selectedDepartment : values,
      selectedTeamLeaders : [],
      selectedTeamUsers : []
    });
  }


  
  // Function for handling the onChange of Team Leaders
  setSelectedTeamLeaders = ( values ) => {
    this.setState({
        selectedTeamLeaders: values
    });
  }
  
  // Function for handling the onChange of Team Users
  setSelectedTeamUsers = ( values ) => {
    this.setState({
      selectedTeamUsers: values
    });
  }
  
  componentDidUpdate( prevProps, prevState ){
    console.log(prevState.selectedActionType, this.state.selectedActionType)
    if( prevState.selectedActionType != this.state.selectedActionType ) {
      // Set the Action Type as Selected Value
      this.setState({
        selectedTeam : null,
        selectedDepartment : null,
        name : null,
        selectedTeamLeaders : [],
        selectedTeamUsers : [],
      });
    }
  }


  componentWillReceiveProps = async(nextProps) => {

    if( nextProps.team_leader != this.props.team_leader ) {
      
        this.setState({
          teamLeadersList     : Formatter.array_to_multiselect_array( nextProps.team_leader, 'full_name', 'id' )
        });

    }

    if( nextProps.department_users != this.props.department_users ) {

        this.setState({
          teamUserList     : Formatter.array_to_multiselect_array( nextProps.department_users, 'full_name', 'id' )
        });

    }

    if( nextProps.team != this.props.team ) {

      this.setState({
        name     : nextProps.team.name
      });
      
      await this.setSelectedDepartment( nextProps.team.department_id );

      await this.setSelectedTeamLeaders(  Formatter.array_to_multiselect_array( nextProps.team.team_handlers, 'full_name', 'id' ) )
      await this.setSelectedTeamUsers(  Formatter.array_to_multiselect_array( nextProps.team.team_users, 'full_name', 'id' ) )
     
    }

  }
  
  componentWillMount = async() => {

    await this.props.fetchUserList('team_leader', {page : 'all'});

    if( Validator.isValid( this.props.user?.id ) ) {
      await this.props.fetchTeamsHandledList( this.props.user?.id );
    }

  }

  render = () => {  

    // Declares the Initial Values of the Form base.
    const initialValues = {
        action_type       : Validator.isValid( this.state?.selectedActionType ) ? this.state?.selectedActionType : null ,
        team_id           : Validator.isValid( this.state?.selectedTeam ) ? this.state?.selectedTeam : null ,
        department_id     : Validator.isValid( this.state?.selectedDepartment ) ? this.state?.selectedDepartment : null,
        name              : Validator.isValid( this.state?.name ) ? this.state?.name : null,
        team_handlers     : Validator.isValid( this.state?.selectedTeamLeaders ) ? this.state?.selectedTeamLeaders : null,
        team_users        : Validator.isValid( this.state?.selectedTeamUsers ) ? this.state?.selectedTeamUsers : null,

    };
    

  var validationSchema = Yup.object().shape({
      name:              Yup.string().min(3, '3 Minimum Characters').max(255, '255 Maximum Characters').required("This field is required").nullable(),
      team_handlers:     Yup.array().min(1, '1 minimum selected Team Leader').required("This field is required").nullable(),
      team_users:        Yup.array().min(1, '1 minimum selected User').required("This field is required").nullable()
      
  });


    // Show the form if the Teams Handled and Team Leaders list has already loaded.
    return (this.props.teams_handled != undefined && this.props.team_leader != undefined ? 
        <Wrapper {...this.props} >
              <ContainerWrapper>
                  <ContainerBody>
                      <Content col="8" title="Manage Team" >
                      {/* { this.state.renderForm ? */}
                        <Formik 
                          enableReinitialize="true"
                          onSubmit={this.onSubmitHandler}
                          validationSchema={validationSchema} 
                          initialValues={initialValues}
                        >
                        {
                        ({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
                            <form onSubmit={handleSubmit}> 
                            <input type="hidden" name="id"  value={values.id} />
                            <Row> 
                                <Col size="6">
                                <Row>
                                  <Form.Group className="white_bg double-column-padding">
                                      <FieldArray render={arrayHelpers => (
                                        <label>                  
                                            <input 
                                              type="radio"
                                              name="action_type"
                                              value="store"
                                              checked={values.action_type === "store"}
                                              onChange={(e) => {
                                                this.handleSelectActionType(e);
                                              }}
                                            /> 
                                            Create Team &nbsp;
                                          </label>
                                      )}/>
                                      <FieldArray render={arrayHelpers => (
                                        <label>                  
                                          <input 
                                            type="radio"
                                            name="action_type"
                                            value="update"
                                            checked={values.action_type === "update"}
                                            onChange={(e) => {
                                              this.handleSelectActionType(e);
                                            }}
                                          /> 
                                          Update Team
                                        </label>
                                        )}
                                        />
                                    </Form.Group>
                                  </Row>  
                                  <Row>                            
                                      { this.state.selectedActionType == 'update' ?
                                            <div className="form-group double-column-padding">
                                                <select
                                                    name="team_id"
                                                    className="form-control"
                                                    value={values.team_id}
                                                    onChange={(e) => {
                                                      this.handleSelectTeam(e);
                                                    }}
                                                    style={{ display: 'block' }}
                                                >
                                                    <option value="" label="Select Team" />
                                                    { this.props.teams_handled?.length > 0 ? 
                                                        this.props.teams_handled.map((team, index) => {

                                                            return <option value={team.id} >
                                                                      {team.name}
                                                                    </option>;
                                                        })
                                                      :
                                                      null
                                                    }
                                                </select>                                    
                                                <Form.Control.Feedback type="invalid">
                                                  <ErrorMessage component="div" name="team_id" className="input-feedback" />
                                                </Form.Control.Feedback>
                                            </div>
                                        : 
                                        null 
                                      }
                                  </Row>
                                  { Validator.isValid( this.state?.selectedActionType ) &&
                                    this.state.selectedActionType == 'store' || ( this.state.selectedActionType == 'update' && Validator.isValid( this.state.selectedTeam ) )?
                                  <div> 
                                  { this.props.user.departments_handled.length > 0 ?
                                    <div>  
                                      <Row>
                                        <div className="form-group double-column-padding">
                                          <label>Team Name:</label>
                                          <input type="text" className="form-control" name="name" onChange={(e) => { this.handleChange(e); }} value={values.name} />
                                          <Form.Control.Feedback type="invalid">
                                            <ErrorMessage component="div" name="name" className="input-feedback" />
                                          </Form.Control.Feedback>
                                        </div>
                                      </Row>
                                      <Row>
                                        <div className="form-group double-column-padding">
                                              <label>Department</label>
                                              <select
                                                  name="department_id"
                                                  className="form-control"
                                                  value={values.department_id}
                                                  onChange={(e) => {
                                                    this.setSelectedDepartment(e.target.value);
                                                  }}
                                                  style={{ display: 'block' }}
                                              >
                                                  <option value="" label="" />
                                                  { this.props.user.departments_handled?.length > 0 ? 
                                                      this.props.user.departments_handled.map((department, index) => {

                                                          return <option value={department.id} >
                                                                    {department.department_name}
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
                                      </Row>
                                    </div>
                                    :
                                    null
                                  }  
                                  { Validator.isValid( this.state.selectedDepartment ) ? 
                                    <div>
                                        { Validator.isValid( this.state.teamLeadersList ) 
                                          && this.state.teamLeadersList?.length > 0 ?
                                          <Row>
                                            <div className="form-group double-column-padding">
                                                  <label>Team Leaders</label>
                                                  <MultiSelect
                                                    name="team_handlers[]"
                                                    options={this.state.teamLeadersList}
                                                    value={this.state.selectedTeamLeaders}
                                                    onChange={this.setSelectedTeamLeaders}
                                                    labelledBy={"Select Team Leaders(s)"}
                                                  />
                                                  <Form.Control.Feedback type="invalid">
                                                    <ErrorMessage component="div" name="team_handlers" className="input-feedback" />
                                                  </Form.Control.Feedback>
                                              </div>
                                          </Row>  
                                          :
                                          null
                                        }
                                        { Validator.isValid( this.state.teamUserList ) 
                                          && this.state.teamUserList?.length > 0 ?
                                          <Row>
                                              <div className="form-group double-column-padding">
                                                    <label>Employee List</label>
                                                    <MultiSelect
                                                      name="team_users[]"
                                                      options={this.state.teamUserList}
                                                      value={this.state.selectedTeamUsers}
                                                      onChange={this.setSelectedTeamUsers}
                                                      labelledBy={"Select Users"}
                                                    />
                                                    <Form.Control.Feedback type="invalid">
                                                      <ErrorMessage component="div" name="users" className="input-feedback" />
                                                    </Form.Control.Feedback>
                                                </div>
                                          </Row>   
                                          :
                                          null
                                        }
                                    </div>
                                    :
                                    null
                                  } 
                                  </div>
                                  :
                                  null
                                  }
                                </Col> 
                              { /** Show the Assign Button and Selected Supervisor List if the Selected Values has data. */
                                Validator.isValid( this.state.selectedTeamLeaders ) && this.state.selectedTeamLeaders.length != 0 
                              && Validator.isValid( this.state.selectedTeamUsers ) && this.state.selectedTeamUsers.length != 0 ?
                                <Col size="6"> 
                                  <Row>   
                                    <Button type="submit" style={{'marginLeft' : '10%', 'width': '80%'}} className="btn btn-primary"><i class="fa fa-save" /> { this.state.selectedActionType == 'store' ? 'Save' : 'Update'}</Button>
                                  </Row>
                                  { this.state.selectedActionType == 'update' ? 
                                      <Row>   
                                        <button type="button" style={{'marginLeft' : '10%', 'width': '80%', 'marginTop': '10px'}} className="btn btn-danger" onClick={this.deleteTeam}><i class="fa fa-trash" /> Delete</button>
                                      </Row>  
                                    : null
                                  }
                                   
                                  <Row>
                                      <div className="form-group double-column-padding" style={{ 'marginTop':'20px'}}>
                                        <label>Selected Team Leaders(s):</label>
                                        <ul>
                                        {  this.state.selectedTeamLeaders.map((value, index) => {
                                              return <li>
                                                        {value.label}
                                                    </li>;
                                          }) 
                                        }

                                        </ul>
                                      </div>
                                  </Row>
                                  <Row>
                                      <div className="form-group double-column-padding">
                                        <label>Selected Users(s):</label>
                                        <ul>
                                        {  this.state.selectedTeamUsers.map((value, index) => {
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
    user                : state.user,
    team                : state.lookup.team,
    team_leader         : state.lookup.team_leader,
    teams_handled       : state.lookup.teams_handled,
    department_users    : state.lookup.department_users
  }
}
const mapDispatchToProps = (dispatch) => {
    return {
      fetchUserList                     : ( role, params ) => dispatch( fetchUserList( role, params ) ),
      fetchTeamsHandledList             : ( id ) => dispatch( fetchTeamsHandledList( id ) ),
      fetchTeam                         : ( id ) => dispatch( fetchTeam( id ) ),
      fetchDepartmentUsersList          : ( id ) => dispatch( fetchDepartmentUsersList( id ) ),
      createTeam                        : ( post_data ) => dispatch( createTeam( post_data ) ),
      updateTeam                        : ( team_id, post_data ) => dispatch( updateTeam( team_id, post_data ) ),
      deleteTeam                        : ( id ) => dispatch( deleteTeam( id ) ),
    }
}
export default connect(mapStateToProps, mapDispatchToProps)(ManageTeams);








