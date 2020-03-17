import React, { Component,useState  } from "react";
import { Redirect } from "react-router-dom";
import { Modal,Button,Container,Col,Table } from 'react-bootstrap';
import { connect } from 'react-redux';
import { listTemplate,deleteSchedule } from '../../../store/actions/scheduleActions'
import Formatter from '../../../services/Formatter'
import DatePicker from "react-datepicker";
import * as Yup from 'yup';
import "react-datepicker/dist/react-datepicker.css";
import "./Template_List.css";

class Schedule extends Component {    
  state = { modal_bool:false, modal_name: '', modal_id : '',index : null }

  onSubmitHandler = (props,index) => {
    this.setState({ modal_bool: !this.state.modal_bool , modal_name: props.name, modal_id : props.id, index : index}) 
  }

  onDeleteHandler = (id) => {
    this.props.deleteSchedule(id);
    this.props.templates.list.splice(this.state.index, 1);
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
      return <div>
      <Container> 
        <Col sm={8} >
        <h1><i class="fa fa-calendar-check-o"></i>  Template Schedule</h1><br/>
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
           return <tr><td>{index + 1}</td> <td>{day.name}</td> <td><Button variant="success" href={`${global.template_url}${day.id}`}> <i class="fa fa-edit"></i> Edit </Button>  <Button variant="danger" onClick={ () => this.onSubmitHandler(day,index)} > <i class="fa fa-trash"></i> Delete </Button> </td></tr>;
        })}

            </tbody>
        </Table>

        </Col>
      </Container> 
        <Modal show={this.state.modal_bool}>
        <Modal.Header><h2> Delete Template</h2></Modal.Header>
        <Modal.Body>Are you sure you want to delete {this.state.modal_name} ?</Modal.Body>
        <Modal.Footer><Button variant="secondary" onClick={ () => this.toggleModal()}  ><i class="fa fa-close"></i> Close</Button>
          <Button variant="danger" onClick={ () => this.onDeleteHandler(this.state.modal_id,)} ><i class="fa fa-trash"></i> Delete</Button></Modal.Footer>
        </Modal>
      </div>;
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
