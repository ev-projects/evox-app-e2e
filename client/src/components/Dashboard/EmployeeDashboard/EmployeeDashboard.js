import React, { Component } from "react";
import "./EmployeeDashboard.css";
import { Container,Row,Col,Table,Image, Spinner,Button  } from 'react-bootstrap';
import { Link } from "react-router-dom";
import { connect } from 'react-redux';
import { fetchUser } from '../../../store/actions/userActions' ;

import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../GridComponent/AdminLte.js';
import Wrapper from "../../Template/Wrapper";
import ReactPlayer from 'react-player/lazy';
import * as yup from "yup";
import QuickPunch from "../../../components/Dashboard/QuickPunch";
import Holiday from "../../../components/Dashboard/Holiday";
import Authenticator from "../../../services/Authenticator";
import DtrNotifications from "../../../components/Dashboard/DtrNotifications";
import RecentDtr from "../../../components/Dashboard/RecentDtr";
import moment from 'moment';

const EmployeeDashboard = ( props ) => {

  let state = {
        url: 'https://www.eastvantage.com/newsletter/2020/october/EVSafe.mp4',
        pip: false,
        playing:  false,
        controls: true,
        light: false,
        volume: 0.35,
        muted: false,
        played: 0,
        loaded: 0,
        duration: 0,
        config: { 
          file: { 
            attributes: {
              onContextMenu: e => e.preventDefault(),
              controlsList: 'nodownload' 
            } 
          } 
        },
        playbackRate: 1.0,
        loop: false,
        width: '100%',
        height: '65%'
    } 
    
    const { width, height, url, playing, controls, light, volume, muted, config, loop, playbackRate, pip, showSubmitForm } = state
    
    const { user } = props;
    const { current_payroll_cutoff } = props.settings;
		const { my_dtr_notifications } = props.dashboard;
    
    const payload = user.payload ? JSON.stringify(user.payload): "No Payload Yet!";

    return (<div className="dashboard">
              <Row>

              <div className="col-lg-4 col-md-6 col-12">
                
                    <Row>
                      <Col size="12">
                          <QuickPunch />
                      </Col>
                    </Row>

                    <Row className="dtr-teaser">
                        <Content title="Daily Time Record" col="12">
                          <RecentDtr/>
                        </Content>     
                    </Row>

                    <Row className="dtr-notifications">
                        <Content  col="12" title={<span>DTR Notifications <small>({my_dtr_notifications?.filter(data => moment().diff(moment(data.date)) > 0).length})</small></span>} subtitle={<small> Payroll Cut-off: <br /> {moment( current_payroll_cutoff?.start_date ).format("MMM D")  +" - "+ moment( current_payroll_cutoff?.end_date ).format("MMM D")} </small>}>
                          <DtrNotifications/>
                        </Content>       
                    </Row> 

                </div>

                <div className="col-lg-4 col-md-6 col-12">
                      { !Authenticator.checkRole('client')  ? 
                            <Row>
                            <Content title="Upcoming holidays" col="12">
                                <Holiday/>
                                </Content>   
                                </Row>
                            :
                            (null)
                      }
                       <Row>
                  <div className="col-lg-12">
                  <div className="card">
                    <div className="card-header">
                        <h3 align="center" className="card-title">JOB OPENINGS</h3>
                    </div>
                    <div className="card-body evbuddy">
                    <br />
                    <h4 align="center"><strong>Refer a friend and earn as much as 20K!</strong></h4>
                    <div align="center">Go to <a href="https://careers.eastvantage.com/evbuddy">https://careers.eastvantage.com/evbuddy</a></div>
                    <br />
                    <ul>
<li><a href="https://careers.eastvantage.com/content/senior-euc-platform-engineer-bgc-taguig" target="_blank">Senior EUC Platform Engineer</a></li>
<li><a href="https://careers.eastvantage.com/content/l2-frontline-desktop-support"  target="_blank">L2 Frontline Desktop Support</a></li>
<li><a href="https://careers.eastvantage.com/content/software-development-manager-bgc-taguig" target="_blank">Software Development Manager</a></li>
<li><a href="https://careers.eastvantage.com/content/senior-full-stack-developer-laravel-reactjs">Senior Full Stack Developer</a></li>
<li><a href="https://careers.eastvantage.com/content/senior-qa-engineer-robot-framework" target="_blank">Senior QA Engineer</a></li>
<li><a href="https://careers.eastvantage.com/content/senior-python-backendapi-developer-bgc-taguig" target="_blank">Senior Python Backend/API developer</a></li>
<li><a href="https://careers.eastvantage.com/content/data-enginer-pythonetl-bgc-taguig" target="_blank">ETL Data Engineer</a></li>
<li><a href="https://careers.eastvantage.com/content/senior-full-stack-developer-laravelreact-bgc-taguig" target="_blank">Senior Full Stack Developer (Laravel/React)</a></li>
<li><a href="https://careers.eastvantage.com/content/react-js-developer-mid-senior-bgc-taguig" target="_blank">React JS Developer (Mid - Senior)</a></li>
<li><a href="https://careers.eastvantage.com/content/aws-devops-engineer-bgc-taguig" target="_blank">AWS DevOps Engineer</a></li>
<li><a href="https://careers.eastvantage.com/content/functional-tester-project-based-makati" target="_blank">Functional Tester - Project Based (Makati)</a></li>
<li><a href="https://careers.eastvantage.com/content/mid-senior-outsystems-developer-makati" target="_blank">Mid to Senior Outsystems Developer</a></li>
<li><a href="https://careers.eastvantage.com/content/elixir-software-engineer-full-stack-mid-senior-bgc" target="_blank">Elixir Software Engineer</a></li>
<li><a href="https://www.careers.eastvantage.com/content/us-recruiter-bgc" target="_blank">US Recruiter (BGC)</a></li>
<li><a href="https://careers.eastvantage.com/content/victoria-australia-mortgage-broker-support-day-shift" target="_blank">Victoria Australia Mortgage Broker Support | Day Shift</a></li>
<li><a href="https://careers.eastvantage.com/content/content-and-proposal-copywriter-bgc-taguig" target="_blank">Content and Proposal Writer</a></li>
<li><a href="https://careers.eastvantage.com/content/us-mortgage-loan-disclosure-specialist-night-shift-mandaluyong" target="_blank">US Mortgage Loan Disclosure Specialist | Night Shift | Mandaluyong</a></li>
<li><a href="https://careers.eastvantage.com/content/japanese-learning-specialist-customer-care-professional" target="_blank">Japanese Learning Specialist | Customer Care Professional</a></li>
<li><a href="https://careers.eastvantage.com/content/customer-service-representative-sales-background-bgc" target="_blank">Customer Service Representative (BGC)</a></li>
<li><a href="https://careers.eastvantage.com/content/billing-operations-specialist-customer-service" target="_blank">Billing Operations Specialist (Customer Service)</a></li>
<li><a href="https://careers.eastvantage.com/content/inbound-sales-representative-bgc-taguig" target="_blank">Inbound Sales Representative | BGC, Taguig</a></li>
<li><a href="https://careers.eastvantage.com/jobs/us-mortgage-disclosure-loan-specialist-mandaluyong" target="_blank">US Mortgage Disclosure Loan Specialist (Mandaluyong)</a></li>
<li><a href="https://careers.eastvantage.com/jobs/content-and-proposal-writer-bgc-taguig-city" target="_blank">Content and Proposal Writer (BGC, Taguig City)</a></li>
<li><a href="https://careers.eastvantage.com/jobs/learning-and-development-consultant-bgc-taguig-city" target="_blank">Learning and Development Consultant (BGC, Taguig City)</a></li>
<li><a href="https://careers.eastvantage.com/jobs/us-recruiter-night-shift-bgc-taguig-city" target="_blank">US Recruiter- Night Shift (BGC, Taguig City)</a></li>
<li><a href="https://careers.eastvantage.com/jobs/logistic-support-team-leader-bgc-taguig-city" target="_blank">Logistic Support-Team Leader (BGC, Taguig City)</a></li>
<li><a href="https://careers.eastvantage.com/content/logistics-support-bgc" target="_blank">Logistics Support (BGC)</a></li>
<li><a href="https://careers.eastvantage.com/jobs/billing-operations-specialist-csr-bgc-taguig-city" target="_blank">Billing Operations Specialist- CSR (BGC, Taguig City)</a></li>
<li><a href="https://careers.eastvantage.com/jobs/credit-analyst-bgc-taguig-city" target="_blank">Credit Analyst (BGC, Taguig City)</a></li>
<li><a href="https://careers.eastvantage.com/content/technical-virtual-assistant-service-desk" target="_blank">Technical Virtual Assistant (Service Desk)</a></li>

</ul>
                    
                  </div>
                  </div>
                  </div>
                    </Row>
                </div>
                <div className="col-lg-4 col-md-6 col-sm-12">
                  <Row className="company-announcement">
                      <Content title="Company Announcements" col="12">
                        <Row>
                          { <ReactPlayer 
                              width={width}
                              height={height}
                              url={url}
                              pip={pip}
                              playing={playing}
                              controls={controls}
                              light={light}
                              loop={loop}
                              playbackRate={playbackRate}
                              volume={volume}
                              muted={muted}
                              config={config}
                          /> }
                            
                            <p>All returning employees are advised to complete a Covid Safety Declaration and acknowledgement of understanding EV&nbsp;Training. <br /> Click the link below to fill out the form </p>
                            <a class="btn-primary" href="https://docs.google.com/forms/d/1BEACQ8tcxKOwDW2uttmAAqytAuDGgWd1ML-oBk4JTyQ/viewform?gxids=7628&amp;edit_requested=true">Covid Safety Declaration form</a>
                          </Row>
                            
                      </Content> 

                  </Row>
                   
                   <Row className="ITsched">
                    <Content title="ICT Schedule" col="12">
                      <img src="https://eastvantage.com/evox/ITSched.jpg" width="100%" />
                        <ul>
                           <li>For IT concerns please send an email to helpdesk@eastvantage.com</li>
                          <li>You may chat us via zoom or google chat at helpdesk@eastvantage.com</li>
                          <li>For urgent emergency concerns reach out to: James (+63 917 8102 593)</li>
                        </ul>
                    </Content>   
                  </Row>
                  
                 
                </div>
                
                                        
              </Row>
            </div>
        );
};


const mapStateToProps = (state) => {
  return {
      user : state.user,
      settings : state.settings,
      dashboard : state.dashboard,
  }
}
const mapDispatchToProps = (dispatch) => {
  return {
    fetchUser : () => dispatch( fetchUser() )
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(EmployeeDashboard);
