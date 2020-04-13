import React, { Component,useState  } from "react";
import { Redirect } from "react-router-dom";
import { Modal,Button,Container,Col,Table } from 'react-bootstrap';
import { connect } from 'react-redux';
import DatePicker from "react-datepicker";
import * as Yup from 'yup';
import "react-datepicker/dist/react-datepicker.css";
import "./TemplateList.css";

import { listTemplate,deleteSchedule } from '../../../store/actions/scheduleActions'
import Formatter from '../../../services/Formatter'

import { ContainerHeader,Content,ContainerWrapper } from '../../../components/GridComponent/AdminLte.js';

class Schedule extends Component {    
  state = { modal_bool:false, modal_name: '', modal_id : '',index : null }

  onSubmitHandler = (props,index) => {
    this.setState({ modal_bool: !this.state.modal_bool , modal_name: props.name, modal_id : props.id, index : index}) 
  }

  onDeleteHandler = (id) => {
    this.props.deleteSchedule(id);
    this.props.templateList.splice(this.state.index, 1);
    this.toggleModal();
  }

  toggleModal = () => {
    this.setState({ modal_bool: !this.state.modal_bool });
  }

  componentWillMount(){
    this.props.listTemplate();
  }

  render = () => {
    if(this.props.isTemplateListLoaded){
      return <ContainerWrapper>   
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
            {this.props.templateList.map((day, index) => {
               return <tr><td>{index + 1}</td> <td>{day.name}</td> <td><Button variant="success" href={`${global.template_list_url}${day.id}`}> <i class="fa fa-edit"></i> Edit </Button>  <Button variant="danger" onClick={ () => this.onSubmitHandler(day,index)} > <i class="fa fa-trash"></i> Delete </Button> </td></tr>;
            })}
            </tbody>
        </Table>
        </Content>
              </ContainerWrapper>   
                ;
    }

    return <div>TEST</div>
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
