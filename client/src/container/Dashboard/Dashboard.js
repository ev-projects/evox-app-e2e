import React, { Component } from "react";
import "./Dashboard.css";
import { Container,Row,Col,Table,Image, Spinner,Button  } from 'react-bootstrap';
import { connect } from 'react-redux';
import { fetchUser } from '../../store/actions/userActions' ;

import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../components/GridComponent/AdminLte.js';
import Wrapper from "../../components/Template/Wrapper";
import QuickPunch from "../../container/QuickPunch";

class Dashboard extends Component {
    constructor(props){
      super(props)
    }
    
    render(){
      const { user } = this.props;
      const payload = user.payload ? JSON.stringify(user.payload): "No Payload Yet!";

        return (
            <Wrapper>
               <ContainerWrapper>
                  <ContainerHeader>
                      
                  </ContainerHeader>
                 
                  <ContainerBody>
                    <div style={{'flex': '1 1 auto', 'padding': '1.25rem'}}>
                      <Row>
                            <div className="col-lg-8 col-md-7 col-sm-12">
                                <Row>
                                    <div className="col-lg-12 col-md-12 col-sm-12">
                                    <p>All returning employees are advised to complete a Covid Safety Declaration and acknowledgement of understanding EV&nbsp;Training</p>
                            <p>&nbsp;</p>
                            <a href="https://www.eastvantage.com/newsletter/2020/october/EVSafe.mp4" target="_blank"><img src="https://www.eastvantage.com/newsletter/2020/october/EVSafe.jpg" width="100%" /></a>
                        
                            <p>&nbsp;</p>
                              <p><a className="btn-primary" href="https://docs.google.com/forms/d/1BEACQ8tcxKOwDW2uttmAAqytAuDGgWd1ML-oBk4JTyQ/viewform?gxids=7628&amp;edit_requested=true">Please fill out this Covid Safety Declaration form</a></p>
                            
                                    </div>
                                    <div className="col-lg-12 col-md-12 col-sm-12">
                                    <h2 align="center">IT schedule</h2>
                                    <img src="https://eastvantage.com/evox/ITSched.jpg" width="100%"/>
                                      <ul><li>For IT concerns please send an email to helpdesk@eastvantage.com</li>
                                      <li>To follow up, you may chat us on skype at ev.it.helpdesk</li>
                                      <li>For urgent/emergency concerns reach out to: James (+63 917 8102 593)</li></ul>
                                    </div>

                                </Row>
                            </div>
                        <div className="col-lg-4 col-md-5 col-sm-12">
                            <QuickPunch/>
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
                  </ContainerBody>
              </ContainerWrapper>
            </Wrapper>
        );
    }
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
export default connect(mapStateToProps, mapDispatchToProps)(Dashboard);
