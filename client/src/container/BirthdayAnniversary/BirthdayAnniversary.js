import React, { Component, useState, useEffect  } from "react";
import DatePicker from "react-datepicker";
import { Container,Row,Col,Table,Image, Spinner,Button  } from 'react-bootstrap';

import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../components/GridComponent/AdminLte.js'
import "./BirthdayAnniversary.css";
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import moment from 'moment';
import { connect } from 'react-redux';
import { birthdayAnniv } from '../../store/actions/client/clientActions'
import * as Yup from 'yup';


class BirthdayAnniversary extends Component {
	constructor(props){
    	super(props);
	}
	
	onSubmitHandler = (values) => {

	}

    componentWillMount(){
		this.props.birthdayAnniv( this.props.user.id );
	}
	
    componentWillUnmount(){
    }

	render = () => {  
		const { birthdayAndAnniv } = this.props;
    return(
      <div >
  
      <div >
        { birthdayAndAnniv.length > 0  ? 
            <div className="content-table">
              <Table striped bordered hover>
                  <thead>
                      <tr>
                      <th>Name</th>
                      <th>Date</th>
                      <th>Display</th>
                      </tr>
                  </thead>
                  <tbody>
              
                  {birthdayAndAnniv.map(function (data, i) {
                    var icon = ''
                    switch(data.type) {
                      case "birthdate":
                        icon = <i class="fa fa-birthday-cake"></i>
                        break;
                      case "anniversary":
                        icon = <i class="fa fa-calendar-check-o"></i>
                        break;
                      case "regularization":
                        icon = <i class="fa fa-calendar-check-o"></i>
                        break;
                    }
                          return  (<tr>
                          <td>{data.name}</td>
                          <td>{data.date}</td>
                          <td>{icon}  {data.display}</td>
                  
                          </tr>)
                      }) 
                  }
                  </tbody>
              </Table>
              </div>
              :
              <div>No celebrations found</div>
              } 
              </div>
     
  </div>);
	}
  }




  const validationSchema = Yup.object().shape({});
  
  const mapStateToProps = (state) => {
	return {
		user : state.user,
		birthdayAndAnniv : state.client.birthdayAndAnniv
	}
  }
  const mapDispatchToProps = (dispatch) => {
	  return {
		birthdayAnniv         : ( id ) => dispatch( birthdayAnniv( id ) ),
	  }
  }
  export default connect(mapStateToProps, mapDispatchToProps)(BirthdayAnniversary);
  