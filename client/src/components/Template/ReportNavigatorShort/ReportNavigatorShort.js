
import React, { Component, useState } from "react";
import "./ReportNavigatorShort.css";
import { Container,Row,Col,Table,Image, Spinner,Button,Form,InputGroup,FormControl, Tabs, Tab  } from 'react-bootstrap';
import { connect } from 'react-redux';
import moment from 'moment';
import DatePicker from "react-datepicker";
import Validator from "../../../services/Validator";
import Authenticator from "../../../services/Authenticator";

// Component for the Back Button 
const ReportNavigatorShort = (props) => { 
    
    let { start_date, end_date }  = props;

    const [viewType, setViewType] = useState( props?.default_view_type ?? "month" );
    const [forceChange, setForceChange] = useState(0);

    const [customStartDate, setCustomStartDate] = useState( new Date() );
    const [customEndDate, setCustomEndDate] = useState( new Date() );

    // Handles the changing of the View Type 
    function handleChangeViewType( type ) {
        // If the type is "custom", proceed on handling the Custom Filter function
        console.log("cus", type)
        if( type === "custom" ){
             handleCustomFilter();
        } else {
             switch( type ){
 
                 // Change the view type to "day" and set the current start_date as the basis of the start and end date.
                 case "day":
                    //  start_date.set(moment().startOf('day').toObject());
                    //  end_date.set(start_date.toObject()).endOf('day');
                    console.log(moment().subtract(6,'day').startOf('day'), moment().endOf('day'));
                        start_date.set(moment().subtract(6,'day').startOf('day').toObject());
                        end_date.set(moment().endOf('day').toObject());
                     break;
 
                 // Change the view type to "week" and set the current start_date as the basis of the start and end date.
                 case "week":
                     start_date.set(moment().startOf('isoWeek').toObject()); 
                     end_date.set(start_date.toObject()).endOf('isoWeek');
                     break;
 
                 // Change the view type to "month" and set the current start_date as the basis of the start and end date.
                 case "month":
                     start_date.set(moment().startOf('month').toObject());
                     end_date.set(start_date.toObject()).endOf('month');
                     break;
             }
            props.handleChangeDate( start_date, end_date, type);
        }
        setViewType(type);
        setForceChange(!forceChange);
     }
 
     // Handles the navigation of view "prev" & "next" depending on the view type selected
     function  handleChangeNavigateAction( action ) {
        console.log("nav");
          switch( action ){
            
              // If the action type is "next"
              case "next":
                  switch( viewType ){
  
                      // If the viewType is "day", move 1 day forward.
                      case "day":
                        //   start_date.add(1, 'day').startOf('day');
                        //   end_date.set(start_date.toObject()).endOf('day');
                        // start_date.add(7, 'day').startOf('day');
                        // end_date.add(7, 'day').endOf('day');
                        start_date.add(7, 'day').startOf('day');
                        end_date.set(start_date.toObject()).add(6, 'day').endOf('day');
                          break;
  
                      // If the viewType is "week", move 1 week forward.
                      case "week":
                          start_date.add(1, 'week').startOf('isoWeek');
                          end_date.set(start_date.toObject()).endOf('isoWeek');
                          break;
  
                      // If the viewType is "month", move 1 month forward.
                      case "month":
                          start_date.add(1, 'month').startOf('month');
                          end_date.set(start_date.toObject()).endOf('month');
                          break;
                  }
                  break;
  
              // If the action type is "next"
              case "prev":
                  switch( viewType ){
  
                      // If the viewType is "day", move 1 day backward.
                      case "day":
                        start_date.subtract(7, 'day').startOf('day');
                        end_date.set(start_date.toObject()).add(6, 'day').endOf('day');
                          break;
  
                      // If the viewType is "week", move 1 week backward.
                      case "week":
                          start_date.subtract(1, 'week').startOf('isoWeek');
                          end_date.set(start_date.toObject()).endOf('isoWeek');
                          break;
  
                      // If the viewType is "month", move 1 month backward.
                      case "month":
                          start_date.subtract(1, 'month').startOf('month');
                          end_date.set(start_date.toObject()).endOf('month');
                          break;
                  }
                  break;
        }
        props.handleChangeDate( start_date, end_date, viewType);
        setForceChange(!forceChange);
     }

     

    // Handles the fetching of Customized filter
    function handleCustomFilter(){
        start_date.set( moment(customStartDate).toObject())
        end_date.set( moment(customEndDate).toObject())
        props.handleChangeDate( start_date, end_date, "custom");
        setForceChange(!forceChange);
    }


    return (
        <Row className="report-navigator">
            <div className="view-type-tabs">
                <Tabs defaultActiveKey="home" 
                    id="uncontrolled-tab-example"
                    defaultActiveKey={viewType}
                    onSelect={key => handleChangeViewType(key) }
                >
                    {Authenticator.check("hr", "hr_access") && (<Tab eventKey="custom" title="Custom" type="submit"></Tab>)}
                    <Tab eventKey="day" title="Today" type="submit"></Tab>
                    {/* <Tab eventKey="week" title="Weekly" type="submit"></Tab> */}
                    <Tab eventKey="month" title="Monthly" type="submit"></Tab>
                </Tabs>
            </div> 
            { viewType == "custom" ? 
                <React.Fragment>
                    <DatePicker 
                        className="custom-date"                      
                        showDateSelect
                        showDateSelectOnly
                        timeCaption="Time"
                        dateFormat="MMMM d, yyyy"
                        timeFormat="MMMM d, yyyy"
                        placeholder="Start Date"
                        selected={customStartDate}   
                        onChange={(date) => { setCustomStartDate(date); start_date.set( moment(date).toObject());}}
                    />
                        <span style={{marginTop: "5px"}}>to</span>
                    <DatePicker 
                        className="custom-date"                      
                        showDateSelect
                        showDateSelectOnly
                        timeCaption="Time"
                        dateFormat="MMMM d, yyyy"
                        timeFormat="MMMM d, yyyy"
                        placeholder="End Date"
                        selected={customEndDate}       
                        onChange={(date) => { setCustomEndDate(date); end_date.set( moment(date).toObject());}}
                    />   
                    <Button className="custom-filter-btn" variant="primary" onClick={handleCustomFilter} >
                        <i className="fa fa-filter" />
                    </Button>           
                    
                </React.Fragment>
                :
                <React.Fragment>
                    <div className="navigator">
                        <i className="fa fa-angle-left view-navigate" onClick={(e) => handleChangeNavigateAction("prev")} /> 
                        <i className="fa fa-angle-right view-navigate"  onClick={(e) => handleChangeNavigateAction("next")} />
                    </div>
                    <div className="dates-label">{ Validator.isValid( start_date ) && Validator.isValid( end_date ) ? (start_date.format("LL") === end_date.format("LL") ? start_date.format("LL") : start_date.format("LL") + " - " + end_date.format("LL") )  : null }</div>
                </React.Fragment>
            }
        </Row>
    );
}

export default connect(null, null)(ReportNavigatorShort);