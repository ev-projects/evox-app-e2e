import React from 'react'
import BirthdayAnniversary from '../BirthdayAnniversary/BirthdayAnniversary'
import { Card } from "react-bootstrap";
import "./Engagement.css";
const Engagement = () => {
  return (
    <div className="main-card mt-4">
    <div className="row celebration_emp mb-4">
    <div class="col-12 col-md-6 col-lg-6 col-xl-6 mb-5">
      <Card className="cardstyle">
        <div className="div-content">
          <span>
            <i class="fa fa-birthday-cake" aria-hidden="true"></i>{" "}
            Celebrations
          </span>
        </div>
        <BirthdayAnniversary/>
      </Card>
    </div>
    </div>
    </div>
  )
}

export default Engagement