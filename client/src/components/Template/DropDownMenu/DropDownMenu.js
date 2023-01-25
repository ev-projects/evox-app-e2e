import React, { Component } from "react";
import "./DropDownMenu.css";
import { connect } from "react-redux";
import { useHistory } from "react-router-dom";
import Validator from "../../../services/Validator";
import { Link } from "react-router-dom";
import { logOut } from '../../../store/actions/userActions'

class DropDownMenu extends Component {
  constructor(props) {
    super(props);

    this.state = {};
  }

  onSubmitHandler = async (event) => {};
  componentWillMount() {
    const { user, constant, dashboard } = this.props;
  }

  componentWillUnmount() {
    // clearTimeout(this.timer);
  }

  render = () => {
    // const history = useHistory();
    var name = "Loading...";
    if (
      this.props.user.first_name != null &&
      this.props.user.last_name != null
    ) {
      name = this.props.user.first_name + " " + this.props.user.last_name;
    }

    var profile_picture_url = "/images/default-user-image.png";
    if (Validator.isValid(this.props.settings.profile_picture)) {
      profile_picture_url =
        "data:image/jpg;base64," + this.props.settings.profile_picture;
    }
    const user = this.props.user;
    return (
              <div class="btn-group main-dropdown-menu">
                      <button type="button" class="btn dropdown-toggle" data-toggle="dropdown" >
                        <img  className="image-smaller img-circle"  src={profile_picture_url} />
                      </button>
                      <div  className="dropdown-menu dropdown-menu-right"  >
                            <Link className="dropdown-item" to={global.links.profile + 3153}>
                                <p><i className="nav-icon fa fa-user" /> My Profile</p>
                            </Link>
                            
                            {/* <a className="dropdown-item" href="#">
                              Settings
                            </a> */}
                            
                            <a onClick={() => this.props.logOut()} className="dropdown-item">
                                <p><i className="fa fa-sign-out nav-icon" /> Log Out</p>
                            </a>
                    </div>
                </div>
      
    );
  };
}

// const validationSchema = Yup.object().shape({});

const mapStateToProps = (state) => {
  return {
    user: state.user,
    settings: state.settings,
  };
};
const mapDispatchToProps = (dispatch) => {
  return {
    logOut: () => dispatch(logOut()),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(DropDownMenu);

// export default (DropDownMenu);
