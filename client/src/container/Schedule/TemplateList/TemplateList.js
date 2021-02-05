import React, { Component,useState  } from "react";
import { Redirect, Link } from "react-router-dom";
import { Modal,Button,Container,Col,Table } from 'react-bootstrap';
import { connect } from 'react-redux';
import DatePicker from "react-datepicker";
import * as Yup from 'yup';
import "react-datepicker/dist/react-datepicker.css";
import "./TemplateList.css";

import { listTemplate,deleteSchedule } from '../../../store/actions/scheduleActions'
import Formatter from '../../../services/Formatter'

import { ContainerHeader,Content,ContainerWrapper } from '../../../components/GridComponent/AdminLte.js';
import PageLoading from "../../PageLoading";
import Wrapper from "../../../components/Template/Wrapper";

class Schedule extends Component {    
  state = { modal_bool:false, modal_name: '', modal_id : '',index : null }

  onSubmitHandler = (props,index) => {
    this.setState({ modal_bool: !this.state.modal_bool , modal_name: props.name, modal_id : props.id, index : index}) 
    this.onDeleteHandler(props.id, index);
  }

  onDeleteHandler = (id, index) => {
    if (window.confirm("Are you sure you want to delete this template schedule?")) {
      this.props.deleteSchedule(id);
      this.props.templateList.splice(index, 1);
      this.toggleModal();
    }
  }

  toggleModal = () => {
    this.setState({ modal_bool: !this.state.modal_bool });
  }

  componentWillMount(){
    this.props.listTemplate();
  }

  render = () => {
    if(this.props.isTemplateListLoaded){
      return <Wrapper>
        <ContainerWrapper>   
          <Content col="12" title="List of Template Schedules">
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>#</th>
                <th>Template Name</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {this.props.templateList.map((schedule, index) => {
                return <tr><td>{index + 1}</td> <td>{schedule.name}</td> <td><Link className="btn btn-primary" to={{
                  pathname: global.template_list + schedule.id,
                  previousPath: this.props.location.pathname
                }}> <i class="fa fa-edit"></i> Edit </Link> <Button variant="danger" style={{'padding': '10px 15px'}} onClick={ () => this.onSubmitHandler(schedule, index)} > <i class="fa fa-trash"></i> Delete </Button> </td></tr>;
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
        ...state.schedule
    }
  }
  const mapDispatchToProps = (dispatch) => {
    return {
      listTemplate : () => dispatch( listTemplate() ),
      deleteSchedule : (id) => dispatch( deleteSchedule(id) ),
    }
  }

export default connect(mapStateToProps, mapDispatchToProps)(Schedule);
