import React, { Component, useState, useEffect  } from "react";
import DatePicker from "react-datepicker";
import { Container,Row,Col,Table,Image, Spinner,Button  } from 'react-bootstrap';
import { Link } from "react-router-dom"; 

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
      this.state = {
        NavHasLoaded: false
             };
	}
	
	onSubmitHandler = (values) => {

	}

  componentWillMount(){ 
    // if (this.props.user !=null && this.props.user.id !=null){
    //   this.props.getMyDtrNotifications( this.props?.user?.id );
     
    // }
	}
    
	render = () => {  

    if (this.props.user !=null && this.props.user.id !=null ){
     var user_p = this.props.user
     
    }
		const { my_dtr_notifications } = this.props.dashboard;
    return(
      <div>
      { my_dtr_notifications.length > 0  ?
            <div className="content-table">
              <table >
                  <tbody>
              
                  { my_dtr_notifications.slice().reverse().map(function (data, i) {

                      // If the DTR date is beyond the current date, don't show the notification by returning null.
                      if( moment().diff(moment(data.date)) < 0 ) {
                        return null;
                      } 
                      let alter_log_id = null;
                      let alter_log_status = null;
                      
                      {data.requests.map((request, index) => {
                          if( request.request_type == "alter_log" ) {
                              alter_log_id = request.id;
                              alter_log_status = request.status;
                          }
                      })};

                      return  (
                          <tr>
                            <td>{moment(data.date).format("MMM D")}</td>
                            <td className={ Formatter.title_to_slug(data.status) }>{data.status}</td>
                            <td>{data.details}</td>
                            <td>
                            {user_p.use_multi ?<>
                              <Button  type="submit"  disabled> <i className="fa fa-edit" /></Button>
                            </>
                            
                            :
                            
                            <>
                             <Link className="btn btn-primary" 
                                              title="Alter Log"
                                              to={{
                                                pathname: global.links.base +'request/AlterLog/' + (( alter_log_id != null ) ? alter_log_id : ""),
                                                // previousPath: this.props.location.pathname, 
                                                date: data.date,
                                                current_time_in: data.time_in,
                                                current_time_out: data.time_out
                                              }}
                                              disabled
                                        >
                                      
                                        <i className="fa fa-edit" 
                                           style={{color : "#ffffff" }}></i>
                                        </Link>
                            </>}
                           
                                        
                                  

                            </td>
                          </tr>
                      );
                    })
                  }
                  </tbody>
              </table>
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
  