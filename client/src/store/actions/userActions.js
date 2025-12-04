import axios from "axios";
import API from "../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../services/Formatter";

/**
 *  A dedicated repository of Actions for Users
 */

// Actions for the Login
export const logIn = (credentials) => {

    return (dispatch, getState) => {

        dispatch({'type': 'REQUEST_START'});

        trackPromise( axios({
            method: "post",
            url: process.env.REACT_APP_API_BASE_URL + "/auth/login",
            headers: { 
                "Content-Type": "application/json",
                'X-Authorization' : process.env.REACT_APP_API_KEY 
            },
            data: credentials
        }) )
        .then(result => {

            // Set the Returned token on localStorage
            localStorage.setItem("access_token", result.data.content.access_token); 
            localStorage.setItem("session_id", result.data.content.session_id);

            // Dispatch Login Success
            dispatch({
                'type'      : 'LOGIN_SUCCESS', 
                'payload'   : result.data.content.payload,
                'user'      : result.data.content.user
            })

            if (result?.data?.content?.access_token) {
                dispatch({
                    'type'      : 'HIDE_MODAL_LOGIN'
                })
            }

            // Render the Constant Variables on React
            dispatch({
                'type'      : 'RENDER_CONSTANT', 
                'constant'   : result.data.content.constant
            })

            // Render the Settings that will be used on React
            dispatch({
                'type'      : 'RENDER_SETTINGS', 
                'settings'   : result.data.content.settings
            })
            

            // Dispatch Alert of Login Success
            //dispatch( Formatter.alert_success( result, 3000 )  );
        })
        .catch(e => {
            // Please take note that I used e.response here since I am not using the API.call function. That function already handles the 'e' to get it's response.
            // I'm doing it manually for the manual AXIOS calls only.
            dispatch( Formatter.alert_error(  e.response )  ) 
        });
    }
}

export const authenticateClient = (token) => {
    return (dispatch, getState) => {

        dispatch({'type': 'REQUEST_START'});

        trackPromise( axios({
            method: "get",
            url: process.env.REACT_APP_API_BASE_URL + "/auth/authenticate-client",
            headers: { 
                "Content-Type": "application/json",
                "Authorization"   : "Bearer " + token,
                'X-Authorization' : process.env.REACT_APP_API_KEY 
            }
        }) )
        .then(result => {

            // Set the Returned token on localStorage
            localStorage.setItem("access_token", result.data.content.access_token);
            // Dispatch Login Success
            dispatch({
                'type'      : 'LOGIN_SUCCESS', 
                'payload'   : result.data.content.payload,
                'user'      : result.data.content.user
            })

            // Render the Constant Variables on React
            dispatch({
                'type'      : 'RENDER_CONSTANT', 
                'constant'   : result.data.content.constant
            })

            // Render the Settings that will be used on React
            dispatch({
                'type'      : 'RENDER_SETTINGS', 
                'settings'   : result.data.content.settings
            })
            

            // Dispatch Alert of Login Success
            //dispatch( Formatter.alert_success( result, 3000 )  );
        })
        .catch(e => {
            // Please take note that I used e.response here since I am not using the API.call function. That function already handles the 'e' to get it's response.
            // I'm doing it manually for the manual AXIOS calls only.
            //dispatch( Formatter.alert_error(  e.response ) ) 
        });
    }
}

export const authenticateMSClient = (code) => {
    return (dispatch, getState) => {

        dispatch({'type': 'REQUEST_START'});

        trackPromise( axios({
            method: "get",
            url: process.env.REACT_APP_API_BASE_URL + "/auth/authenticate-ms-client?code=" + code,
            headers: { 
                "Content-Type": "application/json",
                'X-Authorization' : process.env.REACT_APP_API_KEY 
            }
        }) )
        .then(result => {

            // Set the Returned token on localStorage
            localStorage.setItem("access_token", result.data.content.access_token);
            window.location.href = process.env.REACT_APP_PUBLIC_URL + "/login";
            // Dispatch Login Success
            /*
            dispatch({
                'type'      : 'LOGIN_SUCCESS', 
                'payload'   : result.data.content.payload,
                'user'      : result.data.content.user
            })

            // Render the Constant Variables on React
            dispatch({
                'type'      : 'RENDER_CONSTANT', 
                'constant'   : result.data.content.constant
            })

            // Render the Settings that will be used on React
            dispatch({
                'type'      : 'RENDER_SETTINGS', 
                'settings'   : result.data.content.settings
            })*/
            

            // Dispatch Alert of Login Success
            //dispatch( Formatter.alert_success( result, 3000 )  );
        })
        .catch(e => {
            // Please take note that I used e.response here since I am not using the API.call function. That function already handles the 'e' to get it's response.
            // I'm doing it manually for the manual AXIOS calls only.
            dispatch( Formatter.alert_error(  e.response, 3000 ) );
            console.log('MS Login', e.response);
            if (e.response && e.response?.status == 403) {
                dispatch( Formatter.alert_error(  {status: 401} ) );
            }
        });
    }
}

// Actions for the Logout
export const logOut = () => {
    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/auth/logout",
            data: {session_id: localStorage.getItem('session_id')}
        })
        .then(result => {

            // Remove the Token from the localStorage
            localStorage.removeItem("access_token");
            localStorage.removeItem("session_id");
            dispatch({'type': 'CLEAR_RECENT_DTR_INSTANCE'})
            dispatch({'type': 'LOGOUT_SUCCESS'})
            window.location.reload();
            // Dispatch Alert of Login Success
            dispatch( Formatter.alert_success( result, 3000 )  );
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

// Action for Fetching the current User Instance
export const fetchUser = () => {
    
    return (dispatch, getState) => {

        // Sets the isReloading to True to current state while reloading the page.
        dispatch({'type': 'RELOAD_START'});

        API.call({
            method: "post",
            url: "/auth/payload",
        })
        .then(result => {

            // Dispatch Login Success
            dispatch({
                'type'      : 'FETCH_USER_SUCCESS', 
                'payload'   : result.data.content.payload,
                'user'      : result.data.content.user
            })

            // Render the Constant Variables on React
            dispatch({
                'type'      : 'RENDER_CONSTANT', 
                'constant'   : result.data.content.constant
            })

            // Render the Settings that will be used on React
            dispatch({
                'type'      : 'RENDER_SETTINGS', 
                'settings'   : result.data.content.settings
            })

            // dispatch( Formatter.alert_success( result, 3000 )  );

            // Sets the Reloading to False
            dispatch({'type': 'RELOAD_END'});
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}


// Get User Info ( Name and Department )
export const getUserInfo = ( id ) => {
    return (dispatch, getState) => {

        API.call({
            method: "get",
            url: "/user/" + id + "/info",
        })
        .then(result => {
            dispatch({
                'type'      : 'FETCH_USER_INFO', 
                'userInfo'   : result.data.content
            })

            dispatch({'type': 'RELOAD_END'});
        })
        .catch(e => {
            dispatch( Formatter.alert_error(  e.response )  ) 
        });
    }
}


// Actions for the Login
export const forgotPasswordRequest = ( email ) => {

    return (dispatch, getState) => {

        dispatch({'type': 'REQUEST_START'});

        trackPromise( axios({
            method: "post",
            url: process.env.REACT_APP_API_BASE_URL + "/forgot_password_request",
            headers: { 
                "Content-Type": "application/json",
                'X-Authorization' : process.env.REACT_APP_API_KEY 
            },
            data: { email : email }
        }) )
        .then(result => {

            dispatch( Formatter.alert_success( result, 5000 )  );

            dispatch({
                'type'      : 'SET_REDIRECT',
                'link'      : global.links.login
            })
            
        })
        .catch(e => {
            // Please take note that I used e.response here since I am not using the API.call function. That function already handles the 'e' to get it's response.
            // I'm doing it manually for the manual AXIOS calls only.
            dispatch( Formatter.alert_error(  e.response )  ) 
        });
    }
}

// Actions for the getting user asset
export const getAllAssets = ( params ) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/user/getallassets",
            params: params
        })
        .then(result => {
            dispatch({
                'type'                  : 'FETCH_ALL_ASSETS',
                'data'                  : result.data,
                'is_all_asset_loaded'   : true,
                'filters'               : params
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) )
        });
    }
}

// Actions for the getting user asset
export const getUserAsset = ( id ) => {

    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/user/getasset/" + id,
        })
        .then(result => {
            dispatch({
                'type'              : 'FETCH_USER_ASSET',
                'data'              : result.data.content,
                'is_asset_loaded'   : true
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) )
        });
    }
}

// Actions for the getting user asset
export const getUserAssets = ( data ) => {

    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/user/getassets",
        })
        .then(result => {
            dispatch({
                'type'              : 'FETCH_USER_ASSETS',
                'data'              : result.data.content,
                'is_asset_loaded'   : true
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) )
        });
    }
}

// Actions for the adding user asset
export const addUserAsset = ( data ) => {

    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/user/addasset",
            data: data
        })
        .then(result => {
            dispatch({
                'type'              : 'CLEAR_USER_ASSET_LOAD',
                'is_asset_loaded'   : false
            })
            dispatch(Formatter.alert_success( result, 3000 ));
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) )
        });
    }
}

// Actions for the adding user asset
export const updateUserAsset = ( data ) => {

    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/user/updateasset",
            data: data
        })
        .then(result => {
            dispatch({
                'type'              : 'CLEAR_USER_ASSET_LOAD',
                'is_asset_loaded'   : false
            });

            dispatch(Formatter.alert_success( result, 3000 ));
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) )
        });
    }
}

// get user NHO survey
export const getNhoSurvey = () => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/nho_survey/"
        })
        .then(result => {
            dispatch({
                'type'          : 'FETCH_USER_NHO',
                'data'          : result.data,
                'is_nho_loaded' : true
            })
            dispatch({'type': 'RELOAD_END'});
        })
        .catch(e => {
            dispatch( Formatter.alert_error(  e, 3000 )  )
        });
    }
}

// submission of NHO survey
export const addNhoSurvey = ( post_data ) => {
    return (dispatch, getState) => {

        API.call({
            method: "post",
            url: "/nho_survey/",
            data: post_data
        })
        .then(result => {
            if (result.status == 200) {
                const closeButton = document.getElementsByClassName('close');
                for (const element of closeButton) {
                    element.click();
                }

                dispatch( Formatter.alert_success( result, 5000 ));

                setTimeout(function () {
                  const gdElement = document.createElement('a');
                  gdElement.href = "https://www.glassdoor.com/surveys/interviews/create?i=1084085&c=PAGE_INFOSITE_TOP";
                  gdElement.target = "_blank";
                  document.body.appendChild(gdElement);
                  gdElement.click();
                  document.body.removeChild(gdElement);
                }, 6000);

                dispatch({
                    'type'          : 'CLEAR_USER_NHO',
                    'is_nho_loaded' : false
                })
            }
        })
        .catch(e => {
            dispatch( Formatter.alert_error(  e, 3000 )  ) 
        });
    }
}

// get user EVA survey
export const getEvaSurvey = () => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/eva_survey/"
        })
        .then(result => {
            dispatch({
                'type'              : 'FETCH_USER_EVA',
                'data'              : result.data.content,
                'is_eva_loaded'     : true
            })
            dispatch({'type': 'RELOAD_END'});
        })
        .catch(e => {
            dispatch( Formatter.alert_error(  e, 3000 )  )
        });
    }
}

// submission of EVA survey
export const addEvaSurvey = ( post_data ) => {
    return (dispatch, getState) => {

        API.call({
            method: "post",
            url: "/eva_survey/",
            data: post_data
        })
        .then(result => {
            if (result.status === 200) {
                const closeButton = document.getElementsByClassName('close');
                for (const element of closeButton) {
                    element.click();
                }

                dispatch( Formatter.alert_success( result, 5000 ));

                dispatch({
                    'type'          : 'CLEAR_USER_EVA',
                    'is_eva_loaded' : false
                })
            }
        })
        .catch(e => {
            dispatch( Formatter.alert_error(  e, 3000 )  ) 
        });
    }
}

// get user code of conduct
export const getUserCoc = () => {
  return (dispatch, getState) => {
    API.call({
      method: "get",
      url: "/user_coc/"
    })
    .then(result => {
      dispatch({
        'type'              : 'FETCH_USER_COC',
        'data'              : result.data.content,
        'is_coc_loaded'     : true
      })
      dispatch({'type': 'RELOAD_END'});
    })
    .catch(e => {
        dispatch( Formatter.alert_error(  e, 3000 )  )
    });
  }
}

// acknowledge code of conduct
export const acknowledgeCOC = () => {
  return (dispatch, getState) => {
    API.call({
      method: "post",
      url: "/acknowledge_coc/"
    })
    .then(result => {
      if (result.status === 200) {
        const closeButton = document.getElementsByClassName('close');
        for (const element of closeButton) {
          element.click();
        }

        dispatch( Formatter.alert_success( result, 5000 ));

        dispatch({
            'type'          : 'CLEAR_USER_COC',
            'is_coc_loaded' : false
        })
      }
    })
    .catch(e => {
        dispatch( Formatter.alert_error(  e, 3000 )  ) 
    });
  }
}

// get user EVA registration
export const getEvaReg = () => {
    return (dispatch, getState) => {
        API.call({
          method: "get",
          url: "/eva_registration/"
        })
        .then(result => {
          dispatch({
            'type'              : 'FETCH_USER_EVA_REG',
            'data'              : result.data.content,
            'is_eva_reg_loaded' : true
          })
          dispatch({'type': 'RELOAD_END'});
        })
        .catch(e => {
          dispatch( Formatter.alert_error(  e, 3000 )  )
        });
    }
}

// submit eva registration
export const submitEvaReg = () => {
  return (dispatch, getState) => {
    API.call({
      method: "post",
      url: "/eva_registration/",
    })
    .then(result => {
      if (result.status === 200) {
        const closeButton = document.getElementsByClassName('close');
        for (const element of closeButton) {
          element.click();
        }

        dispatch( Formatter.alert_success( result, 5000 ));

        dispatch({
          'type'              : 'CLEAR_USER_EVA_REG',
          'is_eva_reg_loaded' : false
        })
      }
    })
    .catch(e => {
      dispatch( Formatter.alert_error(  e, 3000 )  ) 
    });
  }
}

// get user Happiness survey
export const getHappinessSurvey = () => {
  return (dispatch, getState) => {
    API.call({
      method: "get",
      url: "/happiness_survey/"
    })
    .then(result => {
      dispatch({
        'type'                        : 'FETCH_USER_HAPPINESS_SURVEY',
        'data'                        : result.data.content,
        'is_happiness_survey_loaded'  : true
      })
      dispatch({'type': 'RELOAD_END'});
    })
    .catch(e => {
      dispatch( Formatter.alert_error(  e, 3000 )  )
    });
  }
}

// submission of Happiness Survey
export const addHappinessSurvey = ( post_data ) => {
  return (dispatch, getState) => {
    API.call({
      method: "post",
      url: "/happiness_survey/",
      data: post_data
    })
    .then(result => {
      if (result.status === 200) {
        const closeButton = document.getElementsByClassName('close');
        for (const element of closeButton) {
          element.click();
        }

        dispatch( Formatter.alert_success( result, 5000 ));

        dispatch({
          'type'                        : 'CLEAR_USER_HAPPINESS_SURVEY',
          'is_happiness_survey_loaded'  : false
        })
      }
    })
    .catch(e => {
      dispatch( Formatter.alert_error(  e, 3000 )  ) 
    });
  }
}