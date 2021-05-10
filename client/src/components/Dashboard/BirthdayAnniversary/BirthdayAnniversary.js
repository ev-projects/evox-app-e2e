import React, { Component, useState, useEffect  } from "react";
import DatePicker from "react-datepicker";
import { Container,Row,Col,Table,Image, Spinner,Button  } from 'react-bootstrap';

import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../../components/GridComponent/AdminLte.js'
import "./BirthdayAnniversary.css";
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import moment from 'moment';
import { connect } from 'react-redux';
import { getBirthdayAnniv } from '../../../store/actions/dashboard/dashboardActions'
import * as Yup from 'yup';


class BirthdayAnniversary extends Component {
	constructor(props){
    	super(props);
	}
	
	onSubmitHandler = (values) => {

	}

    componentWillMount(){
		this.props.getBirthdayAnniv( this.props.user.id );
	}
	
    componentWillUnmount(){
    }

	render = () => {  
		const { birthday_and_anniv } = this.props.dashboard;
    return(
      <div >
  
      <div >
        { birthday_and_anniv.length > 0  ? 
            <div className="content-table bdr0">
              <Table striped bordered hover>
                  
                  <tbody>
              
                  {birthday_and_anniv.map(function (data, i) {
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
		dashboard : state.dashboard
	}
  }
  const mapDispatchToProps = (dispatch) => {
	  return {
      getBirthdayAnniv         : ( id ) => dispatch( getBirthdayAnniv( id ) ),
	  }
  }
  export default connect(mapStateToProps, mapDispatchToProps)(BirthdayAnniversary);
  