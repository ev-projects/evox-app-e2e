import React from "react";
import { Form, Button, Accordion, Card } from "react-bootstrap";
import "./JobReferalstyle.css";
const Referalmachanisam = () => {
  return (
    <Accordion defaultActiveKey="0">
    <Card>
      <Card.Header>
        <Accordion.Toggle as={Button} 
          variant="link" eventKey="0" className="tooglestyle">
          EV Buddy Referral Mechanics
        </Accordion.Toggle>
      </Card.Header>
      <Accordion.Collapse eventKey="0">
        <Card.Body className="removeborder">
        <ol className="referal">
      <li>
        Fill out&nbsp;an official buddy referral form, attach your buddy’s
        CV and submit it through these channels:
        <ul>
          <li className="liststyle">
            Priority channel: Send an email with complete referrer and
            buddy details to&nbsp;
            <a href="mailto:recruitment@eastvantage.com?subject=EV%20Buddy%20Referral" className="mail_link">
              recruitment@eastvantage.com
            </a>
            &nbsp;(don’t forget to attach the CV!)
          </li>
          <li className="liststyle">Submit to EV receptionist/guard</li>
          <li className="liststyle">Submit to any member of the Recruitment team</li>
        </ul>
      </li>
      <li>
        Recruitment will be in touch with you once your buddy successfully
        gets hired. Announcements of successful EV Buddy hires will be
        made available at the end of the month.
      </li>
      <li>
        Referral bonus payout will be 50% upon your buddy’s completion of
        3 months and 50% on their 6th month.
      </li>
      <li>
        The following referral bonuses apply:
        <ul>
          <li className="liststyle">
            For Customer Service roles:&nbsp;<strong>Php 5,000</strong>
            &nbsp;per successful referral
            <ul>
              <li>Php 2,500 after 3 months tenure</li>
              <li>Php 2,500 upon confirmation / regularization</li>
            </ul>
          </li>
          <li className="liststyle">
            For Business Support and Operations (Specialist) roles:
            <strong>&nbsp;Php 10,000</strong>&nbsp;per successful referral
            <ul>
              <li>Php 5,000 after 3 months of tenure</li>
              <li>Php 5,000 upon confirmation / regularization</li>
            </ul>
          </li>
          <li className="liststyle">
            Technology (Web Development) &amp; Senior Management roles:{" "}
            <strong>Php</strong>&nbsp;<strong>30,000</strong>&nbsp;per
            successful referral &nbsp;
            <ul>
              <li>Php 15,000 after 3 months of tenure</li>
              <li>Php 15,000 upon confirmation / regularization</li>
            </ul>
          </li>
        </ul>
      </li>
      <li>Payouts will be credited on the next applicable payroll.</li>
    </ol>
    <div>

  
    <h5><i className="fa fa-address-book-o" style={{color:"#82af13"}} /> Note</h5>
    <ol  className="referal">
      <li>
        <em>
          To be eligible for the referral bonus, referrer and successful
          referral should not incur any disciplinary action or not be
          enrolled in PIP during the successful referral's probationary
          period.
        </em>
      </li>
      <li>
        <em>
          The referral should not have applied with Eastvantage through
          other channels in the past 6 months. (They can only be tagged as
          a referral when the employee submits their details after the
          clearing period of 6 months)
        </em>
      </li>
      <li>
        <em>
          There will be no referral fees for candidates hired in the
          Managerial line of the referrer.
        </em>
      </li>
    </ol>
    </div>
        </Card.Body>
      </Accordion.Collapse>
    </Card>
  </Accordion>
  )
}

export default Referalmachanisam
