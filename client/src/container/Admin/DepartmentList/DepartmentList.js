import React, { Component,useState  } from "react";
import { Redirect, Link } from "react-router-dom";
import { Modal,Button,Container,Col,Table } from 'react-bootstrap';
import { connect } from 'react-redux';
import DatePicker from "react-datepicker";
import * as Yup from 'yup';
import "react-datepicker/dist/react-datepicker.css";
import "./DepartmentList.css";
import Dropdown from 'react-bootstrap/Dropdown';
import { fetchDepartmentList, deleteDepartment , updateDepartmentScheduleStatus} from '../../../store/actions/admin/departmentListActions'

import Formatter from '../../../services/Formatter'
import Form from 'react-bootstrap/Form';
import { ContainerHeader,Content,ContainerWrapper } from '../../../components/GridComponent/AdminLte.js';
import PageLoading from "../../PageLoading";
import Wrapper from "../../../components/Template/Wrapper";

class DepartmentList extends Component {    
  state = { modal_bool:false, modal_name: '', modal_id : '',index : null }

  onSubmitHandler = (props,index) => {
    // this.setState({ modal_bool: !this.state.modal_bool , modal_name: props.name, modal_id : props.id, index : index}) 
    // this.onDeleteHandler(props.id, index);
  }

  onDeleteHandler = (department, index) => {
    if (window.confirm("Are you sure you want to Remove this Department ?")) {

      this.props.deleteDepartment(department.id);
      this.props.departmentList.Deplist.splice(index, 1);
      this.toggleModal();
    }
  }

  onChangeSceduleStatusHandler = (department, index) => {

    var formData = new FormData();
    formData.set("id", department.id);
    formData.set("current_status", department.schedule_active == true? true : false);
    if (window.confirm("Update this Department Schedule Status for Multi Login?")) {
      this.props. updateDepartmentScheduleStatus(department.id,formData)
      // this.props.departmentList.Deplist[department.id].department.schedule_active = !department.schedule_active;
      this.props.fetchDepartmentList();
      this.toggleModal();
      // this.props.updateDepartmentScheduleStatus(department.id);
      // this.props.departmentList.Deplist.splice(index, 1);
    
    }
  }

  toggleModal = () => {
    this.setState({ modal_bool: !this.state.modal_bool });
  }

  componentWillMount(){
    this.props.fetchDepartmentList();
  }
  
  render = () => {
    console.log(this.props.departmentList);
    if(this.props.departmentList.isDepartmentListLoaded){
      return <Wrapper  {...this.props} >
        <ContainerWrapper>   
          <Content col="12" title="Department List">
          <p>Department list and control</p>
          <p>Options:</p>
          <ul>
            <li>Soft Delete -  Delete marks a Department and the employees under it as no longer active or valid without actually deleting it from the database, and is recoverable by contacting Dev OPS Team.</li>
          </ul> 
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>#</th>
                <th>Department ID</th>
                <th>Department Name</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {this.props.departmentList.Deplist.map((department, index) => {
                return <tr>
                          <td>{index + 1}</td> 
                          <td>{department.id + 1}</td> 
                          <td>{department.department_name}</td> 
                          <td>
                          <label>Multi Login:{department.schedule_active == true? "ON" : "OFF"}</label>
                          <Form.Check // prettier-ignore
                            checked={department.schedule_active == true? "checked" : ""}
                            type="switch"
                            id={department.id}
                            onClick={ () => this.onChangeSceduleStatusHandler(department, index)}
                            label=""
                          />
                          
                ----
            <Dropdown>
                  <Dropdown.Toggle variant="warning" id="dropdown-basic">
                    Remove
                  </Dropdown.Toggle>

                  <Dropdown.Menu>
                    <Dropdown.Item href="#/action-1">
                                <Button variant="danger" style={{'padding': '10px 15px'}} onClick={ () => this.onDeleteHandler(department, index)} > 
                                  <i class="fa fa-trash"></i> Soft Delete 
                                </Button> 
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
                                
                          </td>
                      </tr>;
              })}
              </tbody>
          </Table>
          </Content>
        </ContainerWrapper>
      </Wrapper>;
    }

    return <PageLoading/>
  }
}

const mapStateToProps = (state) => {

      return {
        departmentList             : state.departmentList,
    }
  }
  const mapDispatchToProps = (dispatch) => {
    return {
      fetchDepartmentList : () => dispatch( fetchDepartmentList() ),
      deleteDepartment : (id) => dispatch( deleteDepartment(id) ),
      updateDepartmentScheduleStatus : (id,post_data) => dispatch( updateDepartmentScheduleStatus(id,post_data) ),
    }
  }

export default connect(mapStateToProps, mapDispatchToProps)(DepartmentList);
