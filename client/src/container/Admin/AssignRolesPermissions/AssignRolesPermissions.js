import React, { Component, useState, useEffect ,setState } from "react";
import DatePicker from "react-datepicker";
import { Container,Row,Col,Table,Image, Spinner,Button  } from 'react-bootstrap';
import "./AssignRolesPermissions.css";
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import moment from 'moment';
import { connect } from 'react-redux';
import * as Yup from 'yup';

import Wrapper from "../../../components/Template/Wrapper";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../../components/GridComponent/AdminLte.js';

import { fetchUser,fetchUserRolePermission,assignRolesPermissions } from '../../../store/actions/admin/assignRoleActions'
import { fetchRoleList } from '../../../store/actions/lookup/lookupListActions';
import Formatter from "../../../services/Formatter";


class AssignRolesPermissions extends Component {
	constructor(props) {
		super(props);
		this.state = { 
			roles : [], 
			userLists : null,  
			userRole : [], 
			userPermission : [], 
			selectedUser : null 
		};
	  }


	onSubmitHandler = (values) => {

		// Set parameters for the  calling Assinging Roles and Permissions
		var user_id = values.selectedUser;
		var formData = {
			roles : values.roles,
			permissions : values.permissions
		};

		this.props.assignRolesPermissions(user_id, formData);
	}

	// Function for updating Selected User on state
	handleChange(event) {
		this.setState({selectedUser: event.target.value});
	}

	// Load the roles with permissions
	componentWillMount(){
		this.props.fetchRoleList();
	}


	render = () => {  

	this.state.roles = this.props.roles ? this.props.roles : [];

	if(this.props.isUserListLoaded){
		this.state.userLists = this.props.userLists;
	}

	if(this.props.isUserRolesPermissionsLoaded){
		this.state.userRole = this.props.userRole;
		this.state.userPermission = this.props.userPermission;
	}

	return(<Formik 
		enableReinitialize
		onSubmit={this.onSubmitHandler} 
		validationSchema={validationSchema} 
		initialValues={{
			selectedUser: this.state.selectedUser, 
			roles: this.state.userRole,
			permissions: this.state.userPermission,
		}}>
	  {
	  ({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
		<form onSubmit={handleSubmit}>
		        <Wrapper {...this.props} >
              <ContainerWrapper>
                  <ContainerBody>
                      <Content col="6" title="Assign Roles/Permissions to a User" >
					  	<Col> 
							<div className="form-group">
								<label>Search Name:</label>
								<Field>
									{({ field, form }) => (
										<div>
										<input type="textfield" className="form-control" onChange={(e) => { handleChange("nameFilter")(e); if(e.target.value.length>2){this.props.fetchUser(e.target.value);} }} variant="primary" placeholder="Enter Name..." name="nameFilter" value={values.nameFilter} />
										</div>
									)}
								</Field>
							</div>
							{ this.state.userLists?.length > 0  ? (
								<div>
									<div className="form-group">
										<label>Select User:</label>
										<select
											className="form-control" 
											name="selectedUser"
											value={values.selectedUser}
											onChange={(e) => { this.handleChange(e); this.props.fetchUserRolePermission(e.target.value); }}
											style={{ display: 'block' }}
										>
										<option    label="Select Name" />
										{ this.state.userLists.map(function(user){
											return  <option value={user.id} label={user.emp_num + ' - ' + user.first_name + ' ' + user.last_name} />
										})}
										</select>
									</div>
								</div>) 
								: 
								(<div> Sorry, No Record Found </div>)
							}
								
							 {  this.state.userLists?.length > 0  && this.state.selectedUser != null ? (<div>
							 <div className="form-group">
								<label>Select Role and Permission:</label>
								{ this.state.roles.map(function(role){
									return 	<React.Fragment>
										<label className="role-label">
												<Field type="checkbox" label={role.name} name="roles" value={role.name} /> &nbsp; { Formatter.slug_to_title(role.name) }
										</label>
										{  	role.permissions.length > 0 && 
											<div className="role-permissions">
												{	role.permissions.map(function(permission){
													return <label className="permission-label col-6">
																<Field type="checkbox" label={permission.label} name="permissions" value={permission.name} /> &nbsp; { permission.label }
															</label>
													})
												}
												<hr/>
											</div>
										}
									</React.Fragment>;
								})}
							</div>
							<Button className="display-block" variant="primary" type="submit">
								<i class="fa fa-tag" /> Assign
							</Button>	
							</div>) : null}
								
                    	</Col>
						
                      </Content>
                </ContainerBody>
            </ContainerWrapper>
      </Wrapper>
	</form>
	)}
  
	</Formik>);
	}
  }



  const validationSchema = Yup.object().shape({

  });
  
  const mapStateToProps = (state) => {
	 
	return {
		userLists     						: state.assignRole.userLists, 
		isUserListLoaded     				: state.assignRole.isUserListLoaded,

		// isRolesLoaded     				: state.assignRole.isRolesLoaded,
		// roles     						: state.assignRole.roles,
		roles             					: state.lookup.roles,

		userRole     						: state.assignRole.userRole,
		userPermission     					: state.assignRole.userPermission,
		isUserRolesPermissionsLoaded     	: state.assignRole.isUserRolesPermissionsLoaded,
	}
  }
  
  const mapDispatchToProps = (dispatch) => {
	  return {
		fetchUser       		: ( name_string  ) => dispatch( fetchUser( name_string ) ),
		fetchRoleList      		: () => dispatch( fetchRoleList() ),
		fetchUserRolePermission       	: ( user_id ) => dispatch( fetchUserRolePermission( user_id ) ),
		assignRolesPermissions  : ( user_id , post_data ) => dispatch( assignRolesPermissions( user_id , post_data ) ),
	  } 
  }
  export default connect(mapStateToProps, mapDispatchToProps)(AssignRolesPermissions);
  