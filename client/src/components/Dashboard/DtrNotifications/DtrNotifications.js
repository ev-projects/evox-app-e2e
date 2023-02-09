import React, { Component, useState, useEffect  } from "react";
import DatePicker from "react-datepicker";
import { Container,Row,Col,Table,Image, Spinner,Button  } from 'react-bootstrap';

import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../../components/GridComponent/AdminLte.js'
import "./DtrNotifications.css";
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import moment from 'moment';
import { connect } from 'react-redux';
import { getMyDtrNotifications } from '../../../store/actions/dashboard/dashboardActions'
import * as Yup from 'yup';
import Formatter from "../../../services/Formatter";

class DtrNotifications extends Component {
	constructor(props){
    	super(props);
	}
	
	onSubmitHandler = (values) => {

	}

  componentWillMount(){ 
    this.props.getMyDtrNotifications( this.props.user.id );
	}
    
	render = () => {  

		const { my_dtr_notifications } = this.props.dashboard;
    return(
      <div>
      { my_dtr_notifications.length > 0  ?
            <div className="content-table">
              <Table striped bordered hover>
                  <tbody>
              
                  { my_dtr_notifications.slice().reverse().map(function (data, i) {

                      // If the DTR date is beyond the current date, don't show the notification by returning null.
                      if( moment().diff(moment(data.date)) < 0 ) {
                        return null;
                      }

                      return  (
                          <tr>
                            <td>{moment(data.date).format("MMM D")}</td>
                            <td className={ Formatter.title_to_slug(data.status) }>{data.status}</td>
                            <td>{data.details}</td>
                          </tr>
                      );
                    })
                  }
                  </tbody>
              </Table>
              </div>
          
          :
          <div className="no-notifications">No Notifications this Payroll Cutoff</div>
      } 
      </div>);
	  }
  }




  const validationSchema = Yup.object().shape({});
  
  const mapStateToProps = (state) => {
    return {
      user : state.user,
      dashboard : state.dashboard,
    }
  }
  const mapDispatchToProps = (dispatch) => {
	  return {
      getMyDtrNotifications  : () => dispatch( getMyDtrNotifications() ),
	  }
  }
  export default connect(mapStateToProps, mapDispatchToProps)(DtrNotifications);
  