import React, { Component, useState, useEffect ,setState } from "react";
import DatePicker from "react-datepicker";
import { Container,Row,Col,Table,Image, Spinner,Button  } from 'react-bootstrap';
import "./AssignFeature.css";
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import moment from 'moment';
import { connect } from 'react-redux';
import * as Yup from 'yup';

import Wrapper from "../../../components/Template/Wrapper";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../../components/GridComponent/AdminLte.js';

import { fetchUser,fetchUserRolePermission,assignRolesPermissions,  fetchUserFeatures, assignLevelFeatures } from '../../../store/actions/admin/assignRoleActions'
import { fetchRoleList, fetchFeaturesList} from '../../../store/actions/lookup/lookupListActions';
import Formatter from "../../../services/Formatter";


class AssignFeature extends Component {
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
			// roles : values.roles,
			// permissions : values.permissions
			features : values.features
			
		};
		console.log(formData);
		this.props.assignLevelFeatures(user_id, formData);
	}

	// Function for updating Selected User on state
	handleChange(event) {
		this.setState({selectedUser: event.target.value});
	}

	// Load the roles with permissions
	componentWillMount(){
		this.props.fetchRoleList();
		this.props.fetchFeaturesList();
	}


	render = () => {  

	this.state.roles = this.props.roles ? this.props.roles : [];
	this.state.features = this.props.features ? this.props.features : [];
	// console.log(this.props.features)
	if(this.props.isUserListLoaded){
		this.state.userLists = this.props.userLists;
	}

	if(this.props.isUserRolesPermissionsLoaded){
		// this.state.userRole = this.props.userRole;
		// this.state.userPermission = this.props.userPermission;
		this.state.userLevel = this.props.userLevel;
		this.state.userFeatures = this.props.userFeatures;
	}

	return(<Formik 
		enableReinitialize
		onSubmit={this.onSubmitHandler} 
		validationSchema={validationSchema} 
		initialValues={{
			selectedUser: this.state.selectedUser, 
			Level: this.state.userLevel,
			features: this.state.userFeatures,
		}}>
	  {
	  ({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
		<form onSubmit={handleSubmit}>
		        <Wrapper {...this.props} >
              <ContainerWrapper>
                  <ContainerBody>
                      <Content col="6" title="Manage Features of a User" >
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
											onChange={(e) => { this.handleChange(e); this.props.fetchUserFeatures(e.target.value); }}
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
								<label>Current Level: {this.state.userLevel?.level_type}</label>
								<label>Users Features Access:</label>
								{/* { this.state.roles.map(function(role){
									console.log(role);
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
								})} */}
								{/* { this.state.roles.map(function(role){
									console.log(role);
									return 	<React.Fragment>
										<label className="role-label">
												<Field type="checkbox" label={role.name} name="roles" value={role.name} /> &nbsp; { Formatter.slug_to_title(role.name) }
										</label> */}
										{  	this.state.features.length > 0 && 
											<div className="role-permissions">
												{	this.state.features.map(function(features){
													return <label className="permission-label col-6">
																<Field type="checkbox" label={features.feature_label} name="features" value={features.feature_name} /> &nbsp; { features.feature_label }
															</label>
													})
												}
												<hr/>
											</div>
										}
								
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
		features             				: state.lookup.features,

		userRole     						: state.assignRole.userRole,
		userPermission     					: state.assignRole.userPermission,
		userLevel 							: state.assignRole.userLevel,
		userFeatures 						: state.assignRole.userFeatures,
		isUserRolesPermissionsLoaded     	: state.assignRole.isUserRolesPermissionsLoaded,
	}
  }
  
  const mapDispatchToProps = (dispatch) => {
	  return {
		fetchUser       		: ( name_string  ) => dispatch( fetchUser( name_string ) ),
		fetchRoleList      		: () => dispatch( fetchRoleList() ),
		fetchFeaturesList      		: () => dispatch( fetchFeaturesList() ),
		fetchUserRolePermission       	: ( user_id ) => dispatch( fetchUserRolePermission( user_id ) ),
		fetchUserFeatures       	: ( user_id ) => dispatch( fetchUserFeatures( user_id ) ),
		
		assignRolesPermissions  : ( user_id , post_data ) => dispatch( assignRolesPermissions( user_id , post_data ) ),
		assignLevelFeatures  : ( user_id , post_data ) => dispatch( assignLevelFeatures( user_id , post_data ) ),
	  } 
  }
  export default connect(mapStateToProps, mapDispatchToProps)(AssignFeature);
  