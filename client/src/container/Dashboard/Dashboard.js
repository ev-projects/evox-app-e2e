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
                            <p>All returning employees are advised to complete a Covid Safety Declaration and acknowledgement of understanding EV&nbsp;Training</p>
                            <p>&nbsp;</p>
                            <a href="https://www.eastvantage.com/newsletter/2020/october/EVSafe.mp4" target="_blank"><img src="https://www.eastvantage.com/newsletter/2020/october/EVSafe.jpg" width="100%" /></a>
                        
                            <p>&nbsp;</p>
                              <p><a className="btn-primary" href="https://docs.google.com/forms/d/1BEACQ8tcxKOwDW2uttmAAqytAuDGgWd1ML-oBk4JTyQ/viewform?gxids=7628&amp;edit_requested=true">Please fill out this Covid Safety Declaration form</a></p>
                            </div>
                        <div className="col-lg-4 col-md-5 col-sm-12">
                            <QuickPunch/>
                            <div className="evbuddy">

                        <h3 align="center"><strong>EV</strong> JOB OPENINGS</h3>
<ul><li><a href="https://careers.eastvantage.com/content/spanish-portuguese-bilingual-specialist-bgc">Spanish - Portuguese Bilingual Specialist | BGC</a></li>
<li><a href="https://careers.eastvantage.com/content/sr-netsuite-erp-principal-consultant-benelux">Senior NetSuite&nbsp; ERP Principal Consultant | Benelux</a></li>
<li><a href="https://careers.eastvantage.com/content/us-mortgage-loan-specialist-end-end-process-mandaluyong">US Mortgage Loan Specialist (End to End Process) | Mandaluyong</a></li>
<li><a href="https://careers.eastvantage.com/content/senior-php-software-developer-backend-bgc">Senior PHP Software Developer (Backend) | BGC</a></li>
<li><a href="https://careers.eastvantage.com/content/senior-php-software-engineer-laraveljavascript-bgc">PHP Software Engineer (Laravel/Javascript) | BGC</a></li>
<li><a href="https://careers.eastvantage.com/content/lead-rpa-application-developer-blue-prism-makati-city">Lead RPA Application Developer (Blue Prism) | Makati City</a></li>
<li><a href="https://careers.eastvantage.com/content/rpa-engineer-blue-prism-makati">Robotics Process Automation Engineer (Blue Prism) | Makati</a></li>
<li><a href="https://careers.eastvantage.com/content/application-support-analyst">Application Support Analyst (Level 2)</a></li>
<li><a href="https://careers.eastvantage.com/content/php-full-stack-developer-laravel-reactjs">PHP Full Stack Developer | Laravel | ReactJS</a></li>
<li><a href="https://careers.eastvantage.com/content/customer-service-head-bgc-taguig">Customer Service Head</a></li>
<li><a href="https://careers.eastvantage.com/content/technical-support-representative-billinginvoices-non-voice-graveyard" target="_blank">Technical Support Representative (Billing/Invoices)</a></li>
<li><a href="https://careers.eastvantage.com/content/senior-full-stack-php-developer-laravel-reactjs" target="_blank">Senior Full Stack PHP Developer (Laravel, ReactJS)</a></li>
<li><a href="https://careers.eastvantage.com/content/full-stack-developer-laravelreactjs-bgc-taguig" target="_blank">Full Stack Developer (Laravel/ReactJS)</a></li>
<li><a href="https://careers.eastvantage.com/content/senior-full-stack-web-developer-phpjavascript-bgc" target="_blank">Senior Full Stack Web Developer (PHP/Javascript)</a></li>
<li><a href="https://careers.eastvantage.com/content/customer-service-manager-bgc-taguig" target="_blank">Customer Service Manager | BGC, Taguig</a></li>
<li><a href="https://careers.eastvantage.com/content/senior-elixir-software-engineer-full-stack-bgc" target="_blank">Senior Elixir Software Engineer (Full Stack)</a></li>
<li><a href="https://careers.eastvantage.com/content/us-mortgage-loan-closer-mandaluyong"><u>US Mortgage Loan Closer | Night Shift</u></a></li>
<li><a href="https://careers.eastvantage.com/content/frontend-web-developer-phpjavascript-bgc-0" target="_blank">Frontend Web Developer (PHP/Javascript)</a></li>
<li><a href="https://careers.eastvantage.com/content/sr-netsuite-erp-consultant-benelux">Sr. NetSuite ERP Consultant (Benelux)</a></li>
<li><a href="https://careers.eastvantage.com/content/rpa-lead-developer-blue-prism-certified">RPA Lead Developer (Blue Prism Certified)</a></li>
<li><a href="https://careers.eastvantage.com/content/customer-service-representative-life-insurance-bgc-taguig"><u>Customer Service Representative (Life Insurance) BGC, Taguig</u></a></li>
<li><a href="https://careers.eastvantage.com/content/native-japanese-bilingual-learning-specialist-bgc-taguig"><u>Native Japanese Bilingual Learning Specialist&nbsp;</u></a></li>
<li><u><a href="https://careers.eastvantage.com/content/spanish-portuguese-learning-specialist-bgc-taguig">Spanish - Portuguese Learning Specialist</a></u></li>
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
