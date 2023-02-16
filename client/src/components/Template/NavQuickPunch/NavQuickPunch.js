import React, { Component } from "react";
import "./NavQuickPunch.css";
import { connect } from "react-redux";
import { useHistory } from "react-router-dom";
import Validator from "../../../services/Validator";
import { Link } from "react-router-dom";
import { logOut } from '../../../store/actions/userActions'
import { Container,Row,Col,Table,Image, Spinner,Button, Badge, Tab, Tabs, Dropdown } from 'react-bootstrap';
import $ from 'jquery';
import moment from 'moment';
import { biometrixLog } from '../../../store/actions/dtr/quickpunchActions'
import NavPuncher from "../NavPuncher/NavPuncher";
// import NavPuncher from "../../../components/template/NavPuncher";
import { getRecentDtr } from '../../../store/actions/dashboard/dashboardActions';
import { getMyDtrNotifications } from '../../../store/actions/dashboard/dashboardActions';
import { getIncompleteDtr } from '../../../store/actions/dtr/dtrActions';

import DtrNotifications from "../../../components/Dashboard/DtrNotifications";
import RecentDtrNav from "../../../components/Dashboard/RecentDtrNav";
import DtrFormatter from '../../../services/DtrFormatter';
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import * as Yup from 'yup';



class NavQuickPunch extends Component {
  constructor(props) {
    super(props);
    this.timer = 0;
    this.state = {
        time: new Date(),
        compare_to_clock_in: new Date(),
        NavHasLoaded : false,
        incompletedtr : {},
      };
  }
  
  onSubmitHandler = async (values) => {
    var formData = new FormData();
	
		for (var key in values) {
	
			if( values[key] != null ) {
				switch( key ) {
					default:
						formData.set(key, values[key]);
						break;
				}
			}
		}
		this.props.biometrixLog(  formData , this.props.user.id );
	}
  onClickHandler(){
    
      
      
    
         
      
      
  }
  componentWillMount= async () => {
    // $(document).on('click', 'nav-clock-dropdown .dropdown .dropdown-menu', function (e) { // SAVE FOR LATER
    //   e.stopPropagation();
    // });
  }

  componentWillUnmount() {
  }

  render = () => {
    const initialValue = {
      quickpunch : null
    }

  const { recent_dtr } = this.props.dashboard;
    
  let showErr =  recent_dtr.length > 0  ? 
                    recent_dtr[1]?.start_datetime === null &  recent_dtr[1]?.time_in !== null &  recent_dtr[1]?.is_rest_day  === 0? true : 
                    recent_dtr[0].start_datetime === null &  recent_dtr[0].time_in !== null &  recent_dtr[0]?.is_rest_day  === 0 ? true : false : false;

 
    const user = this.props.user;
    var from =  moment().subtract(1, 'days').format("YYYY-MM-DD") ;
    var to = moment().format("YYYY-MM-DD");
  
    if (this.props.user !=null && this.props.user.id !=null && this.state.NavHasLoaded == false){
      this.props.getRecentDtr(this.props.user.id, from , to );
      this.props.getMyDtrNotifications( this.props?.user?.id );
      this.props.getIncompleteDtr();

      this.state.NavHasLoaded = true
     
    }

    var logsLabel = (this.props.incompletedtr.length > 0) ? "Incomplete Timelogs: " + this.props.incompletedtr.length : "";

    return (
      <>

{/* 
      <li className="nav-item nav-clock-dropdown">
        <div className=" dropdown" data-toggle="dropdown" >

          <NavPuncher/>  
          </div>
            <div  className="dropdown-menu " >     
                 
                <div className="card" >
                  <Tabs
                      defaultActiveKey="recent"
                      transition={false}
                      className="mb-3"
                    >
                    <Tab className="tabbish" eventKey="recent" title="RECENT DTR">
                      <RecentDtrNav/> 
                    </Tab>
                    <Tab eventKey="notifications" title="DTR NOTIFICATIONS">
                      <DtrNotifications/>
                    </Tab>
              
                  </Tabs>       
                               
                </div>     
            </div>
`
            
      </li> */}



      <li className="nav-item nav-clock-dropdown">
        <Dropdown  className= " nav-clock-dropdown ">
  

          <NavPuncher/>  
         
            <Dropdown.Menu>
                 
                <div className="card" >
                  <Tabs
                      defaultActiveKey="recent"
                      transition={false}
                      className="mb-3"
                    >
                    <Tab className="tabbish" eventKey="recent" title="RECENT DTR">
                      <RecentDtrNav/> 
                    </Tab>
                    <Tab eventKey="notifications" title="DTR NOTIFICATIONS">
                      <DtrNotifications/>
                    </Tab>
                    <Tab id="incLogs" title={logsLabel} disabled></Tab>
              
                  </Tabs>       
 
                </div>     
            </Dropdown.Menu>

            </Dropdown>
      </li>
      </>
   

    
      
    );
  };
}

const validationSchema = Yup.object().shape({});

const mapStateToProps = (state) => {
  return {
    user: state.user,
    settings: state.settings,
    dashboard : state.dashboard,
    incompletedtr : state.dtr.incompleteDtr,
  };
};
const mapDispatchToProps = (dispatch) => {
  return {
    getRecentDtr          : (user_id,from,to) => dispatch( getRecentDtr(user_id,from,to) ),
    biometrixLog          : ( post_data , id ) => dispatch( biometrixLog( post_data , id ) ),
    getMyDtrNotifications : () => dispatch( getMyDtrNotifications() ),
    getIncompleteDtr      : () => dispatch( getIncompleteDtr() ),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(NavQuickPunch);

// export default (NavQuickPunch);
