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
import QuickPunch from "../../../container/QuickPunch";

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
    const payload = user.payload ? JSON.stringify(user.payload): "No Payload Yet!";

    return (<div style={{'flex': '1 1 auto', 'padding': '1.25rem'}}>
              <Row>
                <div className="col-lg-8 col-md-7 col-sm-12">
                  <Row>
                      <div class="block col-lg-12 col-md-12 col-sm-12"><h3>Company Announcements</h3>
                        <div class="row">
                          <div class="col-lg-6 col-md-12 col-sm-12">
                          <ReactPlayer 
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
                              onReady={()=>{ /*console.log('onReady Call back')*/ }}
                              onStart={()=>{ /*console.log('onStart Call back')*/ }}
                              onPause={()=>{ /*console.log('onPause Call back')*/ }}
                              onError={()=>{ /*console.log('onError Call back')*/ }}
                          />
                            
                            <p>All returning employees are advised to complete a Covid Safety Declaration and acknowledgement of understanding EV&nbsp;Training. <br /> Cclick the link below to fill out the form </p>
                            <p><a class="btn-primary" href="https://docs.google.com/forms/d/1BEACQ8tcxKOwDW2uttmAAqytAuDGgWd1ML-oBk4JTyQ/viewform?gxids=7628&amp;edit_requested=true">Covid Safety Declaration form</a></p>
                          </div>
                          <div class="col-lg-6 col-md-12 col-sm-12">
                            <a href="https://evox2.eastvantage.com/app/dpa" target="_blank">
                            <img src="https://www.eastvantage.com/webinar/DPA.jpg" width="100%" /></a>
                            <p>All employees are required to watch the Data Privacy webinar. Please tick the checkbox that will appear once the video ends to confirm your attendance. <br />Click the link below to go to the page.</p>
                            <p>
                              <Link className="btn-primary" to={global.links.dpa} >
                                Data Privacy Webinar
                              </Link>
                            </p>
                          </div>
                        </div>
                      </div>

                      <div class="col-lg-12 col-md-12 col-sm-12">
                        <h2 align="center">IT schedule</h2>
                        <img src="https://eastvantage.com/evox/ITSched.jpg" width="100%" />
                        <ul>
                          <li>For IT concerns please send an email to helpdesk@eastvantage.com</li>
                          <li>To follow up, you may chat us on skype at ev.it.helpdesk</li>
                          <li>For urgent emergency concerns reach out to: James (+63 917 8102 593)</li>
                        </ul>
                      </div>

                  </Row>
                </div>

                <div className="col-lg-4 col-md-5 col-sm-12">
                  <QuickPunch />
                  <div className="evbuddy">
                    <h3 align="center"><strong>EV</strong> JOB OPENINGS</h3>
                    <ul>
                      <li><a href="https://careers.eastvantage.com/content/us-mortgage-loan-disclosure-specialist-night-shift-mandaluyong">US Mortgage Loan Disclosure Specialist | Night Shift | Mandaluyong</a></li>
                      <li><a href="https://careers.eastvantage.com/content/us-mortgage-loan-specialist-end-end-process-mandaluyong">US Mortgage Loan Specialist (End to End Process)</a></li>
                      <li><a href="https://careers.eastvantage.com/content/spanish-portuguese-learning-professional-customer-service-specialist">Spanish-Portuguese Learning Professional | Customer Service Specialist</a></li>
                      <li><a href="https://careers.eastvantage.com/content/portuguese-learning-specialist-project-based-bgc-taguig">Portuguese Learning Specialist | Project-Based</a></li>
                      <li><a href="https://careers.eastvantage.com/content/mandarin-learning-specialist-customer-support-representative">Mandarin Learning Specialist | Customer Support Representative</a></li>
                      <li><a href="https://careers.eastvantage.com/content/english-learning-specialist-customer-service-professional">English Learning Specialist | Customer Service Professional</a></li>
                      <li><a href="https://careers.eastvantage.com/content/japanese-learning-specialist-customer-care-professional">Japanese Learning Specialist | Customer Care Professional</a></li>
                      <li><a href="https://careers.eastvantage.com/content/customer-support-representative-live-chat-email-phone">Customer Support Representative</a></li>
                      <li><a href="https://careers.eastvantage.com/content/portuguese-bilingual-specialist-project-based-bgc">Portuguese Bilingual Specialist (Project-Based)</a></li>
                      <li><a href="https://careers.eastvantage.com/content/3-5-years-php-backend-laravel-developer-mid-shift">3-5 years | PHP Backend Laravel Developer | Mid Shift</a></li>
                      <li><a href="https://careers.eastvantage.com/content/mid-senior-python-developer-3-5-years-bgc-taguig">Mid to Senior Python Developer (3-5 years | BGC, Taguig)</a></li>
                      <li><a href="https://careers.eastvantage.com/content/mid-senior-etl-specialist-python">Mid to Senior ETL Specialist (Python)</a></li>
                      <li><a href="https://careers.eastvantage.com/content/network-engineer-day-shift-bgc">Network Engineer | Day Shift | BGC</a></li>
                      <li><a href="https://careers.eastvantage.com/content/elixir-software-engineer-full-stack-mid-senior-bgc">Senior Elixir Software Engineer (Full Stack)</a></li>
                      <li><a href="https://careers.eastvantage.com/content/mandarin-bilingual-specialist-bgc">Mandarin Bilingual Specialist</a></li>
                      <li><a href="https://careers.eastvantage.com/content/software-qa-automation-engineer-robot-framework-mid-senior-bgc">Software QA Automation Engineer (Robot Framework)</a></li>
                      <li><a href="https://careers.eastvantage.com/content/customer-service-specialist-logisticsfreight-dayshift-bgc">Customer Service Officer (Logistics/Freight)</a></li>
                      <li><a href="https://careers.eastvantage.com/content/full-stack-developerreact-js-developer-bgc">Full Stack Developer/React JS Developer</a></li>
                      <li><a href="https://careers.eastvantage.com/content/software-engineer-pythonetl-mid-senior-bgc">Software Engineer (Python/ETL)</a></li>
                      <li><a href="https://careers.eastvantage.com/content/senior-php-software-developer-backend-bgc">Senior PHP Software Developer (Laravel/Javascript)</a></li>
                      <li><a href="https://careers.eastvantage.com/content/drupal-web-developer-php-mid-senior-dayshift">PHP Developer (Drupal)</a></li>
                    </ul><h4 align="center"><strong>Refer a friend and earn as much as 20K!</strong></h4>
                    <div align="center">Go to <a href="https://careers.eastvantage.com/evbuddy">https://careers.eastvantage.com/evbuddy</a></div>
                  </div>
                </div>                        
              </Row>
            </div>
        );
};

const mapStateToProps = (state) => {
  return {
      user : state.user
  }
}
const mapDispatchToProps = (dispatch) => {
  return {
    fetchUser : () => dispatch( fetchUser() )
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(EmployeeDashboard);
